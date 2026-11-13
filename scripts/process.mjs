// Turns uploads in inbox/ into web-ready photos and rebuilds data/diary.json.
//
//   inbox/<anything>.jpg            a photo (JPEG, PNG, WebP or TIFF)
//   inbox/<anything>.json           optional sidecar: {"caption", "size": "normal|big|header", "stop", "taken": "2026-12-01T23:41", "exif"}
//   inbox/<stop-id>/<anything>.jpg  a subfolder named after a stop forces that stop
//   notes/2026-12-01.md             a short note for that day; a last line starting with "—" becomes its caption
//
// For every photo: rotate upright, strip all metadata (GPS included), write AVIF at 640/1280/2048 px wide,
// a 2048 px JPEG fallback and a tiny blurred placeholder, then remove it from inbox/.
// Photos are placed at a stop by the date they were taken, using data/trip.json.
// To hide a photo later, delete its entry from data/diary.json; its image files are cleaned up on the next run.

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import exifr from 'exifr';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const INBOX = path.join(ROOT, 'inbox'), NOTES = path.join(ROOT, 'notes'), IMG = path.join(ROOT, 'img');
const DIARY = path.join(ROOT, 'data', 'diary.json');
const WIDTHS = [640, 1280, 2048];
const IMAGE = /\.(jpe?g|png|webp|tiff?)$/i;

const trip = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'trip.json'), 'utf8'));
const stopIds = new Set(trip.stops.map(s => s.id));
let diary = {photos: [], notes: []};
try { diary = JSON.parse(await fs.readFile(DIARY, 'utf8')); } catch {}
diary.photos ||= [];

function stopFor(date) {
  const S = trip.stops;
  const hit = S.find(s => s.from <= date && date < s.to);
  if (hit) return hit.id;
  if (date < S[0].from) return S[0].id;
  let prev = S[0];
  for (const s of S) if (s.from <= date) prev = s;
  return prev.id;
}

const fmtShutter = t => t >= 1 ? `${+t.toFixed(1)} s` : `1/${Math.round(1 / t)} s`;
function exifLine(x) {
  if (!x) return '';
  return [x.FocalLength && `${Math.round(x.FocalLength)} mm`, x.FNumber && `f/${+x.FNumber.toFixed(1)}`,
    x.ExposureTime && fmtShutter(x.ExposureTime), x.ISO && `ISO ${x.ISO}`].filter(Boolean).join(' · ');
}

async function walk(dir) {
  let out = [];
  for (const e of await fs.readdir(dir, {withFileTypes: true}).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(p));
    else out.push(p);
  }
  return out;
}

const files = (await walk(INBOX)).filter(f => IMAGE.test(f));
const skipped = (await walk(INBOX)).filter(f => /\.(heic|heif|arw|dng)$/i.test(f));
for (const f of skipped) console.warn(`! ${path.relative(ROOT, f)}: this format can't be processed. Export it as JPEG and upload again.`);
await fs.mkdir(IMG, {recursive: true});
const known = new Set(diary.photos.map(p => p.hash));
let added = 0;

for (const file of files) {
  const rel = path.relative(INBOX, file);
  const buf = await fs.readFile(file);
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
  const sidecarPath = file.replace(/\.[^.]+$/, '.json');
  let side = {};
  try { side = JSON.parse(await fs.readFile(sidecarPath, 'utf8')); } catch {}
  const done = async () => { await fs.rm(file, {force: true}); await fs.rm(sidecarPath, {force: true}); };
  if (known.has(hash)) { console.log(`= ${rel}: already in the diary`); await done(); continue; }

  let x = null;
  try { x = await exifr.parse(buf, {reviveValues: false, pick: ['DateTimeOriginal', 'CreateDate', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'ImageDescription']}); } catch {}
  let taken = side.taken;
  const raw = x && (x.DateTimeOriginal || x.CreateDate);
  if (!taken && typeof raw === 'string') { const m = raw.match(/^(\d{4}):(\d\d):(\d\d)[ T](\d\d):(\d\d)/); if (m) taken = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`; }
  if (!taken) { taken = new Date().toISOString().slice(0, 16); console.warn(`! ${rel}: no capture date found, using today`); }
  const date = taken.slice(0, 10), time = taken.slice(11, 16);

  const folder = rel.split(path.sep).length > 1 ? rel.split(path.sep)[0] : null;
  const fixed = side.stop && stopIds.has(side.stop) ? side.stop : folder && stopIds.has(folder) ? folder : null;

  const id = `${date.replace(/-/g, '')}-${(time || '0000').replace(':', '')}-${hash}`;
  const img = sharp(buf, {failOn: 'none'}).rotate();
  const upright = await img.clone().toBuffer({resolveWithObject: true});
  let {width: W, height: H} = upright.info;
  const scale = Math.min(1, 2048 / Math.max(W, H));
  const fw = Math.round(W * scale), fh = Math.round(H * scale);
  const src = sharp(upright.data);
  const sizes = WIDTHS.filter(w => w < fw); sizes.push(fw);
  for (const w of sizes) await src.clone().resize({width: w}).avif({quality: 52, effort: 4}).toFile(path.join(IMG, `${id}-${w}.avif`));
  await src.clone().resize({width: fw}).jpeg({quality: 82, mozjpeg: true}).toFile(path.join(IMG, `${id}.jpg`));
  const lqip = 'data:image/webp;base64,' + (await src.clone().resize({width: 20}).blur(0.6).webp({quality: 45}).toBuffer()).toString('base64');

  diary.photos.push({
    id, hash, date, time, stop: fixed || stopFor(date), ...(fixed ? {stopFixed: true} : {}),
    w: fw, h: fh, sizes,
    caption: (side.caption ?? (typeof x?.ImageDescription === 'string' ? x.ImageDescription : '')).trim(),
    size: ['big', 'header'].includes(side.size) ? side.size : side.hero ? 'big' : 'normal',
    exif: side.exif || exifLine(x),
    lqip
  });
  known.add(hash); added++;
  console.log(`+ ${rel} → ${id} (${diary.photos.at(-1).stop})`);
  await done();
}

// Re-place photos by date (the route may have changed), unless a stop was chosen on purpose.
for (const p of diary.photos) if (!p.stopFixed || !stopIds.has(p.stop)) { p.stop = stopFor(p.date); delete p.stopFixed; }
diary.photos.sort((a, b) => (a.date + a.time + a.id).localeCompare(b.date + b.time + b.id));

// Notes are rebuilt from notes/ every run, so editing or deleting a file there is enough.
diary.notes = [];
for (const f of (await fs.readdir(NOTES).catch(() => [])).sort()) {
  const m = f.match(/^(\d{4}-\d\d-\d\d)(?:-([a-z0-9-]+))?\.md$/);
  if (!m) continue;
  const blocks = (await fs.readFile(path.join(NOTES, f), 'utf8')).trim().split(/\n\s*-{3,}\s*\n/);
  blocks.forEach((block, i) => {
    const lines = block.trim().split('\n');
    let heading = '';
    if (/^#\s+/.test(lines[0])) heading = lines.shift().replace(/^#\s+/, '').trim();
    let caption = '';
    if (lines.length > 1 && /^\s*(—|--|–)\s/.test(lines.at(-1))) caption = lines.pop().replace(/^\s*(—|--|–)\s*/, '').trim();
    const text = lines.join('\n').split(/\n\s*\n/).map(par => par.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n');
    if (text || heading) diary.notes.push({date: m[1], stop: m[2] && stopIds.has(m[2]) ? m[2] : stopFor(m[1]), heading, text, caption, i});
  });
}

// Remove image files that no photo points to any more.
const keep = new Set(diary.photos.map(p => p.id));
let removed = 0;
for (const f of await fs.readdir(IMG)) {
  if (f.startsWith('.')) continue;
  const id = f.replace(/(-\d+)?\.(avif|jpg)$/, '');
  if (!keep.has(id)) { await fs.rm(path.join(IMG, f)); removed++; }
}

await fs.writeFile(DIARY, JSON.stringify(diary, null, 1) + '\n');
console.log(`Done: ${added} new photo(s), ${diary.photos.length} in total, ${diary.notes.length} note(s)${removed ? `, ${removed} old file(s) removed` : ''}.`);

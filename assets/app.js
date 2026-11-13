/* Photo diary: reads data/trip.json (route) and data/diary.json (photos + notes, built by scripts/process.mjs)
   and renders the ridgeline, the stops (newest first) and the lightbox. */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const D = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const nf = new Intl.NumberFormat('en-GB');
const fmtDay = d => d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});
const fmtShort = d => d.toLocaleDateString('en-GB', {day:'numeric', month:'short'});
const fmtRange = (a, b) => a.getMonth() === b.getMonth()
  ? `${a.getDate()}–${b.getDate()} ${a.toLocaleDateString('en-GB', {month:'short'})}`
  : `${fmtShort(a)} – ${fmtShort(b)}`;

const noCache = {cache: 'no-cache'};
Promise.all([
  fetch('data/trip.json', noCache).then(r => r.json()),
  fetch('data/diary.json', noCache).then(r => r.ok ? r.json() : {}).catch(() => ({}))
]).then(([trip, diary]) => render(trip, diary || {}));

function render(trip, diary) {
  const STOPS = trip.stops;
  const TRIP_START = D(trip.start), TRIP_DAYS = trip.days, END = D(trip.end);
  const q = new URLSearchParams(location.search).get('today');
  const now = new Date();
  const TODAY = q ? D(q) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayNo = d => Math.round((d - TRIP_START) / 864e5) + 1;
  const stopById = Object.fromEntries(STOPS.map(s => [s.id, s]));
  const photos = (diary.photos || []).filter(p => stopById[p.stop]);
  const notes = (diary.notes || []).filter(n => stopById[n.stop]);

  /* ---------- top bar ---------- */
  const dn = dayNo(TODAY);
  $('dayCount').textContent = dn < 1 ? `Starts in ${1 - dn} day${dn === 0 ? '' : 's'}`
    : dn > TRIP_DAYS ? `${TRIP_DAYS} days, all done` : `Day ${dn} of ${TRIP_DAYS}`;

  /* ---------- stops, newest first; days newest first; photos in the order they were taken ---------- */
  const used = new Set([...photos.map(p => p.stop), ...notes.map(n => n.stop)]);
  const withPhotos = STOPS.filter(s => used.has(s.id)).reverse();
  const host = $('stops'); const ALL = [];
  const GAP = 8, DAYS = [];

  /* Justified rows: every row fills the full width, photos keep their shape, nothing is cropped
     (except a lone photo that would be taller than the screen). */
  function rowsFor(list, Wc) {
    const T = Wc < 600 ? Wc * .82 : Math.min(Math.max(Wc * .36, 300), 620);   /* target row height */
    const maxH = Wc < 600 ? innerHeight * .8 : Math.min(innerHeight * .82, Wc * .9);
    const ar = p => p.w / p.h, hOf = r => (Wc - GAP * (r.length - 1)) / r.reduce((a, p) => a + ar(p), 0);
    const rows = []; let row = [];
    const heroes = list.filter(p => p.hero && ar(p) >= 1.15);
    heroes.forEach(h => rows.push([h]));
    list.filter(p => !heroes.includes(p)).forEach(p => {
      row.push(p);
      const h = hOf(row);
      if (h <= T) {
        if (row.length > 1 && Math.abs(hOf(row.slice(0, -1)) - T) < Math.abs(h - T)) { rows.push(row.slice(0, -1)); row = [p]; }
        else { rows.push(row); row = []; }
      }
    });
    if (row.length) {
      const last = rows[rows.length - 1];
      if (hOf(row) > T * 1.35 && last && !heroes.includes(last[0]) && hOf(last.concat(row)) > T * .55) rows[rows.length - 1] = last.concat(row);
      else rows.push(row);
    }
    return rows.map(r => ({r, h: Math.min(hOf(r), maxH)}));
  }

  function figure(p, s) {
    const base = 'img/' + p.id;
    const f = document.createElement('figure');
    f.className = 'ph'; f.tabIndex = 0; f.setAttribute('role', 'button');
    f.setAttribute('aria-label', p.caption || `Photo from ${s.name}`);
    if (p.lqip) f.style.backgroundImage = `url(${p.lqip})`;
    f.innerHTML = `<picture><source type="image/avif" srcset="${p.sizes.map(w => `${base}-${w}.avif ${w}w`).join(', ')}" sizes="100vw"><img src="${base}.jpg" width="${p.w}" height="${p.h}" alt="${esc(p.caption)}" loading="lazy" decoding="async"></picture>`;
    const idx = ALL.length;
    ALL.push({p, title: p.caption || s.name, where: s.name, when: `${fmtShort(D(p.date))}${p.time ? ', ' + p.time : ''}`, exif: p.exif});
    f.addEventListener('click', () => openLb(idx));
    f.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openLb(idx); } });
    return f;
  }
  function noteEl(it) {
    const longCap = (it.caption || '').length > 120;
    const story = it.text.length > 180 || it.text.includes('\n') || longCap;
    const el = document.createElement('div'); el.className = story ? 'note story' : 'note';
    (it.text + (longCap ? '\n\n' + it.caption : '')).split(/\n\s*\n/).forEach(par => { const q = document.createElement('p'); q.textContent = par.trim(); el.appendChild(q); });
    if (it.caption && !longCap) { const c = document.createElement('span'); c.textContent = it.caption; el.appendChild(c); }
    return el;
  }
  function layoutDay(d) {
    const Wc = d.el.clientWidth; if (!Wc || Wc === d.w) return; d.w = Wc;
    d.el.textContent = '';
    rowsFor(d.list, Wc).forEach(({r, h}, i) => {
      const row = document.createElement('div'); row.className = 'jrow'; row.style.height = Math.round(h) + 'px';
      r.forEach(p => { const f = d.figs.get(p); const w = r.length === 1 ? Math.min(Wc, Math.max(p.w / p.h * h, Wc * .5)) : p.w / p.h * h; f.style.flex = r.length === 1 ? '1 1 0' : `${(p.w / p.h).toFixed(4)} 1 0`; f.classList.toggle('fit', r.length === 1 && p.w / p.h < Wc / h * .7);
        f.querySelector('source').sizes = Math.ceil(w) + 'px'; row.appendChild(f); });
      d.el.appendChild(row);
      if (i === 0 && d.note && !d.note.classList.contains('story')) d.el.appendChild(d.note);
    });
    if (d.note && !d.note.parentNode) d.el.appendChild(d.note);
  }

  withPhotos.forEach(s => {
    const sec = document.createElement('section'); sec.className = 'stop'; sec.id = s.id;
    const altTxt = s.peak ? `${s.peak}, ${nf.format(s.alt)} m` : `${nf.format(s.alt)} m`;
    sec.innerHTML = `<div class="stop-head"><h2>${esc(s.name)}</h2><div class="meta">${esc(s.country)}<span class="dot">·</span>${fmtRange(D(s.from), D(s.to))}<span class="dot">·</span>${esc(altTxt)}</div></div>`;
    const dates = [...new Set([...photos, ...notes].filter(x => x.stop === s.id).map(x => x.date))].sort().reverse();
    dates.forEach(date => {
      const d = D(date), day = document.createElement('div'); day.className = 'day';
      const n = dayNo(d);
      day.innerHTML = `<div class="day-label">${fmtDay(d)}${n >= 1 && n <= TRIP_DAYS ? `<span>Day ${n}</span>` : ''}</div>`;
      const list = photos.filter(p => p.stop === s.id && p.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.id.localeCompare(b.id));
      const note = notes.find(x => x.stop === s.id && x.date === date);
      const m = document.createElement('div'); m.className = 'rows';
      DAYS.push({el: m, list, figs: new Map(list.map(p => [p, figure(p, s)])), note: note ? noteEl(note) : null, w: 0});
      day.appendChild(m); sec.appendChild(day);
    });
    host.appendChild(sec);
  });
  const nextStop = STOPS.find(s => D(s.from) > TODAY);
  if (!withPhotos.length) {
    const p = document.createElement('p'); p.className = 'later empty';
    p.innerHTML = dn < 1 ? `No photos yet. The trip starts on <b>${D(trip.start).toLocaleDateString('en-GB', {day:'numeric', month:'long'})}</b>, first stop ${esc(STOPS[0].name)}.` : 'No photos yet. They are on their way.';
    host.appendChild(p);
  } else if (nextStop) {
    const p = document.createElement('p'); p.className = 'later';
    p.innerHTML = `Next up: <b>${esc(nextStop.name)}</b>, from ${D(nextStop.from).toLocaleDateString('en-GB', {day:'numeric', month:'long'})}.`;
    host.prepend(p);
  }
  const layoutAll = () => DAYS.forEach(layoutDay);
  layoutAll();
  let lt; addEventListener('resize', () => { clearTimeout(lt); lt = setTimeout(layoutAll, 100); });
  document.fonts && document.fonts.ready.then(layoutAll);
  /* fade photos in over their blurred placeholder */
  host.querySelectorAll('.ph img').forEach(im => { if (im.complete && im.naturalWidth) im.classList.add('in'); else im.addEventListener('load', () => im.classList.add('in'), {once: true}); });

  /* ---------- ridgeline: Amsterdam (left) to Managua (right), height = altitude ---------- */
  const ridge = $('ridge');
  const HOME = {id: 'home', name: trip.home.name, alt: 0};
  const curStop = STOPS.find(st => D(st.from) <= TODAY && TODAY < D(st.to));
  function curveY(sorted, x) {
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      if (x <= b.x) {
        const mx = (a.x + b.x) / 2; let lo = 0, hi = 1;
        const bx = t => (1 - t) ** 3 * a.x + 3 * (1 - t) ** 2 * t * mx + 3 * (1 - t) * t * t * mx + t ** 3 * b.x;
        for (let j = 0; j < 24; j++) { const m = (lo + hi) / 2; bx(m) < x ? lo = m : hi = m; }
        const t = (lo + hi) / 2;
        return (1 - t) ** 3 * a.y + 3 * (1 - t) ** 2 * t * a.y + 3 * (1 - t) * t * t * b.y + t ** 3 * b.y;
      }
    }
    return sorted[sorted.length - 1].y;
  }
  function hereMarker(x, y, stuck, line, H, W) {
    const label = dn < 1 ? ['Leaving', fmtShort(TRIP_START)] : dn > TRIP_DAYS ? ['Home', `${TRIP_DAYS} days`] : [`Day ${dn}`, curStop ? curStop.name : ''];
    const txt = (tx, anchor) => `<text class="here-label" x="${tx}" y="14" text-anchor="${anchor}" font-family="Inter,sans-serif" font-size="12" fill="#9A938A"><tspan fill="#EDE8E0" font-weight="500">${esc(label[0])}</tspan>${label[1] ? ` · ${esc(label[1])}` : ''}</text>`;
    const pulse = `<circle cx="${x}" cy="${y}" r="3.5" fill="none" stroke="#E8623A" stroke-width="1.2"><animate attributeName="r" values="3.5;10" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0" dur="2.4s" repeatCount="indefinite"/></circle>`;
    if (stuck) return `<circle cx="${x}" cy="${y}" r="3.5" fill="#FFC98A"/>${pulse}`;
    /* lava front: the travelled line ends in a hot, glowing head, with a thin ember line up to the label */
    return `<defs><linearGradient id="hot" gradientUnits="userSpaceOnUse" x1="${x - 90}" y1="0" x2="${x}" y2="0"><stop offset="0" stop-color="#FFB46A" stop-opacity="0"/><stop offset="1" stop-color="#FFE2B0"/></linearGradient><clipPath id="hotclip"><rect x="${x - 90}" y="0" width="90" height="${H}"/></clipPath>
      <linearGradient id="xh" gradientUnits="userSpaceOnUse" x1="0" y1="${y - 7}" x2="0" y2="6"><stop offset="0" stop-color="#FFB46A" stop-opacity=".85"/><stop offset="1" stop-color="#E8623A" stop-opacity="0"/></linearGradient></defs>
      <path d="${line}" fill="none" stroke="url(#hot)" stroke-width="2.4" clip-path="url(#hotclip)"/>
      <circle cx="${x}" cy="${y}" r="18" fill="url(#hereGlow)"><animate attributeName="opacity" values=".55;1;.55" dur="2.6s" repeatCount="indefinite"/></circle>
      <line x1="${x}" y1="${y - 7}" x2="${x}" y2="6" stroke="url(#xh)" stroke-width="1"/>
      <circle cx="${x}" cy="${y}" r="3.2" fill="#FFE2B0"/>${x > W - 220 ? txt(x - 8, 'end') : txt(x + 8, 'start')}`;
  }
  function drawRidge() {
    const stuck = $('rbar').classList.contains('stuck');
    const W = ridge.clientWidth, H = ridge.clientHeight, top = stuck ? 8 : 34, bot = H - 10, MAX = 4400, pad = 10;
    const total = dayNo(END) - 1;
    const X = d => pad + (d / total) * (W - 2 * pad);
    const pts = [{s: HOME, x: X(0), y: bot}].concat(STOPS.map(s => {
      const mid = (dayNo(D(s.from)) + dayNo(D(s.to))) / 2 - 1;
      return {s, x: X(mid), y: bot - (s.alt / MAX) * (bot - top)};
    }));
    const today = X(Math.min(Math.max(dn - 1, 0), total));
    const sorted = [...pts].sort((a, b) => a.x - b.x);
    let line = `M${pad},${sorted[0].y} L${sorted[0].x},${sorted[0].y}`;
    for (let i = 1; i < sorted.length; i++) { const a = sorted[i - 1], b = sorted[i], mx = (a.x + b.x) / 2; line += ` C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`; }
    const path = line + ` L${W - pad},${bot} L${pad},${bot} Z`;
    ridge.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs><radialGradient id="hereGlow"><stop offset="0" stop-color="#E8623A" stop-opacity=".55"/><stop offset="1" stop-color="#E8623A" stop-opacity="0"/></radialGradient><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8623A" stop-opacity=".36"/><stop offset="1" stop-color="#E8623A" stop-opacity="0"/></linearGradient>
      <clipPath id="past"><rect x="0" y="0" width="${today}" height="${H}"/></clipPath><clipPath id="fut"><rect x="${today}" y="0" width="${W}" height="${H}"/></clipPath></defs>
      <path d="${path}" fill="url(#rg)" clip-path="url(#past)"/>
      <path d="${line}" fill="none" stroke="#E8623A" stroke-width="1.5" clip-path="url(#past)"/>
      <path d="${line}" fill="none" stroke="#6B655E" stroke-width="1" stroke-dasharray="2 4" clip-path="url(#fut)"/>
      <line x1="${pad}" x2="${W - pad}" y1="${bot}" y2="${bot}" stroke="#EDE8E0" stroke-opacity=".12"/>
      ${hereMarker(today, curveY(sorted, today), stuck, line, H, W)}</svg>
      <div class="tip" id="tip"></div>`;
    const tip = $('tip');
    pts.forEach(p => {
      const home = p.s === HOME, has = !home && !!document.getElementById(p.s.id), future = !home && D(p.s.from) > TODAY;
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'pt' + (home ? ' home' : has ? '' : ' future') + (!home && curStop === p.s ? ' now' : '');
      b.style.left = p.x + 'px'; b.style.top = p.y + 'px'; b.dataset.id = p.s.id;
      b.setAttribute('aria-label', home ? `${HOME.name}, departure ${fmtShort(TRIP_START)}. Jump to the first photos` : `${p.s.name}, ${nf.format(p.s.alt)} m${has ? '' : future ? ', coming up' : ', no photos yet'}`);
      b.innerHTML = '<i></i>';
      if (!has && !home) b.tabIndex = -1;
      const show = () => {
        tip.innerHTML = home ? `<b>${esc(HOME.name)}</b><span>Sea level · departure ${fmtShort(TRIP_START)}${withPhotos.length ? ' · tap for the first photos' : ''}</span>`
          : `<b>${esc(p.s.name)}</b><span>${p.s.peak ? esc(p.s.peak) + ', ' : ''}${nf.format(p.s.alt)} m · ${fmtRange(D(p.s.from), D(p.s.to))}${future ? ' · coming up' : ''}</span>`;
        tip.style.left = '0px'; const tw = tip.offsetWidth / 2 + 4;
        tip.style.left = Math.min(Math.max(p.x, tw), W - tw) + 'px'; tip.style.bottom = (H - p.y + 14) + 'px'; tip.classList.add('on');
      };
      b.addEventListener('mouseenter', show); b.addEventListener('focus', show);
      b.addEventListener('mouseleave', () => tip.classList.remove('on')); b.addEventListener('blur', () => tip.classList.remove('on'));
      if (home) b.addEventListener('click', () => { const st = document.querySelectorAll('.stop'); if (st.length) st[st.length - 1].scrollIntoView({behavior: reduce() ? 'auto' : 'smooth'}); });
      if (has) b.addEventListener('click', () => document.getElementById(p.s.id).scrollIntoView({behavior: reduce() ? 'auto' : 'smooth'}));
      ridge.appendChild(b);
    });
    /* row under the ridge: end labels, country names, border ticks */
    const row = $('ridgeRow');
    row.innerHTML = `<span class="end-l">${esc(trip.home.name)} · ${fmtShort(TRIP_START)}</span><span class="end-r">${esc(trip.finish.name)} · ${fmtShort(END)}</span>`;
    const runs = []; STOPS.forEach(s => { const a = dayNo(D(s.from)) - 1, b = dayNo(D(s.to)) - 1, last = runs[runs.length - 1]; if (last && last.c === s.country) last.b = b; else runs.push({c: s.country, a, b}); });
    const ends = [...row.children].map(e => e.getBoundingClientRect());
    runs.forEach((r, i) => {
      if (i) { const t = document.createElement('i'); t.className = 'tick'; t.style.left = X(r.a) + 'px'; row.appendChild(t); }
      if (r.b - r.a < 3) return;
      const l = document.createElement('span'); l.className = 'ct'; l.textContent = r.c; l.style.left = X((r.a + r.b) / 2) + 'px'; row.appendChild(l);
      const rc = l.getBoundingClientRect(); if (ends.some(e => rc.left < e.right + 8 && rc.right > e.left - 8)) l.remove();
    });
    setActive(current);
  }
  let current = withPhotos[0] && withPhotos[0].id;
  function setActive(id) { current = id; ridge.querySelectorAll('.pt').forEach(b => b.classList.toggle('active', b.dataset.id === id)); }
  drawRidge();
  const rbar = $('rbar');
  new IntersectionObserver(([e]) => { const st = !e.isIntersecting && e.boundingClientRect.top < 0; if (st !== rbar.classList.contains('stuck')) { rbar.classList.toggle('stuck', st); drawRidge(); } }).observe($('sentinel'));
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawRidge, 120); });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), {rootMargin: '-45% 0px -50% 0px'});
  document.querySelectorAll('.stop').forEach(s => io.observe(s));

  /* ---------- stats ---------- */
  const visited = STOPS.filter(s => D(s.from) <= TODAY);
  if (photos.length && visited.length) {
    const hi = visited.reduce((m, s) => s.alt > m.alt ? s : m, visited[0]);
    $('stats').innerHTML = [[nf.format(photos.length), photos.length === 1 ? 'photo' : 'photos'], [`${Math.min(dn, TRIP_DAYS)}`, `of ${TRIP_DAYS} days`], [`${visited.length}`, `of ${STOPS.length} stops`], [`${nf.format(hi.alt)} m`, `highest, ${esc(hi.peak || hi.name)}`]]
      .map(([b, t]) => `<div><b>${b}</b><span>${t}</span></div>`).join('');
  } else $('stats').hidden = true;

  /* ---------- lightbox ---------- */
  const lb = $('lb'), lbImg = $('lbImg'), lbSrc = $('lbSrc'); let at = 0, lastFocus = null;
  function showLb(i) {
    at = (i + ALL.length) % ALL.length; const a = ALL[at], base = 'img/' + a.p.id;
    lbSrc.srcset = a.p.sizes.map(w => `${base}-${w}.avif ${w}w`).join(', ');
    lbImg.src = base + '.jpg'; lbImg.alt = a.p.caption || '';
    $('lbTitle').textContent = a.title;
    $('lbMeta').textContent = [a.p.caption ? a.where : '', a.when, a.exif].filter(Boolean).join(' · ');
    $('lbCount').textContent = `${at + 1} of ${ALL.length}`;
  }
  function openLb(i) { lastFocus = document.activeElement; lb.hidden = false; document.body.style.overflow = 'hidden'; showLb(i); $('lbClose').focus(); }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); }
  $('lbClose').onclick = closeLb;
  $('lbPrev').onclick = () => showLb(at - 1);
  $('lbNext').onclick = () => showLb(at + 1);
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-stage')) closeLb(); });
  addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowRight') showLb(at + 1); if (e.key === 'ArrowLeft') showLb(at - 1); });
  let tx = 0;
  lb.addEventListener('touchstart', e => tx = e.touches[0].clientX, {passive: true});
  lb.addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 40) showLb(at + (d < 0 ? 1 : -1)); });
}
$('toTop').addEventListener('click', e => { e.preventDefault(); scrollTo({top: 0, behavior: reduce() ? 'auto' : 'smooth'}); });
})();

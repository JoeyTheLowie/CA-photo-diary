/* Photo diary: reads data/trip.json (route) and data/diary.json (photos + each location's blocks, built by scripts/process.mjs)
   and renders the ridgeline, the stops (newest first) and the lightbox. */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const D = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const nf = new Intl.NumberFormat('en-GB');
const fmtShort = d => d.toLocaleDateString('en-GB', {day:'numeric', month:'short'});
const fmtRange = (a, b) => a.getMonth() === b.getMonth()
  ? `${a.getDate()}–${b.getDate()} ${a.toLocaleDateString('en-GB', {month:'short'})}`
  : `${fmtShort(a)} – ${fmtShort(b)}`;

const noCache = {cache: 'no-cache'};
/* ?preview: the post page shows one location in an iframe, sends it the photos and blocks as they change, and edits them in place (assets/editor.js) */
const PREVIEW = /[?&]preview/.test(location.search);
let relayout = () => {};
addEventListener('resize', (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => relayout(), 100); }; })());
if (PREVIEW) {
  document.documentElement.classList.add('preview');
  const editor = /[?&]edit/.test(location.search) ? new Promise(res => { const s = document.createElement('script'); s.src = 'assets/editor.js'; s.onload = s.onerror = res; document.head.appendChild(s); }) : null;
  Promise.all([fetch('data/trip.json', noCache).then(r => r.json()), editor]).then(([trip]) => {
    addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.diary) { window.__edit = e.data.edit || null; render(trip, e.data.diary, e.data.edit || null); } });
    parent.postMessage({previewReady: true}, location.origin);
  });
} else Promise.all([
  fetch('data/trip.json', noCache).then(r => r.json()),
  fetch('data/diary.json', noCache).then(r => r.ok ? r.json() : {}).catch(() => ({}))
]).then(([trip, diary]) => render(trip, diary || {}));

const LB = new Map();   /* photo id -> what the lightbox shows */
let openLb = () => {};
function render(trip, diary, EDIT) {
  const STOPS = trip.stops;
  const TRIP_START = D(trip.start), TRIP_DAYS = trip.days, END = D(trip.end);
  const q = new URLSearchParams(location.search).get('today');
  const now = new Date();
  const TODAY = q ? D(q) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayNo = d => Math.round((d - TRIP_START) / 864e5) + 1;
  const stopById = Object.fromEntries(STOPS.map(s => [s.id, s]));
  const photos = diary.photos || [];
  const layouts = Object.fromEntries(Object.entries(diary.layouts || {}).filter(([id, L]) => stopById[id] && L && Array.isArray(L.blocks)));

  /* ---------- texts (editable on the post page, stored in trip.json) ---------- */
  const X = trip.texts || {};
  const setText = (sel, v) => { const el = document.querySelector(sel); if (el && v) el.textContent = v; };
  setText('.topbar b', X.title || trip.title); setText('.intro h1', X.headline); setText('.intro p', X.intro); setText('.foot span', X.footer);
  if (X.title || trip.title) document.title = X.title || trip.title;
  dispatchEvent(new Event('resize'));   /* the hero scene measures the intro */

  /* ---------- top bar ---------- */
  const dn = dayNo(TODAY);
  $('dayCount').textContent = dn < 1 ? `Starts in ${1 - dn} day${dn === 0 ? '' : 's'}`
    : dn > TRIP_DAYS ? `${TRIP_DAYS} days, all done` : `Day ${dn} of ${TRIP_DAYS}`;

  /* ---------- locations, newest first. Each location is a list of blocks made on the post page;
     only photos placed in a block are shown. ---------- */
  const host = $('stops'); host.textContent = '';
  const GAP = 8, PAGES = [];
  const byHash = new Map(photos.map(p => [p.hash, p]));
  const hasContent = L => L && L.blocks.some(b => (b.p || []).some(h => h && byHash.has(h)) || (b.h || '').trim() || (b.b || '').trim());
  const withPhotos = (EDIT ? STOPS.filter(s => s.id === EDIT.stop) : STOPS.filter(s => hasContent(layouts[s.id]))).reverse();
  const shown = new Set(withPhotos.flatMap(s => layouts[s.id] ? layouts[s.id].blocks.flatMap(b => b.p || []) : []).filter(h => h && byHash.has(h)));

  function figure(p, s, caption) {
    const base = 'img/' + p.id;
    const f = document.createElement('figure');
    f.className = 'ph'; f.dataset.pid = p.id;
    if (p.lqip) f.style.backgroundImage = `url(${p.lqip})`;
    if (p.src) f.innerHTML = `<picture><source srcset=""><img src="${p.src}" width="${p.w}" height="${p.h}" alt=""></picture>`;   /* editor: not uploaded yet */
    else f.innerHTML = `<picture><source type="image/avif" srcset="${p.sizes.map(w => `${base}-${w}.avif ${w}w`).join(', ')}" sizes="100vw"><img src="${base}.jpg" width="${p.w}" height="${p.h}" alt="${esc(caption)}" loading="lazy" decoding="async"></picture>`;
    if (!EDIT) {
      f.tabIndex = 0; f.setAttribute('role', 'button'); f.setAttribute('aria-label', caption || `Photo from ${s.name}`);
      LB.set(p.id, {p, title: caption || s.name, caption, where: s.name, when: p.src ? '' : `${fmtShort(D(p.date))}${p.time ? ', ' + p.time : ''}`, exif: p.exif});
      f.addEventListener('click', () => openLb(f));
      f.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openLb(f); } });
    }
    const im = f.querySelector('img');
    if (im.complete && im.naturalWidth) im.classList.add('in'); else im.addEventListener('load', () => im.classList.add('in'), {once: true});
    return f;
  }
  /* A note is a heading (big, bold) and/or text. In the editor both are always there, editable in place. */
  function noteEl(it) {
    const pars = (it.text || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    const head = it.heading || '';
    const el = document.createElement('div'); el.className = 'note';
    if (EDIT) {
      el.innerHTML = `<div class="h"><p class="q" data-f="h" data-ph="${it.quote ? 'Your quote' : 'Heading'}"></p></div>${it.quote ? '' : '<div class="b"><p class="body" data-f="b" data-ph="Text"></p></div>'}`;
      el.querySelector('[data-f=h]').textContent = head;
      if (!it.quote) el.querySelector('[data-f=b]').textContent = pars.join('\n\n');
      el._head = true; el._body = !it.quote; el._len = Math.max(60, (head + ' ' + pars.join(' ')).trim().length);
      return el;
    }
    if (head) { const hd = document.createElement('div'); hd.className = 'h'; const q = document.createElement('p'); q.className = 'q'; q.textContent = head; hd.appendChild(q); el.appendChild(hd); }
    if (pars.length) { const bd = document.createElement('div'); bd.className = 'b'; pars.forEach(par => { const q = document.createElement('p'); q.className = 'body'; q.textContent = par; bd.appendChild(q); }); el.appendChild(bd); }
    el._head = !!head; el._body = pars.length > 0; el._len = (head + ' ' + pars.join(' ')).trim().length;
    return el;
  }
  /* A text without photos: a heading only is a centred quote; otherwise heading left, text right. */
  const standalone = n => 'note ' + (!n._body ? 'pull' : n._head ? 'spread' : 'spread only-body');

  /* one block of a location: returns its element, or null when it has nothing to show */
  const ar = x => x.w / x.h;
  function blockEl(pg, b, Wc, wide, phone, maxH) {
    const el = document.createElement('div'); el.className = 'blk blk-' + b.t;
    const add = x => el.appendChild(x);
    const capOf = h => (pg.captions && pg.captions[h]) || (byHash.get(h) || {}).caption || '';
    /* photo spots: real photos, and in the editor empty spots too */
    const spots = (b.p || []).map((h, j) => {
      const p = h && byHash.get(h);
      if (p) { let f = pg.figs.get(h + '|' + b.id + '|' + j); if (!f) { f = figure(p, pg.stop, capOf(h)); pg.figs.set(h + '|' + b.id + '|' + j, f); } f.dataset.slot = j; f.classList.remove('slot'); return {p, el: f, j}; }
      if (!EDIT) return null;
      const f = document.createElement('div'); f.className = 'ph slot'; f.dataset.slot = j;
      return {p: {w: b.t === 'full' ? 16 : 3, h: b.t === 'full' ? 9 : 2}, el: f, j};
    }).filter(Boolean);
    const just = list => (Wc - GAP * (list.length - 1)) / list.reduce((a, x) => a + ar(x.p), 0);
    const sizes = (f, w) => { const s = f.querySelector('source'); if (s && s.type) s.sizes = Math.ceil(w) + 'px'; };
    const row = (items, h) => {
      const r = document.createElement('div'); r.className = 'jrow'; r.style.height = Math.round(h) + 'px';
      items.forEach(it => {
        if (it.tile) { it.el.style.flex = `${it.w} 1 0`; r.appendChild(it.el); return; }
        const f = it.el; f.classList.remove('header');
        f.style.flex = items.length === 1 ? '1 1 0' : `${ar(it.p).toFixed(4)} 1 0`;
        f.classList.toggle('fit', items.length === 1 && ar(it.p) < Wc / h * .7);
        sizes(f, items.length === 1 ? Wc : ar(it.p) * h); r.appendChild(f);
      });
      return r;
    };
    const sideBySide = list => (phone && list.length === 4 ? [list.slice(0, 2), list.slice(2)] : [list]).forEach(c => add(row(c, Math.min(just(c), maxH))));
    const textOf = (quote) => noteEl({heading: (b.h || '').trim(), text: quote ? '' : (b.b || '').trim(), quote});
    if (b.t === 'full') {
      if (!spots[0]) return null;
      const w = document.createElement('div'); w.className = 'hdr'; const f = spots[0].el;
      f.style.flex = ''; f.classList.remove('fit'); f.classList.add('header'); sizes(f, Wc); w.appendChild(f); add(w);
    } else if (b.t === 'single') {
      if (!spots[0]) return null;
      add(row([spots[0]], Math.min(Wc / ar(spots[0].p), maxH)));
    } else if (b.t === 'row') {
      if (!spots.length) return null;
      sideBySide(spots);
    } else if (b.t === 'mosaic') {
      if (spots.length < 3) { if (!spots.length) return null; sideBySide(spots); return el; }
      /* one big photo and two stacked: heights solved so both columns end level */
      const [big, s1, s2] = spots, k = 1 / ar(s1.p) + 1 / ar(s2.p), a0 = ar(big.p);
      const H = Math.min((Wc - GAP + GAP / k) / (a0 + 1 / k), maxH);
      const m = document.createElement('div'); m.className = 'mosaic'; m.style.height = Math.round(H) + 'px';
      const colB = document.createElement('div'); colB.className = 'col'; colB.style.flex = `${a0.toFixed(4)} 1 0`;
      const colS = document.createElement('div'); colS.className = 'col'; colS.style.flex = `${(1 / k).toFixed(4)} 1 0`;
      [big, s1, s2].forEach(it => { it.el.classList.remove('fit', 'header'); it.el.style.flex = ''; });
      big.el.style.flex = '1 1 0'; colB.appendChild(big.el); sizes(big.el, a0 * H);
      [s1, s2].forEach(it => { it.el.style.flex = `${(1 / ar(it.p)).toFixed(4)} 1 0`; colS.appendChild(it.el); sizes(it.el, H / k); });
      if (b.side === 'right') m.append(colS, colB); else m.append(colB, colS);
      add(m);
    } else if (b.t === 'photo-text') {
      const note = textOf(false), right = b.side === 'right';
      if (!note._len) { if (!spots.length) return null; sideBySide(spots); return el; }
      if (!spots.length) { note.className = standalone(note); add(note); return el; }
      if (wide) {
        const sum = spots.reduce((a, x) => a + ar(x.p), 0);
        note.className = 'note tile' + (right ? ' right' : '');
        const tile = {tile: true, el: note, w: Math.min(note._len <= 110 ? .8 : note._len <= 260 ? 1 : 1.3, Math.max(.6, sum * .75))};
        const items = right ? [...spots, tile] : [tile, ...spots];
        add(row(items, Math.min((Wc - GAP * (items.length - 1)) / (sum + tile.w), maxH)));
      } else {
        note.className = 'note';   /* phones: text above the photos when it sits left, below when it sits right */
        if (!right) add(note); sideBySide(spots); if (right) add(note);
      }
    } else if (b.t === 'quote') {
      const note = textOf(true); if (!note._len) return null; note.className = 'note pull'; add(note);
    } else if (b.t === 'text') {
      const note = textOf(false); if (!note._len) return null; note.className = standalone(note); add(note);
    } else return null;
    return el;
  }
  /* wide screens may use their own order ("Deviate on desktop" on the post page) */
  function layoutPage(pg, force) {
    const Wc = pg.el.clientWidth; if (!Wc || (Wc === pg.w && !force)) return; pg.w = Wc;
    pg.el.textContent = '';
    const wide = Wc >= 760, phone = Wc < 600, desk = innerWidth >= 900;
    const maxH = phone ? innerHeight * .8 : Math.min(innerHeight * .85, Wc * .9);
    const ids = desk && pg.desktop ? pg.desktop : null;
    const order = ids ? ids.map(id => pg.blocks.find(b => b.id === id)).filter(Boolean).concat(pg.blocks.filter(b => !ids.includes(b.id))) : pg.blocks;
    order.forEach((b, i) => { const el = blockEl(pg, b, Wc, wide, phone, maxH); if (el) { el.dataset.id = b.id || ''; el.dataset.i = i; pg.el.appendChild(el); } });
  }

  withPhotos.forEach(s => {
    const sec = document.createElement('section'); sec.className = 'stop'; sec.id = s.id;
    const altTxt = s.peak ? `${s.peak}, ${nf.format(s.alt)} m` : `${nf.format(s.alt)} m`;
    sec.innerHTML = `<div class="stop-head"><h2>${esc(s.name)}</h2><div class="meta">${esc(s.country)}<span class="dot">·</span>${fmtRange(D(s.from), D(s.to))}<span class="dot">·</span>${esc(altTxt)}</div></div>`;
    const L = layouts[s.id] || {blocks: []};
    const m = document.createElement('div'); m.className = 'rows';
    PAGES.push({el: m, stop: s, blocks: L.blocks, desktop: L.desktop || null, captions: L.captions || {}, figs: new Map(), w: 0});
    sec.appendChild(m); host.appendChild(sec);
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
  const layoutAll = force => { PAGES.forEach(pg => layoutPage(pg, force)); if (EDIT && window.__decorate) window.__decorate(); };
  layoutAll(); relayout = () => layoutAll();
  document.fonts && document.fonts.ready.then(() => layoutAll(true));
  if (PREVIEW) return;

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
    const W = ridge.clientWidth, H = ridge.clientHeight, top = 34, bot = H - 10, MAX = 4400, pad = 10;
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
    /* row under the ridge: end labels and country names */
    const row = $('ridgeRow');
    /* phones: a short home label and no finish label, so all four country names fit */
    row.innerHTML = innerWidth < 700 ? `<span class="end-l">${esc(trip.home.short || trip.home.name.slice(0, 3).toUpperCase())}</span>`
      : `<span class="end-l">${esc(trip.home.name)} · ${fmtShort(TRIP_START)}</span><span class="end-r">${esc(trip.finish.name)} · ${fmtShort(END)}</span>`;
    const runs = []; STOPS.forEach(s => { const a = dayNo(D(s.from)) - 1, b = dayNo(D(s.to)) - 1, last = runs[runs.length - 1]; if (last && last.c === s.country) last.b = b; else runs.push({c: s.country, a, b}); });
    const ends = [...row.children].map(e => e.getBoundingClientRect());
    runs.forEach((r, i) => {
      if (r.b - r.a < 3) return;
      const l = document.createElement('span'); l.className = 'ct'; l.textContent = r.c; l.style.left = X((r.a + r.b) / 2) + 'px'; row.appendChild(l);
      /* nudge a name clear of the end labels and the row edges before giving up on it */
      const rr = row.getBoundingClientRect(); let rc = l.getBoundingClientRect(), dx = 0;
      ends.forEach(e => { if (rc.left < e.right + 10 && rc.right > e.left - 10) dx = e.left < rr.left + rr.width / 2 ? e.right + 10 - rc.left : e.left - 10 - rc.right; });
      if (rc.right + dx > rr.right) dx = rr.right - rc.right;
      if (dx) { l.style.left = (parseFloat(l.style.left) + dx) + 'px'; rc = l.getBoundingClientRect(); }
      const prev = [...row.querySelectorAll('.ct')].filter(o => o !== l).map(o => o.getBoundingClientRect());
      if ([...ends, ...prev].some(e => rc.left < e.right + 8 && rc.right > e.left - 8)) l.remove();
    });
    setActive(current);
  }
  let current = withPhotos[0] && withPhotos[0].id;
  function setActive(id) { current = id; ridge.querySelectorAll('.pt').forEach(b => b.classList.toggle('active', b.dataset.id === id)); }
  drawRidge();
  const rbar = $('rbar');
  /* stuck = the bar has reached its sticky position (the sentinel just above it has scrolled past that line) */
  const sentinel = $('sentinel'); let sq = false;
  const checkStuck = () => { sq = false; const st = sentinel.getBoundingClientRect().top < parseFloat(getComputedStyle(rbar).top) - .5;
    if (st !== rbar.classList.contains('stuck')) { rbar.classList.toggle('stuck', st); drawRidge(); } };
  addEventListener('scroll', () => { if (!sq) { sq = true; requestAnimationFrame(checkStuck); } }, {passive: true});
  addEventListener('resize', checkStuck); checkStuck();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawRidge, 120); });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), {rootMargin: '-45% 0px -50% 0px'});
  document.querySelectorAll('.stop').forEach(s => io.observe(s));

  /* ---------- stats ---------- */
  const visited = STOPS.filter(s => D(s.from) <= TODAY);
  if (shown.size && visited.length) {
    const hi = visited.reduce((m, s) => s.alt > m.alt ? s : m, visited[0]);
    $('stats').innerHTML = [[nf.format(shown.size), shown.size === 1 ? 'photo' : 'photos'], [`${Math.min(dn, TRIP_DAYS)}`, `of ${TRIP_DAYS} days`], [`${visited.length}`, `of ${STOPS.length} stops`], [`${nf.format(hi.alt)} m`, `highest, ${esc(hi.peak || hi.name)}`]]
      .map(([b, t]) => `<div><b>${b}</b><span>${t}</span></div>`).join('');
  } else $('stats').hidden = true;

  /* ---------- lightbox ---------- */
  /* the lightbox follows the photos in the order they appear on the page */
  const lb = $('lb'), lbImg = $('lbImg'), lbSrc = $('lbSrc'); let at = 0, lastFocus = null, ALL = [];
  function showLb(i) {
    at = (i + ALL.length) % ALL.length; const a = LB.get(ALL[at]), base = 'img/' + a.p.id;
    lbSrc.srcset = a.p.sizes.map(w => `${base}-${w}.avif ${w}w`).join(', ');
    lbImg.src = base + '.jpg'; lbImg.alt = a.caption || '';
    $('lbTitle').textContent = a.title;
    $('lbMeta').textContent = [a.caption ? a.where : '', a.when, a.exif].filter(Boolean).join(' · ');
    $('lbCount').textContent = `${at + 1} of ${ALL.length}`;
  }
  openLb = f => { ALL = [...host.querySelectorAll('.ph[data-pid]')].map(x => x.dataset.pid).filter(id => LB.has(id)); lastFocus = document.activeElement; lb.hidden = false; document.body.style.overflow = 'hidden'; showLb(Math.max(0, ALL.indexOf(f.dataset.pid))); $('lbClose').focus(); };
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

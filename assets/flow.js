/* ===== Scenery flow: one line that follows the trip down the page =====
   Lava leaves the hero volcano's crater (assets/scene.js, which only shares its geometry) and runs down through the photos;
   it hits the Belize lagoon and carries on as a river, past the Honduran sea with its surfer, drains into a sinkhole and comes
   back up in Nicaragua as a vine with leaves, flowers and a few animals, and ends on the Managua runway once the trip is over.
   It is drawn on one fixed canvas (#fx), grows as you scroll, and stays out of the middle of photos and away from text. */
(() => {
'use strict';
if (/[?&]preview/.test(location.search) || !document.getElementById('fx')) return;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rnd = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t, al = 1) => { const A = hx(a), B = hx(b); return `rgba(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t, 0, 1)))},${al})`; };
const O = {reveal: /[?&]flow=drawn/.test(location.search) ? 'drawn' : 'follow', w: 2, crust: true, embers: true, shimmer: true, lakes: true, leaves: true, animals: true, flowers: true, plane: true};
const RB = document.getElementById('rbar');
const bye = on => { const e = document.getElementById('bye'); if (e) e.classList.toggle('on', on); };

/* ---------- noise: smooth random wandering, the way a flow picks its way through terrain ---------- */
const hsh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function vn(l, K, sd) { const f = l / K, i = Math.floor(f), t = f - i, u = t * t * (3 - 2 * t), a = hsh(i + sd * 101.3) * 2 - 1, b = hsh(i + 1 + sd * 101.3) * 2 - 1; return a + (b - a) * u; }
const lavaN = (l, s = 0) => clamp(.85 * vn(l, 64, 1 + s) + .16 * vn(l, 23, 2 + s), -1, 1);   /* lumpy */
const waterN = (l, s = 0) => clamp(.9 * vn(l, 78, 4 + s) + .22 * vn(l, 24, 5 + s), -1, 1);                           /* long meanders */
const vineN = (l, s = 0) => clamp(.75 * vn(l, 100, 6 + s) + .2 * vn(l, 31, 7 + s), -1, 1);

/* ---------- route: centre lines through the free space; the drawn streams wander inside it ---------- */
let R = null, S = {}, F = {}, MAIN = null, HUG = null;
let TUBE = null, OT = [], OP = [], SEAC = null, BUB = [], BUBT = 0, ANIMALS = [], LEAVES = [], SHOOTS = [], POOLS = [], BR = [], STALLS = [], SPL = [], SPRIGS = [], TUFTS = [], DELTAS = [], PL = false;
function sample(W, RAD) {
  const V = [];
  for (const p of W) { const q = V[V.length - 1]; if (q && Math.hypot(p.x - q.x, p.y - q.y) < .5) { if (p.tag) q.tag = p.tag; } else V.push({...p}); }
  const xs = [V[0].x], ys = [V[0].y], tag = {}, st = 3;
  let px = V[0].x, py = V[0].y;
  const to = (x, y) => { const dx = x - px, dy = y - py, d = Math.hypot(dx, dy); if (d < .01) return; const n = Math.ceil(d / st); for (let k = 1; k <= n; k++) { xs.push(px + dx * k / n); ys.push(py + dy * k / n); } px = x; py = y; };
  for (let i = 1; i < V.length; i++) {
    const p = V[i];
    if (p.S) {   /* a smooth S-bend from one channel to the next: leaves and arrives vertically */
      const x0 = px, y0 = py, ym = (y0 + p.y) / 2, n = Math.max(8, Math.ceil((Math.abs(p.x - x0) + Math.abs(p.y - y0)) / st));
      for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; xs.push(u * u * u * x0 + 3 * u * u * t * x0 + 3 * u * t * t * p.x + t * t * t * p.x); ys.push(u * u * u * y0 + 3 * u * u * t * ym + 3 * u * t * t * ym + t * t * t * p.y); }
      px = p.x; py = p.y; if (p.tag) tag[p.tag] = xs.length - 1; continue;
    }
    if (i < V.length - 1) {
      const a = V[i - 1], b = V[i + 1], l1 = Math.hypot(p.x - a.x, p.y - a.y), l2 = Math.hypot(b.x - p.x, b.y - p.y);
      let d1x = (p.x - a.x) / l1, d1y = (p.y - a.y) / l1, d2x = (b.x - p.x) / l2, d2y = (b.y - p.y) / l2;
      if (b.S) { d2x = 0; d2y = 1; }
      if (Math.abs(d1x * d2y - d1y * d2x) > .002) {
        const r = Math.min(p.r || RAD, l1 / 2, l2 / 2), sx = p.x - d1x * r, sy = p.y - d1y * r, ex = p.x + d2x * r, ey = p.y + d2y * r;
        to(sx, sy);
        const n = Math.max(2, Math.ceil(r * 1.7 / st));
        for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; xs.push(u * u * sx + 2 * u * t * p.x + t * t * ex); ys.push(u * u * sy + 2 * u * t * p.y + t * t * ey); }
        px = ex; py = ey; if (p.tag) tag[p.tag] = xs.length - 1; continue;
      }
    }
    to(p.x, p.y); if (p.tag) tag[p.tag] = xs.length - 1;
  }
  const n = xs.length, X = Float32Array.from(xs), Y = Float32Array.from(ys), L = new Float32Array(n), TX = new Float32Array(n), TY = new Float32Array(n);
  for (let i = 1; i < n; i++) L[i] = L[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]);
  tangents(X, Y, TX, TY);
  const iY = y => { let lo = 0, hi = n; while (lo < hi) { const m = lo + hi >> 1; if (Y[m] < y) lo = m + 1; else hi = m; } return lo; };
  const iL = l => { let lo = 0, hi = n - 1; while (lo < hi) { const m = lo + hi >> 1; if (L[m] < l) lo = m + 1; else hi = m; } return lo; };
  const lAtY = y => { const i = iY(y); if (i >= n) return L[n - 1]; if (i === 0) return 0; const dy = Y[i] - Y[i - 1]; return dy > 0 ? L[i - 1] + (L[i] - L[i - 1]) * (y - Y[i - 1]) / dy : L[i - 1]; };
  return {n, X, Y, L, TX, TY, iY, iL, lAtY, tag, tot: L[n - 1]};
}
function tangents(X, Y, TX, TY) {
  const n = X.length;
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2), dx = X[b] - X[a], dy = Y[b] - Y[a], d = Math.hypot(dx, dy) || 1; TX[i] = dx / d; TY[i] = dy / d; }
}
/* room on each side of a centre line (A along +normal, B along -normal) */
function corridor(C, inside, CAP) {
  const n = C.n, ra = new Float32Array(n), rb = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const nx = -C.TY[i], ny = C.TX[i], x = C.X[i], y = C.Y[i];
    if (inside(x, y)) continue;
    let a = 0, b = 0;
    while (a < CAP && !inside(x + nx * (a + 1.5), y + ny * (a + 1.5))) a += 1.5;
    while (b < CAP && !inside(x - nx * (b + 1.5), y - ny * (b + 1.5))) b += 1.5;
    ra[i] = a; rb[i] = b;
  }
  const sm = raw => { const m = new Float32Array(n), o = new Float32Array(n); for (let i = 0; i < n; i++) { let v = 1e9; for (let j = Math.max(0, i - 5); j <= Math.min(n - 1, i + 5); j++) v = Math.min(v, raw[j]); m[i] = v; } for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - 5); j <= Math.min(n - 1, i + 5); j++) { s += m[j]; c++; } o[i] = s / c; } return o; };
  return {A: sm(ra), B: sm(rb)};
}
/* push the centre line sideways by noise, using the room on whichever side it heads to */
function wander(C, cor, noise, lw) {
  const n = C.n, PX = new Float32Array(n), PY = new Float32Array(n), PTX = new Float32Array(n), PTY = new Float32Array(n), OFF = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const z = noise(i), o = z > 0 ? z * Math.max(0, cor.A[i] - lw) : z * Math.max(0, cor.B[i] - lw);
    OFF[i] = o; PX[i] = C.X[i] - C.TY[i] * o; PY[i] = C.Y[i] + C.TX[i] * o;
  }
  /* fluids don't make sharp corners: blur the drawn line a few times (ends stay put) */
  const K = 7, tx = new Float32Array(n), ty = new Float32Array(n);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n; i++) {
      const k = Math.min(K, i, n - 1 - i); let sx = 0, syy = 0;
      for (let j = i - k; j <= i + k; j++) { sx += PX[j]; syy += PY[j]; }
      tx[i] = sx / (2 * k + 1); ty[i] = syy / (2 * k + 1);
    }
    PX.set(tx); PY.set(ty);
  }
  tangents(PX, PY, PTX, PTY);
  return {PX, PY, PTX, PTY, OFF, L: C.L, n, C};
}
function atP(l, st = MAIN) {
  const C = st.C, i = Math.max(1, C.iL(l)), t = clamp((l - C.L[i - 1]) / ((C.L[i] - C.L[i - 1]) || 1), 0, 1);
  return {x: lerp(st.PX[i - 1], st.PX[i], t), y: lerp(st.PY[i - 1], st.PY[i], t), tx: st.PTX[i], ty: st.PTY[i], i};
}
const textBox = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
function deltaTree(x, y, ang, len, depth, rr, out, lvl = 0) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, bend = (rr() - .5) * len * .5;
  out.push({x, y, ex, ey, cx: (x + ex) / 2 - Math.sin(ang) * bend, cy: (y + ey) / 2 + Math.cos(ang) * bend, lvl});
  if (depth > 0) { const k = rr() < .35 ? 3 : 2; for (let j = 0; j < k; j++) deltaTree(ex, ey, ang + (j - (k - 1) / 2) * (.5 + rr() * .3), len * (.62 + rr() * .2), depth - 1, rr, out, lvl + 1); }
  return out;
}


function build() {
  const sy = scrollY, vw = document.documentElement.clientWidth; PL = innerWidth < 700;
  const stopsEl = $('#stops'); if (!stopsEl || !stopsEl.querySelector('.stop')) { R = null; return; }
  const pr = stopsEl.getBoundingClientRect(), edgeL = 0, edgeR = vw, colL = pr.left, colR = pr.right, cx = (colL + colR) / 2, colW = colR - colL;
  const G1 = Math.max(5, Math.min(PL ? 40 : 50, colL - edgeL - 1)), MARG = PL ? 3 : 6;
  const gL = {lo: colL - G1, hi: colL - 3, t: 'g', s: -1}, gR = {lo: colR + 3, hi: colR + G1, t: 'g', s: 1};
  const rr = rnd(17);

  /* obstacles: text keeps a margin; photos may be brushed at the edges and corners, never crossed in the middle */
  OT = []; OP = []; const INS = PL ? 2 : 3, RC = PL ? 14 : 24;
  const addT = r => { if (r.width > 0 && r.height > 0) OT.push({l: r.left - MARG, r: r.right + MARG, t: r.top + sy - MARG, b: r.bottom + sy + MARG}); };
  $$('#stops .ph').forEach(e => { const r = e.getBoundingClientRect(); OP.push({l: r.left + INS, r: r.right - INS, t: r.top + sy + INS, b: r.bottom + sy - INS, el: e, R: r}); });
  $$('.stop-head h2, .stop-head .meta, .note .q, .note .body, .cl b, .cl span, .end .lab b, .end .lab span, .later, .intro h1, .intro p, .jump:not([hidden])').forEach(e => addT(textBox(e)));
  const BS = 200, BK = new Map();
  const bucket = (o, kind) => { for (let k = Math.floor(o.t / BS); k <= Math.floor(o.b / BS); k++) { if (!BK.has(k)) BK.set(k, []); BK.get(k).push([o, kind]); } };
  OT.forEach(o => bucket(o, 0)); OP.forEach(o => bucket(o, 1));
  const inside = (px, py) => {
    if (px < edgeL + 1 || px > edgeR - 1) return true;
    const list = BK.get(Math.floor(py / BS)); if (!list) return false;
    for (const [o, k] of list) {
      if (px <= o.l || px >= o.r || py <= o.t || py >= o.b) continue;
      if (!k) return true;
      const qx = px < o.l + RC ? o.l + RC : px > o.r - RC ? o.r - RC : px, qy = py < o.t + RC ? o.t + RC : py > o.b - RC ? o.b - RC : py;
      if (qx === px || qy === py || Math.hypot(px - qx, py - qy) < RC) return true;   /* rounded corners: the flow can cut across a corner */
    }
    return false;
  };

  /* rows (a heading, a row of photos, a note, a country moment) and the vertical channels each one leaves open */
  const span = el => { const bs = [...el.querySelectorAll('.q, .body')].map(textBox).filter(b => b.width); if (!bs.length) return el.getBoundingClientRect(); return {left: Math.min(...bs.map(b => b.left)), right: Math.max(...bs.map(b => b.right))}; };
  const edgeOf = (el, side) => { if (el.classList.contains('note')) { const b = span(el); return side < 0 ? b.left - 8 : b.right + 8; } const r = el.getBoundingClientRect(); return side < 0 ? r.left + INS : r.right - INS; };
  const rows = [];
  for (const el of $$('#stops .stop-head, #stops .blk > *, #stops .cdiv, #stops .end, #stops .later')) {
    const r = el.getBoundingClientRect(), top = r.top + sy, bot = r.bottom + sy;
    if (r.height < 1) continue;
    if (el.classList.contains('cdiv')) { rows.push({kind: 'div', el, top, bot, k: el.dataset.k}); continue; }
    if (el.classList.contains('end')) { rows.push({kind: 'end', el, top, bot}); continue; }
    const ch = [gL, gR];
    const freeRight = right => { if (colR - right > 70) ch[1] = {lo: right + 18, hi: colR + G1, t: 'f', s: 1}; };
    const freeLeft = left => { if (left - colL > 70) ch[0] = {lo: colL - G1, hi: left - 18, t: 'f', s: -1}; };
    const gaps = kids => { for (let k = 1; k < kids.length; k++) { const lo = edgeOf(kids[k - 1], 1), hi = edgeOf(kids[k], -1); if (hi - lo > 3) ch.push({lo, hi, t: 'i', s: 0}); } };
    if (el.classList.contains('stop-head')) freeRight(Math.max(...[...el.children].map(c => textBox(c).right)));
    else if (el.classList.contains('later')) freeRight(textBox(el).right);
    else if (el.classList.contains('jrow')) gaps([...el.children]);
    else if (el.classList.contains('mosaic')) gaps([...el.children]);
    else if (el.classList.contains('pull')) { const b = span(el); freeLeft(b.left); freeRight(b.right); }
    else if (el.classList.contains('spread')) { const h = el.querySelector('.h'), b = el.querySelector('.b'); if (h && b) { const lo = span(h).right + 18, hi = span(b).left - 18; if (hi - lo > 20) ch.push({lo, hi, t: 'f', s: 0}); } freeRight(span(el).right); }
    rows.push({kind: el.classList.contains('stop-head') ? 'head' : 'blk', el, top, bot, ch});
  }
  const xIn = c => {
    if (c.t === 'i') return (c.lo + c.hi) / 2;
    if (c.t === 'f') { const lo = c.s < 0 ? Math.max(c.lo + 22, colL + 26) : c.lo + 22, hi = c.s > 0 ? Math.min(c.hi - 22, colR - 26) : c.hi - 22; return hi > lo ? lerp(lo, hi, .2 + rr() * .6) : (c.lo + c.hi) / 2; }
    const m = Math.min(PL ? 3 : 10, (c.hi - c.lo) / 3); return lerp(c.lo + m, c.hi - m, rr());
  };
  const near = (c, x) => x > c.lo - 4 && x < c.hi + 4;

  /* the start: one lava stream from the hero volcano's own crater, down its right flank, under the ridge bar */
  const sc = window.__scene, rbar = $('#rbar'), sent = $('#sentinel');
  const rbBot = sent ? sent.getBoundingClientRect().top + sy + (rbar ? rbar.offsetHeight + (parseFloat(rbar.style.marginBottom) || 0) : 0) + 12 : 0;
  const W = [];
  let x;
  if (sc && sc.V) {
    const V = sc.V, s0 = sc.s || 1, Gd = sc.G, xMax = edgeR - 22;
    /* from the crater straight down the face, drifting right and wandering a little, always inside the cone */
    for (let k = 0; k <= 40; k++) {
      const u = k / 40, y = lerp(V.y + 5, Gd - 2, u);
      let px = Math.min(xMax, V.x + V.cw * .1 + V.bw * .45 * Math.pow(u, 1.25) + (Math.sin(u * 9 + .5) * 15 + Math.sin(u * 23 + 1) * 4) * s0 * Math.sqrt(u) * (1 - u * .4));
      while (px > V.x && sc.profileY(px) > y - 5 * s0) px -= 1;
      W.push({x: px, y});
    }
    x = W[W.length - 1].x;
    for (let k = 1; k < W.length; k++) if (W[k].y < W[k - 1].y + 1) W[k].y = W[k - 1].y + 1;
  } else { x = colR - 40; W.push({x, y: rbBot - 120}); }
  W.push({x, y: Math.max(rbBot, W[W.length - 1].y + 20), tag: 'h0'});
  x = clamp(x, gL.lo + 4, gR.hi - 4);
  let prevB = rbBot, sti = 0, run = 0, lastY = rbBot;
  F = {};
  const soft = PL ? 28 : 64;
  rows.forEach((row, ri) => {
    if (F.rw) return;
    if (row.kind === 'div') {
      const k = row.k, y = row.top + (row.bot - row.top) * .34, hw = k === 'sink' ? 22 : k === 'lake1' ? (PL ? Math.min(150, colW * .42) : 170) : (PL ? Math.min(150, colW * .44) : Math.min(300, Math.max(210, colW * .22)));
      const s = Math.abs(x - cx) < 4 ? (rr() < .5 ? -1 : 1) : Math.sign(x - cx), gap = k === 'sink' ? (PL ? 30 : 74) : (PL ? 8 : 40);
      const xs = clamp(cx + s * (hw + gap), edgeL + 6, edgeR - 6), xe = clamp(cx - s * (hw + gap), edgeL + 6, edgeR - 6);
      if (Math.abs(xs - x) > 2) W.push({x, y: prevB + 10}, {x: xs, y: y - 46, S: true});
      W.push({x: xs, y, r: Math.min(soft, Math.abs(xs - cx) - hw)}, {x: cx + s * hw, y, tag: k + 'A'}, {x: cx - s * hw, y, tag: k + 'B'}, {x: xe, y, r: Math.min(soft, Math.abs(xe - cx) - hw)});
      F[k] = {cx, cy: y, hw, ry: k === 'lake1' ? (PL ? 36 : 54) : (PL ? 20 : 26), dir: -s};
      x = xe; prevB = y + 44; lastY = y + 30; run = 0; return;
    }
    if (row.kind === 'end') {
      const y = row.top + (row.bot - row.top) * .38, len = Math.min(colW * (PL ? .74 : .6), 560), s = x < cx ? -1 : 1;
      const x0 = cx + s * len / 2, x1 = cx - s * len / 2, xs = x0 + s * (PL ? 14 : 40);
      if (Math.abs(xs - x) > 2) W.push({x, y: prevB + 10}, {x: xs, y: y - 46, S: true});
      W.push({x: xs, y, r: PL ? 14 : 40}, {x: x0, y, tag: 'rwA'}, {x: x1, y, tag: 'rwB'});
      F.rw = {x0, x1, y, dir: -s, len};
      return;
    }
    /* pick the next channel: through the photos when there's a gap, beside short text, or down a margin (never too long the same) */
    const band = row.top - prevB, m = Math.max(1, Math.min(10, band * .25)), tight = band < 26;
    let c, nx;
    const cur = row.ch.find(q => near(q, x));
    {
      /* a thin gap between rows only allows a short hop (it runs along photo edges), so pick something close by */
      const reach = tight ? colW * (PL ? .7 : .45) : 1e9;
      const ok = row.ch.filter(q => q === cur || Math.abs(Math.max(q.lo, Math.min(q.hi, x)) - x) < reach);
      const ins = ok.filter(q => q.t === 'i');
      if (ins.length && rr() < .97) { ins.sort((a, b) => Math.abs((a.lo + a.hi) / 2 - x) - Math.abs((b.lo + b.hi) / 2 - x)); c = ins[rr() < .75 ? 0 : ins.length - 1]; }
      else {
        const others = ok.filter(q => q.t !== 'i');
        const same = others.find(q => near(q, x));
        c = same && run < 2 && rr() < .55 ? same : (others.filter(q => q !== same)[0] || same || others[0] || cur || row.ch[0]);
      }
      nx = c === cur && c.t === 'i' ? x : xIn(c);
    }
    run = cur && c === cur ? run + 1 : 0;
    let y0 = prevB + m, y1 = row.top - m;
    if (Math.abs(nx - x) > 2) { const B = PL ? 26 : 40, dx = Math.abs(nx - x), want = Math.min(B, 10 + dx * .18); y0 -= Math.min(want, Math.max(0, (y0 - lastY) * .4)); y1 += Math.min(want, (row.bot - y1) * .35); }
    W.push({x, y: y0, tag: 'sp' + sti});
    if (Math.abs(nx - x) > 2) W.push({x: nx, y: y1, S: true, tag: 'st' + sti}); else W.push({x, y: y1, tag: 'st' + sti});
    sti++; x = nx; prevB = row.bot; lastY = y1;
  });
  if (!F.rw) W.push({x, y: prevB + 30, tag: 'tail'});
  TUBE = sent && sc && sc.V ? {y1: sent.getBoundingClientRect().top + sy - 6, y2: rbBot + 8} : null;
  const splits = [];

  R = sample(W, PL ? 20 : 44);
  /* key points along the route; a country the trip hasn't reached yet sits beyond the end */
  const BIG = 1e9, T = k => R.tag[k] != null ? R.L[R.tag[k]] : null;
  const ORD = [['l1A', 'lake1A'], ['l1B', 'lake1B'], ['l2A', 'lake2A'], ['l2B', 'lake2B'], ['skA', 'sinkA'], ['skB', 'sinkB'], ['rwA', 'rwA'], ['rwB', 'rwB']];
  S = {h0: T('h0')};
  let nextV = BIG; for (let k = ORD.length - 1; k >= 0; k--) { const v = T(ORD[k][1]); S[ORD[k][0]] = v != null ? v : nextV; if (v != null) nextV = v; }
  S.vEnd = Math.min(S.rwA, R.tot);
  const pkEl = $('#riosanjuan');
  if (pkEl && S.skB < BIG) { const pk = pkEl.getBoundingClientRect(); S.pkA = Math.max(S.skB + 60, R.lAtY(pk.top + sy + 40)); S.pkB = Math.max(S.pkA + 1, R.lAtY(pk.bottom + sy)); }
  else { S.pkA = Math.min(S.vEnd, S.skB + 900); S.pkB = Math.max(S.pkA + 1, S.vEnd); }

  const CAP = PL ? 14 : 34, cor = corridor(R, inside, CAP), n = R.n;
  const calm = (a, b, pad) => { for (let i = 0; i < n; i++) { const l = R.L[i], d = l < a ? a - l : l > b ? l - b : 0, k = sstep(0, pad, d); cor.A[i] *= k; cor.B[i] *= k; } };
  for (let i = 0; i < n && R.L[i] <= S.h0; i++) { cor.A[i] = Math.min(cor.A[i], 2.5); cor.B[i] = Math.min(cor.B[i], 2.5); }
  calm(S.l1A, S.l1B, 50); calm(S.l2A, S.l2B, 50); calm(S.skA, S.skB, 50); calm(S.rwA - 50, S.rwB, 40);

  /* vines cling to a surface for a while, then let go and wander off */
  HUG = new Float32Array(n);
  const hs = new Float32Array(n);
  for (let i = 0; i < n; i++) { const l = R.L[i]; if (l < S.skB + 40 || l > S.rwA - 60) continue; const surf = Math.min(cor.A[i], cor.B[i]) < CAP - 3; hs[i] = surf ? sstep(.0, .3, vn(l, 210, 8)) : 0; }
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - 10); j <= Math.min(n - 1, i + 10); j++) { s += hs[j]; c++; } HUG[i] = s / c; }
  const lw = O.w * .9 + 1;
  MAIN = wander(R, cor, i => {
    const l = R.L[i];
    if (l < S.l1A) return lavaN(l) * .7;
    if (l < S.skA) return waterN(l) * .92;
    const free = vineN(l) * .85, sd = cor.A[i] < cor.B[i] ? 1 : -1, hug = sd * (Math.min(cor.A[i], cor.B[i]) - 1.5) / Math.max(1, sd > 0 ? cor.A[i] - lw : cor.B[i] - lw);
    return lerp(free, clamp(hug, -1.2, 1.2), HUG[i]);
  }, lw);
  MAIN.cor = cor; MAIN.toMain = l => l;

  /* forks: their own wandering channels, timed so both arms reach the rejoin together */
  SPL = splits.map((sp, k) => {
    const C = sample(sp.pts, PL ? 11 : 22), co = corridor(C, inside, CAP), La = T(sp.a), Lb = T(sp.b);
    const st = wander(C, co, i => { const l = La + C.L[i] / C.tot * (Lb - La); return (l < S.l1A ? lavaN(l, 40 + k) * .7 : waterN(l, 40 + k) * .9); }, lw);
    for (let i = 0; i < C.n; i++) { const e = sstep(0, 30, Math.min(C.L[i], C.tot - C.L[i])); st.PX[i] = lerp(C.X[i], st.PX[i], e); st.PY[i] = lerp(C.Y[i], st.PY[i], e); }   /* exact join at both ends */
    tangents(st.PX, st.PY, st.PTX, st.PTY);
    st.La = La; st.Lb = Lb; st.toMain = l => La + l / C.tot * (Lb - La); st.lava = La < S.l1A;
    return st;
  }).filter(s => s.Lb > s.La);

  /* small side channels: lava fingers, rivulets */
  BR = [];
  const rb = rnd(29), room = i => Math.max(cor.A[i], cor.B[i]);
  for (let l = 1e9; l < S.skA - 80;) {
    const i = R.iL(l);
    if (l > S.l1A - 80 && l < S.l1B + 60 || l > S.l2A - 80 && l < S.l2B + 60) { l += 40; continue; }
    if (room(i) < 12 || Math.abs(R.TX[i]) > .2) { l += 12; continue; }
    const lava = l < S.l1A, len = 26 + rb() * 46, ib = R.iL(l + len);
    let ok = true; for (let j = i; j <= ib; j++) if (room(j) < 9) { ok = false; break; }
    if (!ok) { l += 15; continue; }
    const s = cor.A[i] > cor.B[i] ? 1 : -1, xs = [], ys = [];
    for (let j = i; j <= ib; j++) {
      const u = (R.L[j] - l) / len, o = lerp(MAIN.OFF[j], s * ((s > 0 ? cor.A[j] : cor.B[j]) - lw) * (.8 + .15 * vn(R.L[j], 13, 11)), sstep(0, .5, u));
      xs.push(R.X[j] - R.TY[j] * o); ys.push(R.Y[j] + R.TX[j] * o);
    }
    BR.push({a: l, b: l + len, X: Float32Array.from(xs), Y: Float32Array.from(ys), lava});
    l += len + 420 + rb() * 520;
  }

  /* stalls: where the flow meets a new obstacle, stops, builds up, then breaks through */
  STALLS = [];
  const rs = rnd(41);
  if (S.l1A < BIG) STALLS.push({l: S.l1A, sea: true, lava: true, dur: 2.6, t0: 0, rel: 0, done: false, x: 0, y: 0});
  Object.keys(R.tag).filter(k => /^st\d/.test(k)).map(k => R.L[R.tag[k]]).sort((a, b) => a - b).forEach(l => {
    if (l >= S.skA - 20 || l < S.h0 + 40) return;
    if (l > S.l1A - 40 && l < S.l1B + 40 || l > S.l2A - 40 && l < S.l2B + 40) return;
    if (rs() < .3) return;
    const p = atP(l), lava = l < S.l1A, r = rs(), roomy = room(p.i) > 14;
    STALLS.push({l, x: p.x, y: p.y, lava, dur: .8 + rs() * 1.8, kind: !lava && roomy && r < .35 ? 'delta' : r < .6 ? 'over' : 'around', dir: rs() < .5 ? -1 : 1, spill: 16 + rs() * (PL ? 10 : 26), t0: 0, rel: 0, done: false,
      tree: !lava && roomy ? deltaTree(p.x, p.y, Math.atan2(p.ty, p.tx), PL ? 5 : 8, 2, rnd(l | 0), []) : null});
  });
  STALLS.sort((a, b) => a.l - b.l);
  /* a delta where the river runs into Lago de Yojoa */
  DELTAS = [];
  if (F.lake2) { const f = F.lake2, ex = f.cx - f.dir * f.hw; DELTAS.push({l: S.l2A - 30, tree: deltaTree(ex - f.dir * (PL ? 10 : 16), f.cy, f.dir > 0 ? 0 : Math.PI, PL ? 7 : 11, 2, rnd(77), []), x: ex, y: f.cy}); }

  /* a few jungle animals on the vines: a spot with room beside a near-vertical stretch */
  ANIMALS = [];
  const need = PL ? 11 : 26;
  const spot = l0 => {
    for (let d = 0; d < 500; d += 6) for (const l of [l0 + d, l0 - d]) {
      if (l < S.skB + 60 || l > S.vEnd - 90) continue;
      const i = R.iL(l); let ra = 1e9, rb = 1e9, vert = true;
      for (let j = Math.max(0, i - 8); j <= Math.min(n - 1, i + 8); j++) { ra = Math.min(ra, cor.A[j] - MAIN.OFF[j]); rb = Math.min(rb, cor.B[j] + MAIN.OFF[j]); if (Math.abs(MAIN.PTY[j]) < .8) vert = false; }
      if (vert && Math.max(ra, rb) >= need) return {l, side: (ra > rb ? 1 : -1) * (MAIN.PTY[i] > 0 ? -1 : 1)};
    }
    return null;
  };
  [['sloth', .18], ['toucan', .5], ['monkey', .8]].forEach(([kind, fr]) => { const s = spot(lerp(S.skB + 100, S.vEnd - 120, fr)); if (s && !ANIMALS.some(a => Math.abs(a.l - s.l) < 150)) ANIMALS.push({kind, ...s}); });

  /* vegetation */
  LEAVES = []; SHOOTS = []; SPRIGS = []; TUFTS = [];
  const rl = rnd(11); let l = S.skB + 18, s = 1;
  while (l < S.vEnd - 24) {
    const g = green(l);
    if (g < .1) { l += 20; continue; }
    const i = R.iL(l), across = Math.abs(MAIN.PTX[i]) > .5;
    if (across && rl() < .35) { l += 12; continue; }
    LEAVES.push({l, s, z: lerp(.65, 1.1, g) * (.75 + rl() * .5) * (across ? .8 : 1), a: .55 + rl() * .45, c: rl(), kind: !across && g > .75 && rl() < .18 ? 'flower' : 'leaf'});
    s = rl() < .8 ? -s : s; l += lerp(54, 12, g) * (.7 + rl() * .6);
  }
  for (let l2 = S.skB + 50; l2 < S.vEnd - 80; l2 += 45 + rl() * 90) {
    const g = green(l2), i = R.iL(l2);
    if (g < .2) continue;
    const sd = cor.A[i] > cor.B[i] ? 1 : -1, free = (sd > 0 ? cor.A[i] : cor.B[i]) - sd * MAIN.OFF[i];
    if (free < (PL ? 5 : 8)) continue;
    if (Math.abs(MAIN.PTX[i]) > .6 && rl() < .5) { TUFTS.push({l: l2, n: 3 + Math.floor(rl() * 4 * g), h: (PL ? 6 : 10) * (.6 + .6 * g), seed: rl() * 9}); continue; }
    SHOOTS.push({l: l2, sd, len: Math.min(free * 1.6, PL ? 18 : 52) * (.6 + .5 * g), dur: 3 + rl() * 3, seed: rl() * 9, flower: g > .8 && rl() < .45, tendril: rl() < .7});
  }
  /* creepers over photo corners */
  const nicTop = F.sink ? F.sink.cy + 40 : 1e9, nicBot = F.rw ? F.rw.y : 0;
  OP.forEach(o => {
    const r = o.R, top = r.top + sy, bot = r.bottom + sy;
    if (top < nicTop || bot > nicBot) return;
    [[r.left, top, 0, 1], [r.right, top, Math.PI, -1], [r.left, bot, 0, -1], [r.right, bot, Math.PI, 1]].forEach(([qx, qy, along, curl], k) => {
      const lq = R.lAtY(qy), g = green(lq);
      if (rl() > .62 * g + .05) return;
      const down = k < 2, ang = rl() < .5 ? along : (down ? Math.PI / 2 : -Math.PI / 2);
      SPRIGS.push({x: qx, y: qy, ang, curl: curl * (k === 1 || k === 2 ? 1 : 1), len: (PL ? 12 : 22) + rl() * (PL ? 8 : 20), l: lq, dur: 2.5 + rl() * 2, seed: rl() * 9, flower: g > .8 && rl() < .5, k});
    });
  });

  plane.ph = 'park'; plane.wait = 0; plane.trail = []; bye(false);
  H = Math.min(H, R.tot);
  hist = [{t: performance.now() - 20000, h: H}];
}
function green(l) {
  if (l < S.skB) return 0;
  if (l < S.pkA) return lerp(.4, 1, sstep(S.skB, S.pkA, l));
  const pkE = S.pkB - (S.pkB - S.pkA) * .3;
  if (l <= pkE) return 1;
  return 1 - sstep(pkE, S.vEnd - 30, l);
}

/* ---------- drawing ---------- */
const cv = $('#fx'), ctx = cv.getContext('2d');
let dpr = 1, H = 0, Tmax = 0, last = performance.now(), parts = [], hist = [{t: 0, h: 0}];
const plane = {ph: 'park', wait: 0, t0: 0, trail: []};
function size() { dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); }
function born(l, now) {
  let lo = 0, hi = hist.length;
  while (lo < hi) { const m = lo + hi >> 1; if (hist[m].h < l) lo = m + 1; else hi = m; }
  return lo < hist.length ? hist[lo].t : now;
}
function path(st, i0, i1, ex) {
  ctx.beginPath();
  for (let i = i0; i <= i1; i++) { const o = ex ? ex(i) : 0, x = st.PX[i] - st.PTY[i] * o, y = st.PY[i] + st.PTX[i] * o; i === i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
}
function blob(cx, cy, rx, ry, sd, rot = 0, rough = 0) {
  ctx.beginPath();
  const c = Math.cos(rot), s = Math.sin(rot), N = rough ? 90 : 40;
  for (let k = 0; k <= N; k++) { const a = k / N * Math.PI * 2, m = 1 + .08 * Math.sin(3 * a + sd) + .05 * Math.sin(5 * a + sd * 2) + rough * (.09 * Math.sin(2 * a + sd * 3) + .05 * Math.sin(7 * a + sd) + .03 * Math.sin(11 * a + sd * 5)), ex = Math.cos(a) * rx * m, ey = Math.sin(a) * ry * m, x = cx + ex * c - ey * s, y = cy + ex * s + ey * c; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath();
}
function spawn(kind, x, y) {
  if (parts.length > 220) return;
  if (kind === 'ember') parts.push({kind, x: x + (Math.random() - .5) * 4, y, vx: (Math.random() - .5) * 18, vy: -14 - Math.random() * 26, age: 0, life: .9 + Math.random() * .9, r: .7 + Math.random() * 1.1, h: 25 + Math.random() * 25});
  else parts.push({kind, x: x + (Math.random() - .5) * 10, y: y - 2, vx: (Math.random() - .5) * 8, vy: -10 - Math.random() * 10, age: 0, life: 2.2 + Math.random() * 1.2, r: 2});
}
const heatCol = h => h < .5 ? mix('#4b2317', '#E8623A', h / .5) : mix('#E8623A', '#FFD38A', (h - .5) / .5);
const eob = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!R || document.hidden) return;
  const t = reduced ? 0 : now / 1000, sy = scrollY, vh = innerHeight, LW = O.w * (PL ? .75 : 1);

  /* where the flow should be, and where it actually gets to */
  let T = R.lAtY(sy + vh * .66);
  if (O.reveal === 'drawn' || reduced) T = R.tot; else if (O.reveal === 'once') { Tmax = Math.max(Tmax, T); T = Tmax; }
  /* the stream is born in the volcano's first big eruption (assets/scene.js, about 3 s in) */
  const sc = window.__scene, away = sy > S.h0 * .4;
  if (!reduced && O.reveal !== 'drawn' && sc && sc.T < 3.1 && !away) T = 0;
  else T = Math.max(T, S.h0 + 30);   /* once born it runs all the way down the cone and past the timeline */
  let Hn = H;
  const surge = STALLS.some(s => s.rel && now - s.rel < 600) ? 3 : 1;
  if (reduced) Hn = T;
  else {
    Hn += (T - H) * (1 - Math.exp(-dt * 2.4 * surge));
    if (Hn > S.skB && Hn < S.rwA && Hn > H) Hn = Math.min(Hn, H + Math.max(200, (T - H) * 1.2) * dt);
    if (Hn < S.h0 && Hn > H) Hn = Math.min(Hn, H + S.h0 / (away ? 1.6 : 4.5) * dt);   /* it takes a few seconds to run down the cone */
    if (Math.abs(T - Hn) < .3) Hn = T;
    if (Hn >= T - 1 && Hn > S.skB + 20 && Hn < S.rwA - 90) Hn = Math.min(Hn + 7 * dt, T + 70);
    for (const s of STALLS) {
      if (s.done && Hn < s.l - 40) { s.done = false; s.t0 = 0; s.rel = 0; }
      if (!s.done && H <= s.l + .5 && Hn > s.l) {
        if (!s.t0) s.t0 = now;
        const dur = s.dur * clamp(1.15 - (T - s.l) / vh * 1.4, s.sea ? .7 : .12, 1);
        if (now - s.t0 >= dur * 1000) { s.done = true; s.rel = now; } else Hn = s.l;
        break;
      }
    }
  }
  H = Hn;
  if (H > hist[hist.length - 1].h + .5) hist.push({t: now, h: H});
  else while (hist.length > 1 && hist[hist.length - 1].h > H + 1) hist.pop();
  if (hist.length > 6000) hist.splice(1, 1000);

  ctx.setTransform(dpr, 0, 0, dpr, 0, -sy * dpr);
  ctx.clearRect(0, sy, innerWidth, vh);
  /* the flow passes under the ridge bar while it sits in the hero (once it sticks, its blurred glass covers the flow anyway) */
  ctx.save();
  /* the stream runs underground beneath the timeline while it sits in the hero (see the lava tube below) */
  if (TUBE) { const xv = atP(R.lAtY(TUBE.y2)).x; ctx.beginPath(); ctx.rect(0, sy - 200, innerWidth, vh + 400); ctx.rect(xv - 30, TUBE.y1 + 2, 60, TUBE.y2 - TUBE.y1 - 3); ctx.clip('evenodd'); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const vis = y => y > sy - 90 && y < sy + vh + 90;
  /* visible, revealed index range of a stream between two main-route lengths */
  const rngOf = (st, a, b, reach) => {
    const C = st.C, hi = Math.min(b, reach); if (hi <= a) return null;
    const i0 = Math.max(C.iL(a), C.iY(sy - 90) - 1, 0), i1 = Math.min(C.iL(hi), C.iY(sy + vh + 90), C.n - 1);
    return i1 > i0 ? [i0, i1] : null;
  };
  const rng = (a, b) => rngOf(MAIN, a, b, H);
  const splitReach = sp => clamp((H - sp.La) / (sp.Lb - sp.La), 0, 1) * sp.C.tot;
  const frontOf = (st, reach) => atP(reach, st);

  /* ---- lava: lumpy, cooling from the surface, glowing where it's fresh ---- */
  const lavaStream = (st, i0, i1, reachMain, w = 1) => {
    if (O.crust) {
      for (let j = i0; j < i1; j += 4) { const e = Math.min(j + 5, i1), l = st.L[j]; ctx.strokeStyle = '#4b2317'; ctx.lineWidth = LW * (1.55 + .55 * vn(st.toMain(l), 22, 9)) * w; path(st, j, e); ctx.stroke(); }
      path(st, i0, i1); ctx.strokeStyle = 'rgba(232,98,58,.28)'; ctx.lineWidth = LW * .5 * w; ctx.stroke();
      ctx.save(); ctx.shadowColor = 'rgba(240,110,50,.85)'; ctx.shadowBlur = 8;
      for (let j = i0; j < i1; j += 4) {
        const e = Math.min(j + 5, i1), lm = st.toMain(st.L[j]), age = reduced ? 99 : (now - born(lm, now)) / 1000;
        const h = Math.max(1 - sstep(.3, 5, age), reachMain < S.l1A + 1 ? 1 - clamp((reachMain - lm) / 140, 0, 1) : 0, lm < S.h0 - 20 ? .8 : lm < S.h0 + 160 ? .8 * (1 - (lm - S.h0 + 20) / 180) : 0);   /* on the volcano it stays a live, glowing flow */
        if (h < .06) continue;
        ctx.strokeStyle = heatCol(h); ctx.lineWidth = LW * (1.1 + .65 * h) * w; path(st, j, e); ctx.stroke();
      }
      ctx.restore();
    } else { ctx.save(); ctx.shadowColor = 'rgba(240,110,50,.8)'; ctx.shadowBlur = 7; path(st, i0, i1); ctx.strokeStyle = '#E8623A'; ctx.lineWidth = LW * 1.3 * w; ctx.stroke(); ctx.restore(); }
    if (O.shimmer && !reduced) { path(st, i0, i1); ctx.setLineDash([4, 58]); ctx.lineDashOffset = st.L[i0] - t * 20; ctx.strokeStyle = 'rgba(255,190,110,.55)'; ctx.lineWidth = LW * .6 * w; ctx.stroke(); ctx.setLineDash([]); }
  };
  const waterStream = (st, i0, i1, w = 1) => {
    path(st, i0, i1); ctx.strokeStyle = 'rgba(118,188,209,.16)'; ctx.lineWidth = LW * 3.4 * w; ctx.stroke();
    ctx.strokeStyle = '#76BCD1'; ctx.lineWidth = LW * .95 * w; ctx.stroke();
    if (O.shimmer && !reduced) { ctx.setLineDash([2.5, 38]); ctx.lineDashOffset = st.L[i0] - t * 44; ctx.strokeStyle = 'rgba(236,250,255,.9)'; ctx.lineWidth = LW * .75 * w; ctx.stroke(); ctx.setLineDash([]); }
  };
  const lavaHead = (p, k = 1) => {
    const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9 * k);
    gl.addColorStop(0, 'rgba(255,236,190,1)'); gl.addColorStop(.35, 'rgba(240,120,60,.55)'); gl.addColorStop(1, 'rgba(232,98,58,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, 9 * k, 0, 7); ctx.fill();
  };
  const waterHead = p => { ctx.fillStyle = 'rgba(150,215,235,.3)'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#EAF9FD'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 7); ctx.fill(); };

  // forks first, so the main stream sits on top where they join
  for (const sp of SPL) {
    if (H <= sp.La) continue;
    const reach = splitReach(sp), r2 = rngOf(sp, 0, sp.C.tot, reach); if (!r2) continue;
    if (sp.lava) lavaStream(sp, r2[0], r2[1], H, .85); else waterStream(sp, r2[0], r2[1], .85);
    if (reach < sp.C.tot - 2) { const p = frontOf(sp, reach); if (vis(p.y)) sp.lava ? lavaHead(p, .75) : waterHead(p); }
  }
  for (const b of BR) {
    if (H < b.a || !vis(b.Y[0]) && !vis(b.Y[b.Y.length - 1])) continue;
    const age = (now - born(b.a, now)) / 1000, reach = Math.min(b.b, b.a + (reduced ? 1e9 : age * (b.lava ? 34 : 60)), H + 30), k1 = Math.min(b.X.length - 1, Math.floor((reach - b.a) / 3));
    if (k1 < 1) continue;
    ctx.beginPath(); for (let k = 0; k <= k1; k++) k ? ctx.lineTo(b.X[k], b.Y[k]) : ctx.moveTo(b.X[k], b.Y[k]);
    if (b.lava) {
      const hot = O.crust ? 1 - sstep(1, 6, age) : 1;
      ctx.strokeStyle = O.crust ? '#5a2a1c' : '#c85530'; ctx.lineWidth = LW * 1.2; ctx.stroke();
      ctx.save(); if (hot > .3) { ctx.shadowColor = 'rgba(240,110,50,.8)'; ctx.shadowBlur = 6 * hot; }
      ctx.strokeStyle = heatCol(.35 + .55 * hot); ctx.lineWidth = LW * (.4 + .4 * hot); ctx.stroke(); ctx.restore();
      if (k1 === b.X.length - 1) { ctx.fillStyle = O.crust ? mix('#4b2317', '#E8623A', hot) : '#E8623A'; blob(b.X[k1], b.Y[k1], LW * 1.2, LW, b.a); ctx.fill(); }
    } else {
      for (let k = 0; k < k1; k += 3) { const e = Math.min(k + 4, k1), u = k / (b.X.length - 1); ctx.beginPath(); ctx.moveTo(b.X[k], b.Y[k]); for (let q = k + 1; q <= e; q++) ctx.lineTo(b.X[q], b.Y[q]); ctx.strokeStyle = `rgba(118,188,209,${.85 * (1 - u)})`; ctx.lineWidth = LW * (.75 - .45 * u); ctx.stroke(); }
    }
  }

  /* ---- Guatemala: the main lava flow ---- */
  let r = rng(0, S.l1A);
  const front = Math.min(H, S.l1A), fp = atP(front);
  if (r) {
    lavaStream(MAIN, r[0], r[1], H);
    if (O.embers && !reduced) {
      if (vis(fp.y) && Math.random() < (H < S.l1A ? 6 : 1.2) * dt) spawn('ember', fp.x, fp.y);
      if (Math.random() < 1 * dt) { const j = r[0] + Math.floor(Math.random() * (r[1] - r[0])); spawn('ember', MAIN.PX[j], MAIN.PY[j]); }
    }
  }

  /* ---- Honduras: the Caribbean, side on, with a wave rolling in and a surfer riding it ---- */
  const sea = f => {
    if (!f || !vis(f.cy)) return;
    const hw = f.hw, D = PL ? 30 : 46, Hm = PL ? 16 : 27, W = PL ? 26 : 40, wd = -f.dir, x0 = f.cx - hw - 4, w = hw * 2 + 8, top = f.cy - Hm - 14, h = Hm + 14 + D;
    const P = 9, ph = reduced ? .45 : (t / P) % 1, xw = f.cx + wd * lerp(-hw * 1.05, hw * .8, ph), Hw = Hm * Math.pow(Math.sin(Math.PI * clamp(ph * 1.1, 0, 1)), .7);
    const surf = x => { const u = (x - xw) * wd / W, b = u < 0 ? Math.exp(-((u / 1.7) ** 2)) : Math.exp(-((u / .6) ** 2)); return f.cy + 1.4 * Math.sin(x * .055 + t * 1.6) + .9 * Math.sin(x * .12 - t * 2.4) - Hw * b; };
    if (!SEAC) SEAC = document.createElement('canvas');
    const oc = SEAC, k = dpr; if (oc.width !== Math.ceil(w * k) || oc.height !== Math.ceil(h * k)) { oc.width = Math.ceil(w * k); oc.height = Math.ceil(h * k); }
    const c2 = oc.getContext('2d'); c2.setTransform(k, 0, 0, k, -x0 * k, -top * k); c2.globalCompositeOperation = 'source-over'; c2.clearRect(x0, top, w, h);
    c2.beginPath(); for (let x = x0; x <= x0 + w; x += 2) { const y = surf(x); x === x0 ? c2.moveTo(x, y) : c2.lineTo(x, y); } c2.lineTo(x0 + w, f.cy + D); c2.lineTo(x0, f.cy + D); c2.closePath();
    const g = c2.createLinearGradient(0, f.cy - Hm, 0, f.cy + D); g.addColorStop(0, 'rgba(70,184,196,.62)'); g.addColorStop(.35, 'rgba(36,122,150,.42)'); g.addColorStop(1, 'rgba(20,60,90,0)'); c2.fillStyle = g; c2.fill();
    /* light lines of swell under the surface */
    c2.lineWidth = 1;
    for (let j = 0; j < 3; j++) { const yy = f.cy + 8 + j * (PL ? 6 : 9); c2.beginPath(); for (let x = x0; x <= x0 + w; x += 4) { const y = yy + 1.2 * Math.sin(x * .04 + t * (1 + j * .3) + j); x === x0 ? c2.moveTo(x, y) : c2.lineTo(x, y); } c2.strokeStyle = `rgba(190,236,240,${.16 - j * .04})`; c2.stroke(); }
    /* the surface, and white water where the wave has already broken */
    c2.beginPath(); for (let x = x0; x <= x0 + w; x += 2) { const y = surf(x); x === x0 ? c2.moveTo(x, y) : c2.lineTo(x, y); } c2.strokeStyle = 'rgba(200,242,242,.85)'; c2.lineWidth = 1.3; c2.stroke();
    if (Hw > 4) {
      const cy0 = surf(xw), lip = Hw / Hm;
      c2.beginPath(); c2.moveTo(xw - wd * 2, cy0 + .5); c2.quadraticCurveTo(xw + wd * W * .5, cy0 - 3 * lip, xw + wd * W * .55, cy0 + Hw * .42);
      c2.strokeStyle = `rgba(245,252,252,${.9 * lip})`; c2.lineWidth = 1.6; c2.stroke();
      for (let j = 0; j < 14; j++) { const u = hsh(j * 3.1) , x = xw - wd * (4 + u * W * 2.2), y = surf(x) + (hsh(j * 5.3) - .3) * 4 + Math.sin(t * 3 + j) * .8; c2.fillStyle = `rgba(240,250,250,${.55 * lip * (1 - u * .7)})`; c2.beginPath(); c2.arc(x, y, .6 + hsh(j * 7.7) * 1.1, 0, 7); c2.fill(); }
    }
    /* soft ends so it reads as open sea, not a pond */
    c2.globalCompositeOperation = 'destination-in';
    const fe = c2.createLinearGradient(x0, 0, x0 + w, 0), e = 60 / w; fe.addColorStop(0, 'rgba(0,0,0,.12)'); fe.addColorStop(e, '#000'); fe.addColorStop(1 - e, '#000'); fe.addColorStop(1, 'rgba(0,0,0,.12)');
    c2.fillStyle = fe; c2.fillRect(x0, top, w, h);
    ctx.drawImage(oc, x0, top, w, h);
    /* the surfer, crouched on the face just ahead of the curl */
    if (O.lakes && Hw > Hm * .45) {
      const s = PL ? 1 : 1.4, xs = xw + wd * W * .32, ys = surf(xs), sl = Math.atan2(surf(xs + 1) - surf(xs - 1), 2), a = Math.min(1, (Hw / Hm - .45) * 4);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(xs, ys - .5); ctx.rotate(sl);
      ctx.strokeStyle = '#F0A13A'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6 * s, 0); ctx.lineTo(6 * s, 0); ctx.stroke();
      ctx.rotate(-sl); const bob = reduced ? 0 : Math.sin(t * 4) * .5;
      ctx.strokeStyle = '#EDE6DA'; ctx.lineWidth = 1.3 * s;
      ctx.beginPath(); ctx.moveTo(-3 * s, -1); ctx.lineTo(-1.2 * s, -4.5 * s + bob); ctx.lineTo(2.5 * s, -1);   /* legs */
      ctx.moveTo(-1.2 * s, -4.5 * s + bob); ctx.lineTo(.3 * s * wd, -9 * s + bob);   /* torso */
      ctx.moveTo(-4.5 * s * wd, -7.5 * s + bob); ctx.lineTo(.3 * s * wd, -7.6 * s + bob); ctx.lineTo(4.5 * s * wd, -6 * s + bob); ctx.stroke();   /* arms out */
      ctx.fillStyle = '#EDE6DA'; ctx.beginPath(); ctx.arc(.9 * s * wd, -11 * s + bob, 1.6 * s, 0, 7); ctx.fill();
      ctx.restore();
      if (!reduced) for (let j = 0; j < 5; j++) { const q = (t * 2.2 + j / 5) % 1, x = xs - wd * (6 + q * 10) * s, y = ys - 1 - Math.sin(q * Math.PI) * 4; ctx.fillStyle = `rgba(240,250,250,${.6 * (1 - q) * a})`; ctx.beginPath(); ctx.arc(x, y, .9, 0, 7); ctx.fill(); }
    }
  };

  /* ---- Belize: the lagoon is already there; Honduras: Lago de Yojoa ---- */
  const water = (f, sd, sea) => {
    if (!f || !vis(f.cy)) return;
    const rx = f.hw, ry = f.ry, appear = reduced ? 1 : 1;
    ctx.save(); ctx.globalAlpha = appear;
    blob(f.cx, f.cy, rx, ry, sd, 0, 1);
    const g = ctx.createRadialGradient(f.cx, f.cy - ry * .3, 0, f.cx, f.cy, rx);
    g.addColorStop(0, sea ? 'rgba(34,128,150,.5)' : 'rgba(60,120,150,.45)'); g.addColorStop(.7, sea ? 'rgba(52,170,184,.36)' : 'rgba(84,160,186,.32)'); g.addColorStop(1, sea ? 'rgba(140,222,214,.42)' : 'rgba(150,212,230,.38)');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = sea ? 'rgba(170,236,226,.6)' : 'rgba(150,212,230,.6)'; ctx.lineWidth = 1.1; ctx.stroke();
    blob(f.cx, f.cy, rx * .9, ry * .76, sd, 0, 1); ctx.strokeStyle = 'rgba(200,240,240,.12)'; ctx.lineWidth = 3; ctx.stroke();
    // little waves drifting across
    ctx.lineWidth = 1;
    for (let k = 0; k < (sea ? 9 : 5); k++) {
      const u = (hsh(k + sd) + t * (.012 + .01 * hsh(k * 3 + sd))) % 1, vy = (hsh(k * 7 + sd) - .5) * 1.2, wx = f.cx + (u - .5) * rx * 1.5, wy = f.cy + vy * ry * .8;
      if (((wx - f.cx) / rx) ** 2 + ((wy - f.cy) / ry) ** 2 > .7) continue;
      const a = Math.sin(Math.PI * u) * (.35 + .25 * Math.sin(t * 1.3 + k));
      ctx.strokeStyle = `rgba(225,248,250,${a})`; ctx.beginPath(); ctx.moveTo(wx - 7, wy); ctx.quadraticCurveTo(wx - 3, wy - 2.2, wx, wy); ctx.quadraticCurveTo(wx + 3, wy + 2.2, wx + 7, wy); ctx.stroke();
    }
    if (sea) {   // a tiny caye with a palm
      const ix = f.cx + f.dir * rx * .32, iy = f.cy - ry * .28;
      blob(ix, iy, PL ? 9 : 12, PL ? 3.6 : 4.5, 2.2); ctx.fillStyle = 'rgba(215,196,146,.85)'; ctx.fill();
      ctx.strokeStyle = '#6b5a3c'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(ix + 2, iy - 1); ctx.quadraticCurveTo(ix + 3, iy - 7, ix + 1, iy - 12); ctx.stroke();
      ctx.strokeStyle = '#5FA865'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .75 + (reduced ? 0 : Math.sin(t * 1.2 + k) * .08); ctx.beginPath(); ctx.moveTo(ix + 1, iy - 12); ctx.quadraticCurveTo(ix + 1 + Math.cos(a) * 4, iy - 12 + Math.sin(a) * 4 - 2, ix + 1 + Math.cos(a) * 7, iy - 12 + Math.sin(a) * 7 + 2); ctx.stroke(); }
    } else {
      ctx.strokeStyle = 'rgba(150,178,112,.75)'; ctx.lineWidth = 1;
      for (const e of [-1, 1]) for (let j = 0; j < 4; j++) {
        const x = f.cx + e * rx * (.7 + j * .06), y = f.cy - ry * .5, hgt = 6 + ((j * 7 + 3) % 6), sw = reduced ? 0 : Math.sin(t * 1.3 + j + e) * 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * .5, y - hgt * .6, x + sw + e * 1.5, y - hgt); ctx.stroke();
      }
    }
    if (sea && O.lakes) {   // a dive boat with its flag, and a diver below it leaving a trail of bubbles
      const bx = f.cx - f.dir * rx * .12, by = f.cy + ry * .42 + (reduced ? 0 : Math.sin(t * 1.4) * .6), s = PL ? .8 : 1;
      ctx.fillStyle = '#EDE6DA'; ctx.beginPath(); ctx.moveTo(bx - 8 * s, by - 2 * s); ctx.lineTo(bx + 8 * s, by - 2 * s); ctx.quadraticCurveTo(bx + 7 * s, by + 2.5 * s, bx + 4 * s, by + 2.5 * s); ctx.lineTo(bx - 6 * s, by + 2.5 * s); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#cfc6b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx - 5 * s, by - 2 * s); ctx.lineTo(bx - 5 * s, by - 11 * s); ctx.stroke();
      const fx = bx - 5 * s, fy = by - 11 * s, fl = reduced ? 0 : Math.sin(t * 3) * .6;
      ctx.fillStyle = '#D9443A'; ctx.fillRect(fx, fy, 6 * s, 4.4 * s + fl * .3);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 6 * s, fy + 4.4 * s); ctx.stroke();
      /* the diver loops slowly under the boat */
      const a = reduced ? 1 : t * .22, dx = bx + Math.cos(a) * rx * .3, dy = f.cy + ry * .05 + Math.sin(a) * ry * .32, hd = Math.atan2(Math.cos(a) * ry * .32, -Math.sin(a) * rx * .3), kick = reduced ? 0 : Math.sin(t * 7);
      ctx.save(); ctx.translate(dx, dy); ctx.rotate(hd); ctx.globalAlpha = .75;
      ctx.fillStyle = '#16303d'; ctx.beginPath(); ctx.ellipse(0, 0, 5.5 * s, 2 * s, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(6.6 * s, 0, 1.7 * s, 0, 7); ctx.fill();
      ctx.fillStyle = '#E8C04A'; ctx.fillRect(-2.5 * s, -1 * s, 4.5 * s, 2 * s);
      ctx.strokeStyle = '#16303d'; ctx.lineWidth = 1; ctx.beginPath();
      for (const e of [-1, 1]) { ctx.moveTo(-5 * s, e * 1 * s); ctx.lineTo(-9 * s, e * (1.8 + .9 * kick * e) * s); ctx.lineTo(-11 * s, e * (1 + 1.2 * kick * e) * s); }
      ctx.stroke(); ctx.restore();
      if (!reduced) { if (t - BUBT > .45) { BUBT = t; BUB.push({x: dx, y: dy, t0: t}); } BUB = BUB.filter(b => t - b.t0 < 1.8); }
      for (const b of BUB) { const q = (t - b.t0) / 1.8, r = .6 + q * 1.8; ctx.beginPath(); ctx.arc(b.x + Math.sin(q * 9 + b.t0) * 1.2, b.y - q * 3, r, 0, 7); ctx.strokeStyle = `rgba(225,248,250,${.7 * (1 - q)})`; ctx.lineWidth = .8; ctx.stroke(); }
    }
    if (O.lakes && !reduced) for (let k = 0; k < 3; k++) {
      const ph = (t * .3 + k / 3) % 1, nn = Math.floor(t * .3 + k / 3), ox = rx * .45 * Math.sin(sd + k * 2.4 + nn * 1.7);
      ctx.beginPath(); ctx.ellipse(f.cx + ox, f.cy + ry * .15, rx * .22 * ph + 1, ry * .3 * ph + .5, 0, 0, 7);
      ctx.strokeStyle = `rgba(200,236,245,${.45 * (1 - ph)})`; ctx.lineWidth = .9; ctx.stroke();
    }
    ctx.restore();
  };
  water(F.lake1, 1.3, true);
  sea(F.lake2);
  // lava reaches the shore: it hisses, steams, and cools into a small black lava delta
  const f1 = F.lake1;
  if (f1 && H >= S.l1A - .5 && vis(f1.cy)) {
    const ta = reduced ? 99 : (now - born(S.l1A, now)) / 1000, ex = f1.cx - f1.dir * f1.hw, len = f1.hw * .17 * sstep(0, 3.2, ta), hot = O.crust ? 1 - sstep(1.5, 7, ta) : 1;
    ctx.save(); if (hot > .2) { ctx.shadowColor = 'rgba(240,110,50,.9)'; ctx.shadowBlur = 10 * hot; }
    ctx.fillStyle = heatCol(.15 + .85 * hot);
    blob(ex + f1.dir * len * .45, f1.cy + 1, len * .6 + 2.5, f1.ry * .2 + 1, 3.3); ctx.fill();
    for (let k = 0; k < 3; k++) { const a = (k - 1) * .7, d = len * (.8 + .1 * k); blob(ex + f1.dir * Math.cos(a) * d, f1.cy + Math.sin(a) * d * .5, 2.6 * sstep(.5, 3, ta), 2 * sstep(.5, 3, ta), k); ctx.fill(); }
    ctx.restore();
    if (O.embers && !reduced) { const rate = ta < 4 ? 16 : 1.2; if (Math.random() < rate * dt) spawn('steam', ex + f1.dir * len * (.6 + Math.random() * .5), f1.cy - 2); }
    if (!reduced && ta < 5) for (let k = 0; k < 2; k++) { const ph = (t * 1.8 + k * .5) % 1; ctx.beginPath(); ctx.ellipse(ex + f1.dir * (len + 3), f1.cy, 3 + 9 * ph, 2 + 4 * ph, 0, 0, 7); ctx.strokeStyle = `rgba(235,245,245,${.5 * (1 - ph) * (1 - ta / 5)})`; ctx.lineWidth = .8; ctx.stroke(); }
  }

  /* ---- the river ---- */
  for (const [a, b] of [[S.l1B, S.l2A], [S.l2B, S.skA]]) { r = rng(a, b); if (r) waterStream(MAIN, r[0], r[1]); }
  /* deltas: the stream fans out into little channels with a sandy fan between them */
  const drawDelta = (tree, g, x, y, fan) => {
    if (fan) { blob(x, y, fan * g, fan * .55 * g, 5); ctx.fillStyle = `rgba(214,192,140,${.13 * g})`; ctx.fill(); }
    for (const sgm of tree) {
      const k = clamp(g * 3 - sgm.lvl, 0, 1); if (k <= 0) continue;
      const u = k, mx = lerp(sgm.x, sgm.cx, u), my = lerp(sgm.y, sgm.cy, u), ex = lerp(mx, lerp(sgm.cx, sgm.ex, u), u), ey = lerp(my, lerp(sgm.cy, sgm.ey, u), u);
      ctx.beginPath(); ctx.moveTo(sgm.x, sgm.y); ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.strokeStyle = `rgba(130,198,218,${.9 - sgm.lvl * .2})`; ctx.lineWidth = LW * (.8 - sgm.lvl * .2); ctx.stroke();
    }
  };
  for (const d of DELTAS) { if (H < d.l || !vis(d.y)) continue; const g = reduced ? 1 : clamp((now - born(d.l, now)) / 2600, 0, 1); drawDelta(d.tree, g, d.tree[0].ex, d.y, PL ? 12 : 20); }

  /* ---- the water drains into a sinkhole; a vine sprouts out of it ---- */
  const sk = F.sink;
  if (sk && H > S.skA && vis(sk.cy)) {
    ctx.beginPath(); ctx.ellipse(sk.cx, sk.cy, 9, 4.2, 0, 0, 7); ctx.fillStyle = '#060505'; ctx.fill();
    ctx.strokeStyle = 'rgba(118,188,209,.75)'; ctx.lineWidth = 1; ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const rr2 = 11.5 + k * 4.2, a0 = -t * (2.2 - k * .5) + k * 2.1;
      ctx.beginPath(); ctx.ellipse(sk.cx, sk.cy, rr2, rr2 * .42, 0, a0, a0 + 1.9);
      ctx.strokeStyle = `rgba(118,188,209,${.6 - k * .17})`; ctx.lineWidth = 1; ctx.stroke();
    }
    if (H > S.skB - 6) {
      const ex = sk.cx + sk.dir * sk.hw;
      ctx.beginPath(); ctx.moveTo(sk.cx + sk.dir * 3, sk.cy); ctx.quadraticCurveTo(sk.cx + sk.dir * 9, sk.cy - 5, ex, sk.cy);
      ctx.strokeStyle = '#7FA66A'; ctx.lineWidth = LW * 1.1; ctx.stroke();
    }
  }

  /* ---- Nicaragua: vines that grow like a timelapse ---- */
  const leaf = (x, y, ang, len, c, wscale) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * .45, -len * .36 * wscale, len, 0); ctx.quadraticCurveTo(len * .45, len * .36 * wscale, 0, 0);
    ctx.fillStyle = mix('#46904F', '#9CDA86', c, .95); ctx.fill();
    if (len > 7) { ctx.beginPath(); ctx.moveTo(len * .1, 0); ctx.lineTo(len * .8, 0); ctx.strokeStyle = 'rgba(30,60,30,.35)'; ctx.lineWidth = .6; ctx.stroke(); }
    ctx.restore();
  };
  const flower = (x, y, k, c) => {
    ctx.fillStyle = c < .5 ? '#F08A7E' : '#E7A6E2';
    for (let q = 0; q < 5; q++) { const a = q / 5 * Math.PI * 2 + (reduced ? 0 : t * .25); ctx.beginPath(); ctx.arc(x + Math.cos(a) * k * 1.45, y + Math.sin(a) * k * 1.45, k, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#FFD27A'; ctx.beginPath(); ctx.arc(x, y, k * .75, 0, 7); ctx.fill();
  };
  r = rng(S.skB, S.rwA);
  if (r) {
    const [i0, i1] = r, ph = PL ? .6 : 1, M = MAIN;
    const tipOff = i => { const d = H - R.L[i]; if (d > 70 || reduced) return 0; const k = Math.pow(1 - d / 70, 2); return k * (PL ? 2.5 : 5) * Math.sin(t * 1.9 - d * .05); };
    const free = i => (1 - HUG[i]);
    const vin = i => { const l = R.L[i]; return ph * free(i) * (.9 + 1.2 * green(l)) * Math.sin(l / 29) + tipOff(i); };
    const ten = i => { const l = R.L[i]; return -ph * (.4 + .6 * free(i)) * (.9 + 1.2 * green(l)) * 1.3 * Math.sin(l / 29 + .9) + tipOff(i) * .7; };
    for (let j = i0; j < i1; j += 6) {
      const e = Math.min(j + 7, i1), l = R.L[Math.min(j + 3, e)], g = green(l), age = reduced ? 99 : (now - born(l, now)) / 1000;
      const mature = sstep(0, 7, age), endCol = l < S.pkA || g > .5 ? mix('#78A866', '#5EC26A', g) : mix('#76716a', '#5EC26A', g);
      ctx.strokeStyle = mature > .98 ? endCol : mix('#D2F2A0', '#5EC26A', mature);
      ctx.lineWidth = LW * (1 + .55 * g) * (.45 + .55 * mature); path(M, j, e, vin); ctx.stroke();
      if (g > .2 && age > 1.2) { ctx.strokeStyle = `rgba(160,214,140,${.75 * sstep(.2, .55, g) * sstep(1.2, 4, age)})`; ctx.lineWidth = LW * .5; path(M, j, e, ten); ctx.stroke(); }
    }
    // clinging: little rootlets grip the surface where the vine hugs a photo
    ctx.strokeStyle = 'rgba(150,200,120,.7)'; ctx.lineWidth = .7;
    for (let j = i0; j < i1; j += 3) {
      if (HUG[j] < .65 || (now - born(R.L[j], now)) < 1500 && !reduced) continue;
      if ((j * 7) % 3) continue;
      const sd = M.cor.A[j] < M.cor.B[j] ? 1 : -1, nx = -M.PTY[j] * sd, ny = M.PTX[j] * sd, x = M.PX[j], y = M.PY[j];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + nx * 3 + M.PTX[j] * 1.5, y + ny * 3 + M.PTY[j] * 1.5); ctx.stroke();
    }
    const lo = R.L[i0], hi = R.L[i1];
    if (O.leaves) {
      LEAVES.forEach((f, n) => {
        if (f.l < lo || f.l > hi || f.l > H) return;
        if (f.kind === 'flower' && !O.flowers) return;
        const p = atP(f.l), i = p.i, o = vin(i), x = p.x - p.ty * o, y = p.y + p.tx * o;
        const age = reduced ? 99 : (now - born(f.l, now)) / 1000 - .25, k = clamp(age / 1.4, 0, 1);
        if (k <= 0) return;
        const open = eob(k), fold = sstep(0, 1, age / 1.1), sdn = f.s;
        const room = (sdn > 0 ? M.cor.A[i] : M.cor.B[i]) - sdn * M.OFF[i] + (PL ? 3 : 5), sa = f.a * (.35 + .65 * fold);
        const len = Math.min(Math.min(PL ? 10 : 17, 13 * f.z), Math.max(3, room) / Math.max(.3, Math.sin(sa))) * open;
        const sway = reduced ? 0 : .16 * Math.sin(t * .9 - f.l * .02) + .04 * Math.sin(t * 2.3 + n);
        leaf(x, y, Math.atan2(p.ty, p.tx) + sdn * (sa + sway), len, f.c, .25 + .75 * fold);
        if (f.kind === 'flower' && age > 1.6) { const k2 = sstep(1.6, 3, age) * 1.7, la = Math.atan2(p.ty, p.tx) + sdn * sa; flower(x + Math.cos(la) * len * .95, y + Math.sin(la) * len * .95, k2, f.c); }
      });
      // grass and fern tufts where the vine crosses open ground
      for (const tf of TUFTS) {
        if (tf.l < lo || tf.l > hi || tf.l > H) continue;
        const age = reduced ? 99 : (now - born(tf.l, now)) / 1000 - .4, g = clamp(age / 1.6, 0, 1); if (g <= 0) continue;
        const p = atP(tf.l);
        ctx.strokeStyle = 'rgba(120,190,110,.9)'; ctx.lineWidth = .9;
        for (let k = 0; k < tf.n; k++) {
          const a = -Math.PI / 2 + (k - (tf.n - 1) / 2) * .32 + (reduced ? 0 : Math.sin(t * 1.4 + k + tf.seed) * .1), h = tf.h * (.7 + .3 * hsh(k + tf.seed)) * eob(g);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + Math.cos(a) * h * .5, p.y + Math.sin(a) * h * .6, p.x + Math.cos(a + .25) * h, p.y + Math.sin(a + .25) * h); ctx.stroke();
        }
      }
      // side shoots: grow out searching, leaves pop open along them, then a tendril coils
      for (const s of SHOOTS) {
        if (s.l < lo - 60 || s.l > hi || s.l > H) continue;
        const age = reduced ? 99 : (now - born(s.l, now)) / 1000 - .6, g = clamp(age / s.dur, 0, 1);
        if (g <= 0) continue;
        const p = atP(s.l), o = vin(p.i), bx = p.x - p.ty * o, by = p.y + p.tx * o, ta = Math.atan2(p.ty, p.tx);
        const gl = s.len * (1 - Math.pow(1 - g, 2)), N = 12, pts = [[bx, by]];
        let a = ta, x = bx, y = by;
        for (let k = 1; k <= N; k++) {
          const u = k / N, search = reduced ? 0 : (1 - g * .7) * .55 * u * u * Math.sin(t * 1.7 + s.seed);
          a = lerp(ta + s.sd * 1.05, ta + s.sd * .2, u) + search;
          x += Math.cos(a) * gl / N; y += Math.sin(a) * gl / N; pts.push([x, y]);
        }
        ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
        ctx.strokeStyle = mix('#D2F2A0', '#5EC26A', sstep(0, s.dur + 3, age)); ctx.lineWidth = LW * (.4 + .35 * g); ctx.stroke();
        [.3, .55, .8].forEach((f, q) => {
          const la = age - f * s.dur; if (la <= 0) return;
          const kq = Math.round(f * N), lk = eob(clamp(la / 1.3, 0, 1)), [qx, qy] = pts[kq], [rx2, ry2] = pts[Math.min(N, kq + 1)];
          const da = Math.atan2(ry2 - qy, rx2 - qx), sd = q % 2 ? -s.sd : s.sd;
          leaf(qx, qy, da + sd * (.7 + (reduced ? 0 : .12 * Math.sin(t * .9 + s.seed + q))), (PL ? 6 : 10) * lk, (s.seed * .1 + q * .3) % 1, .4 + .6 * clamp(la, 0, 1));
        });
        const [ex, ey] = pts[N];
        if (s.tendril && g >= 1 && !s.flower) {
          const ca = clamp((age - s.dur) / 2.6, 0, 1), turns = 2.6 * ca;
          ctx.beginPath(); ctx.moveTo(ex, ey);
          for (let q = 1; q <= 30; q++) { const u = q / 30, th = u * turns * Math.PI * 2, rad = (PL ? 2 : 3.2) * (1 - u * .5); ctx.lineTo(ex + Math.cos(a) * u * 6 + Math.cos(th + a) * rad * ca - Math.cos(a) * rad * ca, ey + Math.sin(a) * u * 6 + Math.sin(th + a) * rad * ca * s.sd - Math.sin(a) * rad * ca); }
          ctx.strokeStyle = 'rgba(170,220,150,.9)'; ctx.lineWidth = .9; ctx.stroke();
        } else if (s.flower && O.flowers && age > s.dur) flower(ex, ey, 1.8 * sstep(s.dur, s.dur + 1.5, age), s.seed % 1);
      }
    }
  }
  // creepers working their way over photo corners
  if (O.leaves) for (const c of SPRIGS) {
    if (H < c.l || !vis(c.y)) continue;
    const age = reduced ? 99 : (now - born(c.l, now)) / 1000 - .8, g = clamp(age / c.dur, 0, 1); if (g <= 0) continue;
    const N = 14, gl = c.len * (1 - Math.pow(1 - g, 2)), pts = [[c.x, c.y]];
    let a = c.ang, x = c.x, y = c.y;
    for (let k = 1; k <= N; k++) { const u = k / N; a = c.ang + c.curl * (u * u * 1.6 * g + (reduced ? 0 : (1 - g) * .4 * u * Math.sin(t * 1.6 + c.seed))); x += Math.cos(a) * gl / N; y += Math.sin(a) * gl / N; pts.push([x, y]); }
    ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
    ctx.strokeStyle = mix('#D2F2A0', '#5EC26A', sstep(0, c.dur + 2, age)); ctx.lineWidth = LW * .6; ctx.stroke();
    for (let q = 1; q <= 4; q++) {
      const f = q / 5, la = age - f * c.dur; if (la <= 0) continue;
      const kq = Math.round(f * N), [qx, qy] = pts[kq], [rx2, ry2] = pts[Math.min(N, kq + 1)], da = Math.atan2(ry2 - qy, rx2 - qx);
      leaf(qx, qy, da + (q % 2 ? 1 : -1) * (.8 + (reduced ? 0 : .1 * Math.sin(t + q + c.seed))), (PL ? 6 : 10) * eob(clamp(la / 1.2, 0, 1)), (c.seed + q * .23) % 1, .5 + .5 * clamp(la, 0, 1));
    }
    if (c.flower && O.flowers && g >= 1) flower(pts[N][0], pts[N][1], 1.7 * sstep(c.dur, c.dur + 1.5, age), c.seed % 1);
  }
  if (O.flowers && H > S.pkA + 160) {   // a butterfly drifts along the densest green
    const lb = lerp(S.pkA + 60, Math.min(H, S.pkB), .5 + .45 * Math.sin(t * .05)), p = atP(lb);
    if (vis(p.y)) {
      const off = (PL ? 8 : 16) + 6 * Math.sin(t * 1.1), x = p.x - p.ty * off, y = p.y + p.tx * off + 4 * Math.sin(t * 1.7);
      const fl = reduced ? .8 : .25 + .75 * Math.abs(Math.sin(t * 9));
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * .8) * .4); ctx.fillStyle = '#F0A13A';
      for (const e of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(e * 3.6 * fl, -1.6, 3.8 * fl, 2.9, e * .3, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e * 2.6 * fl, 2, 2.7 * fl, 2.1, -e * .3, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#231a12'; ctx.fillRect(-.6, -3.5, 1.2, 7.5); ctx.restore();
    }
  }

  /* ---- the animals that live on the vines ---- */
  if (O.animals) for (const a of ANIMALS) {
    if (H < a.l + 30) continue;
    const drift = a.kind === 'sloth' && !reduced ? Math.sin(t * .11) * 9 : 0, p = atP(a.l + drift);
    if (!vis(p.y)) continue;
    const g = reduced ? 1 : eob(clamp((now - born(a.l + 30, now)) / 700, 0, 1)), s = (PL ? 1.05 : 1.6) * g;
    if (s <= .02) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(a.side * s, s); ctx.lineCap = 'round';
    const blink = !reduced && (t + a.l) % 4.3 < .13;
    const eye = (x, y) => { if (blink) { ctx.strokeStyle = '#120d0a'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x - .7, y); ctx.lineTo(x + .7, y); ctx.stroke(); } else { ctx.fillStyle = '#120d0a'; ctx.beginPath(); ctx.arc(x, y, .75, 0, 7); ctx.fill(); } };
    if (a.kind === 'sloth') {
      ctx.strokeStyle = '#6d5944'; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(3, -2.5); ctx.quadraticCurveTo(.5, -5, -.8, -7.5); ctx.moveTo(3, 4); ctx.quadraticCurveTo(.5, 6, -.8, 8.5); ctx.stroke();
      ctx.fillStyle = '#8B735A'; ctx.beginPath(); ctx.ellipse(3.6, 1.5, 3.6, 6.6, -.12, 0, 7); ctx.fill();
      ctx.fillStyle = '#9c8467'; ctx.beginPath(); ctx.arc(4.4, -6.2, 3.7, 0, 7); ctx.fill();
      ctx.fillStyle = '#e6d3b2'; ctx.beginPath(); ctx.ellipse(5.1, -5.8, 2.8, 2.3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4a3726'; ctx.beginPath(); ctx.ellipse(3.9, -6.3, 1.3, .8, .5, 0, 7); ctx.ellipse(6.4, -6.3, 1.3, .8, -.5, 0, 7); ctx.fill();
      eye(3.9, -6.3); eye(6.4, -6.3);
      ctx.fillStyle = '#2a1f17'; ctx.beginPath(); ctx.arc(5.15, -5, .55, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2a1f17'; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(5.15, -4.6, .9, .4, 2.7); ctx.stroke();
    } else if (a.kind === 'toucan') {
      const hop = reduced ? 0 : Math.max(0, Math.sin(t * 1.3 + a.l)) ** 30 * 2.2, tilt = reduced ? 0 : Math.sin(t * .9 + a.l) * .18;
      ctx.strokeStyle = '#5d4a33'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(7, -.5, 13, 1.5); ctx.stroke();
      ctx.save(); ctx.translate(0, -hop);
      ctx.strokeStyle = '#2b2a33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6.6, -2); ctx.lineTo(5.6, 4.5); ctx.stroke();
      ctx.fillStyle = '#2b2a33'; ctx.beginPath(); ctx.ellipse(7.6, -6, 3.4, 5.6, -.15, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(237,232,224,.45)'; ctx.lineWidth = .6; ctx.stroke();
      ctx.fillStyle = '#F4D35E'; ctx.beginPath(); ctx.ellipse(9.4, -8, 1.9, 2.4, -.2, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(8.6, -9.6); ctx.rotate(tilt);
      ctx.fillStyle = '#2b2a33'; ctx.beginPath(); ctx.arc(0, -1, 2.8, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(237,232,224,.45)'; ctx.lineWidth = .6; ctx.stroke();
      const bg = ctx.createLinearGradient(1.5, 0, 11, 0); bg.addColorStop(0, '#9BD15A'); bg.addColorStop(.25, '#F6D04D'); bg.addColorStop(.8, '#F28A2E'); bg.addColorStop(1, '#2b1a12');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(1.6, -2.6); ctx.quadraticCurveTo(7.5, -3.6, 11.2, .4); ctx.quadraticCurveTo(6.5, .6, 1.6, .6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F4D35E'; ctx.beginPath(); ctx.arc(.4, -1.6, 1.1, 0, 7); ctx.fill(); eye(.5, -1.6);
      ctx.restore(); ctx.restore();
    } else {
      const sw = reduced ? 0 : Math.sin(t * 1.5 + a.l) * .32, wave = reduced ? 0 : Math.sin(t * 2.3) * .35;
      ctx.strokeStyle = '#6b4a33'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 1.6, 0, 0, 7); ctx.stroke();
      ctx.translate(1.6, 1); ctx.rotate(sw);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2.8, 3.5, 2.6, 8.5); ctx.stroke();
      ctx.fillStyle = '#6b4a33'; ctx.beginPath(); ctx.ellipse(2.6, 13, 3.3, 4.6, 0, 0, 7); ctx.fill();
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(1.4, 10); ctx.lineTo(.4, 7.6); ctx.moveTo(3.8, 10); ctx.lineTo(4.9, 7.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, 15.5); ctx.quadraticCurveTo(-1.5, 20, -1.2 + wave * 3, 24); ctx.moveTo(4.2, 15.5); ctx.quadraticCurveTo(6.6, 20, 6.4, 23.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(2.6, 19.8, 3.5, 0, 7); ctx.arc(-.7, 19.3, 1.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(5.9, 19.3, 1.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#a8876a'; ctx.beginPath(); ctx.ellipse(2.6, 20.4, 2.4, 2.1, 0, 0, 7); ctx.fill();
      eye(1.7, 21); eye(3.5, 21);
      ctx.strokeStyle = '#2a1f17'; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(2.6, 19.9, .8, 3.5, 5.9); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- Managua: runway, lights, and a plane that takes off ---- */
  const rw = F.rw;
  if (rw && H > S.rwA && vis(rw.y)) {
    const p = clamp((H - S.rwA) / (S.rwB - S.rwA), 0, 1), hw = PL ? 5 : 6.5;
    if (!O.plane) {
      const q = rng(S.rwA, S.rwB); if (q) { path(MAIN, q[0], q[1]); ctx.strokeStyle = '#6f6b65'; ctx.lineWidth = LW * .8; ctx.stroke(); }
    } else {
      const a = Math.min(rw.x0, rw.x1), b = Math.max(rw.x0, rw.x1), xe = rw.x0 + rw.dir * rw.len * p;
      ctx.save(); ctx.beginPath(); ctx.rect(Math.min(rw.x0, xe) - 1, rw.y - 30, Math.abs(xe - rw.x0) + 2, 60); ctx.clip();
      ctx.fillStyle = '#24211e'; ctx.fillRect(a, rw.y - hw, b - a, hw * 2);
      ctx.strokeStyle = 'rgba(237,232,224,.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a, rw.y - hw); ctx.lineTo(b, rw.y - hw); ctx.moveTo(a, rw.y + hw); ctx.lineTo(b, rw.y + hw); ctx.stroke();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(237,232,224,.5)'; ctx.beginPath(); ctx.moveTo(a + 16, rw.y); ctx.lineTo(b - 16, rw.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(237,232,224,.55)';
      for (const e of [a + 2, b - 9]) for (const k of [-.66, -.33, .33, .66]) { ctx.beginPath(); ctx.moveTo(e, rw.y + k * hw * 1.3); ctx.lineTo(e + 7, rw.y + k * hw * 1.3); ctx.stroke(); }
      for (let x = a + 3; x <= b; x += 16) {
        const ph2 = ((t * .8 - (x - rw.x0) * rw.dir / rw.len) % 1 + 1) % 1, on = ph2 < .07 && !reduced;
        ctx.fillStyle = on ? 'rgba(255,236,200,.95)' : 'rgba(255,220,160,.35)';
        for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(x, rw.y + e * (hw + 3), on ? 1.3 : .9, 0, 7); ctx.fill(); }
      }
      ctx.restore();
      for (let k = 1; k <= 4; k++) {
        const on = !reduced && Math.floor(t * 7) % 6 === 4 - k;
        ctx.fillStyle = on ? 'rgba(255,240,215,1)' : 'rgba(255,220,160,.25)';
        ctx.beginPath(); ctx.arc(rw.x0 - rw.dir * (4 + k * 7), rw.y, on ? 1.5 : 1, 0, 7); ctx.fill();
      }
    }
  }
  if (rw && O.plane) flyPlane(now, rw, sy, vh);

  /* ---- the moving front ---- */
  if (H < R.tot - 1) {
    const p = atP(H);
    if (vis(p.y)) {
      if (H < S.l1A) {
        lavaHead(p);
        if (!reduced) { const a = Math.atan2(p.ty, p.tx); ctx.fillStyle = 'rgba(255,200,120,.9)'; for (let k = 0; k < 2; k++) { const aa = a + (k ? .8 : -.8) + Math.sin(t * 3 + k) * .3, d = LW * (1.1 + .4 * Math.sin(t * 2.2 + k * 2)); ctx.beginPath(); ctx.arc(p.x + Math.cos(aa) * d, p.y + Math.sin(aa) * d, LW * .55, 0, 7); ctx.fill(); } }
      } else if ((H > S.l1B && H < S.l2A) || (H > S.l2B && H < S.skA)) waterHead(p);
    }
  }

  /* ---- embers and steam ---- */
  for (let k = parts.length - 1; k >= 0; k--) {
    const q = parts[k]; q.age += dt; if (q.age > q.life) { parts.splice(k, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; const a = 1 - q.age / q.life;
    if (q.kind === 'ember') { q.vx *= .985; ctx.fillStyle = `hsla(${q.h},100%,${62 + 10 * a}%,${a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (.5 + .5 * a), 0, 7); ctx.fill(); }
    else { const rr4 = 3 + q.age * 7, sg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rr4); sg.addColorStop(0, `rgba(232,234,230,${.16 * a})`); sg.addColorStop(1, 'rgba(232,234,230,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(q.x, q.y, rr4, 0, 7); ctx.fill(); }
  }
  ctx.restore();
  if (TUBE) lavaTube(now, t, dt, vis);
}
/* a lava tube: the stream pours over the lip of a cave mouth in the ground above the timeline,
   runs underground, and comes back out of the arched mouth of a rocky outcrop below it */
function lavaTube(now, t, dt, vis) {
  const s = PL ? .8 : 1, flick = reduced ? 1 : .85 + .15 * Math.sin(t * 5.3) * Math.sin(t * 2.1 + 1);
  const litAt = l => H >= l - 2 ? (reduced ? 1 : clamp((now - born(l, now)) / 900, 0, 1)) : 0;
  const pool = (x, y, R, a0) => {   /* soft elliptical light on the ground, fading to nothing */
    ctx.save(); ctx.translate(x, y); ctx.scale(1, .5);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, `rgba(255,130,60,${a0})`); g.addColorStop(.35, `rgba(255,120,50,${a0 * .45})`); g.addColorStop(.7, `rgba(255,110,40,${a0 * .12})`); g.addColorStop(1, 'rgba(255,110,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.restore();
  };
  const hot = (a) => `rgba(255,${Math.round(150 + 60 * a)},${Math.round(70 + 60 * a)},1)`;

  /* ---- the way in: a pit with a rocky rim; the lava tips over the back lip and drops into the dark ---- */
  {
    const y = TUBE.y1, l = R.lAtY(y), p = atP(l), lit = litAt(l - 14), x = p.x, rx = 15 * s, ry = 5.5 * s;
    if (vis(y)) {
      if (lit) pool(x, y, rx * 3.2, .26 * lit * flick);
      ctx.fillStyle = '#2a2420'; blob(x, y + .6, rx + 3 * s, ry + 2.2 * s, 4.1, 0, 1); ctx.fill();
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + .6, d = rx + 4 * s + hsh(k + 3) * 3; ctx.fillStyle = k % 2 ? '#3a322c' : '#241f1b'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * .35 + 1, (1.4 + hsh(k * 3 + 1) * 1.4) * s, 1.1 * s, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#060404'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
      if (lit) {
        /* glow from deep inside */
        ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.clip();
        const g2 = ctx.createRadialGradient(x, y + ry * 1.4, 0, x, y + ry * 1.4, rx);
        g2.addColorStop(0, `rgba(255,190,110,${.7 * lit * flick})`); g2.addColorStop(.5, `rgba(230,100,45,${.35 * lit})`); g2.addColorStop(1, 'rgba(120,30,10,0)');
        ctx.fillStyle = g2; ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
        /* the stream curls over the back lip and falls in, narrowing as it drops out of sight */
        const q = atP(R.lAtY(y - ry - 8)), x0 = q.x, y0 = y - ry - 8;
        ctx.save(); ctx.shadowColor = 'rgba(255,120,50,.9)'; ctx.shadowBlur = 8 * lit;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0, y - ry + 1, x + (x0 - x) * .3, y - ry * .2, x, y + ry * .9);
        ctx.strokeStyle = hot(flick); ctx.lineWidth = 2.6 * s * lit; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0, y - ry + 1, x + (x0 - x) * .3, y - ry * .2, x, y + ry * .9);
        ctx.strokeStyle = `rgba(255,236,190,${.8 * lit})`; ctx.lineWidth = 1 * s; ctx.stroke(); ctx.restore();
        ctx.restore();
        /* the part on the back lip, outside the opening */
        ctx.save(); ctx.shadowColor = 'rgba(255,120,50,.8)'; ctx.shadowBlur = 6 * lit;
        ctx.beginPath(); ctx.moveTo(x0, y0 - 4); ctx.quadraticCurveTo(x0, y - ry - 2, x0 + (x - x0) * .15, y - ry + .5);
        ctx.strokeStyle = hot(flick); ctx.lineWidth = 2.8 * s * lit; ctx.stroke(); ctx.restore();
        /* front rim catches a little light; sparks */
        ctx.strokeStyle = `rgba(255,160,90,${.35 * lit * flick})`; ctx.lineWidth = .9; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        if (O.embers && !reduced && Math.random() < 2.2 * lit * dt) spawn('ember', x + (Math.random() - .5) * rx, y - 1);
      }
    }
  }

  /* ---- the way out: a low mound of broken rock (the roof of the tube) with an arched mouth; the lava spills out of it ---- */
  {
    const y = TUBE.y2, l = R.lAtY(y), p = atP(l), lit = litAt(l), x = p.x;
    if (vis(y)) {
      const w = 19 * s, h = 15 * s, top = y - h;
      if (lit) pool(x, y + 3, w * 2.4, .2 * lit * flick);
      /* the mound: stacked, cracked basalt slabs */
      ctx.fillStyle = '#29231f';
      ctx.beginPath(); ctx.moveTo(x - w, y + 2 * s);
      ctx.bezierCurveTo(x - w * .95, top + h * .35, x - w * .45, top - 1, x - w * .05, top + .5);
      ctx.bezierCurveTo(x + w * .4, top - 1.5, x + w * .95, top + h * .4, x + w, y + 2 * s);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(80,68,58,.9)'; ctx.lineWidth = .9;
      for (const [a, b, c, d] of [[-.8, .55, -.35, .35], [-.2, .2, .35, .3], [.3, .55, .75, .6], [-.55, .82, -.15, .75]]) { ctx.beginPath(); ctx.moveTo(x + a * w, top + b * h); ctx.lineTo(x + c * w, top + d * h); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(120,104,90,.55)'; ctx.beginPath(); ctx.moveTo(x - w * .5, top + h * .12); ctx.quadraticCurveTo(x, top - 1.2, x + w * .5, top + h * .14); ctx.stroke();   /* lit top edge */
      for (let k = 0; k < 4; k++) { const a = k < 2 ? -1 : 1, d = w + (1 + k % 2 * 3) * s; ctx.fillStyle = k % 2 ? '#3a322c' : '#211c18'; ctx.beginPath(); ctx.ellipse(x + a * d, y + 1.5 * s, (1.6 + hsh(k * 5 + 2) * 1.4) * s, 1.2 * s, 0, 0, 7); ctx.fill(); }
      /* the arched mouth at the foot of the mound */
      const ax = 7 * s, ay = 7.5 * s;
      ctx.fillStyle = '#060404'; ctx.beginPath(); ctx.moveTo(x - ax, y + 1); ctx.quadraticCurveTo(x - ax, y - ay, x, y - ay); ctx.quadraticCurveTo(x + ax, y - ay, x + ax, y + 1); ctx.closePath(); ctx.fill();
      if (lit) {
        ctx.save(); ctx.beginPath(); ctx.moveTo(x - ax, y + 1); ctx.quadraticCurveTo(x - ax, y - ay, x, y - ay); ctx.quadraticCurveTo(x + ax, y - ay, x + ax, y + 1); ctx.closePath(); ctx.clip();
        const g3 = ctx.createRadialGradient(x, y + 1, 0, x, y + 1, ay * 1.2);
        g3.addColorStop(0, `rgba(255,200,120,${.85 * lit * flick})`); g3.addColorStop(.6, `rgba(220,90,40,${.4 * lit})`); g3.addColorStop(1, 'rgba(90,20,10,0)');
        ctx.fillStyle = g3; ctx.fillRect(x - ax, y - ay, ax * 2, ay + 2); ctx.restore();
        /* lava spilling over the threshold and on down the slope */
        ctx.save(); ctx.shadowColor = 'rgba(255,120,50,.85)'; ctx.shadowBlur = 7 * lit;
        ctx.fillStyle = hot(flick); blob(x, y + 1.2, ax * .75, 2.2 * s, 1.7); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = `rgba(255,170,100,${.45 * lit * flick})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x - ax, y + 1); ctx.quadraticCurveTo(x - ax, y - ay, x, y - ay); ctx.quadraticCurveTo(x + ax, y - ay, x + ax, y + 1); ctx.stroke();
        if (O.embers && !reduced && Math.random() < 1.2 * lit * dt) spawn('ember', x + (Math.random() - .5) * ax, y - 1);
        if (O.embers && !reduced && Math.random() < .5 * lit * dt) spawn('steam', x, y - ay - 2);
      }
    }
  }
}
function glyph(x, y, a, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 1.8, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2.5, -1); ctx.lineTo(-3, -10.5); ctx.lineTo(-5.5, -10.5); ctx.lineTo(-2.5, -1); ctx.lineTo(-2.5, 1); ctx.lineTo(-5.5, 10.5); ctx.lineTo(-3, 10.5); ctx.lineTo(2.5, 1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, -.8); ctx.lineTo(-10.4, -4.4); ctx.lineTo(-11.8, -4.4); ctx.lineTo(-10.6, -.8); ctx.lineTo(-10.6, .8); ctx.lineTo(-11.8, 4.4); ctx.lineTo(-10.4, 4.4); ctx.lineTo(-8, .8); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function flyPlane(now, rw, sy, vh) {
  const p = clamp((H - S.rwA) / (S.rwB - S.rwA), 0, 1), sc0 = PL ? .75 : .95;
  const inView = rw.y > sy + vh * .12 && rw.y < sy + vh * .88, out = rw.y < sy - 120 || rw.y > sy + vh + 120;
  if (plane.ph === 'park') {
    if (p >= 1 && inView && !reduced) { if (!plane.wait) plane.wait = now; else if (now - plane.wait > 800) { plane.ph = 'go'; plane.t0 = now; plane.trail = []; } }
    else plane.wait = 0;
  } else if (plane.ph === 'done' && out) { plane.ph = 'park'; plane.wait = 0; bye(false); }
  // contrail
  plane.trail = plane.trail.filter(q => now - q.t < 1800);
  ctx.lineWidth = .9;
  for (let k = 1; k < plane.trail.length; k++) {
    const a = plane.trail[k - 1], b = plane.trail[k], al = .32 * (1 - (now - b.t) / 1800);
    ctx.strokeStyle = `rgba(237,232,224,${al})`; ctx.beginPath();
    ctx.moveTo(a.lx, a.ly); ctx.lineTo(b.lx, b.ly); ctx.moveTo(a.rx, a.ry); ctx.lineTo(b.rx, b.ry); ctx.stroke();
  }
  const base = rw.dir > 0 ? 0 : Math.PI;
  if (plane.ph === 'park') {
    if (p < 1) return;
    if (reduced) { glyph(rw.x1 - rw.dir * 18, rw.y, base, sc0, '#EDE8E0'); bye(true); return; }
    glyph(rw.x0 + rw.dir * 15, rw.y, base, sc0, '#EDE8E0'); return;
  }
  if (plane.ph !== 'go') return;
  const u = (now - plane.t0) / 5600;
  if (u >= 1) { plane.ph = 'done'; bye(true); return; }
  const ru = .6, s0 = 15, sR = rw.len * .8, v = 2 * (sR - s0) / ru, CL = PL ? 120 : 170;
  let s, dy = 0, dxdu, dydu = 0, q = 0;
  if (u < ru) { s = s0 + (sR - s0) * (u / ru) ** 2; dxdu = 2 * (sR - s0) * u / ru / ru; }
  else { q = (u - ru) / (1 - ru); s = sR + v * (u - ru); dy = -CL * q * q; dxdu = v; dydu = -2 * CL * q / (1 - ru); }
  const x = rw.x0 + rw.dir * s, y = rw.y + dy, ang = Math.atan2(dydu, rw.dir * dxdu), alt = sstep(0, .7, q), sc = sc0 * (1 + .55 * alt), al = 1 - sstep(.72, 1, q);
  glyph(x + 10 * alt, rw.y + dy * .25 + 16 * alt, ang, sc0, `rgba(0,0,0,${.55 * (1 - alt)})`);
  if (q > .12) { const nx = -Math.sin(ang) * 9 * sc, ny = Math.cos(ang) * 9 * sc, bx = x - Math.cos(ang) * 4 * sc, by = y - Math.sin(ang) * 4 * sc; plane.trail.push({t: now, lx: bx + nx, ly: by + ny, rx: bx - nx, ry: by - ny}); }
  glyph(x, y, ang, sc, `rgba(237,232,224,${al})`);
}

let queued = 0;
const queue = () => { cancelAnimationFrame(queued); queued = requestAnimationFrame(() => requestAnimationFrame(build)); };
let rt; addEventListener('resize', () => { size(); clearTimeout(rt); rt = setTimeout(queue, 220); });
addEventListener('diary:rendered', queue); addEventListener('scene:layout', queue);
new ResizeObserver(queue).observe(document.getElementById('stops'));
if (document.fonts) document.fonts.ready.then(queue);
size(); queue();
requestAnimationFrame(frame);
})();

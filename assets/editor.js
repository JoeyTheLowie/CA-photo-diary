/* Editing inside the post page's preview (index.html?preview&edit). The post page owns the blocks; this file only
   decorates what app.js drew and reports what Joe does: drag a block (it snaps between the others), drop a photo
   on a spot, click a spot, edit a text in place. The post page applies the change and sends a fresh render. */
(function () {
'use strict';
const send = m => parent.postMessage({edit: m}, location.origin);
const NAMES = {full: 'Full width', single: 'Single photo', row: 'Side by side', 'photo-text': 'Photos and text', mosaic: 'Mosaic', quote: 'Quote', text: 'Text'};
const MAXP = {row: 4, 'photo-text': 3};
const MINP = {row: 2, 'photo-text': 1};

const css = document.createElement('style');
css.textContent = `
html.edit .rows{padding-bottom:120px}
.blk{position:relative;border-radius:12px;transition:box-shadow .15s}
.blk:hover,.blk.focus{box-shadow:0 0 0 2px rgba(232,98,58,.55)}
.blk.lift{opacity:.35}
.tools{position:absolute;top:10px;right:10px;z-index:6;display:none;gap:2px;align-items:center;background:#2a2724;border:1px solid rgba(237,232,224,.16);border-radius:10px;padding:3px;box-shadow:0 6px 20px rgba(0,0,0,.45);font:500 13px/1 Inter,system-ui,sans-serif}
.blk:hover .tools,.blk.focus .tools{display:flex}
.tools b{font-weight:500;color:#9A938A;padding:0 8px 0 6px;white-space:nowrap}
.tools button{background:none;border:0;color:#EDE8E0;font:500 13px/1 Inter,system-ui,sans-serif;height:28px;min-width:28px;padding:0 8px;border-radius:7px;cursor:pointer;white-space:nowrap}
.tools button:hover{background:#3a3733}
.tools .grab{cursor:grab;font-size:16px;letter-spacing:-2px}
.tools .del:hover{background:#7a2a1a}
.ph{cursor:pointer}
.ph[draggable=true]{cursor:grab}
.ph.slot{background:rgba(237,232,224,.04);border:1.5px dashed rgba(237,232,224,.28);display:flex;align-items:center;justify-content:center;color:rgba(237,232,224,.5);font:400 30px/1 Inter,system-ui,sans-serif}
.ph.slot::after{content:"+"}
.ph.sel{outline:3px solid #E8623A;outline-offset:-3px}
.ph.over{outline:3px solid #FFB46A;outline-offset:-3px;filter:brightness(1.15)}
.ph .rm{position:absolute;top:8px;right:8px;z-index:3;width:28px;height:28px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font:500 16px/1 Inter,sans-serif;cursor:pointer;display:none}
.ph:hover .rm{display:block}
[data-f]{outline:none;cursor:text;border-radius:6px;min-width:4ch}
[data-f]:hover{background:rgba(237,232,224,.05)}
[data-f]:focus{background:rgba(237,232,224,.07);box-shadow:0 0 0 2px rgba(232,98,58,.5)}
[data-f]:empty::before{content:attr(data-ph);color:rgba(237,232,224,.3)}
.note .body[data-f]{white-space:pre-wrap}
.magnet{height:0;position:relative;pointer-events:none}
.magnet::before{content:"";position:absolute;left:-6px;right:-6px;top:-6px;height:5px;border-radius:3px;background:#E8623A;box-shadow:0 0 14px #E8623A}
.rows.empty-drop{outline:2px dashed rgba(232,98,58,.5);outline-offset:8px;border-radius:12px}
.hint-empty{color:#9A938A;font:400 15px/1.5 Inter,sans-serif;padding:40px 0;text-align:center}
`;
document.head.appendChild(css);
document.documentElement.classList.add('edit');

const types = e => [...(e.dataTransfer ? e.dataTransfer.types : [])];
const has = (e, t) => types(e).includes(t);

function rowsEl() { return document.querySelector('#stops .rows'); }
function blocks() { return [...rowsEl().querySelectorAll(':scope > .blk')]; }

/* where a dragged block or new block would land: before the first block whose middle is below the pointer */
let magnet = null;
function dropIndex(y) {
  const bs = blocks().filter(b => !b.classList.contains('lift'));
  let i = bs.findIndex(b => { const r = b.getBoundingClientRect(); return y < r.top + r.height / 2; });
  if (i < 0) i = bs.length;
  return {i, before: bs[i] || null, list: bs};
}
function showMagnet(y) {
  const {before} = dropIndex(y);
  if (!magnet) { magnet = document.createElement('div'); magnet.className = 'magnet'; }
  const rows = rowsEl();
  if (before) { if (magnet.nextSibling !== before) rows.insertBefore(magnet, before); }
  else if (rows.lastElementChild !== magnet) rows.appendChild(magnet);
}
function hideMagnet() { if (magnet) magnet.remove(); }
/* the index among all blocks (including the one being moved), in the order shown */
function targetIndex(y) {
  const all = blocks(), {before} = dropIndex(y);
  return before ? all.indexOf(before) : all.length;
}

window.__decorate = function () {
  const rows = rowsEl(); if (!rows) return;
  const E = window.__edit || {}, sel = E.sel || null;   /* sel = {id, j}: the photo spot selected on the post page */
  if (!blocks().length && !rows.querySelector('.hint-empty')) {
    const h = document.createElement('div'); h.className = 'hint-empty';
    h.textContent = 'Nothing here yet. Click a block type on the left, or drag one in here.';
    rows.appendChild(h);
  }
  blocks().forEach(el => {
    if (el.querySelector(':scope > .tools')) return;   /* already decorated */
    const id = el.dataset.id, t = (el.className.match(/blk-([\w-]+)/) || [])[1];
    const n = el.querySelectorAll('.ph[data-slot]').length;
    const tools = document.createElement('div'); tools.className = 'tools';
    tools.innerHTML = `<button class="grab" draggable="true" title="Drag to move">⠿</button><b>${NAMES[t] || t}</b>`
      + `<button data-a="up" title="Move up">↑</button><button data-a="down" title="Move down">↓</button>`
      + (t === 'photo-text' || t === 'mosaic' ? '<button data-a="flip" title="Swap sides">⇄</button>' : '')
      + (MAXP[t] && n < MAXP[t] ? '<button data-a="more" title="Add a photo spot">+ spot</button>' : '')
      + (MINP[t] && n > MINP[t] ? '<button data-a="less" title="Remove the last photo spot">− spot</button>' : '')
      + '<button class="del" data-a="del" title="Delete block">✕</button>';
    el.appendChild(tools);
    tools.addEventListener('click', e => { const a = e.target.dataset && e.target.dataset.a; if (a) send({op: a, id}); });
    const grab = tools.querySelector('.grab');
    grab.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/x-block', id); e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setDragImage(el, 40, 20); } catch {}
      setTimeout(() => el.classList.add('lift'), 0);
    });
    grab.addEventListener('dragend', () => { el.classList.remove('lift'); hideMagnet(); });

    /* photo spots */
    el.querySelectorAll('.ph[data-slot]').forEach(f => {
      const j = +f.dataset.slot, filled = !f.classList.contains('slot');
      f.classList.toggle('sel', !!sel && sel.id === id && sel.j === j);
      f.onclick = e => { e.stopPropagation(); send({op: 'select', id, j}); };
      if (f.dataset.dec === id + j) return; f.dataset.dec = id + j;
      if (filled) {
        f.draggable = true;
        f.addEventListener('dragstart', e => { e.stopPropagation(); e.dataTransfer.setData('text/x-photo', JSON.stringify({id, j})); e.dataTransfer.effectAllowed = 'move'; });
        const rm = document.createElement('button'); rm.className = 'rm'; rm.type = 'button'; rm.title = 'Back to the tray'; rm.textContent = '×';
        rm.onclick = e => { e.stopPropagation(); send({op: 'unplace', id, j}); };
        f.appendChild(rm);
      }
      f.addEventListener('dragover', e => { if (has(e, 'text/x-photo') || has(e, 'text/x-tray')) { e.preventDefault(); e.stopPropagation(); f.classList.add('over'); hideMagnet(); } });
      f.addEventListener('dragleave', () => f.classList.remove('over'));
      f.addEventListener('drop', e => {
        f.classList.remove('over');
        const tray = e.dataTransfer.getData('text/x-tray'), from = e.dataTransfer.getData('text/x-photo');
        if (!tray && !from) return;
        e.preventDefault(); e.stopPropagation();
        send({op: 'place', id, j, hash: tray || null, from: from ? JSON.parse(from) : null});
      });
    });

    /* texts, edited in place */
    el.querySelectorAll('[data-f]').forEach(x => {
      x.contentEditable = 'plaintext-only';
      if (x.contentEditable !== 'plaintext-only') x.contentEditable = 'true';
      x.spellcheck = true;
      x.addEventListener('input', () => send({op: 'text', id, f: x.dataset.f, v: x.innerText.replace(/ /g, ' ')}));
      x.addEventListener('blur', () => setTimeout(() => { const a = document.activeElement; if (!(a && a.dataset && a.dataset.f)) send({op: 'blur'}); }, 0));   /* re-layout once typing is done, not when hopping to the next text */
      x.addEventListener('keydown', e => { if (e.key === 'Enter' && x.dataset.f === 'h') { e.preventDefault(); x.blur(); } });
    });
  });
  if (E.focus && !E.focused) { E.focused = true; const f = rows.querySelector(`.blk[data-id="${E.focus}"]`); if (f) f.scrollIntoView({block: 'center', behavior: 'smooth'}); }
};

/* dragging blocks, new blocks from the palette, and tray photos dropped between blocks */
document.addEventListener('dragover', e => {
  const rows = rowsEl(); if (!rows) return;
  if (has(e, 'text/x-block') || has(e, 'text/x-new') || has(e, 'text/x-tray') || has(e, 'text/x-photo')) {
    e.preventDefault(); showMagnet(e.clientY);
    const r = innerHeight; if (e.clientY < 60) scrollBy(0, -18); else if (e.clientY > r - 60) scrollBy(0, 18);   /* scroll while dragging */
  }
});
document.addEventListener('dragleave', e => { if (!e.relatedTarget) hideMagnet(); });
document.addEventListener('drop', e => {
  const rows = rowsEl(); if (!rows) return;
  const blk = e.dataTransfer.getData('text/x-block'), nw = e.dataTransfer.getData('text/x-new'), tray = e.dataTransfer.getData('text/x-tray'), from = e.dataTransfer.getData('text/x-photo');
  if (!blk && !nw && !tray && !from) return;
  e.preventDefault();
  const to = targetIndex(e.clientY); hideMagnet();
  if (blk) send({op: 'move', id: blk, to});
  else if (nw) send({op: 'insert', type: nw, to});
  else send({op: 'insertPhoto', hash: tray || null, from: from ? JSON.parse(from) : null, to});   /* a photo dropped between blocks gets a block of its own */
});
document.addEventListener('dragend', hideMagnet);
document.addEventListener('click', e => { if (!e.target.closest('.blk')) send({op: 'select', id: null}); });

})();

/* Convolution playground: paint an 8x8 image, pick or edit a 3x3 filter, see the 6x6 feature map,
   ReLU and 2x2 max pooling live. Tap an output cell to see its multiply-and-add. */
Course.widget('conv', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg', N = 8, M = N - 2, CS = 34;
  if (!document.getElementById('conv-css')) {
    const st = document.createElement('style'); st.id = 'conv-css';
    st.textContent = `
    .cvw svg{touch-action:none;user-select:none}
    .cvw .kgrid{display:grid;grid-template-columns:repeat(3,54px);gap:5px}
    .cvw .kgrid input{width:54px;box-sizing:border-box;text-align:center;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:7px;padding:5px 2px;font:600 14px var(--mono)}
    .cvw .calc{font:12.5px/1.5 var(--mono);background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:7px 9px;white-space:pre-wrap;word-break:break-word}
    .cvw .insight{border-radius:9px;padding:7px 10px;font-size:13.5px;background:var(--accent2-bg)}
    .cvw .muted{color:var(--muted);font-size:12.5px}
    .cvw text{pointer-events:none}`;
    document.head.append(st);
  }
  root.classList.add('cvw');
  const IMGS = {
    bar: ['00011000', '00011000', '00011000', '00011000', '00011000', '00011000', '00011000', '00011000'],
    hbar: ['00000000', '00000000', '00000000', '11111111', '11111111', '00000000', '00000000', '00000000'],
    square: ['00000000', '01111110', '01000010', '01000010', '01000010', '01000010', '01111110', '00000000'],
    cross: ['00011000', '00011000', '00011000', '11111111', '11111111', '00011000', '00011000', '00011000'],
    diag: ['10000000', '01000000', '00100000', '00010000', '00001000', '00000100', '00000010', '00000001'],
    L: ['00000000', '01000000', '01000000', '01000000', '01000000', '01000000', '01111110', '00000000']
  };
  const KERS = {
    vedge: { name: 'Vertical edge', k: [-1, 0, 1, -1, 0, 1, -1, 0, 1], d: 1, say: 'Positive (green) where the image gets brighter from left to right, negative (red) where it gets darker. Flat areas give zero.' },
    hedge: { name: 'Horizontal edge', k: [-1, -1, -1, 0, 0, 0, 1, 1, 1], d: 1, say: 'Responds to changes from top to bottom: green where it gets brighter going down, red where it gets darker.' },
    blur: { name: 'Blur (average)', k: [1, 1, 1, 1, 1, 1, 1, 1, 1], d: 9, say: 'Each output is the average of 9 pixels, so sharp details are smoothed out.' },
    sharpen: { name: 'Sharpen', k: [0, -1, 0, -1, 5, -1, 0, -1, 0], d: 1, say: 'The centre pixel is boosted and its neighbours subtracted, so borders stand out more strongly.' },
    outline: { name: 'Outline (Laplacian)', k: [0, 1, 0, 1, -4, 1, 0, 1, 0], d: 1, say: 'Zero on flat areas (inside or outside a shape); non-zero only along the borders.' },
    ident: { name: 'Identity', k: [0, 0, 0, 0, 1, 0, 0, 0, 0], d: 1, say: 'Copies the centre pixel: the map is the image without its outer ring of pixels (8 × 8 becomes 6 × 6).' }
  };
  const S = { img: IMGS.bar.map(r => [...r].map(Number)), k: KERS.vedge.k.slice(), d: 1, kname: 'vedge', relu: false, pool: true, sel: [2, 2] };
  const conv = () => { const O = []; for (let i = 0; i < M; i++) { O.push([]); for (let j = 0; j < M; j++) { let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += S.img[i + a][j + b] * S.k[a * 3 + b]; s /= S.d; if (S.relu && s < 0) s = 0; O[i].push(s); } } return O; };
  const fmt = v => { const r = Math.round(v * 100) / 100; return Number.isInteger(r) ? String(r) : (Math.abs(r) < 10 ? r.toFixed(2).replace(/0$/, '') : r.toFixed(1)); };
  /* ---------- svg ---------- */
  const W = 690, Hh = 330, IX = 12, IY = 40, OX = 330, OY = 74, PX = 580, PY = 108;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); (par || svg).append(e); return e; };
  const label = (x, y, t, sz = 13) => { const e = el('text', { x, y, 'text-anchor': 'middle', style: `font:700 ${sz}px var(--sans);fill:var(--c-ink)` }); e.textContent = t; return e; };
  label(IX + N * CS / 2, 26, 'image 8 × 8 (click or drag to paint)');
  const mapLbl = label(OX + M * CS / 2, OY - 14, 'feature map 6 × 6');
  const poolLbl = label(PX + 3 * CS / 2 + 4, PY - 14, 'max pool 3 × 3');
  const iCells = [], oCells = [], pCells = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const r = el('rect', { x: IX + j * CS + 1, y: IY + i * CS + 1, width: CS - 2, height: CS - 2, rx: 5, stroke: 'var(--line)', 'stroke-width': 1, style: 'cursor:crosshair' });
    const t = el('text', { x: IX + j * CS + CS / 2, y: IY + i * CS + CS / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', style: 'font:600 11px var(--mono);fill:var(--c-ink);opacity:.55' });
    r.dataset.i = i; r.dataset.j = j; iCells.push({ r, t, i, j });
  }
  const win = el('rect', { x: 0, y: 0, width: 3 * CS + 2, height: 3 * CS + 2, rx: 8, fill: 'none', stroke: 'var(--c-b)', 'stroke-width': 3, style: 'pointer-events:none' });
  for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
    const r = el('rect', { x: OX + j * CS + 1, y: OY + i * CS + 1, width: CS - 2, height: CS - 2, rx: 5, stroke: 'var(--line)', 'stroke-width': 1, style: 'cursor:pointer' });
    const t = el('text', { x: OX + j * CS + CS / 2, y: OY + i * CS + CS / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', style: 'font:700 11.5px var(--mono);fill:var(--c-ink)' });
    r.addEventListener('click', () => { S.sel = [i, j]; render(); }); r.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { S.sel = [i, j]; render(); } });
    oCells.push({ r, t, i, j });
  }
  const osel = el('rect', { x: 0, y: 0, width: CS + 2, height: CS + 2, rx: 7, fill: 'none', stroke: 'var(--c-b)', 'stroke-width': 3, style: 'pointer-events:none' });
  const PC = ['var(--c-a)', 'var(--c-b)', 'var(--c-c)'];
  const poolG = el('g', {});
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    const r = el('rect', { x: PX + b * CS + 1, y: PY + a * CS + 1, width: CS - 2, height: CS - 2, rx: 5, stroke: 'var(--line)' }, poolG);
    const t = el('text', { x: PX + b * CS + CS / 2, y: PY + a * CS + CS / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', style: 'font:700 11.5px var(--mono);fill:var(--c-ink)' }, poolG);
    pCells.push({ r, t, a, b });
  }
  const poolBox = el('rect', { x: 0, y: 0, width: 2 * CS, height: 2 * CS, rx: 7, fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 2.5, 'stroke-dasharray': '5 3', style: 'pointer-events:none' }, poolG);
  el('path', { d: `M${IX + N * CS + 8},${IY + N * CS / 2} l18,0 m-6,-6 l6,6 l-6,6`, stroke: 'var(--c-soft)', 'stroke-width': 2, fill: 'none' });
  const arr2 = el('path', { d: `M${OX + M * CS + 8},${OY + M * CS / 2} l20,0 m-6,-6 l6,6 l-6,6`, stroke: 'var(--c-soft)', 'stroke-width': 2, fill: 'none' }, poolG);
  /* ---------- side panel ---------- */
  const kIns = S.k.map((v, n) => { const inp = h('input', { type: 'number', step: '1', value: v, 'aria-label': 'filter weight ' + (n + 1) }); inp.oninput = () => { const x = parseFloat(inp.value); S.k[n] = isFinite(x) ? x : 0; S.kname = 'custom'; kSel.value = 'custom'; render(); }; return inp; });
  const dIn = h('input', { type: 'number', min: 1, step: 1, value: 1, style: { width: '60px' } }); dIn.oninput = () => { const x = parseFloat(dIn.value); S.d = x > 0 ? x : 1; render(); };
  const kSel = h('select', {}, Object.entries(KERS).map(([k, o]) => h('option', { value: k }, o.name)), h('option', { value: 'custom' }, 'Custom (your numbers)'));
  kSel.onchange = () => { if (kSel.value === 'custom') return; const o = KERS[kSel.value]; S.k = o.k.slice(); S.d = o.d; S.kname = kSel.value; syncK(); render(); };
  const iSel = h('select', {}, [['bar', 'Vertical bar'], ['hbar', 'Horizontal bar'], ['square', 'Square outline'], ['cross', 'Cross'], ['diag', 'Diagonal line'], ['L', 'Letter L'], ['noise', 'Random pixels'], ['empty', 'Empty (paint your own)']].map(o => h('option', { value: o[0] }, o[1])));
  iSel.onchange = () => setImg(iSel.value);
  const reluC = h('input', { type: 'checkbox' }); reluC.onchange = () => { S.relu = reluC.checked; render(); };
  const poolC = h('input', { type: 'checkbox', checked: true }); poolC.onchange = () => { S.pool = poolC.checked; render(); };
  const calc = h('div', { class: 'calc' }), insight = h('div', { class: 'insight' }), statB = h('div', { class: 'muted' });
  function syncK() { kIns.forEach((inp, n) => inp.value = S.k[n]); dIn.value = S.d; kSel.value = S.kname; }
  function setImg(name) {
    if (name === 'noise') { const r = C.rng((Math.random() * 1e6) | 0); S.img = [...Array(N)].map(() => [...Array(N)].map(() => r.chance(0.35) ? 1 : 0)); }
    else if (name === 'empty') S.img = [...Array(N)].map(() => new Array(N).fill(0));
    else S.img = IMGS[name].map(r => [...r].map(Number));
    render();
  }
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Convolution playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'tap a cell of the feature map to see its sum')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg),
      h('div', { class: 'widget-side' }, h('label', {}, 'Filter ', kSel), h('div', { class: 'kgrid' }, kIns), h('label', { class: 'muted' }, 'divide the sum by ', dIn), calc, statB, insight)),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Image ', iSel), h('label', {}, reluC, ' apply ReLU (negatives → 0)'), h('label', {}, poolC, ' show 2 × 2 max pooling'),
      h('button', { class: 'btn small', onclick: () => { S.k = KERS.vedge.k.slice(); S.d = 1; S.kname = 'vedge'; S.relu = false; reluC.checked = false; S.pool = true; poolC.checked = true; S.sel = [2, 2]; iSel.value = 'bar'; syncK(); setImg('bar'); } }, 'Reset')));
  /* ---------- painting ---------- */
  let paint = null;
  const cellAt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); const j = Math.floor((q.x - IX) / CS), i = Math.floor((q.y - IY) / CS); return i >= 0 && j >= 0 && i < N && j < N ? [i, j] : null; };
  svg.addEventListener('pointerdown', e => { const c = cellAt(e); if (!c) return; svg.setPointerCapture(e.pointerId); paint = S.img[c[0]][c[1]] ? 0 : 1; S.img[c[0]][c[1]] = paint; iSel.value = 'empty'; render(); });
  svg.addEventListener('pointermove', e => { if (paint === null) return; const c = cellAt(e); if (c && S.img[c[0]][c[1]] !== paint) { S.img[c[0]][c[1]] = paint; render(); } });
  const up = () => { paint = null; }; svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  /* ---------- render ---------- */
  function render() {
    const O = conv(); let mx = 0; O.forEach(r => r.forEach(v => mx = Math.max(mx, Math.abs(v)))); mx = mx || 1;
    iCells.forEach(c => { const v = S.img[c.i][c.j]; c.r.style.fill = v ? 'var(--c-path)' : 'var(--c-node)'; c.t.textContent = v; });
    const shade = (v, m) => { const a = Math.round(Math.min(1, Math.abs(v) / m) * 70); return v > 0 ? `color-mix(in srgb, var(--ok) ${a}%, var(--card))` : v < 0 ? `color-mix(in srgb, var(--bad) ${a}%, var(--card))` : 'var(--card)'; };
    oCells.forEach(c => { const v = O[c.i][c.j]; c.r.style.fill = shade(v, mx); c.t.textContent = fmt(v); });
    const [si, sj] = S.sel; win.setAttribute('x', IX + sj * CS - 1); win.setAttribute('y', IY + si * CS - 1); osel.setAttribute('x', OX + sj * CS - 1); osel.setAttribute('y', OY + si * CS - 1);
    // pooling
    poolG.style.display = S.pool ? '' : 'none';
    const P = [0, 1, 2].map(a => [0, 1, 2].map(b => Math.max(O[2 * a][2 * b], O[2 * a][2 * b + 1], O[2 * a + 1][2 * b], O[2 * a + 1][2 * b + 1])));
    pCells.forEach(c => { const v = P[c.a][c.b]; c.r.style.fill = shade(v, mx); c.t.textContent = fmt(v); });
    const pa = Math.floor(si / 2), pb = Math.floor(sj / 2); poolBox.setAttribute('x', OX + 2 * pb * CS); poolBox.setAttribute('y', OY + 2 * pa * CS);
    pCells.forEach(c => c.r.setAttribute('stroke-width', c.a === pa && c.b === pb ? 3 : 1)); pCells.forEach(c => c.r.setAttribute('stroke', c.a === pa && c.b === pb ? 'var(--c-c)' : 'var(--line)'));
    mapLbl.textContent = 'feature map 6 × 6' + (S.relu ? ' (after ReLU)' : '');
    // calculation of the selected cell
    const terms = []; let sum = 0;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const p = S.img[si + a][sj + b], w = S.k[a * 3 + b]; sum += p * w; if (p && w) terms.push(p + '×' + (w < 0 ? '(' + w + ')' : w)); }
    let raw = sum / S.d, txt = 'cell row ' + (si + 1) + ', column ' + (sj + 1) + ':\n' + (terms.length ? terms.join(' + ') : 'all products are 0') + '\n= ' + fmt(sum) + (S.d !== 1 ? ' ÷ ' + S.d + ' = ' + fmt(raw) : '');
    if (S.relu && raw < 0) txt += '\nReLU: ' + fmt(raw) + ' → 0';
    if (S.pool) txt += '\nmax pool of its 2 × 2 block = ' + fmt(P[pa][pb]);
    calc.textContent = txt;
    const ks = S.k.reduce((a, b) => a + b, 0) / S.d;
    statB.textContent = 'largest |value| in the map: ' + fmt(mx) + ' · filter weights add up to ' + fmt(ks) + (Math.abs(ks) < 1e-9 ? ' (so flat areas give 0)' : '');
    insight.textContent = S.kname === 'custom' ? 'Your own filter. Tip: if the weights add up to 0, a flat area gives 0 and only changes (edges) light up. If they add up to 1, flat areas keep their brightness.' : KERS[S.kname].say;
  }
  render();
  return { setImg, render };
});

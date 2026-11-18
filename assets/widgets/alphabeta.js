/* Minimax / alpha-beta playground: game tree with MAX and MIN nodes, live alpha and beta, pruning with cut marks,
   leaf counters, editable or random leaves, best and worst move ordering. */
Course.widget('alphabeta', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('abw-css')) {
    const st = document.createElement('style'); st.id = 'abw-css';
    st.textContent = `
    .abw .e{stroke:var(--c-node-line);stroke-width:2;stroke-linecap:round;transition:stroke .3s,stroke-width .3s,opacity .3s}
    .abw .e.hot{stroke:var(--c-b);stroke-width:3.6}
    .abw .e.done{stroke:var(--c-a);stroke-width:2.6}
    .abw .e.pr{stroke:var(--c-soft);stroke-dasharray:5 5;opacity:.55}
    .abw .e.best{stroke:#f59e0b;stroke-width:5.5}
    .abw .nd{fill:var(--c-node);stroke:var(--c-node-line);stroke-width:2;stroke-linejoin:round;transition:fill .3s,stroke .3s}
    .abw .nd.ev{fill:var(--c-closed);stroke:var(--c-a)}
    .abw .nd.fin{fill:var(--c-open);stroke:var(--c-b)}
    .abw .nd.cur{fill:var(--c-cur);stroke:var(--c-c);stroke-width:3.6}
    .abw g.nodeg{transition:opacity .35s} .abw g.nodeg.gone{opacity:.25}
    .abw g.leaf{cursor:pointer} .abw g.leaf.sel .nd{stroke:var(--c-c);stroke-width:3.6;stroke-dasharray:3 2}
    .abw .cut{stroke:var(--bad);stroke-width:4.5;stroke-linecap:round;opacity:0;transition:opacity .3s}
    .abw .cut.on{opacity:1}
    .abw .vl{font:750 12.5px var(--mono);fill:var(--c-ink);pointer-events:none}
    .abw .ab{font:650 10.5px var(--mono);fill:var(--accent2);pointer-events:none;paint-order:stroke;stroke:var(--fig-bg);stroke-width:3.5px}
    .abw .lv{font:700 11px var(--sans);fill:var(--c-soft);letter-spacing:.06em}
    .abw .ins{border-radius:8px;padding:8px 10px;font-size:13.5px;background:var(--accent2-bg);line-height:1.45}
    .abw .ins.cut{background:var(--bad-bg)} .abw .ins.ok{background:var(--ok-bg)}
    .abw .big{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}
    .abw .cmp{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .abw .cmp div{border:1px solid var(--line);border-radius:10px;padding:6px 9px;background:var(--bg)}
    .abw .cmp small{color:var(--muted);display:block;font-size:12px}
    .abw .leafed input{width:70px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:8px;padding:4px 8px}`;
    document.head.append(st);
  }
  root.classList.add('abw');
  const SHAPES = { d4b2: { d: 4, b: 2, t: '4 levels, 2 moves (16 leaves)' }, d3b3: { d: 3, b: 3, t: '3 levels, 3 moves (27 leaves)' }, d3b2: { d: 3, b: 2, t: '3 levels, 2 moves (8 leaves)' }, d2b3: { d: 2, b: 3, t: '2 levels, 3 moves (9 leaves)' } };
  const S = { shape: SHAPES[opts.shape] ? opts.shape : 'd4b2', mode: 'ab', speed: 5 };
  const W = 900, LH = 84, TOP = 52;
  let tree = null, nodes = [], leaves = [], sel = null;
  const inf = x => x === Infinity ? '+∞' : x === -Infinity ? '−∞' : String(x);
  /* ---------- tree model ---------- */
  function randomTree() { const { d, b } = SHAPES[S.shape], rg = C.rng((Math.random() * 1e9) | 0); const mk = l => l === d ? { v: rg.int(0, 20) } : { ch: Array.from({ length: b }, () => mk(l + 1)) }; return mk(0); }
  const isLeaf = n => !n.ch;
  function mm(n, max = true) { return isLeaf(n) ? n.v : (max ? Math.max : Math.min)(...n.ch.map(c => mm(c, !max))); }
  function reorder(n, best, max = true) { if (isLeaf(n)) return; n.ch.forEach(c => reorder(c, best, !max)); const val = new Map(n.ch.map(c => [c, mm(c, !max)])); const desc = (max === best); n.ch.sort((a, b) => desc ? val.get(b) - val.get(a) : val.get(a) - val.get(b)); }
  const clone = n => isLeaf(n) ? { v: n.v } : { ch: n.ch.map(clone) };
  function flatten() {
    nodes = []; leaves = []; const { d } = SHAPES[S.shape];
    (function walk(n, depth, par) { n.depth = depth; n.kind = isLeaf(n) ? 'leaf' : depth % 2 === 0 ? 'max' : 'min'; n.parent = par; n.id = nodes.length; nodes.push(n); if (isLeaf(n)) leaves.push(n); else n.ch.forEach(c => walk(c, depth + 1, n)); })(tree, 0, null);
    const sp = (W - 70) / leaves.length; leaves.forEach((n, i) => { n.x = 50 + sp * (i + .5); n.y = TOP + d * LH; });
    (function pos(n) { if (isLeaf(n)) return; n.ch.forEach(pos); n.x = (n.ch[0].x + n.ch[n.ch.length - 1].x) / 2; n.y = TOP + n.depth * LH; })(tree);
  }
  /* ---------- the search as a generator of small events ---------- */
  function* search(mode) {
    let count = 0;
    function* visit(n, a, b, depth) {
      if (isLeaf(n)) { count++; yield { t: 'leaf', n, count }; return n.v; }
      yield { t: 'enter', n, a, b };
      const max = depth % 2 === 0; let v = max ? -Infinity : Infinity;
      for (let i = 0; i < n.ch.length; i++) {
        const c = n.ch[i], cv = yield* visit(c, a, b, depth + 1);
        v = max ? Math.max(v, cv) : Math.min(v, cv);
        if (mode === 'ab') {
          const cut = max ? v >= b : v <= a;
          if (cut && i < n.ch.length - 1) { yield { t: 'update', n, c, cv, v, a, b }; yield { t: 'prune', n, from: i + 1, v, a, b }; yield { t: 'exit', n, v, cut: true }; return v; }
          if (max) a = Math.max(a, v); else b = Math.min(b, v);
        }
        yield { t: 'update', n, c, cv, v, a, b };
      }
      yield { t: 'exit', n, v }; return v;
    }
    const v = yield* visit(tree, -Infinity, Infinity, 0);
    yield { t: 'done', v, count };
  }
  const countLeaves = (t, mode) => { const keep = tree; tree = t; let c = 0; for (const e of search(mode)) if (e.t === 'done') c = e.count; tree = keep; return c; };
  /* ---------- SVG ---------- */
  const svg = document.createElementNS(NS, 'svg'); svg.style.touchAction = 'manipulation';
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); par && par.append(e); return e; };
  function draw() {
    flatten(); const { d } = SHAPES[S.shape], H = TOP + d * LH + 40;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.textContent = '';
    const eL = el('g', {}, svg), cL = el('g', {}, svg), nL = el('g', {}, svg);
    for (let k = 0; k <= d; k++) { const t = el('text', { x: 6, y: TOP + k * LH + 4, class: 'lv' }, svg); t.textContent = k === d ? 'LEAF' : k % 2 ? 'MIN' : 'MAX'; }
    nodes.forEach(n => {
      if (n.parent) {
        const p = n.parent, y1 = p.y + (p.kind === 'max' ? 14 : 20), y2 = n.y - (n.kind === 'leaf' ? 12 : n.kind === 'max' ? 20 : 14);
        n.edge = el('line', { x1: p.x, y1, x2: n.x, y2, class: 'e' }, eL);
        const mx = p.x + (n.x - p.x) * .5, my = y1 + (y2 - y1) * .5, L = Math.hypot(n.x - p.x, y2 - y1), ux = (n.x - p.x) / L, uy = (y2 - y1) / L;
        n.cut = el('line', { x1: mx - uy * 11 - ux * 2, y1: my + ux * 11 - uy * 2, x2: mx + uy * 11 + ux * 2, y2: my - ux * 11 + uy * 2, class: 'cut' }, cL);
      }
      const g = el('g', { transform: `translate(${n.x},${n.y})`, class: 'nodeg' + (n.kind === 'leaf' ? ' leaf' : '') }, nL);
      if (n.kind === 'leaf') { n.shape = el('rect', { x: -13, y: -12, width: 26, height: 24, rx: 6, class: 'nd' }, g); n.lab = el('text', { y: 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'vl' }, g); n.lab.textContent = n.v; }
      else {
        n.shape = el('path', { d: n.kind === 'max' ? 'M0,-20 L23,14 L-23,14 Z' : 'M0,20 L23,-14 L-23,-14 Z', class: 'nd' }, g);
        n.lab = el('text', { y: n.kind === 'max' ? 4 : -4, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'vl' }, g);
        n.abt = el('text', { y: n.kind === 'max' ? 27 : 31, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ab' }, g);
      }
      n.g = g;
      if (n.kind === 'leaf') g.addEventListener('click', () => selectLeaf(n));
    });
  }
  /* ---------- side panel and controls ---------- */
  const sEval = h('span', { class: 'big' }, '0'), sAll = h('span', { class: 'big' }, '0'), sPr = h('b', {}, '0'), sRoot = h('b', {}, '–'), sOrd = h('div', { style: { fontSize: '13px', color: 'var(--muted)' } });
  const ins = h('div', { class: 'ins' });
  const leafIn = h('input', { type: 'number', step: 1, disabled: true, 'aria-label': 'leaf value' });
  leafIn.addEventListener('input', () => { if (!sel || leafIn.value === '' || isNaN(+leafIn.value)) return; sel.v = Math.round(+leafIn.value); const keep = sel; rebuild(); selectLeaf(nodes[keep.id]); });
  const side = h('div', { class: 'widget-side' },
    h('div', { class: 'legend' }, h('span', {}, '▲ MAX picks the largest'), h('span', {}, '▼ MIN picks the smallest'), h('span', {}, h('i', { style: { background: 'var(--bad)' } }), 'cut (pruned)')),
    h('div', { class: 'cmp' }, h('div', {}, h('small', {}, 'leaves evaluated'), sEval), h('div', {}, h('small', {}, 'plain minimax evaluates'), sAll)),
    h('div', { class: 'stat' }, h('span', {}, 'Leaves pruned'), sPr, h('span', {}, 'Root value'), sRoot),
    ins, sOrd,
    h('div', { class: 'leafed', style: { fontSize: '13.5px', color: 'var(--muted)' } }, 'Click a leaf to edit it: ', leafIn));
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  const sel_ = (label, list, val, fn) => { const s = h('select', {}, list.map(o => h('option', { value: o[0] }, o[1]))); s.value = val; s.onchange = () => fn(s.value); return h('label', {}, label + ' ', s); };
  const modeSel = sel_('Algorithm', [['ab', 'Alpha-beta pruning'], ['mm', 'Plain minimax']], S.mode, v => { S.mode = v; reset(); });
  const shapeSel = sel_('Tree', Object.entries(SHAPES).map(([k, v]) => [k, v.t]), S.shape, v => { S.shape = v; tree = randomTree(); rebuild(); });
  const spIn = h('input', { type: 'range', min: 1, max: 10, value: S.speed }); spIn.oninput = () => { S.speed = +spIn.value; };
  const bPlay = btn('▶ Play', () => togglePlay(), 'btn primary small');
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Minimax and alpha-beta playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'left to right · click a leaf to change it')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), side),
    h('div', { class: 'widget-ctl' }, modeSel, btn('Step', () => { stop(); step(); }), bPlay, btn('Reset', () => reset()), h('label', {}, 'Speed ', spIn)),
    h('div', { class: 'widget-ctl' }, shapeSel, btn('🎲 New random tree', () => { tree = randomTree(); rebuild(); }), btn('Best ordering', () => order(true)), btn('Worst ordering', () => order(false))));
  /* ---------- running ---------- */
  let gen = null, timer = null, playing = false, cur = null, pruned = 0;
  function selectLeaf(n) { if (sel && sel.g) sel.g.classList.remove('sel'); sel = n; n.g.classList.add('sel'); leafIn.disabled = false; leafIn.value = n.v; }
  function rebuild() { stop(); sel = null; leafIn.disabled = true; leafIn.value = ''; draw(); reset(); }
  function orderInfo() {
    const a = clone(tree), b = clone(tree); reorder(a, true); reorder(b, false);
    const { d, b: bb } = SHAPES[S.shape], ideal = Math.pow(bb, Math.ceil(d / 2)) + Math.pow(bb, Math.floor(d / 2)) - 1;
    sOrd.textContent = `This tree with alpha-beta: ${countLeaves(clone(tree), 'ab')} leaves now · best ordering ${countLeaves(a, 'ab')} · worst ordering ${countLeaves(b, 'ab')} (perfect-ordering formula: ${ideal}).`;
  }
  function order(best) { reorder(tree, best); rebuild(); ins.className = 'ins'; ins.textContent = best ? 'Best ordering: at every MAX node the best move is tried first (largest value), at every MIN node the smallest first. The same game, the same root value, but cuts come early. Press Play.' : 'Worst ordering: the best move is always tried last. Alpha-beta can cut almost nothing and evaluates about as many leaves as minimax. Press Play.'; }
  function reset() {
    stop(); gen = null; cur = null; pruned = 0;
    nodes.forEach(n => { n.retv = undefined; n.wasCut = false; n.g.classList.remove('gone'); n.shape.setAttribute('class', 'nd'); if (n.edge) n.edge.setAttribute('class', 'e'); if (n.cut) n.cut.setAttribute('class', 'cut'); if (n.kind !== 'leaf') { n.lab.textContent = ''; n.abt.textContent = ''; } });
    sEval.textContent = '0'; sAll.textContent = leaves.length; sPr.textContent = '0'; sRoot.textContent = '–';
    ins.className = 'ins'; ins.textContent = S.mode === 'ab' ? 'Alpha (α) = the best value MAX is already sure of on the way down. Beta (β) = the best value MIN is already sure of. When they cross, the rest of that node cannot matter: cut. Press Step.' : 'Plain minimax visits every leaf from left to right and passes values up: MAX takes the largest, MIN the smallest. Press Step.';
    orderInfo();
  }
  const setCur = n => { if (cur && cur.shape) cur.shape.classList.remove('cur'); cur = n; if (n) n.shape.classList.add('cur'); };
  const abTxt = (a, b) => S.mode === 'ab' ? `α ${inf(a)} β ${inf(b)}` : '';
  function sub(n, f) { f(n); if (n.ch) n.ch.forEach(c => sub(c, f)); }
  function step() {
    if (!gen) { reset(); gen = search(S.mode); }
    const r = gen.next(); if (r.done) { stop(); return false; }
    const e = r.value, n = e.n;
    if (e.t === 'enter') {
      setCur(n); if (n.edge) n.edge.setAttribute('class', 'e hot'); n.abt.textContent = abTxt(e.a, e.b);
      ins.className = 'ins'; ins.textContent = `${n.kind.toUpperCase()} node opened` + (S.mode === 'ab' ? ` with α = ${inf(e.a)} and β = ${inf(e.b)}: only values between them can still change the decision above.` : '. It will look at its children from left to right.');
    } else if (e.t === 'leaf') {
      setCur(n); n.shape.classList.add('ev'); if (n.edge) n.edge.setAttribute('class', 'e hot'); sEval.textContent = e.count;
      ins.className = 'ins'; ins.textContent = `Leaf evaluated: ${n.v}. (${e.count} so far.)`;
    } else if (e.t === 'update') {
      setCur(n); if (e.c.edge) e.c.edge.setAttribute('class', 'e done');
      n.lab.textContent = (n.kind === 'max' ? '≥' : '≤') + e.v; n.abt.textContent = abTxt(e.a, e.b);
      ins.className = 'ins'; ins.textContent = `${n.kind.toUpperCase()} receives ${e.cv}, so it can get ${n.kind === 'max' ? 'at least' : 'at most'} ${e.v}.` + (S.mode === 'ab' ? (n.kind === 'max' ? ` α becomes ${inf(e.a)}.` : ` β becomes ${inf(e.b)}.`) : '');
    } else if (e.t === 'prune') {
      let cnt = 0;
      n.ch.slice(e.from).forEach(c => { c.edge.setAttribute('class', 'e pr'); c.cut.setAttribute('class', 'cut on'); sub(c, x => { x.g.classList.add('gone'); if (x !== c && x.edge) x.edge.setAttribute('class', 'e pr'); if (x.kind === 'leaf') cnt++; }); });
      pruned += cnt; sPr.textContent = pruned;
      ins.className = 'ins cut'; ins.textContent = n.kind === 'max'
        ? `✂ Cut! This MAX node can already get ${e.v}, but the MIN node above has a choice worth only ${inf(e.b)} (β). MIN will never let the game come here, so ${cnt} leaf${cnt === 1 ? '' : 'ves'} are skipped.`
        : `✂ Cut! This MIN node can already hold the score to ${e.v}, but the MAX node above is sure of ${inf(e.a)} (α). MAX will never come here, so ${cnt} leaf${cnt === 1 ? '' : 'ves'} are skipped.`;
    } else if (e.t === 'exit') {
      n.lab.textContent = e.cut ? (n.kind === 'max' ? '≥' : '≤') + e.v : String(e.v); n.shape.classList.add('fin'); n.retv = e.v; n.wasCut = !!e.cut;
      if (n.parent) { n.edge.setAttribute('class', 'e done'); setCur(n.parent); } else setCur(null);
      ins.className = 'ins'; ins.textContent = e.cut ? `The node returns its bound ${e.v}: enough for the parent to decide.` : `${n.kind.toUpperCase()} node done: value ${e.v}.`;
    } else if (e.t === 'done') {
      setCur(null); sRoot.textContent = e.v; stop();
      let p = tree; while (!isLeaf(p)) { const c = p.ch.find(c => (isLeaf(c) ? c.v : c.retv) === e.v && !c.wasCut && !c.g.classList.contains('gone')); if (!c) break; c.edge.setAttribute('class', 'e best'); p = c; }
      const N = leaves.length, saved = Math.round(100 * (N - e.count) / N);
      ins.className = 'ins ok'; ins.textContent = S.mode === 'ab' ? `Root value ${e.v}, exactly what plain minimax gives. Alpha-beta evaluated ${e.count} of ${N} leaves and saved ${saved}% of the work. Try “Best ordering” and “Worst ordering”: the value never changes, the work does.` : `Root value ${e.v}. Plain minimax evaluated all ${N} leaves. Switch to alpha-beta and run again to see how many it can skip.`;
      return false;
    }
    return true;
  }
  function stop() { playing = false; clearTimeout(timer); bPlay.textContent = '▶ Play'; }
  function togglePlay() { if (playing) { stop(); return; } playing = true; bPlay.textContent = '❚❚ Pause'; loop(); }
  function loop() { if (!playing) return; if (!step()) { stop(); return; } timer = setTimeout(loop, 1400 / S.speed); }
  tree = opts.tree ? clone(opts.tree) : randomTree(); draw(); reset();
  return { reset, step: () => step(), setTree(t) { tree = clone(t); rebuild(); }, _count: m => countLeaves(clone(tree), m) };
});

/* A* playground: grid world, A* / Dijkstra / greedy / BFS, heuristics, weights, live frontier. */
Course.widget('astar', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  const COLS = opts.cols || 22, ROWS = opts.rows || 12, CS = 34, PAD = 10, W = COLS * CS + PAD * 2, H = ROWS * CS + PAD * 2;
  const SQ2 = Math.SQRT2;
  if (!document.getElementById('astar-css')) {
    const st = document.createElement('style'); st.id = 'astar-css';
    st.textContent = `
    .ast .cell{fill:var(--c-grid);stroke:color-mix(in srgb,var(--c-soft) 35%,transparent);stroke-width:1;transition:fill .28s,stroke .28s;cursor:crosshair}
    .ast .cell.wall{fill:#34465c;stroke:#2a394b} :root[data-theme=dark] .ast .cell.wall{fill:#0b1523;stroke:#31465f}
    .ast .cell.open{stroke:var(--c-b);stroke-width:2.2;fill:color-mix(in srgb,var(--c-b) 22%,var(--fig-bg))}
    .ast .cell.cur{stroke:var(--c-c);stroke-width:3;filter:url(#ast-glow)}
    .ast .num{font:600 8.6px var(--mono);fill:var(--c-ink);pointer-events:none;opacity:.78}
    .ast .numf{font:700 11px var(--mono);fill:var(--c-ink);pointer-events:none}
    .ast .pathline{fill:none;stroke:#f59e0b;stroke-width:5.5;stroke-linecap:round;stroke-linejoin:round;filter:url(#ast-glow)}
    .ast .pathcore{fill:none;stroke:#fff7d6;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
    .ast .qrow{display:grid;grid-template-columns:30px 1fr 1fr 1fr;gap:6px;padding:3px 8px;border-radius:7px;font:12.5px var(--mono)}
    .ast .qrow.top{background:var(--accent-bg);color:var(--accent);font-weight:700}
    .ast .qhead{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:0 8px}
    .ast table.res{border-collapse:collapse;width:100%;font-size:12.5px} .ast table.res td,.ast table.res th{padding:3px 6px;border-bottom:1px solid var(--line);text-align:right} .ast table.res th:first-child,.ast table.res td:first-child{text-align:left}
    .ast .warn{background:var(--warn-bg);color:var(--warn);border-radius:8px;padding:6px 9px;font-size:13px}
    .ast .good{background:var(--ok-bg);color:var(--ok);border-radius:8px;padding:6px 9px;font-size:13px}
    .ast .bad{background:var(--bad-bg);color:var(--bad);border-radius:8px;padding:6px 9px;font-size:13px}`;
    document.head.append(st);
  }
  root.classList.add('ast');
  /* ---------- state ---------- */
  let walls = new Set(), start = { c: 3, r: 6 }, goal = { c: COLS - 4, r: 5 };
  const key = (c, r) => r * COLS + c;
  let gen = null, running = false, timer = null, order = 0, cells = [], info = {}, results = [], pathEls = [], seq = 0;
  const S = { algo: 'astar', heur: 'euclid', diag: false, w: 1, speed: 6, costs: false };
  /* ---------- heuristics ---------- */
  const heurFns = {
    zero: () => 0,
    manhattan: (c, r) => Math.abs(c - goal.c) + Math.abs(r - goal.r),
    euclid: (c, r) => Math.hypot(c - goal.c, r - goal.r),
    octile: (c, r) => { const dx = Math.abs(c - goal.c), dy = Math.abs(r - goal.r); return dx + dy + (SQ2 - 2) * Math.min(dx, dy); },
    cheb: (c, r) => Math.max(Math.abs(c - goal.c), Math.abs(r - goal.r))
  };
  const H_NAMES = [['euclid', 'Euclidean distance'], ['manhattan', 'Manhattan distance'], ['octile', 'Octile distance'], ['cheb', 'Chebyshev distance'], ['zero', 'Zero (no guess)']];
  /* ---------- min-heap ---------- */
  class Heap { constructor() { this.a = []; } get size() { return this.a.length; }
    less(x, y) { return x.f < y.f - 1e-9 || (Math.abs(x.f - y.f) <= 1e-9 && (x.h < y.h - 1e-9 || (Math.abs(x.h - y.h) <= 1e-9 && x.seq < y.seq))); }
    push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.less(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break; } }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && this.less(a[l], a[m])) m = l; if (r < a.length && this.less(a[r], a[m])) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } } return top; }
    sorted() { return this.a.slice().sort((x, y) => this.less(x, y) ? -1 : 1); } }
  /* ---------- the search (generator: one expansion per step) ---------- */
  function* search(algo, hname, w, diag) {
    const hf = heurFns[hname], open = new Heap(), best = new Map(), closed = new Set(); let sq = 0;
    const mk = (c, r, g, par) => { const hv = hf(c, r); const f = algo === 'dijkstra' || algo === 'bfs' ? (algo === 'bfs' ? sq : g) : algo === 'greedy' ? hv : g + w * hv; return { c, r, g, h: hv, f, par, seq: sq++ }; };
    const s0 = mk(start.c, start.r, 0, null); open.push(s0); best.set(key(start.c, start.r), s0);
    const dirs = diag ? [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]] : [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]];
    let expanded = 0;
    yield { type: 'init', open, node: s0 };
    while (open.size) {
      const n = open.pop(); const k = key(n.c, n.r);
      if (closed.has(k) && algo !== 'bfs') continue;
      if (best.get(k) !== n && algo !== 'bfs') continue;
      closed.add(k); expanded++;
      if (n.c === goal.c && n.r === goal.r) { const path = []; for (let p = n; p; p = p.par) path.push(p); path.reverse(); yield { type: 'done', node: n, path, expanded, open }; return; }
      const pushed = [];
      for (const [dc, dr, cost] of dirs) {
        const c = n.c + dc, r = n.r + dr; if (c < 0 || r < 0 || c >= COLS || r >= ROWS || walls.has(key(c, r))) continue;
        if (dc && dr && (walls.has(key(n.c + dc, n.r)) || walls.has(key(n.c, n.r + dr)))) continue;   // no squeezing diagonally between walls
        const k2 = key(c, r), g = algo === 'bfs' ? n.g + 1 : n.g + cost;
        if (algo === 'bfs') { if (best.has(k2)) continue; } else { const old = best.get(k2); if (closed.has(k2) || (old && old.g <= g + 1e-9)) continue; }
        const nn = mk(c, r, g, n); best.set(k2, nn); open.push(nn); pushed.push(nn);
      }
      yield { type: 'expand', node: n, pushed, expanded, open, closedSize: closed.size };
    }
    yield { type: 'fail', expanded, open };
  }
  /* optimal cost via Dijkstra (silent) */
  function optimalCost() { let res = null; for (const e of search('dijkstra', 'zero', 1, S.diag)) { if (e.type === 'done') res = e.node.g; } return res; }
  /* ---------- DOM ---------- */
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.touchAction = 'none';
  svg.innerHTML = `<defs><filter id="ast-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="ast-s" cx="35%" cy="30%"><stop offset="0" stop-color="#86efac"/><stop offset="1" stop-color="#16a34a"/></radialGradient>
  <radialGradient id="ast-g" cx="35%" cy="30%"><stop offset="0" stop-color="#fca5a5"/><stop offset="1" stop-color="#dc2626"/></radialGradient></defs>`;
  const gridG = document.createElementNS(NS, 'g'), numG = document.createElementNS(NS, 'g'), pathG = document.createElementNS(NS, 'g'), markG = document.createElementNS(NS, 'g');
  svg.append(gridG, numG, pathG, markG);
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); par && par.append(e); return e; };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const rc = el('rect', { x: PAD + c * CS + 1.5, y: PAD + r * CS + 1.5, width: CS - 3, height: CS - 3, rx: 7, class: 'cell', 'data-c': c, 'data-r': r }, gridG); cells[key(c, r)] = rc; }
  const mS = el('g', {}, markG), mG = el('g', {}, markG);
  el('circle', { r: 12.5, fill: 'url(#ast-s)', stroke: '#14532d', 'stroke-width': 1.5, filter: 'url(#ast-glow)' }, mS); el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 0.5, style: 'font:800 13px var(--sans);fill:#fff;pointer-events:none' }, mS).textContent = 'S';
  el('circle', { r: 12.5, fill: 'url(#ast-g)', stroke: '#7f1d1d', 'stroke-width': 1.5, filter: 'url(#ast-glow)' }, mG); el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 0.5, style: 'font:800 13px var(--sans);fill:#fff;pointer-events:none' }, mG).textContent = 'G';
  const xy = (c, r) => [PAD + c * CS + CS / 2, PAD + r * CS + CS / 2];
  function placeMarks() { let [x, y] = xy(start.c, start.r); mS.setAttribute('transform', `translate(${x},${y})`); [x, y] = xy(goal.c, goal.r); mG.setAttribute('transform', `translate(${x},${y})`); }
  mS.style.cursor = mG.style.cursor = 'grab';
  const dot = el('circle', { r: 6.5, fill: '#fff', stroke: '#f59e0b', 'stroke-width': 3, opacity: 0, filter: 'url(#ast-glow)' }, markG);

  /* ---------- side panel & controls ---------- */
  const stat = h('div', { class: 'stat' });
  const sExp = h('b', {}, '0'), sOpen = h('b', {}, '0'), sCost = h('b', {}, '–'), sOpt = h('b', {}, '–');
  stat.append(h('span', {}, 'Expanded'), sExp, h('span', {}, 'Frontier'), sOpen, h('span', {}, 'Path cost'), sCost, h('span', {}, 'Optimal cost'), sOpt);
  const verdict = h('div', { class: 'good', hidden: true });
  const queueBox = h('div'); const resBox = h('div');
  const side = h('div', { class: 'widget-side' },
    h('div', { class: 'legend' }, h('span', {}, h('i', { style: { background: 'color-mix(in srgb,var(--c-b) 22%,var(--fig-bg))', borderColor: 'var(--c-b)' } }), 'frontier'), h('span', {}, h('i', { style: { background: 'var(--c-a)' } }), 'expanded'), h('span', {}, h('i', { style: { background: '#f59e0b' } }), 'path'), h('span', {}, h('i', { style: { background: '#34465c' } }), 'wall')),
    stat, verdict,
    h('div', {}, h('div', { class: 'qhead' }, 'Priority queue (lowest f first)'), queueBox),
    h('div', {}, h('div', { class: 'qhead' }, 'Runs so far'), resBox));
  const sel = (id, label, opts_, val, fn) => { const s = h('select', {}, opts_.map(o => h('option', { value: o[0] }, o[1]))); s.value = val; s.onchange = () => { fn(s.value); }; return h('label', {}, label + ' ', s); };
  const algoSel = sel('a', 'Algorithm', [['astar', 'A*'], ['dijkstra', 'Dijkstra (uniform cost)'], ['greedy', 'Greedy best-first'], ['bfs', 'Breadth-first']], S.algo, v => { S.algo = v; reset(); });
  const heurSel = sel('h', 'Heuristic h(n)', H_NAMES, S.heur, v => { S.heur = v; reset(); });
  const moveSel = sel('m', 'Moves', [['4', '4 directions'], ['8', '8 directions']], '4', v => { S.diag = v === '8'; reset(); });
  const wIn = h('input', { type: 'range', min: 1, max: 6, step: 0.5, value: 1 }), wOut = h('b', {}, '1');
  wIn.oninput = () => { S.w = +wIn.value; wOut.textContent = S.w; reset(); };
  const spIn = h('input', { type: 'range', min: 1, max: 10, value: 6 }); spIn.oninput = () => { S.speed = +spIn.value; };
  const costChk = h('input', { type: 'checkbox' }); costChk.onchange = () => { S.costs = costChk.checked; drawNums(); };
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  const bStep = btn('Step', () => { stopRun(); step(); }), bRun = btn('▶ Run', () => toggleRun(), 'btn primary small'), bReset = btn('Reset', () => reset());
  const presets = [['field', 'Open field'], ['wall', 'Wall with a gap'], ['trap', 'U-shaped trap'], ['maze', 'Maze'], ['random', 'Random obstacles']];
  const preSel = sel('p', 'Map', presets, 'field', v => { preset(v); });
  const ctl1 = h('div', { class: 'widget-ctl' }, algoSel, heurSel, moveSel, h('label', {}, 'Weight w ', wIn, wOut));
  const ctl2 = h('div', { class: 'widget-ctl' }, bStep, bRun, bReset, preSel, btn('🎲 Random start and goal', () => randomSG()), h('label', {}, 'Speed ', spIn), h('label', {}, costChk, 'show g, h, f'));
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ A* playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'Draw walls with the mouse · drag S and G')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), side), ctl1, ctl2);

  /* ---------- editing ---------- */
  let drag = null, paint = null;
  const cellAt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); const c = Math.floor((q.x - PAD) / CS), r = Math.floor((q.y - PAD) / CS); return (c < 0 || r < 0 || c >= COLS || r >= ROWS) ? null : { c, r }; };
  svg.addEventListener('pointerdown', e => {
    const p = cellAt(e); if (!p) return; svg.setPointerCapture(e.pointerId);
    if (p.c === start.c && p.r === start.r) drag = 'S'; else if (p.c === goal.c && p.r === goal.r) drag = 'G';
    else { paint = !walls.has(key(p.c, p.r)); setWall(p.c, p.r, paint); }
  });
  svg.addEventListener('pointermove', e => {
    const p = cellAt(e); if (!p) return;
    if (drag === 'S' && !walls.has(key(p.c, p.r)) && !(p.c === goal.c && p.r === goal.r)) { start = p; placeMarks(); reset(true); }
    else if (drag === 'G' && !walls.has(key(p.c, p.r)) && !(p.c === start.c && p.r === start.r)) { goal = p; placeMarks(); reset(true); }
    else if (paint !== null) setWall(p.c, p.r, paint);
  });
  const up = () => { drag = null; paint = null; }; svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  function setWall(c, r, on) { if ((c === start.c && r === start.r) || (c === goal.c && r === goal.r)) return; const k = key(c, r); if (on) walls.add(k); else walls.delete(k); cells[k].classList.toggle('wall', on); reset(true); }
  function paintWalls() { cells.forEach((rc, k) => rc.classList.toggle('wall', walls.has(k))); }
  function preset(name) {
    walls = new Set(); start = { c: 3, r: 6 }; goal = { c: COLS - 4, r: 5 };
    if (name === 'wall') { for (let r = 0; r < ROWS; r++) if (r !== 3 && r !== 4) walls.add(key(11, r)); }
    if (name === 'trap') { const c0 = 9; for (let c = c0; c <= c0 + 7; c++) { walls.add(key(c, 2)); walls.add(key(c, 9)); } for (let r = 2; r <= 9; r++) walls.add(key(c0 + 7, r)); start = { c: 12, r: 6 }; goal = { c: COLS - 3, r: 6 }; }
    if (name === 'maze') mazeGen();
    if (name === 'random') { const rg = C.rng((Math.random() * 1e6) | 0); for (let i = 0; i < COLS * ROWS * 0.27; i++) walls.add(key(rg.int(0, COLS - 1), rg.int(0, ROWS - 1))); }
    walls.delete(key(start.c, start.r)); walls.delete(key(goal.c, goal.r)); paintWalls(); placeMarks(); reset();
  }
  function mazeGen() {   // recursive backtracker on a coarse lattice
    const rg = C.rng((Math.random() * 1e6) | 0); const cw = Math.floor((COLS - 1) / 2), ch = Math.floor((ROWS - 1) / 2);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) walls.add(key(c, r));
    const seen = new Set(), stack = [[0, 0]]; seen.add(0); walls.delete(key(1, 1));
    while (stack.length) { const [x, y] = stack[stack.length - 1]; const nb = rg.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen.has(ny * cw + nx); });
      if (!nb.length) { stack.pop(); continue; } const [dx, dy] = nb[0], nx = x + dx, ny = y + dy; seen.add(ny * cw + nx); walls.delete(key(2 * nx + 1, 2 * ny + 1)); walls.delete(key(2 * x + 1 + dx, 2 * y + 1 + dy)); stack.push([nx, ny]); }
    for (let i = 0; i < 14; i++) { const c = rg.int(1, COLS - 2), r = rg.int(1, ROWS - 2); walls.delete(key(c, r)); }
    start = { c: 1, r: 1 }; goal = { c: 2 * cw - 1, r: 2 * ch - 1 };
  }
  function randomSG() { const rg = C.rng((Math.random() * 1e6) | 0); for (let t = 0; t < 200; t++) { const a = { c: rg.int(0, COLS - 1), r: rg.int(0, ROWS - 1) }, b = { c: rg.int(0, COLS - 1), r: rg.int(0, ROWS - 1) }; if (!walls.has(key(a.c, a.r)) && !walls.has(key(b.c, b.r)) && Math.abs(a.c - b.c) + Math.abs(a.r - b.r) > 12) { start = a; goal = b; break; } } placeMarks(); reset(); }

  /* ---------- running ---------- */
  function clearViz() {
    cells.forEach(rc => { rc.classList.remove('open', 'cur'); rc.style.fill = ''; rc.style.stroke = ''; });
    numG.textContent = ''; pathG.textContent = ''; dot.setAttribute('opacity', 0); verdict.hidden = true;
    sExp.textContent = '0'; sOpen.textContent = '0'; sCost.textContent = '–'; queueBox.textContent = '';
    order = 0; info = {};
  }
  function reset(soft) { stopRun(); gen = null; clearViz(); paintWalls(); wOut.textContent = S.w; sOpt.textContent = (() => { const o = optimalCost(); return o == null ? 'no path' : fmtN(o); })(); }
  const fmtN = x => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(2));
  const colorFor = t => { const a = [45, 212, 191], b = [99, 102, 241]; const c = a.map((v, i) => Math.round(v + (b[i] - v) * t)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
  function drawNums() {
    numG.textContent = ''; if (!S.costs) return;
    Object.values(info).forEach(n => { const [x, y] = xy(n.c, n.r); const t = el('text', { x: x - CS / 2 + 5, y: y - CS / 2 + 10, class: 'num' }, numG); t.textContent = 'g' + fmtN(n.g); const t2 = el('text', { x: x + CS / 2 - 5, y: y - CS / 2 + 10, 'text-anchor': 'end', class: 'num' }, numG); t2.textContent = 'h' + fmtN(n.h); const t3 = el('text', { x, y: y + 7, 'text-anchor': 'middle', class: 'numf' }, numG); t3.textContent = fmtN(n.f); });
  }
  let curCell = null, totalExp = 0, expOrderMax = 1;
  function step() {
    if (!gen) { clearViz(); gen = search(S.algo, S.heur, S.w, S.diag); totalExp = 0; }
    const t0 = performance.now(); const r = gen.next(); if (r.done) { stopRun(); return false; }
    const e = r.value;
    if (e.type === 'init') { const k = key(e.node.c, e.node.r); info[k] = e.node; cells[k].classList.add('open'); queueUI(e.open); sOpen.textContent = '1'; drawNums(); return true; }
    if (curCell != null) cells[curCell].classList.remove('cur');
    if (e.type === 'expand') {
      const k = key(e.node.c, e.node.r); curCell = k; const rc = cells[k]; rc.classList.remove('open'); rc.classList.add('cur'); order++; rc.style.fill = colorFor(Math.min(1, order / 260)); rc.style.stroke = '';
      e.pushed.forEach(n => { const kk = key(n.c, n.r); info[kk] = n; cells[kk].classList.add('open'); });
      info[k] = e.node; sExp.textContent = e.expanded; sOpen.textContent = e.open.size; queueUI(e.open); if (S.costs) drawNums(); totalExp = e.expanded; return true;
    }
    if (e.type === 'done') {
      stopRun(); curCell = null; const cost = e.node.g; sExp.textContent = e.expanded; sOpen.textContent = e.open.size; sCost.textContent = fmtN(cost);
      const pts = e.path.map(n => xy(n.c, n.r).join(',')).join(' ');
      const pl = el('polyline', { points: pts, class: 'pathline' }, pathG); el('polyline', { points: pts, class: 'pathcore' }, pathG);
      const len = pl.getTotalLength ? pl.getTotalLength() : 0; if (len) { pl.style.strokeDasharray = len; pl.style.strokeDashoffset = len; pl.style.transition = 'stroke-dashoffset .9s ease'; requestAnimationFrame(() => requestAnimationFrame(() => { pl.style.strokeDashoffset = 0; })); }
      travel(e.path);
      const opt = optimalCost(); const ratio = opt ? cost / opt : 1;
      verdict.hidden = false; verdict.className = ratio < 1.0005 ? 'good' : 'bad'; verdict.textContent = ratio < 1.0005 ? '✓ Optimal path (cost ' + fmtN(cost) + ')' : '✗ Not optimal: cost ' + fmtN(cost) + ' versus ' + fmtN(opt) + ' (+' + ((ratio - 1) * 100).toFixed(0) + '%)';
      results.unshift({ a: S.algo === 'astar' ? 'A* w=' + S.w + ' ' + S.heur : S.algo, e: e.expanded, c: cost, ok: ratio < 1.0005 }); results = results.slice(0, 6); resUI(); return false;
    }
    if (e.type === 'fail') { stopRun(); verdict.hidden = false; verdict.className = 'warn'; verdict.textContent = 'No path exists: the frontier is empty. Expanded ' + e.expanded + ' cells.'; return false; }
    return true;
  }
  function travel(path) { dot.setAttribute('opacity', 1); let i = 0; const seg = 90; const t0 = performance.now(); const pts = path.map(n => xy(n.c, n.r)); const f = now => { const u = (now - t0) / seg; const k = Math.min(pts.length - 1, Math.floor(u)); const fr = u - k; const a = pts[k], b = pts[Math.min(pts.length - 1, k + 1)]; dot.setAttribute('cx', a[0] + (b[0] - a[0]) * fr); dot.setAttribute('cy', a[1] + (b[1] - a[1]) * fr); if (k < pts.length - 1) requestAnimationFrame(f); else setTimeout(() => dot.setAttribute('opacity', 0), 600); }; requestAnimationFrame(f); }
  function queueUI(open) {
    const rows = open.sorted().slice(0, 7); queueBox.textContent = '';
    queueBox.append(h('div', { class: 'qrow qhead' }, h('span', {}, ''), h('span', {}, 'cell'), h('span', {}, 'g'), h('span', {}, 'f')));
    rows.forEach((n, i) => queueBox.append(h('div', { class: 'qrow' + (i === 0 ? ' top' : '') }, h('span', {}, i === 0 ? '▶' : ''), h('span', {}, '(' + n.c + ',' + n.r + ')'), h('span', {}, fmtN(n.g)), h('span', {}, fmtN(n.f)))));
    if (!rows.length) queueBox.append(h('div', { style: { color: 'var(--muted)', padding: '4px 8px' } }, 'empty'));
  }
  function resUI() { resBox.textContent = ''; if (!results.length) return; const t = h('table', { class: 'res' }, h('tr', {}, h('th', {}, 'Run'), h('th', {}, 'Expanded'), h('th', {}, 'Cost')), results.map(r => h('tr', {}, h('td', {}, r.a), h('td', {}, r.e), h('td', { style: { color: r.ok ? 'var(--ok)' : 'var(--bad)' } }, fmtN(r.c))))); resBox.append(t); }
  function stopRun() { running = false; clearTimeout(timer); bRun.textContent = '▶ Run'; }
  function toggleRun() { if (running) { stopRun(); return; } if (gen && gen.next && false) { } running = true; bRun.textContent = '❚❚ Pause'; loop(); }
  function loop() { if (!running) return; const more = step(); if (!more && !running) return; if (running) timer = setTimeout(loop, Math.max(8, 520 / (S.speed * S.speed * 0.55))); }
  /* the API the lecture can drive */
  preset('wall'); placeMarks(); reset();
  return { set(o) { Object.assign(S, o); algoSel.querySelector('select').value = S.algo; heurSel.querySelector('select').value = S.heur; reset(); }, preset, step: () => step(), run: () => { if (!running) toggleRun(); }, reset };
});

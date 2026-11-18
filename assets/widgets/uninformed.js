/* Uninformed search playground: grid maze, BFS / DFS / uniform cost search, walls and mud, live frontier, run table. */
Course.widget('uninformed', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  const COLS = opts.cols || 20, ROWS = opts.rows || 12, CS = 34, PAD = 10, W = COLS * CS + PAD * 2, H = ROWS * CS + PAD * 2, MUD = 5;
  if (!document.getElementById('uni-css')) {
    const st = document.createElement('style'); st.id = 'uni-css';
    st.textContent = `
    .uni .uc{fill:var(--c-grid);stroke:color-mix(in srgb,var(--c-soft) 35%,transparent);stroke-width:1;transition:fill .25s,stroke .25s;cursor:crosshair}
    .uni .uc.wall{fill:var(--c-wall);stroke:var(--c-wall)}
    .uni .uc.mud{fill:color-mix(in srgb,var(--c-c) 38%,var(--fig-bg));stroke:var(--c-c)}
    .uni .uc.fr{stroke:var(--c-b);stroke-width:2.6}
    .uni .uc.cur{stroke:var(--c-c);stroke-width:3.4;filter:url(#uni-glow)}
    .uni .ord{font:700 10px var(--mono);fill:var(--c-ink);pointer-events:none;opacity:.85}
    .uni .mudt{font:700 9px var(--mono);fill:var(--c-c);pointer-events:none;opacity:.9}
    .uni .pl{fill:none;stroke:#f59e0b;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;filter:url(#uni-glow)}
    .uni .plc{fill:none;stroke:#fff7d6;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
    .uni .fq{display:flex;flex-wrap:wrap;gap:4px;min-height:28px}
    .uni .fq span{font:12px var(--mono);padding:2px 6px;border-radius:6px;border:1px solid var(--line);background:var(--bg)}
    .uni .fq span.nx{background:var(--accent-bg);color:var(--accent);border-color:var(--accent);font-weight:700}
    .uni .qh{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
    .uni table.rt{border-collapse:collapse;width:100%;font-size:12.5px}
    .uni table.rt td,.uni table.rt th{padding:3px 5px;border-bottom:1px solid var(--line);text-align:right}
    .uni table.rt th:first-child,.uni table.rt td:first-child{text-align:left}
    .uni .ins{border-radius:8px;padding:7px 10px;font-size:13.5px;background:var(--accent2-bg);color:var(--fg)}
    .uni .ins.ok{background:var(--ok-bg)} .uni .ins.bad{background:var(--bad-bg)} .uni .ins.warn{background:var(--warn-bg)}`;
    document.head.append(st);
  }
  root.classList.add('uni');
  /* ---------- world ---------- */
  let cell = new Uint8Array(COLS * ROWS);          // 0 free, 1 wall, 2 mud
  let start = { c: 2, r: 6 }, goal = { c: COLS - 3, r: 6 };
  const S = { algo: 'bfs', tool: 'wall', speed: 6, nums: true };
  const key = (c, r) => r * COLS + c, cOf = k => k % COLS, rOf = k => (k / COLS) | 0;
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // up, right, down, left
  const nbrs = k => { const c = cOf(k), r = rOf(k), out = []; for (const [dc, dr] of DIRS) { const x = c + dc, y = r + dr; if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue; const kk = key(x, y); if (cell[kk] !== 1) out.push(kk); } return out; };
  const cost = k => cell[k] === 2 ? MUD : 1;
  const NAMES = { bfs: 'Breadth-first', dfs: 'Depth-first', ucs: 'Uniform cost' };
  /* ---------- the three searches (generators, one opened node per step; goal test when a node is opened) ---------- */
  function* search(algo) {
    const s = key(start.c, start.r), gk = key(goal.c, goal.r), par = new Map(), gv = new Map();
    let opened = 0, maxF = 1;
    const finish = n => { const path = []; for (let p = n; p !== -1 && p !== undefined; p = par.get(p)) path.push(p); path.reverse(); return { type: 'done', node: n, path, opened, maxF, steps: path.length - 1, cost: gv.get(n) }; };
    if (algo === 'bfs') {
      const q = [s]; let head = 0; const reached = new Set([s]); par.set(s, -1); gv.set(s, 0);
      yield { type: 'init', front: [s], size: 1 };
      while (head < q.length) {
        const n = q[head++]; opened++;
        if (n === gk) { yield finish(n); return; }
        for (const m of nbrs(n)) if (!reached.has(m)) { reached.add(m); par.set(m, n); gv.set(m, gv.get(n) + cost(m)); q.push(m); }
        maxF = Math.max(maxF, q.length - head);
        yield { type: 'open', node: n, front: q.slice(head), size: q.length - head, opened, maxF };
      }
    } else if (algo === 'dfs') {
      const st = [{ k: s, p: -1, g: 0 }], seen = new Set();
      yield { type: 'init', front: [s], size: 1 };
      while (st.length) {
        const e = st.pop(); if (seen.has(e.k)) continue;
        seen.add(e.k); par.set(e.k, e.p); gv.set(e.k, e.g); opened++;
        if (e.k === gk) { yield finish(e.k); return; }
        const ns = nbrs(e.k).filter(m => !seen.has(m));
        for (let i = ns.length - 1; i >= 0; i--) st.push({ k: ns[i], p: e.k, g: e.g + cost(ns[i]) });   // first neighbour ends on top
        maxF = Math.max(maxF, st.length);
        yield { type: 'open', node: e.k, front: st.slice().reverse().map(x => x.k), size: st.length, opened, maxF };
      }
    } else {
      const heap = [], less = (a, b) => a.g < b.g || (a.g === b.g && a.q < b.q);
      const push = x => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (less(heap[i], heap[p])) { [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } else break; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return top; };
      const best = new Map([[s, 0]]), closed = new Set(); let q = 0, openN = 1;
      push({ k: s, g: 0, p: -1, q: q++ });
      yield { type: 'init', front: [s], size: 1 };
      while (heap.length) {
        const e = pop(); if (closed.has(e.k) || e.g !== best.get(e.k)) continue;
        closed.add(e.k); par.set(e.k, e.p); gv.set(e.k, e.g); opened++; openN--;
        if (e.k === gk) { yield finish(e.k); return; }
        for (const m of nbrs(e.k)) { if (closed.has(m)) continue; const ng = e.g + cost(m); if (!best.has(m) || ng < best.get(m)) { if (!best.has(m)) openN++; best.set(m, ng); push({ k: m, g: ng, p: e.k, q: q++ }); } }
        maxF = Math.max(maxF, openN);
        const live = heap.filter(x => !closed.has(x.k) && x.g === best.get(x.k)).sort((a, b) => less(a, b) ? -1 : 1);
        yield { type: 'open', node: e.k, front: live.map(x => x.k), gs: live.map(x => x.g), size: openN, opened, maxF };
      }
    }
    yield { type: 'fail', opened, maxF };
  }
  const silent = algo => { let last = null; for (const e of search(algo)) last = e; return last; };
  /* ---------- SVG ---------- */
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.touchAction = 'none';
  svg.innerHTML = `<defs><filter id="uni-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="uni-s" cx="35%" cy="30%"><stop offset="0" stop-color="#86efac"/><stop offset="1" stop-color="#16a34a"/></radialGradient>
  <radialGradient id="uni-g" cx="35%" cy="30%"><stop offset="0" stop-color="#fca5a5"/><stop offset="1" stop-color="#dc2626"/></radialGradient></defs>`;
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); par && par.append(e); return e; };
  const gridG = el('g', {}, svg), txtG = el('g', {}, svg), pathG = el('g', {}, svg), markG = el('g', {}, svg);
  const rects = [], mudT = [];
  const xy = k => [PAD + cOf(k) * CS + CS / 2, PAD + rOf(k) * CS + CS / 2];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const k = key(c, r); rects[k] = el('rect', { x: PAD + c * CS + 1.5, y: PAD + r * CS + 1.5, width: CS - 3, height: CS - 3, rx: 7, class: 'uc' }, gridG); }
  const mark = (fill, stroke, t) => { const g = el('g', {}, markG); el('circle', { r: 12.5, fill, stroke, 'stroke-width': 1.5, filter: 'url(#uni-glow)' }, g); el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 0.5, style: 'font:800 13px var(--sans);fill:#fff;pointer-events:none' }, g).textContent = t; g.style.cursor = 'grab'; return g; };
  const mS = mark('url(#uni-s)', '#14532d', 'S'), mG = mark('url(#uni-g)', '#7f1d1d', 'G');
  const placeMarks = () => { let [x, y] = xy(key(start.c, start.r)); mS.setAttribute('transform', `translate(${x},${y})`); [x, y] = xy(key(goal.c, goal.r)); mG.setAttribute('transform', `translate(${x},${y})`); };
  function paintCells() { cell.forEach((v, k) => { rects[k].classList.toggle('wall', v === 1); rects[k].classList.toggle('mud', v === 2); }); }
  /* ---------- side panel and controls ---------- */
  const sOpen = h('b', {}, '0'), sFront = h('b', {}, '0'), sMax = h('b', {}, '0'), sSteps = h('b', {}, '–'), sCost = h('b', {}, '–');
  const stat = h('div', { class: 'stat' }, h('span', {}, 'Nodes opened'), sOpen, h('span', {}, 'Frontier now'), sFront, h('span', {}, 'Largest frontier'), sMax, h('span', {}, 'Path length (steps)'), sSteps, h('span', {}, 'Path cost'), sCost);
  const ins = h('div', { class: 'ins' }, 'Press Step or Run. Draw walls or mud first if you like.');
  const fqHead = h('div', { class: 'qh' }), fq = h('div', { class: 'fq' }), runs = h('div');
  const side = h('div', { class: 'widget-side' },
    h('div', { class: 'legend' }, h('span', {}, h('i', { style: { background: 'var(--fig-bg)', borderColor: 'var(--c-b)', borderWidth: '2px' } }), 'frontier'), h('span', {}, h('i', { style: { background: 'var(--c-a)' } }), 'opened'), h('span', {}, h('i', { style: { background: '#f59e0b' } }), 'path'), h('span', {}, h('i', { style: { background: 'var(--c-wall)' } }), 'wall'), h('span', {}, h('i', { style: { background: 'color-mix(in srgb,var(--c-c) 38%,var(--fig-bg))' } }), 'mud (cost ' + MUD + ')')),
    stat, ins, h('div', {}, fqHead, fq), h('div', {}, h('div', { class: 'qh' }, 'Runs so far'), runs));
  const sel = (label, list, val, fn) => { const s = h('select', {}, list.map(o => h('option', { value: o[0] }, o[1]))); s.value = val; s.onchange = () => fn(s.value); return h('label', {}, label + ' ', s); };
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  const algoSel = sel('Algorithm', [['bfs', 'Breadth-first (queue)'], ['dfs', 'Depth-first (stack)'], ['ucs', 'Uniform cost (priority queue)']], S.algo, v => { S.algo = v; reset(); });
  const toolSel = sel('Brush', [['wall', 'Wall'], ['mud', 'Mud (cost ' + MUD + ')'], ['erase', 'Eraser']], S.tool, v => { S.tool = v; });
  const preSel = sel('Map', [['wall', 'Wall with a gap'], ['field', 'Open field'], ['mud', 'Mud lake'], ['maze', 'Maze']], 'wall', v => preset(v));
  const spIn = h('input', { type: 'range', min: 1, max: 10, value: 6 }); spIn.oninput = () => { S.speed = +spIn.value; };
  const numChk = h('input', { type: 'checkbox', checked: true }); numChk.onchange = () => { S.nums = numChk.checked; txtG.style.display = S.nums ? '' : 'none'; };
  const bRun = btn('▶ Run', () => toggleRun(), 'btn primary small');
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Uninformed search playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'Draw with the mouse · drag S and G')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), side),
    h('div', { class: 'widget-ctl' }, algoSel, btn('Step', () => { stopRun(); step(); }), bRun, btn('Reset', () => reset()), btn('🏁 Race all three', () => race())),
    h('div', { class: 'widget-ctl' }, preSel, toolSel, h('label', {}, 'Speed ', spIn), h('label', {}, numChk, 'show opening order'), btn('Clear runs', () => { results = []; runsUI(); })));
  /* ---------- editing ---------- */
  let drag = null, painting = false;
  const cellAt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); const c = Math.floor((q.x - PAD) / CS), r = Math.floor((q.y - PAD) / CS); return (c < 0 || r < 0 || c >= COLS || r >= ROWS) ? null : { c, r }; };
  const same = (a, b) => a.c === b.c && a.r === b.r;
  function brush(p) { if (same(p, start) || same(p, goal)) return; const k = key(p.c, p.r), v = S.tool === 'wall' ? 1 : S.tool === 'mud' ? 2 : 0; if (cell[k] === v) return; cell[k] = v; paintCells(); reset(); }
  svg.addEventListener('pointerdown', e => { const p = cellAt(e); if (!p) return; svg.setPointerCapture(e.pointerId); if (same(p, start)) drag = 'S'; else if (same(p, goal)) drag = 'G'; else { painting = true; brush(p); } });
  svg.addEventListener('pointermove', e => { const p = cellAt(e); if (!p) return; if (drag && cell[key(p.c, p.r)] !== 1) { if (drag === 'S' && !same(p, goal)) start = p; if (drag === 'G' && !same(p, start)) goal = p; placeMarks(); reset(); } else if (painting) brush(p); });
  const up = () => { drag = null; painting = false; }; svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  function preset(name) {
    cell = new Uint8Array(COLS * ROWS); start = { c: 2, r: 6 }; goal = { c: COLS - 3, r: 6 };
    if (name === 'wall') for (let r = 0; r < ROWS; r++) if (r !== 1) cell[key(10, r)] = 1;
    if (name === 'mud') for (let c = 7; c <= 12; c++) for (let r = 2; r <= 9; r++) cell[key(c, r)] = 2;
    if (name === 'maze') maze();
    cell[key(start.c, start.r)] = 0; cell[key(goal.c, goal.r)] = 0; paintCells(); placeMarks(); reset();
  }
  function maze() {
    const rg = C.rng((Math.random() * 1e6) | 0), cw = Math.floor((COLS - 1) / 2), ch = Math.floor((ROWS - 1) / 2);
    cell.fill(1); const seen = new Set([0]), stk = [[0, 0]]; cell[key(1, 1)] = 0;
    while (stk.length) { const [x, y] = stk[stk.length - 1]; const nb = rg.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen.has(ny * cw + nx); });
      if (!nb.length) { stk.pop(); continue; } const [dx, dy] = nb[0], nx = x + dx, ny = y + dy; seen.add(ny * cw + nx); cell[key(2 * nx + 1, 2 * ny + 1)] = 0; cell[key(2 * x + 1 + dx, 2 * y + 1 + dy)] = 0; stk.push([nx, ny]); }
    for (let i = 0; i < 12; i++) cell[key(rg.int(1, COLS - 2), rg.int(1, ROWS - 2))] = 0;
    start = { c: 1, r: 1 }; goal = { c: 2 * cw - 1, r: 2 * ch - 1 };
  }
  /* ---------- running ---------- */
  let gen = null, running = false, timer = null, frontSet = new Set(), curK = -1, results = [];
  const colorFor = t => { const a = [45, 212, 191], b = [99, 102, 241], c = a.map((v, i) => Math.round(v + (b[i] - v) * t)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
  function clearViz() {
    rects.forEach(r => { r.classList.remove('fr', 'cur'); r.style.fill = ''; });
    txtG.textContent = ''; pathG.textContent = ''; frontSet = new Set(); curK = -1;
    sOpen.textContent = '0'; sFront.textContent = '0'; sMax.textContent = '0'; sSteps.textContent = '–'; sCost.textContent = '–';
    cell.forEach((v, k) => { if (v === 2) { const [x, y] = xy(k); el('text', { x: x + CS / 2 - 6, y: y + CS / 2 - 6, 'text-anchor': 'end', class: 'mudt' }, txtG).textContent = MUD; } });
    fqHead.textContent = { bfs: 'Queue · first in, first out', dfs: 'Stack · last in, first out (top first)', ucs: 'Priority queue · lowest cost so far first' }[S.algo];
    fq.textContent = ''; fq.append(h('span', { class: 'nx' }, 'S'));
  }
  function reset() { stopRun(); gen = null; clearViz(); ins.className = 'ins'; ins.textContent = NAMES[S.algo] + ' search is ready. Press Step to open one node at a time, or Run.'; }
  const lab = k => '(' + cOf(k) + ',' + rOf(k) + ')';
  function frontUI(e) {
    const ns = new Set(e.front);
    frontSet.forEach(k => { if (!ns.has(k)) rects[k].classList.remove('fr'); }); ns.forEach(k => rects[k].classList.add('fr')); frontSet = ns;
    fq.textContent = ''; e.front.slice(0, 9).forEach((k, i) => fq.append(h('span', { class: i === 0 ? 'nx' : '' }, (k === key(start.c, start.r) ? 'S' : k === key(goal.c, goal.r) ? 'G' : lab(k)) + (e.gs ? ' g' + e.gs[i] : ''))));
    if (e.front.length > 9) fq.append(h('span', {}, '+' + (e.front.length - 9) + ' more'));
    if (!e.front.length) fq.append(h('span', {}, 'empty'));
    sFront.textContent = e.size; if (e.maxF != null) sMax.textContent = e.maxF;
  }
  function step() {
    if (!gen) { clearViz(); gen = search(S.algo); }
    const r = gen.next(); if (r.done) { stopRun(); return false; }
    const e = r.value;
    if (curK >= 0) rects[curK].classList.remove('cur');
    if (e.type === 'init') { frontUI(e); return true; }
    if (e.type === 'open') {
      curK = e.node; const rc = rects[e.node]; rc.classList.add('cur'); rc.style.fill = colorFor(Math.min(1, e.opened / (COLS * ROWS * 0.8)));
      const [x, y] = xy(e.node); el('text', { x, y: y + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ord' }, txtG).textContent = e.opened;
      sOpen.textContent = e.opened; frontUI(e); return true;
    }
    stopRun();
    if (e.type === 'done') {
      curK = -1; const rc = rects[e.node]; rc.style.fill = colorFor(Math.min(1, e.opened / (COLS * ROWS * 0.8)));
      const [x, y] = xy(e.node); el('text', { x, y: y + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ord' }, txtG).textContent = e.opened;
      sOpen.textContent = e.opened; sMax.textContent = e.maxF; sSteps.textContent = e.steps; sCost.textContent = e.cost;
      const pts = e.path.map(k => xy(k).join(',')).join(' '); const pl = el('polyline', { points: pts, class: 'pl' }, pathG); el('polyline', { points: pts, class: 'plc' }, pathG);
      const len = pl.getTotalLength ? pl.getTotalLength() : 0; if (len) { pl.style.strokeDasharray = len; pl.style.strokeDashoffset = len; pl.style.transition = 'stroke-dashoffset .9s ease'; requestAnimationFrame(() => requestAnimationFrame(() => { pl.style.strokeDashoffset = 0; })); }
      addRun(S.algo, e); insight(S.algo, e);
    } else { ins.className = 'ins warn'; ins.textContent = 'No path: the frontier became empty after opening ' + e.opened + ' nodes. The goal cannot be reached.'; }
    return false;
  }
  function addRun(algo, e) { results.unshift({ a: NAMES[algo], o: e.opened, m: e.maxF, s: e.steps, c: e.cost }); results = results.slice(0, 6); runsUI(); }
  function runsUI() { runs.textContent = ''; if (!results.length) return; runs.append(h('table', { class: 'rt' }, h('tr', {}, ['Search', 'Opened', 'Max frontier', 'Steps', 'Cost'].map(t => h('th', {}, t))), results.map(r => h('tr', {}, h('td', {}, r.a), h('td', {}, r.o), h('td', {}, r.m), h('td', {}, r.s), h('td', {}, r.c))))); }
  function insight(algo, e) {
    const b = silent('bfs'), u = silent('ucs'), fewest = b.steps, cheapest = u.cost;
    let t, cls = 'ok';
    if (algo === 'bfs') { t = `Breadth-first opened the map ring by ring and found a path with the fewest steps (${e.steps}).`; if (e.cost > cheapest) { t += ` But mud costs more: this path costs ${e.cost}, while the cheapest costs ${cheapest}. Fewest steps is not always cheapest.`; cls = 'warn'; } }
    else if (algo === 'dfs') { t = `Depth-first dived along one direction and found a path of ${e.steps} steps (the shortest has ${fewest}). ` + (e.steps > fewest ? 'It is not optimal, ' : 'This time it was lucky, ') + `and its largest frontier was ${e.maxF} (breadth-first: ${b.maxF}).`; cls = e.steps > fewest ? 'bad' : 'ok'; }
    else { t = `Uniform cost always opens the cheapest node first, so its path is the cheapest possible: cost ${e.cost}, in ${e.steps} steps.` + (e.steps > fewest ? ' It takes more steps to go around the mud.' : ''); }
    ins.className = 'ins ' + cls; ins.textContent = t;
  }
  function race() {
    stopRun(); const out = {}; ['bfs', 'dfs', 'ucs'].forEach(a => { const e = silent(a); out[a] = e; if (e.type === 'done') addRun(a, e); });
    if (out.bfs.type !== 'done') { ins.className = 'ins warn'; ins.textContent = 'No path exists between S and G.'; return; }
    const o = ['bfs', 'dfs', 'ucs'].map(a => `${NAMES[a]} opened ${out[a].opened}`).join(', ');
    ins.className = 'ins'; ins.textContent = `${o}. Fewest steps: ${out.bfs.steps} (breadth-first). Cheapest cost: ${out.ucs.cost} (uniform cost). Depth-first: ${out.dfs.steps} steps, cost ${out.dfs.cost}. Compare the Max frontier column to see how much memory each one needed.`;
  }
  function stopRun() { running = false; clearTimeout(timer); bRun.textContent = '▶ Run'; }
  function toggleRun() { if (running) { stopRun(); return; } running = true; bRun.textContent = '❚❚ Pause'; loop(); }
  function loop() { if (!running) return; const more = step(); if (!more) { stopRun(); return; } timer = setTimeout(loop, Math.max(8, 520 / (S.speed * S.speed * 0.55))); }
  preset('wall');
  return { preset, reset, step: () => step(), silent, set(o) { Object.assign(S, o); algoSel.querySelector('select').value = S.algo; reset(); } };
});

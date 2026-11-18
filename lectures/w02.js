(function () {
const K = Course.kit;
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };

/* ================= scene 1: formulating a problem ================= */
/* campus map; costs in minutes. Cheapest D-L-H-B = 4+3+2 = 9; D-C-H-B = 3+6+2 = 11; D-C-B = 3+9 = 12 */
const CAMPUS = { D: { x: 90, y: 200 }, L: { x: 260, y: 100 }, C: { x: 260, y: 300 }, H: { x: 440, y: 200 }, B: { x: 620, y: 200 } };
const CAMPUS_NAMES = { D: 'dorm', L: 'library', C: 'cafe', H: 'hall', B: 'lab' };
const CAMPUS_E = [['D', 'L', 4], ['D', 'C', 3], ['L', 'H', 3], ['C', 'H', 6], ['C', 'B', 9, { curve: 30 }], ['H', 'B', 2]];
const sceneFormulate = {
  id: 'formulate', title: 'Five parts of a search problem', w: 720, h: 400,
  build(F) {
    K.title(F, 'A delivery robot on campus', 'numbers = minutes to drive');
    F.s.G = K.graph(F, { nodes: CAMPUS, edges: CAMPUS_E });
    for (const [n, p] of Object.entries(CAMPUS)) F.text(p.x, p.y + 38, CAMPUS_NAMES[n], { size: 12, cls: 'soft', weight: 600 });
    const bot = F.g({ transform: `translate(${CAMPUS.D.x},${CAMPUS.D.y - 44})` }); bot.__t = { x: CAMPUS.D.x, y: CAMPUS.D.y - 44, s: 1, r: 0 };
    F.rect(-14, -10, 28, 20, { rx: 6, fill: 'var(--c-b)' }, bot); F.circle(-5, -2, 2.6, { fill: 'var(--fig-bg)' }, bot); F.circle(5, -2, 2.6, { fill: 'var(--fig-bg)' }, bot); F.line(0, -10, 0, -17, { stroke: 'var(--c-b)', 'stroke-width': 2 }, bot); F.circle(0, -18, 3, { fill: 'var(--c-c)' }, bot);
    bot.style.opacity = 0; F.s.bot = bot;
    F.s.cs = [
      ['1. STATE: where the robot is. Start state = dorm', 'accent'], ['2. ACTIONS: the roads you can take from here', 'accent'],
      ['3. TRANSITION: take the cafe road → you are at the cafe', 'accent'], ['4. GOAL TEST: are we at the lab?', 'bad'],
      ['5. PATH COST: dorm → library → hall → lab = 4 + 3 + 2 = 9', 'ok']
    ].map(([t, tone]) => K.callout(F, 360, 372, t, { tone, w: 470 }));
  },
  steps: [
    { title: 'State and start', say: ['A search problem has five parts. The first is the state: a description of the situation, here simply where the robot is.', 'The robot starts in the dorm. This is the initial state.'],
      cues: [seq(F => F.show(F.s.cs[0]), F => F.show(F.s.bot)), seq(F => F.s.G.state('D', 'start'), F => F.s.G.ring('D'))] },
    { title: 'Actions', say: ['Second, the actions: what the robot can do in a state.', 'From the dorm it can drive to the library or to the cafe.'],
      cues: [seq(F => F.hide(F.s.cs[0], 200), F => F.show(F.s.cs[1])), seq(F => Promise.all([F.s.G.edgeState('D', 'L', 'hot'), F.s.G.edgeState('D', 'C', 'hot')]))] },
    { title: 'Transition model', say: ['Third, the transition model says what each action does.', 'Driving the cafe road in the dorm state gives the cafe state.'],
      cues: [seq(F => F.hide(F.s.cs[1], 200), F => F.show(F.s.cs[2]), F => F.s.G.edgeState('D', 'L', 'idle')),
             seq(F => F.to(F.s.bot, { tx: CAMPUS.C.x, ty: CAMPUS.C.y - 44 }, 1000), F => F.s.G.state('C', 'current'))] },
    { title: 'Goal test', say: ['Fourth, the goal test tells us when we are done.', 'The parcel must reach the lab, so the goal test asks: is the robot at the lab?'],
      cues: [seq(F => F.hide(F.s.cs[2], 200), F => F.show(F.s.cs[3]), F => F.s.G.edgeState('D', 'C', 'idle'), F => F.s.G.state('C', 'idle'), F => F.to(F.s.bot, { tx: CAMPUS.D.x, ty: CAMPUS.D.y - 44 }, 600)),
             seq(F => F.s.G.state('B', 'goal'), F => F.s.G.ring('B'), F => F.pulse(F.s.G.nodes.B.g, 2))] },
    { title: 'Path cost and solution', say: ['Fifth, the path cost adds up the step costs. Dorm, library, hall, lab costs four plus three plus two, which is nine.', 'A solution is a sequence of actions that reaches the goal. The cheapest one is called optimal.'],
      cues: [seq(F => F.hide(F.s.cs[3], 200), F => F.show(F.s.cs[4]), F => F.s.G.edgeState('D', 'L', 'path'), F => F.s.G.edgeState('L', 'H', 'path'), F => F.s.G.edgeState('H', 'B', 'path')),
             seq(F => F.to(F.s.bot, { tx: CAMPUS.L.x, ty: CAMPUS.L.y - 44 }, 500), F => F.to(F.s.bot, { tx: CAMPUS.H.x, ty: CAMPUS.H.y - 44 }, 500), F => F.to(F.s.bot, { tx: CAMPUS.B.x, ty: CAMPUS.B.y - 44 }, 500), F => F.s.G.state('B', 'path'))] }
  ]
};

/* ================= scene 2: BFS and DFS side by side ================= */
const TREE = { A: ['B', 'C'], B: ['D', 'E'], C: ['F', 'G'], D: ['H', 'I'], E: ['J', 'K'], F: ['L', 'M'], G: ['N', 'O'] }, TGOAL = 'F';
/* traces computed here (goal test when a node is opened). snapshot k = after k nodes opened */
function trace(kind) {
  let fr = ['A']; const out = [{ opened: [], front: fr.slice() }], opened = [];
  while (fr.length) {
    const n = fr.shift(); opened.push(n);
    if (n !== TGOAL) { const ch = TREE[n] || []; fr = kind === 'bfs' ? fr.concat(ch) : ch.concat(fr); }
    out.push({ opened: opened.slice(), front: fr.slice() });
    if (n === TGOAL) break;
  }
  return out;
}
const TR = { bfs: trace('bfs'), dfs: trace('dfs') };   // bfs: A B C D E F (6), dfs: A B D H I E J K C F (10); largest frontier 6 vs 4
function treeLayout(x0) {
  const pos = {}, leaves = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
  leaves.forEach((n, i) => { pos[n] = { x: x0 + 28 + i * 50, y: 330 }; });
  for (const [lv, ys] of [[['D', 'E', 'F', 'G'], 255], [['B', 'C'], 180], [['A'], 105]]) lv.forEach(n => { const c = TREE[n]; pos[n] = { x: (pos[c[0]].x + pos[c[1]].x) / 2, y: ys }; });
  const nodes = {}; for (const n in pos) nodes[n] = { x: pos[n].x, y: pos[n].y, label: n };
  const edges = []; for (const p in TREE) TREE[p].forEach(c => edges.push([p, c, null]));
  return { nodes, edges, r: 17 };
}
function strip(F, x, y, w, title) {
  const g = F.g({ transform: `translate(${x},${y})` });
  F.rect(0, 0, w, 54, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)', filter: 'url(#fx-soft)' }, g);
  F.text(12, 14, title, { size: 11.5, weight: 700, cls: 'soft', anchor: 'start' }, g);
  const row = F.g({}, g), S = { g, row, prev: [] };
  S.set = list => {
    row.textContent = '';
    list.forEach((n, i) => { const b = F.box(28 + i * 40, 36, 32, 26, n, { size: 13, weight: 750, mono: true, fill: i === 0 ? 'var(--c-open)' : 'var(--fig-bg)', stroke: i === 0 ? 'var(--c-b)' : 'var(--line)', shadow: false }, row); if (!S.prev.includes(n)) { b.style.opacity = 0; F.show(b, 350); } });
    S.prev = list.slice();
  };
  return S;
}
function snap(F, side, k) {
  const s = TR[side][Math.min(k, TR[side].length - 1)], T = F.s[side], last = s.opened[s.opened.length - 1];
  for (const n in T.G.nodes) {
    let st = 'idle';
    if (s.opened.includes(n)) st = n === TGOAL ? 'path' : n === last ? 'current' : 'closed';
    else if (s.front.includes(n)) st = 'open';
    else if (n === TGOAL) st = 'goal';
    T.G.state(n, st, 350);
    T.G.ring(n, n === last, 200);
  }
  s.opened.forEach((n, i) => F.show(T.ord[n], 250)); Object.keys(T.ord).forEach(n => { if (!s.opened.includes(n)) F.set(T.ord[n], { opacity: 0 }); });
  T.Q.set(s.front);
  F.setText(T.cnt, 'opened: ' + s.opened.length + (last === TGOAL ? '  ✓ goal found' : ''), null, 14);
  return F.wait(F.instant ? 0 : 420);
}
const sceneBFSDFS = {
  id: 'bfsdfs', title: 'Breadth first versus depth first', w: 900, h: 470, wide: true,
  build(F) {
    K.title(F, 'Same tree, two strategies', 'goal = F · both open children from left to right · numbers = opening order');
    [['bfs', 0, 'BREADTH-FIRST · queue (first in, first out)'], ['dfs', 450, 'DEPTH-FIRST · stack (last in, first out)']].forEach(([side, x0, title]) => {
      const L = treeLayout(x0), T = { G: K.graph(F, L), ord: {} };
      F.text(x0 + 225, 72, side === 'bfs' ? 'Breadth-first search' : 'Depth-first search', { size: 15, weight: 800, fill: side === 'bfs' ? 'var(--c-b)' : 'var(--c-c)' });
      for (const n in L.nodes) { T.ord[n] = K.chip(F, L.nodes[n].x + 19, L.nodes[n].y - 19, '', 'warn'); T.ord[n].style.opacity = 0; }
      T.Q = strip(F, x0 + 10, 370, 430, title);
      T.cnt = F.text(x0 + 430, 92, 'opened: 0', { size: 12.5, weight: 700, cls: 'mono', anchor: 'end' });
      F.s[side] = T;
    });
    for (const side of ['bfs', 'dfs']) TR[side].slice(1).forEach((s, i) => { const n = s.opened[i], c = F.s[side].ord[n]; F.setText(c.querySelector('text'), String(i + 1), 0, 14); });
    F.s.sum = K.callout(F, 450, 448, 'BFS: shallowest goal, but a wide frontier (up to 6).   DFS: deep dive, small frontier (up to 4).', { tone: 'ok', w: 640 });
    F.line(450, 64, 450, 362, { stroke: 'var(--line)', 'stroke-dasharray': '4 5' });
  },
  steps: [
    { title: 'Two strategies', say: ['Here is the same search tree twice. We are looking for the goal, node F.', 'Breadth first search keeps its frontier in a queue: first in, first out. Depth first search uses a stack: last in, first out.'],
      cues: [seq(F => Promise.all([snap(F, 'bfs', 0), snap(F, 'dfs', 0)]), F => F.pulse(F.s.bfs.G.nodes.F.g, 2)), seq(F => F.pulse(F.s.bfs.Q.g, 1), F => F.pulse(F.s.dfs.Q.g, 1))] },
    { title: 'Open the root', say: ['Both searches open the root A first.', 'Its children B and C enter the frontier. So far the two look the same.'],
      cues: [F => Promise.all([snap(F, 'bfs', 1), snap(F, 'dfs', 1)]), F => F.pulse(F.s.dfs.G.nodes.B.g, 1)] },
    { title: 'They split', say: ['Breadth first opens B and then C, the oldest nodes in the queue.', 'Depth first opens B and then D, always the newest node, so it dives down.'],
      cues: [seq(F => snap(F, 'bfs', 2), F => snap(F, 'bfs', 3)), seq(F => snap(F, 'dfs', 2), F => snap(F, 'dfs', 3))] },
    { title: 'Level by level, or down to the bottom', say: ['Breadth first finishes level two with D and E.', 'Depth first reaches the bottom. H and I have no children, so it backs up.'],
      cues: [seq(F => snap(F, 'bfs', 4), F => snap(F, 'bfs', 5)), seq(F => snap(F, 'dfs', 4), F => snap(F, 'dfs', 5))] },
    { title: 'Breadth first finds F', say: ['Breadth first takes F out of the queue. It is the goal, found after six nodes.', 'Depth first is still busy on the left side, opening E, J and K.'],
      cues: [F => snap(F, 'bfs', 6), seq(F => snap(F, 'dfs', 6), F => snap(F, 'dfs', 7), F => snap(F, 'dfs', 8))] },
    { title: 'Depth first finds F', say: ['Depth first finally backs up to C and finds F after ten nodes.', 'Breadth first finds the shallowest goal, but its frontier grew to six nodes. Depth first never held more than four: it saves memory.'],
      cues: [seq(F => snap(F, 'dfs', 9), F => snap(F, 'dfs', 10)), seq(F => F.show(F.s.sum), F => F.pulse(F.s.sum, 1))] }
  ]
};

/* ================= scene 3: uniform cost search ================= */
/* verified with code: pop S0 -> A1,B6 ; pop A1 -> B3 (updated), C10 ; pop B3 -> D6 ; pop D6 -> G8 ; pop G8 stop. BFS path S-A-C-G costs 11. */
const UN = { S: { x: 70, y: 215 }, A: { x: 220, y: 100 }, B: { x: 220, y: 330 }, C: { x: 400, y: 100 }, D: { x: 400, y: 330 }, G: { x: 560, y: 215 } };
const UE = [['S', 'A', 1, { dir: true }], ['S', 'B', 6, { dir: true }], ['A', 'B', 2, { dir: true }], ['A', 'C', 9, { dir: true }], ['B', 'D', 3, { dir: true }], ['C', 'G', 1, { dir: true }], ['D', 'G', 2, { dir: true }]];
const QR = list => list.map(([n, g]) => ({ id: n, cols: [n, String(g)] }));
const sceneUCS = {
  id: 'ucs', title: 'Uniform cost search', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'Cheapest first', 'numbers on arrows = step cost · g = cost of the path so far');
    F.s.G = K.graph(F, { nodes: UN, edges: UE }); F.s.G.state('S', 'start', 0); F.s.G.state('G', 'goal', 0);
    F.s.Q = K.queue(F, 625, 30, 250, 'PRIORITY QUEUE · smallest g first', { maxRows: 5, cols: ['node', 'g'], colX: [70, 175], rh: 34 });
    F.s.bfs = K.callout(F, 330, 395, 'Fewest steps: S, A, C, G costs 1 + 9 + 1 = 11', { tone: 'bad', w: 380 });
    F.s.done = K.callout(F, 330, 395, 'Uniform cost: S, A, B, D, G costs 1 + 2 + 3 + 2 = 8', { tone: 'ok', w: 400 });
  },
  steps: [
    { title: 'Cheapest, not shortest', say: ['Now every road has a cost. Uniform cost search finds the cheapest path, not the one with the fewest steps.', 'Its frontier is a priority queue. The node with the smallest path cost so far, called g, comes out first.'],
      cues: [seq(F => F.s.G.edgeState('A', 'C', 'hot'), F => F.s.G.edgeState('C', 'G', 'hot'), F => F.show(F.s.bfs)), seq(F => F.s.G.edgeState('A', 'C', 'idle'), F => F.s.G.edgeState('C', 'G', 'idle'), F => F.s.Q.set(QR([['S', 0]])), F => F.s.G.state('S', 'open'))] },
    { title: 'Open S', say: ['We open S, with cost zero.', 'A enters the frontier with cost one, and B with cost six.'],
      cues: [seq(F => F.hide(F.s.bfs), F => F.s.G.state('S', 'closed'), F => F.s.Q.set([])),
             seq(F => { F.s.G.flow('S', 'A'); F.s.G.flow('S', 'B'); return F.wait(600); }, F => Promise.all([F.s.G.state('A', 'open'), F.s.G.state('B', 'open'), F.s.Q.set(QR([['A', 1], ['B', 6]]))]))] },
    { title: 'Open A', say: ['A is the cheapest, so we open it.', 'Through A, B costs one plus two, which is three. That beats six, so B is updated. C enters with ten.'],
      cues: [seq(F => F.s.G.state('A', 'current'), F => F.s.G.ring('A')),
             seq(F => { F.s.G.flow('A', 'B'); F.s.G.flow('A', 'C'); return F.wait(600); }, F => Promise.all([F.s.G.state('C', 'open'), F.s.G.state('A', 'closed'), F.s.G.ring('A', false), F.s.Q.set(QR([['B', 3], ['C', 10]]))]))] },
    { title: 'Open B, then D', say: ['Next is B with three. D enters with three plus three, six.', 'D is now the cheapest. Opening D puts the goal G into the frontier with cost eight.'],
      cues: [seq(F => F.s.G.state('B', 'current'), F => { F.s.G.flow('B', 'D'); return F.wait(600); }, F => Promise.all([F.s.G.state('D', 'open'), F.s.G.state('B', 'closed'), F.s.Q.set(QR([['D', 6], ['C', 10]]))])),
             seq(F => F.s.G.state('D', 'current'), F => { F.s.G.flow('D', 'G'); return F.wait(600); }, F => Promise.all([F.s.G.state('D', 'closed'), F.s.Q.set(QR([['G', 8], ['C', 10]]))]))] },
    { title: 'Stop when the goal comes out', say: ['G with eight is cheaper than C with ten, so G comes out next, and we stop.', 'The path S, A, B, D, G costs eight. It has more steps than S, A, C, G, but it is cheaper by three.'],
      cues: [seq(F => F.s.G.state('G', 'current'), F => F.s.G.ring('G'), F => F.s.Q.set(QR([['C', 10]]))),
             seq(F => Promise.all([['S', 'A'], ['A', 'B'], ['B', 'D'], ['D', 'G']].map(([a, b]) => F.s.G.edgeState(a, b, 'path')).concat(['S', 'A', 'B', 'D', 'G'].map(n => F.s.G.state(n, 'path')))), F => F.show(F.s.done))] }
  ]
};

/* ================= scene 4: exponential growth and memory ================= */
function dotTree(F) {   // b = 3, depth 3: ids like '', '0', '01', '012'
  const pos = {}, Y = [100, 170, 240, 310];
  const leaves = []; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) leaves.push('' + a + b + c);
  leaves.forEach((id, i) => { pos[id] = { x: 40 + i * 14 + Math.floor(i / 3) * 3 + Math.floor(i / 9) * 6, y: Y[3] }; });
  for (let d = 2; d >= 0; d--) { const ids = d === 0 ? [''] : Object.keys(pos).filter(k => k.length === d + 1).map(k => k.slice(0, d)).filter((v, i, a) => a.indexOf(v) === i); ids.forEach(id => { const ch = [0, 1, 2].map(j => pos[id + j]); pos[id] = { x: (ch[0].x + ch[2].x) / 2, y: Y[d] }; }); }
  const lv = [F.g({}), F.g({}), F.g({}), F.g({})], dots = {};
  for (const id in pos) { const d = id.length; if (d) F.line(pos[id.slice(0, -1)].x, pos[id.slice(0, -1)].y, pos[id].x, pos[id].y, { stroke: 'var(--c-node-line)', 'stroke-width': 1.2, opacity: .7 }, lv[d]); }
  for (const id in pos) dots[id] = F.circle(pos[id].x, pos[id].y, [11, 8, 6, 5][id.length], { fill: 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 1.5 }, lv[id.length]);
  lv.forEach(g => { g.style.opacity = 0; });
  return { lv, dots, Y };
}
const DFS_PATH = ['', '0', '00'], DFS_FRONT = ['1', '2', '01', '02', '000', '001', '002'];   // stack after opening '', '0', '00': 2 + 2 + 3 = 7
const sceneGrowth = {
  id: 'growth', title: 'Why search gets expensive', w: 720, h: 400,
  build(F) {
    K.title(F, 'Branching factor b = 3', 'every node has three children');
    F.s.T = dotTree(F);
    F.s.cnt = [1, 3, 9, 27].map((n, d) => { const t = F.text(445, F.s.T.Y[d], (d === 0 ? 'depth 0: ' : 'depth ' + d + ': ') + n, { size: 13.5, weight: 700, cls: 'mono', anchor: 'start' }); t.style.opacity = 0; return t; });
    F.s.big = K.callout(F, 230, 365, 'b = 10, depth 10: ten billion nodes on the last level', { tone: 'bad', w: 400 });
    F.s.tot = K.callout(F, 500, 360, 'total = 1 + 3 + 9 + 27 = 40', { tone: 'warn', w: 230 });
    F.s.barsG = F.g({}); F.s.barsG.style.opacity = 0;
    F.text(625, 95, 'largest frontier', { size: 12.5, weight: 700, cls: 'soft' }, F.s.barsG);
    F.s.bars = K.bars(F, 555, 120, 140, 180, [{ v: 0, label: 'BFS', color: 'var(--c-b)' }, { v: 0, label: 'DFS', color: 'var(--c-c)' }], { max: 27 });
    F.s.barsG.append(F.s.bars.g);
  },
  steps: [
    { title: 'Branching factor', say: ['The branching factor, called b, is the number of children of each node. Here b is three.', 'Depth one has three nodes. Depth two has three times three, which is nine.'],
      cues: [seq(F => F.show(F.s.T.lv[0]), F => F.show(F.s.cnt[0]), F => F.show(F.s.T.lv[1]), F => F.show(F.s.cnt[1])), seq(F => F.show(F.s.T.lv[2]), F => F.show(F.s.cnt[2]))] },
    { title: 'Exponential growth', say: ['Depth three already has twenty seven nodes, and the whole tree has forty.', 'With ten children per node, depth ten alone has ten billion nodes. This is exponential growth.'],
      cues: [seq(F => F.show(F.s.T.lv[3]), F => F.show(F.s.cnt[3]), F => F.show(F.s.tot)), seq(F => F.hide(F.s.tot), F => F.show(F.s.big), F => F.pulse(F.s.big, 1))] },
    { title: 'Memory of breadth first', say: ['Breadth first search keeps a whole level in memory. Before it opens depth three, all twenty seven nodes wait in its queue.', 'Its memory grows exponentially, like the tree.'],
      cues: [seq(F => F.hide(F.s.big), F => Promise.all(Object.keys(F.s.T.dots).map(id => F.to(F.s.T.dots[id], { fill: id.length === 3 ? 'var(--c-open)' : id.length < 3 ? 'var(--c-closed)' : 'var(--c-node)', stroke: id.length === 3 ? 'var(--c-b)' : 'var(--c-node-line)' }, 500)))),
             seq(F => F.show(F.s.barsG), F => { F.s.bars.set(0, 27); return F.wait(600); })] },
    { title: 'Memory of depth first', say: ['Depth first search keeps only the current path, plus the siblings of the nodes on it, the other children of the same parent.', 'Here that is at most seven nodes. Its memory grows only in a straight line with the depth.'],
      cues: [seq(F => Promise.all(Object.keys(F.s.T.dots).map(id => F.to(F.s.T.dots[id], { fill: DFS_PATH.includes(id) ? 'var(--c-closed)' : DFS_FRONT.includes(id) ? 'var(--c-cur)' : 'var(--c-node)', stroke: DFS_FRONT.includes(id) ? 'var(--c-c)' : 'var(--c-node-line)' }, 500)))),
             seq(F => { F.s.bars.set(1, 7); return F.wait(600); })] }
  ]
};

/* ================= exercises ================= */
const LETTERS = 'ABCDEFGHJKLMNPRTUVWXYZ'.split('');
function genTree(r) {
  for (;;) {
    const ch = {}, depth = { S: 0 }, all = ['S']; let pool = r.shuffle(LETTERS), q = ['S'];
    while (q.length) { const n = q.shift(), d = depth[n]; if (d === 3) continue; const k = d === 0 ? r.int(2, 3) : d === 1 ? r.int(1, 3) : r.int(0, 2); ch[n] = []; for (let i = 0; i < k; i++) { const m = pool.pop(); ch[n].push(m); depth[m] = d + 1; all.push(m); q.push(m); } }
    const leaves = all.filter(n => !(ch[n] && ch[n].length));
    if (leaves.length >= 4 && leaves.length <= 8 && all.length <= 15 && all.some(n => depth[n] === 3)) return { ch, depth, all, leaves };
  }
}
function layoutTree(t, W) {
  const pos = {}, order = []; (function walk(n) { if (!(t.ch[n] && t.ch[n].length)) order.push(n); else t.ch[n].forEach(walk); })('S');
  const sp = (W - 60) / Math.max(1, order.length - 1); order.forEach((n, i) => { pos[n] = { x: 30 + i * sp, y: 40 + t.depth[n] * 72 }; });
  (function place(n) { if (pos[n]) return pos[n]; const ps = t.ch[n].map(place); pos[n] = { x: (ps[0].x + ps[ps.length - 1].x) / 2, y: 40 + t.depth[n] * 72 }; return pos[n]; })('S');
  return pos;
}
function runOrder(t, goal, kind) {
  let fr = ['S']; const out = [];
  while (fr.length) { const n = fr.shift(); out.push(n); if (n === goal) break; const c = t.ch[n] || []; fr = kind === 'bfs' ? fr.concat(c) : c.concat(fr); }
  return out;
}
const exOrder = {
  title: 'In which order are the nodes opened?', random: true,
  gen(r) {
    const t = genTree(r), cand = t.all.filter(n => t.depth[n] >= 2), goal = r.pick(cand), kind = r.pick(['bfs', 'dfs']);
    const ord = runOrder(t, goal, kind), name = kind === 'bfs' ? 'breadth-first search (queue)' : 'depth-first search (stack)';
    return {
      prompt: `Run <b>${name}</b> on this tree from S. The goal is <b>${goal}</b>. Children are added from left to right, and the goal test happens when a node is opened. Type the nodes in the order they are opened, up to and including the goal, with no spaces or commas (for example <code>SAB…</code>).`,
      hint: kind === 'bfs' ? 'Breadth first opens the tree level by level, left to right.' : 'Depth first always goes down the leftmost unopened branch, and backs up only at a leaf.',
      answer: `Opening order: <b>${ord.join(' ')}</b> (${ord.length} nodes). ` + (kind === 'bfs' ? 'Level by level, left to right.' : 'Down the leftmost branch first, back up at each leaf.') + ` For comparison, the other search opens ${runOrder(t, goal, kind === 'bfs' ? 'dfs' : 'bfs').length} nodes.`,
      check: { type: 'text', answer: ord.join('') },
      figure: { w: 560, h: 290, draw(F) { const pos = layoutTree(t, 560), nodes = {}, edges = []; for (const n of t.all) nodes[n] = { x: pos[n].x, y: pos[n].y }; for (const p in t.ch) t.ch[p].forEach(c => edges.push([p, c, null])); const G = K.graph(F, { nodes, edges, r: 17 }); G.state('S', 'start', 0); G.state(goal, 'goal', 0); } }
    };
  }
};
const UPOS = { S: { x: 50, y: 150 }, A: { x: 180, y: 60 }, B: { x: 180, y: 240 }, C: { x: 330, y: 60 }, D: { x: 330, y: 240 }, G: { x: 470, y: 150 } };
function ucs(edges) {
  const adj = {}; edges.forEach(([a, b, c]) => (adj[a] = adj[a] || []).push([b, c]));
  const best = { S: 0 }, closed = new Set(), log = []; let fr = [['S', 0]];
  while (fr.length) {
    fr.sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1)); const [n, g] = fr.shift(); if (closed.has(n)) continue; closed.add(n);
    log.push(`open ${n} (g = ${g})`); if (n === 'G') return { cost: g, log };
    for (const [m, c] of adj[n] || []) { if (closed.has(m)) continue; const ng = g + c; if (best[m] === undefined || ng < best[m]) { best[m] = ng; fr = fr.filter(f => f[0] !== m); fr.push([m, ng]); } }
    log[log.length - 1] += ' → frontier: ' + fr.slice().sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1)).map(f => f[0] + ' ' + f[1]).join(', ');
  }
  return { cost: null, log };
}
const exUCS = {
  title: 'Trace uniform cost search', random: true,
  gen(r) {
    const w = () => r.int(1, 9), E = [['S', 'A', w()], ['S', 'B', w()], ['A', 'C', w()], ['B', 'D', w()], ['C', 'G', w()], ['D', 'G', w()]];
    if (r.chance(.6)) E.push(['A', 'B', w()]); if (r.chance(.6)) E.push(['C', 'D', w()]); const x = r.int(0, 2); if (x === 1) E.push(['A', 'D', w()]); if (x === 2) E.push(['B', 'C', w()]);
    const res = ucs(E), fewest = Math.min(...[['S', 'A', 'C', 'G'], ['S', 'B', 'D', 'G']].map(p => p.slice(1).reduce((s, n, i) => s + E.find(e => e[0] === p[i] && e[1] === n)[2], 0)));
    return {
      prompt: 'Run <b>uniform cost search</b> from S to G on this graph (arrows are one way; numbers are step costs; ties are broken alphabetically). With what cost <b>g</b> does G come out of the priority queue? This is the cost of the cheapest path.',
      hint: 'Keep a list of frontier nodes with their g. Always open the smallest g. If you find a cheaper g for a node already in the frontier, replace it. Stop when G is opened.',
      answer: res.log.join('<br>') + `<br>So the cheapest path costs <b>${res.cost}</b>.` + (fewest > res.cost ? ` (The straight three-step paths cost at least ${fewest}: fewer steps, more money.)` : ''),
      check: { type: 'number', answer: res.cost, tol: 0.01 },
      figure: { w: 520, h: 300, draw(F) { const G = K.graph(F, { nodes: UPOS, edges: E.map(([a, b, c]) => [a, b, c, { dir: true }]) }); G.state('S', 'start', 0); G.state('G', 'goal', 0); } }
    };
  }
};
function fullTreeCounts(b, d) { let atD = 1, total = 1; for (let i = 1; i <= d; i++) { atD *= b; total += atD; } return { atD, total }; }
function dfsMaxStack(b, m) {   // simulate a stack DFS on a full tree, children pushed together
  let st = [0], max = 1; while (st.length) { const dep = st.pop(); if (dep < m) for (let i = 0; i < b; i++) st.push(dep + 1); max = Math.max(max, st.length); } return max;
}
const exCount = {
  title: 'Count the nodes', random: true,
  gen(r) {
    const b = r.int(2, 5), d = r.int(2, b <= 3 ? 6 : 4), kind = r.pick(['level', 'total', 'dfs']), c = fullTreeCounts(b, d);
    if (kind === 'level') return { prompt: `A search tree has branching factor <b>b = ${b}</b>. How many nodes are at depth <b>${d}</b> (the root is depth 0)?`, hint: 'Each level has b times more nodes than the level above.', answer: `$b^d = ${b}^{${d}} = ${c.atD}$ nodes.`, check: { type: 'number', answer: c.atD, tol: 0.01 } };
    if (kind === 'total') return { prompt: `A search tree has branching factor <b>b = ${b}</b>. Breadth-first search generates every node down to depth <b>${d}</b>. How many nodes is that in total, root included?`, hint: 'Add the nodes on each level: 1 + b + b² + … + b^d.', answer: `$1 + ${b} + \\dots + ${b}^{${d}} = ${c.total}$ nodes. The last level alone has ${c.atD}: it dominates the sum.`, check: { type: 'number', answer: c.total, tol: 0.01 } };
    const mx = dfsMaxStack(b, d);
    return { prompt: `Depth-first search runs on a full tree with branching factor <b>b = ${b}</b> and depth <b>m = ${d}</b>. When it opens a node it pushes all its children onto the stack. What is the largest number of nodes on the stack at any time?`, hint: 'On the way down, every opened node leaves b − 1 siblings waiting; at the bottom the last node adds all b children.', answer: `$(b-1)\\,m + 1 = ${b - 1}\\cdot${d} + 1 = ${mx}$ nodes (checked by simulation). Compare breadth first: ${c.atD} nodes wait at depth ${d}.`, check: { type: 'number', answer: mx, tol: 0.01 } };
  }
};

Course.lecture({
  id: 'w02', num: 2, week: 2, kind: 'lecture', title: 'Problem solving and search: uninformed search',
  lede: 'A goal-based agent must look ahead. This week we turn a task into a search problem, and meet three blind strategies, breadth first, depth first and uniform cost, that differ only in which node they open next.',
  clos: [1], widgets: ['uninformed'],
  goals: ['formulate a problem with <b>states, actions, transition model, goal test and path cost</b>',
    'run <b>breadth-first</b> and <b>depth-first</b> search by hand and explain the queue and the stack',
    'run <b>uniform cost search</b> with a priority queue and explain why it finds the cheapest path',
    'compare searches by <b>completeness, optimality, time and memory</b>, using the branching factor b and depth d',
    'predict how the three searches behave on a maze in the playground'],
  chapters: [
    { id: 'formulate', title: 'Turning a task into a search problem', blocks: [
      { html: '<p>A goal-based agent asks: <i>which sequence of actions takes me to my goal?</i> To let a computer answer, we write the task as a <b>search problem</b> with five parts.</p>' },
      { scene: sceneFormulate },
      { note: '<b>State space and search tree.</b> All states and roads together form the <b>state space</b> (a graph). A search algorithm grows a <b>search tree</b> over it: each tree node is a path from the start. The <b>frontier</b> is the set of tree nodes we have found but not yet opened (expanded).' },
      { quiz: { q: 'In the 8 puzzle, what is a good <b>state</b>?', options: ['The number of moves made so far', 'The position of every tile on the board', 'The tile that moved last', 'The goal board'], correct: 1, why: 'A state must describe the situation completely enough to decide actions and test the goal: the position of all tiles (and so of the empty square).' } }
    ] },
    { id: 'bfsdfs', title: 'Breadth first and depth first', blocks: [
      { html: '<p>All search algorithms repeat one loop: <b>take a node out of the frontier, test whether it is the goal, and if not, add its children</b>. They differ only in <i>which</i> node comes out. Breadth-first takes the <b>oldest</b> (a queue). Depth-first takes the <b>newest</b> (a stack).</p>' },
      { scene: sceneBFSDFS },
      { code: `function SEARCH(problem, frontier):
    frontier.add(start)
    while frontier is not empty:
        node = frontier.pop()          # queue: oldest · stack: newest · priority queue: cheapest
        if node is a goal: return path to node
        for child in expand(node):     # children from left to right
            if child not reached before: frontier.add(child)
    return failure` },
      { exercise: exOrder }
    ] },
    { id: 'ucs', title: 'Uniform cost search', blocks: [
      { html: '<p>When steps have different costs, the path with fewest steps can be expensive. <b>Uniform cost search</b> (Dijkstra\'s algorithm) orders the frontier by <b>g(n)</b>, the cost of the path from the start to n.</p>' },
      { scene: sceneUCS },
      { note: '<b>Two details.</b> (1) If a cheaper way to a frontier node is found, its g is <i>updated</i>. (2) We stop when the goal <i>comes out</i> of the frontier, not when it first goes in: a cheaper path could still be waiting (here G entered with 8 while C, at 10, could not beat it).' },
      { exercise: exUCS }
    ] },
    { id: 'measure', title: 'Comparing search strategies', blocks: [
      { html: '<p>We judge a search strategy with four questions. <b>Complete:</b> does it always find a solution if one exists? <b>Optimal:</b> does it find the cheapest one? <b>Time</b> and <b>space:</b> how many nodes does it generate and keep? We measure with the branching factor <b>b</b>, the depth of the shallowest goal <b>d</b>, and the maximum depth <b>m</b>.</p>' },
      { scene: sceneGrowth },
      { html: '<table class="mini"><tr><th></th><th>breadth-first</th><th>depth-first</th><th>uniform cost</th></tr><tr><td>complete?</td><td>yes (b finite)</td><td>no on infinite paths or loops (yes on finite graphs with a reached set)</td><td>yes (costs above 0)</td></tr><tr><td>optimal?</td><td>yes if all steps cost the same</td><td>no</td><td>yes</td></tr><tr><td>time</td><td>$O(b^d)$</td><td>$O(b^m)$</td><td>$O(b^{1+C^*/\\epsilon})$</td></tr><tr><td>space</td><td>$O(b^d)$</td><td>$O(b\\,m)$</td><td>$O(b^{1+C^*/\\epsilon})$</td></tr></table><p style="color:var(--muted);font-size:14px">$C^*$ = cost of the optimal solution, $\\epsilon$ = the smallest step cost.</p>' },
      { exercise: exCount },
      { quiz: { q: 'All step costs are equal to 1. Which statement is true?', options: ['Uniform cost search and breadth-first search open nodes in the same level order and both find a shortest path', 'Depth-first search becomes optimal', 'Uniform cost search is no longer complete', 'Breadth-first search needs less memory than depth-first'], correct: 0, why: 'With equal costs, g is just the depth, so the cheapest node is always a shallowest one. Both are optimal. Depth-first is still not optimal, and breadth-first still needs much more memory.' } },
      { quiz: { q: 'Your search tree has b = 10 and the goal is at depth 12. Your computer can store 100 million nodes. Which search should you try first?', options: ['Breadth-first search', 'Depth-first search with a depth limit of 12', 'Uniform cost search', 'Store the whole tree first'], correct: 1, why: 'Breadth-first would need about $10^{12}$ nodes in memory. Depth-first with a depth limit needs only about $b \\cdot m = 120$ nodes. (Repeating it with limits 1, 2, 3, … is called iterative deepening and is also optimal for equal costs.)' } }
    ] },
    { id: 'play', title: 'Play with it', blocks: [
      { html: '<p>Draw walls and mud (mud costs 5 to enter, a normal square costs 1). Drag S and G. Pick a search, press <b>Step</b> to watch one node open at a time with the frontier on the right, or <b>Run</b>. The numbers in the squares are the opening order.</p>' },
      { widget: 'uninformed' },
      { note: '<b>Try this.</b> (1) On "Wall with a gap", watch breadth-first spread in rings while depth-first snakes along. Compare the path lengths. (2) Choose "Mud lake": breadth-first walks straight through the mud (15 steps, cost 39); uniform cost goes around (23 steps, cost 23). (3) Press <b>Race all three</b> and read the table. Notice that on an open grid depth-first can have a <i>large</i> stack too: its memory advantage is clearest on trees.' }
    ] }
  ]
});
})();

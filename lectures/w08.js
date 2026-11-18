(function () {
const K = Course.kit;

/* ---------- helpers (own file) ---------- */
function tw(F, ms, fn) {
  if (F.instant || ms <= 0) { fn(1); return Promise.resolve(); }
  const tk = F.token, t0 = performance.now(), ez = (Course.ease && Course.ease.io) || (t => t);
  return new Promise(res => { const f = now => { if (tk !== F.token) return; const p = Math.min(1, (now - t0) / ms); fn(ez(p)); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
}
async function blink(F, el, n = 1) { if (F.instant) return; for (let i = 0; i < n; i++) { await F.to(el, { opacity: 0.3 }, 220); await F.to(el, { opacity: 1 }, 260); } }
const rnd = (v, d = 4) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

/* ---------- scene 1: the map of the course ---------- */
const sceneMap = {
  id: 'map', title: 'The course so far, on one page', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'Weeks 1 to 7: one story', 'an agent either plans with search, or learns from data; learning is itself a search for good weights');
    const B = (x, y, t, wk, fill, stroke) => { const b = F.box(x, y, 168, 62, t, { fill, stroke, size: 13, weight: 750 }); K.chip(F, 52, -31, wk, 'accent', b); b.style.opacity = 0; return b; };
    F.s.agent = B(105, 215, 'Intelligent agent\nperceive → act', 'week 1', 'var(--c-start)', '#16a34a');
    F.s.s1 = B(330, 110, 'Uninformed search\nBFS · DFS · UCS', 'week 2', 'var(--c-open)', 'var(--c-b)');
    F.s.s2 = B(560, 110, 'Informed search\nA star · heuristics', 'week 3', 'var(--c-open)', 'var(--c-b)');
    F.s.l1 = B(330, 320, 'Learning from data\nregression · trees · k means', 'week 4', 'var(--c-closed)', 'var(--c-a)');
    F.s.l2 = B(560, 320, 'Optimisation\ngradient descent · perceptron', 'week 5', 'var(--c-closed)', 'var(--c-a)');
    F.s.n1 = B(790, 320, 'Neural networks\nlayers · backprop', 'week 6', 'var(--c-cur)', 'var(--c-c)');
    F.s.n2 = B(790, 205, 'Generalise and see\ndropout · CNN · transfer', 'week 7', 'var(--c-cur)', 'var(--c-c)');
    const A = (x1, y1, x2, y2, col, dash) => { const a = F.arrow(x1, y1, x2, y2, { color: col, w: 2.6, dash }); a.style.opacity = 0; return a; };
    F.s.aS = A(190, 195, 244, 132, 'var(--c-b)'); F.s.aS2 = A(415, 110, 474, 110, 'var(--c-b)');
    F.s.aL = A(190, 235, 244, 300, 'var(--c-a)'); F.s.aL2 = A(415, 320, 474, 320, 'var(--c-a)');
    F.s.aN = A(645, 320, 704, 320, 'var(--c-c)'); F.s.aN2 = A(790, 288, 790, 238, 'var(--c-c)');
    F.s.bridge = A(560, 142, 560, 288, 'var(--c-d)', '7 5');
    F.s.bT = F.text(575, 215, 'learning =\nsearch in\nweight space', { size: 12, weight: 750, fill: 'var(--c-d)', anchor: 'start' }); F.s.bT.style.opacity = 0;
    F.s.kS = F.text(205, 150, 'world known:\nplan', { size: 11.5, weight: 700, fill: 'var(--c-b)', anchor: 'end' }); F.s.kS.style.opacity = 0;
    F.s.kL = F.text(205, 285, 'world unknown:\nlearn', { size: 11.5, weight: 700, fill: 'var(--c-a)', anchor: 'end' }); F.s.kL.style.opacity = 0;
    F.s.tip = K.callout(F, 450, 395, 'exam tip: first decide, is this a search question or a learning question?', { tone: 'ok', w: 560 });
  },
  steps: [
    { title: 'Start with the agent', say: ['Before the midterm, let us see the whole picture.', 'Everything starts with an agent: something that perceives its world and acts in it, to reach a goal.'],
      cues: [async F => { await F.show(F.s.agent); }, async F => { await F.pulse(F.s.agent, 2); }] },
    { title: 'Plan by search', say: ['When the agent knows its world, it can plan by search. Breadth first, uniform cost and A star explore a graph of states.', 'A good heuristic tells A star where to look first.'],
      cues: [async F => { await F.show(F.s.aS); await F.show(F.s.kS); await F.show(F.s.s1); }, async F => { await F.show(F.s.aS2); await F.show(F.s.s2); await F.pulse(F.s.s2, 1); }] },
    { title: 'Or learn from data', say: ['When the rules are unknown, the agent learns them from examples, by choosing weights that make the error small.', 'So learning is also a search, but in the space of weights, and gradient descent walks downhill.'],
      cues: [async F => { await F.show(F.s.aL); await F.show(F.s.kL); await F.show(F.s.l1); await F.show(F.s.aL2); await F.show(F.s.l2); }, async F => { await F.show(F.s.bridge); await F.show(F.s.bT); }] },
    { title: 'Neural networks', say: ['Stack neurons into layers and you get a neural network. Backpropagation computes every gradient in one backward pass.', 'Regularisation, dropout and early stopping keep it from memorising, and convolution lets it see.'],
      cues: [async F => { await F.show(F.s.aN); await F.show(F.s.n1); }, async F => { await F.show(F.s.aN2); await F.show(F.s.n2); }] },
    { title: 'Your exam compass', say: ['For every exam question, first ask: is this a search question or a learning question? Then pick the tool from this map.'],
      cues: [async F => { await F.show(F.s.tip); await blink(F, F.s.tip, 1); }] }
  ]
};

/* ---------- scene 2: three searches on one map (verified by code:
   BFS path S-B-G cost 9; UCS opens S,A,C,B,D then G, path S-A-C-D-G cost 7; A* opens S,A,C,D then G, cost 7) ---------- */
const SN = { S: { x: 70, y: 210, sub: 'h=6' }, A: { x: 200, y: 110, sub: 'h=4' }, B: { x: 230, y: 320, sub: 'h=4' }, C: { x: 340, y: 90, sub: 'h=3' }, D: { x: 420, y: 200, sub: 'h=2' }, G: { x: 520, y: 300, sub: 'h=0' } };
const SE = [['S', 'A', 2, { dir: true }], ['S', 'B', 5, { dir: true }], ['A', 'C', 2, { dir: true }], ['A', 'D', 6, { dir: true }], ['B', 'G', 4, { dir: true }], ['C', 'D', 1, { dir: true }], ['D', 'G', 2, { dir: true }]];
const sceneSearch = {
  id: 'search3', title: 'Three searches, one map', w: 900, h: 400, wide: true,
  build(F) {
    K.title(F, 'Breadth first, uniform cost, A star', 'numbers on arrows = step cost · h = honest guess of the cost still to go');
    F.s.G = K.graph(F, { nodes: SN, edges: SE }); F.s.G.state('S', 'start', 0); F.s.G.state('G', 'goal', 0);
    F.rect(600, 70, 280, 250, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' });
    F.text(740, 90, 'RESULTS', { size: 12, weight: 700, cls: 'soft' });
    F.text(640, 112, 'method', { size: 11.5, cls: 'soft' }); F.text(745, 112, 'path', { size: 11.5, cls: 'soft' }); F.text(820, 112, 'cost', { size: 11.5, cls: 'soft' }); F.text(860, 112, 'opened', { size: 11.5, cls: 'soft' });
    F.s.rows = [['BFS', 'S B G', '9', '3'], ['UCS', 'S A C D G', '7', '5'], ['A star', 'S A C D G', '7', '4']].map((r, i) => { const g = F.g({}); g.style.opacity = 0; const y = 145 + i * 40;
      F.rect(610, y - 15, 260, 30, { rx: 8, fill: i === 0 ? 'var(--bad-bg)' : 'var(--ok-bg)' }, g);
      F.text(640, y, r[0], { size: 13, weight: 750 }, g); F.text(745, y, r[1], { size: 13, weight: 700, cls: 'mono' }, g); F.text(820, y, r[2], { size: 14, weight: 800, cls: 'mono' }, g); F.text(860, y, r[3], { size: 13, cls: 'mono' }, g); return g; });
    F.s.note = F.text(740, 282, 'opened = nodes expanded before G\n(BFS tests the goal when it is generated)', { size: 11, cls: 'soft' });
    F.s.rule = K.callout(F, 450, 370, 'BFS is cheapest only when every step costs the same · UCS and A star (honest h) always find the cheapest path', { tone: 'ok', w: 760 });
    F.s.reset = async () => { for (const e of SE) F.s.G.edgeState(e[0], e[1], 'idle', 200); for (const n of 'ABCD') F.s.G.state(n, 'idle', 200); };
    F.s.path = async (p, st) => { for (let i = 0; i + 1 < p.length; i++) F.s.G.edgeState(p[i], p[i + 1], st); await F.wait(300); };
    F.s.open = async list => { for (const n of list) { if (n !== 'S' && n !== 'G') await F.s.G.state(n, 'closed', 250); else await F.s.G.ring(n, true, 200); } };
  },
  steps: [
    { title: 'One map', say: ['Here is one small map with step costs, and an honest guess h at every node.', 'We run three searches from S to G and compare them.'],
      cues: [async F => { await F.s.G.pulse('S'); await F.s.G.pulse('G'); }, async F => { await blink(F, F.s.note, 1); }] },
    { title: 'Breadth first', say: ['Breadth first ignores the costs and counts steps.', 'It finds S, B, G: only two steps, but the cost is nine.'],
      cues: [async F => { await F.s.open(['A', 'B']); }, async F => { await F.s.path(['S', 'B', 'G'], 'hot'); await F.show(F.s.rows[0]); }] },
    { title: 'Uniform cost', say: ['Uniform cost always opens the node with the cheapest cost so far.', 'It finds S, A, C, D, G with cost seven, after opening five nodes.'],
      cues: [async F => { await F.s.reset(); await F.s.open(['A', 'C', 'B', 'D']); }, async F => { await F.s.path(['S', 'A', 'C', 'D', 'G'], 'path'); await F.show(F.s.rows[1]); }] },
    { title: 'A star', say: ['A star adds the guess h to the cost so far.', 'It finds the same path with cost seven, but opens only four nodes. B is never opened.'],
      cues: [async F => { await F.s.reset(); await F.s.open(['A', 'C', 'D']); }, async F => { await F.s.path(['S', 'A', 'C', 'D', 'G'], 'path'); await F.show(F.s.rows[2]); await F.s.G.pulse('B'); }] },
    { title: 'The rule to remember', say: ['Breadth first is cheapest only when every step costs the same. Uniform cost, and A star with an honest heuristic, always find the cheapest path.'],
      cues: [async F => { await F.show(F.s.rule); }] }
  ]
};

/* ---------- scene 3: gradient descent recap (L = (w − 4)², lr 0.25: 0 → 2 → 3 → 3.5; lr 1.1: 0 → 8.8 → −1.76) ---------- */
const gx = w => 70 + (w + 3) * (600 / 13), gy = L => 360 - L * 8;
const sceneGD = {
  id: 'gdrecap', title: 'Gradient descent in one picture', w: 720, h: 400,
  build(F) {
    K.title(F, 'Loss L(w) = (w − 4)²', 'the best weight is w = 4 · the slope there is zero');
    F.line(60, 360, 680, 360, { stroke: 'var(--c-soft)', 'stroke-width': 1.5 });
    for (let w = -2; w <= 10; w += 2) { F.line(gx(w), 360, gx(w), 366, { stroke: 'var(--c-soft)' }); F.text(gx(w), 378, String(w), { size: 11, cls: 'soft' }); }
    const cp = F.el('clipPath', { id: 'w08-gd-clip' }, F.defs); F.rect(60, 60, 620, 300, {}, cp);
    let d = ''; for (let i = 0; i <= 130; i++) { const w = -3 + i * 0.1; d += (i ? 'L' : 'M') + gx(w).toFixed(1) + ',' + gy((w - 4) * (w - 4)).toFixed(1); }
    F.s.curve = F.path(d, { stroke: 'var(--c-a)', 'stroke-width': 3.2, 'clip-path': 'url(#w08-gd-clip)' }); F.s.curve.style.opacity = 0;
    F.s.min = F.circle(gx(4), gy(0), 6, { fill: 'var(--ok)' }); F.s.min.style.opacity = 0;
    F.s.tan = F.line(gx(-1.2), gy(16 + 8 * 1.2), gx(1.2), gy(16 - 8 * 1.2), { stroke: 'var(--c-c)', 'stroke-width': 3 }); F.s.tan.style.opacity = 0;
    F.s.tanT = F.text(gx(0) + 12, gy(16) - 40, 'slope = 2(w − 4) = −8', { size: 13, weight: 700, fill: 'var(--c-c)', anchor: 'start' }); F.s.tanT.style.opacity = 0;
    F.s.ball = F.g({ transform: `translate(${gx(0)},${gy(16)})` }); F.s.ball.__t = { x: gx(0), y: gy(16), s: 1, r: 0 };
    F.circle(0, -9, 9, { fill: 'var(--c-b)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }, F.s.ball); F.s.ball.style.opacity = 0;
    F.s.wT = F.text(560, 90, '', { size: 15, weight: 800, cls: 'mono', fill: 'var(--c-b)' });
    F.s.rule = K.callout(F, 400, 120, 'new w = w − learning rate × slope', { tone: 'accent', w: 290 });
    F.s.trail = F.g({});
    F.s.moveTo = async (w, ms) => { const L = (w - 4) * (w - 4); F.circle(gx(w), gy(Math.min(L, 37)), 3.5, { fill: 'var(--c-b)', opacity: 0.6 }, F.s.trail); await F.to(F.s.ball, { tx: gx(w), ty: gy(Math.min(L, 37)), opacity: L > 37 ? 0.3 : 1 }, ms, 'io'); F.setText(F.s.wT, 'w = ' + rnd(w, 2), 560); };
    F.s.bad = K.callout(F, 400, 120, 'learning rate too large: the ball overshoots and diverges', { tone: 'bad', w: 430 });
  },
  steps: [
    { title: 'A bowl of loss', say: ['Gradient descent is how almost every model in this course learns.', 'Here the loss is a simple bowl, and the best weight is four.'],
      cues: [async F => { await F.draw(F.s.curve, 1000); await F.show(F.s.ball); F.setText(F.s.wT, 'w = 0', 560); }, async F => { await F.show(F.s.min); }] },
    { title: 'Follow the slope down', say: ['The gradient is the slope under the ball. At zero it is minus eight, so downhill is to the right.', 'Each step moves by the learning rate times the slope, against the slope.'],
      cues: [async F => { await F.show(F.s.tan); await F.show(F.s.tanT); }, async F => { await F.show(F.s.rule); }] },
    { title: 'A good learning rate', say: ['With a learning rate of one quarter, the ball moves from zero to two, then to three, then to three and a half.', 'Each step halves the distance to the minimum.'],
      cues: [async F => { await F.hide(F.s.tan); await F.hide(F.s.tanT); for (const w of [2, 3, 3.5]) { await F.s.moveTo(w, 650); await F.wait(150); } }, async F => { await F.pulse(F.s.ball, 1); }] },
    { title: 'Too large', say: ['With a learning rate of one point one, the ball jumps over the minimum to eight point eight, then to about minus one point eight.', 'It bounces further away each time: the training diverges.'],
      cues: [async F => { F.s.trail.textContent = ''; await F.s.moveTo(0, 300); await F.s.moveTo(8.8, 700); await F.s.moveTo(-1.76, 700); }, async F => { await F.hide(F.s.rule); await F.show(F.s.bad); }] }
  ]
};

/* ---------- scene 4: backprop with numbers (x 2, w1 0.5, ReLU, w2 3, target 1 → L 4; dL/dw2 4, dL/dw1 24) ---------- */
const BX = [60, 175, 290, 405, 520, 640];
const sceneBP = {
  id: 'bprecap', title: 'Backpropagation with real numbers', w: 720, h: 400,
  build(F) {
    K.title(F, 'Forward, loss, backward, update', 'a tiny network: z = w1 · x, a = ReLU(z), y = w2 · a, loss = (y − target)²');
    F.s.nodes = [['x', '2'], ['× w1', 'w1 = 0.5'], ['ReLU', ''], ['× w2', 'w2 = 3'], ['loss', 'target 1'], ['', '']].slice(0, 5).map((n, i) => F.box(BX[i], 170, 86, 56, n[0], { fill: i === 0 ? 'var(--c-start)' : i === 4 ? 'var(--c-goal)' : 'var(--c-node)', size: 15, weight: 750 }));
    F.s.par = [['', 0], ['w1 = 0.5', 1], ['', 2], ['w2 = 3', 3], ['target = 1', 4]].map(([t, i]) => F.text(BX[i], 128, t, { size: 12.5, weight: 700, cls: 'mono', fill: 'var(--accent2)' }));
    F.s.fw = [];
    for (let i = 0; i < 4; i++) { F.arrow(BX[i] + 43, 170, BX[i + 1] - 45, 170, { color: 'var(--c-node-line)', w: 2.2 }); }
    F.s.fv = ['x = 2', 'z = 1', 'a = 1', 'y = 3'].map((t, i) => { const e = F.text(BX[i], 214, t, { size: 13, weight: 800, cls: 'mono', fill: 'var(--c-b)' }); e.style.opacity = 0; return e; });
    F.s.L = F.text(BX[4], 214, 'L = (3 − 1)² = 4', { size: 13, weight: 800, cls: 'mono', fill: 'var(--bad)' }); F.s.L.style.opacity = 0;
    F.s.bv = ['dL/dy = 2 × (3 − 1) = 4', 'dL/dw2 = 4 × a = 4 × 1 = 4', 'dL/da = 4 × w2 = 4 × 3 = 12', 'dL/dz = 12 × (ReLU slope 1) = 12', 'dL/dw1 = 12 × x = 12 × 2 = 24'].map((t, i) => { const e = F.text(170, 258 + i * 21, t, { size: 13, weight: 800, cls: 'mono', fill: i === 1 || i === 4 ? 'var(--c-c)' : 'var(--c-ink)', anchor: 'start' }); e.style.opacity = 0; return e; });
    F.s.back = F.arrow(560, 236, 100, 236, { color: 'var(--c-c)', w: 2.4, dash: '7 5' }); F.s.back.style.opacity = 0;
    F.s.upd = K.callout(F, 360, 378, 'learning rate 0.01:  w1 = 0.5 − 0.01 × 24 = 0.26   ·   w2 = 3 − 0.01 × 4 = 2.96', { tone: 'ok', w: 640 });
  },
  steps: [
    { title: 'Forward pass', say: ['Here is a tiny network: input two, weight zero point five, a ReLU, then weight three.', 'Going forward, z is one, the ReLU keeps one, and the output is three.'],
      cues: [async F => { await F.show(F.s.fv[0]); await F.pulse(F.s.nodes[1], 1); }, async F => { for (let i = 1; i < 4; i++) { await F.show(F.s.fv[i], 350); } }] },
    { title: 'The loss', say: ['The target is one, so the squared error is three minus one, squared, which is four.'],
      cues: [async F => { await F.show(F.s.L); await F.pulse(F.s.nodes[4], 1); }] },
    { title: 'Backward through weight two', say: ['Now go backwards. The loss changes four times as fast as the output.', 'So the gradient for weight two is four times the value it multiplied, one, which is four.'],
      cues: [async F => { await F.show(F.s.back); await F.show(F.s.bv[0]); }, async F => { await F.show(F.s.bv[1]); await F.pulse(F.s.nodes[3], 1); }] },
    { title: 'Backward to weight one', say: ['Passing back through the multiply by three gives twelve. The ReLU is active, so twelve passes unchanged.', 'The gradient for weight one is twelve times the input two, which is twenty four.'],
      cues: [async F => { await F.show(F.s.bv[2]); await F.show(F.s.bv[3]); }, async F => { await F.show(F.s.bv[4]); await F.pulse(F.s.nodes[1], 1); }] },
    { title: 'Update', say: ['With a learning rate of zero point zero one, weight one becomes zero point two six, and weight two becomes two point nine six.', 'Forward, loss, backward, update: that is one training step.'],
      cues: [async F => { await F.show(F.s.upd); }, async F => { await blink(F, F.s.upd, 1); }] }
  ]
};

/* ---------- graph generator for search exercises (fixed layout, random edges, always connected) ---------- */
const POS = { S: [60, 120], A: [170, 45], B: [170, 195], C: [290, 40], D: [290, 120], E: [290, 200], F: [410, 120] };
const CAND = [['S', 'A'], ['S', 'B'], ['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'D'], ['D', 'E'], ['C', 'F'], ['D', 'F'], ['E', 'F']];
function randGraph(r, extra) {
  const par = {}; Object.keys(POS).forEach(k => par[k] = k); const find = k => par[k] === k ? k : (par[k] = find(par[k]));
  const order = r.shuffle(CAND), E = [];
  for (const e of order) { const [a, b] = e; if (find(a) !== find(b)) { par[find(a)] = find(b); E.push(e); } }
  for (const e of order) { if (E.length >= 6 + extra) break; if (!E.includes(e)) E.push(e); }
  const adj = {}; Object.keys(POS).forEach(k => adj[k] = []); E.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); }); Object.values(adj).forEach(l => l.sort());
  return { E, adj };
}
const drawGraph = (F, E, costs) => K.graph(F, { nodes: Object.fromEntries(Object.entries(POS).map(([k, [x, y]]) => [k, { x: x + 20, y: y + 10 }])), edges: E.map((e, i) => [e[0], e[1], costs ? costs[i] : null, {}]) });

/* ---------- retrieval practice exercises ---------- */
const exTraverse = {
  title: 'Trace breadth first or depth first search', random: true,
  gen(r) {
    const { E, adj } = randGraph(r, r.int(1, 3)), useBFS = r.chance(0.5); let order = [];
    if (useBFS) { const q = ['S'], seen = new Set(['S']); while (q.length) { const n = q.shift(); order.push(n); for (const m of adj[n]) if (!seen.has(m)) { seen.add(m); q.push(m); } } }
    else { const seen = new Set(); const dfs = n => { seen.add(n); order.push(n); for (const m of adj[n]) if (!seen.has(m)) dfs(m); }; dfs('S'); }
    const ans = order.join('');
    return { prompt: `Run <b>${useBFS ? 'breadth first search' : 'depth first search'}</b> from S on this graph until every node is visited. Never visit a node twice, and when there is a choice, take neighbours in <b>alphabetical order</b>. Type the visiting order as letters with no spaces or commas (for example SABC…).`,
      hint: useBFS ? 'Use a queue: visit S, add its neighbours A to Z, then always take the oldest node from the queue.' : 'Go as deep as you can: from each node take the first unvisited neighbour (alphabetically); when stuck, go back one node.',
      answer: `Neighbours: ${Object.entries(adj).map(([k, v]) => k + ': ' + v.join(' ')).join(' · ')}.<br>Order: <b>${ans}</b>.`, check: { type: 'text', answer: ans },
      figure: { w: 480, h: 240, draw(F) { drawGraph(F, E).state('S', 'start', 0); } } };
  }
};
const exUCS = {
  title: 'Cheapest path cost (uniform cost search)', random: true,
  gen(r) {
    const { E } = randGraph(r, r.int(2, 4)), costs = E.map(() => r.int(1, 9)); const adj = {}; Object.keys(POS).forEach(k => adj[k] = []);
    E.forEach(([a, b], i) => { adj[a].push([b, costs[i]]); adj[b].push([a, costs[i]]); });
    const dist = { S: 0 }, done = new Set(), prev = {};
    while (true) { let u = null; for (const k in dist) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k; if (u === null) break; done.add(u); for (const [v, c] of adj[u]) if (dist[v] === undefined || dist[u] + c < dist[v]) { dist[v] = dist[u] + c; prev[v] = u; } }
    const p = ['F']; while (p[0] !== 'S') p.unshift(prev[p[0]]);
    return { prompt: 'The roads can be used in both directions; the numbers are costs. What is the cost of the <b>cheapest</b> path from S to F?',
      hint: 'Uniform cost search: always expand the node with the smallest cost so far, and update a neighbour when you find a cheaper way to it.',
      answer: `Cheapest costs from S: ${Object.entries(dist).sort().map(([k, v]) => k + ' = ' + v).join(', ')}. A cheapest path is ${p.join(' → ')} with cost <b>${dist.F}</b>.`, check: { type: 'number', answer: dist.F, tol: 0.01 },
      figure: { w: 480, h: 240, draw(F) { const G = drawGraph(F, E, costs); G.state('S', 'start', 0); G.state('F', 'goal', 0); } } };
  }
};
const exAstar = {
  title: 'A star: which node is next?', random: true,
  gen(r) {
    const names = r.shuffle(['B', 'C', 'D', 'E']); let rows, f;
    do { rows = names.map(n => ({ n, g: r.int(1, 12), h: r.int(0, 9) })); f = rows.map(o => o.g + o.h); } while (new Set(f).size !== f.length);
    const best = rows[f.indexOf(Math.min(...f))].n;
    return { prompt: 'The A star frontier holds:<table class="mini"><tr><th>node</th><th>g (cost so far)</th><th>h (guess to go)</th></tr>' + rows.map(o => `<tr><td>${o.n}</td><td>${o.g}</td><td>${o.h}</td></tr>`).join('') + '</table>Which node is expanded next? Type its letter.',
      hint: 'f = g + h. The smallest f is expanded first. (Greedy search would use h only; uniform cost would use g only.)',
      answer: rows.map((o, i) => `${o.n}: ${o.g} + ${o.h} = ${f[i]}`).join('; ') + `. Smallest f: <b>${best}</b>.`, check: { type: 'text', answer: best } };
  }
};
const exMSE = {
  title: 'Mean squared error', random: true,
  gen(r) {
    const n = 4, y = Array.from({ length: n }, () => r.int(0, 10)), p = y.map(v => v + r.pick([-3, -2, -1, 0, 1, 2, 3]));
    const se = y.map((v, i) => (p[i] - v) * (p[i] - v)), mse = se.reduce((a, b) => a + b, 0) / n;
    return { prompt: `A regression model predicts ${p.join(', ')} for four houses whose true values are ${y.join(', ')}. What is the mean squared error?`,
      hint: 'For each example: (prediction − true value) squared. Then take the average.', answer: `Squared errors: ${se.join(', ')}. Mean = ${se.reduce((a, b) => a + b, 0)} / 4 = <b>${mse}</b>.`, check: { type: 'number', answer: mse, tol: 0.01 } };
  }
};
const exKmeans = {
  title: 'k means: assign a point', random: true,
  gen(r) {
    let C, P, d;
    do { C = [0, 1, 2].map(() => [r.int(0, 10), r.int(0, 10)]); P = [r.int(0, 10), r.int(0, 10)]; d = C.map(c => Math.hypot(c[0] - P[0], c[1] - P[1])); const s = d.slice().sort((a, b) => a - b); if (s[1] - s[0] > 0.4) break; } while (true);
    const k = d.indexOf(Math.min(...d));
    return { prompt: `k means has three centroids: C1 = (${C[0]}), C2 = (${C[1]}), C3 = (${C[2]}). The point P = (${P}) is assigned to which centroid? Type C1, C2 or C3.`,
      hint: 'Compute the straight-line (Euclidean) distance from P to each centroid. The nearest one wins.',
      answer: d.map((v, i) => `C${i + 1}: ${v.toFixed(2)}`).join(', ') + `. Nearest: <b>C${k + 1}</b>. After all points are assigned, each centroid moves to the mean of its points.`, check: { type: 'text', answer: 'C' + (k + 1) } };
  }
};
const exEntropy = {
  title: 'Entropy of a decision tree node', random: true,
  gen(r) {
    const p = r.int(1, 8), n = r.int(0, 8), t = p + n, H = [p, n].filter(v => v).reduce((s, v) => s - (v / t) * Math.log2(v / t), 0);
    return { prompt: `A node of a decision tree holds ${p} "yes" and ${n} "no" examples. What is its entropy in bits? (Two decimals.)`,
      hint: 'Entropy = −p·log2(p) − q·log2(q), with p and q the fractions of yes and no. A pure node has entropy 0; a 50/50 node has entropy 1.',
      answer: `p = ${p}/${t}, q = ${n}/${t}. Entropy = <b>${H.toFixed(2)}</b> bits.${n === 0 ? ' The node is pure.' : ''}`, check: { type: 'number', answer: rnd(H), tol: 0.011 } };
  }
};
const exGD = {
  title: 'One gradient descent step', random: true,
  gen(r) {
    const a = r.int(-3, 6), w = r.int(-4, 8), lr = r.pick([0.1, 0.2, 0.5]), g = 2 * (w - a), w1 = rnd(w - lr * g);
    return { prompt: `The loss is $L(w) = (w - ${a})^2$ and the current weight is $w = ${w}$. With learning rate ${lr}, what is the new weight after one gradient descent step?`.replace('- -', '+ '),
      hint: 'The slope is dL/dw = 2(w − a). New w = w − learning rate × slope.', answer: `Slope = 2 × (${w} − (${a})) = ${g}. New w = ${w} − ${lr} × ${g} = <b>${w1}</b>.`, check: { type: 'number', answer: w1, tol: 0.01 } };
  }
};
const exSA = {
  title: 'Simulated annealing: accept a worse move?', random: true,
  gen(r) {
    const d = r.pick([1, 2, 3, 4, 5]), T = r.pick([1, 2, 5, 10]), p = Math.exp(-d / T);
    return { prompt: `Simulated annealing (maximising) proposes a move that makes the value <b>worse by ${d}</b>. The temperature is T = ${T}. With what probability is the move accepted? (Two decimals.)`,
      hint: 'A worse move is accepted with probability e^(−Δ/T). High temperature: often accepted. Low temperature: rarely.',
      answer: `e^(−${d}/${T}) = <b>${p.toFixed(2)}</b>.`, check: { type: 'number', answer: rnd(p), tol: 0.011 } };
  }
};
const exPerc = {
  title: 'Perceptron update', random: true,
  gen(r) {
    const w = [r.int(-3, 3), r.int(-3, 3)], b = r.int(-2, 2), x = [r.int(-2, 3), r.int(-2, 3)], y = r.int(0, 1), lr = r.pick([1, 0.5]);
    const s = w[0] * x[0] + w[1] * x[1] + b, yh = s >= 0 ? 1 : 0, w1 = rnd(w[0] + lr * (y - yh) * x[0]);
    return { prompt: `A perceptron has weights w = (${w}), bias b = ${b}, and outputs 1 if w·x + b ≥ 0, otherwise 0. For the example x = (${x}) with true label ${y}, apply one update with learning rate ${lr}: w ← w + rate × (label − output) × x. What is the new <b>first</b> weight?`,
      hint: 'First compute the output. If it is correct, nothing changes.', answer: `w·x + b = ${s}, so the output is ${yh}. Error = ${y} − ${yh} = ${y - yh}. New w1 = ${w[0]} + ${lr} × ${y - yh} × ${x[0]} = <b>${w1}</b>.${y === yh ? ' The prediction was right, so the weights stay the same.' : ''}`, check: { type: 'number', answer: w1, tol: 0.01 } };
  }
};
const exBP = {
  title: 'Backpropagation by hand', random: true,
  gen(r) {
    let x, w1, w2, t; do { x = r.int(1, 3); w1 = r.pick([0.5, 1, 2, 1.5, -1]); w2 = r.int(-3, 3) || 2; t = r.int(-2, 4); } while (w2 * Math.max(0, w1 * x) === t);
    const z = w1 * x, a = Math.max(0, z), y = w2 * a, L = (y - t) * (y - t), dy = 2 * (y - t), dz = dy * w2 * (z > 0 ? 1 : 0), dw1 = dz * x;
    return { prompt: `A tiny network computes $z = w_1 x$, $a = \\text{ReLU}(z)$, $y = w_2 a$ and the loss $L = (y - t)^2$. With $x = ${x}$, $w_1 = ${w1}$, $w_2 = ${w2}$ and target $t = ${t}$, what is $\\partial L / \\partial w_1$?`,
      hint: 'Forward first. Then backwards: dL/dy = 2(y − t); multiply by w2; multiply by the ReLU slope (1 if z > 0, else 0); multiply by x.',
      answer: `Forward: z = ${z}, a = ${a}, y = ${y}, L = ${L}. Backward: dL/dy = ${dy}; × w2 = ${dy * w2}; × ReLU slope ${z > 0 ? 1 : 0} = ${dz}; × x = <b>${dw1}</b>.${z <= 0 ? ' The ReLU is off, so no gradient reaches w1.' : ''}`, check: { type: 'number', answer: dw1, tol: 0.01 } };
  }
};
const exDrop = {
  title: 'Dropout scaling', random: true,
  gen(r) {
    const [p, sc] = r.pick([[0.5, 2], [0.75, 4], [0.8, 5], [0.2, 1.25]]), a = (p === 0.2 ? 4 : 1) * r.int(1, 5), v = a * sc;
    return { prompt: `Inverted dropout with drop probability p = ${p}. A kept unit has output ${a} before scaling. What does it pass on during training?`,
      hint: 'Multiply kept outputs by 1 / (1 − p).', answer: `1 / (1 − ${p}) = ${sc}, so ${a} × ${sc} = <b>${v}</b>. At test time all units are used and nothing is scaled.`, check: { type: 'number', answer: v, tol: 0.01 } };
  }
};

Course.lecture({
  id: 'w08', num: 8, week: 8, kind: 'lecture', title: 'Midterm review: weeks 1 to 7',
  lede: 'No new content this week. We connect everything on one map, replay the key algorithms with numbers, and then practise: every exercise below makes a new random problem each time you press the dice.',
  clos: [1, 2], widgets: [],
  goals: ['place every topic of weeks 1 to 7 on one map: agents, search, learning, optimisation, neural networks',
    'trace <b>BFS</b>, <b>DFS</b>, <b>uniform cost</b> and <b>A*</b> by hand and say which path each finds',
    'compute an <b>MSE</b>, an <b>entropy</b>, a <b>k means</b> assignment, a <b>gradient descent</b> step and a <b>perceptron</b> update',
    'run <b>backpropagation</b> with numbers and explain <b>dropout</b> and other guards against overfitting'],
  chapters: [
    { id: 'map', title: 'The big picture', blocks: [
      { scene: sceneMap },
      { note: '<b>How to use this page.</b> Watch each scene once. Then do every exercise until you get three correct answers in a row; press 🎲 for a new problem. Use <i>Hint</i> before <i>Show the answer</i>. Retrieval practice like this is one of the best-tested ways to remember.' },
      { quiz: { q: 'A <b>rational agent</b> is one that…', options: ['chooses the action expected to give the best performance, given what it has perceived so far', 'always knows the true state of the world', 'never makes a mistake', 'copies what a human would do'], correct: 0, why: 'Rational means doing the best expected thing with the information available. It does not mean all-knowing or perfect.' } }
    ] },
    { id: 'search', title: 'Search (weeks 2 and 3)', blocks: [
      { scene: sceneSearch },
      { exercise: exTraverse },
      { exercise: exUCS },
      { exercise: exAstar },
      { quiz: { q: 'All step costs are different. Which algorithm is guaranteed to return the cheapest path?', options: ['Uniform cost search', 'Breadth first search', 'Depth first search', 'Greedy best-first search'], correct: 0, why: 'Uniform cost expands by cost so far. BFS is only cheapest when all costs are equal; DFS and greedy search give no such guarantee.' } }
    ] },
    { id: 'learn', title: 'Learning from data (week 4)', blocks: [
      { html: '<p><b>Supervised</b> learning has labelled examples (regression predicts a number, classification a class). <b>Unsupervised</b> learning finds structure without labels, like k means clustering. Always judge a model on data it did not train on.</p>' },
      { exercise: exMSE },
      { exercise: exKmeans },
      { exercise: exEntropy }
    ] },
    { id: 'opt', title: 'Optimisation (week 5)', blocks: [
      { scene: sceneGD },
      { exercise: exGD },
      { exercise: exSA },
      { exercise: exPerc }
    ] },
    { id: 'nn', title: 'Neural networks (weeks 6 and 7)', blocks: [
      { scene: sceneBP },
      { exercise: exBP },
      { exercise: exDrop }
    ] },
    { id: 'exam', title: 'Exam-style questions', blocks: [
      { html: '<p>Eight mixed questions in the style of the midterm. Decide first, then click. Read the explanation even when you are right.</p>' },
      { quiz: { q: 'A* uses a heuristic that sometimes <b>overestimates</b> the true remaining cost. What can happen?', options: ['A* may return a path that is not the cheapest', 'A* will loop forever', 'A* becomes breadth first search', 'Nothing changes'], correct: 0, why: 'An overestimating (inadmissible) heuristic can make the cheapest path look expensive, so A* may stop with a worse path.' } },
      { quiz: { q: 'Hill climbing stops at a peak that is not the highest. What is this called, and what helps?', options: ['A local maximum; random restarts or simulated annealing help', 'A global maximum; nothing is needed', 'Overfitting; dropout helps', 'A plateau; a larger dataset helps'], correct: 0, why: 'Hill climbing only moves uphill, so it can get stuck on a local maximum. Restarts or occasionally accepting worse moves (simulated annealing) can escape.' } },
      { quiz: { q: 'Training loss keeps falling but validation loss has been rising for several epochs. What should you do?', options: ['Stop training and keep the weights from the best validation epoch', 'Train for many more epochs', 'Increase the learning rate', 'Evaluate on the training set instead'], correct: 0, why: 'This is overfitting. Early stopping returns the weights with the lowest validation loss.' } },
      { quiz: { q: 'Which task is <b>unsupervised</b>?', options: ['Grouping customers into clusters without any labels', 'Predicting house prices from past sales', 'Classifying emails as spam or not spam from labelled emails', 'Predicting tomorrow\'s temperature from labelled history'], correct: 0, why: 'Clustering uses no labels. The other three learn from labelled examples, so they are supervised.' } },
      { quiz: { q: 'Why can a single perceptron not learn XOR?', options: ['XOR is not linearly separable: no single straight line splits the classes', 'XOR needs a larger learning rate', 'The perceptron has no bias', 'XOR has too many examples'], correct: 0, why: 'A perceptron draws one straight line. XOR needs at least two, which a hidden layer provides.' } },
      { quiz: { q: 'Why do neural networks need a <b>non-linear</b> activation such as ReLU?', options: ['Without it, many layers collapse into one linear function', 'It makes training data larger', 'It removes the need for backpropagation', 'It keeps all weights positive'], correct: 0, why: 'A chain of linear layers is still linear. The non-linearity lets the network bend its decision boundary.' } },
      { quiz: { q: 'In backpropagation, the gradient of a weight is…', options: ['the gradient arriving at its output times the input it multiplied', 'always equal to the loss', 'the weight divided by the learning rate', 'computed only for the last layer'], correct: 0, why: 'By the chain rule: for y = w · a, the gradient of w is dL/dy × a. Backpropagation applies this from the output back to the input.' } },
      { quiz: { q: 'With the learning rate much too large, gradient descent will most likely…', options: ['overshoot the minimum and diverge', 'find the minimum faster and stay there', 'stop after one step', 'turn into a random search'], correct: 0, why: 'Each step jumps past the bottom of the bowl, further each time, so the loss grows instead of falling.' } }
    ] }
  ]
});
})();

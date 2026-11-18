(function () {
const K = Course.kit;

/* ---------- small helpers (local to this lecture) ---------- */
const Q = fn => F => { if (F.instant) { const P = Object.create(F); P.instant = true; return fn(P); } return fn(F); };
const EASE = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function tw(F, ms, fn) {
  if (F.instant || ms <= 0) { fn(1); return Promise.resolve(); }
  const tk = F.token, st = performance.now();
  return new Promise(res => { const f = now => { if (tk !== F.token) return; const p = Math.min(1, (now - st) / ms); fn(EASE(p)); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
}
function axes(F, o) {
  const X = v => o.x + (v - o.xr[0]) / (o.xr[1] - o.xr[0]) * o.w, Y = v => o.y + o.h - (v - o.yr[0]) / (o.yr[1] - o.yr[0]) * o.h;
  const g = F.g({});
  F.rect(o.x, o.y, o.w, o.h, { fill: 'var(--card)', stroke: 'var(--line)', rx: 6 }, g);
  (o.tx || []).forEach(t => { F.line(X(t), o.y, X(t), o.y + o.h, { stroke: 'var(--c-grid)' }, g); F.text(X(t), o.y + o.h + 13, String(t), { size: 11, cls: 'soft' }, g); });
  (o.ty || []).forEach(t => { F.line(o.x, Y(t), o.x + o.w, Y(t), { stroke: 'var(--c-grid)' }, g); F.text(o.x - 7, Y(t), String(t), { size: 11, cls: 'soft', anchor: 'end' }, g); });
  if (o.xl) F.text(o.x + o.w / 2, o.y + o.h + 30, o.xl, { size: 12.5, cls: 'soft' }, g);
  return { X, Y, g };
}
const fx = (v, d) => { const s = (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; };
const mn = s => String(s).replace(/-/g, '−');
/** a value tag: rounded pill with text, updatable */
function tag(F, x, y, txt, tone) {
  const col = tone === 'g' ? 'var(--c-c)' : tone === 'ok' ? 'var(--ok)' : 'var(--c-b)', bg = tone === 'g' ? 'var(--warn-bg)' : tone === 'ok' ? 'var(--ok-bg)' : 'var(--accent2-bg)';
  const g = F.g({ transform: `translate(${x},${y})` }); g.__t = { x, y, s: 1, r: 0 };
  g.r = F.rect(0, -12, 10, 24, { rx: 12, fill: bg, stroke: col, 'stroke-width': 1.4 }, g);
  g.t = F.text(0, 0.5, '', { size: 13, weight: 750, mono: true, fill: col }, g);
  g.set = s => { s = mn(s); F.setText(g.t, s, 0, 14); const w = s.length * 8 + 16; g.r.setAttribute('x', -w / 2); g.r.setAttribute('width', w); };
  g.set(txt); g.style.opacity = 0; return g;
}
const sig = z => 1 / (1 + Math.exp(-z));

/* ================= scene 1: one artificial neuron ================= */
// inputs 2, 1, 3; weights 0.5, -1, 0.4; bias -0.2 -> z = 1 - 1 + 1.2 - 0.2 = 1.0 ; sigmoid(1) = 0.731 (checked)
const NIN = [2, 1, 3], NW = [0.5, -1, 0.4], NB = -0.2;
const sceneNeuron = {
  id: 'neuron', title: 'One artificial neuron', w: 720, h: 400,
  build(F) {
    K.title(F, 'Weighted sum, then activation', 'output = activation(w1·x1 + w2·x2 + w3·x3 + b)');
    const ys = [120, 210, 300], nx = 380, ny = 210;
    F.s.edges = ys.map((y, i) => { const l = F.line(120, y, nx - 46, ny + (i - 1) * 16, { stroke: 'var(--c-node-line)', 'stroke-width': 2 + 2.5 * Math.abs(NW[i]) }); l.style.opacity = 0; return l; });
    F.s.in = ys.map((y, i) => { const b = F.box(90, y, 58, 44, String(NIN[i]), { size: 20, weight: 800 }); F.text(90, y - 34, 'x' + (i + 1), { size: 12.5, cls: 'soft' }); return b; });
    F.s.wt = ys.map((y, i) => { const t = tag(F, 210, (y + ny + (i - 1) * 16) / 2 - 14, 'w = ' + NW[i], 'v'); return t; });
    F.s.pr = ys.map((y, i) => tag(F, 290, (y * 0.35 + (ny + (i - 1) * 16) * 0.65) + 14, fx(NIN[i] * NW[i], 1), 'ok'));
    F.s.dots = ys.map(y => { const c = F.circle(120, y, 7, { fill: 'var(--c-b)', stroke: '#fff', 'stroke-width': 2 }); c.style.opacity = 0; return c; });
    F.s.neu = F.g({ transform: `translate(${nx},${ny})` }); F.s.neu.__t = { x: nx, y: ny, s: 1, r: 0 };
    F.circle(0, 0, 46, { fill: 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 2.4, filter: 'url(#fx-soft)' }, F.s.neu); F.text(0, -6, 'Σ', { size: 28, weight: 800 }, F.s.neu); F.s.zt = F.text(0, 20, 'z = ?', { size: 13, weight: 700, mono: true }, F.s.neu);
    F.s.bias = tag(F, nx, ny + 74, 'bias b = −0.2', 'v');
    F.s.e2 = F.arrow(nx + 48, ny, 488, ny, { color: 'var(--c-node-line)', w: 2.5 });
    F.s.act = F.box(540, ny, 100, 70, null, { rx: 12 });
    F.s.actCurve = F.path('M-40,22 C-12,22 -8,-22 40,-22', { stroke: 'var(--c-a)', 'stroke-width': 3 }, F.s.act); F.text(0, 48, 'sigmoid', { size: 12, cls: 'soft' }, F.s.act);
    F.arrow(592, ny, 640, ny, { color: 'var(--c-node-line)', w: 2.5 });
    F.s.out = F.box(675, ny, 60, 44, '?', { size: 18, weight: 800, mono: true });
    F.text(675, ny - 34, 'output', { size: 12.5, cls: 'soft' });
    F.s.sum = K.callout(F, 330, 372, 'z = 1 − 1 + 1.2 − 0.2 = 1', { tone: 'ok', w: 230 });
    F.s.learn = K.callout(F, 560, 320, 'learning = changing\nthe weights and the bias', { tone: 'accent', w: 200 });
  },
  steps: [
    { title: 'Inputs and weights', say: ['An artificial neuron takes some numbers as input. Each input has a weight that says how important it is.', 'Here the inputs are two, one and three, with weights zero point five, minus one and zero point four.'],
      cues: [Q(async F => { for (const b of F.s.in) await F.pulse(b, 1); }), Q(async F => { for (let i = 0; i < 3; i++) { F.show(F.s.edges[i], 300); await F.show(F.s.wt[i], 300); } })] },
    { title: 'The weighted sum', say: ['The neuron multiplies each input by its weight, and adds everything up, together with a bias.', 'One, minus one, plus one point two, minus zero point two: the sum z is one.'],
      cues: [Q(async F => { F.s.edges.forEach(e => e.style.opacity = 1); F.s.wt.forEach(t => t.style.opacity = 1); await flowIn(F); for (const p of F.s.pr) await F.show(p, 250); }),
             Q(async F => { await F.show(F.s.bias); F.setText(F.s.zt, 'z = 1', 0, 14); await F.show(F.s.sum); await F.pulse(F.s.neu, 1); })] },
    { title: 'The activation', say: ['Then the sum goes through an activation function. With the sigmoid, one becomes about zero point seven three.', 'This number is the output of the neuron. It can be an input for the next neurons.'],
      cues: [Q(async F => { F.hide(F.s.sum); await F.pulse(F.s.act, 1); }), Q(async F => { F.setText(F.s.out.label, '0.73', 0, 18); await F.to(F.s.out.rect, { fill: 'var(--c-open)', stroke: 'var(--c-b)' }, 400); await F.pulse(F.s.out, 2); })] },
    { title: 'What is learned', say: ['Learning means changing the weights and the bias.', 'One neuron is simple. The power comes from connecting many of them in layers.'],
      cues: [Q(async F => { await F.show(F.s.learn); for (const t of F.s.wt) F.pulse(t, 2); await F.pulse(F.s.bias, 2); }), Q(async F => { await F.pulse(F.s.neu, 2); })] }
  ]
};
async function flowIn(F) {
  const ys = [120, 210, 300];
  F.s.dots.forEach(d => d.style.opacity = 1);
  await tw(F, 800, t => F.s.dots.forEach((d, i) => { d.setAttribute('cx', 120 + (334 - 120) * t); d.setAttribute('cy', ys[i] + (210 + (i - 1) * 16 - ys[i]) * t); }));
  F.s.dots.forEach(d => d.style.opacity = 0);
}

/* ================= scene 2: activation functions ================= */
const ACTS = [
  ['step', z => (z > 0 ? 1 : 0), '0 or 1'], ['sigmoid', sig, '0 to 1'], ['tanh', z => Math.tanh(z), '−1 to 1'], ['ReLU', z => Math.max(0, z), '0 to ∞']
];
// checked: at z = 1 -> 1, 0.731, 0.762, 1 ; at z = -2 -> 0, 0.119, -0.964, 0
const sceneActs = {
  id: 'acts', title: 'Activation functions', w: 900, h: 400, wide: true,
  build(F) {
    K.title(F, 'Four activation functions', 'input z (the weighted sum) on the horizontal axis, output on the vertical axis');
    F.s.P = ACTS.map(([name, f, range], i) => {
      const x0 = 46 + i * 216, A = axes(F, { x: x0, y: 92, w: 180, h: 220, xr: [-3, 3], yr: [-1.3, 3], tx: [-2, 0, 2], ty: [-1, 0, 1, 2, 3] });
      F.line(A.X(-3), A.Y(0), A.X(3), A.Y(0), { stroke: 'var(--c-soft)', 'stroke-width': 1.2 });
      F.text(x0 + 90, 78, name, { size: 15, weight: 800 });
      F.text(x0 + 90, 340, 'output ' + range, { size: 12, cls: 'soft' });
      let d = ''; for (let k = 0; k <= 240; k++) { const z = -3 + 6 * k / 240; let y = f(z); if (name === 'step' && k && (f(z) !== f(z - 6 / 240))) d += 'M' + A.X(z).toFixed(1) + ',' + A.Y(y).toFixed(1); else d += (k ? 'L' : 'M') + A.X(z).toFixed(1) + ',' + A.Y(Math.min(3, y)).toFixed(1); }
      const c = F.path(d, { stroke: ['var(--c-soft)', 'var(--c-b)', 'var(--c-a)', 'var(--c-c)'][i], 'stroke-width': 3.5, 'stroke-linecap': 'round' }); c.style.opacity = 0;
      const pr = F.line(A.X(1), 92, A.X(1), 312, { stroke: 'var(--bad)', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }); pr.style.opacity = 0;
      const dt = F.circle(A.X(1), A.Y(f(1)), 6.5, { fill: 'var(--bad)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }); dt.style.opacity = 0;
      const vt = tag(F, x0 + 90, 372, '', 'g');
      return { A, f, c, pr, dt, vt, name };
    });
    F.s.flat = K.callout(F, 136, 140, 'slope 0: no gradient', { tone: 'bad', w: 160 });
  },
  steps: [
    { title: 'Step', say: ['The oldest activation is the step function. It outputs one if the sum is positive, and zero otherwise.', 'It is a hard yes or no. Its slope is zero almost everywhere, so gradient descent cannot learn with it.'],
      cues: [Q(async F => { F.s.P[0].c.style.opacity = 0; await F.draw(F.s.P[0].c, 900); }), Q(async F => { await F.show(F.s.flat); })] },
    { title: 'Sigmoid and tanh', say: ['The sigmoid is a smooth step. It squeezes any number into the range from zero to one.', 'Tanh has the same S shape, but goes from minus one to one.'],
      cues: [Q(async F => { F.hide(F.s.flat); F.s.P[1].c.style.opacity = 0; await F.draw(F.s.P[1].c, 900); }), Q(async F => { F.s.P[2].c.style.opacity = 0; await F.draw(F.s.P[2].c, 900); })] },
    { title: 'ReLU', say: ['ReLU, the rectified linear unit, keeps positive numbers and turns negative numbers into zero.', 'It is very cheap, and its slope does not fade for large inputs. It is the default choice in deep networks.'],
      cues: [Q(async F => { F.s.P[3].c.style.opacity = 0; await F.draw(F.s.P[3].c, 900); }), Q(async F => { await F.pulse(F.s.P[3].c, 1); })] },
    { title: 'Compare at one input', say: ['At z equals one, the four outputs are one, zero point seven three, zero point seven six, and one.', 'At z equals minus two, they are zero, zero point one two, minus zero point nine six, and zero.'],
      cues: [Q(async F => { await probe(F, 1); }), Q(async F => { await probe(F, -2); })] }
  ]
};
async function probe(F, z) {
  const jobs = [];
  F.s.P.forEach(p => { p.c.style.opacity = 1; p.vt.set(p.name + '(' + z + ') = ' + fx(p.f(z), p.name === 'step' || p.name === 'ReLU' ? 0 : 2)); F.show(p.vt); F.show(p.pr); F.show(p.dt); jobs.push(F.to(p.pr, { x1: p.A.X(z), x2: p.A.X(z) }, 600)); jobs.push(F.to(p.dt, { cx: p.A.X(z), cy: p.A.Y(p.f(z)) }, 600)); });
  await Promise.all(jobs);
}

/* ================= scene 3: XOR needs a hidden layer ================= */
// h1 = step(x1 + x2 - 0.5) (OR), h2 = step(x1 + x2 - 1.5) (AND), out = step(h1 - h2 - 0.5)  -> XOR (checked for all 4 inputs)
const XP = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]];
const sceneXor = {
  id: 'xor', title: 'XOR: why we need a hidden layer', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'XOR: output 1 when exactly one input is 1', 'one straight line is not enough');
    const A = F.s.A = axes(F, { x: 50, y: 80, w: 280, h: 280, xr: [-0.4, 1.4], yr: [-0.4, 1.4], tx: [0, 1], ty: [0, 1] });
    F.text(28, 220, 'x2', { size: 12.5, cls: 'soft' }); F.text(190, 371, 'x1', { size: 12.5, cls: 'soft' });
    const cp = F.el('clipPath', { id: 'w06-xor-clip' }, F.defs); F.rect(50, 80, 280, 280, {}, cp);
    F.s.band = F.path(`M${A.X(-0.4)},${A.Y(0.9)} L${A.X(0.9)},${A.Y(-0.4)} L${A.X(1.4)},${A.Y(-0.4)} L${A.X(1.4)},${A.Y(0.1)} L${A.X(0.1)},${A.Y(1.4)} L${A.X(-0.4)},${A.Y(1.4)} Z`, { fill: 'var(--c-b)', 'clip-path': 'url(#w06-xor-clip)' }); F.s.band.style.opacity = 0;
    F.s.try = F.line(A.X(-0.4), A.Y(0.5), A.X(1.4), A.Y(0.5), { stroke: 'var(--bad)', 'stroke-width': 3, 'stroke-dasharray': '7 5', 'clip-path': 'url(#w06-xor-clip)' }); F.s.try.style.opacity = 0;
    F.s.l1 = F.line(A.X(-0.4), A.Y(0.9), A.X(0.9), A.Y(-0.4), { stroke: 'var(--c-a)', 'stroke-width': 3 }); F.s.l1.style.opacity = 0;
    F.s.l2 = F.line(A.X(0.1), A.Y(1.4), A.X(1.4), A.Y(0.1), { stroke: 'var(--c-c)', 'stroke-width': 3 }); F.s.l2.style.opacity = 0;
    F.s.lab1 = F.text(A.X(-0.3), A.Y(0.62), 'OR', { size: 12.5, weight: 800, fill: 'var(--c-a)', anchor: 'start' }); F.s.lab1.style.opacity = 0;
    F.s.lab2 = F.text(A.X(1.05), A.Y(0.62), 'AND', { size: 12.5, weight: 800, fill: 'var(--c-c)', anchor: 'start' }); F.s.lab2.style.opacity = 0;
    F.s.pts = XP.map(([a, b, t]) => { const g = F.g({ transform: `translate(${A.X(a)},${A.Y(b)})` }); g.__t = { x: A.X(a), y: A.Y(b), s: 1, r: 0 }; if (t) F.circle(0, 0, 13, { fill: 'var(--c-b)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }, g); else F.rect(-11, -11, 22, 22, { rx: 3, fill: 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }, g); F.text(0, 0.5, String(t), { size: 13, weight: 800, fill: '#fff' }, g); return g; });
    // network
    const N = F.s.N = { x1: [450, 160], x2: [450, 300], h1: [610, 160], h2: [610, 300], o: [780, 230] };
    const E = (a, b, wv, ly) => { const [x1, y1] = N[a], [x2, y2] = N[b]; const g = F.g({}); F.line(x1 + 26, y1, x2 - 28, y2, { stroke: 'var(--c-node-line)', 'stroke-width': 2.2 }, g); const t = tag(F, x1 + 26 + (x2 - x1 - 54) * 0.3, y1 + (y2 - y1) * 0.3 + (ly || 0), wv, 'v'); t.style.opacity = 1; g.append(t); return g; };
    F.s.net = F.g({}); F.s.net.style.opacity = 0;
    const netEdges = [E('x1', 'h1', '1', -12), E('x2', 'h1', '1', 14), E('x1', 'h2', '1', -14), E('x2', 'h2', '1', 12), E('h1', 'o', '1', -12), E('h2', 'o', '−1', 12)];
    netEdges.forEach(e => F.s.net.append(e));
    F.s.nodes = {};
    for (const [k, [x, y]] of Object.entries(N)) {
      const b = F.box(x, y, 54, 54, k === 'o' ? 'out' : k, { size: 15, weight: 800, rx: 27 }, F.s.net); F.s.nodes[k] = b;
    }
    F.text(610, 201, 'bias −0.5 (OR)', { size: 11.5, cls: 'soft' }, F.s.net); F.text(610, 341, 'bias −1.5 (AND)', { size: 11.5, cls: 'soft' }, F.s.net); F.text(780, 271, 'bias −0.5', { size: 11.5, cls: 'soft' }, F.s.net);
    F.text(610, 385, 'step activation in every neuron', { size: 12, cls: 'soft' }, F.s.net);
    F.s.v = {}; for (const k of ['x1', 'x2', 'h1', 'h2', 'o']) { const [x, y] = N[k]; F.s.v[k] = tag(F, x, y + (k === 'o' ? 46 : k[0] === 'x' ? 0 : 0), '', 'ok'); F.s.v[k].__t.y = y - 44; F.s.v[k].setAttribute('transform', `translate(${x},${y - 44})`); }
    F.s.no = K.callout(F, 190, 398, 'no single line works', { tone: 'bad', w: 180 });
    F.s.yes = K.callout(F, 190, 398, 'two lines cut out a band', { tone: 'ok', w: 200 });
  },
  steps: [
    { title: 'The XOR problem', say: ['XOR outputs one when exactly one of the two inputs is one.', 'No single straight line can put both ones on one side and both zeros on the other side.'],
      cues: [Q(async F => { for (const p of F.s.pts) await F.pulse(p, 1); }), Q(async F => { await F.show(F.s.try); for (const [a, b] of [[0.2, 0.9], [0.9, 0.2], [0.5, 0.5]]) await F.to(F.s.try, { y1: F.s.A.Y(a), y2: F.s.A.Y(b) }, 550); await F.show(F.s.no); })] },
    { title: 'A hidden layer', say: ['Add a hidden layer with two neurons. The first one fires when at least one input is one. That is OR.', 'The second one fires only when both inputs are one. That is AND. Each hidden neuron draws its own line.'],
      cues: [Q(async F => { F.hide(F.s.try); F.hide(F.s.no); await F.show(F.s.net, 600); await F.show(F.s.l1); F.show(F.s.lab1); }), Q(async F => { await F.show(F.s.l2); await F.show(F.s.lab2); })] },
    { title: 'Forward pass: one and zero', say: ['Feed in one and zero. The OR neuron gets zero point five and fires. The AND neuron gets minus zero point five and stays silent.', 'The output gets one, minus zero, minus one half, which is positive. So the answer is one.'],
      cues: [Q(async F => { await fwd(F, 1, 0, 1); }), Q(async F => { await fwd(F, 1, 0, 2); })] },
    { title: 'Forward pass: one and one', say: ['Now feed in one and one. Both hidden neurons fire.', 'The output gets one, minus one, minus one half, which is negative. So the answer is zero. The network solves XOR.'],
      cues: [Q(async F => { await fwd(F, 1, 1, 1); }), Q(async F => { await fwd(F, 1, 1, 2); })] },
    { title: 'Why non-linearity', say: ['Together the two lines cut out a band that holds exactly the two ones.', 'Without a non-linear activation, two layers would collapse into one straight line again. Non-linearity gives depth its power.'],
      cues: [Q(async F => { await F.to(F.s.band, { opacity: 0.16 }, 600); await F.show(F.s.yes); }), Q(async F => { await F.pulse(F.s.nodes.h1, 1); await F.pulse(F.s.nodes.h2, 1); })] }
  ]
};
async function fwd(F, a, b, part) {
  const st = z => (z > 0 ? 1 : 0), s1 = a + b - 0.5, s2 = a + b - 1.5, h1 = st(s1), h2 = st(s2), so = h1 - h2 - 0.5, o = st(so);
  const V = F.s.v, N = F.s.nodes;
  if (part === 1) {
    V.o.style.opacity = 0; F.to(N.o.rect, { fill: 'var(--c-node)', stroke: 'var(--c-node-line)' }, 200);
    V.x1.set('x1 = ' + a); V.x2.set('x2 = ' + b); F.show(V.x1); await F.show(V.x2);
    V.h1.set('sum ' + fx(s1, 1) + ' → ' + h1); V.h2.set('sum ' + fx(s2, 1) + ' → ' + h2);
    F.show(V.h1); await F.show(V.h2);
    F.to(N.h1.rect, { fill: h1 ? 'var(--c-open)' : 'var(--c-node)', stroke: h1 ? 'var(--c-b)' : 'var(--c-node-line)' }, 400);
    await F.to(N.h2.rect, { fill: h2 ? 'var(--c-open)' : 'var(--c-node)', stroke: h2 ? 'var(--c-b)' : 'var(--c-node-line)' }, 400);
  } else {
    V.o.set('sum ' + fx(so, 1) + ' → ' + o); await F.show(V.o);
    await F.to(N.o.rect, { fill: o ? 'var(--ok-bg)' : 'var(--bad-bg)', stroke: o ? 'var(--ok)' : 'var(--bad)' }, 400);
    await F.pulse(F.s.pts[a * 2 + b], 2);
  }
}

/* ================= scene 4: computation graph and backpropagation ================= */
// x = 2, w = 3, b = -1, y = 4: q = wx = 6, z = q + b = 5, e = z - y = 1, L = e^2 = 1
// gradients: dL/de = 2e = 2, dL/dz = 2, dL/db = 2, dL/dq = 2, dL/dw = 2x = 4, dL/dx = 2w = 6
// step with learning rate 0.1: w = 3 - 0.4 = 2.6, b = -1 - 0.2 = -1.2 -> z = 5.2 - 1.2 = 4, L = 0 (checked)
const BN = { w: [70, 110], x: [70, 210], mul: [240, 160], b: [240, 300], add: [410, 230], y: [410, 350], sub: [580, 290], sq: [730, 290], L: [850, 290] };
const sceneBack = {
  id: 'backprop', title: 'Backpropagation on a computation graph', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'Loss = (w·x + b − y)²', 'blue = values going forward · orange = gradients going backward');
    const N = BN, edges = [['w', 'mul'], ['x', 'mul'], ['mul', 'add'], ['b', 'add'], ['add', 'sub'], ['y', 'sub'], ['sub', 'sq'], ['sq', 'L']];
    F.s.E = {};
    edges.forEach(([a, b]) => { const [x1, y1] = N[a], [x2, y2] = N[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy); F.s.E[a + b] = F.arrow(x1 + dx / L * 32, y1 + dy / L * 26, x2 - dx / L * 34, y2 - dy / L * 28, { color: 'var(--c-node-line)', w: 2.2 }); F.s.E[a + b].style.opacity = 0; });
    F.s.B = {};
    const vars = { w: 'w', x: 'x', b: 'b', y: 'y (target)', L: 'loss' }, ops = { mul: '×', add: '+', sub: '−', sq: 'square' };
    for (const [k, [x, y]] of Object.entries(N)) {
      const isOp = k in ops, b = F.box(x, y, isOp ? (k === 'sq' ? 74 : 50) : 62, isOp ? 50 : 44, isOp ? ops[k] : '', { size: isOp ? (k === 'sq' ? 14 : 24) : 18, weight: 800, rx: isOp ? 25 : 10, fill: isOp ? 'var(--c-open)' : 'var(--c-node)' });
      b.style.opacity = 0; F.s.B[k] = b;
      if (!isOp) F.text(x, y - 34, vars[k], { size: 12.5, cls: 'soft' });
    }
    // forward value tags (on edges) and gradient tags
    const mid = (a, b, ox, oy) => [(N[a][0] + N[b][0]) / 2 + ox, (N[a][1] + N[b][1]) / 2 + oy];
    const FV = { q: mid('mul', 'add', 0, -22), z: mid('add', 'sub', 0, -22), e: mid('sub', 'sq', 0, -24), Lv: [N.L[0], N.L[1]] };
    F.s.fv = { q: tag(F, ...FV.q, 'q = 6', 'v'), z: tag(F, ...FV.z, 'z = 5', 'v'), e: tag(F, ...FV.e, 'e = 1', 'v') };
    F.s.gv = { L: tag(F, N.L[0], N.L[1] + 44, '1', 'g'), e: tag(F, ...mid('sub', 'sq', 0, 24), '2', 'g'), z: tag(F, ...mid('add', 'sub', 0, 24), '2', 'g'), b: tag(F, N.b[0] + 92, N.b[1] + 4, '∂L/∂b = 2', 'g'), q: tag(F, ...mid('mul', 'add', 0, 24), '2', 'g'), w: tag(F, N.w[0] + 2, N.w[1] + 40, '∂L/∂w = 4', 'g'), x: tag(F, N.x[0] + 2, N.x[1] + 40, '∂L/∂x = 6', 'g') };
    F.s.loc = { sq: tag(F, N.sq[0], N.sq[1] - 44, 'slope 2e = 2', 'ok'), mul: tag(F, N.mul[0] + 8, N.mul[1] - 44, 'to w: × x, to x: × w', 'ok') };
    F.s.rule = K.callout(F, 650, 110, 'chain rule: gradient in = gradient out\n× local slope of the node', { tone: 'warn', w: 290 });
    F.s.upd = K.callout(F, 650, 110, 'w = 3 − 0.1 × 4 = 2.6\nb = −1 − 0.1 × 2 = −1.2', { tone: 'accent', w: 230 });
    F.s.done = K.callout(F, 690, 390, 'new output 4 = target: loss 0', { tone: 'ok', w: 250 });
  },
  steps: [
    { title: 'A computation graph', say: ['Any formula can be drawn as a computation graph: small operations joined by arrows.', 'This one computes the error of a tiny model: w times x, plus b, minus the target y, squared.'],
      cues: [Q(async F => { for (const k of ['w', 'x', 'mul', 'b', 'add', 'y', 'sub', 'sq', 'L']) { F.show(F.s.B[k], 250); await F.wait(70); } }), Q(async F => { for (const e of Object.values(F.s.E)) { F.show(e, 250); await F.wait(60); } })] },
    { title: 'Forward pass', say: ['In the forward pass, numbers flow from left to right.', 'With w three, x two, b minus one and target four, we get six, then five. The error is one, and the loss is one.'],
      cues: [Q(async F => { Object.values(F.s.B).forEach(b => b.style.opacity = 1); Object.values(F.s.E).forEach(e => e.style.opacity = 1); setVals(F, { w: 3, x: 2, b: -1, y: 4 }); for (const k of ['w', 'x', 'b', 'y']) F.pulse(F.s.B[k], 1); await F.wait(500); }),
             Q(async F => { for (const k of ['q', 'z', 'e']) { await F.show(F.s.fv[k], 350); } F.setText(F.s.B.L.label, '1', 0, 18); await F.pulse(F.s.B.L, 2); })] },
    { title: 'Backward pass', say: ['In the backward pass, gradients flow from right to left. We start with a one at the loss.', 'Each node multiplies the incoming gradient by its own local slope. This is the chain rule.'],
      cues: [Q(async F => { await F.show(F.s.gv.L); }), Q(async F => { await F.show(F.s.rule); })] },
    { title: 'The numbers', say: ['The square has slope two times e, which is two. Plus and minus pass the gradient on unchanged.', 'The multiply node sends to w the gradient times x, which is four, and to x the gradient times w, which is six.'],
      cues: [Q(async F => { await F.show(F.s.loc.sq); for (const k of ['e', 'z', 'q']) await F.show(F.s.gv[k], 350); await F.show(F.s.gv.b, 350); }),
             Q(async F => { F.hide(F.s.rule); await F.show(F.s.loc.mul); await F.show(F.s.gv.w); await F.show(F.s.gv.x); })] },
    { title: 'One learning step', say: ['Now take a gradient descent step with learning rate zero point one. w becomes two point six, and b becomes minus one point two.', 'Run forward again. The output is exactly four, and the loss is zero. Backpropagation told every weight how to change.'],
      cues: [Q(async F => { F.hide(F.s.rule, 0); await F.show(F.s.upd); setVals(F, { w: 2.6, x: 2, b: -1.2, y: 4 }); F.pulse(F.s.B.w, 2); await F.pulse(F.s.B.b, 2); }),
             Q(async F => { for (const k of ['L', 'e', 'z', 'q', 'b', 'w', 'x']) F.hide(F.s.gv[k], 300); F.hide(F.s.loc.sq); F.hide(F.s.loc.mul); F.s.fv.q.set('q = 5.2'); F.s.fv.z.set('z = 4'); F.s.fv.e.set('e = 0'); F.setText(F.s.B.L.label, '0', 0, 18); await F.to(F.s.B.L.rect, { fill: 'var(--ok-bg)', stroke: 'var(--ok)' }, 400); await F.show(F.s.done); })] }
  ]
};
function setVals(F, v) { for (const k of ['w', 'x', 'b', 'y']) F.setText(F.s.B[k].label, mn(v[k]), 0, 18); }

/* ================= exercises ================= */
const exNeuron = {
  title: 'Output of one neuron', random: true,
  gen(r) {
    const x = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)], w = [0, 1, 2].map(() => r.pick([-1, -0.5, 0.5, 1, 1.5, 2])), b = r.pick([-2, -1, -0.5, 0, 0.5, 1]);
    const z = x[0] * w[0] + x[1] * w[1] + x[2] * w[2] + b, out = Math.max(0, z);
    return {
      prompt: `A neuron has inputs $x = (${x.join(', ')})$, weights $w = (${w.join(', ')})$ and bias $b = ${b}$. It uses the <b>ReLU</b> activation. What is its output?`,
      hint: 'First z = w1·x1 + w2·x2 + w3·x3 + b. Then ReLU(z) = z if z > 0, otherwise 0.',
      answer: `z = ${x.map((xi, i) => `(${w[i]})(${xi})`).join(' + ')} + (${b}) = ${fx(z, 2).replace(/\.?0+$/, '') || '0'}. ReLU gives <b>${fx(out, 2).replace(/\.?0+$/, '') || '0'}</b>.${z <= 0 ? ' (The sum is not positive, so the neuron is silent.)' : ''}`,
      check: { type: 'number', answer: out, tol: 0.01 }
    };
  }
};
const exAct = {
  title: 'Evaluate an activation function', random: true,
  gen(r) {
    const z = r.pick([-3, -2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3]), which = r.pick(['sigmoid', 'tanh', 'ReLU']);
    const v = which === 'sigmoid' ? sig(z) : which === 'tanh' ? Math.tanh(z) : Math.max(0, z);
    const how = which === 'sigmoid' ? `$\\sigma(z) = 1/(1+e^{-z}) = 1/(1+e^{${-z}}) = 1/(1 + ${fx(Math.exp(-z), 3)})$` : which === 'tanh' ? `$\\tanh(z) = (e^z - e^{-z})/(e^z + e^{-z})$` : 'ReLU(z) = max(0, z)';
    return {
      prompt: `What is <b>${which}</b>(${z})? Give two decimals.`,
      hint: 'sigmoid(z) = 1 / (1 + e^(−z)); tanh is the S curve from −1 to 1; ReLU(z) = max(0, z).',
      answer: `${how} = <b>${fx(v, 2)}</b>.`,
      check: { type: 'number', answer: +fx(v, 2), tol: 0.011 }
    };
  }
};
const exBack = {
  title: 'Backpropagate one gradient', random: true,
  gen(r) {
    let x, w, b, y, e; do { x = r.int(-3, 4); w = r.int(-3, 3); b = r.int(-3, 3); y = r.int(-4, 6); e = w * x + b - y; } while (!e || !x);
    const g = 2 * e * x;
    return {
      prompt: `Use the graph from the scene: $L = (w\\,x + b - y)^2$ with $x = ${x}$, $w = ${w}$, $b = ${b}$ and target $y = ${y}$. What is the gradient $\\partial L / \\partial w$?`,
      hint: 'Forward: e = w·x + b − y. Backward: the square gives 2e, the plus and minus pass it on, and the multiply node multiplies by x.',
      answer: `Forward: w·x = ${w * x}, z = ${w * x + b}, e = ${e}, L = ${e * e}. Backward: ∂L/∂e = 2e = ${2 * e}; ∂L/∂w = 2e · x = ${2 * e} × ${x} = <b>${g}</b>. ${g > 0 ? 'Positive: decreasing w lowers the loss.' : 'Negative: increasing w lowers the loss.'}`,
      check: { type: 'number', answer: g, tol: 0.01 }
    };
  }
};
const exParams = {
  title: 'Count the parameters', random: true,
  gen(r) {
    const nin = r.int(2, 10), hs = r.chance(0.5) ? [r.int(3, 16)] : [r.int(3, 12), r.int(2, 8)], nout = r.int(1, 4), sizes = [nin, ...hs, nout];
    let tot = 0; const parts = []; for (let i = 1; i < sizes.length; i++) { const p = (sizes[i - 1] + 1) * sizes[i]; tot += p; parts.push(`(${sizes[i - 1]} + 1) × ${sizes[i]} = ${p}`); }
    return {
      prompt: `A fully connected network has ${nin} inputs, ${hs.length === 1 ? 'one hidden layer of ' + hs[0] + ' neurons' : 'two hidden layers of ' + hs[0] + ' and ' + hs[1] + ' neurons'}, and ${nout} output neuron${nout > 1 ? 's' : ''}. Every neuron has one weight per input and one bias. How many parameters (weights plus biases) does it have?`,
      hint: 'Between two layers with a and b neurons there are a·b weights and b biases, so (a + 1)·b parameters.',
      answer: parts.join('<br>') + `<br>Total = <b>${tot}</b>.`,
      check: { type: 'number', answer: tot, tol: 0.01 }
    };
  }
};

Course.lecture({
  id: 'w06', num: 6, week: 6, kind: 'lecture', title: 'Artificial neural networks (part 1)',
  lede: 'One neuron is a weighted sum with a bend. Stack them in layers and they can draw any boundary. Backpropagation, the chain rule run backwards, tells every weight how to change.',
  clos: [2], widgets: ['mlp'],
  goals: ['compute the output of an artificial <b>neuron</b>: weighted sum, bias, activation',
    'compare <b>step, sigmoid, tanh and ReLU</b> and say why smooth activations are needed for gradient descent',
    'explain why a single perceptron cannot solve <b>XOR</b> and how a hidden layer does',
    'run a <b>forward pass</b> and a <b>backward pass</b> on a small computation graph using the chain rule',
    'count the parameters of a <b>multi-layer perceptron</b> and train one in the playground'],
  chapters: [
    { id: 'neuron', title: 'The artificial neuron', blocks: [
      { html: '<p>Last week the perceptron drew one straight line. A modern neuron does the same weighted sum, $z = w_1x_1 + \\dots + w_nx_n + b$, but then applies a smooth <b>activation function</b> $g(z)$. Its output $a = g(z)$ is passed to the next layer.</p>' },
      { scene: sceneNeuron },
      { exercise: exNeuron }
    ] },
    { id: 'act', title: 'Activation functions', blocks: [
      { scene: sceneActs },
      { exercise: exAct },
      { quiz: { q: 'Why is the step function not used in networks trained by gradient descent?', options: ['Its slope is zero almost everywhere, so the gradient gives no direction', 'It is too slow to compute', 'Its output can be negative', 'It only works with one input'], correct: 0, why: 'Gradient descent needs slopes. The step function is flat on both sides (and jumps at zero), so every gradient through it is zero.' } }
    ] },
    { id: 'xor', title: 'Layers: the multi-layer perceptron', blocks: [
      { html: '<p>A <b>multi-layer perceptron</b> (MLP) has an input layer, one or more <b>hidden layers</b>, and an output layer. Every neuron is connected to every neuron in the next layer (<b>fully connected</b>). Each hidden neuron draws its own line; the next layer combines those lines into bends and regions.</p>' },
      { scene: sceneXor },
      { quiz: { q: 'A network has two layers but uses no activation function (a(z) = z everywhere). What can it represent?', options: ['Only linear functions, like a single layer', 'Any function', 'Only XOR', 'Nothing: it cannot be trained'], correct: 0, why: 'A linear function of a linear function is still linear. Without a non-linear activation, extra layers add nothing.' } },
      { exercise: exParams }
    ] },
    { id: 'backprop', title: 'Computation graphs and backpropagation', blocks: [
      { html: '<p>To train with gradient descent we need $\\partial L / \\partial w$ for <b>every</b> weight, often millions of them. <b>Backpropagation</b> computes all of them in one backward sweep: each node multiplies the gradient coming from its output by its own <b>local derivative</b> (the chain rule), and passes the result to its inputs.</p>' },
      { scene: sceneBack },
      { exercise: exBack },
      { note: '<b>Local rules to remember.</b> Plus node: passes the gradient unchanged to both inputs. Multiply node: sends to each input the gradient times the <i>other</i> input. Square node: multiplies by $2e$. Sigmoid: multiplies by $\\sigma(z)(1-\\sigma(z))$. ReLU: passes the gradient if $z > 0$, else blocks it.' }
    ] },
    { id: 'play', title: 'Train a network yourself', blocks: [
      { html: '<p>The playground trains a real MLP in your browser with backpropagation and gradient descent. The background colour is the network\'s answer for every point of the plane; watch the boundary bend as training runs.</p>' },
      { widget: 'mlp' },
      { note: '<b>Try this.</b> (1) XOR with 1 hidden neuron: it cannot be solved (one line). With 3 or 4 neurons it is solved; with 2 it sometimes gets stuck in a local minimum. (2) Circles: how many hidden neurons do you need? (3) Spirals: use two hidden layers with 8 neurons and be patient. (4) Spirals with ReLU and the largest learning rate: the loss sticks at 0.69 because the neurons "die". (5) Switch the activation from tanh to ReLU and compare the shapes of the boundary.' },
      { quiz: { q: 'What does backpropagation compute?', options: ['The gradient of the loss with respect to every weight', 'The output of the network', 'The best learning rate', 'The number of hidden neurons'], correct: 0, why: 'Backpropagation is an efficient way to get all partial derivatives of the loss. Gradient descent then uses them to update the weights.' } }
    ] }
  ]
});
})();

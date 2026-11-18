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
  (o.ty || []).forEach(t => { F.line(o.x, Y(t), o.x + o.w, Y(t), { stroke: 'var(--c-grid)' }, g); F.text(o.x - 8, Y(t), String(t), { size: 11, cls: 'soft', anchor: 'end' }, g); });
  if (o.xl) F.text(o.x + o.w / 2, o.y + o.h + 30, o.xl, { size: 12.5, cls: 'soft' }, g);
  if (o.yl) { const t = F.text(o.x - 30, o.y + o.h / 2, o.yl, { size: 12.5, cls: 'soft' }, g); t.setAttribute('transform', `rotate(-90 ${o.x - 30} ${o.y + o.h / 2})`); }
  return { X, Y, g };
}
function dot(F, x, y, r, attrs, parent) { const g = F.g({ transform: `translate(${x},${y})` }, parent); g.__t = { x, y, s: 1, r: 0 }; g.c = F.circle(0, 0, r, attrs, g); return g; }
const fx = (v, d) => { const s = (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); return s === '-0.00' || s === '-0.0' || s === '-0' ? s.slice(1) : s; };
const curvePath = (A, f, a, b, n = 200) => { let d = ''; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; d += (i ? 'L' : 'M') + A.X(x).toFixed(1) + ',' + A.Y(f(x)).toFixed(1); } return d; };

/* ================= scene 1: hill climbing and simulated annealing ================= */
const land = x => 3 * Math.exp(-((x - 2.5) ** 2) / 1.2) + 5 * Math.exp(-((x - 7.5) ** 2) / 1.5) + 0.5;
// checked: f(1)=0.96 f(1.5)=1.80 f(2)=2.94 f(2.5)=3.50 (local max) f(3)=2.94 ... f(5)=0.59 ... f(7.5)=5.50 (global max)
const sceneHill = {
  id: 'hill', title: 'Local search: climbing a landscape', w: 900, h: 410, wide: true,
  build(F) {
    K.title(F, 'Find the highest point', 'height = how good a solution is · we only see our neighbours');
    const A = F.s.A = axes(F, { x: 50, y: 70, w: 640, h: 280, xr: [0, 10], yr: [0, 6.4], tx: [0, 2, 4, 6, 8, 10], ty: [0, 2, 4, 6], xl: 'solution x' });
    F.s.area = F.path(curvePath(A, land, 0, 10) + ` L${A.X(10)},${A.Y(0)} L${A.X(0)},${A.Y(0)} Z`, { fill: 'var(--c-closed)', stroke: 'none' }); F.s.area.style.opacity = 0;
    F.s.curve = F.path(curvePath(A, land, 0, 10), { stroke: 'var(--c-a)', 'stroke-width': 3.5 }); F.s.curve.style.opacity = 0;
    F.s.trail = F.g({});
    F.s.bx = 1; F.s.ball = dot(F, A.X(1), A.Y(land(1)) - 11, 11, { fill: 'var(--c-c)', stroke: 'var(--c-ink)', 'stroke-width': 2, filter: 'url(#fx-soft)' }); F.s.ball.style.opacity = 0;
    F.s.val = F.text(A.X(1), A.Y(land(1)) - 36, '', { size: 12.5, weight: 700, mono: true }); F.s.val.style.opacity = 0;
    F.s.loc = K.callout(F, 260, 92, 'local maximum: 3.5', { tone: 'warn', w: 170 });
    F.s.glob = K.callout(F, 560, 92, 'global maximum: 5.5', { tone: 'ok', w: 175 });
    // thermometer
    F.text(790, 84, 'temperature', { size: 13, weight: 700 });
    F.rect(772, 100, 36, 230, { rx: 18, fill: 'var(--card)', stroke: 'var(--line)', 'stroke-width': 1.5 });
    F.s.temp = F.rect(778, 324, 24, 0, { rx: 12, fill: 'var(--bad)' });
    F.s.tl = F.text(790, 342, 'off', { size: 12.5, cls: 'soft' });
    F.s.acc = K.callout(F, 790, 380, 'accept a step down\nwith chance e^(−drop / T)', { tone: 'accent', w: 190 });
  },
  steps: [
    { title: 'The landscape', say: ['Many AI problems mean finding the best point in a landscape. Height says how good a solution is.', 'Local search keeps one current solution and moves to a neighbour.'],
      cues: [Q(async F => { F.show(F.s.area, 600); await F.draw(F.s.curve, 1100); }), Q(async F => { await F.show(F.s.ball); F.show(F.s.val); setVal(F); await F.pulse(F.s.ball, 1); })] },
    { title: 'Hill climbing', say: ['Hill climbing always moves to the best neighbour, if it is higher.', 'Starting on the left, it climbs to the top of the small hill.'],
      cues: [Q(async F => { F.s.ball.style.opacity = 1; F.s.val.style.opacity = 1; await F.pulse(F.s.ball, 1); }), Q(async F => { for (const x of [1.5, 2, 2.5]) await roll(F, x, 450, true); })] },
    { title: 'Stuck on a local maximum', say: ['Here both neighbours are lower, so hill climbing stops.', 'But this is only a local maximum. The highest peak, the global maximum, is on the right.'],
      cues: [Q(async F => { await F.show(F.s.loc); await F.pulse(F.s.ball, 2); }), Q(async F => { await F.show(F.s.glob); })] },
    { title: 'Simulated annealing', say: ['Simulated annealing sometimes accepts a step down. The chance is high when the temperature is high.', 'So it can cross the valley and climb the highest peak.'],
      cues: [Q(async F => { F.hide(F.s.loc); await setTemp(F, 1); await F.show(F.s.acc); }), Q(async F => { for (const x of [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7]) await roll(F, x, 300, true); })] },
    { title: 'Cooling down', say: ['Slowly the temperature goes down, and bad moves become rare.', 'At the end it behaves like hill climbing, but now on the right hill.'],
      cues: [Q(async F => { await setTemp(F, 0.15); }), Q(async F => { await roll(F, 7.5, 500, true); F.hide(F.s.acc); await F.pulse(F.s.ball, 2); })] }
  ]
};
function setVal(F) { const A = F.s.A, x = F.s.bx; F.setText(F.s.val, 'height ' + fx(land(x), 2), A.X(x), 14); F.set(F.s.val, { x: A.X(x), y: A.Y(land(x)) - 38 }); F.s.val.querySelectorAll('tspan').forEach(t => t.setAttribute('x', A.X(x))); }
async function roll(F, x1, ms, trail) {
  const A = F.s.A, x0 = F.s.bx; F.s.bx = x1;
  if (trail) F.circle(A.X(x0), A.Y(land(x0)), 3.5, { fill: 'var(--c-c)', opacity: 0.6 }, F.s.trail);
  await tw(F, ms, t => { const x = x0 + (x1 - x0) * t; F.s.ball.__t.x = A.X(x); F.s.ball.__t.y = A.Y(land(x)) - 11; F.s.ball.setAttribute('transform', `translate(${A.X(x)},${A.Y(land(x)) - 11})`); });
  setVal(F);
}
async function setTemp(F, frac) { const hgt = 220 * frac; F.setText(F.s.tl, frac > 0.5 ? 'hot' : 'cold', 790, 14); await F.to(F.s.temp, { y: 324 - hgt, height: hgt, fill: frac > 0.5 ? 'var(--bad)' : 'var(--c-b)' }, 700); }

/* ================= scene 2: gradient descent on one weight ================= */
const L1 = w => (w - 3) ** 2 + 1, dL1 = w => 2 * (w - 3);
// learning rate 0.25 from w = 0: 0 -> 1.5 -> 2.25 -> 2.625 -> 2.8125 ; loss 10 -> 3.25 -> 1.5625 -> 1.140625 -> 1.0352 (checked)
const sceneRoll = {
  id: 'roll', title: 'Gradient descent: roll downhill', w: 720, h: 400,
  build(F) {
    K.title(F, 'Loss = (w − 3)² + 1', 'we want the weight w with the smallest loss');
    const A = F.s.A = axes(F, { x: 60, y: 66, w: 420, h: 290, xr: [-1, 6.5], yr: [0, 18], tx: [-1, 0, 1, 2, 3, 4, 5, 6], ty: [0, 5, 10, 15], xl: 'weight w', yl: 'loss' });
    F.s.curve = F.path(curvePath(A, L1, -1, 6.5), { stroke: 'var(--c-a)', 'stroke-width': 3.5 }); F.s.curve.style.opacity = 0;
    F.s.minm = F.g({}); F.line(A.X(3), A.Y(0), A.X(3), A.Y(1), { stroke: 'var(--ok)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, F.s.minm); F.text(A.X(3), A.Y(0) - 12, 'best w = 3', { size: 12, weight: 700, fill: 'var(--ok)' }, F.s.minm); F.s.minm.style.opacity = 0;
    F.s.tan = F.line(0, 0, 0, 0, { stroke: 'var(--c-c)', 'stroke-width': 2.5, 'stroke-dasharray': '7 4' }); F.s.tan.style.opacity = 0;
    F.s.trail = F.g({});
    F.s.w = 0; F.s.ball = dot(F, A.X(0), A.Y(L1(0)), 10, { fill: 'var(--c-b)', stroke: 'var(--c-ink)', 'stroke-width': 2, filter: 'url(#fx-soft)' }); F.s.ball.style.opacity = 0;
    F.s.arr = F.arrow(0, 0, 1, 0, { color: 'var(--c-c)', w: 3.5 }); F.s.arr.style.opacity = 0;
    F.rect(505, 80, 200, 220, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' });
    const R = (y, lab) => { F.text(605, y, lab, { size: 12.5, cls: 'soft' }); return F.text(605, y + 22, '–', { size: 19, weight: 750, mono: true }); };
    F.s.tw = R(100, 'weight w'); F.s.tg = R(152, 'slope (gradient)'); F.s.tl = R(204, 'loss');
    F.text(605, 270, 'learning rate 0.25', { size: 12.5, weight: 700, fill: 'var(--c-b)' });
    F.s.rule = K.callout(F, 605, 338, 'new w = w − 0.25 × slope', { tone: 'accent', w: 200 });
    F.s.done = K.callout(F, 270, 100, 'steps shrink near the bottom', { tone: 'ok', w: 230 });
  },
  steps: [
    { title: 'The loss curve', say: ['In machine learning the landscape is the loss, which says how wrong the model is. We want its lowest point.', 'Here the loss depends on one weight, w. The best value of w is three.'],
      cues: [Q(async F => { await F.draw(F.s.curve, 1000); }), Q(async F => { await F.show(F.s.minm); await F.show(F.s.ball); panel(F); })] },
    { title: 'The slope', say: ['The gradient is the slope of the curve at the current point. At w equals zero, the slope is minus six.', 'Gradient descent moves against the slope. The slope is negative, so w must go up.'],
      cues: [Q(async F => { F.s.ball.style.opacity = 1; panel(F); tangent(F); await F.show(F.s.tan); }), Q(async F => { arrow(F); await F.show(F.s.arr); await F.show(F.s.rule); })] },
    { title: 'One step', say: ['The step is the learning rate times the slope. With a learning rate of zero point two five, the step is one and a half.', 'The ball moves to one point five, and the loss drops from ten to three point two five.'],
      cues: [Q(async F => { await F.pulse(F.s.rule, 1); }), Q(async F => { F.hide(F.s.arr, 200); await gdTo(F, 1.5); })] },
    { title: 'Keep going', say: ['Near the bottom the slope gets smaller, so the steps get smaller too.', 'The ball settles at w equals three, where the slope is zero.'],
      cues: [Q(async F => { await gdTo(F, 2.25); await gdTo(F, 2.625); }), Q(async F => { await gdTo(F, 2.8125); await gdTo(F, 2.90625); await F.show(F.s.done); })] }
  ]
};
function panel(F) { const w = F.s.w; F.setText(F.s.tw, fx(w, 3).replace(/\.?0+$/, '') || '0', 605, 19); F.setText(F.s.tg, fx(dL1(w), 3).replace(/\.?0+$/, ''), 605, 19); F.setText(F.s.tl, fx(L1(w), 3).replace(/\.?0+$/, ''), 605, 19); }
function tangent(F) { const A = F.s.A, w = F.s.w, s = dL1(w), a = w - 1.1, b = w + 1.1; F.set(F.s.tan, { x1: A.X(a), y1: A.Y(L1(w) + s * (a - w)), x2: A.X(b), y2: A.Y(L1(w) + s * (b - w)) }); }
function arrow(F) { const A = F.s.A, w = F.s.w, nw = w - 0.25 * dL1(w); F.set(F.s.arr, { x1: A.X(w), y1: A.Y(L1(w)) + 24, x2: A.X(nw), y2: A.Y(L1(w)) + 24 }); }
async function gdTo(F, w1) {
  const A = F.s.A, w0 = F.s.w; F.s.w = w1;
  F.circle(A.X(w0), A.Y(L1(w0)), 4, { fill: 'var(--c-b)', opacity: 0.55 }, F.s.trail);
  await tw(F, 650, t => { const w = w0 + (w1 - w0) * t; F.s.ball.__t.x = A.X(w); F.s.ball.__t.y = A.Y(L1(w)); F.s.ball.setAttribute('transform', `translate(${A.X(w)},${A.Y(L1(w))})`); });
  panel(F); tangent(F);
}

/* ================= scene 3: the learning rate ================= */
const ETAS = [0.05, 0.25, 1.05];
const pathFor = eta => { const p = [0]; for (let i = 0; i < 5; i++) p.push(p[i] - eta * dL1(p[i])); return p; };
// checked: 0.05 -> 0, 0.3, 0.57, 0.813, 1.032, 1.229 ; 0.25 -> 0, 1.5, 2.25, 2.625, 2.8125, 2.906 ; 1.05 -> 0, 6.3, -0.63, 6.993, -1.392, 7.832 (loss 10, 11.9, 14.2, 16.9, 20.3, 24.3)
const sceneLR = {
  id: 'lr', title: 'Too small, about right, too large', w: 900, h: 400, wide: true,
  build(F) {
    K.title(F, 'The same loss, three learning rates', 'five steps of gradient descent from w = 0');
    F.s.P = ETAS.map((eta, i) => {
      const x0 = 50 + i * 290, A = axes(F, { x: x0, y: 92, w: 240, h: 230, xr: [-2.5, 8.5], yr: [0, 32], tx: [0, 3, 6], ty: [0, 10, 20, 30], xl: 'weight w' });
      F.path(curvePath(A, L1, -2.5, 8.5), { stroke: 'var(--c-a)', 'stroke-width': 2.5 });
      F.text(x0 + 120, 76, 'learning rate ' + eta, { size: 14, weight: 750, fill: ['var(--warn)', 'var(--ok)', 'var(--bad)'][i] });
      const pts = pathFor(eta), g = F.g({});
      const segs = [], dots = [];
      pts.forEach((w, k) => { if (k) { const l = F.line(A.X(pts[k - 1]), A.Y(L1(pts[k - 1])), A.X(w), A.Y(L1(w)), { stroke: 'var(--c-b)', 'stroke-width': 2, opacity: 0.8 }, g); l.style.opacity = 0; segs.push(l); } const d = F.circle(A.X(w), A.Y(L1(w)), k ? 5.5 : 7, { fill: k ? 'var(--c-b)' : 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 1.5 }, g); d.style.opacity = k ? 0 : 1; dots.push(d); });
      const tag = K.callout(F, x0 + 120, 380, ['slow: still far away', 'fast and stable', 'diverges: loss grows'][i], { tone: ['warn', 'ok', 'bad'][i], w: 180 });
      return { A, segs, dots, tag };
    });
  },
  steps: [
    { title: 'Too small', say: ['With a tiny learning rate, like zero point zero five, every step is small.', 'After five steps we are still far from the bottom. Training is slow.'],
      cues: [Q(async F => { await walk(F, 0); }), Q(async F => { await F.show(F.s.P[0].tag); })] },
    { title: 'About right', say: ['With zero point two five, every step halves the distance to the minimum.', 'We arrive quickly.'],
      cues: [Q(async F => { await walk(F, 1); }), Q(async F => { await F.show(F.s.P[1].tag); })] },
    { title: 'Too large', say: ['With one point zero five, each step jumps over the valley and lands higher.', 'The loss grows at every step: the training diverges.'],
      cues: [Q(async F => { await walk(F, 2); }), Q(async F => { await F.show(F.s.P[2].tag); await F.pulse(F.s.P[2].dots[5], 2); })] },
    { title: 'The lesson', say: ['The learning rate is the most important setting of gradient descent.', 'Too small is slow, and too large explodes. In practice we try a few values and compare.'],
      cues: [Q(async F => { await F.pulse(F.s.P[1].tag, 1); }), Q(async F => { for (const p of F.s.P) F.pulse(p.tag, 1); await F.wait(600); })] }
  ]
};
async function walk(F, i) { const P = F.s.P[i]; for (let k = 0; k < P.segs.length; k++) { await F.show(P.segs[k], 260); await F.show(P.dots[k + 1], 160); } }

/* ================= scene 4: two weights, contour map, SGD ================= */
const L2 = (x, y) => x * x + 5 * y * y;
// learning rate 0.15: x -> 0.7 x, y -> -0.5 y (zig-zag in the narrow direction)
const sceneContour = {
  id: 'contour', title: 'Two weights: a map of the loss', w: 900, h: 400, wide: true,
  build(F) {
    K.title(F, 'Loss = x² + 5 y², seen from above', 'each ring joins points with the same loss (like a hiking map)');
    const U = 50, cx = 320, cy = 225, X = x => cx + x * U, Y = y => cy - y * U; F.s.X = X; F.s.Y = Y;
    F.rect(cx - 5.4 * U, cy - 2.7 * U, 10.8 * U, 5.4 * U, { rx: 10, fill: 'var(--card)', stroke: 'var(--line)' });
    F.s.rings = [1, 4, 9, 16, 25].map((c, i) => { const e = F.el('ellipse', { cx, cy, rx: Math.sqrt(c) * U, ry: Math.sqrt(c / 5) * U, fill: 'none', stroke: 'var(--c-a)', 'stroke-width': 1.6, opacity: 0.4 + 0.12 * (4 - i) }); e.style.opacity = 0; return e; });
    F.s.minD = F.circle(cx, cy, 6, { fill: 'var(--ok)' }); F.s.minD.style.opacity = 0;
    // full gradient descent path
    let x = -4.5, y = 2; const gd = [[x, y]]; for (let k = 0; k < 14; k++) { x = 0.7 * x; y = -0.5 * y; gd.push([x, y]); }
    F.s.gd = F.path(gd.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(''), { stroke: 'var(--c-b)', 'stroke-width': 3, 'stroke-linejoin': 'round' }); F.s.gd.style.opacity = 0;
    F.s.gdDots = F.g({}); gd.forEach(p => F.circle(X(p[0]), Y(p[1]), 3.5, { fill: 'var(--c-b)' }, F.s.gdDots)); F.s.gdDots.style.opacity = 0;
    // stochastic path: same start, noisy gradient (fixed seed so it is the same every time)
    let s = 12345; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; const gs = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    x = -4.5; y = -2; const sg = [[x, y]]; for (let k = 0; k < 30; k++) { x -= 0.08 * (2 * x + 4 * gs()); y -= 0.08 * (10 * y + 4 * gs()); y = Math.max(-2.5, Math.min(2.5, y)); sg.push([x, y]); }
    F.s.sg = F.path(sg.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(''), { stroke: 'var(--c-c)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }); F.s.sg.style.opacity = 0;
    F.s.start1 = F.circle(X(-4.5), Y(2), 7, { fill: 'var(--c-b)', stroke: 'var(--c-ink)', 'stroke-width': 1.5 }); F.s.start1.style.opacity = 0;
    F.s.start2 = F.circle(X(-4.5), Y(-2), 7, { fill: 'var(--c-c)', stroke: 'var(--c-ink)', 'stroke-width': 1.5 }); F.s.start2.style.opacity = 0;
    F.s.grad = F.arrow(X(-4.5), Y(2), X(-4.5) - 20, Y(2) - 45, { color: 'var(--bad)', w: 3 }); F.s.grad.style.opacity = 0;
    F.s.gl = F.text(X(-4.5) - 10, Y(2) - 54, 'gradient: uphill', { anchor: 'start', size: 12, weight: 700, fill: 'var(--bad)' }); F.s.gl.style.opacity = 0;
    const lg = F.g({ transform: 'translate(640,90)' });
    F.rect(0, 0, 240, 120, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' }, lg);
    F.line(16, 30, 46, 30, { stroke: 'var(--c-b)', 'stroke-width': 3 }, lg); F.text(56, 30, 'gradient descent', { anchor: 'start', size: 13 }, lg); F.text(56, 48, 'all data each step', { anchor: 'start', size: 11.5, cls: 'soft' }, lg);
    F.line(16, 78, 46, 78, { stroke: 'var(--c-c)', 'stroke-width': 3 }, lg); F.text(56, 78, 'stochastic (SGD)', { anchor: 'start', size: 13 }, lg); F.text(56, 96, 'a small random batch', { anchor: 'start', size: 11.5, cls: 'soft' }, lg);
    F.s.c1 = K.callout(F, 760, 260, 'zig-zag across the\nnarrow valley', { tone: 'accent', w: 190 });
    F.s.c2 = K.callout(F, 760, 330, 'noisy, but each step\nis cheap', { tone: 'warn', w: 190 });
  },
  steps: [
    { title: 'A map of the loss', say: ['With two weights the loss is a surface. We draw it from above, with contour lines, like a hiking map.', 'Each ring joins points with the same loss. The minimum is in the middle.'],
      cues: [Q(async F => { for (const r of F.s.rings.slice().reverse()) { F.show(r, 300); await F.wait(90); } }), Q(async F => { await F.show(F.s.minD); await F.pulse(F.s.minD, 2); })] },
    { title: 'The gradient', say: ['The gradient is an arrow that points straight uphill, across the rings.', 'Gradient descent steps the opposite way, downhill.'],
      cues: [Q(async F => { await F.show(F.s.start1); await F.show(F.s.grad); await F.show(F.s.gl); }), Q(async F => { await F.hide(F.s.gl); F.hide(F.s.grad); })] },
    { title: 'Gradient descent', say: ['Here is the path with a learning rate of zero point one five.', 'In the narrow direction it zig zags. In the long direction it moves slowly but steadily.'],
      cues: [Q(async F => { F.s.gd.style.opacity = 0; await F.draw(F.s.gd, 1500); F.show(F.s.gdDots); }), Q(async F => { await F.show(F.s.c1); })] },
    { title: 'Stochastic gradient descent', say: ['Real data sets have millions of examples, so the exact gradient is expensive to compute.', 'Stochastic gradient descent uses a small random batch for each step. The path is noisy, but each step is cheap and goes downhill on average.'],
      cues: [Q(async F => { await F.show(F.s.start2); }), Q(async F => { F.s.sg.style.opacity = 0; await F.draw(F.s.sg, 1800); await F.show(F.s.c2); })] },
    { title: 'Noise can help', say: ['The noise can even help to escape small bumps and flat areas.', 'Near the end of training we lower the learning rate, so the steps settle down.'],
      cues: [Q(async F => { await F.pulse(F.s.c2, 1); }), Q(async F => { await F.pulse(F.s.minD, 2); })] }
  ]
};

/* ================= scene 5: the perceptron ================= */
const PD = [[-2, 1, 1], [-1, 3, 1], [1, 3, 1], [0, -2, -1], [2, 0, -1], [3, 2, -1]];
// trace (checked): w = (0,1,0); (-2,1)+ wrong -> (1,-1,1); (3,2)- has sum 0 -> wrong -> (0,-4,-1); next pass (1,3)+ sum -7 -> (1,-3,2); then all correct
const PW = [[0, 1, 0], [1, -1, 1], [0, -4, -1], [1, -3, 2]];
function clipLine(w, lo, hi) {   // segment of w0 + w1 x + w2 y = 0 inside the square [lo,hi]^2
  const pts = [], [a, b, c] = w;
  if (Math.abs(c) > 1e-9) for (const x of [lo, hi]) { const y = -(a + b * x) / c; if (y >= lo - 1e-9 && y <= hi + 1e-9) pts.push([x, y]); }
  if (Math.abs(b) > 1e-9) for (const y of [lo, hi]) { const x = -(a + c * y) / b; if (x >= lo - 1e-9 && x <= hi + 1e-9) pts.push([x, y]); }
  return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null;
}
function halfPlane(w, lo, hi) {   // polygon of the square where w0 + w1 x + w2 y > 0
  const sq = [[lo, lo], [hi, lo], [hi, hi], [lo, hi]], v = p => w[0] + w[1] * p[0] + w[2] * p[1], out = [];
  for (let i = 0; i < 4; i++) { const p = sq[i], q = sq[(i + 1) % 4], vp = v(p), vq = v(q); if (vp > 0) out.push(p); if ((vp > 0) !== (vq > 0)) { const t = vp / (vp - vq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); } }
  return out;
}
const scenePerc = {
  id: 'perc', title: 'The perceptron learns a line', w: 720, h: 400,
  build(F) {
    K.title(F, 'Perceptron: answer + if w0 + w1·x1 + w2·x2 > 0', 'circles are + examples, squares are − examples');
    const A = F.s.A = axes(F, { x: 50, y: 64, w: 300, h: 300, xr: [-4, 4], yr: [-4, 4], tx: [-4, -2, 0, 2, 4], ty: [-4, -2, 0, 2, 4], xl: 'x1', yl: 'x2' });
    F.s.half = F.path('', { fill: 'var(--c-b)', stroke: 'none' }); F.s.half.style.opacity = 0; F.s.half.style.fillOpacity = 0.13;
    F.s.ln = F.line(0, 0, 0, 0, { stroke: 'var(--c-ink)', 'stroke-width': 3.5, 'stroke-linecap': 'round' }); F.s.ln.style.opacity = 0;
    F.s.ring = F.circle(0, 0, 16, { fill: 'none', stroke: 'var(--bad)', 'stroke-width': 3 }); F.s.ring.style.opacity = 0;
    F.s.pts = PD.map(([x, y, t]) => { const g = F.g({ transform: `translate(${A.X(x)},${A.Y(y)})` }); g.__t = { x: A.X(x), y: A.Y(y), s: 1, r: 0 }; if (t > 0) F.circle(0, 0, 9, { fill: 'var(--c-b)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }, g); else F.rect(-8, -8, 16, 16, { rx: 2, fill: 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }, g); F.text(0, 0.5, t > 0 ? '+' : '−', { size: 13, weight: 800, fill: '#fff' }, g); return g; });
    F.rect(380, 70, 320, 130, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' });
    F.text(540, 92, 'weights (w0, w1, w2)', { size: 12.5, cls: 'soft' });
    F.s.tw = F.text(540, 122, '(0, 1, 0)', { size: 24, weight: 800, mono: true, fill: 'var(--c-b)' });
    F.s.tc = F.text(540, 168, '', { size: 13, weight: 650, mono: true });
    F.s.rule = K.callout(F, 540, 240, 'if a point is wrong:\nw = w + y · (1, x1, x2)\n(y = +1 or −1)', { tone: 'accent', w: 250 });
    F.s.ok = K.callout(F, 540, 330, '✓ every point on its correct side', { tone: 'ok', w: 270 });
    F.s.w = PW[0].slice(); drawW(F, F.s.w);
  },
  steps: [
    { title: 'The perceptron', say: ['A perceptron is the simplest learning machine. It computes a weighted sum of the inputs plus a bias, and answers plus if the sum is positive.', 'The weights define a straight line. On one side the answer is plus, on the other side it is minus.'],
      cues: [Q(async F => { for (const p of F.s.pts) { await F.pulse(p, 1); } }), Q(async F => { F.show(F.s.half); await F.show(F.s.ln); })] },
    { title: 'A mistake', say: ['We start with the weights zero, one and zero. The line is vertical.', 'The plus point at minus two, one is on the minus side. That is a mistake.'],
      cues: [Q(async F => { F.s.half.style.opacity = 1; F.s.ln.style.opacity = 1; await F.pulse(F.s.tw, 1); }), Q(async F => { await ringAt(F, 0, 'sum = 0 − 2 + 0 = −2  wrong'); })] },
    { title: 'Update one', say: ['The rule: if a point is wrong, add it to the weights if it is a plus point. Subtract it if it is a minus point.', 'The new weights are one, minus one and one, and the line turns.'],
      cues: [Q(async F => { await F.show(F.s.rule); }), Q(async F => { await setW(F, PW[1]); })] },
    { title: 'Update two', say: ['The minus point at three, two now lies exactly on the line. A sum of zero also counts as a mistake.', 'We subtract it. The weights become zero, minus four and minus one.'],
      cues: [Q(async F => { await ringAt(F, 5, 'sum = 1 − 3 + 2 = 0  wrong'); }), Q(async F => { await setW(F, PW[2]); })] },
    { title: 'Update three', say: ['In the second pass, the plus point at one, three is wrong, so we add it.', 'The weights are now one, minus three and two, and every point is on its correct side.'],
      cues: [Q(async F => { await ringAt(F, 2, 'sum = 0 − 4 − 3 = −7  wrong'); }), Q(async F => { await setW(F, PW[3]); F.hide(F.s.ring); F.setText(F.s.tc, 'no mistakes in a full pass', 540, 14); await F.show(F.s.ok); })] },
    { title: 'Converged', say: ['A full pass without mistakes means the perceptron has converged.', 'If a straight line can separate the two classes, the perceptron is guaranteed to find one.'],
      cues: [Q(async F => { await F.pulse(F.s.ok, 1); }), Q(async F => { await F.pulse(F.s.ln, 2); })] }
  ]
};
function drawW(F, w) {
  const A = F.s.A, seg = clipLine(w, -4, 4), poly = halfPlane(w, -4, 4);
  if (seg) F.set(F.s.ln, { x1: A.X(seg[0][0]), y1: A.Y(seg[0][1]), x2: A.X(seg[1][0]), y2: A.Y(seg[1][1]) });
  F.s.half.setAttribute('d', poly.length ? 'M' + poly.map(p => A.X(p[0]).toFixed(1) + ',' + A.Y(p[1]).toFixed(1)).join(' L') + ' Z' : 'M0,0');
}
async function setW(F, w1) {
  const w0 = F.s.w.slice(); F.s.w = w1.slice();
  F.setText(F.s.tw, '(' + w1.join(', ').replace(/-/g, '−') + ')', 540, 24);
  await tw(F, 1100, t => drawW(F, w0.map((v, i) => v + (w1[i] - v) * t)));
  await F.pulse(F.s.tw, 1);
}
async function ringAt(F, i, txt) { const A = F.s.A, [x, y] = PD[i]; F.set(F.s.ring, { cx: A.X(x), cy: A.Y(y) }); F.setText(F.s.tc, txt.replace(/-/g, '−'), 540, 14); await F.show(F.s.ring); await F.pulse(F.s.pts[i], 2); }

/* ================= exercises ================= */
const exGD = {
  title: 'One step of gradient descent', random: true,
  gen(r) {
    const a = r.pick([1, 2, 3]), b = r.int(-3, 5), c = r.int(0, 4), eta = r.pick([0.1, 0.05, 0.2]);
    let w0; do { w0 = r.int(-4, 8); } while (w0 === b);
    const g = 2 * a * (w0 - b), w1 = w0 - eta * g;
    return {
      prompt: `The loss is $L(w) = ${a === 1 ? '' : a}(w ${b >= 0 ? '-' : '+'} ${Math.abs(b)})^2 + ${c}$. Gradient descent starts at $w = ${w0}$ with learning rate $\\eta = ${eta}$. What is $w$ after <b>one</b> step?`,
      hint: `The derivative is $L'(w) = ${2 * a}(w ${b >= 0 ? '-' : '+'} ${Math.abs(b)})$. Then new w = w − η · L'(w).`,
      answer: `$L'(${w0}) = ${2 * a} \\times (${w0} ${b >= 0 ? '-' : '+'} ${Math.abs(b)}) = ${g}$. New $w = ${w0} - ${eta} \\times (${g}) = $ <b>${fx(w1, 2)}</b>. ${w1 > w0 ? 'The slope was negative, so w went up.' : 'The slope was positive, so w went down.'}`,
      check: { type: 'number', answer: +fx(w1, 2), tol: 0.011 }
    };
  }
};
const exPerc = {
  title: 'One perceptron update', random: true,
  gen(r) {
    const w = [r.int(-2, 2), r.int(-3, 3), r.int(-3, 3)], x = [r.int(-3, 3), r.int(-3, 3)], y = r.pick([1, -1]);
    const s = w[0] + w[1] * x[0] + w[2] * x[1], wrong = y * s <= 0;
    const nw = wrong ? [w[0] + y, w[1] + y * x[0], w[2] + y * x[1]] : w.slice();
    return {
      prompt: `A perceptron has weights $(w_0, w_1, w_2) = (${w.join(', ')})$ and answers $+1$ if $w_0 + w_1x_1 + w_2x_2 > 0$, otherwise $-1$. The training example is $x = (${x.join(', ')})$ with label $y = ${y > 0 ? '+1' : '-1'}$. The learning rate is 1. Type the weights <b>after</b> this example, as <code>w0,w1,w2</code> (for example <code>1,-2,0</code>).`,
      hint: 'Compute the sum. If y × sum ≤ 0 the example is wrong: add y·(1, x1, x2) to the weights. If it is right, nothing changes.',
      answer: `Sum = ${w[0]} + (${w[1]})(${x[0]}) + (${w[2]})(${x[1]}) = ${s}. ${wrong ? `y × sum = ${y * s} ≤ 0, so it is a <b>mistake</b>. New w = (${w.join(', ')}) ${y > 0 ? '+' : '−'} (1, ${x.join(', ')}) = <b>(${nw.join(', ')})</b>.` : `y × sum = ${y * s} > 0, so the example is already correct and the weights stay <b>(${nw.join(', ')})</b>.`}`,
      check: { type: 'text', answer: nw.join(','), placeholder: 'w0,w1,w2' }
    };
  }
};
const exSA = {
  title: 'Should annealing accept a step down?', random: true,
  gen(r) {
    const drop = r.pick([0.5, 1, 1.5, 2, 2.5, 3]), T = r.pick([0.5, 1, 2, 4, 8]), p = Math.exp(-drop / T);
    return {
      prompt: `Simulated annealing is maximising. A random neighbour is <b>${drop}</b> lower than the current solution, and the temperature is $T = ${T}$. With what probability is the move accepted? Use $p = e^{-\\text{drop}/T}$ and give two decimals.`,
      hint: 'Divide the drop by T, put a minus sign in front, and take e to that power.',
      answer: `$p = e^{-${drop}/${T}} = e^{-${fx(drop / T, 3).replace(/\.?0+$/, '')}} \\approx$ <b>${fx(p, 2)}</b>. ${p > 0.5 ? 'High temperature: bad moves are often accepted.' : 'Low temperature or a big drop: the move is usually rejected.'}`,
      check: { type: 'number', answer: +fx(p, 2), tol: 0.011 }
    };
  }
};
const exGrad2 = {
  title: 'A step on a two-weight loss', random: true,
  gen(r) {
    const a = r.pick([1, 2, 3]), b = r.pick([1, 2, 4, 5]), x0 = r.int(-4, 4) || 2, y0 = r.int(-3, 3) || -1, eta = r.pick([0.1, 0.05]);
    const gx = 2 * a * x0, gy = 2 * b * y0, x1 = x0 - eta * gx, y1 = y0 - eta * gy, L1v = a * x1 * x1 + b * y1 * y1, L0v = a * x0 * x0 + b * y0 * y0;
    return {
      prompt: `The loss is $L(x, y) = ${a === 1 ? '' : a}x^2 + ${b === 1 ? '' : b}y^2$. We are at $(x, y) = (${x0}, ${y0})$ and take one gradient descent step with $\\eta = ${eta}$. What is the loss <b>after</b> the step? Give two decimals.`,
      hint: `The gradient is $(${2 * a}x, ${2 * b}y)$. Update both coordinates, then evaluate L at the new point.`,
      answer: `Gradient = (${gx}, ${gy}). New point = (${x0} − ${eta}·${gx}, ${y0} − ${eta}·${gy}) = (${fx(x1, 2)}, ${fx(y1, 2)}). Loss goes from ${L0v} to <b>${fx(L1v, 2)}</b>.`,
      check: { type: 'number', answer: +fx(L1v, 2), tol: 0.011 }
    };
  }
};

Course.lecture({
  id: 'w05', num: 5, week: 5, kind: 'lecture', title: 'Optimization for learning',
  lede: 'Learning is searching for the best weights. We climb hills, cool down hot searches, roll balls into valleys, and watch the oldest learning machine, the perceptron, turn its line until every point is on the right side.',
  clos: [2], widgets: ['gradient'],
  goals: ['explain <b>hill climbing</b>, why it gets stuck on a <b>local maximum</b>, and how <b>simulated annealing</b> escapes',
    'carry out a <b>gradient descent</b> step by hand: new w = w − η × gradient',
    'predict the effect of a learning rate that is too small, about right, or too large',
    'explain why <b>stochastic gradient descent</b> uses small random batches',
    'apply the <b>perceptron learning rule</b> and say when it is guaranteed to converge'],
  chapters: [
    { id: 'local', title: 'Local search: hill climbing and annealing', blocks: [
      { html: '<p>In search (weeks 2 and 3) we wanted a <b>path</b>. In optimisation we only want the <b>best state</b>: the best timetable, the best route for a delivery truck, the best weights of a model. <b>Local search</b> keeps one current state and repeatedly moves to a neighbour. It uses very little memory and works on huge problems.</p>' },
      { scene: sceneHill },
      { exercise: exSA },
      { quiz: { q: 'Hill climbing stops at a point where every neighbour is lower, but the value is 3.5 and somewhere else there is a 5.5. What is this point called?', options: ['A local maximum', 'A global maximum', 'A plateau', 'A goal state'], correct: 0, why: 'It is the best point in its own neighbourhood only. Random restarts or simulated annealing can help to escape it.' } }
    ] },
    { id: 'gd', title: 'Gradient descent', blocks: [
      { html: '<p>When the loss is a smooth function of the weights we do not need to try random neighbours: the <b>gradient</b> (the vector of slopes, one per weight) tells us which way is uphill. <b>Gradient descent</b> repeats $w \\leftarrow w - \\eta\\, \\nabla L(w)$, where $\\eta$ (eta) is the <b>learning rate</b>.</p>' },
      { scene: sceneRoll },
      { exercise: exGD }
    ] },
    { id: 'lr', title: 'The learning rate', blocks: [
      { scene: sceneLR },
      { quiz: { q: 'During training the loss goes 2.1, 3.4, 7.9, 25.0, … What should you try first?', options: ['A smaller learning rate', 'A larger learning rate', 'More training data', 'A larger network'], correct: 0, why: 'A loss that grows at every step is the signature of a learning rate that is too large: each step overshoots the valley.' } },
      { deeper: { title: 'why 0.25 halves the distance', html: '<p>For $L(w) = (w-3)^2 + 1$ the update is $w \\leftarrow w - \\eta \\cdot 2(w-3)$, so the distance to the minimum is multiplied by $(1 - 2\\eta)$ at every step. For $\\eta = 0.25$ the factor is $0.5$; for $\\eta = 0.05$ it is $0.9$ (slow); for $\\eta = 1.05$ it is $-1.1$: the sign flips (we jump to the other side) and the distance grows by 10% each step.</p>' } }
    ] },
    { id: 'sgd', title: 'Two weights and stochastic gradient descent', blocks: [
      { scene: sceneContour },
      { exercise: exGrad2 },
      { html: '<p><b>Momentum</b> is a small change with a big effect: the step remembers part of the previous step, like a heavy ball. It smooths the zig-zag and rolls faster along long, flat valleys. Try it in the playground below.</p>' },
      { widget: 'gradient' },
      { note: '<b>Try this.</b> (1) On the narrow valley, raise the learning rate until the path explodes, then step back. (2) Add momentum 0.9 and compare the number of steps. (3) Turn on noise to see stochastic gradient descent. (4) On the two valleys, click different starting points: which minimum you reach depends on where you start.' }
    ] },
    { id: 'perceptron', title: 'The perceptron', blocks: [
      { html: '<p>The <b>perceptron</b> (Rosenblatt, 1958) is a linear classifier: $h_w(x) = +1$ if $w_0 + w_1x_1 + w_2x_2 > 0$, else $-1$. Learning rule, for each training example: if it is classified wrongly, $w \\leftarrow w + \\eta\\, y\\, (1, x_1, x_2)$. If the data can be separated by a straight line, this loop is guaranteed to stop with zero mistakes.</p>' },
      { scene: scenePerc },
      { exercise: exPerc },
      { quiz: { q: 'Four points: (0,0) and (1,1) are class −1, (0,1) and (1,0) are class +1 (the XOR problem). What happens if we train a single perceptron?', options: ['It never stops making mistakes: no straight line separates the classes', 'It converges after a few passes', 'It converges only with a small learning rate', 'It needs more training examples'], correct: 0, why: 'No straight line puts (0,1) and (1,0) on one side and (0,0) and (1,1) on the other. This limit is why we need hidden layers: next week.' } }
    ] }
  ]
});
})();

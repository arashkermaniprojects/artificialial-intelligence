(function () {
const K = Course.kit;

/* ---------- small helpers (local to this lecture) ---------- */
// Q(fn): when the engine replays a cue instantly, every animation inside the cue (also after an await) is instant.
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
  if (o.yl) { const t = F.text(o.x - 34, o.y + o.h / 2, o.yl, { size: 12.5, cls: 'soft' }, g); t.setAttribute('transform', `rotate(-90 ${o.x - 34} ${o.y + o.h / 2})`); }
  return { X, Y, g };
}
function dot(F, x, y, r, attrs, parent) { const g = F.g({ transform: `translate(${x},${y})` }, parent); g.__t = { x, y, s: 1, r: 0 }; g.c = F.circle(0, 0, r, attrs, g); return g; }
function sq(F, x, y, r, attrs, parent) { const g = F.g({ transform: `translate(${x},${y})` }, parent); g.__t = { x, y, s: 1, r: 0 }; g.c = F.rect(-r, -r, 2 * r, 2 * r, Object.assign({ rx: 2 }, attrs), g); return g; }
const fx = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);

/* ================= scene 1: the three kinds of tasks ================= */
const LA = [[130, 140], [190, 210], [250, 120], [170, 290], [300, 180], [230, 250], [420, 300], [480, 220], [560, 320], [380, 350], [600, 200], [520, 280]];
const LB = (() => { const nz = [12, -15, 8, -6, 14, -10, 5, -12, 9, -4, 11, -8]; return nz.map((n, i) => { const x = 100 + i * 47; return [x, 340 - 0.45 * (x - 100) + n]; }); })();
const LC = (() => { const cs = [[170, 150], [480, 140], [360, 300]], off = [[-28, -10], [22, -22], [12, 24], [-14, 20]]; return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => [cs[i % 3][0] + off[Math.floor(i / 3)][0], cs[i % 3][1] + off[Math.floor(i / 3)][1]]); })();
const sceneKinds = {
  id: 'kinds', title: 'Three kinds of learning tasks', w: 720, h: 400,
  build(F) {
    K.title(F, 'Learning = finding a pattern in examples', 'each dot is one example described by two numbers');
    F.rect(60, 68, 600, 310, { fill: 'var(--card)', stroke: 'var(--line)', rx: 10 });
    F.s.task = K.chip(F, 600, 30, 'supervised', 'accent'); F.s.task.style.opacity = 0;
    F.s.task2 = K.chip(F, 600, 30, 'unsupervised', 'warn'); F.s.task2.style.opacity = 0;
    F.s.bound = F.path('M220,370 L560,76', { stroke: 'var(--c-ink)', 'stroke-width': 3, 'stroke-dasharray': '8 6' }); F.s.bound.style.opacity = 0;
    F.s.reg = F.path(`M${LB[0][0] - 20},${340 - 0.45 * (LB[0][0] - 120)} L${LB[11][0] + 20},${340 - 0.45 * (LB[11][0] + 20 - 100)}`, { stroke: 'var(--c-a)', 'stroke-width': 4, 'stroke-linecap': 'round' }); F.s.reg.style.opacity = 0;
    F.s.rings = [[170, 150], [480, 140], [360, 300]].map((c, i) => { const e = F.el('ellipse', { cx: c[0], cy: c[1], rx: 58, ry: 46, fill: 'none', stroke: ['var(--c-a)', 'var(--c-b)', 'var(--c-c)'][i], 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }); e.style.opacity = 0; return e; });
    F.s.pts = LA.map(p => dot(F, p[0], p[1], 9, { fill: 'var(--c-soft)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }));
    F.s.pts.forEach(p => { p.style.opacity = 0; });
    F.s.c1 = K.callout(F, 360, 360, 'labels are categories: classification', { tone: 'accent', w: 300 });
    F.s.c2 = K.callout(F, 470, 100, 'labels are numbers: regression', { tone: 'ok', w: 260 });
    F.s.c3 = K.callout(F, 220, 360, 'no labels: find groups (clustering)', { tone: 'warn', w: 290 });
  },
  steps: [
    { title: 'Data', say: ['Machine learning means finding a pattern in examples, called data.', 'Each dot is one example, for instance one patient described by two measurements.'],
      cues: [Q(async F => { for (const p of F.s.pts) { F.show(p, 300); await F.wait(50); } }),
             Q(async F => { await F.pulse(F.s.pts[4], 2); })] },
    { title: 'Supervised: classification', say: ['In supervised learning every example comes with the right answer, called a label.', 'When the label is a category, like sick or healthy, the task is classification. The model learns a boundary between the classes.'],
      cues: [Q(async F => { F.s.pts.forEach(p => p.style.opacity = 1); F.s.pts.forEach((p, i) => F.to(p.c, { fill: i < 6 ? 'var(--c-b)' : 'var(--c-c)' }, 500)); await F.show(F.s.task); }),
             Q(async F => { await F.draw(F.s.bound, 900); await F.show(F.s.c1); })] },
    { title: 'Supervised: regression', say: ['When the label is a number, like a price, the task is regression.', 'The model learns a line or a curve that predicts the number for a new input.'],
      cues: [Q(async F => { F.hide(F.s.bound); F.hide(F.s.c1); await F.all(F.s.pts.map((p, i) => [p, { tx: LB[i][0], ty: LB[i][1] }, 800])); F.s.pts.forEach(p => F.to(p.c, { fill: 'var(--c-a)' }, 400)); }),
             Q(async F => { await F.draw(F.s.reg, 900); await F.show(F.s.c2); })] },
    { title: 'Unsupervised: clustering', say: ['In unsupervised learning there are no labels at all.', 'The model must find structure by itself, for example groups of similar examples. This is called clustering.'],
      cues: [Q(async F => { F.hide(F.s.reg); F.hide(F.s.c2); F.hide(F.s.task); F.show(F.s.task2); F.s.pts.forEach(p => F.to(p.c, { fill: 'var(--c-soft)' }, 400)); await F.all(F.s.pts.map((p, i) => [p, { tx: LC[i][0], ty: LC[i][1] }, 900])); }),
             Q(async F => { F.s.rings.forEach(r => F.show(r, 500)); F.s.pts.forEach((p, i) => F.to(p.c, { fill: ['var(--c-a)', 'var(--c-b)', 'var(--c-c)'][i % 3] }, 600)); await F.show(F.s.c3); })] }
  ]
};

/* ================= scene 2: least squares line ================= */
const RP = [[1, 2], [2, 3], [3, 5], [4, 4], [5, 6], [6, 7]];      // best fit: slope 0.943, intercept 1.2, error 1.94 (checked)
const sse = (a, b) => RP.reduce((s, [x, y]) => s + (y - (a * x + b)) ** 2, 0);
const sceneLine = {
  id: 'line', title: 'Regression: fitting a line', w: 720, h: 400,
  build(F) {
    K.title(F, 'Fit a line to six examples', 'prediction = slope · x + intercept');
    const A = F.s.A = axes(F, { x: 70, y: 66, w: 380, h: 280, xr: [0, 7], yr: [0, 8], tx: [0, 1, 2, 3, 4, 5, 6, 7], ty: [0, 2, 4, 6, 8], xl: 'input x', yl: 'label y' });
    F.s.sqG = F.g({}); F.s.resG = F.g({});
    F.s.sqs = RP.map(() => { const r = F.rect(0, 0, 0, 0, { fill: 'var(--c-c)', stroke: 'var(--c-c)', 'stroke-width': 1.2 }, F.s.sqG); r.style.opacity = 0; r.style.fillOpacity = .18; return r; });
    F.s.res = RP.map(() => { const l = F.line(0, 0, 0, 0, { stroke: 'var(--bad)', 'stroke-width': 2.5, 'stroke-dasharray': '4 3' }, F.s.resG); return l; });
    F.s.resG.style.opacity = 0;
    F.s.ln = F.line(A.X(0), A.Y(4.5), A.X(7), A.Y(4.5), { stroke: 'var(--c-b)', 'stroke-width': 3.5, 'stroke-linecap': 'round' }); F.s.ln.style.opacity = 0;
    F.s.pts = RP.map(([x, y]) => dot(F, A.X(x), A.Y(y), 7, { fill: 'var(--c-a)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }));
    F.s.pts.forEach(p => p.style.opacity = 0);
    const px = 590;
    F.s.panel = F.g({}); F.s.panel.style.opacity = 0;
    F.rect(480, 80, 220, 200, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' }, F.s.panel);
    F.text(px, 104, 'slope', { size: 12.5, cls: 'soft' }, F.s.panel); F.s.tA = F.text(px, 126, '0.00', { size: 20, weight: 750, mono: true }, F.s.panel);
    F.text(px, 154, 'intercept', { size: 12.5, cls: 'soft' }, F.s.panel); F.s.tB = F.text(px, 176, '4.50', { size: 20, weight: 750, mono: true }, F.s.panel);
    F.text(px, 210, 'total squared error', { size: 12.5, cls: 'soft' }, F.s.panel); F.s.tE = F.text(px, 240, '17.50', { size: 30, weight: 800, mono: true, fill: 'var(--c-c)' }, F.s.panel);
    F.s.cur = [0, 4.5]; F.s.layout = () => lay(F, F.s.cur[0], F.s.cur[1]);
    F.s.done = K.callout(F, 590, 320, 'least squares: the smallest\ntotal squared error', { tone: 'ok', w: 230 });
    lay(F, 0, 4.5);
  },
  steps: [
    { title: 'The data', say: ['Here are six examples. x is the input, and y is the number we want to predict.', 'We will fit a straight line. The prediction is a slope times x, plus an intercept.'],
      cues: [Q(async F => { for (const p of F.s.pts) { F.show(p, 300); await F.wait(80); } }),
             Q(async F => { F.show(F.s.panel); await F.show(F.s.ln, 500); })] },
    { title: 'A first guess', say: ['Start with a flat line at four and a half.', 'The vertical gaps between the dots and the line are the errors. They are called residuals.'],
      cues: [Q(async F => { await F.pulse(F.s.ln, 1); }),
             Q(async F => { await F.show(F.s.resG, 500); })] },
    { title: 'Squared error', say: ['We square every residual, so that negative and positive errors do not cancel.', 'Adding the squares gives the total squared error. For the flat line it is seventeen and a half.'],
      cues: [Q(async F => { F.s.sqs.forEach(s => F.show(s, 500)); await F.wait(500); }),
             Q(async F => { await F.pulse(F.s.tE, 2); })] },
    { title: 'The best line', say: ['Now we turn and shift the line to make this total as small as possible.', 'The best line has a slope of about zero point nine four, and the error drops to about one point nine. This method is called least squares.'],
      cues: [Q(async F => { const [a0, b0] = F.s.cur; F.s.cur = [0.9428571, 1.2]; await tw(F, 1800, t => lay(F, a0 + (0.9428571 - a0) * t, b0 + (1.2 - b0) * t)); }),
             Q(async F => { lay(F, 0.9428571, 1.2); await F.show(F.s.done); })] }
  ]
};
function lay(F, a, b) {
  const A = F.s.A, sy = 280 / 8;
  F.s.ln.setAttribute('y1', A.Y(b)); F.s.ln.setAttribute('y2', A.Y(a * 7 + b));
  RP.forEach(([x, y], i) => { const p = a * x + b, r = y - p, side = Math.abs(r) * sy; F.set(F.s.res[i], { x1: A.X(x), x2: A.X(x), y1: A.Y(y), y2: A.Y(p) }); F.set(F.s.sqs[i], { x: A.X(x), y: Math.min(A.Y(y), A.Y(p)), width: side, height: side }); });
  F.setText(F.s.tA, fx(a, 2), 590, 20); F.setText(F.s.tB, fx(b, 2), 590, 20); F.setText(F.s.tE, fx(sse(a, b), 2), 590, 30);
}

/* ================= scene 3: a decision tree splits the plane ================= */
const TB = [[1, 2], [2, 7], [3, 4], [4, 8], [6, 2], [8, 3]], TO = [[6, 7], [8, 8], [7, 9], [9, 6]];
// entropy: root 6 blue 4 orange = 0.971 bits; after x<5: left 4 blue (0), right 2 blue 4 orange (0.918); weighted 0.551; gain 0.420
const sceneTree = {
  id: 'tree', title: 'A decision tree asks questions', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'Split the plane with yes or no questions', 'blue circles and orange squares; entropy measures how mixed a group is');
    const A = F.s.A = axes(F, { x: 60, y: 66, w: 340, h: 310, xr: [0, 10], yr: [0, 10], tx: [0, 5, 10], ty: [0, 5, 10], xl: 'x', yl: 'y' });
    const reg = (x0, y0, x1, y1, col) => { const r = F.rect(A.X(x0), A.Y(y1), A.X(x1) - A.X(x0), A.Y(y0) - A.Y(y1), { fill: col }); r.style.opacity = 0; return r; };
    F.s.rL = reg(0, 0, 5, 10, 'var(--c-b)'); F.s.rRB = reg(5, 0, 10, 5, 'var(--c-b)'); F.s.rRT = reg(5, 5, 10, 10, 'var(--c-c)'); F.s.rR = reg(5, 0, 10, 10, 'var(--c-soft)');
    F.s.v = F.line(A.X(5), A.Y(10), A.X(5), A.Y(0), { stroke: 'var(--c-ink)', 'stroke-width': 3 }); F.s.v.style.opacity = 0;
    F.s.hz = F.line(A.X(5), A.Y(5), A.X(10), A.Y(5), { stroke: 'var(--c-ink)', 'stroke-width': 3 }); F.s.hz.style.opacity = 0;
    TB.forEach(([x, y]) => dot(F, A.X(x), A.Y(y), 8, { fill: 'var(--c-b)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }));
    TO.forEach(([x, y]) => sq(F, A.X(x), A.Y(y), 7.5, { fill: 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }));
    // tree on the right
    const N = F.s.N = {
      root: F.box(650, 100, 190, 52, '6 blue · 4 orange\nentropy 0.97', { size: 13 }),
      L: F.box(530, 220, 150, 52, 'all blue (4)\nentropy 0', { size: 13 }),
      R: F.box(770, 220, 170, 52, '2 blue · 4 orange\nentropy 0.92', { size: 13 }),
      RL: F.box(700, 340, 130, 46, 'all blue (2)', { size: 13 }),
      RR: F.box(845, 340, 110, 46, 'all orange (4)', { size: 12 })
    };
    const E = (a, b, lab, side) => { const g = F.g({}); g.style.opacity = 0; const A_ = N[a].__t, B_ = N[b].__t; F.line(A_.x, A_.y + 26, B_.x, B_.y - 26, { stroke: 'var(--c-node-line)', 'stroke-width': 2.2 }, g); F.text((A_.x + B_.x) / 2 + side * 16, (A_.y + B_.y) / 2, lab, { size: 12, weight: 700, fill: side < 0 ? 'var(--ok)' : 'var(--bad)' }, g); F.root.insertBefore(g, F.root.firstChild.nextSibling); return g; };
    F.s.e1 = E('root', 'L', 'yes', -1); F.s.e2 = E('root', 'R', 'no', 1); F.s.e3 = E('R', 'RL', 'yes', -1); F.s.e4 = E('R', 'RR', 'no', 1);
    ['L', 'R', 'RL', 'RR'].forEach(k => N[k].style.opacity = 0);
    F.s.q1 = K.chip(F, 650, 152, 'is x < 5 ?', 'accent'); F.s.q1.style.opacity = 0;
    F.s.q2 = K.chip(F, 770, 272, 'is y < 5 ?', 'accent'); F.s.q2.style.opacity = 0;
    F.s.gain = K.callout(F, 650, 395, 'information gain = 0.97 − 0.6 × 0.92 = 0.42', { tone: 'ok', w: 330 });
    F.s.done = K.callout(F, 650, 395, 'every box is pure: one class per box', { tone: 'ok', w: 290 });
  },
  steps: [
    { title: 'Mixed data', say: ['A decision tree classifies an example by asking simple yes or no questions about it.', 'At the start the data is mixed: six blue and four orange. Its entropy, a measure of disorder, is almost one.'],
      cues: [Q(async F => { await F.pulse(F.s.N.root, 1); }), Q(async F => { await F.to(F.s.N.root.rect, { fill: 'var(--c-cur)', stroke: 'var(--c-c)' }, 400); })] },
    { title: 'The first question', say: ['The tree tries many questions and keeps the one that makes the groups most pure.', 'Is x less than five? The left side is now all blue, so its entropy is zero.'],
      cues: [Q(async F => { await F.show(F.s.v, 500); await F.show(F.s.q1); }),
             Q(async F => { F.to(F.s.rL, { opacity: .14 }, 500); F.to(F.s.rR, { opacity: .1 }, 500); await F.all([[F.s.e1, { opacity: 1 }, 400], [F.s.N.L, { opacity: 1 }, 400]]); F.to(F.s.N.L.rect, { fill: 'var(--c-open)', stroke: 'var(--c-b)' }, 400); })] },
    { title: 'Information gain', say: ['The right side still has two blue and four orange. Its entropy is about zero point nine two.', 'The drop in entropy, weighted by group size, is called the information gain. Here it is about zero point four two.'],
      cues: [Q(async F => { await F.all([[F.s.e2, { opacity: 1 }, 400], [F.s.N.R, { opacity: 1 }, 400]]); }),
             Q(async F => { await F.show(F.s.gain); })] },
    { title: 'The second question', say: ['On the right side we ask a second question: is y less than five?', 'Now every region is pure. The tree has cut the plane into boxes, with one class in each box.'],
      cues: [Q(async F => { F.hide(F.s.gain); await F.show(F.s.hz, 500); await F.show(F.s.q2); }),
             Q(async F => { F.to(F.s.rR, { opacity: 0 }, 400); F.to(F.s.rRB, { opacity: .14 }, 500); F.to(F.s.rRT, { opacity: .16 }, 500); await F.all([[F.s.e3, { opacity: 1 }, 400], [F.s.e4, { opacity: 1 }, 400], [F.s.N.RL, { opacity: 1 }, 400], [F.s.N.RR, { opacity: 1 }, 400]]); F.to(F.s.N.RL.rect, { fill: 'var(--c-open)', stroke: 'var(--c-b)' }, 400); F.to(F.s.N.RR.rect, { fill: 'var(--c-cur)', stroke: 'var(--c-c)' }, 400); await F.show(F.s.done); })] }
  ]
};

/* ================= scene 4: underfitting and overfitting ================= */
function solve(A, b) { const n = b.length; A = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } } return A.map((r, i) => r[n] / r[i]); }
function polyfit(xs, ys, d) { const m = d + 1, A = [...Array(m)].map(() => Array(m).fill(0)), b = Array(m).fill(0); xs.forEach((x, i) => { const p = []; for (let k = 0; k < m; k++) p.push(Math.pow(x, k)); for (let a = 0; a < m; a++) { b[a] += p[a] * ys[i]; for (let c = 0; c < m; c++) A[a][c] += p[a] * p[c]; } }); for (let a = 0; a < m; a++) A[a][a] += 1e-9; return solve(A, b); }
const pev = (w, x) => w.reduce((s, c, k) => s + c * Math.pow(x, k), 0);
// sin(pi x) + fixed noise. Mean squared errors (checked): degree 1 train 0.24 test 0.15; degree 3 train 0.025 test 0.014; degree 9 train 0.000 test 0.42
const XT = [-0.95, -0.75, -0.55, -0.4, -0.15, 0.05, 0.3, 0.5, 0.7, 0.9], YT = [-0.036, -0.857, -0.788, -1.051, -0.274, -0.044, 0.909, 1.15, 0.629, 0.389];
const XV = [-0.85, -0.65, -0.3, -0.05, 0.15, 0.4, 0.6, 0.8], YV = [-0.504, -0.791, -0.929, -0.076, 0.354, 1.071, 0.891, 0.688];
const ERR = { 1: [0.24, 0.15], 3: [0.025, 0.014], 9: [0.0, 0.42] };
const scenePoly = {
  id: 'poly', title: 'Underfitting and overfitting', w: 900, h: 410, wide: true,
  build(F) {
    K.title(F, 'Same data, three models', 'filled dots = training data · hollow dots = test data the model never sees');
    const A = F.s.A = axes(F, { x: 60, y: 62, w: 420, h: 270, xr: [-1, 1], yr: [-1.6, 1.6], tx: [-1, 0, 1], ty: [-1, 0, 1], xl: 'input x', yl: 'y' });
    const cp = F.el('clipPath', { id: 'w04-poly-clip' }, F.defs); F.rect(60, 62, 420, 270, {}, cp);
    F.s.xs = []; for (let i = 0; i <= 160; i++) F.s.xs.push(-1 + 2 * i / 160);
    F.s.Y = {}; [1, 3, 9].forEach(d => { const w = polyfit(XT, YT, d); F.s.Y[d] = F.s.xs.map(x => Math.max(-3, Math.min(3, pev(w, x)))); });
    F.s.curve = F.path('', { stroke: 'var(--c-b)', 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'clip-path': 'url(#w04-poly-clip)' }); F.s.curve.style.opacity = 0;
    F.s.cy = F.s.Y[1].slice(); drawCurve(F, F.s.cy);
    F.s.tr = XT.map((x, i) => dot(F, A.X(x), A.Y(YT[i]), 6.5, { fill: 'var(--c-a)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }));
    F.s.te = XV.map((x, i) => dot(F, A.X(x), A.Y(YV[i]), 6, { fill: 'var(--fig-bg)', stroke: 'var(--c-c)', 'stroke-width': 2.5 }));
    [...F.s.tr, ...F.s.te].forEach(p => p.style.opacity = 0);
    F.s.deg = K.chip(F, 420, 84, 'degree 1', 'accent'); F.s.deg.style.opacity = 0;
    // error bars
    const bx = 540, base = 330, H = 220, max = 0.45;
    F.text(705, 80, 'mean squared error', { size: 13, weight: 700 });
    F.line(bx, base, 880, base, { stroke: 'var(--c-soft)', 'stroke-width': 1.5 });
    F.s.bars = {};
    [1, 3, 9].forEach((d, j) => {
      const cx = bx + 55 + j * 115;
      F.text(cx, base + 16, 'degree ' + d, { size: 12.5, cls: 'soft' });
      F.s.bars[d] = ERR[d].map((v, k) => { const x = cx - 24 + k * 26, bh = Math.max(2, H * v / max); const r = F.rect(x, base - bh, 22, bh, { rx: 4, fill: k ? 'var(--c-c)' : 'var(--c-a)' }); const t = F.text(x + 11, base - bh - 10, String(v), { size: 11, weight: 700, mono: true }); const g = F.g({}); g.append(r, t); g.style.opacity = 0; return g; });
    });
    const lg = F.g({ transform: 'translate(600,110)' }); F.rect(0, -6, 12, 12, { fill: 'var(--c-a)', rx: 2 }, lg); F.text(18, 0, 'train', { anchor: 'start', size: 12 }, lg); F.rect(70, -6, 12, 12, { fill: 'var(--c-c)', rx: 2 }, lg); F.text(88, 0, 'test', { anchor: 'start', size: 12 }, lg);
    F.s.c1 = K.callout(F, 270, 390, 'underfitting: too simple', { tone: 'warn', w: 210 });
    F.s.c3 = K.callout(F, 270, 390, 'a good fit', { tone: 'ok', w: 120 });
    F.s.c9 = K.callout(F, 270, 390, 'overfitting: it memorised the noise', { tone: 'bad', w: 290 });
    F.s.last = K.callout(F, 705, 390, 'choose the lowest TEST error', { tone: 'ok', w: 240 });
  },
  steps: [
    { title: 'Train and test', say: ['We split the data. The filled dots are for training. The hollow dots are kept aside for testing.', 'The model only sees the training dots. The test dots check how well it works on new data.'],
      cues: [Q(async F => { for (const p of F.s.tr) { F.show(p, 250); await F.wait(50); } }), Q(async F => { for (const p of F.s.te) { F.show(p, 250); await F.wait(50); } })] },
    { title: 'Degree one: too simple', say: ['A straight line is too simple. It misses the wave, so both errors are high.', 'This is called underfitting.'],
      cues: [Q(async F => { F.show(F.s.deg); await morphTo(F, 1); F.s.bars[1].forEach(b => F.show(b, 500)); }), Q(async F => { await F.show(F.s.c1); })] },
    { title: 'Degree three: just right', say: ['A curve of degree three follows the wave.', 'Both errors are small. This is a good fit.'],
      cues: [Q(async F => { F.hide(F.s.c1); F.setText(F.s.deg.lastChild, 'degree 3', 0, 16); await morphTo(F, 3); }), Q(async F => { F.s.bars[3].forEach(b => F.show(b, 500)); await F.show(F.s.c3); })] },
    { title: 'Degree nine: too flexible', say: ['A curve of degree nine passes through every training dot, so the training error is zero.', 'But between the dots it swings wildly, and the test error jumps. This is overfitting: the model memorised the noise.'],
      cues: [Q(async F => { F.hide(F.s.c3); F.setText(F.s.deg.lastChild, 'degree 9', 0, 16); await morphTo(F, 9); F.show(F.s.bars[9][0], 500); }), Q(async F => { await F.show(F.s.bars[9][1], 500); await F.show(F.s.c9); })] },
    { title: 'The lesson', say: ['Training error keeps going down as the model grows.', 'Test error tells the truth. We choose the model with the lowest error on data it has never seen.'],
      cues: [Q(async F => { await F.pulse(F.s.bars[9][0], 1); }), Q(async F => { await F.show(F.s.last); await F.pulse(F.s.bars[3][1], 2); })] }
  ]
};
function drawCurve(F, ys) { const A = F.s.A; F.s.curve.setAttribute('d', F.s.xs.map((x, i) => (i ? 'L' : 'M') + A.X(x).toFixed(1) + ',' + A.Y(ys[i]).toFixed(1)).join(' ')); }
async function morphTo(F, d) { const y0 = F.s.cy.slice(), y1 = F.s.Y[d]; F.s.cy = y1.slice(); F.s.curve.style.opacity = 1; await tw(F, 1100, t => drawCurve(F, y0.map((v, i) => v + (y1[i] - v) * t))); }

/* ================= scene 5: k-means ================= */
const KX = [[1.0, 1.2], [1.5, 2.0], [2.2, 1.4], [5.0, 6.0], [5.6, 5.2], [6.3, 6.1], [8.0, 1.5], [8.6, 2.4], [9.2, 1.2]];
// trace (checked): start (1,6) (2,7) (6,2); assign 0,0,2,1,2,2,2,2,2 inertia 113.4; update -> 56.5;
// assign 0,0,0,1,1,1,2,2,2 inertia 21.8; update -> (1.57,1.53) (5.63,5.77) (8.6,1.7) inertia 3.9; then nothing changes
const KC0 = [[1, 6], [2, 7], [6, 2]];
const KCOL = ['var(--c-a)', 'var(--c-b)', 'var(--c-c)'];
function kmAssign(C) { return KX.map(p => { let bi = 0, bd = 1e9; C.forEach((c, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; }); }
function kmUpdate(C, asg) { return C.map((c, k) => { const m = KX.filter((p, i) => asg[i] === k); return m.length ? [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length] : c; }); }
const kmInertia = (C, asg) => KX.reduce((s, p, i) => s + (p[0] - C[asg[i]][0]) ** 2 + (p[1] - C[asg[i]][1]) ** 2, 0);
const sceneKm = {
  id: 'km', title: 'k means, step by step', w: 720, h: 400,
  build(F) {
    K.title(F, 'k means with k = 3', 'diamonds = centres · repeat: assign, then update');
    const A = F.s.A = axes(F, { x: 50, y: 62, w: 420, h: 300, xr: [0, 10], yr: [0, 7.5], tx: [0, 5, 10], ty: [0, 5] });
    F.s.links = KX.map(() => { const l = F.line(0, 0, 0, 0, { stroke: 'var(--c-soft)', 'stroke-width': 1.4 }); l.style.opacity = 0; return l; });
    F.s.pts = KX.map(([x, y]) => dot(F, A.X(x), A.Y(y), 8, { fill: 'var(--c-soft)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }));
    F.s.cs = KC0.map(([x, y], k) => { const g = F.g({ transform: `translate(${A.X(x)},${A.Y(y)})` }); g.__t = { x: A.X(x), y: A.Y(y), s: 1, r: 0 }; F.path('M0,-14 L13,0 L0,14 L-13,0 Z', { fill: KCOL[k], stroke: 'var(--c-ink)', 'stroke-width': 2, filter: 'url(#fx-soft)' }, g); g.style.opacity = 0; return g; });
    F.s.C = KC0.map(c => c.slice()); F.s.asg = null;
    F.rect(495, 80, 205, 190, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' });
    F.text(597, 104, 'phase', { size: 12.5, cls: 'soft' }); F.s.ph = F.text(597, 128, 'start', { size: 18, weight: 750 });
    F.text(597, 166, 'inertia', { size: 12.5, cls: 'soft' }); F.s.in = F.text(597, 200, '–', { size: 30, weight: 800, mono: true, fill: 'var(--c-c)' });
    F.text(597, 240, 'sum of squared distances\nfrom points to their centre', { size: 11.5, cls: 'soft', lh: 14 });
    F.s.done = K.callout(F, 597, 320, 'nothing changes: converged', { tone: 'ok', w: 210 });
  },
  steps: [
    { title: 'Start', say: ['k means looks for k groups. Here k is three.', 'It starts by placing three centres at random positions.'],
      cues: [Q(async F => { await F.pulse(F.s.pts[4], 1); }), Q(async F => { for (const c of F.s.cs) { F.show(c, 350); await F.wait(150); } })] },
    { title: 'Assign', say: ['Step one, assign: every point joins its nearest centre.', 'Two centres start crowded in one corner, so the orange centre collects six points.'],
      cues: [Q(async F => { F.s.cs.forEach(c => c.style.opacity = 1); F.setText(F.s.ph, 'assign', 597, 18); await kmShow(F, kmAssign(F.s.C), true); }),
             Q(async F => { F.setText(F.s.in, fx(kmInertia(F.s.C, F.s.asg), 1), 597, 30); await F.pulse(F.s.cs[2], 2); })] },
    { title: 'Update', say: ['Step two, update: every centre moves to the average position of its points.', 'The inertia, the total squared distance to the centres, drops from about one hundred and thirteen to fifty six.'],
      cues: [Q(async F => { F.setText(F.s.ph, 'update', 597, 18); await kmMove(F, kmUpdate(F.s.C, F.s.asg)); }),
             Q(async F => { await F.count(F.s.in, 113.4, kmInertia(F.s.C, F.s.asg), 900, v => fx(v, 1)); })] },
    { title: 'Repeat', say: ['Assign again. Now each group is one natural cloud of points.', 'Update again. The centres jump into the middle of the clouds, and the inertia falls to about four.'],
      cues: [Q(async F => { F.setText(F.s.ph, 'assign', 597, 18); await kmShow(F, kmAssign(F.s.C), true); F.setText(F.s.in, fx(kmInertia(F.s.C, F.s.asg), 1), 597, 30); }),
             Q(async F => { F.setText(F.s.ph, 'update', 597, 18); const c = kmUpdate(F.s.C, F.s.asg); await kmMove(F, c); await F.count(F.s.in, 21.8, kmInertia(F.s.C, F.s.asg), 800, v => fx(v, 1)); })] },
    { title: 'Converged', say: ['One more round changes nothing, so the algorithm stops.', 'k means always stops, but the answer depends on the starting centres. A bad start can end in a worse grouping.'],
      cues: [Q(async F => { F.setText(F.s.ph, 'done', 597, 18); await F.show(F.s.done); }), Q(async F => { for (const c of F.s.cs) await F.pulse(c, 1); })] }
  ]
};
async function kmShow(F, asg) {
  F.s.asg = asg; const A = F.s.A;
  F.s.pts.forEach((p, i) => F.to(p.c, { fill: KCOL[asg[i]] }, 500));
  F.s.links.forEach((l, i) => { const c = F.s.C[asg[i]]; F.set(l, { x1: A.X(KX[i][0]), y1: A.Y(KX[i][1]), x2: A.X(c[0]), y2: A.Y(c[1]) }); l.style.stroke = KCOL[asg[i]]; F.to(l, { opacity: .55 }, 500); });
  await F.wait(550);
}
async function kmMove(F, C1) {
  const A = F.s.A, C0 = F.s.C.map(c => c.slice()); F.s.C = C1.map(c => c.slice());
  F.s.cs.forEach((g, k) => F.to(g, { tx: A.X(C1[k][0]), ty: A.Y(C1[k][1]) }, 900));
  await tw(F, 900, t => F.s.links.forEach((l, i) => { const k = F.s.asg[i], x = C0[k][0] + (C1[k][0] - C0[k][0]) * t, y = C0[k][1] + (C1[k][1] - C0[k][1]) * t; l.setAttribute('x2', A.X(x)); l.setAttribute('y2', A.Y(y)); }));
}

/* ================= exercises (random, answers computed) ================= */
const exSSE = {
  title: 'Total squared error of a line', random: true,
  gen(r) {
    const a = r.pick([1, 2, -1]), b = r.int(-1, 3), xs = r.shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3).sort((p, q) => p - q);
    const pts = xs.map(x => [x, a * x + b + r.int(-2, 2)]);
    const rows = pts.map(([x, y]) => { const p = a * x + b; return { x, y, p, e: y - p }; }), tot = rows.reduce((s, o) => s + o.e * o.e, 0);
    const line = `y = ${a === 1 ? '' : a === -1 ? '-' : a}x ${b >= 0 ? '+ ' + b : '- ' + (-b)}`;
    return {
      prompt: `A model predicts with the line <b>${line}</b>. The data has three examples: ${pts.map(p => `(${p[0]}, ${p[1]})`).join(', ')}. What is the <b>total squared error</b> (the sum of the squared residuals)?`,
      hint: 'For each example: prediction = line at x; residual = y − prediction; square it; add the three squares.',
      answer: rows.map(o => `x=${o.x}: prediction ${o.p}, residual ${o.y} − ${o.p} = ${o.e}, squared ${o.e * o.e}`).join('<br>') + `<br>Total = <b>${tot}</b>.`,
      check: { type: 'number', answer: tot, tol: 0.01 }
    };
  }
};
const H2 = p => (p <= 0 || p >= 1) ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
const exEntropy = {
  title: 'Entropy of a node', random: true,
  gen(r) {
    let a, b; do { a = r.int(1, 9); b = r.int(1, 9); } while (a === b);
    const p = a / (a + b), h = H2(p);
    return {
      prompt: `A node of a decision tree holds <b>${a}</b> blue and <b>${b}</b> orange examples. What is its entropy in bits? Use $H = -p\\log_2 p - (1-p)\\log_2(1-p)$ with $p$ the fraction of blue. Give two decimals.`,
      hint: `p = ${a}/${a + b}. A pure node has entropy 0; a 50/50 node has entropy 1.`,
      answer: `p = ${a}/${a + b} = ${fx(p, 3)}. H = −${fx(p, 3)}·log2(${fx(p, 3)}) − ${fx(1 - p, 3)}·log2(${fx(1 - p, 3)}) = <b>${fx(h, 2)}</b> bits.`,
      check: { type: 'number', answer: +fx(h, 2), tol: 0.011 }
    };
  }
};
const exConf = {
  title: 'Read a confusion matrix', random: true,
  gen(r) {
    const TP = r.int(20, 60), FN = r.int(2, 15), FP = r.int(2, 15), TN = r.int(20, 60), what = r.pick(['accuracy', 'precision', 'recall']);
    const v = what === 'accuracy' ? (TP + TN) / (TP + FN + FP + TN) : what === 'precision' ? TP / (TP + FP) : TP / (TP + FN);
    const formula = what === 'accuracy' ? `(TP + TN) / all = (${TP} + ${TN}) / ${TP + FN + FP + TN}` : what === 'precision' ? `TP / (TP + FP) = ${TP} / ${TP + FP}` : `TP / (TP + FN) = ${TP} / ${TP + FN}`;
    const tbl = `<table class="mini"><tr><th></th><th>predicted spam</th><th>predicted not spam</th></tr><tr><th>really spam</th><td>TP = ${TP}</td><td>FN = ${FN}</td></tr><tr><th>really not spam</th><td>FP = ${FP}</td><td>TN = ${TN}</td></tr></table>`;
    return {
      prompt: `A spam filter was tested on new emails. Its confusion matrix is:${tbl}What is its <b>${what}</b> in percent? Give one decimal.`,
      hint: 'Accuracy = correct / all. Precision = of the emails called spam, how many are spam. Recall = of the real spam, how much was caught.',
      answer: `${what} = ${formula} = <b>${fx(v * 100, 1)}%</b>.`,
      check: { type: 'number', answer: +fx(v * 100, 1), tol: 0.06 }
    };
  }
};
const exKm = {
  title: 'One round of k means', random: true,
  gen(r) {
    let A, B, P, asg;
    do {
      A = [r.int(0, 3), r.int(0, 3)]; B = [r.int(6, 9), r.int(5, 9)];
      P = [0, 1, 2, 3, 4].map(() => [r.int(0, 9), r.int(0, 9)]);
      asg = P.map(p => { const da = (p[0] - A[0]) ** 2 + (p[1] - A[1]) ** 2, db = (p[0] - B[0]) ** 2 + (p[1] - B[1]) ** 2; return da === db ? -1 : da < db ? 0 : 1; });
    } while (asg.includes(-1) || asg.filter(v => v === 0).length < 2 || asg.filter(v => v === 1).length < 1);
    const mine = P.filter((p, i) => asg[i] === 0), nx = mine.reduce((s, p) => s + p[0], 0) / mine.length;
    return {
      prompt: `Two centres: <b>A = (${A})</b> and <b>B = (${B})</b>. Five points: ${P.map((p, i) => `P${i + 1} = (${p})`).join(', ')}. Do one <b>assign</b> step (each point joins the nearest centre, straight-line distance), then one <b>update</b> step. What is the new <b>x coordinate</b> of centre A? Give two decimals.`,
      hint: 'Compare squared distances to A and to B for each point. Then average the x values of the points that joined A.',
      answer: P.map((p, i) => { const da = (p[0] - A[0]) ** 2 + (p[1] - A[1]) ** 2, db = (p[0] - B[0]) ** 2 + (p[1] - B[1]) ** 2; return `P${i + 1}: d²(A) = ${da}, d²(B) = ${db} → ${asg[i] ? 'B' : 'A'}`; }).join('<br>') + `<br>Points in A have x = ${mine.map(p => p[0]).join(', ')}; their mean is <b>${fx(nx, 2)}</b>.`,
      check: { type: 'number', answer: +fx(nx, 2), tol: 0.011 },
      figure: { w: 360, h: 300, draw(F) { const ax = axes(F, { x: 40, y: 15, w: 300, h: 250, xr: [0, 9], yr: [0, 9], tx: [0, 3, 6, 9], ty: [0, 3, 6, 9] }); P.forEach((p, i) => { F.circle(ax.X(p[0]), ax.Y(p[1]), 6, { fill: 'var(--c-soft)' }); F.text(ax.X(p[0]) + 12, ax.Y(p[1]) - 10, 'P' + (i + 1), { size: 11 }); }); [[A, 'A', 'var(--c-a)'], [B, 'B', 'var(--c-b)']].forEach(([c, n, col]) => { F.path(`M${ax.X(c[0])},${ax.Y(c[1]) - 11} l10,11 l-10,11 l-10,-11 Z`, { fill: col, stroke: 'var(--c-ink)', 'stroke-width': 1.5 }); F.text(ax.X(c[0]) + 16, ax.Y(c[1]) + 12, n, { size: 13, weight: 800 }); }); } }
    };
  }
};

Course.lecture({
  id: 'w04', num: 4, week: 4, kind: 'lecture', title: 'Learning from data',
  lede: 'Instead of writing the rules ourselves, we let the machine find them in examples. This week: lines that predict numbers, trees that ask questions, the danger of memorising, and groups found with no answers at all.',
  clos: [2], widgets: ['fitting', 'kmeans'],
  goals: ['tell <b>supervised</b> learning (classification, regression) from <b>unsupervised</b> learning (clustering)',
    'fit a line by <b>least squares</b> and compute residuals and the squared error',
    'explain how a <b>decision tree</b> chooses a split with entropy and information gain',
    'recognise <b>underfitting</b> and <b>overfitting</b> from training and test error',
    'evaluate a classifier with a train / validation / test split, accuracy and a <b>confusion matrix</b>',
    'run <b>k means</b> by hand: assign, update, repeat'],
  chapters: [
    { id: 'kinds', title: 'What does it mean to learn?', blocks: [
      { html: '<p>A program learns when it gets better at a task from <b>examples</b> instead of hand-written rules. AIMA calls this <i>learning from examples</i>. Every example has <b>features</b> (the inputs, for example age and blood pressure) and maybe a <b>label</b> (the answer).</p>' },
      { scene: sceneKinds },
      { quiz: { q: 'A bank wants to predict the <b>amount</b> (in dirhams) a customer will spend next month, using past records with known amounts. Which task is this?', options: ['Regression (supervised)', 'Classification (supervised)', 'Clustering (unsupervised)', 'Search'], correct: 0, why: 'The label is known for past customers (supervised) and it is a number, so this is regression.' } },
      { quiz: { q: 'A shop has data about 10 000 customers but no labels. It wants to find groups of similar customers. Which task is this?', options: ['Classification', 'Regression', 'Clustering', 'Reinforcement learning'], correct: 2, why: 'There are no labels, and the goal is to discover groups: clustering, an unsupervised task.' } }
    ] },
    { id: 'regression', title: 'Regression: fitting a line', blocks: [
      { html: '<p>A linear model predicts $\\hat y = w_1 x + w_0$. The <b>residual</b> of an example is $y - \\hat y$. <b>Least squares</b> picks the slope $w_1$ and intercept $w_0$ that make the <b>sum of squared residuals</b> as small as possible. (With more inputs the idea is the same: $\\hat y = w_0 + w_1x_1 + w_2x_2 + \\dots$)</p>' },
      { scene: sceneLine },
      { exercise: exSSE },
      { deeper: { title: 'the closed-form answer', html: '<p>For one input the best slope is $w_1 = \\dfrac{\\sum (x_i-\\bar x)(y_i-\\bar y)}{\\sum (x_i-\\bar x)^2}$ and $w_0 = \\bar y - w_1 \\bar x$. For the six points in the scene: $\\bar x = 3.5$, $\\bar y = 4.5$, $w_1 = 16.5/17.5 = 0.943$, $w_0 = 1.2$. Next week we reach the same answer by <b>gradient descent</b>, which also works when there is no formula.</p>' } }
    ] },
    { id: 'trees', title: 'Classification with decision trees', blocks: [
      { html: '<p>A <b>decision tree</b> is a flowchart of yes or no questions. Each leaf gives a class. To grow the tree, at every node we choose the question with the largest <b>information gain</b>: the drop in <b>entropy</b> (disorder) from the parent to its children, weighted by how many examples go to each child.</p><p>Entropy of a group with a fraction $p$ of one class: $H = -p\\log_2 p - (1-p)\\log_2(1-p)$. It is 0 for a pure group and 1 for a 50/50 mix.</p>' },
      { scene: sceneTree },
      { exercise: exEntropy },
      { note: '<b>Why trees are popular.</b> They are easy to read and explain ("if income &lt; 5000 and age &gt; 60 then …"). Their weakness: a deep tree can keep splitting until every training example has its own leaf. That is overfitting, the topic of the next chapter.' }
    ] },
    { id: 'fit', title: 'Underfitting and overfitting', blocks: [
      { html: '<p>The goal of learning is not to remember the training data but to do well on <b>new</b> data. This is called <b>generalisation</b>. A model that is too simple <b>underfits</b>; a model that is too flexible <b>overfits</b>: it fits the noise.</p>' },
      { scene: scenePoly },
      { widget: 'fitting' },
      { quiz: { q: 'A model has training error 0.01 and test error 0.90. What is the most likely problem?', options: ['Overfitting', 'Underfitting', 'The learning rate is too small', 'The data has no labels'], correct: 0, why: 'Very low training error with a much higher test error means the model memorised the training data and does not generalise.' } }
    ] },
    { id: 'eval', title: 'Evaluating a model honestly', blocks: [
      { html: '<p>Split the labelled data into three parts before you start:</p><ul><li><b>Training set</b> (for example 60 to 70%): the model learns from it.</li><li><b>Validation set</b> (about 15 to 20%): you use it to choose settings such as the tree depth or the polynomial degree.</li><li><b>Test set</b> (about 15 to 20%): touched <b>once</b>, at the very end, to report the final score.</li></ul><p>If you choose settings using the test set, the test score becomes too optimistic. With little data, <b>k-fold cross-validation</b> rotates which part is used for validation.</p>' },
      { html: '<p>For classification, the <b>confusion matrix</b> counts the four outcomes: true positives (TP), false negatives (FN), false positives (FP) and true negatives (TN). From it: accuracy $=\\frac{TP+TN}{\\text{all}}$, precision $=\\frac{TP}{TP+FP}$, recall $=\\frac{TP}{TP+FN}$. Accuracy alone can mislead: if only 1% of emails are spam, a filter that says "not spam" every time has 99% accuracy and catches nothing.</p>' },
      { exercise: exConf }
    ] },
    { id: 'kmeans', title: 'Unsupervised learning: k means', blocks: [
      { html: '<p><b>k means</b> splits unlabelled points into $k$ groups. It repeats two steps until nothing changes: <b>assign</b> every point to the nearest centre, then <b>update</b> every centre to the mean of its points. Each step can only lower the <b>inertia</b> (the sum of squared distances from points to their centres), so the algorithm always stops, but maybe in a local minimum.</p>' },
      { scene: sceneKm },
      { exercise: exKm },
      { widget: 'kmeans' },
      { note: '<b>Try this in the playground.</b> (1) Use the preset with 3 blobs and k = 3, then press "Bad start" and compare the final inertia. (2) Set k from 1 to 8 and watch the inertia: it always goes down, so the smallest inertia is not a good way to choose k. Look for the "elbow" instead.' }
    ] }
  ]
});
})();

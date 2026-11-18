(function () {
const K = Course.kit;

/* ---------- small helpers (own file) ---------- */
// tween any custom update fn(p) with p from 0 to 1; respects F.instant and scene resets
function tw(F, ms, fn) {
  if (F.instant || ms <= 0) { fn(1); return Promise.resolve(); }
  const tk = F.token, t0 = performance.now(), ez = (Course.ease && Course.ease.io) || (t => t);
  return new Promise(res => { const f = now => { if (tk !== F.token) return; const p = Math.min(1, (now - t0) / ms); fn(ez(p)); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
}
// a dot that travels from (x1,y1) to (x2,y2) and disappears (skipped when replaying instantly)
function spark(F, x1, y1, x2, y2, color, ms, parent) {
  if (F.instant) return Promise.resolve();
  const c = F.circle(x1, y1, 5, { fill: color || 'var(--c-b)', stroke: 'var(--fig-bg)', 'stroke-width': 1.5, filter: 'url(#fx-glow)' }, parent);
  return tw(F, ms || 600, p => { c.setAttribute('cx', x1 + (x2 - x1) * p); c.setAttribute('cy', y1 + (y2 - y1) * p); }).then(() => c.remove());
}
const r1 = v => (Math.round(v * 10) / 10).toFixed(1);
// emphasis that works on any element (F.pulse scales around the element origin, so only use it on translated groups)
async function blink(F, el, n = 1) { if (F.instant) return; for (let i = 0; i < n; i++) { await F.to(el, { opacity: 0.3 }, 220); await F.to(el, { opacity: 1 }, 260); } }
async function pop(F, c, r0, n = 1) { if (F.instant) return; for (let i = 0; i < n; i++) { await F.to(c, { r: r0 * 1.5 }, 220, 'out'); await F.to(c, { r: r0 }, 280); } }

/* ---------- ridge regression (closed form) used by the leash scene: computed, not typed ---------- */
function solve(A, b) {
  const n = b.length; A = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((r, i) => r[n] / r[i]);
}
function ridge(xs, ys, deg, lam) {   // penalty on w1..w7, not on the bias w0
  const X = xs.map(x => Array.from({ length: deg + 1 }, (_, j) => Math.pow(x, j))), n = deg + 1;
  const A = [...Array(n)].map((_, i) => [...Array(n)].map((_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) + (i === j && i > 0 ? lam : 0)));
  const b = [...Array(n)].map((_, i) => X.reduce((s, r, k) => s + r[i] * ys[k], 0));
  return solve(A, b);
}
/* verified with node: lambda 0 -> train error 0, test error 3.745, largest weight 44.66;
   lambda 0.02 -> train 0.007, test 0.035, largest 1.95; lambda 5 -> train 0.250, test 0.215 (too flat) */
const TX = [-0.9, -0.65, -0.4, -0.15, 0.1, 0.35, 0.6, 0.85], TY = [-0.55, -0.95, -0.62, -0.38, 0.42, 0.78, 0.98, 0.48];
const VX = [-0.98, -0.52, 0.22, 0.95], VY = [-0.3, -0.85, 0.62, 0.2];
const LAMS = [0, 0.02, 5];
const px = x => 250 + x * 190, py = y => 225 - y * 95;

const sceneLeash = {
  id: 'leash', title: 'Regularisation: a leash on the weights', w: 720, h: 400,
  build(F) {
    K.title(F, 'Fit eight points with a wiggly curve', 'a polynomial with 8 weights · filled = training points, hollow = new points');
    F.rect(55, 70, 390, 310, { rx: 10, fill: 'var(--card)', stroke: 'var(--line)' });
    F.line(55, py(0), 445, py(0), { stroke: 'var(--c-grid)', 'stroke-width': 1.2 });
    const cp = F.el('clipPath', { id: 'w07-leash-clip' }, F.defs); F.rect(56, 71, 388, 308, {}, cp);
    F.s.W = LAMS.map(l => ridge(TX, TY, 7, l));
    F.s.f = (w, x) => w.reduce((s, c, j) => s + c * Math.pow(x, j), 0);
    F.s.curveY = F.s.W.map(w => { const a = []; for (let i = 0; i <= 120; i++) a.push(F.s.f(w, -1 + i / 60)); return a; });
    F.s.curve = F.path('', { stroke: 'var(--c-b)', 'stroke-width': 3.2, 'stroke-linecap': 'round', 'clip-path': 'url(#w07-leash-clip)' });
    F.s.curve.style.opacity = 0;
    F.s.setCurve = ys => F.s.curve.setAttribute('d', ys.map((y, i) => (i ? 'L' : 'M') + px(-1 + i / 60).toFixed(1) + ',' + py(Math.max(-9, Math.min(9, y))).toFixed(1)).join(' '));
    F.s.cur = 0; F.s.setCurve(F.s.curveY[0]);
    F.s.err = F.g({}); F.s.err.style.opacity = 0;
    F.s.errL = VX.map(() => F.line(0, 0, 0, 0, { stroke: 'var(--bad)', 'stroke-width': 2.4, 'stroke-dasharray': '5 4', 'clip-path': 'url(#w07-leash-clip)' }, F.s.err));
    F.s.pts = TX.map((x, i) => F.circle(px(x), py(TY[i]), 7, { fill: 'var(--c-a)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }));
    F.s.test = F.g({}); F.s.test.style.opacity = 0;
    VX.forEach((x, i) => F.circle(px(x), py(VY[i]), 7, { fill: 'var(--fig-bg)', stroke: 'var(--c-c)', 'stroke-width': 3 }, F.s.test));
    // weight bars
    F.text(590, 82, 'size of each weight', { size: 13, weight: 700 });
    F.line(480, 330, 700, 330, { stroke: 'var(--c-soft)', 'stroke-width': 1.5 });
    F.line(480, 130, 700, 130, { stroke: 'var(--c-grid)', 'stroke-width': 1, 'stroke-dasharray': '4 4' });
    F.text(704, 130, '5+', { size: 10.5, cls: 'soft', anchor: 'start' });
    F.s.bars = []; for (let j = 1; j <= 7; j++) {
      const cx = 480 + (j - 0.5) * (220 / 7);
      const r = F.rect(cx - 10, 330, 20, 0, { rx: 4, fill: 'var(--c-b)' });
      const t = F.text(cx, 320, '', { size: 10.5, weight: 700, cls: 'mono' });
      F.text(cx, 344, 'w' + j, { size: 11, cls: 'soft' });
      F.s.bars.push({ r, t, cx });
    }
    F.s.bg = F.g({}); F.s.bg.style.opacity = 0; F.s.bg.append(...F.s.bars.flatMap(b => [b.r, b.t]));
    F.s.stat = F.text(590, 368, '', { size: 12, weight: 650, cls: 'mono' });
    F.s.setBars = (wa, wb, p) => F.s.bars.forEach((b, i) => {
      const v = Math.abs(wa[i + 1] + (wb[i + 1] - wa[i + 1]) * p), hgt = Math.min(v, 5) / 5 * 200;
      b.r.setAttribute('y', 330 - hgt); b.r.setAttribute('height', hgt); b.r.style.fill = v > 5 ? 'var(--bad)' : 'var(--c-b)';
      b.t.setAttribute('y', 322 - hgt); F.setText(b.t, v >= 10 ? String(Math.round(v)) : r1(v), b.cx);
    });
    F.s.setErr = ys => VX.forEach((x, i) => { const y = F.s.f(F.s.W[F.s.cur], x); const L = F.s.errL[i]; L.setAttribute('x1', px(x)); L.setAttribute('x2', px(x)); L.setAttribute('y1', py(VY[i])); L.setAttribute('y2', py(Math.max(-9, Math.min(9, y)))); });
    F.s.stats = k => { const w = F.s.W[k], tr = TX.reduce((s, x, i) => s + Math.pow(F.s.f(w, x) - TY[i], 2), 0) / 8, te = VX.reduce((s, x, i) => s + Math.pow(F.s.f(w, x) - VY[i], 2), 0) / 4;
      F.setText(F.s.stat, 'lambda = ' + LAMS[k] + '\ntrain error ' + tr.toFixed(2) + ' · test error ' + te.toFixed(2), 590, 16); };
    F.s.go = (k, ms) => { const a = F.s.curveY[F.s.cur], b = F.s.curveY[k], wa = F.s.W[F.s.cur], wb = F.s.W[k]; F.s.cur = k; F.s.stats(k);
      return tw(F, ms, p => { F.s.setCurve(a.map((y, i) => y + (b[i] - y) * p)); F.s.setBars(wa, wb, p); }).then(() => F.s.setErr()); };
    F.s.formula = K.callout(F, 250, 100, 'loss = error on data + lambda × (sum of squared weights)', { tone: 'accent', w: 380 });
    F.s.tight = K.callout(F, 250, 345, 'too tight: underfitting', { tone: 'warn', w: 200 });
  },
  steps: [
    { title: 'Learning by heart', say: ['Eight training points, and a curve with eight free weights.', 'The curve passes exactly through every point. The training error is zero.'],
      cues: [async F => { await Promise.all(F.s.pts.map(c => pop(F, c, 7))); },
             async F => { F.s.go(0, 0); F.s.setBars(F.s.W[0], F.s.W[0], 1); await F.draw(F.s.curve, 1300); await F.show(F.s.bg); }] },
    { title: 'New points arrive', say: ['Now new points arrive from the same source.', 'Near the edges the curve shoots far away. It memorised the noise instead of learning the shape.'],
      cues: [async F => { await F.show(F.s.test, 500); },
             async F => { F.s.setErr(); await F.show(F.s.err, 500); await blink(F, F.s.err, 2); }] },
    { title: 'A leash on every weight', say: ['Look at the weights. Some are larger than forty.', 'Regularisation ties every weight to zero with an elastic leash. Big weights now cost a penalty.', 'The curve relaxes into a smooth shape, and the new points are close again.'],
      cues: [async F => { await blink(F, F.s.bg, 2); },
             async F => { await F.show(F.s.formula); },
             async F => { await F.s.go(1, 1600); }] },
    { title: 'Not too tight', say: ['If the leash is too strong, every weight is pulled almost to zero.', 'The curve becomes nearly flat and misses even the training points. We tune the strength, lambda, on validation data.'],
      cues: [async F => { await F.hide(F.s.formula); await F.s.go(2, 1500); },
             async F => { await F.show(F.s.tight); }] }
  ]
};

/* ---------- scene 2: early stopping (curves verified: best validation epoch 24, loss 0.420) ---------- */
const trainL = t => 0.08 + 0.9 * Math.exp(-t / 9), valL = t => 0.22 + 0.8 * Math.exp(-t / 9) + 0.006 * t;
const ex2 = t => 80 + t * 9.6, ey2 = v => 350 - v * 240;
function bestEpoch() { let b = 0; for (let t = 1; t <= 60; t++) if (valL(t) < valL(b)) b = t; return b; }
const sceneStop = {
  id: 'stop', title: 'Early stopping', w: 720, h: 400,
  build(F) {
    K.title(F, 'Training loss and validation loss', 'one epoch = one full pass over the training data');
    F.rect(70, 92, 600, 268, { rx: 8, fill: 'var(--card)', stroke: 'var(--line)' });
    for (let t = 0; t <= 60; t += 10) { F.line(ex2(t), 92, ex2(t), 360, { stroke: 'var(--c-grid)' }); F.text(ex2(t), 374, String(t), { size: 11, cls: 'soft' }); }
    F.text(680, 374, 'epoch', { size: 11, cls: 'soft', anchor: 'end' });
    F.text(60, 100, 'loss', { size: 11, cls: 'soft', anchor: 'end' });
    // data split bar
    F.rect(380, 18, 230, 20, { rx: 6, fill: 'var(--c-closed)' }); F.rect(610, 18, 60, 20, { rx: 6, fill: 'var(--c-cur)' });
    F.text(495, 28, 'training data', { size: 11.5, weight: 700 }); F.text(640, 28, 'validation', { size: 11, weight: 700 });
    F.s.gap = F.path('', { fill: 'var(--bad-bg)', stroke: 'none' }); F.s.gap.style.opacity = 0;
    F.s.tr = F.path('', { stroke: 'var(--c-a)', 'stroke-width': 3.2, 'stroke-linecap': 'round' });
    F.s.va = F.path('', { stroke: 'var(--c-c)', 'stroke-width': 3.2, 'stroke-linecap': 'round' });
    F.s.trT = F.text(0, 0, 'training', { size: 12.5, weight: 700, fill: 'var(--c-a)', anchor: 'start' });
    F.s.vaT = F.text(0, 0, 'validation', { size: 12.5, weight: 700, fill: 'var(--c-c)', anchor: 'start' });
    F.s.T = 0;
    F.s.upTo = T => {
      const dd = f => { let s = ''; for (let t = 0; t <= T + 1e-9; t += 0.5) s += (t ? 'L' : 'M') + ex2(t).toFixed(1) + ',' + ey2(f(t)).toFixed(1); return s; };
      F.s.tr.setAttribute('d', dd(trainL)); F.s.va.setAttribute('d', dd(valL));
      const lx = Math.min(ex2(T) + 6, 590);
      F.s.trT.setAttribute('y', ey2(trainL(T)) + 12); F.s.trT.querySelectorAll('tspan').forEach(s => s.setAttribute('x', lx));
      F.s.vaT.setAttribute('y', ey2(valL(T)) - 12); F.s.vaT.querySelectorAll('tspan').forEach(s => s.setAttribute('x', lx));
      F.s.T = T;
    };
    F.s.grow = (T, ms) => { const a = F.s.T; return tw(F, ms, p => F.s.upTo(a + (T - a) * p)); };
    F.s.upTo(0.5);
    const b = bestEpoch(); F.s.best = b;
    let g = 'M' + ex2(b) + ',' + ey2(valL(b)); for (let t = b; t <= 60; t += 1) g += 'L' + ex2(t) + ',' + ey2(valL(t)); for (let t = 60; t >= b; t -= 1) g += 'L' + ex2(t) + ',' + ey2(trainL(t)); F.s.gap.setAttribute('d', g + 'Z');
    F.s.gapT = F.text(ex2(46), ey2(0.33), 'the gap grows:\noverfitting', { size: 12, weight: 700, fill: 'var(--bad)' }); F.s.gapT.style.opacity = 0;
    F.s.vline = F.line(ex2(b), 92, ex2(b), 360, { stroke: 'var(--ok)', 'stroke-width': 2.4, 'stroke-dasharray': '6 4' }); F.s.vline.style.opacity = 0;
    F.s.dot = F.circle(ex2(b), ey2(valL(b)), 8, { fill: 'var(--ok)', stroke: 'var(--fig-bg)', 'stroke-width': 2.5 }); F.s.dot.style.opacity = 0;
    F.s.save = K.callout(F, ex2(b), 130, 'best: epoch ' + b + ' · weights saved', { tone: 'ok', w: 230 });
    F.s.pat = F.rect(ex2(b), 92, ex2(b + 5) - ex2(b), 268, { fill: 'var(--warn-bg)', opacity: 0 });
    F.s.patT = F.text(ex2(b + 2.5), 345, 'patience 5', { size: 11.5, weight: 700, fill: 'var(--warn)' }); F.s.patT.style.opacity = 0;
    F.s.stopT = K.callout(F, ex2(b + 5) + 70, 200, 'stop at epoch ' + (b + 5) + '\nroll back to ' + b, { tone: 'warn', w: 150 });
    F.s.back = F.arrow(ex2(b + 5), 230, ex2(b) + 10, 230, { color: 'var(--warn)', w: 2.6 }); F.s.back.style.opacity = 0;
  },
  steps: [
    { title: 'Hold some data back', say: ['We keep part of the data away from training. It is called the validation set.', 'After each epoch, which is one pass over the training data, we measure the loss on both sets.'],
      cues: [async F => { await blink(F, F.s.trT, 1); await blink(F, F.s.vaT, 1); }, async F => { await F.s.grow(8, 1200); }] },
    { title: 'Two curves part ways', say: ['At first both losses fall together. The network learns real patterns.', 'Later the training loss keeps falling, but the validation loss turns and rises again.'],
      cues: [async F => { await F.s.grow(F.s.best, 1500); }, async F => { await F.s.grow(60, 2000); await F.show(F.s.gap); await F.show(F.s.gapT); }] },
    { title: 'Save the best moment', say: ['The best moment is the bottom of the validation curve, here at epoch twenty four.', 'Early stopping keeps a copy of the weights from that moment.'],
      cues: [async F => { F.s.upTo(60); await F.show(F.s.vline); await F.show(F.s.dot); await pop(F, F.s.dot, 8, 2); }, async F => { await F.show(F.s.save); }] },
    { title: 'Patience, then stop', say: ['We wait a few more epochs, called the patience, to be sure the curve really turned.', 'Then we stop and roll back to the saved weights. It is a cheap guard against overfitting.'],
      cues: [async F => { await F.to(F.s.pat, { opacity: 0.8 }, 500); await F.show(F.s.patT); }, async F => { await F.show(F.s.stopT); await F.show(F.s.back); }] }
  ]
};

/* ---------- scene 3: dropout and the brain ---------- */
const LX = [90, 215, 340, 450], LN = [3, 5, 5, 1];
const ny = (l, i) => 240 + (i - (LN[l] - 1) / 2) * 54;
const MASKS = [[[1, 4], [0, 2, 3]], [[0, 2, 3], [1, 4]], [[2], [0, 3]]];   // switched-off units in hidden layers 1 and 2
const sceneDrop = {
  id: 'dropout', title: 'Dropout, and the brain connection', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'Dropout: switch random units off while training', 'each hidden unit is dropped with probability p = 0.5, a new random choice on every pass');
    F.s.E = []; const eg = F.g({});
    for (let l = 0; l < 3; l++) for (let i = 0; i < LN[l]; i++) for (let j = 0; j < LN[l + 1]; j++)
      F.s.E.push({ l, i, j, el: F.line(LX[l] + 18, ny(l, i), LX[l + 1] - 18, ny(l + 1, j), { stroke: 'var(--c-node-line)', 'stroke-width': 1.6, opacity: 0.7 }, eg) });
    F.s.N = LN.map((n, l) => Array.from({ length: n }, (_, i) => {
      const g = F.g({ transform: `translate(${LX[l]},${ny(l, i)})` }); g.__t = { x: LX[l], y: ny(l, i), s: 1, r: 0 };
      const c = F.circle(0, 0, 17, { fill: l === 0 ? 'var(--c-start)' : l === 3 ? 'var(--c-goal)' : 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 2, filter: 'url(#fx-soft)' }, g);
      const x = F.path('M-8,-8 L8,8 M8,-8 L-8,8', { stroke: 'var(--bad)', 'stroke-width': 3, 'stroke-linecap': 'round' }, g); x.style.opacity = 0;
      return { g, c, x, on: true };
    }));
    ['inputs', 'hidden 1', 'hidden 2', 'output'].forEach((t, l) => F.text(LX[l], 392, t, { size: 12, cls: 'soft' }));
    F.s.team = F.path(`M${LX[1]},${ny(1, 1)} Q${(LX[1] + LX[2]) / 2},${ny(1, 1) - 50} ${LX[2]},${ny(2, 1)}`, { stroke: 'var(--c-c)', 'stroke-width': 4, 'stroke-dasharray': '7 5' }); F.s.team.style.opacity = 0;
    F.s.teamT = F.text((LX[1] + LX[2]) / 2, ny(1, 1) - 46, 'a fragile team', { size: 12, weight: 700, fill: 'var(--c-c)' }); F.s.teamT.style.opacity = 0;
    F.s.passT = F.text(270, 66, '', { size: 14, weight: 750, fill: 'var(--accent2)' });
    F.s.c1 = K.callout(F, 270, 95, 'no unit can rely on one partner', { tone: 'ok', w: 260 });
    F.s.c2 = K.callout(F, 270, 95, 'training: kept outputs × 1/(1 − p) = × 2 · test: all on', { tone: 'accent', w: 400 });
    F.s.mask = (m, ms) => { const off = [new Set(m ? m[0] : []), new Set(m ? m[1] : [])];
      const jobs = [];
      for (let l = 1; l <= 2; l++) F.s.N[l].forEach((u, i) => { u.on = !off[l - 1].has(i); jobs.push(F.to(u.c, { fill: u.on ? 'var(--c-node)' : 'var(--c-grid)', stroke: u.on ? 'var(--c-node-line)' : 'var(--c-soft)' }, ms)); jobs.push(F.to(u.x, { opacity: u.on ? 0 : 1 }, ms)); });
      F.s.E.forEach(e => { const a = F.s.N[e.l][e.i].on, b = F.s.N[e.l + 1][e.j].on; jobs.push(F.to(e.el, { opacity: a && b ? 0.7 : 0.08 }, ms)); });
      return Promise.all(jobs); };
    F.s.flow = async () => { if (F.instant) return; for (let l = 0; l < 3; l++) { const js = []; F.s.E.forEach(e => { if (e.l === l && F.s.N[l][e.i].on && F.s.N[l + 1][e.j].on) js.push(spark(F, LX[l], ny(l, e.i), LX[l + 1], ny(l + 1, e.j), 'var(--c-b)', 420)); }); await Promise.all(js); } };
    // brain panel
    F.s.brain = F.g({}); F.s.brain.style.opacity = 0; const B = F.s.brain;
    F.rect(540, 66, 340, 316, { rx: 14, fill: 'var(--card)', stroke: 'var(--line)' }, B);
    F.text(710, 88, 'In the brain (an analogy)', { size: 14, weight: 750 }, B);
    F.s.bn = [0, 1, 2, 3, 4].map(i => { const x = 590 + i * 60, y = 230; const g = F.g({ transform: `translate(${x},${y})` }, B); g.__t = { x, y, s: 1, r: 0 };
      F.line(0, 14, 0, 70, { stroke: 'var(--c-node-line)', 'stroke-width': 2 }, g);
      const body = F.path('M0,-18 L15,12 L-15,12 Z', { fill: 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
      return { g, body, x, y }; });
    F.s.inT = F.text(710, 124, 'incoming spikes', { size: 11.5, cls: 'soft' }, B);
    F.s.fails = [1, 3].map(i => { const t = F.path('M-6,-6 L6,6 M6,-6 L-6,6', { stroke: 'var(--bad)', 'stroke-width': 3, 'stroke-linecap': 'round', transform: `translate(${590 + i * 60},${180})` }, B); t.style.opacity = 0; return t; });
    F.s.failT = F.text(710, 106, '× = synapse failed to pass the spike', { size: 11.5, weight: 650, fill: 'var(--bad)' }, B); F.s.failT.style.opacity = 0;
    F.s.inh = F.g({}, B); F.s.inh.style.opacity = 0;
    for (let i = 0; i < 4; i++) F.path(`M${596 + i * 60},${262} Q${620 + i * 60},${292} ${644 + i * 60},${262}`, { stroke: 'var(--bad)', 'stroke-width': 2.2, 'stroke-dasharray': '4 3' }, F.s.inh);
    F.text(710, 318, 'neighbours inhibit each other: they compete', { size: 11.5, weight: 650, fill: 'var(--bad)' }, F.s.inh);
    F.s.c3 = K.callout(F, 710, 356, 'inspiration, not the same mechanism', { tone: 'warn', w: 280 });
  },
  steps: [
    { title: 'A normal network', say: ['Signals flow from the inputs, through two hidden layers, to the output.', 'Some units form fragile teams that only work together, and memorise the training set.'],
      cues: [async F => { await F.s.mask(null, 0); await F.s.flow(); }, async F => { await F.show(F.s.team); await F.show(F.s.teamT); }] },
    { title: 'Switch units off', say: ['During training, dropout switches off each hidden unit at random, here with probability one half.', 'A switched off unit outputs zero for this pass, and its connections go dark.'],
      cues: [async F => { await F.hide(F.s.team); await F.hide(F.s.teamT); F.setText(F.s.passT, 'training pass 1', 270); await F.s.mask(MASKS[0], 500); }, async F => { await F.s.flow(); }] },
    { title: 'A new mask every pass', say: ['On the next pass, a different random set is off. Then another.', 'No unit can count on a fixed partner, so each one must learn something useful on its own.'],
      cues: [async F => { F.setText(F.s.passT, 'training pass 2', 270); await F.s.mask(MASKS[1], 450); await F.s.flow(); F.setText(F.s.passT, 'training pass 3', 270); await F.s.mask(MASKS[2], 450); await F.s.flow(); },
             async F => { await F.show(F.s.c1); }] },
    { title: 'At test time', say: ['When we use the trained network, all units are on.', 'During training the surviving outputs were doubled, so the total signal stays about the same. This is called inverted dropout.'],
      cues: [async F => { await F.hide(F.s.c1); F.setText(F.s.passT, 'test: every unit on', 270); await F.s.mask(null, 450); await F.s.flow(); }, async F => { await F.show(F.s.c2); }] },
    { title: 'The brain connection', say: ['Brains are noisy. A synapse often fails to pass on a spike, and neighbouring neurons inhibit each other: they compete.', 'This pushes the brain toward robust codes that do not depend on one cell.', 'Dropout borrows this idea. It is an inspiration and an analogy, not the same mechanism as in the brain.'],
      cues: [async F => { await F.hide(F.s.c2); await F.show(F.s.brain, 500);
               const js = F.s.bn.map((n, i) => spark(F, n.x, 140, n.x, (i === 1 || i === 3) ? 180 : 208, 'var(--c-b)', 700)); await Promise.all(js);
               for (const t of F.s.fails) F.show(t); await F.show(F.s.failT); },
             async F => { await F.show(F.s.inh); await F.to(F.s.bn[2].body, { fill: 'var(--c-cur)', stroke: 'var(--c-c)' }, 400); await F.all([[F.s.bn[1].body, { opacity: 0.35 }, 400], [F.s.bn[3].body, { opacity: 0.35 }, 400]]); await F.pulse(F.s.bn[2].g, 2); },
             async F => { await F.show(F.s.c3); }] }
  ]
};

/* ---------- scene 4: convolution (numbers verified: map rows 3 3 −3 −3 / 3 3 −3 −3 / 2 2 −2 −2 / 1 1 −1 −1, pool 3 0 / 2 0) ---------- */
const IMG = [[0, 0, 1, 1, 0, 0], [0, 0, 1, 1, 0, 0], [0, 0, 1, 1, 0, 0], [0, 0, 1, 1, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
const KER = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
const CONV = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => { let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += IMG[i + a][j + b] * KER[a][b]; return s; }));
const CS = 40, IX = 40, IY = 92, KX = 330, KY = 132, OX = 520, OY = 112, PX = 760, PY = 152;
const valFill = v => v > 0 ? 'var(--ok-bg)' : v < 0 ? 'var(--bad-bg)' : 'var(--card)';
const valInk = v => v > 0 ? 'var(--ok)' : v < 0 ? 'var(--bad)' : 'var(--c-ink)';
const sceneConv = {
  id: 'conv', title: 'A filter slides over an image', w: 900, h: 440, wide: true,
  build(F) {
    K.title(F, 'Convolution: one small filter, slid over the whole image', 'multiply the numbers under the filter, add them up, write the sum into the feature map');
    const cell = (x, y, v, fill, ink, parent) => { const g = F.g({ transform: `translate(${x},${y})` }, parent); g.__t = { x, y, s: 1, r: 0 };
      const r = F.rect(-CS / 2 + 1.5, -CS / 2 + 1.5, CS - 3, CS - 3, { rx: 6, fill, stroke: 'var(--line)', 'stroke-width': 1.2 }, g);
      const t = F.text(0, 0.5, v, { size: 15, weight: 750, cls: 'mono', fill: ink }, g); return { g, r, t }; };
    F.s.imgG = F.g({}); F.text(IX + 3 * CS - CS / 2, IY - 36, 'image (6 × 6)', { size: 13, weight: 700 }, F.s.imgG);
    F.s.img = IMG.map((row, i) => row.map((v, j) => cell(IX + j * CS, IY + i * CS, String(v), v ? 'var(--c-path)' : 'var(--c-node)', 'var(--c-ink)', F.s.imgG)));
    F.s.imgG.style.opacity = 0;
    F.s.kerG = F.g({}); F.text(KX + CS, KY - 36, 'filter (3 × 3)', { size: 13, weight: 700 }, F.s.kerG);
    F.s.ker = KER.map((row, i) => row.map((v, j) => cell(KX + j * CS, KY + i * CS, (v > 0 ? '+' : '') + v, v > 0 ? 'var(--ok-bg)' : v < 0 ? 'var(--bad-bg)' : 'var(--card)', valInk(v), F.s.kerG)));
    F.s.kerG.style.opacity = 0;
    F.s.outG = F.g({}); F.text(OX + 1.5 * CS, OY - 36, 'feature map (4 × 4)', { size: 13, weight: 700 }, F.s.outG);
    F.s.out = CONV.map((row, i) => row.map((v, j) => cell(OX + j * CS, OY + i * CS, '', 'var(--card)', 'var(--c-ink)', F.s.outG)));
    F.s.outG.style.opacity = 0;
    F.s.win = F.g({ transform: `translate(${IX},${IY})` }); F.s.win.__t = { x: IX, y: IY, s: 1, r: 0 };
    F.rect(-CS / 2 - 2, -CS / 2 - 2, 3 * CS + 4, 3 * CS + 4, { rx: 9, fill: 'color-mix(in srgb, var(--c-b) 12%, transparent)', stroke: 'var(--c-b)', 'stroke-width': 3.5 }, F.s.win);
    F.s.win.style.opacity = 0;
    F.s.link = F.line(0, 0, 0, 0, { stroke: 'var(--c-b)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }); F.s.link.style.opacity = 0;
    F.s.place = (i, j) => { const x = IX + j * CS, y = IY + i * CS; F.s.link.setAttribute('x1', x + 2 * CS + 2); F.s.link.setAttribute('y1', y + CS); F.s.link.setAttribute('x2', OX + j * CS - CS / 2); F.s.link.setAttribute('y2', OY + i * CS); return F.to(F.s.win, { tx: x, ty: y }, F.instant ? 0 : 160); };
    F.s.fill = (i, j, v) => { const c = F.s.out[i][j]; F.setText(c.t, String(v), 0); c.t.style.fill = valInk(v); c.r.style.fill = valFill(v); };
    F.s.sum = K.callout(F, 300, 392, 'each row: (−1)·0 + 0·0 + (+1)·1 = 1 · three rows: 1 + 1 + 1 = 3', { tone: 'accent', w: 470 });
    F.s.edgeT = K.callout(F, OX + 1.5 * CS, OY + 3.5 * CS + 50, '+ dark→bright   − bright→dark   0 no edge', { tone: 'ok', w: 320 });
    F.s.relu = F.text(OX + 1.5 * CS, OY + 3.5 * CS + 92, '', { size: 13, weight: 700, fill: 'var(--accent2)' });
    F.s.poolG = F.g({}); F.s.poolG.style.opacity = 0;
    F.text(PX + CS / 2, PY - 36, 'max pool (2 × 2)', { size: 13, weight: 700 }, F.s.poolG);
    const POOLC = ['var(--c-a)', 'var(--c-b)', 'var(--c-c)', 'var(--c-d)'];
    F.s.pool = [0, 1].map(a => [0, 1].map(b => { const k = a * 2 + b, relu = [0, 1].flatMap(u => [0, 1].map(v => Math.max(0, CONV[2 * a + u][2 * b + v]))), m = Math.max(...relu);
      const c = cell(PX + b * CS, PY + a * CS, String(m), valFill(m), valInk(m), F.s.poolG); c.r.style.stroke = POOLC[k]; c.r.setAttribute('stroke-width', 3);
      F.rect(OX + 2 * b * CS - CS / 2 + 1, OY + 2 * a * CS - CS / 2 + 1, 2 * CS - 2, 2 * CS - 2, { rx: 8, fill: 'none', stroke: POOLC[k], 'stroke-width': 3 }, F.s.poolG); return c; }));
    F.s.stack = F.g({}); F.s.stack.style.opacity = 0;
    [['edges', 120], ['shapes', 330], ['objects', 540]].forEach(([t, x], i) => { F.box(x, 418, 150, 30, t, { fill: 'var(--accent2-bg)', stroke: 'var(--accent2)', size: 13, weight: 750 }, F.s.stack); if (i < 2) F.arrow(x + 80, 418, x + 128, 418, { color: 'var(--accent2)', w: 2.4 }, F.s.stack); });
    F.text(700, 418, 'deeper layers = bigger patterns', { size: 12, cls: 'soft', anchor: 'start' }, F.s.stack);
  },
  steps: [
    { title: 'An image is numbers', say: ['To a computer, an image is a grid of numbers. Here one means a bright pixel and zero means dark.', 'Our picture has a short bright bar near the top.'],
      cues: [async F => { await F.show(F.s.imgG, 600); }, async F => { for (let i = 0; i < 4; i++) F.pulse(F.s.img[i][2].g, 1); F.pulse(F.s.img[3][3].g, 1); await F.wait(600); }] },
    { title: 'A filter', say: ['A filter, also called a kernel, is a small three by three grid of weights.', 'This one has minus ones on the left and plus ones on the right. It looks for a change from dark to bright.'],
      cues: [async F => { await F.show(F.s.kerG, 500); }, async F => { for (let i = 0; i < 3; i++) { F.pulse(F.s.ker[i][0].g, 1); F.pulse(F.s.ker[i][2].g, 1); } await F.wait(700); }] },
    { title: 'Multiply and add', say: ['Place the filter on the top left corner. Multiply each pixel by the weight above it, and add the nine products.', 'Three bright pixels meet a plus one, so the sum is three. It goes into the feature map.'],
      cues: [async F => { await F.show(F.s.outG, 400); await F.s.place(0, 0); await F.show(F.s.win); await F.show(F.s.sum); },
             async F => { F.s.link.style.opacity = 1; F.s.fill(0, 0, CONV[0][0]); await F.pulse(F.s.out[0][0].g, 2); }] },
    { title: 'Slide over every position', say: ['Now slide the filter one step at a time over every position.', 'Plus three marks a dark to bright edge, and minus three a bright to dark edge. Smaller numbers mean only part of the edge is under the filter.'],
      cues: [async F => { await F.hide(F.s.sum); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { await F.s.place(i, j); F.s.fill(i, j, CONV[i][j]); if (!F.instant) await F.wait(140); } },
             async F => { await F.hide(F.s.win); F.s.link.style.opacity = 0; await F.show(F.s.edgeT); }] },
    { title: 'ReLU and pooling', say: ['Next, a ReLU keeps the positive numbers and turns the negative ones into zero.', 'Then max pooling keeps the largest number in each two by two block. The map shrinks, but the strong signals survive.'],
      cues: [async F => { await F.hide(F.s.edgeT); F.setText(F.s.relu, 'after ReLU: negatives become 0', OX + 1.5 * CS); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (CONV[i][j] < 0) F.s.fill(i, j, 0); await F.wait(300); },
             async F => { await F.show(F.s.poolG, 700); }] },
    { title: 'Stack many layers', say: ['A real network learns many filters, and stacks layer after layer of them.', 'Early layers find edges, middle layers find shapes, deep layers find objects. One small filter is reused everywhere, so there are few weights to learn.'],
      cues: [async F => { await F.show(F.s.stack, 600); }, async F => { await blink(F, F.s.kerG, 2); }] }
  ]
};

/* ---------- scene 5: transfer learning ---------- */
const BL = [['layer 1', 'edges'], ['layer 2', 'textures'], ['layer 3', 'parts'], ['layer 4', 'objects']];
const sceneTransfer = {
  id: 'transfer', title: 'Transfer learning: reuse what a network already knows', w: 900, h: 380, wide: true,
  build(F) {
    K.title(F, 'Freeze the backbone, train a new head', 'backbone = the pretrained layers · head = the final layer that gives the answer');
    F.s.img = F.box(70, 200, 80, 80, 'photo', { fill: 'var(--c-start)', size: 13, weight: 700 });
    F.s.B = BL.map((b, i) => F.box(200 + i * 135, 200, 112, 120, b[0] + '\n' + b[1], { fill: 'var(--c-open)', stroke: 'var(--c-b)', size: 13, weight: 700 }));
    F.s.locks = BL.map((b, i) => { const g = F.g({ transform: `translate(${200 + i * 135},${125})` }); g.__t = { x: 200 + i * 135, y: 125, s: 1, r: 0 };
      F.rect(-10, -4, 20, 15, { rx: 3, fill: 'var(--c-soft)' }, g); F.path('M-6,-4 L-6,-10 A6,6 0 0 1 6,-10 L6,-4', { stroke: 'var(--c-soft)', 'stroke-width': 3 }, g); g.style.opacity = 0; return g; });
    F.s.old = F.box(790, 200, 120, 76, 'old head\n1000 classes', { fill: 'var(--c-goal)', size: 12.5, weight: 700 });
    F.s.neu = F.box(790, 200, 120, 76, 'new head\n3 classes', { fill: 'var(--c-cur)', stroke: 'var(--c-c)', size: 12.5, weight: 700 }); F.s.neu.style.opacity = 0; F.set(F.s.neu, { ty: 330 });
    F.s.bb = F.text(402, 290, 'backbone', { size: 13, weight: 750, cls: 'soft' });
    F.s.stop = F.text(724, 160, '✕', { size: 22, weight: 800, fill: 'var(--bad)' }); F.s.stop.style.opacity = 0;
    F.s.c1 = K.callout(F, 450, 345, 'trained on over a million photos in 1000 classes', { tone: 'accent', w: 380 });
    F.s.c2 = K.callout(F, 450, 345, 'only the new head learns: few weights, little data needed', { tone: 'ok', w: 420 });
    F.s.c3 = K.callout(F, 450, 345, 'optional fine tuning: unfreeze the top layer, use a small learning rate', { tone: 'warn', w: 500 });
    F.s.fwd = async () => { if (F.instant) return; const xs = [70, 200, 335, 470, 605, 790]; for (let i = 0; i < xs.length - 1; i++) await spark(F, xs[i] + 40, 200, xs[i + 1] - 40, 200, 'var(--c-b)', 260); };
  },
  steps: [
    { title: 'A network that already sees', say: ['Start with a network trained on more than a million photos, in a thousand classes.', 'Its layers already detect edges, textures, parts and whole objects.'],
      cues: [async F => { await F.show(F.s.c1); await F.s.fwd(); }, async F => { for (const b of F.s.B) { F.pulse(b, 1); await F.wait(180); } }] },
    { title: 'Swap the head', say: ['Our new task: tell three plant diseases apart, from photos of leaves.', 'We remove the old output layer, called the head, and attach a new small head with three outputs.'],
      cues: [async F => { await F.pulse(F.s.img, 1); }, async F => { await F.to(F.s.old, { ty: 60, opacity: 0 }, 600); await F.to(F.s.neu, { ty: 200, opacity: 1 }, 600, 'back'); }] },
    { title: 'Freeze the backbone', say: ['We freeze the backbone. Its weights are locked and will not change.', 'During training, the error flows back only into the new head.'],
      cues: [async F => { await F.hide(F.s.c1); for (const b of F.s.B) F.to(b.rect, { fill: 'var(--c-grid)', stroke: 'var(--c-soft)' }, 400); for (const l of F.s.locks) F.show(l); await F.wait(450); },
             async F => { await spark(F, 860, 160, 800, 160, 'var(--c-c)', 500); await spark(F, 760, 160, 728, 160, 'var(--c-c)', 300); await F.show(F.s.stop); await F.show(F.s.c2); }] },
    { title: 'Why it works', say: ['With only a few hundred labelled photos, training a big network from zero would overfit badly.', 'Transfer learning reuses general features, so a small dataset is enough. Later we may unfreeze the top layer and fine tune it gently.'],
      cues: [async F => { await F.pulse(F.s.neu, 2); }, async F => { await F.hide(F.s.c2); await F.hide(F.s.locks[3]); await F.to(F.s.B[3].rect, { fill: 'var(--c-cur)', stroke: 'var(--c-c)' }, 500); await F.show(F.s.c3); }] }
  ]
};

/* ---------- exercises (answers computed in code) ---------- */
const tbl = (M, cls) => '<table class="mini">' + M.map(r => '<tr>' + r.map(v => `<td style="text-align:center;min-width:26px">${v}</td>`).join('') + '</tr>').join('') + '</table>';
const exConv = {
  title: 'One number of the feature map', random: true,
  gen(r) {
    const P = [0, 1, 2].map(() => [0, 1, 2].map(() => r.int(0, 4)));
    const KS = [[[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], [[-1, -1, -1], [0, 0, 0], [1, 1, 1]], [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], [[1, 0, -1], [2, 0, -2], [1, 0, -1]], [[0, 1, 0], [1, -4, 1], [0, 1, 0]]];
    const Kn = r.pick(KS); let s = 0; const terms = [];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { s += P[a][b] * Kn[a][b]; if (Kn[a][b] && P[a][b]) terms.push(`${P[a][b]}·(${Kn[a][b]})`); }
    return { prompt: `A 3 × 3 filter is placed on this 3 × 3 patch of an image. What number goes into the feature map?<div style="display:flex;gap:28px;flex-wrap:wrap;margin-top:8px"><div><b>patch</b>${tbl(P)}</div><div><b>filter</b>${tbl(Kn)}</div></div>`,
      hint: 'Multiply each pixel by the filter weight in the same place, then add all nine products. Zeros can be skipped.',
      answer: `Non-zero products: ${terms.length ? terms.join(' + ') : 'none'} = <b>${s}</b>.`, check: { type: 'number', answer: s, tol: 0.01 } };
  }
};
const exSize = {
  title: 'How big is the feature map?', random: true,
  gen(r) {
    let n, k, s, p; do { n = r.int(5, 14); k = r.pick([2, 3, 5]); s = r.pick([1, 2]); p = r.pick([0, 0, 1]); } while ((n + 2 * p - k) % s !== 0 || n + 2 * p < k);
    const o = (n + 2 * p - k) / s + 1;
    return { prompt: `An image is ${n} × ${n} pixels. A ${k} × ${k} filter moves with stride ${s} (steps of ${s} pixel${s > 1 ? 's' : ''})${p ? ', and the image gets a border of zeros, 1 pixel wide (padding 1)' : ', with no padding'}. What is the width of the feature map?`,
      hint: 'Width = (n + 2 × padding − k) / stride + 1.', answer: `(${n} + ${2 * p} − ${k}) / ${s} + 1 = ${(n + 2 * p - k)} / ${s} + 1 = <b>${o}</b>. The map is ${o} × ${o}.`, check: { type: 'number', answer: o, tol: 0.01 } };
  }
};
const exPool = {
  title: 'Max pooling', random: true,
  gen(r) {
    const M = [0, 1, 2, 3].map(() => [0, 1, 2, 3].map(() => r.int(0, 9)));
    const P = [0, 1].map(a => [0, 1].map(b => Math.max(M[2 * a][2 * b], M[2 * a][2 * b + 1], M[2 * a + 1][2 * b], M[2 * a + 1][2 * b + 1])));
    const s = P[0][0] + P[0][1] + P[1][0] + P[1][1];
    return { prompt: `Apply 2 × 2 max pooling (stride 2) to this 4 × 4 feature map. You get a 2 × 2 map. What is the <b>sum</b> of its four numbers?${tbl(M)}`,
      hint: 'Split the map into four 2 × 2 blocks (top left, top right, bottom left, bottom right). Keep the largest number of each block.',
      answer: `Block maxima: ${P[0][0]}, ${P[0][1]}, ${P[1][0]}, ${P[1][1]}. Sum = <b>${s}</b>.`, check: { type: 'number', answer: s, tol: 0.01 } };
  }
};
const exDrop = {
  title: 'Inverted dropout', random: true,
  gen(r) {
    const opt = r.pick([[0.5, 2, 1], [0.2, 1.25, 4], [0.75, 4, 1], [0.8, 5, 1]]), p = opt[0], scale = opt[1];
    const a = opt[2] * r.int(1, 6);
    if (r.chance(0.5)) {
      const v = a * scale;
      return { prompt: `A layer uses inverted dropout with drop probability p = ${p}. A unit is <b>kept</b> on this training pass, and its output before scaling is ${a}. What value does it pass on?`,
        hint: 'Kept outputs are multiplied by 1 / (1 − p), so the average signal stays the same as at test time.',
        answer: `Scale = 1 / (1 − ${p}) = ${scale}. Output = ${a} × ${scale} = <b>${v}</b>. At test time no unit is dropped and nothing is scaled.`, check: { type: 'number', answer: v, tol: 0.01 } };
    }
    const n = r.pick([20, 40, 60, 100, 200]), kept = n * (1 - p);
    return { prompt: `A hidden layer has ${n} units and dropout probability p = ${p}. On average, how many units are <b>active</b> (kept) on one training pass?`,
      hint: 'Each unit is kept with probability 1 − p.', answer: `${n} × (1 − ${p}) = <b>${+kept.toFixed(2)}</b> units on average. The exact number changes from pass to pass.`, check: { type: 'number', answer: kept, tol: 0.01 } };
  }
};
const exL2 = {
  title: 'The size of the leash (L2 penalty)', random: true,
  gen(r) {
    const w = [0, 1, 2].map(() => r.pick([-3, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 3])), lam = r.pick([0.1, 0.5, 1, 0.01]);
    const ss = w.reduce((s, v) => s + v * v, 0), pen = Math.round(lam * ss * 10000) / 10000;
    return { prompt: `A model has weights w = (${w.join(', ')}) and regularisation strength λ = ${lam}. The penalty is λ × (sum of squared weights). What is the penalty?`,
      hint: 'Square each weight (a negative number squared is positive), add the squares, then multiply by λ.',
      answer: `Squares: ${w.map(v => v * v).join(' + ')} = ${ss}. Penalty = ${lam} × ${ss} = <b>${pen}</b>.`, check: { type: 'number', answer: pen, tol: 0.001 } };
  }
};
const exStop = {
  title: 'When does early stopping stop?', random: true,
  gen(r) {
    const m = r.int(3, 7), pat = r.pick([2, 3, 4]), n = m + pat + r.int(1, 3); const v = [];
    let cur = r.int(80, 95) / 100; for (let t = 1; t <= m; t++) { v.push(cur); cur = Math.round((cur - r.int(3, 9) / 100) * 100) / 100; }
    const best = v[m - 1]; for (let t = m + 1; t <= n; t++) v.push(Math.round((best + r.int(1, 8) / 100 + (t - m) * 0.01) * 100) / 100);
    const stop = m + pat;
    return { prompt: `Validation loss after each epoch:<table class="mini"><tr><th>epoch</th>${v.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr><tr><td>loss</td>${v.map(x => `<td>${x.toFixed(2)}</td>`).join('')}</tr></table>Early stopping uses patience ${pat}: it stops when the validation loss has not improved for ${pat} epochs in a row. After which epoch does training stop?`,
      hint: 'Find the epoch with the lowest validation loss. Then count the patience epochs after it.',
      answer: `The lowest loss is ${best.toFixed(2)} at epoch ${m}. Epochs ${m + 1} to ${stop} do not improve, so training stops after epoch <b>${stop}</b> and the weights of epoch ${m} are restored.`, check: { type: 'number', answer: stop, tol: 0.01 } };
  }
};
const exHead = {
  title: 'How many weights does the new head have?', random: true,
  gen(r) {
    const d = r.pick([256, 512, 768, 1024, 2048]), k = r.int(2, 12), p = d * k + k;
    return { prompt: `A frozen backbone gives a vector of ${d} features for each photo. We attach a new head: one dense layer with ${k} outputs (one per class), with a bias for each output. How many weights does training change?`,
      hint: 'Every feature connects to every output, plus one bias per output. The frozen backbone does not count.',
      answer: `${d} × ${k} + ${k} = <b>${p}</b> trainable numbers. The millions of backbone weights stay fixed.`, check: { type: 'number', answer: p, tol: 0.01 } };
  }
};

Course.lecture({
  id: 'w07', num: 7, week: 7, kind: 'lecture', title: 'Neural networks 2: generalisation, convolution, transfer',
  lede: 'A network with many weights can learn the training set by heart. This week we put a leash on the weights, stop at the right moment, switch neurons off at random, and see how convolution and transfer learning let networks see with little data.',
  clos: [2], widgets: ['dropout', 'conv'],
  goals: ['explain <b>overfitting</b> and use <b>L2 regularisation</b> and <b>early stopping</b> against it',
    'describe <b>dropout</b>, compute inverted dropout scaling, and state honestly how it relates to noise and competition in the brain',
    'compute a <b>convolution</b> by hand, the size of a feature map, and a <b>max pooling</b> result',
    'explain <b>transfer learning</b>: freeze the backbone, train a new head, and count its weights'],
  chapters: [
    { id: 'leash', title: 'Learning by heart, and a leash on the weights', blocks: [
      { html: '<p><b>Generalisation</b> means doing well on data the model has never seen. A model that only remembers its training data is <b>overfitting</b>: low training error, high test error. Large weights let a model bend sharply to hit every noisy point, so one cure is to make large weights expensive.</p>' },
      { scene: sceneLeash },
      { note: '<b>L2 regularisation</b> (also called <b>weight decay</b>): loss = data error + $\\lambda \\sum_j w_j^2$. The gradient of the penalty is $2\\lambda w$, so every update also pulls each weight a little toward zero. The bias is usually not penalised.' },
      { exercise: exL2 },
      { quiz: { q: 'Training error is 0.00 and test error is very high. What is the most likely problem?', options: ['Overfitting: the model memorised the training data', 'Underfitting: the model is too simple', 'The learning rate is too small', 'The test set is too large'], correct: 0, why: 'Perfect training error with poor test error is the signature of overfitting. Regularisation, early stopping, dropout or more data help.' } }
    ] },
    { id: 'stop', title: 'Early stopping', blocks: [
      { html: '<p>Training longer is not always better. We watch a <b>validation set</b>: data held back from training and used only to decide <i>when</i> to stop and which settings (like λ) to use. The final <b>test set</b> stays untouched until the very end.</p>' },
      { scene: sceneStop },
      { exercise: exStop }
    ] },
    { id: 'dropout', title: 'Dropout, noise and competition', blocks: [
      { html: '<p><b>Dropout</b> (Srivastava, Hinton and colleagues, 2014) switches off each hidden unit with probability $p$ on every training pass. It is like training a huge crowd of smaller networks that share weights, and averaging them at test time.</p>' },
      { scene: sceneDrop },
      { widget: 'dropout' },
      { exercise: exDrop },
      { deeper: { title: 'How close is dropout to the brain?', html: '<p>Some facts are solid: synaptic transmission is <b>unreliable</b> (at many synapses a spike releases transmitter only some of the time), and <b>inhibitory interneurons</b> make nearby neurons compete, so only a few win and fire. Both can make neural codes spread out and robust.</p><p>But dropout is not a model of these mechanisms. Dropout removes whole units at random for one pass and rescales the rest; the brain has no such switch, and its noise and inhibition have many other roles. The original paper took its motivation from a different analogy: in sexual reproduction, genes must work well with many random partners. Treat the brain link as an inspiration, not an explanation.</p>' } },
      { quiz: { q: 'What happens to dropout when we use the trained network to make predictions?', options: ['It is turned off: all units are used', 'It keeps dropping half of the units', 'It drops the input layer instead', 'It doubles every weight'], correct: 0, why: 'At test time every unit is on. With inverted dropout the scaling was already done during training (kept outputs × 1/(1 − p)), so nothing changes at test time.' } }
    ] },
    { id: 'conv', title: 'Convolutional networks', blocks: [
      { html: '<p>A photo of 200 × 200 pixels has 40 000 numbers. Connecting each pixel to every unit would need millions of weights. A <b>convolutional layer</b> uses one small <b>filter</b> (kernel) and slides it over the whole image. The result is a <b>feature map</b> that shows where the pattern appears.</p>' },
      { scene: sceneConv },
      { exercise: exConv },
      { exercise: exSize },
      { exercise: exPool },
      { widget: 'conv' }
    ] },
    { id: 'transfer', title: 'Transfer learning', blocks: [
      { html: '<p>Training a large network needs a lot of data and computing time. If someone has already trained one on a big image collection, its early and middle layers hold general skills (edges, textures, shapes) that help with almost any picture task.</p>' },
      { scene: sceneTransfer },
      { exercise: exHead },
      { quiz: { q: 'You have 300 labelled X-ray images. What is the best first plan?', options: ['Take a pretrained network, freeze the backbone, and train a new head', 'Train a large network from random weights', 'Use only a single neuron', 'Remove the validation set to have more training data'], correct: 0, why: 'With little data, training from scratch overfits. Reusing pretrained features and training only the head needs far fewer examples. Keep a validation set to check.' } },
      { quiz: { q: 'Why does a convolutional layer need far fewer weights than a fully connected layer on images?', options: ['The same small filter is reused at every position of the image', 'It ignores most of the pixels', 'It only works on black and white images', 'Pooling removes all the weights'], correct: 0, why: 'Weight sharing: one 3 × 3 filter has 9 weights (plus a bias) no matter how large the image is.' } }
    ] }
  ]
});
})();

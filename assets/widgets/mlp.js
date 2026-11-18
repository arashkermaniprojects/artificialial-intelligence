/* Tiny neural-network playground (pure JS): 2-D toy data, 1 or 2 hidden layers, tanh / ReLU, live training with backpropagation,
   decision-region heat map, loss curve and a network diagram. */
Course.widget('mlp', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('mlp-css')) {
    const st = document.createElement('style'); st.id = 'mlp-css';
    st.textContent = `.mlpw .verd{border-radius:8px;padding:7px 10px;font-size:13.5px;line-height:1.4}
    .mlpw .verd.ok{background:var(--ok-bg);color:var(--ok)} .mlpw .verd.warn{background:var(--warn-bg);color:var(--warn)} .mlpw .verd.bad{background:var(--bad-bg);color:var(--bad)} .mlpw .verd.info{background:var(--accent2-bg);color:var(--accent2)}
    .mlpw svg text{font-family:var(--sans);fill:var(--c-ink)} .mlpw svg .soft{fill:var(--c-soft)}
    .mlpw output{font:600 13px var(--mono);color:var(--fg);min-width:34px;display:inline-block}`;
    document.head.append(st);
  }
  root.classList.add('mlpw');
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
  /* ---------- data (coordinates in [-1, 1]) ---------- */
  const S = { data: opts.data || 'xor', hid: 4, layers: 1, act: 'tanh', lrS: 65, speed: 5 };
  let seed = 3, X = [], Y = [];
  function gauss(r) { let u = 0, v = 0; while (!u) u = r.next(); while (!v) v = r.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function makeData() {
    const r = C.rng(seed); X = []; Y = []; const add = (x, y, c) => { X.push([Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]); Y.push(c); };
    if (S.data === 'xor') { for (let i = 0; i < 200; i++) { const x = (r.next() * 2 - 1) * 0.95, y = (r.next() * 2 - 1) * 0.95; if (Math.abs(x) < 0.08 || Math.abs(y) < 0.08) { i--; continue; } add(x, y, x * y > 0 ? 0 : 1); } }
    else if (S.data === 'circles') { for (let i = 0; i < 200; i++) { const a = r.next() * 2 * Math.PI, inner = i % 2 === 0, rad = inner ? 0.35 * Math.sqrt(r.next()) : 0.62 + 0.3 * r.next(); add(rad * Math.cos(a), rad * Math.sin(a), inner ? 1 : 0); } }
    else if (S.data === 'spiral') { for (let c = 0; c < 2; c++) for (let i = 0; i < 110; i++) { const t = i / 110, ang = t * 3.4 * Math.PI + c * Math.PI, rad = 0.08 + 0.85 * t; add(rad * Math.cos(ang) + 0.03 * gauss(r), rad * Math.sin(ang) + 0.03 * gauss(r), c); } }
    else { for (let i = 0; i < 200; i++) { const c = i % 2; add((c ? 0.4 : -0.4) + 0.22 * gauss(r), (c ? 0.35 : -0.35) + 0.22 * gauss(r), c); } }
  }
  /* ---------- the network ---------- */
  let sizes, W, B, VW, VB, epoch = 0, lossHist = [], state = 'ready';
  const actF = z => S.act === 'relu' ? (z > 0 ? z : 0) : Math.tanh(z);
  const actD = (z, a) => S.act === 'relu' ? (z > 0 ? 1 : 0) : 1 - a * a;
  const sigm = z => 1 / (1 + Math.exp(-z));
  function initNet() {
    sizes = [2, ...Array(S.layers).fill(S.hid), 1];
    const r = C.rng(1000 + seed * 7 + S.hid * 31 + S.layers * 101 + (S.act === 'relu' ? 5 : 0));
    W = []; B = []; VW = []; VB = [];
    for (let l = 0; l < sizes.length - 1; l++) {
      const nIn = sizes[l], nOut = sizes[l + 1], sc = S.act === 'relu' ? Math.sqrt(2 / nIn) : Math.sqrt(1 / nIn);
      W.push(Float64Array.from({ length: nIn * nOut }, () => gauss(r) * sc)); B.push(new Float64Array(nOut).fill(S.act === 'relu' ? 0.1 : 0));
      VW.push(new Float64Array(nIn * nOut)); VB.push(new Float64Array(nOut));
    }
    epoch = 0; lossHist = []; state = 'ready';
  }
  function forward(x, keep) {
    let a = x, Zs = [], As = [x];
    for (let l = 0; l < W.length; l++) {
      const nIn = sizes[l], nOut = sizes[l + 1], w = W[l], b = B[l], z = new Float64Array(nOut), out = new Float64Array(nOut), last = l === W.length - 1;
      for (let j = 0; j < nOut; j++) { let s = b[j]; for (let i = 0; i < nIn; i++) s += w[j * nIn + i] * a[i]; z[j] = s; out[j] = last ? sigm(s) : actF(s); }
      if (keep) { Zs.push(z); As.push(out); } a = out;
    }
    return keep ? { Zs, As } : a[0];
  }
  const lr = () => Math.pow(10, -3 + 3.5 * S.lrS / 100);   // 0.001 .. about 3.2
  function trainStep() {
    const gW = W.map(w => new Float64Array(w.length)), gB = B.map(b => new Float64Array(b.length)); let loss = 0, n = X.length;
    for (let k = 0; k < n; k++) {
      const { Zs, As } = forward(X[k], true), p = As[As.length - 1][0], y = Y[k];
      loss += -(y * Math.log(p + 1e-12) + (1 - y) * Math.log(1 - p + 1e-12));
      let delta = new Float64Array([p - y]);
      for (let l = W.length - 1; l >= 0; l--) {
        const nIn = sizes[l], nOut = sizes[l + 1], aPrev = As[l], w = W[l];
        for (let j = 0; j < nOut; j++) { gB[l][j] += delta[j]; for (let i = 0; i < nIn; i++) gW[l][j * nIn + i] += delta[j] * aPrev[i]; }
        if (l > 0) { const nd = new Float64Array(nIn); for (let i = 0; i < nIn; i++) { let s = 0; for (let j = 0; j < nOut; j++) s += w[j * nIn + i] * delta[j]; nd[i] = s * actD(Zs[l - 1][i], As[l][i]); } delta = nd; }
      }
    }
    const eta = lr();
    for (let l = 0; l < W.length; l++) {
      for (let i = 0; i < W[l].length; i++) { VW[l][i] = 0.9 * VW[l][i] - eta * gW[l][i] / n; W[l][i] += VW[l][i]; }
      for (let i = 0; i < B[l].length; i++) { VB[l][i] = 0.9 * VB[l][i] - eta * gB[l][i] / n; B[l][i] += VB[l][i]; }
    }
    epoch++; loss /= n; lossHist.push(loss); if (lossHist.length > 2000) lossHist.splice(0, lossHist.length - 2000);
    if (!isFinite(loss) || W.some(w => w.some(v => !isFinite(v) || Math.abs(v) > 1e6))) state = 'diverged';
    return loss;
  }
  const accuracy = () => X.reduce((s, x, k) => s + ((forward(x) > 0.5 ? 1 : 0) === Y[k] ? 1 : 0), 0) / X.length;
  /* ---------- DOM ---------- */
  const SZ = 420, GR = 56, MX = v => (v + 1.1) / 2.2 * SZ, MY = v => SZ - (v + 1.1) / 2.2 * SZ;
  const svg = el('svg', { viewBox: `0 0 ${SZ} ${SZ}` });
  const img = el('image', { x: 0, y: 0, width: SZ, height: SZ, preserveAspectRatio: 'none' }, svg); img.style.imageRendering = 'auto';
  el('line', { x1: MX(0), x2: MX(0), y1: 0, y2: SZ, stroke: 'var(--c-soft)', 'stroke-width': 0.8, opacity: 0.5 }, svg); el('line', { y1: MY(0), y2: MY(0), x1: 0, x2: SZ, stroke: 'var(--c-soft)', 'stroke-width': 0.8, opacity: 0.5 }, svg);
  const ptG = el('g', {}, svg);
  const cv = document.createElement('canvas'); cv.width = GR; cv.height = GR;
  const net = el('svg', { viewBox: '0 0 300 150' }); net.style.width = '100%';
  const lsvg = el('svg', { viewBox: '0 0 300 90' }); lsvg.style.width = '100%';
  const sEp = h('b', {}, '0'), sLoss = h('b', {}, '–'), sAcc = h('b', {}, '–'), sPar = h('b', {}, '–');
  const verdict = h('div', { class: 'verd info' }, '');
  const side = h('div', { class: 'widget-side' },
    h('div', { class: 'stat' }, h('span', {}, 'Epoch'), sEp, h('span', {}, 'Loss (cross-entropy)'), sLoss, h('span', {}, 'Accuracy'), sAcc, h('span', {}, 'Parameters'), sPar),
    h('div', {}, h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, 'Network (blue = positive weight, orange = negative)'), net),
    h('div', {}, h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, 'Loss during training'), lsvg), verdict);
  const sel = (label, options, val, fn) => { const s = h('select', {}, options.map(o => h('option', { value: o[0] }, o[1]))); s.value = val; s.onchange = () => fn(s.value); return [h('label', {}, label + ' ', s), s]; };
  const [dataL, dataS] = sel('Data', [['xor', 'XOR (four corners)'], ['circles', 'Circles'], ['spiral', 'Two spirals'], ['blobs', 'Two blobs (linear)']], S.data, v => { S.data = v; makeData(); reset(); });
  const [layL, layS] = sel('Hidden layers', [['1', '1'], ['2', '2']], '1', v => { S.layers = +v; reset(); });
  const [actL, actS] = sel('Activation', [['tanh', 'tanh'], ['relu', 'ReLU']], 'tanh', v => { S.act = v; reset(); });
  const hIn = h('input', { type: 'range', min: 1, max: 12, value: S.hid }), hOut = h('output', {}, String(S.hid));
  const lIn = h('input', { type: 'range', min: 0, max: 100, value: S.lrS }), lOut = h('output', {}, '');
  const spIn = h('input', { type: 'range', min: 1, max: 20, value: S.speed });
  hIn.oninput = () => { S.hid = +hIn.value; hOut.textContent = S.hid; reset(); };
  lIn.oninput = () => { S.lrS = +lIn.value; lOut.textContent = fmtLr(); if (state === 'diverged') reset(); };
  spIn.oninput = () => { S.speed = +spIn.value; };
  const fmtLr = () => { const v = lr(); return v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3); };
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  const bPlay = btn('▶ Train', () => toggle(), 'btn primary small');
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Neural network playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'gradient descent with momentum 0.9 · backpropagation')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), side),
    h('div', { class: 'widget-ctl' }, bPlay, btn('Step (1 epoch)', () => { stop(); if (state !== 'diverged') { trainStep(); state = state === 'diverged' ? state : 'training'; render(); } }), btn('Reset weights', () => reset()), btn('🎲 New data', () => { seed = (Math.random() * 1e6) | 0; makeData(); reset(); }), dataL),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Hidden neurons ', hIn, hOut), layL, actL, h('label', {}, 'Learning rate ', lIn, lOut), h('label', {}, 'Speed ', spIn)));
  /* ---------- drawing ---------- */
  function rgbOf(name, fb) { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); const m = v.match(/^#([0-9a-f]{6})$/i); if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; } return fb; }
  let cols = null; const getCols = () => (cols = { a: rgbOf('--c-b', [67, 56, 202]), b: rgbOf('--c-c', [180, 83, 9]), bg: rgbOf('--fig-bg', [251, 252, 253]) });
  function heat() {
    const ctx = cv.getContext('2d'); if (!ctx) return; if (!cols) getCols();
    const im = ctx.createImageData(GR, GR), d = im.data;
    for (let j = 0; j < GR; j++) for (let i = 0; i < GR; i++) {
      const x = -1.1 + 2.2 * (i + 0.5) / GR, y = 1.1 - 2.2 * (j + 0.5) / GR, p = forward([x, y]), t = Math.min(1, Math.abs(p - 0.5) * 2) * 0.62, c = p > 0.5 ? cols.a : cols.b, k = 4 * (j * GR + i);
      d[k] = cols.bg[0] + (c[0] - cols.bg[0]) * t; d[k + 1] = cols.bg[1] + (c[1] - cols.bg[1]) * t; d[k + 2] = cols.bg[2] + (c[2] - cols.bg[2]) * t; d[k + 3] = 255;
    }
    ctx.putImageData(im, 0, 0); img.setAttribute('href', cv.toDataURL());
  }
  function drawPts() { ptG.textContent = ''; X.forEach((p, k) => el('circle', { cx: MX(p[0]).toFixed(1), cy: MY(p[1]).toFixed(1), r: 4.2, fill: Y[k] ? 'var(--c-b)' : 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 1.3 }, ptG)); }
  function drawNet() {
    net.textContent = ''; const L = sizes.length, colX = l => 24 + l * (252 / (L - 1)), rowY = (l, i) => sizes[l] === 1 ? 75 : 12 + i * (126 / (sizes[l] - 1));
    let mx = 1e-9; W.forEach(w => w.forEach(v => { mx = Math.max(mx, Math.abs(v)); }));
    for (let l = 0; l < L - 1; l++) for (let j = 0; j < sizes[l + 1]; j++) for (let i = 0; i < sizes[l]; i++) { const v = W[l][j * sizes[l] + i]; el('line', { x1: colX(l), y1: rowY(l, i), x2: colX(l + 1), y2: rowY(l + 1, j), stroke: v >= 0 ? 'var(--c-b)' : 'var(--c-c)', 'stroke-width': (0.4 + 3.2 * Math.abs(v) / mx).toFixed(2), opacity: 0.75 }, net); }
    for (let l = 0; l < L; l++) for (let i = 0; i < sizes[l]; i++) el('circle', { cx: colX(l), cy: rowY(l, i), r: sizes[l] > 8 ? 5 : 7, fill: 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 1.4 }, net);
  }
  function drawLoss() {
    lsvg.textContent = ''; const x0 = 6, y0 = 6, w = 288, hh = 70; el('rect', { x: x0, y: y0, width: w, height: hh, fill: 'var(--card)', stroke: 'var(--line)', rx: 4 }, lsvg);
    if (lossHist.length < 2) { el('text', { x: 150, y: 46, 'text-anchor': 'middle', 'font-size': 11, class: 'soft' }, lsvg).textContent = 'press Train'; return; }
    const v = lossHist.map(x => isFinite(x) ? Math.min(x, 2) : 2), mxv = Math.max(0.75, ...v);
    const step = Math.max(1, Math.floor(v.length / 300)), pts = [];
    for (let i = 0; i < v.length; i += step) pts.push((x0 + i / (v.length - 1) * w).toFixed(1) + ',' + (y0 + hh - v[i] / mxv * hh).toFixed(1));
    el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 2 }, lsvg);
    el('text', { x: 150, y: 88, 'text-anchor': 'middle', 'font-size': 10.5, class: 'soft' }, lsvg).textContent = 'epoch 0 to ' + epoch + ' · random guessing = 0.69';
  }
  function render() {
    heat(); drawNet(); drawLoss();
    const acc = accuracy(), loss = lossHist.length ? lossHist[lossHist.length - 1] : NaN;
    sEp.textContent = epoch; sLoss.textContent = isFinite(loss) ? loss.toFixed(3) : (epoch ? '∞' : '–'); sAcc.textContent = (acc * 100).toFixed(1) + '%';
    let np = 0; for (let l = 0; l < sizes.length - 1; l++) np += (sizes[l] + 1) * sizes[l + 1]; sPar.textContent = np;
    if (state === 'diverged') { verdict.className = 'verd bad'; verdict.textContent = '✗ The loss exploded: the learning rate is too large. Lower it and press Reset weights.'; return; }
    const lineOnly = S.layers === 1 && S.hid === 1;
    if (acc >= 0.98 && epoch) { verdict.className = 'verd ok'; verdict.textContent = '✓ Solved: ' + (acc * 100).toFixed(1) + '% of the points are on the correct side after ' + epoch + ' epochs.'; }
    else if (lineOnly && (S.data === 'xor' || S.data === 'circles' || S.data === 'spiral') && epoch > 150) { verdict.className = 'verd warn'; verdict.textContent = 'One hidden neuron draws only one line, so it cannot separate these classes. Add hidden neurons.'; }
    else if (epoch > 100 && Math.abs(loss - 0.693) < 0.01 && acc < 0.7) { verdict.className = 'verd bad'; verdict.textContent = 'Stuck at loss 0.69, which is pure guessing. With a large learning rate, ReLU neurons can "die" (always output 0). Lower the learning rate and reset.'; }
    else if (S.data === 'spiral' && epoch > 600 && acc < 0.9) { verdict.className = 'verd warn'; verdict.textContent = 'Spirals are hard. Try 2 hidden layers with 8 or more neurons, and keep training.'; }
    else if (epoch > 40 && lossHist.length > 40 && lossHist[lossHist.length - 1] > lossHist[lossHist.length - 40] + 0.02) { verdict.className = 'verd warn'; verdict.textContent = 'The loss is going up and down: the learning rate may be too large.'; }
    else if (epoch) { verdict.className = 'verd info'; verdict.textContent = 'Training… every epoch runs a forward pass, backpropagation and one gradient descent step on all ' + X.length + ' points.'; }
    else { verdict.className = 'verd info'; verdict.textContent = 'The colours show the untrained network\'s answer (blue = class 1, orange = class 0). Press Train.'; }
  }
  /* ---------- loop ---------- */
  let running = false, raf = 0;
  function loop() { if (!running) return; for (let i = 0; i < S.speed && state !== 'diverged'; i++) trainStep(); if (state !== 'diverged') state = 'training'; render(); if (state === 'diverged' || (accuracy() >= 0.995 && epoch > 30 && lossHist[lossHist.length - 1] < 0.05)) { stop(); render(); return; } if (epoch >= 20000) { stop(); return; } raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); bPlay.textContent = '▶ Train'; }
  function toggle() { if (running) { stop(); return; } if (state === 'diverged') reset(); running = true; bPlay.textContent = '❚❚ Pause'; raf = requestAnimationFrame(loop); }
  function reset() { stop(); initNet(); render(); }
  lOut.textContent = fmtLr();
  makeData(); initNet(); drawPts(); render();
  const origMake = makeData; makeData = function () { origMake(); drawPts(); };
  if (window.MutationObserver) new MutationObserver(() => { getCols(); heat(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return { reset, toggle };
});

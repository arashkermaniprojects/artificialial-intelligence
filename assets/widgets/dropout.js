/* Dropout lab: a real 2-16-16-1 network trained in the browser on a small noisy dataset.
   Set the dropout rate, watch random masks, compare train and test accuracy and the decision map.
   Each run starts from the same initial weights and the same data, so only the dropout rate changes. */
Course.widget('dropout', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg', H = 16, NTR = 40, NTE = 400, EPOCHS = 1500;
  if (!document.getElementById('dropout-css')) {
    const st = document.createElement('style'); st.id = 'dropout-css';
    st.textContent = `
    .dpw .viz{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center}
    .dpw canvas{width:300px;max-width:100%;aspect-ratio:1;border-radius:10px;border:1px solid var(--line);background:var(--card)}
    .dpw svg.net{width:250px;max-width:100%;height:auto}
    .dpw .accrow{display:grid;grid-template-columns:62px 1fr 52px;gap:8px;align-items:center;font-size:13.5px}
    .dpw .track{height:16px;border-radius:8px;background:var(--c-grid);overflow:hidden}
    .dpw .fill{height:100%;border-radius:8px;transition:width .25s}
    .dpw .insight{border-radius:9px;padding:7px 10px;font-size:13.5px;background:var(--accent2-bg);color:var(--fg)}
    .dpw .insight.ok{background:var(--ok-bg)} .dpw .insight.warn{background:var(--warn-bg)}
    .dpw table.hist{border-collapse:collapse;width:100%;font-size:12.5px} .dpw table.hist td,.dpw table.hist th{padding:2px 6px;border-bottom:1px solid var(--line);text-align:right}
    .dpw table.hist th:first-child,.dpw table.hist td:first-child{text-align:left}
    .dpw .muted{color:var(--muted);font-size:12.5px}`;
    document.head.append(st);
  }
  root.classList.add('dpw');
  /* ---------- maths: data, network, Adam, inverted dropout ---------- */
  const mul = s => { let a = s >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  function makeData(kind, n, noise, r) {
    const X = [], Y = [];
    for (let i = 0; i < n; i++) {
      let x1, x2, y = i % 2;
      if (kind === 'moons') { const t = Math.PI * r(); if (y === 0) { x1 = Math.cos(t); x2 = Math.sin(t); } else { x1 = 1 - Math.cos(t); x2 = 0.5 - Math.sin(t); } x1 = (x1 - 0.5) / 1.2; x2 = (x2 - 0.25) / 1.2; }
      else { x1 = r() * 2 - 1; x2 = r() * 2 - 1; y = x1 * x2 > 0 ? 1 : 0; }
      X.push([x1 + noise * gauss(r), x2 + noise * gauss(r)]); Y.push(y);
    }
    return { X, Y };
  }
  function newNet(seed) {
    const r = mul(seed), m = (a, b, s) => Array.from({ length: a }, () => Array.from({ length: b }, () => gauss(r) * s));
    const N = { W1: m(H, 2, 1), b1: new Array(H).fill(0), W2: m(H, H, Math.sqrt(2 / H)), b2: new Array(H).fill(0), W3: m(1, H, Math.sqrt(1 / H))[0], b3: [0] };
    const z = x => Array.isArray(x) ? x.map(z) : 0; N.opt = { t: 0 }; for (const k of ['W1', 'b1', 'W2', 'b2', 'W3', 'b3']) N.opt[k] = { m: z(N[k]), v: z(N[k]) };
    return N;
  }
  function forward(N, x, m1, m2, sc) {
    const a1 = new Array(H), a2 = new Array(H);
    for (let i = 0; i < H; i++) { const s = N.b1[i] + N.W1[i][0] * x[0] + N.W1[i][1] * x[1]; a1[i] = s > 0 ? s : 0; if (m1) a1[i] *= m1[i] * sc; }
    for (let i = 0; i < H; i++) { let s = N.b2[i]; for (let j = 0; j < H; j++) s += N.W2[i][j] * a1[j]; a2[i] = s > 0 ? s : 0; if (m2) a2[i] *= m2[i] * sc; }
    let z = N.b3[0]; for (let j = 0; j < H; j++) z += N.W3[j] * a2[j];
    return { a1, a2, p: 1 / (1 + Math.exp(-z)) };
  }
  function epoch(N, D, p, r, lr) {
    const g = { W1: N.W1.map(w => w.map(() => 0)), b1: new Array(H).fill(0), W2: N.W2.map(w => w.map(() => 0)), b2: new Array(H).fill(0), W3: new Array(H).fill(0), b3: [0] };
    const n = D.X.length, sc = p > 0 ? 1 / (1 - p) : 1; let m1 = null, m2 = null;
    for (let k = 0; k < n; k++) {
      const x = D.X[k], y = D.Y[k];
      if (p > 0) { m1 = Array.from({ length: H }, () => r() < p ? 0 : 1); m2 = Array.from({ length: H }, () => r() < p ? 0 : 1); }
      const f = forward(N, x, m1, m2, sc), dz = (f.p - y) / n; g.b3[0] += dz;
      const d2 = new Array(H), d1 = new Array(H).fill(0);
      for (let j = 0; j < H; j++) { g.W3[j] += dz * f.a2[j]; d2[j] = f.a2[j] > 0 ? dz * N.W3[j] * (m2 ? m2[j] * sc : 1) : 0; }
      for (let i = 0; i < H; i++) { if (!d2[i]) continue; g.b2[i] += d2[i]; for (let j = 0; j < H; j++) { g.W2[i][j] += d2[i] * f.a1[j]; d1[j] += d2[i] * N.W2[i][j]; } }
      for (let j = 0; j < H; j++) { if (!(f.a1[j] > 0)) continue; const d = d1[j] * (m1 ? m1[j] * sc : 1); g.b1[j] += d; g.W1[j][0] += d * x[0]; g.W1[j][1] += d * x[1]; }
    }
    const O = N.opt; O.t++; const B1 = 0.9, B2 = 0.999, c1 = 1 - Math.pow(B1, O.t), c2 = 1 - Math.pow(B2, O.t);
    const upd = (P, G, M, V) => { for (let i = 0; i < P.length; i++) { if (Array.isArray(P[i])) upd(P[i], G[i], M[i], V[i]); else { M[i] = B1 * M[i] + (1 - B1) * G[i]; V[i] = B2 * V[i] + (1 - B2) * G[i] * G[i]; P[i] -= lr * (M[i] / c1) / (Math.sqrt(V[i] / c2) + 1e-8); } } };
    for (const k of ['W1', 'b1', 'W2', 'b2', 'W3', 'b3']) upd(N[k], g[k], O[k].m, O[k].v);
    return m1 ? [m1, m2] : null;
  }
  const acc = (N, D) => { let c = 0; for (let k = 0; k < D.X.length; k++) if ((forward(N, D.X[k]).p > 0.5 ? 1 : 0) === D.Y[k]) c++; return c / D.X.length; };

  /* ---------- state ---------- */
  const S = { kind: 'moons', rate: 0.5, dataSeed: 7, initSeed: 13, ep: 0, running: false, N: null, D: null, T: null, mask: null, hist: [] };
  function newData() { const r = mul(S.dataSeed); S.D = makeData(S.kind, NTR, 0.25, r); S.T = makeData(S.kind, NTE, 0.25, r); }

  /* ---------- DOM ---------- */
  const cv = h('canvas', { width: 300, height: 300, 'aria-label': 'decision map' }), ctx = cv.getContext('2d');
  const net = document.createElementNS(NS, 'svg'); net.setAttribute('viewBox', '0 0 250 300'); net.setAttribute('class', 'net');
  const mk = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); (par || net).append(e); return e; };
  const LX = [28, 95, 170, 228], LN = [2, H, H, 1], uy = (l, i) => 150 + (i - (LN[l] - 1) / 2) * (LN[l] > 2 ? 16.5 : 60);
  const edges = [], units = [[], [], [], []], eG = mk('g', {}), uG = mk('g', {});
  for (let l = 0; l < 3; l++) for (let i = 0; i < LN[l]; i++) for (let j = 0; j < LN[l + 1]; j++) edges.push({ l, i, j, el: mk('line', { x1: LX[l], y1: uy(l, i), x2: LX[l + 1], y2: uy(l + 1, j), stroke: 'var(--c-node-line)', 'stroke-width': 0.6, opacity: 0.35 }, eG) });
  for (let l = 0; l < 4; l++) for (let i = 0; i < LN[l]; i++) units[l].push(mk('circle', { cx: LX[l], cy: uy(l, i), r: LN[l] > 2 ? 6 : 9, fill: l === 0 ? 'var(--c-start)' : l === 3 ? 'var(--c-goal)' : 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 1.2 }, uG));
  const cap = mk('text', { x: 125, y: 292, 'text-anchor': 'middle', style: 'font:600 11.5px var(--sans);fill:var(--c-soft)' }); cap.textContent = 'all units on (test mode)';
  function drawMask(m) {
    const on = (l, i) => l === 0 || l === 3 || !m || m[l - 1][i] === 1;
    units[1].forEach((c, i) => { c.setAttribute('fill', on(1, i) ? 'var(--c-node)' : 'var(--c-grid)'); c.setAttribute('opacity', on(1, i) ? 1 : 0.35); });
    units[2].forEach((c, i) => { c.setAttribute('fill', on(2, i) ? 'var(--c-node)' : 'var(--c-grid)'); c.setAttribute('opacity', on(2, i) ? 1 : 0.35); });
    edges.forEach(e => e.el.setAttribute('opacity', on(e.l, e.i) && on(e.l + 1, e.j) ? 0.35 : 0.04));
    cap.textContent = m ? 'training pass: ' + (m[0].filter(v => !v).length + m[1].filter(v => !v).length) + ' of 32 hidden units off' : 'all units on (test mode)';
  }
  const bar = (label, col) => { const f = h('div', { class: 'fill', style: { width: '0%', background: col } }), v = h('b', {}, '–'); return { row: h('div', { class: 'accrow' }, h('span', {}, label), h('div', { class: 'track' }, f), v), f, v }; };
  const bTr = bar('train', 'var(--c-a)'), bTe = bar('test', 'var(--c-c)');
  const epT = h('b', {}, '0'), gapT = h('b', {}, '–');
  const insight = h('div', { class: 'insight' }, 'Press Train. Then change the dropout rate and train again: each run starts from the same weights and data, so you can compare fairly.');
  const histBox = h('div');
  const rateIn = h('input', { type: 'range', min: 0, max: 0.7, step: 0.05, value: S.rate }), rateOut = h('b', {}, S.rate.toFixed(2));
  rateIn.oninput = () => { S.rate = +rateIn.value; rateOut.textContent = S.rate.toFixed(2); };
  const dataSel = h('select', {}, h('option', { value: 'moons' }, 'Two moons'), h('option', { value: 'xor' }, 'Four corners (XOR)'));
  dataSel.onchange = () => { S.kind = dataSel.value; stop(); newData(); S.hist = []; fresh(); };
  const bTrain = h('button', { class: 'btn primary small', onclick: () => S.running ? stop() : train() }, '▶ Train');
  const bPass = h('button', { class: 'btn small', onclick: () => { stop(); if (!S.N) fresh(); const r = mul((Math.random() * 1e9) | 0); const p = S.rate || 0.5; S.mask = [0, 1].map(() => Array.from({ length: H }, () => r() < p ? 0 : 1)); drawMask(S.mask); insight.className = 'insight'; insight.textContent = 'One training pass with p = ' + p.toFixed(2) + ': grey units output zero for this pass only. Press again to see a new random mask.'; } }, 'Show one random mask');
  const bTest = h('button', { class: 'btn small', onclick: () => { drawMask(null); } }, 'Test mode (all on)');
  const bNew = h('button', { class: 'btn small', onclick: () => { stop(); S.dataSeed = (Math.random() * 1e6) | 0; S.initSeed = (Math.random() * 1e6) | 0; newData(); S.hist = []; fresh(); } }, '🎲 New data');
  const bReset = h('button', { class: 'btn small', onclick: () => { stop(); S.hist = []; fresh(); } }, 'Reset');
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Dropout lab'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'a real network, trained in your browser')),
    h('div', { class: 'widget-body' },
      h('div', { class: 'widget-canvas' }, h('div', { class: 'viz' }, cv, net), h('div', { class: 'muted', style: { textAlign: 'center' } }, 'big dots = 40 training points · small dots = 400 test points · colour = what the network predicts')),
      h('div', { class: 'widget-side' }, h('div', { class: 'stat' }, h('span', {}, 'Epoch'), epT, h('span', {}, 'Gap (train − test)'), gapT), bTr.row, bTe.row, insight, h('div', {}, h('div', { class: 'muted' }, 'Runs on this data'), histBox))),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Dropout rate p ', rateIn, rateOut), h('label', {}, 'Data ', dataSel), bTrain, bPass, bTest, bNew, bReset));

  /* ---------- drawing ---------- */
  const css = n => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); } catch (e) { return ''; } };
  const hex = (s, d) => { const m = /^#([0-9a-f]{6})$/i.exec(s || ''); if (!m) return d; const v = parseInt(m[1], 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
  const G = 60, off = document.createElement('canvas'); off.width = G; off.height = G; const octx = off.getContext('2d');
  const toPx = v => (v + 1.6) / 3.2 * 300;
  function drawMap() {
    const cA = hex(css('--c-b'), [67, 56, 202]), cB = hex(css('--c-c'), [180, 83, 9]), bg = hex(css('--card'), [255, 255, 255]);
    const img = octx.createImageData(G, G);
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const x = -1.6 + (gx + 0.5) / G * 3.2, y = 1.6 - (gy + 0.5) / G * 3.2;
      const p = S.N ? forward(S.N, [x, y]).p : 0.5, w = Math.min(1, Math.abs(p - 0.5) * 2) * 0.45, c = p > 0.5 ? cB : cA, k = (gy * G + gx) * 4;
      for (let q = 0; q < 3; q++) img.data[k + q] = Math.round(bg[q] * (1 - w) + c[q] * w); img.data[k + 3] = 255;
    }
    octx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.clearRect(0, 0, 300, 300); ctx.drawImage(off, 0, 0, 300, 300);
    const dot = (x, y, cls, r, a) => { ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(toPx(x), 300 - toPx(y), r, 0, 7); ctx.fillStyle = `rgb(${(cls ? cB : cA).join(',')})`; ctx.fill(); if (r > 3) { ctx.lineWidth = 1.5; ctx.strokeStyle = `rgb(${bg.join(',')})`; ctx.stroke(); } ctx.globalAlpha = 1; };
    S.T.X.forEach((x, i) => dot(x[0], x[1], S.T.Y[i], 1.8, 0.55));
    S.D.X.forEach((x, i) => dot(x[0], x[1], S.D.Y[i], 5, 1));
  }
  function stats(final) {
    const tr = acc(S.N, S.D), te = acc(S.N, S.T);
    bTr.f.style.width = (tr * 100) + '%'; bTr.v.textContent = Math.round(tr * 100) + '%';
    bTe.f.style.width = (te * 100) + '%'; bTe.v.textContent = Math.round(te * 100) + '%';
    epT.textContent = S.ep; gapT.textContent = Math.round((tr - te) * 100) + ' points';
    return { tr, te };
  }
  function histUI() {
    histBox.textContent = ''; if (!S.hist.length) { histBox.append(h('div', { class: 'muted' }, 'none yet')); return; }
    histBox.append(h('table', { class: 'hist' }, h('tr', {}, h('th', {}, 'rate p'), h('th', {}, 'train'), h('th', {}, 'test'), h('th', {}, 'gap')),
      S.hist.map(o => h('tr', {}, h('td', {}, o.p.toFixed(2)), h('td', {}, Math.round(o.tr * 100) + '%'), h('td', {}, Math.round(o.te * 100) + '%'), h('td', {}, Math.round((o.tr - o.te) * 100))))));
  }
  function verdict(res) {
    const gap = res.tr - res.te, base = S.hist.find(o => o.p === 0);
    let msg, cls = 'insight';
    if (S.rate >= 0.6 && res.tr < 0.9) { msg = 'Very strong dropout: the network now struggles even on its own training points. That is underfitting. Most networks use p between 0.1 and 0.5.'; cls += ' warn'; }
    else if (S.rate === 0) { msg = gap > 0.05 ? 'No dropout: training accuracy is ' + Math.round(gap * 100) + ' points above test accuracy. The map bends around single noisy points. Now try p = 0.5.' : 'No dropout, and the gap is small on this data. Try New data or the XOR data set.'; }
    else if (base) {
      const g0 = base.tr - base.te;
      if (gap < g0 - 0.01) { msg = 'The gap shrank from ' + Math.round(g0 * 100) + ' to ' + Math.round(gap * 100) + ' points. Test accuracy changed from ' + Math.round(base.te * 100) + '% to ' + Math.round(res.te * 100) + '%. Dropout made the network rely less on single training points.'; cls += ' ok'; }
      else { msg = 'This time the gap did not shrink. On tiny 2D problems the effect is small and depends on the data; dropout pays off most in large networks. Try another rate or New data.'; cls += ' warn'; }
    } else msg = 'Done. Now set p = 0 and train again, so you have a run without dropout to compare.';
    insight.className = cls; insight.textContent = msg;
  }
  function fresh() { S.N = newNet(S.initSeed); S.ep = 0; drawMask(null); drawMap(); stats(); histUI(); bTrain.textContent = '▶ Train'; insight.className = 'insight'; insight.textContent = 'Untrained network. Press Train (' + EPOCHS + ' epochs). Each run restarts from the same weights, so only the dropout rate changes.'; }
  let raf = 0, frame = 0, rr = null;
  function stop() { S.running = false; cancelAnimationFrame(raf); bTrain.textContent = S.ep && S.ep < EPOCHS ? '▶ Continue' : '▶ Train'; }
  function train() {
    if (!S.N || S.ep >= EPOCHS || S.ep === 0) { S.N = newNet(S.initSeed); S.ep = 0; rr = mul(99 + S.initSeed); S.runRate = S.rate; }
    if (S.rate !== S.runRate) { S.N = newNet(S.initSeed); S.ep = 0; rr = mul(99 + S.initSeed); S.runRate = S.rate; }
    S.running = true; bTrain.textContent = '❚❚ Pause'; insight.className = 'insight'; insight.textContent = 'Training with dropout rate p = ' + S.rate.toFixed(2) + ' …';
    const loop = () => {
      if (!S.running) return;
      let m = null; for (let k = 0; k < 25 && S.ep < EPOCHS; k++) { m = epoch(S.N, S.D, S.rate, rr, 0.01); S.ep++; }
      frame++; if (frame % 6 === 0) drawMask(m); if (frame % 3 === 0) drawMap(); stats();
      if (S.ep >= EPOCHS) { S.running = false; drawMask(null); drawMap(); const res = stats(true); S.hist = S.hist.filter(o => o.p !== S.rate); S.hist.push({ p: S.rate, tr: res.tr, te: res.te }); S.hist.sort((a, b) => a.p - b.p); histUI(); verdict(res); bTrain.textContent = '▶ Train'; return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  newData(); fresh();
  try { new MutationObserver(() => drawMap()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }
  return { train, stop, setRate(p) { S.rate = p; rateIn.value = p; rateOut.textContent = p.toFixed(2); } };
});

/* Curve-fitting playground: polynomial degree slider, train/test points, error-versus-degree curves, verdict. */
Course.widget('fitting', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('fitting-css')) {
    const st = document.createElement('style'); st.id = 'fitting-css';
    st.textContent = `.fitw .verd{border-radius:8px;padding:7px 10px;font-size:13.5px;line-height:1.4}
    .fitw .verd.ok{background:var(--ok-bg);color:var(--ok)} .fitw .verd.warn{background:var(--warn-bg);color:var(--warn)} .fitw .verd.bad{background:var(--bad-bg);color:var(--bad)}
    .fitw svg text{font-family:var(--sans);fill:var(--c-ink)} .fitw svg .soft{fill:var(--c-soft)}
    .fitw .pts{cursor:crosshair} .fitw output{font:600 13px var(--mono);color:var(--fg);min-width:22px;display:inline-block}`;
    document.head.append(st);
  }
  root.classList.add('fitw');
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
  /* ---------- data ---------- */
  const FUN = { wave: x => Math.sin(Math.PI * x), bowl: x => 1.4 * x * x - 0.7, line: x => 0.8 * x + 0.1, steps: x => (x < -0.3 ? -0.6 : x < 0.35 ? 0.5 : -0.2) };
  const S = { fn: 'wave', n: 12, noise: 0.2, deg: 3, showTest: true, seed: 7 };
  let train = [], test = [];
  function gauss(r) { let u = 0, v = 0; while (!u) u = r.next(); while (!v) v = r.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function makeData() {
    const r = C.rng(S.seed), f = FUN[S.fn];
    train = []; for (let i = 0; i < S.n; i++) { const x = -0.95 + 1.9 * (i + 0.5 * r.next()) / S.n; train.push([x, f(x) + S.noise * gauss(r)]); }
    test = []; for (let i = 0; i < 40; i++) { const x = -0.97 + 1.94 * r.next(); test.push([x, f(x) + S.noise * gauss(r)]); }
  }
  /* ---------- least squares in a Legendre basis (well conditioned) ---------- */
  function basis(x, m) { const p = [1, x]; for (let k = 2; k < m; k++) p.push(((2 * k - 1) * x * p[k - 1] - (k - 1) * p[k - 2]) / k); return p.slice(0, m); }
  function solve(A, b) { const n = b.length; A = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; if (Math.abs(A[c][c]) < 1e-14) continue; for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } } return A.map((r, i) => Math.abs(r[i]) < 1e-14 ? 0 : r[n] / r[i]); }
  function fit(pts, d) { const m = d + 1, A = [...Array(m)].map(() => Array(m).fill(0)), b = Array(m).fill(0); pts.forEach(([x, y]) => { const p = basis(x, m); for (let i = 0; i < m; i++) { b[i] += p[i] * y; for (let j = 0; j < m; j++) A[i][j] += p[i] * p[j]; } }); for (let i = 0; i < m; i++) A[i][i] += 1e-7; return solve(A, b); }
  const ev = (w, x) => { const p = basis(x, w.length); return w.reduce((s, c, i) => s + c * p[i], 0); };
  const mse = (w, pts) => pts.reduce((s, [x, y]) => s + (ev(w, x) - y) ** 2, 0) / pts.length;
  /* ---------- DOM ---------- */
  const W = 620, H = 400, PX = 46, PY = 18, PW = W - PX - 16, PH = H - PY - 40;
  const X = x => PX + (x + 1) / 2 * PW, Y = y => PY + PH - (y + 2) / 4 * PH, invX = px => (px - PX) / PW * 2 - 1, invY = py => (PY + PH - py) / PH * 4 - 2;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pts' }); svg.style.touchAction = 'none';
  el('rect', { x: PX, y: PY, width: PW, height: PH, rx: 8, fill: 'var(--card)', stroke: 'var(--line)' }, svg);
  const clipId = 'fitw-clip-' + Math.random().toString(36).slice(2, 7), cp = el('clipPath', { id: clipId }, svg); el('rect', { x: PX, y: PY, width: PW, height: PH }, cp);
  [-1, -0.5, 0, 0.5, 1].forEach(t => { el('line', { x1: X(t), x2: X(t), y1: PY, y2: PY + PH, stroke: 'var(--c-grid)' }, svg); el('text', { x: X(t), y: PY + PH + 16, 'text-anchor': 'middle', class: 'soft', 'font-size': 11 }, svg).textContent = t; });
  [-2, -1, 0, 1, 2].forEach(t => { el('line', { x1: PX, x2: PX + PW, y1: Y(t), y2: Y(t), stroke: 'var(--c-grid)' }, svg); el('text', { x: PX - 8, y: Y(t) + 4, 'text-anchor': 'end', class: 'soft', 'font-size': 11 }, svg).textContent = t; });
  el('text', { x: PX + PW / 2, y: H - 6, 'text-anchor': 'middle', class: 'soft', 'font-size': 12 }, svg).textContent = 'click inside the plot to add a training point';
  const truth = el('path', { fill: 'none', stroke: 'var(--c-soft)', 'stroke-width': 2, 'stroke-dasharray': '6 5', 'clip-path': `url(#${clipId})` }, svg);
  const curve = el('path', { fill: 'none', stroke: 'var(--c-b)', 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'clip-path': `url(#${clipId})` }, svg);
  const gTest = el('g', {}, svg), gTrain = el('g', {}, svg);
  // error chart
  const EW = 300, EH = 190, ex0 = 40, ey0 = 12, ew = EW - ex0 - 10, eh = EH - ey0 - 34;
  const esvg = el('svg', { viewBox: `0 0 ${EW} ${EH}` }); esvg.style.width = '100%';
  const egrid = el('g', {}, esvg), eTrain = el('path', { fill: 'none', stroke: 'var(--c-a)', 'stroke-width': 2.5 }, esvg), eTest = el('path', { fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 2.5 }, esvg), eMark = el('line', { stroke: 'var(--c-b)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, esvg), eDots = el('g', {}, esvg);
  const sTrain = h('b', {}, '–'), sTest = h('b', {}, '–'), sBest = h('b', {}, '–'), sParams = h('b', {}, '–');
  const verdict = h('div', { class: 'verd ok' }, '');
  const side = h('div', { class: 'widget-side' },
    h('div', { class: 'legend' }, h('span', {}, h('i', { style: { background: 'var(--c-a)' } }), 'training points / error'), h('span', {}, h('i', { style: { background: 'var(--fig-bg)', borderColor: 'var(--c-c)', borderWidth: '2px' } }), 'test points / error'), h('span', {}, h('i', { style: { background: 'var(--c-b)' } }), 'model')),
    h('div', { class: 'stat' }, h('span', {}, 'Training error'), sTrain, h('span', {}, 'Test error'), sTest, h('span', {}, 'Parameters'), sParams, h('span', {}, 'Best degree on test'), sBest),
    h('div', {}, h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, 'Mean squared error versus degree (log scale)'), esvg), verdict);
  const degIn = h('input', { type: 'range', min: 0, max: 11, value: S.deg }), degOut = h('output', {}, String(S.deg));
  const nIn = h('input', { type: 'range', min: 5, max: 30, value: S.n }), nOut = h('output', {}, String(S.n));
  const zIn = h('input', { type: 'range', min: 0, max: 0.6, step: 0.05, value: S.noise }), zOut = h('output', {}, String(S.noise));
  const fnSel = h('select', {}, [['wave', 'Wave'], ['bowl', 'Bowl'], ['line', 'Straight line'], ['steps', 'Steps']].map(o => h('option', { value: o[0] }, o[1]))); fnSel.value = S.fn;
  const tChk = h('input', { type: 'checkbox', checked: true });
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  degIn.oninput = () => { S.deg = +degIn.value; render(); };
  nIn.oninput = () => { S.n = +nIn.value; makeData(); render(); };
  zIn.oninput = () => { S.noise = +zIn.value; makeData(); render(); };
  fnSel.onchange = () => { S.fn = fnSel.value; makeData(); render(); };
  tChk.onchange = () => { S.showTest = tChk.checked; render(); };
  const setDeg = d => { S.deg = Math.max(0, Math.min(maxDeg(), d)); degIn.value = S.deg; render(); };
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Underfitting and overfitting'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'move the degree slider')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), side),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Degree ', degIn, degOut), btn('Underfit (1)', () => setDeg(1)), btn('Good (3)', () => setDeg(3)), btn('Overfit (max)', () => setDeg(99))),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'True curve ', fnSel), h('label', {}, 'Training points ', nIn, nOut), h('label', {}, 'Noise ', zIn, zOut), h('label', {}, tChk, 'show test points'), btn('🎲 New data', () => { S.seed = (Math.random() * 1e6) | 0; makeData(); render(); }), btn('Reset', () => { Object.assign(S, { fn: 'wave', n: 12, noise: 0.2, deg: 3, showTest: true, seed: 7 }); fnSel.value = 'wave'; nIn.value = 12; zIn.value = 0.2; tChk.checked = true; makeData(); render(); })));
  svg.addEventListener('pointerdown', e => {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const ctm = svg.getScreenCTM(); if (!ctm) return; const q = p.matrixTransform(ctm.inverse());
    if (q.x < PX || q.x > PX + PW || q.y < PY || q.y > PY + PH) return;
    train.push([Math.max(-1, Math.min(1, invX(q.x))), invY(q.y)]); S.n = train.length; nIn.value = Math.min(30, S.n); render();
  });
  const maxDeg = () => Math.min(15, train.length - 1);
  const fmt = v => v < 0.001 ? v.toExponential(1) : v < 10 ? v.toFixed(3) : v.toFixed(1);
  function render() {
    degIn.max = maxDeg(); if (S.deg > maxDeg()) S.deg = maxDeg(); degIn.value = S.deg; degOut.textContent = S.deg; nOut.textContent = train.length; zOut.textContent = S.noise;
    const f = FUN[S.fn]; let d = '';
    for (let i = 0; i <= 200; i++) { const x = -1 + i / 100; d += (i ? 'L' : 'M') + X(x).toFixed(1) + ',' + Y(f(x)).toFixed(1); } truth.setAttribute('d', d);
    const w = fit(train, S.deg); d = '';
    for (let i = 0; i <= 300; i++) { const x = -1 + i / 150, y = Math.max(-6, Math.min(6, ev(w, x))); d += (i ? 'L' : 'M') + X(x).toFixed(1) + ',' + Y(y).toFixed(1); } curve.setAttribute('d', d);
    gTrain.textContent = ''; gTest.textContent = '';
    train.forEach(([x, y]) => el('circle', { cx: X(x), cy: Y(Math.max(-2.1, Math.min(2.1, y))), r: 6, fill: 'var(--c-a)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }, gTrain));
    if (S.showTest) test.forEach(([x, y]) => el('circle', { cx: X(x), cy: Y(Math.max(-2.1, Math.min(2.1, y))), r: 4.5, fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 2 }, gTest));
    // all degrees
    const md = maxDeg(), tr = [], te = [];
    for (let k = 0; k <= md; k++) { const wk = k === S.deg ? w : fit(train, k); tr.push(mse(wk, train)); te.push(mse(wk, test)); }
    const best = te.indexOf(Math.min(...te));
    sTrain.textContent = fmt(tr[S.deg]); sTest.textContent = fmt(te[S.deg]); sBest.textContent = best + ' (test error ' + fmt(te[best]) + ')'; sParams.textContent = S.deg + 1;
    // chart (log scale from 1e-4 to 10)
    const LX = k => ex0 + (md ? k / md : 0) * ew, LY = v => { const l = Math.log10(Math.max(1e-4, Math.min(10, v))); return ey0 + eh - (l + 4) / 5 * eh; };
    egrid.textContent = '';
    el('rect', { x: ex0, y: ey0, width: ew, height: eh, fill: 'var(--card)', stroke: 'var(--line)', rx: 4 }, egrid);
    [-4, -2, 0, 1].forEach(p => { el('line', { x1: ex0, x2: ex0 + ew, y1: LY(Math.pow(10, p)), y2: LY(Math.pow(10, p)), stroke: 'var(--c-grid)' }, egrid); el('text', { x: ex0 - 5, y: LY(Math.pow(10, p)) + 4, 'text-anchor': 'end', 'font-size': 10, class: 'soft' }, egrid).textContent = p === 0 ? '1' : p === 1 ? '10' : '1e' + p; });
    for (let k = 0; k <= md; k += (md > 10 ? 2 : 1)) el('text', { x: LX(k), y: ey0 + eh + 14, 'text-anchor': 'middle', 'font-size': 10, class: 'soft' }, egrid).textContent = k;
    el('text', { x: ex0 + ew / 2, y: EH - 4, 'text-anchor': 'middle', 'font-size': 11, class: 'soft' }, egrid).textContent = 'polynomial degree';
    eTrain.setAttribute('d', tr.map((v, k) => (k ? 'L' : 'M') + LX(k).toFixed(1) + ',' + LY(v).toFixed(1)).join(''));
    eTest.setAttribute('d', te.map((v, k) => (k ? 'L' : 'M') + LX(k).toFixed(1) + ',' + LY(v).toFixed(1)).join(''));
    eMark.setAttribute('x1', LX(S.deg)); eMark.setAttribute('x2', LX(S.deg)); eMark.setAttribute('y1', ey0); eMark.setAttribute('y2', ey0 + eh);
    eDots.textContent = ''; el('circle', { cx: LX(S.deg), cy: LY(tr[S.deg]), r: 4.5, fill: 'var(--c-a)' }, eDots); el('circle', { cx: LX(S.deg), cy: LY(te[S.deg]), r: 4.5, fill: 'var(--c-c)' }, eDots);
    // verdict
    const ratio = te[S.deg] / te[best];
    if (S.deg + 1 >= train.length) { verdict.className = 'verd bad'; verdict.textContent = 'The curve has as many parameters as there are training points, so it passes through every point (training error near zero). Look at the test error: this is extreme overfitting.'; }
    else if (ratio < 1.35) { verdict.className = 'verd ok'; verdict.textContent = '✓ Good fit: the test error is close to the best possible here (degree ' + best + '). The model follows the trend, not the noise.'; }
    else if (S.deg < best) { verdict.className = 'verd warn'; verdict.textContent = 'Underfitting: the model is too simple. Both errors are high. Try a higher degree.'; }
    else { verdict.className = 'verd bad'; verdict.textContent = 'Overfitting: the training error is ' + (tr[S.deg] < tr[best] ? 'lower' : 'not lower') + ' than at degree ' + best + ', but the test error is ' + ratio.toFixed(1) + ' times higher. The curve is fitting the noise.'; }
  }
  makeData(); render();
  return { setDeg, render };
});

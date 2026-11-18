/* Gradient descent playground: contour map, click to start, learning rate, momentum, noise (SGD), path and loss curve. */
Course.widget('gradient', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('gradient-css')) {
    const st = document.createElement('style'); st.id = 'gradient-css';
    st.textContent = `.gdw .verd{border-radius:8px;padding:7px 10px;font-size:13.5px;line-height:1.4}
    .gdw .verd.ok{background:var(--ok-bg);color:var(--ok)} .gdw .verd.warn{background:var(--warn-bg);color:var(--warn)} .gdw .verd.bad{background:var(--bad-bg);color:var(--bad)} .gdw .verd.info{background:var(--accent2-bg);color:var(--accent2)}
    .gdw svg text{font-family:var(--sans);fill:var(--c-ink)} .gdw svg .soft{fill:var(--c-soft)} .gdw .map{cursor:crosshair}
    .gdw output{font:600 13px var(--mono);color:var(--fg);min-width:38px;display:inline-block}`;
    document.head.append(st);
  }
  root.classList.add('gdw');
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
  /* ---------- loss functions ---------- */
  const FN = {
    bowl: { name: 'Round bowl', xr: [-3, 3], yr: [-3, 3], f: (x, y) => x * x + y * y, g: (x, y) => [2 * x, 2 * y], start: [-2.4, 2.1], lr: 0.1, lrs: [0.01, 0.1, 1.05] },
    valley: { name: 'Narrow valley', xr: [-3, 3], yr: [-3, 3], f: (x, y) => 0.5 * x * x + 5 * y * y, g: (x, y) => [x, 10 * y], start: [-2.6, 1.6], lr: 0.15, lrs: [0.01, 0.15, 0.23] },
    banana: { name: 'Banana (Rosenbrock)', xr: [-2, 2], yr: [-1, 3], f: (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)], start: [-1.5, 2.5], lr: 0.02, lrs: [0.002, 0.02, 0.045] },
    two: { name: 'Two valleys', xr: [-2, 2], yr: [-2, 2], f: (x, y) => (x * x - 1) ** 2 + 0.8 * y * y + 0.3 * x, g: (x, y) => [4 * x * (x * x - 1) + 0.3, 1.6 * y], start: [0.6, 1.6], lr: 0.05, lrs: [0.004, 0.05, 0.7] }
  };
  const S = { fn: 'valley', lrS: 0, mom: 0, noise: 0 };
  const lrFromS = s => Math.pow(10, -3 + 3 * s / 100), sFromLr = lr => Math.round((Math.log10(lr) + 3) / 3 * 100);
  let start = FN[S.fn].start.slice(), pos, vel, path, losses, steps, running = false, timer = null, state = 'ready', seed = 1;
  /* ---------- DOM ---------- */
  const W = 560, H = 420;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'map' }); svg.style.touchAction = 'none';
  const img = el('image', { x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none' }, svg);
  const minG = el('g', {}, svg), pathL = el('polyline', { fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg), dotsG = el('g', {}, svg);
  const startM = el('circle', { r: 8, fill: 'var(--c-c)', stroke: 'var(--c-ink)', 'stroke-width': 2 }, svg);
  const ball = el('circle', { r: 9, fill: '#fff', stroke: 'var(--c-c)', 'stroke-width': 3.5 }, svg);
  const hint = el('text', { x: W / 2, y: H - 10, 'text-anchor': 'middle', 'font-size': 12.5, class: 'soft' }, svg); hint.textContent = 'click anywhere to choose the starting point';
  const cv = document.createElement('canvas'); cv.width = 280; cv.height = 210;
  const lsvg = el('svg', { viewBox: '0 0 290 130' }); lsvg.style.width = '100%';
  const sStep = h('b', {}, '0'), sPos = h('b', {}, '–'), sLoss = h('b', {}, '–'), sGrad = h('b', {}, '–');
  const verdict = h('div', { class: 'verd info' }, 'Press Run or Step.');
  const side = h('div', { class: 'widget-side' },
    h('div', { class: 'stat' }, h('span', {}, 'Step'), sStep, h('span', {}, 'Position (x, y)'), sPos, h('span', {}, 'Loss'), sLoss, h('span', {}, 'Gradient length'), sGrad),
    h('div', {}, h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, 'Loss at each step (log scale)'), lsvg), verdict);
  const fnSel = h('select', {}, Object.entries(FN).map(([k, v]) => h('option', { value: k }, v.name))); fnSel.value = S.fn;
  const lrIn = h('input', { type: 'range', min: 0, max: 100, step: 1, value: sFromLr(FN[S.fn].lr) }), lrOut = h('output', {}, '');
  const mIn = h('input', { type: 'range', min: 0, max: 0.95, step: 0.05, value: 0 }), mOut = h('output', {}, '0');
  const nIn = h('input', { type: 'range', min: 0, max: 3, step: 0.25, value: 0 }), nOut = h('output', {}, 'off');
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  const bRun = btn('▶ Run', () => toggle(), 'btn primary small');
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Gradient descent playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'click the map to start')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), side),
    h('div', { class: 'widget-ctl' }, btn('Step', () => { stop(); step(); }), bRun, btn('Reset', () => resetRun()), btn('🎲 Random start', () => { const F = FN[S.fn], r = C.rng((Math.random() * 1e6) | 0); start = [F.xr[0] + (F.xr[1] - F.xr[0]) * (0.08 + 0.84 * r.next()), F.yr[0] + (F.yr[1] - F.yr[0]) * (0.08 + 0.84 * r.next())]; resetRun(); }), h('label', {}, 'Loss ', fnSel)),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Learning rate ', lrIn, lrOut), h('label', {}, 'Momentum ', mIn, mOut), h('label', {}, 'Noise (SGD) ', nIn, nOut),
      btn('Preset: too small', () => preset(0)), btn('good', () => preset(1)), btn('too large', () => preset(2))));
  fnSel.onchange = () => { S.fn = fnSel.value; start = FN[S.fn].start.slice(); lrIn.value = sFromLr(FN[S.fn].lr); background(); resetRun(); };
  lrIn.oninput = () => { lrOut.textContent = fmtLr(lr()); resetRun(); };
  mIn.oninput = () => { S.mom = +mIn.value; mOut.textContent = S.mom; resetRun(); };
  nIn.oninput = () => { S.noise = +nIn.value; nOut.textContent = S.noise ? S.noise : 'off'; resetRun(); };
  function preset(i) { lrIn.value = sFromLr(FN[S.fn].lrs[i]); mIn.value = 0; S.mom = 0; mOut.textContent = '0'; lrOut.textContent = fmtLr(lr()); resetRun(); toggle(); }
  const lr = () => lrFromS(+lrIn.value), fmtLr = v => v >= 0.1 ? v.toFixed(2) : v >= 0.01 ? v.toFixed(3) : v.toFixed(4);
  /* ---------- coordinates ---------- */
  const PX = x => (x - FN[S.fn].xr[0]) / (FN[S.fn].xr[1] - FN[S.fn].xr[0]) * W, PY = y => H - (y - FN[S.fn].yr[0]) / (FN[S.fn].yr[1] - FN[S.fn].yr[0]) * H;
  const IX = px => FN[S.fn].xr[0] + px / W * (FN[S.fn].xr[1] - FN[S.fn].xr[0]), IY = py => FN[S.fn].yr[0] + (H - py) / H * (FN[S.fn].yr[1] - FN[S.fn].yr[0]);
  svg.addEventListener('pointerdown', e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const ctm = svg.getScreenCTM(); if (!ctm) return; const q = p.matrixTransform(ctm.inverse()); start = [IX(q.x), IY(q.y)]; resetRun(); });
  /* ---------- background contour map (canvas -> image) ---------- */
  function rgbOf(name, fb) { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); const m = v.match(/^#([0-9a-f]{6})$/i); if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; } const m3 = v.match(/^#([0-9a-f]{3})$/i); if (m3) return m3[1].split('').map(c => parseInt(c + c, 16)); return fb; }
  function background() {
    const F = FN[S.fn], gw = cv.width, gh = cv.height, ctx = cv.getContext('2d'); if (!ctx) return;
    const lo = rgbOf('--c-b', [67, 56, 202]), hi = rgbOf('--fig-bg', [251, 252, 253]), line = rgbOf('--c-node-line', [81, 101, 124]);
    const vals = new Float64Array(gw * gh); let mn = Infinity;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const x = F.xr[0] + (i + 0.5) / gw * (F.xr[1] - F.xr[0]), y = F.yr[1] - (j + 0.5) / gh * (F.yr[1] - F.yr[0]); const v = F.f(x, y); vals[j * gw + i] = v; if (v < mn) mn = v; }
    const band = new Int32Array(gw * gh); for (let k = 0; k < vals.length; k++) band[k] = Math.floor(Math.log(1 + (vals[k] - mn)) * 3.2);
    const im = ctx.createImageData(gw, gh), d = im.data;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const k = j * gw + i, b = band[k], t = Math.max(0, 1 - b / 14), edge = (i + 1 < gw && band[k + 1] !== b) || (j + 1 < gh && band[k + gw] !== b);
      let c = hi.map((v, q) => v + (lo[q] - v) * t * 0.55); if (edge) c = c.map((v, q) => v + (line[q] - v) * 0.55);
      d[4 * k] = c[0]; d[4 * k + 1] = c[1]; d[4 * k + 2] = c[2]; d[4 * k + 3] = 255;
    }
    ctx.putImageData(im, 0, 0); img.setAttribute('href', cv.toDataURL());
    minG.textContent = '';
  }
  /* ---------- running ---------- */
  function resetRun() {
    stop(); pos = start.slice(); vel = [0, 0]; path = [pos.slice()]; losses = [FN[S.fn].f(pos[0], pos[1])]; steps = 0; state = 'ready'; seed = 1;
    lrOut.textContent = fmtLr(lr()); draw();
  }
  function gauss() { let u = 0, v = 0; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function step() {
    if (state === 'diverged' || state === 'converged') return false;
    const F = FN[S.fn], g = F.g(pos[0], pos[1]); const gn = [g[0] + S.noise * gauss(), g[1] + S.noise * gauss()];
    vel = [S.mom * vel[0] - lr() * gn[0], S.mom * vel[1] - lr() * gn[1]];
    pos = [pos[0] + vel[0], pos[1] + vel[1]]; steps++;
    const L = F.f(pos[0], pos[1]); path.push(pos.slice()); losses.push(L);
    if (!isFinite(L) || Math.abs(pos[0]) > 1e3 || Math.abs(pos[1]) > 1e3 || L > 1e8) state = 'diverged';
    else { const gg = F.g(pos[0], pos[1]); if (!S.noise && Math.hypot(gg[0], gg[1]) < 1e-3 && Math.hypot(vel[0], vel[1]) < 1e-4) state = 'converged'; else if (steps >= 500) state = 'limit'; else state = 'running'; }
    draw(); return state === 'running';
  }
  const fmt = v => !isFinite(v) ? '∞' : Math.abs(v) >= 1e4 ? v.toExponential(1) : Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(1) : v.toFixed(3);
  function draw() {
    const F = FN[S.fn], inView = p => p[0] >= F.xr[0] - 1 && p[0] <= F.xr[1] + 1 && p[1] >= F.yr[0] - 1 && p[1] <= F.yr[1] + 1;
    const vis = path.filter(inView).slice(-600);
    pathL.setAttribute('points', vis.map(p => PX(p[0]).toFixed(1) + ',' + PY(p[1]).toFixed(1)).join(' '));
    dotsG.textContent = ''; if (vis.length < 120) vis.forEach(p => el('circle', { cx: PX(p[0]).toFixed(1), cy: PY(p[1]).toFixed(1), r: 2.6, fill: 'var(--c-c)' }, dotsG));
    startM.setAttribute('cx', PX(start[0])); startM.setAttribute('cy', PY(start[1]));
    const bp = inView(pos) && isFinite(pos[0]) ? pos : start; ball.setAttribute('cx', Math.max(-20, Math.min(W + 20, PX(bp[0])))); ball.setAttribute('cy', Math.max(-20, Math.min(H + 20, PY(bp[1]))));
    const L = losses[losses.length - 1], g = F.g(pos[0], pos[1]);
    sStep.textContent = steps; sPos.textContent = isFinite(pos[0]) ? '(' + fmt(pos[0]) + ', ' + fmt(pos[1]) + ')' : '–'; sLoss.textContent = fmt(L); sGrad.textContent = fmt(Math.hypot(g[0], g[1]));
    drawLoss(); judge();
  }
  function drawLoss() {
    lsvg.textContent = ''; const x0 = 34, y0 = 8, w = 246, hh = 98;
    el('rect', { x: x0, y: y0, width: w, height: hh, fill: 'var(--card)', stroke: 'var(--line)', rx: 4 }, lsvg);
    const ls = losses.map(v => Math.max(1e-6, Math.min(1e8, isFinite(v) ? v : 1e8))), lg = ls.map(Math.log10);
    let mn = Math.min(...lg), mx = Math.max(...lg); if (mx - mn < 1) { mx = mn + 1; }
    const LX = i => x0 + (ls.length > 1 ? i / (ls.length - 1) : 0) * w, LY = v => y0 + hh - (v - mn) / (mx - mn) * hh;
    [Math.ceil(mn), Math.floor(mx)].filter((v, i, a) => a.indexOf(v) === i).forEach(p => { el('line', { x1: x0, x2: x0 + w, y1: LY(p), y2: LY(p), stroke: 'var(--c-grid)' }, lsvg); el('text', { x: x0 - 4, y: LY(p) + 4, 'text-anchor': 'end', 'font-size': 10, class: 'soft' }, lsvg).textContent = p === 0 ? '1' : '1e' + p; });
    el('polyline', { points: lg.map((v, i) => LX(i).toFixed(1) + ',' + LY(v).toFixed(1)).join(' '), fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 2 }, lsvg);
    el('text', { x: x0 + w / 2, y: 124, 'text-anchor': 'middle', 'font-size': 10.5, class: 'soft' }, lsvg).textContent = 'step 0 to ' + (ls.length - 1);
  }
  function judge() {
    const F = FN[S.fn];
    if (state === 'diverged') { verdict.className = 'verd bad'; verdict.textContent = '✗ Diverged after ' + steps + ' steps: every step overshoots and the loss explodes. Lower the learning rate.'; return; }
    if (state === 'converged') { let extra = ''; if (S.fn === 'two') extra = pos[0] < 0 ? ' This is the deeper valley (the global minimum).' : ' This is the shallower valley: a local minimum. Start further left or add momentum.'; verdict.className = 'verd ok'; verdict.textContent = '✓ Converged in ' + steps + ' steps to (' + fmt(pos[0]) + ', ' + fmt(pos[1]) + ').' + extra; return; }
    if (state === 'limit') { verdict.className = 'verd warn'; const rc = losses.slice(-20), bounce = Math.max(...rc) - Math.min(...rc) > 1e-3 * (1 + Math.abs(Math.min(...rc))) && rc.slice(1).some((v, i) => v > rc[i]); verdict.textContent = S.noise ? 'With noise the ball never stops exactly: it jitters around the minimum. Real training lowers the learning rate at the end.' : bounce ? 'After 500 steps the ball is still bouncing between the walls of the valley: the learning rate is too large to settle.' : 'Still not converged after 500 steps: the learning rate is too small, or the valley is long and flat. Try momentum.'; return; }
    if (steps > 6) {   // zig-zag: the y step keeps changing sign
      let flips = 0; for (let i = path.length - 6; i < path.length - 1; i++) { const a = path[i][1] - path[i - 1][1], b = path[i + 1][1] - path[i][1]; if (a * b < 0) flips++; }
      if (flips >= 4 && !S.noise) { verdict.className = 'verd warn'; verdict.textContent = 'Zig-zag: the steps bounce across the narrow direction. A smaller learning rate or momentum makes the path smoother.'; return; }
    }
    verdict.className = 'verd info'; verdict.textContent = steps ? 'Running: each step moves against the gradient (downhill), by learning rate × gradient' + (S.mom ? ', plus ' + S.mom + ' of the previous step (momentum).' : '.') : 'Learning rate ' + fmtLr(lr()) + ' on the ' + F.name.toLowerCase() + '. Press Run or Step.';
  }
  function stop() { running = false; clearTimeout(timer); bRun.textContent = '▶ Run'; }
  function toggle() { if (running) { stop(); return; } if (state !== 'ready' && state !== 'running') resetRun(); running = true; bRun.textContent = '❚❚ Pause'; const loop = () => { if (!running) return; const more = step(); if (!more) { stop(); return; } timer = setTimeout(loop, steps < 40 ? 70 : 20); }; loop(); }
  background(); resetRun();
  if (window.MutationObserver) new MutationObserver(() => background()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return { resetRun, step };
});

/* k-means playground: presets, click to add points, choose k, step assign/update, moving centres, inertia, bad start, elbow chart. */
Course.widget('kmeans', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('kmeans-css')) {
    const st = document.createElement('style'); st.id = 'kmeans-css';
    st.textContent = `.kmw .verd{border-radius:8px;padding:7px 10px;font-size:13.5px;line-height:1.4}
    .kmw .verd.ok{background:var(--ok-bg);color:var(--ok)} .kmw .verd.warn{background:var(--warn-bg);color:var(--warn)} .kmw .verd.info{background:var(--accent2-bg);color:var(--accent2)}
    .kmw svg text{font-family:var(--sans);fill:var(--c-ink)} .kmw svg .soft{fill:var(--c-soft)} .kmw .plot{cursor:crosshair}
    .kmw .phase{font:700 15px var(--sans);color:var(--accent)} .kmw output{font:600 13px var(--mono);color:var(--fg)}`;
    document.head.append(st);
  }
  root.classList.add('kmw');
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
  const COL = ['var(--c-a)', 'var(--c-b)', 'var(--c-c)', 'var(--c-d)', '#0ea5e9', '#65a30d', '#e11d48', '#a855f7'];
  const W = 600, H = 420, P = 14, X = x => P + x * (W - 2 * P), Y = y => P + (1 - y) * (H - 2 * P);
  /* ---------- state ---------- */
  let pts = [], cents = [], asg = [], phase = 'assign', iter = 0, hist = [], running = false, timer = null, conv = false, preset = 'blobs3';
  const S = { k: 3, init: 'random' };
  let seed = 11; const R = () => C.rng(seed = (seed * 48271 + 7) % 2147483647);
  function gauss(r) { let u = 0, v = 0; while (!u) u = r.next(); while (!v) v = r.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function blobs(r, centres, n, sd) { const out = []; centres.forEach(([cx, cy], i) => { const m = Array.isArray(n) ? n[i] : n; for (let j = 0; j < m; j++) out.push([cx + sd * gauss(r), cy + sd * gauss(r)]); }); return out; }
  function makeData(name) {
    preset = name; const r = R();
    if (name === 'blobs3') pts = blobs(r, [[0.25, 0.7], [0.72, 0.75], [0.5, 0.25]], 30, 0.07);
    else if (name === 'blobs4') pts = blobs(r, [[0.2, 0.25], [0.25, 0.75], [0.75, 0.3], [0.78, 0.78]], 25, 0.065);
    else if (name === 'uneven') pts = blobs(r, [[0.3, 0.5], [0.8, 0.75], [0.78, 0.25]], [70, 12, 12], 0.1);
    else if (name === 'rings') { pts = []; for (let i = 0; i < 110; i++) { const a = r.next() * 2 * Math.PI, rad = i < 40 ? 0.1 + 0.03 * r.next() : 0.36 + 0.04 * r.next(); pts.push([0.5 + rad * Math.cos(a), 0.5 + rad * Math.sin(a)]); } }
    else { pts = []; for (let i = 0; i < 90; i++) pts.push([0.05 + 0.9 * r.next(), 0.05 + 0.9 * r.next()]); }
    pts = pts.map(([x, y]) => [Math.max(0.01, Math.min(0.99, x)), Math.max(0.01, Math.min(0.99, y))]);
    initCents(S.init);
  }
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  function initCents(how) {
    const r = R(); stop();
    if (how === 'bad') { const p0 = pts[0] || [0.5, 0.5]; const near = pts.slice().sort((a, b) => d2(a, p0) - d2(b, p0)).slice(0, Math.max(S.k, 1)); cents = near.slice(0, S.k).map(p => [p[0] + 0.01 * r.next(), p[1] + 0.01 * r.next()]); }
    else if (how === 'pp' && pts.length) { cents = [pts[Math.floor(r.next() * pts.length)].slice()]; while (cents.length < S.k) { const ds = pts.map(p => Math.min(...cents.map(c => d2(p, c)))), tot = ds.reduce((a, b) => a + b, 0); let t = r.next() * tot, i = 0; while (i < ds.length - 1 && t > ds[i]) { t -= ds[i]; i++; } cents.push(pts[i].slice()); } }
    else { const idx = r.shuffle(pts.map((_, i) => i)).slice(0, S.k); cents = idx.map(i => pts[i].slice()); }
    while (cents.length < S.k) cents.push([r.next(), r.next()]);
    asg = pts.map(() => -1); phase = 'assign'; iter = 0; hist = []; conv = false; lastStart = how; draw(true);
  }
  let lastStart = 'random';
  const inertia = () => pts.reduce((s, p, i) => s + (asg[i] >= 0 ? d2(p, cents[asg[i]]) : 0), 0);
  function stepOnce() {
    if (!pts.length || conv) return false;
    if (phase === 'assign') {
      const na = pts.map(p => { let bi = 0, bd = Infinity; cents.forEach((c, k) => { const d = d2(p, c); if (d < bd) { bd = d; bi = k; } }); return bi; });
      const changed = na.some((v, i) => v !== asg[i]); asg = na; iter++;
      hist.push(inertia()); phase = 'update';
      if (!changed && iter > 1) { conv = true; phase = 'done'; }
      draw(false); return !conv;
    } else {
      const old = cents.map(c => c.slice());
      cents = cents.map((c, k) => { const m = pts.filter((p, i) => asg[i] === k); return m.length ? [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length] : c; });
      hist.push(inertia()); phase = 'assign'; animateCents(old); draw(false); return true;
    }
  }
  /* ---------- DOM ---------- */
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plot' }); svg.style.touchAction = 'none';
  el('rect', { x: 0, y: 0, width: W, height: H, rx: 10, fill: 'var(--card)' }, svg);
  const GX = 40, GY = 28, cells = [], cellG = el('g', {}, svg);
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { const c = el('rect', { x: X(i / GX), y: Y((j + 1) / GY), width: (W - 2 * P) / GX + 0.5, height: (H - 2 * P) / GY + 0.5, fill: 'none', opacity: 0.13 }, cellG); c.__p = [(i + 0.5) / GX, (j + 0.5) / GY]; cells.push(c); }
  const linkG = el('g', {}, svg), ptG = el('g', {}, svg), cG = el('g', {}, svg);
  let cEls = [];
  const sIt = h('b', {}, '0'), sPh = h('span', { class: 'phase' }, 'assign'), sIn = h('b', {}, '–'), sN = h('b', {}, '0');
  const hsvg = el('svg', { viewBox: '0 0 280 90' }); hsvg.style.width = '100%';
  const esvg = el('svg', { viewBox: '0 0 280 120' }); esvg.style.width = '100%'; esvg.style.display = 'none';
  const verdict = h('div', { class: 'verd info' }, 'Press Step: first every point is assigned to the nearest centre.');
  const side = h('div', { class: 'widget-side' },
    h('div', {}, 'Next step: ', sPh),
    h('div', { class: 'stat' }, h('span', {}, 'Iteration'), sIt, h('span', {}, 'Points'), sN, h('span', {}, 'Inertia'), sIn),
    h('div', {}, h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, 'Inertia after each step'), hsvg),
    verdict, esvg);
  const kIn = h('input', { type: 'range', min: 1, max: 8, value: S.k }), kOut = h('output', {}, String(S.k));
  kIn.oninput = () => { S.k = +kIn.value; kOut.textContent = S.k; initCents(S.init); };
  const initSel = h('select', {}, [['random', 'random points'], ['pp', 'k means plus plus']].map(o => h('option', { value: o[0] }, o[1]))); initSel.onchange = () => { S.init = initSel.value; initCents(S.init); };
  const preSel = h('select', {}, [['blobs3', '3 blobs'], ['blobs4', '4 blobs'], ['uneven', 'one big, two small'], ['rings', 'two rings'], ['uniform', 'no structure']].map(o => h('option', { value: o[0] }, o[1]))); preSel.onchange = () => { makeData(preSel.value); };
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  const bRun = btn('▶ Run', () => toggle(), 'btn primary small');
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ k means playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'click to add points')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), side),
    h('div', { class: 'widget-ctl' }, btn('Step', () => { stop(); stepOnce(); }), bRun, btn('New start', () => initCents(S.init)), btn('Bad start', () => initCents('bad')), h('label', {}, 'k ', kIn, kOut), h('label', {}, 'Start ', initSel)),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Data ', preSel), btn('🎲 New data', () => makeData(preset)), btn('Clear', () => { pts = []; initCents(S.init); }), btn('Elbow chart (k = 1 to 8)', () => elbow()), btn('Reset', () => { S.k = 3; kIn.value = 3; kOut.textContent = 3; S.init = 'random'; initSel.value = 'random'; preSel.value = 'blobs3'; seed = 11; esvg.style.display = 'none'; makeData('blobs3'); })));
  svg.addEventListener('pointerdown', e => {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const ctm = svg.getScreenCTM(); if (!ctm) return; const q = p.matrixTransform(ctm.inverse());
    const x = (q.x - P) / (W - 2 * P), y = 1 - (q.y - P) / (H - 2 * P); if (x < 0 || x > 1 || y < 0 || y > 1) return;
    pts.push([x, y]); asg.push(-1); conv = false; if (phase === 'done') phase = 'assign'; draw(false);
  });
  /* ---------- drawing ---------- */
  function draw(full) {
    sIt.textContent = iter; sN.textContent = pts.length; sIn.textContent = asg.some(a => a >= 0) ? inertia().toFixed(3) : '–';
    sPh.textContent = phase === 'assign' ? 'assign (points pick the nearest centre)' : phase === 'update' ? 'update (centres move to the mean)' : 'done: converged';
    // regions of the nearest centre
    cells.forEach(c => { let bi = 0, bd = Infinity; cents.forEach((m, k) => { const d = d2(c.__p, m); if (d < bd) { bd = d; bi = k; } }); c.setAttribute('fill', asg.some(a => a >= 0) ? COL[bi % COL.length] : 'none'); });
    ptG.textContent = ''; linkG.textContent = '';
    pts.forEach((p, i) => { const a = asg[i]; el('circle', { cx: X(p[0]), cy: Y(p[1]), r: 5, fill: a >= 0 ? COL[a % COL.length] : 'var(--c-soft)', stroke: 'var(--fig-bg)', 'stroke-width': 1.5 }, ptG); });
    if (full || cEls.length !== cents.length) {
      cG.textContent = ''; cEls = cents.map((c, k) => { const g = el('g', { transform: `translate(${X(c[0])},${Y(c[1])})` }, cG); el('path', { d: 'M0,-13 L12,0 L0,13 L-12,0 Z', fill: COL[k % COL.length], stroke: 'var(--c-ink)', 'stroke-width': 2.2 }, g); el('text', { x: 0, y: 4, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800, fill: '#fff' }, g).textContent = k + 1; g.__p = c.slice(); return g; });
    }
    drawHist();
    if (conv) {
      const best = lastStart === 'bad' ? ' This came from a bad start: press "New start" and compare the inertia.' : preset === 'rings' ? ' k means cuts the rings into pie slices: it can only make round, convex groups.' : '';
      verdict.className = 'verd ok'; verdict.textContent = '✓ Converged after ' + iter + ' assign steps: no point changed its centre. Final inertia ' + inertia().toFixed(3) + '.' + best;
    } else if (phase === 'update' && iter) { verdict.className = 'verd info'; verdict.textContent = 'Points joined their nearest centre (the coloured regions). Next, each centre moves to the mean of its points.'; }
    else if (iter) { verdict.className = 'verd info'; verdict.textContent = 'The centres moved, so the inertia went down. Now points may switch to a closer centre.'; }
    else { verdict.className = 'verd info'; verdict.textContent = lastStart === 'bad' ? 'Bad start: all centres begin inside one group. Watch where they end up.' : 'Press Step or Run. Each step can only lower the inertia.'; }
  }
  function animateCents(old) {
    const t0 = performance.now(), ms = 420;
    const f = now => { const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      cEls.forEach((g, k) => { const a = old[k] || cents[k], b = cents[k]; g.setAttribute('transform', `translate(${X(a[0] + (b[0] - a[0]) * e)},${Y(a[1] + (b[1] - a[1]) * e)})`); });
      linkG.textContent = ''; if (p < 1) { pts.forEach((pt, i) => { const k = asg[i]; if (k < 0) return; const a = old[k], b = cents[k]; el('line', { x1: X(a[0] + (b[0] - a[0]) * e), y1: Y(a[1] + (b[1] - a[1]) * e), x2: X(pt[0]), y2: Y(pt[1]), stroke: COL[k % COL.length], 'stroke-width': 1, opacity: 0.35 }, linkG); }); requestAnimationFrame(f); } };
    requestAnimationFrame(f);
  }
  function drawHist() {
    hsvg.textContent = ''; if (!hist.length) { el('text', { x: 140, y: 48, 'text-anchor': 'middle', 'font-size': 12, class: 'soft' }, hsvg).textContent = 'no steps yet'; return; }
    const mx = Math.max(...hist), n = Math.min(hist.length, 24), sh = hist.slice(-n), bw = 270 / Math.max(n, 8);
    sh.forEach((v, i) => { const bh = Math.max(2, 70 * v / mx); el('rect', { x: 5 + i * bw, y: 78 - bh, width: bw - 3, height: bh, rx: 2, fill: (hist.length - n + i) % 2 ? 'var(--c-b)' : 'var(--c-a)' }, hsvg); });
    el('line', { x1: 4, x2: 276, y1: 78, y2: 78, stroke: 'var(--c-soft)' }, hsvg);
    el('text', { x: 6, y: 89, 'font-size': 9.5, class: 'soft' }, hsvg).textContent = 'green = after assign, blue = after update';
  }
  function elbow() {
    stop(); const res = [];
    for (let k = 1; k <= 8; k++) { let best = Infinity; for (let rep = 0; rep < 6; rep++) { const r = C.rng(1000 * k + rep + 1); let cs = r.shuffle(pts.map((_, i) => i)).slice(0, k).map(i => pts[i].slice()); let a = []; for (let it = 0; it < 60; it++) { const na = pts.map(p => { let bi = 0, bd = Infinity; cs.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; bi = j; } }); return bi; }); if (it && na.every((v, i) => v === a[i])) break; a = na; cs = cs.map((c, j) => { const m = pts.filter((p, i) => a[i] === j); return m.length ? [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length] : c; }); } const v = pts.reduce((s, p, i) => s + d2(p, cs[a[i]]), 0); if (v < best) best = v; } res.push(isFinite(best) ? best : 0); }
    esvg.style.display = ''; esvg.textContent = ''; const mx = Math.max(...res, 1e-9), LX = k => 30 + (k - 1) * 34, LY = v => 92 - 78 * v / mx;
    el('text', { x: 140, y: 10, 'text-anchor': 'middle', 'font-size': 11, class: 'soft' }, esvg).textContent = 'best inertia for each k (look for the elbow)';
    el('path', { d: res.map((v, i) => (i ? 'L' : 'M') + LX(i + 1) + ',' + LY(v)).join(''), fill: 'none', stroke: 'var(--c-b)', 'stroke-width': 2.5 }, esvg);
    res.forEach((v, i) => { el('circle', { cx: LX(i + 1), cy: LY(v), r: 4, fill: i + 1 === S.k ? 'var(--c-c)' : 'var(--c-b)' }, esvg); el('text', { x: LX(i + 1), y: 110, 'text-anchor': 'middle', 'font-size': 10, class: 'soft' }, esvg).textContent = i + 1; });
  }
  function stop() { running = false; clearTimeout(timer); if (bRun) bRun.textContent = '▶ Run'; }
  function toggle() { if (running) { stop(); return; } running = true; bRun.textContent = '❚❚ Pause'; const loop = () => { if (!running) return; const more = stepOnce(); if (!more || conv) { stop(); return; } timer = setTimeout(loop, 520); }; loop(); }
  makeData('blobs3');
  return { makeData, initCents, step: stepOnce };
});

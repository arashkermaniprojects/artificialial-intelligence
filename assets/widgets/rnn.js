/* Tiny recurrent cell: h_t = f(w h_{t-1} + u x_t), h_0 = 0, f = tanh or linear.
   Shows the hidden state over time and the influence of the FIRST input on every later state
   (dh_t / dx_1, the same product of factors that the gradient travels through). */
Course.widget('rnn', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg', TMAX = 16;
  if (!document.getElementById('rnn-css')) {
    const st = document.createElement('style'); st.id = 'rnn-css';
    st.textContent = `
    .rnw input.seq{flex:1;min-width:200px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:8px;padding:6px 10px;font:14px var(--mono)}
    .rnw .insight{border-radius:9px;padding:7px 10px;font-size:13.5px;background:var(--accent2-bg)}
    .rnw .insight.bad{background:var(--bad-bg)} .rnw .insight.warn{background:var(--warn-bg)} .rnw .insight.ok{background:var(--ok-bg)}
    .rnw .muted{color:var(--muted);font-size:12.5px} .rnw .mono{font-family:var(--mono)}
    .rnw text{font-family:var(--sans)}`;
    document.head.append(st);
  }
  root.classList.add('rnw');
  const PRE = {
    fade: { name: 'Fading memory', seq: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0', w: 0.5, u: 1, act: 'tanh' },
    hold: { name: 'Perfect memory (linear, w = 1)', seq: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0', w: 1, u: 1, act: 'lin' },
    explode: { name: 'Exploding (linear, w = 1.5)', seq: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0', w: 1.5, u: 1, act: 'lin' },
    sat: { name: 'Saturated tanh (w = 3)', seq: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0', w: 3, u: 1, act: 'tanh' },
    flip: { name: 'Sign flips (w = −0.9)', seq: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0', w: -0.9, u: 1, act: 'tanh' },
    word: { name: 'Read a word', seq: 'hello world', w: 0.7, u: 1, act: 'tanh' }
  };
  const S = { seq: PRE.fade.seq, w: 0.5, u: 1, act: 'tanh', shown: TMAX };
  function parse(str) {
    const toks = str.trim().split(/[\s,;]+/).filter(Boolean);
    if (toks.length && toks.every(t => isFinite(parseFloat(t)) && /^-?[\d.]+$/.test(t))) return { xs: toks.slice(0, TMAX).map(t => Math.max(-3, Math.min(3, parseFloat(t)))), labels: null };
    const chars = [...str].slice(0, TMAX), val = c => { const l = c.toLowerCase(), k = l.charCodeAt(0) - 97; if (k >= 0 && k < 26) return Math.round((-1 + 2 * k / 25) * 100) / 100; if (/\d/.test(c)) return Math.round(+c / 9 * 100) / 100; return 0; };
    return { xs: chars.map(val), labels: chars.map(c => c === ' ' ? '␣' : c) };
  }
  function run() {
    const P = parse(S.seq), xs = P.xs, hs = [], inf = []; let hp = 0, d = 0;
    xs.forEach((x, t) => { const a = S.w * hp + S.u * x, hv = S.act === 'tanh' ? Math.tanh(a) : a, sl = S.act === 'tanh' ? 1 - hv * hv : 1; d = t === 0 ? S.u * sl : S.w * sl * d; hs.push(hv); inf.push(d); hp = hv; });
    return { xs, labels: P.labels, hs, inf };
  }
  /* ---------- svg ---------- */
  const W = 720, H = 400, X0 = 50, X1 = 700;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); (par || svg).append(e); return e; };
  const txt = (x, y, s, st, par) => { const e = el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', style: st || 'font:600 11px var(--sans);fill:var(--c-soft)' }, par); e.textContent = s; return e; };
  txt(16, 36, 'x', 'font:700 12px var(--sans);fill:var(--c-soft)'); txt(16, 86, 'h', 'font:700 12px var(--sans);fill:var(--c-soft)');
  txt(W / 2, 128, 'hidden state h over time', 'font:700 12px var(--sans);fill:var(--c-ink)');
  txt(W / 2, 266, 'influence of the first input on each state (log scale): what a gradient must travel through', 'font:700 12px var(--sans);fill:var(--c-ink)');
  const chainG = el('g', {}), chartG = el('g', {}), infG = el('g', {});
  // chart frames
  el('rect', { x: X0, y: 140, width: X1 - X0, height: 110, rx: 8, fill: 'var(--card)', stroke: 'var(--line)' });
  el('rect', { x: X0, y: 278, width: X1 - X0, height: 110, rx: 8, fill: 'var(--card)', stroke: 'var(--line)' });
  svg.append(chartG, infG);
  const LMIN = -6, LMAX = 3, ly = v => 388 - (Math.max(LMIN, Math.min(LMAX, v)) - LMIN) / (LMAX - LMIN) * 110;
  for (let e = LMIN; e <= LMAX; e += 3) { el('line', { x1: X0, x2: X1, y1: ly(e), y2: ly(e), stroke: 'var(--c-grid)', 'stroke-dasharray': '3 4' }); txt(X0 - 22, ly(e), e === 0 ? '1' : '1e' + e); }
  const xAt = (t, T) => X0 + 22 + t * ((X1 - X0 - 44) / Math.max(1, T - 1));
  const col = v => { const a = Math.round(Math.min(1, Math.abs(v)) * 75); return v >= 0 ? `color-mix(in srgb, var(--c-b) ${a}%, var(--card))` : `color-mix(in srgb, var(--c-c) ${a}%, var(--card))`; };
  /* ---------- side + controls ---------- */
  const seqIn = h('input', { class: 'seq', value: S.seq, 'aria-label': 'input sequence' }); seqIn.oninput = () => { S.seq = seqIn.value; preSel.value = ''; render(); };
  const slider = (lab, min, max, step, key) => { const i = h('input', { type: 'range', min, max, step, value: S[key] }), o = h('b', { class: 'mono' }, String(S[key])); i.oninput = () => { S[key] = +i.value; o.textContent = (+i.value).toFixed(2); preSel.value = ''; render(); }; return { lab: h('label', {}, lab + ' ', i, o), i, o }; };
  const sW = slider('recurrent weight w', -2, 2, 0.05, 'w'), sU = slider('input weight u', -2, 2, 0.1, 'u');
  const actSel = h('select', {}, h('option', { value: 'tanh' }, 'tanh'), h('option', { value: 'lin' }, 'linear (no squashing)')); actSel.onchange = () => { S.act = actSel.value; preSel.value = ''; render(); };
  const preSel = h('select', {}, h('option', { value: '' }, 'choose a preset…'), Object.entries(PRE).map(([k, p]) => h('option', { value: k }, p.name)));
  preSel.onchange = () => { const p = PRE[preSel.value]; if (!p) return; apply(p); preSel.value = preSel.value; };
  function apply(p) { S.seq = p.seq; S.w = p.w; S.u = p.u; S.act = p.act; seqIn.value = p.seq; sW.i.value = p.w; sW.o.textContent = p.w.toFixed(2); sU.i.value = p.u; sU.o.textContent = p.u.toFixed(2); actSel.value = p.act; play(); }
  const outB = h('div', { class: 'stat' }), insight = h('div', { class: 'insight' }), mapB = h('div', { class: 'muted' });
  const bPlay = h('button', { class: 'btn primary small', onclick: () => play() }, '▶ Play step by step');
  const bReset = h('button', { class: 'btn small', onclick: () => { preSel.value = 'fade'; apply(PRE.fade); } }, 'Reset');
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Recurrent cell playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'h(t) = f( w · h(t−1) + u · x(t) ),  h(0) = 0')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), h('div', { class: 'widget-side' }, outB, insight, mapB)),
    h('div', { class: 'widget-ctl' }, h('label', { style: { flex: '1 1 260px' } }, 'Sequence ', seqIn), h('label', {}, 'Preset ', preSel)),
    h('div', { class: 'widget-ctl' }, sW.lab, sU.lab, h('label', {}, 'activation ', actSel), bPlay, bReset));
  /* ---------- render ---------- */
  const fmt = v => { const a = Math.abs(v); if (a === 0) return '0'; if (a >= 1000 || a < 0.001) return v.toExponential(1); return (Math.round(v * 100) / 100).toString(); };
  function render() {
    const R = run(), T = R.xs.length; chainG.textContent = ''; chartG.textContent = ''; infG.textContent = '';
    if (!T) { insight.textContent = 'Type a sequence of numbers (for example 1 0 0 0) or a word.'; outB.textContent = ''; return; }
    const n = Math.min(T, S.shown);
    // chain
    for (let t = 0; t < T; t++) {
      const x = xAt(t, T), vis = t < n ? 1 : 0.12;
      const g = el('g', { opacity: vis }, chainG);
      el('rect', { x: x - 15, y: 24, width: 30, height: 24, rx: 6, fill: 'var(--c-start)', stroke: 'var(--line)' }, g);
      txt(x, 36, R.labels ? R.labels[t] : fmt(R.xs[t]), 'font:700 11px var(--mono);fill:var(--c-ink)', g);
      el('line', { x1: x, y1: 48, x2: x, y2: 70, stroke: 'var(--c-node-line)', 'stroke-width': 1.5 }, g);
      if (t < T - 1) el('line', { x1: x + 16, y1: 86, x2: xAt(t + 1, T) - 16, y2: 86, stroke: 'var(--c-b)', 'stroke-width': 2.2 }, g);
      el('circle', { cx: x, cy: 86, r: 16, fill: col(R.hs[t]), stroke: 'var(--c-node-line)', 'stroke-width': 1.4 }, g);
      txt(x, 112, fmt(R.hs[t]), 'font:700 10.5px var(--mono);fill:var(--c-ink)', g);
    }
    // h chart
    const hm = Math.max(1, ...R.hs.map(Math.abs)), hy = v => 195 - v / hm * 50;
    el('line', { x1: X0, x2: X1, y1: hy(0), y2: hy(0), stroke: 'var(--c-soft)', 'stroke-width': 1 }, chartG);
    txt(X0 - 22, hy(hm), fmt(hm), null, chartG); txt(X0 - 22, hy(-hm), fmt(-hm), null, chartG); txt(X0 - 22, hy(0), '0', null, chartG);
    let d = ''; for (let t = 0; t < n; t++) d += (t ? 'L' : 'M') + xAt(t, T).toFixed(1) + ',' + hy(R.hs[t]).toFixed(1);
    el('path', { d, fill: 'none', stroke: 'var(--c-b)', 'stroke-width': 3, 'stroke-linejoin': 'round' }, chartG);
    for (let t = 0; t < n; t++) el('circle', { cx: xAt(t, T), cy: hy(R.hs[t]), r: 3.5, fill: 'var(--c-b)' }, chartG);
    // influence bars (log10 |d|)
    for (let t = 0; t < n; t++) {
      const v = Math.abs(R.inf[t]), lg = v > 0 ? Math.log10(v) : LMIN - 1, x = xAt(t, T), y = ly(lg), base = 388;
      const c = v < 0.01 ? 'var(--bad)' : v > 50 ? 'var(--warn)' : 'var(--ok)';
      el('rect', { x: x - 9, y: Math.min(y, base), width: 18, height: Math.max(1, base - y), rx: 4, fill: c, opacity: 0.85 }, infG);
      if (t === 0 || t === n - 1 || t % 3 === 0) txt(x, Math.min(y, base) - 9, fmt(R.inf[t]), 'font:700 10px var(--mono);fill:var(--c-ink)', infG);
    }
    // read-outs
    const last = R.inf[T - 1], aL = Math.abs(last);
    outB.textContent = ''; outB.append(h('span', {}, 'steps'), h('b', {}, String(T)), h('span', {}, 'last state h'), h('b', { class: 'mono' }, fmt(R.hs[T - 1])), h('span', {}, 'influence of x1 on the last state'), h('b', { class: 'mono' }, fmt(last)));
    const sat = S.act === 'tanh' && R.hs.filter(v => Math.abs(v) > 0.95).length >= T / 2;
    let msg, cls = 'insight';
    if (T === 1) msg = 'Only one step: add more inputs to see memory over time.';
    else if (aL < 0.01) { cls += ' bad'; msg = 'Vanishing: after ' + T + ' steps the first input changes the last state only by a factor ' + fmt(last) + '. A gradient from the end of the sequence would barely reach step 1.' + (sat ? ' Note: the state is stuck near ±1, where tanh is flat, so the slope kills the signal even though h looks large.' : ''); }
    else if (aL > 50) { cls += ' warn'; msg = 'Exploding: the first input is multiplied by ' + fmt(last) + ' by the last step. Gradients this large make training jump; clipping caps them.'; }
    else { cls += ' ok'; msg = 'Memory holds: the first input still has an influence of ' + fmt(last) + ' at the last step. Each step multiplies by about |w × slope| ≈ ' + fmt(Math.pow(aL / Math.max(1e-12, Math.abs(R.inf[0])), 1 / Math.max(1, T - 1))) + '.'; }
    insight.className = cls; insight.textContent = msg;
    mapB.textContent = R.labels ? 'Letters are turned into numbers: a = −1 … z = +1, space = 0, digits 0…9 → 0…1.' : 'Up to ' + TMAX + ' numbers, each between −3 and 3. Red bars: influence below 0.01. Orange: above 50.';
  }
  let timer = 0;
  function play() { clearInterval(timer); S.shown = 1; render(); const T = run().xs.length; timer = setInterval(() => { S.shown++; render(); if (S.shown >= T) { clearInterval(timer); S.shown = TMAX; } }, 260); }
  render();
  return { apply: k => apply(PRE[k]), render };
});

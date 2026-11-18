/* Leaky integrate-and-fire neuron (week 14).
   Mode "single": one neuron, sliders for input R·I, threshold and time constant; voltage trace + spike raster.
   Mode "wta": two neurons with mutual inhibition (each spike kicks the other neuron's voltage down by w mV).
   Model: tau dV/dt = -(V - Vrest) + R·I, Vrest = reset = -70 mV. Integrated exactly for constant input over each 0.1 ms step:
   V <- Vinf + (V - Vinf)·exp(-dt/tau) with Vinf = Vrest + R·I. Formula for the time between spikes (single neuron):
   T = tau·ln(R·I / (R·I - (Vth - Vrest))), only if R·I > Vth - Vrest. */
Course.widget('lif', function (root, opts, C) {
  const h = C.h;
  if (!document.getElementById('lif-css')) {
    const st = document.createElement('style'); st.id = 'lif-css';
    st.textContent = `
    .lifw canvas{width:100%;height:auto;display:block;border-radius:10px;background:var(--card);border:1px solid var(--line)}
    .lifw .insight{border-radius:9px;padding:8px 10px;font-size:13.5px;background:var(--accent2-bg)}
    .lifw .insight.ok{background:var(--ok-bg)} .lifw .insight.warn{background:var(--warn-bg)}
    .lifw .legend i{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:5px;vertical-align:middle}
    .lifw .wta-only{display:none} .lifw.wta .wta-only{display:flex} .lifw.wta .single-only{display:none}
    .lifw .muted{color:var(--muted);font-size:12.5px}`;
    document.head.append(st);
  }
  root.classList.add('lifw');
  const mv = v => String(v).replace('-', '−');
  const VR = -70, T_END = 200, DT = 0.1, W = 680, H = 320;
  const S = { mode: opts.mode === 'wta' ? 'wta' : 'single', I: 20, I1: 22, I2: 20, th: -54, tau: 10, w: 8 };

  /* ---------- simulation ---------- */
  function simulate() {
    const n = S.mode === 'wta' ? 2 : 1, I = n === 2 ? [S.I1, S.I2] : [S.I], V = new Array(n).fill(VR), trace = Array.from({ length: n }, () => []), spikes = Array.from({ length: n }, () => []);
    const decay = Math.exp(-DT / S.tau), steps = Math.round(T_END / DT);
    for (let k = 1; k <= steps; k++) {
      const t = k * DT, fired = [];
      for (let i = 0; i < n; i++) { const vinf = VR + I[i]; V[i] = vinf + (V[i] - vinf) * decay; if (V[i] >= S.th) { fired.push(i); } }
      for (const i of fired) { spikes[i].push(t); trace[i].push([t, S.th, true]); V[i] = VR; }
      if (n === 2) for (const i of fired) { const j = 1 - i; if (!fired.includes(j)) V[j] -= S.w; }
      for (let i = 0; i < n; i++) if (!fired.includes(i)) trace[i].push([t, V[i], false]); else trace[i].push([t, VR, false]);
    }
    return { trace, spikes, n };
  }

  /* ---------- DOM ---------- */
  const cv = h('canvas', { width: W * 2, height: H * 2, 'aria-label': 'membrane voltage and spikes' }), ctx = cv.getContext('2d');
  const insight = h('div', { class: 'insight' });
  const out = {}; const statBox = h('div', { class: 'stat' });
  const slider = (key, label, min, max, step, unit) => { const i = h('input', { type: 'range', min, max, step, value: S[key] }), b = h('b', {}, S[key] + ' ' + unit); i.addEventListener('input', () => { S[key] = +i.value; b.textContent = S[key] + ' ' + unit; restart(); }); return { el: h('label', {}, label + ' ', i, b), i, b, key, unit }; };
  const sl = { I: slider('I', 'input R·I', 0, 40, 1, 'mV'), I1: slider('I1', 'input N1', 0, 40, 1, 'mV'), I2: slider('I2', 'input N2', 0, 40, 1, 'mV'), w: slider('w', 'inhibition', 0, 20, 1, 'mV'), th: slider('th', 'threshold', -62, -46, 1, 'mV'), tau: slider('tau', 'leak time τ', 2, 40, 1, 'ms') };
  sl.I.el.classList.add('single-only'); sl.I1.el.classList.add('wta-only'); sl.I2.el.classList.add('wta-only'); sl.w.el.classList.add('wta-only');
  const modeSel = h('select', { 'aria-label': 'mode' }, h('option', { value: 'single' }, 'One neuron'), h('option', { value: 'wta' }, 'Two competing neurons')); modeSel.value = S.mode;
  modeSel.onchange = () => { S.mode = modeSel.value; root.classList.toggle('wta', S.mode === 'wta'); presetsUI(); restart(); };
  const presetBox = h('span', {});
  const PRE = {
    single: [['Weak input (15 mV)', { I: 15, th: -54, tau: 10 }], ['Lecture example (20 mV)', { I: 20, th: -54, tau: 10 }], ['Strong input (32 mV)', { I: 32, th: -54, tau: 10 }]],
    wta: [['No inhibition', { I1: 22, I2: 20, w: 0, th: -54, tau: 10 }], ['Weak competition', { I1: 22, I2: 20, w: 3, th: -54, tau: 10 }], ['Winner-take-all', { I1: 22, I2: 20, w: 12, th: -54, tau: 10 }]]
  };
  function setVals(o) { Object.assign(S, o); for (const k in sl) { sl[k].i.value = S[k]; sl[k].b.textContent = S[k] + ' ' + sl[k].unit; } restart(); }
  function presetsUI() { presetBox.textContent = ''; PRE[S.mode].forEach(([n, o]) => presetBox.append(h('button', { class: 'btn small', onclick: () => setVals(o) }, n))); }
  const bReset = h('button', { class: 'btn small', onclick: () => setVals(S.mode === 'wta' ? PRE.wta[1][1] : PRE.single[1][1]) }, 'Reset');
  const legend = h('div', { class: 'legend' }, h('span', {}, h('i', { style: { background: 'var(--c-b)' } }), 'neuron 1'), h('span', { class: 'wta-only' }, h('i', { style: { background: 'var(--c-c)' } }), 'neuron 2'), h('span', {}, h('i', { style: { background: 'var(--bad)' } }), 'threshold'));
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚡ Leaky integrate-and-fire neuron'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, '200 ms of simulated time')),
    h('div', { class: 'widget-body' },
      h('div', { class: 'widget-canvas' }, cv, legend),
      h('div', { class: 'widget-side' }, statBox, insight, h('div', { class: 'muted' }, 'Rest and reset at −70 mV. The voltage climbs toward −70 + R·I and leaks back with time constant τ.'))),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Mode ', modeSel), sl.I.el, sl.I1.el, sl.I2.el, sl.w.el, sl.th.el, sl.tau.el),
    h('div', { class: 'widget-ctl' }, presetBox, bReset));
  root.classList.toggle('wta', S.mode === 'wta');

  /* ---------- drawing ---------- */
  const css = n => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888'; } catch (e) { return '#888'; } };
  const L = 52, R = 12, TOPY = 16, PH = 200, RY = 238, RH = 26;
  const X = t => L + t / T_END * (W - L - R), Y = v => TOPY + 18 + (-40 - Math.max(-82, Math.min(-40, v))) / 42 * (PH - 18);
  let sim = null, raf = 0, t0 = 0;
  function draw(frac) {
    ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, W, H);
    const grid = css('--c-grid'), soft = css('--muted'), fg = css('--fg'), cols = [css('--c-b'), css('--c-c')], bad = css('--bad');
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = soft; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const v of [-80, -70, -60, -50]) { ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(W - R, Y(v)); ctx.stroke(); ctx.fillText(v + ' mV', L - 6, Y(v)); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let t = 0; t <= T_END; t += 50) ctx.fillText(t + ' ms', X(t), RY + sim.n * RH + 6);
    ctx.strokeStyle = bad; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, Y(S.th)); ctx.lineTo(W - R, Y(S.th)); ctx.stroke(); ctx.setLineDash([]);
    const tEnd = T_END * frac;
    for (let i = sim.n - 1; i >= 0; i--) {
      ctx.strokeStyle = cols[i]; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(X(0), Y(VR));
      for (const [t, v, sp] of sim.trace[i]) { if (t > tEnd) break; if (sp) { ctx.lineTo(X(t), Y(v)); ctx.lineTo(X(t), TOPY); ctx.moveTo(X(t), Y(VR)); } else ctx.lineTo(X(t), Y(v)); }
      ctx.stroke();
      const ry = RY + i * RH + RH / 2;
      ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, ry); ctx.lineTo(W - R, ry); ctx.stroke();
      ctx.fillStyle = soft; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(sim.n === 2 ? 'N' + (i + 1) : 'spikes', L - 6, ry);
      ctx.strokeStyle = cols[i]; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (const t of sim.spikes[i]) { if (t > tEnd) break; ctx.beginPath(); ctx.moveTo(X(t), ry - 9); ctx.lineTo(X(t), ry + 9); ctx.stroke(); }
    }
    // sweep cursor
    if (frac < 1) { ctx.strokeStyle = fg; ctx.globalAlpha = .25; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(tEnd), TOPY); ctx.lineTo(X(tEnd), RY + sim.n * RH); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  function stats() {
    statBox.textContent = '';
    const row = (k, v) => statBox.append(h('span', {}, k), h('b', {}, v));
    const gap = S.th - VR;
    if (S.mode === 'single') {
      const n = sim.spikes[0].length; row('Spikes in 200 ms', String(n)); row('Rate (counted)', (n * 5) + ' spikes/s');
      if (S.I > gap) { const T = S.tau * Math.log(S.I / (S.I - gap)); row('Time between spikes', T.toFixed(1) + ' ms (formula)'); row('Rate from formula', (1000 / T).toFixed(0) + ' spikes/s'); }
      else { row('Settles at', mv(VR + S.I) + ' mV'); row('Threshold', mv(S.th) + ' mV'); }
      if (S.I <= gap) { insight.className = 'insight warn'; insight.textContent = `The input is too weak: without spikes the voltage settles at −70 + ${S.I} = ${mv(VR + S.I)} mV, which is not above the threshold (${mv(S.th)} mV). The leak wins, so the neuron stays silent. It needs more than ${gap} mV.`; }
      else { insight.className = 'insight ok'; const T = S.tau * Math.log(S.I / (S.I - gap)); insight.textContent = `The neuron fires every ${T.toFixed(1)} ms, about ${(1000 / T).toFixed(0)} spikes per second. Raise the input: the rate goes up, but not in proportion, because the leak works harder near the threshold.`; }
    } else {
      const a = sim.spikes[0].length, b = sim.spikes[1].length; row('Spikes of N1', String(a)); row('Spikes of N2', String(b)); row('Inhibition kick', S.w + ' mV per spike');
      let msg, cls = 'insight';
      if (a === 0 && b === 0) { msg = 'Both inputs are too weak to reach the threshold.'; cls += ' warn'; }
      else if (S.w === 0) { msg = 'No inhibition: each neuron fires at its own rate, set only by its own input.'; }
      else if (Math.min(a, b) === 0) { const win = a > b ? 'N1' : 'N2'; msg = `Winner-take-all: ${win} wins and the other neuron is silenced. Each spike of the winner pushes the loser down before it can reach the threshold.`; cls += ' ok'; }
      else { const r0 = a / b; msg = `Soft competition: both fire, but the ratio of spikes is ${r0.toFixed(2)}. Raise the inhibition to turn a small difference in input into a clear winner.`; }
      insight.className = cls; insight.textContent = msg;
    }
  }
  function restart() {
    sim = simulate(); stats(); cancelAnimationFrame(raf); t0 = performance.now();
    const loop = now => { const f = Math.min(1, (now - t0) / 1200); draw(f); if (f < 1) raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
  }
  presetsUI(); restart();
  try { new MutationObserver(() => sim && draw(1)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }
  return { setVals };
});

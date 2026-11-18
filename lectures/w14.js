(function () {
const K = Course.kit;

/* ---------- small helpers (local to this lecture) ---------- */
// Q(fn): when the engine replays a cue instantly, every animation inside the cue (also after an await) is instant.
const Q = fn => F => { if (F.instant) { const P = Object.create(F); P.instant = true; return fn(P); } return fn(F); };
async function blink(F, el, n = 1) { if (F.instant) return; for (let i = 0; i < n; i++) { await F.to(el, { opacity: 0.3 }, 220); await F.to(el, { opacity: 1 }, 260); } }   // flash for elements without a transform
const EASE = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function tw(F, ms, fn) {
  if (F.instant || ms <= 0) { fn(1); return Promise.resolve(); }
  const tk = F.token, st = performance.now();
  return new Promise(res => { const f = now => { if (tk !== F.token) return; const p = Math.min(1, (now - st) / ms); fn(EASE(p)); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
}
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';

/* ================= scene 1: leaky integrate-and-fire =================
   tau = 10 ms, rest = reset = -70 mV, threshold = -54 mV.
   Strong input R·I = 20 mV: V(t) = -70 + 20(1 - e^(-t/10)); reaches -54 at t = 10·ln(20/4) = 16.09 ms (checked with an Euler
   simulation, dt = 0.1 ms: spikes at 16.1, 32.2, 48.3 ms), so about 62 spikes per second.
   Weak input R·I = 15 mV: V settles at -55 mV, below threshold: no spike. */
const TAU = 10, VR = -70, VTH = -54, RS = 20, RW = 15, ISI = TAU * Math.log(RS / (RS - (VTH - VR)));
const PX = t => 230 + t / 60 * 460, PY = v => 300 - (v + 76) / 30 * 220, TOP = 66;
function strongPath(T) {
  let d = `M${PX(0)},${PY(VR)}`, k = 0;
  while (k * ISI < T - 1e-9) {
    const s = k * ISI, e = Math.min((k + 1) * ISI, T);
    for (let t = s; t < e; t += 0.25) d += ` L${PX(t).toFixed(1)},${PY(VR + RS * (1 - Math.exp(-(t - s) / TAU))).toFixed(1)}`;
    d += ` L${PX(e).toFixed(1)},${PY(VR + RS * (1 - Math.exp(-(e - s) / TAU))).toFixed(1)}`;
    if (e >= (k + 1) * ISI - 1e-9) d += ` L${PX(e).toFixed(1)},${TOP} L${PX(e).toFixed(1)},${PY(VR)}`;
    k++;
  }
  return d;
}
const vStrong = t => { const s = Math.floor(t / ISI + 1e-9) * ISI; return VR + RS * (1 - Math.exp(-(t - s) / TAU)); };
const vWeak = t => VR + RW * (1 - Math.exp(-t / TAU));
function weakPath(T) { let d = `M${PX(0)},${PY(VR)}`; for (let t = 0.5; t <= T + 1e-9; t += 0.5) d += ` L${PX(t).toFixed(1)},${PY(vWeak(t)).toFixed(1)}`; return d; }
const BY = v => 310 - Math.max(0, Math.min(1.12, (v - VR) / (VTH - VR))) * 160;
const sceneLIF = {
  id: 'lif', title: 'A spiking neuron: leaky integrate-and-fire', w: 720, h: 400,
  build(F) {
    K.title(F, 'A neuron as a leaky bucket', 'membrane voltage in millivolts (mV) · time in milliseconds (ms)');
    // bucket
    F.s.water = F.rect(52, 310, 96, 0, { fill: 'var(--c-b)', 'fill-opacity': .55 });
    F.path('M50,128 L50,312 L150,312 L150,128', { stroke: 'var(--c-node-line)', 'stroke-width': 3 });
    F.line(42, BY(VTH), 158, BY(VTH), { stroke: 'var(--bad)', 'stroke-width': 2, 'stroke-dasharray': '6 4' });
    F.text(100, BY(VTH) - 12, 'threshold', { size: 11.5, weight: 700, fill: 'var(--bad)' });
    F.text(100, 336, 'neuron = leaky bucket', { size: 12, weight: 700, cls: 'soft' });
    F.s.tap = F.arrow(100, 76, 100, 118, { color: 'var(--c-b)', w: 4 }); F.text(100, 66, 'input current', { size: 11.5, weight: 700, fill: 'var(--c-b)' });
    F.s.leak = F.g({}); F.path('M150,300 Q168,304 172,322', { stroke: 'var(--c-b)', 'stroke-width': 3, 'stroke-linecap': 'round' }, F.s.leak); F.text(184, 340, 'leak', { size: 11.5, weight: 700, fill: 'var(--c-b)' }, F.s.leak); F.s.leak.style.opacity = 0;
    F.s.flash = F.text(100, 362, '⚡ spike!', { size: 15, weight: 800, fill: 'var(--c-c)' }); F.s.flash.style.opacity = 0;
    // plot
    F.rect(230, 70, 460, 230, { fill: 'var(--card)', stroke: 'var(--line)', rx: 6 });
    for (const v of [-70, -60, -50]) { F.line(230, PY(v), 690, PY(v), { stroke: 'var(--c-grid)' }); F.text(222, PY(v), String(v), { size: 11, cls: 'soft', anchor: 'end' }); }
    for (const t of [0, 20, 40, 60]) F.text(PX(t), 312, t + ' ms', { size: 11, cls: 'soft' });
    F.line(230, PY(VTH), 690, PY(VTH), { stroke: 'var(--bad)', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' });
    F.text(688, PY(VTH) - 9, 'threshold −54', { size: 11, weight: 700, fill: 'var(--bad)', anchor: 'end' });
    F.s.restL = F.text(236, PY(VR) + 12, 'rest −70', { size: 11, weight: 700, cls: 'soft', anchor: 'start' }); F.s.restL.style.opacity = 0;
    F.s.weak = F.path('', { stroke: 'var(--c-soft)', 'stroke-width': 2.4, 'stroke-dasharray': '5 4' });
    F.s.strong = F.path(strongPath(0), { stroke: 'var(--c-b)', 'stroke-width': 2.6, 'stroke-linejoin': 'round' });
    F.text(210, 352, 'spikes', { size: 11.5, weight: 700, cls: 'soft', anchor: 'end' });
    F.line(230, 352, 690, 352, { stroke: 'var(--c-grid)' });
    F.s.ticks = [1, 2, 3].map(k => { const l = F.line(PX(k * ISI), 340, PX(k * ISI), 364, { stroke: 'var(--c-c)', 'stroke-width': 3.5, 'stroke-linecap': 'round' }); l.style.opacity = 0; return l; });
    F.s.cWeak = K.callout(F, 500, 228, 'weak input: settles at −55, just below the line', { tone: 'warn', w: 340 });
    F.s.cRate = K.callout(F, 470, 384, 'one spike every 16.1 ms ≈ 62 spikes per second', { tone: 'ok', w: 360 });
    F.s.T = 0;
    F.s.go = (T, v) => { F.s.T = T; F.s.strong.setAttribute('d', strongPath(T)); const lv = BY(v != null ? v : vStrong(T)); F.s.water.setAttribute('y', lv); F.s.water.setAttribute('height', 310 - lv); F.s.ticks.forEach((l, i) => { l.style.opacity = T >= (i + 1) * ISI - 1e-9 ? 1 : 0; }); };
  },
  steps: [
    { title: 'Rest', say: ['A brain cell, or neuron, collects small electric inputs from other cells.', 'Without input, its voltage rests at about minus seventy millivolts.'],
      cues: [Q(async F => { F.s.go(0); await blink(F, F.s.tap, 1); }), Q(async F => { F.s.go(0); await F.show(F.s.restL); })] },
    { title: 'Integrate', say: ['Input current pushes the voltage up, like water filling a bucket.', 'Adding up the input over time is the integrate part.'],
      cues: [Q(F => tw(F, 1600, p => F.s.go(10 * p))), Q(async F => { F.s.go(10); await blink(F, F.s.water, 1); })] },
    { title: 'Leak', say: ['But the bucket has a hole, so charge leaks out all the time. That is the leaky part.', 'With weaker input the voltage settles at minus fifty five, just below the threshold, and nothing happens.'],
      cues: [Q(async F => { F.s.go(10); await F.show(F.s.leak); }),
             Q(async F => { await tw(F, 1600, p => { F.s.weak.setAttribute('d', weakPath(60 * p)); const lv = BY(vWeak(60 * p)); F.s.water.setAttribute('y', lv); F.s.water.setAttribute('height', 310 - lv); }); await F.show(F.s.cWeak); })] },
    { title: 'Fire and reset', say: ['With the stronger input, the voltage reaches the threshold of minus fifty four.', 'The neuron fires a spike, and the voltage is reset to rest.'],
      cues: [Q(async F => { F.hide(F.s.cWeak); F.s.go(10); await tw(F, 900, p => F.s.go(10 + (ISI - 10.001) * p)); }),
             Q(async F => { F.s.go(ISI); F.set(F.s.flash, { opacity: 1 }); await F.wait(600); await F.hide(F.s.flash, 500); })] },
    { title: 'Spikes carry the message', say: ['With constant input the cycle repeats: here one spike every sixteen milliseconds, about sixty two per second.', 'Stronger input gives faster firing. Information is in the rate and timing of spikes.'],
      cues: [Q(F => tw(F, 2600, p => F.s.go(ISI + (60 - ISI) * p))), Q(async F => { F.s.go(60); await F.show(F.s.cRate); })] }
  ]
};

/* ================= scene 2: competition between two neurons (rate model) =================
   tau dr/dt = -r + max(0, I - w·r_other), inputs 1.0 and 0.8.  Checked by simulation:
   w = 0.5 -> (0.8, 0.4)  (exact: (1 - 0.5·0.8)/(1 - 0.25) = 0.8 and (0.8 - 0.5)/(0.75) = 0.4);  w = 2 -> (1.0, 0.0). */
function traj(w, r0) { const out = [r0.slice()]; let [a, b] = r0; for (let k = 0; k < 400; k++) { const da = -a + Math.max(0, 1 - w * b), db = -b + Math.max(0, 0.8 - w * a); a += 0.02 * da; b += 0.02 * db; out.push([a, b]); } return out; }
const TR05 = traj(0.5, [1, 0.8]), TR2 = traj(2, [0.8, 0.4]);
const sceneWTA = {
  id: 'wta', title: 'Competition: lateral inhibition and winner-take-all', w: 720, h: 400,
  build(F) {
    K.title(F, 'Two neurons that compete', 'each neuron pushes the other one down (inhibition)');
    F.s.in1 = F.arrow(60, 130, 162, 130, { color: 'var(--c-b)', w: 7 }); F.text(90, 112, 'input 1.0', { size: 12, weight: 700, fill: 'var(--c-b)' });
    F.s.in2 = F.arrow(60, 270, 162, 270, { color: 'var(--c-b)', w: 5.6 }); F.text(90, 252, 'input 0.8', { size: 12, weight: 700, fill: 'var(--c-b)' });
    F.s.inh = F.g({}); F.s.inh.style.opacity = 0;
    F.path('M190,160 Q160,200 190,240', { stroke: 'var(--bad)', 'stroke-width': 3 }, F.s.inh); F.circle(190, 240, 6, { fill: 'var(--bad)' }, F.s.inh);
    F.path('M230,240 Q260,200 230,160', { stroke: 'var(--bad)', 'stroke-width': 3 }, F.s.inh); F.circle(230, 160, 6, { fill: 'var(--bad)' }, F.s.inh);
    F.s.wTxt = F.text(300, 200, '', { size: 13, weight: 800, fill: 'var(--bad)', anchor: 'start' });
    F.s.n1 = F.box(210, 130, 64, 64, 'N1', { fill: 'var(--c-node)', rx: 32, size: 16, weight: 800 });
    F.s.n2 = F.box(210, 270, 64, 64, 'N2', { fill: 'var(--c-node)', rx: 32, size: 16, weight: 800 });
    F.text(560, 74, 'activity', { size: 12, weight: 700, cls: 'soft' });
    F.s.bars = [130, 270].map((y, i) => { F.rect(420, y - 16, 250, 32, { rx: 8, fill: 'var(--c-grid)' }); const r = F.rect(420, y - 16, 0, 32, { rx: 8, fill: i ? 'var(--c-c)' : 'var(--c-a)' }); const t = F.text(410, y, '0.00', { size: 15, weight: 800, mono: true, anchor: 'end' }); return { r, t }; });
    F.s.set = (a, b) => { [a, b].forEach((v, i) => { F.s.bars[i].r.setAttribute('width', Math.max(0, v) * 250); F.setText(F.s.bars[i].t, v.toFixed(2), 410); }); F.s.n1.rect.style.opacity = 0.35 + 0.65 * Math.min(1, a); F.s.n2.rect.style.opacity = 0.35 + 0.65 * Math.min(1, b); };
    F.s.gap = K.callout(F, 545, 345, 'gap 0.2 → 0.4: competition sharpens differences', { tone: 'accent', w: 330 });
    F.s.win = K.callout(F, 545, 345, 'winner-take-all: only N1 stays active', { tone: 'ok', w: 300 });
    F.s.pool = F.g({}); F.s.pool.style.opacity = 0;
    [0.2, 0.9, 0.4, 0.1].forEach((v, i) => F.box(70 + i * 40, 365, 36, 30, String(v), { size: 12, mono: true, fill: v === 0.9 ? 'var(--c-cur)' : 'var(--c-node)', shadow: false }, F.s.pool));
    F.arrow(232, 365, 282, 365, { color: 'var(--c-node-line)' }, F.s.pool); F.box(310, 365, 40, 30, '0.9', { size: 12, mono: true, fill: 'var(--c-cur)', shadow: false }, F.s.pool);
    F.text(190, 336, 'max pooling keeps the winner', { size: 11.5, weight: 700, cls: 'soft' }, F.s.pool);
    F.s.set(0, 0);
  },
  steps: [
    { title: 'Two neurons, two inputs', say: ['Two neurons get two inputs: one point zero and zero point eight.', 'Without any link between them, each one simply follows its input.'],
      cues: [Q(F => tw(F, 900, p => F.s.set(p, 0.8 * p))), Q(async F => { F.s.set(1, 0.8); await F.pulse(F.s.n1, 1); })] },
    { title: 'Lateral inhibition', say: ['Now each neuron inhibits the other, with strength zero point five.', 'They settle at zero point eight and zero point four. The gap between them doubled.'],
      cues: [Q(async F => { F.s.set(1, 0.8); F.setText(F.s.wTxt, 'inhibition 0.5', 300); await F.show(F.s.inh); }),
             Q(async F => { await tw(F, 1800, p => { const r = TR05[Math.round(p * (TR05.length - 1))]; F.s.set(r[0], r[1]); }); F.s.set(0.8, 0.4); await F.show(F.s.gap); })] },
    { title: 'Winner takes all', say: ['With a strong inhibition of two, the stronger neuron silences the weaker one completely.', 'The winner keeps one, the loser drops to zero. This is called winner take all.'],
      cues: [Q(async F => { F.hide(F.s.gap); F.setText(F.s.wTxt, 'inhibition 2.0', 300); await tw(F, 1800, p => { const r = TR2[Math.round(p * (TR2.length - 1))]; F.s.set(r[0], r[1]); }); F.s.set(1, 0); }),
             Q(async F => { F.s.set(1, 0); await F.show(F.s.win); })] },
    { title: 'Echoes in AI', say: ['Max pooling in image networks keeps only the strongest response, a simple winner take all.', 'In the brain, only a few neurons are active at a time. Such sparse activity saves energy.'],
      cues: [Q(async F => { F.hide(F.s.win); await F.show(F.s.pool); }), Q(async F => { await F.pulse(F.s.n1, 1); })] }
  ]
};

/* ================= scene 3: Hebbian learning (w: 0.1 + 0.5·1·1 = 0.6) ================= */
const sceneHebb = {
  id: 'hebb', title: 'Hebbian learning: fire together, wire together', w: 720, h: 400,
  build(F) {
    K.title(F, 'Cells that fire together wire together', 'the thickness of the link shows its weight w');
    F.s.syn = F.line(196, 150, 494, 150, { stroke: 'var(--c-a)', 'stroke-width': 3.4, 'stroke-linecap': 'round' });
    F.s.A = F.box(150, 150, 84, 84, 'A', { rx: 42, size: 20, weight: 800 }); F.s.B = F.box(540, 150, 84, 84, 'B', { rx: 42, size: 20, weight: 800 });
    F.text(150, 210, 'sending cell', { size: 11.5, cls: 'soft', weight: 700 }); F.text(540, 210, 'receiving cell', { size: 11.5, cls: 'soft', weight: 700 });
    F.s.w = F.text(345, 120, 'w = 0.10', { size: 18, weight: 800, mono: true, fill: 'var(--c-a)' });
    F.s.dot = F.g({ transform: 'translate(196,150)' }); F.s.dot.__t = { x: 196, y: 150, s: 1, r: 0 }; F.circle(0, 0, 7, { fill: 'var(--c-c)', filter: 'url(#fx-glow)' }, F.s.dot); F.s.dot.style.opacity = 0;
    F.s.rule = K.callout(F, 345, 250, 'change in w = rate × activity of A × activity of B', { tone: 'accent', w: 420 });
    F.s.calc = K.callout(F, 345, 292, '0.10 + 0.5 × 1 × 1 = 0.60', { tone: 'ok', w: 240 });
    F.s.zero = K.callout(F, 345, 292, '0.60 + 0.5 × 1 × 0 = 0.60 (no change)', { tone: 'warn', w: 320 });
    // STDP sketch
    const st = F.s.stdp = F.g({}); st.style.opacity = 0;
    F.line(220, 330, 500, 330, { stroke: 'var(--c-soft)', 'stroke-width': 1.4 }, st); F.line(360, 278, 360, 384, { stroke: 'var(--c-soft)', 'stroke-width': 1.4 }, st);
    let dp = 'M362,' + (330 - 40); for (let x = 2; x <= 140; x += 4) dp += ` L${360 + x},${(330 - 40 * Math.exp(-x / 34)).toFixed(1)}`;
    let dn = 'M358,' + (330 + 28); for (let x = 2; x <= 140; x += 4) dn += ` L${360 - x},${(330 + 28 * Math.exp(-x / 34)).toFixed(1)}`;
    F.s.dp = F.path(dp, { stroke: 'var(--ok)', 'stroke-width': 3 }, st); F.s.dn = F.path(dn, { stroke: 'var(--bad)', 'stroke-width': 3 }, st);
    F.text(470, 292, 'A just before B:\nstronger', { size: 11.5, weight: 700, fill: 'var(--ok)', lh: 14 }, st);
    F.text(250, 372, 'A just after B:\nweaker', { size: 11.5, weight: 700, fill: 'var(--bad)', lh: 14 }, st);
    F.text(506, 346, 'time of B minus time of A', { size: 11, cls: 'soft', anchor: 'start' }, st);
    F.s.warnC = K.callout(F, 345, 372, 'without limits, weights only grow: add normalisation', { tone: 'warn', w: 400 });
    F.s.setW = w => { F.s.syn.setAttribute('stroke-width', 2 + 14 * w); F.setText(F.s.w, 'w = ' + w.toFixed(2), 345); };
  },
  steps: [
    { title: "Hebb's idea", say: ['In 1949 the psychologist Donald Hebb suggested a simple learning rule.', 'When cell A often helps to fire cell B, the link from A to B gets stronger.'],
      cues: [Q(async F => { F.s.setW(0.1); await F.pulse(F.s.A, 1); }), Q(async F => { F.s.setW(0.1); if (!F.instant) { F.set(F.s.dot, { tx: 196, opacity: 1 }); await F.to(F.s.dot, { tx: 494 }, 700); F.set(F.s.dot, { opacity: 0 }); } await F.pulse(F.s.B, 1); })] },
    { title: 'The rule in numbers', say: ['The change in weight is a small learning rate, times the activity of A, times the activity of B.', 'Start at zero point one with rate zero point five. Both are active with value one, so the weight grows to zero point six.'],
      cues: [Q(async F => { F.s.setW(0.1); await F.show(F.s.rule); }),
             Q(async F => { F.to(F.s.A.rect, { fill: 'var(--c-cur)' }, 250); await F.to(F.s.B.rect, { fill: 'var(--c-cur)' }, 250); await tw(F, 1000, p => F.s.setW(0.1 + 0.5 * p)); await F.show(F.s.calc); F.to(F.s.A.rect, { fill: 'var(--c-node)' }, 300); F.to(F.s.B.rect, { fill: 'var(--c-node)' }, 300); })] },
    { title: 'Only together', say: ['If A fires but B stays silent, the product is zero, and the weight does not change.', 'Only shared activity is rewarded.'],
      cues: [Q(async F => { F.s.setW(0.6); F.hide(F.s.calc); F.set(F.s.B.rect, { fill: 'var(--c-node)' }); F.to(F.s.B, { opacity: .45 }, 300); await F.to(F.s.A.rect, { fill: 'var(--c-cur)' }, 300); await F.show(F.s.zero); }),
             Q(async F => { await blink(F, F.s.w, 1); F.to(F.s.A.rect, { fill: 'var(--c-node)' }, 300); F.to(F.s.B, { opacity: 1 }, 300); })] },
    { title: 'Timing matters', say: ['Real synapses also care about order. If A fires just before B, the link grows. If A fires just after B, it shrinks.', 'This is called spike timing dependent plasticity.'],
      cues: [Q(async F => { F.hide(F.s.zero); F.hide(F.s.rule); F.s.dp.style.opacity = 0; F.s.dn.style.opacity = 0; await F.show(F.s.stdp); await F.draw(F.s.dp, 700); await F.draw(F.s.dn, 700); }), Q(async F => { await blink(F, F.s.stdp, 1); })] },
    { title: 'A warning', say: ['Pure Hebbian learning only grows, so weights can run away. Brains and models need limits, such as normalisation.', 'Deep networks learn mostly with backpropagation, but Hebbian ideas live on in associative memories and self organising maps.'],
      cues: [Q(async F => { F.hide(F.s.stdp); await F.show(F.s.warnC); }), Q(async F => { await blink(F, F.s.syn, 1); })] }
  ]
};

/* ================= scene 4: Bayes with natural frequencies =================
   1000 people, 2% sick = 20; sensitivity 90% -> 18 true positives, 2 missed;
   980 healthy, 5% false alarms = 49; positives = 67; P(sick | positive) = 18/67 = 0.2687 (exact with the probabilities too). */
const NF = { N: 1000, sick: 20, tp: 18, fn: 2, fp: 49 };
function dotSnap(F, k) {
  F.s.dots.forEach((d, i) => {
    const sick = i < NF.sick, tp = i < NF.tp, fp = i >= NF.sick && i < NF.sick + NF.fp, pos = tp || fp;
    let fill = 'var(--c-soft)', op = k >= 1 ? 0.45 : 0, stroke = 'none';
    if (k >= 2 && sick) { fill = 'var(--bad)'; op = 1; }
    if (k >= 3 && sick && !tp) { fill = 'var(--bad-bg)'; stroke = 'var(--bad)'; }
    if (k >= 4 && fp) { fill = 'var(--warn)'; op = 1; }
    if (k >= 5 && !pos) op = 0.12;
    d.style.fill = fill; d.style.stroke = stroke; d.style.opacity = op;
  });
  const v = (el, on) => F.to(el, { opacity: on ? 1 : 0 }, 350);
  v(F.s.tr[0], k >= 2); v(F.s.tr[1], k >= 2); v(F.s.tr[2], k >= 2); v(F.s.tr[3], k >= 3); v(F.s.tr[4], k >= 3); v(F.s.tr[5], k >= 4); v(F.s.tr[6], k >= 4); v(F.s.res, k >= 5);
}
const sceneBayes = {
  id: 'bayes', title: 'Bayes rule with natural frequencies', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'A positive test: how likely is the disease?', '2% are sick · the test finds 90% of the sick · it gives a false alarm to 5% of the healthy');
    F.s.dots = [];
    for (let i = 0; i < NF.N; i++) { const c = Math.floor(i / 25), r = i % 25; const d = F.circle(40 + c * 11, 100 + r * 11, 4.2, { fill: 'var(--c-soft)' }); d.style.opacity = 0; d.style.transition = 'fill .5s, opacity .5s, stroke .5s'; d.style.strokeWidth = '1.4'; F.s.dots.push(d); }
    F.s.q = K.callout(F, 260, 236, 'positive test → sick?\nmost people guess about 90%', { tone: 'accent', w: 260 });
    const node = (x, y, t, col, w = 88) => { const b = F.box(x, y, w, 40, t, { size: 13, weight: 750, fill: 'var(--card)', stroke: col }); b.style.opacity = 0; return b; };
    const edge = (x1, y1, x2, y2) => { const l = F.line(x1, y1, x2, y2, { stroke: 'var(--c-node-line)', 'stroke-width': 1.8 }); return l; };
    const eg = [F.g({}), F.g({}), F.g({})];
    [[700, 111, 610, 170], [700, 111, 800, 170]].forEach(e => eg[0].append(edge(...e)));
    [[610, 210, 560, 250], [610, 210, 660, 250]].forEach(e => eg[1].append(edge(...e)));
    [[800, 210, 750, 250], [800, 210, 850, 250]].forEach(e => eg[2].append(edge(...e)));
    eg.forEach(g => { g.style.opacity = 0; });
    F.s.root = F.box(700, 92, 120, 38, '1000 people', { size: 13.5, weight: 800, fill: 'var(--card)' });
    F.s.tr = [eg[0], node(610, 190, '20 sick', 'var(--bad)', 104), node(800, 190, '980 healthy', 'var(--c-soft)', 104), eg[1], node(560, 270, '18 test +', 'var(--bad)'), eg[2], node(750, 270, '49 test +', 'var(--warn)')];
    F.s.trNeg = [node(660, 270, '2 test −', 'var(--c-soft)'), node(850, 270, '931 test −', 'var(--c-soft)')];   // shown by the cues
    F.s.res = F.box(700, 352, 330, 62, 'positive tests: 18 + 49 = 67\nsick among them: 18 / 67 ≈ 27%', { size: 14, weight: 800, fill: 'var(--ok-bg)', stroke: 'var(--ok)' }); F.s.res.style.opacity = 0;
    F.s.root.style.opacity = 0;
  },
  steps: [
    { title: 'The question', say: ['A disease affects two percent of people. A test finds ninety percent of sick people, but gives a false alarm to five percent of healthy people.', 'Your test is positive. How likely is it that you are sick? Many people guess ninety percent.'],
      cues: [Q(async F => { dotSnap(F, 0); F.s.trNeg.forEach(b => F.set(b, { opacity: 0 })); }), Q(async F => { dotSnap(F, 0); await F.show(F.s.q); await F.pulse(F.s.q, 1); })] },
    { title: 'Picture 1000 people', say: ['Picture one thousand people.', 'Two percent of them, so twenty people, are sick.'],
      cues: [Q(async F => { F.hide(F.s.q); dotSnap(F, 1); await F.show(F.s.root); }), Q(async F => { dotSnap(F, 2); await F.wait(400); })] },
    { title: 'Sick and positive', say: ['The test finds ninety percent of the sick: eighteen of the twenty test positive.', 'Two sick people are missed.'],
      cues: [Q(async F => { dotSnap(F, 3); F.show(F.s.trNeg[0]); }), Q(async F => { dotSnap(F, 3); F.show(F.s.trNeg[0]); await F.pulse(F.s.trNeg[0], 1); })] },
    { title: 'False alarms', say: ['Now the nine hundred and eighty healthy people. Five percent of them get a false alarm.', 'That is forty nine people: more than the eighteen who are really sick.'],
      cues: [Q(async F => { dotSnap(F, 4); F.show(F.s.trNeg[0]); F.show(F.s.trNeg[1]); }), Q(async F => { dotSnap(F, 4); F.show(F.s.trNeg[0]); F.show(F.s.trNeg[1]); await F.pulse(F.s.tr[6], 2); })] },
    { title: 'The answer', say: ['So sixty seven people test positive, but only eighteen of them are sick.', 'Eighteen out of sixty seven is about twenty seven percent, not ninety. When a disease is rare, many alarms are false. This is Bayes rule.'],
      cues: [Q(async F => { dotSnap(F, 5); F.s.trNeg.forEach(b => F.to(b, { opacity: .35 }, 300)); }), Q(async F => { dotSnap(F, 5); F.s.trNeg.forEach(b => F.to(b, { opacity: .35 }, 300)); await F.pulse(F.s.res, 2); })] }
  ]
};

/* ================= scene 5: a small Bayesian network (alarm example, numbers from Russell and Norvig) =================
   P(B)=0.001, P(E)=0.002, P(A|B,E)=0.95, P(A|B,¬E)=0.94, P(A|¬B,E)=0.29, P(A|¬B,¬E)=0.001.
   Enumeration (checked in Python): P(A)=0.002516, P(B|A)=0.3736, P(E|A)=0.2310, P(B|A,E)=0.00327. */
const BN = { B0: 0.001, E0: 0.002, BA: 0.37355, EA: 0.23101, BAE: 0.0032684 };
const sceneBN = {
  id: 'bnet', title: 'A Bayesian network and explaining away', w: 720, h: 400,
  build(F) {
    K.title(F, 'Burglary, earthquake, alarm', 'arrows go from causes to effects · each node keeps a small table');
    F.arrow(205, 128, 320, 212, { color: 'var(--c-node-line)', w: 2.6 }); F.arrow(515, 128, 400, 212, { color: 'var(--c-node-line)', w: 2.6 });
    F.s.B = F.box(170, 104, 150, 48, 'Burglary', { size: 15, weight: 800, rx: 24 }); F.s.E = F.box(550, 104, 150, 48, 'Earthquake', { size: 15, weight: 800, rx: 24 }); F.s.A = F.box(360, 236, 150, 48, 'Alarm', { size: 15, weight: 800, rx: 24 });
    F.s.pB = F.text(170, 146, 'P = 0.001', { size: 12, mono: true, weight: 700, cls: 'soft' }); F.s.pE = F.text(550, 146, 'P = 0.002', { size: 12, mono: true, weight: 700, cls: 'soft' });
    F.s.cpt = F.g({}); F.s.cpt.style.opacity = 0;
    F.rect(250, 274, 220, 112, { rx: 9, fill: 'var(--card)', stroke: 'var(--line)' }, F.s.cpt);
    F.text(360, 290, 'B   E   →  P(alarm)', { size: 12, mono: true, weight: 750 }, F.s.cpt);
    [['yes yes', '0.95'], ['yes no ', '0.94'], ['no  yes', '0.29'], ['no  no ', '0.001']].forEach(([a, p], i) => F.text(360, 312 + i * 19, a + '  →  ' + p, { size: 12, mono: true }, F.s.cpt));
    const belief = (x, col) => { const g = F.g({ transform: `translate(${x},178)` }); F.rect(-75, -8, 150, 16, { rx: 8, fill: 'var(--c-grid)' }, g); const r = F.rect(-75, -8, 0, 16, { rx: 8, fill: col }, g); const t = F.text(0, 22, '', { size: 13, weight: 800, mono: true, fill: col }, g); g.style.opacity = 0; return { g, r, t }; };
    F.s.bB = belief(170, 'var(--bad)'); F.s.bE = belief(550, 'var(--c-c)');
    F.s.setBel = (b, e) => { F.s.bB.r.setAttribute('width', 150 * b); F.setText(F.s.bB.t, 'burglary ' + pct(b, b < 0.01 ? 2 : 1), 0); F.s.bE.r.setAttribute('width', 150 * e); F.setText(F.s.bE.t, 'earthquake ' + pct(e, e < 0.01 ? 2 : 1), 0); };
    F.s.ring = K.chip(F, 522, 236, '🔔 the alarm rings', 'warn'); F.s.ring.style.opacity = 0;
    F.s.radio = K.chip(F, 550, 60, '📻 radio: earthquake!', 'warn'); F.s.radio.style.opacity = 0;
    F.s.away = K.callout(F, 600, 300, 'explaining away:\nthe earthquake explains\nthe alarm', { tone: 'ok', w: 200 });
  },
  steps: [
    { title: 'Causes and effects', say: ['A Bayesian network draws causes and effects as arrows. A burglary or an earthquake can set off the alarm.', 'Each node keeps a small table of probabilities, given its parents.'],
      cues: [Q(async F => { await F.pulse(F.s.A, 1); }), Q(async F => { await F.show(F.s.cpt); })] },
    { title: 'The numbers', say: ['A burglary is rare: one day in a thousand. An earthquake: two days in a thousand.', 'The alarm rings for ninety four percent of burglaries, twenty nine percent of earthquakes, and almost never by itself.'],
      cues: [Q(async F => { F.s.setBel(BN.B0, BN.E0); F.show(F.s.bB.g); await F.show(F.s.bE.g); }), Q(async F => { F.s.setBel(BN.B0, BN.E0); await blink(F, F.s.cpt, 1); })] },
    { title: 'Evidence: the alarm rings', say: ['Now the alarm rings. We add up every case in which the alarm rings, and see how much of it comes from a burglary.', 'The chance of a burglary jumps from zero point one percent to about thirty seven percent.'],
      cues: [Q(async F => { F.s.setBel(BN.B0, BN.E0); F.to(F.s.A.rect, { fill: 'var(--c-cur)', stroke: 'var(--c-c)' }, 300); await F.show(F.s.ring); }),
             Q(async F => { await tw(F, 1200, p => F.s.setBel(BN.B0 + (BN.BA - BN.B0) * p, BN.E0 + (BN.EA - BN.E0) * p)); })] },
    { title: 'Explaining away', say: ['Then the radio reports an earthquake. The earthquake already explains the alarm.', 'So the chance of a burglary falls to about zero point three percent. This is called explaining away.'],
      cues: [Q(async F => { F.s.setBel(BN.BA, BN.EA); F.to(F.s.E.rect, { fill: 'var(--c-cur)', stroke: 'var(--c-c)' }, 300); await F.show(F.s.radio); await tw(F, 600, p => F.s.setBel(BN.BA, BN.EA + (1 - BN.EA) * p)); }),
             Q(async F => { await tw(F, 1200, p => F.s.setBel(BN.BA + (BN.BAE - BN.BA) * p, 1)); await F.show(F.s.away); })] }
  ]
};

/* ================= exercises ================= */
const exEuler = {
  title: 'One step of a leaky integrate-and-fire neuron', random: true,
  gen(r) {
    let V, RI; do { V = r.pick([-70, -66, -64, -62, -60, -58]); RI = r.pick([10, 15, 20, 25, 30]); } while (RI === V + 70);
    const dt = r.pick([0.5, 1, 2]), tau = r.pick([5, 10, 20]);
    const dv = dt / tau * (-(V + 70) + RI), Vn = V + dv, spike = Vn >= -54;
    return {
      prompt: `A neuron follows $\\tau \\dfrac{dV}{dt} = -(V - V_{rest}) + RI$ with $V_{rest} = -70$ mV, threshold $-54$ mV, $\\tau = ${tau}$ ms and input $RI = ${RI}$ mV. Now $V = ${V}$ mV. Take <b>one Euler step</b> of $\\Delta t = ${dt}$ ms: what is the new $V$ in mV? (two decimals)`,
      hint: 'New V = V + (Δt / τ) × ( −(V − (−70)) + RI ). Work out the bracket first.',
      answer: `Bracket: $-(${V} + 70) + ${RI} = ${-(V + 70) + RI}$. Step: $${dt}/${tau} \\times ${-(V + 70) + RI} = ${+dv.toFixed(4)}$. New $V = ${V} + ${+dv.toFixed(4)} = $ <b>${Vn.toFixed(2)}</b> mV. ${spike ? 'This reaches the threshold, so the neuron spikes and is reset to −70.' : 'Still below −54, so no spike yet.'} (Without spikes the voltage would settle at −70 + ${RI} = ${-70 + RI} mV${-70 + RI > -54 ? ', above the threshold, so it will fire.' : ', not above the threshold, so it never fires.'})`,
      check: { type: 'number', answer: Math.round(Vn * 100) / 100, tol: 0.011 }
    };
  }
};
const exHebb = {
  title: 'Apply the Hebbian rule twice', random: true,
  gen(r) {
    const w0 = r.pick([0.1, 0.2, 0.3, 0.5]), eta = r.pick([0.1, 0.2, 0.5]);
    const P = [[1, 1], [1, 0], [0, 1], [1, 0.5], [0.5, 1], [0, 0]], a = r.pick(P), b = r.pick(P);
    const w1 = w0 + eta * a[0] * a[1], w2 = w1 + eta * b[0] * b[1];
    return {
      prompt: `A link starts with weight $w = ${w0}$. The Hebbian rule is $\\Delta w = \\eta \\cdot x_A \\cdot x_B$ with learning rate $\\eta = ${eta}$. Two moments happen: first $x_A = ${a[0]}, x_B = ${a[1]}$, then $x_A = ${b[0]}, x_B = ${b[1]}$. What is $w$ after both?`,
      hint: 'Multiply the rate by the two activities for each moment, and add the changes to the weight.',
      answer: `First: $${w0} + ${eta} \\cdot ${a[0]} \\cdot ${a[1]} = ${+w1.toFixed(4)}$. Second: $${+w1.toFixed(4)} + ${eta} \\cdot ${b[0]} \\cdot ${b[1]} = $ <b>${+w2.toFixed(4)}</b>. When one of the two cells is silent (activity 0), the weight does not change.`,
      check: { type: 'number', answer: Math.round(w2 * 10000) / 10000, tol: 0.001 }
    };
  }
};
const exBayes = {
  title: 'Natural frequencies: what does a positive test mean?', random: true,
  gen(r) {
    const N = 10000, p = r.pick([1, 2, 5, 10]), se = r.pick([80, 90, 95]), fpr = r.pick([2, 5, 10]);
    const sick = N * p / 100, tp = sick * se / 100, healthy = N - sick, fp = healthy * fpr / 100, post = 100 * tp / (tp + fp);
    return {
      prompt: `A disease affects <b>${p}%</b> of people. A test finds <b>${se}%</b> of sick people (sensitivity) and gives a false alarm to <b>${fpr}%</b> of healthy people. Picture ${N.toLocaleString('en-US')} people. Among those who test positive, what <b>percentage</b> is really sick? (one decimal)`,
      hint: 'Count: sick people, then sick and positive. Healthy people, then healthy but positive. Answer = sick and positive ÷ all positive.',
      answer: `Sick: ${sick}; of these ${tp} test positive. Healthy: ${healthy}; of these ${fp} get a false alarm. Positive tests: ${tp} + ${fp} = ${tp + fp}. So ${tp} / ${tp + fp} = <b>${post.toFixed(1)}%</b>. Bayes rule gives the same: $\\frac{${p / 100} \\cdot ${se / 100}}{${p / 100} \\cdot ${se / 100} + ${(100 - p) / 100} \\cdot ${fpr / 100}}$.`,
      check: { type: 'number', answer: Math.round(post * 10) / 10, tol: 0.11 }
    };
  }
};
const exFuzzy = {
  title: 'How warm is it? A fuzzy membership', random: true,
  gen(r) {
    const a = r.pick([16, 18, 20]), b = a + r.pick([8, 10]), t = r.int(a - 2, b + 2);
    const m = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return {
      prompt: `The fuzzy set <b>warm</b> has membership 0 at ${a} °C or colder, 1 at ${b} °C or warmer, and rises in a straight line in between. What is the membership of <b>${t} °C</b> in <i>warm</i>? (two decimals)`,
      hint: 'Inside the ramp: (temperature − start) ÷ (end − start). Outside the ramp it is 0 or 1.',
      answer: t <= a ? `${t} °C is at or below ${a} °C, so the membership is <b>0</b>.` : t >= b ? `${t} °C is at or above ${b} °C, so the membership is <b>1</b>.` : `(${t} − ${a}) / (${b} − ${a}) = ${t - a}/${b - a} = <b>${m.toFixed(2)}</b>: ${t} °C is warm "to degree" ${m.toFixed(2)}.`,
      check: { type: 'number', answer: Math.round(m * 100) / 100, tol: 0.011 }
    };
  }
};

Course.lecture({
  id: 'w14', num: 14, week: 14, kind: 'lecture', title: 'Brain-inspired AI and reasoning with uncertainty',
  lede: 'Real neurons spike, leak, compete and strengthen their links when they fire together. And real decisions are made without certainty. This week: the brain ideas behind AI, stated carefully, and the mathematics of belief: Bayes rule and Bayesian networks.',
  clos: [3], widgets: ['lif', 'bayes'],
  goals: ['explain a <b>leaky integrate-and-fire</b> neuron: integrate, leak, threshold, spike, reset',
    'describe <b>lateral inhibition</b> and <b>winner-take-all</b>, and the <b>Hebbian</b> rule, and relate them to max pooling, sparse codes and dropout',
    'say honestly where brain ideas inspired AI, and where today\'s AI works differently',
    'use <b>natural frequencies</b> and <b>Bayes rule</b> to turn a test result into a probability',
    'read a small <b>Bayesian network</b> and explain <b>explaining away</b>; tell fuzzy degrees of truth from probability'],
  chapters: [
    { id: 'idea', title: 'Inspired by the brain, not a copy', blocks: [
      { html: '<p>Artificial neural networks borrowed a few ideas from the brain: many simple units, weighted connections, and learning by changing those weights. But an artificial unit is a <b>very</b> simplified model. A real neuron is a living cell with complex chemistry and timing, and we still do not know exactly how the brain learns. So in this lecture, read every brain idea as <b>inspiration</b>, not as a description of how ChatGPT or a CNN works.</p>' },
      { note: '<b>An honest comparison of energy.</b> The human brain runs on roughly 20 watts, about the power of a small light bulb. A single large data-centre GPU uses several hundred watts, and training a large model uses thousands of GPUs for weeks. The comparison is not exact (they do different jobs), but it is one reason researchers study spiking, event-driven "neuromorphic" chips: they only use energy when a spike happens.' }
    ] },
    { id: 'spike', title: 'Spiking neurons', blocks: [
      { html: '<p>A real neuron does not output a smooth number like a ReLU unit. Its voltage slowly charges, and when it crosses a <b>threshold</b> it fires a short pulse called a <b>spike</b>, then resets. The simplest model of this is the <b>leaky integrate-and-fire</b> (LIF) neuron: $\\tau \\frac{dV}{dt} = -(V - V_{rest}) + R I$.</p>' },
      { scene: sceneLIF },
      { widget: 'lif', opts: { mode: 'single' } },
      { note: '<b>Try this.</b> (1) Find the smallest input that makes the neuron fire. Compare with the rule "fires only if $V_{rest} + RI$ is above the threshold". (2) Double the input: does the firing rate double? (3) Make the leak slower (larger τ): what happens to the weak input?' },
      { exercise: exEuler },
      { quiz: { q: 'A leaky integrate-and-fire neuron rests at −70 mV and has a threshold of −54 mV. The constant input is R·I = 15 mV. What happens?', options: ['It fires regularly', 'It fires once and stops', 'It never fires: the voltage settles at −55 mV, just below the threshold', 'The voltage grows without limit'], correct: 2, why: 'Without spikes, the voltage settles where leak and input balance: −70 + 15 = −55 mV. That is below −54, so the leak always wins. The input must be more than 16 mV to make it fire.' } }
    ] },
    { id: 'compete', title: 'Neurons that compete', blocks: [
      { html: '<p>Neighbouring neurons often <b>inhibit</b> each other: when one is active, it pushes the others down. This is called <b>lateral inhibition</b>. It sharpens differences and, when strong, lets only one winner stay active.</p>' },
      { scene: sceneWTA },
      { widget: 'lif', opts: { mode: 'wta' } },
      { note: '<b>Echoes in deep learning (inspiration, not copies).</b> <b>Max pooling</b> keeps the strongest response in a window, a hard winner-take-all. <b>Softmax</b> with a high sharpness gives most of the weight to one winner. <b>Sparse activity</b> (only a few units active) is common in the brain and saves energy. <b>Dropout</b> (week 7) randomly silences units in training; this loosely echoes the brain\'s noisy, unreliable synapses and forces the network not to depend on any single unit.' },
      { quiz: { q: 'Two neurons inhibit each other strongly. Their inputs are 1.0 and 0.9. After a while, what do you expect?', options: ['Both settle at the same value', 'The neuron with input 1.0 stays active and the other one goes silent', 'Both go silent', 'They swap roles forever'], correct: 1, why: 'With strong mutual inhibition the network becomes winner-take-all: the slightly stronger input wins and silences the other, even though the inputs were close.' } }
    ] },
    { id: 'hebb', title: 'Hebbian learning', blocks: [
      { scene: sceneHebb },
      { exercise: exHebb },
      { deeper: { title: 'Does the brain use backpropagation?', html: '<p>Backpropagation (week 6) sends exact error signals backwards through the same weights that were used going forward. Real neurons send signals mainly in one direction, and no one has found an exact copy of backpropagation in the brain. Researchers study <b>brain-friendly approximations</b>, for example <i>feedback alignment</i> (the backward pass uses random fixed weights) and <i>predictive coding</i> (each layer predicts the activity of the one below and learns from its local error). These are active research topics; the honest answer today is: <b>we do not know</b> how close the brain is to backpropagation.</p>' } }
    ] },
    { id: 'bayes', title: 'Reasoning with uncertainty: Bayes rule', blocks: [
      { html: '<p>An agent never knows everything: sensors are noisy, tests make mistakes, people behave in surprising ways. <b>Probability</b> gives a number to a <b>degree of belief</b>, from 0 (sure it is false) to 1 (sure it is true). <b>Bayes rule</b> says how to update a belief when new evidence arrives:</p><p>$$P(\\text{sick} \\mid +) = \\frac{P(+ \\mid \\text{sick})\\,P(\\text{sick})}{P(+)}$$</p><p>The easiest way to use it is with <b>natural frequencies</b>: imagine a concrete number of people and count.</p>' },
      { scene: sceneBayes },
      { exercise: exBayes },
      { widget: 'bayes' },
      { note: '<b>Why uncertainty matters for AI.</b> A self-driving car must act although it is not sure what the shape ahead is. A medical AI should say "70% likely", not only "yes". A spam filter (naive Bayes) multiplies many small pieces of evidence. And a language model\'s next-word output is a probability distribution. Good AI systems know <i>how sure</i> they are.' }
    ] },
    { id: 'bn', title: 'Bayesian networks', blocks: [
      { html: '<p>With many variables, one huge table of all combinations is impossible. A <b>Bayesian network</b> is a graph: arrows go from causes to effects, and each node keeps only a small table given its parents. The full probability of a situation is the product of these small tables.</p>' },
      { scene: sceneBN },
      { quiz: { q: 'The alarm rings, and then you learn that there was an earthquake. What happens to the probability of a burglary?', options: ['It goes up further', 'It goes down, because the earthquake already explains the alarm', 'It stays exactly the same', 'It becomes zero'], correct: 1, why: 'Both causes compete to explain the same effect. Once one cause is confirmed, the other becomes less needed: P(burglary | alarm) ≈ 0.37 but P(burglary | alarm, earthquake) ≈ 0.003. It does not become zero: both could happen.' } }
    ] },
    { id: 'fuzzy', title: 'Fuzzy thinking (short introduction)', blocks: [
      { html: '<p>Some words are <b>vague</b>, not uncertain. Is 24 °C "warm"? In a normal (crisp) set the answer is yes or no. In a <b>fuzzy set</b> (Zadeh, 1965) membership is a degree between 0 and 1: 24 °C might be warm to degree 0.6. Fuzzy rules then combine degrees: a common choice is <b>AND = minimum</b> and <b>OR = maximum</b>. Fuzzy control is used in washing machines, air conditioners and train brakes.</p><p><b>Do not mix them up.</b> Probability: the fact is crisp, but we are unsure (will it rain tomorrow?). Fuzziness: we know the fact, but the word is vague (24 °C is "somewhat warm").</p>' },
      { exercise: exFuzzy },
      { quiz: { q: 'Warm(24 °C) = 0.6 and humid = 0.3. With the usual fuzzy rules, what is "warm AND humid"?', options: ['0.18 (the product)', '0.3 (the minimum)', '0.6 (the maximum)', '0.9 (the sum)'], correct: 1, why: 'The standard fuzzy AND takes the minimum of the two degrees: min(0.6, 0.3) = 0.3. OR would take the maximum, 0.6.' } }
    ] }
  ]
});
})();

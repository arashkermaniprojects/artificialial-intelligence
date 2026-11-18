(function () {
const K = Course.kit;

/* ---------- helpers (own file) ---------- */
function tw(F, ms, fn) {
  if (F.instant || ms <= 0) { fn(1); return Promise.resolve(); }
  const tk = F.token, t0 = performance.now(), ez = (Course.ease && Course.ease.io) || (t => t);
  return new Promise(res => { const f = now => { if (tk !== F.token) return; const p = Math.min(1, (now - t0) / ms); fn(ez(p)); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
}
function spark(F, x1, y1, x2, y2, color, ms, parent) {
  if (F.instant) return Promise.resolve();
  const c = F.circle(x1, y1, 6, { fill: color || 'var(--c-b)', stroke: 'var(--fig-bg)', 'stroke-width': 1.5, filter: 'url(#fx-glow)' }, parent);
  return tw(F, ms || 600, p => { c.setAttribute('cx', x1 + (x2 - x1) * p); c.setAttribute('cy', y1 + (y2 - y1) * p); }).then(() => c.remove());
}
async function blink(F, el, n = 1) { if (F.instant) return; for (let i = 0; i < n; i++) { await F.to(el, { opacity: 0.3 }, 220); await F.to(el, { opacity: 1 }, 260); } }
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);

/* ---------- scene 1: why order matters ---------- */
const sceneOrder = {
  id: 'order', title: 'Why order matters', w: 720, h: 360,
  build(F) {
    K.title(F, 'Same words, different meaning', 'a model that ignores order cannot tell these apart');
    const mk = (words, y, tone) => words.map((w, i) => { const b = F.box(150 + i * 130, y, 110, 40, w, { fill: tone, size: 16, weight: 750 }); b.style.opacity = 0; return b; });
    F.s.A = mk(['dog', 'bites', 'man'], 100, 'var(--c-open)');
    F.s.B = mk(['man', 'bites', 'dog'], 170, 'var(--c-cur)');
    F.s.mA = F.text(560, 100, 'not news', { size: 13, weight: 700, cls: 'soft', anchor: 'start' }); F.s.mA.style.opacity = 0;
    F.s.mB = F.text(560, 170, 'big news!', { size: 13, weight: 700, fill: 'var(--c-c)', anchor: 'start' }); F.s.mB.style.opacity = 0;
    F.s.bag = F.g({}); F.s.bag.style.opacity = 0;
    F.rect(90, 222, 420, 66, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' }, F.s.bag);
    F.text(300, 240, 'word counts (a "bag of words")', { size: 12, cls: 'soft' }, F.s.bag);
    F.text(300, 266, 'dog: 1    bites: 1    man: 1', { size: 15, weight: 700, cls: 'mono' }, F.s.bag);
    F.s.same = K.callout(F, 610, 255, 'identical for\nboth sentences', { tone: 'bad', w: 150 });
    F.s.len = F.text(300, 300, 'a sentence can have 3 words, or 300', { size: 13, weight: 700, fill: 'var(--accent2)' }); F.s.len.style.opacity = 0;
    F.s.read = K.callout(F, 360, 330, 'read one word at a time, and remember what came before', { tone: 'ok', w: 470 });
  },
  steps: [
    { title: 'Two sentences', say: ['Dog bites man is ordinary. Man bites dog is news.', 'The two sentences use exactly the same three words.'],
      cues: [async F => { for (const b of F.s.A) await F.show(b, 250); await F.show(F.s.mA); for (const b of F.s.B) await F.show(b, 250); await F.show(F.s.mB); },
             async F => { await F.all([[F.s.A[0], { tx: 410 }, 700], [F.s.A[2], { tx: 150 }, 700]]); await F.all([[F.s.A[0], { tx: 150 }, 700], [F.s.A[2], { tx: 410 }, 700]]); }] },
    { title: 'Counting is not enough', say: ['If we only count the words, both sentences look identical.', 'All the meaning is in the order.'],
      cues: [async F => { await F.show(F.s.bag); await F.show(F.s.same); }, async F => { await F.pulse(F.s.B[0], 1); await F.pulse(F.s.B[2], 1); }] },
    { title: 'Lengths change', say: ['Sentences, sounds and prices come in every length.', 'A normal network wants a fixed number of inputs, so it does not fit well.'],
      cues: [async F => { await F.hide(F.s.same); await F.show(F.s.len); }, async F => { await blink(F, F.s.len, 2); }] },
    { title: 'The idea', say: ['We need a network that reads one item at a time, and carries a memory of what came before.', 'That is a recurrent network.'],
      cues: [async F => { await F.show(F.s.read); }, async F => { for (const b of F.s.B) { await F.pulse(b, 1); } }] }
  ]
};

/* ---------- scene 2: the recurrent cell, unrolled (values verified: 0.7616, 0.5436, 0.4094, 0.3163) ---------- */
const WREC = 0.8, UIN = 1, XS = [1, 0, 0, 0];
const HS = (() => { let h = 0; return XS.map(x => (h = Math.tanh(WREC * h + UIN * x))); })();
const UX = [340, 480, 620, 760];
const sceneUnroll = {
  id: 'unroll', title: 'A recurrent network, unrolled in time', w: 900, h: 400, wide: true,
  build(F) {
    K.title(F, 'One cell, used again at every step', 'new state = tanh( w × old state + u × input ) · here w = 0.8 and u = 1');
    F.s.fold = F.g({});
    F.s.cellBox = F.box(120, 200, 90, 70, 'RNN\ncell', { fill: 'var(--c-open)', stroke: 'var(--c-b)', size: 15, weight: 750 }, F.s.fold);
    F.s.loop = F.path('M150,166 C190,110 50,110 92,166', { stroke: 'var(--c-b)', 'stroke-width': 3, 'marker-end': F.arrowMarker('var(--c-b)') }, F.s.fold);
    F.arrow(120, 300, 120, 240, { color: 'var(--c-node-line)' }, F.s.fold); F.text(120, 315, 'input', { size: 12, cls: 'soft' }, F.s.fold);
    F.text(120, 108, 'loop = memory', { size: 12, weight: 700, fill: 'var(--c-b)' }, F.s.fold);
    F.s.eq = F.text(215, 200, '=', { size: 30, weight: 800, cls: 'soft' }); F.s.eq.style.opacity = 0;
    F.s.cells = UX.map((x, t) => {
      const g = F.g({}); g.style.opacity = 0;
      const b = F.box(x, 200, 84, 64, 'cell', { fill: 'var(--c-open)', stroke: 'var(--c-b)', size: 14, weight: 700 }, g);
      F.arrow(x, 300, x, 236, { color: 'var(--c-node-line)' }, g);
      const xi = F.box(x, 322, 44, 30, String(XS[t]), { fill: 'var(--c-start)', size: 15, weight: 800, mono: true }, g);
      F.text(x, 350, 'x' + (t + 1), { size: 12, cls: 'soft' }, g);
      const ht = F.text(x, 140, '', { size: 18, weight: 800, cls: 'mono', fill: 'var(--c-b)' }, g);
      F.text(x, 118, 'h' + (t + 1), { size: 12, cls: 'soft' }, g);
      const ar = t < 3 ? F.arrow(x + 44, 200, UX[t + 1] - 46, 200, { color: 'var(--c-b)', w: 3 }, g) : null;
      return { g, b, xi, ht, ar };
    });
    F.s.same = K.callout(F, 550, 70, 'same weights w and u in every copy', { tone: 'accent', w: 290 });
    F.s.calc = K.callout(F, 550, 380, 'h1 = tanh(0.8 × 0 + 1 × 1) = tanh(1) = 0.76', { tone: 'ok', w: 380 });
    F.s.fade = K.callout(F, 550, 380, 'the first input echoes, but fades: 0.76 → 0.54 → 0.41 → 0.32', { tone: 'warn', w: 470 });
  },
  steps: [
    { title: 'A cell with a loop', say: ['A recurrent network has one cell that reads the sequence one item at a time.', 'The loop means that its output goes back in, as an extra input, at the next step.'],
      cues: [async F => { await F.pulse(F.s.cellBox, 1); }, async F => { F.s.loop.style.opacity = 0; await F.draw(F.s.loop, 900); }] },
    { title: 'Unroll the loop', say: ['To see it clearly, we unroll the loop in time. Every copy is the same cell, with the same weights.', 'What passes from copy to copy is the hidden state, a small memory.'],
      cues: [async F => { await F.show(F.s.eq); for (const c of F.s.cells) await F.show(c.g, 300); await F.show(F.s.same); },
             async F => { for (const c of F.s.cells) if (c.ar) { F.to(c.ar, { 'stroke-width': 5 }, 300); } await F.wait(400); }] },
    { title: 'The first step', say: ['The new state is the tanh of the recurrent weight times the old state, plus the input weight times the input.', 'The first input is one and the old state is zero, so the first state is about zero point seven six.'],
      cues: [async F => { await F.hide(F.s.same); await F.pulse(F.s.cells[0].xi, 1); },
             async F => { await spark(F, UX[0], 300, UX[0], 236, 'var(--c-a)', 500); await F.show(F.s.calc); F.setText(F.s.cells[0].ht, f2(HS[0]), UX[0]); await F.pulse(F.s.cells[0].b, 1); }] },
    { title: 'Memory carries on', say: ['After that the inputs are zero, but the memory carries on: zero point five four, then zero point four one, then zero point three two.', 'The first input still echoes, but it fades a little at every step.'],
      cues: [async F => { await F.hide(F.s.calc); for (let t = 1; t < 4; t++) { await spark(F, UX[t - 1] + 44, 200, UX[t] - 44, 200, 'var(--c-b)', 450); F.setText(F.s.cells[t].ht, f2(HS[t]), UX[t]); F.to(F.s.cells[t].b.rect, { opacity: 0.55 + 0.45 * HS[t] / HS[0] }, 300); } },
             async F => { await F.show(F.s.fade); }] }
  ]
};

/* ---------- scene 3: vanishing and exploding gradient (0.5^9 = 0.00195, 1.5^9 = 38.4) ---------- */
const NT = 10, VX0 = 70, VDX = 62;
const sceneVanish = {
  id: 'vanish', title: 'The vanishing gradient', w: 720, h: 400,
  build(F) {
    K.title(F, 'The learning signal travels back in time', 'each step back multiplies it by (recurrent weight × slope of tanh)');
    F.s.steps = []; for (let t = 1; t <= NT; t++) { const x = VX0 + (t - 1) * VDX; F.s.steps.push(F.box(x, 90, 46, 34, 't' + t, { fill: 'var(--c-node)', size: 12.5, weight: 700 })); }
    F.s.loss = F.box(VX0 + NT * VDX - 10, 90, 54, 34, 'error', { fill: 'var(--c-goal)', size: 12, weight: 750 });
    F.line(40, 330, 680, 330, { stroke: 'var(--c-soft)', 'stroke-width': 1.5 });
    F.s.bars = []; for (let t = 1; t <= NT; t++) { const x = VX0 + (t - 1) * VDX; const r = F.rect(x - 16, 330, 32, 0, { rx: 5, fill: 'var(--c-b)' }); const v = F.text(x, 320, '', { size: 11, weight: 700, cls: 'mono' }); F.s.bars.push({ r, v, x }); }
    F.s.cur = new Array(NT).fill(0); F.s.max = 1;
    F.s.setBars = (vals, mx, ms) => { const from = F.s.cur.slice(), m0 = F.s.max; F.s.cur = vals.slice(); F.s.max = mx;
      vals.forEach((v, i) => { const b = F.s.bars[i]; F.setText(b.v, v === 0 ? '' : (v >= 10 ? v.toFixed(1) : v >= 0.01 ? (Math.round(v * 1000) / 1000).toString() : v.toFixed(4)), b.x); });
      return tw(F, ms, p => vals.forEach((v, i) => { const b = F.s.bars[i], cur = from[i] / m0 * (1 - p) + v / mx * p, hh = Math.max(0, Math.min(1.08, cur)) * 170; b.r.setAttribute('y', 330 - hh); b.r.setAttribute('height', hh); b.v.setAttribute('y', 322 - hh); })); };
    F.s.back = F.arrow(640, 140, 90, 140, { color: 'var(--c-c)', w: 3, dash: '8 5' }); F.s.back.style.opacity = 0;
    F.s.backT = F.text(365, 156, 'gradient flows backwards', { size: 12, weight: 700, fill: 'var(--c-c)' }); F.s.backT.style.opacity = 0;
    F.s.v1 = K.callout(F, 360, 372, 'factor 0.5: only 0.002 is left at t1 · vanishing gradient', { tone: 'bad', w: 450 });
    F.s.v2 = K.callout(F, 360, 372, 'factor 1.5: about 38 times larger at t1 · exploding gradient', { tone: 'warn', w: 470 });
    F.s.clip = F.line(40, 330 - 0.2 * 170, 680, 330 - 0.2 * 170, { stroke: 'var(--ok)', 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }); F.s.clip.style.opacity = 0;
    F.s.v3 = K.callout(F, 360, 372, 'clipping caps an exploding gradient · vanishing needs a new cell: the LSTM', { tone: 'ok', w: 560 });
  },
  steps: [
    { title: 'Learning runs backwards', say: ['The gradient tells each weight how to change. It starts at the error and flows backwards in time.', 'At every step back, it is multiplied by the recurrent weight times the slope of tanh.'],
      cues: [async F => { await F.pulse(F.s.loss, 1); await F.s.setBars([0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 1, 500); }, async F => { await F.show(F.s.back); await F.show(F.s.backT); }] },
    { title: 'Halving at every step', say: ['If that factor is one half, the signal halves at every step: one half, one quarter, one eighth.', 'By the first step only about two thousandths is left, so early inputs can hardly teach the network. This is the vanishing gradient.'],
      cues: [async F => { const v = new Array(NT).fill(0); for (let k = 0; k < NT; k++) { v[NT - 1 - k] = Math.pow(0.5, k); await F.s.setBars(v, 1, 220); } },
             async F => { await F.show(F.s.v1); await F.to(F.s.steps[0].rect, { fill: 'var(--bad-bg)', stroke: 'var(--bad)' }, 400); }] },
    { title: 'Or growing at every step', say: ['If the factor is above one, say one and a half, the signal grows instead.', 'By the first step it is about thirty eight times larger, and training jumps wildly. This is the exploding gradient.'],
      cues: [async F => { await F.hide(F.s.v1); await F.to(F.s.steps[0].rect, { fill: 'var(--c-node)', stroke: 'var(--c-node-line)' }, 200); const v = []; for (let t = 1; t <= NT; t++) v.push(Math.pow(1.5, NT - t)); await F.s.setBars(v, Math.pow(1.5, 9), 1200); },
             async F => { await F.show(F.s.v2); }] },
    { title: 'Two different cures', say: ['Exploding gradients are easy to fix: we clip them to a maximum size.', 'Vanishing gradients are harder. They need a new design of the cell, the LSTM.'],
      cues: [async F => { await F.hide(F.s.v2); await F.show(F.s.clip); const v = []; for (let t = 1; t <= NT; t++) v.push(Math.min(Math.pow(1.5, NT - t), 0.2 * Math.pow(1.5, 9))); await F.s.setBars(v, Math.pow(1.5, 9), 800); },
             async F => { await F.show(F.s.v3); }] }
  ]
};

/* ---------- scene 4: LSTM gates as valves (c = 0.9 × 2 + 0.5 × 0.8 = 2.2; h = 0.6 × tanh 2.2 = 0.585) ---------- */
function valve(F, x, y, name, color) {
  const g = F.g({ transform: `translate(${x},${y})` }); g.__t = { x, y, s: 1, r: 0 }; g.style.opacity = 0;
  F.circle(0, 0, 26, { fill: 'var(--card)', stroke: color, 'stroke-width': 3 }, g);
  const cp = F.el('clipPath', { id: 'w09v-' + name.replace(/\W/g, '') }, F.defs); F.circle(0, 0, 24, {}, cp);
  const lvl = F.rect(-26, 26, 52, 0, { fill: color, opacity: 0.45, 'clip-path': `url(#w09v-${name.replace(/\W/g, '')})` }, g);
  const t = F.text(0, 1, '', { size: 14, weight: 800, cls: 'mono' }, g);
  F.text(0, 42, name, { size: 12, weight: 700, fill: color }, g);
  g.set = (v, ms) => { F.setText(t, v.toFixed(1), 0); return F.to(lvl, { y: 24 - 48 * v, height: 48 * v }, ms); };
  return g;
}
const sceneLSTM = {
  id: 'lstm', title: 'LSTM: a memory belt with three valves', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'Long short-term memory (LSTM) cell', 'gates are valves between 0 (closed) and 1 (open), computed from the input and the last hidden state');
    F.rect(150, 70, 640, 280, { rx: 18, fill: 'var(--card)', stroke: 'var(--line)', 'stroke-width': 1.4 });
    F.s.belt = F.path('M40,110 L860,110', { stroke: 'var(--c-c)', 'stroke-width': 7, 'stroke-linecap': 'round' }); F.s.belt.style.opacity = 0;
    F.s.beltT = F.text(470, 92, 'cell state c (long-term memory)', { size: 12.5, weight: 700, fill: 'var(--c-c)' }); F.s.beltT.style.opacity = 0;
    F.s.cin = F.box(70, 150, 74, 34, 'c = 2.0', { fill: 'var(--c-cur)', size: 13, weight: 750, mono: true }); F.s.cin.style.opacity = 0;
    F.s.ops = [['×', 300], ['+', 520]].map(([o, x]) => { const b = F.box(x, 110, 34, 34, o, { fill: 'var(--fig-bg)', stroke: 'var(--c-c)', size: 18, weight: 800, rx: 17 }); b.style.opacity = 0; return b; });
    F.s.fg = valve(F, 300, 210, 'forget gate', 'var(--c-a)');
    F.s.ig = valve(F, 460, 250, 'input gate', 'var(--c-b)');
    F.s.og = valve(F, 700, 250, 'output gate', 'var(--c-d)');
    F.s.cand = F.box(580, 250, 84, 34, 'new 0.8', { fill: 'var(--c-open)', size: 13, weight: 700, mono: true }); F.s.cand.style.opacity = 0;
    F.s.wires = F.g({}); F.s.wires.style.opacity = 0;
    F.arrow(300, 184, 300, 130, { color: 'var(--c-a)', w: 2.2 }, F.s.wires);
    F.arrow(486, 240, 505, 128, { color: 'var(--c-b)', w: 2.2 }, F.s.wires);
    F.arrow(580, 233, 535, 128, { color: 'var(--c-b)', w: 2.2 }, F.s.wires);
    F.arrow(700, 110, 700, 222, { color: 'var(--c-d)', w: 2.2, dash: '5 4' }, F.s.wires);
    F.arrow(726, 250, 820, 250, { color: 'var(--c-d)', w: 2.2 }, F.s.wires);
    F.s.inputs = F.g({}); F.s.inputs.style.opacity = 0;
    F.rect(240, 318, 460, 26, { rx: 8, fill: 'var(--c-start)' }, F.s.inputs); F.text(470, 331, 'input x and last hidden state h decide every gate', { size: 12, weight: 700 }, F.s.inputs);
    F.s.cv = F.text(410, 140, '', { size: 14, weight: 800, cls: 'mono', fill: 'var(--c-c)' });
    F.s.cv2 = F.text(640, 140, '', { size: 14, weight: 800, cls: 'mono', fill: 'var(--c-c)' });
    F.s.h = F.box(850, 250, 70, 40, '', { fill: 'var(--c-open)', stroke: 'var(--c-b)', size: 14, weight: 800, mono: true }); F.s.h.style.opacity = 0;
    F.s.c1 = K.callout(F, 470, 388, 'keep: 0.9 × 2.0 = 1.8', { tone: 'ok', w: 220 });
    F.s.c2 = K.callout(F, 470, 388, 'write: 0.5 × 0.8 = 0.4   →   c = 1.8 + 0.4 = 2.2', { tone: 'accent', w: 400 });
    F.s.c3 = K.callout(F, 470, 388, 'show: h = 0.6 × tanh(2.2) = 0.6 × 0.98 ≈ 0.59', { tone: 'accent', w: 400 });
    F.s.c4 = K.callout(F, 470, 388, 'forget gate near 1 → memory and gradient flow along the belt almost unchanged', { tone: 'ok', w: 590 });
  },
  steps: [
    { title: 'A memory belt', say: ['An LSTM cell keeps two things: the hidden state, and a long-term memory called the cell state.', 'The cell state runs along the top like a conveyor belt, with only small changes at each step.'],
      cues: [async F => { await F.show(F.s.inputs); await F.show(F.s.cin); },
             async F => { await F.draw(F.s.belt, 900); await F.show(F.s.beltT); await spark(F, 40, 110, 860, 110, 'var(--c-c)', 1200); }] },
    { title: 'The forget gate', say: ['Three gates control the belt. Each is a valve between zero, closed, and one, open.', 'The forget gate decides how much old memory to keep. Here it is zero point nine, so two becomes one point eight.'],
      cues: [async F => { await F.show(F.s.ops[0]); await F.show(F.s.ops[1]); await F.show(F.s.fg); await F.show(F.s.ig); await F.show(F.s.og); await F.show(F.s.wires); },
             async F => { await F.s.fg.set(0.9, 700); F.setText(F.s.cv, '1.8', 410); await F.show(F.s.c1); await F.pulse(F.s.ops[0], 1); }] },
    { title: 'The input gate', say: ['The input gate decides how much new information to write. It lets in half of a new value of zero point eight, which adds zero point four.', 'The new cell state is two point two.'],
      cues: [async F => { await F.hide(F.s.c1); await F.show(F.s.cand); await F.s.ig.set(0.5, 700); await F.pulse(F.s.ops[1], 1); },
             async F => { F.setText(F.s.cv2, '2.2', 640); await F.show(F.s.c2); }] },
    { title: 'The output gate', say: ['The output gate decides how much memory to show: zero point six times the tanh of two point two gives about zero point five nine.', 'When the forget gate stays near one, memory and gradient pass along the belt almost unchanged. That is how the LSTM beats the vanishing gradient.'],
      cues: [async F => { await F.hide(F.s.c2); await F.s.og.set(0.6, 700); F.setText(F.s.h.label, 'h 0.59', 0); await F.show(F.s.h); await F.show(F.s.c3); },
             async F => { await F.hide(F.s.c3); await F.show(F.s.c4); await F.to(F.s.belt, { 'stroke-width': 11 }, 400); await spark(F, 40, 110, 860, 110, 'var(--c-c)', 1000); }] }
  ]
};

/* ---------- scene 5: word embeddings (toy 2D numbers; king − man + woman = (4.2, 3.3), nearest = queen at distance 0.14) ---------- */
const WORDS = { man: [1, 1], woman: [1.2, 3], boy: [0.4, 0.8], girl: [0.5, 2.9], king: [4, 1.3], queen: [4.3, 3.2], dog: [6, 1.5], cat: [6.4, 2.2], apple: [7.5, 6.5], orange: [8, 6] };
const exX = x => 70 + x * 62, eyY = y => 360 - y * 40;
const sceneEmbed = {
  id: 'embed', title: 'Word embeddings', w: 720, h: 400,
  build(F) {
    K.title(F, 'Words as points', 'a toy 2D picture; real embeddings have hundreds of numbers per word');
    F.rect(50, 60, 620, 310, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' });
    F.s.P = {}; for (const [w, [x, y]] of Object.entries(WORDS)) { const g = F.g({ transform: `translate(${exX(x)},${eyY(y)})` }); g.__t = { x: exX(x), y: eyY(y), s: 1, r: 0 }; g.style.opacity = 0;
      F.circle(0, 0, 6, { fill: 'var(--c-b)' }, g); F.text(0, -16, w, { size: 13.5, weight: 700 }, g); F.s.P[w] = g; }
    const A = (a, b, col) => { const [x1, y1] = WORDS[a], [x2, y2] = WORDS[b]; const ar = F.arrow(exX(x1), eyY(y1), exX(x2), eyY(y2), { color: col, w: 3 }); ar.style.opacity = 0; return ar; };
    F.s.a1 = A('man', 'woman', 'var(--c-a)'); F.s.a2 = A('king', 'queen', 'var(--c-a)');
    const R = [WORDS.king[0] - WORDS.man[0] + WORDS.woman[0], WORDS.king[1] - WORDS.man[1] + WORDS.woman[1]]; F.s.R = R;
    const mid = [WORDS.king[0] - WORDS.man[0], WORDS.king[1] - WORDS.man[1]];
    F.s.b1 = F.arrow(exX(WORDS.king[0]), eyY(WORDS.king[1]), exX(mid[0]), eyY(mid[1]), { color: 'var(--c-c)', w: 2.6, dash: '6 4' }); F.s.b1.style.opacity = 0;
    F.s.b2 = F.arrow(exX(mid[0]), eyY(mid[1]), exX(R[0]), eyY(R[1]), { color: 'var(--c-c)', w: 2.6, dash: '6 4' }); F.s.b2.style.opacity = 0;
    F.s.res = F.g({ transform: `translate(${exX(R[0])},${eyY(R[1])})` }); F.s.res.__t = { x: exX(R[0]), y: eyY(R[1]), s: 1, r: 0 }; F.s.res.style.opacity = 0;
    F.path('M-8,-8 L8,8 M8,-8 L-8,8', { stroke: 'var(--c-c)', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, F.s.res);
    F.s.ring = F.circle(exX(WORDS.queen[0]), eyY(WORDS.queen[1]), 20, { fill: 'none', stroke: 'var(--ok)', 'stroke-width': 3 }); F.s.ring.style.opacity = 0;
    F.s.clus = F.g({}); F.s.clus.style.opacity = 0;
    [['people', 2.3, 2, 2.7, 1.8], ['animals', 6.2, 1.85, 1.1, 0.9], ['fruit', 7.75, 6.25, 1, 0.8]].forEach(([t, x, y, rx, ry]) => { F.el('ellipse', { cx: exX(x), cy: eyY(y), rx: rx * 62, ry: ry * 40, fill: 'none', stroke: 'var(--c-soft)', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, F.s.clus); F.text(exX(x), eyY(y) + ry * 40 + 12, t, { size: 11.5, cls: 'soft' }, F.s.clus); });
    F.s.formula = K.callout(F, 470, 345, 'king − man + woman = (4.2, 3.3) → nearest word: queen', { tone: 'ok', w: 400 });
    F.s.cav = K.callout(F, 470, 345, 'skip the input words: the nearest is often king itself', { tone: 'warn', w: 400 });
    F.s.bias = K.callout(F, 300, 90, 'embeddings also learn the biases of their text', { tone: 'bad', w: 360 });
  },
  steps: [
    { title: 'A list of numbers per word', say: ['Each word gets a list of numbers, called an embedding, learned from huge amounts of text.', 'Words used in similar ways end up close together. Here we draw them in a flat plane.'],
      cues: [async F => { for (const g of Object.values(F.s.P)) { F.show(g, 300); await F.wait(80); } }, async F => { await F.show(F.s.clus, 600); }] },
    { title: 'Directions can mean something', say: ['The step from man to woman is similar to the step from king to queen.', 'So let us try: start at king, subtract man, and add woman.'],
      cues: [async F => { await F.hide(F.s.clus); await F.show(F.s.a1); await F.show(F.s.a2); }, async F => { await F.hide(F.s.a2); await F.show(F.s.b1); await F.show(F.s.b2); await F.show(F.s.res); }] },
    { title: 'Landing near queen', say: ['We land very close to queen.', 'But be careful: we must skip the three input words, because in real embeddings the nearest word is often king itself.'],
      cues: [async F => { await F.show(F.s.ring); await F.show(F.s.formula); }, async F => { await F.hide(F.s.formula); await F.show(F.s.cav); await F.pulse(F.s.P.king, 2); }] },
    { title: 'Honest limits', say: ['Many analogies do not work at all, and embeddings also learn the biases in their text, for example about jobs and gender.', 'An embedding is a map of how words are used, not a dictionary of meaning.'],
      cues: [async F => { await F.show(F.s.bias); }, async F => { await blink(F, F.s.res, 2); }] }
  ]
};

/* ---------- scene 6: encoder–decoder ---------- */
const EN = ['I', 'like', 'tea'], FR = ['J’aime', 'le', 'thé', '⟨end⟩'];
const sceneSeq = {
  id: 'seq2seq', title: 'Sequence to sequence: encoder and decoder', w: 900, h: 360, wide: true,
  build(F) {
    K.title(F, 'Translate: read everything, then write', 'encoder and decoder are two recurrent networks');
    F.text(230, 316, 'ENCODER (reads)', { size: 12.5, weight: 750, fill: 'var(--c-a)' }); F.text(730, 232, 'DECODER (writes)', { size: 12.5, weight: 750, fill: 'var(--c-d)' });
    F.s.enc = EN.map((w, i) => { const x = 120 + i * 110, g = F.g({}); g.style.opacity = 0;
      F.box(x, 170, 80, 56, 'enc', { fill: 'var(--c-closed)', stroke: 'var(--c-a)', size: 13, weight: 700 }, g);
      F.box(x, 280, 70, 34, w, { fill: 'var(--c-start)', size: 15, weight: 750 }, g); F.arrow(x, 262, x, 200, { color: 'var(--c-node-line)' }, g);
      if (i < 2) F.arrow(x + 40, 170, x + 70, 170, { color: 'var(--c-a)', w: 2.6 }, g); return g; });
    F.s.ctx = F.box(470, 170, 74, 74, 'context\nvector', { fill: 'var(--c-cur)', stroke: 'var(--c-c)', size: 12.5, weight: 750 }); F.s.ctx.style.opacity = 0;
    F.s.a1 = F.arrow(380, 170, 431, 170, { color: 'var(--c-c)', w: 3 }); F.s.a1.style.opacity = 0;
    F.s.a2 = F.arrow(508, 170, 553, 170, { color: 'var(--c-c)', w: 3 }); F.s.a2.style.opacity = 0;
    F.s.dec = FR.map((w, i) => { const x = 595 + i * 90, g = F.g({}); g.style.opacity = 0;
      F.box(x, 170, 70, 56, 'dec', { fill: 'var(--c-goal)', stroke: 'var(--c-d)', size: 13, weight: 700 }, g);
      F.box(x, 82 + 0, 76, 30, w, { fill: 'var(--accent2-bg)', stroke: 'var(--accent2)', size: 14, weight: 750 }, g); F.arrow(x, 142, x, 100, { color: 'var(--c-node-line)' }, g);
      if (i < 3) { F.arrow(x + 35, 170, x + 55, 170, { color: 'var(--c-d)', w: 2.6 }, g); F.path(`M${x + 38},82 C${x + 62},82 ${x + 48},222 ${x + 76},202`, { stroke: 'var(--accent2)', 'stroke-width': 1.8, 'stroke-dasharray': '4 3', 'marker-end': F.arrowMarker('var(--accent2)') }, g); }
      return g; });
    F.s.c1 = K.callout(F, 470, 260, 'the whole sentence\nin one vector', { tone: 'warn', w: 170 });
    F.s.c2 = K.callout(F, 450, 342, 'bottleneck: long sentences do not fit well · next week: attention', { tone: 'bad', w: 500 });
    F.s.c3 = K.callout(F, 740, 300, 'each word written is fed back in', { tone: 'accent', w: 260 });
  },
  steps: [
    { title: 'Read the sentence', say: ['Translation turns one sequence into another, and the lengths can differ.', 'An encoder network reads the English sentence, one word at a time.'],
      cues: [async F => { await F.show(F.s.enc[0], 400); }, async F => { for (const g of F.s.enc) { await F.show(g, 350); } }] },
    { title: 'The context vector', say: ['Its last hidden state is the context vector: the whole sentence squeezed into one list of numbers.', 'It is handed to a second network, the decoder.'],
      cues: [async F => { await F.show(F.s.a1); await F.show(F.s.ctx); await F.show(F.s.c1); }, async F => { await F.show(F.s.a2); await spark(F, 508, 170, 560, 170, 'var(--c-c)', 400); }] },
    { title: 'Write the translation', say: ['The decoder writes the French sentence one word at a time, feeding each word back in.', 'It stops when it produces a special end symbol.'],
      cues: [async F => { await F.hide(F.s.c1); for (let i = 0; i < 3; i++) { await F.show(F.s.dec[i], 400); } await F.show(F.s.c3); }, async F => { await F.show(F.s.dec[3], 400); await F.pulse(F.s.dec[3].children[1], 1); }] },
    { title: 'The bottleneck', say: ['There is a weak point: one vector must hold the whole sentence, and long sentences do not fit well.', 'Next week, attention removes this bottleneck by letting the decoder look back at every word of the input.'],
      cues: [async F => { await F.hide(F.s.c3); await F.to(F.s.ctx, { s: 0.75 }, 500); await F.to(F.s.ctx, { s: 1 }, 400); await F.show(F.s.c2); }, async F => { await F.pulse(F.s.ctx, 2); }] }
  ]
};

/* ---------- exercises ---------- */
const exLinear = {
  title: 'Run a recurrent cell by hand', random: true,
  gen(r) {
    const w = r.pick([0.5, -0.5, 2, 1, -1]), u = r.pick([1, 2, -1]), xs = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
    let h = 0; const hs = []; xs.forEach(x => { h = w * h + u * x; hs.push(h); });
    return { prompt: `A <b>linear</b> recurrent cell uses $h_t = w\\,h_{t-1} + u\\,x_t$ with $w = ${w}$, $u = ${u}$ and $h_0 = 0$. The inputs are $x_1 = ${xs[0]}$, $x_2 = ${xs[1]}$, $x_3 = ${xs[2]}$. What is $h_3$?`,
      hint: 'Go step by step: compute h1, then use it to compute h2, then h3.',
      answer: `h1 = ${w}·0 + (${u})·(${xs[0]}) = ${hs[0]}; h2 = ${w}·(${hs[0]}) + (${u})·(${xs[1]}) = ${hs[1]}; h3 = ${w}·(${hs[1]}) + (${u})·(${xs[2]}) = <b>${hs[2]}</b>.`, check: { type: 'number', answer: hs[2], tol: 0.01 } };
  }
};
const exTanh = {
  title: 'One step of a tanh cell', random: true,
  gen(r) {
    const w = r.pick([0.5, 0.8, 1.5, -0.5]), u = r.pick([1, 0.5, 2]), hp = r.pick([0, 0.5, -0.5, 0.2, 0.8]), x = r.pick([1, 0, -1, 0.5]);
    const a = w * hp + u * x, h = Math.tanh(a);
    return { prompt: `A recurrent cell computes $h_t = \\tanh(w\\,h_{t-1} + u\\,x_t)$ with $w = ${w}$, $u = ${u}$, $h_{t-1} = ${hp}$ and $x_t = ${x}$. What is $h_t$? (Two decimals.)`,
      hint: 'First compute the number inside the brackets, then apply tanh on a calculator.',
      answer: `Inside: (${w})·(${hp}) + (${u})·(${x}) = ${+a.toFixed(4)}. tanh(${+a.toFixed(4)}) = <b>${h.toFixed(2)}</b>.`, check: { type: 'number', answer: +h.toFixed(4), tol: 0.011 } };
  }
};
const exVanish = {
  title: 'How fast does the signal vanish?', random: true,
  gen(r) {
    if (r.chance(0.5)) {
      const f = r.pick([0.5, 0.2, 0.1, 2, 3]), T = r.int(2, 5), v = Math.pow(f, T);
      return { prompt: `At every step back in time the gradient is multiplied by ${f}. It starts at 1. What is it after going back ${T} steps?`,
        hint: 'Multiply by the factor once per step: factor to the power of the number of steps.', answer: `${f}<sup>${T}</sup> = <b>${+v.toPrecision(6)}</b>. ${f < 1 ? 'It shrinks: a vanishing gradient.' : 'It grows: an exploding gradient.'}`, check: { type: 'number', answer: v, tol: Math.max(1e-6, v * 0.001) } };
    }
    const f = r.pick([0.5, 0.9, 0.8]), lim = r.pick([0.1, 0.01]); let T = 0, v = 1; while (v >= lim) { v *= f; T++; }
    return { prompt: `At every step back the gradient is multiplied by ${f}, starting from 1. After how many steps back is it smaller than ${lim} for the first time?`,
      hint: 'Keep multiplying by the factor and count the steps until the value drops below the limit.', answer: `${f}<sup>${T - 1}</sup> ≈ ${Math.pow(f, T - 1).toFixed(4)} is still at least ${lim}, but ${f}<sup>${T}</sup> ≈ ${Math.pow(f, T).toFixed(4)} is smaller. Answer: <b>${T}</b> steps.`, check: { type: 'number', answer: T, tol: 0.01 } };
  }
};
const exLSTM = {
  title: 'Update an LSTM cell state', random: true,
  gen(r) {
    const c0 = r.pick([1, 2, -1, 3, 0.5]), f = r.pick([0, 0.5, 0.8, 0.9, 1]), i = r.pick([0, 0.5, 1, 0.2]), g = r.pick([1, -1, 0.5, 0.8, -0.5]);
    const c = Math.round((f * c0 + i * g) * 10000) / 10000;
    return { prompt: `An LSTM cell has old cell state $c_{t-1} = ${c0}$. The forget gate is $f = ${f}$, the input gate is $i = ${i}$, and the new candidate value is $g = ${g}$. What is the new cell state $c_t = f\\,c_{t-1} + i\\,g$?`,
      hint: 'Keep part of the old memory (f times old), then add the part of the new value that the input gate lets in (i times g).',
      answer: `${f}·(${c0}) + ${i}·(${g}) = ${+(f * c0).toFixed(4)} + ${+(i * g).toFixed(4)} = <b>${c}</b>.${f === 1 && i === 0 ? ' Gates fully open/closed: the memory is copied unchanged.' : ''}`, check: { type: 'number', answer: c, tol: 0.001 } };
  }
};
const exAnalogy = {
  title: 'Word arithmetic', random: true,
  gen(r) {
    const sets = [
      { a: 'man', b: 'woman', c: 'king', words: { man: [1, 1], woman: [1, 4], king: [5, 1], queen: [5, 4], prince: [6, 0], dog: [8, 6] } },
      { a: 'France', b: 'Paris', c: 'Italy', words: { France: [1, 1], Paris: [3, 2], Italy: [1, 4], Rome: [3, 5], Spain: [0, 6], apple: [7, 1] } },
      { a: 'walk', b: 'walked', c: 'swim', words: { walk: [2, 1], walked: [2, 4], swim: [6, 2], swam: [6, 5], fish: [8, 1], ran: [3, 6] } }
    ];
    const S = r.pick(sets), jit = () => r.pick([-1, 0, 1]) * 0.5; let W, R, cand;
    do { W = {}; for (const [k, v] of Object.entries(S.words)) W[k] = [v[0] + jit(), v[1] + jit()];
      R = [W[S.c][0] - W[S.a][0] + W[S.b][0], W[S.c][1] - W[S.a][1] + W[S.b][1]];
      cand = Object.keys(W).filter(k => ![S.a, S.b, S.c].includes(k)).map(k => [k, Math.hypot(W[k][0] - R[0], W[k][1] - R[1])]).sort((p, q) => p[1] - q[1]);
    } while (cand[1][1] - cand[0][1] < 0.5);
    const ans = cand[0][0];
    const tbl = '<table class="mini"><tr><th>word</th><th>vector</th></tr>' + Object.entries(W).map(([k, v]) => `<tr><td>${k}</td><td>(${v[0]}, ${v[1]})</td></tr>`).join('') + '</table>';
    return { prompt: `Toy 2D embeddings:${tbl}Compute <b>${S.c} − ${S.a} + ${S.b}</b>. Which word (not one of the three input words) is nearest to the result? Type the word.`,
      hint: 'Subtract and add the x numbers, then the y numbers. Then find the closest remaining word.',
      answer: `Result = (${R[0]}, ${R[1]}). Distances: ${cand.map(c => c[0] + ' ' + c[1].toFixed(2)).join(', ')}. Nearest: <b>${ans}</b>.`, check: { type: 'text', answer: ans } };
  }
};
const exParams = {
  title: 'Count the weights of a recurrent cell', random: true,
  gen(r) {
    const n = r.pick([4, 8, 16, 32, 64]), m = r.pick([1, 3, 10, 50, 100]), p = n * n + n * m + n;
    return { prompt: `A simple recurrent cell has a hidden state of size ${n} and inputs of size ${m}. It has a recurrent weight matrix (${n} × ${n}), an input weight matrix (${n} × ${m}) and a bias vector (${n}). How many numbers does it learn? (These are shared by all time steps.)`,
      hint: 'Add the sizes of the three parts.', answer: `${n}·${n} + ${n}·${m} + ${n} = ${n * n} + ${n * m} + ${n} = <b>${p}</b>. An LSTM has four such sets (three gates and the candidate), so 4 × ${p} = ${4 * p}.`, check: { type: 'number', answer: p, tol: 0.01 } };
  }
};

Course.lecture({
  id: 'w09', num: 9, week: 9, kind: 'lecture', title: 'Sequence models: RNN, LSTM, embeddings',
  lede: 'Language, speech and sensor data arrive in order, and the order carries meaning. A recurrent network reads one item at a time and keeps a memory. We see why that memory fades, how the LSTM keeps it, how words become numbers, and how one network can translate into another language.',
  clos: [2], widgets: ['rnn'],
  goals: ['explain why <b>order</b> matters and why a fixed-size network does not fit sequences',
    'run a <b>recurrent cell</b> by hand and explain the hidden state as memory',
    'explain the <b>vanishing and exploding gradient</b> with a simple product of factors',
    'describe the three <b>LSTM gates</b> and update a cell state by hand',
    'use <b>word embeddings</b> for analogies, with their honest limits, and describe an <b>encoder–decoder</b>'],
  chapters: [
    { id: 'order', title: 'Why order matters', blocks: [
      { scene: sceneOrder },
      { quiz: { q: 'Why is a plain feed-forward network a poor fit for sentences?', options: ['It needs a fixed number of inputs and has no memory of earlier words', 'It cannot use numbers', 'It is always too slow', 'It cannot be trained with gradient descent'], correct: 0, why: 'Sentences have different lengths and their meaning depends on order. A recurrent network reads one item at a time and keeps a memory.' } }
    ] },
    { id: 'rnn', title: 'Recurrent networks', blocks: [
      { html: '<p>A <b>recurrent neural network</b> (RNN) applies the same cell at every time step: $h_t = \\tanh(W h_{t-1} + U x_t + b)$. The vector $h_t$ is the <b>hidden state</b>: everything the network remembers so far. Training unrolls the loop and runs backpropagation through the copies, called <b>backpropagation through time</b>.</p>' },
      { scene: sceneUnroll },
      { exercise: exLinear },
      { exercise: exTanh }
    ] },
    { id: 'vanish', title: 'The vanishing gradient', blocks: [
      { scene: sceneVanish },
      { exercise: exVanish },
      { html: '<p>Try it yourself. Type a sequence, move the recurrent weight, and watch the lower chart: it shows how strongly the <b>first</b> input still affects each later state. That is exactly the factor the gradient must travel through.</p>' },
      { widget: 'rnn' },
      { note: '<b>Try this.</b> (1) Preset <i>Fading memory</i>: the influence drops by about half per step. (2) Set the weight to 1.5 with the linear cell: it explodes. (3) Preset <i>Saturated tanh</i>: the state stays near 1, yet the influence still vanishes, because the slope of tanh is almost zero there.' }
    ] },
    { id: 'lstm', title: 'LSTM: gates that protect memory', blocks: [
      { html: '<p>The <b>long short-term memory</b> cell (Hochreiter and Schmidhuber, 1997) adds a separate <b>cell state</b> $c_t$ and three gates, each a sigmoid between 0 and 1: $c_t = f \\odot c_{t-1} + i \\odot g$, and $h_t = o \\odot \\tanh(c_t)$. The symbol $\\odot$ means multiply number by number.</p>' },
      { scene: sceneLSTM },
      { exercise: exLSTM },
      { quiz: { q: 'In an LSTM, which setting copies the old memory to the next step unchanged?', options: ['Forget gate 1 and input gate 0', 'Forget gate 0 and input gate 1', 'Output gate 0', 'All gates 0.5'], correct: 0, why: 'c = 1 × old + 0 × new = old. Along this path the gradient is multiplied by the forget gate, so it does not have to vanish.' } }
    ] },
    { id: 'embed', title: 'Word embeddings', blocks: [
      { html: '<p>Each word gets a learned vector, an <b>embedding</b> (for example word2vec, 2013). Words that appear in similar contexts get similar vectors. The embedding is the first layer of almost every language model, including the transformers of next week.</p>' },
      { scene: sceneEmbed },
      { exercise: exAnalogy }
    ] },
    { id: 'seq2seq', title: 'Sequence to sequence', blocks: [
      { scene: sceneSeq },
      { exercise: exParams },
      { quiz: { q: 'What is the main weakness of the basic encoder–decoder?', options: ['The whole input must fit into one fixed-size context vector', 'It can only translate into English', 'The decoder cannot produce an end symbol', 'It has no weights to learn'], correct: 0, why: 'One vector is a bottleneck for long sentences. Attention lets the decoder look at all encoder states instead.' } }
    ] }
  ]
});
})();

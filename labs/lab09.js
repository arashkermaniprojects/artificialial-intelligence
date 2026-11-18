(function () {
const K = Course.kit;
/* All Python cells below were run with numpy before publishing. Cells share one Python session: run them in order. */

async function blink(F, el, n = 1) { if (F.instant) return; for (let i = 0; i < n; i++) { await F.to(el, { opacity: 0.3 }, 220); await F.to(el, { opacity: 1 }, 260); } }
function tw(F, ms, fn) {
  if (F.instant || ms <= 0) { fn(1); return Promise.resolve(); }
  const tk = F.token, t0 = performance.now(), ez = (Course.ease && Course.ease.io) || (t => t);
  return new Promise(res => { const f = now => { if (tk !== F.token) return; const p = Math.min(1, (now - t0) / ms); fn(ez(p)); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
}

/* ---------- scene: the gradient sizes printed by cell 3 (first epoch, T = 15), drawn on a log scale ---------- */
const NORMS = [3.4e-3, 1.0e-3, 5.8e-4, 2.6e-4, 1.4e-4, 7.2e-5, 3.4e-5, 1.5e-5, 6.7e-6, 3.0e-6, 1.3e-6, 5.6e-7, 2.4e-7, 9.9e-8, 3.2e-8];
const ACC = [[2, 1.00], [5, 1.00], [15, 0.60], [30, 0.48]];
const sceneBPTT = {
  id: 'bptt', title: 'What cell 3 measures', w: 720, h: 400,
  build(F) {
    K.title(F, 'Gradient size at each time step (log scale)', 'task: remember the first number of the sequence; T = 15 steps');
    const X0 = 70, DX = 40, ly = v => 330 - (Math.log10(v) + 8) / 6 * 230;
    F.line(50, 330, 680, 330, { stroke: 'var(--c-soft)', 'stroke-width': 1.5 });
    for (let e = -8; e <= -2; e += 2) { F.line(50, ly(Math.pow(10, e)), 680, ly(Math.pow(10, e)), { stroke: 'var(--c-grid)', 'stroke-dasharray': '3 4' }); F.text(42, ly(Math.pow(10, e)), '1e' + e, { size: 11, cls: 'soft', anchor: 'end' }); }
    F.s.bars = NORMS.map((v, k) => { const t = 15 - k, x = X0 + (t - 1) * DX; const r = F.rect(x - 13, 330, 26, 0, { rx: 4, fill: k < 5 ? 'var(--ok)' : k < 10 ? 'var(--warn)' : 'var(--bad)' }); F.text(x, 346, 't' + t, { size: 10.5, cls: 'soft' }); return { r, y: ly(v) }; });
    F.s.arrow = F.arrow(640, 80, 90, 80, { color: 'var(--c-c)', w: 2.6, dash: '7 5' }); F.s.arrow.style.opacity = 0;
    F.s.arrowT = F.text(365, 66, 'backpropagation through time: from the error back to step 1', { size: 12, weight: 700, fill: 'var(--c-c)' }); F.s.arrowT.style.opacity = 0;
    F.s.c1 = K.callout(F, 360, 375, 'from step 15 to step 1 the gradient shrinks about 100 000 times', { tone: 'bad', w: 500 });
    F.s.tab = F.g({}); F.s.tab.style.opacity = 0;
    F.rect(60, 100, 240, 132, { rx: 10, fill: 'var(--card)', stroke: 'var(--line)' }, F.s.tab);
    F.text(180, 116, 'test accuracy after 400 epochs', { size: 12, weight: 700 }, F.s.tab);
    ACC.forEach(([T, a], i) => { F.text(110, 142 + i * 24, 'T = ' + T, { size: 13, cls: 'mono' }, F.s.tab); F.text(240, 142 + i * 24, a.toFixed(2), { size: 13, weight: 800, cls: 'mono', fill: a > 0.9 ? 'var(--ok)' : 'var(--bad)' }, F.s.tab); });
    F.s.grow = (from, to, ms) => tw(F, ms, p => F.s.bars.forEach((b, k) => { if (k < from || k >= to) return; const hh = (330 - b.y) * p; b.r.setAttribute('y', 330 - hh); b.r.setAttribute('height', hh); }));
  },
  steps: [
    { title: 'Backwards in time', say: ['Cell three trains a tiny recurrent network to report the first number of a sequence at the very end.', 'To learn, the error must travel back from the last step to the first.'],
      cues: [async F => { await blink(F, F.s.bars[14].r, 1); }, async F => { await F.show(F.s.arrow); await F.show(F.s.arrowT); }] },
    { title: 'Shrinking at every step', say: ['These bars are the sizes the code prints in the first epoch. The scale is logarithmic: each grid line is a hundred times smaller.', 'By step one, the signal is about a hundred thousand times weaker than at the end.'],
      cues: [async F => { await F.s.grow(0, 5, 600); await F.s.grow(5, 10, 600); await F.s.grow(10, 15, 600); }, async F => { await F.show(F.s.c1); }] },
    { title: 'The result', say: ['After four hundred epochs, the network solves the task for two or five steps, but for fifteen or thirty steps it is still guessing.', 'The first step gets almost no learning signal. This is the vanishing gradient, measured in your own code.'],
      cues: [async F => { await F.hide(F.s.c1); await F.show(F.s.tab); }, async F => { await blink(F, F.s.tab, 1); }] },
    { title: 'What fixes it', say: ['An LSTM keeps a separate memory path where the forget gate can stay near one, so the signal survives many steps.', 'Cell four shows that path in one line of numpy.'],
      cues: [async F => { await F.hide(F.s.tab); await F.to(F.s.arrow, { stroke: 'var(--ok)' }, 400); }, async F => { await blink(F, F.s.arrowT, 1); }] }
  ]
};

/* ---------- check-yourself exercises ---------- */
const exState = {
  title: 'Predict the next hidden state', random: true,
  gen(r) {
    const w = r.pick([0.5, 0.8, 1, 2]), u = r.pick([1, 2]), h0 = r.pick([0, 0.5, 1, -1]), x = r.pick([0, 1, -1]);
    const a = w * h0 + u * x, h = Math.tanh(a);
    return { prompt: `In cell 1, set <code>w = ${w}</code>, <code>u = ${u}</code>. The previous hidden state is ${h0} and the input is ${x}. What does <code>np.tanh(w * h + u * x)</code> give? (Two decimals.)`,
      hint: 'Compute the number inside first, then tanh. tanh(0) = 0, tanh(1) ≈ 0.76, tanh(2) ≈ 0.96.', answer: `(${w})·(${h0}) + (${u})·(${x}) = ${a}; tanh(${a}) = <b>${h.toFixed(2)}</b>.`, check: { type: 'number', answer: Math.round(h * 10000) / 10000, tol: 0.011 } };
  }
};
const exInfluence = {
  title: 'Read the influence table', random: true,
  gen(r) {
    const w = r.pick([0.5, 0.8, 0.9, 1.2, 1.5, 2]), T = r.int(3, 8), v = Math.pow(w, T - 1);
    return { prompt: `For the <b>linear</b> cell in cell 2 with u = 1, the influence of the first input on step t is $w^{t-1}$. With $w = ${w}$, what is the influence at step ${T}?`,
      hint: 'Step 1 has influence 1 (= w to the power 0). Each further step multiplies by w.', answer: `${w}<sup>${T - 1}</sup> = <b>${+v.toPrecision(5)}</b>. ${w < 1 ? 'It vanishes.' : w > 1 ? 'It explodes.' : ''}`, check: { type: 'number', answer: v, tol: Math.max(0.0005, v * 0.002) } };
  }
};
const exForget = {
  title: 'How long does the LSTM remember?', random: true,
  gen(r) {
    const f = r.pick([0.5, 0.8, 0.9, 0.99, 1]), T = r.pick([2, 3, 5, 10]), c = Math.pow(f, T);
    return { prompt: `In cell 4 the memory starts at c = 1, the input gate is 0, and the forget gate is ${f} at every step. What is c after ${T} steps?`,
      hint: 'Each step multiplies c by the forget gate.', answer: `${f}<sup>${T}</sup> = <b>${+c.toPrecision(5)}</b>.${f === 1 ? ' With the forget gate fully open, the memory never fades.' : ''}`, check: { type: 'number', answer: c, tol: Math.max(0.0005, c * 0.002) } };
  }
};

Course.lecture({
  id: 'lab09', num: 9, week: 9, kind: 'lab', title: 'Recurrent networks',
  lede: 'Run a recurrent cell step by step, measure how the influence of the first input fades, train a tiny RNN with backpropagation through time and watch it fail on long sequences, then see the LSTM memory path that fixes it.',
  clos: [2], widgets: ['rnn'],
  goals: ['compute hidden states of a recurrent cell with numpy and match the lecture numbers',
    'measure vanishing and exploding influence for different recurrent weights',
    'read a <b>backpropagation through time</b> loop and connect the printed gradient sizes to the theory',
    'update an <b>LSTM</b> cell state and explain the role of the forget gate'],
  chapters: [
    { id: 'cell', title: 'A recurrent cell, step by step', blocks: [
      { html: '<p>Press <b>▶ Run</b> on each cell <b>in order</b>. Cell 1 is the example from the lecture: recurrent weight 0.8, input weight 1, and the input 1 followed by zeros.</p>' },
      { py: { title: 'Cell 1 · four steps of a tanh cell', code: `import numpy as np

w, u = 0.8, 1.0
xs = [1, 0, 0, 0]
h = 0.0
for t, x in enumerate(xs, start=1):
    h = np.tanh(w * h + u * x)
    print(f"step {t}: input {x}  ->  hidden state {h:.4f}")
` } },
      { note: '<b>Expected output.</b> 0.7616, 0.5436, 0.4094, 0.3163: the echo of the first input fades. <b>Your task:</b> set <code>w = 1.0</code>, then <code>w = 0.3</code>. Which keeps the memory longer?' },
      { exercise: exState }
    ] },
    { id: 'influence', title: 'Measure vanishing and exploding', blocks: [
      { py: { title: 'Cell 2 · influence of the first input', code: `def influence(w, u=1.0, T=20, act="tanh"):
    """How much the FIRST input still moves the state at each step: d h_t / d x_1."""
    h, d, out = 0.0, 0.0, []
    for t in range(T):
        x = 1.0 if t == 0 else 0.0
        a = w * h + u * x
        h = np.tanh(a) if act == "tanh" else a
        slope = 1 - h ** 2 if act == "tanh" else 1.0
        d = u * slope if t == 0 else w * slope * d
        out.append(d)
    return np.array(out)

for w in [0.5, 0.9, 1.0, 1.5]:
    inf = influence(w, act="linear")
    print(f"linear, w = {w}: step 1 {inf[0]:.3g}   step 10 {inf[9]:.3g}   step 20 {inf[19]:.3g}")
inf = influence(3.0, act="tanh")
print(f"tanh,   w = 3.0: step 1 {inf[0]:.3g}   step 10 {inf[9]:.3g}   step 20 {inf[19]:.3g}")
` } },
      { note: '<b>Expected output.</b><br><code>linear, w = 0.5: step 1 1   step 10 0.00195   step 20 1.91e-06</code><br><code>linear, w = 0.9: step 1 1   step 10 0.387   step 20 0.135</code><br><code>linear, w = 1.0: step 1 1   step 10 1   step 20 1</code><br><code>linear, w = 1.5: step 1 1   step 10 38.4   step 20 2.22e+03</code><br><code>tanh,   w = 3.0: step 1 0.42   step 10 4.23e-14   step 20 2.96e-29</code><br>The 0.00195 and 38.4 are exactly the lecture numbers. The last line is the surprise: the tanh state is large, but the slope of tanh near ±1 is almost zero, so the influence vanishes anyway.' },
      { exercise: exInfluence },
      { widget: 'rnn' }
    ] },
    { id: 'bptt', title: 'Train an RNN: backpropagation through time', blocks: [
      { html: '<p>The task: a sequence of noisy numbers starts with +1 or −1. At the end, the network must say which. Everything in between is noise to be ignored. Cell 3 runs the forward pass through time, then walks <b>backwards</b> through the same steps (<code>for t in range(T, 0, -1)</code>) to collect the gradients. It takes a few seconds.</p>' },
      { py: { title: 'Cell 3 · remember the first number', code: `def make_task(n, T, rng):
    """Remember the FIRST number (+1 or -1) of a noisy sequence and report it at the end."""
    first = rng.choice([-1.0, 1.0], size=n)
    xs = 0.5 * rng.standard_normal((n, T))
    xs[:, 0] = first
    return xs, first

def train_memory(T, H=8, epochs=400, lr=0.3, seed=0, report=False):
    r = np.random.default_rng(seed)
    W = r.standard_normal((H, H)) * 0.5 / np.sqrt(H)
    U, b, v = r.standard_normal(H), np.zeros(H), r.standard_normal(H) * 0.5
    xs, y = make_task(256, T, r)
    for ep in range(epochs):
        hs = [np.zeros((len(y), H))]
        for t in range(T):                                  # forward through time
            hs.append(np.tanh(hs[-1] @ W.T + np.outer(xs[:, t], U) + b))
        yhat = hs[-1] @ v
        dy = 2 * (yhat - y) / len(y)                        # mean squared error
        gv = hs[-1].T @ dy
        dh = np.outer(dy, v)
        gW, gU, gb, norms = np.zeros_like(W), np.zeros_like(U), np.zeros_like(b), []
        for t in range(T, 0, -1):                           # backpropagation through time
            da = dh * (1 - hs[t] ** 2)
            norms.append(np.abs(da).mean())
            gW += da.T @ hs[t - 1]
            gU += da.T @ xs[:, t - 1]
            gb += da.sum(0)
            dh = da @ W
        if report and ep == 0:
            print("size of the gradient at steps T, T-1, ..., 1 (first epoch):")
            print("  ".join(f"{g:.1e}" for g in norms))
        for p, g in ((W, gW), (U, gU), (b, gb), (v, gv)):
            p -= lr * np.clip(g, -1, 1)                     # clipping guards against explosion
    xt, yt = make_task(500, T, np.random.default_rng(seed + 1))
    h = np.zeros((500, H))
    for t in range(T):
        h = np.tanh(h @ W.T + np.outer(xt[:, t], U) + b)
    return np.mean(np.sign(h @ v) == yt)

train_memory(15, report=True)
for T in [2, 5, 15, 30]:
    print(f"sequence length {T:2d}: test accuracy {train_memory(T):.2f}")
` } },
      { note: '<b>Expected output</b> (may differ slightly between numpy versions): 15 gradient sizes from about 3.4e-03 at the last step down to about 3.2e-08 at step 1, then<br><code>sequence length  2: test accuracy 1.00</code><br><code>sequence length  5: test accuracy 1.00</code><br><code>sequence length 15: test accuracy 0.60</code><br><code>sequence length 30: test accuracy 0.48</code>' },
      { scene: sceneBPTT },
      { note: '<b>Your task.</b> (1) Find the line <code>np.clip(g, -1, 1)</code>. What would happen without it if the gradients exploded? (2) Try <code>print(train_memory(15, epochs=1500))</code> and <code>print(train_memory(30, epochs=1500))</code>. Is the vanishing gradient a wall, or a very slow slope? (3) Explain in two sentences why accuracy 0.48 means "guessing" for this task.' },
      { deeper: { title: 'Result of task (2) (open after you tried)', html: '<p>With 1500 epochs both reach about 0.99 on our data. On this easy task the tiny gradient makes learning <b>much slower</b>, not impossible: the short sequences were solved long before. On harder tasks with longer gaps, plain recurrent networks often never get there (Bengio and colleagues showed this in 1994), which is why the LSTM was invented.</p>' } }
    ] },
    { id: 'lstm', title: 'The LSTM memory path', blocks: [
      { py: { title: 'Cell 4 · one LSTM step, and a memory test', code: `def lstm_step(c_prev, f, i, g, o):
    c = f * c_prev + i * g          # keep part of the old memory, write part of the new value
    h = o * np.tanh(c)              # show part of the memory as the hidden state
    return c, h

c, h = lstm_step(c_prev=2.0, f=0.9, i=0.5, g=0.8, o=0.6)
print(f"new cell state c = {c:.2f},  hidden state h = {h:.3f}")

for f in [1.0, 0.9, 0.5]:
    c = 1.0
    for t in range(20):
        c, _ = lstm_step(c, f=f, i=0.0, g=0.0, o=1.0)
    print(f"forget gate {f}: memory after 20 steps = {c:.3g}")
` } },
      { note: '<b>Expected output.</b> <code>new cell state c = 2.20,  hidden state h = 0.585</code> (the lecture numbers), then after 20 steps: forget gate 1.0 keeps 1, forget gate 0.9 keeps 0.122, forget gate 0.5 keeps only 9.54e-07. The network <i>learns</i> its gates, so it can choose to hold a memory for as long as it needs.' },
      { exercise: exForget },
      { quiz: { q: 'In cell 3 the gradient at step 1 was about 100 000 times smaller than at step 15. What is the main consequence?', options: ['Learning to use the first input becomes extremely slow, so with the same training budget the long task fails', 'Training becomes faster', 'The network overfits', 'The test set becomes easier'], correct: 0, why: 'The first input is what the task is about, but almost no learning signal reaches it. After 400 epochs the long tasks stay near 0.5; much longer training can still get there on this easy task.' } }
    ] }
  ]
});
})();

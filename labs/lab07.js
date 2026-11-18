(function () {
const K = Course.kit;
/* All Python cells below were run with numpy before publishing. Cells share one Python session: run them in order. */

async function blink(F, el, n = 1) { if (F.instant) return; for (let i = 0; i < n; i++) { await F.to(el, { opacity: 0.3 }, 220); await F.to(el, { opacity: 1 }, 260); } }
function tw(F, ms, fn) {
  if (F.instant || ms <= 0) { fn(1); return Promise.resolve(); }
  const tk = F.token, t0 = performance.now(), ez = (Course.ease && Course.ease.io) || (t => t);
  return new Promise(res => { const f = now => { if (tk !== F.token) return; const p = Math.min(1, (now - t0) / ms); fn(ez(p)); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
}

/* ---------- scene: one training step, mapped to the code ---------- */
const LX = [80, 230, 380, 520], LN = [2, 6, 6, 1], ny = (l, i) => 210 + (i - (LN[l] - 1) / 2) * 42;
const OFF = [[1, 4], [0, 3, 5]];
const sceneStep = {
  id: 'labstep', title: 'One training step in the code', w: 720, h: 400,
  build(F) {
    K.title(F, 'forward → error → backward → update', 'the names under the picture are the variable names in the Python code');
    F.s.E = []; for (let l = 0; l < 3; l++) for (let i = 0; i < LN[l]; i++) for (let j = 0; j < LN[l + 1]; j++) F.s.E.push({ l, i, j, el: F.line(LX[l] + 14, ny(l, i), LX[l + 1] - 14, ny(l + 1, j), { stroke: 'var(--c-node-line)', 'stroke-width': 1.2, opacity: 0.55 }) });
    F.s.U = LN.map((n, l) => Array.from({ length: n }, (_, i) => F.circle(LX[l], ny(l, i), 13, { fill: l === 0 ? 'var(--c-start)' : l === 3 ? 'var(--c-goal)' : 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 1.6 })));
    [['X', 'input points'], ['z1, a1, m1', 'layer 1 (32 units)'], ['z2, a2, m2', 'layer 2 (32 units)'], ['out', 'probability of class 1']].forEach(([c, t], l) => { F.text(LX[l], 352, c, { size: 13, weight: 750, cls: 'mono', fill: 'var(--accent2)' }); F.text(LX[l], 370, t, { size: 11, cls: 'soft' }); });
    F.s.fwd = F.arrow(90, 70, 520, 70, { color: 'var(--c-b)', w: 3 }); F.s.fwd.style.opacity = 0;
    F.s.fwdT = F.text(305, 58, 'forward(P, X_train, p_drop, r)', { size: 12.5, weight: 700, cls: 'mono', fill: 'var(--c-b)' }); F.s.fwdT.style.opacity = 0;
    F.s.err = K.callout(F, 620, 210, 'd3 = out − y\n(the error)', { tone: 'bad', w: 150 });
    F.s.bwd = F.arrow(520, 90, 90, 90, { color: 'var(--c-c)', w: 3, dash: '8 5' }); F.s.bwd.style.opacity = 0;
    F.s.bwdT = F.text(305, 104, 'd2, d1: gradients flow back through masks and ReLUs', { size: 12, weight: 700, fill: 'var(--c-c)' }); F.s.bwdT.style.opacity = 0;
    F.s.upd = K.callout(F, 360, 318, 'P[k] -= lr * g   (every weight takes a small step downhill)', { tone: 'ok', w: 470 });
    F.s.mask = on => { const off = [new Set(on ? OFF[0] : []), new Set(on ? OFF[1] : [])];
      for (let l = 1; l <= 2; l++) F.s.U[l].forEach((c, i) => F.to(c, { fill: off[l - 1].has(i) ? 'var(--c-grid)' : 'var(--c-node)', opacity: off[l - 1].has(i) ? 0.4 : 1 }, 300));
      F.s.E.forEach(e => { const a = e.l === 0 || !off[e.l - 1].has(e.i), b = e.l === 2 || !off[e.l].has(e.j); F.to(e.el, { opacity: a && b ? 0.55 : 0.06 }, 300); }); };
  },
  steps: [
    { title: 'Forward with a mask', say: ['The forward function sends all sixty training points through the two hidden layers at once.', 'With dropout on, the masks m one and m two switch off random units for this step only.'],
      cues: [async F => { await F.show(F.s.fwd); await F.show(F.s.fwdT); }, async F => { F.s.mask(true); await F.wait(400); }] },
    { title: 'The error', say: ['At the output we compare the predicted probability with the true label.', 'For a sigmoid output with cross entropy loss, the error signal is simply the output minus the label.'],
      cues: [async F => { await blink(F, F.s.U[3][0], 2); }, async F => { await F.show(F.s.err); }] },
    { title: 'Backward', say: ['Then the error flows backwards. It is multiplied by the same masks, so a switched off unit gets no blame and no update.', 'This is the backpropagation you met in week six, written with matrices.'],
      cues: [async F => { await F.show(F.s.bwd); await F.show(F.s.bwdT); }, async F => { await blink(F, F.s.bwdT, 1); }] },
    { title: 'Update', say: ['Finally every weight moves a small step against its gradient.', 'The next step draws new random masks. After three thousand steps, we test with every unit switched on.'],
      cues: [async F => { await F.show(F.s.upd); }, async F => { F.s.mask(false); await F.wait(400); }] }
  ]
};

/* ---------- check-yourself exercises (answers computed in code) ---------- */
const exNeuron = {
  title: 'One hidden unit by hand', random: true,
  gen(r) {
    const w = [r.int(-3, 3), r.int(-3, 3)], b = r.int(-2, 2), x = [r.pick([-1, 0.5, 1, 2]), r.pick([-1, 0.5, 1, 2])];
    const z = w[0] * x[0] + w[1] * x[1] + b, a = Math.max(0, z);
    return { prompt: `A hidden unit has weights (${w}) and bias ${b}. The input is (${x}). What is its output after ReLU?`,
      hint: 'z = w1·x1 + w2·x2 + b. ReLU keeps z if it is positive, otherwise gives 0.', answer: `z = ${w[0]}·${x[0]} + ${w[1]}·${x[1]} + (${b}) = ${z}. ReLU(${z}) = <b>${a}</b>.`, check: { type: 'number', answer: a, tol: 0.01 } };
  }
};
const exCount = {
  title: 'How many weights does the network have?', random: true,
  gen(r) {
    const h = r.pick([4, 8, 16, 32, 64]), p = (2 * h + h) + (h * h + h) + (h + 1);
    return { prompt: `The lab network is 2 → ${h} → ${h} → 1 (two inputs, two hidden layers of ${h} units, one output), with a bias for every unit. How many numbers does training learn?`,
      hint: 'For each layer: (inputs × units) + units. Add the three layers.', answer: `Layer 1: 2·${h} + ${h} = ${3 * h}. Layer 2: ${h}·${h} + ${h} = ${h * h + h}. Output: ${h} + 1 = ${h + 1}. Total <b>${p}</b>.`, check: { type: 'number', answer: p, tol: 0.01 } };
  }
};
const exMask = {
  title: 'Apply a dropout mask', random: true,
  gen(r) {
    const a = Array.from({ length: 5 }, () => r.int(0, 6)), m = Array.from({ length: 5 }, () => r.int(0, 1));
    if (!m.some(Boolean)) m[r.int(0, 4)] = 1;
    const out = a.map((v, i) => v * m[i] * 2), s = out.reduce((x, y) => x + y, 0);
    return { prompt: `Dropout with p = 0.5 on five units. Outputs before dropout: (${a}). Random mask (1 = keep, 0 = drop): (${m}). With inverted dropout, what is the <b>sum</b> of the five outputs after dropout?`,
      hint: 'Dropped units give 0. Kept units are multiplied by 1 / (1 − 0.5) = 2.', answer: `After dropout: (${out}). Sum = <b>${s}</b> (before dropout the sum was ${a.reduce((x, y) => x + y, 0)}; on average the two sums agree).`, check: { type: 'number', answer: s, tol: 0.01 } };
  }
};

Course.lecture({
  id: 'lab07', num: 7, week: 7, kind: 'lab', title: 'Multi-layer perceptron and dropout',
  lede: 'Build a small neural network with numpy only, train it with backpropagation, then switch neurons off at random and measure what dropout does to the gap between training and test accuracy.',
  clos: [2], widgets: [],
  goals: ['write the forward pass of a 2-layer MLP with ReLU and a sigmoid output',
    'add <b>inverted dropout</b> with random masks and explain why kept units are scaled',
    'train with backpropagation and compare <b>train</b> and <b>test</b> accuracy',
    'run a small experiment (dropout rate, hidden size) and report the result honestly'],
  chapters: [
    { id: 'data', title: 'The data: two moons', blocks: [
      { html: '<p>Press <b>▶ Run</b> on each cell, <b>in order</b> (the cells share one Python session). The first run downloads Python and numpy into your browser, about 10 MB, once. Our data are two interleaving half circles with noise: only <b>60</b> training points, so a big network can easily memorise them, and <b>500</b> test points to check.</p>' },
      { py: { title: 'Cell 1 · make the data', code: `import numpy as np
rng = np.random.default_rng(0)

def make_moons(n, noise, rng):
    """Two interleaving half circles. Returns points X (n x 2) and labels y (0 or 1)."""
    t = rng.uniform(0, np.pi, n)
    y = np.arange(n) % 2
    x1 = np.where(y == 0, np.cos(t), 1 - np.cos(t))
    x2 = np.where(y == 0, np.sin(t), 0.5 - np.sin(t))
    X = np.column_stack([x1, x2]) + noise * rng.standard_normal((n, 2))
    return X, y

X_train, y_train = make_moons(60, 0.3, rng)
X_test, y_test = make_moons(500, 0.3, rng)
print("training set:", X_train.shape, "  test set:", X_test.shape)
print("first point:", X_train[0].round(2), " label:", y_train[0])
print("labels in training set:", np.bincount(y_train))
` } },
      { note: '<b>Expected output.</b> <code>training set: (60, 2)   test set: (500, 2)</code>, then one point and <code>labels in training set: [30 30]</code>.' }
    ] },
    { id: 'net', title: 'The network and the dropout mask', blocks: [
      { html: '<p>The network is 2 → 32 → 32 → 1. Each hidden layer computes <code>z = X @ W + b</code> and then ReLU. The function <code>forward</code> also builds a <b>mask</b>: a random array of 0 and 1/(1 − p). Multiplying by the mask switches units off and scales the survivors.</p>' },
      { py: { title: 'Cell 2 · the network', code: `def relu(z):
    return np.maximum(0, z)

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def init(hidden, seed):
    r = np.random.default_rng(seed)
    return {"W1": r.standard_normal((2, hidden)), "b1": np.zeros(hidden),
            "W2": r.standard_normal((hidden, hidden)) * np.sqrt(2 / hidden), "b2": np.zeros(hidden),
            "W3": r.standard_normal((hidden, 1)) * np.sqrt(1 / hidden), "b3": np.zeros(1)}

def forward(P, X, p_drop=0.0, r=None):
    """Forward pass. With p_drop > 0 (training only) each hidden unit is switched off
    with probability p_drop, and the kept units are multiplied by 1 / (1 - p_drop)."""
    z1 = X @ P["W1"] + P["b1"]
    m1 = (r.random(z1.shape) >= p_drop) / (1 - p_drop) if p_drop > 0 else np.ones_like(z1)
    a1 = relu(z1) * m1
    z2 = a1 @ P["W2"] + P["b2"]
    m2 = (r.random(z2.shape) >= p_drop) / (1 - p_drop) if p_drop > 0 else np.ones_like(z2)
    a2 = relu(z2) * m2
    out = sigmoid(a2 @ P["W3"] + P["b3"]).ravel()
    return out, (X, z1, m1, a1, z2, m2, a2)

def accuracy(P, X, y):
    out, _ = forward(P, X)            # test mode: no dropout
    return np.mean((out > 0.5) == y)

P = init(32, seed=1)
print("untrained accuracy on the test set:", accuracy(P, X_test, y_test))
` } },
      { note: '<b>Expected output.</b> An untrained network is just guessing: about 0.65 on this test set.' },
      { py: { title: 'Cell 3 · look at one mask', code: `r = np.random.default_rng(7)
p = 0.5
mask = (r.random(10) >= p) / (1 - p)
print("mask for 10 units:", mask)
print("units kept:", int((mask > 0).sum()), "of 10")
a = np.array([0.3, 1.2, 0.0, 0.8, 2.0, 0.5, 0.1, 0.9, 1.5, 0.4])
print("outputs before:", a)
print("outputs after: ", a * mask)
print("sum before:", a.sum().round(2), "  sum after:", (a * mask).sum().round(2))
` } },
      { note: '<b>Observe.</b> Six of ten units survive this time and each is doubled. The sum changes from 7.7 to 8.8 on this pass, but <i>on average</i> over many masks it stays the same. That is the point of the scaling. Run it with another seed (change 7) and compare.' },
      { exercise: exMask }
    ] },
    { id: 'train', title: 'Train it, with and without dropout', blocks: [
      { scene: sceneStep },
      { py: { title: 'Cell 4 · train and compare', code: `def train(p_drop=0.0, hidden=32, epochs=3000, lr=0.5, seed=1):
    P = init(hidden, seed)
    r = np.random.default_rng(seed + 100)        # random masks, but repeatable
    n = len(y_train)
    for ep in range(epochs):
        out, (X, z1, m1, a1, z2, m2, a2) = forward(P, X_train, p_drop, r)
        d3 = (out - y_train)[:, None] / n        # error at the output (cross-entropy + sigmoid)
        gW3, gb3 = a2.T @ d3, d3.sum(0)
        d2 = (d3 @ P["W3"].T) * m2 * (z2 > 0)    # back through dropout mask and ReLU
        gW2, gb2 = a1.T @ d2, d2.sum(0)
        d1 = (d2 @ P["W2"].T) * m1 * (z1 > 0)
        gW1, gb1 = X.T @ d1, d1.sum(0)
        for k, g in zip(["W1", "b1", "W2", "b2", "W3", "b3"], [gW1, gb1, gW2, gb2, gW3, gb3]):
            P[k] -= lr * g
    return P

for p in [0.0, 0.5]:
    P = train(p_drop=p)
    tr, te = accuracy(P, X_train, y_train), accuracy(P, X_test, y_test)
    print(f"dropout {p:.1f}:  train {tr:.2f}   test {te:.2f}   gap {tr - te:+.2f}")
` } },
      { note: '<b>Expected output</b> (numbers may differ slightly between numpy versions):<br><code>dropout 0.0:  train 1.00   test 0.88   gap +0.12</code><br><code>dropout 0.5:  train 0.97   test 0.90   gap +0.07</code><br>Without dropout the network gets every training point right but only 88% of new points. Dropout lowers training accuracy a little and closes part of the gap.' },
      { py: { title: 'Cell 5 · sweep the dropout rate', code: `print("rate   train  test   gap")
for p in [0.0, 0.2, 0.5, 0.8]:
    P = train(p_drop=p, epochs=3000)
    tr, te = accuracy(P, X_train, y_train), accuracy(P, X_test, y_test)
    print(f"{p:.1f}    {tr:.2f}   {te:.2f}   {tr - te:+.2f}")
` } },
      { note: '<b>Expected:</b> rate 0.0 gives a gap of about +0.12, rate 0.5 about +0.07, and rate 0.8 about +0.00 but with lower training accuracy (0.88): too much dropout starts to <b>underfit</b>.' }
    ] },
    { id: 'task', title: 'Your task', blocks: [
      { html: '<p><b>Explain, run, change, observe.</b> In the cell below, change <code>HIDDEN</code> and <code>P_DROP</code>. Make a small table with six runs: hidden 8, 32, 128, each with dropout 0.0 and 0.5. Then answer in two sentences: <i>Did dropout improve the <b>test</b> accuracy, or only shrink the gap? Is a smaller gap always better?</i></p>' },
      { py: { title: 'Cell 6 · your experiment', code: `# Your turn: change these two numbers, run, and fill in the table in your notes.
HIDDEN = 32       # try 8, 32, 128
P_DROP = 0.5      # try 0.0, 0.3, 0.5
P = train(p_drop=P_DROP, hidden=HIDDEN)
tr, te = accuracy(P, X_train, y_train), accuracy(P, X_test, y_test)
print(f"hidden {HIDDEN}, dropout {P_DROP}:  train {tr:.2f}  test {te:.2f}  gap {tr - te:+.2f}")
`, solution: `# Results on our data (numpy 2; yours may differ a little):
# hidden   8: dropout 0.0 -> train 1.00 test 0.89 (gap +0.11) | dropout 0.5 -> train 0.88 test 0.88 (gap +0.01)
# hidden  32: dropout 0.0 -> train 1.00 test 0.88 (gap +0.12) | dropout 0.5 -> train 0.97 test 0.90 (gap +0.07)
# hidden 128: dropout 0.0 -> train 1.00 test 0.88 (gap +0.12) | dropout 0.5 -> train 1.00 test 0.89 (gap +0.11)
# Dropout always shrinks the gap a little, but test accuracy rises by only 0 to 2 points here.
# A smaller gap is not automatically better: for hidden 8 the gap closed because TRAINING accuracy fell.`, explain: '<p>Even 8 hidden units can memorise 60 noisy points. Dropout shrinks the gap in every case, but what really matters is <b>test</b> accuracy, and here it improves only a little: with this much noise, some test points lie deep inside the other class, so no model can reach 100%. On large image and language models, where networks have millions of weights, dropout gives much bigger gains.</p>' } },
      { exercise: exNeuron },
      { exercise: exCount },
      { quiz: { q: 'Your network gets 100% on training data and 85% on test data. Which change is most likely to <b>reduce the gap</b>?', options: ['Add dropout (for example p = 0.3 to 0.5) to the hidden layers', 'Remove the test set', 'Train for many more epochs', 'Add more hidden units'], correct: 0, why: 'The gap is overfitting. Dropout, weight decay, early stopping or more data reduce it. More epochs or more units usually make it larger.' } }
    ] }
  ]
});
})();

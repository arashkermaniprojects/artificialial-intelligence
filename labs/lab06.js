(function () {
const K = Course.kit;
const Q = fn => F => { if (F.instant) { const P = Object.create(F); P.instant = true; return fn(P); } return fn(F); };
const f2 = v => { const s = (Math.round(v * 100) / 100).toFixed(2); return s === '-0.00' ? '0.00' : s; };

/* ---------- scene: what the first cell prints (learning rate 0.25 from w = 0) ---------- */
const L = w => (w - 3) ** 2 + 1, WS = [0, 1.5, 2.25, 2.625, 2.8125];
const sceneSteps = {
  id: 'steps', title: 'Gradient descent, line by line', w: 720, h: 360,
  build(F) {
    K.title(F, 'loss(w) = (w − 3)² + 1, learning rate 0.25', 'each line of the output is one dot');
    const x0 = 50, y0 = 70, w = 360, hh = 240, X = v => x0 + (v + 0.5) / 7 * w, Y = v => y0 + hh - v / 12 * hh; F.s.X = X; F.s.Y = Y;
    F.rect(x0, y0, w, hh, { rx: 6, fill: 'var(--card)', stroke: 'var(--line)' });
    [0, 1, 2, 3, 4, 5, 6].forEach(t => F.text(X(t), y0 + hh + 14, String(t), { size: 11, cls: 'soft' }));
    F.text(x0 + w / 2, y0 + hh + 32, 'w', { size: 12.5, cls: 'soft' });
    let d = ''; for (let i = 0; i <= 140; i++) { const v = -0.5 + 7 * i / 140; d += (i ? 'L' : 'M') + X(v).toFixed(1) + ',' + Y(Math.min(12, L(v))).toFixed(1); }
    F.path(d, { stroke: 'var(--c-a)', 'stroke-width': 3 });
    F.s.dots = WS.map(v => { const c = F.circle(X(v), Y(L(v)), 7, { fill: 'var(--c-b)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }); c.style.opacity = 0; return c; });
    F.rect(440, 70, 260, 200, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' });
    F.text(570, 92, 'step    w        loss', { size: 12.5, cls: 'soft', mono: true });
    F.s.rows = WS.map((v, i) => { const t = F.text(570, 120 + i * 30, `${i}     ${v.toFixed(4)}   ${L(v).toFixed(4)}`, { size: 13.5, mono: true, weight: 650 }); t.style.opacity = 0; return t; });
    F.s.task = K.callout(F, 570, 315, 'your task: try 0.05, 0.5, 0.9, 1.05', { tone: 'accent', w: 270 });
  },
  steps: [
    { title: 'Start', say: ['We start at w equals zero, where the loss is ten.', 'The slope there is minus six, so we move to the right.'],
      cues: [Q(async F => { await F.show(F.s.dots[0]); await F.show(F.s.rows[0]); }), Q(async F => { await F.pulse(F.s.dots[0], 2); })] },
    { title: 'Four steps', say: ['Each step moves w by the learning rate times the slope.', 'The loss goes down to three point two five, then one point five six, then one point one four.'],
      cues: [Q(async F => { await F.show(F.s.dots[1]); await F.show(F.s.rows[1]); }), Q(async F => { for (const i of [2, 3, 4]) { await F.show(F.s.dots[i], 300); await F.show(F.s.rows[i], 300); } })] },
    { title: 'Your turn', say: ['The output of the first cell is exactly this table.', 'Now change the learning rate and predict what will happen before you press run.'],
      cues: [Q(async F => { for (const r of F.s.rows) F.pulse(r, 1); await F.wait(500); }), Q(async F => { await F.show(F.s.task); })] }
  ]
};

/* ---------- exercises ---------- */
const exTwo = {
  title: 'Two steps of gradient descent', random: true,
  gen(r) {
    const a = r.int(-3, 5), eta = r.pick([0.1, 0.2, 0.25, 0.4]); let w0; do { w0 = r.int(-4, 8); } while (w0 === a);
    const w1 = w0 - eta * 2 * (w0 - a), w2 = w1 - eta * 2 * (w1 - a);
    return { prompt: `loss(w) = (w ${a >= 0 ? '−' : '+'} ${Math.abs(a)})², so the slope is 2(w ${a >= 0 ? '−' : '+'} ${Math.abs(a)}). Start at w = ${w0} with learning rate ${eta}. What is w after <b>two</b> steps? Give two decimals.`,
      hint: 'Do one step: w = w − lr × slope. Then compute the slope again at the new w and do the second step.',
      answer: `Step 1: slope = 2(${w0} − ${a}) = ${f2(2 * (w0 - a))}, w = ${f2(w1)}.<br>Step 2: slope = 2(${f2(w1)} − ${a}) = ${f2(2 * (w1 - a))}, w = <b>${f2(w2)}</b>. Every step multiplies the distance to ${a} by ${f2(1 - 2 * eta)}.`,
      check: { type: 'number', answer: +f2(w2), tol: 0.011 } };
  }
};
const exSlopeGrad = {
  title: 'The gradient of the mean squared error', random: true,
  gen(r) {
    const w1 = r.pick([0, 0.5, 1, 1.5, 2]), w0 = r.int(-1, 2), xs = [r.int(1, 4), r.int(1, 4) + 2], ys = xs.map(x => r.int(0, 8));
    const err = xs.map((x, i) => w1 * x + w0 - ys[i]), g1 = 2 * (err[0] * xs[0] + err[1] * xs[1]) / 2;
    return { prompt: `A line has slope w1 = ${w1} and intercept w0 = ${w0}. The data is (${xs[0]}, ${ys[0]}) and (${xs[1]}, ${ys[1]}). The loss is the mean squared error, and its gradient for the slope is $g_1 = 2 \\cdot \\text{mean}(\\text{err} \\cdot x)$ with err = prediction − y. What is $g_1$?`,
      hint: 'Prediction = w1·x + w0. err = prediction − y. Multiply each err by its x, take the mean of the two numbers, times 2.',
      answer: `err = ${err.map(e => f2(e).replace(/\.00$/, '')).join(' and ')}. err·x = ${err.map((e, i) => f2(e * xs[i]).replace(/\.00$/, '')).join(' and ')}. Mean = ${f2((err[0] * xs[0] + err[1] * xs[1]) / 2)}, so g1 = <b>${f2(g1)}</b>. ${g1 > 0 ? 'Positive: gradient descent will make the slope smaller.' : g1 < 0 ? 'Negative: gradient descent will make the slope larger.' : 'Zero: the slope stays.'}`,
      check: { type: 'number', answer: +f2(g1), tol: 0.011 } };
  }
};
const exBias = {
  title: 'Perceptron: the new bias', random: true,
  gen(r) {
    let w, x, y, s; do { w = [r.int(-2, 2), r.int(-2, 2), r.int(-2, 2)]; x = [r.int(-3, 3), r.int(-3, 3)]; y = r.pick([1, -1]); s = w[0] + w[1] * x[0] + w[2] * x[1]; } while (y * s > 0 && r.next() < 0.7);
    const wrong = y * s <= 0, nb = wrong ? w[0] + y : w[0];
    return { prompt: `Weights (w0, w1, w2) = (${w.join(', ')}), sample x = (${x.join(', ')}), label y = ${y > 0 ? '+1' : '−1'}, learning rate 1. After the perceptron rule is applied to this sample, what is the bias <b>w0</b>?`,
      hint: 'The bias input is always 1. If y × (w · (1, x1, x2)) ≤ 0, then w0 becomes w0 + y. Otherwise nothing changes.',
      answer: `w · (1, x1, x2) = ${w[0]} + (${w[1]})(${x[0]}) + (${w[2]})(${x[1]}) = ${s}; y × that = ${y * s}. ${wrong ? `That is ≤ 0: a mistake, so w0 = ${w[0]} + (${y}) = <b>${nb}</b>.` : `That is > 0: correct, so w0 stays <b>${nb}</b>.`}`,
      check: { type: 'number', answer: nb, tol: 0.01 } };
  }
};

Course.lecture({
  id: 'lab06', num: 6, week: 6, kind: 'lab', title: 'Optimization and the perceptron',
  lede: 'Run gradient descent by hand in code, race hill climbing against simulated annealing, fit a line with gradient descent, and train a perceptron until it makes no mistakes (and see it fail on XOR).',
  clos: [2],
  goals: ['run <b>gradient descent</b> and see the effect of the learning rate', 'compare <b>hill climbing</b> and <b>simulated annealing</b> on a bumpy landscape', 'fit a line by gradient descent and compare it with the least-squares formula', 'implement the <b>perceptron rule</b>, and show that it cannot learn XOR'],
  chapters: [
    { id: 'gd', title: 'Step 1: gradient descent on one weight', blocks: [
      { scene: sceneSteps },
      { py: { title: 'Gradient descent', code: String.raw`def loss(w):
    return (w - 3) ** 2 + 1

def grad(w):
    return 2 * (w - 3)            # the slope of the loss

w = 0.0                            # starting point
lr = 0.25                          # learning rate: try 0.05, 0.5, 0.9 and 1.05
for step in range(8):
    print(f"step {step}: w = {w:8.4f}   loss = {loss(w):9.4f}   slope = {grad(w):8.4f}")
    w = w - lr * grad(w)` } },
      { note: '<b>Expected:</b> w = 0, 1.5, 2.25, 2.625, … and the loss falls 10, 3.25, 1.5625, … to 1. <b>Your task:</b> try <code>lr = 0.05</code> (slow), <code>lr = 0.5</code> (one jump straight to 3), <code>lr = 0.9</code> (it jumps from side to side but still arrives) and <code>lr = 1.05</code> (it explodes). The distance to 3 is multiplied by (1 − 2·lr) at every step.' }
    ] },
    { id: 'anneal', title: 'Step 2: hill climbing against simulated annealing', blocks: [
      { py: { title: 'Twenty random starts each', code: String.raw`import numpy as np

def f(x):                          # a bumpy landscape on [0, 6]; we want the MAXIMUM
    return np.sin(2 * x) + 0.5 * np.sin(5 * x) + 0.15 * x

def hill_climb(x, step=0.05):
    while True:
        best = max([max(x - step, 0.0), x, min(x + step, 6.0)], key=f)
        if best == x:
            return x               # no neighbour is higher: stop
        x = best

def anneal(x, seed, step=1.0, T=2.0, cooling=0.99, iters=500):
    rng = np.random.RandomState(seed)
    best = x
    for _ in range(iters):
        new = min(max(x + rng.uniform(-step, step), 0.0), 6.0)
        drop = f(x) - f(new)       # how much worse the new point is (negative = better)
        if drop < 0 or rng.rand() < np.exp(-drop / T):
            x = new                # always accept a better point, sometimes a worse one
        if f(x) > f(best):
            best = x
        T = T * cooling            # cool down a little every step
    return hill_climb(best)        # finish with a short climb to the exact top

xs = np.linspace(0, 6, 601)
top = f(xs).max()
print(f"the highest point: x = {xs[f(xs).argmax()]:.2f}, f = {top:.3f}")

starts = np.random.RandomState(42).uniform(0, 6, 20)
hc_wins = sa_wins = 0
for i, s in enumerate(starts):
    h, a = hill_climb(s), anneal(s, seed=i)
    hc_wins += f(h) > top - 0.01
    sa_wins += f(a) > top - 0.01
    if i < 4:
        print(f"start {s:.2f}: hill climbing f = {f(h):.3f}   annealing f = {f(a):.3f}")
print(f"found the highest point: hill climbing {hc_wins}/20, annealing {sa_wins}/20")` } },
      { note: '<b>Expected:</b> the highest point is at x = 4.06 with f = 2.070. Hill climbing finds it from only <b>4 of 20</b> starts (it stops on the first hill it meets); simulated annealing finds it <b>18 of 20</b> times. <b>Your task:</b> set <code>T=0.01</code> in <code>anneal</code> (almost no bad moves are accepted). What happens to its score, and why?' }
    ] },
    { id: 'reg', title: 'Step 3: fit a line with gradient descent', blocks: [
      { py: { title: 'Linear regression by gradient descent', code: String.raw`import numpy as np

# the six points from the regression lecture (week 4)
x = np.array([1, 2, 3, 4, 5, 6], dtype=float)
y = np.array([2, 3, 5, 4, 6, 7], dtype=float)

w1, w0 = 0.0, 0.0                  # slope and intercept, start at zero
lr = 0.02
for epoch in range(2001):
    pred = w1 * x + w0
    err = pred - y
    loss = np.mean(err ** 2)       # mean squared error
    g1 = 2 * np.mean(err * x)      # d loss / d w1
    g0 = 2 * np.mean(err)          # d loss / d w0
    if epoch in (0, 1, 10, 100, 500, 2000):
        print(f"epoch {epoch:4d}: slope = {w1:.3f}  intercept = {w0:.3f}  loss = {loss:.4f}")
    w1, w0 = w1 - lr * g1, w0 - lr * g0    # one gradient descent step

# the exact least-squares answer, for comparison
slope = np.sum((x - x.mean()) * (y - y.mean())) / np.sum((x - x.mean()) ** 2)
print(f"formula:     slope = {slope:.3f}  intercept = {y.mean() - slope * x.mean():.3f}")` } },
      { note: '<b>Expected:</b> after 2000 epochs slope 0.943 and intercept 1.200, the same as the least-squares formula. The loss 0.3238 is the mean squared error (1.94 total over 6 points, as in Lecture 4). <b>Your task:</b> try <code>lr = 0.1</code>. Then try <code>lr = 0.06</code>. Which one diverges?' }
    ] },
    { id: 'perc', title: 'Step 4: the perceptron', blocks: [
      { py: { title: 'Train a perceptron', code: String.raw`import numpy as np

def train_perceptron(X, y, epochs=20, lr=1.0):
    w = np.zeros(3)                         # (w0 = bias, w1, w2)
    Xb = np.hstack([np.ones((len(X), 1)), X])   # add a column of ones for the bias
    for ep in range(epochs):
        mistakes = 0
        for xi, yi in zip(Xb, y):
            if yi * (w @ xi) <= 0:          # wrong side (or on the line)
                w = w + lr * yi * xi        # the perceptron rule
                mistakes += 1
        print(f"epoch {ep}: mistakes = {mistakes}, w = {np.round(w, 2)}")
        if mistakes == 0:
            print("converged: every point is on its correct side")
            break
    return w

# 1) a separable data set: label +1 above the line x2 = x1, -1 below it
np.random.seed(4)
X = np.random.uniform(-3, 3, (40, 2))
X = X[np.abs(X[:, 1] - X[:, 0]) > 0.5]      # keep a small gap around the line
y = np.where(X[:, 1] > X[:, 0], 1, -1)
print(len(X), "points")
w = train_perceptron(X, y)

# 2) XOR: no straight line can separate it
print("\nXOR:")
Xx = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
yx = np.array([-1, 1, 1, -1])
train_perceptron(Xx, yx, epochs=6)` } },
      { note: '<b>Expected:</b> 37 points; the mistakes per epoch go 2, 2, 2, 1, 0 and the perceptron converges with w = (−1, −4.78, 4.55). The line −1 − 4.78·x1 + 4.55·x2 = 0 is close to the true line x2 = x1. On XOR there are 4 mistakes in every epoch and the weights come back to (0, 0, 0): it never converges. <b>Your task:</b> remove the line that keeps a gap around the boundary. Does it still converge? Does it need more epochs?' }
    ] },
    { id: 'check', title: 'Check yourself', blocks: [
      { exercise: exTwo },
      { exercise: exSlopeGrad },
      { exercise: exBias }
    ] }
  ]
});
})();

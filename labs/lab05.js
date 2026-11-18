(function () {
const K = Course.kit;
const Q = fn => F => { if (F.instant) { const P = Object.create(F); P.instant = true; return fn(P); } return fn(F); };
const H2 = p => (p <= 0 || p >= 1) ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
const f2 = v => (Math.round(v * 100) / 100).toFixed(2), f3 = v => (Math.round(v * 1000) / 1000).toFixed(3);

/* ---------- scene: the entropy curve (values match the first cell: 0, 1, 0.971, 0.918) ---------- */
const sceneEnt = {
  id: 'ent', title: 'Entropy: how mixed is a group?', w: 720, h: 380,
  build(F) {
    K.title(F, 'Entropy of a group with two classes', 'p = fraction of class 1 · 0 bits = pure · 1 bit = half and half');
    const x0 = 70, y0 = 70, w = 380, hh = 250, X = p => x0 + p * w, Y = v => y0 + hh - v * hh; F.s.X = X; F.s.Y = Y;
    F.rect(x0, y0, w, hh, { rx: 6, fill: 'var(--card)', stroke: 'var(--line)' });
    [0, 0.5, 1].forEach(t => { F.line(X(t), y0, X(t), y0 + hh, { stroke: 'var(--c-grid)' }); F.text(X(t), y0 + hh + 14, String(t), { size: 11, cls: 'soft' }); F.line(x0, Y(t), x0 + w, Y(t), { stroke: 'var(--c-grid)' }); F.text(x0 - 8, Y(t), String(t), { size: 11, cls: 'soft', anchor: 'end' }); });
    F.text(x0 + w / 2, y0 + hh + 32, 'p (fraction of class 1)', { size: 12.5, cls: 'soft' });
    let d = ''; for (let i = 0; i <= 200; i++) { const p = i / 200; d += (i ? 'L' : 'M') + X(p).toFixed(1) + ',' + Y(H2(p)).toFixed(1); }
    F.s.curve = F.path(d, { stroke: 'var(--c-a)', 'stroke-width': 3.5 }); F.s.curve.style.opacity = 0;
    F.s.dot = F.g({ transform: `translate(${X(1)},${Y(0)})` }); F.s.dot.__t = { x: X(1), y: Y(0), s: 1, r: 0 }; F.circle(0, 0, 8, { fill: 'var(--c-c)', stroke: 'var(--c-ink)', 'stroke-width': 2 }, F.s.dot); F.s.dot.style.opacity = 0;
    F.rect(490, 80, 210, 210, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' });
    F.text(595, 102, 'the group', { size: 12.5, cls: 'soft' });
    F.s.grp = F.g({});
    F.text(595, 230, 'entropy', { size: 12.5, cls: 'soft' }); F.s.val = F.text(595, 260, '–', { size: 26, weight: 800, mono: true, fill: 'var(--c-c)' });
  },
  steps: [
    { title: 'A pure group', say: ['Entropy measures how mixed a group is.', 'If all examples have the same class, the group is pure, and its entropy is zero.'],
      cues: [Q(async F => { await F.draw(F.s.curve, 1000); }), Q(async F => { await grp(F, 4, 0); })] },
    { title: 'Half and half', say: ['The most mixed group is half and half.', 'Its entropy is one bit, the top of the curve.'],
      cues: [Q(async F => { await grp(F, 2, 2); }), Q(async F => { await F.pulse(F.s.dot, 2); })] },
    { title: 'In between', say: ['Six of one class and four of the other gives zero point nine seven.', 'Two and four gives zero point nine two. A good question makes the groups after the split purer, so their entropy drops.'],
      cues: [Q(async F => { await grp(F, 6, 4); }), Q(async F => { await grp(F, 2, 4); })] }
  ]
};
async function grp(F, a, b) {
  const p = a / (a + b), v = H2(p);
  F.s.grp.textContent = '';
  for (let i = 0; i < a + b; i++) { const x = 535 + (i % 5) * 30, y = 130 + Math.floor(i / 5) * 30; if (i < a) F.circle(x, y, 10, { fill: 'var(--c-b)' }, F.s.grp); else F.rect(x - 9, y - 9, 18, 18, { rx: 2, fill: 'var(--c-c)' }, F.s.grp); }
  F.setText(F.s.val, v === 0 || v === 1 ? String(v) : f3(v), 595, 26);
  F.s.dot.style.opacity = 1; await F.to(F.s.dot, { tx: F.s.X(p), ty: F.s.Y(v) }, 700);
}

/* ---------- exercises ---------- */
const exEnt = {
  title: 'Entropy from counts', random: true,
  gen(r) {
    let a, b; do { a = r.int(1, 12); b = r.int(1, 12); } while (a === b);
    const p = a / (a + b), h = H2(p);
    return { prompt: `A node holds <b>${a}</b> examples of class 1 and <b>${b}</b> of class 0. What is its entropy in bits? Give two decimals.`,
      hint: 'p = a / (a + b). H = −p·log2(p) − (1 − p)·log2(1 − p).',
      answer: `p = ${a}/${a + b} = ${f3(p)}. H = −${f3(p)}·log2(${f3(p)}) − ${f3(1 - p)}·log2(${f3(1 - p)}) = <b>${f2(h)}</b>.`,
      check: { type: 'number', answer: +f2(h), tol: 0.011 } };
  }
};
const exGain = {
  title: 'Information gain of a split', random: true,
  gen(r) {
    let a1, b1, a2, b2; do { a1 = r.int(0, 8); b1 = r.int(0, 8); a2 = r.int(0, 8); b2 = r.int(0, 8); } while (a1 + b1 < 2 || a2 + b2 < 2 || (a1 + a2) === 0 || (b1 + b2) === 0);
    const n1 = a1 + b1, n2 = a2 + b2, n = n1 + n2, Hp = H2((a1 + a2) / n), H1 = H2(a1 / n1), Hr = H2(a2 / n2), g = Hp - (n1 / n) * H1 - (n2 / n) * Hr;
    return { prompt: `A node has ${a1 + a2} examples of class 1 and ${b1 + b2} of class 0. A question splits it into a <b>left</b> child with ${a1} of class 1 and ${b1} of class 0, and a <b>right</b> child with ${a2} of class 1 and ${b2} of class 0. What is the information gain? Give two decimals.`,
      hint: 'Gain = H(parent) − (n_left / n)·H(left) − (n_right / n)·H(right).',
      answer: `H(parent) = ${f3(Hp)}, H(left) = ${f3(H1)}, H(right) = ${f3(Hr)}.<br>Gain = ${f3(Hp)} − ${n1}/${n} × ${f3(H1)} − ${n2}/${n} × ${f3(Hr)} = <b>${f2(g)}</b>.`,
      check: { type: 'number', answer: +f2(g), tol: 0.011 } };
  }
};
const exPredict = {
  title: 'Follow the tree', random: true,
  gen(r) {
    const t0 = r.pick([0.3, 0.4, 0.5, 0.6]), t1 = r.pick([0.3, 0.5, 0.7]), t2 = r.pick([0.7, 0.8, 0.9]), leaf = [r.int(0, 1), r.int(0, 1), r.int(0, 1)];
    leaf[2] = 1 - leaf[1];
    let x; do { x = [r.int(0, 9) / 10, r.int(0, 9) / 10]; } while (x[0] === t0 || x[1] === t1 || x[0] === t2);
    const path = []; let cls;
    if (x[0] < t0) { path.push(`x0 = ${x[0]} &lt; ${t0}: yes`); if (x[1] < t1) { path.push(`x1 = ${x[1]} &lt; ${t1}: yes`); cls = leaf[0]; } else { path.push(`x1 = ${x[1]} &lt; ${t1}: no`); cls = 1 - leaf[0]; } }
    else { path.push(`x0 = ${x[0]} &lt; ${t0}: no`); if (x[0] < t2) { path.push(`x0 = ${x[0]} &lt; ${t2}: yes`); cls = leaf[1]; } else { path.push(`x0 = ${x[0]} &lt; ${t2}: no`); cls = leaf[2]; } }
    const T = `<pre class="code">if x0 &lt; ${t0}:\n    if x1 &lt; ${t1}:\n        -&gt; class ${leaf[0]}\n    else:\n        -&gt; class ${1 - leaf[0]}\nelse:\n    if x0 &lt; ${t2}:\n        -&gt; class ${leaf[1]}\n    else:\n        -&gt; class ${leaf[2]}</pre>`;
    return { prompt: `The tree printed by your code is:${T}Which class does it give to the point <b>x = (${x[0]}, ${x[1]})</b>? Type 0 or 1.`,
      hint: 'Start at the top. At each question go into the "if" part when it is true, else into the "else" part.',
      answer: path.join('<br>') + `<br>So the answer is <b>class ${cls}</b>.`,
      check: { type: 'text', answer: String(cls), placeholder: '0 or 1' } };
  }
};

Course.lecture({
  id: 'lab05', num: 5, week: 5, kind: 'lab', title: 'Decision trees from scratch',
  lede: 'Compute entropy, find the best question by trying every threshold, grow a whole tree with a short recursive function, and watch it overfit as it gets deeper.',
  clos: [2],
  goals: ['write the <b>entropy</b> and <b>information gain</b> functions in numpy', 'find the best split by trying every feature and threshold', 'grow a decision tree recursively and print it as if / else rules', 'measure training and test accuracy for different depths and spot <b>overfitting</b>'],
  chapters: [
    { id: 'entropy', title: 'Step 1: entropy and information gain', blocks: [
      { scene: sceneEnt },
      { py: { title: 'Entropy and gain', code: String.raw`import numpy as np

def entropy(labels):
    """Entropy in bits of an array of 0/1 labels."""
    if len(labels) == 0:
        return 0.0
    p = np.mean(labels)                 # fraction of class 1
    if p == 0 or p == 1:
        return 0.0                      # a pure group has no disorder
    return -(p * np.log2(p) + (1 - p) * np.log2(1 - p))

print("pure    [1 1 1 1]       :", entropy(np.array([1, 1, 1, 1])))
print("half    [0 1 0 1]       :", entropy(np.array([0, 1, 0, 1])))
print("6 vs 4                  :", round(entropy(np.array([1]*6 + [0]*4)), 3))
print("2 vs 4                  :", round(entropy(np.array([1]*2 + [0]*4)), 3))

def info_gain(labels, left_mask):
    """Entropy before the split minus the weighted entropy after it."""
    L, R = labels[left_mask], labels[~left_mask]
    after = len(L) / len(labels) * entropy(L) + len(R) / len(labels) * entropy(R)
    return entropy(labels) - after

# the example from the lecture: 6 blue (1) and 4 orange (0); x < 5 sends 4 blue left
x = np.array([1, 2, 3, 4, 6, 8, 6, 8, 7, 9])
y = np.array([1, 1, 1, 1, 1, 1, 0, 0, 0, 0])
print("gain of 'x < 5'         :", round(info_gain(y, x < 5), 3))
print("gain of 'x < 7'         :", round(info_gain(y, x < 7), 3))` } },
      { note: '<b>Expected:</b> 0.0, 1.0, 0.971, 0.918, and gains 0.42 for <code>x &lt; 5</code> and 0.256 for <code>x &lt; 7</code>. These are the numbers from the lecture scene. <b>Your task:</b> try <code>x &lt; 3</code>. Is it a better or a worse question than <code>x &lt; 5</code>? Why?' }
    ] },
    { id: 'tree', title: 'Step 2: grow a tree', blocks: [
      { html: '<p><code>best_split</code> tries every feature and every threshold halfway between two neighbouring values, and keeps the split with the largest gain. <code>grow</code> calls itself on the left and the right part until the node is pure or the maximum depth is reached.</p>' },
      { py: { title: 'A tree of depth 2', code: String.raw`import numpy as np

def entropy(y):
    if len(y) == 0: return 0.0
    p = y.mean()
    return 0.0 if p in (0, 1) else -(p * np.log2(p) + (1 - p) * np.log2(1 - p))

def best_split(X, y):
    """Try every feature and every threshold; return the split with the largest information gain."""
    best = (0.0, None, None)                       # (gain, feature, threshold)
    for f in range(X.shape[1]):
        values = np.unique(X[:, f])
        for t in (values[:-1] + values[1:]) / 2:   # midpoints between neighbours
            left = X[:, f] < t
            after = left.mean() * entropy(y[left]) + (~left).mean() * entropy(y[~left])
            gain = entropy(y) - after
            if gain > best[0] + 1e-12:
                best = (gain, f, t)
    return best

def grow(X, y, depth, max_depth):
    """A node is a leaf (the majority class) or a tuple (feature, threshold, left, right)."""
    gain, f, t = best_split(X, y)
    if depth == max_depth or f is None or gain < 1e-9:
        return int(round(y.mean())) if len(y) else 0
    left = X[:, f] < t
    return (f, t, grow(X[left], y[left], depth + 1, max_depth), grow(X[~left], y[~left], depth + 1, max_depth))

def predict(node, x):
    while isinstance(node, tuple):
        f, t, L, R = node
        node = L if x[f] < t else R
    return node

def show(node, indent=""):
    if not isinstance(node, tuple):
        print(indent + "-> class", node); return
    f, t, L, R = node
    print(f"{indent}if x{f} < {t:.2f}:"); show(L, indent + "    ")
    print(f"{indent}else:");               show(R, indent + "    ")

# data: class 1 when x0 + x1 > 1, with 10% of the labels flipped (noise)
np.random.seed(2)
def make(n):
    X = np.random.rand(n, 2)
    y = (X[:, 0] + X[:, 1] > 1).astype(int)
    flip = np.random.rand(n) < 0.10
    y[flip] = 1 - y[flip]
    return X, y
Xtr, ytr = make(120)
Xte, yte = make(120)

tree = grow(Xtr, ytr, 0, max_depth=2)
show(tree)
acc = lambda T, X, y: np.mean([predict(T, x) == t for x, t in zip(X, y)])
print("train accuracy:", round(acc(tree, Xtr, ytr), 3), " test accuracy:", round(acc(tree, Xte, yte), 3))` } },
      { note: '<b>Expected:</b> the first question is <code>x1 &lt; 0.71</code>, then train accuracy 0.825 and test accuracy 0.733. The true rule is "class 1 when x0 + x1 &gt; 1", a diagonal line, so the tree builds it from small steps. <b>Your task:</b> notice that one question has the same class (1) on both sides. Why can such a split still have a positive information gain?' }
    ] },
    { id: 'depth', title: 'Step 3: deeper is not always better', blocks: [
      { py: { title: 'Accuracy versus depth (run the cell above first)', code: String.raw`# (uses entropy, best_split, grow, predict and the data from the cell above: run that cell first)
def leaves(node):
    return 1 if not isinstance(node, tuple) else leaves(node[2]) + leaves(node[3])

print("depth  leaves  train   test")
for d in range(1, 9):
    T = grow(Xtr, ytr, 0, max_depth=d)
    print(f"{d:5d}  {leaves(T):6d}  {acc(T, Xtr, ytr):.3f}  {acc(T, Xte, yte):.3f}")` } },
      { note: '<b>Expected:</b> the training accuracy keeps rising (0.733 at depth 1 up to 0.967 at depth 8), but the test accuracy is best at depth 4 (0.783) and then falls to 0.725. Deep trees memorise the 10% noisy labels: that is <b>overfitting</b>. <b>Your task:</b> which depth would you choose, and which data should you use to choose it in a real project? (Hint: not the test set, see Lecture 4.)' }
    ] },
    { id: 'check', title: 'Check yourself', blocks: [
      { exercise: exEnt },
      { exercise: exGain },
      { exercise: exPredict }
    ] }
  ]
});
})();

(function () {
const K = Course.kit;
const Q = fn => F => { if (F.instant) { const P = Object.create(F); P.instant = true; return fn(P); } return fn(F); };

/* ---------- scene: the k-means loop (numbers are the real output of the cell in step 2) ---------- */
// cell output: iteration 0 inertia 2156.41, 1: 472.23, 2: 182.05, 3: 179.11, then converged
const sceneLoop = {
  id: 'loop', title: 'The k means loop', w: 720, h: 360,
  build(F) {
    K.title(F, 'What your code will do', 'start once, then repeat assign and update until nothing moves');
    F.s.start = F.box(110, 190, 150, 60, 'pick k random\npoints as centres', { size: 13 });
    F.s.as = F.box(330, 110, 150, 60, 'ASSIGN\nnearest centre', { size: 13, weight: 700, fill: 'var(--c-open)', stroke: 'var(--c-b)' });
    F.s.up = F.box(330, 270, 150, 60, 'UPDATE\ncentre = mean', { size: 13, weight: 700, fill: 'var(--c-closed)', stroke: 'var(--c-a)' });
    F.arrow(185, 182, 253, 136, { w: 2.5 });
    F.s.loopA = F.path('M405,125 C470,150 470,250 405,262', { stroke: 'var(--c-node-line)', 'stroke-width': 2.5, 'marker-end': F.arrowMarker('var(--c-node-line)') });
    F.s.loopB = F.path('M255,262 C190,250 190,150 255,125', { stroke: 'var(--c-node-line)', 'stroke-width': 2.5, 'marker-end': F.arrowMarker('var(--c-node-line)') });
    F.s.tok = F.g({ transform: 'translate(110,190)' }); F.s.tok.__t = { x: 110, y: 190, s: 1, r: 0 }; F.circle(0, 0, 9, { fill: 'var(--c-c)', stroke: '#fff', 'stroke-width': 2, filter: 'url(#fx-glow)' }, F.s.tok);
    F.rect(520, 90, 180, 170, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)' });
    F.text(610, 112, 'round', { size: 12.5, cls: 'soft' }); F.s.rd = F.text(610, 136, '–', { size: 22, weight: 800, mono: true });
    F.text(610, 172, 'inertia', { size: 12.5, cls: 'soft' }); F.s.in = F.text(610, 204, '–', { size: 26, weight: 800, mono: true, fill: 'var(--c-c)' });
    F.s.stop = K.callout(F, 610, 300, 'centres did not move:\nstop', { tone: 'ok', w: 180 });
  },
  steps: [
    { title: 'Start', say: ['First we pick k random data points as the starting centres.', 'Then we repeat two steps, assign and update.'],
      cues: [Q(async F => { await F.pulse(F.s.start, 1); }), Q(async F => { await F.to(F.s.tok, { tx: 330, ty: 110 }, 700); })] },
    { title: 'Round after round', say: ['Every round, each point joins its nearest centre, and each centre moves to the mean of its points.', 'In your run the inertia drops from about two thousand one hundred to four hundred seventy, then to one hundred eighty two.'],
      cues: [Q(async F => { F.set(F.s.tok, { tx: 330, ty: 110 }); F.setText(F.s.rd, '0', 610, 22); F.setText(F.s.in, '2156.41', 610, 26); await F.along(F.s.tok, F.s.loopA, 800); await F.along(F.s.tok, F.s.loopB, 800); }),
             Q(async F => { for (const [r, v] of [['1', '472.23'], ['2', '182.05']]) { F.setText(F.s.rd, r, 610, 22); F.setText(F.s.in, v, 610, 26); await F.along(F.s.tok, F.s.loopA, 600); await F.along(F.s.tok, F.s.loopB, 600); } })] },
    { title: 'Stop', say: ['In round three the inertia is one hundred seventy nine, and the centres no longer move. We stop.', 'Your task: run the code, then change k and the starting points, and watch what happens.'],
      cues: [Q(async F => { F.setText(F.s.rd, '3', 610, 22); F.setText(F.s.in, '179.11', 610, 26); F.set(F.s.tok, { tx: 330, ty: 110 }); await F.show(F.s.stop); }), Q(async F => { await F.pulse(F.s.as, 1); await F.pulse(F.s.up, 1); })] }
  ]
};

/* ---------- exercises ---------- */
const exNearest = {
  title: 'Which centre is nearest?', random: true,
  gen(r) {
    let P, Cs, d;
    do { P = [r.int(0, 9), r.int(0, 9)]; Cs = [0, 1, 2].map(() => [r.int(0, 9), r.int(0, 9)]); d = Cs.map(c => (c[0] - P[0]) ** 2 + (c[1] - P[1]) ** 2); } while (new Set(d).size < 3);
    const best = d.indexOf(Math.min(...d)), N = ['A', 'B', 'C'];
    return {
      prompt: `The point is <b>P = (${P})</b>. The centres are ${Cs.map((c, i) => `<b>${N[i]} = (${c})</b>`).join(', ')}. In the assign step, which centre does P join? Type A, B or C.`,
      hint: 'Compare squared distances: (x difference)² + (y difference)². You do not need the square root to find the smallest.',
      answer: Cs.map((c, i) => `${N[i]}: (${c[0]} − ${P[0]})² + (${c[1]} − ${P[1]})² = ${d[i]}`).join('<br>') + `<br>The smallest is <b>${N[best]}</b>.`,
      check: { type: 'text', answer: N[best], placeholder: 'A, B or C' }
    };
  }
};
const exInertia = {
  title: 'Compute the inertia', random: true,
  gen(r) {
    const mk = () => { const c = [r.int(1, 8), r.int(1, 8)]; return { c, pts: [0, 1].map(() => [c[0] + r.int(-2, 2), c[1] + r.int(-2, 2)]) }; };
    const A = mk(), B = mk();
    const parts = [], tot = [A, B].reduce((s, g) => s + g.pts.reduce((t, p) => { const v = (p[0] - g.c[0]) ** 2 + (p[1] - g.c[1]) ** 2; parts.push(`(${p}) to (${g.c}): ${v}`); return t + v; }, 0), 0);
    return {
      prompt: `Cluster A has centre (${A.c}) and points ${A.pts.map(p => `(${p})`).join(' and ')}. Cluster B has centre (${B.c}) and points ${B.pts.map(p => `(${p})`).join(' and ')}. What is the <b>inertia</b> (the sum of squared distances from every point to its own centre)?`,
      hint: 'For each of the four points: (x difference)² + (y difference)². Add the four numbers.',
      answer: parts.join('<br>') + `<br>Inertia = <b>${tot}</b>.`,
      check: { type: 'number', answer: tot, tol: 0.01 }
    };
  }
};
const exUpdate = {
  title: 'Where does the centre move?', random: true,
  gen(r) {
    const n = r.int(3, 4), pts = Array.from({ length: n }, () => [r.int(0, 10), r.int(0, 10)]), coord = r.pick([0, 1]);
    const m = pts.reduce((s, p) => s + p[coord], 0) / n;
    return {
      prompt: `After the assign step, these ${n} points belong to one cluster: ${pts.map(p => `(${p})`).join(', ')}. In the update step, what is the new <b>${coord ? 'y' : 'x'} coordinate</b> of its centre? Give two decimals.`,
      hint: `The new centre is the mean of the points. Average the ${coord ? 'second' : 'first'} numbers.`,
      answer: `(${pts.map(p => p[coord]).join(' + ')}) / ${n} = <b>${(Math.round(m * 100) / 100).toFixed(2)}</b>.`,
      check: { type: 'number', answer: Math.round(m * 100) / 100, tol: 0.011 }
    };
  }
};

Course.lecture({
  id: 'lab04', num: 4, week: 4, kind: 'lab', title: 'Clustering with k means',
  lede: 'Write k means yourself in a few lines of numpy, watch the inertia fall, find the elbow, and see how a bad start can trap the algorithm.',
  clos: [2],
  goals: ['generate a clustered data set with numpy and look at it', 'implement the <b>assign</b> and <b>update</b> steps of k means', 'use the <b>inertia</b> and the elbow to choose k', 'show that a bad starting point gives a worse answer, and fix it with several restarts'],
  chapters: [
    { id: 'plan', title: 'The plan', blocks: [
      { html: '<p>All code runs in your browser (Python with numpy). Press <b>▶ Run</b> in each cell, read the output, then do the small task under it. The first run loads Python, which takes a few seconds.</p>' },
      { scene: sceneLoop }
    ] },
    { id: 'data', title: 'Step 1: make some data', blocks: [
      { py: { title: 'Three groups of points', code: String.raw`import numpy as np
np.random.seed(0)

# three groups of points around three centres
centres = np.array([[1.0, 1.5], [8.0, 2.0], [8.0, 6.5]])
X = np.vstack([c + np.random.randn(30, 2) for c in centres])
print("data shape:", X.shape)          # 90 points, 2 numbers each
print("first 3 points:\n", X[:3].round(2))
print("mean of all points:", X.mean(axis=0).round(2))

def show(X, labels=None, C=None, w=40, h=14):
    """Draw the points as text. Each point is a letter (its cluster) and each centre is #."""
    grid = [[' '] * w for _ in range(h)]
    lo, hi = X.min(axis=0), X.max(axis=0)
    def cell(p):
        c = int((p[0] - lo[0]) / (hi[0] - lo[0] + 1e-9) * (w - 1))
        r = int((hi[1] - p[1]) / (hi[1] - lo[1] + 1e-9) * (h - 1))
        return min(max(r, 0), h - 1), min(max(c, 0), w - 1)
    for i, p in enumerate(X):
        r, c = cell(p)
        grid[r][c] = '.' if labels is None else 'ABCDEFGH'[labels[i]]
    if C is not None:
        for p in C:
            r, c = cell(p)
            grid[r][c] = '#'
    print('\n'.join(''.join(row) for row in grid))

show(X)` } },
      { note: '<b>Expected:</b> <code>data shape: (90, 2)</code> and a text picture with three groups of dots. <b>Your task:</b> change the second centre from <code>[8.0, 2.0]</code> to <code>[3.0, 2.0]</code> and run again. Can you still see three groups?' }
    ] },
    { id: 'run', title: 'Step 2: k means in numpy', blocks: [
      { html: '<p><code>assign</code> computes all point-to-centre distances at once with broadcasting (shape <code>(90, 3)</code>) and takes the index of the smallest. <code>update</code> replaces each centre by the mean of its points.</p>' },
      { py: { title: 'Assign, update, repeat', code: String.raw`import numpy as np
np.random.seed(0)
centres = np.array([[1.0, 1.5], [8.0, 2.0], [8.0, 6.5]])
X = np.vstack([c + np.random.randn(30, 2) for c in centres])

def show(X, labels=None, C=None, w=40, h=14):
    """Draw the points as text. Each point is a letter (its cluster) and each centre is #."""
    grid = [[' '] * w for _ in range(h)]
    lo, hi = X.min(axis=0), X.max(axis=0)
    def cell(p):
        c = int((p[0] - lo[0]) / (hi[0] - lo[0] + 1e-9) * (w - 1))
        r = int((hi[1] - p[1]) / (hi[1] - lo[1] + 1e-9) * (h - 1))
        return min(max(r, 0), h - 1), min(max(c, 0), w - 1)
    for i, p in enumerate(X):
        r, c = cell(p)
        grid[r][c] = '.' if labels is None else 'ABCDEFGH'[labels[i]]
    if C is not None:
        for p in C:
            r, c = cell(p)
            grid[r][c] = '#'
    print('\n'.join(''.join(row) for row in grid))

def assign(X, C):
    # squared distance from every point to every centre: shape (n_points, k)
    d2 = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    return d2.argmin(axis=1)               # index of the nearest centre

def update(X, labels, C):
    newC = C.copy()
    for j in range(len(C)):
        members = X[labels == j]
        if len(members) > 0:               # keep the old centre if nobody joined
            newC[j] = members.mean(axis=0)
    return newC

def inertia(X, labels, C):
    return ((X - C[labels]) ** 2).sum()

k = 3
np.random.seed(1)
C = X[np.random.choice(len(X), k, replace=False)]   # k random points as start
for it in range(10):
    labels = assign(X, C)
    print(f"iteration {it}: inertia = {inertia(X, labels, C):.2f}")
    newC = update(X, labels, C)
    if np.allclose(newC, C):
        print("converged: the centres did not move")
        break
    C = newC
print("centres:\n", C.round(2))
show(X, labels, C)               # letters = clusters, # = centres` } },
      { note: '<b>Expected:</b> inertia 2156.41, 472.23, 182.05, 179.11, then "converged", and a picture with the letters A, B, C and a # at each centre. <b>Your task:</b> set <code>k = 2</code>, then <code>k = 5</code>. What happens to the inertia and to the picture?' }
    ] },
    { id: 'k', title: 'Step 3: choosing k, and bad starts', blocks: [
      { py: { title: 'The elbow and a bad start', code: String.raw`import numpy as np
np.random.seed(0)
centres = np.array([[1.0, 1.5], [8.0, 2.0], [8.0, 6.5]])
X = np.vstack([c + np.random.randn(30, 2) for c in centres])

def kmeans(X, C, steps=50):
    for _ in range(steps):
        labels = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        newC = np.array([X[labels == j].mean(axis=0) if np.any(labels == j) else C[j] for j in range(len(C))])
        if np.allclose(newC, C):
            break
        C = newC
    return C, labels, ((X - C[labels]) ** 2).sum()

# 1) the elbow: best of 5 random starts for each k
for k in range(1, 7):
    best = min(kmeans(X, X[np.random.RandomState(s).choice(len(X), k, replace=False)])[2] for s in range(5))
    print(f"k = {k}: inertia = {best:7.2f}  " + "#" * int(best / 25))

# 2) a bad start: two centres in the left group, one in a right group
C, labels, J = kmeans(X, X[[0, 1, 30]].copy())
print("\nbad start  -> inertia", round(J, 2), " cluster sizes", np.bincount(labels, minlength=3))
C, labels, J = kmeans(X, X[[0, 30, 60]].copy())
print("good start -> inertia", round(J, 2), " cluster sizes", np.bincount(labels, minlength=3))` } },
      { note: '<b>Expected:</b> the inertia falls fast from k = 1 to k = 3 (1580.00, 462.83, 179.11) and then only slowly (153.52, 130.76, 111.15): the <b>elbow</b> is at k = 3. The bad start ends with inertia 443.65 and cluster sizes 15, 15, 60: two centres share the left group and one centre covers both right groups. The good start gets 179.11. <b>Your task:</b> explain in one sentence why k means cannot escape from the bad start. (Hint: every step can only lower the inertia.)' },
      { deeper: { title: 'k means plus plus', html: '<p>The usual fix is a smarter start: pick the first centre at random, then pick each next centre with a probability proportional to its squared distance from the nearest centre already chosen. Far-away points are likely, so the centres start spread out. Together with a few restarts (keep the run with the lowest inertia), this is what libraries such as scikit-learn do by default.</p>' } }
    ] },
    { id: 'check', title: 'Check yourself', blocks: [
      { exercise: exNearest },
      { exercise: exUpdate },
      { exercise: exInertia }
    ] }
  ]
});
})();

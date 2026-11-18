(function () {
const K = Course.kit;
/* All Python cells below were run with numpy before publishing. Cells share one Python session: run them in order. */

async function blink(F, el, n = 1) { if (F.instant) return; for (let i = 0; i < n; i++) { await F.to(el, { opacity: 0.3 }, 220); await F.to(el, { opacity: 1 }, 260); } }
function spark(F, x1, y1, x2, y2, color, ms) {
  if (F.instant) return Promise.resolve();
  const c = F.circle(x1, y1, 6, { fill: color, stroke: 'var(--fig-bg)', 'stroke-width': 1.5, filter: 'url(#fx-glow)' });
  const tk = F.token, t0 = performance.now();
  return new Promise(res => { const f = now => { if (tk !== F.token) { c.remove(); return; } const p = Math.min(1, (now - t0) / ms); c.setAttribute('cx', x1 + (x2 - x1) * p); c.setAttribute('cy', y1 + (y2 - y1) * p); if (p < 1) requestAnimationFrame(f); else { c.remove(); res(); } }; requestAnimationFrame(f); });
}

/* ---------- scene: the lab pipeline, mapped to the code ---------- */
const sceneFrozen = {
  id: 'pipeline', title: 'Frozen backbone, trainable head', w: 900, h: 340, wide: true,
  build(F) {
    K.title(F, 'What the code in cell 4 does', 'backbone(images, filters) is frozen · train_head(F, y) learns only w and b');
    const mini = (x, y, vertical) => { const g = F.g({ transform: `translate(${x},${y})` }); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const on = vertical ? (j === 3 && i > 0 && i < 7) : (i === 4 && j > 0 && j < 7); F.rect(j * 9, i * 9, 8, 8, { rx: 1.5, fill: on ? 'var(--c-path)' : 'var(--c-node)' }, g); } return g; };
    F.s.img1 = mini(30, 90, true); F.s.img2 = mini(30, 190, false);
    F.text(66, 280, '8 × 8 images', { size: 12, cls: 'soft' });
    F.s.bb = F.box(270, 180, 210, 150, 'BACKBONE (frozen)\n\nconv with 2 line filters\nReLU\nmax and mean of each map', { fill: 'var(--c-grid)', stroke: 'var(--c-soft)', size: 12.5, weight: 700 });
    F.s.lock = F.text(270, 92, '🔒 weights do not change', { size: 12.5, weight: 700, cls: 'soft' });
    F.s.feat = F.g({}); F.s.feat.style.opacity = 0;
    for (let i = 0; i < 4; i++) F.rect(450, 132 + i * 26, 40, 20, { rx: 5, fill: 'var(--accent2-bg)', stroke: 'var(--accent2)' }, F.s.feat);
    F.text(470, 248, '4 features', { size: 12, cls: 'soft' }, F.s.feat);
    F.s.head = F.box(640, 180, 170, 90, 'HEAD (trained)\nlogistic regression\n4 weights + 1 bias', { fill: 'var(--c-cur)', stroke: 'var(--c-c)', size: 12.5, weight: 700 }); F.s.head.style.opacity = 0;
    F.s.out = F.box(820, 180, 110, 44, 'vertical or\nhorizontal?', { fill: 'var(--c-goal)', size: 12, weight: 700 }); F.s.out.style.opacity = 0;
    F.s.res = K.callout(F, 450, 312, 'test accuracy with 20 training images: line filters 0.97 · random filters 0.90 · raw pixels 0.58', { tone: 'ok', w: 700 });
  },
  steps: [
    { title: 'Tiny dataset', say: ['We have only twenty small noisy images: vertical bars and horizontal bars.', 'That is far too little to train a whole network from zero.'],
      cues: [async F => { await F.pulse(F.s.img1, 1); await F.pulse(F.s.img2, 1); }, async F => { await blink(F, F.s.img1, 1); }] },
    { title: 'A frozen backbone', say: ['The backbone is fixed. Two line filters slide over each image, and we keep the largest and the average response of each map.', 'This plays the role of a pretrained network: it already knows how to see lines.'],
      cues: [async F => { await spark(F, 110, 135, 165, 160, 'var(--c-b)', 500); await spark(F, 110, 235, 165, 200, 'var(--c-b)', 500); await F.show(F.s.feat); }, async F => { await F.pulse(F.s.bb, 1); }] },
    { title: 'Train only the head', say: ['On top we put a small head: logistic regression with four weights and one bias.', 'Gradient descent changes only these five numbers.'],
      cues: [async F => { await F.show(F.s.head); await spark(F, 495, 180, 555, 180, 'var(--c-b)', 400); await F.show(F.s.out); }, async F => { await F.pulse(F.s.head, 2); }] },
    { title: 'Good features matter', say: ['With the line filters, the head reaches about ninety seven percent on new images. Random frozen filters reach about ninety, and raw pixels only fifty eight.', 'The quality of the frozen features decides how well a small dataset can be used.'],
      cues: [async F => { await F.show(F.s.res); }, async F => { await blink(F, F.s.res, 1); }] }
  ]
};

/* ---------- check-yourself (revision) exercises ---------- */
const tbl = M => '<table class="mini">' + M.map(r => '<tr>' + r.map(v => `<td style="text-align:center;min-width:26px">${v}</td>`).join('') + '</tr>').join('') + '</table>';
const exConv = {
  title: 'Predict one value of conv2d', random: true,
  gen(r) {
    const P = [0, 1, 2].map(() => [0, 1, 2].map(() => r.int(0, 3))), Kk = r.pick([[[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], [[-1, 2, -1], [-1, 2, -1], [-1, 2, -1]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]], [[-1, -1, -1], [2, 2, 2], [-1, -1, -1]]]);
    let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += P[a][b] * Kk[a][b];
    return { prompt: `<code>np.sum(patch * k)</code> is what <code>conv2d</code> computes at one position. What is it for these arrays?<div style="display:flex;gap:28px;flex-wrap:wrap"><div><b>patch</b>${tbl(P)}</div><div><b>k</b>${tbl(Kk)}</div></div>`,
      hint: '<code>patch * k</code> multiplies number by number (not a matrix product). Then add all nine.', answer: `Sum of the nine products = <b>${s}</b>.`, check: { type: 'number', answer: s, tol: 0.01 } };
  }
};
const exShape = {
  title: 'Shapes through a small CNN', random: true,
  gen(r) {
    const n = r.pick([8, 10, 12, 16, 28, 32]), k = r.pick([3, 5]);
    if ((n - k + 1) % 2) return this.gen(r);
    const c = n - k + 1, p = c / 2;
    return { prompt: `An image of ${n} × ${n} pixels goes through <code>conv2d</code> with a ${k} × ${k} filter (no padding, stride 1), then ReLU, then <code>maxpool2</code>. What is the width of the result?`,
      hint: 'conv2d: n − k + 1. ReLU keeps the shape. maxpool2 halves it.', answer: `${n} − ${k} + 1 = ${c}; ReLU keeps ${c}; pooling halves it: <b>${p}</b>.`, check: { type: 'number', answer: p, tol: 0.01 } };
  }
};
const exConvParams = {
  title: 'Weights in a convolutional layer', random: true,
  gen(r) {
    const k = r.pick([3, 5]), cin = r.pick([1, 3, 16, 32]), cout = r.pick([8, 16, 32, 64]), p = k * k * cin * cout + cout;
    return { prompt: `A convolutional layer has ${cout} filters of size ${k} × ${k}. Its input has ${cin} channel${cin > 1 ? 's' : ''} (for example ${cin === 3 ? 'red, green, blue' : 'feature maps'}). Each filter covers all input channels and has one bias. How many weights does the layer learn?`,
      hint: 'One filter has k × k × (input channels) weights plus 1 bias. Multiply by the number of filters.', answer: `${k}·${k}·${cin}·${cout} + ${cout} = <b>${p}</b>. Note: this does not depend on the image size. That is weight sharing.`, check: { type: 'number', answer: p, tol: 0.01 } };
  }
};
const exHead = {
  title: 'Trainable numbers in transfer learning', random: true,
  gen(r) {
    const d = r.pick([4, 18, 512, 2048]), c = r.pick([1, 3, 5, 10]), p = c === 1 ? d + 1 : d * c + c;
    return { prompt: `A frozen backbone gives ${d} features per image. The new head is ${c === 1 ? 'logistic regression (one output)' : 'a dense layer with ' + c + ' outputs'} with biases. How many numbers are trained?`,
      hint: 'features × outputs + one bias per output.', answer: `${d} × ${c} + ${c} = <b>${p}</b>.${d === 4 ? ' That is exactly our lab head: 4 weights and 1 bias.' : ''}`, check: { type: 'number', answer: p, tol: 0.01 } };
  }
};

/* ---------- personal lab sheet (hand in): tasks and challenges generated from the student ID ---------- */
const convJS = (img, k) => { const n = img.length, m = n - 2, out = []; for (let i = 0; i < m; i++) { out.push([]); for (let j = 0; j < m; j++) { let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += img[i + a][j + b] * k[a][b]; out[i].push(s); } } return out; };
const PY_CONV = String.raw`import numpy as np

def conv2d(img, k):
    """Slide the filter k over the image (no padding, stride 1): multiply and add."""
    H, W = img.shape
    kh, kw = k.shape
    out = np.zeros((H - kh + 1, W - kw + 1))
    for i in range(out.shape[0]):
        for j in range(out.shape[1]):
            out[i, j] = np.sum(img[i:i + kh, j:j + kw] * k)
    return out

def relu(x):
    return np.maximum(0, x)

def maxpool2(x):
    """2 x 2 max pooling with stride 2 (an odd last row or column is dropped)."""
    H, W = x.shape
    return x[:H // 2 * 2, :W // 2 * 2].reshape(H // 2, 2, W // 2, 2).max(axis=(1, 3))
`;
const PY_IMGS = B => String.raw`import numpy as np
rng = np.random.default_rng(${B.ds})

def make_image(kind, rng):
    """8 x 8 noisy image with a vertical bar (kind 0) or a horizontal bar (kind 1)."""
    im = np.zeros((8, 8))
    pos, start, length = rng.integers(1, 7), rng.integers(0, 3), rng.integers(4, 7)
    if kind == 0:
        im[start:start + length, pos] = 1
    else:
        im[pos, start:start + length] = 1
    return im + ${B.noise} * rng.standard_normal((8, 8))

def make_set(n, rng):
    y = np.arange(n) % 2
    return np.array([make_image(k, rng) for k in y]), y

def relu(x):
    return np.maximum(0, x)

def backbone(images, filters):
    """Frozen feature extractor: convolution, ReLU, then the max and the mean of each map."""
    win = np.lib.stride_tricks.sliding_window_view(images, (3, 3), axis=(1, 2))
    feats = []
    for k in filters:
        maps = relu(np.einsum("nijab,ab->nij", win, k))
        feats += [maps.max(axis=(1, 2)), maps.mean(axis=(1, 2))]
    return np.column_stack(feats)

def train_head(F, y, epochs=2000, lr=0.5):
    """The new head: logistic regression. Only w and b change."""
    mu, sd = F.mean(0), F.std(0) + 1e-9
    Z = (F - mu) / sd
    w, b = np.zeros(F.shape[1]), 0.0
    for _ in range(epochs):
        p = 1 / (1 + np.exp(-(Z @ w + b)))
        w -= lr * Z.T @ (p - y) / len(y)
        b -= lr * np.mean(p - y)
    return lambda G: (1 / (1 + np.exp(-(((G - mu) / sd) @ w + b))) > 0.5).astype(int)

def test_right(head, G):
    return int((head(G) == y_test).sum())
`;
const FILTERS8 = [
  { name: 'an edge filter', py: '[[-1, 0, 1]] * 3' },
  { name: 'a blur filter (all ones)', py: '[[1, 1, 1]] * 3' },
  { name: 'a diagonal line filter', py: '[[2, -1, -1], [-1, 2, -1], [-1, -1, 2]]' },
  { name: 'a weak line filter', py: '[[0, 1, 0]] * 3' },
  { name: 'a dot filter', py: '[[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]' }
];
const SHEET8 = {
  title: 'My personal lab sheet: CNNs and transfer learning', marks: 10,
  intro: 'The numbers below are <b>personal</b>: they are generated from your student ID, so your image, your filter, your data set and your answers differ from those of your classmates. Every cell is complete on its own. Run each code cell (press ▶ Run), copy the results into the answer boxes, add a screenshot if you like, and finally download your sheet as <b>Word</b> or <b>PDF</b> and upload it to Moodle.',
  base(r) {
    // a personal image and filter with ONE largest value in the feature map
    let n, img, k, fm, flat, mx, pos;
    do { n = r.pick([6, 7, 8]); img = Array.from({ length: n }, () => Array.from({ length: n }, () => r.int(0, 4)));
      do { k = [0, 1, 2].map(() => [0, 1, 2].map(() => r.int(-1, 2))); } while (!k.flat().some(v => v < 0) || !k.flat().some(v => v > 0));
      fm = convJS(img, k); flat = fm.flat(); mx = Math.max(...flat);
    } while (flat.filter(v => v === mx).length !== 1 || !flat.some(v => v < 0));
    const m = n - 2; do { pos = [r.int(0, m - 1), r.int(0, m - 1)]; } while (fm[pos[0]][pos[1]] === mx);   // not the largest value (asked separately)
    const ds = r.int(1, 999), noise = r.pick([0.3, 0.35, 0.4, 0.45]), small = r.pick([10, 14, 20, 24]), rs = r.int(1, 999);
    const filt = r.pick(FILTERS8), sizes = [r.pick([6, 8, 10]), r.pick([30, 40, 50]), r.pick([150, 200])];
    return { n, img, k, pos, ds, noise, small, rs, filt, sizes };
  },
  tasks: [
    { id: 't1', title: 'Convolve your image', marks: 1.5, gen(r, B) {
      const code = PY_CONV + `
img = np.array(${JSON.stringify(B.img)})     # your ${B.n} x ${B.n} image
k = np.array(${JSON.stringify(B.k)})         # your 3 x 3 filter
fmap = conv2d(img, k)
print("feature map shape:", fmap.shape)
print(fmap)
print("value at row ${B.pos[0]}, column ${B.pos[1]}:", fmap[${B.pos[0]}, ${B.pos[1]}])
i, j = np.unravel_index(fmap.argmax(), fmap.shape)
print("largest value:", fmap.max(), "at row", i, "column", j)
`;
      return { html: `<p>Your image is ${B.n} × ${B.n} pixels and your filter is 3 × 3 (both are in the cell). Run the convolution (no padding, stride 1). Report the shape of the feature map, its value at row <b>${B.pos[0]}</b>, column <b>${B.pos[1]}</b> (counting from 0), and the largest value with its position. Check the value at row ${B.pos[0]}, column ${B.pos[1]} by hand: write the nine products.</p>`, code,
        fields: [{ k: 'shape', label: 'Feature map shape, for example (4, 4)', type: 'text' }, { k: 'v', label: `Value at row ${B.pos[0]}, column ${B.pos[1]}`, type: 'num' }, { k: 'hand', label: 'Your hand check (the nine products and their sum)', type: 'long' }, { k: 'max', label: 'Largest value and its row, column', type: 'text' }],
        key: code.replace('print("feature map shape:", fmap.shape)\nprint(fmap)', 'print("ANS shape", fmap.shape)').replace(`print("value at row ${B.pos[0]}, column ${B.pos[1]}:",`, 'print("ANS value",').replace('print("largest value:", fmap.max(), "at row", i, "column", j)', 'print("ANS largest", fmap.max(), "row", i, "column", j)') }; } },
    { id: 't2', title: 'ReLU and pooling of your map', marks: 1.5, gen(r, B) {
      const code = PY_CONV + `
img = np.array(${JSON.stringify(B.img)})
k = np.array(${JSON.stringify(B.k)})
fmap = conv2d(img, k)
act = relu(fmap)
print("values set to 0 by ReLU:", int((fmap < 0).sum()))
pooled = maxpool2(act)
print("after pooling, shape:", pooled.shape)
print(pooled)
print("sum of the pooled values:", pooled.sum())
`;
      return { html: `<p>Apply ReLU to your feature map from Task 1, then 2 × 2 max pooling. Report how many values ReLU set to 0, the shape after pooling, the pooled values, and their sum.${B.n === 7 ? ' Your feature map has an odd size: explain in the last box what pooling does with the last row and column.' : ''}</p>`, code,
        fields: [{ k: 'z', label: 'Values set to 0 by ReLU', type: 'num' }, { k: 'shape', label: 'Shape after pooling', type: 'text' }, { k: 'pool', label: 'The pooled values (row by row)', type: 'long' }, { k: 'sum', label: 'Sum of the pooled values', type: 'num' }].concat(B.n === 7 ? [{ k: 'odd', label: 'What happens to the last row and column?', type: 'long' }] : []),
        key: code.replace('print("values set to 0 by ReLU:",', 'print("ANS relu_zeros",').replace('print("after pooling, shape:", pooled.shape)\nprint(pooled)', 'print("ANS pooled_shape", pooled.shape); print("ANS pooled", pooled.tolist())').replace('print("sum of the pooled values:",', 'print("ANS pooled_sum",'),
        note: 'Only negative values count as "set to 0" (values that are already 0 stay 0). For a 5 × 5 map the last row and column are dropped by maxpool2.' }; } },
    { id: 't3', title: 'Frozen line filters on your data set', marks: 1.5, gen(r, B) {
      const code = PY_IMGS(B) + `
X_small, y_small = make_set(${B.small}, rng)     # only ${B.small} labelled images
X_test, y_test = make_set(400, rng)

line_v = np.array([[-1, 2, -1]] * 3)
good = [line_v, line_v.T]
head = train_head(backbone(X_small, good), y_small)
print("line filters: test right", test_right(head, backbone(X_test, good)), "of 400")

head_px = train_head(X_small.reshape(len(X_small), -1), y_small)
print("raw pixels  : test right", test_right(head_px, X_test.reshape(400, -1)), "of 400")
`;
      return { html: `<p>Your data set has noise <b>${B.noise}</b> and seed <b>${B.ds}</b>, with only <b>${B.small}</b> training images and 400 test images. Train the head on the frozen line filters, and a second head on the raw pixels. Report how many of the 400 test images each one gets right.</p>`, code,
        fields: [{ k: 'line', label: 'Line filters: test images right (out of 400)', type: 'num' }, { k: 'px', label: 'Raw pixels: test images right (out of 400)', type: 'num' }],
        key: code.replace('print("line filters: test right",', 'print("ANS line_filters_right",').replace('print("raw pixels  : test right",', 'print("ANS raw_pixels_right",'),
        note: 'Different numpy versions may flip one or two test images near the boundary: accept answers within 2 of the key.' }; } },
    { id: 't4', title: 'Random frozen filters', marks: 1.5, gen(r, B) {
      const code = PY_IMGS(B) + `
X_small, y_small = make_set(${B.small}, rng)
X_test, y_test = make_set(400, rng)

r = np.random.default_rng(${B.rs})               # your random filters
rand = [r.standard_normal((3, 3)) for _ in range(2)]
F = backbone(X_small, rand)
print("features of the first training image:", F[0].round(3))
head_r = train_head(F, y_small)
print("random filters: test right", test_right(head_r, backbone(X_test, rand)), "of 400")
`;
      return { html: `<p>Same data as Task 3, but now the frozen backbone uses two <b>random</b> filters made with seed <b>${B.rs}</b>. Report the four features (max and mean of each map) of the first training image, and how many test images the head gets right. Is it better or worse than the line filters of Task 3?</p>`, code,
        fields: [{ k: 'f', label: 'Four features of the first image (3 decimals)', type: 'text' }, { k: 'rnd', label: 'Random filters: test images right (out of 400)', type: 'num' }, { k: 'cmp', label: 'Better or worse than the line filters?', type: 'text' }],
        key: code.replace('print("features of the first training image:", F[0].round(3))', 'print("ANS features_first_image", F[0].round(3).tolist())').replace('print("random filters: test right",', 'print("ANS random_filters_right",'),
        note: 'Accept test counts within 2 of the key. Compare with the line_filters_right value of Task 3.' }; } },
    { id: 'c1', kind: 'challenge', title: 'Your own backbone filter', marks: 2, gen(r, B) {
      const head = PY_IMGS(B) + `
X_small, y_small = make_set(${B.small}, rng)
X_test, y_test = make_set(400, rng)
`;
      const code = head + `
line_v = np.array([[-1, 2, -1]] * 3)    # CHANGE THIS LINE to your filter
filters = [line_v, line_v.T]
head = train_head(backbone(X_small, filters), y_small)
print("test right", test_right(head, backbone(X_test, filters)), "of 400")
`;
      const key = head + `
for name, kv in [("line", np.array([[-1, 2, -1]] * 3)), ("yours", np.array(${B.filt.py}))]:
    filters = [kv, kv.T]
    head = train_head(backbone(X_small, filters), y_small)
    print("ANS", name, "test_right", test_right(head, backbone(X_test, filters)))
`;
      return { html: `<p>Same data as Task 3. Replace the line filter by <b>${B.filt.name}</b>: <code>line_v = np.array(${B.filt.py})</code> (the second filter is its transpose). Report how many test images the head gets right with your filter. Then explain in two sentences, with your numbers and those of Task 3: why does the choice of the frozen filter matter so much when you have only ${B.small} training images?</p>`, code,
        fields: [{ k: 'right', label: 'Your filter: test images right (out of 400)', type: 'num' }, { k: 'why', label: 'Your explanation (two sentences)', type: 'long' }, { k: 'code', label: 'Your changed line (paste your code)', type: 'code' }], key,
        note: 'Accept counts within 2 of the key. The explanation: the head only sees what the frozen filters measure; a filter that does not respond to thin bars (or responds the same way to both kinds) gives features that do not separate the classes, and a few images cannot fix that because the backbone is not trained.' }; } },
    { id: 'c2', kind: 'challenge', title: 'How much data do raw pixels need?', marks: 2, gen(r, B) {
      const head = PY_IMGS(B) + `
X_all, y_all = make_set(${B.sizes[2]}, rng)      # a pool of training images
X_test, y_test = make_set(400, rng)
good = [np.array([[-1, 2, -1]] * 3), np.array([[-1, 2, -1]] * 3).T]
`;
      const code = head + `
for n in ${JSON.stringify(B.sizes)}:
    Xs, ys = X_all[:n], y_all[:n]                # the first n images
    # YOUR CODE HERE: train one head on backbone(Xs, good) and one head on the raw pixels,
    # then print n and the test images right for both
    pass
`;
      const key = head + `
for n in ${JSON.stringify(B.sizes)}:
    Xs, ys = X_all[:n], y_all[:n]
    h1 = train_head(backbone(Xs, good), ys)
    h2 = train_head(Xs.reshape(n, -1), ys)
    print("ANS n", n, "line_filters", test_right(h1, backbone(X_test, good)), "raw_pixels", test_right(h2, X_test.reshape(400, -1)))
`;
      return { html: `<p>Finish the loop: for <b>${B.sizes.join(', ')}</b> training images, train one head on the frozen line filters and one head on the raw pixels, and print the test images right (out of 400) for both. Report your table. In two sentences: do the raw pixels catch up when there is more data, and why do the frozen features need so few images?</p>`, code,
        fields: [{ k: 'tab', label: 'Your table: n, line filters right, raw pixels right', type: 'long' }, { k: 'why', label: 'Your explanation (two sentences)', type: 'long' }, { k: 'code', label: 'Your finished loop (paste your code)', type: 'code' }], key,
        note: 'Accept counts within 2 of the key. The max over a feature map ignores where the bar is, so the head has only 4 inputs to learn; raw pixels must learn every position separately and need much more data.' }; } }
  ]
};

Course.lecture({
  id: 'lab08', num: 8, week: 8, kind: 'lab', title: 'CNNs and transfer learning (revision lab)',
  lede: 'Write a convolution with two loops, check it against the lecture numbers, add ReLU and pooling, and then do transfer learning in miniature: a frozen feature extractor and a tiny trainable head that learns from only twenty images.',
  clos: [2], widgets: ['conv'],
  goals: ['implement <code>conv2d</code>, ReLU and 2 × 2 max pooling with numpy and verify them by hand',
    'predict the shape of a feature map after convolution and pooling',
    'build a <b>frozen backbone</b> and train only a <b>head</b> on a tiny dataset',
    'compare good features, random features and raw pixels, and explain the result'],
  chapters: [
    { id: 'conv', title: 'Convolution in ten lines', blocks: [
      { html: '<p>Press <b>▶ Run</b> on each cell <b>in order</b>. The image is the one from the lecture: a short bright bar. The filter <code>k_vert</code> has −1 on the left and +1 on the right.</p>' },
      { py: { title: 'Cell 1 · conv2d by hand', code: `import numpy as np

def conv2d(img, k):
    """Slide the filter k over the image (no padding, stride 1): multiply and add."""
    H, W = img.shape
    kh, kw = k.shape
    out = np.zeros((H - kh + 1, W - kw + 1))
    for i in range(out.shape[0]):
        for j in range(out.shape[1]):
            out[i, j] = np.sum(img[i:i + kh, j:j + kw] * k)
    return out

img = np.array([[0, 0, 1, 1, 0, 0]] * 4 + [[0, 0, 0, 0, 0, 0]] * 2)
k_vert = np.array([[-1, 0, 1]] * 3)
fmap = conv2d(img, k_vert)
print(img)
print("feature map:")
print(fmap)
` } },
      { note: '<b>Expected output.</b> The feature map is<br><code>[[ 3.  3. -3. -3.]<br> [ 3.  3. -3. -3.]<br> [ 2.  2. -2. -2.]<br> [ 1.  1. -1. -1.]]</code><br>exactly the numbers from the lecture animation.' },
      { note: '<b>Your task.</b> Before you run it, predict the output for the horizontal edge filter <code>k_vert.T</code> (−1 on top, +1 at the bottom). Then add <code>print(conv2d(img, k_vert.T))</code> and check. Hint: this filter compares the row below with the row above. Only the bottom end of the bar responds, with <i>negative</i> numbers (bright above, dark below): rows 3 and 4 of the map become <code>[-1. -2. -2. -1.]</code>.' },
      { exercise: exConv }
    ] },
    { id: 'pool', title: 'ReLU and pooling', blocks: [
      { py: { title: 'Cell 2 · ReLU and max pooling', code: `def relu(x):
    return np.maximum(0, x)

def maxpool2(x):
    """2 x 2 max pooling with stride 2."""
    H, W = x.shape
    return x[:H // 2 * 2, :W // 2 * 2].reshape(H // 2, 2, W // 2, 2).max(axis=(1, 3))

print("after ReLU:")
print(relu(fmap))
print("after 2 x 2 max pooling:")
print(maxpool2(relu(fmap)))
` } },
      { note: '<b>Expected output.</b> After ReLU the negative column pairs become 0. After pooling: <code>[[3. 0.] [2. 0.]]</code>. The <code>reshape(H//2, 2, W//2, 2)</code> trick groups every 2 × 2 block so that one <code>max</code> handles them all.' },
      { exercise: exShape },
      { widget: 'conv' }
    ] },
    { id: 'transfer', title: 'Transfer learning in miniature', blocks: [
      { html: '<p>A real pretrained network has millions of weights. To keep the lab light, our "backbone" is two hand-made line filters: they play the role of features learned earlier on other data. We freeze them and train only the head.</p>' },
      { py: { title: 'Cell 3 · a tiny image dataset', code: `rng = np.random.default_rng(0)

def make_image(kind, rng):
    """8 x 8 noisy image with a vertical bar (kind 0) or a horizontal bar (kind 1)."""
    im = np.zeros((8, 8))
    pos, start, length = rng.integers(1, 7), rng.integers(0, 3), rng.integers(4, 7)
    if kind == 0:
        im[start:start + length, pos] = 1
    else:
        im[pos, start:start + length] = 1
    return im + 0.35 * rng.standard_normal((8, 8))

def make_set(n, rng):
    y = np.arange(n) % 2
    return np.array([make_image(k, rng) for k in y]), y

X_small, y_small = make_set(20, rng)     # only 20 labelled images to learn from
X_test, y_test = make_set(400, rng)
print("small training set:", X_small.shape, "  test set:", X_test.shape)
print(np.round(X_small[0], 1))
` } },
      { note: '<b>Expected output.</b> <code>small training set: (20, 8, 8)   test set: (400, 8, 8)</code> and one noisy 8 × 8 image. Can you see the bar in the numbers? (Look for a column or row of values near 1.)' },
      { scene: sceneFrozen },
      { py: { title: 'Cell 4 · frozen backbone + new head', code: `def backbone(images, filters):
    """Frozen feature extractor: convolution, ReLU, then the max and the mean of each map."""
    win = np.lib.stride_tricks.sliding_window_view(images, (3, 3), axis=(1, 2))   # (n, 6, 6, 3, 3)
    feats = []
    for k in filters:
        maps = relu(np.einsum("nijab,ab->nij", win, k))
        feats += [maps.max(axis=(1, 2)), maps.mean(axis=(1, 2))]
    return np.column_stack(feats)

def train_head(F, y, epochs=2000, lr=0.5):
    """The new head: logistic regression, trained by gradient descent. Only w and b change."""
    mu, sd = F.mean(0), F.std(0) + 1e-9
    Z = (F - mu) / sd
    w, b = np.zeros(F.shape[1]), 0.0
    for _ in range(epochs):
        p = 1 / (1 + np.exp(-(Z @ w + b)))
        w -= lr * Z.T @ (p - y) / len(y)
        b -= lr * np.mean(p - y)
    return lambda G: (1 / (1 + np.exp(-(((G - mu) / sd) @ w + b))) > 0.5).astype(int)

line_v = np.array([[-1, 2, -1]] * 3)          # "pretrained" detectors of thin lines
line_h = line_v.T
good = [line_v, line_h]
head = train_head(backbone(X_small, good), y_small)
print("line filters   : test accuracy", np.mean(head(backbone(X_test, good)) == y_test))

r = np.random.default_rng(1)
rand = [r.standard_normal((3, 3)) for _ in range(2)]
head_r = train_head(backbone(X_small, rand), y_small)
print("random filters : test accuracy", np.mean(head_r(backbone(X_test, rand)) == y_test))

head_px = train_head(X_small.reshape(len(X_small), -1), y_small)
print("raw pixels     : test accuracy", np.mean(head_px(X_test.reshape(len(X_test), -1)) == y_test))
` } },
      { note: '<b>Expected output</b> (may differ slightly between numpy versions):<br><code>line filters   : test accuracy 0.9675</code><br><code>random filters : test accuracy 0.8975</code><br><code>raw pixels     : test accuracy 0.5775</code>' },
      { note: '<b>Your task.</b> (1) Change <code>make_set(20, rng)</code> to <code>make_set(200, rng)</code> in cell 3, then run cells 3 and 4 again. Do raw pixels catch up? (2) Put the 20 back, and replace <code>line_v</code> by <code>np.array([[-1, 0, 1]] * 3)</code>: an <i>edge</i> filter instead of a <i>line</i> filter. What happens to the accuracy? (3) In one sentence: why do good frozen features help most when data is scarce?' },
      { deeper: { title: 'Results of the task (open after you tried)', html: '<p>(1) With 200 images: line filters 0.99, random filters 0.89, raw pixels only 0.62. Raw pixels improve a little but stay far behind: they must learn every bar position separately. (2) With the edge filter the accuracy drops to about 0.76, even below random filters. An edge filter answers a different question (where does brightness change?) than the task needs (is there a thin line?). Frozen features only help when they fit the new task. (3) The head has only a few numbers to learn, so a handful of examples is enough, as long as the features already separate the classes.</p>' } },
      { exercise: exHead }
    ] },
    { id: 'revision', title: 'Revision checks', blocks: [
      { exercise: exConvParams },
      { quiz: { q: 'In cell 4, what does <code>train_head</code> change?', options: ['Only the head weights w and the bias b', 'The two filters in the backbone', 'The training images', 'Nothing: it only measures accuracy'], correct: 0, why: 'The backbone is frozen. Gradient descent updates only w and b of the logistic regression head.' } },
      { quiz: { q: 'Raw pixels did much worse than the line features with only 20 images. Why?', options: ['The bar can be at many positions, and 20 examples are too few to learn every pixel pattern; the features already ignore position', 'Pixels contain no information', 'Logistic regression cannot use 64 inputs', 'The test set is too large'], correct: 0, why: 'Max over a feature map does not care where the bar is. The raw-pixel model must learn each position separately, which needs much more data.' } }
    ] }
    ,{ id: 'sheet', title: 'Your personal lab sheet (hand in)', blocks: [
      { html: '<p>This is the part you <b>hand in</b>. Your teacher gets your file from Moodle and compares it with the answers generated from your ID.</p>' },
      { labsheet: SHEET8 }
    ] }
  ]
});
})();

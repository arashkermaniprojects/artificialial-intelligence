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
  ]
});
})();

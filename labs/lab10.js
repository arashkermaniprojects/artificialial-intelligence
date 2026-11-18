(function () {
const K = Course.kit;
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);

/* ---- scene: counting word pairs (a bigram model) ---- */
const TOK = ['the', 'cat', 'sat', 'on', 'the', 'mat', '.'];
const TX = i => 70 + i * 96;
const scenePairs = {
  id: 'pairs', title: 'A bigram model counts neighbouring words', w: 720, h: 380,
  build(F) {
    K.title(F, 'Training text: "the cat sat on the mat ."', 'a bigram model remembers only the previous word');
    F.s.tok = TOK.map((w, i) => F.box(TX(i), 100, 80, 36, w, { size: 15, weight: 750 }));
    F.s.win = F.g({ transform: `translate(${TX(0) - 46},78)` }); F.s.win.__t = { x: TX(0) - 46, y: 78, s: 1, r: 0 };
    F.rect(0, 0, 188, 44, { rx: 12, fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 3.5 }, F.s.win); F.s.win.style.opacity = 0;
    F.s.pairs = TOK.slice(0, -1).map((w, i) => { const c = K.chip(F, 110 + (i % 3) * 170, 175 + Math.floor(i / 3) * 34, w + ' → ' + TOK[i + 1], i === 0 || i === 4 ? 'warn' : 'accent'); c.style.opacity = 0; return c; });
    F.s.rowL = F.text(140, 268, 'after "the":', { size: 14, weight: 750, anchor: 'end' }); F.s.rowL.style.opacity = 0;
    F.s.bars = ['cat', 'mat'].map((w, i) => { const y = 268 + i * 34, g = F.g({}); g.style.opacity = 0; F.text(165, y, w, { size: 14, weight: 700, anchor: 'start' }, g); F.rect(210, y - 11, 300, 22, { rx: 6, fill: 'var(--c-grid)' }, g); const r = F.rect(210, y - 11, 0, 22, { rx: 6, fill: 'var(--c-b)' }, g); const t = F.text(222, y, 'count 1', { size: 12.5, weight: 750, mono: true, anchor: 'start' }, g); return { g, r, t }; });
    F.s.gen = K.callout(F, 360, 352, 'to write: start with a word, draw the next one from its row, repeat', { tone: 'ok', w: 520 });
  },
  steps: [
    { title: 'Pairs of words', say: ['A bigram model is the smallest language model. It only looks at pairs of neighbouring words.', 'The first pair is the, followed by cat.'],
      cues: [seq(F => F.set(F.s.win, { tx: TX(0) - 46 }), F => F.show(F.s.win)), seq(F => F.show(F.s.pairs[0]))] },
    { title: 'Slide and count', say: ['We slide the window over the whole text and count every pair.', 'Six pairs come from seven tokens.'],
      cues: [seq(...[1, 2, 3, 4, 5].map(i => F => Promise.all([F.to(F.s.win, { tx: TX(i) - 46 }, 350), F.show(F.s.pairs[i], 300)]))), seq(F => Promise.all(F.s.pairs.map(p => F.pulse(p, 1))))] },
    { title: 'Counts become probabilities', say: ['The word the appears twice, once before cat and once before mat.', 'Divide each count by the row total, two. So after the, cat and mat each get one half.'],
      cues: [seq(F => F.hide(F.s.win), F => F.show(F.s.rowL), F => Promise.all(F.s.bars.map(b => F.show(b.g))), F => Promise.all(F.s.bars.map(b => F.to(b.r, { width: 150 }, 500))), F => Promise.all(F.s.bars.map(b => F.to(b.t, { x: 368 }, 500)))),
             seq(F => Promise.all(F.s.bars.map(b => { F.setText(b.t, 'P = 0.5'); return F.pulse(b.g, 1); })))] },
    { title: 'Generate text', say: ['To generate text, start with a word and draw the next word from its row. Then repeat.', 'A large language model does the same job, but it looks at thousands of previous tokens, not just one.'],
      cues: [seq(F => F.show(F.s.gen)), seq(F => F.pulse(F.s.gen, 1))] }
  ]
};

/* ---- exercises ---- */
const NOUNS = ['cat', 'dog', 'bird', 'fish', 'mat', 'rug', 'bone'];
const exBigram = {
  title: 'Read a probability from bigram counts', random: true,
  gen(r) {
    const ws = r.shuffle(NOUNS).slice(0, r.int(3, 4)), cs = ws.map(() => r.int(1, 6)), tot = cs.reduce((a, b) => a + b, 0), k = r.int(0, ws.length - 1);
    const tbl = '<table class="mini"><tr><th>next word</th>' + ws.map(w => `<th>${w}</th>`).join('') + '</tr><tr><td>count after "the"</td>' + cs.map(c => `<td>${c}</td>`).join('') + '</tr></table>';
    return {
      prompt: 'In a training text, the word "the" is followed by these words:' + tbl + `What is the bigram probability <b>P(${ws[k]} | the)</b>? (two decimals)`,
      hint: 'Divide the count of the pair by the total number of times "the" is followed by any word.',
      answer: `Total = ${cs.join(' + ')} = ${tot}. P(${ws[k]} | the) = ${cs[k]} / ${tot} = <b>${f2(cs[k] / tot)}</b>. In the Python cell this is <code>probs[idx['the'], idx['${ws[k]}']]</code>.`,
      check: { type: 'number', answer: Math.round(cs[k] / tot * 100) / 100, tol: 0.011 }
    };
  }
};
const exTemp = {
  title: 'Apply a temperature to probabilities', random: true,
  gen(r) {
    const p = r.pick([[0.6, 0.3, 0.1], [0.5, 0.4, 0.1], [0.7, 0.2, 0.1], [0.5, 0.25, 0.25], [0.4, 0.4, 0.2]]), T = r.pick([0.5, 2]), k = r.int(0, 2);
    const q = p.map(v => Math.pow(v, 1 / T)), z = q.reduce((a, b) => a + b, 0), w = ['dog', 'cat', 'fish'];
    return {
      prompt: `The next-word probabilities are <b>dog ${p[0]}</b>, <b>cat ${p[1]}</b>, <b>fish ${p[2]}</b>. The lab's <code>adjust</code> function raises each probability to the power 1/T and divides by the sum. With <b>T = ${T}</b>, what is the new probability of <b>${w[k]}</b>? (two decimals)`,
      hint: T === 0.5 ? 'With T = 0.5 the power is 2: square each probability, then divide by the sum of the squares.' : 'With T = 2 the power is 0.5: take the square root of each probability, then divide by their sum.',
      answer: `Powers: ${q.map(v => v.toFixed(4)).join(', ')}; sum = ${z.toFixed(4)}. New P(${w[k]}) = ${q[k].toFixed(4)} / ${z.toFixed(4)} = <b>${f2(q[k] / z)}</b>. ${T < 1 ? 'Low temperature makes the likely word even more likely.' : 'High temperature moves probability toward the rare words.'}`,
      check: { type: 'number', answer: Math.round(q[k] / z * 100) / 100, tol: 0.011 }
    };
  }
};

const PY_COUNT = `import numpy as np

text = """the cat sat on the mat . the dog sat on the rug .
the cat saw the dog . the dog saw a bird .
the cat ate the fish . the dog ate the bone .
a bird sat on the dog . the bird saw the fish ."""

words = text.split()                       # tokens: here simply words and '.'
vocab = sorted(set(words))
idx = {w: i for i, w in enumerate(vocab)}
V = len(vocab)

# count every pair (previous word, next word)
counts = np.zeros((V, V))
for a, b in zip(words[:-1], words[1:]):
    counts[idx[a], idx[b]] += 1

# turn each row into probabilities: P(next | previous)
probs = counts / counts.sum(axis=1, keepdims=True)

def next_words(w):
    p = probs[idx[w]]
    for j in np.argsort(-p, kind='stable'):
        if p[j] > 0:
            print(f'  {vocab[j]:5s} {p[j]:.2f}')

print('tokens:', len(words), '  vocabulary:', V)
print('after "the":')
next_words('the')
print('after "sat":')
next_words('sat')
`;
const PY_SAMPLE = `assert 'probs' in globals(), 'Run the first Python cell first.'

def adjust(p, T=1.0, k=None):
    """Temperature and top-k on a probability vector. T < 1 sharpens, T > 1 flattens."""
    q = np.where(p > 0, p ** (1.0 / T), 0.0)    # same as softmax(log p / T); impossible words stay impossible
    if k is not None:
        cut = np.sort(q)[-k]                     # keep only the k largest
        q = np.where(q >= cut, q, 0.0)
    return q / q.sum()

def generate(start='the', n=10, T=1.0, k=None, seed=0):
    rng = np.random.RandomState(seed)            # fixed seed: the same text every run
    out = [start]
    for _ in range(n):
        p = adjust(probs[idx[out[-1]]], T, k)
        out.append(vocab[rng.choice(V, p=p)])
    return ' '.join(out)

p = probs[idx['the']]
for T in [0.5, 1.0, 2.0]:
    print(f'T = {T}: P(dog | the) = {adjust(p, T)[idx["dog"]]:.2f}')
print()
for T in [0.2, 1.0, 3.0]:
    print(f'T = {T}:', generate(T=T, seed=1))
print('top-k = 1:', generate(k=1, seed=1))
`;
const PY_SCORE = `assert 'probs' in globals(), 'Run the first Python cell first.'

def score(sentence, smooth=0.0):
    """Probability of a sentence under the bigram model, and its perplexity."""
    ws = sentence.split()
    logp = 0.0
    for a, b in zip(ws[:-1], ws[1:]):
        row = counts[idx[a]] + smooth            # add-smooth: unseen pairs get a small count
        logp += np.log(row[idx[b]] / row.sum())
    n = len(ws) - 1                              # number of predictions made
    return np.exp(logp), np.exp(-logp / n)

for s in ['the cat sat on the mat .',
          'the dog ate the fish .',
          'the fish ate the dog .',
          'mat the on sat cat the .']:
    p, ppl = score(s, smooth=0.1)
    print(f'{s:26s} P = {p:.1e}   perplexity = {ppl:5.2f}')
`;

/* ---------- personal lab sheet (hand in): every student gets a personal training text from the student ID ---------- */
const SH_NOUNS = ['cat', 'dog', 'bird', 'fox', 'cow', 'goat', 'duck', 'fish', 'bone', 'ball', 'hat', 'tree', 'rug', 'mat', 'cake', 'book'];
const SH_VERBS = ['saw', 'ate', 'found', 'liked', 'chased', 'took', 'had', 'met'];
const SH_DET = ['the', 'the', 'a'];
const shHalf = (c, n) => { const x = c / n * 100, f = x - Math.floor(x); return Math.abs(f - 0.5) > 1e-6; };   // two decimals not on a .5 boundary
const shTop = row => { const e = Object.entries(row || {}).sort((x, y) => y[1] - x[1]); return e.length && (e.length === 1 || e[0][1] > e[1][1]) ? e[0][0] : null; };
const shSum = row => Object.values(row || {}).reduce((a, b) => a + b, 0);
// lines: plain python strings, or [label, expression, answer name, indent] -> print(label, expr) for the student, print("ANS name", expr) for the key
const shOut = lines => {
  const f = k => lines.map(l => Array.isArray(l) ? `${l[3] || ''}print(${k ? JSON.stringify('ANS ' + l[2]) : JSON.stringify(l[0])}, ${l[1]})` : l).join('\n') + '\n';
  return { code: f(false), key: f(true) };
};
const L10_BASE = B => `import numpy as np

# your personal training text (made from your student ID)
text = """${B.lines.join('\n')}"""

words = text.split()
vocab = sorted(set(words))
idx = {w: i for i, w in enumerate(vocab)}
V = len(vocab)
counts = np.zeros((V, V))
for a, b in zip(words[:-1], words[1:]):
    counts[idx[a], idx[b]] += 1
probs = counts / counts.sum(axis=1, keepdims=True)
`;
const L10_GEN = `
def adjust(p, T=1.0, k=None):
    q = np.where(p > 0, p ** (1.0 / T), 0.0)
    if k is not None:
        cut = np.sort(q)[-k]
        q = np.where(q >= cut, q, 0.0)
    return q / q.sum()

def generate(start, n, T=1.0, k=None, seed=0):
    rng = np.random.RandomState(seed)
    out = [start]
    for _ in range(n):
        p = adjust(probs[idx[out[-1]]], T, k)
        out.append(vocab[rng.choice(V, p=p)])
    return ' '.join(out)
`;
const SHEET10 = {
  title: 'My personal lab sheet: language models', marks: 10,
  intro: 'Your training text below is <b>personal</b>: it is made from your student ID, so your counts, probabilities and generated sentences differ from those of your classmates. Run each code cell (press ▶ Run), copy the results into the answer boxes, add a screenshot if you like, and finally download your sheet as <b>Word</b> or <b>PDF</b> and upload it to Moodle.',
  base(r) {
    for (;;) {
      const nouns = r.shuffle(SH_NOUNS).slice(0, 6), verbs = r.shuffle(SH_VERBS).slice(0, 3), n = r.int(10, 13), S = [];
      for (let i = 0; i < n; i++) S.push([r.pick(SH_DET), r.pick(nouns), r.pick(verbs), r.pick(SH_DET), r.pick(nouns), '.']);
      const ws = [].concat(...S), bi = {}, tri = {};
      for (let i = 0; i + 1 < ws.length; i++) { (bi[ws[i]] = bi[ws[i]] || {}); bi[ws[i]][ws[i + 1]] = (bi[ws[i]][ws[i + 1]] || 0) + 1; }
      for (let i = 0; i + 2 < ws.length; i++) { const c = ws[i] + ' ' + ws[i + 1]; (tri[c] = tri[c] || {}); tri[c][ws[i + 2]] = (tri[c][ws[i + 2]] || 0) + 1; }
      const theRow = bi.the, nThe = shSum(theRow), top = shTop(theRow);
      if (!top || !shHalf(theRow[top], nThe)) continue;
      const xs = Object.keys(theRow).filter(w => w !== top && shHalf(theRow[w], nThe));
      const usedV = verbs.filter(v => bi[v]), usedN = nouns.filter(w => ws.includes(w));
      const ctxs = usedV.filter(v => { const row = tri[v + ' the'], t = shTop(row); return row && shSum(row) >= 2 && t && shHalf(row[t], shSum(row)); });
      if (!xs.length || !ctxs.length || usedN.length < 4 || usedV.length < 2) continue;
      const X = r.pick(xs), pv = r.pick(usedV), ctx = r.pick(ctxs);
      const sents = S.map(s => s.join(' ')), seen = t => t.every((w, i) => i === 0 || (bi[t[i - 1]] && bi[t[i - 1]][w]));
      const smooth = r.pick([0.1, 0.2, 0.5, 1.0]), NV = new Set(ws).size, wantNewLower = r.chance(0.5);
      const ppl = t => { let lp = 0; for (let i = 1; i < t.length; i++) { const row = bi[t[i - 1]] || {}; lp += Math.log(((row[t[i]] || 0) + smooth) / (shSum(row) + smooth * NV)); } return Math.exp(-lp / (t.length - 1)); };
      // s1 from the text, s2 NEW but made of word pairs from the text; for half of the students the new sentence scores better (lower perplexity)
      let s1, snew, tries = 0;
      do { const t = [r.pick(['the', 'a']), r.pick(usedN), r.pick(usedV), r.pick(['the', 'a']), r.pick(usedN), '.'], k = r.int(0, S.length - 1); snew = t.join(' '); s1 = sents[k];
        const d = ppl(t) - ppl(S[k]), ok = !sents.includes(snew) && Math.abs(d) > 0.1 && [ppl(t), ppl(S[k])].every(v => { const f = v * 100 - Math.floor(v * 100); return Math.abs(f - 0.5) > 0.02; });
        if (!ok || (tries++ < 400 && (!seen(t) || (d < 0) !== wantNewLower))) snew = null; } while (!snew);
      const lines = []; for (let i = 0; i < sents.length; i += 3) lines.push(sents.slice(i, i + 3).join(' '));
      return { lines, nouns: usedN, X, top, pv, ctx, s1, snew, smooth,
        T: r.pick([0.5, 0.7, 1.5, 2.0]), start: r.pick(usedN), len: r.int(6, 9), seed: r.int(1, 99), Th: r.pick([1.5, 2.0, 3.0]), cseed: r.int(1, 99), Y: r.pick(usedN.filter(w => w !== X && w !== top)) };
    }
  },
  tasks: [
    { id: 't1', title: 'Count your words and pairs', marks: 1.5, gen(r, B) {
      const o = shOut([L10_BASE(B), ['tokens:', 'len(words)', 'tokens'], ['vocabulary size:', 'V', 'vocab'],
        [`count of the pair (the, ${B.Y}):`, `int(counts[idx["the"], idx["${B.Y}"]])`, 'pair_the_' + B.Y],
        [`count of the pair (${B.pv}, a):`, `int(counts[idx["${B.pv}"], idx["a"]]) if "a" in idx else 0`, 'pair_' + B.pv + '_a'],
        [`times "the" is followed by a word:`, `int(counts[idx["the"]].sum())`, 'the_total']]);
      return { html: `<p>The cell builds a bigram model from <b>your</b> text. Run it and report the number of tokens, the vocabulary size, how often the pairs <b>"the ${B.Y}"</b> and <b>"${B.pv} a"</b> appear, and how often "the" is followed by any word.</p>`, code: o.code,
        fields: [{ k: 'tokens', label: 'Number of tokens', type: 'num' }, { k: 'vocab', label: 'Vocabulary size', type: 'num' }, { k: 'pair', label: `Count of the pair (the, ${B.Y})`, type: 'num' }, { k: 'pair2', label: `Count of the pair (${B.pv}, a)`, type: 'num' }, { k: 'row', label: 'Times "the" is followed by a word', type: 'num' }], key: o.key }; } },
    { id: 't2', title: 'The most likely next word', marks: 1.5, gen(r, B) {
      const o = shOut([L10_BASE(B), 'p = probs[idx["the"]]', 'best = int(np.argmax(p))',
        ['most likely word after "the":', 'vocab[best]', 'top_word'], ['its probability:', 'round(p[best], 2)', 'top_p'],
        [`P(${B.X} | the):`, `round(p[idx["${B.X}"]], 2)`, 'p_x']]);
      return { html: `<p>Use the probabilities <code>probs</code>. Which word is most likely after <b>"the"</b> in your text, and with what probability? Also report <b>P(${B.X} | the)</b>. Check one of them by hand: count / row total.</p>`, code: o.code,
        fields: [{ k: 'w', label: 'Most likely word after "the"', type: 'text' }, { k: 'p', label: 'Its probability (2 decimals)', type: 'num' }, { k: 'px', label: `P(${B.X} | the) (2 decimals)`, type: 'num' }], key: o.key }; } },
    { id: 't3', title: 'Perplexity of two sentences', marks: 1.5, gen(r, B) {
      const o = shOut([L10_BASE(B), `
def perplexity(sentence, smooth):
    ws = sentence.split()
    logp = 0.0
    for a, b in zip(ws[:-1], ws[1:]):
        row = counts[idx[a]] + smooth          # add-smooth: unseen pairs keep a small count
        logp += np.log(row[idx[b]] / row.sum())
    return np.exp(-logp / (len(ws) - 1))

smooth = ${B.smooth}
s1 = "${B.s1}"     # a sentence from your text
s2 = "${B.snew}"     # a sentence that is NOT in your text (it reuses word pairs from your text)`,
        ['perplexity of s1:', 'round(perplexity(s1, smooth), 2)', 'ppl_s1'], ['perplexity of s2:', 'round(perplexity(s2, smooth), 2)', 'ppl_s2'],
        ['lower perplexity (1 = s1, 2 = s2):', '1 if perplexity(s1, smooth) < perplexity(s2, smooth) else 2', 'lower']]);
      return { html: `<p>Score the two sentences with smoothing <b>${B.smooth}</b>: <b>s1 = "${B.s1}"</b> (it is in your text) and <b>s2 = "${B.snew}"</b> (it is not). Report both perplexities and say which one is lower. Is the lower one always the true one?</p>`, code: o.code,
        fields: [{ k: 'p1', label: 'Perplexity of s1 (2 decimals)', type: 'num' }, { k: 'p2', label: 'Perplexity of s2 (2 decimals)', type: 'num' }, { k: 'low', label: 'Which is lower (s1 or s2)? One sentence: does lower mean true?', type: 'long' }], key: o.key }; } },
    { id: 't4', title: 'Sampling with your temperature', marks: 1.5, gen(r, B) {
      const o = shOut([L10_BASE(B), L10_GEN, 'p = probs[idx["the"]]',
        [`P(${B.top} | the) at T = ${B.T}:`, `round(adjust(p, ${B.T})[idx["${B.top}"]], 2)`, 'p_top_T'],
        ['generated:', `generate("${B.start}", ${B.len}, T=${B.T}, seed=${B.seed})`, 'text']]);
      return { html: `<p>Your temperature is <b>T = ${B.T}</b> and your seed is <b>${B.seed}</b>. Report the new probability of "${B.top}" after "the" at this temperature (it was the top word in task 2), and the text that <code>generate</code> writes, starting from "${B.start}" with ${B.len} more words. Did the temperature make "${B.top}" more or less likely?</p>`, code: o.code,
        fields: [{ k: 'pt', label: `P(${B.top} | the) at T = ${B.T} (2 decimals)`, type: 'num' }, { k: 'txt', label: 'The generated text', type: 'text' }, { k: 'ml', label: 'More or less likely than in task 2?', type: 'text' }], key: o.key }; } },
    { id: 'c1', kind: 'challenge', title: 'Temperature and variety', marks: 2, gen(r, B) {
      const head = L10_BASE(B) + L10_GEN + `\n# Challenge: for each temperature, generate 20 texts (seeds 0 to 19) from "${B.start}" with ${B.len} more words\n# and count how many DIFFERENT texts you get.\n`;
      const code = head + `for T in [0.2, ${B.Th}]:\n    texts = set()\n    for s in range(20):\n        pass   # YOUR CODE HERE: make one text with temperature T and seed s, add it to texts\n    print(f"T = {T}: {len(texts)} different texts out of 20")\nprint("top-k = 1:", generate("${B.start}", ${B.len}, k=1, seed=${B.cseed}))\n`;
      const key = head + `for T in [0.2, ${B.Th}]:\n    texts = set(generate("${B.start}", ${B.len}, T=T, seed=s) for s in range(20))\n    print("ANS different_T" + str(T), len(texts))\nprint("ANS topk1", generate("${B.start}", ${B.len}, k=1, seed=${B.cseed}))\n`;
      return { html: `<p>Finish the loop: for <b>T = 0.2</b> and for <b>T = ${B.Th}</b>, generate 20 texts (seeds 0 to 19) and count how many are different. Then run the top-k = 1 line (seed ${B.cseed}). Report the two counts and the top-k = 1 text, and explain with your numbers what temperature and top-k = 1 do.</p>`, code,
        fields: [{ k: 'lo', label: 'Different texts at T = 0.2', type: 'num' }, { k: 'hi', label: `Different texts at T = ${B.Th}`, type: 'num' }, { k: 'k1', label: 'The top-k = 1 text', type: 'text' }, { k: 'why', label: 'Your explanation (two sentences)', type: 'long' }, { k: 'code', label: 'Your finished loop (paste your code)', type: 'code' }], key,
        note: 'Explanation: low temperature (and top-k = 1, which is greedy) almost always picks the most likely word, so the texts repeat and often loop; high temperature flattens the probabilities, so more different texts appear. Accept any honest reading of the student\'s own counts.' }; } },
    { id: 'c2', kind: 'challenge', title: 'From bigram to trigram', marks: 2, gen(r, B) {
      const [v] = B.ctx.split(' ');
      const head = L10_BASE(B) + `\n# Challenge: a TRIGRAM model looks at the two previous words.\n# tri[(a, b)] is a dictionary: next word -> count.\ntri = {}\nfor a, b, c in zip(words[:-2], words[1:-1], words[2:]):\n`;
      const tail = `row = tri.get(("${v}", "the"), {})\n`;
      const code = head + `    pass   # YOUR CODE HERE: add 1 to the count of c after the pair (a, b)\nprint("number of different pairs (contexts):", len(tri))\n${tail}if row:\n    best = max(row, key=row.get)\n    print('most likely word after "${v} the":', best, round(row[best] / sum(row.values()), 2))\nelse:\n    print("tri is still empty: write the counting line first")\nprint('bigram model, most likely word after "the":', vocab[int(np.argmax(probs[idx["the"]]))])\n`;
      const key = head + `    tri.setdefault((a, b), {})\n    tri[(a, b)][c] = tri[(a, b)].get(c, 0) + 1\nprint("ANS contexts", len(tri))\n${tail}best = max(row, key=row.get)\nprint("ANS word", best)\nprint("ANS p", round(row[best] / sum(row.values()), 2))\n`;
      return { html: `<p>Write the missing counting line so that <code>tri</code> counts every word after every <b>pair</b> of words. Report the number of different pairs (contexts), the most likely word after <b>"${v} the"</b> and its probability. Compare with the bigram answer of task 2 and explain in one or two sentences what the longer context changes.</p>`, code,
        fields: [{ k: 'ctx', label: 'Number of different pairs (contexts)', type: 'num' }, { k: 'w', label: `Most likely word after "${v} the"`, type: 'text' }, { k: 'p', label: 'Its probability (2 decimals)', type: 'num' }, { k: 'why', label: 'What does the longer context change?', type: 'long' }, { k: 'code', label: 'Your counting line(s) (paste your code)', type: 'code' }], key,
        note: 'Explanation: with two previous words the model sees fewer examples per context (fewer counts), so its prediction can change and is often more confident; it needs more data for the same coverage. Accept an honest comparison of the student\'s own numbers.' }; } }
  ]
};

Course.lecture({
  id: 'lab10', num: 10, week: 10, kind: 'lab', title: 'Language models in practice',
  lede: 'Build the smallest possible language model from a tiny text: count word pairs, turn them into probabilities, and write new sentences with temperature and top-k. Then see why a fluent sentence is not the same as a true one.',
  clos: [2], widgets: [],
  goals: ['build a <b>bigram</b> language model with numpy: counts, then probabilities P(next | previous)',
    'generate text by <b>sampling</b>, and control it with <b>temperature</b> and <b>top-k</b>',
    'score sentences with <b>probability</b> and <b>perplexity</b>',
    'explain why a likely sentence can still be false (the root of <b>hallucination</b>)'],
  chapters: [
    { id: 'idea', title: 'The idea in one picture', blocks: [
      { html: '<p>A large language model predicts the next token from thousands of earlier tokens, with billions of learned weights. Here we keep only the core idea: predict the next word from <b>one</b> previous word, using counts. No downloads, no internet: everything runs in your browser.</p>' },
      { scene: scenePairs }
    ] },
    { id: 'count', title: 'Count pairs, get probabilities', blocks: [
      { html: '<p>Press <b>Run</b>. The cell splits a tiny text into tokens, counts every pair in a matrix <code>counts[previous, next]</code>, and divides each row by its sum.</p>' },
      { py: { title: 'A bigram model from a tiny text', code: PY_COUNT } },
      { note: '<b>Expected output.</b><br><code>tokens: 51   vocabulary: 14</code><br><code>after "the":</code> dog 0.36, cat 0.21, fish 0.14, bird 0.07, bone 0.07, mat 0.07, rug 0.07<br><code>after "sat":</code> on 1.00<br>"the" is followed 14 times, 5 of them by "dog": 5/14 = 0.36.' },
      { exercise: exBigram }
    ] },
    { id: 'sample', title: 'Generate: sampling, temperature, top-k', blocks: [
      { html: '<p>Run the first cell before this one. <code>adjust</code> applies a temperature T (it raises every probability to the power 1/T, which is the same as dividing the log-probabilities by T before softmax) and an optional top-k cut. <code>generate</code> draws one word at a time with a fixed random seed, so you get the same text as below.</p>' },
      { py: { title: 'Sampling with temperature and top-k', code: PY_SAMPLE } },
      { note: '<b>Expected output.</b><br><code>T = 0.5: P(dog | the) = 0.60</code> · <code>T = 1.0: … 0.36</code> · <code>T = 2.0: … 0.24</code><br><code>T = 0.2: the dog . a bird . the dog . the dog</code><br><code>T = 1.0: the dog sat on the cat ate the cat sat on</code><br><code>T = 3.0: the dog sat on the bone . a bird sat on</code><br><code>top-k = 1: the dog . the dog . the dog . the dog</code><br>Low temperature and top-k = 1 (greedy) fall into a loop. Higher temperature gives more variety.' },
      { exercise: exTemp },
      { note: '<b>Your tasks.</b> (1) Change <code>seed=1</code> to other numbers at T = 1.0 and T = 0.2: which temperature gives more different sentences? (2) Try <code>generate(T=1.0, k=2, seed=1)</code>: what does top-k remove? (3) Add a sentence of your own to <code>text</code> in the first cell, run both cells again, and find your new words in the generated text.' }
    ] },
    { id: 'score', title: 'Evaluate: probability, perplexity, and truth', blocks: [
      { html: '<p>A language model also <b>scores</b> text. The probability of a sentence is the product of its next-word probabilities. <b>Perplexity</b> = exp(minus the average log-probability): roughly, "how many words was the model choosing between at each step". Lower is better. A small <b>smoothing</b> count lets unseen pairs keep a tiny probability instead of zero.</p>' },
      { py: { title: 'Score sentences', code: PY_SCORE } },
      { note: '<b>Expected output.</b><br><code>the cat sat on the mat .   P = 8.2e-04   perplexity =  3.27</code><br><code>the dog ate the fish .     P = 3.0e-03   perplexity =  3.20</code><br><code>the fish ate the dog .     P = 2.7e-04   perplexity =  5.18</code><br><code>mat the on sat cat the .   P = 2.1e-11   perplexity = 60.39</code>' },
      { quiz: { q: '"the dog ate the fish ." is <b>not</b> in the training text (the text says the cat ate the fish, and the dog ate the bone). Why does it get a <i>higher</i> probability than "the cat sat on the mat .", which is in the text?', options: ['The model scores how word pairs fit together, not whether the whole sentence is true', 'Because of a bug in the counts', 'Because shorter sentences are always true', 'Because the temperature was too high'], correct: 0, why: 'Every pair in it (the dog, dog ate, ate the, the fish) is common in the text, so the sentence looks very likely. Likely is not the same as true. Large language models hallucinate for the same basic reason, just at a much larger scale.' } },
      { deeper: { title: 'Answers to the tasks', html: '<p>(1) T = 0.2 gives almost the same sentence for every seed (it is nearly greedy); T = 1.0 changes a lot. (2) With k = 2, only the two most likely next words survive at each step: after "the" only dog and cat remain. (3) Your words appear only after the words that came before them in your sentence: a bigram model can only reuse pairs it has seen.</p>' } }
    ] }
    ,{ id: 'sheet', title: 'Your personal lab sheet (hand in)', blocks: [
      { html: '<p>This is the part you <b>hand in</b>. Your teacher gets your file from Moodle and compares it with the answers generated from your ID.</p>' },
      { labsheet: SHEET10 }
    ] }
  ]
});
})();

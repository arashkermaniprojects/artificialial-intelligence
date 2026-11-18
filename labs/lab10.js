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
  ]
});
})();

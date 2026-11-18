(function () {
const K = Course.kit;
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };
const softmax = (s, T = 1) => { const m = Math.max(...s), e = s.map(v => Math.exp((v - m) / T)), z = e.reduce((a, b) => a + b, 0); return e.map(v => v / z); };
const pct = p => Math.round(p * 100) + '%';
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);

/* horizontal probability bars: labels on the left, bar, percentage on the right. set(probs) animates. */
function hbars(F, x, y, labels, o = {}) {
  const W = o.w || 300, rh = o.rh || 36, g = F.g({}), rows = labels.map((lb, i) => {
    const yy = y + i * rh;
    const t = F.text(x - 10, yy, lb, { size: 15, weight: 700, anchor: 'end' }, g);
    F.rect(x, yy - 12, W, 24, { rx: 6, fill: 'var(--c-grid)' }, g);
    const r = F.rect(x, yy - 12, 0, 24, { rx: 6, fill: o.color || 'var(--c-b)' }, g);
    const v = F.text(x + 8, yy, '', { size: 13, weight: 750, mono: true, anchor: 'start' }, g);
    return { t, r, v, yy };
  });
  const B = { g, rows };
  B.set = (ps, ms = 650) => Promise.all(rows.map((row, i) => {
    const p = ps[i] || 0, w = Math.max(0, W * p);
    F.setText(row.v, ps[i] == null ? '' : pct(p), null, 14);
    return Promise.all([F.to(row.r, { width: w, opacity: ps[i] == null ? 0.15 : 1 }, ms, 'out'), F.to(row.v, { x: x + w + 8 }, ms, 'out')]);
  }));
  return B;
}

/* ================= scene 1: tokens and next-word prediction ================= */
const NEXT = ['mat', 'floor', 'sofa', 'roof', 'moon'], LOGITS = [3.0, 2.2, 1.9, 1.0, -0.5];
const P1 = softmax(LOGITS);            // 0.513 0.231 0.171 0.069 0.016 (checked in python)
const CTX = ['The', ' cat', ' sat', ' on', ' the'], IDS = [791, 8415, 7731, 389, 279];
const sceneNext = {
  id: 'next', title: 'A language model predicts the next token', w: 720, h: 400,
  build(F) {
    K.title(F, 'Text in, one token out', 'toy numbers for illustration · a real vocabulary has about 100 000 tokens');
    F.s.tok = CTX.map((w, i) => { const b = F.box(80 + i * 98, 105, 88, 38, w.trim(), { size: 16, weight: 750, fill: 'var(--c-open)', stroke: 'var(--c-b)' }); b.style.opacity = 0; return b; });
    F.s.ids = IDS.map((d, i) => { const t = F.text(80 + i * 98, 140, 'id ' + d, { size: 11.5, mono: true, cls: 'soft' }); t.style.opacity = 0; return t; });
    F.s.q = F.box(80 + 5 * 98, 105, 70, 38, '?', { size: 20, weight: 800, fill: 'var(--c-cur)', stroke: 'var(--c-c)' }); F.s.q.style.opacity = 0;
    F.s.bars = hbars(F, 250, 200, NEXT, { w: 300, rh: 34 }); F.s.bars.g.style.opacity = 0;
    F.s.bh = F.text(250, 178, 'probability of the next token', { size: 12.5, cls: 'soft', anchor: 'start' }); F.s.bh.style.opacity = 0;
    F.s.mat = F.box(250 - 40, 200, 70, 30, 'mat', { size: 15, weight: 750, fill: 'var(--c-path)', stroke: 'var(--c-c)' }); F.s.mat.style.opacity = 0;
    F.s.learn = K.callout(F, 360, 372, 'training: guess the next token, compare with the real one, adjust', { tone: 'ok', w: 520 });
  },
  steps: [
    { title: 'Text becomes tokens', say: ['A language model reads text as tokens. A token is a word or a piece of a word.', 'Each token has a number, its id, so the computer can work with it.'],
      cues: [seq(F => Promise.all(F.s.tok.map((b, i) => F.show(b, 300 + i * 120)))), seq(F => Promise.all(F.s.ids.map(t => F.show(t))))] },
    { title: 'Guess the next token', say: ['The model has one job: guess the next token. It gives a probability to every token it knows.', 'After the cat sat on the, the word mat gets about one half.'],
      cues: [seq(F => F.set(F.s.mat, { opacity: 0, tx: 210, ty: 200 }), F => F.show(F.s.q), F => F.show(F.s.bh), F => F.show(F.s.bars.g), F => F.s.bars.set(P1)),
             seq(F => F.pulse(F.s.bars.rows[0].r, 2))] },
    { title: 'Add it and repeat', say: ['We add the chosen token to the text, and ask the model again.', 'Repeating this, one token at a time, the model writes whole answers.'],
      cues: [seq(F => F.set(F.s.mat, { opacity: 1, tx: 210, ty: 200 }), F => F.to(F.s.mat, { tx: 80 + 5 * 98, ty: 105 }, 900), F => F.hide(F.s.q, 200)),
             seq(F => F.s.bars.set([null, null, null, null, null]), F => F.pulse(F.s.mat, 1))] },
    { title: 'How it learns', say: ['During training it reads huge amounts of text and compares each guess with the real next token.', 'No human labels are needed: the text itself is the teacher.'],
      cues: [seq(F => F.show(F.s.learn)), seq(F => F.pulse(F.s.learn, 1))] }
  ]
};

/* ================= scene 2: attention as a soft lookup ================= */
/* toy 2-D vectors (made by hand). query of "it" = (1, 1). scores = dot products = 0, 2.5, 0.5, 1.5, 0, 1
   softmax -> 0.043 0.529 0.072 0.195 0.043 0.118 ; mix of the key vectors -> (1.08, 0.69). checked in python. */
const AW = ['the', 'cat', 'drank', 'milk', 'because', 'it'], AK = [[0.5, -0.5], [1.5, 1.0], [0.5, 0], [1.0, 0.5], [-0.5, 0.5], [0.5, 0.5]], AQ = [1, 1];
const AS = AK.map(k => k[0] * AQ[0] + k[1] * AQ[1]), AWT = softmax(AS);
const nstr = v => String(Math.round(v * 10) / 10);
const AX = i => 110 + i * 130, AY = 296;
const sceneLookup = {
  id: 'lookup', title: 'Attention: a query looks up keys and mixes values', w: 900, h: 450, wide: true,
  build(F) {
    K.title(F, 'What does "it" refer to?', 'toy 2-D vectors made by hand for illustration · real models learn vectors with hundreds of numbers');
    const it = AW.length - 1;
    F.s.arcs = AW.map((w, j) => {
      let d; if (j === it) d = `M${AX(j) - 14},${AY - 20} C${AX(j) - 40},${AY - 85} ${AX(j) + 40},${AY - 85} ${AX(j) + 14},${AY - 20}`;
      else { const h = 40 + Math.abs(AX(it) - AX(j)) * 0.25; d = `M${AX(it)},${AY - 20} Q${(AX(it) + AX(j)) / 2},${AY - 20 - 2 * h} ${AX(j)},${AY - 20}`; }
      const p = F.path(d, { stroke: 'var(--c-c)', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.85 }); p.style.opacity = 0; return p;
    });
    F.s.wl = AW.map((w, j) => { const h = j === it ? 68 : 40 + Math.abs(AX(it) - AX(j)) * 0.25; const t = F.text(j === it ? AX(j) : (AX(it) + AX(j)) / 2, AY - 20 - h - 12, pct(AWT[j]), { size: 14, weight: 800, fill: 'var(--c-c)' }); Object.assign(t.style, { paintOrder: 'stroke', stroke: 'var(--fig-bg)', strokeWidth: '5px' }); t.style.opacity = 0; return t; });
    F.s.tok = AW.map((w, i) => F.box(AX(i), AY, 104, 40, w, { size: 16, weight: 750, fill: i === it ? 'var(--c-cur)' : 'var(--c-node)', stroke: i === it ? 'var(--c-c)' : 'var(--c-node-line)' }));
    F.s.key = AK.map((k, i) => { const c = K.chip(F, AX(i), AY + 44, 'key ' + nstr(k[0]) + ', ' + nstr(k[1]), 'accent'); c.style.opacity = 0; return c; });
    F.s.sc = AS.map((s, i) => { const t = F.text(AX(i), AY + 78, 'score ' + nstr(s), { size: 13, weight: 750, mono: true }); t.style.opacity = 0; return t; });
    F.s.qc = K.callout(F, 790, 84, 'query of "it" = (1, 1)\n"I am looking for a thing"', { tone: 'warn', w: 210 });
    F.s.mix = K.callout(F, 450, 424, 'new "it" = ' + AW.map((w, j) => [AWT[j], w]).sort((x, y) => y[0] - x[0]).map(([v, w]) => f2(v) + ' ' + w).join(' + ') + '   (weighted mix of values)', { tone: 'ok', w: 700 });
  },
  steps: [
    { title: 'The question', say: ['Read: the cat drank milk because it. To guess the next word, the model must know what it means.', 'Attention lets the word it look back at the other words and collect what it needs.'],
      cues: [seq(F => F.pulse(F.s.tok[5], 2)), seq(F => Promise.all(F.s.arcs.map(a => F.to(a, { opacity: 0.35, 'stroke-width': 2 }, 400))))] },
    { title: 'Query and keys', say: ['Every word shows a key, like a label on a drawer.', 'The word that asks makes a query, a description of what it is looking for.'],
      cues: [seq(F => Promise.all(F.s.key.map(c => F.show(c)))), seq(F => F.show(F.s.qc), F => F.pulse(F.s.qc, 1))] },
    { title: 'Scores', say: ['We compare the query with each key using the dot product: multiply matching numbers and add them.', 'A bigger score means a better match. Cat scores two and a half, the highest.'],
      cues: [seq(F => Promise.all(F.s.sc.map(t => F.show(t)))), seq(F => F.pulse(F.s.sc[1], 2))] },
    { title: 'Softmax gives weights', say: ['Softmax turns the scores into weights that are positive and add up to one.', 'Cat gets about one half of the attention, and milk about one fifth. The link thickness shows the weight.'],
      cues: [seq(F => Promise.all(F.s.wl.map(t => F.show(t)))),
             seq(F => Promise.all(F.s.arcs.map((a, j) => F.to(a, { opacity: 0.9, 'stroke-width': 1 + 22 * AWT[j] }, 700))))] },
    { title: 'Mix the values', say: ['Each word also offers a value, the information it passes on. The output is the weighted mix of the values.', 'So the new vector for it is mostly about the cat. This is how context flows between words.'],
      cues: [seq(F => F.show(F.s.mix)), seq(F => F.to(F.s.tok[5].rect, { fill: 'var(--c-open)', stroke: 'var(--c-b)' }, 600), F => F.to(F.s.tok[1].rect, { fill: 'var(--c-open)', stroke: 'var(--c-b)' }, 400), F => F.pulse(F.s.tok[5], 1))] }
  ]
};

/* ================= scene 3: self-attention table ================= */
/* toy query/key vectors; causal softmax rows (checked in python):
   cat .35 .65 | sat .09 .61 .30 | on .05 .28 .45 .22 | the .11 .26 .30 .21 .11 | mat .04 .32 .31 .11 .04 .18 */
const TW = ['the', 'cat', 'sat', 'on', 'the', 'mat'];
const TK = [[0.2, -0.6], [1.4, 0.6], [0.6, 1.2], [-0.2, 0.8], [0.2, -0.6], [1.2, 0.2]], TQ = [[0, 0], [0.5, 0], [1.2, 0.4], [0.3, 1.2], [0.2, 0.5], [0.8, 1.0]];
const causal = S => S.map((row, i) => { const w = softmax(row.slice(0, i + 1)); return row.map((_, j) => j <= i ? w[j] : null); });
const TAB = causal(TQ.map(q => TK.map(k => q[0] * k[0] + q[1] * k[1])));
const HEAD2 = causal(TW.map((_, i) => TW.map((_, j) => j === i - 1 ? 3 : 0)));   // "previous word" head
const HEAD3 = causal(TW.map(() => TW.map((_, j) => j === 0 ? 2 : 0)));            // "first word" head
function heat(F, x0, y0, cs, M, o = {}) {
  const g = F.g({}), cells = M.map((row, i) => row.map((v, j) => {
    const r = F.rect(x0 + j * cs, y0 + i * cs, cs - 2, cs - 2, { rx: o.rx ?? 5, fill: v == null ? 'var(--c-grid)' : 'var(--c-b)', opacity: v == null ? 0.5 : 0.06 }, g);
    let t = null; if (o.nums && v != null) { t = F.text(x0 + j * cs + cs / 2 - 1, y0 + i * cs + cs / 2 - 1, f2(v), { size: 11.5, weight: 700, mono: true }, g); Object.assign(t.style, { paintOrder: 'stroke', stroke: 'var(--fig-bg)', strokeWidth: '3px' }); t.style.opacity = 0; }
    return { r, t, v };
  }));
  return { g, cells };
}
const fillRow = (F, H, i, on = true) => Promise.all(H.cells[i].map(c => c.v == null ? null : Promise.all([F.to(c.r, { opacity: on ? 0.12 + 0.88 * c.v : 0.06 }, 450), c.t ? F.to(c.t, { opacity: on ? 1 : 0 }, 450) : null])));
const sceneTable = {
  id: 'table', title: 'Self-attention: every word asks at once', w: 720, h: 420,
  build(F) {
    K.title(F, 'Self-attention weights', 'row = the word that asks · column = the word it looks at · toy numbers');
    const x0 = 120, y0 = 108, cs = 46;
    TW.forEach((w, i) => { F.text(x0 - 12, y0 + i * cs + cs / 2 - 1, w, { size: 14, weight: 700, anchor: 'end' }); F.text(x0 + i * cs + cs / 2 - 1, y0 - 14, w, { size: 13, weight: 700 }); });
    F.s.H = heat(F, x0, y0, cs, TAB, { nums: true });
    F.s.mask = K.callout(F, 330, 128, 'future words are hidden', { tone: 'bad', w: 190 });
    F.s.sum = K.callout(F, 260, 395, 'each row adds up to 1 · all rows are computed in parallel', { tone: 'ok', w: 430 });
    F.s.heads = F.g({}); F.s.heads.style.opacity = 0;
    [['head 1: meaning', TAB], ['head 2: previous word', HEAD2], ['head 3: first word', HEAD3]].forEach(([nm, M], k) => {
      const yy = 92 + k * 100; F.text(560, yy, nm, { size: 12, weight: 700, cls: 'soft' }, F.s.heads);
      const h = heat(F, 524, yy + 10, 12, M, { rx: 2 }); F.s.heads.append(h.g); h.cells.forEach(row => row.forEach(c => { if (c.v != null) F.set(c.r, { opacity: 0.12 + 0.88 * c.v }); }));
    });
  },
  steps: [
    { title: 'Every word asks', say: ['In self attention every word makes its own query, at the same time.', 'Each row of this table is one word asking. The columns are the words it looks at.'],
      cues: [seq(F => Promise.all([0, 1, 2, 3, 4, 5].map(i => fillRow(F, F.s.H, i, false)))), seq(F => fillRow(F, F.s.H, 0), F => fillRow(F, F.s.H, 1))] },
    { title: 'No peeking ahead', say: ['A language model may look only at itself and the words before it. The next words are not written yet.', 'So the upper corner of the table stays empty. Sat looks mostly at cat, its subject.'],
      cues: [seq(F => F.show(F.s.mask), F => fillRow(F, F.s.H, 2), F => fillRow(F, F.s.H, 3)), seq(F => fillRow(F, F.s.H, 4), F => fillRow(F, F.s.H, 5), F => F.pulse(F.s.H.cells[2][1].r, 2))] },
    { title: 'Fast and parallel', say: ['Each row adds up to one.', 'All rows are computed together, so a transformer is fast on modern chips. A recurrent network must walk word by word.'],
      cues: [seq(F => F.hide(F.s.mask), F => F.show(F.s.sum)), seq(F => F.pulse(F.s.sum, 1))] },
    { title: 'Many heads', say: ['A real model runs many such tables side by side. They are called attention heads.', 'Each head learns its own pattern. One may follow meaning, another may simply look at the previous word.'],
      cues: [seq(F => F.hide(F.s.sum), F => F.show(F.s.heads)), seq(F => F.pulse(F.s.heads, 1))] }
  ]
};

/* ================= scene 4: the transformer block ================= */
const sceneBlock = {
  id: 'block', title: 'Inside a transformer', w: 900, h: 400, wide: true,
  build(F) {
    K.title(F, 'One transformer block, stacked many times', 'the same block shape is repeated; each copy has its own learned weights');
    const Y = 230;
    F.s.ghost = [2, 1].map(k => { const r = F.rect(296 + k * 10, 122 - k * 10, 430, 210, { rx: 16, fill: 'var(--card)', stroke: 'var(--line)', 'stroke-width': 1.4 }); r.style.opacity = 0; return r; });
    F.rect(296, 122, 430, 210, { rx: 16, fill: 'var(--card)', stroke: 'var(--c-node-line)', 'stroke-width': 1.6, filter: 'url(#fx-soft)' });
    F.s.nx = F.text(511, 312, 'transformer block', { size: 13, weight: 700, cls: 'soft' });
    F.s.toks = ['dog', 'bites', 'man'].map((w, i) => F.box(64, 170 + i * 60, 76, 34, w, { size: 15, weight: 750 }));
    F.s.pos = [1, 2, 3].map((n, i) => { const c = K.chip(F, 124, 152 + i * 60, 'pos ' + n, 'warn'); c.style.opacity = 0; return c; });
    F.s.emb = F.box(205, Y, 104, 58, 'embedding\n+ position', { size: 13, weight: 700, fill: 'var(--c-open)', stroke: 'var(--c-b)' });
    F.s.att = F.box(380, Y, 110, 58, 'attention', { size: 14, weight: 750, fill: 'var(--c-cur)', stroke: 'var(--c-c)' });
    F.s.add1 = F.box(470, Y, 34, 34, '+', { size: 18, weight: 800, rx: 17 });
    F.s.ffn = F.box(570, Y, 110, 58, 'feed-forward', { size: 14, weight: 750, fill: 'var(--c-closed)', stroke: 'var(--c-a)' });
    F.s.add2 = F.box(668, Y, 34, 34, '+', { size: 18, weight: 800, rx: 17 });
    F.s.out = F.box(820, Y, 110, 58, 'next token\nprobabilities', { size: 13, weight: 700, fill: 'var(--c-path)', stroke: 'var(--c-c)' });
    const ln = (x1, x2) => F.arrow(x1, Y, x2, Y, { w: 2 });
    [[102, 150], [257, 322], [435, 450], [487, 512], [625, 648], [685, 762]].forEach(([a, b]) => ln(a, b));
    F.s.res = [F.path(`M305,${Y} C305,150 470,150 470,${Y - 18}`, { stroke: 'var(--accent2)', 'stroke-width': 3, 'stroke-dasharray': '6 5' }), F.path(`M497,${Y} C497,150 668,150 668,${Y - 18}`, { stroke: 'var(--accent2)', 'stroke-width': 3, 'stroke-dasharray': '6 5' })];
    F.s.res.forEach(p => { p.style.opacity = 0; });
    F.s.resL = F.text(480, 140, 'shortcut (residual): input + correction', { size: 12.5, weight: 700, fill: 'var(--accent2)' }); F.s.resL.style.opacity = 0;
    F.s.dot = F.circle(0, 0, 8, { fill: 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 2, filter: 'url(#fx-glow)' }); F.s.dot.__t = { x: 205, y: Y, s: 1, r: 0 }; F.s.dot.setAttribute('transform', `translate(205,${Y})`); F.s.dot.style.opacity = 0;
    F.s.attNote = K.callout(F, 380, 370, 'words share information', { tone: 'warn', w: 210 });
    F.s.ffnNote = K.callout(F, 580, 370, 'each word is processed on its own', { tone: 'ok', w: 270 });
    F.s.stack = K.callout(F, 511, 74, 'repeated N times: about 12 in small models, about 100 in the largest', { tone: 'accent', w: 520 });
  },
  steps: [
    { title: 'Words become vectors', say: ['First each token becomes a vector, its embedding.', 'Attention by itself ignores word order, so dog bites man and man bites dog would look the same. We add a position signal to each vector.'],
      cues: [seq(F => F.pulse(F.s.emb, 1)), seq(F => Promise.all(F.s.pos.map(c => F.show(c))), F => F.pulse(F.s.emb, 1))] },
    { title: 'Attention layer', say: ['Inside a block, the attention layer lets the words share information, as we just saw.', 'This is where it finds the cat.'],
      cues: [seq(F => F.set(F.s.dot, { opacity: 1, tx: 205, ty: 230 }), F => F.to(F.s.dot, { tx: 380 }, 700), F => F.show(F.s.attNote)), seq(F => F.pulse(F.s.att, 2))] },
    { title: 'Feed-forward layer', say: ['Then a small feed forward network works on each word vector on its own.', 'Much of what the model knows is stored here.'],
      cues: [seq(F => F.set(F.s.dot, { opacity: 1, tx: 380, ty: 230 }), F => F.to(F.s.dot, { tx: 570 }, 700), F => F.hide(F.s.attNote), F => F.show(F.s.ffnNote)), seq(F => F.pulse(F.s.ffn, 2))] },
    { title: 'Shortcuts', say: ['Around each layer runs a shortcut, called a residual connection. The layer only adds a correction to its input.', 'Shortcuts keep the gradient alive, so we can stack many blocks.'],
      cues: [seq(F => F.hide(F.s.ffnNote), F => F.show(F.s.resL), F => Promise.all(F.s.res.map(p => F.show(p)))), seq(F => F.pulse(F.s.add1, 1), F => F.pulse(F.s.add2, 1))] },
    { title: 'A deep stack', say: ['The block is repeated many times, about twelve in small models and around one hundred in the largest.', 'At the top, the vector of the last word gives the probabilities of the next token.'],
      cues: [seq(F => F.hide(F.s.resL), F => Promise.all(F.s.ghost.map(r => F.show(r))), F => F.show(F.s.stack)),
             seq(F => F.set(F.s.dot, { opacity: 1, tx: 570, ty: 230 }), F => F.to(F.s.dot, { tx: 820 }, 800), F => F.pulse(F.s.out, 2))] }
  ]
};

/* ================= scene 5: from base model to assistant ================= */
const STAGES = [
  ['pre-training', 'trillions of tokens', 'the cat sat on the [mat]', 'var(--c-b)'],
  ['fine-tuning', 'curated examples', 'Q: Capital of France?\nA: Paris.', 'var(--c-a)'],
  ['human feedback', 'rankings (week 12)', 'answer A is better\nthan answer B', 'var(--c-d)'],
  ['prompting', 'no training at all', 'cheese = fromage\nbread = ?', 'var(--c-c)']
];
const scenePipe = {
  id: 'pipe', title: 'From a base model to an assistant', w: 900, h: 340, wide: true,
  build(F) {
    K.title(F, 'Three ways to shape a language model', 'from most expensive (left) to cheapest (right)');
    F.s.st = STAGES.map(([nm, sub, ex, col], i) => {
      const x = 120 + i * 220, g = F.g({}); g.style.opacity = 0.25;
      const b = F.box(x, 130, 170, 60, nm, { size: 16, weight: 800, stroke: col, sw: 2.6 }, g);
      F.text(x, 178, sub, { size: 12.5, weight: 650, cls: 'soft' }, g);
      F.rect(x - 90, 205, 180, 70, { rx: 10, fill: 'var(--fig-bg)', stroke: 'var(--line)' }, g);
      F.text(x, 240, ex, { size: 12, mono: true, lh: 18 }, g);
      if (i < 3) F.arrow(x + 88, 130, x + 128, 130, { w: 2.4 }, g);
      return { g, b };
    });
    F.s.cost = K.callout(F, 450, 310, 'pre-training costs the most; prompting only changes the input text', { tone: 'accent', w: 520 });
  },
  steps: [
    { title: 'Pre-training', say: ['Pre-training: the model reads trillions of tokens and learns to predict the next one.', 'This is the expensive part. The result, a base model, only continues text.'],
      cues: [seq(F => F.to(F.s.st[0].g, { opacity: 1 }, 400), F => F.pulse(F.s.st[0].b, 1)), seq(F => F.pulse(F.s.st[0].g, 1))] },
    { title: 'Fine-tuning', say: ['Fine tuning trains the model further on a much smaller set of examples, such as questions with good answers.', 'Now it learns to follow instructions instead of just continuing text.'],
      cues: [seq(F => F.to(F.s.st[1].g, { opacity: 1 }, 400), F => F.pulse(F.s.st[1].b, 1)), seq(F => F.pulse(F.s.st[1].g, 1))] },
    { title: 'Human feedback', say: ['Many assistants then learn from people who compare two answers and pick the better one.', 'We will look at this step in week twelve.'],
      cues: [seq(F => F.to(F.s.st[2].g, { opacity: 1 }, 400), F => F.pulse(F.s.st[2].b, 1)), seq(F => F.pulse(F.s.st[2].g, 1))] },
    { title: 'Prompting', say: ['Last, prompting: we steer the finished model with text alone, and no weights change.', 'Giving a few examples inside the prompt is called few shot prompting.'],
      cues: [seq(F => F.to(F.s.st[3].g, { opacity: 1 }, 400), F => F.pulse(F.s.st[3].b, 1)), seq(F => F.show(F.s.cost))] }
  ]
};

/* ================= scene 6: sampling and temperature ================= */
const P05 = softmax(LOGITS, 0.5), P2 = softmax(LOGITS, 2);   // 0.751 ... and 0.359 ... (checked in python)
const PK = (() => { const s = P1.slice(0, 3).reduce((a, b) => a + b, 0); return P1.map((p, i) => i < 3 ? p / s : 0); })();   // 0.561 0.252 0.187
const sceneSample = {
  id: 'sample', title: 'Sampling and temperature', w: 720, h: 420,
  build(F) {
    K.title(F, 'Choosing the next token after "the cat sat on the"', 'toy scores; temperature divides the scores before softmax');
    F.s.bars = hbars(F, 150, 100, NEXT, { w: 330, rh: 38 });
    F.s.T = F.text(600, 120, 'T = 1', { size: 26, weight: 800, fill: 'var(--c-c)' });
    F.s.Tl = F.text(600, 150, 'temperature', { size: 12.5, cls: 'soft' });
    /* stacked bar 0..1 for the dart */
    const X0 = 90, W = 540, Y = 330; F.s.stk = F.g({}); F.s.stk.style.opacity = 0;
    let acc = 0; P1.forEach((p, i) => { F.rect(X0 + acc * W, Y, p * W - 2, 30, { rx: 4, fill: ['var(--c-b)', 'var(--c-a)', 'var(--c-c)', 'var(--c-d)', 'var(--c-soft)'][i], opacity: 0.75 }, F.s.stk); if (p > 0.06) F.text(X0 + (acc + p / 2) * W, Y + 15, NEXT[i], { size: 12.5, weight: 750, fill: 'var(--fig-bg)' }, F.s.stk); acc += p; });
    F.text(X0, Y + 46, '0', { size: 11, cls: 'soft mono' }, F.s.stk); F.text(X0 + W, Y + 46, '1', { size: 11, cls: 'soft mono' }, F.s.stk);
    F.s.dart = F.g({ transform: `translate(${X0},${Y - 14})` }); F.s.dart.__t = { x: X0, y: Y - 14, s: 1, r: 0 };
    F.path('M0,10 L-7,-4 L7,-4 Z', { fill: 'var(--c-ink)' }, F.s.dart); F.s.dartT = F.text(0, -16, 'random 0.62', { size: 12, weight: 700, mono: true }, F.s.dart); F.s.dart.style.opacity = 0;
    F.s.pick = K.callout(F, 600, 230, 'picked: floor', { tone: 'ok', w: 140 });
    F.s.greedy = K.callout(F, 600, 230, 'greedy: always mat', { tone: 'warn', w: 160 });
    F.s.topk = K.callout(F, 360, 395, 'top-k with k = 3: moon and roof can never be picked', { tone: 'accent', w: 420 });
    F.s.X0 = X0; F.s.W = W;
  },
  steps: [
    { title: 'Greedy choice', say: ['The simplest rule takes the most likely token every time. This is called greedy decoding.', 'It is safe, but the text is often dull and repeats itself.'],
      cues: [seq(F => F.setText(F.s.T, 'T = 1'), F => F.s.bars.set(P1)), seq(F => F.show(F.s.greedy), F => F.pulse(F.s.bars.rows[0].r, 1))] },
    { title: 'Sampling', say: ['Instead we can sample: line up the probabilities and throw a random dart between zero and one.', 'Here the dart lands at zero point six two, inside the floor part. Mat would win about half of the throws.'],
      cues: [seq(F => F.hide(F.s.greedy), F => F.show(F.s.stk), F => F.set(F.s.dart, { opacity: 1, tx: F.s.X0, ty: 316 })),
             seq(F => F.to(F.s.dart, { tx: F.s.X0 + 0.62 * F.s.W }, 1000), F => F.show(F.s.pick))] },
    { title: 'Low temperature', say: ['Temperature divides the scores before softmax. A low temperature, here one half, makes the bars sharper.', 'Mat now gets three quarters. The text becomes safer and more predictable.'],
      cues: [seq(F => F.hide(F.s.pick), F => F.hide(F.s.stk), F => F.hide(F.s.dart), F => F.setText(F.s.T, 'T = 0.5')), seq(F => F.s.bars.set(P05))] },
    { title: 'High temperature', say: ['A high temperature, here two, makes the bars flatter.', 'Mat drops to about one third. The text gets more surprising, and more often wrong.'],
      cues: [seq(F => F.setText(F.s.T, 'T = 2')), seq(F => F.s.bars.set(P2))] },
    { title: 'Top k', say: ['Top k sampling keeps only the k most likely tokens and shares the probability among them.', 'With k equal to three, a silly word like moon can never be chosen.'],
      cues: [seq(F => F.setText(F.s.T, 'T = 1, k = 3'), F => F.s.bars.set(P1)), seq(F => F.s.bars.set(PK.map((p, i) => i < 3 ? p : null)), F => F.show(F.s.topk))] }
  ]
};

/* ================= exercises ================= */
const WORDS = ['cat', 'milk', 'tree', 'river', 'king', 'door', 'rain', 'book'];
const exSoft = {
  title: 'Turn scores into attention weights', random: true,
  gen(r) {
    const w = r.shuffle(WORDS).slice(0, 3); let s; do { s = [r.int(0, 4), r.int(0, 4), r.int(0, 4)]; } while (new Set(s).size < 3);
    const k = r.int(0, 2), p = softmax(s), e = s.map(v => Math.exp(v));
    return {
      prompt: `A query is compared with three keys. The scores (dot products) are <b>${w[0]}: ${s[0]}</b>, <b>${w[1]}: ${s[1]}</b>, <b>${w[2]}: ${s[2]}</b>. Softmax turns them into weights: $w_i = e^{s_i} / \\sum_j e^{s_j}$. What is the attention weight of <b>${w[k]}</b>? (two decimals)`,
      hint: 'Compute e to the power of each score, add the three numbers, then divide the one you need by the sum.',
      answer: `$e^{${s[0]}} = ${f2(e[0])}$, $e^{${s[1]}} = ${f2(e[1])}$, $e^{${s[2]}} = ${f2(e[2])}$, sum = ${f2(e[0] + e[1] + e[2])}. Weight of ${w[k]} = ${f2(e[k])} / ${f2(e[0] + e[1] + e[2])} = <b>${f2(p[k])}</b>. The three weights are ${p.map(f2).join(', ')} and add up to 1.`,
      check: { type: 'number', answer: Math.round(p[k] * 100) / 100, tol: 0.011 }
    };
  }
};
const MIXW = [[0.5, 0.3, 0.2], [0.6, 0.3, 0.1], [0.7, 0.2, 0.1], [0.4, 0.4, 0.2], [0.5, 0.25, 0.25], [0.8, 0.1, 0.1]];
const exMix = {
  title: 'Mix the values', random: true,
  gen(r) {
    const w = r.shuffle(WORDS).slice(0, 3), a = r.shuffle(r.pick(MIXW)), V = w.map(() => [r.int(-3, 4), r.int(-3, 4)]), c = r.int(0, 1);
    const out = [0, 1].map(d => a.reduce((s, ai, i) => s + ai * V[i][d], 0)), nm = c ? 'second' : 'first';
    const tbl = '<table class="mini"><tr><th>word</th><th>weight</th><th>value vector</th></tr>' + w.map((x, i) => `<tr><td>${x}</td><td>${a[i]}</td><td>(${V[i][0]}, ${V[i][1]})</td></tr>`).join('') + '</table>';
    return {
      prompt: 'After softmax, a word gives these attention weights to three words. Its output is the weighted sum of their value vectors.' + tbl + `What is the <b>${nm} number</b> of the output vector?`,
      hint: `Multiply each weight by the ${nm} number of that value vector, then add the three products.`,
      answer: `${a.map((ai, i) => `${ai}·(${V[i][c]})`).join(' + ')} = <b>${f2(out[c])}</b>. The whole output is (${f2(out[0])}, ${f2(out[1])}): it is pulled toward the value with the largest weight.`,
      check: { type: 'number', answer: Math.round(out[c] * 100) / 100, tol: 0.011 }
    };
  }
};
const exTemp = {
  title: 'Temperature changes the odds', random: true,
  gen(r) {
    const z = [r.int(2, 4), r.int(0, 2), r.int(-1, 1)].sort((x, y) => y - x); if (z[0] === z[1]) z[0]++;
    const T = r.pick([0.5, 1, 2]), p = softmax(z, T), toks = r.shuffle(['mat', 'floor', 'sofa', 'bed', 'chair']).slice(0, 3);
    const e = z.map(v => Math.exp(v / T));
    return {
      prompt: `A model gives the scores (logits) <b>${toks[0]}: ${z[0]}</b>, <b>${toks[1]}: ${z[1]}</b>, <b>${toks[2]}: ${z[2]}</b>. With temperature <b>T = ${T}</b>, the probabilities are softmax of score / T. What is the probability of <b>${toks[0]}</b>? (two decimals)`,
      hint: 'Divide every score by T first, then apply softmax: e to the power of each, divided by their sum.',
      answer: `Scores / T = ${z.map(v => f2(v / T)).join(', ')}; e to the power = ${e.map(f2).join(', ')}; probability of ${toks[0]} = <b>${f2(p[0])}</b>. ${T < 1 ? 'A low temperature sharpens the distribution.' : T > 1 ? 'A high temperature flattens it.' : 'With T = 1 this is plain softmax.'} (For comparison, at T = 1 it would be ${f2(softmax(z)[0])}.)`,
      check: { type: 'number', answer: Math.round(p[0] * 100) / 100, tol: 0.011 }
    };
  }
};
const exCount = {
  title: 'How many attention weights?', random: true,
  gen(r) {
    const n = r.int(4, 12), heads = r.pick([1, 2, 4, 8]), causalMode = r.chance(0.6), per = causalMode ? n * (n + 1) / 2 : n * n;
    return {
      prompt: `A sentence has <b>${n} tokens</b>. A layer has <b>${heads}</b> attention head${heads > 1 ? 's' : ''}. ${causalMode ? 'It is a language model, so a token may look only at itself and the tokens <i>before</i> it.' : 'Every token may look at every token, itself included.'} How many attention weights (non-empty cells in the tables) does this layer compute?`,
      hint: causalMode ? 'Token 1 has 1 weight, token 2 has 2, … token n has n. Add them, then multiply by the number of heads.' : 'Each head has a full n by n table.',
      answer: causalMode ? `One head: 1 + 2 + … + ${n} = ${n}·${n + 1}/2 = ${per}. Times ${heads} head(s) = <b>${per * heads}</b>. Note how it grows with the square of the length: long texts are costly.` : `One head: ${n} × ${n} = ${per}. Times ${heads} head(s) = <b>${per * heads}</b>. It grows with the square of the length.`,
      check: { type: 'number', answer: per * heads, tol: 0.01 }
    };
  }
};

Course.lecture({
  id: 'w10', num: 10, week: 10, kind: 'lecture', title: 'Attention, transformers and large language models',
  lede: 'A recurrent network squeezes a whole sentence through one small memory. Attention lets every word look directly at every earlier word. Stack that idea many times, train it to predict the next token on a huge amount of text, and you get a large language model.',
  clos: [2], widgets: ['attention'],
  goals: ['explain <b>tokens</b> and <b>next-token prediction</b>, and why no human labels are needed for pre-training',
    'compute <b>attention</b> by hand: dot-product scores, softmax weights, and a weighted mix of values',
    'read a <b>self-attention table</b> and explain the causal mask and attention heads',
    'name the parts of a <b>transformer block</b>: attention, feed-forward, residual shortcuts, position information',
    'describe <b>pre-training, fine-tuning and prompting</b>, and how <b>temperature</b> and <b>top-k</b> change generated text',
    'explain the limits of language models: <b>hallucination, bias</b> and the difficulty of <b>evaluation</b>'],
  chapters: [
    { id: 'tokens', title: 'Tokens and next-token prediction', blocks: [
      { html: '<p>Last week the decoder of a sequence-to-sequence model had to squeeze the whole input through one vector. This week we remove that bottleneck. But first, the task that every large language model (LLM) is trained on: <b>predict the next token</b>.</p>' },
      { scene: sceneNext },
      { note: '<b>All numbers in this lecture are toy numbers</b>, chosen by hand so you can follow them. Real models use vectors with hundreds or thousands of numbers, learned from data.' },
      { quiz: { q: 'Why can a language model be pre-trained on text from the web without anyone labelling it?', options: ['Because the correct next token is already in the text', 'Because the web is always correct', 'Because the model does not need a loss function', 'Because it uses reinforcement learning'], correct: 0, why: 'Every position in the text gives a free training example: the words so far are the input, the real next token is the target. This is called self-supervised learning.' } }
    ] },
    { id: 'attention', title: 'The attention idea', blocks: [
      { html: '<p>Attention works like a <b>soft dictionary lookup</b>. Each word offers a <b>key</b> (what I contain) and a <b>value</b> (what I pass on). The word that asks makes a <b>query</b> (what I need). Scores are dot products $q \\cdot k$; softmax turns them into weights; the answer is the weighted sum of the values:</p><p style="text-align:center">$\\text{attention}(q) = \\sum_i \\text{softmax}(q \\cdot k_i)\\, v_i$</p><p style="color:var(--muted);font-size:14px">Real models divide the scores by $\\sqrt{d}$ (d = vector length) and compute q, k and v by multiplying the word vectors with three learned matrices. We skip both here.</p>' },
      { scene: sceneLookup },
      { exercise: exSoft },
      { exercise: exMix }
    ] },
    { id: 'self', title: 'Self-attention as a table', blocks: [
      { html: '<p>In <b>self-attention</b> every word of the sentence is a query <i>and</i> a key <i>and</i> a value. The weights form a table: one row per asking word.</p>' },
      { scene: sceneTable },
      { exercise: exCount },
      { quiz: { q: 'Why is a transformer faster to train than a recurrent network on long texts?', options: ['All positions are processed in parallel instead of one after another', 'It has no weights', 'It reads only the last word', 'It does not use a loss function'], correct: 0, why: 'A recurrent network must finish word 9 before word 10. Self-attention computes all rows of the table at once, which suits graphics processors. The price: the table grows with the square of the length.' } }
    ] },
    { id: 'block', title: 'The transformer block', blocks: [
      { html: '<p>A <b>transformer</b> (Vaswani et al., 2017, "Attention is all you need") is a stack of identical blocks. Each block has an attention layer and a feed-forward layer, each wrapped in a <b>residual shortcut</b> (and a normalisation step, not drawn).</p>' },
      { scene: sceneBlock },
      { quiz: { q: 'What would go wrong if we removed the position information?', options: ['"dog bites man" and "man bites dog" would give the same vectors (up to order)', 'The model could not compute softmax', 'The vocabulary would become smaller', 'Training would need labels'], correct: 0, why: 'Attention is a weighted sum, and a sum does not care about order. Position vectors (or rotations of q and k in newer models) tell each token where it is.' } }
    ] },
    { id: 'train', title: 'Pre-training, fine-tuning, prompting', blocks: [
      { scene: scenePipe },
      { note: '<b>In-context learning.</b> With few-shot prompting the model "learns" a task from examples in its input, yet no weight changes. It is pattern completion inside the context window, not training.' }
    ] },
    { id: 'generate', title: 'Generating text: sampling and temperature', blocks: [
      { html: '<p>The model gives a probability for every token. How we <b>choose</b> from them changes the text a lot. With scores $z_i$ and temperature $T$: $p_i = e^{z_i/T} / \\sum_j e^{z_j/T}$.</p>' },
      { scene: sceneSample },
      { exercise: exTemp },
      { html: '<p>Try it yourself: pick a sentence and a word to see its attention, then play with temperature and top-k on the next-token chart. The vectors are a tiny hand-made 2-D toy, so the patterns are only illustrations.</p>' },
      { widget: 'attention' },
      { note: '<b>Try this.</b> (1) In "the animal did not cross the street because it was tired", click <i>it</i>: which word gets the most weight? (2) Move the temperature to 0.2 and then to 3: watch the links become one thick line or all the same. (3) In the next-token chart, set top-k to 1: sampling becomes greedy. Press <b>Sample 100</b> and compare the counts with the bars.' }
    ] },
    { id: 'limits', title: 'Limits: hallucination, bias, evaluation', blocks: [
      { html: '<p><b>Hallucination.</b> The model is trained to produce <i>likely</i> text, not <i>true</i> text. When it does not know, a fluent, confident and wrong answer can still be the most likely continuation: invented references, wrong numbers, fake quotes. Retrieval of real documents and asking for sources help, but do not remove the problem.</p><p><b>Bias.</b> The model learns from human text, including its stereotypes and gaps. It may repeat them, for example linking jobs to one gender, or doing worse in less common languages.</p><p><b>Evaluation is hard.</b> There is often no single correct answer. Benchmarks leak into training data, small changes in the prompt change the score, and fluent text can hide errors. Good practice: test on fresh data, check facts, use several measures and human review.</p>' },
      { quiz: { q: 'A chatbot gives a book reference with a real-looking title, authors and page numbers, but the book does not exist. What is the best explanation?', options: ['The model produced likely-looking text without checking any source (hallucination)', 'The model copied a hidden database by mistake', 'The temperature was exactly 1', 'Attention weights did not add up to one'], correct: 0, why: 'Next-token prediction rewards text that looks like a reference. Nothing in plain generation checks that it is true. Always verify facts and sources an LLM gives you.' } },
      { quiz: { q: 'You lower the temperature to almost 0. Which statement is true?', options: ['The output becomes nearly greedy and repeatable, but it is not guaranteed to be true', 'The model stops hallucinating', 'The model becomes more creative', 'The probabilities no longer add up to one'], correct: 0, why: 'Low temperature only picks the most likely token. If the most likely continuation is wrong, the answer is wrong every time.' } }
    ] }
  ]
});
})();

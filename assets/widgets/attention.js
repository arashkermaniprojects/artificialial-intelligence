/* Attention playground: (1) pick a sentence and a word, see its attention weights over the other words
   (toy hand-made 2-D query/key vectors, temperature, causal mask); (2) next-token bar chart with temperature and top-k sampling. */
Course.widget('attention', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('attention-css')) {
    const st = document.createElement('style'); st.id = 'attention-css';
    st.textContent = `.attw .verd{border-radius:8px;padding:7px 10px;font-size:13.5px;line-height:1.45;background:var(--accent2-bg);color:var(--accent2)}
    .attw .verd.ok{background:var(--ok-bg);color:var(--ok)} .attw .verd.warn{background:var(--warn-bg);color:var(--warn)}
    .attw svg text{font-family:var(--sans);fill:var(--c-ink)} .attw svg .soft{fill:var(--c-soft)} .attw svg .mono{font-family:var(--mono)}
    .attw .wd{cursor:pointer} .attw output{font:600 13px var(--mono);color:var(--fg);min-width:30px;display:inline-block}
    .attw input[type=text]{border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:8px;padding:5px 8px;min-width:0;flex:1 1 220px;font-size:14px}
    .attw .sec{padding:8px 16px;font-weight:700;color:var(--accent);border-top:1px solid var(--line);background:var(--accent-bg);font-size:14px}
    .attw .wl{font:13px var(--mono);display:grid;grid-template-columns:auto 1fr auto;gap:3px 8px;align-items:center}
    .attw .wl i{display:block;height:10px;border-radius:5px;background:var(--c-c)}`;
    document.head.append(st);
  }
  root.classList.add('attw');
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
  const txt = (par, x, y, s, at = {}) => { const t = el('text', Object.assign({ x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, at), par); t.textContent = s; return t; };
  const softmax = (s, T) => { const m = Math.max(...s), e = s.map(v => Math.exp((v - m) / T)), z = e.reduce((a, b) => a + b, 0); return e.map(v => v / z); };

  /* ---------- toy lexicon: 2-D keys (x = "a thing", y = "an action or description") and queries by word kind ---------- */
  const KIND_Q = { noun: [0.3, 1.4], verb: [1.4, 0.2], adj: [1.5, 0], pron: [1.6, -0.2], func: [0.3, 0.3] };
  const LEX = {};
  const add = (kind, list) => list.split(' ').forEach(e => { const [w, x, y] = e.split(':'); LEX[w] = { kind, k: [+x, +y] }; });
  add('noun', 'animal:2.0:0.2 cat:2.0:0.3 dog:2.0:0.3 man:1.9:0.1 woman:1.9:0.1 sister:1.9:0.2 brother:1.9:0.2 teacher:1.9:0.2 student:1.9:0.2 robot:1.8:0.3 street:1.6:-0.2 road:1.6:-0.2 milk:1.4:-0.4 cake:1.4:-0.4 car:1.5:-0.3 book:1.4:-0.3 house:1.5:-0.3 river:1.5:-0.2 ball:1.4:-0.3 window:1.4:-0.3 exam:1.4:-0.2 class:1.5:-0.2');
  add('pron', 'it:0.6:0 she:0.6:0.1 he:0.6:0.1 they:0.6:0.1 her:0.5:0 him:0.5:0 them:0.5:0');
  add('verb', 'cross:0.2:1.6 crossed:0.2:1.6 drank:0.2:1.7 said:0.1:1.5 bring:0.2:1.5 fixed:0.2:1.6 broke:0.2:1.6 sat:0.2:1.6 ate:0.2:1.7 read:0.2:1.6 passed:0.2:1.6 was:0:1.0 is:0:1.0 were:0:1.0 did:0:0.8 would:0:0.8 will:0:0.8 could:0:0.8');
  add('adj', 'tired:0.4:1.2 thirsty:0.4:1.2 hungry:0.4:1.2 wide:0.4:1.1 old:0.3:1.0 broken:0.3:1.0 big:0.3:1.0 small:0.3:1.0 happy:0.4:1.1 red:0.3:0.9 difficult:0.4:1.1 too:0:0.4');
  add('func', 'the:-0.3:-0.3 a:-0.3:-0.3 an:-0.3:-0.3 my:-0.2:-0.3 his:-0.2:-0.3 not:-0.2:0.2 because:-0.3:0.1 on:-0.3:-0.2 in:-0.3:-0.2 to:-0.3:-0.1 and:-0.3:0 of:-0.3:-0.2 that:-0.3:0 with:-0.3:-0.2');
  function hash(s) { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return ((x >>> 0) % 1000) / 1000; }
  function lookup(w) {
    if (LEX[w]) return Object.assign({ known: true }, LEX[w]);
    const j = (hash(w) - 0.5) * 0.3;
    if (w.length <= 3) return { kind: 'func', k: [-0.3 + j, -0.2 - j], known: false };
    if (/(ed|ing)$/.test(w)) return { kind: 'verb', k: [0.2 + j, 1.5 - j], known: false };
    if (/(ful|ous|ive|able|y)$/.test(w)) return { kind: 'adj', k: [0.4 + j, 1.1 - j], known: false };
    return { kind: 'noun', k: [1.6 + j, 0.1 - j], known: false };
  }
  const PRESETS = [
    ['the animal did not cross the street because it was tired', 'it'],
    ['the cat drank milk because it was thirsty', 'it'],
    ['my sister said she would bring the cake', 'she'],
    ['the old man fixed the broken car', 'fixed'],
    ['the student passed the difficult exam', 'exam']
  ];
  const A = { words: [], sel: 0, T: 1, causal: false };

  /* ---------- part 1 DOM ---------- */
  const W = 760, H = 250;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}` });
  const plot = el('svg', { viewBox: '0 0 220 200' }); plot.style.width = '100%'; plot.style.maxWidth = '260px';
  const wlist = h('div', { class: 'wl' }), verdict = h('div', { class: 'verd' }, '');
  const preSel = h('select', {}, PRESETS.map((p, i) => h('option', { value: i }, p[0])));
  const inp = h('input', { type: 'text', placeholder: 'or type your own sentence (up to 12 words) and press Enter', 'aria-label': 'sentence' });
  const tIn = h('input', { type: 'range', min: 0.2, max: 3, step: 0.1, value: 1 }), tOut = h('output', {}, '1.0');
  const cIn = h('input', { type: 'checkbox' });
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Attention playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'toy 2-D vectors made by hand')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), h('div', { class: 'widget-side' }, h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, 'Key space: query arrow and the keys of the words'), plot, wlist)),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Sentence ', preSel), inp),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Temperature ', tIn, tOut), h('label', {}, cIn, 'only earlier words (like a language model)'), btn('Reset', () => resetA())),
    h('div', { style: { padding: '0 14px 12px' } }, verdict));
  preSel.onchange = () => { inp.value = ''; setSentence(PRESETS[+preSel.value][0], PRESETS[+preSel.value][1]); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') setSentence(inp.value); });
  inp.addEventListener('change', () => setSentence(inp.value));
  tIn.oninput = () => { A.T = +tIn.value; tOut.textContent = A.T.toFixed(1); drawA(); };
  cIn.onchange = () => { A.causal = cIn.checked; drawA(); };
  function setSentence(s, pick) {
    const ws = String(s).toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 12);
    if (!ws.length) return;
    A.words = ws; A.sel = pick && ws.includes(pick) ? ws.indexOf(pick) : ws.length - 1; drawA();
  }
  function resetA() { preSel.value = 0; inp.value = ''; tIn.value = 1; A.T = 1; tOut.textContent = '1.0'; cIn.checked = false; A.causal = false; setSentence(PRESETS[0][0], PRESETS[0][1]); }
  function weights() {
    const info = A.words.map(lookup), q = KIND_Q[info[A.sel].kind];
    const allowed = info.map((_, j) => !A.causal || j <= A.sel), idx = info.map((_, j) => j).filter(j => allowed[j]);
    const sc = info.map(o => o.k[0] * q[0] + o.k[1] * q[1]);
    const w = softmax(idx.map(j => sc[j]), A.T), out = info.map(() => null); idx.forEach((j, n) => { out[j] = w[n]; });
    return { info, q, sc, w: out };
  }
  function drawA() {
    svg.textContent = ''; const n = A.words.length, sp = (W - 40) / n, X = i => 20 + sp * (i + 0.5), Y = 205, fs = Math.max(11, Math.min(16, sp / 5));
    const { info, q, sc, w } = weights();
    // arcs
    w.forEach((v, j) => {
      if (v == null) return; let d;
      if (j === A.sel) d = `M${X(j) - 10},${Y - 16} C${X(j) - 34},${Y - 70} ${X(j) + 34},${Y - 70} ${X(j) + 10},${Y - 16}`;
      else { const hh = 26 + Math.abs(X(A.sel) - X(j)) * 0.26; d = `M${X(A.sel)},${Y - 16} Q${(X(A.sel) + X(j)) / 2},${Y - 16 - 2 * hh} ${X(j)},${Y - 16}`; }
      el('path', { d, fill: 'none', stroke: 'var(--c-c)', 'stroke-width': (0.8 + 18 * v).toFixed(2), 'stroke-linecap': 'round', opacity: 0.35 + 0.6 * Math.min(1, v * 2) }, svg);
    });
    w.forEach((v, j) => {
      if (v == null || v < 0.03) return; const hh = j === A.sel ? 56 : 26 + Math.abs(X(A.sel) - X(j)) * 0.26;
      const t = txt(svg, j === A.sel ? X(j) : (X(A.sel) + X(j)) / 2, Y - 16 - hh - 9, Math.round(v * 100) + '%', { 'font-size': 12, 'font-weight': 800 }); t.style.fill = 'var(--c-c)'; Object.assign(t.style, { paintOrder: 'stroke', stroke: 'var(--fig-bg)', strokeWidth: '4px' });
    });
    A.words.forEach((wd, i) => {
      const g = el('g', { class: 'wd', transform: `translate(${X(i)},${Y})` }, svg), bw = Math.min(sp - 6, wd.length * fs * 0.62 + 14);
      const masked = w[i] == null;
      el('rect', { x: -bw / 2, y: -16, width: bw, height: 32, rx: 8, fill: i === A.sel ? 'var(--c-cur)' : 'var(--c-node)', stroke: i === A.sel ? 'var(--c-c)' : 'var(--c-node-line)', 'stroke-width': i === A.sel ? 2.5 : 1.3, opacity: masked ? 0.35 : 1 }, g);
      txt(g, 0, 0, wd, { 'font-size': fs, 'font-weight': 700, opacity: masked ? 0.45 : 1 });
      txt(g, 0, 28, info[i].kind + (info[i].known ? '' : '?'), { 'font-size': 10, class: 'soft' });
      g.addEventListener('click', () => { A.sel = i; drawA(); });
    });
    txt(svg, W / 2, 14, 'click any word: it becomes the query', { 'font-size': 12, class: 'soft' });
    // key-space plot
    plot.textContent = ''; const PX = x => 110 + x * 42, PY = y => 105 - y * 42;
    el('rect', { x: 2, y: 2, width: 216, height: 196, rx: 8, fill: 'var(--fig-bg)', stroke: 'var(--line)' }, plot);
    el('line', { x1: 10, y1: PY(0), x2: 212, y2: PY(0), stroke: 'var(--c-grid)', 'stroke-width': 1.5 }, plot); el('line', { x1: PX(0), y1: 8, x2: PX(0), y2: 192, stroke: 'var(--c-grid)', 'stroke-width': 1.5 }, plot);
    txt(plot, 196, PY(0) - 9, 'thing', { 'font-size': 10, class: 'soft' }); txt(plot, PX(0) + 4, 14, 'action / description', { 'font-size': 10, class: 'soft', 'text-anchor': 'start' });
    const seen = new Set();
    info.forEach((o, i) => {
      const key = o.k.join(','); const x = PX(o.k[0]), y = PY(o.k[1]), v = w[i];
      el('circle', { cx: x, cy: y, r: 4 + (v || 0) * 10, fill: v == null ? 'var(--c-soft)' : 'var(--c-c)', opacity: v == null ? 0.4 : 0.35 + 0.65 * Math.min(1, v * 2) }, plot);
      if (!seen.has(key)) { txt(plot, x + 6, y - 9, A.words[i], { 'font-size': 10, 'text-anchor': 'start' }); seen.add(key); }
    });
    const qa = el('line', { x1: PX(0), y1: PY(0), x2: PX(q[0]), y2: PY(q[1]), stroke: 'var(--c-b)', 'stroke-width': 3, 'stroke-linecap': 'round' }, plot);
    el('circle', { cx: PX(q[0]), cy: PY(q[1]), r: 4, fill: 'var(--c-b)' }, plot); txt(plot, PX(q[0]) + 4, PY(q[1]) + 12, 'query', { 'font-size': 10.5, 'font-weight': 700, 'text-anchor': 'start' }).style.fill = 'var(--c-b)';
    // weight list (sorted)
    wlist.textContent = '';
    const order = w.map((v, j) => [v, j]).filter(a => a[0] != null).sort((a, b) => b[0] - a[0]);
    order.slice(0, 6).forEach(([v, j]) => wlist.append(h('span', {}, A.words[j]), h('i', { style: { width: Math.max(2, v * 100) + '%' } }), h('span', {}, (v * 100).toFixed(0) + '%  score ' + sc[j].toFixed(2))));
    // verdict
    const top = order[0], second = order[1], me = A.words[A.sel];
    const KN = { noun: 'a noun', verb: 'a verb', adj: 'an adjective', pron: 'a pronoun', func: 'a function word' };
    let msg = `"${me}" (${KN[info[A.sel].kind]}) gives the most weight to "${A.words[top[1]]}" (${Math.round(top[0] * 100)}%).`;
    if (A.T <= 0.4) msg += ' Low temperature: attention is almost a hard choice of one word.';
    else if (A.T >= 2.2) msg += ' High temperature: the weights become nearly equal, the word learns little from context.';
    else if (second && top[0] - second[0] < 0.05) msg += ` It is almost a tie with "${A.words[second[1]]}".`;
    if (A.causal) msg += ' Later words are hidden, as in a language model that writes left to right.';
    if (info.some(o => !o.known)) msg += ' Words marked "?" are not in the toy dictionary: their vector is a guess from the spelling.';
    verdict.className = 'verd ' + (A.T <= 0.4 || A.T >= 2.2 ? 'warn' : 'ok'); verdict.textContent = msg;
  }

  /* ---------- part 2: next-token probabilities ---------- */
  const CTXS = [
    ['the cat sat on the', [['mat', 3.0], ['floor', 2.2], ['sofa', 1.9], ['bed', 1.6], ['roof', 1.0], ['table', 0.8], ['moon', -0.5], ['banana', -1.5]]],
    ['the capital of France is', [['Paris', 5.0], ['a', 2.0], ['the', 1.6], ['located', 1.4], ['beautiful', 0.8], ['Lyon', 0.5], ['not', 0.2], ['London', -0.5]]],
    ['once upon a', [['time', 6.0], ['day', 1.0], ['hill', 0.5], ['star', 0.3], ['dream', 0.2], ['night', 0.1], ['mountain', -0.2], ['spreadsheet', -2.0]]],
    ['I like to eat', [['pizza', 2.2], ['chocolate', 1.9], ['rice', 2.0], ['bread', 1.6], ['apples', 1.8], ['fish', 1.5], ['books', -1.0], ['rocks', -2.0]]]
  ];
  const B = { ctx: 0, T: 1, k: 8, counts: null, n: 0, last: null, seed: 1 };
  const bsvg = el('svg', { viewBox: '0 0 560 330' });
  const bverd = h('div', { class: 'verd' }, '');
  const out = h('div', { style: { font: '15px var(--mono)', lineHeight: 1.5 } });
  const cSel = h('select', {}, CTXS.map((c, i) => h('option', { value: i }, '"' + c[0] + ' …"')));
  const t2 = h('input', { type: 'range', min: 0.1, max: 3, step: 0.1, value: 1 }), t2o = h('output', {}, '1.0');
  const kIn = h('input', { type: 'range', min: 1, max: 8, step: 1, value: 8 }), kOut = h('output', {}, '8');
  root.append(h('div', { class: 'sec' }, 'Next-token probabilities: temperature and top-k (toy scores)'),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, bsvg), h('div', { class: 'widget-side' }, out, bverd)),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Context ', cSel), h('label', {}, 'Temperature ', t2, t2o), h('label', {}, 'Top-k ', kIn, kOut)),
    h('div', { class: 'widget-ctl' }, btn('Sample 1', () => sample(1), 'btn primary small'), btn('Sample 100', () => sample(100)), btn('Clear counts', () => { B.counts = null; B.n = 0; B.last = null; drawB(); }),
      btn('Preset: greedy', () => setB(1, 1)), btn('creative', () => setB(1.5, 8)), btn('careful', () => setB(0.7, 3)), btn('Reset', () => { cSel.value = 0; B.ctx = 0; setB(1, 8); })));
  cSel.onchange = () => { B.ctx = +cSel.value; B.counts = null; B.n = 0; B.last = null; drawB(); };
  t2.oninput = () => { B.T = +t2.value; t2o.textContent = B.T.toFixed(1); B.counts = null; B.n = 0; drawB(); };
  kIn.oninput = () => { B.k = +kIn.value; kOut.textContent = B.k; B.counts = null; B.n = 0; drawB(); };
  function setB(T, k) { B.T = T; B.k = k; t2.value = T; kIn.value = k; t2o.textContent = T.toFixed(1); kOut.textContent = k; B.counts = null; B.n = 0; B.last = null; drawB(); }
  function probs() {
    const toks = CTXS[B.ctx][1], p = softmax(toks.map(t => t[1]), B.T);
    const rank = p.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, B.k).map(a => a[1]);
    const keep = new Set(rank), z = rank.reduce((s, i) => s + p[i], 0);
    return { toks, p: p.map((v, i) => keep.has(i) ? v / z : 0), raw: p };
  }
  function sample(n) {
    const { p } = probs(); if (!B.counts) B.counts = p.map(() => 0);
    const r = C.rng(B.seed++ * 7919 + 13);
    for (let s = 0; s < n; s++) { let u = r.next(), i = 0; while (i < p.length - 1 && u >= p[i]) { u -= p[i]; i++; } while (p[i] === 0 && i > 0) i--; B.counts[i]++; B.last = i; }
    B.n += n; drawB();
  }
  function drawB() {
    const { toks, p } = probs(); bsvg.textContent = '';
    const x0 = 120, bw = 330, rh = 36, y0 = 34;
    txt(bsvg, 280, 14, 'bars = probability · dots = share of your samples', { 'font-size': 12, class: 'soft' });
    toks.forEach((t, i) => {
      const y = y0 + i * rh, cut = p[i] === 0;
      txt(bsvg, x0 - 10, y + 12, t[0], { 'font-size': 14, 'font-weight': 700, 'text-anchor': 'end', opacity: cut ? 0.4 : 1 });
      el('rect', { x: x0, y, width: bw, height: 24, rx: 6, fill: 'var(--c-grid)' }, bsvg);
      el('rect', { x: x0, y, width: Math.max(0, bw * p[i]), height: 24, rx: 6, fill: B.last === i ? 'var(--c-c)' : 'var(--c-b)' }, bsvg);
      txt(bsvg, x0 + bw * p[i] + 8, y + 12, cut ? 'cut by top-k' : (p[i] * 100).toFixed(p[i] < 0.01 ? 1 : 0) + '%', { 'font-size': 12, 'font-weight': 700, 'text-anchor': 'start', class: cut ? 'soft' : 'mono' });
      if (B.counts && B.n) { const f = B.counts[i] / B.n; const d = el('circle', { cx: x0 + bw * f, cy: y + 12, r: 6, fill: 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }, bsvg); if (!B.counts[i]) d.setAttribute('opacity', 0.35); }
      txt(bsvg, 548, y + 12, 'score ' + t[1], { 'font-size': 10.5, class: 'soft', 'text-anchor': 'end' });
    });
    out.textContent = ''; out.append(h('div', {}, CTXS[B.ctx][0] + ' ', h('b', { style: { color: 'var(--c-c)' } }, B.last != null ? toks[B.last][0] : '___')));
    if (B.n) out.append(h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, B.n + ' samples so far'));
    const top = p.indexOf(Math.max(...p)), H2 = -p.reduce((s, v) => s + (v > 0 ? v * Math.log2(v) : 0), 0);
    let msg; let cls = 'ok';
    if (B.k === 1) { msg = `Top-k = 1 is greedy decoding: "${toks[top][0]}" every time. Repeatable, but dull.`; cls = 'warn'; }
    else if (B.T <= 0.3) { msg = `Very low temperature: "${toks[top][0]}" gets ${(p[top] * 100).toFixed(0)}%. Almost greedy.`; cls = 'warn'; }
    else if (B.T >= 2) { msg = `High temperature flattens the bars (spread ${H2.toFixed(1)} bits). Rare, odd words now appear in the samples.`; cls = 'warn'; }
    else msg = `"${toks[top][0]}" is most likely (${(p[top] * 100).toFixed(0)}%), but sampling sometimes picks others. ${B.k < 8 ? 'Top-k removed the ' + (8 - B.k) + ' least likely words.' : 'Lower top-k to cut the silly words.'}`;
    if (B.n >= 100) msg += ' With many samples the dots settle near the bars.';
    bverd.className = 'verd ' + cls; bverd.textContent = msg;
  }
  resetA(); drawB();
  return { setSentence, sample };
});

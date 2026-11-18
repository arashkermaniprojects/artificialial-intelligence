/* Bayes rule with natural frequencies (week 14).
   1000 people as dots. Sliders: prevalence (prior), sensitivity, false-positive rate.
   Dots are counted with rounding (whole people); the exact posterior from the probabilities is shown next to it. */
Course.widget('bayes', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('bayes-css')) {
    const st = document.createElement('style'); st.id = 'bayes-css';
    st.textContent = `
    .bayw svg.grid{width:100%;height:auto;display:block}
    .bayw svg.grid circle{transition:fill .45s, opacity .45s, stroke .45s}
    .bayw .big{font:800 30px/1.1 var(--sans);color:var(--accent2)}
    .bayw .insight{border-radius:9px;padding:8px 10px;font-size:13.5px;background:var(--accent2-bg)}
    .bayw .insight.warn{background:var(--warn-bg)} .bayw .insight.ok{background:var(--ok-bg)}
    .bayw .legend i{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:5px;vertical-align:-1px}
    .bayw .muted{color:var(--muted);font-size:12.5px}
    .bayw .tree{font:13px/1.5 var(--mono);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px 10px;white-space:pre}`;
    document.head.append(st);
  }
  root.classList.add('bayw');
  const N = 1000, COLS = 40, ROWS = 25, SP = 14;
  const S = { p: 2, se: 90, fp: 5, onlyPos: false };

  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'grid'); svg.setAttribute('viewBox', `0 0 ${COLS * SP + 8} ${ROWS * SP + 8}`);
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', '1000 people as dots');
  const dots = [];
  for (let i = 0; i < N; i++) { const c = document.createElementNS(NS, 'circle'), col = Math.floor(i / ROWS), row = i % ROWS; c.setAttribute('cx', 4 + SP / 2 + col * SP); c.setAttribute('cy', 4 + SP / 2 + row * SP); c.setAttribute('r', 5.2); c.style.fill = 'var(--c-soft)'; c.style.opacity = 0; c.style.strokeWidth = '1.6'; c.style.transitionDelay = (col * 8) + 'ms'; svg.append(c); dots.push(c); }

  const big = h('div', { class: 'big' }, '–'), sub = h('div', { class: 'muted' }), tree = h('div', { class: 'tree' }), insight = h('div', { class: 'insight' });
  const slider = (key, label, min, max, step) => { const i = h('input', { type: 'range', min, max, step, value: S[key] }), b = h('b', {}, S[key] + '%'); i.addEventListener('input', () => { S[key] = +i.value; b.textContent = S[key] + '%'; update(); }); return { el: h('label', {}, label + ' ', i, b), i, b }; };
  const sp = slider('p', 'sick (prior)', 0.1, 50, 0.1), sse = slider('se', 'test finds the sick (sensitivity)', 50, 100, 1), sfp = slider('fp', 'false alarms among the healthy', 0, 30, 0.5);
  const pos = h('input', { type: 'checkbox' }); pos.onchange = () => { S.onlyPos = pos.checked; update(); };
  const PRE = [['Lecture example', { p: 2, se: 90, fp: 5 }], ['Rare disease', { p: 0.1, se: 99, fp: 1 }], ['Common condition', { p: 30, se: 90, fp: 5 }], ['Second positive test', { p: 26.9, se: 90, fp: 5 }]];
  const set = o => { Object.assign(S, o); sp.i.value = S.p; sp.b.textContent = S.p + '%'; sse.i.value = S.se; sse.b.textContent = S.se + '%'; sfp.i.value = S.fp; sfp.b.textContent = S.fp + '%'; update(); };
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '🧮 Bayes rule with 1000 people'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'natural frequencies')),
    h('div', { class: 'widget-body' },
      h('div', { class: 'widget-canvas' }, svg,
        h('div', { class: 'legend', style: { display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', padding: '4px 6px', color: 'var(--muted)' } },
          h('span', {}, h('i', { style: { background: 'var(--bad)' } }), 'sick, test +'), h('span', {}, h('i', { style: { background: 'var(--bad-bg)', border: '1.5px solid var(--bad)' } }), 'sick, test −'),
          h('span', {}, h('i', { style: { background: 'var(--warn)' } }), 'healthy, test + (false alarm)'), h('span', {}, h('i', { style: { background: 'var(--c-soft)', opacity: .5 } }), 'healthy, test −'))),
      h('div', { class: 'widget-side' }, h('div', { class: 'muted' }, 'If your test is positive, the chance that you are sick:'), big, sub, tree, insight)),
    h('div', { class: 'widget-ctl' }, sp.el, sse.el, sfp.el, h('label', {}, pos, ' show only positive tests')),
    h('div', { class: 'widget-ctl' }, PRE.map(([n, o]) => h('button', { class: 'btn small', onclick: () => set(o) }, n)), h('button', { class: 'btn small', onclick: () => { pos.checked = false; S.onlyPos = false; set(PRE[0][1]); } }, 'Reset')));

  function update() {
    const p = S.p / 100, se = S.se / 100, fp = S.fp / 100;
    const sick = Math.round(N * p), tp = Math.round(sick * se), fn = sick - tp, healthy = N - sick, fa = Math.round(healthy * fp), tn = healthy - fa;
    dots.forEach((d, i) => {
      let fill, stroke = 'none', op = 1, isPos = false;
      if (i < tp) { fill = 'var(--bad)'; isPos = true; }
      else if (i < sick) { fill = 'var(--bad-bg)'; stroke = 'var(--bad)'; }
      else if (i < sick + fa) { fill = 'var(--warn)'; isPos = true; }
      else { fill = 'var(--c-soft)'; op = 0.42; }
      if (S.onlyPos && !isPos) op = 0.08;
      d.style.fill = fill; d.style.stroke = stroke; d.style.opacity = op;
    });
    const exact = p * se / (p * se + (1 - p) * fp), byDots = tp + fa ? tp / (tp + fa) : NaN;
    big.textContent = isFinite(exact) ? (exact * 100).toFixed(1) + '%' : '–';
    sub.textContent = tp + fa ? `From the dots: ${tp} sick among ${tp + fa} positive tests = ${(byDots * 100).toFixed(1)}%` : 'Nobody tests positive.';
    tree.textContent = `${N} people\n├ ${sick} sick\n│  ├ ${tp} test +\n│  └ ${fn} test −\n└ ${healthy} healthy\n   ├ ${fa} test +  (false alarms)\n   └ ${tn} test −`;
    let msg, cls = 'insight';
    if (!(tp + fa)) msg = 'No positive tests at all: with these settings the test never says yes.';
    else if (fa > tp) { msg = `False alarms (${fa}) outnumber the real cases found (${tp}). The healthy group is so large that even a small false-alarm rate produces many positives. That is why a positive result means less than the sensitivity suggests.`; cls += ' warn'; }
    else if (exact > 0.8) { msg = `Now a positive test is strong evidence: most positives are real. This happens when the condition is common, or when the prior is already high, for example after a first positive test.`; cls += ' ok'; }
    else msg = `Real cases (${tp}) outnumber false alarms (${fa}), but not by much. Try lowering the false-alarm rate, and compare with raising the sensitivity: which one helps more here?`;
    insight.className = cls; insight.textContent = msg;
  }
  requestAnimationFrame(() => update());
  return { set };
});

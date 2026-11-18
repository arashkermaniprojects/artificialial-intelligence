/* Fairness playground (week 15).
   Two groups of 100 people. Each person has a model score between 0 and 1; filled dots are qualified, hollow dots are not.
   Scores are placed deterministically (logistic quantiles) so the picture never changes by chance.
   The model selects everyone at or above the group's threshold. Metrics are counted from the 100 dots of each group. */
Course.widget('fairness', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('fairness-css')) {
    const st = document.createElement('style'); st.id = 'fairness-css';
    st.textContent = `
    .fairw svg.strip{width:100%;height:auto;display:block}
    .fairw svg.strip circle{transition:cx .35s, opacity .3s}
    .fairw table.met{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
    .fairw table.met th,.fairw table.met td{padding:3px 6px;border-bottom:1px solid var(--line);text-align:right}
    .fairw table.met th:first-child,.fairw table.met td:first-child{text-align:left;color:var(--muted)}
    .fairw .gap{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:13.5px}
    .fairw .gap b.bad{color:var(--bad)} .fairw .gap b.ok{color:var(--ok)}
    .fairw .insight{border-radius:9px;padding:8px 10px;font-size:13.5px;background:var(--accent2-bg)}
    .fairw .insight.warn{background:var(--warn-bg)} .fairw .insight.ok{background:var(--ok-bg)}
    .fairw .muted{color:var(--muted);font-size:12.5px}`;
    document.head.append(st);
  }
  root.classList.add('fairw');
  const S = { baseA: 50, baseB: 20, tA: 0.5, tB: 0.5, link: true, sepA: 0.15, sepB: 0.08 };
  const W = 640, H = 290, XL = 40, XR = 620, X = v => XL + v * (XR - XL);
  const GY = { A: 78, B: 200 };

  /* ---------- people ---------- */
  function people(base, sep) {
    const nq = Math.round(base), out = [], s = 0.07;
    const q = (mu, n, k) => { const u = (k + 0.5) / n; return Math.max(0.01, Math.min(0.99, mu + s * Math.log(u / (1 - u)))); };
    for (let k = 0; k < nq; k++) out.push({ qual: true, score: q(0.5 + sep, nq, k), k });
    for (let k = 0; k < 100 - nq; k++) out.push({ qual: false, score: q(0.5 - sep, 100 - nq, k), k });
    return out;
  }
  function metrics(P, t) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const p of P) { const sel = p.score >= t; if (p.qual) sel ? tp++ : fn++; else sel ? fp++ : tn++; }
    const q = tp + fn, nq = fp + tn;
    return { tp, fp, fn, tn, acc: (tp + tn) / 100, sel: (tp + fp) / 100, tpr: q ? tp / q : NaN, fpr: nq ? fp / nq : NaN };
  }

  /* ---------- SVG ---------- */
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'strip'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const mk = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); (par || svg).append(e); return e; };
  const txt = (x, y, s, st, par) => { const t = mk('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', style: st || 'font:600 11.5px var(--sans);fill:var(--muted)' }, par); t.textContent = s; return t; };
  const shade = {}, line = {}, dots = { A: [], B: [] };
  for (const g of ['A', 'B']) {
    const y = GY[g];
    shade[g] = mk('rect', { x: X(0.5), y: y - 48, width: XR - X(0.5), height: 96, rx: 8, fill: 'var(--accent2-bg)', opacity: 0.8 });
    mk('rect', { x: XL, y: y - 48, width: XR - XL, height: 96, rx: 8, fill: 'none', stroke: 'var(--line)' });
    txt(XL + 6, y - 38, 'Group ' + g, `font:800 12.5px var(--sans);fill:${g === 'A' ? 'var(--c-b)' : 'var(--c-c)'}`).setAttribute('text-anchor', 'start');
    txt(XL - 6, y - 16, 'qualified', 'font:600 10.5px var(--sans);fill:var(--muted)').setAttribute('text-anchor', 'end');
    txt(XL - 6, y + 22, 'not', 'font:600 10.5px var(--sans);fill:var(--muted)').setAttribute('text-anchor', 'end');
    for (let i = 0; i < 100; i++) dots[g].push(mk('circle', { cx: X(0.5), cy: y, r: 4.6, 'stroke-width': 1.6 }));
    line[g] = mk('line', { x1: X(0.5), y1: y - 52, x2: X(0.5), y2: y + 52, stroke: 'var(--bad)', 'stroke-width': 3, 'stroke-linecap': 'round' });
  }
  mk('line', { x1: XL, y1: 262, x2: XR, y2: 262, stroke: 'var(--c-soft)' });
  for (let v = 0; v <= 1.0001; v += 0.25) { mk('line', { x1: X(v), y1: 258, x2: X(v), y2: 266, stroke: 'var(--c-soft)' }); txt(X(v), 276, v.toFixed(2)); }
  txt((XL + XR) / 2, 288, 'model score  →  selected if score ≥ threshold (red line); shaded = selected zone', 'font:600 11px var(--sans);fill:var(--muted)');

  /* ---------- controls ---------- */
  const sl = (key, label, min, max, step, fmt) => { const i = h('input', { type: 'range', min, max, step, value: S[key] }), b = h('b', {}, fmt(S[key])); i.addEventListener('input', () => { S[key] = +i.value; if (S.link && key === 'tA') S.tB = S.tA; if (S.link && key === 'tB') S.tA = S.tB; sync(); update(); }); return { el: h('label', {}, label + ' ', i, b), i, b, key, fmt }; };
  const f2 = v => v.toFixed(2), fp = v => Math.round(v) + '%';
  const C1 = { baseA: sl('baseA', 'qualified in A', 10, 90, 1, fp), baseB: sl('baseB', 'qualified in B', 10, 90, 1, fp), tA: sl('tA', 'threshold A', 0, 1, 0.01, f2), tB: sl('tB', 'threshold B', 0, 1, 0.01, f2), sepB: sl('sepB', 'how well the model knows B', 0, 0.3, 0.01, v => Math.round(v / 0.3 * 100) + '%') };
  const link = h('input', { type: 'checkbox' }); link.checked = S.link; link.onchange = () => { S.link = link.checked; if (S.link) S.tB = S.tA; sync(); update(); };
  function sync() { for (const k in C1) { C1[k].i.value = S[k]; C1[k].b.textContent = C1[k].fmt(S[k]); } link.checked = S.link; }
  const tbl = h('table', { class: 'met' }), gaps = h('div', { class: 'gap' }), insight = h('div', { class: 'insight' });
  function search(target, P, field) { let best = 0.5, bd = 1e9; for (let t = 0; t <= 1.0001; t += 0.005) { const d = Math.abs(metrics(P, t)[field] - target); if (d < bd - 1e-9) { bd = d; best = t; } } return Math.round(best * 100) / 100; }
  const PRE = [
    ['One threshold for all', () => { S.link = true; S.tA = S.tB = 0.5; }],
    ['Equal selection rates', () => { S.link = false; const A = people(S.baseA, S.sepA), B = people(S.baseB, S.sepB); S.tB = search(metrics(A, S.tA).sel, B, 'sel'); }],
    ['Equal opportunity', () => { S.link = false; const A = people(S.baseA, S.sepA), B = people(S.baseB, S.sepB); S.tB = search(metrics(A, S.tA).tpr, B, 'tpr'); }],
    ['A very good model', () => { S.link = true; S.sepB = 0.3; S.sepA = 0.3; S.tA = S.tB = 0.5; }],
    ['Reset', () => { Object.assign(S, { baseA: 50, baseB: 20, tA: 0.5, tB: 0.5, link: true, sepA: 0.15, sepB: 0.08 }); }]
  ];
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚖ Fairness playground'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, '100 people per group · counted, not estimated')),
    h('div', { class: 'widget-body' },
      h('div', { class: 'widget-canvas' }, svg),
      h('div', { class: 'widget-side' }, tbl, gaps, insight)),
    h('div', { class: 'widget-ctl' }, C1.baseA.el, C1.baseB.el, C1.sepB.el),
    h('div', { class: 'widget-ctl' }, C1.tA.el, C1.tB.el, h('label', {}, link, ' same threshold for both')),
    h('div', { class: 'widget-ctl' }, PRE.map(([n, f]) => h('button', { class: 'btn small', onclick: () => { f(); sync(); update(); } }, n))));

  function update() {
    const res = {};
    for (const g of ['A', 'B']) {
      const P = people(S['base' + g], g === 'A' ? S.sepA : S.sepB), t = S['t' + g], y = GY[g];
      res[g] = metrics(P, t);
      P.forEach((p, i) => {
        const d = dots[g][i], jit = ((p.k * 37) % 11 - 5) * 2.6;
        d.setAttribute('cx', X(p.score)); d.setAttribute('cy', y + (p.qual ? -16 : 22) + jit);
        const sel = p.score >= t, col = g === 'A' ? 'var(--c-b)' : 'var(--c-c)';
        d.style.fill = p.qual ? col : 'var(--card)'; d.style.stroke = col; d.style.opacity = sel ? 1 : 0.4;
      });
      line[g].setAttribute('x1', X(t)); line[g].setAttribute('x2', X(t));
      shade[g].setAttribute('x', X(t)); shade[g].setAttribute('width', Math.max(0, XR - X(t)));
    }
    const pc = v => isFinite(v) ? Math.round(v * 100) + '%' : '–';
    tbl.textContent = '';
    tbl.append(h('tr', {}, h('th', {}, ''), h('th', { style: { color: 'var(--c-b)' } }, 'A'), h('th', { style: { color: 'var(--c-c)' } }, 'B')),
      ...[['accuracy', 'acc'], ['selection rate', 'sel'], ['true positive rate', 'tpr'], ['false positive rate', 'fpr']].map(([n, k]) => h('tr', {}, h('td', {}, n), h('td', {}, pc(res.A[k])), h('td', {}, pc(res.B[k])))));
    const dp = Math.abs(res.A.sel - res.B.sel) * 100, eo = Math.abs(res.A.tpr - res.B.tpr) * 100, ac = Math.abs(res.A.acc - res.B.acc) * 100;
    const EQ = 3, cls = v => v <= EQ ? 'ok' : 'bad';
    gaps.textContent = '';
    gaps.append(h('span', {}, 'Demographic parity gap'), h('b', { class: cls(dp) }, Math.round(dp) + ' pts'), h('span', {}, 'Equal opportunity gap'), h('b', { class: cls(eo) }, isFinite(eo) ? Math.round(eo) + ' pts' : '–'), h('span', {}, 'Accuracy gap'), h('b', { class: cls(ac) }, Math.round(ac) + ' pts'));
    let msg, c = 'insight';
    const baseGap = Math.abs(S.baseA - S.baseB);
    if (dp <= EQ && eo <= EQ) { msg = baseGap > 5 ? 'Both gaps are small here, but look at the accuracy and false positive rates: with different base rates something else has to give.' : 'Both gaps are small. With equal base rates and a model that knows both groups equally well, one threshold can be fair in both senses.'; c += ' ok'; }
    else if (dp <= EQ) { msg = `Selection rates are equal (demographic parity), but qualified people in the two groups have different chances (gap ${Math.round(eo)} points). Fixing one rule broke the other.`; c += ' warn'; }
    else if (eo <= EQ) { msg = `Qualified people have equal chances (equal opportunity), but the groups are selected at different rates (gap ${Math.round(dp)} points), because their base rates differ by ${baseGap} points.${ac > 10 ? ` Accuracy for one group also dropped by ${Math.round(ac)} points.` : ''}`; c += ' warn'; }
    else msg = `Both rules are broken: selection rates differ by ${Math.round(dp)} points and true positive rates by ${Math.round(eo)} points. Try the presets: you can close one gap with group thresholds, but usually not both.`;
    insight.className = c; insight.textContent = msg;
  }
  sync(); update();
  return { update };
});

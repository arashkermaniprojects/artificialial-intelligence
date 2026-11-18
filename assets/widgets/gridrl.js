/* Grid-world reinforcement learning: value iteration step by step (values as colours, policy as arrows)
   and tabular Q-learning (epsilon-greedy, learning rate, Q-table view). Click cells to edit the world. */
Course.widget('gridrl', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('gridrl-css')) {
    const st = document.createElement('style'); st.id = 'gridrl-css';
    st.textContent = `.grw .verd{border-radius:8px;padding:7px 10px;font-size:13.5px;line-height:1.45;background:var(--accent2-bg);color:var(--accent2)}
    .grw .verd.ok{background:var(--ok-bg);color:var(--ok)} .grw .verd.warn{background:var(--warn-bg);color:var(--warn)}
    .grw svg text{font-family:var(--sans);fill:var(--c-ink)} .grw svg .mono{font-family:var(--mono)} .grw svg .cell{cursor:pointer}
    .grw output{font:600 13px var(--mono);color:var(--fg);min-width:34px;display:inline-block}
    .grw .stat{display:grid;grid-template-columns:auto auto;gap:4px 12px;font-size:13.5px} .grw .stat b{font-family:var(--mono)}
    .grw .tabs{display:flex;gap:6px} .grw .tabs button.on{background:var(--accent);color:#fff;border-color:var(--accent)}`;
    document.head.append(st);
  }
  root.classList.add('grw');
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
  const txt = (par, x, y, s, at = {}) => { const t = el('text', Object.assign({ x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, at), par); t.textContent = s; return t; };
  const ACTS = ['U', 'R', 'D', 'L'], DV = { U: [-1, 0], R: [0, 1], D: [1, 0], L: [0, -1] }, SIDE = { U: ['L', 'R'], D: ['L', 'R'], L: ['U', 'D'], R: ['U', 'D'] }, ANG = { U: 0, R: 90, D: 180, L: 270 };
  /* ---------- worlds ---------- */
  const PRESETS = {
    classic: { name: 'Classic 4 × 3', R: 3, C: 4, start: [2, 0], cells: { '1,1': ['wall'], '0,3': ['goal', 1], '1,3': ['pit', -1] } },
    cliff: { name: 'Cliff walk', R: 4, C: 8, start: [3, 0], cells: Object.assign({ '3,7': ['goal', 1] }, ...[1, 2, 3, 4, 5, 6].map(c => ({ ['3,' + c]: ['pit', -1] }))) },
    exits: { name: 'Two exits (+1 near, +10 far)', R: 3, C: 6, start: [2, 1], cells: Object.assign({ '2,0': ['goal', 1], '2,5': ['goal', 10] }, ...[1, 2, 3, 4].map(c => ({ ['1,' + c]: ['pit', -1] }))) },
    maze: { name: 'Small maze', R: 5, C: 5, start: [4, 0], cells: { '0,4': ['goal', 1], '1,1': ['wall'], '1,2': ['wall'], '1,3': ['wall'], '3,1': ['wall'], '3,2': ['wall'], '3,3': ['wall'], '2,2': ['pit', -1] } }
  };
  const S = { preset: 'classic', g: 0.9, noise: 0.2, live: 0, eps: 0.1, alpha: 0.5, mode: 'vi', paint: 'wall' };
  let W;               // world: {R, C, start:[r,c], cells:{key:[type, reward]}}
  let V, P, sweeps, lastDelta, Q, episodes, lastPath, lastRet, rq, viStar;
  const key = (r, c) => r + ',' + c, typ = (r, c) => (W.cells[key(r, c)] || ['empty'])[0];
  const isTerm = (r, c) => typ(r, c) === 'goal' || typ(r, c) === 'pit';
  const termR = (r, c) => (W.cells[key(r, c)] || [0, 0])[1] || 0;
  function move(r, c, a) { const nr = r + DV[a][0], nc = c + DV[a][1]; if (nr < 0 || nr >= W.R || nc < 0 || nc >= W.C || typ(nr, nc) === 'wall') return [r, c]; return [nr, nc]; }
  const outcomes = a => S.noise ? [[1 - S.noise, a], [S.noise / 2, SIDE[a][0]], [S.noise / 2, SIDE[a][1]]] : [[1, a]];
  const zeros = () => Array.from({ length: W.R }, () => Array(W.C).fill(0));
  function qsa(Vm, r, c, a) { return outcomes(a).reduce((s, [p, b]) => { const [nr, nc] = move(r, c, b), t = isTerm(nr, nc); return s + p * (S.live + (t ? termR(nr, nc) : 0) + S.g * (t ? 0 : Vm[nr][nc])); }, 0); }
  function sweep(Vm) {
    const N = zeros(), Pm = zeros().map(r => r.map(() => null)); let d = 0;
    for (let r = 0; r < W.R; r++) for (let c = 0; c < W.C; c++) {
      if (typ(r, c) === 'wall' || isTerm(r, c)) continue;
      let best = -Infinity, ba = null; for (const a of ACTS) { const q = qsa(Vm, r, c, a); if (q > best + 1e-12) { best = q; ba = a; } }
      N[r][c] = best; Pm[r][c] = ba; d = Math.max(d, Math.abs(best - Vm[r][c]));
    }
    return { N, Pm, d };
  }
  function solveVI() { let Vm = zeros(), Pm = null; for (let i = 0; i < 2000; i++) { const s = sweep(Vm); Vm = s.N; Pm = s.Pm; if (s.d < 1e-6) break; } return { V: Vm, P: Pm }; }
  function load(name) { const p = PRESETS[name]; W = { R: p.R, C: p.C, start: p.start.slice(), cells: JSON.parse(JSON.stringify(p.cells)) }; resetAll(); }
  function resetAll() { V = zeros(); P = null; sweeps = 0; lastDelta = null; Q = Array.from({ length: W.R }, () => Array.from({ length: W.C }, () => [0, 0, 0, 0])); episodes = 0; lastPath = null; lastRet = null; rq = C.rng(20261118); viStar = solveVI(); draw(); }
  /* ---------- Q-learning ---------- */
  function greedyQ(r, c, rnd) { const q = Q[r][c], m = Math.max(...q), best = [0, 1, 2, 3].filter(i => Math.abs(q[i] - m) < 1e-12); return rnd ? best[Math.floor(rq.next() * best.length)] : best[0]; }
  function episode() {
    let [r, c] = W.start, ret = 0, disc = 1; const path = [[r, c]];
    for (let t = 0; t < 200; t++) {
      const ai = rq.next() < S.eps ? Math.floor(rq.next() * 4) : greedyQ(r, c, true), a = ACTS[ai];
      let u = rq.next(), b = a; for (const [p, x] of outcomes(a)) { if (u < p) { b = x; break; } u -= p; }
      const [nr, nc] = move(r, c, b), t2 = isTerm(nr, nc), rew = S.live + (t2 ? termR(nr, nc) : 0);
      const target = rew + (t2 ? 0 : S.g * Math.max(...Q[nr][nc]));
      Q[r][c][ai] += S.alpha * (target - Q[r][c][ai]);
      ret += disc * rew; disc *= S.g; r = nr; c = nc; path.push([r, c]);
      if (t2) break;
    }
    episodes++; lastPath = path; lastRet = ret;
  }
  /* ---------- DOM ---------- */
  const svg = el('svg', { viewBox: '0 0 600 400' });
  const st = { a: h('b', {}, ''), b: h('b', {}, ''), c: h('b', {}, ''), d: h('b', {}, '') };
  const lab = { a: h('span', {}, ''), b: h('span', {}, ''), c: h('span', {}, ''), d: h('span', {}, '') };
  const verdict = h('div', { class: 'verd' }, '');
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  const tVI = btn('Value iteration', () => setMode('vi')), tQ = btn('Q-learning', () => setMode('q'));
  const preSel = h('select', {}, Object.entries(PRESETS).map(([k, p]) => h('option', { value: k }, p.name)));
  const paintSel = h('select', {}, [['wall', 'wall'], ['pit', 'pit (−1)'], ['goal', 'goal (+1)'], ['start', 'start'], ['empty', 'empty']].map(([v, t]) => h('option', { value: v }, t)));
  const slider = (lbl, min, max, step, val, fn, fmt = v => v) => { const i = h('input', { type: 'range', min, max, step, value: val }), o = h('output', {}, fmt(val)); i.oninput = () => { o.textContent = fmt(+i.value); fn(+i.value); }; return { box: h('label', {}, lbl + ' ', i, o), i, o, fmt }; };
  const sG = slider('Discount γ', 0.1, 0.99, 0.01, S.g, v => { S.g = v; resetAll(); }, v => v.toFixed(2));
  const sN = slider('Noise', 0, 0.5, 0.05, S.noise, v => { S.noise = v; resetAll(); }, v => v.toFixed(2));
  const sL = slider('Step reward', -0.5, 0, 0.02, S.live, v => { S.live = v; resetAll(); }, v => v.toFixed(2));
  const sE = slider('ε (explore)', 0, 1, 0.05, S.eps, v => { S.eps = v; draw(); }, v => v.toFixed(2));
  const sA = slider('α (learning rate)', 0.05, 1, 0.05, S.alpha, v => { S.alpha = v; draw(); }, v => v.toFixed(2));
  const viCtl = h('div', { class: 'widget-ctl' }, btn('One sweep', () => { const s = sweep(V); V = s.N; P = s.Pm; sweeps++; lastDelta = s.d; draw(); }, 'btn primary small'), btn('Run to convergence', () => { for (let i = 0; i < 2000; i++) { const s = sweep(V); V = s.N; P = s.Pm; sweeps++; lastDelta = s.d; if (s.d < 1e-4) break; } draw(); }), btn('Clear values', () => { V = zeros(); P = null; sweeps = 0; lastDelta = null; draw(); }));
  const qCtl = h('div', { class: 'widget-ctl' }, btn('1 episode', () => { episode(); draw(); }, 'btn primary small'), btn('10 episodes', () => { for (let i = 0; i < 10; i++) episode(); draw(); }), btn('200 episodes', () => { for (let i = 0; i < 200; i++) episode(); draw(); }), btn('Forget Q', () => { Q = Q.map(r => r.map(() => [0, 0, 0, 0])); episodes = 0; lastPath = null; lastRet = null; rq = C.rng(20261118); draw(); }), sE.box, sA.box);
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Grid world: value iteration and Q-learning'), h('span', { class: 'sp' }), h('div', { class: 'tabs' }, tVI, tQ)),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), h('div', { class: 'widget-side' }, h('div', { class: 'stat' }, lab.a, st.a, lab.b, st.b, lab.c, st.c, lab.d, st.d), verdict)),
    viCtl, qCtl,
    h('div', { class: 'widget-ctl' }, sG.box, sN.box, sL.box),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'World ', preSel), h('label', {}, 'Click paints ', paintSel), btn('Reset', () => { S.g = 0.9; S.noise = 0.2; S.live = 0; S.eps = 0.1; S.alpha = 0.5; [[sG, 0.9], [sN, 0.2], [sL, 0], [sE, 0.1], [sA, 0.5]].forEach(([s, v]) => { s.i.value = v; s.o.textContent = s.fmt(v); }); preSel.value = 'classic'; setMode('vi'); load('classic'); })));
  preSel.onchange = () => load(preSel.value);
  paintSel.onchange = () => { S.paint = paintSel.value; };
  function setMode(m) { S.mode = m; tVI.classList.toggle('on', m === 'vi'); tQ.classList.toggle('on', m === 'q'); viCtl.style.display = m === 'vi' ? '' : 'none'; qCtl.style.display = m === 'q' ? '' : 'none'; draw(); }
  function clickCell(r, c) {
    const k = key(r, c), p = S.paint;
    if (p === 'start') { if (typ(r, c) === 'empty') W.start = [r, c]; }
    else if (r === W.start[0] && c === W.start[1]) return;
    else if (p === 'empty' || typ(r, c) === p) delete W.cells[k];
    else W.cells[k] = p === 'wall' ? ['wall'] : p === 'pit' ? ['pit', -1] : ['goal', 1];
    resetAll();
  }
  /* ---------- drawing ---------- */
  function arrow(par, x, y, a, sz, col) { const g = el('g', { transform: `translate(${x},${y}) rotate(${ANG[a]})` }, par); el('path', { d: `M0,${sz * 0.55} L0,${-sz * 0.55} M${-sz * 0.32},${-sz * 0.2} L0,${-sz * 0.55} L${sz * 0.32},${-sz * 0.2}`, fill: 'none', stroke: col, 'stroke-width': Math.max(2, sz * 0.13), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); }
  function draw() {
    svg.textContent = ''; const cs = Math.min(560 / W.C, 380 / W.R), ox = (600 - cs * W.C) / 2, oy = (400 - cs * W.R) / 2;
    svg.setAttribute('viewBox', '0 0 600 400');
    const vals = S.mode === 'vi' ? V : Q.map(row => row.map(q => Math.max(...q)));
    let mx = 1e-9; for (let r = 0; r < W.R; r++) for (let c = 0; c < W.C; c++) if (!isTerm(r, c)) mx = Math.max(mx, Math.abs(vals[r][c])); for (const k in W.cells) if (W.cells[k][1]) mx = Math.max(mx, Math.abs(W.cells[k][1]));
    const fs = Math.max(9, Math.min(15, cs / 5.5));
    for (let r = 0; r < W.R; r++) for (let c = 0; c < W.C; c++) {
      const x = ox + c * cs, y = oy + r * cs, t = typ(r, c), g = el('g', { class: 'cell' }, svg);
      g.addEventListener('click', () => clickCell(r, c));
      el('rect', { x: x + 1.5, y: y + 1.5, width: cs - 3, height: cs - 3, rx: Math.min(9, cs / 8), fill: t === 'wall' ? 'var(--c-wall, var(--c-node-line))' : 'var(--fig-bg)', stroke: 'var(--line)', 'stroke-width': 1.3 }, g);
      if (t === 'goal' || t === 'pit') {
        el('rect', { x: x + 1.5, y: y + 1.5, width: cs - 3, height: cs - 3, rx: Math.min(9, cs / 8), fill: t === 'goal' ? 'var(--ok)' : 'var(--bad)', 'fill-opacity': 0.25 + 0.5 * Math.abs(termR(r, c)) / mx }, g);
        txt(g, x + cs / 2, y + cs / 2, (termR(r, c) > 0 ? '+' : '') + termR(r, c), { 'font-size': fs * 1.3, 'font-weight': 800 }).style.fill = t === 'goal' ? 'var(--ok)' : 'var(--bad)';
        continue;
      }
      if (t === 'wall') continue;
      if (S.mode === 'vi') {
        const v = V[r][c];
        if (v) el('rect', { x: x + 1.5, y: y + 1.5, width: cs - 3, height: cs - 3, rx: Math.min(9, cs / 8), fill: v > 0 ? 'var(--ok)' : 'var(--bad)', 'fill-opacity': (0.1 + 0.55 * Math.abs(v) / mx).toFixed(3) }, g);
        if (sweeps) txt(g, x + cs / 2, y + cs * 0.8, v.toFixed(2), { 'font-size': fs, 'font-weight': 750, class: 'mono' });
        if (P && P[r][c] && sweeps && V[r][c] !== 0) arrow(g, x + cs / 2, y + cs * 0.4, P[r][c], cs * 0.42, 'var(--c-b)');
      } else {
        const q = Q[r][c], cx = x + cs / 2, cy = y + cs / 2, tri = { U: [[x, y], [x + cs, y]], R: [[x + cs, y], [x + cs, y + cs]], D: [[x + cs, y + cs], [x, y + cs]], L: [[x, y + cs], [x, y]] };
        ACTS.forEach((a, i) => { const [p1, p2] = tri[a], v = q[i]; if (!v) return; el('path', { d: `M${cx},${cy} L${p1[0] + (p1[0] < cx ? 2 : -2)},${p1[1] + (p1[1] < cy ? 2 : -2)} L${p2[0] + (p2[0] < cx ? 2 : -2)},${p2[1] + (p2[1] < cy ? 2 : -2)} Z`, fill: v > 0 ? 'var(--ok)' : 'var(--bad)', 'fill-opacity': (0.08 + 0.6 * Math.abs(v) / mx).toFixed(3), stroke: 'var(--line)', 'stroke-width': 0.6 }, g); });
        if (cs >= 64) ACTS.forEach((a, i) => { if (!q[i]) return; const d = DV[a]; txt(g, cx + d[1] * cs * 0.32, cy + d[0] * cs * 0.34, q[i].toFixed(2), { 'font-size': Math.max(8.5, fs * 0.7), class: 'mono' }); });
        if (q.some(v => v !== 0)) arrow(g, cx, cy, ACTS[greedyQ(r, c, false)], cs * 0.3, 'var(--c-b)');
      }
      if (r === W.start[0] && c === W.start[1]) { el('circle', { cx: x + cs * 0.17, cy: y + cs * 0.17, r: Math.max(6, cs * 0.09), fill: 'var(--c-c)' }, g); txt(g, x + cs * 0.17, y + cs * 0.17, 'S', { 'font-size': Math.max(8, cs * 0.11), 'font-weight': 800 }).style.fill = 'var(--fig-bg)'; }
    }
    if (S.mode === 'q' && lastPath) el('polyline', { points: lastPath.map(([r, c]) => (ox + c * cs + cs / 2) + ',' + (oy + r * cs + cs / 2)).join(' '), fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 3, 'stroke-linejoin': 'round', opacity: 0.75, 'pointer-events': 'none' }, svg);
    stats();
  }
  function rollout(Pfun) {   // 300 simulated runs that follow the arrows (with slipping)
    const rr = C.rng(7), res = { win: 0, lose: 0, stuck: 0, steps: 0, ends: {} };
    for (let n = 0; n < 300; n++) {
      let [r, c] = W.start, t = 0;
      for (; t < 100 && !isTerm(r, c); t++) { const a = Pfun(r, c); if (!a) break; let u = rr.next(), b = a; for (const [p, x] of outcomes(a)) { if (u < p) { b = x; break; } u -= p; } [r, c] = move(r, c, b); }
      if (isTerm(r, c)) { const v = termR(r, c); res.ends[v] = (res.ends[v] || 0) + 1; if (v > 0) res.win++; else res.lose++; res.steps += t; } else res.stuck++;
    }
    return res;
  }
  function rolloutText(res) {
    const parts = Object.keys(res.ends).map(Number).sort((a, b) => b - a).map(v => `the ${v > 0 ? '+' : ''}${v} ${v > 0 ? 'exit' : 'pit'} in ${Math.round(res.ends[v] / 3)}%`);
    if (res.stuck) parts.push(`no exit within 100 moves in ${Math.round(res.stuck / 3)}%`);
    const done = 300 - res.stuck;
    return `Following the arrows from S (300 simulated runs${S.noise ? ' with slipping' : ''}): ${parts.join(', ')}.` + (done ? ` Runs that end take about ${Math.round(res.steps / done)} move${Math.round(res.steps / done) === 1 ? '' : 's'}.` : '');
  }
  function stats() {
    tVI.classList.toggle('on', S.mode === 'vi'); tQ.classList.toggle('on', S.mode === 'q');
    let cls = 'verd', msg = '';
    if (S.mode === 'vi') {
      lab.a.textContent = 'Sweeps'; st.a.textContent = sweeps; lab.b.textContent = 'Largest change'; st.b.textContent = lastDelta == null ? '–' : lastDelta.toFixed(4);
      lab.c.textContent = 'Value of start'; st.c.textContent = V[W.start[0]][W.start[1]].toFixed(3); lab.d.textContent = 'Converged value'; st.d.textContent = viStar.V[W.start[0]][W.start[1]].toFixed(3);
      if (!sweeps) msg = 'All values start at zero. Press One sweep: each sweep applies the Bellman equation to every cell once.';
      else if (lastDelta < 1e-4) { cls += ' ok'; msg = `Converged after ${sweeps} sweeps. ` + rolloutText(rollout((r, c) => P[r][c])); if (S.live < -0.2) msg += ' The step cost is high, so the robot hurries even past danger.'; }
      else msg = `Sweep ${sweeps}: values spread one more step from the exits. Largest change ${lastDelta.toFixed(3)}; keep going until it is almost zero.`;
    } else {
      let agree = 0, tot = 0; const mx0 = Math.max(1e-9, ...viStar.V.flat().map(Math.abs)); for (let r = 0; r < W.R; r++) for (let c = 0; c < W.C; c++) { if (typ(r, c) === 'wall' || isTerm(r, c)) continue; tot++; if (Q[r][c].some(v => v !== 0)) { const qa = ACTS[greedyQ(r, c, false)], vs = viStar.V; const qv = qsa(vs, r, c, qa), best = Math.max(...ACTS.map(a => qsa(vs, r, c, a))); if (qv > best - 0.03 * mx0) agree++; } }
      lab.a.textContent = 'Episodes'; st.a.textContent = episodes; lab.b.textContent = 'Last return'; st.b.textContent = lastRet == null ? '–' : lastRet.toFixed(3);
      lab.c.textContent = 'Last length'; st.c.textContent = lastPath ? (lastPath.length - 1) + ' moves' : '–'; lab.d.textContent = 'Agrees with value iteration'; st.d.textContent = agree + ' of ' + tot + ' cells';
      if (!episodes) msg = 'Q-learning knows nothing about the world. Each episode starts at S; every move updates one triangle (one Q value). Press 1 episode.';
      else if (S.eps === 0 && episodes > 5) { cls += ' warn'; msg = `After ${episodes} episodes the arrows agree with value iteration in ${agree} of ${tot} cells. With ε = 0 the agent explores only by accident (ties, slips, and untried actions still at 0 that look better than a punished one). It can lock onto the first route that works.`; }
      else if (agree === tot) { cls += ' ok'; msg = `After ${episodes} episodes the greedy policy (arrows) chooses a best action in every cell, the same as value iteration.`; }
      else msg = `After ${episodes} episodes the arrows agree with value iteration in ${agree} of ${tot} cells. ${episodes < 50 ? 'Run more episodes.' : S.eps < 0.05 ? 'Raise ε so rarely visited cells are tried.' : 'Cells far from the usual path learn slowly.'} The orange line is the last episode${S.eps > 0 ? '; random ε moves make it wander' : ''}.`;
    }
    verdict.className = cls; verdict.textContent = msg;
  }
  load('classic'); setMode('vi');
  return { load, setMode, sweepAll: () => { for (let i = 0; i < 2000; i++) { const s = sweep(V); V = s.N; P = s.Pm; sweeps++; lastDelta = s.d; if (s.d < 1e-4) break; } draw(); }, run: n => { for (let i = 0; i < n; i++) episode(); draw(); }, setS: o => { Object.assign(S, o); resetAll(); }, verdict: () => verdict.textContent };
});

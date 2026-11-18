/* Multi-armed bandit: 3 to 5 slot machines with hidden win chances. Play by hand (click a machine) or auto-play
   greedy, epsilon-greedy or UCB. Live estimates, pull counts, average-reward curve and regret. */
Course.widget('bandit', function (root, opts, C) {
  const h = C.h, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('bandit-css')) {
    const st = document.createElement('style'); st.id = 'bandit-css';
    st.textContent = `.bdw .verd{border-radius:8px;padding:7px 10px;font-size:13.5px;line-height:1.45;background:var(--accent2-bg);color:var(--accent2)}
    .bdw .verd.ok{background:var(--ok-bg);color:var(--ok)} .bdw .verd.warn{background:var(--warn-bg);color:var(--warn)}
    .bdw svg text{font-family:var(--sans);fill:var(--c-ink)} .bdw svg .soft{fill:var(--c-soft)} .bdw svg .mono{font-family:var(--mono)} .bdw .mach{cursor:pointer}
    .bdw output{font:600 13px var(--mono);color:var(--fg);min-width:34px;display:inline-block}
    .bdw .stat{display:grid;grid-template-columns:auto auto;gap:4px 12px;font-size:13.5px} .bdw .stat b{font-family:var(--mono)}`;
    document.head.append(st);
  }
  root.classList.add('bdw');
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
  const txt = (par, x, y, s, at = {}) => { const t = el('text', Object.assign({ x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, at), par); t.textContent = s; return t; };
  const PRESETS = { easy: [0.2, 0.5, 0.8], close: [0.45, 0.5, 0.55], lecture: [0.3, 0.5, 0.7], five: [0.25, 0.4, 0.6, 0.35, 0.5] };
  const S = { probs: PRESETS.lecture.slice(), strat: 'eps', eps: 0.1, c: 1, reveal: false, newSeed: 1 };
  let n, q, total, regret, hist, last, rnd, timer = null, running = false;
  function reset() { stop(); const k = S.probs.length; n = Array(k).fill(0); q = Array(k).fill(0); total = 0; regret = 0; hist = []; last = null; rnd = C.rng(4242 + S.newSeed * 31); draw(); }
  function pull(a, how) {
    const r = rnd.next() < S.probs[a] ? 1 : 0; n[a]++; q[a] += (r - q[a]) / n[a]; total += r; regret += Math.max(...S.probs) - S.probs[a];
    hist.push(total / (hist.length + 1)); last = { a, r, how };
  }
  function choose() {
    const k = S.probs.length, untried = n.findIndex(v => v === 0);
    if (untried >= 0) return untried;
    if (S.strat === 'eps' && rnd.next() < S.eps) return Math.floor(rnd.next() * k);
    const t = hist.length, sc = q.map((v, i) => S.strat === 'ucb' ? v + S.c * Math.sqrt(2 * Math.log(t) / n[i]) : v);
    const m = Math.max(...sc), best = sc.map((v, i) => [v, i]).filter(x => x[0] >= m - 1e-12).map(x => x[1]);
    return best[Math.floor(rnd.next() * best.length)];
  }
  function auto(m) { for (let i = 0; i < m; i++) pull(choose(), 'auto'); draw(); }
  /* ---------- DOM ---------- */
  const svg = el('svg', { viewBox: '0 0 600 400' });
  const st = { t: h('b', {}, '0'), c: h('b', {}, '0'), avg: h('b', {}, '–'), reg: h('b', {}, '0') };
  const verdict = h('div', { class: 'verd' }, '');
  const btn = (t, f, cls = 'btn small') => h('button', { class: cls, onclick: f }, t);
  const strat = h('select', {}, [['greedy', 'greedy'], ['eps', 'ε-greedy'], ['ucb', 'UCB']].map(([v, t]) => h('option', { value: v }, t))); strat.value = S.strat;
  const eIn = h('input', { type: 'range', min: 0, max: 0.5, step: 0.01, value: S.eps }), eOut = h('output', {}, S.eps.toFixed(2));
  const cIn = h('input', { type: 'range', min: 0.1, max: 3, step: 0.1, value: S.c }), cOut = h('output', {}, S.c.toFixed(1));
  const preSel = h('select', {}, [['lecture', 'Lecture (3 machines)'], ['easy', 'Easy (3)'], ['close', 'Close call (3)'], ['five', 'Five machines'], ['random3', 'New random (3)'], ['random4', 'New random (4)'], ['random5', 'New random (5)']].map(([v, t]) => h('option', { value: v }, t)));
  const bPlay = btn('▶ Auto-play', () => toggle(), 'btn primary small');
  const bRev = btn('Reveal', () => { S.reveal = !S.reveal; draw(); });
  root.append(h('div', { class: 'widget-head' }, h('b', {}, '⚗ Slot machines: explore or exploit?'), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'click a machine to pull it')),
    h('div', { class: 'widget-body' }, h('div', { class: 'widget-canvas' }, svg), h('div', { class: 'widget-side' }, h('div', { class: 'stat' }, h('span', {}, 'Pulls'), st.t, h('span', {}, 'Coins won'), st.c, h('span', {}, 'Average per pull'), st.avg, h('span', {}, 'Regret (expected coins lost)'), st.reg), verdict)),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Strategy ', strat), h('label', {}, 'ε ', eIn, eOut), h('label', {}, 'UCB c ', cIn, cOut)),
    h('div', { class: 'widget-ctl' }, bPlay, btn('+1', () => { stop(); auto(1); }), btn('+100', () => { stop(); auto(100); }), btn('+1000', () => { stop(); auto(1000); }), bRev, btn('Reset', () => reset())),
    h('div', { class: 'widget-ctl' }, h('label', {}, 'Machines ', preSel)));
  strat.onchange = () => { S.strat = strat.value; draw(); };
  eIn.oninput = () => { S.eps = +eIn.value; eOut.textContent = S.eps.toFixed(2); draw(); };
  cIn.oninput = () => { S.c = +cIn.value; cOut.textContent = S.c.toFixed(1); draw(); };
  preSel.onchange = () => {
    const v = preSel.value; S.reveal = false;
    if (v.startsWith('random')) { S.newSeed++; const r = C.rng(777 + S.newSeed * 13), k = +v.slice(6); S.probs = Array.from({ length: k }, () => Math.round((0.1 + 0.8 * r.next()) * 100) / 100); }
    else S.probs = PRESETS[v].slice();
    reset();
  };
  function stop() { running = false; clearTimeout(timer); bPlay.textContent = '▶ Auto-play'; }
  function toggle() { if (running) { stop(); return; } running = true; bPlay.textContent = '❚❚ Pause'; const loop = () => { if (!running) return; auto(hist.length < 50 ? 1 : 5); if (hist.length >= 2000) { stop(); return; } timer = setTimeout(loop, hist.length < 50 ? 160 : 40); }; loop(); }
  /* ---------- drawing ---------- */
  function draw() {
    svg.textContent = ''; const k = S.probs.length, sp = 560 / k, X = i => 20 + sp * (i + 0.5), bw = Math.min(90, sp - 16);
    const bestP = Math.max(...S.probs);
    for (let i = 0; i < k; i++) {
      const x = X(i), g = el('g', { class: 'mach' }, svg); g.addEventListener('click', () => { stop(); pull(i, 'hand'); draw(); });
      const hot = last && last.a === i;
      el('rect', { x: x - bw / 2, y: 18, width: bw, height: 70, rx: 12, fill: 'var(--card)', stroke: hot ? 'var(--c-c)' : 'var(--c-node-line)', 'stroke-width': hot ? 4 : 1.8 }, g);
      el('rect', { x: x - bw / 2 + 10, y: 30, width: bw - 20, height: 30, rx: 6, fill: 'var(--fig-bg)', stroke: 'var(--line)' }, g);
      const show = hot ? (last.r ? '1 coin' : '–') : S.reveal ? String(S.probs[i]) : '?';
      txt(g, x, 45, show, { 'font-size': 15, 'font-weight': 800 }).style.fill = hot ? (last.r ? 'var(--ok)' : 'var(--bad)') : 'var(--c-c)';
      txt(g, x, 75, 'machine ' + (i + 1), { 'font-size': 12, 'font-weight': 700 });
      /* estimate bar */
      const by = 110, bh = 120; el('rect', { x: x - 18, y: by, width: 36, height: bh, rx: 6, fill: 'var(--c-grid)' }, g);
      if (n[i]) el('rect', { x: x - 18, y: by + bh * (1 - q[i]), width: 36, height: bh * q[i], rx: 6, fill: 'var(--c-b)' }, g);
      if (S.reveal) { el('line', { x1: x - 26, x2: x + 26, y1: by + bh * (1 - S.probs[i]), y2: by + bh * (1 - S.probs[i]), stroke: S.probs[i] === bestP ? 'var(--ok)' : 'var(--c-c)', 'stroke-width': 3, 'stroke-dasharray': '5 3' }, g); }
      txt(g, x, by + bh + 14, n[i] ? q[i].toFixed(2) : '–', { 'font-size': 12.5, 'font-weight': 750, class: 'mono' });
      txt(g, x, by + bh + 30, n[i] + ' pulls', { 'font-size': 11.5, class: 'soft' });
    }
    /* reward curve */
    const gx = 50, gy = 290, gw = 520, gh = 90;
    el('rect', { x: gx, y: gy, width: gw, height: gh, rx: 6, fill: 'var(--fig-bg)', stroke: 'var(--line)' }, svg);
    txt(svg, gx - 6, gy, '1', { 'font-size': 10, class: 'soft', 'text-anchor': 'end' }); txt(svg, gx - 6, gy + gh, '0', { 'font-size': 10, class: 'soft', 'text-anchor': 'end' });
    const Y = v => gy + gh * (1 - v);
    const spoil = S.reveal || (last && last.how === 'auto');
    if (spoil) { el('line', { x1: gx, x2: gx + gw, y1: Y(bestP), y2: Y(bestP), stroke: 'var(--ok)', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }, svg); txt(svg, gx + gw - 4, Y(bestP) - 8, 'best machine: ' + bestP, { 'font-size': 10.5, 'text-anchor': 'end' }).style.fill = 'var(--ok)'; }
    if (hist.length > 1) { const N = hist.length, stepI = Math.max(1, Math.floor(N / 400)), pts = []; for (let i = 0; i < N; i += stepI) pts.push((gx + gw * i / (N - 1)).toFixed(1) + ',' + Y(hist[i]).toFixed(1)); pts.push((gx + gw).toFixed(1) + ',' + Y(hist[N - 1]).toFixed(1)); el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, svg); }
    txt(svg, gx + gw / 2, gy + gh + 12, 'average coins per pull so far, pull 1 to ' + hist.length, { 'font-size': 11, class: 'soft' });
    /* stats + verdict */
    const t = hist.length; st.t.textContent = t; st.c.textContent = total; st.avg.textContent = t ? (total / t).toFixed(3) : '–'; st.reg.textContent = spoil ? regret.toFixed(1) : 'press Reveal';
    bRev.textContent = S.reveal ? 'Hide' : 'Reveal';
    const bi = S.probs.indexOf(bestP), most = n.indexOf(Math.max(...n)), share = t ? n[bi] / t : 0;
    let msg, cls = 'verd';
    if (!t) msg = 'Each machine pays 1 coin with its own hidden chance. Click machines to play by hand, or auto-play a strategy. Regret counts how many coins you lose, on average, compared with always pulling the best machine.';
    else if (!spoil) msg = `You: ${t} pull${t === 1 ? "" : "s"}, ${total} coin${total === 1 ? "" : "s"} (${(total / t).toFixed(2)} per pull). Which machine do you trust? Press Reveal to see the true chances and your regret.`;
    else if (t < 20) msg = `${t} pulls. With so few pulls the estimates are rough: one lucky coin can make a bad machine look good.`;
    else {
      const mode = last && last.how === 'hand' ? 'You' : (S.strat === 'greedy' ? 'Greedy' : S.strat === 'eps' ? `ε-greedy (ε = ${S.eps.toFixed(2)})` : `UCB (c = ${S.c.toFixed(1)})`);
      msg = `${mode}: ${(share * 100).toFixed(0)}% of all pulls went to the best machine (machine ${bi + 1}). Regret ${regret.toFixed(1)} coins.`;
      if (most !== bi && n[most] > 0.6 * t) { cls += ' warn'; msg += ` Most pulls went to machine ${most + 1}: ${S.strat === 'greedy' ? 'greedy got stuck after an unlucky start. Try ε-greedy or UCB.' : 'stuck on a worse machine. More exploration would help.'}`; }
      else if (S.strat === 'eps' && S.eps >= 0.3 && t > 200) { cls += ' warn'; msg += ` With ε = ${S.eps.toFixed(2)} many pulls are random, so the average can never get close to ${bestP}.`; }
      else if (share > 0.85) { cls += ' ok'; msg += ' It has found the best machine and now mostly exploits it.'; }
      if (Math.max(...S.probs) - S.probs.slice().sort((a, b) => b - a)[1] < 0.08) msg += ' The machines are very close: it takes many pulls to tell them apart.';
    }
    verdict.className = cls; verdict.textContent = msg;
  }
  reset();
  return { auto, reset, pull: i => { pull(i, 'hand'); draw(); }, set: o => { Object.assign(S, o); reset(); }, verdict: () => verdict.textContent };
});

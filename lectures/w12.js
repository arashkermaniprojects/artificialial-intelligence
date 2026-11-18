(function () {
const K = Course.kit;
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const f3 = v => (Math.round(v * 1000) / 1000).toFixed(3);

/* ================= the bandit simulation (seeded, deterministic) =================
   3 machines with win probabilities 0.3, 0.5, 0.7 (hidden from the player). Each strategy first pulls every machine once.
   Checked by running this exact code in node:
   seed 4, 200 pulls: greedy pulls 1/195/4 times, wins 86 coins (machine 3 lost 3 of its first 4 pulls, estimate 0.25);
                      epsilon 0.1 pulls 7/13/180 times, wins 123 coins, estimates 0.14 0.46 0.64.
   500 runs x 1000 pulls: mean reward over pulls 900-1000: greedy 0.623, eps 0.01 0.668, eps 0.1 0.682;
                          regret after 1000 pulls: greedy 80.5, eps 0.01 49.8, eps 0.1 30.9. */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ARMS = [0.3, 0.5, 0.7];
function runBandit(eps, steps, seed) {
  const rnd = mulberry(seed), n = [0, 0, 0], q = [0, 0, 0], rew = [], picks = [], snaps = [];
  for (let t = 0; t < steps; t++) {
    let a;
    if (t < 3) a = t;
    else if (rnd() < eps) a = Math.floor(rnd() * 3);
    else { const m = Math.max(...q), best = [0, 1, 2].filter(i => q[i] === m); a = best.length > 1 ? best[Math.floor(rnd() * best.length)] : best[0]; }
    const r = rnd() < ARMS[a] ? 1 : 0; n[a]++; q[a] += (r - q[a]) / n[a]; rew.push(r); picks.push(a);
    snaps.push({ n: n.slice(), q: q.slice(), tot: rew.reduce((s, v) => s + v, 0), a });
  }
  return { n, q, rew, picks, snaps };
}
const RUN_G = runBandit(0, 200, 4), RUN_E = runBandit(0.1, 200, 4);
let CURVES = null;
function curves() {
  if (CURVES) return CURVES;
  const R = 500, T = 1000; CURVES = {};
  for (const eps of [0, 0.01, 0.1]) { const avg = new Float64Array(T); for (let k = 0; k < R; k++) { const r = runBandit(eps, T, 1000 + k); for (let t = 0; t < T; t++) avg[t] += r.rew[t] / R; } let reg = 0.7 * T; for (let t = 0; t < T; t++) reg -= avg[t]; CURVES[eps] = { avg, reg }; }
  return CURVES;
}

/* ================= scene 1: three slot machines ================= */
const MX = [120, 290, 460];
const sceneBandit = {
  id: 'bandit', title: 'The multi-armed bandit', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'Three slot machines, 200 pulls', 'each pull pays 1 coin or nothing; the win chances are hidden');
    F.s.m = MX.map((x, i) => {
      const g = F.g({}); F.rect(x - 60, 80, 120, 120, { rx: 14, fill: 'var(--card)', stroke: 'var(--c-node-line)', 'stroke-width': 2, filter: 'url(#fx-soft)' }, g);
      const win = F.rect(x - 40, 98, 80, 46, { rx: 8, fill: 'var(--fig-bg)', stroke: 'var(--line)' }, g);
      const p = F.text(x, 121, '?', { size: 24, weight: 800, fill: 'var(--c-c)' }, g);
      F.text(x, 178, 'machine ' + (i + 1), { size: 13, weight: 750 }, g);
      F.line(x + 60, 110, x + 76, 92, { stroke: 'var(--c-node-line)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g); F.circle(x + 78, 89, 7, { fill: 'var(--c-d)' }, g);
      const flash = F.rect(x - 60, 80, 120, 120, { rx: 14, fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 5 }, g); flash.style.opacity = 0;
      /* estimate bar (0 to 1) */
      F.rect(x - 22, 230, 44, 120, { rx: 6, fill: 'var(--c-grid)' }, g);
      const bar = F.rect(x - 22, 350, 44, 0, { rx: 6, fill: 'var(--c-b)' }, g);
      const est = F.text(x, 216, '', { size: 13, weight: 750, mono: true }, g);
      const cnt = F.text(x, 368, '', { size: 12.5, cls: 'soft' }, g);
      const truth = F.line(x - 30, 350, x + 30, 350, { stroke: 'var(--c-c)', 'stroke-width': 3, 'stroke-dasharray': '5 3' }, g); truth.style.opacity = 0;
      return { g, p, bar, est, cnt, flash, truth };
    });
    F.text(290, 390, 'bars = estimated win rate (wins ÷ pulls)', { size: 12, cls: 'soft' });
    F.rect(600, 80, 270, 190, { rx: 14, fill: 'var(--card)', stroke: 'var(--line)', filter: 'url(#fx-soft)' });
    F.s.strat = F.text(735, 108, '', { size: 15, weight: 800, fill: 'var(--c-b)' });
    F.s.pulls = F.text(735, 150, '', { size: 14, weight: 700, mono: true });
    F.s.coins = F.text(735, 196, '', { size: 30, weight: 800, fill: 'var(--c-c)' });
    F.text(735, 228, 'coins won', { size: 12.5, cls: 'soft' });
    F.s.stuck = K.callout(F, 735, 320, 'machine 3 lost 3 of its first 4 pulls:\nestimate 0.25, so greedy never returns', { tone: 'bad', w: 290 });
    F.s.rev = K.callout(F, 735, 320, 'true chances: 0.3, 0.5, 0.7 (dashed lines)', { tone: 'ok', w: 290 });
  },
  steps: [
    { title: 'Three machines', say: ['Here are three slot machines. Each one pays a coin with its own hidden chance.', 'We have two hundred pulls. How should we play to win the most coins?'],
      cues: [seq(F => showRun(F, null, 0, 0)), seq(F => Promise.all(F.s.m.map(m => F.pulse(m.p, 1))))] },
    { title: 'Greedy', say: ['A greedy player tries each machine once, then always pulls the machine with the best average so far.', 'After two hundred pulls it has eighty six coins. It played machine two almost every time.'],
      cues: [seq(F => showRun(F, RUN_G, 3, 0)), seq(F => showRun(F, RUN_G, 200, 3))] },
    { title: 'An unlucky start', say: ['Machine three was unlucky early: it lost three of its first four pulls.', 'Greedy now believes it is bad, and never tries it again. It exploits, but it never explores.'],
      cues: [seq(F => showRun(F, RUN_G, 200, 200), F => F.pulse(F.s.m[2].est, 2)), seq(F => F.show(F.s.stuck))] },
    { title: 'Epsilon greedy', say: ['Epsilon greedy is greedy most of the time, but with a small chance, here one in ten, it pulls a random machine.', 'Those random pulls discover machine three. Same luck, same two hundred pulls, and now one hundred twenty three coins.'],
      cues: [seq(F => F.hide(F.s.stuck, 200), F => showRun(F, RUN_E, 3, 0)), seq(F => showRun(F, RUN_E, 200, 3))] },
    { title: 'The hidden truth', say: ['The true chances were zero point three, zero point five and zero point seven.', 'The estimates of the machines we play often are close. Machine one was rarely tried, so its estimate is rough, and that is fine.'],
      cues: [seq(F => showRun(F, RUN_E, 200, 200), F => Promise.all(F.s.m.map((m, i) => { F.setText(m.p, String(ARMS[i])); m.truth.setAttribute('y1', 350 - 120 * ARMS[i]); m.truth.setAttribute('y2', 350 - 120 * ARMS[i]); return F.show(m.truth); }))),
             seq(F => F.show(F.s.rev))] }
  ]
};
function showRun(F, run, upto, from) {
  const draw = t => {
    const s = run && t > 0 ? run.snaps[t - 1] : { n: [0, 0, 0], q: [0, 0, 0], tot: 0, a: -1 };
    F.s.m.forEach((m, i) => {
      F.set(m.bar, { y: 350 - 120 * s.q[i], height: 120 * s.q[i] }); F.setText(m.est, s.n[i] ? f2(s.q[i]) : '–');
      F.setText(m.cnt, 'pulled ' + s.n[i] + '×'); F.set(m.flash, { opacity: s.a === i && !F.instant && t < upto ? 1 : 0 });
      F.setText(m.p, '?'); F.set(m.truth, { opacity: 0 });
    });
    F.setText(F.s.strat, run === RUN_G ? 'greedy' : run === RUN_E ? 'epsilon-greedy (ε = 0.1)' : 'no strategy yet');
    F.setText(F.s.pulls, 'pull ' + t + ' of 200'); F.setText(F.s.coins, String(s.tot));
  };
  F.set(F.s.rev, { opacity: 0 });
  if (F.instant || upto <= from) { draw(upto); return Promise.resolve(); }
  return (async () => { const stepN = upto - from > 20 ? 5 : 1; for (let t = from + 1; t <= upto; t += stepN) { draw(Math.min(t, upto)); await F.wait(upto - from > 20 ? 45 : 380); } draw(upto); })();
}

/* ================= scene 2: average curves and regret ================= */
const sceneCurves = {
  id: 'curves', title: 'Exploration pays off: average over 500 games', w: 720, h: 420,
  build(F) {
    K.title(F, 'Average reward per pull (500 games of 1000 pulls)', 'same three machines: 0.3, 0.5, 0.7');
    const C = curves(), X0 = 70, Y0 = 330, W = 470, Hh = 250, ymin = 0.45, ymax = 0.75;
    const X = t => X0 + W * t / 999, Y = v => Y0 - Hh * (v - ymin) / (ymax - ymin);
    for (const v of [0.5, 0.6, 0.7]) { F.line(X0, Y(v), X0 + W, Y(v), { stroke: 'var(--c-grid)' }); F.text(X0 - 8, Y(v), v.toFixed(1), { size: 11, cls: 'soft mono', anchor: 'end' }); }
    for (const t of [0, 500, 1000]) F.text(X(Math.min(t, 999)), Y0 + 16, String(t), { size: 11, cls: 'soft mono' });
    F.text(X0 + W / 2, Y0 + 34, 'pull number', { size: 12, cls: 'soft' });
    F.s.best = F.line(X0, Y(0.7), X0 + W, Y(0.7), { stroke: 'var(--c-c)', 'stroke-width': 2, 'stroke-dasharray': '6 4' }); F.s.best.style.opacity = 0;
    F.s.bestL = F.text(X0 + 8, Y(0.7) - 11, 'always the best machine: 0.7', { size: 11.5, weight: 700, fill: 'var(--c-c)', anchor: 'start' }); F.s.bestL.style.opacity = 0;
    const smooth = a => { const out = []; for (let t = 0; t < a.length; t += 4) { let s = 0, n = 0; for (let k = Math.max(0, t - 15); k <= Math.min(a.length - 1, t + 15); k++) { s += a[k]; n++; } out.push([t, s / n]); } return out; };
    const mk = (eps, col, lbl) => { const pts = smooth(C[eps].avg), p = F.path('M' + pts.map(([t, v]) => X(t).toFixed(1) + ',' + Y(v).toFixed(1)).join(' L'), { stroke: col, 'stroke-width': 3, 'stroke-linejoin': 'round' }); p.style.opacity = 0; let s = 0; for (let t = 900; t < 1000; t++) s += C[eps].avg[t]; const tl = F.text(X0 + W + 6, Y(s / 100) + (eps === 0.01 ? 2 : eps === 0.1 ? -12 : 6), lbl + ' ' + f2(s / 100), { size: 12, weight: 750, fill: col, anchor: 'start' }); tl.style.opacity = 0; return { p, tl }; };
    F.s.cg = mk(0, 'var(--c-soft)', 'greedy'); F.s.ce = mk(0.1, 'var(--c-b)', 'ε 0.1'); F.s.cs = mk(0.01, 'var(--c-a)', 'ε 0.01');
    F.s.reg = K.callout(F, 330, 398, `coins lost vs. always best, after 1000 pulls:  greedy ${Math.round(C[0].reg)} · ε 0.01 ${Math.round(C[0.01].reg)} · ε 0.1 ${Math.round(C[0.1].reg)}`, { tone: 'accent', w: 600 });
  },
  steps: [
    { title: 'Many games', say: ['One game can be lucky or unlucky. So we play five hundred games and average the reward at every pull.', 'The dashed line is a player who already knows the best machine: zero point seven coins per pull.'],
      cues: [seq(F => F.show(F.s.best)), seq(F => F.show(F.s.bestL))] },
    { title: 'Greedy', say: ['Greedy stays flat near zero point six two.', 'In many games it locks onto a worse machine after an unlucky start.'],
      cues: [seq(F => F.draw(F.s.cg.p, 1200)), seq(F => F.show(F.s.cg.tl))] },
    { title: 'Epsilon one tenth', say: ['Epsilon one tenth climbs fast and reaches about zero point six eight.', 'It can never reach zero point seven, because one pull in ten is still random.'],
      cues: [seq(F => F.draw(F.s.ce.p, 1200)), seq(F => F.show(F.s.ce.tl))] },
    { title: 'Epsilon one hundredth', say: ['Epsilon one hundredth explores less, so it learns more slowly.', 'But it wastes fewer pulls on random machines, so its curve keeps rising.'],
      cues: [seq(F => F.draw(F.s.cs.p, 1200)), seq(F => F.show(F.s.cs.tl))] },
    { title: 'Regret', say: ['Regret counts the coins lost compared with always playing the best machine.', 'After one thousand pulls, greedy lost about eighty coins, and epsilon one tenth only about thirty. A little exploration is worth it.'],
      cues: [seq(F => F.show(F.s.reg)), seq(F => F.pulse(F.s.reg, 1))] }
  ]
};

/* ================= scene 3: why a table does not scale; function approximation ================= */
const sceneScale = {
  id: 'scale', title: 'From a table to a network', w: 900, h: 400, wide: true,
  build(F) {
    K.title(F, 'A table needs one number for every state and action', 'real problems have far too many states to visit each one');
    F.s.rows = [['grid world', '11 states × 4 actions = 44 numbers', 'ok'], ['backgammon', 'about 10²⁰ states', 'warn'], ['a camera image', 'more possible images than atoms in the universe', 'bad']]
      .map(([a, b, tone], i) => { const g = F.g({}); g.style.opacity = 0; K.chip(F, 110, 100 + i * 52, a, tone, g); F.text(190, 100 + i * 52, b, { size: 14, weight: 650, anchor: 'start' }, g); return g; });
    /* features -> weighted sum */
    F.s.feat = F.g({}); F.s.feat.style.opacity = 0;
    [['distance to goal', 'w1'], ['danger nearby', 'w2'], ['speed', 'w3']].forEach(([f, w], i) => { F.box(150, 270 + i * 40, 150, 30, f, { size: 13, weight: 650 }, F.s.feat); F.arrow(228, 270 + i * 40, 318, 310, { w: 2 }, F.s.feat); F.text(270, 262 + i * 40 + (i === 2 ? 22 : 0), w, { size: 12, weight: 750, fill: 'var(--accent2)' }, F.s.feat); });
    F.box(360, 310, 80, 40, 'Q ≈ Σ w·f', { size: 13, weight: 750, fill: 'var(--c-open)', stroke: 'var(--c-b)' }, F.s.feat);
    /* DQN picture */
    F.s.dqn = F.g({}); F.s.dqn.style.opacity = 0;
    const px = F.g({}, F.s.dqn); for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) F.rect(500 + c * 14, 250 + r * 14, 13, 13, { fill: (r * 7 + c * 3) % 5 < 2 ? 'var(--c-b)' : 'var(--c-node)', opacity: 0.85 }, px);
    F.text(542, 344, 'screen pixels', { size: 12, cls: 'soft' }, F.s.dqn);
    [[625, 5, 'var(--c-b)'], [690, 4, 'var(--c-a)'], [750, 3, 'var(--c-a)']].forEach(([x, n, col], L) => { for (let k = 0; k < n; k++) F.circle(x, 250 + (k + (5 - n) / 2) * 20 + 2, 7, { fill: col, opacity: 0.8 }, F.s.dqn); });
    F.arrow(588, 292, 612, 292, { w: 2 }, F.s.dqn);
    F.s.qs = ['left', 'fire', 'right'].map((a, k) => { const y = 262 + k * 30; F.arrow(760, y, 790, y, { w: 1.6 }, F.s.dqn); return F.text(800, y, 'Q(' + a + ')', { size: 13, weight: 750, mono: true, anchor: 'start' }, F.s.dqn); });
    F.text(690, 360, 'deep Q network: one output per action', { size: 12.5, weight: 700, fill: 'var(--c-b)' }, F.s.dqn);
    F.s.tricks = K.callout(F, 690, 130, 'two tricks keep it stable:\n1. replay memory: learn from shuffled old experience\n2. target network: a slowly updated copy for the targets', { tone: 'accent', w: 390 });
  },
  steps: [
    { title: 'Tables explode', say: ['Our grid world needs only forty four numbers.', 'Backgammon has about ten to the power twenty states, and a game seen through a camera has more possible images than atoms in the universe.'],
      cues: [seq(F => F.show(F.s.rows[0])), seq(F => F.show(F.s.rows[1]), F => F.show(F.s.rows[2]))] },
    { title: 'Generalise', say: ['The agent will never see most states even once. It must generalise: similar states should get similar values.', 'So we describe a state with a few features, and learn one weight per feature instead of one number per state.'],
      cues: [seq(F => F.pulse(F.s.rows[2], 1)), seq(F => F.show(F.s.feat))] },
    { title: 'Deep Q networks', say: ['A deep Q network goes further: a neural network reads the raw screen and outputs one Q value for each action.', 'In 2015 such a network learned to play many Atari games from pixels and score alone, often as well as a human.'],
      cues: [seq(F => F.show(F.s.dqn)), seq(F => Promise.all(F.s.qs.map(q => F.pulse(q, 1))))] },
    { title: 'Keeping it stable', say: ['Learning values with a network can become unstable, because the targets move while we learn.', 'Two tricks help: a replay memory of old experiences, and a slowly updated copy of the network for the targets.'],
      cues: [seq(F => F.pulse(F.s.dqn, 1)), seq(F => F.show(F.s.tricks))] }
  ]
};

/* ================= scene 4: policy gradient intuition ================= */
/* softmax policy over 3 actions, preferences start at 0. One good episode (right, return +1), then one bad (left, return -1), step size 1:
   probabilities 0.333 0.333 0.333 -> 0.212 0.212 0.576 -> 0.070 0.189 0.741 (checked in node) */
const PG_A = ['left', 'wait', 'right'];
const smax = h => { const e = h.map(Math.exp), z = e.reduce((a, b) => a + b, 0); return e.map(v => v / z); };
const PG = (() => { let h = [0, 0, 0]; const out = [smax(h)]; for (const [a, G] of [[2, 1], [0, -1]]) { const p = smax(h); h = h.map((v, i) => v + G * ((i === a ? 1 : 0) - p[i])); out.push(smax(h)); } return out; })();
const scenePG = {
  id: 'pg', title: 'Policy gradient: learn the policy directly', w: 720, h: 380,
  build(F) {
    K.title(F, 'The policy is a set of probabilities', 'after each episode: make what was done more likely if it went well, less likely if it went badly');
    F.s.bars = PG_A.map((a, i) => { const x = 130 + i * 120; F.rect(x - 32, 110, 64, 200, { rx: 8, fill: 'var(--c-grid)' }); const r = F.rect(x - 32, 310, 64, 0, { rx: 8, fill: 'var(--c-b)' }); const t = F.text(x, 96, '', { size: 14, weight: 800, mono: true }); F.text(x, 328, a, { size: 14, weight: 750 }); return { r, t, x }; });
    F.s.c1 = K.callout(F, 560, 150, 'episode 1: chose right,\nreturn +1 → push right up', { tone: 'ok', w: 230 });
    F.s.c2 = K.callout(F, 560, 230, 'episode 2: chose left,\nreturn −1 → push left down', { tone: 'bad', w: 230 });
    F.s.c3 = K.callout(F, 360, 360, 'used for robot control, and to train language models from feedback', { tone: 'accent', w: 520 });
  },
  steps: [
    { title: 'A policy with probabilities', say: ['Instead of learning values, policy search changes the policy itself. Here the policy is three probabilities, one for each action.', 'At the start every action has one third.'],
      cues: [seq(F => setPG(F, 0)), seq(F => Promise.all(F.s.bars.map(b => F.pulse(b.t, 1))))] },
    { title: 'A good episode', say: ['The agent tried right, and the episode ended well, with return plus one.', 'So we push the probability of right up, from thirty three to about fifty eight percent.'],
      cues: [seq(F => setPG(F, 0), F => F.show(F.s.c1)), seq(F => setPG(F, 1))] },
    { title: 'A bad episode', say: ['Next time it tried left, and the return was minus one.', 'Left is pushed down to about seven percent. Right rises to seventy four percent.'],
      cues: [seq(F => setPG(F, 1), F => F.show(F.s.c2)), seq(F => setPG(F, 2))] },
    { title: 'Why it matters', say: ['This idea is called the policy gradient. It works even when there are endless actions, like the angles of a robot arm.', 'It is also how a language model is tuned with human feedback, as we will see next.'],
      cues: [seq(F => F.pulse(F.s.bars[2].r, 1)), seq(F => F.show(F.s.c3))] }
  ]
};
function setPG(F, k) { return Promise.all(F.s.bars.map((b, i) => { const p = PG[k][i]; F.setText(b.t, Math.round(p * 100) + '%'); return Promise.all([F.to(b.r, { y: 310 - 200 * p, height: 200 * p, fill: i === 2 && k ? 'var(--c-a)' : i === 0 && k === 2 ? 'var(--bad)' : 'var(--c-b)' }, 700), F.to(b.t, { y: 296 - 200 * p }, 700)]); })); }

/* ================= scene 5: reinforcement learning from human feedback ================= */
const sceneRLHF = {
  id: 'rlhf', title: 'Reinforcement learning from human feedback', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'Turning human preferences into a reward', 'the language model is the policy, each token is an action, the reward comes at the end of the answer');
    const st = (x, y, t, col) => { const b = F.box(x, y, 150, 54, t, { size: 14, weight: 800, stroke: col, sw: 2.4 }); b.style.opacity = 0.25; return b; };
    F.s.lm = st(100, 140, 'language model\n(fine-tuned)', 'var(--c-b)');
    F.s.prompt = K.chip(F, 100, 86, 'prompt: "explain gravity"', 'accent'); F.s.prompt.style.opacity = 0;
    F.s.ansA = F.box(300, 110, 150, 40, 'answer A', { size: 13.5, weight: 700, fill: 'var(--fig-bg)' }); F.s.ansB = F.box(300, 170, 150, 40, 'answer B', { size: 13.5, weight: 700, fill: 'var(--fig-bg)' });
    [F.s.ansA, F.s.ansB].forEach(b => { b.style.opacity = 0; });
    F.s.human = st(500, 140, 'people compare:\nA is better than B', 'var(--c-d)');
    F.s.rm = st(720, 140, 'reward model\nscore(answer)', 'var(--c-a)');
    F.s.scores = K.callout(F, 720, 86, 'A: 2.1   B: −0.4  (toy scores)', { tone: 'ok', w: 230 });
    F.s.a = [F.arrow(176, 140, 222, 118, { w: 2 }), F.arrow(176, 140, 222, 168, { w: 2 }), F.arrow(377, 140, 423, 140, { w: 2 }), F.arrow(577, 140, 643, 140, { w: 2 })];
    F.s.a.forEach(a => { a.style.opacity = 0; });
    F.s.loop = F.path('M720,170 C720,330 100,330 100,170', { stroke: 'var(--c-c)', 'stroke-width': 3, 'stroke-dasharray': '7 5' }); F.s.loop.setAttribute('marker-end', F.arrowMarker('var(--c-c)')); F.s.loop.style.opacity = 0;
    F.s.loopL = F.text(410, 270, 'policy gradient update (for example PPO): make high-scoring answers more likely', { size: 13, weight: 750, fill: 'var(--c-c)' }); F.s.loopL.style.opacity = 0;
    F.s.kl = K.callout(F, 410, 340, 'with a leash: a penalty for drifting far from the original model', { tone: 'warn', w: 470 });
    F.s.lim = K.callout(F, 450, 390, 'limits: reward hacking (long, flattering answers) · raters disagree and have biases\nhuman feedback does not make answers true', { tone: 'bad', w: 680 });
  },
  steps: [
    { title: 'Start from a fine-tuned model', say: ['We start with a language model that was already fine tuned on good examples.', 'For one prompt, it writes two different answers.'],
      cues: [seq(F => F.to(F.s.lm, { opacity: 1 }, 400), F => F.show(F.s.prompt)), seq(F => F.show(F.s.a[0]), F => F.show(F.s.a[1]), F => F.show(F.s.ansA), F => F.show(F.s.ansB))] },
    { title: 'People compare', say: ['A person reads both answers and says which one is better. Comparing is easier than giving a score.', 'This is repeated for many thousands of prompts.'],
      cues: [seq(F => F.show(F.s.a[2]), F => F.to(F.s.human, { opacity: 1 }, 400)), seq(F => F.pulse(F.s.human, 2))] },
    { title: 'A reward model', say: ['A second network, the reward model, learns to predict these choices. It gives a higher score to the answer people prefer.', 'Now we have a reward for any answer, without asking a person every time.'],
      cues: [seq(F => F.show(F.s.a[3]), F => F.to(F.s.rm, { opacity: 1 }, 400)), seq(F => F.show(F.s.scores))] },
    { title: 'Update the policy', say: ['Then reinforcement learning begins. The model writes answers, the reward model scores them, and a policy gradient update makes high scoring answers more likely.', 'A penalty keeps the model close to where it started, so it does not drift into strange text.'],
      cues: [seq(F => F.draw(F.s.loop, 1200), F => F.show(F.s.loopL)), seq(F => F.show(F.s.kl))] },
    { title: 'Honest limits', say: ['The model learns to please the reward model, not to be right. It may find tricks, such as long, confident or flattering answers. This is called reward hacking.', 'Human raters also disagree and have their own biases. Human feedback makes answers more helpful and polite, but it does not make them true.'],
      cues: [seq(F => F.show(F.s.lim)), seq(F => F.pulse(F.s.lim, 1))] }
  ]
};

/* ================= exercises ================= */
const exMean = {
  title: 'Update a running average', random: true,
  gen(r) {
    const n = r.int(2, 9), wins = r.int(0, n - 1), q = wins / (n - 1), rw = r.int(0, 1), nq = q + (rw - q) / n;
    return {
      prompt: `A machine has been pulled <b>${n - 1}</b> times and paid <b>${wins}</b> coins, so its estimate is ${wins}/${n - 1} = ${f3(q)}. The next pull pays <b>${rw}</b>. Using $Q_{new} = Q + \\frac{1}{n}(r - Q)$ with n = ${n}, what is the new estimate? (three decimals)`,
      hint: 'n is the number of pulls including the new one. Or simply: (old wins + new reward) / n.',
      answer: `$Q_{new} = ${f3(q)} + \\frac{1}{${n}}(${rw} - ${f3(q)}) = ${f3(nq)}$, the same as (${wins} + ${rw}) / ${n} = <b>${f3(nq)}</b>. The update moves the estimate a step of size 1/n toward the new reward.`,
      check: { type: 'number', answer: Math.round(nq * 1000) / 1000, tol: 0.0015 }
    };
  }
};
const exEps = {
  title: 'How often does epsilon-greedy pick the best machine?', random: true,
  gen(r) {
    const k = r.int(3, 6), eps = r.pick([0.05, 0.1, 0.2, 0.3]), p = 1 - eps + eps / k;
    return {
      prompt: `There are <b>${k}</b> machines and the agent already knows which one is best. With <b>ε = ${eps}</b> it picks a random machine (any of the ${k}, the best included), otherwise the best one. What is the probability that it pulls the best machine on a given turn? (three decimals)`,
      hint: 'Two ways to pull the best: the greedy choice (probability 1 − ε), or a random choice that happens to land on it (ε × 1/k).',
      answer: `$(1 - ${eps}) + ${eps} \\times \\frac{1}{${k}} = ${f3(1 - eps)} + ${f3(eps / k)} = $ <b>${f3(p)}</b>. So it wastes about ${Math.round((1 - p) * 100)}% of its pulls once it has learned.`,
      check: { type: 'number', answer: Math.round(p * 1000) / 1000, tol: 0.0015 }
    };
  }
};
const exUCB = {
  title: 'Which machine does UCB pull?', random: true,
  gen(r) {
    let arms, t, sc, best, second;
    do {
      t = r.int(20, 60); const n1 = r.int(2, 20), n2 = r.int(2, 20), n3 = t - n1 - n2; if (n3 < 2) { arms = null; continue; }
      arms = [['A', n1], ['B', n2], ['C', n3]].map(([nm, n]) => ({ nm, n, q: r.int(2, 8) / 10 }));
      sc = arms.map(a => a.q + Math.sqrt(2 * Math.log(t) / a.n)); const s = sc.slice().sort((x, y) => y - x); best = sc.indexOf(s[0]); second = s[1];
    } while (!arms || sc[best] - second < 0.03);
    const tbl = '<table class="mini"><tr><th>machine</th><th>average Q</th><th>pulls n</th></tr>' + arms.map(a => `<tr><td>${a.nm}</td><td>${a.q}</td><td>${a.n}</td></tr>`).join('') + '</table>';
    return {
      prompt: `After t = <b>${t}</b> pulls, the upper confidence bound rule (UCB1) pulls the machine with the largest $Q + \\sqrt{2 \\ln t / n}$.` + tbl + 'Type the letter of the machine it pulls next.',
      hint: `ln ${t} = ${f3(Math.log(t))}. For each machine compute the bonus √(2·ln t / n) and add it to Q. Rarely pulled machines get a big bonus.`,
      answer: arms.map((a, i) => `${a.nm}: ${a.q} + √(2·${f3(Math.log(t))}/${a.n}) = ${f3(sc[i])}`).join('; ') + `. Largest: <b>${arms[best].nm}</b>. UCB explores machines it is unsure about, not at random.`,
      check: { type: 'text', answer: arms[best].nm }
    };
  }
};
const exTable = {
  title: 'How big is the Q table?', random: true,
  gen(r) {
    const s = r.int(3, 8), v = r.pick([2, 3, 4, 10]), a = r.int(2, 6), states = Math.pow(v, s), entries = states * a;
    return {
      prompt: `A robot has <b>${s} sensors</b>, and each sensor reads one of <b>${v}</b> values. A state is one reading of all sensors. The robot has <b>${a} actions</b>. How many numbers does a full Q table need?`,
      hint: 'Number of states = (values per sensor) to the power (number of sensors). Then one number per state and action.',
      answer: `States = ${v}^${s} = ${states.toLocaleString('en-US')}. Q table = ${states.toLocaleString('en-US')} × ${a} = <b>${entries.toLocaleString('en-US')}</b> numbers. Add one more sensor and it is ${v} times bigger: this is why we need function approximation.`,
      check: { type: 'number', answer: entries, tol: 0.5 }
    };
  }
};

Course.lecture({
  id: 'w12', num: 12, week: 12, kind: 'lecture', title: 'Reinforcement learning 2: exploration, generalisation, policy search, RLHF',
  lede: 'An agent that only exploits what it knows can get stuck forever. This week: how to explore wisely, how to learn when there are too many states for a table, how to improve a policy directly, and how the same ideas tune large language models with human feedback.',
  clos: [3], widgets: ['bandit'],
  goals: ['explain the <b>exploration versus exploitation</b> trade-off with the multi-armed bandit',
    'compare <b>greedy</b>, <b>epsilon-greedy</b> and <b>UCB</b>, and read reward and <b>regret</b> curves',
    'explain why a Q table does not scale, and how <b>function approximation</b> and <b>deep Q networks</b> help',
    'describe the idea of <b>policy search</b> and the <b>policy gradient</b>',
    'describe the steps of <b>reinforcement learning from human feedback</b> for language models, and its limits'],
  chapters: [
    { id: 'bandit', title: 'Exploration versus exploitation', blocks: [
      { html: '<p>Every learning agent faces a dilemma. <b>Exploit</b>: use the best action found so far. <b>Explore</b>: try something else that might be better. Should you go to your favourite restaurant, or try the new one? The simplest setting is the <b>multi-armed bandit</b>: one state, several slot machines ("one-armed bandits"), each with a hidden chance of paying.</p>' },
      { scene: sceneBandit },
      { exercise: exMean },
      { exercise: exEps }
    ] },
    { id: 'curves', title: 'Reward and regret curves', blocks: [
      { scene: sceneCurves },
      { html: '<p>A smarter way to explore is <b>optimism in the face of uncertainty</b>. <b>UCB</b> (upper confidence bound) pulls the machine with the largest $Q + \\sqrt{2 \\ln t / n}$: the bonus is big for machines tried only a few times, and shrinks as we learn. It explores where it is unsure, not at random, and its regret grows only like $\\ln t$.</p>' },
      { exercise: exUCB },
      { widget: 'bandit' },
      { note: '<b>Try this.</b> (1) Play 20 pulls by hand, then press Reveal: did you find the best machine? (2) Choose "Close call" and auto-play 1000 pulls with greedy, then with ε-greedy and UCB: compare the regret. (3) Set ε = 0.5: you explore a lot. Why does the reward curve stay low?' }
    ] },
    { id: 'scale', title: 'Generalisation: when the table is too big', blocks: [
      { scene: sceneScale },
      { exercise: exTable },
      { quiz: { q: 'Why does a deep Q network help with a game seen through a camera?', options: ['Similar screens get similar Q values, so experience in one state helps in states never seen before', 'It stores every screen in a table', 'It removes the need for rewards', 'It makes the game deterministic'], correct: 0, why: 'A table learns each state separately. A function approximator (here a network) shares its weights between states, so it can generalise to new screens.' } }
    ] },
    { id: 'policy', title: 'Policy search', blocks: [
      { html: '<p>Q-learning learns values and acts greedily on them. <b>Policy search</b> skips the values: it adjusts the parameters of the policy itself, $\\pi_\\theta(a \\mid s)$, in the direction that increases the expected return. The <b>policy gradient</b> (REINFORCE) rule: after an episode with return G, change θ by $\\alpha \\, G \\, \\nabla_\\theta \\log \\pi_\\theta(a \\mid s)$ for each action taken. In practice we subtract a baseline (an average return) from G to reduce noise.</p>' },
      { scene: scenePG },
      { quiz: { q: 'In the scene, why did the probability of "wait" also change, although "wait" was never chosen?', options: ['The probabilities must add up to 1, so pushing one action up pushes the others down', 'Because of a bug', 'Because wait had the highest return', 'Because the discount was 0.9'], correct: 0, why: 'The softmax policy shares one unit of probability. Increasing right in episode 1 took probability from left and wait. In episode 2, lowering left gave some back to wait and right.' } }
    ] },
    { id: 'rlhf', title: 'Reinforcement learning from human feedback', blocks: [
      { html: '<p>A pre-trained and fine-tuned language model (week 10) can still give answers that are unhelpful, rude or unsafe. <b>Reinforcement learning from human feedback</b> (RLHF) uses the ideas of this week to shape it with people\'s preferences.</p>' },
      { scene: sceneRLHF },
      { note: '<b>Variants.</b> Direct preference optimisation (DPO) skips the separate reward model and trains the language model on the comparisons directly. Feedback can also come from another AI model following written rules ("constitutional AI", RLAIF). The limits stay the same: the model optimises what the feedback rewards, which is not the same as the truth.' },
      { quiz: { q: 'After RLHF a chatbot writes longer and longer answers that raters liked, even when a short answer would be better. What is this called?', options: ['Reward hacking: optimising the learned reward instead of the real goal', 'Exploration', 'Overfitting of the tokenizer', 'The Markov property'], correct: 0, why: 'The reward model is only an imperfect copy of human judgement. If it slightly prefers long answers, the policy learns to exploit that. The KL penalty and better reward models reduce, but do not remove, this effect.' } },
      { quiz: { q: 'Which statement about RLHF is correct?', options: ['The language model is the policy, its tokens are the actions, and the reward model gives the reward', 'Humans write every answer the model will ever give', 'RLHF makes the model always tell the truth', 'RLHF replaces pre-training'], correct: 0, why: 'RLHF is a final tuning stage on top of pre-training and fine-tuning. It changes behaviour and style toward what raters prefer, but it adds little new knowledge and gives no guarantee of truth.' } }
    ] }
  ]
});
})();

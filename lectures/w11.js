(function () {
const K = Course.kit;
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const f3 = v => (Math.round(v * 1000) / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');

/* ================= the grid world used all lecture =================
   3 rows x 4 columns, wall at (1,1), goal +1 at (0,3), pit -1 at (1,3), start (2,0).
   Entering the goal gives +1, entering the pit gives -1, then the episode ends (terminal value 0).
   Deterministic value iteration with discount 0.9 (checked in python):
   sweep 1: (0,2)=1 · 2: (0,1)=0.9, (1,2)=0.9 · 3: (0,0)=0.81, (2,2)=0.81 · 4: (1,0)=0.729, (2,1)=0.729, (2,3)=0.729 · 5: (2,0)=0.656 (converged)
   With noise 0.2 (80% intended, 10% each side), converged: start 0.545, (0,2) 0.942 (checked in python). */
const R = 3, C = 4, WALL = '1,1', GOAL = '0,3', PIT = '1,3', START = '2,0';
const ACT = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] }, SIDE = { U: 'LR', D: 'LR', L: 'UD', R: 'UD' }, ANG = { U: 0, R: 90, D: 180, L: 270 };
const key = (r, c) => r + ',' + c;
function move(r, c, a) { const nr = r + ACT[a][0], nc = c + ACT[a][1]; if (nr < 0 || nr >= R || nc < 0 || nc >= C || key(nr, nc) === WALL) return [r, c]; return [nr, nc]; }
const term = k => k === GOAL || k === PIT, rew = k => k === GOAL ? 1 : k === PIT ? -1 : 0;
function viSweeps(g, noise, n) {
  let V = {}; const out = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) V[key(r, c)] = 0;
  for (let it = 0; it < n; it++) {
    const N = {}, P = {};
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const k = key(r, c); if (k === WALL || term(k)) { N[k] = 0; continue; }
      let best = -Infinity, ba = null;
      for (const a of 'URDL') {
        const outs = [[1 - noise, a]].concat(noise ? SIDE[a].split('').map(b => [noise / 2, b]) : []);
        const q = outs.reduce((s, [p, b]) => { const [nr, nc] = move(r, c, b), nk = key(nr, nc); return s + p * (rew(nk) + g * (term(nk) ? 0 : V[nk])); }, 0);
        if (q > best + 1e-12) { best = q; ba = a; }
      }
      N[k] = best; P[k] = ba;
    }
    V = N; out.push({ V, P });
  }
  return out;
}
const DET = viSweeps(0.9, 0, 6), NOISY = viSweeps(0.9, 0.2, 60);

function gridFig(F, x0, y0, cs) {
  const G = { cells: {}, x0, y0, cs };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const k = key(r, c), x = x0 + c * cs, y = y0 + r * cs, g = F.g({});
    const fill = k === WALL ? 'var(--c-wall, var(--c-node-line))' : k === GOAL ? 'var(--c-goal)' : k === PIT ? 'var(--bad-bg)' : 'var(--fig-bg)';
    const base = F.rect(x + 2, y + 2, cs - 4, cs - 4, { rx: 10, fill, stroke: 'var(--line)', 'stroke-width': 1.5 }, g);
    const tint = F.rect(x + 2, y + 2, cs - 4, cs - 4, { rx: 10, fill: 'var(--ok)', 'fill-opacity': 0 }, g);
    const val = F.text(x + cs / 2, y + cs / 2 + (k === GOAL || k === PIT ? 0 : 22), '', { size: 15, weight: 800, mono: true }, g);
    const arr = F.g({ transform: `translate(${x + cs / 2},${y + cs / 2 - 8})` }, g); F.path('M0,-17 L0,13 M-9,-6 L0,-17 L9,-6', { stroke: 'var(--c-b)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, arr); arr.style.opacity = 0;
    G.cells[k] = { g, base, tint, val, arr, x, y, r, c };
  }
  F.setText(G.cells[GOAL].val, '+1'); F.setText(G.cells[PIT].val, '−1');
  G.cells[GOAL].val.style.fill = 'var(--ok)'; G.cells[PIT].val.style.fill = 'var(--bad)';
  G.center = k => { const c = G.cells[k]; return [c.x + cs / 2, c.y + cs / 2]; };
  return G;
}
function robot(F, x, y) {
  const b = F.g({ transform: `translate(${x},${y})` }); b.__t = { x, y, s: 1, r: 0 };
  F.rect(-14, -10, 28, 20, { rx: 6, fill: 'var(--c-c)' }, b); F.circle(-5, -2, 2.6, { fill: 'var(--fig-bg)' }, b); F.circle(5, -2, 2.6, { fill: 'var(--fig-bg)' }, b); F.line(0, -10, 0, -17, { stroke: 'var(--c-c)', 'stroke-width': 2 }, b); F.circle(0, -18, 3, { fill: 'var(--c-b)' }, b);
  return b;
}
/* paint a value snapshot: V map (or null to clear), policy map (or null) */
function paint(F, G, snap, showPol) {
  const jobs = [];
  for (const k in G.cells) {
    if (k === WALL || term(k)) continue; const c = G.cells[k], v = snap ? snap.V[k] : 0;
    F.setText(c.val, snap && Math.abs(v) > 1e-9 ? f3(v) : (snap ? '0' : ''), null, 16);
    jobs.push(F.to(c.tint, { 'fill-opacity': snap ? 0.08 + 0.55 * Math.max(0, v) : 0 }, 450));
    if (snap && snap.P[k]) c.arr.setAttribute('transform', `translate(${c.x + G.cs / 2},${c.y + G.cs / 2 - 8}) rotate(${ANG[snap.P[k]]})`);
    jobs.push(F.to(c.arr, { opacity: showPol && snap && v > 0 ? 1 : 0 }, 350));
  }
  return Promise.all(jobs);
}

/* ================= scene 1: the agent-environment loop ================= */
const sceneLoop = {
  id: 'loop', title: 'Agent, environment, reward', w: 720, h: 400,
  build(F) {
    K.title(F, 'Learning by trial and error', 'no teacher gives the right action: only a reward after acting');
    F.s.ag = F.box(150, 170, 150, 90, '', { fill: 'var(--c-open)', stroke: 'var(--c-b)', sw: 2.2 }); F.text(150, 140, 'AGENT', { size: 13, weight: 800, fill: 'var(--c-b)' });
    const rb = robot(F, 150, 185); rb.style.opacity = 1;
    F.s.env = F.box(560, 170, 190, 120, '', { fill: 'var(--card)', stroke: 'var(--c-a)', sw: 2.2 }); F.text(560, 125, 'ENVIRONMENT', { size: 13, weight: 800, fill: 'var(--c-a)' });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) F.rect(490 + c * 35, 140 + r * 35, 33, 33, { rx: 5, fill: r === 0 && c === 3 ? 'var(--c-goal)' : 'var(--fig-bg)', stroke: 'var(--line)' });
    F.s.top = F.path('M228,140 C330,80 420,80 470,130', { stroke: 'var(--c-c)', 'stroke-width': 3 }); F.s.top.setAttribute('marker-end', F.arrowMarker('var(--c-c)'));
    F.s.bot = F.path('M470,215 C420,265 330,265 228,205', { stroke: 'var(--c-a)', 'stroke-width': 3 }); F.s.bot.setAttribute('marker-end', F.arrowMarker('var(--c-a)'));
    F.s.lt = F.text(350, 78, 'action: move right', { size: 14, weight: 750, fill: 'var(--c-c)' });
    F.s.lb = F.text(350, 270, 'new state + reward', { size: 14, weight: 750, fill: 'var(--c-a)' });
    [F.s.top, F.s.bot, F.s.lt, F.s.lb].forEach(e => { e.style.opacity = 0; });
    /* discount timeline */
    F.s.tl = F.g({}); F.s.tl.style.opacity = 0;
    const g = [1, 0.9, 0.81, 0.729];
    F.text(70, 330, 'reward', { size: 12, cls: 'soft', anchor: 'start' }, F.s.tl); F.text(70, 362, 'worth now', { size: 12, cls: 'soft', anchor: 'start' }, F.s.tl);
    F.s.tlv = g.map((v, i) => { const x = 210 + i * 120; F.text(x, 306, i === 0 ? 'now' : i + ' step' + (i > 1 ? 's' : '') + ' later', { size: 12, weight: 700 }, F.s.tl); F.text(x, 330, i === 3 ? '+1' : '0', { size: 15, weight: 800, mono: true }, F.s.tl); const t = F.text(x, 362, '× ' + v, { size: 14, weight: 750, mono: true, fill: 'var(--accent2)' }, F.s.tl); return t; });
    F.s.res = K.callout(F, 662, 362, '= 0.729', { tone: 'ok', w: 90 });
    F.s.dot = F.circle(0, 0, 8, { fill: 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 2, filter: 'url(#fx-glow)' }); F.s.dot.style.opacity = 0;
  },
  steps: [
    { title: 'Agent and environment', say: ['In reinforcement learning, an agent acts in an environment. Nobody shows it the correct action.', 'It must find good behaviour by trying things and seeing what happens.'],
      cues: [seq(F => F.pulse(F.s.ag, 1), F => F.pulse(F.s.env, 1)), seq(F => F.pulse(F.s.ag, 1))] },
    { title: 'The loop', say: ['At each step the agent sees the state and chooses an action.', 'The environment answers with a new state and a reward: a number that says good or bad.'],
      cues: [seq(F => F.show(F.s.top), F => F.show(F.s.lt), F => F.show(F.s.dot, 0), F => F.along(F.s.dot, F.s.top, 900)),
             seq(F => F.show(F.s.bot), F => F.show(F.s.lb), F => F.along(F.s.dot, F.s.bot, 900), F => F.hide(F.s.dot, 200))] },
    { title: 'Total reward', say: ['The agent does not want one good reward now. It wants the largest total reward over the whole future.', 'Sometimes this means a small loss now for a big win later.'],
      cues: [seq(F => F.pulse(F.s.lb, 2)), seq(F => F.pulse(F.s.ag, 1))] },
    { title: 'Discount', say: ['Future rewards count a little less. Each step later, we multiply by a discount, here zero point nine.', 'A reward of one that comes three steps later is worth zero point seven two nine now. So the agent prefers to win sooner.'],
      cues: [seq(F => F.show(F.s.tl)), seq(F => F.pulse(F.s.tlv[3], 2), F => F.show(F.s.res))] }
  ]
};

/* ================= scene 2: the parts of a Markov decision process ================= */
const sceneMDP = {
  id: 'mdp', title: 'A Markov decision process', w: 720, h: 400,
  build(F) {
    K.title(F, 'The grid world', 'goal +1, pit −1, a wall in the middle, start at the bottom left');
    F.s.G = gridFig(F, 50, 70, 92);
    const [sx, sy] = F.s.G.center(START); F.s.bot = robot(F, sx, sy - 8);
    F.s.cs = [
      ['STATES: the 11 cells the robot can be in', 'accent'], ['ACTIONS: up, down, left, right', 'accent'],
      ['TRANSITION: 80% where you aim,\n10% slip to each side', 'warn'], ['REWARD: +1 at the goal, −1 in the pit', 'ok'],
      ['MARKOV: the next state depends only on\nthe current state and action', 'accent']
    ].map(([t, tone]) => K.callout(F, 565, 200, t, { tone, w: 270 }));
    const [cx, cy] = [sx, sy - 8];
    F.s.acts = F.g({}); F.s.acts.style.opacity = 0;
    [[0, -44], [44, 0], [-44, 0], [0, 44]].forEach(([dx, dy]) => F.arrow(cx + dx * 0.45, cy + dy * 0.45, cx + dx, cy + dy, { color: 'var(--c-b)', w: 3 }, F.s.acts));
    F.s.noise = F.g({}); F.s.noise.style.opacity = 0;
    [[0, -60, '80%', 'var(--c-b)'], [60, 0, '10%', 'var(--c-c)'], [-44, 0, '10%', 'var(--c-c)']].forEach(([dx, dy, t, col]) => { F.arrow(cx + Math.sign(dx) * 18, cy + Math.sign(dy) * 18, cx + dx, cy + dy, { color: col, w: dy < -50 ? 3.4 : 2 }, F.s.noise); F.text(cx + dx * 1.05 + (dx ? 0 : 22), cy + dy * 1.05 - (dx ? 14 : 0), t, { size: 13, weight: 800, fill: col }, F.s.noise); });
  },
  steps: [
    { title: 'States', say: ['We write the task as a Markov decision process. First, the states: here the eleven cells the robot can stand in.', 'The robot starts at the bottom left.'],
      cues: [seq(F => F.show(F.s.cs[0]), F => Promise.all(Object.values(F.s.G.cells).map(c => F.pulse(c.g, 1)))), seq(F => F.pulse(F.s.bot, 2))] },
    { title: 'Actions', say: ['Second, the actions: up, down, left and right.', 'Walking into the wall or the edge leaves the robot where it is.'],
      cues: [seq(F => F.hide(F.s.cs[0], 200), F => F.show(F.s.cs[1]), F => F.show(F.s.acts)), seq(F => F.pulse(F.s.acts, 1))] },
    { title: 'Transitions', say: ['Third, the transition model. The floor is slippery: the robot goes where it aims eighty percent of the time.', 'It slips to the left or right side ten percent each. Actions do not have sure results.'],
      cues: [seq(F => F.hide(F.s.cs[1], 200), F => F.hide(F.s.acts), F => F.show(F.s.cs[2]), F => F.show(F.s.noise)), seq(F => F.pulse(F.s.noise, 1))] },
    { title: 'Rewards and discount', say: ['Fourth, the rewards: plus one for the goal, minus one for the pit. Both end the episode.', 'Fifth, the discount, here zero point nine.'],
      cues: [seq(F => F.hide(F.s.cs[2], 200), F => F.hide(F.s.noise), F => F.show(F.s.cs[3]), F => F.pulse(F.s.G.cells[GOAL].g, 2)), seq(F => F.pulse(F.s.G.cells[PIT].g, 2))] },
    { title: 'The Markov property', say: ['Markov means that the next state depends only on the current state and action, not on the path that led there.', 'What the agent must learn is a policy: a rule that picks an action in every state.'],
      cues: [seq(F => F.hide(F.s.cs[3], 200), F => F.show(F.s.cs[4])), seq(F => F.pulse(F.s.bot, 1))] }
  ]
};

/* ================= scene 3: Bellman equation and value iteration ================= */
const sceneBellman = {
  id: 'bellman', title: 'Values flow backwards from the goal', w: 720, h: 420,
  build(F) {
    K.title(F, 'Value iteration (no slipping, discount 0.9)', 'number in a cell = value V: the discounted reward we can still collect from there');
    F.s.G = gridFig(F, 50, 74, 92);
    F.s.eq = K.callout(F, 565, 110, 'V(s) = max over actions of\n[ reward + 0.9 × V(next state) ]', { tone: 'accent', w: 260 });
    F.s.sw = F.text(565, 175, 'sweep 0', { size: 22, weight: 800, fill: 'var(--c-c)' });
    F.s.note = K.callout(F, 565, 250, 'each sweep pushes the values\none step further from the goal', { tone: 'warn', w: 260 });
    F.s.pol = K.callout(F, 565, 250, 'policy: in each cell, step\ntoward the neighbour with the best value', { tone: 'ok', w: 270 });
    F.s.noisy = K.callout(F, 565, 330, 'with 20% slipping: start 0.545 (not 0.656),\nthe cell below the pit only 0.308', { tone: 'bad', w: 270 });
  },
  steps: [
    { title: 'The Bellman equation', say: ['The value of a state is the best total reward we can expect from it.', 'The Bellman equation says: value equals the best action\'s reward plus the discounted value of where it leads.'],
      cues: [seq(F => paint(F, F.s.G, null, false), F => F.setText(F.s.sw, 'sweep 0')), seq(F => F.show(F.s.eq), F => F.pulse(F.s.eq, 1))] },
    { title: 'Sweep one', say: ['Value iteration starts with every value at zero, and updates all cells again and again.', 'After the first sweep only the cell next to the goal has value: one step, reward one.'],
      cues: [seq(F => paint(F, F.s.G, { V: Object.fromEntries(Object.keys(F.s.G.cells).map(k => [k, 0])), P: {} }, false)),
             seq(F => F.setText(F.s.sw, 'sweep 1'), F => paint(F, F.s.G, DET[0], false), F => F.pulse(F.s.G.cells['0,2'].g, 2))] },
    { title: 'Sweeps two and three', say: ['In sweep two, its neighbours learn they are two steps away: zero point nine.', 'In sweep three the values reach zero point eight one. Good news travels backwards from the goal.'],
      cues: [seq(F => F.show(F.s.note), F => F.setText(F.s.sw, 'sweep 2'), F => paint(F, F.s.G, DET[1], false)), seq(F => F.setText(F.s.sw, 'sweep 3'), F => paint(F, F.s.G, DET[2], false))] },
    { title: 'Convergence', say: ['Sweeps four and five reach the start, with value zero point six five six, which is zero point nine to the power four.', 'After that nothing changes. The values have converged.'],
      cues: [seq(F => F.setText(F.s.sw, 'sweep 4'), F => paint(F, F.s.G, DET[3], false)), seq(F => F.setText(F.s.sw, 'sweep 5'), F => paint(F, F.s.G, DET[4], false), F => F.pulse(F.s.G.cells[START].g, 2))] },
    { title: 'Read off the policy', say: ['Now the policy is easy: in each cell, take the action that leads to the best value.', 'The arrows show a shortest safe path to the goal.'],
      cues: [seq(F => F.hide(F.s.note, 200), F => F.show(F.s.pol)), seq(F => paint(F, F.s.G, DET[4], true))] },
    { title: 'A slippery floor', say: ['With slipping, every value shrinks, because some steps go the wrong way.', 'The cell just below the pit loses the most, because a slip can drop the robot in. The start is now worth about zero point five five.'],
      cues: [seq(F => F.setText(F.s.sw, 'noise 0.2'), F => paint(F, F.s.G, NOISY[NOISY.length - 1], true)), seq(F => F.show(F.s.noisy), F => F.pulse(F.s.G.cells['2,3'].g, 2))] }
  ]
};

/* ================= scene 4: Q-learning fills a table ================= */
/* corridor S0 S1 S2 S3 then goal (+1). learning rate 0.5, discount 0.9, the agent walks right each episode.
   Q(.,right) after episode 1: 0 0 0 0.5 · 2: 0 0 0.225 0.75 · 3: 0 0.101 0.45 0.875 (checked in python). */
const QA = 0.5, QG = 0.9;
const QEP = (() => { const Q = [0, 0, 0, 0], out = [Q.slice()]; for (let ep = 0; ep < 3; ep++) { for (let s = 0; s < 4; s++) { const r = s === 3 ? 1 : 0, nx = s === 3 ? 0 : Q[s + 1]; Q[s] += QA * (r + QG * nx - Q[s]); } out.push(Q.slice()); } return out; })();
const sceneQ = {
  id: 'qtable', title: 'Q-learning fills in a table', w: 900, h: 400, wide: true,
  build(F) {
    K.title(F, 'No model of the world: learn Q(state, action) from experience', 'Q = expected total discounted reward if we take this action here and act well afterwards');
    F.s.cx = [80, 175, 270, 365, 470];
    ['S0', 'S1', 'S2', 'S3', 'goal'].forEach((n, i) => F.box(F.s.cx[i], 150, 84, 70, n, { size: 16, weight: 800, fill: i === 4 ? 'var(--c-goal)' : 'var(--fig-bg)', stroke: 'var(--line)' }));
    F.text(470, 198, '+1', { size: 14, weight: 800, fill: 'var(--ok)' });
    F.s.bot = robot(F, 80, 98);
    /* Q table */
    const tx = 600, ty = 80; F.rect(tx, ty, 270, 210, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)', filter: 'url(#fx-soft)' });
    F.text(tx + 135, ty + 18, 'Q TABLE', { size: 12.5, weight: 700, cls: 'soft' });
    F.text(tx + 130, ty + 42, 'left', { size: 12.5, weight: 700, cls: 'soft' }); F.text(tx + 215, ty + 42, 'right', { size: 12.5, weight: 700, cls: 'soft' });
    F.s.qc = [0, 1, 2, 3].map(s => { F.text(tx + 45, ty + 70 + s * 36, 'S' + s, { size: 14, weight: 750 }); F.text(tx + 130, ty + 70 + s * 36, '0', { size: 14, mono: true, cls: 'soft' }); const bg = F.rect(tx + 170, ty + 56 + s * 36, 90, 28, { rx: 7, fill: 'var(--ok)', 'fill-opacity': 0 }); const t = F.text(tx + 215, ty + 70 + s * 36, '0', { size: 14, weight: 800, mono: true }); return { bg, t }; });
    F.s.rule = K.callout(F, 300, 270, 'Q(s, a) ← Q(s, a) + 0.5 × [ reward + 0.9 × best Q(next) − Q(s, a) ]', { tone: 'accent', w: 560 });
    F.s.ep = F.text(735, 320, '', { size: 16, weight: 800, fill: 'var(--c-c)' });
    F.s.eps = K.callout(F, 450, 360, 'epsilon-greedy: usually the best action, sometimes (probability ε) a random one', { tone: 'warn', w: 600 });
  },
  steps: [
    { title: 'A table of action values', say: ['Value iteration needs the full model: every transition and reward. Q learning does not. It learns only from experience.', 'It keeps a table with one number for each state and action, called Q. All start at zero.'],
      cues: [seq(F => F.set(F.s.bot, { tx: 80 }), F => F.setText(F.s.ep, ''), F => F.pulse(F.s.bot, 1)), seq(F => setQ(F, 0))] },
    { title: 'Episode one', say: ['The robot walks right and reaches the goal. Only the last step got a reward.', 'With learning rate one half, Q of S three, right, moves half way from zero to one: zero point five.'],
      cues: [seq(F => F.show(F.s.rule), F => walk(F)), seq(F => setQ(F, 1), F => F.setText(F.s.ep, 'after episode 1'))] },
    { title: 'Episode two', say: ['Next time, the step from S two lands in S three, which now looks good.', 'So Q of S two, right, becomes one half of zero point nine times zero point five: zero point two two five.'],
      cues: [seq(F => walk(F)), seq(F => setQ(F, 2), F => F.setText(F.s.ep, 'after episode 2'))] },
    { title: 'Episode three', say: ['After episode three, value has reached S one, and the numbers near the goal keep growing.', 'Just like value iteration, good news flows backwards, but now through real experience.'],
      cues: [seq(F => walk(F)), seq(F => setQ(F, 3), F => F.setText(F.s.ep, 'after episode 3'))] },
    { title: 'Explore a little', say: ['The left column stays at zero, because the robot never tried left.', 'To learn about all actions, the agent picks a random action now and then. This is called epsilon greedy.'],
      cues: [seq(F => F.hide(F.s.rule, 200), F => F.pulse(F.s.qc[0].t, 1)), seq(F => F.show(F.s.eps))] }
  ]
};
function setQ(F, ep) { return Promise.all(F.s.qc.map((c, s) => { const v = QEP[ep][s]; F.setText(c.t, v ? f3(v) : '0', null, 16); return F.to(c.bg, { 'fill-opacity': 0.08 + 0.5 * v }, 500); })); }
async function walk(F) { F.set(F.s.bot, { tx: 80 }); if (F.instant) { F.set(F.s.bot, { tx: 80 }); return; } for (let i = 1; i < 5; i++) await F.to(F.s.bot, { tx: F.s.cx[i] }, 330); await F.wait(150); await F.to(F.s.bot, { tx: 80 }, 400); }

/* ================= exercises ================= */
const exReturn = {
  title: 'Compute a discounted return', random: true,
  gen(r) {
    const g = r.pick([0.5, 0.9]), rs = [r.int(-1, 2), r.int(-1, 2), r.int(0, 3), r.int(1, 5)], G = rs.reduce((s, v, i) => s + v * Math.pow(g, i), 0);
    return {
      prompt: `An agent receives the rewards <b>${rs.join(', ')}</b> at steps 0, 1, 2 and 3, and then the episode ends. With discount <b>γ = ${g}</b>, what is the return $G = r_0 + \\gamma r_1 + \\gamma^2 r_2 + \\gamma^3 r_3$? (two decimals)`,
      hint: 'Multiply the reward at step k by γ to the power k, then add.',
      answer: rs.map((v, i) => `${v}·${g}^${i}`).join(' + ') + ` = ${rs.map((v, i) => f3(v * Math.pow(g, i))).join(' + ')} = <b>${f2(G)}</b>.`,
      check: { type: 'number', answer: Math.round(G * 100) / 100, tol: 0.011 }
    };
  }
};
const exBackup = {
  title: 'One Bellman backup with slipping', random: true,
  gen(r) {
    const g = r.pick([0.9, 0.8, 1]), live = r.pick([0, -0.1, -0.04]), vA = r.int(2, 9) / 10, vL = r.int(0, 9) / 10, vR = r.pick([-1, r.int(0, 9) / 10]);
    const q = live + g * (0.8 * vA + 0.1 * vL + 0.1 * vR);
    return {
      prompt: `A robot chooses <b>up</b>. It goes up with probability 0.8 and slips left or right with probability 0.1 each. The values of the landing cells are: up <b>${vA}</b>, left <b>${vL}</b>, right <b>${vR}</b>. Each step gives reward <b>${live}</b> and the discount is <b>${g}</b>. What is the value of this action, $Q = r + \\gamma \\sum p \\, V(s')$? (two decimals)`,
      hint: 'First compute the expected value of the landing cell (probability times value, added). Multiply by the discount and add the step reward.',
      answer: `Expected next value = 0.8·${vA} + 0.1·${vL} + 0.1·${vR} = ${f3(0.8 * vA + 0.1 * vL + 0.1 * vR)}. Q = ${live} + ${g} × ${f3(0.8 * vA + 0.1 * vL + 0.1 * vR)} = <b>${f2(q)}</b>.`,
      check: { type: 'number', answer: Math.round(q * 100) / 100, tol: 0.011 }
    };
  }
};
const exQ = {
  title: 'One Q-learning update', random: true,
  gen(r) {
    const a = r.pick([0.1, 0.2, 0.5]), g = r.pick([0.9, 0.8]), Q = r.int(0, 10) / 10, rw = r.pick([-1, 0, 0, 1, 2]), nx = [r.int(0, 10) / 10, r.int(-5, 10) / 10, r.int(0, 10) / 10];
    const best = Math.max(...nx), tgt = rw + g * best, nq = Q + a * (tgt - Q);
    return {
      prompt: `The agent is in state s, takes action a, gets reward <b>${rw}</b> and lands in s'. Now <b>Q(s, a) = ${Q}</b>. In s' the Q values of the actions are <b>${nx.join(', ')}</b>. With learning rate <b>α = ${a}</b> and discount <b>γ = ${g}</b>, what is the new Q(s, a)? (two decimals)`,
      hint: 'Target = reward + γ × (largest Q in s\'). New Q = old Q + α × (target − old Q).',
      answer: `Best Q in s' = ${best}. Target = ${rw} + ${g}·${best} = ${f3(tgt)}. New Q = ${Q} + ${a}·(${f3(tgt)} − ${Q}) = <b>${f2(nq)}</b>. Q moved ${a} of the way toward the target.`,
      check: { type: 'number', answer: Math.round(nq * 100) / 100, tol: 0.011 }
    };
  }
};
const exDist = {
  title: 'Value at a distance', random: true,
  gen(r) {
    const g = r.pick([0.9, 0.8, 0.5]), d = r.int(2, 6), R0 = r.pick([1, 10]), v = R0 * Math.pow(g, d - 1);
    return {
      prompt: `In a world with no slipping and no step cost, a cell is <b>${d} moves</b> from a goal that gives reward <b>${R0}</b> when entered (then the episode ends). The discount is <b>${g}</b>. After value iteration converges, what is the value of the cell? (three decimals)`,
      hint: 'The cell next to the goal gets the full reward. Every extra move multiplies by the discount once.',
      answer: `V = ${R0} × ${g}^${d - 1} = <b>${f3(v)}</b>. Each step further from the goal multiplies by ${g}.`,
      check: { type: 'number', answer: Math.round(v * 1000) / 1000, tol: 0.0011 }
    };
  }
};

Course.lecture({
  id: 'w11', num: 11, week: 11, kind: 'lecture', title: 'Reinforcement learning 1: MDPs, values and Q-learning',
  lede: 'No teacher, only rewards. An agent tries actions, sees what happens, and slowly learns which states are good and which actions lead to them. This week: the Markov decision process, the Bellman equation, value iteration, and Q-learning.',
  clos: [3], widgets: ['gridrl'],
  goals: ['describe the <b>agent-environment loop</b>: state, action, reward, and the <b>discounted return</b>',
    'write a problem as a <b>Markov decision process</b>: states, actions, transitions, rewards, discount',
    'explain <b>policy</b> and <b>value</b>, and apply the <b>Bellman equation</b> by hand',
    'run <b>value iteration</b> and read the policy from the values',
    'perform a <b>Q-learning</b> update and explain why the agent must explore'],
  chapters: [
    { id: 'loop', title: 'Agent, environment, reward', blocks: [
      { html: '<p>Supervised learning had labels: the right answer for every example. In <b>reinforcement learning</b> (RL) the agent gets only a <b>reward</b>, often late: a game is won or lost only at the end. Think of training a dog with treats, or learning to ride a bicycle.</p>' },
      { scene: sceneLoop },
      { exercise: exReturn },
      { quiz: { q: 'Why do we use a discount γ below 1?', options: ['So that sooner rewards count more and infinite sums stay finite', 'To make the rewards negative', 'To make the agent explore', 'Because the environment is deterministic'], correct: 0, why: 'With γ < 1 the total $\\sum \\gamma^k r_k$ stays finite even for endless tasks, and the agent prefers to get rewards earlier. γ close to 1 means a patient agent; γ close to 0 a short-sighted one.' } }
    ] },
    { id: 'mdp', title: 'Markov decision processes', blocks: [
      { scene: sceneMDP },
      { html: '<p>Formally an MDP is: states $S$, actions $A$, a transition model $P(s\' \\mid s, a)$, a reward $R(s, a, s\')$ and a discount $\\gamma$. A <b>policy</b> $\\pi(s)$ picks an action in every state. Its <b>value</b> $V^\\pi(s)$ is the expected discounted return when we start in s and follow $\\pi$.</p>' },
      { quiz: { q: 'A robot\'s battery level matters for what happens next, but it is not part of the state. What is broken?', options: ['The Markov property: the state no longer tells everything needed to predict the future', 'The discount', 'Nothing, rewards are enough', 'The number of actions'], correct: 0, why: 'Markov means the current state (and action) is enough to predict the next state. If something important is missing, add it to the state.' } }
    ] },
    { id: 'bellman', title: 'The Bellman equation and value iteration', blocks: [
      { html: '<p>The best value of a state satisfies the <b>Bellman equation</b>:</p><p style="text-align:center">$V(s) = \\max_a \\sum_{s\'} P(s\' \\mid s,a)\\,\\big[ R(s,a,s\') + \\gamma V(s\') \\big]$</p><p><b>Value iteration</b> turns it into an update: start with V = 0 and apply the equation to every state, again and again, until nothing changes. Here terminal cells have value 0 and the reward is paid when you enter them.</p>' },
      { scene: sceneBellman },
      { exercise: exDist },
      { exercise: exBackup }
    ] },
    { id: 'qlearning', title: 'Q-learning: learning without a model', blocks: [
      { html: '<p>Value iteration needs $P$ and $R$. A real robot does not have them. <b>Q-learning</b> learns $Q(s,a)$, the value of taking action a in state s and acting well afterwards, from single experiences $(s, a, r, s\')$:</p><p style="text-align:center">$Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,\\big[\\, r + \\gamma \\max_{a\'} Q(s\',a\') - Q(s,a) \\,\\big]$</p><p>α is the learning rate. The policy is simply: pick the action with the largest Q.</p>' },
      { scene: sceneQ },
      { exercise: exQ },
      { quiz: { q: 'A Q-learning agent explores with ε = 0.1 (10% random actions). Which Q values does it learn?', options: ['The values of the best (greedy) policy, even though it sometimes acts randomly', 'The values of a completely random policy', 'Only the values of states it never visits', 'Nothing, exploration stops learning'], correct: 0, why: 'The update uses $\\max_{a\'} Q(s\',a\')$, the best next action, not the one actually taken. So Q-learning is <b>off-policy</b>: it learns about the greedy policy while behaving with exploration.' } }
    ] },
    { id: 'play', title: 'Play with it', blocks: [
      { html: '<p>Run value iteration one sweep at a time and watch the colours spread from the goal. Change the discount, the slipping noise and the cost of each step. Then switch to Q-learning: the agent starts knowing nothing and must explore.</p>' },
      { widget: 'gridrl' },
      { note: '<b>Try this.</b> (1) Classic grid: run value iteration to the end and read the verdict (how often does the robot reach +1?). Raise the noise to 0.4 and run again. (2) "Two exits": with discount 0.9 the robot walks to the far +10 exit; lower the discount to 0.4 and it takes the near +1. Why? (3) Switch to Q-learning on "Cliff walk": run 200 episodes with ε = 0.1, then press Forget Q and try ε = 0.3. Compare the agreement count and the orange paths: more exploration learns more cells, but the agent behaves more randomly while it learns.' }
    ] }
  ]
});
})();

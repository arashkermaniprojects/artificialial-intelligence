(function () {
const K = Course.kit;
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const f3 = v => (Math.round(v * 1000) / 1000).toFixed(3);

/* ---- scene: the lab grid, one update, the learned path (path and numbers from running the Python cells) ---- */
const GRID = ['S...', '.H.H', '...H', 'H..G'];
const PATH = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 3]];      // printed by the second cell
const sceneLab = {
  id: 'frozen', title: 'The lab world: a frozen lake', w: 720, h: 400,
  build(F) {
    K.title(F, 'Reach G, avoid the holes H', 'each move on the ice costs 0.01 · goal +1 · hole −1');
    const x0 = 60, y0 = 70, cs = 74; F.s.cell = {};
    GRID.forEach((row, r) => row.split('').forEach((ch, c) => {
      const fill = ch === 'G' ? 'var(--c-goal)' : ch === 'H' ? 'var(--bad-bg)' : ch === 'S' ? 'var(--c-start)' : 'var(--fig-bg)';
      F.s.cell[r + ',' + c] = F.box(x0 + c * cs + cs / 2, y0 + r * cs + cs / 2, cs - 6, cs - 6, ch === '.' ? '' : ch, { size: 20, weight: 800, fill, stroke: ch === 'H' ? 'var(--bad)' : 'var(--line)', shadow: false });
    }));
    F.s.path = F.path('M' + PATH.map(([r, c]) => (x0 + c * cs + cs / 2) + ',' + (y0 + r * cs + cs / 2)).join(' L'), { stroke: 'var(--c-c)', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.85 }); F.s.path.style.opacity = 0;
    F.s.upd = K.callout(F, 545, 150, 'first move, all Q = 0:\nQ ← 0 + 0.5 × (−0.01 + 0.9 × 0 − 0)\n   = −0.005', { tone: 'accent', w: 290 });
    F.s.res = K.callout(F, 545, 250, 'learned path: 6 moves\nreturn 0.95, V(start) ≈ 0.55', { tone: 'ok', w: 250 });
    F.s.exp = K.callout(F, 545, 335, 'ε = 0.1: one move in ten is random\nwhile learning', { tone: 'warn', w: 270 });
  },
  steps: [
    { title: 'The world', say: ['The robot starts at S on a frozen lake and must reach the goal G. The holes end the episode with minus one.', 'Every move costs a little, zero point zero one, so shorter paths are better.'],
      cues: [seq(F => F.pulse(F.s.cell['0,0'], 2)), seq(F => F.pulse(F.s.cell['3,3'], 2))] },
    { title: 'One update', say: ['At first all Q values are zero. The first move gets the small step cost.', 'So that Q value moves half way toward minus zero point zero one, which gives minus zero point zero zero five.'],
      cues: [seq(F => F.show(F.s.upd)), seq(F => F.pulse(F.s.upd, 1))] },
    { title: 'The learned path', say: ['After three hundred episodes, following the largest Q in each cell gives a path of six moves.', 'That is a shortest safe path. Its return is zero point nine five.'],
      cues: [seq(F => F.draw(F.s.path, 1400)), seq(F => F.show(F.s.res))] },
    { title: 'Your experiments', say: ['In the lab you will change epsilon, the learning rate alpha and the discount gamma.', 'Watch two things: how often the robot reaches the goal while learning, and the value of the start.'],
      cues: [seq(F => F.show(F.s.exp)), seq(F => F.pulse(F.s.res, 1))] }
  ]
};

/* ---- exercises ---- */
const exUpd = {
  title: 'One Q-learning update on the lake', random: true,
  gen(r) {
    const a = r.pick([0.1, 0.5, 1]), g = r.pick([0.9, 0.5]), Q = r.int(-2, 6) / 10, kind = r.pick(['ice', 'ice', 'goal', 'hole']);
    const nx = [r.int(-3, 8) / 10, r.int(-3, 8) / 10, r.int(0, 8) / 10, r.int(-3, 8) / 10], rw = kind === 'goal' ? 1 : kind === 'hole' ? -1 : -0.01;
    const target = kind === 'ice' ? rw + g * Math.max(...nx) : rw, nq = Q + a * (target - Q);
    return {
      prompt: `Q(s, right) = <b>${Q}</b>. The robot moves right and lands on <b>${kind === 'ice' ? 'ice (reward −0.01)' : kind === 'goal' ? 'the goal (reward +1, episode ends)' : 'a hole (reward −1, episode ends)'}</b>.${kind === 'ice' ? ` In the new cell the four Q values are <b>${nx.join(', ')}</b>.` : ''} With <b>alpha = ${a}</b> and <b>gamma = ${g}</b>, what is the new Q(s, right)? (three decimals)`,
      hint: 'target = reward + gamma × (largest Q in the new cell); if the episode ends, target = reward. New Q = Q + alpha × (target − Q).',
      answer: `target = ${kind === 'ice' ? `−0.01 + ${g} × ${Math.max(...nx)} = ${f3(target)}` : `${rw} (the episode ends, so no future value)`}. New Q = ${Q} + ${a} × (${f3(target)} − ${Q}) = <b>${f3(nq)}</b>. This is the line <code>Q[r, c, a] += alpha * (target - Q[r, c, a])</code>.`,
      check: { type: 'number', answer: Math.round(nq * 1000) / 1000, tol: 0.0015 }
    };
  }
};
const exV = {
  title: 'The value of a path', random: true,
  gen(r) {
    const g = r.pick([0.9, 0.8, 0.5, 0.95]), m = r.int(3, 8), cost = r.pick([0.01, 0.02, 0.05]);
    let v = 0; for (let k = 0; k < m - 1; k++) v -= cost * Math.pow(g, k); v += Math.pow(g, m - 1);
    return {
      prompt: `A path reaches the goal in <b>${m} moves</b>. The first ${m - 1} moves each give reward <b>−${cost}</b>; the last move enters the goal and gives <b>+1</b>. With discount <b>gamma = ${g}</b>, what is the discounted return of this path? (three decimals)`,
      hint: 'Return = sum of reward at move k times gamma to the power k, for k = 0, 1, …, starting with the first move.',
      answer: `Costs: −${cost} × (1 + ${g} + … + ${g}^${m - 2}) = ${f3(v - Math.pow(g, m - 1))}. Goal: ${g}^${m - 1} = ${f3(Math.pow(g, m - 1))}. Total = <b>${f3(v)}</b>. With 6 moves, cost 0.01 and gamma 0.9 this is 0.550: exactly the V(start) that Q-learning found in the lab.`,
      check: { type: 'number', answer: Math.round(v * 1000) / 1000, tol: 0.0015 }
    };
  }
};

const PY_Q = `import numpy as np

GRID = ["S...",
        ".H.H",
        "...H",
        "H..G"]          # S start, G goal (+1), H hole (-1), . ice (-0.01 per step)
R, C = 4, 4
MOVES = [(-1, 0), (0, 1), (1, 0), (0, -1)]   # up, right, down, left
ARROWS = '^>v<'

def step(r, c, a):
    """The environment: take action a in cell (r, c). Returns new cell, reward, done."""
    nr, nc = r + MOVES[a][0], c + MOVES[a][1]
    if not (0 <= nr < R and 0 <= nc < C):     # bumping into the edge: stay
        nr, nc = r, c
    if GRID[nr][nc] == 'G':
        return nr, nc, 1.0, True
    if GRID[nr][nc] == 'H':
        return nr, nc, -1.0, True
    return nr, nc, -0.01, False

def q_learning(episodes=300, alpha=0.5, gamma=0.9, eps=0.1, seed=0):
    rng = np.random.RandomState(seed)
    Q = np.zeros((R, C, 4))                  # one number per cell and action
    reached = []                             # 1 if the episode ended at the goal
    for ep in range(episodes):
        r, c = 0, 0
        for t in range(100):
            if rng.rand() < eps:                       # explore
                a = rng.randint(4)
            else:                                      # exploit (random among ties)
                a = rng.choice(np.flatnonzero(Q[r, c] == Q[r, c].max()))
            nr, nc, reward, done = step(r, c, a)
            target = reward if done else reward + gamma * Q[nr, nc].max()
            Q[r, c, a] += alpha * (target - Q[r, c, a])    # the Q-learning update
            r, c = nr, nc
            if done:
                break
        reached.append(GRID[r][c] == 'G')
    return Q, np.array(reached)

def show_policy(Q):
    for r in range(R):
        print(' '.join(GRID[r][c] if GRID[r][c] in 'GH' else ARROWS[Q[r, c].argmax()] for c in range(C)))

Q, reached = q_learning()
show_policy(Q)
print('goal reached in the first 50 episodes:', reached[:50].sum(), ' in the last 50:', reached[-50:].sum())
print('Q values at the start (up, right, down, left):', np.round(Q[0, 0], 3))
`;
const PY_RUN = `assert 'Q' in globals(), 'Run the first Python cell first.'

def greedy_run(Q, max_steps=20):
    """Follow the learned policy (no exploration) from the start."""
    r, c, path, total = 0, 0, [(0, 0)], 0.0
    for t in range(max_steps):
        r, c, reward, done = step(r, c, Q[r, c].argmax())
        path.append((r, c)); total += reward
        if done:
            break
    return path, round(total, 2), GRID[r][c]

path, total, end = greedy_run(Q)
print('path:', path)
print('ends in', end, ' moves:', len(path) - 1, ' total reward:', total)
`;
const PY_EXP = `assert 'Q' in globals(), 'Run the first Python cell first.'

def experiment(**settings):
    Q, reached = q_learning(**settings)
    path, total, end = greedy_run(Q)
    print(f'{str(settings):26s} ends in {end}  moves {len(path) - 1:2d}  V(start) {Q[0, 0].max():6.3f}  goal in last 100 episodes: {reached[-100:].mean():4.0%}')

experiment(eps=0.1)                 # the default settings
experiment(eps=0.5)                 # explore a lot
experiment(alpha=0.02)              # learn very slowly
experiment(gamma=0.5)               # short-sighted
experiment(episodes=20)             # too little practice
`;

/* ---------- personal lab sheet (hand in): every student gets a personal lake, settings and seeds from the student ID ---------- */
const SH_MV = [[-1, 0], [0, 1], [1, 0], [0, -1]], SH_AR = '^>v<', SH_AN = ['up', 'right', 'down', 'left'];
const shBfs = (G, R, C) => {   // shortest safe path S -> G (list of cells), or null
  const prev = { '0,0': null }, q = [[0, 0]];
  while (q.length) { const [r, c] = q.shift(); if (G[r][c] === 'G') { const p = []; let k = r + ',' + c; while (k) { p.unshift(k.split(',').map(Number)); k = prev[k]; } return p; }
    for (const [dr, dc] of SH_MV) { const nr = r + dr, nc = c + dc, k = nr + ',' + nc; if (nr < 0 || nc < 0 || nr >= R || nc >= C || k in prev || G[nr][nc] === 'H') continue; prev[k] = r + ',' + c; q.push([nr, nc]); } }
  return null;
};
// lines: plain python strings, or [label, expression, answer name] -> print(label, expr) for the student, print("ANS name", expr) for the key
const shOut11 = lines => { const f = k => lines.map(l => Array.isArray(l) ? `print(${JSON.stringify(k ? 'ANS ' + l[2] : l[0])}, ${l[1]})` : l).join('\n') + '\n'; return { code: f(false), key: f(true) }; };
const L11_ENV = B => `import numpy as np

GRID = [${B.grid.map(s => JSON.stringify(s)).join(',\n        ')}]     # your personal lake: S start, G goal (+1), H hole (-1)
R, C = len(GRID), len(GRID[0])
COST = ${B.cost}        # every move on the ice gives reward -COST
SLIP = ${B.slip}        # with this probability the ice makes you do a random move
MOVES = [(-1, 0), (0, 1), (1, 0), (0, -1)]   # 0 up, 1 right, 2 down, 3 left
ARROWS = '^>v<'

def move(r, c, a):
    """The map without slipping: new cell, reward, done."""
    nr, nc = r + MOVES[a][0], c + MOVES[a][1]
    if not (0 <= nr < R and 0 <= nc < C):     # bumping into the edge: stay
        nr, nc = r, c
    if GRID[nr][nc] == 'G':
        return nr, nc, 1.0, True
    if GRID[nr][nc] == 'H':
        return nr, nc, -1.0, True
    return nr, nc, -COST, False

def step(r, c, a, rng):
    """The environment during training: sometimes the ice slips."""
    if rng.rand() < SLIP:
        a = rng.randint(4)
    return move(r, c, a)
`;
const L11_Q = (upd = true) => `
def q_learning(episodes, alpha, gamma, eps, seed):
    rng = np.random.RandomState(seed)
    Q = np.zeros((R, C, 4))
    steps, reached = [], []                  # moves per episode, 1 if it ended at the goal
    for ep in range(episodes):
        r, c = 0, 0
        for t in range(100):
            if rng.rand() < eps:                       # explore
                a = rng.randint(4)
            else:                                      # exploit (random among ties)
                a = rng.choice(np.flatnonzero(Q[r, c] == Q[r, c].max()))
            nr, nc, reward, done = step(r, c, a, rng)
${upd ? `            target = reward if done else reward + gamma * Q[nr, nc].max()
            Q[r, c, a] += alpha * (target - Q[r, c, a])` : `            # YOUR CODE HERE (two lines): the target, then the Q-learning update of Q[r, c, a]
            pass`}
            r, c = nr, nc
            if done:
                break
        steps.append(t + 1)
        reached.append(GRID[r][c] == 'G')
    return Q, np.array(steps), np.array(reached)

def greedy_path(Q, max_steps=30):
    """Follow the largest Q in every cell, on the map without slipping."""
    r, c, path, total = 0, 0, [(0, 0)], 0.0
    for t in range(max_steps):
        r, c, reward, done = move(r, c, int(Q[r, c].argmax()))
        path.append((r, c)); total += reward
        if done:
            break
    return path, round(total, 2), GRID[r][c]
`;
const SHEET11 = {
  title: 'My personal lab sheet: Q-learning', marks: 10,
  intro: 'Your frozen lake, your settings and your seeds are <b>personal</b>: they are made from your student ID, so your Q values, policy and answers differ from those of your classmates. Run each code cell (press ▶ Run), copy the results into the answer boxes, add a screenshot if you like, and finally download your sheet as <b>Word</b> or <b>PDF</b> and upload it to Moodle.',
  base(r) {
    for (;;) {
      const [R, C] = r.pick([[4, 5], [5, 4], [5, 5], [4, 6]]), g = r.pick([[R - 1, C - 1], [R - 1, C - 2], [R - 2, C - 1]]);
      const G = Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => (i === 0 && j === 0 ? 'S' : '.')));
      G[g[0]][g[1]] = 'G';
      const nh = r.int(3, 5); let k = 0;
      while (k < nh) { const i = r.int(0, R - 1), j = r.int(0, C - 1); if (G[i][j] !== '.' || i + j <= 1) continue; G[i][j] = 'H'; k++; }
      const path = shBfs(G, R, C);
      if (!path || path.length - 1 < 5) continue;
      const walk = Array.from({ length: 6 }, () => r.int(0, 3));
      const mid = path[r.int(1, path.length - 3)];
      return { grid: G.map(row => row.join('')), R, C, g, path, walk, mid, cost: r.pick([0.01, 0.02, 0.03]), slip: r.pick([0.02, 0.05, 0.1]),
        alpha: r.pick([0.3, 0.5, 0.7]), gamma: r.pick([0.8, 0.9, 0.95]), eps: r.pick([0.05, 0.1, 0.2]), episodes: r.pick([400, 500, 600]), seed: r.int(1, 99),
        epsBig: r.pick([0.4, 0.5, 0.6]), seed2: r.int(1, 99) };
    }
  },
  tasks: [
    { id: 't1', title: 'Walk on your lake', marks: 1.5, gen(r, B) {
      const names = B.walk.map(a => SH_AN[a]).join(', ');
      const o = shOut11([L11_ENV(B), `moves = ${JSON.stringify(B.walk)}      # ${names}
r, c, total, end = 0, 0, 0.0, 'still on the ice'
for a in moves:
    r, c, reward, done = move(r, c, a)        # no slipping in this task
    total += reward
    if done:
        end = 'goal' if GRID[r][c] == 'G' else 'hole'
        break`, ['final cell:', '(r, c)', 'cell'], ['total reward:', 'round(total, 2)', 'total'], ['the walk ended:', 'end', 'end']]);
      return { html: `<p>Your lake has <b>${B.R} rows and ${B.C} columns</b>, every move on the ice costs <b>${B.cost}</b>. Without slipping, the robot tries the moves <b>${names}</b> from the start (0, 0). Predict first, then run the cell: where does it end, what is the total reward, and did it end at the goal, in a hole, or still on the ice?</p>`, code: o.code,
        fields: [{ k: 'cell', label: 'Final cell (row, column)', type: 'text' }, { k: 'tot', label: 'Total reward (2 decimals)', type: 'num' }, { k: 'end', label: 'Goal, hole or still on the ice?', type: 'text' }], key: o.key }; } },
    { id: 't2', title: 'Train your agent', marks: 1.5, gen(r, B) {
      const [mr, mc] = B.mid;
      const o = shOut11([L11_ENV(B) + L11_Q(), `Q, steps, reached = q_learning(episodes=${B.episodes}, alpha=${B.alpha}, gamma=${B.gamma}, eps=${B.eps}, seed=${B.seed})`,
        ['V(start) = largest Q at (0, 0):', 'round(Q[0, 0].max(), 3)', 'V_start'],
        [`Q values at (${mr}, ${mc}) (up, right, down, left):`, `np.round(Q[${mr}, ${mc}], 3).tolist()`, `Q_${mr}_${mc}`],
        ['goal reached in the last 50 episodes:', 'int(reached[-50:].sum())', 'goal_last50']]);
      return { html: `<p>Train with your settings: <b>${B.episodes} episodes, alpha = ${B.alpha}, gamma = ${B.gamma}, epsilon = ${B.eps}, seed ${B.seed}</b>, slip probability <b>${B.slip}</b>. Report V(start), the four Q values in cell <b>(${mr}, ${mc})</b>, and how many of the last 50 episodes reached the goal.</p>`, code: o.code,
        fields: [{ k: 'v', label: 'V(start) (3 decimals)', type: 'num' }, { k: 'q', label: `Q values at (${mr}, ${mc}) (four numbers)`, type: 'text' }, { k: 'g', label: 'Goal reached in the last 50 episodes', type: 'num' }], key: o.key }; } },
    { id: 't3', title: 'Read your policy', marks: 1.5, gen(r, B) {
      const o = shOut11([L11_ENV(B) + L11_Q(), `Q, steps, reached = q_learning(episodes=${B.episodes}, alpha=${B.alpha}, gamma=${B.gamma}, eps=${B.eps}, seed=${B.seed})
for row in range(R):
    print(' '.join(GRID[row][col] if GRID[row][col] in 'GH' else ARROWS[Q[row, col].argmax()] for col in range(C)))
path, total, end = greedy_path(Q)`, ['arrow at the start:', 'ARROWS[Q[0, 0].argmax()]', 'arrow_start'],
        ['greedy path:', 'path', 'path'], ['moves:', 'len(path) - 1', 'moves'], ['ends in:', 'end', 'end'], ['total reward:', 'total', 'total']]);
      return { html: `<p>Train the same agent as in task 2, print the policy as arrows, and follow the largest Q from the start (no slipping). Report the arrow at the start, the number of moves, where the path ends (G or H; if it is stopped after 30 moves, the letter of the cell where it stands, S or .) and the total reward. Is it a shortest safe path? If not, why could that be? (Your shortest safe path has <b>${B.path.length - 1}</b> moves.)</p>`, code: o.code,
        fields: [{ k: 'a', label: 'Arrow at the start', type: 'text' }, { k: 'm', label: 'Number of moves', type: 'num' }, { k: 'e', label: 'Ends in (G, H, S or .)', type: 'text' }, { k: 't', label: 'Total reward (2 decimals)', type: 'num' }], key: o.key,
        note: 'For some IDs (about 1 in 5) the greedy path does not reach G within 30 moves: it bumps into an edge or walks back and forth (cells near holes are risky when the ice slips, and rarely visited cells keep poor Q values). That is a correct result; the student should report it and give a reason.' }; } },
    { id: 't4', title: 'Steps per episode', marks: 1.5, gen(r, B) {
      const o = shOut11([L11_ENV(B) + L11_Q(), `Q, steps, reached = q_learning(episodes=${B.episodes}, alpha=${B.alpha}, gamma=${B.gamma}, eps=${B.eps}, seed=${B.seed})`,
        ['moves per episode, first 20 episodes:', 'steps[:20].tolist()', 'first20'],
        ['average moves, first 20 episodes:', 'round(steps[:20].mean(), 2)', 'avg_first20'],
        ['average moves, last 20 episodes:', 'round(steps[-20:].mean(), 2)', 'avg_last20'],
        ['longest episode:', 'int(steps.max())', 'longest']]);
      return { html: `<p>Same training as task 2. <code>steps</code> holds the number of moves of every episode. Report the average number of moves in the first 20 and in the last 20 episodes, and the longest episode. In one sentence: why are the early episodes different?</p>`, code: o.code,
        fields: [{ k: 'f', label: 'Average moves, first 20 episodes (2 decimals)', type: 'num' }, { k: 'l', label: 'Average moves, last 20 episodes (2 decimals)', type: 'num' }, { k: 'mx', label: 'Longest episode (moves)', type: 'num' }, { k: 'why', label: 'Why are the early episodes different?', type: 'long' }], key: o.key }; } },
    { id: 'c1', kind: 'challenge', title: 'The effect of epsilon', marks: 2, gen(r, B) {
      const code = L11_ENV(B) + L11_Q() + `
# Challenge: train two agents that differ ONLY in epsilon, then compare them.
for eps in [${B.eps}, ${B.epsBig}]:
    Q, steps, reached = q_learning(episodes=${B.episodes}, alpha=${B.alpha}, gamma=${B.gamma}, eps=eps, seed=${B.seed2})
    path, total, end = greedy_path(Q)
    print(f"eps = {eps}: goal in the last 100 episodes {reached[-100:].mean():.0%}, V(start) {Q[0, 0].max():.3f}, greedy path {len(path) - 1} moves, ends in {end}")
`;
      const key = code.replace('print(f"eps = {eps}: goal in the last 100 episodes {reached[-100:].mean():.0%}, V(start) {Q[0, 0].max():.3f}, greedy path {len(path) - 1} moves, ends in {end}")',
        'print(f"ANS eps{eps}_goal_last100 {reached[-100:].mean():.0%}"); print(f"ANS eps{eps}_V_start {Q[0, 0].max():.3f}"); print(f"ANS eps{eps}_greedy {len(path) - 1} moves, ends in {end}")');
      return { html: `<p>Train two agents with seed <b>${B.seed2}</b> that differ only in epsilon: <b>${B.eps}</b> and <b>${B.epsBig}</b>. Report, for both, how often the goal was reached in the last 100 training episodes and V(start). Then explain with your numbers: why does a large epsilon reach the goal less often while training, even when the learned greedy path is still good?</p>`, code,
        fields: [{ k: 'g1', label: `Goal in the last 100 episodes, eps = ${B.eps}`, type: 'text' }, { k: 'g2', label: `Goal in the last 100 episodes, eps = ${B.epsBig}`, type: 'text' }, { k: 'v1', label: `V(start), eps = ${B.eps}`, type: 'num' }, { k: 'v2', label: `V(start), eps = ${B.epsBig}`, type: 'num' }, { k: 'why', label: 'Your explanation (two sentences)', type: 'long' }], key,
        note: 'Explanation: with a large epsilon many training moves are random, so the robot falls into holes more often while learning; the update uses the largest next Q (off-policy), so the table can still learn a good greedy path (for some IDs one of the two greedy paths fails: accept that too). Note that the slip also adds random moves. Accept an honest reading of the student\'s own numbers (with few episodes V(start) can also differ).' }; } },
    { id: 'c2', kind: 'challenge', title: 'Write the update and check it by hand', marks: 2, gen(r, B) {
      const tail = `
SLIP = 0                     # this time the ice does not slip
Q, steps, reached = q_learning(episodes=${B.episodes}, alpha=${B.alpha}, gamma=${B.gamma}, eps=${B.eps}, seed=${B.seed})
path, total, end = greedy_path(Q)
m = len(path) - 1
by_hand = sum(-COST * ${B.gamma} ** k for k in range(m - 1)) + ${B.gamma} ** (m - 1)   # m-1 ice moves, then the goal
`;
      const code = L11_ENV(B) + L11_Q(false) + tail + `print("V(start):", round(Q[0, 0].max(), 3))\nprint("greedy path:", m, "moves, ends in", end)\nprint("discounted return of that path, by hand:", round(by_hand, 3))\n`;
      const key = L11_ENV(B) + L11_Q(true) + tail + `print("ANS V_start", round(Q[0, 0].max(), 3))\nprint("ANS greedy", m, "moves, ends in", end)\nprint("ANS by_hand", round(by_hand, 3))\n`;
      return { html: `<p>In this cell the two most important lines of <code>q_learning</code> are missing. Write them: the <b>target</b> (reward if the episode is done, otherwise reward + gamma × the largest Q of the new cell) and the <b>update</b> of Q[r, c, a] with alpha. Then train on your lake <b>without slipping</b> and report V(start), the length of the greedy path, and its discounted return computed by hand in the last line. Are V(start) and the hand value close? Say why or why not in one sentence.</p>`, code,
        fields: [{ k: 'v', label: 'V(start) (3 decimals)', type: 'num' }, { k: 'm', label: 'Greedy path: number of moves', type: 'num' }, { k: 'h', label: 'Discounted return by hand (3 decimals)', type: 'num' }, { k: 'why', label: 'Are they close? Why?', type: 'long' }, { k: 'code', label: 'Your two lines (paste your code)', type: 'code' }], key,
        note: 'When the greedy path ends in G and training has converged, V(start) is equal or very close to the hand value (the Q table stores the discounted return of the best path). If they differ, accept "not trained enough / the path is not the best one" when it matches the student\'s numbers.' }; } }
  ]
};

Course.lecture({
  id: 'lab11', num: 11, week: 11, kind: 'lab', title: 'Q-learning',
  lede: 'Teach a robot to cross a frozen lake without falling in. You write nothing but a table and one update rule, and the robot learns the path from its own trial and error.',
  clos: [3], widgets: [],
  goals: ['implement <b>tabular Q-learning</b> with numpy: a table Q[row, column, action] and the update rule',
    'use <b>epsilon-greedy</b> exploration and read the learned <b>policy</b> as arrows',
    'measure the effect of <b>epsilon</b>, the learning rate <b>alpha</b> and the discount <b>gamma</b>',
    'check a learned value against a hand computation of the discounted return'],
  chapters: [
    { id: 'idea', title: 'The idea in one picture', blocks: [
      { html: '<p>The environment is a 4 × 4 frozen lake. The agent does not know the map. It only tries moves and receives rewards. Q-learning keeps one number per cell and action, and improves it after every move: $Q \\leftarrow Q + \\alpha\\,(r + \\gamma \\max Q\' - Q)$.</p>' },
      { scene: sceneLab }
    ] },
    { id: 'learn', title: 'Q-learning in numpy', blocks: [
      { html: '<p>Press <b>Run</b> (about one second). <code>step</code> is the environment, <code>q_learning</code> is the agent. The arrows show the action with the largest Q in each cell (H = hole, G = goal).</p>' },
      { py: { title: 'Tabular Q-learning on a frozen lake', code: PY_Q } },
      { note: '<b>Expected output.</b><br><code>&gt; &gt; v &lt;</code><br><code>v H v H</code><br><code>&gt; &gt; v H</code><br><code>H &gt; &gt; G</code><br><code>goal reached in the first 50 episodes: 37  in the last 50: 44</code><br><code>Q values at the start (up, right, down, left): [0.483 0.55  0.531 0.453]</code><br>The cell top right (<code>&lt;</code>) is almost never visited, so its arrow means little. The robot still misses the goal sometimes at the end because ε = 0.1 makes it move randomly one time in ten.' },
      { exercise: exUpd },
      { py: { title: 'Follow the learned policy', code: PY_RUN } },
      { note: '<b>Expected output.</b><br><code>path: [(0, 0), (0, 1), (0, 2), (1, 2), (2, 2), (3, 2), (3, 3)]</code><br><code>ends in G  moves: 6  total reward: 0.95</code><br>Six moves is the shortest safe path. Total reward: five moves of −0.01 and then +1.' },
      { exercise: exV }
    ] },
    { id: 'experiments', title: 'Experiments: epsilon, alpha, gamma', blocks: [
      { html: '<p>Run the first cell before this one. Each line trains a new agent with one setting changed (the others stay at episodes = 300, alpha = 0.5, gamma = 0.9, eps = 0.1) and reports the greedy path, V(start) = the largest Q at the start, and how often the goal was reached in the last 100 training episodes.</p>' },
      { py: { title: 'Change one setting at a time', code: PY_EXP } },
      { note: '<b>Expected output.</b><br><code>{\'eps\': 0.1}      ends in G  moves  6  V(start)  0.550  goal in last 100 episodes:  85%</code><br><code>{\'eps\': 0.5}      ends in G  moves  6  V(start)  0.550  goal in last 100 episodes:  37%</code><br><code>{\'alpha\': 0.02}   ends in G  moves  6  V(start)  0.204  goal in last 100 episodes:  91%</code><br><code>{\'gamma\': 0.5}    ends in G  moves  6  V(start)  0.012  goal in last 100 episodes:  92%</code><br><code>{\'episodes\': 20}  ends in G  moves  6  V(start) -0.019  goal in last 100 episodes:  50%</code> (only 20 episodes exist, so this is the share of all 20)' },
      { note: '<b>Your tasks.</b> (1) Explain the eps = 0.5 line: the learned path is still the best one, so why did the robot reach the goal only 37% of the time while training? (2) With alpha = 0.02, V(start) is 0.204, not 0.550. What would you change to fix it? Try it. (3) With gamma = 0.5, V(start) is only 0.012. Use the exercise above to check this number by hand. (4) Try <code>experiment(eps=0.0)</code>. It still finds the goal here. Why can it explore at all? (5) Add a hole: change row 1 of <code>GRID</code> (the second string) to <code>".HHH"</code>, run the first two cells again. What is the new path?' },
      { deeper: { title: 'Answers', html: '<p>(1) While training, every move is random with probability 0.5, so the robot often walks into a hole. The table still learns the best path, because the update uses the <i>largest</i> next Q, not the random move (Q-learning is off-policy). (2) Train longer (for example <code>experiment(alpha=0.02, episodes=3000)</code>) or use a larger alpha: small steps need many episodes. (3) Six moves: −0.01 × (1 + 0.5 + 0.25 + 0.125 + 0.0625) + 0.5<sup>5</sup> = −0.019 + 0.031 = 0.012. A short-sighted agent hardly cares about a goal six moves away. (4) Ties between equal Q values are broken at random, and a punished action (a hole gives −1, each step −0.01) looks worse than an untried one at 0, so the agent tries new moves by itself. In larger worlds this is not enough, which is why we use ε. (5) The right-hand route is blocked, so the robot goes down the left side: (0, 0), (1, 0), (2, 0), (2, 1), (3, 1), (3, 2), (3, 3). Still 6 moves, return 0.95.</p>' } },
      { quiz: { q: 'In the eps = 0.5 run the robot reached the goal in only 37% of training episodes, yet the learned greedy path is optimal. Why?', options: ['Q-learning learns the values of the best policy even while it behaves randomly (it is off-policy)', 'Because alpha was too small', 'Because the discount was 1', 'It is a coincidence'], correct: 0, why: 'The target uses $\\max_{a\'} Q(s\', a\')$, the best next action, whatever the agent actually does next. Exploration costs reward during training, but the table still converges toward the optimal values.' } }
    ] }
    ,{ id: 'sheet', title: 'Your personal lab sheet (hand in)', blocks: [
      { html: '<p>This is the part you <b>hand in</b>. Your teacher gets your file from Moodle and compares it with the answers generated from your ID.</p>' },
      { labsheet: SHEET11 }
    ] }
  ]
});
})();

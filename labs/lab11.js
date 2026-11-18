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
  ]
});
})();

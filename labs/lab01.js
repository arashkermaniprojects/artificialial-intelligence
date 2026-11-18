(function () {
const K = Course.kit;
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };

/* ---- scene: the ask, check, improve cycle ---- */
const CYC = [
  { x: 360, y: 92, t: '1. ASK\nrole · task · context · format' },
  { x: 610, y: 200, t: '2. READ\nthe answer carefully' },
  { x: 360, y: 308, t: '3. CHECK\nfacts · numbers · sources' },
  { x: 110, y: 200, t: '4. IMPROVE\nthe prompt, or fix it yourself' }
];
const sceneCycle = {
  id: 'askcheck', title: 'Using an AI tool like a scientist', w: 720, h: 380,
  build(F) {
    K.title(F, 'Ask, read, check, improve', 'you stay responsible for the result, not the tool');
    F.s.ring = F.path('M360,125 C440,125 490,160 490,200 C490,240 440,275 360,275 C280,275 230,240 230,200 C230,160 280,125 360,125 Z', { stroke: 'var(--c-soft)', 'stroke-width': 2.5, 'stroke-dasharray': '6 6' });
    F.s.ai = F.box(360, 200, 120, 54, 'AI tool', { size: 15, weight: 800, fill: 'var(--accent2-bg)', stroke: 'var(--accent2)' });
    F.s.b = CYC.map((c, i) => { const b = F.box(c.x, c.y, 200, 50, c.t, { size: 12.5, weight: 700, fill: 'var(--card)', stroke: i === 2 ? 'var(--bad)' : 'var(--c-node-line)' }); b.style.opacity = .25; return b; });
    const d = F.g({ transform: 'translate(360,125)' }); d.__t = { x: 360, y: 125, s: 1, r: 0 }; F.circle(0, 0, 8, { fill: 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 2.5, filter: 'url(#fx-glow)' }, d); d.style.opacity = 0; F.s.dot = d;
    F.s.warn = K.callout(F, 360, 360, 'Sounds sure ≠ is correct (hallucination)', { tone: 'bad', w: 330 });
  },
  steps: [
    { title: 'Ask clearly', say: ['An AI assistant is a tool. Like any tool, the result depends on how you use it.', 'First, ask clearly. Say what role it should play, what you want, the context, and the format of the answer.'],
      cues: [seq(F => F.pulse(F.s.ai, 1)), seq(F => F.show(F.s.b[0]), F => F.pulse(F.s.b[0], 1))] },
    { title: 'Read and check', say: ['Then read the answer like a teacher marking a paper.', 'Check the facts, the numbers and the sources. A language model can sound sure and still be wrong. This is called hallucination.'],
      cues: [seq(F => F.show(F.s.b[1]), F => F.show(F.s.dot, 150), F => F.to(F.s.dot, { tx: 490, ty: 200 }, 700)),
             seq(F => F.show(F.s.b[2]), F => F.to(F.s.dot, { tx: 360, ty: 275 }, 700), F => F.show(F.s.warn), F => F.pulse(F.s.b[2], 1))] },
    { title: 'Improve', say: ['If something is wrong or missing, improve the prompt, or fix the answer yourself.', 'Then go around again. You stay responsible for the final work, not the tool.'],
      cues: [seq(F => F.show(F.s.b[3]), F => F.to(F.s.dot, { tx: 230, ty: 200 }, 700)), seq(F => F.to(F.s.dot, { tx: 360, ty: 125 }, 700), F => F.pulse(F.s.ai, 2))] }
  ]
};

/* ---- exercise: percept or action? ---- */
const PA = [
  ['a self-driving car', [['the camera image of the road', 'P'], ['the speedometer reading', 'P'], ['its GPS position', 'P'], ['turning the steering wheel', 'A'], ['pressing the brake', 'A'], ['switching on the indicator', 'A']]],
  ['a chat assistant with a web search tool', [["the user's question", 'P'], ['the list of pages the search tool returns', 'P'], ['calling the search tool with a query', 'A'], ['writing the answer on the screen', 'A']]],
  ['a robot vacuum cleaner', [['the dirt sensor says "dirty"', 'P'], ['the bump sensor is pressed', 'P'], ['switching on the suction', 'A'], ['rotating 90 degrees to the left', 'A']]],
  ['a smart thermostat', [['the room temperature is 18 degrees', 'P'], ['the user sets 22 degrees on the app', 'P'], ['turning the heater on', 'A'], ['sending a notification to the phone', 'A']]],
  ['a chess program', [["the opponent's last move", 'P'], ['the clock shows 5 minutes left', 'P'], ['moving the knight to f3', 'A'], ['offering a draw', 'A']]]
];
const exPA = {
  title: 'Percept or action?', random: true,
  gen(r) {
    const [agent, items] = r.pick(PA), [item, L] = r.pick(items);
    return {
      prompt: `The agent is <b>${agent}</b>. Is <b>“${item}”</b> a percept (something the agent receives from its environment) or an action (something the agent does to its environment)? Type <b>P</b> or <b>A</b>.`,
      hint: 'Follow the arrow: from the world into the agent is a percept; from the agent out to the world is an action.',
      answer: `<b>${L}</b>: “${item}” is ${L === 'P' ? 'information that flows <i>into</i> the agent, so it is a <b>percept</b>' : 'something the agent <i>does</i>, so it is an <b>action</b>'}.`,
      check: { type: 'text', answer: L }
    };
  }
};

const PARTS = [
  ['R', 'You are an experienced math teacher.'], ['R', 'Act as a careful code reviewer.'], ['R', 'You are a travel agent who knows Dubai well.'],
  ['T', 'Explain what a heuristic is.'], ['T', 'Find the bug in my Python function.'], ['T', 'Summarise this article.'],
  ['C', 'I am a second-year student and I already know what a queue is.'], ['C', 'The code must run in the browser with numpy only.'], ['C', 'The readers are parents with no technical background.'],
  ['F', 'Answer in five bullet points.'], ['F', 'Give the result as a table with two columns.'], ['F', 'Use at most 100 words.']
];
const PART_NAME = { R: 'role', T: 'task', C: 'context', F: 'format' };
const exPart = {
  title: 'Which part of the prompt is it?', random: true,
  gen(r) {
    const [L, txt] = r.pick(PARTS);
    return {
      prompt: `This sentence is part of a prompt: <b>“${txt}”</b><br>Which part is it? Type <b>R</b> (role), <b>T</b> (task), <b>C</b> (context) or <b>F</b> (format).`,
      hint: 'Role = who the tool should be. Task = what to do. Context = background facts about you or the situation. Format = the shape of the answer.',
      answer: `<b>${L}</b>: it is the <b>${PART_NAME[L]}</b>.`,
      check: { type: 'text', answer: L }
    };
  }
};

const PY_AGENT = `# A tiny rule-based agent in a grid world.
# The agent is a SIMPLE REFLEX agent: it only looks at the current percept.

ROWS, COLS = 4, 6
dirt = {(0, 2), (1, 4), (2, 1), (3, 3), (3, 5)}   # squares that are dirty

def agent(percept):
    """Rules: percept -> action."""
    row, col, dirty = percept
    if dirty:
        return 'Suck'
    if row % 2 == 0 and col < COLS - 1:   # even rows: sweep right
        return 'Right'
    if row % 2 == 1 and col > 0:          # odd rows: sweep left
        return 'Left'
    if row < ROWS - 1:                    # end of a row: go down
        return 'Down'
    return 'NoOp'                         # bottom corner: do nothing

def show(pos):
    for r in range(ROWS):
        line = ''
        for c in range(COLS):
            if (r, c) == pos:
                line += ' A'
            elif (r, c) in dirt:
                line += ' *'
            else:
                line += ' .'
        print(line)
    print()

pos, score = (0, 0), 0
moves = {'Right': (0, 1), 'Left': (0, -1), 'Down': (1, 0)}
for t in range(1, 41):
    percept = (pos[0], pos[1], pos in dirt)
    action = agent(percept)
    if action == 'Suck':
        dirt.discard(pos)
        score += 10
    elif action in moves:
        dr, dc = moves[action]
        pos = (pos[0] + dr, pos[1] + dc)
        score -= 1
    if t in (1, 12) or action == 'NoOp':
        print(f'step {t}: percept {percept} -> {action}   score {score}')
        show(pos)
    if action == 'NoOp':
        break

print('dirt left:', len(dirt), '  final score:', score)
`;

/* ---------- personal lab sheet (hand in): a personal grid world generated from the student ID ---------- */
// keyOf: turn the student cell into the teacher key by replacing print lines with "ANS name value" lines (throws if a line is missing)
const keyOf = (code, reps) => reps.reduce((c, [a, b]) => { if (!c.includes(a)) throw new Error('sheet key: line not found: ' + a); return c.replace(a, b); }, code);
// JS copy of the python simulate() below, used only to choose worlds whose answers are well defined
function sim1(B, kind, maxSteps = 200, reward = B.R) {
  const dirty = new Set(B.dirt.map(d => d.join(','))); let pos = [0, 0], score = 0, left = B.dirt.length;
  const ag = ([row, col, d]) => {
    if (d) return 'Suck';
    if (kind === 'model' || kind === 'col') { if (left === 0) return 'NoOp'; }
    if (kind === 'col') { if (col % 2 === 0 && row < B.rows - 1) return 'Down'; if (col % 2 === 1 && row > 0) return 'Up'; if (col < B.cols - 1) return 'Right'; return 'NoOp'; }
    if (kind === 'down' && row < B.rows - 1) return 'Down';
    if (row % 2 === 0 && col < B.cols - 1) return 'Right';
    if (row % 2 === 1 && col > 0) return 'Left';
    if (row < B.rows - 1) return 'Down';
    return 'NoOp';
  };
  const MV = { Right: [0, 1], Left: [0, -1], Down: [1, 0], Up: [-1, 0] };
  for (let t = 1; t <= maxSteps; t++) {
    const k = pos.join(','), a = ag([pos[0], pos[1], dirty.has(k)]);
    if (a === 'Suck') { dirty.delete(k); score += reward; left--; }
    else if (MV[a]) { pos = [pos[0] + MV[a][0], pos[1] + MV[a][1]]; score -= 1; }
    else if (a === 'NoOp') return { steps: t, score, cleaned: B.dirt.length - dirty.size };
  }
  return { steps: maxSteps, score, cleaned: B.dirt.length - dirty.size };
}
const pySet = cells => '{' + cells.map(c => '(' + c.join(', ') + ')').join(', ') + '}';
const PY1_WORLD = (B, reward = B.R) => `ROWS, COLS = ${B.rows}, ${B.cols}
REWARD = ${reward}                  # points for each square cleaned (each move costs 1 point)
DIRT = ${pySet(B.dirt)}   # your dirty squares (row, column)

MOVES = {'Right': (0, 1), 'Left': (0, -1), 'Down': (1, 0), 'Up': (-1, 0)}

def simulate(agent, max_steps=200):
    """Run the agent from the top left corner (0, 0). Returns (steps, score, squares cleaned)."""
    dirty = set(DIRT)
    pos, score, left = (0, 0), 0, len(DIRT)     # left = dirty squares the agent still knows about
    for t in range(1, max_steps + 1):
        percept = (pos[0], pos[1], pos in dirty)
        action = agent(percept, left)
        if action == 'Suck':
            dirty.discard(pos)
            score += REWARD
            left -= 1
        elif action in MOVES:
            dr, dc = MOVES[action]
            pos = (pos[0] + dr, pos[1] + dc)
            score -= 1
        elif action == 'NoOp':
            return t, score, len(DIRT) - len(dirty)
    return max_steps, score, len(DIRT) - len(dirty)
`;
const PY1_REFLEX = `
def reflex_agent(percept, left):
    row, col, dirty = percept          # a simple reflex agent ignores 'left'
    if dirty:
        return 'Suck'
    if row % 2 == 0 and col < COLS - 1:   # even rows: sweep right
        return 'Right'
    if row % 2 == 1 and col > 0:          # odd rows: sweep left
        return 'Left'
    if row < ROWS - 1:                    # end of a row: go down
        return 'Down'
    return 'NoOp'
`;
const PY1_MODEL = `
def model_agent(percept, left):
    row, col, dirty = percept
    if dirty:
        return 'Suck'
    if left == 0:                         # memory: nothing is left to clean, so stop
        return 'NoOp'
    if row % 2 == 0 and col < COLS - 1:
        return 'Right'
    if row % 2 == 1 and col > 0:
        return 'Left'
    if row < ROWS - 1:
        return 'Down'
    return 'NoOp'
`;
const SHEET1 = {
  title: 'My personal lab sheet: a rule-based agent', marks: 10,
  intro: 'The grid world below is <b>personal</b>: its size, its dirty squares and its reward are generated from your student ID, so your answers differ from those of your classmates. Run each code cell (press ▶ Run), copy the results into the answer boxes, add a screenshot of your results if you like, and finally download your sheet as <b>Word</b> or <b>PDF</b> and upload it to Moodle.',
  base(r) {
    const rows = r.int(3, 5), cols = r.int(5, 7), R = r.pick([5, 8, 10, 12, 15]);
    let R2; do { R2 = r.pick([5, 8, 10, 12, 15, 20]); } while (R2 === R);
    let B, ok = false;
    while (!ok) {
      const all = []; for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) if (i || j) all.push([i, j]);
      const dirt = r.shuffle(all).slice(0, r.int(4, 7)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      B = { rows, cols, R, R2, dirt };
      const full = sim1(B, 'reflex'), mod = sim1(B, 'model'), col = sim1(B, 'col'), dn = sim1(B, 'down');
      ok = mod.steps < full.steps && col.steps !== mod.steps && dn.cleaned < dirt.length;
      if (ok) {   // battery: the agent must run out of steps with dirt still left
        B.bat = r.int(Math.max(5, Math.floor(full.steps / 3)), full.steps - 3);
        ok = sim1(B, 'reflex', B.bat).cleaned < dirt.length;
      }
    }
    B.full = sim1(B, 'reflex');
    const R2true = sim1(B, 'reflex', 200, R2).score, k = B.dirt.length;
    B.claimType = r.pick(['correct', 'nocost', 'scaled']);
    B.claim = B.claimType === 'correct' ? R2true : B.claimType === 'nocost' ? R2 * k : Math.round(B.full.score * R2 / R);
    return B;
  },
  tasks: [
    { id: 't1', title: 'Run the reflex agent in your world', marks: 1.5, gen(r, B) {
      const code = PY1_WORLD(B) + PY1_REFLEX + `
def show():
    for i in range(ROWS):
        print(' '.join('*' if (i, j) in DIRT else '.' for j in range(COLS)))

show()                                   # * = dirty square
steps, score, cleaned = simulate(reflex_agent)
print("NoOp at step:", steps)
print("squares cleaned:", cleaned)
print("final score:", score)
`;
      return { html: `<p>Your world has <b>${B.rows}</b> rows and <b>${B.cols}</b> columns, <b>${B.dirt.length}</b> dirty squares and a reward of <b>${B.R}</b> points for each cleaned square (each move costs 1 point). Run the simple reflex agent of this lab in your world. At which step does it do <code>NoOp</code>? How many squares does it clean, and what is its final score?</p>`, code,
        fields: [{ k: 'steps', label: 'NoOp at step', type: 'num' }, { k: 'cleaned', label: 'Squares cleaned', type: 'num' }, { k: 'score', label: 'Final score', type: 'num' }],
        key: keyOf(code, [['print("NoOp at step:"', 'print("ANS noop_step"'], ['print("squares cleaned:"', 'print("ANS cleaned"'], ['print("final score:"', 'print("ANS score"']]) }; } },
    { id: 't2', title: 'A weak battery', marks: 1.5, gen(r, B) {
      const code = PY1_WORLD(B) + PY1_REFLEX + `
BATTERY = ${B.bat}                       # the battery lasts only this many steps
steps, score, cleaned = simulate(reflex_agent, max_steps=BATTERY)
print("steps done:", steps)
print("dirt left:", len(DIRT) - cleaned)
print("score:", score)
`;
      return { html: `<p>Now the battery of your agent lasts only <b>${B.bat}</b> steps. Run the same reflex agent with this limit. How many dirty squares are still left when the battery is empty, and what is the score at that moment?</p>`, code,
        fields: [{ k: 'left', label: 'Dirt left', type: 'num' }, { k: 'score', label: 'Score when the battery is empty', type: 'num' }],
        key: keyOf(code, [['print("dirt left:"', 'print("ANS dirt_left"'], ['print("score:"', 'print("ANS score"']]) }; } },
    { id: 't3', title: 'An agent with a memory', marks: 1.5, gen(r, B) {
      const code = PY1_WORLD(B) + PY1_REFLEX + PY1_MODEL + `
s1, score1, c1 = simulate(reflex_agent)
s2, score2, c2 = simulate(model_agent)
print("reflex agent: NoOp at step", s1, " score", score1)
print("model-based agent: NoOp at step", s2, " score", score2)
print("steps saved:", s1 - s2)
`;
      return { html: `<p>A <b>model-based</b> agent remembers how many dirty squares are left (it is told the number at the start and counts down after each Suck). It stops as soon as the number is zero. Run both agents in your world. Report the step at which the model-based agent stops, its score, and how many steps it saves compared with the reflex agent.</p>`, code,
        fields: [{ k: 'stop', label: 'Model-based agent: NoOp at step', type: 'num' }, { k: 'score', label: 'Model-based agent: final score', type: 'num' }, { k: 'saved', label: 'Steps saved', type: 'num' }],
        key: keyOf(code, [['print("model-based agent: NoOp at step", s2, " score", score2)', 'print("ANS model_stop", s2); print("ANS model_score", score2)'], ['print("steps saved:"', 'print("ANS saved"']]) }; } },
    { id: 't4', title: 'Check an AI answer', marks: 1.5, gen(r, B) {
      const code = PY1_WORLD(B) + PY1_REFLEX + `
steps, score, cleaned = simulate(reflex_agent)
print("REWARD =", REWARD, " final score of the reflex agent:", score)
`;
      return { html: `<p>A student asked an AI assistant: "In my grid world the reflex agent scores ${B.full.score} with a reward of ${B.R}. What is the score if the reward becomes ${B.R2}?" The AI tool answered, sounding very sure: <b>"The new final score is ${B.claim}."</b><br>Do not trust it: check it. Change <code>REWARD</code> in the cell to <b>${B.R2}</b> and run. What is the real score? Is the AI answer correct? If it is wrong, say what mistake it probably made.</p>`, code,
        fields: [{ k: 'score', label: `Real final score with REWARD = ${B.R2}`, type: 'num' }, { k: 'ok', label: 'Is the AI answer correct? (yes or no)', type: 'text' }, { k: 'why', label: 'How you checked it, and the mistake (if any)', type: 'long' }],
        key: keyOf(code, [[`REWARD = ${B.R} `, `REWARD = ${B.R2} `], ['print("REWARD =", REWARD, " final score of the reflex agent:", score)', `print("ANS real_score", score); print("ANS ai_answer_is", "correct" if score == ${B.claim} else "wrong")`]]),
        note: { correct: 'The AI answer is correct here: the student must say yes, after checking by running the code.', nocost: 'The AI answer forgot the move costs (it gave reward times dirty squares).', scaled: 'The AI answer scaled the whole old score by new reward / old reward, but the move costs do not change with the reward.' }[B.claimType] }; } },
    { id: 'c1', kind: 'challenge', title: 'Sweep by columns', marks: 2, gen(r, B) {
      const code = PY1_WORLD(B) + PY1_MODEL + `
def column_agent(percept, left):
    row, col, dirty = percept
    if dirty:
        return 'Suck'
    if left == 0:
        return 'NoOp'
    # YOUR RULES HERE: sweep by columns instead of rows
    #   even columns: go Down until the last row
    #   odd columns:  go Up until the first row
    #   at the end of a column: go Right
    return 'NoOp'

s_row, score_row, _ = simulate(model_agent)
s_col, score_col, _ = simulate(column_agent)
print("rows:    NoOp at step", s_row, " score", score_row)
print("columns: NoOp at step", s_col, " score", score_col)
`;
      const keyAgent = `    if col % 2 == 0 and row < ROWS - 1:
        return 'Down'
    if col % 2 == 1 and row > 0:
        return 'Up'
    if col < COLS - 1:
        return 'Right'
    return 'NoOp'

s_row`;
      return { html: `<p>Finish the rules of <code>column_agent</code> so that it sweeps your grid <b>by columns</b> (down on even columns, up on odd columns, right at the end of a column). It also has the memory, so it stops when nothing is left. Report when it stops and its score. Which sweep is better for <b>your</b> dirty squares, rows or columns, and why? Paste your rules into the last box.</p>`, code,
        fields: [{ k: 'stop', label: 'Column agent: NoOp at step', type: 'num' }, { k: 'score', label: 'Column agent: final score', type: 'num' }, { k: 'best', label: 'Better sweep for my grid (rows or columns), and why', type: 'long' }, { k: 'code', label: 'Your rules (paste your code)', type: 'code' }],
        key: keyOf(code, [["    return 'NoOp'\n\ns_row", keyAgent], ['print("rows:    NoOp at step", s_row, " score", score_row)', 'print("ANS row_stop", s_row); print("ANS row_score", score_row)'], ['print("columns: NoOp at step", s_col, " score", score_col)', 'print("ANS col_stop", s_col); print("ANS col_score", score_col); print("ANS better", "columns" if s_col < s_row else "rows")']]),
        note: 'The better sweep is the one that reaches the last dirty square earlier, so it stops sooner and pays fewer moves.' }; } },
    { id: 'c2', kind: 'challenge', title: 'The order of the rules', marks: 2, gen(r, B) {
      const code = PY1_WORLD(B) + PY1_REFLEX + `
steps, score, cleaned = simulate(reflex_agent)
print("NoOp at step:", steps)
print("squares cleaned:", cleaned, "of", len(DIRT))
print("final score:", score)
`;
      const changed = code.replace(`    if row % 2 == 0 and col < COLS - 1:   # even rows: sweep right
        return 'Right'
    if row % 2 == 1 and col > 0:          # odd rows: sweep left
        return 'Left'
    if row < ROWS - 1:                    # end of a row: go down
        return 'Down'`, `    if row < ROWS - 1:                    # end of a row: go down
        return 'Down'
    if row % 2 == 0 and col < COLS - 1:   # even rows: sweep right
        return 'Right'
    if row % 2 == 1 and col > 0:          # odd rows: sweep left
        return 'Left'`);
      if (changed === code) throw new Error('sheet key: rule swap failed');
      return { html: `<p>A simple reflex agent checks its rules from top to bottom and uses the <b>first</b> rule that fits. In <code>reflex_agent</code>, move the two lines of the <b>go down</b> rule up, so that they come right after the <code>if dirty</code> rule. Run it in your world. How many squares does it clean now, and what is its score? Explain in two sentences, with your own numbers, why the order of the rules changes the behaviour.</p>`, code,
        fields: [{ k: 'cleaned', label: 'Squares cleaned with the new order', type: 'num' }, { k: 'score', label: 'Final score with the new order', type: 'num' }, { k: 'why', label: 'Your explanation (two sentences)', type: 'long' }],
        key: keyOf(changed, [['print("squares cleaned:", cleaned, "of", len(DIRT))', 'print("ANS cleaned", cleaned)'], ['print("final score:"', 'print("ANS score"']]),
        note: 'With "go down" first, the agent goes straight down column 0, then only the last row can be swept (if that row is even) before NoOp: it misses most dirty squares. Accept any clear explanation that uses the student\'s numbers.' }; } }
  ]
};

Course.lecture({
  id: 'lab01', num: 1, week: 1, kind: 'lab', title: 'Introduction to AI tools',
  lede: 'Use AI tools well and judge them critically, then build your own first agent: a few lines of Python rules that clean a grid world.',
  clos: [1], widgets: [],
  goals: ['write a clear prompt (role, task, context, format) and check the answer of an AI tool',
    'explain why fluent answers can be wrong (hallucination) and how to verify them',
    'tell percepts from actions for different agents',
    'run, change and judge a simple rule-based agent in Python'],
  chapters: [
    { id: 'tools', title: 'Using AI tools well', blocks: [
      { html: '<p>AI assistants (chatbots, coding helpers, image tools) are themselves <b>agents</b>: your prompt is their percept, their text is their action. A good prompt gives them the information a good human helper would need.</p><table class="mini"><tr><th>part</th><th>example</th></tr><tr><td>role</td><td>"You are a patient tutor for first-year students."</td></tr><tr><td>task</td><td>"Explain breadth-first search."</td></tr><tr><td>context</td><td>"I know what a queue is, but not graphs."</td></tr><tr><td>format</td><td>"Use 5 short steps and one small example."</td></tr><tr><td>check</td><td>"Tell me which parts you are not sure about."</td></tr></table>' },
      { scene: sceneCycle },
      { exercise: exPart },
      { quiz: { q: 'Which prompt will most likely give the most useful answer?', options: ['"search algorithms"', '"Explain search."', '"You are a tutor. Explain breadth-first search to a student who knows queues, in 5 short steps with one small example."', '"Write everything about AI search, as long as possible."'], correct: 2, why: 'It gives a role, a clear task, the context (what the student already knows) and a format. The others leave the tool guessing.' } }
    ] },
    { id: 'judge', title: 'Judging the answer', blocks: [
      { html: '<p>A language model predicts likely text. Likely is not the same as true. Before you use an answer, check it:</p><ul><li><b>Facts and numbers:</b> can you confirm them in the textbook or another reliable source?</li><li><b>Sources:</b> do the cited papers or links really exist and say this?</li><li><b>Reasoning:</b> does each step follow? Try a small example by hand.</li><li><b>Code:</b> run it and test it, also on an edge case.</li><li><b>Privacy:</b> never paste personal data, passwords or exam content into a public AI tool.</li></ul>' },
      { note: '<b>Your task (10 minutes).</b> Ask an AI assistant: "Give the history of AI in five dates." Compare its answer with the timeline in Lecture 1. Mark each date ✓ or ✗. Then improve your prompt (add a format, ask for sources) and ask again. Write two sentences: what changed, and what you still had to check yourself.' },
      { quiz: { q: 'An AI tool gives you a reference: "Smith and Lee (2019), Journal of Search Algorithms, pages 12 to 20". What should you do?', options: ['Copy it into your report, it looks real', 'Check that the paper exists and says this, before you use it', 'Ask the same tool if it is sure', 'Delete the page numbers and keep the rest'], correct: 1, why: 'Language models can invent references that look perfect (hallucination). Asking the same tool again is not a check. Find the paper yourself.' } }
    ] },
    { id: 'pa', title: 'Percepts and actions', blocks: [
      { html: '<p>Recall Lecture 1: an agent <b>perceives</b> its environment through sensors and <b>acts</b> on it through actuators. Practise telling the two apart. Press <b>New random problem</b> several times.</p>' },
      { exercise: exPA }
    ] },
    { id: 'agent', title: 'Build a rule-based agent in Python', blocks: [
      { html: '<p>Our agent cleans a grid of 4 rows and 6 columns. Its percept is <b>(row, column, is it dirty?)</b>. Its rules sweep the grid like a lawn mower: right on even rows, left on odd rows, down at the end of a row. It earns <b>+10</b> for each square it cleans and pays <b>−1</b> for each move. Press <b>Run</b>.</p>' },
      { py: { title: 'A simple reflex agent', code: PY_AGENT } },
      { note: '<b>Expected output.</b> Step 1: <code>percept (0, 0, False) -> Right</code>. At step 29 the agent reaches the bottom left corner and does <code>NoOp</code>. Final line: <code>dirt left: 0   final score: 27</code> (5 squares cleaned = +50, 23 moves = −23).' },
      { note: '<b>Your tasks.</b> (1) Delete the two lines of the <code>if dirty:</code> rule and run again. What is the score now, and why? (2) Add a dirty square at <code>(2, 5)</code>. Predict the new score before you run. (3) Think: the last dirt is cleaned long before step 29, but the agent keeps moving. Why can a simple reflex agent not know that it may stop? What would a <i>model-based</i> agent remember?' },
      { deeper: { title: 'Answers to the tasks', html: '<p>(1) Without the suck rule nothing is cleaned: 23 moves give a score of <b>−23</b>, and <code>dirt left: 5</code>. (2) One more square cleaned: score <b>37</b>. (3) The agent only sees its own square, so it cannot know the rest of the grid is clean. A model-based agent would keep a memory (for example a count of dirty squares it knows about) and could stop early.</p>' } }
    ] }
    ,{ id: 'sheet', title: 'Your personal lab sheet (hand in)', blocks: [
      { html: '<p>This is the part you <b>hand in</b>. Your teacher gets your file from Moodle and compares it with the answers generated from your ID.</p>' },
      { labsheet: SHEET1 }
    ] }
  ]
});
})();

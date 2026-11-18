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
  ]
});
})();

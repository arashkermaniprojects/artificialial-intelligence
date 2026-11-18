(function () {
const K = Course.kit;
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };

/* ---- scene: nodes opened by A* on the lab board (numbers produced by running the Python cell below) ---- */
const RUNS = [{ n: 25993, t: 'h = 0', c: 'var(--c-soft)' }, { n: 1162, t: 'misplaced tiles', c: 'var(--c-b)' }, { n: 85, t: 'Manhattan', c: 'var(--c-a)' }];
const LOGH = v => 52 * Math.log10(v);
const sceneBars = {
  id: 'bars', title: 'How much does a good heuristic save?', w: 720, h: 380,
  build(F) {
    K.title(F, 'Boards opened by A star (18-move puzzle)', 'the bar heights use a log scale: each grid line is ten times more');
    const X0 = 120, Y0 = 320;
    for (let k = 0; k <= 4; k++) { const y = Y0 - 52 * k; F.line(X0 - 10, y, 660, y, { stroke: 'var(--c-grid)' }); F.text(X0 - 16, y, String(Math.pow(10, k)), { size: 11, cls: 'soft mono', anchor: 'end' }); }
    F.s.bars = RUNS.map((r, i) => {
      const x = X0 + 40 + i * 170, g = F.g({});
      const rect = F.rect(x, Y0, 110, 0, { rx: 8, fill: r.c, filter: 'url(#fx-soft)' }, g);
      const val = F.text(x + 55, Y0 - 14, '', { size: 15, weight: 800, cls: 'mono' }, g);
      F.text(x + 55, Y0 + 18, r.t, { size: 13, weight: 700 }, g);
      g.style.opacity = 0; return { g, rect, val, x, h: LOGH(r.n), n: r.n };
    });
    F.s.Y0 = Y0;
    F.s.msg = K.callout(F, 470, 90, 'same 18 moves · about 300 times less work', { tone: 'ok', w: 330 });
  },
  steps: RUNS.map((r, i) => ({
    title: ['Blind: h = 0', 'Misplaced tiles', 'Manhattan distance'][i],
    say: [
      ['With h equal to zero, A star is just uniform cost search. It opened about twenty six thousand boards.', 'It finds the best solution, eighteen moves, but it searches in every direction.'],
      ['With the misplaced tiles heuristic, A star opened about one thousand two hundred boards.', 'It finds the same eighteen moves with about twenty times less work.'],
      ['With the Manhattan distance, it opened only eighty five boards.', 'Same answer, about three hundred times less work than blind search. A better honest guess means less work.']
    ][i],
    cues: [F => { const b = F.s.bars[i]; F.show(b.g, 200); F.setText(b.val, b.n.toLocaleString('en-US'), b.x + 55, 16); return Promise.all([F.to(b.rect, { y: F.s.Y0 - b.h, height: b.h }, 900, 'out'), F.to(b.val, { y: F.s.Y0 - b.h - 14 }, 900, 'out')]); },
           F => i === 2 ? seq(F => F.show(F.s.msg), F => F.pulse(F.s.msg, 1))(F) : F.pulse(F.s.bars[i].g, 0)]
  }))
};

/* ---- exercise: f = g + h2 for a board ---- */
const GOAL = [0, 1, 2, 3, 4, 5, 6, 7, 8];
function board(F, ox, oy, a, name) {
  const s = 50; F.text(ox + s * 1.5, oy - 16, name, { size: 13, weight: 700 });
  F.rect(ox - 5, oy - 5, s * 3 + 10, s * 3 + 10, { rx: 10, fill: 'var(--card)', stroke: 'var(--line)', 'stroke-width': 1.4 });
  a.forEach((v, i) => { if (v) F.box(ox + (i % 3) * s + s / 2, oy + Math.floor(i / 3) * s + s / 2, s - 6, s - 6, String(v), { size: 19, weight: 750, rx: 8 }); });
}
const exF = {
  title: 'Compute f = g + h for a board', random: true,
  gen(r) {
    const a = r.shuffle(GOAL), g = r.int(2, 12); let h = 0; const parts = [];
    for (let v = 1; v <= 8; v++) { const i = a.indexOf(v), j = GOAL.indexOf(v), d = Math.abs(Math.floor(i / 3) - Math.floor(j / 3)) + Math.abs(i % 3 - j % 3); parts.push(d); h += d; }
    return {
      prompt: `A* reached this board after <b>g = ${g}</b> moves from the start. With the Manhattan heuristic <b>h2</b> (goal on the right: empty square top left), what is <b>f = g + h2</b>?`,
      hint: 'For each tile 1 to 8, count rows apart plus columns apart from its goal square. Add them to get h2, then add g.',
      answer: `Tile distances 1 to 8: ${parts.join(', ')}, so h2 = ${h}. f = ${g} + ${h} = <b>${g + h}</b>.`,
      check: { type: 'number', answer: g + h, tol: 0.01 },
      figure: { w: 440, h: 200, draw(F) { board(F, 40, 30, a, 'board'); board(F, 250, 30, GOAL, 'goal'); } }
    };
  }
};

const exH1 = {
  title: 'Count the misplaced tiles', random: true,
  gen(r) {
    const a = r.shuffle(GOAL), wrong = [];
    for (let v = 1; v <= 8; v++) if (a.indexOf(v) !== GOAL.indexOf(v)) wrong.push(v);
    return {
      prompt: 'What is <b>h1</b>, the number of misplaced tiles, for this board? (Goal on the right; the empty square does not count.)',
      hint: 'Compare each tile 1 to 8 with the goal board. Count the tiles that are not on their goal square.',
      answer: `Misplaced tiles: ${wrong.length ? wrong.join(', ') : 'none'}. So h1 = <b>${wrong.length}</b>. In Python this is <code>h_misplaced(board)</code>.`,
      check: { type: 'number', answer: wrong.length, tol: 0.01 },
      figure: { w: 440, h: 200, draw(F) { board(F, 40, 30, a, 'board'); board(F, 250, 30, GOAL, 'goal'); } }
    };
  }
};

const PY_ASTAR = `import heapq

GOAL = (0, 1, 2,
        3, 4, 5,
        6, 7, 8)           # 0 = the empty square
START = (7, 3, 1,
         8, 6, 2,
         5, 4, 0)

def neighbours(state):
    """All boards reachable by sliding one tile into the empty square."""
    i = state.index(0)
    r, c = divmod(i, 3)
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < 3 and 0 <= nc < 3:
            j = nr * 3 + nc
            s = list(state)
            s[i], s[j] = s[j], s[i]
            yield tuple(s)

def h_zero(state):
    return 0

def h_misplaced(state):
    return sum(1 for i, t in enumerate(state) if t != 0 and t != GOAL[i])

def h_manhattan(state):
    total = 0
    for i, t in enumerate(state):
        if t != 0:
            g = GOAL.index(t)
            total += abs(i // 3 - g // 3) + abs(i % 3 - g % 3)
    return total

def astar(start, h):
    counter = 0                                  # breaks ties: older entries first
    frontier = [(h(start), counter, start)]      # priority queue ordered by f = g + h
    g = {start: 0}
    parent = {start: None}
    opened = 0
    closed = set()
    while frontier:
        f, _, s = heapq.heappop(frontier)
        if s in closed:
            continue
        closed.add(s)
        opened += 1
        if s == GOAL:
            path = []
            while s is not None:
                path.append(s)
                s = parent[s]
            return path[::-1], opened
        for n in neighbours(s):
            new_g = g[s] + 1                     # every move costs 1
            if n not in g or new_g < g[n]:
                g[n] = new_g
                parent[n] = s
                counter += 1
                heapq.heappush(frontier, (new_g + h(n), counter, n))
    return None, opened

for name, h in [('h = 0 (uniform cost)', h_zero), ('misplaced tiles', h_misplaced), ('Manhattan distance', h_manhattan)]:
    path, opened = astar(START, h)
    print(f'{name:22s} moves: {len(path) - 1:3d}   nodes opened: {opened:6d}')
`;
const PY_WEIGHT = `# Weighted A*: multiply the Manhattan heuristic by w
try:
    astar
except NameError:
    print('Run the first Python cell (A* with three heuristics) first.')
else:
    for w in [1, 2, 3]:
        h_w = lambda s, w=w: w * h_manhattan(s)
        path, opened = astar(START, h_w)
        print(f'w = {w}   moves: {len(path) - 1}   nodes opened: {opened:3d}')
`;

Course.lecture({
  id: 'lab03', num: 3, week: 3, kind: 'lab', title: 'Informed search (A*)',
  lede: 'Implement A* for the 8 puzzle with a priority queue, then measure how much a good heuristic saves: from twenty-six thousand boards to eighty-five.',
  clos: [1], widgets: [],
  goals: ['implement <b>A*</b> with <code>heapq</code>, using f = g + h',
    'write the heuristics <b>h = 0</b>, <b>misplaced tiles</b> and <b>Manhattan distance</b>',
    'compare the number of nodes opened, and check that every admissible heuristic returns the same optimal length',
    'see what happens when the heuristic overestimates (weighted A*)'],
  chapters: [
    { id: 'idea', title: 'The idea in one picture', blocks: [
      { html: '<p>A* opens the node with the smallest <b>f = g + h</b>: g is the number of moves made so far, h a guess of the moves still needed. With h = 0 it becomes uniform cost search. The scene shows what you will measure in this lab.</p>' },
      { scene: sceneBars }
    ] },
    { id: 'code', title: 'A* for the 8 puzzle', blocks: [
      { html: '<p>A board is a tuple of 9 numbers (0 is the empty square). <code>heapq</code> is Python\'s priority queue: it always pops the smallest tuple, so we push <code>(f, counter, board)</code>. The counter breaks ties, so the run is the same every time. Press <b>Run</b> (about one second).</p>' },
      { py: { title: 'A* with three heuristics', code: PY_ASTAR } },
      { note: '<b>Expected output.</b><br><code>h = 0 (uniform cost)   moves:  18   nodes opened:  25993</code><br><code>misplaced tiles        moves:  18   nodes opened:   1162</code><br><code>Manhattan distance     moves:  18   nodes opened:     85</code><br>All three are admissible, so all three find the optimal 18 moves. Only the work changes.' },
      { exercise: exH1 },
      { exercise: exF }
    ] },
    { id: 'tasks', title: 'Experiments', blocks: [
      { html: '<p>Run the cell above first: this cell uses its functions. A <b>weighted</b> heuristic multiplies h by w > 1. It is no longer admissible: it may overestimate.</p>' },
      { py: { title: 'Weighted A*: faster, but optimal?', code: PY_WEIGHT } },
      { note: '<b>Expected output.</b><br><code>w = 1   moves: 18   nodes opened:  85</code><br><code>w = 2   moves: 22   nodes opened:  51</code><br><code>w = 3   moves: 30   nodes opened:  89</code><br>With w = 2 the search is faster but the solution is 4 moves longer than optimal. More weight does not even guarantee less work (w = 3 opened 89).' },
      { note: '<b>Your tasks.</b> (1) In the first cell, set <code>START</code> to the lecture board <code>(7, 2, 4, 5, 0, 6, 8, 3, 1)</code> and run only the Manhattan and misplaced-tiles lines (h = 0 opens more than 170 000 boards and is slow in the browser). Record moves and nodes opened. (2) Write a new heuristic <code>h_max(s) = max(h_misplaced(s), h_manhattan(s))</code>. Is it admissible? Does it open fewer nodes than Manhattan? Explain.' },
      { deeper: { title: 'Answers', html: '<p>(1) The lecture board needs <b>26 moves</b>: Manhattan opens <b>3978</b> boards, misplaced tiles <b>44989</b>. (2) The maximum of two admissible heuristics is admissible. Manhattan is never smaller than misplaced tiles (every misplaced tile is at least one square away), so <code>h_max</code> equals Manhattan and opens the same 85 boards.</p>' } },
      { quiz: { q: 'A* with an admissible heuristic and A* with h = 0 are run on the same puzzle. What is the same in both runs?', options: ['The number of nodes opened', 'The length of the solution found (both optimal)', 'The order in which nodes are opened', 'The time taken'], correct: 1, why: 'Every admissible heuristic keeps A* optimal, so the solution length is the same. A better (larger) admissible heuristic only reduces the work.' } }
    ] }
  ]
});
})();

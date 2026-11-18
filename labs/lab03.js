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

/* ---------- personal lab sheet (hand in): personal start boards made by random moves from the goal ---------- */
const keyOf = (code, reps) => reps.reduce((c, [a, b]) => { if (!c.includes(a)) throw new Error('sheet key: line not found: ' + a); return c.replace(a, b); }, code);
const nb8 = s => { const i = s.indexOf(0), r0 = Math.floor(i / 3), c0 = i % 3, out = []; for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const a = r0 + dr, b = c0 + dc; if (a >= 0 && a < 3 && b >= 0 && b < 3) { const t = s.slice(), j = a * 3 + b; [t[i], t[j]] = [t[j], t[i]]; out.push(t); } } return out; };
const man8 = s => s.reduce((t, v, i) => v ? t + Math.abs(Math.floor(i / 3) - Math.floor(v / 3)) + Math.abs(i % 3 - v % 3) : t, 0);
function optLen(start) {   // JS A* with Manhattan (only to know the optimal number of moves of a board)
  const key = s => s.join(''), H = [], push = e => { H.push(e); let i = H.length - 1; while (i) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } },
    pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < H.length && H[a][0] < H[m][0]) m = a; if (b < H.length && H[b][0] < H[m][0]) m = b; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top; };
  const g = new Map([[key(start), 0]]), closed = new Set(); push([man8(start), start]);
  while (H.length) { const [, s] = pop(), k = key(s); if (closed.has(k)) continue; closed.add(k); if (k === '012345678') return g.get(k); for (const n of nb8(s)) { const nk = key(n), ng = g.get(k) + 1; if (!g.has(nk) || ng < g.get(nk)) { g.set(nk, ng); push([ng + man8(n), n]); } } }
  return -1;
}
function scramble(r, lo, hi) { for (;;) { let s = [0, 1, 2, 3, 4, 5, 6, 7, 8], prev = null; const m = r.int(lo + 2, hi + 12); for (let k = 0; k < m; k++) { const ns = nb8(s).filter(n => !prev || n.join('') !== prev); prev = s.join(''); s = r.pick(ns); } const d = optLen(s); if (d >= lo && d <= hi) return { s, d }; } }
const pyBoard = (name, s) => `${name} = (${s.slice(0, 3).join(', ')},\n${' '.repeat(name.length + 4)}${s.slice(3, 6).join(', ')},\n${' '.repeat(name.length + 4)}${s.slice(6).join(', ')})`;
const PY3_CORE = (s, extra = '') => { const core = PY_ASTAR.slice(0, PY_ASTAR.indexOf('for name, h in')); const c = core.replace(/START = \([\s\S]*?\)\n/, pyBoard('START', s) + '\n' + extra); if (c === core) throw new Error('sheet: START not replaced'); return c; };
const SHEET3 = {
  title: 'My personal lab sheet: A star on the 8 puzzle', marks: 10,
  intro: 'Your start boards are <b>personal</b>: they were made from the goal by random moves chosen from your student ID, so your answers differ from those of your classmates. Run each code cell (press ▶ Run), copy the results into the answer boxes, add a screenshot of your results if you like, and finally download your sheet as <b>Word</b> or <b>PDF</b> and upload it to Moodle.',
  base(r) {
    const b1 = scramble(r, 13, 17); let b2; do { b2 = scramble(r, 20, 23); } while (b2.s.join('') === b1.s.join(''));
    return { S: b1.s, d: b1.d, S2: b2.s, d2: b2.d, w: r.pick([2, 3]) };
  },
  tasks: [
    { id: 't1', title: 'Heuristic values of your board', marks: 1.5, gen(r, B) {
      const code = PY3_CORE(B.S) + `
print("start board:", START)
print("misplaced tiles h1:", h_misplaced(START))
print("Manhattan distance h2:", h_manhattan(START))
`;
      return { html: `<p>Your start board is <code>(${B.S.join(', ')})</code> (read row by row, 0 is the empty square). Compute the two heuristics of this board: the number of misplaced tiles <b>h1</b> and the Manhattan distance <b>h2</b>. Check one of them by hand. Which one is larger?</p>`, code,
        fields: [{ k: 'h1', label: 'Misplaced tiles h1', type: 'num' }, { k: 'h2', label: 'Manhattan distance h2', type: 'num' }, { k: 'big', label: 'Which is larger (h1 or h2)?', type: 'text' }],
        key: keyOf(code, [['print("misplaced tiles h1:", h_misplaced(START))', 'print("ANS h1", h_misplaced(START))'], ['print("Manhattan distance h2:", h_manhattan(START))', 'print("ANS h2", h_manhattan(START)); print("ANS larger", "h2" if h_manhattan(START) > h_misplaced(START) else "equal" if h_manhattan(START) == h_misplaced(START) else "h1")']]) }; } },
    { id: 't2', title: 'A star with the Manhattan distance', marks: 1.5, gen(r, B) {
      const code = PY3_CORE(B.S) + `
path, opened = astar(START, h_manhattan)
print("moves:", len(path) - 1)
print("nodes opened:", opened)
`;
      return { html: '<p>Solve your board with A star and the Manhattan heuristic. How many moves does the solution have, and how many boards (nodes) were opened?</p>', code,
        fields: [{ k: 'moves', label: 'Moves in the solution', type: 'num' }, { k: 'opened', label: 'Nodes opened', type: 'num' }],
        key: keyOf(code, [['print("moves:"', 'print("ANS moves"'], ['print("nodes opened:"', 'print("ANS opened"']]) }; } },
    { id: 't3', title: 'Blind search against misplaced tiles', marks: 1.5, gen(r, B) {
      const code = PY3_CORE(B.S) + `
for name, h in [('h = 0 (uniform cost)', h_zero), ('misplaced tiles', h_misplaced)]:
    path, opened = astar(START, h)
    print(f'{name:22s} moves: {len(path) - 1:3d}   nodes opened: {opened:6d}')
`;
      return { html: '<p>Now solve the same board with <b>h = 0</b> (uniform cost search) and with the <b>misplaced tiles</b> heuristic. Report the nodes opened by each. Do they find the same number of moves as in Task 2? Why?</p>', code,
        fields: [{ k: 'h0', label: 'Nodes opened with h = 0', type: 'num' }, { k: 'h1', label: 'Nodes opened with misplaced tiles', type: 'num' }, { k: 'same', label: 'Same number of moves as Task 2? Why?', type: 'long' }],
        key: keyOf(code, [["    print(f'{name:22s} moves: {len(path) - 1:3d}   nodes opened: {opened:6d}')", "    tag = 'uniform_cost' if h is h_zero else 'misplaced'; print(f'ANS {tag}_moves', len(path) - 1); print(f'ANS {tag}_opened', opened)"]]),
        note: 'Same number of moves: both heuristics are admissible (h = 0 trivially), so A star stays optimal; only the work changes.' }; } },
    { id: 't4', title: 'Weighted A star', marks: 1.5, gen(r, B) {
      const code = PY3_CORE(B.S) + `
W = ${B.w}
h_w = lambda s: W * h_manhattan(s)
path, opened = astar(START, h_w)
print("w =", W, " moves:", len(path) - 1)
print("w =", W, " nodes opened:", opened)
`;
      return { html: `<p>Multiply the Manhattan heuristic by <b>w = ${B.w}</b> (weighted A star). Report the moves and the nodes opened. Compare with Task 2: is the solution still optimal (the fewest moves)?</p>`, code,
        fields: [{ k: 'moves', label: 'Moves with weighted A star', type: 'num' }, { k: 'opened', label: 'Nodes opened', type: 'num' }, { k: 'opt', label: 'Still optimal? (yes or no)', type: 'text' }],
        key: keyOf(code, [['print("w =", W, " moves:", len(path) - 1)', `print("ANS moves", len(path) - 1); print("ANS optimal", "yes" if len(path) - 1 == ${B.d} else "no")`], ['print("w =", W, " nodes opened:", opened)', 'print("ANS opened", opened)']]),
        note: 'The optimal number of moves of this board is ' + B.d + '.' }; } },
    { id: 'c1', kind: 'challenge', title: 'Which tiles move?', marks: 2, gen(r, B) {
      const code = PY3_CORE(B.S) + `
path, opened = astar(START, h_manhattan)
tiles = []
for a, b in zip(path, path[1:]):
    # YOUR CODE HERE: find the tile that slides from board a to board b
    # (hint: it is the tile of board a at the place where board b has the empty square)
    pass
print("tiles moved:", tiles)
print("number of moves:", len(tiles))
`;
      return { html: '<p>The path is a list of boards. Finish the loop so that <code>tiles</code> lists, in order, the number of the tile that slides at every move of your Manhattan solution. Report the list and paste your loop into the last box.</p>', code,
        fields: [{ k: 'tiles', label: 'Tiles moved, in order', type: 'text' }, { k: 'n', label: 'Number of moves', type: 'num' }, { k: 'code', label: 'Your finished loop', type: 'code' }],
        key: keyOf(code, [['    pass\n', '    tiles.append(a[b.index(0)])\n'], ['print("tiles moved:", tiles)', 'print("ANS tiles", " ".join(map(str, tiles)))'], ['print("number of moves:"', 'print("ANS moves"']]),
        note: 'The list follows the path that this A star code returns. A different correct optimal solution (from changed code) is possible: accept it if it really solves the board in the same number of moves.' }; } },
    { id: 'c2', kind: 'challenge', title: 'A harder board', marks: 2, gen(r, B) {
      const code = PY3_CORE(B.S, pyBoard('HARD', B.S2) + '\n') + `
for board in (START, HARD):
    p1, o1 = astar(board, h_misplaced)
    p2, o2 = astar(board, h_manhattan)
    print("moves:", len(p2) - 1, " misplaced opened:", o1, " Manhattan opened:", o2, " ratio:", round(o1 / o2, 1))
`;
      return { html: `<p>Your second board <code>HARD = (${B.S2.join(', ')})</code> needs more moves. Run misplaced tiles and Manhattan on both boards (do not use h = 0 here, it is too slow). For the hard board report the moves and the nodes opened by both heuristics. Then explain in two sentences, with the two ratios (misplaced opened / Manhattan opened), what happens to the advantage of the better heuristic when the puzzle gets harder.</p>`, code,
        fields: [{ k: 'moves', label: 'Hard board: moves', type: 'num' }, { k: 'o1', label: 'Hard board: nodes opened with misplaced tiles', type: 'num' }, { k: 'o2', label: 'Hard board: nodes opened with Manhattan', type: 'num' }, { k: 'why', label: 'Your explanation with the two ratios', type: 'long' }],
        key: keyOf(code, [['    print("moves:", len(p2) - 1, " misplaced opened:", o1, " Manhattan opened:", o2, " ratio:", round(o1 / o2, 1))', '    print("ANS moves", len(p2) - 1); print("ANS misplaced_opened", o1); print("ANS manhattan_opened", o2); print("ANS ratio", round(o1 / o2, 1))']]),
        note: 'First pair of lines = START, second pair = HARD. Usually the ratio grows with the depth: the work of a weaker heuristic grows much faster. Accept an honest statement of the student\'s two ratios.' }; } }
  ]
};

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
    ,{ id: 'sheet', title: 'Your personal lab sheet (hand in)', blocks: [
      { html: '<p>This is the part you <b>hand in</b>. Your teacher gets your file from Moodle and compares it with the answers generated from your ID.</p>' },
      { labsheet: SHEET3 }
    ] }
  ]
});
})();

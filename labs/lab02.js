(function () {
const K = Course.kit;
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };

/* ---- scene: the graph of the Python code, BFS and DFS opening order (outputs verified by running the code) ---- */
const GN = { S: { x: 70, y: 200 }, A: { x: 205, y: 110 }, B: { x: 205, y: 290 }, C: { x: 340, y: 60 }, D: { x: 340, y: 200 }, E: { x: 340, y: 335 }, F: { x: 475, y: 60 }, G: { x: 610, y: 200 } };
const GE = [['S', 'A'], ['S', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['D', 'G'], ['E', 'G'], ['F', 'G']].map(([a, b]) => [a, b, null, { dir: true }]);
const ORD = { bfs: ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], dfs: ['S', 'A', 'C', 'F', 'G'] };
const PATH = { bfs: ['S', 'A', 'D', 'G'], dfs: ['S', 'A', 'C', 'F', 'G'] };
function showRun(F, kind) {
  const jobs = [];
  for (const n in GN) {
    const i = kind ? ORD[kind].indexOf(n) : -1;
    if (i >= 0) F.setText(F.s.ch[n].querySelector('text'), String(i + 1), 0, 14);
    jobs.push(F.to(F.s.ch[n], { opacity: i >= 0 ? 1 : 0 }, 300), F.s.G.state(n, n === 'S' ? 'start' : kind && PATH[kind].includes(n) ? 'path' : i >= 0 ? 'closed' : n === 'G' ? 'goal' : 'idle'));
  }
  for (const [a, b] of GE) { const p = kind ? PATH[kind] : []; const k = p.indexOf(a); jobs.push(F.s.G.edgeState(a, b, k >= 0 && p[k + 1] === b ? 'path' : 'idle')); }
  F.setText(F.s.res, kind ? (kind === 'bfs' ? 'breadth-first: 8 nodes opened, path of 3 steps' : 'depth-first: 5 nodes opened, path of 4 steps') : 'graph = { S: [A, B], A: [C, D], B: [D, E], C: [F], D: [G], E: [G], F: [G] }', null, 16);
  return Promise.all(jobs);
}
const sceneQS = {
  id: 'qs', title: 'The graph in the code', w: 720, h: 400,
  build(F) {
    K.title(F, 'From S to G', 'arrows = the neighbour lists in the Python dictionary · chips = opening order');
    F.s.G = K.graph(F, { nodes: GN, edges: GE }); F.s.G.state('S', 'start', 0); F.s.G.state('G', 'goal', 0);
    F.s.ch = {}; for (const n in GN) { F.s.ch[n] = K.chip(F, GN[n].x + 24, GN[n].y - 24, '', 'warn'); F.s.ch[n].style.opacity = 0; }
    F.s.res = F.text(360, 380, '', { size: 14, weight: 700, cls: 'mono' });
  },
  steps: [
    { title: 'The graph', say: ['This is the graph from the Python code. We search from S to G.', 'Each node lists its neighbours in a fixed order, and both searches follow that order.'],
      cues: [F => showRun(F, null), F => F.pulse(F.s.G.nodes.G.g, 2)] },
    { title: 'Breadth first', say: ['Breadth first opens S, A, B, C, D, E, F and finally G. That is all eight nodes.', 'Its path, S, A, D, G, has only three steps, the fewest possible.'],
      cues: [F => showRun(F, 'bfs'), F => F.pulse(F.s.G.nodes.D.g, 1)] },
    { title: 'Depth first', say: ['Depth first opens only S, A, C, F and G.', 'It was quicker here, but its path has four steps. Depth first does not promise the shortest path.'],
      cues: [F => showRun(F, 'dfs'), F => F.pulse(F.s.G.nodes.F.g, 1)] }
  ]
};

/* ---- exercise: what comes out of a queue or a stack? ---- */
const exQS = {
  title: 'Queue or stack: what comes out?', random: true,
  gen(r) {
    const kind = r.pick(['queue', 'stack']), names = r.shuffle(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']); let ops = [], box = [], k = 0, out = [];
    const n = r.int(6, 8);
    while (ops.length < n) {
      const canPop = box.length > 0, push = !canPop || (box.length < 4 && r.chance(.6));
      if (push && k < names.length) { ops.push('add ' + names[k]); box.push(names[k++]); }
      else { const x = kind === 'queue' ? box.shift() : box.pop(); ops.push('take'); out.push(x); }
    }
    if (!out.length || ops[ops.length - 1] !== 'take') { const x = kind === 'queue' ? box.shift() : box.pop(); ops.push('take'); out.push(x); }
    const last = out[out.length - 1];
    return {
      prompt: `A <b>${kind}</b> starts empty. We do these operations in order:<br><code>${ops.join(' · ')}</code><br>Which item does the <b>last</b> “take” return?`,
      hint: kind === 'queue' ? 'A queue is first in, first out: take returns the OLDEST item still inside.' : 'A stack is last in, first out: take returns the NEWEST item still inside.',
      answer: `The takes return, in order: <b>${out.join(', ')}</b>. So the last take returns <b>${last}</b>. ` + (kind === 'queue' ? 'Breadth-first search uses this rule.' : 'Depth-first search uses this rule.'),
      check: { type: 'text', answer: last }
    };
  }
};

const exParent = {
  title: 'Rebuild the path from the parent links', random: true,
  gen(r) {
    const names = r.shuffle(['A', 'B', 'C', 'D', 'E', 'F', 'H', 'K']), par = { S: null }, order = ['S'];
    names.forEach(n => { const p = r.pick(order); par[n] = p; order.push(n); });
    const deep = names.filter(n => { let d = 0, x = n; while (par[x]) { x = par[x]; d++; } return d >= 2; });
    const goal = deep.length ? r.pick(deep) : names[names.length - 1], path = [];
    for (let x = goal; x; x = par[x]) path.push(x);
    path.reverse();
    const shown = r.shuffle(Object.keys(par)).map(k => `'${k}': ${par[k] ? "'" + par[k] + "'" : 'None'}`).join(', ');
    return {
      prompt: `After a search, the <code>parent</code> dictionary is<br><code>{${shown}}</code><br>The goal is <b>${goal}</b>. Following the parent links back to S and reversing, what is the path from S to ${goal}? Type the letters with no spaces (for example <code>SAB</code>).`,
      hint: `Start at ${goal}, look up its parent, then the parent of that node, until you reach S (whose parent is None). Then read the list backwards.`,
      answer: `Walking back: ${path.slice().reverse().join(' ← ')}. Reversed: <b>${path.join('')}</b>. This is exactly what the <code>while node is not None</code> loop in the code does.`,
      check: { type: 'text', answer: path.join('') }
    };
  }
};

const PY_BFS = `from collections import deque

# The map: each node lists its neighbours (left to right)
graph = {
    'S': ['A', 'B'],
    'A': ['C', 'D'],
    'B': ['D', 'E'],
    'C': ['F'],
    'D': ['G'],
    'E': ['G'],
    'F': ['G'],
    'G': []
}

def bfs(graph, start, goal):
    frontier = deque([start])          # a QUEUE: first in, first out
    parent = {start: None}             # also remembers which nodes we reached
    opened = []
    while frontier:
        node = frontier.popleft()      # take the OLDEST node
        opened.append(node)
        if node == goal:               # goal test when a node is opened
            path = []
            while node is not None:
                path.append(node)
                node = parent[node]
            return path[::-1], opened
        for nb in graph[node]:
            if nb not in parent:       # never add a node twice
                parent[nb] = node
                frontier.append(nb)
    return None, opened

path, opened = bfs(graph, 'S', 'G')
print('opened :', ' '.join(opened))
print('path   :', ' -> '.join(path), f'({len(path) - 1} steps)')
`;
const PY_DFS = `# The map: each node lists its neighbours (left to right)
graph = {
    'S': ['A', 'B'],
    'A': ['C', 'D'],
    'B': ['D', 'E'],
    'C': ['F'],
    'D': ['G'],
    'E': ['G'],
    'F': ['G'],
    'G': []
}

def dfs(graph, start, goal):
    frontier = [(start, None)]         # a STACK of (node, parent)
    parent = {}
    opened = []
    while frontier:
        node, par = frontier.pop()     # take the NEWEST node
        if node in parent:             # already opened: skip it
            continue
        parent[node] = par
        opened.append(node)
        if node == goal:
            path = []
            while node is not None:
                path.append(node)
                node = parent[node]
            return path[::-1], opened
        for nb in reversed(graph[node]):   # reversed, so the LEFT neighbour is on top
            if nb not in parent:
                frontier.append((nb, node))
    return None, opened

path, opened = dfs(graph, 'S', 'G')
print('opened :', ' '.join(opened))
print('path   :', ' -> '.join(path), f'({len(path) - 1} steps)')
`;
const PY_MAZE = `from collections import deque

maze = [
    "S.........",
    ".####.#.#.",
    ".#....#.#.",
    ".#.####.#.",
    "...#....#G",
    "##...##...",
]
R, C = len(maze), len(maze[0])
find = lambda ch: next((r, c) for r in range(R) for c in range(C) if maze[r][c] == ch)
start, goal = find('S'), find('G')

def neighbours(r, c):
    for dr, dc in [(-1, 0), (0, 1), (1, 0), (0, -1)]:     # up, right, down, left
        nr, nc = r + dr, c + dc
        if 0 <= nr < R and 0 <= nc < C and maze[nr][nc] != '#':
            yield (nr, nc)

USE_STACK = False     # TASK: set to True to turn breadth-first into depth-first

frontier = deque([start])
parent = {start: None}
opened = 0
while frontier:
    cell = frontier.pop() if USE_STACK else frontier.popleft()
    opened += 1
    if cell == goal:
        break
    for nb in neighbours(*cell):
        if nb not in parent:
            parent[nb] = cell
            frontier.append(nb)

# walk back from the goal to draw the path
path, cell = [], goal
while cell is not None:
    path.append(cell)
    cell = parent[cell]
grid = [list(row) for row in maze]
for (r, c) in path[1:-1]:
    grid[r][c] = 'o'
print('\\n'.join(''.join(row) for row in grid))
print('cells opened:', opened, '  path length:', len(path) - 1)
`;

/* ---------- personal lab sheet (hand in): a personal graph and a personal maze generated from the student ID ---------- */
const keyOf = (code, reps) => reps.reduce((c, [a, b]) => { if (!c.includes(a)) throw new Error('sheet key: line not found: ' + a); return c.replace(a, b); }, code);
const NODES2 = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
// JS copies of the python searches, used only to pick graphs and mazes whose answers are well defined
function gBfs(g) { const fr = ['S'], par = { S: null }, op = []; while (fr.length) { const n = fr.shift(); op.push(n); if (n === 'G') { const p = []; for (let x = n; x; x = par[x]) p.push(x); return { path: p.reverse(), op }; } for (const nb of g[n]) if (!(nb in par)) { par[nb] = n; fr.push(nb); } } return null; }
function gDfs(g) { const fr = [['S', null]], par = {}, op = []; while (fr.length) { const [n, pp] = fr.pop(); if (n in par) continue; par[n] = pp; op.push(n); if (n === 'G') { const p = []; for (let x = n; x; x = par[x]) p.push(x); return { path: p.reverse(), op }; } for (const nb of g[n].slice().reverse()) if (!(nb in par)) fr.push([nb, n]); } return null; }
function mSearch(M, stack) {
  const R = M.length, C = M[0].length, key = (a, b) => a * 100 + b; let s, gl;
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { if (M[i][j] === 'S') s = [i, j]; if (M[i][j] === 'G') gl = [i, j]; }
  const fr = [s], par = new Map([[key(...s), null]]); let opened = 0, big = 1, found = false;
  while (fr.length) {
    const c = stack ? fr.pop() : fr.shift(); opened++;
    if (c[0] === gl[0] && c[1] === gl[1]) { found = true; break; }
    for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) { const a = c[0] + dr, b = c[1] + dc; if (a >= 0 && a < R && b >= 0 && b < C && M[a][b] !== '#' && !par.has(key(a, b))) { par.set(key(a, b), c); fr.push([a, b]); } }
    big = Math.max(big, fr.length);
  }
  if (!found) return null;
  const path = []; for (let c = gl; c; c = par.get(key(...c))) path.push(c);
  return { opened, len: path.length - 1, path: path.reverse(), big };
}
const setCell = (M, i, j, ch) => M.map((row, a) => a === i ? row.slice(0, j) + ch + row.slice(j + 1) : row);
const pyGraph = g => 'graph = {\n' + NODES2.map(n => `    '${n}': [${g[n].map(x => `'${x}'`).join(', ')}]`).join(',\n') + '\n}\n';
const pyMaze = M => 'maze = [\n' + M.map(row => `    "${row}",`).join('\n') + '\n]\n';
const withGraph = (code, g) => { const c = code.replace(/graph = \{[\s\S]*?\n\}\n/, pyGraph(g)); if (c === code) throw new Error('sheet: graph not replaced'); return c; };
const withMaze = (code, M, stack) => { const c = code.replace(/maze = \[[\s\S]*?\n\]\n/, pyMaze(M)).replace('USE_STACK = False', 'USE_STACK = ' + (stack ? 'True ' : 'False')); if (c === code) throw new Error('sheet: maze not replaced'); return c; };
const MAZE_KEY = [["print('cells opened:', opened, '  path length:', len(path) - 1)", "print('ANS cells_opened', opened); print('ANS path_length', len(path) - 1)"]];
const SHEET2 = {
  title: 'My personal lab sheet: uninformed search', marks: 10,
  intro: 'Your graph and your maze are <b>personal</b>: they are generated from your student ID, so your answers differ from those of your classmates. Run each code cell (press ▶ Run), copy the results into the answer boxes, add a screenshot of your results if you like, and finally download your sheet as <b>Word</b> or <b>PDF</b> and upload it to Moodle.',
  base(r) {
    let g, b, d;
    do {   // a random graph with arrows only "forward" in a personal order of the nodes
      const order = ['S', ...r.shuffle(['A', 'B', 'C', 'D', 'E', 'F']), 'G']; g = {};
      order.forEach((n, i) => { const later = order.slice(i + 1); g[n] = r.shuffle(later).slice(0, Math.min(later.length, r.int(1, 3))); });
      b = gBfs(g); d = gDfs(g);
    } while (!b || b.path.length < 3 || b.op.length < 5 || d.path.length <= b.path.length);
    const R = r.int(6, 7), C = r.int(9, 11); let M, mb, ms, wall;
    for (;;) {
      const gl = [r.int(Math.floor(R / 2), R - 1), C - 1 - r.int(0, 1)];
      M = Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => (i === 0 && j === 0) ? 'S' : (i === gl[0] && j === gl[1]) ? 'G' : (r.chance(0.3) ? '#' : '.')).join(''));
      mb = mSearch(M, false); ms = mSearch(M, true);
      if (!mb || mb.len < 10 || ms.len <= mb.len || ms.big === mb.big) continue;
      const cand = mb.path.slice(1, -1).filter(([i, j]) => { const x = mSearch(setCell(M, i, j, '#'), false); return x && x.len > mb.len; });
      if (!cand.length) continue;
      wall = r.pick(cand); break;
    }
    return { g, M, wall };
  },
  tasks: [
    { id: 't1', title: 'Breadth-first search on your graph', marks: 1.5, gen(r, B) {
      const code = withGraph(PY_BFS, B.g);
      return { html: `<p>Your graph: ${NODES2.filter(n => B.g[n].length).map(n => `<b>${n}</b> → ${B.g[n].join(', ')}`).join('; ')}. Run breadth-first search from S to G. Report the order in which the nodes are opened, the path, and its number of steps.</p>`, code,
        fields: [{ k: 'opened', label: 'Opened nodes, in order (for example S A B ...)', type: 'text' }, { k: 'path', label: 'Path (for example S -> A -> G)', type: 'text' }, { k: 'steps', label: 'Number of steps', type: 'num' }],
        key: keyOf(code, [["print('opened :', ' '.join(opened))", "print('ANS opened', ' '.join(opened))"], ["print('path   :', ' -> '.join(path), f'({len(path) - 1} steps)')", "print('ANS path', ' -> '.join(path)); print('ANS steps', len(path) - 1)"]]) }; } },
    { id: 't2', title: 'Depth-first search on your graph', marks: 1.5, gen(r, B) {
      const code = withGraph(PY_DFS, B.g);
      return { html: '<p>Now run depth-first search on the <b>same</b> graph (the cell already contains it). Report the opened nodes, the path and its number of steps. Which search found the shorter path?</p>', code,
        fields: [{ k: 'opened', label: 'Opened nodes, in order', type: 'text' }, { k: 'path', label: 'Path', type: 'text' }, { k: 'steps', label: 'Number of steps', type: 'num' }, { k: 'shorter', label: 'Shorter path found by (breadth-first or depth-first)', type: 'text' }],
        key: keyOf(code, [["print('opened :', ' '.join(opened))", "print('ANS opened', ' '.join(opened))"], ["print('path   :', ' -> '.join(path), f'({len(path) - 1} steps)')", "print('ANS path', ' -> '.join(path)); print('ANS steps', len(path) - 1); print('ANS shorter', 'breadth-first')"]]) }; } },
    { id: 't3', title: 'Your maze with a queue', marks: 1.5, gen(r, B) {
      const code = withMaze(PY_MAZE, B.M, false);
      return { html: `<p>Your maze has ${B.M.length} rows and ${B.M[0].length} columns. Run the maze search with <code>USE_STACK = False</code> (breadth-first). How many cells are opened, and how long is the path?</p>`, code,
        fields: [{ k: 'opened', label: 'Cells opened', type: 'num' }, { k: 'len', label: 'Path length', type: 'num' }],
        key: keyOf(code, MAZE_KEY) }; } },
    { id: 't4', title: 'Your maze with a stack', marks: 1.5, gen(r, B) {
      const code = withMaze(PY_MAZE, B.M, true);
      return { html: '<p>Run the same maze with <code>USE_STACK = True</code> (the cell is already set). How many cells are opened, and how long is the path now? Is this path the shortest one?</p>', code,
        fields: [{ k: 'opened', label: 'Cells opened', type: 'num' }, { k: 'len', label: 'Path length', type: 'num' }, { k: 'short', label: 'Is it the shortest path? (yes or no)', type: 'text' }],
        key: keyOf(code, MAZE_KEY.concat([["print('ANS path_length', len(path) - 1)", "print('ANS path_length', len(path) - 1); print('ANS shortest', 'no')"]])) }; } },
    { id: 'c1', kind: 'challenge', title: 'How big does the frontier get?', marks: 2, gen(r, B) {
      const code = `from collections import deque

${pyMaze(B.M)}R, C = len(maze), len(maze[0])
find = lambda ch: next((r, c) for r in range(R) for c in range(C) if maze[r][c] == ch)
start, goal = find('S'), find('G')

def neighbours(r, c):
    for dr, dc in [(-1, 0), (0, 1), (1, 0), (0, -1)]:     # up, right, down, left
        nr, nc = r + dr, c + dc
        if 0 <= nr < R and 0 <= nc < C and maze[nr][nc] != '#':
            yield (nr, nc)

def search(use_stack):
    frontier = deque([start])
    parent = {start: None}
    biggest = 1                  # the largest size of the frontier seen so far
    while frontier:
        cell = frontier.pop() if use_stack else frontier.popleft()
        if cell == goal:
            break
        for nb in neighbours(*cell):
            if nb not in parent:
                parent[nb] = cell
                frontier.append(nb)
        # YOUR CODE HERE: after the neighbours are added, update biggest
    return biggest

print("largest frontier with a queue:", search(False))
print("largest frontier with a stack:", search(True))
`;
      return { html: '<p>The frontier is the memory of the search. Finish the code: after the neighbours of a cell are added, update <code>biggest</code> so that it holds the largest size the frontier ever had. Run it on your maze for the queue (breadth-first) and for the stack. Which one needs more memory here? Paste your finished line(s) into the last box.</p>', code,
        fields: [{ k: 'q', label: 'Largest frontier with a queue', type: 'num' }, { k: 's', label: 'Largest frontier with a stack', type: 'num' }, { k: 'more', label: 'Which needs more memory in my maze?', type: 'text' }, { k: 'code', label: 'Your finished code', type: 'code' }],
        key: keyOf(code, [['        # YOUR CODE HERE: after the neighbours are added, update biggest', '        biggest = max(biggest, len(frontier))'], ['print("largest frontier with a queue:", search(False))\nprint("largest frontier with a stack:", search(True))', 'q, s = search(False), search(True)\nprint("ANS queue", q); print("ANS stack", s); print("ANS more_memory", "queue" if q > s else "stack")']]),
        note: 'Accept the update placed after the for loop (or after each append): both give the same largest size. In this code a cell is marked when it is ADDED, so the stack keeps many waiting cells and is often the bigger one; the key says which is bigger for this maze.' }; } },
    { id: 'c2', kind: 'challenge', title: 'Block the shortest path', marks: 2, gen(r, B) {
      const [wr, wc] = B.wall, row = B.M[wr], newRow = setCell(B.M, wr, wc, '#')[wr];
      const code = withMaze(PY_MAZE, B.M, false);
      return { html: `<p>Put a wall on your shortest path: in row <b>${wr}</b> of the maze (the first row is row 0), change column <b>${wc}</b> into <code>#</code>, so the row <code>"${row}"</code> becomes <code>"${newRow}"</code>. Run breadth-first again. What are the new path length and the number of cells opened? Explain in two sentences why breadth-first still finds the shortest path, and why the stack version does not promise this.</p>`, code,
        fields: [{ k: 'len', label: 'New path length', type: 'num' }, { k: 'opened', label: 'Cells opened', type: 'num' }, { k: 'why', label: 'Your explanation (two sentences)', type: 'long' }],
        key: keyOf(withMaze(PY_MAZE, setCell(B.M, wr, wc, '#'), false), MAZE_KEY),
        note: 'Breadth-first opens cells in order of their distance from S (a queue), so the first time it opens G it has used the fewest steps. A stack follows one branch deep first and can reach G by a long detour.' }; } }
  ]
};

Course.lecture({
  id: 'lab02', num: 2, week: 2, kind: 'lab', title: 'Uninformed search',
  lede: 'Write breadth-first and depth-first search in a few lines of Python, run them on a graph and on a maze, and see the queue and the stack at work.',
  clos: [1], widgets: [],
  goals: ['implement <b>breadth-first search</b> with a queue and rebuild the path with parent links',
    'implement <b>depth-first search</b> with a stack and compare the opening order',
    'solve a maze with both searches and compare nodes opened and path length'],
  chapters: [
    { id: 'idea', title: 'Queue or stack', blocks: [
      { html: '<p>Both searches use the same loop: <b>take a node from the frontier, test it, add its neighbours</b>. Breadth-first keeps the frontier in a <b>queue</b> (first in, first out). Depth-first uses a <b>stack</b> (last in, first out). In Python, <code>collections.deque</code> gives a fast queue (<code>popleft()</code>) and a list gives a stack (<code>pop()</code>).</p>' },
      { scene: sceneQS },
      { exercise: exQS }
    ] },
    { id: 'bfs', title: 'Breadth-first search in Python', blocks: [
      { html: '<p>Read the code first: the frontier, the <code>parent</code> dictionary (it remembers how we reached each node, so we can rebuild the path), and the goal test. Then press <b>Run</b>.</p>' },
      { py: { title: 'Breadth-first search', code: PY_BFS } },
      { note: '<b>Expected output.</b><br><code>opened : S A B C D E F G</code><br><code>path   : S -> A -> D -> G (3 steps)</code>' },
      { note: '<b>Your tasks.</b> (1) Change the start to <code>\'B\'</code>. Which nodes are opened now? (2) Add the road <code>\'S\': [\'A\', \'B\', \'G\']</code>. Predict the path before you run. (3) Change the goal to <code>\'E\'</code>. How many nodes are opened?' },
      { deeper: { title: 'Answers', html: '<p>(1) <code>B D E G</code>, path B → D → G. (2) Path S → G (1 step); opened <code>S A B G</code>, because G is opened after the other two neighbours of S. (3) Goal E: opened <code>S A B C D E</code>, 6 nodes, path S → B → E.</p>' } },
      { exercise: exParent }
    ] },
    { id: 'dfs', title: 'Depth-first search in Python', blocks: [
      { html: '<p>Now the frontier is a list used as a <b>stack</b>. We push neighbours in <b>reversed</b> order so that the leftmost neighbour is on top and is opened first. The cell defines the same graph again, so you can run it on its own.</p>' },
      { py: { title: 'Depth-first search', code: PY_DFS } },
      { note: '<b>Expected output.</b><br><code>opened : S A C F G</code><br><code>path   : S -> A -> C -> F -> G (4 steps)</code><br>Fewer nodes opened than breadth-first (5 against 8), but a longer path (4 steps against 3).' },
      { note: '<b>Your tasks.</b> (1) Remove <code>reversed( )</code> and run again. Which branch does the search try first now? (2) Put it back, and change the order of A\'s neighbours to <code>[\'D\', \'C\']</code>. What is the path now?' },
      { deeper: { title: 'Answers', html: '<p>(1) Without <code>reversed</code> the rightmost neighbour is on top: opened <code>S B E G</code>, path S → B → E → G (3 steps). (2) Opened <code>S A D G</code>, path S → A → D → G (3 steps). Depth-first depends strongly on the order of the neighbours.</p>' } }
    ] },
    { id: 'maze', title: 'Escape the maze', blocks: [
      { html: '<p>A grid maze is a graph too: every free square is a node, and its neighbours are the free squares up, right, down and left. <code>#</code> is a wall. The path is drawn with <code>o</code>.</p>' },
      { py: { title: 'Maze search', code: PY_MAZE } },
      { note: '<b>Expected output</b> with <code>USE_STACK = False</code> (breadth-first): the path goes along the top row, <code>cells opened: 37   path length: 13</code>.<br>With <code>USE_STACK = True</code> (a stack): the path goes down the left side and along the bottom, <code>cells opened: 18   path length: 17</code>. The stack opened fewer cells here, but found a longer path.' },
      { note: '<b>Your tasks.</b> (1) Run with both values of <code>USE_STACK</code> and copy the two results into a small table. (2) Put a wall <code>#</code> in the top row at column 8 (the row becomes <code>"S.......#."</code>). Run breadth-first again: what is the new shortest path length? (3) In one sentence: when would you prefer breadth-first, and when depth-first?' },
      { deeper: { title: 'Answer to task 2', html: '<p>The top route is blocked at column 8, so the path must go down column 7 and around: breadth-first now reports a <b>path length of 15</b>. Breadth-first always finds the fewest steps; a stack-based search may not.</p>' } },
      { quiz: { q: 'In the maze, why does the code check <code>if nb not in parent</code> before adding a neighbour?', options: ['To make the search faster only', 'So that no square is added twice; without it the search could go back and forth forever', 'Because Python needs it', 'To find the cheapest path'], correct: 1, why: 'Squares have many neighbours and the maze has loops. The parent dictionary remembers every square already reached, so each square enters the frontier at most once.' } }
    ] }
    ,{ id: 'sheet', title: 'Your personal lab sheet (hand in)', blocks: [
      { html: '<p>This is the part you <b>hand in</b>. Your teacher gets your file from Moodle and compares it with the answers generated from your ID.</p>' },
      { labsheet: SHEET2 }
    ] }
  ]
});
})();

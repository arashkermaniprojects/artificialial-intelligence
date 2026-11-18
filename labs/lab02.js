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
  ]
});
})();

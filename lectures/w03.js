(function () {
const K = Course.kit;

/* ---- the one graph used all through the lecture (verified by hand and by code) ----
   edges: S-A 1, S-B 4, S-D 2, A-B 2, A-C 5, B-C 1, C-G 3, D-G 9
   h:     S 6, A 5, B 3, C 2, D 5, G 0   (never above the true remaining cost = admissible and consistent) */
const NODES = { S: { x: 70, y: 215, sub: 'h=6' }, A: { x: 195, y: 100, sub: 'h=5' }, D: { x: 195, y: 335, sub: 'h=5' }, B: { x: 320, y: 215, sub: 'h=3' }, C: { x: 450, y: 105, sub: 'h=2' }, G: { x: 560, y: 275, sub: 'h=0' } };
const EDGES = [['S', 'A', 1, { dir: true }], ['S', 'B', 4, { dir: true }], ['S', 'D', 2, { dir: true }], ['A', 'B', 2, { dir: true }], ['A', 'C', 5, { dir: true }], ['B', 'C', 1, { dir: true }], ['C', 'G', 3, { dir: true }], ['D', 'G', 9, { dir: true }]];

function mkGraph(F) {
  K.title(F, 'A small map', 'numbers on arrows = step cost, h = a guess of the cost still to go');
  F.s.G = K.graph(F, { nodes: NODES, edges: EDGES });
  F.s.G.state('S', 'start', 0); F.s.G.state('G', 'goal', 0);
}

/* ---- scene 1: what g, h and f mean ---- */
const sceneGH = {
  id: 'gh', title: 'The three numbers of A star', w: 720, h: 400,
  build(F) {
    mkGraph(F);
    F.s.cg = K.callout(F, 330, 372, 'g(n) = the real cost paid so far, from S to n', { tone: 'ok', w: 400 });
    F.s.ch = K.callout(F, 330, 372, 'h(n) = a guess of the cost still to go, from n to G', { tone: 'warn', w: 410 });
    F.s.cf = K.callout(F, 330, 372, 'f(n) = g(n) + h(n): the best total we hope for through n', { tone: 'accent', w: 430 });
    F.s.cB = K.callout(F, 320, 262, 'g = 3   h = 3   f = 6', { tone: 'accent', w: 160 });
  },
  steps: [
    { title: 'The problem', say: ['We want the cheapest road from S to G.', 'Every arrow has a step cost. Some roads are short but expensive, some are long but cheap.'],
      cues: [async F => { await F.pulse(F.s.G.nodes.S.g, 2); await F.pulse(F.s.G.nodes.G.g, 2); }, async F => { await F.s.G.edgeState('D', 'G', 'hot'); await F.s.G.edgeState('A', 'C', 'hot'); }] },
    { title: 'g: what we paid', say: ['Let us walk S, then A, then B.', 'The money we have really paid so far is called g. Here, one plus two equals three.'],
      cues: [async F => { await F.s.G.edgeState('D', 'G', 'dim'); await F.s.G.edgeState('A', 'C', 'dim'); await F.s.G.edgeState('S', 'A', 'path'); await F.s.G.edgeState('A', 'B', 'path'); F.s.G.state('A', 'path'); F.s.G.state('B', 'current'); },
             async F => { await F.show(F.s.cg); await F.pulse(F.s.cg, 1); }] },
    { title: 'h: our guess', say: ['From B we still have to reach G. We do not know the cheapest way yet, so we use a guess called h.', 'Here the guess is three. It is a quick estimate, for example the straight line distance.'],
      cues: [async F => { await F.hide(F.s.cg); await F.pulse(F.s.G.nodes.B.g, 2); },
             async F => { await F.show(F.s.ch); await F.pulse(F.s.G.nodes.G.g, 2); }] },
    { title: 'f = g + h', say: ['Add the two numbers and you get f.', 'It is the total we hope for if we go through B. A star always opens the node with the smallest f.'],
      cues: [async F => { await F.hide(F.s.ch); await F.show(F.s.cf); await F.show(F.s.cB); },
             async F => { await F.pulse(F.s.cB, 2); }] }
  ]
};

/* ---- scene 2: the full trace with the priority queue ---- */
const FR = (list) => list.map(r => ({ id: r[0], cols: [r[0], String(r[1]), String(r[2]), String(r[1] + r[2])] }));
const sceneTrace = {
  id: 'trace', title: 'A star step by step', w: 900, h: 420, wide: true,
  build(F) {
    mkGraph(F); F.s.G.ring('S', false, 0);
    F.s.Q = K.queue(F, 625, 30, 250, 'FRONTIER · smallest f first', { maxRows: 5, cols: ['node', 'g', 'h', 'f'], colX: [48, 108, 158, 208], rh: 34 });
    F.s.ex = F.text(300, 392, '', { size: 13, cls: 'soft' });
    F.s.done = K.callout(F, 330, 392, 'Cost 7 along S, A, B, C, G. Node D was never opened.', { tone: 'ok', w: 420 });
  },
  steps: [
    { title: 'Start', say: ['We begin with S in the frontier.', 'Its g is zero and its h is six, so f is six.'],
      cues: [async F => { await F.s.G.state('S', 'open'); await F.s.Q.set(FR([['S', 0, 6]])); }, async F => { await F.pulse(F.s.G.nodes.S.g, 2); }] },
    { title: 'Open S', say: ['Open S: it is the only node, so we take it out.', 'Its neighbours A, B and D go into the frontier. A has f six, B and D have f seven.'],
      cues: [async F => { await F.s.G.state('S', 'closed'); await F.s.Q.set([]); },
             async F => { for (const n of ['A', 'B', 'D']) { F.s.G.flow('S', n); } await F.wait(500); await Promise.all(['A', 'B', 'D'].map(n => F.s.G.state(n, 'open'))); await F.s.Q.set(FR([['A', 1, 5], ['B', 4, 3], ['D', 2, 5]])); }] },
    { title: 'Open A', say: ['The smallest f is A with six, so A is next.', 'From A we reach B with g equal three. That is cheaper than the four we had, so B is updated, and its f drops to six.', 'C enters with f eight.'],
      cues: [async F => { await F.s.G.state('A', 'current'); await F.s.G.ring('A'); },
             async F => { F.s.G.flow('A', 'B'); await F.wait(500); await F.s.Q.set(FR([['B', 3, 3], ['D', 2, 5]])); },
             async F => { F.s.G.flow('A', 'C'); await F.wait(500); await F.s.G.state('C', 'open'); await F.s.G.state('A', 'closed'); await F.s.G.ring('A', false); await F.s.Q.set(FR([['B', 3, 3], ['D', 2, 5], ['C', 6, 2]])); }] },
    { title: 'Open B', say: ['Next is B, f six.', 'Through B the node C costs only four, so its f becomes six, and C jumps to the front.'],
      cues: [async F => { await F.s.G.state('B', 'current'); await F.s.G.ring('B'); },
             async F => { F.s.G.flow('B', 'C'); await F.wait(500); await F.s.G.state('B', 'closed'); await F.s.G.ring('B', false); await F.s.Q.set(FR([['C', 4, 2], ['D', 2, 5]])); }] },
    { title: 'Open C', say: ['C is next. From C the goal G costs three more.', 'G enters with g seven and f seven. D also has f seven, but G is the goal, so we prefer it.'],
      cues: [async F => { await F.s.G.state('C', 'current'); await F.s.G.ring('C'); },
             async F => { F.s.G.flow('C', 'G'); await F.wait(500); await F.s.G.state('C', 'closed'); await F.s.G.ring('C', false); await F.s.Q.set(FR([['G', 7, 0], ['D', 2, 5]])); }] },
    { title: 'Goal!', say: ['G is at the front. When the goal comes out of the frontier, we stop.', 'The path S, A, B, C, G costs seven, and it is the cheapest. A star never needed to open D.'],
      cues: [async F => { await F.s.G.state('G', 'current'); await F.s.G.ring('G'); await F.s.Q.set(FR([['G', 7, 0]])); },
             async F => { for (const [a, b] of [['S', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'G']]) F.s.G.edgeState(a, b, 'path'); for (const n of ['S', 'A', 'B', 'C', 'G']) F.s.G.state(n, 'path'); await F.wait(600); await F.show(F.s.done); }] }
  ]
};

/* ---- scene 3: two heuristics for the 8-puzzle ---- */
const START = [7, 2, 4, 5, 0, 6, 8, 3, 1], GOAL = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const posOf = (arr, v) => { const i = arr.indexOf(v); return [Math.floor(i / 3), i % 3]; };
function grid(F, ox, oy, arr, name) {
  const T = {}, s = 62;
  F.text(ox + s * 1.5, oy - 22, name, { size: 14, weight: 700 });
  F.rect(ox - 6, oy - 6, s * 3 + 12, s * 3 + 12, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)', 'stroke-width': 1.4 });
  arr.forEach((v, i) => { if (!v) return; const x = ox + (i % 3) * s + s / 2, y = oy + Math.floor(i / 3) * s + s / 2; T[v] = F.box(x, y, s - 6, s - 6, String(v), { size: 22, weight: 750, rx: 9 }); });
  return T;
}
const scenePuzzle = {
  id: 'puzzle', title: 'Two heuristics for the 8 puzzle', w: 900, h: 360, wide: true,
  build(F) {
    K.title(F, 'Slide the tiles to reach the goal', 'two cheap, honest guesses of the number of moves still needed');
    F.s.Ts = grid(F, 70, 100, START, 'now'); F.s.Tg = grid(F, 330, 100, GOAL, 'goal');
    F.s.cnt = F.text(660, 150, '', { size: 46, weight: 800, fill: 'var(--c-b)' });
    F.s.cap = F.text(660, 205, '', { size: 14, cls: 'soft' });
    F.s.dist = {};
    for (let v = 1; v <= 8; v++) { const [r, c] = posOf(START, v), [gr, gc] = posOf(GOAL, v); const d = Math.abs(r - gr) + Math.abs(c - gc); F.s.dist[v] = K.chip(F, 70 + c * 62 + 52, 100 + r * 62 + 9, String(d), 'warn'); F.s.dist[v].style.opacity = 0; F.s.dist[v].__d = d; }
  },
  steps: [
    { title: 'The puzzle', say: ['In the eight puzzle you slide one tile into the empty square. Every move costs one.', 'Our board is on the left, and the goal is on the right.'],
      cues: [async F => { await F.pulse(F.s.Ts[1], 1); }, async F => { await F.pulse(F.s.Tg[1], 2); }] },
    { title: 'h1: misplaced tiles', say: ['The first guess, h one, counts the tiles that are not at home.', 'Here no tile is at home, so h one is eight.'],
      cues: [async F => { for (let v = 1; v <= 8; v++) F.to(F.s.Ts[v].rect, { fill: 'var(--bad-bg)', stroke: 'var(--bad)' }, 400); },
             async F => { F.setText(F.s.cap, 'h1 = misplaced tiles', 660, 16); await F.count(F.s.cnt, 0, 8, 900); }] },
    { title: 'h2: Manhattan distance', say: ['The second guess, h two, is smarter. For each tile it counts how many squares it must travel, only up, down, left and right.', 'Add the little numbers: three, one, two, two, two, three, three and two, which makes eighteen.'],
      cues: [async F => { F.setText(F.s.cap, 'h2 = sum of distances to home', 660, 16); for (let v = 1; v <= 8; v++) { F.to(F.s.Ts[v].rect, { fill: 'var(--c-node)', stroke: 'var(--c-node-line)' }, 300); F.show(F.s.dist[v], 350); await F.wait(120); } },
             async F => { F.setText(F.s.cap, 'h2 = sum of distances to home', 660, 16); await F.count(F.s.cnt, 8, 18, 1100); }] },
    { title: 'Which is better?', say: ['Both guesses are honest: they never promise more moves than are really needed.', 'But h two is larger, so it is closer to the truth, and A star wastes less time with it. A bigger honest guess is a better guess.'],
      cues: [async F => { await F.pulse(F.s.cnt, 2); }, async F => { await F.pulse(F.s.cnt, 3); }] }
  ]
};

/* ---- exercises (random) ---- */
function shuffle9(r) { let a; do { a = [0, 1, 2, 3, 4, 5, 6, 7, 8]; for (let i = 8; i > 0; i--) { const j = r.int(0, i); [a[i], a[j]] = [a[j], a[i]]; } let inv = 0; for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) if (a[i] && a[j] && a[i] > a[j]) inv++; if (inv % 2 === 0) break; } while (true); return a; }
const exManhattan = {
  title: 'Count the Manhattan distance', random: true,
  gen(r) {
    const a = shuffle9(r); let h1 = 0, h2 = 0, parts = [];
    for (let v = 1; v <= 8; v++) { const [x, y] = posOf(a, v), [gx, gy] = posOf(GOAL, v), d = Math.abs(x - gx) + Math.abs(y - gy); h2 += d; parts.push(d); if (d) h1++; }
    return {
      prompt: 'This is a board of the 8 puzzle. The goal is the board on the right of the figure (empty square top left). What is <b>h2</b>, the sum of the Manhattan distances of tiles 1 to 8?',
      hint: 'For each tile, count rows apart plus columns apart between where it is and where it should be. Skip the empty square.',
      answer: `The distances for tiles 1 to 8 are ${parts.join(', ')}, so h2 = ${h2}. (For comparison, h1 = ${h1} tiles are misplaced; always h1 is at most h2.)`,
      check: { type: 'number', answer: h2, tol: 0.01 },
      figure: { w: 560, h: 230, draw(F) { grid(F, 70, 40, a, 'board'); grid(F, 330, 40, GOAL, 'goal'); } }
    };
  }
};
const exNext = {
  title: 'Which node does A star open next?', random: true,
  gen(r) {
    const names = ['A', 'B', 'C', 'D'].sort(() => r.next() - .5).slice(0, 4), rows = []; let fs;
    do { fs = names.map(() => ({ g: r.int(1, 9), h: r.int(0, 8) })); const f = fs.map(o => o.g + o.h); if (new Set(f).size === f.length) break; } while (true);
    const f = fs.map(o => o.g + o.h), best = f.indexOf(Math.min(...f));
    const tbl = '<table class="mini"><tr><th>node</th><th>g</th><th>h</th></tr>' + names.map((n, i) => `<tr><td>${n}</td><td>${fs[i].g}</td><td>${fs[i].h}</td></tr>`).join('') + '</table>';
    return { prompt: 'The frontier of an A star search holds these nodes:' + tbl + 'Type the name of the node that A star opens next.',
      hint: 'Compute f = g + h for every node. The smallest f wins.', answer: names.map((n, i) => `${n}: f = ${fs[i].g}+${fs[i].h} = ${f[i]}`).join('; ') + `. The smallest is f = ${f[best]}, so node <b>${names[best]}</b>.`, check: { type: 'text', answer: names[best] } };
  }
};
const exAdm = {
  title: 'Is the heuristic honest?', random: true,
  gen(r) {
    const names = ['A', 'B', 'C', 'D', 'E'], rows = names.map(n => { const t = r.int(2, 12); return { n, t, h: Math.max(0, t + r.int(-3, 3)) }; });
    const bad = rows.filter(o => o.h > o.t).length;
    const tbl = '<table class="mini"><tr><th>node</th><th>true cost to goal</th><th>h</th></tr>' + rows.map(o => `<tr><td>${o.n}</td><td>${o.t}</td><td>${o.h}</td></tr>`).join('') + '</table>';
    return { prompt: 'A heuristic is <b>admissible</b> if h(n) is never larger than the true remaining cost. In this table, for how many nodes is h <i>too optimistic in the wrong direction</i> (h larger than the true cost, so the node breaks admissibility)?' + tbl,
      hint: 'Compare h with the true cost in each row. Count the rows where h is bigger.',
      answer: rows.map(o => `${o.n}: h=${o.h} vs ${o.t} → ${o.h > o.t ? 'too big' : 'ok'}`).join('; ') + `. That is ${bad} node(s)${bad ? ', so this h is NOT admissible and A star may return a path that is not the cheapest' : ', so this h is admissible'}.`,
      check: { type: 'number', answer: bad, tol: 0.01 } };
  }
};

Course.lecture({
  id: 'w03', num: 3, week: 3, kind: 'lecture', title: 'Informed search: A*',
  lede: 'Uniform cost search is honest but blind. Greedy search is fast but easily fooled. A star adds what we paid to what we expect to pay, and gets both right.',
  clos: [1], widgets: ['astar'],
  goals: ['explain what <b>g</b>, <b>h</b> and <b>f = g + h</b> mean, and run A* by hand on a small graph',
    'tell an <b>admissible</b> heuristic from a dishonest one, and say why it keeps A* optimal',
    'compare heuristics such as misplaced tiles and Manhattan distance',
    'predict how A*, Dijkstra and greedy search behave in the playground'],
  chapters: [
    { id: 'idea', title: 'The idea: pay so far plus guess to go', blocks: [
      { html: '<p>Imagine a road trip. A friend says: "You already drove 120 km, and I think 80 km remain." The best total you can hope for is <b>200 km</b>. A* ranks every road by exactly this sum.</p>' },
      { scene: sceneGH },
      { quiz: { q: 'A node has g = 4 and h = 3. Another node has g = 1 and h = 7. Which does A* open first?', options: ['The first: f = 7', 'The second: f = 8', 'Both have the same f', 'The one with the smaller g'], correct: 0, why: 'f = g + h gives 7 for the first node and 8 for the second. The smallest f is opened first.' } }
    ] },
    { id: 'trace', title: 'Watch it run', blocks: [
      { html: '<p>Press <b>Narrate</b> or the arrows. The panel on the right is the <b>frontier</b> (the nodes we know about but have not opened). It is sorted by f, and the top row is opened next.</p>' },
      { scene: sceneTrace },
      { note: '<b>Two details to remember.</b> (1) If we find a cheaper way to a node already in the frontier, we <i>update</i> it. (2) We stop when the goal <i>comes out</i> of the frontier, not when it first goes in.' },
      { exercise: exNext }
    ] },
    { id: 'honest', title: 'When can we trust it? Admissible heuristics', blocks: [
      { html: '<p>A* returns the cheapest path <b>if h never overestimates</b> the true remaining cost. Such an h is called <b>admissible</b>. If h lies upward, A* may skip the real best road because it looks too expensive.</p><p><b>Consistent</b> is a slightly stronger rule: h(n) is at most the step cost to a neighbour plus h(neighbour). It guarantees that a node is never reopened.</p>' },
      { exercise: exAdm },
      { quiz: { q: 'What happens if h(n) = 0 for every node?', options: ['A* becomes uniform cost search (Dijkstra)', 'A* fails', 'A* becomes greedy search', 'A* becomes depth first search'], correct: 0, why: 'With h = 0 we have f = g, so the cheapest paid-so-far node is opened first. That is exactly uniform cost search. It is admissible, but it is the weakest honest guess.' } }
    ] },
    { id: 'puzzle', title: 'Designing a heuristic', blocks: [
      { html: '<p>A good heuristic comes from a <b>relaxed problem</b>: remove a rule and solve the easier version. Let tiles jump anywhere: the cost is the number of misplaced tiles (h1). Let tiles slide through each other: the cost is the Manhattan distance (h2).</p>' },
      { scene: scenePuzzle },
      { exercise: exManhattan }
    ] },
    { id: 'play', title: 'Play with it', blocks: [
      { html: '<p>Draw walls, move the start and the goal, and switch the algorithm and the heuristic. Watch which cells are opened, and what happens to the path when you multiply h by a weight larger than one.</p>' },
      { widget: 'astar' },
      { note: '<b>Try this.</b> (1) Compare A* with Dijkstra on the same map: count the opened cells. (2) Set the weight to 3: the search is faster, but the path may no longer be the shortest. (3) Choose the Manhattan heuristic with 8 moves and see why it stops being honest.' }
    ] }
  ]
});
})();

(function () {
const K = Course.kit;

/* run cue parts in order; during an instant replay run them all at once (keeps replays consistent) */
const seq = (...ops) => F => { if (F.instant) { ops.forEach(o => o(F)); return; } return (async () => { for (const o of ops) await o(F); })(); };

/* ================= scene 1: AI history in one picture ================= */
const yr = y => 60 + (y - 1940) * 800 / 85, AX = 280;
const HYPE = [[1940, 10], [1950, 30], [1956, 75], [1962, 130], [1966, 150], [1970, 135], [1974, 65], [1980, 55], [1984, 140], [1987, 135], [1990, 55], [1995, 60], [2000, 72], [2005, 82], [2010, 100], [2012, 128], [2014, 150], [2016, 170], [2019, 185], [2022, 200], [2025, 212]];
const segPath = (a, b) => HYPE.filter(p => p[0] >= a && p[0] <= b).map((p, i) => (i ? 'L' : 'M') + yr(p[0]).toFixed(1) + ',' + (AX - p[1])).join(' ');
const EVENTS = [
  [1943, 'first neuron model', 'B', 1], [1950, 'Turing test', 'A', 1], [1956, 'the name "AI"', 'B', 1],
  [1980, 'expert systems', 'A', 2],
  [1997, 'Deep Blue wins at chess', 'B', 3], [2012, 'deep learning', 'A', 3],
  [2017, 'transformer', 'B', 4], [2022, 'ChatGPT', 'A', 4]
];
const sceneHistory = {
  id: 'history', title: 'AI history in one picture', w: 900, h: 390, wide: true,
  build(F) {
    K.title(F, 'Seventy years of AI', 'the line shows how much excitement (and money) AI had at each time');
    F.line(50, AX, 870, AX, { stroke: 'var(--c-soft)', 'stroke-width': 1.6 });
    for (let y = 1940; y <= 2020; y += 10) { F.line(yr(y), AX - 4, yr(y), AX + 4, { stroke: 'var(--c-soft)' }); F.text(yr(y), AX - 12, String(y), { size: 10.5, cls: 'soft mono' }); }
    F.s.win = [[1974, 1980], [1987, 1993]].map(([a, b]) => { const g = F.g({}); F.rect(yr(a), 70, yr(b) - yr(a), AX - 70, { fill: 'var(--accent2-bg)', rx: 6 }, g); F.text((yr(a) + yr(b)) / 2, 86, 'AI winter', { size: 11.5, weight: 700, fill: 'var(--accent2)' }, g); g.style.opacity = 0; return g; });
    F.s.seg = [[1940, 1970], [1970, 1995], [1995, 2016], [2016, 2025]].map(([a, b]) => { const p = F.path(segPath(a, b), { stroke: 'var(--c-a)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); p.style.opacity = 0; return p; });
    F.s.ev = EVENTS.map(([y, txt, row]) => {
      const g = F.g({}), x = yr(y), ly = row === 'B' ? 352 : row === 'A2' ? 330 : 312;
      F.line(x, AX, x, ly - 16, { stroke: 'var(--c-node-line)', 'stroke-dasharray': '3 3' }, g);
      F.circle(x, AX, 5.5, { fill: 'var(--c-c)', stroke: 'var(--fig-bg)', 'stroke-width': 2 }, g);
      F.text(x, ly, y + '\n' + txt, { size: 11.5, weight: 650, lh: 14 }, g);
      g.style.opacity = 0; return g;
    });
    F.s.now = K.callout(F, 640, 110, 'foundation models\nand AI agents', { tone: 'ok', w: 170 });
  },
  steps: [
    { title: 'The beginning', say: ['In 1943 two scientists described the first mathematical model of a neuron.', 'In 1950 Alan Turing asked if machines can think, and in 1956 a summer workshop gave the field its name: artificial intelligence.'],
      cues: [seq(F => F.draw(F.s.seg[0], 900), F => F.show(F.s.ev[0])), seq(F => F.show(F.s.ev[1]), F => F.show(F.s.ev[2]))] },
    { title: 'Booms and winters', say: ['Early programs looked clever, but they failed on real problems, and funding stopped. People call these times A I winters.', 'In the 1980s, expert systems built from hand written rules started a second boom, and then a second winter.'],
      cues: [seq(F => F.draw(F.s.seg[1], 1000), F => F.show(F.s.win[0])), seq(F => F.show(F.s.ev[3]), F => F.show(F.s.win[1]))] },
    { title: 'Learning from data', say: ['In 1997 the computer Deep Blue beat the world chess champion, using search, which we study next week.', 'In 2012 deep neural networks learned to recognise images from millions of examples, and AI started to grow fast.'],
      cues: [seq(F => F.draw(F.s.seg[2], 1000), F => F.show(F.s.ev[4])), seq(F => F.show(F.s.ev[5]))] },
    { title: 'Today', say: ['In 2017 the transformer appeared, and in 2022 ChatGPT brought large language models to everyone.', 'Today these foundation models are becoming agents that plan and act. The big lesson: rules alone were not enough, learning from data changed everything.'],
      cues: [seq(F => F.draw(F.s.seg[3], 800), F => F.show(F.s.ev[6]), F => F.show(F.s.ev[7])), seq(F => F.show(F.s.now), F => F.pulse(F.s.now, 2))] }
  ]
};

/* ================= scene 2: the agent and environment loop ================= */
const sceneLoop = {
  id: 'loop', title: 'The agent and its environment', w: 720, h: 400,
  build(F) {
    K.title(F, 'Perceive, decide, act, repeat', 'every AI system in this course fits this loop');
    const env = F.g({}); env.style.opacity = 0;
    F.rect(30, 90, 250, 250, { rx: 18, fill: 'var(--ok-bg)', stroke: 'var(--ok)', 'stroke-width': 1.8 }, env);
    F.text(155, 112, 'ENVIRONMENT', { size: 13, weight: 800, fill: 'var(--ok)' }, env);
    F.circle(225, 160, 18, { fill: 'var(--c-path)', stroke: 'var(--c-c)', 'stroke-width': 2 }, env);
    F.line(50, 285, 260, 285, { stroke: 'var(--c-node-line)', 'stroke-width': 2 }, env);
    F.rect(70, 240, 70, 30, { rx: 8, fill: 'var(--c-b)' }, env); F.circle(87, 272, 9, { fill: 'var(--c-ink)' }, env); F.circle(123, 272, 9, { fill: 'var(--c-ink)' }, env);
    F.rect(180, 215, 26, 70, { fill: 'var(--c-node)', stroke: 'var(--c-node-line)' }, env); F.circle(193, 207, 14, { fill: 'var(--c-a)' }, env);
    F.text(155, 318, 'the world: roads, people, rooms, a web page…', { size: 11, cls: 'soft' }, env);
    const ag = F.g({}); ag.style.opacity = 0;
    F.rect(440, 90, 250, 250, { rx: 18, fill: 'var(--accent2-bg)', stroke: 'var(--accent2)', 'stroke-width': 1.8 }, ag);
    F.text(565, 112, 'AGENT', { size: 13, weight: 800, fill: 'var(--accent2)' }, ag);
    F.s.sens = F.box(480, 150, 96, 34, 'sensors', { size: 12.5, weight: 700 }, ag);
    F.s.act = F.box(480, 290, 96, 34, 'actuators', { size: 12.5, weight: 700 }, ag);
    F.s.fn = F.box(605, 220, 120, 64, 'agent\nfunction ?', { size: 13, weight: 750, fill: 'var(--card)', stroke: 'var(--accent2)' }, ag);
    F.arrow(530, 160, 548, 196, { color: 'var(--accent2)' }, ag); F.arrow(548, 245, 530, 280, { color: 'var(--accent2)' }, ag);
    F.s.env = env; F.s.ag = ag;
    F.s.pIn = F.path('M282,145 C330,80 390,80 432,145', { stroke: 'var(--c-b)', 'stroke-width': 3, 'marker-end': F.arrowMarker('var(--c-b)') }); F.s.pIn.style.opacity = 0;
    F.s.pOut = F.path('M432,290 C390,355 330,355 282,290', { stroke: 'var(--c-c)', 'stroke-width': 3, 'marker-end': F.arrowMarker('var(--c-c)') }); F.s.pOut.style.opacity = 0;
    F.s.lIn = F.text(357, 72, 'percepts', { size: 14, weight: 750, fill: 'var(--c-b)' }); F.s.lIn.style.opacity = 0;
    F.s.lOut = F.text(357, 370, 'actions', { size: 14, weight: 750, fill: 'var(--c-c)' }); F.s.lOut.style.opacity = 0;
    const dot = (txt, col) => { const g = F.g({ transform: 'translate(282,145)' }); g.__t = { x: 282, y: 145, s: 1, r: 0 }; F.circle(0, 0, 9, { fill: col, stroke: 'var(--fig-bg)', 'stroke-width': 2.5, filter: 'url(#fx-glow)' }, g); K.chip(F, 0, -24, txt, col === 'var(--c-b)' ? 'accent' : 'warn', g); g.style.opacity = 0; return g; };
    F.s.d1 = dot('camera image', 'var(--c-b)'); F.s.d2 = dot('turn left', 'var(--c-c)');
    F.s.d3 = dot('new percept', 'var(--c-b)'); F.s.d4 = dot('new action', 'var(--c-c)');
    F.s.key = K.callout(F, 360, 222, 'AI = designing\nthe agent function', { tone: 'accent', w: 150 });
  },
  steps: [
    { title: 'Two parts', say: ['An agent is anything that perceives its environment and acts on it.', 'It sees through sensors, like a camera or a keyboard, and it acts through actuators, like wheels, a screen or a voice.'],
      cues: [seq(F => F.show(F.s.env), F => F.show(F.s.ag)), seq(F => F.pulse(F.s.sens, 1), F => F.pulse(F.s.act, 1))] },
    { title: 'Percepts come in', say: ['What the agent senses at one moment is called a percept.', 'Here a camera image travels from the world into the sensors.'],
      cues: [seq(F => F.draw(F.s.pIn, 700), F => F.show(F.s.lIn)), seq(F => F.show(F.s.d1, 150), F => F.along(F.s.d1, F.s.pIn, 1300), F => F.hide(F.s.d1))] },
    { title: 'The agent decides', say: ['Inside, the agent function maps everything it has perceived so far to one action.', 'A program that computes this function is called the agent program.'],
      cues: [seq(F => F.to(F.s.fn.rect, { fill: 'var(--c-cur)' }, 400), F => F.pulse(F.s.fn, 2)), seq(F => F.to(F.s.fn.rect, { fill: 'var(--card)' }, 400))] },
    { title: 'Actions go out, and repeat', say: ['The chosen action goes back into the world through the actuators, and it changes the world.', 'Then the loop starts again. Building a good agent function is what artificial intelligence is about.'],
      cues: [seq(F => F.draw(F.s.pOut, 700), F => F.show(F.s.lOut), F => F.show(F.s.d2, 150), F => F.along(F.s.d2, F.s.pOut, 1300), F => F.hide(F.s.d2)),
             seq(F => F.show(F.s.d3, 100), F => F.along(F.s.d3, F.s.pIn, 900), F => F.hide(F.s.d3, 100), F => F.pulse(F.s.fn, 1), F => F.show(F.s.d4, 100), F => F.along(F.s.d4, F.s.pOut, 900), F => F.hide(F.s.d4, 100), F => F.show(F.s.key))] }
  ]
};

/* ================= scene 3: the vacuum world ================= */
/* states after each action of the reflex agent; score = clean squares counted after every action */
const VAC = [
  { at: 'A', dA: true, dB: true, score: 0, rule: -1, pa: 'percept [A, Dirty]', act: '' },
  { at: 'A', dA: false, dB: true, score: 1, rule: 0, pa: '[A, Dirty] → Suck', act: 'Suck' },
  { at: 'B', dA: false, dB: true, score: 2, rule: 1, pa: '[A, Clean] → Right', act: 'Right' },
  { at: 'B', dA: false, dB: false, score: 4, rule: 2, pa: '[B, Dirty] → Suck', act: 'Suck' },
  { at: 'A', dA: false, dB: false, score: 6, rule: 3, pa: '[B, Clean] → Left', act: 'Left' }
];
const RULES = ['[A, Dirty] → Suck', '[A, Clean] → Right', '[B, Dirty] → Suck', '[B, Clean] → Left'];
function drawRoom(F, x0, y0, sc) {     // two squares, dirt and robot; returns parts
  const P = {}, w = 200 * sc, h = 150 * sc;
  ['A', 'B'].forEach((n, i) => {
    const x = x0 + i * (w + 20 * sc);
    F.rect(x, y0, w, h, { rx: 14 * sc, fill: 'var(--card)', stroke: 'var(--line)', 'stroke-width': 2 });
    F.text(x + w / 2, y0 + h + 18 * sc, 'square ' + n, { size: 13 * Math.max(sc, .85), weight: 700, cls: 'soft' });
    const d = F.g({}); [[-50, 30], [-30, 48], [40, 38], [58, 22], [-62, 50], [20, 52]].forEach(([dx, dy], k) => F.circle(x + w / 2 + dx * sc, y0 + h / 2 + dy * sc, (5 + (k % 3) * 2) * sc, { fill: 'var(--c-c)', opacity: .8 }, d));
    P['d' + n] = d; P['x' + n] = x + w / 2;
  });
  const r = F.g({ transform: `translate(${P.xA},${y0 + h / 2 - 8 * sc})` }); r.__t = { x: P.xA, y: y0 + h / 2 - 8 * sc, s: 1, r: 0 };
  F.circle(0, 0, 34 * sc, { fill: 'var(--c-b)', stroke: 'var(--fig-bg)', 'stroke-width': 3, filter: 'url(#fx-soft)' }, r);
  F.circle(0, 0, 22 * sc, { fill: 'none', stroke: 'var(--fig-bg)', 'stroke-width': 2, opacity: .6 }, r);
  F.circle(-9 * sc, -10 * sc, 4.5 * sc, { fill: 'var(--fig-bg)' }, r); F.circle(9 * sc, -10 * sc, 4.5 * sc, { fill: 'var(--fig-bg)' }, r);
  F.rect(-20 * sc, 26 * sc, 40 * sc, 8 * sc, { rx: 4 * sc, fill: 'var(--c-ink)' }, r);
  P.robot = r; P.y = y0 + h / 2 - 8 * sc;
  return P;
}
const sceneVacuum = {
  id: 'vacuum', title: 'The vacuum world', w: 720, h: 400,
  build(F) {
    K.title(F, 'A tiny world with two squares', 'the robot senses only its own square: where it is, and whether it is dirty');
    F.s.P = drawRoom(F, 40, 120, 1);
    F.s.paG = F.g({ transform: 'translate(250,86)' }); F.s.paG.__t = { x: 250, y: 86, s: 1, r: 0 }; F.s.pa = F.text(0, 0, VAC[0].pa, { size: 16, weight: 750, cls: 'mono' }, F.s.paG);
    F.s.scG = F.g({ transform: 'translate(250,335)' }); F.s.scG.__t = { x: 250, y: 335, s: 1, r: 0 }; F.s.sc = F.text(0, 0, 'score 0', { size: 18, weight: 800, fill: 'var(--ok)' }, F.s.scG);
    F.text(250, 360, '+1 for every clean square after every action', { size: 11.5, cls: 'soft' });
    F.text(600, 100, 'agent function (table)', { size: 12.5, weight: 700, cls: 'soft' });
    F.s.rr = RULES.map((t, i) => { const b = F.box(600, 140 + i * 44, 200, 34, t, { size: 13, mono: true, weight: 650, fill: 'var(--card)' }); return b; });
    F.s.lesson = K.callout(F, 600, 345, 'reflex rule:\npercept → action', { tone: 'ok', w: 170 });
  },
  steps: [0, 1, 2, 3, 4].map(k => ({
    title: ['Meet the robot', 'Dirty here: suck', 'Clean here: move right', 'Dirty again: suck', 'Clean: move left'][k],
    say: [
      ['The robot lives in a world of two squares, A and B. Both are dirty.', 'Its percept is a pair: which square it is on, and whether that square is dirty.'],
      ['The percept is A, dirty. The table says: suck.', 'Now square A is clean, so the robot earns one point.'],
      ['The percept is A, clean. The table says: move right.', 'One square is clean, so one more point. The score is two.'],
      ['On B the percept is B, dirty, so the robot sucks again.', 'Now both squares are clean, and every action earns two points. The score is four.'],
      ['B is clean, so the robot moves left, and the score is six.', 'This simple agent is rational here: it does the action that is expected to give the best score.']
    ][k],
    cues: [F => vac(F, k), F => seq(F => F.pulse(k ? F.s.scG : F.s.paG, 1), F => k === 4 ? F.show(F.s.lesson) : null)(F)]
  }))
};
function vac(F, k) {
  const s = VAC[k], P = F.s.P, ms = 700;
  F.setText(F.s.pa, s.pa, 0, 18); F.setText(F.s.sc, 'score ' + s.score, 0, 20);
  F.s.rr.forEach((b, i) => F.to(b.rect, { fill: i === s.rule ? 'var(--c-cur)' : 'var(--card)', stroke: i === s.rule ? 'var(--c-c)' : 'var(--c-node-line)' }, 300));
  F.to(P.dA, { opacity: s.dA ? 1 : 0 }, 500); F.to(P.dB, { opacity: s.dB ? 1 : 0 }, 500);
  return F.to(P.robot, { tx: s.at === 'A' ? P.xA : P.xB }, ms, 'io');
}

/* ================= scene 4: five kinds of agents ================= */
const TYPES = [
  { name: 'Simple reflex', add: ['if-then rules'], keep: [], ex: 'thermostat:\nbelow 20 degrees,\nheat on' },
  { name: 'Model-based', add: ['memory of the world'], keep: ['if-then rules'], ex: 'car remembers a car\nnow hidden in its\nblind spot' },
  { name: 'Goal-based', add: ['goal', 'look ahead:\nwhat if I do this?'], keep: ['memory of the world'], ex: 'GPS finds roads\nthat reach the\naddress you typed' },
  { name: 'Utility-based', add: ['utility: how good\nis each outcome?'], keep: ['memory of the world', 'look ahead:\nwhat if I do this?'], ex: 'ride app trades\ntime, fuel cost\nand comfort' },
  { name: 'Learning', add: ['critic: how well\nam I doing?', 'learning:\nimprove myself'], keep: ['any agent on the left'], ex: 'spam filter that\nimproves from\nyour clicks' }
];
const sceneTypes = {
  id: 'types', title: 'Five kinds of agents', w: 900, h: 430, wide: true,
  build(F) {
    K.title(F, 'From simple to smart', 'each agent keeps what the previous one had (grey) and adds something new (coloured)');
    F.s.cards = TYPES.map((t, i) => {
      const x = 18 + i * 176, g = F.g({ transform: `translate(${x},${70 + 24})` }); g.__t = { x, y: 94, s: 1, r: 0 }; g.style.opacity = 0;
      const frame = F.rect(0, 0, 166, 330, { rx: 14, fill: 'var(--card)', stroke: 'var(--line)', 'stroke-width': 1.6, filter: 'url(#fx-soft)' }, g);
      F.text(83, 20, (i + 1) + '. ' + t.name, { size: 13.5, weight: 800 }, g);
      let y = 46; const bx = (label, kind) => { const lines = label.split('\n').length, hh = 14 + lines * 14; const b = F.box(83, y + hh / 2, 146, hh, label, { size: 11.5, weight: kind === 'new' ? 750 : 600, fill: kind === 'new' ? 'var(--c-open)' : kind === 'io' ? 'var(--fig-bg)' : 'var(--c-node)', stroke: kind === 'new' ? 'var(--c-b)' : 'var(--c-soft)', shadow: false }, g); y += hh + 7; return b; };
      bx('percept', 'io'); t.keep.forEach(k => bx(k, 'old')); t.add.forEach(k => bx(k, 'new')); bx('action', 'io');
      F.line(20, 252, 146, 252, { stroke: 'var(--line)' }, g);
      F.text(83, 292, t.ex, { size: 11.5, cls: 'soft', lh: 15 }, g);
      g.frame = frame; return g;
    });
  },
  steps: TYPES.map((t, i) => ({
    title: t.name,
    say: [
      ['The simplest agent is a simple reflex agent. It looks only at the current percept and fires an if then rule.', 'A thermostat is a good example. It works only when the right action is visible in the current percept.'],
      ['A model based agent also keeps a memory, a model of the parts of the world it cannot see right now.', 'A self driving car remembers the car that just disappeared into its blind spot.'],
      ['A goal based agent knows what it wants to reach, and it looks ahead: what happens if I do this action?', 'Finding such action sequences is called search. It is our topic for the next two weeks.'],
      ['Many routes reach the goal, but some are better. A utility based agent gives every outcome a score of how good it is.', 'It picks the action with the best expected score, for example trading travel time against fuel cost.'],
      ['Finally, any of these agents can become a learning agent. A critic tells it how well it is doing, and it improves itself.', 'Most modern AI is built this way: the agent is not fully programmed, it learns from data and feedback.']
    ][i],
    cues: [F => seq(...TYPES.map((_, j) => F2 => j <= i ? Promise.all([F2.to(F2.s.cards[j], { opacity: j === i ? 1 : .55, ty: 70 }, 500, 'out'), F2.to(F2.s.cards[j].frame, { stroke: j === i ? 'var(--c-b)' : 'var(--line)', 'stroke-width': j === i ? 3 : 1.6 }, 300)]) : null))(F),
           F => F.pulse(F.s.cards[i], 1)]
  }))
};

/* ================= exercises ================= */
const PEAS = [
  { a: 'an automated taxi', P: ['safe trip', 'fast trip', 'obeys the law', 'profit'], E: ['roads', 'other traffic', 'pedestrians', 'customers'], A: ['steering wheel', 'brake', 'horn', 'accelerator'], S: ['cameras', 'GPS', 'speedometer', 'engine sensors'] },
  { a: 'a medical diagnosis system', P: ['healthy patient', 'reduced costs'], E: ['patient', 'hospital', 'staff'], A: ['display of questions and tests', 'display of diagnoses', 'display of treatments'], S: ['touchscreen entry of symptoms', 'voice entry of findings'] },
  { a: 'a part-picking robot', P: ['percentage of parts in the correct bins'], E: ['conveyor belt with parts', 'bins'], A: ['jointed arm', 'robot hand'], S: ['camera', 'touch sensors', 'joint angle sensors'] },
  { a: 'an English tutoring app', P: ["student's test score"], E: ['set of students', 'testing agency'], A: ['display of exercises', 'feedback', 'speech'], S: ['keyboard entry', 'voice input'] },
  { a: 'a robot vacuum cleaner', P: ['clean floor', 'low battery use'], E: ['rooms', 'furniture', 'dirt'], A: ['wheels', 'brushes', 'suction motor'], S: ['bump sensor', 'dirt sensor', 'cliff sensor'] }
];
const PEAS_NAME = { P: 'Performance measure', E: 'Environment', A: 'Actuators', S: 'Sensors' };
const exPEAS = {
  title: 'PEAS: where does it belong?', random: true,
  gen(r) {
    const ag = r.pick(PEAS), L = r.pick(['P', 'E', 'A', 'S']), item = r.pick(ag[L]);
    const tbl = '<table class="mini"><tr><th>letter</th><th>meaning</th><th>full list for ' + ag.a + '</th></tr>' + ['P', 'E', 'A', 'S'].map(k => `<tr><td>${k}</td><td>${PEAS_NAME[k]}</td><td style="text-align:left">${ag[k].join(', ')}</td></tr>`).join('') + '</table>';
    return {
      prompt: `We design ${ag.a}. In its PEAS description, where does <b>“${item}”</b> belong? Type one letter: <b>P</b> (performance measure), <b>E</b> (environment), <b>A</b> (actuators) or <b>S</b> (sensors).`,
      hint: 'Ask: is it how we judge success (P)? the world around the agent (E)? something the agent uses to act (A)? something it uses to sense (S)?',
      answer: `<b>${L}</b>: “${item}” is part of the <b>${PEAS_NAME[L].toLowerCase()}</b>.` + tbl,
      check: { type: 'text', answer: L }
    };
  }
};
const ENV = [   // AIMA 4th ed., Fig. 2.6 (semi values are never asked)
  { t: 'crossword puzzle', v: ['F', 'S', 'D', 'Q', 'St', 'Di'] }, { t: 'chess with a clock', v: ['F', 'M', 'D', 'Q', 'semi', 'Di'] },
  { t: 'poker', v: ['P', 'M', 'N', 'Q', 'St', 'Di'] }, { t: 'backgammon', v: ['F', 'M', 'N', 'Q', 'St', 'Di'] },
  { t: 'taxi driving', v: ['P', 'M', 'N', 'Q', 'Dy', 'C'] }, { t: 'medical diagnosis', v: ['P', 'S', 'N', 'Q', 'Dy', 'C'] },
  { t: 'image analysis', v: ['F', 'S', 'D', 'E', 'semi', 'C'] }, { t: 'part-picking robot', v: ['P', 'S', 'N', 'E', 'Dy', 'C'] },
  { t: 'refinery controller', v: ['P', 'S', 'N', 'Q', 'Dy', 'C'] }, { t: 'English tutor', v: ['P', 'M', 'N', 'Q', 'Dy', 'Di'] }
];
const DIMS = [
  { q: 'Can the agent see the complete state of the world at each moment?', o: { F: 'fully observable', P: 'partially observable' } },
  { q: 'How many agents act in this environment?', o: { S: 'single agent', M: 'multi-agent' } },
  { q: 'Is the next state completely fixed by the current state and the action?', o: { D: 'deterministic', N: 'stochastic (random outcomes)' } },
  { q: 'Does the current decision affect future decisions?', o: { E: 'episodic (each decision stands alone)', Q: 'sequential (decisions affect the future)' } },
  { q: 'Can the world change while the agent is thinking?', o: { St: 'static', Dy: 'dynamic' } },
  { q: 'Are states, time and actions countable steps or smooth quantities?', o: { Di: 'discrete', C: 'continuous' } }
];
const exEnv = {
  title: 'Classify the environment', random: true,
  gen(r) {
    let e, d; do { e = r.pick(ENV); d = r.int(0, 5); } while (e.v[d] === 'semi');
    const keys = r.shuffle(Object.keys(DIMS[d].o)), right = e.v[d], letter = keys[0] === right ? 'A' : 'B';
    return {
      prompt: `Task environment: <b>${e.t}</b>. ${DIMS[d].q}<br>Type <b>A</b> for <i>${DIMS[d].o[keys[0]]}</i> or <b>B</b> for <i>${DIMS[d].o[keys[1]]}</i>.`,
      hint: 'Imagine the agent doing this job. What does it see? Who else acts? Can the same action give different results? Does the world wait?',
      answer: `<b>${letter}</b>: ${e.t} is <b>${DIMS[d].o[right]}</b> (Russell and Norvig, Figure 2.6).`,
      check: { type: 'text', answer: letter }
    };
  }
};
const TYPE_EX = [
  ['A', 'A thermostat turns the heater on when the room is below 20 degrees and off otherwise.'], ['A', 'An automatic door opens whenever its sensor sees a person in front of it.'],
  ['B', 'A car keeps track of a car it saw a few seconds ago, which is now hidden in its blind spot, before it changes lanes.'], ['B', 'A cleaning robot remembers which rooms it has already cleaned, even though it cannot see them now.'],
  ['C', 'A navigation app searches for any sequence of roads that reaches the address you typed.'], ['C', 'A puzzle solver looks ahead for a sequence of moves that ends in the solved position.'],
  ['D', 'A ride app compares routes by combining travel time, fuel cost and passenger comfort into one score, and picks the best.'], ['D', 'A trading program picks the investment with the best balance of expected profit and risk.'],
  ['E', 'A spam filter changes its behaviour every time a user marks a message as spam or not spam.'], ['E', 'A game program improves by playing millions of games against itself and adjusting from its wins and losses.']
];
const TYPE_NAMES = { A: 'simple reflex', B: 'model-based', C: 'goal-based', D: 'utility-based', E: 'learning' };
const exType = {
  title: 'Which kind of agent is it?', random: true,
  gen(r) {
    const [L, s] = r.pick(TYPE_EX);
    return {
      prompt: `${s}<br>Which kind of agent is this, mainly? Type one letter: <b>A</b> simple reflex, <b>B</b> model-based, <b>C</b> goal-based, <b>D</b> utility-based, <b>E</b> learning.`,
      hint: 'Only the current percept: reflex. Remembers what it cannot see: model. Has a target to reach: goal. Scores how good outcomes are: utility. Changes itself from feedback: learning.',
      answer: `<b>${L}</b>, a <b>${TYPE_NAMES[L]}</b> agent. ` + { A: 'It reacts to the current percept with a fixed rule.', B: 'It keeps an internal model of the part of the world it cannot see right now.', C: 'It has a goal and looks for actions that reach it.', D: 'It compares outcomes with a score (utility) and picks the best one.', E: 'It improves its own behaviour from feedback.' }[L],
      check: { type: 'text', answer: L }
    };
  }
};
/* reflex vacuum agent: score after every action = number of clean squares */
const exVac = {
  title: 'Score of the vacuum robot', random: true,
  gen(r) {
    const at0 = r.pick(['A', 'B']), dA0 = r.chance(.6), dB0 = r.chance(.6) || !dA0, N = r.int(3, 7);
    let at = at0, d = { A: dA0, B: dB0 }, score = 0; const log = [];
    for (let t = 1; t <= N; t++) {
      const p = `[${at}, ${d[at] ? 'Dirty' : 'Clean'}]`; let a;
      if (d[at]) { a = 'Suck'; d[at] = false; } else { a = at === 'A' ? 'Right' : 'Left'; at = at === 'A' ? 'B' : 'A'; }
      const pts = (d.A ? 0 : 1) + (d.B ? 0 : 1); score += pts; log.push(`step ${t}: ${p} → ${a}, +${pts} (total ${score})`);
    }
    return {
      prompt: `The reflex vacuum robot of the lecture starts on square <b>${at0}</b>. Square A is <b>${dA0 ? 'dirty' : 'clean'}</b> and square B is <b>${dB0 ? 'dirty' : 'clean'}</b>. No new dirt appears. After every action it earns one point for every clean square. What is its score after <b>${N}</b> actions?`,
      hint: 'Rules: if the square is dirty, Suck; if clean, move to the other square. Count the clean squares after each action and add them up.',
      answer: log.join('<br>') + `<br>Score after ${N} actions: <b>${score}</b>.`,
      check: { type: 'number', answer: score, tol: 0.01 },
      figure: { w: 480, h: 200, draw(F) { const P = drawRoom(F, 30, 20, .9); F.set(P.dA, { opacity: dA0 ? 1 : 0 }); F.set(P.dB, { opacity: dB0 ? 1 : 0 }); F.set(P.robot, { tx: at0 === 'A' ? P.xA : P.xB }); } }
    };
  }
};

Course.lecture({
  id: 'w01', num: 1, week: 1, kind: 'lecture', title: 'Introduction to AI and intelligent agents',
  lede: 'What is artificial intelligence, where did it come from, and what is an agent? This week builds the one picture that holds the whole course together: an agent that perceives, decides and acts.',
  clos: [1], widgets: [],
  goals: ['explain what AI is, and why this course follows the <b>rational agent</b> view',
    'tell the story of AI in a few milestones: booms, winters and the rise of learning',
    'describe the <b>agent and environment loop</b>: percepts, agent function, actions',
    'write a <b>PEAS</b> description and classify a task environment along six dimensions',
    'tell the five kinds of agents apart: simple reflex, model-based, goal-based, utility-based and learning',
    'see where today\'s foundation models and AI agents fit into this picture'],
  chapters: [
    { id: 'what', title: 'What is AI?', blocks: [
      { html: '<p>People define AI in four ways. Do we want machines that <b>think</b> or that <b>act</b>? Do we measure them against <b>humans</b> or against an ideal of <b>rationality</b> (doing the right thing)?</p><table class="mini"><tr><th></th><th>like a human</th><th>rationally</th></tr><tr><th>thinking</th><td>cognitive modelling</td><td>laws of thought (logic)</td></tr><tr><th>acting</th><td>the Turing test</td><td><b>rational agents</b> ← this course</td></tr></table><p>We follow the bottom right corner: an AI system is an <b>agent</b> that acts to achieve the best expected outcome.</p>' },
      { scene: sceneHistory },
      { quiz: { q: 'Which view of AI does this course (and the Russell and Norvig book) follow?', options: ['Machines that think exactly like humans', 'Machines that pass the Turing test', 'Rational agents: act to get the best expected outcome', 'Programs that follow the laws of logic only'], correct: 2, why: 'The rational agent view is general (it includes logic, learning and decision making) and it can be measured: did the agent get the best expected outcome?' } }
    ] },
    { id: 'agents', title: 'Agents and environments', blocks: [
      { html: '<p>An <b>agent</b> perceives its <b>environment</b> through <b>sensors</b> and acts on it through <b>actuators</b>. Its <b>percept sequence</b> is everything it has ever perceived. The <b>agent function</b> maps a percept sequence to an action; the <b>agent program</b> is the code that computes it.</p>' },
      { scene: sceneLoop },
      { note: '<b>Examples.</b> A robot: cameras in, motors out. A chess program: board positions in, moves out. A chatbot: your messages in, text out. An AI agent with tools: messages and tool results in, tool calls and answers out.' }
    ] },
    { id: 'vacuum', title: 'A first agent: the vacuum robot', blocks: [
      { html: '<p>The vacuum world is the "hello world" of agents. It is tiny, so we can write the whole agent function as a table and measure how well it does.</p>' },
      { scene: sceneVacuum },
      { exercise: exVac }
    ] },
    { id: 'rational', title: 'Rationality and PEAS', blocks: [
      { html: '<p>A <b>rational agent</b> chooses, for every percept sequence, the action that is expected to maximise its <b>performance measure</b>, given what it has perceived and what it knows. Rational is not the same as all-knowing: the agent can only use what it has seen.</p><p>Before we design an agent we describe its task with <b>PEAS</b>:</p><table class="mini"><tr><th>P</th><td>Performance measure</td><td>how we judge success</td></tr><tr><th>E</th><td>Environment</td><td>the world the agent lives in</td></tr><tr><th>A</th><td>Actuators</td><td>how it acts</td></tr><tr><th>S</th><td>Sensors</td><td>how it perceives</td></tr></table>' },
      { exercise: exPEAS },
      { quiz: { q: 'A robot vacuum is scored by "amount of dirt sucked up". It learns to dump dirt and suck it up again. What went wrong?', options: ['The sensors are too weak', 'The performance measure rewards the wrong thing', 'The environment is continuous', 'The robot is not rational'], correct: 1, why: 'The robot is rational for the measure we gave it. Design the performance measure for what you really want (a clean floor), not for how you think the agent should behave.' } }
    ] },
    { id: 'env', title: 'Kinds of environments', blocks: [
      { html: '<p>Task environments differ along six dimensions. The harder side is listed second.</p><table class="mini"><tr><td>fully observable</td><td>partially observable</td><td>can the agent see the whole state?</td></tr><tr><td>single agent</td><td>multi-agent</td><td>are there other agents (opponents, partners)?</td></tr><tr><td>deterministic</td><td>stochastic</td><td>is the next state certain?</td></tr><tr><td>episodic</td><td>sequential</td><td>does today\'s action change tomorrow?</td></tr><tr><td>static</td><td>dynamic</td><td>does the world change while the agent thinks?</td></tr><tr><td>discrete</td><td>continuous</td><td>steps, or smooth quantities?</td></tr></table><p>Taxi driving is the hard side on every line. A crossword puzzle is the easy side on every line.</p>' },
      { exercise: exEnv },
      { quiz: { q: 'Which environment is <b>episodic</b>?', options: ['Chess', 'Driving a taxi', 'A robot that checks each part on a belt, one part at a time', 'Playing poker'], correct: 2, why: 'Each inspection decision stands alone: judging one part does not change the next part. In chess, driving and poker, every action changes the future.' } }
    ] },
    { id: 'types', title: 'Five kinds of agents', blocks: [
      { scene: sceneTypes },
      { exercise: exType },
      { quiz: { q: 'Why can a simple reflex agent fail in a partially observable world?', options: ['It is too slow', 'It cannot remember what it cannot see now, so the same percept can need different actions', 'It has no actuators', 'It always needs a goal'], correct: 1, why: 'It reacts only to the current percept. If two different situations look the same, it must act the same in both. A model-based agent fixes this with memory.' } }
    ] },
    { id: 'today', title: 'AI today: foundation models and agents', blocks: [
      { html: '<p>A <b>foundation model</b> is a very large network trained on a huge amount of text, images or code, and then adapted to many tasks. Large language models such as ChatGPT are foundation models.</p><p><b>Agentic AI</b> puts such a model inside the agent loop of this lecture:</p><table class="mini"><tr><th>agent part</th><th>in an AI agent</th></tr><tr><td>percepts</td><td>your request, web pages, tool results</td></tr><tr><td>agent function</td><td>the language model plus a plan</td></tr><tr><td>actions</td><td>calling tools (search, code, email), writing an answer</td></tr><tr><td>memory (model)</td><td>notes, files, the conversation so far</td></tr><tr><td>performance measure</td><td>did it finish the task correctly and safely?</td></tr></table><p>We return to this in week 13, after search, learning, neural networks and reinforcement learning.</p>' },
      { quiz: { q: 'An AI assistant books a flight by calling a booking website tool. Which of these is a <b>percept</b> for the assistant?', options: ['The tool call "search flights Dubai to Paris"', 'The list of flights the tool returns', 'Sending the confirmation email', 'Clicking the pay button'], correct: 1, why: 'The returned list comes from the environment into the agent: a percept. The tool call, the email and the click are actions.' } },
      { deeper: { title: 'Rational is not perfect', html: '<p>Rationality maximises <i>expected</i> performance with the information available. A rational taxi can still be hit by a falling piano. An agent that also <b>gathers information</b> (looks before crossing) and <b>learns</b> becomes more <b>autonomous</b>: it relies less on the knowledge its designer built in.</p>' } }
    ] }
  ]
});
})();

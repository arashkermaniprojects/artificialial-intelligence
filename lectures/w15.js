(function () {
const K = Course.kit;

/* ---------- small helpers (local to this lecture) ---------- */
// Q(fn): when the engine replays a cue instantly, every animation inside the cue (also after an await) is instant.
const Q = fn => F => { if (F.instant) { const P = Object.create(F); P.instant = true; return fn(P); } return fn(F); };
async function blink(F, el, n = 1) { if (F.instant) return; for (let i = 0; i < n; i++) { await F.to(el, { opacity: 0.3 }, 220); await F.to(el, { opacity: 1 }, 260); } }   // flash for elements without a transform
const EASE = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function tw(F, ms, fn) {
  if (F.instant || ms <= 0) { fn(1); return Promise.resolve(); }
  const tk = F.token, st = performance.now();
  return new Promise(res => { const f = now => { if (tk !== F.token) return; const p = Math.min(1, (now - st) / ms); fn(EASE(p)); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
}

/* ================= scene 1: accuracy hides a gap =================
   Per 100 people of each group (group A has 800 applicants, group B 200):
   A: 50 qualified -> 45 selected (TP), 5 missed (FN); 50 not qualified -> 5 selected (FP), 45 rejected (TN).
   B: 20 qualified -> 10 selected, 10 missed; 80 not qualified -> 0 selected, 80 rejected.
   Accuracy A = 90/100, B = 90/100, overall (720 + 180)/1000 = 90%.  TPR: A 45/50 = 0.9, B 10/20 = 0.5.  Selection rate: A 0.5, B 0.1.
   Base rates 0.5 vs 0.2: a perfect model would select 50% vs 20%. */
const GRP = { A: { tp: 45, fn: 5, fp: 5, tn: 45, x0: 70, label: 'Group A · 800 applicants' }, B: { tp: 10, fn: 10, fp: 0, tn: 80, x0: 380, label: 'Group B · 200 applicants' } };
function kindOf(g, i) { const G = GRP[g]; return i < G.tp ? 'tp' : i < G.tp + G.fn ? 'fn' : i < G.tp + G.fn + G.fp ? 'fp' : 'tn'; }
function fairSnap(F, k) {
  for (const g of ['A', 'B']) F.s.d[g].forEach((d, i) => {
    const t = kindOf(g, i), qual = t === 'tp' || t === 'fn', sel = t === 'tp' || t === 'fp', wrong = t === 'fn' || t === 'fp';
    d.c.style.fill = qual ? 'var(--c-a)' : 'var(--card)'; d.c.style.stroke = qual ? 'var(--c-a)' : 'var(--c-soft)';
    d.g.style.opacity = k < 1 ? 0 : (k >= 3 && k < 4 && !qual) ? 0.18 : 1;
    d.ring.style.opacity = k >= 2 && sel ? 1 : 0; d.x.style.opacity = k === 2 && wrong ? 1 : 0;
  });
  const v = (el, on) => F.to(el, { opacity: on ? 1 : 0 }, 350);
  v(F.s.m[0], k >= 2); v(F.s.m[1], k >= 3); v(F.s.m[2], k >= 4); v(F.s.base, k >= 5); v(F.s.leg, k >= 2);
}
const sceneFair = {
  id: 'fair', title: 'Accuracy can hide unfairness', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'A hiring model and two groups of applicants', 'one dot = 1% of a group · filled = would do the job well (qualified)');
    F.s.d = {};
    for (const g of ['A', 'B']) {
      const G = GRP[g]; F.text(G.x0 + 117, 80, G.label, { size: 13.5, weight: 800 });
      F.s.d[g] = Array.from({ length: 100 }, (_, i) => {
        const x = G.x0 + (i % 10) * 26, y = 108 + Math.floor(i / 10) * 26, gg = F.g({});
        const ring = F.circle(x, y, 11.5, { fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 2.6 }, gg);
        const c = F.circle(x, y, 7.5, { 'stroke-width': 1.8 }, gg);
        const xm = F.text(x, y + 0.5, '✕', { size: 13, weight: 900, fill: 'var(--bad)' }, gg);
        [ring, c, xm].forEach(e => { e.style.transition = 'fill .4s, stroke .4s, opacity .4s'; }); gg.style.transition = 'opacity .4s';
        gg.style.opacity = 0; ring.style.opacity = 0; xm.style.opacity = 0;
        return { g: gg, c, ring, x: xm };
      });
    }
    F.s.leg = F.text(350, 380, 'ring = selected by the model · ✕ = a wrong decision', { size: 12, weight: 700, cls: 'soft' }); F.s.leg.style.opacity = 0;
    const metric = (y, name, a, b) => {
      const g = F.g({}); g.style.opacity = 0;
      F.text(770, y, name, { size: 12.5, weight: 800 }, g);
      [['A', a, 'var(--c-b)'], ['B', b, 'var(--c-c)']].forEach(([n, v, col], j) => { const yy = y + 22 + j * 22; F.text(682, yy, n, { size: 12, weight: 800, fill: col }, g); F.rect(694, yy - 7, 150, 14, { rx: 7, fill: 'var(--c-grid)' }, g); F.rect(694, yy - 7, 150 * v, 14, { rx: 7, fill: col }, g); F.text(876, yy, Math.round(v * 100) + '%', { size: 12, weight: 800, mono: true, anchor: 'end' }, g); });
      return g;
    };
    F.s.m = [metric(100, 'accuracy', 0.9, 0.9), metric(185, 'qualified who are selected\n(true positive rate)', 0.9, 0.5), metric(278, 'share selected\n(selection rate)', 0.5, 0.1)];
    F.s.base = K.callout(F, 770, 384, 'base rate: A 50% qualified, B 20%\na perfect model selects 50% vs 20%', { tone: 'warn', w: 250 });
  },
  steps: [
    { title: 'Two groups', say: ['A company uses a model to choose people for interviews. Applicants come from two groups, A and B.', 'Filled dots are people who would really do the job well. We call them qualified.'],
      cues: [Q(async F => { fairSnap(F, 1); await F.wait(400); }), Q(async F => { fairSnap(F, 1); await F.wait(200); })] },
    { title: 'Accuracy looks fine', say: ['Rings show who the model selects, and red crosses show its mistakes.', 'It is right for ninety percent of group A and ninety percent of group B. That looks fair.'],
      cues: [Q(F => fairSnap(F, 2)), Q(async F => { fairSnap(F, 2); await blink(F, F.s.m[0], 1); })] },
    { title: 'Look at the qualified people', say: ['Now look only at the qualified people. In group A the model selects forty five of fifty, which is ninety percent.', 'In group B it selects only ten of twenty, fifty percent. Half of the good candidates in B are missed.'],
      cues: [Q(F => fairSnap(F, 3)), Q(async F => { fairSnap(F, 3); await blink(F, F.s.m[1], 1); })] },
    { title: 'Two fairness rules', say: ['The model selects fifty percent of group A, but only ten percent of group B.', 'Demographic parity asks for equal selection rates. Equal opportunity asks for equal true positive rates. This model fails both.'],
      cues: [Q(F => fairSnap(F, 4)), Q(async F => { fairSnap(F, 4); await blink(F, F.s.m[2], 1); })] },
    { title: 'No rule fits all', say: ['The groups also differ in how many are qualified: half of A, but only one fifth of B.', 'Then even a perfect model selects fifty and twenty percent, and fails demographic parity. People must choose a fairness rule and explain why.'],
      cues: [Q(F => fairSnap(F, 5)), Q(async F => { fairSnap(F, 5); await F.pulse(F.s.base, 1); })] }
  ]
};

/* ================= scene 2: explaining one decision (score = 0.4·income band + 0.3·years − 0.5·missed payments; approve if ≥ 2)
   applicant: band 5 -> +2.0, 3 years -> +0.9, 2 missed -> −1.0; total 1.9 (refused). With 1 missed payment: 2.4 (approved). */
const X0 = 330, SC = 90;
const sceneExplain = {
  id: 'explain', title: 'Explaining a decision', w: 720, h: 400,
  build(F) {
    K.title(F, 'Why was the loan refused?', 'a simple scoring model: each input adds or removes points · approve if the total is 2 or more');
    F.s.box = F.box(360, 210, 220, 120, 'black box\n?', { fill: 'var(--c-node)', size: 22, weight: 800 });
    F.s.bars = F.g({}); F.s.bars.style.opacity = 0;
    F.line(X0, 110, X0, 330, { stroke: 'var(--c-node-line)', 'stroke-width': 1.6 }, F.s.bars);
    F.text(X0, 100, '0', { size: 11.5, cls: 'soft' }, F.s.bars);
    F.s.thr = F.g({}); F.s.thr.style.opacity = 0;
    F.line(X0 + 2 * SC, 100, X0 + 2 * SC, 340, { stroke: 'var(--bad)', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, F.s.thr); F.text(X0 + 2 * SC, 90, 'needed: 2.0', { size: 11.5, weight: 800, fill: 'var(--bad)' }, F.s.thr);
    const rows = [['income band 5 × 0.4', 2.0, 'var(--ok)'], ['3 years at work × 0.3', 0.9, 'var(--ok)'], ['2 missed payments × (−0.5)', -1.0, 'var(--bad)']];
    F.s.r = rows.map(([t, v, col], i) => { const y = 140 + i * 50; F.text(X0 - 14 - (v < 0 ? -v * SC : 0), y, t, { size: 12.5, weight: 700, anchor: 'end' }, F.s.bars); const r = F.rect(X0, y - 13, 0, 26, { rx: 6, fill: col }, F.s.bars); const lab = F.text(X0, y, '', { size: 12.5, weight: 800, mono: true }, F.s.bars); return { r, lab, v, y }; });
    F.s.tot = F.rect(X0, 287, 0, 30, { rx: 6, fill: 'var(--c-b)' }, F.s.bars);
    F.s.totT = F.text(X0 - 14, 302, 'total score', { size: 12.5, weight: 800, anchor: 'end' }, F.s.bars);
    F.s.totV = F.text(X0, 302, '', { size: 13, weight: 800, mono: true }, F.s.bars);
    F.s.setBar = (o, v) => { const w = Math.abs(v) * SC, x = v >= 0 ? X0 : X0 - w; o.r.setAttribute('x', x); o.r.setAttribute('width', w); o.lab.setAttribute('x', v >= 0 ? X0 + w + 22 : X0 - w - 0); F.setText(o.lab, (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1), v >= 0 ? X0 + w + 24 : X0 + 24); };
    F.s.setTot = v => { F.s.tot.setAttribute('width', v * SC); F.setText(F.s.totV, v.toFixed(1), X0 + v * SC + 22); };
    F.s.no = K.chip(F, 600, 360, '✕ refused', 'bad'); F.s.no.style.opacity = 0;
    F.s.yes = K.chip(F, 600, 360, '✓ approved', 'ok'); F.s.yes.style.opacity = 0;
    F.s.cf = K.callout(F, 300, 370, 'what would change the answer? one missed payment less', { tone: 'accent', w: 410 });
  },
  steps: [
    { title: 'A black box', say: ['A bank model refuses a loan. The customer asks: why?', 'A black box gives no reason. Explainability means that the model can show why it decided.'],
      cues: [Q(async F => { await F.pulse(F.s.box, 1); }), Q(async F => { await F.pulse(F.s.box, 2); })] },
    { title: 'What each input added', say: ['For a simple scoring model we can show how many points each input added or removed.', 'Income added two points, years at work added zero point nine, and two missed payments removed one point.'],
      cues: [Q(async F => { await F.hide(F.s.box); await F.show(F.s.bars); F.s.r.forEach(o => F.s.setBar(o, 0)); F.s.setTot(0); }),
             Q(async F => { for (const o of F.s.r) await tw(F, 600, p => F.s.setBar(o, o.v * p)); })] },
    { title: 'The decision', say: ['The total is one point nine, just under the line of two, so the loan is refused.', 'The biggest negative reason is the missed payments.'],
      cues: [Q(async F => { F.s.r.forEach(o => F.s.setBar(o, o.v)); await F.show(F.s.thr); await tw(F, 900, p => F.s.setTot(1.9 * p)); await F.show(F.s.no); }), Q(async F => { F.s.setTot(1.9); await blink(F, F.s.r[2].r, 2); })] },
    { title: 'A counterfactual', say: ['A useful explanation also says what would change the answer. This is called a counterfactual.', 'With one missed payment less, the score would be two point four, and the loan would be approved.'],
      cues: [Q(async F => { F.s.setTot(1.9); F.s.r.forEach(o => F.s.setBar(o, o.v)); await F.show(F.s.cf); }),
             Q(async F => { await tw(F, 900, p => { F.s.setBar(F.s.r[2], -1 + 0.5 * p); F.s.setTot(1.9 + 0.5 * p); }); F.hide(F.s.no); await F.show(F.s.yes); })] }
  ]
};

/* ================= scene 3: risk tiers (EU AI Act, simplified) ================= */
const TIERS = [['banned', 'var(--bad)', 'var(--bad-bg)', 'UNACCEPTABLE RISK: banned\ne.g. social scoring of people,\nAI that manipulates people to harm them'],
  ['strict rules', 'var(--warn)', 'var(--warn-bg)', 'HIGH RISK: strict rules\ne.g. hiring, credit, education, medical\ndevices: risk checks, data, human oversight'],
  ['be transparent', 'var(--accent2)', 'var(--accent2-bg)', 'LIMITED RISK: transparency\ne.g. a chatbot must say it is an AI,\ndeepfakes must be labelled'],
  ['no new duties', 'var(--ok)', 'var(--ok-bg)', 'MINIMAL RISK: no new duties\ne.g. spam filters, AI in video games']];
const sceneTiers = {
  id: 'tiers', title: 'Regulation by risk', w: 720, h: 400,
  build(F) {
    K.title(F, 'The European Union AI Act sorts AI by risk', 'simplified overview · rules come into force in stages · always check the current rules');
    const cx = 180, wAt = y => 90 + (y - 72) / 280 * 220;
    F.s.t = TIERS.map(([lab, col, bg, txt], i) => {
      const y1 = 72 + i * 70, y2 = y1 + 70, a = wAt(y1) / 2, b = wAt(y2) / 2, g = F.g({});
      F.path(`M${cx - a},${y1 + 2} L${cx + a},${y1 + 2} L${cx + b},${y2 - 2} L${cx - b},${y2 - 2} Z`, { fill: bg, stroke: col, 'stroke-width': 2.2 }, g);
      F.text(cx, (y1 + y2) / 2, lab, { size: 13, weight: 800, fill: col }, g);
      F.line(cx + (a + b) / 2 + 8, (y1 + y2) / 2, 380, (y1 + y2) / 2, { stroke: col, 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }, g);
      F.text(390, (y1 + y2) / 2, txt, { size: 12, anchor: 'start', lh: 15, weight: 600 }, g);
      g.style.opacity = 0; return g;
    });
    F.s.chk = K.callout(F, 360, 384, 'rules differ by country and change: check the current law where you work', { tone: 'warn', w: 520 });
  },
  steps: [
    { title: 'Rules by risk', say: ['Laws for AI are arriving. A well known one is the European Union AI Act, adopted in 2024.', 'It sorts AI systems by risk: the higher the risk, the stricter the rules.'],
      cues: [Q(async F => { for (const g of F.s.t) { F.show(g); await F.wait(180); } }), Q(async F => { await blink(F, F.s.t[0], 1); })] },
    { title: 'Banned and high risk', say: ['At the top are banned uses, such as social scoring of citizens.', 'High risk systems, for example in hiring, credit or medicine, need risk checks, good data, records and human oversight.'],
      cues: [Q(async F => { F.s.t.forEach((g, i) => F.to(g, { opacity: i === 0 ? 1 : .3 }, 300)); await blink(F, F.s.t[0], 1); }), Q(async F => { F.s.t.forEach((g, i) => F.to(g, { opacity: i <= 1 ? 1 : .3 }, 300)); await blink(F, F.s.t[1], 1); })] },
    { title: 'Limited and minimal risk', say: ['Limited risk systems mainly need transparency: a chatbot must tell you that it is an AI.', 'Most systems, like spam filters, are minimal risk and get no new duties.'],
      cues: [Q(async F => { F.s.t.forEach((g, i) => F.to(g, { opacity: i <= 2 ? 1 : .3 }, 300)); await blink(F, F.s.t[2], 1); }), Q(async F => { F.s.t.forEach(g => F.to(g, { opacity: 1 }, 300)); await blink(F, F.s.t[3], 1); })] },
    { title: 'Check the current rules', say: ['Rules start in stages and differ between countries. The UAE, for example, has a national AI strategy and published AI ethics guidelines.', 'So always check the current rules where you work.'],
      cues: [Q(async F => { F.s.t.forEach(g => F.to(g, { opacity: 1 }, 300)); await F.show(F.s.chk); }), Q(async F => { await F.pulse(F.s.chk, 1); })] }
  ]
};

/* ================= scene 4: the course in one map ================= */
const MAPN = [['agents', 'Intelligent agents', 'week 1', 100, 110], ['search', 'Search and A*', 'weeks 2 to 3', 280, 110], ['learn', 'Learning and\noptimisation', 'weeks 4 to 5', 460, 110], ['nn', 'Neural networks', 'weeks 6 to 7', 640, 110], ['seq', 'Sequence models', 'week 9', 810, 110],
  ['llm', 'Transformers\nand LLMs', 'week 10', 810, 265], ['rl', 'Reinforcement\nlearning', 'weeks 11 to 12', 640, 265], ['agentic', 'Agentic AI', 'week 13', 460, 265], ['brain', 'Brain ideas and\nuncertainty', 'week 14', 280, 265], ['resp', 'Responsible AI', 'week 15', 100, 265]];
const MAPE = [['agents', 'search'], ['search', 'learn'], ['learn', 'nn'], ['nn', 'seq'], ['seq', 'llm'], ['llm', 'rl'], ['rl', 'agentic'], ['agentic', 'brain'], ['brain', 'resp']];
const MAPX = [['M665,235 Q725,182 792,235', 'human feedback (RLHF)', 726, 178], ['M420,237 Q250,182 126,141', 'the loop closes', 226, 216]];
const sceneMap = {
  id: 'map', title: 'The whole course in one map', w: 900, h: 420, wide: true,
  build(F) {
    K.title(F, 'From search to responsible agents', 'fifteen weeks, one story');
    F.s.e = {}; F.s.n = {}; F.s.x = [];
    const P = {}; MAPN.forEach(([id, , , x, y]) => { P[id] = [x, y]; });
    for (const [a, b] of MAPE) { const [x1, y1] = P[a], [x2, y2] = P[b]; const l = x1 === x2 ? F.arrow(x1, y1 + 32, x2, y2 - 32, { color: 'var(--c-node-line)', w: 2.4 }) : F.arrow(x1 + (x2 > x1 ? 70 : -70), y1, x2 + (x2 > x1 ? -72 : 72), y2, { color: 'var(--c-node-line)', w: 2.4 }); l.style.opacity = 0; F.s.e[a + b] = l; }
    MAPX.forEach(([d, t, mx, my]) => {
      const g = F.g({}); g.style.opacity = 0;
      F.path(d, { stroke: 'var(--accent)', 'stroke-width': 2.4, 'stroke-dasharray': '7 5', 'marker-end': F.arrowMarker('var(--accent)') }, g);
      F.text(mx, my, t, { size: 11.5, weight: 800, fill: 'var(--accent)' }, g);
      F.s.x.push(g);
    });
    MAPN.forEach(([id, t, wk, x, y]) => { const b = F.box(x, y, 140, 58, t, { size: 13, weight: 750, fill: 'var(--card)', stroke: 'var(--c-node-line)' }); F.text(0, 38, wk, { size: 11, cls: 'soft', weight: 700 }, b); b.style.opacity = 0; F.s.n[id] = b; });
    F.s.loop = K.callout(F, 450, 396, 'perceive → decide → learn → act → check', { tone: 'ok', w: 360, size: 14 });
  },
  steps: [
    { title: 'Agents and search', say: ['We began with agents: systems that perceive and act to reach a goal.', 'To act well they must plan, so we studied search and A star.'],
      cues: [Q(async F => { await F.show(F.s.n.agents); }), Q(async F => { F.show(F.s.e.agentssearch); await F.show(F.s.n.search); })] },
    { title: 'Learning', say: ['Then machines learned from data: simple models, optimisation and neural networks.', 'Networks grew into sequence models and transformers, the engine of large language models.'],
      cues: [Q(async F => { for (const [a, b] of [['search', 'learn'], ['learn', 'nn']]) { F.show(F.s.e[a + b]); await F.show(F.s.n[b]); } }),
             Q(async F => { for (const [a, b] of [['nn', 'seq'], ['seq', 'llm']]) { F.show(F.s.e[a + b]); await F.show(F.s.n[b]); } })] },
    { title: 'Acting', say: ['Reinforcement learning teaches agents to act from rewards. It also helps tune language models with human feedback.', 'Put a language model in a loop with tools, and you get agentic AI.'],
      cues: [Q(async F => { F.show(F.s.e.llmrl); await F.show(F.s.n.rl); await F.show(F.s.x[0]); }), Q(async F => { F.show(F.s.e.rlagentic); await F.show(F.s.n.agentic); await F.pulse(F.s.n.agentic, 1); })] },
    { title: 'Uncertainty and responsibility', say: ['Bayes rule lets an agent act when it is unsure, and the brain keeps giving us new ideas.', 'Above everything sits responsibility: fairness, safety and the law.'],
      cues: [Q(async F => { F.show(F.s.e.agenticbrain); await F.show(F.s.n.brain); }), Q(async F => { F.show(F.s.e.brainresp); await F.show(F.s.n.resp); await F.pulse(F.s.n.resp, 1); })] },
    { title: 'One loop', say: ['Notice the big loop: agentic AI brings us back to the agents of week one, now with learned brains.', 'Perceive, decide, learn, act, and check. Good luck in the final exam.'],
      cues: [Q(async F => { await F.show(F.s.x[1]); await F.pulse(F.s.n.agents, 1); }), Q(async F => { await F.show(F.s.loop); })] }
  ]
};

/* ================= exercises ================= */
const exFair = {
  title: 'Compute a fairness gap', random: true,
  gen(r) {
    const qA = r.pick([40, 50, 60]), qB = r.pick([20, 30, 40]);
    const tpA = r.int(Math.round(0.7 * qA), qA - 1), fpA = r.int(1, 10), tpB = r.int(Math.round(0.3 * qB), qB - 2), fpB = r.int(0, 8);
    const kind = r.pick(['dp', 'eo']);
    const selA = tpA + fpA, selB = tpB + fpB, tprA = 100 * tpA / qA, tprB = 100 * tpB / qB;
    const tbl = '<table class="mini"><tr><th>group (100 people each)</th><th>qualified, selected</th><th>qualified, rejected</th><th>not qualified, selected</th><th>not qualified, rejected</th></tr>' +
      `<tr><td>A</td><td>${tpA}</td><td>${qA - tpA}</td><td>${fpA}</td><td>${100 - qA - fpA}</td></tr><tr><td>B</td><td>${tpB}</td><td>${qB - tpB}</td><td>${fpB}</td><td>${100 - qB - fpB}</td></tr></table>`;
    if (kind === 'dp') {
      const gap = Math.abs(selA - selB);
      return { prompt: 'A screening model gives these results.' + tbl + 'What is the <b>demographic parity gap</b>: the difference between the selection rates of A and B, in percentage points?',
        hint: 'Selection rate = everyone selected (qualified or not) ÷ group size. Then subtract.',
        answer: `Selected in A: ${tpA} + ${fpA} = ${selA} of 100 = ${selA}%. Selected in B: ${tpB} + ${fpB} = ${selB} of 100 = ${selB}%. Gap = <b>${gap}</b> percentage points.`,
        check: { type: 'number', answer: gap, tol: 0.11 } };
    }
    const gap = Math.abs(tprA - tprB);
    return { prompt: 'A screening model gives these results.' + tbl + 'What is the <b>equal opportunity gap</b>: the difference between the true positive rates (qualified people who are selected) of A and B, in percentage points? (one decimal)',
      hint: 'True positive rate = qualified and selected ÷ all qualified in that group.',
      answer: `A: ${tpA} / ${qA} = ${tprA.toFixed(1)}%. B: ${tpB} / ${qB} = ${tprB.toFixed(1)}%. Gap = <b>${gap.toFixed(1)}</b> percentage points. Qualified people in B have a ${gap > 0.05 ? 'smaller' : 'similar'} chance of being selected.`,
      check: { type: 'number', answer: Math.round(gap * 10) / 10, tol: 0.11 } };
  }
};
const exScore = {
  title: 'Explain a credit score', random: true,
  gen(r) {
    const inc = r.int(1, 8), yrs = r.int(0, 10), miss = r.int(0, 4);
    const s = (4 * inc + 3 * yrs - 5 * miss) / 10, ok = s >= 2;
    return {
      prompt: `The model of the lecture gives <b>0.4</b> points per income band, <b>0.3</b> points per year at work, and <b>−0.5</b> points per missed payment. It approves when the total is <b>2 or more</b>. An applicant has income band ${inc}, ${yrs} years at work and ${miss} missed payments. What is the total score?`,
      hint: 'Multiply each input by its weight and add the three numbers.',
      answer: `0.4 × ${inc} = ${(0.4 * inc).toFixed(1)}; 0.3 × ${yrs} = ${(0.3 * yrs).toFixed(1)}; −0.5 × ${miss} = ${(-0.5 * miss).toFixed(1)}. Total = <b>${s.toFixed(1)}</b>, so the loan is <b>${ok ? 'approved' : 'refused'}</b>.${!ok && miss > 0 ? ` Each missed payment less would add 0.5 points.` : ''}`,
      check: { type: 'number', answer: s, tol: 0.01 }
    };
  }
};
const exEnergy = {
  title: 'Estimate the energy of a training run', random: true,
  gen(r) {
    const g = r.pick([8, 16, 64, 256]), kw = r.pick([0.3, 0.4, 0.7]), hrs = r.pick([24, 100, 720]);
    const kwh = Math.round(g * kw * hrs * 10) / 10;
    return {
      prompt: `A model is trained on <b>${g}</b> GPUs. Each GPU uses about <b>${kw} kW</b>, and the training takes <b>${hrs} hours</b>. Ignoring cooling and other parts, how much energy is used, in kilowatt-hours (kWh)?`,
      hint: 'Energy (kWh) = number of GPUs × power of one GPU (kW) × hours.',
      answer: `${g} × ${kw} × ${hrs} = <b>${kwh.toLocaleString('en-US')}</b> kWh. A real data centre also needs energy for cooling, so the total is higher. The carbon cost depends on how the electricity is made.`,
      check: { type: 'number', answer: kwh, tol: 0.5 }
    };
  }
};

Course.lecture({
  id: 'w15', num: 15, week: 15, kind: 'lecture', title: 'Responsible AI, applications and future trends',
  lede: 'An AI system can be accurate and still unfair, unexplained, unsafe or illegal. This last lecture asks how to check that, looks at where AI is used and where it is going, and ties the whole course together in one map.',
  clos: [4], widgets: ['fairness'],
  goals: ['show with numbers how <b>accuracy can hide a gap</b> between groups, and compute <b>demographic parity</b> and <b>equal opportunity</b>',
    'explain a decision with <b>feature contributions</b> and a <b>counterfactual</b>',
    'describe privacy, safety and alignment in plain words, and the <b>risk-based</b> idea of AI regulation',
    'discuss jobs, energy use, applications and future trends with balanced arguments',
    'connect all the topics of the course in one picture'],
  chapters: [
    { id: 'bias', title: 'Bias and fairness', blocks: [
      { html: '<p>Bias can enter at every step: <b>data</b> (some groups are missing or old decisions were unfair), <b>labels</b> (who decided what "good" means?), <b>measurement</b> (a sensor or form works worse for some people) and <b>use</b> (a model built for one place is used in another). The model then learns the pattern, including the unfair part.</p>' },
      { scene: sceneFair },
      { note: '<b>Two common fairness rules.</b> <b>Demographic parity</b>: every group has the same selection rate. <b>Equal opportunity</b>: qualified people in every group have the same chance to be selected (equal true positive rates). When the base rates differ, these rules usually cannot all hold at once, so the choice is a human decision that must be explained.' },
      { widget: 'fairness' },
      { exercise: exFair },
      { quiz: { q: 'A model has 95% accuracy overall. What can you conclude about fairness?', options: ['It is fair, because 95% is high', 'Nothing yet: you must check the error rates and selection rates for each group', 'It is unfair, because no model is fair', 'It is fair if the training data was large'], correct: 1, why: 'Overall accuracy is dominated by the largest group and by the most common outcome. Gaps between groups only show up when you compute the metrics per group.' } }
    ] },
    { id: 'explain', title: 'Transparency, explainability and privacy', blocks: [
      { html: '<p><b>Transparency</b> means people know that an AI is used, what it is for, and what data it uses. <b>Explainability</b> means a single decision can be explained in terms a person can check. For a linear model the contributions are exact. For deep networks, tools such as SHAP values or saliency maps give <b>approximate</b> explanations, and they can be wrong.</p>' },
      { scene: sceneExplain },
      { exercise: exScore },
      { note: '<b>Privacy.</b> Collect only the data you need, ask for consent, protect and delete it. "Anonymous" data can often be linked back to people by combining columns such as birth date and postcode. Techniques such as <b>federated learning</b> (the data stays on the phone, only model updates travel) and <b>differential privacy</b> (careful noise so that no single person can be recognised) reduce the risk. Many countries have data-protection laws; the UAE, for example, has a federal personal data protection law. Check the current rules for your project.' }
    ] },
    { id: 'safety', title: 'Safety, alignment and regulation', blocks: [
      { html: '<p><b>Safety</b>: the system works reliably, also on strange inputs and under attack (remember prompt injection from week 13). <b>Alignment</b>: the system does what people really intend, not only what was literally written in its objective. A reward that is easy to game gives the wrong behaviour (week 12), which is why language models are tuned with human feedback and tested by <b>red teams</b> who try to make them fail.</p>' },
      { scene: sceneTiers },
      { quiz: { q: 'Under a risk-based law such as the EU AI Act, which of these systems is most likely to face the strictest duties that still allow it to be used?', options: ['A spam filter', 'A video game opponent', 'A system that ranks job applicants', 'A music recommendation in a free app'], correct: 2, why: 'Hiring is a classic high-risk use: it affects people\'s lives, so it needs risk management, good data, records and human oversight. Spam filters and games are minimal risk. (Always check the current text of the law: details change.)' } }
    ] },
    { id: 'society', title: 'Society, jobs and the environment', blocks: [
      { html: '<p><b>Jobs.</b> AI usually automates <i>tasks</i>, not whole jobs. Some tasks disappear, many jobs change, and new ones appear. Economists disagree about how fast and how large the effects will be, so be careful with confident predictions. Learning to work <b>with</b> AI tools is a safe skill.</p><p><b>Environment.</b> Training and running large models uses a lot of electricity and water for cooling. The cost depends on the hardware, how long it runs, and how the electricity is produced. Smaller, efficient models and reuse (fine-tuning instead of training from scratch) reduce it.</p>' },
      { exercise: exEnergy }
    ] },
    { id: 'apps', title: 'Applications and future trends', blocks: [
      { html: '<p><b>Where AI is used today.</b> <b>Healthcare</b>: reading medical images, triage, drug discovery. <b>Finance</b>: fraud detection, credit scoring, risk. <b>Business</b>: forecasting, recommendation, customer service. <b>Autonomous vehicles</b>: perception, prediction and planning (search and uncertainty again). <b>Robots</b>: warehouses, surgery assistance, inspection. <b>Science</b>: protein structure prediction (AlphaFold, recognised with the 2024 Nobel Prize in Chemistry), weather forecasting, new materials.</p><p><b>Trends to watch.</b> <b>Foundation models</b> trained once and adapted to many tasks; <b>agents</b> that use tools and act (week 13); <b>robotics</b> with language and vision models; <b>AI for science</b>; and smaller models that run on phones. Each trend raises the questions of this lecture again: is it fair, explainable, private, safe and legal?</p>' },
      { quiz: { q: 'A hospital wants to use a model that reads X-ray images. Which step is MOST important before using it on patients?', options: ['Making the model bigger', 'Testing it on data from this hospital and checking errors for different patient groups, with doctors keeping the final decision', 'Removing the doctors from the process to save time', 'Training it for more epochs'], correct: 1, why: 'A model can work well in one hospital and worse in another (different machines, different patients). Local testing, per-group error rates and a human in the loop are the responsible path.' } }
    ] },
    { id: 'wrap', title: 'Course wrap-up', blocks: [
      { scene: sceneMap },
      { html: '<p><b>Retrieval practice.</b> Answer these from memory, without looking back. Retrieving is one of the best ways to prepare for the final exam.</p>' },
      { quiz: { q: 'Week 3: A* opens the node with the smallest…', options: ['g, the cost so far', 'h, the guess of the cost to go', 'f = g + h', 'depth in the tree'], correct: 2, why: 'f = g + h combines what we paid with an honest guess of what remains. With an admissible h, A* finds the cheapest path.' } },
      { quiz: { q: 'Weeks 4 and 7: training error keeps falling but validation error starts to rise. This is…', options: ['underfitting', 'overfitting, and early stopping or regularisation can help', 'a bug in the data loader', 'the vanishing gradient'], correct: 1, why: 'The model memorises the training set and generalises worse. Stop early, add regularisation or dropout, or get more data.' } },
      { quiz: { q: 'Week 6: backpropagation computes…', options: ['the best learning rate', 'the gradient of the loss with respect to every weight, using the chain rule backwards', 'the next input', 'the number of layers'], correct: 1, why: 'Backpropagation applies the chain rule from the loss back to each weight. Gradient descent then uses these gradients to update the weights.' } },
      { quiz: { q: 'Week 10: in attention, each word builds its new meaning by…', options: ['looking only at the previous word', 'a weighted average of the value vectors of all words, with weights from query-key similarity', 'counting letters', 'random sampling'], correct: 1, why: 'Queries are compared with keys, a softmax turns the scores into weights, and the weights mix the values.' } },
      { quiz: { q: 'Week 11: Q-learning updates Q(s, a) towards…', options: ['the reward only', 'reward + discount × the best Q value of the next state', 'the average of all Q values', 'zero'], correct: 1, why: 'The target is r + γ·max over a′ of Q(s′, a′): the reward now plus the discounted value of acting well afterwards.' } },
      { quiz: { q: 'Weeks 13 and 14: a web page tells an agent to email private files, and a rare-disease test is positive. What do the two cases have in common?', options: ['Nothing', 'In both, the new information must be weighed, not obeyed or believed blindly: page text is data, and a positive test must be combined with the base rate', 'Both need a bigger model', 'Both are solved by more training data'], correct: 1, why: 'A good agent treats tool output as evidence, not orders, and updates beliefs with Bayes rule instead of trusting a single signal.' } }
    ] }
  ]
});
})();

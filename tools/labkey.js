// Teacher tool (local only, never published): regenerate a student's personal lab sheet and its correct answers.
//   node tools/labkey.js lab04 20230001234 [more IDs...]
// Needs python3 with numpy for tasks that carry a python key. Set PY=/path/to/python if needed.
const fs = require('fs'), vm = require('vm'), path = require('path'), cp = require('child_process');
const SC = require('../assets/sheetcore.js');
const [labId, ...ids] = process.argv.slice(2);
if (!labId || !ids.length) { console.log('usage: node tools/labkey.js lab04 <studentID> [studentID ...]'); process.exit(1); }
const noop = new Proxy(function () { }, { get: () => noop, apply: () => noop, construct: () => noop });
let def = null; const Course = { lecture: d => { def = d; }, widget() { }, kit: noop, widgets: {}, h: noop, rng: SC.rng, fmt: String, $: noop, $$: noop, store: {}, sleep() { }, ease: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'labs', labId + '.js'), 'utf8'), { Course, console, Math, window: {}, document: noop }, { filename: labId });
let sheet = null; (def.chapters || []).forEach(ch => (ch.blocks || []).forEach(b => { if (b.labsheet) sheet = b.labsheet; }));
if (!sheet) { console.log(labId + ' has no personal lab sheet'); process.exit(1); }
const pys = [process.env.PY, 'python3', '/tmp/hw313/bin/python'].filter(Boolean);
function runPy(code) { for (const py of pys) { const r = cp.spawnSync(py, ['-c', code], { encoding: 'utf8', timeout: 60000 }); if (r.status === 0) return r.stdout; if (!/No module|not found|ENOENT/.test(r.stderr + (r.error || ''))) return 'PYTHON ERROR: ' + r.stderr.slice(-300); } return 'no python with numpy found'; }
for (const id of ids) {
  const r = SC.rng(SC.seed(labId, id)), B = sheet.base ? sheet.base(r) : {};
  console.log('\n==== ' + labId + ' student ' + id + '  sheet code ' + SC.code(labId, id) + ' ====');
  const cnt = { task: 0, challenge: 0 };
  sheet.tasks.forEach(t => {
    const g = t.gen(r, B); const no = ++cnt[t.kind === 'challenge' ? 'challenge' : 'task']; console.log(`\n-- ${t.kind === 'challenge' ? 'Challenge' : 'Task'} ${no}: ${t.title} (${t.marks} marks)`);
    if (g.key) { const out = runPy(g.key); out.split('\n').filter(l => /^ANS |^PYTHON|^no python/.test(l)).forEach(l => console.log('   ' + l.replace(/^ANS /, 'expected  '))); }
    if (g.note) console.log('   note: ' + g.note);
  });
}

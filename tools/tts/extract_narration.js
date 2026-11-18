// node extract_narration.js lectures/w03.js  ->  JSON [{lec, items:[{key:'scene.0', sentences:[...]}]}]
const fs = require('fs'), vm = require('vm'); const out = [];
const noop = new Proxy(function(){}, { get: () => noop, apply: () => noop, construct: () => noop });
for (const f of process.argv.slice(2)) {
  let def = null; const Course = { lecture: d => { def = d; }, widget(){}, kit: noop, widgets: {}, h: noop, rng(){}, fmt: String, $: noop, $$: noop, store: {}, sleep(){}, ease: {} };
  vm.runInNewContext(fs.readFileSync(f, 'utf8'), { Course, console, Math, window: {}, document: noop }, { filename: f });
  const items = [];
  (def.chapters || []).forEach(ch => (ch.blocks || []).forEach(b => { if (b.scene) (b.scene.steps || []).forEach((st, i) => items.push({ key: b.scene.id + '.' + i, sentences: st.say })); }));
  out.push({ lec: def.id, items });
}
console.log(JSON.stringify(out));

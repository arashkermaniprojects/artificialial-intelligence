// node tools/check_lecture.js lectures/w04.js [more files]  - structure check without a browser
const fs = require('fs'), vm = require('vm'); let bad = 0;
function rng(seed){ let a=seed>>>0||1; const r=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}; return {seed,next:r,int:(x,y)=>x+Math.floor(r()*(y-x+1)),float:(x,y)=>x+r()*(y-x),pick:a=>a[Math.floor(r()*a.length)],chance:p=>r()<p,shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b},gauss:()=>0}; }
for (const f of process.argv.slice(2)) {
  const err = m => { console.log('  ✗', m); bad++; };
  console.log(f); let def = null;
  const noop = new Proxy(function(){}, { get: () => noop, apply: () => noop, construct: () => noop });
  const Course = { lecture: d => { def = d; }, widget: () => {}, kit: noop, widgets: {}, h: noop, rng, fmt: String, $: noop, $$: noop, store: {}, sleep: () => {}, ease: {} };
  try { vm.runInNewContext(fs.readFileSync(f, 'utf8'), { Course, console, Math, window: {}, document: noop }, { filename: f }); } catch (e) { err('load: ' + e.message); continue; }
  if (!def) { err('no Course.lecture call'); continue; }
  const ids = new Set(); let scenes = 0, ex = 0, quiz = 0, words = 0;
  (def.chapters || []).forEach(ch => (ch.blocks || []).forEach(b => {
    if (b.scene) { scenes++; const s = b.scene; if (ids.has(s.id)) err('duplicate scene id ' + s.id); ids.add(s.id);
      if (!s.steps || !s.steps.length) err(s.id + ': no steps');
      (s.steps || []).forEach((st, i) => { if (!st.say || !st.cues || st.say.length !== st.cues.length) err(`${s.id} step ${i+1} "${st.title}": say(${st.say&&st.say.length}) != cues(${st.cues&&st.cues.length})`); (st.say||[]).forEach(x => { words += x.split(/\s+/).length; if (/[*_^\\$]|\bA\*/.test(x)) err(`${s.id} step ${i+1}: spoken text has symbols (write "A star", numbers as words): ${x.slice(0,60)}`); }); });
      if (typeof s.build !== 'function') err(s.id + ': no build(F)'); }
    if (b.exercise) { ex++; for (const seed of [1,2,3,7,11,23,101,999,31337,424242]) { try { const r = b.exercise.gen(rng(seed), Course); if (!r.prompt && !r.figure) err(`exercise "${b.exercise.title}" seed ${seed}: no prompt`); if (!r.answer) err(`exercise "${b.exercise.title}" seed ${seed}: no answer text`); if (r.check && r.check.type === 'number' && !isFinite(r.check.answer)) err(`exercise "${b.exercise.title}" seed ${seed}: NaN answer`); } catch (e) { err(`exercise "${b.exercise.title}" seed ${seed}: ${e.message}`); break; } } }
    if (b.quiz) { quiz++; if (!(b.quiz.correct >= 0 && b.quiz.correct < b.quiz.options.length)) err('quiz correct index out of range: ' + b.quiz.q.slice(0, 40)); }
  }));
  console.log(`  ${def.id}: ${def.chapters.length} chapters, ${scenes} scenes, ${ex} exercises, ${quiz} quizzes, ~${words} spoken words`);
  if (scenes < 3 && def.kind !== 'lab') console.log('  ! fewer than 3 scenes'); if (ex < 2) console.log('  ! fewer than 2 exercises');
}
process.exit(bad ? 1 : 0);

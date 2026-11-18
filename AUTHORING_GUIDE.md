# Authoring guide: BCS 407 course pages

Read `lectures/w03.js` first. It is the quality template (3 animated scenes, random exercises, quizzes, a playground). Match it.
Engine: `assets/engine.js` (Fig class, scenes, exercises, quizzes, python cells). Kit: `assets/kit.js`. Syllabus plan: `assets/data.js` (weekly topics, books, CLOs). Do not edit engine.js, kit.js, style.css, data.js or other people's files. If you need a new helper, define it inside your own file.

## Hard rules
- Quality of the visuals is essential. Every concept that can be SEEN must be an animated SVG scene: data points moving, a tree growing, a boundary bending, a network passing numbers, loss going down. No walls of text. Text is short; the picture teaches.
- Narration is written in plain spoken English for non-native speakers: short sentences, no symbols in `say` (write "A star", "x squared", numbers as words when small, no `*`, `_`, `^`, `$`, no code). Define every term at first use. Big picture first, then detail.
- Every numeric example must be correct. Check numbers with a quick node or python computation before writing them. Exercise answers must be verified by code inside `gen`.
- No marks or numbers like x.25 / x.75 anywhere (use .0 or .5) if you ever mention marks.
- Do NOT use the browser, do NOT start servers, do NOT run heavy jobs. Check with `node tools/check_lecture.js <your files>` only. The lead will review visually.
- Each lecture: 5 to 7 chapters, at least 3 scenes (4 to 7 steps each), at least 3 random exercises, 2+ quizzes, one playground/widget or python cell where it makes sense, a "goals" list, and a `lede`. About 350 to 700 spoken words in total per lecture. Put CLO numbers in `clos`.
- Labs (`kind:'lab'`, file `labs/labNN.js`, page lab.html): short, concept first, fun. Use `{py:{code:`...`}}` blocks (Pyodide in the browser, numpy only, no other packages, no files, no internet) with runnable starter code, and `exercise` blocks with checks. 2 to 3 scenes maximum. Give a "your task" structure: explain, run, change a number, observe. Include the expected output in comments or note blocks.

## File template
```js
(function () {
const K = Course.kit;
const scene1 = { id:'x', title:'...', w:720, h:400, wide:false,
  build(F){ /* create elements, store in F.s.* */ },
  steps:[ { title:'Step title', say:['Sentence one.','Sentence two.'], cues:[ async F=>{...}, async F=>{...} ] } ] };   // say.length === cues.length ALWAYS
Course.lecture({ id:'w04', num:4, week:4, kind:'lecture', title:'...', lede:'...', clos:[2], widgets:[/* names in assets/widgets */],
  goals:['...'], chapters:[ {id:'a', title:'...', blocks:[ {html:'<p>..</p>'}, {scene:scene1}, {note:'..'}, {exercise:ex}, {quiz:{q,options,correct,why}}, {widget:'name', opts:{}}, {py:{code:`..`}}, {code:`..`}, {deeper:{title,html}} ]} ] });
})();
```
Cues run in order, one per sentence, while that sentence is spoken. They must be idempotent when replayed instantly (the engine replays earlier steps with `F.instant = true` when the user jumps). Always end a step in a consistent visual state. Never rely on timing across steps.

## Fig API (F)
Creation: `F.g(attrs,parent) F.rect(x,y,w,h,attrs,parent) F.circle(cx,cy,r,attrs) F.line(x1,y1,x2,y2,attrs) F.path(d,attrs) F.text(x,y,str,{size,weight,fill,anchor,cls,mono,lh}) F.arrow(x1,y1,x2,y2,{color,w,dash}) F.box(cx,cy,w,h,label,{fill,stroke,rx,size,weight})` (box returns a `g` with `.rect` and `.label`). Strings with `\n` become lines. `F.setText(textEl,str,x,lh)`.
Animation (all return promises): `F.to(el,{opacity,tx,ty,s,r,fill,stroke,'stroke-width',x,y,width,height,cx,cy,r...},ms,'io'|'out'|'back')`, `F.all([[el,attrs,ms],...])`, `F.show(el) F.hide(el) F.draw(pathEl,ms)` (stroke draw-in; set `el.style.opacity=0` first), `F.pulse(el,n)`, `F.along(el,pathEl,ms)`, `F.count(textEl,a,b,ms)`, `F.wait(ms)`, `F.set(el,attrs)` (instant). `F.instant` is true during replay. Elements made with `F.g`/`F.box` carry `__t` for tx/ty/s/r tweens; for a plain element you want to move, wrap it in `F.g({transform:'translate(0,0)'})` first and set `g.__t={x:0,y:0,s:1,r:0}`.
Colours: CSS variables only (dark mode): `--c-a --c-b --c-c --c-node --c-node-line --c-soft --c-grid --c-open --c-closed --c-cur --c-goal --c-start --c-path --fig-bg --card --line --ok --ok-bg --warn --warn-bg --bad --bad-bg --accent --accent2 --accent2-bg`. Never hard-code light-only colours.
Scene options: `wide:true` for 900-wide figures (use w:900), `controls:[{id,label,min,max,step,value}]` or `{id,label,options:[[value,text]]}` give sliders/selects readable as `F.s.ctl_<id>`.value inside cues and `build`.
Kit (`Course.kit`): `K.title(F,text,sub)`, `K.graph(F,{nodes:{S:{x,y,sub}},edges:[[a,b,cost,{dir:true,curve,lx,ly}]]})` with `.state(name,'idle|open|closed|current|start|goal|path|dim')`, `.edgeState(a,b,'hot|path|dim')`, `.flow(a,b)`, `.ring`, `.sub`; `K.queue(F,x,y,w,title,{cols,colX,maxRows,rh})` with `.set([{id,cols}])`; `K.callout(F,x,y,text,{tone:'ok|warn|bad|accent',w})` (starts hidden; F.show it); `K.tree(F,{nodes:{id:{x,y,label,kind:'max|min|leaf'}},edges:[[a,b]]})` with `.state .edgeState('pruned|hot|best') .label`; `K.bars(F,x,y,w,h,[{v,label,color}])` with `.set(i,val)`; `K.chip(F,x,y,text,tone)`.

## Exercises (random, with "show answer")
`{exercise:{title, random:true, gen(r,C){ ... return {prompt:'html', hint:'..', answer:'html explanation', check:{type:'number',answer:N,tol:0.01} | {type:'text',answer:'B'}, figure:{w,h,draw(F){...}}}; }}}`. `r` is seeded: `r.int(a,b)` (inclusive), `r.float(a,b)`, `r.pick(arr)`, `r.shuffle(arr)`, `r.chance(p)`, `r.next()`. Compute the answer in code. Avoid ties and ambiguous answers. KaTeX is available: `$x^2$` in `prompt`/`answer`/`html` blocks (not in `say`). Table style class `mini`.

## Widgets
`assets/widgets/<name>.js` with `Course.widget('name', function(root, opts, C){ ... })`, helpers `C.h(tag,attrs,...children)`, `C.rng`, `C.$`, `C.$$`. Keep CSS inside the file (inject a `<style id>` once) using the theme variables. Declare `widgets:['name']` in the lecture. Interactive widgets need: presets, a reset button, live read-outs, and a verdict/insight line explaining what the user sees. Use `<canvas>` or SVG; keep it fast.

## Spoken text conventions (for the voice generator)
Write "A star", "alpha beta", "k means", "R N N" is fine as "recurrent network"; no formulas in `say`; digits only for years. Keep each sentence under 25 words. The last sentence of a step should land the one thing to remember.

## Deliver
Files you create: your lecture/lab js files (and widgets). Run `node tools/check_lecture.js <files>` until clean. Reply with a short list of files and anything the lead should look at.

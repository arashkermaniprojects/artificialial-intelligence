/* ============================================================================
   Course engine: narrated SVG scenes, sentence-synchronised cues, exercises,
   quizzes, interactive widgets, runnable Python cells.
   Public API (global `Course`):
     Course.lecture(def)        register a lecture / lab page definition
     Course.widget(name, fn)    register an interactive widget  fn(root, opts, Course)
     Course.mount(id)           render lecture `id` into #app
     Course.home(def)           render the home page
   Helpers for authors: Course.h, Course.rng, Course.fmt, Course.Fig (SVG context)
   ============================================================================ */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const Course = (window.Course = { lectures: {}, widgets: {}, exercises: {}, version: '1.0' });

  /* ------------------------------ utilities ------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ai407.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ai407.' + k, JSON.stringify(v)); } catch (e) { } }
  };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rng(seed) {
    const r = mulberry32(seed >>> 0 || 1);
    const o = {
      seed, next: r,
      int: (a, b) => a + Math.floor(r() * (b - a + 1)),
      float: (a, b) => a + r() * (b - a),
      pick: arr => arr[Math.floor(r() * arr.length)],
      chance: p => r() < p,
      shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
      sample(arr, n) { return o.shuffle(arr).slice(0, n); },
      normal() { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    };
    return o;
  }
  const fmt = {
    n: (x, d = 2) => { const p = Math.pow(10, d); const v = Math.round(x * p) / p; return (Object.is(v, -0) ? 0 : v).toFixed(d).replace(/\.?0+$/, m => (d ? '' : m)); },
    f: (x, d = 2) => { const v = Math.round(x * Math.pow(10, d)) / Math.pow(10, d); return (Object.is(v, -0) ? 0 : v).toFixed(d); },
    pct: (x, d = 0) => (x * 100).toFixed(d) + '%'
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const plain = s => { const d = document.createElement('div'); d.innerHTML = s; return d.textContent.replace(/\s+/g, ' ').trim(); };
  const ease = {
    lin: t => t,
    io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    spring: t => 1 - Math.cos(t * 4.5 * Math.PI) * Math.exp(-6 * t)
  };
  function resolveColor(c, el) {
    if (!c) return null;
    if (c.startsWith('var(')) { const name = c.slice(4, -1).split(',')[0].trim(); c = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }
    const probe = resolveColor.probe || (resolveColor.probe = document.createElement('span'));
    probe.style.color = ''; probe.style.color = c; document.body.append(probe);
    const rgb = getComputedStyle(probe).color; probe.remove();
    const m = rgb.match(/[\d.]+/g); return m ? m.slice(0, 4).map(Number) : [128, 128, 128, 1];
  }
  const colorAttrs = new Set(['fill', 'stroke']);

  /* ------------------------------ SVG context ------------------------------ */
  class Fig {
    constructor(svg, w, h) {
      this.svg = svg; this.w = w; this.h = h; this.instant = false; this.token = 0; this.sd = 2400; this.s = {};
      this.root = null; this.defs = null; this.markers = {};
      this.reset();
    }
    reset() {
      this.token++; this.s = {}; this.markers = {};
      this.svg.textContent = '';
      this.svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
      this.defs = this.el('defs', {}, this.svg);
      const f = this.el('filter', { id: 'fx-soft', x: '-30%', y: '-30%', width: '160%', height: '160%' }, this.defs);
      this.el('feDropShadow', { dx: 0, dy: 2, stdDeviation: 2.4, 'flood-color': '#0a1a2c', 'flood-opacity': .22 }, f);
      const g = this.el('filter', { id: 'fx-glow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, this.defs);
      this.el('feGaussianBlur', { stdDeviation: 4, result: 'b' }, g);
      const m = this.el('feMerge', {}, g); this.el('feMergeNode', { in: 'b' }, m); this.el('feMergeNode', { in: 'SourceGraphic' }, m);
      this.root = this.el('g', { class: 'root' }, this.svg);
      return this;
    }
    el(tag, attrs, parent) {
      const e = document.createElementNS(NS, tag);
      if (attrs) for (const [k, v] of Object.entries(attrs)) { if (v != null) e.setAttribute(k, v); }
      (parent === undefined ? this.root : parent).append(e);
      return e;
    }
    g(attrs, parent) { return this.el('g', attrs, parent); }
    rect(x, y, w, h, attrs = {}, parent) { return this.el('rect', Object.assign({ x, y, width: w, height: h }, attrs), parent); }
    circle(cx, cy, r, attrs = {}, parent) { return this.el('circle', Object.assign({ cx, cy, r }, attrs), parent); }
    line(x1, y1, x2, y2, attrs = {}, parent) { return this.el('line', Object.assign({ x1, y1, x2, y2 }, attrs), parent); }
    path(d, attrs = {}, parent) { return this.el('path', Object.assign({ d, fill: 'none' }, attrs), parent); }
    /** text with optional \n line breaks, anchor, size, weight, class */
    text(x, y, str, o = {}, parent) {
      const t = this.el('text', { x, y, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': o.base || 'central', class: 'lbl ' + (o.cls || '') }, parent);
      if (o.size) t.style.fontSize = o.size + 'px';
      if (o.weight) t.style.fontWeight = o.weight;
      if (o.fill) t.style.fill = o.fill;
      if (o.mono) t.classList.add('mono');
      if (o.opacity != null) t.style.opacity = o.opacity;
      this.setText(t, str, x, o.lh || (o.size || 13) * 1.25);
      return t;
    }
    setText(t, str, x, lh) {
      str = String(str); const lines = str.split('\n');
      const xx = x != null ? x : t.getAttribute('x'); lh = lh || 16;
      t.textContent = '';
      const start = -((lines.length - 1) * lh) / 2;
      lines.forEach((ln, i) => { const s = document.createElementNS(NS, 'tspan'); s.setAttribute('x', xx); s.setAttribute('dy', i === 0 ? start : lh); s.textContent = ln; t.append(s); });
    }
    arrowMarker(color = 'var(--c-node-line)') {
      const id = 'arr' + (this.markers[color] || (this.markers[color] = 'm' + Object.keys(this.markers).length));
      if (!this.svg.querySelector('#' + id)) {
        const m = this.el('marker', { id, viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 7.5, markerHeight: 7.5, orient: 'auto-start-reverse' }, this.defs);
        this.el('path', { d: 'M0,0 L10,5 L0,10 L2.6,5 z', fill: color }, m);
      }
      return `url(#${id})`;
    }
    arrow(x1, y1, x2, y2, o = {}, parent) {
      const col = o.color || 'var(--c-node-line)';
      return this.el('line', { x1, y1, x2, y2, stroke: col, 'stroke-width': o.w || 2, 'marker-end': this.arrowMarker(col), 'stroke-linecap': 'round', 'stroke-dasharray': o.dash || null }, parent);
    }
    /* nodes: rounded box with a label */
    box(x, y, w, hgt, label, o = {}, parent) {
      const g = this.g({ transform: `translate(${x},${y})` }, parent);
      g.__t = { x, y, s: 1, r: 0 };
      const r = this.rect(-w / 2, -hgt / 2, w, hgt, { rx: o.rx ?? 10, fill: o.fill || 'var(--c-node)', stroke: o.stroke || 'var(--c-node-line)', 'stroke-width': o.sw || 1.6, filter: o.shadow === false ? null : 'url(#fx-soft)' }, g);
      const t = label != null ? this.text(0, 0, label, { size: o.size, weight: o.weight, mono: o.mono, cls: o.cls, fill: o.tfill }, g) : null;
      g.rect = r; g.label = t; return g;
    }
    /* ------------------------------ animation ------------------------------ */
    wait(ms) { if (this.instant) return Promise.resolve(); const tk = this.token; return new Promise(r => setTimeout(() => { if (tk === this.token) r(); }, ms)); }
    _apply(el, o) {
      const tf = el.__t;
      if (tf) { const parts = []; if (o.tx != null || o.ty != null || o.s != null || o.r != null) { } }
    }
    /** tween numeric attributes / colours / transform parts (tx, ty, s, r) of an element */
    to(el, attrs, ms = 600, easing = 'io') {
      if (!el) return Promise.resolve();
      if (el.__t === undefined && ('tx' in attrs || 'ty' in attrs || 's' in attrs || 'r' in attrs)) {
        const m = (el.getAttribute('transform') || '').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
        el.__t = { x: m ? +m[1] : 0, y: m ? +m[2] : 0, s: 1, r: 0 };
      }
      const t0 = {}, t1 = {}, col0 = {}, col1 = {}, plain = {};
      const tfNames = { tx: 'x', ty: 'y', s: 's', r: 'r' };
      for (const [k, v] of Object.entries(attrs)) {
        if (k in tfNames) { t0[k] = el.__t[tfNames[k]]; t1[k] = v; }
        else if (k === 'opacity') { t0[k] = el.style.opacity === '' ? 1 : +el.style.opacity; t1[k] = v; }
        else if (colorAttrs.has(k)) { col0[k] = resolveColor(getComputedStyle(el)[k] || el.getAttribute(k), el); col1[k] = resolveColor(v, el); plain[k] = v; }
        else if (typeof v === 'number') { const cur = parseFloat(el.getAttribute(k)); t0[k] = isNaN(cur) ? 0 : cur; t1[k] = v; }
        else plain[k] = v;
      }
      const writeTf = () => { const t = el.__t; el.setAttribute('transform', `translate(${t.x},${t.y})` + (t.r ? ` rotate(${t.r})` : '') + (t.s !== 1 ? ` scale(${t.s})` : '')); };
      const setAt = p => {
        for (const k in t1) {
          const val = t0[k] + (t1[k] - t0[k]) * p;
          if (k in tfNames) el.__t[tfNames[k]] = val;
          else if (k === 'opacity') el.style.opacity = val;
          else el.setAttribute(k, val);
        }
        if ('tx' in t1 || 'ty' in t1 || 's' in t1 || 'r' in t1) writeTf();
        for (const k in col0) { const a = col0[k], b = col1[k]; const c = a.map((x, i) => x + ((b[i] ?? 1) - x) * p); el.style[k] = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3] ?? 1})`; el.removeAttribute(k); }
      };
      const fin = () => { setAt(1); for (const k in plain) if (!colorAttrs.has(k)) el.setAttribute(k, plain[k]); for (const k in col1) el.style[k] = plain[k]; };
      if (this.instant || ms <= 0) { fin(); return Promise.resolve(); }
      const f = ease[easing] || ease.io, tk = this.token;
      for (const k in plain) if (!colorAttrs.has(k)) el.setAttribute(k, plain[k]);
      return new Promise(res => {
        const start = performance.now();
        const step = now => {
          if (tk !== this.token) return;           // scene was reset: never resolve (stale cue just stops)
          const p = Math.min(1, (now - start) / ms);
          setAt(f(p));
          if (p < 1) requestAnimationFrame(step); else { fin(); res(); }
        };
        requestAnimationFrame(step);
      });
    }
    /** animate several elements at once: F.all([[el, attrs, ms, ease], ...]) */
    all(list) { return Promise.all(list.map(a => this.to(...a))); }
    set(el, attrs) { const i = this.instant; this.instant = true; this.to(el, attrs, 0); this.instant = i; return el; }
    show(el, ms = 400) { return this.to(el, { opacity: 1 }, ms, 'out'); }
    hide(el, ms = 300) { return this.to(el, { opacity: 0 }, ms, 'out'); }
    /** reveal a path/line like it is being drawn */
    async draw(el, ms = 800) {
      const len = el.getTotalLength ? el.getTotalLength() : 100;
      el.style.strokeDasharray = len; el.style.strokeDashoffset = this.instant ? 0 : len; el.style.opacity = 1;
      if (this.instant) { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; return; }
      const tk = this.token, start = performance.now();
      await new Promise(res => { const st = now => { if (tk !== this.token) return; const p = Math.min(1, (now - start) / ms); el.style.strokeDashoffset = len * (1 - ease.io(p)); if (p < 1) requestAnimationFrame(st); else { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; res(); } }; requestAnimationFrame(st); });
    }
    /** attention pulse on an element */
    async pulse(el, n = 1, ms = 520) { if (this.instant) return; for (let i = 0; i < n; i++) { await this.to(el, { s: 1.14 }, ms * .4, 'out'); await this.to(el, { s: 1 }, ms * .6, 'io'); } }
    /** move along a path by sampling (el must be a <g>/<circle> with transform support) */
    async along(el, pathEl, ms = 900) {
      const len = pathEl.getTotalLength(); if (el.__t === undefined) el.__t = { x: 0, y: 0, s: 1, r: 0 };
      const upd = p => { const pt = pathEl.getPointAtLength(len * p); el.__t.x = pt.x; el.__t.y = pt.y; el.setAttribute('transform', `translate(${pt.x},${pt.y})`); };
      if (this.instant) { upd(1); return; }
      const tk = this.token, st = performance.now();
      await new Promise(res => { const f = now => { if (tk !== this.token) return; const p = Math.min(1, (now - st) / ms); upd(ease.io(p)); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    }
    /** count a numeric label from a to b */
    async count(textEl, a, b, ms = 700, fn = v => Math.round(v)) {
      if (this.instant) { this.setText(textEl, fn(b)); return; }
      const tk = this.token, st = performance.now();
      await new Promise(res => { const f = now => { if (tk !== this.token) return; const p = Math.min(1, (now - st) / ms); this.setText(textEl, fn(a + (b - a) * ease.io(p))); if (p < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    }
  }
  Course.Fig = Fig;
  Course.h = h; Course.rng = rng; Course.fmt = fmt; Course.$ = $; Course.$$ = $$; Course.store = store; Course.sleep = sleep; Course.ease = ease;

  /* ------------------------------ audio manifest ------------------------------ */
  const AUDIO = {};    // key "scene.step" -> {f, t:[sentence starts], d}
  async function loadAudio(lectureId) {
    try {
      const r = await fetch(`audio/${lectureId}/manifest.json?v=${Course.version}`); if (!r.ok) return;
      const m = await r.json(); Object.assign(AUDIO, m);
    } catch (e) { }
  }

  /* ------------------------------ scene ------------------------------ */
  function buildScene(def, lec, ctxApi) {
    const w = def.w || 720, hh = def.h || 420;
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', def.title || 'diagram');
    const F = new Fig(svg, w, hh);
    const sec = h('div', { class: 'scene' + (def.wide ? ' wide' : ''), id: 'sc-' + def.id });
    const figBox = h('div', { class: 'fig' }, svg);
    const nav = h('div', { class: 'fig-nav' });
    const prev = h('button', { 'aria-label': 'Previous step' }, '◀'), next = h('button', { 'aria-label': 'Next step' }, '▶');
    const dots = h('div', { class: 'dots' });
    const nar = h('button', { class: 'narrate' }, '🔊 Narrate');
    const replay = h('button', { title: 'Replay this step', 'aria-label': 'Replay this step' }, '↻');
    nav.append(prev, dots, replay, next, nar); figBox.append(nav);
    if (def.controls && def.controls.length) {
      const ctl = h('div', { class: 'fig-ctl' });
      def.controls.forEach(c => {
        let inp;
        if (c.options) { inp = h('select', {}, c.options.map(o => h('option', { value: o[0] }, o[1]))); inp.value = c.value ?? c.options[0][0]; }
        else { inp = h('input', { type: 'range', min: c.min, max: c.max, step: c.step || 1, value: c.value ?? c.min }); }
        F.s['ctl_' + c.id] = inp;
        inp.addEventListener('input', () => { sc.ctl[c.id] = c.options ? inp.value : +inp.value; sc.rebuildAt(sc.pos.i, sc.pos.k, true); });
        sc.ctl[c.id] = c.options ? inp.value : +inp.value;
        ctl.append(h('label', {}, c.label + ' ', inp));
      });
      figBox.append(ctl);
    }
    const stepsBox = h('div', { class: 'steps' });
    const sc = { def, F, sec, steps: [], pos: { i: -1, k: -1 }, ctl: {}, queueIdx: [], el: sec, id: def.id };
    F.ctl = sc.ctl;
    def.steps.forEach((st, i) => {
      const sayArr = Array.isArray(st.say) ? st.say : (st.say ? [st.say] : []);
      const stepEl = h('div', { class: 'step', 'data-i': i },
        st.title ? h('h4', {}, st.title) : null,
        h('p', {}, sayArr.map((s, k) => h('span', { class: 'snt', 'data-k': k, html: s + ' ' }))),
        st.extra ? h('div', { class: 'note', html: st.extra }) : null);
      stepEl.addEventListener('click', () => { ctxApi.userTook(); sc.goStep(i); });
      stepsBox.append(stepEl);
      sc.steps.push({ el: stepEl, def: st, say: sayArr, plain: sayArr.map(plain) });
      dots.append(h('button', { 'data-dot': i, 'aria-label': 'Step ' + (i + 1), onclick: () => { ctxApi.userTook(); sc.goStep(i); } }));
    });
    sec.append(figBox, stepsBox);

    const hl = (i, k, mode) => {
      sc.steps.forEach((s, j) => {
        s.el.classList.toggle('on', j === i);
        s.el.classList.toggle('speaking', mode === 'speak' && j === i);
        $$('.snt', s.el).forEach((e, kk) => { e.classList.toggle('cur', j === i && kk === k); e.classList.toggle('done', mode !== 'speak' || j < i || (j === i && kk <= k)); });
      });
      $$('.dots button', nav).forEach((b, j) => { b.classList.toggle('on', j === i); b.classList.toggle('seen', j < i); });
    };
    sc.hl = hl;

    // --- cue machinery ---
    sc.buildFresh = () => { F.reset(); def.build && def.build(F, sc.ctl); };
    sc.runCue = (i, k, instant) => {
      const st = def.steps[i], cue = st.cues && st.cues[k]; if (!cue) return Promise.resolve();
      const prevI = F.instant; F.instant = !!instant;
      let p; try { p = cue(F, sc.ctl); } catch (e) { console.error('cue error', def.id, i, k, e); }
      F.instant = prevI; return Promise.resolve(p);
    };
    sc.stepLen = i => Math.max(sc.steps[i].say.length, (def.steps[i].cues || []).length, 1);
    /** rebuild the figure and fast-forward to (i,k) inclusive */
    sc.rebuildAt = (i, k, instantLast = true) => {
      sc.buildFresh();
      for (let a = 0; a < i; a++) for (let b = 0; b < sc.stepLen(a); b++) { const pi = F.instant; F.instant = true; sc.runCue(a, b, true); F.instant = pi; }
      for (let b = 0; b <= k; b++) sc.runCue(i, b, instantLast);
      sc.pos = { i, k };
    };
    sc.goStep = (i, opts = {}) => {            // manual: play the whole step with animation
      i = Math.max(0, Math.min(sc.steps.length - 1, i));
      F.token++;
      if (i === sc.pos.i + 1 && sc.pos.k >= sc.stepLen(sc.pos.i) - 1) { /* simple forward */ }
      else { sc.buildFresh(); for (let a = 0; a < i; a++) for (let b = 0; b < sc.stepLen(a); b++) sc.runCue(a, b, true); }
      sc.pos = { i, k: -1 }; hl(i, -1, 'read');
      F.sd = opts.sd || 1800;
      (async () => { for (let b = 0; b < sc.stepLen(i); b++) { sc.pos.k = b; await sc.runCue(i, b, false); } })();
    };
    /** narration hook: sentence (i,k) starts */
    sc.sentence = (i, k, sdMs) => {
      F.sd = sdMs || 2400;
      if (sc.pos.i === i && k === sc.pos.k + 1 && k > 0) { /* continue */ }
      else if (sc.pos.i === i && k === 0 && sc.pos.k === -1) { }
      else if (!(i === sc.pos.i + 1 && k === 0)) { F.token++; sc.rebuildAt(i, k - 1, true); }
      else if (k === 0 && i === sc.pos.i + 1 && sc.pos.k < sc.stepLen(sc.pos.i) - 1) { F.token++; sc.rebuildAt(i - 1, sc.stepLen(i - 1) - 1, true); }
      sc.pos = { i, k }; hl(i, k, 'speak'); sc.runCue(i, k, false);
    };
    sc.stepStart = (i) => { if (sc.pos.i !== i) { /* handled in sentence */ } };
    prev.onclick = () => { ctxApi.userTook(); sc.goStep(Math.max(0, sc.pos.i - 1)); };
    next.onclick = () => { ctxApi.userTook(); sc.goStep(Math.min(sc.steps.length - 1, sc.pos.i + 1)); };
    replay.onclick = () => { ctxApi.userTook(); sc.goStep(Math.max(0, sc.pos.i)); };
    nar.onclick = () => ctxApi.narrateScene(sc);
    // initial state: build and show the final-ish first step statically
    sc.init = () => { sc.buildFresh(); sc.rebuildAt(0, 0, true); hl(0, -1, 'read'); };
    return sc;
  }

  /* ------------------------------ exercises ------------------------------ */
  function mountExercise(def, lec) {
    const seed0 = (Math.random() * 1e6) | 0;
    let seed = seed0, state = null, solved = false;
    const num = def._n;
    const body = h('div', { class: 'ex-body' }), acts = h('div', { class: 'ex-actions' }), ans = h('div', { class: 'ans', hidden: true });
    const tag = h('span', { class: 'chip' }, '#' + seed);
    const root = h('div', { class: 'ex' },
      h('div', { class: 'ex-head' }, h('b', {}, '✎ ' + (def.title || 'Exercise')), h('span', { class: 'sp' }), def.random === false ? null : tag), body, acts, ans);
    function load() {
      const r = rng(seed); state = def.gen(r, Course); solved = false;
      body.textContent = ''; acts.textContent = ''; ans.hidden = true; ans.textContent = ''; tag.textContent = '#' + seed;
      const pr = h('div', { class: 'prompt' });
      if (typeof state.prompt === 'string') pr.innerHTML = state.prompt; else if (state.prompt) pr.append(state.prompt);
      body.append(pr);
      let fig = null;
      if (state.figure) {
        const svg = document.createElementNS(NS, 'svg'); const F = new Fig(svg, state.figure.w || 600, state.figure.h || 300);
        F.instant = true; state.figure.draw(F); body.append(h('div', { class: 'widget-canvas', style: { marginTop: '12px', borderRadius: '12px' } }, svg)); fig = F;
      }
      let input = null, verdict = h('span', { class: 'verdict' });
      if (state.check) {
        input = h('input', { type: state.check.type === 'number' ? 'number' : 'text', step: 'any', placeholder: state.check.placeholder || 'your answer', 'aria-label': 'your answer' });
        input.addEventListener('keydown', e => { if (e.key === 'Enter') chk.click(); });
        const chk = h('button', { class: 'btn primary', onclick: () => {
          const v = input.value.trim(); if (v === '') return;
          let ok = false;
          if (state.check.type === 'number') ok = Math.abs(parseFloat(v) - state.check.answer) <= (state.check.tol ?? 0.01);
          else ok = String(v).toLowerCase().replace(/\s+/g, '') === String(state.check.answer).toLowerCase().replace(/\s+/g, '');
          verdict.textContent = ok ? '✓ Correct' : '✗ Not yet, try again or show the answer'; verdict.className = 'verdict ' + (ok ? 'ok' : 'bad');
          if (ok) { solved = true; store.set('done.' + lec.id + '.' + num, true); }
        } }, 'Check');
        acts.append(input, chk, verdict);
      }
      const showB = h('button', { class: 'btn', onclick: () => { ans.hidden = !ans.hidden; showB.textContent = ans.hidden ? 'Show the answer' : 'Hide the answer'; if (!ans.hidden && !ans.textContent) { ans.append(h('h5', {}, 'Answer and explanation')); const a = h('div'); if (typeof state.answer === 'string') a.innerHTML = state.answer; else if (state.answer) a.append(state.answer); ans.append(a); Course.typeset(ans); if (state.answerFigure) { const svg = document.createElementNS(NS, 'svg'); const F = new Fig(svg, state.answerFigure.w || 600, state.answerFigure.h || 300); F.instant = true; state.answerFigure.draw(F); ans.append(h('div', { class: 'widget-canvas', style: { marginTop: '10px', borderRadius: '10px' } }, svg)); } } } }, 'Show the answer');
      const newB = def.random === false ? null : h('button', { class: 'btn', onclick: () => { seed = (Math.random() * 1e6) | 0; load(); } }, '🎲 New random problem');
      const hint = state.hint ? h('button', { class: 'btn small', onclick: () => { hint.replaceWith(h('div', { class: 'note', html: '💡 ' + state.hint })); } }, 'Hint') : null;
      acts.append(...[hint, showB, newB].filter(Boolean));
      Course.typeset(root);
    }
    load();
    return root;
  }
  function mountQuiz(def) {
    const root = h('div', { class: 'ex qz' });
    root.append(h('div', { class: 'ex-head' }, h('b', {}, '? Check your understanding')),
      h('div', { class: 'ex-body' }, h('div', { class: 'prompt', html: def.q }),
        h('div', { class: 'opts' }, def.options.map((o, i) => h('button', { class: 'opt', onclick: e => {
          if (root.classList.contains('done')) return;
          const btns = $$('.opt', root); btns.forEach((b, j) => { if (j === def.correct) b.classList.add('good'); });
          if (i !== def.correct) e.currentTarget.classList.add('wrong'); root.classList.add('done'); } }, h('span', { html: o })))),
        h('div', { class: 'why note', html: '<b>' + 'Why: ' + '</b>' + (def.why || '') })));
    return root;
  }

  /* ------------------------------ python cells (Pyodide, lazy) ------------------------------ */
  let pyPromise = null;
  function getPy(statusEl) {
    if (pyPromise) return pyPromise;
    pyPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      s.onload = async () => { try { statusEl && (statusEl.textContent = 'Loading Python (about 10 MB, once)…'); const py = await loadPyodide(); await py.loadPackage(['numpy']); resolve(py); } catch (e) { reject(e); } };
      s.onerror = () => reject(new Error('Could not load Python runtime (are you offline?)'));
      document.head.append(s);
    });
    return pyPromise;
  }
  function mountPy(def) {
    const ta = h('textarea', { spellcheck: 'false', 'aria-label': 'Python code' }); ta.value = def.code.replace(/^\n/, '');
    const out = h('pre', { class: 'out' }, 'Output appears here.');
    const status = h('span', { class: 'chip clo' }, 'Python in your browser');
    const run = h('button', { class: 'btn primary small', onclick: async () => {
      out.className = 'out'; out.textContent = 'Running…';
      try {
        const py = await getPy(out); out.textContent = 'Running…';
        py.runPython('import sys, io\n__buf = io.StringIO()\nsys.stdout = __buf\nsys.stderr = __buf');
        let res; try { res = await py.runPythonAsync(ta.value); } catch (e) { out.className = 'out err'; out.textContent = String(e.message || e).split('\n').slice(-6).join('\n'); return; }
        const printed = py.runPython('__buf.getvalue()');
        out.textContent = (printed || '') + (res !== undefined && res !== null && String(res) !== 'undefined' ? '\n=> ' + res : '') || '(no output)';
      } catch (e) { out.className = 'out err'; out.textContent = String(e.message || e); }
    } }, '▶ Run');
    const reset = h('button', { class: 'btn small', onclick: () => { ta.value = def.code.replace(/^\n/, ''); } }, 'Reset');
    const bar = h('div', { class: 'bar' }, run, reset, status);
    const root = h('div', { class: 'pycell' }, def.title ? h('div', { class: 'ex-head' }, h('b', {}, '⌨ ' + def.title)) : null, ta, bar, out);
    if (def.solution) {
      const ans = h('div', { class: 'ans', hidden: true }, h('h5', {}, 'Solution'), h('pre', { class: 'code' }, def.solution.replace(/^\n/, '')), def.explain ? h('div', { html: def.explain }) : null);
      const sb = h('button', { class: 'btn small', onclick: () => { ans.hidden = !ans.hidden; sb.textContent = ans.hidden ? 'Show the solution' : 'Hide the solution'; } }, 'Show the solution');
      bar.append(sb); root.append(ans);
    }
    return root;
  }

  /* ------------------------------ math ------------------------------ */
  Course.typeset = function (root) {
    if (window.renderMathInElement) { try { renderMathInElement(root, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) { } }
    else (Course._pendingMath = Course._pendingMath || []).push(root);
  };
  function loadKatex() {
    const css = h('link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css' }); document.head.append(css);
    const a = document.createElement('script'); a.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'; a.defer = true;
    a.onload = () => { const b = document.createElement('script'); b.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js'; b.onload = () => { (Course._pendingMath || []).forEach(r => Course.typeset(r)); Course._pendingMath = []; }; document.head.append(b); };
    document.head.append(a);
  }

  /* ------------------------------ player ------------------------------ */
  function makePlayer(lecScenes, lec) {
    const P = h('div', { class: 'player', hidden: true, role: 'region', 'aria-label': 'Narration player' });
    const bPrev = h('button', { 'aria-label': 'Previous step' }, '◀'), bPlay = h('button', { class: 'play' }, '▶ Play'), bNext = h('button', { 'aria-label': 'Next step' }, '▶'), bClose = h('button', { 'aria-label': 'Close player' }, '✕');
    const title = h('div', { class: 'title' }), bar = h('div', { class: 'bar' }, h('i')), status = h('div', { class: 'status' });
    const rate = h('select', { 'aria-label': 'Speed' }, ['0.8', '0.9', '1', '1.1', '1.25', '1.5'].map(v => h('option', { value: v }, v + '×')));
    rate.value = store.get('rate', '1');
    const auto = h('input', { type: 'checkbox', checked: true });
    P.append(h('div', { class: 'ctl' }, bPrev, bPlay, bNext), h('div', { class: 'mid' }, title, bar, status), h('div', { class: 'opts' }, h('label', {}, auto, ' Next scene'), rate, bClose));
    document.body.append(P);
    // flatten queue
    const queue = []; lecScenes.forEach((sc, si) => sc.steps.forEach((st, i) => queue.push({ si, sc, i })));
    let idx = 0, playing = false, audio = null, timer = null, token = 0, started = 0, estDur = 0, tickRaf = 0, curK = -1;
    const key = q => q.sc.def.id + '.' + q.i;
    function stop() { token++; clearTimeout(timer); if (audio) { audio.pause(); audio = null; } cancelAnimationFrame(tickRaf); }
    function setPlaying(v) { playing = v; bPlay.textContent = v ? '❚❚ Pause' : '▶ Play'; if (!v) queue[idx] && queue[idx].sc.hl(queue[idx].i, curK, 'read'); }
    function updateBar(f) { $('i', bar).style.width = (Math.max(0, Math.min(1, (idx + f) / queue.length)) * 100) + '%'; }
    function show() { const q = queue[idx]; title.textContent = q.sc.def.title + ' · step ' + (q.i + 1) + ' of ' + q.sc.steps.length; if (!P.hidden) q.sc.sec.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    function sentenceTimes(q) {
      const a = AUDIO[key(q)]; if (a && a.t) return a.t;
      const words = q.sc.steps[q.i].plain.map(s => s.split(/\s+/).length); const spw = 0.4; let t = 0; return words.map(w => { const s = t; t += w * spw + .25; return s; });
    }
    function speak() {
      stop(); const my = token, q = queue[idx], st = q.sc.steps[q.i], a = AUDIO[key(q)], T = sentenceTimes(q), sc = q.sc;
      curK = -1; show(); status.textContent = a ? '' : 'No audio for this step yet: reading pace.';
      const total = (a && a.d) || (T[T.length - 1] + 3);
      const fire = k => { if (k === curK || my !== token) return; curK = k; const nextT = T[k + 1] != null ? T[k + 1] : total; sc.sentence(q.i, k, Math.max(700, (nextT - T[k]) * 1000 * 0.92)); };
      const done = () => { if (my !== token) return; advance(); };
      const r = +rate.value;
      if (a && a.f) {
        audio = new Audio(a.f.startsWith('http') ? a.f : `audio/${lec.id}/${a.f}`); audio.playbackRate = r; audio.preservesPitch = true;
        audio.onended = done; audio.onerror = () => { status.textContent = 'Audio failed to load: reading pace.'; fallback(); };
        const tick = () => { if (my !== token || !audio) return; const ct = audio.currentTime; let k = 0; while (k + 1 < T.length && ct >= T[k + 1] - 0.05) k++; fire(k); updateBar(ct / (audio.duration || total)); tickRaf = requestAnimationFrame(tick); };
        audio.play().then(() => tick()).catch(e => { if (my !== token) return; if (e.name === 'NotAllowedError') { setPlaying(false); status.textContent = 'Press Play to allow audio.'; } else fallback(); });
      } else fallback();
      function fallback() {
        started = performance.now(); estDur = total / r;
        const tick = () => { if (my !== token) return; const el = (performance.now() - started) / 1000 * r; let k = 0; while (k + 1 < T.length && el >= T[k + 1]) k++; fire(k); updateBar(el / total); if (el >= total) { done(); return; } tickRaf = requestAnimationFrame(tick); };
        tick();
      }
    }
    function advance() {
      if (idx >= queue.length - 1) { setPlaying(false); status.textContent = 'Lecture complete.'; return; }
      const cur = queue[idx], nx = queue[idx + 1];
      if (nx.si !== cur.si && !auto.checked) { idx++; show(); setPlaying(false); status.textContent = 'Scene complete. Press Play to continue.'; return; }
      const my = token; timer = setTimeout(() => { if (my !== token || !playing) return; idx++; speak(); }, nx.si !== cur.si ? 900 : 350);
    }
    function go(i, play = playing) { if (!queue[i]) return; stop(); idx = Math.max(0, Math.min(queue.length - 1, i)); show(); if (play) { setPlaying(true); speak(); } else { setPlaying(false); queue[idx].sc.goStep(queue[idx].i); } }
    bPlay.onclick = () => { if (playing) { stop(); setPlaying(false); } else { setPlaying(true); speak(); } };
    bPrev.onclick = () => go(idx - 1); bNext.onclick = () => go(idx + 1);
    bClose.onclick = () => { stop(); setPlaying(false); P.hidden = true; document.body.classList.remove('narrating'); };
    rate.onchange = () => { store.set('rate', rate.value); if (audio) audio.playbackRate = +rate.value; };
    bar.onclick = e => { const r = bar.getBoundingClientRect(); go(Math.floor((e.clientX - r.left) / r.width * queue.length)); };
    document.addEventListener('keydown', e => {
      if (P.hidden || e.target.closest('input,select,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ') { e.preventDefault(); bPlay.click(); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); } else if (e.key === 'Escape') bClose.click();
    });
    return {
      userTook() { if (playing) { stop(); setPlaying(false); status.textContent = 'Paused so you can explore. Press Play to continue.'; } },
      narrateScene(sc) { const i = queue.findIndex(q => q.sc === sc); P.hidden = false; document.body.classList.add('narrating'); stop(); idx = i; setPlaying(true); speak(); },
      startAll() { P.hidden = false; document.body.classList.add('narrating'); stop(); idx = 0; setPlaying(true); speak(); }
    };
  }

  /* ------------------------------ lecture page ------------------------------ */
  Course.lecture = function (def) { Course.lectures[def.id] = def; };
  Course.widget = function (name, fn) { Course.widgets[name] = fn; };
  function topbar(extra) {
    const th = h('button', { class: 'pill ghost', title: 'Light / dark', 'aria-label': 'Toggle dark mode', onclick: () => { const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', nx); store.set('theme', nx); } }, '◐');
    return h('header', { class: 'top' }, h('a', { class: 'brand', href: './' }, h('i', {}, 'AI'), 'Artificial Intelligence · BCS 407'), h('nav', {}, extra, th));
  }
  function applyTheme() { const t = store.get('theme'); if (t) document.documentElement.setAttribute('data-theme', t); }
  Course.mount = async function (id) {
    applyTheme(); loadKatex();
    const lec = Course.lectures[id]; const app = $('#app');
    if (!lec) { app.textContent = 'Unknown lecture: ' + id; return; }
    document.title = (lec.kind === 'lab' ? 'Lab ' : 'Lecture ') + (lec.num || '') + ' · ' + lec.title + ' · AI';
    await loadAudio(id);
    const COURSE = window.COURSE || { weeks: [] };
    // neighbours
    const order = COURSE.order || []; const pos = order.indexOf(id);
    const prevId = order[pos - 1], nextId = order[pos + 1];
    const label = i => (COURSE.titles && COURSE.titles[i]) || i;
    const scenes = [], chapterEls = [];
    const player = { userTook() { }, narrateScene() { }, startAll() { } };
    const api = { userTook: () => player.userTook(), narrateScene: sc => player.narrateScene(sc) };
    const main = h('main', { class: 'content' });
    const head = h('div', { class: 'lec-head' },
      h('div', { class: 'kick' }, (lec.kind === 'lab' ? 'Lab ' : 'Lecture ') + (lec.num || '') + (lec.week ? ' · Week ' + lec.week : '')),
      h('h1', {}, lec.title), lec.lede ? h('p', { class: 'lede' }, lec.lede) : null,
      h('div', { class: 'ch-actions' }, h('button', { class: 'pill primary', onclick: () => player.startAll() }, '▶ Play the full ' + (lec.kind === 'lab' ? 'lab' : 'lecture')), ' ',
        (lec.clos || []).map(c => h('span', { class: 'chip clo', style: { marginLeft: '6px' } }, 'CLO ' + c))),
      lec.goals ? h('div', { class: 'goals' }, h('b', {}, 'After this ' + (lec.kind === 'lab' ? 'lab' : 'lecture') + ' you can:'), h('ul', {}, lec.goals.map(g => h('li', { html: g })))) : null);
    main.append(head);
    let exN = 0;
    lec.chapters.forEach((ch, ci) => {
      const sec = h('section', { class: 'chapter', id: 'ch-' + ch.id }, h('h2', {}, h('span', {}, String(ci + 1).padStart(2, '0')), ch.title));
      (ch.blocks || []).forEach(b => {
        if (b.scene) { const s = buildScene(b.scene, lec, api); scenes.push(s); sec.append(s.sec); }
        else if (b.html) sec.append(h('div', { html: b.html }));
        else if (b.note) sec.append(h('div', { class: 'note', html: b.note }));
        else if (b.deeper) sec.append(h('details', { class: 'deeper' }, h('summary', {}, '▸ Go deeper: ' + b.deeper.title), h('div', { html: b.deeper.html })));
        else if (b.code) sec.append(h('pre', { class: 'code' }, b.code.replace(/^\n/, '')));
        else if (b.quiz) sec.append(mountQuiz(b.quiz));
        else if (b.exercise) { b.exercise._n = exN++; sec.append(mountExercise(b.exercise, lec)); }
        else if (b.py) sec.append(mountPy(b.py));
        else if (b.widget) {
          const fn = Course.widgets[b.widget];
          const box = h('div', { class: 'widget' });
          if (fn) { try { fn(box, b.opts || {}, Course); } catch (e) { box.textContent = 'Widget error: ' + e.message; console.error(e); } } else box.textContent = 'Missing widget ' + b.widget;
          sec.append(box);
        }
      });
      main.append(sec); chapterEls.push(sec);
    });
    // rail
    const rail = h('aside', { class: 'rail' }, h('div', { class: 'tag' }, 'In this ' + (lec.kind === 'lab' ? 'lab' : 'lecture')),
      lec.chapters.map((c, i) => h('a', { href: '#ch-' + c.id, 'data-ch': c.id }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), c.title)),
      h('div', { class: 'prev-next' },
        prevId ? h('a', { class: 'pill', href: pageOf(prevId) }, '← ' + label(prevId)) : null,
        nextId ? h('a', { class: 'pill', href: pageOf(nextId) }, label(nextId) + ' →') : null,
        h('a', { class: 'pill ghost', href: './#plan' }, '☰ Weekly plan')));
    app.textContent = ''; app.append(topbar(), h('div', { class: 'lec' }, rail, main));
    scenes.forEach(s => s.init());
    Object.assign(player, makePlayer(scenes, lec)); api.userTook = () => player.userTook(); api.narrateScene = sc => player.narrateScene(sc);
    Course.typeset(main);
    // scroll spy
    const links = $$('.rail a[data-ch]');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.dataset.ch === e.target.id.slice(3))); }), { rootMargin: '-20% 0px -70% 0px' });
    chapterEls.forEach(c => io.observe(c));
    if (location.hash) { const t = $(location.hash); t && setTimeout(() => t.scrollIntoView(), 120); }
    Course.current = { lec, scenes, player };
  };
  function pageOf(id) { return (id.startsWith('lab') ? 'lab.html?id=' : 'lecture.html?id=') + id; }
  Course.pageOf = pageOf;

  /* ------------------------------ home page ------------------------------ */
  Course.home = function (C) {
    applyTheme(); window.COURSE = C;
    const app = $('#app');
    document.title = C.title + ' · ' + C.code;
    const lectureLink = (id) => h('a', { class: 'chip', href: pageOf(id) }, '▶ Lecture ' + (C.titles && C.titles[id + '_n'] || ''));
    const rows = C.weeks.map(w => {
      const links = [];
      if (w.lecture) links.push(h('a', { class: 'pill', href: pageOf(w.lecture) }, '▶ Open the lecture'));
      if (w.lab) links.push(h('a', { class: 'pill', style: { color: 'var(--accent2)' }, href: pageOf(w.lab) }, '⚗ Open the lab: ' + w.labTitle));
      const tr = h('tr', { id: 'w' + w.n },
        h('td', { class: 'wk' }, String(w.n)),
        h('td', { class: 'topic' }, h('b', {}, w.title), w.bullets && w.bullets.length ? h('ul', {}, w.bullets.map(b => h('li', {}, b))) : null, h('div', { class: 'links', style: { marginTop: '8px' } }, links)),
        h('td', {}, (w.clos || []).map(c => h('span', { class: 'chip clo', style: { marginRight: '4px' } }, 'CLO ' + c))),
        h('td', {}, w.assessment ? h('span', { class: 'chip exam' }, w.assessment) : null),
        h('td', { html: w.ref || '' }));
      return tr;
    });
    app.textContent = '';
    app.append(topbar(h('a', { class: 'pill', href: '#plan' }, 'Weekly plan'), h('a', { class: 'pill', href: '#clos' }, 'Outcomes')),
      h('div', { class: 'hero' }, h('div', { class: 'kick' }, C.code + ' · ' + C.school), h('h1', {}, C.title), h('p', { class: 'lead' }, C.lede),
        h('div', { class: 'meta' }, C.meta.map(m => h('span', {}, m))),
        h('div', { style: { marginTop: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap' } }, h('a', { class: 'pill primary', href: pageOf(C.weeks[0].lecture) }, '▶ Start with Lecture 1'), h('a', { class: 'pill', href: '#plan' }, 'See the weekly plan'))),
      h('div', { class: 'wrap' },
        h('div', { class: 'card', id: 'clos' }, h('h2', {}, 'Course learning outcomes'), h('p', { style: { color: 'var(--muted)' } }, 'On successful completion of this course, the student will be able to:'),
          h('div', { class: 'clos' }, C.clos.map((c, i) => h('div', { class: 'clo' }, h('b', {}, 'CLO ' + (i + 1)), h('div', {}, c))))),
        h('div', { class: 'card', id: 'plan' }, h('h2', {}, 'Weekly plan: lectures and labs'), h('p', { style: { color: 'var(--muted)' } }, 'Each week has two lecture hours and two lab hours. Click a week to open its narrated lecture or its lab.'),
          h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'plan' }, h('thead', {}, h('tr', {}, ['Week', 'Topic and lab', 'CLOs', 'Assessment', 'Reading'].map(t => h('th', {}, t)))), h('tbody', {}, rows)))),
        h('div', { class: 'card' }, h('h2', {}, 'Assessment'), h('div', { class: 'assess' }, C.assessment.map(a => h('div', {}, h('b', {}, a[1] + '%'), a[0])))),
        h('div', { class: 'card' }, h('h2', {}, 'Textbooks'), h('ul', {}, C.books.map(b => h('li', { html: b }))))),
      h('div', { class: 'footer' }, C.footer));
    if (location.hash) { const t = $(location.hash); t && setTimeout(() => t.scrollIntoView(), 100); }
  };
})();

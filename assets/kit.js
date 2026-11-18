/* ============================================================================
   SVG kit for lectures: graphs, priority queues, trees, call-outs, tables, bars.
   All elements are created inside a Fig (Course.Fig) and animate through F.to().
   ============================================================================ */
(function () {
  const K = (Course.kit = {});
  const ST = {   // node visual states
    idle: { fill: 'var(--c-node)', stroke: 'var(--c-node-line)', sw: 1.8 },
    open: { fill: 'var(--c-open)', stroke: 'var(--c-b)', sw: 3 },
    closed: { fill: 'var(--c-closed)', stroke: 'var(--c-a)', sw: 2.4 },
    current: { fill: 'var(--c-cur)', stroke: 'var(--c-c)', sw: 4 },
    start: { fill: 'var(--c-start)', stroke: '#16a34a', sw: 3 },
    goal: { fill: 'var(--c-goal)', stroke: '#dc2626', sw: 3 },
    path: { fill: 'var(--c-path)', stroke: 'var(--c-c)', sw: 3.5 },
    dim: { fill: 'var(--c-node)', stroke: 'var(--c-soft)', sw: 1.2 }
  };
  K.ST = ST;

  /** Graph: spec = {nodes:{S:{x,y,label?,sub?}}, edges:[[a,b,cost,{dir:true,curve:0,lx,ly}]], r:22}
      returns an object with node/edge groups and animated state setters. */
  K.graph = function (F, spec, parent) {
    const G = { F, nodes: {}, edges: [], r: spec.r || 23 };
    const layerE = F.g({}, parent), layerN = F.g({}, parent), layerL = F.g({}, parent);
    for (const e of spec.edges) {
      const [a, b, cost, o = {}] = e, A = spec.nodes[a], B = spec.nodes[b];
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, r = G.r + (o.dir ? 4 : 0);
      const x1 = A.x + ux * (G.r - 2), y1 = A.y + uy * (G.r - 2), x2 = B.x - ux * r, y2 = B.y - uy * r;
      const cv = o.curve || 0, mx = (x1 + x2) / 2 - uy * cv, my = (y1 + y2) / 2 + ux * cv;
      const col = 'var(--c-node-line)';
      const line = F.path(cv ? `M${x1},${y1} Q${mx},${my} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`, { stroke: col, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, layerE);
      if (o.dir) line.setAttribute('marker-end', F.arrowMarker(col));
      let lab = null;
      if (cost != null && cost !== '') {
        const lx = (o.lx != null ? o.lx : (cv ? (x1 + 2 * mx + x2) / 4 : (x1 + x2) / 2)), ly = (o.ly != null ? o.ly : (cv ? (y1 + 2 * my + y2) / 4 : (y1 + y2) / 2));
        const g = F.g({ transform: `translate(${lx},${ly})` }, layerL); g.__t = { x: lx, y: ly, s: 1, r: 0 };
        const w = String(cost).length * 8 + 14;
        F.rect(-w / 2, -11, w, 22, { rx: 11, fill: 'var(--fig-bg)', stroke: 'var(--c-soft)', 'stroke-width': 1.2 }, g);
        F.text(0, 0.5, cost, { size: 13, weight: 700, cls: 'mono' }, g); lab = g;
      }
      G.edges.push({ a, b, line, lab, col, o });
    }
    for (const [name, n] of Object.entries(spec.nodes)) {
      const g = F.g({ transform: `translate(${n.x},${n.y})` }, layerN); g.__t = { x: n.x, y: n.y, s: 1, r: 0 };
      const halo = F.circle(0, 0, G.r + 7, { fill: 'none', stroke: 'var(--c-c)', 'stroke-width': 3, opacity: 0 }, g);
      const c = F.circle(0, 0, G.r, { fill: 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 1.8, filter: 'url(#fx-soft)' }, g);
      const t = F.text(0, n.sub != null ? -4 : 0.5, n.label || name, { size: 16, weight: 750 }, g);
      let sub = null; if (n.sub != null) sub = F.text(0, 11, n.sub, { size: 11, cls: 'mono', weight: 600 }, g);
      G.nodes[name] = { g, c, t, sub, halo, spec: n, state: 'idle' };
    }
    G.state = (name, st, ms = 450) => { const nd = G.nodes[name], s = ST[st]; nd.state = st; return F.to(nd.c, { fill: s.fill, stroke: s.stroke, 'stroke-width': s.sw }, ms, 'out'); };
    G.pulse = (name) => F.pulse(G.nodes[name].g, 1, 600);
    G.ring = (name, on = true, ms = 300) => F.to(G.nodes[name].halo, { opacity: on ? 1 : 0 }, ms);
    G.sub = (name, txt) => { const nd = G.nodes[name]; if (nd.sub) F.setText(nd.sub, txt, 0, 12); };
    G.edge = (a, b) => G.edges.find(e => (e.a === a && e.b === b) || (!e.o.dir && e.a === b && e.b === a));
    G.edgeState = (a, b, st, ms = 400) => { const e = G.edge(a, b); if (!e) return Promise.resolve(); const col = st === 'hot' ? 'var(--c-b)' : st === 'path' ? '#f59e0b' : st === 'dim' ? 'var(--c-grid)' : 'var(--c-node-line)'; const w = st === 'hot' ? 4.2 : st === 'path' ? 5.5 : 2.4; if (e.o.dir) e.line.setAttribute('marker-end', F.arrowMarker(col)); return F.to(e.line, { stroke: col, 'stroke-width': w }, ms, 'out'); };
    G.flow = async (a, b, color = 'var(--c-b)', ms = 650) => { const e = G.edge(a, b); if (!e) return; const dotc = F.circle(0, 0, 6.5, { fill: color, stroke: '#fff', 'stroke-width': 2, filter: 'url(#fx-glow)' }, layerL); dotc.__t = { x: 0, y: 0, s: 1, r: 0 }; if (e.a === b) { const len = e.line.getTotalLength(); } const rev = e.a !== a; await F.along(dotc, e.line, ms); if (!F.instant) dotc.remove(); else dotc.remove(); };
    return G;
  };

  /** Priority-queue / list panel. rows: [{id, cols:['A','g=1','f=6'], tone?}] */
  K.queue = function (F, x, y, w, title, o = {}) {
    const Q = { F, rows: new Map(), x, y, w, rh: o.rh || 30 };
    const g = F.g({ transform: `translate(${x},${y})` });
    F.rect(0, 0, w, 56 + (o.maxRows || 6) * Q.rh, { rx: 12, fill: 'var(--card)', stroke: 'var(--line)', 'stroke-width': 1.3, filter: 'url(#fx-soft)' }, g);
    F.text(w / 2, 17, title, { size: 12.5, weight: 700, cls: 'soft' }, g).style.letterSpacing = '.06em';
    if (o.cols) o.cols.forEach((c, i) => F.text(o.colX[i], 38, c, { size: 11.5, weight: 600, cls: 'soft', anchor: 'middle' }, g));
    Q.g = g;
    Q.set = async (list, ms = 450) => {     // list: [{id, cols:[...], tone}] in order
      const keep = new Set(list.map(r => r.id));
      for (const [id, r] of Q.rows) if (!keep.has(id)) { F.to(r.g, { opacity: 0, tx: r.g.__t.x + 24 }, ms * .7); setTimeout(() => r.g.remove(), F.instant ? 0 : ms); Q.rows.delete(id); if (F.instant) r.g.remove(); }
      const jobs = [];
      list.forEach((r, i) => {
        const ty = 62 + i * Q.rh; let row = Q.rows.get(r.id);
        if (!row) {
          const rg = F.g({ transform: `translate(${-30},${ty})` }, g); rg.__t = { x: -30, y: ty, s: 1, r: 0 }; rg.style.opacity = 0;
          const bg = F.rect(8, -13, w - 16, 26, { rx: 8, fill: 'var(--fig-bg)', stroke: 'var(--line)' }, rg);
          const texts = (r.cols || []).map((c, k) => F.text(o.colX ? o.colX[k] : 20 + k * 50, 0.5, c, { size: 13, weight: 650, cls: 'mono' }, rg));
          row = { g: rg, bg, texts }; Q.rows.set(r.id, row); rg.style.opacity = 0; F.to(rg, { opacity: 1, tx: 0, ty }, ms, 'out');
        } else { jobs.push(F.to(row.g, { tx: 0, ty }, ms, 'io')); (r.cols || []).forEach((c, k) => row.texts[k] && F.setText(row.texts[k], c, o.colX ? o.colX[k] : 20 + k * 50, 14)); }
        const tone = i === 0 && o.highlightFirst !== false ? 'var(--c-open)' : 'var(--fig-bg)'; F.to(row.bg, { fill: tone, stroke: i === 0 && o.highlightFirst !== false ? 'var(--c-b)' : 'var(--line)' }, ms);
      });
      return Promise.all(jobs);
    };
    return Q;
  };

  /** Call-out bubble with a pointer; returns a group (fade it in/out) */
  K.callout = function (F, x, y, text, o = {}) {
    const w = o.w || Math.max(...String(text).split('\n').map(s => s.length)) * 7.6 + 26, n = String(text).split('\n').length, hh = n * 18 + 16;
    const g = F.g({ transform: `translate(${x},${y})` }); g.__t = { x, y, s: 1, r: 0 };
    const tone = o.tone || 'accent', col = tone === 'warn' ? 'var(--warn)' : tone === 'bad' ? 'var(--bad)' : tone === 'ok' ? 'var(--ok)' : 'var(--accent2)';
    const bg = tone === 'warn' ? 'var(--warn-bg)' : tone === 'bad' ? 'var(--bad-bg)' : tone === 'ok' ? 'var(--ok-bg)' : 'var(--accent2-bg)';
    F.rect(-w / 2, -hh / 2, w, hh, { rx: 10, fill: bg, stroke: col, 'stroke-width': 1.6, filter: 'url(#fx-soft)' }, g);
    F.text(0, 0.5, text, { size: o.size || 13, weight: 650, fill: col, lh: 18 }, g);
    g.style.opacity = o.show ? 1 : 0; return g;
  };

  /** Tree: spec = {nodes:{id:{x,y,label,kind:'max'|'min'|'leaf'}}, edges:[[a,b]]} */
  K.tree = function (F, spec, parent) {
    const T = { F, nodes: {}, edges: {} }, le = F.g({}, parent), ln = F.g({}, parent);
    for (const [a, b] of spec.edges) { const A = spec.nodes[a], B = spec.nodes[b]; T.edges[a + '>' + b] = F.line(A.x, A.y + 14, B.x, B.y - 14, { stroke: 'var(--c-node-line)', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, le); }
    for (const [id, n] of Object.entries(spec.nodes)) {
      const g = F.g({ transform: `translate(${n.x},${n.y})` }, ln); g.__t = { x: n.x, y: n.y, s: 1, r: 0 };
      let shape;
      if (n.kind === 'max') shape = F.path('M0,-17 L17,12 L-17,12 Z', { fill: 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 2, 'stroke-linejoin': 'round', filter: 'url(#fx-soft)' }, g);
      else if (n.kind === 'min') shape = F.path('M0,17 L17,-12 L-17,-12 Z', { fill: 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 2, 'stroke-linejoin': 'round', filter: 'url(#fx-soft)' }, g);
      else shape = F.rect(-15, -13, 30, 26, { rx: 7, fill: 'var(--c-node)', stroke: 'var(--c-node-line)', 'stroke-width': 2, filter: 'url(#fx-soft)' }, g);
      const t = F.text(0, n.kind === 'max' ? 4 : n.kind === 'min' ? -3 : 0.5, n.label != null ? n.label : '', { size: 13, weight: 750, cls: 'mono' }, g);
      T.nodes[id] = { g, shape, t, spec: n };
    }
    T.state = (id, st, ms = 400) => { const s = ST[st]; return F.to(T.nodes[id].shape, { fill: s.fill, stroke: s.stroke, 'stroke-width': s.sw }, ms, 'out'); };
    T.edgeState = (a, b, st, ms = 350) => { const e = T.edges[a + '>' + b]; if (!e) return Promise.resolve(); const col = st === 'pruned' ? 'var(--bad)' : st === 'hot' ? 'var(--c-b)' : st === 'best' ? '#f59e0b' : st === 'dim' ? 'var(--c-grid)' : 'var(--c-node-line)'; return F.to(e, { stroke: col, 'stroke-width': st === 'best' ? 4.5 : st === 'hot' ? 3.6 : 2.2, opacity: st === 'pruned' ? 0.45 : 1 }, ms); };
    T.label = (id, txt) => F.setText(T.nodes[id].t, txt, 0, 14);
    return T;
  };

  /** Simple vertical/horizontal bars: values -> rects with labels. */
  K.bars = function (F, x, y, w, hgt, items, o = {}) {
    const g = F.g({ transform: `translate(${x},${y})` }), n = items.length, bw = Math.min(54, (w / n) * 0.62), max = o.max || Math.max(...items.map(i => i.v)) || 1;
    F.line(0, hgt, w, hgt, { stroke: 'var(--c-soft)', 'stroke-width': 1.5 }, g);
    const out = items.map((it, i) => {
      const cx = (i + .5) * (w / n), bh = hgt * it.v / max;
      const r = F.rect(cx - bw / 2, hgt - bh, bw, bh, { rx: 6, fill: it.color || 'var(--c-b)', filter: 'url(#fx-soft)' }, g);
      const v = F.text(cx, hgt - bh - 12, it.v, { size: 13, weight: 750, cls: 'mono' }, g);
      F.text(cx, hgt + 16, it.label, { size: 12, cls: 'soft' }, g);
      return { r, v, cx, bh };
    });
    out.set = (i, val, ms = 600) => { const it = out[i], bh = hgt * val / max; F.to(it.r, { y: hgt - bh, height: bh }, ms, 'io'); F.to(it.v, { y: hgt - bh - 12 }, ms, 'io'); F.setText(it.v, val, it.cx, 14); };
    out.g = g; return out;
  };

  /** Heading + subtle underline for scene titles inside the figure */
  K.title = function (F, text, sub) {
    F.text(24, 26, text, { anchor: 'start', size: 17, weight: 750 }); if (sub) F.text(24, 46, sub, { anchor: 'start', size: 12.5, cls: 'soft' });
  };
  K.chip = function (F, x, y, text, tone = 'accent', parent) {
    const col = tone === 'warn' ? 'var(--warn)' : tone === 'ok' ? 'var(--ok)' : tone === 'bad' ? 'var(--bad)' : 'var(--accent2)'; const bg = tone === 'warn' ? 'var(--warn-bg)' : tone === 'ok' ? 'var(--ok-bg)' : tone === 'bad' ? 'var(--bad-bg)' : 'var(--accent2-bg)';
    const g = F.g({ transform: `translate(${x},${y})` }, parent); g.__t = { x, y, s: 1, r: 0 }; const w = String(text).length * 7.4 + 22;
    F.rect(-w / 2, -12, w, 24, { rx: 12, fill: bg, stroke: col, 'stroke-width': 1.3 }, g); F.text(0, 0.5, text, { size: 12.5, weight: 700, fill: col }, g); return g;
  };
})();

/* Personal lab sheet: tasks and challenges generated from the student's ID, answers typed in the page, download as Word or PDF for Moodle.
   A lab defines:  {labsheet:{ title, intro, marks, base(r){...shared random numbers...}, tasks:[{id,title,marks,kind:'task'|'challenge', gen(r,B){ return {html, code?, fields:[{k,label,type:'text'|'num'|'long'|'code'}], key?:'python that prints "ANS name value" lines'} }}]}}
   The teacher regenerates any sheet with tools/labkey.js (same ID gives the same numbers). */
(function () {
  const { h } = Course, SC = window.SheetCore, $ = (s, r = document) => r.querySelector(s);
  const LIB = { docx: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js', pdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' };
  const loaded = {};
  const loadLib = k => loaded[k] || (loaded[k] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = LIB[k]; s.onload = res; s.onerror = () => rej(new Error('Could not load the ' + (k === 'pdf' ? 'PDF' : 'Word') + ' library. Check your internet connection.')); document.head.append(s); }));
  const plain = html => { const d = document.createElement('div'); d.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|h\d)>/gi, '\n').replace(/<li>/gi, '• '); return d.textContent.replace(/\n{3,}/g, '\n\n').trim(); };
  const safe = s => String(s).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const shrink = (file, max = 1000) => new Promise(res => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, max / im.width), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res({ url: c.toDataURL('image/png'), w: c.width, h: c.height }); }; im.src = fr.result; }; fr.readAsDataURL(file); });

  Course.mountLabsheet = function (def, lec) {
    const root = h('div', { class: 'sheet' }), KEY = 'sheet.' + lec.id;
    const saved = store.get(KEY) || {};
    const name = h('input', { type: 'text', placeholder: 'Full name', 'aria-label': 'Full name', value: saved.name || '' });
    const sid = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'Student ID (digits)', 'aria-label': 'Student ID', value: saved.sid || '' });
    const msg = h('span', { class: 'verdict' });
    const body = h('div', { class: 'sheet-body' });
    const go = h('button', { class: 'btn primary', onclick: () => build() }, 'Create my lab sheet');
    root.append(h('div', { class: 'ex-head' }, h('b', {}, '📝 ' + (def.title || 'My personal lab sheet')), h('span', { class: 'sp' }), h('span', { class: 'chip' }, 'for Moodle')),
      h('div', { class: 'ex-body' },
        h('p', { html: def.intro || 'The questions below are <b>personal</b>: they are generated from your student ID, so every student gets different numbers. Do the tasks, type your answers, then download your sheet as a <b>Word</b> or <b>PDF</b> file and upload it to Moodle.' }),
        h('div', { class: 'sheet-id' }, name, sid, go, msg), body));
    let model = null;   // {meta, items:[{task, gen, fields:{k:el}, cell, imgs:[]}]}

    function build() {
      const n = name.value.trim(), id = sid.value.trim();
      if (n.length < 3) { msg.textContent = 'Please type your full name.'; msg.className = 'verdict bad'; return; }
      if (!/^\d{6,12}$/.test(id)) { msg.textContent = 'The student ID must be digits only (6 to 12 digits).'; msg.className = 'verdict bad'; return; }
      msg.textContent = ''; store.set(KEY, { name: n, sid: id, answers: (saved.sid === id ? saved.answers : {}) || {} });
      const seed = SC.seed(lec.id, id), r = SC.rng(seed), B = def.base ? def.base(r) : {};
      const code = SC.code(lec.id, id), ans = (store.get(KEY) || {}).answers || {};
      const cnt = { task: 0, challenge: 0 };
      body.textContent = ''; model = { meta: { name: n, sid: id, code, lab: lec.title, labId: lec.id, labNum: lec.num, total: def.marks || def.tasks.reduce((x, t) => x + (t.marks || 0), 0) }, items: [] };
      body.append(h('div', { class: 'sheet-head' }, h('div', {}, h('b', {}, n), ' · ' + id), h('div', { class: 'chip' }, 'Sheet code ' + code), h('div', { class: 'soft' }, 'Total: ' + (def.marks || def.tasks.reduce((s, t) => s + (t.marks || 0), 0)) + ' marks')));
      def.tasks.forEach((t, i) => {
        const g = t.gen(r, B), item = { task: t, gen: g, fields: {}, imgs: [], cell: null, no: ++cnt[t.kind === 'challenge' ? 'challenge' : 'task'] };
        const card = h('div', { class: 'sheet-task ' + (t.kind || 'task') });
        card.append(h('div', { class: 'sheet-th' }, h('span', { class: 'chip ' + (t.kind === 'challenge' ? 'warn' : 'clo') }, (t.kind === 'challenge' ? 'Challenge ' : 'Task ') + item.no), h('b', {}, ' ' + t.title), h('span', { class: 'sp' }), h('span', { class: 'soft' }, (t.marks != null ? t.marks + ' mark' + (t.marks === 1 ? '' : 's') : ''))), h('div', { class: 'prompt', html: g.html }));
        if (g.code) { item.cell = Course.mountPy({ title: 'Your code (already contains your numbers)', code: g.code }); card.append(item.cell); }
        const fl = h('div', { class: 'sheet-fields' });
        (g.fields || []).forEach(f => {
          const key = t.id + '.' + f.k, prev = ans[key];
          const el = (f.type === 'long' || f.type === 'code') ? h('textarea', { class: f.type === 'code' ? 'mono' : '', rows: f.type === 'code' ? 7 : 3, spellcheck: 'false', 'aria-label': f.label }) : h('input', { type: f.type === 'num' ? 'text' : 'text', inputmode: f.type === 'num' ? 'decimal' : 'text', 'aria-label': f.label });
          if (prev != null) el.value = prev;
          el.addEventListener('input', () => { const s = store.get(KEY) || {}; s.answers = s.answers || {}; s.answers[key] = el.value; store.set(KEY, s); });
          item.fields[f.k] = el; fl.append(h('label', { class: 'sheet-f ' + (f.type || 'text') }, h('span', {}, f.label), el));
        });
        card.append(fl);
        const shots = h('div', { class: 'sheet-shots' }), file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
        const addImgs = async files => { for (const f of files) { if (!/^image\//.test(f.type)) continue; const im = await shrink(f); item.imgs.push(im); const fig = h('figure', {}, h('img', { src: im.url, alt: 'screenshot' }), h('button', { class: 'btn small', onclick: () => { item.imgs.splice(item.imgs.indexOf(im), 1); fig.remove(); } }, 'Remove')); shots.append(fig); } };
        file.addEventListener('change', () => { addImgs([...file.files]); file.value = ''; });
        card.addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); addImgs(fs); } });
        card.append(h('div', { class: 'sheet-add' }, h('button', { class: 'btn small', onclick: () => file.click() }, '📷 Add a screenshot'), h('span', { class: 'soft' }, ' or paste an image (Ctrl+V). Screenshots stay in this page: download before you close it.')), file, shots);
        body.append(card); model.items.push(item);
      });
      const st = h('span', { class: 'verdict' });
      body.append(h('div', { class: 'sheet-dl' },
        h('button', { class: 'btn primary', onclick: async () => { st.textContent = 'Preparing the Word file…'; st.className = 'verdict'; try { await dlDocx(); st.textContent = '✓ Word file downloaded. Upload it to Moodle.'; st.className = 'verdict ok'; } catch (e) { st.textContent = e.message; st.className = 'verdict bad'; } } }, '⬇ Download Word (.docx)'),
        h('button', { class: 'btn', onclick: async () => { st.textContent = 'Preparing the PDF…'; st.className = 'verdict'; try { await dlPdf(); st.textContent = '✓ PDF downloaded. Upload it to Moodle.'; st.className = 'verdict ok'; } catch (e) { st.textContent = e.message; st.className = 'verdict bad'; } } }, '⬇ Download PDF'),
        st), h('p', { class: 'soft', html: 'The file name and the sheet code let your teacher check that the questions were generated from your own ID. Work on your own: a copied sheet will not match another ID.' }));
      Course.typeset && Course.typeset(body);
    }

    function collect() {
      return { meta: model.meta, items: model.items.map(it => ({
        no: it.no, title: it.task.title, kind: it.task.kind || 'task', marks: it.task.marks, text: plain(it.gen.html),
        code: it.cell ? ($('textarea', it.cell) || {}).value || '' : '', output: it.cell ? (($('pre.out', it.cell) || {}).textContent || '') : '',
        answers: (it.gen.fields || []).map(f => ({ label: f.label, type: f.type, value: it.fields[f.k].value.trim() })), imgs: it.imgs })) };
    }
    const fname = ext => `${safe(model.meta.labId)}_${safe(model.meta.sid)}_${safe(model.meta.name)}.${ext}`;
    function triggerDownload(blob, name) { if (location.hostname === 'localhost') fetch('/__save/' + name, { method: 'POST', body: blob }).catch(() => { }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

    /* ---- standard CUD lab-manual look (same colours, fonts and layout as the lab manuals of the other courses) ---- */
    const STD = { teal: '0E7C86', ink: '1F2D3D', gray: '5A6B7B', navy: '12324A', orange: 'B06A00', bg: 'F2F4F7', rule: 'C9D6E2', edge: 'E1E8F0' };
    const labTitle = M => `Lab ${String(M.labNum).padStart(2, '0')}  ${M.lab}`;
    const logoBytes = async () => new Uint8Array(await (await fetch('assets/cud-logo.png')).arrayBuffer());

    async function dlDocx() {
      await loadLib('docx'); const D = window.docx, c = collect(), M = c.meta, S = STD;
      const run = (t, o = {}) => new D.TextRun({ text: t, font: o.font || 'Calibri', size: o.size || 22, bold: o.bold, italics: o.italics, color: o.color || S.ink });
      const para = (kids, o = {}) => new D.Paragraph({ children: [].concat(kids), alignment: o.align, keepNext: o.keepNext, border: o.border, shading: o.shading, indent: o.indent, spacing: { before: o.before || 0, after: o.after == null ? 80 : o.after, line: o.line, lineRule: o.line ? D.LineRuleType.AT_LEAST : undefined } });
      const shade = (fill = S.bg) => ({ type: D.ShadingType.CLEAR, fill, color: 'auto' });
      const codeBlock = (text, bar = S.teal, font = 'Consolas', size = 19, color = S.navy) => String(text == null ? '' : text).replace(/\t/g, '    ').split('\n').map((ln, i) => para(run(ln === '' ? ' ' : ln, { font, size, color }), { after: 0, line: 250, shading: shade(), indent: { left: 220, right: 220 }, border: Object.assign({ left: { style: D.BorderStyle.SINGLE, color: bar, size: 14, space: 6 } }, i === 0 ? { top: { style: D.BorderStyle.SINGLE, color: S.edge, size: 4, space: 2 } } : {}) }));
      const label = t => para(run(t, { bold: true, size: 19, color: S.gray }), { before: 40, after: 20, keepNext: true });
      const body = t => String(t || '').split('\n').map(l => para(run(l === '' ? ' ' : l), { after: 60 }));
      const logo = await logoBytes();
      const kids = [
        para(new D.ImageRun({ data: logo, type: 'png', transformation: { width: 302, height: 111 } }), { align: D.AlignmentType.CENTER, after: 160 }),
        para(run('School of Engineering,', { size: 36, bold: true, color: '000000' }), { align: D.AlignmentType.CENTER, after: 0 }),
        para(run('Applied Science and Technology', { size: 36, bold: true, color: '000000' }), { align: D.AlignmentType.CENTER, after: 200 }),
        para(run('LABORATORY MANUAL', { size: 48, color: '000000' }), { align: D.AlignmentType.CENTER, after: 40 }),
        para(run('BCS407 Artificial Intelligence', { size: 40, color: '000000' }), { align: D.AlignmentType.CENTER, after: 0 }),
        para(run(labTitle(M), { size: 40, color: '000000' }), { align: D.AlignmentType.CENTER, after: 200 })];
      const info = [['Name', M.name], ['Student ID', M.sid], ['Sheet code', M.code], ['Date', new Date().toLocaleDateString('en-GB')]];
      info.forEach(([k, v], i) => kids.push(para([run(k + ':  ', { bold: true, color: S.teal }), run(v, { bold: k !== 'Date' && k !== 'Sheet code' })], { after: 0, line: 290, shading: shade(), indent: { left: 220, right: 220 }, border: Object.assign({ left: { style: D.BorderStyle.SINGLE, color: S.teal, size: 14, space: 6 } }, i === 0 ? { top: { style: D.BorderStyle.SINGLE, color: S.edge, size: 4, space: 2 } } : {}) })));
      kids.push(para(run(`This is my personal lab sheet. Its tasks were generated from the student ID above (total ${M.total} marks).`, { size: 22 }), { before: 160, after: 40 }));
      kids.push(para([], { border: { bottom: { style: D.BorderStyle.SINGLE, color: S.rule, size: 8, space: 1 } }, after: 160 }));
      for (const it of c.items) {
        kids.push(para([run(`${it.kind === 'challenge' ? 'Challenge' : 'Task'} ${it.no} — ${it.title}`, { bold: true, size: 26, color: S.teal }), ...(it.marks != null ? [run(`   (${it.marks} marks)`, { italics: true, size: 19, color: S.orange })] : [])], { keepNext: true, before: 240, after: 80 }));
        kids.push(...body(it.text));
        if (it.code) { kids.push(label('Your code:'), ...codeBlock(it.code), label('Output:'), ...codeBlock(it.output || '(not run)', S.gray)); }
        if (it.answers.length) {
          kids.push(label('My answers:'));
          for (const a of it.answers) {
            if (a.type === 'code') { kids.push(para(run(a.label + ':', { bold: true, color: S.teal }), { before: 60, after: 20, keepNext: true }), ...codeBlock(a.value || '(no answer)')); }
            else if (a.type === 'long') { kids.push(para(run(a.label + ':', { bold: true, color: S.teal }), { before: 60, after: 20, keepNext: true }), ...body(a.value || '(no answer)')); }
            else kids.push(para([run(a.label + ':  ', { bold: true, color: S.teal }), run(a.value || '(no answer)')], { after: 40 }));
          }
        }
        for (const im of it.imgs) { const buf = await (await fetch(im.url)).arrayBuffer(), w = Math.min(560, im.w), k = w / im.w; kids.push(para(new D.ImageRun({ data: new Uint8Array(buf), type: 'png', transformation: { width: Math.round(w), height: Math.round(im.h * k) } }), { before: 80, after: 120 })); }
      }
      const footer = new D.Footer({ children: [para([run(`BCS407 · Lab ${String(M.labNum).padStart(2, '0')} · ${M.sid} · ${M.code} · page `, { size: 16, color: S.gray }), new D.TextRun({ children: [D.PageNumber.CURRENT], size: 16, color: S.gray, font: 'Calibri' })], { align: D.AlignmentType.CENTER, after: 0 })] });
      const doc = new D.Document({ creator: M.name, title: `${M.lab} ${M.sid}`, styles: { default: { document: { run: { font: 'Calibri', size: 22, color: S.ink } } } }, sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1100, right: 1100 } } }, footers: { default: footer }, children: kids }] });
      triggerDownload(await D.Packer.toBlob(doc), fname('docx'));
    }

    async function dlPdf() {
      await loadLib('pdf'); const c = collect(), M = c.meta, S = STD, { jsPDF } = window.jspdf;
      const rgb = hex => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
      const logoUrl = await new Promise(res => { fetch('assets/cud-logo.png').then(r => r.blob()).then(b => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); });
      const doc = new jsPDF({ unit: 'mm', format: 'letter' }), PW = 215.9, PH = 279.4, ML = 19.4, MT = 19, MB = 19, W = PW - 2 * ML; let y = MT;
      const clean = t => String(t == null ? '' : t).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[−–]/g, '-').replace(/—/g, '-').replace(/×/g, 'x').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[•·]/g, '*').replace(/\t/g, '    ').replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '?');
      const room = hh => { if (y + hh > PH - MB) { doc.addPage(); y = MT; } };
      const put = (t, o = {}) => {
        const size = o.size || 10.5, lh = o.lh || size * 0.4 + 1.1; doc.setFont(o.mono ? 'courier' : 'helvetica', o.bold ? 'bold' : o.italic ? 'italic' : 'normal'); doc.setFontSize(size);
        const x0 = ML + (o.indent || 0), lines = doc.splitTextToSize(clean(t), W - (o.indent || 0) - (o.right || 0));
        lines.forEach((ln, i) => { room(lh); if (o.box) { doc.setFillColor(...rgb(S.bg)); doc.rect(x0 - 3, y - size * 0.36 - (i === 0 ? 0.6 : 0), W - (o.indent || 0) + 3, lh + (i === 0 ? 0.6 : 0), 'F'); doc.setFillColor(...rgb(o.bar || S.teal)); doc.rect(x0 - 3, y - size * 0.36 - (i === 0 ? 0.6 : 0), 0.9, lh + (i === 0 ? 0.6 : 0), 'F'); }
          doc.setTextColor(...rgb(o.color || S.ink)); doc.setFont(o.mono ? 'courier' : 'helvetica', o.bold ? 'bold' : o.italic ? 'italic' : 'normal'); doc.setFontSize(size); doc.text(ln, o.align === 'center' ? PW / 2 : x0, y, o.align === 'center' ? { align: 'center' } : undefined); y += lh; });
        y += o.after == null ? 1.5 : o.after;
      };
      const kv = (k, v) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); const kw = doc.getTextWidth(clean(k)); doc.setFont('helvetica', 'normal'); const lines = doc.splitTextToSize(clean(v), W - kw); room(5.6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...rgb(S.teal)); doc.text(clean(k), ML, y); doc.setFont('helvetica', 'normal'); doc.setTextColor(...rgb(S.ink)); doc.text(lines[0], ML + kw, y); y += 5.6; lines.slice(1).forEach(l => { room(5.6); doc.text(l, ML, y); y += 5.6; }); y += 0.6; };
      const lw = 80, lh = lw * 134 / 363; doc.addImage(logoUrl, 'PNG', (PW - lw) / 2, y, lw, lh); y += lh + 7;
      put('School of Engineering,', { size: 18, bold: true, color: '000000', align: 'center', after: 0, lh: 8 }); put('Applied Science and Technology', { size: 18, bold: true, color: '000000', align: 'center', after: 6, lh: 8 });
      put('LABORATORY MANUAL', { size: 24, color: '000000', align: 'center', after: 1, lh: 10 }); put('BCS407 Artificial Intelligence', { size: 20, color: '000000', align: 'center', after: 0, lh: 8.5 }); put(labTitle(M), { size: 20, color: '000000', align: 'center', after: 6, lh: 8.5 });
      [['Name', M.name], ['Student ID', M.sid], ['Sheet code', M.code], ['Date', new Date().toLocaleDateString('en-GB')]].forEach(([k, v]) => put(`${k}:  ${v}`, { box: true, indent: 4, size: 10.5, after: 0, lh: 6 }));
      y += 3.5; put(`This is my personal lab sheet. Its tasks were generated from the student ID above (total ${M.total} marks).`, { size: 10.5, after: 2 }); y += 1; doc.setDrawColor(...rgb(S.rule)); doc.setLineWidth(0.4); doc.line(ML, y, PW - ML, y); y += 5;
      for (const it of c.items) {
        room(30); y += 3;
        { room(10); const head = clean(`${it.kind === 'challenge' ? 'Challenge' : 'Task'} ${it.no} - ${it.title}`); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...rgb(S.teal)); doc.text(head, ML, y); if (it.marks != null) { const hw = doc.getTextWidth(head); doc.setFont('helvetica', 'italic'); doc.setFontSize(9.5); doc.setTextColor(...rgb(S.orange)); doc.text(`   (${it.marks} marks)`, ML + hw, y); } y += 8.4; }
        put(it.text, { size: 10.5, after: 2 });
        if (it.code) { put('Your code:', { size: 9.5, bold: true, color: S.gray, after: 0.6 }); put(it.code, { mono: true, size: 8.6, box: true, indent: 4, after: 2.5, lh: 4.1 }); put('Output:', { size: 9.5, bold: true, color: S.gray, after: 0.6 }); put(it.output || '(not run)', { mono: true, size: 8.6, box: true, bar: S.gray, indent: 4, color: S.navy, after: 2.5, lh: 4.1 }); }
        if (it.answers.length) { put('My answers:', { size: 9.5, bold: true, color: S.gray, after: 0.8 }); for (const a of it.answers) { if (a.type === 'code') { put(a.label + ':', { bold: true, color: S.teal, after: 0.6 }); put(a.value || '(no answer)', { mono: true, size: 8.6, box: true, indent: 4, after: 2.5, lh: 4.1, color: S.navy }); } else if (a.type === 'long') { put(a.label + ':', { bold: true, color: S.teal, after: 0.6 }); put(a.value || '(no answer)', { after: 2 }); } else { kv(a.label + ':  ', a.value || '(no answer)'); } } }
        for (const im of it.imgs) { const w = Math.min(W, im.w * 0.2646), hh = im.h * (w / im.w); room(hh + 4); doc.addImage(im.url, 'PNG', ML, y, w, hh); y += hh + 4; }
      }
      const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...rgb(S.gray)); doc.text(`BCS407 - Lab ${String(M.labNum).padStart(2, '0')} - ${M.sid} - ${M.code} - page ${i} of ${n}`, PW / 2, PH - 9, { align: 'center' }); }
      triggerDownload(doc.output('blob'), fname('pdf'));
    }

    if (saved.name && saved.sid) setTimeout(build, 0);
    return root;
  };
})();

/* The Mortgage Machine (FINAN III Unit 6, v2): receipt and verification core.
   Lifted unchanged from version 1's desk-engine.js (lines 26 to 179: helpers, seeding, payload, checksum, PNG text chunk, verify),
   so a v2 receipt carries the same data and verifies on v1's verify.html too. The v1 UI below that line is not used. */
(function (root) {
  'use strict';

  // ---------------- shared helpers (exposed as Desk.h) ----------------
  function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const normEmail = (e) => String(e || '').trim().toLowerCase();
  // Desk code: the only identity a desk has (2026-11-16: pages never ask for a name, school email or any other identifier).
  // 8 random characters, kept in this browser and printed on the receipt; Learn already knows who uploaded the receipt.
  const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fmtCode = (c) => { const n = normCode(c); return n.length === 8 ? n.slice(0, 4) + '-' + n.slice(4) : n; };
  const validCode = (c) => new RegExp('^[' + CODE_ABC + ']{8}$').test(normCode(c));
  function newCode() { const a = new Uint32Array(8); (root.crypto || { getRandomValues: (x) => { for (let i = 0; i < x.length; i++) x[i] = Math.floor(Math.random() * 4294967296); return x; } }).getRandomValues(a); return [...a].map((x) => CODE_ABC[x % CODE_ABC.length]).join(''); }
  const df = (r, t) => 1 / Math.pow(1 + r, t);
  const npv = (r, flows) => flows.reduce((s, cf, t) => s + cf * df(r, t), 0);
  const annuityFactor = (r, n) => (1 - Math.pow(1 + r, -n)) / r;
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const between = (rng, lo, hi, step) => lo + step * Math.floor(rng() * (Math.floor((hi - lo) / step) + 1));
  const round = (x, to) => Math.round(x / to) * to;
  const pct = (r) => (Math.round(r * 1000) / 10) + '%';
  const money = (x, dp) => { const v = dp ? Math.round(x * 100) / 100 : Math.round(x); const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dp ? 2 : 0, maximumFractionDigits: dp ? 2 : 0 }); return (v < 0 ? '−$' : '$') + s; };
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const wordCount = (s) => (String(s || '').trim().match(/\S+/g) || []).length;
  function parseMoney(s) {
    if (s == null) return NaN;
    let t = String(s).trim().toLowerCase().replace(/[\s,$＄]/g, '').replace(/[−–]/g, '-');
    let neg = false;
    if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
    if (t.startsWith('-')) { neg = !neg; t = t.slice(1); }
    let mult = 1;
    if (t.endsWith('%')) { mult = 0.01; t = t.slice(0, -1); }
    else if (t.endsWith('k')) { mult = 1e3; t = t.slice(0, -1); }
    else if (t.endsWith('m')) { mult = 1e6; t = t.slice(0, -1); }
    if (!/^\d*\.?\d+$/.test(t)) return NaN;
    const v = parseFloat(t) * mult; return neg ? -v : v;
  }
  /* Judge a number against an exact answer and a list of known wrong answers.
     diag: [[value, code, message], ...]. Tolerance defaults to 0.1% of scale (or $2). */
  function judgeNumber(value, exact, diag, opts) {
    opts = opts || {};
    if (!isFinite(value)) return { ok: false, code: 'unreadable', msg: opts.unreadable || 'Type a number, like 12,345 or −8,000.' };
    const scale = opts.scale != null ? opts.scale : Math.abs(exact);
    const tol = opts.tol != null ? opts.tol : Math.max(opts.minTol != null ? opts.minTol : 2, 0.001 * scale);
    if (near(value, exact, tol)) return { ok: true, code: 'ok' };
    for (const [v, code, msg] of (diag || [])) if (isFinite(v) && near(value, v, tol)) return { ok: false, code, msg };
    if (near(value, -exact, tol)) return { ok: false, code: 'sign', msg: opts.signMsg || 'The size is right but the sign is flipped.' };
    if (near(value, exact, 0.01 * Math.max(scale, 1))) return { ok: false, code: 'close', msg: opts.closeMsg || 'Close. Keep four decimal places in any factor and round only at the end.' };
    return { ok: false, code: 'other', msg: opts.otherMsg || 'Not yet. Use the help button below to see the setup.' };
  }
  function calc(expr) {
    const src = String(expr || '').replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/[$＄\s]/g, '');
    if (!src) return { ok: false, err: 'Type an expression, like 330000*0.9259 or 330000/(1.08)^5.' };
    const toks = []; let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/[0-9.]/.test(c)) { let j = i; while (j < src.length && /[0-9.,]/.test(src[j])) j++; const num = parseFloat(src.slice(i, j).replace(/,/g, '')); if (!isFinite(num)) return { ok: false, err: 'One of the numbers cannot be read.' }; toks.push({ t: 'n', v: num }); i = j; }
      else if ('+-*/^()%'.includes(c)) { toks.push({ t: c }); i++; }
      else return { ok: false, err: 'The calculator understands numbers and + − × ÷ ^ ( ) only.' };
    }
    let p = 0; const peek = () => toks[p], eat = () => toks[p++];
    function primary() { const k = eat(); if (!k) throw new Error('The expression ends too early.'); if (k.t === 'n') return k.v; if (k.t === '(') { const v = sum(); const c = eat(); if (!c || c.t !== ')') throw new Error('A closing parenthesis is missing.'); return v; } if (k.t === '-') return -power(); if (k.t === '+') return power(); throw new Error('Something is out of place near "' + k.t + '".'); }
    function postfix() { let v = primary(); while (peek() && peek().t === '%') { eat(); v /= 100; } return v; }
    function power() { const b = postfix(); if (peek() && peek().t === '^') { eat(); return Math.pow(b, power()); } return b; }
    function prod() { let v = power(); while (peek() && (peek().t === '*' || peek().t === '/')) { const o = eat().t; const w = power(); v = o === '*' ? v * w : v / w; } return v; }
    function sum() { let v = prod(); while (peek() && (peek().t === '+' || peek().t === '-')) { const o = eat().t; const w = prod(); v = o === '+' ? v + w : v - w; } return v; }
    try { const v = sum(); if (p !== toks.length) throw new Error('Something is out of place near the end.'); if (!isFinite(v)) throw new Error('That does not give a number (dividing by zero?).'); return { ok: true, value: v }; }
    catch (e) { return { ok: false, err: e.message }; }
  }
  // PNG tEXt chunk
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const KEYWORD = 'rize-receipt';
  const b64e = (s) => btoa(unescape(encodeURIComponent(s)));
  const b64d = (s) => decodeURIComponent(escape(atob(s)));
  function addTextChunk(png, text) {
    const enc = new TextEncoder(); const data = enc.encode(KEYWORD + '\0' + text); const type = enc.encode('tEXt');
    const chunk = new Uint8Array(12 + data.length); const dv = new DataView(chunk.buffer);
    dv.setUint32(0, data.length); chunk.set(type, 4); chunk.set(data, 8);
    const ci = new Uint8Array(4 + data.length); ci.set(type, 0); ci.set(data, 4); dv.setUint32(8 + data.length, crc32(ci));
    const iend = png.length - 12; const out = new Uint8Array(png.length + chunk.length);
    out.set(png.subarray(0, iend), 0); out.set(chunk, iend); out.set(png.subarray(iend), iend + chunk.length); return out;
  }
  function readTextChunk(png) {
    const dv = new DataView(png.buffer, png.byteOffset, png.byteLength); const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) if (png[i] !== sig[i]) return null;
    let off = 8; const dec = new TextDecoder('latin1');
    while (off + 8 <= png.length) { const len = dv.getUint32(off); const type = dec.decode(png.subarray(off + 4, off + 8)); if (type === 'tEXt') { const body = dec.decode(png.subarray(off + 8, off + 8 + len)); const z = body.indexOf('\0'); if (body.slice(0, z) === KEYWORD) return body.slice(z + 1); } if (type === 'IEND') break; off += 12 + len; }
    return null;
  }

  /* ladder (added 2026-11-11, interactive-assignments rules 26 and 29): one calculation per line, as a table whose rows are
     Line | Calculation | Result. The same call draws the worked example (opts.filled: every result shown, read-only) and the
     student's version (lines with input: true become .rowin inputs judged row by row through judgeTask's rowRes, so the
     engine's existing row marks, saved rows and verify all apply). A faded example is the student's version with most lines given.
     lines: [{ label, calc (html), value (number or text), input, fmt: 'money' | 'factor' | 'pct' | 'num' (a plain number like a P/E) | 'text' }]
     opts: { caption, filled, rows (saved inputs, indexed like lines) } */
  function ladder(lines, opts) {
    opts = opts || {};
    const show = (l) => (l.fmt === 'factor' ? Number(l.value).toFixed(4) : l.fmt === 'pct' ? pct(l.value) : l.fmt === 'text' ? String(l.value) : l.fmt === 'num' ? String(+Number(l.value).toFixed(1)) : money(l.value, l.dp));
    const esc2 = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const body = lines.map((l, i) => {
      let res;
      if (opts.filled || !l.input) res = `<b>${show(l)}</b>`;
      else res = `<label class="sr-only" for="r${i}">${esc2(l.label)}</label><input id="r${i}" class="rowin" data-row="${i}" inputmode="decimal" autocomplete="off" placeholder="${l.fmt === 'factor' ? '0.0000' : l.fmt === 'pct' ? '0.0%' : l.fmt === 'num' ? '0' : '$0'}" value="${opts.rows && opts.rows[i] != null ? esc2(opts.rows[i]) : ''}"><span class="mark" id="mk${i}"></span>`;
      return `<tr${l.input && !opts.filled ? ' class="hl"' : ''}><td class="lbl">${l.label}</td><td class="lbl">${l.calc || ''}</td><td>${res}</td></tr>`;
    }).join('');
    return `<div class="tw"><table class="cf ladder${opts.filled ? ' filled' : ''}">${opts.caption ? `<caption>${opts.caption}</caption>` : ''}<thead><tr><th scope="col">Line</th><th scope="col">Calculation</th><th scope="col">Result</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  const h = { fnv1a, mulberry32, normEmail, normCode, fmtCode, validCode, newCode, df, npv, annuityFactor, pick, between, round, pct, money, near, wordCount, parseMoney, judgeNumber, calc, ladder };

  // ---------------- config-bound core ----------------
  function make(C) {
    const STEPS = C.steps, POINTS = C.points || 20;
    const seedFor = (code) => fnv1a(C.app + '|v' + C.seedVersion + '|' + normCode(code));
    const checksum = (str) => { const a = fnv1a(C.salt + str), b = fnv1a(str + C.salt + 'b'); return (a.toString(36) + b.toString(36)).toUpperCase().padStart(12, '0').slice(0, 12); };
    const buildTasks = (code) => C.buildTasks(mulberry32(seedFor(code)), h);
    const judgeQuiz = (qi, a) => ({ ok: a != null && Number(a) === C.quiz[qi].answer });
    const judgeNote = (t) => ({ ok: wordCount(t) >= C.note.minWords, words: wordCount(t) });
    const pointsFor = (n) => n >= STEPS.length ? POINTS : n >= STEPS.length / 2 ? POINTS / 2 : 0;
    const canonical = (p) => JSON.stringify({ v: p.v, id: 'code', app: p.app, code: p.code, issued: p.issued, steps: p.steps, memo: p.memo });
    function makePayload(code, log, memo) {
      const p = { v: C.version, id: 'code', app: C.app, code: normCode(code), issued: new Date().toISOString(),
        steps: STEPS.map((s) => { const l = log[s.id] || {}; return { id: s.id, done: !!l.done, attempts: l.attempts || 0, help: l.help || 0,
          value: l.value == null ? null : String(l.value), choice: l.choice == null ? null : String(l.choice),
          rows: Array.isArray(l.rows) ? l.rows.map((x) => (x == null ? null : String(x))) : null, at: l.at || null }; }),
        memo: String(memo || '') };
      p.sum = checksum(canonical(p)); return p;
    }
    function verifyPayload(p) {
      const out = { checksumOk: false, rows: [], done: 0, total: STEPS.length, points: 0, problems: [] };
      if (!p || p.app !== C.app) { out.problems.push('This is not a receipt from ' + C.story.title + '.'); return out; }
      if (p.v !== C.version || p.id !== 'code') { out.problems.push('This receipt comes from an older version (' + p.v + '). Ask the student to download a new receipt.'); return out; }
      out.checksumOk = checksum(canonical(p)) === p.sum;
      if (!out.checksumOk) out.problems.push('The checksum does not match, so the receipt was edited after it was issued.');
      const tasks = buildTasks(p.code);
      for (const s of STEPS) {
        const e = (p.steps || []).find((x) => x.id === s.id) || {}; let ok = false;
        if (s.kind === 'walk') ok = !!e.done;
        else if (s.kind === 'check') ok = !!e.done && judgeQuiz(s.quiz, e.choice).ok;
        else if (s.kind === 'note') ok = !!e.done && judgeNote(p.memo).ok;
        else { const t = tasks.find((x) => x.id === s.id); ok = !!e.done && !!t && C.judgeTask(t, { value: e.value, choice: e.choice, rows: e.rows }, h).ok; }
        if (e.done && !ok) out.problems.push(s.label + ' is marked complete, but its answer does not check out for this desk code.');
        if (ok) out.done++;
        out.rows.push({ id: s.id, label: s.label, claimed: !!e.done, verified: ok, attempts: e.attempts || 0, help: e.help || 0, at: e.at });
      }
      out.points = pointsFor(out.done); return out;
    }
    const shortCode = (sum) => sum.slice(0, 4) + '-' + sum.slice(4, 8) + '-' + sum.slice(8, 12);
    return { C, h, STEPS, POINTS, seedFor, buildTasks, judgeQuiz, judgeNote, pointsFor, makePayload, verifyPayload, shortCode, checksum,
      addTextChunk, readTextChunk, encodeReceipt: (p) => b64e(JSON.stringify(p)), decodeReceipt: (t) => { try { return JSON.parse(b64d(t)); } catch (e) { return null; } } };
  }

  root.DeskEngine = { h, make };
})(typeof window !== 'undefined' ? window : globalThis);

/* The Mortgage Machine: the page. State, navigation, the house (steps 1 to 4), lock-in, the line (chain and pay),
   the two gesture checks, the memo and the receipt. The machine and the lender's game are in game.js.
   Rules and numbers come only from rules.js (version 1's); receipts from core.js (version 1's). */
(function (root) {
  'use strict';
  const C = root.DESK, D = root.DeskEngine.make(C), h = root.DeskEngine.h, A = root.Art, K = A.K;
  const F = C.fmt, mm = F.mm, pc = F.pc;
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = C.storageKey;
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } } };
  const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const M = root.MM = { C, D, h, $, $$, esc, store, reduced, KEY };

  // ---------------- sound: short synthesized cues, off by default ----------------
  const Snd = M.Snd = {
    on: false, ctx: null, hum: null,
    ac() { if (!this.ctx) { const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); } if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
    tone(f, dur, type, vol, delay, slideTo) {
      if (!this.on) return; const c = this.ac(); if (!c) return; const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
    },
    tick() { this.tone(1300, 0.04, 'triangle', 0.04); },
    coin() { this.tone(1568, 0.07, 'sine', 0.035); this.tone(2093, 0.09, 'sine', 0.03, 0.05); },
    stamp() { this.tone(110, 0.14, 'sine', 0.09, 0, 60); },
    good() { this.tone(523, 0.12, 'sine', 0.05); this.tone(784, 0.18, 'sine', 0.05, 0.1); },
    thud() { this.tone(70, 0.22, 'sine', 0.08, 0, 45); },
    low() { this.tone(110, 2.6, 'sine', 0.05); },
    humStart(rate) { if (!this.on) return; const c = this.ac(); if (!c) return; this.humStop(true);
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 48 + 14 * (rate || 1); f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.025, c.currentTime + 0.4); o.connect(f).connect(g).connect(c.destination); o.start(); this.hum = { o, g }; },
    humWind(sec) { if (!this.hum || !this.ctx) return; const t = this.ctx.currentTime; this.hum.o.frequency.exponentialRampToValueAtTime(22, t + sec); this.hum.g.gain.exponentialRampToValueAtTime(0.0001, t + sec); const hh = this.hum; this.hum = null; setTimeout(() => { try { hh.o.stop(); } catch (e) { /* stopped */ } }, sec * 1000 + 100); },
    humStop(now) { if (!this.hum) return; const hh = this.hum; this.hum = null; try { if (now || !this.ctx) hh.o.stop(); else { hh.g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3); setTimeout(() => { try { hh.o.stop(); } catch (e) { /* stopped */ } }, 400); } } catch (e) { /* stopped */ } },
  };

  // ---------------- state (same log shape as v1, so the receipt is the same) ----------------
  let S = M.S = { code: '', tasks: [], log: {}, memo: '', at: 'start' };
  const blankLog = () => { const l = {}; D.STEPS.forEach((s) => { l[s.id] = { done: false, attempts: 0, help: 0 }; }); return l; };
  function saveState() { store.set(KEY + ':' + D.seedFor(S.code), { code: S.code, log: S.log, memo: S.memo, at: S.at, extra: S.extra || {} }); store.set(KEY + ':last', S.code); }
  function startFor(code) {
    S.code = h.normCode(code); S.tasks = D.buildTasks(S.code);
    const saved = store.get(KEY + ':' + D.seedFor(S.code));
    S.log = saved && saved.log ? saved.log : blankLog(); D.STEPS.forEach((s) => { if (!S.log[s.id]) S.log[s.id] = { done: false, attempts: 0, help: 0 }; });
    S.memo = saved && saved.memo ? saved.memo : ''; S.extra = saved && saved.extra ? saved.extra : {};
    S.at = saved && saved.at ? saved.at : D.STEPS[0].id; saveState();
  }
  const doneCount = () => D.STEPS.filter((s) => S.log[s.id] && S.log[s.id].done).length;
  const stepIdx = (id) => D.STEPS.findIndex((x) => x.id === id);
  const task = (id) => S.tasks.find((t) => t.id === id);
  function markDone(id) { const L = S.log[id]; if (!L.done) { L.done = true; L.at = new Date().toISOString(); } saveState(); renderNav(); }
  const nextId = (id) => { const i = stepIdx(id); return i < D.STEPS.length - 1 ? D.STEPS[i + 1].id : 'receipt'; };
  const nextLabel = (id) => { const n = nextId(id); return n === 'receipt' ? 'Go to your receipt' : 'Next: ' + D.STEPS[stepIdx(n)].label; };
  Object.assign(M, { saveState, markDone, nextId, nextLabel, task, stepIdx, doneCount });

  // ---------------- the shell ----------------
  const SPEAKER = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path class="w" d="M11 5.5c1 .8 1 4.2 0 5M12.8 3.8c2 1.8 2 6.6 0 8.4" stroke="currentColor" fill="none" stroke-width="1.4"/></svg>';
  function shell() {
    document.body.insertAdjacentHTML('afterbegin', `<a class="skip" href="#main">Skip to the step</a>
      <header class="top"><div class="top-in"><div class="wordmark">${A.mark()}<span>${esc(C.story.title)}</span></div>
        <a class="tool desmos-open" id="calcBtn" href="https://www.desmos.com/scientific" target="desmos" rel="noopener">Calculator<span class="sr-only"> (Desmos, opens in a new window)</span></a>
        <button class="tool" id="sndBtn" type="button" aria-pressed="false">${SPEAKER}<span>Sound off</span></button></div>
        <nav class="line" aria-label="Steps"><ol id="lineNav"></ol><p class="line-now" id="lineNow" aria-live="polite"></p></nav></header>
      <main id="main" tabindex="-1"></main>
      <footer class="foot"><p>${esc(C.story.kicker)}. Your progress is saved in this browser.<span id="codeNote"></span></p></footer>`);
    $('#sndBtn').addEventListener('click', () => { Snd.on = !Snd.on; if (Snd.on) { Snd.ac(); Snd.good(); } else Snd.humStop(true);
      $('#sndBtn').setAttribute('aria-pressed', String(Snd.on)); $('#sndBtn span').textContent = Snd.on ? 'Sound on' : 'Sound off'; store.set(KEY + ':sound', Snd.on); });
    document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a.desmos-open'); if (!a) return;
      const W = 440, sc = root.screen || {}, aw = sc.availWidth || 1280, ah = sc.availHeight || 800; let w = null;
      try { w = root.open(a.href, 'desmos', `popup,width=${W},height=${Math.min(ah, 760)},left=${Math.max(0, (sc.availLeft || 0) + aw - W)},top=${sc.availTop || 0}`); } catch (err) { w = null; }
      if (w) { e.preventDefault(); try { w.opener = null; w.focus(); } catch (err) { /* cross-origin */ } } });
  }
  function renderNav() {
    const ol = $('#lineNav'); ol.innerHTML = ''; const nowEl = $('#lineNow');
    $('#codeNote').innerHTML = S.code ? ` Your desk code is <b>${h.fmtCode(S.code)}</b>. Use it to continue on another computer.` : '';
    if (!S.code) { $('nav.line').hidden = true; return; } $('nav.line').hidden = false;
    const all = [...D.STEPS, { id: 'receipt', label: 'Receipt', act: 3 }]; let lastAct = -1;
    all.forEach((s, i) => {
      const li = document.createElement('li'); if (s.act !== lastAct) { li.className = 'act-start'; lastAct = s.act; } if (s.id === 'receipt') li.classList.add('receipt');
      const done = s.id === 'receipt' ? doneCount() === D.STEPS.length : S.log[s.id].done;
      li.innerHTML = `<span class="act" aria-hidden="true">${s.id === 'receipt' ? 'Receipt' : esc(C.acts[s.act])}</span><button type="button"${done ? ' class="done"' : ''}${S.at === s.id ? ' aria-current="step"' : ''} aria-label="${s.id === 'receipt' ? 'Receipt' : `Step ${i + 1}: ${esc(s.label)}, ${done ? 'finished' : 'not finished yet'}`}"><span>${s.id === 'receipt' ? '$' : i + 1}</span></button>`;
      li.querySelector('button').addEventListener('click', () => go(s.id)); ol.appendChild(li);
    });
    const i = all.findIndex((s) => s.id === S.at);
    nowEl.innerHTML = i < 0 ? '' : S.at === 'receipt' ? '<b>Your receipt</b>' : `Step ${i + 1} of ${D.STEPS.length}: <b>${esc(all[i].label)}</b>. Move between steps at any time; finished steps turn green.`;
  }
  M.renderNav = renderNav;

  // ---------------- routing ----------------
  let teardown = null;
  M.onLeave = (fn) => { teardown = fn; };
  function go(id) {
    if (!S.code) return showStart();
    if (teardown) { try { teardown(); } catch (e) { /* ignore */ } teardown = null; }
    Snd.humStop(true);
    S.at = id; saveState(); renderNav();
    const s = D.STEPS[stepIdx(id)], main = $('#main'); main.innerHTML = '';
    if (id === 'receipt') showReceipt(main);
    else if (['loan', 'pay', 'first', 'total'].includes(id)) showHouse(main, s);
    else if (id === 'lockin') showLockin(main, s);
    else if (id === 'chain') showChain(main, s);
    else if (id === 'paid') showPaid(main, s);
    else if (id === 'q1') showQ1(main, s);
    else if (id === 'q2') showQ2(main, s);
    else if (id === 'game') M.showGame(main, s);
    else if (id === 'note') showNote(main, s);
    main.focus({ preventScroll: true }); root.scrollTo(0, 0);
  }
  M.go = go;

  // A beat: the stage (the world, on ink) and the work (the paper). Returns both.
  function beat(main, s, opts) {
    opts = opts || {};
    const i = stepIdx(s.id), P = C.PROBLEM[s.id](task(s.id) || {});
    main.insertAdjacentHTML('beforeend', `<section class="beat${opts.wide ? ' wide' : ''}" aria-labelledby="bt">
      <div class="work-head"><p class="kicker">Step ${i + 1} of ${D.STEPS.length}</p><h2 id="bt">${esc(s.label)}</h2>
        ${P.place ? `<p class="place">${esc(P.place)}</p>` : ''}${P.body ? `<p class="ask">${P.body}</p>` : ''}</div>
      <div class="stage" id="stage"><div class="stage-in" id="stageIn"></div></div>
      <div class="work" id="work"><div id="workIn"></div></div></section>`);
    return { stage: $('#stageIn'), work: $('#workIn') };
  }
  M.beat = beat;
  function nextRow(s, hidden) { return `<div class="actions next-row" id="nextRow"${hidden ? ' hidden' : ''}><button class="btn" type="button" id="nextBtn">${esc(nextLabel(s.id))}</button></div>`; }
  function wireNext(s) { const b = $('#nextBtn'); if (b) b.addEventListener('click', () => go(nextId(s.id))); }
  function showFb(el, kind, html) { el.className = 'fb show ' + kind; el.innerHTML = html; }
  Object.assign(M, { nextRow, wireNext, showFb });

  // ---------------- the loan sheet: worked example and the student's version, same layout (rule 29) ----------------
  const show = (l) => (l.kind === 'text' ? l.num : F.SHOW[l.kind](l.num));
  const PH = { money: '$0', pct: '0%', num: '0.0' };
  function sheetHtml(lines, o) {
    o = o || {};
    return `<div class="sheet${o.example ? ' example' : ''}"${o.example ? ' aria-label="Worked example"' : ''}><div class="sheet-head"><span>${esc(o.title)} <span class="who">${esc(o.who || '')}</span></span><span class="tag">${o.example ? 'Worked example' : 'Your turn'}</span></div>
      ${lines.map((l, i) => {
        const filled = o.example || !l.input;
        const res = filled ? `<span>${esc(show(l))}</span>` : `<label class="sr-only" for="r${i}">${esc(l.label)}</label><input id="r${i}" class="rowin" data-row="${i}" inputmode="decimal" autocomplete="off" placeholder="${PH[l.kind] || ''}" value="${o.rows && o.rows[i] != null ? esc(o.rows[i]) : ''}"><span class="mark" id="mk${i}" aria-hidden="true"></span>`;
        return `<div class="row${filled ? ' given' : ''}"><div class="lbl">${esc(l.label)}</div><div class="calc">${l.calc}</div><div class="res">${res}</div></div>`;
      }).join('')}</div>`;
  }
  const rateCard = (hi) => `<div class="ratecard"><h3>Rate card</h3><table><caption>Monthly payment for each $100,000 borrowed, 30-year fixed loan</caption>
    <thead><tr><th scope="col">Rate</th><th scope="col">Payment per $100,000</th></tr></thead><tbody>${C.RATES.map((r) => `<tr${hi && hi.includes(r) ? ' class="hl"' : ''}><td>${pc(r)}</td><td>${mm(C.TABLE[r])}</td></tr>`).join('')}</tbody></table></div>`;
  M.rateCard = rateCard;

  // A calculation step on the sheet: check, row marks, diagnoses, the help ladder (rules 2 to 4), then praise and next.
  function calcStep(s, work, o) {
    const t = task(s.id), L = S.log[s.id], E = C.EXAMPLES[s.id], lines = C.linesFor(t);
    work.innerHTML = `${o.before || ''}${sheetHtml(E.lines(), { example: true, title: E.cap.replace(/\.$/, ''), who: '' })}
      ${o.mid || ''}<form id="ask" novalidate>${sheetHtml(lines, { title: 'Your family', rows: L.rows })}
      ${lines.some((l) => l.input && l.kind === 'pct') ? '<p class="small">Type a percentage like 85%.</p>' : ''}
      ${t.decision ? `<fieldset class="choose"><legend>So why do many owners with a 3% loan stay put?</legend>${[['move', 'Moving means giving up the 3% loan and borrowing again at 6.5%'], ['bank', 'Banks will not lend to people who already own a home'], ['fixed', 'A fixed-rate loan cannot be paid off early']].map(([v, tx]) => `<label class="choice"><input type="radio" name="dec" value="${v}"${L.choice === v ? ' checked' : ''}><span>${esc(tx)}</span></label>`).join('')}</fieldset>` : ''}
      <div class="actions"><button class="btn" type="submit">Check</button><span class="attempts" id="att">${L.attempts ? 'Checks so far: ' + L.attempts : ''}</span></div>
      <div class="fb" id="fb" aria-live="polite"></div><div class="actions" id="helpRow" hidden></div><div class="fb hint" id="helpBox"></div></form>${nextRow(s, !L.done)}`;
    const inputs = () => $$('.rowin', work);
    const rowsNow = () => { const r = []; inputs().forEach((x) => { r[Number(x.dataset.row)] = x.value; }); return r; };
    // Quick feedback: a row turns green the moment it is right; when every row is right the step completes by itself.
    // A wrong row is only marked when the student presses Check, so nobody is told off mid-typing.
    let liveT = null;
    const live = () => {
      if (L.done) return; const rows = rowsNow(), ch = (work.querySelector('input[name=dec]:checked') || {}).value || null, res = C.judgeTask(t, { rows, choice: ch }, h);
      (res.rowRes || []).forEach((rr, i) => { const x = $(`.rowin[data-row="${i}"]`, work), mk = $('#mk' + i, work); if (!x || rr == null) return;
        if (rr.ok && !x.classList.contains('good')) { x.classList.add('good'); x.classList.remove('wrong'); mk.textContent = '✓'; mk.className = 'mark ok'; Snd.tick(); }
        else if (!rr.ok && x.classList.contains('good')) { x.classList.remove('good'); mk.textContent = ''; } });
      if (o.onRows) o.onRows(res.rowRes || [], res.ok);
      if (res.ok) $('#ask', work).requestSubmit();
    };
    inputs().forEach((x) => x.addEventListener('input', () => { if (!L.done) { L.rows = rowsNow(); saveState(); } clearTimeout(liveT); liveT = setTimeout(live, 450); }));
    $$('input[name=dec]', work).forEach((x) => x.addEventListener('change', () => { clearTimeout(liveT); liveT = setTimeout(live, 200); }));
    const marks = (rowRes) => (rowRes || []).forEach((rr, i) => { const x = $(`.rowin[data-row="${i}"]`, work), mk = $('#mk' + i, work); if (!x || rr == null) return;
      x.classList.toggle('good', rr.ok); x.classList.toggle('wrong', !rr.ok); if (mk) { mk.textContent = rr.ok ? '✓' : '✗'; mk.className = 'mark ' + (rr.ok ? 'ok' : 'no'); } });
    function renderHelp() {
      const row = $('#helpRow', work), fails = L.fails || 0; if (!fails || L.done) { row.hidden = true; return; }
      row.hidden = false; const labs = ['Show me the first blank', 'Show me every line'].slice(0, Math.min(2, fails));
      row.innerHTML = labs.map((lab, i) => `<button class="btn small ghost" type="button" data-l="${i + 1}">${lab}</button>`).join('');
      $$('button[data-l]', row).forEach((b) => b.addEventListener('click', () => { const lvl = Number(b.dataset.l); L.help = Math.max(L.help || 0, lvl); saveState(); showFb($('#helpBox', work), 'hint', C.helpText(t, lvl, h)); }));
    }
    renderHelp();
    $('#ask', work).addEventListener('submit', (e) => {
      e.preventDefault(); const rows = rowsNow(), ch = (work.querySelector('input[name=dec]:checked') || {}).value || null;
      const res = C.judgeTask(t, { rows, choice: ch }, h); L.attempts = (L.attempts || 0) + 1; const fb = $('#fb', work);
      if (res.ok || !L.done) { L.rows = rows; L.choice = ch; }
      marks(res.rowRes); if (o.onRows) o.onRows(res.rowRes || [], res.ok);
      if (res.ok) { markDone(s.id); Snd.good(); showFb(fb, 'ok', '<b>Right.</b> ' + C.praise(t, h)); $('#nextRow').hidden = false; $('#helpRow', work).hidden = true; if (o.onRight) o.onRight(); }
      else { L.fails = (L.fails || 0) + 1; showFb(fb, 'bad', '<b>Not yet.</b> ' + esc(res.msg || 'Check your work and try again.')); renderHelp(); }
      $('#att', work).textContent = 'Checks so far: ' + L.attempts; saveState();
    });
    wireNext(s);
    if (L.done) { const res = C.judgeTask(t, { rows: L.rows, choice: L.choice }, h); marks(res.rowRes); showFb($('#fb', work), 'ok', C.praise(t, h)); }
  }

  // ---------------- the house: one family's loan, scrubbed over 30 years ----------------
  // Stage geometry. The house is the bar chart: its fill splits into the family's share (green) and the lender's (hatched
  // ink), and the share moves as the loan is paid down. Two layouts: wide (desktop) and tall (phone).
  const HG = {
    wide: { w: 760, h: 540, HX: 300, HY: 70, HS: 2.2, fam: [232, 222, 1], lbl: [[300, 296], [300, 318], 530, 'start'], ltv: [410, 352],
      off: [662, 132, 78, 96], sY: 190, sLbl: [752, 96, 268], pile: { x: 40, base: 330, per: 6, dx: 42, step: 8, w: 34, rowGap: 120 }, pileLbl: [150, 362],
      TX0: 40, TX1: 720, TY: 488, TH: 56, dyn: [720, 'end', -12] },
    tall: { w: 400, h: 640, compact: 320, HX: 26, HY: 70, HS: 1.75, fam: [236, 182, 1], lbl: [[22, 256], [22, 276], 0, 'start'], ltv: [22, 298],
      off: [318, 128, 70, 86], sY: 170, sLbl: [394, 98, 240], pile: { x: 34, base: 430, per: 8, dx: 44, step: 6, w: 34, rowGap: 74 }, pileLbl: [200, 458],
      TX0: 22, TX1: 378, TY: 576, TH: 52, dyn: [200, 'middle', 62] },
  };
  function houseScene(stage, t, compact) {
    const sch = C.schedule(t.L, t.r, t.pay), G = (stage.clientWidth || root.innerWidth) < 600 ? HG.tall : HG.wide, H0 = compact && G.compact ? G.compact : G.h;
    const { HX, HY, HS } = G, HX0 = HX - 2 * HS, HX1 = HX + 102 * HS, base = HY + 90 * HS, txt = (id, x, y, o) => `<text id="${id}" x="${x}" y="${y}" font-family="Jost" ${o || ''}></text>`;
    const [ox, oy, ow, oh] = G.off;
    stage.innerHTML = `<svg class="world" id="houseSvg" viewBox="0 0 ${G.w} ${H0}" role="img" aria-labelledby="hsT hsD"><title id="hsT">The family’s house and its loan</title><desc id="hsD"></desc>
      <defs><clipPath id="hclip"><path transform="translate(${HX} ${HY}) scale(${HS})" d="${A.HOUSE_PATH}"/></clipPath>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="${K.ink3}"/><rect width="3" height="8" fill="${K.ink2}"/></pattern></defs>
      <g id="pile"></g>${txt('pileLbl', G.pileLbl[0], G.pileLbl[1], `text-anchor="middle" font-size="15" fill="${K.muted}"`)}
      <g id="lender" opacity="0">${A.office(ox, oy, ow, oh, '', 'hlo')}<text x="${ox + ow / 2}" y="${oy - 8}" text-anchor="middle" font-family="Jost" font-size="13.5" fill="${K.muted}">You, the lender</text></g>
      <g id="streams"></g>
      <g clip-path="url(#hclip)"><rect id="hLender" x="${HX0}" y="${HY}" width="${HX1 - HX0}" height="${92 * HS}" fill="url(#hatch)"/><rect id="hFamily" x="${HX0}" y="${HY}" width="0" height="${92 * HS}" fill="${K.green}"/></g>
      <path transform="translate(${HX} ${HY}) scale(${HS})" d="${A.HOUSE_PATH}" fill="none" stroke="${K.onInk}" stroke-width="${2 / HS}"/>
      <g transform="translate(${HX} ${HY}) scale(${HS})" fill="${K.ink}"><rect x="42" y="60" width="16" height="30"/><rect x="18" y="52" width="16" height="14" opacity=".85"/><rect x="66" y="52" width="16" height="14" opacity=".85"/></g>
      <line id="hDiv" x1="0" x2="0" y1="${HY + 20}" y2="${base}" stroke="${K.onInk}" stroke-width="2" stroke-dasharray="5 4" opacity="0"/>
      <g transform="translate(${HX + 50 * HS} ${HY - 4})"><path d="M0 0 L0 -18" stroke="${K.muted}" stroke-width="1.5"/><rect x="-62" y="-50" width="124" height="34" rx="3" fill="${K.onInk}"/><text x="0" y="-27" text-anchor="middle" font-family="Jost" font-weight="600" font-size="20" fill="${K.ink}">${mm(t.P)}</text></g>
      <g id="famFig" opacity="0">${A.family(G.fam[0], G.fam[1], G.fam[2], K.onInk)}</g>
      <g id="lblF" opacity="0"><rect x="${G.lbl[0][0]}" y="${G.lbl[0][1] - 12}" width="13" height="13" fill="${K.green}"/>${txt('famLbl', G.lbl[0][0] + 20, G.lbl[0][1], `font-size="16" fill="${K.onInk}"`)}</g>
      <g id="lblL" opacity="0"><rect x="${G.lbl[1][0]}" y="${G.lbl[1][1] - 12}" width="13" height="13" fill="url(#hatch)" stroke="${K.muted}"/>${txt('lenLbl', G.lbl[1][0] + 20, G.lbl[1][1], `font-size="16" fill="${K.onInk}"`)}</g>
      ${txt('ltvLbl', G.ltv[0], G.ltv[1], `font-weight="600" font-size="19" fill="${K.gold}"`)}
      <g id="track"></g></svg>
      <div id="houseCtl"></div><p class="caption" id="houseCap"></p>`;
    const svg = $('#houseSvg'), q = (id) => svg.querySelector('#' + id);
    let month = 0, family = 0;
    const setShare = (share, animate) => {
      const target = Math.max(0, Math.min(1, share)); const from = family; family = target;
      const draw = (v) => { const x = HX0 + (HX1 - HX0) * v; q('hFamily').setAttribute('width', x - HX0); q('hDiv').setAttribute('x1', x); q('hDiv').setAttribute('x2', x); q('hDiv').setAttribute('opacity', v > 0 && v < 1 ? 1 : 0); };
      if (!animate || reduced()) return draw(target);
      const t0 = performance.now(); const step = (now) => { const k = Math.max(0, Math.min(1, (now - t0) / 700)), e = 1 - Math.pow(1 - k, 3); draw(from + (target - from) * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
    };
    const labels = (o) => { q('famLbl').textContent = o.fam || ''; q('lenLbl').textContent = o.len || ''; q('ltvLbl').textContent = o.ltv || '';
      q('lblF').setAttribute('opacity', o.fam ? 1 : 0); q('lblL').setAttribute('opacity', o.len ? 1 : 0); };
    const figure = (on) => q('famFig').setAttribute('opacity', on ? 1 : 0);
    // interest pile: one coin is $10,000, stacks of ten
    const pile = (amount, show) => {
      const P = G.pile, n = Math.max(0, Math.floor(amount / 10000)); let g = '';
      for (let k = 0; k < n && k < 120; k++) { const st = Math.floor(k / 10), row = Math.floor(st / P.per), col = st % P.per, lvl = k % 10; g += A.coinEdge(P.x + col * P.dx, P.base - row * P.rowGap - lvl * P.step, P.w); }
      q('pile').innerHTML = g; q('pileLbl').textContent = n ? (show ? `Interest paid so far: ${mm(Math.round(amount))}` : 'Interest paid so far') : '';
    };
    // the monthly payment leaves the house as two streams into the lender: interest (gold) above, principal (green) below
    const streams = (row, opts) => {
      opts = opts || {}; const g = q('streams'); q('lender').setAttribute('opacity', row || opts.whole || opts.unsplit ? 1 : 0); if (!row && !opts.whole && !opts.unsplit) { g.innerHTML = ''; return; }
      const x0 = HX1 - 4, x1 = ox + 4, y = G.sY, [lx, ly1, ly2] = G.sLbl;
      const band = (yy, w, col, moving) => `<path d="M${x0} ${yy} H${x1}" stroke="${col}" stroke-width="${w}" fill="none"/>${moving ? `<path class="dots" d="M${x0} ${yy} H${x1}" stroke="${K.ink}" stroke-opacity=".35" stroke-width="${Math.max(2, w * 0.35)}" stroke-linecap="round" fill="none"/>` : ''}`;
      const lab = (yy, t1, col) => `<text x="${lx}" y="${yy}" text-anchor="end" font-family="Jost" font-weight="600" font-size="16" fill="${col}">${t1}</text>`;
      if (opts.whole) { g.innerHTML = band(y, 40, K.gold, true) + lab(ly1, `${mm(t.pay)} a month`, K.onInk) + `<text x="${lx}" y="${ly2}" text-anchor="end" font-family="Jost" font-size="14.5" fill="${K.muted}">for 360 months</text>`; return; }
      if (opts.unsplit) { g.innerHTML = band(y, 40, K.line, false) + lab(ly1, `${mm(t.pay)}: how much is interest?`, K.onInk); return; }
      const sc = 44 / t.pay, wi = Math.max(3, row.interest * sc), wp = Math.max(3, row.principal * sc);
      g.innerHTML = band(y - wp / 2 - 1, wi, K.gold, true) + band(y + wi / 2 + 1, wp, K.green, true)
        + lab(ly1, `Interest ${mm(row.interest)}`, K.gold) + lab(ly2, `Pays down the loan ${mm(row.principal)}`, '#7FD6B2');
    };
    const { TX0, TX1, TY, TH } = G;
    const trackPts = sch.map((r) => [TX0 + (TX1 - TX0) * r.m / 360, TY - TH * r.balance / t.L]);
    const track = (on) => {
      const g = q('track'); if (!on) { g.innerHTML = ''; return; }
      const area = `M${TX0} ${TY} L${TX0} ${TY - TH} ` + trackPts.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ` L${TX1} ${TY} Z`;
      let ticks = ''; for (let y = 0; y <= 30; y += 5) { const x = TX0 + (TX1 - TX0) * y / 30; ticks += `<line x1="${x}" x2="${x}" y1="${TY}" y2="${TY + 7}" stroke="${K.muted}"/><text x="${x}" y="${TY + 24}" text-anchor="${y === 0 ? 'start' : y === 30 ? 'end' : 'middle'}" font-family="Jost" font-size="14" fill="${K.muted}">${y === 0 ? 'Year 0' : y}</text>`; }
      g.innerHTML = `<text x="${TX0}" y="${TY - TH - 12}" font-family="Jost" font-size="14.5" fill="${K.muted}">Loan left to repay</text>
        <path d="${area}" fill="${K.ink3}" stroke="${K.muted}" stroke-width="1.5"/><path id="tPast" fill="${K.green}" opacity=".6"/><line x1="${TX0}" x2="${TX1}" y1="${TY}" y2="${TY}" stroke="${K.muted}" stroke-width="2"/>${ticks}
        <line id="tNow" y1="${TY - TH - 4}" y2="${TY + 4}" stroke="${K.gold}" stroke-width="3"/><circle id="tKnob" cy="${TY}" r="11" fill="${K.gold}" stroke="${K.ink}" stroke-width="2.5"/>
        <text id="tLbl" x="${G.dyn[0]}" y="${G.dyn[2] < 0 ? TY - TH + G.dyn[2] : TY + G.dyn[2] - 18}" text-anchor="${G.dyn[1]}" font-family="Jost" font-weight="600" font-size="15" fill="${K.onInk}"></text>`;
    };
    const setMonth = (m, o) => {
      o = o || {}; month = Math.max(1, Math.min(360, Math.round(m))); const r = sch[month - 1];
      setShare((t.P - r.balance) / t.P, false); streams(r); pile(r.cumInterest, o.showTotal !== false);
      const x = TX0 + (TX1 - TX0) * month / 360, now = q('tNow');
      if (now) { now.setAttribute('x1', x); now.setAttribute('x2', x); q('tKnob').setAttribute('cx', x);
        q('tPast').setAttribute('d', `M${TX0} ${TY} L${TX0} ${TY - TH} ` + trackPts.slice(0, month).map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ` L${x} ${TY} Z`);
        q('tLbl').textContent = `Year ${Math.ceil(month / 12)}, month ${month}: ${mm(Math.round(r.balance))} left`; }
      labels({ fam: `Family owns ${Math.round(100 * (t.P - r.balance) / t.P)}%`, len: `Loan left ${mm(Math.round(r.balance))}` });
      const rg = $('#scrub'); if (rg && Number(rg.value) !== month) rg.value = month;
      if (rg) rg.setAttribute('aria-valuetext', `Year ${Math.ceil(month / 12)}, month ${month}. Interest ${mm(r.interest)}, pays down ${mm(r.principal)}, ${mm(Math.round(r.balance))} left` + (o.showTotal !== false ? `, interest so far ${mm(Math.round(r.cumInterest))}.` : '.'));
      q('hsD').textContent = `Month ${month}: of the ${mm(t.pay)} payment, ${mm(r.interest)} is interest and ${mm(r.principal)} pays down the loan. ${mm(Math.round(r.balance))} is left to repay.`;
    };
    const scrubOn = (startMonth, opts) => {
      svg.setAttribute('viewBox', `0 0 ${G.w} ${G.h}`); track(true);
      $('#houseCtl').innerHTML = `<div class="scrub on-ink"><label for="scrub">Drag along the 30 years</label><input type="range" id="scrub" min="1" max="360" step="1" value="${startMonth}"></div>
        <div class="legend"><span><i style="background:${K.gold}"></i>Interest</span><span><i style="background:${K.green}"></i>Pays down the loan, so the family owns more</span><span><svg width="22" height="12" aria-hidden="true">${A.coinEdge(11, 6, 20)}</svg>One coin is $10,000 of interest</span></div>`;
      const rg = $('#scrub'); rg.addEventListener('input', () => setMonth(Number(rg.value), opts));
      const pt = (ev) => { const P = svg.createSVGPoint(); P.x = ev.clientX; P.y = ev.clientY; return P.matrixTransform(svg.getScreenCTM().inverse()); };
      let dragging = false;
      svg.addEventListener('pointerdown', (ev) => { const p = pt(ev); if (p.y < TY - TH - 24 || p.y > TY + 30) return; dragging = true; svg.setPointerCapture(ev.pointerId); setMonth(360 * (p.x - TX0) / (TX1 - TX0), opts); });
      svg.addEventListener('pointermove', (ev) => { if (dragging) setMonth(360 * (pt(ev).x - TX0) / (TX1 - TX0), opts); });
      svg.addEventListener('pointerup', () => { dragging = false; });
      setMonth(startMonth, opts);
    };
    const play = (from, to, ms, opts) => new Promise((res) => {
      if (reduced()) { setMonth(to, opts); return res(); }
      const t0 = performance.now(); const step = (now) => { const k = Math.max(0, Math.min(1, (now - t0) / ms)), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; setMonth(from + (to - from) * e, opts); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step);
    });
    return { setShare, labels, streams, pile, track, setMonth, scrubOn, play, figure, q, sch, get month() { return month; } };
  }

  function showHouse(main, s) {
    const t = task(s.id), L = S.log[s.id], { stage, work } = beat(main, s);
    const H = houseScene(stage, t, s.id === 'loan' || s.id === 'pay' || (s.id === 'first' && !L.done)), cap = $('#houseCap');
    const shareLabels = () => H.labels({ fam: `Family paid ${mm(t.down)} down`, len: `You lend ${mm(t.L)}`, ltv: `Loan-to-value ${pc(1 - t.d)}` });
    if (s.id === 'loan') {
      const paint = (rowRes, done) => {
        const ok = (i) => done || (rowRes[i] && rowRes[i].ok);
        H.figure(true); if (ok(1)) H.setShare(t.d, true);
        H.labels({ fam: ok(1) ? `Family pays ${mm(t.down)} down` : '', len: ok(2) ? `You lend ${mm(t.L)}` : '', ltv: ok(3) ? `Loan-to-value ${pc(1 - t.d)}` : '' });
        cap.innerHTML = done || ok(3) ? `The lender’s share of the house is the <b>loan-to-value</b>: ${pc(1 - t.d)}. If the family stops paying, the lender can take the house.` : 'As your numbers check out, the house splits into the family’s share and the lender’s.';
      };
      paint([], L.done);
      calcStep(s, work, { onRows: (rr) => paint(rr, L.done) });
    } else if (s.id === 'pay') {
      H.setShare(t.d); shareLabels(); H.figure(true);
      const paint = (done) => { if (done) { H.figure(false); H.streams(null); H.streams({}, { whole: true }); cap.innerHTML = `Every month for 30 years, ${mm(t.pay)} leaves the house. The same amount every month.`; } else cap.textContent = 'Read the family’s row on the rate card. The payment will flow out of the house once it checks out.'; };
      paint(L.done);
      calcStep(s, work, { before: rateCard([t.r]), onRight: () => paint(true) });
    } else if (s.id === 'first') {
      H.setShare(t.d); shareLabels();
      const paint = (done) => {
        if (done) { H.scrubOn(1, {}); cap.innerHTML = `Month 1: most of the payment is interest. Drag along the 30 years: each month a little more pays down the loan.`; }
        else { H.streams(null, {}); H.streams({}, { unsplit: true }); cap.textContent = 'The first payment splits into interest and the part that pays down the loan.'; }
      };
      paint(L.done);
      calcStep(s, work, { onRight: () => { paint(true); } });
    } else {
      H.setShare(t.d); shareLabels();
      const opts = { showTotal: L.done };
      H.scrubOn(1, opts);
      cap.innerHTML = L.done ? `Drag along the 30 years. At the end the pile is ${mm(t.totalInt)}, the interest you found.` : 'Drag along the 30 years. The loan shrinks slowly at first and fast at the end, while the interest piles up beside the house.';
      calcStep(s, work, { onRight: () => { opts.showTotal = true; cap.innerHTML = `At the end the pile is ${mm(t.totalInt)}, the interest you found.`; H.play(H.month, 360, 2600, opts); } });
    }
  }

  // ---------------- lock-in: two identical houses, two coin streams ----------------
  function showLockin(main, s) {
    const t = task(s.id), L = S.log[s.id], { stage, work } = beat(main, s);
    stage.innerHTML = `<svg class="world" id="lockSvg" viewBox="0 0 760 470" role="img" aria-labelledby="lkT"><title id="lkT">Two identical houses, one financed at 3% and one at 6.5%</title>
      ${A.house(105, 60, 1.9, { body: K.onInk, door: K.ink })}${A.house(465, 60, 1.9, { body: K.onInk, door: K.ink })}
      <text x="200" y="40" text-anchor="middle" font-family="Jost" font-weight="600" font-size="19" fill="${K.onInk}">Old loan at 3%</text>
      <text x="560" y="40" text-anchor="middle" font-family="Jost" font-weight="600" font-size="19" fill="${K.onInk}">New loan at 6.5%</text>
      <text x="200" y="262" text-anchor="middle" font-family="Jost" font-size="15" fill="${K.muted}">$320,000 borrowed</text><text x="560" y="262" text-anchor="middle" font-family="Jost" font-size="15" fill="${K.muted}">$320,000 borrowed</text>
      <g id="lkA"></g><g id="lkB"></g><g id="lkGap"></g><text id="lkLa" x="200" y="452" text-anchor="middle" font-family="Jost" font-weight="600" font-size="18" fill="${K.onInk}"></text><text id="lkLb" x="560" y="452" text-anchor="middle" font-family="Jost" font-weight="600" font-size="18" fill="${K.onInk}"></text></svg>
      <p class="caption" id="lkCap"></p>`;
    const svg = $('#lockSvg');
    const paint = (done) => {
      // Each column of coins is one month's payment; one coin is $100.
      // One coin is $100. The new loan's column is the old payment plus an extra column (dashed red rim) for the gap.
      const col = (x, n, extra) => { let g = ''; for (let k = 0; k < n; k++) g += A.coinEdge(x, 420 - k * 9, 34) + (extra ? `<ellipse cx="${x}" cy="${420 - k * 9}" rx="17" ry="5.8" fill="none" stroke="${K.red}" stroke-width="1.8" stroke-dasharray="3 2"/>` : ''); return g; };
      if (done) {
        svg.querySelector('#lkA').innerHTML = col(200, Math.round(t.lo / 100));
        svg.querySelector('#lkB').innerHTML = col(540, Math.round(t.lo / 100)) + col(586, Math.round(t.hi / 100) - Math.round(t.lo / 100), true);
        svg.querySelector('#lkLa').textContent = `${mm(t.lo)} a month`; svg.querySelector('#lkLb').textContent = `${mm(t.hi)} a month`;
        svg.querySelector('#lkGap').innerHTML = `<text x="612" y="340" font-family="Jost" font-weight="600" font-size="17" fill="${K.gold}">+${mm(t.gap)}</text><text x="612" y="360" font-family="Jost" font-size="14" fill="${K.muted}">more, every month</text>`;
        $('#lkCap').innerHTML = `Same house, same loan. Moving would cost about <b>${mm(t.gap)} more every month</b> for 30 years. One coin is $100.`;
      } else {
        svg.querySelector('#lkA').innerHTML = `<text x="200" y="350" text-anchor="middle" font-family="Jost" font-weight="700" font-size="44" fill="${K.line}">?</text>`;
        svg.querySelector('#lkB').innerHTML = `<text x="560" y="350" text-anchor="middle" font-family="Jost" font-weight="700" font-size="44" fill="${K.line}">?</text>`;
        svg.querySelector('#lkLa').textContent = 'a month'; svg.querySelector('#lkLb').textContent = 'a month'; svg.querySelector('#lkGap').innerHTML = '';
        $('#lkCap').textContent = 'Find each payment on the rate card. The coins will show what each house pays a month.';
      }
    };
    paint(L.done);
    calcStep(s, work, { before: rateCard([0.03, 0.065]), onRight: () => paint(true) });
  }

  // ---------------- place cards into slots (chain and paid): tap a card, then a slot; or drag ----------------
  function placer(o) {
    // o: { cards: [{key, html, label}], slots: [{el, key}], value: {cardKey: slotKey}, onChange }
    let picked = null; const val = Object.assign({}, o.value || {});
    const cardEls = () => $$('.card', o.tray);
    const refresh = () => {
      cardEls().forEach((c) => { const k = c.dataset.key; c.classList.toggle('placed', Object.prototype.hasOwnProperty.call(val, k)); c.setAttribute('aria-pressed', String(picked === k)); });
      o.render(val); o.onChange(val);
    };
    const place = (cardKey, slotKey) => {
      Object.keys(val).forEach((k) => { if (val[k] === slotKey) delete val[k]; });   // a slot holds one card; the old one returns to the tray
      val[cardKey] = slotKey; picked = null; Snd.tick(); refresh();
      const next = cardEls().find((c) => !Object.prototype.hasOwnProperty.call(val, c.dataset.key)); if (next) next.focus();
    };
    o.tray.addEventListener('click', (e) => { const c = e.target.closest('.card'); if (!c || c.dataset.dragged) { if (c) delete c.dataset.dragged; return; } const k = c.dataset.key; picked = picked === k ? null : k; Snd.tick(); refresh(); if (picked && o.announce) o.announce(`Picked. Now choose a ${o.slotWord}.`); });
    o.slotEls().forEach((sl) => sl.addEventListener('click', () => {
      const sk = sl.dataset.slot;
      if (picked) return place(picked, sk);
      const there = Object.keys(val).find((k) => val[k] === sk); if (there) { delete val[there]; Snd.tick(); refresh(); }   // tap a filled slot to send its card back
    }));
    // drag with a pointer (mouse or touch): a floating copy follows the finger; drop on a slot
    o.tray.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.card'); if (!c || e.button > 0) return;
      const sx = e.clientX, sy = e.clientY; let ghost = null; const k = c.dataset.key;
      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
        if (!ghost) { ghost = c.cloneNode(true); ghost.classList.add('ghost-drag'); ghost.style.width = c.offsetWidth + 'px'; document.body.appendChild(ghost); c.classList.add('dragging'); }
        ghost.style.left = (ev.clientX - 20) + 'px'; ghost.style.top = (ev.clientY - 20) + 'px';
        o.slotEls().forEach((sl) => { const r = sl.getBoundingClientRect(); sl.classList.toggle('over', ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom); });
      };
      const up = (ev) => {
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
        if (!ghost) return; ghost.remove(); c.classList.remove('dragging'); c.dataset.dragged = '1';
        const hit = o.slotEls().find((sl) => { const r = sl.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; });
        o.slotEls().forEach((sl) => sl.classList.remove('over')); if (hit) place(k, hit.dataset.slot); setTimeout(() => { delete c.dataset.dragged; }, 50);
      };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
    });
    refresh();
    return { val, refresh, set(v) { Object.keys(val).forEach((k) => delete val[k]); Object.assign(val, v); refresh(); } };
  }

  // The five events: a pictogram for each bay.
  const EVENT_ART = [
    () => `<svg viewBox="0 0 100 70" aria-hidden="true">${A.closing(6, 4, 1)}</svg>`,
    () => `<svg viewBox="0 0 100 70" aria-hidden="true">${A.office(4, 6, 50, 60, '', 'evo')}<path d="M60 36h24m-7-7l7 7-7 7" stroke="${K.gold}" stroke-width="3" fill="none"/>${A.at(66, 8, 0.6, A.paper('S'))}</svg>`.replace(/fill="#E9A825"/g, `fill="${K.gold}"`),
    () => `<svg viewBox="0 0 100 70" aria-hidden="true">${A.pool(10, 10, 1)}</svg>`,
    () => `<svg viewBox="0 0 100 70" aria-hidden="true">${A.bond(4, 14, 0.62)}${A.bond(30, 8, 0.62)}${A.bond(54, 2, 0.62)}</svg>`,
    () => `<svg viewBox="0 0 100 70" aria-hidden="true">${A.person(8, 10, 0.9, K.onInk)}${A.person(30, 10, 0.9, K.onInk)}${A.person(52, 10, 0.9, K.onInk)}${A.coin(84, 30, 9)}${A.coin(84, 52, 9)}</svg>`,
  ];
  const EVENT_SHORT = ['Closing', 'Sale', 'Pool', 'Bonds', 'Investor collects'];

  function showChain(main, s) {
    const t = task(s.id), L = S.log[s.id], { stage, work } = beat(main, s);
    stage.innerHTML = `<div class="bays" id="bays" role="list">${[1, 2, 3, 4, 5].map((n) => `<div role="listitem" class="bay-wrap"><button type="button" class="bay" data-slot="${n}" id="bay${n}" aria-label="Bay ${n}, empty"><span class="bay-n">${n}</span><span class="bay-art" id="bayArt${n}"></span><span class="bay-txt" id="bayTxt${n}">Drop an event here</span><span class="bay-mk" id="bayMk${n}" aria-hidden="true"></span></button></div>`).join('')}</div>
      <div class="belt" aria-hidden="true"><span class="loan-rider" id="rider"></span></div><p class="caption" id="chCap">First on the left, last on the right.</p>`;
    const rowsToVal = (rows) => { const v = {}; (rows || []).forEach((r, i) => { if (r) v[String(i)] = String(r); }); return v; };
    work.innerHTML = `<div class="tray" id="tray">${C.EVENT_SHOWN.map((e, i) => `<button type="button" class="card" data-key="${i}" aria-pressed="false"><span class="grip" aria-hidden="true"></span><span>${esc(C.EVENTS[e])}</span></button>`).join('')}</div>
      <p class="hint-line">Tap an event, then tap its bay. Or drag it there.</p>
      <div class="actions"><button class="btn" type="button" id="chk">Check the order</button><span class="attempts" id="att">${L.attempts ? 'Checks so far: ' + L.attempts : ''}</span></div>
      <div class="fb" id="fb" aria-live="polite"></div><div class="actions" id="helpRow" hidden></div><div class="fb hint" id="helpBox"></div>${nextRow(s, !L.done)}`;
    const render = (val) => {
      for (let n = 1; n <= 5; n++) {
        const k = Object.keys(val).find((x) => val[x] === String(n)), b = $('#bay' + n);
        $('#bayMk' + n).textContent = ''; b.classList.remove('good', 'wrong');
        if (k == null) { $('#bayArt' + n).innerHTML = ''; $('#bayTxt' + n).textContent = 'Drop an event here'; b.setAttribute('aria-label', `Bay ${n}, empty`); b.classList.remove('filled'); continue; }
        const e = C.EVENT_SHOWN[Number(k)]; $('#bayArt' + n).innerHTML = EVENT_ART[e](); $('#bayTxt' + n).textContent = EVENT_SHORT[e]; b.classList.add('filled');
        b.setAttribute('aria-label', `Bay ${n}: ${C.EVENTS[e]}`);
      }
    };
    const toRows = (val) => C.EVENT_SHOWN.map((_, i) => (val[String(i)] || ''));
    const P = placer({ tray: $('#tray'), slotEls: () => $$('.bay', stage), value: rowsToVal(L.rows), slotWord: 'bay', render,
      onChange: (val) => { if (!L.done) { L.rows = toRows(val); saveState(); } } });
    const judge = (mark) => {
      const rows = toRows(P.val), res = C.judgeTask(t, { rows }, h);
      if (mark) (res.rowRes || []).forEach((rr, i) => { const n = Number(rows[i]); if (!n) return; const b = $('#bay' + n); b.classList.toggle('good', rr.ok); b.classList.toggle('wrong', !rr.ok); $('#bayMk' + n).textContent = rr.ok ? '✓' : '✗'; });
      return { rows, res };
    };
    const runLine = () => { if (reduced()) return; const r = $('#rider'); r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); Snd.humStart(1); setTimeout(() => Snd.humStop(), 2600); };
    let fails = L.fails || 0;
    const renderHelp = () => { const row = $('#helpRow'); if (!fails || L.done) { row.hidden = true; return; } row.hidden = false;
      row.innerHTML = ['Show me the first event', 'Show me the whole order'].slice(0, Math.min(2, fails)).map((lab, i) => `<button class="btn small ghost" type="button" data-l="${i + 1}">${lab}</button>`).join('');
      $$('button[data-l]', row).forEach((b) => b.addEventListener('click', () => { const lvl = Number(b.dataset.l); L.help = Math.max(L.help || 0, lvl); saveState(); showFb($('#helpBox'), 'hint', C.helpText(t, lvl, h)); })); };
    renderHelp();
    $('#chk').addEventListener('click', () => {
      const { rows, res } = judge(true); L.attempts = (L.attempts || 0) + 1; if (res.ok || !L.done) L.rows = rows;
      if (res.ok) { markDone(s.id); Snd.good(); showFb($('#fb'), 'ok', '<b>Right.</b> ' + C.praise(t, h)); $('#nextRow').hidden = false; $('#helpRow').hidden = true; $('#chCap').textContent = 'The machine runs: the loan leaves the lender soon after closing and ends with an investor.'; runLine(); }
      else { fails = L.fails = (L.fails || 0) + 1; showFb($('#fb'), 'bad', '<b>Not yet.</b> ' + esc(res.msg)); renderHelp(); }
      $('#att').textContent = 'Checks so far: ' + L.attempts; saveState();
    });
    wireNext(s);
    if (L.done) { judge(true); showFb($('#fb'), 'ok', C.praise(t, h)); }
  }

  // The five players and their pictograms.
  const PLAYER_ART = [
    () => `<svg viewBox="0 0 80 60" aria-hidden="true">${A.person(26, 6, 1, K.onInk)}${A.briefcase(44, 34, 1)}</svg>`,
    () => `<svg viewBox="0 0 80 60" aria-hidden="true">${A.office(14, 2, 52, 56, '', 'plo')}</svg>`,
    () => `<svg viewBox="0 0 80 60" aria-hidden="true">${A.bank(12, 4, 56, 54)}</svg>`,
    () => `<svg viewBox="0 0 80 60" aria-hidden="true">${A.booth(4, 8, 0.75)}</svg>`,
    () => `<svg viewBox="0 0 80 60" aria-hidden="true">${A.seated(6, 14, 1, K.muted)}${A.seated(28, 14, 1, K.muted)}${A.seated(50, 14, 1, K.muted)}<rect x="2" y="46" width="76" height="5" fill="${K.onInk}"/></svg>`,
  ];

  function showPaid(main, s) {
    const t = task(s.id), L = S.log[s.id], { stage, work } = beat(main, s);
    stage.innerHTML = `<div class="players" id="players" role="list">${C.PLAYERS.map((p, i) => `<div role="listitem" class="player-wrap"><button type="button" class="player" data-slot="${i}" id="pl${i}" aria-label="${esc(p)}, no pay tag yet">
        <span class="pl-art">${PLAYER_ART[i]()}</span><span class="pl-name">${esc(p)}</span><span class="pl-tag" id="plTag${i}">Hang a pay tag here</span><span class="pl-mk" id="plMk${i}" aria-hidden="true"></span><span class="pl-pay" id="plPay${i}" aria-hidden="true"></span></button></div>`).join('')}</div>
      <p class="caption" id="pdCap">Tap a pay tag, then the player it belongs to.</p>`;
    work.innerHTML = `<div class="tray" id="tray">${C.PAYS.map(([k, txt]) => `<button type="button" class="card tagcard" data-key="${k}" aria-pressed="false"><span class="grip" aria-hidden="true"></span><span>${esc(txt)}</span></button>`).join('')}</div>
      <p class="hint-line">Tap a pay tag, then tap its player. Or drag it there.</p>
      <div class="actions"><button class="btn" type="button" id="chk">Check the tags</button><span class="attempts" id="att">${L.attempts ? 'Checks so far: ' + L.attempts : ''}</span></div>
      <div class="fb" id="fb" aria-live="polite"></div><div class="actions" id="helpRow" hidden></div><div class="fb hint" id="helpBox"></div>${nextRow(s, !L.done)}`;
    const toRows = (val) => C.PLAYERS.map((_, i) => Object.keys(val).find((k) => val[k] === String(i)) || '');
    const rowsToVal = (rows) => { const v = {}; (rows || []).forEach((r, i) => { if (r) v[r] = String(i); }); return v; };
    const render = (val) => C.PLAYERS.forEach((p, i) => {
      const k = Object.keys(val).find((x) => val[x] === String(i)), tg = $('#plTag' + i), b = $('#pl' + i); b.classList.remove('good', 'wrong'); $('#plMk' + i).textContent = '';
      if (!k) { tg.textContent = 'Hang a pay tag here'; tg.classList.remove('hung'); b.setAttribute('aria-label', `${p}, no pay tag yet`); return; }
      const txt = C.PAYS.find((x) => x[0] === k)[1]; tg.textContent = txt; tg.classList.add('hung'); b.setAttribute('aria-label', `${p}: ${txt}`);
    });
    const P = placer({ tray: $('#tray'), slotEls: () => $$('.player', stage), value: rowsToVal(L.rows), slotWord: 'player', render,
      onChange: (val) => { if (!L.done) { L.rows = toRows(val); saveState(); } } });
    const judge = (mark) => { const rows = toRows(P.val), res = C.judgeTask(t, { rows }, h);
      if (mark) (res.rowRes || []).forEach((rr, i) => { if (!rows[i]) return; $('#pl' + i).classList.toggle('good', rr.ok); $('#pl' + i).classList.toggle('wrong', !rr.ok); $('#plMk' + i).textContent = rr.ok ? '✓' : '✗'; });
      return { rows, res }; };
    // When right: four are paid at the sale, at once; the bond's owner one coin a month for years.
    const payday = () => {
      $('#pdCap').innerHTML = 'Closing day: four players are paid at once. The bond’s owner is paid <b>one month at a time</b>, only while the family pays.';
      [0, 1, 2, 3].forEach((i) => { const el = $('#plPay' + i); el.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${A.coin(20, 20, 15)}</svg><b>Paid at the sale</b>`; el.classList.add('on'); });
      const el = $('#plPay4'); el.classList.add('on', 'drip'); let m = 0;
      const tickF = () => { m = Math.min(360, m + 6); el.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${A.coin(20, 20, 9)}</svg><b>Month ${m} of 360</b>`; if (m < 360 && !reduced() && document.body.contains(el)) setTimeout(tickF, 60); else el.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${A.coin(20, 20, 9)}</svg><b>Paid monthly for 30 years</b>`; };
      tickF(); [0, 1, 2, 3].forEach((i, k) => setTimeout(() => Snd.coin(), 120 * k));
    };
    let fails = L.fails || 0;
    const renderHelp = () => { const row = $('#helpRow'); if (!fails || L.done) { row.hidden = true; return; } row.hidden = false;
      row.innerHTML = ['Show me one', 'Show me every match'].slice(0, Math.min(2, fails)).map((lab, i) => `<button class="btn small ghost" type="button" data-l="${i + 1}">${lab}</button>`).join('');
      $$('button[data-l]', row).forEach((b) => b.addEventListener('click', () => { const lvl = Number(b.dataset.l); L.help = Math.max(L.help || 0, lvl); saveState(); showFb($('#helpBox'), 'hint', C.helpText(t, lvl, h)); })); };
    renderHelp();
    $('#chk').addEventListener('click', () => {
      const { rows, res } = judge(true); L.attempts = (L.attempts || 0) + 1; if (res.ok || !L.done) L.rows = rows;
      if (res.ok) { markDone(s.id); Snd.good(); showFb($('#fb'), 'ok', '<b>Right.</b> ' + C.praise(t, h)); $('#nextRow').hidden = false; $('#helpRow').hidden = true; payday(); }
      else { fails = L.fails = (L.fails || 0) + 1; showFb($('#fb'), 'bad', '<b>Not yet.</b> ' + esc(res.msg)); renderHelp(); }
      $('#att').textContent = 'Checks so far: ' + L.attempts; saveState();
    });
    wireNext(s);
    if (L.done) { judge(true); showFb($('#fb'), 'ok', C.praise(t, h)); payday(); }
  }

  // ---------------- check 1: drag the bond's price tag (up, level, down) ----------------
  function showQ1(main, s) {
    const L = S.log[s.id], q = C.quiz[s.quiz], { stage, work } = beat(main, s);
    const POS = ['up', 'level', 'down'], Y = { up: 40, level: 130, down: 220 };
    const cur = L.choice != null ? Object.keys(C.Q1_POS).find((k) => C.Q1_POS[k] === Number(L.choice)) : null;
    stage.innerHTML = `<div class="q1">
      <svg class="world" viewBox="0 0 760 330" role="img" aria-labelledby="q1T"><title id="q1T">Rates on new bonds rise; the old bond’s price tag can be dragged up, level or down</title>
        <g transform="translate(40 30)"><text x="90" y="0" text-anchor="middle" font-family="Jost" font-weight="600" font-size="17" fill="${K.onInk}">Rates on new bonds</text>
          <rect x="70" y="20" width="40" height="230" rx="4" fill="${K.ink2}" stroke="${K.muted}"/><rect id="rateBar" x="74" y="170" width="32" height="76" fill="${K.gold}"/>
          <path id="rateArrow" d="M130 200 L130 60 M118 76 L130 58 L142 76" stroke="${K.gold}" stroke-width="5" fill="none" stroke-linecap="round"/><text x="150" y="134" font-family="Jost" font-weight="600" font-size="17" fill="${K.gold}">rise</text></g>
        <g transform="translate(300 60)">${A.bond(0, 0, 3)}</g>
        <g id="seesaw" transform="translate(380 312)" opacity="0"><polygon points="-14,0 14,0 0,-22" fill="${K.muted}"/><g id="plank"><rect x="-220" y="-30" width="440" height="8" fill="${K.onInk}"/><text x="-220" y="-40" font-family="Jost" font-size="14" fill="${K.gold}">rates</text><text x="220" y="-40" text-anchor="end" font-family="Jost" font-size="14" fill="${K.onInk}">price</text></g></g>
      </svg>
      <div class="pricerail" id="rail"><div class="rail-track" aria-hidden="true"></div>
        ${POS.map((p) => `<button type="button" class="rail-stop" data-pos="${p}" style="top:${Y[p]}px">${p === 'up' ? 'Higher' : p === 'level' ? 'Same' : 'Lower'}</button>`).join('')}
        <div class="pricetag" id="tag" role="slider" tabindex="0" aria-label="Price of the old bond" aria-valuemin="-1" aria-valuemax="1" style="top:${Y[cur || 'level']}px"><span>Price</span></div></div></div>
      <p class="caption">${cur ? '' : 'Drag the price tag, or use the arrow keys.'}</p>`;
    let pos = cur || null;
    const tag = $('#tag');
    const setPos = (p, quiet) => { pos = p; tag.style.top = Y[p] + 'px'; tag.setAttribute('aria-valuenow', p === 'up' ? 1 : p === 'level' ? 0 : -1); tag.setAttribute('aria-valuetext', p === 'up' ? 'The price rises' : p === 'level' ? 'The price stays the same' : 'The price falls'); tag.classList.add('set'); if (!quiet) Snd.tick(); };
    if (cur) setPos(cur, true); else { tag.setAttribute('aria-valuenow', 0); tag.setAttribute('aria-valuetext', 'Not moved yet'); }
    $$('.rail-stop').forEach((b) => b.addEventListener('click', () => setPos(b.dataset.pos)));
    tag.addEventListener('keydown', (e) => { const i = POS.indexOf(pos || 'level'); if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setPos(POS[Math.max(0, i - 1)]); e.preventDefault(); } if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setPos(POS[Math.min(2, i + 1)]); e.preventDefault(); } });
    tag.addEventListener('pointerdown', (e) => { tag.setPointerCapture(e.pointerId); const rail = $('#rail').getBoundingClientRect();
      const mv = (ev) => { const y = Math.max(20, Math.min(240, ev.clientY - rail.top)); tag.style.top = y + 'px'; };
      const up = (ev) => { tag.removeEventListener('pointermove', mv); tag.removeEventListener('pointerup', up); const y = ev.clientY - rail.top; setPos(y < 85 ? 'up' : y > 175 ? 'down' : 'level'); };
      tag.addEventListener('pointermove', mv); tag.addEventListener('pointerup', up); });
    work.innerHTML = `<div class="actions"><button class="btn" type="button" id="chk">Check</button><span class="attempts" id="att">${L.attempts ? 'Checks so far: ' + L.attempts : ''}</span></div><div class="fb" id="fb" aria-live="polite"></div>${nextRow(s, !L.done)}`;
    const finish = () => { const ss = $('#seesaw'); ss.setAttribute('opacity', 1); const pl = $('#plank'); if (reduced()) pl.setAttribute('transform', 'rotate(14)'); else { let k = 0; const st = () => { k = Math.min(1, k + 0.04); pl.setAttribute('transform', `rotate(${14 * (1 - Math.pow(1 - k, 3))})`); if (k < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); } };
    $('#chk').addEventListener('click', () => {
      if (!pos) { showFb($('#fb'), 'bad', 'Drag the price tag first: higher, the same or lower.'); return; }
      const pick = C.Q1_POS[pos], ok = D.judgeQuiz(s.quiz, pick).ok; L.attempts = (L.attempts || 0) + 1; if (ok || !L.done) L.choice = pick;
      showFb($('#fb'), ok ? 'ok' : 'bad', esc(q.why[pick]) + (!ok && L.done ? ' Your earlier right answer is still saved.' : ''));
      if (ok) { markDone(s.id); Snd.good(); $('#nextRow').hidden = false; finish(); }
      $('#att').textContent = 'Checks so far: ' + L.attempts; saveState();
    });
    wireNext(s);
    if (L.done) { showFb($('#fb'), 'ok', esc(q.why[q.answer])); finish(); }
  }

  // ---------------- check 2: drop the missed payment on whoever loses ----------------
  function showQ2(main, s) {
    const L = S.log[s.id], q = C.quiz[s.quiz], { stage, work } = beat(main, s);
    const ORDER = ['broker', 'lender', 'agency', 'fund'];
    const ART = { broker: PLAYER_ART[0], lender: PLAYER_ART[1], agency: PLAYER_ART[3], fund: PLAYER_ART[4] };
    const cur = L.choice != null ? Object.keys(C.Q2_DROP).find((k) => C.Q2_DROP[k] === Number(L.choice)) : null;
    stage.innerHTML = `<div class="q2"><div class="q2-top"><svg viewBox="0 0 220 120" class="q2house" aria-hidden="true">${A.house(20, 14, 1, { body: K.line, door: K.ink })}<text x="160" y="70" font-family="Jost" font-weight="600" font-size="16" fill="${K.onInk}">Year 3</text></svg>
        <button type="button" class="token" id="token" aria-pressed="false"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" fill="${K.red}" stroke="${K.onInk}" stroke-width="2"/><path d="M14 10 L24 20 L18 25 L30 36" stroke="${K.ink}" stroke-width="3" fill="none"/></svg><span>Missed payment</span></button></div>
      <div class="q2-row" role="list">${ORDER.map((k) => `<div role="listitem"><button type="button" class="player q2p" data-slot="${k}" id="q2${k}"><span class="pl-art">${ART[k]()}</span><span class="pl-name">${esc(q.options[C.Q2_DROP[k]])}</span><span class="pl-mk" id="q2mk${k}" aria-hidden="true"></span></button></div>`).join('')}</div></div>
      <p class="caption">Tap the missed payment, then the player who loses money. Or drag it there.</p>`;
    let sel = cur;
    const paint = () => ORDER.forEach((k) => { $('#q2' + k).classList.toggle('chosen', sel === k); $('#q2' + k).setAttribute('aria-pressed', String(sel === k)); });
    paint();
    const token = $('#token'); let armed = false;
    token.addEventListener('click', () => { if (token.dataset.dragged) { delete token.dataset.dragged; return; } armed = !armed; token.setAttribute('aria-pressed', String(armed)); Snd.tick(); });
    ORDER.forEach((k) => $('#q2' + k).addEventListener('click', () => { sel = k; armed = false; token.setAttribute('aria-pressed', 'false'); Snd.thud(); paint(); }));
    token.addEventListener('pointerdown', (e) => {
      const sx = e.clientX, sy = e.clientY; let ghost = null;
      const mv = (ev) => { if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return; if (!ghost) { ghost = token.cloneNode(true); ghost.classList.add('ghost-drag'); document.body.appendChild(ghost); }
        ghost.style.left = (ev.clientX - 22) + 'px'; ghost.style.top = (ev.clientY - 22) + 'px'; };
      const up = (ev) => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); if (!ghost) return; ghost.remove(); token.dataset.dragged = '1';
        const hit = ORDER.find((k) => { const r = $('#q2' + k).getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; });
        if (hit) { sel = hit; Snd.thud(); paint(); } setTimeout(() => { delete token.dataset.dragged; }, 50); };
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    work.innerHTML = `<div class="actions"><button class="btn" type="button" id="chk">Check</button><span class="attempts" id="att">${L.attempts ? 'Checks so far: ' + L.attempts : ''}</span></div><div class="fb" id="fb" aria-live="polite"></div>${nextRow(s, !L.done)}`;
    $('#chk').addEventListener('click', () => {
      if (!sel) { showFb($('#fb'), 'bad', 'Drop the missed payment on one of the four players first.'); return; }
      const pick = C.Q2_DROP[sel], ok = D.judgeQuiz(s.quiz, pick).ok; L.attempts = (L.attempts || 0) + 1; if (ok || !L.done) L.choice = pick;
      ORDER.forEach((k) => { $('#q2mk' + k).textContent = k === sel ? (ok ? '✓' : '✗') : ''; });
      showFb($('#fb'), ok ? 'ok' : 'bad', esc(q.why[pick]) + (!ok && L.done ? ' Your earlier right answer is still saved.' : ''));
      if (ok) { markDone(s.id); Snd.good(); $('#nextRow').hidden = false; }
      $('#att').textContent = 'Checks so far: ' + L.attempts; saveState();
    });
    wireNext(s);
    if (L.done) showFb($('#fb'), 'ok', esc(q.why[q.answer]));
  }

  // ---------------- memo to the board (saves itself) ----------------
  function showNote(main, s) {
    const L = S.log[s.id], N = C.note, { stage, work } = beat(main, s);
    const g = S.log.game && S.log.game.value ? C.gameSim(S.log.game.value) : null, e = g && g.ending;   // the memo is about the game
    stage.innerHTML = `<svg class="world" viewBox="0 0 620 300" role="img" aria-labelledby="bdT"><title id="bdT">Your board, waiting for your memo</title>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => A.seated(70 + i * 72, 92, 2, i === 3 ? K.onInk : K.muted)).join('')}<rect x="40" y="166" width="540" height="16" fill="${K.onInk}"/><rect x="70" y="182" width="10" height="70" fill="${K.onInk}"/><rect x="540" y="182" width="10" height="70" fill="${K.onInk}"/>
      ${A.at(282, 136, 1, `<rect x="0" y="0" width="56" height="28" fill="${K.sheet}" stroke="${K.ink}"/><path d="M8 9h40M8 15h34M8 21h38" stroke="${K.ink}" stroke-width="2"/>`)}</svg>
      <p class="caption">${e ? (e.kind === 'fired' ? `Your game ended: fired in ${e.year}.` : `Your game ended: bankrupt in ${e.year}.`) : 'Finish the lender’s game first if you can; your memo is about what happened there.'}</p>`;
    work.innerHTML = `<div class="letterhead"><div class="lh">Memo to the board <span>${esc(C.story.title)}</span></div><p class="prompt">${esc(N.prompt)}</p>
      <label for="memo">${esc(N.label)}</label><textarea id="memo" aria-describedby="wc">${esc(S.memo)}</textarea>
      <p class="wc" id="wc" aria-live="polite"></p><p class="small">Any answer to the second question earns full credit if it gives a reason that names what someone was paid for or was supposed to check. Your memo prints on your receipt.</p></div>${nextRow(s, !L.done)}`;
    const ta = $('#memo'), wc = $('#wc'); let timer = null;
    const upd = () => {
      const n = h.wordCount(ta.value), ok = D.judgeNote(ta.value).ok;
      if (!L.done || ok) S.memo = ta.value;          // a saved memo is never replaced by a too-short edit
      if (ok) { markDone(s.id); $('#nextRow').hidden = false; }
      wc.className = 'wc' + (ok ? ' ok' : ''); wc.textContent = `${n} ${n === 1 ? 'word' : 'words'}. ` + (ok ? (n > 120 ? 'Saved. Keep it to 120 words so all of it prints.' : 'Saved.') : L.done ? `Under ${N.minWords} words: your saved memo stays on your receipt.` : `Write at least ${N.minWords} to save it.`);
      saveState();
    };
    ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(upd, 350); }); ta.addEventListener('change', upd); upd();
    wireNext(s);
  }

  // ---------------- the receipt ----------------
  function wrapLines(g, text, maxW, maxLines) { const words = String(text).replace(/\s+/g, ' ').trim().split(' '); const lines = []; let cur = ''; for (const w of words) { const t2 = cur ? cur + ' ' + w : w; if (g.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; } if (cur) lines.push(cur); if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += ' …'; } return lines; }
  async function makeReceiptBlob() {
    try { if (document.fonts && document.fonts.load) await Promise.all([document.fonts.load('600 40px Jost'), document.fonts.load('400 20px Newsreader')]); } catch (e) { /* fall back */ }
    const payload = D.makePayload(S.code, S.log, S.memo), done = doneCount(), pts = D.pointsFor(done), n = D.STEPS.length;
    const cols = 4, rowsN = Math.ceil(n / cols), W = 1200, Hh = 1040 + rowsN * 96; const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d');
    const J = (w, px) => `${w} ${px}px Jost, Futura, 'Century Gothic', sans-serif`, NR = (px, it) => `${it ? 'italic ' : ''}${px}px Newsreader, Georgia, serif`;
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, Hh);
    g.fillStyle = K.ink; g.fillRect(0, 0, W, 210);
    // header pictogram row: houses to coins
    for (let i = 0; i < 9; i++) { const x = 760 + i * 46; g.fillStyle = i < 3 ? K.onInk : i < 6 ? K.blue2 : K.gold; if (i < 3) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x + 16, 56); g.lineTo(x + 32, 70); g.lineTo(x + 28, 70); g.lineTo(x + 28, 92); g.lineTo(x + 4, 92); g.lineTo(x + 4, 70); g.fill(); } else if (i < 6) { g.fillRect(x + 4, 56, 24, 34); } else { g.beginPath(); g.arc(x + 16, 74, 16, 0, Math.PI * 2); g.fill(); } }
    g.fillStyle = K.muted; g.font = J(500, 24); g.fillText(C.story.kicker, 70, 70);
    g.fillStyle = K.onInk; g.font = J(600, 64); g.fillText(C.story.title, 70, 148);
    g.fillStyle = K.gold; g.font = J(600, 30); g.fillText('Desk code ' + h.fmtCode(S.code), 70, 192);
    const full = done === n; g.fillStyle = full ? K.green : '#8A5A00'; g.fillRect(70, 250, W - 140, 104);
    g.fillStyle = '#FFFFFF'; g.font = J(700, 50); g.fillText('Points: ' + pts + ' / ' + D.POINTS, 100, 320);
    g.font = J(500, 25); g.textAlign = 'right'; g.fillText(done + ' of ' + n + ' steps complete · graded on completion and the memo', W - 100, 315); g.textAlign = 'left';
    const bw = (W - 140 - (cols - 1) * 14) / cols;
    D.STEPS.forEach((s, k) => { const x = 70 + (k % cols) * (bw + 14), y = 384 + Math.floor(k / cols) * 96, l = S.log[s.id];
      g.fillStyle = l.done ? '#DDEFE6' : '#FBE5DD'; g.fillRect(x, y, bw, 80); g.fillStyle = l.done ? K.green : K.red; g.fillRect(x, y, 8, 80);
      g.fillStyle = l.done ? '#1F6B50' : '#B03515'; let px = 21; const tl = (l.done ? '✓ ' : '✗ ') + (k + 1) + '. ' + s.label; do { g.font = J(600, px); px--; } while (g.measureText(tl).width > bw - 34 && px > 12); g.fillText(tl, x + 22, y + 36);
      g.fillStyle = '#4F5D70'; g.font = J(400, 18); g.fillText(l.done ? 'complete' : 'not finished', x + 22, y + 63); });
    const ny = 384 + rowsN * 96 + 44; g.fillStyle = K.ink; g.font = J(600, 25); g.fillText(C.note.receiptHeading, 70, ny);
    g.strokeStyle = K.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(70, ny + 14); g.lineTo(W - 70, ny + 14); g.stroke();
    g.font = NR(23); (S.memo.trim() ? wrapLines(g, S.memo, W - 140, 9) : ['(no memo yet)']).forEach((ln, i) => g.fillText(ln, 70, ny + 52 + i * 31));
    g.fillStyle = '#4F5D70'; g.font = J(400, 20); g.fillText('Issued ' + new Date(payload.issued).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }), 70, Hh - 140);
    g.fillStyle = K.ink; g.font = 'bold 27px ui-monospace, Menlo, monospace'; g.fillText('Verification code  ' + D.shortCode(payload.sum), 70, Hh - 100);
    g.fillStyle = '#4F5D70'; g.font = J(400, 19); g.fillText('Instructors: enter the points shown above. To spot-check, open ' + C.verifyUrl.replace('https://', ''), 70, Hh - 60);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png')); const bytes = new Uint8Array(await blob.arrayBuffer());
    return { blob: new Blob([D.addTextChunk(bytes, D.encodeReceipt(payload))], { type: 'image/png' }), url: cv.toDataURL('image/png'), payload, pts, done };
  }
  async function showReceipt(main) {
    main.insertAdjacentHTML('beforeend', `<section class="beat" aria-labelledby="bt"><div class="stage"><div class="stage-in" id="rcStage"><p class="caption">Making your receipt…</p></div></div>
      <div class="work" id="rcWork"><p class="kicker">Receipt</p><h2 id="bt">Your receipt</h2></div></section>`);
    const r = await makeReceiptBlob(), all = r.done === D.STEPS.length, fileName = C.filePrefix + '_' + h.fmtCode(S.code) + '.png';
    $('#rcStage').innerHTML = `<img class="receipt-preview" src="${r.url}" alt="Receipt preview: desk code ${h.fmtCode(S.code)}, ${r.pts} of ${D.POINTS} points, ${r.done} of ${D.STEPS.length} steps complete, verification code ${D.shortCode(r.payload.sum)}.">`;
    $('#rcWork').insertAdjacentHTML('beforeend', `<p class="points">${r.pts} / ${D.POINTS} points</p>
      <p>${all ? 'Every step is complete. Download your receipt and upload it to the assignment page.' : 'Finish the open steps below, then download a new receipt.'}</p>
      <div class="actions"><a class="btn gold" id="dl" download="${fileName}" href="#">Download your receipt</a></div>
      <ul class="steps-left">${D.STEPS.map((s, i) => `<li><span class="st ${S.log[s.id].done ? 'ok' : 'no'}">${S.log[s.id].done ? '✓ done' : '✗ open'}</span><span>${i + 1}. ${esc(s.label)}</span>${S.log[s.id].done ? '' : ` <button class="btn small ghost" type="button" data-go="${s.id}">Open</button>`}</li>`).join('')}</ul>
      <p class="small">The file is named ${esc(fileName)}. Upload the downloaded file itself, not a screenshot: your instructor’s checker reads data stored inside the file. If you finish more steps later, download a new receipt.</p>
      <p class="small">This desk is graded on completion and on your memo: all ${D.STEPS.length} steps and a memo that does what step ${stepIdx('note') + 1} asks earn all ${D.POINTS} points; at least ${Math.ceil(D.STEPS.length / 2)} steps earn ${D.POINTS / 2}.</p>`);
    $('#dl').href = URL.createObjectURL(r.blob);
    $$('button[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
  }
  M.makeReceiptBlob = makeReceiptBlob;

  // ---------------- the title screen ----------------
  function showStart() {
    S.at = 'start'; renderNav();
    const last = store.get(KEY + ':last'), lastSaved = last ? store.get(KEY + ':' + D.seedFor(last)) : null, n = D.STEPS.length, main = $('#main');
    main.innerHTML = `<section class="title-beat" aria-labelledby="mast"><div class="title-in">
      <p class="kicker" style="color:${K.muted}">${esc(C.story.kicker)}</p>
      <div class="title-grid"><h1 class="mast" id="mast"><span>The Mortgage</span><span>Machine</span></h1>
        <div><p class="dek">${esc(C.story.dek)}</p>
          ${lastSaved ? `<p style="margin:12px 0 0;color:${K.muted}">Welcome back. Your desk code is <b style="color:${K.onInk}">${h.fmtCode(last)}</b>.</p>` : ''}
          <div class="actions on-ink"><button class="btn" type="button" id="goBtn">${lastSaved ? 'Continue where you left off' : 'Run the lender'}</button></div>
          <details class="resume"><summary>Started on another computer?</summary><form id="codeForm" novalidate><label for="dc">Your desk code</label>
            <input type="text" id="dc" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-2345" aria-describedby="dcHelp startErr">
            <p class="small" id="dcHelp" style="color:${K.muted}">It is at the foot of every page of the desk and on your receipt.</p><p class="err" id="startErr" role="alert"></p>
            <div class="actions on-ink"><button class="btn ghost" type="submit">Continue with this code</button></div></form></details></div></div>
      <div id="heroMachine" style="margin-top:22px"></div>
      <div class="howbox"><h2>How this desk is graded</h2><ul>
        <li>${n} short steps. First you run the lender from 2002 to 2008; finishing the game completes its step, however it turns out. Then you find out what just happened, write a memo to your board, and work out what one loan costs a family.</li>
        <li><b>This desk is graded on completion and on your memo.</b> Finish all ${n} steps, with a memo that does what step ${stepIdx('note') + 1} asks, to earn all ${D.POINTS} points (at least ${Math.ceil(n / 2)} steps earns ${D.POINTS / 2}). A wrong answer never costs points.</li>
        <li>Check your answers as often as you like. If you get stuck, the help buttons show the setup with your own numbers.</li>
        <li>The <b>Calculator</b> button at the top opens a calculator beside the desk.</li>
        <li>When you finish, download your receipt and upload it to the assignment page.</li></ul></div></div></section>`;
    if (M.heroMachine) M.heroMachine($('#heroMachine'));
    $('#goBtn').addEventListener('click', () => { startFor(lastSaved ? last : h.newCode()); const first = D.STEPS.find((s) => !S.log[s.id].done); go(lastSaved && S.at && S.at !== 'start' ? S.at : (first ? first.id : 'receipt')); });
    $('#codeForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#dc').value;
      if (!h.validCode(v)) { $('#startErr').textContent = 'A desk code is 8 letters and numbers, like ABCD-2345. Check it against your receipt.'; $('#dc').focus(); return; }
      startFor(v); const first = D.STEPS.find((s) => !S.log[s.id].done); go(S.at && S.at !== 'start' ? S.at : (first ? first.id : 'receipt')); });
  }
  M.showStart = showStart;

  // ---------------- self-checks (interactive-health contract) ----------------
  const checks = []; const reg = (name, fn) => checks.push({ name, fn });
  root.__selfCheck = async () => { const out = []; for (const c of checks) { try { const r = await c.fn(); out.push(r === true || r === undefined ? { name: c.name, ok: true } : r === false ? { name: c.name, ok: false } : { name: c.name, ok: !!r.ok, detail: r.detail }); } catch (e) { out.push({ name: c.name, ok: false, detail: String(e) }); } } return { ok: out.every((x) => x.ok), checks: out }; };
  reg('tasks generate for a test code', () => D.buildTasks('SELFCHEK').length === D.STEPS.filter((s) => s.kind === 'task').length || { ok: false, detail: 'task count mismatch' });
  reg('each task accepts its own answer and rejects a wrong one', () => { for (const t of D.buildTasks('SELFCHEK')) { if (!C.judgeTask(t, C.selfAnswer(t, h), h).ok) return { ok: false, detail: t.id + ' rejects its own answer' }; if (C.judgeTask(t, C.selfWrong(t, h), h).ok) return { ok: false, detail: t.id + ' accepts a wrong answer' }; } return true; });
  reg('both gesture checks grade only the right gesture', () => { const q1 = Object.keys(C.Q1_POS).filter((k) => D.judgeQuiz(0, C.Q1_POS[k]).ok), q2 = Object.keys(C.Q2_DROP).filter((k) => D.judgeQuiz(1, C.Q2_DROP[k]).ok); return (q1.join() === 'down' && q2.join() === 'fund') || { ok: false, detail: `price tag passes ${q1}, drop passes ${q2}` }; });
  reg('the 30-year pile ends at the step 5 answer', () => { const t = D.buildTasks('SELFCHEK').find((x) => x.id === 'total'), s = C.schedule(t.L, t.r, t.pay); return Math.abs(s[359].cumInterest - t.totalInt) < 1 && s[359].balance < 1 && s[179].balance > t.L / 2 || { ok: false, detail: `pile ${s[359].cumInterest} vs ${t.totalInt}` }; });
  reg('the game has no winning path: all loose is bankrupt in 2007, strict twice is fired in 2003', () => { const a = C.gameSim('LLLLLLL').ending, b = C.gameSim('SS').ending; return (a.kind === 'bust' && a.year === 2007 && b.kind === 'fired' && b.year === 2003) || { ok: false, detail: JSON.stringify([a, b]) }; });
  reg('the house-price series is loaded', () => (root.HPI && root.HPI.values.length === 156 && root.HPI.values[0] === 100) || { ok: false, detail: 'HPI missing or wrong length' });
  reg('a page view rendered', () => ($('#main').textContent.trim().length > 150 && $$('#main svg, #main img').length > 0) || { ok: false, detail: 'main is empty or has no drawing' });
  reg('receipt PNG round-trips its payload', async () => {
    const code = 'SELFCHEK', tasks = D.buildTasks(code), log = {};
    D.STEPS.forEach((s) => { if (s.kind === 'check') log[s.id] = { done: true, choice: C.quiz[s.quiz].answer }; else if (s.kind === 'task') log[s.id] = Object.assign({ done: true }, C.selfAnswer(tasks.find((t) => t.id === s.id), h)); else log[s.id] = { done: true }; });
    const p = D.makePayload(code, log, 'word '.repeat(C.note.minWords + 5)); const cv2 = document.createElement('canvas'); cv2.width = 20; cv2.height = 20;
    const blob = await new Promise((res) => cv2.toBlob(res, 'image/png'));
    const v = D.verifyPayload(D.decodeReceipt(D.readTextChunk(D.addTextChunk(new Uint8Array(await blob.arrayBuffer()), D.encodeReceipt(p)))));
    return (v.checksumOk && v.done === D.STEPS.length && v.points === D.POINTS) || { ok: false, detail: JSON.stringify(v.problems) };
  });
  M.reg = reg;

  // ---------------- boot ----------------
  M.boot = () => {
    shell(); Snd.on = false;   // off by default on every visit
    const last = store.get(KEY + ':last'), lastSaved = last ? store.get(KEY + ':' + D.seedFor(last)) : null;
    if (lastSaved && lastSaved.code && lastSaved.at && lastSaved.at !== 'start') { startFor(lastSaved.code); go(S.at); } else showStart();
  };
})(window);

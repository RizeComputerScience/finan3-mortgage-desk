// The Mortgage Machine (v2) lesson test. Ported from version 1's tests/core_test.js: every generic check and every lesson
// assertion is kept; the checks that read v1's HTML (taskView) now read the v2 problem text, and v2 adds checks for the
// house's 30-year track, the gesture checks, the step order and the price series.
// Usage: node tests/core_test.js <absolute path to the v2 site folder>
globalThis.DESK_NO_UI = true;
require(process.argv[2] + '/js/core.js'); require(process.argv[2] + '/js/rules.js');
const D = DeskEngine.make(globalThis.DESK), h = DeskEngine.h, C = D.C; let bad = 0;
const chk = (c, m) => { if (!c) { bad++; if (bad < 15) console.log('BAD', m); } };
const BANNED = /—|–|count as correct|Answers within|row above|TEMPLATE/;
const codes = new Set(); let swaps = 0, caught = 0;
for (let i = 0; i < 4000; i++) {
  const code = h.newCode ? h.newCode() : 'CODE' + i; codes.add(h.normCode(code));
  const T = D.buildTasks(code);
  chk(T.length === D.STEPS.filter((s) => s.kind === 'task').length, 'task count');
  for (const t of T) {
    const good = C.selfAnswer(t, h);
    chk(C.judgeTask(t, good, h).ok, 'self ' + t.id + ' ' + code + ' ' + JSON.stringify(C.judgeTask(t, good, h)));
    chk(!C.judgeTask(t, C.selfWrong(t, h), h).ok, 'wrong accepted ' + t.id);
    if (i < 400) {
      const P = C.PROBLEM[t.id](t), ex = C.EXAMPLES[t.id];
      const s = [P.place, P.body, C.helpText(t, 1), C.helpText(t, 2), C.praise(t)].join(' ');
      chk(!/NaN|undefined|Infinity/.test(s), 'NaN or undefined shown on ' + t.id);
      chk(!BANNED.test(s), 'banned or placeholder text on ' + t.id + ': ' + (s.match(BANNED) || [])[0]);
      chk(P.body.replace(/<[^>]+>/g, '').split(/\s+/).length <= 45, 'problem statement over 45 words on ' + t.id + ' (rule 28, as v1 counts it)');
      if (ex) { const el = ex.lines(), tl = C.linesFor(t); chk(el.length === tl.length && el.every((l, k) => l.label.replace(/[\d.%]+/g, '') === tl[k].label.replace(/[\d.%]+/g, '')), 'worked example does not use the same sheet as the task on ' + t.id); }
      chk(!!C.helpText(t, 1) && !!C.helpText(t, 2) && !!C.praise(t), 'help or praise missing on ' + t.id);
    }
  }
  // receipt round trip: a finished log verifies at full points; a swapped code is caught
  if (i < 300) {
    const log = {};
    for (const s of D.STEPS) {
      const e = { done: true, attempts: 1, help: 0, at: new Date().toISOString() };
      if (s.kind === 'check') e.choice = String(C.quiz[s.quiz].answer);
      if (s.kind === 'task') { const a = C.selfAnswer(T.find((x) => x.id === s.id), h); e.rows = a.rows; e.choice = a.choice; e.value = a.value; }
      log[s.id] = e;
    }
    const memo = Array(C.note.minWords + 2).fill('word').join(' ');
    const p = D.makePayload(code, log, memo), v = D.verifyPayload(p);
    chk(v.checksumOk && v.done === D.STEPS.length && v.points === D.POINTS, 'verify round trip ' + JSON.stringify(v.problems));
    const other = Object.assign({}, p, { code: h.normCode(h.newCode ? h.newCode() : 'OTHER' + i) }); other.sum = D.checksum(JSON.stringify({ v: other.v, id: 'code', app: other.app, code: other.code, issued: other.issued, steps: other.steps, memo: other.memo }));
    const vo = D.verifyPayload(other);
    swaps++; if (vo.done < D.STEPS.length) caught++;
    const edited = Object.assign({}, p, { memo: p.memo + ' edited' });
    chk(!D.verifyPayload(edited).checksumOk, 'edited receipt passes the checksum');
  }
}
// A receipt copied onto another desk code should fail verification: needs enough seeded variety in the task answers.
console.log(`swap caught ${caught} of ${swaps}`);
chk(D.STEPS.every((s) => s.kind !== 'task') || caught >= 0.85 * swaps, `a receipt moved to another desk code still verifies in full too often (${swaps - caught} of ${swaps}); seed more variety`);
chk(codes.size > 3990, 'desk codes repeat too often: ' + codes.size);
chk(C.verifyUrl === 'https://rizecomputerscience.github.io/finan3-mortgage-desk/v2/verify.html', 'verifyUrl is v2\'s checker: ' + C.verifyUrl);
chk(!C.calcHint, 'calcHint must be empty (rule 33)');
for (const q of C.quiz) chk(q.options.length === 4 && q.why.length === 4 && !BANNED.test(JSON.stringify(q)), 'quiz ' + q.title);
chk(!/\bexams?\b/i.test(JSON.stringify(C.quiz) + JSON.stringify(C.steps) + JSON.stringify(C.story) + JSON.stringify(C.note)), 'FINAN III has no exams: remove "exam" from the desk copy');
// ---- desk-specific checks go here ----
// THE LESSON TEST (COURSE-SPEC "The four desks"; w06/TEACHING-MAP.md lists the lesson of each step in one sentence).
// Each block asserts the desk SHOWS its step's lesson, on the same functions the page and the judge use.
{
  const near = (a, b, t) => Math.abs(a - b) <= t;
  const quizRight = (qi) => C.quiz[qi].options[C.quiz[qi].answer];
  const task = (code, id) => D.buildTasks(code).find((t) => t.id === id);
  let lessons = 0; const lesson = (ok, msg) => { chk(ok, 'LESSON ' + msg); if (ok) lessons++; };

  // 1. A mortgage-backed bond is a bond: rates up, price down; "payments are fixed, so nothing changes" is wrong.
  lesson(/^It falls/.test(quizRight(0)) && C.quiz[0].answer !== C.quiz[0].options.findIndex((o) => /Nothing changes/.test(o)), 'step 1: price falls');

  // 3 (table). Every entry of the payment table is the exact 30-year payment on $100,000, to the cent.
  for (const r of C.RATES) lesson(near(C.TABLE[r], C.payment(100000, r), 0.005), `step 3: table entry at ${r} is the formula's payment`);
  lesson(near(C.TABLE[0.05], 536.82, 1e-9) && near(C.TABLE[0.03], 421.60, 1e-9) && near(C.TABLE[0.065], 632.07, 1e-9), 'step 3: table spot values');

  for (let i = 0; i < 400; i++) {
    const code = 'F' + i, L = task(code, 'loan'), P = task(code, 'pay'), F = task(code, 'first'), T = task(code, 'total');
    // 2. loan = price × (1 − down share); LTV = 1 − down share; typing the down payment as the loan is diagnosed.
    lesson(near(L.L, L.P * (1 - L.d), 1e-6) && near(C.linesFor(L)[3].num, 1 - L.d, 1e-12), 'step 2: loan and LTV');
    const r2 = C.judgeTask(L, { rows: [null, String(L.down), String(L.down), '80%'] }, h);
    lesson(!r2.ok && /down payment/.test(r2.msg), 'step 2: down payment typed as the loan is diagnosed');
    lesson(!(L.P === 300000 && L.d === 0.2), 'step 2: never the worked example');
    // 3. payment = table entry × loan ÷ 100,000; the wrong rate's row is rejected; never the worked example's 5%.
    lesson(near(P.pay, C.TABLE[P.r] * P.L / 100000, 0.006) && near(P.pay, C.payment(P.L, P.r), 0.03) && P.r !== 0.05, 'step 3: payment from the table');
    const other = C.RATES.find((r) => r !== P.r);
    lesson(!C.judgeTask(P, { rows: [null, String(P.hund), String(C.TABLE[other]), String(P.hund * C.TABLE[other])] }, h).ok, 'step 3: wrong row rejected');
    // 4. interest = loan × rate ÷ 12; interest + principal = payment; under a third of the payment pays down the loan.
    lesson(near(F.interest, F.L * F.r / 12, 0.006) && near(F.interest + F.principal, F.pay, 0.011) && F.principal / F.pay < 1 / 3, 'step 4: the first payment is mostly interest');
    const y = C.judgeTask(F, { rows: [null, String(F.L * F.r), String(F.pay - F.L * F.r)] }, h);
    lesson(!y.ok && /whole year/.test(y.msg), 'step 4: a whole year of interest is diagnosed');
    // 5. total interest = payment × 360 − loan, more than half the loan at every seeded rate.
    lesson(near(T.totalInt, T.pay * 360 - T.L, 0.01) && T.totalInt > 0.5 * T.L, 'step 5: total interest');
    lesson(C.linesFor(T).every((l) => !/\d/.test(l.calc.replace('360', '').replace('30', ''))), 'step 5: own numbers (calculation column in words)');
  }

  // 6. Lock-in: the spec's $320,000 at 3% and 6.5%, about $1,349 and $2,023, from the formula and from the table.
  { const t = task('K', 'lockin');
    lesson(near(C.payment(320000, 0.03), 1349, 1) && near(C.payment(320000, 0.065), 2023, 1), 'step 6: formula gives about $1,349 and $2,023');
    lesson(near(t.lo, 1349, 1) && near(t.hi, 2023, 1) && near(t.gap, t.hi - t.lo, 1e-9) && t.gap > 670 && t.gap < 676, 'step 6: table gives the same, gap about $673');
    lesson(C.judgeTask(t, { rows: ['1349', '2023', '674'], choice: 'move' }, h).ok, 'step 6: rounded dollars accepted');
    lesson(!C.judgeTask(t, { rows: ['1349', '2023', '674'], choice: 'bank' }, h).ok, 'step 6: wrong reason rejected'); }

  // 7. A loan's life: only the true order passes; each misplaced event is marked.
  { const t = task('K', 'chain'); const right = C.EVENT_SHOWN.map((e) => String(e + 1));
    lesson(C.judgeTask(t, { rows: right }, h).ok, 'step 7: the true order passes');
    lesson(C.EVENTS[0].includes('closing') && C.EVENTS[1].includes('sells') && /pool/.test(C.EVENTS[2]) && /bonds/.test(C.EVENTS[3]) && /pension fund buys/.test(C.EVENTS[4]), 'step 7: events in life order');
    let perms = 0, passes = 0; const perm = (a, k) => { if (k === a.length) { perms++; if (C.judgeTask(t, { rows: a.map(String) }, h).ok) passes++; return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
    perm([1, 2, 3, 4, 5], 0); lesson(perms === 120 && passes === 1, 'step 7: exactly one of 120 orders passes');
    const swapped = right.slice(); [swapped[0], swapped[1]] = [swapped[1], swapped[0]]; const r = C.judgeTask(t, { rows: swapped }, h);
    lesson(!r.ok && r.rowRes.filter((x) => !x.ok).length === 2, 'step 7: a swap marks exactly the two rows'); }

  // 8. Who gets paid: only the true matching passes; exactly one player is paid only while the family keeps paying.
  { const t = task('K', 'paid');
    lesson(C.judgeTask(t, { rows: t.answer }, h).ok, 'step 8: the true matching passes');
    const ongoing = C.PAYS.filter((p) => /for as long as the family pays/.test(p[1]));
    lesson(ongoing.length === 1 && /Pension fund/.test(C.PLAYERS[ongoing[0][2]]), 'step 8: only the bond owner is paid over time');
    let perms = 0, passes = 0; const perm = (a, k) => { if (k === a.length) { perms++; if (C.judgeTask(t, { rows: a.slice() }, h).ok) passes++; return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
    perm(['a', 'b', 'c', 'd', 'e'], 0); lesson(perms === 120 && passes === 1, 'step 8: exactly one of 120 matchings passes'); }

  // 9. Who is left holding it: the investor.
  lesson(/pension fund that owns the bond/.test(quizRight(1)), 'step 9: the bond owner loses');

  // 10. THE GAME (round 3: four years, 2004 to 2007). Enumerate all 3^4 = 81 strategies.
  const G = C.gameSim, Y = C.YEARS, ends = { fired: 0, bust: 0 }, byYear = {};
  lesson(Y.join() === '2004,2005,2006,2007', 'step 10: the game runs 2004 to 2007');
  for (let i = 0; i < 3; i++) lesson(C.PROFIT.L[i] > C.PROFIT.N[i] && C.PROFIT.N[i] > C.PROFIT.S[i], `step 10: loose earns most in ${Y[i]}`);
  lesson(JSON.stringify(C.PROFIT) === JSON.stringify({ S: [6, 5, 4, 5], N: [14, 12, 10, 8], L: [32, 40, 40, -30] }) && C.BACK[2005] === 120 && C.BACK[2006] === 130, 'step 10: the fees and buybacks are version 1\'s figures for 2004 to 2007');
  let all = 0; const T10 = task('K', 'game');
  for (let n = 0; n < 81; n++) {
    let x = n, seq = ''; for (let k = 0; k < 4; k++) { seq += 'SNL'[x % 3]; x = Math.floor(x / 3); }
    const s = G(seq); all++;
    lesson(!!s.ending && (s.ending.kind === 'fired' || s.ending.kind === 'bust'), `step 10: ${seq} ends in one of the two bad endings (no winning path)`);
    if (!s.ending) continue;
    ends[s.ending.kind]++; byYear[s.ending.kind + s.ending.year] = (byYear[s.ending.kind + s.ending.year] || 0) + 1;
    s.rows.filter((r) => r.year < 2007).forEach((r) => lesson(r.rprofit > r.profit || (r.choice === 'L' && r.rprofit === r.profit), `step 10: ${seq} ${r.year} the rival out-earns any non-loose choice`));
    if (s.ending.kind === 'fired') lesson(s.ending.year <= 2006 && s.rows.slice(-2).every((r) => r.choice !== 'L'), `step 10: ${seq} fired after two non-loose years`);
    if (s.ending.kind === 'bust') lesson(s.ending.year === 2007 && s.rows[s.rows.length - 1].cash < 0, `step 10: ${seq} bankrupt in 2007 when cash runs out`);
    // A fired player watches the rival's company from the inside to the crash: the rival, loose every year, is bankrupt in 2007.
    if (s.ending.kind === 'fired') { const r = G('LLLL'); lesson(r.rivalBust === 2007 && r.rows.length === 4 && r.ending.kind === 'bust' && r.ending.year === 2007, `step 10: ${seq} fired in ${s.ending.year}, then sees the rival reach the crash`); }
    const played = 'g4:' + seq.slice(0, s.ending.at + 1);
    lesson(C.judgeTask(T10, { value: played }, h).ok, `step 10: ${played} completes the step`);
    if (s.ending.at < 3) lesson(!C.judgeTask(T10, { value: 'g4:' + seq }, h).ok, `step 10: ${seq} rejected past its ending`);
    if (s.ending.at > 0) lesson(!C.judgeTask(T10, { value: played.slice(0, -1) }, h).ok, `step 10: ${played.slice(0, -1)} (unfinished) rejected`);
  }
  const games = new Map(); for (let n = 0; n < 81; n++) { let x = n, q = ''; for (let k = 0; k < 4; k++) { q += 'SNL'[x % 3]; x = Math.floor(x / 3); } const g = G(q); games.set(q.slice(0, g.ending.at + 1), g.ending.kind); }
  const gk = [...games.values()]; console.log(`distinct games ${games.size}: fired ${gk.filter((k) => k === 'fired').length}, bankrupt ${gk.filter((k) => k === 'bust').length}`);
  lesson(all === 81 && ends.fired > 0 && ends.bust > 0, `step 10: both endings reachable (${JSON.stringify(ends)})`);
  lesson(G('LLLL').ending.kind === 'bust' && G('LLLL').ending.year === 2007, 'step 10: all-loose goes bankrupt in 2007');
  lesson(G('SS').ending.kind === 'fired' && G('SS').ending.year === 2005, 'step 10: strict two years running is fired in 2005');
  lesson(G('LLLL').rivalBust === 2007, 'step 10: the rival goes bankrupt in 2007');
  console.log('game endings by year', JSON.stringify(byYear));
  for (const k of ['fired', 'bust']) for (const yy of [2005, 2006, 2007]) {
    const E = C.ENDINGS[k](yy), n = (E.text.match(/[.!?](\s|$)/g) || []).length;
    lesson(n >= 2 && n <= (k === 'fired' ? 4 : 3), `step 10: ${k} ending has 2 or 3 sentences, plus the survivors sentence when fired (${n})`);
    if (k === 'fired') lesson(/kept their standards and survived/.test(E.text), 'step 10: fired ending says some real lenders survived');
    lesson(/\bpaid\b/.test(E.text) && /\bchecking\b/.test(E.text) && /Wall Street/.test(E.text), `step 10: ${k} ending points at incentives`);
    lesson(E.text.split(/\s+/).length <= (k === 'fired' ? 95 : 75), `step 10: ${k} ending is short`);
  }

  // Few words per screen: each year's news is at most 35 words; each option at most 14.
  Y.forEach((y) => lesson(C.NEWS[y].split(/\s+/).length <= 35, `step 10: news for ${y} is short`));
  C.OPTS.forEach((o) => lesson(o[2].split(/\s+/).length <= 14, `step 10: option ${o[1]} is short`));
  console.log(`lesson checks passed: ${lessons}`);

  // The desk is completable at full points from either ending (and never "failed"): build a full log both ways and verify.
  const play = (code, gameSeq) => {
    const T = D.buildTasks(code), log = {};
    for (const s of D.STEPS) {
      const e = { done: true, attempts: 1, help: 0, at: new Date().toISOString() };
      if (s.kind === 'check') e.choice = String(C.quiz[s.quiz].answer);
      if (s.kind === 'task') { const t = T.find((x) => x.id === s.id); const a = s.id === 'game' ? { value: gameSeq } : C.selfAnswer(t, h); e.rows = a.rows; e.choice = a.choice; e.value = a.value; }
      log[s.id] = e;
    }
    return D.verifyPayload(D.makePayload(code, log, Array(C.note.minWords + 2).fill('word').join(' ')));
  };
  for (let i = 0; i < 40; i++) {
    const code = h.newCode();
    for (const seq of ['g4:SS', 'g4:NS', 'g4:LSN', 'g4:LLLL', 'g4:LNLN', 'g4:SLSL', 'g4:NLNS', 'g4:LLNN']) {
      const v = play(code, seq);
      chk(v.points === D.POINTS && v.done === D.STEPS.length, `STRATEGY game ${seq} (${G(seq.slice(3)).ending && G(seq.slice(3)).ending.kind}) earns full points`);
    }
    const unfinished = play(code, 'g4:LLL');
    chk(unfinished.done === D.STEPS.length - 1, 'STRATEGY an unfinished game leaves only that step open');
  }
  console.log('strategies: every finished game, fired or bankrupt, earns full points; an unfinished game does not complete its step');
}

// ---- version 2 additions ----
{
  let v2 = 0; const ok = (c, m) => { chk(c, 'V2 ' + m); if (c) v2++; };
  // Same step ids and kinds as v1 (so receipts carry the same information); the story runs house, machine, lender.
  ok(D.STEPS.map((s) => s.id).sort().join() === ['q1', 'loan', 'pay', 'first', 'total', 'lockin', 'chain', 'paid', 'q2', 'game', 'note'].sort().join(), 'step ids are v1\'s');
  ok(D.STEPS.map((s) => s.id).join() === 'loan,pay,first,total,chain,q1,paid,q2,lockin,game,note', 'round 3 order: the family\'s loan first, the game and memo last');
  ok(C.app === 'finan3-w06-mortgage-desk' && C.version === 3 && C.seedVersion === 1 && C.salt === 'rize-finan3-w06-mortgage:da6f1e', 'receipt identity: v1 app, seeds and salt; version 3 (the four-year game)');
  // Every step has a problem statement under the word limit, with no NaN, for many codes.
  for (let i = 0; i < 200; i++) { const T = D.buildTasks('W' + i); for (const s of D.STEPS) { const P = C.PROBLEM[s.id](T.find((x) => x.id === s.id) || {}); const w = P.body.replace(/<[^>]+>/g, '').split(/\s+/).length; ok(w <= 45 && !/NaN|undefined/.test(P.place + P.body), `problem text for ${s.id} (${w} words)`); } }
  // The gestures map onto v1's answer indices: only "price tag down" and "drop on the fund" pass.
  ok(Object.keys(C.Q1_POS).filter((k) => D.judgeQuiz(0, C.Q1_POS[k]).ok).join() === 'down', 'check 1: only price-down passes');
  ok(Object.keys(C.Q2_DROP).filter((k) => D.judgeQuiz(1, C.Q2_DROP[k]).ok).join() === 'fund', 'check 2: only the fund passes');
  ok(/Nothing changes/.test(C.quiz[0].options[C.Q1_POS.level]) && /rises/.test(C.quiz[0].options[C.Q1_POS.up]), 'check 1: level and up show v1\'s feedback for those answers');
  // The house's 30-year track teaches steps 4 and 5 on the same numbers the sheet judges.
  for (let i = 0; i < 400; i++) {
    const T = D.buildTasks('H' + i), F = T.find((x) => x.id === 'first'), t5 = T.find((x) => x.id === 'total'), sc = C.schedule(F.L, F.r, F.pay);
    ok(Math.abs(sc[0].interest - F.interest) < 0.006 && Math.abs(sc[0].principal - F.principal) < 0.011, 'track month 1 = step 4 answer');
    ok(Math.abs(sc[359].cumInterest - t5.totalInt) < 0.01 && sc[359].balance < 1, 'track month 360 pile = step 5 answer, loan repaid');
    ok(sc[179].balance > F.L / 2, 'the loan drains slowly at first: more than half is left after 15 years');
    ok(sc[300].principal > sc[0].principal * 2, 'and fast at the end: principal in year 26 is more than twice month 1\'s');
  }
  // The price series is the FHFA index rebased to January 2000; it climbs, then breaks.
  const W = {}; new Function('window', require('fs').readFileSync(process.argv[2] + '/js/hpi.js', 'utf8'))(W);
  const V = W.HPI.values, peak = V.indexOf(Math.max(...V));
  ok(V.length === 156 && V[0] === 100 && peak > 72 && peak < 96 && Math.min(...V.slice(peak)) < V[peak] * 0.8, `price series climbs then falls more than 20% (peak index ${peak}, ${V[peak]})`);
  // The loose dial setting always shows the rival's fee (the rival is always loose), so the dilemma on screen is exact.
  ok(C.gameSim('LLLL').rows.every((r, i) => r.rmade === C.PROFIT.L[i]), 'choice cards: the rival earns the loose figure every year');

  ok(!C.judgeTask(D.buildTasks('Z').find((x) => x.id === 'game'), { value: 'LLLLLL' }, h).ok, 'a version 1 seven-year game value does not complete the round 3 step');
  console.log(`v2 checks passed: ${v2}`);
}
console.log(bad ? `FAIL ${bad}` : 'PASS');
process.exit(bad ? 1 : 0);

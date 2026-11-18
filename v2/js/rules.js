/* The Mortgage Machine: FINAN III Unit 6 (mortgages and 2008), version 2 of The Mortgage Desk.
   The rules: every number, judge, diagnosis, help line, praise line and the lender's game are version 1's
   (../../../w06/desk/config.js, reviewed twice; copied verbatim below, HTML builders removed). What is new here:
   the step order (the story now runs left to right along the machine), plain-text problem statements for the new
   screens, the amortization schedule the house's 30-year track draws, and the gesture-to-answer maps for the two checks.
   app, version, seedVersion and salt are unchanged on purpose: a v2 receipt verifies on v1's verify.html too.
   No DOM here; Node loads it for the tests and verify.html loads it with DESK_NO_UI. */
(function (root) {
  'use strict';
  // ---------------- mortgage math (also used by the tests) ----------------
  // Monthly payment on a fixed-rate loan: L × i ÷ (1 − (1 + i)^−n), i = yearly rate ÷ 12, n = 360 for 30 years.
  function payment(L, r, n) { const i = r / 12, m = n || 360; return L * i / (1 - Math.pow(1 + i, -m)); }
  const RATES = [0.03, 0.04, 0.05, 0.06, 0.065, 0.07, 0.08];
  const TABLE = {}; RATES.forEach((r) => { TABLE[r] = Math.round(payment(100000, r) * 100) / 100; });   // per $100,000, 30 years

  // ---------------- the lender's game (step 10) ----------------
  // Seven yearly turns. Each year you set standards: S (strict), N (normal) or L (loose). The rival is loose every year.
  // Profit in millions of dollars from that year's new loans. Loose earns the most every year from 2002 to 2006.
  // In 2007 Wall Street stops buying loose loans: a loose year then means loans nobody buys.
  const YEARS = [2002, 2003, 2004, 2005, 2006, 2007, 2008];
  const PROFIT = { S: [8, 8, 6, 5, 4, 5, 4], N: [12, 14, 14, 12, 10, 8, 6], L: [15, 22, 32, 40, 40, -30, -30] };
  // Bad loans sent back (millions) for each loose year: the 2005 and 2006 loans come back in 2007, older ones in 2008.
  const BACK = { 2002: 10, 2003: 30, 2004: 70, 2005: 120, 2006: 130 };
  const START_CASH = 20;
  function backIn(year, seq) {
    let b = 0;
    for (let j = 0; j < seq.length && YEARS[j] < year; j++) {
      if (seq[j] !== 'L') continue;
      if (year === 2007 && YEARS[j] >= 2005) b += BACK[YEARS[j]];
      if (year === 2008 && YEARS[j] <= 2004) b += BACK[YEARS[j]];
    }
    return b;
  }
  // Plays a sequence of choices for you and the always-loose rival. Stops at the first ending.
  function gameSim(seq) {
    seq = String(seq || '');
    const rows = []; let cash = START_CASH, rcash = START_CASH, trail = 0, ending = null, rivalBust = null;
    const rseq = 'LLLLLLL';
    for (let i = 0; i < seq.length && i < YEARS.length; i++) {
      const y = YEARS[i], c = seq[i];
      if (!'SNL'.includes(c)) return { rows, ending: null, bad: true };
      const made = PROFIT[c][i], back = backIn(y, seq), profit = made - back;
      let rmade = null, rback = null, rprofit = null;
      if (rivalBust === null) { rmade = PROFIT.L[i]; rback = backIn(y, rseq); rprofit = rmade - rback; rcash += rprofit; if (rcash < 0) rivalBust = y; }
      cash += profit;
      const trailed = rprofit !== null && profit < rprofit;
      trail = trailed ? trail + 1 : 0;
      rows.push({ year: y, choice: c, made, back, profit, cash, trailed, trail, rmade, rback, rprofit, rcash: rprofit === null ? null : rcash, rivalBust: rivalBust === y });
      if (cash < 0) { ending = { kind: 'bust', year: y, at: i }; break; }
      if (trail >= 2) { ending = { kind: 'fired', year: y, at: i }; break; }
    }
    return { rows, ending, rivalBust };
  }

  const NAME = { S: 'Strict', N: 'Normal', L: 'Loose' };
  const OPTS = [
    ['S', 'Strict', 'Proof of income and 20% down. Fannie Mae and Freddie Mac buy these loans.'],
    ['N', 'Normal', 'Proof of income and 10% down. Fannie Mae and Freddie Mac buy these loans.'],
    ['L', 'Loose', 'No proof of income and nothing down. Wall Street buys these loans.']];
  const NEWS = {
    2002: 'House prices are climbing. Mortgage brokers bring families to whichever lender says yes.',
    2003: 'Your rival approves almost everyone and sells every loan to Wall Street right away.',
    2004: 'Wall Street pays more for loose loans than ever. It bundles them into bonds rated AAA.',
    2005: 'House prices hit new highs. Your rival’s loan officers earn record bonuses.',
    2006: 'House prices stop rising. Borrowers with loose loans start falling behind.',
    2007: 'April: New Century, once the second-largest subprime lender, goes bankrupt. July: Citigroup’s chief executive, on lending for corporate buyouts: “as long as the music is playing, you’ve got to get up and dance.”',
    2008: 'September: the government takes over Fannie Mae and Freddie Mac, and Lehman Brothers, a Wall Street investment bank, goes bankrupt.',
  };
  // The two endings. Each explains itself in three sentences and names who was paid for what (tests assert both).
  const ENDINGS = {
    fired: (y) => ({ title: `Fired in ${y}`,
      text: `You were right about the loans, and the board fired you in ${y} for falling behind your rival two years running. Your rival out-earned you because Wall Street bought every loose loan it made, and the bill for bad loans would not arrive until 2007. The board rewarded this year’s profit, and nobody in the chain was paid for checking loans. Some real lenders kept their standards and survived the bust, but many boards made the same choice yours did.` }),
    bust: (y) => ({ title: `Bankrupt in ${y}`,
      text: `You kept pace with your rival, because every loose loan paid you a fee the day it closed and was sold soon after. When house prices fell, Wall Street stopped buying and sent the bad loans back for you to pay for, and your cash ran out in ${y}. You were paid for making loans, and nobody in the chain was paid for checking them.` }),
  };
  // For a fired student, what the years after the firing brought (so the crash is seen from either ending).
  const AFTER = {
    2004: 'Your replacement goes loose. Profits match the rival’s.',
    2005: 'House prices hit new highs.',
    2006: 'House prices stop rising, and loose borrowers start falling behind.',
    2007: 'New Century goes bankrupt in April. Wall Street stops buying loose loans and sends bad ones back. Your rival goes bankrupt.',
    2008: 'The government takes over Fannie Mae and Freddie Mac. Lehman Brothers, a Wall Street investment bank, goes bankrupt.',
  };
  // Who else lost money (final screen). Every line is in w06/sources/FACTS.md.
  const LOSERS = [
    'Your rival went bankrupt in 2007, as New Century did.',
    'Pension funds, banks and other investors around the world owned the bonds, and they lost money when families stopped paying.',
    'Wall Street banks were stuck with bonds they could not sell. Lehman Brothers, an investment bank, went bankrupt in September 2008.',
    'By 2011 about four million families had lost their homes to foreclosure.',
    'Taxpayers stood behind Fannie Mae and Freddie Mac when the government took them over in September 2008.',
  ];


  // ---------------- checks ----------------
  const QUIZ = [
    { title: 'A bond made of mortgages',
      q: 'A pension fund owns a mortgage-backed bond, a bond whose payments come from thousands of home loans. Rates on new bonds rise. What happens to the price of the bond it owns?',
      options: ['It falls, because new bonds now pay more than its fixed payments', 'It rises, because rates went up',
        'Nothing changes, because the families’ payments are fixed', 'It rises, because the families now pay more interest'],
      answer: 0,
      why: ['Right. A mortgage-backed bond is a bond. Its payments are fixed, so when new bonds pay more, nobody pays full price for it: the seesaw from Unit 4.',
        'Rates and bond prices move in opposite directions. Higher rates on new bonds make an old bond worth less.',
        'The payments are fixed, but the price is not. A buyer compares them with what a new bond pays.',
        'Families with fixed-rate loans keep paying the same amount. Their payments do not rise with new rates.'] },
    { title: 'Who is left holding it?',
      q: 'A family stops paying in the third year of its loan. The loan sits in a bond that Wall Street sold with no guarantee. Who loses money?',
      options: ['The pension fund that owns the bond', 'The mortgage broker who brought in the family',
        'The lender that made the loan and sold it', 'The ratings agency that graded the bond'],
      answer: 0,
      why: ['Right. The broker and the ratings agency were paid when the loan was made and the bond sold, and a lender is rarely made to take back a loan that fails this late. The bond’s owner gets paid only while the family keeps paying.',
        'The broker was paid its fee at closing, three years ago. A missed payment now costs it nothing.',
        'The lender was paid when it sold the loan. It can be forced to take back loans that fail within months or broke the buyer’s rules, which is what sank New Century, but a loan that fails in year three usually stays with the bond’s owner.',
        'The ratings agency was paid for its grade when the bond was sold. A missed payment now costs it nothing.'] },
  ];

  // ---------------- the drop-down steps (7 and 8) ----------------
  // Step 7: the events of a loan's life, shown in a scrambled order; the student numbers them 1 to 5.
  const EVENTS = ['The family signs the mortgage at the closing table.', 'The lender sells the loan.',
    'The loan goes into a pool with thousands of other loans.', 'The pool is turned into bonds.',
    'A pension fund buys a bond and collects its share of the families’ payments.'];
  const EVENT_SHOWN = [3, 0, 4, 2, 1];           // row i shows EVENTS[EVENT_SHOWN[i]]; its right answer is EVENT_SHOWN[i] + 1
  // Step 8: each player in the chain and how it gets paid.
  const PLAYERS = ['Mortgage broker', 'Lender', 'Wall Street bank', 'Ratings agency', 'Pension fund that buys a bond'];
  const PAYS = [   // option letter, text, the player it belongs to (index into PLAYERS)
    ['a', 'The family’s payments, for as long as the family pays', 4],
    ['b', 'A fee for each family it brings to a lender', 0],
    ['c', 'A fee from the bank whose bonds it grades', 3],
    ['d', 'Fees at closing, and cash when it sells the loan', 1],
    ['e', 'A fee for turning loans into bonds and selling them', 2]];
  const payFor = (p) => PAYS.find((x) => x[2] === p)[0];

  // ---------------- seeded numbers ----------------
  // Round numbers (rule 20). The worked examples use a $300,000 house, 20% down, 5%; lock-in uses the spec's $320,000.
  const PRICES = [200000, 250000, 280000, 350000, 400000, 450000, 500000];
  const DOWNS = [0.05, 0.1, 0.15, 0.2, 0.25];
  const FAMILY_RATES = [0.04, 0.06, 0.07, 0.08];
  const r2 = (x) => Math.round(x * 100) / 100;
  function buildTasks(rng, h) {
    const P = h.pick(rng, PRICES), d = h.pick(rng, DOWNS), r = h.pick(rng, FAMILY_RATES);
    const down = P * d, L = P - down, hund = L / 100000, per = TABLE[r], pay = r2(hund * per);
    const interest = r2(L * r / 12), principal = r2(pay - interest), paid = r2(pay * 360), totalInt = r2(paid - L);
    const fam = { P, d, r, down, L, hund, per, pay, interest, principal, paid, totalInt };
    const T = [];
    T.push(Object.assign({ id: 'loan', answer: L }, fam));
    T.push(Object.assign({ id: 'pay', answer: pay }, fam));
    T.push(Object.assign({ id: 'first', answer: principal }, fam));
    T.push(Object.assign({ id: 'total', answer: totalInt }, fam));
    { const L2 = 320000, h2 = 3.2, a = r2(h2 * TABLE[0.03]), b = r2(h2 * TABLE[0.065]);
      T.push({ id: 'lockin', L: L2, hund: h2, lo: a, hi: b, gap: r2(b - a), answer: r2(b - a), decision: 'move' }); }
    T.push({ id: 'chain', answer: EVENT_SHOWN.map((e) => e + 1) });
    T.push({ id: 'paid', answer: PLAYERS.map((_, p) => payFor(p)) });
    T.push({ id: 'game', answer: 'any ending' });
    return T;
  }

  // ---------------- formatting and input parsing ----------------
  const H = () => root.DeskEngine.h;
  const fix = (x, dp) => String(+Number(x).toFixed(dp == null ? 2 : dp));
  const pc = (x) => fix(x * 100, 2) + '%';
  const mm = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? H().money(x) : H().money(x, 2));
  const SHOW = { pct: pc, money: mm, num: (v) => fix(v, 2), text: (v) => String(v) };
  // A percent typed as 90%, 90 or 0.9 all mean 90%. Every percent answer on this desk is at least 1%.
  const pctIn = (h, s) => { const v = h.parseMoney(s); if (!isFinite(v)) return v; return (!/%/.test(String(s)) && Math.abs(v) >= 1) ? v / 100 : v; };
  const PARSE = { pct: pctIn, money: (h, s) => h.parseMoney(s), num: (h, s) => h.parseMoney(s) };
  const TOL = { pct: () => 0.0006, money: (v) => Math.max(1, 0.002 * Math.abs(v)), num: () => 0.006 };
  const PLACEHOLDER_FMT = { pct: 'pct', money: 'money', num: 'num' };
  const UNREADABLE = { pct: 'Type a percentage, like 85%.', money: 'Type a dollar amount, like 1,250.50.', num: 'Type a number, like 2.5.' };

  // One function per task draws both the worked example and the student's table, so the two always match (rule 29).
  // A line: { label, calc, num (the right value), kind, input }.  faded: the calculation column shows the numbers.
  const LINES = {
    loan: (P, d, faded) => [
      { label: 'Price of the house', calc: 'agreed with the seller', num: mm(P), kind: 'text' },
      { label: 'Down payment', calc: faded ? `${pc(d)} × ${mm(P)}` : 'down payment share × price', num: P * d, kind: 'money', input: true },
      { label: 'Loan', calc: faded ? `${mm(P)} − down payment` : 'price − down payment', num: P * (1 - d), kind: 'money', input: true },
      { label: 'Loan-to-value (LTV)', calc: faded ? `loan ÷ ${mm(P)}` : 'loan ÷ price', num: 1 - d, kind: 'pct', input: true }],
    pay: (L, r, faded) => [
      { label: 'Loan', calc: 'from the last step', num: mm(L), kind: 'text' },
      { label: 'Loan in $100,000s', calc: faded ? `${mm(L)} ÷ $100,000` : 'loan ÷ $100,000', num: L / 100000, kind: 'num', input: true },
      { label: `Payment per $100,000 at ${pc(r)}`, calc: 'read it from the table', num: TABLE[r], kind: 'money', input: true },
      { label: 'Monthly payment', calc: faded ? `${fix(L / 100000)} × payment per $100,000` : 'loan in $100,000s × payment per $100,000', num: r2(L / 100000 * TABLE[r]), kind: 'money', input: true }],
    first: (L, r, pay, faded) => [
      { label: 'Monthly payment', calc: 'from the last step', num: mm(pay), kind: 'text' },
      { label: 'Interest this month', calc: faded ? `${mm(L)} × ${pc(r)} ÷ 12` : 'loan × yearly rate ÷ 12', num: r2(L * r / 12), kind: 'money', input: true },
      { label: 'Pays down the loan', calc: faded ? `${mm(pay)} − interest` : 'payment − interest', num: r2(pay - r2(L * r / 12)), kind: 'money', input: true }],
    total: (L, pay) => [
      { label: 'Paid over 30 years', calc: 'monthly payment × 360 payments', num: r2(pay * 360), kind: 'money', input: true },
      { label: 'Total interest', calc: 'paid over 30 years − loan', num: r2(r2(pay * 360) - L), kind: 'money', input: true }],
    lockin: (hund, rLo, rHi) => [
      { label: `Payment at ${pc(rLo)}`, calc: 'loan in $100,000s × payment per $100,000', num: r2(hund * TABLE[rLo]), kind: 'money', input: true },
      { label: `Payment at ${pc(rHi)}`, calc: 'loan in $100,000s × payment per $100,000', num: r2(hund * TABLE[rHi]), kind: 'money', input: true },
      { label: 'Extra each month', calc: 'higher payment − lower payment', num: r2(r2(hund * TABLE[rHi]) - r2(hund * TABLE[rLo])), kind: 'money', input: true }],
  };
  const toLadder = (lines, filled) => lines.map((l) => ((filled || !l.input)
    ? { label: l.label, calc: l.calc, value: l.kind === 'text' ? l.num : SHOW[l.kind](l.num), fmt: 'text', input: l.input }
    : { label: l.label, calc: l.calc, value: l.num, fmt: PLACEHOLDER_FMT[l.kind], input: true }));
  function linesFor(t) {
    if (t.id === 'loan') return LINES.loan(t.P, t.d, true);
    if (t.id === 'pay') return LINES.pay(t.L, t.r, true);
    if (t.id === 'first') return LINES.first(t.L, t.r, t.pay, true);
    if (t.id === 'total') return LINES.total(t.L, t.pay);
    if (t.id === 'lockin') return LINES.lockin(t.hund, 0.03, 0.065);
    return [];
  }
  const EX = { P: 300000, d: 0.2, r: 0.05, L: 240000, pay: r2(2.4 * TABLE[0.05]) };
  const EXAMPLES = {
    loan: { cap: 'Another family buys a $300,000 house with 20% down.', lines: () => LINES.loan(EX.P, EX.d, true) },
    pay: { cap: 'That family borrows $240,000 for 30 years at 5%.', lines: () => LINES.pay(EX.L, EX.r, true) },
    first: { cap: 'That family’s first payment on $240,000 at 5%.', lines: () => LINES.first(EX.L, EX.r, EX.pay, true) },
    total: { cap: 'That family pays $1,288.37 a month on $240,000.', lines: () => LINES.total(EX.L, EX.pay) },
    lockin: { cap: 'A $200,000 loan at 4% and at 7%.', lines: () => LINES.lockin(2, 0.04, 0.07) },
  };

  // ---------------- judging ----------------
  // Common slips, per line, phrased with the student's own numbers (rule 3). Values are in the line's own units.
  function diagFor(t, l) {
    const D = [];
    if (t.id === 'loan' && l.label === 'Down payment') D.push([t.L, 'loan', `That is the loan. The down payment is the part the family pays up front: ${pc(t.d)} × ${mm(t.P)}.`], [t.d * 100, 'pct', `Turn the percentage into dollars: ${pc(t.d)} × ${mm(t.P)}.`]);
    if (t.id === 'loan' && l.label === 'Loan') D.push([t.down, 'down', `That is the down payment. The loan is the rest of the price: ${mm(t.P)} − down payment.`], [t.P, 'price', 'That is the whole price. Subtract the down payment the family pays itself.'], [t.P + t.down, 'plus', 'Subtract the down payment from the price, don’t add it.']);
    if (t.id === 'loan' && l.kind === 'pct') D.push([t.d, 'downshare', 'That is the down payment’s share. Loan-to-value is the loan’s share of the price: loan ÷ price.'], [t.P / t.L, 'flip', 'Divide the loan by the price, not the price by the loan.']);
    if (t.id === 'pay' && l.kind === 'num') D.push([t.L / 1000, 'thou', `That is the loan in thousands. Divide by $100,000: ${mm(t.L)} ÷ 100,000.`], [t.L / 10000, 'tenthou', `Divide by 100,000, not 10,000: ${mm(t.L)} ÷ 100,000.`]);
    if (t.id === 'pay' && l.label.startsWith('Payment per')) RATES.forEach((r) => { if (r !== t.r) D.push([TABLE[r], 'row', `That is the payment at ${pc(r)}. Read the row for ${pc(t.r)}.`]); });
    if (t.id === 'pay' && l.label === 'Monthly payment') { D.push([t.per, 'per', `That is the payment on $100,000. Multiply it by the loan in $100,000s, ${fix(t.hund)}.`], [r2(t.L * t.r / 12), 'interest', 'That is one month’s interest only. Use the table.']);
      RATES.forEach((r) => { if (r !== t.r) D.push([r2(t.hund * TABLE[r]), 'rowpay', `That uses the payment at ${pc(r)}. Use the row for ${pc(t.r)}.`]); }); }
    if (t.id === 'first' && l.label === 'Interest this month') D.push([r2(t.L * t.r), 'year', `That is a whole year of interest. Divide by 12 for one month: ${mm(t.L)} × ${pc(t.r)} ÷ 12.`], [r2(t.L * t.r / 100 / 12), 'pctdec', `Write ${pc(t.r)} as ${fix(t.r, 3)}, then multiply: ${mm(t.L)} × ${fix(t.r, 3)} ÷ 12.`], [t.pay, 'pay', 'That is the whole payment. Interest is only part of it: loan × yearly rate ÷ 12.']);
    if (t.id === 'first' && l.label === 'Pays down the loan') D.push([t.interest, 'int', 'That is the interest. The rest of the payment pays down the loan: payment − interest.'], [r2(t.pay + t.interest), 'plus', 'Subtract the interest from the payment, don’t add it.']);
    if (t.id === 'total' && l.label === 'Paid over 30 years') D.push([r2(t.pay * 30), 'thirty', 'That is 30 payments. A 30-year loan has 12 × 30 = 360 monthly payments.'], [r2(t.pay * 12), 'twelve', 'That is one year of payments. Multiply by 360, one for each month of 30 years.']);
    if (t.id === 'total' && l.label === 'Total interest') D.push([t.paid, 'paid', `That is everything the family pays. Interest is what is left after repaying the ${mm(t.L)} loan.`], [t.L, 'loan', 'That is the loan itself. Subtract it from the total paid.'], [r2(t.L * t.r * 30), 'simple', 'That is the first year’s interest times 30. The interest shrinks as the loan is paid down: use paid − loan.']);
    if (t.id === 'lockin' && l.label.startsWith('Payment')) D.push([TABLE[l.label.includes('6.5') ? 0.065 : 0.03], 'per', 'That is the payment on $100,000. Multiply it by 3.2, the loan in $100,000s.'], [r2(TABLE[l.label.includes('6.5') ? 0.065 : 0.03] * 32), 'ten', 'The loan is $320,000, which is 3.2 hundred-thousands, not 32.']);
    if (t.id === 'lockin' && l.label === 'Extra each month') D.push([r2(t.lo + t.hi), 'plus', 'Subtract the lower payment from the higher one, don’t add them.'], [r2(TABLE[0.065] - TABLE[0.03]), 'per100', 'That is the gap on $100,000. This loan is $320,000: use the two payments above.']);
    return D;
  }
  const plain = (s) => String(s).replace(/<[^>]+>/g, '');

  function judgeGame(t, e) {
    const seq = String(e.value || '').trim().toUpperCase();
    if (!seq) return { ok: false, msg: 'Play until the game ends. Either ending completes this step.' };
    const sim = gameSim(seq);
    if (sim.bad || !sim.ending) return { ok: false, msg: 'Play until the game ends. Either ending completes this step.' };
    if (sim.ending.at !== seq.length - 1) return { ok: false, msg: 'That game ended earlier. Play it again.' };
    return { ok: true };
  }
  function judgeDrop(t, e) {
    const rows = e.rows || [], rowRes = [];
    t.answer.forEach((a, i) => { const v = rows[i] == null ? '' : String(rows[i]).trim(); rowRes[i] = { ok: v === String(a), msg: v ? 'not yet' : 'blank' }; });
    const blank = rowRes.findIndex((x) => x.msg === 'blank'), bad = rowRes.findIndex((x) => !x.ok);
    if (bad < 0) return { ok: true, rowRes };
    if (t.id === 'chain') {
      if (blank >= 0) return { ok: false, rowRes, msg: 'Give every event a number from 1 to 5.' };
      const used = new Set(rows.map(String)); if (used.size < 5) return { ok: false, rowRes, msg: 'Use each number once: one event happens first, one second, and so on.' };
      return { ok: false, rowRes, msg: 'Not every event is in its place. A loan is made, then sold, then pooled, then turned into bonds, then bought by an investor.' };
    }
    if (blank >= 0) return { ok: false, rowRes, msg: 'Choose how each player gets paid.' };
    return { ok: false, rowRes, msg: 'Not every match is right. Ask of each player: is it paid when the loan is made or sold, or only while the family keeps paying?' };
  }
  function judgeTask(t, e, h) {
    if (t.id === 'game') return judgeGame(t, e);
    if (t.id === 'chain' || t.id === 'paid') return judgeDrop(t, e);
    const lines = linesFor(t), rows = e.rows || [], rowRes = [];
    lines.forEach((l, i) => {
      if (!l.input) return;
      rowRes[i] = h.judgeNumber(PARSE[l.kind](h, rows[i]), l.num, diagFor(t, l),
        { tol: TOL[l.kind](l.num), scale: Math.abs(l.num), unreadable: UNREADABLE[l.kind],
          closeMsg: l.kind === 'pct' ? 'Close. Keep two decimal places in the percentage.' : 'Close. Check the arithmetic and round only at the end.', otherMsg: `${plain(l.calc)}.` });
    });
    const bad = rowRes.findIndex((x) => x && !x.ok);
    if (bad >= 0) return { ok: false, rowRes, msg: `${plain(lines[bad].label)}: ${rowRes[bad].msg}` };
    if (t.decision && e.choice !== t.decision) {
      if (!e.choice) return { ok: false, rowRes, msg: 'Now answer the question under the table.' };
      return { ok: false, rowRes, msg: 'Banks lend to owners all the time, and most loans can be paid off early. Look at the two payments you just found.' };
    }
    return { ok: true, rowRes };
  }

  function helpText(t, lvl) {
    if (t.id === 'game') return 'Choose strict, normal or loose for each year until the game ends. Either ending completes this step.';
    if (t.id === 'chain') {
      const order = [0, 1, 2, 3, 4].map((k) => `${k + 1}. ${EVENTS[k]}`);
      return lvl === 1 ? order[0] : order.join('<br>');
    }
    if (t.id === 'paid') {
      const m = PLAYERS.map((p, i) => `${p}: ${PAYS.find((x) => x[2] === i)[1].toLowerCase()}.`);
      return lvl === 1 ? m[4] : m.join('<br>');
    }
    const lines = linesFor(t), blanks = lines.filter((l) => l.input);
    const say = (l) => `${l.label}: ${l.calc} = ${l.kind === 'text' ? l.num : SHOW[l.kind](l.num)}`;
    return lvl === 1 ? say(blanks[0]) : lines.map(say).join('<br>') + (t.decision ? '<br>Moving means giving up the 3% loan.' : '');
  }
  function praise(t) {
    if (t.id === 'loan') return `You lend ${mm(t.L)}, ${pc(1 - t.d)} of the house’s value. The house backs the loan: if the family stops paying, the lender can take it.`;
    if (t.id === 'pay') return `The family pays ${mm(t.pay)} a month, the same amount every month for 30 years.`;
    if (t.id === 'first') return `Only ${mm(t.principal)} of the first ${mm(t.pay)}, about ${Math.round(100 * t.principal / t.pay)}%, pays down the loan. The rest is interest. Each month a little more of the payment goes to the loan.`;
    if (t.id === 'total') return `The family pays ${mm(t.totalInt)} in interest on top of the ${mm(t.L)} it borrowed, about ${Math.round(100 * t.totalInt / t.L)}% of the loan.`;
    if (t.id === 'lockin') return `The same house would cost them about ${mm(t.gap)} more every month. This is why so many owners who borrowed at 3% stay where they are.`;
    if (t.id === 'chain') return 'The loan leaves the lender soon after closing. The family keeps paying for 30 years, but the money ends up with an investor the family never meets.';
    if (t.id === 'paid') return 'Four of the five are paid when the loan is made or sold, and only the lender can be made to take some loans back. The bond’s owner is paid only if the family keeps paying.';
    if (t.id === 'game') return 'This step is complete. You can play again with different choices.';
  }
  const fmtIn = (l, x) => (l.kind === 'pct' ? fix(x * 100, 3) + '%' : String(Math.round(x * 1000) / 1000));
  function selfAnswer(t) {
    if (t.id === 'game') return { value: 'LLLLLL', choice: null, rows: null };
    if (t.id === 'chain' || t.id === 'paid') return { rows: t.answer.map(String), choice: null };
    const rows = []; linesFor(t).forEach((l, i) => { if (l.input) rows[i] = fmtIn(l, l.num); });
    return { rows, choice: t.decision || null };
  }
  function selfWrong(t) {
    if (t.id === 'game') return { value: 'LL', choice: null, rows: null };
    if (t.id === 'chain') return { rows: ['1', '2', '3', '4', '5'], choice: null };
    if (t.id === 'paid') return { rows: ['a', 'b', 'c', 'd', 'e'], choice: null };
    const rows = []; linesFor(t).forEach((l, i) => { if (l.input) rows[i] = fmtIn(l, l.num * 1.3); });
    return { rows, choice: t.decision || null };
  }
  // ---------------- version 2 additions ----------------
  // Step order (owner's direction, 2026-11-18): the game first, then what just happened (the machine and the memo), then
  // what one loan costs a family. Ids and kinds are v1's, so receipts carry the same information.
  const STEPS = [
    { id: 'game', label: 'The lender’s game', kind: 'task', act: 0 },
    { id: 'chain', label: 'A loan’s life', kind: 'task', act: 1 },
    { id: 'paid', label: 'Who gets paid', kind: 'task', act: 1 },
    { id: 'q1', label: 'A bond made of mortgages', kind: 'check', quiz: 0, act: 1 },
    { id: 'q2', label: 'Who is left holding it?', kind: 'check', quiz: 1, act: 1 },
    { id: 'note', label: 'Memo to the board', kind: 'note', act: 1 },
    { id: 'loan', label: 'The family’s loan', kind: 'task', act: 2 },
    { id: 'pay', label: 'The monthly payment', kind: 'task', act: 2 },
    { id: 'first', label: 'The first payment', kind: 'task', act: 2 },
    { id: 'total', label: 'Thirty years', kind: 'task', act: 2 },
    { id: 'lockin', label: 'Locked in', kind: 'task', act: 2 },
  ];
  const ACTS = ['Run the lender', 'What just happened', 'What one loan costs'];

  // What each screen asks, in a sentence or two (rule 28: nothing above the first control runs past about 40 words).
  // Steps 2 to 6 keep v1's wording; the rest say what to do with the new controls.
  const PROBLEM = {
    loan: (t) => ({ place: 'A family comes to your desk to buy its first home.',
      body: `The house costs <b>${mm(t.P)}</b>, and the family pays <b>${pc(t.d)}</b> of the price up front: the <b>down payment</b>. You lend the rest. How big is the loan, and what share of the house’s value does it cover?` }),
    pay: (t) => ({ place: 'The family borrows for 30 years at a fixed rate.',
      body: `Your rate is <b>${pc(t.r)}</b>. Lenders read the monthly payment from a rate card: the payment for each $100,000 borrowed. What will the family pay each month on its <b>${mm(t.L)}</b> loan?` }),
    first: (t) => ({ place: 'Where does the family’s first payment go?',
      body: `Each payment first covers the month’s interest. The rest pays down the loan. In the first month, how much of the family’s <b>${mm(t.pay)}</b> pays down its <b>${mm(t.L)}</b> loan at <b>${pc(t.r)}</b>?` }),
    total: (t) => ({ place: 'One last calculation for this family, on your own.',
      body: `The family pays <b>${mm(t.pay)}</b> a month for 30 years on its <b>${mm(t.L)}</b> loan. How much interest does it pay in all?` }),
    lockin: () => ({ place: 'Why do so many owners stay put when rates rise?',
      body: 'A couple borrowed <b>$320,000</b> at <b>3%</b>. Rates on new loans are now <b>6.5%</b>. If they sold and borrowed the same amount again, how much more would they pay each month?' }),
    chain: () => ({ place: 'Your loan does not stay with you for long.',
      body: 'Put five events from the life of one family’s loan in order. Drop each event into a bay on the line, the first on the left.' }),
    paid: () => ({ place: 'Everyone along the way takes a slice.',
      body: 'Hang each way of being paid on the player it belongs to. Watch <b>when</b> each one is paid.' }),
    q1: () => ({ place: 'At the far end of the line, investors own the bonds.',
      body: 'A pension fund owns a mortgage-backed bond, a bond whose payments come from thousands of home loans. Rates on new bonds rise. Drag the price tag to show what happens to the price of the bond it owns.' }),
    q2: () => ({ place: 'Three years later, one family stops paying.',
      body: 'The loan sits in a bond that Wall Street sold with no guarantee. Drag the missed payment onto whoever loses money.' }),
    game: () => ({ place: 'You run a mortgage lender from 2002 to 2008.',
      body: 'Each year you set your lending standards. Your rival is loose every year, and your board compares your profit with your rival’s.' }),
    note: () => ({ place: 'The game is over. Your board wants an explanation.', body: '' }),
  };

  // The checks become gestures. Each gesture maps to one of v1's answer options, so the receipt stores the same index.
  // Check 1: the bond's price tag dragged down, up or left level. (v1's fourth option has no gesture of its own.)
  const Q1_POS = { down: 0, up: 1, level: 2 };
  // Check 2: the missed payment dropped on one of four players.
  const Q2_DROP = { fund: 0, broker: 1, lender: 2, agency: 3 };

  // The house's 30-year track: month by month, the payment split into interest (balance × rate ÷ 12) and principal
  // (the rest), the balance left, and the interest paid so far. Uses the student's own payment from the rate card, so
  // the pile at month 360 is exactly the student's step 5 answer.
  function schedule(L, r, pay) {
    const i = r / 12, rows = []; let bal = L, cum = 0;
    for (let m = 1; m <= 360; m++) {
      const interest = bal * i, principal = Math.min(bal, pay - interest);
      bal = Math.max(0, bal - principal); if (m === 360) bal = 0;   // the rate card's payment is rounded to the cent; the last month settles the few dollars left
      // Interest so far = everything paid so far − the part of the loan repaid, so month 360 is exactly payment × 360 − loan.
      cum = m * pay - (L - bal);
      rows.push({ m, interest, principal, balance: bal, cumInterest: cum });
    }
    return rows;
  }

  root.DESK = {
    app: 'finan3-w06-mortgage-desk', version: 1, seedVersion: 1, salt: 'rize-finan3-w06-mortgage:da6f1e', points: 60,
    storageKey: 'rize-finan3-w06-mortgage-machine-v2', filePrefix: 'MortgageMachine',
    verifyUrl: 'https://rizecomputerscience.github.io/finan3-mortgage-desk/verify.html',
    calcHint: '',
    story: { title: 'The Mortgage Machine', kicker: 'Financial Markets and Institutions, Unit 6', company: 'The Mortgage Machine', team: '',
      dek: 'It is 2002, and you run a mortgage lender. You lend families money for homes, sell the loans, and get paid for every one. Your rival lends to almost anyone. How long can you last?' },
    steps: STEPS, acts: ACTS, quiz: QUIZ, walk: null, buildTasks, judgeTask, helpText, praise, selfAnswer, selfWrong,
    note: { title: 'Memo to the board', label: 'Your memo', minWords: 40, receiptHeading: 'Memo to the board: what went wrong, and whose fault was it?',
      prompt: 'Write a memo to your board in two short paragraphs, at most 120 words in all. First, say what went wrong at your company. Second, say whose fault it was: yours, the borrowers’, Wall Street’s, the ratings agencies’ or the government’s and regulators’. Give a reason that names what someone was paid for or was supposed to check.' },
    // Shared with the page and the tests.
    payment, TABLE, RATES, gameSim, YEARS, PROFIT, BACK, START_CASH, ENDINGS, NEWS, LOSERS, OPTS, NAME, AFTER, EVENTS, EVENT_SHOWN, PLAYERS, PAYS, linesFor,
    LINES, EXAMPLES, EX, PROBLEM, Q1_POS, Q2_DROP, schedule, diagFor, fmt: { mm, pc, fix, r2, SHOW, PARSE, TOL, UNREADABLE },
  };
})(typeof window !== 'undefined' ? window : globalThis);

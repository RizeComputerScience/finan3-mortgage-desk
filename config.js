/* The Mortgage Desk: FINAN III week 6 (mortgages and 2008). Config for the shared desk engine (desk-engine.js in this folder,
   copied from the FINAN IV no-identifier engine, 2026-11-16: random desk code, no name or email; receipt and verify.html check
   from the code). Built 2026-11-17 to COURSE-SPEC.md "Week 6" (six steps, split here into eleven screens in the spec's order)
   and w06/TEACHING-MAP.md (the lesson of each step in one sentence; tests/core_test.js asserts the desk shows each one).
   Model: w04/desk/config.js (the Bond Desk), whose slider showed how a live widget lives in a config with no engine change.
   - The page "Who Owns Your House?" tells the story with no math. This desk teaches every number: down payment, loan and
     loan-to-value, the monthly payment from a table (no formula), the first payment's split, total interest, lock-in.
   - Steps 7 and 8 are drop-down tables built here (class "rowin", so the engine judges and marks each row).
   - Step 10 is the lender's game, built here as an autosave task: taskView returns the game's HTML in parts[0].html and a
     wire() that runs it. When the game ends, either way, it writes the choices to a hidden #val and fires "change", so the
     engine saves the step. gameSim() below is the one function the screen, the judge and the tests all use.
   - No fictional names, so no case_reuse sweep was needed: "your company" and "your rival". Real cases: New Century (2007),
     Citigroup's chief executive (July 2007); every fact is in w06/sources/FACTS.md.
   Version 1, seedVersion 1. */
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

  const STEPS = [
    { id: 'q1', label: 'A bond made of mortgages', kind: 'check', quiz: 0 },
    { id: 'loan', label: 'The family’s loan', kind: 'task' },
    { id: 'pay', label: 'The monthly payment', kind: 'task' },
    { id: 'first', label: 'The first payment', kind: 'task' },
    { id: 'total', label: 'Thirty years', kind: 'task' },
    { id: 'lockin', label: 'Locked in', kind: 'task' },
    { id: 'chain', label: 'A loan’s life', kind: 'task' },
    { id: 'paid', label: 'Who gets paid', kind: 'task' },
    { id: 'q2', label: 'Who is left holding it?', kind: 'check', quiz: 1 },
    { id: 'game', label: 'The lender’s game', kind: 'task' },
    { id: 'note', label: 'Memo to the board', kind: 'note' },
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
  // The payment table, printed on every step that uses it.
  const tableHtml = (hi) => `<div class="tw"><table class="cf" style="max-width:24rem"><caption>Monthly payment for each $100,000 borrowed, 30-year fixed loan</caption>
    <thead><tr><th scope="col">Rate</th><th scope="col">Payment per $100,000</th></tr></thead><tbody>${RATES.map((r) => `<tr${hi && hi.includes(r) ? ' class="hl"' : ''}><td>${pc(r)}</td><td>${mm(TABLE[r])}</td></tr>`).join('')}</tbody></table></div>`;

  // ---------------- step text ----------------
  const PROBLEM = {
    loan: (t) => ({ title: 'The family’s loan', place: 'A family comes to your desk to buy its first home.',
      body: `<p>The house costs <b>${mm(t.P)}</b>, and the family pays <b>${pc(t.d)}</b> of the price up front: the <b>down payment</b>. You lend the rest. How big is the loan, and what share of the house’s value does it cover?</p>` }),
    pay: (t) => ({ title: 'The monthly payment', place: 'The family borrows for 30 years at a fixed rate.',
      body: `<p>Your rate is <b>${pc(t.r)}</b>. Lenders read the monthly payment from a table like this one: the payment for each $100,000 borrowed. What will the family pay each month on its <b>${mm(t.L)}</b> loan?</p>`, pre: tableHtml([t.r]) }),
    first: (t) => ({ title: 'The first payment', place: 'Where does the family’s first payment go?',
      body: `<p>Each payment first covers the month’s interest. The rest pays down the loan. In the first month, how much of the family’s <b>${mm(t.pay)}</b> pays down its <b>${mm(t.L)}</b> loan at <b>${pc(t.r)}</b>?</p>` }),
    total: (t) => ({ title: 'Thirty years', place: 'One last calculation for this family, on your own.',
      body: `<p>The family pays <b>${mm(t.pay)}</b> a month for 30 years on its <b>${mm(t.L)}</b> loan. How much interest does it pay in all?</p>` }),
    lockin: (t) => ({ title: 'Locked in', place: 'Why do so many owners stay put when rates rise?',
      body: `<p>A couple borrowed <b>$320,000</b> at <b>3%</b>. Rates on new loans are now <b>6.5%</b>. If they sold and borrowed the same amount again, how much more would they pay each month?</p>`, pre: tableHtml([0.03, 0.065]),
      choice: { legend: 'So why do many owners with a 3% loan stay put?', options: [
        ['move', 'Moving means giving up the 3% loan and borrowing again at 6.5%'], ['bank', 'Banks will not lend to people who already own a home'],
        ['fixed', 'A fixed-rate loan cannot be paid off early']] } }),
    chain: () => ({ title: 'A loan’s life', place: 'Your loan does not stay with you for long.',
      body: '<p>Number these five events from <b>1</b> (first) to <b>5</b> (last) in the life of one family’s loan.</p>' }),
    paid: () => ({ title: 'Who gets paid', place: 'Everyone along the way takes a slice.',
      body: '<p>Match each player to how it gets paid. Watch <b>when</b> each one is paid.</p>' }),
    game: () => ({ title: 'The lender’s game', place: 'You run a mortgage lender from 2002 to 2008.',
      body: '<p>Each year you set your lending standards. Your rival is loose every year, and your board compares your profit with your rival’s.</p>' }),
  };
  const SOURCES = {
    pay: '<p>Each entry in the table is the standard payment on a 30-year fixed-rate loan of $100,000: loan × (rate ÷ 12) ÷ (1 − (1 + rate ÷ 12)<sup>−360</sup>), rounded to the cent.</p>',
    lockin: '<p>Federal Housing Finance Agency, <a href="https://www.fhfa.gov/research/papers/wp2403" target="_blank" rel="noopener">The Lock-In Effect of Rising Mortgage Rates</a> (Working Paper 24-03, 2024).</p>',
    game: '<p>Financial Crisis Inquiry Commission, <a href="https://www.govinfo.gov/content/pkg/GPO-FCIC/pdf/GPO-FCIC.pdf" target="_blank" rel="noopener">The Financial Crisis Inquiry Report</a> (2011). The game’s dollar figures are made up; the events in each year are real.</p>',
  };

  // ---------------- drop-down tables (steps 7 and 8) ----------------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const SEL = 'font:16px var(--serif);padding:.3rem .4rem;border:1.5px solid var(--line-strong);border-radius:6px;background:var(--surface);color:var(--ink);max-width:100%';
  function chainHtml(L) {
    const rows = L.rows || [];
    return `<div class="tw"><table class="cf" style="max-width:44rem"><thead><tr><th scope="col">Event</th><th scope="col">Order</th></tr></thead><tbody>${EVENT_SHOWN.map((e, i) =>
      `<tr><td class="lbl"><label for="ch${i}" style="font-weight:400;font-size:16px;margin:0">${esc(EVENTS[e])}</label></td><td><select id="ch${i}" class="rowin" data-row="${i}" style="${SEL}"><option value="">Choose</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}"${String(rows[i]) === String(n) ? ' selected' : ''}>${n}</option>`).join('')}</select><span class="mark" id="mk${i}"></span></td></tr>`).join('')}</tbody></table></div>`;
  }
  function paidHtml(L) {
    const rows = L.rows || [];
    return `<div class="mg-paid">${PLAYERS.map((p, i) => `<div style="margin:.7rem 0"><label for="pd${i}">${esc(p)}</label><select id="pd${i}" class="rowin" data-row="${i}" style="${SEL};width:34rem"><option value="">Choose how it gets paid</option>${PAYS.map(([v, txt]) => `<option value="${v}"${rows[i] === v ? ' selected' : ''}>${esc(txt)}</option>`).join('')}</select> <span class="mark" id="mk${i}"></span></div>`).join('')}</div>`;
  }

  // ---------------- the game's screens ----------------
  const M = (x) => (x < 0 ? '−$' : '$') + Math.abs(x) + ' million';
  const signed = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + '$' + Math.abs(x) + 'M';
  const GSTYLE = `<style>
    .mg{border:1.5px solid var(--line-strong);border-radius:10px;padding:1rem 1.1rem;background:var(--bg)}
    .mg h3{font:400 30px/1.1 var(--display);margin:0 0 .4rem}
    .mg .news{margin:.2rem 0 .8rem}
    .mg .opts{display:grid;gap:.6rem;margin:.8rem 0}
    .mg .opt{text-align:left;font:17px var(--serif);background:var(--surface);color:var(--ink);border:1.5px solid var(--line-strong);border-radius:8px;padding:.6rem .9rem;cursor:pointer}
    .mg .opt b{display:block;font-size:18px}.mg .opt span{font-size:15px;color:var(--muted)}
    .mg .opt:hover{border-color:var(--brand)}
    .mg .board{background:var(--hint-tint);border-left:4px solid var(--hint);border-radius:6px;padding:.5rem .8rem;margin:.6rem 0}
    .mg .warn{background:var(--bad-tint);border-left:4px solid var(--bad)}
    .mg .ending{background:var(--panel);border-radius:8px;padding:.8rem 1rem;margin:.6rem 0}
    .mg table.cf{margin:.4rem 0 .6rem;max-width:30rem}
    .mg ul{padding-left:1.2rem;margin:.3rem 0}.mg li{margin:.25rem 0}
  </style>`;
  function scoreboard(r) {
    const rp = r.rprofit === null ? 'closed' : signed(r.rprofit), rc = r.rcash === null ? 'closed' : (r.rcash < 0 ? 'bankrupt' : '$' + r.rcash + 'M');
    return `<div class="tw"><table class="cf"><caption>Scoreboard, ${r.year}</caption><thead><tr><th scope="col"></th><th scope="col">Profit this year</th><th scope="col">Cash on hand</th></tr></thead>
      <tbody><tr><td>You</td><td>${signed(r.profit)}</td><td>${r.cash < 0 ? 'bankrupt' : '$' + r.cash + 'M'}</td></tr><tr><td>Rival</td><td>${rp}</td><td>${rc}</td></tr></tbody></table></div>`;
  }
  function yearScreen(i, last) {
    const y = YEARS[i];
    return `<h3>${y}</h3><p class="news">${NEWS[y]}</p>${last ? scoreboard(last) : `<p class="small">You and your rival each start with $${START_CASH} million in cash.</p>`}
      <p style="margin:.6rem 0 0"><b>Set your standards for ${y}.</b></p>
      <div class="opts" role="group" aria-label="Your standards for ${y}">${OPTS.map(([c, n, d]) => `<button type="button" class="opt" data-pick="${c}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>`;
  }
  function resultScreen(sim, i) {
    const r = sim.rows[i], y = r.year, end = sim.ending && sim.ending.at === i;
    let board = '';
    if (r.back) board += `<p class="board warn">Bad loans sent back to you: ${M(-r.back)}. Buyers can return loans that fail within months or broke their rules.</p>`;
    if (r.rivalBust) board += `<p class="board">Your rival is bankrupt.</p>`;
    if (!end && r.trail === 1) board += `<p class="board warn">The board: “Your rival made ${M(r.rprofit - r.profit)} more than you. Fall behind again in ${y + 1} and you are out.”</p>`;
    const mine = r.made >= 0 ? `Your new loans earned ${M(r.made)}.` : `Nobody will buy loose loans now, so you are stuck with this year’s: ${M(r.made)}.`;
    const theirs = r.rmade === null ? 'Your rival is closed.' : r.rmade >= 0 ? `Your rival’s new loans earned ${M(r.rmade)}.` : 'Your rival is stuck with its loose loans too.';
    return `<h3>${y}: ${NAME[r.choice].toLowerCase()}</h3><p class="news">${mine} ${theirs}</p>${board}${scoreboard(r)}
      <div class="actions"><button type="button" class="btn" data-next="1">${end ? 'See how it ended' : 'Go to ' + (y + 1)}</button></div>`;
  }
  function endScreen(sim) {
    const e = sim.ending, E = ENDINGS[e.kind](e.year);
    const you = {}; sim.rows.forEach((r) => { you[r.year] = r; });
    const riv = gameSim('LLLLLLL').rows; const rv = {}; riv.forEach((r) => { rv[r.year] = r; });
    const cell = (y) => (you[y] ? signed(you[y].profit) + (e.year === y ? (e.kind === 'fired' ? ', fired' : ', bankrupt') : '') : '');
    const rcell = (y) => (rv[y] ? signed(rv[y].rprofit) + (rv[y].rivalBust ? ', bankrupt' : '') : 'closed');
    const next = e.kind === 'fired' ? `<p style="margin:.6rem 0 .2rem"><b>What happened after you left</b></p><ul>${YEARS.filter((y) => y > e.year && AFTER[y]).map((y) => `<li>${y}: ${AFTER[y]}</li>`).join('')}</ul>` : '';
    return `<h3>${E.title}</h3><div class="ending"><p>${E.text}</p></div>${next}
      <div class="tw"><table class="cf"><caption>Profit by year</caption><thead><tr><th scope="col">Year</th><th scope="col">You</th><th scope="col">Rival</th></tr></thead><tbody>${YEARS.map((y) => `<tr><td>${y}</td><td>${cell(y)}</td><td>${rcell(y)}</td></tr>`).join('')}</tbody></table></div>
      <p style="margin:.6rem 0 .2rem"><b>Who else lost money</b></p><ul>${LOSERS.map((x) => `<li>${x}</li>`).join('')}</ul>
      <p class="small">Your choices: ${sim.rows.map((r) => `${r.year} ${NAME[r.choice].toLowerCase()}`).join(', ')}.</p>
      <div class="actions"><button type="button" class="btn secondary" data-again="1">Play again</button></div>`;
  }
  function gameHtml() { return `${GSTYLE}<div class="mg" id="mg" aria-live="polite"></div><input type="hidden" id="val" value="">`; }
  function wireGame($, L) {
    const box = $('#mg'), val = $('#val'); if (!box) return;
    let seq = '', phase = 'year';
    const done = () => { val.value = seq; val.dispatchEvent(new Event('change', { bubbles: true })); };
    const draw = () => {
      const sim = gameSim(seq);
      if (phase === 'year') box.innerHTML = yearScreen(seq.length, sim.rows[sim.rows.length - 1]);
      else if (phase === 'result') box.innerHTML = resultScreen(sim, seq.length - 1);
      else box.innerHTML = endScreen(sim);
      box.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { seq += b.dataset.pick; phase = 'result'; draw(); const n = box.querySelector('[data-next]'); if (n) n.focus(); }));
      box.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => {
        const s = gameSim(seq); if (s.ending) { phase = 'end'; draw(); done(); } else { phase = 'year'; draw(); }
        const f = box.querySelector('button'); if (f) f.focus(); }));
      box.querySelectorAll('[data-again]').forEach((b) => b.addEventListener('click', () => { seq = ''; phase = 'year'; draw(); const f = box.querySelector('button'); if (f) f.focus(); }));
    };
    // A finished game reopens on its ending; anything else starts in 2002.
    const saved = L && L.value ? String(L.value) : '';
    const s0 = gameSim(saved);
    if (saved && s0.ending && s0.ending.at === saved.length - 1) { seq = saved; phase = 'end'; val.value = saved; }
    draw();
  }

  function taskView(t, L, h) {
    const P = PROBLEM[t.id](t);
    if (t.id === 'game') {
      return { title: P.title, place: P.place, body: P.body, example: '', table: '', parts: [{ html: gameHtml(), field: null }],
        autosave: true, noCalc: true, wire: ($, L2) => wireGame($, L2), sources: SOURCES.game };
    }
    if (t.id === 'chain' || t.id === 'paid') {
      return { title: P.title, place: P.place, body: P.body, example: '', table: '', parts: [{ html: t.id === 'chain' ? chainHtml(L) : paidHtml(L), field: null }],
        noCalc: true, helpLabels: t.id === 'chain' ? ['Show me the first event', 'Show me the whole order'] : ['Show me one', 'Show me every match'] };
    }
    const E = EXAMPLES[t.id];
    const example = h.ladder(toLadder(E.lines(), true), { filled: true, caption: E.cap });
    const lines = linesFor(t);
    const table = h.ladder(toLadder(lines, false), { rows: L.rows, caption: 'Your turn' })
      + (lines.some((l) => l.input && l.kind === 'pct') ? '<p class="small">Type a percentage like 85%.</p>' : '');
    const parts = [{ html: P.pre || '', field: 'table' }];
    if (P.choice) parts.push({ html: '', field: 'choice' });
    return { title: P.title, place: P.place, body: P.body, example, table, parts, choice: P.choice, sources: SOURCES[t.id] || '',
      helpLabels: ['Show me the first blank', 'Show me every line'] };
  }

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

  root.DESK = {
    app: 'finan3-w06-mortgage-desk', version: 1, seedVersion: 1, salt: 'rize-finan3-w06-mortgage:da6f1e', points: 60,
    storageKey: 'rize-finan3-w06-mortgage-v1', filePrefix: 'MortgageDesk',
    verifyUrl: 'https://rizecomputerscience.github.io/finan3-mortgage-desk/verify.html',
    calcPlaceholder: '2.4*536.82',
    calcHint: '',
    story: { title: 'The Mortgage Desk', kicker: 'Financial Markets and Institutions, Unit 6', company: 'The Mortgage Desk', team: '',
      from: '', fromTitle: '',
      dek: 'It is 2002, and you run a mortgage lender. You lend families the money to buy homes, then sell the loans so you can lend again. Before the boom years ahead, work out what a loan costs a family and who gets paid along the way. Then set your lending standards, year by year.',
      whatBox: '',
      stepsLine: 'Eleven short steps. Each calculation shows a worked example in the same table you fill in. Step 10 is a game, and finishing it completes the step, however it turns out.' },
    steps: STEPS, quiz: QUIZ, walk: null, buildTasks, taskView, judgeTask, helpText, praise, selfAnswer, selfWrong,
    note: { title: 'Memo to the board', label: 'Your memo', minWords: 40, receiptHeading: 'Memo to the board: what went wrong, and whose fault was it?',
      prompt: 'Write a memo to your board in two short paragraphs, at most 120 words in all. First, say what went wrong at your company. Second, say whose fault it was: yours, the borrowers’, Wall Street’s, the ratings agencies’ or the government’s and regulators’. Give a reason that names what someone was paid for or was supposed to check.' },
    // For tests and the lesson check (not used by the engine).
    payment, TABLE, RATES, gameSim, YEARS, PROFIT, BACK, START_CASH, ENDINGS, NEWS, LOSERS, OPTS, EVENTS, EVENT_SHOWN, PLAYERS, PAYS, linesFor,
  };

  // Engine boilerplate that would contradict this desk (lead ruling 7, 2026-11-17): the engine's start screen says the
  // desk is "graded on completion", but this desk's rubric also reads the memo; the note help says "3 to 5 sentences".
  // Reworded here, from the config, without editing the shared engine files. Runs in the browser only.
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined' && !root.DESK_NO_UI) {
    const fix = () => {
      const v = document.getElementById('view'); if (!v) return;
      v.querySelectorAll('li').forEach((li) => {
        if (!li.dataset.w6 && /This assignment is graded on completion\./.test(li.textContent)) {
          li.dataset.w6 = '1';
          li.innerHTML = '<b>This desk is graded on completion and on your memo.</b> Finish all 11 steps, with a memo that does what step 11 asks, to earn all 60 points (at least 6 steps earns 30). A wrong answer in a calculation never costs points.';
        }
      });
      const mh = document.getElementById('memoHelp');
      if (mh && !mh.dataset.w6) { mh.dataset.w6 = '1'; const wc = mh.querySelector('#wc'); mh.textContent = 'Write two short paragraphs, 40 to 120 words. Your memo prints on your receipt. '; if (wc) mh.appendChild(wc); }
      v.querySelectorAll('p').forEach((p) => {
        if (!p.dataset.w6 && /^This assignment is graded on completion\. Finish the open steps/.test(p.textContent)) { p.dataset.w6 = '1'; p.textContent = 'Finish the open steps below, then download a new receipt.'; }
      });
    };
    const start = () => { new MutationObserver(fix).observe(document.body, { childList: true, subtree: true }); fix(); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }
})(typeof window !== 'undefined' ? window : globalThis);

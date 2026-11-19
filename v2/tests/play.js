// The Mortgage Machine (v2): full headless playthrough through the real controls, like a student.
// The game (all loose to "Bankrupt in 2007", frames of the 2007 moment recorded; then Play again, strict twice to
// "Fired in 2003"), every debrief step wrong first and then right (tap-to-place, one real drag, the price tag, the
// missed-payment token), the memo, every calculation wrong once with help opened and then right (the live check
// completes it), the receipt downloaded and run through verify.html (and version 1's verify.html, if given),
// __selfCheck, no console errors, no sideways scroll; screenshots at 1440 and 390 wide.
// Usage: serve the site, then  node tests/play.js http://127.0.0.1:<port>/ <out dir> [v1 verify URL]
const { chromium } = require(process.env.PLAYWRIGHT || '/Users/samuel/Desktop/Mucking/projects/coursedev/interactive-health/node_modules/playwright');
const fs = require('fs');
(async () => {
  const base = process.argv[2], OUT = process.argv[3], V1 = process.argv[4]; fs.mkdirSync(OUT + '/frames', { recursive: true });
  const b = await chromium.launch({ channel: 'chrome' }); const errs = [], fails = [], log = (...a) => console.log(...a);
  const run = async (W, H, tag) => {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, acceptDownloads: true, deviceScaleFactor: W < 500 ? 2 : 1 });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(tag + ' ' + e)); p.on('console', (m) => { if (m.type() === 'error') errs.push(tag + ' ' + m.text()); });
    const shot = async (n) => { await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${tag}-${n}.png`, fullPage: true }); };
    const over = async (n) => { if (await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fails.push(`${tag} sideways scroll on ${n}`); };
    const fb = async () => (await p.textContent('#fb')).trim();
    await p.goto(base + 'index.html'); await p.waitForTimeout(500); await shot('00-title'); await over('title');
    await p.click('#goBtn'); await p.waitForTimeout(400);
    const code = await p.evaluate(() => window.MM.S.code); log(tag, 'desk code', code);
    const plan = await p.evaluate((c) => { const D = window.MM.D, C = window.DESK, h = window.DeskEngine.h, T = D.buildTasks(c);
      return Object.fromEntries(T.map((t) => [t.id, { good: C.selfAnswer(t, h), bad: C.selfWrong(t, h), answer: t.answer }])); }, code);

    const ids = await p.evaluate(() => window.MM.D.STEPS.map((x) => x.id));
    const fillRows = async (a) => { for (let i = 0; i < a.rows.length; i++) if (a.rows[i] != null) await p.fill(`.rowin[data-row="${i}"]`, String(a.rows[i])); };
    const STEP = {
      // the family's loan and its numbers: wrong once, help, then right (the live check completes it); LTV once by dragging
      async calc(id) {
        if (id === 'loan') { const bx = await p.locator('#houseSvg').boundingBox(); await p.mouse.move(bx.x + bx.width * 0.45, bx.y + bx.height * 0.5); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * 0.5, bx.y + bx.height * 0.5, { steps: 6 }); await p.mouse.up();
          log(tag, 'loan LTV by drag ->', await p.inputValue('.rowin[data-row="3"]')); }
        if (id === 'pay' && await p.$('.ratebtn')) { await p.click('.ratebtn >> nth=0'); log(tag, 'pay rate-card tap ->', await p.inputValue('.rowin[data-row="2"]')); }
        await fillRows(plan[id].bad); if (plan[id].bad.choice) await p.check(`input[name=dec][value="${plan[id].bad.choice}"]`);
        await p.click('#chkBtn'); await p.waitForTimeout(150); log(tag, id, 'wrong ->', (await fb()).slice(0, 100));
        if (await p.$('#helpRow button[data-l="1"]')) await p.click('#helpRow button[data-l="1"]');
        if (id === 'loan') await shot('loan-wrong');
        await fillRows(plan[id].good); await p.waitForTimeout(900);
        const f = await fb(); log(tag, id, 'right ->', f.slice(0, 100)); if (!/^Right/.test(f)) fails.push(tag + ' ' + id);
        await p.waitForTimeout(id === 'total' ? 2900 : 700); await shot(`${id}-right`); await over(id);
        if (id === 'total') { await p.fill('#scrub', '120'); await p.dispatchEvent('#scrub', 'input'); await shot('total-scrub-year10'); }
      },
      async chain() {
        for (let i = 0; i < 5; i++) { await p.click(`.card[data-key="${i}"]`); await p.click(`#bay${i + 1}`); }
        await p.click('#chk'); log(tag, 'chain wrong ->', (await fb()).slice(0, 90)); await shot('chain-wrong');
        await p.click('#bay1'); const back = await p.evaluate(() => !document.querySelector('.card[data-key="0"]').classList.contains('placed')); log(tag, 'chain: tapping a filled bay takes the event back ->', back); if (!back) fails.push(tag + ' chain take-back');
        if (await p.$('#helpRow button[data-l="1"]')) await p.click('#helpRow button[data-l="1"]');
        const ans = plan.chain.answer;
        { const c = await p.locator('.card[data-key="0"]').boundingBox(), d = await p.locator(`#bay${ans[0]}`).boundingBox();
          await p.mouse.move(c.x + 20, c.y + c.height / 2); await p.mouse.down(); await p.mouse.move(c.x + 60, c.y + 30, { steps: 4 }); await p.mouse.move(d.x + d.width / 2, d.y + d.height / 2, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(120); }
        for (let i = 1; i < 5; i++) { await p.click(`.card[data-key="${i}"]`); await p.click(`#bay${ans[i]}`); }
        await p.click('#chk'); const ch = await fb(); log(tag, 'chain right ->', ch.slice(0, 70)); if (!/^Right/.test(ch)) fails.push(tag + ' chain'); await shot('chain-right'); await over('chain');
      },
      async paid() {
        const wrongTags = ['a', 'b', 'c', 'd', 'e'];
        for (let i = 0; i < 5; i++) { await p.click(`.card[data-key="${wrongTags[i]}"]`); await p.click(`#pl${i}`); }
        await p.click('#chk'); log(tag, 'paid wrong ->', (await fb()).slice(0, 90)); await shot('paid-wrong');
        for (let i = 0; i < 5; i++) { await p.click(`.card[data-key="${plan.paid.answer[i]}"]`); await p.click(`#pl${i}`); }
        await p.click('#chk'); const pd = await fb(); log(tag, 'paid right ->', pd.slice(0, 70)); if (!/^Right/.test(pd)) fails.push(tag + ' paid'); await p.waitForTimeout(600); await shot('paid-right'); await over('paid');
      },
      async q1() {
        await p.click('.bigchoice[data-k="level"]'); log(tag, 'q1 wrong ->', (await fb()).slice(0, 70));
        await p.click('.bigchoice[data-k="down"]'); const q = await fb(); log(tag, 'q1 right ->', q.slice(0, 70)); if (!/^Right/.test(q)) fails.push(tag + ' q1'); await shot('q1-right'); await over('q1');
      },
      async q2() {
        await p.click('#q2broker'); await p.click('#chk'); log(tag, 'q2 wrong ->', (await fb()).slice(0, 70));
        { const t = await p.locator('#token').boundingBox(), f = await p.locator('#q2fund').boundingBox();
          await p.mouse.move(t.x + 20, t.y + 20); await p.mouse.down(); await p.mouse.move(t.x + 60, t.y + 60, { steps: 4 }); await p.mouse.move(f.x + f.width / 2, f.y + f.height / 2, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(100); }
        await p.click('#chk'); const q = await fb(); log(tag, 'q2 right ->', q.slice(0, 70)); if (!/^Right/.test(q)) fails.push(tag + ' q2'); await shot('q2-right'); await over('q2');
      },
      // the short lender game: all loose (bankrupt in 2007, frames recorded), then Play again strict twice: replaced in 2005,
      // then the player watches from inside Crestline to the 2007 crash
      async game() {
        await p.click('#goOn'); await p.waitForTimeout(250); await shot('game-2004');
        const year = async (c, frames) => {
          await p.click(`.ch3[data-c="${c}"]`);
          if (frames) { for (let k = 0; k < frames; k++) { await p.waitForTimeout(380); await p.locator('.g2-stage').screenshot({ path: `${OUT}/frames/${tag}-${String(k).padStart(2, '0')}.png` }); } }
          else { await p.waitForTimeout(150); await p.evaluate(() => window.MM.gameApi.skip()); }
          await p.waitForSelector('#goOn', { timeout: 15000 });
        };
        const next = async () => { await p.click('#goOn'); await p.waitForTimeout(250); };
        for (let k = 0; k < 3; k++) { await year('L'); if (k === 0) await shot('game-2004-react'); await next(); }
        await shot('game-2007-choose'); await year('L', tag === 'desk' || tag === 'phone' ? 28 : 0); await shot('game-2007-react');
        await next(); await p.waitForTimeout(400); const end1 = (await p.textContent('.ending h2')).trim(); await shot('game-end-bust');
        await p.click('#again'); await p.waitForTimeout(300); await p.click('#goOn'); await year('S'); await shot('game-strict-warned'); await next(); await year('S'); await shot('game-replaced');
        await next(); let watched = 0; // inside Crestline: watch each remaining year to the crash
        while (await p.$('#goOn') && /^Watch/.test(await p.textContent('#goOn'))) { await p.click('#goOn'); await p.waitForTimeout(150); await p.evaluate(() => window.MM.gameApi.skip()); await p.waitForSelector('#goOn:not([disabled])'); watched++; if (watched === 2) await shot('game-inside-crestline-2007'); await next(); }
        await p.waitForTimeout(400); const end2 = (await p.textContent('.ending h2')).trim(); await shot('game-end-replaced');
        const g = await p.evaluate(() => window.MM.S.log.game);
        const ok = /bankrupt in 2007/.test(end1) && /^Replaced in 2005; Crestline Mortgage bankrupt in 2007/.test(end2) && watched === 2 && g.done && g.value === 'g4:SS';
        log(tag, 'game', end1, '|', end2, '| years watched inside Crestline', watched, '| saved', g.value, ok ? 'ok' : 'NOT OK'); if (!ok) fails.push(tag + ' game'); await over('game');
      },
      async note() {
        await p.fill('#memo', 'We lent to families with no proof of income because every loan paid us a fee when we sold it. '.repeat(3).trim());
        await p.waitForTimeout(700); const wc = (await p.textContent('#wc')).trim(); log(tag, 'memo ->', wc); if (!/Saved/.test(wc)) fails.push(tag + ' memo'); await shot('memo'); await over('memo');
      },
    };
    for (const id of ids) {
      if (['loan', 'pay', 'first', 'total', 'lockin'].includes(id)) await STEP.calc(id); else await STEP[id]();
      if (await p.$('#nextBtn')) await p.click('#nextBtn'); await p.waitForTimeout(300);
    }

    // ---- receipt ----
    await p.waitForSelector('#dl'); await p.waitForTimeout(400); await shot('17-receipt'); await over('receipt');
    const pts = (await p.textContent('.points')).trim(); log(tag, 'receipt points', pts); if (pts !== '60 / 60 points') fails.push(tag + ' points ' + pts);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#dl')]); const file = `${OUT}/${tag}-receipt.png`; await dl.saveAs(file); log(tag, 'downloaded', dl.suggestedFilename());
    const sc = await p.evaluate(() => window.__selfCheck()); log(tag, 'selfcheck', sc.ok, sc.checks.filter((c) => !c.ok).map((c) => c.name + ': ' + c.detail).join('; '));
    if (!sc.ok) fails.push(tag + ' selfcheck');
    const verify = async (url, label) => {
      const v = await ctx.newPage(); v.on('pageerror', (e) => errs.push(label + ' ' + e)); await v.goto(url); await v.setInputFiles('input[type=file]', file); await v.waitForTimeout(900);
      const t = (await v.textContent('body')).replace(/\s+/g, ' '); const ok = /Receipt is intact and every completed step checks out/.test(t) && /11 of 11/.test(t);
      log(tag, label, ok ? 'intact, 11 of 11 steps verified' : 'NOT VERIFIED'); if (!ok) fails.push(tag + ' ' + label); await v.screenshot({ path: `${OUT}/${tag}-${label}.png`, fullPage: true }); await v.close();
    };
    await verify(base + 'verify.html', 'verify-v2'); if (V1) await verify(V1, 'verify-v1');
    await ctx.close();
  };
  await run(1440, 900, 'desk');
  await run(390, 844, 'phone');
  // reduced motion: the game still plays and the 2007 moment still reads, without movement
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('reduced ' + e));
    await p.goto(base + 'index.html'); await p.click('#goBtn'); await p.waitForTimeout(300);
    await p.evaluate(() => window.MM.go('game')); await p.click('#goOn');
    for (let k = 0; k < 4; k++) { await p.click('.ch3[data-c="L"]'); await p.waitForSelector('#goOn'); if (k < 3) await p.click('#goOn'); await p.waitForTimeout(100); }
    const t = await p.evaluate(() => (document.querySelector('#stTick') || {}).textContent); log('reduced motion after 2007:', t); if (!/Bankrupt in 2007/.test(t)) fails.push('reduced motion 2007');
    await p.screenshot({ path: `${OUT}/reduced-2007.png` }); await ctx.close(); }
  log('errors', JSON.stringify(errs)); log(fails.length || errs.length ? 'FAIL ' + JSON.stringify(fails) : 'PASS');
  await b.close(); process.exit(fails.length || errs.length ? 1 : 0);
})();

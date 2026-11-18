/* The Mortgage Machine: the machine scene (title screen and the lender's game) and step 10, the lender's game.
   The game's rules are version 1's gameSim (rules.js); this file only draws what the simulation says happened.
   Two layouts of one machine: landscape (wide screens) and portrait (phones). Papers ride real paths. */
(function (root) {
  'use strict';
  const M = root.MM, C = M.C, A = root.Art, K = A.K, $ = M.$, $$ = M.$$, esc = M.esc, Snd = M.Snd;
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = M.reduced;

  // ---------------- layouts ----------------
  // Points are the conveyor's corners. main: office door to the fork. gov and priv: fork to the investors.
  const LAND = { w: 1200, h: 520, portrait: false,
    fam: { x: 22, y: 150, cols: 3, dx: 44, dy: 44, s: 0.78, max: 18 },
    office: { x: 172, y: 168, w: 156, h: 164 }, cash: { x: 344, base: 250, w: 38 }, pileAt: { x: 186, y: 330 },
    main: [[328, 292], [470, 292]],
    gov: [[470, 292], [520, 160], [560, 160], [740, 160], [940, 160], [1030, 258]],
    priv: [[470, 292], [520, 424], [560, 424], [700, 424], [736, 424], [940, 424], [1030, 322]],
    press: { x: 560, y: 104, w: 180, h: 112 }, bank: { x: 562, y: 368, w: 136, h: 112 }, booth: { x: 742, y: 352, s: 1 },
    pressOut: 3, bankOut: 3, boothAt: 4, risk: { x: 946, y: 500 }, globe: { x: 1100, y: 290, r: 56 }, gate: { x: 1002, y: 352, w: 54, h: 8, rot: 50 },
    money: [[1100, 230], [1100, 44], [250, 44], [250, 168]],
    labels: [
      { x: 650, y: 92, t: 'Fannie Mae and Freddie Mac', a: 'middle', b: 1 },
      { x: 752, y: 142, t: 'Government-backed: payments guaranteed', a: 'start', s: 16 },
      { x: 630, y: 506, t: 'Wall Street bank', a: 'middle', b: 1 },
      { x: 778, y: 342, t: 'Ratings agency', a: 'middle', s: 16 },
      { x: 862, y: 446, t: 'Private copy: no guarantee', a: 'middle', s: 16 },
      { x: 1100, y: 386, t: 'Investors', a: 'middle', b: 1 }, { x: 1100, y: 404, t: 'around the world', a: 'middle', s: 16 },
      { x: 640, y: 34, t: 'Money flows back: fees and cash for the loans you sell', a: 'middle', s: 16 },
      { x: 86, y: 136, t: 'Families', a: 'middle', s: 16 } ] };
  const PORT = { w: 390, h: 540, portrait: true,
    fam: { x: 28, y: 6, cols: 9, dx: 37, dy: 0, s: 0.6, max: 9 },
    office: { x: 124, y: 52, w: 142, h: 128 }, cash: { x: 286, base: 180, w: 30 }, pileAt: { x: 132, y: 178 },
    main: [[195, 180], [195, 214]],
    gov: [[195, 214], [96, 214], [96, 246], [96, 330], [96, 420], [164, 470]],
    priv: [[195, 214], [294, 214], [294, 246], [294, 330], [294, 352], [294, 420], [226, 470]],
    press: { x: 26, y: 246, w: 140, h: 84 }, bank: { x: 230, y: 246, w: 128, h: 84 }, booth: { x: 252, y: 336, s: 0.62 },
    pressOut: 3, bankOut: 3, boothAt: 4, risk: { x: 318, y: 500 }, globe: { x: 195, y: 486, r: 34 }, gate: { x: 236, y: 448, w: 40, h: 7, rot: -40 },
    money: [[160, 500], [12, 500], [12, 112], [124, 112]],
    labels: [
      { x: 96, y: 352, t: 'Fannie Mae and', a: 'middle', b: 1, s: 13 }, { x: 96, y: 367, t: 'Freddie Mac', a: 'middle', b: 1, s: 13 }, { x: 96, y: 384, t: 'guaranteed', a: 'middle', s: 12 },
      { x: 294, y: 402, t: 'Wall Street bank,', a: 'middle', b: 1, s: 13 }, { x: 294, y: 417, t: 'ratings agency', a: 'middle', b: 1, s: 13 }, { x: 294, y: 433, t: 'no guarantee', a: 'middle', s: 12 },
      { x: 195, y: 536, t: 'Investors', a: 'middle', b: 1, s: 13 } ] };
  const layoutFor = (el) => (el.clientWidth || root.innerWidth) < 720 ? PORT : LAND;
  const pathD = (pts) => 'M' + pts.map((p) => p.join(' ')).join(' L');

  // ---------------- the machine ----------------
  function Machine(host, opts) {
    opts = opts || {};
    const self = {}; let Lt = layoutFor(host), sprites = [], raf = 0, last = 0, idle = false, idleT = 0, idleN = 0, state = { cash: opts.cash != null ? opts.cash : 20, fam: 6, dark: 0, pile: 0, risk: 0, turned: false, gate: false, label: opts.label || 'Your company' };
    let svg, routes = {};
    function draw() {
      Lt = layoutFor(host); const L = Lt, o = L.office;
      const belt = (pts, cls) => `<path d="${pathD(pts)}" class="belt ${cls || ''}" fill="none" stroke="${K.ink3}" stroke-width="${L.portrait ? 14 : 20}" stroke-linejoin="round"/><path d="${pathD(pts)}" class="belt-dash ${cls || ''}" fill="none" stroke="${K.line}" stroke-width="2" stroke-dasharray="3 9"/>`;
      host.innerHTML = `<svg class="world machine" viewBox="0 0 ${L.w} ${L.h}" role="img" aria-labelledby="mT mD"><title id="mT">The mortgage machine</title><desc id="mD">Families borrow from your company. Strict and normal loans go to Fannie Mae and Freddie Mac, which guarantee their bonds. Loose loans go to a Wall Street bank and a ratings agency, with no guarantee. Investors around the world buy the bonds, and money flows back to you.</desc>
        <path d="${pathD(L.money)}" fill="none" stroke="${K.goldDeep}" stroke-width="${L.portrait ? 6 : 8}" opacity=".55" stroke-linejoin="round"/>
        ${belt(L.main)}${belt(L.gov, 'gov')}${belt(L.priv, 'priv')}
        <g id="fam"></g>
        ${A.press(L.press.x, L.press.y, L.press.w, L.press.h)}${A.bank(L.bank.x, L.bank.y, L.bank.w, L.bank.h)}<g class="booth">${A.booth(L.booth.x, L.booth.y, L.booth.s)}</g>
        ${A.globe(L.globe.x, L.globe.y, L.globe.r, 'globe')}
        <rect id="gate" x="${L.gate.x}" y="${L.gate.y}" width="${L.gate.w}" height="${L.gate.h}" fill="${K.red}" stroke="${K.onInk}" stroke-width="1.5" transform="rotate(${L.gate.rot} ${L.gate.x} ${L.gate.y}) translate(0 -60)" opacity="0"/>
        ${A.office(o.x, o.y, o.w, o.h, esc(state.label), 'off')}
        <g id="pile"></g><g id="risk"></g><text id="riskLbl" x="${L.risk.x + (L.portrait ? 30 : 46)}" y="${L.risk.y + (L.portrait ? 16 : 22)}" text-anchor="middle" font-family="Jost" font-size="${L.portrait ? 11 : 13.5}" fill="${K.red}"></text><g id="cash"></g><text id="cashLbl" x="${L.cash.x - (L.portrait ? 2 : 4)}" y="${L.cash.base + (L.portrait ? 16 : 20)}" text-anchor="start" font-family="Jost" font-weight="600" font-size="${L.portrait ? 12 : 15}" fill="${K.gold}"></text>
        ${L.labels.map((l) => `<text x="${l.x}" y="${l.y}" text-anchor="${l.a}" font-family="Jost" font-weight="${l.b ? 600 : 400}" font-size="${l.s || (L.portrait ? 16 : 20)}" fill="${l.b ? K.onInk : K.muted}">${esc(l.t)}</text>`).join('')}
        <g id="sprites"></g>
        ${['main', 'gov', 'priv', 'money', 'back'].map((k) => `<path id="r_${k}" d="" fill="none" stroke="none"/>`).join('')}</svg>`;
      svg = host.querySelector('svg');
      const rev = (pts) => pts.slice().reverse();
      const set = (k, pts) => { const p = svg.querySelector('#r_' + k); p.setAttribute('d', pathD(pts)); routes[k] = { el: p, len: p.getTotalLength() }; };
      set('gov', [...L.main, ...L.gov.slice(1)]); set('priv', [...L.main, ...L.priv.slice(1)]); set('money', L.money);
      set('back', [...rev(L.priv), ...rev(L.main).slice(1), [o.x + o.w / 2, o.y + o.h - 30]]);
      // where a loan becomes a bond, and where the agency stamps it: lengths along each route
      const lenTo = (pts, k) => { let d = 0; for (let i = 1; i <= k; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return d; };
      const gp = [...L.main, ...L.gov.slice(1)], pp = [...L.main, ...L.priv.slice(1)], off = L.main.length - 1;
      routes.gov.bondAt = lenTo(gp, off + L.pressOut); routes.priv.bondAt = lenTo(pp, off + L.bankOut); routes.priv.stampAt = lenTo(pp, off + L.boothAt) + (L.portrait ? 18 : 36);
      sprites = []; paintFam(); paintCash(state.cash, true); paintPile(); paintRisk(); paintDark(); paintTurned();
    }
    const q = (id) => svg.querySelector('#' + id);
    function paintFam() { const f = Lt.fam, n = Math.min(state.fam, f.max); let g = ''; for (let i = 0; i < n; i++) { const c = i % f.cols, r = Math.floor(i / f.cols); g += A.family(f.x + c * f.dx, f.y + r * f.dy, f.s, K.onInk); } q('fam').innerHTML = g; }
    function paintCash(cash) {
      const n = Math.max(0, Math.round(cash / 10)), c = Lt.cash, step = Lt.portrait ? 6 : 8.5; let g = '';
      for (let i = 0; i < n; i++) { const col = Math.floor(i / 12), lvl = i % 12; g += A.coinEdge(c.x + c.w / 2 + col * (c.w + 4), c.base - 8 - lvl * step, c.w); }
      q('cash').innerHTML = g; q('cashLbl').textContent = cash < 0 ? `−$${Math.abs(Math.round(cash))}M` : `$${Math.round(cash)}M cash`;
      q('cashLbl').setAttribute('fill', cash < 0 ? K.red : K.gold);
    }
    function paintPile() { const p = Lt.pileAt; let g = ''; for (let i = 0; i < state.pile; i++) g += A.at(p.x + (i % 5) * (Lt.portrait ? 9 : 12), p.y - 30 - Math.floor(i / 5) * (Lt.portrait ? 8 : 11), Lt.portrait ? 0.5 : 0.7, A.paper('L', { back: false }), ` transform-origin="0 0"`); q('pile').innerHTML = g; }
    // Loose loans you have sold pile up at the investors' end: the thing that can come back.
    function paintRisk() { const R = Lt.risk, n = Math.min(18, state.risk), sc = Lt.portrait ? 0.46 : 0.62, dx = Lt.portrait ? 10 : 15, dy = Lt.portrait ? 7 : 10; let g = '';
      for (let i = 0; i < n; i++) g += A.at(R.x + (i % 6) * dx, R.y - 22 - Math.floor(i / 6) * dy, sc, A.paper('L'));
      q('risk').innerHTML = g; q('riskLbl').textContent = n ? (Lt.portrait ? 'Loose loans sold' : 'Loose loans you sold') : ''; }
    function paintDark() { for (let i = 0; i < 6; i++) { const w = q('offw' + i); if (w) w.setAttribute('fill', i < state.dark ? K.ink : K.gold); } }
    function paintTurned() { $$('.invb .flip', svg).forEach((f) => { f.style.transform = state.turned ? 'scaleX(-1)' : ''; }); $$('.invb', svg).forEach((f) => f.setAttribute('opacity', state.turned ? 0.55 : 1));
      const gt = q('gate'); if (gt) { const G = Lt.gate; gt.setAttribute('opacity', state.gate ? 1 : 0); gt.setAttribute('transform', `rotate(${G.rot} ${G.x} ${G.y})${state.gate ? '' : ' translate(0 -60)'}`); } }
    // ---- sprites ----
    function spawn(route, html, speed, o) {
      const g = document.createElementNS(NS, 'g'); g.innerHTML = html; q('sprites').appendChild(g);
      const sp = Object.assign({ g, route, pos: 0, speed, stop: Infinity, onEnd: null, onPass: null, passed: false, html }, o || {}); sprites.push(sp); place(sp); return sp;
    }
    function place(sp) { const r = routes[sp.route], p = r.el.getPointAtLength(Math.min(sp.pos, r.len)); const s = Lt.portrait ? (sp.small || 0.62) : (sp.big || 0.9); sp.g.setAttribute('transform', `translate(${(p.x - 13 * s).toFixed(1)} ${(p.y - 16 * s).toFixed(1)}) scale(${s})`); }
    function frame(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      sprites.forEach((sp) => {
        const r = routes[sp.route]; if (sp.pos < Math.min(r.len, sp.stop)) sp.pos = Math.min(sp.pos + sp.speed * dt, r.len, sp.stop);
        if (sp.marks) while (sp.marks.length && sp.pos >= sp.marks[0].at) sp.marks.shift().fn(sp);
        place(sp);
        if (sp.pos >= r.len && !sp.done) { sp.done = true; sp.g.remove(); if (sp.onEnd) sp.onEnd(sp); }
      });
      sprites = sprites.filter((s) => !s.done);
      if (idle) { idleT += dt; if (idleT > 0.55) { idleT = 0; idleN++; const qq = idleN % 3 === 0 ? 'L' : idleN % 3 === 1 ? 'S' : 'N'; sendPaper(qq, 150, () => { if (idleN % 2) sendCoin(260); }); } }
      raf = sprites.length || idle ? requestAnimationFrame(frame) : 0; if (!raf) last = 0;
    }
    const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
    function sendPaper(qq, speed, onEnd, o) {
      const route = qq === 'L' ? 'priv' : 'gov';
      const sp = spawn(route, A.paper(qq), speed, Object.assign({ onEnd }, o || {}));
      // the press turns loans into bonds; on the private lane the ratings agency then stamps them AAA
      sp.marks = route === 'gov' ? [{ at: routes.gov.bondAt, fn: (s) => { s.g.innerHTML = A.bondChip('gov'); } }]
        : [{ at: routes.priv.bondAt, fn: (s) => { s.g.innerHTML = A.bondChip('priv'); } }, { at: routes.priv.stampAt, fn: (s) => { s.g.innerHTML = A.bondChip('aaa'); Snd.stamp(); } }];
      kick(); return sp;
    }
    function sendCoin(speed, onEnd) { const sp = spawn('money', A.coin(13, 16, 11), speed, { onEnd }); kick(); return sp; }
    function sendBack(speed, onEnd) { const sp = spawn('back', A.paper('L', { back: true }), speed, { onEnd }); kick(); return sp; }

    // ---- public ----
    self.redraw = (force) => { const n = layoutFor(host); if (force || n !== Lt) { sprites.forEach((s) => s.g.remove()); sprites = []; draw(); } };
    self.setCash = (c) => { state.cash = c; paintCash(c); };
    self.setFamilies = (n) => { state.fam = n; paintFam(); };
    self.setRisk = (n) => { state.risk = n; paintRisk(); };
    self.setLabel = (t) => { state.label = t; const o = svg.querySelector('#off text'); if (o) o.textContent = t; };
    self.reset = (o) => { Object.assign(state, { dark: 0, pile: 0, risk: 0, turned: false, gate: false }, o || {}); sprites.forEach((s) => s.g.remove()); sprites = []; paintPile(); paintRisk(); paintDark(); paintTurned(); paintCash(state.cash); paintFam(); };
    self.idle = (on) => { idle = !!on && !reduced(); if (idle) kick(); };
    self.stop = () => { idle = false; cancelAnimationFrame(raf); raf = 0; sprites.forEach((s) => s.g.remove()); sprites = []; };
    self.state = state;
    // The worked instance of selling one loan (the walkthrough before 2002): one big loan, moved hop by hop.
    let demoSp = null;
    const clearDemo = () => { if (demoSp) { demoSp.g.remove(); sprites = sprites.filter((x) => x !== demoSp); demoSp = null; } };
    self.demo = (k) => {
      const fast = reduced() ? 1e6 : 1;
      if (k <= 0) clearDemo(); if (k < 0) { sprites.forEach((x) => x.g.remove()); sprites = []; return; }
      const mk = () => { demoSp = sendPaper('S', 170 * fast, () => { demoSp = null; }, { stop: 1, big: 1.7, small: 1.15 }); };
      if (!demoSp && k < 3) mk();
      if (k === 1) { demoSp.stop = routes.gov.bondAt - 24; demoSp.speed = 170 * fast; sendCoin(360 * fast); }
      if (k === 2) { demoSp.stop = Infinity; demoSp.speed = 190 * fast; }
      if (k === 3) { const b = sendBack(220 * fast, null); b.big = 1.6; b.small = 1.1; }
      kick();
    };
    // A normal year: papers of this year's quality ride to their lane; each sale sends money back; cash climbs.
    self.runYear = (y) => new Promise((resolve) => {
      const choice = y.choice, n = { S: 5, N: 8, L: 14 }[choice], speed = { S: 230, N: 290, L: 400 }[choice];
      self.setFamilies({ S: 4, N: 8, L: 18 }[choice]);
      const from = y.cashBefore, to = y.cashAfter; let arrived = 0;
      const addRisk = () => { if (choice === 'L') self.setRisk(state.risk + 3); };
      if (reduced() || y.instant) { self.setCash(to); addRisk(); return resolve(); }
      Snd.humStart({ S: 0.6, N: 1, L: 1.6 }[choice]);
      const finish = () => { Snd.humStop(); self.setCash(to); addRisk(); resolve(); };
      const tm = []; let over = false;
      for (let i = 0; i < n; i++) tm.push(setTimeout(() => sendPaper(choice, speed, () => {
        sendCoin(460, () => { arrived++; Snd.coin(); self.setCash(from + (to - from) * arrived / n); if (arrived === n) tm.push(setTimeout(done, 250)); });
      }), i * (1900 / n)));
      const done = () => { if (over) return; over = true; tm.forEach(clearTimeout); finish(); };
      self.skip = () => { sprites.forEach((s) => s.g.remove()); sprites = []; done(); };
    });
    // The bust: buyers stop taking private bonds, the line backs up, sold loans come back, cash drains, lights go out.
    self.runBust = (y, say) => new Promise((resolve) => {
      const choice = y.choice, nBack = Math.max(4, Math.min(14, Math.round(y.back / 20)));
      const from = y.cashBefore, to = y.cashAfter; let t = [];
      const after = (ms, f) => t.push(setTimeout(f, ms));
      const endState = () => { t.forEach(clearTimeout); sprites.forEach((s) => s.g.remove()); sprites = []; state.turned = true; state.gate = true; paintTurned(); state.risk = 0; paintRisk(); state.pile = nBack; paintPile(); self.setCash(to); if (y.bust) { state.dark = 6; paintDark(); } Snd.humStop(true); resolve(); };
      self.skip = endState;
      if (reduced() || y.instant) { say && say(y.bust ? 'Buyers stop taking private bonds. Loans you sold come back. Your cash runs out.' : 'Buyers stop taking private bonds. Loans you sold come back.'); return endState(); }
      self.setFamilies(choice === 'L' ? 6 : 3);
      Snd.humStart(choice === 'L' ? 1.4 : 0.8);
      say && say('House prices are falling.');
      after(1200, () => { state.turned = true; state.gate = true; paintTurned(); Snd.thud(); say && say('Investors stop buying bonds made of loose loans.'); });
      // this year's papers: loose ones stop at the gate and bunch up; sound ones still go to Fannie Mae and Freddie Mac
      const k = choice === 'L' ? 9 : 4, gateLen = routes.priv.len - (Lt.portrait ? 40 : 70);
      for (let i = 0; i < k; i++) after(1400 + i * 260, () => {
        if (choice === 'L') sendPaper('L', 300 - i * 18, null, { stop: gateLen - i * (Lt.portrait ? 9 : 14) });
        else sendPaper(choice, 230, () => sendCoin(460, () => Snd.coin()));
      });
      after(choice === 'L' ? 4200 : 3000, () => { say && say('The line backs up. Loans you already sold are sent back.'); Snd.humWind(2.5); });
      const startBack = choice === 'L' ? 4800 : 3600;
      const risk0 = state.risk;
      for (let i = 0; i < nBack; i++) after(startBack + i * 330, () => { self.setRisk(Math.round(risk0 * (1 - (i + 1) / nBack))); sendBack(330, () => { state.pile++; paintPile(); Snd.thud(); self.setCash(from + (to - from) * state.pile / nBack); if (state.pile === nBack) after(400, darken); }); });
      const darken = () => {
        if (!y.bust) { self.setCash(to); return after(500, () => resolve()); }
        say && say('Your cash runs out.'); Snd.low();
        for (let i = 0; i < 6; i++) after(260 * i, () => { state.dark = i + 1; paintDark(); });
        after(1900, () => { sprites.forEach((s) => s.g.remove()); sprites = []; resolve(); });
      };
    });
    draw();
    const onR = () => self.redraw(); root.addEventListener('resize', onR); self.destroy = () => { self.stop(); root.removeEventListener('resize', onR); };
    return self;
  }
  M.Machine = Machine;

  // The rival's line next door: a narrow strip, always loose.
  function RivalStrip(host) {
    const self = {}; let svg, pts = [], timer = [], state = { cash: 20, dark: false, closed: false };
    function draw() {
      const port = (host.clientWidth || root.innerWidth) < 720, W = port ? 390 : 1200, Hh = port ? 86 : 92;
      const ox = port ? 8 : 20, ow = port ? 92 : 120, bx = port ? 300 : 1040;
      host.innerHTML = `<svg class="world" viewBox="0 0 ${W} ${Hh}" role="img" aria-labelledby="rvT"><title id="rvT">Next door, your rival's line, loose every year</title>
        <rect x="0" y="0" width="${W}" height="${Hh}" fill="${K.ink2}"/>
        <path d="M${ox + ow} 56 H${bx}" stroke="${K.ink3}" stroke-width="12"/><path d="M${ox + ow} 56 H${bx}" stroke="${K.line}" stroke-width="2" stroke-dasharray="3 9"/>
        <g id="rvOff">${A.office(ox, 8, ow, 78, 'Your rival', 'rv')}</g>${A.bank(bx + 6, 22, port ? 54 : 70, port ? 54 : 62, K.muted)}
        <text x="${(ox + ow + bx) / 2}" y="${port ? 24 : 26}" text-anchor="middle" font-family="Jost" font-size="${port ? 12 : 14}" fill="${K.muted}">Next door: your rival, loose every year</text>
        <text id="rvCash" x="${(ox + ow + bx) / 2}" y="${Hh - 6}" text-anchor="middle" font-family="Jost" font-weight="600" font-size="${port ? 12 : 14}" fill="${K.gold}"></text><g id="rvSp"></g></svg>`;
      svg = host.querySelector('svg'); pts = [ox + ow, bx]; paint();
    }
    function paint() { const c = svg.querySelector('#rvCash'), out = state.closed || state.cash < 0; c.textContent = out ? 'Bankrupt' : `$${state.cash}M cash`; c.setAttribute('fill', out ? K.red : K.gold);
      for (let i = 0; i < 6; i++) { const w = svg.querySelector('#rvw' + i); if (w) w.setAttribute('fill', state.dark ? K.ink : K.gold); } }
    function fly(back) {
      const g = document.createElementNS(NS, 'g'); g.innerHTML = A.paper('L', back ? { back: true } : {}); svg.querySelector('#rvSp').appendChild(g);
      const x0 = back ? pts[1] : pts[0], x1 = back ? pts[0] : pts[1], t0 = performance.now(), dur = back ? 1400 : 900;
      const st = (now) => { const k = Math.max(0, Math.min(1, (now - t0) / dur)); g.setAttribute('transform', `translate(${x0 + (x1 - x0) * k - 10} 42) scale(.62)`); if (k < 1 && svg.contains(g)) requestAnimationFrame(st); else g.remove(); }; requestAnimationFrame(st);
    }
    self.run = (r) => { state.cash = r.rcash == null ? state.cash : r.rcash; if (reduced() || r.instant) { if (r.rivalBust) { state.dark = true; state.closed = true; } paint(); return; }
      if (r.rprofit == null) { paint(); return; }
      if (r.rback) { for (let i = 0; i < 8; i++) timer.push(setTimeout(() => fly(true), 1200 + i * 360)); timer.push(setTimeout(() => { if (r.rivalBust) { state.dark = true; state.closed = true; } paint(); }, 4600)); }
      else { for (let i = 0; i < 12; i++) timer.push(setTimeout(() => fly(false), i * 150)); timer.push(setTimeout(paint, 2000)); } };
    self.set = (o) => { Object.assign(state, o); paint(); };
    self.finish = (r) => { self.stop(); state.cash = r.rcash == null ? state.cash : r.rcash; if (r.rivalBust || state.cash < 0) { state.dark = true; state.closed = true; } paint(); };
    self.stop = () => { timer.forEach(clearTimeout); timer = []; };
    draw(); const onR = () => draw(); root.addEventListener('resize', onR); self.destroy = () => { self.stop(); root.removeEventListener('resize', onR); };
    return self;
  }

  // ---------------- house prices: the real FHFA line, drawn year by year ----------------
  function priceChart(host, spark) {
    const H = root.HPI, W = 360, Hh = 170, x0 = 34, x1 = 350, y0 = 140, y1 = 12, vmin = 90, vmax = 170;
    const X = (i) => x0 + (x1 - x0) * i / (H.values.length - 1), Y = (v) => y0 - (y0 - y1) * (v - vmin) / (vmax - vmin);
    let ticks = ''; [100, 130, 160].forEach((v) => { ticks += `<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}" stroke="#CBD3D6"/><text x="${x0 - 6}" y="${Y(v) + 4}" text-anchor="end" font-family="Jost" font-size="11" fill="#4F5D70">${v}</text>`; });
    for (let yr = 2000; yr <= 2012; yr += 2) ticks += `<text x="${X((yr - 2000) * 12)}" y="${y0 + 16}" text-anchor="middle" font-family="Jost" font-size="11" fill="#4F5D70">${yr}</text>`;
    host.innerHTML = `<h3>House prices</h3><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-labelledby="hpT hpD"><title id="hpT">House prices, 2000 to 2012</title><desc id="hpD"></desc>
      <rect x="${X(24)}" y="${y1}" width="${X(108) - X(24)}" height="${y0 - y1}" fill="#E4E9EC"/><text x="${X(66)}" y="${y1 + 13}" text-anchor="middle" font-family="Jost" font-size="11" fill="#4F5D70">the game: 2002 to 2008</text>${ticks}
      <path id="hpLine" fill="none" stroke="${K.ink}" stroke-width="2.6" stroke-linejoin="round"/><circle id="hpDot" r="4" fill="${K.red}" opacity="0"/></svg>
      <p>January 2000 = 100. Federal Housing Finance Agency, purchase-only house price index (homes with loans that Fannie Mae and Freddie Mac could buy).</p>`;
    const line = host.querySelector('#hpLine'), dot = host.querySelector('#hpDot'), desc = host.querySelector('#hpD'); let shown = 0;
    const drawTo = (n) => { n = Math.max(1, Math.min(H.values.length, Math.round(n))); shown = n; line.setAttribute('d', 'M' + H.values.slice(0, n).map((v, i) => `${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' L'));
      dot.setAttribute('cx', X(n - 1)); dot.setAttribute('cy', Y(H.values[n - 1])); dot.setAttribute('opacity', 1);
      if (spark) { const sx = (i) => 2 + 146 * i / (H.values.length - 1), sy = (v) => 31 - 28 * (v - 95) / 72; spark.querySelector('#sparkLine').setAttribute('d', 'M' + H.values.slice(0, n).map((v, i) => `${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' L')); const dd = spark.querySelector('#sparkDot'); dd.setAttribute('cx', sx(n - 1)); dd.setAttribute('cy', sy(H.values[n - 1])); }
      const yr = 2000 + Math.floor((n - 1) / 12); desc.textContent = `Through ${yr}: the index stands at ${H.values[n - 1]}, against 100 in January 2000. Its high point is ${Math.max(...H.values.slice(0, n))}.`; };
    return { drawTo, toYearEnd(y, ms) { const target = (y - 2000 + 1) * 12; if (reduced() || !ms) return drawTo(target); const from = shown, t0 = performance.now(); const st = (now) => { const k = Math.max(0, Math.min(1, (now - t0) / ms)); drawTo(from + (target - from) * k); if (k < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); } };
  }

  // ---------------- year photographs (public domain; see ../FACTS.md) ----------------
  const PHOTOS = root.YEAR_PHOTOS || {};

  // ---------------- title screen machine ----------------
  M.heroMachine = (host) => { const m = Machine(host, { cash: 60 }); m.setFamilies(9); m.idle(true); M.onLeave(() => m.destroy()); return m; };

  // ---------------- the people in the lender's game ----------------
  // Every party gets a reason for what it does (the memo question stays open). Lines in quotes are game fiction unless
  // FACTS.md gives a source; the applicants are invented. Strict, normal and loose are v1's options: strict = proof of income
  // and 20% down, normal = proof of income and 10% down, loose = no proof and nothing down.
  const WHO = { officer: 'Your loan officer', chair: 'Your board chair', rival: 'Your rival', wallst: 'A Wall Street buyer', analyst: 'A ratings analyst', fannie: 'A Fannie Mae buyer', regulator: 'A bank regulator' };
  const VISIT = {
    2002: (V) => ['chair', `Our shareholders compare us with the lender next door every year. If it out-earns us${V.T ? ` by more than $${V.T} million` : ''} two years running, you’re out.`],
    2003: () => ['rival', 'Met you at the industry dinner, right? We approved almost everyone last year and sold every loan the same week. My loan officers bought boats.'],
    2004: () => ['wallst', 'I’ll buy every loan you can make, paperwork or not. We pool them into bonds and earn a fee on every bond we sell.'],
    2005: () => ['analyst', 'The bank selling these bonds pays us to grade them. Our models say the top slices are safe, so they get AAA.'],
    2006: () => ['fannie', 'Wall Street has been taking our business. We’re buying riskier loans now too.'],
    2007: (V) => ['wallst', V.late ? 'We bought through the spring. Not anymore. And the loans you sold us that failed in their first months? Under our contract, they’re yours again.' : 'We’re not buying. And the loans you sold us that failed in their first months? Under our contract, they’re yours again.'],
    2008: () => ['regulator', 'We could set lending rules for every lender. While prices rose, these loans got repaid, and the lenders said the market was working.'],
  };
  const APP = {
    2002: { who: 'A nurse and a truck driver', role: 'couple', ask: 'Pay stubs show $6,000 a month. They saved 10% of a $200,000 house.', S: 'Needs 20% down. They have 10%: no loan.', N: 'Pay stubs and 10% down: approved.', L: 'Approved. No questions asked.' },
    2003: { who: 'A restaurant owner', role: 'person', ask: 'Says he earns $9,000 a month. No tax returns, nothing saved.', S: 'No proof of income: no loan.', N: 'No proof of income: no loan.', L: 'Approved on his word.' },
    2004: { who: 'A couple buying a second house to rent out', role: 'couple', ask: 'Income stated, not shown. Nothing down on $300,000.', S: 'No proof, nothing down: no loan.', N: 'No proof, nothing down: no loan.', L: 'Approved. The rent will cover it, they say.' },
    2005: { who: 'A teacher', role: 'person', ask: 'Pay stubs show $4,000 a month. She wants a $350,000 house with nothing down.', S: 'Needs $70,000 down: no loan.', N: 'Needs $35,000 down: no loan.', L: 'Approved. The payment would take most of her pay.' },
    2006: { who: 'A young couple', role: 'couple', ask: 'Two new jobs, no pay stubs yet, no savings. A $250,000 starter home.', S: 'No proof, nothing down: no loan.', N: 'No proof, nothing down: no loan.', L: 'Approved. They start paying next month.' },
    2007: { who: 'A family with savings', role: 'family', ask: 'Pay stubs, and 20% down saved for a $250,000 house.', S: 'Approved. Fannie Mae still buys loans like this.', N: 'Approved. Fannie Mae still buys loans like this.', L: 'Approved, along with everyone else. Nobody buys loose loans now: you keep them.' },
    2008: { who: 'A family with pay stubs', role: 'family', ask: 'Pay stubs, and 10% saved for a $220,000 house.', S: 'Needs 20% down: no loan.', N: 'Approved. Fannie Mae buys it.', L: 'Approved, along with everyone else. Nobody buys loose loans: you keep them.' },
  };
  // How selling a loan works, shown once on one loan (rule 50). Illustrative numbers ("say").
  const WALK = [
    ['officer', 'Here is how we make money. A couple borrows $200,000 from us for a house. That cash is now tied up in one loan.', 0],
    ['officer', 'So we sell the loan, say to Fannie Mae for $202,000. We get our cash back plus a $2,000 fee, and we can lend again.', 1],
    ['fannie', 'We pool it with thousands of others and sell bonds. A pension fund buys one and collects a share of every family’s monthly payment. We guarantee those payments.', 2],
    ['officer', 'Loans Fannie Mae won’t buy go to Wall Street instead, where a ratings agency grades the bonds and nobody guarantees them. One catch: we promise each loan meets the buyer’s rules. If it fails within months, the buyer can send it back.', 3],
  ];
  const card = (role, who, line, extra) => `<div class="pcard">${A.portrait(role, 60)}<div><p class="pwho">${esc(who)}</p><p class="pline">${line}</p>${extra || ''}</div></div>`;
  const M$ = (x) => (x < 0 ? '−$' : '$') + Math.abs(x) + ' million';
  const signed = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + '$' + Math.abs(x) + 'M';
  const pickVariant = () => { try { const a = new Uint32Array(1); root.crypto.getRandomValues(a); return a[0] % C.VARIANTS.length; } catch (e) { return Math.floor(Math.random() * C.VARIANTS.length); } };

  // ---------------- step 1: the lender's game ----------------
  M.showGame = function (main, s) {
    const L = S().log[s.id], t = M.task(s.id), YRS = C.YEARS;
    main.insertAdjacentHTML('beforeend', `<section class="game2" aria-labelledby="bt"><h2 id="bt" class="sr-only">${esc(s.label)}</h2>
      <div class="g2-stage on-ink" id="g2stage"><div class="g2-top"><span class="g2-year" id="stYear"></span><span class="tick" id="stTick" aria-live="polite"></span>
          <span class="spark-wrap" aria-hidden="true">House prices<svg class="spark" viewBox="0 0 150 34"><path id="sparkLine" fill="none" stroke="#F3F5F2" stroke-width="2"/><circle id="sparkDot" r="3" fill="#E4572E"/></svg></span>
          <button class="btn ghost small skipbtn" type="button" id="skipBtn" hidden>Skip</button></div>
        <div id="mach"></div><div class="rivalstrip" id="rival"></div>
        <div class="g2-race" id="race"></div></div>
      <div class="g2-side" id="side"><div class="g2-photo" id="photo"></div><div class="g2-scene" id="scene"></div><div class="g2-react" id="react" hidden></div></div></section>
      <div id="endBox"></div>
      <div class="work" id="g2after" hidden><div class="fb" id="fb" aria-live="polite"></div>${M.nextRow(s, !L.done)}<details class="small" style="margin-top:14px"><summary>Sources</summary><p>Financial Crisis Inquiry Commission, <a href="https://www.govinfo.gov/content/pkg/GPO-FCIC/pdf/GPO-FCIC.pdf" target="_blank" rel="noopener">The Financial Crisis Inquiry Report</a> (2011). The dollar figures and the people are made up; the events in each year are real. House prices: Federal Housing Finance Agency, via FRED (series HPIPONM226S).</p></details></div>`);
    M.wireNext(s);
    const mach = Machine($('#mach'), { cash: C.START_CASH }), rival = RivalStrip($('#rival'));
    const chart = priceChart(document.createElement('div'), $('.spark'));
    M.onLeave(() => { mach.destroy(); rival.destroy(); });
    let vi = 0, seq = '', phase = 'year', busy = false;
    const sim = () => C.gameSim(seq, vi), V = () => C.VARIANTS[vi], PR = () => C.PARAMS[vi].PROFIT;
    const tick = (txt) => { $('#stTick').textContent = txt || ''; };
    const narrow = () => root.innerWidth < 1100;
    const race = (r) => {
      const you = r ? r.cash : C.START_CASH, rv = r ? r.rcash : C.START_CASH, mx = Math.max(40, Math.abs(you), Math.abs(rv == null ? 0 : rv)), n = r ? r.trail : 0;
      const bar = (who, v, col) => `<div class="race-row"><span class="race-who">${who}</span><span class="race-bar"><i style="width:${v == null ? 0 : Math.max(1.5, 100 * Math.max(0, v) / mx)}%;background:${col}"></i></span><span class="race-v${v != null && v < 0 ? ' neg' : ''}">${v == null ? 'closed' : v < 0 ? 'bankrupt' : '$' + v + 'M'}</span></div>`;
      $('#race').innerHTML = `<div class="race-bars">${bar('You', you, K.gold)}${bar('Rival', rv, K.red)}</div><div class="patience" title="Years behind your rival">${A.board(n ? 'warn' : 'calm')}<p class="lamps">${[0, 1].map((k) => `<span class="lamp${k < n ? ' on' : ''}" aria-hidden="true"></span>`).join('')}<span>Years behind your rival: ${n}. At 2, you’re fired.</span></p></div>`;
    };
    const photo = (y) => { const ph = PHOTOS[y];
      $('#photo').innerHTML = `${ph ? `<img src="${ph.src}" alt="${esc(ph.alt)}" width="1200" height="400">` : ''}<div class="g2-photo-txt"><p class="g2-bigyear">${y}</p><p class="g2-news">${esc(C.NEWS[y])}</p></div>${ph ? `<p class="g2-credit">${esc(ph.credit)}</p>` : ''}`;
      $('#photo').classList.toggle('nophoto', !ph); const st = $('#g2stage'); st.style.setProperty("--bg", ph ? `url("${new URL(ph.src, root.location.href).href}")` : "none"); $('#stYear').textContent = y; };

    // The worked instance: one loan sold, step by step, on the machine (shown before the first year; skippable).
    async function walkthrough() {
      phase = 'walk'; photo(2002); race(null); tick('How your company makes money');
      for (let k = 0; k < WALK.length; k++) {
        const [role, line, step] = WALK[k];
        $('#scene').innerHTML = `${card(role, role === 'officer' ? WHO.officer : WHO.fannie, esc(line))}<div class="g2-go"><button class="btn run" type="button" id="wNext">${k < WALK.length - 1 ? 'Next' : 'Open for business'}</button><button class="btn ghost small" type="button" id="wSkip">Skip</button></div>`;
        mach.demo(step);
        const go = await new Promise((res) => { $('#wNext').addEventListener('click', () => res('next')); $('#wSkip').addEventListener('click', () => res('skip')); });
        if (go === 'skip') break;
      }
      mach.demo(-1); M.store.set(M.KEY + ':walked', 1); drawYear();
    }
    function drawYear() {
      const i = seq.length, y = YRS[i], prev = sim().rows[i - 1], ap = APP[y], [vr, vl] = VISIT[y](V());
      phase = 'year'; tick(''); $('#skipBtn').hidden = true; $('#react').hidden = true; $('#side').classList.remove('reacting'); photo(y); race(prev);
      const closed = prev && (prev.rcash == null || prev.rcash < 0);
      $('#scene').innerHTML = `${card(vr, WHO[vr], `“${esc(vl)}”`)}
        ${card(ap.role, `${WHO.officer}: an application`, `<b>${esc(ap.who)}.</b> ${esc(ap.ask)}`)}
        <div class="choices3" role="group" aria-label="Your lending standards for ${y}">${['S', 'N', 'L'].map((c) => `<button type="button" class="ch3 q${c}" data-c="${c}"><span class="ch3-h"><svg class="sw" viewBox="0 0 26 32" aria-hidden="true">${A.paper(c)}</svg><b>${C.NAME[c]}</b><span class="fee${PR()[c][i] < 0 ? ' neg' : ''}">${signed(PR()[c][i])}</span></span><span class="ch3-t">${esc(ap[c])}</span><span class="ch3-r">${c === 'L' ? (y >= 2007 ? 'Nobody is buying loose loans now.' : 'Sold to Wall Street, no guarantee. A loan that fails within months can be sent back to you.') : 'Sold to Fannie Mae, which guarantees the bonds.'}</span></button>`).join('')}</div>
        <p class="g2-hint">${closed ? 'Your rival is closed.' : `Your rival stays loose: ${signed(PR().L[i])} this year.`}</p>`;
      $$('.ch3').forEach((b) => b.addEventListener('click', () => run(b.dataset.c)));
      if (narrow() && i > 0) $('#side').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    }
    async function run(c) {
      if (busy) return; busy = true;
      seq += c; const S0 = sim(), r = S0.rows[S0.rows.length - 1], before = S0.rows.length > 1 ? S0.rows[S0.rows.length - 2].cash : C.START_CASH;
      phase = 'run'; $$('.ch3').forEach((b) => { b.disabled = true; b.classList.toggle('picked', b.dataset.c === c); });
      $('#skipBtn').hidden = reduced(); $('#skipBtn').onclick = () => { if (mach.skip) mach.skip(); };
      if (narrow() && !reduced()) $('#g2stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
      tick(`${r.year}: ${C.NAME[c].toLowerCase()}`);
      const bust = r.back > 0 || r.made < 0;
      chart.toYearEnd(r.year, bust ? 2200 : 2400);
      rival.run(r);
      const cfg = { choice: c, back: r.back, cashBefore: before, cashAfter: r.cash, bust: S0.ending && S0.ending.kind === 'bust' };
      if (bust) await mach.runBust(cfg, tick); else await mach.runYear(cfg);
      rival.finish(r); busy = false; $('#skipBtn').hidden = true; race(r);
      react(r, S0.ending && S0.ending.at === S0.rows.length - 1 ? S0.ending : null, S0);
    }
    // Consequences arrive as people.
    function react(r, end, S0) {
      phase = 'react'; const out = [];
      const did = (who, v) => (v < 0 ? `${who} lost ${M$(-v)}.` : `${who} earned ${M$(v)}.`);
      const nums = `${did('You', r.profit)}${r.rprofit == null ? ' Your rival is closed.' : ' ' + did('Your rival', r.rprofit)}`;
      if (r.back) out.push(card('wallst', WHO.wallst, `“These loans failed in their first months. They’re yours: ${M$(r.back)}.”`));
      if (r.rivalBust) out.push(card('rival', WHO.rival, '“The loans keep coming back and we can’t pay for them. We’re filing for bankruptcy.”'));
      if (r.year === 2007 && r.back) out.push(card('analyst', WHO.analyst, '“We’re downgrading the bonds we graded AAA.”'));
      if (end && end.kind === 'fired') out.push(card('chair', WHO.chair, `“Two years running behind them. The board has voted. We’re letting you go.”`));
      else if (end) out.push(card('chair', WHO.chair, '“There’s no cash left. We’re filing for bankruptcy.”'));
      else if (r.trail === 1) out.push(card('chair', WHO.chair, `“Your rival made ${M$(r.rprofit - r.profit)} more than we did. Fall behind again in ${r.year + 1} and you’re out.”`));
      else if (r.choice !== 'L' && r.rprofit != null && r.rprofit > r.profit) out.push(card('rival', WHO.rival, '“Saw your numbers. Want the phone number of my Wall Street buyer?”'));
      else if (r.choice === 'L' && !r.back) out.push(card('officer', WHO.officer, `“We approved the ${esc(APP[r.year].who.replace(/^A /, '').toLowerCase())} and everyone else who walked in. Wall Street bought every loan.”`));
      else out.push(card('chair', WHO.chair, '“We kept pace. Same again next year.”'));
      $('#react').innerHTML = `<p class="g2-nums">${nums}</p>${out.slice(0, 3).join('')}<div class="g2-go"><button class="btn run" type="button" id="goOn">${end ? 'See how it ended' : `Go to ${r.year + 1}`}</button></div>`;
      $('#react').hidden = false; $('#scene').innerHTML = ''; $('#side').classList.add('reacting'); $('#side').scrollTop = 0; tick(end ? (end.kind === 'fired' ? `Fired in ${end.year}` : `Bankrupt in ${end.year}`) : '');
      $('#goOn').addEventListener('click', () => (end ? drawEnd(true) : drawYear())); $('#goOn').focus({ preventScroll: true });
    }
    function drawEnd(fresh) {
      const S0 = sim(), e = S0.ending, E = C.ENDINGS[e.kind](e.year), riv = C.gameSim('LLLLLLL', vi).rows, rv = {}; riv.forEach((x) => { rv[x.year] = x; });
      const you = {}; S0.rows.forEach((x) => { you[x.year] = x; });
      phase = 'end'; $('#react').hidden = true; $('#side').hidden = true; $('.game2').classList.add('ended'); mach.redraw(true); chart.toYearEnd(2012);
      const peak = Math.max(C.START_CASH, ...S0.rows.map((x) => x.cash)), peakYr = (S0.rows.find((x) => x.cash === peak) || { year: 2002 }).year;
      const W = allGames(vi), mine = e.kind + e.year, maxN = Math.max(...W.map((w) => w.n));
      const hist = W.map((w) => `<li class="${w.key === mine ? 'you' : ''}"><span class="h-l">${w.kind === 'fired' ? 'Fired' : 'Bankrupt'} in ${w.year}</span><span class="h-b"><i style="width:${100 * w.n / maxN}%"></i></span><span class="h-n">${w.n}${w.key === mine ? ' <b>you</b>' : ''}</span></li>`).join('');
      const better = (a, b) => !b || a.year > b.year || (a.year === b.year && a.peak > b.peak);
      const me = { year: e.year, peak }, prevBest = M.store.get(M.KEY + ':best'), best = better(me, prevBest) ? me : prevBest; M.store.set(M.KEY + ':best', best);
      const top = W[W.length - 1], isTop = e.year === top.year && peak === top.peak;
      const goal = isTop ? `You found the best run this market allows: lasting until ${top.year} with a $${top.peak} million peak.` : `In this market the longest anyone lasts is ${top.year}, with at most $${top.peak} million on the way.${prevBest && best !== me ? ` Your best: ${best.year}, $${best.peak} million.` : ''}`;
      const maxAbs = Math.max(40, ...S0.rows.map((x) => Math.abs(x.profit))), bar = (v, col, dashed) => (v == null ? '<span class="pb-empty">closed</span>' : `<span class="pb${v < 0 ? ' neg' : ''}" style="--w:${Math.min(100, 100 * Math.abs(v) / maxAbs)}%;--c:${col}"${dashed ? ' data-d="1"' : ''}></span><span class="pv">${signed(v)}</span>`);
      const rowsHtml = YRS.map((y) => `<tr><th scope="row">${y}</th><td>${you[y] ? bar(you[y].profit, K.ink) : '<span class="pb-empty">gone</span>'}</td><td>${rv[y] ? bar(rv[y].rprofit, K.red, true) : '<span class="pb-empty">closed</span>'}</td></tr>`).join('');
      $('#endBox').innerHTML = `<div class="ending"><section><p class="kicker">How it ended</p><h2>${esc(E.title)}</h2>
          <div class="stats"><div><b>${e.year}</b><span>${e.kind === 'fired' ? 'the year the board fired you' : 'the year your cash ran out'}</span></div><div><b>$${peak}M</b><span>your peak cash, in ${peakYr}</span></div><div><b>${S0.rivalBust ? 'Bankrupt' : 'Still open'}</b><span>your rival${S0.rivalBust ? ', in ' + S0.rivalBust : ''}</span></div></div>
          <div class="actions"><button class="btn gold" type="button" id="share">Share your result</button><button class="btn ghost" type="button" id="again">Play again</button><span class="small" id="shareMsg" aria-live="polite"></span></div>
          <p class="goal">${esc(goal)} Each game deals a different market.</p>
          <p class="story">${esc(E.text)}</p>
          ${e.kind === 'fired' ? `<h3>What happened after you left</h3><ul>${YRS.filter((y) => y > e.year && C.AFTER[y]).map((y) => `<li><b>${y}:</b> ${esc(C.AFTER[y])}</li>`).join('')}</ul><div class="actions"><button class="btn ghost" type="button" id="coda">Watch 2007 on your rival’s line</button></div>` : ''}
          <h3>Who else lost money</h3><ul>${C.LOSERS.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
        <section><h3 style="margin-top:0">Every way this market can go</h3><ol class="hist">${hist}</ol>
          <h3>Profit by year</h3><table class="profitbars"><thead><tr><th scope="col">Year</th><th scope="col">You</th><th scope="col">Rival</th></tr></thead><tbody>${rowsHtml}</tbody></table>
          <div class="chartbox" id="chart2"></div></section></div>`;
      priceChart($('#chart2')).drawTo(156);
      $('#share').addEventListener('click', async () => {
        const txt = `The Mortgage Machine: I ran a mortgage lender from 2002 and was ${e.kind === 'fired' ? 'fired' : 'bankrupt'} by ${e.year}, after my cash peaked at $${peak} million. Nobody gets past 2008. How long can you last?`;
        const url = root.location.href.split(/[?#]/)[0];
        try { if (root.navigator.share) { await root.navigator.share({ title: 'The Mortgage Machine', text: txt, url }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
        try { await root.navigator.clipboard.writeText(txt + ' ' + url); $('#shareMsg').textContent = 'Copied. Paste it to a friend.'; } catch (err) { $('#shareMsg').textContent = txt + ' ' + url; }
      });
      $('#again').addEventListener('click', () => { vi = pickVariant(); seq = ''; $('#endBox').innerHTML = ''; $('#side').hidden = false; $('.game2').classList.remove('ended'); mach.reset({ cash: C.START_CASH }); mach.setLabel('Your company'); mach.setFamilies(6); rival.set({ cash: C.START_CASH, dark: false, closed: false }); drawYear(); $('.game2').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); });
      if ($('#coda')) $('#coda').addEventListener('click', async () => {
        const R = C.gameSim('LLLLLLL', vi).rows, before = R[4].rcash, after = R[5].rcash;
        $('#coda').disabled = true; tick('2007, on your rival’s line'); mach.reset({ cash: before }); mach.setLabel('Your rival');
        $('#g2stage').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
        await mach.runBust({ choice: 'L', back: R[5].rback, cashBefore: before, cashAfter: after, bust: true }, tick);
        tick('Your rival is bankrupt in 2007, as New Century was.'); $('#coda').disabled = false;
      });
      const res = C.judgeTask(t, { value: vi + ':' + seq }, M.h);
      if (res.ok) { const first = !L.done; L.value = vi + ':' + seq; if (first) L.attempts = Math.max(L.attempts || 0, 1); M.markDone(s.id); $('#g2after').hidden = false; $('#nextRow').hidden = false; M.showFb($('#fb'), 'ok', '<b>Saved.</b> ' + esc(C.praise(t))); }
      M.saveState();
      if (fresh) $('#endBox').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    }
    // reopen a finished game on its ending; anything else starts in 2002 (with the walkthrough the first time)
    const saved = L.value ? C.parseGame(L.value) : null, s0 = saved ? C.gameSim(saved.seq, saved.v) : null;
    if (saved && s0.ending && s0.ending.at === saved.seq.length - 1) {
      vi = saved.v; seq = saved.seq; const r = s0.rows[s0.rows.length - 1];
      if (s0.ending.kind === 'bust') mach.reset({ cash: r.cash, turned: true, gate: true, dark: 6, pile: 8 }); else mach.setCash(r.cash);
      rival.set({ cash: r.rcash == null ? -1 : r.rcash, dark: !!s0.rivalBust, closed: !!s0.rivalBust }); race(r); drawEnd(false);
    } else { vi = pickVariant(); if (M.store.get(M.KEY + ':walked')) drawYear(); else walkthrough(); }
    M.gameApi = { get seq() { return seq; }, get phase() { return phase; }, get variant() { return vi; }, setVariant: (v) => { vi = v; },
      pick: (c) => { const b = $(`.ch3[data-c="${c}"]`); if (b) b.click(); }, next: () => { const b = $('#goOn'); if (b) b.click(); }, skip: () => { if (mach.skip) mach.skip(); } };
  };
  const S = () => M.S;
  // All distinct games (played prefixes of the 2,187 plans), counted by ending. Computed once.
  const ALL = {};
  function allGames(vi) {
    vi = vi || 0; if (ALL[vi]) return ALL[vi]; const seen = new Map();
    for (let n = 0; n < 2187; n++) { let x = n, q = ''; for (let k = 0; k < 7; k++) { q += 'SNL'[x % 3]; x = Math.floor(x / 3); } const g = C.gameSim(q, vi); seen.set(q.slice(0, g.ending.at + 1), { en: g.ending, peak: Math.max(C.START_CASH, ...g.rows.map((r) => r.cash)) }); }
    const by = {}; seen.forEach(({ en, peak }) => { const k = en.kind + en.year; by[k] = by[k] || { key: k, kind: en.kind, year: en.year, n: 0, peak: 0 }; by[k].n++; by[k].peak = Math.max(by[k].peak, peak); });
    ALL[vi] = Object.values(by).sort((a, b) => a.year - b.year); return ALL[vi];
  }
  M.reg('every year has a visitor, an application with all three choices spelled out, and a portrait', () => { const bad = C.YEARS.filter((y) => { const v = VISIT[y](C.VARIANTS[0]), a = APP[y]; return !(v && WHO[v[0]] && v[1] && a && a.S && a.N && a.L && a.ask && A.portrait(v[0]).includes('<svg')); }); return !bad.length || { ok: false, detail: 'missing content for ' + bad.join(', ') }; });
  M.reg('the machine draws its belts and the investors', () => { const host = document.createElement('div'); host.style.width = '1200px'; document.body.appendChild(host); const m = Machine(host); const ok = host.querySelectorAll('path.belt').length === 3 && !!host.querySelector('#globe') && host.querySelector('#r_priv').getTotalLength() > 500; m.destroy(); host.remove(); return ok || { ok: false, detail: 'machine belts or routes missing' }; });
})(window);

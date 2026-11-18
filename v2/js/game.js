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
      { x: 752, y: 142, t: 'Government-backed: payments guaranteed', a: 'start', s: 14 },
      { x: 630, y: 506, t: 'Wall Street bank', a: 'middle', b: 1 },
      { x: 778, y: 342, t: 'Ratings agency', a: 'middle', s: 14 },
      { x: 862, y: 446, t: 'Private copy: no guarantee', a: 'middle', s: 14 },
      { x: 1100, y: 386, t: 'Investors', a: 'middle', b: 1 }, { x: 1100, y: 404, t: 'around the world', a: 'middle', s: 14 },
      { x: 640, y: 34, t: 'Money flows back: fees and cash for the loans you sell', a: 'middle', s: 14 },
      { x: 86, y: 136, t: 'Families', a: 'middle', s: 14 } ] };
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
        ${L.labels.map((l) => `<text x="${l.x}" y="${l.y}" text-anchor="${l.a}" font-family="Jost" font-weight="${l.b ? 600 : 400}" font-size="${l.s || 16}" fill="${l.b ? K.onInk : K.muted}">${esc(l.t)}</text>`).join('')}
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

  // ---------------- the dial: three detents, drag, tap or arrow keys ----------------
  function dial(host, value, onChange, fees) {
    const ANG = { S: -60, N: 0, L: 60 }, ORDER = ['S', 'N', 'L'];
    host.innerHTML = `<div class="dialbox"><svg class="dial" id="dialSvg" viewBox="0 0 150 150" aria-hidden="true">
        <circle cx="75" cy="80" r="62" fill="${K.ink}"/>${ORDER.map((c) => { const a = (ANG[c] - 90) * Math.PI / 180; return `<line x1="${75 + Math.cos(a) * 54}" y1="${80 + Math.sin(a) * 54}" x2="${75 + Math.cos(a) * 64}" y2="${80 + Math.sin(a) * 64}" stroke="${c === 'L' ? K.red : c === 'N' ? K.blue2 : K.blue}" stroke-width="6"/>`; }).join('')}
        <g id="knob"><circle cx="75" cy="80" r="44" fill="${K.ink3}" stroke="${K.onInk}" stroke-width="3"/><rect x="71" y="38" width="8" height="30" rx="3" fill="${K.gold}"/></g>
        <circle cx="75" cy="80" r="8" fill="${K.onInk}"/></svg>
      <div class="dial-opts" role="radiogroup" aria-label="Your lending standards">${C.OPTS.map(([c, n]) => `<button type="button" class="dial-opt" role="radio" data-c="${c}" aria-checked="${value === c}" tabindex="${value === c || (!value && c === 'S') ? 0 : -1}"><svg class="sw" viewBox="0 0 26 32" aria-hidden="true">${A.paper(c)}</svg><span class="dn">${n}</span>${fees ? `<span class="fee${fees[c] < 0 ? ' neg' : ''}"><span class="sr-only">, about </span>${fees[c] < 0 ? '−' : '+'}$${Math.abs(fees[c])}M<span class="sr-only"> from this year’s new loans</span></span>` : ''}</button>`).join('')}</div></div>
      <p class="dial-desc" id="dialDesc"></p>`;
    let v = value || null; const knob = host.querySelector('#knob');
    const set = (c, quiet) => { v = c; knob.style.transform = `rotate(${ANG[c]}deg)`; knob.style.transformOrigin = '75px 80px';
      host.querySelectorAll('.dial-opt').forEach((b) => { const on = b.dataset.c === c; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      host.querySelector('#dialDesc').textContent = C.OPTS.find((o) => o[0] === c)[2]; if (!quiet) Snd.tick(); onChange(c); };
    host.querySelectorAll('.dial-opt').forEach((b) => { b.addEventListener('click', () => set(b.dataset.c));
      b.addEventListener('keydown', (e) => { const i = ORDER.indexOf(b.dataset.c); let j = null; if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = Math.min(2, i + 1); if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = Math.max(0, i - 1);
        if (j != null) { e.preventDefault(); set(ORDER[j]); host.querySelector(`.dial-opt[data-c="${ORDER[j]}"]`).focus(); } }); });
    const sv = host.querySelector('#dialSvg');
    sv.addEventListener('pointerdown', (e) => { sv.setPointerCapture(e.pointerId); const turn = (ev) => { const r = sv.getBoundingClientRect(), a = Math.atan2(ev.clientY - (r.top + r.height * 80 / 150), ev.clientX - (r.left + r.width / 2)) * 180 / Math.PI + 90;
        const c = a < -30 ? 'S' : a > 30 ? 'L' : 'N'; if (c !== v) set(c); }; turn(e); sv.addEventListener('pointermove', turn); const up = () => { sv.removeEventListener('pointermove', turn); sv.removeEventListener('pointerup', up); }; sv.addEventListener('pointerup', up); });
    if (v) set(v, true); else { knob.style.transform = 'rotate(0deg)'; host.querySelector('#dialDesc').textContent = fees ? 'Turn the dial. The figures are what this year’s new loans will earn you.' : 'Turn the dial, or choose strict, normal or loose.'; }
    return { get value() { return v; } };
  }

  // ---------------- step 10: the lender's game ----------------
  const M$ = (x) => (x < 0 ? '−$' : '$') + Math.abs(x) + ' million';
  const signed = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + '$' + Math.abs(x) + 'M';
  M.showGame = function (main, s) {
    const L = S().log[s.id], t = M.task(s.id), YRS = C.YEARS, P = C.PROBLEM.game(t);
    main.insertAdjacentHTML('beforeend', `<section class="game" aria-labelledby="bt"><div class="game-grid">
      <div class="g-left"><div class="stage on-ink g-stage"><div class="stage-in"><div class="stage-top"><span class="tick" id="stTick" aria-live="polite"></span><span class="spark-wrap" aria-hidden="true">House prices<svg class="spark" viewBox="0 0 150 34"><path id="sparkLine" fill="none" stroke="#F3F5F2" stroke-width="2"/><circle id="sparkDot" r="3" fill="#E4572E"/></svg></span><button class="btn ghost small skipbtn" type="button" id="skipBtn" hidden>Skip to the result</button></div>
        <div id="mach"></div><div class="rivalstrip" id="rival"></div></div></div>
        <section class="score-col" id="scoreCol"><div id="boardBox"></div><div id="scoreBox"></div><div class="chartbox" id="chart"></div></section></div>
      <div class="g-side"><div class="g-head" id="gHead"><p class="kicker">Step ${M.stepIdx(s.id) + 1} of ${M.D.STEPS.length}: ${esc(s.label)}</p><p class="place">${esc(P.place)}</p><p class="ask">${P.body}</p></div>
        <div class="game-hud" id="hud"><section class="news-col" id="newsCol"></section><section class="ctl-col" id="ctlCol"></section></div></div></div>
      <h2 id="bt" class="sr-only">${esc(s.label)}</h2><div id="endBox"></div>
      <div class="work" style="padding-top:8px"><div class="fb" id="fb" aria-live="polite"></div>${M.nextRow(s, !L.done)}<details class="small" style="margin-top:14px"><summary>Sources</summary><p>Financial Crisis Inquiry Commission, <a href="https://www.govinfo.gov/content/pkg/GPO-FCIC/pdf/GPO-FCIC.pdf" target="_blank" rel="noopener">The Financial Crisis Inquiry Report</a> (2011). The game’s dollar figures are made up; the events in each year are real. House prices: Federal Housing Finance Agency, via FRED (series HPIPONM226S). Photographs: credited under each one.</p></details></div></section>`);
    M.wireNext(s);
    const mach = Machine($('#mach'), { cash: C.START_CASH }), rival = RivalStrip($('#rival')), chart = priceChart($('#chart'), $('.spark'));
    M.onLeave(() => { mach.destroy(); rival.destroy(); });
    let seq = '', phase = 'year', pick = null, busy = false;
    const sim = () => C.gameSim(seq);
    const tick = (txt) => { $('#stTick').textContent = txt || ''; };
    // The cash race: you against the rival, one bar each, scaled to the larger.
    const race = (r) => {
      const you = r ? r.cash : C.START_CASH, rv = r ? r.rcash : C.START_CASH, mx = Math.max(40, Math.abs(you), Math.abs(rv == null ? 0 : rv));
      const bar = (who, v, col, prof) => `<div class="race-row"><span class="race-who">${who}</span><span class="race-bar"><i style="width:${v == null ? 0 : Math.max(1.5, 100 * Math.max(0, v) / mx)}%;background:${col}"></i></span>
        <span class="race-v${v != null && v < 0 ? ' neg' : ''}">${v == null ? 'closed' : v < 0 ? 'bankrupt' : '$' + v + 'M'}</span><span class="race-p">${prof == null ? '' : signed(prof) + ' this year'}</span></div>`;
      return `<h3 class="race-h">Cash on hand</h3>${bar('You', you, K.ink, r ? r.profit : null)}${bar('Rival', rv, K.red, r ? r.rprofit : null)}`;
    };
    // The board's patience: two lamps, one lit for each year in a row behind the rival.
    const patience = (r) => {
      const n = r ? r.trail : 0, lamps = [0, 1].map((k) => `<span class="lamp${k < n ? ' on' : ''}" aria-hidden="true"></span>`).join('');
      const txt = n === 0 ? (r ? (r.rprofit != null && r.profit >= r.rprofit ? 'The board is pleased: you kept pace with your rival.' : 'The board is watching.') : 'The board compares your profit with your rival’s every year. Two years in a row behind, and you are out.')
        : `“Your rival made ${M$(r.rprofit - r.profit)} more than you. Fall behind again in ${r.year + 1} and you are out.”`;
      return `<div class="board${n ? ' warn' : ''}">${A.board(n ? 'warn' : 'calm')}<div><p class="lamps">${lamps}<span>Years behind your rival: ${n} of 2</span></p><p>${txt}</p></div></div>`;
    };
    const lastYear = (r) => {
      if (!r) return '';
      const mine = r.made >= 0 ? `Your new loans earned ${M$(r.made)}.` : `Nobody will buy loose loans now, so you are stuck with this year’s: ${M$(r.made)}.`;
      const theirs = r.rmade === null ? 'Your rival is closed.' : r.rmade >= 0 ? `Your rival’s new loans earned ${M$(r.rmade)}.` : 'Your rival is stuck with its loose loans too.';
      return `<div class="lastyear"><p><b>${r.year}, ${C.NAME[r.choice].toLowerCase()}.</b> ${mine} ${theirs}</p>${r.back ? `<p class="result back">Bad loans sent back to you: ${M$(-r.back)}. Buyers can return loans that fail within months or broke their rules.</p>` : ''}${r.rivalBust ? '<p class="result">Your rival is bankrupt.</p>' : ''}</div>`;
    };
    const newsFor = (y) => { const ph = PHOTOS[y];
      return `<div class="masthead${ph ? ' has-photo' : ''}">${ph ? `<img src="${ph.src}" alt="${esc(ph.alt)}" width="1200" height="400">` : ''}<p class="year">${y}</p></div>
        ${ph ? `<p class="credit">${esc(ph.credit)}</p>` : ''}<p class="newsline">${esc(C.NEWS[y])}</p>${y === 2002 ? `<p class="small" style="margin:6px 0 0">You and your rival each start with $${C.START_CASH} million in cash.</p>` : ''}`; };
    // One screen per year: what last year did, the news, the board's patience, the dial with this year's fees, Run.
    function drawYear() {
      const i = seq.length, y = YRS[i], prev = sim().rows[i - 1];
      phase = 'year'; pick = null; tick(`${y}: set your standards, then run the year.`); $('#gHead').hidden = i > 0; $('#skipBtn').hidden = true;
      $('#newsCol').innerHTML = lastYear(prev) + newsFor(y);
      const fees = { S: C.PROFIT.S[i], N: C.PROFIT.N[i], L: C.PROFIT.L[i] };
      $('#ctlCol').innerHTML = `${patience(prev)}<p class="ctl-h">Set your standards for ${y}</p><div id="dialHost"></div>
        <p class="rivalnote">${prev && (prev.rcash == null || prev.rcash < 0) ? 'Your rival is closed.' : `Your rival stays loose: about ${M$(C.PROFIT.L[i])} from its new loans this year.`}</p>
        <div class="runrow"><button class="btn run" type="button" id="runBtn" disabled>Run ${y}</button></div>`;
      dial($('#dialHost'), null, (c) => { pick = c; $('#runBtn').disabled = false; }, fees);
      $('#runBtn').addEventListener('click', run);
      $('#boardBox').innerHTML = ''; $('#scoreBox').innerHTML = race(prev);
      chart.toYearEnd(y - 1);
    }
    async function run() {
      if (busy || !pick) return; busy = true;
      seq += pick; const S0 = sim(), r = S0.rows[S0.rows.length - 1], before = S0.rows.length > 1 ? S0.rows[S0.rows.length - 2].cash : C.START_CASH;
      phase = 'run'; $('#runBtn').disabled = true; $('#skipBtn').hidden = reduced();
      if (root.innerWidth < 1100 && !reduced()) $('#mach').scrollIntoView({ behavior: 'smooth', block: 'start' });
      tick(`${r.year}: ${C.NAME[r.choice].toLowerCase()}`);
      $('#skipBtn').onclick = () => { if (mach.skip) mach.skip(); };
      const bust = r.back > 0 || r.made < 0;
      chart.toYearEnd(r.year, bust ? 2200 : 2400);
      rival.run(Object.assign({}, r, { rivalBust: r.rivalBust }));
      const cfg = { choice: r.choice, back: r.back, cashBefore: before, cashAfter: r.cash, bust: S0.ending && S0.ending.kind === 'bust' };
      if (bust) await mach.runBust(cfg, tick); else await mach.runYear(cfg);
      rival.finish(r); busy = false; $('#skipBtn').hidden = true;
      const end = S0.ending && S0.ending.at === S0.rows.length - 1 ? S0.ending : null;
      if (!end) { drawYear(); if (root.innerWidth < 1100) $('#newsCol').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); $('#dialHost .dial-opt').focus({ preventScroll: true }); return; }
      // the ending gets a pause: what this year did, the board, then the way on
      tick(end.kind === 'fired' ? `Fired in ${end.year}` : `Bankrupt in ${end.year}`);
      $('#newsCol').innerHTML = lastYear(r);
      $('#ctlCol').innerHTML = `${A.board ? `<div class="board warn">${A.board('out')}<p>${end.kind === 'fired' ? `The board fires you in ${end.year}: two years in a row behind your rival.` : 'There is no money left to pay anyone.'}</p></div>` : ''}
        <div class="runrow"><button class="btn run" type="button" id="goOn">See how it ended</button></div>`;
      $('#scoreBox').innerHTML = race(r);
      $('#goOn').addEventListener('click', () => drawEnd(true)); $('#goOn').focus({ preventScroll: true });
    }
    function drawEnd(fresh) {
      const S0 = sim(), e = S0.ending, E = C.ENDINGS[e.kind](e.year), riv = C.gameSim('LLLLLLL').rows, rv = {}; riv.forEach((x) => { rv[x.year] = x; });
      const you = {}; S0.rows.forEach((x) => { you[x.year] = x; });
      phase = 'end'; $('#hud').hidden = true; $('#gHead').hidden = true; $('#scoreCol').hidden = true; $('.game-grid').classList.add('ended'); mach.redraw(true); chart.toYearEnd(2012);
      // the profit-by-year chart: paired bars, you and the rival, one row per year
      const maxAbs = 40, bar = (v, col, dashed) => v == null ? '<span class="pb-empty">closed</span>' : `<span class="pb${v < 0 ? ' neg' : ''}" style="--w:${Math.min(100, 100 * Math.abs(v) / maxAbs)}%;--c:${col}"${dashed ? ' data-d="1"' : ''}></span><span class="pv">${signed(v)}</span>`;
      const rowsHtml = YRS.map((y) => `<tr><th scope="row">${y}</th><td>${you[y] ? bar(you[y].profit, K.ink) + (e.year === y ? ` <b>${e.kind === 'fired' ? 'fired' : 'bankrupt'}</b>` : '') : '<span class="pb-empty">gone</span>'}</td><td>${rv[y] ? bar(rv[y].rprofit, K.red, true) + (rv[y].rivalBust ? ' <b>bankrupt</b>' : '') : '<span class="pb-empty">closed</span>'}</td></tr>`).join('');
      const peak = Math.max(C.START_CASH, ...S0.rows.map((x) => x.cash)), peakYr = (S0.rows.find((x) => x.cash === peak) || { year: 2002 }).year;
      // every different game there is (2,187 plans, 263 distinct games), grouped by how it ends: there is no winning row
      const W = allGames(), mine = e.kind + e.year, maxN = Math.max(...W.map((w) => w.n));
      const hist = W.map((w) => `<li class="${w.key === mine ? 'you' : ''}"><span class="h-l">${w.kind === 'fired' ? 'Fired' : 'Bankrupt'} in ${w.year}</span><span class="h-b"><i style="width:${100 * w.n / maxN}%"></i></span><span class="h-n">${w.n}${w.key === mine ? ' <b>you</b>' : ''}</span></li>`).join('');
      // a reason to play again: your best run in this browser, and the best run there is (last longest, then most cash)
      const better = (a, b) => !b || a.year > b.year || (a.year === b.year && a.peak > b.peak);
      const me = { year: e.year, peak, kind: e.kind }, prevBest = M.store.get(M.KEY + ':best'); const best = better(me, prevBest) ? me : prevBest; M.store.set(M.KEY + ':best', best);
      const top = W[W.length - 1], isTop = e.year === top.year && peak === top.peak;
      const goal = isTop ? `You found the best run there is: lasting until ${top.year} with a $${top.peak} million peak.`
        : `The longest anyone can last is ${top.year}, and the most cash anyone holds on the way there is $${top.peak} million. ${best === me && prevBest ? 'This is your best run so far.' : prevBest ? `Your best so far: ${best.year}, with a $${best.peak} million peak.` : ''}`;
      $('#endBox').innerHTML = `<div class="ending"><section><p class="kicker">How it ended</p><h2>${esc(E.title)}</h2>
          <div class="stats"><div><b>${e.year}</b><span>${e.kind === 'fired' ? 'the year the board fired you' : 'the year your cash ran out'}</span></div><div><b>$${peak}M</b><span>your peak cash, in ${peakYr}</span></div><div><b>${S0.rivalBust ? 'Bankrupt' : 'Still open'}</b><span>your rival${S0.rivalBust ? ', in ' + S0.rivalBust : ` in ${e.year}`}</span></div></div>
          <div class="actions"><button class="btn gold" type="button" id="share">Share your result</button><button class="btn ghost" type="button" id="again">Play again</button><span class="small" id="shareMsg" aria-live="polite"></span></div>
          <p class="goal">${esc(goal)}</p>
          <p class="story">${esc(E.text)}</p>
          ${e.kind === 'fired' ? `<h3>What happened after you left</h3><ul>${YRS.filter((y) => y > e.year && C.AFTER[y]).map((y) => `<li><b>${y}:</b> ${esc(C.AFTER[y])}</li>`).join('')}</ul><div class="actions"><button class="btn ghost" type="button" id="coda">Watch 2007 on your rival’s line</button></div>` : ''}
          <h3>Who else lost money</h3><ul>${C.LOSERS.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="small">Your choices: ${S0.rows.map((x) => `${x.year} ${C.NAME[x.choice].toLowerCase()}`).join(', ')}.</p></section>
        <section><h3 style="margin-top:0">Every way this game can go</h3><ol class="hist">${hist}</ol>
          <p class="small">There are ${W.reduce((a, w) => a + w.n, 0)} different ways to play from 2002. Every one of them ends in one of these six rows.</p>
          <h3>Profit by year</h3><table class="profitbars"><thead><tr><th scope="col">Year</th><th scope="col">You</th><th scope="col">Rival</th></tr></thead><tbody>${rowsHtml}</tbody></table>
          <div class="chartbox" id="chart2"></div></section></div>`;
      $('#share').addEventListener('click', async () => {
        const txt = `The Mortgage Machine: I ran a mortgage lender from 2002 and was ${e.kind === 'fired' ? 'fired' : 'bankrupt'} by ${e.year}, after my cash peaked at $${peak} million. The best run there is lasts until ${top.year} with a $${top.peak} million peak. Can you find it?`;
        const url = root.location.href.split(/[?#]/)[0];
        try { if (root.navigator.share) { await root.navigator.share({ title: 'The Mortgage Machine', text: txt, url }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
        try { await root.navigator.clipboard.writeText(txt + ' ' + url); $('#shareMsg').textContent = 'Copied. Paste it to a friend.'; } catch (err) { $('#shareMsg').textContent = txt + ' ' + url; }
      });
      priceChart($('#chart2')).drawTo(156);
      $('#again').addEventListener('click', () => { seq = ''; $('#endBox').innerHTML = ''; $('#hud').hidden = false; $('#gHead').hidden = false; $('#scoreCol').hidden = false; $('.game-grid').classList.remove('ended'); mach.reset({ cash: C.START_CASH }); mach.setLabel('Your company'); mach.setFamilies(6); rival.set({ cash: C.START_CASH, dark: false, closed: false }); drawYear(); $('#mach').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); });
      if ($('#coda')) $('#coda').addEventListener('click', async () => {
        $('#coda').disabled = true; tick('2007, on your rival’s line'); mach.reset({ cash: 169 }); mach.setLabel('Your rival');
        $('#mach').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
        await mach.runBust({ choice: 'L', back: 250, cashBefore: 169, cashAfter: -111, bust: true }, tick);
        tick('Your rival is bankrupt in 2007, as New Century was.'); $('#coda').disabled = false;
      });
      // finishing the game, either way, completes the step (the autosave the v1 engine did)
      const v = seq; const res = C.judgeTask(t, { value: v }, M.h);
      if (res.ok) { const first = !L.done; L.value = v; if (first) L.attempts = Math.max(L.attempts || 0, 1); M.markDone(s.id); $('#nextRow').hidden = false; M.showFb($('#fb'), 'ok', '<b>Saved.</b> ' + esc(C.praise(t))); }
      M.saveState();
      if (fresh) $('#endBox').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    }
    // reopen a finished game on its ending; anything else starts in 2002
    const saved = L.value ? String(L.value) : '', s0 = C.gameSim(saved);
    if (saved && s0.ending && s0.ending.at === saved.length - 1) {
      seq = saved; const r = s0.rows[s0.rows.length - 1];
      mach.setCash(r.cash); if (s0.ending.kind === 'bust') { mach.reset({ cash: r.cash, turned: true, gate: true, dark: 6, pile: 8 }); } rival.set({ cash: r.rcash == null ? -1 : r.rcash, dark: !!s0.rivalBust, closed: !!s0.rivalBust });
      drawEnd(false);
    } else drawYear();
    M.gameApi = { get seq() { return seq; }, get phase() { return phase; }, pick: (c) => { const b = $(`.dial-opt[data-c="${c}"]`); if (b) b.click(); }, run: () => run(), skip: () => { if (mach.skip) mach.skip(); } };
  };
  const S = () => M.S;
  // All distinct games (played prefixes of the 2,187 plans), counted by ending. Computed once.
  let ALL = null;
  function allGames() {
    if (ALL) return ALL; const seen = new Map();
    for (let n = 0; n < 2187; n++) { let x = n, q = ''; for (let k = 0; k < 7; k++) { q += 'SNL'[x % 3]; x = Math.floor(x / 3); } const g = C.gameSim(q); seen.set(q.slice(0, g.ending.at + 1), { en: g.ending, peak: Math.max(C.START_CASH, ...g.rows.map((r) => r.cash)) }); }
    const by = {}; seen.forEach(({ en, peak }) => { const k = en.kind + en.year; by[k] = by[k] || { key: k, kind: en.kind, year: en.year, n: 0, peak: 0 }; by[k].n++; by[k].peak = Math.max(by[k].peak, peak); });
    ALL = Object.values(by).sort((a, b) => a.year - b.year); return ALL;
  }
  M.reg('the machine draws its belts and the investors', () => { const host = document.createElement('div'); host.style.width = '1200px'; document.body.appendChild(host); const m = Machine(host); const ok = host.querySelectorAll('path.belt').length === 3 && !!host.querySelector('#globe') && host.querySelector('#r_priv').getTotalLength() > 500; m.destroy(); host.remove(); return ok || { ok: false, detail: 'machine belts or routes missing' }; });
})(window);

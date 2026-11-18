/* The Mortgage Machine: Isotype pictograms (after Gerd Arntz: flat silhouettes, no faces, one color per meaning).
   Every function returns SVG markup positioned with translate/scale, so the scenes in app.js compose them freely. */
(function (root) {
  'use strict';
  const K = { ink: '#1B2A41', ink2: '#26385A', ink3: '#34496E', line: '#4A5F83', paper: '#EDF0EE', sheet: '#FFFFFF', onInk: '#F3F5F2', muted: '#AFBBCB',
    green: '#2E8B6A', gold: '#E9A825', goldDeep: '#B97F0B', blue: '#4C7FCC', blue2: '#9DBDEB', red: '#E4572E', redDeep: '#B03515' };
  const at = (x, y, s, inner, extra) => `<g transform="translate(${x} ${y})${s && s !== 1 ? ` scale(${s})` : ''}"${extra || ''}>${inner}</g>`;

  // A person, 20 wide and 50 tall at scale 1 (Arntz's figure: round head, square shoulders, no face).
  const PERSON = '<circle cx="10" cy="6.5" r="6.2"/><path d="M1.5 15.5h17l-1.6 17.5h-2.4v16.5h-4v-16.5h-1v16.5h-4v-16.5h-2.4z"/>';
  const person = (x, y, s, fill) => at(x, y, s, `<g fill="${fill || K.onInk}">${PERSON}</g>`);
  // A family: two adults and a child, 52 wide, 50 tall.
  const family = (x, y, s, fill) => at(x, y, s, `<g fill="${fill || K.onInk}">${PERSON}<g transform="translate(19 0)">${PERSON}</g><g transform="translate(38 16) scale(.68)">${PERSON}</g></g>`);
  // A seated board member, 24 wide, 40 tall.
  const seated = (x, y, s, fill, stand) => at(x, y, s, stand
    ? `<g fill="${fill}"><circle cx="12" cy="6" r="6"/><path d="M3 14h18l-1.5 15h-2.5v11h-4v-11h-2v11h-4v-11h-2.5z"/></g>`
    : `<g fill="${fill}"><circle cx="12" cy="12" r="6"/><path d="M3 20h18v14h-18z"/></g>`);

  // A house, 100 wide and 90 tall.
  function house(x, y, s, o) {
    o = o || {};
    const body = o.body || K.onInk, roof = o.roof || body, door = o.door || K.ink;
    return at(x, y, s, `<path d="M-2 42 L50 0 L102 42 Z" fill="${roof}"/><rect x="10" y="40" width="80" height="50" fill="${body}"/>
      <rect x="42" y="60" width="16" height="30" fill="${door}"/><rect x="18" y="52" width="16" height="14" fill="${door}" opacity=".75"/><rect x="66" y="52" width="16" height="14" fill="${door}" opacity=".75"/>`);
  }
  const HOUSE_PATH = 'M-2 42 L50 0 L102 42 L90 42 L90 90 L10 90 L10 42 Z';

  // A coin seen edge-on in a stack (ellipse), or face-on.
  const coinEdge = (cx, cy, w, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${w * 0.17}" fill="${fill || K.gold}" stroke="${K.goldDeep}" stroke-width="1.4"/>`;
  const coin = (cx, cy, r, o) => { o = o || {};
    return `<g${o.cls ? ` class="${o.cls}"` : ''}><circle cx="${cx}" cy="${cy}" r="${r}" fill="${o.fill || K.gold}" stroke="${o.stroke || K.goldDeep}" stroke-width="${Math.max(1, r * 0.12)}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.66}" fill="none" stroke="${o.stroke || K.goldDeep}" stroke-width="${Math.max(.8, r * 0.07)}" opacity=".7"/>${r >= 8 ? `<text x="${cx}" y="${cy + r * 0.36}" text-anchor="middle" font-family="Jost, sans-serif" font-weight="700" font-size="${r * 1.05}" fill="${o.stroke || K.goldDeep}">$</text>` : ''}</g>`; };

  // A loan paper, 26 x 32. Sound loans carry a pay-stub tab (proof of income) and a solid edge; loose loans have a
  // dashed edge, no tab and a question mark. Color and shape both say which (nothing by color alone).
  function paper(q, o) {
    o = o || {};
    const fill = q === 'S' ? K.blue : q === 'N' ? K.blue2 : K.red;
    const sound = q !== 'L';
    return `<g class="paper q${q}"><path d="M0 0h18l8 8v24h-26z" fill="${fill}" stroke="${K.ink}" stroke-width="1.6"${sound ? '' : ' stroke-dasharray="3 2.2"'}/>
      <path d="M18 0v8h8" fill="none" stroke="${K.ink}" stroke-width="1.4"/>
      ${sound ? `<rect x="4" y="12" width="14" height="2.4" fill="${K.ink}"/><rect x="4" y="17" width="18" height="2.4" fill="${K.ink}"/><rect x="14" y="24" width="15" height="9" rx="1" fill="${K.sheet}" stroke="${K.ink}" stroke-width="1.3"/><path d="M17 28.5h9" stroke="${K.ink}" stroke-width="1.4"/>`
        : `<text x="12" y="25" text-anchor="middle" font-family="Jost, sans-serif" font-weight="700" font-size="17" fill="${K.ink}">?</text>`}
      ${o.stamp ? `<g class="stamp"><rect x="-6" y="7" width="38" height="14" fill="none" stroke="${K.gold}" stroke-width="2" transform="rotate(-12 13 14)"/><text x="13" y="18.5" text-anchor="middle" font-family="Jost, sans-serif" font-weight="700" font-size="11" fill="${K.gold}" transform="rotate(-12 13 14)">AAA</text></g>` : ''}
      ${o.back ? `<g class="sentback"><rect x="-10" y="9" width="46" height="13" fill="${K.ink}" stroke="${K.red}" stroke-width="1.5" transform="rotate(8 13 15)"/><text x="13" y="19" text-anchor="middle" font-family="Jost, sans-serif" font-weight="700" font-size="8.6" fill="${K.onInk}" transform="rotate(8 13 15)">SENT BACK</text></g>` : ''}</g>`;
  }

  // Your lender's office, 150 x 160: a flat-roofed block with a sign and six windows (lit gold while it has cash).
  function office(x, y, w, h, label, idp) {
    const bodyH = h - 24, ww = (w - 50) / 3, wh = Math.max(4, bodyH * 0.2), rows = [y + 24 + bodyH * 0.14, y + 24 + bodyH * 0.14 + wh + bodyH * 0.1];
    let win = '';
    rows.forEach((ry, r) => [0, 1, 2].forEach((c) => { win += `<rect class="win" id="${idp}w${r * 3 + c}" x="${x + 14 + c * (ww + 11)}" y="${ry}" width="${ww}" height="${wh}" fill="${K.gold}"/>`; }));
    const dh = Math.min(34, bodyH * 0.3);
    return `<g class="office" id="${idp}"><rect x="${x}" y="${y + 24}" width="${w}" height="${bodyH}" fill="${K.ink3}" stroke="${K.onInk}" stroke-width="2"/>
      ${label ? `<rect x="${x + 10}" y="${y}" width="${w - 20}" height="26" fill="${K.onInk}"/><text x="${x + w / 2}" y="${y + 18.5}" text-anchor="middle" font-family="Jost, sans-serif" font-weight="600" font-size="15" fill="${K.ink}">${label}</text>` : `<rect x="${x + 6}" y="${y + 14}" width="${w - 12}" height="10" fill="${K.onInk}"/>`}
      ${win}<rect x="${x + w / 2 - Math.min(14, w * 0.12)}" y="${y + h - dh}" width="${Math.min(28, w * 0.24)}" height="${dh}" fill="${K.ink}"/></g>`;
  }
  // Fannie Mae and Freddie Mac's press: a heavy block with a stamping arm and a round guarantee seal.
  function press(x, y, w, h) {
    // a frame (two posts and a beam), a ram that stamps down onto a bed, and the guarantee seal on the frame
    const pw = w * 0.1;
    return `<g class="press"><rect x="${x}" y="${y}" width="${w}" height="${h * 0.16}" fill="${K.onInk}"/>
      <rect x="${x + w * 0.06}" y="${y}" width="${pw}" height="${h}" fill="${K.onInk}"/><rect x="${x + w * 0.84}" y="${y}" width="${pw}" height="${h}" fill="${K.onInk}"/>
      <g class="ram"><rect x="${x + w * 0.44}" y="${y + h * 0.16}" width="${w * 0.12}" height="${h * 0.28}" fill="${K.muted}"/><rect x="${x + w * 0.24}" y="${y + h * 0.42}" width="${w * 0.52}" height="${h * 0.12}" fill="${K.muted}"/></g>
      <rect x="${x + w * 0.16}" y="${y + h * 0.8}" width="${w * 0.68}" height="${h * 0.1}" fill="${K.ink3}" stroke="${K.onInk}" stroke-width="1.5"/>
      <g transform="translate(${x + w * 0.11} ${y + h * 0.08})"><circle r="${Math.min(24, h * 0.22)}" fill="${K.green}" stroke="${K.onInk}" stroke-width="2"/><circle r="${Math.min(18, h * 0.165)}" fill="none" stroke="${K.onInk}" stroke-width="1.2" stroke-dasharray="2 2"/>
      <path transform="scale(${Math.min(1, h / 110)})" d="M0 -11 L3.2 -3.5 L11 -3.5 L4.8 1.6 L7 9.5 L0 4.8 L-7 9.5 L-4.8 1.6 L-11 -3.5 L-3.2 -3.5Z" fill="${K.onInk}"/></g></g>`;
  }
  // A bond on the belt, 30 x 22: a certificate with coupons. Government-backed ones carry the green seal; private ones
  // carry the agency's AAA once stamped.
  function bondChip(kind) {
    const gov = kind === 'gov';
    return `<g class="bondchip"><rect x="0" y="4" width="30" height="22" rx="1.5" fill="${K.sheet}" stroke="${K.ink}" stroke-width="1.6"/><path d="M4 21h4M10 21h4M16 21h4M22 21h4" stroke="${K.ink}" stroke-width="2"/>
      ${gov ? `<circle cx="22" cy="11" r="5" fill="${K.green}"/>` : `<rect x="3" y="8" width="16" height="3" fill="${K.red}"/>`}
      ${kind === 'aaa' ? `<g transform="rotate(-10 15 13)"><rect x="5" y="7" width="22" height="11" fill="${K.ink}"/><text x="16" y="15.6" text-anchor="middle" font-family="Jost, sans-serif" font-weight="700" font-size="8.5" fill="${K.gold}">AAA</text></g>` : ''}</g>`;
  }
  // A Wall Street bank: pediment, four columns, steps.
  function bank(x, y, w, h, fill) {
    const f = fill || K.onInk, cw = w * 0.1, gap = (w - 20 - 4 * cw) / 3; let cols = '';
    for (let i = 0; i < 4; i++) cols += `<rect x="${x + 10 + i * (cw + gap)}" y="${y + h * 0.36}" width="${cw}" height="${h * 0.48}" fill="${f}"/>`;
    return `<g class="bank"><path d="M${x} ${y + h * 0.3} L${x + w / 2} ${y} L${x + w} ${y + h * 0.3}Z" fill="${f}"/><rect x="${x + 4}" y="${y + h * 0.29}" width="${w - 8}" height="${h * 0.06}" fill="${f}"/>${cols}
      <rect x="${x}" y="${y + h * 0.85}" width="${w}" height="${h * 0.07}" fill="${f}"/><rect x="${x - 6}" y="${y + h * 0.93}" width="${w + 12}" height="${h * 0.07}" fill="${f}"/></g>`;
  }
  // The ratings agency: a small booth with a stamp that prints AAA.
  function booth(x, y, s) {
    return at(x, y, s, `<rect x="0" y="34" width="70" height="36" fill="${K.ink3}" stroke="${K.onInk}" stroke-width="2"/>${person(24, -6, 0.86, K.onInk)}
      <g class="stamper"><rect x="44" y="6" width="8" height="18" fill="${K.onInk}"/><rect x="38" y="22" width="20" height="9" fill="${K.gold}"/></g>
      <text x="35" y="58" text-anchor="middle" font-family="Jost, sans-serif" font-weight="700" font-size="15" fill="${K.gold}">AAA</text>`);
  }
  // Investors around a small globe.
  function globe(cx, cy, r, idp) {
    let figs = '';
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.15 + 0.7 * i / (n - 1)) + Math.PI; const fx = cx + Math.cos(a) * (r + 22), fy = cy + Math.sin(a) * (r + 22);
      figs += `<g class="inv inv${i < n / 2 ? 'a' : 'b'}" transform="translate(${fx - 7} ${fy - 17})"><g class="flip" style="transform-origin:7px 17px">${person(0, 0, 0.68, K.muted)}</g></g>`;
    }
    return `<g id="${idp}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${K.ink2}" stroke="${K.onInk}" stroke-width="2"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.45}" ry="${r}" fill="none" stroke="${K.muted}" stroke-width="1.3"/><ellipse cx="${cx}" cy="${cy}" rx="${r * 0.82}" ry="${r}" fill="none" stroke="${K.muted}" stroke-width="1"/>
      <path d="M${cx - r} ${cy}H${cx + r}M${cx - r * 0.87} ${cy - r * 0.5}H${cx + r * 0.87}M${cx - r * 0.87} ${cy + r * 0.5}H${cx + r * 0.87}" stroke="${K.muted}" stroke-width="1"/>${figs}</g>`;
  }
  // A closing table: a family and a lender's agent across a table, a paper and a pen.
  const closing = (x, y, s) => at(x, y, s, `${person(0, 6, 0.9, K.onInk)}${person(62, 6, 0.9, K.muted)}<rect x="14" y="34" width="58" height="6" fill="${K.onInk}"/><rect x="22" y="40" width="4" height="16" fill="${K.onInk}"/><rect x="60" y="40" width="4" height="16" fill="${K.onInk}"/>${at(32, 10, 0.7, paper('S'))}`);
  // A pool: a tank of many papers.
  function pool(x, y, s) {
    let ps = ''; for (let i = 0; i < 9; i++) ps += at(8 + (i % 3) * 20, 2 + Math.floor(i / 3) * 10, 0.6, paper(i % 4 === 3 ? 'N' : 'S'));
    return at(x, y, s, `<rect x="0" y="0" width="80" height="54" fill="${K.ink2}" stroke="${K.onInk}" stroke-width="2"/>${ps}<path d="M-6 0h92" stroke="${K.onInk}" stroke-width="3"/>`);
  }
  // A bond certificate with coupons along the bottom.
  function bond(x, y, s, o) {
    o = o || {};
    let cps = ''; for (let i = 0; i < 5; i++) cps += `<rect x="${6 + i * 14}" y="40" width="11" height="9" fill="none" stroke="${K.ink}" stroke-width="1.2" stroke-dasharray="2 1.5"/>`;
    return at(x, y, s, `<rect x="0" y="0" width="80" height="54" rx="2" fill="${o.fill || K.sheet}" stroke="${K.ink}" stroke-width="2"/><rect x="5" y="5" width="70" height="44" fill="none" stroke="${K.green}" stroke-width="1.6"/>
      <text x="40" y="23" text-anchor="middle" font-family="Jost, sans-serif" font-weight="700" font-size="11" fill="${K.ink}">BOND</text><text x="40" y="34" text-anchor="middle" font-family="Jost, sans-serif" font-size="7.5" fill="${K.ink}">backed by mortgages</text>${cps}`);
  }
  // A briefcase (the broker's mark).
  const briefcase = (x, y, s, fill) => at(x, y, s, `<rect x="0" y="6" width="22" height="15" rx="2" fill="${fill || K.gold}"/><rect x="7" y="2" width="8" height="5" fill="none" stroke="${fill || K.gold}" stroke-width="2"/>`);
  // The board: five seated members behind a long table. mood: 'calm', 'warn' (one stands), 'out' (all stand).
  function board(mood) {
    let m = '';
    for (let i = 0; i < 5; i++) {
      const stand = mood === 'out' || (mood === 'warn' && i === 2);
      m += seated(4 + i * 21, stand ? 0 : 6, 0.82, i === 2 ? K.ink : K.ink3, stand);
    }
    return `<svg viewBox="0 0 112 46" aria-hidden="true">${m}<rect x="0" y="34" width="112" height="6" fill="${K.ink}"/></svg>`;
  }
  // The header mark: a house with an arrow leaving it.
  const mark = () => `<svg viewBox="0 0 30 22" aria-hidden="true"><path d="M1 10 L9 3 L17 10 V20 H1Z" fill="${K.onInk}"/><path d="M19 13 H28 M24 9 L28 13 L24 17" stroke="${K.gold}" stroke-width="2.4" fill="none"/></svg>`;

  root.Art = { K, bondChip, at, person, family, seated, house, HOUSE_PATH, coin, coinEdge, paper, office, press, bank, booth, globe, closing, pool, bond, briefcase, board, mark };
})(window);

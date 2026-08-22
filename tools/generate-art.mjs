import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const ROOT = "public/assets/2d";

function svgDoc(size, body, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs>${defs}</defs>${body}</svg>`;
}

function lg(id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("")}</linearGradient>`;
}

function rg(id, stops, cx = 0.5, cy = 0.4, r = 0.65) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("")}</radialGradient>`;
}

const shadowEl = (cx, cy, rx, ry, a = 0.16) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(20,30,15,${a})"/>`;

function isoDiamond(cx, cy, hw, hh) {
  return `M${cx},${cy - hh} L${cx + hw},${cy} L${cx},${cy + hh} L${cx - hw},${cy} Z`;
}

function wallQuadLeft(cx, cyTop, cyBot, hw, hh) {
  return `M${cx - hw},${cyTop} L${cx},${cyTop + hh} L${cx},${cyBot + hh} L${cx - hw},${cyBot} Z`;
}
function wallQuadRight(cx, cyTop, cyBot, hw, hh) {
  return `M${cx + hw},${cyTop} L${cx},${cyTop + hh} L${cx},${cyBot + hh} L${cx + hw},${cyBot} Z`;
}

function buildingShell(S, { hw, wallH, wallL1, wallL2, wallR1, wallR2 }) {
  const cx = S / 2;
  const groundY = S * 0.82;
  const topY = groundY - wallH;
  const hh = hw * 0.5;
  return {
    cx,
    groundY,
    topY,
    hh,
    left: `<path d="${wallQuadLeft(cx, topY, groundY, hw, hh)}" fill="url(#wl)" stroke="rgba(60,40,25,0.35)" stroke-width="1.5"/>`,
    right: `<path d="${wallQuadRight(cx, topY, groundY, hw, hh)}" fill="url(#wr)" stroke="rgba(60,40,25,0.35)" stroke-width="1.5"/>`,
  };
}

function gableRoof(cx, topY, hw, hh, roofH, ridgeInset, cFront, cSide, cEdge) {
  const rx = hw + ridgeInset;
  const apexY = topY - roofH;
  const frontFace = `M${cx - rx},${topY - hh * 0.28} L${cx},${apexY - hh} L${cx + rx},${topY - hh * 0.28} L${cx},${topY + hh * 0.5} Z`;
  const leftSlope = `M${cx - rx},${topY - hh * 0.28} L${cx},${apexY - hh} L${cx},${apexY - hh + roofH * 0.55} L${cx - rx},${topY - hh * 0.28 + roofH * 0.5} Z`;
  return [
    `<path d="${leftSlope}" fill="url(#roofSide)" stroke="rgba(50,30,20,0.4)" stroke-width="1.5"/>`,
    `<path d="${frontFace}" fill="${cFront}" stroke="rgba(50,30,20,0.45)" stroke-width="2"/>`,
    `<path d="M${cx - rx},${topY - hh * 0.28} L${cx},${apexY - hh}" stroke="${cEdge}" stroke-width="3" stroke-linecap="round"/>`,
  ].join("");
}

function windowEl(x, y, w, h, frame = "#6b4a2f") {
  return `<g><rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="2" fill="${frame}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="url(#glass)"/><line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${frame}" stroke-width="1.5"/><line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${frame}" stroke-width="1.5"/></g>`;
}

  const BUILDING_DEFS = (
    wl = ["#c8b898", "#a89878"],
    wr = ["#e2d4b4", "#c0b090"]
  ) =>
  [
    lg("wl", wl),
    lg("wr", wr),
    lg("roofSide", [
      [0, "#7a5638"],
      [1, "#5d3f27"],
    ]),
    lg("glass", [
      [0, "#cfe8ef"],
      [1, "#9fc9d8"],
    ]),
  ].join("");

function house() {
  const S = 256;
  const sh = buildingShell(S, {
    hw: 74,
    wallH: 62,
    wl: ["#e8dcc4", "#cbb894"],
    wr: ["#f6eeda", "#ddd0b2"],
  });
  const door = `<g><rect x="${sh.cx + 14}" y="${sh.groundY - 34}" width="24" height="34" rx="2" fill="#7a4a2a"/><rect x="${sh.cx + 14}" y="${sh.groundY - 34}" width="24" height="34" rx="2" fill="none" stroke="#5d3820" stroke-width="2"/><circle cx="${sh.cx + 32}" cy="${sh.groundY - 17}" r="2" fill="#e8c860"/></g>`;
  const win1 = windowEl(sh.cx - 58, sh.topY + 18, 26, 22);
  const winR = windowEl(sh.cx + 48, sh.topY + 16, 22, 20);
  const roof = gableRoof(sh.cx, sh.topY, 74, 37, 46, 8, "url(#houseRoof)", "", "#a8442f");
  const chimney = `<g><rect x="${sh.cx - 40}" y="${sh.topY - 66}" width="14" height="34" fill="#9a6a4a"/><rect x="${sh.cx - 42}" y="${sh.topY - 70}" width="18" height="7" fill="#7a5238"/></g>`;
  return svgDoc(
    S,
    `${shadowEl(sh.cx, sh.groundY + 6, 92, 30)}${chimney}${sh.left}${sh.right}${door}${win1}${winR}${roof}`,
    BUILDING_DEFS() +
      lg("houseRoof", [
        [0, "#c85a3e"],
        [1, "#96382a"],
      ])
  );
}

function barn() {
  const S = 256;
  const sh = buildingShell(S, {
    hw: 86,
    wallH: 66,
    wl: ["#a83c30", "#7e2b22"],
    wr: ["#c8503f", "#99352a"],
  });
  const trim = `<g stroke="#f2e8d8" stroke-width="4" fill="none"><path d="M${sh.cx + 12},${sh.groundY - 46} L${sh.cx + 52},${sh.groundY - 6} M${sh.cx + 52},${sh.groundY - 46} L${sh.cx + 12},${sh.groundY - 6}"/></g><rect x="${sh.cx + 10}" y="${sh.groundY - 50}" width="46" height="50" fill="none" stroke="#f2e8d8" stroke-width="5"/>`;
  const loft = `<circle cx="${sh.cx - 30}" cy="${sh.topY - 8}" r="11" fill="#5d2018" stroke="#f2e8d8" stroke-width="4"/>`;
  const roof = gableRoof(sh.cx, sh.topY, 86, 43, 52, 10, "url(#barnRoof)", "", "#4a3020");
  const base = `<rect x="${sh.cx - 88}" y="${sh.groundY - 8}" width="176" height="9" fill="#8a7558"/>`;
  return svgDoc(
    S,
    `${shadowEl(sh.cx, sh.groundY + 6, 104, 33)}${base}${sh.left}${sh.right}${trim}${loft}${roof}`,
    BUILDING_DEFS() +
      lg("barnRoof", [
        [0, "#8a6a4a"],
        [1, "#63472f"],
      ])
  );
}

function warehouse() {
  const S = 256;
  const sh = buildingShell(S, {
    hw: 80,
    wallH: 64,
    wl: ["#9aa4ac", "#78828a"],
    wr: ["#c2ccd4", "#9aa6ae"],
  });
  let panels = "";
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    panels += `<line x1="${sh.cx - 80 + 160 * t - 80 * t * 0}" y1="${sh.topY + i * 0}" x2="${sh.cx - 80 + 160 * t}" y2="${sh.groundY}" stroke="rgba(70,80,90,0.35)" stroke-width="2"/>`;
  }
  const bigDoor = `<g><rect x="${sh.cx - 46}" y="${sh.groundY - 44}" width="44" height="44" fill="url(#metalDoor)" stroke="#5a646c" stroke-width="2"/><line x1="${sh.cx - 46}" y1="${sh.groundY - 30}" x2="${sh.cx - 2}" y2="${sh.groundY - 30}" stroke="#5a646c" stroke-width="2"/><line x1="${sh.cx - 46}" y1="${sh.groundY - 16}" x2="${sh.cx - 2}" y2="${sh.groundY - 16}" stroke="#5a646c" stroke-width="2"/></g>`;
  const sideWin = windowEl(sh.cx + 30, sh.topY + 20, 34, 18, "#4a545c");
  const roof = `<path d="M${sh.cx - 88},${sh.topY - 4} L${sh.cx},${sh.topY - 40} L${sh.cx + 88},${sh.topY - 4} L${sh.cx},${sh.topY + 22} Z" fill="url(#whRoof)" stroke="rgba(60,70,80,0.5)" stroke-width="2"/>`;
  return svgDoc(
    S,
    `${shadowEl(sh.cx, sh.groundY + 6, 98, 31)}${sh.left}${panels}${sh.right}${bigDoor}${sideWin}${roof}`,
    BUILDING_DEFS() +
      lg("whRoof", [
        [0, "#d8dee2"],
        [1, "#a8b2ba"],
      ]) +
      lg("metalDoor", [
        [0, "#b8c2ca"],
        [1, "#8a959d"],
      ])
  );
}

function workshop() {
  const S = 256;
  const sh = buildingShell(S, {
    hw: 68,
    wallH: 56,
    wl: ["#b89868", "#94764c"],
    wr: ["#d4b484", "#ac8c5e"],
  });
  let planks = "";
  for (let i = 1; i < 4; i++) {
    const y = sh.topY + (i * 56) / 4;
    planks += `<line x1="${sh.cx - 68}" y1="${y}" x2="${sh.cx}" y2="${y + 17}" stroke="rgba(90,64,36,0.3)" stroke-width="1.5"/>`;
    planks += `<line x1="${sh.cx}" y1="${y + 17}" x2="${sh.cx + 68}" y2="${y}" stroke="rgba(120,92,56,0.3)" stroke-width="1.5"/>`;
  }
  const awning = `<path d="M${sh.cx - 54},${sh.groundY - 34} L${sh.cx + 10},${sh.groundY - 52} L${sh.cx + 22},${sh.groundY - 46} L${sh.cx - 42},${sh.groundY - 28} Z" fill="#b0543c" stroke="#7e3826" stroke-width="2"/><line x1="${sh.cx - 40}" y1="${sh.groundY - 30}" x2="${sh.cx - 40}" y2="${sh.groundY}" stroke="#6b4a2a" stroke-width="4"/><line x1="${sh.cx - 12}" y1="${sh.groundY - 38}" x2="${sh.cx - 12}" y2="${sh.groundY}" stroke="#6b4a2a" stroke-width="4"/>`;
  const barrel = `<g><ellipse cx="${sh.cx + 44}" cy="${sh.groundY - 16}" rx="13" ry="16" fill="url(#barrelG)" stroke="#5d3f22" stroke-width="2"/><line x1="${sh.cx + 31}" y1="${sh.groundY - 18}" x2="${sh.cx + 57}" y2="${sh.groundY - 18}" stroke="#5d3f22" stroke-width="2.5"/><line x1="${sh.cx + 32}" y1="${sh.groundY - 8}" x2="${sh.cx + 56}" y2="${sh.groundY - 8}" stroke="#5d3f22" stroke-width="2.5"/></g>`;
  const win = windowEl(sh.cx - 52, sh.topY + 14, 22, 18);
  const roof = gableRoof(sh.cx, sh.topY, 68, 34, 40, 8, "url(#wkRoof)", "", "#5d4028");
  return svgDoc(
    S,
    `${shadowEl(sh.cx, sh.groundY + 6, 86, 28)}${sh.left}${planks}${sh.right}${win}${awning}${barrel}${roof}`,
    BUILDING_DEFS() +
      lg("wkRoof", [
        [0, "#7e5a38"],
        [1, "#5d4028"],
      ]) +
      lg("barrelG", [
        [0, "#b08a58"],
        [1, "#84643c"],
      ])
  );
}

function greenhouse() {
  const S = 256;
  const sh = buildingShell(S, {
    hw: 76,
    wallH: 52,
    wl: ["#bfe0c8", "#98c8a4"],
    wr: ["#d8f0dc", "#b0dcbc"],
  });
  const glassWall = `<path d="${wallQuadRight(sh.cx, sh.topY + 6, sh.groundY - 4, 76, 38)}" fill="url(#ghGlass)" opacity="0.85"/>`;
  let mullions = "";
  for (let i = 1; i < 4; i++) {
    const x = sh.cx + (i * 76) / 4 - 57;
    mullions += `<line x1="${sh.cx + i * 19}" y1="${sh.topY + 8}" x2="${sh.cx + i * 19}" y2="${sh.groundY - 4}" stroke="#4a7a52" stroke-width="2.5"/>`;
    mullions += `<line x1="${sh.cx - i * 19}" y1="${sh.topY + 8 + i * 9.5}" x2="${sh.cx - i * 19}" y2="${sh.groundY - 4 + 0}" stroke="#4a7a52" stroke-width="2.5" transform="translate(${-57 * 0} ${-i * 9.5})" opacity="0"/>`;
  }
  for (let i = 1; i < 3; i++) {
    mullions += `<line x1="${sh.cx - 76}" y1="${sh.topY + 6 + i * 15}" x2="${sh.cx}" y2="${sh.topY + 21 + i * 15}" stroke="#4a7a52" stroke-width="2"/><line x1="${sh.cx}" y1="${sh.topY + 21 + i * 15}" x2="${sh.cx + 76}" y2="${sh.topY + 6 + i * 15}" stroke="#4a7a52" stroke-width="2"/>`;
  }
  const door = `<rect x="${sh.cx - 16}" y="${sh.groundY - 32}" width="22" height="32" fill="url(#ghGlass)" stroke="#4a7a52" stroke-width="3"/>`;
  const roof = `<path d="M${sh.cx - 84},${sh.topY - 2} L${sh.cx},${sh.topY - 44} L${sh.cx + 84},${sh.topY - 2} L${sh.cx},${sh.topY + 18} Z" fill="url(#ghGlass)" stroke="#4a7a52" stroke-width="3"/><line x1="${sh.cx - 84}" y1="${sh.topY - 2}" x2="${sh.cx}" y2="${sh.topY - 44}" stroke="#4a7a52" stroke-width="4"/><line x1="${sh.cx}" y1="${sh.topY - 44}" x2="${sh.cx + 84}" y2="${sh.topY - 2}" stroke="#4a7a52" stroke-width="4"/><line x1="${sh.cx - 42}" y1="${sh.topY - 23}" x2="${sh.cx + 42}" y2="${sh.topY - 23}" stroke="#4a7a52" stroke-width="2"/>`;
  const plants = `<g><ellipse cx="${sh.cx + 34}" cy="${sh.groundY - 6}" rx="10" ry="7" fill="#5da04a"/><ellipse cx="${sh.cx + 52}" cy="${sh.groundY - 4}" rx="8" ry="6" fill="#6cb058"/></g>`;
  return svgDoc(
    S,
    `${shadowEl(sh.cx, sh.groundY + 6, 94, 30)}${sh.left}${sh.right}${glassWall}${mullions}${door}${plants}${roof}`,
    BUILDING_DEFS() +
      lg("ghGlass", [
        [0, "rgba(215,240,235,0.92)"],
        [1, "rgba(150,205,200,0.82)"],
      ])
  );
}

const ANCHOR_Y_FRAC = 112 / 128;

function animalBody({ bodyGrad, belly, size = 1, bob = 0 }) {
  const s = size;
  const by = 74 + bob;
  return { by };
}

function cowFrame(frame) {
  const S = 128;
  const swings = { idle_01: [0, 0, 0, 0], idle_02: [0, 0, 0, 0], walk_01: [-16, 10, 12, -8], walk_02: [0, 0, 0, 0], walk_03: [12, -8, -16, 10] };
  const sw = swings[frame];
  const bob = frame === "walk_02" ? 2 : frame === "idle_02" ? 1 : 0;
  const bx = 58,
    by = 72 - bob;
  const leg = (lx, ang) => {
    const rad = (ang * Math.PI) / 180;
    const ex = lx + Math.sin(rad) * 16;
    const ey = 100 + Math.cos(rad) * 2;
    return `<line x1="${lx}" y1="${by + 16}" x2="${ex}" y2="${Math.min(ey, 106)}" stroke="#e8e2d4" stroke-width="7" stroke-linecap="round"/><line x1="${ex}" y1="${Math.min(ey, 106)}" x2="${ex}" y2="110" stroke="#5a4a3a" stroke-width="5" stroke-linecap="round"/>`;
  };
  const legs = [leg(bx - 22, sw[0]), leg(bx + 14, sw[1]), leg(bx - 10, sw[2]), leg(bx + 26, sw[3])].join("");
  const tail = `<path d="M${bx - 34},${by - 6} q-12,10 -6,26" stroke="#d8d2c4" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="${bx - 39}" cy="${by + 21}" r="3.5" fill="#4a3a2a"/>`;
  const body = `<ellipse cx="${bx}" cy="${by + 4}" rx="36" ry="22" fill="url(#cowB)" stroke="rgba(80,60,40,0.35)" stroke-width="1.5"/>`;
  const patch1 = `<path d="M${bx - 18},${by - 8} q14,-8 22,2 q6,10 -6,14 q-16,4 -18,-6 Z" fill="#6b4a32"/>`;
  const patch2 = `<path d="M${bx + 12},${by + 10} q12,-4 16,6 q2,10 -10,8 q-10,-2 -6,-14 Z" fill="#6b4a32"/>`;
  const udder = `<ellipse cx="${bx + 6}" cy="${by + 24}" rx="9" ry="6" fill="#e8b8b0"/>`;
  const headG = `<g><ellipse cx="${bx + 40}" cy="${by - 14}" rx="15" ry="12.5" fill="url(#cowB)" stroke="rgba(80,60,40,0.35)" stroke-width="1.5"/><ellipse cx="${bx + 49}" cy="${by - 9}" rx="8" ry="6" fill="#e0b0a0"/><circle cx="${bx + 47}" cy="${by - 10}" r="1.4" fill="#7a5040"/><circle cx="${bx + 52}" cy="${by - 9}" r="1.4" fill="#7a5040"/><circle cx="${bx + 42}" cy="${by - 17}" r="2.4" fill="#2a2018"/><path d="M${bx + 30},${by - 24} l-8,-6" stroke="#c8b89a" stroke-width="3.5" stroke-linecap="round"/><path d="M${bx + 50},${by - 25} l7,-6" stroke="#c8b89a" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="${bx + 29}" cy="${by - 16}" rx="4.5" ry="3" fill="#d8ccb4"/><ellipse cx="${bx + 51}" cy="${by - 17}" rx="4.5" ry="3" fill="#d8ccb4"/></g>`;
  return svgDoc(
    S,
    `${shadowEl(64, 112, 34, 9)}${tail}${legs}${body}${patch1}${patch2}${udder}${headG}`,
    rg("cowB", [
      [0, "#fdfaf2"],
      [1, "#e2dac8"],
    ])
  );
}

function chickenFrame(frame, rooster = false) {
  const S = 128;
  const swings = { idle_01: [0, 0], idle_02: [0, 0], walk_01: [-18, 14], walk_02: [0, 0], walk_03: [14, -18] };
  const sw = swings[frame];
  const bob = frame === "idle_02" || frame === "walk_02" ? 1.5 : 0;
  const bx = 62,
    by = 76 - bob;
  const scale = rooster ? 1.12 : 1;
  const leg = (lx, ang) => {
    const rad = (ang * Math.PI) / 180;
    const ex = lx + Math.sin(rad) * 10;
    return `<path d="M${lx},${by + 14} L${ex},108" stroke="#e8a33d" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M${ex - 4},110 L${ex},107 L${ex + 4},110" stroke="#e8a33d" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  };
  const legs = [leg(bx - 6, sw[0]), leg(bx + 8, sw[1])].join("");
  const bodyCol = rooster ? ["#c2452f", "#8f2c1e"] : ["#f2ead8", "#d8ccae"];
  const body = `<ellipse cx="${bx}" cy="${by + 2}" rx="${24 * scale}" ry="${19 * scale}" fill="url(#ckB)" stroke="rgba(90,60,30,0.3)" stroke-width="1.5"/>`;
  const wing = `<path d="M${bx - 14},${by - 2} q-10,8 -2,16 q10,4 16,-4 q-2,-10 -14,-12 Z" fill="${rooster ? "#8f2c1e" : "#e0d4b8"}" opacity="0.9"/>`;
  const tailBase = rooster
    ? `<path d="M${bx - 20},${by - 6} q-20,-6 -24,-28 q14,4 18,-2 q2,14 12,16 q-8,8 -6,14 Z" fill="#2e4a5e"/><path d="M${bx - 18},${by - 2} q-16,2 -22,-12 q10,0 14,-6 q0,12 8,18 Z" fill="#3e6478"/>`
    : `<path d="M${bx - 22},${by - 4} q-10,4 -12,14 q8,2 14,-4 Z" fill="#c8b890"/>`;
  const headX = bx + 16 * scale;
  const headY = by - 20 * scale;
  const head = `<g><circle cx="${headX}" cy="${headY}" r="${9.5 * scale}" fill="url(#ckB)" stroke="rgba(90,60,30,0.3)" stroke-width="1.5"/><circle cx="${headX + 3.5}" cy="${headY - 2}" r="1.8" fill="#241a12"/>${
    rooster
      ? `<path d="M${headX - 4},${headY - 9} q2,-8 6,-8 q-1,4 2,5 q3,-6 7,-4 q-2,5 1,7 q-8,3 -16,0 Z" fill="#d63f2e"/>`
      : `<circle cx="${headX}" cy="${headY - 9}" r="3" fill="#d63f2e"/><circle cx="${headX + 5}" cy="${headY - 10}" r="2.4" fill="#d63f2e"/>`
  }<path d="M${headX + 8},${headY} l8,${rooster ? -1 : 2} l-8,3 Z" fill="#e8a33d"/>${
    rooster
      ? `<ellipse cx="${headX + 2}" cy="${headY + 9}" rx="4" ry="6" fill="#d63f2e"/>`
      : `<circle cx="${headX + 2}" cy="${headY + 8}" r="2.6" fill="#d63f2e"/>`
  }</g>`;
  return svgDoc(
    S,
    `${shadowEl(64, 112, 22, 6.5)}${legs}${tailBase}${body}${wing}${head}`,
    rg("ckB", [
      [0, bodyCol[0]],
      [1, bodyCol[1]],
    ])
  );
}

function pigFrame(frame) {
  const S = 128;
  const swings = { idle_01: [0, 0, 0, 0], idle_02: [0, 0, 0, 0], walk_01: [-14, 10, 10, -8], walk_02: [0, 0, 0, 0], walk_03: [10, -8, -14, 10] };
  const sw = swings[frame];
  const bob = frame === "walk_02" ? 1.5 : 0;
  const bx = 60,
    by = 76 - bob;
  const leg = (lx, ang) => {
    const rad = (ang * Math.PI) / 180;
    const ex = lx + Math.sin(rad) * 12;
    return `<line x1="${lx}" y1="${by + 14}" x2="${ex}" y2="106" stroke="#eeb4ae" stroke-width="6.5" stroke-linecap="round"/><path d="M${ex - 4},108 L${ex + 4},108" stroke="#d89890" stroke-width="4" stroke-linecap="round"/>`;
  };
  const legs = [leg(bx - 20, sw[0]), leg(bx + 12, sw[1]), leg(bx - 8, sw[2]), leg(bx + 22, sw[3])].join("");
  const tail = `<path d="M${bx - 32},${by + 2} q-8,-2 -6,-8 q2,-5 7,-3 q3,2 0,5" stroke="#e09890" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  const body = `<ellipse cx="${bx}" cy="${by + 2}" rx="33" ry="22" fill="url(#pigB)" stroke="rgba(140,80,70,0.3)" stroke-width="1.5"/>`;
  const ear1 = `<path d="M${bx + 18},${by - 18} l6,-9 l8,6 Z" fill="#d88a82"/>`;
  const ear2 = `<path d="M${bx + 28},${by - 16} l7,-7 l6,8 Z" fill="#cf7f78"/>`;
  const head = `<g><ellipse cx="${bx + 32}" cy="${by - 6}" rx="16" ry="14" fill="url(#pigB)" stroke="rgba(140,80,70,0.3)" stroke-width="1.5"/><ellipse cx="${bx + 45}" cy="${by - 3}" rx="7.5" ry="5.5" fill="#d8837a"/><circle cx="${bx + 43}" cy="${by - 4}" r="1.3" fill="#8a4a44"/><circle cx="${bx + 47.5}" cy="${by - 3}" r="1.3" fill="#8a4a44"/><circle cx="${bx + 33}" cy="${by - 11}" r="2.2" fill="#2a1a16"/></g>`;
  const blush = `<ellipse cx="${bx + 24}" cy="${by + 2}" rx="4" ry="2.5" fill="#e8a8a0" opacity="0.7"/>`;
  return svgDoc(
    S,
    `${shadowEl(64, 112, 30, 8)}${tail}${legs}${body}${blush}${ear1}${ear2}${head}`,
    rg("pigB", [
      [0, "#f6c8c2"],
      [1, "#e0a09a"],
    ])
  );
}

function cropSprite(crop, stage) {
  const S = 128;
  const mound = `<ellipse cx="64" cy="106" rx="20" ry="7" fill="#7a5c38"/><ellipse cx="64" cy="104" rx="20" ry="7" fill="#8f6c42"/>`;
  if (stage === "seed") {
    return svgDoc(S, `${mound}<ellipse cx="64" cy="102" rx="3" ry="2.2" fill="#5d4326"/><path d="M64,100 q-2,-6 -6,-8 M64,100 q3,-6 7,-7" stroke="#7aa84f" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  }
  if (crop === "carrot") {
    if (stage === "growing")
      return svgDoc(S, `${mound}<path d="M64,102 v-22 M64,88 l-10,-8 M64,88 l10,-8 M64,96 l-12,-6 M64,96 l12,-6" stroke="#4f8f4a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
    return svgDoc(
      S,
      `${mound}<path d="M64,104 q-3,4 -8,4 q4,-6 2,-9 Z M64,104 q3,4 8,4 q-4,-6 -2,-9 Z" fill="#e0782c"/><g stroke="#4f8f4a" stroke-width="4" fill="none" stroke-linecap="round"><path d="M64,100 v-30"/><path d="M64,84 l-16,-16"/><path d="M64,84 l16,-16"/><path d="M64,92 l-20,-10"/><path d="M64,92 l20,-10"/><path d="M64,76 l-8,-14"/><path d="M64,76 l8,-14"/></g>`
    );
  }
  if (crop === "wheat") {
    if (stage === "growing")
      return svgDoc(
        S,
        `${mound}<g stroke="#7aa84f" stroke-width="3.5" fill="none" stroke-linecap="round"><path d="M56,104 v-26"/><path d="M72,104 v-24"/><path d="M64,102 v-30"/></g>`
      );
    return svgDoc(
      S,
      `${mound}<g stroke="#c9a84a" stroke-width="3.5" fill="none" stroke-linecap="round"><path d="M52,104 v-34"/><path d="M76,104 v-32"/><path d="M64,102 v-42"/></g><g fill="#e0c060" stroke="#a88838" stroke-width="1"><ellipse cx="52" cy="64" rx="4" ry="9"/><ellipse cx="76" cy="66" rx="4" ry="9"/><ellipse cx="64" cy="54" rx="4.5" ry="11"/></g><g stroke="#e8d078" stroke-width="1.5" fill="none"><path d="M48,60 l-5,-6 M56,60 l5,-6 M72,62 l-5,-6 M80,62 l5,-6 M60,48 l-5,-7 M68,48 l5,-7"/></g>`
    );
  }
  if (crop === "corn") {
    if (stage === "growing")
      return svgDoc(S, `${mound}<path d="M64,104 v-30 M64,88 q-12,-4 -16,-14 M64,94 q12,-4 16,-14" stroke="#5f8f3c" stroke-width="4" fill="none" stroke-linecap="round"/>`);
    return svgDoc(
      S,
      `${mound}<path d="M64,106 V38" stroke="#5f8f3c" stroke-width="5" stroke-linecap="round"/><path d="M64,92 Q44,88 38,70 Q56,72 64,84" fill="#6fa04a"/><path d="M64,80 Q84,76 90,58 Q72,60 64,72" fill="#6fa04a"/><path d="M64,66 Q50,62 46,48 Q60,50 64,58" fill="#7aa84f"/><ellipse cx="73" cy="52" rx="7" ry="14" fill="url(#cornG)" transform="rotate(8 73 52)" stroke="#b8882e" stroke-width="1.5"/><path d="M73,40 q6,10 2,22" stroke="#e8c060" stroke-width="2" fill="none"/>`
    );
  }
  if (crop === "potato") {
    if (stage === "growing")
      return svgDoc(S, `${mound}<path d="M64,102 v-16 M64,92 l-8,-6 M64,92 l8,-6" stroke="#5f8f3c" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
    return svgDoc(
      S,
      `${mound}<g stroke="#5f8f3c" stroke-width="4" fill="none" stroke-linecap="round"><path d="M64,102 v-24"/><path d="M64,88 l-14,-12"/><path d="M64,88 l14,-12"/><path d="M64,94 l-18,-6"/><path d="M64,94 l18,-6"/></g><g fill="#6fa04a"><ellipse cx="46" cy="72" rx="9" ry="6"/><ellipse cx="82" cy="72" rx="9" ry="6"/><ellipse cx="58" cy="66" rx="8" ry="5.5"/><ellipse cx="72" cy="64" rx="8" ry="5.5"/></g><ellipse cx="50" cy="108" rx="6" ry="4" fill="#c8a068"/><ellipse cx="78" cy="109" rx="6" ry="4" fill="#b8905a"/>`
    );
  }
  return svgDoc(S, mound);
}

function tree(variant) {
  const S = 256;
  const trunk = `<path d="M124,208 q-3,-30 -8,-46 l16,0 q-5,16 -8,46 Z" fill="url(#trunkG)" stroke="#5d4028" stroke-width="2"/><path d="M118,170 l-12,-16 M138,170 l12,-16" stroke="#6b4a2f" stroke-width="6" stroke-linecap="round"/>`;
  const canopySets = {
    1: `<circle cx="128" cy="112" r="52" fill="url(#canG1)"/><circle cx="96" cy="130" r="34" fill="url(#canG1)"/><circle cx="162" cy="128" r="36" fill="url(#canG1)"/><circle cx="112" cy="92" r="30" fill="#7cb85e"/><circle cx="150" cy="98" r="28" fill="#8cc46a"/>`,
    2: `<ellipse cx="128" cy="118" rx="40" ry="62" fill="url(#canG2)"/><ellipse cx="108" cy="96" rx="24" ry="30" fill="#5a9a4e"/><ellipse cx="148" cy="104" rx="26" ry="32" fill="#6aa85a"/><path d="M116,60 l12,-18 l12,18" fill="#4e8c44"/>`,
    3: `<circle cx="122" cy="108" r="46" fill="url(#canG3)"/><circle cx="164" cy="122" r="30" fill="url(#canG3)"/><circle cx="94" cy="132" r="28" fill="#8cc46a"/><circle cx="146" cy="86" r="26" fill="#a0d078"/><circle cx="108" cy="88" r="22" fill="#94ca70"/>`,
  };
  const grads = {
    1: rg("canG1", [[0, "#8ec86a"], [1, "#4e8c44"]]),
    2: rg("canG2", [[0, "#6fb05c"], [1, "#3e7a3a"]]),
    3: rg("canG3", [[0, "#9cce74"], [1, "#54964a"]]),
  };
  const fruit =
    variant === 3
      ? `<circle cx="112" cy="120" r="5" fill="#d64a3a"/><circle cx="146" cy="104" r="5" fill="#d64a3a"/><circle cx="158" cy="136" r="4.5" fill="#d64a3a"/>`
      : "";
  return svgDoc(S, `${shadowEl(128, 212, 56, 14)}${trunk}${canopySets[variant]}${fruit}`, rg("trunkG", [[0, "#8a6242"], [1, "#6b4a2f"]]) + grads[variant]);
}

function bush(variant) {
  const S = 128;
  const base = `<ellipse cx="64" cy="98" rx="34" ry="22" fill="url(#bshG)"/><ellipse cx="46" cy="92" rx="20" ry="16" fill="#5da04a"/><ellipse cx="80" cy="90" rx="22" ry="17" fill="#6cb058"/><ellipse cx="64" cy="80" rx="18" ry="14" fill="#7cbe64"/>`;
  const berries =
    variant === 2
      ? `<circle cx="52" cy="88" r="3.5" fill="#d64a5a"/><circle cx="74" cy="82" r="3.5" fill="#d64a5a"/><circle cx="66" cy="96" r="3" fill="#d64a5a"/><circle cx="84" cy="92" r="3" fill="#d64a5a"/>`
      : "";
  return svgDoc(S, `${shadowEl(64, 112, 30, 8)}${base}${berries}`, rg("bshG", [[0, "#6cae52"], [1, "#417a38"]]));
}

function rock(variant) {
  const S = 128;
  const shapes = {
    1: `<path d="M38,104 L46,78 Q52,64 66,64 Q84,64 90,80 L96,104 Z" fill="url(#rkG)" stroke="#6a6f72" stroke-width="2"/><path d="M50,80 Q56,70 68,70" stroke="#e8ecee" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>`,
    2: `<path d="M30,106 L40,86 L56,78 L74,80 L92,88 L98,106 Z" fill="url(#rkG)" stroke="#6a6f72" stroke-width="2"/><path d="M44,90 L60,84 M70,88 L84,94" stroke="#dfe4e6" stroke-width="2.5" opacity="0.7"/>`,
  };
  return svgDoc(S, `${shadowEl(64, 110, 32, 8)}${shapes[variant]}`, rg("rkG", [[0, "#b8bec2"], [1, "#848b90"]]));
}

function flower(variant) {
  const S = 128;
  const col = variant === 1 ? "#e85a6a" : "#f0c040";
  const col2 = variant === 1 ? "#c03848" : "#c89a28";
  return svgDoc(
    S,
    `${shadowEl(64, 111, 12, 4)}<g stroke="#5a9a4a" stroke-width="3" fill="none" stroke-linecap="round"><path d="M60,108 q-2,-16 -8,-24"/><path d="M68,108 q2,-18 8,-28"/><path d="M64,108 v-20"/></g><g transform="translate(52,84)"><circle r="5.5" fill="${col}"/><circle cx="-4" cy="-3" r="4" fill="${col}"/><circle cx="4" cy="-3" r="4" fill="${col}"/><circle cx="0" cy="3.5" r="4" fill="${col}"/><circle r="2.6" fill="${col2}"/></g><g transform="translate(77,78)"><circle r="5" fill="${col}"/><circle cx="-4" cy="-2" r="3.6" fill="${col}"/><circle cx="4" cy="-2" r="3.6" fill="${col}"/><circle cx="0" cy="3" r="3.6" fill="${col}"/><circle r="2.4" fill="#7a5a20"/></g>`
  );
}

const jobs = [];
for (const f of ["idle_01", "idle_02", "walk_01", "walk_02", "walk_03"]) {
  jobs.push({ dir: "animals", name: `cow_${f}`, size: 128, svg: cowFrame(f) });
  jobs.push({ dir: "animals", name: `chicken_${f}`, size: 128, svg: chickenFrame(f, false) });
  jobs.push({ dir: "animals", name: `rooster_${f}`, size: 128, svg: chickenFrame(f, true) });
  jobs.push({ dir: "animals", name: `pig_${f}`, size: 128, svg: pigFrame(f) });
}
for (const crop of ["carrot", "wheat", "corn", "potato"]) {
  for (const st of ["seed", "growing", "ready"]) {
    jobs.push({ dir: "crops", name: `${crop}_${st}`, size: 128, svg: cropSprite(crop, st) });
  }
}
jobs.push({ dir: "buildings", name: "house", size: 256, svg: house() });
jobs.push({ dir: "buildings", name: "barn", size: 256, svg: barn() });
jobs.push({ dir: "buildings", name: "warehouse", size: 256, svg: warehouse() });
jobs.push({ dir: "buildings", name: "workshop", size: 256, svg: workshop() });
jobs.push({ dir: "buildings", name: "greenhouse", size: 256, svg: greenhouse() });
for (const v of [1, 2, 3]) jobs.push({ dir: "vegetation", name: `tree_0${v}`, size: 256, svg: tree(v) });
for (const v of [1, 2]) jobs.push({ dir: "vegetation", name: `bush_0${v}`, size: 128, svg: bush(v) });
for (const v of [1, 2]) jobs.push({ dir: "vegetation", name: `rock_0${v}`, size: 128, svg: rock(v) });
for (const v of [1, 2]) jobs.push({ dir: "vegetation", name: `flower_0${v}`, size: 128, svg: flower(v) });

mkdirSync(ROOT, { recursive: true });
let total = 0;
for (const j of jobs) {
  const out = join(ROOT, j.dir, `${j.name}.webp`);
  const info = await sharp(Buffer.from(j.svg)).resize(j.size, j.size).webp({ quality: 82 }).toFile(out);
  total += info.size;
  console.log(`${j.dir}/${j.name}.webp  ${info.size} bytes`);
}
console.log(`\nTOTAL: ${jobs.length} sprites, ${(total / 1024).toFixed(1)} KB`);

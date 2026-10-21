/* shingo's tank — self-contained, no external requests. Realism pass. */
(() => {
"use strict";
const NS = "http://www.w3.org/2000/svg";
const $ = id => document.getElementById(id);
const E = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const W = 400;
function seeded(s) { return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function sandY(x) { x = clamp(x, 0, 400); let t, a, c, b; if (x <= 200) { t = x / 200; a = 205; c = 192; b = 200; } else { t = (x - 200) / 200; a = 200; c = 208; b = 198; } const u = 1 - t; return u * u * a + 2 * t * u * c + t * t * b; }

/* ---------- presets & state ---------- */
const TIMES = ["auto", "morning", "day", "evening", "night"];
const TIME_LABEL = { auto: "自動", morning: "朝", day: "昼", evening: "夕", night: "夜" };
const TIME_FX = {
  morning: { tint: "#ffb37a", op: .14, rays: .3, speed: .8, caust: .55 },
  day: { tint: "#ffffff", op: 0, rays: .22, speed: 1, caust: .65 },
  evening: { tint: "#ff6a2a", op: .26, rays: .12, speed: .75, caust: .35 },
  night: { tint: "#06122e", op: .55, rays: .03, speed: .4, caust: .12 }
};
const SANDS = [{ name: "ソイル", c: ["#5a4a3c", "#2e251d"] }, { name: "川砂", c: ["#d9c49a", "#a88c5c"] }, { name: "黒砂", c: ["#4a4a4e", "#141416"] }, { name: "白砂", c: ["#f4efe4", "#cbc3b0"] }];
const BGS = [{ name: "澄んだ水", c: ["#bfeefa", "#3c9fc4"] }, { name: "グリーン", c: ["#d6f2d0", "#4f9a74"] }, { name: "ディープ", c: ["#a9d4f2", "#1d4f8a"] }, { name: "ブラックウォーター", c: ["#f1e2b8", "#8f6a38"] }];
const ITEMS = ["r0", "p0", "p1"];
const KINDS = ["neon", "shrimp", "cory", "oto"];
const LIMITS = { neon: [0, 20], shrimp: [0, 10], cory: [0, 6], oto: [0, 6] };
const SHOW = ["fish", "shrimp", "plants", "rocks"];
const KEY = "shingo-tank-v2";
const DEF = () => ({ show: { fish: true, shrimp: true, plants: true, rocks: true }, n: { neon: 5, shrimp: 2, cory: 0, oto: 0 }, time: "day", sand: 0, bg: 0, pos: { r0: [0, 0], p0: [0, 0], p1: [0, 0] } });

function encode(s) {
  const f = SHOW.reduce((m, k, i) => m | (s.show[k] ? 1 << i : 0), 0);
  const a = [2, f, s.n.neon, s.n.shrimp, s.n.cory, s.n.oto, TIMES.indexOf(s.time), s.sand, s.bg];
  ITEMS.forEach(k => a.push(Math.round(s.pos[k][0]), Math.round(s.pos[k][1])));
  while (a.length > 9 && a[a.length - 1] === 0) a.pop();
  return a.join(".");
}
function decode(str) {
  if (typeof str !== "string" || !/^2(\.-?\d{1,4}){0,14}$/.test(str)) return null;
  const a = str.split(".").map(Number), s = DEF(), g = (i, d) => (i < a.length ? a[i] : d);
  const f = g(1, 15); SHOW.forEach((k, i) => { s.show[k] = !!(f & (1 << i)); });
  KINDS.forEach((k, i) => { s.n[k] = clamp(g(2 + i, s.n[k]), LIMITS[k][0], LIMITS[k][1]); });
  s.time = TIMES[clamp(g(6, 2), 0, TIMES.length - 1)];
  s.sand = clamp(g(7, 0), 0, SANDS.length - 1);
  s.bg = clamp(g(8, 0), 0, BGS.length - 1);
  ITEMS.forEach((k, i) => { s.pos[k] = [clamp(g(9 + 2 * i, 0), -400, 400), clamp(g(10 + 2 * i, 0), -60, 60)]; });
  return s;
}

/* ---------- scenery ---------- */
const tank = $("tank"), R = seeded(20261020), itemEls = {}, bbox = {};

/* far background plant silhouettes */
{
  const far = $("far");
  [[320, 210, 55, .9], [350, 212, 70, 1.05], [375, 208, 48, .8], [20, 212, 40, .7]].forEach(([x, base, h, k], i) => {
    const g = E("g", {}, far);
    E("path", { d: `M${x} ${base} Q${x + 4} ${base - h * .5} ${x} ${base - h * k}`, stroke: "#2a6a4a", "stroke-width": 3, fill: "none", opacity: .7 }, g);
    for (let y = base - 8; y > base - h * k; y -= 14) {
      E("ellipse", { cx: x - 8, cy: y, rx: 8, ry: 3.5, fill: "#2a6a4a", opacity: .55, transform: `rotate(-20 ${x - 8} ${y})` }, g);
      E("ellipse", { cx: x + 8, cy: y - 5, rx: 8, ry: 3.5, fill: "#245a40", opacity: .5, transform: `rotate(22 ${x + 8} ${y - 5})` }, g);
    }
  });
}

const STEMS = [[22, .95], [38, 1], [54, .9], [70, 1.05], [86, .85], [102, .75], [30, .7], [62, .8]];
const CLUSTERS = { p0: [0, 1, 2, 6], p1: [3, 4, 5, 7] };
for (const k of ["p0", "p1"]) {
  const it = E("g", { class: "item hygro", "data-item": k }, $("plants")); itemEls[k] = it;
  const hit = E("rect", { fill: "transparent" }, it);
  CLUSTERS[k].forEach(i => {
    const [x, kk] = STEMS[i], g = E("g", {}, it);
    g.style.transformOrigin = x + "px 205px";
    g.style.animation = `sway ${3.2 + (i % 3) * .7}s ease-in-out ${-i * 1.1}s infinite alternate`;
    E("path", { d: `M${x} 205 Q${x + 5} 140 ${x - 1} ${205 - 150 * kk}`, stroke: "#2f6e32", "stroke-width": 2.2, fill: "none", "stroke-linecap": "round" }, g);
    for (let y = 200, n = 0; y > 205 - 150 * kk; y -= 10, n++) {
      const top = y < 120, fill = top ? "url(#leafR)" : "url(#leafG)";
      const rx = 7.5 + (n % 3) * .4, ry = 3.2;
      E("ellipse", { cx: x - 7.5, cy: y, rx, ry, fill, stroke: top ? "#a84850" : "#2e7a28", "stroke-width": .35, opacity: .95, transform: `rotate(${-28 + (n % 2)} ${x - 7.5} ${y})` }, g);
      E("ellipse", { cx: x + 7.5, cy: y - 5, rx, ry, fill, stroke: top ? "#a84850" : "#2e7a28", "stroke-width": .35, opacity: .92, transform: `rotate(${26 - (n % 2)} ${x + 7.5} ${y - 5})` }, g);
      // midrib
      E("line", { x1: x - 3, y1: y, x2: x - 11, y2: y - .5, stroke: "#fff", "stroke-width": .3, opacity: .25 }, g);
    }
  });
  const b = it.getBBox(); Object.entries({ x: b.x, y: b.y, width: b.width, height: b.height }).forEach(([a, v]) => hit.setAttribute(a, v));
}

/* black lava stones piled on the left (4 + 3 + 1) */
const LAVA = [[40, 199, 12], [63, 200, 13], [87, 200, 12], [108, 201, 10], [51, 183, 11], [75, 182, 12], [97, 186, 9], [64, 167, 10]];
function lavaStone(g, cx, cy, r) {
  const n = 11, pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, rr = r * (.74 + R() * .34);
    pts.push([cx + Math.cos(a) * rr, Math.min(cy + Math.sin(a) * rr * .76, cy + r * .55)]);
  }
  // soft contact shadow on sand
  E("ellipse", { cx: cx.toFixed(1), cy: (cy + r * .48).toFixed(1), rx: (r * 1.2).toFixed(1), ry: (r * .38).toFixed(1), fill: "#000", opacity: .4 }, g);
  E("path", { d: "M" + pts.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L") + "Z", fill: "url(#lava)", stroke: "#050403", "stroke-width": .7, "stroke-linejoin": "round" }, g);
  // highlight blob
  E("ellipse", { cx: (cx - r * .28).toFixed(1), cy: (cy - r * .32).toFixed(1), rx: (r * .5).toFixed(1), ry: (r * .32).toFixed(1), fill: "url(#lavaHi)" }, g);
  // secondary edge light
  E("ellipse", { cx: (cx + r * .3).toFixed(1), cy: (cy - r * .1).toFixed(1), rx: (r * .22).toFixed(1), ry: (r * .14).toFixed(1), fill: "#fff", opacity: .08 }, g);
  // underside shade for volume
  E("ellipse", { cx: cx.toFixed(1), cy: (cy + r * .28).toFixed(1), rx: (r * .7).toFixed(1), ry: (r * .32).toFixed(1), fill: "#000", opacity: .35 }, g);
  // pores (dark pits) — denser
  for (let i = 0; i < 12; i++) {
    const a = R() * Math.PI * 2, d = R() * r * .7;
    const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * .72;
    const pr = .45 + R() * 1.5;
    E("circle", { cx: px.toFixed(1), cy: py.toFixed(1), r: pr.toFixed(2), fill: "#030202", opacity: .85 }, g);
    if (pr > .85) E("circle", { cx: (px - pr * .25).toFixed(1), cy: (py - pr * .25).toFixed(1), r: (pr * .4).toFixed(2), fill: "#4a4038", opacity: .5 }, g);
  }
  // rim highlights
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (1.0 + R() * .9), d = R() * r * .55;
    E("circle", { cx: (cx + Math.cos(a) * d).toFixed(1), cy: (cy + Math.sin(a) * d * .7).toFixed(1), r: (.4 + R() * .65).toFixed(2), fill: "#9a8e84", opacity: .55 }, g);
  }
}
{
  const it = E("g", { class: "item rock", "data-item": "r0" }, $("rocks")); itemEls.r0 = it;
  const g = E("g", {}, it);
  LAVA.forEach(([x, y, r]) => lavaStone(g, x, y, r));
  const att = E("g", { class: "att" }, it), ax = 66, ay = 158;
  // anubias — heartier leaf shapes with gradient
  [[-14, -10, -32, 10, 5.5], [0, -17, 2, 11, 6], [13, -10, 28, 10, 5.5], [-7, -3, -58, 8, 4.5], [8, -3, 52, 8, 4.5]].forEach(([dx, dy, rot, rx, ry]) => {
    E("ellipse", { cx: ax + dx, cy: ay + dy, rx, ry, fill: "url(#anubias)", stroke: "#163e1c", "stroke-width": .7, transform: `rotate(${rot} ${ax + dx} ${ay + dy})` }, att);
    E("line", { x1: ax + dx, y1: ay + dy + ry * .6, x2: ax + dx * .3, y2: ay + 2, stroke: "#1a4a22", "stroke-width": .6, opacity: .7 }, att);
  });
  // willow moss tufts
  [[51, 175, 9, 4], [97, 179, 7, 3], [40, 190, 9, 4], [87, 191, 9, 4], [110, 194, 6, 3]].forEach(([cx, cy, rx, ry]) => {
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (1 + R()), x = cx + Math.cos(a) * rx * (.4 + R() * .7), y = cy + Math.sin(a) * ry * (.4 + R() * .7);
      E("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: (1.4 + R() * 2.1).toFixed(2), fill: i % 3 ? "#3f8e35" : "#5cb048", opacity: .88 }, att);
    }
  });
}
ITEMS.forEach(k => { bbox[k] = itemEls[k].getBBox(); });
const YR = { r0: [-30, 15], p0: [-20, 15], p1: [-20, 15] };
function clampPos(k, dx, dy) { const b = bbox[k]; return [Math.round(clamp(dx, -b.x, W - b.x - b.width)), Math.round(clamp(dy, YR[k][0], YR[k][1]))]; }

/* rock obstacle approx (world space, uses current r0 pos) */
function rockAvoid(ox, oy, vx, vy) {
  if (!state.show.rocks) return [vx, vy];
  const [dx, dy] = state.pos.r0;
  const cx = 74 + dx, cy = 188 + dy, rw = 52, rh = 28;
  const nx = (ox - cx) / rw, ny = (oy - cy) / rh, d2 = nx * nx + ny * ny;
  if (d2 < 1.15 && d2 > 0.01) {
    const d = Math.sqrt(d2), push = (1.15 - d) * 40;
    return [vx + (nx / d) * push, vy + (ny / d) * push * .6];
  }
  return [vx, vy];
}

/* ---------- creatures ---------- */
const layers = { neon: $("fishes"), shrimp: $("shrimps"), cory: $("corys"), oto: $("otos") };
const crit = { neon: [], shrimp: [], cory: [], oto: [] };
const DRAW = {
  neon: g => {
    // translucent fins
    E("path", { d: "M-2 -3.8 Q2.5 -10 7 -3.4", fill: "url(#neonFin)", stroke: "#9ab8c8", "stroke-width": .35, opacity: .75 }, g);
    E("path", { d: "M-3.5 3.2 Q1.5 9 6 3.4", fill: "url(#neonFin)", stroke: "#9ab8c8", "stroke-width": .35, opacity: .6 }, g);
    const tail = E("g", { class: "tail" }, g);
    E("path", { d: "M-8.5 0 L-17 -6 L-14 0 L-17 6Z", fill: "url(#neonTail)", stroke: "#a8c8d8", "stroke-width": .3 }, tail);
    // soft cyan bloom behind body
    E("ellipse", { cx: 1, cy: -.3, rx: 11, ry: 5, fill: "#3ad8ff", opacity: .22 }, g);
    E("ellipse", { cx: 0, cy: 0, rx: 10.2, ry: 4.1, fill: "url(#neonBody)", stroke: "#6a90a4", "stroke-width": .4 }, g);
    // dorsal rim (volume)
    E("path", { d: "M-7 -2.8 Q0 -4.3 7.5 -2.6", fill: "none", stroke: "#4a7088", "stroke-width": .7, opacity: .55, "stroke-linecap": "round" }, g);
    // belly highlight
    E("ellipse", { cx: 1, cy: 1.6, rx: 6, ry: 1.4, fill: "#fff", opacity: .35 }, g);
    // subtle scale arcs
    for (let i = 0; i < 3; i++) E("path", { d: `M${-4 + i * 3.2} -1.8 Q${-2.5 + i * 3.2} 0 ${-4 + i * 3.2} 1.8`, fill: "none", stroke: "#fff", "stroke-width": .35, opacity: .2 }, g);
    // iridescent neon stripe + red (glow + core)
    E("path", { d: "M-6.5 -1.15 L9.2 -1.55", stroke: "#9ffffa", "stroke-width": 4.2, "stroke-linecap": "round", opacity: .55 }, g);
    E("path", { d: "M-6.5 -1.15 L9.2 -1.55", stroke: "#1ad4ff", "stroke-width": 2.1, "stroke-linecap": "round" }, g);
    E("path", { d: "M-8 1.75 L4 2.05", stroke: "#ff1038", "stroke-width": 2.15, "stroke-linecap": "round" }, g);
    E("path", { d: "M-8 1.75 L4 2.05", stroke: "#ff9aaa", "stroke-width": .8, "stroke-linecap": "round", opacity: .55 }, g);
    E("circle", { cx: 6.7, cy: -1, r: 1.3, fill: "#071018" }, g);
    E("circle", { cx: 7.15, cy: -1.4, r: .45, fill: "#fff", opacity: .85 }, g);
  },
  shrimp: g => {
    // legs group kept for animation hook but nearly invisible
    const legs = E("g", { class: "legs" }, g);
    E("path", { d: "M2 1.8 Q1.7 2.8 1.2 3.4", fill: "none", stroke: "#e87058", "stroke-width": .22, opacity: .22, "stroke-linecap": "round" }, legs);
    // smooth cherry-shrimp silhouette: round head, arched back, tapered abdomen
    E("path", {
      d: "M9.5 .6 C8.6 -2.6 5.2 -4.6 1.2 -4 C-2.5 -3.4 -5.2 -1.2 -6.4 1.6 C-7.2 3.2 -9.2 4 -11 2.8 C-10.5 4.5 -8.2 5 -5.8 4 C-2.2 2.6 2.8 2.4 6.8 1.8 C8.8 1.4 9.8 1 9.5 .6Z",
      fill: "url(#shrimpBody)", stroke: "#c44032", "stroke-width": .22, opacity: .82
    }, g);
    // soft arch highlight
    E("path", { d: "M7.8 -.6 Q2.5 -3.4 -3.5 .2", fill: "none", stroke: "#fff", "stroke-width": .45, opacity: .28, "stroke-linecap": "round" }, g);
    // long delicate antennae
    const ant = E("g", { class: "ant" }, g);
    E("path", { d: "M8.8 -1.3 Q17 -12 28 -10", fill: "none", stroke: "#d85040", "stroke-width": .28, "stroke-linecap": "round", opacity: .65 }, ant);
    E("path", { d: "M8.8 -.15 Q18 -6.5 29 -2.5", fill: "none", stroke: "#d85040", "stroke-width": .22, "stroke-linecap": "round", opacity: .5 }, ant);
    E("circle", { cx: 7.3, cy: -.85, r: .5, fill: "#1a0805" }, g);
    E("circle", { cx: 7.45, cy: -1.05, r: .15, fill: "#fff", opacity: .5 }, g);
  },
  cory: g => {
    E("path", { d: "M-9 0 L-14.5 -4.5 L-13.2 0 L-14.5 4.5Z", fill: "#b89a6e", opacity: .85 }, g);
    E("path", { d: "M-2 -4.5 L1.5 -10.5 L4.2 -4.2Z", fill: "url(#coryBody)", stroke: "#8a7048", "stroke-width": .3, opacity: .85 }, g);
    E("path", { d: "M-9.5 0 Q-6 -6.2 4 -5.2 Q10 -4 10.8 .4 Q9 3.8 4 4 L-9.5 2.4Z", fill: "url(#coryBody)", stroke: "#8a7048", "stroke-width": .4 }, g);
    E("path", { d: "M-7 2.2 Q0 4.6 8.5 3.2", stroke: "#f6ecd8", "stroke-width": 1.3, fill: "none", opacity: .8 }, g);
    [[-5, -2], [-1, -3], [2.5, -1.2], [-3, .2], [5, -2.8], [0, .5]].forEach(([x, y]) => E("ellipse", { cx: x, cy: y, rx: 1.1, ry: .85, fill: "#5a4a30", opacity: .85 }, g));
    E("circle", { cx: 7.2, cy: -1.8, r: 1.15, fill: "#123" }, g);
    E("circle", { cx: 7.5, cy: -2.1, r: .35, fill: "#fff", opacity: .7 }, g);
    E("path", { d: "M10.2 1.4 L13.5 3.6 M9.6 2.6 L12.5 5.2", stroke: "#7a6a4a", "stroke-width": .55, "stroke-linecap": "round" }, g);
  },
  oto: g => {
    E("path", { d: "M-8 0 L-12.5 -3.2 L-12.5 3.2Z", fill: "#8a7655", opacity: .8 }, g);
    E("path", { d: "M-8 0 Q-3 -3.4 5 -2.5 Q8.5 -1.4 9 0 Q8.5 1.4 5 2.5 Q-3 3.4 -8 0Z", fill: "url(#otoBody)", stroke: "#5a4a30", "stroke-width": .4 }, g);
    E("path", { d: "M-7.5 0 L8.5 0", stroke: "#2e2418", "stroke-width": 1.15, "stroke-linecap": "round" }, g);
    E("path", { d: "M-5 -2 Q2 -2.8 6 -1.5", fill: "none", stroke: "#fff", "stroke-width": .35, opacity: .25 }, g);
    E("circle", { cx: 6.3, cy: -1.15, r: .85, fill: "#111" }, g);
    E("circle", { cx: 6.55, cy: -1.4, r: .28, fill: "#fff", opacity: .65 }, g);
  }
};
function pickWander(o) { o.tx = rnd(20, 380); o.ty = rnd(35, 155); o.wt = rnd(2.5, 7); }
function spawn(kind) {
  const g = E("g", {}, layers[kind]); DRAW[kind](g);
  const x = rnd(30, 370), o = { g, x, y: 0, vx: 0, vy: 0, face: Math.random() < .5 ? 1 : -1, t: Math.random() * 10, ph: Math.random() * 6 };
  o.tail = g.querySelector(".tail");
  o.legs = g.querySelector(".legs");
  o.ant = g.querySelector(".ant");
  if (kind === "neon") {
    o.y = rnd(40, 150); o.sp = rnd(28, 50); o.vx = o.face * o.sp * .4; o.vy = rnd(-5, 5);
    o.dart = 0; o.pause = 0; pickWander(o);
  } else if (kind === "shrimp" || kind === "cory") {
    o.sp = kind === "cory" ? rnd(14, 20) : rnd(7, 11);
    o.mode = 0; o.timer = rnd(.5, 3); o.y = sandY(x);
    o.flip = 0; o.air = 0; // shrimp flip / cory air gulp
  } else {
    o.y = rnd(40, 180); o.ang = rnd(0, Math.PI * 2); o.sp = rnd(2, 4);
    o.timer = rnd(1, 5); o.moving = Math.random() < .5; o.surf = Math.random() < .4 ? "glass" : "free";
  }
  crit[kind].push(o);
}
function setCount(kind, n) { const a = crit[kind]; while (a.length < n) spawn(kind); while (a.length > n) a.pop().g.remove(); }

/* ---------- food ---------- */
const food = [], foodLayer = $("food");
function dropFood(x, y) {
  const n = 3 + (Math.random() * 3 | 0);
  for (let i = 0; i < n && food.length < 60; i++) {
    const fx = clamp(x + rnd(-6, 6), 4, 396), fy = clamp(Math.min(y, sandY(fx) - 3) + rnd(-3, 3), 4, 236);
    const el = E("circle", { r: rnd(1, 1.6).toFixed(2), fill: ["#c8642d", "#e0a040", "#9b4a22"][i % 3], class: "pellet" }, foodLayer);
    food.push({ x: fx, y: fy, vy: rnd(8, 14), el, landed: false, life: 20, ph: rnd(0, 6) });
  }
}
function eat(f) { const i = food.indexOf(f); if (i >= 0) { food.splice(i, 1); f.el.remove(); } }
function nearest(o, bottomOnly, maxD) {
  let best = null, bd = maxD || 1e9;
  for (const f of food) { if (bottomOnly && f.y < sandY(f.x) - 12) continue; const d = Math.hypot(f.x - o.x, f.y - o.y); if (d < bd) { bd = d; best = f; } }
  return best;
}

/* ---------- bubbles & particles ---------- */
const bubbles = [];
for (let i = 0; i < 12; i++) bubbles.push({ c: E("circle", { r: (1 + Math.random() * 2.4).toFixed(2), fill: "rgba(255,255,255,.12)", stroke: "#fff", "stroke-width": .7, opacity: .75 }, $("tbub")), x: 345 + Math.random() * 14, y: Math.random() * 240, v: 22 + Math.random() * 34, ph: rnd(0, 6) });
const particles = [];
for (let i = 0; i < 14; i++) {
  const c = E("circle", { r: (.4 + Math.random() * .7).toFixed(2), fill: "#dff6ff", opacity: (.15 + Math.random() * .25).toFixed(2) }, $("particles"));
  particles.push({ c, x: rnd(10, 390), y: rnd(20, 190), vx: rnd(-3, 3), vy: rnd(-4, -1), ph: rnd(0, 6) });
}
/* organic caustic light — irregular soft network in upper water, no tiling */
const caustSpots = [];
{
  const layer = $("caustics");
  // varied irregular washes + thin wisps (not a grid of similar circles)
  const blobs = [
    { d: "M0 0 C40 -35 95 -20 130 8 C150 30 100 45 55 40 C15 35 -30 20 0 0Z", x: 30, y: 34, base: .2, rot: -18 },
    { d: "M0 0 C55 -18 120 -40 175 5 C190 32 120 48 65 38 C25 30 -25 15 0 0Z", x: 175, y: 26, base: .17, rot: 12 },
    { d: "M0 0 C22 -30 60 -25 88 10 C95 32 50 40 10 28 C-15 18 -20 8 0 0Z", x: 330, y: 40, base: .15, rot: -8 },
    { d: "M0 0 C50 -12 90 -28 140 0 C155 22 100 40 45 34 C15 28 -20 12 0 0Z", x: 95, y: 58, base: .1, rot: 25 },
    { d: "M0 0 C18 -20 48 -12 70 6 C78 24 40 32 8 24 C-12 16 -15 6 0 0Z", x: 255, y: 50, base: .09, rot: -28 }
  ];
  // thin soft wisps connecting / crossing (organic network feel)
  const wisps = [
    { d: "M0 10 Q60 -8 130 12 T240 6", x: 50, y: 45, base: .08, rot: 0 },
    { d: "M0 8 Q80 25 160 5 T280 14", x: 90, y: 55, base: .06, rot: -3 },
    { d: "M0 5 Q50 -15 110 8", x: 220, y: 38, base: .07, rot: 5 }
  ];
  blobs.forEach((b, i) => {
    const g = E("g", {}, layer);
    E("path", { d: b.d, fill: "#fff" }, g);
    E("ellipse", { cx: "50", cy: "-6", rx: "28", ry: "12", fill: "#e8ffff", opacity: ".4" }, g);
    caustSpots.push({ g, x: b.x, y: b.y, vx: rnd(-2.8, 2.8), vy: rnd(-1.3, 1.3), ph: i * 1.1, base: b.base, rot: b.rot, spin: rnd(-2, 2) });
  });
  wisps.forEach((w, i) => {
    const g = E("g", {}, layer);
    E("path", { d: w.d, fill: "none", stroke: "#fff", "stroke-width": "14", "stroke-linecap": "round", opacity: ".55" }, g);
    caustSpots.push({ g, x: w.x, y: w.y, vx: rnd(-2, 2), vy: rnd(-.8, .8), ph: 3 + i, base: w.base, rot: w.rot, spin: rnd(-1.2, 1.2) });
  });
}

/* ---------- state apply / persist ---------- */
let state = DEF(), speed = 1;
const save = () => { try { localStorage.setItem(KEY, encode(state)); } catch (e) { /* storage unavailable */ } };
function curTime() {
  if (state.time !== "auto") return state.time;
  const h = new Date().getHours();
  return h >= 5 && h < 9 ? "morning" : h >= 9 && h < 16 ? "day" : h >= 16 && h < 19 ? "evening" : "night";
}
function applyTime() {
  const t = curTime(), fx = TIME_FX[t];
  $("tint").setAttribute("fill", fx.tint); $("tint").setAttribute("opacity", fx.op); $("rays").setAttribute("opacity", fx.rays);
  const ca = $("caustics"); if (ca) ca.setAttribute("opacity", fx.caust);
  document.body.dataset.time = t; speed = fx.speed;
  $("autoNow").textContent = state.time === "auto" ? `（いまは${TIME_LABEL[t]}）` : "";
}
function setPos(k, dx, dy) { state.pos[k] = clampPos(k, dx, dy); itemEls[k].setAttribute("transform", `translate(${state.pos[k][0]} ${state.pos[k][1]})`); }
function applyAll() {
  SHOW.forEach(k => { tank.classList.toggle("off-" + k, !state.show[k]); });
  document.querySelectorAll(".toggles button").forEach(b => b.setAttribute("aria-pressed", String(state.show[b.dataset.l])));
  KINDS.forEach(k => { setCount(k, state.n[k]); $("o-" + k).textContent = state.n[k]; const s = $("s-" + k); if (s) s.value = state.n[k]; });
  ITEMS.forEach(k => setPos(k, state.pos[k][0], state.pos[k][1]));
  const sd = SANDS[state.sand].c, bg = BGS[state.bg].c;
  $("sd0").setAttribute("stop-color", sd[0]); $("sd1").setAttribute("stop-color", sd[1]);
  $("wg0").setAttribute("stop-color", bg[0]); $("wg1").setAttribute("stop-color", bg[1]);
  document.querySelectorAll("#seg-time button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.time)));
  document.querySelectorAll("#seg-sand button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === state.sand)));
  document.querySelectorAll("#seg-bg button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === state.bg)));
  applyTime();
}
function loadInitial() {
  const m = location.hash.match(/^#t=([-0-9.]+)$/);
  if (m) { const s = decode(m[1]); if (s) { history.replaceState(null, "", location.pathname + location.search); return [s, "hash"]; } }
  try { const v = localStorage.getItem(KEY); const s = v && decode(v); if (s) return [s, "storage"]; } catch (e) { /* ignore */ }
  return [DEF(), "default"];
}

/* ---------- UI ---------- */
function seg(id, list, val) { const box = $(id); list.forEach((it, i) => { const b = document.createElement("button"); b.type = "button"; b.dataset.v = val(it, i); if (it.c) { const sw = document.createElement("span"); sw.className = "sw"; sw.style.background = `linear-gradient(${it.c[0]},${it.c[1]})`; b.appendChild(sw); } b.appendChild(document.createTextNode(it.name || it)); box.appendChild(b); }); }
seg("seg-time", TIMES.map(t => TIME_LABEL[t]), (_, i) => TIMES[i]);
seg("seg-sand", SANDS, (_, i) => i);
seg("seg-bg", BGS, (_, i) => i);
const changed = () => { applyAll(); save(); };
document.querySelectorAll(".toggles button").forEach(b => b.addEventListener("click", () => { state.show[b.dataset.l] = !state.show[b.dataset.l]; changed(); }));
document.querySelectorAll(".sl input").forEach(s => s.addEventListener("input", () => { state.n[s.dataset.k] = clamp(+s.value, ...LIMITS[s.dataset.k]); changed(); }));
document.querySelectorAll(".pm button").forEach(b => b.addEventListener("click", () => { const k = b.dataset.c; state.n[k] = clamp(state.n[k] + +b.dataset.d, ...LIMITS[k]); changed(); }));
$("seg-time").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { state.time = b.dataset.v; changed(); } });
$("seg-sand").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { state.sand = +b.dataset.v; changed(); } });
$("seg-bg").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { state.bg = +b.dataset.v; changed(); } });
$("resetPos").addEventListener("click", () => { ITEMS.forEach(k => { state.pos[k] = [0, 0]; }); changed(); flash("配置を元に戻したよ"); });
let msgT;
function flash(t) { $("msg").textContent = t; clearTimeout(msgT); msgT = setTimeout(() => { $("msg").textContent = ""; }, 2500); }
$("reset").addEventListener("click", () => { state = DEF(); try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } applyAll(); $("shareOut").hidden = true; flash("リセットしたよ"); });
$("share").addEventListener("click", async () => {
  const url = location.origin + location.pathname + "#t=" + encode(state), out = $("shareOut");
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
    try { out.hidden = false; out.value = url; out.select(); ok = document.execCommand("copy"); } catch (e2) { ok = false; }
  }
  out.value = url;
  if (ok) { out.hidden = true; flash("コピーしたよ！"); $("share").textContent = "コピーしました ✓"; setTimeout(() => { $("share").textContent = "共有URLをコピー"; }, 2000); }
  else { out.hidden = false; out.select(); flash("このURLをコピーしてね"); }
});
const panel = $("panel"), openBtn = $("openPanel");
function setPanel(open) { panel.hidden = !open; document.body.classList.toggle("panel-open", open); openBtn.setAttribute("aria-expanded", String(open)); if (open) $("closePanel").focus(); }
openBtn.addEventListener("click", () => setPanel(panel.hidden));
$("closePanel").addEventListener("click", () => { setPanel(false); openBtn.focus(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) { setPanel(false); openBtn.focus(); } });
window.addEventListener("hashchange", () => { const m = location.hash.match(/^#t=([-0-9.]+)$/); const s = m && decode(m[1]); if (s) { state = s; history.replaceState(null, "", location.pathname + location.search); changed(); } });

/* ---------- drag vs tap-to-feed ---------- */
let ptr = null;
function toSvg(e) { const p = tank.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(tank.getScreenCTM().inverse()); }
tank.addEventListener("pointerdown", e => {
  if (e.button > 0 || ptr) return;
  const it = e.target.closest(".item"), k = it ? it.dataset.item : null;
  ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, p0: toSvg(e), item: k, start: k ? state.pos[k].slice() : null, drag: false, t: performance.now() };
  try { tank.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  e.preventDefault();
});
tank.addEventListener("pointermove", e => {
  if (!ptr || e.pointerId !== ptr.id || !ptr.item) return;
  if (!ptr.drag && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 4) { ptr.drag = true; tank.classList.add("dragging"); }
  if (ptr.drag) { const p = toSvg(e); setPos(ptr.item, ptr.start[0] + p.x - ptr.p0.x, ptr.start[1] + p.y - ptr.p0.y); }
});
function endPtr(e, cancel) {
  if (!ptr || e.pointerId !== ptr.id) return;
  const moved = Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy);
  if (ptr.drag) save();
  else if (!cancel && !ptr.item && moved < 10 && performance.now() - ptr.t < 800) dropFood(ptr.p0.x, ptr.p0.y);
  ptr = null; tank.classList.remove("dragging");
}
tank.addEventListener("pointerup", e => endPtr(e, false));
tank.addEventListener("pointercancel", e => endPtr(e, true));

/* ---------- simulation ---------- */
function stepNeon(o, dt, sp, canEat, flock) {
  // occasional pause / dart
  if (o.pause > 0) { o.pause -= dt; o.vx *= .92; o.vy *= .92; }
  else if (o.dart > 0) { o.dart -= dt; }
  else if (!canEat || !nearest(o, false, 80)) {
    if (Math.random() < dt * .08) o.pause = rnd(.3, 1.1);
    else if (Math.random() < dt * .12) { o.dart = rnd(.25, .55); const a = rnd(0, Math.PI * 2); o.vx += Math.cos(a) * 70; o.vy += Math.sin(a) * 40; }
  }

  const f = canEat ? nearest(o, false) : null;
  let ax = 0, ay = 0, s = o.sp * sp;

  if (f) {
    const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy) || 1;
    s *= 1.1;
    ax += (dx / d) * s * 2.2; ay += (dy / d) * s * 1.4;
  } else {
    o.wt -= dt;
    if (o.wt <= 0 || Math.hypot(o.tx - o.x, o.ty - o.y) < 10) pickWander(o);
    // soft wander
    const dx = o.tx - o.x, dy = o.ty + Math.sin(o.t * 1.2 + o.ph) * 5 - o.y, d = Math.hypot(dx, dy) || 1;
    ax += (dx / d) * s * .55; ay += (dy / d) * s * .35;
    // boids
    let sx = 0, sy = 0, cx = 0, cy = 0, axv = 0, ayv = 0, nSep = 0, nCoh = 0;
    for (let i = 0; i < flock.length; i++) {
      const n = flock[i]; if (n === o) continue;
      const ddx = o.x - n.x, ddy = o.y - n.y, dist = Math.hypot(ddx, ddy);
      if (dist < 16 && dist > 0) { sx += ddx / dist; sy += ddy / dist; nSep++; }
      if (dist < 48) { cx += n.x; cy += n.y; axv += n.vx; ayv += n.vy; nCoh++; }
    }
    if (nSep) { ax += (sx / nSep) * 55; ay += (sy / nSep) * 40; }
    if (nCoh) {
      ax += ((cx / nCoh - o.x) * .35); ay += ((cy / nCoh - o.y) * .25);
      ax += ((axv / nCoh - o.vx) * .4); ay += ((ayv / nCoh - o.vy) * .35);
    }
  }

  // glass / surface / sand avoidance
  if (o.x < 25) ax += (25 - o.x) * 3;
  if (o.x > 375) ax -= (o.x - 375) * 3;
  if (o.y < 28) ay += (28 - o.y) * 2.5;
  const bot = sandY(o.x) - 10; if (o.y > bot) ay -= (o.y - bot) * 4;

  let [rvx, rvy] = rockAvoid(o.x, o.y, o.vx + ax * dt, o.vy + ay * dt);
  // smooth accel toward desired
  const spd = Math.hypot(rvx, rvy), maxS = s * (o.dart > 0 ? 1.8 : o.pause > 0 ? .35 : 1.15);
  if (spd > maxS) { rvx = rvx / spd * maxS; rvy = rvy / spd * maxS; }
  o.vx = rvx; o.vy = rvy;
  o.x = clamp(o.x + o.vx * dt, 8, 392);
  o.y = clamp(o.y + o.vy * dt, 18, sandY(o.x) - 6);

  if (f && Math.hypot(f.x - o.x, f.y - o.y) < 5) eat(f);
  if (Math.abs(o.vx) > 2) o.face = o.vx > 0 ? 1 : -1;

  // body pitch + tail beat tied to speed
  const curSp = Math.hypot(o.vx, o.vy);
  const pitch = clamp(o.vy * .35, -12, 12);
  const beat = Math.sin(o.t * (10 + curSp * .25) + o.ph) * (5 + Math.min(10, curSp * .2));
  if (o.tail) o.tail.setAttribute("transform", `rotate(${beat.toFixed(1)})`);
  o.g.setAttribute("transform", `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) rotate(${(o.face * pitch).toFixed(1)}) scale(${o.face} 1)`);
}

function stepShrimp(o, dt, sp, canEat) {
  const f = canEat ? nearest(o, true, 160) : null;
  // occasional short swim / backflip
  if (o.flip > 0) {
    o.flip -= dt;
    o.y = sandY(o.x) - .5 - Math.sin((1 - o.flip / o.flipMax) * Math.PI) * 14;
    o.x += o.face * o.sp * 1.8 * sp * dt;
    if (o.ant) o.ant.setAttribute("transform", `rotate(${(Math.sin(o.t * 20) * 12).toFixed(1)} 8.8 -1)`);
  } else if (f) {
    o.face = f.x > o.x ? 1 : -1;
    if (Math.abs(f.x - o.x) > 2) o.x += o.face * o.sp * 1.5 * sp * dt;
    if (Math.abs(f.x - o.x) < 5 && f.y > sandY(f.x) - 8) eat(f);
    o.mode = 1; o.y = sandY(o.x) - .5;
  } else {
    o.timer -= dt;
    if (o.timer <= 0) {
      if (Math.random() < .12) { o.flip = o.flipMax = rnd(.45, .8); o.face = Math.random() < .5 ? 1 : -1; o.timer = rnd(2, 5); }
      else { o.mode = 1 - o.mode; o.timer = o.mode ? rnd(1.2, 2.8) : rnd(1.2, 3.5); if (o.mode && Math.random() < .45) o.face *= -1; }
    }
    if (o.mode) o.x += o.face * o.sp * sp * dt;
    // pick-at substrate bob
    const pick = o.mode ? 0 : Math.abs(Math.sin(o.t * 6 + o.ph)) * 1.2;
    o.y = sandY(o.x) - .5 - pick;
  }
  if (o.x < 12) { o.x = 12; o.face = 1; } if (o.x > 388) { o.x = 388; o.face = -1; }
  // leg / antenna flick
  if (o.legs) o.legs.setAttribute("transform", `rotate(${(Math.sin(o.t * (o.mode || o.flip > 0 ? 10 : 4) + o.ph) * 4).toFixed(1)})`);
  if (o.ant && o.flip <= 0) o.ant.setAttribute("transform", `rotate(${(Math.sin(o.t * 3.5 + o.ph) * 8).toFixed(1)} 8.8 -1)`);
  const tilt = o.flip > 0 ? Math.sin((1 - o.flip / o.flipMax) * Math.PI) * 50 * o.face : 0;
  o.g.setAttribute("transform", `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) rotate(${tilt.toFixed(1)}) scale(${o.face} 1)`);
}

function stepCory(o, dt, sp, canEat) {
  const f = canEat ? nearest(o, true, 160) : null;
  if (o.air > 0) {
    o.air -= dt;
    const u = 1 - o.air / o.airMax;
    if (u < .45) { o.y -= 55 * sp * dt; o.x += o.face * 18 * sp * dt; }
    else { o.y += 40 * sp * dt; }
    o.y = clamp(o.y, 30, sandY(o.x) - 4);
  } else if (f) {
    o.face = f.x > o.x ? 1 : -1;
    if (Math.abs(f.x - o.x) > 2) o.x += o.face * o.sp * 1.5 * sp * dt;
    if (Math.abs(f.x - o.x) < 5 && f.y > sandY(f.x) - 8) eat(f);
    o.mode = 1; o.y = sandY(o.x) - 4;
  } else {
    o.timer -= dt;
    if (o.timer <= 0) {
      if (Math.random() < .1) { o.air = o.airMax = rnd(1.1, 1.8); o.timer = rnd(4, 9); }
      else { o.mode = 1 - o.mode; o.timer = o.mode ? rnd(1.5, 3) : rnd(1.5, 4); if (o.mode && Math.random() < .4) o.face *= -1; }
    }
    if (o.mode) o.x += o.face * o.sp * sp * dt;
    // rooting shake when idle
    const root = !o.mode ? Math.sin(o.t * 18) * .8 : 0;
    const hop = o.mode ? Math.abs(Math.sin(o.t * 4)) * 1.5 : 0;
    o.y = sandY(o.x) - 4 - hop;
    o.x += root * dt * 8;
  }
  if (o.x < 12) { o.x = 12; o.face = 1; } if (o.x > 388) { o.x = 388; o.face = -1; }
  const pitch = o.air > 0 ? clamp((30 - o.y) * .2, -25, 35) : 0;
  o.g.setAttribute("transform", `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) rotate(${(o.face * pitch).toFixed(1)}) scale(${o.face} 1)`);
}

function stepOto(o, dt, sp) {
  o.timer -= dt;
  if (o.timer <= 0) {
    o.moving = !o.moving;
    o.timer = o.moving ? rnd(1.5, 4) : rnd(2, 7);
    if (o.moving) {
      // prefer glass edges or free graze
      if (Math.random() < .35) { o.surf = "glass"; o.ang = Math.random() < .5 ? 0 : Math.PI; o.y = rnd(40, 160); o.x = o.ang < 1 ? 12 : 388; }
      else { o.surf = "free"; o.ang += rnd(-1.4, 1.4); }
    }
  }
  if (o.moving) {
    if (o.surf === "glass") {
      // slide along front glass (x locked near edge, move in y)
      const edge = o.x < 200 ? 12 : 388;
      o.x += (edge - o.x) * .08;
      o.y += Math.sin(o.ang) * o.sp * 1.3 * sp * dt;
      o.ang += rnd(-.4, .4) * dt;
    } else {
      o.x += Math.cos(o.ang) * o.sp * sp * dt;
      o.y += Math.sin(o.ang) * o.sp * sp * dt;
    }
  } else {
    // graze micro-wiggle
    o.x += Math.sin(o.t * 4 + o.ph) * .4 * dt * 6;
    o.y += Math.cos(o.t * 3.2 + o.ph) * .3 * dt * 5;
  }
  if (o.x < 10 || o.x > 390) { o.ang = Math.PI - o.ang; o.x = clamp(o.x, 10, 390); o.surf = "glass"; }
  const bot = sandY(o.x) - 6; if (o.y < 28 || o.y > bot) { o.ang = -o.ang; o.y = clamp(o.y, 28, bot); }
  // soft rock attraction when near pile
  if (state.show.rocks) {
    const [dx, dy] = state.pos.r0, rcx = 74 + dx, rcy = 175 + dy;
    if (Math.hypot(o.x - rcx, o.y - rcy) < 40 && Math.random() < dt * .3) {
      o.ang = Math.atan2(rcy - o.y, rcx - o.x) + rnd(-.5, .5);
    }
  }
  o.g.setAttribute("transform", `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) rotate(${(o.ang * 180 / Math.PI).toFixed(1)})`);
}

let last = performance.now(), caustT = 0, surfT = 0;
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  caustT += dt * speed; surfT += dt * speed;

  // animate surface wave
  const surf = $("surface");
  if (surf) {
    const y1 = (6 + Math.sin(surfT * 1.1) * 1.2).toFixed(1);
    const y2 = (5 + Math.cos(surfT * .9) * 1.4).toFixed(1);
    surf.setAttribute("d", `M0 ${y1} Q50 ${(3 + Math.sin(surfT * 1.3)).toFixed(1)} 100 ${(7 + Math.cos(surfT)).toFixed(1)} T200 ${y2} T300 ${(8 + Math.sin(surfT * .7)).toFixed(1)} T400 ${(4 + Math.cos(surfT * 1.1)).toFixed(1)}`);
  }

  for (let i = food.length - 1; i >= 0; i--) {
    const f = food[i];
    if (!f.landed) { f.y += f.vy * dt; f.x = clamp(f.x + Math.sin(f.y / 8 + f.ph) * 3 * dt, 2, 398); const b = sandY(f.x) - 1; if (f.y >= b) { f.y = b; f.landed = true; } }
    else { f.life -= dt; if (f.life <= 0) { eat(f); continue; } if (f.life < 3) f.el.setAttribute("opacity", (f.life / 3).toFixed(2)); }
    f.el.setAttribute("cx", f.x.toFixed(1)); f.el.setAttribute("cy", f.y.toFixed(1));
  }
  for (const k of KINDS) for (const o of crit[k]) o.t += dt;
  const flock = crit.neon;
  crit.neon.forEach(o => stepNeon(o, dt, speed, state.show.fish, flock));
  crit.shrimp.forEach(o => stepShrimp(o, dt, speed, state.show.shrimp));
  crit.cory.forEach(o => stepCory(o, dt, speed, true));
  crit.oto.forEach(o => stepOto(o, dt, speed));
  bubbles.forEach(o => {
    o.y -= o.v * dt * speed;
    if (o.y < -5) { o.y = 240; o.x = 345 + Math.random() * 14; }
    o.c.setAttribute("cx", (o.x + Math.sin(o.y / 10 + o.ph) * 2.5).toFixed(1));
    o.c.setAttribute("cy", o.y.toFixed(1));
  });
  particles.forEach(p => {
    p.x += (p.vx + Math.sin(p.ph + caustT) * 2) * dt;
    p.y += p.vy * dt;
    if (p.y < 10 || p.x < 0 || p.x > 400) { p.y = rnd(160, 200); p.x = rnd(10, 390); }
    p.c.setAttribute("cx", p.x.toFixed(1)); p.c.setAttribute("cy", p.y.toFixed(1));
  });
  caustSpots.forEach(s => {
    s.x += s.vx * dt * speed;
    s.y += s.vy * dt * speed;
    s.rot += s.spin * dt;
    if (s.x < -50 || s.x > 450) s.vx *= -1;
    if (s.y < 10) { s.y = 10; s.vy = Math.abs(s.vy); }
    if (s.y > 85) { s.y = 85; s.vy = -Math.abs(s.vy); }
    const pulse = s.base * (.75 + .25 * Math.sin(caustT * .35 + s.ph));
    s.g.setAttribute("transform", `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.rot.toFixed(1)})`);
    s.g.setAttribute("opacity", pulse.toFixed(3));
  });
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
const [init, from] = loadInitial();
state = init; applyAll(); if (from === "hash") save();
setInterval(() => { if (state.time === "auto") applyTime(); }, 60000);
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();

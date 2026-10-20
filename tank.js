/* shingo's tank — self-contained, no external requests. */
(() => {
"use strict";
const NS = "http://www.w3.org/2000/svg";
const $ = id => document.getElementById(id);
const E = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const W = 400;
function seeded(s) { return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// y of the sand surface (matches the #sand path)
function sandY(x) { x = clamp(x, 0, 400); let t, a, c, b; if (x <= 200) { t = x / 200; a = 205; c = 192; b = 200; } else { t = (x - 200) / 200; a = 200; c = 208; b = 198; } const u = 1 - t; return u * u * a + 2 * t * u * c + t * t * b; }

/* ---------- presets & state ---------- */
const TIMES = ["auto", "morning", "day", "evening", "night"];
const TIME_LABEL = { auto: "自動", morning: "朝", day: "昼", evening: "夕", night: "夜" };
const TIME_FX = {
  morning: { tint: "#ffb37a", op: .14, rays: .32, speed: .8 },
  day: { tint: "#ffffff", op: 0, rays: .25, speed: 1 },
  evening: { tint: "#ff6a2a", op: .26, rays: .14, speed: .75 },
  night: { tint: "#06122e", op: .55, rays: .03, speed: .4 }
};
const SANDS = [{ name: "ソイル", c: ["#5a4a3c", "#2e251d"] }, { name: "川砂", c: ["#d9c49a", "#a88c5c"] }, { name: "黒砂", c: ["#4a4a4e", "#141416"] }, { name: "白砂", c: ["#f4efe4", "#cbc3b0"] }];
const BGS = [{ name: "澄んだ水", c: ["#bfeefa", "#3c9fc4"] }, { name: "グリーン", c: ["#d6f2d0", "#4f9a74"] }, { name: "ディープ", c: ["#a9d4f2", "#1d4f8a"] }, { name: "ブラックウォーター", c: ["#f1e2b8", "#8f6a38"] }];
const ITEMS = ["r0", "r1", "r2", "p0", "p1"];
const KINDS = ["neon", "shrimp", "cory", "oto"];
const LIMITS = { neon: [0, 20], shrimp: [0, 10], cory: [0, 6], oto: [0, 6] };
const SHOW = ["fish", "shrimp", "plants", "rocks"];
const KEY = "shingo-tank-v1";
const DEF = () => ({ show: { fish: true, shrimp: true, plants: true, rocks: true }, n: { neon: 5, shrimp: 2, cory: 0, oto: 0 }, time: "day", sand: 0, bg: 0, pos: { r0: [0, 0], r1: [0, 0], r2: [0, 0], p0: [0, 0], p1: [0, 0] } });

// compact format: 1.flags.neon.shrimp.cory.oto.time.sand.bg.(dx.dy)x5, trailing zeros trimmed
function encode(s) {
  const f = SHOW.reduce((m, k, i) => m | (s.show[k] ? 1 << i : 0), 0);
  const a = [1, f, s.n.neon, s.n.shrimp, s.n.cory, s.n.oto, TIMES.indexOf(s.time), s.sand, s.bg];
  ITEMS.forEach(k => a.push(Math.round(s.pos[k][0]), Math.round(s.pos[k][1])));
  while (a.length > 9 && a[a.length - 1] === 0) a.pop();
  return a.join(".");
}
function decode(str) {
  if (typeof str !== "string" || !/^1(\.-?\d{1,4}){0,19}$/.test(str)) return null;
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
const STEMS = [[22, .95], [38, 1], [54, .9], [70, 1.05], [86, .85], [102, .75], [30, .7], [62, .8]];
const CLUSTERS = { p0: [0, 1, 2, 6], p1: [3, 4, 5, 7] };
for (const k of ["p0", "p1"]) {
  const it = E("g", { class: "item hygro", "data-item": k }, $("plants")); itemEls[k] = it;
  const hit = E("rect", { fill: "transparent" }, it);
  CLUSTERS[k].forEach(i => {
    const [x, kk] = STEMS[i], g = E("g", {}, it);
    g.style.transformOrigin = x + "px 205px"; g.style.animation = `sway ${3 + i % 3}s ease-in-out ${-i}s infinite alternate`;
    E("path", { d: `M${x} 205 Q${x + 6} 130 ${x} ${205 - 150 * kk}`, stroke: "#3f8a3a", "stroke-width": 2.5, fill: "none" }, g);
    for (let y = 200; y > 205 - 150 * kk; y -= 11) {
      E("ellipse", { cx: x - 7, cy: y, rx: 7, ry: 3, fill: y < 120 ? "#d98b8b" : "#6fbf5a", transform: `rotate(-25 ${x - 7} ${y})` }, g);
      E("ellipse", { cx: x + 7, cy: y - 5, rx: 7, ry: 3, fill: y < 120 ? "#d98b8b" : "#5aae4a", transform: `rotate(25 ${x + 7} ${y - 5})` }, g);
    }
  });
  const b = it.getBBox(); Object.entries({ x: b.x, y: b.y, width: b.width, height: b.height }).forEach(([a, v]) => hit.setAttribute(a, v));
}
const ROCK = {
  r0: g => { E("path", { d: "M150 210 L165 140 Q185 115 205 128 L235 150 L250 210Z", fill: "url(#fz)" }, g); E("path", { d: "M165 150 L190 180 M200 135 L215 175", stroke: "#5c574e", "stroke-width": 2, fill: "none" }, g); },
  r1: g => { E("ellipse", { cx: 146, cy: 205, rx: 24, ry: 16, fill: "url(#fz)" }, g); E("path", { d: "M138 198 L150 206", stroke: "#5c574e", "stroke-width": 1.5, fill: "none" }, g); },
  r2: g => { E("ellipse", { cx: 256, cy: 206, rx: 20, ry: 13, fill: "url(#fz)" }, g); E("path", { d: "M252 201 L262 208", stroke: "#5c574e", "stroke-width": 1.5, fill: "none" }, g); }
};
const ATT = { r0: { an: [186, 132], mo: [200, 185, 42, 40], col: "#4c9a3c", extra: true }, r1: { an: [144, 191], mo: [146, 200, 22, 10], col: "#5fae48" }, r2: { an: [256, 195], mo: [256, 202, 18, 8], col: "#3d8530" } };
for (const k of ["r0", "r1", "r2"]) {
  const it = E("g", { class: "item rock", "data-item": k }, $("rocks")); itemEls[k] = it;
  const inner = E("g", { transform: "translate(-25 0)" }, it);
  ROCK[k](E("g", {}, inner));
  const att = E("g", { class: "att" }, inner), A = ATT[k], [ax, ay] = A.an;
  [[-14, -10, -30], [0, -16, 0], [13, -10, 30], [-6, -4, -60], [8, -4, 55]].forEach(([dx, dy, r]) => E("ellipse", { cx: ax + dx, cy: ay + dy, rx: 9, ry: 5, fill: "#2f7a3a", stroke: "#1f5a28", "stroke-width": .8, transform: `rotate(${r} ${ax + dx} ${ay + dy})` }, att));
  const [cx, cy, rx, ry] = A.mo;
  for (let i = 0; i < 30; i++) { const a = Math.PI * (1 + R()), r = .85 + R() * .2, x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r + (A.extra ? R() * 20 : 0); E("circle", { cx: x.toFixed(1), cy: Math.min(y, 208).toFixed(1), r: (2.5 + R() * 3).toFixed(2), fill: A.col, opacity: .9 }, att); }
}
ITEMS.forEach(k => { bbox[k] = itemEls[k].getBBox(); });
const YR = { r0: [-30, 15], r1: [-30, 15], r2: [-30, 15], p0: [-20, 15], p1: [-20, 15] };
function clampPos(k, dx, dy) { const b = bbox[k]; return [Math.round(clamp(dx, -b.x, W - b.x - b.width)), Math.round(clamp(dy, YR[k][0], YR[k][1]))]; }

/* ---------- creatures ---------- */
const layers = { neon: $("fishes"), shrimp: $("shrimps"), cory: $("corys"), oto: $("otos") };
const crit = { neon: [], shrimp: [], cory: [], oto: [] };
const DRAW = {
  neon: g => { E("path", { d: "M-9 0 L-15 -5 L-15 5Z", fill: "#cfe6f0" }, g); E("ellipse", { cx: 0, cy: 0, rx: 10, ry: 4, fill: "#e8f3f7" }, g); E("path", { d: "M-6 -1 L9 -1.5", stroke: "#2fe0ff", "stroke-width": 2.4, "stroke-linecap": "round" }, g); E("path", { d: "M-8 1.8 L3 2", stroke: "#ff3b4a", "stroke-width": 2.2, "stroke-linecap": "round" }, g); E("circle", { cx: 6.5, cy: -1, r: 1.2, fill: "#123" }, g); },
  shrimp: g => { E("path", { d: "M-7 0 Q0 -6 7 -1 L9 2 Q0 3 -7 2Z", fill: "#e8573f" }, g); E("path", { d: "M7 -1 L15 -7 M7 0 L16 -4", stroke: "#e8573f", "stroke-width": .6 }, g); E("circle", { cx: 6, cy: -1, r: .9, fill: "#111" }, g); },
  cory: g => { E("path", { d: "M-9 0 L-14 -4.5 L-13 0 L-14 4.5Z", fill: "#bfa77c" }, g); E("path", { d: "M-2 -4.6 L1.5 -10 L4 -4.4Z", fill: "#bfa77c" }, g); E("path", { d: "M-9.5 0 Q-6 -6 4 -5 Q9.5 -4 10.5 .5 Q9 3.6 4 3.8 L-9.5 2.2Z", fill: "#dcc8a0" }, g); E("path", { d: "M-7 2 Q0 4.4 8 3", stroke: "#f3e8d0", "stroke-width": 1.2, fill: "none" }, g); [[-5, -2], [-1, -3], [2, -1], [-3, 0], [5, -3]].forEach(([x, y]) => E("circle", { cx: x, cy: y, r: .9, fill: "#6b5a3e" }, g)); E("circle", { cx: 7, cy: -1.8, r: 1.1, fill: "#123" }, g); E("path", { d: "M10 1.5 L13 3.5 M9.5 2.6 L12 5", stroke: "#8a7a5a", "stroke-width": .5 }, g); },
  oto: g => { E("path", { d: "M-8 0 L-12 -3 L-12 3Z", fill: "#9c8762" }, g); E("path", { d: "M-8 0 Q-3 -3.2 5 -2.4 Q8 -1.5 8.5 0 Q8 1.5 5 2.4 Q-3 3.2 -8 0Z", fill: "#c2ad85" }, g); E("path", { d: "M-8 0 L8 0", stroke: "#3b2f22", "stroke-width": 1.1, "stroke-linecap": "round" }, g); E("circle", { cx: 6, cy: -1.2, r: .8, fill: "#111" }, g); }
};
function pickWander(o) { o.tx = rnd(15, 385); o.ty = rnd(30, 165); o.wt = rnd(3, 8); }
function spawn(kind) {
  const g = E("g", {}, layers[kind]); DRAW[kind](g);
  const x = rnd(30, 370), o = { g, x, y: 0, vx: 0, vy: 0, face: Math.random() < .5 ? 1 : -1, t: Math.random() * 10, ph: Math.random() * 6 };
  if (kind === "neon") { o.y = rnd(40, 150); o.sp = rnd(30, 55); o.vx = o.face * o.sp * .5; pickWander(o); }
  else if (kind === "shrimp" || kind === "cory") { o.sp = kind === "cory" ? rnd(14, 20) : rnd(7, 11); o.mode = 0; o.timer = rnd(.5, 3); o.y = sandY(x); }
  else { o.y = rnd(40, 180); o.ang = rnd(0, Math.PI * 2); o.sp = rnd(2, 4); o.timer = rnd(1, 5); o.moving = Math.random() < .5; }
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

/* ---------- bubbles ---------- */
const bubbles = [];
for (let i = 0; i < 10; i++) bubbles.push({ c: E("circle", { r: (1 + Math.random() * 2.5).toFixed(2), fill: "none", stroke: "#fff", "stroke-width": .8, opacity: .8 }, $("tbub")), x: 345 + Math.random() * 12, y: Math.random() * 240, v: 24 + Math.random() * 36 });

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

/* ---------- simulation (delta-time based) ---------- */
function stepNeon(o, dt, sp, canEat) {
  const f = canEat ? nearest(o, false) : null;
  let tx, ty, s = o.sp * sp;
  if (f) { tx = f.x; ty = f.y; s *= 1.7; }
  else { o.wt -= dt; if (o.wt <= 0 || Math.hypot(o.tx - o.x, o.ty - o.y) < 8) pickWander(o); tx = o.tx; ty = o.ty + Math.sin(o.t * 1.5 + o.ph) * 6; }
  const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, dt * (f ? 4 : 1.5));
  o.vx += (dx / d * s - o.vx) * k; o.vy += (dy / d * s * .6 - o.vy) * k;
  o.x = clamp(o.x + o.vx * dt, 5, 395); o.y = clamp(o.y + o.vy * dt, 15, sandY(o.x) - 6);
  if (f && Math.hypot(f.x - o.x, f.y - o.y) < 5) eat(f);
  if (Math.abs(o.vx) > 3) o.face = o.vx > 0 ? 1 : -1;
  o.g.setAttribute("transform", `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) scale(${o.face} 1)`);
}
function stepBottom(o, dt, sp, canEat, lift) {
  const f = canEat ? nearest(o, true, 160) : null;
  if (f) { o.face = f.x > o.x ? 1 : -1; if (Math.abs(f.x - o.x) > 2) o.x += o.face * o.sp * 1.5 * sp * dt; if (Math.abs(f.x - o.x) < 5 && f.y > sandY(f.x) - 8) eat(f); o.mode = 1; }
  else {
    o.timer -= dt;
    if (o.timer <= 0) { o.mode = 1 - o.mode; o.timer = o.mode ? rnd(1.5, 3) : rnd(1, 3); if (o.mode && Math.random() < .4) o.face *= -1; }
    if (o.mode) o.x += o.face * o.sp * sp * dt;
  }
  if (o.x < 12) { o.x = 12; o.face = 1; } if (o.x > 388) { o.x = 388; o.face = -1; }
  const hop = lift && o.mode ? Math.abs(Math.sin(o.t * 4)) * 1.5 : 0;
  o.y = sandY(o.x) - lift - hop;
  o.g.setAttribute("transform", `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) scale(${o.face} 1)`);
}
function stepOto(o, dt, sp) {
  o.timer -= dt;
  if (o.timer <= 0) { o.moving = !o.moving; o.timer = o.moving ? rnd(1.5, 4) : rnd(2, 6); if (o.moving) o.ang += rnd(-1.2, 1.2); }
  if (o.moving) { o.x += Math.cos(o.ang) * o.sp * sp * dt; o.y += Math.sin(o.ang) * o.sp * sp * dt; }
  if (o.x < 10 || o.x > 390) { o.ang = Math.PI - o.ang; o.x = clamp(o.x, 10, 390); }
  const bot = sandY(o.x) - 6; if (o.y < 30 || o.y > bot) { o.ang = -o.ang; o.y = clamp(o.y, 30, bot); }
  o.g.setAttribute("transform", `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) rotate(${(o.ang * 180 / Math.PI).toFixed(1)})`);
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  for (let i = food.length - 1; i >= 0; i--) {
    const f = food[i];
    if (!f.landed) { f.y += f.vy * dt; f.x = clamp(f.x + Math.sin(f.y / 8 + f.ph) * 3 * dt, 2, 398); const b = sandY(f.x) - 1; if (f.y >= b) { f.y = b; f.landed = true; } }
    else { f.life -= dt; if (f.life <= 0) { eat(f); continue; } if (f.life < 3) f.el.setAttribute("opacity", (f.life / 3).toFixed(2)); }
    f.el.setAttribute("cx", f.x.toFixed(1)); f.el.setAttribute("cy", f.y.toFixed(1));
  }
  for (const k of KINDS) for (const o of crit[k]) o.t += dt;
  crit.neon.forEach(o => stepNeon(o, dt, speed, state.show.fish));
  crit.shrimp.forEach(o => stepBottom(o, dt, speed, state.show.shrimp, .5));
  crit.cory.forEach(o => stepBottom(o, dt, speed, true, 4));
  crit.oto.forEach(o => stepOto(o, dt, speed));
  bubbles.forEach(o => { o.y -= o.v * dt; if (o.y < -5) o.y = 240; o.c.setAttribute("cx", (o.x + Math.sin(o.y / 10) * 2).toFixed(1)); o.c.setAttribute("cy", o.y.toFixed(1)); });
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
const [init, from] = loadInitial();
state = init; applyAll(); if (from === "hash") save();
setInterval(() => { if (state.time === "auto") applyTime(); }, 60000);
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();

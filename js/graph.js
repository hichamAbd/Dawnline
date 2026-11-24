// The sun graph and the method bars, drawn as SVG on one shared time axis.
import { sunAltitude } from "./astro.js";
import { makeScale } from "./scale.js";
import { localParts } from "./tz.js";
import { PRAYERS } from "./prayer.js";

const NS = "http://www.w3.org/2000/svg";
const MIN = 60000;
export const ANGLES = [12, 15, 17, 17.5, 18, 18.5, 19, 19.5];

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

export function xOf(day, t, w) {
  return ((t - day.start) / (day.end - day.start)) * w;
}
export function tOf(day, x, w) {
  return day.start + (x / w) * (day.end - day.start);
}

// Sun graph. opts: { width, height, favAngles: [fajr, isha], now }
export function drawGraph(svg, day, opts) {
  const { width: W, height: H } = opts;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const frac = makeScale(day.minAlt, day.maxAlt);
  const y = (a) => frac(a) * H;
  const { lat, lon } = day.place;

  const defs = el("defs", {}, svg);
  const g = el("linearGradient", { id: "sg-day", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el("stop", { offset: 0, class: "sg-day-top" }, g);
  el("stop", { offset: 1, class: "sg-day-bot" }, g);
  const clipAbove = el("clipPath", { id: "sg-above" }, defs);
  el("rect", { x: 0, y: 0, width: W, height: y(0) }, clipAbove);
  const clipBelow = el("clipPath", { id: "sg-below" }, defs);
  el("rect", { x: 0, y: y(0), width: W, height: H - y(0) }, clipBelow);

  // Twilight bands (civil, nautical, astronomical, night).
  const bands = [[0, -6, "band-civil"], [-6, -12, "band-nautical"], [-12, -18, "band-astro"], [-18, -90, "band-night"]];
  const cy = (a) => Math.max(0, Math.min(H, y(a)));
  for (const [a, b, cls] of bands) {
    const top = cy(a), bot = cy(b);
    if (bot > top) el("rect", { x: 0, y: top, width: W, height: bot - top, class: cls }, svg);
  }
  el("rect", { x: 0, y: 0, width: W, height: cy(0), class: "band-day" }, svg);

  // Dashed angle lines.
  const fav = new Set(opts.favAngles || []);
  for (const a of ANGLES) {
    el("line", { x1: 0, x2: W, y1: y(-a), y2: y(-a), class: fav.has(a) ? "angle angle-fav" : "angle" }, svg);
  }

  // Sun path.
  const pts = [];
  const step = 6 * MIN;
  for (let t = day.start; t <= day.end + 1; t += step) pts.push([xOf(day, t, W), y(sunAltitude(t, lat, lon))]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
  const area = d + `L${W} ${H}L0 ${H}Z`;
  el("path", { d: area, class: "curve-fill", "clip-path": "url(#sg-above)" }, svg);
  el("path", { d, class: "curve curve-night", "clip-path": "url(#sg-below)" }, svg);
  el("path", { d, class: "curve curve-day", "clip-path": "url(#sg-above)" }, svg);

  // Horizon.
  el("line", { x1: 0, x2: W, y1: y(0), y2: y(0), class: "horizon" }, svg);

  // Angle labels on the right. The favourite's angles always get a label
  // (nudged apart if they are close); the others only where there is room.
  const MINGAP = 10;
  const placed = [];
  const labels = [];
  const label = (a, yy, isFav) => {
    placed.push(yy);
    labels.push({ angle: a, y: yy - 6 });
    const t = el("text", { x: W - 4, y: yy - 2.5, class: isFav ? "angle-label angle-label-fav" : "angle-label", "text-anchor": "end", "data-angle": a }, svg);
    t.textContent = `${a}°`;
  };
  const favs = ANGLES.filter((a) => fav.has(a)).sort((a, b) => a - b).map((a) => ({ a, y: y(-a) }));
  for (let i = 1; i < favs.length; i++) {
    const gap = favs[i].y - favs[i - 1].y;
    if (gap < MINGAP) { const mid = (favs[i].y + favs[i - 1].y) / 2; favs[i - 1].y = mid - MINGAP / 2; favs[i].y = mid + MINGAP / 2; }
  }
  favs.forEach((f) => label(f.a, f.y, true));
  const PRIORITY = [18, 15, 12, 19.5, 17, 19, 18.5, 17.5];
  for (const a of [...ANGLES].filter((a) => !fav.has(a)).sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b))) {
    const yy = y(-a);
    if (placed.some((p) => Math.abs(p - yy) < MINGAP)) continue;
    label(a, yy, false);
  }
  const h0 = el("text", { x: W - 4, y: y(0) - 3, class: "angle-label horizon-label", "text-anchor": "end" }, svg);
  h0.textContent = "0°";
  return { y, labels };
}

// Small markers on the curve for each named moment (sunrise, sunset, noon,
// each twilight angle). Returns their positions for tap-to-jump.
export function drawMoments(svg, day, moments, opts) {
  const { width: W, height: H, favAngles = [] } = opts;
  const frac = makeScale(day.minAlt, day.maxAlt);
  svg.querySelector(".moments")?.remove();
  const g = el("g", { class: "moments", "aria-hidden": "true" });
  const sun = svg.querySelector(".sun");
  svg.insertBefore(g, sun || null);
  const fav = new Set(favAngles);
  return moments.map((m) => {
    const x = xOf(day, m.t, W), y = frac(m.alt) * H;
    const strong = m.key === "noon" || m.angle === 0.833 || fav.has(m.angle);
    el("circle", { cx: x, cy: y, r: strong ? 3.4 : 2.4, class: `moment${strong ? " moment-strong" : ""}${fav.has(m.angle) ? " moment-fav" : ""}` }, g);
    return { x, y, m };
  });
}

// The five prayer windows of one method on one day, under a small sun curve
// (used by the "How prayer times work" page).
export const WINDOW_COLORS = { fajr: "#8fb4ff", dhuhr: "#ffd27a", asr: "#ffb26b", maghrib: "#ff8f80", isha: "#b3a6ff" };
export function drawPrayerDiagram(svg, day, times, opts) {
  const { width: W, fmt } = opts;
  const H = 120, TRACK = 128, total = 200;
  svg.setAttribute("viewBox", `0 0 ${W} ${total}`);
  svg.setAttribute("height", total);
  svg.replaceChildren();
  const frac = makeScale(day.minAlt, day.maxAlt);
  const y = (a) => frac(a) * H;
  const { lat, lon } = day.place;
  el("rect", { x: 0, y: y(0), width: W, height: H - y(0), class: "dg-night" }, svg);
  el("line", { x1: 0, x2: W, y1: y(0), y2: y(0), class: "dg-horizon" }, svg);
  const pts = [];
  for (let t = day.start; t <= day.end + 1; t += 10 * 60000) pts.push(`${xOf(day, t, W).toFixed(1)} ${y(sunAltitude(t, lat, lon)).toFixed(1)}`);
  el("path", { d: "M" + pts.join("L"), class: "dg-curve" }, svg);
  const wins = [
    ["fajr", "Fajr", times.fajr, times.sunrise],
    ["dhuhr", "Dhuhr", times.dhuhr, times.asr],
    ["asr", "Asr", times.asr, times.maghrib],
    ["maghrib", "Maghrib", times.maghrib, times.isha],
    ["isha", "Isha", times.isha, day.end],
  ];
  el("line", { x1: 0, x2: W, y1: TRACK + 9, y2: TRACK + 9, class: "dg-track" }, svg);
  wins.forEach(([k, name, a, b], i) => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return;
    const x0 = xOf(day, a, W), x1 = Math.min(W, xOf(day, b, W));
    el("rect", { x: x0, y: TRACK, width: Math.max(2, x1 - x0), height: 18, rx: 4, fill: WINDOW_COLORS[k], class: "dg-win" }, svg);
    el("line", { x1: x0, x2: x0, y1: y(sunAltitude(a, lat, lon)), y2: TRACK, stroke: WINDOW_COLORS[k], class: "dg-tick" }, svg);
    el("circle", { cx: x0, cy: y(sunAltitude(a, lat, lon)), r: 3.2, fill: WINDOW_COLORS[k] }, svg);
    const lab = el("text", { x: Math.min(x0 + 2, W - 64), y: TRACK + 32 + (i % 3) * 14, class: "dg-label" }, svg);
    lab.textContent = `${name} ${fmt(a)}`;
  });
}


// Sun dot at an instant.
export function drawSun(svg, day, t, opts) {
  const { width: W, height: H } = opts;
  let g = svg.querySelector(".sun");
  if (!g) {
    g = el("g", { class: "sun" }, svg);
    el("circle", { r: 13, class: "sun-glow" }, g);
    el("circle", { r: 6, class: "sun-core" }, g);
  }
  const alt = sunAltitude(t, day.place.lat, day.place.lon);
  const x = xOf(day, t, W), yy = makeScale(day.minAlt, day.maxAlt)(alt) * H;
  g.setAttribute("transform", `translate(${x.toFixed(1)} ${yy.toFixed(1)})`);
  g.classList.toggle("sun-down", alt < -0.833);
  return alt;
}

// Hour ticks along the time axis.
export function drawAxis(svg, day, spec, opts) {
  const { width: W, height: H, caption } = opts;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  // first whole local hour after start
  const p = localParts(spec, day.start);
  let t = day.start + ((60 - p.mm) % 60) * MIN - p.ss * 1000;
  for (; t < day.end; t += 60 * MIN) {
    const lp = localParts(spec, t + 1000);
    if (lp.hh % 3 !== 0) continue;
    const x = xOf(day, t, W);
    if (x < 10 || x > W - 10) continue;
    const tx = el("text", { x, y: 13, class: "axis-label", "text-anchor": "middle" }, svg);
    tx.textContent = String(lp.hh).padStart(2, "0");
  }
  if (caption) {
    const c = el("text", { x: 2, y: H - 7, class: "axis-caption" }, svg);
    c.textContent = caption;
  }
}

// The vertical "now" line, drawn inside each SVG (graph, axis, bars) so it
// renders like the rest of the graph in every browser; stacked SVGs make it
// one unbroken line. Dashed while scrubbing.
export function placeNowLine(svg, x, height, dashed) {
  let l = svg.querySelector("line.nowline-svg");
  if (!l) {
    l = el("line", { class: "nowline-svg" });
    svg.insertBefore(l, svg.querySelector("g.sun"));
  }
  const xs = x.toFixed(1);
  l.setAttribute("x1", xs);
  l.setAttribute("x2", xs);
  l.setAttribute("y1", 0);
  l.setAttribute("y2", height);
  l.classList.toggle("nowline-scrub", dashed);
}

// One bar per method. rows: [{ method, times, fav }]. Returns hit targets
// for the marks and for the method names.
export function drawBars(svg, day, rows, opts) {
  const { width: W } = opts;
  const ROW = 36, FAVROW = 78;
  let yy = 0;
  svg.replaceChildren();
  const hits = [], names = [];
  for (const r of rows) {
    const h = r.fav ? FAVROW : ROW;
    const g = el("g", { class: r.fav ? "bar bar-fav" : "bar", transform: `translate(0 ${yy})` }, svg);
    const label = el("text", { x: 2, y: r.fav ? 13 : 12, class: "bar-name" }, g);
    label.textContent = (r.fav ? "★ " : "") + r.method.short + " ";
    const info = el("tspan", { class: "bar-name-info" }, label);
    info.textContent = "ⓘ";
    names.push({ y0: yy, y1: yy + (r.fav ? 22 : 18), x1: 30 + (r.method.short.length + 3) * 7.2, row: r });
    const ty = r.fav ? 46 : 25;
    el("line", { x1: 0, x2: W, y1: ty, y2: ty, class: "bar-track" }, g);
    const t = r.times;
    if (Number.isFinite(t.fajr) && Number.isFinite(t.isha)) {
      el("line", { x1: xOf(day, t.fajr, W), x2: xOf(day, t.isha, W), y1: ty, y2: ty, class: "bar-span" }, g);
    }
    if (r.fav && Number.isFinite(t.asrHanafi)) {
      const x = xOf(day, t.asrHanafi, W);
      el("circle", { cx: x, cy: ty, r: 3.4, class: "mark mark-hanafi" }, g);
      hits.push({ x, y: yy + ty, key: "asrHanafi", row: r, value: t.asrHanafi, est: null });
    }
    PRAYERS.forEach((k, i) => {
      const v = t[k];
      if (!Number.isFinite(v)) return;
      const x = xOf(day, v, W);
      const est = t.est && t.est[k];
      el("circle", { cx: x, cy: ty, r: r.fav ? 5.2 : 3.8, class: `mark mark-${k}${est ? " mark-est" : ""}` }, g);
      if (r.fav) {
        const up = i % 2 === 0;
        const tx = el("text", { x: Math.max(14, Math.min(W - 14, x)), y: up ? ty - 12 : ty + 21, class: est ? "mark-time mark-time-est" : "mark-time", "text-anchor": "middle" }, g);
        tx.textContent = opts.fmt(v);
      }
      hits.push({ x, y: yy + ty, key: k, row: r, value: v, est });
    });
    yy += h;
  }
  svg.setAttribute("viewBox", `0 0 ${W} ${yy}`);
  svg.setAttribute("height", yy);
  return { hits, names, height: yy };
}

// Shared frame of the year charts: x runs over the year centred on index c of
// a yearSeries, with month initials; both charts line up one above the other.
const YR = { top: 10, bottom: 22, left: 50 };
function yearFrame(svg, series, c, W, H) {
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("height", H);
  svg.replaceChildren();
  const i0 = Math.max(0, c - 182), i1 = Math.min(series.length - 1, c + 182);
  const plotW = W - YR.left - 4, plotH = H - YR.top - YR.bottom;
  const x = (i) => YR.left + ((i - i0) / (i1 - i0)) * plotW;
  const initials = "JFMAMJJASOND";
  for (let i = i0; i <= i1; i++) {
    if (series[i].ymd.d !== 1) continue;
    el("line", { x1: x(i), x2: x(i), y1: YR.top + plotH, y2: YR.top + plotH + 4, class: "yr-tick" }, svg);
    const t = el("text", { x: x(i) + 2, y: H - 6, class: "yr-label" }, svg);
    t.textContent = initials[series[i].ymd.m - 1];
  }
  const grid = (yy, label, edge) => {
    el("line", { x1: YR.left, x2: W - 4, y1: yy, y2: yy, class: edge ? "yr-grid yr-grid-edge" : "yr-grid" }, svg);
    if (label) { const t = el("text", { x: YR.left - 6, y: yy + 3.5, class: "yr-label", "text-anchor": "end" }, svg); t.textContent = label; }
  };
  // The curve of series[key] through y(), broken where a value is missing.
  const segments = (key, y) => {
    const out = [];
    let cur = null;
    for (let i = i0; i <= i1; i++) {
      const v = series[i][key];
      if (!Number.isFinite(v)) { cur = null; continue; }
      if (!cur) out.push((cur = []));
      cur.push([x(i), y(v)]);
    }
    return out;
  };
  const line = (pts) => pts.map(([a, b], k) => `${k ? "L" : "M"}${a.toFixed(1)} ${b.toFixed(1)}`).join("");
  const today = (v, y, cls) => {
    el("line", { x1: x(c), x2: x(c), y1: YR.top, y2: YR.top + plotH, class: "yr-today" }, svg);
    if (Number.isFinite(v)) el("circle", { cx: x(c), cy: y(v), r: 4.5, class: cls }, svg);
  };
  return { top: YR.top, plotH, x, grid, segments, line, today };
}

// Day length through the year: sunrise to sunset, hours 0-24, today marked.
export function drawYearChart(svg, series, c, opts) {
  const f = yearFrame(svg, series, c, opts.width, 170);
  const y = (ms) => f.top + (1 - ms / 86400000) * f.plotH;
  for (const h of [0, 6, 12, 18, 24]) f.grid(y(h * 3600000), h % 24 ? `${h} h` : "", h % 24 === 0);
  for (const pts of f.segments("dayLen", y)) {
    const d = f.line(pts);
    el("path", { d: `${d}L${pts[pts.length - 1][0].toFixed(1)} ${y(0)}L${pts[0][0].toFixed(1)} ${y(0)}Z`, class: "yr-fill" }, svg);
    el("path", { d, class: "yr-day" }, svg);
  }
  f.today(series[c].dayLen, y, "yr-dot");
}

// The Islamic day (Maghrib to Maghrib) through the same year, as its gap
// from 24 h: above the "24 h" line it is longer, below it shorter.
export function drawIslamicDayChart(svg, series, c, opts) {
  const f = yearFrame(svg, series, c, opts.width, 150);
  const DAY = 86400000;
  let r = 0;
  for (let i = Math.max(0, c - 182); i <= Math.min(series.length - 1, c + 182); i++) {
    const v = series[i].islDay - DAY;
    if (Number.isFinite(v)) r = Math.max(r, Math.abs(v));
  }
  const R = Math.max(r * 1.12, 20000);
  const step = [10, 20, 30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200].map((s) => s * 1000).find((s) => Math.floor(R / s) <= 2) || 7200000;
  const unit = (ms) => { const s = ms / 1000; return s < 60 ? `${s} s` : s < 3600 ? `${s / 60} min` : `${s / 3600} h`; };
  const y = (ms) => f.top + (0.5 - (ms - DAY) / (2 * R)) * f.plotH;
  const n = Math.floor(R / step);
  for (let k = -n; k <= n; k++) f.grid(y(DAY + k * step), k ? `${k > 0 ? "+" : "\u2212"}${unit(Math.abs(k) * step)}` : "24 h", k === 0);
  for (const pts of f.segments("islDay", y)) {
    const d = f.line(pts);
    el("path", { d: `${d}L${pts[pts.length - 1][0].toFixed(1)} ${y(DAY).toFixed(1)}L${pts[0][0].toFixed(1)} ${y(DAY).toFixed(1)}Z`, class: "yr-isl-fill" }, svg);
    el("path", { d, class: "yr-isl" }, svg);
  }
  f.today(series[c].islDay, y, "yr-dot yr-dot-gold");
}

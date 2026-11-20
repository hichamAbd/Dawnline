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
  const label = (a, yy, isFav) => {
    placed.push(yy);
    const t = el("text", { x: W - 4, y: yy - 2.5, class: isFav ? "angle-label angle-label-fav" : "angle-label", "text-anchor": "end" }, svg);
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
  return { y };
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
  const { width: W, height: H } = opts;
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
    const tx = el("text", { x, y: H - 4, class: "axis-label", "text-anchor": "middle" }, svg);
    tx.textContent = String(lp.hh).padStart(2, "0");
  }
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

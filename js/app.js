// Dawnline: main screen, sheets, settings and first launch.
import { METHODS, HIGH_LAT_RULES, REGION_DEFAULTS, CONTINENT_DEFAULTS, RULES_UPDATED } from "./data/methods.js";
import { TZ_RULES_UPDATED, COUNTRY_ZONES } from "./data/timezones.js";
import { EXPLAIN, PRAYERS_GUIDE } from "./data/explain.js";
import { sunDay, methodTimes, PRAYERS, PRAYER_NAMES, sunMoments, timesAtAltitude } from "./prayer.js";
import { hhmm, offsetAt, offsetLabel, localParts, zonedToUtc } from "./tz.js";
import { sunAltitude } from "./astro.js";
import { drawGraph, drawSun, drawAxis, drawBars, drawMoments, drawPrayerDiagram, WINDOW_COLORS, xOf, tOf } from "./graph.js";
import { skyFor } from "./sky.js";
import { loadGeo, describePlace, zoneFor } from "./geo.js";
import { mountMap } from "./map.js";

const KEY = "dawnline-settings";
const MIN = 60000;
const DAY = 86400000;
const GRAPH_H = 250;
const $ = (id) => document.getElementById(id);
const byId = Object.fromEntries(METHODS.map((m) => [m.id, m]));
const darkQuery = matchMedia("(prefers-color-scheme: dark)");

// ---------- settings (place, favourite, summer rule, time-zone override) ----------
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && s.place && byId[s.fav]) return { highLat: "method", tz: "auto", ...s };
  } catch {}
  return { place: null, fav: "france12", highLat: "method", tz: "auto" };
}
function saveSettings() {
  try {
    const { place, fav, highLat, tz } = state.settings;
    localStorage.setItem(KEY, JSON.stringify({ place, fav, highLat, tz }));
  } catch {}
}

const state = {
  settings: loadSettings(),
  live: true,
  cursor: Date.now(),
  ymd: null,
  day: null,
  rows: [],
  hits: [],
  names: [],
  moments: [],
  markers: [],
  labels: [],
  width: 0,
};

function spec() {
  const { tz, place } = state.settings;
  if (tz && tz.startsWith("zone:")) return { zone: tz.slice(5) };
  if (tz && tz.startsWith("fixed:")) return { fixed: +tz.slice(6) };
  if (place && place.zone) return place.zone;
  return { zone: "UTC" };
}
const fmt = (t) => hhmm(spec(), t);

// ---------- days ----------
const addDays = (ymd, n) => {
  const d = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + n, 12));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
};
const sameYmd = (a, b) => a && b && a.y === b.y && a.m === b.m && a.d === b.d;

// The day whose window (solar midnight to solar midnight) holds instant t.
function dayFor(t) {
  const p = localParts(spec(), t);
  let ymd = { y: p.y, m: p.m, d: p.d };
  let day = sunDay(state.settings.place, ymd, spec());
  if (t < day.start) { ymd = addDays(ymd, -1); day = sunDay(state.settings.place, ymd, spec()); }
  else if (t >= day.end) { ymd = addDays(ymd, 1); day = sunDay(state.settings.place, ymd, spec()); }
  return day;
}
function timesFor(day) {
  return METHODS.map((m) => ({ method: m, times: methodTimes(m, day, state.settings.highLat) }));
}
function orderRows(rows) {
  const fav = rows.find((r) => r.method.id === state.settings.fav);
  const first = ["morocco", "france12", "france15", "gmp"];
  const rest = rows.filter((r) => r !== fav).sort((a, b) => {
    const ia = first.indexOf(a.method.id), ib = first.indexOf(b.method.id);
    return (ia < 0 ? 9 + METHODS.indexOf(a.method) : ia) - (ib < 0 ? 9 + METHODS.indexOf(b.method) : ib);
  });
  return [{ ...fav, fav: true }, ...rest];
}

// ---------- formatting ----------
function dur(ms) {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 1) return "less than a minute";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
}
function deg(v, dp = 4) {
  return Math.abs(v).toFixed(dp);
}
function coordsText(p) {
  return `${deg(p.lat)}° ${p.lat >= 0 ? "N" : "S"} · ${deg(p.lon)}° ${p.lon >= 0 ? "E" : "W"}`;
}
const dateFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dateLong = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const ymdText = (ymd) => dateFmt.format(new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12)));
const ymdIso = (ymd) => `${ymd.y}-${String(ymd.m).padStart(2, "0")}-${String(ymd.d).padStart(2, "0")}`;
function methodSummary(m) {
  const parts = [`Fajr ${m.fajr}°${m.offsets && m.offsets.fajr ? ` + ${m.offsets.fajr} min` : ""}`];
  if (m.ishaInterval) {
    const after = m.ishaInterval + ((m.offsets && m.offsets.maghrib) || 0);
    parts.push(`Isha ${after} min after sunset${m.ishaIntervalRamadan ? ` (${m.ishaIntervalRamadan} in Ramadan)` : ""}`);
  } else parts.push(`Isha ${m.isha}°`);
  return parts.join(" · ");
}

// ---------- rendering ----------
function rebuild() {
  if (!state.settings.place) return;
  const t = state.live ? Date.now() : state.cursor;
  if (state.live || !state.ymd) {
    state.day = dayFor(t);
    state.ymd = state.day.ymd;
  } else {
    state.day = sunDay(state.settings.place, state.ymd, spec());
  }
  state.cursor = Math.max(state.day.start, Math.min(state.day.end, t));
  state.rows = orderRows(timesFor(state.day));
  renderStatic();
  renderCursor();
  renderCountdown();
}

function renderStatic() {
  const { place } = state.settings;
  const day = state.day;
  $("placeName").textContent = place.name;
  const off = offsetAt(spec(), day.noon);
  const zoneName = spec().zone ? ` · ${spec().zone}` : "";
  $("coords").textContent = `${coordsText(place)} · ${offsetLabel(off)}${zoneName}`;
  const plot = $("plot");
  const W = (state.width = plot.clientWidth);
  const fav = state.rows[0].method;
  const favAngles = [fav.fajr, fav.ishaInterval ? null : fav.isha].filter((a) => a != null);
  const g = drawGraph($("graph"), day, { width: W, height: GRAPH_H, favAngles });
  state.labels = g.labels;
  state.moments = sunMoments(day);
  state.markers = drawMoments($("graph"), day, state.moments, { width: W, height: GRAPH_H, favAngles });
  drawAxis($("axis"), day, spec(), { width: W, height: 18 });
  const b = drawBars($("bars"), day, state.rows, { width: W, fmt });
  state.hits = b.hits;
  state.names = b.names;
  $("graph").setAttribute("aria-label", `Sun altitude through ${ymdText(day.ymd)} at ${place.name}`);
  renderMoments();
  hidePop();
}

function renderCursor() {
  const day = state.day;
  const t = state.cursor;
  const { lat, lon } = state.settings.place;
  const alt = drawSun($("graph"), day, t, { width: state.width, height: GRAPH_H });
  const rising = sunAltitude(t + MIN, lat, lon) > alt;
  $("angleNow").textContent = `${alt < 0 ? "−" : ""}${Math.abs(alt).toFixed(1)}°`;
  $("trend").textContent = rising ? "rising" : "setting";
  const near = state.moments.find((m) => Math.abs(m.t - t) < 20000);
  $("momentName").textContent = near ? near.name : "";
  $("clock").textContent = fmt(t);
  $("dateLabel").textContent = ymdText(day.ymd);
  $("dateInput").value = ymdIso(day.ymd);
  $("nowBtn").hidden = state.live;
  const nl = $("nowline");
  nl.style.left = `${xOf(day, t, state.width)}px`;
  nl.classList.toggle("scrub", !state.live);
  paintSky(alt);
  renderPassed(t);
}

function paintSky(alt) {
  const s = skyFor(alt, darkQuery.matches);
  const r = document.documentElement.style;
  r.setProperty("--sky-top", s.top);
  r.setProperty("--sky-mid", s.mid);
  r.setProperty("--sky-bot", s.bot);
  r.setProperty("--glass", s.glass);
  r.setProperty("--glass-strong", s.glassStrong);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", s.top);
}

function renderPassed(t) {
  const day = state.day;
  const rows = state.rows;
  const el = $("passed");
  const pills = $("pills");
  pills.replaceChildren();
  if (!Number.isFinite(day.sunrise) || !Number.isFinite(day.sunset)) {
    el.textContent = day.maxAlt < 0 ? "The sun does not rise here on this day, so no method can place Fajr or Isha from its angle." : "The sun does not set here on this day, so no method can place Fajr or Isha from its angle.";
    return;
  }
  const pill = (r, on, time) => {
    const s = document.createElement("span");
    s.className = `pill${on ? " on" : ""}${r.fav ? " fav" : ""}`;
    s.textContent = on ? r.method.short : `${r.method.short} ${fmt(time)}`;
    pills.appendChild(s);
  };
  if (t < day.sunrise) {
    const done = rows.filter((r) => t >= r.times.fajr);
    const next = rows.filter((r) => t < r.times.fajr).sort((a, b) => a.times.fajr - b.times.fajr)[0];
    el.innerHTML = "";
    el.append(done.length ? strong(`Fajr has begun for `, `${done.length} of ${rows.length}`, ` methods.`) : text("No method's Fajr yet."));
    if (next) el.append(text(` Next: ${next.method.short} in ${dur(next.times.fajr - t)}.`));
    rows.forEach((r) => pill(r, t >= r.times.fajr, r.times.fajr));
  } else if (t >= day.sunset) {
    const done = rows.filter((r) => t >= r.times.isha);
    const next = rows.filter((r) => t < r.times.isha).sort((a, b) => a.times.isha - b.times.isha)[0];
    el.innerHTML = "";
    el.append(done.length ? strong(`Isha has begun for `, `${done.length} of ${rows.length}`, ` methods.`) : text("No method's Isha yet."));
    if (next) el.append(text(` Next: ${next.method.short} in ${dur(next.times.isha - t)}.`));
    rows.forEach((r) => pill(r, t >= r.times.isha, r.times.isha));
  } else {
    const ishas = rows.map((r) => r.times.isha).filter(Number.isFinite);
    const first = rows.find((r) => r.times.isha === Math.min(...ishas));
    const last = rows.find((r) => r.times.isha === Math.max(...ishas));
    el.innerHTML = "";
    if (t < day.noon) el.append(text(`The sun is up: Fajr ended at sunrise, ${fmt(day.sunrise)}. Dhuhr after solar noon, ${fmt(day.noon)}.`));
    else el.append(strong("Isha will begin between ", `${fmt(first.times.isha)}`, ` (${first.method.short}) and `), strong("", `${fmt(last.times.isha)}`, ` (${last.method.short}).`));
  }
}
function text(s) { return document.createTextNode(s); }
function strong(a, b, c) {
  const f = document.createDocumentFragment();
  f.append(text(a));
  const e = document.createElement("b");
  e.textContent = b;
  f.append(e, text(c));
  return f;
}

function renderMoments() {
  const d = state.day;
  const box = $("moments");
  box.replaceChildren();
  const polarDay = !Number.isFinite(d.sunrise) && d.maxAlt > 0;
  const polarNight = !Number.isFinite(d.sunrise) && d.maxAlt <= 0;
  const timeBtn = (t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tbtn";
    b.textContent = fmt(t);
    b.setAttribute("aria-label", `Go to ${fmt(t)}`);
    b.addEventListener("click", () => jumpTo(t, { scroll: true }));
    return b;
  };
  const row = (k, val, small, info) => {
    const r = document.createElement("div");
    r.className = "moment-row";
    const kk = document.createElement("span");
    kk.className = "k";
    kk.textContent = k;
    if (small) { const s = document.createElement("small"); s.textContent = small; kk.append(s); }
    if (info) { kk.append(" "); kk.append(infoBtn(info)); }
    const vv = document.createElement("span");
    vv.className = "v";
    if (Array.isArray(val)) val.forEach((t, i) => { if (i) vv.append(text(" – ")); vv.append(timeBtn(t)); });
    else vv.textContent = val;
    r.append(kk, vv);
    box.appendChild(r);
  };
  const range = (a, angle) => {
    if (Number.isFinite(a[0]) && Number.isFinite(a[1])) return a;
    if (d.minAlt > -angle) return "All night";
    if (d.maxAlt < -angle) return "Never ends";
    return "—";
  };
  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = "Key moments · tap a time to go there";
  box.appendChild(title);
  const none = polarDay ? "None · midnight sun" : polarNight ? "None · polar night" : "—";
  row("Solar noon", [d.noon]);
  row("Sunrise", Number.isFinite(d.sunrise) ? [d.sunrise] : none, "", "refraction");
  row("Sunset", Number.isFinite(d.sunset) ? [d.sunset] : none);
  row("Day length", Number.isFinite(d.sunrise) && Number.isFinite(d.sunset) ? dur(d.sunset - d.sunrise) : polarDay ? "24 h" : polarNight ? "0 min" : "—");
  row("Civil twilight", range(d.civil, 6), "6°");
  row("Nautical twilight", range(d.nautical, 12), "12°");
  row("Astronomical twilight", range(d.astronomical, 18), "18°");
  row("Sun's height at noon", `${d.maxAlt.toFixed(1)}°`);
}

function infoBtn(topic) {
  const b = document.createElement("button");
  b.className = "info";
  b.type = "button";
  b.textContent = "i";
  b.setAttribute("aria-label", `About: ${EXPLAIN[topic].title}`);
  b.addEventListener("click", (e) => { e.stopPropagation(); explain(topic); });
  return b;
}

// Countdown to the favourite's next prayer, always for the real "now".
function renderCountdown() {
  const now = Date.now();
  const fav = byId[state.settings.fav];
  const day = dayFor(now);
  let times = methodTimes(fav, day, state.settings.highLat);
  const order = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  let next = order.map((k) => [k, times[k]]).find(([, v]) => Number.isFinite(v) && v > now);
  if (!next) {
    const tomorrow = sunDay(state.settings.place, addDays(day.ymd, 1), spec());
    times = methodTimes(fav, tomorrow, state.settings.highLat);
    next = ["fajr", times.fajr];
  }
  const el = $("next");
  el.replaceChildren();
  if (!next || !Number.isFinite(next[1])) { el.textContent = "No prayer times can be placed from the sun today."; return; }
  const [k, v] = next;
  const b = document.createElement("b");
  b.textContent = k === "sunrise" ? "Sunrise" : PRAYER_NAMES[k];
  const favEl = document.createElement("span");
  favEl.className = "fav";
  favEl.textContent = `★ ${fav.short}`;
  el.append(b, text(` in ${dur(v - now)} · ${fmt(v)}${k === "sunrise" ? " (end of Fajr)" : ""} `), favEl);
}

// ---------- tapping marks ----------
function showPop(hit) {
  const pop = $("pop");
  const r = hit.row;
  const favRow = state.rows[0];
  pop.replaceChildren();
  const name = hit.key === "asrHanafi" ? "Asr (Hanafi)" : PRAYER_NAMES[hit.key];
  const head = document.createElement("div");
  head.innerHTML = "";
  const t1 = document.createElement("b");
  t1.textContent = `${r.fav ? "★ " : ""}${r.method.short} · ${name}`;
  const t2 = document.createElement("div");
  t2.className = "pop-time";
  t2.textContent = fmt(hit.value);
  head.append(t1, t2);
  pop.append(head);
  const line = (s) => { const d = document.createElement("div"); d.textContent = s; pop.append(d); return d; };
  if (hit.key === "asrHanafi") {
    line(`${dur(hit.value - r.times.asr)} after the standard Asr (${fmt(r.times.asr)}).`);
  } else if (!r.fav) {
    const f = favRow.times[hit.key];
    if (Number.isFinite(f)) {
      const d = Math.round((hit.value - f) / MIN);
      line(d === 0 ? `Same minute as ${favRow.method.short}.` : `${Math.abs(d)} min ${d < 0 ? "earlier" : "later"} than ${favRow.method.short} (${fmt(f)}).`);
    }
  }
  if (hit.est) {
    const rule = HIGH_LAT_RULES[hit.est.rule].short.toLowerCase();
    const share = { angle: `${hit.est.angle}/60`, seventh: "1/7", middle: "1/2", third: "1/3" }[hit.est.rule];
    const where = hit.key === "fajr" ? "before sunrise" : "after sunset";
    if (hit.est.why === "nosign") line(`Estimated: the sun doesn't get ${hit.est.angle}° below the horizon that night, so the ${rule} rule puts it ${share} of the night ${where}.`);
    else line(`Estimated: at ${hit.est.angle}° it would be ${fmt(hit.est.raw)}; the ${rule} rule caps it at ${share} of the night ${where}.`);
  }
  const go = document.createElement("button");
  go.className = "pop-more";
  go.textContent = "Go to this moment";
  go.addEventListener("click", () => jumpTo(hit.value));
  pop.append(go);
  const topic = hit.key === "asrHanafi" || hit.key === "asr" ? "asr" : hit.est ? "summer" : r.method.explain;
  const more = document.createElement("button");
  more.className = "pop-more";
  more.textContent = `About: ${EXPLAIN[topic].title} →`;
  more.addEventListener("click", () => { hidePop(); explain(topic); });
  pop.append(more);
  pop.hidden = false;
  const plot = $("plot");
  const barsTop = $("bars").getBoundingClientRect().top - plot.getBoundingClientRect().top;
  const pw = Math.min(270, plot.clientWidth - 8);
  pop.style.width = `${pw}px`;
  const x = Math.max(4, Math.min(plot.clientWidth - pw - 4, hit.x - pw / 2));
  pop.style.left = `${x}px`;
  const ph = pop.offsetHeight;
  const yMark = barsTop + hit.y;
  pop.style.top = `${yMark - ph - 12 > 0 ? yMark - ph - 12 : yMark + 14}px`;
}
function hidePop() { const p = $("pop"); if (p) p.hidden = true; }

function onBarsClick(e) {
  const r = $("bars").getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const n = state.names.find((n) => y >= n.y0 && y <= n.y1 && x <= n.x1);
  if (n) { hidePop(); explain(n.row.method.explain); return; }
  let best = null, bd = 22;
  for (const h of state.hits) {
    if (Math.abs(h.y - y) > 16) continue;
    const d = Math.abs(h.x - x);
    if (d < bd) { bd = d; best = h; }
  }
  if (best) showPop(best);
  else hidePop();
}

// ---------- scrubbing ----------
function setupScrub() {
  const g = $("graph");
  let drag = null;
  const pos = (e) => {
    const r = g.getBoundingClientRect();
    return { x: Math.max(0, Math.min(r.width, e.clientX - r.left)), y: e.clientY - r.top, w: r.width };
  };
  g.addEventListener("pointerdown", (e) => {
    g.setPointerCapture(e.pointerId);
    const p = pos(e);
    drag = { id: e.pointerId, x0: p.x, moved: false };
  });
  g.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const p = pos(e);
    if (!drag.moved && Math.abs(p.x - drag.x0) < 5) return;
    drag.moved = true;
    state.live = false;
    state.cursor = tOf(state.day, p.x, p.w);
    hidePop();
    renderCursor();
  });
  g.addEventListener("pointerup", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const wasDrag = drag.moved;
    drag = null;
    if (!wasDrag) onGraphTap(pos(e));
  });
  g.addEventListener("pointercancel", () => { drag = null; });
  g.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    state.live = false;
    state.cursor = Math.max(state.day.start, Math.min(state.day.end, state.cursor + (e.key === "ArrowRight" ? 10 : -10) * MIN));
    renderCursor();
  });
}

// A tap on the graph: an angle label jumps to that angle, a marker on the
// curve jumps exactly to its moment, anywhere else goes to that time.
function onGraphTap({ x, y, w }) {
  if (x > w - 48) {
    const lab = state.labels.find((l) => Math.abs(l.y - y) <= 9);
    if (lab) { jumpToAngle(lab.angle); return; }
  }
  let best = null, bd = 22;
  for (const m of state.markers) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bd) { bd = d; best = m; }
  }
  if (best) { jumpTo(best.m.t); return; }
  jumpTo(tOf(state.day, x, w));
}

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function jumpTo(t, { scroll = false } = {}) {
  state.live = false;
  state.cursor = Math.max(state.day.start, Math.min(state.day.end, t));
  hidePop();
  renderCursor();
  if (scroll) $("plot").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
}

// The next time (after the cursor) the sun is `angle`° below the horizon.
function jumpToAngle(angle) {
  const { rising, setting } = timesAtAltitude(state.day, -angle);
  const found = [rising, setting].filter(Number.isFinite);
  if (!found.length) { toast(`The sun doesn't get ${angle}° below the horizon on this day.`); return; }
  jumpTo(found.find((x) => x > state.cursor + 30000) ?? found[0]);
}

const degText = (v) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}°`;

// Type an angle, see when the sun is there (rising and setting), jump.
function openAngleSheet() {
  const day = state.day;
  const { lat, lon } = state.settings.place;
  const now = sunAltitude(state.cursor, lat, lon);
  let below = now < 0;
  openSheet(({ title, body }) => {
    title.textContent = "Go to an angle";
    body.append(para("Type the sun's angle. The app finds when the sun is there on this day, in the morning and in the evening."));
    const row = document.createElement("div");
    row.className = "angle-input-row";
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.enterKeyHint = "go";
    input.autocomplete = "off";
    input.autofocus = true;
    input.className = "angle-input";
    input.setAttribute("aria-label", "Angle in degrees");
    input.value = Math.abs(now).toFixed(1);
    const unit = document.createElement("span");
    unit.className = "angle-unit";
    unit.textContent = "°";
    row.append(input, unit);
    const seg = document.createElement("div");
    seg.className = "seg";
    seg.setAttribute("role", "radiogroup");
    const segBtn = (label, val) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.textContent = label;
      b.addEventListener("click", () => { below = val; update(); });
      seg.appendChild(b);
      return b;
    };
    const bBelow = segBtn("Below the horizon", true);
    const bAbove = segBtn("Above the horizon", false);
    const quick = document.createElement("div");
    quick.className = "quick";
    for (const [label, v] of [["Sunrise · sunset", 0.833], ["6°", 6], ["12°", 12], ["15°", 15], ["17°", 17], ["18°", 18], ["19.5°", 19.5]]) {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "chip";
      c.textContent = label;
      c.addEventListener("click", () => { input.value = String(v); below = true; update(); });
      quick.appendChild(c);
    }
    const results = document.createElement("div");
    results.className = "angle-results";
    const note = para("", "note");
    body.append(row, seg, quick, results, note);

    const value = () => {
      const s = input.value.trim().replace(",", ".").replace("−", "-");
      if (s.startsWith("-")) below = true;
      const v = Math.abs(parseFloat(s));
      return Number.isFinite(v) ? Math.min(90, v) : null;
    };
    let found = [];
    function update() {
      bBelow.setAttribute("aria-checked", String(below));
      bAbove.setAttribute("aria-checked", String(!below));
      results.replaceChildren();
      found = [];
      const v = value();
      const range = `from ${degText(day.minAlt)} to ${degText(day.maxAlt)}`;
      if (v === null) { note.textContent = `Type a number between 0 and 90. On ${ymdText(day.ymd)} the sun goes ${range} here.`; return; }
      const { rising, setting } = timesAtAltitude(day, below ? -v : v);
      for (const [label, t] of [["Rising · morning", rising], ["Setting · evening", setting]]) {
        if (!Number.isFinite(t)) continue;
        found.push(t);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "result";
        const l = document.createElement("span");
        l.textContent = label;
        const tm = document.createElement("b");
        tm.textContent = fmt(t);
        b.append(l, tm);
        b.addEventListener("click", () => { closeSheet(); jumpTo(t); });
        results.appendChild(b);
      }
      note.textContent = found.length
        ? `On ${ymdText(day.ymd)} the sun goes ${range} here.`
        : `On ${ymdText(day.ymd)} the sun never gets ${v}° ${below ? "below" : "above"} the horizon here: it goes ${range}.`;
    }
    input.addEventListener("input", update);
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (!found.length) return;
      const t = found.reduce((a, b) => (Math.abs(b - state.cursor) < Math.abs(a - state.cursor) ? b : a));
      closeSheet();
      jumpTo(t);
    });
    update();
    requestAnimationFrame(() => { input.focus(); input.select(); });
  });
}

// "How prayer times work": the five windows on today's curve, then the logic.
function openPrayersGuide() {
  const G = PRAYERS_GUIDE;
  openSheet(({ title, body }) => {
    title.textContent = G.title;
    body.append(para(G.intro));
    const day = state.day;
    if (day && Number.isFinite(day.sunrise) && Number.isFinite(day.sunset)) {
      const fav = byId[state.settings.fav];
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "diagram");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "The five prayer windows on today's sun curve");
      body.append(svg, para(`${ymdText(day.ymd)} at ${state.settings.place.name}, with ${fav.short}. A timetable gives the moment each window opens.`, "note"));
      const times = methodTimes(fav, day, state.settings.highLat);
      const draw = () => drawPrayerDiagram(svg, day, times, { width: Math.max(260, svg.clientWidth || body.clientWidth - 32), fmt });
      requestAnimationFrame(draw);
    }
    for (const s of G.sections) {
      const h = document.createElement("h3");
      h.className = "guide-h";
      if (s.key) {
        const dot = document.createElement("span");
        dot.className = "guide-dot";
        dot.style.background = WINDOW_COLORS[s.key];
        h.appendChild(dot);
      }
      h.append(text(s.title));
      body.append(h);
      for (const p of s.text) body.append(para(p));
      if (s.more) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "more-link";
        more.textContent = `More: ${EXPLAIN[s.more].title} →`;
        more.addEventListener("click", () => explain(s.more));
        body.append(more);
      }
    }
    const ul = document.createElement("ul");
    ul.className = "links";
    for (const [label, url] of G.links) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = label;
      li.appendChild(a); ul.appendChild(li);
    }
    body.append(ul);
  });
}

function goLive() {
  state.live = true;
  state.ymd = null;
  rebuild();
}

function onDatePicked(v) {
  if (!v) return;
  const [y, m, d] = v.split("-").map(Number);
  const now = localParts(spec(), Date.now());
  state.live = false;
  state.ymd = { y, m, d };
  state.day = sunDay(state.settings.place, state.ymd, spec());
  const t = zonedToUtc(spec(), y, m, d, now.hh, now.mm);
  state.cursor = Math.max(state.day.start, Math.min(state.day.end, t));
  state.rows = orderRows(timesFor(state.day));
  renderStatic();
  renderCursor();
}

// ---------- sheets ----------
const stack = [];
function openSheet(build, { replace = false, closable = true } = {}) {
  const dlg = $("sheet");
  if (replace) stack.pop();
  stack.push({ build, closable });
  renderSheet();
  if (!dlg.open) dlg.showModal();
}
function renderSheet() {
  const dlg = $("sheet");
  const top = stack[stack.length - 1];
  dlg.replaceChildren();
  const inner = document.createElement("div");
  inner.className = "sheet-inner";
  dlg.appendChild(inner);
  const head = document.createElement("div");
  head.className = "sheet-head";
  const h = document.createElement("h2");
  head.appendChild(h);
  if (top.closable) {
    const done = document.createElement("button");
    done.className = "chip";
    done.textContent = stack.length > 1 ? "Back" : "Done";
    done.addEventListener("click", closeSheet);
    head.appendChild(done);
  }
  inner.appendChild(head);
  const body = document.createElement("div");
  body.className = "sheet-body";
  inner.appendChild(body);
  top.cleanup = top.build({ title: h, body, inner, head });
}
function closeSheet() {
  const dlg = $("sheet");
  const top = stack.pop();
  if (top && typeof top.cleanup === "function") top.cleanup();
  if (stack.length) renderSheet();
  else dlg.close();
}

function explain(topic) {
  const x = EXPLAIN[topic];
  openSheet(({ title, body }) => {
    title.textContent = x.title;
    for (const p of x.body) { const e = document.createElement("p"); e.textContent = p; body.appendChild(e); }
    const ul = document.createElement("ul");
    ul.className = "links";
    for (const [label, url] of x.links) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = label;
      li.appendChild(a); ul.appendChild(li);
    }
    body.appendChild(ul);
  });
}

function choice(label, sub, checked, onPick, info) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "choice";
  b.setAttribute("role", "radio");
  b.setAttribute("aria-checked", String(checked));
  const dot = document.createElement("span");
  dot.className = "dot";
  const t = document.createElement("span");
  t.className = "t";
  const bb = document.createElement("b");
  bb.textContent = label;
  t.appendChild(bb);
  if (sub) { const s = document.createElement("span"); s.textContent = sub; t.appendChild(s); }
  b.append(dot, t);
  if (info) b.appendChild(infoBtn(info));
  b.addEventListener("click", onPick);
  return b;
}
function h3(t) { const e = document.createElement("h3"); e.textContent = t; return e; }
function para(t, cls) { const e = document.createElement("p"); e.textContent = t; if (cls) e.className = cls; return e; }
function button(label, cls, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.className = `btn ${cls || ""}`; b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function openSettings() {
  openSheet(({ title, body }) => {
    title.textContent = "Settings";
    const s = state.settings;
    body.append(h3("Favourite method"));
    const favBox = document.createElement("div");
    favBox.setAttribute("role", "radiogroup");
    for (const m of METHODS) {
      favBox.appendChild(choice(m.name, methodSummary(m), s.fav === m.id, () => {
        s.fav = m.id; saveSettings(); rebuild(); renderSheet();
      }, m.explain));
    }
    body.append(favBox);

    body.append(h3("Place"));
    body.append(para(`${s.place.name} · ${coordsText(s.place)}`));
    body.append(button("Change place", "", () => openPlace()));

    body.append(h3("Summer rule"));
    const hl = document.createElement("div");
    hl.setAttribute("role", "radiogroup");
    for (const [id, r] of Object.entries(HIGH_LAT_RULES)) {
      hl.appendChild(choice(r.label, id === "method" ? "One third for Istanbul 2021, angle-based for the others" : "", s.highLat === id, () => {
        s.highLat = id; saveSettings(); rebuild(); renderSheet();
      }, id === "method" ? "summer" : null));
    }
    body.append(hl);

    body.append(h3("Time zone"));
    const sel = document.createElement("select");
    sel.className = "select";
    sel.setAttribute("aria-label", "Time zone");
    const auto = s.place.zone;
    const autoLabel = auto.zone ? auto.zone : offsetLabel(auto.fixed);
    const opt = (v, l, parent = sel) => { const o = document.createElement("option"); o.value = v; o.textContent = l; parent.appendChild(o); };
    opt("auto", `Automatic · ${autoLabel}`);
    const gFixed = document.createElement("optgroup");
    gFixed.label = "Fixed offset";
    const offs = [];
    for (let h = -12; h <= 14; h++) offs.push(h * 60);
    offs.push(-210, 210, 270, 330, 345, 390, 570, 630);
    offs.sort((a, b) => a - b).forEach((o) => opt(`fixed:${o}`, offsetLabel(o), gFixed));
    sel.appendChild(gFixed);
    const gZones = document.createElement("optgroup");
    gZones.label = "Time zones";
    let zones = [];
    try { zones = Intl.supportedValuesOf("timeZone"); } catch { zones = [...new Set(Object.values(COUNTRY_ZONES).flat().map((z) => z[0]))].sort(); }
    zones.forEach((z) => opt(`zone:${z}`, z.replace(/_/g, " "), gZones));
    sel.appendChild(gZones);
    sel.value = s.tz || "auto";
    sel.addEventListener("change", () => { s.tz = sel.value; saveSettings(); rebuild(); });
    const tzRow = document.createElement("div");
    tzRow.style.display = "flex";
    tzRow.style.gap = "10px";
    tzRow.style.alignItems = "center";
    tzRow.append(sel, infoBtn("timezone"));
    body.append(tzRow);

    body.append(h3("Rules"));
    const updated = [RULES_UPDATED, TZ_RULES_UPDATED].sort().pop();
    const [y, m, d] = updated.split("-").map(Number);
    body.append(para(`Methods and time-zone rules last updated on ${dateLong.format(new Date(Date.UTC(y, m - 1, d, 12)))}. The times themselves are computed on this phone for any day.`));

    body.append(h3("How prayer times work"));
    body.append(button("Read the guide", "", () => openPrayersGuide()));

    body.append(h3("About"));
    body.append(para("Nothing you enter leaves this phone. Your place, favourite, summer rule and time zone are kept on this phone only. Works offline once opened."));
    const ul = document.createElement("ul");
    ul.className = "links";
    for (const [label, url] of [
      ["Borders: Natural Earth (public domain)", "https://www.naturalearthdata.com/"],
      ["Towns in France and Morocco: GeoNames (CC BY 4.0)", "https://www.geonames.org/"],
      ["Formulas: PrayTimes and Jean Meeus", "https://praytimes.org/calculation"],
    ]) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = label;
      li.appendChild(a); ul.appendChild(li);
    }
    body.append(ul);
  });
}

// ---------- place ----------
async function setPlace(p, { keepFav = true } = {}) {
  await loadGeo();
  const d = describePlace(p.lat, p.lon);
  const place = { name: p.name || d.name, lat: +p.lat.toFixed(4), lon: +p.lon.toFixed(4), cc: d.cc, cont: d.cont, country: d.country };
  place.zone = zoneFor(place.lat, place.lon, place.cc);
  state.settings.place = place;
  if (!keepFav) state.settings.fav = regionalDefault(place);
  saveSettings();
  state.live = true; state.ymd = null;
  rebuild();
  return place;
}
function regionalDefault(place) {
  return REGION_DEFAULTS[place.cc] || CONTINENT_DEFAULTS[place.cont] || "mwl";
}

function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("unsupported")); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  });
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// The map sheet. onDone(point) is called with the chosen point.
function openPlace(onDone) {
  openSheet(({ title, body, inner }) => {
    title.textContent = "Place";
    body.remove();
    const tools = document.createElement("div");
    tools.className = "map-tools";
    const search = document.createElement("input");
    search.className = "map-search";
    search.type = "search";
    search.placeholder = "Find a town (offline)";
    search.setAttribute("aria-label", "Find a town");
    search.autocomplete = "off";
    const gps = document.createElement("button");
    gps.className = "chip";
    gps.type = "button";
    gps.textContent = "Locate me";
    tools.append(search, gps);
    const wrap = document.createElement("div");
    wrap.className = "map-wrap";
    const results = document.createElement("div");
    results.className = "results";
    results.hidden = true;
    const zoom = document.createElement("div");
    zoom.className = "map-zoom";
    const zin = document.createElement("button"); zin.textContent = "+"; zin.setAttribute("aria-label", "Zoom in");
    const zout = document.createElement("button"); zout.textContent = "−"; zout.setAttribute("aria-label", "Zoom out");
    zoom.append(zin, zout);
    wrap.append(results, zoom);
    const foot = document.createElement("div");
    foot.className = "map-foot";
    const coords = document.createElement("div");
    coords.className = "map-coords";
    coords.textContent = "Tap the map to choose a point.";
    const use = button("Use this place", "btn-primary", () => {});
    use.disabled = true;
    use.style.opacity = "0.5";
    foot.append(coords, use);
    inner.append(tools, wrap, foot);

    let picked = null;
    let map = null;
    const cur = state.settings.place;
    const show = (p) => {
      picked = p;
      coords.replaceChildren();
      const b = document.createElement("b");
      b.textContent = p.name;
      coords.append(b, text(`${coordsText(p)}${p.country && p.country !== p.name ? ` · ${p.country}` : ""}`));
      use.disabled = false;
      use.style.opacity = "1";
    };
    loadGeo().then(() => {
      map = mountMap(wrap, { lat: cur ? cur.lat : undefined, lon: cur ? cur.lon : undefined, picked: !!cur, onChange: show });
      if (cur) show({ lat: cur.lat, lon: cur.lon, ...describePlace(cur.lat, cur.lon), name: cur.name });
    });
    zin.addEventListener("click", () => map && map.zoom(2));
    zout.addEventListener("click", () => map && map.zoom(0.5));
    search.addEventListener("input", () => {
      const list = map ? map.search(search.value) : [];
      results.replaceChildren();
      results.hidden = !list.length;
      for (const t of list) {
        const b = document.createElement("button");
        b.type = "button";
        b.append(text(t.name));
        const sm = document.createElement("small");
        sm.textContent = t.cc;
        b.append(sm);
        b.addEventListener("click", () => {
          results.hidden = true; search.value = t.name; search.blur();
          map.goTo(t.lat, t.lon, 90);
        });
        results.appendChild(b);
      }
    });
    gps.addEventListener("click", async () => {
      gps.textContent = "Locating…";
      try {
        const p = await locate();
        map && map.goTo(p.lat, p.lon, 120);
      } catch (e) {
        toast(e && e.code === 1 ? "Location was not allowed. Pick the place on the map instead." : "Couldn't get your location. Pick the place on the map instead.");
      }
      gps.textContent = "Locate me";
    });
    use.addEventListener("click", async () => {
      if (!picked) return;
      const keep = !!state.settings.place;
      await setPlace({ lat: picked.lat, lon: picked.lon, name: picked.name }, { keepFav: true });
      if (onDone) onDone(state.settings.place, keep);
      else closeSheet();
    });
    return () => map && map.destroy();
  }, { closable: !!state.settings.place });
}

// ---------- first launch ----------
function onboarding() {
  openSheet(({ title, body }) => {
    title.textContent = "";
    const icon = document.createElement("img");
    icon.src = "icons/icon-192.png"; icon.alt = ""; icon.className = "welcome-icon";
    const h = document.createElement("h1");
    h.className = "welcome-title"; h.textContent = "Dawnline";
    body.append(icon, h);
    body.append(para("Where the sun is, and what each calculation method gives for every prayer of the day."));
    body.append(para("First, the place. Your position is used only when you tap “Locate me”, and stays on this phone."));
    body.append(button("Locate me", "btn-primary", async (e) => {
      e.target.textContent = "Locating…";
      try {
        const p = await locate();
        await setPlace(p, { keepFav: false });
        chooseConvention();
      } catch (err) {
        e.target.textContent = "Locate me";
        toast(err && err.code === 1 ? "Location was not allowed. Pick the place on the map instead." : "Couldn't get your location. Pick the place on the map instead.");
      }
    }));
    body.append(button("Pick on the map", "", () => openPlace(() => { state.settings.fav = regionalDefault(state.settings.place); saveSettings(); rebuild(); chooseConvention(true); })));
  }, { closable: false });
}

function chooseConvention(fromMap) {
  const place = state.settings.place;
  openSheet(({ title, body }) => {
    title.textContent = place.name;
    const finish = () => { saveSettings(); rebuild(); while (stack.length) stack.pop(); $("sheet").close(); };
    if (place.cc === "FR") {
      body.append(para("Which convention does your mosque use? You can change it any time in Settings."));
      const opts = [
        ["france12", "12° · Musulmans de France", "The most widespread French calendar"],
        ["france15", "15°", "Used by some mosques"],
        ["gmp", "Grande Mosquée de Paris", "Its own timetable: Isha 1 h 30 after sunset"],
        ["istanbul", "Istanbul 2021", "Diyanet and the European Council for Fatwa"],
      ];
      for (const [id, l, sub] of opts) body.append(choice(l, sub, false, () => { state.settings.fav = id; finish(); }));
      body.append(choice("Not sure", "Starts with 12°, the most widespread French calendar", false, () => {
        state.settings.fav = "france12"; finish(); toast("12° preselected: the most widespread French calendar.");
      }));
      const why = document.createElement("button");
      why.type = "button"; why.className = "inline-info";
      why.append(infoBtn("france"), text("Why France has 12°, 15° and 18°"));
      why.addEventListener("click", () => explain("france"));
      body.append(why);
    } else {
      const m = byId[state.settings.fav];
      body.append(para(place.cc === "MA" || place.cc === "EH"
        ? "Morocco's official method (Ministry of Habous) is your favourite."
        : `Suggested for ${place.country || "this place"}: ${m.name}. You can pick another one now or later in Settings.`));
      for (const mm of METHODS) {
        body.append(choice(mm.name, methodSummary(mm), mm.id === state.settings.fav, () => { state.settings.fav = mm.id; finish(); }));
      }
      body.append(button("Continue", "btn-primary", finish));
    }
  }, { replace: !!fromMap, closable: false });
}

// ---------- start ----------
function tick() {
  if (!state.settings.place) return;
  if (state.live) {
    const now = Date.now();
    if (!state.day || now >= state.day.end || now < state.day.start) rebuild();
    else { state.cursor = now; renderCursor(); }
  }
  renderCountdown();
}

function init() {
  $("settingsBtn").addEventListener("click", openSettings);
  $("guideBtn").addEventListener("click", openPrayersGuide);
  $("angleBtn").addEventListener("click", () => state.day && openAngleSheet());
  $("placeBtn").addEventListener("click", () => openPlace());
  $("nowBtn").addEventListener("click", goLive);
  $("dateInput").addEventListener("change", (e) => onDatePicked(e.target.value));
  $("bars").addEventListener("click", onBarsClick);
  $("graphInfo").appendChild(infoBtn("dawn"));
  $("barsInfo").appendChild(infoBtn("summer"));
  document.addEventListener("click", (e) => { if (!e.target.closest("#pop") && !e.target.closest("#bars")) hidePop(); });
  $("sheet").addEventListener("cancel", (e) => { e.preventDefault(); if (stack.length && stack[stack.length - 1].closable) closeSheet(); });
  setupScrub();
  darkQuery.addEventListener("change", () => state.day && renderCursor());
  let lastW = 0;
  new ResizeObserver(() => {
    const w = $("plot").clientWidth;
    if (state.day && Math.abs(w - lastW) > 1) { lastW = w; renderStatic(); renderCursor(); }
  }).observe($("plot"));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  setInterval(tick, 15000);
  $("main").hidden = false;
  if (state.settings.place) rebuild();
  else { paintSky(-14); onboarding(); }
  if ("serviceWorker" in navigator) {
    // When an update (new cache version) takes over, reload once to show it.
    // Not on the very first visit, when there was no worker before.
    const hadWorker = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadWorker && !reloaded) { reloaded = true; location.reload(); } });
  }
}
init();

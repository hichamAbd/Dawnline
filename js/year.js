// Day and night through the year at one place: each civil day's sunrise to
// sunset, and the Islamic day (Maghrib to Maghrib), plus their yearly
// turning points.
import { sunDay, methodTimes } from "./prayer.js";
import { sunAltitude, RISE_SET_ALT } from "./astro.js";

const DAY = 86400000;

export function addDays(ymd, n) {
  const d = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + n, 12));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

// Sunrise to sunset. On the days the midnight sun begins and ends only one of
// the two exists: a sunrise that is never followed by a sunset opens the
// midnight sun (a full day); the first sunset after it closes it (the day ran
// from the solar midnight). At the edge of the polar night, where the sun only
// peeps out around noon, the half that exists is mirrored about noon.
function dayLength(day) {
  const { sunrise, sunset, start, end, noon, place } = day;
  const rise = Number.isFinite(sunrise), set = Number.isFinite(sunset);
  if (rise && set) return sunset - sunrise;
  const up = (t) => sunAltitude(t, place.lat, place.lon) > RISE_SET_ALT;
  if (rise) return up(end) ? DAY : Math.max(0, 2 * (noon - sunrise));
  if (set) return up(start) ? sunset - start : Math.max(0, 2 * (sunset - noon));
  return day.minAlt > RISE_SET_ALT ? DAY : 0; // midnight sun or polar night
}

// One entry per civil day from center - span to center + span (a year and a
// half each way, so the last and next yearly extremes are always in reach).
// dayLen: sunrise -> sunset (24 h under midnight sun, 0 in polar night).
// nightLen: sunset -> next sunrise.
// islDay: the Islamic day that ends at this day's Maghrib, counted from the
// evening before's Maghrib (real time elapsed, clock changes do not count).
// Every method puts Maghrib a fixed number of minutes after sunset, so this
// is sunset to sunset and the same for all of them. NaN without a sunset.
export function yearSeries(place, center, spec, method, highLat = "method", span = 560) {
  const out = [];
  let prevSunset = NaN;
  for (let i = -span - 1; i <= span; i++) {
    const ymd = addDays(center, i);
    const day = sunDay(place, ymd, spec);
    const t = methodTimes(method, day, highLat);
    const dayLen = dayLength(day);
    const nightLen = Number.isFinite(day.nightAfter) ? day.nightAfter : DAY - dayLen;
    const islDay = day.sunset - prevSunset;
    if (i >= -span) out.push({ i, ymd, day, times: t, dayLen, nightLen, islDay });
    prevSunset = day.sunset;
  }
  return out;
}

// Yearly turning points of series[key]: local maxima ("max") or minima
// ("min") over +-25 days, with ties and plateaus (midnight sun) merged into
// { from, to } index ranges. Points too close to the ends are dropped.
export function turningPoints(series, key, kind) {
  const v = series.map((s) => s[key]);
  const W = 25;
  const beats = kind === "max" ? (a, b) => a > b : (a, b) => a < b;
  const hits = [];
  for (let i = W; i < v.length - W; i++) {
    if (!Number.isFinite(v[i])) continue;
    let ok = true;
    for (let j = i - W; j <= i + W && ok; j++) if (j !== i && Number.isFinite(v[j]) && beats(v[j], v[i])) ok = false;
    if (ok) hits.push(i);
  }
  const groups = [];
  for (const i of hits) {
    const g = groups[groups.length - 1];
    if (g && i - g.to <= 1) g.to = i;
    else groups.push({ from: i, to: i });
  }
  // A real turning point stands out from the days just outside it; a flat
  // stretch inside the midnight sun or the polar night does not.
  const worse = (a, b) => Number.isFinite(a) && Number.isFinite(b) && beats(b, a);
  return groups.filter((g) => worse(v[g.from - 1], v[g.from]) && worse(v[g.to + 1], v[g.to]));
}

// The yearly extremes of series[key]: days whose value beats every other day
// within half a year either side (ties go to the earlier day), as { from, to }
// like turningPoints. Unlike day length, the Islamic day's length can have two
// peaks a year; this keeps only the year's real longest or shortest, and days
// next to a gap (no sunset) still count.
export function yearlyExtremes(series, key, kind, half = 182) {
  const v = series.map((s) => s[key]);
  const beats = kind === "max" ? (a, b) => a > b : (a, b) => a < b;
  const out = [];
  for (let i = half; i < v.length - half; i++) {
    if (!Number.isFinite(v[i])) continue;
    let ok = true;
    for (let j = i - half; j <= i + half && ok; j++) {
      if (j === i || !Number.isFinite(v[j])) continue;
      if (beats(v[j], v[i]) || (v[j] === v[i] && j < i)) ok = false;
    }
    if (ok) out.push({ from: i, to: i });
  }
  return out;
}

// The turning point covering index c (today), the last one before, the next after.
export function around(groups, c) {
  return {
    at: groups.find((g) => g.from <= c && c <= g.to) || null,
    past: [...groups].reverse().find((g) => g.to < c) || null,
    next: groups.find((g) => g.from > c) || null,
  };
}

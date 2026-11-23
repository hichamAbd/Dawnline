// Day and night through the year at one place: each civil day's sunrise to
// sunset, and the Islamic split of the day for one method (night Maghrib ->
// Fajr, then day Fajr -> Maghrib), plus their yearly turning points.
import { sunDay, methodTimes } from "./prayer.js";

const DAY = 86400000;

export function addDays(ymd, n) {
  const d = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + n, 12));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

// One entry per civil day from center - span to center + span.
// dayLen: sunrise -> sunset (24 h under midnight sun, 0 in polar night).
// nightLen: sunset -> next sunrise. fast: Fajr -> Maghrib (the Islamic day).
// islNight: previous Maghrib -> Fajr (the night that opens the Islamic day).
export function yearSeries(place, center, spec, method, highLat = "method", span = 400) {
  const out = [];
  let prevMaghrib = NaN;
  for (let i = -span - 1; i <= span; i++) {
    const ymd = addDays(center, i);
    const day = sunDay(place, ymd, spec);
    const t = methodTimes(method, day, highLat);
    const up = Number.isFinite(day.sunrise) && Number.isFinite(day.sunset);
    // No sunrise or sunset: a full day only if the sun never sets.
    const dayLen = up ? day.sunset - day.sunrise : day.minAlt > -0.833 ? DAY : 0;
    const nightLen = up && Number.isFinite(day.nightAfter) ? day.nightAfter : DAY - dayLen;
    const fast = Number.isFinite(t.fajr) && Number.isFinite(t.maghrib) ? t.maghrib - t.fajr : NaN;
    const islNight = Number.isFinite(t.fajr) && Number.isFinite(prevMaghrib) ? t.fajr - prevMaghrib : NaN;
    if (i >= -span) out.push({ i, ymd, day, times: t, dayLen, nightLen, fast, islNight });
    prevMaghrib = t.maghrib;
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

// The turning point covering index c (today), the last one before, the next after.
export function around(groups, c) {
  return {
    at: groups.find((g) => g.from <= c && c <= g.to) || null,
    past: [...groups].reverse().find((g) => g.to < c) || null,
    next: groups.find((g) => g.from > c) || null,
  };
}

// Prayer times for one place and one civil date, for every method.
import * as A from "./astro.js";
import { zonedToUtc, isRamadan } from "./tz.js";

const MIN = 60000;
const HOUR = 3600000;
const DAY = 86400000;

// Lower transit (solar midnight) nearest to an instant.
function solarMidnight(nearMs, lon) {
  let t = nearMs;
  for (let i = 0; i < 4; i++) {
    let h = A.hourAngle(t, lon); // -180..180, 180 at lower transit
    let diff = h >= 0 ? 180 - h : -180 - h;
    t += (diff / 15) * HOUR;
  }
  return t;
}

// Everything about the sun for the civil date y-m-d at a place.
export function sunDay(place, ymd, spec) {
  const { lat, lon } = place;
  const localNoon = zonedToUtc(spec, ymd.y, ymd.m, ymd.d, 12, 0);
  const noon = A.solarNoon(localNoon, lon);
  const at = (alt, dir, n = noon) => A.timeAtAltitude(n, alt, lat, lon, dir);
  const prevNoon = A.solarNoon(noon - DAY, lon);
  const nextNoon = A.solarNoon(noon + DAY, lon);
  const sunrise = at(A.RISE_SET_ALT, -1);
  const sunset = at(A.RISE_SET_ALT, 1);
  const prevSunset = at(A.RISE_SET_ALT, 1, prevNoon);
  const nextSunrise = at(A.RISE_SET_ALT, -1, nextNoon);
  const ext = A.dayExtremes(noon, lat);
  return {
    place, ymd, spec, noon,
    start: solarMidnight(noon - 12 * HOUR, lon),
    end: solarMidnight(noon + 12 * HOUR, lon),
    sunrise, sunset,
    nightBefore: sunrise - prevSunset,
    nightAfter: nextSunrise - sunset,
    civil: [at(-6, -1), at(-6, 1)],
    nautical: [at(-12, -1), at(-12, 1)],
    astronomical: [at(-18, -1), at(-18, 1)],
    maxAlt: ext.max,
    minAlt: ext.min,
    ramadan: isRamadan(spec, noon),
  };
}

// Share of the night used by a summer / high-latitude rule.
function portion(rule, angle) {
  switch (rule) {
    case "angle": return angle / 60;
    case "seventh": return 1 / 7;
    case "middle": return 1 / 2;
    case "third": return 1 / 3;
    default: return null;
  }
}

// Times for one method. `highLat` is "method" (each method's own rule) or a
// rule forced in Settings. Returns ms values and, for Fajr and Isha, why a
// time was estimated (null when the sun's angle was used as is).
export function methodTimes(m, day, highLat = "method") {
  const { lat, lon } = day.place;
  const rule = highLat === "method" ? m.highLat : highLat;
  const off = (k) => ((m.offsets && m.offsets[k]) || 0) * MIN;
  const out = { method: m, est: { fajr: null, isha: null } };

  if (!Number.isFinite(day.sunrise) || !Number.isFinite(day.sunset)) {
    out.polar = true;
    out.dhuhr = day.noon + off("dhuhr");
    return out;
  }

  // Fajr
  let fajr = A.timeAtAltitude(day.noon, -m.fajr, lat, lon, -1);
  const pf = portion(rule, m.fajr);
  if (pf !== null) {
    const limit = day.sunrise - pf * day.nightBefore;
    if (!Number.isFinite(fajr)) {
      out.est.fajr = { why: "nosign", rule, angle: m.fajr, raw: NaN };
      fajr = limit;
    } else if (fajr < limit) {
      out.est.fajr = { why: "beyond", rule, angle: m.fajr, raw: fajr + off("fajr") };
      fajr = limit;
    }
  }
  out.fajr = fajr + off("fajr");
  out.sunrise = day.sunrise + off("sunrise");
  out.dhuhr = day.noon + off("dhuhr");
  out.asr = A.timeAtAltitude(day.noon, (d) => A.asrAltitude(1, lat, d), lat, lon, 1) + off("asr");
  out.asrHanafi = A.timeAtAltitude(day.noon, (d) => A.asrAltitude(2, lat, d), lat, lon, 1) + off("asr");
  out.maghrib = day.sunset + off("maghrib");

  // Isha
  if (m.ishaInterval) {
    const mins = day.ramadan && m.ishaIntervalRamadan ? m.ishaIntervalRamadan : m.ishaInterval;
    out.isha = out.maghrib + mins * MIN + off("isha");
    out.ishaFixed = mins;
  } else {
    let isha = A.timeAtAltitude(day.noon, -m.isha, lat, lon, 1);
    const pi = portion(rule, m.isha);
    if (pi !== null) {
      const limit = day.sunset + pi * day.nightAfter;
      if (!Number.isFinite(isha)) {
        out.est.isha = { why: "nosign", rule, angle: m.isha, raw: NaN };
        isha = limit;
      } else if (isha > limit) {
        out.est.isha = { why: "beyond", rule, angle: m.isha, raw: isha + off("isha") };
        isha = limit;
      }
    }
    out.isha = isha + off("isha");
  }
  return out;
}

export const PRAYERS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
export const PRAYER_NAMES = { fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };

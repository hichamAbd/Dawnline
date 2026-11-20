// Local time for a place: the phone's built-in time-zone data, corrected by
// the rules in data/timezones.js, or a fixed offset chosen in Settings.
// A zone spec is either { zone: "Europe/Paris" } or { fixed: 60 } (minutes).
import { TZ_OVERRIDES } from "./data/timezones.js";

const MIN = 60000;
const fmtCache = new Map();

function partsFormatter(zone) {
  let f = fmtCache.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    fmtCache.set(zone, f);
  }
  return f;
}

// Offset (minutes east of UTC) from the phone's own data.
export function builtinOffset(zone, ms) {
  const t = Math.floor(ms / 1000) * 1000;
  const p = {};
  for (const x of partsFormatter(zone).formatToParts(new Date(t))) p[x.type] = x.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - t) / MIN);
}

function overrideFor(zone, ms) {
  const list = TZ_OVERRIDES[zone];
  if (!list) return null;
  let hit = null;
  for (const r of list) if (Date.parse(r.from) <= ms) hit = r;
  return hit;
}

// Offset in minutes for a zone spec at an instant.
export function offsetAt(spec, ms) {
  if (spec.fixed !== undefined) return spec.fixed;
  const o = overrideFor(spec.zone, ms);
  if (o) return o.offset;
  try {
    return builtinOffset(spec.zone, ms);
  } catch {
    return 0;
  }
}

// Calendar fields of an instant in the place's local time.
export function localParts(spec, ms) {
  const d = new Date(ms + offsetAt(spec, ms) * MIN);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(),
    hh: d.getUTCHours(), mm: d.getUTCMinutes(), ss: d.getUTCSeconds(), wd: d.getUTCDay(),
  };
}

// UTC instant of a local wall-clock time.
export function zonedToUtc(spec, y, m, d, hh = 0, mm = 0) {
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let t = wall - offsetAt(spec, wall) * MIN;
  t = wall - offsetAt(spec, t) * MIN;
  return t;
}

const pad = (n) => String(n).padStart(2, "0");

// "05:32": rounded to the nearest minute.
export function hhmm(spec, ms) {
  if (!Number.isFinite(ms)) return "—";
  const r = Math.round(ms / MIN) * MIN;
  const p = localParts(spec, r);
  return `${pad(p.hh)}:${pad(p.mm)}`;
}

// "UTC+1", "UTC−3:30"
export function offsetLabel(minutes) {
  if (minutes === 0) return "UTC+0";
  const sign = minutes > 0 ? "+" : "−";
  const a = Math.abs(minutes);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? ":" + pad(a % 60) : ""}`;
}

// Is this instant in Ramadan, by the Umm al-Qura calendar built into the browser?
export function isRamadan(spec, ms) {
  try {
    const shifted = ms + offsetAt(spec, ms) * MIN;
    const f = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", { timeZone: "UTC", month: "numeric" });
    return +f.formatToParts(new Date(shifted)).find((x) => x.type === "month").value === 9;
  } catch {
    return false;
  }
}

export function ymdOf(spec, ms) {
  const p = localParts(spec, ms);
  return { y: p.y, m: p.m, d: p.d };
}

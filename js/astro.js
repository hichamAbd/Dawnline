// Sun position and the times when the sun reaches a given altitude.
// Algorithm: NOAA / Jean Meeus, "Astronomical Algorithms" (low-precision solar
// coordinates, accurate to about 0.01 degree for 1950-2050).
// All times are Unix milliseconds (UTC). Angles are degrees.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const MIN = 60000;
const HOUR = 3600000;

const mod = (a, n) => ((a % n) + n) % n;

export function julianDay(ms) {
  return ms / 86400000 + 2440587.5;
}

// Declination (degrees) and equation of time (minutes) at an instant.
export function sunCoords(ms) {
  const T = (julianDay(ms) - 2451545.0) / 36525;
  const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360);
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Mr = M * RAD;
  const C =
    Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mr) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;
  const y = Math.tan((eps * RAD) / 2) ** 2;
  const L0r = L0 * RAD;
  const E =
    y * Math.sin(2 * L0r) -
    2 * e * Math.sin(Mr) +
    4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) -
    0.5 * y * y * Math.sin(4 * L0r) -
    1.25 * e * e * Math.sin(2 * Mr);
  return { decl, eqTime: 4 * E * DEG };
}

// Signed hour angle of the sun in degrees, in [-180, 180): negative before noon.
export function hourAngle(ms, lon) {
  const { eqTime } = sunCoords(ms);
  const utcMin = mod(ms / MIN, 1440);
  return mod(utcMin + eqTime + 4 * lon, 1440) / 4 - 180;
}

// Geometric altitude of the sun's centre (no refraction), degrees.
export function sunAltitude(ms, lat, lon) {
  const { decl } = sunCoords(ms);
  const H = hourAngle(ms, lon) * RAD;
  const p = lat * RAD;
  const d = decl * RAD;
  return Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H)) * DEG;
}

// Solar noon (upper transit) nearest to the instant `nearMs`.
export function solarNoon(nearMs, lon) {
  let t = nearMs;
  for (let i = 0; i < 4; i++) t -= (hourAngle(t, lon) / 15) * HOUR;
  return t;
}

// Altitude of the sun when an object's shadow equals its noon shadow plus
// `factor` times its height (factor 1: standard Asr, 2: Hanafi Asr).
export function asrAltitude(factor, lat, decl) {
  return Math.atan(1 / (factor + Math.tan(Math.abs(lat - decl) * RAD))) * DEG;
}

// Instant when the sun's centre reaches `alt` degrees, before (dir -1) or after
// (dir +1) the solar noon `noonMs`. `alt` can be a function of declination.
// Returns NaN when the sun never reaches that altitude on that day.
export function timeAtAltitude(noonMs, alt, lat, lon, dir) {
  const p = lat * RAD;
  let t = noonMs + dir * 6 * HOUR;
  for (let i = 0; i < 8; i++) {
    const { decl } = sunCoords(t);
    const h = typeof alt === "function" ? alt(decl) : alt;
    const d = decl * RAD;
    const cosH = (Math.sin(h * RAD) - Math.sin(p) * Math.sin(d)) / (Math.cos(p) * Math.cos(d));
    if (cosH < -1 || cosH > 1) return NaN;
    const target = dir * Math.acos(cosH) * DEG; // wanted hour angle
    const now = hourAngle(t, lon);
    let diff = target - now;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const step = (diff / 15) * HOUR * 0.99727;
    t += step;
    if (Math.abs(step) < 200) break;
  }
  return t;
}

// Lowest and highest altitude of the day around a solar noon (degrees).
export function dayExtremes(noonMs, lat) {
  const { decl } = sunCoords(noonMs);
  return { max: 90 - Math.abs(lat - decl), min: Math.abs(lat + decl) - 90, decl };
}

export const RISE_SET_ALT = -0.833;
export { MIN, HOUR };

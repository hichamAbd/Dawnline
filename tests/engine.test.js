// Run with: node --test tests/
// Reference timetables (see CLAUDE.md). Tolerance ±1 minute unless noted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { METHODS } from "../js/data/methods.js";
import { sunDay, methodTimes } from "../js/prayer.js";
import { hhmm, offsetAt } from "../js/tz.js";

const M = Object.fromEntries(METHODS.map((m) => [m.id, m]));
const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
function near(actual, expected, tol, label) {
  let d = toMin(actual) - toMin(expected);
  if (d > 720) d -= 1440;
  if (d < -720) d += 1440;
  assert.ok(Math.abs(d) <= tol, `${label}: got ${actual}, expected ${expected} (±${tol})`);
}
function times(methodId, lat, lon, y, m, d, spec, highLat = "method") {
  const day = sunDay({ lat, lon }, { y, m, d }, spec);
  const t = methodTimes(M[methodId], day, highLat);
  return { t, day, f: (k) => hhmm(spec, t[k]) };
}

const MOROCCO = { zone: "Africa/Casablanca" };
const morocco = [
  ["Casablanca", 33.5731, -7.5898, ["05:32", "12:20", "15:07", "17:32", "18:49"]],
  ["Marrakech", 31.6295, -7.9811, ["05:31", "12:22", "15:12", "17:38", "18:52"]],
  ["Fès", 34.0331, -5.0003, ["05:22", "12:10", "14:55", "17:21", "18:37"]],
];
for (const [city, lat, lon, exp] of morocco) {
  test(`Morocco, ${city}, 16 Nov 2026`, () => {
    const { f } = times("morocco", lat, lon, 2026, 11, 16, MOROCCO);
    ["fajr", "dhuhr", "asr", "maghrib", "isha"].forEach((k, i) => near(f(k), exp[i], 1, `${city} ${k}`));
  });
}

test("Morocco is UTC+0 after 20 Sep 2026 02:00, whatever the phone's data says", () => {
  assert.equal(offsetAt(MOROCCO, Date.parse("2026-11-16T12:00:00Z")), 0);
  assert.equal(offsetAt(MOROCCO, Date.parse("2026-09-20T01:00:00Z")), 0);
});

const PARIS = { zone: "Europe/Paris" };
test("France 12°, Paris, 27 Oct 2026 (UTC+1)", () => {
  const { f } = times("france12", 48.8534, 2.3488, 2026, 10, 27, PARIS);
  const exp = { fajr: "06:20", sunrise: "07:29", dhuhr: "12:34", asr: "15:11", maghrib: "17:39", isha: "18:48" };
  for (const k in exp) near(f(k), exp[k], 1, k);
});

test("Paris, 15 Jul 2026 (UTC+2): 12° and 18° with the angle-based rule", () => {
  const a = times("france12", 48.8534, 2.3488, 2026, 7, 15, PARIS);
  near(a.f("fajr"), "04:27", 1, "12° fajr");
  near(a.f("isha"), "23:25", 1, "12° isha");
  const b = times("karachi", 48.8534, 2.3488, 2026, 7, 15, PARIS);
  near(hhmm(PARIS, b.t.est.fajr.raw), "03:04", 1, "18° raw fajr");
  near(hhmm(PARIS, b.t.est.isha.raw), "00:46", 1, "18° raw isha");
  near(b.f("fajr"), "03:35", 1, "18° angle-based fajr");
  near(b.f("isha"), "00:18", 1, "18° angle-based isha");
  assert.ok(b.t.est.fajr && b.t.est.isha, "both marked estimated");
});

test("Umm al-Qura, Makkah, 6 Nov 2026 (UTC+3)", () => {
  const { f, t } = times("ummalqura", 21.4225, 39.8262, 2026, 11, 6, { zone: "Asia/Riyadh" });
  const exp = { fajr: "05:08", sunrise: "06:26", dhuhr: "12:04", asr: "15:19", maghrib: "17:42", isha: "19:12" };
  for (const k in exp) near(f(k), exp[k], 1, k);
  near(hhmm({ zone: "Asia/Riyadh" }, t.asrHanafi), "16:06", 1, "hanafi asr");
});

test("Diyanet, Kütahya, 27 Jul 2026 (UTC+3), ±2 min", () => {
  const { f } = times("diyanet", 39.4167, 29.9833, 2026, 7, 27, { zone: "Europe/Istanbul" });
  const exp = ["04:06", "05:48", "13:12", "17:05", "20:25", "22:01"];
  ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].forEach((k, i) => near(f(k), exp[i], 2, k));
});

// ---------- longer checks against whole published timetables ----------
import fs from "node:fs";
import * as A from "../js/astro.js";
const fixture = (f) => JSON.parse(fs.readFileSync(new URL(`./data/${f}`, import.meta.url)));

test("Diyanet, Kütahya: every day of 2026 within 2 minutes", () => {
  const data = fixture("diyanet-kutahya-2026.json");
  const spec = { zone: "Europe/Istanbul" };
  for (const r of data.rows) {
    const [dd, mm, yy] = r[0].split(".").map(Number);
    const t = methodTimes(M.diyanet, sunDay(data.place, { y: yy, m: mm, d: dd }, spec));
    ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].forEach((k, i) => near(hhmm(spec, t[k]), r[i + 1], 2, `${r[0]} ${k}`));
  }
});

for (const f of ["gmp-ramadan-2026.json", "gmp-november-2026.json"]) {
  test(`Grande Mosquée de Paris, its own timetable (${f})`, () => {
    const data = fixture(f);
    for (const r of data.rows) {
      const [y, m, d] = r.date.split("-").map(Number);
      const t = methodTimes(M.gmp, sunDay(data.place, { y, m, d }, PARIS));
      for (const k of ["sunrise", "dhuhr", "asr", "maghrib", "isha"]) near(hhmm(PARIS, t[k]), r[k], 1, `${r.date} ${k}`);
      // No published Fajr angle: 16° fits both timetables within 3 minutes.
      near(hhmm(PARIS, t.fajr), r.fajr, 3, `${r.date} fajr`);
    }
  });
}

test("Morocco, Casablanca, whole November 2026 timetable (all six times)", () => {
  const data = fixture("morocco-casablanca-2026-11.json");
  for (const r of data.rows) {
    const [y, m, d] = r.date.split("-").map(Number);
    const t = methodTimes(M.morocco, sunDay(data.place, { y, m, d }, MOROCCO));
    for (const k of ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]) near(hhmm(MOROCCO, t[k]), r[k], 1, `${r.date} ${k}`);
  }
});

test("No 18° twilight: Paris 12-30 June 2026, Lille 28 May-16 July", () => {
  const no18 = (lat, lon, y, m, d, dir) => {
    const day = sunDay({ lat, lon }, { y, m, d }, PARIS);
    return !Number.isFinite(A.timeAtAltitude(day.noon, -18, lat, lon, dir));
  };
  // Paris: evenings 12-29 June have no 18° dusk, mornings 13-30 June no 18° dawn.
  assert.ok(!no18(48.8566, 2.3522, 2026, 6, 11, 1) && no18(48.8566, 2.3522, 2026, 6, 12, 1));
  assert.ok(no18(48.8566, 2.3522, 2026, 6, 30, -1) && !no18(48.8566, 2.3522, 2026, 7, 1, -1));
  // Lille: mornings 28 May-16 July have no 18° dawn.
  assert.ok(!no18(50.6292, 3.0573, 2026, 5, 27, -1) && no18(50.6292, 3.0573, 2026, 5, 28, -1));
  assert.ok(no18(50.6292, 3.0573, 2026, 7, 16, -1) && !no18(50.6292, 3.0573, 2026, 7, 17, -1));
});

test("Umm al-Qura: Isha 120 min after Maghrib in Ramadan (20 Feb 2027)", () => {
  const { t } = times("ummalqura", 21.4225, 39.8262, 2027, 2, 20, { zone: "Asia/Riyadh" });
  assert.equal(t.ishaFixed, 120);
  const { t: t2 } = times("ummalqura", 21.4225, 39.8262, 2026, 11, 6, { zone: "Asia/Riyadh" });
  assert.equal(t2.ishaFixed, 90);
});

test("Istanbul 2021 keeps the one-third rule (L'Aigle, 28 Jul 2026)", () => {
  const { f, t } = times("istanbul", 48.7656, 0.6286, 2026, 7, 28, PARIS);
  near(f("fajr"), "03:53", 1, "fajr");
  near(f("isha"), "00:00", 1, "isha");
  assert.equal(t.est.fajr, null);
  const june = times("istanbul", 48.8534, 2.3488, 2026, 6, 21, PARIS);
  assert.equal(june.t.est.fajr.rule, "third");
});

test("Midnight sun: Tromsø, 21 June, no crash and no Fajr or Isha", () => {
  const { t } = times("mwl", 69.6496, 18.956, 2026, 6, 21, { zone: "Europe/Oslo" });
  assert.ok(t.polar);
  assert.ok(Number.isFinite(t.dhuhr));
});

test("A fixed time-zone override wins over the zone's own data", () => {
  assert.equal(offsetAt({ fixed: 180 }, Date.parse("2026-11-20T12:00:00Z")), 180);
  assert.equal(offsetAt({ zone: "Europe/Paris" }, Date.parse("2026-07-15T12:00:00Z")), 120);
  assert.equal(offsetAt({ zone: "Europe/Paris" }, Date.parse("2026-11-20T12:00:00Z")), 60);
});

// ---------- named moments and typed angles ----------
import { sunMoments, timesAtAltitude } from "../js/prayer.js";

test("Named moments: sunrise and sunset match the day, every crossing is at its angle", () => {
  const day = sunDay({ lat: 48.8534, lon: 2.3488 }, { y: 2026, m: 10, d: 27 }, PARIS);
  const ms = sunMoments(day);
  const find = (name) => ms.find((m) => m.name === name);
  assert.equal(find("Sunrise").t, day.sunrise);
  assert.equal(find("Sunset").t, day.sunset);
  assert.equal(find("Solar noon").t, day.noon);
  for (const m of ms.filter((m) => m.angle && m.angle !== 0.833)) {
    const alt = A.sunAltitude(m.t, 48.8534, 2.3488);
    assert.ok(Math.abs(alt + m.angle) < 0.02, `${m.name}: ${alt}`);
  }
  // in time order, morning crossings before noon, evening ones after
  for (let i = 1; i < ms.length; i++) assert.ok(ms[i].t >= ms[i - 1].t);
  near(hhmm(PARIS, find("Nautical dawn · 12°").t), "06:20", 1, "12° dawn = France 12° Fajr");
});

test("Typed angle: rising and setting times, and unreachable angles", () => {
  const day = sunDay({ lat: 48.8566, lon: 2.3522 }, { y: 2026, m: 6, d: 21 }, PARIS);
  const below18 = timesAtAltitude(day, -18);
  assert.ok(!Number.isFinite(below18.rising) && !Number.isFinite(below18.setting), "Paris never reaches -18° on 21 June");
  const above60 = timesAtAltitude(day, 60);
  assert.ok(Number.isFinite(above60.rising) && Number.isFinite(above60.setting) && above60.rising < above60.setting);
  const above70 = timesAtAltitude(day, 70);
  assert.ok(!Number.isFinite(above70.rising), "the sun stays below 70°");
});

// ---------- day and night through the year ----------
import { yearSeries, turningPoints, yearlyExtremes, around } from "../js/year.js";

test("Year turning points: solstices in Paris, Sydney reversed, Tromsø midnight sun and polar night", () => {
  const ymdStr = (s, i) => `${s[i].ymd.y}-${s[i].ymd.m}-${s[i].ymd.d}`;
  const check = (lat, lon, zone, ymd, expect) => {
    const s = yearSeries({ lat, lon }, ymd, { zone }, M.mwl);
    const c = s.findIndex((e) => e.i === 0);
    const mx = around(turningPoints(s, "dayLen", "max"), c), mn = around(turningPoints(s, "dayLen", "min"), c);
    return { s, c, mx, mn, str: (g) => g && (g.from === g.to ? ymdStr(s, g.from) : `${ymdStr(s, g.from)}..${ymdStr(s, g.to)}`) };
  };
  let r = check(48.8566, 2.3522, "Europe/Paris", { y: 2026, m: 11, d: 23 });
  assert.equal(r.str(r.mx.past), "2026-6-21");
  assert.equal(r.str(r.mn.next), "2026-12-21");
  assert.ok(r.s[r.c].dayLen < r.s[r.c - 1].dayLen, "days shrinking in November");
  r = check(48.8566, 2.3522, "Europe/Paris", { y: 2026, m: 12, d: 21 });
  assert.equal(r.str(r.mn.at), "2026-12-21", "21 December is the shortest day");
  r = check(-33.8688, 151.2093, "Australia/Sydney", { y: 2026, m: 11, d: 23 });
  assert.equal(r.str(r.mx.next), "2026-12-22");
  r = check(69.6496, 18.956, "Europe/Oslo", { y: 2026, m: 11, d: 23 });
  assert.equal(r.str(r.mx.past), "2026-5-18..2026-7-25", "midnight sun");
  assert.equal(r.str(r.mn.next), "2026-11-28..2027-1-14", "polar night (on 27 Nov the sun still peeps out at noon)");
  // The days the midnight sun begins and ends are not turning points of their own.
  r = check(69.6496, 18.956, "Europe/Oslo", { y: 2027, m: 6, d: 15 });
  assert.equal(r.str(r.mx.at), "2027-5-18..2027-7-25", "midnight sun now");
  assert.equal(r.str(r.mn.next), "2027-11-28..2028-1-14", "next shortest day: the polar night, not the end of the midnight sun");
  const jul26 = r.s.find((e) => e.ymd.m === 7 && e.ymd.d === 26 && e.ymd.y === 2027);
  assert.ok(jul26.dayLen > 23 * 3600000 && jul26.dayLen < 86400000, "first sunset after the midnight sun: almost a full day");
});

test("Islamic day: Maghrib to Maghrib, the same for every method, real time across a clock change", () => {
  const P = { lat: 48.8566, lon: 2.3522 }, ymd = { y: 2026, m: 11, d: 24 }, zone = { zone: "Europe/Paris" };
  const a = yearSeries(P, ymd, zone, M.france12), b = yearSeries(P, ymd, zone, M.gmp), d = yearSeries(P, ymd, zone, M.morocco);
  const c = a.findIndex((e) => e.i === 0);
  for (const s of [a, b, d]) assert.ok(Math.abs(s[c].islDay - (s[c].times.maghrib - s[c - 1].times.maghrib)) < 1, "Maghrib to Maghrib");
  assert.ok(Math.abs(a[c].islDay - b[c].islDay) < 1 && Math.abs(a[c].islDay - d[c].islDay) < 1, "same length for every method");
  const dev = (e) => (e.islDay - 86400000) / 1000;
  assert.ok(Math.abs(dev(a[c]) + 51.4) < 1, `24 Nov 2026: 24 h - 51 s (got ${dev(a[c])})`);
  const dst = a.find((e) => e.ymd.y === 2027 && e.ymd.m === 3 && e.ymd.d === 28);
  assert.ok(Math.abs(dev(dst) - 90) < 2, `clocks go forward on 28 Mar 2027, the Islamic day still lasts 24 h + 1.5 min (got ${dev(dst)} s)`);
});

test("Islamic day: longest and shortest of the year (Paris, Casablanca with two peaks, Tromsø)", () => {
  const ymdStr = (s, g) => g && `${s[g.from].ymd.y}-${s[g.from].ymd.m}-${s[g.from].ymd.d}`;
  const dev = (s, g) => (s[g.from].islDay - 86400000) / 1000;
  const run = (lat, lon, zone, ymd) => {
    const s = yearSeries({ lat, lon }, ymd, { zone }, M.mwl);
    const c = s.findIndex((e) => e.i === 0);
    return { s, c, mx: around(yearlyExtremes(s, "islDay", "max"), c), mn: around(yearlyExtremes(s, "islDay", "min"), c) };
  };
  let r = run(48.8566, 2.3522, "Europe/Paris", { y: 2026, m: 11, d: 24 });
  assert.equal(ymdStr(r.s, r.mx.next), "2027-2-9");
  assert.ok(Math.abs(dev(r.s, r.mx.next) - 99.4) < 1, "longest: 24 h + 1 min 39 s");
  assert.equal(ymdStr(r.s, r.mn.next), "2027-9-20");
  assert.ok(Math.abs(dev(r.s, r.mn.next) + 128) < 1, "shortest: 24 h - 2 min 8 s");
  assert.equal(ymdStr(r.s, r.mn.past), "2026-9-20");
  // The day after the peak: the next one is a year away, not tomorrow.
  r = run(48.8566, 2.3522, "Europe/Paris", { y: 2027, m: 2, d: 10 });
  assert.equal(ymdStr(r.s, r.mx.past), "2027-2-9");
  assert.equal(ymdStr(r.s, r.mx.next), "2028-2-9");
  r = run(48.8566, 2.3522, "Europe/Paris", { y: 2027, m: 2, d: 9 });
  assert.equal(ymdStr(r.s, r.mx.at), "2027-2-9", "today is the longest");
  // Casablanca has a second, lower peak in May: only January's counts.
  r = run(33.5731, -7.5898, "Africa/Casablanca", { y: 2026, m: 11, d: 24 });
  assert.equal(turningPoints(r.s, "islDay", "max").filter((g) => g.from > r.c && g.from <= r.c + 365).length, 2, "two peaks a year");
  assert.equal(ymdStr(r.s, r.mx.next), "2027-1-28");
  assert.ok(Math.abs(dev(r.s, r.mx.next) - 58.6) < 1);
  assert.equal(ymdStr(r.s, r.mn.next), "2027-9-20");
  // Tromsø: no Maghrib under the midnight sun or the polar night, the extremes sit at their edges.
  r = run(69.6496, 18.956, "Europe/Oslo", { y: 2026, m: 11, d: 24 });
  assert.ok(r.s.filter((e) => e.ymd.y === 2027 && e.ymd.m === 6).every((e) => !Number.isFinite(e.islDay)), "no Maghrib in June");
  assert.equal(ymdStr(r.s, r.mx.next), "2027-5-17");
  assert.ok(dev(r.s, r.mx.next) > 15 * 60, "the last sunsets before the midnight sun come much later each evening");
});

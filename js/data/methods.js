// Calculation methods. This file and timezones.js are the only places the
// rules live: a later update should only need to touch these two files, the
// explanations (explain.js) and the tests.
//
// Angles are degrees of the sun below the horizon.
// offsets: minutes added after the astronomical time (sunrise, dhuhr, asr, maghrib, isha, fajr).
// ishaInterval: Isha = Maghrib + this many minutes (instead of an angle).
// highLat: the method's own summer / high-latitude rule ("angle" = share of
//   the night = angle / 60, "third" = one third of the night).

export const RULES_UPDATED = "2026-11-20";

export const METHODS = [
  {
    id: "morocco",
    short: "Morocco",
    name: "Morocco · Ministry of Habous",
    fajr: 19,
    isha: 17,
    offsets: { dhuhr: 5, maghrib: 5 },
    highLat: "angle",
    explain: "morocco",
  },
  {
    id: "france12",
    short: "France 12°",
    name: "France 12° · Musulmans de France",
    fajr: 12,
    isha: 12,
    highLat: "angle",
    explain: "france",
  },
  {
    id: "france15",
    short: "France 15°",
    name: "France 15°",
    fajr: 15,
    isha: 15,
    highLat: "angle",
    explain: "france",
  },
  {
    id: "gmp",
    short: "Paris Mosque",
    name: "Grande Mosquée de Paris",
    // Its own Ramadan 2026 timetable for Paris: Imsak at about 18°, Fajr 10
    // minutes later, Dhuhr +5, Asr +1, Maghrib = sunset + 3, Isha = sunset + 90
    // (Maghrib + 87). Sunrise to Isha match it to the minute on all 30 days;
    // Fajr within 4 minutes (their Imsak drifts later than 18° in March).
    fajr: 18,
    ishaInterval: 87,
    offsets: { fajr: 10, dhuhr: 5, asr: 1, maghrib: 3 },
    highLat: "angle",
    explain: "gmp",
  },
  {
    id: "istanbul",
    short: "Istanbul 2021",
    name: "Europe · Istanbul 2021 congress",
    fajr: 18,
    isha: 17,
    highLat: "third",
    explain: "istanbul",
  },
  {
    id: "mwl",
    short: "MWL",
    name: "Muslim World League",
    fajr: 18,
    isha: 17,
    highLat: "angle",
    explain: "angles",
  },
  {
    id: "ummalqura",
    short: "Umm al-Qura",
    name: "Umm al-Qura · Makkah",
    fajr: 18.5,
    ishaInterval: 90,
    ishaIntervalRamadan: 120,
    highLat: "angle",
    explain: "ummalqura",
  },
  {
    id: "isna",
    short: "ISNA",
    name: "ISNA · North America",
    fajr: 15,
    isha: 15,
    highLat: "angle",
    explain: "angles",
  },
  {
    id: "egypt",
    short: "Egypt",
    name: "Egyptian General Authority of Survey",
    fajr: 19.5,
    isha: 17.5,
    highLat: "angle",
    explain: "angles",
  },
  {
    id: "karachi",
    short: "Karachi",
    name: "University of Islamic Sciences, Karachi",
    fajr: 18,
    isha: 18,
    highLat: "angle",
    explain: "angles",
  },
  {
    id: "diyanet",
    short: "Diyanet",
    name: "Diyanet · Turkey",
    fajr: 18,
    isha: 17,
    // Calibrated on Diyanet's own 2026 table for Kütahya (mean published minus
    // computed): sunrise -6.9, dhuhr +5.1, asr +4.1, maghrib +7.1, isha 0.0, fajr +0.1.
    offsets: { sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 },
    highLat: "angle",
    explain: "diyanet",
  },
];

// Summer / high-latitude rules the user can force in Settings.
export const HIGH_LAT_RULES = {
  method: { label: "Each method's own rule", short: "Method's own" },
  angle: { label: "Angle-based (angle ÷ 60 of the night)", short: "Angle-based" },
  seventh: { label: "One seventh of the night", short: "One seventh" },
  middle: { label: "Middle of the night", short: "Middle of the night" },
  third: { label: "One third of the night", short: "One third" },
};

// Regional default favourite, by ISO country code (first launch).
export const REGION_DEFAULTS = {
  MA: "morocco",
  EH: "morocco",
  FR: "france12",
  TR: "diyanet",
  // Arabian Peninsula
  SA: "ummalqura", YE: "ummalqura", OM: "ummalqura", AE: "ummalqura", QA: "ummalqura",
  BH: "ummalqura", KW: "ummalqura",
  // North America
  US: "isna", CA: "isna",
  // South Asia
  PK: "karachi", IN: "karachi", BD: "karachi", AF: "karachi", LK: "karachi", NP: "karachi",
  // Levant
  EG: "egypt", SY: "egypt", LB: "egypt", JO: "egypt", PS: "egypt", IL: "egypt", IQ: "egypt",
};
// Fallbacks by continent when a country has no entry above.
export const CONTINENT_DEFAULTS = { Europe: "mwl", Africa: "egypt", Asia: "mwl", "North America": "isna" };

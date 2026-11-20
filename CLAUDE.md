# Dawnline: notes for future sessions

## What it is

A home-screen web app for the owner's iPhone. For any exact position it shows where the sun is, the solar facts that Islamic prayer-time conventions rely on, and what each Sunni calculation method gives for every prayer of the day, with the owner's favourite method highlighted. Morocco and France matter most. Main action: open the app and see today's sun curve and each method's times.

Live at https://hichamabd.github.io/Dawnline/ (single branch `gh-pages`).

The owner is not a developer and works from an iPhone. Write to him in short, plain messages, and give a link for every fact about what a phone or GitHub allows.

## Decisions already made (do not ask again)

- **Name** Dawnline. **Language** English. Prayer names: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha.
- **Look "Sky"**: the page background is the real sky colour for the sun's angle at the time shown (`js/sky.js`), a little dimmer when the phone is in dark mode; frosted cards, white type, one gold accent (`#ffd27a`), system font (SF). Icon: the sun's wave crossing the horizon, gold dot on the first dashed twilight line (`icons/icon.svg`).
- **Main screen, top to bottom**: place name + coordinates + time zone; countdown to the favourite's next prayer (always for the real now); one card with the live readout (sun's angle, rising or setting, which methods' Fajr or Isha have begun, as pills), the sun graph, the hour axis, then the method bars **directly under the graph** so one vertical "now" line runs through both (owner chose this over his first order); then the key-moments card.
- **Graph**: x axis runs from solar midnight to solar midnight, so every prayer of the day fits (the day shown switches at solar midnight, not at 00:00). Smooth vertical scale with the twilight zone magnified (`js/scale.js`). Dashed lines at 12, 15, 17, 17.5, 18, 18.5, 19, 19.5°, labels placed without overlap, favourite's angles in gold.
- **Bars**: favourite first (starred, its six times written), then Morocco, France 12°, France 15°, Paris Mosque, then the rest in `METHODS` order. Tapping a mark shows its time and gap from the favourite; tapping a method name opens its explanation. Hollow marks = estimated (summer rule changed them). Faint dashed mark = Hanafi Asr on the favourite's bar.
- **Scrubbing**: drag along the graph; a date picker; "Now" returns to live.
- **Place**: "Locate me" (GPS, only when tapped) or the offline map (`js/map.js`, canvas, Natural Earth borders + towns, offline town search). No online map, no search server.
- **Explanations**: `js/data/explain.js`, short and neutral, each with source links.
- **Settings**: favourite, place, summer rule, time-zone override, rules-updated date, credits.
- **First launch**: place (GPS or map). Morocco → Morocco method; France → asks 12° / 15° / Grande Mosquée / Istanbul 2021 / Not sure (→ 12°, said in a toast); elsewhere → regional default (`REGION_DEFAULTS`, `CONTINENT_DEFAULTS`).
- **Remembers, on the phone only**: place, favourite, summer rule, time-zone override. One localStorage key: `dawnline-settings`. Nothing else.
- **Not wanted**: prayer alerts, custom methods, a saved-places list, online maps.

## The conventions (owner-approved, with evidence)

| Method | Rule |
|---|---|
| Morocco (Habous) | 19° / 17°, sunrise −3, Dhuhr +5, Maghrib +5, standard Asr. Casablanca's whole November 2026 timetable matches within a minute for all six times (tested). |
| France 12° (Musulmans de France) | 12° / 12° |
| France 15° | 15° / 15° |
| Grande Mosquée de Paris | Its own timetables (owner chose this over plain 18°/18°, which is the Karachi bar), fitted on Ramadan 2026 (30 days) and November 2026 (30 days): Fajr 16° (no published angle; within 3 min on all 60 days, while 18° + 10 min drifted up to 6), Dhuhr +5, standard Asr, Maghrib +3, Isha = sunset + 90 (Maghrib + 87). Sunrise to Isha within 1 min on all 60 days. Its Ramadan timetable also shows Imsak = Fajr − 10. |
| Istanbul 2021 | 18° / 17°, one third of the night. Diyanet's own French tables do NOT follow it (Isha ≈ 16° all year; an unpublished summer pull-in north of ~48° from late April to mid-August). Could not be reproduced; said in the bar's explanation. The 5-hour minimum (only above ~60°) is not modelled. |
| MWL | 18° / 17° |
| Umm al-Qura | 18.5° / Isha = Maghrib + 90 (120 in Ramadan, detected with the browser's islamic-umalqura calendar) |
| ISNA | 15° / 15° |
| Egypt | 19.5° / 17.5° |
| Karachi | 18° / 18° |
| Diyanet (Turkey) | 18° / 17°, sunrise −7, Dhuhr +5, Asr +4, Maghrib +7, Isha 0: fitted on Diyanet's full 2026 Kütahya table (every day within 2 min; Isha +1 or +2 made it worse) |

Shared rules: sunrise/sunset at −0.833° (sun's upper edge, refraction); Dhuhr = solar noon + offset; Maghrib = sunset + offset; Asr shadow = noon shadow + 1 × height (Hanafi 2 ×). Summer / high latitude: each method's own rule (one third for Istanbul 2021, angle-based = angle ÷ 60 of the night for the others), applied when the angle time doesn't exist or falls beyond that share; a time is "estimated" only when the rule changed it. Night = sunset to next sunrise (Isha) or previous sunset to sunrise (Fajr). Settings can force angle-based, one seventh, middle of the night or one third for all methods.

Time zones: France = Europe/Paris from the phone's data. Morocco and Western Sahara = UTC+0 from 2026-09-20T01:00Z (02:00 local, decree 2.26.530), hard-coded in `TZ_OVERRIDES` because phones may still carry the old rule. Elsewhere: the country's zone from IANA `zone.tab`; for countries with several zones, the zone whose reference city is nearest. Overseas France handled. Manual override: any IANA zone or a fixed offset.

## Where the rules live (update only these, the explanations and the tests)

- `js/data/methods.js`: angles, offsets, intervals, summer rules, regional defaults, `RULES_UPDATED` (date shown in Settings).
- `js/data/timezones.js`: `TZ_OVERRIDES` (dated rules that win over the phone's data; keep old entries, add new ones with their start date), `COUNTRY_ZONES`, `TZ_RULES_UPDATED`.
- `js/data/explain.js`: the explanation sheets.
- `tests/`: reference timetables.

After any rule change: run the tests, update `RULES_UPDATED` / `TZ_RULES_UPDATED`, bump `CACHE` in `sw.js` (so installed copies update the next time they open online), add a dated line to the log at the bottom, publish.

## Code map

- `index.html`, `css/app.css`, `js/app.js` (screens, sheets, settings, first launch)
- `js/astro.js` (sun position, NOAA/Meeus), `js/prayer.js` (one day, all methods), `js/tz.js` (time zones + overrides), `js/scale.js`, `js/graph.js` (SVG graph and bars), `js/sky.js`, `js/geo.js` (borders, towns, country and zone lookup), `js/map.js`
- `data/world.json`: Natural Earth 1:50m countries, public domain, simplified and delta-encoded. `data/places.json`: GeoNames towns (France ≥ 5,000 people, all of Morocco; CC BY 4.0, credited in Settings and README) + Natural Earth populated places elsewhere.
- `sw.js`: offline cache (`dawnline-vN`, cache-first). Bump on every change.

## Tests (`npm test`, Node 20+; all must pass before publishing)

From the owner, ±1 min unless noted:
- Morocco, 16 Nov 2026, UTC+0, Fajr Dhuhr Asr Maghrib Isha: Casablanca (33.5731, −7.5898) 05:32 12:20 15:07 17:32 18:49; Marrakech (31.6295, −7.9811) 05:31 12:22 15:12 17:38 18:52; Fès (34.0331, −5.0003) 05:22 12:10 14:55 17:21 18:37.
- France 12°, Paris (48.8534, 2.3488), 27 Oct 2026, UTC+1: Fajr 06:20, Sunrise 07:29, Dhuhr 12:34, Asr 15:11, Maghrib 17:39, Isha 18:48.
- Paris, 15 Jul 2026, UTC+2: 12° gives Fajr 04:27, Isha 23:25. 18° gives 03:04 / 00:46 raw, 03:35 / 00:18 with the angle-based rule (estimated).
- Makkah (21.4225, 39.8262), 6 Nov 2026, UTC+3, Umm al-Qura: Fajr 05:08, Sunrise 06:26, Dhuhr 12:04, Asr 15:19 (Hanafi 16:06), Maghrib 17:42, Isha 19:12.
- Diyanet, Kütahya (39.4167, 29.9833), 27 Jul 2026, UTC+3, ±2 min: 04:06 05:48 13:12 17:05 20:25 22:01.
- Diyanet, L'Aigle (48.7656, 0.6286), 28 Jul 2026: Diyanet publishes 04:33 06:19 14:09 18:16 21:50 23:18; not reproducible, Istanbul 2021 bar gives 03:53 / 00:00 (tested).

Added: Diyanet's whole 2026 Kütahya year (±2), the Grande Mosquée's Ramadan and November 2026 timetables (±1, Fajr ±3), Casablanca's whole November 2026 timetable (±1, all six), no 18° twilight in Paris 12–30 June and Lille 28 May–16 July, Umm al-Qura Ramadan interval, midnight sun (Tromsø), time-zone overrides.

Also check in a headless browser at 390 px and 320 px, light and dark, before publishing (Playwright is preinstalled in sessions).

## House rules

- Light and dark follow the phone's setting; no manual switch.
- No tracking, no accounts, no outside servers. Fonts, icons, data and code stay in the repo. The content security policy in `index.html` allows only the app's own files: keep it (style changes go through CSS or `element.style`, never inline `style=""` attributes).
- Local only; works offline once opened.
- Public repo: nothing personal in code, data or commit messages.
- All the owner's web apps share one web address: storage keys and cache names start with `dawnline-`.
- Plain HTML, CSS and JavaScript, no build step, relative links only. `package.json` exists only for the tests.
- iPhone fit: safe areas, 16 px+ text in fields, 44 px touch targets, reduced motion respected.

## How it is published

Single branch `gh-pages`, pushed straight (standing permission). Before saying it is live: `gh api repos/hichamAbd/Dawnline --jq .has_pages` is true and the latest "pages build and deployment" run in `gh api repos/hichamAbd/Dawnline/actions/runs` succeeded. It is listed on the owner's Shelf (repo `hichamAbd/Shelf`, `js/apps.js`, icon `icons/apps/dawnline.svg`); update that entry if the name, purpose or address changes.

## Monthly maintenance

A scheduled task ("Dawnline monthly rules check", 1st of each month, 04:34 Paris time) wakes one dedicated cloud session, also called "Dawnline monthly rules check", which was created with this repository as its source so it can push to `gh-pages` (a fresh session per run could not: the git proxy only gives push access to a session's own sources). The session keeps its memory between runs. Each run:
1. Brings its checkout up to date with `origin/gh-pages` and re-reads this file.
2. Time zones: checks the IANA releases (https://www.iana.org/time-zones/releases, https://github.com/eggert/tz/blob/main/NEWS) and https://www.timeanddate.com/news/time/ for announced changes affecting France, Morocco or any country in `COUNTRY_ZONES`; adds them to `TZ_OVERRIDES` with their start date, keeping older entries.
3. Conventions: compares the coming month's computed times with the latest published ones, official sources first (Habous, Musulmans de France via bladi.net, Grande Mosquée de Paris, Diyanet, Umm al-Qura); if a body changed its angles or minutes, or announced a change, updates that method, its explanation and its tests.
4. If something changed: all tests, a dated line below, `RULES_UPDATED` / `TZ_RULES_UPDATED`, bump `CACHE` in `sw.js`, push to `gh-pages`, confirm the Pages build, push notification to the owner (what, why, source link).
5. If nothing changed: no commit, no notification, a one-line report.
6. Never changes anything else (design, features); if something needs a decision, it notifies the owner instead.

If that session is ever archived or lost, create a new one with this repository (branch `gh-pages`) as its source in the same cloud environment, and point the scheduled task at it.

## Maintenance log

- 2026-11-20: first version. Morocco back on UTC+0 since 2026-09-20 (IANA tzdata 2026c+). Paris Mosque rule from its Ramadan 2026 timetable. Diyanet offsets from its 2026 Kütahya table.
- 2026-11-20 (later): first monthly-check test run found the Paris Mosque's November 2026 timetable and Casablanca's sunrise off by a few minutes. Paris Mosque refitted on its Ramadan + November timetables (Fajr 16°, standard Asr); Morocco sunrise −3. Monthly check moved to a dedicated session with push access. Cache `dawnline-v2`.

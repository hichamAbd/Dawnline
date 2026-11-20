# Dawnline

Where the sun is, and what each Islamic prayer-time convention gives for every prayer of the day, side by side.

**Open it:** https://hichamabd.github.io/Dawnline/

**On an iPhone:** open the link in Safari, tap Share, then Add to Home Screen.

## What it does

- A sun graph for any place and day: the sun's height through the day, the horizon, and dashed lines at every twilight angle the methods use (12° to 19.5°). Drag along it to move through the day; tap a marker (sunrise, sunset, noon, each twilight angle) or an angle label to jump exactly there; type an angle to see when the sun reaches it; pick any date; tap Now to go back.
- "How prayer times work": the five prayer windows on today's sun curve, and what marks the start and end of each prayer, with sources.
- The sun's angle at that moment, and which methods' Fajr or Isha have already begun.
- One bar per method on the same time axis: Morocco (Habous), France 12° (Musulmans de France), France 15°, Grande Mosquée de Paris, Istanbul 2021, Muslim World League, Umm al-Qura, ISNA, Egypt, Karachi and Diyanet. Your favourite comes first with its times written; tap any mark for its time and its gap from your favourite.
- Key moments: solar noon, sunrise, sunset, day length, civil, nautical and astronomical twilight.
- Short explanations with sources: true and false dawn, red and white twilight, the Asr shadow rule, the French angles, summer rules, refraction and more.
- Pick the place with GPS (only when you tap "Locate me") or on an offline map.

## What it stores

Only four things, in this browser's storage on your phone: the place, your favourite method, the summer rule and the time-zone override. Nothing is sent anywhere: no account, no tracking, no outside server. It works offline once opened.

## Credits

- Sun position: NOAA / Jean Meeus, *Astronomical Algorithms*. Prayer-time formulas: [PrayTimes](https://praytimes.org/calculation).
- Country borders and towns outside France and Morocco: [Natural Earth](https://www.naturalearthdata.com/) (public domain).
- Towns in France and Morocco: [GeoNames](https://www.geonames.org/) (CC BY 4.0), via the all-the-cities data file.
- Time zones: the [IANA time zone database](https://www.iana.org/time-zones).

## For developers

Plain HTML, CSS and JavaScript, no build step. Tests: `npm test` (Node 20+). Notes for future changes are in `CLAUDE.md`.

// The tap-to-explain sheets: short, neutral, each with its sources.
// Paragraphs are plain text; "links" are [label, url].
export const EXPLAIN = {
  dawn: {
    title: "True dawn and false dawn",
    body: [
      "Before dawn a faint, slanting glow can rise from the eastern horizon and fade again: the “false dawn” (zodiacal light). Fajr begins with the “true dawn”, a white light spreading sideways along the horizon.",
      "Astronomers put the first trace of light at about 18° below the horizon. How deep the sun is when true dawn is actually seen is debated, which is why conventions range from 12° to 19.5°. The deeper the angle, the earlier Fajr.",
    ],
    links: [["True dawn (IslamWeb)", "https://www.islamweb.net/en/printfatwa.php?id=473398"], ["The astronomy (PrayTimes)", "https://praytimes.org/calculation"]],
  },
  twilight: {
    title: "Red and white twilight",
    body: [
      "After sunset the western sky turns red, then white, then dark. Most scholars start Isha when the red glow (shafaq ahmar) has gone; Abu Hanifa held that it starts when the white glow (shafaq abyad) has gone too.",
      "Calculation methods turn this into an angle: about 17° to 17.5° for the end of the red glow, about 18° or more for the end of the white. Umm al-Qura and the Paris Mosque use a fixed delay after sunset instead of an angle.",
    ],
    links: [["Beginning of Isha (AskImam)", "https://islamqa.org/hanafi/askimam/102670/beginning-time-of-isha/"]],
  },
  asr: {
    title: "Asr: the shadow rule",
    body: [
      "Asr begins when an object's shadow equals its length at noon plus once its height: the standard rule of the Maliki, Shafi'i and Hanbali schools, used by every bar here.",
      "In the Hanafi school Asr begins when the shadow reaches the noon shadow plus twice the height, usually 35 to 60 minutes later. Your favourite's bar shows it as a faint extra mark.",
    ],
    links: [["Why the Hanafi school differs (SeekersGuidance)", "https://seekersguidance.org/answers/hanafi-fiqh/why-does-the-hanafi-school-differ-regarding-the-prayer-times/"]],
  },
  france: {
    title: "Why France has 12°, 15° and 18°",
    body: [
      "French mosques follow different calendars. Musulmans de France (formerly UOIF) publish theirs at 12° for both Fajr and Isha, the depth of nautical twilight. Some mosques use 15°. 18° is the classic astronomical value, the one the Grande Mosquée de Paris keeps for dawn.",
      "The gap grows in summer: in Paris on 15 July 2026, Fajr is 04:27 at 12° and 03:35 at 18° (with the summer rule). Critics of 12° say its Fajr comes after the real dawn, so people fasting in Ramadan may still eat after dawn, and that its Isha comes too early. Supporters set out their reasons in the article below.",
    ],
    links: [
      ["Why 12° (UOIF view, ACMR mosque)", "http://www.mosquee-acmr.fr/web/article/pourquoi-le-12eme-degre-de-latitude-pour-determiner-l-horaire-du-ichaa-et-du-soubh_161"],
      ["A critique of 12° (Al-Kanz)", "https://www.al-kanz.org/2015/06/22/ramadan-angle-12/"],
      ["The three French angles (Muslim Pro)", "https://support.muslimpro.com/hc/en-us/articles/204983270-Does-the-Muslim-Pro-application-use-12-15-or-18-angles-for-prayer-times-in-France"],
    ],
  },
  gmp: {
    title: "Grande Mosquée de Paris",
    body: [
      "This bar follows the mosque's own published timetables for Paris (Ramadan 2026 and November 2026): Dhuhr 5 minutes after solar noon, the standard Asr, Maghrib 3 minutes after sunset, and Isha 1 h 30 after sunset. On all 60 days of those timetables this gives the same Sunrise, Dhuhr, Asr, Maghrib and Isha within a minute.",
      "The mosque does not publish the angle it uses for Fajr. Placing Fajr when the sun is 16° below the horizon reproduces both timetables within 3 minutes. In its Ramadan timetable an Imsak column comes 10 minutes before Fajr. In summer, if the sun's angle gives an unusable time, the angle-based summer rule applies. Plain 18° for both Fajr and Isha is the Karachi bar.",
    ],
    links: [
      ["The mosque's prayer times page", "https://www.grandemosqueedeparis.fr/horaire-des-prieres-paris"],
      ["Its Ramadan 2026 timetable", "https://www.grandemosqueedeparis.fr/post/emsakiat-ramadan-2026-1447-h-le-calendrier-des-heures-de-priere-a-paris"],
      ["The mosque keeps 18° (Saphirnews)", "https://www.saphirnews.com/La-Grande-Mosquee-de-Paris-garde-le-18e-degre-de-latitude-pour-les-horaires-de-priere_a14937.html"],
    ],
  },
  istanbul: {
    title: "Istanbul 2021 congress",
    body: [
      "In September 2021 Turkey's Diyanet and the European Council for Fatwa and Research, with the CFCM and the Paris Mosque attending, agreed a scheme for Europe: Fajr at 18°, Isha at 17° (red twilight), built on “one third of the night”, with at least five hours each of day and night.",
      "Fajr and Isha are estimated when the sign does not appear, or when it would come after a third of the night has passed. This bar applies that: Isha no later than a third of the night after sunset, Fajr no earlier than a third of the night before sunrise. The five-hour minimum only matters above about 60° latitude, which the congress left for later; it is not modelled.",
      "Diyanet's own tables for French towns do not follow this text: their Isha sits near 16° all year, and from late April to mid-August north of about 48° both times are pulled in by a rule the declaration does not describe. For L'Aigle on 28 July 2026 Diyanet gives 04:33 and 23:18; this bar gives 03:53 and 00:00.",
    ],
    links: [
      ["Final declaration (Diyanet)", "https://kurul.diyanet.gov.tr/tr/duyuru/final-declaration-of-the-international-congress-for-prayer/0193c03a-b64f-7d90-fa67-7ea9abc7410d"],
      ["Diyanet's times for L'Aigle", "https://namazvakitleri.diyanet.gov.tr/en-US/13321/laigle-prayer-times"],
    ],
  },
  morocco: {
    title: "The Moroccan convention",
    body: [
      "Morocco's Ministry of Habous and Islamic Affairs publishes the official times: Fajr at 19°, Isha at 17°, Dhuhr 5 minutes after solar noon, Maghrib 5 minutes after sunset, the standard (Maliki) Asr, and sunrise (Chourouq) 3 minutes before the astronomical sunrise.",
      "Checked against the published timetables for November 2026 (Casablanca for the whole month, Marrakech, Fès, Agadir): all six times within a minute. Since 20 September 2026 Morocco stays on UTC+0 all year (decree 2.26.530), with no change for Ramadan.",
    ],
    links: [["Ministry of Habous", "https://www.habous.gov.ma/"], ["Moroccan timetables", "https://horaire-de-priere.ma/horaire-priere-casablanca.html"]],
  },
  ummalqura: {
    title: "Umm al-Qura's fixed delay",
    body: [
      "Saudi Arabia's Umm al-Qura calendar uses 18.5° for Fajr, but no angle for Isha: Isha is 90 minutes after Maghrib, and 120 minutes during Ramadan.",
      "The app knows when it is Ramadan from the Umm al-Qura calendar built into your phone, so this works offline.",
    ],
    links: [["Method table (PrayTimes)", "https://praytimes.org/docs/methods"], ["Method parameters (Adhan)", "https://raw.githubusercontent.com/batoulapps/adhan-js/master/METHODS.md"]],
  },
  diyanet: {
    title: "Diyanet (Turkey)",
    body: [
      "Turkey's Presidency of Religious Affairs uses 18° for Fajr and 17° for Isha, then adds safety minutes (temkin): sunrise 7 minutes earlier, Dhuhr 5 minutes later, Asr 4, Maghrib 7.",
      "These minutes come from Diyanet's own 2026 table for Kütahya: with them, every day of the year is within 2 minutes. Diyanet publishes different times for European towns; see Istanbul 2021.",
    ],
    links: [["Diyanet's times for Kütahya", "https://namazvakitleri.diyanet.gov.tr/en-US/9689/prayer-time-for-kutahya"]],
  },
  angles: {
    title: "The other methods",
    body: [
      "Muslim World League: 18° and 17°. ISNA (North America): 15° and 15°. Egyptian General Authority of Survey: 19.5° and 17.5°. University of Islamic Sciences, Karachi: 18° and 18°. All use the standard Asr and add nothing to Dhuhr or Maghrib.",
      "The first angle is Fajr (the sun still below the horizon before dawn), the second Isha (after dusk). Tap a mark to see its time and its gap from your favourite.",
    ],
    links: [["Method table (PrayTimes)", "https://praytimes.org/docs/methods"], ["Method parameters (Adhan)", "https://raw.githubusercontent.com/batoulapps/adhan-js/master/METHODS.md"]],
  },
  summer: {
    title: "Summer and high-latitude rules",
    body: [
      "In summer, far enough north, the sun never gets 18° below the horizon: Paris has no 18° twilight from 12 to 30 June 2026, Lille none from 28 May to 16 July. Even before that, Fajr can come absurdly early and Isha very late. A rule then caps them, as a share of the night (sunset to sunrise):",
      "Angle-based: the share is the angle ÷ 60 (18° gives 0.3 of the night). One seventh: 1/7. Middle of the night: 1/2. One third: 1/3, the Istanbul 2021 rule. Fajr is never earlier than that share before sunrise, Isha never later than that share after sunset.",
      "By default each method uses its own rule (one third for Istanbul 2021, angle-based for the others). A time is drawn hollow, and called estimated, only when the rule changed it.",
    ],
    links: [["Higher latitudes (PrayTimes)", "https://praytimes.org/calculation"]],
  },
  refraction: {
    title: "Refraction and the 0.833°",
    body: [
      "Sunrise and sunset are when the sun's upper edge touches the horizon. The sun's radius is about 0.27°, and the air bends its light by about 0.57° near the horizon, so at that moment the sun's centre is really 0.833° below the horizon.",
      "The angle shown on the main screen is the sun's centre without that bending, so it reads −0.8° at sunset. Hills and buildings around you are not taken into account.",
    ],
    links: [["Sunrise and sunset (PrayTimes)", "https://praytimes.org/calculation"]],
  },
  timezone: {
    title: "Time zone",
    body: [
      "Times are shown in the place's own time, not your phone's. France uses Europe/Paris from your phone's built-in data. Morocco is hard-coded to UTC+0 since 20 September 2026 (decree 2.26.530), because phones may still carry the old rule. Elsewhere the app takes the country's time zone, the nearest one for countries that have several.",
      "You can force another zone in Settings. The app's own rules were last updated on the date shown there.",
    ],
    links: [["Time zone database releases (IANA)", "https://www.iana.org/time-zones/releases"], ["Time zone news (timeanddate)", "https://www.timeanddate.com/news/time/"]],
  },
};

// The "How prayer times work" page: the broad logic of the five prayers.
export const PRAYERS_GUIDE = {
  title: "How prayer times work",
  intro: "The five daily prayers follow the sun. Each one has a window that opens with a sign in the sky and lasts until the next sign. A timetable gives the moment each window opens.",
  sections: [
    {
      key: "fajr",
      title: "Fajr · dawn",
      text: ["From true dawn, when light first spreads along the eastern horizon, until sunrise. The methods place true dawn when the sun is 12° to 19.5° below the horizon. The fast of Ramadan starts here, and some calendars print an Imsak a few minutes earlier as a margin."],
      more: "dawn",
    },
    {
      title: "Sunrise · not a prayer",
      text: ["Sunrise closes the Fajr window. The hadiths discourage praying while the sun is rising, while it stands at its highest at midday, and while it is setting."],
      more: "refraction",
    },
    {
      key: "dhuhr",
      title: "Dhuhr · midday",
      text: ["From just after solar noon, when the sun starts to move down from its highest point, until Asr. Many calendars add a few minutes so the sun has clearly passed its highest point. On Fridays the congregational Jumu'ah prayer takes its place."],
    },
    {
      key: "asr",
      title: "Asr · afternoon",
      text: ["From when an object's shadow equals its noon shadow plus its own height (twice its height in the Hanafi school) until sunset. Delaying it until the sun turns pale and yellow is discouraged."],
      more: "asr",
    },
    {
      key: "maghrib",
      title: "Maghrib · sunset",
      text: ["From the moment the sun's disc has fully set until the twilight has gone: the shortest window. Some calendars add a few minutes after sunset."],
    },
    {
      key: "isha",
      title: "Isha · night",
      text: ["From the end of twilight (the red glow for most scholars, the white glow for Abu Hanifa) until the middle of the night as the preferred limit; many scholars hold it can still be prayed until dawn. Methods turn the end of twilight into an angle, 12° to 18°, or into a fixed delay after sunset."],
      more: "twilight",
    },
    {
      title: "Why timetables differ",
      text: ["The signs are the same for everyone. Conventions differ in four places: the angle chosen for dawn and for the end of twilight, the Asr shadow rule, the safety minutes added after the astronomical moment, and the rule used in summer when the twilight lasts all night. The bars on the main screen show the result side by side."],
      more: "summer",
    },
  ],
  links: [
    ["The five windows: Sahih Muslim 612", "https://sunnah.com/muslim:612d"],
    ["Jibril leads the prayers: Abu Dawud 393", "https://sunnah.com/abudawud:393"],
    ["When prayer is discouraged: Sahih Muslim 831", "https://sunnah.com/muslim:831"],
    ["Quran 17:78", "https://quran.com/17/78"],
    ["Quran 11:114", "https://quran.com/11/114"],
  ],
};

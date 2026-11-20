// Sky colours for a sun altitude: deep navy at night, indigo and rose through
// twilight, blue by day. In dark mode the whole sky is dimmed.
const STOPS = [ // altitude, top, middle, bottom of the gradient
  [-90, "#03050c", "#060a18", "#0a1024"],
  [-18, "#05081a", "#0b1430", "#121c3e"],
  [-12, "#0a1430", "#16244f", "#2a3466"],
  [-6, "#14265a", "#2f4785", "#7a6a9a"],
  [-2, "#1f3a78", "#5a6fae", "#e39a7e"],
  [3, "#3b67b0", "#7fa0d6", "#f2c08f"],
  [12, "#3f7fd0", "#78aee6", "#bcd9f2"],
  [90, "#2f78d6", "#6aa8ea", "#a8d0f4"],
];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export function skyFor(alt, dark) {
  let cols = STOPS[STOPS.length - 1].slice(1).map(hex);
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a0, ...c0] = STOPS[i], [a1, ...c1] = STOPS[i + 1];
    if (alt >= a0 && alt <= a1) {
      const t = (alt - a0) / (a1 - a0);
      cols = c0.map((c, j) => mix(hex(c), hex(c1[j]), t));
      break;
    }
  }
  if (dark) cols = cols.map((c) => mix(c, [0, 0, 0], 0.32));
  // Frosted cards: darker glass on a bright sky so white type stays readable.
  const day = Math.max(0, Math.min(1, (alt + 4) / 10)); // 0 at -4°, 1 at +6°
  const glass = (a) => `rgba(${Math.round(255 * (1 - day) + 8 * day)}, ${Math.round(255 * (1 - day) + 30 * day)}, ${Math.round(255 * (1 - day) + 80 * day)}, ${a})`;
  return {
    top: toHex(cols[0]), mid: toHex(cols[1]), bot: toHex(cols[2]),
    glass: glass(0.1 + day * 0.1), glassStrong: glass(0.16 + day * 0.12),
  };
}

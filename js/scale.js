// Vertical scale of the sun graph. The day's whole wave fills the height, and
// the twilight zone (roughly 0 to -20°) is gently magnified so the dashed
// angle lines have room. The mapping is smooth (no kinks), so the sun's path
// stays a clean wave.
const C = -13;   // centre of the magnified zone (degrees)
const W = 6.5;   // its half-width
// Extra density at the centre (1 + K times), stronger when the day's wave is
// tall, so the twilight zone keeps about 40% of the height.
const kFor = (range) => Math.max(2.4, Math.min(6, range / 30));

// Abramowitz & Stegun 7.1.26
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
// Cumulative "stretched degrees" up to altitude a.
function F(a, K) {
  return a + K * W * (Math.sqrt(Math.PI) / 2) * erf((a - C) / W);
}

// Scale for one day: altitudes lo..hi fill 0..1 (1 = bottom).
export function makeScale(lo, hi) {
  const top = Math.min(90, hi + 4);
  const bot = Math.max(-90, Math.min(lo - 4, -24));
  const K = kFor(top - bot);
  const f0 = F(bot, K), f1 = F(top, K);
  return (a) => 1 - (F(a, K) - f0) / (f1 - f0);
}

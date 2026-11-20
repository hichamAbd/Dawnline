// Offline geography: country borders (Natural Earth) and towns (GeoNames for
// France and Morocco, Natural Earth elsewhere), bundled with the app.
import { COUNTRY_ZONES } from "./data/timezones.js";

let world = null;
let towns = null;

export async function loadGeo() {
  if (world) return;
  const [w, p] = await Promise.all([
    fetch("data/world.json").then((r) => r.json()),
    fetch("data/places.json").then((r) => r.json()),
  ]);
  const k = w.scale;
  world = w.countries.map((c) => {
    const rings = c.r.map(([hole, flat]) => {
      const pts = [];
      let x = flat[0], y = flat[1];
      pts.push([x / k, y / k]);
      for (let i = 2; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; pts.push([x / k, y / k]); }
      return { hole: hole > 0, pts };
    });
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    for (const r of rings) for (const [x, y] of r.pts) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    return { name: c.n, cc: c.c, cont: c.k, rings, box: [minX, minY, maxX, maxY] };
  });
  towns = p.places.map(([name, lat, lon, rank, cc]) => ({ name, lat, lon, rank, cc }));
}

export const geoReady = () => !!world;
export const countries = () => world || [];
export const allTowns = () => towns || [];

function inRing(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function countryAt(lat, lon) {
  if (!world) return null;
  for (const c of world) {
    const [a, b, cx, d] = c.box;
    if (lon < a || lon > cx || lat < b || lat > d) continue;
    let inside = false;
    for (const r of c.rings) if (inRing(r.pts, lon, lat)) inside = !inside;
    if (inside) return c;
  }
  return null;
}

const RAD = Math.PI / 180;
export function distanceKm(lat1, lon1, lat2, lon2) {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lon2 - lon1) * RAD) / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearestTown(lat, lon) {
  let best = null, bd = Infinity;
  for (const t of towns || []) {
    if (Math.abs(t.lat - lat) > 3) continue;
    const d = distanceKm(lat, lon, t.lat, t.lon);
    if (d < bd) { bd = d; best = t; }
  }
  return best ? { town: best, km: bd } : null;
}

// A short name for a point: the town, "near" a town, or the country.
export function describePlace(lat, lon) {
  const c = countryAt(lat, lon);
  const n = nearestTown(lat, lon);
  let name;
  if (n && n.km <= 3) name = n.town.name;
  else if (n && n.km <= 30) name = `Near ${n.town.name}`;
  else name = c ? c.name : "Open sea";
  return { name, cc: c ? c.cc : (n && n.km <= 30 ? n.town.cc : ""), country: c ? c.name : "", cont: c ? c.cont : "" };
}

// Overseas parts of France sit inside France's outline in Natural Earth.
const FR_OVERSEAS = ["GF", "GP", "MQ", "RE", "YT", "PM", "NC", "PF", "WF", "BL", "MF"];

// IANA zone for a point, from its country (nearest reference city when the
// country has several zones). Out at sea: a fixed offset from longitude.
export function zoneFor(lat, lon, cc) {
  let list = COUNTRY_ZONES[cc];
  if (cc === "FR" && (lat < 41 || lat > 52 || lon < -6 || lon > 10)) list = FR_OVERSEAS.flatMap((k) => COUNTRY_ZONES[k] || []);
  if (!list || !list.length) return { fixed: Math.round(lon / 15) * 60 };
  let best = list[0], bd = Infinity;
  for (const z of list) {
    const d = distanceKm(lat, lon, z[1], z[2]);
    if (d < bd) { bd = d; best = z; }
  }
  return { zone: best[0] };
}

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function searchTowns(q, max = 8) {
  const n = norm(q);
  if (n.length < 2 || !towns) return [];
  const starts = [], contains = [];
  for (const t of towns) {
    const tn = norm(t.name);
    if (tn.startsWith(n)) starts.push(t);
    else if (n.length >= 3 && tn.includes(n)) contains.push(t);
  }
  const byRank = (a, b) => a.rank - b.rank || a.name.localeCompare(b.name);
  return [...starts.sort(byRank), ...contains.sort(byRank)].slice(0, max);
}

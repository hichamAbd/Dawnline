// Offline outline map (Web Mercator on a canvas): drag to move, pinch or
// double-tap to zoom, tap to pick a point. No tiles, no network.
import { countries, allTowns, describePlace, searchTowns } from "./geo.js";

const RAD = Math.PI / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * RAD) / 2)) / RAD;
const invMercY = (y) => (2 * Math.atan(Math.exp(y * RAD)) - Math.PI / 2) / RAD;

let paths = null;
function buildPaths() {
  if (paths) return paths;
  paths = countries().map((c) => {
    const p = new Path2D();
    for (const r of c.rings) {
      r.pts.forEach(([x, y], i) => (i ? p.lineTo(x, -mercY(y)) : p.moveTo(x, -mercY(y))));
      p.closePath();
    }
    return p;
  });
  return paths;
}

// Mounts the map in `host`; calls onChange(point) when a point is picked.
export function mountMap(host, opts) {
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const view = { x: opts.lon ?? 0, y: mercY(opts.lat ?? 38), s: opts.lat !== undefined ? 60 : 9 };
  let sel = opts.lat !== undefined && opts.picked ? { lat: opts.lat, lon: opts.lon } : null;
  let w = 0, h = 0, dpr = 1, raf = 0;

  function resize() {
    const r = host.getBoundingClientRect();
    w = r.width; h = r.height; dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    draw();
  }
  const clampView = () => {
    view.s = Math.max(2.2, Math.min(900, view.s));
    view.x = Math.max(-180, Math.min(180, view.x));
    view.y = Math.max(-150, Math.min(150, view.y));
  };
  const toScreen = (lat, lon) => [(lon - view.x) * view.s + w / 2, (view.y - mercY(lat)) * view.s + h / 2];
  const toGeo = (sx, sy) => ({ lon: (sx - w / 2) / view.s + view.x, lat: invMercY(view.y - (sy - h / 2) / view.s) });

  function draw() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0c1830";
      ctx.fillRect(0, 0, w, h);
      // graticule every 10°
      ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += 10) { const [x] = toScreen(0, lon); if (x >= 0 && x <= w) { ctx.moveTo(x, 0); ctx.lineTo(x, h); } }
      for (let lat = -80; lat <= 80; lat += 10) { const [, y] = toScreen(lat, 0); if (y >= 0 && y <= h) { ctx.moveTo(0, y); ctx.lineTo(w, y); } }
      ctx.stroke();
      // countries
      const ps = buildPaths();
      ctx.setTransform(view.s * dpr, 0, 0, view.s * dpr, (w / 2 - view.x * view.s) * dpr, (h / 2 + view.y * view.s) * dpr);
      ctx.fillStyle = "#1e3159";
      ctx.strokeStyle = "rgba(255,255,255,0.42)";
      ctx.lineWidth = 0.9 / view.s;
      ctx.lineJoin = "round";
      for (const p of ps) { ctx.fill(p, "evenodd"); ctx.stroke(p); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // towns
      const maxRank = view.s < 5 ? 0 : view.s < 14 ? 1 : view.s < 32 ? 2 : view.s < 80 ? 3 : 4;
      const labelRank = maxRank - (view.s < 5 ? 0 : 1);
      const boxes = [];
      ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textBaseline = "middle";
      for (const t of allTowns()) {
        if (t.rank > maxRank) continue;
        const [x, y] = toScreen(t.lat, t.lon);
        if (x < -40 || x > w + 40 || y < -20 || y > h + 20) continue;
        const r = t.rank <= 1 ? 3 : t.rank === 2 ? 2.4 : 1.8;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (t.rank <= labelRank) {
          const tw = ctx.measureText(t.name).width;
          const box = [x + 6, y - 8, x + 8 + tw, y + 8];
          if (boxes.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
          boxes.push(box);
          ctx.lineWidth = 3; ctx.strokeStyle = "rgba(12,24,48,0.85)";
          ctx.strokeText(t.name, x + 6, y);
          ctx.fillStyle = t.rank <= 1 ? "#fff" : "rgba(255,255,255,0.8)";
          ctx.fillText(t.name, x + 6, y);
        }
      }
      // selection
      if (sel) {
        const [x, y] = toScreen(sel.lat, sel.lon);
        ctx.strokeStyle = "rgba(255,210,122,0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke();
        ctx.fillStyle = "#ffd27a"; ctx.strokeStyle = "#0c1830"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    });
  }

  // gestures
  const ptrs = new Map();
  let start = null, pinch = null, lastTap = 0;
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (ptrs.size === 1) start = { x: e.offsetX, y: e.offsetY, t: performance.now(), vx: view.x, vy: view.y, moved: false };
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s, mid: toGeo((a.x + b.x) / 2, (a.y + b.y) / 2) };
      if (start) start.moved = true;
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      view.s = pinch.s * (d / pinch.d);
      clampView();
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      view.x = pinch.mid.lon - (mx - w / 2) / view.s;
      view.y = mercY(pinch.mid.lat) + (my - h / 2) / view.s;
      clampView(); draw();
    } else if (ptrs.size === 1 && start) {
      const dx = e.offsetX - start.x, dy = e.offsetY - start.y;
      if (Math.hypot(dx, dy) > 6) start.moved = true;
      if (start.moved && !pinch) { view.x = start.vx - dx / view.s; view.y = start.vy + dy / view.s; clampView(); draw(); }
    }
  });
  const end = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size === 0) {
      if (start && !start.moved && performance.now() - start.t < 500) {
        const now = performance.now();
        if (now - lastTap < 300) { zoomAt(e.offsetX, e.offsetY, 2.2); lastTap = 0; }
        else { lastTap = now; pick(toGeo(e.offsetX, e.offsetY)); }
      }
      start = null; pinch = null;
    } else if (ptrs.size === 1) {
      const [p] = [...ptrs.values()];
      start = { x: p.x, y: p.y, t: 0, vx: view.x, vy: view.y, moved: true };
      pinch = null;
    }
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.002)); }, { passive: false });

  function zoomAt(sx, sy, f) {
    const g = toGeo(sx, sy);
    view.s *= f; clampView();
    view.x = g.lon - (sx - w / 2) / view.s;
    view.y = mercY(g.lat) + (sy - h / 2) / view.s;
    clampView(); draw();
  }
  function pick(g) {
    sel = { lat: +g.lat.toFixed(4), lon: +(((g.lon + 540) % 360) - 180).toFixed(4) };
    draw();
    opts.onChange && opts.onChange({ ...sel, ...describePlace(sel.lat, sel.lon) });
  }
  function goTo(lat, lon, s = 70, select = true) {
    view.x = lon; view.y = mercY(lat); view.s = Math.max(view.s, s); clampView();
    if (select) pick({ lat, lon }); else draw();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  return {
    goTo,
    zoom: (f) => zoomAt(w / 2, h / 2, f),
    destroy() { ro.disconnect(); cancelAnimationFrame(raf); canvas.remove(); },
    search: searchTowns,
  };
}

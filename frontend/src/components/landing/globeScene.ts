// Stylized geography and mission paths for the landing illustration, not live data.
type Vec3 = [number, number, number];
type LonLat = [number, number];
type SceneState = { progress: number };

const LAND: LonLat[][] = [
  [[-168,66],[-145,70],[-127,60],[-123,49],[-115,32],[-103,22],[-87,16],[-81,25],[-97,29],[-82,42],[-64,48],[-58,58],[-83,66],[-110,73]],
  [[-81,12],[-68,11],[-50,0],[-35,-8],[-43,-23],[-55,-36],[-69,-55],[-76,-28],[-80,-5]],
  [[-53,60],[-23,68],[-28,81],[-48,83],[-62,75]],
  [[-11,36],[-10,51],[4,60],[25,71],[55,69],[94,77],[150,68],[178,61],[155,49],[142,35],[121,20],[108,3],[99,10],[88,22],[78,8],[66,25],[46,12],[35,31],[25,36],[14,44],[2,42]],
  [[-17,32],[10,37],[33,30],[44,12],[51,10],[41,-14],[31,-34],[18,-35],[10,-18],[-3,5],[-17,15]],
  [[113,-22],[132,-12],[145,-16],[153,-28],[145,-39],[128,-35],[115,-33]],
  [[47,-13],[51,-17],[48,-26],[44,-24]],
  [[130,31],[141,44],[145,43],[137,34]],
  [[95,5],[108,-6],[119,-9],[135,-5],[143,-5],[137,0],[119,1],[108,7]],
  [[166,-35],[177,-38],[172,-46],[166,-44]],
];
const BOT_ROUTES: LonLat[][] = [
  [[-87,33],[-82,30],[-79,35],[-74,39]],
  [[-4,43],[2,46],[8,48],[12,45]],
  [[18,-20],[23,-24],[29,-28],[31,-25]],
];

function onLand(lon: number, lat: number) {
  return LAND.some(polygon => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}
function sphere(lon: number, lat: number, rotation: number, radius = 1): Vec3 {
  const phi = lat * Math.PI / 180, theta = lon * Math.PI / 180 + rotation;
  const x = Math.cos(phi) * Math.sin(theta) * radius;
  const y = -Math.sin(phi) * radius;
  const z = Math.cos(phi) * Math.cos(theta) * radius;
  const tilt = 0.16;
  return [x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)];
}

const LAND_DOTS: LonLat[] = [];
for (let lat = -58; lat < 80; lat += 2.4) {
  for (let lon = -180; lon < 180; lon += 2.4 / Math.max(0.3, Math.cos(lat * Math.PI / 180))) {
    if (onLand(lon, lat)) LAND_DOTS.push([lon, lat]);
  }
}

export function startGlobeScene(canvas: HTMLCanvasElement, state: SceneState, motion: boolean) {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const ctx = context;
  let width = 1, height = 1, frame = 0, elapsed = 0, last = 0, visible = true;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const progress = state.progress;
    const initialRadius = Math.min(width * 0.85, height * 0.95);
    const finalRadius = Math.min(width * 0.34, height * 0.32);
    const radius = initialRadius + (finalRadius - initialRadius) * progress;
    const centerX = width * 0.5;
    const centerY = (height + initialRadius * 0.6) * (1 - progress) + height * 0.54 * progress;
    const rotation = 0.5 + elapsed * 0.018 + progress * 0.3;
    const project = (p: Vec3) => ({ x: centerX + p[0] * radius, y: centerY + p[1] * radius, z: p[2] });
    const haze = ctx.createRadialGradient(centerX, centerY, radius * 0.95, centerX, centerY, radius * 1.18);
    haze.addColorStop(0, "#79dcc329"); haze.addColorStop(1, "#79dcc300");
    ctx.fillStyle = haze; ctx.beginPath(); ctx.arc(centerX, centerY, radius * 1.18, 0, Math.PI * 2); ctx.fill();
    const ocean = ctx.createRadialGradient(centerX - radius * 0.35, centerY - radius * 0.4, 0, centerX, centerY, radius);
    ocean.addColorStop(0, "#203f37"); ocean.addColorStop(0.75, "#102a26"); ocean.addColorStop(1, "#050f11");
    ctx.fillStyle = ocean; ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8cdcc445"; ctx.lineWidth = 1; ctx.stroke();

    function surfaceLine(points: LonLat[], color: string, lineWidth: number) {
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.beginPath();
      let started = false;
      for (const [lon, lat] of points) {
        const p = project(sphere(lon, lat, rotation));
        if (p.z <= 0.02) { started = false; continue; }
        if (started) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
        started = true;
      }
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 20) surfaceLine(Array.from({ length: 121 }, (_, i) => [i * 3 - 180, lat]), "#6cbea31c", 0.7);
    for (let lon = -180; lon < 180; lon += 20) surfaceLine(Array.from({ length: 61 }, (_, i) => [lon, i * 3 - 90]), "#6cbea31c", 0.7);
    for (const [lon, lat] of LAND_DOTS) {
      const p = project(sphere(lon, lat, rotation));
      if (p.z < 0.03) continue;
      const size = Math.max(0.7, Math.min(2.2, radius * 0.003)) * (0.5 + p.z * 0.5);
      ctx.fillStyle = `rgba(162,216,154,${0.16 + p.z * 0.55})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
    }

    // Small shaded 3D meshes, rather than flat emoji or image assets.
    function mesh(origin: Vec3, size: number, satellite: boolean) {
      if (origin[2] < 0 && Math.hypot(origin[0], origin[1]) < 1.04) return;
      const scale = size / radius;
      const vertices: Vec3[] = [[-1,-0.65,-0.6],[1,-0.65,-0.6],[1,0.65,-0.6],[-1,0.65,-0.6],[-1,-0.65,0.6],[1,-0.65,0.6],[1,0.65,0.6],[-1,0.65,0.6]];
      const faces = [[0,1,5,4],[1,2,6,5],[4,5,6,7]];
      const colors = satellite ? ["#cbd8db", "#687f88", "#edf4ee"] : ["#ddfab4", "#4d8a66", "#b9ef87"];
      vertices.forEach((point, i) => { vertices[i] = [origin[0] + (point[0] + point[2] * 0.45) * scale, origin[1] + (point[1] - point[2] * 0.45) * scale, origin[2] + point[2] * scale]; });
      function polygon(points: Vec3[], fill: string, stroke = "#d3e5db66") {
        ctx.beginPath(); points.forEach((point, i) => { const p = project(point); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke();
      }
      if (satellite) {
        for (const side of [-1, 1]) {
          polygon([[1.2,-0.45,0],[3.9,-0.45,0],[3.9,0.55,0],[1.2,0.55,0]].map(p => [origin[0] + p[0] * scale * side, origin[1] + (p[1] + p[0] * 0.22 * side) * scale, origin[2]]), "#365d75", "#91bcd6");
          for (let line = 2; line <= 3; line++) {
            const p = project([origin[0] + line * scale * side, origin[1] + (-0.45 + line * 0.22 * side) * scale, origin[2]]);
            ctx.strokeStyle = "#91bcd677"; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + size); ctx.stroke();
          }
        }
      }
      faces.forEach((face, i) => polygon(face.map(index => vertices[index]), colors[i]));
      const p = project(origin);
      if (!satellite) {
        ctx.fillStyle = "#071b17";
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(p.x + side * size * 0.8, p.y + size * 0.8, size * 0.35, size * 0.22, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }

    BOT_ROUTES.forEach((route, index) => {
      const dense: LonLat[] = [];
      for (let segment = 0; segment < route.length - 1; segment++) {
        for (let i = 0; i <= 20; i++) { const t = i / 20; dense.push([route[segment][0] * (1 - t) + route[segment + 1][0] * t, route[segment][1] * (1 - t) + route[segment + 1][1] * t]); }
      }
      surfaceLine(dense, "#c5f47b99", 1.7);
      const step = ((elapsed * 0.016 + index * 0.3) % 1) * (route.length - 1);
      const segment = Math.floor(step), t = step - segment;
      const position = sphere(route[segment][0] * (1 - t) + route[segment + 1][0] * t, route[segment][1] * (1 - t) + route[segment + 1][1] * t, rotation);
      if (position[2] < 0.1) return;
      const p = project(position);
      ctx.strokeStyle = "#c5f47b55"; ctx.beginPath(); ctx.arc(p.x, p.y, 12 + Math.sin(elapsed * 2 + index) * 3, 0, Math.PI * 2); ctx.stroke();
      mesh(position, Math.max(6, radius * 0.017), false);
      if (progress > 0.4 && width > 600) { ctx.font = '10px "Bahnschrift", "DIN Alternate", "Segoe UI", Arial, sans-serif'; ctx.fillStyle = "#d9edce"; ctx.fillText(`R3-0${index + 1}`, p.x + 16, p.y + 3); }
    });

    for (let satellite = 0; satellite < 3; satellite++) {
      const angle = 1.2 + elapsed * 0.045 + satellite * Math.PI * 2 / 3;
      const orbit = (t: number): Vec3 => {
        const x = Math.cos(t) * 1.37, y = -Math.sin(t) * 0.75, z = Math.sin(t) * 1.18;
        const tilt = -0.42;
        return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt), z];
      };
      if (satellite === 0) {
        ctx.strokeStyle = "#a3d0c334"; ctx.lineWidth = 1; ctx.setLineDash([3, 7]); ctx.beginPath();
        let started = false;
        for (let i = 0; i <= 120; i++) { const position = orbit(i / 120 * Math.PI * 2); if (position[2] < 0 && Math.hypot(position[0], position[1]) < 1.02) { started = false; continue; } const p = project(position); if (started) ctx.lineTo(p.x,p.y); else ctx.moveTo(p.x,p.y); started = true; }
        ctx.stroke(); ctx.setLineDash([]);
      }
      mesh(orbit(angle), Math.max(7, Math.min(12, radius * 0.035)), true);
    }
  }
  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (document.hidden || !visible) { last = now; return; }
    if (now - last < 1000 / 30) return;
    elapsed += Math.min((now - (last || now)) / 1000, 0.1); last = now;
    draw();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
  intersection.observe(canvas);
  resize();
  if (motion) frame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(frame); resizeObserver.disconnect(); intersection.disconnect(); };
}

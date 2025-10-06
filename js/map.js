import { setStatus } from './utils.js';

let map;
let routeLayer;
let markers = [];

export function initMap(MAPTILER_KEY) {
  map = L.map('map').setView([-22.95, -48.40], 12);

  L.tileLayer(
    `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    { tileSize:256, minZoom:2, maxZoom:20, attribution:'© OSM © MapTiler' }
  ).addTo(map);

  routeLayer = L.geoJSON(null, {
    style: { color: '#3b82f6', weight: 6, opacity: 0.95 }
  }).addTo(map);

  return map;
}

export function clearRouteAndMarkers() {
  routeLayer.clearLayers();
  markers.forEach(m => m.remove());
  markers = [];
}

export function drawMarkers(points) {
  points.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'marker-num';
    el.textContent = (i + 1);
    const mk = L.marker([p.lat, p.lon], { icon: L.divIcon({ html: el, className: '', iconSize: [28, 18] }) })
      .addTo(map)
      .bindPopup(`<b>${i + 1} — ${p.nome || 'Ponto'}</b>${p.obs ? `<br>${p.obs}` : ''}`);
    markers.push(mk);
  });
}

export function drawRoute(geojson) {
  routeLayer.clearLayers();
  routeLayer.addData(geojson);
  const b = routeLayer.getBounds();
  if (b.isValid()) map.fitBounds(b, { padding: [60, 60] });
  setStatus('Visão geral pronta');
}

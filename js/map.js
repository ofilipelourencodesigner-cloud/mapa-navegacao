// Estado interno simples deste módulo
let mapInstance = null;
let routeLayer = null;
let markers = [];

/** Inicializa o Leaflet com tiles do MapTiler */
export function initMap(MAPTILER_KEY) {
  mapInstance = L.map('map', { zoomControl: true }).setView([-22.95, -48.40], 12);

  L.tileLayer(
    `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    {
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> ' +
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a>'
    }
  ).addTo(mapInstance);

  // camada vazia para a rota
  routeLayer = L.geoJSON(null, {
    style: { color: '#1e80ff', weight: 6, opacity: 0.95 }
  }).addTo(mapInstance);

  return mapInstance;
}

/** Apaga rota e marcadores */
export function clearRouteAndMarkers() {
  try { routeLayer.clearLayers(); } catch {}
  markers.forEach(m => m.remove());
  markers = [];
}

/** Desenha marcadores numerados com popup */
export function drawMarkers(points) {
  points.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'marker-num';
    el.textContent = String(idx + 1);

    const mk = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ html: el, className: '', iconSize: [28, 18] })
    })
    .bindPopup(`<b>${idx + 1} — ${p.nome || 'Ponto'}</b>${p.obs ? `<br>${p.obs}` : ''}`);

    mk.addTo(mapInstance);
    markers.push(mk);
  });
}

/** Desenha a rota a partir de um GeoJSON (FeatureCollection ou Feature) */
export function drawRoute(geojson) {
  try { routeLayer.clearLayers(); } catch {}
  routeLayer.addData(geojson);

  const b = routeLayer.getBounds();
  if (b && b.isValid()) {
    mapInstance.fitBounds(b, { padding: [30, 30] });
  }
}

/** Exponho o map se alguém precisar (opcional) */
export function getMap() {
  return mapInstance;
}

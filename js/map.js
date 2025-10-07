import { setStatus } from './utils.js';

let map;
let routeLayer;         // polyline da rota
let markers = [];       // marcadores numerados

export function initMap(MAPTILER_KEY){
  map = L.map('map', { zoomControl: true }).setView([-22.95, -48.40], 12);

  L.tileLayer(
    `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    {
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> ' +
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a>'
    }
  ).addTo(map);

  // camada vazia para a rota
  routeLayer = L.geoJSON(null, {
    style: { color: '#1e80ff', weight: 6, opacity: 0.95 }
  }).addTo(map);

  return map;
}

export function clearRouteAndMarkers(){
  // apaga rota
  routeLayer.clearLayers();
  // apaga marcadores
  markers.forEach(m => m.remove());
  markers = [];
}

export function drawMarkers(points){
  points.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'marker-num';
    el.textContent = String(i + 1);
    const mk = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ html: el, className: '', iconSize: [24,24] })
    })
    .addTo(map)
    .bindPopup(`<b>${i + 1} — ${p.nome || 'Ponto'}</b>${p.obs ? '<br>'+p.obs : ''}`);

    markers.push(mk);
  });
}

export function drawRouteFromGeoJSON(geojson){
  routeLayer.clearLayers();
  routeLayer.addData(geojson);

  const b = routeLayer.getBounds();
  if (b.isValid()) map.fitBounds(b, { padding: [60,60] });

  setStatus('Visão geral pronta', 'ok');
}

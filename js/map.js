// js/map.js

export function setStatus(html, cls = 'muted') {
  const el = document.getElementById('status');
  if (el) {
    el.className = cls;
    el.innerHTML = html;
  }
}

export function initMap(MAPTILER_KEY) {
  const map = L.map('map', { zoomControl: true }).setView([-22.95, -48.40], 12);

  L.tileLayer(
    `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    {
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> ' +
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a>'
    }
  ).addTo(map);

  map.createPane('routes');
  map.getPane('routes').style.zIndex = 650;
  map.createPane('markers');
  map.getPane('markers').style.zIndex = 800;
  map.createPane('tooltipPane').style.zIndex = 900;

  const groups = {
    markers: L.layerGroup().addTo(map),
    routeRemaining: L.polyline([], { color: '#1e80ff', weight: 6, opacity: 0.95, pane: 'routes' }).addTo(map),
    routeDone: L.polyline([], { color: '#9aa5b1', weight: 6, opacity: 0.95, pane: 'routes' }).addTo(map)
  };

  return { map, groups };
}

export function clearMap(groups) {
  groups.markers.clearLayers();
  groups.routeRemaining.setLatLngs([]);
  groups.routeDone.setLatLngs([]);
}

export function addNumberedMarkers(markersGroup, points) {
  if (!markersGroup) {
    console.error("Tentativa de adicionar marcadores a um grupo inválido.");
    return;
  }
  
  points.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'marker-num';
    el.textContent = String(i + 1);

    const mk = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ 
        html: el, 
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      }),
      pane: 'markers'
    }).bindPopup(`<b>${i + 1} — ${p.nome || 'Ponto'}</b>${p.obs ? '<br>' + p.obs : ''}`);
    
    markersGroup.addLayer(mk);
  });
}

export function fitToRoute(map, groups) {
  const all = groups.routeRemaining.getLatLngs();
  if (!all.length) return;
  
  const b = L.latLngBounds(all);
  if (b.isValid()) {
    map.fitBounds(b, { padding: [80, 80] });
  }
}

// js/map.js
export function basePath(){
  return location.pathname.replace(/[^/]+$/, '');
}

export function setStatus(html, cls='muted'){
  const el = document.getElementById('status');
  el.className = cls;
  el.innerHTML = html;
}

export function initMap(MAPTILER_KEY){
  const map = L.map('map', { zoomControl: true }).setView([-22.95, -48.40], 12);

  L.tileLayer(
    `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    {
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> '+
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a>'
    }
  ).addTo(map);

  const groups = {
    markers: L.layerGroup().addTo(map),
    routeRemaining: L.polyline([], { color:'#1e80ff', weight:6, opacity:0.95, className:'leaflet-layer-blue' }).addTo(map),
    routeDone:      L.polyline([], { color:'#9aa5b1', weight:6, opacity:0.95, className:'leaflet-layer-done' }).addTo(map),
    ghosts:         L.layerGroup().addTo(map) // opcional: fantasmas de segmentos
  };

  return { map, groups };
}

export function clearMap(groups){
  groups.markers.clearLayers();
  groups.routeRemaining.setLatLngs([]);
  groups.routeDone.setLatLngs([]);
  groups.ghosts.clearLayers();
}

export function addNumberedMarkers(groups, points){
  const arr = [];
  points.forEach((p,i)=>{
    const el = document.createElement('div');
    el.className = 'marker-num';
    el.textContent = String(i+1);
    const mk = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ html: el, className: '', iconSize: [24,24] })
    }).bindPopup(`<b>${i+1} — ${p.nome||'Ponto'}</b>${p.obs?'<br>'+p.obs:''}`);
    groups.markers.addLayer(mk);
    arr.push(mk);
  });
  return arr;
}

export function fitToRoute(map, groups){
  const all = [
    ...groups.routeRemaining.getLatLngs(),
    ...groups.routeDone.getLatLngs()
  ];
  if (!all.length) return;
  const b = L.latLngBounds(all);
  if (b.isValid()) map.fitBounds(b, { padding:[48,48] });
}

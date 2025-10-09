// js/map.js

// Função para exibir mensagens de status na interface
export function setStatus(html, cls = 'muted') {
  const el = document.getElementById('status');
  if (el) {
    el.className = cls;
    el.innerHTML = html;
  }
}

// Inicializa o mapa Leaflet e as camadas
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

  // Z-index panes para garantir que marcadores fiquem acima das rotas
  map.createPane('routes');
  map.getPane('routes').style.zIndex = 650;
  map.createPane('markers');
  map.getPane('markers').style.zIndex = 800;


  const groups = {
    markers: L.layerGroup().addTo(map),
    routeRemaining: L.polyline([], { color: '#1e80ff', weight: 6, opacity: 0.95, pane: 'routes' }).addTo(map),
    routeDone: L.polyline([], { color: '#9aa5b1', weight: 6, opacity: 0.95, pane: 'routes' }).addTo(map)
  };

  return { map, groups };
}

// Limpa todas as camadas dinâmicas do mapa
export function clearMap(groups) {
  groups.markers.clearLayers();
  groups.routeRemaining.setLatLngs([]);
  groups.routeDone.setLatLngs([]);
}

/**
 * Adiciona marcadores numerados a um grupo de camadas específico.
 * @param {L.LayerGroup} markersGroup - O grupo de camadas onde os marcadores serão adicionados.
 * @param {Array<object>} points - O array de pontos com lat, lon e nome.
 */
export function addNumberedMarkers(markersGroup, points) { // <-- PARÂMETRO CORRIGIDO
  if (!markersGroup) {
    console.error("Tentativa de adicionar marcadores a um grupo inválido.");
    return;
  }
  
  points.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'marker-num';
    el.textContent = String(i + 1);

    const mk = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ html: el, className: '', iconSize: [24, 24] }),
      pane: 'markers' // Garante que fique no painel superior
    }).bindPopup(`<b>${i + 1} — ${p.nome || 'Ponto'}</b>${p.obs ? '<br>' + p.obs : ''}`);
    
    // Agora adiciona ao 'markersGroup' que foi passado como argumento
    markersGroup.addLayer(mk); // <-- LINHA CORRIGIDA
  });
}

// Ajusta o zoom do mapa para englobar toda a rota
export function fitToRoute(map, groups) {
  const all = groups.routeRemaining.getLatLngs();
  if (!all.length) return;
  
  const b = L.latLngBounds(all);
  if (b.isValid()) {
    map.fitBounds(b, { padding: [80, 80] }); // Aumentei o padding para melhor visualização
  }
}

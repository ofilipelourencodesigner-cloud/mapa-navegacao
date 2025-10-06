// js/ui.js
import { fetchRouteGeoJSON } from './ors.js';

export function wireOverviewUI({ map, ORS_KEY }) {
  const rotaInput  = document.getElementById('rotaInput');
  const btnOverview = document.getElementById('btnOverview');
  const infoEl     = document.getElementById('info');

  let markers = [];
  let routeLayer = null;

  function clearMap() {
    markers.forEach(m => m.remove());
    markers = [];
    if (routeLayer) { routeLayer.remove(); routeLayer = null; }
  }

  function numberedMarker([lon, lat], i, popupHTML) {
    const el = document.createElement('div');
    el.className = 'marker-num';
    el.textContent = String(i);
    const m = L.marker([lat, lon], { icon: L.divIcon({ html: el, className: '', iconSize: [24,24] }) });
    if (popupHTML) m.bindPopup(popupHTML);
    return m;
  }

  async function showOverview() {
    clearMap();
    infoEl.textContent = 'Carregando rota...';

    const rotaId = parseInt(String(rotaInput.value || '').trim(), 10);
    const file = await fetch('./data/rotas.json', { cache: 'no-store' });
    const j = await file.json();
    const rota = (j.rotas || []).find(r => r.id === rotaId);
    if (!rota) { infoEl.textContent = 'Rota não encontrada.'; return; }

    // marcadores
    rota.pontos.forEach((p, i) => {
      const html = `<b>${i + 1} — ${p.nome}</b>${p.obs ? `<br>${p.obs}` : ''}`;
      const mk = numberedMarker([p.lon, p.lat], i + 1, html).addTo(map);
      markers.push(mk);
    });

    // rota via ORS
    const data = await fetchRouteGeoJSON({ points: rota.pontos, orsKey: ORS_KEY });
    const geom = data.features[0].geometry;
    const latlngs = geom.coordinates.map(([lon, lat]) => [lat, lon]);
    routeLayer = L.polyline(latlngs, { color: '#1e80ff', weight: 6, opacity: 0.95 }).addTo(map);
    map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });

    const seg = data.features[0].properties.segments?.[0];
    if (seg) {
      const km = (seg.distance / 1000).toFixed(1);
      const min = Math.round(seg.duration / 60);
      infoEl.innerHTML = `Visão geral pronta — <span class="tag">${rota.pontos.length} pontos</span> <span class="tag">${km} km</span> <span class="tag">${min} min</span>`;
    } else {
      infoEl.textContent = `Visão geral pronta — ${rota.pontos.length} pontos`;
    }
  }

  btnOverview.addEventListener('click', () => showOverview().catch(err => {
    console.error(err);
    infoEl.textContent = 'Falha ao carregar.';
  }));

  // opcional: carrega a 1 ao abrir
  showOverview().catch(() => {});
}

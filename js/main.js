import { initMap, clearRouteAndMarkers, drawMarkers, drawRoute } from './map.js';
import { fetchRouteGeoJSON } from './ors.js';

// >>>>> COLE suas chaves aqui <<<<<
const MAPTILER_KEY = 'LPF4PdydkUaFkn9Kv7jl';
const ORS_KEY      = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU3NjRjMmY0NzdhZTQ5MGY5MjJiYmRhYTIzOGM0ZDBiIiwiaCI6Im11cm11cjY0In0=';
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const map = initMap(MAPTILER_KEY);
const infoEl = document.getElementById('info');
const rotaInput = document.getElementById('rotaInput');
const btnOverview = document.getElementById('btnOverview');

// Carrega arquivo rotas.json
async function loadRotas() {
  const r = await fetch('./rotas.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('Falha ao carregar rotas.json');
  return r.json();
}

async function showOverview() {
  try {
    infoEl.textContent = 'Carregando rota...';
    clearRouteAndMarkers();

    const id = parseInt(String(rotaInput.value || '').trim(), 10);
    if (!id) throw new Error('Digite um número de rota');

    const all = await loadRotas();
    const rota = (all.rotas || []).find(r => r.id === id);
    if (!rota) throw new Error('Rota não encontrada');

    // Marcadores (pontos) com popup
    drawMarkers(rota.pontos);

    // Rota (ORS)
    const data = await fetchRouteGeoJSON({ points: rota.pontos, orsKey: ORS_KEY });

    // GeoJSON esperado pelo Leaflet:
    // data.features[0] -> Feature (LineString)
    // Vamos passar todo o FeatureCollection (data) para preservar estrutura:
    drawRoute(data);

    // Resumo
    const seg = data.features?.[0]?.properties?.segments?.[0];
    if (seg) {
      const km = (seg.distance / 1000).toFixed(1);
      const min = Math.round(seg.duration / 60);
      infoEl.innerHTML = `Visão geral pronta — <span class="tag">${rota.pontos.length} pontos</span> <span class="tag">${km} km</span> <span class="tag">${min} min</span>`;
    } else {
      infoEl.textContent = `Visão geral pronta — ${rota.pontos.length} pontos`;
    }

    // (Opcional) ver instruções no console
    console.log('Passos:', data.features?.[0]?.properties?.segments?.[0]?.steps || []);
  } catch (err) {
    console.error(err);
    infoEl.textContent = `Erro: ${err.message || err}`;
  }
}

btnOverview.addEventListener('click', showOverview);

// Carrega a rota 1 ao abrir (opcional)
showOverview();

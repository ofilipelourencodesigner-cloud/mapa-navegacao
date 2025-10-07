import { fetchRouteGeoJSON } from './ors.js';
import { clearRouteAndMarkers, drawMarkers, drawRouteFromGeoJSON } from './map.js';
import { setStatus, basePath } from './utils.js';

export function wireOverviewUI({ map, MAPTILER_KEY, ORS_KEY }){
  const btnOverview = document.getElementById('btnOverview');
  const rotaInput   = document.getElementById('rotaInput');

  btnOverview.addEventListener('click', async () => {
    try{
      await showOverview();
    }catch(err){
      console.error(err);
      setStatus('Erro: '+ (err.message || String(err)), 'err');
    }
  });

  // opcional: carrega rota 1 na abertura
  showOverview().catch(err => {
    console.error(err);
    setStatus('Falha ao carregar: '+ (err.message || String(err)), 'err');
  });

  async function showOverview(){
    clearRouteAndMarkers();
    setStatus('Carregando rota...', 'muted');

    // 1) buscar o JSON
    const rotaId = parseInt(String(rotaInput.value || '').trim(), 10);
    if (Number.isNaN(rotaId)) throw new Error('Informe um número de rota válido.');

    const url = `${basePath()}data/rotas.json`;
    const resp = await fetch(url, { cache:'no-store' });
    if (!resp.ok) throw new Error(`Falha ao carregar rotas.json (${resp.status})`);

    const j = await resp.json();
    const rota = (j.rotas || []).find(r => r.id === rotaId);
    if (!rota) throw new Error(`Rota ${rotaId} não encontrada no rotas.json`);

    // 2) marcadores
    drawMarkers(rota.pontos);

    // 3) rota pelo ORS
    const data = await fetchRouteGeoJSON({ points: rota.pontos, orsKey: ORS_KEY });

    // 4) desenhar no mapa
    const feature = data.features?.[0];
    if (!feature) throw new Error('Retorno do ORS sem geometria');

    drawRouteFromGeoJSON(feature);

    // 5) status (distância/duração)
    const seg = feature.properties?.segments?.[0];
    if (seg){
      const km = (seg.distance/1000).toFixed(1);
      const min = Math.round(seg.duration/60);
      setStatus(
        `Visão geral — <span class="tag">${rota.pontos.length} pontos</span> <span class="tag">${km} km</span> <span class="tag">${min} min</span>`,
        'ok'
      );
    }else{
      setStatus(`Visão geral — ${rota.pontos.length} pontos`, 'ok');
    }

    // (debug) ver instruções de navegação
    // console.log('Passos:', feature.properties?.segments?.[0]?.steps);
  }
}

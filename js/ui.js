import { $, setStatus } from './utils.js';
import { drawMarkers, drawRoute, clearRouteAndMarkers } from './map.js';
import { fetchRouteGeoJSON } from './ors.js';

export function wireOverviewUI({ map, MAPTILER_KEY, ORS_KEY }) {
  $('#btnOverview').addEventListener('click', async () => {
    const rotaId = parseInt($('#rotaInput').value, 10) || 1;

    try {
      setStatus('Carregando rota…');
      clearRouteAndMarkers();

      // carrega dados locais (ordem fixa já no JSON)
      const j = await (await fetch('data/rotas.json', { cache: 'no-store' })).json();
      const rota = j.rotas.find(r => r.id === rotaId);
      if (!rota) { alert(`Rota ${rotaId} não encontrada`); setStatus('Rota não encontrada'); return; }

      const pontos = rota.pontos.map(p => ({
        nome: p.nome,
        lat: +p.latitude ?? +p.lat,
        lon: +p.longitude ?? +p.lon,
        obs: p.obs || ''
      }));

      drawMarkers(pontos);

      // chama ORS para a linha azul
      setStatus('Solicitando rota ao ORS…');
      const geo = await fetchRouteGeoJSON({ points: pontos, orsKey: ORS_KEY });

      drawRoute(geo); // desenha a linha e ajusta o bounds
    } catch (e) {
      console.error(e);
      setStatus('Erro ao montar a visão geral');
      alert('Falha ao obter rota. Veja o console (F12) para detalhes.');
    }
  });
}

// js/data.js

export function parseRouteInput(raw){
  const s = String(raw||'').trim().toLowerCase();
  if (!s) return null;
  const isReturn = /r$/.test(s);
  const num = s.replace(/[^0-9]/g,'');
  if (!num) return null;
  return { id: num.padStart(3,'0'), dir: isReturn ? 'retorno' : 'ida' };
}

export async function loadLogicalPoints({ id, dir }){
  const url = `${location.pathname.replace(/[^/]+$/, '')}data/rotas/${id}-${dir}.json`;
  const res = await fetch(url, { cache:'no-store' });
  if (!res.ok){
    const txt = await res.text();
    throw new Error(`Falha ao carregar ${id}-${dir}.json (${res.status}): ${txt}`);
  }
  const json = await res.json();
  // esperado: { pontos: [ {lat, lon, nome?, obs?}, ... ] }
  if (!json || !Array.isArray(json.pontos) || !json.pontos.length){
    throw new Error(`Arquivo ${id}-${dir}.json sem pontos válidos`);
  }
  return json.pontos;
}

/**
 * Gera rota “navegável” na ORS, preservando a ordem dos pontos.
 * Retorna { latlngs: [ [lat,lon], ... ], steps, stats }
 */
export async function fetchORSRoute(points, ORS_KEY){
  const coordinates = points.map(p => [p.lon, p.lat]); // ORS espera [lon, lat]

  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      'Authorization': ORS_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json, application/geo+json'
    },
    body: JSON.stringify({
      coordinates,
      instructions: true,
      instructions_format: 'text',
      language: 'pt'
    })
  });

  if (!res.ok) throw new Error(`ORS ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const feat = data.features?.[0];
  if (!feat) throw new Error('Retorno ORS sem geometria');

  const latlngs = feat.geometry.coordinates.map(([lon,lat]) => [lat,lon]);
  const seg = feat.properties?.segments?.[0];
  const steps = seg?.steps || [];
  const stats = seg ? {
    km: (seg.distance/1000),
    min: (seg.duration/60)
  } : null;

  return { latlngs, steps, stats };
}

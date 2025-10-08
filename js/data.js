// js/data.js  (versão robusta)

// Lê "3", "003", "3r", etc -> { id:"003", dir:"ida"|"retorno" }
export function parseRouteInput(raw){
  const s = String(raw||'').trim().toLowerCase();
  if (!s) return null;
  const isReturn = /r$/.test(s);
  const num = s.replace(/[^0-9]/g, '');
  if (!num) return null;
  return { id: num.padStart(3, '0'), dir: isReturn ? 'retorno' : 'ida' };
}

/**
 * Resolve a URL para data/rotas/<id>-<dir>.json usando import.meta.url
 * Isso funciona em GitHub Pages (subpath), localhost e file://
 */
function rotasURL(id, dir){
  // base: .../js/  ->   .../data/rotas/
  const base = new URL('../data/rotas/', import.meta.url);
  return new URL(`${id}-${dir}.json?cachebust=${Date.now()}`, base).href;
}

export async function loadLogicalPoints({ id, dir }){
  const url = rotasURL(id, dir);

  const res = await fetch(url, {
    cache: 'no-store'
  }).catch(err => {
    // fetch pode lançar erro em file://; deixe mensagem clara
    throw new Error(`Falha de rede ao buscar ${id}-${dir}.json (${url}): ${err.message}`);
  });

  if (!res.ok){
    const txt = await res.text().catch(()=> '');
    throw new Error(`Falha ao carregar ${id}-${dir}.json (${res.status}) ${txt}`);
  }

  const json = await res.json().catch(err=>{
    throw new Error(`JSON inválido em ${id}-${dir}.json: ${err.message}`);
  });

  if (!json || !Array.isArray(json.pontos) || json.pontos.length === 0){
    throw new Error(`Arquivo ${id}-${dir}.json sem "pontos" válidos`);
  }

  return json.pontos;
}

/**
 * Gera rota na ORS preservando a ordem dos pontos
 * Retorna { latlngs: [ [lat,lon], ... ], steps, stats }
 */
export async function fetchORSRoute(points, ORS_KEY){
  const coordinates = points.map(p => [p.lon, p.lat]); // ORS espera [lon, lat]

  let res;
  try{
    res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
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
  }catch(err){
    throw new Error(`Erro de rede ao chamar ORS: ${err.message}`);
  }

  if (!res.ok){
    const txt = await res.text().catch(()=> '');
    throw new Error(`ORS ${res.status}: ${txt}`);
  }

  const data = await res.json().catch(err=>{
    throw new Error(`Resposta ORS inválida: ${err.message}`);
  });

  const feat = data.features?.[0];
  if (!feat || !feat.geometry?.coordinates?.length){
    throw new Error('Retorno ORS sem geometria');
  }

  const latlngs = feat.geometry.coordinates.map(([lon,lat]) => [lat,lon]);
  const seg    = feat.properties?.segments?.[0];
  const steps  = seg?.steps || [];
  const stats  = seg ? { km: (seg.distance/1000), min: (seg.duration/60) } : null;

  return { latlngs, steps, stats };
}

// Chamada ao OpenRouteService Directions (retorna GeoJSON)
export async function fetchRouteGeoJSON({ points, orsKey }){
  const coordinates = points.map(p => [p.lon, p.lat]); // [lon, lat]

  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      'Authorization': orsKey,
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

  if (!res.ok){
    const txt = await res.text();
    throw new Error(`ORS ${res.status}: ${txt}`);
  }

  return res.json();
}

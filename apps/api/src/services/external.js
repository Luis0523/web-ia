const haversineKm = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

export const getClima = async ({ lat, lon, dias = 5 }) => {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null;
  const days = Math.max(1, Math.min(Number(dias) || 5, 16));

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', String(days));

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const data = await response.json();
    const daily = data.daily || {};
    const forecast = (daily.time || []).map((date, index) => ({
      date,
      max: daily.temperature_2m_max?.[index],
      min: daily.temperature_2m_min?.[index],
      precipitation: daily.precipitation_sum?.[index],
    }));

    return {
      source: 'Open-Meteo',
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      forecast,
    };
  } catch {
    return null;
  }
};

export const getDistanciaKm = async (origen, destino) => {
  if (!origen || !destino) return null;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origen.lon},${origen.lat};${destino.lon},${destino.lat}?overview=false`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('OSRM no disponible');
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) throw new Error('Sin ruta');
    return {
      source: 'OSRM',
      distanceKm: Math.round(route.distance / 1000),
      durationMinutes: Math.round(route.duration / 60),
    };
  } catch {
    const distanceKm = haversineKm(origen, destino) * 1.3;
    return {
      source: 'Haversine (estimado)',
      distanceKm: Math.round(distanceKm),
      durationMinutes: Math.round((distanceKm / 70) * 60),
    };
  }
};

export const resolveCoords = (row) => ({
  lat: Number(row.lat),
  lon: Number(row.lon),
  nombre: row.nombre,
});

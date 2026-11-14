// Weather from Open-Meteo (free, no account or API key). Cached for 30 minutes.
import type { GlyphName } from '../components/Glyph';

export interface Weather {
  place: string;
  temp: number;
  hi: number;
  lo: number;
  code: number;
  isDay: boolean;
  at: number;
}

const CACHE = 'glass.weather';
const MAX_AGE = 30 * 60 * 1000;

export async function getWeather(city: string, force = false): Promise<Weather | null> {
  city = city.trim();
  if (!city) return null;
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) || 'null');
      if (c && c.city === city && Date.now() - c.w.at < MAX_AGE) return c.w;
    } catch (_) { /* ignore */ }
  }
  const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(city)}`)).json();
  const g = geo && geo.results && geo.results[0];
  if (!g) throw new Error(`Couldn't find "${city}"`);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}` +
    `&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
  const f = await (await fetch(url)).json();
  const w: Weather = {
    place: g.name,
    temp: Math.round(f.current.temperature_2m),
    code: f.current.weather_code,
    isDay: f.current.is_day === 1,
    hi: Math.round(f.daily.temperature_2m_max[0]),
    lo: Math.round(f.daily.temperature_2m_min[0]),
    at: Date.now(),
  };
  try {
    localStorage.setItem(CACHE, JSON.stringify({ city, w }));
  } catch (_) { /* ignore */ }
  return w;
}

export function weatherGlyph(code: number, isDay: boolean): GlyphName {
  if (code === 0) return isDay ? 'sun' : 'moon';
  if (code <= 2) return isDay ? 'cloudSun' : 'cloudMoon';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'bolt';
  return 'rain';
}

export function weatherText(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code === 85 || code === 86) return 'Snow Showers';
  if (code >= 95) return 'Thunderstorms';
  return '';
}

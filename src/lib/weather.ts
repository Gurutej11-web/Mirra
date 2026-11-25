/** Free weather + geocoding via Open-Meteo (no API key). */

export type Weather = {
  tempC: number;
  feelsC: number;
  code: number;
  description: string;
  rain: boolean;
  wind: number;
  daily: { date: string; maxC: number; minC: number; code: number; rainChance: number; description: string }[];
};

const WMO: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Showers", 81: "Showers", 82: "Heavy showers",
  85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

export const describe = (code: number) => WMO[code] ?? "—";
export const isWet = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
export const isSnow = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86;

export async function getWeather(lat: number, lon: number, days = 7): Promise<Weather | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: lat.toFixed(3),
      longitude: lon.toFixed(3),
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation",
      daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
      timezone: "auto",
      forecast_days: String(Math.min(16, Math.max(1, days))),
    }).toString();
    const res = await fetch(url, { next: { revalidate: 1800 } } as RequestInit);
    if (!res.ok) return null;
    const j = await res.json();
    const c = j.current;
    return {
      tempC: c.temperature_2m,
      feelsC: c.apparent_temperature,
      code: c.weather_code,
      description: describe(c.weather_code),
      rain: isWet(c.weather_code) || c.precipitation > 0,
      wind: c.wind_speed_10m,
      daily: (j.daily.time as string[]).map((date, i) => ({
        date,
        maxC: j.daily.temperature_2m_max[i],
        minC: j.daily.temperature_2m_min[i],
        code: j.daily.weather_code[i],
        rainChance: j.daily.precipitation_probability_max?.[i] ?? 0,
        description: describe(j.daily.weather_code[i]),
      })),
    };
  } catch {
    return null;
  }
}

export type Place = { name: string; lat: number; lon: number };

export async function geocode(q: string): Promise<Place[]> {
  if (q.trim().length < 2) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=${encodeURIComponent(q.trim())}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json();
    return (j.results ?? []).map((r: { name: string; admin1?: string; country_code?: string; latitude: number; longitude: number }) => ({
      name: [r.name, r.admin1, r.country_code].filter(Boolean).join(", "),
      lat: r.latitude,
      lon: r.longitude,
    }));
  } catch {
    return [];
  }
}

export const toF = (c: number) => Math.round((c * 9) / 5 + 32);
export const fmtTemp = (c: number, units: "metric" | "imperial" = "imperial") =>
  units === "metric" ? `${Math.round(c)}°C` : `${toF(c)}°F`;

/** Plain-language layering advice from the forecast. */
export function layeringAdvice(w: { tempC: number; feelsC?: number; rain?: boolean; wind?: number }) {
  const t = w.feelsC ?? w.tempC;
  const parts: string[] = [];
  if (t < 0) parts.push("Freezing — heavy coat, warm layers, closed shoes.");
  else if (t < 8) parts.push("Cold — a proper coat over a knit or layered top.");
  else if (t < 15) parts.push("Cool — bring a jacket or overshirt you can take off.");
  else if (t < 22) parts.push("Mild — light layers; a tee plus something on top.");
  else if (t < 28) parts.push("Warm — breathable fabrics, short sleeves work.");
  else parts.push("Hot — linen, loose fits, light colors.");
  if (w.rain) parts.push("Rain likely: water-resistant outer layer and shoes that can handle puddles; skip suede.");
  if ((w.wind ?? 0) > 30) parts.push("Windy — avoid flowy pieces, add a windproof layer.");
  return parts.join(" ");
}

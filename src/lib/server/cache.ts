const cache = new Map<string, { timestamp: number, data: unknown }>();

const OneHour = 60 * 60 * 1000;
const CacheExpiry = 24 * OneHour;

export const fetchCached = async <T>(cacheKey: string, url?: string | URL, init?: RequestInit) => {
  const cached = cache.get(cacheKey);
  if (cached) {
    const delta = Date.now() - cached.timestamp;
    if (delta < CacheExpiry) {
      return cached.data as T;
    }
  }

  const response = await fetch(url ?? cacheKey, init);
  const json = await response.json() as T;

  cache.set(cacheKey, {
    timestamp: Date.now(),
    data: json,
  })

  return json;
};

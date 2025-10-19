type Opts = { etag?: string; bearer?: string; timeoutMs?: number };
const memCache = new Map<string, unknown>();

export async function fetchJsonV1<T>(url: string, opts: Opts = {}): Promise<{ data: T; etag?: string; fromCache?: boolean }> {
  const { etag, bearer, timeoutMs = 5000 } = opts;
  const headers: Record<string, string> = { 'accept': 'application/json' };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (etag) headers['if-none-match'] = etag;

  const attempt = async (): Promise<{ data: T; etag?: string; fromCache?: boolean }> => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: ac.signal, cache: 'no-store' });
      const newEtag = res.headers.get('etag') ?? undefined;

      if (res.status === 304 && etag && memCache.has(etag)) {
        clearTimeout(t);
        return { data: memCache.get(etag) as T, etag, fromCache: true };
      }

      if (!res.ok) {
        // Pas de retry sur 4xx
        throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: await res.text() });
      }

      const json = await res.json();
      if (newEtag) memCache.set(newEtag, json);
      clearTimeout(t);
      return { data: json as T, etag: newEtag, fromCache: false };
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  };

  try {
    return await attempt();
  } catch (e) {
    const error = e as { status?: number };
    if (error.status && error.status >= 400 && error.status < 500) throw e; // no retry on 4xx
    // one retry (réseau/5xx)
    return await attempt();
  }
} 
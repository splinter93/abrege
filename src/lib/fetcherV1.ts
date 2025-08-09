type Opts = { etag?: string; bearer?: string; timeoutMs?: number };
const memCache = new Map<string, any>();

export async function fetchJsonV1<T>(url: string, opts: Opts = {}): Promise<{ data: T; etag?: string; fromCache?: boolean }> {
  const { etag, bearer, timeoutMs = 5000 } = opts;
  const headers: Record<string, string> = { 'accept': 'application/json' };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (etag) headers['if-none-match'] = etag;

  const attempt = async () => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: ac.signal, cache: 'no-store' });
      const newEtag = res.headers.get('etag') ?? undefined;

      if (res.status === 304 && etag && memCache.has(etag)) {
        clearTimeout(t);
        return { data: memCache.get(etag), etag, fromCache: true } as any;
      }

      if (!res.ok) {
        // Pas de retry sur 4xx
        throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: await res.text() });
      }

      const json = await res.json();
      if (newEtag) memCache.set(newEtag, json);
      clearTimeout(t);
      return { data: json, etag: newEtag, fromCache: false } as any;
    } catch (e: any) {
      clearTimeout(t);
      throw e;
    }
  };

  try {
    return await attempt();
  } catch (e: any) {
    if (e.status && e.status >= 400 && e.status < 500) throw e; // no retry on 4xx
    // one retry (réseau/5xx)
    return await attempt();
  }
} 
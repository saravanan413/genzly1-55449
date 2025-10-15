// Connectivity probe for Firebase Storage reachability from the browser
// - Uses no-cors requests so the browser will not block the call due to CORS when only testing egress
// - Success criteria: fetch resolves (even if opaque). Failure: fetch rejects or times out

export type StorageConnectivityReport = {
  host: string;
  getReachable: boolean;
  postReachable: boolean;
  details: string[];
  durationMs: number;
};

const DEFAULT_HOST = 'https://firebasestorage.googleapis.com';

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return p.finally(() => clearTimeout(t));
}

async function attempt(url: string, method: 'GET' | 'HEAD' | 'POST', timeoutMs: number, details: string[]): Promise<boolean> {
  const started = Date.now();
  try {
    await withTimeout(
      fetch(url, {
        method,
        mode: 'no-cors',
        cache: 'no-store',
        keepalive: true,
        // Note: no headers so it remains a simple request and avoids preflight
      }),
      timeoutMs,
      `${method} ${url}`
    );
    details.push(`${method} to ${new URL(url).host} resolved in ${Date.now() - started}ms`);
    return true;
  } catch (e: any) {
    details.push(`${method} to ${new URL(url).host} failed: ${e?.name || 'Error'} ${e?.message || ''}`.trim());
    return false;
  }
}

export async function probeStorageConnectivity(opts?: { host?: string; timeoutMs?: number }): Promise<StorageConnectivityReport> {
  const host = opts?.host || DEFAULT_HOST;
  const timeoutMs = opts?.timeoutMs ?? 8000; // 8s budget
  const details: string[] = [];
  const startAll = Date.now();

  // Test GET reachability (TCP/TLS egress)
  const getReachable = await attempt(host, 'GET', timeoutMs, details);

  // Test POST allowance (many proxies block POST to unknown hosts)
  const postReachable = await attempt(host, 'POST', timeoutMs, details);

  return {
    host,
    getReachable,
    postReachable,
    details,
    durationMs: Date.now() - startAll,
  };
}

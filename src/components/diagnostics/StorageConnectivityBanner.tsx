import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { probeStorageConnectivity, StorageConnectivityReport } from '@/utils/connectivity/storageConnectivityProbe';

function isLovableHosted() {
  const h = typeof window !== 'undefined' ? window.location.hostname : '';
  return /\.lovable(app|project\.com)$/.test(h) || h.endsWith('.lovable.app') || h.endsWith('.lovableproject.com');
}

export default function StorageConnectivityBanner() {
  const [report, setReport] = useState<StorageConnectivityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLovableHosted()) return;

    let mounted = true;
    probeStorageConnectivity()
      .then((r) => {
        if (!mounted) return;
        setReport(r);
        const ok = r.getReachable && r.postReachable;
        const summary = {
          host: r.host,
          ok,
          getReachable: r.getReachable,
          postReachable: r.postReachable,
          durationMs: r.durationMs,
          details: r.details,
        };
        console.log('[StorageConnectivityProbe]', summary);
        if (!ok) {
          console.warn('[StorageConnectivityProbe] Potential egress block to Firebase Storage. Please whitelist firebasestorage.googleapis.com:443 (GET/POST/PUT/OPTIONS).');
        }
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Probe failed');
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Only show if running on Lovable hosted domains and connectivity looks bad
  if (!isLovableHosted()) return null;

  const bad = !report || !(report.getReachable && report.postReachable) || !!error;
  if (!bad) return null;

  const details = report?.details || (error ? [error] : []);

  return (
    <div className="px-4 md:px-6 pt-2">
      <Alert variant="destructive">
        <AlertTitle>Cannot reach Firebase Storage from this host</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>
              Outgoing HTTPS requests to firebasestorage.googleapis.com appear blocked or filtered. This prevents resumable uploads (bytesTransferred remains 0%).
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              <li>Whitelist firebasestorage.googleapis.com on port 443 (allow GET/POST/PUT/OPTIONS)</li>
              <li>Ensure reverse proxy does not strip x-goog-upload-* headers or block preflight</li>
              <li>Confirm CORS on your bucket allows this origin and required headers</li>
            </ul>
            {details.length > 0 && (
              <div className="text-xs whitespace-pre-wrap">
                {details.map((d, i) => (
                  <div key={i}>• {d}</div>
                ))}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

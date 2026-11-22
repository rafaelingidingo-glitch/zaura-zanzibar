// In-memory sliding-window rate limiter.
// Suitable for a single instance; on serverless each instance keeps its own
// window, which still throttles abusive bursts effectively.

type Bucket = number[];

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    const windowMs = Number(key.split("|")[1]) || 60_000;
    if (hits.length === 0 || now - hits[hits.length - 1] > windowMs) buckets.delete(key);
  }
}

/** Returns true when the request should be allowed. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const bucketKey = `${key}|${windowMs}`;
  const hits = (buckets.get(bucketKey) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(bucketKey, hits);
    return false;
  }
  hits.push(now);
  buckets.set(bucketKey, hits);
  return true;
}

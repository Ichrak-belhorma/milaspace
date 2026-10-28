/**
 * Small in-memory sliding-window limiter, per key (user id or IP). Good enough for one server
 * instance; a shared store (e.g. a Supabase table) would replace it for multi-instance deploys.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    /** Records a hit and returns how many ms to wait, or 0 when allowed. */
    take(key: string, now = Date.now()): number {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return windowMs - (now - recent[0]!);
      }
      recent.push(now);
      hits.set(key, recent);
      return 0;
    },
  };
}

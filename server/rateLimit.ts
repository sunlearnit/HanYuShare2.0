import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

const ipStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 25;

// Periodically prune stale entries to keep memory bounded
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [ip, entry] of ipStore.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      ipStore.delete(ip);
    }
  }
}, WINDOW_MS).unref();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
    req.ip ||
    'unknown';

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const entry = ipStore.get(clientIp) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error:
        'Bạn đã gửi quá nhiều yêu cầu trong một phút. Vui lòng đợi khoảng 60 giây rồi thử lại.',
    });
    return;
  }

  entry.timestamps.push(now);
  ipStore.set(clientIp, entry);
  next();
}

import type { RateLimitResult, RateLimiter } from './types.js';

interface RateLimitRecord {
  timestamps: number[];
}

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, RateLimitRecord>();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out expired timestamps
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0] ?? now;
      const resetAt = oldest + windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: limit - record.timestamps.length,
      resetAt: now + windowMs,
    };
  }

  reset(): void {
    this.store.clear();
  }
}

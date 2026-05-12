/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiter to prevent API abuse.
 * For production, replace with Redis-backed solution.
 */

import { Request, Response, NextFunction } from 'express';

interface RateEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateEntry>();
const WINDOW_MS = 60 * 1000;  // 1 minute window
const MAX_REQUESTS = 100;      // 100 requests per minute

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    store.set(key, { count: 1, resetTime: now + WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
    return;
  }

  entry.count++;
  next();
}

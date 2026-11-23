import { Request } from 'express';

/**
 * Extracts and sanitizes the client IP address from the request.
 * Handles x-forwarded-for (proxies/reverse proxies), IPv4-mapped IPv6 (::ffff:), and socket remote address.
 */
export function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    if (raw && typeof raw === 'string') {
      return raw.trim().replace(/^::ffff:/, '');
    }
  }
  const ip = req.ip || req.socket?.remoteAddress || '';
  return ip.replace(/^::ffff:/, '');
}

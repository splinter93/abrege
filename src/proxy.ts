import { NextRequest, NextResponse } from 'next/server';
import { logger, LogCategory } from '@/utils/logger';
import { ipApiRateLimiter, ipChatRateLimiter, ipUploadRateLimiter } from '@/services/rateLimiter';
import { metricsCollector } from '@/services/monitoring/MetricsCollector';

/**
 * Extrait l'IP client depuis les headers de la requête
 * Gère x-forwarded-for (peut contenir plusieurs IPs), x-real-ip, et req.ip
 */
function extractClientIP(req: NextRequest): string {
  // x-forwarded-for peut contenir plusieurs IPs séparées par des virgules
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Prendre la première IP (client original)
    const firstIP = forwardedFor.split(',')[0].trim();
    if (firstIP) return firstIP;
  }

  // Fallback sur x-real-ip
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;

  return 'unknown';
}

/**
 * Identifie le type d'endpoint pour appliquer le bon rate limiter
 */
function getEndpointType(pathname: string): 'chat' | 'upload' | 'api' {
  if (pathname.startsWith('/api/chat/')) {
    return 'chat';
  }

  if (pathname.includes('/upload') || pathname.includes('/files') || pathname.includes('/images')) {
    return 'upload';
  }

  return 'api';
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const resRid = req.headers.get('x-request-id') ?? crypto.randomUUID();

  // Public paths to allow without auth check (home, public notes, assets)
  const PUBLIC_PREFIXES = ['/_next', '/favicon', '/public', '/api/ui/public'];
  
  // ✅ SÉCURITÉ : Traitement spécial pour les pages publiques avec logging
  if (url.pathname.startsWith('/@')) {
    logger.debug(LogCategory.API, '[PROXY] Accès page publique', { pathname: url.pathname });
    
    const res = NextResponse.next();
    res.headers.set('x-request-id', resRid);
    return res;
  }

  if (PUBLIC_PREFIXES.some(p => url.pathname.startsWith(p))) {
    const res = NextResponse.next();
    res.headers.set('x-request-id', resRid);
    return res;
  }

  // ✅ Rate limiting par IP pour les endpoints API
  if (url.pathname.startsWith('/api/')) {
    const clientIP = extractClientIP(req);
    const endpointType = getEndpointType(url.pathname);

    let limiter;
    
    switch (endpointType) {
      case 'chat':
        limiter = ipChatRateLimiter;
        break;
      case 'upload':
        limiter = ipUploadRateLimiter;
        break;
      default:
        limiter = ipApiRateLimiter;
    }

    const rateLimitResult = limiter.checkSync(clientIP);

    metricsCollector.recordRateLimit(endpointType, clientIP, !rateLimitResult.allowed);

    if (!rateLimitResult.allowed) {
      logger.warn(LogCategory.API, '[PROXY] ⛔ Rate limit IP dépassé', {
        ip: clientIP,
        endpoint: url.pathname,
        endpointType,
        limit: rateLimitResult.limit,
        resetTime: rateLimitResult.resetTime
      });

      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Trop de requêtes depuis cette IP. Veuillez réessayer dans ${retryAfter} secondes.`,
          retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': retryAfter.toString(),
            'x-request-id': resRid
          }
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    response.headers.set('x-request-id', resRid);
    return response;
  }

  // Propagate x-request-id to downstream (API/app router)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', resRid);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-request-id', resRid);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

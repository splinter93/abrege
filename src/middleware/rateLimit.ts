import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Fenêtre de temps en ms
  maxRequests: number; // Nombre max de requêtes par fenêtre
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Store en mémoire (en production, utiliser Redis)
const rateLimitStore: RateLimitStore = {};

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Vérifier si une requête est autorisée
   */
  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase

    // Nettoyer les anciennes entrées
    if (rateLimitStore[identifier] && rateLimitStore[identifier].resetTime < now) {
      delete rateLimitStore[identifier];
    }

    // Créer ou mettre à jour l'entrée
    if (!rateLimitStore[identifier]) {
      rateLimitStore[identifier] = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      return { allowed: true, remaining: this.config.maxRequests - 1, resetTime: rateLimitStore[identifier].resetTime };
    }

    // Vérifier la limite
    if (rateLimitStore[identifier].count >= this.config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: rateLimitStore[identifier].resetTime };
    }

    // Incrémenter le compteur
    rateLimitStore[identifier].count++;
    return { 
      allowed: true, 
      remaining: this.config.maxRequests - rateLimitStore[identifier].count,
      resetTime: rateLimitStore[identifier].resetTime 
    };
  }
}

// Instances de rate limiting par type d'endpoint
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100 // 100 requêtes par minute
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5 // 5 tentatives par 15 minutes
});

/**
 * Middleware de rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest, params?: any) => Promise<Response>,
  limiter: RateLimiter = apiRateLimiter
) {
  return async (req: NextRequest, params?: any): Promise<Response> => {
    // Identifier basé sur l'IP et l'endpoint
    const identifier = `${req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'}:${req.nextUrl?.pathname || 'unknown'}`;
    
    const rateLimitResult = limiter.isAllowed(identifier);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Ajouter les headers de rate limiting
    const response = await handler(req, params);
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    
    return response;
  };
} 
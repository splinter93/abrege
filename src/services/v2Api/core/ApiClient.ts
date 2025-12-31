/**
 * Client API de base pour V2UnifiedApi
 * Gère l'authentification, les URLs et la validation
 * Extrait de V2UnifiedApi pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';

export class ApiClient {
  private baseUrl: string;

  constructor() {
    // Construire l'URL de base pour les appels fetch
    if (typeof window !== 'undefined') {
      this.baseUrl = window.location.origin;
    } else {
      if (process.env.VERCEL_URL) {
        this.baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        this.baseUrl = 'http://localhost:3000';
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[ApiClient] Base URL configurée: ${this.baseUrl}`);
    }
  }

  /**
   * Construire l'URL complète pour les appels API
   */
  buildUrl(path: string): string {
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    const fullUrl = `${this.baseUrl}/${cleanPath}`;
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[ApiClient] buildUrl: ${path} -> ${fullUrl}`);
    }
    
    return fullUrl;
  }

  /**
   * Nettoyer et valider un ID ou slug
   */
  cleanAndValidateId(id: string, type: 'note' | 'folder' | 'classeur'): string {
    const cleanId = id.replace(/‑/g, '-');
    
    if (!this.isUUID(cleanId)) {
      throw new Error(`ID de ${type} invalide: ${id}`);
    }
    
    return cleanId;
  }

  /**
   * Vérifie si un ID est un UUID valide
   */
  isUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  /**
   * Récupérer les headers d'authentification
   */
  async getAuthHeaders(): Promise<HeadersInit> {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[ApiClient] Début récupération headers...`);
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuration Supabase manquante');
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[ApiClient] Aucune session active, utilisation headers de base`);
        }
        return {
          'Content-Type': 'application/json',
          'X-Client-Type': 'v2_unified_api'
        };
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Client-Type': 'v2_unified_api'
      };

      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[ApiClient] Headers récupérés avec succès`);
      }

      return headers;

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.error(`[ApiClient] Erreur récupération headers`, error);
      }
      
      return {
        'Content-Type': 'application/json',
        'X-Client-Type': 'v2_unified_api'
      };
    }
  }
}


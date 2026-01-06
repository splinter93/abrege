/**
 * Helper pour la génération et validation de slugs d'agents
 * Extrait de AgentCRUDService pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Configuration Supabase manquante: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Helper pour la génération et validation de slugs
 */
export class SlugHelper {
  /**
   * Génère un slug pour un agent avec vérification d'unicité globale
   */
  static async generateAgentSlug(displayName: string, excludeId?: string): Promise<string> {
    const baseSlug = SlugHelper.slugify(displayName);
    let candidateSlug = baseSlug;
    let counter = 1;
    
    while (!(await SlugHelper.checkSlugUniqueness(candidateSlug, excludeId))) {
      counter++;
      candidateSlug = `${baseSlug}-${counter}`;
    }
    
    return candidateSlug;
  }

  /**
   * Vérifie l'unicité d'un slug d'agent (globale, pas par utilisateur)
   */
  static async checkSlugUniqueness(slug: string, excludeId?: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('agents')
      .select('id')
      .eq('slug', slug);

    if (error || !data) return false;
    
    if (excludeId) {
      // Exclure l'ID de l'agent actuel de la vérification d'unicité
      return !data.some(agent => agent.id !== excludeId);
    }
    
    return data.length === 0;
  }

  /**
   * Convertit un texte en slug (format agents)
   */
  static slugify(text: string): string {
    if (!text || typeof text !== 'string') {
      return 'untitled';
    }
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50); // Plus court pour les agents
  }
}


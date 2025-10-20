/**
 * Types pour le contexte LLM unifié
 * Architecture propre : 1 seule interface pour tout le contexte
 */

/**
 * Contexte LLM complet et optimisé
 * Budget cible : 80-150 tokens max
 */
export interface LLMContext {
  // === SESSION (requis) ===
  sessionId: string;
  agentId?: string;
  
  // === TEMPOREL (15 tokens) ===
  time: {
    local: string;        // "Lun 20 oct, 23h15"
    timezone: string;     // "Europe/Paris"
    timestamp: string;    // ISO 8601 pour les calculs
  };
  
  // === UTILISATEUR (10 tokens) ===
  user: {
    name: string;         // "John Doe"
    locale: 'fr' | 'en';  // Langue préférée
    email?: string;       // Optionnel, pour logs
  };
  
  // === PAGE/CONTEXTE APP (20-30 tokens) ===
  page: {
    type: 'chat' | 'editor' | 'folder' | 'classeur' | 'home' | 'unknown';
    path: string;         // URL pathname
    action?: 'editing' | 'reading' | 'browsing';
  };
  
  // === DEVICE (5 tokens) ===
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    platform?: string;    // "macOS", "Windows", "iOS", etc.
  };
  
  // === CONTEXTE ACTIF (20-40 tokens si présent) ===
  active?: {
    note?: {
      id: string;
      slug: string;
      title: string;
      wordCount?: number;
    };
    folder?: {
      id: string;
      name: string;
    };
    classeur?: {
      id: string;
      name: string;
    };
  };
  
  // === HISTORIQUE RÉCENT (30-50 tokens, opt-in) ===
  recent?: {
    notes: Array<{
      slug: string;
      title: string;
    }>;              // Max 3 notes
    lastAction?: {
      type: string;       // "edited_note", "searched", "created_note"
      target?: string;    // Titre ou slug
      timestamp: string;  // ISO 8601
    };
  };
}

/**
 * Options pour la génération du contexte
 */
export interface LLMContextOptions {
  includeRecent?: boolean;      // Inclure l'historique récent (défaut: false)
  maxRecentNotes?: number;      // Nombre max de notes récentes (défaut: 3)
  includeDevice?: boolean;      // Inclure les infos device (défaut: true)
  compactFormat?: boolean;      // Format ultra-compact (défaut: true)
}

/**
 * Résultat de la génération du contexte pour injection
 */
export interface LLMContextInjection {
  contextSection: string;       // Section markdown à injecter
  tokenEstimate: number;        // Estimation du nombre de tokens
  metadata: {
    hasTime: boolean;
    hasUser: boolean;
    hasPage: boolean;
    hasDevice: boolean;
    hasActive: boolean;
    hasRecent: boolean;
  };
}


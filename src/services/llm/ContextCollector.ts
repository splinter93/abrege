/**
 * ContextCollector - Service de collecte du contexte de l'interface utilisateur
 * ✅ SIMPLIFIÉ : Collecte synchrone et fiable
 */

import { simpleLogger as logger } from '@/utils/logger';

export interface UIContext {
  user: {
    name: string;
    username?: string;
    email?: string;
  };
  page: {
    type: 'editor' | 'folder' | 'classeur' | 'chat' | 'home' | 'unknown';
    name: string;
    path: string;
  };
  activeNote?: {
    id: string;
    slug: string;
    name: string;
  };
  activeClasseur?: {
    id: string;
    name: string;
  };
  activeFolder?: {
    id: string;
    name: string;
  };
  attachedNotes?: Array<{
    id: string;
    slug: string;
    title: string;
    markdown_content: string;
    description?: string;
    word_count?: number;
  }>;
}

export interface ContextInjectionResult {
  contextSection: string;
  hasUser: boolean;
  hasPage: boolean;
  hasActiveNote: boolean;
  hasActiveClasseur: boolean;
  hasActiveFolder: boolean;
}

/**
 * Service de collecte du contexte de l'interface utilisateur
 * ✅ SIMPLIFIÉ : Plus de singleton, méthodes synchrones
 */
export class ContextCollector {
  /**
   * Collecte le contexte de manière synchrone et fiable
   * ✅ CORRECTION : Méthode synchrone, plus d'async inutile
   */
  collectUIContext(
    user: { id: string; email?: string; username?: string; name?: string } | null,
    pathname: string,
    additionalData?: {
      activeNote?: { id: string; slug: string; name: string };
      activeClasseur?: { id: string; name: string };
      activeFolder?: { id: string; name: string };
    }
  ): UIContext {
    const context: UIContext = {
      user: {
        name: user?.name || user?.username || 'Utilisateur',
        username: user?.username,
        email: user?.email
      },
      page: this.detectPageType(pathname),
      ...additionalData
    };

    // ✅ SIMPLIFIÉ : Logs réduits, seulement en dev
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[ContextCollector] 🌍 Contexte collecté:`, {
        user: context.user.name,
        page: context.page.type,
        hasActiveNote: !!context.activeNote,
        hasActiveClasseur: !!context.activeClasseur,
        hasActiveFolder: !!context.activeFolder
      });
    }

    return context;
  }

  /**
   * Génère la section de contexte pour injection dans l'agent
   * ✅ SIMPLIFIÉ : Plus de vérifications inutiles, génération directe
   */
  generateContextSection(context: UIContext): ContextInjectionResult {
    const sections: string[] = [];
    let hasUser = false;
    let hasPage = false;
    let hasActiveNote = false;
    let hasActiveClasseur = false;
    let hasActiveFolder = false;

    // En-tête de la section
    sections.push('## Contexte');

    // Informations utilisateur
    if (context.user.name) {
      sections.push(`- Utilisateur: ${context.user.name}`);
      hasUser = true;
    }

    // Page active
    if (context.page.type !== 'unknown') {
      sections.push(`- Page: ${context.page.name}`);
      hasPage = true;
    }

    // Note active (si dans l'éditeur)
    if (context.activeNote) {
      sections.push(`- Note active: ${context.activeNote.name} (ID: ${context.activeNote.id}, Slug: ${context.activeNote.slug})`);
      hasActiveNote = true;
    }

    // Classeur actif
    if (context.activeClasseur) {
      sections.push(`- Classeur actif: ${context.activeClasseur.name} (ID: ${context.activeClasseur.id})`);
      hasActiveClasseur = true;
    }

    // Dossier actif
    if (context.activeFolder) {
      sections.push(`- Dossier actif: ${context.activeFolder.name} (ID: ${context.activeFolder.id})`);
      hasActiveFolder = true;
    }

    const contextSection = sections.join('\n');

    // ✅ SIMPLIFIÉ : Logs réduits
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[ContextCollector] 📝 Section de contexte générée:`, {
        hasUser,
        hasPage,
        hasActiveNote,
        hasActiveClasseur,
        hasActiveFolder,
        length: contextSection.length
      });
    }

    return {
      contextSection,
      hasUser,
      hasPage,
      hasActiveNote,
      hasActiveClasseur,
      hasActiveFolder
    };
  }

  /**
   * Détecte le type de page basé sur l'URL
   */
  detectPageType(pathname: string): { type: UIContext['page']['type']; name: string; path: string } {
    if (pathname.startsWith('/private/note/')) {
      return {
        type: 'editor',
        name: 'Éditeur de note',
        path: pathname
      };
    }

    if (pathname.startsWith('/private/dossier/')) {
      return {
        type: 'folder',
        name: 'Gestionnaire de dossiers',
        path: pathname
      };
    }

    if (pathname.startsWith('/private/classeur/')) {
      return {
        type: 'classeur',
        name: 'Gestionnaire de classeurs',
        path: pathname
      };
    }

    if (pathname.startsWith('/chat')) {
      return {
        type: 'chat',
        name: 'Assistant de chat',
        path: pathname
      };
    }

    if (pathname === '/private' || pathname === '/') {
      return {
        type: 'home',
        name: 'Page d\'accueil',
        path: pathname
      };
    }

    return {
      type: 'unknown',
      name: 'Page inconnue',
      path: pathname
    };
  }

  /**
   * Collecte le contexte depuis les paramètres de l'URL (pour les pages dynamiques)
   * ✅ SIMPLIFIÉ : Méthode synchrone
   */
  collectFromURLParams(
    user: { id: string; email?: string; username?: string; name?: string } | null,
    pathname: string,
    params?: { [key: string]: string | string[] | undefined }
  ): UIContext {
    const additionalData: Partial<UIContext> = {};

    // Détecter les paramètres d'URL pour enrichir le contexte
    if (pathname.startsWith('/private/note/') && params?.noteId) {
      // Note active depuis l'URL
      additionalData.activeNote = {
        id: params.noteId as string,
        slug: params.slug as string || params.noteId as string,
        name: params.noteName as string || `Note ${params.noteId}`
      };
    }

    if (pathname.startsWith('/private/dossier/') && params?.folderId) {
      // Dossier actif depuis l'URL
      additionalData.activeFolder = {
        id: params.folderId as string,
        name: params.folderName as string || `Dossier ${params.folderId}`
      };
    }

    if (pathname.startsWith('/private/classeur/') && params?.classeurId) {
      // Classeur actif depuis l'URL
      additionalData.activeClasseur = {
        id: params.classeurId as string,
        name: params.classeurName as string || `Classeur ${params.classeurId}`
      };
    }

    return this.collectUIContext(user, pathname, additionalData);
  }
}

// ✅ SIMPLIFIÉ : Instance directe, plus de singleton
export const contextCollector = new ContextCollector();

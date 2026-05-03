/**
 * Hook unifié pour générer le contexte LLM complet
 * Architecture propre : remplace useAppContext + useUIContext
 */

'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './useAuth';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useMediaQuery } from './useMediaQuery';
import type { LLMContext, LLMContextOptions, LLMContextInjection } from '@/types/llmContext';

/**
 * Hook principal : génère le contexte LLM complet
 */
export function useLLMContext(options: LLMContextOptions = {}): LLMContext {
  const { user } = useAuth();
  const pathname = usePathname() || '/';
  const { lang } = useLanguageContext();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

  const {
    includeRecent = false,
    includeDevice = true,
  } = options;

  return useMemo(() => {
    // === TEMPOREL ===
    const now = new Date();
    const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const dayName = daysOfWeek[now.getDay()];
    const day = now.getDate();
    const month = now.toLocaleDateString('fr-FR', { month: 'short' });
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const cityName = timezone.split('/')[1]?.replace('_', ' ') || timezone;

    // === DEVICE ===
    const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : undefined;

    // === PAGE ===
    const pageInfo = detectPageType(pathname);

    // === CONTEXTE DE BASE ===
    const context: LLMContext = {
      sessionId: 'current', // Sera remplacé par la vraie sessionId
      time: {
        local: `${dayName} ${day} ${month} ${year}, ${hours}h${minutes}`,
        timezone: cityName,
        timestamp: now.toISOString()
      },
      user: {
        name:
          user?.username
          || (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined)
          || (typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined)
          || user?.email?.split('@')[0]
          || 'Utilisateur',
        locale: lang,
        email: user?.email
      },
      page: pageInfo,
      device: includeDevice ? {
        type: deviceType,
        platform
      } : {
        type: deviceType
      }
    };

    // === HISTORIQUE RÉCENT (opt-in) ===
    if (includeRecent) {
      // TODO: Implémenter la récupération des notes récentes
      // Pour l'instant, on laisse vide
      context.recent = {
        notes: [],
      };
    }

    return context;
  }, [user, pathname, lang, isMobile, isTablet, includeRecent, includeDevice]);
}

/**
 * Hook pour générer la section d'injection formatée
 */
export function useLLMContextInjection(
  context: LLMContext,
  options: LLMContextOptions = {}
): LLMContextInjection {
  const { compactFormat = true } = options;

  return useMemo(() => {
    const sections: string[] = [];
    let tokenEstimate = 0;

    if (compactFormat) {
      // === FORMAT ULTRA-COMPACT ===
      // Ligne 1 : Temporel + Device + Locale
      const line1 = `📅 ${context.time.local} (${context.time.timezone}) | 💻 ${context.device.type} | 🇫🇷 ${context.user.locale.toUpperCase()}`;
      sections.push(line1);
      tokenEstimate += 15; // ~15 tokens

      // Ligne 2 : Page
      const pageEmoji = getPageEmoji(context.page.type);
      const line2 = `${pageEmoji} ${context.page.type}${context.page.action ? ` (${context.page.action})` : ''}`;
      sections.push(line2);
      tokenEstimate += 10; // ~10 tokens

      // Ligne 3 : Contexte actif (si présent)
      if (context.active?.note) {
        sections.push(`📝 Note: ${context.active.note.title}`);
        tokenEstimate += 10;
      }
      if (context.active?.folder) {
        sections.push(`📁 Dossier: ${context.active.folder.name}`);
        tokenEstimate += 8;
      }
      if (context.active?.classeur) {
        sections.push(`📚 Classeur: ${context.active.classeur.name}`);
        tokenEstimate += 8;
      }

      // Ligne 4 : Historique récent (si présent)
      if (context.recent?.notes && context.recent.notes.length > 0) {
        const noteTitles = context.recent.notes.map(n => n.title).join(', ');
        sections.push(`📖 Recent: ${noteTitles}`);
        tokenEstimate += 15 + (context.recent.notes.length * 5);
      }

    } else {
      // === FORMAT STANDARD (markdown) ===
      sections.push('## Context');
      
      sections.push(`- Time: ${context.time.local} (${context.time.timezone})`);
      sections.push(`- User: ${context.user.name}`);
      sections.push(`- Page: ${context.page.type}`);
      sections.push(`- Device: ${context.device.type}`);
      sections.push(`- Language: ${context.user.locale}`);
      
      tokenEstimate += 40;

      if (context.active?.note) {
        sections.push(`- Active Note: ${context.active.note.title} (${context.active.note.slug})`);
        tokenEstimate += 15;
      }

      if (context.recent?.notes && context.recent.notes.length > 0) {
        const noteTitles = context.recent.notes.map(n => n.title).join(', ');
        sections.push(`- Recent Notes: ${noteTitles}`);
        tokenEstimate += 15 + (context.recent.notes.length * 5);
      }
    }

    const contextSection = sections.join('\n');

    return {
      contextSection,
      tokenEstimate,
      metadata: {
        hasTime: true,
        hasUser: !!context.user.name,
        hasPage: context.page.type !== 'unknown',
        hasDevice: !!context.device.type,
        hasActive: !!(context.active?.note || context.active?.folder || context.active?.classeur),
        hasRecent: !!(context.recent?.notes && context.recent.notes.length > 0)
      }
    };
  }, [context, compactFormat]);
}

/**
 * Détecte le type de page depuis le pathname
 */
function detectPageType(pathname: string): LLMContext['page'] {
  if (pathname.startsWith('/private/note/') || pathname.startsWith('/editor/')) {
    return {
      type: 'editor',
      path: pathname,
      action: 'editing'
    };
  }

  if (pathname.startsWith('/note/') || pathname.startsWith('/summary/')) {
    return {
      type: 'editor',
      path: pathname,
      action: 'reading'
    };
  }

  if (pathname.startsWith('/private/dossier/') || pathname.startsWith('/dossier/')) {
    return {
      type: 'folder',
      path: pathname,
      action: 'browsing'
    };
  }

  if (pathname.startsWith('/private/classeur/') || pathname.startsWith('/classeur/')) {
    return {
      type: 'classeur',
      path: pathname,
      action: 'browsing'
    };
  }

  if (pathname.startsWith('/chat')) {
    return {
      type: 'chat',
      path: pathname
    };
  }

  if (pathname === '/private' || pathname === '/') {
    return {
      type: 'home',
      path: pathname,
      action: 'browsing'
    };
  }

  return {
    type: 'unknown',
    path: pathname
  };
}

/**
 * Obtient l'emoji pour le type de page
 */
function getPageEmoji(pageType: LLMContext['page']['type']): string {
  const emojiMap: Record<typeof pageType, string> = {
    chat: '💬',
    editor: '✍️',
    folder: '📁',
    classeur: '📚',
    home: '🏠',
    unknown: '❓'
  };
  return emojiMap[pageType] || '❓';
}

/**
 * Hook helper : génère directement le contexte formaté pour injection
 */
export function useLLMContextFormatted(options: LLMContextOptions = {}): string {
  const context = useLLMContext(options);
  const { contextSection } = useLLMContextInjection(context, options);
  return contextSection;
}


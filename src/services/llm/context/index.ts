/**
 * Point d'entrée centralisé pour le système d'injection de contexte
 * Initialise le ContextInjectionService et enregistre tous les providers
 */

import { contextInjectionService } from './ContextInjectionService';
import {
  UIContextProvider,
  UserStatsContextProvider,
  SessionContextProvider,
  CanvaContextProvider,
  AttachedNotesContextProvider,
  MentionedNotesContextProvider
} from './providers';

// Enregistrer tous les providers au démarrage
contextInjectionService.registerSystemProvider(new UIContextProvider());
contextInjectionService.registerSystemProvider(new UserStatsContextProvider());
contextInjectionService.registerSystemProvider(new SessionContextProvider());
contextInjectionService.registerSystemProvider(new CanvaContextProvider());
contextInjectionService.registerMessageProvider(new AttachedNotesContextProvider());
contextInjectionService.registerMessageProvider(new MentionedNotesContextProvider());

export { contextInjectionService } from './ContextInjectionService';
export * from './types';
export * from './providers';


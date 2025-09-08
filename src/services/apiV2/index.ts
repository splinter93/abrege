/**
 * Point d'entrée principal pour l'API V2 refactorisée
 * Architecture modulaire, TypeScript strict, production-ready
 */

// Export des types
export * from './types/ApiV2Types';

// Export du core
export { toolRegistry } from './core/ToolRegistry';
export { apiV2Orchestrator } from './core/ApiV2Orchestrator';
export { BaseHandlerImpl } from './core/BaseHandler';

// Export des handlers
export { NotesHandler } from './handlers/NotesHandler';
export { FoldersHandler } from './handlers/FoldersHandler';
export { ClasseursHandler } from './handlers/ClasseursHandler';
export { AgentsHandler } from './handlers/AgentsHandler';
export { SearchHandler } from './handlers/SearchHandler';
export { UtilsHandler } from './handlers/UtilsHandler';

// Export de l'instance principale pour la compatibilité
export { apiV2Orchestrator as agentApiV2Tools } from './core/ApiV2Orchestrator';

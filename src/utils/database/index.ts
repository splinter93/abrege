/**
 * Point d'entrée unifié pour les modules de base de données refactorés
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - Exports organisés par domaine
 */

// Types
export type {
  ApiContext,
  CreateNoteData,
  UpdateNoteData,
  CreateFolderData,
  UpdateFolderData,
  CreateClasseurData,
  UpdateClasseurData,
  ShareSettings,
  AgentData,
  ContentOperation
} from './types/databaseTypes';

// Queries - Notes
export * from './queries/noteQueries';

// Queries - Classeurs
export * from './queries/classeurQueries';

// Queries - Dossiers
export * from './queries/dossierQueries';

// Queries - Agents
export * from './queries/agentQueries';

// Queries - Users
export * from './queries/userQueries';

// Queries - Trash
export * from './queries/trashQueries';

// Queries - Search
export * from './search/searchQueries';

// Queries - Utils
export * from './queries/utilsQueries';

// Mutations - Notes
export * from './mutations/noteMutations';
export * from './mutations/noteContentMutations';
export * from './mutations/noteSectionMutations';

// Mutations - Classeurs
export * from './mutations/classeurMutations';

// Mutations - Dossiers
export * from './mutations/dossierMutations';

// Mutations - Agents
export * from './mutations/agentMutations';

// Mutations - Trash
export * from './mutations/trashMutations';

// Permissions
export * from './permissions/permissionQueries';

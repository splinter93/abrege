/**
 * Index unifié pour tous les modules database
 * Exporte toutes les fonctions refactorées depuis V2DatabaseUtils
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - Exports unifiés pour faciliter migration
 */

// Notes
export * from './queries/noteQueries';
export * from './mutations/noteMutations';

// Classeurs
export * from './queries/classeurQueries';
export * from './mutations/classeurMutations';

// Dossiers
export * from './queries/dossierQueries';
export * from './mutations/dossierMutations';

// Permissions
export * from './permissions/permissionQueries';

// Recherche
export * from './search/searchQueries';




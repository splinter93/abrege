import { ResourceResolver } from '@/utils/resourceResolver';
import type { ResourceType } from '@/utils/slugGenerator';

export async function resolveNoteRef(ref: string, userId: string, userToken?: string): Promise<string> {
  const noteId = await ResourceResolver.resolveRef(ref, 'note', userId, userToken);
  if (!noteId) throw new Error('Note non trouvée');
  return noteId;
}

export async function resolveFolderRef(ref: string, userId: string, userToken?: string): Promise<string> {
  const folderId = await ResourceResolver.resolveRef(ref, 'folder', userId, userToken);
  if (!folderId) throw new Error('Dossier non trouvé');
  return folderId;
}

export async function resolveClasseurRef(ref: string, userId: string, userToken?: string): Promise<string> {
  const classeurId = await ResourceResolver.resolveRef(ref, 'classeur', userId, userToken);
  if (!classeurId) throw new Error('Classeur non trouvé');
  return classeurId;
}

export async function resolveResourceRef(
  ref: string, 
  type: ResourceType, 
  userId: string,
  userToken?: string
): Promise<string> {
  const resourceId = await ResourceResolver.resolveRef(ref, type, userId, userToken);
  if (!resourceId) {
    const typeNames = {
      'note': 'Note',
      'folder': 'Dossier', 
      'classeur': 'Classeur'
    };
    throw new Error(`${typeNames[type]} non trouvé`);
  }
  return resourceId;
} 
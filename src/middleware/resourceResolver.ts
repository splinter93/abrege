import { ResourceResolver } from '@/utils/resourceResolver';
import type { ResourceType } from '@/utils/slugGenerator';

export async function resolveNoteRef(ref: string, userId: string): Promise<string> {
  const noteId = await ResourceResolver.resolveRef(ref, 'note', userId);
  if (!noteId) throw new Error('Note non trouvée');
  return noteId;
}

export async function resolveFolderRef(ref: string, userId: string): Promise<string> {
  const folderId = await ResourceResolver.resolveRef(ref, 'folder', userId);
  if (!folderId) throw new Error('Dossier non trouvé');
  return folderId;
}

export async function resolveClasseurRef(ref: string, userId: string): Promise<string> {
  const classeurId = await ResourceResolver.resolveRef(ref, 'classeur', userId);
  if (!classeurId) throw new Error('Classeur non trouvé');
  return classeurId;
}

export async function resolveResourceRef(
  ref: string, 
  type: ResourceType, 
  userId: string
): Promise<string> {
  const resourceId = await ResourceResolver.resolveRef(ref, type, userId);
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
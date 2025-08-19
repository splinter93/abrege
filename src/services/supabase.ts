import type { SafeUnknown, SafeRecord, SafeError } from '@/types/quality';
import { supabase } from '../supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

// --- Classeur Operations ---
export const getClasseurs = async (): Promise<any[]> => {
  const { data: selectData, error } = await supabase
    .from('classeurs')
    .select('*')
    .order('position');
  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
  if (error) throw error;
  return selectData;
};

export const createClasseur = async (classeurData: unknown): Promise<unknown> => {
  const user = await supabase.auth.getUser();
  if (!user.data?.user) throw new Error('User not authenticated');

  const { data: insertData, error } = await supabase
    .from('classeurs')
    .insert(classeurData)
    .select()
    .single();
    
  if (error) throw error;
  return insertData;
};

export const updateClasseur = async (classeurId: string, updates: unknown): Promise<unknown> => {
  const { data: updateData, error } = await supabase
    .from('classeurs')
    .update(updates)
    .eq('id', classeurId)
    .select()
    .single();

  if (error) throw error;
  return updateData;
};

export const deleteClasseur = async (classeurId: string): Promise<unknown> => {
  const { error } = await supabase
    .from('classeurs')
    .delete()
    .eq('id', classeurId);

  if (error) throw error;
  return true;
};

// Folders Operations
export const createFolder = async (data: unknown): Promise<unknown> => {
  const user = await supabase.auth.getUser();
  if (!user.data?.user) throw new Error('User not authenticated');
  if (!data.classeurId) throw new Error('Classeur ID is required');

  const { data: insertData, error } = await supabase
    .from('folders')
    .insert({
      name: data.name,
      parent_id: data.parentId,
      classeur_id: data.classeurId
    })
    .select()
    .single();

  if (error) throw error;
  return insertData;
};

export const updateFolder = async (folderId: string, updates: unknown): Promise<unknown> => {
  // Filtrer les champs pour ne garder que ceux qui existent dans la table folders
  // Champs valides : id, user_id, name, parent_id, created_at, position, classeur_id, slug
  const validFields = ['name', 'parent_id', 'position', 'classeur_id', 'slug'];
  const filteredUpdates = Object.keys(updates).reduce((acc: unknown, key) => {
    if (validFields.includes(key)) {
      acc[key] = updates[key];
    }
  }, {});

  const { data: updateData, error } = await supabase
    .from('folders')
    .update(filteredUpdates)
    .eq('id', folderId)
    .select()
    .single();

  if (error) throw error;
  return updateData;
};

export const deleteFolder = async (folderId: string): Promise<unknown> => {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId);

  if (error) throw error;
  return true;
};

export const getFolders = async (classeurId: string, parentId?: string): Promise<any[]> => {
  if (!classeurId) throw new Error('Classeur ID is required to get folders');
  let query = supabase
    .from('folders')
    .select('*')
    .eq('classeur_id', classeurId);
  if (parentId) query = query.eq('parent_id', parentId);
  else query = query.is('parent_id', null);
  query = query.order('position');
  const { data: selectData, error } = await query;
  if (error) throw error;
  return selectData;
};

export const getFolderById = async (folderId: string): Promise<unknown> => {
  if (!folderId) return null;

  const { data: selectData, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', folderId)
    .single();

  if (error) throw error;
  return selectData;
};

// Articles Operations
export const createArticle = async (data: unknown): Promise<unknown> => {
  const { data: userResponse } = await supabase.auth.getUser();
  const user = userResponse.user;

  if (!user) {
    logger.error('User not authenticated');
    throw new Error('User not authenticated');
  }

  // Convert camelCase keys from articleData to snake_case for the database
  const dbData = Object.entries(data).reduce((acc: { [key: string]: unknown }, [key, value]) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = value;
    return acc;
  }, {});

  const dataToInsert = {
    ...dbData,
    user_id: user.id,
  };

  const { data: insertData, error } = await supabase
    .from('articles')
    .insert([dataToInsert])
    .select()
    .single();

  if (error) {
    logger.error('Error creating article:', error.message);
    throw error;
  }
  return insertData;
};

export const updateArticle = async (id: string, updates: unknown): Promise<unknown> => {
  // Convert camelCase to snake_case for database columns
  const dbUpdates = Object.entries(updates).reduce((acc: { [key: string]: unknown }, [key, value]) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = value;
    return acc;
  }, {});

  const { data: updateData, error } = await supabase
    .from('articles')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updateData;
};

export const deleteArticle = async (articleId: string): Promise<unknown> => {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', articleId);

  if (error) throw error;
  return true;
};

export const getArticles = async (classeurId: string, folderId?: string): Promise<any[]> => {
  if (!classeurId) throw new Error('Classeur ID is required to get articles');
  let query = supabase
    .from('articles')
    .select('*')
    .eq('classeur_id', classeurId);
  if (folderId) query = query.eq('folder_id', folderId);
  else query = query.is('folder_id', null);
  query = query.order('position');
  const { data: selectData, error } = await query;
  if (error) throw error;
  return selectData;
};

export const getArticleById = async (articleId: string): Promise<unknown> => {
  if (!articleId) throw new Error('Article ID is required');

  const { data: selectData, error } = await supabase
    .from('articles')
    .select('*, public_url')
    .eq('id', articleId)
    .single();

  if (error) throw error;
  return selectData;
};

export const updateItemPositions = async (items: unknown[]): Promise<unknown> => {
  // Use a transaction to update all positions at once
  const { error } = await supabase.rpc('bulk_update_item_positions', {
    items: items.map(item => ({
      item_id: item.id,
      item_type: item.type,
      new_position: item.position,
    }))
  });

  if (error) throw error;
  return true;
};

// Drag & Drop Operations
export const moveItem = async (id: string, newParentId: string): Promise<unknown> => {
  if (!id) throw new Error('Item ID is required for moving items.');

  logger.dev('moveItem: Calling Supabase RPC with:', { p_item_id: id, p_target_folder_id: newParentId });
  
  const { data, error } = await supabase.rpc('move_item', {
    p_item_id: id,
    p_target_folder_id: newParentId,
  });

  if (error) {
    logger.error("Error from move_item RPC:", error);
    throw error;
  }

  logger.dev('moveItem: Success, response:', data);
  return true;
};

export const renameItem = async (id: string, type: 'folder' | 'file', newName: string): Promise<unknown> => {
  const tableName = type === 'folder' ? 'folders' : 'articles';
  const nameColumn = type === 'folder' ? 'name' : 'source_title';

  const { data, error } = await supabase
    .from(tableName)
    .update({ [nameColumn]: newName })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`${type === 'folder' ? 'Folder' : 'Article'} with ID ${id} not found`);
  }
  return data[0];
};

export const updateClasseurPositions = async (classeurs: unknown[]): Promise<unknown> => {
  const { error } = await supabase.rpc('update_classeur_positions', {
    items: classeurs.map(item => ({
      id: item.id,
      new_position: item.position,
    })),
  });

  if (error) throw error;
  return true;
};

/**
 * Déplace un dossier ou un fichier dans un autre dossier.
 * @param id ID de l'item à déplacer
 * @param newParentId ID du dossier cible (null pour racine)
 * @param type 'folder' ou 'file'
 */
export const moveItemUniversal = async (
  id: string,
  newParentId: string | null,
  type: 'folder' | 'file'
): Promise<unknown> => {
  logger.dev('[DND] moveItemUniversal', { id, newParentId, type });
  if (!id) throw new Error('Item ID is required for moving items.');
  if (!type) throw new Error('Type is required (folder/file)');

  if (type === 'folder') {
    // On met à jour parent_id dans la table folders (pas d'updated_at dans cette table)
    const { data, error } = await supabase
      .from('folders')
      .update({ parent_id: newParentId })
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(`Folder with ID ${id} not found`);
    }
    return data[0];
  } else {
    // On met à jour folder_id dans la table articles (avec updated_at)
    const { data, error } = await supabase
      .from('articles')
      .update({ 
        folder_id: newParentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(`Article with ID ${id} not found`);
    }
    return data[0];
  }
}; 

// --- Realtime Universal Subscription ---
/**
 * S'abonne à tous les changements (insert, update, delete) sur articles, folders, classeurs.
 * @param onEvent Callback appelé à chaque event (payload: { table, eventType, new, old })
 */
export function subscribeToAllChanges(onEvent: (payload: unknown) => void) {
  // Articles (notes)
  supabase.channel('articles-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, payload => {
      onEvent({ table: 'articles', eventType: payload.eventType, new: payload.new, old: payload.old });
    })
    // Folders (dossiers)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, payload => {
      onEvent({ table: 'folders', eventType: payload.eventType, new: payload.new, old: payload.old });
    })
    // Classeurs (notebooks)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'classeurs' }, payload => {
      onEvent({ table: 'classeurs', eventType: payload.eventType, new: payload.new, old: payload.old });
    })
    .subscribe();
} 
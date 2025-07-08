import { supabase } from '../supabaseClient';

// --- Classeur Operations ---
export const getClasseurs = async (): Promise<any[]> => {
  const { data: selectData, error } = await supabase
    .from('classeurs')
    .select('*')
    .order('position');
  console.log('getClasseurs result:', selectData, error);
  if (error) throw error;
  return selectData;
};

export const createClasseur = async (classeurData: any): Promise<any> => {
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

export const updateClasseur = async (classeurId: string, updates: any): Promise<any> => {
  const { data: updateData, error } = await supabase
    .from('classeurs')
    .update(updates)
    .eq('id', classeurId)
    .select()
    .single();

  if (error) throw error;
  return updateData;
};

export const deleteClasseur = async (classeurId: string): Promise<any> => {
  const { error } = await supabase
    .from('classeurs')
    .delete()
    .eq('id', classeurId);

  if (error) throw error;
  return true;
};

// Folders Operations
export const createFolder = async (data: any): Promise<any> => {
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

export const updateFolder = async (folderId: string, updates: any): Promise<any> => {
  const { data: updateData, error } = await supabase
    .from('folders')
    .update(updates)
    .eq('id', folderId)
    .select()
    .single();

  if (error) throw error;
  return updateData;
};

export const deleteFolder = async (folderId: string): Promise<any> => {
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

export const getFolderById = async (folderId: string): Promise<any> => {
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
export const createArticle = async (data: any): Promise<any> => {
  const { data: userResponse } = await supabase.auth.getUser();
  const user = userResponse.user;

  if (!user) {
    console.error('User not authenticated');
    throw new Error('User not authenticated');
  }

  // Convert camelCase keys from articleData to snake_case for the database
  const dbData = Object.entries(data).reduce((acc: { [key: string]: any }, [key, value]) => {
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
    console.error('Error creating article:', error.message);
    throw error;
  }
  return insertData;
};

export const updateArticle = async (id: string, updates: any): Promise<any> => {
  // Convert camelCase to snake_case for database columns
  const dbUpdates = Object.entries(updates).reduce((acc: { [key: string]: any }, [key, value]) => {
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

export const deleteArticle = async (articleId: string): Promise<any> => {
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

export const getArticleById = async (articleId: string): Promise<any> => {
  if (!articleId) throw new Error('Article ID is required');

  const { data: selectData, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (error) throw error;
  return selectData;
};

export const updateItemPositions = async (items: any[]): Promise<any> => {
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
export const moveItem = async (id: string, newParentId: string): Promise<any> => {
  if (!id) throw new Error('Item ID is required for moving items.');

  const { error } = await supabase.rpc('move_item', {
    p_item_id: id,
    p_target_folder_id: newParentId,
  });

  if (error) {
    console.error("Error from move_item RPC:", error);
    throw error;
  }
  return true;
};

export const renameItem = async (id: string, type: 'folder' | 'file', newName: string): Promise<any> => {
  const tableName = type === 'folder' ? 'folders' : 'articles';
  const nameColumn = type === 'folder' ? 'name' : 'source_title';

  const { data, error } = await supabase
    .from(tableName)
    .update({ [nameColumn]: newName })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateClasseurPositions = async (classeurs: any[]): Promise<any> => {
  const { error } = await supabase.rpc('update_classeur_positions', {
    items: classeurs.map(item => ({
      id: item.id,
      new_position: item.position,
    })),
  });

  if (error) throw error;
  return true;
}; 
import { createSupabaseClient } from '@/utils/supabaseClient';
import { logApi } from '@/utils/logger';
// import { SlugGenerator } from '@/utils/slugGenerator';
import { SlugAndUrlService } from '@/services/slugAndUrlService';

/**
 * Fonctions directes pour les API v2 (sans passer par HTTP)
 * Utilisées par les tool calls du LLM
 */

export interface CreateNoteParams {
  source_title: string;
  markdown_content?: string;
  notebook_id: string;
  folder_id?: string;
  header_image?: string;
}

export interface CreateFolderParams {
  name: string;
  notebook_id: string;
}

export async function createNoteDirect(params: CreateNoteParams, userId: string) {
  const context = {
    operation: 'v2_note_create_direct',
    component: 'API_V2_DIRECT',
    clientType: 'llm'
  };

  const startTime = Date.now();
  logApi('v2_note_create_direct', '🚀 Création note directe', context);

  const supabase = createSupabaseClient();

  // Résoudre le notebook_id (peut être un UUID ou un slug)
  let classeurId = params.notebook_id;
  
  // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
  if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    logApi('v2_note_create_direct', `🔍 Résolution du slug: ${classeurId}`, context);
    
    const { data: classeur, error: resolveError } = await supabase
      .from('classeurs')
      .select('id, name, slug, user_id')
      .eq('slug', classeurId)
      .eq('user_id', userId)
      .single();
    
    if (resolveError || !classeur) {
      logApi('v2_note_create_direct', `❌ Classeur non trouvé pour le slug: ${classeurId}`, context);
      throw new Error(`Classeur non trouvé: ${classeurId}`);
    }
    
    classeurId = classeur.id;
    logApi('v2_note_create_direct', `✅ Slug résolu: ${params.notebook_id} -> ${classeurId}`, context);
  }

  // Générer le slug et l'URL publique
  let slug: string;
  let publicUrl: string | null = null;
  try {
    const result = await SlugAndUrlService.generateSlugAndUpdateUrl(
      params.source_title,
      userId,
      undefined, // Pas de noteId pour la création
      supabase
    );
    slug = result.slug;
    publicUrl = result.publicUrl;
  } catch {
    // Fallback minimal en cas d'échec
    slug = `${params.source_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`.slice(0, 120);
    logApi('v2_note_create_direct', `⚠️ Fallback slug utilisé: ${slug}`, context);
  }

  // Créer la note avec timeout
  const createPromise = supabase
    .from('articles')
    .insert({
      source_title: params.source_title,
      markdown_content: params.markdown_content || '',
      html_content: params.markdown_content || '',
      header_image: params.header_image,
      folder_id: params.folder_id,
      classeur_id: classeurId,
      user_id: userId,
      slug,
      public_url: publicUrl
    })
    .select()
    .single();

  // Timeout de 10 secondes
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout création note')), 10000);
  });

  const result = await Promise.race([createPromise, timeoutPromise]) as { data: unknown; error: unknown };
  const { data: note, error: createError } = result;

  if (createError) {
    const duration = Date.now() - startTime;
    logApi('v2_note_create_direct', `❌ Erreur création note après ${duration}ms:`, createError, context);
    throw new Error(`Erreur création note: ${createError.message}`);
  }

  const duration = Date.now() - startTime;
  logApi('v2_note_create_direct', `✅ Note créée en ${duration}ms:`, note, context);
  return { success: true, data: note };
}

export async function createFolderDirect(params: CreateFolderParams, userId: string) {
  const context = {
    operation: 'v2_folder_create_direct',
    component: 'API_V2_DIRECT',
    clientType: 'llm'
  };

  logApi('v2_folder_create_direct', '🚀 Création dossier directe', context);

  const supabase = createSupabaseClient();

  // Résoudre le notebook_id
  let classeurId = params.notebook_id;
  
  if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const { data: classeur, error: resolveError } = await supabase
      .from('classeurs')
      .select('id, name, slug, user_id')
      .eq('slug', classeurId)
      .eq('user_id', userId)
      .single();
    
    if (resolveError || !classeur) {
      throw new Error(`Classeur non trouvé: ${classeurId}`);
    }
    
    classeurId = classeur.id;
  }

  // Créer le dossier
  const { data: folder, error: createError } = await supabase
    .from('folders')
    .insert({
      name: params.name,
      classeur_id: classeurId,
      user_id: userId
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Erreur création dossier: ${createError.message}`);
  }

  return { success: true, data: folder };
}

export async function getNotebooksDirect(userId: string) {
  const context = {
    operation: 'v2_notebooks_get_direct',
    component: 'API_V2_DIRECT',
    clientType: 'llm'
  };

  logApi('v2_notebooks_get_direct', '🚀 Récupération classeurs directe', context);

  const supabase = createSupabaseClient();

  const { data: classeurs, error } = await supabase
    .from('classeurs')
    .select('id, name, slug, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erreur récupération classeurs: ${error.message}`);
  }

  return { success: true, data: classeurs };
}

export async function getNotebookTreeDirect(notebookId: string, userId: string) {
  const context = {
    operation: 'v2_notebook_tree_get_direct',
    component: 'API_V2_DIRECT',
    clientType: 'llm'
  };

  logApi('v2_notebook_tree_get_direct', '🚀 Récupération arbre classeur directe', context);

  const supabase = createSupabaseClient();

  // Résoudre le notebook_id
  let classeurId = notebookId;
  
  if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const { data: classeur, error: resolveError } = await supabase
      .from('classeurs')
      .select('id, name, slug, user_id')
      .eq('slug', classeurId)
      .eq('user_id', userId)
      .single();
    
    if (resolveError || !classeur) {
      throw new Error(`Classeur non trouvé: ${classeurId}`);
    }
    
    classeurId = classeur.id;
  }

  // Récupérer l'arbre complet
  const { data: folders, error: foldersError } = await supabase
    .from('folders')
    .select('id, name, parent_id, created_at')
    .eq('classeur_id', classeurId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id, source_title, folder_id, created_at')
    .eq('classeur_id', classeurId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (foldersError || articlesError) {
    throw new Error(`Erreur récupération arbre: ${foldersError?.message || articlesError?.message}`);
  }

  return { 
    success: true, 
    data: {
      folders: folders || [],
      articles: articles || []
    }
  };
} 
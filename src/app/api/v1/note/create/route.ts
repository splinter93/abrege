import { z } from 'zod';
import { SlugGenerator } from '@/utils/slugGenerator';
import { getSupabaseClient } from '@/services/supabaseService';

const supabase = getSupabaseClient();

/**
 * POST /api/v1/note/create
 * Crée une nouvelle note avec génération automatique de slug
 * notebook_id est OBLIGATOIRE (slug ou ID supporté)
 * folder_id est optionnel (slug ou ID supporté)
 * Réponse : { note: { id, slug, source_title, markdown_content, ... } }
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    if (process.env.NODE_ENV === 'development') {
      console.log('[createNote] Payload reçu:', body);
    }
    const schema = z.object({
      source_title: z.string().min(1, 'source_title requis'),
      markdown_content: z.string().optional().default(''), // Permet les notes vides
      header_image: z.string().optional(),
      header_image_offset: z.number().min(0).max(100).optional(), // Accepte les décimales
      folder_id: z.string().optional(),
      notebook_id: z.string().min(1, 'notebook_id OBLIGATOIRE'), // ✅ OBLIGATOIRE
      classeur_id: z.string().optional(), // ✅ Rétrocompatibilité
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[createNote] Erreur de validation Zod:', parseResult.error.errors);
      }
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { source_title, markdown_content, header_image, header_image_offset, folder_id, notebook_id, classeur_id } = parseResult.data;
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    
    // Déterminer le notebook_id final (priorité à notebook_id, puis classeur_id)
    const finalNotebookId = notebook_id || classeur_id;
    if (process.env.NODE_ENV === 'development') {
      console.log('[createNote] notebook_id:', notebook_id, 'classeur_id:', classeur_id, 'finalNotebookId:', finalNotebookId, 'user_id:', USER_ID);
    }
    
    if (!finalNotebookId) {
      return new Response(
        JSON.stringify({ error: 'notebook_id OBLIGATOIRE - spécifiez un notebook pour créer une note' }), 
        { status: 400 }
      );
    }
    
    // Résolution slug → ID pour notebook_id
    let finalNotebookIdResolved = finalNotebookId;
    const isNotebookSlug = !finalNotebookId.includes('-') && finalNotebookId.length < 36;
    
    if (isNotebookSlug) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[createNote] Résolution slug notebook: ${finalNotebookId}`);
      }
      const { data: notebook, error: notebookError } = await supabase
        .from('classeurs')
        .select('id')
        .eq('slug', finalNotebookId)
        .eq('user_id', USER_ID)
        .single();
      
      if (notebookError || !notebook) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[createNote] Notebook slug non trouvé:`, notebookError);
        }
        return new Response(
          JSON.stringify({ error: `Notebook avec slug '${finalNotebookId}' non trouvé` }), 
          { status: 404 }
        );
      }
      
      finalNotebookIdResolved = notebook.id;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[createNote] Notebook résolu: ${finalNotebookId} → ${finalNotebookIdResolved}`);
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[createNote] finalNotebookIdResolved:', finalNotebookIdResolved);
    }
    
    // Résolution slug → ID pour folder_id
    let finalFolderId = folder_id;
    if (folder_id) {
      const isFolderSlug = !folder_id.includes('-') && folder_id.length < 36;
      
      if (isFolderSlug) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Résolution slug dossier: ${folder_id}`);
        }
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id, classeur_id')
          .eq('slug', folder_id)
          .eq('user_id', USER_ID)
          .single();
        
        if (folderError || !folder) {
          return new Response(
            JSON.stringify({ error: `Dossier avec slug '${folder_id}' non trouvé` }), 
            { status: 404 }
          );
        }
        
        // Validation croisée : le dossier doit être dans le même notebook
        if (folder.classeur_id !== finalNotebookIdResolved) {
          return new Response(
            JSON.stringify({ error: `Le dossier '${folder_id}' n'appartient pas au notebook spécifié` }), 
            { status: 400 }
          );
        }
        
        finalFolderId = folder.id;
        console.log(`✅ Dossier résolu: ${folder_id} → ${finalFolderId}`);
      }
    }
    
    // Générer le slug
    const slug = await SlugGenerator.generateSlug(source_title, 'note', USER_ID);
    
    // Créer la note
    const { data: note, error } = await supabase
      .from('articles')
      .insert({
        source_title: source_title,
        markdown_content: markdown_content || '',
        classeur_id: finalNotebookIdResolved,
        folder_id: finalFolderId,
        user_id: USER_ID,
        slug,
        header_image: header_image || null,
        header_image_offset: header_image_offset || 50,
        position: 0
      })
      .select()
      .single();
    
    if (error) {
      console.error('[createNote] Erreur création note:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    console.log('✅ Note créée avec classeur_id:', finalNotebookIdResolved);
    
    // 🚫 POLLING DÉCLENCHÉ PAR L'API CLIENT OPTIMISÉE
    // Plus besoin de déclencher le polling côté serveur
    
    return new Response(JSON.stringify({ note }), { status: 201 });
  } catch (err: any) {
    console.error('❌ Erreur générale:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 
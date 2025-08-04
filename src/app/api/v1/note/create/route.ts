import { z } from 'zod';
import { SlugGenerator } from '@/utils/slugGenerator';
import { getSupabaseClient } from '@/services/supabaseService';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/v1/note/create
 * Crée une nouvelle note avec génération automatique de slug
 * notebook_id est OBLIGATOIRE (slug ou ID supporté)
 * folder_id est optionnel (slug ou ID supporté)
 * Réponse : { note: { id, slug, source_title, markdown_content, ... } }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Vérifier l'authentification AVANT de traiter la requête
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.substring(7);
      
      // Créer un client Supabase avec le token d'authentification
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        }
      });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        logger.dev("[Note Create API] ❌ Token invalide ou expiré");
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
      logger.dev("[Note Create API] ✅ Utilisateur authentifié:", userId);
    } else {
      logger.dev("[Note Create API] ❌ Token d'authentification manquant");
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[createNote] Payload reçu:', body);
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
        logger.dev('[createNote] Erreur de validation Zod:', parseResult.error.errors);
      }
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { source_title, markdown_content, header_image, header_image_offset, folder_id, notebook_id, classeur_id } = parseResult.data;
    
    // Déterminer le notebook_id final (priorité à notebook_id, puis classeur_id)
    const finalNotebookId = notebook_id || classeur_id;
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[createNote] notebook_id:', notebook_id, 'classeur_id:', classeur_id, 'finalNotebookId:', finalNotebookId, 'user_id:', userId);
    }
    
    if (!finalNotebookId) {
      return new Response(
        JSON.stringify({ error: 'notebook_id OBLIGATOIRE - spécifiez un notebook pour créer une note' }), 
        { status: 400 }
      );
    }
    
    // Créer un client Supabase avec le token d'authentification pour les opérations DB
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });
    
    // Résolution slug → ID pour notebook_id
    let finalNotebookIdResolved = finalNotebookId;
    const isNotebookSlug = !finalNotebookId.includes('-') && finalNotebookId.length < 36;
    
    if (isNotebookSlug) {
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[createNote] Résolution slug notebook: ${finalNotebookId}`);
      }
      const { data: notebook, error: notebookError } = await supabase
        .from('classeurs')
        .select('id')
        .eq('slug', finalNotebookId)
        .eq('user_id', userId)
        .single();
      
      if (notebookError || !notebook) {
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[createNote] Notebook slug non trouvé:`, notebookError);
        }
        return new Response(
          JSON.stringify({ error: `Notebook avec slug '${finalNotebookId}' non trouvé` }), 
          { status: 404 }
        );
      }
      
      finalNotebookIdResolved = notebook.id;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[createNote] Notebook résolu: ${finalNotebookId} → ${finalNotebookIdResolved}`);
      }
    }
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[createNote] finalNotebookIdResolved:', finalNotebookIdResolved);
    }
    
    // Résolution slug → ID pour folder_id
    let finalFolderId = folder_id;
    if (folder_id) {
      const isFolderSlug = !folder_id.includes('-') && folder_id.length < 36;
      
      if (isFolderSlug) {
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`🔍 Résolution slug dossier: ${folder_id}`);
        }
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id, classeur_id')
          .eq('slug', folder_id)
          .eq('user_id', userId)
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
        logger.dev(`✅ Dossier résolu: ${folder_id} → ${finalFolderId}`);
      }
    }
    
    // Générer le slug
    const slug = await SlugGenerator.generateSlug(source_title, 'note', userId);
    
    // Créer la note avec le client authentifié
    const { data: note, error } = await supabase
      .from('articles')
      .insert({
        source_title: source_title,
        markdown_content: markdown_content || '',
        html_content: '', // Sera généré automatiquement
        header_image: header_image || null,
        header_image_offset: header_image_offset || 0,
        classeur_id: finalNotebookIdResolved,
        folder_id: finalFolderId || null,
        user_id: userId,
        slug,
        position: 0
      })
      .select()
      .single();
    
    if (error) {
      logger.error("[Note Create API] ❌ Erreur création note:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
    logger.dev("[Note Create API] ✅ Note créée:", note.id);
    
    return new Response(JSON.stringify({ note }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error("[Note Create API] ❌ Erreur:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
} 
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SlugGenerator } from '@/utils/slugGenerator';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/v1/folder/create
 * Crée un nouveau dossier avec génération automatique de slug
 * Réponse : { folder: { id, slug, name, ... } }
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
        console.log("[Folder Create API] ❌ Token invalide ou expiré");
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      userId = user.id;
      console.log("[Folder Create API] ✅ Utilisateur authentifié:", userId);
    } else {
      console.log("[Folder Create API] ❌ Token d'authentification manquant");
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const schema = z.object({
      name: z.string().min(1, 'name requis'),
      notebook_id: z.string().min(1, 'notebook_id requis'),
      classeur_id: z.string().optional(), // Rétrocompatibilité
      parent_id: z.string().nullable().optional(),
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { name, notebook_id, classeur_id, parent_id } = parseResult.data;
    
    // Déterminer le notebook_id final (priorité à notebook_id, puis classeur_id)
    const finalNotebookId = notebook_id || classeur_id;
    
    if (!finalNotebookId) {
      return new Response(
        JSON.stringify({ error: 'notebook_id requis - spécifiez un notebook pour créer un dossier' }), 
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
    
    // Générer le slug
    const slug = await SlugGenerator.generateSlug(name, 'folder', userId);
    
    // Résolution slug → ID pour notebook_id
    let finalNotebookIdResolved = finalNotebookId;
    const isNotebookSlug = !finalNotebookId.includes('-') && finalNotebookId.length < 36;
    
    if (isNotebookSlug) {
      console.log(`🔍 Résolution slug notebook: ${finalNotebookId}`);
      const { data: notebook, error: notebookError } = await supabase
        .from('classeurs')
        .select('id')
        .eq('slug', finalNotebookId)
        .eq('user_id', userId)
        .single();
      
      if (notebookError || !notebook) {
        return new Response(
          JSON.stringify({ error: `Notebook avec slug '${finalNotebookId}' non trouvé` }), 
          { status: 404 }
        );
      }
      
      finalNotebookIdResolved = notebook.id;
      console.log(`✅ Notebook résolu: ${finalNotebookId} → ${finalNotebookIdResolved}`);
    }
    
    // Créer le dossier avec le client authentifié
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        name,
        classeur_id: finalNotebookIdResolved,
        parent_id: parent_id || null,
        user_id: userId,
        slug,
        position: 0
      })
      .select()
      .single();
    
    if (error) {
      console.error("[Folder Create API] ❌ Erreur création dossier:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    console.log("[Folder Create API] ✅ Dossier créé:", folder.id);
    
    return new Response(JSON.stringify({ folder }), { status: 201 });
  } catch (err: any) {
    console.error("[Folder Create API] ❌ Erreur:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 
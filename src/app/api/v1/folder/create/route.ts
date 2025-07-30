import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SlugGenerator } from '@/utils/slugGenerator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * POST /api/v1/folder/create
 * Crée un nouveau dossier avec génération automatique de slug
 * Réponse : { folder: { id, slug, name, ... } }
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
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
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    
    // Générer le slug
    const slug = await SlugGenerator.generateSlug(name, 'folder', USER_ID);
    
    // Résolution slug → ID pour notebook_id
    let finalNotebookIdResolved = finalNotebookId;
    const isNotebookSlug = !finalNotebookId.includes('-') && finalNotebookId.length < 36;
    
    if (isNotebookSlug) {
      console.log(`🔍 Résolution slug notebook: ${finalNotebookId}`);
      const { data: notebook, error: notebookError } = await supabase
        .from('classeurs')
        .select('id')
        .eq('slug', finalNotebookId)
        .eq('user_id', USER_ID)
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
    
    // Créer le dossier
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        name,
        classeur_id: finalNotebookIdResolved,
        parent_id: parent_id || null,
        user_id: USER_ID,
        slug,
        position: 0
      })
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    // 🚫 POLLING DÉCLENCHÉ PAR L'API CLIENT OPTIMISÉE
    // Plus besoin de déclencher le polling côté serveur
    
    return new Response(JSON.stringify({ folder }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 
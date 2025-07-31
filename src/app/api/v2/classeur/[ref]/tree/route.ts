import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { treeResponseV2Schema } from '@/utils/v2ValidationSchemas';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  const startTime = Date.now();
  const ref = params.ref;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_tree_get',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_classeur_tree_get', `🚀 Début récupération arborescence classeur v2 ${ref}`, context);

  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi(context.operation, `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const classeurId = resolveResult.id;

  try {
    // Vérifier que le classeur existe
    const { data: classeur, error: classeurError } = await supabase
      .from('classeurs')
      .select('id, name, user_id')
      .eq('id', classeurId)
      .single();

    if (classeurError || !classeur) {
      logApi('v2_classeur_tree_get', `❌ Classeur non trouvé: ${classeurId}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les dossiers du classeur
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, created_at, updated_at, position')
      .eq('classeur_id', classeurId)
      .order('position', { ascending: true });

    if (foldersError) {
      logApi('v2_classeur_tree_get', `❌ Erreur récupération dossiers: ${foldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des dossiers' },
        { status: 500 }
      );
    }

    // Récupérer les notes du classeur (sans dossier parent)
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, created_at, updated_at, position')
      .eq('classeur_id', classeurId)
      .is('folder_id', null)
      .order('position', { ascending: true });

    if (notesError) {
      logApi('v2_classeur_tree_get', `❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500 }
      );
    }

    const response = {
      success: true,
      tree: {
        id: classeur.id,
        name: classeur.name,
        folders: folders || [],
        notes: notes || []
      }
    };

    // Validation de la réponse
    const validationResult = treeResponseV2Schema.safeParse(response);
    if (!validationResult.success) {
      logApi('v2_classeur_tree_get', `❌ Réponse invalide: ${validationResult.error}`, context);
      return NextResponse.json(
        { error: 'Erreur de validation de la réponse' },
        { status: 500 }
      );
    }

    const apiTime = Date.now() - startTime;
    logApi('v2_classeur_tree_get', `✅ Arborescence récupérée en ${apiTime}ms`, context);

    return NextResponse.json(response);

  } catch (error) {
    logApi('v2_classeur_tree_get', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
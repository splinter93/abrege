import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser, checkUserPermission } from '@/utils/authUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  const { ref } = await params;
  const clientType = request.headers.get('X-Client-Type') || 'unknown';
  const context = {
    operation: 'v2_classeur_tree',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi('v2_classeur_tree', `🚀 Début récupération arborescence classeur v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi('v2_classeur_tree', `❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;
  
  // Récupérer le token d'authentification
  const authHeader = request.headers.get('Authorization');
  const userToken = authHeader?.substring(7);
  
  if (!userToken) {
    logApi('v2_tree', '❌ Token manquant', context);
    return NextResponse.json(
      { error: 'Token d\'authentification manquant' },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Créer un client Supabase authentifié
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });

  // Résoudre la référence (UUID ou slug)
  const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, context, userToken);
  if (!resolveResult.success) {
    return NextResponse.json(
      { error: resolveResult.error },
      { status: resolveResult.status }
    );
  }

  const classeurId = resolveResult.id;

  // 🔐 Vérification des permissions (temporairement commentée pour debug)
  /*
  const permissionResult = await checkUserPermission(classeurId, 'classeur', 'viewer', userId, context);
  if (!permissionResult.success) {
    logApi('v2_classeur_tree', `❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500 }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi('v2_classeur_tree', `❌ Permissions insuffisantes pour classeur ${classeurId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour accéder à ce classeur' },
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  */

  try {
    // Récupérer le classeur principal
    logApi('v2_classeur_tree', `🔍 Tentative récupération classeur: ${classeurId}`, context);
    
    const { data: classeur, error: classeurError } = await supabase
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at')
      .eq('id', classeurId)
      .single();

    if (classeurError) {
      logApi('v2_classeur_tree', `❌ Erreur SQL récupération classeur: ${classeurError.message}`, context);
      logApi('v2_classeur_tree', `❌ Code erreur: ${classeurError.code}`, context);
      logApi('v2_classeur_tree', `❌ Détails: ${classeurError.details}`, context);
    }

    if (classeurError || !classeur) {
      logApi('v2_classeur_tree', `❌ Classeur non trouvé: ${classeurId}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi('v2_classeur_tree', `✅ Classeur trouvé: ${classeur.name} (${classeur.id})`, context);

    // 🔧 CORRECTION TEMPORAIRE: Utiliser uniquement classeur_id en attendant la migration
    // Récupérer les dossiers du classeur
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, created_at, position, slug, classeur_id')
      .eq('classeur_id', classeurId)
      .order('name');

    if (foldersError) {
      logApi('v2_classeur_tree', `❌ Erreur récupération dossiers: ${foldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des dossiers' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi('v2_classeur_tree', `📁 Dossiers trouvés: ${folders?.length || 0}`, context);

    // 🔧 CORRECTION TEMPORAIRE: Utiliser uniquement classeur_id en attendant la migration
    // Récupérer les notes du classeur (sans dossier)
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, created_at, updated_at, classeur_id')
      .eq('classeur_id', classeurId)
      .is('folder_id', null)
      .order('source_title');

    if (notesError) {
      logApi('v2_classeur_tree', `❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi('v2_classeur_tree', `📝 Notes trouvées: ${notes?.length || 0}`, context);

    const apiTime = Date.now() - startTime;
    logApi('v2_classeur_tree', `✅ Arborescence récupérée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      message: 'Arborescence récupérée avec succès',
      tree: {
        classeur: {
          id: classeur.id,
          name: classeur.name,
          description: classeur.description,
          emoji: classeur.emoji,
          position: classeur.position,
          slug: classeur.slug,
          createdAt: classeur.created_at,
          updatedAt: classeur.updated_at
        },
        folders: folders?.map(folder => ({
          id: folder.id,
          name: folder.name,
          parentId: folder.parent_id,
          position: folder.position,
          slug: folder.slug,
          createdAt: folder.created_at,
          classeur_id: folder.classeur_id // 🔧 Compatibilité
        })) || [],
        notes: notes?.map(note => ({
          id: note.id,
          title: note.source_title,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
          classeur_id: note.classeur_id // 🔧 Compatibilité
        })) || []
      }
    }, { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    logApi('v2_classeur_tree', `❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 
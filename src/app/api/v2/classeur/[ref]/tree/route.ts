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

  logApi.info(`🚀 Début récupération arborescence classeur v2 ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
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
    logApi.info('❌ Token manquant', context);
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
    logApi.info(`❌ Erreur vérification permissions: ${permissionResult.error}`, context);
    return NextResponse.json(
      { error: permissionResult.error },
      { status: permissionResult.status || 500 }
    );
  }
  if (!permissionResult.hasPermission) {
    logApi.info(`❌ Permissions insuffisantes pour classeur ${classeurId}`, context);
    return NextResponse.json(
      { error: 'Permissions insuffisantes pour accéder à ce classeur' },
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  */

  try {
    // Récupérer le classeur principal
    logApi.info(`🔍 Tentative récupération classeur: ${classeurId}`, context);
    
    const { data: classeur, error: classeurError } = await supabase
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at')
      .eq('id', classeurId)
      .single();

    if (classeurError) {
      logApi.info(`❌ Erreur SQL récupération classeur: ${classeurError.message}`, context);
      logApi.info(`❌ Code erreur: ${classeurError.code}`, context);
      logApi.info(`❌ Détails: ${classeurError.details}`, context);
    }

    if (classeurError || !classeur) {
      logApi.info(`❌ Classeur non trouvé: ${classeurId}`, context);
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi.info(`✅ Classeur trouvé: ${classeur.name} (${classeur.id})`, context);

    // 🔧 CORRECTION: Utiliser classeur_id ET notebook_id pour compatibilité
    // Récupérer les dossiers du classeur
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id, created_at, position, slug, classeur_id, notebook_id')
      .or(`classeur_id.eq.${classeurId},notebook_id.eq.${classeurId}`)
      .order('name');

    if (foldersError) {
      logApi.info(`❌ Erreur récupération dossiers: ${foldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des dossiers' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi.info(`📁 Dossiers trouvés: ${folders?.length || 0}`, context);

    // 🔧 CORRECTION: Utiliser classeur_id ET notebook_id pour compatibilité
    // Récupérer les notes du classeur (sans dossier)
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content, html_content, header_image, folder_id, created_at, updated_at, classeur_id, notebook_id')
      .or(`classeur_id.eq.${classeurId},notebook_id.eq.${classeurId}`)
      .is('folder_id', null)
      .order('source_title');

    if (notesError) {
      logApi.info(`❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 🔧 CORRECTION: Récupérer AUSSI les notes dans les dossiers
    const folderIds = folders?.map(f => f.id) || [];
    let notesInFolders: any[] = [];
    
    if (folderIds.length > 0) {
      const { data: folderNotes, error: folderNotesError } = await supabase
        .from('articles')
        .select('id, source_title, markdown_content, html_content, header_image, folder_id, created_at, updated_at, classeur_id, notebook_id')
        .or(`classeur_id.eq.${classeurId},notebook_id.eq.${classeurId}`)
        .in('folder_id', folderIds)
        .order('source_title');

      if (folderNotesError) {
        logApi.info(`❌ Erreur récupération notes dans dossiers: ${folderNotesError.message}`, context);
        // Ne pas échouer complètement, continuer avec les notes à la racine
      } else {
        notesInFolders = folderNotes || [];
        logApi.info(`📝 Notes dans dossiers trouvées: ${notesInFolders.length}`, context);
      }
    }

    // 🔧 CORRECTION: Combiner toutes les notes
    const allNotes = [...(notes || []), ...notesInFolders];
    logApi.info(`📝 Total notes trouvées: ${allNotes.length}`, context);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Arborescence récupérée en ${apiTime}ms`, context);

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
          classeur_id: folder.classeur_id, // 🔧 Compatibilité
          notebook_id: folder.notebook_id // 🔧 Nouvelle colonne
        })) || [],
        notes: allNotes?.map(note => ({
          id: note.id,
          title: note.source_title,
          markdown_content: note.markdown_content,
          html_content: note.html_content,
          header_image: note.header_image,
          folder_id: note.folder_id,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
          classeur_id: note.classeur_id, // 🔧 Compatibilité
          notebook_id: note.notebook_id // 🔧 Nouvelle colonne
        })) || []
      }
    }, { headers: { "Content-Type": "application/json" } });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { getAuthenticatedUser } from '@/utils/authUtils';

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

  // 🔐 Authentification simplifiée - une seule vérification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId!;
  
  // 🔧 CORRECTION: Utiliser directement le client Supabase standard
  // getAuthenticatedUser a déjà validé le token, pas besoin de le refaire
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    // Récupérer le classeur principal
    logApi.info(`🔍 Tentative récupération classeur: ${classeurId}`, context);
    
    const { data: classeur, error: classeurError } = await supabase
      .from('classeurs')
      .select('id, name, description, emoji, position, slug, created_at, updated_at')
      .eq('id', classeurId)
      .eq('user_id', userId) // 🔧 SÉCURITÉ: Vérifier que l'utilisateur est propriétaire
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
      .eq('user_id', userId) // 🔧 SÉCURITÉ: Vérifier que l'utilisateur est propriétaire
      .order('name');

    if (foldersError) {
      logApi.info(`❌ Erreur récupération dossiers: ${foldersError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des dossiers' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi.info(`✅ ${folders?.length || 0} dossiers récupérés`, context);

    // Récupérer les notes du classeur
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, header_image, created_at, updated_at, folder_id, classeur_id, notebook_id')
      .or(`classeur_id.eq.${classeurId},notebook_id.eq.${classeurId}`)
      .eq('user_id', userId) // 🔧 SÉCURITÉ: Vérifier que l'utilisateur est propriétaire
      .order('source_title');

    if (notesError) {
      logApi.info(`❌ Erreur récupération notes: ${notesError.message}`, context);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes' },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    logApi.info(`✅ ${notes?.length || 0} notes récupérées`, context);

    // Construire l'arborescence
    const tree = buildTree(folders || [], notes || []);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ Arborescence classeur v2 récupérée en ${apiTime}ms`, context);

    return NextResponse.json({
      success: true,
      classeur,
      tree,
      folders: folders || [],
      notes: notes || [],
      generated_at: new Date().toISOString()
    }, { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logApi.error(`❌ Erreur inattendue: ${errorMessage}`, context);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Fonction utilitaire pour construire l'arborescence
function buildTree(folders: any[], notes: any[]) {
  const folderMap = new Map();
  const rootFolders: any[] = [];
  const rootNotes: any[] = [];

  // Créer un map des dossiers
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      notes: []
    });
  });

  // Organiser les dossiers en arbre
  folders.forEach(folder => {
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      folderMap.get(folder.parent_id).children.push(folderMap.get(folder.id));
    } else {
      rootFolders.push(folderMap.get(folder.id));
    }
  });

  // Organiser les notes
  notes.forEach(note => {
    if (note.folder_id && folderMap.has(note.folder_id)) {
      folderMap.get(note.folder_id).notes.push(note);
    } else {
      rootNotes.push(note);
    }
  });

  return {
    folders: rootFolders,
    notes: rootNotes
  };
} 
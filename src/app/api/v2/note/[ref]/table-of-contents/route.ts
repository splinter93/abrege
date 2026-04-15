import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { getAuthenticatedUser } from '@/utils/authUtils';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';
import { V2ResourceResolver } from '@/utils/v2ResourceResolver';
import { resolveNoteAccess } from '@/utils/database/shareAccessService';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


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
    operation: 'v2_note_toc',
    component: 'API_V2',
    ref,
    clientType
  };

  logApi.info(`🚀 Début récupération TOC note v2: ${ref}`, context);

  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    logApi.info(`❌ Authentification échouée: ${authResult.error}`, context);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;

  try {
    // 🔧 CORRECTION: Utiliser V2ResourceResolver pour résoudre la référence
    const resolveResult = await V2ResourceResolver.resolveRef(ref, 'note', userId, context);
    if (!resolveResult.success) {
      return NextResponse.json(
        { error: resolveResult.error },
        { status: resolveResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const noteId = resolveResult.id;

    const access = await resolveNoteAccess(noteId, userId);
    if (!access) {
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer la note par son ID résolu (ownerId = propriétaire réel)
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content')
      .eq('id', noteId)
      .eq('user_id', access.ownerId)
      .single();

    if (fetchError) {
      logApi.info(`❌ Erreur récupération note: ${fetchError.message}`, context);
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!note.markdown_content) {
      logApi.info(`⚠️ Note sans contenu markdown: ${ref}`, context);
      return NextResponse.json({
        success: true,
        toc: [],
        note: {
          id: note.id,
          title: note.source_title,
          has_content: false
        }
      });
    }

    // Extraire la table des matières
    const toc = extractTOCWithSlugs(note.markdown_content);

    const apiTime = Date.now() - startTime;
    logApi.info(`✅ TOC extrait avec succès en ${apiTime}ms - ${toc.length} sections`, context);

    return NextResponse.json({
      success: true,
      toc,
      note: {
        id: note.id,
        title: note.source_title,
        has_content: true,
        content_length: note.markdown_content.length
      }
    });

  } catch (err: unknown) {
    const error = err as Error;
    logApi.info(`❌ Erreur serveur: ${error}`, context);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string }> }
): Promise<NextResponse> {
  const { username, slug } = await params;
  const decodedUsername = decodeURIComponent(username).replace(/^@/, '');

  try {
    // Chercher l'utilisateur par username
    const { data: user } = await supabaseAnon
      .from('users')
      .select('id')
      .eq('username', decodedUsername)
      .limit(1)
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer la note par slug et user_id (même si privée - pour la TOC)
    // Utiliser le client service pour contourner RLS
    const { data: note } = await supabaseService
      .from('articles')
      .select('id, source_title, markdown_content, share_settings')
      .eq('slug', slug)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!note) {
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si la note est accessible publiquement
    const visibility = note.share_settings?.visibility;
    if (visibility === 'private') {
      // Pour les notes privées, on ne retourne pas la TOC
      return NextResponse.json(
        { error: 'Note privée' },
        { status: 403 }
      );
    }

    if (!note.markdown_content) {
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

    // Extraire la table des matières du markdown
    const toc = extractTOCWithSlugs(note.markdown_content);

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

  } catch (error) {
    console.error('Erreur TOC publique:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

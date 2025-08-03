import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';
import { resolveNoteRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


/**
 * Récupère le token d'authentification et crée un client Supabase authentifié
 */
async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  let userId: string;
  let userToken: string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    userToken = authHeader.substring(7);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Token invalide ou expiré');
    }
    
    userId = user.id;
    return { supabase, userId };
  } else {
    throw new Error('Authentification requise');
  }
}


export type GetNoteSectionResponse =
  | { section: string; content: string }
  | { error: string; details?: string[] };

function extractSectionContent(markdown: string, section: string): string {
  const toc = extractTOCWithSlugs(markdown);
  const sectionIdx = toc.findIndex(t => t.title === section || t.slug === section);
  if (sectionIdx === -1) throw new Error('Section non trouvée (titre ou slug inconnu)');
  const target = toc[sectionIdx];
  const lines = markdown.split('\n');
  const sectionStart = target.line - 1;
  let sectionEnd = lines.length;
  for (let i = target.line; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match && match[1].length <= target.level) {
      sectionEnd = i;
      break;
    }
  }
  return lines.slice(sectionStart + 1, sectionEnd).join('\n').trim();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  try {
    const { ref } = await params;
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section');
    const schema = z.object({ ref: z.string().min(1, 'note_ref requis'), section: z.string().min(1, 'section requise') });
    const parseResult = schema.safeParse({ ref, section });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètres invalides', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // ✅ Authentification implémentée
    const { supabase, userId } = await getAuthenticatedClient(req);
    const noteId = await resolveNoteRef(ref, userId);
    
    const { data: note, error } = await supabase
      .from('articles')
      .select('markdown_content')
      .eq('id', noteId)
      .single();
    if (error || !note) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    let content = '';
    try {
      content = extractSectionContent(note.markdown_content || '', section!);
    } catch (e: unknown) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur inconnue' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ section, content }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: err instanceof Error ? error.message : 'Erreur inconnue' }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

/**
 * Endpoint: GET /api/v1/note/[ref]/section?section=...
 * Paramètre attendu : { ref: string } (ID ou slug)
 * Query param : section (titre ou slug de la section)
 * - Résout la référence (ID ou slug) vers l'ID réel
 * - Extrait le contenu d'une section spécifique
 * - Réponses :
 *   - 200 : { section, content }
 *   - 404 : { error: 'Note non trouvée.' | 'Section non trouvée' }
 *   - 422 : { error: 'Paramètres invalides', details }
 *   - 500 : { error: string }
 */ 
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { extractTOCWithSlugs } from '@/utils/markdownTOC';
import { markdownContentSchema } from '@/utils/markdownValidation';
import type { Article } from '@/types/supabase';
import type { NextRequest } from 'next/server';
import { createMarkdownIt } from '@/utils/markdownItConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type EraseSectionPayload = {
  section: string; // titre ou slug
  content?: string | null; // nouveau contenu markdown ou null pour effacer
};
export type EraseSectionResponse =
  | { note: Article }
  | { error: string; details?: string[] };

function replaceSectionContent(markdown: string, section: string, newContent: string): string {
  const toc = extractTOCWithSlugs(markdown);
  const sectionIdx = toc.findIndex(t => t.title === section || t.slug === section);
  if (sectionIdx === -1) throw new Error('Section non trouvée (titre ou slug inconnu)');
  const target = toc[sectionIdx];
  const lines = markdown.split('\n');
  let sectionStart = target.line - 1;
  let sectionEnd = lines.length;
  for (let i = target.line; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match && match[1].length <= target.level) {
      sectionEnd = i;
      break;
    }
  }
  // Remplacer le contenu entre sectionStart+1 et sectionEnd
  const before = lines.slice(0, sectionStart + 1);
  const after = lines.slice(sectionEnd);
  const newLines = newContent.trim() ? newContent.trim().split('\n') : [];
  return [...before, ...newLines, ...after].join('\n');
}

export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { id } = params;
  try {
    const paramSchema = z.object({ id: z.string().min(1, 'note_id requis') });
    const body: EraseSectionPayload = await req.json();
    const bodySchema = z.object({
      section: z.string().min(1, 'section (titre ou slug) requis'),
      content: z.string().nullable().optional(),
    });
    const paramResult = paramSchema.safeParse({ id });
    const bodyResult = bodySchema.safeParse(body);
    if (!paramResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_id invalide', details: paramResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    if (!bodyResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: bodyResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    // Validation markdown LLM-ready (uniquement si content non vide)
    if (body.content && body.content.trim()) {
      try {
        markdownContentSchema.parse(body.content);
      } catch (e: any) {
        const msg = (e && typeof e === 'object' && 'errors' in e && Array.isArray(e.errors)) ? e.errors[0]?.message : (e && typeof e === 'object' && 'message' in e ? e.message : String(e));
        return new Response(
          JSON.stringify({ error: 'content non autorisé', details: [msg] }),
          { status: 422 }
        );
      }
    }
    // Lire la note existante
    const { data: note, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !note) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404 });
    }
    // Remplacer le contenu de la section
    let newMarkdown: string;
    try {
      newMarkdown = replaceSectionContent(note.markdown_content || '', body.section, body.content || '');
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 404 });
    }
    // Générer le HTML sécurisé (si besoin)
    const window = new JSDOM('').window as unknown as Window;
    const md = createMarkdownIt();
    const purify = (DOMPurify as any)(window);
    const html_content = purify.sanitize(md.render(newMarkdown), { ALLOWED_ATTR: ['style', 'class', 'align'] });
    // Sauvegarder
    const { data: updated, error: updateError } = await supabase
      .from('articles')
      .update({ markdown_content: newMarkdown, html_content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ note: updated }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: PATCH /api/v1/note/[id]/erase-section
 * Payload attendu : { section: string, content: string }
 * - Valide le paramètre id et le payload avec Zod
 * - Valide le markdown avec markdownContentSchema (LLM-Ready)
 * - Remplace le contenu de la section ciblée
 * - Génère le HTML sécurisé (champ html_content)
 * - Met à jour la note dans Supabase
 * - Réponses :
 *   - 200 : { note }
 *   - 404 : { error: 'Note non trouvée.' | 'Section non trouvée (titre ou slug inconnu)' }
 *   - 422 : { error: 'Paramètre note_id invalide' | 'Payload invalide' | 'content non autorisé', details }
 *   - 500 : { error: string }
 */ 
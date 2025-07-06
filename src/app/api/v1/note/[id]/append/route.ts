import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { appendToSection } from '@/utils/markdownTOC';
import { markdownContentSchema } from '@/utils/markdownValidation';
import type { Article } from '@/types/supabase';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types explicites pour le payload et la réponse
export type AppendNotePayload = { text: string };
export type AppendNoteResponse =
  | { note: Article }
  | { error: string; details?: string[] };

export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  const { id } = params;
  try {
    const paramSchema = z.object({ id: z.string().min(1, 'note_id requis') });
    const body: AppendNotePayload = await req.json();
    const bodySchema = z.object({ text: z.string().min(1, 'text (markdown) requis') });
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
    // Validation markdown LLM-ready
    try {
      markdownContentSchema.parse(body.text);
    } catch (e: any) {
      const msg = (e && typeof e === 'object' && 'errors' in e && Array.isArray(e.errors)) ? e.errors[0]?.message : (e && typeof e === 'object' && 'message' in e ? e.message : String(e));
      console.warn('Tentative d\'injection markdown rejetée:', msg);
      return new Response(
        JSON.stringify({ error: 'text non autorisé', details: [msg] }),
        { status: 422 }
      );
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
    // Concaténer le markdown (nouveau schéma : markdown_content)
    const newContent = appendToSection(note.markdown_content || '', '', body.text);
    // Générer le HTML sécurisé (champ html_content)
    const window = new JSDOM('').window as unknown as Window;
    const turndownService = new TurndownService();
    const purify = (DOMPurify as any)(window);
    const html_content = purify.sanitize(turndownService.turndown(newContent), { ALLOWED_ATTR: ['style', 'class', 'align'] });
    // Sauvegarder
    const { data: updated, error: updateError } = await supabase
      .from('articles')
      .update({ markdown_content: newContent, html_content, updated_at: new Date().toISOString() })
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
 * Endpoint: PATCH /api/v1/note/[id]/append
 * Paramètre attendu : { id: string }
 * Payload attendu : { text: string }
 * - Valide le paramètre id et le payload avec Zod
 * - Valide le markdown avec markdownContentSchema (LLM-Ready)
 * - Concatène le markdown (champ markdown_content)
 * - Génère le HTML sécurisé (champ html_content)
 * - Met à jour la note dans Supabase
 * - Réponses :
 *   - 200 : { note }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_id invalide' | 'Payload invalide' | 'text non autorisé', details }
 *   - 500 : { error: string }
 */ 
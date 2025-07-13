import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { markdownContentSchema } from '@/utils/markdownValidation';
import type { Article } from '@/types/supabase';
import MarkdownIt from 'markdown-it';
import { createMarkdownIt } from '@/utils/markdownItConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types explicites pour le payload et la réponse
export type CreateNotePayload = {
  classeur_id: string;
  title: string;
  markdown_content: string; // markdown natif (source de vérité)
  header_image?: string; // URL de l'image de couverture (optionnel)
  source_type: string;
  source_url: string;
};

export type CreateNoteResponse =
  | { success: true; note: Article }
  | { error: string; details?: string[] };

// =============================
// [TEMP] USER_ID HARDCODED FOR DEV/LLM
// TODO: Remove this and extract user_id from API key or session when auth is implemented!
const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
// =============================

// Supprime le H1 en début de markdown (si présent)
function removeLeadingH1(markdown: string): string {
  const lines = markdown.split('\n');
  if (lines[0] && /^#\s+/.test(lines[0].trim())) {
    return lines.slice(1).join('\n').replace(/^\n+/, '');
  }
  return markdown;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body: CreateNotePayload = await req.json();
    // Validation stricte avec Zod (adaptée au nouveau schéma)
    const schema = z.object({
      classeur_id: z.string().min(1, 'classeur_id requis'),
      title: z.string().min(1, 'title requis'),
      markdown_content: z.string().min(1, 'markdown_content requis'),
      header_image: z.string().url('header_image doit être une URL valide').optional(),
      source_type: z.string().min(1, 'source_type requis').optional(),
      source_url: z.string().min(1, 'source_url requis').optional(),
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { classeur_id, title, markdown_content, header_image, source_type, source_url } = parseResult.data;

    // Nettoyage : supprime le H1 en début de markdown (LLM-friendly)
    const cleaned_markdown_content = removeLeadingH1(markdown_content);
    // Validation markdown LLM-ready
    try {
      markdownContentSchema.parse(cleaned_markdown_content);
    } catch (e: any) {
      const msg = (e && typeof e === 'object' && 'errors' in e && Array.isArray(e.errors)) ? e.errors[0]?.message : (e && typeof e === 'object' && 'message' in e ? e.message : String(e));
      console.warn('Tentative d\'injection markdown rejetée:', msg);
      return new Response(
        JSON.stringify({ error: 'markdown_content non autorisé', details: [msg] }),
        { status: 422 }
      );
    }

    // Suppression de toute logique liée à html_content (obsolète)

    const insertData = {
      user_id: USER_ID, // [TEMP] Injected automatically for all notes (remove when auth is ready)
      classeur_id,
      source_type: source_type || null,
      source_url: source_url || null,
      source_title: title,
      markdown_content: cleaned_markdown_content, // correspond à la colonne Supabase
      header_image: header_image || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('articles')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, note: data }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: POST /api/v1/create-note
 * Payload attendu : { classeur_id: string, title: string, markdown_content: string, html_content: string, source_type: string, source_url: string }
 * - Valide le payload avec Zod (tous champs obligatoires)
 * - Valide le markdown avec markdownContentSchema (LLM-Ready)
 * - Sanitize le HTML reçu (html_content)
 * - Insère la note dans Supabase (schéma: content, html_content)
 * - Réponses :
 *   - 201 : { success: true, note }
 *   - 422 : { error: 'Payload invalide' | 'markdown_content non autorisé', details }
 *   - 500 : { error: string }
 */ 
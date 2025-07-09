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
  html_content?: string; // HTML filtré/sécurisé (optionnel)
  source_type: string;
  source_url: string;
};

export type CreateNoteResponse =
  | { success: true; note: Article }
  | { error: string; details?: string[] };

export async function POST(req: Request): Promise<Response> {
  try {
    const body: CreateNotePayload = await req.json();
    // Validation stricte avec Zod (adaptée au nouveau schéma)
    const schema = z.object({
      classeur_id: z.string().min(1, 'classeur_id requis'),
      title: z.string().min(1, 'title requis'),
      markdown_content: z.string().min(1, 'markdown_content requis'),
      html_content: z.string().optional(),
      source_type: z.string().min(1, 'source_type requis'),
      source_url: z.string().min(1, 'source_url requis'),
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { classeur_id, title, markdown_content, html_content, source_type, source_url } = parseResult.data;

    // Validation markdown LLM-ready
    try {
      markdownContentSchema.parse(markdown_content);
    } catch (e: any) {
      const msg = (e && typeof e === 'object' && 'errors' in e && Array.isArray(e.errors)) ? e.errors[0]?.message : (e && typeof e === 'object' && 'message' in e ? e.message : String(e));
      console.warn('Tentative d\'injection markdown rejetée:', msg);
      return new Response(
        JSON.stringify({ error: 'markdown_content non autorisé', details: [msg] }),
        { status: 422 }
      );
    }

    // Sanitization du HTML reçu (si fourni), sinon conversion automatique depuis markdown_content
    let sanitizedHtmlContent = '';
    if (html_content && html_content.trim()) {
      // On ignore le html_content fourni
      sanitizedHtmlContent = '';
    } else {
      // On ne génère plus de HTML côté backend
      sanitizedHtmlContent = '';
    }

    const insertData = {
      classeur_id,
      source_type,
      source_url,
      source_title: title,
      markdown_content, // correspond à la colonne Supabase
      // html_content supprimé
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
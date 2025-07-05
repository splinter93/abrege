import { createClient } from '@supabase/supabase-js';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { z } from 'zod';
import { markdownContentSchema } from '../../../utils/markdownValidation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('body:', body);

    // Validation stricte avec Zod
    const schema = z.object({
      classeur_id: z.string().min(1, 'classeur_id requis'),
      title: z.string().min(1, 'title requis'),
      markdown_content: z.string().min(1, 'markdown_content requis'),
      html_content: z.string().min(1, 'html_content requis'),
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
    } catch (e) {
      const msg = (e && typeof e === 'object' && 'errors' in e && Array.isArray(e.errors)) ? e.errors[0]?.message : (e && typeof e === 'object' && 'message' in e ? e.message : String(e));
      console.warn('Tentative d\'injection markdown rejetée:', msg);
      return new Response(
        JSON.stringify({ error: 'markdown_content non autorisé', details: [msg] }),
        { status: 422 }
      );
    }

    // Sanitization du HTML reçu
    const window = new JSDOM('').window;
    const sanitizedHtmlContent = DOMPurify(window).sanitize(html_content, { ALLOWED_ATTR: ['style', 'class', 'align'] });

    const insertData = {
      classeur_id,
      source_type,
      source_url,
      source_title: title,
      markdown_content, // markdown natif (source de vérité)
      html_content: sanitizedHtmlContent, // HTML filtré/sécurisé
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('insertData:', insertData);

    const { data, error } = await supabase
      .from('articles')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, note: data }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 
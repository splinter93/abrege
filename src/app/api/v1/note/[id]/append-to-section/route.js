import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { slugify, extractTOCWithSlugs, appendToSection } from '../../../utils/markdownTOC';
import { markdownContentSchema } from '../../../utils/markdownValidation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const paramSchema = z.object({ id: z.string().min(1, 'note_id requis') });
    const body = await req.json();
    const bodySchema = z.object({
      section: z.string().min(1, 'section (titre ou slug) requis'),
      text: z.string().min(1, 'text (markdown) requis')
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
    // Validation markdown LLM-ready
    try {
      markdownContentSchema.parse(body.text);
    } catch (e) {
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
    const markdown = note.markdown_content || '';
    const toc = extractTOCWithSlugs(markdown);
    // Trouver la section par titre exact ou slug
    const sectionIdx = toc.findIndex(t => t.title === body.section || t.slug === body.section);
    if (sectionIdx === -1) {
      return new Response(JSON.stringify({ error: 'Section non trouvée (titre ou slug inconnu)' }), { status: 404 });
    }
    const section = toc[sectionIdx];
    // Chercher la fin de la section (avant le prochain titre de même ou plus haut niveau, ou fin du doc)
    const lines = markdown.split('\n');
    let insertLine = lines.length;
    for (let i = section.line; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)/);
      if (match && match[1].length <= section.level) {
        insertLine = i;
        break;
      }
    }
    // Insérer le texte à la fin de la section
    const before = lines.slice(0, insertLine).join('\n');
    const after = lines.slice(insertLine).join('\n');
    const newMarkdown = appendToSection(markdown, body.section, body.text);
    // Générer le HTML sécurisé
    const window = new JSDOM('').window;
    const turndownService = new TurndownService();
    const html_content = DOMPurify(window).sanitize(turndownService.turndown(newMarkdown), { ALLOWED_ATTR: ['style', 'class', 'align'] });
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 
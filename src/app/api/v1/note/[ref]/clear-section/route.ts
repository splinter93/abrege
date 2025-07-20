import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';
import { appendToSection, extractTOCWithSlugs } from '@/utils/markdownTOC';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * PATCH /api/v1/note/{ref}/clear-section
 * Efface le contenu d'une section spécifique d'une note
 * Body: { section: string }
 * Réponse : { note: { id, markdown_content, ... } }
 */
export async function PATCH(req: NextRequest, { params }: any): Promise<Response> {
  try {
    const { ref } = await params;
    const body = await req.json();
    
    const schema = z.object({
      section: z.string().min(1, 'section requis')
    });
    
    const parseResult = schema.safeParse({ ...body });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { section } = parseResult.data;
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    
    // Récupérer la note actuelle
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('markdown_content')
      .eq('id', noteId)
      .single();
    
    if (fetchError || !note) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404 });
    }
    
    // Debug: afficher les sections disponibles
    const toc = extractTOCWithSlugs(note.markdown_content || '');
    console.log(`🔍 Sections disponibles:`, toc.map(t => ({ title: t.title, slug: t.slug })));
    console.log(`🔍 Section recherchée: "${section}"`);
    
    // Vérifier si la section existe
    const sectionIdx = toc.findIndex(t => t.title === section || t.slug === section);
    if (sectionIdx === -1) {
      const availableSections = toc.map(t => `"${t.title}" (slug: "${t.slug}")`).join(', ');
      return new Response(
        JSON.stringify({ 
          error: `Section "${section}" non trouvée. Sections disponibles: ${availableSections}` 
        }), 
        { status: 404 }
      );
    }
    
    // Effacer le contenu de la section (remplacer par une chaîne vide)
    const newContent = appendToSection(note.markdown_content || '', section, '', 'start');
    
    // Mettre à jour la note
    const { data: updatedNote, error } = await supabase
      .from('articles')
      .update({
        markdown_content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur mise à jour note:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    console.log(`✅ Section "${section}" effacée`);
    return new Response(JSON.stringify({ note: updatedNote }), { status: 200 });
  } catch (err: any) {
    console.error('❌ Erreur générale:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
} 
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';
import { clearSection, extractTOCWithSlugs, appendToSection } from '@/utils/markdownTOC';
import { updateArticleInsight } from '@/utils/insightUpdater';
import { simpleLogger as logger } from '@/utils/logger';

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


/**
 * PATCH /api/v1/note/{ref}/clear-section
 * Efface le contenu d'une section spécifique d'une note
 * Body: { section: string }
 * Réponse : { note: { id, markdown_content, ... } }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  try {
    const { ref } = await params;
    const body = await req.json();
    
    // Debug: afficher le payload reçu
    logger.dev('🔍 clear-section payload reçu:', JSON.stringify(body, null, 2));
    logger.dev('🔍 clear-section ref:', ref);
    
    const schema = z.object({
      section: z.string().min(1, 'section requis').optional(),
      section_title: z.string().min(1, 'section_title requis').optional(),
      placeholder: z.string().optional()
    }).refine(
      (data) => data.section || data.section_title,
      {
        message: 'section ou section_title requis',
        path: ['section']
      }
    );
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      logger.dev('❌ clear-section validation échouée:', parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { section, section_title, placeholder } = parseResult.data;
    
    // Utiliser section ou section_title (priorité à section)
    const targetSection = section || section_title;
    if (!targetSection) {
      return new Response(
        JSON.stringify({ error: 'section ou section_title requis' }),
        { status: 422 }
      );
    }
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer userId par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer userId par l'authentification Supabase
    const { supabase, userId } = await getAuthenticatedClient(req);
    const noteId = await resolveNoteRef(ref, userId);
    
    // Récupérer la note actuelle
    const { data: note, error: fetchError } = await supabase
      .from('articles')
      .select('markdown_content')
      .eq('id', noteId)
      .single();
    
    if (fetchError || !note) {
      return new Response(JSON.stringify({ error: 'Note non trouvée.' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    
    // Debug: afficher les sections disponibles
    const toc = extractTOCWithSlugs(note.markdown_content || '');
    logger.dev(`🔍 Sections disponibles:`, toc.map(t => ({ title: t.title, slug: t.slug })));
    logger.dev(`🔍 Section recherchée: "${section}"`);
    
    // Vérifier si la section existe
    const sectionIdx = toc.findIndex(t => t.title === targetSection || t.slug === targetSection);
    if (sectionIdx === -1) {
      const availableSections = toc.map(t => `"${t.title}" (slug: "${t.slug}")`).join(', ');
      return new Response(
        JSON.stringify({ 
          error: `Section "${targetSection}" non trouvée. Sections disponibles: ${availableSections}` 
        }), 
        { status: 404 }
      );
    }
    
    // Effacer le contenu de la section
    let newContent = clearSection(note.markdown_content || '', targetSection);
    
    // Si un placeholder est fourni, l'ajouter à la section vide
    if (placeholder) {
      newContent = appendToSection(newContent, targetSection, placeholder, 'start');
    }
    
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
      logger.error('❌ Erreur mise à jour note:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
    // Mettre à jour l'insight avec la nouvelle TOC
    try {
      await updateArticleInsight(noteId);
      logger.dev(`✅ Insight mis à jour pour la note ${noteId}`);
    } catch (insightError) {
      logger.error('⚠️ Erreur mise à jour insight:', insightError);
      // Ne pas faire échouer la requête si l'insight échoue
    }
    
    logger.dev(`✅ Section "${targetSection}" effacée`);
    return new Response(JSON.stringify({ note: updatedNote }), { status: 200, headers: { "Content-Type": "application/json" } });
  
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  }
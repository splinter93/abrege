import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SlugAndUrlService } from '@/services/slugAndUrlService';
import { simpleLogger as logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/v1/note/create
 * Crée une nouvelle note avec génération automatique de slug
 * notebook_id est OBLIGATOIRE (slug ou ID supporté)
 * folder_id est optionnel (slug ou ID supporté)
 * Réponse : { note: { id, slug, source_title, markdown_content, ... } }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Authentification via Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }
    const userToken = authHeader.substring(7);

    // Client Supabase authentifié
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }
    const userId = user.id;

    // Lecture + validation du payload
    const body = await request.json();
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[createNote] Payload reçu:', body);
    }

    const schema = z.object({
      source_title: z.string().min(1, 'source_title requis'),
      markdown_content: z.string().optional().default(''),
      header_image: z.string().optional(),
      header_image_offset: z.number().min(0).max(100).optional(),
      folder_id: z.string().optional(),
      notebook_id: z.string().min(1, 'notebook_id OBLIGATOIRE'),
      classeur_id: z.string().optional(),
    });

    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }

    const { source_title, markdown_content, header_image, header_image_offset, folder_id, notebook_id, classeur_id } = parseResult.data;

    // Déterminer l'ID du notebook (ID direct ou slug)
    const finalNotebookRef = notebook_id || classeur_id;
    if (!finalNotebookRef) {
      return NextResponse.json({ error: 'notebook_id OBLIGATOIRE' }, { status: 400 });
    }

    let finalNotebookId = finalNotebookRef;
    const isNotebookSlug = !finalNotebookRef.includes('-') && finalNotebookRef.length < 36;
    if (isNotebookSlug) {
      const { data: notebook, error: notebookError } = await supabase
        .from('classeurs')
        .select('id')
        .eq('slug', finalNotebookRef)
        .eq('user_id', userId)
        .single();
      if (notebookError || !notebook) {
        return NextResponse.json({ error: `Notebook avec slug '${finalNotebookRef}' non trouvé` }, { status: 404 });
      }
      finalNotebookId = notebook.id;
    }

    // Résoudre le folder_id si c'est un slug
    let finalFolderId: string | null = folder_id ?? null;
    if (folder_id) {
      const isFolderSlug = !folder_id.includes('-') && folder_id.length < 36;
      if (isFolderSlug) {
        const { data: folder, error: folderError } = await supabase
          .from('folders')
          .select('id, classeur_id')
          .eq('slug', folder_id)
          .eq('user_id', userId)
          .single();
        if (folderError || !folder) {
          return NextResponse.json({ error: `Dossier avec slug '${folder_id}' non trouvé` }, { status: 404 });
        }
        if (folder.classeur_id !== finalNotebookId) {
          return NextResponse.json({ error: `Le dossier '${folder_id}' n'appartient pas au notebook spécifié` }, { status: 400 });
        }
        finalFolderId = folder.id;
      }
    }

    // Génération du slug et de l'URL publique
    let slug: string;
    let publicUrl: string | null = null;
    try {
      const result = await SlugAndUrlService.generateSlugAndUpdateUrl(source_title, userId, undefined, supabase);
      slug = result.slug;
      publicUrl = result.publicUrl;
    } catch (e) {
      // Fallback minimal en cas d'échec
      slug = `${source_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`.slice(0, 120);
      logger.warn(`Fallback slug utilisé pour la note: ${slug}`);
    }

    // Insertion de la note
    const { data: note, error } = await supabase
      .from('articles')
      .insert({
        source_title,
        markdown_content: markdown_content || '',
        html_content: '',
        header_image: header_image || null,
        header_image_offset: header_image_offset || 0,
        classeur_id: finalNotebookId,
        folder_id: finalFolderId,
        user_id: userId,
        slug,
        public_url: publicUrl,
        position: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('[Note Create API] ❌ Erreur création note:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (process.env.NODE_ENV === 'development') {
      logger.dev('[Note Create API] ✅ Note créée:', note.id);
    }

    return new Response(JSON.stringify({ note }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('[Note Create API] ❌ Erreur:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 
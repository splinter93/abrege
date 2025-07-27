import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';
import { s3Service } from '@/services/s3Service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type GetNoteContentResponse =
  | { content: string }
  | { error: string; details?: string[] };

export async function GET(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  try {
    const { ref } = await params;
    const schema = z.object({ ref: z.string().min(1, 'note_ref requis') });
    const parseResult = schema.safeParse({ ref });
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètre note_ref invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    // [TEMP] USER_ID HARDCODED FOR DEV/LLM
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const noteId = await resolveNoteRef(ref, USER_ID);
    
    const { data: note, error } = await supabase
      .from('articles')
      .select('markdown_content')
      .eq('id', noteId)
      .single();
    if (error || !note) {
      return new Response(JSON.stringify({ error: error?.message || 'Note non trouvée.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ content: note.markdown_content || '' }), { status: 200 });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur inconnue' }), { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    console.log('POST /api/v1/note/[ref]/content body:', body);
    
    // Validation des paramètres
    const schema = z.object({
      fileName: z.string().min(1, 'fileName requis'),
      fileType: z.string().min(1, 'fileType requis'),
      fileSize: z.number().optional(), // Taille en bytes
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètres invalides', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { fileName, fileType, fileSize } = parseResult.data;
    
    // Validation de la taille du fichier
    if (fileSize) {
      s3Service.validateFileSize(fileSize);
    }
    
    // Validation du type de fichier
    s3Service.validateFileType(fileType);
    
    // Génération de l'URL pré-signée
    const result = await s3Service.generateUploadUrl({
      fileName,
      fileType,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: 5 * 1024 * 1024, // 5MB
    });
    
    return new Response(JSON.stringify({ 
      url: result.url,
      publicUrl: result.publicUrl,
      key: result.key 
    }), { status: 200 });
    
  } catch (err: unknown) {
    console.error('POST /api/v1/note/[ref]/content error:', err);
    
    // Gestion d'erreurs spécifiques
    if (err instanceof Error && err.message.includes('Configuration S3 invalide')) {
      return new Response(JSON.stringify({ 
        error: 'Configuration serveur invalide',
        code: 'S3_CONFIG_ERROR'
      }), { status: 500 });
    }
    
    if (err instanceof Error && err.message.includes('Type de fichier non supporté')) {
      return new Response(JSON.stringify({ 
        error: err.message,
        code: 'INVALID_FILE_TYPE'
      }), { status: 400 });
    }
    
    if (err instanceof Error && err.message.includes('Fichier trop volumineux')) {
      return new Response(JSON.stringify({ 
        error: err.message,
        code: 'FILE_TOO_LARGE'
      }), { status: 400 });
    }
    
    // Erreur générique
    return new Response(JSON.stringify({ 
      error: 'Erreur lors de la génération de l\'URL d\'upload',
      code: 'UPLOAD_ERROR'
    }), { status: 500 });
  }
}

/**
 * Endpoint: GET /api/v1/note/[ref]/content
 * Paramètre attendu : { ref: string } (ID ou slug)
 * - Résout la référence (ID ou slug) vers l'ID réel
 * - Retourne le markdown brut de la note
 * - Réponses :
 *   - 200 : { content }
 *   - 404 : { error: 'Note non trouvée.' }
 *   - 422 : { error: 'Paramètre note_ref invalide', details }
 *   - 500 : { error: string }
 * 
 * Endpoint: POST /api/v1/note/[ref]/content
 * Body: { fileName: string, fileType: string, fileSize?: number }
 * - Génère une URL pré-signée pour l'upload S3
 * - Valide le type et la taille du fichier
 * - Réponses :
 *   - 200 : { url, publicUrl, key }
 *   - 400 : { error: string, code: string }
 *   - 422 : { error: 'Paramètres invalides', details }
 *   - 500 : { error: string, code: string }
 */ 
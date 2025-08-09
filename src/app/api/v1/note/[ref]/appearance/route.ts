import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { resolveNoteRef } from '@/middleware/resourceResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentification requise');
  }
  const userToken = authHeader.substring(7);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Token invalide ou expiré');
  return { supabase, userId: user.id };
}

// PATCH /api/v1/note/[ref]/appearance
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<Response> {
  try {
    const { ref } = await params;
    const body = await req.json();

    const schema = z.object({
      header_title_in_image: z.boolean().optional(),
      header_image: z.string().url('header_image doit être une URL valide').nullable().optional(),
      header_image_offset: z.number().min(0).max(100).optional(),
      header_image_blur: z.number().int().min(0).max(20).optional(),
      header_image_overlay: z.number().int().min(0).max(5).optional(),
      wide_mode: z.boolean().optional(),
      font_family: z.string().min(1).optional(),
    });

    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { supabase, userId } = await getAuthenticatedClient(req);
    const noteId = await resolveNoteRef(ref, userId);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const {
      header_title_in_image,
      header_image,
      header_image_offset,
      header_image_blur,
      header_image_overlay,
      wide_mode,
      font_family,
    } = parseResult.data;

    if (header_title_in_image !== undefined) updateData.header_title_in_image = header_title_in_image;
    if (header_image !== undefined) updateData.header_image = header_image;
    if (header_image_offset !== undefined) {
      const rounded = Math.round(header_image_offset * 10) / 10;
      updateData.header_image_offset = rounded;
    }
    if (header_image_blur !== undefined) updateData.header_image_blur = header_image_blur;
    if (header_image_overlay !== undefined) {
      updateData.header_image_overlay = header_image_overlay;
    }
    if (wide_mode !== undefined) updateData.wide_mode = wide_mode;
    if (font_family !== undefined) updateData.font_family = font_family;

    const { data: note, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, note }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const error = err as Error;
    const status = (error.message === 'Authentification requise' || error.message === 'Token invalide ou expiré') ? 401 : 500;
    return new Response(JSON.stringify({ error: error.message }), { status, headers: { 'Content-Type': 'application/json' } });
  }
} 
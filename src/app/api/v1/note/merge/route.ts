import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import type { Article } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MergeNotesPayload = {
  note_ids: string[];
  order?: string[];
};
export type MergeNotesResponse =
  | { merged_content: string; notes: { id: string; title: string }[] }
  | { error: string; details?: string[] };

/**
 * Extension :
 * Si le payload contient { create_new: true, title?: string, classeur_id?: string, folder_id?: string },
 * alors l'API crée une nouvelle note fusionnée en base avec le contenu fusionné.
 * - title : titre de la note fusionnée (optionnel, défaut : 'Fusion de X notes')
 * - classeur_id, folder_id : pour placer la note (optionnels)
 * La réponse retourne la note créée.
 */

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const schema = z.object({
      note_ids: z.array(z.string().min(1)).min(2, 'Au moins deux notes à fusionner'),
      order: z.array(z.string().min(1)).optional(),
      create_new: z.boolean().optional(),
      title: z.string().min(1).optional(),
      classeur_id: z.string().optional(),
      folder_id: z.string().optional(),
      notebook_id: z.string().optional(), // alias LLM-friendly
    });
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    const { note_ids, order, create_new, title, classeur_id, folder_id, notebook_id } = parseResult.data;
    // Si create_new, notebook/classeur est obligatoire
    let finalClasseurId = classeur_id || notebook_id;
    if (create_new && !finalClasseurId) {
      return new Response(
        JSON.stringify({ error: 'classeur_id (ou notebook_id) obligatoire pour créer une note fusionnée.' }),
        { status: 422 }
      );
    }
    // Récupérer toutes les notes
    const { data: notes, error } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content')
      .in('id', note_ids);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    if (!notes || notes.length < note_ids.length) {
      return new Response(
        JSON.stringify({ error: 'Certaines notes sont introuvables.' }),
        { status: 404 }
      );
    }
    // Ordonner les notes selon order[] si fourni, sinon note_ids
    let orderedNotes = notes;
    if (order && order.length === note_ids.length) {
      orderedNotes = order.map(id => notes.find(n => n.id === id)).filter(Boolean) as typeof notes;
    } else {
      orderedNotes = note_ids.map(id => notes.find(n => n.id === id)).filter(Boolean) as typeof notes;
    }
    // Concaténer les contenus avec deux sauts de ligne
    const merged_content = orderedNotes.map(n => n.markdown_content?.trim() || '').join('\n\n');

    if (create_new) {
      // Créer une nouvelle note fusionnée
      const newTitle = title || `Fusion de ${orderedNotes.length} notes`;
      // [TEMP] USER_ID HARDCODED FOR DEV/LLM
      const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
      const insertPayload: any = {
        source_title: newTitle,
        markdown_content: merged_content,
        html_content: '', // à générer côté front ou via un service si besoin
        folder_id: folder_id || null,
        classeur_id: finalClasseurId,
        user_id: USER_ID,
      };
      // Optionnel : générer le html_content ici si tu as une fonction utilitaire
      const { data: inserted, error: insertError } = await supabase
        .from('articles')
        .insert([insertPayload])
        .select('id, source_title, markdown_content, folder_id, classeur_id, created_at')
        .single();
      if (insertError || !inserted) {
        return new Response(JSON.stringify({ error: insertError?.message || 'Erreur lors de la création de la note fusionnée.' }), { status: 500 });
      }
      return new Response(
        JSON.stringify({
          created_note: inserted,
          merged_from: orderedNotes.map(n => ({ id: n.id, title: n.source_title })),
        }),
        { status: 201 }
      );
    }

    // Fusion virtuelle (comportement par défaut)
    return new Response(
      JSON.stringify({
        merged_content,
        notes: orderedNotes.map(n => ({ id: n.id, title: n.source_title }))
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * Endpoint: POST /api/v1/note/merge
 * Payload attendu : { note_ids: string[], order?: string[] }
 * - Récupère toutes les notes, les concatène dans l'ordre donné (ou note_ids)
 * - Retourne le markdown fusionné (pas d'écriture en base)
 * - Réponses :
 *   - 200 : { merged_content, notes }
 *   - 404 : { error: 'Certaines notes sont introuvables.' }
 *   - 422 : { error: 'Payload invalide', details }
 *   - 500 : { error: string }
 */ 
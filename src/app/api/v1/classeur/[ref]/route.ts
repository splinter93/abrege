import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';

export async function PUT(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  try {
    const classeurId = params.ref;
    const body = await request.json();
    const { name, emoji, color, position } = body;

    // Validation des données
    if (!name && !emoji && !color && position === undefined) {
      return NextResponse.json(
        { error: 'Au moins un champ à mettre à jour est requis' },
        { status: 400 }
      );
    }

    // Préparer les données à mettre à jour
    const updateData: any = {};
    if (name) updateData.name = name;
    if (emoji) updateData.emoji = emoji;
    if (color) updateData.color = color;
    if (position !== undefined) updateData.position = position;

    // Mettre à jour le classeur
    const { data: classeur, error } = await supabase
      .from('classeurs')
      .update(updateData)
      .eq('id', classeurId)
      .select()
      .single();

    if (error) {
      console.error('[API] ❌ Erreur mise à jour classeur:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!classeur) {
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404 }
      );
    }

    console.log('[API] ✅ Classeur mis à jour:', classeur.name);
    return NextResponse.json({ classeur });

  } catch (error) {
    console.error('[API] ❌ Erreur serveur mise à jour classeur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  try {
    const classeurId = params.ref;

    // Supprimer le classeur
    const { error } = await supabase
      .from('classeurs')
      .delete()
      .eq('id', classeurId);

    if (error) {
      console.error('[API] ❌ Erreur suppression classeur:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Classeur supprimé:', classeurId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API] ❌ Erreur serveur suppression classeur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
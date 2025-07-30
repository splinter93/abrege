import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, user_id, position, emoji, color } = body;

    // Validation des données requises
    if (!name || !user_id) {
      return NextResponse.json(
        { error: 'Nom et user_id sont requis' },
        { status: 400 }
      );
    }

    // Créer le classeur
    const { data: classeur, error } = await supabase
      .from('classeurs')
      .insert({
        name,
        user_id,
        position: position || 0,
        emoji: emoji || '📁',
        color: color || '#808080'
      })
      .select()
      .single();

    if (error) {
      console.error('[API] ❌ Erreur création classeur:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Classeur créé:', classeur.name);
    return NextResponse.json({ classeur }, { status: 201 });

  } catch (error) {
    console.error('[API] ❌ Erreur serveur création classeur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 
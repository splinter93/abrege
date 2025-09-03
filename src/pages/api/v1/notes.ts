import { supabase } from '@/supabaseClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { classeurId } = req.query;
  
  if (!classeurId) {
    return res.status(400).json({ error: 'classeurId requis' });
  }

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('classeur_id', classeurId)
    .is('trashed_at', null) // 🔧 CORRECTION: Exclure les notes supprimées
    .order('created_at', { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ notes: data });
} 
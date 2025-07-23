import { supabase } from '@/supabaseClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase.from('classeurs').select('id, name, emoji, color, position, created_at, updated_at');
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
} 
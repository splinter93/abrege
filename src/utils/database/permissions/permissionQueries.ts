/**
 * Queries pour les permissions et partage
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - 1 fichier = 1 responsabilité
 */

import { createClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import type { ApiContext } from '@/utils/database/types/databaseTypes';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);




import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './utils/supabaseClientSingleton';

/** Singleton client to avoid multiple GoTrueClient instances in browser */
export const supabase: SupabaseClient = getSupabaseClient();

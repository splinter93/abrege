import { getSupabaseClient } from './utils/supabaseClientSingleton';

// ✅ Singleton client to avoid multiple GoTrueClient instances in browser
export const supabase = getSupabaseClient();
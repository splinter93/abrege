import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '@/config/env';

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Get singleton Supabase client instance
 * Prevents multiple client creation warnings
 * 
 * @returns Singleton SupabaseClient instance
 * @throws Error if environment variables are missing
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(ENV.supabase.url, ENV.supabase.anonKey);
  }
  
  return supabaseClientInstance;
}



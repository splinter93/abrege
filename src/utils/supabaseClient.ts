import { createClient } from '@supabase/supabase-js';

/**
 * Crée un client Supabase avec gestion sécurisée des variables d'environnement
 * Évite les erreurs de build quand les variables ne sont pas disponibles
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Vérifier que les variables d'environnement sont disponibles
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variables d\'environnement Supabase manquantes: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Crée un client Supabase avec la clé anon (pour les opérations côté client)
 */
export function createSupabaseAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Vérifier que les variables d'environnement sont disponibles
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variables d\'environnement Supabase manquantes: NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
} 
import { createClient } from '@supabase/supabase-js';
import type { ResourceType } from './slugGenerator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class ResourceResolver {
  private static isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private static getTableName(type: ResourceType): string {
    switch (type) {
      case 'note': return 'articles';
      case 'folder': return 'folders';
      case 'classeur': return 'classeurs';
    }
  }

  public static async resolveRef(
    ref: string, 
    type: ResourceType,
    userId: string,
    userToken?: string
  ): Promise<string | null> {
    // Si c'est un UUID, retourner directement
    if (this.isUUID(ref)) {
      return ref;
    }
    
    // Sinon, chercher par slug avec authentification
    try {
      let supabaseClient = supabase;
      
      // Si on a un token, créer un client authentifié
      if (userToken) {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${userToken}`
            }
          }
        });
      }
      
      const { data } = await supabaseClient
        .from(this.getTableName(type))
        .select('id')
        .eq('slug', ref)
        .eq('user_id', userId)
        .single();
      
      return data?.id || null;
    } catch (error) {
      console.error('Erreur lors de la résolution de référence:', error);
      return null;
    }
  }
} 
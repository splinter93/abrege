import { createClient } from '@supabase/supabase-js';
import type { ResourceType } from './slugGenerator';
import { logApi } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// IMPORTANT: L'API V2 est utilisée par l'Agent côté serveur sans JWT utilisateur.
// Pour éviter les erreurs RLS tout en garantissant la sécurité, on utilise la clé Service Role
// et on applique systématiquement des filtres user_id dans toutes les requêtes.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class V2ResourceResolver {
  /**
   * Résout une référence (UUID ou slug) vers un UUID pour les endpoints V2
   */
  public static async resolveRef(
    ref: string, 
    type: ResourceType,
    userId: string,
    context: { operation: string; component: string },
    userToken?: string
  ): Promise<{ success: true; id: string } | { success: false; error: string; status: number }> {
    
    try {
      // ✅ LOGGING DÉTAILLÉ pour debug
      console.log('🔍 [V2ResourceResolver] Tentative de résolution:', {
        ref,
        type,
        userId,
        hasUserToken: !!userToken,
        context
      });
      
      logApi.info(`🔍 Tentative de résolution: ${ref} (type: ${type}, userId: ${userId})`, context);
      
      // Utiliser directement le service role key au lieu de ResourceResolver
      const resolvedId = await this.resolveRefDirect(ref, type, userId);
      console.log('🔍 [V2ResourceResolver] Résultat résolution directe:', {
        resolvedId,
        hasResolvedId: !!resolvedId
      });
      
      if (!resolvedId) {
        const errorMsg = `❌ Référence non trouvée: ${ref} (type: ${type})`;
        console.error(errorMsg, { ref, type, userId, context });
        logApi.error(errorMsg, context);
        return {
          success: false,
          error: `${type === 'note' ? 'Note' : type === 'folder' ? 'Dossier' : 'Classeur'} non trouvé`,
          status: 404
        };
      }

      console.log('✅ [V2ResourceResolver] Référence résolue avec succès:', {
        ref,
        resolvedId,
        type
      });
      
      logApi.info(`✅ Référence résolue: ${ref} → ${resolvedId}`, context);
      return { success: true, id: resolvedId };

    } catch (error) {
      const errorMsg = `❌ Erreur résolution: ${error}`;
      console.error(errorMsg, { error, ref, type, userId, context });
      logApi.error(errorMsg, context);
      return {
        success: false,
        error: 'Erreur lors de la résolution de la référence',
        status: 500
      };
    }
  }

  /**
   * Résout directement une référence en utilisant le service role key
   */
  private static async resolveRefDirect(
    ref: string, 
    type: ResourceType,
    userId: string
  ): Promise<string | null> {
    const tableName = this.getTableName(type);
    
    console.log('🔍 [V2ResourceResolver] Résolution directe:', {
      ref,
      type,
      tableName,
      userId
    });
    
    // ✅ 1. Nettoyer l'ID (remplacer les tirets longs par des tirets courts)
    const cleanRef = ref.replace(/‑/g, '-'); // Remplace les em-dash (‑) par des hyphens (-)
    console.log('🧹 [V2ResourceResolver] Référence nettoyée:', {
      original: ref,
      cleaned: cleanRef,
      hasEmDash: ref.includes('‑'),
      hasHyphen: ref.includes('-')
    });
    
    // ✅ 2. Si c'est un UUID, vérifier qu'il existe et appartient à l'utilisateur
    if (this.isUUID(cleanRef)) {
      console.log('🔍 [V2ResourceResolver] Référence est un UUID, validation...');
      
      try {
        const { data } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', cleanRef)
          .eq('user_id', userId)
          .single();
        
        console.log('✅ [V2ResourceResolver] UUID validé:', {
          found: !!data,
          id: data?.id || null
        });
        
        return data?.id || null;
      } catch (error) {
        console.error(`❌ [V2ResourceResolver] Erreur validation UUID ${cleanRef}:`, error);
        return null;
      }
    }
    
    // ✅ 3. Sinon, chercher par slug (utiliser la référence originale pour le slug)
    console.log('🔍 [V2ResourceResolver] Référence n\'est pas un UUID, recherche par slug...');
    
    try {
      const { data } = await supabase
        .from(tableName)
        .select('id')
        .eq('slug', ref) // Utiliser ref original pour le slug
        .eq('user_id', userId)
        .single();
      
      console.log('✅ [V2ResourceResolver] Slug résolu:', {
        slug: ref,
        found: !!data,
        id: data?.id || null
      });
      
      return data?.id || null;
    } catch (error) {
      console.error(`❌ [V2ResourceResolver] Erreur résolution slug ${ref}:`, error);
      return null;
    }
  }

  /**
   * Vérifie qu'une ressource existe et appartient à l'utilisateur
   */
  public static async validateResource(
    id: string,
    type: ResourceType,
    userId: string,
    context: { operation: string; component: string }
  ): Promise<{ success: true; data: unknown } | { success: false; error: string; status: number }> {
    
    try {
      // ✅ 1. Nettoyer l'ID (remplacer les tirets longs par des tirets courts)
      const cleanId = id.replace(/‑/g, '-'); // Remplace les em-dash (‑) par des hyphens (-)
      
      const tableName = this.getTableName(type);
      const { data, error } = await supabase
        .from(tableName)
        .select('id, user_id')
        .eq('id', cleanId)
        .single();

      if (error || !data) {
        logApi.error(`❌ Ressource non trouvée: ${id}`, context);
        return {
          success: false,
          error: `${type === 'note' ? 'Note' : type === 'folder' ? 'Dossier' : 'Classeur'} non trouvé`,
          status: 404
        };
      }

      if (data.user_id !== userId) {
        logApi.error(`❌ Accès refusé: ${id}`, context);
        return {
          success: false,
          error: 'Accès refusé',
          status: 403
        };
      }

      logApi.info(`✅ Ressource validée: ${id}`, context);
      return { success: true, data };

    } catch (error) {
      logApi.error(`❌ Erreur validation: ${error}`, context);
      return {
        success: false,
        error: 'Erreur lors de la validation',
        status: 500
      };
    }
  }

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
} 
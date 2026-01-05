import { createClient } from '@supabase/supabase-js';
import type { ResourceType } from './slugGenerator';
import { logger, LogCategory } from './logger';

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
      logger.debug(LogCategory.API, '[V2ResourceResolver] 🔍 Tentative de résolution', {
        ref,
        type,
        userId,
        hasUserToken: !!userToken,
        operation: context.operation,
        component: context.component
      });
      
      // Utiliser directement le service role key au lieu de ResourceResolver
      const resolvedId = await this.resolveRefDirect(ref, type, userId);
      logger.debug(LogCategory.API, '[V2ResourceResolver] 🔍 Résultat résolution directe', {
        resolvedId,
        hasResolvedId: !!resolvedId
      });
      
      if (!resolvedId) {
        const errorMsg = `❌ Référence non trouvée: ${ref} (type: ${type})`;
        logger.error(LogCategory.API, errorMsg, {
          ref,
          type,
          userId,
          operation: context.operation,
          component: context.component
        });
        return {
          success: false,
          error: `${type === 'note' ? 'Note' : type === 'folder' ? 'Dossier' : 'Classeur'} non trouvé`,
          status: 404
        };
      }

      logger.info(LogCategory.API, '[V2ResourceResolver] ✅ Référence résolue avec succès', {
        ref,
        resolvedId,
        type
      });
      
      return { success: true, id: resolvedId };

    } catch (error) {
      const errorMsg = `❌ Erreur résolution: ${error}`;
      logger.error(LogCategory.API, errorMsg, {
        error: error instanceof Error ? error.message : String(error),
        ref,
        type,
        userId,
        operation: context.operation,
        component: context.component
      }, error instanceof Error ? error : undefined);
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
    
    logger.debug(LogCategory.API, '[V2ResourceResolver] 🔍 Résolution directe', {
      ref,
      type,
      tableName,
      userId
    });
    
    // ✅ 1. Nettoyer l'ID (remplacer les tirets longs par des tirets courts)
    const cleanRef = ref.replace(/‑/g, '-'); // Remplace les em-dash (‑) par des hyphens (-)
    logger.debug(LogCategory.API, '[V2ResourceResolver] 🧹 Référence nettoyée', {
      original: ref,
      cleaned: cleanRef,
      hasEmDash: ref.includes('‑'),
      hasHyphen: ref.includes('-')
    });
    
    // ✅ 2. Si c'est un UUID, vérifier qu'il existe et appartient à l'utilisateur
    if (this.isUUID(cleanRef)) {
      logger.debug(LogCategory.API, '[V2ResourceResolver] 🔍 Référence est un UUID, validation...');
      
      try {
        const { data } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', cleanRef)
          .eq('user_id', userId)
          .single();
        
        logger.debug(LogCategory.API, '[V2ResourceResolver] ✅ UUID validé', {
          found: !!data,
          id: data?.id || null
        });
        
        return data?.id || null;
      } catch (error) {
        logger.error(LogCategory.API, `❌ [V2ResourceResolver] Erreur validation UUID ${cleanRef}`, {
          error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : undefined);
        return null;
      }
    }
    
    // ✅ 3. Sinon, chercher par slug (utiliser la référence originale pour le slug)
    logger.debug(LogCategory.API, '[V2ResourceResolver] 🔍 Référence n\'est pas un UUID, recherche par slug...');
    
    try {
      const { data } = await supabase
        .from(tableName)
        .select('id')
        .eq('slug', ref) // Utiliser ref original pour le slug
        .eq('user_id', userId)
        .single();
      
      logger.debug(LogCategory.API, '[V2ResourceResolver] ✅ Slug résolu', {
        slug: ref,
        found: !!data,
        id: data?.id || null
      });
      
      return data?.id || null;
    } catch (error) {
      logger.error(LogCategory.API, `❌ [V2ResourceResolver] Erreur résolution slug ${ref}`, {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
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
        logger.error(LogCategory.API, `❌ Ressource non trouvée: ${id}`, {
          id,
          type,
          userId,
          operation: context.operation,
          component: context.component
        });
        return {
          success: false,
          error: `${type === 'note' ? 'Note' : type === 'folder' ? 'Dossier' : 'Classeur'} non trouvé`,
          status: 404
        };
      }

      if (data.user_id !== userId) {
        logger.error(LogCategory.API, `❌ Accès refusé: ${id}`, {
          id,
          type,
          userId,
          resourceUserId: data.user_id,
          operation: context.operation,
          component: context.component
        });
        return {
          success: false,
          error: 'Accès refusé',
          status: 403
        };
      }

      logger.info(LogCategory.API, `✅ Ressource validée: ${id}`, {
        id,
        type,
        userId,
        operation: context.operation,
        component: context.component
      });
      return { success: true, data };

    } catch (error) {
      logger.error(LogCategory.API, `❌ Erreur validation: ${error}`, {
        id,
        type,
        userId,
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        component: context.component
      }, error instanceof Error ? error : undefined);
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
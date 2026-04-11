import { createClient } from '@supabase/supabase-js';
import type { ResourceType } from './slugGenerator';
import { logger, LogCategory } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
// IMPORTANT: L'API V2 est utilisée par l'Agent côté serveur sans JWT utilisateur.
// Pour éviter les erreurs RLS tout en garantissant la sécurité, on utilise la clé Service Role
// et on applique systématiquement des filtres user_id dans toutes les requêtes.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Guard: Supabase module-level client. Values will always be set in Node.js runtime
// (Next.js API routes). The fallbacks prevent a hard crash during static analysis / tests.
const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseServiceKey || 'service_role_placeholder',
);

export class V2ResourceResolver {
  /**
   * Résout une référence (UUID ou slug) vers un UUID pour les endpoints V2
   */
  public static async resolveRef(
    ref: string,
    type: ResourceType,
    userId: string,
    context: { operation: string; component: string },
  ): Promise<{ success: true; id: string } | { success: false; error: string; status: number }> {
    try {
      logger.debug(LogCategory.API, '[V2ResourceResolver] resolveRef', {
        ref,
        type,
        userId,
        operation: context.operation,
        component: context.component,
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
        const { data, error: ownerErr } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', cleanRef)
          .eq('user_id', userId)
          .maybeSingle();

        if (ownerErr) {
          logger.error(LogCategory.API, `❌ [V2ResourceResolver] Erreur validation UUID ${cleanRef}`, {
            error: ownerErr.message,
          });
          return null;
        }

        logger.debug(LogCategory.API, '[V2ResourceResolver] ✅ UUID validé (propriétaire)', {
          found: !!data,
          id: data?.id || null,
        });

        if (data?.id) {
          return data.id;
        }

        if (type === 'classeur') {
          const sharedId = await this.resolveSharedClasseurUuid(cleanRef, userId);
          if (sharedId) return sharedId;
        }

        return null;
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
      const { data, error: slugOwnerErr } = await supabase
        .from(tableName)
        .select('id')
        .eq('slug', ref) // Utiliser ref original pour le slug
        .eq('user_id', userId)
        .maybeSingle();

      if (slugOwnerErr) {
        logger.error(LogCategory.API, `❌ [V2ResourceResolver] Erreur résolution slug ${ref}`, {
          error: slugOwnerErr.message,
        });
        return null;
      }

      logger.debug(LogCategory.API, '[V2ResourceResolver] ✅ Slug résolu (propriétaire)', {
        slug: ref,
        found: !!data,
        id: data?.id || null,
      });

      if (data?.id) {
        return data.id;
      }

      if (type === 'classeur') {
        const sharedSlugId = await this.resolveSharedClasseurSlug(ref, userId);
        if (sharedSlugId) return sharedSlugId;
      }

      return null;
    } catch (error) {
      logger.error(LogCategory.API, `❌ [V2ResourceResolver] Erreur résolution slug ${ref}`, {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /** Accès lecteur : partage classeur actif. */
  private static async resolveSharedClasseurUuid(
    classeurId: string,
    viewerId: string,
  ): Promise<string | null> {
    const { data: share } = await supabase
      .from('classeur_shares')
      .select('classeur_id')
      .eq('classeur_id', classeurId)
      .eq('shared_with', viewerId)
      .maybeSingle();
    if (!share?.classeur_id) return null;

    const { data: c } = await supabase
      .from('classeurs')
      .select('id')
      .eq('id', classeurId)
      .eq('is_in_trash', false)
      .maybeSingle();
    return c?.id ?? null;
  }

  private static async resolveSharedClasseurSlug(
    slug: string,
    viewerId: string,
  ): Promise<string | null> {
    // Single join-style query: fetch candidate IDs first, then check shares in one call.
    const { data: candidates, error } = await supabase
      .from('classeurs')
      .select('id')
      .eq('slug', slug)
      .eq('is_in_trash', false);
    if (error || !candidates?.length) return null;

    const candidateIds = (candidates as { id: string }[]).map((r) => r.id);

    const { data: shares, error: sErr } = await supabase
      .from('classeur_shares')
      .select('classeur_id')
      .in('classeur_id', candidateIds)
      .eq('shared_with', viewerId)
      .limit(1);
    if (sErr || !shares?.length) return null;

    return (shares[0] as { classeur_id: string }).classeur_id;
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
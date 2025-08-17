import { createClient } from '@supabase/supabase-js';
import { ResourceResolver } from './resourceResolver';
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
      logApi('v2_resource_resolve', `🔍 Tentative de résolution: ${ref} (type: ${type}, userId: ${userId})`, context);
      
      const resolvedId = await ResourceResolver.resolveRef(ref, type, userId, userToken);
      
      if (!resolvedId) {
        logApi('v2_resource_resolve', `❌ Référence non trouvée: ${ref} (type: ${type})`, context);
        return {
          success: false,
          error: `${type === 'note' ? 'Note' : type === 'folder' ? 'Dossier' : 'Classeur'} non trouvé`,
          status: 404
        };
      }

      logApi('v2_resource_resolve', `✅ Référence résolue: ${ref} → ${resolvedId}`, context);
      return { success: true, id: resolvedId };

    } catch (error) {
      logApi('v2_resource_resolve', `❌ Erreur résolution: ${error}`, context);
      return {
        success: false,
        error: 'Erreur lors de la résolution de la référence',
        status: 500
      };
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
  ): Promise<{ success: true; data: any } | { success: false; error: string; status: number }> {
    
    try {
      const tableName = this.getTableName(type);
      const { data, error } = await supabase
        .from(tableName)
        .select('id, user_id')
        .eq('id', id)
        .single();

      if (error || !data) {
        logApi('v2_resource_validate', `❌ Ressource non trouvée: ${id}`, context);
        return {
          success: false,
          error: `${type === 'note' ? 'Note' : type === 'folder' ? 'Dossier' : 'Classeur'} non trouvé`,
          status: 404
        };
      }

      if (data.user_id !== userId) {
        logApi('v2_resource_validate', `❌ Accès refusé: ${id}`, context);
        return {
          success: false,
          error: 'Accès refusé',
          status: 403
        };
      }

      logApi('v2_resource_validate', `✅ Ressource validée: ${id}`, context);
      return { success: true, data };

    } catch (error) {
      logApi('v2_resource_validate', `❌ Erreur validation: ${error}`, context);
      return {
        success: false,
        error: 'Erreur lors de la validation',
        status: 500
      };
    }
  }

  private static getTableName(type: ResourceType): string {
    switch (type) {
      case 'note': return 'articles';
      case 'folder': return 'folders';
      case 'classeur': return 'classeurs';
    }
  }
} 
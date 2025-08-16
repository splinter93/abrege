import { createClient } from '@supabase/supabase-js';
import { SlugGenerator } from '@/utils/slugGenerator';
import { simpleLogger as logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;

/**
 * Service centralisé pour la gestion des slugs et URLs publiques
 * Garantit la cohérence et la robustesse du système
 */
export class SlugAndUrlService {
  private static supabase = createClient(supabaseUrl, supabaseAnonKey);

  /**
   * Génère un slug unique et met à jour l'URL publique si nécessaire
   * @param title - Le titre de la note
   * @param userId - L'ID de l'utilisateur
   * @param noteId - L'ID de la note (optionnel, pour les mises à jour)
   * @param clientOverride - Client Supabase personnalisé (optionnel)
   * @returns Le slug généré
   */
  static async generateSlugAndUpdateUrl(
    title: string,
    userId: string,
    noteId?: string,
    clientOverride?: any
  ): Promise<{ slug: string; publicUrl: string | null }> {
    try {
      const supabase = clientOverride || this.supabase;
      
      // 1. Générer le slug unique
      const slug = await SlugGenerator.generateSlug(title, 'note', userId, noteId, supabase);
      
      // 2. Récupérer le username de l'utilisateur
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single();

      if (userError || !user?.username) {
        throw new Error(`Impossible de récupérer le username pour l'utilisateur ${userId}`);
      }

      // 3. Construire l'URL publique
      const publicUrl = `${apiBaseUrl}/@${user.username}/${slug}`;

      // 4. Si on a un noteId, mettre à jour la base de données
      if (noteId) {
        const { error: updateError } = await supabase
          .from('articles')
          .update({ 
            slug,
            public_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', noteId)
          .eq('user_id', userId);

        if (updateError) {
          logger.error(`Erreur lors de la mise à jour du slug/URL pour la note ${noteId}:`, updateError);
          throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
        }

        logger.dev(`✅ Slug et URL mis à jour pour la note ${noteId}: ${slug} -> ${publicUrl}`);
      }

      return { slug, publicUrl };
    } catch (error) {
      logger.error('Erreur dans generateSlugAndUpdateUrl:', error);
      throw error;
    }
  }

  /**
   * Met à jour le slug et l'URL publique d'une note existante
   * @param noteId - L'ID de la note
   * @param newTitle - Le nouveau titre
   * @param userId - L'ID de l'utilisateur
   * @param clientOverride - Client Supabase personnalisé (optionnel)
   * @returns Le nouveau slug et l'URL publique
   */
  static async updateNoteSlugAndUrl(
    noteId: string,
    newTitle: string,
    userId: string,
    clientOverride?: any
  ): Promise<{ slug: string; publicUrl: string }> {
    try {
      const supabase = clientOverride || this.supabase;

      // 1. Vérifier que la note existe et appartient à l'utilisateur
      const { data: note, error: fetchError } = await supabase
        .from('articles')
        .select('id, source_title, slug, ispublished, public_url')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !note) {
        throw new Error(`Note non trouvée ou accès refusé: ${noteId}`);
      }

      // 2. Vérifier si le titre a réellement changé
      if (note.source_title === newTitle) {
        logger.dev(`Titre inchangé pour la note ${noteId}, pas de mise à jour du slug`);
        return { 
          slug: note.slug!, 
          publicUrl: note.public_url || this.buildPublicUrl(userId, note.slug!)
        };
      }

      // 3. Générer le nouveau slug et URL
      const { slug, publicUrl } = await this.generateSlugAndUpdateUrl(
        newTitle,
        userId,
        noteId,
        supabase
      );

      // 4. Mettre à jour le titre également
      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          source_title: newTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour du titre: ${updateError.message}`);
      }

      logger.dev(`✅ Note ${noteId} mise à jour: titre="${newTitle}", slug="${slug}"`);
      return { slug, publicUrl: publicUrl! };
    } catch (error) {
      logger.error('Erreur dans updateNoteSlugAndUrl:', error);
      throw error;
    }
  }

  /**
   * Construit l'URL publique pour une note
   * @param userId - L'ID de l'utilisateur
   * @param slug - Le slug de la note
   * @returns L'URL publique
   */
  static async buildPublicUrl(userId: string, slug: string): Promise<string> {
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    if (userError || !user?.username) {
      throw new Error(`Impossible de récupérer le username pour l'utilisateur ${userId}`);
    }

    return `${apiBaseUrl}/@${user.username}/${slug}`;
  }

  /**
   * Vérifie et corrige les URLs publiques d'un utilisateur
   * @param userId - L'ID de l'utilisateur
   * @returns Le nombre d'URLs corrigées
   */
  static async validateAndFixUserUrls(userId: string): Promise<number> {
    try {
      let correctedCount = 0;

      // Récupérer toutes les notes de l'utilisateur
      const { data: notes, error: fetchError } = await this.supabase
        .from('articles')
        .select('id, slug, source_title, public_url, ispublished')
        .eq('user_id', userId);

      if (fetchError) {
        throw new Error(`Erreur lors de la récupération des notes: ${fetchError.message}`);
      }

      // Récupérer le username de l'utilisateur
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single();

      if (userError || !user?.username) {
        throw new Error(`Impossible de récupérer le username pour l'utilisateur ${userId}`);
      }

      for (const note of notes) {
        if (!note.slug) {
          logger.warn(`Note ${note.id} sans slug, génération d'un nouveau slug`);
          const { slug } = await this.generateSlugAndUpdateUrl(
            note.source_title,
            userId,
            note.id,
            this.supabase
          );
          correctedCount++;
          continue;
        }

        const expectedUrl = `${apiBaseUrl}/@${user.username}/${note.slug}`;
        
        // Vérifier si l'URL publique est correcte
        if (note.public_url !== expectedUrl) {
          logger.dev(`Correction de l'URL pour la note ${note.id}: ${note.public_url} -> ${expectedUrl}`);
          
          const { error: updateError } = await this.supabase
            .from('articles')
            .update({ public_url: expectedUrl })
            .eq('id', note.id)
            .eq('user_id', userId);

          if (updateError) {
            logger.error(`Erreur lors de la correction de l'URL pour la note ${note.id}:`, updateError);
          } else {
            correctedCount++;
          }
        }
      }

      logger.dev(`✅ ${correctedCount} URLs corrigées pour l'utilisateur ${userId}`);
      return correctedCount;
    } catch (error) {
      logger.error('Erreur dans validateAndFixUserUrls:', error);
      throw error;
    }
  }

  /**
   * Vérifie la cohérence des slugs et URLs dans toute la base
   * @returns Rapport de validation
   */
  static async validateSystemIntegrity(): Promise<{
    totalNotes: number;
    validSlugs: number;
    validUrls: number;
    issues: Array<{ noteId: string; issue: string; fix?: string }>;
  }> {
    try {
      const report = {
        totalNotes: 0,
        validSlugs: 0,
        validUrls: 0,
        issues: [] as Array<{ noteId: string; issue: string; fix?: string }>
      };

      // Récupérer toutes les notes avec leurs utilisateurs
      const { data: notes, error: fetchError } = await this.supabase
        .from('articles')
        .select(`
          id,
          slug,
          source_title,
          public_url,
          user_id,
          users!inner(username)
        `);

      if (fetchError) {
        throw new Error(`Erreur lors de la récupération des notes: ${fetchError.message}`);
      }

      report.totalNotes = notes.length;

      for (const note of notes) {
        const username = (note as any).users?.username;
        
        // Vérifier le slug
        if (!note.slug) {
          report.issues.push({
            noteId: note.id,
            issue: 'Slug manquant',
            fix: 'Générer un slug basé sur le titre'
          });
        } else {
          report.validSlugs++;
        }

        // Vérifier l'URL publique
        if (note.public_url) {
          const expectedUrl = `${apiBaseUrl}/@${username}/${note.slug}`;
          if (note.public_url === expectedUrl) {
            report.validUrls++;
          } else {
            report.issues.push({
              noteId: note.id,
              issue: `URL publique incorrecte: ${note.public_url}`,
              fix: `Corriger vers: ${expectedUrl}`
            });
          }
        } else {
          report.issues.push({
            noteId: note.id,
            issue: 'URL publique manquante',
            fix: `Générer: ${apiBaseUrl}/@${username}/${note.slug}`
          });
        }
      }

      return report;
    } catch (error) {
      logger.error('Erreur dans validateSystemIntegrity:', error);
      throw error;
    }
  }
} 
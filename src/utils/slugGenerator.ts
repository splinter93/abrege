import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// IMPORTANT: L'API V2 est utilisée par l'Agent côté serveur sans JWT utilisateur.
// Pour éviter les erreurs RLS tout en garantissant la sécurité, on utilise la clé Service Role
// et on applique systématiquement des filtres user_id dans toutes les requêtes.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const defaultClient = createClient(supabaseUrl, supabaseServiceKey);

export type ResourceType = 'note' | 'folder' | 'classeur';

export class SlugGenerator {
  private static getTableName(type: ResourceType): string {
    switch (type) {
      case 'note': return 'articles';
      case 'folder': return 'folders';
      case 'classeur': return 'classeurs';
    }
  }

  private static async checkUniqueness(
    supabase: SupabaseClient,
    slug: string, 
    type: ResourceType,
    userId: string,
    excludeId?: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from(this.getTableName(type))
      .select('id')
      .eq('slug', slug)
      .eq('user_id', userId);

    if (error) {
      // Si erreur (RLS), considérer non-unique pour forcer une tentative suivante plutôt que planter
      return false;
    }
    if (!data) return true;
    if (excludeId) {
      // Exclure l'ID de la note actuelle de la vérification d'unicité
      return !data.some(item => item.id === excludeId);
    }
    return data.length === 0;
  }

  public static async generateSlug(
    title: string,
    type: ResourceType,
    userId: string,
    excludeId?: string,
    clientOverride?: SupabaseClient
  ): Promise<string> {
    // 🔧 CORRECTION: Forcer l'utilisation du client authentifié
    if (!clientOverride) {
      throw new Error('SlugGenerator.generateSlug requires an authenticated Supabase client');
    }
    
    const supabase = clientOverride;
    const baseSlug = this.slugify(title);
    let candidateSlug = baseSlug;
    let counter = 1;
    
    while (!(await this.checkUniqueness(supabase, candidateSlug, type, userId, excludeId))) {
      counter++;
      candidateSlug = `${baseSlug}-${counter}`;
    }
    
    return candidateSlug;
  }

  private static slugify(text: string): string {
    if (!text || typeof text !== 'string') {
      return 'untitled';
    }
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 120);
  }
} 
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    slug: string, 
    type: ResourceType,
    userId: string,
    excludeId?: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from(this.getTableName(type))
      .select('id')
      .eq('slug', slug)
      .eq('user_id', userId);
    
    if (!data) return true;
    
    if (excludeId) {
      return !data.some(item => item.id !== excludeId);
    }
    
    return data.length === 0;
  }

  public static async generateSlug(
    title: string,
    type: ResourceType,
    userId: string,
    excludeId?: string
  ): Promise<string> {
    const baseSlug = this.slugify(title);
    let candidateSlug = baseSlug;
    let counter = 1;
    
    while (!(await this.checkUniqueness(candidateSlug, type, userId, excludeId))) {
      counter++;
      candidateSlug = `${baseSlug}-${counter}`;
    }
    
    return candidateSlug;
  }

  private static slugify(text: string): string {
    // ✅ Vérification pour éviter l'erreur undefined
    if (!text || typeof text !== 'string') {
      return 'untitled';
    }
    
    return text
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
} 
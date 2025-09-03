import type { TrashItem, TrashStatistics } from '@/types/supabase';

/**
 * Service pour la gestion de la corbeille
 * Centralise toutes les opérations liées à la corbeille
 */
export class TrashService {
  private static readonly API_BASE = '/api/v2/trash';

  /**
   * Récupérer les headers d'authentification pour les appels API
   * Utilise la même logique que V2UnifiedApi
   */
  private static async getAuthHeaders(): Promise<HeadersInit> {
    try {
      // Importer Supabase dynamiquement (évite les erreurs SSR)
      const { createClient } = await import('@supabase/supabase-js');
      
      // Récupérer la session depuis le localStorage (côté client uniquement)
      if (typeof window !== 'undefined') {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 TrashService - Session récupérée:', {
            hasSession: !!session,
            hasError: !!error,
            userId: session?.user?.id,
            email: session?.user?.email,
            hasAccessToken: !!session?.access_token
          });
        }
        
        if (session?.access_token) {
          // Ajouter le token d'authentification si disponible
          return {
            'Content-Type': 'application/json',
            'X-Client-Type': 'web',
            'Authorization': `Bearer ${session.access_token}`
          };
        }
      }
      
      // En cas d'erreur, retourner les headers de base
      return {
        'Content-Type': 'application/json',
        'X-Client-Type': 'web'
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ TrashService - Erreur récupération session:', error);
      }
      // En cas d'erreur, retourner les headers de base
      return {
        'Content-Type': 'application/json',
        'X-Client-Type': 'web'
      };
    }
  }

  /**
   * Récupère tous les éléments de la corbeille
   */
  static async getTrashItems(): Promise<{ items: TrashItem[]; statistics: TrashStatistics }> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.API_BASE, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erreur lors du chargement de la corbeille');
    }

    return data.data;
  }

  /**
   * Restaure un élément de la corbeille
   */
  static async restoreItem(resourceType: 'note' | 'folder' | 'classeur' | 'file', resourceId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.API_BASE}/restore`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        resource_type: resourceType,
        resource_id: resourceId
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erreur lors de la restauration');
    }
  }

  /**
   * Supprime définitivement un élément de la corbeille
   */
  static async permanentlyDeleteItem(resourceType: 'note' | 'folder' | 'classeur' | 'file', resourceId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`/api/v2/delete/${resourceType}/${resourceId}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erreur lors de la suppression');
    }
  }

  /**
   * Vide complètement la corbeille
   */
  static async emptyTrash(): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.API_BASE, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erreur lors du vidage de la corbeille');
    }
  }

  /**
   * Purge automatique des éléments en corbeille depuis plus de 30 jours
   */
  static async purgeOldItems(): Promise<{ deleted_items: { articles: number; folders: number; classeurs: number; files: number; total: number } }> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.API_BASE}/purge`, {
      method: 'POST',
      headers
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erreur lors de la purge');
    }

    return data.data;
  }

  /**
   * Met un élément en corbeille (utilise l'endpoint DELETE unifié)
   */
  static async moveToTrash(resourceType: 'note' | 'folder' | 'classeur' | 'file', resourceId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`/api/v2/delete/${resourceType}/${resourceId}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erreur lors de la mise en corbeille');
    }
  }

  /**
   * Calcule le nombre de jours restants avant expiration
   */
  static getDaysUntilExpiry(trashedAt: string): number {
    const now = new Date();
    const trashedDate = new Date(trashedAt);
    const expiresAt = new Date(trashedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 jours
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Formate une date pour l'affichage
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * Obtient l'icône appropriée pour un type d'élément
   */
  static getItemIcon(type: TrashItem['type']): string {
    switch (type) {
      case 'note':
        return '📄';
      case 'folder':
        return '📁';
      case 'classeur':
        return '📚';
      case 'file':
        return '📎';
      default:
        return '📄';
    }
  }

  /**
   * Obtient le label approprié pour un type d'élément
   */
  static getItemTypeLabel(type: TrashItem['type']): string {
    switch (type) {
      case 'note':
        return 'Note';
      case 'folder':
        return 'Dossier';
      case 'classeur':
        return 'Classeur';
      case 'file':
        return 'Fichier';
      default:
        return 'Élément';
    }
  }
}

import type { SafeUnknown, SafeRecord, SafeError } from '@/types/quality';
import { useFileSystemStore } from '@/store/useFileSystemStore';

import { ErrorHandler } from './errorHandler';
import { logApi, logStore, logPolling, logj } from '@/utils/logger';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

// Types pour les données d'API
interface CreateNoteData {
  source_title: string;
  notebook_id: string;
  markdown_content?: string;
  header_image?: string;
  folder_id?: string | null;
}

interface UpdateNoteData {
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string | null;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  font_family?: string;
  folder_id?: string | null;
}

interface CreateFolderData {
  name: string;
  notebook_id: string;
  parent_id?: string | null;
}

interface UpdateFolderData {
  name?: string;
  parent_id?: string | null;
}

interface CreateClasseurData {
  name: string;
  description?: string;
  icon?: string;
}

interface UpdateClasseurData {
  name?: string;
  description?: string;
  icon?: string;
  position?: number;
}

interface ApiError extends Error {
  status?: number;
  statusText?: string;
}

interface PublishNoteResponse {
  success: boolean;
  url?: string;
  message?: string;
}

/**
 * Service API optimisé pour une latence minimale
 * Met à jour directement Zustand et déclenche le polling côté client
 */
export class OptimizedApi {
  private static instance: OptimizedApi;

  private constructor() {}

  // Shadow flags
  private get shadowEnabled(): boolean {
    return process.env.NEXT_PUBLIC_SHADOW_V1 === '1';
  }
  private get useV1Only(): boolean {
    return process.env.NEXT_PUBLIC_USE_V1_ONLY === '1';
  }

  // In-memory cache for ETag
  private etagCache: Map<string, { etag: string; data: unknown }> = new Map();

  // Utils
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      return headers;
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  }

  private async fetchWithEtag(url: string, headers: HeadersInit): Promise<{ ok: boolean; status: number; data?: unknown; etag?: string; etagHit?: boolean }> {
    const cacheKey = url;
    const cached = this.etagCache.get(cacheKey);
    const h = { ...(headers || {}) } as Record<string, string>;
    if (cached?.etag) h['If-None-Match'] = cached.etag;

    const resp = await fetch(url, { headers: h });
    const etag = resp.headers.get('ETag') || undefined;
    if (resp.status === 304 && cached) {
      return { ok: true, status: 304, data: cached.data, etag: etag || cached.etag, etagHit: true };
    }
    const data = await (async () => {
      try { return await resp.json(); } catch { return undefined; }
    })();
    if (resp.ok && etag && data !== undefined) this.etagCache.set(cacheKey, { etag, data });
    return { ok: resp.ok, status: resp.status, data, etag, etagHit: false };
  }

  private normalizeClasseurs(input: unknown[]): unknown[] {
    return (Array.isArray(input) ? input : []).map(c => ({
      id: c.id,
      slug: c.slug ?? undefined,
      name: c.name,
      emoji: c.emoji ?? undefined,
      color: c.color ?? undefined,
      position: c.position ?? 0,
      created_at: c.created_at ?? undefined,
      updated_at: c.updated_at ?? undefined,
    })).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  private normalizeTree(input: unknown): unknown {
    if (!input || !input.classeur) return input;
    const stripVolatile = (x: unknown) => ({ ...x, generated_at: undefined });
    return stripVolatile({
      success: true,
      classeur: {
        id: input.classeur.id,
        slug: input.classeur.slug ?? undefined,
        name: input.classeur.name,
        emoji: input.classeur.emoji ?? undefined,
      },
      tree: Array.isArray(input.tree) ? input.tree : [],
      notes_at_root: Array.isArray(input.notes_at_root) ? input.notes_at_root : [],
      etag: input.etag ?? undefined,
    });
  }

  private shallowEqual(a: unknown, b: unknown): boolean {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  private hashShort(value: string): string {
    try { return Buffer.from(value).toString('base64').slice(0, 8); } catch { return 'hash'; }
  }

  private async shadowRead<T>(label: string, legacyFn: () => Promise<T>, v1Fn: () => Promise<T>, normalizer: (d: unknown) => any): Promise<T> {
    if (!this.shadowEnabled && !this.useV1Only) {
      return legacyFn();
    }

    const headers = await this.getAuthHeaders();
    const started = Date.now();

    const runWithTimeout = async <R>(fn: () => Promise<R>): Promise<{ ok: boolean; data?: R; ms: number; size?: number }> => {
      const t0 = Date.now();
      try {
        const r = await Promise.race([fn(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
        const ms = Date.now() - t0;
        const size = typeof r === 'string' ? r.length : JSON.stringify(r || {}).length;
        return { ok: true, data: r, ms, size };
      } catch {
        return { ok: false, ms: Date.now() - t0 };
      }
    };

    const legacyP = runWithTimeout(legacyFn);
    const v1P = runWithTimeout(v1Fn);
    const [legacyRes, v1Res] = await Promise.all([legacyP, v1P]);

    const normalize = (d: unknown) => normalizer(d);
    const legacyN = legacyRes.ok ? normalize(legacyRes.data) : undefined;
    const v1N = v1Res.ok ? normalize(v1Res.data) : undefined;

    const diff = (legacyN && v1N && !this.shallowEqual(legacyN, v1N)) ? 1 : 0;
    const logObj = {
      label: 'shadow.v1.generic',
      ok: legacyRes.ok && v1Res.ok,
      legacy_ms: legacyRes.ms,
      v1_ms: v1Res.ms,
      legacy_size: legacyRes.size,
      v1_size: v1Res.size,
      diff_count: diff,
    };
    try { logj(logObj as unknown); } catch {}

    if (this.useV1Only && v1Res.ok && v1N !== undefined) return v1Res.data as T;
    return legacyRes.data as T;
  }

  // v1 clients
  private async getClasseursV1(): Promise<any[]> {
    const headers = await this.getAuthHeaders();
    const { ok, data } = await this.fetchWithEtag('/api/v1/classeurs', headers);
    if (!ok) throw new Error('Classeurs v1 error');
    return data;
  }

  private async getTreeV1(ref: string, depth: '0'|'1'|'full' = 'full'): Promise<unknown> {
    const headers = await this.getAuthHeaders();
    const { ok, data } = await this.fetchWithEtag(`/api/v1/classeur/${encodeURIComponent(ref)}/tree?depth=${depth}`, headers);
    if (!ok) throw new Error('Tree v1 error');
    return data;
  }

  static getInstance(): OptimizedApi {
    if (!OptimizedApi.instance) {
      OptimizedApi.instance = new OptimizedApi();
    }
    return OptimizedApi.instance;
  }

  /**
   * Créer une note avec mise à jour directe de Zustand 
   */
  async createNote(noteData: CreateNoteData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📝 Création note optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch('/api/v1/note/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(noteData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[OptimizedApi] ❌ Réponse API: ${response.status} ${response.statusText}`);
        logger.error(`[OptimizedApi] ❌ Contenu erreur: ${errorText}`);
        throw new Error(`Erreur création note: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      logger.dev(`[OptimizedApi] 📋 Réponse API:`, result);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      try {
        const store = useFileSystemStore.getState();
        if (process.env.NODE_ENV === 'development') {
        logger.dev(`[OptimizedApi] 🔄 Ajout note à Zustand:`, result.note);
        }
        store.addNote(result.note);
      } catch (storeError) {
        logger.error('[OptimizedApi] ⚠️ Erreur accès store Zustand:', storeError);
        if (process.env.NODE_ENV === 'development') {
        logger.dev('[OptimizedApi] ⚠️ Store non disponible, mise à jour différée');
        }
      }
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Note ajoutée à Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur création note:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une note avec mise à jour directe de Zustand 
   */
  async updateNote(noteId: string, updateData: UpdateNoteData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🔄 Mise à jour note optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API avec [ref] au lieu de noteId direct
      const response = await fetch(`/api/v1/note/${noteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur mise à jour note: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateNote(noteId, result.note);
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Note mise à jour dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur mise à jour note:', error);
      throw error;
    }
  }

  /**
   * Supprimer une note avec mise à jour directe de Zustand 
   */
  async deleteNote(noteId: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🗑️ Suppression note optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/note/${noteId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`Erreur suppression note: ${response.statusText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.removeNote(noteId);
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Note supprimée de Zustand  en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur suppression note:', error);
      throw error;
    }
  }

  /**
   * Créer un dossier avec mise à jour directe de Zustand 
   */
  async createFolder(folderData: CreateFolderData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📁 Création dossier optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch('/api/v1/folder/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        throw new Error(`Erreur création dossier: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.addFolder(result.folder);
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Dossier ajouté à Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur création dossier:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un dossier avec mise à jour directe de Zustand 
   */
  async updateFolder(folderId: string, updateData: UpdateFolderData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🔄 Mise à jour dossier optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/folder/${folderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Erreur mise à jour dossier: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateFolder(folderId, result.folder);
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Dossier mis à jour dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur mise à jour dossier:', error);
      throw error;
    }
  }

  /**
   * Supprimer un dossier avec mise à jour directe de Zustand 
   */
  async deleteFolder(folderId: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🗑️ Suppression dossier optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/folder/${folderId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`Erreur suppression dossier: ${response.statusText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.removeFolder(folderId);
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Dossier supprimé de Zustand  en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur suppression dossier:', error);
      throw error;
    }
  }

  /**
   * Déplacer une note avec mise à jour directe de Zustand 
   */
  async moveNote(noteId: string, targetFolderId: string | null, targetClasseurId?: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📦 Déplacement note optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Préparer le payload
      const payload: unknown = {};
      if (targetFolderId !== undefined) payload.target_folder_id = targetFolderId;
      if (targetClasseurId) payload.target_classeur_id = targetClasseurId;
      
      // Appel API
      const response = await fetch(`/api/v1/note/${noteId}/move`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erreur déplacement note: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.moveNote(noteId, targetFolderId, targetClasseurId);
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Note déplacée dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur déplacement note:', error);
      throw error;
    }
  }

  /**
   * Déplacer un dossier avec mise à jour directe de Zustand 
   */
  async moveFolder(folderId: string, targetParentId: string | null, targetClasseurId?: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📦 Déplacement dossier optimisé');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Préparer le payload
      const payload: unknown = {};
      if (targetParentId !== undefined) payload.target_parent_id = targetParentId;
      if (targetClasseurId) payload.target_classeur_id = targetClasseurId;
      
      // Appel API
      const response = await fetch(`/api/v1/dossier/${folderId}/move`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erreur déplacement dossier: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.moveFolder(folderId, targetParentId, targetClasseurId);
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Dossier déplacé dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur déplacement dossier:', error);
      throw error;
    }
  }

  /**
   * Créer un classeur avec mise à jour directe de Zustand 
   */
  async createClasseur(classeurData: CreateClasseurData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 📚 Création classeur optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch('/api/v1/classeur/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(classeurData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[OptimizedApi] ❌ Réponse API: ${response.status} ${response.statusText}`);
        logger.error(`[OptimizedApi] ❌ Contenu erreur: ${errorText}`);
        throw new Error(`Erreur création classeur: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      logger.dev(`[OptimizedApi] 📋 Réponse API:`, result);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      try {
        const store = useFileSystemStore.getState();
        if (process.env.NODE_ENV === 'development') {
        logger.dev(`[OptimizedApi] 🔄 Ajout classeur à Zustand:`, result.classeur);
        }
        store.addClasseur(result.classeur);
      } catch (storeError) {
        logger.error('[OptimizedApi] ⚠️ Erreur accès store Zustand:', storeError);
        if (process.env.NODE_ENV === 'development') {
        logger.dev('[OptimizedApi] ⚠️ Store non disponible, mise à jour différée');
        }
      }
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Classeur ajouté à Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur création classeur:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un classeur avec mise à jour directe de Zustand 
   */
  async updateClasseur(classeurId: string, updateData: UpdateClasseurData) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🔄 Mise à jour classeur optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/classeur/${classeurId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Erreur mise à jour classeur: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.updateClasseur(classeurId, result.classeur);
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Classeur mis à jour dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur mise à jour classeur:', error);
      throw error;
    }
  }

  /**
   * Supprimer un classeur avec mise à jour directe de Zustand 
   */
  async deleteClasseur(classeurId: string) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🗑️ Suppression classeur optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Récupérer les headers d'authentification
      const headers = await this.getAuthHeaders();
      
      // Appel API
      const response = await fetch(`/api/v1/classeur/${classeurId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`Erreur suppression classeur: ${response.statusText}`);
      }

      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      store.removeClasseur(classeurId);
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Classeur supprimé de Zustand  en ${totalTime}ms total`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur suppression classeur:', error);
      throw error;
    }
  }

  /**
   * Réorganiser les classeurs avec mise à jour directe de Zustand 
   */
  async reorderClasseurs(updatedClasseurs: { id: string; position: number }[]) {
    if (process.env.NODE_ENV === 'development') {
    logger.dev('[OptimizedApi] 🔄 Réorganisation classeurs optimisée');
    }
    const startTime = Date.now();
    
    try {
      // Appel API avec authentification
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/v1/classeur/reorder', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ classeurs: updatedClasseurs })
      });

      if (!response.ok) {
        throw new Error(`Erreur réorganisation classeurs: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
      }

      // 🚀 Mise à jour directe de Zustand (instantanée)
      const store = useFileSystemStore.getState();
      updatedClasseurs.forEach(({ id, position }) => {
        store.updateClasseur(id, { position });
        if (process.env.NODE_ENV === 'development') {
          logger.dev(`[OptimizedApi] 📍 Position mise à jour pour classeur ${id}: ${position}`);
        }
      });
      
      // 
      
      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      logger.dev(`[OptimizedApi] ✅ Classeurs réorganisés dans Zustand  en ${totalTime}ms total`);
      }
      
      return result;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur réorganisation classeurs:', error);
      throw error;
    }
  }

  /**
   * Met à jour directement Zustand avec toutes les données
   */
  async loadClasseursWithContent() {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[OptimizedApi] 📚 Chargement classeurs avec contenu optimisé');
    }
    const startTime = Date.now();
    
    try {
      // 1. Classeurs via API simple (pas de shadow mode par défaut)
      const classeurs = await this.getClasseursV1();
      const store = useFileSystemStore.getState();
      store.setClasseurs(classeurs);

      // 2. Chargement parallèle des dossiers et notes pour tous les classeurs
      const classeursArray = Object.values(useFileSystemStore.getState().classeurs);
      const loadPromises = classeursArray.map(async (c) => {
        try {
          // Charger dossiers et notes en parallèle
          const [foldersResponse, notesResponse] = await Promise.all([
            fetch(`/api/v1/dossiers?classeurId=${c.id}`),
            fetch(`/api/v1/notes?classeurId=${c.id}`)
          ]);

          let folders = [];
          let notes = [];

          if (foldersResponse.ok) {
            const foldersData = await foldersResponse.json();
            folders = foldersData?.dossiers || [];
          }

          if (notesResponse.ok) {
            const notesData = await notesResponse.json();
            notes = notesData?.notes || [];
          }

          return { folders, notes };
        } catch (error) {
          logger.warn(`[OptimizedApi] Erreur chargement classeur ${c.id}:`, error);
          return { folders: [], notes: [] };
        }
      });

      const results = await Promise.all(loadPromises);
      
      // Mettre à jour le store avec toutes les données
      const allFolders = results.flatMap(r => r.folders);
      const allNotes = results.flatMap(r => r.notes);
      
      store.setFolders(allFolders);
      store.setNotes(allNotes);

      const totalTime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[OptimizedApi] ✅ Tous les classeurs et leur contenu chargés en ${totalTime}ms`);
      }
      return true;
    } catch (error) {
      logger.error('[OptimizedApi] ❌ Erreur loadClasseursWithContent:', error);
      throw error;
    }
  }

  /**
   * Changer la visibilité d'une note
   */
  async publishNoteREST(noteId: string, visibility: 'private' | 'public' | 'link-private' | 'link-public' | 'limited' | 'scrivia'): Promise<PublishNoteResponse> {
    const startTime = Date.now();
    const context = { operation: 'publish_note', component: 'OptimizedApi' };
    
    logApi('publish_note', `🚀 Début publication note ${noteId}`, context);
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/v1/note/${noteId}/publish`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ visibility })
      });

      if (!response.ok) {
        const error = new Error(`Erreur publication note: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      logApi('publish_note', `✅ Publication terminée en ${apiTime}ms`, context);

      return result;
    } catch (error) {
      logApi('publish_note', `❌ Erreur publication: ${error}`, context);
      throw error;
    }
  }

  /**
   * Mettre à jour l'apparence d'une note (patch partiel)
   */
  async updateNoteAppearance(noteId: string, patch: Partial<{
    header_title_in_image: boolean;
    header_image: string | null;
    header_image_offset: number;
    header_image_blur: number;
    header_image_overlay: number; // UI may send 0..1 or 0..100; API will normalize
    wide_mode: boolean;
    font_family: string;
  }>) {
    const headers = await this.getAuthHeaders();
    const resp = await fetch(`/api/v1/note/${encodeURIComponent(noteId)}/appearance`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch)
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Erreur update appearance: ${resp.status} ${resp.statusText} - ${t}`);
    }
    const json = await resp.json();
    // reflect in store
    if (json?.note) {
      useFileSystemStore.getState().updateNote(noteId, json.note);
    }
    return json;
  }
}

// Export de l'instance singleton
export const optimizedApi = OptimizedApi.getInstance(); 
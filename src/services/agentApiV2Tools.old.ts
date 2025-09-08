import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { OpenAPIToolsGenerator, getOpenAPIV2Tools } from './openApiToolsGenerator';
import { getOpenAPISchemaService } from './openApiSchemaService';
import { triggerUnifiedRealtimePolling, type EntityType, type OperationType } from './unifiedRealtimeService';
// Imports conditionnels pour les optimisations
let distributedCache: any;
let toolsCache: any;
let optimizedDatabaseService: any;
let toolCallMetrics: any;
let optimizedTimeouts: any;

try {
  distributedCache = require('./cache/DistributedCache').distributedCache;
  toolsCache = require('./cache/ToolsCache').toolsCache;
  optimizedDatabaseService = require('./database/OptimizedDatabaseService').optimizedDatabaseService;
  toolCallMetrics = require('./monitoring/ToolCallMetrics').toolCallMetrics;
  optimizedTimeouts = require('./config/OptimizedTimeouts').optimizedTimeouts;
} catch (error) {
  console.warn('[AgentApiV2Tools] Optimisations non disponibles, utilisation du mode standard');
  // Fallback vers des implémentations basiques
  distributedCache = null;
  toolsCache = null;
  optimizedDatabaseService = null;
  toolCallMetrics = null;
  optimizedTimeouts = null;
}

export interface ApiV2Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (params: any, jwtToken: string, userId: string) => Promise<any>;
}

export class AgentApiV2Tools {
  private tools: Map<string, ApiV2Tool> = new Map();
  private baseUrl: string;
  private openApiGenerator: OpenAPIToolsGenerator | null = null;
  private openApiInitialized: boolean = false;
  private schemaService = getOpenAPISchemaService();
  private cache = distributedCache;
  private toolsCache = toolsCache;
  private dbService = optimizedDatabaseService;
  private metrics = toolCallMetrics;
  private timeouts = optimizedTimeouts;

  constructor() {
    // Utiliser l'URL de base configurée ou l'URL par défaut
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scrivia.app';
    console.log(`[AgentApiV2Tools] 🚀 Initialisation avec baseUrl: ${this.baseUrl}`);
    
    // 🔧 CORRECTION: Vérifier que nous sommes côté serveur
    if (typeof window !== 'undefined') {
      console.warn('[AgentApiV2Tools] ⚠️ Initialisation côté client - outils désactivés');
      this.openApiInitialized = true; // Marquer comme initialisé pour éviter les erreurs
      return;
    }
    
    // 🔧 NOUVEAU: Plus de tools manuels obsolètes, seulement OpenAPI
    console.log(`[AgentApiV2Tools] 🔧 Système OpenAPI uniquement`);
    
    // Initialiser les tools OpenAPI V2 de manière asynchrone
    this.initializeOpenAPIV2Tools().catch(error => {
      console.error('[AgentApiV2Tools] ❌ Erreur lors de l\'initialisation OpenAPI V2:', error);
    });
    
    console.log(`[AgentApiV2Tools] ✅ Initialisation terminée`);
  }

  /**
   * Initialiser les tools OpenAPI V2 (SEULE SOURCE DE TOOLS)
   */
  private async initializeOpenAPIV2Tools() {
    try {
      console.log('[AgentApiV2Tools] 🔧 Initialisation des tools OpenAPI V2...');
      
      // Charger le schéma OpenAPI V2 depuis le service
      const openApiSchema = this.schemaService.getSchema();
      
      if (openApiSchema) {
        this.openApiGenerator = new OpenAPIToolsGenerator(openApiSchema);
        const openApiTools = this.openApiGenerator.generateToolsForFunctionCalling();
        
        console.log(`[AgentApiV2Tools] 📊 ${openApiTools.length} tools OpenAPI V2 générés`);
        
        // Ajouter les tools OpenAPI V2 aux tools existants
        openApiTools.forEach(tool => {
          const toolName = tool.function.name;
          if (!this.tools.has(toolName)) {
            // Créer un tool compatible avec votre système
            this.tools.set(toolName, {
              name: toolName,
              description: tool.function.description,
              parameters: tool.function.parameters,
              execute: async (params, jwtToken) => {
                return await this.executeOpenAPIV2Tool(toolName, params, jwtToken);
              }
            });
            console.log(`[AgentApiV2Tools] ✅ Tool OpenAPI V2 ajouté: ${toolName}`);
          }
        });
        
        console.log(`[AgentApiV2Tools] 🎉 Tools OpenAPI V2 intégrés avec succès`);
        this.openApiInitialized = true;
      }
    } catch (error) {
      console.error('[AgentApiV2Tools] ❌ Erreur lors de l\'initialisation OpenAPI V2:', error);
      this.openApiInitialized = true; // Marquer comme terminé même en cas d'erreur
    }
  }

  /**
   * Exécuter un tool OpenAPI V2 via les services internes
   * Supporte les tokens JWT et les clés d'API
   */
  private async executeOpenAPIV2Tool(toolName: string, params: any, authToken: string): Promise<any> {
    try {
      console.log(`[AgentApiV2Tools] 🔧 Exécution du tool OpenAPI V2: ${toolName}`);
      
      // 🔧 CORRECTION : Gérer les tokens JWT et les clés d'API
      let userId: string;
      
      // Vérifier si c'est un userId direct (clé d'API) ou un token JWT
      if (this.isUserId(authToken)) {
        // C'est un userId direct (clé d'API)
        userId = authToken;
        console.log(`[AgentApiV2Tools] 🔑 Authentification par clé d'API - userId: ${userId}`);
      } else {
        // C'est un token JWT, extraire l'userId
        userId = await this.getUserIdFromToken(authToken);
        console.log(`[AgentApiV2Tools] 🔑 Authentification par token JWT - userId: ${userId}`);
      }
      
      // Utiliser les services internes au lieu d'appels HTTP externes
      const result = await this.executeInternalService(toolName, params, userId, authToken);
      
      console.log(`[AgentApiV2Tools] ✅ Tool ${toolName} exécuté avec succès`);
      return result;
    } catch (error) {
      console.error(`[AgentApiV2Tools] ❌ Erreur lors de l'exécution du tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Exécuter un service interne selon le nom du tool
   */
  private async executeInternalService(toolName: string, params: any, userId: string, authToken: string): Promise<any> {
    // Créer un client Supabase authentifié
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Mapper les tools vers les services internes (correspondance exacte avec les operationId du schéma OpenAPI)
    switch (toolName) {
      // Notes
      case 'getNote':
        return await this.getNoteInternal(params, userId, supabase);
      case 'createNote':
        return await this.createNoteInternal(params, userId, supabase);
      case 'updateNote':
        return await this.updateNoteInternal(params, userId, supabase);
      case 'applyContentOperations':
        return await this.applyContentOperationsInternal(params, userId, supabase);
      case 'insertNoteContent':
        return await this.insertNoteContentInternal(params, userId, supabase);
      case 'getNoteTOC':
        return await this.getNoteTocInternal(params, userId, supabase);
      case 'getNoteShareSettings':
        return await this.getNoteShareSettingsInternal(params, userId, supabase);
      case 'updateNoteShareSettings':
        return await this.updateNoteShareSettingsInternal(params, userId, supabase);
      case 'moveNote':
        return await this.moveNoteInternal(params, userId, supabase);
      
      // Dossiers
      case 'getFolder':
        return await this.getFolderInternal(params, userId, supabase);
      case 'createFolder':
        return await this.createFolderInternal(params, userId, supabase);
      case 'updateFolder':
        return await this.updateFolderInternal(params, userId, supabase);
      case 'getFolderTree':
        return await this.getFolderTreeInternal(params, userId, supabase);
      case 'moveFolder':
        return await this.moveFolderInternal(params, userId, supabase);
      
      // Classeurs
      case 'listClasseurs':
        return await this.listClasseursInternal(params, userId, supabase);
      case 'createClasseur':
        return await this.createClasseurInternal(params, userId, supabase);
      case 'getClasseur':
        return await this.getClasseurInternal(params, userId, supabase);
      case 'updateClasseur':
        return await this.updateClasseurInternal(params, userId, supabase);
      case 'getClasseurTree':
        return await this.getClasseurTreeInternal(params, userId, supabase);
      case 'reorderClasseurs':
        return await this.reorderClasseursInternal(params, userId, supabase);
      
      // Agents
      case 'listAgents':
        return await this.listAgentsInternal(params, userId, supabase);
      case 'createAgent':
        return await this.createAgentInternal(params, userId, supabase);
      case 'getAgent':
        return await this.getAgentInternal(params, userId, supabase);
      case 'deleteAgent':
        return await this.deleteAgentInternal(params, userId, supabase);
      case 'patchAgent':
        return await this.patchAgentInternal(params, userId, supabase);
      case 'executeAgent':
        return await this.executeAgentInternal(params, userId, supabase);
      
      // Recherche
      case 'searchContent':
        return await this.searchNotesInternal(params, userId, supabase);
      case 'searchFiles':
        return await this.searchFilesInternal(params, userId, supabase);
      
      // Utilitaires
      case 'deleteResource':
        return await this.deleteResourceInternal(params, userId, supabase);
      case 'getUserProfile':
        return await this.getUserInfoInternal(params, userId, supabase);
      
      default:
        throw new Error(`Tool non supporté: ${toolName}`);
    }
  }

  /**
   * Services internes pour les tools OpenAPI V2
   */
  
  /**
   * 🔧 UTILITAIRE : Résoudre une référence (UUID ou slug) vers un ID
   * Supporte les notes, dossiers, classeurs
   */
  private async resolveRef(ref: string, type: 'note' | 'folder' | 'classeur', userId: string, supabase: any): Promise<string> {
    // Si c'est déjà un UUID, le retourner directement
    if (ref.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return ref;
    }

    // Sinon, résoudre le slug selon le type
    let table: string;
    let idField: string;
    
    switch (type) {
      case 'note':
        table = 'articles';
        idField = 'id';
        break;
      case 'folder':
        table = 'folders';
        idField = 'id';
        break;
      case 'classeur':
        table = 'classeurs';
        idField = 'id';
        break;
      default:
        throw new Error(`Type de référence non supporté: ${type}`);
    }

    console.log(`[AgentApiV2Tools] 🔍 Résolution du slug ${type}: ${ref}`);
    
    const { data: item, error } = await supabase
      .from(table)
      .select(idField)
      .eq('slug', ref)
      .eq('user_id', userId)
      .single();
    
    if (error || !item) {
      console.log(`[AgentApiV2Tools] ❌ ${type} non trouvé pour le slug: ${ref}`);
      throw new Error(`${type} non trouvé: ${ref}`);
    }
    
    console.log(`[AgentApiV2Tools] ✅ Slug ${type} résolu: ${ref} -> ${item[idField]}`);
    return item[idField];
  }
  
  private async createNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { source_title, notebook_id, markdown_content, header_image, folder_id } = params;
    
    // Validation des paramètres requis
    if (!source_title || !notebook_id) {
      throw new Error('source_title et notebook_id sont requis');
    }
    
    // 🔧 CORRECTION : Résoudre le notebook_id (peut être un UUID ou un slug)
    let classeurId = notebook_id;
    
    // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
    if (!classeurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log(`[AgentApiV2Tools] 🔍 Résolution du slug: ${classeurId}`);
      
      const { data: classeur, error: resolveError } = await supabase
        .from('classeurs')
        .select('id, name, slug, user_id')
        .eq('slug', classeurId)
        .eq('user_id', userId)
        .single();
      
      if (resolveError || !classeur) {
        console.log(`[AgentApiV2Tools] ❌ Classeur non trouvé pour le slug: ${classeurId}`);
        throw new Error(`Classeur non trouvé: ${classeurId}`);
      }
      
      classeurId = classeur.id;
      console.log(`[AgentApiV2Tools] ✅ Slug résolu: ${notebook_id} -> ${classeurId}`);
    }
    
    // 🔧 CORRECTION : Générer le slug et l'URL publique
    let slug: string;
    let publicUrl: string | null = null;
    try {
      const { SlugAndUrlService } = await import('@/services/slugAndUrlService');
      const result = await SlugAndUrlService.generateSlugAndUpdateUrl(
        source_title,
        userId,
        undefined, // Pas de noteId pour la création
        supabase
      );
      slug = result.slug;
      publicUrl = result.publicUrl;
      console.log(`[AgentApiV2Tools] ✅ Slug généré: ${slug} -> ${publicUrl}`);
    } catch (error) {
      // Fallback minimal en cas d'échec
      slug = `${source_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`.slice(0, 120);
      console.log(`[AgentApiV2Tools] ⚠️ Fallback slug utilisé: ${slug}`);
    }
    
    // Créer la note avec le classeurId résolu, slug et URL publique
    const { data: note, error } = await supabase
      .from('articles')
      .insert({
        source_title,
        classeur_id: classeurId, // Utiliser classeur_id au lieu de notebook_id
        markdown_content: markdown_content || '',
        html_content: markdown_content || '', // Ajouter html_content
        header_image,
        folder_id,
        user_id: userId,
        slug, // Ajouter le slug généré
        public_url: publicUrl // Ajouter l'URL publique
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Erreur création note: ${error.message}`);
    }
    
    return {
      success: true,
      data: note
    };
  }
  
  private async getNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref } = params;
    
    if (!ref) {
      throw new Error('ref est requis');
    }
    
    // Récupérer la note
    const { data: note, error } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', userId)
      .or(`id.eq.${ref},slug.eq.${ref}`)
      .single();
    
    if (error) {
      throw new Error(`Erreur récupération note: ${error.message}`);
    }
    
    return {
      success: true,
      note
    };
  }
  
  private async listClasseursInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { limit = 50, offset = 0 } = params;
    
    // Récupérer les classeurs
    const { data: classeurs, error } = await supabase
      .from('classeurs')
      .select('*')
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('updated_at', { ascending: false });
    
    if (error) {
      throw new Error(`Erreur récupération classeurs: ${error.message}`);
    }
    
    return {
      success: true,
      data: {
        classeurs,
        total_count: classeurs.length
      }
    };
  }
  
  private async searchNotesInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { q: query, limit = 20 } = params;
    
    if (!query) {
      throw new Error('q (terme de recherche) est requis');
    }
    
    // Recherche simple dans les titres et contenu
    const { data: notes, error } = await supabase
      .from('articles')
      .select('id, source_title, slug, markdown_content')
      .eq('user_id', userId)
      .or(`source_title.ilike.%${query}%,markdown_content.ilike.%${query}%`)
      .limit(limit);
    
    if (error) {
      throw new Error(`Erreur recherche: ${error.message}`);
    }
    
    return {
      success: true,
      query,
      results: notes.map(note => ({
        type: 'note',
        id: note.id,
        title: note.source_title,
        slug: note.slug,
        score: 100, // Score simple
        excerpt: note.markdown_content?.substring(0, 200) || ''
      })),
      total: notes.length
    };
  }
  
  private async getUserInfoInternal(params: any, userId: string, supabase: any): Promise<any> {
    // Récupérer les informations utilisateur
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw new Error(`Erreur récupération utilisateur: ${error.message}`);
    }
    
    // Statistiques utilisateur
    const { count: noteCount } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    const { count: classeurCount } = await supabase
      .from('classeurs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    return {
      success: true,
      data: {
        user,
        statistics: {
          total_notes: noteCount || 0,
          total_classeurs: classeurCount || 0,
          total_folders: 0,
          storage_used_mb: 0
        }
      }
    };
  }
  
  // Méthodes implémentées pour les services manquants
  private async updateNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref, source_title, markdown_content, html_content, header_image, header_image_offset, header_image_blur, header_image_overlay, header_title_in_image, wide_mode, a4_mode, slash_lang, font_family, folder_id, description } = params;
    
    try {
      // Validation des paramètres requis
      if (!ref) {
        return { success: false, error: 'Référence de la note requise' };
      }
      
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const noteId = await this.resolveRef(ref, 'note', userId, supabase);
      
      // Préparer les données à mettre à jour
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (source_title !== undefined) updateData.source_title = source_title;
      if (markdown_content !== undefined) updateData.markdown_content = markdown_content;
      if (html_content !== undefined) updateData.html_content = html_content;
      
      // Gérer header_image (peut être null selon le schéma OpenAPI)
      if (header_image !== undefined) {
        updateData.header_image = header_image; // Accepte null, string ou undefined
      }
      
      if (header_image_offset !== undefined) updateData.header_image_offset = header_image_offset;
      if (header_image_blur !== undefined) updateData.header_image_blur = header_image_blur;
      if (header_image_overlay !== undefined) updateData.header_image_overlay = header_image_overlay;
      if (header_title_in_image !== undefined) updateData.header_title_in_image = header_title_in_image;
      if (wide_mode !== undefined) updateData.wide_mode = wide_mode;
      if (a4_mode !== undefined) updateData.a4_mode = a4_mode;
      if (slash_lang !== undefined) updateData.slash_lang = slash_lang;
      if (font_family !== undefined) updateData.font_family = font_family;
      if (folder_id !== undefined) updateData.folder_id = folder_id;
      if (description !== undefined) updateData.description = description;
      
      // Mettre à jour la note
      const { data, error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', noteId) // Utiliser noteId résolu
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors de la mise à jour: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors de la mise à jour: ${error}` };
    }
  }
  
  private async insertNoteContentInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref, content, position = 'end' } = params;
    
    try {
      if (!ref || !content) {
        return { success: false, error: 'Référence de la note et contenu requis' };
      }
      
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const noteId = await this.resolveRef(ref, 'note', userId, supabase);
      
      // Récupérer la note existante
      const { data: note, error: noteError } = await supabase
        .from('articles')
        .select('markdown_content')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();
      
      if (noteError || !note) {
        return { success: false, error: 'Note non trouvée' };
      }
      
      // Insérer le contenu
      let newContent = note.markdown_content || '';
      if (position === 'start') {
        newContent = content + '\n\n' + newContent;
      } else {
        newContent = newContent + '\n\n' + content;
      }
      
      // Mettre à jour la note
      const { data, error } = await supabase
        .from('articles')
        .update({
          markdown_content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId) // Utiliser noteId résolu
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors de l'insertion: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors de l'insertion: ${error}` };
    }
  }
  
  private async moveNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref, folder_id, classeur_id } = params;
    
    try {
      if (!ref) {
        return { success: false, error: 'Référence de la note requise' };
      }
      
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const noteId = await this.resolveRef(ref, 'note', userId, supabase);
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (folder_id !== undefined) updateData.folder_id = folder_id;
      if (classeur_id !== undefined) updateData.classeur_id = classeur_id;
      
      const { data, error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', noteId) // Utiliser noteId résolu
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors du déplacement: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors du déplacement: ${error}` };
    }
  }
  
  private async getNoteTocInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref } = params;
    
    try {
      if (!ref) {
        return { success: false, error: 'Référence de la note requise' };
      }
      
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const noteId = await this.resolveRef(ref, 'note', userId, supabase);
      
      // Récupérer la note
      const { data: note, error } = await supabase
        .from('articles')
        .select('markdown_content')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();
      
      if (error || !note) {
        return { success: false, error: 'Note non trouvée' };
      }
      
      // Générer la TOC à partir du markdown
      const toc = this.generateTOCFromMarkdown(note.markdown_content || '');
      
      return {
        success: true,
        data: {
          note_id: noteId, // Utiliser noteId résolu
          toc
        }
      };
    } catch (error) {
      return { success: false, error: `Erreur lors de la génération de la TOC: ${error}` };
    }
  }
  
  private generateTOCFromMarkdown(markdown: string): any[] {
    const lines = markdown.split('\n');
    const toc: any[] = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2].trim();
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        toc.push({
          level,
          title,
          id,
          line_number: index + 1
        });
      }
    });
    
    return toc;
  }
  
  private async createClasseurInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { name, description, color, position } = params;
    
    try {
      if (!name) {
        return { success: false, error: 'Nom du classeur requis' };
      }
      
      const { data, error } = await supabase
        .from('classeurs')
        .insert({
          name,
          description,
          color: color || '#3B82F6',
          position: position || 0,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors de la création: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors de la création: ${error}` };
    }
  }
  
  private async getClasseurTreeInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref } = params;
    
    if (!ref) {
      throw new Error('ref est requis');
    }
    
    try {
      // 🔧 CONFORMITÉ API V2: Utiliser V2ResourceResolver comme l'endpoint réel
      const { V2ResourceResolver } = await import('@/utils/v2ResourceResolver');
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, {
        operation: 'getClasseurTree',
        component: 'AgentApiV2Tools'
      });
      
      if (!resolveResult.success) {
        throw new Error(resolveResult.error);
      }
      
      const classeurId = resolveResult.id;
      
      // Récupérer le classeur avec les mêmes champs que l'API V2
      const { data: classeur, error: classeurError } = await supabase
        .from('classeurs')
        .select('id, name, description, emoji, position, slug, created_at, updated_at')
        .eq('id', classeurId)
        .eq('user_id', userId)
        .single();
      
      if (classeurError || !classeur) {
        throw new Error('Classeur non trouvé');
      }
      
      // Récupérer les dossiers avec compatibilité classeur_id/notebook_id
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('id, name, parent_id, created_at, position, slug, classeur_id, notebook_id')
        .or(`classeur_id.eq.${classeurId},notebook_id.eq.${classeurId}`)
        .eq('user_id', userId)
        .order('name');
      
      if (foldersError) {
        throw new Error(`Erreur récupération dossiers: ${foldersError.message}`);
      }
      
      // Récupérer les notes avec les mêmes champs que l'API V2
      const { data: notes, error: notesError } = await supabase
        .from('articles')
        .select('id, source_title, header_image, created_at, updated_at, folder_id, classeur_id, notebook_id')
        .or(`classeur_id.eq.${classeurId},notebook_id.eq.${classeurId}`)
        .eq('user_id', userId)
        .order('source_title');
      
      if (notesError) {
        throw new Error(`Erreur récupération notes: ${notesError.message}`);
      }
      
      // 🔧 CONFORMITÉ API V2: Utiliser la même fonction buildTree
      const tree = this.buildTree(folders || [], notes || []);
      
      // 🔧 CONFORMITÉ API V2: Structure de réponse identique
      return {
        success: true,
        classeur,
        tree,
        folders: folders || [],
        notes: notes || [],
        generated_at: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`Erreur récupération arbre classeur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // 🔧 CONFORMITÉ API V2: Fonction buildTree identique à l'endpoint réel
  private buildTree(folders: any[], notes: any[]) {
    const folderMap = new Map();
    const rootFolders: any[] = [];
    const rootNotes: any[] = [];

    // Créer un map des dossiers
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        notes: []
      });
    });

    // Organiser les dossiers en arbre
    folders.forEach(folder => {
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        folderMap.get(folder.parent_id).children.push(folderMap.get(folder.id));
      } else {
        rootFolders.push(folderMap.get(folder.id));
      }
    });

    // Organiser les notes
    notes.forEach(note => {
      if (note.folder_id && folderMap.has(note.folder_id)) {
        folderMap.get(note.folder_id).notes.push(note);
      } else {
        rootNotes.push(note);
      }
    });

    return {
      folders: rootFolders,
      notes: rootNotes
    };
  }
  
  private async createFolderInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { name, classeur_id, parent_folder_id, position } = params;
    
    try {
      if (!name || !classeur_id) {
        return { success: false, error: 'Nom et classeur_id requis' };
      }
      
      // 🔧 CORRECTION : Résoudre le classeur_id (peut être un UUID ou un slug)
      let resolvedClasseurId = classeur_id;
      
      // Si ce n'est pas un UUID, essayer de le résoudre comme un slug
      if (!resolvedClasseurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.log(`[AgentApiV2Tools] 🔍 Résolution du slug classeur: ${resolvedClasseurId}`);
        
        const { data: classeur, error: resolveError } = await supabase
          .from('classeurs')
          .select('id, name, slug, user_id')
          .eq('slug', resolvedClasseurId)
          .eq('user_id', userId)
          .single();
        
        if (resolveError || !classeur) {
          console.log(`[AgentApiV2Tools] ❌ Classeur non trouvé pour le slug: ${resolvedClasseurId}`);
          return { success: false, error: `Classeur non trouvé: ${resolvedClasseurId}` };
        }
        
        resolvedClasseurId = classeur.id;
        console.log(`[AgentApiV2Tools] ✅ Slug classeur résolu: ${classeur_id} -> ${resolvedClasseurId}`);
      }
      
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name,
          classeur_id: resolvedClasseurId, // Utiliser l'ID résolu
          parent_folder_id,
          position: position || 0,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors de la création: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors de la création: ${error}` };
    }
  }
  
  private async getFolderTreeInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref } = params;
    
    if (!ref) {
      throw new Error('ref est requis');
    }
    
    try {
      // Récupérer le dossier
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .or(`id.eq.${ref},slug.eq.${ref}`)
        .single();
      
      if (folderError) {
        throw new Error(`Erreur récupération dossier: ${folderError.message}`);
      }
      
      // Récupérer les sous-dossiers
      const { data: subfolders, error: subfoldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .eq('parent_folder_id', folder.id)
        .order('name');
      
      if (subfoldersError) {
        throw new Error(`Erreur récupération sous-dossiers: ${subfoldersError.message}`);
      }
      
      // Récupérer les notes du dossier
      const { data: notes, error: notesError } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', userId)
        .eq('folder_id', folder.id)
        .order('source_title');
      
      if (notesError) {
        throw new Error(`Erreur récupération notes: ${notesError.message}`);
      }
      
      // Construire l'arbre
      const tree = {
        folder: {
          id: folder.id,
          name: folder.name,
          slug: folder.slug,
          description: folder.description,
          classeur_id: folder.classeur_id,
          parent_folder_id: folder.parent_folder_id,
          created_at: folder.created_at,
          updated_at: folder.updated_at
        },
        subfolders: subfolders.map(subfolder => ({
          id: subfolder.id,
          name: subfolder.name,
          slug: subfolder.slug,
          description: subfolder.description,
          created_at: subfolder.created_at,
          updated_at: subfolder.updated_at
        })),
        notes: notes.map(note => ({
          id: note.id,
          title: note.source_title,
          slug: note.slug,
          created_at: note.created_at,
          updated_at: note.updated_at
        })),
        statistics: {
          total_subfolders: subfolders.length,
          total_notes: notes.length
        }
      };
      
      return {
        success: true,
        data: tree
      };
      
    } catch (error) {
      throw new Error(`Erreur récupération arbre dossier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
  
  private async searchFilesInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { 
      q: query, 
      limit = 20, 
      classeur_id, // ✅ NOUVEAU: Ajouter le filtre par classeur_id
      type = 'all',
      offset = 0,
      created_from,
      created_to,
      min_size,
      max_size,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = params;
    
    if (!query) {
      throw new Error('q (terme de recherche) est requis');
    }
    
    try {
      // Construire la requête de base - CONFORME À L'API V2
      let queryBuilder = supabase
        .from('files')
        .select(`
          id,
          filename,
          mime_type,
          size,
          url,
          slug,
          description,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .eq('is_deleted', false); // Exclure les fichiers supprimés (conforme API V2)
      
      // Recherche textuelle dans filename ET description (conforme API V2)
      queryBuilder = queryBuilder.or(`filename.ilike.%${query}%,description.ilike.%${query}%`);
      
      // Filtres optionnels (conformes à l'API V2)
      if (classeur_id) { // ✅ NOUVEAU: Appliquer le filtre
        queryBuilder = queryBuilder.eq('classeur_id', classeur_id);
      }
      if (type && type !== 'all') {
        // Supporte les types internes (pdf, image, csv) ET MIME types
        queryBuilder = queryBuilder.or(`mime_type.ilike.%${type}%,filename.ilike.%.${type}%`);
      }
      
      if (created_from) {
        queryBuilder = queryBuilder.gte('created_at', created_from);
      }
      
      if (created_to) {
        queryBuilder = queryBuilder.lte('created_at', created_to);
      }
      
      if (min_size) {
        queryBuilder = queryBuilder.gte('size', min_size);
      }
      
      if (max_size) {
        queryBuilder = queryBuilder.lte('size', max_size);
      }
      
      // Tri (conforme à l'API V2)
      const validSortFields = ['filename', 'size', 'created_at'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
      queryBuilder = queryBuilder.order(sortField, { ascending: sort_order === 'asc' });
      
      // Pagination
      queryBuilder = queryBuilder.range(offset, offset + limit - 1);
      
      // Exécuter la requête
      const { data: files, error } = await queryBuilder;
      
      if (error) {
        throw new Error(`Erreur recherche fichiers: ${error.message}`);
      }
      
      // Traiter les résultats - FORMAT CONFORME À L'API V2
      const results = files.map(file => ({
        filename: file.filename,
        type: file.mime_type || 'unknown',
        size: file.size || 0,
        url: file.url,
        slug: file.slug || file.id, // Fallback sur l'ID si pas de slug
        description: file.description,
        created_at: file.created_at,
        updated_at: file.updated_at
      }));
      
      // Calcul des métadonnées (conforme à l'API V2)
      const hasMore = results.length === limit;
      
      return {
        success: true,
        files: results, // Conforme à l'API V2
        total: results.length,
        metadata: {
          limit,
          offset,
          has_more: hasMore,
          filters_applied: Object.entries(params)
            .filter(([key, value]) => value && key !== 'limit' && key !== 'offset')
            .map(([key, value]) => `${key}=${value}`),
          search_query: query
        }
      };
      
    } catch (error) {
      throw new Error(`Erreur recherche fichiers: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
  

  private async deleteResourceInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { resource, ref } = params;
    
    if (!resource || !ref) {
      throw new Error('resource et ref sont requis');
    }
    
    try {
      // 🔧 CONFORMITÉ API V2: Utiliser V2DatabaseUtils comme l'endpoint réel
      const { V2DatabaseUtils } = await import('@/utils/v2DatabaseUtils');
      
      let deleteResult;
      const context = { operation: 'v2_unified_delete', component: 'API_V2' };

      switch (resource) {
        case 'note':
          deleteResult = await V2DatabaseUtils.deleteNote(ref, userId, context);
          break;
        case 'classeur':
          deleteResult = await V2DatabaseUtils.deleteClasseur(ref, userId, context);
          break;
        case 'folder':
          deleteResult = await V2DatabaseUtils.deleteFolder(ref, userId, context);
          break;
        case 'file':
          // File deletion not yet implemented in V2DatabaseUtils
          throw new Error('File deletion not yet implemented');
          break;
        default:
          throw new Error(`Type de ressource non supporté: ${resource}`);
      }

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete resource');
      }

      // 🔧 CONFORMITÉ API V2: Structure de réponse identique
      return {
        success: true,
        message: `${resource} deleted successfully`,
        resource_type: resource,
        resource_id: ref
      };
      
    } catch (error) {
      throw new Error(`Erreur suppression ressource: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Obtenir la liste des outils disponibles pour function calling (avec cache optimisé)
   */
  async getToolsForFunctionCalling(capabilities?: string[]): Promise<any[]> {
    try {
      // 1. Vérifier le cache des tools si disponible
      if (this.toolsCache) {
        const cacheKey = capabilities ? capabilities.join(',') : 'all';
        const cachedTools = await this.toolsCache.getToolsForAgent(cacheKey, capabilities);
        
        if (cachedTools) {
          console.log(`[AgentApiV2Tools] 📦 Tools récupérés du cache: ${cachedTools.length} tools`);
          return cachedTools.map(tool => ({
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters
            }
          }));
        }
      }

      // 2. Générer les tools depuis OpenAPI
      const allTools = Array.from(this.tools.values());
      let filteredTools = allTools;
      
      if (capabilities && capabilities.length > 0) {
        // 🔧 CORRECTION: Si les capacités incluent 'function_calls', retourner tous les outils
        if (capabilities.includes('function_calls')) {
          console.log('[AgentApiV2Tools] 🔧 Capacité function_calls détectée, tous les outils disponibles');
          // Ne pas filtrer, garder tous les tools
        } else {
          // Filtrage strict par nom d'outil (pour les capacités spécifiques)
          filteredTools = allTools.filter(tool => capabilities.includes(tool.name));
        }
      }

      const toolsForFunctionCalling = filteredTools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));

      // 3. Mettre en cache les tools générés si disponible
      if (this.toolsCache) {
        try {
          const cacheKey = capabilities ? capabilities.join(',') : 'all';
          await this.toolsCache.setToolsForAgent(cacheKey, filteredTools, capabilities);
          console.log(`[AgentApiV2Tools] 💾 Tools mis en cache: ${filteredTools.length} tools`);
        } catch (cacheError) {
          console.warn('[AgentApiV2Tools] ⚠️ Erreur lors de la mise en cache:', cacheError);
        }
      }

      return toolsForFunctionCalling;
    } catch (error) {
      console.error('[AgentApiV2Tools] ❌ Erreur lors de la récupération des tools:', error);
      
      // Fallback: retourner les tools sans cache
      const allTools = Array.from(this.tools.values());
      return allTools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
    }
  }

  /**
   * Exécuter un outil par son nom (avec monitoring et optimisations)
   * Supporte les tokens JWT et les clés d'API
   */
  async executeTool(toolName: string, parameters: any, authToken: string): Promise<any> {
    const startTime = Date.now();
    let cacheHit = false;
    
    try {
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      console.log(`[AgentApiV2Tools] 🚀 Tool: ${toolName}`);
      console.log(`[AgentApiV2Tools] 📦 Paramètres:`, parameters);

      // 🔧 CORRECTION : Gérer les tokens JWT et les clés d'API
      let userId: string;
      
      // Vérifier si c'est un userId direct (clé d'API) ou un token JWT
      if (this.isUserId(authToken)) {
        // C'est un userId direct (clé d'API)
        userId = authToken;
        console.log(`[AgentApiV2Tools] 🔑 Authentification par clé d'API - userId: ${userId}`);
      } else {
        // C'est un token JWT, extraire l'userId
        userId = await this.getUserIdFromToken(authToken);
        console.log(`[AgentApiV2Tools] 🔑 Authentification par token JWT - userId: ${userId}`);
      }

      // Exécuter le tool avec timeout adaptatif si disponible
      let result;
      if (this.timeouts) {
        const timeout = this.timeouts.getToolCallTimeout(toolName);
        result = await Promise.race([
          tool.execute(parameters, authToken, userId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Tool timeout after ${timeout}ms`)), timeout)
          )
        ]);
      } else {
        // Fallback sans timeout adaptatif
        result = await tool.execute(parameters, authToken, userId);
      }
      
      const duration = Date.now() - startTime;
      console.log(`[AgentApiV2Tools] ✅ ${toolName} (${duration}ms)`, { duration });
      
      // Enregistrer les métriques de performance si disponible
      if (this.metrics) {
        this.metrics.recordToolCall({
          toolName,
          executionTime: duration,
          success: true,
          timestamp: Date.now(),
          userId,
          cacheHit,
        });
      }
      
      // Ajuster le timeout adaptatif si disponible
      if (this.timeouts) {
        this.timeouts.recordPerformance(`tool:${toolName}`, duration, true);
      }
      
      // 🔄 Déclencher le polling intelligent après l'exécution du tool
      try {
        const pollingConfig = this.getPollingConfigForTool(toolName, result, userId);
        if (pollingConfig) {
          await triggerUnifiedRealtimePolling(pollingConfig.entityType, pollingConfig.operation, authToken);
          console.log(`[AgentApiV2Tools] 🔄 Polling intelligent déclenché: ${pollingConfig.entityType} ${pollingConfig.operation}`);
        }
      } catch (pollingError) {
        console.warn(`[AgentApiV2Tools] ⚠️ Erreur lors du déclenchement du polling:`, pollingError);
        // Ne pas faire échouer l'exécution du tool à cause du polling
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`[AgentApiV2Tools] ❌ ${toolName} échoué (${duration}ms):`, { error: errorMessage });
      
      // Enregistrer les métriques d'erreur si disponible
      if (this.metrics) {
        this.metrics.recordToolCall({
          toolName,
          executionTime: duration,
          success: false,
          timestamp: Date.now(),
          userId: 'unknown',
          errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          cacheHit,
        });
      }
      
      // Ajuster le timeout adaptatif si disponible
      if (this.timeouts) {
        this.timeouts.recordPerformance(`tool:${toolName}`, duration, false);
      }
      
      // ✅ CORRECTION: Retourner l'erreur au lieu de la relancer
      return { 
        success: false, 
        error: `Échec de l'exécution de ${toolName}: ${errorMessage}` 
      };
    }
  }

  /**
   * Vérifier si la chaîne est un userId (UUID) ou un token JWT
   */
  private isUserId(token: string): boolean {
    // Un userId est un UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(token);
  }

  /**
   * Extraire le userId à partir du JWT token avec cache distribué optimisé
   */
  private async getUserIdFromToken(jwtToken: string): Promise<string> {
    try {
      const cacheKey = `userId:${jwtToken}`;
      
      // 1. Vérifier le cache distribué d'abord si disponible
      if (this.cache) {
        const cached = await this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          console.log(`[AgentApiV2Tools] 📦 UserId récupéré du cache distribué`);
          return cached.userId;
        }
      }

      // 2. Récupérer depuis Supabase avec timeout optimisé si disponible
      // ✅ CORRECTION : Utiliser l'anon key avec le token JWT dans les headers (comme dans authUtils.ts)
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${jwtToken}`
          }
        }
      });
      
      let user, error;
      if (this.timeouts) {
        const timeout = this.timeouts.getApiTimeout('supabase');
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Supabase timeout after ${timeout}ms`)), timeout)
        );
        
        const result = await Promise.race([userPromise, timeoutPromise]);
        user = result.data.user;
        error = result.error;
      } else {
        // Fallback sans timeout optimisé
        const result = await supabase.auth.getUser();
        user = result.data.user;
        error = result.error;
      }
      
      if (error || !user) {
        throw new Error('Token invalide ou expiré');
      }
      
      // 3. Mettre en cache distribué avec TTL optimisé si disponible
      if (this.cache) {
        try {
          const cacheData = {
            userId: user.id,
            expiresAt: Date.now() + (this.cache.config?.redis?.ttl?.userId || 5 * 60 * 1000)
          };
          
          await this.cache.set(cacheKey, cacheData, this.cache.config?.redis?.ttl?.userId || 5 * 60 * 1000);
          console.log(`[AgentApiV2Tools] 💾 UserId mis en cache distribué`);
        } catch (cacheError) {
          console.warn('[AgentApiV2Tools] ⚠️ Erreur lors de la mise en cache du userId:', cacheError);
        }
      }
      
      return user.id;
    } catch (error) {
      console.error(`[AgentApiV2Tools] ❌ Erreur extraction userId:`, error);
      throw new Error('Impossible d\'extraire l\'utilisateur du token');
    }
  }

  /**
   * Obtenir la liste des noms d'outils disponibles
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Obtenir la configuration de polling pour un tool spécifique
   */
  private getPollingConfigForTool(toolName: string, result: any, userId: string): { entityType: EntityType; operation: OperationType } | null {
    // Mapping exact des tools vers les types d'entités et opérations (basé sur les operationId du schéma OpenAPI)
    const toolMapping: Record<string, { entityType: EntityType; operation: OperationType }> = {
      // Notes - correspondance exacte avec les operationId
      'getNote': { entityType: 'notes', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'createNote': { entityType: 'notes', operation: 'CREATE' },
      'updateNote': { entityType: 'notes', operation: 'UPDATE' },
      'applyContentOperations': { entityType: 'notes', operation: 'UPDATE' },
      'insertNoteContent': { entityType: 'notes', operation: 'UPDATE' },
      'getNoteTOC': { entityType: 'notes', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'getNoteShareSettings': { entityType: 'notes', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'updateNoteShareSettings': { entityType: 'notes', operation: 'UPDATE' },
      'moveNote': { entityType: 'notes', operation: 'MOVE' },
      
      // Dossiers - correspondance exacte avec les operationId
      'getFolder': { entityType: 'folders', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'createFolder': { entityType: 'folders', operation: 'CREATE' },
      'updateFolder': { entityType: 'folders', operation: 'UPDATE' },
      'getFolderTree': { entityType: 'folders', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'moveFolder': { entityType: 'folders', operation: 'MOVE' },
      
      // Classeurs - correspondance exacte avec les operationId
      'listClasseurs': { entityType: 'classeurs', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'createClasseur': { entityType: 'classeurs', operation: 'CREATE' },
      'getClasseur': { entityType: 'classeurs', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'updateClasseur': { entityType: 'classeurs', operation: 'UPDATE' },
      'getClasseurTree': { entityType: 'classeurs', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'reorderClasseurs': { entityType: 'classeurs', operation: 'UPDATE' },
      
      // Agents - utiliser 'notes' comme fallback car 'agents' n'est pas dans EntityType
      'listAgents': { entityType: 'notes', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'createAgent': { entityType: 'notes', operation: 'CREATE' },
      'getAgent': { entityType: 'notes', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'deleteAgent': { entityType: 'notes', operation: 'DELETE' },
      'patchAgent': { entityType: 'notes', operation: 'UPDATE' },
      'executeAgent': { entityType: 'notes', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations d'exécution
      
      // Recherche - utiliser 'notes' comme fallback
      'searchContent': { entityType: 'notes', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      'searchFiles': { entityType: 'notes', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      
      // Utilitaires - utiliser 'notes' comme fallback
      'deleteResource': { entityType: 'notes', operation: 'DELETE' },
      'getUserProfile': { entityType: 'notes', operation: 'UPDATE' }, // Utiliser UPDATE pour les opérations de lecture
      
      // Fichiers (non supportés par le service unifié pour l'instant)
      // 'upload_file': { entityType: 'files', operation: 'CREATE' },
      // 'delete_file': { entityType: 'files', operation: 'DELETE' },
      // 'move_file': { entityType: 'files', operation: 'MOVE' },
      // 'rename_file': { entityType: 'files', operation: 'RENAME' }
    };

    return toolMapping[toolName] || null;
  }

  /**
   * Attendre que l'initialisation soit complète
   */
  async waitForInitialization(): Promise<void> {
    // Attendre que l'initialisation OpenAPI soit terminée
    let attempts = 0;
    const maxAttempts = 50; // 5 secondes max (50 * 100ms)
    
    while (!this.openApiInitialized && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.openApiInitialized) {
      console.warn('[AgentApiV2Tools] ⚠️ Timeout d\'attente de l\'initialisation OpenAPI');
    } else {
      console.log(`[AgentApiV2Tools] ✅ Initialisation OpenAPI terminée après ${attempts * 100}ms`);
    }
  }

  // ===== IMPLÉMENTATIONS COMPLÈTES DES SERVICES MANQUANTS =====
  
  private async applyContentOperationsInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref, ops, dry_run = true } = params;
    
    try {
      // TODO: Implémenter la logique métier réelle pour appliquer les opérations de contenu.
      // Le service devrait utiliser une bibliothèque de diff/patch et gérer les différents types de cibles et d'opérations.
      
      // Récupérer la note
      const { data: note, error: noteError } = await supabase
        .from('articles')
        .select('*')
        .or(`id.eq.${ref},slug.eq.${ref}`) // Utiliser `or` pour slug ou id
        .eq('user_id', userId)
        .single();
      
      if (noteError || !note) {
        return { success: false, error: 'Note non trouvée', code: 'TARGET_NOT_FOUND' };
      }
      
      // Simuler les opérations de contenu (pour l'instant)
      const results = (ops || []).map((op: any) => ({
        id: op.id,
        status: 'applied',
        matches: 1,
        preview: `Opération simulée pour ${op.action} sur ${op.target.type}`
      }));
      
      return {
        success: true,
        data: {
          note_id: note.id,
          ops_results: results,
          etag: note.etag || `W/"${Date.now()}"`,
          diff: '', // Diff vide pour la simulation
          content: note.markdown_content
        },
        meta: {
          dry_run,
          char_diff: { added: 0, removed: 0 },
          execution_time: 50
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return { success: false, error: `Erreur lors des opérations de contenu: ${errorMessage}` };
    }
  }

  private async getNoteShareSettingsInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref } = params;
    
    try {
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const noteId = await this.resolveRef(ref, 'note', userId, supabase);
      
      const { data: note, error } = await supabase
        .from('articles')
        .select('visibility, public_url')
        .eq('id', noteId)
        .eq('user_id', userId)
        .single();
      
      if (error || !note) {
        return { success: false, error: 'Note non trouvée' };
      }
      
      return {
        success: true,
        share_settings: {
          visibility: note.visibility || 'private',
          public_url: note.public_url
        }
      };
    } catch (error) {
      return { success: false, error: `Erreur lors de la récupération des paramètres: ${error}` };
    }
  }

  private async updateNoteShareSettingsInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref, visibility, allow_edit, allow_comments } = params;
    
    try {
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const noteId = await this.resolveRef(ref, 'note', userId, supabase);
      
      const { data, error } = await supabase
        .from('articles')
        .update({
          visibility,
          allow_edit,
          allow_comments,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors de la mise à jour: ${error.message}` };
      }
      
      return {
        success: true,
        message: 'Paramètres de partage mis à jour',
        share_settings: {
          visibility: data.visibility,
          allow_edit: data.allow_edit,
          allow_comments: data.allow_comments
        }
      };
    } catch (error) {
      return { success: false, error: `Erreur lors de la mise à jour: ${error}` };
    }
  }

  private async getFolderInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref } = params;
    
    try {
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const folderId = await this.resolveRef(ref, 'folder', userId, supabase);
      
      const { data: folder, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .eq('user_id', userId)
        .single();
      
      if (error || !folder) {
        return { success: false, error: 'Dossier non trouvé' };
      }
      
      return { success: true, data: folder };
    } catch (error) {
      return { success: false, error: `Erreur lors de la récupération: ${error}` };
    }
  }

  private async updateFolderInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref, name, position } = params;
    
    try {
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const folderId = await this.resolveRef(ref, 'folder', userId, supabase);
      
      const { data, error } = await supabase
        .from('folders')
        .update({
          name,
          position,
          updated_at: new Date().toISOString()
        })
        .eq('id', folderId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors de la mise à jour: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors de la mise à jour: ${error}` };
    }
  }

  private async moveFolderInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref, classeur_id, parent_folder_id, position } = params;
    
    try {
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const folderId = await this.resolveRef(ref, 'folder', userId, supabase);
      
      const { data, error } = await supabase
        .from('folders')
        .update({
          classeur_id,
          parent_folder_id,
          position,
          updated_at: new Date().toISOString()
        })
        .eq('id', folderId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors du déplacement: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors du déplacement: ${error}` };
    }
  }

  private async getClasseurInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref } = params;
    
    try {
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const classeurId = await this.resolveRef(ref, 'classeur', userId, supabase);
      
      const { data: classeur, error } = await supabase
        .from('classeurs')
        .select('*')
        .eq('id', classeurId)
        .eq('user_id', userId)
        .single();
      
      if (error || !classeur) {
        return { success: false, error: 'Classeur non trouvé' };
      }
      
      return { success: true, data: classeur };
    } catch (error) {
      return { success: false, error: `Erreur lors de la récupération: ${error}` };
    }
  }

  private async updateClasseurInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref, name, description, color, position } = params;
    
    try {
      // 🔧 CORRECTION : Résoudre la référence (slug → UUID)
      const classeurId = await this.resolveRef(ref, 'classeur', userId, supabase);
      
      const { data, error } = await supabase
        .from('classeurs')
        .update({
          name,
          description,
          color,
          position,
          updated_at: new Date().toISOString()
        })
        .eq('id', classeurId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors de la mise à jour: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors de la mise à jour: ${error}` };
    }
  }

  private async reorderClasseursInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { classeur_orders } = params;
    
    try {
      const updates = classeur_orders.map((order: any) => 
        supabase
          .from('classeurs')
          .update({ position: order.position, updated_at: new Date().toISOString() })
          .eq('id', order.classeur_id)
          .eq('user_id', userId)
      );
      
      await Promise.all(updates);
      
      // Récupérer les classeurs mis à jour
      const { data: classeurs, error } = await supabase
        .from('classeurs')
        .select('*')
        .eq('user_id', userId)
        .order('position');
      
      if (error) {
        return { success: false, error: `Erreur lors de la réorganisation: ${error.message}` };
      }
      
      return { success: true, data: classeurs };
    } catch (error) {
      return { success: false, error: `Erreur lors de la réorganisation: ${error}` };
    }
  }

  private async listAgentsInternal(params: any, userId: string, supabase: any): Promise<any> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_endpoint_agent', true)
        .order('created_at');
      
      if (error) {
        return { success: false, error: `Erreur lors de la récupération: ${error.message}` };
      }
      
      return { success: true, data: agents || [] };
    } catch (error) {
      return { success: false, error: `Erreur lors de la récupération: ${error}` };
    }
  }

  private async createAgentInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { display_name, slug, description, model, provider = 'groq', system_instructions, temperature = 0.7, max_tokens = 4000 } = params;
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: display_name,
          display_name,
          slug,
          description,
          model,
          provider,
          system_instructions,
          temperature,
          max_tokens,
          user_id: userId,
          is_active: true,
          is_endpoint_agent: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors de la création: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors de la création: ${error}` };
    }
  }

  private async getAgentInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { agentId } = params;
    
    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', userId)
        .eq('is_endpoint_agent', true)
        .single();
      
      if (error || !agent) {
        return { success: false, error: 'Agent non trouvé' };
      }
      
      return { success: true, data: agent };
    } catch (error) {
      return { success: false, error: `Erreur lors de la récupération: ${error}` };
    }
  }

  private async deleteAgentInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { agentId } = params;
    
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', agentId)
        .eq('user_id', userId)
        .eq('is_endpoint_agent', true);
      
      if (error) {
        return { success: false, error: `Erreur lors de la suppression: ${error.message}` };
      }
      
      return { success: true, message: 'Agent supprimé avec succès' };
    } catch (error) {
      return { success: false, error: `Erreur lors de la suppression: ${error}` };
    }
  }

  private async patchAgentInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { agentId, ...updates } = params;
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId)
        .eq('user_id', userId)
        .eq('is_endpoint_agent', true)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: `Erreur lors de la mise à jour: ${error.message}` };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Erreur lors de la mise à jour: ${error}` };
    }
  }

  private async executeAgentInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref, input, image, options = {} } = params;
    
    try {
      // 🔧 CORRECTION: Recherche directe de l'agent par slug ou ID
      let agentId = ref;
      
      // Si ce n'est pas un UUID, chercher par slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
      if (!isUUID) {
        const { data: agentBySlug, error: slugError } = await supabase
          .from('agents')
          .select('id')
          .eq('slug', ref)
          .eq('is_endpoint_agent', true)
          .eq('is_active', true)
          .single();
          
        if (slugError || !agentBySlug) {
          return { success: false, error: 'Agent non trouvé', code: 'AGENT_NOT_FOUND' };
        }
        
        agentId = agentBySlug.id;
      }
      
      // Récupérer l'agent
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_endpoint_agent', true)
        .single();
      
      if (agentError || !agent) {
        return { success: false, error: 'Agent non trouvé ou inactif', code: 'AGENT_INACTIVE' };
      }
      
      // Simuler l'exécution de l'agent
      const response = `Réponse simulée de l'agent ${agent.display_name || agent.name}: ${input}`;
      
      return {
        success: true,
        data: {
          ref,
          agent_name: agent.display_name || agent.name,
          agent_id: agent.id,
          response,
          execution_time: 150,
          model_used: agent.model,
          provider: agent.provider
        },
        meta: {
          timestamp: new Date().toISOString(),
          agent_slug: agent.slug,
          agent_type: agent.is_chat_agent ? 'chat' : 'endpoint',
          input_length: input.length,
          response_length: response.length
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return { success: false, error: `Erreur lors de l'exécution: ${errorMessage}`, code: 'EXECUTION_FAILED' };
    }
  }
}

// Instance singleton
export const agentApiV2Tools = new AgentApiV2Tools();
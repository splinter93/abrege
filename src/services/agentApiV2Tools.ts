import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { OpenAPIToolsGenerator, getOpenAPIV2Tools } from './openApiToolsGenerator';
import { getOpenAPISchemaService } from './openApiSchemaService';
import { triggerUnifiedRealtimePolling, type EntityType, type OperationType } from './unifiedRealtimeService';

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

  constructor() {
    // Utiliser l'URL de base configurée ou l'URL par défaut
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scrivia.app';
    console.log(`[AgentApiV2Tools] 🚀 Initialisation avec baseUrl: ${this.baseUrl}`);
    
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
   */
  private async executeOpenAPIV2Tool(toolName: string, params: any, jwtToken: string): Promise<any> {
    try {
      console.log(`[AgentApiV2Tools] 🔧 Exécution du tool OpenAPI V2: ${toolName}`);
      
      // Récupérer le userId à partir du JWT token
      const userId = await this.getUserIdFromToken(jwtToken);
      
      // Utiliser les services internes au lieu d'appels HTTP externes
      const result = await this.executeInternalService(toolName, params, userId, jwtToken);
      
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
  private async executeInternalService(toolName: string, params: any, userId: string, jwtToken: string): Promise<any> {
    // Créer un client Supabase authentifié
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Mapper les tools vers les services internes
    switch (toolName) {
      case 'createNote':
        return await this.createNoteInternal(params, userId, supabase);
      
      case 'getNote':
        return await this.getNoteInternal(params, userId, supabase);
      
      case 'updateNote':
        return await this.updateNoteInternal(params, userId, supabase);
      
      case 'deleteResource':
        return await this.deleteResourceInternal(params, userId, supabase);
      
      case 'insertNoteContent':
        return await this.insertNoteContentInternal(params, userId, supabase);
      
      case 'moveNote':
        return await this.moveNoteInternal(params, userId, supabase);
      
      case 'getNoteTOC':
        return await this.getNoteTocInternal(params, userId, supabase);
      
      case 'listClasseurs':
        return await this.listClasseursInternal(params, userId, supabase);
      
      case 'createClasseur':
        return await this.createClasseurInternal(params, userId, supabase);
      
      case 'getClasseurTree':
        return await this.getClasseurTreeInternal(params, userId, supabase);
      
      case 'createFolder':
        return await this.createFolderInternal(params, userId, supabase);
      
      case 'getFolderTree':
        return await this.getFolderTreeInternal(params, userId, supabase);
      
      case 'searchContent':
        return await this.searchNotesInternal(params, userId, supabase);
      
      case 'searchFiles':
        return await this.searchFilesInternal(params, userId, supabase);
      
      case 'getUserProfile':
        return await this.getUserInfoInternal(params, userId, supabase);
      
      case 'getStats':
        return await this.getPlatformStatsInternal(params, userId, supabase);
      
      default:
        throw new Error(`Tool non supporté: ${toolName}`);
    }
  }

  /**
   * Services internes pour les tools OpenAPI V2
   */
  
  private async createNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { source_title, notebook_id, markdown_content, header_image, folder_id } = params;
    
    // Validation des paramètres requis
    if (!source_title || !notebook_id) {
      throw new Error('source_title et notebook_id sont requis');
    }
    
    // Créer la note
    const { data: note, error } = await supabase
      .from('articles')
      .insert({
        source_title,
        notebook_id,
        markdown_content: markdown_content || '',
        header_image,
        folder_id,
        user_id: userId
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
  
  // Méthodes placeholder pour les autres services
  private async updateNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service updateNote non implémenté');
  }
  
  private async insertNoteContentInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service insertNoteContent non implémenté');
  }
  
  private async moveNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service moveNote non implémenté');
  }
  
  private async getNoteTocInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service getNoteTOC non implémenté');
  }
  
  private async createClasseurInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service createClasseur non implémenté');
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
    throw new Error('Service createFolder non implémenté');
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
  
  private async getPlatformStatsInternal(params: any, userId: string, supabase: any): Promise<any> {
    try {
      // 🔧 CONFORMITÉ API V2: Utiliser la même logique que l'endpoint /stats
      const [
        notesCount,
        publishedNotesCount,
        classeursCount,
        foldersCount,
        contentSize
      ] = await Promise.all([
        // Nombre total de notes
        supabase
          .from('articles')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Nombre de notes publiées
        supabase
          .from('articles')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('share_settings->>visibility', 'public'),
        
        // Nombre total de classeurs
        supabase
          .from('classeurs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Nombre total de dossiers
        supabase
          .from('folders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Taille totale du contenu (approximative)
        supabase
          .from('articles')
          .select('markdown_content')
          .eq('user_id', userId)
      ]);

      // Calculer la taille totale du contenu
      let totalContentSize = 0;
      if (contentSize.data) {
        totalContentSize = contentSize.data.reduce((total, article) => {
          return total + (article.markdown_content?.length || 0);
        }, 0);
      }

      const stats = {
        total_notes: notesCount.count || 0,
        published_notes: publishedNotesCount.count || 0,
        total_classeurs: classeursCount.count || 0,
        total_folders: foldersCount.count || 0,
        total_content_size: totalContentSize
      };

      // 🔧 CONFORMITÉ API V2: Structure de réponse identique
      return {
        success: true,
        stats
      };
      
    } catch (error) {
      throw new Error(`Erreur récupération statistiques: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
   * Obtenir la liste des outils disponibles pour function calling
   */
  getToolsForFunctionCalling(capabilities?: string[]): any[] {
    const allTools = Array.from(this.tools.values());
    
    if (!capabilities || capabilities.length === 0) {
      return allTools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
    }

    // 🔧 CORRECTION: Si les capacités incluent 'function_calls', retourner tous les outils
    // au lieu de filtrer strictement par nom d'outil
    if (capabilities.includes('function_calls')) {
      console.log('[AgentApiV2Tools] 🔧 Capacité function_calls détectée, tous les outils disponibles');
      return allTools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
    }

    // Filtrage strict par nom d'outil (pour les capacités spécifiques)
    const filteredTools = allTools.filter(tool => 
      capabilities.includes(tool.name)
    );

    return filteredTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Exécuter un outil par son nom
   */
  async executeTool(toolName: string, parameters: any, jwtToken: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      console.log(`[AgentApiV2Tools] 🚀 Tool: ${toolName}`);
      console.log(`[AgentApiV2Tools] 📦 Paramètres:`, parameters);

      // Récupérer le userId à partir du JWT token
      const userId = await this.getUserIdFromToken(jwtToken);

      const result = await tool.execute(parameters, jwtToken, userId);
      
      const duration = Date.now() - startTime;
      console.log(`[AgentApiV2Tools] ✅ ${toolName} (${duration}ms)`, { duration });
      
      // 🔄 Déclencher le polling intelligent après l'exécution du tool
      try {
        const pollingConfig = this.getPollingConfigForTool(toolName, result, userId);
        if (pollingConfig) {
          await triggerUnifiedRealtimePolling(pollingConfig.entityType, pollingConfig.operation, jwtToken);
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
      
      // ✅ CORRECTION: Retourner l'erreur au lieu de la relancer
      return { 
        success: false, 
        error: `Échec de l'exécution de ${toolName}: ${errorMessage}` 
      };
    }
  }

  // Cache du userId avec TTL de 5 minutes
  private userIdCache = new Map<string, { userId: string; expiresAt: number }>();

  /**
   * Extraire le userId à partir du JWT token avec cache
   */
  private async getUserIdFromToken(jwtToken: string): Promise<string> {
    try {
      // Vérifier le cache d'abord
      const cached = this.userIdCache.get(jwtToken);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.userId;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { data: { user }, error } = await supabase.auth.getUser(jwtToken);
      
      if (error || !user) {
        throw new Error('Token invalide ou expiré');
      }
      
      // Mettre en cache avec TTL de 5 minutes
      this.userIdCache.set(jwtToken, {
        userId: user.id,
        expiresAt: Date.now() + 5 * 60 * 1000
      });
      
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
    // Mapping simplifié des tools vers les types d'entités et opérations
    const toolMapping: Record<string, { entityType: EntityType; operation: OperationType }> = {
      // Notes
      'createNote': { entityType: 'notes', operation: 'CREATE' },
      'updateNote': { entityType: 'notes', operation: 'UPDATE' },
      'deleteResource': { entityType: 'notes', operation: 'DELETE' },
      'insertNoteContent': { entityType: 'notes', operation: 'UPDATE' },
      'moveNote': { entityType: 'notes', operation: 'MOVE' },
      
      // Dossiers
      'createFolder': { entityType: 'folders', operation: 'CREATE' },
      
      // Classeurs
      'createClasseur': { entityType: 'classeurs', operation: 'CREATE' },
      
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
}

// Instance singleton
export const agentApiV2Tools = new AgentApiV2Tools();
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
    this.initializeTools();
    console.log(`[AgentApiV2Tools] 🔧 Tools de base chargés: ${this.tools.size}`);
    
    // Initialiser les tools OpenAPI V2 de manière asynchrone
    this.initializeOpenAPIV2Tools().catch(error => {
      console.error('[AgentApiV2Tools] ❌ Erreur lors de l\'initialisation OpenAPI V2:', error);
    });
    
    console.log(`[AgentApiV2Tools] ✅ Initialisation terminée, ${this.tools.size} tools chargés`);
  }

  /**
   * Initialiser les tools OpenAPI V2
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
      case 'create_note':
        return await this.createNoteInternal(params, userId, supabase);
      
      case 'get_note':
        return await this.getNoteInternal(params, userId, supabase);
      
      case 'update_note':
        return await this.updateNoteInternal(params, userId, supabase);
      
      case 'delete_note':
        return await this.deleteNoteInternal(params, userId, supabase);
      
      case 'add_content_to_note':
        return await this.addContentToNoteInternal(params, userId, supabase);
      
      case 'move_note':
        return await this.moveNoteInternal(params, userId, supabase);
      
      case 'get_note_toc':
        return await this.getNoteTocInternal(params, userId, supabase);
      
      case 'get_note_stats':
        return await this.getNoteStatsInternal(params, userId, supabase);
      
      case 'get_recent_notes':
        return await this.getRecentNotesInternal(params, userId, supabase);
      
      case 'create_classeur':
        return await this.createClasseurInternal(params, userId, supabase);
      
      case 'list_classeurs':
        return await this.listClasseursInternal(params, userId, supabase);
      
      case 'get_classeur_tree':
        return await this.getClasseurTreeInternal(params, userId, supabase);
      
      case 'create_folder':
        return await this.createFolderInternal(params, userId, supabase);
      
      case 'get_folder_tree':
        return await this.getFolderTreeInternal(params, userId, supabase);
      
      case 'search_notes':
        return await this.searchNotesInternal(params, userId, supabase);
      
      case 'search_files':
        return await this.searchFilesInternal(params, userId, supabase);
      
      case 'get_user_info':
        return await this.getUserInfoInternal(params, userId, supabase);
      
      case 'get_platform_stats':
        return await this.getPlatformStatsInternal(params, userId, supabase);
      
      case 'get_classeur_tree':
        return await this.getClasseurTreeInternal(params, userId, supabase);
      
      case 'get_folder_tree':
        return await this.getFolderTreeInternal(params, userId, supabase);
      
      case 'delete_resource':
        return await this.deleteResourceInternal(params, userId, supabase);
      
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
    throw new Error('Service update_note non implémenté');
  }
  
  private async deleteNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service delete_note non implémenté');
  }
  
  private async addContentToNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service add_content_to_note non implémenté');
  }
  
  private async moveNoteInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service move_note non implémenté');
  }
  
  private async getNoteTocInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service get_note_toc non implémenté');
  }
  
  private async getNoteStatsInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service get_note_stats non implémenté');
  }
  
  private async getRecentNotesInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service get_recent_notes non implémenté');
  }
  
  private async createClasseurInternal(params: any, userId: string, supabase: any): Promise<any> {
    throw new Error('Service create_classeur non implémenté');
  }
  
  private async getClasseurTreeInternal(params: any, userId: string, supabase: any): Promise<any> {
    const { ref } = params;
    
    if (!ref) {
      throw new Error('ref est requis');
    }
    
    try {
      // 🔧 CONFORMITÉ API V2: Utiliser V2ResourceResolver comme l'endpoint réel
      const { V2ResourceResolver } = await import('@/utils/v2ResourceResolver');
      const resolveResult = await V2ResourceResolver.resolveRef(ref, 'classeur', userId, {});
      
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
    throw new Error('Service create_folder non implémenté');
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
          // Vérifier si deleteFile existe
          if (typeof V2DatabaseUtils.deleteFile === 'function') {
            deleteResult = await V2DatabaseUtils.deleteFile(ref, userId, context);
          } else {
            throw new Error('File deletion not yet implemented');
          }
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
   * Mapper le nom du tool vers l'endpoint API V2 (legacy - à supprimer)
   */
  private mapToolNameToEndpoint(toolName: string): string | null {
    const mappings: Record<string, string> = {
      // Notes
      'create_note': '/note/create',
      'get_note': '/note/{ref}',
      'update_note': '/note/{ref}/update',
      'delete_note': '/note/{ref}/delete',
      'add_content_to_note': '/note/{ref}/add-content',
      'move_note': '/note/{ref}/move',
      'get_note_toc': '/note/{ref}/table-of-contents',
      'get_note_stats': '/note/{ref}/statistics',
      'get_recent_notes': '/note/recent',
      
      // Classeurs
      'create_classeur': '/classeur/create',
      'list_classeurs': '/classeurs',
      'get_classeur_tree': '/classeur/{ref}/tree',
      
      // Dossiers
      'create_folder': '/folder/create',
      'get_folder_tree': '/folder/{ref}/tree',
      
      // Recherche
      'search_notes': '/search',
      'search_files': '/files/search',
      
      // Utilisateur
      'get_user_info': '/me',
      'get_platform_stats': '/stats',
      
      // Gestion unifiée
      'delete_resource': '/delete/{resource}/{ref}'
    };
    
    return mappings[toolName] || null;
  }

  /**
   * Obtenir la méthode HTTP depuis le nom du tool
   */
  private getHttpMethodFromToolName(toolName: string): string {
    if (toolName.startsWith('create_') || toolName.startsWith('add_')) {
      return 'POST';
    } else if (toolName.startsWith('update_') || toolName.startsWith('move_')) {
      return 'PUT';
    } else if (toolName.startsWith('delete_')) {
      return 'DELETE';
    } else {
      return 'GET';
    }
  }

  /**
   * Charger le schéma OpenAPI (legacy - à supprimer)
   */
  private async loadOpenAPISchema(): Promise<any> {
    try {
      // En production, vous pourriez charger depuis une URL
      // Pour l'instant, on utilise le schéma intégré
      const schema = {
        paths: {
          '/api/v2/note/create': {
            post: {
              summary: 'Créer une nouvelle note',
              description: 'Créer une nouvelle note structurée dans un classeur spécifique',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CreateNotePayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/note/{ref}/content': {
            get: {
              summary: 'Récupérer le contenu d\'une note',
              description: 'Récupérer le contenu markdown et HTML d\'une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ]
            }
          },
          '/api/v2/note/{ref}/add-content': {
            post: {
              summary: 'Ajouter du contenu à une note',
              description: 'Ajouter du contenu markdown à la fin d\'une note existante',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/AddContentPayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/note/{ref}/insert-content': {
            post: {
              summary: 'Insérer ou modifier du contenu dans une note (endpoint unifié)',
              description: 'Insérer du contenu markdown dans une note entière ou une section spécifique avec position flexible',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/AddContentPayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/note/{ref}/insights': {
            get: {
              summary: 'Récupérer les insights d\'une note',
              description: 'Récupérer les analyses et insights générés automatiquement pour une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ]
            }
          },
          '/api/v2/note/{ref}/table-of-contents': {
            get: {
              summary: 'Récupérer la table des matières',
              description: 'Récupérer la table des matières générée automatiquement d\'une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ]
            }
          },
          '/api/v2/note/{ref}/statistics': {
            get: {
              summary: 'Récupérer les statistiques d\'une note',
              description: 'Récupérer les statistiques détaillées d\'une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ]
            }
          },
          '/api/v2/note/merge': {
            post: {
              summary: 'Fusionner plusieurs notes en une nouvelle note (non implémenté)',
              description: 'Fusionner le contenu de plusieurs notes dans une nouvelle note avec ordre respecté',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/MergeNotesPayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/note/{ref}/publish': {
            post: {
              summary: 'Publier une note',
              description: 'Changer le statut de publication d\'une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/PublishNotePayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/folder/create': {
            post: {
              summary: 'Créer un nouveau dossier',
              description: 'Créer un nouveau dossier dans un classeur spécifique',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CreateFolderPayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/folder/{ref}/move': {
            put: {
              summary: 'Déplacer un dossier',
              description: 'Déplacer un dossier vers un autre classeur',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug du dossier'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/MoveFolderPayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/classeur/{ref}/tree': {
            get: {
              summary: 'Récupérer l\'arborescence d\'un classeur',
              description: 'Récupérer la structure complète d\'un classeur avec ses dossiers et notes',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug du classeur'
                }
              ]
            }
          },
          '/api/v2/classeur/{ref}/reorder': {
            put: {
              summary: 'Réorganiser un classeur',
              description: 'Réorganiser l\'ordre des éléments dans un classeur',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug du classeur'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ReorderPayload'
                    }
                  }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            CreateNotePayload: {
              type: 'object',
              properties: {
                source_title: { type: 'string', minLength: 1, maxLength: 255 },
                notebook_id: { type: 'string', description: 'ID ou slug du classeur' },
                markdown_content: { type: 'string' },
                header_image: { type: 'string', format: 'uri' },
                folder_id: { type: 'string', format: 'uuid' }
              },
              required: ['source_title', 'notebook_id']
            },
            AddContentPayload: {
              type: 'object',
              properties: {
                content: { type: 'string', minLength: 1 }
              },
              required: ['content']
            },
            InsertContentPayload: {
              type: 'object',
              properties: {
                content: { type: 'string', minLength: 1 },
                position: { type: 'integer', minimum: 0 }
              },
              required: ['content', 'position']
            },
            MergeNotePayload: {
              type: 'object',
              properties: {
                targetNoteId: { type: 'string', format: 'uuid' },
                mergeStrategy: { type: 'string', enum: ['append', 'prepend', 'replace'] }
              },
              required: ['targetNoteId', 'mergeStrategy']
            },
            PublishNotePayload: {
              type: 'object',
              properties: {
                visibility: { 
                  type: 'string',
                  enum: ['private', 'public', 'link-private', 'link-public', 'limited', 'scrivia']
                }
              },
              required: ['visibility']
            },
            CreateFolderPayload: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 255 },
                notebook_id: { type: 'string', description: 'ID ou slug du classeur' }
              },
              required: ['name', 'notebook_id']
            },
            MoveFolderPayload: {
              type: 'object',
              properties: {
                notebook_id: { type: 'string', description: 'ID ou slug du classeur' }
              },
              required: ['notebook_id']
            },
            ReorderPayload: {
              type: 'object',
              properties: {
                itemIds: {
                  type: 'array',
                  items: { type: 'string', format: 'uuid' }
                }
              },
              required: ['itemIds']
            }
          }
        }
      };
      
      return schema;
    } catch (error) {
      console.error('[AgentApiV2Tools] ❌ Erreur lors du chargement du schéma OpenAPI:', error);
      return null;
    }
  }

  /**
   * Exécuter un tool OpenAPI
   */
  private async executeOpenAPITool(toolName: string, params: any, jwtToken: string): Promise<any> {
    // context n'est pas utilisé pour le moment
    // const context = { operation: `openapi_${toolName}`, component: 'AgentApiV2Tools' };
    
    try {
      console.log(`[AgentApiV2Tools] 🚀 Exécution tool OpenAPI: ${toolName}`, params);
      
      // Mapping des tools OpenAPI vers les méthodes existantes
      switch (toolName) {
        case 'get_note_content':
          return await this.callApiV2('GET', `/api/v2/note/${params.ref}/content`, null, jwtToken);
          
        case 'insert_content_to_note':
          return await this.callApiV2('POST', `/api/v2/note/${params.ref}/insert-content`, params, jwtToken);
          
        case 'get_note_insights':
          return await this.callApiV2('GET', `/api/v2/note/${params.ref}/insights`, null, jwtToken);
          
        case 'get_note_toc':
          return await this.callApiV2('GET', `/api/v2/note/${params.ref}/table-of-contents`, null, jwtToken);
          
        case 'get_note_statistics':
          return await this.callApiV2('GET', `/api/v2/note/${params.ref}/statistics`, null, jwtToken);
          
        case 'merge_note':
          // TODO: Implémenter la fusion de notes via l'API V2
          // Pour l'instant, cette fonctionnalité est désactivée
          throw new Error('Fusion de notes non implémentée - API LLM obsolète supprimée');
          // return await this.callApiV2('POST', `/api/v2/note/merge`, params, jwtToken);
          
        case 'publish_note':
          return await this.callApiV2('POST', `/api/v2/note/${params.ref}/publish`, params, jwtToken);
          
        case 'move_folder':
          return await this.callApiV2('PUT', `/api/v2/folder/${params.ref}/move`, params, jwtToken);
          
        case 'get_notebook_tree':
          return await this.callApiV2('GET', `/api/v2/classeur/${params.ref}/tree`, null, jwtToken);
          
        case 'delete_note':
          return await this.callApiV2('DELETE', `/api/v2/delete/note/${params.ref}`, null, jwtToken);
          
        case 'reorder_notebook':
          return await this.callApiV2('PUT', `/api/v2/classeur/${params.ref}/reorder`, params, jwtToken);
          
        default:
          // Pour les tools qui n'ont pas de mapping spécifique, utiliser l'API v2
          const endpoint = this.getOpenAPIEndpoint(toolName, params);
          if (endpoint) {
            return await this.callApiV2(endpoint.method, endpoint.path, params, jwtToken);
          }
          
          throw new Error(`Tool OpenAPI non supporté: ${toolName}`);
      }
    } catch (error) {
      console.error(`[AgentApiV2Tools] ❌ Erreur lors de l'exécution du tool OpenAPI ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir l'endpoint pour un tool OpenAPI
   */
  private getOpenAPIEndpoint(toolName: string, params: any): { method: string; path: string } | null {
    const endpointMappings: Record<string, { method: string; path: string }> = {
      'get_note_content': { method: 'GET', path: `/api/v2/note/${params.ref}/content` },
      'insert_content_to_note': { method: 'POST', path: `/api/v2/note/${params.ref}/insert` },
      'get_note_insights': { method: 'GET', path: `/api/v2/note/${params.ref}/insights` },
      'get_note_toc': { method: 'GET', path: `/api/v2/note/${params.ref}/table-of-contents` },
      'get_note_statistics': { method: 'GET', path: `/api/v2/note/${params.ref}/statistics` },
      'merge_note': { method: 'POST', path: `/api/v2/note/${params.ref}/merge` },
      'publish_note': { method: 'POST', path: `/api/v2/note/${params.ref}/publish` },
              'delete_note': { method: 'DELETE', path: `/api/v2/delete/note/${params.ref}` },
      'move_folder': { method: 'PUT', path: `/api/v2/folder/${params.ref}/move` },
      'get_notebook_tree': { method: 'GET', path: `/api/v2/classeur/${params.ref}/tree` },
      'reorder_notebook': { method: 'PUT', path: `/api/v2/classeur/${params.ref}/reorder` }
    };
    
    return endpointMappings[toolName] || null;
  }

  /**
   * Ajouter des tools OpenAPI manuellement
   */
  addOpenAPITools(openApiSchema: any) {
    if (!this.openApiGenerator) {
      this.openApiGenerator = new OpenAPIToolsGenerator(openApiSchema);
    }
    
    const openApiTools = this.openApiGenerator.generateToolsForFunctionCalling();
    
    openApiTools.forEach(tool => {
      const toolName = tool.function.name;
      if (!this.tools.has(toolName)) {
        this.tools.set(toolName, {
          name: toolName,
          description: tool.function.description,
          parameters: tool.function.parameters,
          execute: async (params, jwtToken) => {
            return await this.executeOpenAPITool(toolName, params, jwtToken);
          }
        });
        console.log(`[AgentApiV2Tools] ✅ Tool OpenAPI ajouté: ${toolName}`);
      }
    });
  }

  /**
   * Obtenir les informations de debug OpenAPI
   */
  getOpenAPIDebugInfo() {
    if (!this.openApiGenerator) {
      return { error: 'OpenAPI Generator non initialisé' };
    }
    
    return this.openApiGenerator.getDebugInfo();
  }

  private initializeTools() {
    // Tool: Créer une note
    this.tools.set('create_note', {
      name: 'create_note',
      description: 'Créer une nouvelle note dans un classeur. ATTENTION: Utiliser EXACTEMENT les noms de paramètres suivants: source_title, notebook_id, markdown_content, folder_id. Exemple: {"source_title": "Mon titre", "notebook_id": "uuid-du-classeur"}',
      parameters: {
        type: 'object',
        properties: {
          source_title: {
            type: 'string',
            description: 'Titre de la note (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          notebook_id: {
            type: 'string',
            description: 'ID ou slug du classeur (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          markdown_content: {
            type: 'string',
            description: 'Contenu markdown de la note (optionnel) - utiliser EXACTEMENT ce nom'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier parent (optionnel) - utiliser EXACTEMENT ce nom'
          }
        },
        required: ['source_title', 'notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        // ✅ Mapping des paramètres pour supporter Groq
        const mappedParams = {
          ...params,
          source_title: params.source_title || params.title, // Support pour 'title' (Groq)
          notebook_id: params.notebook_id || params.notebook || params.notebook_slug, // Support pour 'notebook' et 'notebook_slug' (Groq)
          markdown_content: params.markdown_content || params.content // Support pour 'content' (Groq)
        };
        
        const context = { operation: 'create_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.createNote(mappedParams, userId, context);
        return res;
      }
    });

    // Tool: Mettre à jour une note
    this.tools.set('update_note', {
      name: 'update_note',
      description: 'Modifier une note existante. Tous les paramètres sont optionnels - seuls les champs fournis seront modifiés.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à modifier (obligatoire)'
          },
          source_title: {
            type: 'string',
            description: 'Nouveau titre de la note (optionnel)'
          },
          markdown_content: {
            type: 'string',
            description: 'Nouveau contenu markdown (optionnel)'
          },
          description: {
            type: 'string',
            description: 'Nouvelle description de la note (optionnel)'
          },
          notebook_id: {
            type: 'string',
            description: 'Nouveau classeur parent (optionnel)'
          },
          folder_id: {
            type: 'string',
            description: 'Nouveau dossier parent (optionnel, null pour dossier racine)'
          },
          header_image: {
            type: 'string',
            description: 'Nouvelle image de header (URL ou chemin, optionnel, null pour supprimer)'
          },
          header_image_offset: {
            type: 'number',
            description: 'Nouveau décalage vertical de l\'image de header en pixels (optionnel)'
          },
          header_image_blur: {
            type: 'number',
            description: 'Nouveau niveau de flou de l\'image de header (0-100, optionnel)'
          },
          header_image_overlay: {
            type: 'number',
            description: 'Nouveau niveau d\'overlay sombre sur l\'image (0-100, optionnel)'
          },
          header_title_in_image: {
            type: 'boolean',
            description: 'Afficher le titre dans l\'image de header (optionnel)'
          },
          wide_mode: {
            type: 'boolean',
            description: 'Mode large pour l\'affichage de la note (optionnel)'
          },
          font_family: {
            type: 'string',
            description: 'Nouvelle famille de police (optionnel)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const ref = params.ref || params.id || params.note_id || params.slug;
        if (!ref) {
          return { success: false, error: 'ref (ou id/note_id/slug) est requis' };
        }
        // Utiliser directement les paramètres sans extraction
        const data = { ...params };
        const context = { operation: 'update_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.updateNote(ref, data, userId, context);
        return res;
      }
    });

    // Tool: Ajouter du contenu à une note
    this.tools.set('add_content_to_note', {
      name: 'add_content_to_note',
      description: 'Ajouter du texte à la fin d\'une note. ATTENTION: Utiliser EXACTEMENT les noms de paramètres suivants: ref, content. Exemple: {"ref": "uuid-de-la-note", "content": "Nouveau contenu à ajouter"}',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          content: {
            type: 'string',
            description: 'Contenu à ajouter à la fin (obligatoire) - utiliser EXACTEMENT ce nom'
          }
        },
        required: ['ref', 'content']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, content } = params;
        const context = { operation: 'add_content_to_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.addContentToNote(ref, content, userId, context);
        return res;
      }
    });

    // Tool: Déplacer une note
    this.tools.set('move_note', {
      name: 'move_note',
      description: 'Déplacer une note vers un autre dossier. IMPORTANT: Fournir UN SEUL objet JSON avec les paramètres suivants.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à déplacer (obligatoire)'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier de destination (obligatoire)'
          }
        },
        required: ['ref', 'folder_id']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, folder_id } = params;
        const context = { operation: 'move_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.moveNote(ref, folder_id, userId, context);
        return res;
      }
    });

    // Tool: Supprimer une note
    this.tools.set('delete_note', {
      name: 'delete_note',
      description: 'Supprimer définitivement une note. IMPORTANT: Fournir UN SEUL objet JSON avec les paramètres suivants.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à supprimer (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'delete_note', component: 'AgentApiV2Tools' };
        
        console.log('🚀 [AgentApiV2Tools] Début suppression note:', {
          ref,
          jwtToken: !!jwtToken,
          userId,
          params
        });
        
        // 🔧 CORRECTION : Utiliser V2UnifiedApi pour la synchronisation temps réel
        try {
          console.log('🔧 [AgentApiV2Tools] Tentative via V2UnifiedApi...');
          
          console.log('📦 [AgentApiV2Tools] AVANT import de V2UnifiedApi...');
          const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
          console.log('✅ [AgentApiV2Tools] V2UnifiedApi importé avec succès');
          
          console.log('🏭 [AgentApiV2Tools] Création instance V2UnifiedApi...');
          const v2Api = V2UnifiedApi.getInstance();
          console.log('✅ [AgentApiV2Tools] Instance V2UnifiedApi créée');
          
          console.log('🗑️ [AgentApiV2Tools] Appel deleteNote...');
          // ✅ V2UnifiedApi gère automatiquement la suppression du store et le polling
          const result = await v2Api.deleteNote(ref, jwtToken);
          
          console.log('✅ [AgentApiV2Tools] Résultat V2UnifiedApi:', result);
          
          if (result.success) {
            return { success: true, message: 'Note supprimée avec succès' };
          } else {
            console.error('❌ [AgentApiV2Tools] V2UnifiedApi a échoué:', result.error);
            return { success: false, error: result.error };
          }
        } catch (error) {
          console.error('❌ [AgentApiV2Tools] Erreur V2UnifiedApi:', error);
          
          // Fallback vers V2DatabaseUtils si V2UnifiedApi échoue
          console.log('🔄 [AgentApiV2Tools] Fallback vers V2DatabaseUtils...');
          
          try {
            const res = await V2DatabaseUtils.deleteNote(ref, userId, context);
            console.log('✅ [AgentApiV2Tools] Résultat V2DatabaseUtils:', res);
            return res;
          } catch (fallbackError) {
            console.error('❌ [AgentApiV2Tools] Erreur V2DatabaseUtils aussi:', fallbackError);
            return { 
              success: false, 
              error: `Échec suppression: ${fallbackError instanceof Error ? fallbackError.message : 'Erreur inconnue'}` 
            };
          }
        }
      }
    });

    // Tool: Créer un dossier
    this.tools.set('create_folder', {
      name: 'create_folder',
      description: 'Créer un nouveau dossier. ATTENTION: Utiliser EXACTEMENT les noms de paramètres suivants: name, notebook_id, parent_id. Exemple: {"name": "Mon dossier", "notebook_id": "uuid-du-classeur"}',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du dossier (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          notebook_id: {
            type: 'string',
            description: 'ID du classeur où créer le dossier (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          parent_id: {
            type: 'string',
            description: 'ID du dossier parent (optionnel) - utiliser EXACTEMENT ce nom'
          }
        },
        required: ['name', 'notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'create_folder', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.createFolder(params, userId, context);
        return res;
      }
    });

    // Tool: Mettre à jour un dossier
    this.tools.set('update_folder', {
      name: 'update_folder',
      description: 'Modifier le nom ou le dossier parent d\'un dossier existant identifié par son ID ou slug. Les champs non fournis restent inchangés. Le déplacement vers un nouveau parent réorganise la hiérarchie.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du dossier à modifier (obligatoire)'
          },
          name: {
            type: 'string',
            description: 'Nouveau nom du dossier (optionnel, max 255 caractères)'
          },
          parent_id: {
            type: 'string',
            description: 'ID du nouveau dossier parent (optionnel, null pour la racine)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, ...data } = params;
        const context = { operation: 'update_folder', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.updateFolder(ref, data, userId, context);
        return res;
      }
    });

    // Tool: Supprimer un dossier
    this.tools.set('delete_folder', {
      name: 'delete_folder',
      description: 'Supprimer définitivement un dossier vide (sans sous-dossiers ni notes) de la base de données. Cette action est irréversible. Les dossiers contenant des éléments ne peuvent pas être supprimés.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du dossier à supprimer (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'delete_folder', component: 'AgentApiV2Tools' };
        
        // 🔧 CORRECTION : Utiliser V2UnifiedApi pour la synchronisation temps réel
        try {
          const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
          const v2Api = V2UnifiedApi.getInstance();
          
          // ✅ V2UnifiedApi gère automatiquement la suppression du store et le polling
          const result = await v2Api.deleteFolder(ref);
          
          if (result.success) {
            return { success: true, message: 'Dossier supprimé avec succès' };
          } else {
            return { success: false, error: 'Erreur lors de la suppression du dossier' };
          }
        } catch (error) {
          // Fallback vers V2DatabaseUtils si V2UnifiedApi échoue
          const res = await V2DatabaseUtils.deleteFolder(ref, userId, context);
          return res;
        }
      }
    });

    // Tool: Créer un classeur
    this.tools.set('create_notebook', {
      name: 'create_notebook',
      description: 'Créer un nouveau classeur. IMPORTANT: Fournir UN SEUL objet JSON avec les paramètres suivants.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du classeur (obligatoire)'
          },
          description: {
            type: 'string',
            description: 'Description du classeur (optionnel)'
          },
          icon: {
            type: 'string',
            description: 'Icône du classeur (optionnel)'
          }
        },
        required: ['name']
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'create_notebook', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.createClasseur(params, userId, context);
        return res;
      }
    });

    // Tool: Lister tous les classeurs
    this.tools.set('get_notebooks', {
      name: 'get_notebooks',
      description: 'Récupérer la liste des classeurs. IMPORTANT: Cette fonction ne prend aucun paramètre, mais vous devez toujours fournir un objet JSON vide {} comme arguments.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'get_notebooks', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getClasseurs(userId, context);
      }
    });

    // Tool: Récupérer l'arborescence d'un classeur
    this.tools.set('get_notebook_tree', {
      name: 'get_notebook_tree',
      description: 'Récupérer l\'arborescence complète d\'un classeur avec tous ses dossiers et notes.',
      parameters: {
        type: 'object',
        properties: {
          notebook_id: {
            type: 'string',
            description: 'ID ou slug du classeur (obligatoire) - utiliser EXACTEMENT ce nom'
          }
        },
        required: ['notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'get_notebook_tree', component: 'AgentApiV2Tools' };
        try {
          const notebookId = params.notebook_id;
          if (!notebookId) {
            return { success: false, error: 'notebook_id est requis' };
          }
          return await V2DatabaseUtils.getClasseurTree(notebookId, userId, context);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          return { 
            success: false, 
            error: `Échec de la récupération de l'arbre: ${errorMessage}` 
          };
        }
      }
    });

    // Tool: Insérer du contenu à une position spécifique
    this.tools.set('insert_content_to_note', {
      name: 'insert_content_to_note',
      description: 'Insérer du contenu markdown à une position spécifique dans une note existante, sans remplacer le contenu existant. Le nouveau contenu sera inséré à l\'index spécifié.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          content: {
            type: 'string',
            description: 'Contenu markdown à insérer (obligatoire)'
          },
          position: {
            type: 'number',
            description: 'Position d\'insertion (0 = début, obligatoire)'
          }
        },
        required: ['ref', 'content', 'position']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, content, position } = params;
        const context = { operation: 'insert_content_to_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.insertContentToNote(ref, content, position, userId, context);
        return res;
      }
    });

    // Tool: Ajouter du contenu à une section spécifique
    this.tools.set('add_content_to_section', {
      name: 'add_content_to_section',
      description: 'Ajouter du contenu markdown à une section spécifique d\'une note (basée sur les titres markdown). Le contenu sera ajouté à la fin de la section existante.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          sectionId: {
            type: 'string',
            description: 'ID ou titre de la section (obligatoire)'
          },
          content: {
            type: 'string',
            description: 'Contenu markdown à ajouter à la section (obligatoire)'
          }
        },
        required: ['ref', 'sectionId', 'content']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, sectionId, content } = params;
        const context = { operation: 'add_content_to_section', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.addContentToSection(ref, sectionId, content, userId, context);
        return res;
      }
    });

    // Tool: Vider une section
    this.tools.set('clear_section', {
      name: 'clear_section',
      description: 'Vider le contenu d\'une section spécifique d\'une note (basée sur les titres markdown). La section reste mais son contenu est supprimé.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          sectionId: {
            type: 'string',
            description: 'ID ou titre de la section à vider (obligatoire)'
          }
        },
        required: ['ref', 'sectionId']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, sectionId } = params;
        const context = { operation: 'clear_section', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.clearSection(ref, sectionId, userId, context);
        return res;
      }
    });

    // Tool: Supprimer une section
    this.tools.set('erase_section', {
      name: 'erase_section',
      description: 'Supprimer complètement une section et son contenu d\'une note (basée sur les titres markdown). La section et tout son contenu disparaissent.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          sectionId: {
            type: 'string',
            description: 'ID ou titre de la section à supprimer (obligatoire)'
          }
        },
        required: ['ref', 'sectionId']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, sectionId } = params;
        const context = { operation: 'erase_section', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.eraseSection(ref, sectionId, userId, context);
        return res;
      }
    });

    // Tool: Récupérer la table des matières
    this.tools.set('get_table_of_contents', {
      name: 'get_table_of_contents',
      description: 'Récupérer la table des matières d\'une note basée sur les titres markdown. Permet d\'analyser la structure d\'une note avant modification.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_table_of_contents', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getTableOfContents(ref, userId, context);
      }
    });

    // Tool: Récupérer les statistiques d'une note
    this.tools.set('get_note_statistics', {
      name: 'get_note_statistics',
      description: 'Récupérer les statistiques détaillées d\'une note (nombre de caractères, mots, lignes, sections). Permet d\'analyser la complexité d\'une note.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_note_statistics', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getNoteStatistics(ref, userId, context);
      }
    });

    // Tool: Publier une note
    this.tools.set('publish_note', {
      name: 'publish_note',
      description: 'Changer la visibilité d\'une note (public/private) et générer une URL publique. Permet de rendre une note accessible publiquement.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          visibility: {
            type: 'string',
            description: 'Niveau de visibilité de la note (private, public, link-private, link-public, limited, scrivia, obligatoire)',
            enum: ['private', 'public', 'link-private', 'link-public', 'limited', 'scrivia']
          }
        },
        required: ['ref', 'visibility']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, visibility } = params;
        const context = { operation: 'publish_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.publishNote(ref, visibility, userId, context);
        return res;
      }
    });

    // Tool: Récupérer l'arborescence d'un dossier
    this.tools.set('get_folder_tree', {
      name: 'get_folder_tree',
      description: 'Récupérer l\'arborescence complète d\'un dossier : sous-dossiers et notes organisés hiérarchiquement. Permet de comprendre la structure d\'un dossier.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du dossier (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_folder_tree', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getFolderTree(ref, userId, context);
      }
    });

    // Tool: Réorganiser les classeurs
    this.tools.set('reorder_notebooks', {
      name: 'reorder_notebooks',
      description: 'Réorganiser l\'ordre des classeurs de l\'utilisateur selon une nouvelle séquence spécifiée. Permet de personnaliser l\'ordre d\'affichage.',
      parameters: {
        type: 'object',
        properties: {
          classeurs: {
            type: 'array',
            description: 'Liste des classeurs avec leurs nouvelles positions (obligatoire)',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID du classeur'
                },
                position: {
                  type: 'number',
                  description: 'Nouvelle position (0 = premier)'
                }
              },
              required: ['id', 'position']
            }
          }
        },
        required: ['classeurs']
      },
      execute: async (params, jwtToken, userId) => {
        const { classeurs } = params;
        const context = { operation: 'reorder_notebooks', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.reorderClasseurs(classeurs, userId, context);
        return res;
      }
    });

    // Tool: Générer un slug
    this.tools.set('generate_slug', {
      name: 'generate_slug',
      description: 'Générer un slug unique basé sur un texte pour les notes, classeurs ou dossiers. Permet de créer des identifiants URL-friendly.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Texte à partir duquel générer le slug (obligatoire)'
          },
          type: {
            type: 'string',
            description: 'Type d\'élément (note, classeur, folder, obligatoire)',
            enum: ['note', 'classeur', 'folder']
          }
        },
        required: ['text', 'type']
      },
      execute: async (params, jwtToken, userId) => {
        const { text, type } = params;
        const context = { operation: 'generate_slug', component: 'AgentApiV2Tools' };
        
        // Générer le slug directement sans appeler l'endpoint supprimé
        const slug = text
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 120);
        
        return {
          success: true,
          slug,
          original: text,
          message: 'Slug généré localement par l\'agent'
        };
      }
    });

    // Tool: Récupérer le contenu d'une note
    this.tools.set('get_note_content', {
      name: 'get_note_content',
      description: 'Récupérer le contenu complet d\'une note (titre, contenu markdown, métadonnées).',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_note_content', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getNoteContent(ref, userId, context);
      }
    });

    // Tool: Récupérer les métadonnées d'une note
    this.tools.set('get_note_metadata', {
      name: 'get_note_metadata',
      description: 'Récupérer les métadonnées d\'une note (titre, dates, statistiques, etc.) sans le contenu.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_note_metadata', component: 'AgentApiV2Tools' };
        // Utiliser getNoteContent et extraire les métadonnées
        const result = await V2DatabaseUtils.getNoteContent(ref, userId, context);
        if (result.success && result.note) {
          // Retourner directement la note sans extraction
          return { success: true, note: result.note };
        }
        return result;
      }
    });

    // Tool: Récupérer les insights d'une note
    this.tools.set('get_note_insights', {
      name: 'get_note_insights',
      description: 'Récupérer les insights et analyses d\'une note.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_note_insights', component: 'AgentApiV2Tools' };
        // Utiliser getNoteContent pour l'instant (insights à implémenter plus tard)
        return await V2DatabaseUtils.getNoteContent(ref, userId, context);
      }
    });

    // Tool: Fusionner des notes
    this.tools.set('merge_note', {
      name: 'merge_note',
      description: 'Fusionner le contenu d\'une note avec une autre note selon une stratégie spécifique.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note source à fusionner (obligatoire)'
          },
          targetNoteId: {
            type: 'string',
            description: 'ID de la note cible qui recevra le contenu (obligatoire)'
          },
          mergeStrategy: {
            type: 'string',
            enum: ['append', 'prepend', 'replace'],
            description: 'Stratégie de fusion : append (ajouter à la fin), prepend (ajouter au début), replace (remplacer)'
          }
        },
        required: ['ref', 'targetNoteId', 'mergeStrategy']
      },
      execute: async (params) => {
        const { ref, targetNoteId, mergeStrategy } = params;
        // context n'est pas utilisé pour le moment
        // const context = { operation: 'merge_note', component: 'AgentApiV2Tools' };
        // Utiliser l'API HTTP pour l'instant (mergeNote à implémenter dans V2DatabaseUtils plus tard)
        const response = await fetch(`/api/v2/note/${ref}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetNoteId, mergeStrategy })
        });
        const res = await response.json();
        return res;
      }
    });

    // Tool: Mettre à jour un classeur
    this.tools.set('update_notebook', {
      name: 'update_notebook',
      description: 'Modifier les propriétés d\'un classeur existant (nom, description, icône, position). Seuls les champs fournis seront modifiés.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du classeur à modifier (obligatoire)'
          },
          name: {
            type: 'string',
            description: 'Nouveau nom du classeur (optionnel)'
          },
          description: {
            type: 'string',
            description: 'Nouvelle description (optionnel)'
          },
          icon: {
            type: 'string',
            description: 'Nouvelle icône/emoji (optionnel)'
          },
          position: {
            type: 'number',
            description: 'Nouvelle position (optionnel)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, ...updateData } = params;
        const context = { operation: 'update_notebook', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.updateClasseur(ref, updateData, userId, context);
        return res;
      }
    });

    // Tool: Supprimer un classeur
    this.tools.set('delete_notebook', {
      name: 'delete_notebook',
      description: 'Supprimer définitivement un classeur vide (sans dossiers ni notes). Cette action est irréversible.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du classeur à supprimer (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'delete_notebook', component: 'AgentApiV2Tools' };
        
        // 🔧 CORRECTION : Utiliser V2UnifiedApi pour la synchronisation temps réel
        try {
          const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
          const v2Api = V2UnifiedApi.getInstance();
          
          // ✅ V2UnifiedApi gère automatiquement la suppression du store et le polling
          const result = await v2Api.deleteClasseur(ref);
          
          if (result.success) {
            return { success: true, message: 'Classeur supprimé avec succès' };
          } else {
            return { success: false, error: 'Erreur lors de la suppression du classeur' };
          }
        } catch (error) {
          // Fallback vers V2DatabaseUtils si V2UnifiedApi échoue
          const res = await V2DatabaseUtils.deleteClasseur(ref, userId, context);
          return res;
        }
      }
    });

    // Tool: Déplacer un dossier
    this.tools.set('move_folder', {
      name: 'move_folder',
      description: 'Déplacer un dossier vers un nouveau parent. Évite les boucles hiérarchiques.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du dossier à déplacer (obligatoire)'
          },
          target_folder_id: {
            type: 'string',
            description: 'ID du nouveau dossier parent (null pour dossier racine)'
          },
          target_classeur_id: {
            type: 'string',
            description: 'ID du nouveau classeur (optionnel, pour déplacement cross-classeur)'
          }
        },
        required: ['ref', 'target_folder_id']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, target_folder_id, target_classeur_id } = params;
        const context = { operation: 'move_folder', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.moveFolder(ref, target_folder_id, userId, context, target_classeur_id);
        return res;
      }
    });
  }

  /**
   * Appeler l'API v2 directement
   */
  private async callApiV2(method: string, endpoint: string, data: any, jwtToken: string) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm',
        'Authorization': `Bearer ${jwtToken}`
      };

      const config: RequestInit = {
        method,
        headers,
        ...(method !== 'GET' && { body: JSON.stringify(data) })
      };

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      throw error;
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
      'create_note': { entityType: 'notes', operation: 'CREATE' },
      'update_note': { entityType: 'notes', operation: 'UPDATE' },
      'delete_note': { entityType: 'notes', operation: 'DELETE' },
      'add_content_to_note': { entityType: 'notes', operation: 'UPDATE' },
      'insert_content_to_note': { entityType: 'notes', operation: 'UPDATE' },
      'add_content_to_section': { entityType: 'notes', operation: 'UPDATE' },
      'clear_section': { entityType: 'notes', operation: 'UPDATE' },
      'erase_section': { entityType: 'notes', operation: 'UPDATE' },
      'merge_note': { entityType: 'notes', operation: 'UPDATE' },
      'move_note': { entityType: 'notes', operation: 'MOVE' },
      'publish_note': { entityType: 'notes', operation: 'UPDATE' },
      
      // Dossiers
      'create_folder': { entityType: 'folders', operation: 'CREATE' },
      'update_folder': { entityType: 'folders', operation: 'UPDATE' },
      'delete_folder': { entityType: 'folders', operation: 'DELETE' },
      'move_folder': { entityType: 'folders', operation: 'MOVE' },
      
      // Classeurs
      'create_notebook': { entityType: 'classeurs', operation: 'CREATE' },
      'update_notebook': { entityType: 'classeurs', operation: 'UPDATE' },
      'delete_notebook': { entityType: 'classeurs', operation: 'DELETE' },
      'reorder_notebooks': { entityType: 'classeurs', operation: 'UPDATE' },
      
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
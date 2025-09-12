/**
 * Générateur de tools OpenAPI V2 simplifié
 * Génère automatiquement les définitions de tools depuis les types
 */

import { ToolDefinition } from './llm/types/apiV2Types';

/**
 * Générateur de tools basé sur les endpoints API V2
 * Approche déclarative au lieu de 1000+ lignes de JSON
 */
export class OpenAPIToolsGenerator {
  private static tools: ToolDefinition[] = [];

  /**
   * Initialiser les tools de manière déclarative
   */
  static initializeTools(): void {
    this.tools = [
      // Notes
      this.createTool('createNote', 'Créer une nouvelle note', {
        source_title: { type: 'string', maxLength: 255, description: 'Titre de la note' },
        notebook_id: { type: 'string', description: 'ID ou slug du classeur parent' },
        folder_id: { type: 'string', format: 'uuid', description: 'ID du dossier parent (optionnel)' },
        markdown_content: { type: 'string', description: 'Contenu markdown de la note' },
        header_image: { type: 'string', format: 'uri', description: 'URL de l\'image d\'en-tête (optionnel)' }
      }, ['source_title', 'notebook_id']),

      this.createTool('getNote', 'Récupérer une note', {
        ref: { type: 'string', description: 'Référence de la note' },
        fields: { type: 'string', enum: ['all', 'content', 'metadata'], description: 'Champs à récupérer' }
      }, ['ref']),

      this.createTool('updateNote', 'Mettre à jour une note', {
        ref: { type: 'string', description: 'Référence de la note (UUID ou slug)' },
        source_title: { type: 'string', maxLength: 255, description: 'Nouveau titre' },
        markdown_content: { type: 'string', description: 'Nouveau contenu markdown' },
        html_content: { type: 'string', description: 'Contenu HTML' },
        header_image: { type: 'string', format: 'uri', nullable: true, description: 'URL de l\'image d\'en-tête' },
        header_image_offset: { type: 'number', minimum: 0, maximum: 100, description: 'Décalage de l\'image d\'en-tête' },
        header_image_blur: { type: 'integer', minimum: 0, maximum: 5, description: 'Flou de l\'image d\'en-tête' },
        header_image_overlay: { type: 'integer', minimum: 0, maximum: 5, description: 'Superposition de l\'image d\'en-tête' },
        header_title_in_image: { type: 'boolean', description: 'Titre dans l\'image' },
        wide_mode: { type: 'boolean', description: 'Mode large' },
        a4_mode: { type: 'boolean', description: 'Mode A4' },
        slash_lang: { type: 'string', enum: ['fr', 'en'], description: 'Langue des slash commands' },
        font_family: { type: 'string', description: 'Famille de police' },
        folder_id: { type: 'string', format: 'uuid', nullable: true, description: 'ID du dossier parent' },
        description: { type: 'string', maxLength: 500, description: 'Description de la note' }
      }, ['ref']),

      this.createTool('moveNote', 'Déplacer une note', {
        ref: { type: 'string', description: 'Référence de la note (UUID ou slug)' },
        classeur_id: { type: 'string', format: 'uuid', description: 'ID du classeur de destination' },
        folder_id: { type: 'string', format: 'uuid', description: 'ID du dossier de destination (optionnel)' },
        position: { type: 'integer', description: 'Nouvelle position' }
      }, ['ref', 'classeur_id']),

      // Opérations avancées sur notes
      this.createTool('applyContentOperations', 'Appliquer des opérations de contenu', {
        ref: { type: 'string', description: 'Référence de la note (UUID ou slug)' },
        ops: { 
          type: 'array', 
          minItems: 1, 
          maxItems: 50,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID unique de l\'opération' },
              action: { type: 'string', enum: ['insert', 'replace', 'delete', 'upsert_section'], description: 'Type d\'opération à effectuer' },
              target: { type: 'object', description: 'Cible de l\'opération' },
              where: { type: 'string', enum: ['before', 'after', 'inside_start', 'inside_end', 'at', 'replace_match'], description: 'Position relative à la cible' },
              content: { type: 'string', maxLength: 100000, description: 'Contenu à insérer/remplacer' },
              options: { type: 'object', description: 'Options d\'exécution' }
            },
            required: ['id', 'action', 'target', 'where']
          },
          description: 'Liste des opérations à appliquer'
        },
        dry_run: { type: 'boolean', default: true, description: 'Mode simulation (ne sauvegarde pas)' },
        transaction: { type: 'string', enum: ['all_or_nothing', 'best_effort'], default: 'all_or_nothing', description: 'Mode de transaction' },
        conflict_strategy: { type: 'string', enum: ['fail', 'skip'], default: 'fail', description: 'Stratégie en cas de conflit' },
        return: { type: 'string', enum: ['content', 'diff', 'none'], default: 'diff', description: 'Type de retour' },
        idempotency_key: { type: 'string', format: 'uuid', description: 'Clé d\'idempotence' }
      }, ['ref', 'ops']),
      this.createTool('insertNoteContent', 'Insérer du contenu dans une note', {
        ref: { type: 'string', description: 'Référence de la note (UUID ou slug)' },
        content: { type: 'string', description: 'Contenu à insérer' },
        position: { type: 'integer', description: 'Position d\'insertion' },
        where: { type: 'string', enum: ['before', 'after', 'replace'], default: 'after', description: 'Position relative' }
      }, ['ref', 'content']),
      this.createTool('getNoteTOC', 'Récupérer la table des matières d\'une note', {
        ref: { type: 'string', description: 'Référence de la note' }
      }, ['ref']),


      this.createTool('getRecentNotes', 'Récupérer les notes récentes', {
        limit: { type: 'number', description: 'Nombre maximum de notes' }
      }, []),

      // Classeurs
      this.createTool('createClasseur', 'Créer un nouveau classeur', {
        name: { type: 'string', maxLength: 255, description: 'Nom du classeur' },
        description: { type: 'string', maxLength: 1000, description: 'Description du classeur' },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', description: 'Couleur du classeur (hex)' },
        position: { type: 'integer', description: 'Position du classeur' }
      }, ['name']),

      this.createTool('getClasseur', 'Récupérer un classeur', {
        ref: { type: 'string', description: 'Référence du classeur' }
      }, ['ref']),

      this.createTool('updateClasseur', 'Mettre à jour un classeur', {
        ref: { type: 'string', description: 'Référence du classeur' },
        name: { type: 'string', description: 'Nouveau nom' },
        description: { type: 'string', description: 'Nouvelle description' }
      }, ['ref']),

      this.createTool('getClasseurTree', 'Récupérer l\'arborescence d\'un classeur', {
        ref: { type: 'string', description: 'Référence du classeur' }
      }, ['ref']),

      this.createTool('listClasseurs', 'Lister tous les classeurs', {}, []),

      this.createTool('getClasseursWithContent', 'Récupérer tous les classeurs avec contenu', {}, []),

      // Dossiers
      this.createTool('createFolder', 'Créer un nouveau dossier', {
        name: { type: 'string', maxLength: 255, description: 'Nom du dossier' },
        classeur_id: { type: 'string', format: 'uuid', description: 'ID du classeur parent' },
        parent_folder_id: { type: 'string', format: 'uuid', description: 'ID du dossier parent (optionnel)' },
        position: { type: 'integer', description: 'Position du dossier' }
      }, ['name', 'classeur_id']),

      this.createTool('getFolder', 'Récupérer un dossier', {
        ref: { type: 'string', description: 'Référence du dossier' }
      }, ['ref']),

      this.createTool('updateFolder', 'Mettre à jour un dossier', {
        ref: { type: 'string', description: 'Référence du dossier' },
        name: { type: 'string', description: 'Nouveau nom' }
      }, ['ref']),

      this.createTool('moveFolder', 'Déplacer un dossier', {
        ref: { type: 'string', description: 'Référence du dossier (UUID ou slug)' },
        classeur_id: { type: 'string', format: 'uuid', description: 'ID du classeur de destination' },
        parent_folder_id: { type: 'string', format: 'uuid', description: 'ID du dossier parent de destination (optionnel)' },
        position: { type: 'integer', description: 'Nouvelle position' }
      }, ['ref', 'classeur_id']),

      this.createTool('getFolderTree', 'Récupérer l\'arborescence d\'un dossier', {
        ref: { type: 'string', description: 'Référence du dossier' }
      }, ['ref']),

      // Recherche
      this.createTool('searchContent', 'Rechercher du contenu', {
        q: { type: 'string', description: 'Terme de recherche' },
        classeur_id: { type: 'string', description: 'ID du classeur à rechercher' },
        type: { type: 'string', enum: ['all', 'notes', 'classeurs', 'files'], description: 'Type de contenu à rechercher' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Nombre maximum de résultats' }
      }, ['q']),

      this.createTool('searchFiles', 'Rechercher des fichiers', {
        q: { type: 'string', description: 'Terme de recherche' },
        classeur_id: { type: 'string', description: 'ID du classeur à rechercher' },
        file_type: { type: 'string', enum: ['all', 'image', 'document', 'pdf', 'text'], description: 'Type de fichier à rechercher' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Nombre maximum de résultats' }
      }, ['q']),

      // Autres
      this.createTool('getStats', 'Récupérer les statistiques', {}, []),
      this.createTool('getUserProfile', 'Récupérer le profil utilisateur', {}, []),
      this.createTool('getTrash', 'Récupérer la corbeille', {}, []),
      this.createTool('restoreFromTrash', 'Restaurer depuis la corbeille', {
        item_id: { type: 'string', description: 'ID de l\'élément' },
        item_type: { type: 'string', enum: ['note', 'folder', 'classeur'], description: 'Type de l\'élément' }
      }, ['item_id', 'item_type']),
      this.createTool('purgeTrash', 'Vider la corbeille', {}, []),
      this.createTool('deleteResource', 'Supprimer une ressource', {
        resource: { type: 'string', enum: ['note', 'folder', 'classeur'], description: 'Type de ressource' },
        ref: { type: 'string', description: 'Référence de la ressource' }
      }, ['resource', 'ref']),

      // Agents
      this.createTool('listAgents', 'Lister les agents', {}, []),
      this.createTool('createAgent', 'Créer un agent', {
        display_name: { type: 'string', maxLength: 255, description: 'Nom d\'affichage de l\'agent' },
        slug: { type: 'string', maxLength: 100, description: 'Slug unique de l\'agent' },
        description: { type: 'string', maxLength: 1000, description: 'Description de l\'agent' },
        model: { 
          type: 'string', 
          enum: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'kimi-k2-0905'], 
          description: 'Modèle LLM à utiliser (modèles recommandés)' 
        },
        provider: { type: 'string', enum: ['groq', 'openai', 'anthropic'], default: 'groq', description: 'Fournisseur LLM' },
        system_instructions: { type: 'string', description: 'Instructions système pour l\'agent' },
        is_chat_agent: { type: 'boolean', default: false, description: 'Agent de chat ou endpoint' },
        temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.7, description: 'Température de génération' },
        max_tokens: { type: 'integer', minimum: 1, maximum: 10000, default: 4000, description: 'Nombre maximum de tokens' },
        api_v2_capabilities: { type: 'array', items: { type: 'string' }, description: 'Capacités API V2 de l\'agent' },
        input_schema: { type: 'object', description: 'Schéma d\'entrée OpenAPI' },
        output_schema: { type: 'object', description: 'Schéma de sortie OpenAPI' }
      }, ['display_name', 'slug', 'description', 'model']),
      this.createTool('getAgent', 'Récupérer un agent', {
        agentId: { type: 'string', description: 'ID de l\'agent' }
      }, ['agentId']),
      this.createTool('executeAgent', 'Exécuter un agent', {
        ref: { type: 'string', description: 'Référence de l\'agent (ID ou slug)', example: 'johnny' },
        input: { type: 'string', description: 'Message d\'entrée pour l\'agent', example: 'Analyse cette note' },
        image: { type: 'string', format: 'uri', description: 'URL de l\'image à analyser (supporté par les modèles Llama)', example: 'https://example.com/image.jpg' },
        options: { 
          type: 'object', 
          properties: {
            temperature: { type: 'number', minimum: 0, maximum: 2, description: 'Température de génération (0-2)' },
            max_tokens: { type: 'integer', minimum: 1, maximum: 10000, description: 'Nombre maximum de tokens' },
            stream: { type: 'boolean', description: 'Activer le streaming' }
          },
          description: 'Options d\'exécution'
        }
      }, ['ref', 'input']),
      this.createTool('updateAgent', 'Mettre à jour un agent', {
        agentId: { type: 'string', description: 'ID de l\'agent' },
        name: { type: 'string', description: 'Nouveau nom' }
      }, ['agentId']),
      this.createTool('deleteAgent', 'Supprimer un agent', {
        agentId: { type: 'string', description: 'ID de l\'agent' }
      }, ['agentId']),
      this.createTool('patchAgent', 'Modifier partiellement un agent', {
        agentId: { type: 'string', description: 'ID de l\'agent' },
        updates: { type: 'object', description: 'Champs à modifier' }
      }, ['agentId', 'updates']),

      // Notes - Opérations avancées
      this.createTool('getNoteShareSettings', 'Récupérer les paramètres de partage d\'une note', {
        ref: { type: 'string', description: 'Référence de la note' }
      }, ['ref']),
      this.createTool('updateNoteShareSettings', 'Mettre à jour les paramètres de partage d\'une note', {
        ref: { type: 'string', description: 'Référence de la note' },
        is_public: { type: 'boolean', description: 'Note publique ou privée' },
        allow_comments: { type: 'boolean', description: 'Autoriser les commentaires' }
      }, ['ref']),

      // Classeurs - Opérations avancées
      this.createTool('reorderClasseurs', 'Réorganiser l\'ordre des classeurs', {
        classeur_orders: { type: 'array', description: 'Liste des IDs avec leur nouvel ordre' }
      }, ['classeur_orders']),

      // Debug
      this.createTool('listTools', 'Lister les outils', {}, []),
      this.createTool('debugInfo', 'Informations de debug', {
        level: { type: 'string', enum: ['basic', 'detailed', 'full'], description: 'Niveau de détail' }
      }, [])
    ];
  }

  /**
   * Créer un tool de manière déclarative
   */
  private static createTool(
    name: string,
    description: string,
    properties: Record<string, any>,
    required: string[]
  ): ToolDefinition {
      return {
      type: 'function',
      function: {
        name,
        description,
        parameters: {
          type: 'object',
          properties,
          required
        }
      }
    };
  }

  /**
   * Obtenir tous les tools
   */
  static getTools(): ToolDefinition[] {
    if (this.tools.length === 0) {
      this.initializeTools();
    }
    return this.tools;
  }

  /**
   * Obtenir un tool par nom
   */
  static getToolByName(name: string): ToolDefinition | undefined {
    return this.getTools().find(tool => tool.function.name === name);
  }
}

/**
 * Fonction utilitaire pour obtenir les tools OpenAPI V2
 */
export function getOpenAPIV2Tools(): ToolDefinition[] {
  return OpenAPIToolsGenerator.getTools();
} 
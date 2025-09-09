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
        source_title: { type: 'string', description: 'Titre de la note' },
        notebook_id: { type: 'string', description: 'ID du classeur parent' },
        folder_id: { type: 'string', description: 'ID du dossier parent (optionnel)' },
        markdown_content: { type: 'string', description: 'Contenu markdown (optionnel)' }
      }, ['source_title', 'notebook_id']),

      this.createTool('getNote', 'Récupérer une note', {
        ref: { type: 'string', description: 'Référence de la note' },
        fields: { type: 'string', enum: ['all', 'content', 'metadata'], description: 'Champs à récupérer' }
      }, ['ref']),

      this.createTool('updateNote', 'Mettre à jour une note', {
        ref: { type: 'string', description: 'Référence de la note' },
        source_title: { type: 'string', description: 'Nouveau titre' },
        markdown_content: { type: 'string', description: 'Nouveau contenu markdown' }
      }, ['ref']),

      this.createTool('moveNote', 'Déplacer une note', {
        ref: { type: 'string', description: 'Référence de la note' },
        folder_id: { type: 'string', description: 'ID du dossier de destination' },
        classeur_id: { type: 'string', description: 'ID du classeur de destination' }
      }, ['ref']),

      // Opérations avancées sur notes
      this.createTool('applyContentOperations', 'Appliquer des opérations de contenu', {
        ref: { type: 'string', description: 'Référence de la note' },
        operations: { type: 'array', description: 'Liste des opérations à appliquer' }
      }, ['ref', 'operations']),
      this.createTool('insertNoteContent', 'Insérer du contenu dans une note', {
        ref: { type: 'string', description: 'Référence de la note' },
        content: { type: 'string', description: 'Contenu à insérer' },
        position: { type: 'string', enum: ['start', 'end'], description: 'Position d\'insertion' }
      }, ['ref', 'content']),
      this.createTool('getNoteTOC', 'Récupérer la table des matières d\'une note', {
        ref: { type: 'string', description: 'Référence de la note' }
      }, ['ref']),


      this.createTool('getRecentNotes', 'Récupérer les notes récentes', {
        limit: { type: 'number', description: 'Nombre maximum de notes' }
      }, []),

      // Classeurs
      this.createTool('createClasseur', 'Créer un nouveau classeur', {
        name: { type: 'string', description: 'Nom du classeur' },
        description: { type: 'string', description: 'Description du classeur' },
        emoji: { type: 'string', description: 'Emoji pour le classeur' }
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
        name: { type: 'string', description: 'Nom du dossier' },
        classeur_id: { type: 'string', description: 'ID du classeur parent' },
        parent_id: { type: 'string', description: 'ID du dossier parent (optionnel)' }
      }, ['name', 'classeur_id']),

      this.createTool('getFolder', 'Récupérer un dossier', {
        ref: { type: 'string', description: 'Référence du dossier' }
      }, ['ref']),

      this.createTool('updateFolder', 'Mettre à jour un dossier', {
        ref: { type: 'string', description: 'Référence du dossier' },
        name: { type: 'string', description: 'Nouveau nom' }
      }, ['ref']),

      this.createTool('moveFolder', 'Déplacer un dossier', {
        ref: { type: 'string', description: 'Référence du dossier' },
        classeur_id: { type: 'string', description: 'ID du classeur de destination' },
        parent_id: { type: 'string', description: 'ID du dossier parent de destination' }
      }, ['ref']),

      this.createTool('getFolderTree', 'Récupérer l\'arborescence d\'un dossier', {
        ref: { type: 'string', description: 'Référence du dossier' }
      }, ['ref']),

      // Recherche
      this.createTool('searchContent', 'Rechercher du contenu', {
        q: { type: 'string', description: 'Terme de recherche' },
        type: { type: 'string', enum: ['all', 'notes', 'folders', 'classeurs'], description: 'Type de contenu' },
        limit: { type: 'number', description: 'Nombre maximum de résultats' }
      }, ['q']),

      this.createTool('searchFiles', 'Rechercher des fichiers', {
        q: { type: 'string', description: 'Terme de recherche' },
        type: { type: 'string', description: 'Type de fichier' },
        limit: { type: 'number', description: 'Nombre maximum de résultats' }
      }, []),

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
        name: { type: 'string', description: 'Nom de l\'agent' },
        description: { type: 'string', description: 'Description de l\'agent' },
        model: { type: 'string', description: 'Modèle LLM' },
        provider: { type: 'string', description: 'Fournisseur LLM' }
      }, ['name', 'description', 'model', 'provider']),
      this.createTool('getAgent', 'Récupérer un agent', {
        agentId: { type: 'string', description: 'ID de l\'agent' }
      }, ['agentId']),
      this.createTool('executeAgent', 'Exécuter un agent', {
        ref: { type: 'string', description: 'ID ou slug de l\'agent' },
        input: { type: 'string', description: 'Message à envoyer' }
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
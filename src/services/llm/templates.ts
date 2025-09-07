/**
 * Templates de messages système pour les LLM
 * Centralise et permet la personnalisation des instructions système
 */

export interface SystemMessageTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: string[];
  isDefault?: boolean;
}

export interface SystemMessageConfig {
  defaultTemplate: string;
  templates: Record<string, SystemMessageTemplate>;
  customInstructions?: string;
  language: 'fr' | 'en';
}

/**
 * Templates par défaut
 */
const DEFAULT_TEMPLATES: Record<string, SystemMessageTemplate> = {
  'assistant-basic': {
    id: 'assistant-basic',
    name: 'Assistant de base',
    description: 'Assistant IA utile et bienveillant',
    content: 'Tu es un assistant IA utile et bienveillant.',
    variables: [],
    isDefault: true
  },
  
  'assistant-scrivia': {
    id: 'assistant-scrivia',
    name: 'Assistant Scrivia',
    description: 'Assistant spécialisé dans l\'aide et la conversation avec contexte Scrivia',
    content: 'Tu es un assistant IA spécialisé dans l\'aide et la conversation avec l\'API Scrivia.',
    variables: [],
    isDefault: false
  },
  
  'assistant-tools': {
    id: 'assistant-tools',
    name: 'Assistant avec outils',
    description: 'Assistant capable d\'utiliser des outils et function calls',
    content: `Tu es un assistant IA utile et bienveillant.

## Instructions pour les function calls
- Tu peux utiliser les outils disponibles pour interagir avec l'API Scrivia
- Choisis l'outil le plus approprié pour répondre à la demande
- Fournis les paramètres requis pour chaque outil
- Explique tes actions de manière claire

## 🎯 RÈGLES CRITIQUES POUR LES TOOL CALLS
**IMPORTANT :** Utilise UN SEUL tool call à la fois, sauf si absolument nécessaire.

### Règles d'or :
1. **UNE ACTION = UN TOOL CALL** : Pour créer une note, utilise SEULEMENT createNote
2. **ÉVITE LES ACTIONS MULTIPLES** : Ne crée pas plusieurs notes, classeurs ou dossiers en une fois
3. **PRIORITÉ À L'EFFICACITÉ** : Si tu peux répondre sans outils, fais-le
4. **ÉVALUATION OBLIGATOIRE** : Avant chaque tool call, demande-toi : "Est-ce vraiment nécessaire ?"

### Exemples :
- ✅ "Créer une note" → UN SEUL createNote
- ❌ "Créer une note" → createNote + createClasseur + createDossier
- ✅ "Organiser mes notes" → UN SEUL listNotes puis réponse textuelle
- ❌ "Organiser mes notes" → listNotes + createClasseur + moveNote + updateNote

**RÉSULTAT ATTENDU :** Maximum 1-2 tool calls par demande utilisateur.`,
    variables: [],
    isDefault: false
  },
  
  'assistant-contextual': {
    id: 'assistant-contextual',
    name: 'Assistant contextuel',
    description: 'Assistant avec contexte utilisateur et personnalisation',
    content: `Tu es un assistant IA utile et bienveillant.

## Contexte utilisateur
- Type: {{context.type}}
- Nom: {{context.name}}
- ID: {{context.id}}
- Contenu: {{context.content}}

## Instructions pour les function calls
- Tu peux utiliser les outils disponibles pour interagir avec l'API Scrivia
- Choisis l'outil le plus approprié pour répondre à la demande
- Fournis les paramètres requis pour chaque outil
- Explique tes actions de manière claire

## 🎯 RÈGLES CRITIQUES POUR LES TOOL CALLS
**IMPORTANT :** Utilise UN SEUL tool call à la fois, sauf si absolument nécessaire.

### Règles d'or :
1. **UNE ACTION = UN TOOL CALL** : Pour créer une note, utilise SEULEMENT createNote
2. **ÉVITE LES ACTIONS MULTIPLES** : Ne crée pas plusieurs notes, classeurs ou dossiers en une fois
3. **PRIORITÉ À L'EFFICACITÉ** : Si tu peux répondre sans outils, fais-le
4. **ÉVALUATION OBLIGATOIRE** : Avant chaque tool call, demande-toi : "Est-ce vraiment nécessaire ?"

### Exemples :
- ✅ "Créer une note" → UN SEUL createNote
- ❌ "Créer une note" → createNote + createClasseur + createDossier
- ✅ "Organiser mes notes" → UN SEUL listNotes puis réponse textuelle
- ❌ "Organiser mes notes" → listNotes + createClasseur + moveNote + updateNote

**RÉSULTAT ATTENDU :** Maximum 1-2 tool calls par demande utilisateur.`,
    variables: ['context.type', 'context.name', 'context.id', 'context.content'],
    isDefault: false
  },
  
  'assistant-error-handler': {
    id: 'assistant-error-handler',
    name: 'Assistant gestionnaire d\'erreurs',
    description: 'Assistant spécialisé dans la gestion d\'erreurs avec fallbacks',
    content: `Toujours produire une réponse structurée même en cas d'échec d'un outil. 

Structure recommandée:
- Brève explication de l'erreur (1 phrase)
- Proposition d'une action concrète et sûre
- Question finale claire pour confirmer la suite

La réponse ne doit JAMAIS être vide.`,
    variables: [],
    isDefault: false
  }
};

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: SystemMessageConfig = {
  defaultTemplate: 'assistant-contextual',
  templates: DEFAULT_TEMPLATES,
  customInstructions: undefined,
  language: 'fr'
};

/**
 * Gestionnaire de templates de messages système
 */
export class SystemMessageTemplateManager {
  private static instance: SystemMessageTemplateManager;
  private config: SystemMessageConfig;
  private customTemplates: Record<string, SystemMessageTemplate> = {};

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadCustomTemplates();
  }

  static getInstance(): SystemMessageTemplateManager {
    if (!SystemMessageTemplateManager.instance) {
      SystemMessageTemplateManager.instance = new SystemMessageTemplateManager();
    }
    return SystemMessageTemplateManager.instance;
  }

  /**
   * Charge les templates personnalisés depuis l'environnement
   */
  private loadCustomTemplates(): void {
    // Charger depuis les variables d'environnement
    const customTemplate = process.env.CUSTOM_SYSTEM_TEMPLATE;
    if (customTemplate) {
      try {
        const parsed = JSON.parse(customTemplate);
        this.customTemplates = parsed;
      } catch (error) {
        console.warn('[SystemMessageTemplateManager] Erreur parsing template personnalisé:', error);
      }
    }
  }

  /**
   * Obtient un template par ID
   */
  getTemplate(templateId: string): SystemMessageTemplate | null {
    return this.config.templates[templateId] || this.customTemplates[templateId] || null;
  }

  /**
   * Obtient le template par défaut
   */
  getDefaultTemplate(): SystemMessageTemplate {
    const defaultTemplate = this.config.templates[this.config.defaultTemplate];
    if (!defaultTemplate) {
      throw new Error(`Template par défaut '${this.config.defaultTemplate}' non trouvé`);
    }
    return defaultTemplate;
  }

  /**
   * Liste tous les templates disponibles
   */
  getAllTemplates(): SystemMessageTemplate[] {
    return [
      ...Object.values(this.config.templates),
      ...Object.values(this.customTemplates)
    ];
  }

  /**
   * Rend un template avec des variables
   */
  renderTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' non trouvé`);
    }

    let content = template.content;
    
    // Remplacer les variables {{variable}}
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      if (content.includes(placeholder)) {
        content = content.replace(new RegExp(placeholder, 'g'), String(value || ''));
      }
    }

    // Ajouter les instructions personnalisées si configurées
    if (this.config.customInstructions) {
      content += `\n\n## Instructions personnalisées\n${this.config.customInstructions}`;
    }

    return content;
  }

  /**
   * Change le template par défaut
   */
  setDefaultTemplate(templateId: string): void {
    if (!this.getTemplate(templateId)) {
      throw new Error(`Template '${templateId}' non trouvé`);
    }
    this.config.defaultTemplate = templateId;
  }

  /**
   * Ajoute un template personnalisé
   */
  addCustomTemplate(template: SystemMessageTemplate): void {
    this.customTemplates[template.id] = template;
  }

  /**
   * Supprime un template personnalisé
   */
  removeCustomTemplate(templateId: string): void {
    delete this.customTemplates[templateId];
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig: Partial<SystemMessageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.loadCustomTemplates();
  }

  /**
   * Obtient la configuration actuelle
   */
  getConfig(): SystemMessageConfig {
    return { ...this.config };
  }
}

/**
 * Fonctions utilitaires pour la compatibilité
 */
export const getSystemMessage = (templateId: string, variables?: Record<string, any>): string => {
  const manager = SystemMessageTemplateManager.getInstance();
  try {
    return manager.renderTemplate(templateId, variables || {});
  } catch (error) {
    console.warn(`[getSystemMessage] Template '${templateId}' non trouvé, utilisation du template par défaut`);
    return manager.renderTemplate(manager.getDefaultTemplate().id, variables || {});
  }
};

export const getDefaultSystemMessage = (variables?: Record<string, any>): string => {
  const manager = SystemMessageTemplateManager.getInstance();
  return manager.renderTemplate(manager.getDefaultTemplate().id, variables || {});
};

export const buildOneShotSystemInstruction = (): string => {
  return getSystemMessage('assistant-error-handler');
};

export const buildContextualSystemMessage = (context: any): string => {
  return getSystemMessage('assistant-contextual', { context });
}; 
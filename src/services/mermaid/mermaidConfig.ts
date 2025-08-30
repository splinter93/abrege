/**
 * Configuration Mermaid simplifiée et compatible
 * Résout les problèmes de configuration complexe
 */

export interface MermaidConfig {
  startOnLoad: boolean;
  theme: string;
  securityLevel: string;
  fontFamily: string;
  fontSize: number;
  flowchart: {
    useMaxWidth: boolean;
    htmlLabels: boolean;
    curve: string;
  };
  sequence: {
    useMaxWidth: boolean;
    diagramMarginX: number;
    diagramMarginY: number;
  };
  gantt: {
    useMaxWidth: boolean;
    titleTopMargin: number;
    barHeight: number;
  };
  pie: {
    useMaxWidth: boolean;
  };
}

/**
 * Configuration Mermaid simplifiée et compatible
 * Supprime les propriétés problématiques
 */
export const defaultMermaidConfig: MermaidConfig = {
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: 'Noto Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 14,
  
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  },
  
  sequence: {
    useMaxWidth: true,
    diagramMarginX: 50,
    diagramMarginY: 20
  },
  
  gantt: {
    useMaxWidth: true,
    titleTopMargin: 30,
    barHeight: 25
  },
  
  pie: {
    useMaxWidth: true
  }
};

/**
 * Initialise la configuration Mermaid de manière sécurisée
 */
export async function initializeMermaid(customConfig?: Partial<MermaidConfig>): Promise<void> {
  try {
    // Importer Mermaid dynamiquement
    const mermaidModule = await import('mermaid');
    const mermaid = mermaidModule.default;
    
    // Fusionner la configuration par défaut avec la configuration personnalisée
    const config = { ...defaultMermaidConfig, ...customConfig };
    
    // Initialiser Mermaid avec la configuration simplifiée
    mermaid.initialize(config);
    
    console.log('✅ Mermaid initialisé avec succès:', config);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Mermaid:', error);
    throw error;
  }
}

/**
 * Obtient la configuration Mermaid actuelle
 */
export function getMermaidConfig(): MermaidConfig {
  return { ...defaultMermaidConfig };
}

/**
 * Met à jour la configuration Mermaid
 */
export async function updateMermaidConfig(updates: Partial<MermaidConfig>): Promise<void> {
  try {
    // Importer Mermaid dynamiquement
    const mermaidModule = await import('mermaid');
    const mermaid = mermaidModule.default;
    
    // Fusionner les mises à jour avec la configuration actuelle
    const currentConfig = getMermaidConfig();
    const newConfig = { ...currentConfig, ...updates };
    
    // Mettre à jour la configuration
    mermaid.initialize(newConfig);
    
    console.log('✅ Configuration Mermaid mise à jour:', newConfig);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la configuration Mermaid:', error);
    throw error;
  }
}

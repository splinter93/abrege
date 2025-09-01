/**
 * Renderer Mermaid simplifié et robuste
 * Résout les problèmes de rendu et d'erreurs
 */

import { initializeMermaid, defaultMermaidConfig } from './mermaidConfig';
import { 
  normalizeMermaidContent, 
  getMermaidDiagramType, 
  generateMermaidId,
  isMermaidErrorSvg 
} from './mermaidService';
import { simpleLogger as logger } from '@/utils/logger';

export interface MermaidRenderResult {
  svg: string;
  id: string;
  diagramType: string;
  success: boolean;
  error?: string;
}

export interface MermaidRenderOptions {
  timeout?: number;
  retryCount?: number;
  onProgress?: (status: 'loading' | 'rendering' | 'success' | 'error') => void;
}

/**
 * Renderer Mermaid simplifié avec gestion d'erreurs robuste
 */
export class MermaidRenderer {
  private static instance: MermaidRenderer;
  private isInitialized = false;
  private renderQueue: Map<string, AbortController> = new Map();

  private constructor() {
    // Initialiser Mermaid au premier usage
    this.initialize();
  }

  /**
   * Obtient l'instance singleton du renderer
   */
  public static getInstance(): MermaidRenderer {
    if (!MermaidRenderer.instance) {
      MermaidRenderer.instance = new MermaidRenderer();
    }
    return MermaidRenderer.instance;
  }

  /**
   * Initialise Mermaid avec la configuration par défaut
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('Initialisation de Mermaid...');
      await initializeMermaid(defaultMermaidConfig);
      this.isInitialized = true;
      logger.info('Mermaid initialisé avec succès');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de Mermaid:', error);
      throw error;
    }
  }

  /**
   * Rend un diagramme Mermaid de manière robuste
   */
  public async render(
    content: string, 
    options: MermaidRenderOptions = {}
  ): Promise<MermaidRenderResult> {
    const {
      timeout = 10000,
      retryCount = 0,
      onProgress
    } = options;

    // S'assurer que Mermaid est initialisé
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Normaliser le contenu
    const normalizedContent = normalizeMermaidContent(content);
    
    if (!normalizedContent.trim()) {
      return {
        svg: '',
        id: '',
        diagramType: 'unknown',
        success: false,
        error: 'Contenu vide'
      };
    }

    // Détecter le type de diagramme
    const diagramType = getMermaidDiagramType(normalizedContent);
    
    // Générer un ID unique
    const id = generateMermaidId();
    
    // Créer un contrôleur d'annulation
    const abortController = new AbortController();
    this.renderQueue.set(id, abortController);

    try {
      onProgress?.('loading');
      logger.info(`Rendu du diagramme ${diagramType} avec l'ID ${id}`);

      // Importer Mermaid dynamiquement
      const mermaidModule = await import('mermaid');
      const mermaid = mermaidModule.default;

      // Vérifier que Mermaid est bien chargé
      if (!mermaid || typeof mermaid.render !== 'function') {
        throw new Error('Mermaid non disponible ou invalide');
      }

      // Appliquer la configuration avant le rendu
      mermaid.initialize(defaultMermaidConfig);

      onProgress?.('rendering');

      // Rendre le diagramme avec timeout
      const renderPromise = mermaid.render(id, normalizedContent);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout de rendu (${timeout}ms)`)), timeout)
      );

      const result = await Promise.race([renderPromise, timeoutPromise]);

      // Vérifier si le rendu a été annulé
      if (abortController.signal.aborted) {
        throw new Error('Rendu annulé');
      }

      // Vérifier le résultat
      if (result && typeof result === 'object' && 'svg' in result) {
        const svg = result.svg as string;
        
        // Vérifier si c'est un SVG d'erreur
        if (isMermaidErrorSvg(svg)) {
          throw new Error('Erreur de syntaxe Mermaid détectée');
        }

        // Vérifier que le SVG est valide
        if (!svg.includes('<svg') || !svg.includes('</svg>')) {
          throw new Error('SVG invalide retourné par Mermaid');
        }

        onProgress?.('success');
        logger.info(`Diagramme ${diagramType} rendu avec succès`);

        return {
          svg,
          id,
          diagramType,
          success: true
        };
      } else {
        throw new Error('Format de réponse Mermaid invalide');
      }

    } catch (error) {
      // Nettoyer la queue
      this.renderQueue.delete(id);

      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      logger.error(`Erreur lors du rendu du diagramme ${diagramType}:`, errorMessage);
      onProgress?.('error');

      // Retry automatique si configuré
      if (retryCount > 0 && !abortController.signal.aborted) {
        logger.warn(`Tentative de retry pour le diagramme ${id}:`, errorMessage);
        return this.render(content, { ...options, retryCount: retryCount - 1 });
      }

      return {
        svg: '',
        id,
        diagramType,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Annule le rendu d'un diagramme
   */
  public cancelRender(id: string): void {
    const controller = this.renderQueue.get(id);
    if (controller) {
      controller.abort();
      this.renderQueue.delete(id);
      logger.info(`Rendu annulé pour le diagramme ${id}`);
    }
  }

  /**
   * Annule tous les rendus en cours
   */
  public cancelAllRenders(): void {
    this.renderQueue.forEach(controller => controller.abort());
    this.renderQueue.clear();
    logger.info('Tous les rendus annulés');
  }

  /**
   * Vérifie si un rendu est en cours
   */
  public isRendering(id: string): boolean {
    return this.renderQueue.has(id);
  }

  /**
   * Obtient le nombre de rendus en cours
   */
  public getActiveRenderCount(): number {
    return this.renderQueue.size;
  }

  /**
   * Nettoie les ressources du renderer
   */
  public cleanup(): void {
    this.cancelAllRenders();
    this.isInitialized = false;
    logger.info('Renderer Mermaid nettoyé');
  }
}

/**
 * Hook React pour utiliser le renderer Mermaid
 */
export function useMermaidRenderer() {
  const renderer = MermaidRenderer.getInstance();

  const render = async (
    content: string, 
    options: MermaidRenderOptions = {}
  ): Promise<MermaidRenderResult> => {
    return renderer.render(content, options);
  };

  const cancelRender = (id: string): void => {
    renderer.cancelRender(id);
  };

  const cancelAllRenders = (): void => {
    renderer.cancelAllRenders();
  };

  return {
    render,
    cancelRender,
    cancelAllRenders,
    isRendering: renderer.isRendering.bind(renderer),
    getActiveRenderCount: renderer.getActiveRenderCount.bind(renderer)
  };
}

/**
 * Fonction utilitaire pour rendre un diagramme Mermaid rapidement
 */
export async function renderMermaid(
  content: string, 
  options: MermaidRenderOptions = {}
): Promise<MermaidRenderResult> {
  const renderer = MermaidRenderer.getInstance();
  return renderer.render(content, options);
}

/**
 * Fonction utilitaire pour annuler un rendu Mermaid
 */
export function cancelMermaidRender(id: string): void {
  const renderer = MermaidRenderer.getInstance();
  renderer.cancelRender(id);
}

/**
 * Gestionnaire multimodale pour les agents spécialisés
 * Supporte le format Groq avec images et texte
 */

import { simpleLogger as logger } from '@/utils/logger';

export interface MultimodalMessage {
  role: 'user' | 'assistant' | 'system';
  content: Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

export interface GroqMultimodalPayload {
  messages: MultimodalMessage[];
  model: string;
  temperature?: number;
  max_completion_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string | string[] | null;
}

export class MultimodalHandler {
  /**
   * Convertit un message simple en format multimodale Groq
   */
  static createMultimodalMessage(
    role: 'user' | 'assistant' | 'system',
    text: string,
    imageUrl?: string
  ): MultimodalMessage {
    const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string; detail?: string } }> = [
      { type: 'text', text }
    ];

    if (imageUrl) {
      content.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: 'auto'
        }
      });
    }

    return { role, content };
  }

  /**
   * Crée un payload Groq pour requête multimodale
   */
  static createGroqPayload(
    model: string,
    text: string,
    imageUrl?: string,
    options: {
      temperature?: number;
      max_completion_tokens?: number;
      top_p?: number;
      stream?: boolean;
      stop?: string | string[] | null;
    } = {}
  ): GroqMultimodalPayload {
    const message = this.createMultimodalMessage('user', text, imageUrl);

    return {
      messages: [message],
      model,
      temperature: options.temperature ?? 1,
      max_completion_tokens: options.max_completion_tokens ?? 1024,
      top_p: options.top_p ?? 1,
      stream: options.stream ?? false,
      stop: options.stop ?? null
    };
  }

  /**
   * Valide qu'un modèle supporte les images
   */
  static isMultimodalModel(model: string): boolean {
    const multimodalModels = [
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'meta-llama/llama-3.3-70b-versatile',
      'deepseek-vision'
    ];
    return multimodalModels.includes(model);
  }

  /**
   * Extrait les URLs d'images d'un contenu multimodale
   */
  static extractImageUrls(content: unknown): string[] {
    const urls: string[] = [];
    
    if (Array.isArray(content)) {
      content.forEach(item => {
        if (item.type === 'image_url' && item.image_url?.url) {
          urls.push(item.image_url.url);
        }
      });
    }
    
    return urls;
  }

  /**
   * Valide une URL d'image
   */
  static validateImageUrl(url: string): { valid: boolean; error?: string } {
    try {
      const urlObj = new URL(url);
      
      // Vérifier que c'est une URL valide
      if (!urlObj.protocol.startsWith('http')) {
        return { valid: false, error: 'URL doit commencer par http:// ou https://' };
      }

      // Vérifier les extensions d'image supportées
      const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const hasImageExtension = supportedExtensions.some(ext => 
        urlObj.pathname.toLowerCase().endsWith(ext)
      );

      if (!hasImageExtension && !url.includes('data:image/')) {
        return { 
          valid: false, 
          error: `Extension d'image non supportée. Extensions supportées: ${supportedExtensions.join(', ')}` 
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'URL invalide' };
    }
  }

  /**
   * Prépare le contenu pour l'API Groq
   */
  static prepareGroqContent(
    input: unknown,
    model: string
  ): { text: string; imageUrl?: string; error?: string } {
    try {
      // Si c'est une chaîne simple, la traiter comme du texte
      if (typeof input === 'string') {
        return { text: input };
      }

      // Si c'est un objet avec des propriétés spécifiques
      if (typeof input === 'object' && input !== null) {
        const text = input.query || input.question || input.prompt || input.text || input.input || '';
        const imageUrl = input.imageUrl || input.image_url || input.image || '';

        if (!text && !imageUrl) {
          return { 
            text: '', 
            error: 'Aucun texte ou image fourni. Fournissez au moins "text" ou "imageUrl"' 
          };
        }

        // Valider l'URL d'image si fournie
        if (imageUrl) {
          const validation = this.validateImageUrl(imageUrl);
          if (!validation.valid) {
            return { text: text || '', error: validation.error };
          }
        }

        return { text, imageUrl: imageUrl || undefined };
      }

      return { text: String(input) };
    } catch (error: unknown) {
      logger.error('[MultimodalHandler] Erreur préparation contenu:', error);
      return { text: '', error: error.message };
    }
  }

  /**
   * Log des informations de debug pour les requêtes multimodales
   */
  static logMultimodalRequest(
    model: string,
    text: string,
    imageUrl?: string,
    traceId?: string
  ): void {
    logger.info('[MultimodalHandler] 🖼️ Requête multimodale', {
      model,
      hasText: !!text,
      hasImage: !!imageUrl,
      textLength: text.length,
      imageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : 'none',
      traceId
    });
  }
}

// import.*logger.*from '@/utils/logger';

interface IntentMatch {
  action: string;
  confidence: number;
  extractedData: Record<string, unknown>;
  originalMessage: string;
}

interface ApiV2Action {
  resource: string;
  operation: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  dataExtractor: (message: string) => Record<string, unknown>;
}

export class AgentIntentParser {
  private apiV2Actions: Map<string, ApiV2Action> = new Map();
  private intentPatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializeApiV2Actions();
    this.initializeIntentPatterns();
  }

  private initializeApiV2Actions() {
    // Note actions
    this.apiV2Actions.set('note:create', {
      resource: 'note',
      operation: 'create',
      endpoint: '/api/v2/note/create',
      method: 'POST',
      dataExtractor: (message: string) => {
        const titleMatch = message.match(/['"]([^'"]+)['"]/);
        const contentMatch = message.match(/avec\s+(?:le\s+)?contenu\s+['"]([^'"]+)['"]/);
        const notebookMatch = message.match(/dans\s+(?:le\s+)?(?:classeur|notebook)\s+['"]([^'"]+)['"]/);
        
        return {
          source_title: titleMatch?.[1] || 'Nouvelle note',
          markdown_content: contentMatch?.[1] || '',
          notebook_id: notebookMatch?.[1] || null
        };
      }
    });

    this.apiV2Actions.set('note:update', {
      resource: 'note',
      operation: 'update',
      endpoint: '/api/v2/note/{ref}/update',
      method: 'PUT',
      dataExtractor: (message: string) => {
        const refMatch = message.match(/note\s+['"]([^'"]+)['"]/);
        const titleMatch = message.match(/titre\s+['"]([^'"]+)['"]/);
        const contentMatch = message.match(/contenu\s+['"]([^'"]+)['"]/);
        
        return {
          ref: refMatch?.[1] || '',
          source_title: titleMatch?.[1],
          markdown_content: contentMatch?.[1]
        };
      }
    });

    this.apiV2Actions.set('note:add-content', {
      resource: 'note',
      operation: 'add-content',
      endpoint: '/api/v2/note/{ref}/add-content',
      method: 'POST',
      dataExtractor: (message: string) => {
        const refMatch = message.match(/note\s+['"]([^'"]+)['"]/);
        const contentMatch = message.match(/ajouter\s+['"]([^'"]+)['"]/);
        
        return {
          ref: refMatch?.[1] || '',
          content: contentMatch?.[1] || ''
        };
      }
    });

    this.apiV2Actions.set('note:move', {
      resource: 'note',
      operation: 'move',
      endpoint: '/api/v2/note/{ref}/move',
      method: 'PUT',
      dataExtractor: (message: string) => {
        const refMatch = message.match(/note\s+['"]([^'"]+)['"]/);
        const folderMatch = message.match(/vers\s+(?:le\s+)?(?:dossier|folder)\s+['"]([^'"]+)['"]/);
        
        return {
          ref: refMatch?.[1] || '',
          folder_id: folderMatch?.[1] || ''
        };
      }
    });

    this.apiV2Actions.set('note:delete', {
      resource: 'note',
      operation: 'delete',
              endpoint: '/api/v2/note/{ref}',
      method: 'DELETE',
      dataExtractor: (message: string) => {
        const refMatch = message.match(/note\s+['"]([^'"]+)['"]/);
        
        return {
          ref: refMatch?.[1] || ''
        };
      }
    });

    // Folder actions
    this.apiV2Actions.set('folder:create', {
      resource: 'folder',
      operation: 'create',
      endpoint: '/api/v2/folder/create',
      method: 'POST',
      dataExtractor: (message: string) => {
        const nameMatch = message.match(/dossier\s+['"]([^'"]+)['"]/);
        const notebookMatch = message.match(/dans\s+(?:le\s+)?(?:classeur|notebook)\s+['"]([^'"]+)['"]/);
        
        return {
          name: nameMatch?.[1] || 'Nouveau dossier',
          notebook_id: notebookMatch?.[1] || null
        };
      }
    });
  }

  private initializeIntentPatterns() {
    // Patterns pour détecter les intentions
    this.intentPatterns.set('note:create', [
      /créer.*note.*['"]([^'"]+)['"]/i,
      /faire.*note.*['"]([^'"]+)['"]/i,
      /générer.*note.*['"]([^'"]+)['"]/i
    ]);

    this.intentPatterns.set('note:update', [
      /modifier.*note.*['"]([^'"]+)['"]/i,
      /mettre à jour.*note.*['"]([^'"]+)['"]/i,
      /éditer.*note.*['"]([^'"]+)['"]/i
    ]);

    this.intentPatterns.set('note:add-content', [
      /ajouter.*['"]([^'"]+)['"].*note.*['"]([^'"]+)['"]/i,
      /ajouter.*contenu.*note.*['"]([^'"]+)['"]/i
    ]);

    this.intentPatterns.set('note:move', [
      /déplacer.*note.*['"]([^'"]+)['"].*vers/i,
      /bouger.*note.*['"]([^'"]+)['"].*vers/i
    ]);

    this.intentPatterns.set('note:delete', [
      /supprimer.*note.*['"]([^'"]+)['"]/i,
      /effacer.*note.*['"]([^'"]+)['"]/i
    ]);

    this.intentPatterns.set('folder:create', [
      /créer.*dossier.*['"]([^'"]+)['"]/i,
      /faire.*dossier.*['"]([^'"]+)['"]/i
    ]);
  }

  /**
   * Parse une intention API v2 à partir d'un message en langage naturel
   */
  parseApiV2Intent(message: string, capabilities: string[]): IntentMatch | null {
    console.log('[IntentParser] 🔍 Analyse du message:', message);
    console.log('[IntentParser] 🎯 Capacités disponibles:', capabilities);

    let bestMatch: IntentMatch | null = null;
    let highestConfidence = 0;

    // Tester chaque capacité disponible
    for (const capability of capabilities) {
      const patterns = this.intentPatterns.get(capability);
      if (!patterns) {
        console.log(`[IntentParser] ⚠️ Pas de patterns pour ${capability}`);
        continue;
      }

      console.log(`[IntentParser] 🔍 Test de ${capability} avec ${patterns.length} patterns`);
      
      for (const pattern of patterns) {
        console.log(`[IntentParser] 🧪 Test pattern: ${pattern.source}`);
        const match = message.match(pattern);
        console.log(`[IntentParser] 📊 Match result:`, match);
        
        if (match) {
          const confidence = this.calculateConfidence(message, pattern, match);
          
          console.log(`[IntentParser] ✅ Match trouvé pour ${capability}:`, {
            pattern: pattern.source,
            confidence,
            extractedData: this.extractData(capability, message)
          });

          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              action: capability,
              confidence,
              extractedData: this.extractData(capability, message),
              originalMessage: message
            };
          }
        }
      }
    }

    if (bestMatch) {
      console.log('[IntentParser] 🎯 Intention détectée:', {
        action: bestMatch.action,
        confidence: bestMatch.confidence,
        extractedData: bestMatch.extractedData
      });
    } else {
      console.log('[IntentParser] ❌ Aucune intention détectée');
    }

    return bestMatch;
  }

  /**
   * Calcule la confiance d'une correspondance
   */
  private calculateConfidence(message: string, pattern: RegExp, match: RegExpMatchArray): number {
    const matchLength = match[0].length;
    const messageLength = message.length;
    const coverage = matchLength / messageLength;
    
    // Bonus pour les patterns plus spécifiques
    const specificityBonus = pattern.source.includes('["\']') ? 0.2 : 0;
    
    return Math.min(coverage + specificityBonus, 1.0);
  }

  /**
   * Extrait les données à partir d'une capacité et d'un message
   */
  private extractData(capability: string, message: string): Record<string, unknown> {
    const action = this.apiV2Actions.get(capability);
    if (!action) return {};

    return action.dataExtractor(message);
  }

  /**
   * Construit l'endpoint complet avec les données extraites
   */
  buildApiV2Request(intentMatch: IntentMatch): {
    endpoint: string;
    method: string;
    data: Record<string, unknown>;
  } | null {
    const action = this.apiV2Actions.get(intentMatch.action);
    if (!action) return null;

    const data = intentMatch.extractedData;
    let endpoint = action.endpoint;

    // Remplacer les paramètres dans l'URL
    if (data.ref) {
      endpoint = endpoint.replace('{ref}', data.ref);
    }

    return {
      endpoint,
      method: action.method,
      data
    };
  }

  /**
   * Vérifie si une capacité est disponible
   */
  hasCapability(capabilities: string[], action: string): boolean {
    return capabilities.includes(action);
  }

  /**
   * Liste toutes les capacités disponibles
   */
  getAvailableCapabilities(): string[] {
    return Array.from(this.apiV2Actions.keys());
  }
}

// Instance singleton
export const agentIntentParser = new AgentIntentParser(); 
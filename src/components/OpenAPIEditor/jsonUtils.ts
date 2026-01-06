import * as yaml from 'js-yaml';

/**
 * Utilitaires pour la validation et le nettoyage des schémas JSON/YAML
 */

export interface ParseResult {
  success: boolean;
  data?: unknown;
  error?: string;
  position?: number;
  context?: string;
  format?: 'json' | 'yaml';
}

/**
 * Nettoie et valide un texte JSON ou YAML avant le parsing
 */
export function cleanAndValidateSchema(text: string): ParseResult {
  // Nettoyer le texte en dehors du try/catch pour qu'il soit accessible partout
  let cleanedText = text.trim();
  
  // Supprimer les caractères BOM et autres caractères invisibles
  cleanedText = cleanedText.replace(/^\uFEFF/, ''); // BOM
  cleanedText = cleanedText.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width characters
  
  // Détecter le format (YAML ou JSON)
  const isYAML = !cleanedText.startsWith('{') && !cleanedText.startsWith('[');
  
  try {
    let data: unknown;
    
    if (isYAML) {
      // Parser YAML
      data = yaml.load(cleanedText);
      if (typeof data !== 'object' || data === null) {
        return {
          success: false,
          error: 'Le contenu YAML doit être un objet valide',
          format: 'yaml'
        };
      }
    } else {
      // Parser JSON
      if (!cleanedText.startsWith('{') && !cleanedText.startsWith('[')) {
        return {
          success: false,
          error: 'Le contenu ne semble pas être un JSON ou YAML valide',
          format: 'json'
        };
      }
      data = JSON.parse(cleanedText);
    }
    
    return {
      success: true,
      data,
      format: isYAML ? 'yaml' : 'json'
    };
  } catch (error) {
    const err = error as Error;
    
    // Essayer de trouver la position de l'erreur
    let position: number | undefined;
    let context: string | undefined;
    
    if (err.message.includes('position')) {
      const match = err.message.match(/position (\d+)/);
      if (match) {
        position = parseInt(match[1]);
        const start = Math.max(0, position - 50);
        const end = Math.min(cleanedText.length, position + 50);
        context = cleanedText.substring(start, end);
      }
    }
    
    return {
      success: false,
      error: err.message,
      position,
      context,
      format: isYAML ? 'yaml' : 'json'
    };
  }
}

/**
 * @deprecated Utilisez cleanAndValidateSchema à la place
 */
export function cleanAndValidateJSON(text: string): ParseResult {
  return cleanAndValidateSchema(text);
}

/**
 * Valide qu'un objet est un schéma OpenAPI valide
 */
export function validateOpenAPISchema(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Le schéma doit être un objet' };
  }

  // Vérifier la présence de la propriété openapi ou swagger
  interface OpenAPIInfo {
    title?: string;
    version?: string;
    [key: string]: unknown;
  }
  
  interface OpenAPISchemaCheck {
    openapi?: string;
    swagger?: string;
    info?: OpenAPIInfo;
    [key: string]: unknown;
  }
  const schema = data as OpenAPISchemaCheck;
  if (!schema.openapi && !schema.swagger) {
    return { 
      valid: false, 
      error: 'Ce fichier ne semble pas être un schéma OpenAPI valide (propriété "openapi" ou "swagger" manquante)' 
    };
  }

  // Vérifier la présence des propriétés obligatoires
  if (!schema.info || typeof schema.info !== 'object') {
    return { 
      valid: false, 
      error: 'Propriété "info" manquante ou invalide' 
    };
  }

  const info = schema.info as OpenAPIInfo;
  if (!info.title || typeof info.title !== 'string') {
    return { 
      valid: false, 
      error: 'Propriété "info.title" manquante ou invalide' 
    };
  }

  if (!info.version || typeof info.version !== 'string') {
    return { 
      valid: false, 
      error: 'Propriété "info.version" manquante ou invalide' 
    };
  }

  return { valid: true };
}

/**
 * Formate un message d'erreur JSON avec contexte
 */
export function formatJSONError(error: string, position?: number, context?: string): string {
  if (position !== undefined && context) {
    return `Erreur de parsing JSON à la position ${position}:\n\n"${context}"\n\nVérifiez que le JSON est valide et qu'il n'y a pas de caractères supplémentaires.`;
  }
  
  return `Erreur de parsing JSON: ${error}`;
}

/**
 * Service de validation des schémas OpenAPI pour les agents spécialisés
 * Validation robuste des entrées et sorties selon les schémas définis
 */

import { 
  OpenAPISchema, 
  OpenAPIProperty, 
  ValidationResult, 
  SchemaValidationResult,
  SchemaValidationError,
  SchemaValidationWarning
} from '@/types/specializedAgents';

export class SchemaValidator {
  /**
   * Valide une entrée selon un schéma OpenAPI
   */
  static validateInput(input: unknown, schema: OpenAPISchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validation de base
      if (!schema || typeof schema !== 'object') {
        errors.push('Schema invalide');
        return { valid: false, errors, warnings };
      }

      if (schema.type !== 'object') {
        errors.push('Le schéma doit être de type "object"');
        return { valid: false, errors, warnings };
      }

      // Validation des champs requis
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in input)) {
            errors.push(`Champ requis manquant: ${field}`);
          }
        }
      }

      // Validation des propriétés
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (input[key] !== undefined) {
            const propValidation = this.validateProperty(input[key], propSchema, key);
            if (!propValidation.valid) {
              errors.push(...propValidation.errors);
            }
            if (propValidation.warnings) {
              warnings.push(...propValidation.warnings);
            }
          }
        }
      }

      // Validation des propriétés supplémentaires
      if (schema.additionalProperties === false) {
        const allowedKeys = Object.keys(schema.properties || {});
        const inputKeys = Object.keys(input);
        const extraKeys = inputKeys.filter(key => !allowedKeys.includes(key));
        
        if (extraKeys.length > 0) {
          errors.push(`Propriétés non autorisées: ${extraKeys.join(', ')}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      errors.push(`Erreur de validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Valide une propriété selon son schéma
   */
  private static validateProperty(
    value: unknown, 
    schema: OpenAPIProperty, 
    path: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validation du type
      const typeValidation = this.validateType(value, schema.type, path);
      if (!typeValidation.valid) {
        errors.push(...typeValidation.errors);
        return { valid: false, errors, warnings };
      }

      // Validation des contraintes spécifiques
      if (schema.type === 'string') {
        this.validateStringConstraints(value, schema, path, errors, warnings);
      } else if (schema.type === 'number') {
        this.validateNumberConstraints(value, schema, path, errors, warnings);
      } else if (schema.type === 'array') {
        this.validateArrayConstraints(value, schema, path, errors, warnings);
      } else if (schema.type === 'object') {
        this.validateObjectConstraints(value, schema, path, errors, warnings);
      }

      // Validation des énumérations
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`${path}: valeur "${value}" non autorisée. Valeurs autorisées: ${schema.enum.join(', ')}`);
      }

      // Validation du pattern (regex)
      if (schema.pattern && typeof value === 'string') {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push(`${path}: format invalide. Doit correspondre au pattern: ${schema.pattern}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      errors.push(`${path}: erreur de validation - ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Valide le type de base
   */
  private static validateType(value: unknown, expectedType: string, path: string): ValidationResult {
    const errors: string[] = [];

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${path}: doit être une chaîne de caractères`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${path}: doit être un nombre valide`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${path}: doit être un booléen`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${path}: doit être un tableau`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`${path}: doit être un objet`);
        }
        break;
      default:
        errors.push(`${path}: type non supporté: ${expectedType}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide les contraintes des chaînes de caractères
   */
  private static validateStringConstraints(
    value: string, 
    schema: OpenAPIProperty, 
    path: string, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: longueur minimale de ${schema.minLength} caractères requise`);
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path}: longueur maximale de ${schema.maxLength} caractères dépassée`);
    }

    if (schema.format) {
      this.validateStringFormat(value, schema.format, path, errors, warnings);
    }
  }

  /**
   * Valide les contraintes des nombres
   */
  private static validateNumberConstraints(
    value: number, 
    schema: OpenAPIProperty, 
    path: string, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: valeur minimale de ${schema.minimum} requise`);
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: valeur maximale de ${schema.maximum} dépassée`);
    }
  }

  /**
   * Valide les contraintes des tableaux
   */
  private static validateArrayConstraints(
    value: unknown[], 
    schema: OpenAPIProperty, 
    path: string, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (schema.items) {
      value.forEach((item, index) => {
        const itemValidation = this.validateProperty(item, schema.items!, `${path}[${index}]`);
        if (!itemValidation.valid) {
          errors.push(...itemValidation.errors);
        }
        if (itemValidation.warnings) {
          warnings.push(...itemValidation.warnings);
        }
      });
    }
  }

  /**
   * Valide les contraintes des objets
   */
  private static validateObjectConstraints(
    value: Record<string, unknown>, 
    schema: OpenAPIProperty, 
    path: string, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (value[key] !== undefined) {
          const propValidation = this.validateProperty(value[key], propSchema, `${path}.${key}`);
          if (!propValidation.valid) {
            errors.push(...propValidation.errors);
          }
          if (propValidation.warnings) {
            warnings.push(...propValidation.warnings);
          }
        }
      }
    }
  }

  /**
   * Valide le format des chaînes de caractères
   */
  private static validateStringFormat(
    value: string, 
    format: string, 
    path: string, 
    errors: string[], 
    warnings: string[]
  ): void {
    switch (format) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${path}: format email invalide`);
        }
        break;
      case 'uri':
        try {
          new URL(value);
        } catch {
          errors.push(`${path}: format URI invalide`);
        }
        break;
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          errors.push(`${path}: format UUID invalide`);
        }
        break;
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`${path}: format date invalide`);
        }
        break;
      case 'date-time':
        const dateTime = new Date(value);
        if (isNaN(dateTime.getTime())) {
          errors.push(`${path}: format date-time invalide`);
        }
        break;
      default:
        warnings.push(`${path}: format "${format}" non reconnu, validation ignorée`);
    }
  }

  /**
   * Valide un schéma OpenAPI lui-même
   */
  static validateSchema(schema: unknown): SchemaValidationResult {
    const errors: SchemaValidationError[] = [];
    const warnings: SchemaValidationWarning[] = [];

    try {
      // Validation de base
      if (!schema || typeof schema !== 'object') {
        errors.push({
          path: 'root',
          message: 'Le schéma doit être un objet',
          code: 'INVALID_SCHEMA'
        });
        return { valid: false, errors, warnings };
      }

      // Validation du type
      if (schema.type !== 'object') {
        errors.push({
          path: 'type',
          message: 'Le type doit être "object"',
          code: 'INVALID_TYPE'
        });
      }

      // Validation des propriétés
      if (schema.properties) {
        if (typeof schema.properties !== 'object') {
          errors.push({
            path: 'properties',
            message: 'Les propriétés doivent être un objet',
            code: 'INVALID_PROPERTIES'
          });
        } else {
          for (const [key, prop] of Object.entries(schema.properties)) {
            this.validatePropertySchema(prop as OpenAPIProperty, `properties.${key}`, errors, warnings);
          }
        }
      }

      // Validation des champs requis
      if (schema.required) {
        if (!Array.isArray(schema.required)) {
          errors.push({
            path: 'required',
            message: 'Le champ "required" doit être un tableau',
            code: 'INVALID_REQUIRED'
          });
        } else {
          const propertyKeys = Object.keys(schema.properties || {});
          for (const requiredField of schema.required) {
            if (!propertyKeys.includes(requiredField)) {
              errors.push({
                path: 'required',
                message: `Champ requis "${requiredField}" non défini dans les propriétés`,
                code: 'MISSING_PROPERTY'
              });
            }
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push({
        path: 'root',
        message: `Erreur de validation du schéma: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        code: 'VALIDATION_ERROR'
      });
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Valide un schéma de propriété
   */
  private static validatePropertySchema(
    prop: OpenAPIProperty, 
    path: string, 
    errors: SchemaValidationError[], 
    warnings: SchemaValidationWarning[]
  ): void {
    // Validation du type
    const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
    if (!validTypes.includes(prop.type)) {
      errors.push({
        path: `${path}.type`,
        message: `Type invalide: ${prop.type}. Types valides: ${validTypes.join(', ')}`,
        code: 'INVALID_PROPERTY_TYPE'
      });
    }

    // Validation des contraintes selon le type
    if (prop.type === 'string') {
      if (prop.minLength !== undefined && prop.minLength < 0) {
        errors.push({
          path: `${path}.minLength`,
          message: 'minLength doit être positif',
          code: 'INVALID_MIN_LENGTH'
        });
      }
      if (prop.maxLength !== undefined && prop.maxLength < 0) {
        errors.push({
          path: `${path}.maxLength`,
          message: 'maxLength doit être positif',
          code: 'INVALID_MAX_LENGTH'
        });
      }
    }

    if (prop.type === 'number') {
      if (prop.minimum !== undefined && prop.maximum !== undefined && prop.minimum > prop.maximum) {
        errors.push({
          path: `${path}.minimum`,
          message: 'minimum ne peut pas être supérieur à maximum',
          code: 'INVALID_RANGE'
        });
      }
    }

    // Validation des énumérations
    if (prop.enum && !Array.isArray(prop.enum)) {
      errors.push({
        path: `${path}.enum`,
        message: 'enum doit être un tableau',
        code: 'INVALID_ENUM'
      });
    }

    // Validation des propriétés imbriquées
    if (prop.type === 'object' && prop.properties) {
      for (const [key, nestedProp] of Object.entries(prop.properties)) {
        this.validatePropertySchema(nestedProp, `${path}.properties.${key}`, errors, warnings);
      }
    }

    // Validation des éléments de tableau
    if (prop.type === 'array' && prop.items) {
      this.validatePropertySchema(prop.items, `${path}.items`, errors, warnings);
    }
  }
}

/**
 * Validateur de schémas OpenAPI optimisé
 * Version refactorisée avec fonctions courtes et types stricts
 */

import { OpenAPISchema, OpenAPIProperty } from '@/types/specializedAgents';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SchemaValidationError {
  message: string;
  path?: string;
}

export interface SchemaValidationWarning {
  message: string;
  path?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
}

/**
 * Validateur de schémas OpenAPI optimisé
 * Fonctions courtes et modulaires pour une meilleure lisibilité
 */
export class SchemaValidator {
  /**
   * Valide une entrée selon un schéma OpenAPI
   */
  static validateInput(input: unknown, schema: OpenAPISchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validation de base
      const baseValidation = this.validateBaseSchema(schema);
      if (!baseValidation.valid) {
        return { valid: false, errors: baseValidation.errors, warnings };
      }

      // Validation des champs requis
      this.validateRequiredFields(input, schema, errors);

      // Validation des propriétés
      this.validateProperties(input, schema, errors, warnings);

      // Validation des propriétés supplémentaires
      this.validateAdditionalProperties(input, schema, errors);

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Erreur de validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`],
        warnings
      };
    }
  }

  /**
   * Valide la structure de base du schéma
   */
  private static validateBaseSchema(schema: OpenAPISchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema || typeof schema !== 'object') {
      errors.push('Schema invalide');
      return { valid: false, errors };
    }

    if (schema.type !== 'object') {
      errors.push('Le schéma doit être de type "object"');
      return { valid: false, errors };
    }

    return { valid: true, errors };
  }

  /**
   * Valide les champs requis
   */
  private static validateRequiredFields(input: unknown, schema: OpenAPISchema, errors: string[]): void {
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in (input as Record<string, unknown>))) {
          errors.push(`Champ requis manquant: ${field}`);
        }
      }
    }
  }

  /**
   * Valide les propriétés du schéma
   */
  private static validateProperties(
    input: unknown, 
    schema: OpenAPISchema, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const inputValue = (input as Record<string, unknown>)[key];
        if (inputValue !== undefined) {
          const propValidation = this.validateProperty(inputValue, propSchema, key);
          if (!propValidation.valid) {
            errors.push(...propValidation.errors);
          }
          warnings.push(...propValidation.warnings);
        }
      }
    }
  }

  /**
   * Valide les propriétés supplémentaires
   */
  private static validateAdditionalProperties(input: unknown, schema: OpenAPISchema, errors: string[]): void {
    if (schema.additionalProperties === false) {
      const allowedProps = Object.keys(schema.properties || {});
      const inputProps = Object.keys((input as Record<string, unknown>) || {});
      const extraProps = inputProps.filter(prop => !allowedProps.includes(prop));
      if (extraProps.length > 0) {
        errors.push(`Propriétés non autorisées: ${extraProps.join(', ')}`);
      }
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

    // Validation du type de base
    const typeValidation = this.validateType(value, schema.type, path);
    if (!typeValidation.valid) {
      errors.push(...typeValidation.errors);
      return { valid: false, errors, warnings };
    }

    // Validation des contraintes spécifiques
    this.validateConstraints(value, schema, path, errors, warnings);

    return { valid: errors.length === 0, errors, warnings };
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
        if (typeof value !== 'number') {
          errors.push(`${path}: doit être un nombre`);
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

    return { valid: errors.length === 0, errors };
  }

  /**
   * Valide les contraintes spécifiques
   */
  private static validateConstraints(
    value: unknown, 
    schema: OpenAPIProperty, 
    path: string, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (schema.type === 'string') {
      this.validateStringConstraints(value as string, schema, path, errors, warnings);
    } else if (schema.type === 'number') {
      this.validateNumberConstraints(value as number, schema, path, errors, warnings);
    } else if (schema.type === 'array') {
      this.validateArrayConstraints(value as unknown[], schema, path, errors, warnings);
    } else if (schema.type === 'object') {
      this.validateObjectConstraints(value as Record<string, unknown>, schema, path, errors, warnings);
    }
  }

  /**
   * Valide les contraintes des chaînes
   */
  private static validateStringConstraints(
    value: string, 
    schema: OpenAPIProperty, 
    path: string, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`${path}: longueur minimale de ${schema.minLength} caractères`);
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(`${path}: longueur maximale de ${schema.maxLength} caractères`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: format invalide. Doit correspondre au pattern: ${schema.pattern}`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: valeur "${value}" non autorisée. Valeurs autorisées: ${schema.enum.join(', ')}`);
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
      errors.push(`${path}: valeur minimale de ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: valeur maximale de ${schema.maximum}`);
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
        warnings.push(...itemValidation.warnings);
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
        const propPath = `${path}.${key}`;
        if (value[key] !== undefined) {
          const propValidation = this.validateProperty(value[key], propSchema, propPath);
          if (!propValidation.valid) {
            errors.push(...propValidation.errors);
          }
          warnings.push(...propValidation.warnings);
        }
      }
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
        errors.push({ message: 'Le schéma doit être un objet' });
        return { valid: false, errors, warnings };
      }

      const schemaObj = schema as Record<string, unknown>;

      // Vérifier les propriétés requises
      if (!schemaObj.type) {
        errors.push({ message: 'Propriété "type" requise' });
      }

      if (!schemaObj.properties && schemaObj.type === 'object') {
        errors.push({ message: 'Propriété "properties" requise pour les objets' });
      }

      // Valider les propriétés si présentes
      if (schemaObj.properties && typeof schemaObj.properties === 'object') {
        this.validateSchemaProperties(schemaObj.properties as Record<string, unknown>, errors, warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: [{ message: `Erreur de validation du schéma: ${error instanceof Error ? error.message : 'Erreur inconnue'}` }],
        warnings
      };
    }
  }

  /**
   * Valide les propriétés d'un schéma
   */
  private static validateSchemaProperties(
    properties: Record<string, unknown>, 
    errors: SchemaValidationError[], 
    warnings: SchemaValidationWarning[]
  ): void {
    for (const [key, prop] of Object.entries(properties)) {
      if (typeof prop !== 'object' || prop === null) {
        errors.push({ message: `Propriété "${key}" doit être un objet`, path: key });
        continue;
      }

      const propObj = prop as Record<string, unknown>;
      
      if (!propObj.type) {
        errors.push({ message: `Propriété "${key}" doit avoir un type`, path: key });
      }

      if (propObj.enum && !Array.isArray(propObj.enum)) {
        errors.push({ message: `Propriété "${key}": enum doit être un tableau`, path: key });
      }
    }
  }
}

// import.*console.*from '@/utils/logger';

/**
 * Représente un appel d'outil en cours de parsing.
 */
export interface ToolCall {
  id: string;
  index: number;
  name: string;
  /** Arguments bruts accumulés depuis le stream */
  rawArgs: string;
  /** Arguments parsés en JSON une fois complets */
  args?: Record<string, unknown>;
  /** Indique si le parser considère l'appel comme complet */
  completed: boolean;
}

/**
 * Le résultat final du parsing du stream.
 */
export interface ParserResult {
  content: string;
  toolCalls: ToolCall[];
  reasoning: string;
}

/**
 * Tente de parser une chaîne d'arguments JSON potentiellement malformée.
 * @param raw La chaîne d'arguments brute.
 * @returns Un objet JSON parsé ou undefined si le parsing échoue.
 */
function safeParseArgs(raw: string): Record<string, unknown> | undefined {
  let candidate = raw.trim();
  if (!candidate) {
    return {};
  }

  // 🔧 AMÉLIORATION: Détecter et corriger les JSON malformés
  console.dev(`[ToolCallsParser] 🔍 Parsing arguments bruts: ${candidate.substring(0, 200)}...`);

  // Gère les cas où les arguments sont une chaîne JSON échappée
  if (candidate.startsWith('"') && candidate.endsWith('"')) {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      // Ignorer si le parsing de la chaîne échouée échoue
    }
  }

  // 🔧 NOUVEAU: Détecter les JSON malformés avec duplication
  if (candidate.includes('}{')) {
    console.dev(`[ToolCallsParser] ⚠️ JSON malformé détecté avec duplication`);
    
    // Essayer de récupérer le premier objet JSON valide
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      const potentialJson = candidate.substring(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(potentialJson);
        console.dev(`[ToolCallsParser] ✅ JSON récupéré après nettoyage:`, parsed);
        return parsed;
      } catch (error) {
        console.error(`[ToolCallsParser] ❌ Impossible de parser le JSON nettoyé:`, error);
      }
    }
  }

  // 🔧 NOUVEAU: Détecter les arguments avec des objets concaténés
  if (candidate.includes(',{"')) {
    console.dev(`[ToolCallsParser] ⚠️ Arguments avec objets concaténés détectés`);
    
    // Essayer de récupérer le premier objet JSON
    const firstBrace = candidate.indexOf('{');
    const firstClosingBrace = candidate.indexOf('}', firstBrace);
    
    if (firstBrace !== -1 && firstClosingBrace !== -1) {
      const potentialJson = candidate.substring(firstBrace, firstClosingBrace + 1);
      try {
        const parsed = JSON.parse(potentialJson);
        console.dev(`[ToolCallsParser] ✅ Premier objet JSON récupéré:`, parsed);
        return parsed;
      } catch (error) {
        console.error(`[ToolCallsParser] ❌ Impossible de parser le premier objet:`, error);
      }
    }
  }

  // Assurer que la chaîne est bien un objet JSON
  if (!candidate.startsWith('{')) {
    candidate = '{' + candidate;
  }
  if (!candidate.endsWith('}')) {
    candidate = candidate + '}';
  }

  try {
    const parsed = JSON.parse(candidate);
    console.dev(`[ToolCallsParser] ✅ Arguments parsés avec succès:`, parsed);
    return parsed;
  } catch (error) {
    console.error(`[ToolCallsParser] ❌ safeParseArgs a échoué pour: ${candidate}`, error);
    return undefined;
  }
}

/**
 * Fonction pour détecter si on est dans un tableau Markdown
 * @param content Le contenu à analyser
 * @returns true si on est dans un tableau
 */
function isInTable(content: string): boolean {
  const lines = content.split('\n');
  let inTable = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Détecter le début d'un tableau
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      inTable = true;
    }
    // Détecter la ligne de séparation
    else if (inTable && trimmedLine.match(/^\|[\s\-:]+\|$/)) {
      inTable = true;
    }
    // Détecter la fin d'un tableau (ligne vide ou autre contenu)
    else if (inTable && trimmedLine === '') {
      inTable = false;
    }
    // Si on est dans un tableau et qu'on a une ligne qui ne commence pas par |
    else if (inTable && trimmedLine !== '' && !trimmedLine.startsWith('|')) {
      inTable = false;
    }
  }
  
  return inTable;
}

/**
 * Fonction pour nettoyer et valider le contenu Markdown
 * @param content Le contenu à nettoyer
 * @returns Le contenu nettoyé
 */
function cleanMarkdownContent(content: string): string {
  if (!content) return '';
  
  // 🔧 AMÉLIORATION: Gestion spéciale pour les tableaux
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let inTable = false;
  let tableStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Détecter le début d'un tableau
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableStartIndex = i;
      }
      cleanedLines.push(line);
    }
    // Détecter la ligne de séparation
    else if (inTable && trimmedLine.match(/^\|[\s\-:]+\|$/)) {
      cleanedLines.push(line);
    }
    // Détecter la fin d'un tableau
    else if (inTable && (trimmedLine === '' || (!trimmedLine.startsWith('|') && trimmedLine !== ''))) {
      inTable = false;
      // 🔧 CORRECTION: S'assurer que le tableau se termine proprement
      if (trimmedLine === '') {
        cleanedLines.push(line);
      } else {
        // Ajouter une ligne vide avant le contenu suivant
        cleanedLines.push('');
        cleanedLines.push(line);
      }
    }
    // Contenu normal
    else {
      cleanedLines.push(line);
    }
  }
  
  // 🔧 CORRECTION: S'assurer qu'un tableau ouvert se termine proprement
  if (inTable && tableStartIndex !== -1) {
    // Chercher la dernière ligne du tableau
    for (let i = cleanedLines.length - 1; i >= tableStartIndex; i--) {
      if (cleanedLines[i].trim() !== '') {
        // Ajouter une ligne vide après le tableau
        cleanedLines.splice(i + 1, 0, '');
        break;
      }
    }
  }
  
  return cleanedLines.join('\n');
}

/**
 * Un parser de streaming robuste pour les réponses LLM compatibles OpenAI,
 * capable de gérer le contenu textuel, les tool_calls fragmentés et le reasoning.
 */
export class ToolCallsParser {
  private contentBuffer = '';
  private reasoningBuffer = '';
  private toolCallMap = new Map<number, ToolCall>();
  private braceBalance = 0;
  private activeToolCallIndex: number | null = null;

  /**
   * Ingère un chunk JSON (déjà parsé) depuis le stream du LLM.
   * @param chunk Le chunk de réponse de l'API.
   */
  feed(chunk: unknown): void {
    const delta = chunk?.choices?.[0]?.delta;
    if (!delta) return;

    // 1. Accumuler le contenu textuel (PRIORITÉ)
    if (typeof delta.content === 'string') {
      this.contentBuffer += delta.content;
    }

    // 2. Accumuler le reasoning (SECONDAIRE - seulement pour les modèles qui le supportent)
    if (typeof (delta as unknown).reasoning_content === 'string') {
      this.reasoningBuffer += (delta as unknown).reasoning_content;
    } else if (typeof (delta as unknown).reasoning === 'string') {
      this.reasoningBuffer += (delta as unknown).reasoning;
    }

    // 3. Traiter les tool_calls
    if (Array.isArray(delta.tool_calls)) {
      delta.tool_calls.forEach((toolCallChunk: unknown) => {
        // let index = [^;]+;
        if (typeof index !== 'number') return;

        let call = this.toolCallMap.get(index);

        // Initialiser un nouvel appel d'outil
        if (!call) {
          call = {
            id: toolCallChunk.id ?? `call_${index}_${Date.now()}`,
            index,
            name: toolCallChunk.function?.name ?? '',
            rawArgs: '',
            completed: false,
          };
          this.toolCallMap.set(index, call);
        }

        // Mettre à jour le nom si présent
        if (toolCallChunk.function?.name) {
          call.name = toolCallChunk.function.name;
        }

        // Accumuler les arguments
        if (typeof toolCallChunk.function?.arguments === 'string') {
          call.rawArgs += toolCallChunk.function.arguments;
        }
      });
    }
  }

  /**
   * Finalise le parsing après la fin du stream.
   * Tente de parser les arguments de tous les tool_calls accumulés.
   * @returns Le résultat complet du parsing.
   */
  finish(): ParserResult {
    this.toolCallMap.forEach(call => {
      if (!call.completed) {
        const parsedArgs = safeParseArgs(call.rawArgs);
        if (parsedArgs) {
          call.args = parsedArgs;
          call.completed = true;
        } else {
          console.error(`[ToolCallsParser] ❌ Impossible de parser les arguments finaux pour l'outil: ${call.name}`, { rawArgs: call.rawArgs });
        }
      }
    });

    // 🔧 AMÉLIORATION: Nettoyer le contenu Markdown avant de le retourner
    const cleanedContent = cleanMarkdownContent(this.contentBuffer.trim());

    return {
      content: cleanedContent,
      toolCalls: Array.from(this.toolCallMap.values()).filter(c => c.completed),
      reasoning: this.reasoningBuffer.trim(),
    };
  }
} 
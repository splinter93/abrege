/**
 * Utilitaire pour formater le reasoning des modèles LLM
 * Centralise la logique de formatage pour différents modèles
 */

/**
 * Formate le reasoning selon le modèle utilisé
 * @param reasoning - Le texte du reasoning brut
 * @param model - Le nom du modèle (optionnel)
 * @returns Le reasoning formaté pour l'affichage
 */
export const formatReasoning = (reasoning: string, model?: string): string => {
  if (!reasoning?.trim()) return '';
  
  const isQwen3 = model?.toLowerCase().includes('qwen');
  let cleanedReasoning = reasoning.trim();
  
  if (isQwen3) {
    // Gestion spécifique des balises <think> et </think> de Qwen 3
    const thinkMatch = cleanedReasoning.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      cleanedReasoning = thinkMatch[1].trim();
    } else {
      // Si pas de balises, supprimer les balises partielles
      cleanedReasoning = cleanedReasoning
        .replace(/<think>|<\/think>/gi, '')
        .trim();
    }
    
    return `> **🧠 Raisonnement Qwen 3 :**
> 
> *${cleanedReasoning}*
> 
> ---
> *Ce raisonnement montre le processus de pensée du modèle avant de générer sa réponse finale.*`;
  }
  
  // Nettoyer les marqueurs génériques pour les autres modèles
  const markers = [
    '<|im_start|>reasoning\n',
    '<|im_end|>\n',
    'reasoning\n',
    'Reasoning:\n',
    'Raisonnement:\n'
  ];
  
  markers.forEach(marker => {
    if (cleanedReasoning.startsWith(marker)) {
      cleanedReasoning = cleanedReasoning.substring(marker.length);
    }
  });
  
  // Formatage générique pour les autres modèles
  return `**🧠 Raisonnement :**

${cleanedReasoning}

---
*Processus de pensée du modèle.*`;
};

/**
 * Détecte si un modèle est de type Qwen
 * @param model - Le nom du modèle
 * @returns true si c'est un modèle Qwen
 */
export const isQwenModel = (model?: string): boolean => {
  return model?.toLowerCase().includes('qwen') || false;
};

/**
 * Nettoie le reasoning en supprimant les marqueurs et espaces inutiles
 * @param reasoning - Le reasoning brut
 * @returns Le reasoning nettoyé
 */
export const cleanReasoning = (reasoning: string): string => {
  if (!reasoning?.trim()) return '';
  
  return reasoning
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}; 
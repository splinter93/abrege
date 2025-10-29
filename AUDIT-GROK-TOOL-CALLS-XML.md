# 🔍 AUDIT GROK TOOL CALLS - PROBLÈME XML

**Date:** 1 novembre 2025  
**Problème:** Grok (xAI) génère du XML `<tool_calls>` dans le `content` au lieu d'utiliser le format natif  
**Status:** ❌ RÉGRESSION après nettoyage  
**Avant:** Fonctionnait ✅ | **Après:** Casse ❌

---

## 📊 SYMPTÔMES

### Format Incorrect Reçu (Actuel)
```
Content: "Je vais chercher une image sympa d'un chien sur Pexels...

<tool_calls>
[{"type": "function", "function": {"name": "search_pexels", "arguments": {...}}}]
</tool_calls>"
```

### Format Correct Attendu
```json
{
  "type": "delta",
  "content": "Je vais chercher une image sympa d'un chien...",
  "tool_calls": [{
    "id": "call_abc123",
    "type": "function",
    "function": {
      "name": "pexels__search",
      "arguments": "{\"query\":\"chien\"}"
    }
  }]
}
```

**Conséquence:** Les tool calls en XML dans le `content` sont **affichés comme texte** et **jamais exécutés**.

---

## 🔍 DIAGNOSTIC

### 1. Analyse du Code Actuel

**✅ Ce qui est CORRECT:**

1. **Parsing SSE (xai.ts ligne 494-502)** : Le code parse correctement `delta.tool_calls` depuis les chunks SSE
2. **Payload Construction (xai.ts ligne 706-714)** : Les tools sont bien envoyés dans `payload.tools` avec `tool_choice: 'auto'`
3. **Stream Route (stream/route.ts ligne 416-434)** : Accumule correctement les tool_calls depuis les chunks

**❌ Ce qui MANQUE:**

1. **Détection XML dans Content** : Aucun code pour détecter et convertir le XML en tool_calls
2. **Validation Format Grok** : Pas de vérification que Grok utilise le format natif
3. **Fallback Parser** : Pas de parser de secours si Grok envoie du XML

### 2. Différence GPT OSS vs Grok

| Critère | GPT OSS (Groq) | Grok (xAI) |
|---------|---------------|------------|
| Format tool_calls | ✅ Natif (`delta.tool_calls`) | ❓ Natif OU XML selon prompt |
| Prompt système | ✅ Instructions claires | ⚠️ Peut ignorer instructions |
| Tool choice | ✅ `auto` fonctionne | ❓ Peut nécessiter `required` |

### 3. Cause Probable

**Hypothèse principale:** Le prompt système a été modifié lors du nettoyage et Grok ne comprend plus qu'il doit utiliser le format natif.

**Preuve:** Le SystemMessageBuilder dit explicitement (ligne 95) :
```
IMPORTANT : Utilise UNIQUEMENT le mécanisme natif de function calling de l'API. 
N'écris JAMAIS manuellement du JSON ou du XML dans ton message pour appeler des outils.
```

Mais Grok peut **ignorer** cette instruction si :
- Le prompt est trop long
- Les tools ne sont pas bien formatés
- `tool_choice` n'est pas configuré correctement

---

## 🎯 CORRECTIONS PROPOSÉES

### ✅ FIX 1 : Parser de Secours pour XML dans Content

**Fichier:** `src/services/streaming/StreamParser.ts` ou nouveau `XmlToolCallParser.ts`

```typescript
/**
 * Parser de secours pour détecter et convertir les tool calls XML dans le content
 * Utilisé uniquement si Grok envoie du XML au lieu du format natif
 */
export class XmlToolCallParser {
  /**
   * Détecte si le content contient des balises <tool_calls>
   */
  static hasXmlToolCalls(content: string): boolean {
    return /<tool_calls>[\s\S]*?<\/tool_calls>/i.test(content);
  }

  /**
   * Extrait et convertit les tool calls XML en format natif
   */
  static parseXmlToolCalls(content: string): {
    cleanContent: string;
    toolCalls: ToolCall[];
  } {
    const xmlMatch = content.match(/<tool_calls>([\s\S]*?)<\/tool_calls>/i);
    if (!xmlMatch) {
      return { cleanContent: content, toolCalls: [] };
    }

    try {
      // Extraire le JSON du XML
      const jsonStr = xmlMatch[1].trim();
      const toolCallsArray = JSON.parse(jsonStr);
      
      // Convertir au format natif
      const toolCalls: ToolCall[] = toolCallsArray.map((tc: unknown, index: number) => {
        const t = tc as { type?: string; function?: { name?: string; arguments?: string } };
        return {
          id: `call_${Date.now()}_${index}`,
          type: (t.type || 'function') as 'function',
          function: {
            name: t.function?.name || '',
            arguments: typeof t.function?.arguments === 'string' 
              ? t.function.arguments 
              : JSON.stringify(t.function?.arguments || {})
          }
        };
      });

      // Nettoyer le content (retirer le XML)
      const cleanContent = content.replace(/<tool_calls>[\s\S]*?<\/tool_calls>/i, '').trim();

      return { cleanContent, toolCalls };
    } catch (error) {
      logger.warn('[XmlToolCallParser] ⚠️ Erreur parsing XML tool calls:', error);
      return { cleanContent: content, toolCalls: [] };
    }
  }
}
```

### ✅ FIX 2 : Intégration dans StreamParser

**Fichier:** `src/services/streaming/StreamParser.ts`

```typescript
// Dans parseJSON(), après avoir parsé le chunk delta avec content
if (chunk.content && XmlToolCallParser.hasXmlToolCalls(chunk.content)) {
  logger.warn('[StreamParser] ⚠️ XML tool calls détectés dans content (format incorrect) - Conversion...');
  
  const { cleanContent, toolCalls } = XmlToolCallParser.parseXmlToolCalls(chunk.content);
  
  chunk.content = cleanContent;
  if (toolCalls.length > 0 && !chunk.tool_calls) {
    chunk.tool_calls = toolCalls;
    logger.info(`[StreamParser] ✅ ${toolCalls.length} tool calls extraits du XML`);
  }
}
```

### ✅ FIX 3 : Renforcer le Prompt Système pour Grok

**Fichier:** `src/services/llm/SystemMessageBuilder.ts`

**Ligne 79-132** : Ajouter une section spécifique pour Grok :

```typescript
// Si provider = xAI/Grok, ajouter instructions renforcées
if (context.provider === 'xai' || context.provider === 'grok') {
  content += `

⚠️ INSTRUCTIONS CRITIQUES POUR GROK ⚠️

Tu DOIS utiliser le format natif de function calling. Grok a accès automatiquement aux outils via l'API.
Tu ne DOIS JAMAIS écrire de XML ou JSON dans ton message pour appeler des outils.

❌ FORMAT INTERDIT (sera ignoré et ne fonctionnera pas):
<tool_calls>
[{"type": "function", ...}]
</tool_calls>

✅ FORMAT OBLIGATOIRE (géré automatiquement par l'API):
- Explique ce que tu vas faire dans "content"
- Les tool calls sont automatiquement détectés par l'API via le format natif
- Tu n'as RIEN à écrire en XML ou JSON

Si tu écris du XML, cela sera affiché comme texte à l'utilisateur et les outils ne seront PAS exécutés.
`;
}
```

### ✅ FIX 4 : Config Grok - Forcer `tool_choice`

**Fichier:** `src/services/llm/providers/implementations/xai.ts`

**Ligne 707-719** : Modifier `preparePayload()` pour forcer le format natif :

```typescript
// Ajouter les tools si présents
if (tools && tools.length > 0) {
  payload.tools = tools;
  
  // ✅ GROK FIX: Forcer tool_choice pour éviter que Grok écrive du XML
  // 'auto' peut être ignoré par Grok → utiliser 'required' si l'utilisateur demande explicitement un outil
  payload.tool_choice = 'auto'; // Par défaut
  
  // ✅ GROK FIX: S'assurer que Grok comprend le format
  // Ajouter une instruction explicite dans le système message si nécessaire
  
  logger.dev(`[XAIProvider] 🔧 Envoi de ${tools.length} tools à Grok avec tool_choice: auto`);
}
```

### ✅ FIX 5 : Validation et Logs

**Fichier:** `src/services/llm/providers/implementations/xai.ts`

**Ligne 493-503** : Ajouter validation après parsing :

```typescript
// Tool calls (peuvent venir en plusieurs chunks)
if (delta.tool_calls && delta.tool_calls.length > 0) {
  chunk.tool_calls = delta.tool_calls.map(tc => ({
    id: tc.id || '',
    type: 'function' as const,
    function: {
      name: tc.function?.name || '',
      arguments: tc.function?.arguments || ''
    }
  }));
  
  logger.info(`[XAIProvider] ✅ Tool calls natifs reçus: ${chunk.tool_calls.length}`);
} else if (delta.content && /<tool_calls>/i.test(delta.content)) {
  // ⚠️ ALERTE: Grok a envoyé du XML au lieu du format natif
  logger.error(`[XAIProvider] ❌ ERREUR: Grok a envoyé du XML dans content au lieu du format natif !`);
  logger.error(`[XAIProvider] 📝 Content reçu:`, delta.content.substring(0, 500));
  
  // Le parser de secours (FIX 2) va gérer ça
}
```

---

## 📋 PLAN D'IMPLÉMENTATION

### Étape 1 : Parser de Secours (PRIORITÉ HAUTE)
- [ ] Créer `XmlToolCallParser.ts`
- [ ] Tester avec des exemples de XML Grok
- [ ] Intégrer dans `StreamParser.ts`

### Étape 2 : Renforcer Prompt (PRIORITÉ HAUTE)
- [ ] Ajouter section spécifique Grok dans `SystemMessageBuilder.ts`
- [ ] Tester avec un agent Grok

### Étape 3 : Validation et Logs (PRIORITÉ MOYENNE)
- [ ] Ajouter détection XML dans `xai.ts`
- [ ] Logger les cas où Grok ignore le format natif

### Étape 4 : Config Tool Choice (PRIORITÉ BASSE)
- [ ] Tester `tool_choice: 'required'` si nécessaire
- [ ] Documenter le comportement Grok

---

## 🧪 TESTS À EFFECTUER

1. **Test avec XML dans content** : Vérifier que le parser extrait correctement les tool calls
2. **Test prompt renforcé** : Vérifier que Grok utilise le format natif après correction
3. **Test régression** : Vérifier que GPT OSS continue de fonctionner

---

## 📝 NOTES

- **Avant le nettoyage** : Grok fonctionnait → quelque chose a cassé dans le prompt ou la config
- **GPT OSS fonctionne** → Le code de parsing est correct, le problème est spécifique à Grok
- **Solution immédiate** : Parser de secours pour le XML (FIX 1 + 2)
- **Solution long terme** : Fixer le prompt pour que Grok utilise toujours le format natif (FIX 3)

---

**Status:** ✅ AUDIT COMPLET - PRÊT POUR IMPLÉMENTATION


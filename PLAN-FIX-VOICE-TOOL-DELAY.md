# Plan: Fix décalage audio/texte lors des tool calls OpenAPI

## 📊 Problème identifié

**Symptôme :** Lorsqu'un tool call OpenAPI est exécuté, il y a un décalage entre :
- Le **transcript texte** qui continue la conversation avec le résultat du tool
- L'**audio** qui finit encore le message précédent avant le tool call

**Comparaison :** Les tools natifs (X, web_search) ne créent pas ce décalage car gérés côté serveur XAI.

**Impact :** UX dégradée - l'utilisateur entend une réponse audio obsolète pendant que le texte affiche déjà la nouvelle réponse avec les résultats du tool.

## 🔍 Investigation requise

### 1. Vérifier la doc XAI Voice API
- [x] ✅ Recherche suggère `response.cancel` avant `tool_result` (à confirmer dans doc officielle)
- [ ] Vérifier si `response.cancel` existe vraiment dans la doc XAI Voice API officielle
- [ ] Comprendre le format exact de `response.cancel` (paramètres, response_id requis ?)
- [ ] Vérifier si on peut détecter qu'une réponse est en cours (`inFlight`) avant d'envoyer `tool_result`

### 2. Analyser le flow actuel
- [ ] Tracker l'état `inFlight` dans `XAIVoiceService` (déjà présent)
- [ ] Logger les timestamps : quand arrive `response.function_call_arguments.done` vs `response.output_audio.done`
- [ ] Vérifier si on peut attendre `response.done` avant d'envoyer le tool result

### 3. Solutions potentielles

#### Option A : Interrompre avec `response.cancel` (RECOMMANDÉ)
- Selon recherche web, XAI Voice API supporte `response.cancel`
- Envoyer `response.cancel` avec `response_id` (si disponible) avant `tool_result`
- Puis envoyer `conversation.item.create` (function_call_output) + `response.create`
- À implémenter : tracker le `response_id` en cours dans `XAIVoiceService`

#### Option B : Nettoyer le transcript lors du tool call
- Quand `response.function_call_arguments.done` arrive, clear le transcript en cours
- Continuer normalement avec tool result
- Problème : Perte de contexte, peut être confus pour l'utilisateur

#### Option C : Attendre la fin de la réponse avant tool result
- Si `inFlight === true`, attendre `response.done` avant d'envoyer tool result
- Problème : Latence supplémentaire, peut créer un gap dans la conversation

#### Option D : Accepter le décalage (comportement normal)
- C'est peut-être le comportement attendu de l'API XAI Voice pour custom tools
- Les tools natifs sont optimisés côté serveur, pas les custom tools
- Améliorer seulement le feedback visuel (indicateur "tool execution in progress")

## 📋 Plan d'implémentation (à valider après investigation)

### Phase 1 : Investigation
1. Tester en prod avec logs détaillés pour comprendre le timing exact
2. Vérifier la doc XAI pour messages d'interruption/cancel
3. Comparer le comportement avec tools natifs (logs côté proxy si nécessaire)

### Phase 2 : Implémentation (si solution trouvée)
1. Ajouter logique de détection réponse en cours
2. Implémenter la solution choisie (A, B, C ou D)
3. Tests en prod avec différents scénarios
4. Mesurer l'amélioration UX

## ⚠️ Priorité

**NON-CRITIQUE** - Le tool call fonctionne correctement, c'est un problème d'UX mineur.
Peut être reporté si priorité plus haute ailleurs.

## 📝 Notes

- Le problème pourrait être intrinsèque à l'API XAI Voice pour custom tools
- Les tools natifs bénéficient d'une intégration serveur optimisée
- Solution simple : améliorer le feedback visuel pour indiquer "tool execution"


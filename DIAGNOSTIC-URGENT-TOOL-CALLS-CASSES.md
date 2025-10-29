# 🚨 DIAGNOSTIC URGENT - Tool Calls Cassés

**Date** : 29 Octobre 2025  
**Sévérité** : 🔴 CRITIQUE  
**Symptôme** : LLM affiche `<tool_calls>` en XML brut au lieu de les exécuter

---

## 🔍 SYMPTÔMES OBSERVÉS

### 1. LLM Génère du XML Brut

```
Je vais réessayer de chercher une image gratuite d'un lion sur Pexels...

<tool_calls>
[{"name": "pexels_search", "arguments": {"query": "lion", "orientation": "landscape", "size": "medium"}}]
</tool_calls>
```

**Ce qui devrait se passer** :
- LLM retourne tool_calls structurés (JSON)
- API détecte les tool_calls
- Exécute les tools
- Retourne les résultats au LLM
- LLM génère réponse finale

**Ce qui se passe** :
- LLM génère du texte avec XML/JSON brut
- API ne détecte PAS les tool_calls
- Rien n'est exécuté
- LLM continue en hallucination

---

## 🎯 CAUSES POTENTIELLES

### A. Historique Corrompu

**Hypothèse** : L'historique envoyé au LLM est mal formaté

**Vérifications** :
- [ ] useChatMessageActions passe le bon historique ?
- [ ] L'historique contient les bons rôles (user/assistant/tool) ?
- [ ] Les tool messages sont bien formatés ?

### B. Context Mal Construit

**Hypothèse** : Le context LLM ne contient plus les tools

**Vérifications** :
- [ ] ChatContextBuilder construit bien le context ?
- [ ] Les tools sont bien passés à l'API stream ?
- [ ] Le system prompt est correct ?

### C. Messages en Double

**Hypothèse** : Doublon de messages cause confusion LLM

**Vérifications** :
- [ ] editMessage ajoute en double ?
- [ ] sendMessage après edit duplique ?
- [ ] infiniteMessages contient doublons ?

### D. Timeline vs Messages

**Hypothèse** : La timeline streaming interfère avec l'historique

**Vérifications** :
- [ ] streamingTimeline reste affichée et pollue ?
- [ ] Messages chargés depuis DB sont corrects ?
- [ ] displayMessages filtre correctement ?

---

## 🔧 ACTIONS IMMÉDIATES

### 1. Vérifier l'Historique Envoyé au LLM

Ajouter logs dans :
- `useChatMessageActions.sendMessage` → histoire passée
- `/api/chat/llm/stream` → history reçue

### 2. Vérifier le Context

Logs dans :
- `ChatContextBuilder.build`
- `/api/chat/llm/stream` → tools disponibles

### 3. Vérifier les Messages

Logs dans :
- `displayMessages` → combien de messages ?
- `infiniteMessages` → doublons ?

---

## 📝 COMMIT À ROLLBACK SI NÉCESSAIRE

Derniers commits suspects :

```
7cad261d - fix(chat): Éliminer clignotement (SUSPECT)
6a388a46 - debug(chat): Logs exhaustifs
949e9c2d - fix(chat): Stale closure (SUSPECT)
cf62ed04 - fix(chat): Injecter success/result (OK)
c58939cf - fix(chat): Sauvegarder timeline (OK)
8015d568 - fix(chat): Flow édition (SUSPECT)
```

**Rollback cible** : Probablement `8015d568` ou `949e9c2d`

---

## 🚀 LANCEMENT DIAGNOSTIC

Analyse en cours...


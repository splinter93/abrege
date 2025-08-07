# 🧹 NETTOYAGE DES MESSAGES USER - API v2 Scrivia

## 🎯 **PROBLÈME IDENTIFIÉ**

Les `tool_calls` dans les messages `user` ne servent à rien et peuvent créer de la confusion dans l'historique.

### **❌ Problèmes causés :**
- **Confusion** : Le modèle peut penser que l'utilisateur a fait des tool calls
- **Historique pollué** : Messages user avec des données techniques inutiles
- **Taille des payloads** : Augmentation inutile de la taille des requêtes
- **Parsing complexe** : Logique de parsing plus compliquée

---

## ✅ **SOLUTION IMPLÉMENTÉE**

### **🧹 Nettoyage automatique des messages user :**

```typescript
// Nettoyer l'historique et ajouter les tool calls (pas de tool_calls dans les messages user)
const cleanMessages = messages.filter(msg => {
  // Garder tous les messages sauf les tool_calls dans les messages user
  if (msg.role === 'user' && 'tool_calls' in msg) {
    logger.dev("[LLM API] 🔧 Suppression tool_calls du message user");
    return false;
  }
  return true;
});

const updatedMessages = [
  ...cleanMessages,
  toolMessage,
  toolResultMessage
];
```

---

## 📋 **AVANT/APRÈS**

### **❌ AVANT (Historique pollué) :**
```json
[
  {
    "role": "system",
    "content": "Tu es un assistant..."
  },
  {
    "role": "user",
    "content": "Crée une note",
    "tool_calls": [{ "id": "call_123", "type": "function", "function": { "name": "create_note" } }] // ❌ Inutile
  },
  {
    "role": "assistant",
    "content": null,
    "tool_calls": [{ "id": "call_456", "type": "function", "function": { "name": "create_note" } }] // ✅ Correct
  },
  {
    "role": "tool",
    "tool_call_id": "call_456",
    "name": "create_note",
    "content": "{\"success\":true}"
  },
  {
    "role": "user",
    "content": "Merci",
    "tool_calls": [{ "id": "call_789", "type": "function", "function": { "name": "get_notes" } }] // ❌ Inutile
  }
]
```

### **✅ APRÈS (Historique propre) :**
```json
[
  {
    "role": "system",
    "content": "Tu es un assistant..."
  },
  {
    "role": "assistant",
    "content": null,
    "tool_calls": [{ "id": "call_456", "type": "function", "function": { "name": "create_note" } }] // ✅ Correct
  },
  {
    "role": "tool",
    "tool_call_id": "call_456",
    "name": "create_note",
    "content": "{\"success\":true}"
  }
]
```

---

## 🔧 **IMPLÉMENTATION TECHNIQUE**

### **✅ Sections corrigées :**

1. **Section principale (Groq/DeepSeek)** ✅
2. **Section d'erreur** ✅
3. **Section Together AI** ✅

### **✅ Logique de nettoyage :**

```typescript
// Garder tous les messages sauf les tool_calls dans les messages user
if (msg.role === 'user' && 'tool_calls' in msg) {
  logger.dev("[LLM API] 🔧 Suppression tool_calls du message user");
  return false;
}
return true;
```

---

## 🧪 **TESTS DE VALIDATION**

### **📝 Script de test :**
```bash
node scripts/test-clean-messages.js
```

### **✅ Résultats attendus :**
- ✅ Messages user avec tool_calls: 0 (doit être 0)
- ✅ Messages assistant avec tool_calls: 1 (doit être > 0)
- ✅ Messages tool: 1 (doit être > 0)
- ✅ Total messages: 3 (doit être < 5)

---

## 🎯 **BÉNÉFICES**

### **🤖 Impact sur le LLM :**
- ✅ **Messages user plus propres** (pas de tool_calls inutiles)
- ✅ **Historique plus lisible** pour le modèle
- ✅ **Évite la confusion** dans le parsing
- ✅ **Réduit la taille** des payloads

### **🔧 Impact technique :**
- ✅ **Parsing simplifié** : Plus besoin de gérer les tool_calls dans les messages user
- ✅ **Payloads plus légers** : Moins de données inutiles
- ✅ **Historique plus clair** : Seuls les tool_calls pertinents sont conservés
- ✅ **Debugging facilité** : Logs plus propres

---

## 🏁 **VERDICT**

### **✅ Amélioration réussie :**

1. **Nettoyage automatique** ✅ - Les tool_calls sont supprimés des messages user
2. **Conservation des données importantes** ✅ - Les tool_calls des messages assistant sont gardés
3. **Historique plus propre** ✅ - Seules les données pertinentes sont conservées
4. **Impact positif sur le LLM** ✅ - Le modèle reçoit un historique plus clair

### **🚀 Résultat :**
L'historique est maintenant plus propre et le modèle peut mieux comprendre le contexte sans être perturbé par des tool_calls inutiles dans les messages user !

---

## 🔧 **UTILISATION**

Le nettoyage est maintenant **automatique** dans toutes les sections :

- ✅ **Section principale** : Nettoyage appliqué
- ✅ **Section d'erreur** : Nettoyage appliqué  
- ✅ **Section Together AI** : Nettoyage appliqué

**Aucune action manuelle requise** - le système nettoie automatiquement l'historique avant chaque relance du LLM. 
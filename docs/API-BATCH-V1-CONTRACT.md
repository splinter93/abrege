# 📋 **CONTRAT API BATCH V1 - CHAT SESSIONS**

## 🎯 **Vue d'ensemble**

L'API Batch v1 permet l'ajout atomique de messages à une session de chat via une seule requête HTTP. Cette API garantit la cohérence des données, l'idempotence et la gestion de la concurrence.

**Version :** v1  
**Statut :** Production Ready  
**Date de publication :** Janvier 2025  

---

## 🌐 **Endpoint**

```
POST /api/v1/chat-sessions/{sessionId}/messages/batch
```

### **Paramètres de chemin**
- `sessionId` (UUID, requis) : Identifiant unique de la session de chat

---

## 🔐 **En-têtes requis**

### **Authentification**
```http
Authorization: Bearer {jwt_token}
```
- **Type :** JWT token Supabase
- **Portée :** Utilisateur authentifié
- **Validation :** Token valide et non expiré

### **Content-Type**
```http
Content-Type: application/json
```

### **Idempotence (optionnel)**
```http
Idempotency-Key: {unique_operation_id}
```
- **Format :** Chaîne unique (ex: `op-1234567890`)
- **Usage :** Éviter les doublons en cas de retry réseau
- **TTL :** 24 heures

### **Concurrence (optionnel)**
```http
If-Match: {etag_or_timestamp}
```
- **Format :** Timestamp ISO 8601 ou ETag
- **Usage :** Gestion des conflits de version
- **Comportement :** 409 si obsolète

---

## 📝 **Structure de la requête**

### **Corps de la requête**
```json
{
  "messages": [
    {
      "role": "user|assistant|tool|system",
      "content": "string|null",
      "timestamp": "ISO8601",
      "tool_calls": "array|null",
      "tool_call_id": "string|null",
      "name": "string|null",
      "tool_results": "array|null",
      "isStreaming": "boolean|null"
    }
  ],
  "sessionId": "UUID",
  "operation_id": "string|null",
  "batchId": "string|null"
}
```

### **Champs obligatoires par rôle**

#### **Message utilisateur (`role: "user"`)**
- `content` : Contenu du message (string)
- `timestamp` : Horodatage ISO 8601

#### **Message assistant (`role: "assistant"`)**
- `content` : Contenu du message ou `null` si `tool_calls` présent
- `timestamp` : Horodatage ISO 8601
- `tool_calls` : Array des appels d'outils (optionnel)

#### **Message outil (`role: "tool"`)**
- `tool_call_id` : Identifiant unique de l'appel d'outil
- `name` : Nom de l'outil appelé
- `content` : Résultat de l'exécution de l'outil
- `timestamp` : Horodatage ISO 8601

#### **Message système (`role: "system"`)**
- `content` : Contenu du message système
- `timestamp` : Horodatage ISO 8601

### **Champs optionnels**
- `operation_id` : Identifiant d'opération pour l'idempotence
- `batchId` : Identifiant du lot (généré automatiquement si absent)

---

## 📤 **Structure de la réponse**

### **Succès (200/201)**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "UUID",
        "role": "string",
        "content": "string|null",
        "timestamp": "ISO8601",
        "tool_calls": "array|null",
        "tool_call_id": "string|null",
        "name": "string|null",
        "seq": "number"
      }
    ],
    "session": {
      "id": "UUID",
      "updated_at": "ISO8601",
      "thread_length": "number"
    },
    "applied": "boolean",
    "operation_id": "string|null"
  }
}
```

### **Champs de réponse**

#### **`messages`**
- Array des messages ajoutés avec leurs IDs générés
- `seq` : Numéro de séquence monotone croissant par session

#### **`session`**
- `updated_at` : Timestamp de dernière modification
- `thread_length` : Nombre total de messages dans le thread

#### **`applied`**
- `true` : Messages ajoutés pour la première fois
- `false` : Opération idempotente (messages déjà présents)

#### **`operation_id`**
- Identifiant de l'opération (si fourni dans la requête)

---

## ❌ **Codes d'erreur normalisés**

### **Structure d'erreur**
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Description humaine de l'erreur",
  "details": {
    "field": "Détails spécifiques au champ",
    "validation_errors": ["Liste des erreurs de validation"]
  }
}
```

### **Codes d'erreur**

#### **4xx - Erreurs client**

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_REQUIRED` | 401 | Authentification requise |
| `TOKEN_INVALID` | 401 | Token JWT invalide ou expiré |
| `TOKEN_EXPIRED` | 401 | Token JWT expiré |
| `ACCESS_DENIED` | 403 | Accès refusé à la session |
| `SESSION_NOT_FOUND` | 404 | Session de chat introuvable |
| `CONFLICT_VERSION` | 409 | Conflit de version (ETag obsolète) |
| `VALIDATION_ERROR` | 422 | Erreur de validation des données |
| `IDEMPOTENCY_CONFLICT` | 409 | Conflit d'idempotence |

#### **5xx - Erreurs serveur**

| Code | HTTP | Description |
|------|------|-------------|
| `INTERNAL_ERROR` | 500 | Erreur interne du serveur |
| `DATABASE_ERROR` | 500 | Erreur de base de données |
| `SERVICE_UNAVAILABLE` | 503 | Service temporairement indisponible |

---

## 🔄 **Exemples d'utilisation**

### **1. Ajout de messages simples**

```bash
curl -X POST "http://localhost:3000/api/v1/chat-sessions/123e4567-e89b-12d3-a456-426614174000/messages/batch" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Bonjour, comment allez-vous ?",
        "timestamp": "2025-01-15T10:30:00Z"
      }
    ],
    "sessionId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "987fcdeb-51a2-43d1-9f12-345678901234",
        "role": "user",
        "content": "Bonjour, comment allez-vous ?",
        "timestamp": "2025-01-15T10:30:00Z",
        "seq": 1
      }
    ],
    "session": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "updated_at": "2025-01-15T10:30:01Z",
      "thread_length": 1
    },
    "applied": true
  }
}
```

### **2. Séquence tool call complète**

```bash
curl -X POST "http://localhost:3000/api/v1/chat-sessions/123e4567-e89b-12d3-a456-426614174000/messages/batch" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: op-create-note-123" \
  -d '{
    "messages": [
      {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "create_note",
              "arguments": "{\"title\": \"Test\", \"content\": \"Contenu\"}"
            }
          }
        ],
        "timestamp": "2025-01-15T10:31:00Z"
      },
      {
        "role": "tool",
        "tool_call_id": "call_abc123",
        "name": "create_note",
        "content": "{\"success\": true, \"note_id\": \"note_456\"}",
        "timestamp": "2025-01-15T10:31:01Z"
      },
      {
        "role": "assistant",
        "content": "Note créée avec succès ! ID: note_456",
        "timestamp": "2025-01-15T10:31:02Z"
      }
    ],
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "operation_id": "op-create-note-123"
  }'
```

### **3. Gestion de l'idempotence**

```bash
# Premier envoi
curl -X POST "..." \
  -H "Idempotency-Key: op-123" \
  -d '{"operation_id": "op-123", ...}'

# Deuxième envoi (même operation_id)
curl -X POST "..." \
  -H "Idempotency-Key: op-123" \
  -d '{"operation_id": "op-123", ...}'
```

**Réponse du deuxième envoi :**
```json
{
  "success": true,
  "data": {
    "messages": [],
    "session": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "updated_at": "2025-01-15T10:31:02Z",
      "thread_length": 3
    },
    "applied": false,
    "operation_id": "op-123"
  }
}
```

### **4. Gestion de la concurrence**

```bash
# Lecture de la session pour obtenir l'ETag
GET /api/v1/chat-sessions/123e4567-e89b-12d3-a456-426614174000

# Envoi avec ETag
curl -X POST "..." \
  -H "If-Match: 2025-01-15T10:31:02Z" \
  -d '...'
```

**Réponse en cas de conflit :**
```json
{
  "success": false,
  "code": "CONFLICT_VERSION",
  "message": "La session a été modifiée par un autre utilisateur",
  "details": {
    "current_version": "2025-01-15T10:32:00Z",
    "provided_version": "2025-01-15T10:31:02Z"
  }
}
```

### **5. Erreur de validation**

```bash
curl -X POST "..." \
  -d '{
    "messages": [
      {
        "role": "tool",
        "content": "Résultat sans tool_call_id"
      }
    ]
  }'
```

**Réponse d'erreur :**
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation des messages échouée",
  "details": {
    "validation_errors": [
      "Message 0: tool_call_id manquant pour un message tool",
      "Message 0: name manquant pour un message tool"
    ]
  }
}
```

---

## 🛡️ **Sécurité et validation**

### **Contrôles d'accès**
- **Authentification obligatoire** : Toutes les requêtes nécessitent un JWT valide
- **RLS (Row Level Security)** : Un utilisateur ne peut accéder qu'à ses propres sessions
- **Validation des données** : Tous les messages sont validés selon leur rôle

### **Validation des messages tool**
- `tool_call_id` : Doit être unique dans la session
- `name` : Doit correspondre à un outil valide
- `content` : Doit être sérialisable en JSON

### **Limites et contraintes**
- **Taille maximale** : 100 messages par batch
- **Taille des messages** : 10MB par message
- **Historique** : Limite configurable par session (défaut: 50)
- **Idempotence** : TTL de 24 heures

---

## 🔄 **Gestion des erreurs et retry**

### **Stratégie de retry recommandée**
```typescript
const retryWithBackoff = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'CONFLICT_VERSION') {
        // Refetch et rejouer
        await refetchSession();
        continue;
      }
      
      if (error.code === 'IDEMPOTENCY_CONFLICT') {
        // Opération déjà appliquée
        return { applied: false };
      }
      
      if (attempt === maxRetries) throw error;
      
      // Backoff exponentiel
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
};
```

### **Codes de retry**
- **Retry immédiat** : `VALIDATION_ERROR`, `INTERNAL_ERROR`
- **Retry avec backoff** : `SERVICE_UNAVAILABLE`, `DATABASE_ERROR`
- **Pas de retry** : `AUTH_REQUIRED`, `ACCESS_DENIED`, `SESSION_NOT_FOUND`
- **Refetch + retry** : `CONFLICT_VERSION`

---

## 📊 **Métriques et monitoring**

### **Métriques exposées**
- **Latence** : Temps de traitement des requêtes
- **Taux de succès** : Pourcentage de requêtes réussies
- **Erreurs par code** : Distribution des codes d'erreur
- **Idempotence** : Nombre de replays idempotents
- **Concurrence** : Nombre de conflits 409

### **Logs de debug**
```json
{
  "level": "debug",
  "timestamp": "2025-01-15T10:31:01Z",
  "operation": "batch_messages",
  "session_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user_123",
  "messages_count": 3,
  "operation_id": "op-123",
  "processing_time_ms": 45,
  "applied": true
}
```

---

## 🔮 **Évolution et compatibilité**

### **Versioning**
- **Version actuelle** : v1
- **Compatibilité** : Rétrocompatible dans la v1.x
- **Dépréciation** : Annoncée 6 mois à l'avance

### **Futures améliorations**
- **Streaming** : Support des réponses en temps réel
- **Webhooks** : Notifications de modifications
- **Bulk operations** : Opérations sur plusieurs sessions

---

## 📚 **Ressources supplémentaires**

### **Documentation technique**
- [Architecture des sessions de chat](../ARCHITECTURE-CHAT-SESSIONS.md)
- [Gestion des tool calls](../TOOL-CALLS-MANAGEMENT.md)
- [Sécurité et authentification](../SECURITY-AUTH.md)

### **Exemples de code**
- [Client JavaScript](../examples/batch-client.js)
- [Client Python](../examples/batch-client.py)
- [Tests d'intégration](../tests/batch-integration.test.js)

### **Support**
- **Issues** : [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions** : [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation** : [Wiki](https://github.com/your-repo/wiki)

---

*Dernière mise à jour : Janvier 2025*  
*Version de l'API : v1*  
*Statut : Production Ready* 🚀 
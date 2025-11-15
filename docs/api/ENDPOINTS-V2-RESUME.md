# 📋 RÉSUMÉ ENDPOINTS API V2 - POUR CHATGPT

## 🎯 **ENDPOINTS PRINCIPAUX**

### 📝 **NOTES**
- `GET /note/{ref}` - Récupérer une note par ID/slug
- `POST /note/create` - Créer une nouvelle note
- `PUT /note/{ref}/update` - Mettre à jour une note
- `GET /note/recent` - Notes récentes
- `POST /note/{ref}/content:apply` - **NOUVEAU** Opérations de contenu précises

### 🤖 **AGENTS SPÉCIALISÉS**
- `POST /agents/execute` - **NOUVEAU** Exécuter un agent universel
- `HEAD /agents/execute?ref={agent}` - Vérifier l'existence d'un agent

### 🔍 **RECHERCHE & UTILITAIRES**
- `GET /search` - Recherche de contenu
- `GET /me` - Profil utilisateur
- `GET /openapi-schema` - Schéma OpenAPI

### 🎨 **CANVA SESSIONS** (REST V2)
- `POST /canva/sessions` - Créer ou ouvrir une session canva
- `GET /canva/sessions?chat_session_id={id}` - Lister les sessions d'un chat
- `GET /canva/sessions/{id}` - Détails d'une session canva
- `PATCH /canva/sessions/{id}` - Update status ou metadata
- `DELETE /canva/sessions/{id}` - Supprimer définitivement une session

## 🚀 **ENDPOINTS NOUVEAUX IMPORTANTS**

### 1. **POST /agents/execute** - Agent Universel
```json
{
  "ref": "johnny",
  "input": "Analyse cette note",
  "options": {
    "temperature": 0.7,
    "max_tokens": 500
  }
}
```
**Avantage** : Un seul endpoint pour tous les agents !

### 2. **POST /note/{ref}/content:apply** - Opérations de Contenu
```json
{
  "ops": [{
    "id": "op-1",
    "action": "insert",
    "target": {
      "type": "heading",
      "heading": {
        "path": ["API", "Endpoints"],
        "level": 3
      }
    },
    "where": "after",
    "content": "### Nouveau bloc\nContenu..."
  }],
  "dry_run": true,
  "return": "diff"
}
```
**Avantage** : Modifications précises avec dry-run !

## 🔐 **AUTHENTIFICATION**
- **Header** : `X-API-Key: your-api-key`
- **Tous les endpoints** nécessitent une authentification

## 📊 **CODES DE RÉPONSE**
- **200/201** : Succès
- **400** : Données invalides
- **401** : Non authentifié
- **404** : Ressource non trouvée
- **422** : Erreur de validation
- **500** : Erreur serveur

## 🎯 **POUR CHATGPT**
- **Schéma complet** : `docs/api/OPENAPI-V2-COMPLETE.json`
- **Base URL** : `https://scrivia.app/api/v2`
- **Format** : JSON uniquement
- **Headers** : `Content-Type: application/json`

## 🚀 **EXEMPLES RAPIDES**

### Exécuter l'agent Johnny
```bash
curl -X POST "https://scrivia.app/api/v2/agents/execute" \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"ref":"johnny","input":"Analyse cette note"}'
```

### Rechercher du contenu
```bash
curl -X GET "https://scrivia.app/api/v2/search?q=API&limit=10" \
  -H "X-API-Key: your-key"
```

### Créer une note
```bash
curl -X POST "https://scrivia.app/api/v2/note/create" \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"source_title":"Ma Note","classeur_id":"uuid","content":"Contenu..."}'
```

**Total : 8 endpoints principaux + 2 nouveaux endpoints révolutionnaires !** 🎯


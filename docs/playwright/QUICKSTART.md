# 🚀 Quick Start Guide - Playwright API

Démarrez rapidement avec l'API Playwright de Factoria en quelques minutes.

## 📋 Prérequis

- Une clé API (optionnelle pour le moment)
- curl, Postman, ou un client HTTP de votre choix
- URL de base : `https://factoria-playwright.up.railway.app`

## ⚡ Premier appel

### 1. Vérifier que le service est en ligne

```bash
curl https://factoria-playwright.up.railway.app/health
```

**Réponse attendue :**
```json
{
  "status": "healthy",
  "service": "playwright",
  "version": "1.0.0",
  "timestamp": "2025-12-30T..."
}
```

### 2. Scraper une page simple

```bash
curl -X POST https://factoria-playwright.up.railway.app/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "selector": "h1",
      "extract": "text"
    }
  }'
```

**Réponse :**
```json
{
  "success": true,
  "data": "Example Domain",
  "url": "https://example.com",
  "duration": 2345,
  "timestamp": "2025-12-30T..."
}
```

### 3. Capturer un screenshot

```bash
curl -X POST https://factoria-playwright.up.railway.app/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "fullPage": true,
      "format": "png"
    }
  }' \
  --output screenshot.png
```

Le fichier `screenshot.png` sera créé avec la capture d'écran.

## 📚 Exemples courants

### Extraire le titre d'une page

```bash
curl -X POST https://factoria-playwright.up.railway.app/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "selector": "title",
      "extract": "text"
    }
  }'
```

### Cliquer sur un bouton et extraire le résultat

```bash
# 1. Naviguer vers la page
curl -X POST https://factoria-playwright.up.railway.app/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "goto",
    "url": "https://example.com",
    "sessionId": "my-session"
  }'

# 2. Cliquer sur un bouton
curl -X POST https://factoria-playwright.up.railway.app/interact \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click",
    "url": "https://example.com",
    "selector": "button#submit",
    "sessionId": "my-session"
  }'

# 3. Extraire le contenu après interaction
curl -X POST https://factoria-playwright.up.railway.app/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "selector": "#result",
      "extract": "text"
    }
  }'
```

### Générer un PDF d'une page

```bash
curl -X POST https://factoria-playwright.up.railway.app/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "format": "A4",
      "printBackground": true
    }
  }' \
  --output page.pdf
```

### Attendre qu'un élément apparaisse

```bash
curl -X POST https://factoria-playwright.up.railway.app/wait \
  -H "Content-Type: application/json" \
  -d '{
    "action": "selector",
    "url": "https://example.com",
    "selector": "#dynamic-content",
    "options": {
      "timeout": 10000
    }
  }'
```

## 🔧 Workflow avec sessions

Les sessions permettent de maintenir l'état entre plusieurs requêtes (cookies, localStorage, etc.).

### Exemple : Se connecter et naviguer

```bash
# 1. Créer une session et naviguer vers la page de login
curl -X POST https://factoria-playwright.up.railway.app/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "goto",
    "url": "https://example.com/login",
    "sessionId": "user-123"
  }'

# 2. Remplir le formulaire de connexion
curl -X POST https://factoria-playwright.up.railway.app/interact \
  -H "Content-Type: application/json" \
  -d '{
    "action": "fill",
    "url": "https://example.com/login",
    "selector": "input[name=email]",
    "value": "user@example.com",
    "sessionId": "user-123"
  }'

curl -X POST https://factoria-playwright.up.railway.app/interact \
  -H "Content-Type: application/json" \
  -d '{
    "action": "fill",
    "url": "https://example.com/login",
    "selector": "input[name=password]",
    "value": "password123",
    "sessionId": "user-123"
  }'

# 3. Cliquer sur le bouton de connexion
curl -X POST https://factoria-playwright.up.railway.app/interact \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click",
    "url": "https://example.com/login",
    "selector": "button[type=submit]",
    "sessionId": "user-123"
  }'

# 4. Vérifier que la connexion a réussi en extrayant le contenu
curl -X POST https://factoria-playwright.up.railway.app/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/dashboard",
    "options": {
      "selector": ".user-name",
      "extract": "text"
    }
  }'
```

## 📖 Endpoints principaux

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/health` | GET | Vérifier le statut du service |
| `/test` | GET | Tester l'installation Playwright |
| `/scrape` | POST | Extraire du contenu d'une page |
| `/screenshot` | POST | Capturer une capture d'écran |
| `/pdf` | POST | Générer un PDF d'une page |
| `/navigate` | POST | Naviguer (goto, back, forward, reload) |
| `/interact` | POST | Interagir (click, fill, select, etc.) |
| `/wait` | POST | Attendre une condition |
| `/keyboard` | POST | Simuler des actions clavier |
| `/info` | POST | Obtenir des informations sur une page |
| `/session/list-active` | GET | Lister les sessions actives |
| `/session/close` | POST | Fermer une session |

## 🔗 Ressources

- **Documentation complète** : Voir [README.md](./README.md)
- **Schéma OpenAPI** : Voir [openapi/factoria-playwright-api.json](../../openapi/factoria-playwright-api.json)
- **Guide de déploiement** : Voir [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md)

## 💡 Conseils

1. **Utilisez les sessions** pour maintenir l'état entre requêtes
2. **Gérez les timeouts** selon la complexité des pages
3. **Utilisez les selectors CSS** pour cibler précisément les éléments
4. **Testez d'abord** avec `/test` pour vérifier que le service fonctionne
5. **Nettoyez les sessions** avec `/session/close` quand vous avez terminé

## 🆘 Problèmes courants

### Erreur "URL is required"
→ Vérifiez que vous avez bien inclus le champ `url` dans votre requête

### Erreur "Invalid URL format"
→ Assurez-vous que l'URL commence par `http://` ou `https://`

### Timeout
→ Augmentez le `timeout` dans les options ou utilisez `/wait` pour attendre un élément spécifique

### Session expirée
→ Les sessions expirent après 5 minutes d'inactivité. Créez une nouvelle session si nécessaire.

## 📞 Support

Pour toute question ou problème :
- Email : support@factoria.app
- Documentation : https://github.com/splinter93/factoria


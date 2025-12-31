# 📖 Documentation Complète - Playwright API

Documentation complète de l'API Playwright de Factoria pour l'automatisation web et le scraping.

## 🌐 Base URL

```
https://factoria-playwright.up.railway.app
```

## 🔐 Authentification

Actuellement, l'API est publique. Une authentification sera ajoutée dans les versions futures.

## 📊 Format des Réponses

### Réponse de succès

Toutes les réponses de succès suivent ce format :

```json
{
  "success": true,
  "data": { ... },
  "url": "https://example.com",
  "duration": 1234,
  "timestamp": "2025-12-30T23:00:00.000Z"
}
```

### Réponse d'erreur

```json
{
  "success": false,
  "error": "Message d'erreur",
  "details": "Détails de l'erreur",
  "url": "https://example.com",
  "duration": 500,
  "timestamp": "2025-12-30T23:00:00.000Z"
}
```

## 🔍 Endpoints

### Health & Status

#### `GET /health`

Vérifie que le service est opérationnel.

**Réponse :**
```json
{
  "status": "healthy",
  "service": "playwright",
  "version": "1.0.0",
  "timestamp": "2025-12-30T23:00:00.000Z"
}
```

#### `GET /test`

Teste l'installation Playwright et la disponibilité des navigateurs.

**Réponse :**
```json
{
  "success": true,
  "data": {
    "service": "Playwright",
    "status": "operational",
    "version": "1.55.1",
    "installation": {
      "playwright": true,
      "browser": true
    },
    "capabilities": [
      "web-automation",
      "screenshot-capture",
      "pdf-generation",
      "page-interaction",
      "multi-browser-support",
      "mobile-emulation"
    ]
  }
}
```

### Extraction de Contenu

#### `POST /scrape`

Extrait du contenu depuis une page web.

**Corps de la requête :**
```json
{
  "url": "https://example.com",
  "options": {
    "selector": "h1",
    "extract": "text",
    "waitFor": 2000,
    "headers": {
      "User-Agent": "Custom Agent"
    }
  }
}
```

**Options :**
- `selector` (string, optionnel) : Sélecteur CSS pour cibler un élément
- `extract` (string, optionnel) : Format d'extraction (`text`, `html`, `json`)
- `evaluate` (string, optionnel) : Code JavaScript à exécuter dans la page
- `waitFor` (string|number, optionnel) : Attendre un sélecteur ou un délai en ms
- `headers` (object, optionnel) : Headers HTTP personnalisés

**Exemple d'extraction de texte :**
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

**Exemple d'extraction HTML :**
```bash
curl -X POST https://factoria-playwright.up.railway.app/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "selector": ".content",
      "extract": "html"
    }
  }'
```

**Exemple avec JavaScript personnalisé :**
```bash
curl -X POST https://factoria-playwright.up.railway.app/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "evaluate": "document.querySelector(\"h1\").textContent"
    }
  }'
```

### Captures

#### `POST /screenshot`

Capture une capture d'écran d'une page web.

**Corps de la requête :**
```json
{
  "url": "https://example.com",
  "options": {
    "fullPage": true,
    "format": "png",
    "quality": 80,
    "width": 1920,
    "height": 1080,
    "waitFor": "#content"
  }
}
```

**Options :**
- `fullPage` (boolean) : Capturer toute la page (défaut: `false`)
- `format` (string) : Format de l'image (`png`, `jpeg`, défaut: `png`)
- `quality` (number) : Qualité pour JPEG (0-100)
- `width` (number) : Largeur de la zone à capturer
- `height` (number) : Hauteur de la zone à capturer
- `waitFor` (string|number) : Attendre un sélecteur ou un délai

**Réponse :** Image binaire (PNG ou JPEG)

**Exemple :**
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

#### `POST /pdf`

Génère un PDF depuis une page web.

**Corps de la requête :**
```json
{
  "url": "https://example.com",
  "options": {
    "format": "A4",
    "landscape": false,
    "printBackground": true,
    "margin": {
      "top": "1cm",
      "right": "1cm",
      "bottom": "1cm",
      "left": "1cm"
    },
    "waitFor": "#content"
  }
}
```

**Options :**
- `format` (string) : Format de page (`A4`, `A3`, `Letter`, défaut: `A4`)
- `landscape` (boolean) : Orientation paysage (défaut: `false`)
- `printBackground` (boolean) : Imprimer les arrière-plans (défaut: `false`)
- `margin` (object) : Marges en CSS (top, right, bottom, left)
- `waitFor` (string|number) : Attendre un sélecteur ou un délai

**Réponse :** PDF binaire

**Exemple :**
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

### Navigation

#### `POST /navigate`

Navigue dans le navigateur.

**Corps de la requête :**
```json
{
  "action": "goto",
  "url": "https://example.com",
  "options": {
    "waitUntil": "networkidle",
    "timeout": 30000
  },
  "sessionId": "my-session"
}
```

**Actions disponibles :**
- `goto` : Aller à une URL (nécessite `url`)
- `goBack` : Retour en arrière
- `goForward` : Avancer
- `reload` : Recharger la page

**Options :**
- `waitUntil` (string) : Condition d'attente (`load`, `domcontentloaded`, `networkidle`, `commit`)
- `timeout` (number) : Timeout en millisecondes
- `referer` (string) : Header Referer

**Exemple :**
```bash
curl -X POST https://factoria-playwright.up.railway.app/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "goto",
    "url": "https://example.com",
    "sessionId": "my-session"
  }'
```

### Interactions

#### `POST /interact`

Interagit avec des éléments de la page.

**Corps de la requête :**
```json
{
  "action": "click",
  "url": "https://example.com",
  "selector": "button#submit",
  "value": "text for fill",
  "options": {
    "timeout": 10000,
    "force": false
  },
  "sessionId": "my-session"
}
```

**Actions disponibles :**
- `click` : Cliquer sur un élément
- `fill` : Remplir un champ (nécessite `value`)
- `select` : Sélectionner une option (nécessite `value`)
- `check` : Cocher une checkbox
- `uncheck` : Décocher une checkbox
- `hover` : Survoler un élément

**Options :**
- `timeout` (number) : Timeout en millisecondes
- `force` (boolean) : Forcer l'action même si l'élément n'est pas visible
- `position` (object) : Position de clic `{x: number, y: number}`
- `button` (string) : Bouton de la souris (`left`, `right`, `middle`)
- `clickCount` (number) : Nombre de clics
- `delay` (number) : Délai avant l'action en ms

**Exemple de clic :**
```bash
curl -X POST https://factoria-playwright.up.railway.app/interact \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click",
    "url": "https://example.com",
    "selector": "button#submit",
    "sessionId": "my-session"
  }'
```

**Exemple de remplissage :**
```bash
curl -X POST https://factoria-playwright.up.railway.app/interact \
  -H "Content-Type: application/json" \
  -d '{
    "action": "fill",
    "url": "https://example.com",
    "selector": "input[name=email]",
    "value": "user@example.com",
    "sessionId": "my-session"
  }'
```

#### `POST /keyboard`

Simule des actions clavier.

**Corps de la requête :**
```json
{
  "url": "https://example.com",
  "action": "type",
  "selector": "input#search",
  "text": "Hello World",
  "key": "Enter",
  "options": {
    "delay": 100,
    "timeout": 10000
  },
  "sessionId": "my-session"
}
```

**Actions disponibles :**
- `press` : Appuyer sur une touche (nécessite `key`)
- `type` : Taper du texte (nécessite `text` et `selector`)
- `keyPress` : Appuyer sur une touche globale (nécessite `key`)

**Options :**
- `delay` (number) : Délai entre les caractères en ms
- `timeout` (number) : Timeout en millisecondes

**Exemple :**
```bash
curl -X POST https://factoria-playwright.up.railway.app/keyboard \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "action": "type",
    "selector": "input#search",
    "text": "search query",
    "sessionId": "my-session"
  }'
```

### Attentes

#### `POST /wait`

Attend qu'une condition soit remplie.

**Corps de la requête :**
```json
{
  "action": "selector",
  "url": "https://example.com",
  "selector": "#content",
  "condition": "visible",
  "options": {
    "timeout": 10000
  }
}
```

**Actions disponibles :**
- `selector` : Attendre qu'un sélecteur apparaisse (nécessite `selector`)
- `navigation` : Attendre une navigation
- `loadState` : Attendre un état de chargement (`load`, `domcontentloaded`, `networkidle`)
- `function` : Attendre qu'une fonction retourne vrai (nécessite `condition` avec code JS)

**Exemple :**
```bash
curl -X POST https://factoria-playwright.up.railway.app/wait \
  -H "Content-Type: application/json" \
  -d '{
    "action": "selector",
    "url": "https://example.com",
    "selector": "#dynamic-content"
  }'
```

### Informations

#### `POST /info`

Récupère des informations sur une page.

**Corps de la requête :**
```json
{
  "url": "https://example.com"
}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "title": "Example Domain",
    "url": "https://example.com",
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "userAgent": "Mozilla/5.0...",
    "cookies": [...],
    "localStorage": {...},
    "sessionStorage": {...}
  }
}
```

**Exemple :**
```bash
curl -X POST https://factoria-playwright.up.railway.app/info \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'
```

### Sessions

Les sessions permettent de maintenir l'état (cookies, localStorage, sessionStorage) entre plusieurs requêtes.

#### `GET /session/list-active`

Liste toutes les sessions actives.

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "my-session",
      "lastUsed": "2025-12-30T23:00:00.000Z",
      "url": "https://example.com"
    }
  ],
  "count": 1
}
```

#### `POST /session/close`

Ferme une session.

**Corps de la requête :**
```json
{
  "sessionId": "my-session"
}
```

**Exemple :**
```bash
curl -X POST https://factoria-playwright.up.railway.app/session/close \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "my-session"
  }'
```

**Note :** Les sessions expirent automatiquement après 5 minutes d'inactivité.

## 🎯 Cas d'usage avancés

### Scraping avec pagination

```bash
# Page 1
curl -X POST https://factoria-playwright.up.railway.app/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/list?page=1",
    "options": {
      "selector": ".item",
      "extract": "text"
    }
  }'

# Page 2
curl -X POST https://factoria-playwright.up.railway.app/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "goto",
    "url": "https://example.com/list?page=2",
    "sessionId": "scraping-session"
  }'
```

### Automatisation de formulaire

```bash
# 1. Naviguer vers le formulaire
curl -X POST https://factoria-playwright.up.railway.app/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "goto",
    "url": "https://example.com/form",
    "sessionId": "form-session"
  }'

# 2. Remplir les champs
curl -X POST https://factoria-playwright.up.railway.app/interact \
  -H "Content-Type: application/json" \
  -d '{
    "action": "fill",
    "url": "https://example.com/form",
    "selector": "input[name=name]",
    "value": "John Doe",
    "sessionId": "form-session"
  }'

# 3. Soumettre le formulaire
curl -X POST https://factoria-playwright.up.railway.app/interact \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click",
    "url": "https://example.com/form",
    "selector": "button[type=submit]",
    "sessionId": "form-session"
  }'

# 4. Vérifier le résultat
curl -X POST https://factoria-playwright.up.railway.app/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/success",
    "options": {
      "selector": ".message",
      "extract": "text"
    }
  }'
```

## 🔒 Limites et Restrictions

- **Timeout par défaut** : 30 secondes (configurable)
- **Taille max de requête** : 50MB
- **Sessions** : Expirent après 5 minutes d'inactivité
- **Pages concurrentes** : Maximum 10 par instance
- **Rate limiting** : Actuellement non implémenté (à venir)

## 📞 Support

Pour toute question ou problème :
- Email : support@factoria.app
- Documentation : Voir [QUICKSTART.md](./QUICKSTART.md) pour des exemples rapides
- Schéma OpenAPI : Disponible dans le repository


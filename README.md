This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Endpoints

Voici les principaux endpoints REST disponibles sous `/api/v1/` :

| Endpoint                | Méthode | Description                |
|-------------------------|---------|----------------------------|
| /api/v1/create-note     | POST    | Créer une note (markdown)  |
| /api/v1/write-note      | POST    | Mettre à jour une note     |
| /api/v1/create-folder   | POST    | Créer un dossier           |
| /api/v1/create-classeur | POST    | Créer un classeur          |

---

### 1. Créer une note

- **Endpoint** : `/api/v1/create-note`
- **Méthode** : POST
- **Payload attendu** :
```json
{
  "classeur_id": "string",
  "title": "string",
  "markdown_content": "string",
  "html_content": "string",
  "source_type": "markdown",
  "source_url": "string"
}
```
- **Exemple cURL** :
```bash
curl -X POST http://localhost:3000/api/v1/create-note \
  -H "Content-Type: application/json" \
  -d '{
    "classeur_id": "123",
    "title": "Ma note",
    "markdown_content": "# Titre\nContenu...",
    "html_content": "<h1>Titre</h1><p>Contenu...</p>",
    "source_type": "markdown",
    "source_url": "/note/uuid"
  }'
```
- **Réponse attendue** :
```json
{
  "success": true,
  "note": { /* objet note créé */ }
}
```

---

### 2. Mettre à jour une note

- **Endpoint** : `/api/v1/write-note`
- **Méthode** : POST
- **Payload attendu** :
```json
{
  "noteId": "string",
  "title": "string",
  "content": "string",
  "titleAlign": "left" // optionnel
}
```
- **Exemple cURL** :
```bash
curl -X POST http://localhost:3000/api/v1/write-note \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "123",
    "title": "Titre modifié",
    "content": "# Nouveau contenu",
    "titleAlign": "center"
  }'
```
- **Réponse attendue** :
```json
{
  "success": true,
  "note": { /* note mise à jour */ }
}
```

---

### 3. Créer un dossier

- **Endpoint** : `/api/v1/create-folder`
- **Méthode** : POST
- **Payload attendu** :
```json
{
  "classeur_id": "string",
  "name": "string",
  "parent_id": "string|null"
}
```
- **Exemple cURL** :
```bash
curl -X POST http://localhost:3000/api/v1/create-folder \
  -H "Content-Type: application/json" \
  -d '{
    "classeur_id": "123",
    "name": "Nouveau dossier",
    "parent_id": null
  }'
```
- **Réponse attendue** :
```json
{
  "success": true,
  "folder": { /* dossier créé */ }
}
```

---

### 4. Créer un classeur

- **Endpoint** : `/api/v1/create-classeur`
- **Méthode** : POST
- **Payload attendu** :
```json
{
  "name": "string",
  "icon": "string", // optionnel
  "color": "string" // optionnel
}
```
- **Exemple cURL** :
```bash
curl -X POST http://localhost:3000/api/v1/create-classeur \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nouveau classeur",
    "icon": "Folder",
    "color": "#e55a2c"
  }'
```
- **Réponse attendue** :
```json
{
  "success": true,
  "classeur": { /* classeur créé */ }
}
```

---

### 5. Lister tous les classeurs d'un utilisateur

- **Endpoint** : `/api/v1/classeurs?user_id=xxx`
- **Méthode** : GET
- **Paramètre requis** : `user_id` (string)
- **Exemple cURL** :
```bash
curl -X GET 'http://localhost:3000/api/v1/classeurs?user_id=USER_ID'
```
- **Réponse attendue** :
```json
{
  "classeurs": [
    {
      "id": "string",
      "user_id": "string",
      "name": "string",
      "icon": "string",
      "color": "string",
      "created_at": "ISO date",
      "updated_at": "ISO date",
      "position": 0
    },
    ...
  ]
}
```
- **Erreurs** :
  - 422 si user_id manquant/mal formé
  - 500 erreur serveur

---

### 6. Lister tous les dossiers d'un classeur

- **Endpoint** : `/api/v1/classeur/:id/dossiers`
- **Méthode** : GET
- **Paramètre requis** : `id` (classeur_id, string)
- **Exemple cURL** :
```bash
curl -X GET 'http://localhost:3000/api/v1/classeur/CLASSEUR_ID/dossiers'
```
- **Réponse attendue** :
```json
{
  "dossiers": [
    {
      "id": "string",
      "classeur_id": "string",
      "name": "string",
      "parent_id": "string|null",
      "created_at": "ISO date",
      "updated_at": "ISO date",
      "position": 0
    },
    ...
  ]
}
```
- **Erreurs** :
  - 422 si id manquant/mal formé
  - 500 erreur serveur

---

### 7. Lister toutes les notes d'un dossier

- **Endpoint** : `/api/v1/dossier/:id/notes`
- **Méthode** : GET
- **Paramètre requis** : `id` (dossier_id, string)
- **Exemple cURL** :
```bash
curl -X GET 'http://localhost:3000/api/v1/dossier/DOSSIER_ID/notes'
```
- **Réponse attendue** :
```json
{
  "notes": [
    {
      "id": "string",
      "folder_id": "string",
      "classeur_id": "string",
      "source_title": "string",
      "markdown_content": "string",
      "html_content": "string",
      "created_at": "ISO date",
      "updated_at": "ISO date",
      "position": 0
    },
    ...
  ]
}
```
- **Erreurs** :
  - 422 si id manquant/mal formé
  - 500 erreur serveur

---

### 8. Lire une note précise

- **Endpoint** : `/api/v1/note/:id`
- **Méthode** : GET
- **Paramètre requis** : `id` (note_id, string)
- **Exemple cURL** :
```bash
curl -X GET 'http://localhost:3000/api/v1/note/NOTE_ID'
```
- **Réponse attendue** :
```json
{
  "note": {
    "id": "string",
    "folder_id": "string",
    "classeur_id": "string",
    "source_title": "string",
    "markdown_content": "string",
    "html_content": "string",
    "created_at": "ISO date",
    "updated_at": "ISO date",
    "position": 0
  }
}
```
- **Erreurs** :
  - 422 si id manquant/mal formé
  - 404 si note non trouvée
  - 500 erreur serveur

---

### 9. Ajouter du contenu à une note (append-only)

- **Endpoint** : `/api/v1/note/:id/append`
- **Méthode** : PATCH
- **Paramètre requis** : `id` (note_id, string)
- **Payload attendu** :
```json
{
  "text": "markdown à ajouter"
}
```
- **Exemple cURL** :
```bash
curl -X PATCH 'http://localhost:3000/api/v1/note/NOTE_ID/append' \
  -H "Content-Type: application/json" \
  -d '{ "text": "\n## Ajout LLM" }'
```
- **Réponse attendue** :
```json
{
  "note": {
    "id": "string",
    "folder_id": "string",
    "classeur_id": "string",
    "source_title": "string",
    "markdown_content": "string (nouveau markdown)",
    "html_content": "string (nouveau HTML)",
    "created_at": "ISO date",
    "updated_at": "ISO date",
    "position": 0
  }
}
```
- **Erreurs** :
  - 422 si id ou text manquant/mal formé
  - 404 si note non trouvée
  - 500 erreur serveur

---

### 10. Récupérer la table des matières d'une note (TOC)

- **Endpoint** : `/api/v1/note/:id/toc`
- **Méthode** : GET
- **Paramètre requis** : `id` (note_id, string)
- **Exemple cURL** :
```bash
curl -X GET 'http://localhost:3000/api/v1/note/NOTE_ID/toc'
```
- **Réponse attendue** :
```json
{
  "toc": [
    { "level": 1, "title": "Titre principal", "line": 1, "start": 3 },
    { "level": 2, "title": "Sous-titre", "line": 5, "start": 4 },
    ...
  ]
}
```
- **Schéma TOC** :
  - `level` (int) : niveau du titre (1=H1, 2=H2…)
  - `title` (string) : texte du titre
  - `line` (int) : numéro de ligne dans le markdown (1-based)
  - `start` (int) : index de début du titre dans la ligne
- **Erreurs** :
  - 422 si id manquant/mal formé
  - 404 si note non trouvée
  - 500 erreur serveur

---

### 11. Ajouter du contenu à une section d'une note (append-to-section)

- **Endpoint** : `/api/v1/note/:id/append-to-section`
- **Méthode** : PATCH
- **Paramètre requis** : `id` (note_id, string)
- **Payload attendu** :
```json
{
  "section": "titre exact OU slug unique du titre",
  "text": "markdown à ajouter"
}
```
- **Ciblage de la section** :
  - On peut cibler une section soit par le texte exact du titre, soit par son slug unique (voir TOC).
  - Le slug est généré automatiquement (kebab-case, unique même en cas de doublon : `titre`, `titre-1`, etc.).
- **Exemple cURL** :
```bash
curl -X PATCH 'http://localhost:3000/api/v1/note/NOTE_ID/append-to-section' \
  -H "Content-Type: application/json" \
  -d '{ "section": "introduction", "text": "\nNouveau contenu LLM" }'
```
- **Réponse attendue** :
```json
{
  "note": {
    "id": "string",
    "folder_id": "string",
    "classeur_id": "string",
    "source_title": "string",
    "markdown_content": "string (nouveau markdown)",
    "html_content": "string (nouveau HTML)",
    "created_at": "ISO date",
    "updated_at": "ISO date",
    "position": 0
  }
}
```
- **Erreurs** :
  - 422 si id, section ou text manquant/mal formé
  - 404 si note ou section non trouvée
  - 500 erreur serveur

---

## Gestion des erreurs & validation

Chaque endpoint effectue une validation stricte du payload avec [Zod](https://zod.dev/). Si un champ obligatoire est manquant ou mal formé, la réponse sera :

- **Code HTTP** : `422 Unprocessable Entity`
- **Format** :
```json
{
  "error": "Payload invalide",
  "details": [
    "message explicite pour chaque champ en erreur"
  ]
}
```

**Exemples d'erreurs** :
- Champ obligatoire manquant (`title`, `classeur_id`, etc.)
- Champ vide ou mauvais format (ex : string attendu, null reçu)

Si une erreur technique survient (ex : base de données, Supabase down, etc.) :
- **Code HTTP** : `500 Internal Server Error`
- **Format** :
```json
{
  "error": "Message technique explicite (ex: 'Note non trouvée.' ou 'Erreur interne serveur')"
}
```

Aucune stacktrace n'est jamais renvoyée au client.

---

## (Pré-squelette) Documentation OpenAPI/Swagger

```yaml
openapi: 3.0.0
tags:
  - name: Notes
  - name: Dossiers
  - name: Classeurs
paths:
  /api/v1/create-note:
    post:
      tags: [Notes]
      summary: Créer une note
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [classeur_id, title, markdown_content, html_content, source_type, source_url]
              properties:
                classeur_id: { type: string }
                title: { type: string }
                markdown_content: { type: string }
                html_content: { type: string }
                source_type: { type: string }
                source_url: { type: string }
      responses:
        '201': { description: Note créée }
        '422': { description: Erreur de validation }
        '500': { description: Erreur serveur }
  /api/v1/write-note:
    post:
      tags: [Notes]
      summary: Mettre à jour une note
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [noteId, title, content]
              properties:
                noteId: { type: string }
                title: { type: string }
                content: { type: string }
                titleAlign: { type: string, nullable: true }
      responses:
        '200': { description: Note mise à jour }
        '422': { description: Erreur de validation }
        '404': { description: Note non trouvée }
        '500': { description: Erreur serveur }
  /api/v1/create-folder:
    post:
      tags: [Dossiers]
      summary: Créer un dossier
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [classeur_id, name]
              properties:
                classeur_id: { type: string }
                name: { type: string }
                parent_id: { type: string, nullable: true }
      responses:
        '201': { description: Dossier créé }
        '422': { description: Erreur de validation }
        '500': { description: Erreur serveur }
  /api/v1/create-classeur:
    post:
      tags: [Classeurs]
      summary: Créer un classeur
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: { type: string }
                icon: { type: string, nullable: true }
                color: { type: string, nullable: true }
      responses:
        '201': { description: Classeur créé }
        '422': { description: Erreur de validation }
        '500': { description: Erreur serveur }
  /api/v1/classeurs:
    get:
      tags: [Classeurs]
      summary: Lister tous les classeurs d'un utilisateur
      parameters:
        - in: query
          name: user_id
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Liste des classeurs
          content:
            application/json:
              schema:
                type: object
                properties:
                  classeurs:
                    type: array
                    items:
                      $ref: '#/components/schemas/Classeur'
        '422': { description: Erreur de validation }
        '500': { description: Erreur serveur }
  /api/v1/classeur/{id}/dossiers:
    get:
      tags: [Dossiers]
      summary: Lister tous les dossiers d'un classeur
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Liste des dossiers
          content:
            application/json:
              schema:
                type: object
                properties:
                  dossiers:
                    type: array
                    items:
                      $ref: '#/components/schemas/Dossier'
        '422': { description: Erreur de validation }
        '500': { description: Erreur serveur }
  /api/v1/dossier/{id}/notes:
    get:
      tags: [Notes]
      summary: Lister toutes les notes d'un dossier
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Liste des notes
          content:
            application/json:
              schema:
                type: object
                properties:
                  notes:
                    type: array
                    items:
                      $ref: '#/components/schemas/Note'
        '422': { description: Erreur de validation }
        '500': { description: Erreur serveur }
  /api/v1/note/{id}:
    get:
      tags: [Notes]
      summary: Lire une note précise
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Note détaillée
          content:
            application/json:
              schema:
                type: object
                properties:
                  note:
                    $ref: '#/components/schemas/Note'
        '422': { description: Erreur de validation }
        '404': { description: Note non trouvée }
        '500': { description: Erreur serveur }
  /api/v1/note/{id}/append:
    patch:
      tags: [Notes]
      summary: Ajouter du contenu à une note (append-only)
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [text]
              properties:
                text: { type: string }
      responses:
        '200':
          description: Note mise à jour
          content:
            application/json:
              schema:
                type: object
                properties:
                  note:
                    $ref: '#/components/schemas/Note'
        '422': { description: Erreur de validation }
        '404': { description: Note non trouvée }
        '500': { description: Erreur serveur }
  /api/v1/note/{id}/toc:
    get:
      tags: [Notes]
      summary: Récupérer la table des matières (TOC) d'une note
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Table des matières extraite
          content:
            application/json:
              schema:
                type: object
                properties:
                  toc:
                    type: array
                    items:
                      $ref: '#/components/schemas/TOCItem'
        '422': { description: Erreur de validation }
        '404': { description: Note non trouvée }
        '500': { description: Erreur serveur }
  /api/v1/note/{id}/append-to-section:
    patch:
      tags: [Notes]
      summary: Ajouter du contenu à une section d'une note (append-to-section)
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [section, text]
              properties:
                section: { type: string, description: 'Titre exact ou slug unique de la section' }
                text: { type: string, description: 'Markdown à ajouter' }
      responses:
        '200':
          description: Note mise à jour
          content:
            application/json:
              schema:
                type: object
                properties:
                  note:
                    $ref: '#/components/schemas/Note'
        '422': { description: Erreur de validation }
        '404': { description: Note ou section non trouvée }
        '500': { description: Erreur serveur }

components:
  schemas:
    Classeur:
      type: object
      properties:
        id: { type: string }
        user_id: { type: string }
        name: { type: string }
        icon: { type: string }
        color: { type: string }
        created_at: { type: string, format: date-time }
        updated_at: { type: string, format: date-time }
        position: { type: integer }
    Dossier:
      type: object
      properties:
        id: { type: string }
        classeur_id: { type: string }
        name: { type: string }
        parent_id: { type: string, nullable: true }
        created_at: { type: string, format: date-time }
        updated_at: { type: string, format: date-time }
        position: { type: integer }
    Note:
      type: object
      properties:
        id: { type: string }
        folder_id: { type: string }
        classeur_id: { type: string }
        source_title: { type: string }
        markdown_content: { type: string }
        html_content: { type: string }
        created_at: { type: string, format: date-time }
        updated_at: { type: string, format: date-time }
        position: { type: integer }
    TOCItem:
      type: object
      properties:
        level: { type: integer, description: 'Niveau du titre (1=H1, 2=H2...)' }
        title: { type: string, description: 'Texte du titre' }
        slug: { type: string, description: 'Identifiant unique de la section (kebab-case, unique)' }
        line: { type: integer, description: 'Numéro de ligne (1-based)' }
        start: { type: integer, description: 'Index de début du titre dans la ligne' }
```

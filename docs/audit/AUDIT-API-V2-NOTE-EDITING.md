# 🔍 Audit API V2 — Endpoints d'édition de note

**Date** : 13 mars 2026  
**Périmètre** : Endpoints d'édition de contenu de note, apply content operations

---

## 1. Inventaire des endpoints d'édition

| Endpoint | Méthode | Rôle | Utilisé par |
|----------|---------|------|-------------|
| `/api/v2/note/{ref}/update` | PUT | Mise à jour complète (métadonnées + `markdown_content`) | NoteApi, éditeur plein écran |
| `/api/v2/note/{ref}/editNoteContent` | POST | Opérations chirurgicales + **streaming si canva ouvert** | LLM (via `applyContentOperations` → **content:apply**) |
| `/api/v2/note/{ref}/content:apply` | POST | Opérations chirurgicales, sauvegarde DB immédiate | LLM, canvasStateManager |
| `/api/v2/note/{ref}/insert-content` | POST | Insertion simple (start/end/replace/erase) | LLMApi, V2UnifiedApi, NoteContentApi |
| `/api/v2/note/{ref}/insert` | POST | **Stub** — retourne succès sans persister | ❌ Non utilisé |

---

## 2. Problèmes identifiés

### 2.1 🔴 Endpoint `insert` — Stub non implémenté

**Fichier** : `src/app/api/v2/note/[ref]/insert/route.ts`

```typescript
// TODO: Implémenter l'insertion de contenu
return NextResponse.json({
  success: true,
  message: 'Contenu inséré avec succès',
  data: { ref, position, content_inserted: content.length, inserted_at: ... }
});
```

**Problème** : Aucune écriture en base. Le client reçoit un succès mais le contenu n'est jamais sauvegardé.

**Recommandation** : **Supprimer** ou **déprécier** cet endpoint. `insert-content` couvre déjà la même fonctionnalité.

---

### 2.2 🟡 Duplication `editNoteContent` vs `content:apply`

| Aspect | `editNoteContent` | `content:apply` |
|--------|------------------|----------------|
| Logique métier | Identique (ContentApplier) | Identique |
| Schéma validation | `contentApplyV2Schema` | `contentApplyV2Schema` |
| Sauvegarde DB | Si canva fermé | Toujours |
| Streaming | Si canva ouvert | Non |
| Notification SSE | Non (stream gère) | Oui (`content_updated`) |

**Problème** : ~400 lignes de code dupliquées (auth, validation, ETag, sanitization, erreurs). Seule la branche « canva ouvert ou fermé » diffère.

**Recommandation** : Extraire la logique commune dans un module partagé (ex. `applyContentOperationsCore`) et faire deux routes minimales qui appellent ce module avec des options de streaming.

---

### 2.3 🟡 LLM utilise `content:apply` au lieu de `editNoteContent`

**Fichier** : `src/services/llm/clients/ApiV2HttpClient.ts`

```typescript
async applyContentOperations(ref: string, params: Record<string, unknown>, userToken: string): Promise<unknown> {
  return this.makeRequest(`/note/${ref}/content:apply`, 'POST', params, userToken);
}
```

**Problème** : Quand l'utilisateur a le canva ouvert, le LLM devrait utiliser `editNoteContent` pour bénéficier du streaming. Actuellement, `content:apply` est toujours appelé → sauvegarde DB immédiate, pas de streaming.

**Recommandation** : Faire pointer `applyContentOperations` vers `editNoteContent` (qui gère déjà les deux cas). Ou ajouter un paramètre `prefer_streaming: true` et router vers le bon endpoint.

---

### 2.4 🟢 `where: "after"` — Bug corrigé

Le doc `PROBLEMES-ENDPOINT-APPLY-CONTENT.md` signalait un écrasement du match avec `where: "after"`. Le code actuel préserve correctement :

```typescript
// contentApplyUtils.ts:611-613
case 'after':
  return before + match + newContent + after;
```

**Statut** : ✅ Corrigé. Le document peut être mis à jour.

---

### 2.5 🟡 Ciblage heading — Limitations connues

D'après `PROBLEMES-ENDPOINT-APPLY-CONTENT.md` :
- `path` hiérarchique : matching simplifié (dernier élément du path)
- `heading_id` sans `level` : le code cherche dans tous les niveaux si `level` absent

**Statut** : `heading_id` sans `level` est supporté (ligne 236-238 de contentApplyUtils). Le path reste simplifié. À documenter clairement dans l'OpenAPI.

---

### 2.6 🟡 `insert-content` vs `content:apply`

| Critère | `insert-content` | `content:apply` |
|---------|------------------|----------------|
| Ciblage | Section par titre (regex simple) ou global | heading, regex, position, anchor |
| Opérations | start, end, replace, erase | insert, replace, delete, upsert_section |
| Granularité | Grossière | Fine |
| ETag / version | Non | Oui |
| Notification SSE | Non | Oui |

**Recommandation** : Garder les deux. `insert-content` pour les cas simples (ex. LLMApi legacy), `content:apply` / `editNoteContent` pour l'édition chirurgicale. Documenter clairement les cas d'usage.

---

### 2.7 🟢 Architecture ContentApplier — Solide

- **ContentApplier** : logique pure, testable
- **Types** : `ContentOperation`, `OperationResult` bien définis
- **Sanitization** : `sanitizeMarkdownContent` avant application
- **Timeout regex** : 5s pour éviter les regex malveillantes
- **Limite contenu** : 100k caractères

---

## 3. Synthèse — « Le top pour éditer » ?

| Besoin | Endpoint recommandé | Commentaire |
|-------|---------------------|-------------|
| Édition chirurgicale (LLM, agent) | `editNoteContent` | Unifie streaming + batch. À faire pointer le LLM |
| Édition chirurgicale (sans canva) | `content:apply` | Équivalent si pas de stream |
| Mise à jour complète (titre, contenu, métadonnées) | `update` | PUT classique |
| Insertion simple (début/fin/section) | `insert-content` | Pour cas simples |
| **À éviter** | `insert` | Stub non implémenté |

**Oui, on a le top pour l'édition chirurgicale** : `ContentApplier` avec heading, regex, position, anchor est robuste. Les points à corriger sont surtout l’organisation (duplication, routing LLM) et le ménage (stub `insert`).

---

## 4. Plan d’action recommandé

| Priorité | Action | Effort |
|----------|--------|--------|
| P0 | Supprimer ou déprécier l’endpoint `insert` (stub) | Faible |
| P1 | Router le LLM vers `editNoteContent` au lieu de `content:apply` | Faible |
| P2 | Extraire la logique commune `editNoteContent` / `content:apply` | Moyen |
| P3 | Mettre à jour `PROBLEMES-ENDPOINT-APPLY-CONTENT.md` (bug `where: "after"` corrigé) | Faible |
| P4 | Documenter OpenAPI : ciblage heading, cas d’usage par endpoint | Faible |

---

## 5. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/utils/contentApplyUtils.ts` | ContentApplier, logique des opérations |
| `src/app/api/v2/note/[ref]/editNoteContent/route.ts` | Route avec streaming |
| `src/app/api/v2/note/[ref]/content:apply/route.ts` | Route batch |
| `src/app/api/v2/note/[ref]/insert-content/route.ts` | Insertion simple |
| `src/app/api/v2/note/[ref]/insert/route.ts` | ⚠️ Stub à supprimer |
| `src/services/llm/clients/ApiV2HttpClient.ts` | Client LLM — pointe vers content:apply |

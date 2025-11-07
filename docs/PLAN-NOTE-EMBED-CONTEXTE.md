# Plan Migration Note Embed → JSON

## 1. Étudier l’état actuel

- Vérifier comment `{{embed:...}}` est généré et consommé :
  - `src/extensions/NoteEmbedExtension.ts`
  - `src/extensions/markdown-it-note-embed.ts`
  - `src/utils/preprocessEmbeds.ts`
- Inspecter le sanitizer Markdown pour confirmer la protection des motifs `{{...}}`.
- Observer le flux complet (EditorSyncManager → ProseMirror → Markdown) pour comprendre les conversions.

## 2. Définir le nouveau schéma JSON

- Objectif : une syntaxe unique lisible par humains et LLM.
- Schéma (monoligne) :
  ```json
  {"type":"note-embed","noteRef":"<uuid-ou-slug>","display":"pill","noteTitle":"Titre optionnel","depth":0}
  ```
- Champs :
  - `type`: valeur fixe `note-embed`.
  - `noteRef`: uuid ou slug (trim obligatoire).
  - `display`: `pill` (défaut), `inline`, `card`, `compact`.
  - `noteTitle`: optionnel, reflet du titre connu.
  - `depth`: optionnel (prévention récursion).
- Décider du délimiteur (JSON monoligne sans fenced code).
- Documenter le schéma dans `docs/GALERES-NOTE-EMBED-REACT18.md`.

## 3. Adapter parsing / serialization Tiptap

- `preprocessEmbeds.ts`
  - Recognize JSON embeds → `<note-embed ...>`.
  - Garder fallback legacy `{{embed}}`.
- `markdown-it-note-embed.ts`
  - Parser JSON (et legacy) et générer `<note-embed ...>` en preview.
- `NoteEmbedExtension.ts`
  - `parseHTML`/`renderHTML` inchangés (toujours `<note-embed>`).
  - Serializer `addStorage().markdown.serialize` → `JSON.stringify`.
  - Default `display = 'pill'`, accepter `inline|card|compact`.
  - `setNoteEmbed` : display par défaut `pill`.
  - `handlePaste`/`handleDrop` : insérer `display:'pill'`.

## 4. Validation édition + preview

- Mode édition :
  - Création/mise à jour depuis JSON → rendu identique à l’ancien embed.
  - Drag & drop, paste, autosave, refresh.
- Mode preview :
  - `NoteEmbedHydrator` hydrate `<note-embed ...>` (display `pill`).
- Composants React :
  - `NoteEmbedInline`/`Content`/`View` : trim `noteRef`, fallback s’il manque.
  - Support `display = 'pill'` équivalent à l’ancien `inline`.
- CSS :
  - `note-embed-inline.css` : gérer `data-display="pill"` comme `inline`.
- Tests manuels :
  - Paragraphe avant/après → aucun saut supplémentaire.
  - Note vide → aucune pill fantôme.

## 5. Documentation finale

- `docs/GALERES-NOTE-EMBED-REACT18.md` : ajouter section JSON + pipeline.
- `read_lints` et tests manuels (édition/preview).
- Communiquer la nouvelle syntaxe aux prompts LLM.
- Noter que le legacy `{{embed}}` reste lu, mais converti en JSON à la première sauvegarde.

## Points d’attention

- Le warning React 18 `flushSync` reste un bruit toléré lors du switch preview → édition.
- Node `noteEmbed` reste un bloc pour conserver les drag handles (pas de passage inline côté ProseMirror).
- Toujours trim `noteRef` avant de rendre/sérialiser.
- Surveiller les futures variantes (`display: 'compact'`, etc.).
- JSON monoligne = cohérence Markdown / LLM (pas de triple backticks).


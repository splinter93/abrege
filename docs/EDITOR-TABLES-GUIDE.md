# Editor Tables - Configuration & Tests

## Configuration

- `TableKit.configure({ resizable: true, handleWidth: 6, cellMinWidth: 80, allowTableNodeSelection: true })`
- Table HTML tag ajouté avec `class="scrivia-table"` pour un ciblage CSS précis.
- Commandes d’insertion centralisées via `insertDefaultTable()` dans `src/utils/editorTables.ts`.
- Contrôles flottants (`TableControls`) couvrent :
  - Ajout / suppression de lignes
  - Ajout / suppression de colonnes
  - Fusion / scission de cellules
  - Suppression du tableau complet

## Tests manuels recommandés

1. **Insertion**
   - Toolbar, slash command, menu contextuel, transform menu.
   - Vérifier présence d’une ligne d’en-tête et absence d’`<note-embed>` fantôme.

2. **Redimensionnement**
   - Saisir les poignées `TableKit` sur desktop (drag horizontal et vertical).

3. **Commandes flottantes**
   - Ajouter/supprimer lignes & colonnes (tester sur 1 seule ligne pour edge cases).
   - Fusionner plusieurs cellules puis scinder.
   - Supprimer le tableau via bouton danger.

4. **Navigation**
   - `Tab` / `Shift+Tab` (commande TableKit) pour naviguer entre cellules.
   - `Enter` en fin de cellule : vérifie création de paragraphe (comportement normal).

5. **fixTables()**
   - Sur un tableau corrompu (supprimer manuellement une cellule dans le DOM), exécuter `editor.commands.fixTables()` depuis la console et vérifier la réparation.


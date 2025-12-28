# 🔍 AUDIT : Font-weight des titres dans l'éditeur

## 📋 Problème identifié

Les titres H1, H2, H3 dans le body de l'éditeur apparaissent **plus gras** que le titre dans le title area, ce qui crée une incohérence visuelle.

## 🔍 Analyse des valeurs actuelles

### Title Area (`.noteLayout-title`)
- **Font-weight** : `var(--editor-title-weight)` = `775`
- **Source** : `typography.css` ligne 214, 224

### H1 dans l'éditeur (`.ProseMirror h1`, `.markdown-body h1`)
- **Font-weight** : `775` (hardcodé)
- **Source** : `editor-markdown.css` ligne 38
- ✅ **OK** : Même poids que le title area

### H2 dans l'éditeur
- **Font-weight** : `750` (hardcodé)
- **Variable définie** : `--editor-h2-weight: 725` (non utilisée !)
- **Source** : `editor-markdown.css` ligne 50
- ❌ **PROBLÈME** : 
  - Valeur hardcodée au lieu de variable
  - `750` est trop proche de `775` (title area) → visuellement aussi gras
  - Variable dit `725` mais code utilise `750` → incohérence

### H3 dans l'éditeur
- **Font-weight** : `750` (hardcodé)
- **Variable définie** : `--editor-h3-weight: 725` (non utilisée !)
- **Source** : `editor-markdown.css` ligne 62
- ❌ **PROBLÈME** : Même problème que H2

### H4, H5, H6
- **Font-weight** : `675` (hardcodé)
- **Variables définies** : `--editor-h4-weight: 800`, `--editor-h5-weight: 800`, `--editor-h6-weight: 800` (non utilisées !)
- ❌ **PROBLÈME** : Incohérence totale avec les variables

## 🎯 Solution recommandée

### Hiérarchie visuelle cohérente
1. **Title area** : `775` (le plus important)
2. **H1** : `775` (égal au title area, OK)
3. **H2** : `700` (réduire de 750 → 700 pour hiérarchie claire)
4. **H3** : `650` (réduire de 750 → 650)
5. **H4** : `600`
6. **H5** : `550`
7. **H6** : `500`

### Actions à prendre
1. ✅ Utiliser les variables CSS au lieu de valeurs hardcodées
2. ✅ Ajuster les variables pour créer une hiérarchie claire
3. ✅ S'assurer que title area > H1 ≥ H2 > H3 > H4 > H5 > H6

## 📝 Fichiers à modifier

1. `src/styles/typography.css` : Ajuster les variables
2. `src/styles/editor-markdown.css` : Utiliser les variables au lieu de valeurs hardcodées


# A4 PDF Export QA

## Objectif
Valider que le mode document A4 et l'export PDF reproduisent un rendu bureautique propre, stable et imprimable.

## Cas de test

### 1. Lettre simple
- Titre sans image d'en-tête
- 6 à 10 paragraphes longs
- Liens, gras, italique
- Vérifier l'interlignage, les marges et les retours à la ligne

### 2. Document avec image d'en-tête
- Image d'en-tête active
- Tester `offset`, `blur`, `overlay`
- Tester titre dans l'image et titre sous l'image
- Vérifier que l'image colle bien au haut de la page

### 3. Document multipage
- Minimum 3 pages A4
- Vérifier les séparateurs de pages visibles dans l'éditeur
- Vérifier que le PDF reprend les mêmes coupures globales

### 4. Typographies
- Tester `Manrope`
- Tester `Inter`
- Tester une police serif si utilisée par l'équipe
- Vérifier que le PDF charge bien la police attendue

### 5. Blocs riches
- Listes ordonnées et non ordonnées
- Tableaux
- Blockquotes
- Blocs de code
- Images dans le corps

## Checklist d'acceptation
- Même densité visuelle entre éditeur A4 et PDF
- Même hiérarchie typographique entre éditeur A4 et PDF
- Pas de marge parasite au-dessus du header
- Pas de texte rasterisé dans le chemin Playwright
- Aucune coupure visuelle incohérente sur les titres, tableaux et images
- Impression papier A4 lisible sans ajustement manuel

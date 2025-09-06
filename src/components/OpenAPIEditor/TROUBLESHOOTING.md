# 🔧 Guide de dépannage - Éditeur OpenAPI

## Problème : "Unexpected non-whitespace character after JSON at position X"

Cette erreur indique qu'il y a du contenu supplémentaire après la fin du JSON valide.

### 🎯 Solutions

#### 1. **Utiliser les outils de débogage**
L'éditeur inclut maintenant des outils de débogage intégrés :
- Cliquez sur "Test Exemple" pour tester avec le schéma d'exemple
- Cliquez sur "Test OpenAPI V2" pour tester avec ton schéma principal
- Les informations détaillées s'afficheront dans la console de débogage

#### 2. **Vérifier le contenu du fichier**
```bash
# Vérifier la fin du fichier
tail -c 100 openapi-v2-schema.json

# Vérifier s'il y a des caractères invisibles
hexdump -C openapi-v2-schema.json | tail -20
```

#### 3. **Nettoyer le JSON**
```bash
# Nettoyer et reformater le JSON
cat openapi-v2-schema.json | jq . > openapi-v2-schema-clean.json
```

#### 4. **Vérifier la validité du JSON**
```bash
# Tester la validité
node -e "console.log(JSON.parse(require('fs').readFileSync('openapi-v2-schema.json', 'utf8')))"
```

### 🔍 Diagnostic automatique

L'éditeur affiche maintenant :
- **Position exacte** de l'erreur
- **Contexte** autour de l'erreur (50 caractères avant/après)
- **Informations détaillées** sur le parsing
- **Validation OpenAPI** complète

### 🚀 Test rapide

1. Va sur `/openapi-editor`
2. Clique sur "Test OpenAPI V2" dans les outils de débogage
3. Regarde les informations affichées
4. Si ça marche, le problème vient de la façon dont tu charges le schéma

### 📋 Causes communes

1. **Caractères invisibles** : BOM, espaces, retours à la ligne
2. **Contenu supplémentaire** : Commentaires, métadonnées après le JSON
3. **Encodage** : Problème d'encodage UTF-8
4. **Corruption** : Fichier partiellement corrompu

### ✅ Vérifications

- [ ] Le fichier se termine bien par `}`
- [ ] Pas de caractères après la dernière accolade
- [ ] Encodage UTF-8 correct
- [ ] JSON valide (testé avec `jq` ou `node`)
- [ ] Schéma OpenAPI valide (propriété `openapi` ou `swagger`)

### 🆘 Si le problème persiste

1. **Utilise l'exemple** : Teste d'abord avec le schéma d'exemple
2. **Vérifie la console** : Regarde les erreurs dans la console du navigateur
3. **Teste en local** : Charge le fichier depuis ton ordinateur
4. **Contacte-moi** : Partage les informations de débogage affichées

### 🎯 Test de l'éditeur

L'éditeur est maintenant accessible à :
```
https://votre-domaine.com/openapi-editor
```

Avec les outils de débogage intégrés, tu peux :
- Tester différents schémas
- Voir les erreurs détaillées
- Diagnostiquer les problèmes de parsing
- Valider les schémas OpenAPI

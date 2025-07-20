# Guide de Migration - Support des Slugs

## 🎯 **Qu'est-ce qui change ?**

L'API "mon JC" supporte maintenant les **slugs** en plus des IDs. Cela signifie que vous pouvez référencer vos ressources de deux façons :

### **Avant (IDs uniquement)**
```javascript
// Seuls les IDs étaient supportés
GET /api/v1/note/123e4567-e89b-12d3-a456-426614174000
```

### **Maintenant (IDs + Slugs)**
```javascript
// Les deux fonctionnent !
GET /api/v1/note/123e4567-e89b-12d3-a456-426614174000  // Par ID
GET /api/v1/note/ma-premiere-note                        // Par slug
```

## 🔄 **Migration automatique**

### **1. Migration des données existantes**

Les données existantes sont automatiquement migrées avec des slugs générés à partir des titres :

```bash
# Lancer la migration
npm run migrate-slugs
```

**Exemple de migration :**
- Note : "Guide React" → slug : `guide-react`
- Dossier : "Mon dossier important" → slug : `mon-dossier-important`
- Classeur : "Mes notes" → slug : `mes-notes`

### **2. Vérification**

```bash
# Vérifier que les colonnes slug existent
npm run add-slug-columns

# Tester la génération de slugs
npm run test-slugs
```

## 🚀 **Nouveaux endpoints**

### **Génération de slugs**

```javascript
// Générer un slug pour un titre
const response = await fetch('/api/v1/slug/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Mon nouveau titre',
    type: 'note' // ou 'folder', 'classeur'
  })
});

const { slug } = await response.json();
// slug = "mon-nouveau-titre"
```

### **Création avec slugs automatiques**

```javascript
// Créer une note (slug généré automatiquement)
const response = await fetch('/api/v1/create-note', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source_title: 'Ma nouvelle note',
    markdown_content: '# Contenu...',
    folder_id: 'folder-id'
  })
});

const { note } = await response.json();
// note.slug = "ma-nouvelle-note"
```

## 📋 **Compatibilité**

### **✅ Ce qui continue de fonctionner**

- Tous les endpoints existants avec les IDs
- Toutes les fonctionnalités actuelles
- Tous les clients existants

### **🆕 Nouveaux avantages**

- **URLs partageables** : `/note/guide-react` au lieu de `/note/123e4567...`
- **Facilité pour les LLMs** : Les slugs sont plus lisibles
- **Meilleure UX** : URLs plus courtes et mémorisables

## 🎯 **Exemples pratiques**

### **Pour les développeurs**

```javascript
// Ancien code (toujours fonctionnel)
const note = await fetch('/api/v1/note/123e4567-e89b-12d3-a456-426614174000');

// Nouveau code (plus lisible)
const note = await fetch('/api/v1/note/guide-react');
```

### **Pour les LLMs**

```javascript
// Générer un slug pour une nouvelle note
const slugResponse = await fetch('/api/v1/slug/generate', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Guide complet de React',
    type: 'note'
  })
});

const { slug } = await slugResponse.json();
// slug = "guide-complet-de-react"

// Créer la note
const createResponse = await fetch('/api/v1/create-note', {
  method: 'POST',
  body: JSON.stringify({
    source_title: 'Guide complet de React',
    markdown_content: '# React\n\nGuide complet...',
    folder_id: 'my-folder-id'
  })
});
```

### **Pour le partage**

```javascript
// URL partageable
const shareableUrl = `https://mon-app.com/note/guide-react`;

// Accéder à la note partagée
const note = await fetch(`/api/v1/note/guide-react`);
```

## 🔧 **Scripts utiles**

```bash
# Vérifier l'état de la migration
npm run add-slug-columns

# Migrer les données existantes
npm run migrate-slugs

# Tester les nouveaux endpoints
npm run test-endpoints

# Tester la génération de slugs
npm run test-slugs
```

## ❓ **FAQ**

### **Q: Les anciens IDs continuent-ils de fonctionner ?**
**R:** Oui ! Tous les endpoints supportent les IDs et les slugs.

### **Q: Comment sont générés les slugs ?**
**R:** Les slugs sont générés automatiquement à partir des titres :
- Caractères spéciaux supprimés
- Espaces remplacés par des tirets
- Accents normalisés
- Suffixe numérique en cas de collision

### **Q: Les slugs sont-ils uniques ?**
**R:** Oui, les slugs sont uniques par utilisateur et par type de ressource.

### **Q: Puis-je personnaliser les slugs ?**
**R:** Pour l'instant, les slugs sont générés automatiquement. Cette fonctionnalité pourra être ajoutée plus tard.

## 🚨 **Points d'attention**

1. **Migration obligatoire** : Exécuter `npm run migrate-slugs` pour les données existantes
2. **Index uniques** : Les colonnes slug ont des index uniques par utilisateur
3. **Validation** : Tous les paramètres sont validés avec Zod
4. **Rétrocompatibilité** : Les IDs continuent de fonctionner

## 📞 **Support**

En cas de problème :
1. Vérifier les logs : `npm run test-endpoints`
2. Consulter la documentation complète : `API-SLUGS-DOCUMENTATION.md`
3. Tester avec les scripts fournis 
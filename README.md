# Abrège - API avec Support des Slugs

## 🎯 **Vue d'ensemble**

Abrège est une API moderne pour la gestion de notes et de documents, maintenant avec **support complet des slugs** pour faciliter l'utilisation par les LLMs, le partage d'URLs, et l'intégration avec les assistants.

## ✨ **Nouvelles fonctionnalités**

### **Support des Slugs**
- **Références doubles** : ID ou slug pour tous les endpoints
- **Génération automatique** : Slugs créés à partir des titres
- **Unicité garantie** : Pas de collision entre utilisateurs
- **Rétrocompatibilité** : Les IDs continuent de fonctionner

### **Exemples d'utilisation**

```javascript
// Ancien (IDs uniquement)
GET /api/ui/note/123e4567-e89b-12d3-a456-426614174000

// Nouveau (IDs + Slugs)
GET /api/ui/note/123e4567-e89b-12d3-a456-426614174000  // Par ID
GET /api/ui/note/ma-premiere-note                        // Par slug
```

## 🚀 **Installation**

```bash
# Cloner le projet
git clone <repository>
cd abrege

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos variables Supabase

# Lancer en développement
npm run dev
```

## 🔧 **Scripts disponibles**

### **Migration et tests**
```bash
# Vérifier les colonnes slug
npm run add-slug-columns

# Migrer les données existantes
npm run migrate-slugs

# Tester la génération de slugs
npm run test-slugs

# Tester les endpoints
npm run test-endpoints
```

### **Développement**
```bash
# Lancer en développement
npm run dev

# Build de production
npm run build

# Lancer en production
npm run start

# Tests
npm run test
npm run test:watch
npm run test:coverage
```

### **Déploiement**
```bash
# Déploiement automatisé
./scripts/deploy.sh
```

## 📚 **Documentation**

- **[API Documentation](API-SLUGS-DOCUMENTATION.md)** : Documentation complète des endpoints
- **[Migration Guide](MIGRATION-GUIDE.md)** : Guide de migration pour les utilisateurs
- **[API Quickstart](API-Quickstart.md)** : Démarrage rapide

## 🎯 **Endpoints principaux**

### **Notes**
- `GET /api/ui/note/[ref]` - Récupérer une note (ID ou slug)
- `PUT /api/ui/note/[ref]` - Mettre à jour une note
- `DELETE /api/ui/note/[ref]` - Supprimer une note
- `POST /api/ui/note/create` - Créer une note avec slug automatique

### **Dossiers**
- `GET /api/ui/dossier/[ref]` - Récupérer un dossier
- `PUT /api/ui/dossier/[ref]` - Mettre à jour un dossier
- `DELETE /api/ui/dossier/[ref]` - Supprimer un dossier

### **Classeurs**
- `GET /api/ui/classeur/[ref]` - Récupérer un classeur
- `PUT /api/ui/classeur/[ref]` - Mettre à jour un classeur
- `DELETE /api/ui/classeur/[ref]` - Supprimer un classeur

### **Génération de slugs**
- `POST /api/ui/slug/generate` - Générer un slug pour un titre

## 🔄 **Migration des données**

### **1. Migration SQL (Supabase)**
```sql
-- Ajouter les colonnes slug
ALTER TABLE articles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE classeurs ADD COLUMN IF NOT EXISTS slug TEXT;

-- Créer les index uniques
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug_user_id 
ON articles(slug, user_id) WHERE slug IS NOT NULL;
```

### **2. Migration des données**
```bash
npm run migrate-slugs
```

## 🎯 **Exemples d'utilisation**

### **Pour les LLMs**
```javascript
// Générer un slug
const response = await fetch('/api/ui/slug/generate', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Guide complet de React',
    type: 'note'
  })
});

const { slug } = await response.json();
// slug = "guide-complet-de-react"

// Créer la note
const noteResponse = await fetch('/api/ui/note/create', {
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

// Accéder à la note
const note = await fetch('/api/ui/note/guide-react');
```

## 🏗️ **Architecture**

### **Structure du projet**
```
src/
├── app/api/ui/           # Endpoints API
│   ├── note/[ref]/       # Endpoints notes (ID/slug)
│   ├── dossier/[ref]/    # Endpoints dossiers
│   ├── classeur/[ref]/   # Endpoints classeurs
│   └── slug/generate/    # Génération de slugs
├── utils/                # Utilitaires
│   ├── slugGenerator.ts  # Génération de slugs
│   └── resourceResolver.ts # Résolution ID/slug
├── middleware/           # Middleware
│   └── resourceResolver.ts # Résolution de références
└── scripts/             # Scripts de migration
    ├── migrateSlugs.ts   # Migration des données
    └── testSlugEndpoints.ts # Tests des endpoints
```

### **Technologies utilisées**
- **Next.js 15** : Framework React
- **Supabase** : Base de données et authentification
- **TypeScript** : Typage statique
- **Zod** : Validation des données
- **Vitest** : Tests unitaires

## 🔒 **Sécurité**

- **Validation** : Tous les paramètres validés avec Zod
- **Unicité** : Slugs uniques par utilisateur et type
- **Sanitisation** : Caractères spéciaux gérés automatiquement
- **Rétrocompatibilité** : Les IDs continuent de fonctionner

## 🚀 **Déploiement**

### **Déploiement automatisé**
```bash
./scripts/deploy.sh
```

### **Déploiement manuel**
```bash
npm run build
# Déployer le dossier .next sur votre plateforme
```

## 📞 **Support**

- **Documentation** : `API-SLUGS-DOCUMENTATION.md`
- **Migration** : `MIGRATION-GUIDE.md`
- **Tests** : `npm run test-endpoints`
- **Logs** : Vérifier les logs de déploiement

## 🤝 **Contribution**

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 **Licence**

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

**Abrège** - API moderne avec support des slugs pour une meilleure expérience utilisateur et une intégration facilitée avec les LLMs.

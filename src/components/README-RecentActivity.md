# 📊 Composants d'Activité Récente - Scrivia

## Vue d'ensemble

Ce module fournit des composants React pour afficher l'activité récente des notes dans l'interface Scrivia. Il inclut une API backend et plusieurs composants frontend avec différents niveaux de personnalisation.

## 🚀 API Backend

### Endpoint: `/api/ui/notes/recent`

**Méthode:** GET  
**Description:** Récupère les notes récentes triées par `updated_at`

**Paramètres de requête:**
- `limit` (optionnel): Nombre maximum de notes à retourner (défaut: 10)
- `username` (optionnel): Filtrer par nom d'utilisateur

**Exemple d'utilisation:**
```typescript
// Récupérer 5 notes récentes
const response = await fetch('/api/ui/notes/recent?limit=5');
const data = await response.json();

// Récupérer les notes d'un utilisateur spécifique
const response = await fetch('/api/ui/notes/recent?username=john&limit=8');
const data = await response.json();
```

**Réponse:**
```json
{
  "success": true,
  "notes": [
    {
      "id": "uuid",
      "title": "Titre de la note",
      "slug": "titre-de-la-note",
      "headerImage": "https://...",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z",
      "isPublished": true,
      "username": "john",
      "url": "/public/john/titre-de-la-note"
    }
  ],
  "total": 1
}
```

## 🎨 Composants Frontend

### 1. RecentActivitySimple

Composant de base pour afficher l'activité récente avec un design simple.

**Props:**
- `limit?: number` - Nombre de notes à afficher (défaut: 5)
- `username?: string` - Filtrer par utilisateur
- `language?: 'fr' | 'en'` - Langue d'affichage (défaut: 'en')

**Utilisation:**
```tsx
import RecentActivitySimple from '@/components/RecentActivitySimple';

<RecentActivitySimple limit={8} username="john" />
```

### 2. RecentActivityCard

Composant en forme de carte avec plus d'options de personnalisation.

**Props:**
- `limit?: number` - Nombre de notes à afficher (défaut: 3)
- `username?: string` - Filtrer par utilisateur
- `showHeader?: boolean` - Afficher l'en-tête (défaut: true)
- `compact?: boolean` - Mode compact (défaut: false)

**Utilisation:**
```tsx
import RecentActivityCard from '@/components/RecentActivityCard';

// Mode normal
<RecentActivityCard limit={5} />

// Mode compact sans en-tête
<RecentActivityCard limit={3} compact showHeader={false} />

// Filtrer par utilisateur
<RecentActivityCard limit={4} username="alice" />
```

### 3. APITester

Composant de test pour vérifier le bon fonctionnement de l'API.

**Utilisation:**
```tsx
import APITester from '@/components/APITester';

<APITester />
```

## 🎯 Cas d'Usage

### Page d'accueil publique
```tsx
<RecentActivitySimple limit={8} />
```

### Dashboard utilisateur
```tsx
<RecentActivityCard limit={5} username={currentUser.username} />
```

### Sidebar compacte
```tsx
<RecentActivityCard limit={3} compact showHeader={false} />
```

### Page de profil
```tsx
<RecentActivitySimple limit={10} username={profileUsername} />
```

## 🔧 Personnalisation

### Styles CSS
Les composants utilisent des variables CSS personnalisables:
- `--accent-hover`: Couleur des liens et badges publics
- `--text-1`: Couleur du texte principal
- `--surface-2`: Couleur de fond des éléments

### Formatage des dates
Les composants incluent un formatage intelligent des dates:
- "À l'instant" pour les modifications récentes
- "Il y a X min" pour les minutes
- "Il y a Xh" pour les heures
- "Il y a Xj" pour les jours
- Date formatée pour les modifications plus anciennes

## 🚨 Gestion des erreurs

Tous les composants gèrent automatiquement:
- **Chargement:** Affichage d'un spinner
- **Erreurs:** Messages d'erreur clairs
- **Données vides:** Message "Aucune activité récente"
- **États de transition:** Animations fluides

## 📱 Responsive Design

Les composants s'adaptent automatiquement:
- **Mobile:** Mode compact par défaut
- **Tablet:** Adaptation des tailles d'images
- **Desktop:** Affichage complet avec plus d'informations

## 🔄 Mise à jour automatique

Les composants se mettent à jour automatiquement:
- Au montage du composant
- Quand les props changent
- Gestion des erreurs réseau
- Retry automatique en cas d'échec

## 🎨 Thèmes et variantes

### Mode sombre (par défaut)
- Fond sombre avec transparence
- Bordures subtiles
- Texte clair avec opacité variable

### Mode clair (à implémenter)
- Variables CSS à adapter
- Couleurs inversées
- Contraste ajusté

## 📝 Notes de développement

### Dépendances
- React 18+ avec hooks
- TypeScript pour le typage
- CSS-in-JS pour les styles
- Fetch API pour les requêtes

### Performance
- Lazy loading des images
- Debouncing des requêtes
- Mémoisation des composants
- Optimisation des re-renders

### Accessibilité
- Alt text pour les images
- Navigation au clavier
- ARIA labels (à implémenter)
- Contraste des couleurs 
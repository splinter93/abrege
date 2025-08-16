# LogoHeader Component

## Vue d'ensemble

Le composant `LogoHeader` est un composant React réutilisable et optimisé pour afficher le logo Scrivia dans les headers de toutes les pages de l'application.

## Caractéristiques

- ✅ **Réutilisable** : Utilisable sur toutes les pages avec des headers
- ✅ **Responsive** : S'adapte automatiquement aux différentes tailles d'écran
- ✅ **Personnalisable** : Props pour la taille, position et comportement
- ✅ **Maintenable** : CSS centralisé et facile à modifier
- ✅ **Accessible** : Support des attributs ARIA et navigation clavier

## Props

| Prop | Type | Défaut | Description |
|------|------|---------|-------------|
| `size` | `'small' \| 'medium' \| 'large' \| 'xl'` | `'medium'` | Taille du logo |
| `position` | `'left' \| 'center' \| 'right'` | `'left'` | Position dans le header |
| `href` | `string` | `'/'` | URL de destination |
| `className` | `string` | `''` | Classe CSS additionnelle |
| `onClick` | `() => void` | `undefined` | Fonction de clic personnalisée |
| `noLink` | `boolean` | `false` | Désactive le lien |

## Tailles disponibles

- **`small`** : 20px × 120px max (idéal pour les headers compacts)
- **`medium`** : 24px × 140px max (taille par défaut)
- **`large`** : 28px × 160px max (headers spacieux)
- **`xl`** : 32px × 180px max (headers très spacieux)

## Positions disponibles

- **`left`** : Aligné à gauche (par défaut)
- **`center`** : Centré dans le header
- **`right`** : Aligné à droite

## Exemples d'utilisation

### Header d'éditeur (petit, gauche)
```tsx
import LogoHeader from '@/components/LogoHeader';

<div className="editor-header-logo">
  <LogoHeader size="small" position="left" />
</div>
```

### Header de page (moyen, centré)
```tsx
<LogoHeader size="medium" position="center" />
```

### Header de navigation (grand, droite)
```tsx
<LogoHeader size="large" position="right" />
```

### Sans lien (juste l'image)
```tsx
<LogoHeader size="medium" noLink={true} />
```

### Avec fonction de clic personnalisée
```tsx
<LogoHeader 
  size="medium" 
  onClick={() => console.log('Logo cliqué')} 
/>
```

## CSS

Le composant utilise le fichier `LogoHeader.css` qui contient :

- Styles de base pour le logo
- Variantes de taille et position
- Effets hover et active
- Media queries pour le responsive
- Intégration avec les headers existants

## Migration depuis LogoScrivia

Pour remplacer l'ancien composant `LogoScrivia` :

```tsx
// Avant
<LogoScrivia width={130} />

// Après
<LogoHeader size="medium" />
```

## Maintenance

Pour modifier le style du logo :

1. Éditer `src/components/LogoHeader.css`
2. Les changements s'appliquent automatiquement partout
3. Tester sur différentes tailles d'écran
4. Vérifier la cohérence visuelle

## Responsive

Le composant s'adapte automatiquement :

- **Desktop** : Taille normale
- **Tablet** : Légèrement réduit
- **Mobile** : Taille compacte optimisée 
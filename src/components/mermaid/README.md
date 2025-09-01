# 🎯 Système Mermaid Unifié

## 📋 Vue d'ensemble

Système Mermaid **ultra clean et unifié** pour l'éditeur ET le chat avec style commun.

## 🏗️ Architecture

### **Structure des fichiers**
```
src/components/mermaid/
├── MermaidRenderer.tsx      # Composant React unifié
├── MermaidRenderer.css      # Styles unifiés (éditeur + chat)
├── MermaidModal.ts          # Modal pour agrandir
├── MermaidModal.css         # Styles de la modal
└── index.ts                 # Exports unifiés

src/services/mermaid/
├── mermaidConfig.ts         # Configuration centralisée
└── mermaidService.ts        # Utilitaires (détection, validation)

src/extensions/
└── MermaidTiptapExtension.ts # Extension Tiptap (React)
```

## 🎨 Composants

### **MermaidRenderer.tsx**
Composant React unifié qui fonctionne pour :
- **Éditeur** : `variant="editor"`
- **Chat** : `variant="chat"`

**Props :**
```typescript
interface MermaidRendererProps {
  content: string;           // Contenu Mermaid
  variant?: 'editor' | 'chat'; // Variante d'affichage
  className?: string;        // Classe CSS optionnelle
  showActions?: boolean;     // Afficher les boutons d'action
  onError?: (error: string) => void;
  onSuccess?: () => void;
  renderOptions?: {
    timeout?: number;        // Timeout de rendu (défaut: 10s)
    retryCount?: number;     // Nombre de tentatives (défaut: 0)
  };
}
```

### **MermaidModal.ts**
Modal pour agrandir les diagrammes :
- **Fonction** : `openMermaidModal(content)`
- **Fermeture** : Escape ou clic sur overlay
- **Configuration** : Utilise la config centralisée

## 🎯 Utilisation

### **Dans l'éditeur (Tiptap)**
```typescript
// Extension Tiptap automatique
// Détecte les blocs ```mermaid et les rend
```

### **Dans le chat**
```typescript
import MermaidRenderer from '@/components/mermaid/MermaidRenderer';

<MermaidRenderer
  content="flowchart TD\nA-->B"
  variant="chat"
  showActions={true}
/>
```

### **Modal programmatique**
```typescript
import { openMermaidModal } from '@/components/mermaid/MermaidModal';

openMermaidModal(mermaidContent);
```

## 🎨 Styles

### **Variantes CSS**
- **`.mermaid-editor`** : Style pour l'éditeur (fond, bordure, padding)
- **`.mermaid-chat`** : Style pour le chat (transparent, compact)

### **États**
- **`.mermaid-loading`** : État de chargement
- **`.mermaid-rendered`** : État rendu
- **`.mermaid-error`** : État d'erreur

### **Responsive**
- **Desktop** : Diagrammes pleine largeur
- **Mobile** : Adaptation des marges et boutons

## ⚙️ Configuration

### **Configuration centralisée**
```typescript
// src/services/mermaid/mermaidConfig.ts
export const defaultMermaidConfig = {
  theme: 'base',
  themeVariables: {
    // Couleurs Scrivia
    primaryColor: '#f97316',
    background: '#1a1a1a',
    // ... autres couleurs
  },
  // ... autres options
};
```

### **Types de diagrammes supportés**
- ✅ **Flowchart** : `flowchart TD`
- ✅ **Sequence** : `sequenceDiagram`
- ✅ **Class** : `classDiagram`
- ✅ **State** : `stateDiagram`
- ✅ **Pie** : `pie`
- ✅ **Gantt** : `gantt`
- ✅ **GitGraph** : `gitGraph`
- ✅ **Journey** : `journey`
- ✅ **ER** : `er`

## 🚀 Fonctionnalités

### **Performance**
- **Lazy loading** : Mermaid chargé à la demande
- **Timeout** : Rendu limité à 10s par défaut
- **Annulation** : Rendu annulé si composant démonté
- **Cache** : Configuration initialisée une seule fois

### **Gestion d'erreurs**
- **Validation** : Syntaxe vérifiée avant rendu
- **Retry** : Possibilité de réessayer
- **Fallback** : Affichage gracieux des erreurs
- **Logs** : Informations de debugging

### **Accessibilité**
- **ARIA labels** : Labels appropriés
- **Navigation clavier** : Focus et Escape
- **Contraste** : Couleurs accessibles

## 🔧 Maintenance

### **Ajouter un nouveau type de diagramme**
1. Ajouter la détection dans `mermaidService.ts`
2. Ajouter la configuration dans `mermaidConfig.ts`
3. Tester avec des exemples

### **Modifier le style**
1. Éditer `MermaidRenderer.css`
2. Utiliser les variables CSS pour la cohérence
3. Tester les deux variantes (éditeur/chat)

### **Modifier la configuration**
1. Éditer `mermaidConfig.ts`
2. La configuration s'applique automatiquement partout

## 🧪 Tests

### **Test manuel**
```typescript
// Exemple de test
const testContent = `
flowchart TD
    A[Début] --> B{Condition}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E
`;

<MermaidRenderer content={testContent} variant="editor" />
```

### **Test de la modal**
```typescript
openMermaidModal(testContent);
```

## 🎉 Avantages

### **✅ Avantages du système unifié**
1. **Code unique** : Un seul composant pour tout
2. **Configuration centralisée** : Un seul endroit à modifier
3. **Style cohérent** : Même apparence partout
4. **Maintenance facile** : Un seul endroit à maintenir
5. **Performance optimisée** : Code partagé et optimisé
6. **Gestion d'erreurs robuste** : Système unifié d'erreurs

### **✅ Compatibilité**
- **Éditeur Tiptap** : Extension React native
- **Chat** : Composant React direct
- **Modal** : Fonction utilitaire
- **Configuration** : Service centralisé

---

**Le système Mermaid est maintenant ultra clean et prêt pour la production !** 🚀

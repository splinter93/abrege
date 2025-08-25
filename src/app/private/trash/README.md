# 🗑️ **Corbeille - Gestion des éléments supprimés**

## ✨ **Vue d'ensemble**

La corbeille est une fonctionnalité de sécurité qui permet de récupérer les éléments supprimés par accident. Elle est accessible depuis la sidebar principale, en bas, juste avant le compte utilisateur.

## 🎯 **Fonctionnalités**

### **Récupération automatique**
- **Durée de conservation** : 30 jours
- **Suppression automatique** : Après 30 jours, les éléments sont définitivement supprimés
- **Récupération** : Possibilité de restaurer à tout moment pendant la période de conservation

### **Types d'éléments gérés**
- 📁 **Dossiers supprimés**
- 📄 **Notes supprimées**
- 📎 **Fichiers supprimés**

## 🚀 **Comment accéder**

1. **Depuis la sidebar** : Cliquer sur l'icône 🗑️ "Corbeille" en bas de la sidebar
2. **URL directe** : `/private/trash`
3. **Navigation** : Bouton "Retour aux Dossiers" pour revenir à la gestion des classeurs

## 🔧 **Structure technique**

### **Composants**
- `TrashPage` : Page principale de la corbeille
- `TrashLayout` : Layout avec sidebar et authentification
- `trash.css` : Styles modernes et épurés

### **Fonctionnalités futures**
- [ ] Affichage des éléments supprimés
- [ ] Actions de restauration
- [ ] Suppression définitive manuelle
- [ ] Filtres par type et date
- [ ] Recherche dans la corbeille

## 🎨 **Design**

### **Style moderne et épuré**
- **Gradient de fond** : Dégradé sombre élégant
- **Glassmorphism** : Effets de transparence et de flou
- **Animations** : Transitions fluides avec Framer Motion
- **Responsive** : Adaptation complète mobile/desktop

### **Couleurs et thème**
- **Fond principal** : Dégradé `#0f0f23` → `#1a1a2e` → `#16213e`
- **Accent** : Rouge corbeille `#ef4444`
- **Texte** : Blanc avec transparences variables
- **Bordures** : Transparences subtiles

## 📱 **Responsive Design**

### **Breakpoints**
- **Desktop** : ≥1200px - Affichage complet
- **Tablette** : 768px-1199px - Adaptation des tailles
- **Mobile** : ≤767px - Layout vertical optimisé

### **Adaptations**
- **Icônes** : Tailles réduites sur petits écrans
- **Espacement** : Marges et paddings adaptés
- **Navigation** : Bouton retour toujours accessible

## 🔒 **Sécurité**

### **Authentification requise**
- **AuthGuard** : Protection de la route
- **Vérification utilisateur** : Accès limité aux utilisateurs connectés
- **Session valide** : Redirection si non authentifié

### **Permissions**
- **Lecture seule** : Consultation des éléments supprimés
- **Restauration** : À implémenter (futur)
- **Suppression définitive** : À implémenter (futur)

## 🚧 **État actuel**

### **Implémenté** ✅
- [x] Page de la corbeille avec design moderne
- [x] Intégration dans la sidebar
- [x] Layout responsive avec authentification
- [x] Styles CSS complets
- [x] Navigation retour vers les dossiers
- [x] État vide avec informations

### **À implémenter** 🔄
- [ ] Logique de récupération des éléments supprimés
- [ ] API pour la gestion de la corbeille
- [ ] Actions de restauration et suppression
- [ ] Filtres et recherche
- [ ] Statistiques en temps réel

## 📚 **Références techniques**

### **Fichiers principaux**
- `src/app/private/trash/page.tsx` - Page principale
- `src/app/private/trash/layout.tsx` - Layout avec sidebar
- `src/app/private/trash/trash.css` - Styles CSS
- `src/components/Sidebar.tsx` - Intégration sidebar

### **Dépendances**
- **Framer Motion** : Animations et transitions
- **React Feather** : Icônes modernes
- **Next.js** : Routing et layout
- **CSS Modules** : Styles modulaires

---

*Dernière mise à jour : Décembre 2024* 
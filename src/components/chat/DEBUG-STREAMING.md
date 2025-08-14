# 🐛 Debug du Streaming - Guide de Diagnostic

## 🎯 **Problème Identifié**

Le streaming ligne par ligne ne fonctionne pas dans le chat. Voici comment diagnostiquer et résoudre le problème.

## 🔍 **Étapes de Diagnostic**

### **1. Vérifier la Page de Test**
- **Visitez** : `/test-streaming-debug`
- **Vérifiez** : Les contrôles de streaming s'affichent-ils ?
- **Testez** : Activez le streaming et observez le comportement

### **2. Vérifier la Console du Navigateur**
- **Ouvrez** : DevTools (F12)
- **Allez dans** : Console
- **Cherchez** : Erreurs JavaScript ou warnings

### **3. Vérifier les Préférences de Streaming**
- **Dans la console** : Tapez `localStorage.getItem('chat-streaming-preferences')`
- **Résultat attendu** : `{"enabled":true,"lineDelay":600,"autoAdjust":true}`

## 🧪 **Tests de Validation**

### **Test 1 : Hook useStreamingPreferences**
```javascript
// Dans la console du navigateur
// Vérifiez que le hook fonctionne
console.log('Test du hook streaming...');
```

### **Test 2 : Composant StreamingLineByLine**
```javascript
// Vérifiez que le composant est bien importé
// Pas d'erreur dans la console
```

### **Test 3 : Intégration dans ChatMessage**
```javascript
// Vérifiez que shouldUseStreaming est bien calculé
// Vérifiez que le composant est bien rendu
```

## 🚨 **Problèmes Possibles et Solutions**

### **Problème 1 : Hook non chargé**
**Symptôme** : `preferences` est undefined
**Solution** : Vérifier l'import de `useStreamingPreferences`

### **Problème 2 : Composant non rendu**
**Symptôme** : `shouldUseStreaming` est toujours false
**Solution** : Vérifier la logique conditionnelle dans ChatMessage

### **Problème 3 : CSS manquant**
**Symptôme** : Le streaming fonctionne mais pas d'animation
**Solution** : Vérifier l'import du CSS dans StreamingLineByLine

### **Problème 4 : Délai trop rapide**
**Symptôme** : Le streaming semble instantané
**Solution** : Vérifier la valeur de `lineDelay` et `getAdjustedDelay`

## 🔧 **Code de Debug à Ajouter**

### **Dans ChatMessage.tsx**
```tsx
// Ajouter des console.log pour debug
console.log('ChatMessage - preferences:', preferences);
console.log('ChatMessage - shouldUseStreaming:', shouldUseStreaming);
console.log('ChatMessage - streamingDelay:', streamingDelay);
console.log('ChatMessage - role:', role);
console.log('ChatMessage - content length:', content?.length);
```

### **Dans StreamingLineByLine.tsx**
```tsx
// Ajouter des console.log pour debug
console.log('StreamingLineByLine - content:', content);
console.log('StreamingLineByLine - lineDelay:', lineDelay);
console.log('StreamingLineByLine - lines count:', lines.length);
console.log('StreamingLineByLine - displayedLines:', displayedLines);
```

### **Dans useStreamingPreferences.ts**
```tsx
// Ajouter des console.log pour debug
console.log('useStreamingPreferences - preferences:', preferences);
console.log('useStreamingPreferences - isLoaded:', isLoaded);
```

## 📱 **Test de la Page de Debug**

### **1. Accéder à la Page**
```
http://localhost:3001/test-streaming-debug
```

### **2. Vérifier les Contrôles**
- ✅ **Toggle streaming** : Fonctionne-t-il ?
- ✅ **Slider de vitesse** : Change-t-il la valeur ?
- ✅ **Ajustement automatique** : Fonctionne-t-il ?

### **3. Tester le Streaming**
- ✅ **Activer le streaming** : Le bouton change-t-il d'état ?
- ✅ **Changer la vitesse** : La valeur se met-elle à jour ?
- ✅ **Observer l'effet** : Le contenu apparaît-il ligne par ligne ?

### **4. Vérifier la Console**
- ✅ **Pas d'erreurs** : Console propre ?
- ✅ **Logs de debug** : Les console.log s'affichent-ils ?
- ✅ **État des préférences** : Sont-elles bien chargées ?

## 🎯 **Résolution du Problème**

### **Si le streaming ne se déclenche jamais :**
1. Vérifier que `preferences.enabled` est `true`
2. Vérifier que `role === 'assistant'`
3. Vérifier que `content` existe et n'est pas vide
4. Vérifier que `isStreamingComplete` est `false`

### **Si le streaming se déclenche mais pas d'effet :**
1. Vérifier que `StreamingLineByLine` est bien rendu
2. Vérifier que le CSS est bien chargé
3. Vérifier que `lineDelay` n'est pas trop petit
4. Vérifier que `getAdjustedDelay` retourne une valeur correcte

### **Si le streaming est trop rapide :**
1. Vérifier la valeur de `lineDelay` (doit être > 200ms)
2. Vérifier que `getAdjustedDelay` ne retourne pas une valeur trop petite
3. Vérifier que l'ajustement automatique fonctionne

## 🔍 **Vérifications Finales**

### **1. Structure des Fichiers**
```
src/components/chat/
├── StreamingLineByLine.tsx          ✅ Existe
├── StreamingLineByLine.css          ✅ Existe
├── ChatMessage.tsx                  ✅ Modifié
├── ChatKebabMenu.tsx               ✅ Modifié
└── useStreamingPreferences.ts       ✅ Existe
```

### **2. Imports Vérifiés**
```tsx
// Dans StreamingLineByLine.tsx
import './StreamingLineByLine.css';  ✅ CSS importé

// Dans ChatMessage.tsx
import StreamingLineByLine from './StreamingLineByLine';  ✅ Composant importé
import { useStreamingPreferences } from '@/hooks/useStreamingPreferences';  ✅ Hook importé

// Dans ChatKebabMenu.tsx
import { useStreamingPreferences } from '@/hooks/useStreamingPreferences';  ✅ Hook importé
```

### **3. Logique de Rendu**
```tsx
// Dans ChatMessage.tsx
const shouldUseStreaming = preferences.enabled && 
                          role === 'assistant' && 
                          content && 
                          !isStreamingComplete;

// Cette condition doit être true pour que le streaming se déclenche
```

## 🎉 **Résolution Attendue**

Après avoir suivi ce guide de debug, le streaming devrait fonctionner correctement :

1. ✅ **Contrôles dans le header** : Menu kebab avec section streaming
2. ✅ **Streaming fonctionnel** : Contenu qui apparaît ligne par ligne
3. ✅ **Vitesse ajustable** : Slider de 200ms à 1500ms
4. ✅ **Ajustement automatique** : Vitesse adaptée selon la longueur
5. ✅ **Persistance** : Réglages sauvegardés automatiquement

**Si le problème persiste, partagez les logs de la console !** 🚨 
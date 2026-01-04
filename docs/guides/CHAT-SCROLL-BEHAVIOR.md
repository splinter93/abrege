# 📜 Chat Scroll - Comportement et Logique

**Date:** 2025-01  
**Feature:** Gestion du scroll automatique et du padding pour les messages

---

## 🎯 VUE D'ENSEMBLE

Le système de scroll du chat est conçu pour offrir une expérience fluide et prévisible, similaire à ChatGPT. Il gère automatiquement le positionnement des messages user et assistant pour éviter les saccades visuelles.

### Principes fondamentaux

1. **Scroll automatique UNIQUEMENT pour les messages user** - Quand l'utilisateur envoie un message, le chat scroll automatiquement pour le mettre en évidence
2. **Padding temporaire** - Un padding est ajouté en bas du container pour laisser de l'espace au message assistant qui va suivre
3. **Reset conditionnel** - Le padding est retiré uniquement si le message assistant dépasse un certain seuil (55% du viewport)
4. **Pas de scroll pour les messages assistant** - Les messages assistant n'ont pas de scroll automatique pour éviter qu'ils bougent pendant leur apparition

---

## 🔧 COMPOSANTS PRINCIPAUX

### 1. Hook `useChatScroll`

**Fichier:** `src/hooks/useChatScroll.ts`

**Responsabilités:**
- Détecter l'ajout de nouveaux messages user
- Appliquer le scroll automatique avec padding temporaire
- Gérer les changements de layout (ouverture/fermeture canva)

**Fonctionnement:**

```typescript
// Scroll UNIQUEMENT si c'est un message user
if (hasNewMessage && currLast?.role === 'user') {
  setTimeout(() => scrollToBottom(), 100);
}
```

**Padding selon le layout:**
- **Chat normal:** 81% du viewport (`paddingRatio = 0.81`)
- **Mode canva:** 76% du viewport (`paddingRatio = 0.76`)

**Détection du layout:**
```typescript
const chatMain = container.closest('.chatgpt-main') as HTMLElement;
const isCanvaLayout = chatMain?.classList.contains('chatgpt-main--canva-open') ?? false;
```

### 2. Reset conditionnel du padding

**Fichier:** `src/components/chat/ChatFullscreenV2.tsx`  
**Fonction:** `handleComplete` (dans `useChatHandlers`)

**Logique:**

Quand un message assistant est terminé (streaming complété), le système vérifie si le padding doit être retiré :

```typescript
const messageHeight = lastAssistant.offsetHeight;
const viewportHeight = window.innerHeight;
const threshold = viewportHeight * 0.55; // 55% du viewport

if (messageHeight > threshold) {
  // Message long → reset le padding
  container.style.paddingBottom = '';
} else {
  // Message court → garde le padding (évite saccade)
}
```

**Seuil actuel:** **55% du viewport**

**Pourquoi ce seuil ?**
- Messages **courts** (≤ 55%) : Le padding reste pour éviter une saccade visuelle si le message est petit
- Messages **longs** (> 55%) : Le padding est retiré pour éviter un espace vide excessif en bas

**Timing:**
- Le reset se fait dans un `requestAnimationFrame` pour s'assurer que le DOM est complètement rendu avant de mesurer la hauteur

---

## 📊 FLUX COMPLET

### Scénario 1: Message user envoyé

```
1. User envoie un message
   ↓
2. useChatScroll détecte: role === 'user'
   ↓
3. scrollToBottom() appelé avec délai de 100ms
   ↓
4. Padding ajouté: 81% (normal) ou 76% (canva) du viewport
   ↓
5. Scroll smooth jusqu'en bas avec le nouveau padding
   ↓
6. Message user visible, espace réservé pour assistant
```

### Scénario 2: Message assistant en streaming

```
1. Assistant commence à streamer
   ↓
2. Contenu apparaît progressivement
   ↓
3. PAS de scroll automatique (message assistant)
   ↓
4. Padding toujours en place (ajouté lors du message user)
   ↓
5. Message assistant grandit dans l'espace réservé
```

### Scénario 3: Message assistant terminé

```
1. Streaming terminé, handleComplete() appelé
   ↓
2. Message assistant ajouté à la liste des messages
   ↓
3. requestAnimationFrame() pour attendre le rendu DOM
   ↓
4. Mesure de la hauteur du message assistant
   ↓
5. Comparaison avec le seuil (55% du viewport)
   ↓
6a. Si message > 55% → Reset padding (évite espace vide)
6b. Si message ≤ 55% → Garde padding (évite saccade)
```

---

## 🎨 LAYOUTS SUPPORTÉS

### Chat normal (sans canva)

- **Padding:** 81% du viewport
- **Détection:** Absence de classe `.chatgpt-main--canva-open`

### Mode canva (canva ouvert)

- **Padding:** 76% du viewport (moins car moins d'espace disponible)
- **Détection:** Présence de classe `.chatgpt-main--canva-open`

**Pourquoi moins de padding en mode canva ?**
Le canva prend de l'espace à l'écran, donc on réduit le padding pour optimiser l'espace disponible pour les messages.

---

## 🔍 DÉTAILS TECHNIQUES

### Mesure de la hauteur du message

```typescript
const assistantMessages = container.querySelectorAll('.chatgpt-message-assistant');
const lastAssistant = assistantMessages[assistantMessages.length - 1] as HTMLElement;
const messageHeight = lastAssistant.offsetHeight;
```

**Pourquoi `offsetHeight` ?**
- `offsetHeight` inclut le padding, les bordures, et la hauteur réelle du contenu
- C'est la mesure la plus précise pour déterminer l'espace occupé visuellement

### Gestion du viewport mobile

```typescript
const viewportHeight = window.innerHeight;
const visualViewport = typeof window !== 'undefined' && 'visualViewport' in window 
  ? window.visualViewport 
  : null;
const effectiveHeight = visualViewport?.height || viewportHeight;
```

**Pourquoi `visualViewport` ?**
Sur mobile, le clavier virtuel réduit la hauteur visible. `visualViewport` donne la hauteur réelle disponible, en tenant compte du clavier.

### Timing et délais

- **Délai pour scroll user:** 100ms après détection du message
  - Permet au DOM de se mettre à jour
  - Évite les scrolls prématurés

- **Timing pour reset padding:** `requestAnimationFrame`
  - S'assure que le message assistant est complètement rendu
  - Mesure précise de la hauteur réelle

---

## ⚙️ CONFIGURATION

### Modifier le seuil de reset

**Fichier:** `src/components/chat/ChatFullscreenV2.tsx`

```typescript
const threshold = viewportHeight * 0.55; // Modifier ici (0.55 = 55%)
```

**Recommandations:**
- **50%** : Reset plus agressif, peut causer des saccades sur messages moyens
- **55%** : Équilibre actuel (recommandé)
- **60%** : Reset moins fréquent, plus de padding conservé
- **70%+** : Reset très rare, padding presque toujours conservé

### Modifier les ratios de padding

**Fichier:** `src/hooks/useChatScroll.ts`

```typescript
const paddingRatio = isCanvaLayout ? 0.76 : 0.81; // Modifier ici
```

**Recommandations:**
- **Chat normal:** 75-85% (actuellement 81%)
- **Mode canva:** 65-80% (actuellement 76%)

---

## 🐛 PROBLÈMES CONNUS ET SOLUTIONS

### Problème: Message assistant bouge à l'apparition

**Cause:** Reset du padding trop tôt ou scroll automatique déclenché

**Solution:** 
- Vérifier que `useChatScroll` ne scroll que pour les messages user
- S'assurer que le reset se fait dans `requestAnimationFrame`

### Problème: Saccade visuelle sur messages courts

**Cause:** Padding reset même pour messages courts

**Solution:**
- Augmenter le seuil (actuellement 55%)
- Vérifier que la condition `messageHeight > threshold` est correcte

### Problème: Espace vide excessif en bas

**Cause:** Padding conservé même pour messages longs

**Solution:**
- Réduire le seuil (actuellement 55%)
- Vérifier que la mesure de hauteur est correcte

### Problème: Padding incorrect en mode canva

**Cause:** Détection du layout incorrecte

**Solution:**
- Vérifier que la classe `.chatgpt-main--canva-open` est bien appliquée
- Vérifier le `paddingRatio` utilisé

---

## 📝 NOTES IMPORTANTES

1. **Pas de scroll pour messages assistant**
   - Le scroll automatique est intentionnellement désactivé pour les messages assistant
   - Cela évite que le message bouge pendant son apparition/streaming

2. **Padding persistant**
   - Le padding ajouté lors du message user reste en place jusqu'à la fin du message assistant
   - Il est retiré conditionnellement selon la taille du message

3. **Mesure de hauteur**
   - La hauteur est mesurée dans `requestAnimationFrame` pour garantir que le DOM est rendu
   - Utilisation de `offsetHeight` pour la mesure la plus précise

4. **Layout responsive**
   - Le système s'adapte automatiquement au mode canva
   - Gestion du viewport mobile avec `visualViewport`

---

## 🔄 ÉVOLUTIONS FUTURES POSSIBLES

1. **Seuil dynamique**
   - Ajuster le seuil selon la taille de l'écran
   - Seuil différent mobile vs desktop

2. **Animation du reset**
   - Ajouter une transition smooth lors du reset du padding
   - Éviter les changements brusques

3. **Détection de scroll manuel**
   - Désactiver le scroll auto si l'utilisateur scroll manuellement
   - Réactiver quand l'utilisateur revient en bas

4. **Padding adaptatif**
   - Calculer le padding selon la hauteur prévue du message assistant
   - Utiliser des estimations basées sur le contenu

---

## 📚 RÉFÉRENCES

- **Hook principal:** `src/hooks/useChatScroll.ts`
- **Reset conditionnel:** `src/components/chat/ChatFullscreenV2.tsx` (fonction `handleComplete`)
- **Documentation scroll original:** `docs/guides/CHAT-AUTOSCROLL-BEHAVIOR.md`

---

**Dernière mise à jour:** 2025-01





# Audit : système d’autoscroll du chat

**Date :** 2026-02-26  
**Périmètre :** Scroll automatique, padding temporaire, infinite scroll, animations de session.

---

## 1. Architecture actuelle

### 1.1 Acteurs

| Fichier / Hook | Rôle | Cible scroll/padding |
|----------------|------|----------------------|
| **useChatScroll** | Scroll auto au nouvel message **user** ; scroll au layout change (canva) | Container `.chatgpt-messages-container` : `paddingBottom` + `scrollTo` |
| **useChatAnimations** | Fade-in au chargement de session + scroll “stable” (retries images) | `.chatgpt-messages` (enfant) : `paddingBottom` temporaire 40px |
| **ChatFullscreenV2** (handleComplete) | Reset du padding à la fin du stream assistant (conditionnel) | `messagesContainerRef` (= container) |
| **useChatFullscreenEffects** | Reset padding au changement de session ; listener infinite scroll | `messagesContainerRef` |
| **useChatFullscreenUIState** | Scroll vers le bas à l’ouverture du clavier (mobile) | `messagesContainerRef` |
| **useInfiniteMessages** | Préservation de la position de scroll lors du “load more” | `scrollTopBefore + heightDiff` |

### 1.2 Flux principaux

- **Envoi d’un message user**  
  `useChatScroll` (useEffect sur `messages`) → après 100 ms → `scrollToBottom()` → ajout d’un **gros** `paddingBottom` (75–81 % du viewport) sur le container → `scrollTo({ behavior: 'smooth' })`.  
  Le padding **n’est jamais retiré** par ce hook.

- **Fin du stream assistant**  
  `handleComplete` dans ChatFullscreenV2 → en rAF, mesure du dernier message assistant.  
  Si hauteur > 60 % du viewport → `container.style.paddingBottom = ''`.  
  Sinon → padding **conservé** (effet de bord durable).

- **Changement de session**  
  `useChatFullscreenEffects` → reset animation + `messagesContainerRef.current.style.paddingBottom = ''`.  
  Puis `triggerFadeIn` (useChatAnimations) : padding 40px sur `.chatgpt-messages`, scroll instantané, retries (200 ms, 10×), restore padding, fade-in.

- **Ouverture / fermeture canva**  
  `useChatScroll` (useEffect sur `layoutTrigger`) → scroll instantané en boucle de stabilité (100 ms × 8) vers le bas, **sans** modifier le padding.

- **Load more (infinite scroll)**  
  Listener `scroll` sur le container : si `scrollTop < 50` → `loadMoreMessages()`.  
  `loadMoreMessages` préserve la position avec `scrollTop = scrollTopBefore + heightDiff`.

---

## 2. Effets indésirables identifiés

### 2.1 Padding persistant et incohérent

- **Problème**  
  Après un message user, un padding énorme (75–81 % viewport) est appliqué et **reste** sauf si :
  - on change de session, ou
  - le dernier message assistant est “long” (> 60 % viewport).

- **Conséquences**  
  - Grande zone vide en bas de la conversation.  
  - Comportement différent selon que la réponse est courte ou longue (padding gardé vs reset).  
  - Impression de “scroll qui ne finit pas” ou “page trop longue”.

### 2.2 Deux sources de vérité pour le padding

- **useChatScroll** modifie `container.style.paddingBottom` (`.chatgpt-messages-container`).  
- **useChatAnimations** modifie `messagesContainer.style.paddingBottom` (`.chatgpt-messages`).

Deux éléments différents, deux objectifs (remonter le message user vs stabiliser le fade-in). Risque de confusion et d’interactions imprévisibles (ex. ouverture canva + session qui charge).

### 2.3 Saccade possible au moment du scroll “user”

- On fait `container.style.paddingBottom = grande valeur` puis, en `requestAnimationFrame`, `scrollTo({ behavior: 'smooth' })`.  
- La hauteur scrollable change **avant** le smooth scroll ; selon le navigateur et le timing, l’animation peut donner une sensation de “saut” ou de contenu qui remonte par à-coups.

### 2.4 Délais et seuils arbitraires

- 100 ms avant d’appeler `scrollToBottom()` (nouveau message user).  
- 50 px pour déclencher le load more.  
- 60 % viewport pour “message long” et reset du padding.  
- 75 % / 81 % viewport pour le padding (ratios différents canva vs normal).  
- useChatAnimations : 300 ms initial, 200 ms × 10 retries.  
- useChatScroll layout : 100 ms × 8 retries.

Tout est en “magic numbers”, ce qui rend le comportement difficile à raisonner et à tuner.

### 2.5 Infinite scroll : pas d’hystérésis

- Un seul seuil : `scrollTop < 50` → load more.  
- Si l’utilisateur reste juste au-dessus (ex. 55 px) puis redescend à 45 px, on peut déclencher un second load more dès la fin du premier.  
- `loadingRef` évite les appels **concurrents**, mais pas les appels rapprochés une fois le premier chargement terminé.  
- Cas limite : beaucoup de petits messages, `heightDiff` faible → après insert, `scrollTop` peut rester < 50 → re-trigger immédiat.

### 2.6 Pas de “scroll to bottom” pendant le stream assistant

- L’autoscroll ne se déclenche qu’à l’**arrivée d’un message user**.  
- Pendant que l’assistant stream, aucun scroll automatique : si l’utilisateur a scrollé un peu vers le haut, il ne suit pas la réponse.  
- Choix assumé (éviter de tirer le scroll pendant la frappe) mais à documenter ; certains peuvent s’attendre à un suivi du stream.

---

## 3. Ce qui fonctionne bien

- **Préservation du scroll au load more** : `scrollTopBefore + heightDiff` évite le saut au début de la liste.  
- **Reset au changement de session** : padding et état d’animation sont bien nettoyés.  
- **Clavier mobile** : scroll vers le bas au focus clavier (useChatFullscreenUIState) pour garder le champ visible.  
- **Layout canva** : réaction au changement de layout avec scroll immédiat + boucle de stabilité.  
- **Guard sur loadMoreMessages** : `loadingRef` + `hasMore` évitent les appels concurrents.

---

## 4. Recommandations

### 4.1 (Priorité haute) Donner une durée de vie claire au padding “user”

- **Option A – Reset systématique à la fin du stream**  
  À la fin du stream assistant (handleComplete), **toujours** remettre `paddingBottom` à une valeur raisonnable (ex. 0 ou 40 px), sans condition sur la hauteur du message.  
  → Comportement prévisible, plus de grande zone vide persistante.

- **Option B – Padding temporaire avec timeout**  
  Après avoir appliqué le gros padding et fait le smooth scroll, programmer un reset du padding après la fin du stream **ou** après un délai max (ex. 2–3 s après la fin du stream).  
  → Même objectif qu’A, avec une marge si le message assistant met du temps à s’afficher.

- **Option C – Abandonner le gros padding**  
  Ne plus “remonter” le message user avec un padding géant. À la place : `scrollIntoView` sur le dernier message user (ou sur un élément sentinelle en bas) avec `block: 'start'` ou `block: 'center'`.  
  → Plus de zone vide artificielle ; le dernier message user peut ne plus être tout en haut sous le header selon la taille de l’écran.

Recommandation courte : **A ou B** pour corriger l’effet indésirable tout en gardant l’intention “message user bien visible” ; **C** si tu préfères un comportement plus classique “bas de la liste”.

### 4.2 (Priorité haute) Une seule source de vérité pour le padding

- Centraliser toute la logique de `paddingBottom` dans un seul endroit (ex. useChatScroll ou un petit hook dédié `useChatScrollPadding`).  
- useChatAnimations ne devrait que lire/restaurer un padding “neutre” (ex. 40 px) pour le fade-in, sans introduire une deuxième politique de padding.  
- Documenter clairement : “padding du container = uniquement pour le scroll après message user (et éventuellement pour le fade-in avec une valeur fixe)”.

### 4.3 (Priorité moyenne) Constantes nommées

- Extraire les magic numbers dans des constantes (ex. `SCROLL_DELAY_MS`, `LOAD_MORE_THRESHOLD_PX`, `PADDING_RATIO_NORMAL`, `PADDING_RATIO_CANVA`, `LONG_MESSAGE_VIEWPORT_RATIO`, `LAYOUT_SCROLL_RETRY_MS`, etc.).  
- Facilite le réglage et la revue.

### 4.4 (Priorité moyenne) Hystérésis pour le load more

- Seuil “entrée” : déclencher load more quand `scrollTop < 50`.  
- Seuil “sortie” : ne pas redéclencher tant que l’utilisateur n’a pas remonté au-dessus d’un seuil plus haut (ex. 120 px).  
- Évite les déclenchements multiples quand l’utilisateur reste autour de 50 px ou quand le layout bouge légèrement.

### 4.5 (Priorité basse) Option “suivre le stream”

- Si besoin : option (préférence ou mode) pour faire un scroll automatique vers le bas pendant le stream assistant (par ex. quand le contenu dépasse la zone visible en bas).  
- À implémenter sans casser le comportement actuel (ex. flag `autoScrollDuringStream` désactivé par défaut).

---

## 5. Résumé

| Problème | Impact | Piste de fix |
|----------|--------|---------------|
| Padding énorme jamais (ou conditionnellement) retiré | Zone vide en bas, incohérence | Reset padding en fin de stream (ou timeout) ; ou supprimer le gros padding (scrollIntoView) |
| Deux endroits gèrent le padding | Bugs / comportement flou | Un seul responsable du padding (hook ou composant) |
| Magic numbers | Maintenance, réglage | Constantes nommées |
| Load more sans hystérésis | Risque de loads rapprochés | Seuil bas (50) + seuil haut (ex. 120) |
| Pas de suivi pendant le stream | Attente possible “scroll qui suit” | Optionnel : option + scroll discret pendant le stream |

En priorité : **clarifier la durée de vie du padding** (recommandations 4.1 et 4.2). Le reste améliore la robustesse et la maintenabilité sans changer le ressenti utilisateur autant que le padding persistant.

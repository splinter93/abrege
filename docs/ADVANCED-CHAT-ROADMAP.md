# Advanced Chat Roadmap

Document de référence listant les **problèmes identifiés** sur le chat par rapport aux meilleurs produits du marché (ChatGPT, Claude, etc.). Ces points constituent une roadmap d’amélioration pour se rapprocher du niveau industriel.

---

## 1. Robustesse et gestion des erreurs

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **Pas d’ErrorBoundary autour du chat** | Une erreur non catchée dans un composant chat peut faire tomber toute la vue. Les autres zones (settings, dossiers) ont un ErrorBoundary ; la page chat et `ChatFullscreenV2` non. | Haute |
| **Rate limit (429) invisible côté UI** | L’API renvoie 429 et des headers `X-RateLimit-*` / `Retry-After`, mais le client n’affiche pas de message « Trop de requêtes », ni de désactivation temporaire du bouton d’envoi avec compte à rebours. | Haute |
| **StreamErrorDisplay sans fermeture** | Le composant reçoit `onDismiss` en prop mais n’affiche pas de bouton « Fermer » / « Ignorer » ; seulement Copier et Relancer. L’utilisateur ne peut pas masquer l’erreur sans relancer. | Moyenne |
| **Retry limité** | Retry automatique existe pour le fetch du stream (NetworkRetryService) et partiellement pour `tool_use_failed` ; pas de stratégie UI claire pour les 5xx ou autres erreurs réseau. | Moyenne |

---

## 2. Fonctionnalités manquantes ou partielles

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **Pas de recherche full-text dans les messages** | La sidebar permet de rechercher par **nom de conversation** uniquement. Aucune recherche dans le **contenu** des messages (comme dans ChatGPT / Claude). | Basse |
| **Pas de gestion offline** | Aucune détection de `navigator.onLine`, pas de file d’attente des messages, pas de message « Vous êtes hors ligne ». L’expérience en perte de connexion est non gérée. | Moyenne |
| **Pas de bouton « Arrêter » dédié pendant le stream** | L’arrêt est possible via `abortStream` / comportement du bouton d’envoi en mode « stop », mais aucun bouton dédié « Arrêter la génération » toujours visible pendant le stream, comme chez les leaders. | Moyenne |

---

## 3. Mobile et clavier

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **`keyboardInset` non utilisé** | La valeur est calculée (ex. pour le clavier mobile) mais **n’est pas utilisée** dans `ChatInputContainer` / `ChatMessagesArea` pour le layout. Risque de champ masqué ou de scroll incorrect. | Haute |
| **Comportement Android** | `resetRootScroll` sur Android peut provoquer des saccades ; stratégie clavier (adjustResize, etc.) documentée dans `AUDIT-KEYBOARD-ANDROID-CHAT.md` mais à valider en conditions réelles. | Moyenne |

---

## 4. Accessibilité

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **Pas de région live pour le streaming** | Aucun `aria-live` (polite ou assertive) pour annoncer aux lecteurs d’écran l’arrivée d’un nouveau message ou le début / fin du streaming. | Moyenne |
| **Couverture a11y** | ARIA et `aria-label` présents sur de nombreux contrôles ; pas d’audit exhaustif (focus, ordre de tab, contraste, annonces dynamiques). | Basse |

---

## 5. Qualité de code et maintenabilité

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **Taille de `ChatFullscreenV2`** | Fichier encore ~755 lignes ; objectif de refactoring documenté (sous 300 lignes) dans `PRIORITES-REFACTORING-GROS-FICHIERS.md`. | Moyenne |
| **Tests des chemins d’erreur** | Tests d’intégration présents sur `ChatFullscreenV2` et sur edit/regenerate ; pas de couverture explicite des scénarios d’erreur (stream, retry, rate limit, offline). | Moyenne |

---

## 6. Synthèse des priorités

### À traiter en priorité (impact élevé, effort raisonnable)
- Ajouter un **ErrorBoundary** autour de la page chat ou de `ChatFullscreenV2`.
- Afficher en **UI le rate limit (429)** : message explicite + désactivation temporaire du bouton d’envoi (éventuellement avec compte à rebours).

### Ensuite
- Utiliser **`keyboardInset`** pour le layout mobile (ou corriger le comportement clavier).
- Bouton **« Arrêter »** visible pendant le stream.
- Bouton **« Fermer »** sur `StreamErrorDisplay`.
- **Gestion offline** minimale (détection + message).
- **`aria-live`** pour les annonces de nouveaux messages / streaming.

### Plus tard
- **Recherche full-text** dans le contenu des messages.
- **Refactoring** de `ChatFullscreenV2` (réduction de la taille).
- **Tests** ciblés sur les chemins d’erreur et l’accessibilité.

---

## Références dans le codebase

- Composants : `src/components/chat/` (ChatFullscreenV2, ChatMessagesArea, ChatInputContainer, SidebarUltraClean, StreamErrorDisplay, EnhancedMarkdownMessage, ChatMessage, BubbleButtons).
- Hooks : `src/hooks/chat/` (useStreamingState, useChatMessageActions, useChatFullscreenEffects), `useInfiniteMessages.ts`, `useChatResponse.ts`.
- Store : `src/store/useChatStore.ts`.
- Mobile : `docs/mobile/AUDIT-KEYBOARD-ANDROID-CHAT.md`, `docs/BREAKPOINT_768_CHAT.md`.

---

*Document généré à partir de l’audit du chat (comparaison aux meilleurs chats IA du marché). Dernière mise à jour : mars 2025.*

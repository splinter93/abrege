# Plan d’Audit & Correctifs Édition Chat

1. Stabiliser l’historique côté front

- Audit de `useChatMessageActions` et `ChatFullscreenV2` pour éliminer la fermeture sur `infiniteMessages` (p.ex. passer par un ref ou re-fetch structuré).
- Conserver les messages déjà chargés avant l’édition (snapshot filtré) pour éviter la perte d’historique lors du reload.
- Vérifier effets collatéraux sur `chatMessageSendingService.prepare` et `sessionSyncService`.

2. Sécuriser la séquence suppression → reload → resend

- Garantir que `loadInitialMessages` retourne un historique complet avant d’appeler `sendMessage` (attendre la promesse, gérer erreurs/retry).
- Injecter explicitement la version rechargée dans `sendMessage` ou provide `getCurrentMessages()` pour éviter les messages fantômes.
- Ajouter logs/guards pour l’échec de reload (ne pas relancer sans historique cohérent).

3. Fiabiliser la résolution d’ID et tests

- Renforcer `ChatMessageEditService.findEditedMessage` (logs + fallback sur ID DB dès qu’il remonte via `addMessageAndSync`).
- Mettre en place tests ciblés (unitaires sur hook, intégration chaînée) couvrant édition avec réponses multiples.
- Vérifier que le RPC `/messages/delete-after` reste idempotent et que la timeline streaming est réinitialisée proprement.

4. Vérifications

- `read_lints` sur fichiers modifiés; scenarios manuels : édition message récent/ancien, échec réseau reload.
- Tester régénération LLM pour confirmer que seuls les messages attendus persistent.

### To-dos

- [x] Refactorer la gestion d’historique côté front pour éviter closures et pertes de messages
- [x] Fiabiliser la séquence delete → reload → resend et gestion d’erreur
- [x] Améliorer la résolution d’ID et ajouter tests ciblés


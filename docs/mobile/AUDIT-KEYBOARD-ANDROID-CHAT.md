# Audit — Gestion du clavier Android sur le chat mobile

**Date :** mars 2026  
**Objectif :** Auditer l'ouverture du clavier natif Android (PWA + Capacitor) dans le chat, identifier les bugs et incohérences.

---

## 1. Verdict global

**⚠️ Implémentation fragile avec plusieurs problèmes identifiés.**

La gestion du clavier est éclatée entre plusieurs fichiers, avec des stratégies différentes selon la plateforme (Android natif vs PWA vs iOS). Sur Android Capacitor, plusieurs choix peuvent causer des bugs d'interface (saccades, input masqué, scroll parasite).

---

## 2. Architecture actuelle

### 2.1 Flux par plateforme

| Plateforme | Détection clavier | keyboardInset | Positionnement | Scroll au focus |
|------------|------------------|---------------|----------------|----------------|
| **Android Capacitor** | Aucune (early return) | 0 | adjustResize natif | ❌ Non |
| **iOS Capacitor** | @capacitor/keyboard | Oui | --keyboard-height (CSS) | ✅ Oui |
| **PWA / Browser mobile** | visualViewport | Oui | — | ✅ Oui |

### 2.2 Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `android/app/src/main/AndroidManifest.xml` | `windowSoftInputMode="adjustResize"` |
| `capacitor.config.ts` | `Keyboard.resizeOnFullScreen: false` |
| `CapacitorInit.tsx` | Listeners clavier, **resetRootScroll** sur Android |
| `useChatFullscreenUIState.ts` | Détection keyboardInset (sauf Android), scroll-to-bottom |
| `pwa-mobile.css` | Layout Capacitor, `--keyboard-height` (iOS only) |
| `ChatInputContainer.tsx` | Reçoit keyboardInset (non utilisé) |
| `ChatMessagesArea.tsx` | Reçoit keyboardInset (non utilisé) |

---

## 3. Problèmes identifiés

### 3.1 🔴 resetRootScroll — Risque majeur (CapacitorInit.tsx)

```typescript
// Lignes 36-46
const resetRootScroll = () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};
// Appelé sur keyboardWillShow, keyboardDidShow, keyboardWillHide, keyboardDidHide
```

**Problème :** Sur Android avec `adjustResize`, quand le clavier s'ouvre, la WebView se redimensionne. Le navigateur peut scroller le document pour garder le textarea focalisé visible. En forçant `scrollTo(0, 0)` à chaque événement clavier, on peut :

- **Faire disparaître l'input** du viewport (scroll vers le haut alors que l'input est en bas)
- **Créer des saccades** visuelles (le document scroll, puis on force 0, puis Android re-scroll…)
- **Combattre le comportement natif** d'Android qui tente de garder l'input visible

**Intention d'origine :** "Garder le header réellement fixe" — éviter que le header remonte quand le clavier ouvre. Mais avec `html/body { position: fixed; overflow: hidden }` sur `.chat-page`, le document ne devrait pas scroller. Le `resetRootScroll` est peut-être redondant ou contre-productif.

**Recommandation :** Tester la suppression de `resetRootScroll` sur Android. Si le header bouge sans lui, investiguer une solution ciblée (ex. `scrollIntoView` du container chat au lieu de forcer 0,0).

---

### 3.2 🟠 keyboardInset — Code mort

`keyboardInset` est calculé dans `useChatFullscreenUIState` (iOS + PWA) et passé à :

- `ChatInputContainer` (prop `keyboardInset`)
- `ChatMessagesArea` (prop `keyboardInset`)

**Aucun des deux composants n'utilise cette valeur** pour le positionnement (padding, margin, transform). Elle est reçue puis ignorée.

**Impact :** Sur PWA mobile (Chrome Android, Safari iOS), le clavier est détecté via `visualViewport`, `keyboardInset` est mis à jour, mais le layout ne change pas. L'input et les messages ne sont pas repoussés par un padding équivalent.

**Recommandation :** Soit implémenter l'usage (`paddingBottom: keyboardInset` sur le container input / messages), soit supprimer la prop pour éviter la confusion.

---

### 3.3 🟠 Pas de scroll-to-bottom sur Android (useChatFullscreenUIState.ts)

```typescript
// Lignes 114-116
if (isNative && platform === 'android') {
  return;  // Aucun listener, pas de scrollMessagesToBottom
}
```

Sur Android Capacitor, quand le clavier s'ouvre, `scrollMessagesToBottom()` n'est jamais appelé. Sur iOS et PWA, il l'est pour garder le dernier message visible.

**Impact :** Si l'utilisateur a scrollé vers le haut pour lire, puis tape dans l'input, le clavier ouvre et le viewport rétrécit. Sans scroll-to-bottom, la zone visible peut rester "en haut" des messages, avec l'input qui disparaît ou une zone de lecture incohérente.

**Recommandation :** Ajouter un listener `keyboardWillShow` / `keyboardDidShow` sur Android uniquement pour appeler `scrollMessagesToBottom()`, sans toucher à `keyboardInset` (car adjustResize gère le layout).

---

### 3.4 🟡 Layout fixe + adjustResize — Interaction à vérifier

Structure actuelle :

- `html.capacitor-native.chat-page`, `body` : `position: fixed`, `inset: 0`, `overflow: hidden`
- `.chatgpt-container` : flex, `padding-top: 0` sur Android (header en flux)
- `.chatgpt-main-chat` : flex column
- `.chatgpt-messages-container` : `flex: 1`, overflow-y auto
- `.chatgpt-chat-bottom` : `position: absolute` (chat-clean.css)

Avec `adjustResize`, la hauteur de la WebView diminue quand le clavier s'ouvre. Un container en `position: fixed` avec `height: 100%` devrait suivre. Mais `.chatgpt-chat-bottom` en `position: absolute` est positionné par rapport à `.chatgpt-main-chat`. Si le parent ne se redimensionne pas correctement, l'input peut se retrouver sous le clavier ou mal aligné.

**Recommandation :** Tester sur device réel : ouverture du clavier avec input en bas, en milieu de liste, après scroll. Vérifier que l'input reste visible et que les messages scrollent correctement.

---

### 3.5 🟡 PWA standalone (Chrome Android) — Pas de --keyboard-height

Sur PWA en mode standalone (hors Capacitor), le clavier est géré par `visualViewport` dans `useChatFullscreenUIState`. `keyboardInset` est mis à jour, mais :

- Aucune variable CSS `--keyboard-height` n'est injectée (c'est fait uniquement dans CapacitorInit pour iOS)
- `keyboardInset` n'est pas utilisé dans les styles

**Impact :** En PWA Chrome Android, le clavier peut recouvrir l'input ou créer des zones vides bizarres, car aucun ajustement de layout n'est appliqué.

---

## 4. Synthèse des actions recommandées

| Priorité | Action |
|----------|--------|
| 🔴 Haute | Tester la suppression ou l'ajustement de `resetRootScroll` sur Android |
| 🟠 Moyenne | Implémenter l'usage de `keyboardInset` (padding) ou le retirer |
| 🟠 Moyenne | Ajouter `scrollMessagesToBottom` au keyboard show sur Android |
| 🟡 Basse | Valider le layout flex + absolute avec adjustResize sur device réel |
| 🟡 Basse | Harmoniser PWA standalone (injection `--keyboard-height` ou usage de `keyboardInset`) |

---

## 5. Références

- `docs/mobile/AUDIT-CAPACITOR-BASE.md` — Audit base Capacitor
- `docs/guides/CHAT-SCROLL-BEHAVIOR.md` — Comportement du scroll chat
- `@capacitor/keyboard` — [Documentation](https://capacitorjs.com/docs/apis/keyboard)
- Android `windowSoftInputMode` : [adjustResize vs adjustPan](https://developer.android.com/develop/ui/views/layout/soft-input)

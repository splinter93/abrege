# Audit Capacitor & Problèmes majeurs résolus

**Date :** février 2026  
**Objectif :** (1) Vérifier que le socle Capacitor est propre et sain pour continuer (chat, design, features). (2) Documenter les gros problèmes rencontrés et leurs correctifs — notamment l’auth Google et le bug de re-renders.

---

## Partie 1 — Audit du socle Capacitor

### 1.1 Verdict global

**✅ Base de travail solide et propre.**  
Le socle Capacitor est en place : config claire (prod par défaut), Android à jour, intégration Next.js sans couplage excessif, OAuth Google + deep links fonctionnels via injection native (`evaluateJavascript`), UX mobile (clavier, safe areas, Status Bar) traitée. Le chat et le reste de l’app sont utilisables sur mobile. On peut continuer à peaufiner features et design en confiance.

Quelques points d’attention (non bloquants) sont listés en fin d’audit.

---

### 1.2 Configuration

| Élément | État | Détail |
|--------|------|--------|
| **capacitor.config.ts** | ✅ | `appId`, `appName`, `webDir`, `server.url` : **prod par défaut** (`https://www.scrivia.app`) ; dev local = `CAPACITOR_SERVER_URL=http://10.0.2.2:3000` avant `cap sync`. |
| **allowNavigation** | ✅ | `scrivia.app`, `*.scrivia.app`, Supabase, Google (accounts.google.com, *.google.com). |
| **Status Bar** | ✅ | `DARK`, `overlaysWebView: true`, `backgroundColor: '#000000'`. |
| **Scripts npm** | ✅ | `cap:sync`, `cap:sync:prod`, `cap:run:android`, `cap:run:android:prod`. |

---

### 1.3 Projet Android

| Élément | État | Détail |
|--------|------|--------|
| **MainActivity** | ✅ | `BridgeActivity` ; `OpenInBrowserPlugin` enregistré ; **deep link injecté via `onNewIntent` + `evaluateJavascript`** (bypass du bridge Capacitor pour les URLs distantes). |
| **AndroidManifest** | ✅ | Deep link `scrivia://callback` ; `singleTask` ; `windowSoftInputMode="adjustResize"` ; permissions INTERNET, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS. |
| **OpenInBrowserPlugin** | ✅ | `openUrl()` pour ouvrir OAuth dans Chrome ; `shouldOverrideLoad` pour intercepter navigation vers accounts.google.com / Supabase auth. |

---

### 1.4 Intégration Next.js / WebView

| Élément | État | Détail |
|--------|------|--------|
| **Chargement** | ✅ | App chargée via **URL distante** (`server.url`) ; une seule source de vérité (déploiement web). |
| **Détection plateforme** | ✅ | `Capacitor.isNativePlatform()` + imports dynamiques ; pas d’impact SSR. |
| **CapacitorInit** | ✅ | Un seul composant global (layout) qui appelle `useCapacitorDeepLink`. |

---

### 1.5 Auth / OAuth (état actuel)

| Élément | État | Détail |
|--------|------|--------|
| **Flux natif** | ✅ | `useOAuth` : `signInWithOAuth` + `skipBrowserRedirect` + `redirectTo: scrivia://callback` ; ouverture URL via `OpenInBrowser.openUrl()` puis fallbacks (@capacitor/browser, InAppBrowser, `window.location.href`). |
| **Réception du callback** | ✅ | **Mécanisme principal :** `MainActivity.onNewIntent` → `evaluateJavascript` → `window.__scriviaDeepLink(url)` ou `window.__scriviaDeepLinkPending`. **Secondaire :** `App.addListener('appUrlOpen')` et `getLaunchUrl()` si le bridge est dispo (best-effort sur URL distante). |
| **Traitement** | ✅ | `useCapacitorDeepLink` : PKCE `exchangeCodeForSession` ou implicit `setSession` ; `Browser.close()` ; redirection `/chat` uniquement après callback OAuth (flag `pendingRedirectToChat`), pas à chaque SIGNED_IN. |
| **Supabase** | ✅ | Redirect URL exacte : `scrivia://callback`. Client : `flowType: 'pkce'`, `detectSessionInUrl: true`. |

---

### 1.6 Chat & UX mobile

| Élément | État | Détail |
|--------|------|--------|
| **Clavier** | ✅ | `@capacitor/keyboard` (natif) dans `useChatFullscreenUIState` ; fallback `visualViewport` sur web ; `--keyboard-inset` pour l’input. |
| **Safe areas** | ✅ | `env(safe-area-inset-*)`, overlay zone notification (layout), fond noir cohérent. |
| **Chat** | ✅ | Même code que la PWA ; pas de régression ; utilisable sur l’app mobile. |

---

### 1.7 Points d’attention (non bloquants)

- **URL prod :** Par défaut la config pointe vers `https://www.scrivia.app`. Après un `cap sync` sans env, l’APK charge la prod. Pour dev local : `CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npx cap sync android`.
- **Scripts `cap:sync:prod` / `cap:run:android:prod` :** Ils utilisent `CAPACITOR_SERVER_URL=https://scrivia.app` (sans www). Pour rester cohérent avec la config par défaut (www), on peut aligner ces scripts sur `https://www.scrivia.app` si besoin.
- **iOS :** Pas de projet iOS ; à prévoir si besoin (Associated Domains, scheme, OAuth).

---

### 1.8 Synthèse audit

| Critère | Verdict |
|---------|--------|
| Config Capacitor | ✅ Propre ; prod par défaut |
| Projet Android | ✅ Deep link par evaluateJavascript ; OpenInBrowser |
| Intégration Next.js | ✅ Non intrusive |
| OAuth + deep link | ✅ Fonctionnel (injection native + fallbacks) |
| Chat / UX mobile | ✅ Saine, base pour continuer |
| Dette | ⚠️ Mineure (alignement scripts prod si souhaité) |

**Conclusion :** Socle propre et sain pour continuer à peaufiner features et design.

---

## Partie 2 — Problèmes majeurs rencontrés et correctifs

### 2.1 Auth Google (OAuth) sur l’app Capacitor — galère principale

L’authentification Google sur l’app Android (WebView chargeant une URL distante) a posé une série de problèmes. Voici **les problèmes exacts** et **comment ils ont été corrigés**.

---

#### Problème 1 : Écran noir au lancement

- **Symptôme :** L’app s’ouvre avec un écran noir.
- **Cause :** L’APK chargeait `http://10.0.2.2:3000` (serveur de dev local). Sur un téléphone physique, rien n’écoute sur cette adresse → la WebView ne reçoit rien → écran noir.
- **Correctif :**  
  - Dans `capacitor.config.ts`, la **valeur par défaut** de `server.url` a été passée à la prod : `process.env.CAPACITOR_SERVER_URL || 'https://www.scrivia.app'`.  
  - Sans variable d’environnement, `cap sync` écrit donc l’URL prod dans `android/app/src/main/assets/capacitor.config.json`.  
  - Pour le dev local : `CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npx cap sync android` avant de lancer l’app.
- **À retenir :** Toujours rebuilder l’APK après un `cap sync` si on change d’environnement (dev vs prod). Sur device physique, l’APK doit pointer vers une URL accessible (prod ou IP de la machine en dev).

---

#### Problème 2 : Plugin App « not implemented on android »

- **Symptôme :** En log : `[DeepLink] Erreur init listener: Error: "App" plugin is not implemented on android`. Le listener `appUrlOpen` ne s’enregistrait pas.
- **Cause :** Sur une app qui charge une **URL distante** (https://www.scrivia.app), le bridge Capacitor (WebMessagePort / native-bridge.js) n’est pas fiable : il peut ne pas s’injecter ou s’injecter trop tard. Les appels au plugin `App` (ex. `App.addListener`) échouent alors côté JS avec « not implemented ».
- **Correctif (côté natif) :**  
  - Ne plus dépendre du bridge pour recevoir le deep link.  
  - Dans **MainActivity.java**, sur réception du deep link dans `onNewIntent`, on injecte l’URL directement dans la WebView avec **`evaluateJavascript`** :  
    - Si `window.__scriviaDeepLink` est une fonction → on l’appelle avec l’URL.  
    - Sinon → on stocke l’URL dans `window.__scriviaDeepLinkPending` pour que le hook JS la consomme au montage.
- **Correctif (côté JS) :**  
  - Dans **useCapacitorDeepLink** : au montage, consommation de `__scriviaDeepLinkPending` si présent, et enregistrement de `window.__scriviaDeepLink` pour les appels futurs.  
  - Le bridge Capacitor (`App.addListener`, `getLaunchUrl`) reste utilisé en **best-effort** (fallback) ; s’il échoue (« not implemented »), le mécanisme principal (injection depuis MainActivity) assure le flux OAuth.
- **À retenir :** Avec chargement par URL distante, le bridge plugin n’est pas garanti. Pour le deep link OAuth, un passage direct natif → JS via `evaluateJavascript` est la solution fiable.

---

#### Problème 3 : `window.Capacitor.triggerEvent is not a function`

- **Symptôme :** En log (souvent sur la page `/auth`) : `Uncaught TypeError: window.Capacitor.triggerEvent is not a function`.
- **Cause :** Le code **natif** Android (Capacitor) appelle `window.Capacitor.triggerEvent(...)` pour notifier des événements (pause, resume, appUrlOpen, etc.). Cette fonction est normalement ajoutée par **native-bridge.js**, qui n’est pas exécuté (ou pas à temps) quand la page est chargée depuis une URL distante. Du coup `window.Capacitor` existe (créé par le bundle JS @capacitor/core) mais sans `triggerEvent` → erreur au moment où le natif fait l’appel.
- **Correctif :**  
  - Une première approche (polyfill no-op de `triggerEvent`) a été évitée pour ne pas masquer le vrai problème (bridge pas prêt).  
  - La solution définitive a été de **ne plus dépendre du bridge** pour le deep link (voir Problème 2) : l’injection via `evaluateJavascript` dans `onNewIntent` ne fait pas appel à `triggerEvent`. L’erreur peut encore apparaître brièvement si le natif déclenche un autre événement (ex. pause) avant que le bridge soit prêt ; dans ce cas c’est un effet de bord connu et non bloquant pour OAuth.

---

#### Problème 4 : Erreurs TypeScript / build Vercel (Capacitor)

- **Symptôme :** Le build Next (Vercel) échouait avec des erreurs de type liées à `@capacitor/app` dans `useCapacitorDeepLink.ts` (ex. `AppPlugin` non assignable, ou `App` utilisé comme type alors que c’est une valeur).
- **Cause :** Utilisation du type exporté par `@capacitor/app` dans un contexte où TypeScript (ou l’environnement de build) le résolvait comme valeur ; ou typage manuel trop strict (ex. `addListener(event: string, ...)`) incompatible avec les surcharges du vrai `AppPlugin`.
- **Correctifs :**  
  - Définition d’une **interface locale** `AppPluginRef` avec la forme minimale utilisée (`addListener(event: 'appUrlOpen', ...)`, `getLaunchUrl()`).  
  - Assignation avec **assertion de type** : `appMod.App as AppPluginRef`.  
  - Pour l’accès à `window.Capacitor` (détection du bridge) : utilisation de `(window as unknown as Record<string, unknown>)['Capacitor']` pour éviter les erreurs de type sur `Window` (build Vercel strict).
- **À retenir :** En environnement strict (Vercel), éviter de dépendre des types « value » des packages Capacitor pour des variables ; préférer une interface locale + cast.

---

#### Problème 5 : Redirect URL Supabase

- **Symptôme :** Après connexion Google, l’app ne revenait pas dans le WebView ou le code n’était pas reçu.
- **Cause :** Redirect URL configurée dans Supabase différente du scheme utilisé par l’app (ex. slash final, ou mauvais scheme).
- **Correctif :** Dans Supabase Dashboard → Auth → URL Configuration → **Redirect URLs**, ajouter **exactement** : `scrivia://callback` (sans slash final, sans chemin supplémentaire). C’est ce scheme/host qui est déclaré dans l’AndroidManifest (`scrivia` / `callback`).
- **À retenir :** La Redirect URL doit correspondre exactement au deep link déclaré dans le manifest et utilisé dans `redirectTo` côté client.

---

### 2.2 Bug : re-renders / rechargement de page (desktop et mobile)

- **Symptôme :** L’app (web et mobile) se rechargeait complètement (navigation vers `/chat`) à chaque retour sur l’onglet/fenêtre, ou déclenchait des re-renders intempestifs.
- **Cause :** Dans un commit (e09aba08), le listener **`onAuthStateChange`** qui réagit à `SIGNED_IN` en faisant `window.location.assign('/chat')` avait été placé **en dehors** du guard `isNativePlatform()`. Ce listener s’exécutait donc aussi sur **desktop**. Or Supabase émet `SIGNED_IN` dans plusieurs situations : restauration de session, refresh de token, etc. À chaque fois que l’utilisateur revenait sur l’onglet (ou que le token était rafraîchi), le listener déclenchait `window.location.assign('/chat')` → rechargement complet de la page.
- **Correctif :** Tout le bloc contenant **`onAuthStateChange`** (et l’enregistrement du listener `appUrlOpen` / traitement du deep link) a été déplacé **à l’intérieur** du guard `if (!Capacitor.isNativePlatform()) return;`. Sur desktop, le hook `useCapacitorDeepLink` ne fait plus rien. Sur Android/iOS, le comportement OAuth (redirection vers `/chat` **uniquement** après traitement d’un callback OAuth, via le flag `pendingRedirectToChat`) reste inchangé.
- **Vérification :** Revenir sur la fenêtre/onglet après connexion : l’app ne doit plus recharger toute seule.
- **À retenir :** Tout code qui réagit à `SIGNED_IN` par une navigation globale (`window.location.assign`) doit être restreint au contexte où c’est voulu (ici : uniquement natif, et uniquement après un callback OAuth traité).

---

## Partie 3 — Références rapides

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `capacitor.config.ts` | URL (prod par défaut), allowNavigation, Status Bar, Android. |
| `android/.../MainActivity.java` | OpenInBrowserPlugin ; `onNewIntent` → injection deep link (`__scriviaDeepLink` / `__scriviaDeepLinkPending`). |
| `android/.../OpenInBrowserPlugin.java` | Ouvrir une URL dans Chrome ; intercepter navigation vers Google/Supabase auth. |
| `src/hooks/useCapacitorDeepLink.ts` | Consommation du deep link (pending + handler global) ; `exchangeCodeForSession` / `setSession` ; redirection `/chat` uniquement après OAuth ; fallback bridge (App.addListener, getLaunchUrl). |
| `src/hooks/useOAuth.ts` | Détection natif ; `signInWithOAuth` + `redirectTo: scrivia://callback` ; ouverture URL (OpenInBrowser, Browser, InAppBrowser, window.location). |
| `src/components/CapacitorInit.tsx` | Montage unique de `useCapacitorDeepLink` dans le layout. |
| `src/utils/supabaseClientSingleton.ts` | Client Supabase : `flowType: 'pkce'`, `detectSessionInUrl: true`. |

### Commandes utiles

```bash
# Sync + run (prod par défaut)
npx cap sync android && npx cap run android

# Dev local (émulateur)
CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npx cap sync android
npx cap run android
```

### Supabase

- **Redirect URLs :** ajouter exactement `scrivia://callback`.

---

*Document mis à jour après résolution des problèmes d’auth Google et du bug de re-renders (février 2026).*

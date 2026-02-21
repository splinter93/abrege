# Audit — Base Capacitor Android (Scrivia)

**Date :** février 2026  
**Objectif :** Vérifier si la base est saine pour poursuivre les travaux (design, features, store).

---

## 1. Verdict global

**✅ Base de travail solide et propre.**  
Le socle Capacitor est bien posé : config claire, Android à jour, intégration Next.js sans couplage excessif, OAuth + deep links fonctionnels, UX mobile (clavier, safe areas, fond) traitée. On peut continuer à build dessus en confiance.

Quelques points d’attention et petites améliorations sont listés plus bas ; rien de bloquant.

---

## 2. Points forts

### 2.1 Configuration

| Élément | État | Détail |
|--------|------|--------|
| **capacitor.config.ts** | ✅ | `appId`, `appName`, `webDir`, `server.url` (env), `allowNavigation` (Supabase, Google), Status Bar (DARK, #000), `allowMixedContent`. |
| **Scripts npm** | ✅ | `cap:sync`, `cap:sync:prod`, `cap:run:android`, **`cap:run:android:prod`** (évite l’écrasement de l’URL prod). |
| **Workflow dev vs prod** | ✅ | Dev = `10.0.2.2:3000` ; prod = `CAPACITOR_SERVER_URL=https://scrivia.app` → pas de confusion. |

### 2.2 Projet Android

| Élément | État | Détail |
|--------|------|--------|
| **AndroidManifest** | ✅ | `INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` ; deep link `scrivia://callback` ; `windowSoftInputMode="adjustResize"` ; `singleTask` + `exported` corrects. |
| **MainActivity** | ✅ | `BridgeActivity` par défaut, pas de surcharge inutile. |
| **SDK** | ✅ | `minSdk 24`, `targetSdk 36` (variables.gradle). |
| **Thèmes** | ✅ | `values/styles.xml` et `values-v35/styles.xml` : `windowBackground` #000, status/nav bar #000. |
| **Versionnement** | ✅ | `android/` versionné (hors build, .gradle, .idea) ; `www` ignoré. |

### 2.3 Intégration Next.js / WebView

| Élément | État | Détail |
|--------|------|--------|
| **Modèle de chargement** | ✅ | App chargée via **URL distante** (`server.url`) ; pas de build statique Next → `www` ; déploiement web = une seule source de vérité. |
| **Détection plateforme** | ✅ | `Capacitor.isNativePlatform()` + imports dynamiques ; pas d’impact SSR. |
| **Composant global** | ✅ | `CapacitorInit` dans le layout, un seul endroit pour les listeners natifs (deep link). |
| **Hydration** | ✅ | `suppressHydrationWarning` sur `<html>` pour les styles safe-area injectés par Capacitor. |

### 2.4 Auth / OAuth

| Élément | État | Détail |
|--------|------|--------|
| **Flux natif** | ✅ | `useOAuth` : `signInWithOAuth` + `skipBrowserRedirect` + `redirectTo: scrivia://callback` ; ouverture URL via `Browser.open` ou **fallback `window.open`** si plugin non dispo. |
| **Deep link** | ✅ | `useCapacitorDeepLink` : `appUrlOpen` → PKCE `exchangeCodeForSession` ou implicit `setSession` → `router.replace('/chat')` ; `Browser.close()` dans un try/catch. |
| **Redirect Supabase** | ✅ | `scrivia://callback` à configurer côté Supabase (Auth → Redirect URLs). |

### 2.5 UX mobile

| Élément | État | Détail |
|--------|------|--------|
| **Clavier** | ✅ | `@capacitor/keyboard` (natif) + `visualViewport` (web) → `--keyboard-inset` ; input avec `bottom: var(--keyboard-inset)` ; `adjustResize` dans le manifest. |
| **Header** | ✅ | Header fixe + `margin-top` sur le content (mobile) ; pas de chevauchement barre de statut. |
| **Safe areas** | ✅ | Overlay `.pwa-status-bar-overlay` (zone notification) ; `env(safe-area-inset-*)` dans les CSS ; fond noir ciblé (`body:has(.chatgpt-container)` uniquement, pas de casse /auth). |
| **Micro** | ✅ | `RECORD_AUDIO` déclaré ; dialog système au premier usage Whisper. |

### 2.6 Plugins

| Plugin | Version | Usage |
|--------|---------|--------|
| `@capacitor/core` | ^8.1.0 | Détection plateforme, bridge. |
| `@capacitor/app` | ^8.0.1 | `appUrlOpen` (deep link). |
| `@capacitor/browser` | ^8.0.1 | OAuth (avec fallback `window.open`). |
| `@capacitor/keyboard` | ^8.0.0 | Hauteur clavier (input au-dessus du clavier). |
| `@capacitor/status-bar` | ^8.0.1 | Style DARK, fond #000. |

### 2.7 Documentation

| Fichier | Contenu |
|---------|--------|
| **docs/mobile/README.md** | Prérequis, ANDROID_HOME, workflow (sync, run, build APK), config, dépannage. |
| **docs/mobile/PLAN-APP-MOBILE.md** | Plan directeur, phases, structure, risques, prochaines actions. |

---

## 3. Points d’attention (non bloquants)

### 3.1 URL prod et build

- **À faire à chaque build pour le téléphone :** `npm run build` (Next) → déploiement sur scrivia.app → **`cap:sync:prod`** puis **`cap:run:android:prod`** (ou build depuis Android Studio). Si on utilise `cap:run:android` sans `:prod`, l’APK pointe vers `10.0.2.2:3000` → écran vide sur device physique.
- **Doc :** Mettre à jour **docs/mobile/README.md** pour recommander explicitement `cap:sync:prod` et `cap:run:android:prod` pour le device physique / prod.

### 3.2 Plugin Browser sur Android

- En chargeant depuis une URL distante, le bridge peut ne pas exposer le plugin Browser → erreur « Browser plugin is not implemented on android ».
- **Mitigation en place :** fallback `window.open(url, '_blank')` dans `useOAuth.ts` → OAuth reste utilisable.

### 3.3 Permissions runtime (Android 6+)

- `RECORD_AUDIO` est une permission dangereuse ; elle est déclarée dans le manifest. Sur les appareils récents, `getUserMedia` déclenche en général la demande système. Si un device ne la demande pas, envisager plus tard une demande explicite (ex. `@capacitor-community/permissions` ou équivalent).

### 3.4 Dossier `www/`

- `www` est dans `.gitignore` ; `cap sync` le remplit à partir de `webDir`. Avec `server.url` défini, le contenu de `www` n’est pas utilisé pour le chargement de l’app (tout vient de l’URL). Vérifier qu’un `index.html` minimal existe dans `www` pour que `cap sync` ne plaigne pas (ou que la config Capacitor soit cohérente avec l’absence de build statique).

### 3.5 iOS

- Pas de projet iOS pour l’instant. Si besoin plus tard : `npx cap add ios`, puis adapter deep link (Associated Domains / URL scheme) et OAuth.

---

## 4. Recommandations pour la suite

1. **Documenter le workflow prod** dans `docs/mobile/README.md` :  
   `build Next → deploy scrivia.app → cap:sync:prod → cap:run:android:prod` (ou build Android Studio).
2. **Garder** la stratégie « une codebase web + PWA + Capacitor », sans dupliquer l’UI ; les ajustements mobile restent dans des CSS/hooks dédiés (pwa-mobile, chat-mobile, useCapacitorDeepLink, useOAuth).
3. **Avant toute grosse feature mobile** : tester sur device réel (Android) après un sync prod, pour valider clavier, safe areas et OAuth.
4. **Play Store (quand le moment viendra)** : signing (keystore), icônes/splash déjà présents ; prévoir fiche store, politique de confidentialité, et éventuellement build release avec `minifyEnabled true` + ProGuard si besoin.

---

## 5. Synthèse

| Critère | Verdict |
|---------|--------|
| Config Capacitor | ✅ Propre, dev/prod clairs |
| Projet Android | ✅ À jour, permissions et deep link OK |
| Intégration Next.js | ✅ Non intrusive, chargement par URL |
| OAuth + deep link | ✅ Flux complet + fallback Browser |
| UX mobile (clavier, safe areas, fond) | ✅ Traitée |
| Documentation | ✅ README + plan directeur |
| Dette / risques | ⚠️ Mineurs (doc workflow prod, Browser fallback déjà en place) |

**Conclusion :** La base Capacitor est saine et prête pour poursuivre les travaux (design, nouvelles features, préparation store). Aucun refactor majeur nécessaire pour continuer à build dessus.

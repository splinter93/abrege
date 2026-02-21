# App mobile Scrivia (Capacitor Android)

Même design que la PWA, avec contrôle natif sur la barre de statut (header / notifications) et les safe areas. Projet isolé, pas de régression sur l’app web.

---

## Prérequis

- Node 20+
- Android Studio (pour émulateur ou device)
- JDK 17 (recommandé pour Capacitor 8)
- **Android SDK** : `ANDROID_HOME` ou `ANDROID_SDK_ROOT` doit pointer vers le SDK (voir ci‑dessous).

---

## Configuration de l’environnement Android

`npm run cap:run:android` utilise le SDK Android. Si tu as **ERR_SDK_NOT_FOUND**, définis le chemin du SDK :

**Sur macOS (Android Studio installé par défaut) :**

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
```

Pour que ce soit permanent, ajoute ces lignes dans `~/.zshrc` (ou `~/.bash_profile`), puis :

```bash
source ~/.zshrc
```

**Vérifier le chemin du SDK** : Android Studio → **File → Settings** (ou **Android Studio → Preferences**) → **Appearance & Behavior → System Settings → Android SDK** → champ **Android SDK Location**. C’est ce chemin qu’il faut utiliser pour `ANDROID_HOME`.

---

## Workflow

### 1. Lancer l’app web en local

L’app Android charge l’URL configurée dans `capacitor.config.ts`. En dev, par défaut : `http://10.0.2.2:3000` (émulateur Android = localhost de la machine).

```bash
npm run dev
```

Garder ce terminal ouvert.

### 2. Synchroniser et lancer sur Android

Dans un autre terminal :

```bash
npm run cap:sync
npm run cap:run:android
```

Ou ouvrir le projet Android dans Android Studio :

```bash
npm run cap:open:android
```

Puis Run (▶) depuis Android Studio (émulateur ou device USB).

### 3. Installer sur ton téléphone

**Option A — USB** : branche le téléphone en USB, active le **mode développeur** et le **débogage USB**. Dans Android Studio, sélectionne ton appareil dans la liste (à la place de l’émulateur), puis **Run (▶)**. L’app s’installe et se lance sur le tel.

**Option B — APK** : dans Android Studio → **Build → Build Bundle(s) / APK(s) → Build APK(s)**. Une fois le build terminé, Android Studio propose d’ouvrir le dossier ; copie l’APK sur ton téléphone (AirDrop, Drive, etc.) et ouvre-le sur le tel pour l’installer. (Pour un APK de release signé : **Build → Generate Signed Bundle / APK**.)

Le simple **push** du code sur Git ne fournit pas d’APK : il faut builder l’app (A ou B) pour l’installer sur un appareil.

### 4. Builder l’app (APK pour installer sur ton tel)

**Étape 1 — Ouvrir le projet** (si ce n’est pas déjà fait)  
Dans le terminal, à la racine du projet : `npm run cap:open:android`.

**Étape 2 — Lancer le build APK**  
Dans Android Studio :  
1. Menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.  
2. Attendre la fin du build (barre de progression en bas).  
3. Une notification **“APK(s) generated successfully”** s’affiche → clique sur **“locate”** (ou **“Find in Finder”**) pour ouvrir le dossier contenant l’APK.

**Étape 3 — Récupérer l’APK**  
L’APK se trouve en général dans :  
`android/app/build/outputs/apk/debug/app-debug.apk`  
Tu peux le copier sur ton téléphone (câble USB, Google Drive, AirDroid, etc.) et l’ouvrir sur le tel pour l’installer. Sur Android, il faut autoriser **“Sources inconnues”** (ou “Installer des apps inconnues”) pour ce fichier si demandé.

**Pour un build release signé (Play Store plus tard)**  
**Build** → **Generate Signed Bundle / APK** → choisir **APK** ou **Android App Bundle (AAB)** → suivre l’assistant (création ou choix d’un keystore, mots de passe, etc.).

---

## Config (design = noir profond, cohérent)

- **`capacitor.config.ts`** : `appId`, `appName`, `webDir`, `server.url`, Status Bar, options Android.
- **Barre de statut (top bar)** : `style: 'DARK'` (texte/icons clairs), `backgroundColor: '#000000'`, `overlaysWebView: true` → même noir que l’app, heure/notifications en clair.
- **Safe area** : déjà géré dans la PWA (`pwa-mobile.css`, `chat-clean.css` avec `env(safe-area-inset-*)`). Le WebView reçoit les insets système ; même rendu que la PWA.
- **Mode sombre** : l’app chargée (ta PWA) est déjà en thème sombre ; la coque Capacitor (status bar, fond) est en noir pour rester cohérent.

---

## URL de l’app (prod)

Par défaut en dev : `http://10.0.2.2:3000`. **Sur téléphone physique**, l'app doit charger la prod (scrivia.app) :

```bash
# 1. Build Next.js + déployer scrivia.app (Vercel / CI)
# 2. Sync et run avec l'URL prod (évite d'écraser server.url)
npm run build && npm run cap:run:android:prod
```

Ou manuellement : `npm run cap:sync:prod` puis build/run depuis Android Studio.  
**Important :** ne pas utiliser `cap:run:android` seul pour le device physique — il remet `server.url` à l'émulateur → écran vide.

---

## Fichiers utiles

| Fichier / dossier | Rôle |
|-------------------|------|
| `capacitor.config.ts` | Config globale (URL, Status Bar, Android) |
| `www/` | Contenu minimal pour `cap sync` ; l’app réelle est chargée via `server.url` |
| `android/` | Projet Android (versionné) ; ne pas modifier à la main sauf thème/splash |
| `docs/mobile/PLAN-APP-MOBILE.md` | Plan directeur et prochaines étapes |

---

## Dépannage

- **ERR_SDK_NOT_FOUND / No valid Android SDK root found** : définir `ANDROID_HOME` (voir section « Configuration de l’environnement Android » ci‑dessus). Puis relancer `npm run cap:run:android`. Alternative : lancer l’app depuis Android Studio avec `npm run cap:open:android`, puis Run (▶).
- **App blanche ou “Chargement…”** : vérifier que `npm run dev` tourne et que l’émulateur peut joindre `10.0.2.2:3000`. Sur device physique, utiliser l’IP de ta machine et `CAPACITOR_SERVER_URL=http://192.168.x.x:3000`.
- **Barre de statut pas comme voulu** : ajuster `plugins.StatusBar` dans `capacitor.config.ts` (style, backgroundColor, overlaysWebView).
- **Safe area incorrecte** : vérifier que la PWA utilise bien `env(safe-area-inset-*)` et `viewport-fit=cover` (déjà en place dans `layout.tsx` et les CSS mobile).

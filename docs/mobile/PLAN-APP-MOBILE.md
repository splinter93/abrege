# Plan directeur — Application mobile (Capacitor Android)

**Responsable :** Développement mobile  
**Objectif :** App Android native (coque Capacitor) = même design que la PWA, avec meilleur contrôle sur la barre de statut et les safe areas.  
**Principe :** Projet compartimenté, zéro régression sur l’app web / PWA.

---

## 1. Comment ça se déroule

| Phase | Contenu | Livrable |
|-------|--------|----------|
| **1. Bases** | Capacitor + Android + config (Status Bar, safe area) | App qui charge la PWA (URL), barre de statut et safe area maîtrisées |
| **2. Design** | Alignement 100 % avec la PWA (header, safe bottom) | Même rendu que la PWA, avec contrôle natif |
| **3. Build & store** | Signing, icônes, splash, fiche Play Store | APK/AAB prêt à publier |

On pose les bases tout de suite (Phase 1). Le design reste celui de la PWA ; on ne duplique pas l’UI, on améliore seulement le contrôle natif (header / notifications, safe space en bas).

---

## 2. Rôle du projet Capacitor

- **PWA (navigateur / “Ajouter à l’écran d’accueil”)** : inchangée, même code, même design.
- **App Android** : coque native (Capacitor) qui affiche la **même** app (chargée par URL ou, plus tard, par build statique). Seuls changent :
  - **Header (barre de statut)** : style (clair/sombre), couleur, overlay ou non → contrôle natif.
  - **Safe area bas** : insets gérés par le système + ton CSS existant (`env(safe-area-inset-*)`).

Aucune modification des composants ou styles existants pour “faire marcher” l’app mobile : tout le design reste dans la PWA.

---

## 3. Contrôle design visé

- **Header (notifications / barre de statut)**  
  - Style : texte/icons clairs sur fond sombre (aligné thème actuel).  
  - Option : overlay sur le WebView pour que le contenu monte jusqu’en haut, avec `padding-top: env(safe-area-inset-top)` côté CSS (déjà en place dans `pwa-mobile.css` / `chat-clean.css`).

- **Safe space en bas**  
  - Déjà géré dans la PWA (`--safe-area-bottom`, `env(safe-area-inset-bottom)`).  
  - Côté Capacitor/Android : s’assurer que l’app est bien en edge-to-edge et que les insets sont fournis au WebView (Capacitor le fait ; on peut renforcer via plugin System Bars si besoin).

- **Reste du design**  
  - Identique à la PWA : pas de nouvelle maquette, pas de thème “mobile” séparé.

---

## 4. Structure du projet (compartimentée)

```
abrege/
├── src/                    # Inchangé (web + PWA)
├── public/                  # Inchangé
├── www/                     # Minimal pour Capacitor (fallback / sync)
├── android/                 # Projet Android (généré par Capacitor)
├── capacitor.config.ts     # Config globale (URL, Status Bar, appId, appName)
├── package.json             # + scripts cap:*
└── docs/mobile/             # Doc et plan mobile
    ├── PLAN-APP-MOBILE.md   # Ce fichier
    └── README.md            # Workflow (sync, run, build)
```

- **App web / PWA** : aucun changement de comportement ; les mêmes routes, le même build.
- **Android** : uniquement dans `android/` + `capacitor.config.ts` + scripts npm. Aucun `if (isCapacitor)` dans le code métier tant que ce n’est pas nécessaire.

---

## 5. Risques et parades

- **Régressions web** : on ne touche pas au code dans `src/` pour la Phase 1. Parade : pas de logique conditionnelle “mobile app” dans les composants.
- **Barre de statut / safe area** : tout se fait dans la config Capacitor + plugins (Status Bar, évent. System Bars). Parade : tests sur device réel après chaque changement de config.

---

## 6. Prochaines actions (bases)

1. Installer Capacitor (core, cli, android) et `@capacitor/status-bar`.
2. Créer `capacitor.config.ts` (appId, appName, webDir, `server.url`, Status Bar, fond sombre).
3. Créer `www/` avec un `index.html` minimal (pour `cap sync`).
4. `npx cap add android` et configurer le thème Android (couleur barre de statut / edge-to-edge si besoin).
5. Ajouter les scripts npm (`cap:add:android`, `cap:sync`, `cap:run:android`) et documenter le workflow dans `docs/mobile/README.md`.

Ensuite : vérifier sur device que le header et la safe area en bas correspondent bien au design voulu, sans changer le code de la PWA.

/// <reference types="@capacitor/cli" />
/// <reference types="@capacitor/status-bar" />

import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Config Capacitor — App mobile Scrivia (Android).
 * Design = même que la PWA ; contrôle natif sur barre de statut et safe areas.
 *
 * - server.url : en dev = émulateur Android (10.0.2.2:3000). En prod, définir CAPACITOR_SERVER_URL.
 * - webDir : contenu minimal pour cap sync ; l’app réelle est chargée via server.url.
 */
const config: CapacitorConfig = {
  appId: 'com.scrivia.app',
  appName: 'Scrivia',
  webDir: 'www',

  server: {
    // Prod par défaut. Dev local : CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npm run cap:sync
    url: process.env.CAPACITOR_SERVER_URL || 'https://www.scrivia.app',
    cleartext: true,
    // Garder la navigation (auth, redirections) dans le WebView au lieu d’ouvrir le navigateur
    allowNavigation: [
      'scrivia.app',
      '*.scrivia.app',
      '*.supabase.co',
      '*.supabase.in',
      'accounts.google.com',
      '*.google.com',
      'www.google.com',
    ],
  },

  plugins: {
    StatusBar: {
      style: 'DARK',
      // overlaysWebView: false pour stabilité Android (permet adjustResize natif sans hacks).
      // La status bar est un bloc noir distinct au-dessus de l'app.
      // Le header sera collé en haut de la webview (y=0).
      overlaysWebView: false,
      backgroundColor: '#000000',
    },
    // Stratégie clavier :
    // - Android : "Native" (défaut) + adjustResize (manifest) -> la webview se redimensionne nativement.
    // - iOS : "None" (défaut) -> le clavier passe par-dessus -> géré via JS (CapacitorInit) + CSS.
    Keyboard: {
      style: 'DARK',
      // Pas de resize forcé (car on n'est plus en mode overlay/fullscreen strict sur Android)
      resizeOnFullScreen: false,
    },
    // Configuration du Splash Screen pour éviter le fond blanc au chargement/resume
    SplashScreen: {
      backgroundColor: '#000000',
      launchShowDuration: 0,
      launchAutoHide: true,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },

  android: {
    allowMixedContent: true,
  },
};

export default config;

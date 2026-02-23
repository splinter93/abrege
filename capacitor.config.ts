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
      overlaysWebView: true,
      backgroundColor: '#000000',
    },
    // Stratégie clavier : adjustNothing (Android manifest) + visualViewport CSS
    // resize: 'none' = iOS KeyboardResize.None : le viewport ne change pas quand le clavier s'ouvre.
    // Le layout est géré en CSS via --keyboard-height (cf. pwa-mobile.css + CapacitorInit.tsx).
    Keyboard: {
      resize: 'none',
      style: 'DARK',
      resizeOnFullScreen: false,
    },
  },

  android: {
    allowMixedContent: true,
  },
};

export default config;

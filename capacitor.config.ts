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
    url: process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000',
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
  },

  android: {
    allowMixedContent: true,
  },
};

export default config;

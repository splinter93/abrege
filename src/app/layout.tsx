import type { Metadata, Viewport } from "next";
// import type { ReactNode } from "react";
import { Geist_Mono } from "next/font/google";
// Ordre critique : variables de base en premier
import "../styles/variables.css";
import "../styles/design-system.css";
// ✅ typography.css est importé dans globals.css, pas besoin de le réimporter ici
import "../styles/glassmorphism-variables.css";
import "./globals.css";
import "../styles/editor.css";
import "../styles/page-title-containers.css";
import "../styles/unified-page-title.css";
import "../styles/unified-page-layout.css";
import "../styles/pages-unified-layout.css";
import "../styles/pwa-mobile.css";
import "../styles/chat-mobile.css";
import "../components/editor/editor-header.css";
import "../components/editor/editor-title.css";
import "../components/editor/editor-content.css";
import "../components/editor/editor-footer.css";
import "../components/editor/editor-toc.css";
import "../components/editor/editor-slash-menu.css";
import "../components/editor/editor-header-image.css";
import "../components/editor/editor-modal.css";


import { LanguageProvider } from "../contexts/LanguageContext";
import { Toaster } from "react-hot-toast";
import ThemeColor from "@/components/ThemeColor";
import PWASplash from "@/components/PWASplash";
import CapacitorInit from "@/components/CapacitorInit";
import ScrollPerformance from "@/components/ScrollPerformance";
import { CommandPaletteProvider } from "@/components/command-palette/CommandPaletteProvider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scrivia",
  description:
    "Scrivia is a modern, collaborative, and LLM-friendly markdown knowledge base. Organize, publish, and share your notes with clean URLs and a beautiful UI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // adjustResize (AndroidManifest) redimensionne le WebView quand le clavier apparaît.
  // interactiveWidget=resizes-content dit à Chrome de faire pareil côté CSS (dvh, fixed).
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark theme-dark ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/feather.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* PWA Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        
        {/* PWA Status Bar - Noir pur pour app installée */}
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Scrivia" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Scrivia Chat" />
        
        {/* Manrope partout (critical CSS + typography). Geist Mono pour --font-mono (code) uniquement. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: `
          /* CRITICAL CSS - Manrope partout */
          html {
            background: var(--color-bg-primary, #0e1012) !important;
            height: 100%;
            font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
          }
          body, .app-container {
            font-family: inherit !important;
            background: var(--color-bg-primary, #0e1012) !important;
            color: var(--text-primary, #d0d0d0) !important;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            min-height: -webkit-fill-available;
          }
          * { box-sizing: border-box; }
          
          /* MOBILE/TOUCH - Éliminer les radial-gradients dès le chargement initial (évite flash marron). */
          @media (max-width: 1023px) {
            body { background-image: none !important; }
          }
          @media (hover: none) and (pointer: coarse) {
            body { background-image: none !important; }
          }
          
          /* PWA STANDALONE - Fond noir absolu */
          @media (display-mode: standalone) {
            html, body { background: #000000 !important; background-image: none !important; }
          }
          
        ` }} />
        <script dangerouslySetInnerHTML={{ __html: `
          // ✅ Intercepter CMD+P / Ctrl+P TRÈS TÔT pour bloquer l'impression du navigateur
          (function() {
            document.addEventListener('keydown', function(e) {
              // CMD+P (Mac) ou Ctrl+P (Windows/Linux)
              const isPKey = (e.key === 'p' || e.key === 'P' || e.code === 'KeyP');
              const isCommandP = (e.metaKey || e.ctrlKey) && isPKey && !e.shiftKey && !e.altKey;
              
              if (isCommandP) {
                // Guards : Ne pas bloquer si dans un input/textarea avec du texte
                const activeElement = document.activeElement;
                const isInInput = activeElement?.tagName === 'INPUT';
                const isInTextarea = activeElement?.tagName === 'TEXTAREA';
                
                if (isInInput) {
                  return; // Laisser le navigateur gérer
                }
                
                if (isInTextarea) {
                  const textarea = activeElement;
                  if (textarea && textarea.value && textarea.value.trim().length > 0) {
                    return; // Laisser le navigateur gérer si du texte
                  }
                }
                
                // Guard : Ne pas bloquer si dans un éditeur contenteditable avec du contenu
                const isInEditable = activeElement?.getAttribute('contenteditable') === 'true' ||
                                   activeElement?.closest('[contenteditable="true"]') !== null;
                
                if (isInEditable) {
                  const editable = activeElement;
                  if (editable && editable.textContent && editable.textContent.trim().length > 0) {
                    return; // Laisser le navigateur gérer si du contenu
                  }
                }
                
                // ✅ Bloquer l'impression du navigateur
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // Déclencher un événement personnalisé que React pourra écouter
                window.dispatchEvent(new CustomEvent('command-palette:open'));
              }
            }, true); // Capture phase pour intercepter avant le navigateur
          })();
        ` }} />
      </head>
      <body className="app-container">
        {/* Overlay zone notification : noir opaque pour que le contenu ne passe pas à travers (mobile / Capacitor) */}
        <div className="pwa-status-bar-overlay" aria-hidden="true" />
        <PWASplash />
        <ThemeColor />
        <ScrollPerformance />
        <CapacitorInit />
        <LanguageProvider>
          <CommandPaletteProvider />
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--surface-elevated, #1f2937)',
                color: 'var(--text-primary, #f3f4f6)',
                border: '1px solid var(--border-subtle, #374151)',
                borderRadius: '12px',
                padding: '14px 16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                maxWidth: '420px',
                fontSize: '14px',
                lineHeight: '1.5'
              },
              success: {
                iconTheme: {
                  primary: 'var(--success, #10b981)',
                  secondary: 'var(--surface-elevated, #1f2937)'
                },
                duration: 3000
              },
              error: {
                iconTheme: {
                  primary: 'var(--error, #ef4444)',
                  secondary: 'var(--surface-elevated, #1f2937)'
                },
                duration: 5000
              }
            }}
          />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

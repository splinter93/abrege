import type { Metadata } from "next";
// import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans } from "next/font/google";
// Ordre critique : variables de base en premier
import "../styles/variables.css";
import "../styles/design-system.css";
import "../styles/typography.css";
import "../styles/glassmorphism-variables.css";
import "./globals.css";
import "../styles/markdown.css";
import "../styles/editor.css";
import "../styles/page-title-containers.css";
import "../styles/unified-page-title.css";
import "../styles/sidebar-collapsible.css";
import "../styles/unified-page-layout.css";
import "../styles/pages-unified-layout.css";
import "../styles/pwa-mobile.css";
import "../styles/chat-mobile.css";
import "../styles/theme-mobile-dark.css";
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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Scrivia",
  description:
    "Scrivia is a modern, collaborative, and LLM-friendly markdown knowledge base. Organize, publish, and share your notes with clean URLs and a beautiful UI.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover", // ✅ Remplit haut et bas (barre nav Android)
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark theme-dark">
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
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" />
        <style dangerouslySetInnerHTML={{ __html: `
          /* CRITICAL CSS - Éviter le flash de couleur */
          html { 
            background: var(--color-bg-primary, #121212) !important; 
            height: 100%;
          }
          body { 
            background: var(--color-bg-primary, #121212) !important; 
            color: var(--color-text-primary, #d0d0d0) !important; 
            font-family: 'Noto Sans', sans-serif !important;
            margin: 0;
            padding: 0;
            /* PWA Fullscreen - Remplit haut et bas */
            min-height: 100vh;
            min-height: -webkit-fill-available;
          }
          * { box-sizing: border-box; }
          
          /* PWA STANDALONE - Noir pur partout pour couvrir safe areas */
          @media (display-mode: standalone) {
            html {
              background: #000000 !important;
            }
            body {
              background: #000000 !important;
            }
          }
          
          /* CRITICAL SIDEBAR CSS - Éviter le flash de sidebar noire */
          .unified-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 280px !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.18) !important;
            border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            z-index: 1000 !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }
          
          /* CRITICAL PAGE CONTENT CSS - S'assurer que le contenu est bien positionné */
          .page-content-area {
            margin-left: 280px !important;
            flex: 1 !important;
            overflow-y: auto !important;
            height: 100vh !important;
          }
        ` }} />
      </head>
      <body className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} ${notoSans.variable} app-container`}>
        <ThemeColor />
        <LanguageProvider>
          <Toaster position="top-right" />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

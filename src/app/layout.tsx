import type { Metadata } from "next";
// import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans } from "next/font/google";
// Ordre critique : variables de base en premier
import "../styles/design-system.css";
import "../styles/themes.css";
import "../styles/typography.css";
import "../styles/variables.css";
import "../styles/glassmorphism-variables.css";
import "./globals.css";
import "../styles/markdown.css";
import "../styles/chat-global.css";
import "../styles/editor.css";
import "../styles/page-title-containers.css";
import "../styles/unified-sidebar.css";
import "../styles/unified-page-layout.css";
import "../styles/pages-unified-layout.css";
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark theme-dark">
      <head>
        <link rel="icon" href="/feather.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" />
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
          html, body { 
            background: var(--color-bg-primary, #0f0f12) !important; 
            color: var(--color-text-primary, #f8f9fa) !important; 
            font-family: 'Noto Sans', sans-serif !important;
            margin: 0;
            padding: 0;
          }
          * { box-sizing: border-box; }
          
          /* CRITICAL SIDEBAR CSS - Éviter le flash de sidebar noire */
          .sidebar,
          .page-sidebar-fixed {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 280px !important;
            height: 100vh !important;
            background: rgba(255, 255, 255, 0.08) !important;
            border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            z-index: 1001 !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
          }
          
          .sidebar-main-content {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
          }
          
          .sidebar-logo {
            padding: 24px !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(255, 255, 255, 0.05) !important;
          }
          
          .sidebar-block {
            padding: 24px 0 !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
            background: transparent !important;
          }
          
          .sidebar-nav {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            padding: 0 24px !important;
          }
          
          .nav-link {
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 16px 24px !important;
            color: #f5f5f5 !important;
            text-decoration: none !important;
            transition: all 0.25s ease !important;
            border-radius: 12px !important;
            background: transparent !important;
            border: 1px solid transparent !important;
            width: 100% !important;
            text-align: left !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            margin: 0 12px !important;
            position: relative !important;
            overflow: hidden !important;
          }
          
          .nav-link:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.18) !important;
            color: #f5f5f5 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
          }
          
          .nav-link.active {
            background: rgba(229, 90, 44, 0.12) !important;
            border-color: rgba(229, 90, 44, 0.25) !important;
            color: #e55a2c !important;
            font-weight: 600 !important;
            box-shadow: 0 4px 16px rgba(229, 90, 44, 0.15) !important;
          }
          
          .nav-link svg {
            width: 20px !important;
            height: 20px !important;
            flex-shrink: 0 !important;
          }
          
          .nav-link span {
            flex: 1 !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          
          .sidebar-footer {
            margin-top: auto !important;
            border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-bottom: none !important;
            background: rgba(255, 255, 255, 0.05) !important;
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
      <body className={`${notoSans.className} ${geistSans.variable} ${geistMono.variable} app-container`}>
        <LanguageProvider>
          <Toaster position="top-right" />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

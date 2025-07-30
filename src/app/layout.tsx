import type { Metadata } from "next";
// import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import Sidebar from '../components/Sidebar';
import '../styles/typography.css';
import '../styles/design-system.css';
import '../styles/editor.css';
import '../styles/markdown.css';
import '../components/editor/editor-header.css';
import '../components/editor/editor-title.css';
import '../components/editor/editor-content.css';
import '../components/editor/editor-footer.css';
import '../components/editor/editor-toc.css';
import '../components/editor/editor-slash-menu.css';
import '../components/editor/editor-header-image.css';

import '../components/editor/editor-modal.css';
import { LanguageProvider } from '../contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  title: "Scrivia",
  description: "Scrivia is a modern, collaborative, and LLM-friendly markdown knowledge base. Organize, publish, and share your notes with clean URLs and a beautiful UI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/feather.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} app-container`}>
        <LanguageProvider>
          <Toaster position="top-right" />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

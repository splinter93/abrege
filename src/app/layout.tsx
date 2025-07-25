import type { Metadata } from "next";
// import type { ReactNode } from "react";
import { Geist, Geist_Mono, Open_Sans, EB_Garamond, Roboto, Lato, Source_Sans_3, Work_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
// import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/design-system.css';
import '../styles/editor.css';
import '../components/editor/editor-header.css';
import { AuthProvider } from '../components/AuthProvider';
import { LanguageProvider } from '../contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';
import AppMainContent from '../components/AppMainContent';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Scrivia",
  description: "Scrivia is a modern, collaborative, and LLM-friendly markdown knowledge base. Organize, publish, and share your notes with clean URLs and a beautiful UI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/feather.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${openSans.variable} ${ebGaramond.variable} ${roboto.variable} ${lato.variable} ${sourceSans3.variable} ${workSans.variable} ${cormorantGaramond.variable}`}>
        <LanguageProvider>
          <Toaster position="top-right" />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

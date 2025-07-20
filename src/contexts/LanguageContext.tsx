'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { Language, TranslationKey } from '@/utils/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang, setLang, t, initializeLanguage } = useLanguage();

  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
}; 
import { useState, useCallback } from 'react';
import { translations, type Language, type TranslationKey } from '@/utils/translations';

export const useLanguage = () => {
  const [lang, setLang] = useState<Language>('fr');

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
    const text = translations[lang][key] || key;
    
    if (!params) return text;
    
    return Object.entries(params).reduce((acc, [k, v]) => {
      return acc.replace(new RegExp(`{${k}}`, 'g'), String(v));
    }, text);
  }, [lang]);

  const switchLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    // Optionnel : sauvegarder dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('abrege-language', newLang);
    }
  }, []);

  // Charger la langue depuis localStorage au démarrage
  const initializeLanguage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('abrege-language') as Language;
      if (savedLang && (savedLang === 'fr' || savedLang === 'en')) {
        setLang(savedLang);
      }
    }
  }, []);

  return {
    lang,
    setLang: switchLanguage,
    t,
    initializeLanguage,
  };
}; 
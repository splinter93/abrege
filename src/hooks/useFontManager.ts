import { useCallback, useEffect } from 'react';

/**
 * Hook pour gérer le changement de police dans l'éditeur
 * Change dynamiquement les variables CSS --editor-font-family-headings et --editor-font-family-body
 */
export const useFontManager = (currentFont: string | null | undefined) => {
  
  // Fonction pour changer la police dans le CSS
  const changeFont = useCallback((fontName: string, scope: 'all' | 'headings' | 'body' = 'all') => {
    try {
      // Mapper les noms de police aux familles CSS
      const fontFamilyMap: Record<string, string> = {
        'Noto Sans': "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
        'Inter': "'Inter', sans-serif",
        'Roboto': "'Roboto', sans-serif",
        'Open Sans': "'Open Sans', sans-serif",
        'Lato': "'Lato', sans-serif",
        'Poppins': "'Poppins', sans-serif",
        'Figtree': "'Figtree', sans-serif",
        'Source Sans Pro': "'Source Sans 3', sans-serif",
        'Work Sans': "'Work Sans', sans-serif",
        'Ubuntu': "'Ubuntu', sans-serif",
        'Montserrat': "'Montserrat', sans-serif",
        'Raleway': "'Raleway', sans-serif",
        'Georgia': "'Georgia', 'Times New Roman', serif",
        'Times New Roman': "'Times New Roman', serif",
        'EB Garamond': "'EB Garamond', serif",
        'Cormorant Garamond': "'Cormorant Garamond', serif",
        'JetBrains Mono': "'JetBrains Mono', 'Noto Sans Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'Consolas', 'Monaco', 'Liberation Mono', monospace",
        'Fira Code': "'Fira Code', 'JetBrains Mono', 'Noto Sans Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'Monaco', 'Liberation Mono', monospace"
      };

      // Récupérer la famille de police correspondante
      const fontFamily = fontFamilyMap[fontName] || fontFamilyMap['Noto Sans'];
      
      // Changer les variables CSS selon le scope
      if (scope === 'all' || scope === 'headings') {
        document.documentElement.style.setProperty('--editor-font-family-headings', fontFamily);
        console.log(`[FontManager] 🎯 Headings changés: ${fontFamily}`);
      }
      if (scope === 'all' || scope === 'body') {
        document.documentElement.style.setProperty('--editor-font-family-body', fontFamily);
        console.log(`[FontManager] 🎯 Body changé: ${fontFamily}`);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FontManager] 🎨 Police changée: ${fontName} (${scope}) → ${fontFamily}`);
        console.log(`[FontManager] 🔍 Scope reçu: "${scope}"`);
      }
      
    } catch (error) {
      console.error('[FontManager] ❌ Erreur lors du changement de police:', error);
    }
  }, []);

  // Appliquer la police actuelle au chargement
  useEffect(() => {
    if (currentFont) {
      changeFont(currentFont);
    }
  }, [currentFont, changeFont]);

  return { changeFont };
}; 
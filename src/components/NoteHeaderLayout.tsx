import React from 'react';
import '@/styles/typography.css';

interface NoteHeaderLayoutProps {
  headerImageUrl: string | null;
  showTitleInHeader: boolean;
  title: React.ReactNode;  // Zone du titre
  content: React.ReactNode; // Zone du contenu
  fullWidth?: boolean;     // Pour max-width du contenu
}

/**
 * Composant qui gère l'espacement vertical entre le titre et le contenu
 * en fonction de la présence d'une image et de la position du titre
 */
export const NoteHeaderLayout: React.FC<NoteHeaderLayoutProps> = ({
  headerImageUrl,
  showTitleInHeader,
  title,
  content,
  fullWidth = false
}) => {
  // Détermine la classe de layout à appliquer
  const layoutClass = React.useMemo(() => {
    const baseClass = 'noteLayout';
    
    if (!headerImageUrl) {
      return `${baseClass} noImage`;
    }
    
    if (showTitleInHeader) {
      return `${baseClass} imageWithTitle`;
    }
    
    return `${baseClass} imageOnly`;
  }, [headerImageUrl, showTitleInHeader]);

  // Applique la largeur maximale via CSS custom property
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--editor-content-width',
      fullWidth ? 'var(--editor-content-width-wide)' : 'var(--editor-content-width-normal)'
    );
  }, [fullWidth]);

  return (
    <div className={`${layoutClass} ${fullWidth ? 'wide-mode' : ''}`}>
      {/* Zone du titre */}
      <div className="noteLayout-title">
        {title}
      </div>

      {/* Zone du contenu */}
      <div className="noteLayout-content">
        {content}
      </div>
    </div>
  );
};

export default NoteHeaderLayout; 
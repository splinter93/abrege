/**
 * Modal Image avec Zoom & Pan
 * Double-clic sur une image pour l'agrandir
 * Inspiré de MermaidModal pour cohérence et performances
 */

import './ImageModal.css';

interface ImageModalOptions {
  src: string;
  alt?: string;
  fileName?: string;
}

// ✅ SINGLETON : Empêcher multiples modals simultanées
let currentModal: HTMLElement | null = null;

/**
 * Fonction pour extraire le nom du fichier depuis l'URL ou l'alt
 * Priorité : fileName fourni > alt (nom descriptif) > nom du fichier URL
 */
function extractFileName(src: string, alt?: string): string {
  // Si on a un alt descriptif (pas juste "Image" ou vide), l'utiliser en priorité
  if (alt && alt.trim() && !alt.match(/^image$/i)) {
    return alt.trim();
  }
  
  // Sinon extraire le nom du fichier depuis l'URL
  try {
    const url = new URL(src);
    const pathname = url.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    const decoded = decodeURIComponent(filename);
    
    // Si le filename est valide, l'utiliser
    if (decoded && decoded.length > 0) {
      return decoded;
    }
  } catch {
    // Si erreur de parsing URL, continuer
  }
  
  // Fallback final
  return alt || 'image';
}

/**
 * Fonction pour ouvrir la modal Image agrandie
 */
export function openImageModal(options: ImageModalOptions) {
  // ✅ SINGLETON : Fermer la modal existante si une est déjà ouverte
  if (currentModal && document.body.contains(currentModal)) {
    document.body.removeChild(currentModal);
    document.body.style.overflow = '';
    currentModal = null;
  }

  const { src, alt, fileName: providedFileName } = options;
  // Priorité : fileName fourni > alt descriptif > nom fichier URL
  const fileName = providedFileName || extractFileName(src, alt);

  // Créer le modal
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  
  // ✅ Enregistrer comme modal courante
  currentModal = modal;
  
  // Toolbar transparente avec nom du fichier et boutons
  const toolbar = document.createElement('div');
  toolbar.className = 'image-modal-toolbar';
  
  // Nom du fichier à gauche
  const fileNameLabel = document.createElement('div');
  fileNameLabel.className = 'image-modal-filename-label';
  fileNameLabel.textContent = fileName;
  fileNameLabel.title = fileName;
  
  // Boutons de zoom au centre
  const zoomControls = document.createElement('div');
  zoomControls.className = 'image-modal-zoom-controls';
  
  // Bouton Zoom -
  const zoomOutButton = document.createElement('button');
  zoomOutButton.className = 'image-modal-zoom-btn';
  zoomOutButton.title = 'Zoom arrière';
  zoomOutButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
  `;
  
  // Bouton Zoom +
  const zoomInButton = document.createElement('button');
  zoomInButton.className = 'image-modal-zoom-btn';
  zoomInButton.title = 'Zoom avant';
  zoomInButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
      <line x1="8" y1="11" x2="14" y2="11"></line>
      <line x1="11" y1="8" x2="11" y2="14"></line>
    </svg>
  `;
  
  // Bouton Reset
  const resetButton = document.createElement('button');
  resetButton.className = 'image-modal-zoom-btn';
  resetButton.title = 'Reset zoom';
  resetButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
      <path d="M21 3v5h-5"></path>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
      <path d="M8 16H3v5"></path>
    </svg>
  `;
  
  // Bouton copier - juste l'icône
  const copyButton = document.createElement('button');
  copyButton.className = 'image-modal-copy';
  copyButton.title = "Copier l'URL (Ctrl+C)";
  copyButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
  
  // Gestion du copier
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(src);
      copyButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      `;
      copyButton.classList.add('copied');
      
      setTimeout(() => {
        copyButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
        copyButton.classList.remove('copied');
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
    }
  });
  
  // Bouton télécharger - juste l'icône
  const downloadButton = document.createElement('button');
  downloadButton.className = 'image-modal-download';
  downloadButton.title = 'Télécharger';
  downloadButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  `;
  
  // Gestion du téléchargement avec fallback CORS
  downloadButton.addEventListener('click', async () => {
    try {
      // Tenter le download via fetch (fonctionne si même origine ou CORS activé)
      try {
        const response = await fetch(src);
        
        // Vérifier si la réponse est OK
        if (!response.ok) {
          throw new Error('Fetch failed');
        }
        
        const blob = await response.blob();
        
        // Créer un lien temporaire pour télécharger
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (fetchError) {
        // ✅ FALLBACK CORS : Ouvrir dans nouvel onglet si fetch échoue
        console.warn('Fetch failed (CORS?), fallback to window.open:', fetchError);
        const a = document.createElement('a');
        a.href = src;
        a.download = fileName;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      // Feedback visuel
      downloadButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      `;
      downloadButton.classList.add('downloaded');
      
      setTimeout(() => {
        downloadButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        `;
        downloadButton.classList.remove('downloaded');
      }, 2000);
    } catch (error) {
      console.error('Erreur critique lors du téléchargement:', error);
    }
  });
  
  // Bouton fermer intégré dans la toolbar
  const closeButton = document.createElement('button');
  closeButton.className = 'image-modal-close';
  closeButton.title = 'Fermer (Échap)';
  closeButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  
  // Assembler la toolbar
  toolbar.appendChild(fileNameLabel);
  toolbar.appendChild(zoomControls);
  toolbar.appendChild(copyButton);
  toolbar.appendChild(downloadButton);
  toolbar.appendChild(closeButton);
  
  // Assembler les contrôles de zoom
  zoomControls.appendChild(zoomOutButton);
  zoomControls.appendChild(zoomInButton);
  zoomControls.appendChild(resetButton);
  
  // Conteneur pour l'image avec zoom et pan
  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'image-modal-wrapper';
  imageWrapper.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    cursor: default;
    user-select: none;
    transition: transform 0.2s ease-out;
  `;
  
  // Image
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || 'Image agrandie';
  img.className = 'image-modal-img';
  // ✅ Pas de styles inline, on utilise uniquement le CSS
  
  imageWrapper.appendChild(img);
  
  // État du zoom et pan
  let currentScale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragStartTime = 0;
  let hasMoved = false;
  
  // Fonction pour appliquer la transformation complète
  const applyTransform = () => {
    imageWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
  };
  
  // Fonction pour appliquer le zoom
  const applyZoom = (newScale: number) => {
    // Interdire le dezoom en dessous de 100%
    currentScale = Math.max(1, Math.min(3, newScale));
    
    // Si on dezoom vers 100%, recentrer automatiquement
    if (currentScale === 1) {
      translateX = 0;
      translateY = 0;
    }
    
    applyTransform();
    imageWrapper.style.cursor = currentScale > 1 ? 'grab' : 'default';
  };
  
  // Fonction pour reset le zoom et la position
  const resetZoom = () => {
    currentScale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
    imageWrapper.style.cursor = 'default';
  };
  
  // Event listeners pour les boutons de zoom
  zoomOutButton.addEventListener('click', () => {
    const newScale = Math.max(1, currentScale - 0.2);
    applyZoom(newScale);
  });
  
  zoomInButton.addEventListener('click', () => {
    const newScale = Math.min(3, currentScale + 0.2);
    applyZoom(newScale);
  });
  
  resetButton.addEventListener('click', () => {
    resetZoom();
  });
  
  // Gestion du zoom à la molette
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = currentScale * delta;
    applyZoom(newScale);
  };
  
  // Gestion du pan au clic-glissé
  const handleMouseDown = (e: MouseEvent) => {
    if (currentScale > 1) {
      isDragging = true;
      hasMoved = false;
      dragStartTime = Date.now();
      lastX = e.clientX;
      lastY = e.clientY;
      imageWrapper.style.cursor = 'grabbing';
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      
      // Détecter si on a vraiment bougé (plus de 5px)
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved = true;
      }
      
      translateX += deltaX;
      translateY += deltaY;
      
      applyTransform();
      
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      imageWrapper.style.cursor = currentScale > 1 ? 'grab' : 'default';
      
      // Réinitialiser le flag de mouvement après un délai
      setTimeout(() => {
        hasMoved = false;
      }, 150);
    }
  };
  
  // Double-clic pour reset
  const handleDoubleClick = () => {
    resetZoom();
  };
  
  // Ajouter les éléments au modal
  modal.appendChild(toolbar);
  modal.appendChild(imageWrapper);
  
  // Ajouter au DOM
  document.body.appendChild(modal);
  
  // Empêcher le scroll du body
  document.body.style.overflow = 'hidden';
  
  // Event listeners pour le zoom et pan
  imageWrapper.addEventListener('wheel', handleWheel, { passive: false });
  imageWrapper.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  imageWrapper.addEventListener('dblclick', handleDoubleClick);
  
  // Fermer avec Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  
  // Fermer en cliquant sur l'overlay (hors de l'image)
  const handleOverlayClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Fermer si on clique sur le modal lui-même ou sur le wrapper (pas sur l'image ou toolbar)
    if (target === modal || target === imageWrapper) {
      // Ne pas fermer si on vient de faire du drag
      const timeSinceDrag = Date.now() - dragStartTime;
      if (isDragging || hasMoved || timeSinceDrag < 100) {
        return;
      }
      closeModal();
    }
  };

  // Fermer en cliquant sur le bouton
  const handleCloseClick = () => {
    closeModal();
  };

  // Fonction pour fermer le modal
  function closeModal() {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
    
    // ✅ SINGLETON : Nettoyer la référence globale
    if (currentModal === modal) {
      currentModal = null;
    }
    
    // Restaurer le scroll du body
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleEscape);
    modal.removeEventListener('click', handleOverlayClick);
    closeButton.removeEventListener('click', handleCloseClick);
    imageWrapper.removeEventListener('wheel', handleWheel);
    imageWrapper.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    imageWrapper.removeEventListener('dblclick', handleDoubleClick);
  }

  // Ajouter les event listeners
  document.addEventListener('keydown', handleEscape);
  modal.addEventListener('click', handleOverlayClick);
  closeButton.addEventListener('click', handleCloseClick);
}


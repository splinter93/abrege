/**
 * Utilitaires pour attendre le chargement des images
 * 
 * @description Fonction pure pour attendre que toutes les images d'un élément DOM soient chargées
 * avant de procéder à l'export PDF
 */

/**
 * Attend que toutes les images d'un élément soient chargées
 * 
 * @param element - Élément DOM contenant potentiellement des images
 * @returns Promise qui se résout quand toutes les images sont chargées (ou timeout)
 */
export function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Continuer même si une image échoue
        // Timeout après 5 secondes
        setTimeout(() => resolve(), 5000);
      });
    })
  ).then(() => undefined);
}


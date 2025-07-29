/**
 * Génère un nom unique pour une note en ajoutant un numéro si nécessaire
 * @param baseName - Le nom de base (ex: "Nouvelle note")
 * @param existingNames - Liste des noms existants
 * @returns Un nom unique
 */
export function generateUniqueName(baseName: string, existingNames: string[]): string {
  // Si le nom de base n'existe pas, on l'utilise tel quel
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  // Sinon, on cherche le premier numéro disponible
  // On commence à 2 pour éviter "Nouvelle note 1"
  let counter = 2;
  let newName = `${baseName} ${counter}`;
  
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${baseName} ${counter}`;
  }
  
  return newName;
}

/**
 * Génère un nom unique pour une nouvelle note
 * @param existingNotes - Liste des notes existantes
 * @returns Un nom unique pour la nouvelle note
 */
export function generateUniqueNoteName(existingNotes: Array<{ source_title: string }>): string {
  const existingNames = existingNotes.map(note => note.source_title);
  return generateUniqueName('Nouvelle note', existingNames);
} 
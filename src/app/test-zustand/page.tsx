import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';

// Sélecteur Zustand stable, défini hors du composant
const selectClasseurs = (s: FileSystemState) => Object.values(s.classeurs);

export default function TestZustand() {
  const classeurs = useFileSystemStore(selectClasseurs);
  return <pre>{JSON.stringify(classeurs, null, 2)}</pre>;
} 
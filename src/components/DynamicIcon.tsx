'use client';
import React from 'react';
import { Folder, Book, Rocket, Brain, Briefcase, FileText, Settings, Home } from 'lucide-react';

export type DynamicIconName = 'Folder' | 'Book' | 'Rocket' | 'Brain' | 'Briefcase' | 'FileText' | 'Settings' | 'Home';

interface DynamicIconProps {
  name: DynamicIconName;
  color?: string;
  [key: string]: any;
}

// Ce mapping permet de ne pas importer toute la bibliothèque d'un coup
// et de contrôler les icônes disponibles.
const iconMap: Record<DynamicIconName, React.ComponentType<any>> = {
  Folder,
  Book,
  Rocket,
  Brain,
  Briefcase,
  FileText,
  Settings,
  Home,
};

const DynamicIcon: React.FC<DynamicIconProps> = ({ name, color, ...props }) => {
  const IconComponent = iconMap[name] || Folder;
  // On passe la couleur directement en prop, Lucide s'en charge.
  // On fournit une couleur par défaut si aucune n'est passée.
  return <IconComponent color={color || '#ff6b3d'} {...props} />;
};

export default DynamicIcon; 
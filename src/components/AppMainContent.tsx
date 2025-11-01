'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';

export default function AppMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Pages qui utilisent l'Editor (privées) - pas de header externe
  const isPrivateEditorPage = pathname?.includes('/note/') ?? false;
  
  // Afficher le header sauf sur les pages d'éditeur privé
  const showHeader = !isPrivateEditorPage;
  
  return (
    <div className="app-main-content">
      {showHeader && <Header />}
      {children}
    </div>
  );
} 
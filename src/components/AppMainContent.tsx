'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';
import PublicPageHeader from './PublicPageHeader';

export default function AppMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditorPage = pathname?.startsWith('/note/') ?? false;
  const isPublicPage = pathname?.includes('/') && !isEditorPage;
  
  return (
    <div className="app-main-content">
      {isEditorPage ? null : isPublicPage ? <PublicPageHeader /> : <Header />}
      {children}
    </div>
  );
} 
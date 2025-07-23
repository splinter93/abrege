'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';

export default function AppMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditorPage = pathname?.startsWith('/note/') ?? false;
  return (
    <div className="app-main-content">
      {!isEditorPage && <Header />}
      {children}
    </div>
  );
} 
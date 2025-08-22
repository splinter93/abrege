import { LanguageProvider } from '@/contexts/LanguageContext';
import AppMainContent from '@/components/AppMainContent';

export default function PublicShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="app-layout">
        <AppMainContent>{children}</AppMainContent>
      </div>
    </LanguageProvider>
  );
} 
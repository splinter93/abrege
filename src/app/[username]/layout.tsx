import { LanguageProvider } from '@/contexts/LanguageContext';

export default function PublicShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="app-layout">
        {children}
      </div>
    </LanguageProvider>
  );
} 
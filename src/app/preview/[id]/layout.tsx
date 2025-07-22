import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';
import AppMainContent from '@/components/AppMainContent';

export default function PreviewPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <Toaster position="top-right" />
      <div className="app-layout">
        <AppMainContent>{children}</AppMainContent>
      </div>
    </LanguageProvider>
  );
} 
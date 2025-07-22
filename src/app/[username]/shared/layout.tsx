import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';
import AppMainContent from '@/components/AppMainContent';

export default function PublicShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <Toaster position="top-right" />
          <div className="app-layout">
            <AppMainContent>{children}</AppMainContent>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
} 
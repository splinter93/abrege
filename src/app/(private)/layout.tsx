import { AuthProvider } from '@/components/AuthProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';
import AppMainContent from '@/components/AppMainContent';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <AuthProvider>
            <Toaster position="top-right" />
            <div className="app-layout">
              <AppMainContent>{children}</AppMainContent>
            </div>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
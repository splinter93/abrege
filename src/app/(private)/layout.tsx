import AppMainContent from '@/components/AppMainContent';
import { AuthProvider } from '@/components/AuthProvider';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="app-layout">
        <AppMainContent>{children}</AppMainContent>
      </div>
    </AuthProvider>
  );
}
import AppMainContent from '@/components/AppMainContent';
import { AuthProvider } from '@/components/AuthProvider';
import ClientOnly from '@/components/ClientOnly';

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <AuthProvider>{children}</AuthProvider>
    </ClientOnly>
  );
}
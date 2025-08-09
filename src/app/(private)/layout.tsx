import { AuthProvider } from '@/components/AuthProvider';
import ClientOnly from '@/components/ClientOnly';
import RealtimeProvider from '@/components/RealtimeProvider';

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <AuthProvider>
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </AuthProvider>
    </ClientOnly>
  );
} 
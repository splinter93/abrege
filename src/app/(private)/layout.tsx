import AppMainContent from '@/components/AppMainContent';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <AppMainContent>{children}</AppMainContent>
    </div>
  );
}
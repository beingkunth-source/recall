import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="liquid-shell flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="liquid-content flex-1 overflow-y-auto">
        <div className="p-8 min-h-full">{children}</div>
      </main>
    </div>
  );
}

export default MainLayout;

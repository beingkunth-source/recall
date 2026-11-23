import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import sakuraBg from '@/assets/sakura-bg.jpg';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  return (
    <div
      className="sakura-app-shell flex h-screen w-screen overflow-hidden bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${sakuraBg})` }}
    >
      {/* Soft ambient frosted warmth overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] pointer-events-none" />

      <Sidebar />
      <main className="flex-1 overflow-y-auto relative z-1">
        <div className="p-8 min-h-full">{children}</div>
      </main>
    </div>
  );
}

export default MainLayout;

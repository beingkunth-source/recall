import { useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Image,
  FileText,
  StickyNote,
  Settings,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/services/api';
import type { HealthResponse } from '@/services/api';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
  { label: 'Search', path: '/search', icon: <Search size={20} /> },
  { label: 'All Files', path: '/files', icon: <FolderOpen size={20} /> },
  { label: 'Images', path: '/images', icon: <Image size={20} /> },
  { label: 'PDFs', path: '/pdfs', icon: <FileText size={20} /> },
  { label: 'Notes', path: '/notes', icon: <StickyNote size={20} /> },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
];

function Sidebar() {
  const { data: health, refetch } = useApi<HealthResponse>(
    useCallback(() => api.getHealth(), [])
  );
  const connected = health?.status === 'healthy' || health?.status === 'ok';

  // Backend may boot a few seconds after the UI — poll until connected.
  useEffect(() => {
    if (connected) return;
    const id = window.setInterval(() => refetch(), 2000);
    return () => window.clearInterval(id);
  }, [connected, refetch]);

  return (
    <aside className="w-60 h-full bg-sidebar flex flex-col flex-shrink-0 border-r border-white/5">
      <div className="flex items-center gap-3 px-5 py-5">
        <img
          src="/recall-logo.png"
          alt="Recall"
          className="w-9 h-9 rounded-[10px] shadow-[0_0_18px_rgba(124,58,237,0.45)] object-cover"
          draggable={false}
        />
        <span className="text-white text-lg font-semibold tracking-tight">
          Recall
        </span>
      </div>

      <nav className="flex-1 flex flex-col px-3 gap-0.5">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-default ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 flex flex-col gap-2">
        <div className="mx-1 mb-1 px-3 py-2 rounded-lg bg-white/5 flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? 'bg-primary-400' : 'bg-red-400'
            }`}
          />
          <span className="text-[11px] text-slate-400">
            {connected ? 'Backend connected' : 'Backend offline'}
          </span>
        </div>
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-default ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;

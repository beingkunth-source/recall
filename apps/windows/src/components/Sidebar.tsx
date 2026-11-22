import { useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import recallLogo from '@/assets/recall-logo.png';
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

  useEffect(() => {
    if (connected) return;
    const id = window.setInterval(() => refetch(), 1500);
    return () => window.clearInterval(id);
  }, [connected, refetch]);

  return (
    <aside className="w-60 h-full bg-sidebar/95 backdrop-blur-xl flex flex-col flex-shrink-0 border-r border-white/5 relative z-10">
      <div className="flex items-center gap-3 px-5 py-5">
        <img
          src={recallLogo}
          alt="Recall"
          className="w-9 h-9 rounded-[10px] shadow-[0_0_22px_rgba(139,92,246,0.55)] object-cover"
          draggable={false}
        />
        <span className="text-white text-lg font-semibold tracking-tight font-display">
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
              `nav-liquid flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-liquid ${
                isActive
                  ? 'active bg-primary-500/20 text-primary-300 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.25)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 flex flex-col gap-2">
        <div className="mx-1 mb-1 px-3 py-2 rounded-xl bg-white/5 flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="text-[11px] text-slate-400">
            {connected ? 'Engine running' : 'Starting engine…'}
          </span>
        </div>
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-liquid flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-liquid ${
                isActive
                  ? 'active bg-primary-500/20 text-primary-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
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

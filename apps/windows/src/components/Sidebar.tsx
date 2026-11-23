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
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={19} /> },
  { label: 'Search', path: '/search', icon: <Search size={19} /> },
  { label: 'All Files', path: '/files', icon: <FolderOpen size={19} /> },
  { label: 'Images', path: '/images', icon: <Image size={19} /> },
  { label: 'PDFs', path: '/pdfs', icon: <FileText size={19} /> },
  { label: 'Notes', path: '/notes', icon: <StickyNote size={19} /> },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: <Settings size={19} /> },
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
    <aside className="w-56 h-full bg-white/45 backdrop-blur-2xl flex flex-col flex-shrink-0 border-r border-white/40 relative z-10">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-extrabold flex items-center justify-center shadow-md shadow-red-500/30 text-base">
          R
        </div>
        <span className="text-slate-900 text-lg font-bold tracking-tight">
          Recall
        </span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col px-3 gap-1">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[13.5px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/85 text-slate-900 font-semibold border border-red-400/50 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-red-500' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Status & Settings */}
      <div className="px-3 pb-4 flex flex-col gap-2">
        {/* Engine Running with Sparkline */}
        <div className="mx-1 mb-1 px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connected
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-[11.5px] font-semibold text-slate-700">
              {connected ? 'Engine running' : 'Starting engine…'}
            </span>
          </div>
          <svg
            className="w-8 h-4 text-red-400"
            viewBox="0 0 32 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 8L6 8L9 2L14 14L18 6L21 10L25 8L31 8" />
          </svg>
        </div>

        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13.5px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/85 text-slate-900 font-semibold border border-red-400/50 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
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

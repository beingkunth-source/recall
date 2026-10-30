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
  return (
    <aside className="w-60 h-full bg-sidebar flex flex-col flex-shrink-0">
      {/* Logo / App name */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <span className="w-2.5 h-2.5 rounded-full bg-primary-500 inline-block" />
        <span className="text-white text-lg font-semibold tracking-tight">
          Recall
        </span>
      </div>

      {/* Main navigation */}
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

      {/* Bottom navigation */}
      <div className="px-3 pb-4 flex flex-col gap-0.5">
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

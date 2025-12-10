import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  FolderKanban,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { path: '/timeline', label: 'タイムライン', icon: Clock },
    { path: '/projects', label: 'プロジェクト', icon: FolderKanban },
    { path: '/reports', label: 'レポート', icon: BarChart3 },
    { path: '/settings', label: '設定', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'bg-surface border-r border-gray-800 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="p-4 flex items-center justify-between">
        {!collapsed && <h1 className="text-xl font-bold text-primary">AutoTracker</h1>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="flex-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-colors',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className={cn('p-4 border-t border-gray-800', collapsed && 'px-2')}>
        <div
          className={cn(
            'text-xs text-gray-500',
            collapsed ? 'text-center' : ''
          )}
        >
          {collapsed ? 'v0.1' : 'v0.1.0 - MVP'}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;


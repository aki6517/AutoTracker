import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'ダッシュボード', icon: '📊' },
    { path: '/timeline', label: 'タイムライン', icon: '⏱️' },
    { path: '/projects', label: 'プロジェクト', icon: '📁' },
    { path: '/reports', label: 'レポート', icon: '📈' },
    { path: '/settings', label: '設定', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-[#1A1A1A] border-r border-gray-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#E5C890]">AutoTracker</h1>
      </div>
      <nav className="px-4 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-[#E5C890] bg-opacity-20 text-[#E5C890]'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;


import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const links = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/accounts', icon: Users, label: '账号管理' },
  { to: '/logs', icon: CalendarCheck, label: '签到日志' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export default function Navbar() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <nav className="glass-panel px-6 py-3 flex items-center gap-8 sticky top-4 z-50 mx-4">
      <div className="flex items-center gap-2.5">
        <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm" />
        <span className="text-lg font-bold bg-gradient-to-r from-[#a8ff78] to-[#78ffd6] bg-clip-text text-transparent">
          New-API 签到
        </span>
      </div>
      <div className="flex gap-1 flex-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/60 dark:bg-white/20 text-sky-700 dark:text-sky-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-white/30 dark:hover:bg-white/10'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>
      <button
        onClick={toggleTheme}
        className="glass-button !p-2.5 !rounded-xl"
        title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </nav>
  );
}

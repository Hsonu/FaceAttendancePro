import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Camera, CheckSquare, Clock, Users,
  FileText, LogOut, Scan, ChevronRight, Shield, Key, Settings, Building2
} from 'lucide-react';

const employeeLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/mark-attendance', icon: Scan, label: 'Mark Attendance' },
  { to: '/history', icon: Clock, label: 'My History' },
  { to: '/change-password', icon: Key, label: 'Change Password' },
];

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/employees', icon: Users, label: 'Employees' },
  { to: '/admin/departments', icon: Building2, label: 'Departments' },
  { to: '/admin/face-register', icon: Camera, label: 'Register Faces' },
  { to: '/admin/attendance', icon: CheckSquare, label: 'Attendance Log' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/settings', icon: Settings, label: 'Duty Settings' },
  { to: '/change-password', icon: Key, label: 'Change Password' },
];

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = isAdmin ? adminLinks : employeeLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (to) => {
    if (to === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(to);
  };

  return (
    <aside className="w-64 min-h-screen bg-dark-900 border-r border-dark-700 flex flex-col sticky top-0">
      {/* Brand */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-dark-50 rounded-xl flex items-center justify-center">
            <Scan size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-dark-50 font-bold text-lg leading-tight">AttendEase</h1>
            <p className="text-dark-500 text-xs">Attendance System</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-dark-100 font-semibold text-sm truncate">{user?.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {isAdmin ? (
                <Shield size={10} className="text-amber-500 font-bold" />
              ) : null}
              <span className="text-dark-400 text-xs capitalize">{user?.role}</span>
              {user?.employeeId && (
                <span className="text-dark-500 text-xs">· {user.employeeId}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-dark-400 text-[10px] font-bold uppercase tracking-wider px-3 mb-3">
          {isAdmin ? 'Admin Panel' : 'Navigation'}
        </p>
        {links.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
              ${isActive(to)
                ? 'bg-dark-50 text-white shadow-md shadow-dark-50/10'
                : 'text-dark-300 hover:text-dark-50 hover:bg-dark-800'
              }`}
          >
            <Icon size={18} className={isActive(to) ? 'text-white' : 'text-dark-400 group-hover:text-dark-50'} />
            <span className="flex-1">{label}</span>
            {isActive(to) && <ChevronRight size={14} className="text-white/60" />}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-dark-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
        >
          <LogOut size={18} className="text-dark-500 group-hover:text-red-400 transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

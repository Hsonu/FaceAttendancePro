import { Menu, Bell, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export default function Navbar({ title, onMenuClick }) {
  const { user } = useAuth();
  const now = new Date();

  return (
    <header className="h-16 bg-dark-900/80 backdrop-blur-sm border-b border-dark-800 flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl hover:bg-dark-800 text-dark-400 hover:text-dark-100 transition-colors lg:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          <h2 className="text-dark-100 font-semibold text-lg">{title}</h2>
          <p className="text-dark-500 text-xs">
            {format(now, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-dark-800 rounded-xl border border-dark-700 text-dark-400 text-sm">
          <Clock />
          <span id="live-clock" suppressHydrationWarning>
            {format(now, 'hh:mm a')}
          </span>
        </div>
        <button className="relative p-2 rounded-xl hover:bg-dark-800 text-dark-400 hover:text-dark-100 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}

// Self-contained clock helper
function Clock() {
  return <span className="text-xs font-mono" />;
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { format } from 'date-fns';
import { Scan, Clock, Calendar, Shield, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    fetchToday();
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  const fetchToday = async () => {
    try {
      const { data } = await attendanceAPI.getToday();
      setTodayRecord(data.attendance);
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const hasCheckedIn = !!todayRecord?.checkIn;
  const hasCheckedOut = !!todayRecord?.checkOut;

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar title="Dashboard" />

        <main className="flex-1 p-6 lg:p-8 space-y-6">
          {/* Welcome */}
          <div className="glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Good {getGreeting()}, <span className="text-primary-400">{user?.name?.split(' ')[0]}</span> 👋
              </h2>
              <p className="text-dark-400 mt-1 text-sm">
                {format(time, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-white font-mono tracking-wide">
                {format(time, 'hh:mm')}
                <span className="text-primary-400 text-2xl">{format(time, ' a')}</span>
              </p>
              <p className="text-dark-500 text-xs mt-1">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            </div>
          </div>

          {/* Face Not Registered Info (read-only, contact admin) */}
          {!user?.faceRegistered && (
            <div className="glass-card p-4 border border-amber-500/30 bg-amber-500/5 animate-slide-up">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-amber-300 font-semibold text-sm">Face Not Registered</p>
                  <p className="text-amber-500/80 text-xs mt-0.5">
                    Contact your administrator to register your face before marking attendance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Today's Status Card */}
          <div className="glass-card p-6 animate-slide-up">
            <h3 className="text-dark-300 font-semibold text-sm uppercase tracking-wider mb-4">Today's Attendance</h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Check In */}
                <div className={`rounded-xl p-4 border ${hasCheckedIn ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-dark-800/50 border-dark-700'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {hasCheckedIn
                      ? <CheckCircle size={18} className="text-emerald-400" />
                      : <XCircle size={18} className="text-dark-500" />
                    }
                    <span className="text-sm font-semibold text-dark-300">Check In</span>
                  </div>
                  <p className={`text-2xl font-bold ${hasCheckedIn ? 'text-emerald-400' : 'text-dark-600'}`}>
                    {hasCheckedIn ? format(new Date(todayRecord.checkIn), 'hh:mm a') : '--:--'}
                  </p>
                </div>

                {/* Check Out */}
                <div className={`rounded-xl p-4 border ${hasCheckedOut ? 'bg-red-500/10 border-red-500/20' : 'bg-dark-800/50 border-dark-700'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {hasCheckedOut
                      ? <CheckCircle size={18} className="text-red-400" />
                      : <XCircle size={18} className="text-dark-500" />
                    }
                    <span className="text-sm font-semibold text-dark-300">Check Out</span>
                  </div>
                  <p className={`text-2xl font-bold ${hasCheckedOut ? 'text-red-400' : 'text-dark-600'}`}>
                    {hasCheckedOut ? format(new Date(todayRecord.checkOut), 'hh:mm a') : '--:--'}
                  </p>
                </div>

                {/* Work Hours */}
                <div className={`rounded-xl p-4 border ${hasCheckedOut ? 'bg-blue-500/10 border-blue-500/20' : 'bg-dark-800/50 border-dark-700'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} className={hasCheckedOut ? 'text-blue-400' : 'text-dark-500'} />
                    <span className="text-sm font-semibold text-dark-300">Work Hours</span>
                  </div>
                  <p className={`text-2xl font-bold ${hasCheckedOut ? 'text-blue-400' : 'text-dark-600'}`}>
                    {hasCheckedOut ? `${todayRecord.workHours}h` : '0h'}
                  </p>
                </div>

                {/* Overtime */}
                <div className={`rounded-xl p-4 border ${todayRecord?.overtime > 0 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-dark-800/50 border-dark-700'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} className={todayRecord?.overtime > 0 ? 'text-indigo-400' : 'text-dark-500'} />
                    <span className="text-sm font-semibold text-dark-300">Overtime</span>
                  </div>
                  <p className={`text-2xl font-bold ${todayRecord?.overtime > 0 ? 'text-indigo-400' : 'text-dark-600'}`}>
                    {todayRecord?.overtime ? `${todayRecord.overtime}h` : '0h'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-dark-400 text-sm font-semibold uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickAction
                to="/mark-attendance"
                icon={Scan}
                title="Mark Attendance"
                description="Use face recognition to check in or out"
                color="blue"
                disabled={!user?.faceRegistered}
                disabledMsg="Contact admin to register your face"
              />
              <QuickAction
                to="/history"
                icon={Calendar}
                title="View History"
                description="Browse your past attendance records"
                color="green"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, description, color, disabled, disabledMsg }) {
  const colors = {
    blue: 'from-blue-600/20 to-blue-800/5 border-blue-700/30 hover:border-blue-500/50 group-hover:text-blue-400',
    purple: 'from-purple-600/20 to-purple-800/5 border-purple-700/30 hover:border-purple-500/50 group-hover:text-purple-400',
    green: 'from-emerald-600/20 to-emerald-800/5 border-emerald-700/30 hover:border-emerald-500/50 group-hover:text-emerald-400',
  };
  const iconColors = {
    blue: 'bg-blue-600/20 text-blue-400',
    purple: 'bg-purple-600/20 text-purple-400',
    green: 'bg-emerald-600/20 text-emerald-400',
  };

  const Wrapper = disabled ? 'div' : Link;
  const wrapperProps = disabled ? {} : { to };

  return (
    <Wrapper
      {...wrapperProps}
      className={`glass-card group bg-gradient-to-br ${colors[color]} border p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconColors[color]}`}>
          <Icon size={22} />
        </div>
        <ArrowRight size={18} className="text-dark-600 group-hover:text-dark-300 transition-colors" />
      </div>
      <h3 className="text-dark-100 font-bold text-base mb-1">{title}</h3>
      <p className="text-dark-500 text-xs leading-relaxed">{description}</p>
      {disabled && (
        <p className="text-amber-500 text-xs mt-2 font-medium">⚠ {disabledMsg || 'Not available'}</p>
      )}
    </Wrapper>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

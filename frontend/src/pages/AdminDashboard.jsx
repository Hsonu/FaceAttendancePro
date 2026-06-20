import { useState, useEffect } from 'react';
import { adminAPI } from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import AttendanceTable from '../components/AttendanceTable';
import {
  Users, UserCheck, UserX, BarChart3, TrendingUp,
  Clock, Building2, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#FFFFFF', '#A3A3A3', '#737373', '#525252'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data: d } = await adminAPI.getDashboard();
      setData(d);
    } catch {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  const { stats, last7Days, recentAttendance, departmentStats, monthlyAttendance } = data;

  // Build pie chart data from monthly attendance
  const pieData = (monthlyAttendance || []).map((item) => ({
    name: item._id ? (item._id.charAt(0).toUpperCase() + item._id.slice(1)) : 'Unknown',
    value: item.count,
  }));

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Admin Dashboard" />
        <main className="flex-1 p-6 lg:p-8 space-y-6">

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              title="Total Employees"
              value={stats.totalEmployees}
              icon={Users}
              color="blue"
              trendLabel="Registered employees"
            />
            <StatCard
              title="Present Today"
              value={stats.todayPresent}
              icon={UserCheck}
              color="green"
              trendLabel={`${stats.attendanceRate}% attendance rate`}
            />
            <StatCard
              title="Absent Today"
              value={stats.todayAbsent}
              icon={UserX}
              color="red"
              trendLabel="Out of active employees"
            />
            <StatCard
              title="Attendance Rate"
              value={stats.attendanceRate}
              icon={TrendingUp}
              color="purple"
              suffix="%"
              trendLabel="Today's overall rate"
            />
            <StatCard
              title="Today's Overtime"
              value={stats.todayOvertime || 0}
              icon={Clock}
              color="indigo"
              suffix="h"
              trendLabel="Accumulated overtime hours"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 7-Day Trend */}
            <div className="lg:col-span-2 glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-dark-100 font-bold text-base">7-Day Attendance Trend</h3>
                  <p className="text-dark-500 text-xs mt-0.5">Daily present count</p>
                </div>
                <button onClick={fetchDashboard} className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-dark-400">
                  <RefreshCw size={16} />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={last7Days} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                  <XAxis dataKey="label" tick={{ fill: '#A3A3A3', fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: '#A3A3A3', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 8, color: '#F5F5F5' }}
                    labelStyle={{ color: '#A3A3A3' }}
                  />
                  <Area type="monotone" dataKey="present" stroke="#FFFFFF" strokeWidth={2} fill="url(#presentGrad)" name="Present" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: Monthly Status */}
            <div className="glass-card p-6">
              <h3 className="text-dark-100 font-bold text-base mb-1">This Month</h3>
              <p className="text-dark-500 text-xs mb-4">Attendance status breakdown</p>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 8, color: '#F5F5F5' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-dark-500 text-sm">
                  No data for this month
                </div>
              )}
            </div>
          </div>

          {/* Department Bar Chart */}
          {departmentStats?.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-dark-100 font-bold text-base mb-1">Employees by Department</h3>
              <p className="text-dark-500 text-xs mb-4">Headcount distribution</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={departmentStats} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                  <XAxis dataKey="_id" tick={{ fill: '#A3A3A3', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#A3A3A3', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 8, color: '#F5F5F5' }} />
                  <Bar dataKey="count" fill="#FFFFFF" radius={[4, 4, 0, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Attendance */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-dark-100 font-bold text-base">Recent Attendance</h3>
                <p className="text-dark-500 text-xs mt-0.5">Last 10 entries</p>
              </div>
            </div>
            <AttendanceTable records={recentAttendance || []} showEmployee />
          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Admin Dashboard" />
        <main className="flex-1 p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </div>
    </div>
  );
}

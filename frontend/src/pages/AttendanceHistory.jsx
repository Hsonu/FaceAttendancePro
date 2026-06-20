import { useState, useEffect } from 'react';
import { attendanceAPI, adminAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import AttendanceTable from '../components/AttendanceTable';
import { Clock, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_DEPTS = ['Engineering', 'Design', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales', 'Management', 'General'];

export default function AttendanceHistory({ isAdmin = false }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '', search: '', department: '' });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deptList, setDeptList] = useState(DEFAULT_DEPTS);

  useEffect(() => {
    if (isAdmin) {
      fetchDepts();
    }
  }, [isAdmin]);

  const fetchDepts = async () => {
    try {
      const { data } = await adminAPI.getDepartments();
      if (data.success && data.departments && data.departments.length > 0) {
        const dbDepts = data.departments.map(d => d.name);
        const merged = Array.from(new Set([...DEFAULT_DEPTS, ...dbDepts]));
        setDeptList(merged);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, filters]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, ...filters };
      const { data } = isAdmin
        ? await adminAPI.getAllAttendance(params)
        : await attendanceAPI.getMine(params);

      setRecords(data.records);
      setTotal(data.total);
      setPages(data.pages);
      if (data.stats) setStats(data.stats);
    } catch {
      toast.error('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const statsMap = {};
  stats.forEach((s) => { statsMap[s._id] = s; });

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title={isAdmin ? 'Attendance Log' : 'My Attendance History'} />
        <main className="flex-1 p-6 lg:p-8 space-y-6">

          {/* Header */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/20 rounded-xl">
                <Clock size={24} className="text-blue-400" />
              </div>
              <div>
                <h1 className="section-title">
                  {isAdmin ? 'All Attendance Records' : 'My Attendance History'}
                </h1>
                <p className="text-dark-400 text-sm mt-1">
                  {total} total records
                </p>
              </div>
            </div>
          </div>

          {/* Stats Summary (employee only) */}
          {!isAdmin && stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { key: 'present', label: 'Present', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { key: 'late', label: 'Late', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { key: 'half-day', label: 'Half Day', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
                { key: 'absent', label: 'Absent', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              ].map(({ key, label, color, bg }) => (
                <div key={key} className={`glass-card p-4 border ${bg}`}>
                  <p className="text-dark-400 text-xs mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{statsMap[key]?.count || 0}</p>
                  {statsMap[key]?.totalHours > 0 && (
                    <p className="text-dark-500 text-xs mt-1">{statsMap[key].totalHours.toFixed(1)}h total</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="glass-card p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 text-dark-400 shrink-0">
                <Filter size={16} />
                <span className="text-sm font-medium">Filters</span>
              </div>
              <div className="flex flex-wrap gap-3 flex-1">
                {isAdmin && (
                  <>
                    <input
                      type="text"
                      name="search"
                      placeholder="Search name or ID..."
                      value={filters.search}
                      onChange={handleFilterChange}
                      className="form-input max-w-[200px] py-2 text-sm"
                    />
                    <select
                      name="department"
                      value={filters.department}
                      onChange={handleFilterChange}
                      className="form-input max-w-[160px] py-2 text-sm"
                    >
                      <option value="">All Departments</option>
                      {deptList.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="form-input max-w-[160px] py-2 text-sm"
                />
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="form-input max-w-[160px] py-2 text-sm"
                />
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="form-input max-w-[140px] py-2 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="half-day">Half Day</option>
                  <option value="absent">Absent</option>
                </select>
                {(filters.startDate || filters.endDate || filters.status || filters.search || filters.department) && (
                  <button
                    onClick={() => {
                      setFilters({ startDate: '', endDate: '', status: '', search: '', department: '' });
                      setPage(1);
                    }}
                    className="btn-secondary py-2 text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <AttendanceTable
            records={records}
            showEmployee={isAdmin}
            loading={loading}
          />

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between glass-card p-4">
              <p className="text-dark-400 text-sm">
                Page <span className="text-dark-200 font-semibold">{page}</span> of {pages} — {total} records
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary p-2 disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="btn-secondary p-2 disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

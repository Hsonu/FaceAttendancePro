import { format } from 'date-fns';
import { Clock, LogIn, LogOut } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const classes = {
    present: 'badge-present',
    late: 'badge-late',
    'half-day': 'badge-half-day',
    absent: 'badge-absent',
  };
  return (
    <span className={classes[status] || 'badge-absent'}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Absent'}
    </span>
  );
};

const formatTime = (date) => {
  if (!date) return <span className="text-dark-600">—</span>;
  return format(new Date(date), 'hh:mm a');
};

export default function AttendanceTable({ records = [], showEmployee = false, loading = false }) {
  if (loading) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <Clock size={40} className="text-dark-600 mb-3" />
          <p className="text-dark-400 font-medium">No attendance records found</p>
          <p className="text-dark-600 text-sm mt-1">Records will appear here once employees start marking attendance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {showEmployee && (
                <>
                  <th>Employee</th>
                  <th>Dept.</th>
                </>
              )}
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Work Hours</th>
              <th>Overtime</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={record._id || index} className="transition-colors">
                {showEmployee && (
                  <>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {record.employee?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-dark-100 text-sm">{record.employee?.name || '—'}</p>
                          <p className="text-dark-500 text-xs">{record.employee?.employeeId || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-dark-400 text-xs font-medium">
                        {record.employee?.department || '—'}
                      </span>
                    </td>
                  </>
                )}
                <td>
                  <p className="font-medium text-dark-200">
                    {record.date ? format(new Date(record.date), 'MMM dd, yyyy') : '—'}
                  </p>
                  <p className="text-dark-500 text-xs">
                    {record.date ? format(new Date(record.date), 'EEEE') : ''}
                  </p>
                </td>
                <td>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <LogIn size={13} />
                    <span className="font-medium">{formatTime(record.checkIn)}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5 text-red-400">
                    <LogOut size={13} />
                    <span className="font-medium">{formatTime(record.checkOut)}</span>
                  </div>
                </td>
                <td>
                  <span className="font-semibold text-dark-200">
                    {record.workHours ? `${record.workHours}h` : '—'}
                  </span>
                </td>
                <td>
                  <span className={`font-semibold ${record.overtime > 0 ? 'text-indigo-400 font-bold' : 'text-dark-400'}`}>
                    {record.overtime ? `${record.overtime}h` : '0h'}
                  </span>
                </td>
                <td>
                  <StatusBadge status={record.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

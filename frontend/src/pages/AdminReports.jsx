import { useState, useEffect } from 'react';
import { adminAPI } from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { FileText, FileSpreadsheet, Download, Calendar, Loader, Info, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const DEFAULT_DEPTS = ['Engineering', 'Design', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales', 'Management', 'General'];

export default function AdminReports() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [deptList, setDeptList] = useState(DEFAULT_DEPTS);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingSummaryPDF, setLoadingSummaryPDF] = useState(false);

  useEffect(() => {
    fetchDepts();
  }, []);

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

  const setPreset = (preset) => {
    const today = new Date();
    if (preset === 'today') {
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'week') {
      setStartDate(format(subDays(today, 6), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'month') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    } else if (preset === 'last30') {
      setStartDate(format(subDays(today, 29), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const handleExcel = async () => {
    setLoadingExcel(true);
    try {
      const { data } = await adminAPI.downloadExcel({
        startDate,
        endDate,
        name: name.trim(),
        employeeId: employeeId.trim(),
        department,
      });
      const blob = new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, `attendance_${startDate}_to_${endDate}.xlsx`);
      toast.success('Excel report downloaded!');
    } catch {
      toast.error('Failed to generate Excel report.');
    } finally {
      setLoadingExcel(false);
    }
  };

  const handlePDF = async (summaryOnly = false) => {
    if (summaryOnly) {
      setLoadingSummaryPDF(true);
    } else {
      setLoadingPDF(true);
    }
    try {
      const { data } = await adminAPI.downloadPDF({
        startDate,
        endDate,
        name: name.trim(),
        employeeId: employeeId.trim(),
        department,
        summaryOnly,
      });
      const blob = new Blob([data], { type: 'application/pdf' });
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
      toast.success(summaryOnly ? 'Summary PDF opened in a new tab!' : 'Full PDF report opened in a new tab!');
    } catch {
      toast.error('Failed to generate PDF report.');
    } finally {
      if (summaryOnly) {
        setLoadingSummaryPDF(false);
      } else {
        setLoadingPDF(false);
      }
    }
  };

  const presets = [
    { label: 'Today', key: 'today' },
    { label: 'Last 7 Days', key: 'week' },
    { label: 'This Month', key: 'month' },
    { label: 'Last 30 Days', key: 'last30' },
  ];

  return (
    <div className="flex min-h-screen bg-dark-950 text-dark-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Attendance Reports" />
        <main className="flex-1 p-6 lg:p-8 space-y-6">

          {/* Header */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-600/10 rounded-xl border border-emerald-500/20 text-emerald-600">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="section-title">Generate Reports</h1>
                <p className="text-dark-400 text-sm mt-1">
                  Filter and download employee presence and absence reports as Excel or PDF.
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
            {/* Date Range Selector */}
            <div className="glass-card p-6 space-y-5 flex flex-col justify-between">
              <div>
                <h2 className="text-dark-50 font-bold text-base flex items-center gap-2 mb-4">
                  <Calendar size={18} className="text-dark-400" />
                  Date Range
                </h2>

                {/* Quick Presets */}
                <div className="mb-4">
                  <p className="text-dark-500 text-xs font-semibold uppercase tracking-wider mb-2">Quick Select</p>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map(({ label, key }) => (
                      <button
                        key={key}
                        onClick={() => setPreset(key)}
                        className="btn-secondary py-2 text-xs font-semibold border-dark-700/50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Range */}
                <div className="space-y-3">
                  <p className="text-dark-500 text-xs font-semibold uppercase tracking-wider mb-1">Custom Dates</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-xs">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="form-input text-sm"
                        id="report-start-date"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="form-input text-sm"
                        id="report-end-date"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Range Display */}
              <div className="p-3 bg-dark-800 rounded-xl border border-dark-700 mt-4">
                <p className="text-dark-500 text-[10px] font-bold uppercase tracking-wider mb-1">Selected Period</p>
                <p className="text-dark-100 font-semibold text-sm">
                  {format(new Date(startDate), 'MMM d, yyyy')} — {format(new Date(endDate), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Filter Configuration */}
            <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="text-dark-50 font-bold text-base flex items-center gap-2 mb-4">
                  <Filter size={18} className="text-dark-400" />
                  Filter Options
                </h2>

                <div className="space-y-3.5">
                  <div>
                    <label className="form-label text-xs">Employee Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe..."
                      className="form-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs">Employee ID</label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. EMP0001..."
                      className="form-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="form-input text-sm"
                    >
                      <option value="">All Departments</option>
                      {deptList.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Action Downloads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
            {/* Excel Download */}
            <div className="glass-card p-6 border border-emerald-600/10 hover:border-emerald-500/30 transition-colors flex flex-col justify-between">
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/20 shrink-0">
                  <FileSpreadsheet size={28} />
                </div>
                <div>
                  <h3 className="text-dark-50 font-bold text-base">Excel Spreadsheet</h3>
                  <p className="text-dark-400 text-xs mt-1 leading-relaxed">
                    Styled spreadsheet containing complete presence, absence, overtime, and work hours logs. Includes auto-filter, colored badges, and a calculations summary row.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['Auto-Filter', 'Present/Absent Summary', 'Work Hours', 'Overtime'].map((tag) => (
                      <span key={tag} className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleExcel}
                disabled={loadingExcel}
                className="btn-success w-full font-bold py-3"
                id="download-excel-btn"
              >
                {loadingExcel ? (
                  <><Loader size={18} className="animate-spin" /> Generating Sheet…</>
                ) : (
                  <><Download size={18} /> Download Excel (.xlsx)</>
                )}
              </button>
            </div>

            {/* PDF Download */}
            <div className="glass-card p-6 border border-red-600/10 hover:border-red-500/30 transition-colors flex flex-col justify-between">
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-600 border border-red-500/20 shrink-0">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-dark-50 font-bold text-base">PDF Document</h3>
                  <p className="text-dark-400 text-xs mt-1 leading-relaxed">
                    Clean landscape PDF publication featuring color-coded columns, summaries of present vs absent days, total overtime metrics, and formatted table records.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['Landscape A4', 'Executive Summary Page', 'Color Coded Status', 'Detailed Logs'].map((tag) => (
                      <span key={tag} className="text-[10px] font-semibold bg-red-500/10 text-red-700 px-2 py-0.5 rounded-full border border-red-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handlePDF(false)}
                  disabled={loadingPDF || loadingSummaryPDF}
                  className="btn-danger flex-1 font-bold py-3 text-sm"
                  id="download-pdf-btn"
                >
                  {loadingPDF ? (
                    <><Loader size={18} className="animate-spin" /> Generating Full PDF…</>
                  ) : (
                    <><Download size={16} /> Full Report PDF</>
                  )}
                </button>
                <button
                  onClick={() => handlePDF(true)}
                  disabled={loadingPDF || loadingSummaryPDF}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-dark-800 active:bg-dark-700 text-dark-200 font-bold rounded-xl border border-dark-700 transition-all duration-200 flex-1 text-sm"
                  id="download-summary-pdf-btn"
                >
                  {loadingSummaryPDF ? (
                    <><Loader size={18} className="animate-spin" /> Generating Summary…</>
                  ) : (
                    <><FileText size={16} /> Summary PDF Only</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="glass-card p-4 flex gap-3 text-dark-400">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              💡 **Information**: Applying filters will immediately scope the records and statistics included in the downloaded reports. Leaving Name and ID empty matches all employees.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

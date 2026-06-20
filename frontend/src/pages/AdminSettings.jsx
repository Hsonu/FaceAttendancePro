import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { adminAPI } from '../api/axios';
import { Settings, Clock, Coffee, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [dutyHours, setDutyHours] = useState(8);
  const [shiftStartTime, setShiftStartTime] = useState('09:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getSettings();
      if (data.success) {
        setDutyHours(data.settings.dutyHours);
        setShiftStartTime(data.settings.shiftStartTime);
      }
    } catch (err) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const hours = parseFloat(dutyHours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      toast.error('Standard duty hours must be a number between 0 and 24');
      return;
    }

    setSaving(true);
    try {
      const { data } = await adminAPI.updateSettings({
        dutyHours: hours,
        shiftStartTime,
      });

      if (data.success) {
        toast.success('Settings updated successfully!');
      } else {
        toast.error(data.message || 'Failed to save settings');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDutyHours(8);
    setShiftStartTime('09:00');
  };

  return (
    <div className="flex min-h-screen bg-dark-950 text-dark-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar title="System Settings" />

        <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* Header Card */}
          <div className="glass-card p-6 animate-slide-up flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="p-3 bg-primary-600/10 rounded-2xl text-primary-400 border border-primary-500/20 shrink-0">
                <Settings size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-dark-50">Duty & Attendance Settings</h2>
                <p className="text-dark-400 text-sm mt-0.5">
                  Configure global parameters for work shifts and overtime calculations.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="glass-card p-12 flex items-center justify-center animate-slide-up">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-dark-400 text-sm">Loading system settings...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
              {/* Duty Time Setting Card */}
              <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary-400 font-semibold mb-2">
                    <Coffee size={20} />
                    <h3>Standard Shift Duration</h3>
                  </div>
                  <p className="text-xs text-dark-400 mb-4">
                    The number of hours employees are expected to work per shift. Any hours worked beyond this limit will be calculated as Overtime (OT).
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-dark-300">Duty Hours (per day)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="24"
                        value={dutyHours}
                        onChange={(e) => setDutyHours(e.target.value)}
                        className="w-full bg-dark-800 border border-dark-700 rounded-xl py-3 px-4 text-sm text-dark-100 placeholder-dark-400 focus:border-dark-400 focus:outline-none"
                        placeholder="e.g. 8"
                        required
                      />
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-dark-500 text-sm">
                        Hours
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-dark-500 bg-dark-900/30 p-3 rounded-lg border border-dark-800/50 mt-4">
                  💡 **Calculation Formula:**
                  Overtime = total work hours - standard duty hours (minimum 0).
                </div>
              </div>

              {/* Shift Start Time Card */}
              <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary-400 font-semibold mb-2">
                    <Clock size={20} />
                    <h3>Shift Start Time</h3>
                  </div>
                  <p className="text-xs text-dark-400 mb-4">
                    The official start time of the work shift. Checks in after this time will be flagged as "Late" in the system dashboard.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-dark-300">Start Time (24h format)</label>
                    <input
                      type="time"
                      value={shiftStartTime}
                      onChange={(e) => setShiftStartTime(e.target.value)}
                      className="w-full bg-dark-800 border border-dark-700 rounded-xl py-3 px-4 text-sm text-dark-100 focus:border-dark-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="text-xs text-dark-500 bg-dark-900/30 p-3 rounded-lg border border-dark-800/50 mt-4">
                  💡 **Late Arrival Rule:**
                  If an employee clocks in at or after 10:00 AM (or late thresholds), their status updates to "Late".
                </div>
              </div>

              {/* Buttons Footer */}
              <div className="md:col-span-2 flex items-center justify-end gap-4 mt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all border border-dark-700/50 active:scale-[0.98]"
                >
                  <RotateCcw size={16} />
                  Restore Defaults
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-primary-600/20 active:scale-[0.98]"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={16} />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

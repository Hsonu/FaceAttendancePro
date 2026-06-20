import { useState, useRef, useCallback, useEffect } from 'react';
import { adminAPI, faceAPI } from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import FaceCamera from '../components/FaceCamera';
import {
  Camera, CheckCircle, RefreshCw, Info, Loader,
  Search, User, ChevronDown, AlertTriangle, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const CAPTURE_FRAMES = 5;
const CAPTURE_INTERVAL_MS = 700;

export default function AdminFaceRegister() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | capturing | processing | done | error
  const [progress, setProgress] = useState(0);
  const captureRef = useRef(false);
  const lastDescriptorRef = useRef(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await adminAPI.getEmployees({ limit: 100 });
      setEmployees(data.employees);
    } catch {
      toast.error('Failed to load employees.');
    }
  };

  const handleDescriptor = useCallback((descriptor) => {
    lastDescriptorRef.current = descriptor;
  }, []);

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setDropdownOpen(false);
    setPhase('idle');
    setProgress(0);
    lastDescriptorRef.current = null;
  };

  const startCapture = () => {
    if (!selectedEmployee) return toast.error('Please select an employee first.');
    if (phase === 'capturing') return;

    setProgress(0);
    setPhase('capturing');
    captureRef.current = true;

    let count = 0;
    const collected = [];

    const captureInterval = setInterval(() => {
      if (!captureRef.current) { clearInterval(captureInterval); return; }

      if (lastDescriptorRef.current) {
        collected.push(lastDescriptorRef.current);
        count++;
        setProgress(Math.round((count / CAPTURE_FRAMES) * 100));

        if (count >= CAPTURE_FRAMES) {
          clearInterval(captureInterval);
          captureRef.current = false;
          processCaptured(collected);
        }
      }
    }, CAPTURE_INTERVAL_MS);
  };

  const processCaptured = async (descriptors) => {
    if (descriptors.length === 0) {
      toast.error('No face detected. Ensure the face is clearly visible.');
      setPhase('idle');
      return;
    }

    setPhase('processing');

    // Average all captured descriptors for robustness
    const avgDescriptor = descriptors[0].map((_, i) =>
      descriptors.reduce((sum, d) => sum + d[i], 0) / descriptors.length
    );

    try {
      await faceAPI.registerForEmployee(selectedEmployee._id, avgDescriptor);
      setPhase('done');
      // Update local state to reflect registered face
      setEmployees((prev) =>
        prev.map((e) => e._id === selectedEmployee._id ? { ...e, faceRegistered: true } : e)
      );
      setSelectedEmployee((prev) => ({ ...prev, faceRegistered: true }));
      toast.success(`✅ Face registered for ${selectedEmployee.name}!`);
    } catch (err) {
      setPhase('error');
      toast.error(err.response?.data?.message || 'Registration failed.');
    }
  };

  const handleReset = async () => {
    if (!selectedEmployee) return;
    try {
      await faceAPI.resetEmployee(selectedEmployee._id);
      setEmployees((prev) =>
        prev.map((e) => e._id === selectedEmployee._id ? { ...e, faceRegistered: false } : e)
      );
      setSelectedEmployee((prev) => ({ ...prev, faceRegistered: false }));
      setPhase('idle');
      setProgress(0);
      lastDescriptorRef.current = null;
      toast.success(`Face data cleared for ${selectedEmployee.name}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed.');
    }
  };

  const cancelCapture = () => {
    captureRef.current = false;
    setPhase('idle');
    setProgress(0);
  };

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Register Employee Face" />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Header */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-600/20 rounded-xl">
                  <Camera size={24} className="text-purple-400" />
                </div>
                <div>
                  <h1 className="section-title">Face Registration</h1>
                  <p className="text-dark-400 text-sm mt-1">
                    Select an employee and register their face biometrics
                  </p>
                </div>
              </div>
            </div>

            {/* Info banner */}
            <div className="glass-card p-4 border-l-4 border-amber-500 flex gap-3 bg-amber-500/5">
              <Info size={18} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm text-dark-400 space-y-1">
                <p className="text-amber-300 font-semibold">Admin-Only Feature</p>
                <p>Only administrators can register employee faces. Employees use their registered face to mark attendance.</p>
              </div>
            </div>

            {/* Employee Selector */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-dark-200 font-semibold text-sm">Step 1 — Select Employee</h2>

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-dark-800 border border-dark-600 hover:border-dark-500 rounded-xl text-left transition-colors"
                >
                  {selectedEmployee ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {selectedEmployee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-dark-100 font-semibold text-sm">{selectedEmployee.name}</p>
                        <p className="text-dark-500 text-xs">{selectedEmployee.employeeId} · {selectedEmployee.department}</p>
                      </div>
                      {selectedEmployee.faceRegistered && (
                        <span className="badge-present ml-2 flex items-center gap-1">
                          <CheckCircle size={10} /> Registered
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-dark-400">
                      <User size={16} />
                      <span className="text-sm">Select an employee…</span>
                    </div>
                  )}
                  <ChevronDown
                    size={16}
                    className={`text-dark-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute top-full mt-2 left-0 right-0 z-20 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                    {/* Search */}
                    <div className="p-3 border-b border-dark-700">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search employees…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="form-input pl-9 py-2 text-sm"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-56 overflow-y-auto">
                      {filteredEmployees.length === 0 ? (
                        <p className="p-4 text-center text-dark-500 text-sm">No employees found</p>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp._id}
                            onClick={() => selectEmployee(emp)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {emp.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-dark-100 font-semibold text-sm truncate">{emp.name}</p>
                              <p className="text-dark-500 text-xs">{emp.employeeId} · {emp.department}</p>
                            </div>
                            {emp.faceRegistered ? (
                              <span className="badge-present text-[10px] shrink-0">✓ Set</span>
                            ) : (
                              <span className="text-dark-600 text-xs shrink-0">Not set</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected employee status */}
              {selectedEmployee && (
                <div className={`flex items-center justify-between p-3 rounded-xl border
                  ${selectedEmployee.faceRegistered
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-amber-500/10 border-amber-500/20'
                  }`}>
                  <div className="flex items-center gap-2">
                    {selectedEmployee.faceRegistered
                      ? <CheckCircle size={16} className="text-emerald-400" />
                      : <AlertTriangle size={16} className="text-amber-400" />
                    }
                    <span className={`text-sm font-medium ${selectedEmployee.faceRegistered ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {selectedEmployee.faceRegistered
                        ? 'Face already registered — you can update it below'
                        : 'Face not registered yet'
                      }
                    </span>
                  </div>
                  {selectedEmployee.faceRegistered && (
                    <button
                      onClick={handleReset}
                      className="text-red-400 hover:text-red-300 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={12} /> Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Camera — only show when employee is selected */}
            {selectedEmployee && phase !== 'done' && (
              <>
                <div className="glass-card p-4 flex gap-3 border-l-4 border-primary-500">
                  <Info size={16} className="text-primary-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-dark-400 space-y-0.5">
                    <p>• Ask <strong className="text-dark-200">{selectedEmployee.name}</strong> to sit in front of the camera</p>
                    <p>• Ensure good lighting, neutral expression, face clearly visible</p>
                    <p>• System will capture {CAPTURE_FRAMES} frames and average them</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-dark-200 font-semibold text-sm mb-4">Step 2 — Capture Face</h2>
                  <FaceCamera mode="register" onDescriptor={handleDescriptor} />
                </div>
              </>
            )}

            {/* Done state */}
            {phase === 'done' && (
              <div className="glass-card p-10 text-center animate-slide-up">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={48} className="text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Registration Complete!</h3>
                <p className="text-dark-400 mb-2">
                  Face successfully registered for{' '}
                  <span className="text-primary-400 font-semibold">{selectedEmployee?.name}</span>
                </p>
                <p className="text-dark-500 text-sm mb-6">
                  They can now use face recognition to mark attendance.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { setSelectedEmployee(null); setPhase('idle'); setProgress(0); }}
                    className="btn-primary"
                  >
                    Register Another Employee
                  </button>
                  <button onClick={() => { setPhase('idle'); setProgress(0); }} className="btn-secondary">
                    <RefreshCw size={16} /> Update This Face
                  </button>
                </div>
              </div>
            )}

            {/* Capture Controls */}
            {selectedEmployee && phase !== 'done' && (
              <div className="glass-card p-6 space-y-4">
                <h2 className="text-dark-200 font-semibold text-sm">Step 3 — Register</h2>

                {phase === 'capturing' && (
                  <div>
                    <div className="flex justify-between text-xs text-dark-400 mb-2">
                      <span>Capturing frames for <strong className="text-dark-200">{selectedEmployee.name}</strong>…</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-2.5">
                      <div
                        className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {(phase === 'idle' || phase === 'error') && (
                    <button onClick={startCapture} className="btn-primary flex-1" id="admin-start-capture-btn">
                      <Camera size={18} />
                      {selectedEmployee.faceRegistered ? 'Update Face' : 'Start Face Capture'}
                    </button>
                  )}
                  {phase === 'capturing' && (
                    <button onClick={cancelCapture} className="btn-secondary flex-1">
                      Cancel
                    </button>
                  )}
                  {phase === 'processing' && (
                    <button disabled className="btn-primary flex-1 opacity-75">
                      <Loader size={18} className="animate-spin" /> Processing…
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { faceAPI, attendanceAPI } from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import FaceCamera from '../components/FaceCamera';
import { Scan, LogIn, LogOut, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function MarkAttendance() {
  const { user } = useAuth();
  const [mode, setMode] = useState('in'); // 'in' | 'out'
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // {verified, confidence} | null
  const [result, setResult] = useState(null); // attendance result from server
  const lastDescriptorRef = useRef(null);
  const cooldownRef = useRef(false);

  const handleDescriptor = useCallback((descriptor) => {
    lastDescriptorRef.current = descriptor;
  }, []);

  const handleVerify = async () => {
    if (verifying || cooldownRef.current) return;
    if (!lastDescriptorRef.current) {
      return toast.error('No face detected. Please position your face in the frame.');
    }
    if (!user?.faceRegistered) {
      return toast.error('Please register your face first.');
    }

    setVerifying(true);
    setVerifyResult(null);

    try {
      // Step 1: Verify face
      const { data: vData } = await faceAPI.verify(lastDescriptorRef.current);
      setVerifyResult({ verified: vData.verified, confidence: vData.confidence });

      if (!vData.verified) {
        toast.error(vData.message || 'Face verification failed. Try again.');
        setTimeout(() => setVerifyResult(null), 2500);
        return;
      }

      // Step 2: Mark attendance
      const { data: aData } = mode === 'in'
        ? await attendanceAPI.checkIn()
        : await attendanceAPI.checkOut();

      setResult(aData.attendance);
      toast.success(aData.message);

      cooldownRef.current = true;
      setTimeout(() => {
        setVerifyResult(null);
        cooldownRef.current = false;
      }, 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Action failed. Please try again.';
      toast.error(msg);
      setVerifyResult(null);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Mark Attendance" />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Header */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-600/20 rounded-xl">
                  <Scan size={24} className="text-primary-400" />
                </div>
                <div>
                  <h1 className="section-title">Mark Attendance</h1>
                  <p className="text-dark-400 text-sm mt-1">
                    {format(new Date(), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>

            {/* Face Not Registered Warning */}
            {!user?.faceRegistered && (
              <div className="glass-card p-5 border border-amber-500/30 bg-amber-500/5 flex gap-3">
                <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 font-semibold">Face Not Registered</p>
                  <p className="text-amber-500/80 text-sm mt-1">
                    Contact your administrator to register your face before marking attendance.
                  </p>
                </div>
              </div>
            )}

            {/* Mode Toggle */}
            <div className="glass-card p-2 flex gap-2">
              <button
                id="mode-in-btn"
                onClick={() => { setMode('in'); setVerifyResult(null); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300
                  ${mode === 'in'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                  }`}
              >
                <LogIn size={18} /> Office In
              </button>
              <button
                id="mode-out-btn"
                onClick={() => { setMode('out'); setVerifyResult(null); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300
                  ${mode === 'out'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                  }`}
              >
                <LogOut size={18} /> Office Out
              </button>
            </div>

            {/* Camera */}
            <FaceCamera
              mode="verify"
              onDescriptor={handleDescriptor}
              verifyResult={verifyResult}
            />

            {/* Verify Button */}
            <button
              id="verify-attendance-btn"
              onClick={handleVerify}
              disabled={verifying || !user?.faceRegistered}
              className={`w-full h-14 text-base font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-300
                ${mode === 'in'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {verifying ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  {mode === 'in' ? <LogIn size={22} /> : <LogOut size={22} />}
                  {mode === 'in' ? 'Mark Office In' : 'Mark Office Out'}
                </>
              )}
            </button>

            {/* Result Card */}
            {result && (
              <div className="glass-card p-6 border border-emerald-500/30 bg-emerald-500/5 animate-slide-up">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle size={24} className="text-emerald-400" />
                  <h3 className="text-emerald-300 font-bold text-lg">Attendance Recorded!</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {result.checkIn && (
                    <div>
                      <p className="text-dark-500 text-xs mb-1">Check In</p>
                      <p className="text-emerald-400 font-bold text-xl">
                        {format(new Date(result.checkIn), 'hh:mm a')}
                      </p>
                    </div>
                  )}
                  {result.checkOut && (
                    <div>
                      <p className="text-dark-500 text-xs mb-1">Check Out</p>
                      <p className="text-red-400 font-bold text-xl">
                        {format(new Date(result.checkOut), 'hh:mm a')}
                      </p>
                    </div>
                  )}
                  {result.workHours > 0 && (
                    <div>
                      <p className="text-dark-500 text-xs mb-1">Work Hours</p>
                      <p className="text-blue-400 font-bold text-xl flex items-center gap-1">
                        <Clock size={16} />{result.workHours}h
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-dark-500 text-xs mb-1">Status</p>
                    <p className="text-dark-200 font-semibold capitalize">{result.status}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { faceAPI } from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import FaceCamera from '../components/FaceCamera';
import { Camera, CheckCircle, RefreshCw, Info, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const CAPTURE_FRAMES = 5;
const CAPTURE_INTERVAL_MS = 800;

export default function FaceRegister() {
  const { user, updateUser } = useAuth();
  const [phase, setPhase] = useState('idle'); // idle | capturing | processing | done | error
  const [progress, setProgress] = useState(0);
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const captureRef = useRef(false);
  const lastDescriptorRef = useRef(null);

  // Collect descriptors from the camera
  const handleDescriptor = useCallback((descriptor) => {
    lastDescriptorRef.current = descriptor;
  }, []);

  const startCapture = () => {
    if (phase === 'capturing') return;
    setCapturedDescriptors([]);
    setProgress(0);
    setPhase('capturing');
    captureRef.current = true;

    let count = 0;
    const collected = [];

    const captureFrame = setInterval(() => {
      if (!captureRef.current) {
        clearInterval(captureFrame);
        return;
      }

      if (lastDescriptorRef.current) {
        collected.push(lastDescriptorRef.current);
        count++;
        setProgress(Math.round((count / CAPTURE_FRAMES) * 100));

        if (count >= CAPTURE_FRAMES) {
          clearInterval(captureFrame);
          captureRef.current = false;
          processCaptured(collected);
        }
      }
    }, CAPTURE_INTERVAL_MS);
  };

  const processCaptured = async (descriptors) => {
    if (descriptors.length === 0) {
      toast.error('No face detected. Please ensure your face is clearly visible.');
      setPhase('idle');
      return;
    }

    setPhase('processing');

    // Average the descriptors for a robust representation
    const avgDescriptor = descriptors[0].map((_, i) =>
      descriptors.reduce((sum, d) => sum + d[i], 0) / descriptors.length
    );

    try {
      await faceAPI.register(avgDescriptor);
      updateUser({ faceRegistered: true });
      setPhase('done');
      toast.success('Face registered successfully!');
    } catch (err) {
      setPhase('error');
      toast.error(err.response?.data?.message || 'Registration failed.');
    }
  };

  const reset = () => {
    captureRef.current = false;
    setPhase('idle');
    setProgress(0);
    setCapturedDescriptors([]);
    lastDescriptorRef.current = null;
  };

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Face Registration" />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Header */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-600/20 rounded-xl">
                  <Camera size={24} className="text-purple-400" />
                </div>
                <div>
                  <h1 className="section-title">Register Your Face</h1>
                  <p className="text-dark-400 text-sm mt-1">
                    {user?.faceRegistered
                      ? '✅ Your face is registered. You can update it below.'
                      : 'One-time setup to enable face-based attendance marking.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="glass-card p-4 border-l-4 border-primary-500 flex gap-3">
              <Info size={18} className="text-primary-400 mt-0.5 shrink-0" />
              <div className="text-sm text-dark-400 space-y-1">
                <p>• Ensure good lighting and look directly at the camera</p>
                <p>• Keep a neutral expression and stay still during capture</p>
                <p>• The system will capture {CAPTURE_FRAMES} frames and average them for accuracy</p>
                <p>• Your face data is stored securely and never shared</p>
              </div>
            </div>

            {/* Camera */}
            {phase !== 'done' && (
              <FaceCamera mode="register" onDescriptor={handleDescriptor} />
            )}

            {/* Success State */}
            {phase === 'done' && (
              <div className="glass-card p-10 text-center animate-slide-up">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={48} className="text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Registration Complete!</h3>
                <p className="text-dark-400 mb-6">
                  Your face has been registered successfully. You can now use face recognition to mark attendance.
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={reset} className="btn-secondary">
                    <RefreshCw size={16} /> Register Again
                  </button>
                </div>
              </div>
            )}

            {/* Controls */}
            {phase !== 'done' && (
              <div className="glass-card p-6 space-y-4">
                {/* Progress bar */}
                {phase === 'capturing' && (
                  <div>
                    <div className="flex justify-between text-xs text-dark-400 mb-2">
                      <span>Capturing face frames…</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {phase === 'idle' || phase === 'error' ? (
                    <button
                      onClick={startCapture}
                      className="btn-primary flex-1"
                      id="start-capture-btn"
                    >
                      <Camera size={18} />
                      {user?.faceRegistered ? 'Update Face Registration' : 'Start Face Capture'}
                    </button>
                  ) : phase === 'capturing' ? (
                    <button onClick={reset} className="btn-secondary flex-1">
                      Cancel
                    </button>
                  ) : phase === 'processing' ? (
                    <button disabled className="btn-primary flex-1 opacity-75">
                      <Loader size={18} className="animate-spin" />
                      Processing…
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

import { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';

const MODEL_URL = '/models';

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

/**
 * FaceCamera — shared webcam + face detection component
 *
 * Props:
 *  - mode: 'register' | 'verify'
 *  - onDescriptor(descriptor: Float32Array): called when a face is detected
 *  - isVerified: boolean (verify mode — shows success/fail overlay)
 *  - verifyResult: { verified, confidence } | null
 */
export default function FaceCamera({ mode = 'register', onDescriptor, isVerified, verifyResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [status, setStatus] = useState('idle'); // idle | loading | ready | detecting | error
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Load models ──
  useEffect(() => {
    loadModels()
      .then(() => setModelLoading(false))
      .catch(() => setError('Failed to load face recognition models. Ensure /models/ folder is set up.'));
  }, []);

  // ── Start camera ──
  useEffect(() => {
    if (modelLoading) return;

    const startCamera = async () => {
      try {
        setStatus('loading');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setStatus('ready');
        }
      } catch (err) {
        setError('Camera access denied. Please allow camera access and refresh.');
        setStatus('error');
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [modelLoading]);

  // ── Detection loop ──
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || status !== 'ready') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection) {
        setFaceDetected(true);
        const resized = faceapi.resizeResults(detection, displaySize);

        // Draw bounding box
        const box = resized.detection.box;
        const isGood = detection.detection.score > 0.8;
        ctx.strokeStyle = isGood ? '#10B981' : '#F59E0B';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Corner accents
        const cornerLen = 20;
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 4;
        [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].forEach(([cx, cy], i) => {
          ctx.beginPath();
          ctx.moveTo(cx + (i % 2 === 1 ? -cornerLen : 0), cy);
          ctx.lineTo(cx + (i % 2 === 1 ? 0 : cornerLen), cy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy + (i >= 2 ? -cornerLen : 0));
          ctx.lineTo(cx, cy + (i >= 2 ? 0 : cornerLen));
          ctx.stroke();
        });

        // Confidence label
        ctx.fillStyle = '#3B82F6';
        ctx.fillRect(box.x, box.y - 24, 120, 20);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`${Math.round(detection.detection.score * 100)}% confidence`, box.x + 6, box.y - 9);

        // Emit descriptor
        if (onDescriptor) {
          onDescriptor(Array.from(detection.descriptor));
        }
      } else {
        setFaceDetected(false);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch {
      // Silently ignore frame errors
    }
  }, [status, onDescriptor]);

  useEffect(() => {
    if (status === 'ready') {
      intervalRef.current = setInterval(runDetection, 200);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, runDetection]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-dark-800/50 rounded-2xl border border-red-500/30 text-center">
        <AlertTriangle size={40} className="text-red-400" />
        <div>
          <p className="text-red-400 font-semibold">Camera Error</p>
          <p className="text-dark-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Camera frame */}
      <div className="relative rounded-2xl overflow-hidden bg-dark-900 border-2 border-dark-700 shadow-2xl"
        style={{ aspectRatio: '4/3' }}>

        {/* Loading overlay */}
        {(modelLoading || status === 'loading') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark-900 z-10">
            <Loader size={32} className="text-primary-500 animate-spin" />
            <p className="text-dark-400 text-sm">
              {modelLoading ? 'Loading face recognition models…' : 'Starting camera…'}
            </p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror
        />
        <canvas
          ref={canvasRef}
          className="face-canvas-overlay"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Scan line */}
        {status === 'ready' && (
          <div className="scan-line" />
        )}

        {/* Verification Result Overlay */}
        {verifyResult !== null && verifyResult !== undefined && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3
            ${verifyResult.verified
              ? 'bg-emerald-900/80 border-4 border-emerald-500'
              : 'bg-red-900/80 border-4 border-red-500'
            } transition-all duration-300`}>
            {verifyResult.verified ? (
              <>
                <CheckCircle size={64} className="text-emerald-400" />
                <p className="text-emerald-300 font-bold text-xl">Verified!</p>
                <p className="text-emerald-400 text-sm">{verifyResult.confidence}% confidence</p>
              </>
            ) : (
              <>
                <XCircle size={64} className="text-red-400" />
                <p className="text-red-300 font-bold text-xl">Not Matched</p>
                <p className="text-red-400 text-sm">Please try again</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className={`mt-3 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300
        ${faceDetected
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-dark-800 text-dark-400 border border-dark-700'
        }`}>
        <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-emerald-400 animate-pulse' : 'bg-dark-600'}`} />
        {faceDetected ? 'Face detected — hold still' : 'Position your face in the frame'}
      </div>
    </div>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FaceRegister from './pages/FaceRegister';
import MarkAttendance from './pages/MarkAttendance';
import AttendanceHistory from './pages/AttendanceHistory';
import AdminDashboard from './pages/AdminDashboard';
import AdminEmployees from './pages/AdminEmployees';
import AdminReports from './pages/AdminReports';
import AdminFaceRegister from './pages/AdminFaceRegister';
import ChangePassword from './pages/ChangePassword';
import AdminSettings from './pages/AdminSettings';
import AdminDepartments from './pages/AdminDepartments';

// ── Route Guards ──────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  return children;
};

// ── Loading Screen ────────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-dark-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-dark-400 text-sm">Loading...</p>
    </div>
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

      {/* Employee Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/mark-attendance" element={<ProtectedRoute><MarkAttendance /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><AttendanceHistory /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/employees" element={<AdminRoute><AdminEmployees /></AdminRoute>} />
      <Route path="/admin/face-register" element={<AdminRoute><AdminFaceRegister /></AdminRoute>} />
      <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
      <Route path="/admin/attendance" element={<AdminRoute><AttendanceHistory isAdmin /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
      <Route path="/admin/departments" element={<AdminRoute><AdminDepartments /></AdminRoute>} />

      {/* Catch-all */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

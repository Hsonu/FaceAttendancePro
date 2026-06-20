import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Key, Eye, EyeOff, Lock, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await authAPI.changePassword({
        currentPassword,
        newPassword,
      });

      if (data.success) {
        toast.success('Password changed successfully!');
        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Redirect based on role
        setTimeout(() => {
          navigate(user?.role === 'admin' ? '/admin' : '/dashboard');
        }, 1500);
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Current password incorrect or server error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-950 text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar title="Security Settings" />

        <main className="flex-1 p-6 lg:p-8 flex items-center justify-center">
          <div className="w-full max-w-md glass-card p-8 space-y-6 animate-slide-up">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-primary-600/10 rounded-2xl text-primary-400 mb-4 border border-primary-500/20">
                <Key size={28} />
              </div>
              <h2 className="text-2xl font-bold text-white">Change Password</h2>
              <p className="text-dark-400 text-sm mt-1">
                Secure your account by updating your credentials
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Current Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-dark-900/50 border border-dark-800 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-dark-600 focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-dark-900/50 border border-dark-800 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-dark-600 focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="Min. 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-dark-900/50 border border-dark-800 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-dark-600 focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="Re-type new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-primary-600/20 active:scale-[0.98] mt-6"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={16} />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

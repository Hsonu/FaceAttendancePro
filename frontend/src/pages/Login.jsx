import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Scan, Lock, Mail, ArrowRight, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      return toast.error('Please fill in all fields');
    }
    setLoading(true);
    try {
      const data = await login(form);
      if (data.success) {
        toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
        navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-100/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-dark-50 rounded-2xl mb-4 shadow-lg shadow-dark-50/10">
            <Scan size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-dark-50 tracking-tight">AttendEase</h1>
          <p className="text-dark-400 mt-2">Employee Attendance System</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-dark-50">Sign In</h2>
            <p className="text-dark-400 text-sm mt-1">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="form-input pl-10 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 h-12 text-base"
              id="login-submit-btn"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>


        </div>

        <p className="text-center text-dark-600 text-xs mt-6">
          © {new Date().getFullYear()} AttendEase. All rights reserved.
        </p>
      </div>
    </div>
  );
}

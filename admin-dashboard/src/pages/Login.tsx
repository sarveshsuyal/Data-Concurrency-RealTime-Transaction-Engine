import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Lock, Mail, AlertCircle, ArrowRight, Server } from 'lucide-react';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@datacore.io');
  const [password, setPassword] = useState('AdminPassword123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'waking'>('checking');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    api.checkHealth()
      .then(() => {
        if (mounted) setBackendStatus('connected');
      })
      .catch(() => {
        if (mounted) setBackendStatus('waking');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.login(email, password);
      if (data.user.role !== 'ADMIN') {
        setError('Access denied. Administrator privileges are required.');
        setLoading(false);
        return;
      }
      localStorage.setItem('datacore_admin_token', data.access);
      localStorage.setItem('datacore_admin_user', JSON.stringify(data.user));
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError(
          err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          'Invalid credentials. Please verify your email and password.'
        );
      } else if (!err.response) {
        setError(
          'Unable to reach backend API. If the free Render service was asleep, it may take 30–50s to wake up. Please wait a few seconds and try again.'
        );
      } else {
        setError(
          err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          `Connection error (${err.response?.status}). Please try again.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-xl shadow-brand-500/20 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">DataCore Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-Time Data Concurrency & Transaction Administration
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Administrator Sign In</h2>
              <p className="text-xs text-slate-400 mt-1">
                Protected interface for concurrency and database observability
              </p>
            </div>
            {/* Live Backend Indicator Badge */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              <span className={backendStatus === 'connected' ? 'text-emerald-400' : 'text-amber-300'}>
                {backendStatus === 'connected' ? 'API Live' : 'API Waking'}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@datacore.io"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-brand-600/30"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Default Seed: <span className="text-slate-300 font-mono">admin@datacore.io</span> / <span className="text-slate-300 font-mono">AdminPassword123!</span>
            </p>
            <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1">
              <Server className="w-3 h-3 text-slate-400" />
              <span>Target: https://datacore-backend-wktd.onrender.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

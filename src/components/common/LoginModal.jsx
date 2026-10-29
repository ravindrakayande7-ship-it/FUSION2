import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, X, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export const LoginModal = ({ isOpen, onClose }) => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const quickCredentials = [
    { label: 'Owner', email: 'owner@fusioncoffee.in', role: 'Owner' },
    { label: 'Manager', email: 'manager@fusioncoffee.in', role: 'Manager' },
    { label: 'Cashier', email: 'cashier@fusioncoffee.in', role: 'Cashier' },
    { label: 'Barista', email: 'barista@fusioncoffee.in', role: 'Barista' },
  ];

  const handleQuickFill = (cred) => {
    setEmail(cred.email);
    setPassword('password123');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await login(email.trim(), password);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E8DFD8] overflow-hidden">
        {/* Header */}
        <div className="bg-[#1C100B] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E29D62] to-[#B86B27] flex items-center justify-center text-[#1C100B] font-bold shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide text-white">Staff Sign In</h3>
              <p className="text-xs text-[#C8B2A6]">Secure JWT Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A68A78] hover:text-white hover:bg-[#2A1810] rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Quick Demo Credentials */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#8C6D58] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#C87D32]" /> Quick Select Staff Account
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {quickCredentials.map((c) => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => handleQuickFill(c)}
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                    email === c.email
                      ? 'bg-[#2C1810] text-white border-[#2C1810] shadow-xs'
                      : 'bg-[#FAF7F2] text-[#5C4538] border-[#E8DFD8] hover:bg-[#F2ECE4]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#2C1810] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C6D58] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@fusioncoffee.in"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] focus:outline-none focus:border-[#C87D32] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C1810] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C6D58] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2 text-xs bg-[#FAF7F2] border border-[#E5DDD5] rounded-xl text-[#2C1810] focus:outline-none focus:border-[#C87D32] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C6D58] hover:text-[#2C1810]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#8C6D58]">
                Default demo pass: <code className="bg-[#F5EFEB] px-1 py-0.5 rounded text-[#2C1810]">password123</code>
              </span>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2C1810] hover:bg-[#432519] rounded-xl shadow-xs transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#FAF7F2] border-t border-[#E8DFD8] text-[11px] text-[#8C6D58] text-center">
          Backend verified with bcrypt hash matching &amp; JWT Bearer authorization.
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

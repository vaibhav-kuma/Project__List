'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Mail, Phone, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function LoginForm() {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const { login, loading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({
        email: loginMethod === 'email' ? email : undefined,
        phone: loginMethod === 'phone' ? phone : undefined,
        password,
        twoFactorCode: showTwoFactor ? twoFactorCode : undefined,
      });
    } catch (err: any) {
      if (err?.requiresTwoFactor) {
        setShowTwoFactor(true);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="flex gap-2 bg-gray-800/50 rounded-xl p-1.5">
        <button
          type="button"
          onClick={() => setLoginMethod('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            loginMethod === 'email'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        <button
          type="button"
          onClick={() => setLoginMethod('phone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            loginMethod === 'phone'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Phone className="w-4 h-4" />
          Phone
        </button>
      </div>

      {loginMethod === 'email' ? (
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1.5">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
            required
          />
        </div>
      ) : (
        <div>
          <label htmlFor="login-phone" className="block text-sm font-medium text-gray-300 mb-1.5">
            Phone number
          </label>
          <input
            id="login-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
            required
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-300">
            Password
          </label>
          <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showTwoFactor && (
        <div className="animate-fadeIn">
          <label htmlFor="2fa" className="block text-sm font-medium text-gray-300 mb-1.5">
            Two-factor authentication code
          </label>
          <input
            id="2fa"
            type="text"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 text-center text-2xl tracking-[0.5em] font-mono"
            required
          />
          <p className="text-xs text-gray-500 mt-1.5 text-center">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-4 h-4 border border-gray-600 rounded peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all duration-200 group-hover:border-gray-500">
              {rememberMe && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in...
          </>
        ) : showTwoFactor ? (
          'Verify code'
        ) : (
          'Sign in'
        )}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700/50" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-gray-900 px-3 text-gray-500">or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl hover:bg-gray-700/50 transition-all duration-200 group"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Google</span>
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl hover:bg-gray-700/50 transition-all duration-200 group"
        >
          <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Apple</span>
        </button>
      </div>
    </form>
  );
}

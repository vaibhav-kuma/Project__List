'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import { Video, Loader2 } from 'lucide-react';

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-indigo-950/30 to-gray-950" />
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
    </div>
  );
}

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/chat');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <AnimatedBackground />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4 backdrop-blur-sm">
            <Video className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1.5">Ninor</h1>
          <p className="text-gray-500 text-sm">Connect with people through video chat</p>
        </div>

        <div className="backdrop-blur-xl bg-gray-900/70 border border-gray-800/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20">
          <div className="flex mb-6 bg-gray-800/50 rounded-xl p-1.5">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isLogin
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                !isLogin
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Register
            </button>
          </div>

          <div className="transition-all duration-300">
            {isLogin ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          By using Ninor you agree to our{' '}
          <a href="/terms" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Privacy Policy</a>
        </p>
      </div>
    </main>
  );
}

"use client";
import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();


  
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to reset password.");
      return;
    }
    setLoading(true);
    setError('');
    setResetMessage('');
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      const dv = localStorage.getItem('defaultView');
      if (dv && dv.startsWith('/')) {
         router.push(dv);
      } else {
         router.push(dv && dv !== 'new' ? '/?view=' + dv : '/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="OAG Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Office of Auditor General's AP and CL
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}
        {resetMessage && (
          <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm">
            {resetMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-slate-200"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-slate-200"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                Keep me logged in
              </label>
            </div>
            
            {!isRegistering && (
              <button 
                type="button" 
                onClick={handleForgotPassword} 
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
          >
            {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>


      </div>
    </div>
  );
}

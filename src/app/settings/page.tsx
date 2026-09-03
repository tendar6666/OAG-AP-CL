"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Bell, User, Lock, Monitor, Smartphone, RefreshCw, Send, CheckCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import * as api from '@/lib/api';
import { updatePassword } from 'firebase/auth';

export default function SettingsPage() {
  const { user, firebaseUser, setUser } = useAuth();
  const { theme, setThemeValue } = useTheme();
  
  const [ntfyTopic, setNtfyTopic] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [defaultView, setDefaultView] = useState('projects');

  useEffect(() => {
    if (user?.id) {
      api.getOrCreateNtfyTopic(user.id, (user as any).ntfyTopic).then(topic => setNtfyTopic(topic));
    }
    const savedView = localStorage.getItem('defaultView');
    if (savedView) setDefaultView(savedView);
  }, [user]);

  const handleRegenerateTopic = async () => {
    if (!window.confirm("Are you sure? You will need to re-subscribe on your devices to the new channel.")) return;
    setIsRegenerating(true);
    try {
      const newTopic = 'oag-audit-' + Math.random().toString(36).substring(2, 10);
      await api.updateUserNtfyTopic(user.id!, newTopic);
      setNtfyTopic(newTopic);
      setUser({ ...user, ntfyTopic: newTopic } as any);
      alert("Channel regenerated successfully!");
    } catch (e) {
      alert("Failed to regenerate channel.");
    }
    setIsRegenerating(false);
  };

  const handleTestNotification = async () => {
    if (!ntfyTopic) return;
    setIsSendingTest(true);
    try {
      await api.sendNtfyNotification(ntfyTopic, "Test Notification", "Your push notifications are working perfectly!");
      alert("Test notification sent! Check your device.");
    } catch (e) {
      alert("Failed to send test notification.");
    }
    setIsSendingTest(false);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput === user.name) return;
    
    // Admins can bypass this
    if (user.hierarchy_weight > 10 && user.nameChangedOnce) {
       alert("You have already changed your name once. Please contact an admin to change it again.");
       return;
    }

    setIsSavingName(true);
    try {
      await api.updateUserName(user.id!, nameInput.trim());
      setUser({ ...user, name: nameInput.trim(), nameChangedOnce: true });
      alert("Profile updated successfully!");
    } catch (e) {
      alert("Failed to update profile.");
    }
    setIsSavingName(false);
  };

  const handleSavePassword = async () => {
    if (passwordInput !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (passwordInput.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (!firebaseUser) return;
    
    setIsSavingPassword(true);
    try {
      await updatePassword(firebaseUser, passwordInput);
      setPasswordInput('');
      setConfirmPassword('');
      alert("Password updated successfully!");
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
         alert("For security reasons, you must log out and log back in before changing your password.");
      } else {
         alert("Failed to update password: " + e.message);
      }
    }
    setIsSavingPassword(false);
  };

  const handleDefaultViewChange = (val: string) => {
    setDefaultView(val);
    localStorage.setItem('defaultView', val);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
          <Settings className="text-indigo-600" size={32} />
          <span>Settings</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Personal Account & Preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Push Notifications */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col h-full">
           <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                <Bell size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Push Notifications (NTFY)</h2>
           </div>
           
           <div className="flex-1 flex flex-col items-center">
              {ntfyTopic ? (
                 <>
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 mb-4 inline-block">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://ntfy.sh/${ntfyTopic}`} alt="QR Code" className="w-32 h-32" />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-2">
                      Scan this QR code with the <a href="https://ntfy.sh" target="_blank" className="text-indigo-500 font-semibold hover:underline">NTFY app</a> to instantly subscribe to your private alerts channel.
                    </p>
                    <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex justify-between items-center mb-6 border border-slate-200 dark:border-slate-700">
                       <span className="text-xs font-mono text-slate-500">Channel ID:</span>
                       <span className="text-sm font-bold text-slate-700 dark:text-slate-300 select-all">{ntfyTopic}</span>
                    </div>
                    
                    <div className="w-full grid grid-cols-2 gap-3 mt-auto">
                       <button 
                         onClick={handleTestNotification}
                         disabled={isSendingTest}
                         className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                       >
                         <Send size={16} />
                         <span>Test Alert</span>
                       </button>
                       <button 
                         onClick={handleRegenerateTopic}
                         disabled={isRegenerating}
                         className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-semibold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                       >
                         <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
                         <span>Regenerate</span>
                       </button>
                    </div>
                 </>
              ) : (
                 <div className="flex-1 flex items-center justify-center">
                    <span className="animate-pulse text-slate-400">Loading channel...</span>
                 </div>
              )}
           </div>
        </div>

        <div className="flex flex-col space-y-8">
           {/* Display Preferences */}
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                 <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                   <Monitor size={24} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Display Preferences</h2>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Color Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                       <button 
                         onClick={() => setThemeValue('light')}
                         className={`py-2 text-sm font-medium rounded-lg border transition-colors ${theme === 'light' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                       >Light</button>
                       <button 
                         onClick={() => setThemeValue('dark')}
                         className={`py-2 text-sm font-medium rounded-lg border transition-colors ${theme === 'dark' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                       >Dark</button>
                       <button 
                         onClick={() => setThemeValue('system')}
                         className={`py-2 text-sm font-medium rounded-lg border transition-colors ${theme === 'system' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                       >System Default</button>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Default Starting View</label>
                    <p className="text-xs text-slate-500 mb-3">Choose which screen opens automatically when you log in.</p>
                    <select 
                       value={defaultView}
                       onChange={(e) => handleDefaultViewChange(e.target.value)}
                       className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                       <option value="new">Create New AP</option>
                       <option value="projects">Saved Audit Programs</option>
                       <option value="extend">Extend AP & CL</option>
                       <option value="calendar">My Calendar</option>
                       <option value="templates">Saved Templates</option>
                       <option value="analytics">System Analytics</option>
                       {user.hierarchy_weight <= 30 && (
                          <option value="/admin">Admin Dashboard</option>
                       )}
                    </select>
                 </div>
              </div>
           </div>

           {/* Personal Profile & Security */}
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                 <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                   <Lock size={24} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Security & Profile</h2>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Display Name</label>
                    <div className="flex space-x-3">
                       <input 
                         type="text" 
                         value={nameInput}
                         onChange={(e) => setNameInput(e.target.value)}
                         className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                       />
                       <button 
                         onClick={handleSaveName}
                         disabled={isSavingName || nameInput === user.name}
                         className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm"
                       >
                         Save
                       </button>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Change Password</label>
                    <div className="space-y-3 mb-3">
                       <input 
                         type="password" 
                         placeholder="New Password (min. 6 chars)"
                         value={passwordInput}
                         onChange={(e) => setPasswordInput(e.target.value)}
                         className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                       />
                       <input 
                         type="password" 
                         placeholder="Confirm New Password"
                         value={confirmPassword}
                         onChange={(e) => setConfirmPassword(e.target.value)}
                         className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                       />
                    </div>
                    <button 
                      onClick={handleSavePassword}
                      disabled={isSavingPassword || !passwordInput || passwordInput !== confirmPassword}
                      className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm"
                    >
                      Update Password
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

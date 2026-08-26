
"use client";

import React from 'react';
import { Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
          <Settings className="text-indigo-600" size={32} />
          <span>Settings</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg">System Configuration & Management</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col items-center justify-center p-12 text-center">
         <Settings size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
         <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Settings Moved</h2>
         <p className="text-slate-500 max-w-md">
            Management of Financial Years and Audit Units has been moved to the <strong>Admin Dashboard</strong> for better security and organization. 
         </p>
         {user && user.hierarchy_weight <= 10 && (
            <p className="text-sm text-indigo-500 mt-4 font-medium">Please use the "Units Management" and "Custom Financial Years" tabs in your Admin Dashboard.</p>
         )}
      </div>
    </div>
  );
}

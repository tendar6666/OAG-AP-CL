"use client";

import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Building2, Calendar, FileText, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  getFinancialYears, createFinancialYear, updateFinancialYear, 
  getUnits, createUnit, updateUnit, 
  FinancialYear, AuditUnit 
} from '@/lib/api';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  
  const [fys, setFys] = useState<FinancialYear[]>([]);
  const [units, setUnits] = useState<AuditUnit[]>([]);
  
  const [loading, setLoading] = useState(true);

  // FY State
  const [newFyName, setNewFyName] = useState('');
  const [newFyStart, setNewFyStart] = useState('');
  const [newFyEnd, setNewFyEnd] = useState('');
  const [newFyActive, setNewFyActive] = useState(false);

  // Unit State
  const [newUnitFile, setNewUnitFile] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitFile, setEditUnitFile] = useState('');
  const [editUnitName, setEditUnitName] = useState('');

  // Fetch Data
  useEffect(() => {
    if (user.hierarchy_weight <= 20) {
      Promise.all([getFinancialYears(), getUnits()])
        .then(([fysData, unitsData]) => {
          setFys(fysData);
          setUnits(unitsData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handlers
  const handleCreateFY = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFyName || !newFyStart || !newFyEnd) return;
    
    try {
      await createFinancialYear({
        name: newFyName,
        start_date: newFyStart,
        end_date: newFyEnd,
        is_active: newFyActive
      });
      // Refresh list
      const data = await getFinancialYears();
      setFys(data);
      
      setNewFyName('');
      setNewFyStart('');
      setNewFyEnd('');
      setNewFyActive(false);
    } catch (error) {
      console.error(error);
      alert('Failed to create Financial Year');
    }
  };

  const handleSetActiveFY = async (fy: FinancialYear) => {
    if (!fy.id) return;
    try {
      await updateFinancialYear(fy.id, { ...fy, is_active: true });
      const data = await getFinancialYears();
      setFys(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitFile || !newUnitName) return;
    
    try {
      await createUnit({
        file_number: newUnitFile,
        name: newUnitName
      });
      const data = await getUnits();
      setUnits(data);
      
      setNewUnitFile('');
      setNewUnitName('');
    } catch (error) {
      console.error(error);
      alert('Failed to create Unit');
    }
  };

  const handleEditUnit = (unit: AuditUnit) => {
    if (!unit.id) return;
    setEditingUnitId(unit.id);
    setEditUnitFile(unit.file_number);
    setEditUnitName(unit.name);
  };

  const handleSaveUnit = async () => {
    if (!editingUnitId) return;
    try {
      await updateUnit(editingUnitId, { file_number: editUnitFile, name: editUnitName });
      const data = await getUnits();
      setUnits(data);
      setEditingUnitId(null);
    } catch (error) {
      console.error(error);
      alert('Failed to update Unit');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10">Loading settings...</div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-10">
      
      {/* User Profile Settings */}
      <section>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">User Profile</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Update your personal information.</p>
          </div>
        </div>
        
        <div className="glass-panel rounded-2xl p-6 shadow-sm border border-[var(--border)] max-w-md">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
          <input 
            type="text" 
            value={user.name}
            onChange={e => setUser({ ...user, name: e.target.value })}
            placeholder="Enter your full name"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
          />
        </div>
      </section>

      {/* Divider */}
      <div className="h-px w-full bg-slate-200 dark:bg-slate-800/80 my-8"></div>

      {user.hierarchy_weight > 20 ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-center space-y-3 glass-panel p-10 rounded-3xl border border-rose-200 dark:border-rose-900/50">
            <ShieldAlert size={48} className="mx-auto text-rose-500" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">System Administration Restricted</h2>
            <p className="text-slate-500 max-w-sm">Only Administrators can access the system settings to manage Financial Years and Audit Units.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Financial Year Settings */}
      <section>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Financial Years</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage the operational fiscal years for all audit programs.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden shadow-sm border border-[var(--border)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-[var(--border)] text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Name</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Start Date</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">End Date</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fys.map(fy => (
                  <tr key={fy.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{fy.name}</td>
                    <td className="px-6 py-4 text-slate-500">{fy.start_date}</td>
                    <td className="px-6 py-4 text-slate-500">{fy.end_date}</td>
                    <td className="px-6 py-4 text-center">
                      {fy.is_active ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 size={12} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!fy.is_active && (
                        <button 
                          onClick={() => handleSetActiveFY(fy)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors"
                        >
                          Set Active
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {fys.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No Financial Years configured yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Create Form */}
          <div className="glass-panel rounded-2xl p-6 shadow-sm border border-[var(--border)] h-fit">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center space-x-2">
              <Plus size={18} className="text-indigo-500" />
              <span>New Financial Year</span>
            </h3>
            <form onSubmit={handleCreateFY} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">FY Name</label>
                <input 
                  required type="text" placeholder="e.g. 2025-2026" 
                  value={newFyName} onChange={e => setNewFyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                  <input 
                    required type="date" 
                    value={newFyStart} onChange={e => setNewFyStart(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                  <input 
                    required type="date" 
                    value={newFyEnd} onChange={e => setNewFyEnd(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
              </div>
              <label className="flex items-center space-x-3 cursor-pointer mt-2">
                <input 
                  type="checkbox" 
                  checked={newFyActive} onChange={e => setNewFyActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" 
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Set as Active Financial Year</span>
              </label>
              <button type="submit" className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-sm">
                Create Financial Year
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px w-full bg-slate-200 dark:bg-slate-800/80 my-8"></div>

      {/* Unit Settings */}
      <section>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Audit Units</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage the institutions and departments subject to audit.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden shadow-sm border border-[var(--border)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-[var(--border)] text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">File Number</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Unit Name</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map(unit => (
                  <tr key={unit.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    {editingUnitId === unit.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            value={editUnitFile} 
                            onChange={e => setEditUnitFile(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            value={editUnitName} 
                            onChange={e => setEditUnitName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-right space-x-3">
                          <button onClick={handleSaveUnit} className="text-emerald-600 hover:text-emerald-800 font-medium text-xs transition-colors">Save</button>
                          <button onClick={() => setEditingUnitId(null)} className="text-slate-400 hover:text-slate-600 font-medium text-xs transition-colors">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-mono text-slate-500">{unit.file_number}</td>
                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center font-bold text-xs">
                              {unit.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span>{unit.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleEditUnit(unit)} className="text-slate-400 hover:text-indigo-600 transition-colors font-medium text-xs">Edit</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {units.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No Audit Units configured yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Create Form */}
          <div className="glass-panel rounded-2xl p-6 shadow-sm border border-[var(--border)] h-fit">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center space-x-2">
              <Plus size={18} className="text-emerald-500" />
              <span>New Audit Unit</span>
            </h3>
            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">File Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText size={14} />
                  </div>
                  <input 
                    required type="text" placeholder="e.g. DOH-001" 
                    value={newUnitFile} onChange={e => setNewUnitFile(e.target.value)}
                    className="w-full pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 size={14} />
                  </div>
                  <input 
                    required type="text" placeholder="e.g. Department of Health" 
                    value={newUnitName} onChange={e => setNewUnitName(e.target.value)}
                    className="w-full pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-sm">
                Create Audit Unit
              </button>
            </form>
          </div>
        </div>
        </section>
        </>
      )}

    </div>
  );
}

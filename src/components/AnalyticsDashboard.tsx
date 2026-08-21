"use client";

import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { AuditUnit } from '@/lib/api';

interface CustomFY {
  id: string;
  name: string;
}

interface AnalyticsDashboardProps {
  projects: any[];
  units: AuditUnit[];
  recentFYs: string[];
  customFys: CustomFY[];
  userRole: number;
  onAdminOverride: (unit: AuditUnit, targetFY: string, execFY: string) => void;
  onAdminRevert?: (project: any) => void;
  onLoadMoreFuture?: () => void;
  onLoadMorePast?: () => void;
  globalTargetFY?: string;
  globalExecutionFY?: string;
  onGlobalTargetFYChange?: (val: string) => void;
  onGlobalExecutionFYChange?: (val: string) => void;
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

export default function AnalyticsDashboard({ 
  projects, 
  units, 
  recentFYs, 
  customFys,
  userRole,
  onAdminOverride,
  onAdminRevert,
  onLoadMoreFuture,
  onLoadMorePast,
  globalTargetFY = 'ALL',
  globalExecutionFY = 'ALL',
  onGlobalTargetFYChange,
  onGlobalExecutionFYChange
}: AnalyticsDashboardProps) {

  const targetFY = globalTargetFY;
  const executionFY = globalExecutionFY;

  // Compare FY strings chronologically, e.g. "FY 2024-2025" vs "FY 2025-2026"
  const compareFY = (fy1: string, fy2: string) => {
    const getStartYear = (fy: string) => parseInt(fy.replace('FY ', '').split('-')[0]) || 0;
    return getStartYear(fy1) - getStartYear(fy2);
  };

  const analyticsData = useMemo(() => {
    // 1. Calculate Expected Units for the Target FY
    const expectedUnits = units.filter(u => {
      if (u.is_active === false) return false;
      // If no active_from_fy, assume it's always been active
      if (!u.active_from_fy) return true;
      // Active if targetFY is >= active_from_fy
      if (targetFY === 'ALL') return true;
      return compareFY(targetFY, u.active_from_fy) >= 0;
    });

    // 2. Filter Projects for the Target FY (and optionally Execution FY)
    const matchingProjects = projects.filter(p => {
      const pTargetFY = p.metadata?.financialYear;
      if (targetFY !== 'ALL' && pTargetFY !== targetFY) return false;
      
      if (executionFY !== 'ALL') {
        const pExecFY = p.metadata?.executionFY;
        if (pExecFY !== executionFY) return false;
      }
      return true;
    });

    // 3. Match Units to their Status
    const unitStatuses = expectedUnits.map(unit => {
      const project = matchingProjects.find(p => {
        const pName = (p.metadata?.unitName || '').trim().toLowerCase();
        const uName = (unit.name || '').trim().toLowerCase();
        const fNum = (unit.file_number || '').trim().toLowerCase();
        return pName === uName || 
               (fNum && pName === `${fNum} ${uName}`) ||
               pName.includes(uName);
      });
      return {
        unit,
        status: project ? project.status : 'Not Started',
        project
      };
    });

    // Categorize
    const completed = unitStatuses.filter(u => u.status === 'Audited');
    const pendingApproval = unitStatuses.filter(u => u.status === 'Pending Approval' || u.status === 'Extension Supported');
    const inProgress = unitStatuses.filter(u => u.status === 'Draft' || u.status === 'Pending Support' || u.status === 'Extension Requested' || u.status === 'Submitted');
    const notStarted = unitStatuses.filter(u => u.status === 'Not Started');

    const total = expectedUnits.length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // Branch Breakdown
    const branches = ['Head Office', 'Dekyiling Branch', 'Nepal Branch', 'South Branch'];
    const branchData = branches.map(branch => {
      const branchUnits = unitStatuses.filter(u => (u.unit.branch || 'Head Office') === branch);
        return {
          name: branch.replace(' Branch', ''),
          Completed: branchUnits.filter(u => u.status === 'Audited').length,
          'In Progress': branchUnits.filter(u => u.status !== 'Audited' && u.status !== 'Not Started').length,
          Pending: branchUnits.filter(u => u.status === 'Not Started').length,
        };
    }).filter(b => b.Completed > 0 || b['In Progress'] > 0 || b.Pending > 0);

    return {
      expectedUnits,
      completed,
      pendingApproval,
      inProgress,
      notStarted,
      total,
      completionRate,
      branchData
    };
  }, [projects, units, targetFY, executionFY]);

  const pieData = [
    { name: 'Completed', value: analyticsData.completed.length },
    { name: 'Pending Approval', value: analyticsData.pendingApproval.length },
    { name: 'In Progress', value: analyticsData.inProgress.length },
    { name: 'Not Started', value: analyticsData.notStarted.length },
  ].filter(d => d.value > 0);

  const handleExportPDF = async () => {
    // Dynamically load html2pdf
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('analytics-dashboard-content');
    
    // html2canvas (used by html2pdf) crashes on modern CSS color functions like lab() or oklch()
    // We temporarily monkey-patch getComputedStyle to provide a safe grayscale fallback for these colors
    // that preserves the original lightness (L) and alpha transparency.
    const safeColorFallback = (val: any) => {
      if (typeof val !== 'string') return val;
      if (!val.includes('oklch') && !val.includes('lab') && !val.includes('lch') && !val.includes('color(display-p3')) return val;

      return val.replace(/(oklch|lab|oklab|lch)\(([^)]+)\)/g, (match, func, args) => {
          const nums = args.match(/[0-9.]+/g);
          if (!nums || nums.length < 1) return 'rgb(128,128,128)';
          let L = parseFloat(nums[0]);
          if (func.includes('oklch') && !args.includes('%') && L <= 1) {
              // L is 0-1
          } else {
              L = L / 100;
          }
          const gray = Math.max(0, Math.min(255, Math.round(L * 255)));
          let a = 1;
          if (args.includes('/')) {
              const afterSlash = args.split('/')[1];
              const alphaNums = afterSlash.match(/[0-9.]+/);
              if (alphaNums) a = parseFloat(alphaNums[0]);
          }
          return `rgba(${gray}, ${gray}, ${gray}, ${a})`;
      }).replace(/color\(display-p3\s+([^)]+)\)/g, (match, args) => {
          const nums = args.match(/[0-9.]+/g);
          if (!nums || nums.length < 3) return 'rgb(128,128,128)';
          const r = Math.round(parseFloat(nums[0]) * 255);
          const g = Math.round(parseFloat(nums[1]) * 255);
          const b = Math.round(parseFloat(nums[2]) * 255);
          let a = 1;
          if (args.includes('/')) {
              const afterSlash = args.split('/')[1];
              const alphaNums = afterSlash.match(/[0-9.]+/);
              if (alphaNums) a = parseFloat(alphaNums[0]);
          }
          return `rgba(${r}, ${g}, ${b}, ${a})`;
      });
    };

    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(el, pseudoElt) {
      const style = originalGetComputedStyle(el, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          const val = target[prop as keyof CSSStyleDeclaration];
          if (typeof val === 'function') {
            return function(...args: any[]) {
              // @ts-ignore
              const res = val.apply(target, args);
              return safeColorFallback(res);
            };
          }
          return safeColorFallback(val as any);
        }
      });
    };

    const opt = {
      margin:       0.5,
      filename:     `Audit_Report_${targetFY}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    
    try {
      await html2pdf().set(opt as any).from(element as any).save();
    } finally {
      window.getComputedStyle = originalGetComputedStyle;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header and Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Analytics & Reporting</h2>
        <button 
          onClick={handleExportPDF}
          className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-semibold shadow hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
        >
          Export as PDF
        </button>
      </div>

      <div id="analytics-dashboard-content" className="space-y-6">

      {/* Big Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Expected Units</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{analyticsData.total}</h3>
          <p className="text-xs text-slate-400 mt-1">Active on or before {targetFY}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle size={16} /> Completed Audits
          </p>
          <h3 className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{analyticsData.completed.length}</h3>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">{analyticsData.completionRate}% of target</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock size={16} /> In Progress
          </p>
          <h3 className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {analyticsData.inProgress.length + analyticsData.pendingApproval.length}
          </h3>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">Currently being audited</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-xl border border-rose-100 dark:border-rose-800 shadow-sm">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertTriangle size={16} /> Pending (Not Started)
          </p>
          <h3 className="text-3xl font-bold text-rose-700 dark:text-rose-300 mt-1">{analyticsData.notStarted.length}</h3>
          <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-1">Needs attention</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Overall Status</h3>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No data available</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Branch Performance</h3>
          <div className="h-64">
            {analyticsData.branchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.branchData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Legend />
                  <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Pending" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* The Naughty List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-900/10 flex justify-between items-center">
          <h3 className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <ShieldAlert size={18} /> Units Pending Audit ({targetFY})
          </h3>
          <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 text-xs font-bold px-2 py-1 rounded-full">
            {analyticsData.notStarted.length} Units
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 font-semibold">Unit Name</th>
                <th className="px-6 py-3 font-semibold">Branch</th>
                <th className="px-6 py-3 font-semibold">Active Since</th>
                {userRole <= 10 && <th className="px-6 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analyticsData.notStarted.length === 0 ? (
                <tr>
                  <td colSpan={userRole <= 10 ? 4 : 3} className="px-6 py-8 text-center text-slate-500">
                    Excellent! All expected units have been started or completed.
                  </td>
                </tr>
              ) : (
                analyticsData.notStarted.map(({ unit }) => (
                  <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{unit.name}</div>
                      <div className="text-xs text-slate-400">{unit.tibetan_name}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{unit.branch || 'Head Office'}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400 text-xs">{unit.active_from_fy || 'Always Active'}</td>
                    {userRole <= 10 && (
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => onAdminOverride(unit, targetFY, executionFY)}
                          className="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded text-xs font-semibold transition-colors"
                        >
                          Mark Audited (Override)
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* The Good List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/10 flex justify-between items-center">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle size={18} /> Audited Units ({targetFY})
          </h3>
          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded-full">
            {analyticsData.completed.length} Units
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 font-semibold">Unit Name</th>
                <th className="px-6 py-3 font-semibold">Branch</th>
                <th className="px-6 py-3 font-semibold">Auditor</th>
                {userRole <= 10 && onAdminRevert && <th className="px-6 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analyticsData.completed.length === 0 ? (
                <tr>
                  <td colSpan={userRole <= 10 && onAdminRevert ? 4 : 3} className="px-6 py-8 text-center text-slate-500">
                    No audited units found for this financial year yet.
                  </td>
                </tr>
              ) : (
                analyticsData.completed.map(({ unit, project }) => (
                  <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{unit.name}</div>
                      <div className="text-xs text-slate-400">
                        {project?.is_admin_override ? (
                           <span className="text-emerald-500 font-bold">Admin Override</span>
                        ) : 'Normal Submission'}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{unit.branch || 'Head Office'}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400 text-xs">{project?.metadata?.auditorName || 'N/A'}</td>
                    {userRole <= 10 && onAdminRevert && project && (
                      <td className="px-6 py-3 text-right">
                        {project?.is_admin_override ? (
                          <button
                            onClick={() => onAdminRevert(project)}
                            className="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded text-xs font-semibold transition-colors"
                          >
                            Remove Override
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if(window.confirm('For normal submissions, please use the "Track Audit Progress" tab to manage or delete the project. Proceed to Track Audit Progress?')) {
                                // Find the "Track Audit Progress" tab button and click it if possible, or just do nothing as it's informative
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 rounded text-xs font-semibold cursor-not-allowed"
                            title="Normal submissions should be managed in the Track Audit Progress tab."
                          >
                            Normal Sub.
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}

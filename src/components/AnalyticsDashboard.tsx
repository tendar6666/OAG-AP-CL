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
  unitTypes?: any[];
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
  unitTypes,
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

  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterAuditor, setFilterAuditor] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(units.map(u => u.branch).filter(Boolean))).sort();
  }, [units]);

  const uniqueAuditors = useMemo(() => {
    const auds = projects.map(p => p.metadata?.auditorName).filter(Boolean);
    return Array.from(new Set(auds)).sort();
  }, [projects]);

  // Compare FY strings chronologically, e.g. "FY 2024-2025" vs "FY 2025-2026"
  const compareFY = (fy1: string, fy2: string) => {
    const getStartYear = (fy: string) => parseInt(fy.replace('FY ', '').split('-')[0]) || 0;
    return getStartYear(fy1) - getStartYear(fy2);
  };

  const renderCategoryOptions = (parentId: string | null, depth: number): any[] => {
     return (unitTypes || []).filter(ut => ut.parent_id === parentId).flatMap(ut => {
         const indent = Array(depth).fill('\u00A0\u00A0\u00A0\u00A0').join('');
         const arrow = depth > 0 ? '\u21B3 ' : '';
         return [
            <option key={ut.id} value={ut.id as string}>{indent + arrow + ut.name}</option>,
            ...renderCategoryOptions(ut.id as string, depth + 1)
         ];
     });
  };

  const getAllChildTypeIds = (parentId: string): string[] => {
      let ids: string[] = [];
      const children = (unitTypes || []).filter(ut => ut.parent_id === parentId);
      children.forEach(c => {
          if (c.id) {
             ids.push(c.id);
             ids = ids.concat(getAllChildTypeIds(c.id));
          }
      });
      return ids;
  };

  const analyticsData = useMemo(() => {
    // 1. Calculate Expected Units for the Target FY and apply Branch & Name filters
    let expectedUnits = units.filter(u => {
      if (u.is_active === false) return false;
      // If no active_from_fy, assume it's always been active
      if (u.active_from_fy && targetFY !== 'ALL' && compareFY(targetFY, u.active_from_fy) < 0) return false;
      
      if (filterBranch !== 'ALL' && u.branch !== filterBranch) return false;
      if (filterType !== 'ALL') {
          if (filterType === 'UNCATEGORIZED') {
             if (u.unit_type_id) return false;
          } else {
             const validIds = [filterType, ...getAllChildTypeIds(filterType)];
             if (!validIds.includes(u.unit_type_id || '')) return false;
          }
      }
      if (filterName.trim() !== '') {
        const query = filterName.toLowerCase();
        const searchStr = `${u.file_number || ''} ${u.name || ''} ${u.tibetan_name || ''}`.toLowerCase();
        if (!searchStr.includes(query)) return false;
      }
      
      // If filtering by Auditor, only include this unit if this auditor actually HAS a project for it
      if (filterAuditor !== 'ALL') {
         const hasProjectForAuditor = projects.some(p => {
           if (p.metadata?.auditorName !== filterAuditor) return false;
           if (targetFY !== 'ALL' && p.metadata?.financialYear !== targetFY) return false;
           
           const pName = (p.metadata?.unitName || '').trim().toLowerCase();
           const uName = (u.name || '').trim().toLowerCase();
           const fNum = (u.file_number || '').trim().toLowerCase();
           return pName === uName || (fNum && pName === `${fNum} ${uName}`);
         });
         if (!hasProjectForAuditor) return false;
      }

      return true;
    });

    // 2. Filter Projects for the Target FY (and optionally Execution FY) and apply ALL filters
    const matchingProjects = projects.filter(p => {
      const pTargetFY = p.metadata?.financialYear;
      if (targetFY !== 'ALL' && pTargetFY !== targetFY) return false;
      
      if (executionFY !== 'ALL') {
        const pExecFY = p.metadata?.executionFY;
        if (pExecFY !== executionFY) return false;
      }

      if (filterAuditor !== 'ALL' && p.metadata?.auditorName !== filterAuditor) return false;
      
      // Match with unit to apply branch/name filters
      const pName = (p.metadata?.unitName || '').trim().toLowerCase();
      
      if (filterBranch !== 'ALL' || filterName.trim() !== '' || filterType !== 'ALL') {
        const unit = units.find(u => {
          const uName = (u.name || '').trim().toLowerCase();
          const fNum = (u.file_number || '').trim().toLowerCase();
          return pName === uName || (fNum && pName === `${fNum} ${uName}`);
        });
        
        if (filterBranch !== 'ALL' && unit?.branch !== filterBranch) return false;
        if (filterType !== 'ALL') {
           if (filterType === 'UNCATEGORIZED') {
               if (unit?.unit_type_id) return false;
           } else {
               const validIds = [filterType, ...getAllChildTypeIds(filterType)];
               if (!validIds.includes(unit?.unit_type_id || '')) return false;
           }
        }
        if (filterName.trim() !== '' && !pName.includes(filterName.toLowerCase())) return false;
      }

      return true;
    });

    // 3. Match Units to their Status
    const unitStatuses = expectedUnits.map(unit => {
      const projectsForUnit = matchingProjects.filter(p => {
        const pName = (p.metadata?.unitName || '').trim().toLowerCase();
        const uName = (unit.name || '').trim().toLowerCase();
        const fNum = (unit.file_number || '').trim().toLowerCase();
        return pName === uName || 
               (fNum && pName === `${fNum} ${uName}`);
      });

      if (projectsForUnit.length === 0) {
        return { unit, status: 'Not Started', projects: [] };
      }

      let hasInProgress = false;
      let hasPending = false;
      let hasCompleted = false;

      for (const p of projectsForUnit) {
        if (p.status === 'Audited') {
          hasCompleted = true;
        } else if (p.status === 'Pending Support' || p.status === 'Pending Approval' || p.status === 'Extension Supported') {
          hasPending = true;
        } else {
          hasInProgress = true;
        }
      }

      let aggregateStatus = 'Audited';
      if (hasInProgress) {
        aggregateStatus = 'Draft'; // Will map to In Progress category
      } else if (hasPending) {
        aggregateStatus = 'Pending Approval'; // Will map to Pending Approval category
      }

      return {
        unit,
        status: aggregateStatus,
        projects: projectsForUnit
      };
    });

    // Categorize
    const completed = unitStatuses.filter(u => u.status === 'Audited');
    const pendingApproval = unitStatuses.filter(u => u.status === 'Pending Approval' || u.status === 'Extension Supported');
    const inProgress = unitStatuses.filter(u => 
      u.status === 'Draft' || 
      u.status === 'Pending Support' || 
      u.status === 'Extension Requested' || 
      u.status === 'Submitted' ||
      u.status === 'Draft AP & CL Submitted' ||
      u.status === 'Draft AP & CL Supported' ||
      u.status === 'Draft AP & CL Approved'
    );
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
  }, [projects, units, unitTypes, targetFY, executionFY, filterName, filterBranch, filterAuditor, filterType]);

  const pieData = [
    { name: 'Completed', value: analyticsData.completed.length },
    { name: 'Pending Approval', value: analyticsData.pendingApproval.length },
    { name: 'In Progress', value: analyticsData.inProgress.length },
    { name: 'Not Started', value: analyticsData.notStarted.length },
  ].filter(d => d.value > 0);

  const handleExportPDF = async () => {
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 200)); // wait for DOM to expand lists

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
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header and Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Analytics & Reporting</h2>
        <button 
          onClick={handleExportPDF}
          disabled={isExporting}
          className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-semibold shadow hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export as PDF'}
        </button>
      </div>

      {/* Global Filter Bar - Hidden during PDF export */}
      {!isExporting && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Search Unit Name</label>
                <input 
                  type="text" 
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="e.g. Department of Finance" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                />
              </div>
              
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Unit Type</label>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                >
                  <option value="ALL">All Categories</option>
                  <option value="UNCATEGORIZED">Uncategorized</option>
                  {renderCategoryOptions(null, 0)}
                </select>
              </div>

              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter Branch</label>
                <select 
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                >
                  <option value="ALL">All Branches</option>
                  {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assigned Auditor</label>
                <select 
                  value={filterAuditor}
                  onChange={(e) => setFilterAuditor(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                >
                  <option value="ALL">All Auditors</option>
                  {uniqueAuditors.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            
            {/* Clear Filters Button */}
          {(filterName !== '' || filterBranch !== 'ALL' || filterAuditor !== 'ALL' || filterType !== 'ALL') && (
             <button 
                onClick={() => { setFilterName(''); setFilterBranch('ALL'); setFilterAuditor('ALL'); setFilterType('ALL'); }}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
             >
                Clear Filters
             </button>
          )}
        </div>
      )}

      <div id="analytics-dashboard-content" className="space-y-6">

      {/* Big Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Expected Units</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{analyticsData.total}</h3>
          <p className="text-xs text-slate-400 mt-1">Active on or before {targetFY}</p>
        </div>
        <div 
          onClick={() => document.getElementById('list-completed')?.scrollIntoView({behavior: 'smooth'})}
          className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm cursor-pointer hover:shadow-md hover:ring-2 hover:ring-emerald-500/50 transition-all"
        >
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle size={16} /> Completed Audits
          </p>
          <h3 className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{analyticsData.completed.length}</h3>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">{analyticsData.completionRate}% of target</p>
        </div>
        <div 
          onClick={() => document.getElementById('list-inprogress')?.scrollIntoView({behavior: 'smooth'})}
          className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm cursor-pointer hover:shadow-md hover:ring-2 hover:ring-amber-500/50 transition-all"
        >
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock size={16} /> In Progress
          </p>
          <h3 className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {analyticsData.inProgress.length + analyticsData.pendingApproval.length}
          </h3>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">Currently being audited</p>
        </div>
        <div 
          onClick={() => document.getElementById('list-pending')?.scrollIntoView({behavior: 'smooth'})}
          className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-xl border border-rose-100 dark:border-rose-800 shadow-sm cursor-pointer hover:shadow-md hover:ring-2 hover:ring-rose-500/50 transition-all"
        >
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
      <div id="list-pending" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-900/10 flex justify-between items-center">
          <h3 className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <ShieldAlert size={18} /> Units Pending Audit ({targetFY})
          </h3>
          <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 text-xs font-bold px-2 py-1 rounded-full">
            {analyticsData.notStarted.length} Units
          </span>
        </div>
        <div className={isExporting ? "" : "max-h-96 overflow-y-auto"}>
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
                      <div className="font-medium text-slate-800 dark:text-slate-200">{unit.file_number ? `${unit.file_number} ${unit.name}` : unit.name}</div>
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

      {/* The In Progress List */}
      <div id="list-inprogress" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10 flex justify-between items-center">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Clock size={18} /> In Progress Units ({targetFY})
          </h3>
          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded-full">
            {analyticsData.inProgress.length} Units
          </span>
        </div>
        <div className={isExporting ? "" : "max-h-96 overflow-y-auto"}>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 font-semibold">Unit Name</th>
                <th className="px-6 py-3 font-semibold">Branch</th>
                <th className="px-6 py-3 font-semibold">Auditor</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analyticsData.inProgress.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No units are currently in progress.
                  </td>
                </tr>
              ) : (
                analyticsData.inProgress.map(({ unit, projects }) => (
                  <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{unit.file_number ? `${unit.file_number} ${unit.name}` : unit.name}</div>
                      <div className="text-xs text-slate-400">{unit.tibetan_name}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{unit.branch || '-'}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {projects && projects.length > 0 ? Array.from(new Set(projects.map((p: any) => p.metadata?.auditorName).filter(Boolean))).join(', ') : '-'}
                      {projects && projects.length > 1 && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">Team Work</span>}
                    </td>
                    <td className="px-6 py-3 text-slate-500 flex gap-1 flex-wrap">
                      {projects && projects.length > 0 ? projects.map((p: any, i: number) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          {p.status || 'In Progress'}
                        </span>
                      )) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          In Progress
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* The Good List */}
      <div id="list-completed" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/10 flex justify-between items-center">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle size={18} /> Audited Units ({targetFY})
          </h3>
          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded-full">
            {analyticsData.completed.length} Units
          </span>
        </div>
        <div className={isExporting ? "" : "max-h-96 overflow-y-auto"}>
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
                analyticsData.completed.map(({ unit, projects }) => (
                  <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{unit.file_number ? `${unit.file_number} ${unit.name}` : unit.name}</div>
                      <div className="text-xs text-slate-400">
                        {projects && projects.some((p: any) => p.is_admin_override) ? (
                           <span className="text-emerald-500 font-bold">Admin Override</span>
                        ) : 'Normal Submission'}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{unit.branch || 'Head Office'}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400 text-xs">
                      {projects && projects.length > 0 ? Array.from(new Set(projects.map((p: any) => p.metadata?.auditorName).filter(Boolean))).join(', ') : 'N/A'}
                      {projects && projects.length > 1 && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">Team Work</span>}
                    </td>
                      {userRole <= 10 && onAdminRevert && projects && projects.length > 0 && (
                        <td className="px-6 py-3 text-right">
                          {projects.map((project: any, i: number) => project.is_admin_override ? (
                            <button
                              key={i}
                              onClick={() => onAdminRevert(project)}
                              className="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded text-xs font-semibold transition-colors mb-1"
                            >
                              Remove Override
                            </button>
                          ) : null)}
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

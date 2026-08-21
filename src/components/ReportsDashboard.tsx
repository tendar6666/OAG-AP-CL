import React, { useState } from 'react';
import { Calendar, Download, Filter } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { UserRole } from '@/context/AuthContext';

export default function ReportsDashboard({ 
  projects, 
  users,
  globalUnitFY,
  globalExecutionFY 
}: { 
  projects: any[],
  users: UserRole[],
  globalUnitFY: string,
  globalExecutionFY: string 
}) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Set quick ranges
  const setQuickRange = (range: 'week' | 'month' | 'year') => {
    const end = new Date();
    const start = new Date();
    
    if (range === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (range === 'month') {
      start.setMonth(end.getMonth() - 1);
    } else if (range === 'year') {
      start.setFullYear(end.getFullYear() - 1);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Filter projects
  const filteredProjects = projects.filter(p => {
    // 1. Global Filters
    if (globalUnitFY !== 'ALL' && p.metadata?.financialYear !== globalUnitFY) return false;
    if (globalExecutionFY !== 'ALL' && p.metadata?.executionFY !== globalExecutionFY) return false;

    // 2. Date Filters (Overlap check)
    const pStart = p.metadata?.auditTotals?.startDate;
    const pEnd = p.metadata?.auditTotals?.endDate;
    if (!pStart || !pEnd) return false;

    const pStartDate = new Date(pStart);
    const pEndDate = new Date(pEnd);
    pEndDate.setHours(23, 59, 59, 999);

    if (startDate) {
      const filterStart = new Date(startDate);
      if (pEndDate < filterStart) return false;
    }
    
    if (endDate) {
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
      if (pStartDate > filterEnd) return false;
    }

    return true;
  }).sort((a, b) => {
    const aDate = new Date(a.metadata?.auditTotals?.startDate || 0).getTime();
    const bDate = new Date(b.metadata?.auditTotals?.startDate || 0).getTime();
    return bDate - aDate; // Newest first
  });

  const getReportTitle = () => {
    if (!startDate && !endDate) return 'All Time Report';
    if (startDate && !endDate) return `Custom Report (From ${new Date(startDate).toLocaleDateString('en-GB')})`;
    if (!startDate && endDate) return `Custom Report (Up to ${new Date(endDate).toLocaleDateString('en-GB')})`;
    
    return `Custom Report from ${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`;
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');

    sheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Unit Name', key: 'unit', width: 40 },
      { header: 'Auditor Name', key: 'auditor', width: 25 },
      { header: 'Audit Start Date', key: 'start', width: 20 },
      { header: 'Audit End Date', key: 'end', width: 30 },
      { header: 'Assigned Reviewer', key: 'reviewer', width: 40 },
      { header: 'Status', key: 'status', width: 20 }
    ];

    sheet.getRow(1).font = { bold: true };

    filteredProjects.forEach((p, index) => {
      let endDateStr = p.metadata?.auditTotals?.endDate ? new Date(p.metadata.auditTotals.endDate).toLocaleDateString('en-GB') : '-';
      if (p.isExtended) {
        endDateStr += ' (Extended)';
      }
      
      const assignedDS = users.find(u => u.id === p.metadata?.assignedDeputyId)?.name || 'Unassigned';
      const assignedJS = users.find(u => u.id === p.metadata?.assignedJointId)?.name || 'Unassigned';
      
      sheet.addRow({
        sno: index + 1,
        unit: p.metadata?.unitName || '-',
        auditor: p.metadata?.auditorName || '-',
        start: p.metadata?.auditTotals?.startDate ? new Date(p.metadata.auditTotals.startDate).toLocaleDateString('en-GB') : '-',
        end: endDateStr,
        reviewer: `DS: ${assignedDS} / JS: ${assignedJS}`,
        status: p.status
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Audit_Report_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="text-indigo-600 dark:text-indigo-400" size={20} />
              Generated Reports
            </h3>
            <p className="text-sm text-slate-500 mt-1">Generate lists based on audits overlapping the date range</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
             <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
                <button onClick={() => setQuickRange('week')} className="px-3 py-1.5 text-xs font-semibold rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">This Week</button>
                <button onClick={() => setQuickRange('month')} className="px-3 py-1.5 text-xs font-semibold rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">This Month</button>
                <button onClick={() => setQuickRange('year')} className="px-3 py-1.5 text-xs font-semibold rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">This Year</button>
             </div>
             
             <div className="flex items-center gap-2">
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={(e) => setStartDate(e.target.value)}
                 className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
               />
               <span className="text-slate-400">to</span>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={(e) => setEndDate(e.target.value)}
                 className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
               />
             </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex justify-between items-center bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
         <h4 className="font-bold text-slate-700 dark:text-slate-200">{getReportTitle()} <span className="text-sm font-normal text-slate-500 ml-2">({filteredProjects.length} results)</span></h4>
         <button 
           onClick={exportExcel}
           disabled={filteredProjects.length === 0}
           className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold text-sm rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
         >
           <Download size={16} /> Export to Excel
         </button>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold w-16">S.No</th>
              <th className="px-4 py-3 font-semibold">Unit Name</th>
              <th className="px-4 py-3 font-semibold">Auditor Name</th>
              <th className="px-4 py-3 font-semibold">Audit Start Date</th>
              <th className="px-4 py-3 font-semibold">Audit End Date</th>
              <th className="px-4 py-3 font-semibold">Assigned Reviewer (DS / JS)</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No projects found for this date range and filters.</td>
              </tr>
            ) : (
              filteredProjects.map((p, i) => {
                let endDateStr = p.metadata?.auditTotals?.endDate ? new Date(p.metadata.auditTotals.endDate).toLocaleDateString('en-GB') : '-';
                if (p.isExtended) {
                  endDateStr += ' (Extended)';
                }
                const assignedDS = users.find(u => u.id === p.metadata?.assignedDeputyId)?.name || 'Unassigned';
                const assignedJS = users.find(u => u.id === p.metadata?.assignedJointId)?.name || 'Unassigned';

                return (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{p.metadata?.unitName || '-'}</td>
                    <td className="px-4 py-3">{p.metadata?.auditorName || '-'}</td>
                    <td className="px-4 py-3">{p.metadata?.auditTotals?.startDate ? new Date(p.metadata.auditTotals.startDate).toLocaleDateString('en-GB') : '-'}</td>
                    <td className="px-4 py-3">
                      {endDateStr}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div>DS: {assignedDS}</div>
                      <div>JS: {assignedJS}</div>
                    </td>
                    <td className="px-4 py-3">
                       <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                         {p.status}
                       </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

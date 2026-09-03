import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, Filter, Maximize2, Minimize2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function GlobalFSDashboard({ projects, fsGroups }: { projects: any[], fsGroups: any[] }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFy, setFilterFy] = useState('ALL');
  const [filterCurrency, setFilterCurrency] = useState('ALL');

  // Extract all rows
  const allRows = useMemo(() => {
    const rows: any[] = [];
    projects.forEach(p => {
      if (!p.financialStatements || p.financialStatements.notApplicable || !p.financialStatements.data) return;
      const fsData = p.financialStatements.data;
      for (const fy in fsData) {
        for (const stmtId in fsData[fy]) {
           const stmt = fsData[fy][stmtId];
           
           // Calculate totals
           let totalAssets = 0;
           let totalLiabilities = 0;
           
           const groupVals: Record<string, number> = {};

           if (stmt.assets) {
             Object.keys(stmt.assets).forEach(gId => {
               const gData = stmt.assets[gId];
               let val = 0;
               if (gData.bifurcation) {
                 val = (gData.bifurcation.opening||0) + (gData.bifurcation.surplus||0) + (gData.bifurcation.other||0);
               } else if (gData.items && gData.items.length > 0) {
                 val = gData.items.reduce((s:number, i:any) => s + (i.amount||0), 0);
               } else {
                 val = gData.total || 0;
               }
               groupVals[gId] = val;
               totalAssets += val;
             });
           }

           if (stmt.liabilities) {
             Object.keys(stmt.liabilities).forEach(gId => {
               const gData = stmt.liabilities[gId];
               let val = 0;
               if (gData.bifurcation) {
                 val = (gData.bifurcation.opening||0) + (gData.bifurcation.surplus||0) + (gData.bifurcation.other||0);
               } else if (gData.items && gData.items.length > 0) {
                 val = gData.items.reduce((s:number, i:any) => s + (i.amount||0), 0);
               } else {
                 val = gData.total || 0;
               }
               groupVals[gId] = val;
               totalLiabilities += val;
             });
           }

           rows.push({
             projectId: p.id,
             fileNo: p.customId || 'N/A',
             unitName: p.metadata?.unitName || 'Unknown',
             fy,
             stmtName: stmt.name || 'Main Statement',
             currency: stmt.currency || 'INR',
             totalAssets,
             totalLiabilities,
             diff: totalAssets - totalLiabilities,
             groupVals
           });
        }
      }
    });
    return rows;
  }, [projects]);

  // Extract unique FYs and Currencies for filters
  const uniqueFys = Array.from(new Set(allRows.map(r => r.fy))).sort();
  const uniqueCurrencies = Array.from(new Set(allRows.map(r => r.currency))).sort();

  // Filter rows
  const filteredRows = useMemo(() => {
    return allRows.filter(r => {
      if (filterFy !== 'ALL' && r.fy !== filterFy) return false;
      if (filterCurrency !== 'ALL' && r.currency !== filterCurrency) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (!String(r.fileNo).toLowerCase().includes(lower) && 
            !r.unitName.toLowerCase().includes(lower) && 
            !r.stmtName.toLowerCase().includes(lower)) return false;
      }
      return true;
    });
  }, [allRows, filterFy, filterCurrency, searchTerm]);

  // Consolidate totals for footer
  const consTotals = useMemo(() => {
    const totals: Record<string, number> = {
      assets: 0,
      liabilities: 0
    };
    filteredRows.forEach(r => {
      totals.assets += r.totalAssets;
      totals.liabilities += r.totalLiabilities;
      Object.entries(r.groupVals).forEach(([gId, val]) => {
        if (!totals[gId]) totals[gId] = 0;
        totals[gId] += val as number;
      });
    });
    return totals;
  }, [filteredRows]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleExport = () => {
    let csv = 'File No,Unit Name,FY,Statement Name,Currency,Total Assets,Total Liabilities,Difference';
    fsGroups.forEach(g => {
       csv += ',' + '"' + g.name + '"';
    });
    csv += '\n';
    
    filteredRows.forEach(r => {
       const line = [
         r.fileNo,
         '"' + r.unitName + '"',
         r.fy,
         '"' + r.stmtName + '"',
         r.currency,
         r.totalAssets,
         r.totalLiabilities,
         r.diff
       ];
       fsGroups.forEach(g => {
         line.push(r.groupVals[g.id] || 0);
       });
       csv += line.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Global_Financial_Statements.csv';
    a.click();
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[80vh] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700'}`}>
      {/* Header & Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
            Global Financial Statements Dashboard
          </h2>
          <p className="text-sm text-slate-500">Filter, view, and export consolidated global data</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search File, Unit, Statement..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          
          <select 
            value={filterFy}
            onChange={e => setFilterFy(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Years</option>
            {uniqueFys.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>

          <select 
            value={filterCurrency}
            onChange={e => setFilterCurrency(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Mixed Currency</option>
            {uniqueCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button onClick={handleExport} className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 font-semibold text-sm transition-colors">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          
          <button onClick={toggleFullscreen} className="p-1.5 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Tally Warning if Mixed Currency */}
      {filterCurrency === 'ALL' && filteredRows.length > 0 && uniqueCurrencies.length > 1 && (
        <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 p-2 text-xs font-semibold flex items-center justify-center">
          <AlertTriangle size={14} className="mr-2" />
          Warning: Consolidating different currencies. Select a specific currency to view accurate tallied totals.
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 relative">
        <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 sticky left-0 bg-slate-200 dark:bg-slate-800 z-20">File No</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 sticky left-[80px] bg-slate-200 dark:bg-slate-800 z-20">Unit Name</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700">FY</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700">Statement</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700">Curr</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300">Total Assets</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 bg-rose-100/50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300">Total Liab</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 font-black">Diff</th>
              {fsGroups.map(g => (
                <th key={g.id} className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700">
                  {g.name}
                  <div className="text-[9px] text-slate-400 font-normal">{g.type}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {filteredRows.map((r, i) => (
              <tr key={i} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-semibold sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b]">{r.fileNo}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 sticky left-[80px] bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] truncate max-w-[200px]" title={r.unitName}>{r.unitName}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800">{r.fy}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 max-w-[150px] truncate" title={r.stmtName}>{r.stmtName}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800">{r.currency}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium bg-emerald-50/30 dark:bg-emerald-900/10 text-right">{r.totalAssets.toLocaleString()}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium bg-rose-50/30 dark:bg-rose-900/10 text-right">{r.totalLiabilities.toLocaleString()}</td>
                <td className={`px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-bold text-right ${r.diff === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {r.diff === 0 ? <CheckCircle size={12} className="inline mr-1"/> : null}
                  {r.diff.toLocaleString()}
                </td>
                {fsGroups.map(g => (
                  <td key={g.id} className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right text-slate-600 dark:text-slate-400">
                    {(r.groupVals[g.id!] || 0) !== 0 ? (r.groupVals[g.id!] || 0).toLocaleString() : '-'}
                  </td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={8 + fsGroups.length} className="px-6 py-8 text-center text-slate-500">
                  No data found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 border-t-2 border-slate-300 dark:border-slate-700 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
            <tr>
              <td colSpan={5} className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 text-right sticky left-0 bg-slate-100 dark:bg-slate-800 z-20">CONSOLIDATED TOTALS</td>
              <td className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 bg-emerald-200/50 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 text-right">{consTotals.assets.toLocaleString()}</td>
              <td className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 bg-rose-200/50 dark:bg-rose-900/40 text-rose-900 dark:text-rose-300 text-right">{consTotals.liabilities.toLocaleString()}</td>
              <td className={`px-3 py-3 border-r border-slate-300 dark:border-slate-700 text-right ${(consTotals.assets - consTotals.liabilities) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {(consTotals.assets - consTotals.liabilities).toLocaleString()}
              </td>
              {fsGroups.map(g => (
                <td key={g.id} className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 text-right">
                  {(consTotals[g.id!] || 0).toLocaleString()}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { getUnits, getUnitTypes } from '@/lib/api';
import { Search, Download, Filter, Maximize2, Minimize2, AlertTriangle, CheckCircle, EyeOff, LayoutTemplate } from 'lucide-react';
import FinancialStatementViewer from '@/components/FinancialStatementViewer';
import ExcelJS from 'exceljs';

export default function GlobalFSDashboard({ projects, fsGroups }: { projects: any[], fsGroups: any[] }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFy, setFilterFy] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('ALL');
  const [filterUnitType, setFilterUnitType] = useState('ALL');
  const [unitTypes, setUnitTypes] = useState<any[]>([]);
  const [unitMap, setUnitMap] = useState<Record<string, string>>({});
  const [hiddenRows, setHiddenRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([getUnits(), getUnitTypes()]).then(([units, types]) => {
       setUnitTypes(types);
       const m: Record<string, string> = {};
       units.forEach(u => {
          if (u.file_number) m[u.file_number] = u.unit_type_id || '';
       });
       setUnitMap(m);
    });
  }, []);

  const [showTShape, setShowTShape] = useState(false);

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

                        fsGroups.forEach(g => {
               const gData = (stmt.assets && stmt.assets[g.id!]) || (stmt.liabilities && stmt.liabilities[g.id!]);
               if (!gData) return;
               let val = 0;
               if (gData.bifurcation) {
                 val = (gData.bifurcation.opening||0) + (gData.bifurcation.surplus||0) + (gData.bifurcation.other||0);
               } else if (gData.items && gData.items.length > 0) {
                 val = gData.items.reduce((s:number, i:any) => s + (i.amount||0), 0);
               } else {
                 val = gData.total || 0;
               }
               groupVals[g.id!] = val;
               if (g.type === 'Asset') totalAssets += val;
               if (g.type === 'Liability') totalLiabilities += val;
             });

           
           let displayFileNo = p.customId || 'N/A';
           let displayUnitName = p.metadata?.unitName || 'Unknown';
           
           if (!p.isHistoricalFS && displayUnitName.match(/^\d+\|\d+/)) {
               const match = displayUnitName.match(/^(\d+\|\d+)\s+(.*)/);
               if (match) {
                   displayFileNo = match[1];
                   displayUnitName = match[2];
               }
           }

           rows.push({
             projectId: p.id,
             fileNo: displayFileNo,
             unitName: displayUnitName,

             fy,
             stmtName: stmt.name || 'Main Statement',
             currency: stmt.currency || 'INR',
             totalAssets,
             totalLiabilities,
             diff: Math.round((totalAssets - totalLiabilities) * 100) / 100,
             rowId: p.id + '_' + fy + '_' + stmtId,
             originalStmt: stmt,
             groupVals
           });
        }
      }
    });
    return rows;
  }, [projects]);

  // Extract unique FYs and Currencies for filters
  const uniqueFys = Array.from(new Set(allRows.map(r => r.fy))).sort().reverse();
  const uniqueCurrencies = Array.from(new Set(allRows.map(r => r.currency))).sort();

  useEffect(() => {
    if (!filterFy && uniqueFys.length > 0) {
      setFilterFy(uniqueFys[0]);
    }
  }, [uniqueFys, filterFy]);


  
  const sortedFsGroups = useMemo(() => {
    return [...fsGroups].sort((a, b) => {
       if (a.type === 'Liability' && b.type === 'Asset') return -1;
       if (a.type === 'Asset' && b.type === 'Liability') return 1;
       return 0;
    });
  }, [fsGroups]);


  // Filter rows
  const filteredRows = useMemo(() => {
    return allRows.filter(r => {
      if (hiddenRows.has(r.rowId)) return false;
      if (filterFy !== 'ALL' && r.fy !== filterFy) return false;
      if (filterCurrency !== 'ALL' && r.currency !== filterCurrency) return false;
      if (filterUnitType !== 'ALL' && unitMap[r.fileNo] !== filterUnitType) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (!String(r.fileNo).toLowerCase().includes(lower) && 
            !r.unitName.toLowerCase().includes(lower) && 
            !r.stmtName.toLowerCase().includes(lower)) return false;
      }
      return true;
    });
  }, [allRows, filterFy, filterCurrency, searchTerm, hiddenRows, filterUnitType, unitMap]);

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

  
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Global FS');
    
    // Build Headers
    const headers = ['File No', 'Unit Name', 'FY', 'Statement', 'Currency', 'Total Assets', 'Total Liabilities', 'Difference'];
    sortedFsGroups.forEach(g => headers.push(g.name + ' (' + g.type + ')'));
    worksheet.addRow(headers);
    
    // Style Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    // Add Rows
    filteredRows.forEach(r => {
       const row = [r.fileNo, r.unitName, r.fy, r.stmtName, r.currency, r.totalAssets, r.totalLiabilities, r.diff];
       sortedFsGroups.forEach(g => row.push(r.groupVals[g.id] || 0));
       worksheet.addRow(row);
    });

    // Add Footer
    const footerRow = ['CONSOLIDATED TOTALS', '', '', '', '', consTotals.assets, consTotals.liabilities, consTotals.assets - consTotals.liabilities];
    sortedFsGroups.forEach(g => footerRow.push(consTotals[g.id] || 0));
    worksheet.addRow(footerRow);
    const lastRowIndex = filteredRows.length + 2;
    worksheet.getRow(lastRowIndex).font = { bold: true };
    worksheet.getRow(lastRowIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Global_Financial_Statements.xlsx';
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
            value={filterUnitType}
            onChange={e => setFilterUnitType(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 max-w-[150px] truncate"
          >
            <option value="ALL">All Types</option>
            {unitTypes.map(ut => {
              const parent = unitTypes.find(p => p.id === ut.parent_id);
              const displayName = parent ? parent.name + ' > ' + ut.name : ut.name;
              return <option key={ut.id} value={ut.id}>{displayName}</option>;
            }).sort((a, b) => (a.props.children > b.props.children ? 1 : -1))}
          </select>

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

          <button onClick={() => setShowTShape(true)} className="inline-flex items-center space-x-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 font-semibold text-sm transition-colors">
            <LayoutTemplate size={16} />
            <span>T-Shape Viewer</span>
          </button>
          
          <button onClick={handleExportExcel} className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 font-semibold text-sm transition-colors">
            <Download size={16} />
            <span>Export Excel</span>
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
          <thead className="sticky top-0 z-30 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 sticky left-0 bg-slate-200 dark:bg-slate-800 z-40 w-10 text-center">Hide</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 sticky left-[40px] bg-slate-200 dark:bg-slate-800 z-40">File No</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 sticky left-[120px] bg-slate-200 dark:bg-slate-800 z-40">Unit Name</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700">FY</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700">Statement</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700">Curr</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300">Total Assets</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 bg-rose-100/50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300">Total Liab</th>
              <th className="px-3 py-2 border-b border-r border-slate-300 dark:border-slate-700 font-black">Diff</th>
              {sortedFsGroups.map(g => (
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
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 z-10 text-center">
                  <button onClick={() => setHiddenRows(prev => { const n = new Set(prev); n.add(r.rowId); return n; })} className="text-slate-400 hover:text-rose-500 transition-colors p-1" title="Hide Row">
                    <EyeOff size={14} />
                  </button>
                </td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-semibold sticky left-[40px] bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b]">{r.fileNo}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 sticky left-[120px] bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] truncate max-w-[200px]" title={r.unitName}>{r.unitName}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800">{r.fy}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 max-w-[150px] truncate" title={r.stmtName}>{r.stmtName}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800">{r.currency}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium bg-emerald-50/30 dark:bg-emerald-900/10 text-right">{r.totalAssets.toLocaleString()}</td>
                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium bg-rose-50/30 dark:bg-rose-900/10 text-right">{r.totalLiabilities.toLocaleString()}</td>
                <td className={`px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-bold text-right ${Math.abs(r.diff) < 0.01 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {Math.abs(r.diff) < 0.01 ? <CheckCircle size={12} className="inline mr-1"/> : null}
                  {r.diff.toLocaleString()}
                </td>
                {sortedFsGroups.map(g => (
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
          <tfoot className="sticky bottom-0 z-30 bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 border-t-2 border-slate-300 dark:border-slate-700 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
            <tr>
              <td colSpan={6} className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 text-right sticky left-0 bg-slate-100 dark:bg-slate-800 z-40">CONSOLIDATED TOTALS</td>
              <td className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 bg-emerald-200/50 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 text-right">{consTotals.assets.toLocaleString()}</td>
              <td className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 bg-rose-200/50 dark:bg-rose-900/40 text-rose-900 dark:text-rose-300 text-right">{consTotals.liabilities.toLocaleString()}</td>
              <td className={`px-3 py-3 border-r border-slate-300 dark:border-slate-700 text-right ${Math.abs(consTotals.assets - consTotals.liabilities) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {(consTotals.assets - consTotals.liabilities).toLocaleString()}
              </td>
              {sortedFsGroups.map(g => (
                <td key={g.id} className="px-3 py-3 border-r border-slate-300 dark:border-slate-700 text-right">
                  {(consTotals[g.id!] || 0).toLocaleString()}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* T-Shape Modal */}
      {showTShape && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center fade-in">
          <div className="bg-white dark:bg-slate-900 w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
             <button onClick={() => setShowTShape(false)} className="absolute top-4 right-4 z-[70] p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors">
                <Minimize2 size={18} />
             </button>
             <div className="flex-1 overflow-hidden relative mt-10">
               {(() => {
                 const pseudoProject = {
                   metadata: { unitName: "Filtered Consolidator" },
                   financialStatements: { notApplicable: false, data: {} as Record<string, any> }
                 };
                 filteredRows.forEach(r => {
                    if (!pseudoProject.financialStatements.data[r.fy]) {
                      pseudoProject.financialStatements.data[r.fy] = {};
                    }
                    const newName = r.fileNo + ' - ' + r.unitName + ' - ' + r.stmtName;
                    pseudoProject.financialStatements.data[r.fy][r.rowId] = { ...r.originalStmt, id: r.rowId, name: newName };
                 });
                 return <FinancialStatementViewer isOpen={true} project={pseudoProject} onClose={() => setShowTShape(false)} />;
               })()}
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

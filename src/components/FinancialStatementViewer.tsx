import React, { useState, useEffect } from 'react';
import { X, Calculator, AlertCircle, Layers } from 'lucide-react';
import { getFSGroups, FSGroup } from '@/lib/api';

interface FSViewerProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
}

export default function FinancialStatementViewer({ isOpen, onClose, project }: FSViewerProps) {
  const [fsGroups, setFsGroups] = useState<FSGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeFy, setActiveFy] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('CONSOLIDATED'); // 'CONSOLIDATED' or statementId

  const fsNode = project?.financialStatements;

  useEffect(() => {
    if (isOpen) {
      loadGroups();
      if (fsNode?.data) {
        const fys = Object.keys(fsNode.data).sort().reverse();
        if (fys.length > 0) {
          setActiveFy(fys[0]);
        }
      }
    }
  }, [isOpen, project]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const groups = await getFSGroups();
      groups.sort((a, b) => (a.order || 0) - (b.order || 0));
      setFsGroups(groups);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  if (fsNode?.notApplicable) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center">
          <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Not Applicable</h2>
          <p className="text-slate-500 mb-6">
            The Financial Statement was marked as Not Applicable for this Audit Program.
          </p>
          <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  if (!fsNode?.data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No Data</h2>
          <p className="text-slate-500 mb-6">No Financial Statement data exists for this project.</p>
          <button onClick={onClose} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const fys = Object.keys(fsNode.data).sort().reverse();
  const currentStatements: any[] = activeFy ? Object.values(fsNode.data[activeFy] || {}) : [];

  // CONSOLIDATION LOGIC
  const getConsolidatedData = () => {
    const data: any = { liabilities: {}, assets: {}, currencies: new Set() };
    
    currentStatements.forEach((stmt: any) => {
      if (stmt.currency) data.currencies.add(stmt.currency);
      
      // Merge Liabilities
      Object.keys(stmt.liabilities || {}).forEach(groupId => {
        if (!data.liabilities[groupId]) data.liabilities[groupId] = { total: 0 };
        const gData = stmt.liabilities[groupId];
        if (gData.bifurcation) {
            data.liabilities[groupId].total += (gData.bifurcation.opening||0) + (gData.bifurcation.surplus||0) + (gData.bifurcation.other||0);
          } else if (gData.items && gData.items.length > 0) {
            data.liabilities[groupId].total += gData.items.reduce((sum:number, i:any) => sum + (i.amount||0), 0);
          } else {
            data.liabilities[groupId].total += (gData.total || 0);
          }
      });
      
      // Merge Assets
      Object.keys(stmt.assets || {}).forEach(groupId => {
        if (!data.assets[groupId]) data.assets[groupId] = { total: 0 };
        const gData = stmt.assets[groupId];
        if (gData.bifurcation) {
            data.assets[groupId].total += (gData.bifurcation.opening||0) + (gData.bifurcation.surplus||0) + (gData.bifurcation.other||0);
          } else if (gData.items && gData.items.length > 0) {
            data.assets[groupId].total += gData.items.reduce((sum:number, i:any) => sum + (i.amount||0), 0);
          } else {
            data.assets[groupId].total += (gData.total || 0);
          }
      });
    });
    
    return data;
  };

  const consData = getConsolidatedData();
  const consCurrency = consData.currencies.size > 1 ? "MIXED CURRENCIES" : (Array.from(consData.currencies)[0] || 'Unknown');

      const getSpecificTotal = (stmt: any, type: 'Asset'|'Liability', groupId: string) => {
      const gData = (stmt.assets && stmt.assets[groupId]) || (stmt.liabilities && stmt.liabilities[groupId]);
      if (!gData) return 0;
      if (gData.bifurcation) {
        return (gData.bifurcation.opening||0) + (gData.bifurcation.surplus||0) + (gData.bifurcation.other||0);
      }
      return (gData.items||[]).reduce((sum:number, i:any) => sum + (i.amount||0), 0);
    };

  const getGrandTotal = (stmt: any, type: 'Asset'|'Liability') => {
    return fsGroups.filter(g => g.type === type).reduce((sum, g) => sum + getSpecificTotal(stmt, type, g.id!), 0);
  };

      const getConsGrandTotal = (type: 'Asset'|'Liability') => {
      return fsGroups.filter(g => g.type === type).reduce((sum, g) => {
         const val = ((consData.assets && consData.assets[g.id!]?.total) || 0) + ((consData.liabilities && consData.liabilities[g.id!]?.total) || 0);
         return sum + val;
      }, 0);
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
              <Layers className="mr-2 text-indigo-600" size={24}/>
              Financial Statement Report
            </h2>
            <p className="text-sm text-slate-500 mt-1">{project.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center"><p className="text-slate-500">Loading master groups...</p></div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex flex-col">
              <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                Financial Years
              </div>
              <div className="p-2 border-b border-slate-200 dark:border-slate-800">
                <select 
                  value={activeFy} 
                  onChange={e => { setActiveFy(e.target.value); setActiveTab('CONSOLIDATED'); }}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-400 outline-none"
                >
                  {fys.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>
              
              <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 mt-2">
                Statements ({activeFy})
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button
                  onClick={() => setActiveTab('CONSOLIDATED')}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center transition-colors ${activeTab === 'CONSOLIDATED' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                >
                  <Calculator size={16} className="mr-2" /> Consolidated Total
                </button>
                <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>
                {currentStatements.map((stmt: any) => (
                  <button
                    key={stmt.id}
                    onClick={() => setActiveTab(stmt.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === stmt.id ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {stmt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Viewer Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
              
              {/* Toolbar */}
              <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  {activeTab === 'CONSOLIDATED' ? 'Consolidated Balance Sheet' : currentStatements.find((s:any) => s.id === activeTab)?.name}
                </h3>
                <span className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full">
                  Currency: {activeTab === 'CONSOLIDATED' ? consCurrency : currentStatements.find((s:any) => s.id === activeTab)?.currency}
                </span>
                              </div>
  
                {/* Currency Reminder Alert */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/30 px-6 py-2 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <p>Admin Reminder: Please double-check if the displayed currency is correct for this unit.</p>
                </div>
  
                {/* Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-6 items-start">
                  
                  {/* Liabilities */}
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 border-b-2 border-slate-800 dark:border-slate-300 pb-2 mb-4">LIABILITIES</h4>
                    {fsGroups.filter(g => g.type === 'Liability').map(g => {
                      const total = activeTab === 'CONSOLIDATED' ? ((consData.liabilities[g.id!]?.total || 0) + (consData.assets[g.id!]?.total || 0)) : getSpecificTotal(currentStatements.find((s:any) => s.id === activeTab), 'Liability', g.id!);
                      if (total === 0) return null; // Hide completely empty rows in viewer
                      return (
                        <div key={g.id} className="flex justify-between items-center py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded border-b border-slate-100 dark:border-slate-800/50">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{g.name}</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{total.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Assets */}
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 border-b-2 border-slate-800 dark:border-slate-300 pb-2 mb-4">ASSETS</h4>
                    {fsGroups.filter(g => g.type === 'Asset').map(g => {
                      const total = activeTab === 'CONSOLIDATED' ? ((consData.assets[g.id!]?.total || 0) + (consData.liabilities[g.id!]?.total || 0)) : getSpecificTotal(currentStatements.find((s:any) => s.id === activeTab), 'Asset', g.id!);
                      if (total === 0) return null; // Hide completely empty rows in viewer
                      return (
                        <div key={g.id} className="flex justify-between items-center py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded border-b border-slate-100 dark:border-slate-800/50">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{g.name}</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{total.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>

              {/* Tally Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                <div className="w-1/2 pr-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200">TOTAL LIABILITIES</span>
                    <span className="text-xl font-black text-indigo-700 dark:text-indigo-400">
                      {(activeTab === 'CONSOLIDATED' ? getConsGrandTotal('Liability') : getGrandTotal(currentStatements.find((s:any) => s.id === activeTab), 'Liability')).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-1/2 pl-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200">TOTAL ASSETS</span>
                    <span className="text-xl font-black text-indigo-700 dark:text-indigo-400">
                      {(activeTab === 'CONSOLIDATED' ? getConsGrandTotal('Asset') : getGrandTotal(currentStatements.find((s:any) => s.id === activeTab), 'Asset')).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

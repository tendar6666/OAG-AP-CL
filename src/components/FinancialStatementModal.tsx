import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
import { getFSGroups, FSGroup } from '@/lib/api';

interface FinancialStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (fsData: any) => void;
  financialYears: string[];
  unitName: string;
  initialData?: any;
}

interface FSItem {
  id: string;
  name: string;
  amount: number;
}

interface FSBifurcation {
  opening: number;
  surplus: number;
  other: number;
}

interface FSGroupData {
  items: FSItem[];
  bifurcation?: FSBifurcation;
}

interface StatementData {
  id: string;
  name: string;
  currency: string;
  liabilities: Record<string, FSGroupData>; // groupId -> data
  assets: Record<string, FSGroupData>;
}

export default function FinancialStatementModal({ isOpen, onClose, onSubmit, financialYears, unitName , initialData}: FinancialStatementModalProps) {
  const [isNotApplicable, setIsNotApplicable] = useState(false);
  const [fsGroups, setFsGroups] = useState<FSGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Structure: fsData[fy][statementId] = StatementData
  const [fsData, setFsData] = useState<Record<string, Record<string, StatementData>>>({});
  const [activeFy, setActiveFy] = useState<string>(financialYears[0] || '');
  const [activeStatementId, setActiveStatementId] = useState<Record<string, string>>({}); // fy -> active statementId

  const CURRENCIES = ['INR', 'USD', 'NPR', 'EUR', 'GBP', 'CHF', 'JPY', 'NTD', 'ZAR', 'RUB', 'Other'];

  useEffect(() => {
    if (isOpen) {
      loadGroups();
      initializeData();
    }
  }, [isOpen, financialYears]);

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

  const createEmptyStatement = (id: string, name: string): StatementData => {
    return {
      id,
      name,
      currency: 'INR',
      liabilities: {},
      assets: {}
    };
  };

  const initializeData = () => {
    if (initialData) {
      setIsNotApplicable(initialData.notApplicable || false);
      
      let dataToSet = initialData.data ? JSON.parse(JSON.stringify(initialData.data)) : {};
      const initialActiveSt: Record<string, string> = {};
      
      financialYears.forEach(fy => {
        const stKeys = dataToSet[fy] ? Object.keys(dataToSet[fy]) : [];
        if (stKeys.length > 0) {
          initialActiveSt[fy] = stKeys[0];
        } else {
           const defaultStId = 'stmt_1';
           if (!dataToSet[fy]) dataToSet[fy] = {};
           dataToSet[fy][defaultStId] = createEmptyStatement(defaultStId, 'Main Account');
           initialActiveSt[fy] = defaultStId;
        }
      });
      
      if (!initialData.notApplicable) {
        setFsData(dataToSet);
      } else {
        setFsData({});
      }
      
      setActiveStatementId(initialActiveSt);
      setActiveFy(financialYears[0] || '');
      return;
    }

    const initData: Record<string, Record<string, StatementData>> = {};
    const initialActiveSt: Record<string, string> = {};
    
    financialYears.forEach(fy => {
      const defaultStId = 'stmt_1';
      initData[fy] = {
        [defaultStId]: createEmptyStatement(defaultStId, 'Main Account')
      };
      initialActiveSt[fy] = defaultStId;
    });
    
    setFsData(initData);
    setActiveStatementId(initialActiveSt);
    setActiveFy(financialYears[0] || '');
    setIsNotApplicable(false);
  };

  if (!isOpen) return null;

  const handleAddStatement = (fy: string) => {
    const name = window.prompt("Enter name for new Financial Statement (e.g., Sur-nyul account, Student Welfare account, AET, GOI, Provident Fund Trust):");
    if (!name) return;
    
    const newId = 'stmt_' + Date.now();
    setFsData(prev => ({
      ...prev,
      [fy]: {
        ...prev[fy],
        [newId]: createEmptyStatement(newId, name)
      }
    }));
    setActiveStatementId(prev => ({ ...prev, [fy]: newId }));
  };

  const calculateGroupTotal = (groupId: string, groupData: FSGroupData | undefined, groupType: 'Asset'|'Liability'): number => {
    if (!groupData) return 0;
    const groupDef = fsGroups.find(g => g.id === groupId);
    if (groupDef?.requiresBifurcation && groupData.bifurcation) {
      return (groupData.bifurcation.opening || 0) + (groupData.bifurcation.surplus || 0) + (groupData.bifurcation.other || 0);
    }
    return groupData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateTotal = (statement: StatementData, type: 'Asset'|'Liability'): number => {
    const groups = fsGroups.filter(g => g.type === type);
    const dataObj = type === 'Asset' ? statement.assets : statement.liabilities;
    return groups.reduce((sum, g) => sum + calculateGroupTotal(g.id!, dataObj[g.id!], type), 0);
  };

  const isStatementTallied = (statement: StatementData): boolean => {
    const tA = calculateTotal(statement, 'Asset');
    const tL = calculateTotal(statement, 'Liability');
    return tA === tL && (tA > 0 || tL > 0); // Must tally and not be totally empty (0=0) unless they haven't started
  };

  const isFyTallied = (fy: string): boolean => {
    const stmts = Object.values(fsData[fy] || {});
    if (stmts.length === 0) return false;
    return stmts.every(s => isStatementTallied(s));
  };

  const isAllTallied = (): boolean => {
    if (isNotApplicable) return true;
    return financialYears.every(fy => isFyTallied(fy));
  };

  const handleFinalSubmit = () => {
    if (isNotApplicable) {
      onSubmit({ notApplicable: true });
    } else {
      onSubmit({ notApplicable: false, data: fsData });
    }
  };

  const updateItem = (fy: string, stId: string, type: 'Asset'|'Liability', groupId: string, itemId: string, field: 'name'|'amount', val: any) => {
    setFsData(prev => {
      const draft = JSON.parse(JSON.stringify(prev)); // Deep copy for safety
      const side = type === 'Asset' ? 'assets' : 'liabilities';
      if (!draft[fy][stId][side][groupId]) {
        draft[fy][stId][side][groupId] = { items: [] };
      }
      const item = draft[fy][stId][side][groupId].items.find((i:any) => i.id === itemId);
      if (item) {
        item[field] = val;
      }
      return draft;
    });
  };

  const addItem = (fy: string, stId: string, type: 'Asset'|'Liability', groupId: string) => {
    setFsData(prev => {
      const draft = JSON.parse(JSON.stringify(prev));
      const side = type === 'Asset' ? 'assets' : 'liabilities';
      if (!draft[fy][stId][side][groupId]) {
        draft[fy][stId][side][groupId] = { items: [] };
      }
      draft[fy][stId][side][groupId].items.push({ id: 'item_'+Date.now(), name: '', amount: 0 });
      return draft;
    });
  };

  const removeItem = (fy: string, stId: string, type: 'Asset'|'Liability', groupId: string, itemId: string) => {
    setFsData(prev => {
      const draft = JSON.parse(JSON.stringify(prev));
      const side = type === 'Asset' ? 'assets' : 'liabilities';
      if (draft[fy][stId][side][groupId]) {
        draft[fy][stId][side][groupId].items = draft[fy][stId][side][groupId].items.filter((i:any) => i.id !== itemId);
      }
      return draft;
    });
  };

  const updateBifurcation = (fy: string, stId: string, type: 'Asset'|'Liability', groupId: string, field: keyof FSBifurcation, val: number) => {
    setFsData(prev => {
      const draft = JSON.parse(JSON.stringify(prev));
      const side = type === 'Asset' ? 'assets' : 'liabilities';
      if (!draft[fy][stId][side][groupId]) {
        draft[fy][stId][side][groupId] = { items: [], bifurcation: { opening: 0, surplus: 0, other: 0 } };
      }
      if (!draft[fy][stId][side][groupId].bifurcation) {
        draft[fy][stId][side][groupId].bifurcation = { opening: 0, surplus: 0, other: 0 };
      }
      draft[fy][stId][side][groupId].bifurcation[field] = val;
      return draft;
    });
  };

  const currentStatement = fsData[activeFy]?.[activeStatementId[activeFy]];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
              <Calculator className="mr-2 text-indigo-600" size={24}/>
              Financial Statement
            </h2>
            <p className="text-sm text-slate-500 mt-1">{unitName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Not Applicable Toggle */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
          <label className="flex items-center space-x-3 cursor-pointer group w-max">
            <input 
              type="checkbox" 
              checked={isNotApplicable} 
              onChange={e => setIsNotApplicable(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
              Financial Statement Not Applicable (N/A)
            </span>
          </label>
          {isNotApplicable && (
            <p className="text-xs text-slate-500 mt-2 ml-8">
              Bypassing the Balance Sheet. Use this for consolidated branch accounts or multi-auditor collaboration.
            </p>
          )}
        </div>

        {/* Main Content */}
        {!isNotApplicable && !isLoading && (
          <div className="flex flex-1 overflow-hidden">
            
            {/* Left Sidebar (FYs & Tabs) */}
            <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex flex-col">
              <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                Financial Years
              </div>
              <div className="flex-1 overflow-y-auto">
                {financialYears.map(fy => {
                  const isActive = activeFy === fy;
                  const isTallied = isFyTallied(fy);
                  return (
                    <div key={fy}>
                      <button
                        onClick={() => setActiveFy(fy)}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex justify-between items-center ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-r-4 border-indigo-600' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                        <span>{fy}</span>
                        {isTallied && <CheckCircle size={14} className="text-emerald-500" />}
                      </button>
                      
                      {/* Sub-Statements */}
                      {isActive && (
                        <div className="pl-6 pr-3 py-2 space-y-1 bg-indigo-50/30 dark:bg-indigo-900/10">
                          {Object.values(fsData[fy] || {}).map(stmt => (
                            <button
                              key={stmt.id}
                              onClick={() => setActiveStatementId(prev => ({...prev, [fy]: stmt.id}))}
                              className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium flex justify-between items-center ${activeStatementId[fy] === stmt.id ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100' : 'text-slate-600 hover:bg-indigo-100 dark:text-slate-400 dark:hover:bg-indigo-900/30'}`}
                            >
                              <span className="truncate">{stmt.name}</span>
                              {isStatementTallied(stmt) && <CheckCircle size={12} className="text-emerald-500 shrink-0 ml-1" />}
                            </button>
                          ))}
                          <button
                            onClick={() => handleAddStatement(fy)}
                            className="w-full text-left px-2 py-1.5 rounded text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 flex items-center mt-1"
                          >
                            <Plus size={12} className="mr-1" /> Add Statement
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane (T-Shape Balance Sheet) */}
            {currentStatement && (
              <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                
                {/* Statement Toolbar */}
                <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center space-x-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{currentStatement.name}</h3>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-slate-500 uppercase">Currency:</label>
                      <select 
                        value={currentStatement.currency}
                        onChange={e => {
                          const val = e.target.value;
                          setFsData(prev => ({...prev, [activeFy]: {...prev[activeFy], [currentStatement.id]: {...currentStatement, currency: val}}}));
                        }}
                        className="text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  {isStatementTallied(currentStatement) ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center">
                      <CheckCircle size={14} className="mr-1" /> Tallied Perfectly
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full flex items-center">
                      <AlertCircle size={14} className="mr-1" /> Discrepancy Found
                    </span>
                  )}
                </div>

                {/* T-Shape Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-6 h-full items-start">
                    
                    {/* Liabilities */}
                    <div className="space-y-6">
                      <div className="flex justify-between items-end border-b-2 border-slate-800 dark:border-slate-300 pb-2">
                        <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">LIABILITIES</h4>
                      </div>
                      
                      {fsGroups.filter(g => g.type === 'Liability').map(group => {
                        const data = currentStatement.liabilities[group.id!];
                        return (
                          <div key={group.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm">{group.name}</h5>
                              {(!group.requiresBifurcation && group.name === 'Others Group') && (
                                <button onClick={() => addItem(activeFy, currentStatement.id, 'Liability', group.id!)} className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center">
                                  <Plus size={12} className="mr-0.5"/> Add Item
                                </button>
                              )}
                            </div>

                            {/* Bifurcation Mode */}
                            {group.requiresBifurcation ? (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-600 dark:text-slate-400">Opening Balance</span>
                                  <input type="number" value={data?.bifurcation?.opening || ''} onChange={e => updateBifurcation(activeFy, currentStatement.id, 'Liability', group.id!, 'opening', parseFloat(e.target.value) || 0)} className="w-32 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="0.00" />
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-600 dark:text-slate-400">Add: Surplus / (Less: Deficit)</span>
                                  <input type="number" value={data?.bifurcation?.surplus || ''} onChange={e => updateBifurcation(activeFy, currentStatement.id, 'Liability', group.id!, 'surplus', parseFloat(e.target.value) || 0)} className="w-32 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="0.00" />
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                                  <span className="text-slate-600 dark:text-slate-400">Add / (Less): Other Adjustments</span>
                                  <input type="number" value={data?.bifurcation?.other || ''} onChange={e => updateBifurcation(activeFy, currentStatement.id, 'Liability', group.id!, 'other', parseFloat(e.target.value) || 0)} className="w-32 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="0.00" />
                                </div>
                                <div className="flex justify-between items-center pt-1 font-bold text-slate-800 dark:text-slate-200">
                                  <span>Closing Balance</span>
                                  <span>{calculateGroupTotal(group.id!, data, 'Liability').toLocaleString()}</span>
                                </div>
                              </div>
                            ) : group.name === 'Others Group' ? (
                              /* Others Group Mode (Multiple Named Items) */
                              <div className="space-y-1">
                                {data?.items.map(item => (
                                  <div key={item.id} className="flex space-x-2">
                                    <input type="text" value={item.name} onChange={e => updateItem(activeFy, currentStatement.id, 'Liability', group.id!, item.id, 'name', e.target.value)} placeholder="Group Name" className="flex-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" />
                                    <input type="number" value={item.amount || ''} onChange={e => updateItem(activeFy, currentStatement.id, 'Liability', group.id!, item.id, 'amount', parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-28 text-right text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" />
                                    <button onClick={() => removeItem(activeFy, currentStatement.id, 'Liability', group.id!, item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                  </div>
                                ))}
                                {data?.items?.length > 0 && (
                                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 text-sm">
                                    <span>Subtotal</span>
                                    <span className="pr-8">{calculateGroupTotal(group.id!, data, 'Liability').toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Standard Single Amount Mode */
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Total Amount</span>
                                <input 
                                  type="number" 
                                  value={data?.items?.[0]?.amount || ''} 
                                  onChange={e => {
                                    if (!data?.items?.length) {
                                      addItem(activeFy, currentStatement.id, 'Liability', group.id!);
                                      // The state updates async, so we'll just handle it by using updateItem directly if it existed, but since it doesn't, we can just dispatch a full replacement.
                                      // Actually, it's safer to just write a setFsData block here for single amounts.
                                    }
                                    setFsData(prev => {
                                      const draft = JSON.parse(JSON.stringify(prev));
                                      if (!draft[activeFy][currentStatement.id]['liabilities'][group.id!]) {
                                        draft[activeFy][currentStatement.id]['liabilities'][group.id!] = { items: [{ id: 'item_1', name: '', amount: 0 }] };
                                      }
                                      if (draft[activeFy][currentStatement.id]['liabilities'][group.id!].items.length === 0) {
                                        draft[activeFy][currentStatement.id]['liabilities'][group.id!].items.push({ id: 'item_1', name: '', amount: 0 });
                                      }
                                      draft[activeFy][currentStatement.id]['liabilities'][group.id!].items[0].amount = parseFloat(e.target.value) || 0;
                                      return draft;
                                    });
                                  }} 
                                  placeholder="0.00" 
                                  className="w-32 text-right text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" 
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Assets */}
                    <div className="space-y-6">
                      <div className="flex justify-between items-end border-b-2 border-slate-800 dark:border-slate-300 pb-2">
                        <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">ASSETS</h4>
                      </div>
                      
                      {fsGroups.filter(g => g.type === 'Asset').map(group => {
                        const data = currentStatement.assets[group.id!];
                        return (
                          <div key={group.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm">{group.name}</h5>
                              {(!group.requiresBifurcation && group.name === 'Others Group') && (
                                <button onClick={() => addItem(activeFy, currentStatement.id, 'Asset', group.id!)} className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center">
                                  <Plus size={12} className="mr-0.5"/> Add Item
                                </button>
                              )}
                            </div>

                            {/* Bifurcation Mode (Rare for assets but supported) */}
                            {group.requiresBifurcation ? (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-600 dark:text-slate-400">Opening Balance</span>
                                  <input type="number" value={data?.bifurcation?.opening || ''} onChange={e => updateBifurcation(activeFy, currentStatement.id, 'Asset', group.id!, 'opening', parseFloat(e.target.value) || 0)} className="w-32 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="0.00" />
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-600 dark:text-slate-400">Add: Additions / (Less: Disposals)</span>
                                  <input type="number" value={data?.bifurcation?.surplus || ''} onChange={e => updateBifurcation(activeFy, currentStatement.id, 'Asset', group.id!, 'surplus', parseFloat(e.target.value) || 0)} className="w-32 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="0.00" />
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                                  <span className="text-slate-600 dark:text-slate-400">Add / (Less): Other Adjustments</span>
                                  <input type="number" value={data?.bifurcation?.other || ''} onChange={e => updateBifurcation(activeFy, currentStatement.id, 'Asset', group.id!, 'other', parseFloat(e.target.value) || 0)} className="w-32 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="0.00" />
                                </div>
                                <div className="flex justify-between items-center pt-1 font-bold text-slate-800 dark:text-slate-200">
                                  <span>Closing Balance</span>
                                  <span>{calculateGroupTotal(group.id!, data, 'Asset').toLocaleString()}</span>
                                </div>
                              </div>
                            ) : group.name === 'Others Group' ? (
                              /* Others Group Mode (Multiple Named Items) */
                              <div className="space-y-1">
                                {data?.items.map(item => (
                                  <div key={item.id} className="flex space-x-2">
                                    <input type="text" value={item.name} onChange={e => updateItem(activeFy, currentStatement.id, 'Asset', group.id!, item.id, 'name', e.target.value)} placeholder="Group Name" className="flex-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" />
                                    <input type="number" value={item.amount || ''} onChange={e => updateItem(activeFy, currentStatement.id, 'Asset', group.id!, item.id, 'amount', parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-28 text-right text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" />
                                    <button onClick={() => removeItem(activeFy, currentStatement.id, 'Asset', group.id!, item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                  </div>
                                ))}
                                {data?.items?.length > 0 && (
                                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 text-sm">
                                    <span>Subtotal</span>
                                    <span className="pr-8">{calculateGroupTotal(group.id!, data, 'Asset').toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Standard Single Amount Mode */
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Total Amount</span>
                                <input 
                                  type="number" 
                                  value={data?.items?.[0]?.amount || ''} 
                                  onChange={e => {
                                    setFsData(prev => {
                                      const draft = JSON.parse(JSON.stringify(prev));
                                      if (!draft[activeFy][currentStatement.id]['assets'][group.id!]) {
                                        draft[activeFy][currentStatement.id]['assets'][group.id!] = { items: [{ id: 'item_1', name: '', amount: 0 }] };
                                      }
                                      if (draft[activeFy][currentStatement.id]['assets'][group.id!].items.length === 0) {
                                        draft[activeFy][currentStatement.id]['assets'][group.id!].items.push({ id: 'item_1', name: '', amount: 0 });
                                      }
                                      draft[activeFy][currentStatement.id]['assets'][group.id!].items[0].amount = parseFloat(e.target.value) || 0;
                                      return draft;
                                    });
                                  }} 
                                  placeholder="0.00" 
                                  className="w-32 text-right text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500" 
                                />
                              </div>
                            )}
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
                      <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">{calculateTotal(currentStatement, 'Liability').toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-1/2 pl-3">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200">TOTAL ASSETS</span>
                      <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">{calculateTotal(currentStatement, 'Asset').toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer (Action Buttons) */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            Cancel
          </button>
          <button 
            onClick={handleFinalSubmit}
            disabled={!isAllTallied()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center shadow-md shadow-indigo-500/20"
          >
            <CheckCircle size={18} className="mr-2" />
            {isNotApplicable ? 'Bypass & Submit Final' : 'Confirm Final Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

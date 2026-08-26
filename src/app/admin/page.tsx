"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { getUsers, updateUserRole, getProjects, getUnits, createUnit, updateUnit, deleteUnit, getCustomFYs, createCustomFY, deleteCustomFY, getUnitTypes, createUnitType, updateUnitType, deleteUnitType, AuditUnit, CustomFY, UnitType } from '@/lib/api';
import { Users, FileSpreadsheet, ShieldAlert, Download, Save, Building2, Plus, Edit2, Trash2, CalendarDays, Ban, CheckCircle, Search, Filter, RefreshCw, ChevronRight, ChevronDown, Folder, FolderOpen, Network } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ReportsDashboard from '@/components/ReportsDashboard';

const ROLE_MAP: Record<number, string> = {
  10: "Secretary (L1)",
  25: "Report Finaliser",
  20: "Joint Secretary (L2)",
  30: "Deputy Secretary (L3)",
  40: "Field Auditor (L4)",
};

export function getStatusBadge(p: any) {
  const isPendingSupport = p.status === 'Pending Support' || (p.status === 'Submitted' && !p.isExtended);
  const isPendingDraftSupport = p.status === 'Draft AP & CL Submitted';
  const isPendingDraftApproval = p.status === 'Draft AP & CL Supported';
  
  if (p.status === 'Draft') return { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (isPendingDraftSupport) return { label: 'Draft Submitted', color: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (isPendingDraftApproval) return { label: 'Draft Support Pending', color: 'bg-sky-100 text-sky-700 border-sky-200' };
  if (p.status === 'Draft AP & CL Approved') return { label: 'Draft Approved', color: 'bg-teal-100 text-teal-700 border-teal-200' };
  
  if (p.status === 'Extension Requested') return { label: 'Extension Submitted', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (p.status === 'Extension Supported') return { label: 'Extension Support', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (p.status === 'Extended (Approved)') return { label: 'Extension Approved', color: 'bg-teal-100 text-teal-700 border-teal-200' };
  
  if (isPendingSupport) return { label: 'Final Submitted', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (p.status === 'Pending Approval') return { label: 'Final Supported', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  
  if (p.status === 'Audited') {
    return { label: 'Final Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }
  
  const end = p.metadata?.auditTotals?.endDate;
  const isPast = end && new Date() > new Date(end);
  if (isPast && p.status === 'Draft') return { label: 'Overdue (Draft)', color: 'bg-rose-100 text-rose-700 border-rose-200' };
  
  return { label: p.status || 'In Progress', color: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export default function AdminDashboard() {

  const [unitTypeFilter, setUnitTypeFilter] = useState('ALL');

  const toggleHierarchyNode = (id: string) => {
     setHierarchyExpanded(prev => ({...prev, [id]: !prev[id]}));
  };

  const expandAllHierarchy = () => {
     const allIds: Record<string, boolean> = {};
     unitTypes.forEach(ut => allIds[ut.id!] = true);
     allIds['__UNCATEGORIZED__'] = true;
     if (hwGroupByBranch) {
        ['Head Office', 'Dekyiling Branch', 'Nepal Branch', 'South Branch'].forEach(b => allIds['__BRANCH__'+b] = true);
     }
     setHierarchyExpanded(allIds);
  };

  const collapseAllHierarchy = () => {
     setHierarchyExpanded({});
  };

  
  const renderUnitForm = (isInline = false) => {
     if (!unitForm) return null;
     return (
        <div className={isInline ? "p-4 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-inner" : "p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"}>
          {!isInline && <h4 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">New Unit</h4>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">File Number</label>
              <input 
                type="text" 
                value={unitForm.file_number || ''} 
                onChange={e => setUnitForm({...unitForm, file_number: e.target.value})}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Unit Name (English)</label>
              <input 
                type="text" 
                value={unitForm.name || ''} 
                onChange={e => setUnitForm({...unitForm, name: e.target.value})}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tibetan Name</label>
              <input 
                type="text" 
                value={unitForm.tibetan_name || ''} 
                onChange={e => setUnitForm({...unitForm, tibetan_name: e.target.value})}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Branch / Section</label>
              <select
                value={unitForm.branch || 'Head Office'}
                onChange={e => setUnitForm({...unitForm, branch: e.target.value})}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Head Office">Head Office</option>
                <option value="Dekyiling Branch">Dekyiling Branch</option>
                <option value="Nepal Branch">Nepal Branch</option>
                <option value="South Branch">South Branch</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Unit Type</label>
              <select
                value={unitForm.unit_type_id || ''}
                onChange={e => {
                   if (e.target.value === 'CREATE_NEW') {
                      setShowManageUnitTypes(true);
                   } else {
                      setUnitForm({...unitForm, unit_type_id: e.target.value || null});
                   }
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="CREATE_NEW" className="font-bold text-indigo-600">+ Create Unit Type</option>
                <option value="">-- Uncategorized --</option>
                {renderParentOptions(null, 0)}
                  </select>
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={unitForm.is_active !== false} 
                  onChange={e => setUnitForm({...unitForm, is_active: e.target.checked})}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Unit</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Active From FY</label>
              <select
                value={unitForm.active_from_fy || ''}
                onChange={e => setUnitForm({...unitForm, active_from_fy: e.target.value || undefined})}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- No specific start year --</option>
                {Array.from({length: 10}, (_, i) => {
                  const y = new Date().getFullYear() - 5 + i;
                  return `FY ${y}-${y+1}`;
                }).map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button onClick={saveUnit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center space-x-1">
              <Save size={16}/> <span>Save</span>
            </button>
            <button onClick={() => setUnitForm(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
              Cancel
            </button>
          </div>
        </div>
     );
  };

  const renderParentOptions = (parentId: string | null, depth: number): any[] => {
     return unitTypes.filter(ut => ut.parent_id === parentId).flatMap(ut => {
         if (ut.id === unitTypeForm?.id) return [];
         const indent = Array(depth).fill('\u00A0\u00A0\u00A0\u00A0').join('');
         const arrow = depth > 0 ? '\u21B3 ' : '';
         return [
            <option key={ut.id} value={ut.id as string}>{indent + arrow + ut.name}</option>,
            ...renderParentOptions(ut.id as string, depth + 1)
         ];
     });
  };

  const renderModalCategory = (type: UnitType, depth: number) => {
     const childrenTypes = unitTypes.filter(ut => ut.parent_id === type.id);
     const expanded = !!hierarchyExpanded[type.id!];

     return (
       <div key={type.id} className="flex flex-col mb-1">
          <div 
             onDoubleClick={() => setUnitTypeForm({...unitTypeForm, parent_id: type.id as string})}
             className="flex justify-between group items-center py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded pr-2 cursor-pointer select-none"
             title="Double click to set as Parent Category"
          >
             <div style={{ paddingLeft: `${depth * 20}px` }} className="flex items-center space-x-2 w-full pr-4">
                 <button onClick={() => toggleHierarchyNode(type.id!)} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-none">
                    {childrenTypes.length > 0 ? (
                       expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : <span className="w-1 h-1 rounded-full bg-slate-300"></span>}
                 </button>
                 <span className={`${depth === 0 ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'} text-sm`}>{type.name}</span>
             </div>
             <div className="hidden group-hover:flex space-x-2">
                <button onClick={() => setUnitTypeForm({...type})} className="text-xs font-semibold text-blue-500 hover:text-blue-700 hover:underline">Edit</button>
                <button onClick={() => handleDeleteUnitType(type.id as string)} className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:underline">Del</button>
             </div>
          </div>
          
          {expanded && childrenTypes.length > 0 && (
             <div className="flex flex-col">
                {childrenTypes.map(child => renderModalCategory(child, depth + 1))}
             </div>
          )}
       </div>
     );
  };

  const renderHierarchyNode = (type: UnitType, depth: number, branchContext?: string) => {
     const childrenTypes = unitTypes.filter(ut => ut.parent_id === type.id);
     const myUnits = units.filter(u => u.unit_type_id === type.id && (!branchContext || (u.branch || 'Head Office') === branchContext));
     
     const filteredMyUnits = myUnits.filter(u => {
        if (hwStatusFilter === 'ACTIVE' && u.is_active === false) return false;
        if (hwStatusFilter === 'INACTIVE' && u.is_active !== false) return false;
        return true;
     });

     const expanded = !!hierarchyExpanded[type.id!];

     const hasVisibleContent = (ut: UnitType): boolean => {
         const utUnits = units.filter(u => u.unit_type_id === ut.id && (!branchContext || (u.branch || 'Head Office') === branchContext)).filter(u => {
            if (hwStatusFilter === 'ACTIVE' && u.is_active === false) return false;
            if (hwStatusFilter === 'INACTIVE' && u.is_active !== false) return false;
            return true;
         });
         if (utUnits.length > 0) return true;
         const utChildren = unitTypes.filter(c => c.parent_id === ut.id);
         return utChildren.some(hasVisibleContent);
     };

     if (!hasVisibleContent(type)) return null;

     return (
       <div key={type.id} className="flex flex-col">
          {hwShowTypes && (
            <div className="flex items-center py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md cursor-pointer group" onClick={() => toggleHierarchyNode(type.id!)}>
              <div style={{ paddingLeft: `${depth * 20}px` }} className="flex items-center space-x-2 w-full pr-4">
                 <div className="w-4 h-4 flex items-center justify-center text-slate-400">
                    {childrenTypes.length > 0 || filteredMyUnits.length > 0 ? (
                       expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : <span className="w-1 h-1 rounded-full bg-slate-300"></span>}
                 </div>
                 <div className="text-indigo-500">
                    {expanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                 </div>
                 <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{type.name}</span>
                 <span className="text-xs text-slate-400 ml-auto group-hover:text-indigo-400">
                    {childrenTypes.length > 0 ? `${childrenTypes.length} sub-groups` : ''} {filteredMyUnits.length > 0 ? `${filteredMyUnits.length} units` : ''}
                 </span>
              </div>
            </div>
          )}
          
          {(!hwShowTypes || expanded) && (
             <div className="flex flex-col">
                {hwShowUnits && filteredMyUnits.map(u => (
                   <div key={u.id} className="flex items-center py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md">
                      <div style={{ paddingLeft: `${(depth + (hwShowTypes ? 1 : 0)) * 20 + 24}px` }} className="flex items-center space-x-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                         <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{u.name} {u.tibetan_name && <span className="text-xs text-slate-400 opacity-70 ml-1">({u.tibetan_name})</span>}</span>
                         <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{u.file_number}</span>
                      </div>
                   </div>
                ))}
                {childrenTypes.map(child => renderHierarchyNode(child, depth + (hwShowTypes ? 1 : 0), branchContext))}
             </div>
          )}
       </div>
     );
  };

  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'actions';
  
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [units, setUnits] = useState<AuditUnit[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [unitTypeForm, setUnitTypeForm] = useState<Partial<UnitType> | null>(null);
  const [isSavingUnitType, setIsSavingUnitType] = useState(false);
  const [showManageUnitTypes, setShowManageUnitTypes] = useState(false);
  
  // Hierarchy View state
  const [unitsTab, setUnitsTab] = useState<'list' | 'hierarchy'>('list');
  const [hierarchyExpanded, setHierarchyExpanded] = useState<Record<string, boolean>>({});
  const [hwShowTypes, setHwShowTypes] = useState(true);
  const [hwShowUnits, setHwShowUnits] = useState(true);
  const [hwGroupByBranch, setHwGroupByBranch] = useState(false);
  const [hwStatusFilter, setHwStatusFilter] = useState('ALL');
  const [customFys, setCustomFys] = useState<CustomFY[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignProject, setReassignProject] = useState<any>(null);
  const [viewDetailsProject, setViewDetailsProject] = useState<any>(null); const [handingTakingModal, setHandingTakingModal] = useState<any>(null); const [htCustomDate, setHtCustomDate] = useState<string>('');
  const [historyLogView, setHistoryLogView] = useState<{history: any[], name: string} | null>(null);
  const [userSortConfig, setUserSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, number>>({});
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [showSavedSuccess, setShowSavedSuccess] = useState(false);

  // Unit form state
  const [unitForm, setUnitForm] = useState<Partial<AuditUnit> | null>(null);
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // FY form state
  const [fyForm, setFyForm] = useState<Partial<CustomFY> | null>(null);
  const [isSavingFy, setIsSavingFy] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentFyStart = new Date().getMonth() < 3 ? currentYear - 1 : currentYear;
  const defaultFy = `FY ${currentFyStart}-${currentFyStart + 1}`;
  
  const [selectedExecFyFilter, setSelectedExecFyFilter] = useState<string>('ALL');
  const [selectedTargetFyFilter, setSelectedTargetFyFilter] = useState<string>('ALL');
  const [fyOffsetTop, setFyOffsetTop] = useState(0);
  const [fyOffsetBottom, setFyOffsetBottom] = useState(10);
  
  const highestFy = currentFyStart + fyOffsetTop;
  const totalFys = fyOffsetTop + fyOffsetBottom;

  const [projectSearchTerm, setProjectSearchTerm] = useState<string>('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('ALL');
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('ALL');
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);

  // Unit filters
  const [unitSearchTerm, setUnitSearchTerm] = useState<string>('');
  const [unitStatusFilter, setUnitStatusFilter] = useState<string>('ACTIVE');
  const [unitBranchFilter, setUnitBranchFilter] = useState<string>('ALL');

  const [hasLoadedFilters, setHasLoadedFilters] = useState(false);

  useEffect(() => {
    if (user && user.hierarchy_weight <= 30) {
      loadInitialData();
    }
  }, [user]);

  // Load global filters from local storage on mount
  useEffect(() => {
    const savedTarget = localStorage.getItem('globalTargetFy');
    const savedExec = localStorage.getItem('globalExecFy');
    if (savedTarget) setSelectedTargetFyFilter(savedTarget);
    if (savedExec) setSelectedExecFyFilter(savedExec);
    setHasLoadedFilters(true);
  }, []);

  useEffect(() => {
    if (user && user.hierarchy_weight <= 30 && hasLoadedFilters) {
      fetchProjects();
    }
  }, [user, selectedTargetFyFilter, selectedExecFyFilter, hasLoadedFilters]);

  const handleGlobalTargetFyChange = (val: string) => {
    setSelectedTargetFyFilter(val);
    localStorage.setItem('globalTargetFy', val);
  };

  const handleGlobalExecFyChange = (val: string) => {
    setSelectedExecFyFilter(val);
    localStorage.setItem('globalExecFy', val);
  };

  const filteredUnits = units.filter(u => {
    // Status Filter
    if (unitStatusFilter === 'ACTIVE' && u.is_active === false) return false;
    if (unitStatusFilter === 'INACTIVE' && u.is_active !== false) return false;
    
    // Branch Filter
    if (unitBranchFilter !== 'ALL' && (u.branch || 'Head Office') !== unitBranchFilter) return false;
    
    // Type Filter
    if (unitTypeFilter === 'UNCATEGORIZED' && u.unit_type_id) return false;
    if (unitTypeFilter !== 'ALL' && unitTypeFilter !== 'UNCATEGORIZED' && u.unit_type_id !== unitTypeFilter) return false;

    // Search Term Filter
    if (unitSearchTerm) {
      const search = unitSearchTerm.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(search);
      const matchTibetan = u.tibetan_name?.toLowerCase().includes(search);
      const matchFile = u.file_number?.toLowerCase().includes(search);
      if (!matchName && !matchTibetan && !matchFile) return false;
    }
    
    return true;
  });

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [usersData, unitsData, fysData, unitTypesData] = await Promise.all([
          getUsers(),
          getUnits(),
          getCustomFYs(),
          getUnitTypes()
        ]);
        setUsers(usersData);
        setUnits(unitsData);
        setCustomFys(fysData as any);
        setUnitTypes(unitTypesData);
    } catch (err) {
      console.error("Failed to load initial admin data", err);
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    setIsProjectsLoading(true);
    try {
      const data = await getProjects(selectedTargetFyFilter, selectedExecFyFilter);
      setProjects(data);
    } catch (e: any) {
      console.error("Failed to fetch projects", e);
    }
    setIsProjectsLoading(false);
  };

  const handleRoleChange = (userId: string, newWeight: number) => {
    setPendingRoleChanges(prev => ({ ...prev, [userId]: newWeight }));
  };

  const handleSaveRoles = async () => {
    const userIds = Object.keys(pendingRoleChanges);
    if (userIds.length === 0) return;

    setIsSavingRoles(true);
    try {
      const updates = userIds.map(userId => updateUserRole(userId, pendingRoleChanges[userId]));
      await Promise.all(updates);
      setUsers(users.map(u => pendingRoleChanges[u.id] !== undefined ? { ...u, hierarchy_weight: pendingRoleChanges[u.id] } : u));
      setPendingRoleChanges({});
      
      setShowSavedSuccess(true);
      setTimeout(() => setShowSavedSuccess(false), 2000);
      
    } catch (err) {
      alert("Failed to update user roles.");
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleExportExcel = async (project: any) => {
    try {
      const { exportToExcel } = await import('@/lib/exportExcel');
      await exportToExcel({
        gridData: project.gridData || [],
        checklistData: project.checklistData || { items: [] },
        metadata: project.metadata
      });
    } catch (e: any) {
      console.error("Export failed:", e);
      alert("Export failed.");
    }
  };

  const saveUnit = async () => {
    if (!unitForm?.name || !unitForm?.file_number) {
      alert("Name and File Number are required.");
      return;
    }
    setIsSavingUnit(true);
    try {
      if (unitForm.id) {
        await updateUnit(unitForm.id, unitForm as AuditUnit);
        setUnits(units.map(u => u.id === unitForm.id ? { ...u, ...unitForm } : u));
      } else {
        const newUnit = await createUnit(unitForm as AuditUnit);
        setUnits([...units, newUnit]);
      }
      setUnitForm(null);
    } catch (e: any) {
      console.error(e);
      alert("Failed to save unit.");
    }
    setIsSavingUnit(false);
  };

  const handleDeleteUnit = async (unit: AuditUnit) => {
    const linkedProjects = projects.filter(p => 
      p.metadata?.unitName === unit.name || 
      (unit.file_number && p.metadata?.unitName === `${unit.file_number} ${unit.name}`)
    );
    
    let message = `Are you sure you want to delete "${unit.name}"?`;
    if (linkedProjects.length > 0) {
      message = `WARNING: There are ${linkedProjects.length} Audit Program(s) linked to "${unit.name}".\n\nDeleting this unit will NOT delete those programs, but it will remove this unit from the global directory.\n\nDo you want to FORCE DELETE it anyway?`;
    }
    
    if (window.confirm(message)) {
      try {
        await deleteUnit(unit.id!);
        setUnits(units.filter(u => u.id !== unit.id));
      } catch (e: any) {
        console.error(e);
        alert("Failed to delete unit.");
      }
    }
  };

  const handleRegenerateNtfyTopic = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to regenerate the NTFY channel for ${userName}?\n\nThey will need to subscribe to the new channel on their device to continue receiving notifications.`)) {
      try {
        const api = await import('@/lib/api');
        const newTopic = 'oag-audit-' + Math.random().toString(36).substring(2, 10);
        await api.updateUserNtfyTopic(userId, newTopic);
        setUsers(users.map(u => u.id === userId ? { ...u, ntfyTopic: newTopic } : u));
      } catch (e: any) {
        console.error(e);
        alert("Failed to regenerate channel.");
      }
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (user?.id === userId) {
      alert("You cannot delete your own account while logged in.");
      return;
    }
    
    const warningMessage = `WARNING: Are you sure you want to permanently delete the user: ${userName}?\n\nIf this user has left the organization, DO NOT DELETE THEM! Instead, please use the "Suspend" button.\n\nSuspending a user blocks all their access to the system, but ensures that all past audits done by them will still show up properly in the audit tracking records.\n\nClick OK only if you are absolutely sure you want to permanently DESTROY this user's record.`;
    
    if (window.confirm(warningMessage)) {
      try {
        const api = await import('@/lib/api');
        await api.deleteUserAccount(userId);
        setUsers(users.filter(u => u.id !== userId));
      } catch (e: any) {
        console.error(e);
        alert("Failed to delete user.");
      }
    }
  };
  const handleEditUserName = async (userId: string, currentName: string) => {
    const newName = window.prompt("Enter the new name for this user:", currentName);
    if (newName !== null && newName.trim() !== "" && newName !== currentName) {
      try {
        const api = await import('@/lib/api');
        await api.updateUserName(userId, newName.trim());
        setUsers(users.map(u => u.id === userId ? { ...u, name: newName.trim() } : u));
      } catch (err) {
        console.error(err);
        alert("Failed to update user name.");
      }
    }
  };

  const handleToggleUser = async (userId: string, userName: string, currentIsActive: boolean) => {
    if (user?.id === userId) {
      alert("You cannot suspend your own account while logged in.");
      return;
    }
    const newStatus = currentIsActive === false ? true : false;
    const action = newStatus ? 'activate' : 'suspend';
    if (window.confirm(`Are you sure you want to ${action} the user: ${userName}?`)) {
      try {
        const api = await import('@/lib/api');
        await api.toggleUserActive(userId, newStatus);
        setUsers(users.map(u => u.id === userId ? { ...u, isActive: newStatus } : u));
      } catch (e: any) {
        console.error(e);
        alert(`Failed to ${action} user.`);
      }
    }
  };

  const handleAdminOverride = async (unit: AuditUnit, targetFY: string, execFY: string) => {
    if (targetFY === 'ALL') {
      alert("Please select a specific Global Unit FY from the dropdown at the top right before applying an Admin Override.");
      return;
    }
    
    if (execFY === 'ALL') {
      alert("Please select a specific Global Execution FY from the dropdown at the top right before applying an Admin Override.");
      return;
    }

    const overrideDateStr = window.prompt(`Admin Override: Mark ${unit.name} as Audited for Unit FY ${targetFY} and Exec FY ${execFY}\n\nEnter the completion date (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
    if (!overrideDateStr) return;

    const notes = window.prompt("Optional: Enter override notes or justification:");
    
    try {
      const api = await import('@/lib/api');
      const newProject = {
        metadata: {
          unitName: unit.name,
          financialYear: targetFY,
          executionFY: execFY,
          auditorName: user.name,
        },
        status: 'Audited',
        is_admin_override: true,
        submittedAt: new Date(overrideDateStr).toISOString(),
        nodes: [],
        edges: []
      };

      await api.saveProject(newProject, {
        action: 'Admin Override: Marked as Audited',
        userId: user.id,
        userName: user.name,
        notes: notes || undefined
      });
      alert('Project marked as audited via admin override.');
      fetchProjects();
    } catch (e: any) {
      console.error(e);
      alert('Failed to execute admin override.');
    }
  };

  const handleSupportExtension = async (project: any) => {
    const isExtension = project.status === 'Extension Requested';
    const isDraftSupport = project.status === 'Draft AP & CL Submitted';
    const actionType = isExtension ? 'extension request' : (isDraftSupport ? 'Draft AP & CL' : 'Audit Program');
    if (window.confirm(`Support ${actionType} for ${project.metadata?.unitName}?`)) {
      try {
        const api = await import('@/lib/api');
let newStatus = project.status;
          if (!project.metadata?.jsApproved) {
              newStatus = 'Pending Approval';
        if (isExtension) newStatus = 'Extension Supported';
if (isDraftSupport) newStatus = 'Draft AP & CL Supported';
          }
          const newMetadata = { ...project.metadata, dsSupported: true };

        await api.saveProject({
          ...project,
            status: newStatus,
            metadata: newMetadata
        }, {
          action: isExtension ? 'Supported Extension' : (isDraftSupport ? 'Supported Draft AP & CL' : 'Supported Audit Program'),
          userId: user.id,
          userName: user.name
        });
        
        // Notify Joint Secretary
        const jointId = project.metadata?.assignedJointId;
        if (jointId) {
          const jointUser = users.find(u => u.id === jointId);
          if (jointUser) {
             api.getOrCreateNtfyTopic(jointUser.id, jointUser.ntfyTopic).then(topicId => {
               if (topicId) {
                 api.sendNtfyNotification(topicId, `Action Required: Support received for ${project.metadata?.unitName}. Please approve.`, `Supported by ${user.name}`);
               }
             });
          }
        }
        
        // Notify Field Auditor ONLY for Drafts
        if (isDraftSupport) {
          const auditorId = project.createdBy;
          if (auditorId) {
            const auditorUser = users.find(u => u.id === auditorId);
            if (auditorUser) {
               api.getOrCreateNtfyTopic(auditorUser.id, auditorUser.ntfyTopic).then(topicId => {
                 if (topicId) {
                   api.sendNtfyNotification(topicId, `Status Update: ${project.metadata?.unitName}`, `Your Draft AP & CL was supported by ${user.name} and sent to the Joint Secretary.`);
                 }
               });
            }
          }
        }
        
        fetchProjects();
      } catch (e: any) {
        alert("Failed to update status.");
      }
    }
  };

  const handleApproveExtension = async (project: any) => {
    const isExtension = project.status === 'Extension Supported' || project.status === 'Extension Requested';
    const isDraftApproval = project.status === 'Draft AP & CL Supported' || project.status === 'Draft AP & CL Submitted';
    
    let confirmMessage = `Approve Audit Program? This will finalize it as 'Audited'.`;
    if (isExtension) confirmMessage = `Approve extension? This will finalize the revised dates and mark it as 'Audited'.`;
    if (isDraftApproval) confirmMessage = `Approve Draft AP & CL? This will allow the auditor to begin their fieldwork.`;
        
    if (window.confirm(confirmMessage)) {
      try {
        const api = await import('@/lib/api');
        
        let newStatus = 'Audited';
        if (isDraftApproval) newStatus = 'Draft AP & CL Approved';
        if (isExtension) newStatus = 'Extended (Approved)';

        const newMetadata = { ...project.metadata, jsApproved: true };

        const updatePayload: any = {
          ...project,
          status: newStatus,
          metadata: newMetadata
        };
        if (isExtension) {
            updatePayload.isRevised = true;
            updatePayload.isExtended = true;
        }

        await api.saveProject(updatePayload, {
          action: isExtension ? 'Approved Extension (Finalized)' : (isDraftApproval ? 'Approved Draft AP & CL' : 'Approved Audit Program'),
          userId: user.id,
          userName: user.name
        });
        
        // Notify Field Auditor
        const auditorId = project.createdBy;
        if (auditorId) {
           const auditorUser = users.find(u => u.id === auditorId);
           if (auditorUser) {
              api.getOrCreateNtfyTopic(auditorUser.id, auditorUser.ntfyTopic).then(topicId => {
                 if (topicId) {
                   api.sendNtfyNotification(topicId, `Approved: ${project.metadata?.unitName}`, `Approved by ${user.name}`);
                 }
              });
           }
        }

        // Notify Deputy Secretary ONLY for Drafts
        if (isDraftApproval) {
          const deputyId = project.metadata?.assignedDeputyId;
          if (deputyId && deputyId !== 'NA') {
             const deputyUser = users.find(u => u.id === deputyId);
             if (deputyUser) {
                api.getOrCreateNtfyTopic(deputyUser.id, deputyUser.ntfyTopic).then(topicId => {
                   if (topicId) {
                     api.sendNtfyNotification(topicId, `Approved: ${project.metadata?.unitName}`, `The Draft AP & CL you supported was Approved by ${user.name}`);
                   }
                });
             }
          }
        }

        // Notify Admin for Handing & Taking of Final AP & CL
        if (!isDraftApproval && !isExtension) {
          const admins = users.filter(u => u.hierarchy_weight <= 10);
          admins.forEach(async (admin) => {
            const topicId = await api.getOrCreateNtfyTopic(admin.id, admin.ntfyTopic);
            api.sendNtfyNotification(topicId, `Action Required: Handing & Taking`, `Joint Secretary ${user.name} has approved ${project.metadata?.unitName}. Please acknowledge receipt of F.S. and A.R.`);
          });
        }
        
        fetchProjects();
      } catch (e: any) {
        alert("Failed to update status.");
      }
    }
  };

  
  const handleSaveUnitType = async () => {
    if (!unitTypeForm || !unitTypeForm.name) return;
    setIsSavingUnitType(true);
    try {
      if (unitTypeForm.id) {
        await updateUnitType(unitTypeForm.id as string, { name: unitTypeForm.name, parent_id: unitTypeForm.parent_id || null });
      } else {
        await createUnitType({ name: unitTypeForm.name, parent_id: unitTypeForm.parent_id || null });
      }
      const fresh = await getUnitTypes();
      setUnitTypes(fresh);
      setUnitTypeForm(null);
    } catch (e: any) {
      alert('Error saving unit type: ' + e.message);
    }
    setIsSavingUnitType(false);
  };

  const handleDeleteUnitType = async (id: string) => {
    const assignedCount = units.filter(u => u.unit_type_id === id).length;
    if (assignedCount > 0) {
       if (!window.confirm("Warning: This category is assigned to " + assignedCount + " units. Deleting it will move them to 'Uncategorized'. Proceed?")) return;
    } else {
       if (!window.confirm('Delete this category?')) return;
    }

    try {
       await deleteUnitType(id as string);
       if (assignedCount > 0) {
          // Unassign affected units
          const affected = units.filter(u => u.unit_type_id === id);
          for (const u of affected) {
              await updateUnit(u.id as string, { unit_type_id: undefined });
          }
          const freshUnits = await getUnits();
          setUnits(freshUnits);
      }
      const freshTypes = await getUnitTypes();
      setUnitTypes(freshTypes);
    } catch (e: any) {
      alert('Error deleting unit type: ' + e.message);
    }
  };

  const handleHandingTakingSubmit = async () => {
    if (!handingTakingModal) return;
    const project = handingTakingModal;
    try {
      const api = await import('@/lib/api');
      const dateToUse = htCustomDate ? new Date(htCustomDate).toISOString() : new Date().toISOString();
      
      const newHandingTaking = { ...project.metadata?.handingTaking };
      let actionLabel = "";
      
      if (user.hierarchy_weight === 30) {
        newHandingTaking.dsAckDate = dateToUse;
        newHandingTaking.dsName = user.name;
        actionLabel = "Acknowledged Receipt (DS)";
      } else if (user.hierarchy_weight === 20) {
        newHandingTaking.jsAckDate = dateToUse;
        newHandingTaking.jsName = user.name;
        actionLabel = "Acknowledged Receipt (JS)";
      } else if (user.hierarchy_weight === 25) {
        newHandingTaking.publishDate = dateToUse;
        newHandingTaking.finaliserName = user.name;
        actionLabel = "Published Audit Report";
      } else if (user.hierarchy_weight <= 10) {
        newHandingTaking.adminAckDate = dateToUse;
        newHandingTaking.adminName = user.name;
        actionLabel = "Acknowledged Receipt (Admin)";
      }

      await api.saveProject({
        ...project,
        metadata: {
          ...project.metadata,
          handingTaking: newHandingTaking
        }
      }, {
        action: actionLabel,
        userId: user.id,
        userName: user.name
      });

      // Send notifications for handing and taking
      if (user.hierarchy_weight === 30 && project.metadata?.assignedJointId) {
        // DS -> JS
        const js = users.find(u => u.id === project.metadata.assignedJointId);
        if (js) {
          const topicId = await api.getOrCreateNtfyTopic(js.id, js.ntfyTopic);
          api.sendNtfyNotification(topicId, `Handing & Taking Update`, `Deputy Secretary ${user.name} has acknowledged receipt of F.S. and A.R. for ${project.metadata?.unitName}. Please also acknowledge and approve.`);
        }
      } else if (user.hierarchy_weight <= 10) {
        // Admin -> Finaliser
        const finalisers = users.filter(u => u.hierarchy_weight === 25);
        finalisers.forEach(async (fin) => {
          const topicId = await api.getOrCreateNtfyTopic(fin.id, fin.ntfyTopic);
          api.sendNtfyNotification(topicId, `Action Required: Publish Report`, `Admin ${user.name} has acknowledged receipt for ${project.metadata?.unitName}. Please publish the report.`);
        });
      }

      setHandingTakingModal(null);
      setHtCustomDate('');
      fetchProjects();
    } catch (e: any) {
      alert("Failed to update Handing & Taking.");
    }
  };

  const handleRejectExtension = async (project: any) => {
    const isExtension = project.status === 'Extension Requested' || project.status === 'Extension Supported';
    const isDraftReject = project.status === 'Draft AP & CL Submitted' || project.status === 'Draft AP & CL Supported';
    
    let confirmMessage = `Reject Audit Program? This will revert the project back to a 'Draft' for the auditor to fix.`;
    if (isExtension) confirmMessage = `Reject extension? This will revert the project back to the 'Submitted' state.`;
    if (isDraftReject) confirmMessage = `Reject Draft AP & CL? This will revert it back to a 'Draft' for the auditor to fix.`;

    if (window.confirm(confirmMessage)) {
      try {
        const api = await import('@/lib/api');
        
        let newStatus = 'Draft';
        if (isExtension) newStatus = 'Submitted';
        
        const updatePayload: any = {
          ...project,
          status: newStatus
        };
        if (isExtension) {
            updatePayload.isExtended = false;
            updatePayload.isRevised = false;
        } else {
            updatePayload.isRevised = true;
        }

        await api.saveProject(updatePayload, {
          action: isExtension ? 'Rejected Extension' : (isDraftReject ? 'Rejected Draft AP & CL' : 'Rejected Audit Program'),
          userId: user.id,
          userName: user.name
        });
        
        // Notify Field Auditor
        const auditor = users.find(u => u.id === project.createdBy);
        if (auditor) {
           api.getOrCreateNtfyTopic(auditor.id, auditor.ntfyTopic).then(topicId => {
             api.sendNtfyNotification(
               topicId, 
               isExtension ? 'Extension Rejected' : 'Audit Program Rejected', 
               isExtension 
                 ? `Your extension request for ${project.metadata?.unitName} has been Rejected. The Audit Program has been reverted.`
                 : `Your Audit Program for ${project.metadata?.unitName} has been Rejected. Please review and resubmit.`
             );
           }).catch(e => console.error("Push failed:", e));
        }

        fetchProjects();
      } catch (e: any) {
        alert("Failed to reject.");
      }
    }
  };

  const handleAdminDeleteProject = async (project: any) => {
    if (window.confirm(`SEVERE WARNING: You are about to permanently delete the Audit Program for ${project.metadata?.unitName}.\n\nThis action cannot be undone. Proceed?`)) {
      try {
        const api = await import('@/lib/api');
        await api.deleteProject(project.id);
        fetchProjects();
      } catch (e: any) {
        alert("Failed to delete project.");
      }
    }
  };

  const handleAdminRevertOverride = async (project: any) => {
    if (window.confirm(`Remove Admin Override for ${project.metadata?.unitName}? This will move the unit back to the Pending list.`)) {
      try {
        const api = await import('@/lib/api');
        await api.deleteProject(project.id);
        fetchProjects();
      } catch (e: any) {
        alert("Failed to remove override.");
      }
    }
  };

  const saveFy = async () => {
    if (!fyForm?.name || !fyForm?.start_date || !fyForm?.end_date) {
      alert("Name, Start Date, and End Date are required.");
      return;
    }
    setIsSavingFy(true);
    try {
      const newFy = await createCustomFY(fyForm as Omit<CustomFY, 'id'>);
      setCustomFys([...customFys, newFy]);
      setFyForm(null);
    } catch (e: any) {
      console.error(e);
      alert("Failed to save financial year.");
    }
    setIsSavingFy(false);
  };

  const handleDeleteFy = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this custom financial year?")) {
      try {
        await deleteCustomFY(id);
        setCustomFys(customFys.filter(f => f.id !== id));
      } catch (e: any) {
        alert("Failed to delete financial year.");
      }
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center mt-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;
  }

  if (!user || user.hierarchy_weight > 30) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <ShieldAlert size={64} className="text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Access Denied</h2>
        <p>You do not have permission to view the Admin Dashboard.</p>
      </div>
    );
  }

  const pendingMyAction = projects.filter(p => {
    if (!user) return false;

    // Apply Global FY Filters
    if (selectedTargetFyFilter !== 'ALL' && p.metadata?.financialYear !== selectedTargetFyFilter) return false;
    if (selectedExecFyFilter !== 'ALL' && p.metadata?.executionFY !== selectedExecFyFilter) return false;

    // Catch legacy 'Submitted' status as equivalent to 'Pending Support'
    const isPendingSupport = p.status === 'Pending Support' || (p.status === 'Submitted' && !p.isExtended);
    const isPendingDraftSupport = p.status === 'Draft AP & CL Submitted';
    const isPendingDraftApproval = p.status === 'Draft AP & CL Supported';
    
    // Handing and Taking additions
    const handingTaking = p.metadata?.handingTaking || {};
    const isPendingAdminAck = p.status === 'Audited' && !handingTaking.adminAckDate;
    const isPendingFinaliser = p.status === 'Audited' && !!handingTaking.adminAckDate && !handingTaking.publishDate;

    if (user.hierarchy_weight === 30) {
       if (p.metadata?.dsSupported !== undefined) {
           const isActionable = p.status !== 'Draft' && !p.status.includes('Rejected');
           return isActionable && p.metadata.dsSupported === false && p.metadata?.assignedDeputyId === user.id;
       }
       if (p.metadata?.dsSupported !== undefined) {
           const isActionable = p.status !== 'Draft' && !p.status.includes('Rejected');
           return isActionable && p.metadata.dsSupported === false && p.metadata?.assignedDeputyId === user.id;
       }
       return (p.status === 'Extension Requested' || isPendingSupport || isPendingDraftSupport) && p.metadata?.assignedDeputyId === user.id;
    }
    if (user.hierarchy_weight === 20) {
       if (p.metadata?.jsApproved !== undefined) {
           const isActionable = p.status !== 'Draft' && !p.status.includes('Rejected');
           return isActionable && p.metadata.jsApproved === false && p.metadata?.assignedJointId === user.id;
       }
       if (p.metadata?.jsApproved !== undefined) {
           const isActionable = p.status !== 'Draft' && !p.status.includes('Rejected');
           return isActionable && p.metadata.jsApproved === false && p.metadata?.assignedJointId === user.id;
       }
       return (p.status === 'Extension Supported' || p.status === 'Pending Approval' || isPendingDraftApproval || p.status === 'Extension Requested' || isPendingSupport || isPendingDraftSupport) && p.metadata?.assignedJointId === user.id;
    }
    if (user.hierarchy_weight === 25) {
       return isPendingFinaliser;
    }
    if (user.hierarchy_weight <= 10) {
       return p.status === 'Extension Requested' || p.status === 'Extension Supported' || isPendingSupport || p.status === 'Pending Approval' || isPendingDraftSupport || isPendingDraftApproval || isPendingAdminAck;
    }
    return false;
  });

  const filteredProjectsForStats = projects.filter(p => {
    if (selectedTargetFyFilter !== 'ALL' && p.metadata?.financialYear !== selectedTargetFyFilter) return false;
    if (selectedExecFyFilter !== 'ALL' && p.metadata?.executionFY !== selectedExecFyFilter) return false;
    return true;
  });

  const filteredUnitsForStats = units.filter(u => {
    if (u.is_active === false) return false;
    if (selectedTargetFyFilter !== 'ALL' && u.active_from_fy) {
      // Basic string comparison works for "FY 2024-2025"
      if (u.active_from_fy > selectedTargetFyFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Global FY Filters - Show on all tabs */}
      <div className="flex justify-end gap-4 mb-2">
        <div className="flex flex-col">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Global Unit FY</label>
          <select 
            value={selectedTargetFyFilter} 
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'LOAD_MORE_FUTURE') setFyOffsetTop(prev => prev + 5);
              else if (val === 'LOAD_MORE_PAST') setFyOffsetBottom(prev => prev + 5);
              else handleGlobalTargetFyChange(val);
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <optgroup label="Indian Financial Years">
              <option value="LOAD_MORE_FUTURE">↑ Load 5 more future FY...</option>
              {Array.from({length: totalFys}, (_, i) => {
                const y = highestFy - i;
                const val = `FY ${y}-${y+1}`;
                return <option key={val} value={val}>{val}</option>;
              })}
              <option value="LOAD_MORE_PAST">↓ Load 5 more older FY...</option>
            </optgroup>
            {customFys.length > 0 && (
              <optgroup label="Custom Financial Years">
                {customFys.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
              </optgroup>
            )}
          </select>
        </div>
        
        <div className="flex flex-col">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Global Execution FY</label>
          <select 
            value={selectedExecFyFilter} 
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'LOAD_MORE_FUTURE') setFyOffsetTop(prev => prev + 5);
              else if (val === 'LOAD_MORE_PAST') setFyOffsetBottom(prev => prev + 5);
              else handleGlobalExecFyChange(val);
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <optgroup label="Indian Financial Years">
              <option value="LOAD_MORE_FUTURE">↑ Load 5 more future FY...</option>
              {Array.from({length: totalFys}, (_, i) => {
                const y = highestFy - i;
                const val = `FY ${y}-${y+1}`;
                return <option key={val} value={val}>{val}</option>;
              })}
              <option value="LOAD_MORE_PAST">↓ Load 5 more older FY...</option>
            </optgroup>
            {customFys.length > 0 && (
              <optgroup label="Custom Financial Years">
                {customFys.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Header Cards - ONLY SHOW ON ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Audits</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{filteredProjectsForStats.filter(p => p.status === 'Audited').length}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{users.length}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Units</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{filteredUnitsForStats.length}</h3>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        {activeTab === 'actions' && (
          <div className="flex flex-col">
            <div className="p-4 border-b border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/10 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <ShieldAlert size={18} /> My Assigned Actions
                </h3>
                <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-1">
                  These Audit Programs have requested an extension and are waiting for your explicit support or approval.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Project Details</th>
                    <th className="px-6 py-4 font-semibold">Status / Timeline</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingMyAction.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        <CheckCircle size={32} className="mx-auto text-emerald-400 mb-3" />
                        <p className="font-medium text-slate-700 dark:text-slate-300">You're all caught up!</p>
                        <p className="text-xs mt-1">There are no pending actions waiting for your approval.</p>
                      </td>
                    </tr>
                  ) : pendingMyAction.map(p => {
                    const isPendingSupport = p.status === 'Pending Support' || (p.status === 'Submitted' && !p.isExtended);
                    const isPendingDraftSupport = p.status === 'Draft AP & CL Submitted';
                    const isPendingDraftApproval = p.status === 'Draft AP & CL Supported';
                    
                    const handingTaking = p.metadata?.handingTaking || {};

                    let badge = getStatusBadge(p);

                    const canSupport = (p.metadata?.dsSupported === false || p.status === 'Extension Requested' || isPendingSupport || isPendingDraftSupport) && user && (
                       user.id === p.metadata?.assignedDeputyId || 
                        
                       user.hierarchy_weight <= 10
                    );

                    const canApprove = (p.metadata?.jsApproved === false || p.status === 'Extension Supported' || p.status === 'Pending Approval' || isPendingDraftApproval || p.status === 'Extension Requested' || isPendingSupport || isPendingDraftSupport) && user && (
                       user.id === p.metadata?.assignedJointId || 
                       user.hierarchy_weight <= 10
                    );

                    // Handing and Taking Visibility
                    const isDsAckNeeded = p.status === 'Pending Support' && !handingTaking.dsAckDate && user && user.id === p.metadata?.assignedDeputyId;
                    const isJsAckNeeded = (p.status === 'Pending Approval' || p.status === 'Pending Support') && !handingTaking.jsAckDate && user && user.id === p.metadata?.assignedJointId;
                    const isAdminAckNeeded = (p.status === 'Audited' || p.status === 'Pending Approval' || p.status === 'Pending Support') && !handingTaking.adminAckDate && user && user.hierarchy_weight <= 10;
                    const isFinaliserNeeded = p.status === 'Audited' && !!handingTaking.adminAckDate && !handingTaking.publishDate && user && user.hierarchy_weight === 25;
                    const canAckHT = isDsAckNeeded || isJsAckNeeded || isAdminAckNeeded || isFinaliserNeeded;
                    
                    let actionButtonLabel = "Acknowledge receive of FS & AR";
                    if (isFinaliserNeeded) actionButtonLabel = "Publish Report";

                    const assignedDeputy = users.find(u => u.id === p.metadata?.assignedDeputyId)?.name || 'Unassigned';
                    const assignedJoint = users.find(u => u.id === p.metadata?.assignedJointId)?.name || 'Unassigned';

                    const start = p.metadata?.auditTotals?.startDate;
                    const end = p.metadata?.auditTotals?.endDate;
                    const origEnd = p.metadata?.originalEndDate;

                    return (
                      <tr key={p.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">{p.metadata?.unitName || 'Unknown'}</div>
                          <div className="text-xs text-slate-500 mb-2">Auditor: {p.metadata?.auditorName || '-'}</div>
                          
                          {origEnd ? (
                             <div className="text-[10px] space-y-1 mb-2">
                               <div className="text-slate-500"><span className="font-semibold text-slate-700 dark:text-slate-300">Original Timeline:</span> {start ? new Date(start).toLocaleDateString('en-GB') : '?'} to {new Date(origEnd).toLocaleDateString('en-GB')}</div>
                               <div className="text-indigo-600 dark:text-indigo-400"><span className="font-semibold">Extended Timeline:</span> {new Date(origEnd).toLocaleDateString('en-GB')} to {end ? new Date(end).toLocaleDateString('en-GB') : '?'}</div>
                             </div>
                          ) : (start || end) ? (
                             <div className="text-[10px] text-slate-500 mb-2">
                               <span className="font-semibold text-slate-700 dark:text-slate-300">Timeline:</span> {start ? new Date(start).toLocaleDateString('en-GB') : '?'} to {end ? new Date(end).toLocaleDateString('en-GB') : '?'}
                             </div>
                          ) : (
                             <div className="text-[10px] text-slate-500 mb-2 italic">
                               Audit Dates Not Assigned
                             </div>
                          )}

                          <div className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded-lg inline-block text-slate-700 dark:text-slate-300">
                            <div className="mb-1 border-b border-slate-200 dark:border-slate-700 pb-1">
                              <strong>Submitted:</strong> {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('en-GB') : 'Unknown'}
                            </div>
                            <strong>Deputy:</strong> {assignedDeputy} <br/>
                            <strong>Joint:</strong> {assignedJoint}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            {(p.status === 'Pending Approval' || p.status === 'Extension Supported') && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
                                Supported
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end space-y-2">
                            <button 
                              onClick={() => setViewDetailsProject(p)}
                              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                            >
                              <span>View AP & CL</span>
                            </button>

                            {canAckHT && (
                                <button 
                                  onClick={() => {
                                      setHandingTakingModal(p);
                                      setHtCustomDate('');
                                  }}
                                  className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                                >
                                  <span>{actionButtonLabel}</span>
                                </button>
                            )}

                            {canSupport && (
                              <button 
                                onClick={() => {
                                  if (isDsAckNeeded) {
                                    alert("You must Acknowledge receipt of Financial Statement and Audit Report first!");
                                    return;
                                  }
                                  handleSupportExtension(p);
                                }}
                                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold w-full justify-center md:w-auto transition-colors ${isDsAckNeeded ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'}`}
                              >
                                <span>Support</span>
                              </button>
                            )}

                            {canApprove && (
                              <button 
                                onClick={() => {
                                  if (isJsAckNeeded || isAdminAckNeeded) {
                                      alert("You must Acknowledge receipt of Financial Statement and Audit Report first!");
                                      return;
                                    }
                                  handleApproveExtension(p);
                                }}
                                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold w-full justify-center md:w-auto transition-colors ${(isJsAckNeeded || isAdminAckNeeded) ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50'}`}
                              >
                                <span>Approve</span>
                              </button>
                            )}

                            {(canSupport || canApprove) && !p.metadata?.jsApproved && (
                                <button 
                                  onClick={() => handleRejectExtension(p)}
                                className="inline-flex items-center space-x-2 px-3 py-1.5 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                              >
                                <span>Reject</span>
                              </button>
                            )}

                            {p.metadata?.history && p.metadata.history.length > 0 && (
                              <button 
                                onClick={() => setHistoryLogView({ history: p.metadata.history || [], name: p.metadata?.unitName || 'Unknown Project' })}
                                className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                              >
                                <CalendarDays size={14} />
                                <span>History</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard 
              projects={projects} 
              units={units} 
              unitTypes={unitTypes} 
            recentFYs={Array.from({length: totalFys}, (_, i) => {
              const y = highestFy - i;
              return `FY ${y}-${y+1}`;
            })} 
            customFys={customFys} 
            userRole={user.hierarchy_weight}
            onAdminOverride={handleAdminOverride}
            onAdminRevert={handleAdminRevertOverride}
            onLoadMoreFuture={() => setFyOffsetTop(prev => prev + 5)}
            onLoadMorePast={() => setFyOffsetBottom(prev => prev + 5)}
            globalTargetFY={selectedTargetFyFilter}
            globalExecutionFY={selectedExecFyFilter}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsDashboard 
            projects={projects}
            users={users}
            globalUnitFY={selectedTargetFyFilter}
            globalExecutionFY={selectedExecFyFilter}
          />
        )}

        {activeTab === 'handing_taking' && (
          <div className="flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Handing and Taking Book</h3>
                <p className="text-xs text-slate-500 mt-1">Status of Audited Financial Statements and Audit Reports.</p>
              </div>
              <button 
                onClick={async () => {
                  const headers = ["Unit Name", "Branch", "File Number", "Financial Year", "Field Auditor", "DS Acknowledgement", "JS Acknowledgement", "Admin Acknowledgement", "Report Publish Date"];
                  const rows = projects.filter(p => p.status === 'Audited').map(p => {
                    const ht = p.metadata?.handingTaking || {};
                    const auditor = users.find(u => u.id === p.createdBy)?.name || "Unknown";
                    
                    const matchedUnit = units.find(u => {
                      const dName = u.file_number ? `${u.file_number} ${u.name}` : u.name;
                      return dName === p.metadata?.unitName || u.name === p.metadata?.unitName;
                    }) || { branch: '-', file_number: '-' };

                    return [
                      p.metadata?.unitName || "",
                      matchedUnit.branch || p.metadata?.branch || "-",
                      matchedUnit.file_number || p.metadata?.fileNumber || "-",
                      p.metadata?.financialYear || "",
                      auditor,
                      ht.dsAckDate ? `${new Date(ht.dsAckDate).toLocaleDateString()} (${ht.dsName || 'DS'})` : "Pending",
                      ht.jsAckDate ? `${new Date(ht.jsAckDate).toLocaleDateString()} (${ht.jsName || 'JS'})` : "Pending",
                      ht.adminAckDate ? `${new Date(ht.adminAckDate).toLocaleDateString()} (${ht.adminName || 'Admin'})` : "Pending",
                      ht.publishDate ? `${new Date(ht.publishDate).toLocaleDateString()} (${ht.finaliserName || 'Finaliser'})` : "Pending",
                    ];
                  });
                  
                  try {
                    const { exportHandingTakingToExcel } = await import('@/lib/exportExcel');
                    await exportHandingTakingToExcel(headers, rows);
                  } catch (e: any) {
                    console.error("Excel export failed:", e);
                    alert("Failed to export to Excel.");
                  }
                }}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-xs font-semibold flex items-center space-x-2"
              >
                <Download size={14} />
                <span>Export Excel</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Unit Name</th>
                    <th className="px-4 py-3 font-semibold">Branch</th>
                    <th className="px-4 py-3 font-semibold">File Number</th>
                    <th className="px-4 py-3 font-semibold">FY</th>
                    <th className="px-4 py-3 font-semibold">Auditor</th>
                    <th className="px-4 py-3 font-semibold">DS Ack</th>
                    <th className="px-4 py-3 font-semibold">JS Ack</th>
                    <th className="px-4 py-3 font-semibold">Admin Ack</th>
                    <th className="px-4 py-3 font-semibold">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {projects.filter(p => p.status === 'Audited').map(p => {
                    const ht = p.metadata?.handingTaking || {};
                    const auditor = users.find(u => u.id === p.createdBy)?.name || "Unknown";
                    
                    const matchedUnit = units.find(u => {
                      const dName = u.file_number ? `${u.file_number} ${u.name}` : u.name;
                      return dName === p.metadata?.unitName || u.name === p.metadata?.unitName;
                    }) || { branch: '-', file_number: '-' };

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{p.metadata?.unitName}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{matchedUnit.branch || p.metadata?.branch || '-'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{matchedUnit.file_number || p.metadata?.fileNumber || '-'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.metadata?.financialYear}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{auditor}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {ht.dsAckDate ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{new Date(ht.dsAckDate).toLocaleDateString()} <br/><span className="text-[10px] text-slate-400">({ht.dsName})</span></span> : <span className="text-amber-500 text-xs">Pending</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {ht.jsAckDate ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{new Date(ht.jsAckDate).toLocaleDateString()} <br/><span className="text-[10px] text-slate-400">({ht.jsName})</span></span> : <span className="text-amber-500 text-xs">Pending</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {ht.adminAckDate ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{new Date(ht.adminAckDate).toLocaleDateString()} <br/><span className="text-[10px] text-slate-400">({ht.adminName})</span></span> : <span className="text-amber-500 text-xs">Pending</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {ht.publishDate ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{new Date(ht.publishDate).toLocaleDateString()} <br/><span className="text-[10px] text-slate-400">({ht.finaliserName})</span></span> : <span className="text-amber-500 text-xs">Pending</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audits' && (
          <div className="flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 dark:bg-slate-900/20 gap-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Track Audit Progress</h3>
              <div className="flex flex-col md:flex-row items-center space-x-0 md:space-x-3 space-y-3 md:space-y-0 w-full md:w-auto">
                <div className="relative w-full md:w-48">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={projectSearchTerm}
                    onChange={(e) => setProjectSearchTerm(e.target.value)}
                    placeholder="Search Unit or Auditor..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                
                <select
                  value={projectTypeFilter}
                  onChange={(e) => setProjectTypeFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full md:w-36"
                >
                  <option value="ALL">All Categories</option>
                  <option value="UNCATEGORIZED">Uncategorized</option>
                  {renderParentOptions(null, 0)}
                </select>
                <select
                  value={projectStatusFilter}
                  onChange={(e) => setProjectStatusFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full md:w-36"
                >
                  <option value="ALL">All Status</option>
                  <option value="Draft">Draft / In Progress</option>
                  <option value="Submitted">Audited (Submitted)</option>
                  <option value="Extension Requested">Pending Support</option>
                  <option value="Extension Supported">Pending Approval</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto relative">
              {isProjectsLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 z-10 flex items-center justify-center">
                   <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              )}
              <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">Project Details</th>
                  <th className="px-6 py-4 font-semibold">Dates & Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {projects.filter(p => {
                   if (selectedExecFyFilter !== 'ALL' && p.metadata?.executionFY !== selectedExecFyFilter) return false;
                   if (selectedTargetFyFilter !== 'ALL' && p.metadata?.financialYear !== selectedTargetFyFilter) return false;
                   if (projectStatusFilter !== 'ALL') {
    if (projectStatusFilter === 'Pending Support' && (p.status === 'Pending Support' || (p.status === 'Submitted' && !p.isExtended))) {
        // match legacy
    } else if (p.status !== projectStatusFilter) {
        return false;
    }
}
                   if (projectTypeFilter !== 'ALL') {
                      const matchedUnit = units.find(u => u.name === p.metadata?.unitName);
                      if (projectTypeFilter === 'UNCATEGORIZED' && matchedUnit?.unit_type_id) return false;
                      if (projectTypeFilter !== 'UNCATEGORIZED' && matchedUnit?.unit_type_id !== projectTypeFilter) return false;
                   }
                   if (projectSearchTerm) {
                      const searchLower = projectSearchTerm.toLowerCase();
                      const unitMatch = (p.metadata?.unitName || '').toLowerCase().includes(searchLower);
                      const audMatch = (p.metadata?.auditorName || '').toLowerCase().includes(searchLower);
                      const idMatch = (p.customId || '').toLowerCase().includes(searchLower);
                      if (!unitMatch && !audMatch && !idMatch) return false;
                   }
                   return true; }).map(p => {
                  const end = p.metadata?.auditTotals?.endDate;
                  const start = p.metadata?.auditTotals?.startDate;
                  const isPast = end && new Date() > new Date(end);
                  const isPendingSupport = p.status === 'Pending Support' || (p.status === 'Submitted' && !p.isExtended);
                  const isPendingDraftSupport = p.status === 'Draft AP & CL Submitted';
                  const isPendingDraftApproval = p.status === 'Draft AP & CL Supported';
                  
                  let badge = getStatusBadge(p);

                  const canSupport = (p.metadata?.dsSupported === false || p.status === 'Extension Requested' || isPendingSupport || isPendingDraftSupport) && user && (
                     user.id === p.metadata?.assignedDeputyId || 
                      
                     user.hierarchy_weight <= 10
                  );

                  const canApprove = (p.metadata?.jsApproved === false || p.status === 'Extension Supported' || p.status === 'Pending Approval' || isPendingDraftApproval || p.status === 'Extension Requested' || isPendingSupport || isPendingDraftSupport) && user && (
                     user.id === p.metadata?.assignedJointId || 
                     user.hierarchy_weight <= 10
                  );

                  const assignedDeputy = users.find(u => u.id === p.metadata?.assignedDeputyId)?.name || 'Unassigned';
                  const assignedJoint = users.find(u => u.id === p.metadata?.assignedJointId)?.name || 'Unassigned';

                    const handingTaking = p.metadata?.handingTaking || {};
                    const isDsAckNeeded = p.status === 'Pending Support' && !handingTaking.dsAckDate && user && user.id === p.metadata?.assignedDeputyId;
                    const isJsAckNeeded = (p.status === 'Pending Approval' || p.status === 'Pending Support') && !handingTaking.jsAckDate && user && user.id === p.metadata?.assignedJointId;
                    const isAdminAckNeeded = (p.status === 'Audited' || p.status === 'Pending Approval' || p.status === 'Pending Support') && !handingTaking.adminAckDate && user && user.hierarchy_weight <= 10;

                    return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">{p.metadata?.unitName || 'Unknown'} {p.metadata?.financialYear || ''}</div>
                      <div className="text-xs text-slate-500 mb-1">ID: {p.customId || p.id} • Auditor: {p.metadata?.auditorName || '-'}</div>
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <div><strong>Unit FY:</strong> {p.metadata?.financialYear || '-'}</div>
                        <div><strong>Execution FY:</strong> {p.metadata?.executionFY || '-'}</div>
                      </div>
                      <div className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded-lg inline-block text-slate-700 dark:text-slate-300">
                        <div className="mb-1 border-b border-slate-200 dark:border-slate-700 pb-1">
                          <strong>Submitted:</strong> {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('en-GB') : 'Unknown'}
                        </div>
                        <strong>Deputy:</strong> {assignedDeputy} <br/>
                        <strong>Joint:</strong> {assignedJoint}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.metadata?.originalEndDate ? (
                         <div className="text-[10px] space-y-1 mb-1.5">
                           <div className="text-slate-500"><span className="font-semibold text-slate-700 dark:text-slate-300">Orig:</span> {start ? new Date(start).toLocaleDateString('en-GB') : '?'} to {new Date(p.metadata.originalEndDate).toLocaleDateString('en-GB')}</div>
                           <div className="text-indigo-600 dark:text-indigo-400"><span className="font-semibold">Ext:</span> {new Date(p.metadata.originalEndDate).toLocaleDateString('en-GB')} to {end ? new Date(end).toLocaleDateString('en-GB') : '?'}</div>
                         </div>
                      ) : (
                         <div className="text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                           {start ? new Date(start).toLocaleDateString('en-GB') : '-'} to {end ? new Date(end).toLocaleDateString('en-GB') : '-'}
                         </div>
                      )}
                      <div className="flex flex-col items-start gap-1.5 mt-1">
                        {(p.status === 'Pending Approval' || p.status === 'Extension Supported') && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
                            Supported
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                        {p.status === 'Audited' && p.metadata?.handingTaking?.publishDate && (
                           <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-purple-100 text-purple-700 border-purple-200">
                              Report Published
                           </span>
                        )}
                        {p.status === 'Audited' && !p.metadata?.handingTaking?.publishDate && (
                           <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-500 border-slate-200">
                              Report Not Published
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end space-y-2">
                        <button 
                          onClick={() => setViewDetailsProject(p)}
                          className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                        >
                          <span>View AP & CL</span>
                        </button>

                        {p.status === 'Audited' && (
                          p.is_admin_override ? (
                            <div className="px-3 py-1.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-lg text-xs font-semibold text-center w-full md:w-auto">
                              Excel export not available due to Audit override by Admin
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleExportExcel(p)}
                              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                            >
                              <Download size={14} />
                              <span>Export Excel</span>
                            </button>
                          )
                        )}
                        
                        {canSupport && (
                          <button 
                            onClick={() => handleSupportExtension(p)}
                            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                          >
                            <span>Support</span>
                          </button>
                        )}

                        {canApprove && (
                          <button 
                            onClick={() => {
                              if (isJsAckNeeded || isAdminAckNeeded) {
                                alert("You must Acknowledge receipt of Financial Statement and Audit Report first!");
                                return;
                              }
                              handleApproveExtension(p);
                            }}
                            className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold w-full justify-center md:w-auto transition-colors ${(isJsAckNeeded || isAdminAckNeeded) ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'}`}
                          >
                            <span>Approve Extension</span>
                          </button>
                        )}

                        {user && user.hierarchy_weight <= 20 && (
                          <button 
                            onClick={() => setReassignProject(p)}
                            className="inline-flex items-center space-x-2 px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                          >
                            <span>Reassign</span>
                          </button>
                        )}

                        <button 
                          onClick={() => setHistoryLogView({ history: p.history || [], name: p.metadata?.unitName || 'Unknown Project' })}
                          className="inline-flex items-center space-x-2 px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                        >
                          <CalendarDays size={14} />
                          <span>History</span>
                        </button>

                        {user && user.hierarchy_weight <= 10 && (
                          <button 
                            onClick={() => handleAdminDeleteProject(p)}
                            className="inline-flex items-center space-x-2 px-3 py-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                          >
                            <Trash2 size={14} />
                            <span>Force Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              </table>
              
              {projects.filter(p => {
                 if (selectedExecFyFilter !== 'ALL' && p.metadata?.executionFY !== selectedExecFyFilter) return false;
                 if (selectedTargetFyFilter !== 'ALL' && p.metadata?.financialYear !== selectedTargetFyFilter) return false;
                 if (projectStatusFilter !== 'ALL') {
    if (projectStatusFilter === 'Pending Support' && (p.status === 'Pending Support' || (p.status === 'Submitted' && !p.isExtended))) {
        // match legacy
    } else if (p.status !== projectStatusFilter) {
        return false;
    }
}
                 if (projectSearchTerm) {
                    const searchLower = projectSearchTerm.toLowerCase();
                    const unitMatch = (p.metadata?.unitName || '').toLowerCase().includes(searchLower);
                    const audMatch = (p.metadata?.auditorName || '').toLowerCase().includes(searchLower);
                    const idMatch = (p.customId || '').toLowerCase().includes(searchLower);
                    if (!unitMatch && !audMatch && !idMatch) return false;
                 }
                 return true;
              }).length === 0 && (
                <div className="px-6 py-8 text-center text-slate-500">No audit programs found for this filter.</div>
              )}
          </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">User Roles</h3>
                <p className="text-xs text-slate-500 mt-1">Manage user access levels across the system.</p>
              </div>
              <button 
                onClick={handleSaveRoles}
                disabled={Object.keys(pendingRoleChanges).length === 0 || isSavingRoles || showSavedSuccess}
                className={`inline-flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${showSavedSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {showSavedSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
                <span>{isSavingRoles ? 'Saving...' : showSavedSuccess ? 'Saved!' : 'Save Role Changes'}</span>
              </button>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => {
                       const direction = userSortConfig?.key === 'name' && userSortConfig.direction === 'asc' ? 'desc' : 'asc';
                       setUserSortConfig({ key: 'name', direction });
                    }}
                  >
                    Name {userSortConfig?.key === 'name' ? (userSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => {
                       const direction = userSortConfig?.key === 'email' && userSortConfig.direction === 'asc' ? 'desc' : 'asc';
                       setUserSortConfig({ key: 'email', direction });
                    }}
                  >
                    Email Account {userSortConfig?.key === 'email' ? (userSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => {
                       const direction = userSortConfig?.key === 'hierarchy_weight' && userSortConfig.direction === 'asc' ? 'desc' : 'asc';
                       setUserSortConfig({ key: 'hierarchy_weight', direction });
                    }}
                  >
                    Role / Weightage {userSortConfig?.key === 'hierarchy_weight' ? (userSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-6 py-4 font-semibold">NTFY Channel</th>
                  {user && user.hierarchy_weight <= 10 && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...users].sort((a, b) => {
                   if (!userSortConfig) return 0;
                   const aVal = a[userSortConfig.key];
                   const bVal = b[userSortConfig.key];
                   if (typeof aVal === 'string' && typeof bVal === 'string') {
                      return userSortConfig.direction === 'asc' 
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                   }
                   if (typeof aVal === 'number' && typeof bVal === 'number') {
                      return userSortConfig.direction === 'asc' 
                        ? aVal - bVal
                        : bVal - aVal;
                   }
                   return 0;
                }).map(u => (
                  <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${u.isActive === false ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-center space-x-2">
                        <span>{u.name || 'Unknown'}</span>
                        {u.isActive === false && <span className="px-2 py-0.5 text-[10px] bg-rose-100 text-rose-700 font-bold rounded-full">Suspended</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.email || '-'}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={pendingRoleChanges[u.id] !== undefined ? pendingRoleChanges[u.id] : (u.hierarchy_weight || 40)}
                        onChange={(e) => handleRoleChange(u.id, Number(e.target.value))}
                        disabled={(user && user.hierarchy_weight > 10) || (user && user.id === u.id)}
                        className={`bg-white dark:bg-slate-900 border ${pendingRoleChanges[u.id] !== undefined ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700'} text-slate-700 dark:text-slate-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 transition-colors`}
                      >
                        <option value={10}>Secretary (L1)</option>
                        <option value={25}>Report Finaliser</option>
                        <option value={20}>Joint Secretary (L2)</option>
                        <option value={30}>Deputy Secretary (L3)</option>
                        <option value={40}>Field Auditor (L4)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {u.ntfyTopic ? (
                           <div className="flex items-center space-x-2">
                             <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono select-all">
                                {u.ntfyTopic}
                             </code>
                             {user && user.hierarchy_weight <= 10 && (
                               <button 
                                 onClick={() => handleRegenerateNtfyTopic(u.id, u.name)}
                                 className="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 p-1 rounded transition-colors"
                                 title="Regenerate Channel ID"
                               >
                                 <RefreshCw size={12} />
                               </button>
                             )}
                           </div>
                        ) : (
                           <div className="flex items-center space-x-2">
                             <span className="text-xs text-slate-400 italic">Not generated</span>
                             {user && user.hierarchy_weight <= 10 && (
                               <button 
                                 onClick={() => handleRegenerateNtfyTopic(u.id, u.name)}
                                 className="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 px-2 py-0.5 text-[10px] font-bold rounded transition-colors"
                                 title="Generate Channel ID"
                               >
                                 Generate
                               </button>
                             )}
                           </div>
                        )}
                      </td>
                    {user && user.hierarchy_weight <= 10 && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                           <button 
                             onClick={() => handleEditUserName(u.id, u.name)}
                             className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors inline-flex"
                             title="Edit User Name"
                           >
                             <Edit2 size={16} />
                           </button>
                           <button 
                             onClick={() => handleToggleUser(u.id, u.name, u.isActive)}
                             className={`p-1.5 rounded-md transition-colors inline-flex ${u.isActive === false ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30' : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`}
                             title={u.isActive === false ? "Activate User" : "Suspend User"}
                           >
                             {u.isActive === false ? <CheckCircle size={16} /> : <Ban size={16} />}
                           </button>
                           <button 
                             onClick={() => handleDeleteUser(u.id, u.name)}
                             className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors inline-flex"
                             title="Force Delete User"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 dark:bg-slate-900/20 gap-4">
              <div className="flex items-center space-x-4">
                 <h3 className="font-semibold text-slate-800 dark:text-slate-200">Registered Units</h3>
                 <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
                    <button onClick={() => setUnitsTab('list')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${unitsTab === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}>List View</button>
                    <button onClick={() => setUnitsTab('hierarchy')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${unitsTab === 'hierarchy' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}><Network size={12} /><span>Mind Map</span></button>
                 </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center space-x-0 md:space-x-3 space-y-3 md:space-y-0 w-full md:w-auto">
                <div className="relative w-full md:w-48">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={unitSearchTerm}
                    onChange={(e) => setUnitSearchTerm(e.target.value)}
                    placeholder="Search units..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <select
                    value={unitTypeFilter}
                    onChange={(e) => setUnitTypeFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full md:w-auto"
                >
                    <option value="ALL">All Categories</option>
                    <option value="UNCATEGORIZED">Uncategorized</option>
                    {unitTypes.map(ut => <option key={ut.id} value={ut.id as string}>{ut.name}</option>)}
                </select>
                
                <select 
                  value={unitBranchFilter} 
                  onChange={(e) => setUnitBranchFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full md:w-auto"
                >
                  <option value="ALL">All Branches</option>
                  <option value="Head Office">Head Office</option>
                  <option value="Dekyiling Branch">Dekyiling Branch</option>
                  <option value="Nepal Branch">Nepal Branch</option>
                  <option value="South Branch">South Branch</option>
                </select>

                <select 
                  value={unitStatusFilter} 
                  onChange={(e) => setUnitStatusFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full md:w-auto"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="flex space-x-2 w-full md:w-auto mt-4 md:mt-0">
                {!unitForm && (
                  <button 
                    onClick={() => setUnitForm({ file_number: '', name: '', tibetan_name: '', is_active: true })}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus size={16} /> <span>Add Unit</span>
                  </button>
                )}
              </div>
            </div>

            {unitForm && !unitForm.id && renderUnitForm(false)}

            {unitsTab === 'list' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold">File Number</th>
                    <th className="px-6 py-4 font-semibold">Unit Names</th>
                    <th className="px-6 py-4 font-semibold">Branch</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Unit Type</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No units match your filters.</td>
                    </tr>
                  ) : filteredUnits.map(u => (
                    <React.Fragment key={u.id}>
                    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${u.is_active === false ? 'opacity-60' : ''} ${unitForm?.id === u.id ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{u.file_number}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.tibetan_name || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.branch || 'Head Office'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.is_active !== false ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                          {u.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-medium">
                        {u.unit_type_id ? unitTypes.find(ut => ut.id === u.unit_type_id)?.name || 'Unknown' : 'Uncategorized'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => setUnitForm(u)}
                          title="Edit Unit"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUnit(u)}
                          title="Delete Unit"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                    {unitForm?.id === u.id && (
                       <tr>
                          <td colSpan={6} className="p-0 border-b border-indigo-100 dark:border-indigo-900/30">
                             {renderUnitForm(true)}
                          </td>
                       </tr>
                    )}
                    </React.Fragment>
                  ))}
                  {units.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No units registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
        
            {unitsTab === 'hierarchy' && (
               <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 min-h-[500px]">
                  <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                     <div className="flex space-x-2">
                        <button onClick={expandAllHierarchy} className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg">Expand All</button>
                        <button onClick={collapseAllHierarchy} className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg">Collapse All</button>
                     </div>
                     <div className="flex items-center space-x-4 border-l border-slate-200 dark:border-slate-700 pl-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                           <input type="checkbox" checked={hwShowTypes} onChange={e => setHwShowTypes(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                           <span className="text-sm text-slate-600 font-medium">Categories</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                           <input type="checkbox" checked={hwShowUnits} onChange={e => setHwShowUnits(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                           <span className="text-sm text-slate-600 font-medium">Units</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer border-l border-slate-200 dark:border-slate-700 pl-4">
                           <input type="checkbox" checked={hwGroupByBranch} onChange={e => setHwGroupByBranch(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                           <span className="text-sm text-slate-600 font-medium">Group by Branch</span>
                        </label>
                     </div>
                     <select value={hwStatusFilter} onChange={e => setHwStatusFilter(e.target.value)} className="ml-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none">
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active Only</option>
                        <option value="INACTIVE">Inactive Only</option>
                     </select>
                  </div>
                  
                  <div className="flex flex-col space-y-4">
                     {/* Rendering root categories */}
                     {hwGroupByBranch ? (
                        ['Head Office', 'Dekyiling Branch', 'Nepal Branch', 'South Branch'].map(branch => {
                            // Filter units by branch, then see if they have categories
                            const branchUnits = units.filter(u => (u.branch || 'Head Office') === branch);
                            const hasActiveUnits = branchUnits.some(u => hwStatusFilter === 'ALL' || (hwStatusFilter === 'ACTIVE' && u.is_active !== false) || (hwStatusFilter === 'INACTIVE' && u.is_active === false));
                            if (!hasActiveUnits) return null;
                            const bExpanded = !!hierarchyExpanded['__BRANCH__'+branch];
                            
                            return (
                               <div key={branch} className="flex flex-col mb-2">
                                  <div className="flex items-center py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md cursor-pointer group bg-slate-50/50 dark:bg-slate-800/20" onClick={() => toggleHierarchyNode('__BRANCH__'+branch)}>
                                     <div className="flex items-center space-x-2 px-2">
                                        <div className="text-indigo-600">{bExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</div>
                                        <div className="text-indigo-700"><Building2 size={16}/></div>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{branch}</span>
                                     </div>
                                  </div>
                                  {bExpanded && (
                                     <div className="flex flex-col pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/30 ml-4 mt-2 space-y-2">
                                        {/* For grouped by branch, we just render all units of this branch categorized. Wait, if it's categorized, the tree logic is different. For simplicity in this version, we will just render the categories, but ONLY the units in this branch. The helper uses global units. We need a customized render for Branchwise. */}
                                        
                                        <div className="mb-2 mt-2">
                                           {unitTypes.filter(ut => !ut.parent_id).map(root => renderHierarchyNode(root, 0, branch))}
                                        </div>
                                        <div className="mb-2">
                                           {(() => {
                                              const uncategorizedUnits = units.filter(u => !u.unit_type_id && (u.branch || 'Head Office') === branch).filter(u => {
                                                 if (hwStatusFilter === 'ACTIVE' && u.is_active === false) return false;
                                                 if (hwStatusFilter === 'INACTIVE' && u.is_active !== false) return false;
                                                 return true;
                                              });
                                              if (uncategorizedUnits.length === 0) return null;
                                              
                                              const uExpanded = !!hierarchyExpanded['__UNCATEGORIZED__'+branch];
                                              return (
                                                 <div className="flex flex-col">
                                                    {hwShowTypes && (
                                                       <div className="flex items-center py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md cursor-pointer group" onClick={() => toggleHierarchyNode('__UNCATEGORIZED__'+branch)}>
                                                         <div className="flex items-center space-x-2 w-full pr-4 px-2">
                                                            <div className="w-4 h-4 flex items-center justify-center text-slate-400">{uExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
                                                            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Uncategorized ({branch})</span>
                                                            <span className="text-xs text-slate-400 ml-auto">{uncategorizedUnits.length} units</span>
                                                         </div>
                                                       </div>
                                                    )}
                                                    {(!hwShowTypes || uExpanded) && hwShowUnits && (
                                                       <div className="flex flex-col">
                                                          {uncategorizedUnits.map(u => (
                                                             <div key={u.id} className="flex items-center py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md">
                                                                <div style={{ paddingLeft: `${(hwShowTypes ? 1 : 0) * 20 + 24}px` }} className="flex items-center space-x-2">
                                                                   <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                                                   <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{u.name}</span>
                                                                </div>
                                                             </div>
                                                          ))}
                                                       </div>
                                                    )}
                                                 </div>
                                              )
                                           })()}
                                        </div>

                                     </div>
                                  )}
                               </div>
                            )
                        })
                     ) : (
                        <>
                           <div className="mb-4">
                              <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1 flex items-center space-x-2"><FolderOpen size={16} className="text-indigo-500"/> <span>Categorized</span></h4>
                              {unitTypes.filter(ut => !ut.parent_id).map(root => renderHierarchyNode(root, 0))}
                           </div>
                           
                           <div className="mb-4">
                              <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1 flex items-center space-x-2"><Folder size={16} className="text-slate-400"/> <span>Uncategorized</span></h4>
                              {(() => {
                                 const uncategorizedUnits = units.filter(u => !u.unit_type_id).filter(u => {
                                    if (hwStatusFilter === 'ACTIVE' && u.is_active === false) return false;
                                    if (hwStatusFilter === 'INACTIVE' && u.is_active !== false) return false;
                                    return true;
                                 });
                                 if (uncategorizedUnits.length === 0) return <div className="text-xs text-slate-400 pl-6">No uncategorized units.</div>;
                                 
                                 const uExpanded = !!hierarchyExpanded['__UNCATEGORIZED__'];
                                 return (
                                    <div className="flex flex-col">
                                       {hwShowTypes && (
                                          <div className="flex items-center py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md cursor-pointer group" onClick={() => toggleHierarchyNode('__UNCATEGORIZED__')}>
                                            <div className="flex items-center space-x-2 w-full pr-4 px-2">
                                               <div className="w-4 h-4 flex items-center justify-center text-slate-400">{uExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
                                               <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Uncategorized Units</span>
                                               <span className="text-xs text-slate-400 ml-auto">{uncategorizedUnits.length} units</span>
                                            </div>
                                          </div>
                                       )}
                                       {(!hwShowTypes || uExpanded) && hwShowUnits && (
                                          <div className="flex flex-col">
                                             {uncategorizedUnits.map(u => (
                                                <div key={u.id} className="flex items-center py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md">
                                                   <div style={{ paddingLeft: `${(hwShowTypes ? 1 : 0) * 20 + 24}px` }} className="flex items-center space-x-2">
                                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                                      <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{u.name}</span>
                                                   </div>
                                                </div>
                                             ))}
                                          </div>
                                       )}
                                    </div>
                                 )
                              })()}
                           </div>
                        </>
                     )}
                  </div>
               </div>
            )}
          </div>
        )}
        {activeTab === 'fy' && (
          <div className="flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Custom Financial Years</h3>
              {!fyForm && (
                <button 
                  onClick={() => setFyForm({ name: '', start_date: '', end_date: '' })}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} /> <span>Add Custom FY</span>
                </button>
              )}
            </div>

            {fyForm && (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">New Custom Financial Year</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">FY Name (e.g. Nepal FY 2078-79)</label>
                    <input 
                      type="text" 
                      value={fyForm.name || ''} 
                      onChange={e => setFyForm({...fyForm, name: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={fyForm.start_date || ''} 
                      onChange={e => setFyForm({...fyForm, start_date: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={fyForm.end_date || ''} 
                      onChange={e => setFyForm({...fyForm, end_date: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex space-x-3">
                  <button onClick={saveFy} disabled={isSavingFy} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium">
                    {isSavingFy ? 'Saving...' : 'Save FY'}
                  </button>
                  <button onClick={() => setFyForm(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-sm font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Financial Year Name</th>
                    <th className="px-6 py-4 font-semibold">Start Date</th>
                    <th className="px-6 py-4 font-semibold">End Date</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customFys.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{f.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{f.start_date}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{f.end_date}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteFy(f.id!)}
                          title="Delete Custom FY"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customFys.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No custom financial years defined.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* REASSIGN MODAL */}
      {reassignProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Reassign Officers</h3>
            <p className="text-sm text-slate-500 mb-6">Assign a new Deputy or Joint Secretary to {reassignProject.metadata?.unitName || 'this project'}.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New Deputy Secretary (L3)</label>
                <select 
                  id="newDeputySelect"
                  defaultValue={reassignProject.metadata?.assignedDeputyId || ''}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {users.filter(u => u.hierarchy_weight === 30 && u.isActive !== false).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New Joint Secretary (L2)</label>
                <select 
                  id="newJointSelect"
                  defaultValue={reassignProject.metadata?.assignedJointId || ''}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {users.filter(u => u.hierarchy_weight === 20 && u.isActive !== false).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-3">
              <button 
                onClick={() => setReassignProject(null)} 
                className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                     const newDeputy = (document.getElementById('newDeputySelect') as HTMLSelectElement).value;
                     const newJoint = (document.getElementById('newJointSelect') as HTMLSelectElement).value;
                     const api = await import('@/lib/api');
                     await api.saveProject({
                        ...reassignProject,
                        metadata: {
                           ...reassignProject.metadata,
                           assignedDeputyId: newDeputy,
                           assignedJointId: newJoint
                        }
                     });
                     setReassignProject(null);
                     fetchProjects();
                  } catch (e: any) {
                     alert("Failed to reassign");
                  }
                }} 
                className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}

      
      {showManageUnitTypes && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-5xl w-full p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Manage Unit Types (Categories)</h3>
                <button onClick={() => setShowManageUnitTypes(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Close</button>
             </div>
             
             <div className="flex gap-6 overflow-hidden flex-1">
                <div className="w-3/5 flex flex-col overflow-y-auto pr-4 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                       <h4 className="font-semibold text-sm">Current Categories</h4>
                       <div className="flex space-x-2">
                          <button onClick={expandAllHierarchy} className="px-2 py-1 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">Expand All</button>
                          <button onClick={collapseAllHierarchy} className="px-2 py-1 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">Collapse All</button>
                       </div>
                    </div>
                    {unitTypes.filter(ut => !ut.parent_id).map(root => renderModalCategory(root, 0))}
                    {unitTypes.length === 0 && <p className="text-xs text-slate-500">No categories found.</p>}
                </div>

                <div className="w-1/2 flex flex-col">
                    <h4 className="font-semibold text-sm mb-3">{unitTypeForm?.id ? 'Edit Category' : 'New Category'}</h4>
                    <div className="space-y-4">
                       <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Category Name</label>
                          <input type="text" value={unitTypeForm?.name || ''} onChange={e => setUnitTypeForm({...unitTypeForm, name: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Parent Category (Optional)</label>
                          <select value={unitTypeForm?.parent_id || ''} onChange={e => setUnitTypeForm({...unitTypeForm, parent_id: e.target.value || null})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                             <option value="">-- No Parent (Root Level) --</option>
                             {renderParentOptions(null, 0)}
                            </select>
                       </div>
                       <div className="flex space-x-2 pt-2">
                          <button onClick={handleSaveUnitType} disabled={isSavingUnitType || !unitTypeForm?.name} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50">Save</button>
                          <button onClick={() => setUnitTypeForm(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium">Clear</button>
                       </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {handingTakingModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              {user?.hierarchy_weight === 25 ? 'Publish Report' : 'Acknowledge Receipt'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
              {user?.hierarchy_weight === 25 
                ? `Publish Audit Report for ${handingTakingModal.metadata?.unitName}.` 
                : `Acknowledge the receipt of Financial Statement and Audit Report for ${handingTakingModal.metadata?.unitName}.`}
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Acknowledgement Date</label>
                <input 
                  type="date" 
                  value={htCustomDate}
                  onChange={e => setHtCustomDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-500 mt-2 italic">Leave empty to use today's date automatically.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setHandingTakingModal(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleHandingTakingSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm font-medium text-sm"
              >
                {user?.hierarchy_weight === 25 ? 'Publish Report' : (htCustomDate ? 'Acknowledge Custom Date' : 'Acknowledge Now')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewDetailsProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">AP & CL Details</h3>
                <p className="text-sm text-slate-500">
                  {viewDetailsProject.metadata?.unitName}
                  {viewDetailsProject.metadata?.auditorName && (
                    <span className="ml-4 font-semibold text-indigo-600 dark:text-indigo-400">
                      Auditor: {viewDetailsProject.metadata?.auditorName}
                    </span>
                  )}
                </p>
              </div>
              {viewDetailsProject.metadata?.auditTotals && (
                <div className="flex space-x-6 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Start Date</span>
                     <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                       <CalendarDays size={14} className="text-indigo-500" />
                       {viewDetailsProject.metadata.auditTotals.startDate ? new Date(viewDetailsProject.metadata.auditTotals.startDate).toLocaleDateString('en-GB') : '-'}
                     </span>
                  </div>
                  <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">End Date</span>
                     <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                       <CalendarDays size={14} className="text-amber-500" />
                       {viewDetailsProject.metadata.auditTotals.endDate ? new Date(viewDetailsProject.metadata.auditTotals.endDate).toLocaleDateString('en-GB') : '-'}
                     </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div>
                <h4 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-3 border-b pb-2 border-slate-200 dark:border-slate-700">Audit Procedures</h4>
                {(!Array.isArray(viewDetailsProject.gridData) || viewDetailsProject.gridData.length === 0) ? (
                   <p className="text-sm text-slate-500">No procedures recorded.</p>
                ) : (
                   <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                     <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                       <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-300">
                         <tr>
                           <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 w-12">#</th>
                           <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">Procedure</th>
                           <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-center">Total Days Taken</th>
                           <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">Dates</th>
                         </tr>
                       </thead>
                       <tbody>
                         {viewDetailsProject.gridData.map((row: any, i: number) => (
                           <React.Fragment key={i}>
                             <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30">
                               <td className="px-4 py-3 font-semibold">{i+1}.</td>
                               <td className="px-4 py-3 font-semibold break-words">{row.procedure_name || 'Unnamed Procedure'}</td>
                               <td className="px-4 py-3 text-center text-xs whitespace-nowrap">{row.actual_days || '-'}</td>
                               <td className="px-4 py-3 text-xs whitespace-nowrap">{row.start_date ? new Date(row.start_date).toLocaleDateString('en-GB') : '-'} to {row.end_date ? new Date(row.end_date).toLocaleDateString('en-GB') : '-'}</td>
                             </tr>
                             {Array.isArray(row.subs) && row.subs.map((sub: any, subI: number) => (
                               <tr key={`${i}-${subI}`} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                 <td className="px-4 py-2 text-right pr-6 text-slate-400"></td>
                                 <td className="px-4 py-2 pl-4 break-words text-slate-600 dark:text-slate-400 border-l-2 border-indigo-200 dark:border-indigo-900/50 ml-4 inline-block my-1">- {sub.procedure_name || '-'}</td>
                                 <td className="px-4 py-2 text-center text-xs text-slate-500 whitespace-nowrap">{sub.actual_days || '-'}</td>
                                 <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{sub.start_date ? new Date(sub.start_date).toLocaleDateString('en-GB') : '-'} to {sub.end_date ? new Date(sub.end_date).toLocaleDateString('en-GB') : '-'}</td>
                               </tr>
                             ))}
                           </React.Fragment>
                         ))}
                       </tbody>
                     </table>
                   </div>
                )}
              </div>

              <div>
                <h4 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-3 border-b pb-2 border-slate-200 dark:border-slate-700">Checklist</h4>
                {(!viewDetailsProject.checklistData || !Array.isArray(viewDetailsProject.checklistData.items) || viewDetailsProject.checklistData.items.length === 0) ? (
                   <p className="text-sm text-slate-500">No checklist items recorded.</p>
                ) : (
                   <div className="space-y-4">
                     {viewDetailsProject.checklistData.items.map((item: any, i: number) => (
                       <div key={i} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                         <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{item.text || 'Untitled Item'}</div>
                         <div className="flex items-center space-x-6 text-sm">
                           <div className="flex items-center space-x-2">
                             <span className="text-slate-500 font-medium">Answer:</span>
                             <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.value || 'Not Answered'}</span>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex flex-wrap gap-2 md:gap-4">
                  {(() => {
                    let totalAct = 0;
                    let autoHol = 0;
                    let manualHol = 0;

                    if (Array.isArray(viewDetailsProject.gridData)) {
                      viewDetailsProject.gridData.forEach((row: any) => {
                        if (!Array.isArray(row.subs) || row.subs.length === 0) {
                          totalAct += Number(row.actual_days || 0);
                          autoHol += Number(row.auto_nw_days || 0);
                          manualHol += Number(row.manual_leave_days || 0);
                        } else {
                          row.subs.forEach((sub: any) => {
                            totalAct += Number(sub.actual_days || 0);
                            autoHol += Number(sub.auto_nw_days || 0);
                            manualHol += Number(sub.manual_leave_days || 0);
                          });
                        }
                      });
                    }

                    const workingDays = totalAct - autoHol - manualHol;

                    return (
                      <>
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Total Calendar Days: <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">{totalAct}</span></div>
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Auto Holidays: <span className="font-bold text-amber-600 dark:text-amber-400 ml-1">{autoHol}</span></div>
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Manual Holidays: <span className="font-bold text-rose-600 dark:text-rose-400 ml-1">{manualHol}</span></div>
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Working Days: <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">{workingDays}</span></div>
                      </>
                    );
                  })()}
                </div>
                <button 
                  onClick={() => setViewDetailsProject(null)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full md:w-auto"
                >
                  Close
                </button>
              </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyLogView && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Audit History Log</h3>
            <p className="text-sm text-slate-500 mb-6">Timeline for {historyLogView.name}</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {historyLogView.history && historyLogView.history.length > 0 ? (
                historyLogView.history.map((log, idx) => (
                  <div key={idx} className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900/50 last:border-transparent pb-6 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-800" />
                    <div className="mb-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{log.action}</div>
                    <div className="text-xs text-slate-500 mt-0.5">By {log.userName}</div>
                    {log.notes && (
                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        "{log.notes}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">No history available for this audit program.</div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button 
                onClick={() => setHistoryLogView(null)} 
                className="px-6 py-2.5 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

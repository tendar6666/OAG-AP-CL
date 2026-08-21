"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { getUsers, updateUserRole, getProjects, getUnits, createUnit, updateUnit, deleteUnit, getCustomFYs, createCustomFY, deleteCustomFY, AuditUnit, CustomFY } from '@/lib/api';
import { Users, FileSpreadsheet, ShieldAlert, Download, Save, Building2, Plus, Edit2, Trash2, CalendarDays, Ban, CheckCircle, Search, Filter, RefreshCw } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ReportsDashboard from '@/components/ReportsDashboard';

const ROLE_MAP: Record<number, string> = {
  10: "Secretary (L1)",
  20: "Joint Secretary (L2)",
  30: "Deputy Secretary (L3)",
  40: "Field Auditor (L4)",
};

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'actions';
  
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [units, setUnits] = useState<AuditUnit[]>([]);
  const [customFys, setCustomFys] = useState<CustomFY[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignProject, setReassignProject] = useState<any>(null);
  const [viewDetailsProject, setViewDetailsProject] = useState<any>(null);
  const [historyLogView, setHistoryLogView] = useState<{history: any[], name: string} | null>(null);
  const [userSortConfig, setUserSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);

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
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);

  // Unit filters
  const [unitSearchTerm, setUnitSearchTerm] = useState<string>('');
  const [unitStatusFilter, setUnitStatusFilter] = useState<string>('ACTIVE');
  const [unitBranchFilter, setUnitBranchFilter] = useState<string>('ALL');

  useEffect(() => {
    if (user && user.hierarchy_weight <= 30) {
      loadInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (user && user.hierarchy_weight <= 30) {
      fetchProjects();
    }
  }, [user]);

  // Load global filters from local storage on mount
  useEffect(() => {
    const savedTarget = localStorage.getItem('globalTargetFy');
    const savedExec = localStorage.getItem('globalExecFy');
    if (savedTarget) setSelectedTargetFyFilter(savedTarget);
    if (savedExec) setSelectedExecFyFilter(savedExec);
  }, []);

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
      const [usersData, unitsData, fysData] = await Promise.all([
        getUsers(),
        getUnits(),
        getCustomFYs()
      ]);
      setUsers(usersData);
      setUnits(unitsData);
      setCustomFys(fysData as any);
    } catch (err) {
      console.error("Failed to load initial admin data", err);
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    setIsProjectsLoading(true);
    try {
      const data = await getProjects('ALL');
      setProjects(data);
    } catch (e) {
      console.error("Failed to fetch projects", e);
    }
    setIsProjectsLoading(false);
  };

  const handleRoleChange = async (userId: string, newWeight: number) => {
    try {
      await updateUserRole(userId, newWeight);
      setUsers(users.map(u => u.id === userId ? { ...u, hierarchy_weight: newWeight } : u));
    } catch (err) {
      alert("Failed to update user role.");
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
    } catch (e) {
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
    } catch (e) {
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
      } catch (e) {
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
      } catch (e) {
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
      } catch (e) {
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
      } catch (e) {
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
    } catch (e) {
      console.error(e);
      alert('Failed to execute admin override.');
    }
  };

  const handleSupportExtension = async (project: any) => {
    const isExtension = project.status === 'Extension Requested';
    const actionType = isExtension ? 'extension request' : 'Audit Program';
    if (window.confirm(`Support ${actionType} for ${project.metadata?.unitName}?`)) {
      try {
        const api = await import('@/lib/api');
        await api.saveProject({
          ...project,
          status: isExtension ? 'Extension Supported' : 'Pending Approval'
        }, {
          action: isExtension ? 'Supported Extension' : 'Supported Audit Program',
          userId: user.id,
          userName: user.name
        });
        
        // Notify Joint Secretary
        const jointId = project.metadata?.assignedJointId;
        if (jointId) {
          const jointUser = users.find(u => u.id === jointId);
          if (jointUser) {
             api.getOrCreateNtfyTopic(jointUser.id, jointUser.ntfyTopic).then(topicId => {
               api.sendNtfyNotification(
                 topicId, 
                 isExtension ? 'Extension Supported' : 'Audit Program Supported', 
                 `Deputy Secretary ${user?.name} has supported the ${actionType} for ${project.metadata?.unitName}. Please review and approve.`
               );
             }).catch(e => console.error("Push failed:", e));
          }
        }
        
        fetchProjects();
      } catch(e) {
        alert("Failed to update status.");
      }
    }
  };

  const handleApproveExtension = async (project: any) => {
    const isExtension = project.status === 'Extension Supported' || project.status === 'Extension Requested';
    const actionType = isExtension ? 'extension' : 'Audit Program';
    const confirmMessage = isExtension 
        ? `Approve extension? This will unlock the program for the auditor and mark it as revised.`
        : `Approve Audit Program? This will finalize it as 'Audited'.`;
        
    if (window.confirm(confirmMessage)) {
      try {
        const api = await import('@/lib/api');
        
        const updatePayload: any = {
          ...project,
          status: isExtension ? 'Draft' : 'Audited'
        };
        if (isExtension) {
            updatePayload.isRevised = true;
        }

        await api.saveProject(updatePayload, {
          action: isExtension ? 'Approved Extension (Reset to Draft)' : 'Approved Audit Program',
          userId: user.id,
          userName: user.name
        });
        
        // Notify Field Auditor
        const auditor = users.find(u => u.id === project.createdBy);
        if (auditor) {
           api.getOrCreateNtfyTopic(auditor.id, auditor.ntfyTopic).then(topicId => {
             api.sendNtfyNotification(
               topicId, 
               isExtension ? 'Extension Approved' : 'Audit Program Approved', 
               isExtension 
                 ? `Your extension request for ${project.metadata?.unitName} has been Approved. The Audit Program is unlocked.`
                 : `Your Audit Program for ${project.metadata?.unitName} has been Approved by the Joint Secretary and is now Audited.`
             );
           }).catch(e => console.error("Push failed:", e));
        }

        // Notify Admins
        if (!isExtension) {
           const admins = users.filter(u => u.hierarchy_weight === 10);
           admins.forEach(admin => {
               api.getOrCreateNtfyTopic(admin.id, admin.ntfyTopic).then(topicId => {
                   api.sendNtfyNotification(
                       topicId,
                       'Audit Program Finalized',
                       `Joint Secretary ${user.name} has approved the Audit Program for ${project.metadata?.unitName}. It is now fully Audited.`
                   );
               }).catch(e => console.error("Admin Push failed:", e));
           });
        }

        fetchProjects();
      } catch(e) {
        alert("Failed to approve.");
      }
    }
  };

  const handleRejectExtension = async (project: any) => {
    const isExtension = project.status === 'Extension Requested' || project.status === 'Extension Supported';
    const actionType = isExtension ? 'extension' : 'Audit Program';
    const confirmMessage = isExtension 
        ? `Reject extension? This will revert the project back to the 'Submitted' state.`
        : `Reject Audit Program? This will revert the project back to a 'Draft' for the auditor to fix.`;

    if (window.confirm(confirmMessage)) {
      try {
        const api = await import('@/lib/api');
        
        const updatePayload: any = {
          ...project,
          status: isExtension ? 'Submitted' : 'Draft'
        };
        if (isExtension) {
            updatePayload.isExtended = false;
            updatePayload.isRevised = false;
        }

        await api.saveProject(updatePayload, {
          action: isExtension ? 'Rejected Extension' : 'Rejected Audit Program',
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
      } catch(e) {
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
      } catch (e) {
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
      } catch (e) {
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
    } catch (e) {
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
      } catch (e) {
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
    
    if (user.hierarchy_weight === 30) {
       return (p.status === 'Extension Requested' || isPendingSupport) && p.metadata?.assignedDeputyId === user.id;
    }
    if (user.hierarchy_weight === 20) {
       return (p.status === 'Extension Requested' || p.status === 'Extension Supported' || isPendingSupport || p.status === 'Pending Approval') && p.metadata?.assignedJointId === user.id;
    }
    if (user.hierarchy_weight <= 10) {
       return p.status === 'Extension Requested' || p.status === 'Extension Supported' || isPendingSupport || p.status === 'Pending Approval';
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
      {/* Global FY Filters and Header Cards - ONLY SHOW ON ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <>
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
                        <p className="text-xs mt-1">There are no pending extensions waiting for your approval.</p>
                      </td>
                    </tr>
                  ) : pendingMyAction.map(p => {
                    const isPendingSupport = p.status === 'Pending Support' || (p.status === 'Submitted' && !p.isExtended);
                    
                    let badge = { label: p.status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
                    if (isPendingSupport || p.status === 'Extension Requested') badge = { label: 'Not Supported Yet', color: 'bg-amber-100 text-amber-700 border-amber-200' };
                    else if (p.status === 'Pending Approval' || p.status === 'Extension Supported') badge = { label: 'Not Approved Yet', color: 'bg-blue-100 text-blue-700 border-blue-200' };
                    
                    if (p.isExtended) badge.label = `${badge.label} (Extended AP & CL)`;

                    const canSupport = (p.status === 'Extension Requested' || isPendingSupport) && user && (
                       user.id === p.metadata?.assignedDeputyId || 
                       user.id === p.metadata?.assignedJointId || 
                       user.hierarchy_weight <= 10
                    );

                    const canApprove = (p.status === 'Extension Requested' || p.status === 'Extension Supported' || isPendingSupport || p.status === 'Pending Approval') && user && (
                       user.id === p.metadata?.assignedJointId || 
                       user.hierarchy_weight <= 10
                    );

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
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end space-y-2">
                            <button 
                              onClick={() => setViewDetailsProject(p)}
                              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                            >
                              <span>View AP & CL</span>
                            </button>

                            {(canSupport || canApprove) && (
                              <button 
                                onClick={() => handleRejectExtension(p)}
                                className="inline-flex items-center space-x-2 px-3 py-1.5 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                              >
                                <span>Reject</span>
                              </button>
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
                                onClick={() => handleApproveExtension(p)}
                                className="inline-flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                              >
                                <span>Approve</span>
                              </button>
                            )}

                            <button 
                              onClick={() => setHistoryLogView({ history: p.history || [], name: p.metadata?.unitName || 'Unknown Project' })}
                              className="inline-flex items-center space-x-2 px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                            >
                              <CalendarDays size={14} />
                              <span>History</span>
                            </button>
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
                   if (projectStatusFilter !== 'ALL' && p.status !== projectStatusFilter) return false;
                   if (projectSearchTerm) {
                      const searchLower = projectSearchTerm.toLowerCase();
                      const unitMatch = (p.metadata?.unitName || '').toLowerCase().includes(searchLower);
                      const audMatch = (p.metadata?.auditorName || '').toLowerCase().includes(searchLower);
                      const idMatch = (p.customId || '').toLowerCase().includes(searchLower);
                      if (!unitMatch && !audMatch && !idMatch) return false;
                   }
                   return true;
                }).map(p => {
                  const end = p.metadata?.auditTotals?.endDate;
                  const start = p.metadata?.auditTotals?.startDate;
                  const isPast = end && new Date() > new Date(end);
                  const isPendingSupport = p.status === 'Pending Support' || (p.status === 'Submitted' && !p.isExtended);
                  
                  let badge = { label: 'In Progress', color: 'bg-slate-100 text-slate-700 border-slate-200' };
                  if (isPendingSupport || p.status === 'Extension Requested') {
                     badge = { label: 'Not Supported Yet', color: 'bg-amber-100 text-amber-700 border-amber-200' };
                  }
                  else if (p.status === 'Pending Approval' || p.status === 'Extension Supported') {
                     badge = { label: 'Not Approved Yet', color: 'bg-blue-100 text-blue-700 border-blue-200' };
                  }
                  else if (p.status === 'Audited') {
                     if (p.submittedAt && end && new Date(p.submittedAt) > new Date(end)) {
                        badge = { label: 'Audited (Late)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
                     } else {
                        badge = { label: 'Audited (On Time)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
                     }
                  } else if (isPast) {
                     badge = { label: 'Overdue (Draft)', color: 'bg-rose-100 text-rose-700 border-rose-200' };
                  }

                  if (p.isExtended) {
                     badge.label = `${badge.label} (Extended AP & CL)`;
                  }

                  const canSupport = (p.status === 'Extension Requested' || isPendingSupport) && user && (
                     user.id === p.metadata?.assignedDeputyId || 
                     user.id === p.metadata?.assignedJointId || 
                     user.hierarchy_weight <= 10
                  );

                  const canApprove = (p.status === 'Extension Requested' || p.status === 'Extension Supported' || isPendingSupport || p.status === 'Pending Approval') && user && (
                     user.id === p.metadata?.assignedJointId || 
                     user.hierarchy_weight <= 10
                  );

                  const assignedDeputy = users.find(u => u.id === p.metadata?.assignedDeputyId)?.name || 'Unassigned';
                  const assignedJoint = users.find(u => u.id === p.metadata?.assignedJointId)?.name || 'Unassigned';

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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
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
                            onClick={() => handleApproveExtension(p)}
                            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-xs font-semibold w-full justify-center md:w-auto"
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

                        <button 
                          onClick={() => handleAdminDeleteProject(p)}
                          className="inline-flex items-center space-x-2 px-3 py-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-xs font-semibold w-full justify-center md:w-auto"
                        >
                          <Trash2 size={14} />
                          <span>Force Delete</span>
                        </button>
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
                 if (projectStatusFilter !== 'ALL' && p.status !== projectStatusFilter) return false;
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
                        value={u.hierarchy_weight || 40}
                        onChange={(e) => handleRoleChange(u.id, Number(e.target.value))}
                        disabled={user && user.hierarchy_weight > 10}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                      >
                        <option value={10}>Secretary (L1)</option>
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
        )}

        {activeTab === 'units' && (
          <div className="flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 dark:bg-slate-900/20 gap-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Registered Units</h3>
              
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

            {unitForm && (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">{unitForm.id ? 'Edit Unit' : 'New Unit'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {unitForm.is_active !== false && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Active From FY</label>
                      <select
                        value={unitForm.active_from_fy || ''}
                        onChange={e => setUnitForm({...unitForm, active_from_fy: e.target.value})}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- No specific start year --</option>
                        {Array.from({length: totalFys}, (_, i) => {
                          const y = highestFy - i;
                          const val = `FY ${y}-${y+1}`;
                          return <option key={val} value={val}>{val}</option>;
                        })}
                      </select>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex space-x-3">
                  <button onClick={saveUnit} disabled={isSavingUnit} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium">
                    {isSavingUnit ? 'Saving...' : 'Save Unit'}
                  </button>
                  <button onClick={() => setUnitForm(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-sm font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold">File Number</th>
                    <th className="px-6 py-4 font-semibold">Unit Names</th>
                    <th className="px-6 py-4 font-semibold">Branch</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Active From</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No units match your filters.</td>
                    </tr>
                  ) : filteredUnits.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${u.is_active === false ? 'opacity-60' : ''}`}>
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
                        {u.is_active !== false ? (u.active_from_fy || 'All Time') : '-'}
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
                  ))}
                  {units.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No units registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                  } catch(e) {
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

      {/* VIEW DETAILS MODAL */}
      {viewDetailsProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">AP & CL Details</h3>
            <p className="text-sm text-slate-500 mb-6">{viewDetailsProject.metadata?.unitName}</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div>
                <h4 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-3 border-b pb-2 border-slate-200 dark:border-slate-700">Audit Procedures</h4>
                {(!viewDetailsProject.gridData || viewDetailsProject.gridData.length === 0) ? (
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
                             {row.subs && row.subs.map((sub: any, subI: number) => (
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
                {(!viewDetailsProject.checklistData || !viewDetailsProject.checklistData.items || viewDetailsProject.checklistData.items.length === 0) ? (
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

                    if (viewDetailsProject.gridData) {
                      viewDetailsProject.gridData.forEach((row: any) => {
                        if (!row.subs || row.subs.length === 0) {
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

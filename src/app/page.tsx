"use client";


import AuditProgramGrid from '@/components/AuditProgramGrid';
import ChecklistGrid from '@/components/ChecklistGrid';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import MyCalendar from '@/components/MyCalendar';
import { useAuth } from '@/context/AuthContext';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

const API_BASE = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : '';

const Pagination = ({ page, setPage, total, itemsPerPage }: any) => {
  const totalPages = Math.ceil(total / itemsPerPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center space-x-2 mt-6">
      <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">Prev</button>
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
      <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">Next</button>
    </div>
  );
};


function HomeContent() {
  const { user, setUser } = useAuth();
  const canSeeOverall = user.hierarchy_weight <= 20;
  const [activeTab, setActiveTab] = useState<'schedule' | 'checklist'>('schedule');
  const [auditTotals, setAuditTotals] = useState<any>(null);
  const [selectedFY, setSelectedFY] = useState('2023-2024'); // Target FY inside the creator
  const [selectedProjectFy, setSelectedProjectFy] = useState('ALL'); // Execution FY filter
  const [selectedProjectTargetFy, setSelectedProjectTargetFy] = useState('ALL'); // Target FY filter
  const [selectedUnit, setSelectedUnit] = useState('All Units');
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get('view');

  useEffect(() => {
    const savedExec = localStorage.getItem('globalExecFy');
    const savedTarget = localStorage.getItem('globalTargetFy');
    if (savedExec) setSelectedProjectFy(savedExec);
    if (savedTarget) setSelectedProjectTargetFy(savedTarget);
  }, []);

  const handleSetProjectExecFy = (val: string) => {
    setSelectedProjectFy(val);
    localStorage.setItem('globalExecFy', val);
  };

  const handleSetProjectTargetFy = (val: string) => {
    setSelectedProjectTargetFy(val);
    localStorage.setItem('globalTargetFy', val);
  };

  useEffect(() => {
    import('@/lib/api').then(api => {
      api.getProjects(selectedProjectTargetFy, selectedProjectFy).then(data => setSavedProjects(data || []));
    });
  }, [selectedProjectTargetFy, selectedProjectFy]);

  // New Section State
  const [unitName, setUnitName] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [financialYear, setFinancialYear] = useState('');
  const [auditorName, setAuditorName] = useState(user.name);
  const [isRevised, setIsRevised] = useState(false); const [isLockedRevised, setIsLockedRevised] = useState(false);
  
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'public' | 'private'>('all');
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  
  // Pagination States
  const [extendPage, setExtendPage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);
  const [templatePage, setTemplatePage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  const gridRef = React.useRef<any>(null);
  const checklistRef = React.useRef<any>(null);
  
  const [loadedGridData, setLoadedGridData] = useState<any>(null);
  const [loadedChecklistData, setLoadedChecklistData] = useState<any>(null);
  const [loadedTotals, setLoadedTotals] = useState<any>(null);
  const [syncedGridData, setSyncedGridData] = useState<any[]>([]);
  

  // Save Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalType, setSaveModalType] = useState<'template' | 'project' | 'submit'>('project');
  const [saveModalName, setSaveModalName] = useState('');
  
  // Project & Template tracking state
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isExtendingMode, setIsExtendingMode] = useState(false);
  const [originalEndDate, setOriginalEndDate] = useState<string | undefined>(undefined);
  const [hasAlertedExtended, setHasAlertedExtended] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [currentCustomId, setCurrentCustomId] = useState<string | null>(null);
  const [currentProjectStatus, setCurrentProjectStatus] = useState<string>('Draft');
  const [templateVisibility, setTemplateVisibility] = useState<'public' | 'private'>('private');

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [customFys, setCustomFys] = useState<any[]>([]);
  const [isFyModalOpen, setIsFyModalOpen] = useState(false);
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [masterUnits, setMasterUnits] = useState<any[]>([]);
    const [unitTypes, setUnitTypes] = useState<any[]>([]);
  const [assignedDeputyId, setAssignedDeputyId] = useState<string>('');
  const [assignedJointId, setAssignedJointId] = useState<string>('');
  
  // Dynamic FY Range State
  const [fyOffsetTop, setFyOffsetTop] = useState(0);
  const [fyOffsetBottom, setFyOffsetBottom] = useState(10);

  // Calculate recent financial years based on dynamic range
  const currentYear = new Date().getFullYear();
  const currentFyStart = new Date().getMonth() < 3 ? currentYear - 1 : currentYear;
  const highestFy = currentFyStart + fyOffsetTop;
  const totalFys = fyOffsetTop + fyOffsetBottom;
  
  const recentFYs = Array.from({ length: totalFys }, (_, i) => {
    const y = highestFy - i;
    return `FY ${y}-${y+1}`;
  });

  // Keep auditor name in sync if it changes in settings, but allow manual override
  useEffect(() => {
    setAuditorName(user.name);
  }, [user.name]);

  useEffect(() => {
    import('@/lib/api').then(api => {
      api.getTemplates().then(data => {
         setSavedTemplates(data || []);
         const defaultTemplate = data?.find((t: any) => t.isDefault);
         const hasPendingLoad = sessionStorage.getItem('pendingLoadConsumed');
         if (defaultTemplate && !hasPendingLoad) {
            setLoadedGridData(defaultTemplate.gridData);
            setLoadedChecklistData(defaultTemplate.checklistData);
            if(defaultTemplate.metadata) {
               setUnitName(defaultTemplate.metadata.unitName || '');
               if (defaultTemplate.metadata.financialYear) setFinancialYear(defaultTemplate.metadata.financialYear);
            }
         }
         sessionStorage.removeItem('pendingLoadConsumed');
      }).catch(err => console.error(err));
      
      api.getProjects(localStorage.getItem('globalTargetFy') || 'ALL', localStorage.getItem('globalExecFy') || 'ALL').then(data => setSavedProjects(data || [])).catch(err => console.error(err));
      api.getCustomFYs().then(data => setCustomFys(data || [])).catch(err => console.error(err));
      api.getUsers().then(data => setAllUsers(data || [])).catch(err => console.error(err));
      api.getUnits().then(data => {
          const activeUnits = data.filter(u => u.is_active !== false);
          setMasterUnits(activeUnits);
        }).catch(err => console.error(err));
        api.getUnitTypes().then(data => setUnitTypes(data || [])).catch(err => console.error(err));
    });
  }, []);

  useEffect(() => {
    if (!view) {
       const pendingRaw = sessionStorage.getItem('pendingLoad');
       if (pendingRaw) {
          sessionStorage.removeItem('pendingLoad');
          sessionStorage.setItem('pendingLoadConsumed', '1');
          const pending = JSON.parse(pendingRaw);
          
          if (pending.type === 'project') {
             const p = pending.data;
             const force = pending.forceExtend || false;
             
             const isAudited = p.status === 'Audited';
               setCurrentProjectId(isAudited ? null : p.id);
               setCurrentTemplateId(null);
               setCurrentCustomId(isAudited ? null : (p.customId || null));
               setCurrentProjectStatus(isAudited ? 'Draft' : (p.status || 'Draft'));
               setSaveModalName(isAudited ? `${p.name || ''} (Copy)` : (p.name || ''));
               setIsExtendingMode(force);
               setHasAlertedExtended(false);
               setOriginalEndDate(isAudited ? undefined : (p.metadata?.auditTotals?.endDate || undefined));
               setIsRevised(isAudited ? false : (p.isRevised || false));
               setIsLockedRevised(isAudited ? false : !!p.isRevised);

             setLoadedGridData(p.gridData);
             setLoadedChecklistData(p.checklistData);
             if(p.metadata) {
                  if (p.metadata.auditTotals) setLoadedTotals(p.metadata.auditTotals);
                  else setLoadedTotals(null);
                setUnitName(p.metadata.unitName || '');
                setAuditorName(p.metadata.auditorName || user.name);
                if (p.metadata.financialYear) setFinancialYear(p.metadata.financialYear);
                setAssignedDeputyId(p.metadata.assignedDeputyId || '');
                setAssignedJointId(p.metadata.assignedJointId || '');
             }
             
             if (force) {
                 alert("Please change the Audit End Date to your new extended date in the Audit Procedure grid.");
                 setActiveTab('schedule');
             }
          } else if (pending.type === 'template') {
             const t = pending.data;
             
             setCurrentTemplateId(t.id);
             setCurrentProjectId(null);
             setCurrentCustomId(null);
             setCurrentProjectStatus('Draft');
             setSaveModalName(t.name || '');

             setLoadedGridData(t.gridData);
             setLoadedChecklistData(t.checklistData);
             if(t.metadata) {
                  if (t.metadata.auditTotals) setLoadedTotals(t.metadata.auditTotals);
                  else setLoadedTotals(null);
                setUnitName(t.metadata.unitName || '');
                setAuditorName(t.metadata.auditorName || user.name);
                if (t.metadata.financialYear) setFinancialYear(t.metadata.financialYear);
             }
          }
       }
    }
  }, [view]);


  const loadTemplate = (template: any) => {
    if (!window.confirm("Please save your current AP and Checklist first. If you proceed, current data will be lost. Proceed?")) return;
    sessionStorage.setItem('pendingLoad', JSON.stringify({ type: 'template', data: template }));
    router.push('/');
  };

  const loadProject = (project: any, forceExtendMode: boolean = false) => {
    if (!window.confirm("Please save your current AP and Checklist first. If you proceed, current data will be lost. Proceed?")) return;
    sessionStorage.setItem('pendingLoad', JSON.stringify({ type: 'project', data: project, forceExtend: forceExtendMode }));
    router.push('/');
  };

  const handleSaveTemplateClick = () => {
    setSaveModalType('template');
    setSaveModalName('');
    setSaveModalOpen(true);
  };

  const executeProjectSave = async (statusTarget: 'Draft' | 'Submitted' | 'DraftSubmitted') => {
    setIsSaving(true);
    console.log("Starting project save process...");
    
    // Auto-generate name based on unit and FY instead of asking the user
    const name = `${unitName.trim()} (${financialYear.trim()})`;
    
    const gridData = gridRef.current?.getData() || [];
    const checklistData = checklistRef.current?.getData() || [];
    
    const api = await import('@/lib/api');

    const executionDateToUse = auditTotals?.endDate || auditTotals?.startDate || new Date().toISOString();
    const executionFY = getIndianFY(executionDateToUse);

    const metadataPayload: any = { 
      unitName, 
      auditorName, 
      financialYear, 
      executionFY,
      assignedDeputyId,
      assignedJointId,
      auditTotals 
    };
    if (statusTarget === 'Submitted' || statusTarget === 'DraftSubmitted') {
      metadataPayload.dsSupported = false;
      metadataPayload.jsApproved = false;
    }

    const isFinalSubmit = statusTarget === 'Submitted';
    const isDraftSubmit = statusTarget === 'DraftSubmitted';
    const generateSubmitDate = isFinalSubmit || isDraftSubmit;
    
    let finalStatus = 'Draft';
    if (isFinalSubmit) {
      if (user?.hierarchy_weight === 40) {
         finalStatus = assignedDeputyId === 'NA' ? 'Pending Approval' : 'Pending Support';
      } else if (user?.hierarchy_weight === 30) {
         finalStatus = 'Pending Approval';
      } else {
         finalStatus = 'Audited';
      }
    } else if (isDraftSubmit) {
      if (user?.hierarchy_weight === 40) {
         finalStatus = assignedDeputyId === 'NA' ? 'Draft AP & CL Supported' : 'Draft AP & CL Submitted';
      } else if (user?.hierarchy_weight === 30) {
         finalStatus = 'Draft AP & CL Supported';
      } else {
         finalStatus = 'Draft AP & CL Approved';
      }
    }
    
    const submitDate = generateSubmitDate ? new Date().toISOString() : null;

    const cleanGrid = (gridData || []).map((m: any) => ({
        ...m,
        subs: (m.subs || []).map((s: any) => ({...s}))
    }));
    const cleanChecklist = checklistData ? JSON.parse(JSON.stringify(checklistData)) : { items: [] };

    try {
      const result = await api.saveProject({ 
        id: currentProjectId,
        customId: currentCustomId,
        name, 
        status: finalStatus,
        submittedAt: submitDate,
        createdBy: user.id,
        isRevised: isRevised,
        gridData: cleanGrid, 
        checklistData: cleanChecklist, 
        metadata: metadataPayload 
      }, {
        action: isFinalSubmit ? 'Submitted Audit Program' : (isDraftSubmit ? 'Submitted Draft AP & CL' : 'Saved Draft'),
        userId: user?.id || 'system',
        userName: user?.name || 'System'
      });
      
      setCurrentProjectId(result.id);
      setCurrentCustomId(result.customId);
      setCurrentProjectStatus(result.status);
      
      alert((isFinalSubmit || isDraftSubmit) ? "Audit Program Submitted Successfully!" : "Audit Program Draft Saved!");
      const newData = await api.getProjects(localStorage.getItem('globalTargetFy') || 'ALL', localStorage.getItem('globalExecFy') || 'ALL');
      setSavedProjects(newData || []);
      // Handle Notifications
      try {
        if (isFinalSubmit && finalStatus === 'Pending Support' && assignedDeputyId) {
           const deputy = allUsers.find(u => u.id === assignedDeputyId);
           if (deputy) {
              const topicId = await api.getOrCreateNtfyTopic(deputy.id, deputy.ntfyTopic);
              await api.sendNtfyNotification(
                 topicId,
                 `New Audit Program Submitted`,
                 `Field Auditor ${user?.name} has submitted the Audit Program for ${unitName}. Please review and support.`
              );
           }
        } else if (isFinalSubmit && finalStatus === 'Pending Approval' && assignedJointId) {
           const joint = allUsers.find(u => u.id === assignedJointId);
           if (joint) {
              const topicId = await api.getOrCreateNtfyTopic(joint.id, joint.ntfyTopic);
              await api.sendNtfyNotification(
                 topicId,
                 `New Audit Program Submitted`,
                 `Deputy Secretary ${user?.name} has submitted an Audit Program for ${unitName}. Please review and approve.`
              );
           }
        } else if (statusTarget === 'DraftSubmitted' && finalStatus === 'Draft AP & CL Submitted' && assignedDeputyId) {
             const deputy = allUsers.find(u => u.id === assignedDeputyId);
             if (deputy) {
                const topicId = await api.getOrCreateNtfyTopic(deputy.id, deputy.ntfyTopic);
                await api.sendNtfyNotification(
                   topicId,
                   `New Draft AP & CL Submitted`,
                   `Field Auditor ${user?.name} has submitted a Draft AP & CL for ${unitName}. Please review and support.`
                );
             }
             const joint = allUsers.find(u => u.id === assignedJointId);
             if (joint) {
                const topicId = await api.getOrCreateNtfyTopic(joint.id, joint.ntfyTopic);
                await api.sendNtfyNotification(
                   topicId,
                   `New Draft AP & CL Submitted (FYI)`,
                   `Field Auditor ${user?.name} has submitted a Draft AP & CL for ${unitName}. It is currently with the Deputy Secretary.`
                );
             }
          } else if (statusTarget === 'DraftSubmitted' && finalStatus === 'Draft AP & CL Supported' && assignedJointId) {
           const joint = allUsers.find(u => u.id === assignedJointId);
           if (joint) {
              const topicId = await api.getOrCreateNtfyTopic(joint.id, joint.ntfyTopic);
              await api.sendNtfyNotification(
                 topicId,
                 `New Draft AP & CL Supported`,
                 `Deputy Secretary ${user?.name} has supported a Draft AP & CL for ${unitName}. Please review and approve.`
              );
           }
        }
      } catch (e) {
        console.error("Failed to send notification:", e);
      }
    } catch (e) {
      alert("Error saving Audit Program");
      console.error("Failed to save Audit Program:", e);
    }
    
    setIsSaving(false);
  };

  const handleSaveProjectClick = async (statusTarget: 'Draft' | 'Submitted' | 'DraftSubmitted' = 'Draft') => {
      if (!unitName.trim()) {
        alert("Please enter the Name of the Units/Institution before saving.");
        return;
      }
      if (!financialYear.trim()) {
        alert("Please enter the Financial Year before saving.");
        return;
      }
      if (!auditorName.trim()) {
        alert("Please enter the Auditor Name before saving.");
        return;
      }

      if (currentProjectId) {
         const orig = savedProjects.find(p => p.id === currentProjectId);
         if (orig && orig.metadata) {
             const origDeputy = orig.metadata.assignedDeputyId;
             const origJoint = orig.metadata.assignedJointId;
             if ((origDeputy && origDeputy !== assignedDeputyId) || (origJoint && origJoint !== assignedJointId)) {
                 if (!window.confirm("Warning: You are changing the Assigned Deputy or Joint Secretary from their original selection. Are you sure you want to proceed?")) {
                     return;
                 }
             }
         }
      }

      // Check officer assignment when making a final submission or draft submission
      if (statusTarget === 'Submitted' || statusTarget === 'DraftSubmitted') {
        const isFieldAuditor = user && user.hierarchy_weight === 40;
        const isDeputySec = user && user.hierarchy_weight === 30;

        if (isFieldAuditor && (!assignedDeputyId || !assignedJointId)) {
          if (statusTarget === 'DraftSubmitted') {
            alert("Reminder: You must select both an Assigned Deputy Secretary and an Assigned Joint Secretary before submitting your Draft. This is required so they can support and approve your Draft AP & CL.");
          } else {
            alert("Reminder: You must select both an Assigned Deputy Secretary and an Assigned Joint Secretary before your Final Submission. This is required so they can support and approve your Final Audit.");
          }
          return;
        }

        if (isDeputySec && !assignedJointId) {
          if (statusTarget === 'DraftSubmitted') {
            alert("Reminder: As a Deputy Secretary, you must select an Assigned Joint Secretary before submitting your Draft for approval.");
          } else {
            alert("Reminder: As a Deputy Secretary, you must select an Assigned Joint Secretary before submitting your Final Audit for approval.");
          }
          return;
        }
      }
      
      if (statusTarget === 'Submitted') {
        if (!window.confirm("ATTENTION: You are about to Submit Final.\n\nPlease confirm that you have completely finished submitting the Financial Statement and Audit Report before proceeding.")) {
          return;
        }
      }
      
      // Instantly save/submit without the modal
      await executeProjectSave(statusTarget);
  };

  const handleBeginExtension = () => {
      setIsExtendingMode(true);
      alert("Please change the Audit End Date to your new extended date in the Audit Procedure grid.");
      setActiveTab('schedule');
  };

  const handleCancelExtension = async () => {
      if (!window.confirm("Are you sure you want to cancel this extension request?")) return;
      try {
         setIsSaving(true);
         const api = await import('@/lib/api');
         const originalProject = savedProjects.find(p => p.id === currentProjectId);
         if (!originalProject) return;
         await api.saveProject({
             ...originalProject,
             status: 'Submitted',
             isExtended: false,
             isRevised: false
         }, { action: 'Cancelled Extension', userId: user.id, userName: user.name });
         const newData = await api.getProjects(localStorage.getItem('globalTargetFy') || 'ALL', localStorage.getItem('globalExecFy') || 'ALL');
         setSavedProjects(newData || []);
         setCurrentProjectStatus('Submitted');
         setIsExtendingMode(false);
         alert("Extension request cancelled.");
      } catch (e) {
         alert("Failed to cancel extension.");
      } finally { setIsSaving(false); }
  };

  const handleCancelSubmission = async () => {
      const isDraftTrack = currentProjectStatus === 'Draft AP & CL Submitted' || currentProjectStatus === 'Draft AP & CL Supported' || currentProjectStatus === 'Draft AP & CL Approved' || currentProjectStatus === 'Extended (Approved)';
      const targetStatus = isDraftTrack ? 'Draft' : 'Draft AP & CL Approved';

      if (!window.confirm(`Are you sure you want to undo your submission? This will revert the audit to '${targetStatus}'.`)) return;
      try {
         setIsSaving(true);
         const api = await import('@/lib/api');
         const originalProject = savedProjects.find(p => p.id === currentProjectId);
         if (!originalProject) return;
         await api.saveProject({
             ...originalProject,
             status: targetStatus
         }, { action: isDraftTrack ? 'Reverted Draft Submission' : 'Reverted Final Submission', userId: user.id, userName: user.name });
         const newData = await api.getProjects(localStorage.getItem('globalTargetFy') || 'ALL', localStorage.getItem('globalExecFy') || 'ALL');
         setSavedProjects(newData || []);
         setCurrentProjectStatus(targetStatus);
         alert(`Audit Program reverted to ${targetStatus}.`);
      } catch (e) {
         alert("Failed to revert submission.");
      } finally { setIsSaving(false); }
  };

  const handleRequestExtension = async () => {
      if (!currentProjectId) {
         alert("Cannot request extension: Project ID missing.");
         return;
      }
      
      if (!isExtendingMode || !originalEndDate) {
          alert("Please begin the extension process first.");
          return;
      }

      if (auditTotals?.endDate <= originalEndDate) {
          alert("You must select an end date strictly after your previously submitted end date.");
          return;
      }

      const isFieldAuditor = user && user.hierarchy_weight === 40;
      const isDeputySec = user && user.hierarchy_weight === 30;

      if (isFieldAuditor && (!assignedDeputyId || !assignedJointId)) {
        alert("Reminder: You must select both an Assigned Deputy Secretary and an Assigned Joint Secretary in the 'Unit & Execution Details' section before requesting an extension. This is required so they can approve it.");
        return;
      }

      if (isDeputySec && !assignedJointId) {
        alert("Reminder: As a Deputy Secretary, you must select an Assigned Joint Secretary before requesting an extension for approval.");
        return;
      }

      if (!window.confirm("Are you sure you want to request an extension for this Audit Program?")) return;
      
      let newStatus = 'Extension Requested';
      let successMessage = "Extension request submitted successfully!";
      let historyAction = 'Requested Extension';

      if (user && user.hierarchy_weight <= 20) {
        newStatus = 'Draft';
        successMessage = "Extension instantly approved (Admin/Joint Secretary Privilege).";
        historyAction = 'Self-Approved Extension';
      } else if (user && user.hierarchy_weight === 30) {
        newStatus = 'Extension Supported';
        successMessage = "Extension submitted for Joint Secretary approval (Support step bypassed).";
        historyAction = 'Requested Extension (Bypassed Support)';
      }
      
      try {
         setIsSaving(true);
         const api = await import('@/lib/api');
         const executionDateToUse = auditTotals?.endDate || auditTotals?.startDate || new Date().toISOString();
         const executionFY = getIndianFY(executionDateToUse);

         const currentGridData = gridRef.current?.getData() || [];
         const currentChecklistData = checklistRef.current?.getData() || [];
         
         const cleanGrid = (currentGridData || []).map((m: any) => ({
             ...m,
             subs: (m.subs || []).map((s: any) => ({...s}))
         }));
         const cleanChecklist = currentChecklistData ? JSON.parse(JSON.stringify(currentChecklistData)) : { items: [] };

         const payload = {
            id: currentProjectId,
            customId: currentCustomId,
            name: saveModalName || currentCustomId || unitName,
            status: newStatus,
            isExtended: true,
            isRevised: true,
            gridData: cleanGrid,
            checklistData: cleanChecklist,
            metadata: {
              unitName,
              auditorName,
              financialYear,
              executionFY,
              assignedDeputyId,
              assignedJointId,
              auditTotals,
              originalEndDate,
              dsSupported: false,
              jsApproved: false
            }
         };
         
         await api.saveProject(payload, {
            action: historyAction,
            userId: user?.id || 'system',
            userName: user?.name || 'System'
         });
         
         // --- SEND PUSH NOTIFICATION (NTFY) ---
         try {
           if (newStatus === 'Extension Requested' && assignedDeputyId) {
              const deputy = allUsers.find(u => u.id === assignedDeputyId);
              if (deputy) {
                 const topicId = await api.getOrCreateNtfyTopic(deputy.id, deputy.ntfyTopic);
                 await api.sendNtfyNotification(
                    topicId,
                    `New Extension Request`,
                    `Field Auditor ${user?.name} has requested an extension for ${unitName}. Please review and support.`
                 );
              }
           } else if (newStatus === 'Extension Supported' && assignedJointId) {
              const joint = allUsers.find(u => u.id === assignedJointId);
              if (joint) {
                 const topicId = await api.getOrCreateNtfyTopic(joint.id, joint.ntfyTopic);
                 await api.sendNtfyNotification(
                    topicId,
                    `Extension Request Supported`,
                    `Deputy Secretary ${user?.name} has supported the extension request for ${unitName}. Please review and approve.`
                 );
              }
           }
         } catch (err) {
           console.error("Failed to send push notification", err);
         }

         setCurrentProjectStatus(newStatus);
         alert(successMessage);
         
         const newData = await api.getProjects(localStorage.getItem('globalTargetFy') || 'ALL', localStorage.getItem('globalExecFy') || 'ALL');
         setSavedProjects(newData || []);
      } catch (e) {
         console.error("Failed to request extension", e);
         alert("Failed to request extension.");
      }
      setIsSaving(false);
  };

  const getIndianFY = (dateString: string | undefined | null) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-11
    if (m < 3) return `FY ${y-1}-${y}`;
    return `FY ${y}-${y+1}`;
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
      console.log("Starting export process...");
    try {
        const gridData = gridRef.current?.getData() || [];
        const checklistData = checklistRef.current?.getData() || { items: [] };
        
        const payload = {
            gridData,
            checklistData: checklistData,
            metadata: { unitName, auditorName, financialYear, auditTotals }
        };
        
        // Dynamic import for export to avoid bloat
        const { exportToExcel } = await import('@/lib/exportExcel');
        await exportToExcel(payload);
        console.log("Export successful");
    } catch (e) {
        console.error(e);
        alert("Export failed.");
          console.error("Export failed:", e);
    }
      setIsExporting(false);
    };

  const confirmSaveModal = async () => {
         setIsSaving(true);
         console.log("Starting save process...");
     const name = saveModalName.trim();
       if (!name) {
           console.warn("Save cancelled: Name was empty.");
           setIsSaving(false);
           return;
       }
     
     const gridData = gridRef.current?.getData() || [];
     const checklistData = checklistRef.current?.getData() || [];
     
     const api = await import('@/lib/api');

    const executionDateToUse = auditTotals?.endDate || auditTotals?.startDate || new Date().toISOString();
    const executionFY = getIndianFY(executionDateToUse);

    const metadataPayload = { 
      unitName, 
      auditorName, 
      financialYear, 
      executionFY,
      assignedDeputyId,
      assignedJointId,
      auditTotals 
    };

    const isSubmit = saveModalType === 'submit';
    const finalStatus = isSubmit ? 'Submitted' : 'Draft';
    const submitDate = isSubmit ? new Date().toISOString() : null;

    if (saveModalType === 'template') {
        const cleanGrid = gridData.map((m: any) => ({
            ...m,
            actual_days: 0,
            manual_leave_days: 0,
            start_date: "",
            end_date: "",
            auto_nw_days: 0,
            auto_remarks: "",
            user_remarks: "",
            subs: (m.subs || []).map((s: any) => ({
              ...s,
              actual_days: 0,
              manual_leave_days: 0,
              start_date: "",
              end_date: "",
              auto_nw_days: 0,
              auto_remarks: "",
              user_remarks: ""
            }))
        }));
        
        const cleanChecklist = {
          formData: {
              q5: '', q6_status: '', q6_date: '', q11: ''
          },
          items: checklistData.items ? checklistData.items.map((c: any) => ({
              ...c,
              value: ''
          })) : []
        };
        
        try {
          const result = await api.saveTemplate({ 
             
            name, 
            visibility: templateVisibility,
            createdBy: user.id,
            gridData: cleanGrid, 
            checklistData: cleanChecklist, 
            metadata: metadataPayload 
          });
          
          setCurrentTemplateId(result.id);
          alert("Template Saved!");
          const newData = await api.getTemplates();
          setSavedTemplates(newData || []);
        } catch (e) {
          alert("Error saving template");
          console.error("Failed to save template:", e);
        }
    }
    
    setSaveModalOpen(false);
    setIsSaving(false);
  };

  const deleteTemplate = async (name: string) => {
     if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;
     try {
       const api = await import('@/lib/api');
       await api.deleteTemplate(name);
       const newData = await api.getTemplates();
       setSavedTemplates(newData || []);
     } catch (e) {
       alert("Error deleting template");
     }
  };

  const setDefaultTemplate = async (name: string) => {
     try {
       const api = await import('@/lib/api');
       await api.setDefaultTemplate(name);
       const newData = await api.getTemplates();
       setSavedTemplates(newData || []);
     } catch (e) {
       alert("Error setting default template");
     }
  };

  const deleteProject = async (name: string) => {
     if (!window.confirm(`Are you sure you want to delete project "${name}"?`)) return;
     try {
       const api = await import('@/lib/api');
       await api.deleteProject(name);
       const newData = await api.getProjects(localStorage.getItem('globalTargetFy') || 'ALL', localStorage.getItem('globalExecFy') || 'ALL');
       setSavedProjects(newData || []);
     } catch (e) {
       alert("Error deleting project");
     }
  };

  if (view === 'templates') {
    const filteredTemplates = savedTemplates.filter(t => {
      if (templateFilter === 'all') return true;
      if (templateFilter === 'public') return t.visibility === 'public';
      if (templateFilter === 'private') return t.visibility === 'private' || !t.visibility; // default to private if undefined
      return true;
    });

    const paginatedTemplates = filteredTemplates.slice((templatePage - 1) * ITEMS_PER_PAGE, templatePage * ITEMS_PER_PAGE);

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-4xl mx-auto">
        <div className="glass-panel p-8 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Saved Templates</h2>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button onClick={() => setTemplateFilter('all')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${templateFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>All</button>
              <button onClick={() => setTemplateFilter('public')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${templateFilter === 'public' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Public</button>
              <button onClick={() => setTemplateFilter('private')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${templateFilter === 'private' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Private</button>
            </div>
          </div>
          <div className="space-y-4">
            {filteredTemplates.length === 0 && <p className="text-sm text-slate-500">No templates found for this filter.</p>}
            {paginatedTemplates.map(t => (
              <div key={t.id || t.name} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border ${t.isDefault ? 'border-amber-400 dark:border-amber-500 shadow-sm' : 'border-slate-200 dark:border-slate-700'} hover:shadow-md transition-all gap-4`}>
                <div className="flex items-center space-x-3 flex-1">
                  <button 
                    onClick={() => setDefaultTemplate(t.id)}
                    title={t.isDefault ? "Current Default" : "Set as Default"}
                    className={`p-1.5 rounded-full transition-colors ${t.isDefault ? 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={t.isDefault ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </button>
                  <span className="text-base font-semibold text-slate-800 dark:text-slate-200">{t.name}</span>
                  {t.isDefault && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs font-bold rounded uppercase tracking-wider">Default</span>}
                </div>
                <div className="flex space-x-3">
                  <button onClick={() => loadTemplate(t)} className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-200 transition-colors">Load</button>
                  {!(t.visibility === 'public' && user?.hierarchy_weight === 40) && (
                    <button onClick={() => deleteTemplate(t.id)} className="px-4 py-2 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 font-bold rounded-lg hover:bg-rose-200 transition-colors">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={templatePage} setPage={setTemplatePage} total={filteredTemplates.length} itemsPerPage={ITEMS_PER_PAGE} />
        </div>
      </div>
    );
  }

  if (view === 'extend') {
    const eligibleStatuses = ['Submitted', 'Pending Support', 'Pending Approval', 'Audited', 'Draft AP & CL Submitted', 'Draft AP & CL Supported', 'Draft AP & CL Approved'];
    const sortedProjects = savedProjects
      .filter(p => p.createdBy === user.id && eligibleStatuses.includes(p.status) && !p.isExtended)
      .sort((a, b) => {
         const dateA = a.submittedAt || a.updatedAt || a.createdAt || '';
         const dateB = b.submittedAt || b.updatedAt || b.createdAt || '';
         return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    const myProjects = sortedProjects.slice((extendPage - 1) * ITEMS_PER_PAGE, extendPage * ITEMS_PER_PAGE);
    
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-5xl mx-auto">
        <div className="glass-panel p-8 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Extend AP & CL</h2>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              <div className="flex flex-col items-start">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Global Unit FY</label>
                <select 
                  value={selectedProjectTargetFy} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'LOAD_MORE_FUTURE') setFyOffsetTop(prev => prev + 5);
                    else if (val === 'LOAD_MORE_PAST') setFyOffsetBottom(prev => prev + 5);
                    else handleSetProjectTargetFy(val);
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <optgroup label="Indian Financial Years">
                    <option value="LOAD_MORE_FUTURE">↑ Load 5 more future FY...</option>
                    {recentFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                    <option value="LOAD_MORE_PAST">↓ Load 5 more older FY...</option>
                  </optgroup>
                  {customFys.length > 0 && (
                    <optgroup label="Custom Financial Years">
                      {customFys.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex flex-col items-start">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Global Execution FY</label>
                <select 
                  value={selectedProjectFy} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'LOAD_MORE_FUTURE') setFyOffsetTop(prev => prev + 5);
                    else if (val === 'LOAD_MORE_PAST') setFyOffsetBottom(prev => prev + 5);
                    else handleSetProjectExecFy(val);
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <optgroup label="Indian Financial Years">
                    <option value="LOAD_MORE_FUTURE">↑ Load 5 more future FY...</option>
                    {recentFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
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
          </div>
          <div className="space-y-4">
            {myProjects.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No eligible submitted Audit Programs found to extend.</p>}
            {myProjects.map(p => (
              <div key={p.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full flex items-center space-x-1 ${p.status === 'Audited' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                      <span>{p.status}</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span><strong>Unit:</strong> {p.metadata?.unitName || 'Unknown'}</span>
                    <span><strong>FY:</strong> {p.metadata?.executionFY || 'Unknown'}</span>
                    {p.submittedAt && <span><strong>Submitted:</strong> {new Date(p.submittedAt).toLocaleDateString('en-GB')}</span>}
                  </div>
                      {p.status !== 'Audited' && p.metadata?.lastNotification && (
                         <div className="mt-3 bg-rose-50 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 rounded p-2 text-xs flex flex-col space-y-1">
                            <strong className="text-rose-700 dark:text-rose-400"><ShieldAlert size={14} className="inline mr-1 -mt-0.5" /> Action Required: Audit Deadline</strong>
                            <span className="text-slate-600 dark:text-slate-300">
                               Your reviewer ({p.metadata.lastNotification.byRole}) has requested an update regarding your deadline.
                            </span>
                         </div>
                      )}
                </div>
                <div className="flex space-x-3 w-full md:w-auto">
                  <button onClick={() => loadProject(p, true)} className="flex-1 md:flex-none px-5 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors">
                    Begin Extension
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={extendPage} setPage={setExtendPage} total={sortedProjects.length} itemsPerPage={ITEMS_PER_PAGE} />
        </div>
      </div>
    );
  }

    if (view === 'analytics') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full mx-auto">
        <div className="glass-panel p-8 rounded-2xl border border-[var(--border)] shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">System Analytics</h2>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="flex flex-col items-start">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Global Unit FY</label>
              <select 
                value={selectedProjectTargetFy} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'LOAD_MORE_FUTURE') setFyOffsetTop(prev => prev + 5);
                  else if (val === 'LOAD_MORE_PAST') setFyOffsetBottom(prev => prev + 5);
                  else handleSetProjectTargetFy(val);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm cursor-pointer"
              >
                <option value="ALL">All Time</option>
                <optgroup label="Indian Financial Years">
                  <option value="LOAD_MORE_FUTURE">? Load 5 more future FY...</option>
                  {recentFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                  <option value="LOAD_MORE_PAST">? Load 5 more older FY...</option>
                </optgroup>
                {customFys.length > 0 && (
                  <optgroup label="Custom Financial Years">
                    {customFys.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="flex flex-col items-start">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Global Execution FY</label>
              <select 
                value={selectedProjectFy} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'LOAD_MORE_FUTURE') setFyOffsetTop(prev => prev + 5);
                  else if (val === 'LOAD_MORE_PAST') setFyOffsetBottom(prev => prev + 5);
                  else handleSetProjectExecFy(val);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm cursor-pointer"
              >
                <option value="ALL">All Time</option>
                <optgroup label="Indian Financial Years">
                  <option value="LOAD_MORE_FUTURE">? Load 5 more future FY...</option>
                  {recentFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                  <option value="LOAD_MORE_PAST">? Load 5 more older FY...</option>
                </optgroup>
                {customFys.length > 0 && (
                  <optgroup label="Custom Financial Years">
                    {customFys.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </div>

        <AnalyticsDashboard 
          projects={savedProjects}
          units={masterUnits}
          unitTypes={unitTypes}
          recentFYs={recentFYs}
          customFys={customFys}
          userRole={user.hierarchy_weight}
          onAdminOverride={() => {}}
          globalTargetFY={selectedProjectTargetFy}
          globalExecutionFY={selectedProjectFy}
        />
      </div>
    );
  }

  if (view === 'projects') {
    // Filter to only show the user's own projects
    const myProjects = savedProjects.filter(p => p.createdBy === user.id);
    
    const filteredProjects = myProjects.filter(p => {
      if (selectedProjectTargetFy !== 'ALL' && p.metadata?.financialYear !== selectedProjectTargetFy) return false;
      if (selectedProjectFy !== 'ALL' && p.metadata?.executionFY !== selectedProjectFy) return false;
      return true;
    });

    const paginatedProjects = filteredProjects.slice((projectPage - 1) * ITEMS_PER_PAGE, projectPage * ITEMS_PER_PAGE);

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-5xl mx-auto">
        <div className="glass-panel p-8 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Past Audits</h2>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              <div className="flex flex-col items-start">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Global Unit FY</label>
                <select 
                  value={selectedProjectTargetFy} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'LOAD_MORE_FUTURE') setFyOffsetTop(prev => prev + 5);
                    else if (val === 'LOAD_MORE_PAST') setFyOffsetBottom(prev => prev + 5);
                    else handleSetProjectTargetFy(val);
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <optgroup label="Indian Financial Years">
                    <option value="LOAD_MORE_FUTURE">↑ Load 5 more future FY...</option>
                    {recentFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                    <option value="LOAD_MORE_PAST">↓ Load 5 more older FY...</option>
                  </optgroup>
                  {customFys.length > 0 && (
                    <optgroup label="Custom Financial Years">
                      {customFys.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex flex-col items-start">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Global Execution FY</label>
                <select 
                  value={selectedProjectFy} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'LOAD_MORE_FUTURE') setFyOffsetTop(prev => prev + 5);
                    else if (val === 'LOAD_MORE_PAST') setFyOffsetBottom(prev => prev + 5);
                    else handleSetProjectExecFy(val);
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <optgroup label="Indian Financial Years">
                    <option value="LOAD_MORE_FUTURE">↑ Load 5 more future FY...</option>
                    {recentFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
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
          </div>
          
          <div className="space-y-4">
            {myProjects.length === 0 && <p className="text-sm text-slate-500 text-center py-8">You haven't saved any Audit Programs yet.</p>}
            {myProjects.length > 0 && filteredProjects.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No Audit Programs found for this Financial Year.</p>}
            
            {paginatedProjects.map(p => {
              const isDraft = p.status === 'Draft';
              
              return (
                <div key={p.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                      {isDraft ? (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs font-bold rounded-full">Draft</span>
                      ) : (
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full flex items-center space-x-1 ${p.status === 'Audited' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : p.status.includes('Draft') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                          <ShieldAlert size={12} />
                          <span>{p.status}</span>
                        </span>
                      )}
                      {p.isRevised && !p.isExtended && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs font-bold rounded-full">Revised</span>
                      )}
                      {p.isExtended && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 text-xs font-bold rounded-full">Extended AP & CL</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong>Unit:</strong> {p.metadata?.unitName || 'Unknown'}</span>
                      <span><strong>FY:</strong> {p.metadata?.executionFY || 'Unknown'}</span>
                      {p.submittedAt && <span><strong>Submitted:</strong> {new Date(p.submittedAt).toLocaleDateString('en-GB')}</span>}
                    </div>
                      {p.status !== 'Audited' && p.metadata?.lastNotification && (
                         <div className="mt-3 bg-rose-50 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 rounded p-2 text-xs flex flex-col space-y-1">
                            <strong className="text-rose-700 dark:text-rose-400"><ShieldAlert size={14} className="inline mr-1 -mt-0.5" /> Action Required: Audit Deadline</strong>
                            <span className="text-slate-600 dark:text-slate-300">
                               Your reviewer ({p.metadata.lastNotification.byRole}) has requested an update regarding your deadline.
                            </span>
                         </div>
                      )}
                  </div>
                  
                  <div className="flex space-x-3 w-full md:w-auto">
                    <button onClick={() => loadProject(p)} className="flex-1 md:flex-none px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-200 transition-colors">
                      {p.status === 'Audited' ? 'Use as Template' : 'Continue'}
                    </button>
                    {isDraft && !p.isExtended && !p.isRevised && (
                      <button onClick={() => deleteProject(p.id)} className="px-4 py-2 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 font-bold rounded-lg hover:bg-rose-200 transition-colors">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );})}
            </div>
            <Pagination page={projectPage} setPage={setProjectPage} total={filteredProjects.length} itemsPerPage={ITEMS_PER_PAGE} />
          </div>
        </div>
      );
    }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-8 w-full">
            <div className="glass-panel p-6 rounded-2xl flex items-center space-x-6 border border-[var(--border)] shadow-sm">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {user.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                  <div className="flex items-center space-x-4">
                     <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Welcome, {user.name}</h3>
                     {(isSaving || isExporting || isLoading) && (
                       <span className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full animate-pulse border border-indigo-200 dark:border-indigo-800">
                         <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         <span>{isSaving ? 'Saving...' : isExporting ? 'Exporting...' : 'Loading...'}</span>
                       </span>
                     )}
                  </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                  You are currently managing 1 active audit program.
                </p>
              </div>

            </div>
            
            {/* NEW SECTION: Please fill this */}
            <div className="glass-panel p-6 rounded-2xl border border-[var(--border)] shadow-sm flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                  Please fill this
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Branch Filter */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Branch / Region</label>
                    <select 
                      value={selectedBranchFilter}
                      onChange={(e) => {
                         setSelectedBranchFilter(e.target.value);
                         // Clear unit name if the user changes branch, to prevent invalid selections
                         setUnitName(''); 
                      }}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:cursor-not-allowed cursor-pointer"
                    >
                      <option value="ALL">All Branches</option>
                      {Array.from(new Set(masterUnits.map(u => u.branch).filter(Boolean))).sort().map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Name */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name of the Units/Institution</label>
                    <input 
                      type="text" 
                      list="unit-suggestions"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      placeholder="e.g. Delek Hospital"
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <datalist id="unit-suggestions">
                      {masterUnits
                        .filter(u => selectedBranchFilter === 'ALL' || u.branch === selectedBranchFilter)
                        .map(u => {
                        const displayName = u.file_number ? `${u.file_number} ${u.name}` : u.name;
                        return (
                          <option key={u.id || u.name} value={displayName}>
                            {u.tibetan_name ? `${displayName} (${u.tibetan_name})` : displayName}
                          </option>
                        );
                      })}
                    </datalist>
                  </div>

                  {/* Financial Year */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Financial Year</label>
                    <select 
                      value={financialYear}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'LOAD_MORE_FUTURE') {
                          setFyOffsetTop(prev => prev + 5);
                        } else if (val === 'LOAD_MORE_PAST') {
                          setFyOffsetBottom(prev => prev + 5);
                        } else {
                          setFinancialYear(val);
                        }
                      }}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:cursor-not-allowed cursor-pointer"
                    >
                      <option value="" disabled>Select FY...</option>
                      <option value="LOAD_MORE_FUTURE" className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30">↑ Load 5 more future FY...</option>
                      {recentFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                      <option value="LOAD_MORE_PAST" className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30">↓ Load 5 more older FY...</option>
                      {financialYear && !recentFYs.includes(financialYear) && financialYear !== 'LOAD_MORE_FUTURE' && financialYear !== 'LOAD_MORE_PAST' && (
                        <option value={financialYear}>{financialYear}</option>
                      )}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setIsFyModalOpen(true)}
                      className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline mt-1.5 text-left font-medium"
                    >
                      Find custom financial year
                    </button>
                  </div>

                  {/* Auditor Name */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Auditor Name</label>
                    <input 
                      type="text" 
                      value={auditorName}
                      readOnly
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm rounded-lg px-3 py-2 outline-none cursor-not-allowed transition-all"
                    />
                  </div>
                  
                  {/* Assigned Deputy - Visible only to L4 */}
                  {(!user || user.hierarchy_weight > 30) && (
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assigned Deputy Sec.</label>
                      <select 
                        value={assignedDeputyId}
                        onChange={(e) => setAssignedDeputyId(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="">-- Unassigned --</option>
                        <option value="NA">Not Applicable</option>
                        {allUsers.filter(u => u.hierarchy_weight === 30 && u.isActive !== false).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Assigned Joint - Visible only to L3 and L4 */}
                  {(!user || user.hierarchy_weight >= 30) && (
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assigned Joint Sec.</label>
                      <select 
                        value={assignedJointId}
                        onChange={(e) => setAssignedJointId(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="">-- Unassigned --</option>
                        {allUsers.filter(u => u.hierarchy_weight === 20 && u.isActive !== false).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                </div>
                
                <div className="mt-5 flex items-center">
                  <label className="flex items-center space-x-2 disabled:cursor-not-allowed cursor-pointer group" title={isLockedRevised ? "This Audit Program was rejected and must be submitted as a revision" : ""}>
                    <input 
                      type="checkbox" 
                      checked={isRevised}
                      onChange={(e) => setIsRevised(e.target.checked)} disabled={isLockedRevised}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:cursor-not-allowed cursor-pointer"
                    />
                    <span className={`text-sm font-semibold transition-colors ${isLockedRevised ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                      Revise Audit Program
                    </span>
                  </label>
                </div>
              </div>


            </div>
            
            {/* Tab Navigation */}
            {view !== 'calendar' && (
              <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-px">
                <button 
                  onClick={() => setActiveTab('schedule')}
                  className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'schedule' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                >
                  Audit Program Schedule
                </button>
                <button 
                  onClick={() => setActiveTab('checklist')}
                  className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'checklist' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                >
                  Compliance Checklist
                </button>
              </div>
            )}
            

            <div className={activeTab === 'schedule' && view !== 'calendar' ? 'block' : 'hidden'}>
              <AuditProgramGrid key={"grid-"+(currentProjectId || 'new')+(isExtendingMode?'-ext':'')} 
                isSubmitted={(currentProjectStatus === 'Submitted' || currentProjectStatus === 'Extension Requested' || currentProjectStatus === 'Extension Supported') && !isExtendingMode} 
                isStartDateDisabled={currentProjectStatus === 'Draft AP & CL Approved' || currentProjectStatus === 'Extended (Approved)' || isExtendingMode}
                isEndDateDisabled={(currentProjectStatus === 'Draft AP & CL Approved' || currentProjectStatus === 'Extended (Approved)') && !isExtendingMode}
                minEndDate={isExtendingMode ? originalEndDate : undefined}
                onEndDateExtended={() => {
                  if (!hasAlertedExtended) {
                    alert("Please allocate the extended days among your Audit Procedures in the grid below.");
                    setHasAlertedExtended(true);
                  }
                }}
                loadedTotals={loadedTotals} 
                onTotalsCalculated={setAuditTotals} 
                ref={gridRef} 
                loadedData={loadedGridData} 
                onDataChange={setSyncedGridData} 
                onProceed={() => setActiveTab('checklist')} 
              />
            </div>
            <div className={activeTab === 'checklist' && view !== 'calendar' ? 'block' : 'hidden'}>
              <ChecklistGrid key={"chk-"+(currentProjectId || 'new')+(isExtendingMode?'-ext':'')} auditTotals={auditTotals} ref={checklistRef} loadedData={loadedChecklistData} unitName={unitName} auditorName={auditorName} financialYear={financialYear} />
              <div className="mt-8 flex justify-end items-center space-x-4 max-w-4xl mx-auto w-full">
                 <button disabled={isSaving || isExporting} onClick={handleSaveTemplateClick} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50">
                    Save Template
                 </button>
                 {currentProjectStatus === 'Draft' && (
                    <button disabled={isSaving || isExporting} onClick={() => handleSaveProjectClick('Draft')} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50">
                       Save Draft
                    </button>
                 )}
                 {currentProjectStatus === 'Draft' && (
                    <button disabled={isSaving || isExporting} onClick={() => handleSaveProjectClick('DraftSubmitted')} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50">
                       Submit Draft AP & CL
                    </button>
                 )}
                 {(currentProjectStatus === 'Draft' || currentProjectStatus === 'Draft AP & CL Approved' || currentProjectStatus === 'Extended (Approved)' || currentProjectStatus === 'Draft AP & CL Submitted' || currentProjectStatus === 'Draft AP & CL Supported') && !isExtendingMode && (
                    <button disabled={isSaving || isExporting} onClick={() => handleSaveProjectClick('Submitted')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50">
                       Submit Final
                    </button>
                 )}
                 {(currentProjectStatus === 'Pending Support' || currentProjectStatus === 'Pending Approval' || currentProjectStatus === 'Submitted' || currentProjectStatus === 'Draft AP & CL Submitted' || currentProjectStatus === 'Draft AP & CL Supported') && !isExtendingMode && (
                    <>
                      <button disabled={isSaving || isExporting} onClick={handleCancelSubmission} className="px-5 py-2.5 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900 font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50">
                         {currentProjectStatus.startsWith('Draft') ? 'Undo Draft Submission' : 'Undo Final Submission'}
                      </button>
                    </>
                 )}
                 {(currentProjectStatus === 'Pending Support' || currentProjectStatus === 'Pending Approval' || currentProjectStatus === 'Submitted' || currentProjectStatus === 'Audited' || currentProjectStatus === 'Draft AP & CL Submitted' || currentProjectStatus === 'Draft AP & CL Supported' || currentProjectStatus === 'Draft AP & CL Approved' || currentProjectStatus === 'Extended (Approved)') && isExtendingMode && (
                    <button disabled={isSaving || isExporting} onClick={handleRequestExtension} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50">
                       Submit Extension Request
                    </button>
                 )}
                 {(currentProjectStatus === 'Extension Requested' || currentProjectStatus === 'Extension Supported') && (
                    <>
                      <button disabled={isSaving || isExporting} onClick={handleCancelExtension} className="px-5 py-2.5 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900 font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50">
                         Cancel Extension Request
                      </button>
                      <button disabled={true} className="px-5 py-2.5 bg-amber-500/50 text-amber-900 dark:text-amber-200 font-semibold rounded-lg shadow-sm cursor-not-allowed">
                         Extension Pending Approval
                      </button>
                    </>
                 )}
                 {savedProjects.find(p => p.id === currentProjectId)?.is_admin_override ? (
                    <div className="px-6 py-2.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-semibold rounded-lg text-sm border border-slate-200 dark:border-slate-700 flex items-center h-full">
                       Excel export not available due to Audit override by Admin
                    </div>
                 ) : (
                   <button disabled={isSaving || isExporting} onClick={handleExportExcel} className="px-6 py-2.5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h8"></path><path d="M8 17h8"></path><path d="M10 9h4"></path></svg>
                      <span>Export to Excel</span>
                   </button>
                 )}
              </div>
            </div>
            
            {view === 'calendar' && (
              <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
                 <MyCalendar data={syncedGridData} />
              </div>
            )}
            
          </div>

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
               {saveModalType === 'template' ? 'Save Template' : saveModalType === 'submit' ? 'Submit Final Audit Program' : 'Save Audit Program Draft'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
               {saveModalType === 'template' ? 'Enter a name for this Template (Saves structure only)' : saveModalType === 'submit' ? 'Enter a name to finalize and submit this Audit Program.' : 'Enter a name to save this Audit Program as a Draft.'}
            </p>
            <input 
               type="text" 
               value={saveModalName} 
               onChange={e => setSaveModalName(e.target.value)}
               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 text-slate-800 dark:text-slate-200"
               placeholder="Enter name..."
               autoFocus
            />
            
            {saveModalType === 'template' && (
              <div className="mb-6 flex flex-col space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visibility</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button 
                    onClick={() => setTemplateVisibility('private')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${templateVisibility === 'private' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Private
                  </button>
                  <button 
                    onClick={() => setTemplateVisibility('public')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${templateVisibility === 'public' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Public
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {templateVisibility === 'private' ? 'Only you can see and use this template.' : 'Everyone in the organization can use this template.'}
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-2">
               <button onClick={() => setSaveModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors">Cancel</button>
               <button disabled={isSaving} onClick={confirmSaveModal} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2">{isSaving ? 'Saving...' : saveModalType === 'submit' ? 'Submit' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* FY Search Modal */}
      {isFyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Find Financial Year</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Select a custom financial year defined by your admin, or manually enter any Indian Financial Year.</p>
            
            {/* Admin Custom FYs */}
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Custom / International FYs</h4>
            <div className="space-y-2 mb-8">
              {customFys.map(fy => (
                <div 
                  key={fy.id} 
                  onClick={() => { setFinancialYear(fy.name); setIsFyModalOpen(false); }}
                  className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:cursor-not-allowed cursor-pointer transition-colors group"
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{fy.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{fy.start_date} to {fy.end_date}</div>
                </div>
              ))}
              {customFys.length === 0 && (
                <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-sm text-slate-500">
                  No custom financial years have been defined yet.
                </div>
              )}
              <div className="mt-3 text-xs text-slate-500 text-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                Can't find the Custom Financial Year you are looking for? <br/>
                Please request your <strong>Secretary (L1)</strong> or <strong>Joint Secretary (L2)</strong> to add it via their Admin Dashboard.
              </div>
            </div>

            {/* Manual Entry Removed to enforce Data Integrity */}

            <div className="mt-8 flex justify-end">
              <button onClick={() => setIsFyModalOpen(false)} className="px-5 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Close</button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading workspace...</div>}>
      <HomeContent />
    </Suspense>
  );
}

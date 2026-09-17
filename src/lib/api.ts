import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, addDoc, deleteDoc, getDoc, query, where, orderBy, limit, startAfter, getCountFromServer, DocumentData, QueryDocumentSnapshot , or } from 'firebase/firestore';

// ================= Financial Years =================
export type FinancialYear = { 
  id?: string; 
  name: string; 
  start_date: string; 
  end_date: string; 
  is_active: boolean;
};

export async function getFinancialYears(): Promise<FinancialYear[]> {
  const querySnapshot = await getDocs(collection(db, "financial_years"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialYear));
}

export async function createFinancialYear(data: FinancialYear): Promise<FinancialYear> {
  const docRef = await addDoc(collection(db, "financial_years"), data);
  return { id: docRef.id, ...data };
}

export async function updateFinancialYear(id: string, data: FinancialYear): Promise<FinancialYear> {
  const docRef = doc(db, "financial_years", id);
  await updateDoc(docRef, data as any);
  return { id, ...data };
}

// ================= Units =================
export type AuditUnit = { 
  id?: string; 
  file_number: string; 
  name: string; 
  tibetan_name?: string;
  is_active?: boolean;
  branch?: string;
  active_from_fy?: string;
  unit_type_main?: string;
  unit_type_sub?: string;
  unit_type_id?: string | null;
};

export function getUnits(): Promise<AuditUnit[]> {
  return withCache(masterCache, "units", async () => {
    const querySnapshot = await getDocs(collection(db, "units"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditUnit));
  });
}

export async function createUnit(unit: AuditUnit): Promise<AuditUnit> {
  masterCache["units"] = null;
  const docRef = await addDoc(collection(db, "units"), unit);
  return { id: docRef.id, ...unit };
}

export async function updateUnit(id: string, updates: Partial<AuditUnit>) {
  masterCache["units"] = null;
  await updateDoc(doc(db, "units", id), updates);
}

export async function deleteUnit(id: string) {
  masterCache["units"] = null;
  await deleteDoc(doc(db, "units", id));
}


// ================= Unit Types =================

export interface FSGroup {
  id?: string;
  name: string;
  type: 'Liability' | 'Asset';
  requiresBifurcation: boolean;
  order: number;
}

export interface UnitType {
  id?: string;
  name: string;
  parent_id: string | null;
}

export function getUnitTypes(): Promise<UnitType[]> {
  return withCache(masterCache, "unitTypes", async () => {
    const querySnapshot = await getDocs(collection(db, "unit_types"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnitType));
  });
}

export async function createUnitType(unitType: UnitType): Promise<UnitType> {
  masterCache["unitTypes"] = null;
  masterCache["units"] = null;
  const docRef = await addDoc(collection(db, "unit_types"), unitType);
  return { id: docRef.id, ...unitType };
}

export async function updateUnitType(id: string, updates: Partial<UnitType>) {
  masterCache["unitTypes"] = null;
  masterCache["units"] = null;
  await updateDoc(doc(db, "unit_types", id), updates);
}

export async function deleteUnitType(id: string) {
  masterCache["unitTypes"] = null;
  masterCache["units"] = null;
  await deleteDoc(doc(db, "unit_types", id));
}

// ================= Custom Financial Years =================
;







// ================= Templates =================
export function getTemplates(): Promise<any[]> {
  return withCache(masterCache, "templates", async () => {
    const querySnapshot = await getDocs(collection(db, "templates"));
    return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as any));
  });
}

export async function saveTemplate(data: any) {
  masterCache["templates"] = null;
  let docId = data.id;
  const payload = { ...data };
  delete payload.id;
  payload.updatedAt = new Date().toISOString();
  
  if (docId) {
    const docRef = doc(db, "templates", docId);
    await updateDoc(docRef, payload);
  } else {
    payload.createdAt = new Date().toISOString();
    const docRef = await addDoc(collection(db, "templates"), payload);
    docId = docRef.id;
  }
  return { id: docId };
}

export async function deleteTemplate(id: string) {
  masterCache["templates"] = null;
  await deleteDoc(doc(db, "templates", id));
}

export async function setDefaultTemplate(id: string) {
  masterCache["templates"] = null;
  const templates = await getTemplates();
  for (const t of templates) {
    if (t.isDefault) {
      await updateDoc(doc(db, "templates", t.id), { isDefault: false });
    }
  }
  await updateDoc(doc(db, "templates", id), { isDefault: true });
}

// ================= Users (Admin) =================
export function getUsers(): Promise<any[]> {
  return withCache(masterCache, "users", async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as any));
  });
}

export async function updateUserRole(userId: string, newWeight: number) {
  masterCache["users"] = null;
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, { hierarchy_weight: newWeight });
}

export async function updateUserName(userId: string, newName: string, nameChangedOnce: boolean = true) {
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, { name: newName, nameChangedOnce });
}

export async function deleteUserAccount(userId: string) {
  const docRef = doc(db, "users", userId);
  await deleteDoc(docRef);
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, { isActive });
}

export async function updateUserNtfyTopic(userId: string, newTopic: string) {
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, { ntfyTopic: newTopic });
}

// ================= Projects =================
let _projectsCache: { data: any[], timestamp: number, targetFy: string, execFy: string } | null = null;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

function withCache(cacheObj: any, key: string, fetchFn: any) {
  const now = Date.now();
  if (cacheObj[key] && now - cacheObj[key].timestamp < CACHE_TTL) {
    return Promise.resolve(cacheObj[key].data);
  }
  return fetchFn().then((data: any) => {
    cacheObj[key] = { data, timestamp: now };
    return data;
  });
}
const masterCache: any = {};


export function clearProjectsCache() {
  _projectsCache = null;
}

export async function getHistoricalProjects() {
  const q = collection(db, "historical_projects");
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as any));
}

export async function getProjects(targetFy: string = 'ALL', execFy: string = 'ALL') {
  let q: any = collection(db, "projects");
  
  if (execFy !== 'ALL') {
    q = query(q, where("metadata.executionFY", "==", execFy));
  }

  const querySnapshot = await getDocs(q);
  let projects = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as any));
  
  // Fetch historical projects separately to avoid complex OR index requirements
  if (execFy !== 'ALL') {
      const qHist = query(collection(db, "projects"), where("isHistoricalFS", "==", true));
      const histSnap = await getDocs(qHist);
      const histProjects = histSnap.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as any));
      // merge avoiding duplicates
      const existingIds = new Set(projects.map(p => p.id));
      for (const hp of histProjects) {
          if (!existingIds.has(hp.id)) projects.push(hp);
      }
  }
  
  if (targetFy !== 'ALL') {
    projects = projects.filter(p => {
       const fys = p.metadata?.financialYears || (p.metadata?.financialYear ? [p.metadata.financialYear] : []);
       return fys.includes(targetFy);
    });
  }
  
  // Sort locally to avoid needing a complex composite index in Firestore
  projects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  return projects;
}

export async function saveProject(data: any, historyLog?: { action: string; userId?: string; userName?: string; notes?: string }) {
  clearProjectsCache();
  let docId = data.id;
  
  // Create a customId if it doesn't exist
  if (!data.customId) {
    const ts = Date.now().toString().slice(-6);
    data.customId = `AP-${ts}`;
  }
  
  const cleanUndefined = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (Array.isArray(obj)) return obj.map(cleanUndefined);
    if (typeof obj === 'object') {
      const res: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          res[key] = cleanUndefined(obj[key]);
        }
      }
      return res;
    }
    return obj;
  };

  const payload = cleanUndefined({ ...data });
  // Never save the explicit "id" field in the document body as null
  delete payload.id;
  payload.updatedAt = new Date().toISOString();

  // Append history log if provided
  if (historyLog) {
    const entry = {
      ...historyLog,
      timestamp: new Date().toISOString()
    };
    if (!payload.history) payload.history = [];
    payload.history.push(entry);
  }

  const finalPayload = cleanUndefined(payload);

  if (!docId) {
    finalPayload.createdAt = new Date().toISOString();
    if (!finalPayload.history) finalPayload.history = [{ action: 'Created Draft', timestamp: finalPayload.createdAt, userId: 'system', userName: 'System' }];
    const docRef = await addDoc(collection(db, "projects"), finalPayload);
    return { ...finalPayload, id: docRef.id };
  } else {
    await updateDoc(doc(db, "projects", docId), finalPayload);
    return { ...finalPayload, id: docId };
  }
}

export async function deleteProject(id: string) {
  clearProjectsCache();
  await deleteDoc(doc(db, "projects", id));
}

export async function getOrCreateNtfyTopic(userId?: string, currentTopic?: string) {
  if (currentTopic) return currentTopic;
  if (!userId) return '';
  
  // Generate a random 12 character alphanumeric string
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomStr = Array.from({length: 12}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const newTopic = `oag-audit-${randomStr}`;
  
  // Save to Firebase User doc
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, { ntfyTopic: newTopic });
  
  return newTopic;
}

export async function sendNtfyNotification(topic: string, title: string, message: string) {
  if (!topic) return;
  try {
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: message,
      headers: {
        'Title': title,
        'Tags': 'rotating_light,clipboard'
      }
    });
    if (!res.ok) throw new Error('Failed to send ntfy push');
    return await res.text();
  } catch (e) {
    console.error('Failed to send push notification:', e);
  }
}


// ==========================================
// FS GROUPS
// ==========================================

export const getFSGroups = async (): Promise<FSGroup[]> => {
  const q = query(collection(db, 'fsGroups'), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  const groups: FSGroup[] = [];
  snap.forEach(doc => {
    groups.push({ id: doc.id, ...doc.data() } as FSGroup);
  });
  return groups;
};

export const createFSGroup = async (groupData: Partial<FSGroup>) => {
  masterCache["fsGroups"] = null;
  const docRef = await addDoc(collection(db, 'fsGroups'), groupData);
  return docRef.id;
};

export const updateFSGroup = async (id: string, groupData: Partial<FSGroup>) => {
  masterCache["fsGroups"] = null;
  const docRef = doc(db, 'fsGroups', id);
  await updateDoc(docRef, groupData);
};

export const deleteFSGroup = async (id: string) => {
  masterCache["fsGroups"] = null;
  await deleteDoc(doc(db, 'fsGroups', id));
};

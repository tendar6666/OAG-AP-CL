import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, addDoc, deleteDoc, getDoc, query, where, orderBy, limit, startAfter, getCountFromServer, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

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

export async function getUnits(): Promise<AuditUnit[]> {
  const querySnapshot = await getDocs(collection(db, "units"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditUnit));
}

export async function createUnit(unit: AuditUnit): Promise<AuditUnit> {
  const docRef = await addDoc(collection(db, "units"), unit);
  return { id: docRef.id, ...unit };
}

export async function updateUnit(id: string, updates: Partial<AuditUnit>) {
  await updateDoc(doc(db, "units", id), updates);
}

export async function deleteUnit(id: string) {
  await deleteDoc(doc(db, "units", id));
}


// ================= Unit Types =================
export interface UnitType {
  id?: string;
  name: string;
  parent_id: string | null;
}

export async function getUnitTypes(): Promise<UnitType[]> {
  const querySnapshot = await getDocs(collection(db, "unit_types"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnitType));
}

export async function createUnitType(unitType: UnitType): Promise<UnitType> {
  const docRef = await addDoc(collection(db, "unit_types"), unitType);
  return { id: docRef.id, ...unitType };
}

export async function updateUnitType(id: string, updates: Partial<UnitType>) {
  await updateDoc(doc(db, "unit_types", id), updates);
}

export async function deleteUnitType(id: string) {
  await deleteDoc(doc(db, "unit_types", id));
}

// ================= Custom Financial Years =================
export interface CustomFY {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

export async function getCustomFYs(): Promise<CustomFY[]> {
  const querySnapshot = await getDocs(collection(db, "custom_fys"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomFY));
}

export async function createCustomFY(fy: Omit<CustomFY, 'id'>): Promise<CustomFY> {
  const docRef = await addDoc(collection(db, "custom_fys"), fy);
  return { id: docRef.id, ...fy };
}

export async function deleteCustomFY(id: string) {
  await deleteDoc(doc(db, "custom_fys", id));
}

// ================= Templates =================
export async function getTemplates() {
  const querySnapshot = await getDocs(collection(db, "templates"));
  return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as any));
}

export async function saveTemplate(data: any) {
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
  await deleteDoc(doc(db, "templates", id));
}

export async function setDefaultTemplate(id: string) {
  const templates = await getTemplates();
  for (const t of templates) {
    if (t.isDefault) {
      await updateDoc(doc(db, "templates", t.id), { isDefault: false });
    }
  }
  await updateDoc(doc(db, "templates", id), { isDefault: true });
}

// ================= Users (Admin) =================
export async function getUsers() {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as any));
}

export async function updateUserRole(userId: string, newWeight: number) {
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
export async function getProjects(targetFy: string = 'ALL', execFy: string = 'ALL') {
  let q: any = collection(db, "projects");
  
  if (execFy !== 'ALL') {
    q = query(q, where("metadata.executionFY", "==", execFy));
  }

  const querySnapshot = await getDocs(q);
  let projects = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as any));
  
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

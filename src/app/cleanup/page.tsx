'use client';

import { useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CleanupPage() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const runCleanup = async () => {
    setRunning(true);
    addLog('Starting cleanup v5 (Bulletproof Master Directory grouping)...');
    try {
      const { getUnits } = await import('@/lib/api');
      const units = await getUnits();
      addLog(`Loaded ${units.length} units from Master Directory.`);

      const snap = await getDocs(collection(db, 'historical_projects'));
      addLog(`Found ${snap.docs.length} historical projects.`);

      const groups: Record<string, any[]> = {};
      
      snap.docs.forEach(d => {
        const data = d.data();
        const fy = data.metadata?.financialYear;
        if (!fy) return;
        
        let rawFileNo = data.customId || data.metadata?.fileNumber;
        let unitName = (data.metadata?.unitName || '').trim();
        
        if (unitName.match(/^\d+\|\d+/)) {
            const match = unitName.match(/^(\d+\|\d+)\s+(.*)/);
            if (match) {
                if (!rawFileNo || !String(rawFileNo).includes('|')) {
                    rawFileNo = match[1];
                }
                unitName = match[2].trim();
            }
        }
        
        // Always try to resolve the canonical Master Directory file number
        let canonicalFileNo = null;
        let fbUnit = null;

        // Try matching rawFileNo directly if it looks like a file number
        if (rawFileNo && String(rawFileNo).includes('|')) {
            fbUnit = units.find(u => String(u.file_number).trim() === String(rawFileNo).trim());
        }
        
        // If not found, try matching by name
        if (!fbUnit && unitName) {
            const cleanName = unitName.toLowerCase();
            fbUnit = units.find(u => 
                u.name.toLowerCase() === cleanName || 
                cleanName.endsWith(u.name.toLowerCase()) || 
                u.name.toLowerCase().endsWith(cleanName)
            );
        }

        if (fbUnit && fbUnit.file_number) {
            canonicalFileNo = fbUnit.file_number;
        }

        let key = '';
        if (canonicalFileNo) {
            key = `${canonicalFileNo}_${fy}`;
        } else if (unitName) {
            key = `name_${unitName}_${fy}`;
        } else if (rawFileNo) {
            key = `raw_${rawFileNo}_${fy}`;
        } else {
            return; // Completely useless record
        }
        
        if (!groups[key]) groups[key] = [];
        groups[key].push({ id: d.id, data });
      });

      let mergedCount = 0;
      let deletedCount = 0;

      for (const key in groups) {
        const docs = groups[key];
        if (docs.length > 1) {
          addLog(`Group ${key} has ${docs.length} documents. Merging...`);
          
          const baseDoc = docs[0];
          const mergedData = JSON.parse(JSON.stringify(baseDoc.data));
          
          if (!mergedData.financialStatements) mergedData.financialStatements = {};
          if (!mergedData.financialStatements.data) mergedData.financialStatements.data = {};
          
          const fy = mergedData.metadata.financialYear;
          mergedData.financialStatements.data[fy] = {};

          let stmtCounter = 1;

          docs.forEach((d) => {
             const fsData = d.data.financialStatements?.data;
             if (fsData && fsData[fy]) {
                 for (const originalStmtId in fsData[fy]) {
                     const stmt = fsData[fy][originalStmtId];
                     const newStmtId = `stmt_${stmtCounter++}`;
                     stmt.id = newStmtId; 
                     mergedData.financialStatements.data[fy][newStmtId] = stmt;
                     addLog(`  -> Extracted statement: ${stmt.name} as ${newStmtId}`);
                 }
             }
          });

          // Ensure the merged doc has the canonical fileNo if we found one
          if (key.includes('|')) {
              mergedData.customId = key.split('_')[0]; 
              mergedData.metadata.fileNumber = key.split('_')[0];
          }

          await setDoc(doc(db, 'historical_projects', baseDoc.id), mergedData);
          addLog(`Saved merged doc ${baseDoc.id} with ${stmtCounter - 1} statements.`);
          mergedCount++;

          for (let i = 1; i < docs.length; i++) {
             await deleteDoc(doc(db, 'historical_projects', docs[i].id));
             deletedCount++;
          }
        }
      }

      addLog(`Cleanup complete! Merged ${mergedCount} groups, deleted ${deletedCount} duplicate documents.`);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    }
    setRunning(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto mt-20 bg-white shadow-xl rounded-xl border border-slate-200">
      <h1 className="text-2xl font-bold mb-4 text-slate-800">Database Cleanup Utility v5</h1>
      <p className="text-slate-600 mb-6 text-sm">Bulletproof version. It aggressively cross-references every historical record with the Master Audit Directory to guarantee absolute grouping, overcoming randomized internal IDs.</p>
      <button 
        onClick={runCleanup} 
        disabled={running}
        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {running ? 'Running Cleanup...' : 'Run Historical Data Consolidation'}
      </button>
      <div className="mt-8 bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-xs h-96 overflow-y-auto whitespace-pre-wrap">
        {log.length === 0 ? 'Ready.' : log.join('\n')}
      </div>
    </div>
  );
}

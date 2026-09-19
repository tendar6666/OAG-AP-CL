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
    addLog('Starting cleanup v3 (Grouping by Name fallback)...');
    try {
      const snap = await getDocs(collection(db, 'historical_projects'));
      addLog(`Found ${snap.docs.length} historical projects.`);

      const groups: Record<string, any[]> = {};
      
      snap.docs.forEach(d => {
        const data = d.data();
        const fy = data.metadata?.financialYear;
        if (!fy) return;
        
        let fileNo = data.customId || data.metadata?.fileNumber;
        let unitName = (data.metadata?.unitName || '').trim();
        if (!fileNo && unitName.match(/^\d+\|\d+/)) {
            const match = unitName.match(/^(\d+\|\d+)\s+(.*)/);
            if (match) {
                fileNo = match[1];
                unitName = match[2].trim();
            }
        }
        
        let key = '';
        if (fileNo) {
            key = `${fileNo}_${fy}`;
        } else if (unitName) {
            key = `name_${unitName}_${fy}`;
        } else {
            return;
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
      <h1 className="text-2xl font-bold mb-4 text-slate-800">Database Cleanup Utility v3</h1>
      <p className="text-slate-600 mb-6 text-sm">This version features robust grouping that catches unindexed records lacking file numbers.</p>
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

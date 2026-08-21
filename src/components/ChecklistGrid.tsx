"use client";
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Plus, GripHorizontal, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type InputType = 'toggle' | 'date' | 'remarks' | 'number';

export type ChecklistItemType = {
  id: string;
  level: 1 | 2 | 3; // 1: 4,5,6 / 2: i,ii,iii / 3: a,b,c
  text: string;
  inputType: InputType;
  value: any;
};

const defaultDynamicItems: ChecklistItemType[] = [
  { id: 'c4', level: 1, text: 'State (Yes or No) whether the followings exercise have been carried out or not', inputType: 'remarks', value: '' },
  { id: 'c4-1', level: 2, text: 'Review of last Audit Report/and Report Register', inputType: 'toggle', value: '' },
  { id: 'c4-2', level: 2, text: 'Study of Bye-Law, Rules & Regulation and Minutes of BOD Meetings.', inputType: 'toggle', value: '' },
  { id: 'c4-3', level: 2, text: 'Proper Closing of Cash book & Ledger Accounts', inputType: 'toggle', value: '' },
  { id: 'c4-4', level: 2, text: 'Preparation of Bank Reconciliation', inputType: 'toggle', value: '' },
  { id: 'c4-5', level: 2, text: 'Collection of Bank Certificates', inputType: 'toggle', value: '' },
  { id: 'c4-6', level: 2, text: 'Verification of Cash', inputType: 'toggle', value: '' },
  { id: 'c4-7', level: 2, text: 'Difference, if any', inputType: 'remarks', value: '' },
  { id: 'c4-7a', level: 3, text: 'Shown in the Books', inputType: 'remarks', value: '' },
  { id: 'c4-7b', level: 3, text: 'Mention in the report.', inputType: 'remarks', value: '' },
  { id: 'c4-8', level: 2, text: 'Verification of Stock Statement to ascertain shortages & Excess', inputType: 'toggle', value: '' },
  { id: 'c4-9a', level: 3, text: 'Net Excesses/Shortage shown in the book intra units', inputType: 'toggle', value: '' },
  { id: 'c4-9b', level: 3, text: 'Have you visited the store/Godown personally to assess the stock condition', inputType: 'toggle', value: '' },
  { id: 'c4-10', level: 2, text: 'Balance Confirmation', inputType: 'toggle', value: '' },
  { id: 'c4-12', level: 2, text: 'Verification of list:', inputType: 'remarks', value: '' },
  { id: 'c4-12a', level: 3, text: 'Sundry Creditors', inputType: 'toggle', value: '' },
  { id: 'c4-12b', level: 3, text: 'Sundry Advances', inputType: 'toggle', value: '' },
  { id: 'c4-12c', level: 3, text: 'Provident Fund', inputType: 'toggle', value: '' },
  { id: 'c4-12d', level: 3, text: 'Sundry Payables', inputType: 'toggle', value: '' },
  { id: 'c4-12e', level: 3, text: 'Sundry Debtors', inputType: 'toggle', value: '' },
  { id: 'c4-12f', level: 3, text: 'Deposits', inputType: 'toggle', value: '' },
  { id: 'c4-12g', level: 3, text: 'Receivables', inputType: 'toggle', value: '' },
  { id: 'c4-12h', level: 3, text: 'Investments', inputType: 'toggle', value: '' },
  { id: 'c4-13', level: 2, text: 'Provision for Audit Fee.', inputType: 'toggle', value: '' },
  { id: 'c4-14', level: 2, text: 'Provision for Chatrel', inputType: 'toggle', value: '' },
];

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi'];
const alpha = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice();
  newArray.splice(to < 0 ? newArray.length + to : to, 0, newArray.splice(from, 1)[0]);
  return newArray;
}

// ---------------------------
// Sortable Row
// ---------------------------
const SortableChecklistRow = ({ item, displayNum, onChange, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const indentClass = item.level === 1 ? 'pl-2 bg-slate-100 dark:bg-slate-800' 
                    : item.level === 2 ? 'pl-8 bg-white dark:bg-[var(--card)]'
                    : 'pl-16 bg-slate-50/50 dark:bg-slate-800/20';

  const isHeader = item.level === 1;

  const renderInput = () => {
     if (item.inputType === 'toggle') {
        return (
           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit border border-slate-200 dark:border-slate-700">
             <button onClick={() => onChange(item.id, 'value', 'Yes')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${item.value === 'Yes' ? 'bg-white dark:bg-slate-700 text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Yes</button>
             <button onClick={() => onChange(item.id, 'value', 'No')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${item.value === 'No' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>No</button>
             <button onClick={() => onChange(item.id, 'value', 'N/A')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${item.value === 'N/A' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>N/A</button>
           </div>
        );
     }
     if (item.inputType === 'date') {
        return <input type="date" value={item.value || ''} onChange={(e) => onChange(item.id, 'value', e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500" />;
     }
     if (item.inputType === 'number') {
        return <input type="number" value={item.value || ''} onChange={(e) => onChange(item.id, 'value', e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 w-24" placeholder="0" />;
     }
     if (item.inputType === 'remarks') {
        return <input type="text" value={item.value || ''} onChange={(e) => onChange(item.id, 'value', e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 min-w-[200px]" placeholder="Remarks..." />;
     }
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex justify-between items-center py-2.5 pr-4 border-b border-slate-100 dark:border-slate-800/50 group ${indentClass}`}>
      <div className="flex items-center space-x-3 flex-1 mr-4">
        <div {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-indigo-500 p-1">
          <GripHorizontal size={16} />
        </div>
        <span className={`w-8 text-sm font-medium ${isHeader ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
           {displayNum}
        </span>
        <input 
           type="text" 
           value={item.text} 
           onChange={(e) => onChange(item.id, 'text', e.target.value)}
           className={`flex-1 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 rounded px-2 py-1 focus:outline-none text-sm ${isHeader ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}
        />
      </div>
      <div className="flex items-center space-x-4">
        {renderInput()}
        <button onClick={() => onDelete(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors p-1" title="Delete">
           <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};


// ---------------------------
// Main Checklist Component
// ---------------------------
const ChecklistGrid = forwardRef(({ auditTotals, loadedData, unitName, auditorName, financialYear }: any, ref) => {
  
  const [items, setItems] = useState<ChecklistItemType[]>(defaultDynamicItems);
  
  // Add Item Modal State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLevel, setAddLevel] = useState<1|2|3>(1);
  const [addInputType, setAddInputType] = useState<InputType>('toggle');
  const [addText, setAddText] = useState('');
  
  // Static Footer State (Sections 5-11)
  const [formData, setFormData] = useState<Record<string, any>>({
    q5: 'Yes',
    q6_status: 'Yes',
    q6_date: '',
    q11: ''
  });

  useImperativeHandle(ref, () => ({
      getData: () => ({
          items,
          formData
      })
  }), [items, formData]);

  useEffect(() => {
      if (loadedData) {
          if (loadedData.items) setItems(loadedData.items);
          if (loadedData.formData) setFormData(loadedData.formData);
      }
  }, [loadedData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleItemChange = (id: string, field: string, val: any) => {
      setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const handleDelete = (id: string) => {
      setItems(prev => prev.filter(i => i.id !== id));
  };

  const openAddForm = (level: 1 | 2 | 3) => {
      setAddLevel(level);
      setAddInputType('toggle');
      setAddText('');
      setShowAddForm(true);
  };

  const confirmAddItem = () => {
      if (!addText.trim()) return;
      setItems(prev => [...prev, {
         id: generateId(),
         level: addLevel,
         text: addText.trim(),
         inputType: addInputType,
         value: ''
      }]);
      setShowAddForm(false);
  };

  const { numberedItems, nextMainNumber } = React.useMemo(() => {
      let m = 3;
      let s = 0;
      let ss = 0;
      
      const numbered = [];
      for (const item of items) {
          let dNum = '';
          if (item.level === 1) {
             m++; s = 0; ss = 0;
             dNum = `${m}.`;
          } else if (item.level === 2) {
             s++; ss = 0;
             dNum = `${roman[(s - 1) % roman.length]}.`;
          } else if (item.level === 3) {
             ss++;
             dNum = `${alpha[(ss - 1) % alpha.length]})`;
          }
          numbered.push({ ...item, displayNum: dNum });
      }
      return { numberedItems: numbered, nextMainNumber: m + 1 };
  }, [items]);



  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-sm flex flex-col max-w-4xl mx-auto w-full">
      
      <div className="bg-indigo-600 dark:bg-indigo-900 p-6 text-white text-center border-b-4 border-indigo-700">
        <h2 className="text-2xl font-bold tracking-widest uppercase">Audit Check List</h2>
        <p className="text-indigo-200 mt-2 text-sm font-medium">All Auditors must complete this check list before concluding the audit process</p>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Sections 1-3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase">1. Name of Institution</label>
            <input type="text" value={unitName || ''} readOnly className="mt-1 bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none pb-1" />
          </div>
          <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-4">
            <label className="text-xs font-bold text-slate-500 uppercase">2. Audit Period</label>
            <input type="text" value={financialYear || ''} readOnly className="mt-1 bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none pb-1" />
          </div>
          <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-4">
            <label className="text-xs font-bold text-slate-500 uppercase">3. Auditor</label>
            <input type="text" value={auditorName || ''} readOnly className="mt-1 bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none pb-1" />
          </div>
        </div>

        {/* DYNAMIC SECTION (4+) */}
        <div className="bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={numberedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {numberedItems.map(item => (
                <SortableChecklistRow 
                   key={item.id} 
                   item={item} 
                   displayNum={item.displayNum}
                   onChange={handleItemChange}
                   onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex space-x-3">
             <button onClick={() => openAddForm(1)} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 text-xs font-bold rounded flex items-center space-x-1 hover:bg-indigo-200 transition-colors">
                <Plus size={14} /> <span>Add Main Checklist</span>
             </button>
             <button onClick={() => openAddForm(2)} className="px-3 py-1.5 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs font-bold rounded flex items-center space-x-1 hover:bg-slate-300 transition-colors">
                <Plus size={14} /> <span>Add Sub Checklist</span>
             </button>
             <button onClick={() => openAddForm(3)} className="px-3 py-1.5 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs font-bold rounded flex items-center space-x-1 hover:bg-slate-300 transition-colors">
                <Plus size={14} /> <span>Add Sub-Sub</span>
             </button>
            </div>
            
            {showAddForm && (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-800 animate-in fade-in slide-in-from-top-2">
                <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">
                  {addLevel === 1 ? 'Main' : addLevel === 2 ? 'Sub' : 'Sub-Sub'}
                </span>
                <input 
                  type="text" 
                  value={addText} 
                  onChange={e => setAddText(e.target.value)}
                  placeholder="Enter checklist item text..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <select 
                  value={addInputType} 
                  onChange={e => setAddInputType(e.target.value as InputType)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="toggle">Yes/No/NA</option>
                  <option value="date">Date</option>
                  <option value="remarks">Remarks</option>
                  <option value="number">Number</option>
                </select>
                <button onClick={confirmAddItem} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors">Add</button>
                <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs font-bold rounded hover:bg-slate-300 transition-colors">Cancel</button>
              </div>
            )}
          </div>
        </div>

        {/* STATIC FOOTER SECTIONS */}
        <div className="bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          
          <div className="flex justify-between items-center p-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-xl">{nextMainNumber}. Have you discussed the Financial position (Balance Sheet) with the concern authority and their view obtained.</span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit border border-slate-200 dark:border-slate-700">
               <button onClick={() => setFormData(p => ({...p, q5: 'Yes'}))} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.q5 === 'Yes' ? 'bg-white dark:bg-slate-700 text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Yes</button>
               <button onClick={() => setFormData(p => ({...p, q5: 'No'}))} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.q5 === 'No' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>No</button>
               <button onClick={() => setFormData(p => ({...p, q5: 'N/A'}))} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.q5 === 'N/A' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>N/A</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-xl">{nextMainNumber+1}. Have you discussed the Draft Audit report with the concern authority and their view obtained</span>
            <div className="flex items-center space-x-4">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit border border-slate-200 dark:border-slate-700">
                 <button onClick={() => setFormData(p => ({...p, q6_status: 'Yes'}))} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.q6_status === 'Yes' ? 'bg-white dark:bg-slate-700 text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Yes</button>
                 <button onClick={() => setFormData(p => ({...p, q6_status: 'No'}))} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.q6_status === 'No' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>No</button>
                 <button onClick={() => setFormData(p => ({...p, q6_status: 'N/A'}))} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.q6_status === 'N/A' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>N/A</button>
              </div>
              {formData.q6_status === 'Yes' && (
                <input type="date" value={formData.q6_date} onChange={e => setFormData(p => ({...p, q6_date: e.target.value}))} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="flex justify-between items-center p-4 border-r border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{nextMainNumber+2}. When did You commenced the audit</span>
              <input type="date" value={auditTotals?.startDate || ''} readOnly className="bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none cursor-not-allowed" />
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{nextMainNumber+3}. When did you concluded the audit</span>
              <input type="date" value={auditTotals?.endDate || ''} readOnly className="bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none cursor-not-allowed" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="flex justify-between items-center p-4 border-r border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{nextMainNumber+4}. Total Number of days</span>
              <input type="number" value={auditTotals?.totalCalendarDays || 0} readOnly className="bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm w-20 text-center font-bold focus:outline-none cursor-not-allowed" />
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{nextMainNumber+5}. Actual Number of Working days</span>
              <input type="number" value={auditTotals?.actualWorkingDays || 0} readOnly className="bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm w-20 text-center font-bold focus:outline-none cursor-not-allowed" />
            </div>
          </div>

          <div className="flex flex-col p-4 space-y-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{nextMainNumber+6}. Do you have any suggestion for the next audit. If yes, state you suggestions in your register.</span>
            <input type="text" value={formData.q11} onChange={e => setFormData(p => ({...p, q11: e.target.value}))} placeholder="Type suggestions or 'No'..." className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

        </div>
      </div>
    </div>
  );
});

export default ChecklistGrid;

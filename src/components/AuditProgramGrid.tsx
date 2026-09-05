"use client";
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Minus, GripHorizontal, Trash2 } from 'lucide-react';
import { addDays, isSaturday, isSunday, getDate, format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi'];

export type SubProcedure = {
  id: string;
  is_main: boolean;
  procedure_name: string;
  approximate_days: number;
  actual_days: number;
  manual_leave_days: number;
  start_date: string; 
  end_date: string;   
  auto_nw_days: number;
  auto_remarks: string;
  user_remarks: string;
};

export type MainProcedure = SubProcedure & {
  subs: SubProcedure[];
};

type AuditTotals = {
  startDate: string;
  endDate: string;
  totalCalendarDays: number;
  actualWorkingDays: number;
};

// Date Calculation Helpers
function isFirstSaturday(date: Date) {
  return isSaturday(date) && getDate(date) <= 7;
}

function getBaseCapacity(d: Date) {
  if (isSunday(d)) return 0;
  if (isSaturday(d)) {
      if (isFirstSaturday(d)) return 0.5;
      return 0;
  }
  return 1.0;
}

type CascadeState = {
  date: Date;
  fraction: number;
};

function calculateRowDates(state: CascadeState, actualDays: number, manualLeaveDays: number = 0) {
  if (!isValid(state.date) || actualDays <= 0) {
      return { result: { startDate: '', endDate: '', autoNwDays: 0, autoRemarks: '' }, nextState: state };
  }
  
  let remainingDuration = Number(actualDays);
  if (remainingDuration < 0) remainingDuration = 0;
  
  let tempDate = new Date(state.date.getTime());
  let currentFraction = state.fraction;
  
  let autoNwDays = 0;
  let weekendHits: {type: string, count: number}[] = [];
  
  const recordHoliday = (d: Date) => {
      const cap = getBaseCapacity(d);
      if (cap < 1.0) {
          const holValue = cap === 0 ? 1 : 0.5;
          autoNwDays += holValue;
          const dayName = isSunday(d) ? 'Sun' : 'Sat';
          const existing = weekendHits.find(h => h.type === dayName);
          if (existing) existing.count += holValue;
          else weekendHits.push({ type: dayName, count: holValue });
      }
  };

  const rowStartDate = format(tempDate, 'yyyy-MM-dd');
  
  if (currentFraction === 0 && getBaseCapacity(tempDate) < 1.0) {
      recordHoliday(tempDate);
  }
  
  while (remainingDuration > 0) {
      const availableToday = 1.0 - currentFraction;
      
      if (remainingDuration <= availableToday) {
          currentFraction += remainingDuration;
          remainingDuration = 0;
      } else {
          remainingDuration -= availableToday;
          currentFraction = 0;
          tempDate = addDays(tempDate, 1);
          if (getBaseCapacity(tempDate) < 1.0) {
              recordHoliday(tempDate);
          }
      }
  }
  
  const rowEndDate = format(tempDate, 'yyyy-MM-dd');
  
  let nextDate = new Date(tempDate.getTime());
  let nextFraction = currentFraction;
  
  if (currentFraction >= 1.0) {
      nextDate = addDays(tempDate, 1);
      nextFraction = 0;
  }
  
  const remarkMap = new Map<string, number>();
  weekendHits.forEach(h => {
      remarkMap.set(h.type, (remarkMap.get(h.type) || 0) + h.count);
  });
  
  let autoRemarks = Array.from(remarkMap.entries()).map(([type, count]) => `${count} ${type}`).join(', ');
  
  return { 
      result: { startDate: rowStartDate, endDate: rowEndDate, autoNwDays, autoRemarks },
      nextState: { date: nextDate, fraction: nextFraction }
  };
}

const initialData: MainProcedure[] = [
  { id: 'm1', is_main: true, procedure_name: 'Entry Conference:', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm1-s1', is_main: false, procedure_name: 'Review of past audit report', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm1-s2', is_main: false, procedure_name: 'Units Reply', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm1-s3', is_main: false, procedure_name: 'PAC report', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm2', is_main: true, procedure_name: 'Study the legal status of the institution', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm2-s1', is_main: false, procedure_name: 'Annual Reports if any, Bye Law, Affiliation Certificates, Rules and Regulations, Minutes Books of Board & General Body, Co-operative Acts & Rules/Bye Laws & Amendment if any, Memorandum & Articles of Association, Board Resolution', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm3', is_main: true, procedure_name: 'Familiarization with the structure & Functioning of Institute', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [] },
  { id: 'm4', is_main: true, procedure_name: 'Financial Statement Preparation & Comparative study', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm4-s1', is_main: false, procedure_name: 'Preparation Financial Statement', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm4-s2', is_main: false, procedure_name: 'comparative studies in Financial Statement', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm5', is_main: true, procedure_name: 'Scanning', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm5-s1', is_main: false, procedure_name: 'General ledger, debtor, creditors, stocks & other', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm5-s2', is_main: false, procedure_name: 'Physical inspection', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm5-s3', is_main: false, procedure_name: 'Cash, investment, fixed asset, fixed deposit', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm5-s4', is_main: false, procedure_name: 'Scrutiny of Final Accounts', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm6', is_main: true, procedure_name: 'Vouching', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm6-s1', is_main: false, procedure_name: 'Administrative Expenses', approximate_days: 3, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm6-s2', is_main: false, procedure_name: 'Projects', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm6-s3', is_main: false, procedure_name: 'Sundry Creditors & Sundry Debtors', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm7', is_main: true, procedure_name: 'Purchase Audit', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm7-s1', is_main: false, procedure_name: 'Quotation are invited for purchases exceeding RS. 20,000.00/Quotation study', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm7-s2', is_main: false, procedure_name: 'Checking of quality/quantity for all the purchases', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm7-s3', is_main: false, procedure_name: 'Study of title deeds, sale deed, mutation papers in case of immovable property', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm8', is_main: true, procedure_name: 'Salary & Allowances', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm8-s1', is_main: false, procedure_name: 'Pay structure and pay scale, according to the post.', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm8-s2', is_main: false, procedure_name: 'Studying fresh appointment as per sanctioned post.', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm8-s3', is_main: false, procedure_name: 'Necessary deductions from salary as per rules & orders.', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm8-s4', is_main: false, procedure_name: 'Study of salary sheet/register', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm9', is_main: true, procedure_name: 'Construction and Contract Audit', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm9-s1', is_main: false, procedure_name: 'Examination of estimates & plan', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm9-s2', is_main: false, procedure_name: 'Audit of Contract documents', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm9-s3', is_main: false, procedure_name: 'Audit of execution of contract', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm9-s4', is_main: false, procedure_name: 'Audit of payments of contract\'s bill', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm10', is_main: true, procedure_name: 'Stocks & Store Audit', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm10-s1', is_main: false, procedure_name: 'Quotation for bulk purchases', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm10-s2', is_main: false, procedure_name: 'Checking of opening stock carried correctly along with rates', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm10-s3', is_main: false, procedure_name: 'Purchase booked as & when received', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm10-s4', is_main: false, procedure_name: 'Issues/sales booked as & when takes place', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm10-s5', is_main: false, procedure_name: 'Comparison with the physical verification', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm10-s6', is_main: false, procedure_name: 'Closing Stock valuation & total checking', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm10-s7', is_main: false, procedure_name: 'Checking of obsolete & damaged stock', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm11', is_main: true, procedure_name: 'Receipt Audit', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm11-s1', is_main: false, procedure_name: 'Check of Booklet and sub booklets', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm11-s2', is_main: false, procedure_name: 'Checking of other receipt', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm12', is_main: true, procedure_name: 'Cash Book & Bank Account Audit', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm12-s1', is_main: false, procedure_name: 'Checking of untick in cash book at the end of audit', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm12-s2', is_main: false, procedure_name: 'Balance confirmation & Bank reconciliation', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm12-s3', is_main: false, procedure_name: 'Arithmetic Accuracy of Account books (Check posting, balancing of cash book, etc.)', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm12-s4', is_main: false, procedure_name: 'Fixed Deposit calculation', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm13', is_main: true, procedure_name: 'Audit Report', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm13-s1', is_main: false, procedure_name: 'Prepare draft audit report', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm13-s2', is_main: false, procedure_name: 'Prepare final audit report', approximate_days: 2, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm13-s3', is_main: false, procedure_name: 'Budget Comparison with Actual Expenses', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm13-s4', is_main: false, procedure_name: 'Prepare Balance Sheet', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
      { id: 'm13-s5', is_main: false, procedure_name: 'Submission of Financial Statement and Report', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
  { id: 'm14', is_main: true, procedure_name: 'Exit Conference', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [
      { id: 'm14-s1', is_main: false, procedure_name: 'Report Presentation', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' },
  ]},
];

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice();
  newArray.splice(to < 0 ? newArray.length + to : to, 0, newArray.splice(from, 1)[0]);
  return newArray;
}

// ---------------------------
// Sortable Row Component
// ---------------------------
const SortableRow = ({ item, isMain, updateData, addLeave, deleteItem, totalAllocatedGlobalDays, globalCalendarDays, parentId, indexText }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id, data: { type: isMain ? 'main' : 'sub', parentId } });
  const style = { transform: CSS.Transform.toString(transform), transition };
  
  const [localVal, setLocalVal] = useState<any>({});
  useEffect(() => {
    setLocalVal({
      procedure_name: item.procedure_name,
      approximate_days: item.approximate_days,
      actual_days: item.actual_days,
      user_remarks: item.user_remarks
    });
  }, [item]);

  const handleChange = (field: string, val: string | number) => {
    setLocalVal((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleBlur = (field: string) => {
    if (localVal[field] !== item[field]) {
      updateData(item.id, field, localVal[field]);
    }
  };

  const actualDaysHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newVal: string | number = e.target.value;
    const numericVal = Number(newVal);
    if (numericVal < 0) {
        newVal = 0;
    } else {
        const currentActual = Number(item.actual_days) || 0;
        const remaining = totalAllocatedGlobalDays - globalCalendarDays;
        const maxAllowed = currentActual + Math.max(0, remaining);
        if (numericVal > maxAllowed) {
           newVal = maxAllowed;
        }
    }
    handleChange('actual_days', newVal);
  };

  const actualDaysDisabled = (totalAllocatedGlobalDays - globalCalendarDays) <= 0 && (Number(item.actual_days) || 0) === 0;

  return (
    <div ref={setNodeRef} style={style} className={`grid grid-cols-[auto_1fr_80px_80px_110px_110px_90px_180px_30px] gap-2 items-center p-2 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${isMain ? 'bg-slate-50 dark:bg-slate-800/40' : 'pl-8'}`}>
      
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-indigo-500 px-1">
         <GripHorizontal size={18} />
      </div>

      {/* Procedure Name */}
      <div className="flex items-center space-x-2">
         {indexText && (
             <span className={`min-w-[1.5rem] font-medium ${isMain ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {indexText}
             </span>
         )}
         <input 
           type="text" 
           value={localVal.procedure_name || ''} 
           onChange={e => handleChange('procedure_name', e.target.value)}
           onBlur={() => handleBlur('procedure_name')}
           className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded px-2 py-1 focus:outline-none transition-colors ${isMain ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
         />
      </div>

      {/* Approx Days */}
      {isMain ? (
          <div className="w-14"></div>
      ) : (
          <input type="number" step="0.5" value={localVal.approximate_days === 0 ? '' : localVal.approximate_days} onChange={e => handleChange('approximate_days', Math.max(0, Number(e.target.value)))} onBlur={() => handleBlur('approximate_days')} className="w-14 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded px-1 py-1 text-sm focus:outline-none" />
      )}
      
      {/* Actual Days */}
      {isMain ? (
          <div className="w-14"></div>
      ) : (
          <input type="number" step="0.5" value={localVal.actual_days === 0 ? '' : localVal.actual_days} onChange={actualDaysHandler} onBlur={() => handleBlur('actual_days')} disabled={actualDaysDisabled} className={`w-14 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded px-1 py-1 text-sm focus:outline-none ${actualDaysDisabled ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-700/50' : ''}`} />
      )}

      {/* Start Date */}
      <div className="text-xs text-slate-500 px-2 min-w-[90px]">{item.start_date ? format(parseISO(item.start_date), 'dd MMM yyyy') : '-'}</div>

      {/* End Date */}
      <div className="text-xs text-slate-500 px-2 min-w-[90px]">{item.end_date ? format(parseISO(item.end_date), 'dd MMM yyyy') : '-'}</div>

      {/* Non Working */}
      <div className="flex items-center space-x-1">
         <span className="font-semibold text-amber-600 dark:text-amber-400 w-6 text-center text-sm">{item.auto_nw_days + item.manual_leave_days || 0}</span>
         {(!isMain || (isMain && (!item.subs || item.subs.length === 0))) && (
           <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
             <button onClick={() => addLeave(item.id, 0.5)} className="px-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-t text-slate-500"><Plus size={10} /></button>
             <button onClick={() => addLeave(item.id, -0.5)} className="px-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-b text-slate-500"><Minus size={10} /></button>
           </div>
         )}
      </div>

      {/* Remarks */}
      <div className="flex flex-col space-y-1">
         {item.auto_remarks && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1 py-0.5 rounded self-start">{item.auto_remarks}</span>}
         <input type="text" placeholder="Remarks..." value={localVal.user_remarks || ''} onChange={e => handleChange('user_remarks', e.target.value)} onBlur={() => handleBlur('user_remarks')} className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded px-2 py-1 focus:outline-none" />
      </div>

      {/* Delete Action */}
      <div className="flex justify-center">
        <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors p-1" title="Delete">
           <Trash2 size={16} />
        </button>
      </div>

    </div>
  );
};


// ---------------------------
// Main Component
// ---------------------------
const AuditProgramGrid = React.forwardRef(({ isSubmitted, isStartDateDisabled, isEndDateDisabled, minEndDate, onEndDateExtended, loadedTotals, onTotalsCalculated, loadedData, onDataChange, onProceed, onResetProject }: { isSubmitted?: boolean, isStartDateDisabled?: boolean, isEndDateDisabled?: boolean, minEndDate?: string, onEndDateExtended?: () => void, loadedTotals?: any, onTotalsCalculated?: (t: AuditTotals) => void, loadedData?: any, onDataChange?: (data: MainProcedure[]) => void, onProceed?: () => void, onResetProject?: () => void }, ref) => {
  const [globalStartDate, setGlobalStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [globalEndDate, setGlobalEndDate] = useState(() => format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  
  let totalAllocatedGlobalDays = 0;
  if (isValid(parseISO(globalStartDate)) && isValid(parseISO(globalEndDate))) {
    totalAllocatedGlobalDays = differenceInCalendarDays(parseISO(globalEndDate), parseISO(globalStartDate)) + 1;
  }

  const [data, setData] = useState<MainProcedure[]>(initialData);

  React.useImperativeHandle(ref, () => ({
      getData: () => data
  }), [data]);

  
  useEffect(() => {
      if(loadedTotals) {
          if (loadedTotals.startDate) setGlobalStartDate(loadedTotals.startDate);
          if (loadedTotals.endDate) setGlobalEndDate(loadedTotals.endDate);
      }
  }, [loadedTotals]);

  useEffect(() => {
      if(loadedData && Array.isArray(loadedData)) {
          setData(loadedData);
      }
  }, [loadedData]);

  useEffect(() => {
      if (onDataChange) {
          onDataChange(data);
      }
  }, [data, onDataChange]);

  // CASCADING DATE EFFECT
  useEffect(() => {
    let currentState: CascadeState = {
      date: parseISO(globalStartDate),
      fraction: 0
    };
    
    let isDifferent = false;

    const recalculatedData = data.map((main) => {
      let mainHasChanged = false;
      
      const newMain = { ...main };
      if (!main.subs || main.subs.length === 0) {
            if (!isValid(currentState.date) || main.actual_days === 0) {
                if (newMain.start_date !== '' || newMain.end_date !== '') {
                    newMain.start_date = ''; newMain.end_date = ''; newMain.auto_nw_days = 0; newMain.auto_remarks = '';
                    mainHasChanged = true;
                }
                if ((newMain.manual_leave_days || 0) !== 0) {
                    newMain.manual_leave_days = 0;
                    mainHasChanged = true;
                }
            } else {
                let clonedState = { date: new Date(currentState.date.getTime()), fraction: currentState.fraction };
                let { result, nextState } = calculateRowDates(clonedState, main.actual_days, newMain.manual_leave_days);
                
                let totalHoliday = result.autoNwDays + (newMain.manual_leave_days || 0);
                let correctedManual = newMain.manual_leave_days || 0;
                let neededCorrection = false;
                
                if (totalHoliday < 0) {
                    correctedManual = -result.autoNwDays;
                    neededCorrection = true;
                } else if (totalHoliday > main.actual_days) {
                    correctedManual = main.actual_days - result.autoNwDays;
                    neededCorrection = true;
                }
                
                if (neededCorrection) {
                    clonedState = { date: new Date(currentState.date.getTime()), fraction: currentState.fraction };
                    const correctedCalc = calculateRowDates(clonedState, main.actual_days, correctedManual);
                    result = correctedCalc.result;
                    nextState = correctedCalc.nextState;
                    newMain.manual_leave_days = correctedManual;
                    mainHasChanged = true;
                }

                if (newMain.start_date !== result.startDate || newMain.end_date !== result.endDate) {
                    newMain.start_date = result.startDate; newMain.end_date = result.endDate;
                    newMain.auto_nw_days = result.autoNwDays; newMain.auto_remarks = result.autoRemarks;
                    mainHasChanged = true;
                }
                currentState = nextState;
            }
      } else {
          let firstChildStart = '';
          let lastChildEnd = '';
          let totalAutoNw = 0;
          let allRemarks: string[] = [];

          const newSubs = main.subs.map(sub => {
                const newSub = { ...sub };
                if (!isValid(currentState.date) || newSub.actual_days === 0) {
                    if (newSub.start_date !== '') isDifferent = true;
                    if ((newSub.manual_leave_days || 0) !== 0) {
                        newSub.manual_leave_days = 0;
                        isDifferent = true;
                    }
                    return { ...newSub, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '' };
                }
                let clonedState = { date: new Date(currentState.date.getTime()), fraction: currentState.fraction };
                let { result, nextState } = calculateRowDates(clonedState, newSub.actual_days, newSub.manual_leave_days);
                
                let totalHoliday = result.autoNwDays + (newSub.manual_leave_days || 0);
                let correctedManual = newSub.manual_leave_days || 0;
                let neededCorrection = false;
                
                if (totalHoliday < 0) {
                    correctedManual = -result.autoNwDays;
                    neededCorrection = true;
                } else if (totalHoliday > newSub.actual_days) {
                    correctedManual = newSub.actual_days - result.autoNwDays;
                    neededCorrection = true;
                }
                
                if (neededCorrection) {
                    clonedState = { date: new Date(currentState.date.getTime()), fraction: currentState.fraction };
                    const correctedCalc = calculateRowDates(clonedState, newSub.actual_days, correctedManual);
                    result = correctedCalc.result;
                    nextState = correctedCalc.nextState;
                    newSub.manual_leave_days = correctedManual;
                    isDifferent = true;
                }
                
                if (!firstChildStart) firstChildStart = result.startDate;
                lastChildEnd = result.endDate;
                totalAutoNw += result.autoNwDays;
                if (result.autoRemarks) allRemarks.push(result.autoRemarks);
                
                currentState = nextState;
                
                if (newSub.start_date !== result.startDate || newSub.end_date !== result.endDate) {
                    isDifferent = true;
                }
                
                return { ...newSub, start_date: result.startDate, end_date: result.endDate, auto_nw_days: result.autoNwDays, auto_remarks: result.autoRemarks };
          });

          newMain.subs = newSubs;
          if (newMain.start_date !== firstChildStart || newMain.end_date !== lastChildEnd) {
             newMain.start_date = firstChildStart;
             newMain.end_date = lastChildEnd;
             mainHasChanged = true;
          }
      }

      if (mainHasChanged) isDifferent = true;
      return newMain;
    });

    if (isDifferent) {
      setData(recalculatedData);
    }
  }, [data, globalStartDate]);

  const flatList = data.flatMap(m => [m, ...(m.subs || [])]);
  const isStandalone = (row: any) => !row.is_main || (row.is_main && (!row.subs || row.subs.length === 0));

  const totalApproximate = flatList.reduce((sum, row) => sum + (isStandalone(row) ? Number(row.approximate_days || 0) : 0), 0);
  const globalCalendarDays = flatList.reduce((sum, row) => sum + (isStandalone(row) ? Number(row.actual_days || 0) : 0), 0);
  const globalNwDays = flatList.reduce((sum, row) => sum + (isStandalone(row) ? Number(row.auto_nw_days || 0) : 0), 0);
  const totalManualLeave = flatList.reduce((sum, row) => sum + (isStandalone(row) ? Number(row.manual_leave_days || 0) : 0), 0);
  
  const actualWorkingDays = globalCalendarDays - globalNwDays - totalManualLeave;

  let computedEndDate = globalStartDate;
  for (let i = flatList.length - 1; i >= 0; i--) {
      if (flatList[i].end_date) {
          computedEndDate = flatList[i].end_date;
          break;
      }
  }

  useEffect(() => {
    if (onTotalsCalculated) {
      onTotalsCalculated({
        startDate: globalStartDate,
        endDate: globalEndDate,
        totalCalendarDays: globalCalendarDays,
        actualWorkingDays: actualWorkingDays
      });
    }
  }, [globalStartDate, globalEndDate, globalCalendarDays, actualWorkingDays, onTotalsCalculated]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'main' && overType === 'main') {
        setData((items) => {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
    } else if (activeType === 'sub' && overType === 'sub') {
        const activeParentId = active.data.current?.parentId;
        const overParentId = over.data.current?.parentId;
        if (activeParentId === overParentId) {
            setData((items) => items.map(main => {
                if (main.id === activeParentId) {
                    const oldIndex = main.subs.findIndex(i => i.id === active.id);
                    const newIndex = main.subs.findIndex(i => i.id === over.id);
                    return { ...main, subs: arrayMove(main.subs, oldIndex, newIndex) };
                }
                return main;
            }));
        }
    }
  };

  const updateData = (id: string, field: string, value: any) => {
      setData(prev => prev.map(main => {
          if (main.id === id) {
              return { ...main, [field]: value };
          }
          if (main.subs) {
              const subIdx = main.subs.findIndex(s => s.id === id);
              if (subIdx > -1) {
                  const newSubs = [...main.subs];
                  newSubs[subIdx] = { ...newSubs[subIdx], [field]: value };
                  return { ...main, subs: newSubs };
              }
          }
          return main;
      }));
  };

  const addLeave = (id: string, amount: number) => {
      setData(prev => prev.map(main => {
          if (main.id === id) {
              return { ...main, manual_leave_days: (main.manual_leave_days || 0) + amount };
          }
          if (main.subs) {
              const subIdx = main.subs.findIndex(s => s.id === id);
              if (subIdx > -1) {
                  const newSubs = [...main.subs];
                  newSubs[subIdx] = { ...newSubs[subIdx], manual_leave_days: (newSubs[subIdx].manual_leave_days || 0) + amount };
                  return { ...main, subs: newSubs };
              }
          }
          return main;
      }));
  };

  const deleteItem = (id: string) => {
      setData(prev => {
          const isMainItem = prev.find(p => p.id === id);
          if (isMainItem) {
              return prev.filter(p => p.id !== id);
          }
          return prev.map(main => ({
              ...main,
              subs: main.subs ? main.subs.filter((s: any) => s.id !== id) : []
          }));
      });
  };

  const addMainProcedure = () => {
      const newId = `m${Date.now()}`;
      setData(prev => [
          ...prev, 
          { id: newId, is_main: true, procedure_name: 'New Main Procedure', approximate_days: 0, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '', subs: [] }
      ]);
  };

  const addSubProcedure = (mainId: string) => {
      setData(prev => prev.map(main => {
          if (main.id === mainId) {
              const newSub: SubProcedure = { id: `${mainId}-s${Date.now()}`, is_main: false, procedure_name: 'New Sub Procedure', approximate_days: 1, actual_days: 0, manual_leave_days: 0, start_date: '', end_date: '', auto_nw_days: 0, auto_remarks: '', user_remarks: '' };
              return { ...main, subs: [...(main.subs || []), newSub] };
          }
          return main;
      }));
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[60vh]">
      <div className="p-5 border-b border-[var(--border)] flex flex-wrap justify-between items-center bg-white/40 dark:bg-slate-800/40 gap-4">
        <div className="flex flex-col space-y-2">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-3">
              Audit Program Grid
              {!isSubmitted && (
                <button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to load a new AP Grid? WARNING: This will overwrite your current Audit Program Grid progress!')) {
                      if (onResetProject) {
                         onResetProject();
                      } else {
                         setData(JSON.parse(JSON.stringify(initialData)));
                      }
                    }
                  }}
                  className="text-xs px-3 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-full font-bold transition-colors"
                >
                  Load new AP Grid
                </button>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Fill the &quot;Day Taken&quot; column &amp; procedure automatically calculate weekends. Drag using the handle to reorder.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-[var(--border)] shadow-sm">
           <div className="flex items-center space-x-2">
             <CalendarIcon size={16} className="text-indigo-500" />
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">Audit Start Date</span>
                <input 
                  type="date" 
                  value={globalStartDate}
                  disabled={isSubmitted || isStartDateDisabled}
                  onChange={(e) => setGlobalStartDate(e.target.value)}
                  className="text-sm font-medium bg-transparent outline-none focus:text-indigo-600"
                />
             </div>
           </div>
           
           <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
           
           <div className="flex items-center space-x-2">
             <CalendarIcon size={16} className="text-indigo-500" />
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">Audit End Date</span>
                <input 
                  type="date" 
                  value={globalEndDate}
                    min={minEndDate}
                    disabled={isSubmitted || isEndDateDisabled}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setGlobalEndDate(newDate);
                      if (minEndDate && newDate > minEndDate) {
                         if (onEndDateExtended) onEndDateExtended();
                      }
                    }}
                    className={`text-sm font-medium bg-transparent outline-none focus:text-indigo-600 ${(isSubmitted || isEndDateDisabled) ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
             </div>
           </div>

           <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

           <div className="flex flex-col items-center px-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">Total Allocated</span>
              <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400 leading-tight">{totalAllocatedGlobalDays}d</span>
           </div>
        </div>
      </div>
      
      <div className="overflow-auto flex-1 p-4">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[auto_1fr_80px_80px_110px_110px_90px_180px_30px] gap-2 items-center px-2 py-3 bg-slate-100 dark:bg-slate-800 rounded-t-lg font-semibold text-xs text-slate-600 dark:text-slate-300 uppercase tracking-wider shadow-sm sticky top-0 z-10">
            <div className="w-[26px]"></div>
            <div>Audit Procedure</div>
            <div className="text-center" title="Approximate Days Allocations by Audit Manager">Approx Day</div>
            <div className="text-center" title="Actual Days Required by Sub-Auditor">Day Taken</div>
            <div>Start Date</div>
            <div>End Date</div>
            <div className="text-center flex flex-col leading-tight"><span title="Non-Working Days">Leave/Holiday</span></div>
            <div>Remarks</div>
            <div></div>
          </div>
          
          {/* Body */}
          <div className="bg-white dark:bg-[var(--card)] flex flex-col">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
               <SortableContext items={data.map(m => m.id)} strategy={verticalListSortingStrategy}>
                  {data.map((main, mainIndex) => (
                     <div key={main.id} className="flex flex-col">
                        <SortableRow item={main} isMain={true} indexText={`${mainIndex + 1}.`} updateData={updateData} addLeave={addLeave} deleteItem={deleteItem} totalAllocatedGlobalDays={totalAllocatedGlobalDays} globalCalendarDays={globalCalendarDays} />
                        
                        {main.subs && main.subs.length > 0 && (
                            <SortableContext items={main.subs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                {main.subs.map((sub, subIndex) => (
                                    <SortableRow key={sub.id} item={sub} isMain={false} indexText={`${roman[subIndex % roman.length]}.`} updateData={updateData} addLeave={addLeave} deleteItem={deleteItem} totalAllocatedGlobalDays={totalAllocatedGlobalDays} globalCalendarDays={globalCalendarDays} parentId={main.id} />
                                ))}
                            </SortableContext>
                        )}
                        <div className="pl-10 py-1.5 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/10 flex items-center">
                            <button onClick={() => addSubProcedure(main.id)} className="text-[11px] font-medium text-indigo-500 hover:text-indigo-700 flex items-center px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                                <Plus size={12} className="mr-1"/> Add Sub Procedure
                            </button>
                        </div>
                     </div>
                  ))}
               </SortableContext>
            </DndContext>

            <div className="p-3 bg-slate-50/50 dark:bg-slate-800/20 flex justify-center">
                <button onClick={addMainProcedure} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center px-4 py-1.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
                    <Plus size={16} className="mr-2"/> Add New Main Procedure
                </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Calculation Box */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-6 text-sm">
           <div>
             <span className="text-slate-500">Total Approx Days:</span>
             <span className="ml-2 font-bold text-slate-800 dark:text-slate-200">{totalApproximate}</span>
           </div>
           <div>
             <span className="text-slate-500">Total Day Taken:</span>
             <span className="ml-2 font-bold text-indigo-600 dark:text-indigo-400">{globalCalendarDays}</span>
           </div>
           <div>
             <span className="text-slate-500">Total Holiday:</span>
             <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">{globalNwDays + totalManualLeave}</span>
           </div>
           <div className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
             <span className="text-indigo-800 dark:text-indigo-300 font-medium">Actual Working Days:</span>
             <span className="ml-2 font-bold text-lg text-indigo-700 dark:text-indigo-400">{actualWorkingDays}</span>
           </div>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => {
               if (globalCalendarDays !== totalAllocatedGlobalDays) {
                  alert("Please match the allocated day from start of audit program and end date or reduce the day from audit procedure.");
               } else {
                  if (onProceed) onProceed();
               }
            }}
            className="px-5 py-2 rounded-xl font-medium shadow-sm transition-all flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none cursor-pointer"
          >
            <span>Proceed to checklist</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default AuditProgramGrid;

"use client";

import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO, 
  isValid,
  isWithinInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

type MyCalendarProps = {
  data: any[];
};

export default function MyCalendar({ data }: MyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [prevData, setPrevData] = useState(data);

  if (data !== prevData) {
    setPrevData(data);
    let earliest: Date | null = null;
    
    const checkDate = (dStr: string) => {
      if (dStr) {
        const d = parseISO(dStr);
        if (isValid(d)) {
          if (!earliest || d < earliest) earliest = d;
        }
      }
    };

    data.forEach(main => {
      checkDate(main.start_date);
      if (main.subs) {
        main.subs.forEach((sub: any) => checkDate(sub.start_date));
      }
    });

    if (earliest) {
      setCurrentDate(startOfMonth(earliest));
    }
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(startOfMonth(new Date()));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Flatten events for easy checking
  const allEvents: any[] = [];
  data.forEach((main, idx) => {
    if (main.start_date && main.end_date) {
      allEvents.push({
        id: main.id,
        name: `${idx + 1}. ${main.procedure_name}`,
        start: parseISO(main.start_date),
        end: parseISO(main.end_date),
        color: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
      });
    }
    if (main.subs) {
      main.subs.forEach((sub: any, sIdx: number) => {
        if (sub.start_date && sub.end_date) {
          const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi'];
          allEvents.push({
            id: sub.id,
            name: `${roman[sIdx % roman.length]}. ${sub.procedure_name}`,
            start: parseISO(sub.start_date),
            end: parseISO(sub.end_date),
            color: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
          });
        }
      });
    }
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
      {/* Calendar Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <CalendarIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex space-x-2">
          <button onClick={today} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            Today
          </button>
          <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
            <button onClick={prevMonth} className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-r border-slate-200 dark:border-slate-700">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextMonth} className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto flex flex-col">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-auto">
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            
            // Find events for this day
            const dayEvents = allEvents.filter(ev => {
              if (isValid(ev.start) && isValid(ev.end)) {
                 return isWithinInterval(day, { start: ev.start, end: ev.end }) || isSameDay(day, ev.start) || isSameDay(day, ev.end);
              }
              return false;
            });

            return (
              <div 
                key={day.toISOString()} 
                className={`min-h-[120px] p-1 border-b border-r border-slate-100 dark:border-slate-800/50 flex flex-col ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-800/20 opacity-60' : 'bg-white dark:bg-slate-900'} ${idx % 7 === 0 ? 'border-l-0' : ''}`}
              >
                <div className="flex justify-between items-center mb-1 px-1">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-300'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col space-y-1 no-scrollbar p-1">
                  {dayEvents.map(ev => {
                    const isStart = isSameDay(day, ev.start);
                    const isEnd = isSameDay(day, ev.end);
                    return (
                      <div 
                        key={ev.id} 
                        className={`text-[10px] px-1.5 py-1 truncate border font-medium ${ev.color} ${isStart ? 'rounded-l-md' : 'border-l-0'} ${isEnd ? 'rounded-r-md' : 'border-r-0'}`}
                        title={ev.name}
                      >
                        {isStart ? ev.name : '\u00A0'}
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

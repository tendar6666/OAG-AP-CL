"use client";
import React, { useState, useEffect } from 'react';

type LogEntry = {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  time: string;
};

export default function FloatingLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const addLog = (type: LogEntry['type'], args: any[]) => {
      const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      setLogs(prev => [...prev, { type, message, time: new Date().toLocaleTimeString() }]);
    };

    console.log = (...args) => { addLog('log', args); originalLog(...args); };
    console.error = (...args) => { addLog('error', args); originalError(...args); };
    console.warn = (...args) => { addLog('warn', args); originalWarn(...args); };
    console.info = (...args) => { addLog('info', args); originalInfo(...args); };

    window.addEventListener('error', (e) => {
        console.error(`Global Error: ${e.message} at ${e.filename}:${e.lineno}`);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error(`Unhandled Promise: ${e.reason}`);
    });

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-black text-green-400 font-mono text-xs px-3 py-1.5 rounded opacity-50 hover:opacity-100 transition-opacity flex items-center space-x-2 border border-green-800"
      >
        <span>Open Dev Logs</span>
        {logs.length > 0 && <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[9px]">{logs.length}</span>}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 h-80 bg-black border border-green-800 rounded-lg shadow-2xl flex flex-col font-mono text-xs overflow-hidden">
      <div className="flex justify-between items-center bg-gray-900 px-3 py-2 border-b border-green-800">
        <span className="text-green-400 font-bold">Developer Logs</span>
        <div className="flex space-x-2">
           <button onClick={() => setLogs([])} className="text-gray-400 hover:text-white">Clear</button>
           <button onClick={() => setIsOpen(false)} className="text-red-400 hover:text-red-300 font-bold">X</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-black text-gray-300">
        {logs.map((log, i) => (
          <div key={i} className={`pb-1 border-b border-gray-800 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-green-400'}`}>
            <span className="text-gray-600 mr-2">[{log.time}]</span>
            {log.message}
          </div>
        ))}
        {logs.length === 0 && <div className="text-gray-600 italic">No logs yet... waiting for actions.</div>}
      </div>
    </div>
  );
}

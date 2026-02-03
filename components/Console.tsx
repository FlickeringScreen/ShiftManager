
import React, { useRef, useEffect } from 'react';

interface ConsoleProps {
    logs: string[];
    onClear: () => void;
}

export const Console: React.FC<ConsoleProps> = ({ logs, onClear }) => {
    const consoleEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="h-48 flex flex-col bg-gray-900 border-t-2 border-gray-700">
            <div className="flex-shrink-0 bg-gray-800 px-4 py-1 flex justify-between items-center border-b border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300">Console</h3>
                <button onClick={onClear} className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 px-2 py-0.5 rounded-md transition-colors">
                    Clear
                </button>
            </div>
            <div className="flex-grow p-2 overflow-y-auto text-xs font-mono">
                {logs.map((log, index) => (
                    <div key={index} className="text-gray-400 whitespace-pre-wrap">{log}</div>
                ))}
                <div ref={consoleEndRef} />
            </div>
        </div>
    );
};

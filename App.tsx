
import React, { useState, useCallback, useEffect } from 'react';
import { ShiftGenerator } from './components/ShiftGenerator';
import { AllowanceCalculator } from './components/AllowanceCalculator';
import { Header } from './components/Header';
import { Console } from './components/Console';
import { ReferenceTable } from './components/ReferenceTable';
import { SettingsPage } from './components/SettingsPage';
import type { ExtractedShift, FinancialData, CalculatedShift } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SHIFT_TIMES } from './constants';
import { useAllowanceCalculator } from './hooks/useAllowanceCalculator';

// FIX: Add type definitions for the PWA File Handling API to resolve TypeScript errors with `window.launchQueue`.
interface LaunchQueue {
    setConsumer: (consumer: (launchParams: LaunchParams) => void) => void;
}

interface LaunchParams {
    files: FileSystemFileHandle[];
}

declare global {
    interface Window {
        launchQueue?: LaunchQueue;
    }
}

export type Page = 'generator' | 'calculator' | 'reference' | 'settings';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('generator');
    const [financialData, setFinancialData] = useLocalStorage<FinancialData>('financialData', {
        primaLinea: 1000,
        contingenza: 500,
        edr: 37.73,
    });
    const [calculatedShifts, setCalculatedShifts] = useLocalStorage<CalculatedShift[]>('calculatedShifts', []);
    const [logs, setLogs] = useState<string[]>(['Console initialised.']);
    const { calculateAllowances } = useAllowanceCalculator(financialData);
    const [launchedPdfFile, setLaunchedPdfFile] = useState<File | null>(null);

    useEffect(() => {
        if ('launchQueue' in window && window.launchQueue) {
            window.launchQueue.setConsumer(async (launchParams) => {
                if (!launchParams.files || launchParams.files.length === 0) {
                    return;
                }
                addLog('File launch detected via PWA File Handling API.');
                const fileHandle = launchParams.files[0];
                const file = await fileHandle.getFile();
                setLaunchedPdfFile(file);
                // Navigate to the generator page if a file is opened
                setCurrentPage('generator'); 
            });
        }
    }, []);


    const addLog = useCallback((message: string, data?: any) => {
        const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
        let logEntry = `[${timestamp}] ${message}`;
        if (data) {
            try {
                const saneData = JSON.parse(JSON.stringify(data, (key, value) =>
                    typeof value === 'object' && value !== null && !Array.isArray(value) 
                        ? Object.fromEntries(Object.entries(value).slice(0, 10)) // Limit object properties to prevent huge logs
                        : value
                ));
                logEntry += ` ${JSON.stringify(saneData)}`;
            } catch (e) {
                logEntry += ` [Unserializable data]`;
            }
        }
        setLogs(prev => [...prev.slice(-100), logEntry]); // Keep last 100 logs
    }, []);

    const clearLogs = useCallback(() => {
        setLogs(['Console cleared.']);
    }, []);

    const handleShiftsExtracted = useCallback((shifts: ExtractedShift[]) => {
        const newCalculatedShifts = shifts
            .filter(s => !s.shiftCode.startsWith('Z') && SHIFT_TIMES[s.shiftCode] && s.shiftCode !== 'XXX')
            .map(s => {
                const [startTime, endTime] = SHIFT_TIMES[s.shiftCode] || ['00:00', '00:00'];
                const shift: Omit<CalculatedShift, 'allowances' | 'totalAllowance'> = {
                    id: `${s.date.toISOString()}-${s.shiftCode}`,
                    date: s.date.toISOString().split('T')[0],
                    shiftCode: s.shiftCode,
                    startTime,
                    endTime,
                    isOvertime: false,
                    hasMNS: s.hasMNS,
                };
                const { allowances, totalAllowance } = calculateAllowances(shift);
                return { ...shift, allowances, totalAllowance };
            });

        setCalculatedShifts(prevShifts => {
            const newShiftDates = new Set(newCalculatedShifts.map(s => s.date));
            const oldShiftsToKeep = prevShifts.filter(s => !newShiftDates.has(s.date));
            const finalShifts = [...oldShiftsToKeep, ...newCalculatedShifts];
            finalShifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return finalShifts;
        });

        setCurrentPage('calculator');
    }, [calculateAllowances, setCalculatedShifts]);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
            <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="p-4 sm:p-6 md:p-8 flex-grow">
                {currentPage === 'generator' && (
                    <ShiftGenerator 
                        onShiftsExtracted={handleShiftsExtracted} 
                        addLog={addLog}
                        initialFile={launchedPdfFile}
                        clearInitialFile={() => setLaunchedPdfFile(null)}
                    />
                )}
                {currentPage === 'calculator' && (
                    <AllowanceCalculator
                        financialData={financialData}
                        setFinancialData={setFinancialData}
                        calculatedShifts={calculatedShifts}
                        setCalculatedShifts={setCalculatedShifts}
                    />
                )}
                {currentPage === 'reference' && (
                    <ReferenceTable financialData={financialData} />
                )}
                {currentPage === 'settings' && (
                    <SettingsPage addLog={addLog} />
                )}
            </main>
            <Console logs={logs} onClear={clearLogs} />
        </div>
    );
};

export default App;

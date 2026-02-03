
import React, { useState, useMemo, useEffect } from 'react';
import type { FinancialData, CalculatedShift } from '../types';
import { useAllowanceCalculator } from '../hooks/useAllowanceCalculator';
import { SHIFT_TIMES } from '../constants';

// --- Helper Components ---

const EditShiftModal: React.FC<{
    shift: CalculatedShift | null;
    onClose: () => void;
    onSave: (updatedShift: CalculatedShift) => void;
}> = ({ shift, onClose, onSave }) => {
    const [editData, setEditData] = useState({ 
        shiftCode: '', 
        startTime: '', 
        endTime: '' 
    });

    useEffect(() => {
        if (shift) {
            setEditData({
                shiftCode: shift.shiftCode,
                startTime: shift.startTime,
                endTime: shift.endTime,
            });
        }
    }, [shift]);

    const handleShiftCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newShiftCode = e.target.value;
        const times = SHIFT_TIMES[newShiftCode] || ['00:00', '00:00'];
        setEditData({ shiftCode: newShiftCode, startTime: times[0], endTime: times[1] });
    };

    const handleSave = () => {
        if (shift) {
            onSave({ ...shift, ...editData });
        }
    };
    
    if (!shift) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-blue-300 mb-6">Modifica Turno</h3>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="shiftCode" className="block text-sm font-medium text-gray-300 mb-1">Codice Turno</label>
                         <select id="shiftCode" value={editData.shiftCode} onChange={handleShiftCodeChange} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                             {Object.keys(SHIFT_TIMES).filter(c => !c.startsWith('Z')).map(code => <option key={code} value={code}>{code}</option>)}
                         </select>
                    </div>
                    <div>
                        <label htmlFor="shiftStart" className="block text-sm font-medium text-gray-300 mb-1">Ora Inizio</label>
                        <input type="time" id="shiftStart" value={editData.startTime} onChange={e => setEditData(d => ({...d, startTime: e.target.value}))} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="shiftEnd" className="block text-sm font-medium text-gray-300 mb-1">Ora Fine</label>
                        <input type="time" id="shiftEnd" value={editData.endTime} onChange={e => setEditData(d => ({...d, endTime: e.target.value}))} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-500 transition-colors">Annulla</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">Salva Modifiche</button>
                </div>
            </div>
        </div>
    );
};


const AddOvertimeModal: React.FC<{
    isOpen: boolean;
    initialDate: string | null;
    defaultStartTime: string;
    onClose: () => void;
    onSave: (data: { date: string; startTime: string; endTime: string; }) => void;
}> = ({ isOpen, initialDate, defaultStartTime, onClose, onSave }) => {
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('00:00');
    const [endTime, setEndTime] = useState('00:00');

    useEffect(() => {
        if (isOpen) {
            setDate(initialDate || '');
            setStartTime(defaultStartTime || '00:00');
            setEndTime('00:00'); // Always reset end time
        }
    }, [isOpen, initialDate, defaultStartTime]);

    const handleSave = () => {
        if (!date || !startTime || !endTime) {
            alert('Per favore, compila tutti i campi.');
            return;
        }
        onSave({ date, startTime, endTime });
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-blue-300 mb-6">Aggiungi Straordinario</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="overtimeDate" className="block text-sm font-medium text-gray-300 mb-1">Data</label>
                        <input type="date" id="overtimeDate" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="overtimeStart" className="block text-sm font-medium text-gray-300 mb-1">Ora Inizio</label>
                        <input type="time" id="overtimeStart" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="overtimeEnd" className="block text-sm font-medium text-gray-300 mb-1">Ora Fine</label>
                        <input type="time" id="overtimeEnd" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-500 transition-colors">Annulla</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">Salva Straordinario</button>
                </div>
            </div>
        </div>
    );
};


interface ShiftRowProps {
    shift: CalculatedShift;
    onUpdate: (updatedShift: CalculatedShift) => void;
    onDelete: (id: string) => void;
    onToggleExpand: () => void;
}

const ShiftRow: React.FC<ShiftRowProps> = ({ shift, onUpdate, onDelete, onToggleExpand }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ 
        shiftCode: shift.shiftCode, 
        startTime: shift.startTime, 
        endTime: shift.endTime 
    });

    const handleShiftCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newShiftCode = e.target.value;
        const times = SHIFT_TIMES[newShiftCode] || ['00:00', '00:00'];
        setEditData({ shiftCode: newShiftCode, startTime: times[0], endTime: times[1] });
    };

    const handleSave = () => {
        onUpdate({ ...shift, ...editData });
        setIsEditing(false);
    };

    const displayDate = new Date(shift.date).toLocaleDateString('it-IT', { 
        timeZone: 'UTC', 
        weekday: 'short', 
        day: '2-digit', 
        month: '2-digit' 
    });

    if (isEditing && !shift.isOvertime) {
        return (
            <tr className="bg-gray-700/50">
                <td className="py-2 px-2 whitespace-nowrap text-sm font-medium text-white">{displayDate}</td>
                <td className="py-2 px-2">
                    <select value={editData.shiftCode} onChange={handleShiftCodeChange} className="bg-gray-800 border border-gray-600 rounded-md py-1 px-2 text-white w-full">
                        {Object.keys(SHIFT_TIMES).filter(c => !c.startsWith('Z')).map(code => <option key={code} value={code}>{code}</option>)}
                    </select>
                </td>
                <td className="py-2 px-2"><input type="time" value={editData.startTime} onChange={e => setEditData(d => ({ ...d, startTime: e.target.value }))} className="bg-gray-800 border border-gray-600 rounded-md py-1 px-2 text-white w-full" /></td>
                <td className="py-2 px-2"><input type="time" value={editData.endTime} onChange={e => setEditData(d => ({ ...d, endTime: e.target.value }))} className="bg-gray-800 border border-gray-600 rounded-md py-1 px-2 text-white w-full" /></td>
                <td className="py-2 px-2 text-sm font-semibold text-green-400 text-right">€{shift.totalAllowance.toFixed(2)}</td>
                <td className="py-2 px-2 whitespace-nowrap text-right text-sm">
                    <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="text-green-400 hover:text-green-300 font-semibold mr-3">Salva</button>
                    <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="text-gray-400 hover:text-gray-300">Annulla</button>
                </td>
            </tr>
        );
    }

    return (
         <tr className="hover:bg-gray-700/50 cursor-pointer" onClick={onToggleExpand}>
            <td className="py-3 px-2 whitespace-nowrap text-sm font-medium text-white">{displayDate}</td>
            <td className="py-3 px-2 text-sm text-gray-300 flex items-center">
                {shift.isOvertime ? `Straordinario` : shift.shiftCode}
                {shift.hasMNS && (
                    <span className="ml-2 text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full" title="Mancato Riposo Settimanale">MNS</span>
                )}
            </td>
            <td className="py-3 px-2 text-sm text-gray-300">{shift.isOvertime ? shift.startTime : shift.startTime}</td>
            <td className="py-3 px-2 text-sm text-gray-300">{shift.isOvertime ? shift.endTime : shift.endTime}</td>
            <td className="py-3 px-2 text-sm font-semibold text-green-400 text-right">€{shift.totalAllowance.toFixed(2)}</td>
            <td className="py-3 px-2 whitespace-nowrap text-right text-sm">
                 {!shift.isOvertime && <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="text-blue-400 hover:text-blue-300 font-semibold mr-3">Modifica</button>}
                <button onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }} className="text-red-500 hover:text-red-400">Rimuovi</button>
            </td>
        </tr>
    );
};


// --- Main Component ---

interface AllowanceCalculatorProps {
    financialData: FinancialData;
    setFinancialData: React.Dispatch<React.SetStateAction<FinancialData>>;
    calculatedShifts: CalculatedShift[];
    setCalculatedShifts: React.Dispatch<React.SetStateAction<CalculatedShift[]>>;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const AllowanceCalculator: React.FC<AllowanceCalculatorProps> = ({ financialData, setFinancialData, calculatedShifts, setCalculatedShifts }) => {
    const { calculateAllowances } = useAllowanceCalculator(financialData);
    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date();
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
    });
    const [view, setView] = useState<'month' | 'week' | 'summary'>('month');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [editingShift, setEditingShift] = useState<CalculatedShift | null>(null);

    const [modalState, setModalState] = useState({
        isOpen: false,
        initialDate: null as string | null,
        defaultStartTime: '00:00'
    });

    const updateAndRecalculateShift = (updatedShift: CalculatedShift) => {
        const { allowances, totalAllowance } = calculateAllowances(updatedShift);
        setCalculatedShifts(prev => prev.map(s => s.id === updatedShift.id ? { ...updatedShift, allowances, totalAllowance } : s));
        setEditingShift(null); // Close modal on save
    };

    const deleteShift = (id: string) => {
        setCalculatedShifts(prev => prev.filter(s => s.id !== id));
    };

    const handleFinancialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFinancialData(prev => ({ ...prev, [e.target.name]: parseFloat(e.target.value) || 0 }));
    };

    const shiftsByDate = useMemo(() => {
        const map = new Map<string, CalculatedShift[]>();
        calculatedShifts.forEach(shift => {
            const dateKey = shift.date;
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)?.push(shift);
        });
        return map;
    }, [calculatedShifts]);

    const handleOpenOvertimeModal = (date: string | null) => {
        let startTime = '00:00';
        if (date) {
            const dayShifts = shiftsByDate.get(date) || [];
            const regularShifts = dayShifts.filter(s => !s.isOvertime);
            if (regularShifts.length > 0) {
                const timeToMinutes = (timeStr: string) => {
                    const [h, m] = timeStr.split(':').map(Number);
                    return h * 60 + m;
                }
                startTime = regularShifts.reduce((latest, current) => {
                    return timeToMinutes(current.endTime) > timeToMinutes(latest) ? current.endTime : latest;
                }, '00:00');
            }
        }
        setModalState({ isOpen: true, initialDate: date, defaultStartTime: startTime });
    };

    const handleAddOvertime = (overtimeData: { date: string; startTime: string; endTime: string; }) => {
        const { date, startTime, endTime } = overtimeData;
        const startDate = new Date(`${date}T${startTime}:00.000Z`);
        const endDate = new Date(`${date}T${endTime}:00.000Z`);
    
        if (endDate <= startDate) {
            endDate.setUTCDate(endDate.getUTCDate() + 1);
        }
        const overtimeHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    
        const newShiftOmit = {
            id: `overtime-${Date.now()}`,
            date: date,
            shiftCode: 'STRAORD.',
            startTime,
            endTime,
            isOvertime: true,
            overtimeHours,
            hasMNS: false, 
        };
    
        const { allowances, totalAllowance } = calculateAllowances(newShiftOmit);
        
        const newShift: CalculatedShift = { ...newShiftOmit, allowances, totalAllowance };

        setCalculatedShifts(prev => {
            const updatedShifts = [...prev, newShift];
            updatedShifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return updatedShifts;
        });
    
        setModalState(s => ({...s, isOpen: false}));
    };

    const monthlyShifts = useMemo(() => calculatedShifts
        .filter(s => {
            const shiftDate = new Date(s.date); // This is UTC midnight
            return shiftDate.getUTCFullYear() === currentDate.getUTCFullYear() && shiftDate.getUTCMonth() === currentDate.getUTCMonth();
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [calculatedShifts, currentDate]);

    const monthlyTotal = useMemo(() => monthlyShifts.reduce((total, shift) => total + shift.totalAllowance, 0), [monthlyShifts]);

     const monthlySummary = useMemo(() => {
        const summary = new Map<string, { description: string; totalHours: number; totalValue: number, count: number }>();
        
        monthlyShifts.forEach(shift => {
            shift.allowances.forEach(allowance => {
                const key = allowance.code;
                const existing = summary.get(key) || { description: allowance.description, totalHours: 0, totalValue: 0, count: 0 };
                
                existing.totalHours += allowance.hours || 0;
                existing.totalValue += allowance.value;
                if (!allowance.hours) { // Count lump sum items
                    existing.count += 1;
                }
                
                summary.set(key, existing);
            });
        });
        
        return Array.from(summary.entries()).sort((a, b) => b[1].totalValue - a[1].totalValue);
    }, [monthlyShifts]);

    const changeMonth = (offset: number) => setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setUTCMonth(newDate.getUTCMonth() + offset);
        return newDate;
    });

    const monthGrid = useMemo(() => {
        const year = currentDate.getUTCFullYear();
        const month = currentDate.getUTCMonth();
        const firstDay = new Date(Date.UTC(year, month, 1));
        const lastDay = new Date(Date.UTC(year, month + 1, 0));
        const grid: (Date | null)[] = [];
        const startDayOfWeek = (firstDay.getUTCDay() + 6) % 7; // Monday is 0, Sunday is 6
        for (let i = 0; i < startDayOfWeek; i++) grid.push(null);
        for (let i = 1; i <= lastDay.getUTCDate(); i++) grid.push(new Date(Date.UTC(year, month, i)));
        const weeks: (Date | null)[][] = [];
        for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));
        return weeks;
    }, [currentDate]);

    return (
        <div className="max-w-7xl mx-auto">
             <AddOvertimeModal
                isOpen={modalState.isOpen}
                initialDate={modalState.initialDate}
                defaultStartTime={modalState.defaultStartTime}
                onClose={() => setModalState(s => ({ ...s, isOpen: false }))}
                onSave={handleAddOvertime}
            />
             <EditShiftModal
                shift={editingShift}
                onClose={() => setEditingShift(null)}
                onSave={updateAndRecalculateShift}
            />
            <h2 className="text-3xl font-bold text-center mb-6 text-blue-400">Calcolatore Mensile Maggiorazioni</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               {Object.entries({ primaLinea: 'Prima Linea', contingenza: 'Contingenza', edr: 'EDR' }).map(([key, label]) => (
                    <div key={key} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                       <label htmlFor={key} className="block text-sm font-medium text-gray-300">{label}</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                           <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center"><span className="text-gray-400 sm:text-sm">€</span></div>
                           <input type="number" name={key} id={key} value={financialData[key as keyof FinancialData]} onChange={handleFinancialChange} className="block w-full bg-gray-700 border-gray-600 rounded-md py-2 pl-7 pr-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                       </div>
                   </div>
               ))}
            </div>

            <div className="bg-gray-800 p-2 sm:p-6 rounded-xl shadow-2xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                    <h3 className="text-xl font-semibold text-blue-300 capitalize text-center">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h3>
                    <button onClick={() => changeMonth(1)} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                </div>
                
                <div className="flex justify-center mb-4 bg-gray-900 p-1 rounded-lg w-auto sm:w-min mx-auto">
                    <button onClick={() => setView('month')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${view === 'month' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Mese</button>
                    <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${view === 'week' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Elenco</button>
                    <button onClick={() => setView('summary')} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${view === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Riassunto</button>
                </div>

                {(view === 'week' || view === 'summary') && (
                    <div className="flex justify-end my-4">
                         <button onClick={() => handleOpenOvertimeModal(null)} className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                            Aggiungi Straordinario
                        </button>
                    </div>
                )}
                
                {view === 'month' && (
                    <>
                        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-400 text-xs mb-2">{WEEKDAYS.map(day => <div key={day}>{day}</div>)}</div>
                        <div className="grid grid-cols-7 gap-1">
                            {monthGrid.flat().map((day, i) => {
                                const dayShifts = day ? shiftsByDate.get(day.toISOString().split('T')[0]) : [];
                                return (
                                    <div key={i} className={`h-24 md:h-32 rounded-lg p-1 border group relative ${day ? 'bg-gray-700/50 border-gray-700' : 'bg-gray-800/50 border-transparent'}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="font-bold text-[10px] md:text-xs">{day?.getUTCDate()}</div>
                                            {day && (
                                                <button onClick={() => handleOpenOvertimeModal(day.toISOString().split('T')[0])} className="opacity-0 group-hover:opacity-100 transition-opacity bg-green-600 hover:bg-green-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-lg font-bold" aria-label="Aggiungi Straordinario">+</button>
                                            )}
                                        </div>
                                        <div className="space-y-1 mt-1 overflow-y-auto max-h-20 md:max-h-24">
                                            {dayShifts?.map(shift => (
                                                <div key={shift.id} className="text-[10px] md:text-xs bg-blue-900/70 rounded p-1 text-left relative">
                                                    <div className="font-bold truncate">{shift.isOvertime ? 'Straordinario' : shift.shiftCode}</div>
                                                    <div className="text-green-400 font-semibold">€{shift.totalAllowance.toFixed(2)}</div>
                                                    {shift.hasMNS && <div title="Mancato Riposo" className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border border-red-300"></div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                
                {view === 'week' && (
                     <>
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead>
                                    <tr>
                                        <th className="py-3 px-2 text-left text-xs font-semibold uppercase tracking-wider">Data</th>
                                        <th className="py-3 px-2 text-left text-xs font-semibold uppercase tracking-wider">Turno</th>
                                        <th className="py-3 px-2 text-left text-xs font-semibold uppercase tracking-wider">Inizio</th>
                                        <th className="py-3 px-2 text-left text-xs font-semibold uppercase tracking-wider">Fine</th>
                                        <th className="py-3 px-2 text-right text-xs font-semibold uppercase tracking-wider">Maggiorazione</th>
                                        <th className="py-3 px-2 text-right text-xs font-semibold uppercase tracking-wider">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {monthlyShifts.length > 0 ? monthlyShifts.map(shift => (
                                        <React.Fragment key={shift.id}>
                                            <ShiftRow 
                                                shift={shift} 
                                                onUpdate={updateAndRecalculateShift} 
                                                onDelete={deleteShift} 
                                                onToggleExpand={() => setExpandedRow(expandedRow === shift.id ? null : shift.id)}
                                            />
                                            {expandedRow === shift.id && (
                                               <tr className="bg-gray-900/50">
                                                   <td colSpan={6} className="p-0">
                                                       <div className="p-4 bg-gray-700/30">
                                                           <h4 className="font-semibold text-sm text-blue-300 mb-2">Dettaglio Maggiorazioni:</h4>
                                                           {shift.allowances.length > 0 ? (
                                                               <table className="min-w-full">
                                                                   <thead className="text-xs text-gray-400">
                                                                       <tr>
                                                                           <th className="text-left font-medium py-1 pr-3">Codice</th>
                                                                           <th className="text-left font-medium py-1 pr-3">Descrizione</th>
                                                                           <th className="text-right font-medium py-1 pr-3">Ore</th>
                                                                           <th className="text-right font-medium py-1 pr-3">Valore</th>
                                                                       </tr>
                                                                   </thead>
                                                                   <tbody>
                                                                   {shift.allowances.map((a, index) => (
                                                                       <tr key={`${a.code}-${index}`} className="border-t border-gray-700/50">
                                                                           <td className="py-2 pr-3 text-sm">{a.code}</td>
                                                                           <td className="py-2 pr-3 text-sm text-gray-300">{a.description}</td>
                                                                           <td className="py-2 pr-3 text-sm text-right">{a.hours?.toFixed(2) || 'N/A'}</td>
                                                                           <td className="py-2 pr-3 text-sm text-right text-green-400">€{a.value.toFixed(2)}</td>
                                                                       </tr>
                                                                   ))}
                                                                   </tbody>
                                                               </table>
                                                           ) : (
                                                               <p className="text-sm text-gray-400">Nessuna maggiorazione per questo turno.</p>
                                                           )}
                                                       </div>
                                                   </td>
                                               </tr>
                                            )}
                                        </React.Fragment>
                                    )) : (
                                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nessun turno per questo mese.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="space-y-3 md:hidden">
                            {monthlyShifts.length > 0 ? monthlyShifts.map(shift => (
                               <div key={shift.id} className="bg-gray-700/50 rounded-lg border-l-4 border-blue-500 p-3">
                                   <div className="flex justify-between items-start" onClick={() => setExpandedRow(expandedRow === shift.id ? null : shift.id)}>
                                        <div>
                                            <div className="font-bold text-blue-300">{new Date(shift.date).toLocaleDateString('it-IT', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: '2-digit' })}</div>
                                            <div className="text-sm">Turno: <span className="font-semibold">{shift.isOvertime ? 'Straordinario' : shift.shiftCode}</span> ({shift.startTime} - {shift.endTime})</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-green-400">€{shift.totalAllowance.toFixed(2)}</div>
                                        </div>
                                   </div>
                                   <div className="mt-2 flex items-center justify-end space-x-4">
                                       {!shift.isOvertime && <button onClick={(e) => { e.stopPropagation(); setEditingShift(shift); }} className="text-blue-400 hover:text-blue-300 font-semibold text-sm">Modifica</button>}
                                       <button onClick={(e) => { e.stopPropagation(); deleteShift(shift.id); }} className="text-red-500 hover:text-red-400 text-sm">Rimuovi</button>
                                   </div>

                                   {expandedRow === shift.id && (
                                       <div className="mt-3 pt-3 border-t border-gray-600">
                                            <h4 className="font-semibold text-sm text-blue-300 mb-2">Dettaglio Maggiorazioni:</h4>
                                            {shift.allowances.length > 0 ? (
                                                <div className="space-y-1 text-sm">
                                                {shift.allowances.map((a, index) => (
                                                     <div key={index} className="flex justify-between">
                                                        <span className="text-gray-300">{a.description} ({a.code})</span>
                                                        <span className="font-semibold text-green-400">€{a.value.toFixed(2)}</span>
                                                     </div>
                                                ))}
                                                </div>
                                            ) : <p className="text-sm text-gray-400">Nessuna maggiorazione.</p>}
                                       </div>
                                   )}
                               </div>
                            )) : <p className="text-center py-8 text-gray-400">Nessun turno per questo mese.</p>}
                        </div>
                    </>
                )}

                {view === 'summary' && (
                    <div className="overflow-x-auto">
                         <h3 className="text-lg font-semibold text-blue-300 mb-4">Riassunto Maggiorazioni</h3>
                         <div className="space-y-3">
                             {monthlySummary.length > 0 ? monthlySummary.map(([code, data]) => (
                                <div key={code} className="bg-gray-700/50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div className="font-semibold text-gray-200">{data.description} ({code})</div>
                                        <div className="font-bold text-lg text-green-400">€{data.totalValue.toFixed(2)}</div>
                                    </div>
                                    <div className="text-sm text-gray-400 mt-1">
                                         {data.totalHours > 0 ? `${data.totalHours.toFixed(2)} ore` : `${data.count} volte`}
                                    </div>
                                </div>
                             )) : <p className="text-center py-8 text-gray-400">Nessuna maggiorazione registrata per questo mese.</p>}
                         </div>
                    </div>
                )}
                
                 <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end items-center">
                     <div className="text-right">
                         <p className="text-gray-300">Totale Maggiorazioni per {currentDate.toLocaleString('it-IT', { month: 'long', timeZone: 'UTC' })}:</p>
                         <p className="text-3xl font-bold text-green-400">€{monthlyTotal.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

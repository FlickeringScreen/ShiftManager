
import React, { useState, useEffect } from 'react';
import type { ExtractedShift } from '../types';
import { usePdfParser } from '../hooks/usePdfParser';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SHIFT_TIMES, LOCATIONS, RIPOSO_NAMES } from '../constants';

interface ShiftGeneratorProps {
    onShiftsExtracted: (shifts: ExtractedShift[]) => void;
    addLog: (message: string, data?: any) => void;
    initialFile: File | null;
    clearInitialFile: () => void;
}

export const ShiftGenerator: React.FC<ShiftGeneratorProps> = ({ onShiftsExtracted, addLog, initialFile, clearInitialFile }) => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [firstName, setFirstName] = useLocalStorage('rai_firstName', '');
    const [lastName, setLastName] = useLocalStorage('rai_lastName', '');
    const [extractedSchedule, setExtractedSchedule] = useState<ExtractedShift[] | null>(null);
    const { parsePdf, isParsing, error } = usePdfParser(addLog);

    useEffect(() => {
        if (initialFile) {
            setPdfFile(initialFile);
            addLog('PDF file received from system open action.', { name: initialFile.name });
            // We clear it so it doesn't get set again on re-render
            clearInitialFile();
        }
    }, [initialFile, addLog, clearInitialFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPdfFile(e.target.files[0]);
            setExtractedSchedule(null); // Reset preview on new file
            addLog('File selected', { name: e.target.files[0].name });
        }
    };

    const handleExtract = async () => {
        if (!pdfFile || !firstName || !lastName) {
            alert('Per favore, compila tutti i campi.');
            addLog('Extraction failed: Missing required fields.');
            return;
        }
        try {
            const shifts = await parsePdf(pdfFile, firstName, lastName);
            setExtractedSchedule(shifts);
        } catch (err) {
            console.error(err);
            setExtractedSchedule(null);
        }
    };
    
    const handleGoToCalculator = () => {
        if (extractedSchedule) {
            onShiftsExtracted(extractedSchedule);
        }
    };

    const formatICSDate = (date: Date, time: string): string => {
        const [hours, minutes] = time.split(':');
        const eventDate = new Date(date);
        eventDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
        return eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const generateICS = () => {
        if (!extractedSchedule) return;
        let icsContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RAI Shift Calendar//EN'];

        extractedSchedule.forEach(shift => {
            if (RIPOSO_NAMES[shift.shiftCode] || shift.shiftCode === 'XXX') return;
            const times = SHIFT_TIMES[shift.shiftCode];
            if (!times) return;

            const startDate = new Date(shift.date);
            const endDate = new Date(shift.date);

            const [startH, startM] = times[0].split(':').map(Number);
            const [endH, endM] = times[1].split(':').map(Number);
            
            startDate.setUTCHours(startH, startM);
            endDate.setUTCHours(endH, endM);

            if (endDate <= startDate) {
                endDate.setUTCDate(endDate.getUTCDate() + 1);
            }
            
            const locationName = LOCATIONS[shift.location] || shift.location;
            
            icsContent.push('BEGIN:VEVENT');
            icsContent.push(`DTSTART:${startDate.toISOString().replace(/[-:.]/g, '').slice(0, -4)}Z`);
            icsContent.push(`DTEND:${endDate.toISOString().replace(/[-:.]/g, '').slice(0, -4)}Z`);
            icsContent.push(`SUMMARY:Turno ${shift.shiftCode} - ${locationName}`);
            icsContent.push(`LOCATION:${locationName}`);
            icsContent.push(`UID:${startDate.getTime()}${shift.shiftCode}@shifts.rai`);
            icsContent.push('END:VEVENT');
        });

        icsContent.push('END:VCALENDAR');
        return icsContent.join('\r\n');
    };

    const handleDownload = () => {
        addLog('Download button clicked.');
        const icsData = generateICS();
        if(!icsData) return;
        const blob = new Blob([icsData], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Turni_${firstName}_${lastName}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        addLog('ICS file download initiated.');
    };

    return (
        <div className="max-w-3xl mx-auto bg-gray-800 p-4 sm:p-8 rounded-xl shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-bold text-center mb-2 text-blue-400">Generatore Calendario Turni</h2>
            <p className="text-center text-gray-400 mb-8">Carica il PDF per estrarre i turni.</p>
            
            <div className="space-y-6">
                 <div>
                    <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-300 mb-1">PDF Orario</label>
                    <div className="mt-1 flex items-center space-x-2">
                        <input type="file" id="pdfFile" onChange={handleFileChange} accept=".pdf" className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition-colors"/>
                    </div>
                     {pdfFile && <p className="text-xs text-gray-400 mt-2">File selezionato: {pdfFile.name}</p>}
                </div>
                 <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-300">Cognome</label>
                    <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                 <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-300">Nome</label>
                    <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <button onClick={handleExtract} disabled={isParsing} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500 transition-all flex items-center justify-center">
                    {isParsing ? 'Elaborazione...' : 'Estrai Turni dal PDF'}
                </button>
            </div>

            {error && <p className="mt-4 text-red-400 text-center bg-red-900/30 p-3 rounded-md">{error}</p>}

            {extractedSchedule && (
                 <div className="mt-8 border-t-2 border-gray-700 pt-6">
                     <h3 className="text-xl font-semibold text-center text-blue-300 mb-4">✅ Turni Trovati:</h3>
                     <div className="space-y-2 max-h-96 overflow-y-auto p-2 bg-gray-900/50 rounded-lg">
                        {extractedSchedule.map(shift => {
                             const times = SHIFT_TIMES[shift.shiftCode];
                             const isRiposo = !!RIPOSO_NAMES[shift.shiftCode];
                             return (
                                 <div key={shift.date.toISOString()} className={`p-3 rounded-lg border-l-4 ${isRiposo ? 'bg-gray-700/50 border-green-500' : 'bg-gray-700 border-blue-500'}`}>
                                     <strong className="text-blue-300">{shift.date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: '2-digit' })}</strong>
                                     <div className="text-sm text-gray-300 mt-1">
                                        {isRiposo ? (
                                            <span className="font-semibold text-green-400">{RIPOSO_NAMES[shift.shiftCode]}</span>
                                        ) : (
                                            <>
                                                <span>Turno: <span className="font-bold">{shift.shiftCode}</span> ({times ? times.join(' - ') : 'N/D'})</span><br/>
                                                <span>Luogo: <span className="font-bold">{LOCATIONS[shift.location] || shift.location}</span></span>
                                            </>
                                        )}
                                     </div>
                                     <div className="flex flex-wrap gap-2 mt-2">
                                         {shift.hasMFS && <span className="text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full">Mancato Festivo</span>}
                                         {shift.hasMNS && <span className="text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full">Mancato Riposo</span>}
                                         {shift.hasFS && <span className="text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded-full">Fuori Sede</span>}
                                     </div>
                                 </div>
                             )
                         })}
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        <button onClick={handleDownload} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-700 transition-colors">
                            Scarica File .ics
                        </button>
                        <button onClick={handleGoToCalculator} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-md hover:bg-purple-700 transition-colors">
                            Vai al Calcolatore
                        </button>
                     </div>
                 </div>
            )}
        </div>
    );
};

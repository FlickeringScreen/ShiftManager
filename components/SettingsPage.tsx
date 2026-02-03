
import React, { useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { FinancialData, CalculatedShift } from '../types';

interface SettingsPageProps {
    addLog: (message: string, data?: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ addLog }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        try {
            const firstName = localStorage.getItem('rai_firstName') || '';
            const lastName = localStorage.getItem('rai_lastName') || '';
            const financialData = localStorage.getItem('financialData') || '{}';
            const calculatedShifts = localStorage.getItem('calculatedShifts') || '[]';

            const dataToExport = {
                firstName,
                lastName,
                financialData: JSON.parse(financialData),
                calculatedShifts: JSON.parse(calculatedShifts)
            };

            const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<raiShiftData version="1.0">
    <user>
        <firstName><![CDATA[${dataToExport.firstName}]]></firstName>
        <lastName><![CDATA[${dataToExport.lastName}]]></lastName>
    </user>
    <data>
        <financialData><![CDATA[${JSON.stringify(dataToExport.financialData)}]]></financialData>
        <calculatedShifts><![CDATA[${JSON.stringify(dataToExport.calculatedShifts)}]]></calculatedShifts>
    </data>
</raiShiftData>`;
            
            const blob = new Blob([xmlString], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rai_shifts_backup_${new Date().toISOString().split('T')[0]}.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addLog('Data exported successfully.');
            alert('Dati esportati con successo!');
        } catch (error) {
            console.error("Export failed:", error);
            addLog('Data export failed.', error);
            alert('Esportazione dei dati fallita.');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const xmlString = e.target?.result as string;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlString, "application/xml");
                
                const errorNode = xmlDoc.querySelector("parsererror");
                if (errorNode) {
                    throw new Error("File non valido o corrotto.");
                }

                const firstName = xmlDoc.querySelector('firstName')?.textContent || '';
                const lastName = xmlDoc.querySelector('lastName')?.textContent || '';
                const financialDataJSON = xmlDoc.querySelector('financialData')?.textContent || '{}';
                const calculatedShiftsJSON = xmlDoc.querySelector('calculatedShifts')?.textContent || '[]';

                // Basic validation
                JSON.parse(financialDataJSON);
                JSON.parse(calculatedShiftsJSON);

                localStorage.setItem('rai_firstName', firstName);
                localStorage.setItem('rai_lastName', lastName);
                localStorage.setItem('financialData', financialDataJSON);
                localStorage.setItem('calculatedShifts', calculatedShiftsJSON);
                
                addLog('Data imported successfully. App will now reload.');
                alert('Dati importati con successo! L\'applicazione verrà ricaricata.');
                
                window.location.reload();

            } catch (error) {
                 console.error("Import failed:", error);
                 addLog('Data import failed.', error);
                 alert(`Importazione fallita: ${error instanceof Error ? error.message : 'Errore sconosciuto.'}`);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-3xl mx-auto bg-gray-800 p-4 sm:p-8 rounded-xl shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-bold text-center mb-6 text-blue-400">Impostazioni</h2>
            <div className="space-y-6">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-blue-300">Esporta Dati</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Salva tutti i tuoi dati (turni, informazioni finanziarie, nome) in un file XML di backup.</p>
                    <button onClick={handleExport} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                        Esporta i Miei Dati
                    </button>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-blue-300">Importa Dati</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Carica un file XML di backup per ripristinare i tuoi dati. Attenzione: questo sovrascriverà tutti i dati attuali.</p>
                    <button onClick={handleImportClick} className="w-full sm:w-auto bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                        Importa da File
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xml" className="hidden" />
                </div>
            </div>
        </div>
    );
};

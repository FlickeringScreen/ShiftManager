
import React, { useRef } from 'react';

interface SettingsPageProps {
    addLog: (message: string, data?: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ addLog }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        try {
            const dataToExport: Record<string, any> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    dataToExport[key] = localStorage.getItem(key);
                }
            }
            
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shift_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
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
                const jsonString = e.target?.result as string;
                const importedData = JSON.parse(jsonString);

                // Clear existing local storage before import
                localStorage.clear();

                for (const key in importedData) {
                    if (Object.prototype.hasOwnProperty.call(importedData, key)) {
                        localStorage.setItem(key, importedData[key]);
                    }
                }
                
                addLog('Data imported successfully. App will now reload.');
                alert('Dati importati con successo! L\'applicazione verrà ricaricata.');
                
                window.location.reload();

            } catch (error) {
                 console.error("Import failed:", error);
                 addLog('Data import failed.', error);
                 alert(`Importazione fallita: ${error instanceof Error ? error.message : 'File non valido o corrotto.'}`);
            }
        };
        reader.readAsText(file);
    };

    const handleClearData = () => {
        if(window.confirm("Sei sicuro di voler cancellare tutti i dati? L'operazione è irreversibile.")) {
             if(window.confirm("CONFERMA DEFINITIVA: Vuoi davvero cancellare tutti i turni, i dati finanziari e le impostazioni?")) {
                localStorage.clear();
                addLog('All application data has been cleared. Reloading.');
                alert('Tutti i dati sono stati cancellati. L\'applicazione verrà ricaricata.');
                window.location.reload();
             }
        }
    }

    return (
        <div className="max-w-3xl mx-auto bg-gray-800 p-4 sm:p-8 rounded-xl shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-bold text-center mb-6 text-blue-400">Impostazioni</h2>
            <div className="space-y-6">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-blue-300">Esporta Dati</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Salva tutti i tuoi dati (turni, informazioni finanziarie, nome) in un file di backup.</p>
                    <button onClick={handleExport} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                        Esporta i Miei Dati
                    </button>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-blue-300">Importa Dati</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Carica un file di backup per ripristinare i tuoi dati. Attenzione: questo sovrascriverà tutti i dati attuali.</p>
                    <button onClick={handleImportClick} className="w-full sm:w-auto bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                        Importa da File
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                </div>
                
                <div className="bg-red-900/30 p-4 rounded-lg border border-red-500/50">
                    <h3 className="font-semibold text-lg text-red-300">Area Pericolosa</h3>
                    <p className="text-sm text-red-300/80 mt-1 mb-4">Questa operazione cancellerà permanentemente tutti i dati salvati nell'applicazione.</p>
                    <button onClick={handleClearData} className="w-full sm:w-auto bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 transition-colors">
                        Cancella Tutti i Dati
                    </button>
                </div>
            </div>
        </div>
    );
};

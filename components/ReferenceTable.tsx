
import React from 'react';
import type { FinancialData } from '../types';
import { ALLOWANCE_RULES } from '../constants';

interface ReferenceTableProps {
    financialData: FinancialData;
}

const ValueDisplay: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="bg-gray-900/50 p-3 rounded-md">
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-lg font-bold text-blue-300">€{value.toFixed(2)}</div>
    </div>
);

const ReferenceCard: React.FC<{
    description: string;
    code: string;
    maggiorazione: number;
    pagaOraria: number;
    valoreLordo: number;
}> = ({ description, code, maggiorazione, pagaOraria, valoreLordo }) => (
    <div className="bg-gray-700/50 rounded-lg p-3 border-l-4 border-blue-500">
        <div className="flex justify-between items-start">
            <h4 className="font-bold text-blue-300 pr-2">{description}</h4>
            <span className="font-mono text-xs bg-gray-900 px-2 py-1 rounded-md">{code || 'N/A'}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-600 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Maggiorazione Oraria:</span> <span className="font-semibold text-yellow-400">{maggiorazione > 0 ? `€${maggiorazione.toFixed(2)}` : '//'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Paga Effettiva Oraria:</span> <span className="font-semibold text-blue-400">{pagaOraria > 0 ? `€${pagaOraria.toFixed(2)}` : '//'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Valore Lordo:</span> <span className="font-semibold text-green-400">{valoreLordo > 0 ? `€${valoreLordo.toFixed(2)}` : '//'}</span></div>
        </div>
    </div>
);


export const ReferenceTable: React.FC<ReferenceTableProps> = ({ financialData }) => {
    const { primaLinea, contingenza, edr } = financialData;

    // --- PRECISE FORMULA IMPLEMENTATION ---
    const baseStipendioRaw = primaLinea + contingenza;
    const ottoPercent = baseStipendioRaw * 0.08;
    const BASE = baseStipendioRaw + ottoPercent;
    
    const stipendioOrario = BASE / 173;

    const tredicesimaMensile = (BASE + edr) / 12;
    const baseMensileStse = BASE + tredicesimaMensile;
    const baseOrariaStse = baseMensileStse / 173;
    
    const stipendioGiornaliero = BASE / 26;

    const calculateValue = (ruleKey: string) => {
        const rule = ALLOWANCE_RULES[ruleKey];
        if (!rule) return { maggiorazione: 0, pagaOraria: 0, valoreLordo: 0 };

        let maggiorazione = 0;
        let valoreLordo = 0;
        
        switch (rule.type) {
            case 'hourly_percentage':
                const base = rule.base === 'stse_base' ? baseOrariaStse : stipendioOrario;
                maggiorazione = base * rule.value;
                break;
            case 'daily_percentage':
                const dailyBase = (ruleKey === 'TN30' || ruleKey === 'TN35') ? baseStipendioRaw : BASE;
                valoreLordo = (dailyBase * rule.value) / 26;
                break;
            case 'lump_sum':
                valoreLordo = rule.value;
                break;
        }

        let pagaOraria = 0;
        if (rule.type === 'hourly_percentage') {
            const basePaga = rule.base === 'stse_base' ? baseOrariaStse : stipendioOrario;
            pagaOraria = basePaga + maggiorazione;
        }

        return { maggiorazione, pagaOraria, valoreLordo };
    };

    const renderRow = (code: string) => {
        const rule = ALLOWANCE_RULES[code];
        if (!rule) return null;
        const { maggiorazione, pagaOraria, valoreLordo } = calculateValue(code);

        return (
            <tr className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="py-3 px-4 text-sm text-gray-300">{rule.description}</td>
                <td className="py-3 px-4 text-sm font-mono">{code}</td>
                <td className="py-3 px-4 text-sm font-semibold text-right text-yellow-400">{maggiorazione > 0 ? `€${maggiorazione.toFixed(2)}` : '//'}</td>
                <td className="py-3 px-4 text-sm font-semibold text-right text-blue-400">{pagaOraria > 0 ? `€${pagaOraria.toFixed(2)}` : '//'}</td>
                <td className="py-3 px-4 text-sm font-semibold text-right text-green-400">{valoreLordo > 0 ? `€${valoreLordo.toFixed(2)}` : '//'}</td>
            </tr>
        );
    };

    const renderManualRow = (description: string, code: string, maggiorazione: number, pagaOraria: number) => (
        <tr className="border-b border-gray-700 hover:bg-gray-700/50">
            <td className="py-3 px-4 text-sm text-gray-300">{description}</td>
            <td className="py-3 px-4 text-sm font-mono">{code}</td>
            <td className="py-3 px-4 text-sm font-semibold text-right text-yellow-400">€{maggiorazione.toFixed(2)}</td>
            <td className="py-3 px-4 text-sm font-semibold text-right text-blue-400">€{pagaOraria.toFixed(2)}</td>
            <td className="py-3 px-4 text-sm font-semibold text-right text-green-400">//</td>
        </tr>
    );

    const renderSectionHeader = (title: string) => (
        <tr className="bg-gray-900">
            <td colSpan={5} className="py-2 px-4 text-sm font-bold text-blue-300 uppercase tracking-wider">{title}</td>
        </tr>
    );
    
    // Manual calculations for SMAP section
    const stsnMaggiorazione = (baseOrariaStse * 0.30) + (stipendioOrario * 0.50);
    const stsnPagaOraria = baseOrariaStse + stsnMaggiorazione;
    const stdomMaggiorazione = baseOrariaStse * 0.50;
    const stdomPagaOraria = baseOrariaStse + stdomMaggiorazione;
    const stdomnMaggiorazione = baseOrariaStse * 0.75;
    const stdomnPagaOraria = baseOrariaStse + stdomnMaggiorazione;

    const sections = {
        'Notturni': ['LNH5', 'TN30', 'TN35', 'RMTR'],
        'Straordinari': ['STSE'], // Manual rows will be handled separately
        'Festività e Domenicali': Object.keys(ALLOWANCE_RULES).filter(k => k.startsWith('DH') || k.startsWith('LFH') || k.startsWith('LPH')),
        'Altro': ['ITV7', 'IVTT', 'IVTO', 'MNL'],
    };

    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6 text-blue-400">Tabelle di Riferimento Maggiorazioni</h2>
            
            <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-700 mb-8">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">Area Calcoli</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ValueDisplay label="Stipendio Base (A+B)" value={baseStipendioRaw} />
                    <ValueDisplay label="8% (C)" value={ottoPercent} />
                    <ValueDisplay label="BASE (A+B+C)" value={BASE} />
                    <ValueDisplay label="Stipendio Orario (BASE/173)" value={stipendioOrario} />
                    <ValueDisplay label="1/12 di 13^ ((BASE+EDR)/12)" value={tredicesimaMensile} />
                    <ValueDisplay label="Base Mensile STSE (BASE + 13^)" value={baseMensileStse} />
                    <ValueDisplay label="Base Oraria STSE (/173)" value={baseOrariaStse} />
                    <ValueDisplay label="Stipendio Giornaliero (/26)" value={stipendioGiornaliero} />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden hidden md:block">
                <table className="min-w-full">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Descrizione</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Codice</th>
                            <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider">Maggiorazione Oraria</th>
                            <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider">Paga Effettiva Oraria</th>
                            <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider">Valore Lordo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {renderSectionHeader('Notturni')}
                        {sections['Notturni'].map(renderRow)}
                        
                        {renderSectionHeader('SMAP / Straordinari')}
                        {renderRow('STSE')}
                        {renderManualRow('Straordinario Feriale Notturno', '', stsnMaggiorazione, stsnPagaOraria)}
                        {renderManualRow('Straordinario Domenicale/Festivo Diurno', '', stdomMaggiorazione, stdomPagaOraria)}
                        {renderManualRow('Straordinario Domenicale/Festivo Notturno', '', stdomnMaggiorazione, stdomnPagaOraria)}

                        {renderSectionHeader('Festività e Domenicali')}
                        {sections['Festività e Domenicali'].map(renderRow)}

                        {renderSectionHeader('Altro')}
                        {sections['Altro'].map(renderRow)}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-6 md:hidden">
                <div>
                    <h3 className="text-xl font-bold text-blue-300 mb-3">Notturni</h3>
                    <div className="space-y-3">
                        {sections['Notturni'].map(code => <ReferenceCard key={code} description={ALLOWANCE_RULES[code].description} code={code} {...calculateValue(code)} />)}
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-bold text-blue-300 mb-3">SMAP / Straordinari</h3>
                    <div className="space-y-3">
                        <ReferenceCard description={ALLOWANCE_RULES['STSE'].description} code={'STSE'} {...calculateValue('STSE')} />
                        <ReferenceCard description="Straordinario Feriale Notturno" code="" maggiorazione={stsnMaggiorazione} pagaOraria={stsnPagaOraria} valoreLordo={0} />
                        <ReferenceCard description="Straordinario Domenicale/Festivo Diurno" code="" maggiorazione={stdomMaggiorazione} pagaOraria={stdomPagaOraria} valoreLordo={0} />
                        <ReferenceCard description="Straordinario Domenicale/Festivo Notturno" code="" maggiorazione={stdomnMaggiorazione} pagaOraria={stdomnPagaOraria} valoreLordo={0} />
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-bold text-blue-300 mb-3">Festività e Domenicali</h3>
                    <div className="space-y-3">
                        {sections['Festività e Domenicali'].map(code => <ReferenceCard key={code} description={ALLOWANCE_RULES[code].description} code={code} {...calculateValue(code)} />)}
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-bold text-blue-300 mb-3">Altro</h3>
                    <div className="space-y-3">
                        {sections['Altro'].map(code => <ReferenceCard key={code} description={ALLOWANCE_RULES[code].description} code={code} {...calculateValue(code)} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

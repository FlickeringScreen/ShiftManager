
import { useCallback } from 'react';
import type { CalculatedShift, FinancialData, Allowance } from '../types';
import { ALLOWANCE_RULES } from '../constants';

const isHoliday = (date: Date): boolean => {
    // This is a simplified holiday check. For production, a more robust library might be needed.
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = utcDate.getUTCDate();
    const month = utcDate.getUTCMonth() + 1;

    const holidays = [
        "1-1", "6-1", "25-4", "1-5", "2-6", 
        "15-8", "1-11", "8-12", "25-12", "26-12"
    ];
    
    // Easter Monday calculation (simplified)
    const year = utcDate.getUTCFullYear();
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
    const easterDay = ((h + l - 7 * m + 114) % 31) + 1;
    const easterMonday = new Date(Date.UTC(year, easterMonth - 1, easterDay + 1));

    if (month === easterMonday.getUTCMonth() + 1 && day === easterMonday.getUTCDate()) {
        return true;
    }

    return holidays.includes(`${day}-${month}`);
};

// A more precise, non-iterative function to calculate night hours
const getNightHours = (start: Date, end: Date): number => {
    const nightStart1 = 0; // 00:00
    const nightEnd1 = 6 * 60; // 06:00
    const nightStart2 = 21 * 60; // 21:00
    const nightEnd2 = 24 * 60; // 24:00

    const startMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
    const endMinutesTotal = (end.getTime() - start.getTime()) / (1000 * 60) + startMinutes;
    
    let totalNightMinutes = 0;

    for (let day = 0; day * 1440 < endMinutesTotal; day++) {
        const dayOffset = day * 1440;

        // Intersection with 00:00 - 06:00
        const overlapStart1 = Math.max(startMinutes, dayOffset + nightStart1);
        const overlapEnd1 = Math.min(endMinutesTotal, dayOffset + nightEnd1);
        if (overlapEnd1 > overlapStart1) {
            totalNightMinutes += overlapEnd1 - overlapStart1;
        }

        // Intersection with 21:00 - 24:00
        const overlapStart2 = Math.max(startMinutes, dayOffset + nightStart2);
        const overlapEnd2 = Math.min(endMinutesTotal, dayOffset + nightEnd2);
        if (overlapEnd2 > overlapStart2) {
            totalNightMinutes += overlapEnd2 - overlapStart2;
        }
    }

    return totalNightMinutes / 60;
};


export const useAllowanceCalculator = (financialData: FinancialData) => {
    
    const calculateAllowances = useCallback((shift: Omit<CalculatedShift, 'allowances' | 'totalAllowance'>): { allowances: Allowance[], totalAllowance: number } => {
        const allowances: Allowance[] = [];
        const { date, startTime, endTime, isOvertime, overtimeHours, hasMNS } = shift;
        const { primaLinea, contingenza, edr } = financialData;
        
        // --- PRECISE FORMULA IMPLEMENTATION ---
        const baseStipendioRaw = primaLinea + contingenza;
        const BASE = baseStipendioRaw * 1.08;
        const stipendioOrario = BASE / 173;

        const tredicesimaMensile = (BASE + edr) / 12;
        const baseMensileStse = BASE + tredicesimaMensile;
        const baseOrariaStse = baseMensileStse / 173;
        
        // Use UTC for all date logic to avoid timezone issues
        const shiftDate = new Date(date);
        const dayOfWeek = shiftDate.getUTCDay(); // 0 = Sunday

        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const startDate = new Date(date);
        startDate.setUTCHours(startH, startM, 0, 0);

        const endDate = new Date(date);
        endDate.setUTCHours(endH, endM, 0, 0);

        if (endDate <= startDate) {
            endDate.setUTCDate(endDate.getUTCDate() + 1);
        }
        
        // --- RULE IMPLEMENTATIONS ---

        if (hasMNS) {
            allowances.push({ code: 'MNL', description: ALLOWANCE_RULES['MNL'].description, value: ALLOWANCE_RULES['MNL'].value });
        }
        
        if (endDate.getUTCDay() !== startDate.getUTCDay() && (endH > 0 || (endH === 0 && endM >= 30))) {
             allowances.push({ code: 'TN30', description: ALLOWANCE_RULES['TN30'].description, value: (baseStipendioRaw * ALLOWANCE_RULES['TN30'].value) / 26 });
        }

        if ((endH === 23 && endM >= 30) || endDate.getUTCDay() !== startDate.getUTCDay()) {
             allowances.push({ code: 'RMTR', description: ALLOWANCE_RULES['RMTR'].description, value: ALLOWANCE_RULES['RMTR'].value });
        }

        if (startH < 6 && startH >= 5 && !isOvertime) {
            allowances.push({ code: 'TN35', description: ALLOWANCE_RULES['TN35'].description, value: (baseStipendioRaw * ALLOWANCE_RULES['TN35'].value) / 26 });
        }
        
        const nightHours = getNightHours(startDate, endDate);
        const shiftDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const dayHours = shiftDuration - nightHours;

        if(isOvertime && overtimeHours) {
            const isSunday = dayOfWeek === 0;
            const isHolidayShift = isHoliday(shiftDate);

            if (isSunday || isHolidayShift) {
                if (dayHours > 0) {
                     allowances.push({ code: 'ST-DOM', description: isHolidayShift ? 'Straordinario Festivo Diurno' : 'Straordinario Domenicale Diurno', value: dayHours * (baseOrariaStse * 1.50), hours: dayHours });
                }
                if (nightHours > 0) {
                     allowances.push({ code: 'ST-DOM-N', description: isHolidayShift ? 'Straordinario Festivo Notturno' : 'Straordinario Domenicale Notturno', value: nightHours * (baseOrariaStse * 1.75), hours: nightHours });
                }
            } else { // Weekday overtime
                if (dayHours > 0) {
                     allowances.push({ code: 'STSE', description: 'Straordinario Feriale Diurno', value: dayHours * (baseOrariaStse * (1 + ALLOWANCE_RULES['STSE'].value)), hours: dayHours });
                }
                if (nightHours > 0) {
                    // Split nocturnal overtime into its two components as per payslip
                    // The first part is the full overtime hourly pay (base + 30%)
                    allowances.push({ code: 'STSE', description: 'Straordinario Feriale (Quota Oraria)', value: nightHours * (baseOrariaStse * (1 + ALLOWANCE_RULES['STSE'].value)), hours: nightHours });
                    // The second part is the additional night surcharge (50% on regular hourly pay)
                    allowances.push({ code: 'LNH5', description: 'Maggiorazione Notturna (su Straordinario)', value: nightHours * (stipendioOrario * ALLOWANCE_RULES['LNH5'].value), hours: nightHours });
                }
            }
        } else { // Regular shift
            const isSunday = dayOfWeek === 0;
            const isHolidayShift = isHoliday(shiftDate);
            
            if (isHolidayShift) {
                if (dayHours > 0) allowances.push({ code: 'LFH6', description: ALLOWANCE_RULES['LFH6'].description, value: dayHours * (stipendioOrario * ALLOWANCE_RULES['LFH6'].value), hours: dayHours });
                if (nightHours > 0) allowances.push({ code: 'LFH8', description: ALLOWANCE_RULES['LFH8'].description, value: nightHours * (stipendioOrario * ALLOWANCE_RULES['LFH8'].value), hours: nightHours });
            } else if (isSunday) {
                if (dayHours > 0) allowances.push({ code: 'DH40', description: ALLOWANCE_RULES['DH40'].description, value: dayHours * (stipendioOrario * ALLOWANCE_RULES['DH40'].value), hours: dayHours });
                if (nightHours > 0) allowances.push({ code: 'DH60', description: ALLOWANCE_RULES['DH60'].description, value: nightHours * (stipendioOrario * ALLOWANCE_RULES['DH60'].value), hours: nightHours });
            } else { // Weekday shift
                 if (nightHours > 0) {
                    allowances.push({ code: 'LNH5', description: ALLOWANCE_RULES['LNH5'].description, value: nightHours * (stipendioOrario * ALLOWANCE_RULES['LNH5'].value), hours: nightHours });
                }
            }
        }

        const totalAllowance = allowances.reduce((sum, item) => sum + item.value, 0);

        return { allowances, totalAllowance };

    }, [financialData]);

    return { calculateAllowances };
};

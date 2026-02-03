
import { useCallback } from 'react';
import type { CalculatedShift, FinancialData, Allowance } from '../types';
import { ALLOWANCE_RULES } from '../constants';
import type { HolidayOverrides } from '../App';

const getHolidayTypeForDate = (date: Date): 'none' | 'holiday' | 'principal_holiday' => {
    // Use UTC to avoid timezone-related date shifts
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();

    const principalHolidays = ["1-1", "1-5", "15-8", "25-12"];
    const holidays = ["6-1", "25-4", "2-6", "1-11", "8-12", "26-12"];
    
    // Easter calculation (Meeus/Jones/Butcher algorithm)
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
    
    if (month === easterMonth && day === easterDay) return 'principal_holiday';
    
    const easterMonday = new Date(Date.UTC(year, easterMonth - 1, easterDay + 1));
    if (month === easterMonday.getUTCMonth() + 1 && day === easterMonday.getUTCDate()) return 'holiday';

    if (principalHolidays.includes(`${day}-${month}`)) return 'principal_holiday';
    if (holidays.includes(`${day}-${month}`)) return 'holiday';

    return 'none';
};

const calculateNightHours = (start: Date, end: Date): number => {
    let nightMinutes = 0;
    let current = new Date(start);

    while (current < end) {
        const hour = current.getUTCHours();
        if (hour >= 21 || hour < 6) {
            nightMinutes++;
        }
        current.setUTCMinutes(current.getUTCMinutes() + 1);
    }
    return nightMinutes / 60;
};


export const useAllowanceCalculator = (financialData: FinancialData, holidayOverrides: HolidayOverrides) => {
    
    const calculateAllowances = useCallback((shift: Omit<CalculatedShift, 'allowances' | 'totalAllowance'>): { allowances: Allowance[], totalAllowance: number } => {
        const allowances: Allowance[] = [];
        const { date, startTime, endTime, isOvertime, overtimeHours, hasMNS } = shift;
        const { primaLinea, contingenza, edr } = financialData;
        
        const baseStipendioRaw = primaLinea + contingenza;
        const BASE = baseStipendioRaw * 1.08;
        const stipendioOrario = BASE / 173;
        const stipendioGiornaliero = BASE / 26;

        const tredicesimaMensile = (BASE + edr) / 12;
        const baseMensileStse = BASE + tredicesimaMensile;
        const baseOrariaStse = baseMensileStse / 173;
        
        const shiftDate = new Date(date);
        const dayOfWeek = shiftDate.getUTCDay();

        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const startDate = new Date(date);
        startDate.setUTCHours(startH, startM, 0, 0);

        const endDate = new Date(date);
        endDate.setUTCHours(endH, endM, 0, 0);

        if (endDate <= startDate) {
            endDate.setUTCDate(endDate.getUTCDate() + 1);
        }
        
        const dayType = holidayOverrides[date] || getHolidayTypeForDate(shiftDate);
        const isHolidayShift = dayType === 'holiday';
        const isPrincipalHolidayShift = dayType === 'principal_holiday';
        const isSunday = dayOfWeek === 0;

        if (hasMNS) {
            allowances.push({ code: 'MNL', description: ALLOWANCE_RULES['MNL'].description, value: stipendioGiornaliero });
        }
        
        if (endDate.getUTCDay() !== startDate.getUTCDay() && (endH > 0 || (endH === 0 && endM >= 30))) {
             allowances.push({ code: 'TN30', description: ALLOWANCE_RULES['TN30'].description, value: (baseStipendioRaw * ALLOWANCE_RULES['TN30'].value) / 26 });
        }

        if ((endH === 23 && endM >= 30) || (endDate.getUTCDay() !== startDate.getUTCDay() && endH >= 0)) {
             allowances.push({ code: 'RMTR', description: ALLOWANCE_RULES['RMTR'].description, value: ALLOWANCE_RULES['RMTR'].value });
        }

        if (startH === 5 && !isOvertime) {
            allowances.push({ code: 'TN35', description: ALLOWANCE_RULES['TN35'].description, value: (baseStipendioRaw * ALLOWANCE_RULES['TN35'].value) / 26 });
        }
        
        const nightHours = calculateNightHours(startDate, endDate);
        const shiftDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const dayHours = shiftDuration - nightHours;

        if(isOvertime && overtimeHours) {
            if (isPrincipalHolidayShift || isHolidayShift || isSunday) {
                if (dayHours > 0) {
                     allowances.push({ code: 'ST-DOM', description: 'Straordinario Festivo/Domenicale Diurno', value: dayHours * (baseOrariaStse * 1.50), hours: dayHours });
                }
                if (nightHours > 0) {
                     allowances.push({ code: 'ST-DOM-N', description: 'Straordinario Festivo/Domenicale Notturno', value: nightHours * (baseOrariaStse * 1.75), hours: nightHours });
                }
            } else { // Weekday overtime
                if (dayHours > 0) {
                     allowances.push({ code: 'STSE', description: 'Straordinario Feriale Diurno', value: dayHours * (baseOrariaStse * (1 + ALLOWANCE_RULES['STSE'].value)), hours: dayHours });
                }
                if (nightHours > 0) {
                    allowances.push({ code: 'STSE', description: 'Straordinario Feriale (Quota Oraria)', value: nightHours * (baseOrariaStse * (1 + ALLOWANCE_RULES['STSE'].value)), hours: nightHours });
                    allowances.push({ code: 'LNH5', description: 'Maggiorazione Notturna (su Straordinario)', value: nightHours * (stipendioOrario * ALLOWANCE_RULES['LNH5'].value), hours: nightHours });
                }
            }
        } else { // Regular shift
            if (isPrincipalHolidayShift) {
                if (dayHours > 0) allowances.push({ code: 'LPH5', description: ALLOWANCE_RULES['LPH5'].description, value: dayHours * (stipendioOrario * ALLOWANCE_RULES['LPH5'].value), hours: dayHours });
                if (nightHours > 0) allowances.push({ code: 'LPH8', description: ALLOWANCE_RULES['LPH8'].description, value: nightHours * (stipendioOrario * ALLOWANCE_RULES['LPH8'].value), hours: nightHours });
            } else if (isHolidayShift) {
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

    }, [financialData, holidayOverrides]);

    return { calculateAllowances };
};

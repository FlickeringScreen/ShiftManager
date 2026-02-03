
export interface ExtractedShift {
    date: Date;
    shiftCode: string;
    location: string;
    hasMFS: boolean;
    hasMNS: boolean;
    hasFS: boolean;
}

export interface FinancialData {
    primaLinea: number;
    contingenza: number;
    edr: number;
}

export interface Allowance {
    code: string;
    description: string;
    value: number;
    hours?: number;
    percent?: number;
}

export interface CalculatedShift {
    id: string;
    date: string; // ISO string for easier state management
    shiftCode: string;
    startTime: string;
    endTime: string;
    allowances: Allowance[];
    totalAllowance: number;
    isOvertime: boolean;
    overtimeHours?: number;
    hasMNS: boolean;
}

export type AllowanceCalculationType = 'hourly_percentage' | 'daily_percentage' | 'lump_sum' | 'special_case';

export interface AllowanceRule {
    description: string;
    type: AllowanceCalculationType;
    value: number; // This can be a percentage (e.g., 0.5 for 50%) or a lump sum value
    base?: ('stipendio_orario' | 'stipendio_giornaliero' | 'stse_base');
}
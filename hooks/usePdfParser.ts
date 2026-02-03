
import { useState, useCallback } from 'react';
import type { ExtractedShift } from '../types';
import { SHIFT_TIMES, RIPOSO_NAMES } from '../constants';

// Since pdfjs is loaded from a CDN, we need to declare its type for TypeScript
declare const pdfjsLib: any;

type AddLogFn = (message: string, data?: any) => void;

async function extractTextFromPDF(file: File, addLog: AddLogFn): Promise<string> {
    addLog('📄 Starting PDF extraction...', { fileName: file.name, fileSize: file.size });
    try {
        const arrayBuffer = await file.arrayBuffer();
        addLog('✓ File converted to ArrayBuffer');
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        addLog('✓ PDF document loaded', { numPages: pdf.numPages });
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            addLog(`Processing page ${i}/${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            addLog(`Page ${i} has ${textContent.items.length} text items`);
            
            const items = textContent.items.sort((a: any, b: any) => {
                const yDiff = Math.abs(a.transform[5] - b.transform[5]);
                if (yDiff > 5) return b.transform[5] - a.transform[5];
                return a.transform[4] - b.transform[4];
            });
            
            let lastY: number | null = null;
            let lineText = '';
            items.forEach((item: any) => {
                const y = item.transform[5];
                if (lastY !== null && Math.abs(y - lastY) > 5) {
                    fullText += lineText + '\n';
                    lineText = '';
                }
                lineText += item.str + ' ';
                lastY = y;
            });
            fullText += lineText + '\n';
        }

        addLog('✓ PDF text extraction complete', { totalLength: fullText.length });
        return fullText;
    } catch (error) {
        addLog('✗ PDF extraction failed:', error);
        throw error;
    }
}

function findEmployeeLine(text: string, firstName: string, lastName: string, addLog: AddLogFn) {
    const lines = text.split('\n');
    const searchPattern = new RegExp(`${lastName.toUpperCase()}.*${firstName.toUpperCase()}`, 'i');
    for (let i = 0; i < lines.length; i++) {
        if (searchPattern.test(lines[i].toUpperCase())) {
            addLog(`✓ Found employee at line ${i}: ${lines[i].substring(0, 100)}`);
            return { index: i, line: lines[i], lines };
        }
    }
    return null;
}

function generateWeekDates(day: number, month: number, year: number): Date[] {
    const dates: Date[] = [];
    // Use Date.UTC to create a timezone-agnostic start date
    const startDate = new Date(Date.UTC(year, month - 1, day));
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        // Use setUTCDate to avoid timezone-related shifts when incrementing the day
        date.setUTCDate(startDate.getUTCDate() + i);
        dates.push(date);
    }
    return dates;
}

function extractWeekDates(text: string, addLog: AddLogFn): Date[] {
    const lines = text.split('\n');
    const periodoIndex = text.indexOf('PERIODO DI RIFERIMENTO');
    if (periodoIndex !== -1) {
        const chunk = text.substring(periodoIndex, periodoIndex + 300);
        let match = chunk.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/) 
            || chunk.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2})\/(\d{2})\/(\d{4})/);
        
        if (match) {
            const startDay = parseInt(match[1]);
            const startMonth = parseInt(match[2]);
            const year = parseInt(match[3]);
            addLog(`✓ Found week dates: ${match[0]}`);
            return generateWeekDates(startDay, startMonth, year);
        }
    }

    for (const line of lines) {
        const match = line.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-?\s*(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
            const startDay = parseInt(match[1]);
            const startMonth = parseInt(match[2]);
            const year = parseInt(match[3]);
            addLog(`✓ Found week dates in document: ${match[0]}`);
            return generateWeekDates(startDay, startMonth, year);
        }
    }

    addLog('❌ WARNING: Could not find week dates in PDF! Using current date as fallback.');
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return generateWeekDates(monday.getDate(), monday.getMonth() + 1, monday.getFullYear());
}

function parseSchedule(text: string, firstName: string, lastName: string, addLog: AddLogFn): { found: boolean, schedule: ExtractedShift[] } {
    const employeeData = findEmployeeLine(text, firstName, lastName, addLog);
    if (!employeeData) return { found: false, schedule: [] };
    
    const weekDates = extractWeekDates(text, addLog);
    const schedule: ExtractedShift[] = [];

    const nameLine = employeeData.line;
    addLog(`Name line: ${nameLine}`);
    
    const nameRegex = new RegExp(`${lastName}.*${firstName}`, 'i');
    let dataPart = nameLine.replace(nameRegex, '').trim();
    dataPart = dataPart.replace(/>/g, ' '); // CRITICAL: remove '>' characters
    addLog(`Data part (after removing >): ${dataPart}`);

    const shiftsFound: { code: string; position: number; endPosition: number }[] = [];
    let match;

    // 1. Find quoted shifts
    const quotedPattern = /'([A-Z*+0-9\s-]{1,5})'/g;
    while ((match = quotedPattern.exec(dataPart)) !== null) {
        const shiftCode = match[1].trim();
        if (SHIFT_TIMES[shiftCode]) {
            shiftsFound.push({
                code: shiftCode,
                position: match.index,
                endPosition: match.index + match[0].length
            });
            addLog(`  Found quoted shift code: '${shiftCode}'`);
        }
    }

    // 2. Find unquoted shifts and rest days
    const allTokens = dataPart.split(/\s+/).filter(Boolean);
    let currentPos = 0;
    for (const token of allTokens) {
        const tokenPos = dataPart.indexOf(token, currentPos);
        if (tokenPos === -1) continue;
        currentPos = tokenPos + token.length;

        const isOverlapping = shiftsFound.some(s => tokenPos >= s.position && tokenPos < s.endPosition);
        if (!isOverlapping) {
            if (SHIFT_TIMES[token] || RIPOSO_NAMES[token] || token === 'XXX') {
                shiftsFound.push({
                    code: token,
                    position: tokenPos,
                    endPosition: tokenPos + token.length
                });
                 addLog(`  Found unquoted code: ${token} at position ${tokenPos}`);
            }
        }
    }

    shiftsFound.sort((a, b) => a.position - b.position);
    addLog(`✓ Found ${shiftsFound.length} shift codes/placeholders`);

    if(shiftsFound.length === 0) return { found: true, schedule: [] };

    // 3. Parse location and flags between shifts
    shiftsFound.forEach((shift, dayIndex) => {
        if (dayIndex >= 7) return;

        let afterShiftText;
        if (dayIndex < shiftsFound.length - 1) {
            afterShiftText = dataPart.substring(shift.endPosition, shiftsFound[dayIndex + 1].position);
        } else {
            afterShiftText = dataPart.substring(shift.endPosition);
        }
        addLog(`  After shift '${shift.code}': "${afterShiftText.trim()}"`);

        const tokens = afterShiftText.trim().split(/\s+/).filter(Boolean);
        let location = 'N/A';
        let hasMFS = false, hasMNS = false, hasFS = false;
        
        const locationTokens = [];

        for(const token of tokens) {
            if(token === 'MFS') hasMFS = true;
            else if(token === 'MNS') hasMNS = true;
            else if(token === 'FS') hasFS = true;
            else if(!/^\d+$/.test(token)) { // Avoid accidentally picking up numbers as locations
                locationTokens.push(token);
            }
        }
        
        if(locationTokens.length > 0) {
            location = locationTokens.join(' ');
        }
        
        if(shift.code.startsWith('Z') || shift.code === 'RCF') {
            location = 'Riposo'; // Override location for rest days
        }

        addLog(`  Day ${dayIndex + 1}: ${shift.code} @ ${location}${hasMFS ? ' [MFS]' : ''}${hasMNS ? ' [MNS]' : ''}${hasFS ? ' [FS]' : ''}`);

        schedule.push({
            date: weekDates[dayIndex],
            shiftCode: shift.code,
            location: location,
            hasMFS, hasMNS, hasFS
        });
    });

    addLog(`✓ Total shifts extracted: ${schedule.length}`);
    return { found: true, schedule };
}


export const usePdfParser = (addLog: AddLogFn) => {
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parsePdf = useCallback(async (file: File, firstName: string, lastName: string): Promise<ExtractedShift[]> => {
        setIsParsing(true);
        setError(null);
        try {
            addLog('Starting extraction process...');
            const text = await extractTextFromPDF(file, addLog);
            addLog('Text extraction complete, starting schedule parsing...');
            const result = parseSchedule(text, firstName, lastName, addLog);

            if (!result.found) {
                throw new Error(`Dipendente "${firstName} ${lastName}" non trovato.`);
            }
            if (result.schedule.length === 0) {
                throw new Error('Nessun turno trovato per questo dipendente.');
            }
             addLog('Extraction successful!', { shifts: result.schedule.length });
            return result.schedule;
        } catch (err: any) {
            addLog('Error during PDF processing', err);
            setError(err.message || 'Errore durante l\'elaborazione del PDF.');
            throw err;
        } finally {
            setIsParsing(false);
        }
    }, [addLog]);
    
    return { parsePdf, isParsing, error };
};

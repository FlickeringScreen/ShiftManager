
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
            
            // Sort items by Y coordinate first, then X, to reconstruct lines
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
    const startDate = new Date(Date.UTC(year, month - 1, day));
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setUTCDate(startDate.getUTCDate() + i);
        dates.push(date);
    }
    return dates;
}

function extractWeekDates(text: string, addLog: AddLogFn): Date[] {
    const lines = text.split('\n');
    for (const line of lines) {
        // Match formats like "01/01/2024 - 07/01/2024" or "PERIODO DI RIFERIMENTO 01/01/2024 AL 07/01/2024"
        const match = line.match(/(\d{2})\/(\d{2})\/(\d{4})\s*[-A-Z\s]*\s*(\d{2})\/(\d{2})\/(\d{4})/);
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
    const dayOfWeek = today.getUTCDay(); // Sunday = 0, Monday = 1
    const diff = today.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), diff));
    return generateWeekDates(monday.getUTCDate(), monday.getUTCMonth() + 1, monday.getUTCFullYear());
}

function parseSchedule(text: string, firstName: string, lastName: string, addLog: AddLogFn): { found: boolean, schedule: ExtractedShift[] } {
    const employeeData = findEmployeeLine(text, firstName, lastName, addLog);
    if (!employeeData) return { found: false, schedule: [] };
    
    const weekDates = extractWeekDates(text, addLog);
    const schedule: ExtractedShift[] = [];

    const nameLine = employeeData.line;
    const nameRegex = new RegExp(`${lastName}[^A-Z]*${firstName}`, 'i');
    let dataPart = nameLine.replace(nameRegex, '').trim();
    // Pre-processing: Standardize separators and remove noise
    dataPart = dataPart.replace(/>/g, ' ').replace(/'/g, ' ');
    addLog(`Data part to be parsed: "${dataPart}"`);

    const tokens = dataPart.split(/\s+/).filter(Boolean);
    let dayIndex = 0;
    
    for (let i = 0; i < tokens.length && dayIndex < 7; i++) {
        const currentToken = tokens[i];
        
        if (SHIFT_TIMES[currentToken] || RIPOSO_NAMES[currentToken] || currentToken === 'XXX') {
            const shiftCode = currentToken;
            let location = 'N/A';
            let hasMFS = false, hasMNS = false, hasFS = false;
            
            const locationTokens: string[] = [];
            // Look ahead for location and flags before the next shift code
            for (let j = i + 1; j < tokens.length; j++) {
                const nextToken = tokens[j];
                if (SHIFT_TIMES[nextToken] || RIPOSO_NAMES[nextToken] || nextToken === 'XXX') {
                    i = j - 1; // Move main loop cursor to the position before the next shift
                    break;
                }
                
                if (nextToken === 'MFS') hasMFS = true;
                else if (nextToken === 'MNS') hasMNS = true;
                else if (nextToken === 'FS') hasFS = true;
                else if (!/^\d+$/.test(nextToken) && isNaN(Number(nextToken))) {
                    locationTokens.push(nextToken);
                }

                if(j === tokens.length - 1) { // End of tokens
                    i = j;
                }
            }

            if(locationTokens.length > 0) {
                location = locationTokens.join(' ');
            }
            if(shiftCode.startsWith('Z') || shiftCode === 'RCF') {
                location = 'Riposo'; // Override location for rest days
            }

            addLog(`  Day ${dayIndex + 1}: ${shiftCode} @ ${location}${hasMFS ? ' [MFS]' : ''}${hasMNS ? ' [MNS]' : ''}${hasFS ? ' [FS]' : ''}`);

            schedule.push({
                date: weekDates[dayIndex],
                shiftCode,
                location,
                hasMFS, hasMNS, hasFS
            });
            dayIndex++;
        }
    }

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

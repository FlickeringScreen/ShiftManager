import { useState, useEffect, Dispatch, SetStateAction } from 'react';

function getValueFromLocalStorage<T,>(key: string, initialValue: T): T {
    if (typeof window === 'undefined') {
        return initialValue;
    }
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
        return initialValue;
    }
}

// FIX: To resolve the "Cannot find namespace 'React'" error, `Dispatch` and `SetStateAction` types are imported directly from 'react' and the return type is updated to use them without the `React.` prefix.
export function useLocalStorage<T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => getValueFromLocalStorage(key, initialValue));

    useEffect(() => {
        try {
            const valueToStore = typeof storedValue === 'function' ? storedValue(storedValue) : storedValue;
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.warn(`Error setting localStorage key “${key}”:`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

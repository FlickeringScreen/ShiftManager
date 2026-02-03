
import React from 'react';
import type { Page } from '../App';

interface HeaderProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage }) => {
    const getButtonClass = (page: Page) => {
        const activeClass = "bg-blue-600 text-white shadow-lg";
        const inactiveClass = "bg-gray-700 text-gray-300 hover:bg-gray-600";
        return `px-4 py-2 rounded-md transition-all duration-300 font-semibold text-sm ${currentPage === page ? activeClass : inactiveClass}`;
    }

    return (
        <header className="bg-gray-800 shadow-md">
            <div className="container mx-auto px-4 sm:px-6 md:px-8 py-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl font-bold text-blue-400">Shift Manager</h1>
                    <p className="text-sm text-gray-400">Generatore ICS & Calcolo Maggiorazioni</p>
                </div>
                <nav className="flex flex-wrap justify-center space-x-2 bg-gray-900 p-1 rounded-lg w-full sm:w-auto">
                    <button onClick={() => setCurrentPage('generator')} className={`${getButtonClass('generator')} flex-grow sm:flex-grow-0`}>
                        Generatore ICS
                    </button>
                    <button onClick={() => setCurrentPage('calculator')} className={`${getButtonClass('calculator')} flex-grow sm:flex-grow-0`}>
                        Calcolatore
                    </button>
                    <button onClick={() => setCurrentPage('reference')} className={`${getButtonClass('reference')} flex-grow sm:flex-grow-0`}>
                        Tabelle
                    </button>
                    <button onClick={() => setCurrentPage('settings')} className={`${getButtonClass('settings')} flex-grow sm:flex-grow-0`}>
                        Impostazioni
                    </button>
                </nav>
            </div>
        </header>
    );
};

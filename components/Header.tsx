
import React from 'react';
import type { Tab } from '../types';

interface HeaderProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    isMonitoring: boolean;
    onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isMonitoring, onGoHome }) => {
    const tabs: { key: Tab; label: string }[] = [
        { key: 'kasir', label: 'KASIR' },
        { key: 'pesanan', label: 'DAPUR' },
        { key: 'laporan', label: 'REKAP' },
        { key: 'pengaturan', label: 'SET' },
        { key: 'qayzan', label: 'STUDIO' },
    ];

    const renderBoardLights = () => {
        const colors = ['#d4af37', '#00f7a5', '#ffaa00', '#146b61'];
        const lights = [];
        for(let i=0; i<=100; i+=25) lights.push(<div key={`t-${i}`} className="board-light" style={{top: '-4px', left: `${i}%`, color: colors[i/25 % colors.length], animationDelay: `${i/100}s`}}></div>);
        for(let i=0; i<=100; i+=25) lights.push(<div key={`b-${i}`} className="board-light" style={{bottom: '-4px', left: `${i}%`, color: colors[(i/25 + 2) % colors.length], animationDelay: `${i/100 + 0.5}s`}}></div>);
        for(let i=25; i<100; i+=25) lights.push(<div key={`l-${i}`} className="board-light" style={{left: '-4px', top: `${i}%`, color: colors[(i/25 + 1) % colors.length], animationDelay: `${i/100 + 0.2}s`}}></div>);
        for(let i=25; i<100; i+=25) lights.push(<div key={`r-${i}`} className="board-light" style={{right: '-4px', top: `${i}%`, color: colors[(i/25 + 3) % colors.length], animationDelay: `${i/100 + 0.7}s`}}></div>);
        return lights;
    };

    return (
        <header className="bg-[#146b61] border-b-8 border-[#0a3d38] p-4 sticky top-0 z-20 overflow-hidden">
            <ul className="lightrope absolute top-0 left-0">
                <li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li>
                <li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li>
                <li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li>
            </ul>

            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative mt-2">
                <div className="flex items-center gap-3">
                    <div className="bg-[#FDFBF6] p-2 border-4 border-[#0a3d38] rotate-[-2deg] shadow-lg relative">
                        {renderBoardLights()}
                        <span className="absolute -top-6 -left-4 text-3xl rotate-[-15deg] z-20">🌙</span>
                        <h1 className="title-retro text-2xl md:text-3xl text-[#146b61] relative z-10">Mie-dNight</h1>
                    </div>
                </div>
                <div className="flex items-center flex-wrap justify-center gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-3 py-2 transition-all ${activeTab === tab.key 
                                ? 'bg-[#FDFBF6] text-[#146b61] border-4 border-[#0a3d38] -translate-y-1 shadow-[4px_4px_0px_#0a3d38] font-black' 
                                : 'text-[#FDFBF6] hover:bg-[#1c8a7e] font-bold'
                            } title-retro text-[10px] md:text-xs`}
                        >
                            {tab.key === 'qayzan' ? '🏮 ' : ''}{tab.label}
                        </button>
                    ))}
                    {isMonitoring && (
                        <button onClick={onGoHome} className="ml-2 bg-orange-500 text-white p-2 border-2 border-white shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

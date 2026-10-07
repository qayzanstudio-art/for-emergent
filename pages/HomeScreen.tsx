
import React, { useState, useMemo } from 'react';
import type { Settings, DailyLog } from '../types';
import { Utils } from '../App';

interface HomeScreenProps {
    onStartSession: (date: string, initialExpense?: number) => void;
    showModal: (config: any) => void;
    settings: Settings;
    dailyLogs: DailyLog[];
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onStartSession, showModal, settings, dailyLogs }) => {
    const [selectedDate, setSelectedDate] = useState<string>(Utils.getTodayDateString());
    
    // State for expense modal
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseInput, setExpenseInput] = useState<string>('');

    const isDayClosed = useMemo(() => {
        if (!selectedDate) return false;
        return dailyLogs.some(log => log.date === selectedDate && log.isClosed);
    }, [selectedDate, dailyLogs]);

    const handleStartClick = () => {
        if (!selectedDate) return;
        
        if (isDayClosed) {
            onStartSession(selectedDate, 0);
        } else {
            setIsExpenseModalOpen(true);
        }
    };

    const confirmStartSession = () => {
        const cost = parseInt(expenseInput.replace(/\D/g, '')) || 0;
        onStartSession(selectedDate, cost);
        setIsExpenseModalOpen(false);
        setExpenseInput('');
    };

    const isDateSelected = !!selectedDate;
    const ramadhanGreen = settings.primaryColor;
    const cream = settings.secondaryColor;
    const fontOnGreen = Utils.getContrastYIQ(ramadhanGreen);
    const fontOnCream = Utils.getContrastYIQ(cream);

    const buttonStyle: React.CSSProperties = {
        backgroundColor: isDateSelected ? ramadhanGreen : cream,
        color: isDateSelected ? fontOnGreen : fontOnCream,
        borderColor: ramadhanGreen,
        transition: 'all 0.3s ease',
    };
    
    const monitoringButtonStyle: React.CSSProperties = {
        backgroundColor: '#d4af37', // Gold color for monitoring
        color: '#ffffff',
        borderColor: '#a38627',
        transition: 'all 0.3s ease',
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-secondary overflow-hidden"
            style={{ 
                backgroundImage: settings.backgroundImage ? `url('${settings.backgroundImage}')` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
             }}
        >
            {/* Floating Ramadhan Ornaments */}
            <div className="float-ornament top-10 left-10 text-6xl">🌙</div>
            <div className="float-ornament bottom-20 right-20 text-5xl" style={{ animationDelay: '1s' }}>⭐</div>
            <div className="float-ornament top-1/4 right-10 text-4xl" style={{ animationDelay: '2s' }}>🏮</div>
            <div className="float-ornament bottom-10 left-20 text-5xl" style={{ animationDelay: '1.5s' }}>🕌</div>

            <div className="w-full max-w-md text-center bg-secondary/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl relative border-4 border-dashed border-[#146b61]">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl">🥘</div>
                <h1 className="text-5xl font-bold mb-1 text-on-secondary" style={{ color: ramadhanGreen }}>Mie-dNight</h1>
                <p className="text-[#d4af37] font-black tracking-widest text-xs mb-6 uppercase">Marhaban ya Ramadhan 1446 H 🕌</p>
                <p className="text-on-secondary mb-8 font-medium">Pilih tanggal jualan untuk buka sesi Iftar/Sahur.</p>
                
                <div className="mb-8">
                    <label htmlFor="business-date" className="block text-sm font-medium text-on-secondary mb-2 uppercase tracking-tighter">Tanggal Sesi</label>
                    <input 
                        type="date"
                        id="business-date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-3 border-4 border-[#146b61] rounded-lg text-lg text-center font-bold focus:ring-primary focus:border-primary shadow-inner"
                        style={{ color: 'var(--color-text-on-secondary)'}}
                    />
                    <p className="text-[10px] mt-2 text-on-secondary opacity-70 italic">
                        *Jika sesi Sahur melewati tengah malam, tetap pilih tanggal mulainya sesi.
                    </p>
                </div>

                <button
                    onClick={handleStartClick}
                    disabled={!isDateSelected}
                    style={isDayClosed ? monitoringButtonStyle : buttonStyle}
                    className="w-full text-xl font-black py-4 rounded-lg border-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-[8px_8px_0px_rgba(20,107,97,0.3)] hover:shadow-xl transform transition hover:-translate-y-1 uppercase active:scale-95"
                >
                    {isDayClosed ? '📂 Buka Arsip Berkah' : '🌙 Mulai Sesi Berkah!'}
                </button>
                
                <div className="mt-6 flex justify-center gap-4 text-2xl opacity-50">
                    <span>✨</span><span>🕌</span><span>🥘</span>
                </div>
            </div>

            {/* EXPENSE MODAL OVERLAY */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm transform transition-all p-6 border-t-8 border-[#d4af37]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Modal Belanja 🥘</h3>
                            <span className="text-2xl">🏮</span>
                        </div>
                        <p className="text-gray-600 mb-4 text-sm">
                            Masukkan total pengeluaran belanja stok sebelum mulai sesi jualan. 
                            Digunakan untuk menghitung <strong>Laba Bersih</strong> harian.
                        </p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Belanja (Rp)</label>
                            <input 
                                type="number" 
                                autoFocus
                                value={expenseInput}
                                onChange={(e) => setExpenseInput(e.target.value)}
                                placeholder="0"
                                className="w-full text-3xl font-bold border-b-2 border-primary focus:outline-none text-center py-2 text-gray-800"
                            />
                            <p className="text-xs text-gray-400 mt-2 text-center">Isi 0 jika tidak ada pengeluaran belanja.</p>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsExpenseModalOpen(false)}
                                className="flex-1 py-3 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={confirmStartSession}
                                className="flex-1 py-3 rounded-lg font-bold text-white bg-[#146b61] hover:bg-[#0a3d38] transition shadow-lg flex items-center justify-center gap-2"
                            >
                                <span>Buka Kedai</span><span>🏮</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeScreen;

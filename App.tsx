
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Tab, AppData, Order, Transaction, InventoryItem, MenuItem, Settings, ModalState, ToastState, SummaryData, QayzanStudioData, OrderItem } from './types';
import { generateDailySummary, generateMenuIdeas } from './services/geminiService';
import KasirPage from './pages/KasirPage';
import PesananPage from './pages/PesananPage';
import LaporanPage from './pages/LaporanPage';
import PengaturanPage from './pages/PengaturanPage';
import HomeScreen from './pages/HomeScreen';
import { Header } from './components/Header';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';
import { SummaryReport } from './components/SummaryReport';
import QayzanStudioPage from './pages/QayzanStudioPage';

export const Utils = {
    formatCurrency: (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount),
    formatDate: (iso: string | null) => { if (!iso) return '-'; return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); },
    formatTime: (iso: string | null) => { if (!iso) return '-'; return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.',':'); },
    getTodayDateString: () => new Date().toISOString().slice(0, 10),
    getBusinessDateString: (dateInput: Date | string = new Date()): string => {
        const checkDate = new Date(dateInput);
        if (checkDate.getHours() < 6) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        return checkDate.toISOString().slice(0, 10);
    },
    getContrastYIQ: (hex: string) => {
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return ((r*299)+(g*587)+(b*114))/1000 >= 128 ? '#1A202C' : '#FFFFFF';
    },
    adjustColor: (color: string, percent: number) => {
        let f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
        return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
    },
    // Updated Ramadhan/Oriental Sound Synthesizer
    playSFX: (type: 'jagoan' | 'regular' | 'mubarak') => {
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();

            const createOud = (freq: number, startTime: number, duration: number, vol: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth'; // Slightly richer sound for oud-like feel
                osc.frequency.setValueAtTime(freq, startTime);
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000, startTime);
                filter.frequency.exponentialRampToValueAtTime(400, startTime + duration);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const createDrum = (startTime: number, vol: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, startTime);
                osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);
                gain.gain.setValueAtTime(vol, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.15);
            };

            const now = ctx.currentTime;

            if (type === 'jagoan') {
                // Festive Oriental Scale (Hijaz style)
                const tempo = 0.35;
                const notes = [
                    {f: 440.00, t: 0},       // A4
                    {f: 466.16, t: tempo},   // Bb4
                    {f: 554.37, t: tempo*2}, // C#5
                    {f: 587.33, t: tempo*3}, // D5
                    {f: 659.25, t: tempo*4}, // E5
                    {f: 554.37, t: tempo*5.5}, // C#5
                    {f: 466.16, t: tempo*6.5}  // Bb4
                ];
                notes.forEach(n => createOud(n.f, now + n.t, 0.8, 0.1));
                createDrum(now + 0.5, 0.15);
                createDrum(now + 1.2, 0.15);
            } 
            else if (type === 'mubarak') {
                const tempo = 0.4;
                const notes = [
                    {f: 329.63, t: 0},      // E4
                    {f: 440.00, t: tempo},  // A4
                    {f: 466.16, t: tempo*2},// Bb4
                    {f: 440.00, t: tempo*3} // A4
                ];
                notes.forEach(n => createOud(n.f, now + n.t, 1.0, 0.12));
            } 
            else {
                createOud(440.00, now, 0.4, 0.08);
            }
        } catch (e) { console.warn("Audio Context failed", e); }
    }
};

const getDefaultData = (): AppData => ({
    menu: [
        { id: 'menu-1', name: 'Mie Goreng', price: 12000, stockId: '', variants: ['Original', 'Cakalang', 'Rendang', 'Aceh'] },
        { id: 'menu-2', name: 'Mie Kuah', price: 12000, stockId: '', variants: ['Soto', 'Cakalang', 'Kari Ayam', 'Ayam Bawang'] },
        { id: 'menu-3', name: 'Mie Double', price: 18000, stockId: '', qty: 2 },
        { id: 'menu-4', name: 'Mie Bangladesh', price: 16000, stockId: '' },
        { id: 'menu-5', name: 'Mie Bangladesh Complete', price: 30000, stockId: '' },
        { id: 'menu-6', name: 'Nasi Ayam Panggang', price: 27000, stockId: '' },
        { id: 'menu-7', name: 'Chicken Steak BBQ', price: 32000, stockId: '' },
    ],
    toppings: [
        { id: 'top-1', name: 'Sosis', price: 4000, stockId: '' },
        { id: 'top-2', name: 'Pangsit', price: 1000, stockId: '' },
        { id: 'top-3', name: 'Bakso 2 pcs', price: 5000, stockId: '', qty: 2 },
        { id: 'top-4', name: 'Tahu', price: 2000, stockId: '' },
        { id: 'top-5', name: 'Telur Mata Sapi', price: 5000, stockId: '' },
        { id: 'top-6', name: 'Telur Dadar', price: 5000, stockId: '' },
    ],
    drinks: [ { id: 'drink-1', name: 'Air Mineral', price: 5000, stockId: '' } ],
    inventory: [],
    transactions: [], 
    expenses: [],
    settings: { primaryColor: '#146b61', secondaryColor: '#FDFBF6', backgroundImage: '' },
    dailyCash: [],
    dailyLogs: [],
    qayzanStudio: { daily: [], monthly: [], savingsBalance: 0 }
});

const getNewOrder = (): Order => ({
    id: null, items: [], customerName: '', payment: { status: 'Belum Bayar', method: 'Cash' }, createdAt: null, total: 0
});

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('kasir');
    const [businessDate, setBusinessDate] = useState<string | null>(() => localStorage.getItem('warmindoSessionDate') || null);
    const [summaryReportData, setSummaryReportData] = useState<SummaryData | null>(null);
    const [isQayzanUnlocked, setIsQayzanUnlocked] = useState(false);
    
    const [data, setData] = useState<AppData>(() => {
        const savedData = localStorage.getItem('warmindoAppData');
        if (savedData) return JSON.parse(savedData);
        return getDefaultData();
    });
    
    const [currentOrder, setCurrentOrder] = useState<Order>(getNewOrder());
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', body: null });
    const [toastState, setToastState] = useState<ToastState>({ isVisible: false, message: '' });

    const isTodayClosed = useMemo(() => {
        if (!businessDate) return true;
        return data.dailyLogs.find(log => log.date === businessDate)?.isClosed || false;
    }, [data.dailyLogs, businessDate]);

    useEffect(() => {
        const handler = setTimeout(() => {
            localStorage.setItem('warmindoAppData', JSON.stringify(data));
        }, 800);
        return () => clearTimeout(handler);
    }, [data]);

    useEffect(() => {
        if (businessDate) localStorage.setItem('warmindoSessionDate', businessDate);
        else localStorage.removeItem('warmindoSessionDate');
    }, [businessDate]);
    
    useEffect(() => {
        const { settings } = data;
        const root = document.documentElement;
        root.style.setProperty('--color-primary', settings.primaryColor);
        root.style.setProperty('--color-primary-dark', Utils.adjustColor(settings.primaryColor, -20));
        root.style.setProperty('--color-secondary', settings.secondaryColor);
        root.style.setProperty('--color-text-on-primary', Utils.getContrastYIQ(settings.primaryColor));
        root.style.setProperty('--color-text-on-secondary', Utils.getContrastYIQ(settings.secondaryColor));
    }, [data.settings]);

    const showToast = useCallback((message: string) => {
        setToastState({ message, isVisible: true });
        setTimeout(() => setToastState({ message: '', isVisible: false }), 3000);
    }, []);

    const showModal = useCallback((modalConfig: Omit<ModalState, 'isOpen'>) => {
        setModalState({ ...modalConfig, isOpen: true });
    }, []);

    const hideModal = useCallback(() => {
        setModalState(prev => ({...prev, isOpen: false}));
    }, []);
    
    const handleStartSession = (date: string, initialExpense: number = 0) => {
        setBusinessDate(date);
        if (initialExpense > 0) {
            setData(prev => ({
                ...prev,
                expenses: [...prev.expenses, { id: `start-exp-${date}`, date, description: 'Belanja Awal', amount: initialExpense }]
            }));
        }
        setActiveTab('kasir');
    };

    const handleCloseSummary = () => {
        setSummaryReportData(null);
        setBusinessDate(null);
    };

    const handleGoHome = () => {
        setBusinessDate(null);
    };

    const handleTabChange = (newTab: Tab) => {
        if (activeTab === 'qayzan' && newTab !== 'qayzan') setIsQayzanUnlocked(false);
        setActiveTab(newTab);
    };

    const handleCloseDay = useCallback(() => {
        if (!businessDate) return;
        const dailyTrx = data.transactions.filter(t => t.payment.status === 'Sudah Bayar' && t.businessDate === businessDate);
        const totalOmzet = dailyTrx.reduce((s, t) => s + t.total, 0);
        const summary: SummaryData = {
            date: businessDate,
            totalOmzet,
            cashSales: dailyTrx.filter(t => t.payment.method === 'Cash').reduce((s, t) => s + t.total, 0),
            qrisSales: dailyTrx.filter(t => t.payment.method === 'QRIS').reduce((s, t) => s + t.total, 0),
            transactions: dailyTrx,
        };
        setData(prev => {
            const newLogs = [...prev.dailyLogs];
            newLogs.push({ date: businessDate, isClosed: true, manualRevenue: totalOmzet, savingsDeposited: false });
            return { ...prev, dailyLogs: newLogs };
        });
        setSummaryReportData(summary);
    }, [businessDate, data]);

    const helpers = useMemo(() => ({
        getItemById: (type: keyof AppData, id: string) => (data[type] as any[]).find(i => i.id === id),
        showToast, showModal, hideModal, generateDailySummary, generateMenuIdeas,
        playSFX: Utils.playSFX
    }), [data, showToast, showModal, hideModal]);
    
    const renderPage = () => {
        const pageProps = { data, setData, currentOrder, setCurrentOrder, helpers, isTodayClosed, businessDate: businessDate! };
        switch (activeTab) {
            case 'kasir': return <KasirPage {...pageProps} />;
            case 'pesanan': return <PesananPage {...pageProps} setActiveTab={handleTabChange} handleCloseDay={handleCloseDay} />;
            case 'laporan': return <LaporanPage {...pageProps} />;
            case 'pengaturan': return <PengaturanPage {...pageProps} />;
            case 'qayzan': return <QayzanStudioPage {...pageProps} isUnlocked={isQayzanUnlocked} setIsUnlocked={setIsQayzanUnlocked} />;
            default: return <KasirPage {...pageProps} />;
        }
    };
    
    if (summaryReportData) return <SummaryReport data={summaryReportData} onClose={handleCloseSummary} />;
    if (!businessDate) return (
        <HomeScreen onStartSession={handleStartSession} showModal={showModal} settings={data.settings} dailyLogs={data.dailyLogs} />
    );
    
    return (
        <div className="min-h-screen flex flex-col bg-secondary/90">
            <style>{`
                .btn-retro {
                    border: 3px solid var(--color-primary);
                    box-shadow: 4px 4px 0px var(--color-primary);
                    transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.1s;
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 900;
                    text-transform: uppercase;
                    position: relative;
                }
                .btn-retro:active {
                    box-shadow: 0px 0px 0px var(--color-primary) !important;
                    transform: translate(4px, 4px) scale(0.95) !important;
                }
                .card-retro {
                    border: 4px solid var(--color-primary);
                    box-shadow: 8px 8px 0px var(--color-primary);
                    background-color: white;
                    background-image: var(--retro-grain);
                }
                .title-retro { font-family: 'Bungee Inline', cursive; text-transform: uppercase; }
                .tab-retro {
                    border-top: 3px solid var(--color-primary);
                    border-left: 3px solid var(--color-primary);
                    border-right: 3px solid var(--color-primary);
                    margin-bottom: -3px;
                    z-index: 10;
                    font-family: 'Bungee Inline', cursive;
                    font-size: 0.75rem;
                }
                .tab-retro.active {
                    background-color: var(--color-secondary);
                    color: var(--color-primary);
                    box-shadow: 4px -4px 0px var(--color-primary);
                }
            `}</style>
            <Header activeTab={activeTab} setActiveTab={handleTabChange} isMonitoring={isTodayClosed} onGoHome={handleGoHome} />
            <main className="container mx-auto p-4 flex-grow">
                {renderPage()}
            </main>
            <Modal {...modalState} onClose={hideModal} />
            <Toast {...toastState} />
        </div>
    );
};

export default App;

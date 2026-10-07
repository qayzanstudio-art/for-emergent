
import React, { useState, useMemo, useEffect } from 'react';
import type { AppData, Transaction, Order, Tab, OrderItem } from '../types';
import { Utils } from '../App';

interface PesananPageProps {
    data: AppData;
    setData: React.Dispatch<React.SetStateAction<AppData>>;
    setCurrentOrder: React.Dispatch<React.SetStateAction<Order>>;
    setActiveTab: (tab: Tab) => void;
    helpers: {
        showModal: (config: any) => void;
        showToast: (message: string) => void;
    };
    isTodayClosed: boolean;
    handleCloseDay: () => void;
    businessDate: string;
}

const PesananPage: React.FC<PesananPageProps> = ({ data, setData, setCurrentOrder, setActiveTab, helpers, isTodayClosed, handleCloseDay, businessDate }) => {
    const [filters, setFilters] = useState({ 
        date: businessDate, 
        status: 'Semua', 
        method: 'Semua', 
        name: '', 
        delivered: 'Semua' 
    });
    
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (businessDate) {
            setFilters(prev => ({ ...prev, date: businessDate }));
        }
    }, [businessDate]);

    const filteredTransactions = useMemo(() => {
        let transactions = [...data.transactions];
        
        if (filters.date) {
            transactions = transactions.filter(t => {
                if (t.businessDate) return t.businessDate === filters.date;
                if (!t.createdAt) return false;
                return Utils.getBusinessDateString(t.createdAt) === filters.date;
            });
        }

        if (filters.status !== 'Semua') transactions = transactions.filter(t => t.payment.status === filters.status);
        if (filters.method !== 'Semua') transactions = transactions.filter(t => t.payment.method === filters.method);
        if (filters.name) transactions = transactions.filter(t => t.customerName.toLowerCase().includes(filters.name.toLowerCase()));
        if (filters.delivered !== 'Semua') {
            const isFullyDelivered = filters.delivered === 'Sudah Diantar';
            transactions = transactions.filter(t => {
                const allItemsDelivered = t.items.every(i => i.isDelivered);
                return isFullyDelivered ? allItemsDelivered : !allItemsDelivered;
            });
        }

        transactions.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        return transactions;
    }, [data.transactions, filters]);
    
    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const handleEdit = (transaction: Transaction) => {
        setCurrentOrder(JSON.parse(JSON.stringify(transaction)));
        setActiveTab('kasir');
    };
    
    const handleToggleItemDelivered = (transactionId: string, itemIndex: number) => {
        setData(prevData => {
            const newTransactions = prevData.transactions.map(t => {
                if (t.id === transactionId) {
                    const newItems = [...t.items];
                    newItems[itemIndex] = { ...newItems[itemIndex], isDelivered: !newItems[itemIndex].isDelivered };
                    return { ...t, items: newItems };
                }
                return t;
            });
            return { ...prevData, transactions: newTransactions };
        });
    };

    const handleMarkAllDelivered = (transactionId: string) => {
        setData(prevData => {
            const newTransactions = prevData.transactions.map(t => {
                if (t.id === transactionId) {
                    const newItems = t.items.map(i => ({...i, isDelivered: true}));
                    return { ...t, items: newItems };
                }
                return t;
            });
            return { ...prevData, transactions: newTransactions };
        });
        helpers.showToast('Semua pesanan di meja ini selesai.');
    };

    const handleCancel = (transactionId: string) => {
        helpers.showModal({
            title: 'Konfirmasi Pembatalan',
            body: <p className="text-gray-800">Yakin membatalkan pesanan ini?</p>,
            confirmText: 'Ya, Batalkan',
            onConfirm: () => {
                setData(prevData => {
                    const newTransactions = prevData.transactions.filter(t => t.id !== transactionId);
                    helpers.showToast('Pesanan dibatalkan.');
                    return { ...prevData, transactions: newTransactions };
                });
            }
        });
    };
    
    const confirmCloseDay = () => {
        helpers.showModal({
            title: 'Konfirmasi Tutup Hari Ini',
            body: (
                <div className="text-gray-800">
                    <p className="mb-2">Anda yakin ingin menutup penjualan untuk hari ini?</p>
                    <p className="text-sm font-semibold">Tindakan ini akan memfinalisasi laporan penjualan hari ini dan tidak dapat dibatalkan.</p>
                </div>
            ),
            confirmText: 'Ya, Tutup Hari Ini',
            onConfirm: handleCloseDay,
        });
    };

    const calculateKitchenSummary = (items: OrderItem[]) => {
        const summary: { [key: string]: number } = {};
        
        items.forEach(item => {
            const lowerName = item.name.toLowerCase();
            if (lowerName.includes('bangladesh')) {
                const key = "TOTAL MIE BANGLADESH";
                summary[key] = (summary[key] || 0) + item.quantity;
            }
            item.selectedToppings?.forEach(top => {
                const currentQty = summary[top.name] || 0;
                summary[top.name] = currentQty + top.quantity;
            });
        });
        return summary;
    };

    const getTimeElapsed = (isoString: string | null) => {
        if (!isoString) return '';
        const created = new Date(isoString);
        const diffInMinutes = Math.floor((currentTime.getTime() - created.getTime()) / 60000);
        
        if (diffInMinutes < 1) return 'Baru saja';
        if (diffInMinutes < 60) return `${diffInMinutes} mnt lalu`;
        const hours = Math.floor(diffInMinutes / 60);
        const mins = diffInMinutes % 60;
        return `${hours}j ${mins}m lalu`;
    };

    return (
        <div className="bg-transparent text-on-secondary pb-20 overflow-x-hidden">
            {/* Header Control */}
            <div className="bg-white p-4 rounded-lg card-shadow mb-4 flex flex-col md:flex-row justify-between items-center gap-4 border-t-4 border-primary sticky top-20 z-10 shadow-md">
                <div className="w-full md:w-auto">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">Antrian Dapur</h2>
                    <p className="text-xs text-gray-500">Total: {filteredTransactions.length} pesanan</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                     <button
                        onClick={confirmCloseDay}
                        disabled={isTodayClosed}
                        className="flex-1 md:flex-none bg-gray-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-black transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm text-sm"
                    >
                        {isTodayClosed ? '🔒 Tutup' : '🛑 Tutup Hari Ini'}
                    </button>
                </div>
            </div>

            {/* Filters - Compact on Mobile */}
            <div className="bg-white p-3 rounded-lg card-shadow mb-4">
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 text-gray-800">
                    <div>
                        <label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">Tgl Sesi</label>
                        <input type="date" value={filters.date} onChange={e => handleFilterChange('date', e.target.value)} className="mt-1 w-full border-gray-300 rounded text-xs md:text-sm font-bold bg-yellow-50 py-1" />
                    </div>
                    <div><label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">Bayar</label><select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="mt-1 w-full border-gray-300 rounded text-xs md:text-sm py-1"><option>Semua</option><option>Sudah Bayar</option><option>Belum Bayar</option></select></div>
                    <div><label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">Antar</label><select value={filters.delivered} onChange={e => handleFilterChange('delivered', e.target.value)} className="mt-1 w-full border-gray-300 rounded text-xs md:text-sm py-1"><option>Semua</option><option>Sudah Diantar</option><option>Belum Diantar</option></select></div>
                    <div><label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">Metode</label><select value={filters.method} onChange={e => handleFilterChange('method', e.target.value)} className="mt-1 w-full border-gray-300 rounded text-xs md:text-sm py-1"><option>Semua</option><option>Cash</option><option>QRIS</option></select></div>
                    <div className="col-span-2 md:col-span-1"><label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">Cari</label><input type="text" value={filters.name} onChange={e => handleFilterChange('name', e.target.value)} placeholder="Nama / Meja..." className="mt-1 w-full border-gray-300 rounded text-xs md:text-sm py-1" /></div>
                </div>
            </div>

            {/* VERTICAL LIST LAYOUT */}
            <div className="flex flex-col space-y-4 w-full mx-auto">
                {filteredTransactions.length > 0 ? filteredTransactions.map((t, index) => {
                    const allDelivered = t.items.every(i => i.isDelivered);
                    const kitchenSummary = calculateKitchenSummary(t.items);
                    const hasSummary = Object.keys(kitchenSummary).length > 0;
                    const isPaid = t.payment.status === 'Sudah Bayar';
                    const timeElapsed = getTimeElapsed(t.createdAt);
                    const queueNumber = filteredTransactions.length - index;

                    return (
                        <div key={t.id} className={`relative flex flex-col md:flex-row bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${allDelivered ? 'opacity-70 border border-gray-200' : 'border-l-8 border-primary'}`}>
                            
                            {/* SEQUENCE NUMBER */}
                            <div className={`p-2 md:p-4 flex flex-row md:flex-col items-center justify-between md:justify-center gap-2 md:w-24 flex-shrink-0 ${allDelivered ? 'bg-gray-100' : 'bg-primary text-on-primary'}`}>
                                <div className="text-center flex items-center md:block gap-2">
                                    <span className="text-[10px] md:text-xs uppercase font-bold opacity-70">Antrian</span>
                                    <div className="text-xl md:text-3xl font-black">#{queueNumber}</div>
                                </div>
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} md:mt-2`}>
                                    {isPaid ? 'Lunas' : 'Belum'}
                                </div>
                            </div>

                            {/* MAIN CONTENT */}
                            <div className="flex-grow p-3 md:p-4 md:border-r border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight mb-1">{t.customerName || 'Tanpa Nama'}</h3>
                                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                                            <span className="font-mono bg-gray-100 px-2 rounded">{Utils.formatTime(t.createdAt)}</span>
                                            <span className="font-semibold text-orange-600">{timeElapsed}</span>
                                        </div>
                                    </div>
                                    <div className="text-right md:hidden">
                                        <span className="font-bold text-primary">{Utils.formatCurrency(t.total)}</span>
                                    </div>
                                </div>

                                {/* ITEM LIST */}
                                <div className="space-y-2">
                                    {t.items.map((item, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`relative p-2 rounded border-l-4 ${
                                                item.isDelivered 
                                                ? 'bg-gray-50 border-green-400' 
                                                : 'bg-white border-red-400 shadow-sm ring-1 ring-black/5'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!item.isDelivered} 
                                                    onChange={() => handleToggleItemDelivered(t.id, idx)} 
                                                    className="mt-1 w-5 h-5 text-primary rounded focus:ring-primary cursor-pointer border-2 border-gray-300 flex-shrink-0"
                                                />
                                                <div className="flex-grow min-w-0">
                                                    <div className={`font-bold text-sm md:text-lg leading-tight ${item.isDelivered ? 'text-gray-400 line-through decoration-2' : 'text-gray-900'}`}>
                                                        {item.quantity}x {item.name}
                                                    </div>
                                                    {item.selectedVariant && (
                                                        <div className={`text-xs md:text-sm font-semibold italic ${item.isDelivered ? 'text-gray-400' : 'text-primary'}`}>
                                                            {item.selectedVariant}
                                                        </div>
                                                    )}
                                                    {item.selectedToppings && item.selectedToppings.length > 0 && (
                                                        <div className={`mt-1 flex flex-wrap gap-1 ${item.isDelivered ? 'opacity-50' : ''}`}>
                                                            {item.selectedToppings.map((top, tIdx) => (
                                                                <span key={tIdx} className="text-[10px] md:text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200 font-medium">
                                                                    + {top.quantity} {top.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* KITCHEN SUMMARY */}
                                {hasSummary && !allDelivered && (
                                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs md:text-sm">
                                        <div className="text-yellow-800 font-bold uppercase tracking-wide mb-1 text-[10px]">Ringkasan Masak</div>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(kitchenSummary).map(([name, qty]) => (
                                                <span key={name} className="px-2 py-0.5 rounded font-bold shadow-sm bg-orange-100 text-orange-800 border border-orange-200">
                                                    {name.replace('TOTAL ', '')}: {qty}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ACTIONS */}
                            <div className="bg-gray-50 p-3 md:w-48 flex flex-row md:flex-col justify-between items-center md:items-stretch border-t md:border-t-0 gap-2">
                                <div className="text-right hidden md:block mb-2">
                                    <div className="text-xl font-bold text-primary">{Utils.formatCurrency(t.total)}</div>
                                    <div className="text-xs text-gray-400">{t.payment.method}</div>
                                </div>

                                <div className="flex gap-2 w-full md:flex-col">
                                    {!allDelivered ? (
                                        <button onClick={() => handleMarkAllDelivered(t.id)} className="flex-grow bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded shadow transition text-sm flex items-center justify-center gap-1">
                                            <span>Selesai</span>
                                        </button>
                                    ) : (
                                        <div className="flex-grow text-center py-2 bg-green-100 text-green-800 rounded font-bold border border-green-200 text-sm">
                                            ✓ DIANTAR
                                        </div>
                                    )}
                                    
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(t)} className="flex-1 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 py-2 rounded font-semibold flex justify-center items-center">
                                            ✏️
                                        </button>
                                        <button onClick={() => handleCancel(t.id)} className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded font-semibold flex justify-center items-center">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-white rounded-xl card-shadow">
                        <p className="text-lg font-bold">Tidak ada antrian</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PesananPage;

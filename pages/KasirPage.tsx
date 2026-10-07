
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { AppData, Order, MenuItem, Topping, Drink, OrderItem, SelectedTopping, Transaction } from '../types';
import { Utils } from '../App';

interface KasirPageProps {
    data: AppData;
    setData: React.Dispatch<React.SetStateAction<AppData>>;
    currentOrder: Order;
    setCurrentOrder: React.Dispatch<React.SetStateAction<Order>>;
    helpers: { 
        showToast: (message: string) => void;
        showModal: (config: any) => void;
        playSFX: (type: 'jagoan' | 'regular' | 'mubarak') => void;
    };
    isTodayClosed: boolean;
    businessDate: string;
}

const getNewOrder = (): Order => ({
    id: null, items: [], customerName: '', payment: { status: 'Belum Bayar', method: 'Cash' }, createdAt: null, total: 0
});

const KasirPage: React.FC<KasirPageProps> = ({ data, setData, currentOrder, setCurrentOrder, helpers, isTodayClosed, businessDate }) => {
    const { showToast, showModal, playSFX } = helpers;
    const [builderOpen, setBuilderOpen] = useState(false);
    const [buildingItem, setBuildingItem] = useState<MenuItem | null>(null);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    const [selectedToppings, setSelectedToppings] = useState<SelectedTopping[]>([]);
    const [itemQuantity, setItemQuantity] = useState<number>(1);
    const [doubleStep, setDoubleStep] = useState<'type' | 'flavor' | 'toppings' | null>(null);
    const [doubleTypeSelection, setDoubleTypeSelection] = useState<string | null>(null);

    const calculateItemPrice = (item: any) => {
        const basePrice = item.price || 0;
        const toppingsPrice = item.selectedToppings?.reduce((sum: number, t: any) => sum + (t.price * t.quantity), 0) || 0;
        return (basePrice + toppingsPrice) * (item.quantity || 1);
    };

    const calculateOrderTotal = useCallback((items: OrderItem[]) => {
        return items.reduce((sum, item) => sum + calculateItemPrice(item), 0);
    }, []);

    const isExistingOrder = useMemo(() => {
        return !!currentOrder.id && data.transactions.some(t => t.id === currentOrder.id);
    }, [data.transactions, currentOrder.id]);

    const isSpecialItem = (item: MenuItem) => {
        const name = item.name.toLowerCase();
        return name.includes('complete') || name.includes('nasi') || name.includes('bangladesh') || name.includes('steak');
    };

    const commitToOrder = useCallback((itemToAdd: MenuItem | Topping | Drink, variant?: string, toppings: SelectedTopping[] = [], quantity: number = 1, editIndex: number | null = null) => {
        setCurrentOrder(prevOrder => {
            let orderToUpdate = { ...prevOrder };
            if (!orderToUpdate.id && !isTodayClosed) {
                orderToUpdate.createdAt = new Date().toISOString(); 
                orderToUpdate.id = `TRX-${Date.now()}`;
                orderToUpdate.businessDate = businessDate;
            }
            const newItemObj: OrderItem = { ...itemToAdd, quantity, selectedVariant: variant, selectedToppings: toppings, isDelivered: false };
            let newItems = [...orderToUpdate.items];
            
            if (editIndex !== null) {
                newItems[editIndex] = newItemObj;
            } else {
                const toppingsKey = toppings.sort((a, b) => a.id.localeCompare(b.id)).map(t => `${t.id}:${t.quantity}`).join(',');
                const existingIdx = newItems.findIndex(i => i.id === itemToAdd.id && i.selectedVariant === variant && (i.selectedToppings?.map(t=>`${t.id}:${t.quantity}`).join(',') || '') === toppingsKey && !i.isDelivered);
                if (existingIdx > -1) newItems[existingIdx].quantity += quantity;
                else newItems.push(newItemObj);
            }
            return { ...orderToUpdate, items: newItems, total: calculateOrderTotal(newItems), businessDate };
        });
    }, [isTodayClosed, businessDate, calculateOrderTotal, setCurrentOrder]);

    const handleItemClick = (item: any) => {
        if (isTodayClosed) { showToast('Monitoring Only.'); return; }
        const isJagoan = isSpecialItem(item);
        playSFX(isJagoan ? 'jagoan' : 'regular');
        const isMain = data.menu.some(m => m.id === item.id);
        
        // Items that skip the builder and commit immediately
        if (!isMain || item.name.toLowerCase().includes('nasi')) { 
            commitToOrder(item); 
            return; 
        }

        // Everything else (Regular Mie, Bangladesh, Steak, Complete) goes to builder
        setEditingItemIndex(null);
        setBuildingItem(item);
        setSelectedToppings([]);
        setSelectedVariant(null);
        setItemQuantity(1);
        if (item.name.toLowerCase().includes('double')) { 
            setDoubleStep('type'); 
            setDoubleTypeSelection(null); 
        } else { 
            setDoubleStep(null); 
        }
        setBuilderOpen(true);
    };

    const handleEditItemInCart = (idx: number) => {
        const item = currentOrder.items[idx];
        const isMain = data.menu.some(m => m.id === item.id);
        if (!isMain || item.name.toLowerCase().includes('nasi')) { 
            showToast('Item ini hanya bisa diubah jumlahnya.'); 
            return; 
        }
        playSFX('regular');
        setEditingItemIndex(idx);
        setBuildingItem(item as MenuItem);
        setSelectedVariant(item.selectedVariant || null);
        setSelectedToppings(item.selectedToppings || []);
        setItemQuantity(item.quantity);
        setDoubleStep(null);
        setBuilderOpen(true);
    };

    const finalizeOrder = () => {
        const wasExisting = isExistingOrder;
        const isClosingVisit = wasExisting && currentOrder.payment.status === 'Sudah Bayar';
        
        setData(prev => {
            const existingIdx = prev.transactions.findIndex(t => t.id === currentOrder.id);
            let updatedTrx = [...prev.transactions];
            const finalOrder = {
                ...currentOrder,
                id: currentOrder.id || `TRX-${Date.now()}`,
                businessDate: businessDate,
                createdAt: currentOrder.createdAt || new Date().toISOString()
            } as Transaction;
            if (existingIdx > -1) updatedTrx[existingIdx] = finalOrder;
            else updatedTrx.unshift(finalOrder);
            return { ...prev, transactions: updatedTrx };
        });
        setCurrentOrder(getNewOrder());
        showToast(wasExisting ? 'Pesanan Berhasil Diupdate!' : 'Pesanan Berhasil Dicatat!');
        
        showModal({
            title: isClosingVisit ? 'BARAKALLAH! 🏮' : (wasExisting ? 'UPDATE BERHASIL! ⭐' : 'PESANAN MASUK! 🌙'),
            body: (
                <div className="text-center py-6">
                    <div className="text-6xl mb-4 animate-bounce">{isClosingVisit ? '🕌' : '🥘'}</div>
                    <p className="title-retro text-2xl text-[#146b61] mb-2">
                        {isClosingVisit ? 'Alhamdulillah!' : 'Siap diproses...'}
                    </p>
                    <p className="retro-typewriter text-gray-600 px-4">
                        {isClosingVisit 
                            ? 'Semoga puas dengan takjil kami. Sampai jumpa di waktu buka berikutnya!' 
                            : (wasExisting 
                                ? 'Update pesanan sudah diteruskan ke dapur.' 
                                : 'Pesanan sudah masuk antrian dapur.'
                            ) + ' Mohon ditunggu ya kak!'
                        }
                    </p>
                    <div className="mt-6 flex justify-center gap-2 text-xl opacity-60">
                        {isClosingVisit ? (
                            <><span>🌙</span><span>✨</span><span>🏮</span></>
                        ) : (
                            <><span>⭐</span><span>✨</span><span>🥘</span></>
                        )}
                    </div>
                </div>
            ),
            confirmText: isClosingVisit ? 'SAMA-SAMA! 👋' : 'OKE SIAP! 🚀',
            onConfirm: () => {}
        });
    };

    const handleProcessOrder = () => {
        if (currentOrder.items.length === 0) return;
        if (currentOrder.payment.status === 'Sudah Bayar') {
            const customer = currentOrder.customerName || 'Pelanggan';
            const total = Utils.formatCurrency(currentOrder.total);
            const method = currentOrder.payment.method;
            showModal({
                title: `Konfirmasi Pembayaran ${method} 💵`,
                body: <p className="text-gray-800">Yakin pembayaran <strong>{method}</strong> dari <strong>{customer}</strong> sebesar <strong>{total}</strong> sudah diterima?</p>,
                confirmText: 'Ya, Sudah Terima',
                onConfirm: finalizeOrder
            });
            return;
        }
        finalizeOrder();
    };

    const handleBuilderFinish = () => {
        if (buildingItem) {
            playSFX('regular');
            commitToOrder(buildingItem, selectedVariant || undefined, selectedToppings, itemQuantity, editingItemIndex);
            setBuilderOpen(false);
            setEditingItemIndex(null);
            setBuildingItem(null);
        }
    };

    const handleCompleteMenuEggSelection = (eggName: string) => {
        if (!buildingItem) return;
        playSFX('mubarak');
        const bundleNames = ['Sosis', 'Pangsit', 'Bakso 2 pcs', 'Tahu'];
        const autoToppings: SelectedTopping[] = bundleNames.map(name => {
            const t = data.toppings.find(top => top.name === name);
            return t ? { ...t, quantity: 1, price: 0 } : null;
        }).filter(Boolean) as SelectedTopping[];
        const selectedEgg = data.toppings.find(t => t.name === eggName);
        if (selectedEgg) autoToppings.push({ ...selectedEgg, quantity: 1, price: 0 });
        commitToOrder(buildingItem, eggName, autoToppings, 1, editingItemIndex);
        setBuilderOpen(false);
        setBuildingItem(null);
        setEditingItemIndex(null);
        showToast(`${buildingItem.name} + ${eggName} siap!`);
    };

    const handleSteakSideSelection = (side: string) => {
        if (!buildingItem) return;
        playSFX('mubarak');
        commitToOrder(buildingItem, side, [], 1, editingItemIndex);
        setBuilderOpen(false);
        setBuildingItem(null);
        setEditingItemIndex(null);
        showToast(`${buildingItem.name} + ${side} siap!`);
    };

    const updateBuilderToppingQty = (topping: Topping, delta: number) => {
        if (delta > 0) playSFX('regular');
        setSelectedToppings(prev => {
            const idx = prev.findIndex(t => t.id === topping.id);
            const newQty = (idx > -1 ? prev[idx].quantity : 0) + delta;
            if (newQty <= 0) return prev.filter(t => t.id !== topping.id);
            if (idx > -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], quantity: newQty };
                return updated;
            }
            return [...prev, { ...topping, quantity: newQty }];
        });
    };

    const currentBuildingSubtotal = useMemo(() => {
        if (!buildingItem) return 0;
        const toppingsPrice = selectedToppings.reduce((sum, t) => sum + (t.price * t.quantity), 0);
        return (buildingItem.price + toppingsPrice) * itemQuantity;
    }, [buildingItem, selectedToppings, itemQuantity]);

    const renderMenuSection = () => (
        <div className="space-y-8">
            <div className="card-retro p-6 relative overflow-hidden border-[#d4af37] border-double border-8">
                <div className="absolute top-0 right-0 bg-yellow-400 p-2 border-l-4 border-b-4 border-[#146b61] title-retro text-xs rotate-2 shadow-md">REKOMENDASI IFTAR 🌙</div>
                <h2 className="title-retro text-2xl mb-6 text-[#146b61] border-b-4 border-dashed border-[#d4af37] pb-2 text-center md:text-left">⭐ MIEDNIGHT SPESIAL</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.menu.filter(m => isSpecialItem(m)).map(item => {
                        const name = item.name.toLowerCase();
                        const isRice = name.includes('nasi');
                        const isSteak = name.includes('steak');
                        return (
                            <button key={item.id} onClick={() => handleItemClick(item)} className="btn-retro p-6 bg-[#146b61] text-[#FDFBF6] flex flex-col items-center justify-center gap-2 group">
                                <span className="text-3xl group-hover:scale-125 transition-transform">{isRice ? '🍗' : (isSteak ? '🥩' : '🍜')}</span>
                                <span className="title-retro text-lg text-center leading-tight">{item.name}</span>
                                <span className="bg-[#FDFBF6] text-[#146b61] px-2 py-1 text-sm font-black mt-2">{Utils.formatCurrency(item.price)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="card-retro p-6">
                <h2 className="title-retro text-xl mb-4 text-[#146b61]">🍜 MENU MIE 🏮</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {data.menu.filter(m => !isSpecialItem(m)).map(item => (
                        <button key={item.id} onClick={() => handleItemClick(item)} className="btn-retro p-3 bg-white text-[#146b61] flex flex-col items-center border-dashed border-2">
                            <span className="font-black text-sm text-center leading-tight">{item.name}</span>
                            <span className="text-xs opacity-70 mt-1">{Utils.formatCurrency(item.price)}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="card-retro p-6 bg-[#fefce8]">
                <h2 className="title-retro text-xl mb-4 text-[#146b61]">➕ ADD-ONS / TOPPING ⭐</h2>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {data.toppings.map(item => (
                        <button key={item.id} onClick={() => handleItemClick(item)} className="btn-retro p-2 bg-[#FDFBF6] text-[#146b61] text-[10px] font-black border-dotted">
                            {item.name}
                            <span className="block text-[8px] opacity-60">{Utils.formatCurrency(item.price)}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderCart = () => (
        <div className="card-retro p-4 bg-[#f8f5e4] sticky top-24 border-double border-8 border-[#146b61]">
            <h2 className="title-retro text-xl mb-4 border-b-4 border-[#d4af37] pb-2 text-center">ORDER RECEIPT 🏮</h2>
            <div className="mb-4">
                <label className="title-retro text-[10px] text-gray-500">CUSTOMER NAME / TABLE</label>
                <input type="text" value={currentOrder.customerName} onChange={e => setCurrentOrder(p=>({...p, customerName: e.target.value}))} className="w-full bg-transparent border-b-2 border-[#146b61] retro-typewriter text-lg focus:outline-none" placeholder="..." />
            </div>
            <div className="space-y-4 max-h-[35vh] overflow-y-auto mb-6 pr-2 retro-typewriter">
                {currentOrder.items.length === 0 ? (
                    <p className="text-center text-gray-400 italic py-8">Belum ada pesanan...</p>
                ) : currentOrder.items.map((item, idx) => (
                    <div key={idx} className="border-b border-[#146b61] border-dotted pb-2 group">
                        <div className="flex justify-between items-start font-bold">
                            <span className="text-sm">{item.quantity}x {item.name} {item.selectedVariant && `(${item.selectedVariant})`}</span>
                            <span className="text-sm">{Utils.formatCurrency(calculateItemPrice(item))}</span>
                        </div>
                        {item.selectedToppings?.map((t, ti) => (
                            <div key={ti} className="text-[10px] pl-4 text-gray-600 flex justify-between italic">
                                <span>+ {t.quantity} {t.name}</span>
                                <span>{Utils.formatCurrency(t.price * t.quantity)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center mt-2">
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    const newItems = [...currentOrder.items];
                                    newItems[idx].quantity = Math.max(0, newItems[idx].quantity - 1);
                                    if (newItems[idx].quantity === 0) newItems.splice(idx, 1);
                                    setCurrentOrder(p => ({...p, items: newItems, total: calculateOrderTotal(newItems)}));
                                }} className="bg-red-100 text-red-600 w-8 h-8 flex items-center justify-center rounded border-2 border-red-200 font-black">-</button>
                                <button onClick={() => {
                                    playSFX('regular');
                                    const newItems = [...currentOrder.items];
                                    newItems[idx].quantity += 1;
                                    setCurrentOrder(p => ({...p, items: newItems, total: calculateOrderTotal(newItems)}));
                                }} className="bg-green-100 text-green-600 w-8 h-8 flex items-center justify-center rounded border-2 border-green-200 font-black">+</button>
                            </div>
                            <button onClick={() => handleEditItemInCart(idx)} className="bg-blue-100 text-blue-600 px-3 py-1 rounded border-2 border-blue-200 font-bold text-xs hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1">✏️ EDIT</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="border-t-4 border-[#146b61] pt-4 space-y-6">
                <div className="flex justify-between title-retro text-2xl bg-yellow-100 p-2 border-2 border-[#146b61]"><span>TOTAL</span><span>{Utils.formatCurrency(currentOrder.total)}</span></div>
                <div className="grid grid-cols-1 gap-4 bg-white/50 p-3 border-2 border-dashed border-[#146b61]">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setCurrentOrder(p => ({...p, payment: {...p.payment, method: 'Cash'}}))} className={`py-2 px-1 border-2 title-retro text-[10px] transition-all ${currentOrder.payment.method === 'Cash' ? 'bg-[#146b61] text-white border-[#146b61] shadow-[3px_3px_0px_#0a3d38]' : 'bg-white text-[#146b61] border-gray-300'}`}>💵 CASH</button>
                        <button onClick={() => setCurrentOrder(p => ({...p, payment: {...p.payment, method: 'QRIS'}}))} className={`py-2 px-1 border-2 title-retro text-[10px] transition-all ${currentOrder.payment.method === 'QRIS' ? 'bg-[#146b61] text-white border-[#146b61] shadow-[3px_3px_0px_#0a3d38]' : 'bg-white text-[#146b61] border-gray-300'}`}>📱 QRIS</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setCurrentOrder(p => ({...p, payment: {...p.payment, status: 'Sudah Bayar'}}))} className={`py-2 px-1 border-2 title-retro text-[10px] transition-all ${currentOrder.payment.status === 'Sudah Bayar' ? 'bg-green-600 text-white border-green-800 shadow-[3px_3px_0px_#064e3b]' : 'bg-white text-green-600 border-gray-300'}`}>✓ LUNAS</button>
                        <button onClick={() => setCurrentOrder(p => ({...p, payment: {...p.payment, status: 'Belum Bayar'}}))} className={`py-2 px-1 border-2 title-retro text-[10px] transition-all ${currentOrder.payment.status === 'Belum Bayar' ? 'bg-red-600 text-white border-red-800 shadow-[3px_3px_0px_#7f1d1d]' : 'bg-white text-red-600 border-gray-300'}`}>⌛ BELUM</button>
                    </div>
                </div>
                <button onClick={handleProcessOrder} className="w-full btn-retro py-4 bg-[#146b61] text-[#FDFBF6] text-xl disabled:opacity-50">
                    {isExistingOrder ? 'UPDATE PESANAN ⭐' : 'PESAN SEKARANG ! 🚀'}
                </button>
                <button onClick={() => setCurrentOrder(getNewOrder())} className="w-full text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest text-center mt-2">BATALKAN PESANAN</button>
            </div>
        </div>
    );

    const renderBuilderModal = () => {
        if (!builderOpen || !buildingItem) return null;
        const itemName = buildingItem.name.toLowerCase();
        const isEditMode = editingItemIndex !== null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-md">
                <div className="card-retro w-full max-w-4xl bg-[#FDFBF6] p-0 flex flex-col max-h-[95vh]">
                    <div className="bg-[#146b61] text-[#FDFBF6] p-4 flex justify-between items-center">
                        <h3 className="title-retro text-lg">{isEditMode ? '✏️ EDIT PESANAN 🥘' : '🍜 PILIHAN MENU 🌙'}</h3>
                        <button onClick={() => { setBuilderOpen(false); setEditingItemIndex(null); }} className="text-2xl font-black">&times;</button>
                    </div>
                    <div className="p-4 md:p-6 overflow-y-auto flex-grow">
                        <div className="mb-4 bg-yellow-50 p-3 border-2 border-[#146b61] flex justify-between items-center">
                            <span className="title-retro text-sm">{buildingItem.name}</span><span className="font-black text-[#146b61]">{Utils.formatCurrency(buildingItem.price)}</span>
                        </div>
                        {itemName.includes('steak') ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto py-8 text-center">
                                <h4 className="md:col-span-2 title-retro text-xl mb-4 text-[#146b61]">PILIH KARBOHIDRAT 🥩</h4>
                                <button onClick={() => handleSteakSideSelection('Nasi')} className="btn-retro p-8 bg-white text-[#146b61] flex flex-col items-center gap-4 group">
                                    <span className="text-5xl group-hover:scale-110 transition-transform">🍚</span><span className="title-retro text-xl">NASI</span>
                                </button>
                                <button onClick={() => handleSteakSideSelection('Kentang')} className="btn-retro p-8 bg-white text-[#146b61] flex flex-col items-center gap-4 group">
                                    <span className="text-5xl group-hover:scale-110 transition-transform">🍟</span><span className="title-retro text-xl">KENTANG</span>
                                </button>
                            </div>
                        ) : itemName.includes('complete') ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto py-8 text-center">
                                <h4 className="md:col-span-2 title-retro text-xl mb-4 text-[#146b61]">PILIH JENIS TELUR (AUTO-BUNDLE)</h4>
                                <button onClick={() => handleCompleteMenuEggSelection('Telur Dadar')} className="btn-retro p-8 bg-yellow-400 text-[#146b61] flex flex-col items-center gap-4 group">
                                    <span className="text-5xl group-hover:scale-110 transition-transform">🍳</span><span className="title-retro text-xl">TELUR DADAR</span>
                                </button>
                                <button onClick={() => handleCompleteMenuEggSelection('Telur Mata Sapi')} className="btn-retro p-8 bg-orange-400 text-[#146b61] flex flex-col items-center gap-4 group">
                                    <span className="text-5xl group-hover:scale-110 transition-transform">🍳</span><span className="title-retro text-xl">MATA SAPI</span>
                                </button>
                            </div>
                        ) : doubleStep === 'type' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto py-8 text-center">
                                <h4 className="md:col-span-2 title-retro text-xl mb-4 text-[#146b61]">PILIH BASIS MIE</h4>
                                <button onClick={() => { playSFX('regular'); setDoubleTypeSelection('Mie Goreng'); setDoubleStep('flavor'); }} className="btn-retro p-8 text-[#146b61] bg-white title-retro text-xl">MIE GORENG</button>
                                <button onClick={() => { playSFX('regular'); setDoubleTypeSelection('Mie Kuah'); setDoubleStep('flavor'); }} className="btn-retro p-8 text-[#146b61] bg-white title-retro text-xl">MIE KUAH</button>
                            </div>
                        ) : doubleStep === 'flavor' ? (
                            <div className="space-y-4"><h4 className="title-retro text-lg text-center mb-6">PILIH VARIAN RASA</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{data.menu.find(m => m.name.toLowerCase() === doubleTypeSelection?.toLowerCase())?.variants?.map(v => (<button key={v} onClick={() => { playSFX('regular'); setSelectedVariant(`${doubleTypeSelection?.replace('Mie ', '')} - ${v}`); setDoubleStep('toppings'); }} className="btn-retro p-4 bg-white title-retro text-xs">{v}</button>))}</div></div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {!selectedVariant && buildingItem.variants && (
                                    <div><h4 className="title-retro text-xs mb-3 text-center md:text-left">PILIH VARIAN</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{buildingItem.variants.map(v => (<button key={v} onClick={() => { playSFX('regular'); setSelectedVariant(v); }} className="btn-retro p-2 text-[10px] bg-white font-bold">{v}</button>))}</div></div>
                                )}
                                <div className="flex flex-col md:flex-row items-center justify-between border-b-4 border-dashed border-[#146b61] pb-4 gap-4"><div className="text-center md:text-left"><span className="title-retro text-sm block uppercase">JUMLAH PORSI</span>{selectedVariant && <span className="text-[10px] bg-yellow-200 px-2 py-1 font-bold rounded border border-[#146b61] inline-block mt-1">VARIAN: {selectedVariant}</span>}</div><div className="flex items-center gap-6"><button onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))} className="btn-retro w-12 h-12 bg-white text-2xl">-</button><span className="title-retro text-3xl">{itemQuantity}</span><button onClick={() => { playSFX('regular'); setItemQuantity(itemQuantity + 1); }} className="btn-retro w-12 h-12 bg-white text-2xl">+</button></div></div>
                                <div><h4 className="title-retro text-sm mb-4 text-center md:text-left">CUSTOM TOPPING ⭐</h4><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{data.toppings.map(t => { const s = selectedToppings.find(st => t.id === st.id); return (<div key={t.id} onClick={() => updateBuilderToppingQty(t, 1)} className={`btn-retro p-3 flex flex-col justify-between transition-colors cursor-pointer ${s ? 'bg-green-50 border-green-600' : 'bg-white'}`}><div className="flex justify-between items-start mb-2 pointer-events-none"><span className="font-black text-[10px] uppercase leading-tight">{t.name}</span><span className="text-[10px] font-bold text-[#146b61]">{Utils.formatCurrency(t.price)}</span></div><div className="flex items-center justify-between"><div className="text-[9px] font-bold text-gray-500">{s ? `Sub: ${Utils.formatCurrency(t.price * s.quantity)}` : 'Belum pilih'}</div><div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>{s && <button onClick={() => updateBuilderToppingQty(t, -1)} className="w-7 h-7 bg-red-100 text-red-600 rounded-md border-2 border-red-200 font-bold active:scale-90">-</button>}<span className={`w-7 h-7 flex items-center justify-center font-black ${s ? 'text-[#146b61] text-lg' : 'text-gray-300'}`}>{s ? s.quantity : 0}</span><button onClick={() => updateBuilderToppingQty(t, 1)} className="w-7 h-7 bg-green-100 text-green-600 rounded-md border-2 border-green-200 font-bold active:scale-90">+</button></div></div></div>);})}</div></div>
                                <div className="pt-4 sticky bottom-0 bg-[#FDFBF6] pb-2 border-t-4 border-[#146b61]"><button onClick={handleBuilderFinish} className="w-full btn-retro py-4 bg-[#146b61] text-[#FDFBF6] flex flex-col items-center justify-center shadow-[6px_6px_0px_#d4af37]"><span className="title-retro text-lg">{isEditMode ? 'UPDATE PESANAN ⭐' : 'TAMBAH KE KERANJANG 🏮'}</span><span className="text-yellow-400 font-black text-xl">{Utils.formatCurrency(currentBuildingSubtotal)}</span></button></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (<div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2">{renderMenuSection()}</div><div className="relative">{renderCart()}</div>{renderBuilderModal()}</div>);
};

export default KasirPage;


import React, { useState } from 'react';
import type { AppData, Settings, MenuItem, Topping, Drink, InventoryItem } from '../types';

interface PengaturanPageProps {
    data: AppData;
    setData: React.Dispatch<React.SetStateAction<AppData>>;
    helpers: {
        showModal: (config: any) => void;
        showToast: (message: string) => void;
        generateMenuIdeas: (prompt: string) => Promise<string | null>;
    }
}

type EditableItem = MenuItem | Topping | Drink | InventoryItem;
type ItemType = 'menu' | 'toppings' | 'drinks' | 'inventory';

const PengaturanPage: React.FC<PengaturanPageProps> = ({ data, setData, helpers }) => {
    const [isGeminiLoading, setIsGeminiLoading] = useState(false);
    
    const handleSettingChange = (field: keyof Settings, value: string) => {
        setData(prev => ({
            ...prev,
            settings: { ...prev.settings, [field]: value }
        }));
    };
    
    const handleItemChange = (type: ItemType, id: string, field: string, value: string | number) => {
        setData(prev => {
            const items = [...prev[type]] as EditableItem[];
            const itemIndex = items.findIndex(item => item.id === id);
            if (itemIndex > -1) {
                (items[itemIndex] as any)[field] = value;
            }
            return { ...prev, [type]: items };
        });
    };

    const handleVariantsChange = (id: string, value: string) => {
        setData(prev => {
            const items = [...prev.menu];
            const itemIndex = items.findIndex(item => item.id === id);
            if (itemIndex > -1) {
                // Split by comma and clean up whitespace
                const variantsArray = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
                items[itemIndex] = { ...items[itemIndex], variants: variantsArray };
            }
            return { ...prev, menu: items };
        });
    };
    
    const handleAddNewItem = (type: ItemType) => {
        if (type === 'inventory') return; // Should not happen as inventory section is removed
        
        const newItem = { id: `${type.slice(0, 3)}-${Date.now()}`, name: 'Item Baru', price: 0, stockId: '' };
        
        setData(prev => ({ ...prev, [type]: [...prev[type], newItem] as any }));
        helpers.showToast('Item baru ditambahkan!');
    };

    const handleDeleteItem = (type: ItemType, id: string) => {
        helpers.showModal({
            title: 'Hapus Item',
            body: <p className="text-gray-800">Yakin ingin hapus item ini?</p>,
            confirmText: 'Ya, Hapus',
            onConfirm: () => {
                setData(prev => {
                    const newItems = (prev[type] as EditableItem[]).filter(item => item.id !== id);
                    return { ...prev, [type]: newItems };
                });
                helpers.showToast('Item dihapus.');
            }
        });
    };

    const handleGetMenuIdeas = async () => {
        setIsGeminiLoading(true);
        helpers.showModal({
            title: '✨ Gemini Bekerja...',
            body: `<p class="text-center text-gray-600">Mencari ide menu baru...</p><div class="flex justify-center items-center p-4"><div class="animate-spin rounded-full h-12 w-12 border-b-4" style="border-color: var(--color-primary);"></div></div>`,
            hideButtons: true
        });

        const existingMenu = data.menu.map(m => m.name).join(', ');
        const prompt = `Anda adalah seorang chef spesialis mie instan. Berikan 5 ide menu baru yang kreatif untuk warmindo di Indonesia, hindari menu yang sudah ada: ${existingMenu}. Untuk setiap ide, berikan: Nama Menu, Topping unik, dan Perkiraan harga jual (Rupiah). Format sebagai daftar bernomor. Contoh: 1. **Nama:** Mie Goreng Sambal Matah\\n**Topping:** Ayam suwir, sambal matah segar.\\n**Harga:** Rp 15.000`;
        const result = await helpers.generateMenuIdeas(prompt);
        setIsGeminiLoading(false);

        if (result) {
            helpers.showModal({
                title: '✨ Ide Menu Baru dari Gemini',
                body: <div className="text-left space-y-4 text-gray-800 max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />,
                confirmText: 'Mantap!'
            });
        } else {
             helpers.showModal({ title: 'Terjadi Kesalahan', body: <p className="text-gray-800">Tidak dapat menghubungi Gemini API.</p>, confirmText: 'Tutup' });
        }
    };

    const handleExportData = () => {
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(data, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `miednight-data-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            helpers.showToast('Data berhasil diexport!');
        } catch (error) {
            console.error("Error exporting data:", error);
            helpers.showToast('Gagal mengexport data.');
        }
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("File reader did not return string.");
                }
                const importedData = JSON.parse(text);

                // Basic validation
                if (!importedData.menu || !importedData.transactions || !importedData.settings) {
                    throw new Error("Invalid data structure.");
                }

                helpers.showModal({
                    title: 'Konfirmasi Import Data',
                    body: <p className="text-gray-800">Anda akan menimpa semua data saat ini dengan data dari file. Data yang tidak disimpan akan hilang. Lanjutkan?</p>,
                    confirmText: 'Ya, Timpa Data',
                    onConfirm: () => {
                        setData(importedData);
                        helpers.showToast('Data berhasil diimport!');
                    },
                });

            } catch (error) {
                console.error("Error importing data:", error);
                helpers.showModal({
                    title: 'Import Gagal',
                    body: <p className="text-gray-800">File tidak valid atau rusak. Pastikan Anda menggunakan file export yang benar.</p>,
                    confirmText: 'Tutup',
                });
            } finally {
                // Reset file input to allow re-uploading the same file
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleToggleFullscreen = () => {
        const elem = document.documentElement as any;
        
        if (!document.fullscreenElement && !elem.webkitFullscreenElement) {
            // Enter Fullscreen
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch((err: any) => {
                    helpers.showToast(`Gagal: ${err.message}. Coba "Add to Home Screen" jika di iPhone.`);
                });
            } else if (elem.webkitRequestFullscreen) { /* Safari/Chrome Mobile */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { /* IE11 */
                elem.msRequestFullscreen();
            } else {
                helpers.showToast('Browser ini tidak mendukung tombol fullscreen manual.');
            }
        } else {
            // Exit Fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) { /* Safari */
                (document as any).webkitExitFullscreen();
            } else if ((document as any).msExitFullscreen) { /* IE11 */
                (document as any).msExitFullscreen();
            }
        }
    };
    
    const renderCard = (title: string, type: ItemType, items: EditableItem[]) => (
        <div className="bg-white p-4 rounded-lg card-shadow text-on-secondary">
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold border-b pb-2 flex-grow">{title}</h2>{type === 'menu' && <button onClick={handleGetMenuIdeas} disabled={isGeminiLoading} className="gemini-idea-btn ml-4 bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold py-1 px-3 rounded-lg shadow-md hover:from-green-500 hover:to-blue-600 transition text-sm">Cari Ide Baru ✨</button>}</div>
            <div className="space-y-4 mb-4">
                {items.map(item => (
                    <div key={item.id} className="p-3 rounded bg-gray-50 text-gray-800 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <input onChange={e => handleItemChange(type, item.id, 'name', e.target.value)} className="setting-input font-bold bg-transparent w-full" value={item.name} placeholder="Nama Item" />
                            <button onClick={() => handleDeleteItem(type, item.id)} className="delete-item-btn text-red-500 hover:text-red-700 text-lg ml-2">&times;</button>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-sm text-gray-500">Rp</span>
                             <input type="number" onChange={e => handleItemChange(type, item.id, 'price', parseInt(e.target.value))} className="setting-input text-sm bg-transparent w-24 border-b border-gray-300 focus:border-primary" value={(item as MenuItem).price} placeholder="Harga" />
                        </div>
                         {/* Variant Input for Menu Items */}
                        {type === 'menu' && (
                            <div className="mt-2">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Varian (pisahkan dengan koma):</label>
                                <input 
                                    type="text" 
                                    value={(item as MenuItem).variants?.join(', ') || ''} 
                                    onChange={e => handleVariantsChange(item.id, e.target.value)}
                                    placeholder="Contoh: Original, Cakalang, Rendang"
                                    className="w-full text-sm p-2 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <button onClick={() => handleAddNewItem(type)} className="add-new-item-btn w-full btn-primary font-semibold py-2 rounded-lg hover:btn-primary-dark transition">Tambah Baru</button>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Fullscreen & Display Settings */}
            <div className="bg-white p-4 rounded-lg card-shadow text-on-secondary md:col-span-2 lg:col-span-3">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Tampilan & Layar</h2>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">
                            Sembunyikan bar browser agar tampilan lebih luas (Fullscreen).
                        </p>
                        <button onClick={handleToggleFullscreen} className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-black transition flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            Masuk / Keluar Fullscreen
                        </button>
                    </div>
                    <div className="flex-1 space-y-4">
                         <div><label className="block text-sm font-medium">Warna Utama</label><input type="color" onChange={e => handleSettingChange('primaryColor', e.target.value)} className="mt-1 h-10 w-full" value={data.settings.primaryColor} /></div>
                         <div><label className="block text-sm font-medium">Warna Background</label><input type="color" onChange={e => handleSettingChange('secondaryColor', e.target.value)} className="mt-1 h-10 w-full" value={data.settings.secondaryColor} /></div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg card-shadow text-on-secondary md:col-span-2 lg:col-span-3">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Sinkronisasi & Cadangan Data</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Simpan data Anda ke sebuah file untuk dicadangkan atau dipindahkan ke perangkat lain (misal: HP, tablet, atau komputer lain).
                    Proses ini manual, jadi pastikan Anda menyimpan file export di tempat aman.
                </p>
                <div className="flex flex-wrap gap-4">
                    <button onClick={handleExportData} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                        Export Data ke File
                    </button>
                    <label className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition cursor-pointer">
                        Import Data dari File
                        <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportData} />
                    </label>
                </div>
            </div>

            {renderCard('Menu Utama', 'menu', data.menu)}
            {renderCard('Topping', 'toppings', data.toppings)}
            {/* Drinks section logic removed from card render logic if array is empty, but data structure keeps it. Visual removal if needed. */}
        </div>
    );
};

export default PengaturanPage;

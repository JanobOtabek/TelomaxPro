import React, { useState } from 'react';
import { Product, Sale, Debt } from '../types';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, Trash2, ShoppingCart, X, Check, ArrowRight } from 'lucide-react';

interface ProductsProps {
  products: Product[];
  categories: string[];
  storeId: string;
  sellerName: string;
  onRefresh: () => void;
  onAddLog: (m: string) => Promise<void>;
}

export default function Products({ products, categories, storeId, sellerName, onRefresh, onAddLog }: ProductsProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('');

  // Modals state
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'sell' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  // Add product form state
  const [addForm, setAddForm] = useState({
    name: '',
    cat: categories[0] || '',
    price: '',
    qty: '',
    min: '3'
  });

  // Edit product form state
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    price: '',
    qty: ''
  });

  // Sell product form state
  const [sellForm, setSellForm] = useState({
    qty: 1,
    price: 0,
    saleType: 'naqt', // 'naqt' | 'nasiya'
    buyer: '',
    phone: '',
    nasiyaNote: ''
  });

  const formatMoney = (n: number) => n.toLocaleString('uz-UZ');

  // Handle opening add modal
  const openAddModal = () => {
    setAddForm({
      name: '',
      cat: categories[0] || '',
      price: '',
      qty: '',
      min: '3'
    });
    setActiveModal('add');
  };

  // Handle add product save
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, cat, price, qty, min } = addForm;
    if (!name.trim()) return alert('Nomi kiritilmadi!');

    setLoading(true);
    try {
      const id = Date.now().toString();
      const pPrice = parseInt(price) || 0;
      const pQty = parseInt(qty) || 0;
      const pMin = parseInt(min) || 3;

      const { error } = await supabase.from('products').insert({
        id,
        name: name.trim(),
        cat,
        price: pPrice,
        qty: pQty,
        min: pMin,
        store_id: storeId
      });

      if (error) throw error;

      await onAddLog(`"${name.trim()}" mahsuloti qo'shildi (${pQty} ta, ${formatMoney(pPrice)} so'm)`);
      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Mahsulot qo\'shishda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening edit modal
  const openEditModal = (p: Product) => {
    setSelectedProduct(p);
    setEditForm({
      id: p.id,
      name: p.name,
      price: p.price.toString(),
      qty: p.qty.toString()
    });
    setActiveModal('edit');
  };

  // Handle edit product save
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, name, price, qty } = editForm;
    if (!name.trim()) return alert('Nomi kiritilmadi!');

    setLoading(true);
    try {
      const pPrice = parseInt(price) || 0;
      const pQty = parseInt(qty) || 0;

      const { error } = await supabase
        .from('products')
        .update({ name: name.trim(), price: pPrice, qty: pQty })
        .eq('id', id);

      if (error) throw error;

      await onAddLog(`"${name.trim()}" mahsuloti tahrirlandi`);
      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Tahrirlashda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening sell modal
  const openSellModal = (p: Product) => {
    setSelectedProduct(p);
    setSellForm({
      qty: 1,
      price: p.price,
      saleType: 'naqt',
      buyer: '',
      phone: '',
      nasiyaNote: ''
    });
    setActiveModal('sell');
  };

  // Handle selling product
  const handleSellProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const { qty, price, saleType, buyer, phone, nasiyaNote } = sellForm;
    const sQty = parseInt(qty.toString()) || 1;
    const sPrice = parseInt(price.toString()) || 0;

    if (sPrice <= 0) return alert("Narx noto'g'ri!");
    if (sQty > selectedProduct.qty) return alert("Omborda yetarli mahsulot yo'q!");
    if (sQty <= 0) return alert("Soni kamida 1 bo'lsin!");

    setLoading(true);
    try {
      const newQty = selectedProduct.qty - sQty;
      const total = sPrice * sQty;
      const dateIso = new Date().toISOString();
      const saleId = Date.now().toString();
      const buyerName = buyer.trim() || "Noma'lum";

      // 1. Update product stock
      const { error: prodErr } = await supabase
        .from('products')
        .update({ qty: newQty })
        .eq('id', selectedProduct.id);

      if (prodErr) throw prodErr;

      // 2. Insert sale record
      const salePayload: any = {
        id: saleId,
        pname: selectedProduct.name,
        pcat: selectedProduct.cat,
        price: sPrice,
        orig_price: selectedProduct.price,
        qty: sQty,
        total,
        buyer: buyerName,
        phone: phone.trim() || null,
        seller: sellerName,
        date: dateIso,
        sale_type: saleType,
        store_id: storeId
      };

      let { error: saleErr } = await supabase.from('sales').insert(salePayload);

      // Agar 'orig_price' ustuni ma'lumotlar bazasida yo'qligi sababli xato bersa, uni olib tashlab qaytadan urinib ko'ramiz
      if (saleErr && (
        saleErr.message?.includes('orig_price') || 
        saleErr.details?.includes('orig_price') || 
        saleErr.message?.includes('schema cache')
      )) {
        const { orig_price, ...fallbackPayload } = salePayload;
        const fallbackRes = await supabase.from('sales').insert(fallbackPayload);
        saleErr = fallbackRes.error;
      }

      if (saleErr) throw saleErr;

      // 3. If "nasiya" (debt), insert debt record
      if (saleType === 'nasiya') {
        const debtId = (Date.now() + 1).toString();
        const note = nasiyaNote.trim() || `${selectedProduct.name} (nasiya)`;

        const { error: debtErr } = await supabase.from('debts').insert({
          id: debtId,
          name: buyerName,
          phone: phone.trim() || null,
          amount: total,
          note,
          date: dateIso,
          status: 'active',
          store_id: storeId
        });

        if (debtErr) throw debtErr;
      }

      const discNote = selectedProduct.price !== sPrice 
        ? ` (chegirma: -${formatMoney(selectedProduct.price - sPrice)} so'm/ta)` 
        : '';
      
      await onAddLog(
        `${buyerName}ga ${sQty}ta "${selectedProduct.name}" ${saleType === 'nasiya' ? 'nasiyaga' : 'naqt'} sotildi — ${formatMoney(total)} so'm${discNote} (${sellerName})`
      );

      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Sotishda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`"${p.name}" mahsulotini o'chirasizmi?`)) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', p.id);
      if (error) throw error;

      await onAddLog(`"${p.name}" mahsuloti o'chirildi`);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('O\'chirishda xato: ' + e.message);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCat === '' || p.cat === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Mahsulotlar</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ombordagi mavjud jihozlar ro'yxati</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Qo'shish
        </button>
      </div>

      {/* Search and Category filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs pl-9 pr-4 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        <div>
          <select 
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-4 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="">Barcha bo'limlar</option>
            {categories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table (Desktop) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nomi</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bo'lim</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Narx</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Soni</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-sm text-slate-400 dark:text-slate-500">
                  Mos mahsulot topilmadi
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors">
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                      {p.qty <= p.min && (
                        <span className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-md font-bold border border-red-200/20">
                          Kam qoldi
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-xs">
                    <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium px-2.5 py-1 rounded-lg border border-blue-100/10">
                      {p.cat}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
                    {formatMoney(p.price)} so'm
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                    {p.qty} ta
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex gap-1.5">
                      <button 
                        onClick={() => openSellModal(p)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Sotish
                      </button>
                      <button 
                        onClick={() => openEditModal(p)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(p)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-red-100/10 transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Products Card List (Mobile) - Completely prevents cut-off buttons! */}
      <div className="block md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center p-8 rounded-2xl text-slate-400 text-xs">
            Mos mahsulot topilmadi
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div 
              key={p.id}
              className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5 relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-white text-sm">{p.name}</span>
                    {p.qty <= p.min && (
                      <span className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[9px] px-1.5 py-0.5 rounded font-bold border border-red-100/10">
                        Kam
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-medium">
                      {p.cat}
                    </span>
                    <span className="text-[10px] text-slate-500">Omborda: <strong>{p.qty} ta</strong></span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-slate-400 font-medium">Narxi</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm font-mono">{formatMoney(p.price)} so'm</span>
                </div>
              </div>

              {/* Responsive Bottom Controls with spacious touch targets (At least 44px) */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => openSellModal(p)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 transition-colors min-h-[44px]"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Sotish
                </button>
                <button 
                  onClick={() => openEditModal(p)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1 transition-colors min-h-[44px]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                  Tahrir
                </button>
                <button 
                  onClick={() => handleDeleteProduct(p)}
                  className="bg-red-50/40 dark:bg-red-950/10 border border-red-100/50 dark:border-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1 transition-colors min-h-[44px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  O'chirish
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 1. Add Product Modal */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-fade-in">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh] border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Yangi Mahsulot qo'shish</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nomi</label>
                <input 
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Mahsulot nomini kiriting"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Bo'lim (Kategoriya)</label>
                  <select 
                    value={addForm.cat}
                    onChange={(e) => setAddForm({ ...addForm, cat: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Sotish narxi (so'm)</label>
                  <input 
                    type="number"
                    required
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                    placeholder="E.g. 150000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Dastlabki soni</label>
                  <input 
                    type="number"
                    required
                    value={addForm.qty}
                    onChange={(e) => setAddForm({ ...addForm, qty: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Ogohlantirish chegarasi (min)</label>
                  <input 
                    type="number"
                    required
                    value={addForm.min}
                    onChange={(e) => setAddForm({ ...addForm, min: e.target.value })}
                    placeholder="3"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 text-xs min-h-[44px]"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-1"
                >
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Product Modal */}
      {activeModal === 'edit' && selectedProduct && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh] border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Mahsulotni Tahrirlash</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nomi</label>
                <input 
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Narxi (so'm)</label>
                  <input 
                    type="number"
                    required
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Soni (omborda)</label>
                  <input 
                    type="number"
                    required
                    value={editForm.qty}
                    onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 text-xs min-h-[44px]"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-1"
                >
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Sell Product Modal with Live Price & Discount calculations */}
      {activeModal === 'sell' && selectedProduct && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh] border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Mahsulotni Sotish</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product fast info summary */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-150 dark:border-slate-850 mb-4 line-height-[1.6]">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-white text-sm mb-1">
                <span>{selectedProduct.name}</span>
                <span className="bg-blue-50 dark:bg-blue-950 text-blue-600 text-[10px] px-2 py-0.5 rounded font-normal">
                  {selectedProduct.cat}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Standart narxi:</span>
                <span className="font-semibold font-mono">{formatMoney(selectedProduct.price)} so'm</span>
              </div>
              <div className="flex justify-between">
                <span>Omborda qolgan:</span>
                <span className="font-bold">{selectedProduct.qty} ta</span>
              </div>
            </div>

            <form onSubmit={handleSellProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">To'lov turi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setSellForm({ ...sellForm, saleType: 'naqt' })}
                    className={`py-2.5 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] ${
                      sellForm.saleType === 'naqt' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    💵 Naqd to'lov
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSellForm({ ...sellForm, saleType: 'nasiya' })}
                    className={`py-2.5 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] ${
                      sellForm.saleType === 'nasiya' 
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-600' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    📋 Nasiya (Qarz)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Sotiladigan soni</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={sellForm.qty}
                    onChange={(e) => setSellForm({ ...sellForm, qty: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none font-mono focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Sotuv narxi (Chegirma mumkin)</label>
                  <input 
                    type="number"
                    required
                    value={sellForm.price}
                    onChange={(e) => setSellForm({ ...sellForm, price: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none font-mono focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Total display with live calculations */}
              {sellForm.qty > 0 && sellForm.price > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 text-xs flex flex-wrap justify-between items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Jami sotuv summasi:</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                      {formatMoney(sellForm.price * sellForm.qty)} so'm
                    </span>
                    {selectedProduct.price > sellForm.price && (
                      <span className="block text-[10px] text-red-500 dark:text-red-400">
                        Chegirma: -{formatMoney((selectedProduct.price - sellForm.price) * sellForm.qty)} so'm
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Mijoz ismi (Ixtiyoriy)</label>
                  <input 
                    type="text"
                    value={sellForm.buyer}
                    onChange={(e) => setSellForm({ ...sellForm, buyer: e.target.value })}
                    placeholder="E.g. Ali Valiyev"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Telefon raqami (Ixtiyoriy)</label>
                  <input 
                    type="tel"
                    value={sellForm.phone}
                    onChange={(e) => setSellForm({ ...sellForm, phone: e.target.value })}
                    placeholder="+998"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {sellForm.saleType === 'nasiya' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nasiya (qarz) izohi</label>
                  <input 
                    type="text"
                    required
                    value={sellForm.nasiyaNote}
                    onChange={(e) => setSellForm({ ...sellForm, nasiyaNote: e.target.value })}
                    placeholder="E.g. AirPods Pro uchun nasiya"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 text-xs min-h-[44px]"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  {loading ? 'Sotilmoqda...' : 'Sotish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, FolderPlus, Folder, Trash2, X } from 'lucide-react';

interface CategoriesProps {
  categories: string[];
  products: Product[];
  storeId: string;
  onRefresh: () => void;
  onAddLog: (m: string) => Promise<void>;
}

export default function Categories({ categories, products, storeId, onRefresh, onAddLog }: CategoriesProps) {
  const [activeModal, setActiveModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [loading, setLoading] = useState(false);

  // Save add category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    if (categories.includes(name)) {
      return alert("Bu bo'lim allaqachon mavjud!");
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('categories').insert({
        name,
        store_id: storeId
      });

      if (error) throw error;

      await onAddLog(`"${name}" bo'limi qo'shildi`);
      setNewCatName('');
      setActiveModal(false);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Bo\'lim qo\'shishda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (catName: string) => {
    // Check if category has products
    const count = products.filter(p => p.cat === catName).length;
    if (count > 0) {
      return alert("Bu bo'limda mahsulotlar bor! Avval ularni o'chiring yoki boshqa bo'limga o'tkazing.");
    }

    if (!confirm(`"${catName}" bo'limini o'chirasizmi?`)) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('name', catName)
        .eq('store_id', storeId);

      if (error) throw error;

      await onAddLog(`"${catName}" bo'limi o'chirildi`);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('O\'chirishda xato: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Bo'limlar</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Mahsulotlarni guruhlash uchun kategoriyalar</p>
        </div>
        <button 
          onClick={() => setActiveModal(true)}
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Yangi bo'lim
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
            Bo'limlar mavjud emas
          </div>
        ) : (
          categories.map((c, idx) => {
            const productCount = products.filter(p => p.cat === c).length;
            return (
              <div 
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4.5 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Folder className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{c}</h4>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      {productCount} ta mahsulot
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteCategory(c)}
                  className="p-2 bg-slate-50 hover:bg-red-50 dark:bg-slate-950 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl border border-slate-150 dark:border-slate-800/80 hover:border-red-100/10 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                  title="Bo'limni o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Category Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Yangi bo'lim</h3>
              </div>
              <button onClick={() => setActiveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Bo'lim nomi</label>
                <input 
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="E.g. Adapterlar, Keyslar"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setActiveModal(false)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 text-xs min-h-[44px]"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  disabled={loading || !newCatName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

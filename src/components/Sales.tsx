import React, { useState } from 'react';
import { Sale } from '../types';
import { Search, Calendar, User, Eye, X, Receipt } from 'lucide-react';

interface SalesProps {
  sales: Sale[];
  categories: string[];
}

export default function Sales({ sales, categories }: SalesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const formatMoney = (n: number) => n.toLocaleString('uz-UZ');

  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      (s.buyer || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.pname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCat === '' || s.pcat === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Sotuvlar tarixi</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Do'kondan sotilgan barcha mahsulotlar hisoboti</p>
      </div>

      {/* Filter box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Mijoz yoki mahsulot nomi..."
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

      {/* Sales Table (Desktop) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sana</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mijoz</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mahsulot</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Turi</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Soni</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Summa</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Sotuvchi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-sm text-slate-400 dark:text-slate-500">
                  Sotuvlar topilmadi
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => (
                <tr 
                  key={s.id} 
                  onClick={() => setSelectedSale(s)}
                  className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors cursor-pointer"
                >
                  <td className="p-4 text-xs text-slate-500 font-mono">
                    {new Date(s.date).toLocaleDateString('uz-UZ')}
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {s.buyer || '—'}
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {s.pname}
                  </td>
                  <td className="p-4 text-xs">
                    <span className={`px-2 py-0.5 rounded-md font-semibold ${
                      s.sale_type === 'nasiya' 
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/10' 
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/10'
                    }`}>
                      {s.sale_type === 'nasiya' ? 'Nasiya' : 'Naqd'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-500 font-mono">
                    {s.qty} ta
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-800 dark:text-white font-mono">
                    {formatMoney(s.total)} so'm
                  </td>
                  <td className="p-4 text-right">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2.5 py-1 rounded-lg">
                      {s.seller}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sales Card List (Mobile) - Completely prevents horizontal scroll overflow! */}
      <div className="block md:hidden space-y-3">
        {filteredSales.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center p-8 rounded-2xl text-slate-400 text-xs">
            Sotuvlar topilmadi
          </div>
        ) : (
          filteredSales.map((s) => (
            <div 
              key={s.id}
              onClick={() => setSelectedSale(s)}
              className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{s.pname}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-slate-500 font-mono">{new Date(s.date).toLocaleDateString('uz-UZ')}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-500">Mijoz: <strong>{s.buyer || "Noma'lum"}</strong></span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                  s.sale_type === 'nasiya' 
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' 
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {s.sale_type === 'nasiya' ? 'Nasiya' : 'Naqd'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="text-slate-500">
                  Soni: <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{s.qty} ta</span>
                </div>
                <div className="font-mono">
                  Jami: <span className="font-bold text-slate-800 dark:text-white text-sm">{formatMoney(s.total)} so'm</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sale Details Modal / Receipt */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh] border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Sotuv ma'lumoti</h3>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-950">
                <span className="text-slate-400">Sana:</span>
                <span className="font-semibold font-mono">{new Date(selectedSale.date).toLocaleString('uz-UZ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-950">
                <span className="text-slate-400">Mahsulot nomi:</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedSale.pname}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-950">
                <span className="text-slate-400">Turi:</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  selectedSale.sale_type === 'nasiya' 
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' 
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                }`}>
                  {selectedSale.sale_type === 'nasiya' ? 'Nasiya' : 'Naqd'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-950">
                <span className="text-slate-400">Soni:</span>
                <span className="font-bold font-mono">{selectedSale.qty} ta</span>
              </div>

              {selectedSale.orig_price && selectedSale.orig_price !== selectedSale.price && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-950">
                  <span className="text-slate-400">Asl narxi:</span>
                  <span className="line-through text-slate-400 font-mono">{formatMoney(selectedSale.orig_price)} so'm</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-950">
                <span className="text-slate-400">Sotilgan narx:</span>
                <span className="font-semibold font-mono">{formatMoney(selectedSale.price)} so'm</span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-y border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-800 dark:text-white">
                <span>Jami summa:</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">{formatMoney(selectedSale.total)} so'm</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-950">
                <span className="text-slate-400">Sotib oluvchi (Mijoz):</span>
                <span className="font-semibold">{selectedSale.buyer || "Noma'lum"}</span>
              </div>

              {selectedSale.phone && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-950">
                  <span className="text-slate-400">Telefon:</span>
                  <span className="font-semibold font-mono">{selectedSale.phone}</span>
                </div>
              )}

              <div className="flex justify-between py-1">
                <span className="text-slate-400">Sotuvchi (Kassir):</span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium text-[10px]">
                  {selectedSale.seller}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button 
                onClick={() => setSelectedSale(null)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-xs transition-colors min-h-[44px]"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

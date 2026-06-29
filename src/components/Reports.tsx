import React, { useState } from 'react';
import { Sale } from '../types';
import { BarChart3, TrendingUp, AlertTriangle, Layers, User, UserCheck } from 'lucide-react';

interface ReportsProps {
  sales: Sale[];
}

export default function Reports({ sales }: ReportsProps) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const formatMoney = (n: number) => n.toLocaleString('uz-UZ');

  // Filter sales based on period
  const now = new Date();
  const filteredSales = sales.filter(s => {
    const d = new Date(s.date);
    if (period === 'today') {
      return d.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      return d >= oneWeekAgo;
    }
    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= startOfMonth;
    }
    return true; // 'all'
  });

  const cashSales = filteredSales.filter(s => s.sale_type !== 'nasiya');
  const creditSales = filteredSales.filter(s => s.sale_type === 'nasiya');

  const cashTotal = cashSales.reduce((sum, s) => sum + s.total, 0);
  const creditTotal = creditSales.reduce((sum, s) => sum + s.total, 0);

  // Stats by category
  const byCat: { [key: string]: number } = {};
  filteredSales.forEach(s => {
    byCat[s.pcat] = (byCat[s.pcat] || 0) + s.total;
  });

  // Stats by buyer (Top 10)
  const byBuyer: { [key: string]: number } = {};
  filteredSales.forEach(s => {
    if (s.buyer && s.buyer !== "Noma'lum") {
      byBuyer[s.buyer] = (byBuyer[s.buyer] || 0) + s.total;
    }
  });

  // Stats by seller
  const bySeller: { [key: string]: number } = {};
  filteredSales.forEach(s => {
    if (s.seller) {
      bySeller[s.seller] = (bySeller[s.seller] || 0) + s.total;
    }
  });

  const sortedCatEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const sortedBuyerEntries = Object.entries(byBuyer).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sortedSellerEntries = Object.entries(bySeller).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Header with period switcher */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Do'kon hisoboti</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Daromad va qarz sotuvlarining statistik tahlili</p>
        </div>

        <div>
          <select 
            value={period}
            onChange={(e: any) => setPeriod(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-4 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm min-h-[44px]"
          >
            <option value="today">Bugun</option>
            <option value="week">Ushbu hafta</option>
            <option value="month">Ushbu oy</option>
            <option value="all">Barcha vaqtlar</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="block text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Naqt sotuv</span>
          <span className="block text-base sm:text-lg font-bold text-slate-800 dark:text-white font-mono">{formatMoney(cashTotal)} so'm</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="block text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Nasiya sotuv</span>
          <span className="block text-base sm:text-lg font-bold text-amber-500 font-mono">{formatMoney(creditTotal)} so'm</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="block text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Jami operatsiyalar</span>
          <span className="block text-base sm:text-lg font-bold text-slate-800 dark:text-white">{filteredSales.length} marta</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="block text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Nasiya soni</span>
          <span className="block text-base sm:text-lg font-bold text-slate-800 dark:text-white">{creditSales.length} ta</span>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-50 dark:border-slate-800/60">
            <Layers className="w-4 h-4 text-blue-500" />
            Bo'limlar kesimida
          </h4>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {sortedCatEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">Ma'lumot yo'q</div>
            ) : (
              sortedCatEntries.map(([cat, val], idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded">
                    {cat}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                    {formatMoney(val)} so'm
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Clients Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-50 dark:border-slate-800/60">
            <User className="w-4 h-4 text-emerald-500" />
            Eng faol xaridorlar
          </h4>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {sortedBuyerEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">Mijoz ma'lumotlari yo'q</div>
            ) : (
              sortedBuyerEntries.map(([buyer, val], idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {buyer}
                  </span>
                  <span className="font-semibold text-slate-600 dark:text-slate-400 font-mono">
                    {formatMoney(val)} so'm
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sellers Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-50 dark:border-slate-800/60">
            <UserCheck className="w-4 h-4 text-purple-500" />
            Kassirlar hisoboti
          </h4>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {sortedSellerEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">Ma'lumot yo'q</div>
            ) : (
              sortedSellerEntries.map(([seller, val], idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded">
                    {seller}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                    {formatMoney(val)} so'm
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

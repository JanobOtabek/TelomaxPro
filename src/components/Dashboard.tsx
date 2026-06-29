import React from 'react';
import { Product, Debt, Sale, AppLog } from '../types';
import { TrendingUp, CreditCard, Layers, AlertTriangle, FileText } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  debts: Debt[];
  sales: Sale[];
  logs: AppLog[];
}

export default function Dashboard({ products, debts, sales, logs }: DashboardProps) {
  // Calculations
  const warehouseValue = products.reduce((sum, p) => sum + p.price * p.qty, 0);
  
  const todayStr = new Date().toDateString();
  const todayCash = sales
    .filter(s => new Date(s.date).toDateString() === todayStr && s.sale_type !== 'nasiya')
    .reduce((sum, s) => sum + s.total, 0);

  const activeDebtsTotal = debts
    .filter(d => d.status === 'active')
    .reduce((sum, d) => sum + d.amount, 0);

  const lowStockCount = products.filter(p => p.qty <= p.min).length;

  const formatMoney = (n: number) => {
    return n.toLocaleString('uz-UZ');
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Warehouse Value */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ombor qiymati</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-white truncate">
            {formatMoney(warehouseValue)} <span className="text-xs font-semibold text-slate-400">so'm</span>
          </div>
        </div>

        {/* Today's Cash */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bugungi naqt</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-white truncate">
            {formatMoney(todayCash)} <span className="text-xs font-semibold text-slate-400">so'm</span>
          </div>
        </div>

        {/* Active Debts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jami qarz</span>
            <div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400 truncate">
            {formatMoney(activeDebtsTotal)} <span className="text-xs font-semibold text-red-400">so'm</span>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kam qolgan</span>
            <div className={`p-2 rounded-xl ${
              lowStockCount > 0 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base sm:text-lg font-bold truncate ${
            lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-800 dark:text-white'
          }`}>
            {lowStockCount} <span className="text-xs font-semibold text-slate-400">ta</span>
          </div>
        </div>
      </div>

      {/* Activity Logs Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-blue-500" />
          Oxirgi harakatlar
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[400px] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              Harakatlar tarixi bo'sh
            </div>
          ) : (
            logs.slice(0, 15).map((log, index) => (
              <div 
                key={index} 
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {log.m}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] sm:text-right shrink-0">
                  {log.t}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

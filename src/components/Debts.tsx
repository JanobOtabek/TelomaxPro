import React, { useState } from 'react';
import { Debt } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Check, Trash2, CreditCard, X, DollarSign } from 'lucide-react';

interface DebtsProps {
  debts: Debt[];
  storeId: string;
  onRefresh: () => void;
  onAddLog: (m: string) => Promise<void>;
}

export default function Debts({ debts, storeId, onRefresh, onAddLog }: DebtsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModal, setActiveModal] = useState<'add' | 'pay' | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(false);

  // Forms states
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    amount: '',
    note: ''
  });

  const [payForm, setPayForm] = useState({
    amountPaid: ''
  });

  const formatMoney = (n: number) => n.toLocaleString('uz-UZ');

  // Open add modal
  const openAddModal = () => {
    setAddForm({
      name: '',
      phone: '',
      amount: '',
      note: ''
    });
    setActiveModal('add');
  };

  // Save add debt
  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, phone, amount, note } = addForm;
    const dAmt = parseInt(amount) || 0;

    if (!name.trim() || dAmt <= 0) {
      return alert("Ism va to'g'ri summa kiritilishi shart!");
    }

    setLoading(true);
    try {
      const id = Date.now().toString();
      const dateIso = new Date().toISOString();

      const { error } = await supabase.from('debts').insert({
        id,
        name: name.trim(),
        phone: phone.trim() || null,
        amount: dAmt,
        note: note.trim() || null,
        date: dateIso,
        status: 'active',
        store_id: storeId
      });

      if (error) throw error;

      await onAddLog(`${name.trim()}ga ${formatMoney(dAmt)} so'm qarz kiritildi`);
      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Qarz kiritishda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Open payoff modal
  const openPayModal = (d: Debt) => {
    setSelectedDebt(d);
    setPayForm({
      amountPaid: ''
    });
    setActiveModal('pay');
  };

  // Partial pay
  const handlePartialPay = async () => {
    if (!selectedDebt) return;
    const paid = parseInt(payForm.amountPaid) || 0;

    if (paid <= 0) return alert("Summani kiriting!");
    if (paid > selectedDebt.amount) return alert("To'lov jami qarzdan ko'p bo'lishi mumkin emas!");

    setLoading(true);
    try {
      const newAmt = selectedDebt.amount - paid;
      const newStatus = newAmt <= 0 ? 'paid' : 'active';

      const { error } = await supabase
        .from('debts')
        .update({ amount: newAmt, status: newStatus })
        .eq('id', selectedDebt.id);

      if (error) throw error;

      await onAddLog(`${selectedDebt.name}ning qarzidan ${formatMoney(paid)} so'm to'landi. Qolgan qarz: ${formatMoney(newAmt)} so'm`);
      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Qisman to\'lashda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Full pay
  const handleFullPay = async () => {
    if (!selectedDebt) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('debts')
        .update({ amount: 0, status: 'paid' })
        .eq('id', selectedDebt.id);

      if (error) throw error;

      await onAddLog(`${selectedDebt.name}ning jami qarzi to'liq to'landi`);
      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Qarzni to\'liq yopishda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete debt record
  const handleDeleteDebt = async (d: Debt) => {
    if (!confirm(`"${d.name}"ning ushbu qarz ma'lumotini butunlay o'chirasizmi?`)) return;

    try {
      const { error } = await supabase.from('debts').delete().eq('id', d.id);
      if (error) throw error;

      await onAddLog(`"${d.name}"ning qarz yozuvi o'chirildi`);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('O\'chirishda xato: ' + e.message);
    }
  };

  const filteredDebts = debts.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Qarzlar</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Do'kondan olingan faol va to'langan qarzlar ro'yxati</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Yangi qarz
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <input 
          type="text"
          placeholder="Mijoz ismi bo'yicha qidirish..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-4 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Debts Table (Desktop) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mijoz</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Telefon</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Qarz miqdori</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sana</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Izoh</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Holat</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredDebts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-sm text-slate-400 dark:text-slate-500">
                  Qarzlar topilmadi
                </td>
              </tr>
            ) : (
              filteredDebts.map((d) => {
                const isOverdue = d.status === 'active' && ((Date.now() - new Date(d.date).getTime()) / 86400000) > 7;
                return (
                  <tr key={d.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{d.name}</span>
                        {isOverdue && (
                          <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" title="Muddati 1 haftadan oshgan!">
                            !
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                      {d.phone || '—'}
                    </td>
                    <td className={`p-4 text-sm font-bold font-mono ${d.status === 'active' ? 'text-red-500 dark:text-red-400' : 'text-emerald-500'}`}>
                      {formatMoney(d.amount)} so'm
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-mono">
                      {new Date(d.date).toLocaleDateString('uz-UZ')}
                    </td>
                    <td className="p-4 text-xs text-slate-500 max-w-[150px] truncate">
                      {d.note || '—'}
                    </td>
                    <td className="p-4 text-xs">
                      <span className={`px-2 py-0.5 rounded-md font-semibold ${
                        d.status === 'active' 
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100/10' 
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/10'
                      }`}>
                        {d.status === 'active' ? 'Faol' : "To'landi"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-1.5">
                        {d.status === 'active' && (
                          <button 
                            onClick={() => openPayModal(d)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            To'lash
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteDebt(d)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Debts Card List (Mobile) - Completely prevents horizontal scroll overflow! */}
      <div className="block md:hidden space-y-3">
        {filteredDebts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center p-8 rounded-2xl text-slate-400 text-xs">
            Qarzlar topilmadi
          </div>
        ) : (
          filteredDebts.map((d) => {
            const isOverdue = d.status === 'active' && ((Date.now() - new Date(d.date).getTime()) / 86400000) > 7;
            return (
              <div 
                key={d.id}
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-none">{d.name}</h4>
                      {isOverdue && (
                        <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full" title="Muddati 1 haftadan oshgan!">
                          Muddati o'tgan
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                      <span>Tel: <strong className="font-mono">{d.phone || '—'}</strong></span>
                      <span>•</span>
                      <span className="font-mono">{new Date(d.date).toLocaleDateString('uz-UZ')}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                    d.status === 'active' 
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' 
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {d.status === 'active' ? 'Faol' : "To'landi"}
                  </span>
                </div>

                {d.note && (
                  <p className="text-[11px] bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg text-slate-500 leading-normal border border-slate-100 dark:border-slate-800/40">
                    Izoh: {d.note}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    Qarz: <span className={`font-bold font-mono text-sm ${d.status === 'active' ? 'text-red-500 dark:text-red-400' : 'text-emerald-500'}`}>
                      {formatMoney(d.amount)} so'm
                    </span>
                  </div>
                  
                  {/* Action buttons with 44px min touch target */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {d.status === 'active' && (
                      <button 
                        onClick={() => openPayModal(d)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center gap-1 cursor-pointer transition-colors min-h-[44px]"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        To'lash
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteDebt(d)}
                      className="bg-red-50/40 dark:bg-red-950/10 border border-red-100/40 dark:border-red-950/40 text-red-600 dark:text-red-400 p-2.5 rounded-xl hover:bg-red-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 1. Add Debt Modal */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh] border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Qarz qo'shish</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Mijoz ismi</label>
                <input 
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Ism Familiya"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Mijoz telefon raqami</label>
                  <input 
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+998"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Qarz summasi (so'm)</label>
                  <input 
                    type="number"
                    required
                    value={addForm.amount}
                    onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                    placeholder="E.g. 500000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Qarz sababi / Izoh</label>
                <input 
                  type="text"
                  value={addForm.note}
                  onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                  placeholder="Sabab..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Pay Debt Modal */}
      {activeModal === 'pay' && selectedDebt && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh] border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Qarzni to'lash</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Debt Card */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 p-3.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              <div>Mijoz: <strong className="text-slate-800 dark:text-white text-sm">{selectedDebt.name}</strong></div>
              {selectedDebt.phone && <div>Tel: <span className="font-semibold font-mono">{selectedDebt.phone}</span></div>}
              <div className="mt-1">
                Joriy qarz summasi: <strong className="text-red-500 font-bold text-sm font-mono">{formatMoney(selectedDebt.amount)} so'm</strong>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">To'lanayotgan qisman summa (so'm)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={payForm.amountPaid}
                  onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none font-mono focus:border-blue-500"
                />
              </div>

              {/* Show remaining calculation live */}
              {parseInt(payForm.amountPaid) > 0 && (
                <div className="text-xs">
                  {parseInt(payForm.amountPaid) >= selectedDebt.amount ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Qarz to'liq yopiladi!
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Qoladigan qarz: <strong className="text-red-500 font-mono">{formatMoney(selectedDebt.amount - parseInt(payForm.amountPaid))} so'm</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Payload controls with ample space */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors min-h-[44px]"
                >
                  Bekor
                </button>
                <button 
                  onClick={handlePartialPay}
                  disabled={loading || !payForm.amountPaid || parseInt(payForm.amountPaid) <= 0}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors min-h-[44px] cursor-pointer"
                >
                  Qisman ✓
                </button>
                <button 
                  onClick={handleFullPay}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors min-h-[44px] cursor-pointer"
                >
                  Hammasi ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

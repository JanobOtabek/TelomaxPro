import React, { useState } from 'react';
import { Store, User } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Shield, Store as StoreIcon, Users, X } from 'lucide-react';

interface AdminPanelProps {
  stores: Store[];
  users: User[];
  onRefresh: () => void;
}

export default function AdminPanel({ stores, users, onRefresh }: AdminPanelProps) {
  const [subTab, setSubTab] = useState<'stores' | 'users'>('stores');
  const [activeModal, setActiveModal] = useState<'addStore' | 'editStore' | 'addUser' | 'editUser' | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Forms states
  const [addStoreForm, setAddStoreForm] = useState({
    name: '',
    months: '1'
  });

  const [editStoreForm, setEditStoreForm] = useState({
    name: '',
    addMonths: ''
  });

  const [addUserForm, setAddUserForm] = useState({
    name: '',
    pass: '',
    storeId: stores[0]?.id || '',
    role: 'sotuvchi'
  });

  const [editUserForm, setEditUserForm] = useState({
    name: '',
    pass: '',
    storeId: '',
    role: 'sotuvchi'
  });

  // Calculate Sub Expiry Text
  const getSubBadge = (st: Store) => {
    if (st.is_vip) return <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">VIP</span>;
    if (!st.sub_expires) return <span className="bg-red-50 text-red-600 dark:bg-red-950 text-xs px-2 py-0.5 rounded font-semibold">Tugagan</span>;

    const exp = new Date(st.sub_expires);
    const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);

    if (days < 0) return <span className="bg-red-50 text-red-600 dark:bg-red-950/40 text-xs px-2 py-0.5 rounded font-semibold">Muddati o'tgan</span>;
    if (days <= 7) return <span className="bg-amber-50 text-amber-600 dark:bg-amber-950/40 text-xs px-2 py-0.5 rounded font-semibold">{days} kun qoldi</span>;
    return <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 text-xs px-2 py-0.5 rounded font-semibold">{exp.toLocaleDateString('uz-UZ')}</span>;
  };

  // --- STORES ACTIONS ---
  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addStoreForm.name.trim();
    const months = parseInt(addStoreForm.months) || 1;
    if (!name) return alert("Do'kon nomi kiritilmadi!");

    setLoading(true);
    try {
      const id = 'store_' + Date.now();
      const exp = new Date();
      exp.setMonth(exp.getMonth() + months);

      const { error } = await supabase.from('stores').insert({
        id,
        name,
        sub_expires: exp.toISOString(),
        is_vip: false
      });

      if (error) throw error;

      alert(`"${name}" do'koni yaratildi! Obuna: ${exp.toLocaleDateString('uz-UZ')} gacha`);
      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Do\'kon qo\'shishda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditStoreModal = (st: Store) => {
    setSelectedStore(st);
    setEditStoreForm({
      name: st.name,
      addMonths: ''
    });
    setActiveModal('editStore');
  };

  const handleEditStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;

    const name = editStoreForm.name.trim();
    const addMonths = parseInt(editStoreForm.addMonths) || 0;
    if (!name) return alert("Nomi kiritilmadi!");

    setLoading(true);
    try {
      const updates: any = { name };
      if (addMonths > 0) {
        const base = (selectedStore.sub_expires && new Date(selectedStore.sub_expires) > new Date()) 
          ? new Date(selectedStore.sub_expires) 
          : new Date();
        base.setMonth(base.getMonth() + addMonths);
        updates.sub_expires = base.toISOString();
      }

      const { error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', selectedStore.id);

      if (error) throw error;

      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Do\'konni tahrirlashda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (st: Store) => {
    if (!confirm(`"${st.name}" do'konini o'chirasizmi? Uning barcha ma'lumotlari (mahsulotlar, qarzlar, sotuvlar, foydalanuvchilar) butunlay o'chib ketadi!`)) return;

    try {
      // Cascade delete on related tables manually since Supabase has isolation
      await Promise.all([
        supabase.from('products').delete().eq('store_id', st.id),
        supabase.from('categories').delete().eq('store_id', st.id),
        supabase.from('debts').delete().eq('store_id', st.id),
        supabase.from('sales').delete().eq('store_id', st.id),
        supabase.from('logs').delete().eq('store_id', st.id),
        supabase.from('users').delete().eq('store_id', st.id)
      ]);

      const { error } = await supabase.from('stores').delete().eq('id', st.id);
      if (error) throw error;

      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Do\'konni o\'chirishda xato: ' + e.message);
    }
  };

  // --- USERS ACTIONS ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, pass, storeId, role } = addUserForm;
    if (!name.trim() || !pass) return alert("Ism va parol kiritilmadi!");

    if (users.find(u => u.name === name.trim())) {
      return alert("Bu foydalanuvchi ismi allaqachon mavjud!");
    }

    setLoading(true);
    try {
      const id = 'u_' + Date.now();
      const { error } = await supabase.from('users').insert({
        id,
        name: name.trim(),
        pass,
        store_id: storeId,
        role,
        is_super: false
      });

      if (error) throw error;

      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Foydalanuvchi qo\'shishda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditUserModal = (u: User) => {
    setSelectedUser(u);
    setEditUserForm({
      name: u.name,
      pass: '',
      storeId: u.store_id,
      role: u.role || 'sotuvchi'
    });
    setActiveModal('editUser');
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const { name, pass, storeId, role } = editUserForm;
    if (!name.trim()) return alert("Ism kiritilmadi!");

    setLoading(true);
    try {
      const updates: any = { 
        name: name.trim(), 
        store_id: storeId, 
        role 
      };
      if (pass) updates.pass = pass;

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', selectedUser.id);

      if (error) throw error;

      setActiveModal(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('Foydalanuvchini tahrirlashda xato: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!confirm(`"${u.name}" foydalanuvchisini o'chirasizmi?`)) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', u.id);
      if (error) throw error;

      onRefresh();
    } catch (e: any) {
      console.error(e);
      alert('O\'chirishda xato: ' + e.message);
    }
  };

  // Only display standard (non-super-admin) users
  const standardUsers = users.filter(u => !u.is_super && u.name !== 'Otabek');

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <Shield className="w-5 h-5 text-indigo-500" />
            Admin Paneli
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Do'konlar va tizim foydalanuvchilarini boshqarish</p>
        </div>

        {/* Sub-tabs pills switcher */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40">
          <button 
            onClick={() => setSubTab('stores')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'stores' 
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            <StoreIcon className="w-3.5 h-3.5" />
            Do'konlar
          </button>
          <button 
            onClick={() => setSubTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'users' 
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Foydalanuvchilar
          </button>
        </div>
      </div>

      {/* --- STORES SUB-TAB --- */}
      {subTab === 'stores' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-150 p-4 rounded-2xl shadow-sm">
            <span className="text-sm font-semibold text-slate-800 dark:text-white">Barcha do'konlar ({stores.length})</span>
            <button 
              onClick={() => {
                setAddStoreForm({ name: '', months: '1' });
                setActiveModal('addStore');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1 min-h-[40px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Do'kon qo'shish
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((st) => (
              <div 
                key={st.id}
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between gap-4 shadow-sm"
              >
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{st.name}</h4>
                  <span className="text-[10px] text-slate-400 block mt-1">ID: {st.id}</span>
                  <div className="mt-2.5">
                    {getSubBadge(st)}
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-50 dark:border-slate-800/60 justify-end">
                  {!st.is_vip ? (
                    <>
                      <button 
                        onClick={() => openEditStoreModal(st)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors min-h-[40px] cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Tahrirlash
                      </button>
                      <button 
                        onClick={() => handleDeleteStore(st)}
                        className="bg-red-50/40 dark:bg-red-950/10 border border-red-100 dark:border-red-950/50 text-red-600 dark:text-red-400 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-red-100 transition-colors min-h-[40px] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        O'chirish
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium py-1">Tizim VIP do'koni</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- USERS SUB-TAB --- */}
      {subTab === 'users' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-150 p-4 rounded-2xl shadow-sm">
            <span className="text-sm font-semibold text-slate-800 dark:text-white">Barcha foydalanuvchilar ({standardUsers.length})</span>
            <button 
              onClick={() => {
                setAddUserForm({ name: '', pass: '', storeId: stores[0]?.id || '', role: 'sotuvchi' });
                setActiveModal('addUser');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1 min-h-[40px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Kassir qo'shish
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standardUsers.map((u) => {
              const relStore = stores.find(s => s.id === u.store_id);
              return (
                <div 
                  key={u.id}
                  className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{u.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Do'kon: <strong className="text-slate-700 dark:text-slate-300">{relStore ? relStore.name : '—'}</strong>
                    </p>
                    <div className="mt-2.5">
                      <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {u.role || 'sotuvchi'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-50 dark:border-slate-800/60 justify-end">
                    <button 
                      onClick={() => openEditUserModal(u)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors min-h-[40px] cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u)}
                      className="bg-red-50/40 dark:bg-red-950/10 border border-red-100 dark:border-red-950/50 text-red-600 dark:text-red-400 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-red-100 transition-colors min-h-[40px] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- ADD STORE MODAL --- */}
      {activeModal === 'addStore' && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">🏪 Yangi do'kon qo'shish</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStore} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Do'kon nomi</label>
                <input 
                  type="text"
                  required
                  value={addStoreForm.name}
                  onChange={(e) => setAddStoreForm({ ...addStoreForm, name: e.target.value })}
                  placeholder="Masalan: TELO MAX Chilonzor"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Obuna muddati (oy)</label>
                <select 
                  value={addStoreForm.months}
                  onChange={(e) => setAddStoreForm({ ...addStoreForm, months: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="1">1 oy</option>
                  <option value="3">3 oy</option>
                  <option value="12">1 yil (12 oy)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 text-xs min-h-[44px]"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT STORE MODAL --- */}
      {activeModal === 'editStore' && selectedStore && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">✏️ Do'konni tahrirlash</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStore} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Do'kon nomi</label>
                <input 
                  type="text"
                  required
                  value={editStoreForm.name}
                  onChange={(e) => setEditStoreForm({ ...editStoreForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Obunani uzaytirish (ixtiyoriy)</label>
                <select 
                  value={editStoreForm.addMonths}
                  onChange={(e) => setEditStoreForm({ ...editStoreForm, addMonths: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Uzaytirmaslik</option>
                  <option value="1">+1 oy</option>
                  <option value="3">+3 oy</option>
                  <option value="12">+1 yil (+12 oy)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 text-xs min-h-[44px]"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD USER MODAL --- */}
      {activeModal === 'addUser' && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">👤 Kassir qo'shish</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Kassir Ismi</label>
                <input 
                  type="text"
                  required
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                  placeholder="E.g. Sobir, Malika"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Parol</label>
                <input 
                  type="password"
                  required
                  value={addUserForm.pass}
                  onChange={(e) => setAddUserForm({ ...addUserForm, pass: e.target.value })}
                  placeholder="Parolni kiriting"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tegishli do'kon</label>
                <select 
                  value={addUserForm.storeId}
                  onChange={(e) => setAddUserForm({ ...addUserForm, storeId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Rol</label>
                <select 
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="sotuvchi">Sotuvchi (Kassir)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 text-xs min-h-[44px]"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {activeModal === 'editUser' && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">✏️ Kassirni tahrirlash</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Kassir Ismi</label>
                <input 
                  type="text"
                  required
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Yangi Parol (ixtiyoriy, bo'sh qoldirilsa o'zgarmaydi)</label>
                <input 
                  type="password"
                  value={editUserForm.pass}
                  onChange={(e) => setEditUserForm({ ...editUserForm, pass: e.target.value })}
                  placeholder="Yangi parol kiriting"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tegishli do'kon</label>
                <select 
                  value={editUserForm.storeId}
                  onChange={(e) => setEditUserForm({ ...editUserForm, storeId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Rol</label>
                <select 
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="sotuvchi">Sotuvchi (Kassir)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 text-xs min-h-[44px]"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs min-h-[44px] flex items-center justify-center cursor-pointer"
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

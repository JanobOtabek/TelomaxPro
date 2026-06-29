import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { User, Store, Product, Debt, Sale, AppLog } from './types';

// Component imports
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Sales from './components/Sales';
import Debts from './components/Debts';
import Categories from './components/Categories';
import Reports from './components/Reports';
import AdminPanel from './components/AdminPanel';

import { 
  Smartphone, 
  Settings, 
  LogOut, 
  Home, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  Folder, 
  BarChart3, 
  ShieldAlert, 
  RefreshCw, 
  Moon, 
  Sun, 
  X,
  Lock,
  User as UserIcon,
  Store as StoreIcon
} from 'lucide-react';

const SUPER_ADMIN_NAME = "Otabek";

export default function App() {
  const [curUser, setCurUser] = useState<User | null>(null);
  const [curStore, setCurStore] = useState<Store | null>(null);
  
  // App navigation state
  const [activeTab, setActiveTab] = useState<'dash' | 'prod' | 'sales' | 'debt' | 'cat' | 'rep' | 'admin'>('dash');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // General App settings states
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Subscriptions warning
  const [subWarning, setSubWarning] = useState<string | null>(null);

  // Global store data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [logs, setLogs] = useState<AppLog[]>([]);

  // Admin lists
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Password change states
  const [passwords, setPasswords] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [passChangeSuccess, setPassChangeSuccess] = useState<string | null>(null);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);
  const [passChangeLoading, setPassChangeLoading] = useState(false);

  // --- Auto Login (Remember Me) on Mount ---
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('tm_user_session');
      if (savedSession) {
        const { user, store } = JSON.parse(savedSession);
        setCurUser(user);
        setCurStore(store);
      }
    } catch (e) {
      console.error("Auto login error:", e);
    }

    // Load theme & font settings from localStorage
    const savedTheme = localStorage.getItem('tm_dark');
    if (savedTheme === '1') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedFont = localStorage.getItem('tm_font') as 'sm' | 'md' | 'lg' | null;
    if (savedFont) {
      setFontSize(savedFont);
    }
  }, []);

  // Update document body style when theme changes
  const toggleTheme = () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    try {
      localStorage.setItem('tm_dark', nextVal ? '1' : '0');
    } catch {}
    if (nextVal) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSetFontSize = (sz: 'sm' | 'md' | 'lg') => {
    setFontSize(sz);
    try {
      localStorage.setItem('tm_font', sz);
    } catch {}
  };

  // --- Handle Login Success ---
  const handleLoginSuccess = (user: User, store: Store, rememberMe: boolean) => {
    setCurUser(user);
    setCurStore(store);

    if (rememberMe) {
      try {
        localStorage.setItem('tm_user_session', JSON.stringify({ user, store }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLogout = () => {
    setCurUser(null);
    setCurStore(null);
    try {
      localStorage.removeItem('tm_user_session');
    } catch (e) {
      console.error(e);
    }
  };

  // --- Sync Database Data ---
  const loadStoreData = async (storeId: string) => {
    setSyncing(true);
    setSyncError(null);
    try {
      const [c, p, d, s, l] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', storeId).order('id'),
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('debts').select('*').eq('store_id', storeId).order('date', { ascending: false }),
        supabase.from('sales').select('*').eq('store_id', storeId).order('date', { ascending: false }),
        supabase.from('logs').select('*').eq('store_id', storeId).order('t', { ascending: false }).limit(40)
      ]);

      if (c.error) throw c.error;
      if (p.error) throw p.error;
      if (d.error) throw d.error;
      if (s.error) throw s.error;
      if (l.error) throw l.error;

      setCategories(c.data.map((x: any) => x.name));
      setProducts(p.data || []);
      setDebts(d.data || []);
      setSales(s.data || []);
      setLogs((l.data || []).map((x: any) => ({
        m: x.m,
        t: new Date(x.t).toLocaleString('uz-UZ'),
        store_id: x.store_id
      })));
    } catch (e: any) {
      console.error(e);
      setSyncError(e.message || "Baza bilan ulanishda xato yuz berdi");
    } finally {
      setSyncing(false);
    }
  };

  // Load super admin options
  const loadAdminData = async () => {
    try {
      const [st, us] = await Promise.all([
        supabase.from('stores').select('*').order('id'),
        supabase.from('users').select('*').order('name')
      ]);

      if (st.error) throw st.error;
      if (us.error) throw us.error;

      setAllStores(st.data || []);
      setAllUsers(us.data || []);
    } catch (e: any) {
      console.error("Admin loader error:", e);
    }
  };

  // Sync effect when user logs in
  useEffect(() => {
    if (!curStore) return;

    // First load
    loadStoreData(curStore.id);
    
    const isSuper = curUser?.is_super || curUser?.name === SUPER_ADMIN_NAME;
    if (isSuper) {
      loadAdminData();
    }

    // Warnings configuration
    if (!curStore.is_vip && curStore.sub_expires) {
      const exp = new Date(curStore.sub_expires);
      const daysLeft = Math.ceil((exp.getTime() - Date.now()) / 86400000);
      if (daysLeft <= 7 && daysLeft > 0) {
        setSubWarning(`Ogohlantirish! Do'kon obunasi ${daysLeft} kundan so'ng tugaydi.`);
      } else {
        setSubWarning(null);
      }
    } else {
      setSubWarning(null);
    }

    // Set polling interval (sync every 12 seconds)
    const interval = setInterval(async () => {
      await loadStoreData(curStore.id);
      
      if (isSuper) {
        await loadAdminData();
      }

      // Check current subscription in real time
      try {
        const { data } = await supabase.from('stores').select('sub_expires,is_vip').eq('id', curStore.id);
        if (data && data[0]) {
          const freshStore = data[0];
          if (!freshStore.is_vip && freshStore.sub_expires) {
            const exp = new Date(freshStore.sub_expires);
            if (exp < new Date()) {
              // Expired, close everything
              setCurStore(null);
              setCurUser(null);
              try {
                localStorage.removeItem('tm_user_session');
              } catch {}
            }
          }
        }
      } catch {}
    }, 12000);

    return () => clearInterval(interval);
  }, [curStore, curUser]);

  // Insert log record
  const handleAddLog = async (message: string) => {
    if (!curStore) return;
    try {
      const dateIso = new Date().toISOString();
      await supabase.from('logs').insert({ m: message, store_id: curStore.id, t: dateIso });
      
      // Update local state logs instantly
      setLogs(prev => [
        { m: message, t: new Date(dateIso).toLocaleString('uz-UZ'), store_id: curStore.id },
        ...prev
      ].slice(0, 40));
    } catch (e) {
      console.error(e);
    }
  };

  // Password update action
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curUser) return;

    const { oldPass, newPass, confirmPass } = passwords;
    setPassChangeError(null);
    setPassChangeSuccess(null);

    if (!oldPass || !newPass || !confirmPass) {
      setPassChangeError("Barcha parollarni to'ldiring!");
      return;
    }

    if (oldPass !== curUser.pass) {
      setPassChangeError("Eski parol noto'g'ri!");
      return;
    }

    if (newPass.length < 4) {
      setPassChangeError("Yangi parol kamida 4 belgidan iborat bo'lishi lozim!");
      return;
    }

    if (newPass !== confirmPass) {
      setPassChangeError("Parollar bir-biriga mos kelmadi!");
      return;
    }

    setPassChangeLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ pass: newPass })
        .eq('id', curUser.id);

      if (error) throw error;

      curUser.pass = newPass;
      setPassChangeSuccess("Parol muvaffaqiyatli o'zgartirildi!");
      setPasswords({ oldPass: '', newPass: '', confirmPass: '' });
    } catch (e: any) {
      setPassChangeError(e.message || "Tizimda xato yuz berdi");
    } finally {
      setPassChangeLoading(false);
    }
  };

  const getFontClass = () => {
    if (fontSize === 'sm') return 'text-xs';
    if (fontSize === 'lg') return 'text-base';
    return 'text-sm';
  };

  const isSuperAdmin = curUser?.is_super || curUser?.name === SUPER_ADMIN_NAME;

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-250 ${getFontClass()}`}>
      
      {/* 1. LOGIN SCREEN */}
      {!curUser || !curStore ? (
        <div className="flex items-center justify-center min-h-screen py-10">
          <Login onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        /* 2. MASTER APP LAYOUT */
        <div className="flex flex-col min-h-screen">
          
          {/* Header */}
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3 shadow-sm">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              
              {/* Logo / Title */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/15">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 dark:text-white tracking-tight">{curStore.name}</span>
                    {curStore.is_vip && (
                      <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        VIP
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">TELO MAX Pro</span>
                </div>
              </div>

              {/* Status and Action profile controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right hidden sm:block">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {curUser.name}
                  </span>
                  <span className="text-[9px] bg-blue-50 dark:bg-blue-950/50 border border-blue-100/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase">
                    {curUser.role || 'sotuvchi'}
                  </span>
                </div>

                {/* Settings Trigger */}
                <button 
                  onClick={() => {
                    setPasswords({ oldPass: '', newPass: '', confirmPass: '' });
                    setPassChangeError(null);
                    setPassChangeSuccess(null);
                    setShowSettingsModal(true);
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="Sozlamalar"
                >
                  <Settings className="w-4.5 h-4.5" />
                </button>

                {/* Logout Trigger */}
                <button 
                  onClick={handleLogout}
                  className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 p-2 border border-red-200/20 rounded-xl transition-all font-semibold text-xs min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Chiqish"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span className="hidden md:inline">Chiqish</span>
                </button>
              </div>

            </div>
          </header>

          {/* Subscriptions Overdue or Warning Header */}
          {subWarning && (
            <div className="bg-amber-500/10 text-amber-600 border-b border-amber-500/20 py-2.5 px-4 text-center text-xs font-semibold">
              ⚠️ {subWarning}
            </div>
          )}

          {/* Main Workspace Frame */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-16 space-y-6">
            
            {/* Dynamic tabs navigation */}
            <div className="overflow-x-auto scrollbar-none pb-2">
              <div className="flex gap-1 bg-white dark:bg-slate-900 p-1.5 border border-slate-150 dark:border-slate-800 rounded-2xl w-max min-w-full">
                
                <button 
                  onClick={() => setActiveTab('dash')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'dash' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Bosh sahifa
                </button>

                <button 
                  onClick={() => setActiveTab('prod')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'prod' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Mahsulotlar
                </button>

                <button 
                  onClick={() => setActiveTab('sales')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'sales' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Sotuvlar
                </button>

                <button 
                  onClick={() => setActiveTab('debt')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'debt' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Qarzlar
                </button>

                <button 
                  onClick={() => setActiveTab('cat')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'cat' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  Bo'limlar
                </button>

                <button 
                  onClick={() => setActiveTab('rep')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'rep' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Hisobotlar
                </button>

                {isSuperAdmin && (
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'admin' 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' 
                        : 'text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-950/50'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Admin Panel
                  </button>
                )}

              </div>
            </div>

            {/* Sync State Status Indicator */}
            {syncing && (
              <div className="bg-blue-500/10 text-blue-600 text-[11px] font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 w-max">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Ma'lumotlar bazasi sinxronizatsiya qilinmoqda...
              </div>
            )}

            {syncError && (
              <div className="bg-red-500/10 text-red-600 text-[11px] font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 w-max">
                <span>⚠️ {syncError}</span>
              </div>
            )}

            {/* Tab Views routers */}
            <div className="min-h-[400px]">
              {activeTab === 'dash' && (
                <Dashboard 
                  products={products} 
                  debts={debts} 
                  sales={sales} 
                  logs={logs} 
                />
              )}

              {activeTab === 'prod' && (
                <Products 
                  products={products} 
                  categories={categories} 
                  storeId={curStore.id}
                  sellerName={curUser.name}
                  onRefresh={() => loadStoreData(curStore.id)}
                  onAddLog={handleAddLog}
                />
              )}

              {activeTab === 'sales' && (
                <Sales 
                  sales={sales} 
                  categories={categories} 
                />
              )}

              {activeTab === 'debt' && (
                <Debts 
                  debts={debts} 
                  storeId={curStore.id}
                  onRefresh={() => loadStoreData(curStore.id)}
                  onAddLog={handleAddLog}
                />
              )}

              {activeTab === 'cat' && (
                <Categories 
                  categories={categories} 
                  products={products} 
                  storeId={curStore.id}
                  onRefresh={() => loadStoreData(curStore.id)}
                  onAddLog={handleAddLog}
                />
              )}

              {activeTab === 'rep' && (
                <Reports 
                  sales={sales} 
                />
              )}

              {activeTab === 'admin' && isSuperAdmin && (
                <AdminPanel 
                  stores={allStores}
                  users={allUsers}
                  onRefresh={() => {
                    loadStoreData(curStore.id);
                    loadAdminData();
                  }}
                />
              )}
            </div>

          </main>

          {/* 3. SETTINGS MODAL */}
          {showSettingsModal && (
            <div className="fixed inset-0 bg-slate-950/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
              <div 
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-slate-150 dark:border-slate-800 overflow-y-auto max-h-[92vh]"
                onClick={(e) => e.stopPropagation()}
              >
                
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-slate-800 dark:text-white text-base">Sozlamalar</h3>
                  </div>
                  <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  
                  {/* Appearance Theme */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Ko'rinish</h4>
                    
                    {/* Dark/Light mode toggle */}
                    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-950">
                      <div>
                        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Tungi mavzu (Qorong'u rejim)</span>
                        <span className="text-[10px] text-slate-400">Interfeys tuslarini almashtirish</span>
                      </div>
                      <button 
                        onClick={toggleTheme}
                        className="p-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200"
                      >
                        {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-600" />}
                      </button>
                    </div>

                    {/* Font sizes choice */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Harf o'lchami</span>
                        <span className="text-[10px] text-slate-400">Yozuvlar shrift kattaligi</span>
                      </div>
                      <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/50 dark:border-slate-850 rounded-xl shrink-0">
                        <button 
                          onClick={() => handleSetFontSize('sm')}
                          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${
                            fontSize === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-500'
                          }`}
                        >
                          Kichik
                        </button>
                        <button 
                          onClick={() => handleSetFontSize('md')}
                          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${
                            fontSize === 'md' ? 'bg-blue-600 text-white' : 'text-slate-500'
                          }`}
                        >
                          O'rta
                        </button>
                        <button 
                          onClick={() => handleSetFontSize('lg')}
                          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${
                            fontSize === 'lg' ? 'bg-blue-600 text-white' : 'text-slate-500'
                          }`}
                        >
                          Katta
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info credentials */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tizim ma'lumotlari</h4>
                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-slate-400" /> Foydalanuvchi:</span>
                        <strong className="text-slate-800 dark:text-white">{curUser.name}</strong>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="flex items-center gap-1.5"><StoreIcon className="w-3.5 h-3.5 text-slate-400" /> Do'kon:</span>
                        <strong className="text-slate-800 dark:text-white">{curStore.name}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Security change password */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Xavfsizlik</h4>
                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Eski parol</label>
                        <input 
                          type="password"
                          required
                          value={passwords.oldPass}
                          onChange={(e) => setPasswords({ ...passwords, oldPass: e.target.value })}
                          placeholder="Joriy parol"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Yangi parol (kamida 4 ta belgi)</label>
                        <input 
                          type="password"
                          required
                          value={passwords.newPass}
                          onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                          placeholder="Yangi parolni kiriting"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Yangi parolni tasdiqlang</label>
                        <input 
                          type="password"
                          required
                          value={passwords.confirmPass}
                          onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })}
                          placeholder="Yangi parolni takrorlang"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                        />
                      </div>

                      {passChangeError && (
                        <div className="text-[10px] text-red-500 font-bold bg-red-50/50 p-2 rounded">
                          {passChangeError}
                        </div>
                      )}

                      {passChangeSuccess && (
                        <div className="text-[10px] text-emerald-500 font-bold bg-emerald-50/50 p-2 rounded">
                          {passChangeSuccess}
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={passChangeLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[40px]"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Parolni yangilash
                      </button>
                    </form>
                  </div>

                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="w-full bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold py-3 rounded-xl text-xs transition-colors min-h-[44px]"
                  >
                    Yopish
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="bg-white dark:bg-slate-950 border-t border-slate-150 dark:border-slate-900 py-4 px-6 text-center text-[10px] text-slate-400 dark:text-slate-500 mt-auto">
            <p>© 2026 TELO MAX Pro. Otabek uchun maxsus tahrirlangan tizim.</p>
          </footer>

        </div>
      )}

    </div>
  );
}

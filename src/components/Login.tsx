import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Store } from '../types';
import { Smartphone, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User, store: Store, rememberMe: boolean) => void;
}

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

interface LockState {
  attempts: number;
  lockedUntil: number | null;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockState, setLockState] = useState<LockState>({ attempts: 0, lockedUntil: null });

  // Load lock state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tm_ls');
      if (stored) {
        setLockState(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveLockState = (state: LockState) => {
    setLockState(state);
    try {
      localStorage.setItem('tm_ls', JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  };

  const isCurrentlyLocked = () => {
    if (!lockState.lockedUntil) return false;
    if (Date.now() < lockState.lockedUntil) return true;
    
    // Lock period expired, reset
    saveLockState({ attempts: 0, lockedUntil: null });
    return false;
  };

  const getRemainingLockMinutes = () => {
    if (!lockState.lockedUntil) return 0;
    return Math.ceil((lockState.lockedUntil - Date.now()) / 60000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    if (isCurrentlyLocked()) {
      setErrorMsg(`Tizim vaqtincha qulflangan!`);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Fetch users with the given name
      const { data: dbUsers, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', username.trim());

      if (error) throw error;

      const foundUser = dbUsers?.find((u: any) => u.pass === password);

      if (!foundUser) {
        // Record failed attempt
        const newAttempts = lockState.attempts + 1;
        let lockedUntil = null;
        if (newAttempts >= MAX_ATTEMPTS) {
          lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
        }
        saveLockState({ attempts: newAttempts, lockedUntil });

        if (lockedUntil) {
          setErrorMsg(`Tizim ${LOCK_MINUTES} daqiqaga qulflandi.`);
        } else {
          setErrorMsg(`Xato ma'lumot! Yana ${MAX_ATTEMPTS - newAttempts} ta urinish qoldi.`);
        }
        setLoading(false);
        return;
      }

      // Reset failed attempts on success
      saveLockState({ attempts: 0, lockedUntil: null });

      // Load store details
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', foundUser.store_id);

      if (storeError) throw storeError;

      const foundStore = storeData?.[0] as Store | undefined;
      if (!foundStore) {
        setErrorMsg("Do'kon topilmadi!");
        setLoading(false);
        return;
      }

      // Check subscription
      if (!foundStore.is_vip && foundStore.sub_expires) {
        const exp = new Date(foundStore.sub_expires);
        if (exp < new Date()) {
          setErrorMsg("Do'kon obuna muddati tugagan! Iltimos, administrator bilan bog'laning.");
          setLoading(false);
          return;
        }
      }

      // Login success
      onLoginSuccess(foundUser as User, foundStore, rememberMe);
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Tizimga kirishda xato: " + (e.message || "Tarmoq xatosi"));
    } finally {
      setLoading(false);
    }
  };

  const currentlyLocked = isCurrentlyLocked();
  const lockMinutesLeft = getRemainingLockMinutes();

  return (
    <div className="w-full max-w-md mx-auto my-12 px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl inline-flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
          <Smartphone className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">TELO MAX Pro</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Do'kon boshqaruv tizimi</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

        {currentlyLocked && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold block">Tizim vaqtincha qulflangan!</span>
              Haddan tashqari ko'p xato urinishlar tufayli tizim {lockMinutesLeft} daqiqaga qulflandi.
            </div>
          </div>
        )}

        {errorMsg && !currentlyLocked && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Foydalanuvchi ismi
            </label>
            <input
              type="text"
              required
              disabled={currentlyLocked || loading}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ismingizni kiriting"
              autoComplete="username"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm px-4 py-3 rounded-xl text-slate-800 dark:text-white outline-none transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Parol
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={currentlyLocked || loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolingizni kiriting"
                autoComplete="current-password"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm pl-4 pr-11 py-3 rounded-xl text-slate-800 dark:text-white outline-none transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Switch (Eslab qolish) */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember" className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                Meni eslab qolish
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={currentlyLocked || loading || !username.trim() || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm py-3 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Kirilmoqda...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Kirish
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

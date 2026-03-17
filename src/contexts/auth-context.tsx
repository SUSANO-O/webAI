'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api';
import { config } from '@/config/env';

interface User {
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuthStatus = () => {
    try {
      if (!apiService.isAuthenticated()) {
        setUser(null);
        return;
      }
      const storedUser = localStorage.getItem('user');
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          const role: User['role'] = (parsed.email || '').toLowerCase().includes('admin') ? 'admin' : 'user';
          const u: User = { name: parsed.username || parsed.email?.split('@')[0] || 'User', email: parsed.email, role };
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
          return;
        } catch {}
      }
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } else {
        const email = localStorage.getItem('auth_username') || localStorage.getItem(config.auth.usernameKey);
        if (email) {
          const role: User['role'] = email.toLowerCase().includes('admin') ? 'admin' : 'user';
          const u: User = { name: email.split('@')[0], email, role };
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
        }
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    setLoading(false);
    const onAuthChanged = () => {
      checkAuthStatus();
    };
    window.addEventListener('auth-changed', onAuthChanged);
    return () => window.removeEventListener('auth-changed', onAuthChanged);
  }, []);

  const login = async (email: string, pass: string) => {
    console.log('🔐 [AuthContext] Iniciando login para:', email);
    setLoading(true);
    try {
      await apiService.login({ email, password: pass });
      // Rol básico: si el email contiene 'admin', marcar como admin; de lo contrario user
      const role: User['role'] = email.toLowerCase().includes('admin') ? 'admin' : 'user';
      const loggedUser: User = { name: email.split('@')[0], email, role };
      console.log('✅ [AuthContext] Login exitoso, guardando usuario:', loggedUser);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      router.push('/app');
    } catch (e) {
      console.error('❌ [AuthContext] Error en login:', e);
      throw e;
    } finally {
      setLoading(false);
      console.log('🔐 [AuthContext] Login finalizado, loading = false');
    }
  };

  const logout = () => {
    apiService.clearCredentials();
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

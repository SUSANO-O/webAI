'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api';

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

  useEffect(() => {
    console.log('🔐 [AuthContext] Inicializando contexto de autenticación...');
    try {
      const storedUser = localStorage.getItem('user');
      console.log('🔍 [AuthContext] Usuario en localStorage:', storedUser);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('✅ [AuthContext] Usuario parseado:', parsedUser);
        setUser(parsedUser);
      } else {
        console.log('❌ [AuthContext] No hay usuario en localStorage');
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error al parsear usuario:', error);
    }
    setLoading(false);
    console.log('🔐 [AuthContext] Contexto inicializado, loading = false');
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
    console.log('🔐 [AuthContext] Haciendo logout');
    localStorage.removeItem('user');
    setUser(null);
    console.log('✅ [AuthContext] Logout completado, redirigiendo a login');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

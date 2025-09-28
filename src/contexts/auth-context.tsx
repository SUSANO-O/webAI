'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage', error);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    // This is a mock login. In a real app, you'd call your API.
    // e.g., POST to process.env.NEXT_PUBLIC_API_BASE_URL + '/login'
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    // Mock users
    if (email === 'admin@example.com' && pass === 'admin123') {
      const adminUser: User = { name: 'Admin User', email, role: 'admin' };
      localStorage.setItem('user', JSON.stringify(adminUser));
      setUser(adminUser);
      router.push('/app');
    } else if (email === 'user@example.com' && pass === 'user123') {
      const regularUser: User = { name: 'Regular User', email, role: 'user' };
      localStorage.setItem('user', JSON.stringify(regularUser));
      setUser(regularUser);
      router.push('/app');
    } else {
      setLoading(false);
      throw new Error('Invalid credentials');
    }
    setLoading(false);
  };

  const logout = () => {
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

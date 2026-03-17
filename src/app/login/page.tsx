'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api';

const LOGIN_360_URL = process.env.NEXT_PUBLIC_LOGIN_360_URL || 'https://login-360.vercel.app';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'login-360-success') {
        const { access, email, authType, user } = e.data;
        if (authType === 'jwt') {
          apiService.setToken(access, email, user);
          window.dispatchEvent(new CustomEvent('auth-changed'));
          router.replace('/app');
          return;
        }
        let password = '';
        try {
          const decoded = atob(access);
          if (decoded.includes(':')) {
            password = decoded.split(':').slice(1).join(':');
          }
        } catch {
          apiService.setToken(access, email, user);
          window.dispatchEvent(new CustomEvent('auth-changed'));
          router.replace('/app');
          return;
        }
        if (password) {
          apiService.setCredentials(email, password);
          if (user && typeof window !== 'undefined') {
            localStorage.setItem('userData', JSON.stringify(user));
          }
          window.dispatchEvent(new CustomEvent('auth-changed'));
          router.replace('/app');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [router]);

  return (
    <div className="fixed inset-0 w-full h-full">
      <iframe
        src={`${LOGIN_360_URL}/login?embed=1`}
        className="w-full h-full border-0"
        title="Login"
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiService } from '@/lib/api';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Procesando login...');

  useEffect(() => {
    const access = searchParams.get('access');
    const email = searchParams.get('email');

    if (!access || !email) {
      setStatus('error');
      setMessage('Faltan parámetros de autenticación. Redirigiendo...');
      setTimeout(() => router.replace('/login'), 2000);
      return;
    }

    try {
      let password = '';
      try {
        const decoded = atob(access);
        if (decoded.includes(':')) {
          const parts = decoded.split(':');
          const decodedEmail = parts[0];
          password = parts.slice(1).join(':');
          if (decodedEmail === email && password) {
            apiService.setCredentials(email, password);
            window.dispatchEvent(new CustomEvent('auth-changed'));
            setStatus('success');
            setMessage('¡Login exitoso! Redirigiendo...');
            setTimeout(() => router.replace('/app'), 1000);
            return;
          }
        }
      } catch {
        // No es base64 → JWT
      }

      apiService.setToken(access, email);
      window.dispatchEvent(new CustomEvent('auth-changed'));
      setStatus('success');
      setMessage('¡Login exitoso! Redirigiendo...');
      setTimeout(() => router.replace('/app'), 1000);
    } catch (err) {
      console.error('Auth callback error:', err);
      setStatus('error');
      setMessage('Error al procesar el login. Redirigiendo...');
      setTimeout(() => router.replace('/login'), 2000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-muted/40 font-sans">
      <div className="w-full max-w-md text-center bg-white rounded-2xl shadow-xl p-10">
        {status === 'processing' && (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-gray-700">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

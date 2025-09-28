'use client';

// Configuración de variables de entorno y API
export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
    proxyUrl: process.env.NEXT_PUBLIC_API_PROXY_URL || '/api/proxy',
    timeout: 10000,
    useProxy: true,
  },
  auth: {
    usernameKey: process.env.NEXT_PUBLIC_USERNAME_STORAGE_KEY || 'auth_username',
    passwordKey: process.env.NEXT_PUBLIC_PASSWORD_STORAGE_KEY || 'auth_password',
  },
} as const;

export type Config = typeof config;


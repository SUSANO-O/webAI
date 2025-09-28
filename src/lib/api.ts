'use client';

import { config } from '@/config/env';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  access: string;
  refresh?: string;
  user: User;
}

class ApiService {
  private username: string | null = null;
  private password: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.username = localStorage.getItem(config.auth.usernameKey);
      this.password = localStorage.getItem(config.auth.passwordKey);
    }
  }

  private get authHeader(): HeadersInit {
    if (!this.username || !this.password) return {};
    const token = btoa(`${this.username}:${this.password}`);
    return { Authorization: `Basic ${token}` };
  }

  setCredentials(username: string, password: string) {
    this.username = username;
    this.password = password;
    if (typeof window !== 'undefined') {
      localStorage.setItem(config.auth.usernameKey, username);
      localStorage.setItem(config.auth.passwordKey, password);
    }
  }

  clearCredentials() {
    this.username = null;
    this.password = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(config.auth.usernameKey);
      localStorage.removeItem(config.auth.passwordKey);
    }
  }

  isAuthenticated(): boolean {
    return !!(this.username && this.password);
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Guardar credenciales y validar contra endpoint protegido
    this.setCredentials(credentials.email, credentials.password);
    // Probar con endpoint protegido via proxy genérico
    const response = await fetch(`${config.api.proxyUrl}?path=user/`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader,
      },
    });
    if (!response.ok) {
      this.clearCredentials();
      throw new Error('Credenciales inválidas');
    }
    return {
      access: 'basic-auth-session',
      refresh: 'basic-auth-session',
      user: {
        id: '1',
        email: credentials.email,
        username: credentials.email,
      },
    };
  }
}

export const apiService = new ApiService();


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

  // Template endpoints
  async getTemplates(): Promise<Template[]> {
    const response = await fetch(`${config.api.proxyUrl}?path=template/`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader,
      },
    });
    if (!response.ok) {
      throw new Error('Error al obtener templates');
    }
    return response.json();
  }

  async createTemplate(templateData: CreateTemplateData): Promise<Template> {
    const response = await fetch(`${config.api.proxyUrl}?path=template/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader,
      },
      body: JSON.stringify(templateData),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al crear template' }));
      throw new Error(error.detail || 'Error al crear template');
    }
    return response.json();
  }

  async updateTemplate(id: number, templateData: Partial<CreateTemplateData>): Promise<Template> {
    const response = await fetch(`${config.api.proxyUrl}?path=template/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader,
      },
      body: JSON.stringify(templateData),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al actualizar template' }));
      throw new Error(error.detail || 'Error al actualizar template');
    }
    return response.json();
  }

  async deleteTemplate(id: number): Promise<void> {
    const response = await fetch(`${config.api.proxyUrl}?path=template/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader,
      },
    });
    if (!response.ok) {
      throw new Error('Error al eliminar template');
    }
  }
}

export interface Template {
  id: number;
  name: string;
  emailDesigner: string;
  namespace: string;
  email: string;
  hidden: boolean;
  created_at: string;
  updated_at: string;
  code?: string; // HTML code del template
}

export interface CreateTemplateData {
  name: string;
  emailDesigner: string;
  namespace: string;
  email: string;
  hidden?: boolean;
  code?: string; // HTML code del template
}

export const apiService = new ApiService();


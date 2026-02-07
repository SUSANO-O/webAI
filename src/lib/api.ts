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

// ─── Local Code Storage ───────────────────────────────────────────────
// The backend only stores metadata (name, namespace max 100 chars, etc.)
// HTML code is stored in localStorage keyed by template id.

const CODE_STORAGE_PREFIX = 'template_code_';

function saveCodeLocally(templateId: number, code: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CODE_STORAGE_PREFIX}${templateId}`, code);
    console.log(`💾 [LocalStorage] Saved code for template ${templateId} (${code.length} chars)`);
  } catch (e) {
    console.error('❌ [LocalStorage] Error saving code:', e);
  }
}

function getCodeLocally(templateId: number): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(`${CODE_STORAGE_PREFIX}${templateId}`) || '';
  } catch {
    return '';
  }
}

function removeCodeLocally(templateId: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${CODE_STORAGE_PREFIX}${templateId}`);
  } catch {
    // ignore
  }
}

// ─── API Service ──────────────────────────────────────────────────────

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
    this.setCredentials(credentials.email, credentials.password);
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

  // ─── Template endpoints ───────────────────────────────────────────

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
    const templates: Template[] = await response.json();

    // Hydrate each template with locally stored HTML code
    const hydrated = templates.map((t) => ({
      ...t,
      code: getCodeLocally(t.id) || '',
    }));

    console.log('📦 [API] Templates loaded:', hydrated.map((t) => ({
      id: t.id,
      name: t.name,
      codeLength: t.code.length,
    })));

    return hydrated;
  }

  async createTemplate(templateData: CreateTemplateData): Promise<Template> {
    const htmlCode = templateData.code || '';

    // Send only backend-supported fields
    const payload = {
      name: templateData.name,
      namespace: templateData.namespace,
      emailDesigner: templateData.emailDesigner,
      email: templateData.email,
      hidden: templateData.hidden ?? false,
    };

    console.log('📝 [API] Creating template:', payload.name);

    const response = await fetch(`${config.api.proxyUrl}?path=template/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Create template failed:', response.status, errorText);
      let errorDetail = 'Error al crear template';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.error || errorJson.message || JSON.stringify(errorJson);
      } catch {
        errorDetail = errorText || `HTTP ${response.status}`;
      }
      throw new Error(errorDetail);
    }

    const result: Template = await response.json();

    // Save HTML code locally
    if (htmlCode) {
      saveCodeLocally(result.id, htmlCode);
      result.code = htmlCode;
    }

    console.log('✅ [API] Template created:', { id: result.id, name: result.name, codeLength: htmlCode.length });
    return result;
  }

  async updateTemplate(id: number, templateData: Partial<CreateTemplateData>): Promise<Template> {
    const htmlCode = templateData.code || '';

    // Send only backend-supported fields (omit code)
    const payload: Record<string, unknown> = {};
    if (templateData.name !== undefined) payload.name = templateData.name;
    if (templateData.namespace !== undefined) payload.namespace = templateData.namespace;
    if (templateData.emailDesigner !== undefined) payload.emailDesigner = templateData.emailDesigner;
    if (templateData.email !== undefined) payload.email = templateData.email;
    if (templateData.hidden !== undefined) payload.hidden = templateData.hidden;

    console.log('📝 [API] Updating template:', id, payload.name);

    const response = await fetch(`${config.api.proxyUrl}?path=template/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Update template failed:', response.status, errorText);
      let errorDetail = 'Error al actualizar template';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.error || errorJson.message || JSON.stringify(errorJson);
      } catch {
        errorDetail = errorText || `HTTP ${response.status}`;
      }
      throw new Error(errorDetail);
    }

    const result: Template = await response.json();

    // Save HTML code locally
    if (htmlCode) {
      saveCodeLocally(id, htmlCode);
      result.code = htmlCode;
    }

    console.log('✅ [API] Template updated:', { id: result.id, name: result.name, codeLength: htmlCode.length });
    return result;
  }

  async deleteTemplate(id: number): Promise<void> {
    console.log('🗑️ [API] Deleting template:', id);
    const response = await fetch(`${config.api.proxyUrl}?path=template/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Delete template failed:', response.status, errorText);
      let errorDetail = 'Error al eliminar template';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.error || errorJson.message || JSON.stringify(errorJson);
      } catch {
        errorDetail = errorText || `HTTP ${response.status}`;
      }
      throw new Error(errorDetail);
    }
    // Clean up local code
    removeCodeLocally(id);
    console.log('✅ [API] Template deleted:', id);
  }
}

// ─── Types ────────────────────────────────────────────────────────────

export interface Template {
  id: number;
  name: string;
  emailDesigner: string;
  namespace: string;
  email: string;
  hidden: boolean;
  created_at: string;
  updated_at: string;
  code?: string; // HTML code stored locally
}

export interface CreateTemplateData {
  name: string;
  emailDesigner: string;
  namespace: string;
  email: string;
  hidden?: boolean;
  code?: string; // HTML code to store locally
}

/** Generates a short namespace (max 100 chars) from template name */
export function toShortNamespace(name: string, maxLen = 100): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'template';
  return slug.substring(0, maxLen);
}

export const apiService = new ApiService();

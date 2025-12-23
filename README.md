# AI Website Crafter

This is a NextJS starter in Firebase Studio that uses AI to generate websites from prompts

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

Las dependencias ya están instaladas. Si necesitas reinstalarlas:

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Google AI API Key (requerido para Genkit - intentará usar primero)
# Obtén tu API key en: https://aistudio.google.com/apikey
GOOGLE_GENAI_API_KEY=tu_api_key_aqui

# Hugging Face API Key (opcional - se usa como fallback si Gemini falla)
# Obtén tu API key en: https://huggingface.co/settings/tokens
HUGGING_FACE_API_KEY=tu_huggingface_api_key_aqui

# API Configuration (opcional - tiene valores por defecto)
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
NEXT_PUBLIC_API_PROXY_URL=/api/proxy

# Authentication Storage Keys (opcional - tiene valores por defecto)
NEXT_PUBLIC_USERNAME_STORAGE_KEY=auth_username
NEXT_PUBLIC_PASSWORD_STORAGE_KEY=auth_password
```

### 3. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:9002`

### 4. Iniciar Genkit (Opcional - para desarrollo de AI)

En una terminal separada:

```bash
npm run genkit:dev
```

O con watch mode:

```bash
npm run genkit:watch
```

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo Next.js en el puerto 9002
- `npm run genkit:dev` - Inicia Genkit para desarrollo
- `npm run genkit:watch` - Inicia Genkit en modo watch
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter
- `npm run typecheck` - Verifica los tipos de TypeScript

## 🎨 Características

- **Generación de Sitios Web con IA**: Genera estructuras y contenido de sitios web basados en prompts del usuario
- **Selección de Plantillas**: Permite elegir entre plantillas pre-diseñadas
- **Opciones de Personalización**: Personaliza texto, imágenes y diseño básico
- **Modo Preview**: Previsualiza el sitio antes de desplegar
- **Interfaz de Administración**: Panel simple para tareas administrativas
- **Autenticación**: Sistema básico de usuario y contraseña

## 📁 Estructura del Proyecto

- `src/app/` - Páginas y rutas de Next.js
- `src/components/` - Componentes React reutilizables
- `src/ai/` - Configuración y flujos de Genkit AI
- `src/lib/` - Utilidades y servicios
- `src/config/` - Configuración de la aplicación

## 🔧 Tecnologías

- **Next.js 15** - Framework React
- **Genkit AI** - Framework de IA de Google
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Firebase** - Backend y autenticación
- **Radix UI** - Componentes de UI accesibles



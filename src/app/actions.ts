'use server';

import { generateWebsite } from '@/ai/flows/generate-website-from-prompt';
import { generateApp } from '@/ai/flows/generate-app-from-prompt';

// ─── Website Generation Action ─────────────────────────────────────

export async function generateWebsiteAction(
  prevState: { websiteContent: string; error: string | null },
  formData: FormData
) {
  const prompt = formData.get('prompt') as string;

  if (!prompt) {
    return { websiteContent: prevState.websiteContent, error: 'Prompt is required.' };
  }

  try {
    console.log('🚀 [generateWebsiteAction] Iniciando generación de sitio web...');
    const result = await generateWebsite({ prompt });
    
    if (result?.websiteContent) {
      console.log('✅ [generateWebsiteAction] Sitio web generado exitosamente');
      return { websiteContent: result.websiteContent, error: null };
    } else {
      console.warn('⚠️ [generateWebsiteAction] Respuesta vacía o inválida del AI');
      return {
        websiteContent: prevState.websiteContent,
        error: 'The AI returned an empty or invalid response. Please try again.',
      };
    }
  } catch (e: unknown) {
    console.error('❌ [generateWebsiteAction] Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    const errorString = JSON.stringify(e);
    
    const isGeminiError = 
      errorMessage.includes('Gemini') || 
      errorMessage.includes('googleai') || 
      errorMessage.includes('GoogleGenerativeAI') ||
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('GOOGLE_API_KEY') ||
      errorMessage.includes('GEMINI_API_KEY') ||
      errorMessage.includes('FAILED_PRECONDITION') ||
      errorString.includes('generativelanguage.googleapis.com');
    
    if (isGeminiError) {
      console.log('🔄 [generateWebsiteAction] Fallback con Hugging Face...');
      try {
        const { generateWebsiteWithHuggingFace } = await import('@/ai/huggingface-fallback');
        const fallbackResult = await generateWebsiteWithHuggingFace({ prompt });
        if (fallbackResult?.websiteContent) {
          console.log('✅ [generateWebsiteAction] Fallback exitoso');
          return { websiteContent: fallbackResult.websiteContent, error: null };
        }
      } catch (fallbackError) {
        console.error('❌ [generateWebsiteAction] Fallback falló:', fallbackError);
        return {
          websiteContent: prevState.websiteContent,
          error: `Gemini failed (${errorMessage}) and Hugging Face fallback also failed. Please check your API keys.`,
        };
      }
    }
    
    return {
      websiteContent: prevState.websiteContent,
      error: `Failed to generate website: ${errorMessage}`,
    };
  }
}

// ─── App Generation Action ──────────────────────────────────────────

export interface AppGenerationState {
  appContent: string;
  appMeta: { name: string; description: string; features: string[] } | null;
  error: string | null;
}

export async function generateAppAction(
  prevState: AppGenerationState,
  formData: FormData
): Promise<AppGenerationState> {
  const prompt = formData.get('prompt') as string;
  const appType = (formData.get('appType') as string) || undefined;

  if (!prompt) {
    return { ...prevState, error: 'Prompt is required.' };
  }

  try {
    console.log('🚀 [generateAppAction] Iniciando generación de app...');
    console.log('📋 [generateAppAction] App type:', appType || 'custom');
    
    const result = await generateApp({
      prompt,
      appType: appType as any || 'custom',
    });

    if (result?.appContent) {
      console.log('✅ [generateAppAction] App generada exitosamente');
      return {
        appContent: result.appContent,
        appMeta: result.appMeta,
        error: null,
      };
    } else {
      console.warn('⚠️ [generateAppAction] Respuesta vacía');
      return {
        ...prevState,
        error: 'The AI returned an empty response. Please try again.',
      };
    }
  } catch (e: unknown) {
    console.error('❌ [generateAppAction] Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    const errorString = JSON.stringify(e);

    const isGeminiError =
      errorMessage.includes('Gemini') ||
      errorMessage.includes('googleai') ||
      errorMessage.includes('GoogleGenerativeAI') ||
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorString.includes('generativelanguage.googleapis.com');

    if (isGeminiError) {
      console.log('🔄 [generateAppAction] Fallback con Hugging Face...');
      try {
        const { generateAppWithHuggingFace } = await import('@/ai/huggingface-app');
        const fallbackResult = await generateAppWithHuggingFace({ prompt, appType: appType as any });
        if (fallbackResult?.appContent) {
          console.log('✅ [generateAppAction] Fallback exitoso');
          return {
            appContent: fallbackResult.appContent,
            appMeta: fallbackResult.appMeta,
            error: null,
          };
        }
      } catch (fallbackError) {
        console.error('❌ [generateAppAction] Fallback falló:', fallbackError);
        return {
          ...prevState,
          error: `Gemini and Hugging Face both failed. Please check your API keys.`,
        };
      }
    }

    return {
      ...prevState,
      error: `Failed to generate app: ${errorMessage}`,
    };
  }
}

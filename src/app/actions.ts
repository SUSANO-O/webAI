'use server';

import { generateWebsite } from '@/ai/flows/generate-website-from-prompt';

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
    
    // Explicitly check for the presence of websiteContent
    if (result?.websiteContent) {
      console.log('✅ [generateWebsiteAction] Sitio web generado exitosamente');
      return { websiteContent: result.websiteContent, error: null };
    } else {
      // This will handle null, undefined, or empty string responses from the AI
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
    
    // Detectar si es un error de Gemini (429, quota, API key, etc.)
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
    
    // Intentar fallback con Hugging Face si Gemini falló
    if (isGeminiError) {
      console.log('🔄 [generateWebsiteAction] Error de Gemini detectado, intentando fallback con Hugging Face...');
      console.log('📋 [generateWebsiteAction] Tipo de error:', {
        message: errorMessage,
        status: (e as any)?.status,
        code: (e as any)?.code,
      });
      
      try {
        const { generateWebsiteWithHuggingFace } = await import('@/ai/huggingface-fallback');
        const fallbackResult = await generateWebsiteWithHuggingFace({ prompt });
        
        if (fallbackResult?.websiteContent) {
          console.log('✅ [generateWebsiteAction] Fallback con Hugging Face exitoso');
          return { websiteContent: fallbackResult.websiteContent, error: null };
        }
      } catch (fallbackError) {
        console.error('❌ [generateWebsiteAction] Fallback también falló:', fallbackError);
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

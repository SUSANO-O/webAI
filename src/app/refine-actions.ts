'use server';

import { refineTemplate } from '@/ai/flows/refine-template';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  changesSummary?: string;
  suggestions?: string[];
  timestamp: Date;
}

export interface RefineState {
  currentCode: string;
  messages: ChatMessage[];
  isProcessing: boolean;
  error: string | null;
}

export async function refineTemplateAction(
  prevState: RefineState,
  formData: FormData
): Promise<RefineState> {
  const feedback = formData.get('feedback') as string;
  const currentCode = formData.get('currentCode') as string;
  const messagesJson = formData.get('messages') as string;

  if (!feedback || !currentCode) {
    return {
      ...prevState,
      error: 'Se requiere feedback y código actual',
      isProcessing: false,
    };
  }

  // Parse conversation history
  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  try {
    const messages: ChatMessage[] = messagesJson ? JSON.parse(messagesJson) : [];
    conversationHistory = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10) // Keep last 10 messages for context
      .map(m => ({
        role: m.role,
        content: m.content,
      }));
  } catch (e) {
    console.warn('Error parsing messages:', e);
  }

  try {
    console.log('🚀 [refineTemplateAction] Iniciando refinamiento...');
    console.log('📝 [refineTemplateAction] Feedback:', feedback);
    console.log('📄 [refineTemplateAction] Code length:', currentCode.length);

    const result = await refineTemplate({
      currentCode,
      feedback,
      conversationHistory,
    });

    if (result?.refinedCode) {
      console.log('✅ [refineTemplateAction] Refinamiento exitoso');

      // Create new messages
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: feedback,
        timestamp: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.changesSummary,
        code: result.refinedCode,
        changesSummary: result.changesSummary,
        suggestions: result.suggestions,
        timestamp: new Date(),
      };

      const existingMessages: ChatMessage[] = messagesJson ? JSON.parse(messagesJson) : [];

      return {
        currentCode: result.refinedCode,
        messages: [...existingMessages, userMessage, assistantMessage],
        isProcessing: false,
        error: null,
      };
    } else {
      return {
        ...prevState,
        error: 'El AI devolvió una respuesta vacía. Intenta de nuevo.',
        isProcessing: false,
      };
    }
  } catch (error) {
    console.error('❌ [refineTemplateAction] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return {
      ...prevState,
      error: `Error al refinar: ${errorMessage}`,
      isProcessing: false,
    };
  }
}

// Simple action for direct refinement (non-form based)
export async function refineTemplateDirectAction(
  currentCode: string,
  feedback: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{
  success: boolean;
  refinedCode?: string;
  changesSummary?: string;
  suggestions?: string[];
  error?: string;
}> {
  try {
    console.log('🚀 [refineTemplateDirectAction] Iniciando refinamiento directo...');

    const result = await refineTemplate({
      currentCode,
      feedback,
      conversationHistory: conversationHistory.slice(-10),
    });

    if (result?.refinedCode) {
      console.log('✅ [refineTemplateDirectAction] Refinamiento exitoso');
      return {
        success: true,
        refinedCode: result.refinedCode,
        changesSummary: result.changesSummary,
        suggestions: result.suggestions,
      };
    } else {
      return {
        success: false,
        error: 'El AI devolvió una respuesta vacía',
      };
    }
  } catch (error) {
    console.error('❌ [refineTemplateDirectAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

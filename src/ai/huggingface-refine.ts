'use server';
/**
 * Hugging Face fallback for template refinement
 * Used when Gemini fails to refine templates
 */

import { InferenceClient } from '@huggingface/inference';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

export interface RefineTemplateInput {
  currentCode: string;
  feedback: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface RefineTemplateOutput {
  refinedCode: string;
  changesSummary: string;
  suggestions?: string[];
}

export async function refineTemplateWithHuggingFace(
  input: RefineTemplateInput
): Promise<RefineTemplateOutput> {
  if (!HUGGING_FACE_API_KEY) {
    throw new Error('HUGGING_FACE_API_KEY is not configured');
  }

  console.log('🤖 [HuggingFace-Refine] Iniciando refinamiento con Hugging Face SDK...');

  const systemPrompt = `You are an expert web developer and designer AI specializing in iterative website refinement.

Your task is to take an existing HTML template and apply modifications based on user feedback. You must preserve the existing structure and only make the requested changes.

**Instructions:**

1. **Analyze** the current template code carefully
2. **Understand** what the user wants to change based on their feedback
3. **Apply** ONLY the requested changes - do not make unnecessary modifications
4. **Preserve** the overall structure, styling approach (Tailwind CSS), and functionality
5. **Maintain** responsive design and accessibility features

**Important Rules:**
- Keep using Tailwind CSS utility classes for styling
- Preserve working JavaScript functionality unless asked to change it
- Keep placeholder images from 'https://picsum.photos/seed/{seed}/{width}/{height}'
- If adding new sections, maintain consistent styling with existing ones
- If the user asks for something unclear, make reasonable assumptions

**Output Format:**

Return ONLY a valid JSON object with these keys:
1. "refinedCode": The complete modified HTML code as a string
2. "changesSummary": A brief description of what was changed (in Spanish)
3. "suggestions": Optional array of suggestions for further improvements (in Spanish)

Example:
{
  "refinedCode": "<!DOCTYPE html>...",
  "changesSummary": "Se cambió el color del botón principal de azul a verde",
  "suggestions": ["Considerar agregar animaciones hover", "Mejorar el contraste del texto"]
}`;

  // Build conversation context
  let conversationContext = '';
  if (input.conversationHistory && input.conversationHistory.length > 0) {
    conversationContext = '\n\n**Conversation History:**\n';
    for (const msg of input.conversationHistory) {
      conversationContext += `${msg.role}: ${msg.content}\n`;
    }
  }

  const userPrompt = `**Current Template Code:**
\`\`\`html
${input.currentCode}
\`\`\`
${conversationContext}

**User Feedback/Request:**
${input.feedback}

Apply the requested changes and return ONLY the JSON object.`;

  try {
    const client = new InferenceClient(HUGGING_FACE_API_KEY);

    // Models ordered by reliability for code refinement tasks
    // Qwen3 first (best for code), then Qwen2.5, then fallbacks
    const models = [
      { name: 'Qwen/Qwen3-32B', maxTokens: 4000 },
      { name: 'Qwen/Qwen3-8B', maxTokens: 3000 },
      { name: 'Qwen/Qwen2.5-72B-Instruct', maxTokens: 3000 },
      { name: 'Qwen/Qwen2.5-Coder-32B-Instruct', maxTokens: 3000 },
      { name: 'deepseek-ai/DeepSeek-R1', maxTokens: 4000 },
      { name: 'mistralai/Mistral-7B-Instruct-v0.3', maxTokens: 2500 },
    ];

    let lastError: any = null;

    for (const model of models) {
      try {
        console.log(`🔄 [HuggingFace-Refine] Intentando con modelo: ${model.name}`);

        const response = await client.chatCompletion({
          model: model.name,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: model.maxTokens,
          temperature: 0.5,
          top_p: 0.9,
        });

        if (!response || !response.choices || response.choices.length === 0) {
          throw new Error('No response from model');
        }

        const generatedText = response.choices[0].message.content;
        if (!generatedText) {
          throw new Error('No generated text in response');
        }

        console.log(`✅ [HuggingFace-Refine] Respuesta recibida del modelo ${model.name}`);
        return parseRefineResponse(generatedText);

      } catch (modelError: any) {
        lastError = modelError;
        const errorMessage = modelError.message || String(modelError);
        const errorStatus = modelError.status || modelError.statusCode;

        console.error(`❌ [HuggingFace-Refine] Modelo ${model.name} falló:`, {
          message: errorMessage,
          status: errorStatus,
        });

        // Gateway timeout (504): skip quickly to next model
        if (errorStatus === 504 || errorMessage?.includes('504') || errorMessage?.includes('gateway')) {
          console.log('⏳ [HuggingFace-Refine] Timeout (504). Siguiente modelo en 3s...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        // Model loading (503): wait and retry once
        if (errorStatus === 503 || errorMessage?.includes('503') || errorMessage?.includes('loading')) {
          console.log('⏳ [HuggingFace-Refine] Modelo cargando, esperando 10 segundos...');
          await new Promise(resolve => setTimeout(resolve, 10000));

          try {
            const retryResponse = await client.chatCompletion({
              model: model.name,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: model.maxTokens,
              temperature: 0.5,
              top_p: 0.9,
            });

            if (retryResponse?.choices?.[0]?.message?.content) {
              console.log('✅ [HuggingFace-Refine] Reintento exitoso');
              return parseRefineResponse(retryResponse.choices[0].message.content);
            }
          } catch (retryError: any) {
            console.error('❌ [HuggingFace-Refine] Reintento falló:', retryError.message);
          }
        }

        // Auth errors - stop trying
        if (errorStatus === 401 || errorStatus === 403) {
          throw new Error(`Hugging Face API authentication failed: ${errorMessage}`);
        }

        continue;
      }
    }

    const errorDetails = lastError ? `Last error: ${lastError.message || String(lastError)}` : 'No specific error details';
    throw new Error(`All Hugging Face models failed for template refinement. ${errorDetails}`);

  } catch (error) {
    console.error('❌ [HuggingFace-Refine] Error:', error);
    throw error;
  }
}

function parseRefineResponse(generatedText: string): RefineTemplateOutput {
  // Remove DeepSeek-R1 thinking blocks
  generatedText = generatedText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  
  // Remove markdown code blocks
  generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Find JSON object
  const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('❌ [HuggingFace-Refine] No JSON encontrado:', generatedText.substring(0, 500));
    throw new Error('No JSON object found in response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.refinedCode || !parsed.changesSummary) {
      console.error('❌ [HuggingFace-Refine] Formato inválido:', parsed);
      throw new Error('Invalid response format - missing refinedCode or changesSummary');
    }

    console.log('✅ [HuggingFace-Refine] Respuesta parseada exitosamente');
    return {
      refinedCode: parsed.refinedCode,
      changesSummary: parsed.changesSummary,
      suggestions: parsed.suggestions || [],
    };
  } catch (parseError) {
    console.error('❌ [HuggingFace-Refine] Error al parsear JSON:', parseError);
    throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}

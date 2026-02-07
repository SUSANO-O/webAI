'use server';

/**
 * Fallback function to generate website using Hugging Face API
 * This is used when Gemini fails
 */

import { InferenceClient } from '@huggingface/inference';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

export interface GenerateWebsiteInput {
  prompt: string;
}

export interface GenerateWebsiteOutput {
  websiteContent: string;
  palette: {
    primary: string;
    background: string;
    accent: string;
  };
}

/**
 * Generates a website using Hugging Face API as fallback
 */
export async function generateWebsiteWithHuggingFace(
  input: GenerateWebsiteInput
): Promise<GenerateWebsiteOutput> {
  if (!HUGGING_FACE_API_KEY) {
    throw new Error('HUGGING_FACE_API_KEY is not configured');
  }

  console.log('🤖 [HuggingFace] Iniciando generación con Hugging Face SDK...');

  const systemPrompt = `You are an expert web designer and developer AI. Your task is to generate a complete, single-page landing page based on a user's prompt. The output must be a single HTML file using Tailwind CSS for styling and include functional JavaScript.

**Website Requirements:**

1. **Structure:**
   - Create a well-structured landing page with semantic HTML5 tags (<header>, <nav>, <main>, <section>, <footer>).
   - It must include a hero section, a features section, and a footer at a minimum. Add other relevant sections (e.g., about, contact, testimonials) if they fit the prompt.
   - Ensure all sections have unique id attributes to allow for anchor link navigation (e.g., <section id="features">...).

2. **Content:**
   - Generate relevant and engaging marketing copy for all sections based on the user's prompt.

3. **Styling (Tailwind CSS):**
   - You MUST use Tailwind CSS utility classes directly in the HTML for all styling. Do not use <style> blocks or inline style attributes.
   - The design should be modern, visually appealing, and fully responsive. Use flexbox and grid for layouts.
   - Use placeholder images from 'https://picsum.photos/seed/{seed}/{width}/{height}' where appropriate.

4. **Color Palette:**
   - Generate a cohesive color palette (primary, background, accent) in HSL string format (e.g., "210 40% 96.1%").
   - Apply Tailwind color classes directly in the HTML (e.g., bg-blue-500). Do not use CSS variables.

5. **JavaScript (Functionality):**
   - Include a single <script> tag at the end of the <body>.
   - **Smooth Scrolling:** Implement JavaScript for smooth scrolling when a navigation link (e.g., <a href="#features">...) is clicked.
   - **Form Submission Simulation:** If you include a contact form, add a JavaScript event listener to it. On submission, it should prevent the default form submission, get the form data, and log it to the console using console.log().
   - **Functional Links:** All internal navigation links MUST point to section IDs (e.g., href="#contact") and all external links should point to "#" for demonstration purposes.

**Output Format:**

Return ONLY a valid JSON object with two keys:
1. "websiteContent": A string containing the full HTML and JavaScript of the generated landing page.
2. "palette": An object with "primary", "background", and "accent" color strings in HSL format.

Example format:
{
  "websiteContent": "<!DOCTYPE html>...",
  "palette": {
    "primary": "210 40% 96.1%",
    "background": "0 0% 100%",
    "accent": "210 40% 50%"
  }
}`;

  const userPrompt = `User Prompt: ${input.prompt}

Generate the website now. Return ONLY the JSON object, no other text.`;

  try {
    // Usar el SDK oficial de Hugging Face
    const client = new InferenceClient(HUGGING_FACE_API_KEY);

    // Modelos ordenados por confiabilidad y velocidad de respuesta
    // Qwen3 primero (más reciente y potente), luego Qwen2.5, luego fallbacks
    const models = [
      { name: 'Qwen/Qwen3-32B', maxTokens: 4000 },
      { name: 'Qwen/Qwen3-8B', maxTokens: 3000 },
      { name: 'Qwen/Qwen2.5-72B-Instruct', maxTokens: 3000 },
      { name: 'Qwen/Qwen2.5-Coder-32B-Instruct', maxTokens: 3000 },
      { name: 'deepseek-ai/DeepSeek-R1', maxTokens: 4000 },
      { name: 'mistralai/Mistral-7B-Instruct-v0.3', maxTokens: 2500 },
    ];

    // Intentar con cada modelo hasta que uno funcione
    let lastError: any = null;

    for (const model of models) {
      try {
        console.log(`🔄 [HuggingFace] Intentando con modelo: ${model.name}`);

        // Usar chatCompletion en lugar de textGeneration
        const maxTokens = model.maxTokens;

        const response = await client.chatCompletion({
          model: model.name,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
        });

        if (!response || !response.choices || response.choices.length === 0) {
          throw new Error('No response from model');
        }

        const generatedText = response.choices[0].message.content;
        if (!generatedText) {
          throw new Error('No generated text in response');
        }

        console.log(`✅ [HuggingFace] Respuesta recibida del modelo ${model.name}`);
        console.log(`📄 [HuggingFace] Respuesta length: ${generatedText.length} chars`);
        return parseHuggingFaceResponse({ generated_text: generatedText });

      } catch (modelError: any) {
        lastError = modelError;
        const errorMessage = modelError.message || String(modelError);
        const errorStatus = modelError.status || modelError.statusCode;

        console.error(`❌ [HuggingFace] Modelo ${model.name} falló:`, {
          message: errorMessage,
          status: errorStatus,
          error: modelError,
        });

        // Gateway timeout / provider errors (504): wait and try next model
        if (errorStatus === 504 || errorMessage?.includes('504') || errorMessage?.includes('gateway')) {
          console.log('⏳ [HuggingFace] Timeout del proveedor (504). Probando siguiente modelo en 5s...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // Si el modelo está cargando (503), esperar y reintentar
        if (errorStatus === 503 || errorMessage?.includes('503') || errorMessage?.includes('loading')) {
          console.log('⏳ [HuggingFace] Modelo cargando, esperando 15 segundos...');
          await new Promise(resolve => setTimeout(resolve, 15000));

          // Reintentar una vez
          try {
            const retryResponse = await client.chatCompletion({
              model: model.name,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: model.maxTokens,
              temperature: 0.7,
              top_p: 0.9,
            });

            if (retryResponse?.choices?.[0]?.message?.content) {
              console.log('✅ [HuggingFace] Reintento exitoso');
              return parseHuggingFaceResponse({ generated_text: retryResponse.choices[0].message.content });
            }
          } catch (retryError: any) {
            console.error('❌ [HuggingFace] Reintento falló:', retryError.message);
          }
        }

        // Si es un error de autenticación o permisos, no intentar más modelos
        if (errorStatus === 401 || errorStatus === 403 || errorMessage?.includes('API key') || errorMessage?.includes('permission')) {
          throw new Error(`Hugging Face API authentication failed: ${errorMessage}. Please check your HUGGING_FACE_API_KEY.`);
        }

        // Continuar con el siguiente modelo
        continue;
      }
    }

    // Si llegamos aquí, todos los modelos fallaron
    const errorDetails = lastError ? `Last error: ${lastError.message || String(lastError)}` : 'No specific error details';
    throw new Error(`All Hugging Face models failed. ${errorDetails}. Please check your API key at https://huggingface.co/settings/tokens and ensure it has read permissions.`);
    
  } catch (error) {
    console.error('❌ [HuggingFace] Error calling Hugging Face API:', error);
    throw error;
  }
}

/**
 * Parsea la respuesta de Hugging Face API
 */
function parseHuggingFaceResponse(data: any): GenerateWebsiteOutput {
  // El SDK de Hugging Face devuelve directamente el texto generado
  let generatedText = '';
  if (data.generated_text) {
    generatedText = data.generated_text;
  } else if (typeof data === 'string') {
    generatedText = data;
  } else if (Array.isArray(data) && data[0]?.generated_text) {
    generatedText = data[0].generated_text;
  } else {
    console.error('❌ [HuggingFace] Formato de respuesta inesperado:', data);
    throw new Error('Unexpected response format from Hugging Face API');
  }

  // DeepSeek-R1 puede incluir bloques de razonamiento entre <think>...</think>
  // Removemos estos bloques para extraer solo la respuesta final
  generatedText = generatedText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Remove markdown code blocks if present
  generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Try to find JSON object in the response
  const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('❌ [HuggingFace] No JSON encontrado en la respuesta:', generatedText.substring(0, 500));
    throw new Error('No JSON object found in Hugging Face response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.websiteContent || !parsed.palette) {
      console.error('❌ [HuggingFace] Formato inválido:', parsed);
      throw new Error('Invalid response format from Hugging Face API - missing websiteContent or palette');
    }

    console.log('✅ [HuggingFace] Respuesta parseada exitosamente');
    return {
      websiteContent: parsed.websiteContent,
      palette: parsed.palette,
    };
  } catch (parseError) {
    console.error('❌ [HuggingFace] Error al parsear JSON:', parseError);
    throw new Error(`Failed to parse JSON from Hugging Face response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}


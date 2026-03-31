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

  const systemPrompt = `You are a world-class expert in web layout, UI/UX design, and front-end development with 15+ years of experience building high-converting landing pages for Fortune 500 companies. You have deep mastery of visual hierarchy, typography, color theory, whitespace, and responsive grid systems. Your designs are pixel-perfect, visually stunning, and follow modern design trends (glassmorphism, neumorphism, bold gradients, micro-interactions).

Your task is to generate a complete, single-page landing page based on the user's prompt. Output must be a single HTML file using Tailwind CSS and functional JavaScript.

**Layout & Design Standards (MANDATORY):**

1. **Visual Hierarchy:**
   - Use a clear typographic scale: display headings (text-5xl/6xl), section titles (text-3xl/4xl), body (text-base/lg).
   - Apply generous whitespace (py-20, py-24 for sections) to breathe and avoid cramped layouts.
   - Create visual contrast using bold backgrounds, gradient overlays, and accent colors.

2. **Structure:**
   - Semantic HTML5: <header>, <nav>, <main>, <section id="...">, <footer>.
   - Mandatory sections: sticky navigation, hero (full viewport height), features/benefits, social proof or stats, CTA, footer.
   - Add sections that fit the prompt: testimonials, pricing, team, gallery, FAQ, etc.

3. **Styling (Tailwind CSS ONLY):**
   - Use Tailwind utility classes exclusively. NO <style> blocks, NO inline style attributes.
   - Hero section must use a dramatic gradient background (e.g., from-slate-900 via-purple-900 to-slate-900).
   - Cards must have hover effects: hover:scale-105, hover:shadow-2xl, transition-all duration-300.
   - Use rounded-2xl, shadow-xl on cards. Buttons must be large, bold, with gradient backgrounds and hover:opacity-90.
   - Fully responsive: use responsive prefixes (sm:, md:, lg:, xl:) on all grid/flex layouts.

4. **Images (CRITICAL):**
   - ALL images MUST use <img> tags with data-editable="true" attribute.
   - NEVER use CSS background-image. Use <img> tags only.
   - Use: https://picsum.photos/seed/{keyword}/{width}/{height} (e.g., https://picsum.photos/seed/hero/1200/600).
   - Include images in hero, cards, testimonials, team sections.

5. **Color Palette:**
   - Pick a cohesive, professional palette. Return HSL strings (e.g., "262 83% 58%").
   - Apply colors through Tailwind classes (bg-purple-600, text-emerald-400, etc.).

6. **JavaScript:**
   - Single <script> at end of <body>.
   - Smooth scrolling for nav links, mobile menu toggle, form validation with console.log().
   - Add subtle scroll animations using IntersectionObserver if appropriate.

**Output Format — CRITICAL:**
Return ONLY a valid JSON object. No explanation, no markdown, no code fences. Just the raw JSON:
{"websiteContent":"<!DOCTYPE html>...complete HTML here...","palette":{"primary":"262 83% 58%","background":"224 71% 4%","accent":"142 76% 36%"}}`;

  const userPrompt = `User Prompt: ${input.prompt}

IMPORTANT: Return ONLY the raw JSON object. Start your response with { and end with }. No other text before or after.`;

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

/** Convierte JSON string escapes a sus caracteres reales.
 *  Necesario cuando extraemos HTML crudo desde dentro de un JSON truncado:
 *  \" → "   \n → newline   \t → tab   \/ → /   \\ → \
 */
function unescapeJsonString(s: string): string {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\//g, '/')
    .replace(/\\\\/g, '\\');
}

const DEFAULT_PALETTE = {
  primary: '36 92% 52%',
  background: '0 0% 100%',
  accent: '180 55% 45%',
};

/**
 * Parsea la respuesta de Hugging Face API.
 * Usa múltiples estrategias en cascada porque los modelos truncan JSON
 * (bloques <think> consumen tokens, el JSON queda sin cerrar).
 */
function parseHuggingFaceResponse(data: any): GenerateWebsiteOutput {
  // 1. Extraer texto generado
  let raw = '';
  if (data.generated_text) {
    raw = data.generated_text;
  } else if (typeof data === 'string') {
    raw = data;
  } else if (Array.isArray(data) && data[0]?.generated_text) {
    raw = data[0].generated_text;
  } else {
    throw new Error('Unexpected response format from Hugging Face API');
  }

  // 2. Quitar bloques <think>...</think> (Qwen3, DeepSeek-R1)
  raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 3. Quitar markdown fences
  raw = raw.replace(/^```json\s*/i, '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // ── Estrategia A: JSON.parse directo ─────────────────────────
  try {
    const p = JSON.parse(raw);
    if (p?.websiteContent) {
      console.log('✅ [HuggingFace] Parseado con estrategia A (JSON directo)');
      return { websiteContent: p.websiteContent, palette: p.palette || DEFAULT_PALETTE };
    }
  } catch { /* continúa */ }

  // ── Estrategia B: buscar primer { y último } ──────────────────
  const firstBrace = raw.indexOf('{');
  if (firstBrace !== -1) {
    let lastBrace = raw.lastIndexOf('}');
    while (lastBrace > firstBrace) {
      try {
        const candidate = raw.substring(firstBrace, lastBrace + 1);
        const p = JSON.parse(candidate);
        if (p?.websiteContent) {
          console.log('✅ [HuggingFace] Parseado con estrategia B (recorte JSON)');
          return { websiteContent: p.websiteContent, palette: p.palette || DEFAULT_PALETTE };
        }
      } catch { /* probar con } anterior */ }
      lastBrace = raw.lastIndexOf('}', lastBrace - 1);
    }
  }

  // ── Estrategia C: JSON truncado — extraer HTML directamente ───
  // El modelo generó JSON pero se cortó antes del cierre. Extraemos
  // el valor de "websiteContent" leyendo desde la primera < hasta </html>,
  // luego desescapamos los escape sequences de JSON (\", \\n, \\t, etc.)
  const keyIdx = raw.search(/"websiteContent"\s*:/);
  if (keyIdx !== -1) {
    const afterColon = raw.indexOf(':', keyIdx) + 1;
    const htmlStart = raw.indexOf('<', afterColon);
    if (htmlStart !== -1) {
      const htmlEnd = raw.search(/<\/html\s*>/i);
      let htmlContent = htmlEnd !== -1
        ? raw.substring(htmlStart, htmlEnd + 7)   // incluye </html>
        : raw.substring(htmlStart);               // hasta el final si no hay cierre
      // Desescapar JSON string escapes que quedaron en el HTML crudo
      htmlContent = unescapeJsonString(htmlContent);
      if (htmlContent.length > 100) {
        console.log('✅ [HuggingFace] Parseado con estrategia C (extracción HTML de JSON truncado)');
        return { websiteContent: htmlContent, palette: DEFAULT_PALETTE };
      }
    }
  }

  // ── Estrategia D: la respuesta ya ES HTML (modelo ignoró JSON) ─
  const trimmed = raw.trim();
  if (/^<!doctype|^<html/i.test(trimmed)) {
    console.log('✅ [HuggingFace] Parseado con estrategia D (HTML directo)');
    return { websiteContent: trimmed, palette: DEFAULT_PALETTE };
  }

  console.error('❌ [HuggingFace] Todas las estrategias fallaron. Preview (500 chars):', raw.substring(0, 500));
  throw new Error('No se pudo extraer websiteContent de la respuesta de Hugging Face');
}


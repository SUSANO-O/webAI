'use server';
/**
 * Hugging Face fallback for web app generation
 * Uses a two-step approach: first generate the HTML, then get metadata
 * This avoids JSON truncation issues with large HTML content
 */

import { InferenceClient } from '@huggingface/inference';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

export interface GenerateAppInput {
  prompt: string;
  appType?: 'dashboard' | 'crud' | 'ecommerce' | 'social' | 'productivity' | 'custom';
}

export interface GenerateAppOutput {
  appContent: string;
  palette: { primary: string; background: string; accent: string };
  appMeta: { name: string; description: string; features: string[] };
}

export async function generateAppWithHuggingFace(
  input: GenerateAppInput
): Promise<GenerateAppOutput> {
  if (!HUGGING_FACE_API_KEY) {
    throw new Error('HUGGING_FACE_API_KEY is not configured');
  }

  console.log('🤖 [HuggingFace-App] Iniciando generación de app...');

  // STEP 1: Generate just the HTML (no JSON wrapper to avoid truncation)
  const systemPrompt = `You are a senior full-stack web engineer. You generate complete, production-grade single-file web applications.

CRITICAL RULES:
- Output ONLY the raw HTML code. No JSON, no markdown, no explanation.
- Start with <!DOCTYPE html> and end with </html>
- Everything in ONE file: HTML + Tailwind CSS (via CDN) + JavaScript

TECHNICAL REQUIREMENTS:
- Use <script src="https://cdn.tailwindcss.com"></script> for styling
- Use <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script> for icons
- Hash-based routing (#/dashboard, #/list, etc.)
- Global state object with localStorage persistence
- CRUD operations for main entities
- Seed 10+ demo records on first load
- Sidebar navigation with active states
- Dark mode toggle
- Data tables with search/filter
- Forms with validation
- Modal dialogs for create/edit/delete
- Toast notifications
- Responsive design (mobile drawer sidebar)
- Professional enterprise SaaS look`;

  const userPrompt = `Build this web application: ${input.prompt}
${input.appType ? `Type: ${input.appType}` : ''}

Output ONLY the complete HTML file. Start with <!DOCTYPE html> and end with </html>. No other text.`;

  try {
    const client = new InferenceClient(HUGGING_FACE_API_KEY);

    // Models with maximum tokens for large HTML output
    const models = [
      { name: 'Qwen/Qwen2.5-Coder-32B-Instruct', maxTokens: 16384 },
      { name: 'Qwen/Qwen3-32B', maxTokens: 16384 },
      { name: 'Qwen/Qwen2.5-72B-Instruct', maxTokens: 8192 },
      { name: 'Qwen/Qwen3-8B', maxTokens: 8192 },
      { name: 'deepseek-ai/DeepSeek-R1', maxTokens: 8192 },
    ];

    let lastError: any = null;

    for (const model of models) {
      try {
        console.log(`🔄 [HuggingFace-App] Intentando con modelo: ${model.name}`);

        const response = await client.chatCompletion({
          model: model.name,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: model.maxTokens,
          temperature: 0.7,
          top_p: 0.9,
        });

        if (!response || !response.choices || response.choices.length === 0) {
          throw new Error('No response from model');
        }

        let generatedText = response.choices[0].message.content || '';
        if (!generatedText) {
          throw new Error('No generated text in response');
        }

        console.log(`✅ [HuggingFace-App] Respuesta recibida del modelo ${model.name}`);
        console.log(`📄 [HuggingFace-App] Respuesta length: ${generatedText.length} chars`);

        // Clean up response
        generatedText = generatedText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        generatedText = generatedText.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

        // Extract the HTML from the response
        const htmlContent = extractHTML(generatedText);
        
        if (!htmlContent || htmlContent.length < 500) {
          throw new Error(`HTML too short (${htmlContent?.length || 0} chars). Model may have truncated.`);
        }

        // Repair truncated HTML if needed
        const repairedHtml = repairTruncatedHTML(htmlContent);

        console.log(`✅ [HuggingFace-App] HTML extraído: ${repairedHtml.length} chars`);

        // Derive metadata from the HTML content
        const appName = extractAppName(repairedHtml, input.prompt);
        
        return {
          appContent: repairedHtml,
          palette: {
            primary: '220 70% 50%',
            background: '0 0% 100%',
            accent: '262 80% 50%',
          },
          appMeta: {
            name: appName,
            description: input.prompt.substring(0, 100),
            features: extractFeatures(repairedHtml),
          },
        };

      } catch (modelError: any) {
        lastError = modelError;
        const errorMessage = modelError.message || String(modelError);
        const errorStatus = modelError.status || modelError.statusCode;

        console.error(`❌ [HuggingFace-App] Modelo ${model.name} falló:`, {
          message: errorMessage,
          status: errorStatus,
        });

        if (errorStatus === 504 || errorMessage?.includes('504') || errorMessage?.includes('gateway')) {
          console.log('⏳ [HuggingFace-App] Timeout (504). Siguiente modelo en 5s...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        if (errorStatus === 503 || errorMessage?.includes('503') || errorMessage?.includes('loading')) {
          console.log('⏳ [HuggingFace-App] Modelo cargando, esperando 15s...');
          await new Promise(resolve => setTimeout(resolve, 15000));
          
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
              let text = retryResponse.choices[0].message.content;
              text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
              text = text.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
              const html = extractHTML(text);
              if (html && html.length >= 500) {
                const repaired = repairTruncatedHTML(html);
                return {
                  appContent: repaired,
                  palette: { primary: '220 70% 50%', background: '0 0% 100%', accent: '262 80% 50%' },
                  appMeta: { name: extractAppName(repaired, input.prompt), description: input.prompt.substring(0, 100), features: extractFeatures(repaired) },
                };
              }
            }
          } catch (retryError: any) {
            console.error('❌ [HuggingFace-App] Reintento falló:', retryError.message);
          }
        }

        if (errorStatus === 401 || errorStatus === 403) {
          throw new Error(`Hugging Face API authentication failed: ${errorMessage}`);
        }

        continue;
      }
    }

    const errorDetails = lastError ? `Last error: ${lastError.message || String(lastError)}` : '';
    throw new Error(`All Hugging Face models failed for app generation. ${errorDetails}`);

  } catch (error) {
    console.error('❌ [HuggingFace-App] Error:', error);
    throw error;
  }
}

// ─── Helper Functions ──────────────────────────────────────────────

function extractHTML(text: string): string {
  // Try to find <!DOCTYPE html>...</html>
  const doctypeMatch = text.match(/<!DOCTYPE html>[\s\S]*/i);
  if (doctypeMatch) {
    return doctypeMatch[0];
  }

  // Try <html>...</html>
  const htmlMatch = text.match(/<html[\s\S]*/i);
  if (htmlMatch) {
    return '<!DOCTYPE html>\n' + htmlMatch[0];
  }

  // If it looks like HTML (has tags), use it
  if (text.includes('<head') || text.includes('<body') || text.includes('<div')) {
    return '<!DOCTYPE html>\n<html>\n' + text;
  }

  // Try to extract from JSON if the model wrapped it anyway
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      // Try repair first
      const repaired = tryRepairJSON(jsonMatch[0]);
      const parsed = JSON.parse(repaired);
      if (parsed.appContent) return parsed.appContent;
    }
  } catch {
    // Ignore JSON parse errors
  }

  return text;
}

function repairTruncatedHTML(html: string): string {
  // If it already ends with </html>, it's complete
  if (html.trim().endsWith('</html>')) {
    return html;
  }

  console.log('🔧 [HuggingFace-App] Reparando HTML truncado...');

  // Close any open script tags
  const scriptOpens = (html.match(/<script/g) || []).length;
  const scriptCloses = (html.match(/<\/script>/g) || []).length;
  if (scriptOpens > scriptCloses) {
    // Check if we're inside a script tag content
    const lastScriptOpen = html.lastIndexOf('<script');
    const lastScriptClose = html.lastIndexOf('</script>');
    if (lastScriptOpen > lastScriptClose) {
      // We're inside an open script - close it
      html += '\n})();\n</script>';
    }
  }

  // Close any open style tags
  const styleOpens = (html.match(/<style/g) || []).length;
  const styleCloses = (html.match(/<\/style>/g) || []).length;
  if (styleOpens > styleCloses) {
    html += '\n</style>';
  }

  // Ensure body and html are closed
  if (!html.includes('</body>')) {
    html += '\n</body>';
  }
  if (!html.includes('</html>')) {
    html += '\n</html>';
  }

  return html;
}

function tryRepairJSON(jsonStr: string): string {
  // Try to fix unterminated strings by finding the last complete property
  let repaired = jsonStr;
  
  // If it ends abruptly, try to close it
  if (!repaired.trim().endsWith('}')) {
    // Find the appContent value and try to extract it
    const contentStart = repaired.indexOf('"appContent"');
    if (contentStart !== -1) {
      const valueStart = repaired.indexOf(':"', contentStart) + 2;
      if (valueStart > 1) {
        // Find the last unescaped quote
        let lastQuote = -1;
        for (let i = repaired.length - 1; i > valueStart; i--) {
          if (repaired[i] === '"' && repaired[i - 1] !== '\\') {
            lastQuote = i;
            break;
          }
        }
        if (lastQuote > valueStart) {
          repaired = repaired.substring(0, lastQuote + 1) + ',"palette":{"primary":"220 70% 50%","background":"0 0% 100%","accent":"262 80% 50%"},"appMeta":{"name":"App","description":"Generated","features":[]}}';
        }
      }
    }
  }
  
  return repaired;
}

function extractAppName(html: string, prompt: string): string {
  // Try to find <title> tag
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1].trim()) {
    return titleMatch[1].trim();
  }
  // Derive from prompt
  const words = prompt.split(' ').slice(0, 3).join(' ');
  return words || 'Web App';
}

function extractFeatures(html: string): string[] {
  const features: string[] = [];
  if (html.includes('localStorage')) features.push('Persistencia de datos');
  if (html.includes('dark')) features.push('Dark mode');
  if (html.includes('search') || html.includes('filter')) features.push('Búsqueda/Filtros');
  if (html.includes('modal') || html.includes('dialog')) features.push('Modales');
  if (html.includes('table') || html.includes('grid')) features.push('Tablas de datos');
  if (html.includes('form')) features.push('Formularios');
  if (html.includes('toast') || html.includes('notification')) features.push('Notificaciones');
  if (html.includes('#/') || html.includes('hash')) features.push('Routing SPA');
  if (html.includes('sidebar')) features.push('Sidebar navegación');
  if (html.includes('chart') || html.includes('Chart')) features.push('Gráficas');
  return features.length > 0 ? features : ['Web App completa'];
}

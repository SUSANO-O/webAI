'use server';
/**
 * @fileOverview AI-powered template refinement flow
 * 
 * This flow takes an existing HTML template and user feedback to generate
 * an improved version. It's designed for iterative refinement in a chat-like interface.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RefineTemplateInputSchema = z.object({
  currentCode: z.string().describe('The current HTML code of the template'),
  feedback: z.string().describe('User feedback or instructions for modifications'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('Previous conversation history for context'),
});
export type RefineTemplateInput = z.infer<typeof RefineTemplateInputSchema>;

const RefineTemplateOutputSchema = z.object({
  refinedCode: z.string().describe('The refined HTML code with applied changes'),
  changesSummary: z.string().describe('A brief summary of the changes made'),
  suggestions: z.array(z.string()).optional().describe('Optional suggestions for further improvements'),
});
export type RefineTemplateOutput = z.infer<typeof RefineTemplateOutputSchema>;

export async function refineTemplate(input: RefineTemplateInput): Promise<RefineTemplateOutput> {
  try {
    console.log('🤖 [refineTemplate] Intentando refinamiento con Gemini...');
    return await refineTemplateFlow(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = JSON.stringify(error);
    
    // Detectar si es un error de Gemini
    const isGeminiError = 
      errorMessage.includes('Gemini') || 
      errorMessage.includes('googleai') || 
      errorMessage.includes('GoogleGenerativeAI') ||
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('GOOGLE_API_KEY') ||
      errorMessage.includes('GEMINI_API_KEY') ||
      errorMessage.includes('FAILED_PRECONDITION') ||
      errorString.includes('generativelanguage.googleapis.com') ||
      (error as any)?.status === 429;
    
    if (isGeminiError) {
      console.error('❌ [refineTemplate] Error con Gemini:', errorMessage);
      console.log('🔄 [refineTemplate] Intentando fallback con Hugging Face...');
      
      try {
        const { refineTemplateWithHuggingFace } = await import('@/ai/huggingface-refine');
        const result = await refineTemplateWithHuggingFace(input);
        console.log('✅ [refineTemplate] Refinamiento exitoso con Hugging Face');
        return result;
      } catch (fallbackError) {
        console.error('❌ [refineTemplate] Error con Hugging Face fallback:', fallbackError);
        throw new Error(
          `Failed to refine template with Gemini (${errorMessage}). Fallback to Hugging Face also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
        );
      }
    } else {
      throw error;
    }
  }
}

const refinePrompt = ai.definePrompt({
  name: 'refineTemplatePrompt',
  input: { schema: RefineTemplateInputSchema },
  output: { schema: RefineTemplateOutputSchema },
  prompt: `You are an expert web developer and designer AI specializing in iterative website refinement.

Your task is to take an existing HTML template and apply modifications based on user feedback. You must preserve the existing structure and only make the requested changes.

**Current Template Code:**
\`\`\`html
{{{currentCode}}}
\`\`\`

{{#if conversationHistory}}
**Conversation History:**
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}

**User Feedback/Request:**
{{{feedback}}}

**Instructions:**

1. **Read** the user request carefully and identify the EXACT elements to change
2. **Locate** the specific HTML elements, classes, or sections mentioned
3. **Apply** ONLY the minimum necessary changes — do not restructure or rewrite anything not explicitly requested
4. **Preserve** 100% of the rest: all other sections, text, classes, IDs, scripts, layout, colors

**CRITICAL — Surgical editing rules:**
- If the user says "change the header color", only change the header background class. Nothing else.
- If the user says "make the button bigger", only change that button's size classes. Nothing else.
- If the user says "add a testimonials section", add only that section. Do NOT touch hero, nav, footer, or any other section.
- NEVER rewrite the whole page for a partial request. This is the most important rule.
- Count the lines you changed — if more than 30% of the file changed for a small request, you went too far.
- Keep using Tailwind CSS utility classes for styling
- Preserve all working JavaScript unless explicitly asked to modify it
- **Images (CRITICAL):** ALL images MUST use \`<img>\` tags with \`data-editable="true"\`. NEVER CSS \`background-image\`. Use \`https://picsum.photos/seed/{keyword}/{width}/{height}\` for new placeholders.
- When adding new images: \`<img src="https://picsum.photos/seed/{keyword}/{width}/{height}" alt="..." data-editable="true" class="...">\`
- If existing images use \`background-image\` CSS, convert them to \`<img data-editable="true">\`
- If adding new sections, match the visual style (colors, spacing, border-radius) of existing sections

**Output Format:**

Return a JSON object with:
1. \`refinedCode\`: The complete HTML with ONLY the requested changes applied
2. \`changesSummary\`: A brief description of exactly what was changed (in Spanish)
3. \`suggestions\`: Optional 2-3 short follow-up ideas the user might want next (in Spanish)

Be precise — the user wants surgical edits, not rewrites.
`,
});

const refineTemplateFlow = ai.defineFlow(
  {
    name: 'refineTemplateFlow',
    inputSchema: RefineTemplateInputSchema,
    outputSchema: RefineTemplateOutputSchema,
  },
  async (input) => {
    const { output } = await refinePrompt(input);
    return output!;
  }
);

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

1. **Analyze** the current template code carefully
2. **Understand** what the user wants to change based on their feedback
3. **Apply** ONLY the requested changes - do not make unnecessary modifications
4. **Preserve** the overall structure, styling approach (Tailwind CSS), and functionality
5. **Maintain** responsive design and accessibility features

**Important Rules:**
- Keep using Tailwind CSS utility classes for styling
- Preserve working JavaScript functionality unless asked to change it
- **Images (CRITICAL):** ALL images MUST use \`<img>\` HTML tags with \`data-editable="true"\` attribute. NEVER use CSS \`background-image\` for content images. Use \`https://picsum.photos/seed/{keyword}/{width}/{height}\` for new placeholder images.
- When adding new images always use: \`<img src="https://picsum.photos/seed/{keyword}/{width}/{height}" alt="..." data-editable="true" class="...">\`
- If existing images use \`background-image\` CSS, convert them to proper \`<img>\` tags with \`data-editable="true"\`
- If adding new sections, maintain consistent styling with existing ones
- If the user asks for something unclear, make reasonable assumptions and note them in suggestions

**Output Format:**

Return a JSON object with:
1. \`refinedCode\`: The complete modified HTML code
2. \`changesSummary\`: A brief description of what was changed (in Spanish)
3. \`suggestions\`: Optional array of suggestions for further improvements (in Spanish)

Be precise and efficient - the user wants to iterate quickly.
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

'use server';
/**
 * @fileOverview Generates a complete single-file web application (SPA).
 *
 * Unlike the website generator (landing pages), this creates interactive apps
 * with state management, routing simulation, CRUD operations, etc.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAppInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the desired web application.'),
  appType: z.enum(['dashboard', 'crud', 'ecommerce', 'social', 'productivity', 'custom']).optional().describe('The type of app to generate'),
});
export type GenerateAppInput = z.infer<typeof GenerateAppInputSchema>;

const GenerateAppOutputSchema = z.object({
  appContent: z
    .string()
    .describe('The generated HTML/CSS/JS content for the web application.'),
  palette: z.object({
    primary: z.string().describe('Primary color in HSL format.'),
    background: z.string().describe('Background color in HSL format.'),
    accent: z.string().describe('Accent color in HSL format.'),
  }).describe('Color palette for the app.'),
  appMeta: z.object({
    name: z.string().describe('The name of the app'),
    description: z.string().describe('Short description of what the app does'),
    features: z.array(z.string()).describe('List of key features implemented'),
  }).describe('Metadata about the generated app'),
});
export type GenerateAppOutput = z.infer<typeof GenerateAppOutputSchema>;

export async function generateApp(input: GenerateAppInput): Promise<GenerateAppOutput> {
  try {
    console.log('🤖 [generateApp] Intentando con Gemini...');
    return await generateAppFlow(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = JSON.stringify(error);

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
      console.error('❌ [generateApp] Error con Gemini:', errorMessage);
      console.log('🔄 [generateApp] Intentando fallback con Hugging Face...');

      try {
        const { generateAppWithHuggingFace } = await import('@/ai/huggingface-app');
        const result = await generateAppWithHuggingFace(input);
        console.log('✅ [generateApp] App generada exitosamente con Hugging Face');
        return result;
      } catch (fallbackError) {
        console.error('❌ [generateApp] Error con Hugging Face fallback:', fallbackError);
        throw new Error(
          `Failed to generate app with Gemini (${errorMessage}). Fallback to Hugging Face also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
        );
      }
    } else {
      throw error;
    }
  }
}

const appPrompt = ai.definePrompt({
  name: 'generateAppPrompt',
  input: { schema: GenerateAppInputSchema },
  output: { schema: GenerateAppOutputSchema },
  prompt: `You are a senior full-stack web engineer specializing in building production-grade web applications.

Your task is to generate a COMPLETE, robust, single-file web application based on the user's prompt. This is NOT a landing page — it is a FUNCTIONAL business application with multiple views, data management, and real interactivity. The output must be a SINGLE HTML file with ALL HTML, CSS, and JavaScript embedded.

User Prompt: {{{prompt}}}
{{#if appType}}App Type: {{{appType}}}{{/if}}

**Architecture Requirements:**

1. **Single-Page Application (SPA):**
   - Hash-based routing (\`#/dashboard\`, \`#/patients\`, \`#/settings\`, etc.)
   - A global state manager object with subscribe/notify pattern
   - Component-based rendering with dedicated render functions per view
   - URL-driven navigation — each view has its own hash route

2. **Professional UI Layout:**
   - Fixed sidebar (collapsible on mobile) with navigation links, icons, and active state highlighting
   - Top header bar with breadcrumbs, user avatar/menu, notifications bell, and dark mode toggle
   - Main content area that renders the active route's view
   - Use a consistent design system: cards, tables, badges, buttons, form inputs
   - Use Lucide icons via \`<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js">\`

3. **Styling:**
   - Tailwind CSS via CDN: \`<script src="https://cdn.tailwindcss.com">\`
   - Professional, clean design — think enterprise SaaS
   - Dark mode support with \`dark:\` variant and toggle
   - Fully responsive (mobile sidebar becomes a drawer/overlay)
   - Use placeholder images from 'https://picsum.photos/seed/{seed}/{width}/{height}'

4. **Core Functionality (ALL must work):**
   - **CRUD Operations**: Create, Read, Update, Delete for the main data entities
   - **Data Tables**: Sortable columns, search/filter, pagination
   - **Forms**: Multi-field forms with validation (required fields, email format, etc.)
   - **Modals/Dialogs**: For create/edit forms and delete confirmations
   - **Toast Notifications**: Success, error, and info messages
   - **Search**: Global search or per-section filtering
   - **Dashboard**: Summary cards with counts/stats, recent activity list
   - **Calendar/Date views**: If relevant to the domain (appointments, schedules)

5. **Data Layer:**
   - localStorage for persistence across page reloads
   - Seed with realistic demo data on first load (10-20 records)
   - Proper data models: unique IDs (Date.now()), timestamps (created_at, updated_at), status fields
   - Relationships between entities where applicable (e.g., patient → appointments)

6. **Production Quality:**
   - Error handling for all operations
   - Loading states during data operations
   - Empty states with helpful messages
   - Confirmation dialogs before destructive actions
   - Keyboard shortcuts where useful (Escape to close modals)
   - Print-friendly views if applicable

**Output Format:**

Return a JSON object with three keys:
1. \`appContent\`: The COMPLETE HTML file string with ALL embedded CSS and JavaScript
2. \`palette\`: Object with \`primary\`, \`background\`, and \`accent\` color strings in HSL format
3. \`appMeta\`: Object with \`name\` (app name), \`description\` (what it does), and \`features\` (array of implemented features)
`,
});

const generateAppFlow = ai.defineFlow(
  {
    name: 'generateAppFlow',
    inputSchema: GenerateAppInputSchema,
    outputSchema: GenerateAppOutputSchema,
  },
  async (input) => {
    const { output } = await appPrompt(input);
    return output!;
  }
);

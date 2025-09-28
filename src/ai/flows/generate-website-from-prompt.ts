'use server';
/**
 * @fileOverview Generates a modern, Tailwind-based website structure and content.
 *
 * - generateWebsite - A function that handles the website generation process.
 * - GenerateWebsiteInput - The input type for the generateWebsite function.
 * - GenerateWebsiteOutput - The return type for the generateWebsite function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWebsiteInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the desired website or modification.'),
});
export type GenerateWebsiteInput = z.infer<typeof GenerateWebsiteInputSchema>;

const GenerateWebsiteOutputSchema = z.object({
  websiteContent: z
    .string()
    .describe('The generated HTML content for the website, styled with Tailwind CSS.'),
  palette: z.object({
    primary: z.string().describe('The primary color for the website theme, in HSL format (e.g., "210 40% 96.1%").'),
    background: z.string().describe('The background color for the website theme, in HSL format.'),
    accent: z.string().describe('The accent color for the website theme, in HSL format.'),
  }).describe('A color palette for the website theme.'),
});
export type GenerateWebsiteOutput = z.infer<typeof GenerateWebsiteOutputSchema>;

export async function generateWebsite(input: GenerateWebsiteInput): Promise<GenerateWebsiteOutput> {
  return generateWebsiteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWebsitePrompt',
  input: {schema: GenerateWebsiteInputSchema},
  output: {schema: GenerateWebsiteOutputSchema},
  prompt: `You are an expert web designer and developer AI.

Your task is to generate a complete, single-page landing page based on a user's prompt. The output must be a single HTML file using Tailwind CSS for styling and include functional JavaScript.

User Prompt: {{{prompt}}}

**Website Requirements:**

1.  **Structure:**
    *   Create a well-structured landing page with semantic HTML5 tags (\`<header>\`, \`<nav>\`, \`<main>\`, \`<section>\`, \`<footer>\`).
    *   It must include a hero section, a features section, and a footer at a minimum. Add other relevant sections (e.g., about, contact, testimonials) if they fit the prompt.
    *   Ensure all sections have unique \`id\` attributes to allow for anchor link navigation (e.g., \`<section id="features">...\`).

2.  **Content:**
    *   Generate relevant and engaging marketing copy for all sections based on the user's prompt.

3.  **Styling (Tailwind CSS):**
    *   You MUST use Tailwind CSS utility classes directly in the HTML for all styling. Do not use \`<style>\` blocks or inline \`style\` attributes.
    *   The design should be modern, visually appealing, and fully responsive. Use flexbox and grid for layouts.
    *   Use placeholder images from 'https://picsum.photos/seed/{seed}/{width}/{height}' where appropriate.

4.  **Color Palette:**
    *   Generate a cohesive color palette (primary, background, accent) in HSL string format (e.g., "210 40% 96.1%").
    *   Apply Tailwind color classes directly in the HTML (e.g., \`bg-blue-500\`). Do not use CSS variables.

5.  **JavaScript (Functionality):**
    *   Include a single \`<script>\` tag at the end of the \`<body>\`.
    *   **Smooth Scrolling:** Implement JavaScript for smooth scrolling when a navigation link (e.g., \`<a href="#features">...\`) is clicked.
    *   **Form Submission Simulation:** If you include a contact form, add a JavaScript event listener to it. On submission, it should prevent the default form submission, get the form data, and log it to the console using \`console.log()\`. For example: \`console.log('Form submitted:', { name: 'John Doe', email: 'john@example.com' });\`. This simulates sending an email or saving data without a real backend.
    *   **Functional Links:** All internal navigation links MUST point to section IDs (e.g., \`href="#contact"\`) and all external links should point to "#" for demonstration purposes.

**Output Format:**

Return a JSON object with two keys:
1.  \`websiteContent\`: A string containing the full HTML and JavaScript of the generated landing page.
2.  \`palette\`: An object with \`primary\`, \`background\`, and \`accent\` color strings in HSL format.
`,
});

const generateWebsiteFlow = ai.defineFlow(
  {
    name: 'generateWebsiteFlow',
    inputSchema: GenerateWebsiteInputSchema,
    outputSchema: GenerateWebsiteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

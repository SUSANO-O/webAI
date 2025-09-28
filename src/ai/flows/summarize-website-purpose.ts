// Summarize the main purpose and key features of the generated website.

'use server';

/**
 * @fileOverview Summarizes the main purpose and key features of a generated website.
 *
 * - summarizeWebsitePurpose - A function that summarizes the website's purpose and key features.
 * - SummarizeWebsitePurposeInput - The input type for the summarizeWebsitePurpose function.
 * - SummarizeWebsitePurposeOutput - The return type for the summarizeWebsitePurpose function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeWebsitePurposeInputSchema = z.object({
  websiteContent: z
    .string()
    .describe('The complete HTML content of the generated website.'),
});
export type SummarizeWebsitePurposeInput = z.infer<
  typeof SummarizeWebsitePurposeInputSchema
>;

const SummarizeWebsitePurposeOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the website, including its primary purpose and key functionalities.'
    ),
});
export type SummarizeWebsitePurposeOutput = z.infer<
  typeof SummarizeWebsitePurposeOutputSchema
>;

export async function summarizeWebsitePurpose(
  input: SummarizeWebsitePurposeInput
): Promise<SummarizeWebsitePurposeOutput> {
  return summarizeWebsitePurposeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeWebsitePurposePrompt',
  input: {schema: SummarizeWebsitePurposeInputSchema},
  output: {schema: SummarizeWebsitePurposeOutputSchema},
  prompt: `You are an AI assistant designed to summarize the purpose and key features of websites.

  Analyze the following website content and provide a summary highlighting its main purpose and key functionalities.

  Website Content: {{{websiteContent}}}
  \nSummary: `,
});

const summarizeWebsitePurposeFlow = ai.defineFlow(
  {
    name: 'summarizeWebsitePurposeFlow',
    inputSchema: SummarizeWebsitePurposeInputSchema,
    outputSchema: SummarizeWebsitePurposeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

'use server';

import { generateWebsite } from '@/ai/flows/generate-website-from-prompt';

export async function generateWebsiteAction(
  prevState: { websiteContent: string; error: string | null },
  formData: FormData
) {
  const prompt = formData.get('prompt') as string;

  if (!prompt) {
    return { websiteContent: prevState.websiteContent, error: 'Prompt is required.' };
  }

  try {
    const result = await generateWebsite({ prompt });
    
    if (result?.websiteContent) {
      // Success case
      return { websiteContent: result.websiteContent, error: null };
    } else {
      // Handle cases where the AI returns a partial or empty response
      return {
        websiteContent: prevState.websiteContent,
        error: 'The AI returned an unexpected response. Please try again.',
      };
    }
  } catch (e: unknown) {
    console.error('Error in generateWebsiteAction:', e);
    // Ensure a consistent error object is always returned
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      websiteContent: prevState.websiteContent,
      error: `Failed to generate website: ${errorMessage}`,
    };
  }
}

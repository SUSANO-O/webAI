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
    
    // Explicitly check for the presence of websiteContent
    if (result?.websiteContent) {
      return { websiteContent: result.websiteContent, error: null };
    } else {
      // This will handle null, undefined, or empty string responses from the AI
      return {
        websiteContent: prevState.websiteContent,
        error: 'The AI returned an empty or invalid response. Please try again.',
      };
    }
  } catch (e: unknown) {
    console.error('Error in generateWebsiteAction:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      websiteContent: prevState.websiteContent,
      error: `Failed to generate website: ${errorMessage}`,
    };
  }
}


'use server';

/**
 * @fileOverview An AI flow to verify the ExchangeRate-API key.
 * 
 * - verifyApiKey: A function that checks if the provided API key is valid.
 * - ApiKeyVerificationInput: The input type for the verifyApiKey function.
 * - ApiKeyVerificationOutput: The return type for the verifyApiKey function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const ApiKeyVerificationInputSchema = z.object({
  apiKey: z.string().describe('The ExchangeRate-API key to verify.'),
});
export type ApiKeyVerificationInput = z.infer<typeof ApiKeyVerificationInputSchema>;

export const ApiKeyVerificationOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the API key is valid.'),
  error: z.string().optional().describe('The error message if the key is invalid.'),
});
export type ApiKeyVerificationOutput = z.infer<typeof ApiKeyVerificationOutputSchema>;


async function checkApiKey(apiKey: string): Promise<ApiKeyVerificationOutput> {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.result === 'success') {
            return { isValid: true };
        } else {
             return { isValid: false, error: data['error-type'] || 'Invalid API Key' };
        }
    } catch (error: any) {
        console.error('API key verification failed:', error);
        return { isValid: false, error: 'Failed to connect to validation service.' };
    }
}


export const verifyApiKey = ai.defineFlow(
  {
    name: 'verifyApiKey',
    inputSchema: ApiKeyVerificationInputSchema,
    outputSchema: ApiKeyVerificationOutputSchema,
  },
  async ({ apiKey }) => {
    return await checkApiKey(apiKey);
  }
);

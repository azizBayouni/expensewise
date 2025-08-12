
'use server';

/**
 * @fileOverview An AI flow to verify the ExchangeRate-API key.
 * 
 * This file contains the server-side logic for verifying the API key.
 * It should only export the `verifyApiKey` async function.
 */

import { ai } from '@/ai/genkit';
import { ApiKeyVerificationInputSchema, ApiKeyVerificationOutputSchema, type ApiKeyVerificationOutput, type ApiKeyVerificationInput } from './verify-api-key-types';


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


const verifyApiKeyFlow = ai.defineFlow(
  {
    name: 'verifyApiKeyFlow',
    inputSchema: ApiKeyVerificationInputSchema,
    outputSchema: ApiKeyVerificationOutputSchema,
  },
  async ({ apiKey }) => {
    return await checkApiKey(apiKey);
  }
);

export async function verifyApiKey(input: ApiKeyVerificationInput): Promise<ApiKeyVerificationOutput> {
    return await verifyApiKeyFlow(input);
}

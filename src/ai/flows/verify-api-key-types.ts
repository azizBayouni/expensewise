
/**
 * @fileOverview Type definitions for the API key verification flow.
 * 
 * This file contains the Zod schemas and TypeScript types for the
 * API key verification flow. It does not contain any server-side logic.
 */

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

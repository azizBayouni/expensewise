
'use client';

const EXCHANGERATE_API_KEY_STORAGE_KEY = 'expensewise-exchangerate-api-key';

export function getExchangeRateApiKey(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(EXCHANGERATE_API_KEY_STORAGE_KEY);
  }
  return null;
}

export function setExchangeRateApiKey(apiKey: string): void {
  if (typeof window !== 'undefined') {
    if (apiKey) {
      localStorage.setItem(EXCHANGERATE_API_KEY_STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(EXCHANGERATE_API_KEY_STORAGE_KEY);
    }
  }
}

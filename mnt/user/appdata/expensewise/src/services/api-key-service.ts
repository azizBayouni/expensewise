'use server';

import { getDb } from './db';

export async function getExchangeRateApiKey(userId: string): Promise<string | null> {
  if (!userId) return null;
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT exchangeRateApiKey FROM settings WHERE userId = ?');
    const result = stmt.get(userId) as { exchangeRateApiKey: string } | undefined;
    return result?.exchangeRateApiKey || null;
  } catch (error) {
    console.error("Error fetching API key:", error);
    return null;
  }
}

export function setExchangeRateApiKey(userId: string, apiKey: string): void {
  if (!userId) return;
  const db = getDb();
  try {
    const stmt = db.prepare(`
        INSERT INTO settings (userId, exchangeRateApiKey) 
        VALUES (?, ?)
        ON CONFLICT(userId) 
        DO UPDATE SET exchangeRateApiKey = excluded.exchangeRateApiKey;
    `);
    stmt.run(userId, apiKey);
  } catch (error) {
    console.error("Error setting API key:", error);
  }
}

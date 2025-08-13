'use server';

import { getDb } from './db';

export async function getExchangeRateApiKey(userId: string): Promise<string | null> {
  if (!userId) return null;
  const db = await getDb();
  try {
    const stmt = db.prepare('SELECT exchangeRateApiKey FROM settings WHERE userId = ?');
    const result = stmt.get(userId) as { exchangeRateApiKey: string } | undefined;
    return result?.exchangeRateApiKey || null;
  } catch (error) {
    console.error("Error fetching API key:", error);
    return null;
  }
}

export async function setExchangeRateApiKey(userId: string, apiKey: string): Promise<void> {
  if (!userId) return;
  const db = await getDb();
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

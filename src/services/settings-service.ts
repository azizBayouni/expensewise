
'use server';

import db from './db';

export async function getDefaultCurrency(userId: string): Promise<string> {
  // In a real app, you might fetch this from the DB based on user settings.
  // For this mock setup, we'll just return SAR.
  return 'SAR';
}

export async function setDefaultCurrency(userId: string, currency: string): Promise<void> {
  const stmt = db.prepare(`
        INSERT INTO settings (userId, defaultCurrency) 
        VALUES (?, ?)
        ON CONFLICT(userId) 
        DO UPDATE SET defaultCurrency = excluded.defaultCurrency;
    `);
    stmt.run(userId, currency);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
    }
}

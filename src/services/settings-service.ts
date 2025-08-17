
'use server';

import { getDb } from './db';

export function getDefaultCurrency(userId: string): string {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT defaultCurrency FROM settings WHERE userId = ?');
    const result = stmt.get(userId) as { defaultCurrency: string } | undefined;
    return result?.defaultCurrency || 'USD';
  } catch (error) {
    console.error("Error fetching default currency:", error);
    return 'USD'; // Fallback
  }
}

export function setDefaultCurrency(userId: string, currency: string): void {
  const db = getDb();
  try {
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
  } catch (error) {
    console.error("Error setting default currency:", error);
  }
}

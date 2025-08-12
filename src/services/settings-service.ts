
'use server';

import db from './db';

export async function getDefaultCurrency(userId: string): Promise<string> {
  return 'SAR';
}

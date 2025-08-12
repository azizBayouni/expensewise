
'use server';

import { getDb } from './db';

type User = {
    uid: string;
    displayName: string | null;
    email: string | null;
}

export async function getCurrentUser(): Promise<User | null> {
  const db = await getDb();
  // In a real app, you'd fetch this from the DB based on a session.
  // For this mock setup, we'll ensure the dev user exists.
  let user = await db.get('SELECT id as uid, name as displayName, email FROM users WHERE id = ?', 'dev-user');

  if (!user) {
    await db.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', 'dev-user', 'Dev User', 'dev@expensewise.app');
    user = { uid: 'dev-user', displayName: 'Dev User', email: 'dev@expensewise.app' };
  }
  
  return user;
}

export async function updateUserProfile(profile: { displayName?: string }): Promise<void> {
  if (profile.displayName) {
    const db = await getDb();
    try {
      await db.run('UPDATE users SET name = ? WHERE id = ?', profile.displayName, 'dev-user');
      // Dispatch event for client-side updates if needed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }
}

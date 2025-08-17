
'use server';

import { getDb } from './db';

type User = {
    uid: string;
    displayName: string | null;
    email: string | null;
}

export function getCurrentUser(): User | null {
  const db = getDb();
  // In a real app, you'd fetch this from the DB based on a session.
  // For this mock setup, we'll ensure the dev user exists.
  const stmt = db.prepare('SELECT id as uid, name as displayName, email FROM users WHERE id = ?');
  let user = stmt.get('dev-user') as User | undefined;

  if (!user) {
    const insertStmt = db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)');
    insertStmt.run('dev-user', 'Dev User', 'dev@expensewise.app');
    user = { uid: 'dev-user', displayName: 'Dev User', email: 'dev@expensewise.app' };
  }
  
  return user;
}


export function updateUserProfile(profile: { displayName?: string }): void {
  if (profile.displayName) {
    const db = getDb();
    try {
      const stmt = db.prepare('UPDATE users SET name = ? WHERE id = ?');
      stmt.run(profile.displayName, 'dev-user');
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

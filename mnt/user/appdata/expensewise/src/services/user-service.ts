
'use server';

import db from '@/lib/db';

type User = {
    uid: string;
    displayName: string | null;
    email: string | null;
}

export async function getCurrentUser(): Promise<User | null> {
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


export async function updateUserProfile(profile: { displayName?: string }): Promise<void> {
  if (profile.displayName) {
    try {
      const stmt = db.prepare('UPDATE users SET name = ? WHERE id = ?');
      stmt.run(profile.displayName, 'dev-user');
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }
}

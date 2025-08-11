
'use server';

import db from '@/lib/db';

type User = {
    uid: string;
    displayName: string | null;
    email: string | null;
}

export function getCurrentUser(): User | null {
  // This is now a mock user since we are not using Firebase Auth.
  return {
    uid: 'dev-user',
    displayName: 'Dev User',
    email: 'dev@expensewise.app'
  };
}

export async function updateUserProfile(profile: { displayName?: string }): Promise<void> {
  const user = getCurrentUser();
  if (user && profile.displayName) {
    try {
      const stmt = db.prepare('UPDATE users SET name = ? WHERE id = ?');
      stmt.run(profile.displayName, user.uid);
      
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  } else {
    throw new Error("No user is currently signed in.");
  }
}

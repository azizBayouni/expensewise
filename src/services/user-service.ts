
import { auth } from '@/lib/firebase';
import { updateProfile, type User } from 'firebase/auth';

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export async function updateUserProfile(profile: { displayName?: string, photoURL?: string }): Promise<void> {
  const user = getCurrentUser();
  if (user) {
    try {
      await updateProfile(user, profile);
      // Dispatch an event to notify other components of the profile change
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  } else {
    throw new Error("No user is currently signed in.");
  }
}


import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const settingsDoc = (userId: string) => doc(firestore, 'users', userId, 'settings', 'main');

export async function getDefaultCurrency(userId: string): Promise<string> {
  try {
    const docSnap = await getDoc(settingsDoc(userId));
    if (docSnap.exists() && docSnap.data().defaultCurrency) {
      return docSnap.data().defaultCurrency;
    }
  } catch (error) {
    console.error("Error fetching default currency:", error);
  }
  return 'USD'; // Fallback
}

export async function setDefaultCurrency(userId: string, currency: string): Promise<void> {
  try {
    await setDoc(settingsDoc(userId), { defaultCurrency: currency }, { merge: true });
  } catch (error) {
    console.error("Error setting default currency:", error);
  }
}

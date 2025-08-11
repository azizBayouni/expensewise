
'use client';

import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const settingsDoc = (userId: string) => doc(firestore, 'users', userId, 'settings', 'main');

export async function getExchangeRateApiKey(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const docSnap = await getDoc(settingsDoc(userId));
    if (docSnap.exists() && docSnap.data().exchangeRateApiKey) {
        return docSnap.data().exchangeRateApiKey;
    }
  } catch (error) {
    console.error("Error fetching API key:", error);
  }
  return null;
}

export async function setExchangeRateApiKey(userId: string, apiKey: string): Promise<void> {
  if (!userId) return;
  try {
    await setDoc(settingsDoc(userId), { exchangeRateApiKey: apiKey }, { merge: true });
  } catch (error) {
    console.error("Error setting API key:", error);
  }
}


'use client';

import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const settingsDoc = (userId: string) => doc(firestore, 'users', userId, 'settings', 'main');

export async function getExchangeRateApiKey(userId: string): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const docSnap = await getDoc(settingsDoc(userId));
    if (docSnap.exists() && docSnap.data().exchangeRateApiKey) {
        return docSnap.data().exchangeRateApiKey;
    }
  }
  return null;
}

export async function setExchangeRateApiKey(userId: string, apiKey: string): Promise<void> {
  if (typeof window !== 'undefined') {
    if (apiKey) {
      await setDoc(settingsDoc(userId), { exchangeRateApiKey: apiKey }, { merge: true });
    } else {
      await setDoc(settingsDoc(userId), { exchangeRateApiKey: null }, { merge: true });
    }
  }
}

    
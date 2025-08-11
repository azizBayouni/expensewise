
import { firestore } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  getDoc,
  setDoc
} from 'firebase/firestore';
import type { Wallet } from '@/lib/data';
import { getAllTransactions, convertAmount } from './transaction-service';

const walletsCollection = (userId: string) => collection(firestore, 'users', userId, 'wallets');
const settingsDoc = (userId: string) => doc(firestore, 'users', userId, 'settings', 'main');


export async function addWallet(userId: string, newWalletData: Omit<Wallet, 'id' | 'balance' | 'userId'>): Promise<void> {
    await addDoc(walletsCollection(userId), { ...newWalletData, userId, balance: 0 });
    window.dispatchEvent(new Event('walletsUpdated'));
}

export async function getAllWallets(userId: string): Promise<Wallet[]> {
    const q = query(walletsCollection(userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet));
}

export async function updateWallet(userId: string, updatedWallet: Wallet): Promise<void> {
  const { id, ...walletData } = updatedWallet;
  const docRef = doc(firestore, 'users', userId, 'wallets', id);
  await updateDoc(docRef, walletData);
  window.dispatchEvent(new Event('walletsUpdated'));
}

export async function deleteWallet(userId: string, walletId: string): Promise<void> {
    const docRef = doc(firestore, 'users', userId, 'wallets', walletId);
    await deleteDoc(docRef);

    if (await getDefaultWallet(userId) === walletId) {
        await clearDefaultWallet(userId);
    }
    window.dispatchEvent(new Event('walletsUpdated'));
}

export async function setDefaultWallet(userId: string, walletId: string): Promise<void> {
    const settingsRef = doc(settingsDoc(userId));
    await setDoc(settingsRef, { defaultWalletId: walletId }, { merge: true });
    window.dispatchEvent(new Event('defaultWalletChanged'));
}

export async function getDefaultWallet(userId: string): Promise<string | null> {
    const docSnap = await getDoc(settingsDoc(userId));
    if (docSnap.exists() && docSnap.data().defaultWalletId) {
        return docSnap.data().defaultWalletId;
    }
    return null;
}

export async function clearDefaultWallet(userId: string): Promise<void> {
    const settingsRef = doc(settingsDoc(userId));
    await setDoc(settingsRef, { defaultWalletId: null }, { merge: true });
    window.dispatchEvent(new Event('defaultWalletChanged'));
}

export async function convertAllWallets(userId: string, fromCurrency: string, toCurrency: string): Promise<void> {
    const allWallets = await getAllWallets(userId);
    const batch = writeBatch(firestore);

    for (const wallet of allWallets) {
        if (wallet.currency === fromCurrency) {
            const docRef = doc(firestore, 'users', userId, 'wallets', wallet.id);
            const convertedBalance = await convertAmount(userId, wallet.balance, fromCurrency, toCurrency);
            batch.update(docRef, {
                balance: convertedBalance,
                currency: toCurrency,
            });
        }
    }
    await batch.commit();
}

    
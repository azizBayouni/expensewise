
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
  writeBatch
} from 'firebase/firestore';
import type { Wallet } from '@/lib/data';
import { getAllTransactions } from './transaction-service';

const walletsCollection = (userId: string) => collection(firestore, 'users', userId, 'wallets');
const settingsCollection = (userId: string) => collection(firestore, 'users', userId, 'settings');

export async function addWallet(userId: string, newWalletData: Omit<Wallet, 'id' | 'userId'>): Promise<void> {
    await addDoc(walletsCollection(userId), { ...newWalletData, userId });
    window.dispatchEvent(new Event('walletsUpdated'));
}

export async function getAllWallets(userId: string): Promise<Wallet[]> {
    const q = query(walletsCollection(userId));
    const querySnapshot = await getDocs(q);
    const allTransactions = await getAllTransactions(userId);

    const walletDocs = querySnapshot.docs.map(doc => {
        const walletData = { id: doc.id, ...doc.data() } as Wallet;
        // The balance from firestore is the *initial* balance.
        // We still need to calculate the current balance based on transactions.
        const allTransactionsForWallet = allTransactions.filter(t => t.wallet === walletData.name);
        const transactionNet = allTransactionsForWallet.reduce((acc, t) => {
            if (t.type === 'income') return acc + t.amount;
            return acc - t.amount;
        }, 0);
        walletData.balance += transactionNet;
        return walletData;
    });

    return walletDocs;
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
    const settingsRef = doc(settingsCollection(userId), 'wallet');
    await updateDoc(settingsRef, { defaultWalletId: walletId });
    window.dispatchEvent(new Event('defaultWalletChanged'));
}

export async function getDefaultWallet(userId: string): Promise<string | null> {
    const settingsRef = doc(settingsCollection(userId), 'wallet');
    const docSnap = await getDocs(query(collection(firestore, settingsRef.path)));
    if (!docSnap.empty) {
        return docSnap.docs[0].data().defaultWalletId || null;
    }
    return null;
}

export async function clearDefaultWallet(userId: string): Promise<void> {
    const settingsRef = doc(settingsCollection(userId), 'wallet');
    await updateDoc(settingsRef, { defaultWalletId: null });
    window.dispatchEvent(new Event('defaultWalletChanged'));
}

export async function convertAllWallets(userId: string, fromCurrency: string, toCurrency: string): Promise<void> {
    const exchangeRate = 1; // You should fetch this rate
    const allWallets = await getAllWallets(userId);
    const batch = writeBatch(firestore);

    for (const wallet of allWallets) {
        if (wallet.currency === fromCurrency) {
            const docRef = doc(firestore, 'users', userId, 'wallets', wallet.id);
            batch.update(docRef, {
                balance: wallet.balance * exchangeRate, // This updates the *initial* balance
                currency: toCurrency,
            });
        }
    }
    await batch.commit();
}



'use server';

import { getDb } from './db';
import type { Wallet } from '../lib/data';
import { randomUUID } from 'crypto';

export async function addWallet(userId: string, newWalletData: Omit<Wallet, 'id' | 'userId' | 'linkedCategoryIds' | 'isDeletable'>): Promise<void> {
    const newWallet = { 
        ...newWalletData, 
        id: randomUUID(), 
        userId, 
        linkedCategoryIds: [],
        isDeletable: 1, // All user-created wallets are deletable
    };
    const db = await getDb();
    const stmt = db.prepare('INSERT INTO wallets (id, userId, name, initialBalance, icon, linkedCategoryIds, isDeletable) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(newWallet.id, newWallet.userId, newWallet.name, newWallet.initialBalance, newWallet.icon, JSON.stringify(newWallet.linkedCategoryIds), newWallet.isDeletable);
}

export async function getAllWallets(userId: string): Promise<Wallet[]> {
    const db = await getDb();
    const stmt = db.prepare('SELECT id, name, initialBalance, icon, linkedCategoryIds, isDeletable, userId FROM wallets WHERE userId = ? ORDER BY isDeletable DESC, name ASC');
    const results = stmt.all(userId) as any[];
    return results.map(row => ({
        ...row,
        linkedCategoryIds: JSON.parse(row.linkedCategoryIds || '[]'),
        isDeletable: row.isDeletable !== 0,
    }));
}

export async function updateWallet(userId: string, updatedWallet: Wallet): Promise<void> {
  const { id, ...walletData } = updatedWallet;
  const db = await getDb();
  const stmt = db.prepare('UPDATE wallets SET name = ?, initialBalance = ?, icon = ?, linkedCategoryIds = ? WHERE id = ? AND userId = ?');
  stmt.run(walletData.name, walletData.initialBalance, walletData.icon, JSON.stringify(walletData.linkedCategoryIds || []), id, userId);
}

export async function deleteWallet(userId: string, walletId: string): Promise<void> {
    const db = await getDb();
    
    const walletStmt = db.prepare('SELECT name, isDeletable from wallets WHERE id = ? AND userId = ?');
    const wallet = walletStmt.get(walletId, userId) as { name: string, isDeletable: number } | undefined;

    if (!wallet) {
      throw new Error("Wallet not found.");
    }
    
    if (wallet.isDeletable === 0) {
      throw new Error("The main wallet cannot be deleted.");
    }
    
    const checkStmt = db.prepare('SELECT 1 FROM transactions WHERE wallet = ? AND userId = ? LIMIT 1');
    const hasTransactions = checkStmt.get(wallet.name, userId);

    if (hasTransactions) {
        throw new Error("Cannot delete a wallet that has associated transactions. Please re-assign or delete them first.");
    }

    const stmt = db.prepare('DELETE FROM wallets WHERE id = ? AND userId = ?');
    stmt.run(walletId, userId);
    
    const defaultWallet = await getDefaultWallet(userId);
    if (defaultWallet === walletId) {
        await clearDefaultWallet(userId);
    }
}

export async function setDefaultWallet(userId: string, walletId: string): Promise<void> {
    const db = await getDb();
    const stmt = db.prepare('INSERT INTO settings (userId, defaultWalletId) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET defaultWalletId = excluded.defaultWalletId');
    stmt.run(userId, walletId);
}

export async function getDefaultWallet(userId: string): Promise<string | null> {
    const db = await getDb();
    const stmt = db.prepare('SELECT defaultWalletId FROM settings WHERE userId = ?');
    const result = stmt.get(userId) as { defaultWalletId: string } | undefined;
    return result?.defaultWalletId || null;
}

export async function clearDefaultWallet(userId: string): Promise<void> {
    const db = await getDb();
    const stmt = db.prepare('UPDATE settings SET defaultWalletId = NULL WHERE userId = ?');
    stmt.run(userId);
}

export async function convertAllWallets(userId: string, fromCurrency: string, toCurrency: string): Promise<void> {
    // This function is now a no-op since wallets no longer have an independent currency.
    // It's kept for potential future use or to avoid breaking calls if not all are updated at once.
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

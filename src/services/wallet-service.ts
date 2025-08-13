
'use server';

import { getDb } from './db';
import type { Wallet } from '../lib/data';
import { convertAmount } from './transaction-service';
import { randomUUID } from 'crypto';

export async function addWallet(userId: string, newWalletData: Omit<Wallet, 'id' | 'userId' | 'linkedCategoryIds'>): Promise<void> {
    const newWallet = { 
        ...newWalletData, 
        id: randomUUID(), 
        userId, 
        linkedCategoryIds: []
    };
    const db = await getDb();
    const stmt = db.prepare('INSERT INTO wallets (id, userId, name, currency, initialBalance, icon, linkedCategoryIds) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(newWallet.id, newWallet.userId, newWallet.name, newWallet.currency, newWallet.initialBalance, newWallet.icon, JSON.stringify(newWallet.linkedCategoryIds));
}

export async function getAllWallets(userId: string): Promise<Wallet[]> {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM wallets WHERE userId = ?');
    const results = stmt.all(userId) as any[];
    return results.map(row => ({
        ...row,
        linkedCategoryIds: JSON.parse(row.linkedCategoryIds || '[]')
    }));
}

export async function updateWallet(userId: string, updatedWallet: Wallet): Promise<void> {
  const { id, ...walletData } = updatedWallet;
  const db = await getDb();
  const stmt = db.prepare('UPDATE wallets SET name = ?, currency = ?, initialBalance = ?, icon = ?, linkedCategoryIds = ? WHERE id = ? AND userId = ?');
  stmt.run(walletData.name, walletData.currency, walletData.initialBalance, walletData.icon, JSON.stringify(walletData.linkedCategoryIds || []), id, userId);
}

export async function deleteWallet(userId: string, walletId: string): Promise<void> {
    const db = await getDb();
    
    const walletStmt = db.prepare('SELECT name from wallets WHERE id = ? AND userId = ?');
    const wallet = walletStmt.get(walletId, userId) as Wallet | undefined;

    if (!wallet) {
      throw new Error("Wallet not found.");
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
    const db = await getDb();
    const allWallets = await getAllWallets(userId);
    
    const walletsToConvert = allWallets.filter(w => w.currency === fromCurrency);

    const conversionPromises = walletsToConvert.map(async (wallet) => {
        const convertedBalance = await convertAmount(userId, wallet.initialBalance, fromCurrency, toCurrency);
        return { ...wallet, initialBalance: convertedBalance, currency: toCurrency };
    });

    const convertedWallets = await Promise.all(conversionPromises);

    const updateStmt = db.prepare('UPDATE wallets SET initialBalance = ?, currency = ? WHERE id = ?');
    const updateTransaction = db.transaction((wallets) => {
        for (const wallet of wallets) updateStmt.run(wallet.initialBalance, wallet.currency, wallet.id);
    });
    updateTransaction(convertedWallets);
}

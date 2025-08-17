'use server';

import { getDb } from './db';
import type { Wallet } from '../lib/data';
import { randomUUID } from 'crypto';
import { convertAmount } from './transaction-service';

export function addWallet(userId: string, newWalletData: { name: string, icon?: string, initialBalance: number, currency: string }): void {
    const newWallet = { 
        id: randomUUID(),
        userId: userId,
        name: newWalletData.name,
        initialBalance: newWalletData.initialBalance,
        icon: newWalletData.icon,
        linkedCategoryIds: [],
        isDeletable: true,
        currency: newWalletData.currency
    };

    const db = getDb();
    const stmt = db.prepare('INSERT INTO wallets (id, userId, name, initialBalance, icon, linkedCategoryIds, isDeletable, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(newWallet.id, newWallet.userId, newWallet.name, newWallet.initialBalance, newWallet.icon, JSON.stringify(newWallet.linkedCategoryIds), newWallet.isDeletable ? 1 : 0, newWallet.currency);
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

export function getAllWallets(userId: string): Wallet[] {
    const db = getDb();
    const stmt = db.prepare('SELECT id, name, initialBalance, icon, linkedCategoryIds, isDeletable, userId, currency FROM wallets WHERE userId = ? ORDER BY isDeletable DESC, name ASC');
    const results = stmt.all(userId) as any[];
    return results.map(row => ({
        ...row,
        linkedCategoryIds: JSON.parse(row.linkedCategoryIds || '[]'),
        isDeletable: row.isDeletable !== 0,
    }));
}

export function updateWallet(userId: string, updatedWallet: Wallet): void {
  const { id, ...walletData } = updatedWallet;
  const db = getDb();
  const stmt = db.prepare('UPDATE wallets SET name = ?, initialBalance = ?, icon = ?, linkedCategoryIds = ?, currency = ? WHERE id = ? AND userId = ?');
  stmt.run(walletData.name, walletData.initialBalance, walletData.icon, JSON.stringify(walletData.linkedCategoryIds || []), walletData.currency, id, userId);

  if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

export function deleteWallet(userId: string, walletId: string): void {
    const db = getDb();
    
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
    
    const defaultWallet = getDefaultWallet(userId);
    if (defaultWallet === walletId) {
        clearDefaultWallet(userId);
    }
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

export function setDefaultWallet(userId: string, walletId: string): void {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO settings (userId, defaultWalletId) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET defaultWalletId = excluded.defaultWalletId');
    stmt.run(userId, walletId);
}

export function getDefaultWallet(userId: string): string | null {
    const db = getDb();
    const stmt = db.prepare('SELECT defaultWalletId FROM settings WHERE userId = ?');
    const result = stmt.get(userId) as { defaultWalletId: string } | undefined;
    return result?.defaultWalletId || null;
}

export function clearDefaultWallet(userId: string): void {
    const db = getDb();
    const stmt = db.prepare('UPDATE settings SET defaultWalletId = NULL WHERE userId = ?');
    stmt.run(userId);
}

export async function convertAllWallets(userId: string, fromCurrency: string, toCurrency: string): Promise<void> {
    const db = getDb();
    const allWallets = getAllWallets(userId);
    
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
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

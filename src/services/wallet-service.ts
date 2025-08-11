
'use server';

import db from './db';
import type { Wallet } from '../lib/data';
import { convertAmount } from './transaction-service';
import { randomUUID } from 'crypto';

export async function addWallet(userId: string, newWalletData: Omit<Wallet, 'id' | 'balance' | 'userId'>): Promise<void> {
    const newWallet = { ...newWalletData, id: randomUUID(), userId, balance: 0, linkedCategoryIds: JSON.stringify(newWalletData.linkedCategoryIds || []) };
    const stmt = db.prepare('INSERT INTO wallets (id, userId, name, currency, balance, icon, linkedCategoryIds) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(newWallet.id, newWallet.userId, newWallet.name, newWallet.currency, newWallet.balance, newWallet.icon, newWallet.linkedCategoryIds);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

export async function getAllWallets(userId: string): Promise<Wallet[]> {
    const stmt = db.prepare('SELECT * FROM wallets WHERE userId = ?');
    const results = stmt.all(userId) as any[];
    return results.map(row => ({
        ...row,
        linkedCategoryIds: JSON.parse(row.linkedCategoryIds || '[]')
    }));
}

export async function updateWallet(userId: string, updatedWallet: Wallet): Promise<void> {
  const { id, ...walletData } = updatedWallet;
  const stmt = db.prepare('UPDATE wallets SET name = ?, currency = ?, balance = ?, icon = ?, linkedCategoryIds = ? WHERE id = ? AND userId = ?');
  stmt.run(walletData.name, walletData.currency, walletData.balance, walletData.icon, JSON.stringify(walletData.linkedCategoryIds || []), id, userId);
  if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

export async function deleteWallet(userId: string, walletId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM wallets WHERE id = ? AND userId = ?');
    stmt.run(walletId, userId);
    
    const defaultWallet = await getDefaultWallet(userId);
    if (defaultWallet === walletId) {
        await clearDefaultWallet(userId);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

export async function setDefaultWallet(userId: string, walletId: string): Promise<void> {
    const stmt = db.prepare('INSERT INTO settings (userId, defaultWalletId) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET defaultWalletId = excluded.defaultWalletId');
    stmt.run(userId, walletId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('defaultWalletChanged'));
    }
}

export async function getDefaultWallet(userId: string): Promise<string | null> {
    const stmt = db.prepare('SELECT defaultWalletId FROM settings WHERE userId = ?');
    const result = stmt.get(userId) as { defaultWalletId: string } | undefined;
    return result?.defaultWalletId || null;
}

export async function clearDefaultWallet(userId: string): Promise<void> {
    const stmt = db.prepare('UPDATE settings SET defaultWalletId = NULL WHERE userId = ?');
    stmt.run(userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('defaultWalletChanged'));
    }
}

export async function convertAllWallets(userId: string, fromCurrency: string, toCurrency: string): Promise<void> {
    const allWallets = await getAllWallets(userId);
    const updateStmt = db.prepare('UPDATE wallets SET balance = ?, currency = ? WHERE id = ?');
    
    const updateTransaction = db.transaction((wallets) => {
      for (const wallet of wallets) {
        if (wallet.currency === fromCurrency) {
            convertAmount(userId, wallet.balance, fromCurrency, toCurrency).then(convertedBalance => {
                updateStmt.run(convertedBalance, toCurrency, wallet.id);
            })
        }
      }
    });

    updateTransaction(allWallets);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

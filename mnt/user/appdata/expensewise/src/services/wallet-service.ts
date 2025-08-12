
'use server';

import { getDb } from './db';
import type { Wallet } from '../lib/data';
import { convertAmount } from './transaction-service';
import { randomUUID } from 'crypto';

export async function addWallet(userId: string, newWalletData: Omit<Wallet, 'id' | 'balance' | 'userId'>): Promise<void> {
    const newWallet = { 
        ...newWalletData, 
        id: randomUUID(), 
        userId, 
        balance: 0, 
        linkedCategoryIds: JSON.stringify(newWalletData.linkedCategoryIds || []) 
    };
    const db = await getDb();
    await db.run('INSERT INTO wallets (id, userId, name, currency, balance, icon, linkedCategoryIds) VALUES (?, ?, ?, ?, ?, ?, ?)', newWallet.id, newWallet.userId, newWallet.name, newWallet.currency, newWallet.balance, newWallet.icon, newWallet.linkedCategoryIds);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

export async function getAllWallets(userId: string): Promise<Wallet[]> {
    const db = await getDb();
    const results = await db.all('SELECT * FROM wallets WHERE userId = ?', userId);
    return results.map(row => ({
        ...row,
        linkedCategoryIds: JSON.parse(row.linkedCategoryIds || '[]')
    }));
}

export async function updateWallet(userId: string, updatedWallet: Wallet): Promise<void> {
  const { id, ...walletData } = updatedWallet;
  const db = await getDb();
  await db.run('UPDATE wallets SET name = ?, currency = ?, balance = ?, icon = ?, linkedCategoryIds = ? WHERE id = ? AND userId = ?', walletData.name, walletData.currency, walletData.balance, walletData.icon, JSON.stringify(walletData.linkedCategoryIds || []), id, userId);
  if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

export async function deleteWallet(userId: string, walletId: string): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM wallets WHERE id = ? AND userId = ?', walletId, userId);
    
    const defaultWallet = await getDefaultWallet(userId);
    if (defaultWallet === walletId) {
        await clearDefaultWallet(userId);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

export async function setDefaultWallet(userId: string, walletId: string): Promise<void> {
    const db = await getDb();
    await db.run('INSERT INTO settings (userId, defaultWalletId) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET defaultWalletId = excluded.defaultWalletId', userId, walletId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
    }
}

export async function getDefaultWallet(userId: string): Promise<string | null> {
    const db = await getDb();
    const result = await db.get('SELECT defaultWalletId FROM settings WHERE userId = ?', userId);
    return result?.defaultWalletId || null;
}

export async function clearDefaultWallet(userId: string): Promise<void> {
    const db = await getDb();
    await db.run('UPDATE settings SET defaultWalletId = NULL WHERE userId = ?', userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
    }
}

export async function convertAllWallets(userId: string, fromCurrency: string, toCurrency: string): Promise<void> {
    const allWallets = await getAllWallets(userId);
    const db = await getDb();
    
    await db.run('BEGIN TRANSACTION');
    try {
        for (const wallet of allWallets) {
            if (wallet.currency === fromCurrency) {
                const convertedBalance = await convertAmount(userId, wallet.balance, fromCurrency, toCurrency);
                await db.run('UPDATE wallets SET balance = ?, currency = ? WHERE id = ?', convertedBalance, toCurrency, wallet.id);
            }
        }
        await db.run('COMMIT');
    } catch (e) {
        await db.run('ROLLBACK');
        throw e;
    }
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('walletsUpdated'));
    }
}

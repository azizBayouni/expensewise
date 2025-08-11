
'use server';

import db from './db';
import { getExchangeRateApiKey } from './api-key-service';
import type { Transaction as AppTransaction } from '../lib/data';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const attachmentsDir = path.join(process.cwd(), 'public', 'attachments');
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

async function uploadAttachment(userId: string, transactionId: string, file: File): Promise<{name: string, url: string}> {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${transactionId}-${file.name}`;
    const filePath = path.join(attachmentsDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);
    const url = `/attachments/${fileName}`;
    return { name: file.name, url };
}

export async function addTransaction(userId: string, newTransaction: Omit<AppTransaction, 'id'>, newAttachments: File[]): Promise<void> {
    const transactionId = randomUUID();
    let attachmentUrls: {name: string, url: string}[] = [];

    if (newAttachments && newAttachments.length > 0) {
        attachmentUrls = await Promise.all(
            newAttachments.map(file => uploadAttachment(userId, transactionId, file))
        );
    }
    
    const { attachments, ...transactionData } = newTransaction;

    const stmt = db.prepare(`
        INSERT INTO transactions (id, userId, date, amount, type, category, wallet, description, currency, attachments, eventId, excludeFromReport)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(transactionId, userId, transactionData.date, transactionData.amount, transactionData.type, transactionData.category, transactionData.wallet, transactionData.description, transactionData.currency, JSON.stringify(attachmentUrls), transactionData.eventId, transactionData.excludeFromReport ? 1 : 0);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transactionsUpdated'));
    }
}

export async function addTransactions(userId: string, newTransactions: Omit<AppTransaction, 'id' | 'userId' | 'attachments'>[]): Promise<void> {
    const stmt = db.prepare(`
        INSERT INTO transactions (id, userId, date, amount, type, category, wallet, description, currency, eventId, excludeFromReport)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((transactions) => {
        for (const t of transactions) {
            stmt.run(randomUUID(), userId, t.date, t.amount, t.type, t.category, t.wallet, t.description, t.currency, t.eventId, t.excludeFromReport ? 1 : 0);
        }
    });
    insertMany(newTransactions);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transactionsUpdated'));
    }
}

export async function getAllTransactions(userId: string): Promise<AppTransaction[]> {
    const stmt = db.prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC');
    const results = stmt.all(userId) as any[];
    return results.map(row => ({
        ...row,
        attachments: JSON.parse(row.attachments || '[]'),
        excludeFromReport: Boolean(row.excludeFromReport)
    }));
}

export async function getTransactionsForWallet(userId: string, walletName: string): Promise<AppTransaction[]> {
    const stmt = db.prepare('SELECT * FROM transactions WHERE userId = ? AND wallet = ? ORDER BY date DESC');
    const results = stmt.all(userId, walletName) as any[];
     return results.map(row => ({
        ...row,
        attachments: JSON.parse(row.attachments || '[]'),
        excludeFromReport: Boolean(row.excludeFromReport)
    }));
}

export async function updateTransaction(userId: string, updatedTransaction: AppTransaction, newAttachments: File[]): Promise<void> {
    const { id, attachments, ...transactionData } = updatedTransaction;
    
    let finalAttachments = attachments || [];

    if (newAttachments && newAttachments.length > 0) {
        const newAttachmentUrls = await Promise.all(
            newAttachments.map(file => uploadAttachment(userId, id, file))
        );
        finalAttachments = [...finalAttachments, ...newAttachmentUrls];
    }
    
    const stmt = db.prepare(`
        UPDATE transactions 
        SET date = ?, amount = ?, type = ?, category = ?, wallet = ?, description = ?, currency = ?, attachments = ?, eventId = ?, excludeFromReport = ?
        WHERE id = ? AND userId = ?
    `);
    stmt.run(transactionData.date, transactionData.amount, transactionData.type, transactionData.category, transactionData.wallet, transactionData.description, transactionData.currency, JSON.stringify(finalAttachments), transactionData.eventId, transactionData.excludeFromReport ? 1 : 0, id, userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transactionsUpdated'));
    }
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ? AND userId = ?');
    stmt.run(transactionId, userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transactionsUpdated'));
    }
}

export async function deleteAllTransactions(userId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM transactions WHERE userId = ?');
    stmt.run(userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transactionsUpdated'));
    }
}

async function getExchangeRate(userId: string, fromCurrency: string, toCurrency: string): Promise<number> {
    const apiKey = await getExchangeRateApiKey(userId);
    if (!apiKey) {
      throw new Error("ExchangeRate API Key not found. Please set it in the settings.");
    }
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${fromCurrency}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorType = errorData['error-type'] || `HTTP status ${response.status}`;
            console.error(`API request failed with status: ${response.status}`, errorData);
            throw new Error(`API request failed: ${errorType}`);
        }
        const data = await response.json();
        if (data.result === 'error') {
            console.error(`ExchangeRate API error: ${data['error-type']}`);
            throw new Error(`ExchangeRate API error: ${data['error-type']}`);
        }
        const rate = data.conversion_rates?.[toCurrency];
        if (!rate) {
            throw new Error(`Could not find rate for ${toCurrency}`);
        }
        return rate;
    } catch(error) {
        console.error("Failed to fetch exchange rate. Full error:", error);
        throw error;
    }
}

export async function convertAmount(userId: string, amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
        return amount;
    }
    const exchangeRate = await getExchangeRate(userId, fromCurrency, toCurrency);
    return amount * exchangeRate;
}

export async function convertAllTransactions(userId: string, fromCurrency: string, toCurrency: string): Promise<void> {
    const allTransactions = await getAllTransactions(userId);
    const updateStmt = db.prepare('UPDATE transactions SET amount = ?, currency = ? WHERE id = ?');
    
    const updateTransaction = db.transaction((transactions) => {
        for (const transaction of transactions) {
            if (transaction.currency === fromCurrency) {
                convertAmount(userId, transaction.amount, fromCurrency, toCurrency).then(convertedAmount => {
                    updateStmt.run(convertedAmount, toCurrency, transaction.id);
                });
            }
        }
    });

    updateTransaction(allTransactions);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transactionsUpdated'));
    }
}

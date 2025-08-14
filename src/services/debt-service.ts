
'use server';

import { getDb } from './db';
import { format, parseISO } from 'date-fns';
import type { Debt, Payment } from '../lib/data';
import { convertAmount } from './transaction-service';
import { randomUUID } from 'crypto';

export async function addDebt(userId: string, newDebtData: Omit<Debt, 'id' | 'status' | 'payments' | 'userId'>): Promise<void> {
    const newDebt: Debt = {
        ...newDebtData,
        id: randomUUID(),
        userId,
        status: 'unpaid',
        payments: [],
    };
    
    const db = await getDb();
    const stmt = db.prepare(`
        INSERT INTO debts (id, userId, type, person, amount, currency, dueDate, status, note, payments) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(newDebt.id, userId, newDebt.type, newDebt.person, newDebt.amount, newDebt.currency, newDebt.dueDate, newDebt.status, newDebt.note, JSON.stringify(newDebt.payments));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('debtsUpdated'));
    }
}

export async function getAllDebts(userId: string): Promise<Debt[]> {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM debts WHERE userId = ?');
    const results = stmt.all(userId) as any[];
    return results.map(row => ({
        ...row,
        payments: JSON.parse(row.payments || '[]')
    }));
}

export async function getDebtById(userId: string, debtId: string): Promise<Debt | null> {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM debts WHERE userId = ? AND id = ?');
    const result = stmt.get(userId, debtId) as any;
    if (!result) return null;
    return {
        ...result,
        payments: JSON.parse(result.payments || '[]')
    };
}

export async function updateDebt(userId: string, updatedDebt: Debt): Promise<void> {
  const { id, ...debtData } = updatedDebt;
  const db = await getDb();
  const stmt = db.prepare(`
    UPDATE debts 
    SET type = ?, person = ?, amount = ?, currency = ?, dueDate = ?, status = ?, note = ?, payments = ?
    WHERE id = ? AND userId = ?
  `);
  stmt.run(debtData.type, debtData.person, debtData.amount, debtData.currency, debtData.dueDate, debtData.status, debtData.note, JSON.stringify(debtData.payments), id, userId);
   if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('debtsUpdated'));
    }
}

export async function deleteDebt(userId: string, debtId: string): Promise<void> {
    const db = await getDb();
    const stmt = db.prepare('DELETE FROM debts WHERE id = ? AND userId = ?');
    stmt.run(debtId, userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('debtsUpdated'));
    }
}

export async function addPaymentToDebt(userId: string, debtId: string, paymentAmount: number): Promise<Debt | null> {
    const debt = await getDebtById(userId, debtId);
    if (!debt) {
        throw new Error('Debt not found');
    }

    const newPayment: Payment = {
        id: randomUUID(),
        date: new Date().toISOString(),
        amount: paymentAmount,
    };
    
    const updatedPayments = [...debt.payments, newPayment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

    let newStatus: Debt['status'] = 'unpaid';
    if (totalPaid >= debt.amount) {
        newStatus = 'paid';
    } else if (totalPaid > 0) {
        newStatus = 'partial';
    }
    
    const updatedDebt = {
        ...debt,
        payments: updatedPayments,
        status: newStatus
    }

    await updateDebt(userId, updatedDebt);
    return updatedDebt;
}

export async function convertAllDebts(userId: string, fromCurrency: string, toCurrency: string): Promise<void> {
    const db = await getDb();
    const allDebts = await getAllDebts(userId);
    
    const debtsToConvert = allDebts.filter(d => d.currency === fromCurrency);

    const conversionPromises = debtsToConvert.map(async (debt) => {
        const convertedAmount = await convertAmount(userId, debt.amount, fromCurrency, toCurrency);
        
        const convertedPayments = await Promise.all(
            debt.payments.map(async (payment) => ({
                ...payment,
                amount: await convertAmount(userId, payment.amount, fromCurrency, toCurrency),
            }))
        );

        return { ...debt, amount: convertedAmount, currency: toCurrency, payments: convertedPayments };
    });

    const convertedDebts = await Promise.all(conversionPromises);

    const updateStmt = db.prepare('UPDATE debts SET amount = ?, currency = ?, payments = ? WHERE id = ?');
    const updateTransaction = db.transaction((debts) => {
        for (const debt of debts) updateStmt.run(debt.amount, debt.currency, JSON.stringify(debt.payments), debt.id);
    });
    updateTransaction(convertedDebts);


    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('debtsUpdated'));
    }
}

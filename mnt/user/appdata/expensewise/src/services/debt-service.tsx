
'use server';

import db from './db';
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
    const stmt = db.prepare('SELECT * FROM debts WHERE userId = ?');
    const results = stmt.all(userId) as any[];
    return results.map(row => ({
        ...row,
        payments: JSON.parse(row.payments || '[]')
    }));
}

export async function getDebtById(userId: string, debtId: string): Promise<Debt | null> {
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
    const stmt = db.prepare('DELETE FROM debts WHERE id = ? AND userId = ?');
    stmt.run(debtId, userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('debtsUpdated'));
    }
}

export async function addPaymentToDebt(userId: string, debt: Debt, paymentAmount: number): Promise<Debt> {
    
    const newPayment: Payment = {
        id: 'p' + (Math.random() * 1e9).toString(36),
        date: format(new Date(), 'yyyy-MM-dd'),
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
    const allDebts = await getAllDebts(userId);
    const updateStmt = db.prepare('UPDATE debts SET amount = ?, currency = ?, payments = ? WHERE id = ?');

    const updateTransaction = db.transaction((debts) => {
        for (const debt of debts) {
            if (debt.currency === fromCurrency) {
                const convertedAmount = convertAmount(userId, debt.amount, fromCurrency, toCurrency);
                
                const convertedPayments = debt.payments.map(payment => ({
                    ...payment,
                    amount: convertAmount(userId, payment.amount, fromCurrency, toCurrency),
                }));

                Promise.all([convertedAmount, Promise.all(convertedPayments.map(p=>p.amount))]).then(([newAmount, newPaymentAmounts]) => {
                     const newPayments = convertedPayments.map((p, i) => ({...p, amount: newPaymentAmounts[i]}))
                     updateStmt.run(newAmount, toCurrency, JSON.stringify(newPayments), debt.id);
                });
            }
        }
    });

    updateTransaction(allDebts);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('debtsUpdated'));
    }
}

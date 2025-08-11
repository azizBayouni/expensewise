
import { firestore } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  arrayUnion,
  writeBatch
} from 'firebase/firestore';
import { format } from 'date-fns';
import type { Debt, Payment } from '@/lib/data';

const debtsCollection = (userId: string) => collection(firestore, 'users', userId, 'debts');

export async function addDebt(userId: string, newDebtData: Omit<Debt, 'id' | 'status' | 'payments' | 'userId'>): Promise<void> {
    const newDebt: Omit<Debt, 'id'> = {
        ...newDebtData,
        userId,
        status: 'unpaid',
        payments: [],
    };
    await addDoc(debtsCollection(userId), newDebt);
    window.dispatchEvent(new Event('debtsUpdated'));
}

export async function getAllDebts(userId: string): Promise<Debt[]> {
    const q = query(debtsCollection(userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
}

export async function updateDebt(userId: string, updatedDebt: Debt): Promise<void> {
  const { id, ...debtData } = updatedDebt;
  const docRef = doc(firestore, 'users', userId, 'debts', id);
  await updateDoc(docRef, debtData);
  window.dispatchEvent(new Event('debtsUpdated'));
}

export async function deleteDebt(userId: string, debtId: string): Promise<void> {
    const docRef = doc(firestore, 'users', userId, 'debts', debtId);
    await deleteDoc(docRef);
    window.dispatchEvent(new Event('debtsUpdated'));
}

export async function addPaymentToDebt(userId: string, debt: Debt, paymentAmount: number): Promise<void> {
    const docRef = doc(firestore, 'users', userId, 'debts', debt.id);
    
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

    await updateDoc(docRef, {
        payments: arrayUnion(newPayment),
        status: newStatus,
    });
    
    window.dispatchEvent(new Event('debtsUpdated'));
}

export async function convertAllDebts(userId: string, fromCurrency: string, toCurrency: string): Promise<void> {
    const exchangeRate = 1; // You should fetch this rate
    const allDebts = await getAllDebts(userId);
    const batch = writeBatch(firestore);

    for (const debt of allDebts) {
        if (debt.currency === fromCurrency) {
            const docRef = doc(firestore, 'users', userId, 'debts', debt.id);
            batch.update(docRef, {
                amount: debt.amount * exchangeRate,
                currency: toCurrency,
            });
        }
    }
    await batch.commit();
}


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
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { getAllTransactions } from './transaction-service';
import type { Category } from '@/lib/data';

const categoriesCollection = (userId: string) => collection(firestore, 'users', userId, 'categories');

export async function getAllCategories(userId: string): Promise<Category[]> {
    const q = query(categoriesCollection(userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
}

export async function getCategoryDepth(categoryId: string | null, allCategories: Category[]): Promise<number> {
    if (!categoryId) return 0;
    let depth = 0;
    let current = allCategories.find(c => c.id === categoryId);
    while (current?.parentId) {
        depth++;
        current = allCategories.find(c => c.id === current!.parentId);
        if (depth > 10) break; // Safety break for circular dependencies
    }
    return depth;
}

export async function updateCategory(userId: string, updatedCategory: Category): Promise<void> {
    const { id, ...categoryData } = updatedCategory;
    const docRef = doc(firestore, 'users', userId, 'categories', id);
    
    const oldDocSnap = await getDoc(docRef);
    const oldName = oldDocSnap.data()?.name;

    await updateDoc(docRef, categoryData);
    
    // Update transactions if category name changed
    if (oldName && oldName !== updatedCategory.name) {
        const transactions = await getAllTransactions(userId);
        const batch = writeBatch(firestore);
        transactions.forEach(t => {
            if (t.category === oldName) {
                const transactionRef = doc(firestore, 'users', userId, 'transactions', t.id);
                batch.update(transactionRef, { category: updatedCategory.name });
            }
        });
        await batch.commit();
    }
    window.dispatchEvent(new Event('categoriesUpdated'));
}

export async function addCategory(userId: string, newCategoryData: Omit<Category, 'id' | 'userId'>): Promise<void> {
    const allCategories = await getAllCategories(userId);
    if (newCategoryData.parentId) {
        const parentDepth = await getCategoryDepth(newCategoryData.parentId, allCategories);
        if (parentDepth >= 2) {
            throw new Error("Cannot add a category beyond 3 levels deep.");
        }
    }
    
    const newCategory: Omit<Category, 'id'> = {
        ...newCategoryData,
        userId
    };

    await addDoc(categoriesCollection(userId), newCategory);
    window.dispatchEvent(new Event('categoriesUpdated'));
}

export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
    const allCategories = await getAllCategories(userId);
    const categoryToDelete = allCategories.find(c => c.id === categoryId);
    if (!categoryToDelete) {
        throw new Error(`Category with id ${categoryId} not found.`);
    }
    
    const allIdsToDelete: string[] = [categoryId];
    const findChildren = (parentId: string) => {
        const children = allCategories.filter(c => c.parentId === parentId);
        for (const child of children) {
            allIdsToDelete.push(child.id);
            findChildren(child.id);
        }
    };
    findChildren(categoryId);
    
    const namesToDelete = allCategories.filter(c => allIdsToDelete.includes(c.id)).map(c => c.name);

    const transactions = await getAllTransactions(userId);
    const hasTransactions = transactions.some(t => namesToDelete.includes(t.category));
    if (hasTransactions) {
        throw new Error("Cannot delete a category that has associated transactions. Please re-assign them first.");
    }

    const batch = writeBatch(firestore);
    allIdsToDelete.forEach(id => {
        const docRef = doc(firestore, 'users', userId, 'categories', id);
        batch.delete(docRef);
    });
    await batch.commit();
    
    window.dispatchEvent(new Event('categoriesUpdated'));
}

export async function deleteAllCategories(userId: string): Promise<void> {
    const transactions = await getAllTransactions(userId);
    if (transactions.length > 0) {
        throw new Error("Cannot delete categories because transactions exist. Please delete all transactions first.");
    }

    const allCategories = await getAllCategories(userId);
    const batch = writeBatch(firestore);
    allCategories.forEach(c => {
        const docRef = doc(firestore, 'users', userId, 'categories', c.id);
        batch.delete(docRef);
    });
    await batch.commit();
    window.dispatchEvent(new Event('categoriesUpdated'));
}

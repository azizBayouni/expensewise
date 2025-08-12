
'use server';

import { getDb } from './db';
import type { Category } from '../lib/data';
import { randomUUID } from 'crypto';

export async function getAllCategories(userId: string): Promise<Category[]> {
    const db = await getDb();
    const categories = await db.all('SELECT * FROM categories WHERE userId = ?', userId);
    return categories;
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
    const { id, name, type, parentId, icon } = updatedCategory;
    const db = await getDb();
    await db.run('UPDATE categories SET name = ?, type = ?, parentId = ?, icon = ? WHERE id = ? AND userId = ?', name, type, parentId, icon, id, userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('categoriesUpdated'));
    }
}

export async function addCategory(userId: string, newCategoryData: Omit<Category, 'id' | 'userId'>): Promise<void> {
    const allCategories = await getAllCategories(userId);
    if (newCategoryData.parentId) {
        const parentDepth = await getCategoryDepth(newCategoryData.parentId, allCategories);
        if (parentDepth >= 2) {
            throw new Error("Cannot add a category beyond 3 levels deep.");
        }
    }
    
    const newCategory: Category = {
        ...newCategoryData,
        id: randomUUID(),
        userId
    };

    const db = await getDb();
    await db.run('INSERT INTO categories (id, userId, name, type, parentId, icon) VALUES (?, ?, ?, ?, ?, ?)', newCategory.id, newCategory.userId, newCategory.name, newCategory.type, newCategory.parentId, newCategory.icon);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('categoriesUpdated'));
    }
}

export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
    const db = await getDb();
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

    // Check for associated transactions
    const placeholders = namesToDelete.map(() => '?').join(',');
    const hasTransactions = await db.get(`SELECT 1 FROM transactions WHERE userId = ? AND category IN (${placeholders}) LIMIT 1`, userId, ...namesToDelete);

    if (hasTransactions) {
        throw new Error("Cannot delete a category that has associated transactions. Please re-assign them first.");
    }
    
    await db.run('BEGIN TRANSACTION');
    try {
        for(const id of allIdsToDelete) {
            await db.run('DELETE FROM categories WHERE id = ? AND userId = ?', id, userId);
        }
        await db.run('COMMIT');
    } catch (e) {
        await db.run('ROLLBACK');
        throw e;
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('categoriesUpdated'));
    }
}

export async function deleteAllCategories(userId: string): Promise<void> {
    const db = await getDb();
    const hasTransactions = await db.get('SELECT 1 FROM transactions WHERE userId = ? LIMIT 1', userId);

    if (hasTransactions) {
        throw new Error("Cannot delete categories because transactions exist. Please delete all transactions first.");
    }

    await db.run('DELETE FROM categories WHERE userId = ?', userId);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('categoriesUpdated'));
    }
}

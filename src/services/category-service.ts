
'use server';

import { getDb } from './db';
import type { Category } from '../lib/data';
import { randomUUID } from 'crypto';

export function getAllCategories(userId: string): Category[] {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM categories WHERE userId = ?');
    const categories = stmt.all(userId) as Category[];
    return categories;
}

export function getCategoryDepth(categoryId: string | null, allCategories: Category[]): number {
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

export function updateCategory(userId: string, updatedCategory: Category): void {
    const db = getDb();
    const { id, name, type, parentId, icon } = updatedCategory;
    const stmt = db.prepare('UPDATE categories SET name = ?, type = ?, parentId = ?, icon = ? WHERE id = ? AND userId = ?');
    stmt.run(name, type, parentId, icon, id, userId);

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('categoriesUpdated'));
    }
}

export function addCategory(userId: string, newCategoryData: Omit<Category, 'id' | 'userId'>): void {
    const db = getDb();
    const allCategories = getAllCategories(userId);
    if (newCategoryData.parentId) {
        const parentDepth = getCategoryDepth(newCategoryData.parentId, allCategories);
        if (parentDepth >= 2) {
            throw new Error("Cannot add a category beyond 3 levels deep.");
        }
    }
    
    const newCategory: Category = {
        ...newCategoryData,
        id: randomUUID(),
        userId
    };

    const stmt = db.prepare('INSERT INTO categories (id, userId, name, type, parentId, icon) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(newCategory.id, newCategory.userId, newCategory.name, newCategory.type, newCategory.parentId, newCategory.icon);
    
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('categoriesUpdated'));
    }
}

export function deleteCategory(userId: string, categoryId: string): void {
    const db = getDb();
    const allCategories = getAllCategories(userId);
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
    const stmt = db.prepare(`SELECT 1 FROM transactions WHERE userId = ? AND category IN (${placeholders}) LIMIT 1`);
    const hasTransactions = stmt.get(userId, ...namesToDelete);

    if (hasTransactions) {
        throw new Error("Cannot delete a category that has associated transactions. Please re-assign them first.");
    }
    
    const deleteStmt = db.prepare('DELETE FROM categories WHERE id = ? AND userId = ?');
    const deleteTransaction = db.transaction((ids) => {
        for(const id of ids) {
            deleteStmt.run(id, userId);
        }
    });

    deleteTransaction(allIdsToDelete);

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('categoriesUpdated'));
    }
}

export function deleteAllCategories(userId: string): void {
    const db = getDb();
    const stmt = db.prepare('SELECT 1 FROM transactions WHERE userId = ? LIMIT 1');
    const hasTransactions = stmt.get(userId);

    if (hasTransactions) {
        throw new Error("Cannot delete categories because transactions exist. Please delete all transactions first.");
    }

    const deleteStmt = db.prepare('DELETE FROM categories WHERE userId = ?');
    deleteStmt.run(userId);

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('categoriesUpdated'));
    }
}

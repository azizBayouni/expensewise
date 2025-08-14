

'use server';

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DB_PATH = path.join(process.cwd(), 'db', 'expensewise.db');

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database;

// Function to run migrations
const runMigrations = (db: Database.Database) => {
    
    db.pragma('journal_mode = WAL');
    
    // Create all tables with their correct, final schema
    db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT);`);
    db.exec(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, userId TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, parentId TEXT, icon TEXT);`);
    db.exec(`CREATE TABLE IF NOT EXISTS wallets (id TEXT PRIMARY KEY, userId TEXT NOT NULL, name TEXT NOT NULL, icon TEXT, linkedCategoryIds TEXT, initialBalance REAL NOT NULL DEFAULT 0, isDeletable INTEGER NOT NULL DEFAULT 1, currency TEXT NOT NULL DEFAULT 'USD');`);
    db.exec(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, date TEXT NOT NULL, amount REAL NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL, wallet TEXT NOT NULL, description TEXT, currency TEXT NOT NULL, attachments TEXT, eventId TEXT, excludeFromReport INTEGER);`);
    db.exec(`CREATE TABLE IF NOT EXISTS debts (id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL, person TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, dueDate TEXT NOT NULL, status TEXT NOT NULL, note TEXT, payments TEXT);`);
    db.exec(`CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, userId TEXT NOT NULL, name TEXT NOT NULL, icon TEXT NOT NULL, status TEXT NOT NULL);`);
    db.exec(`CREATE TABLE IF NOT EXISTS settings (userId TEXT PRIMARY KEY, defaultCurrency TEXT, defaultWalletId TEXT, exchangeRateApiKey TEXT, theme TEXT);`);
    
    // ----- Migrations for existing databases -----
    try {
        const walletColumns = db.pragma('table_info(wallets)');
        
        // Migration: Add isDeletable if it doesn't exist
        const hasIsDeletable = walletColumns.some(col => col.name === 'isDeletable');
        if (!hasIsDeletable) {
            db.exec('ALTER TABLE wallets ADD COLUMN isDeletable INTEGER NOT NULL DEFAULT 1');
        }

        // Migration: Rename 'balance' to 'initialBalance' if old column exists
        const hasBalance = walletColumns.some(col => col.name === 'balance');
        const hasInitialBalance = walletColumns.some(col => col.name === 'initialBalance');

        if (hasBalance && !hasInitialBalance) {
            db.exec('ALTER TABLE wallets RENAME COLUMN balance TO initialBalance');
        }
        
        // Migration: Add currency column if it doesn't exist
        const hasCurrency = walletColumns.some(col => col.name === 'currency');
        if (!hasCurrency) {
            db.exec(`ALTER TABLE wallets ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'`);
        }

    } catch(e) { 
        console.error("A migration failed, which can be normal on first run. Carrying on.", e);
    }

    // --- Post-migration setup ---

    // Ensure dev user exists
    const userStmt = db.prepare('SELECT id FROM users WHERE id = ?');
    const user = userStmt.get('dev-user');
    if (!user) {
        const insertUser = db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)');
        insertUser.run('dev-user', 'Dev User', 'dev@expensewise.app');
    }
    
    // Ensure Main Wallet exists and is correctly flagged
    const mainWalletStmt = db.prepare('SELECT id from wallets WHERE userId = ? AND name = ?');
    let mainWallet = mainWalletStmt.get('dev-user', 'Main Wallet');
    if (!mainWallet) {
        const insertWallet = db.prepare('INSERT INTO wallets (id, userId, name, initialBalance, icon, linkedCategoryIds, isDeletable, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        insertWallet.run(randomUUID(), 'dev-user', 'Main Wallet', 0, '🏦', '[]', 0, 'USD');
    } else {
        // Ensure the existing main wallet is not deletable
        const updateStmt = db.prepare('UPDATE wallets SET isDeletable = 0 WHERE id = ?');
        updateStmt.run((mainWallet as {id: string}).id);
    }
};


export async function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    runMigrations(db);
  }
  return db;
}

(async () => {
    await getDb();
})();



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

// Function to get the current database version
function getDbVersion(): number {
    try {
        const stmt = db.prepare('SELECT version FROM db_version WHERE id = 1');
        const result = stmt.get() as { version: number } | undefined;
        return result ? result.version : 0;
    } catch (e) {
        // This happens if the db_version table doesn't exist yet.
        return 0;
    }
}

// Function to run migrations
const runMigrations = () => {
    if (!db) return;
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Migration 1: Initial Setup
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT
        );
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            parentId TEXT,
            icon TEXT
        );
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS wallets (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            currency TEXT NOT NULL,
            initialBalance REAL NOT NULL,
            icon TEXT,
            linkedCategoryIds TEXT
        );
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            wallet TEXT NOT NULL,
            description TEXT,
            currency TEXT NOT NULL,
            attachments TEXT,
            eventId TEXT,
            excludeFromReport INTEGER
        );
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS debts (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            type TEXT NOT NULL,
            person TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            dueDate TEXT NOT NULL,
            status TEXT NOT NULL,
            note TEXT,
            payments TEXT
        );
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            icon TEXT NOT NULL,
            status TEXT NOT NULL
        );
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            userId TEXT PRIMARY KEY,
            defaultCurrency TEXT,
            defaultWalletId TEXT,
            exchangeRateApiKey TEXT,
            theme TEXT
        );
    `);
     db.exec(`
        CREATE TABLE IF NOT EXISTS db_version (
            id INTEGER PRIMARY KEY,
            version INTEGER NOT NULL
        );
    `);

    let currentVersion = getDbVersion();

    if (currentVersion < 1) {
        db.exec('INSERT INTO db_version (id, version) VALUES (1, 1)');
        currentVersion = 1;
    }

    // Migration 2: Add isDeletable to wallets
    if (currentVersion < 2) {
        try {
            db.exec('ALTER TABLE wallets ADD COLUMN isDeletable INTEGER DEFAULT 1');
            db.exec('UPDATE db_version SET version = 2 WHERE id = 1');
            currentVersion = 2;
        } catch (e) {
            console.error("Migration 2 failed:", e);
        }
    }
    
    // Ensure dev user exists
    const userStmt = db.prepare('SELECT id FROM users WHERE id = ?');
    const user = userStmt.get('dev-user');
    if (!user) {
        const insertUser = db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)');
        insertUser.run('dev-user', 'Dev User', 'dev@expensewise.app');
    }
    
    // Ensure a default wallet exists
    try {
        const walletStmt = db.prepare('SELECT id FROM wallets WHERE userId = ? AND isDeletable = 0');
        const mainWallet = walletStmt.get('dev-user');
        if (!mainWallet) {
            const insertWallet = db.prepare('INSERT INTO wallets (id, userId, name, currency, initialBalance, icon, linkedCategoryIds, isDeletable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            insertWallet.run(randomUUID(), 'dev-user', 'Main Wallet', 'USD', 0, '🏦', '[]', 0);
        }
    } catch(e) {
        console.error("Failed to create default wallet:", e);
    }
};


export async function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    runMigrations();
  }
  return db;
}

// Initialize the DB on module load
(async () => {
    await getDb();
})();

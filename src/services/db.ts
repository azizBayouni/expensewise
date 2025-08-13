

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
function getDbVersion(db: Database.Database): number {
    try {
        const stmt = db.prepare('SELECT version FROM db_version WHERE id = 1');
        const result = stmt.get() as { version: number } | undefined;
        return result ? result.version : 0;
    } catch (e) {
        // This will happen if the table doesn't exist yet
        return 0;
    }
}

// Function to set the database version
function setDbVersion(db: Database.Database, version: number) {
    const stmt = db.prepare('UPDATE db_version SET version = ? WHERE id = 1');
    stmt.run(version);
}


// Function to run migrations
const runMigrations = (db: Database.Database) => {
    
    db.pragma('journal_mode = WAL');
    
    // Create all tables if they don't exist
    db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT);`);
    db.exec(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, userId TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, parentId TEXT, icon TEXT);`);
    db.exec(`CREATE TABLE IF NOT EXISTS wallets (id TEXT PRIMARY KEY, userId TEXT NOT NULL, name TEXT NOT NULL, currency TEXT NOT NULL, initialBalance REAL NOT NULL, icon TEXT, linkedCategoryIds TEXT);`);
    db.exec(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, date TEXT NOT NULL, amount REAL NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL, wallet TEXT NOT NULL, description TEXT, currency TEXT NOT NULL, attachments TEXT, eventId TEXT, excludeFromReport INTEGER);`);
    db.exec(`CREATE TABLE IF NOT EXISTS debts (id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL, person TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, dueDate TEXT NOT NULL, status TEXT NOT NULL, note TEXT, payments TEXT);`);
    db.exec(`CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, userId TEXT NOT NULL, name TEXT NOT NULL, icon TEXT NOT NULL, status TEXT NOT NULL);`);
    db.exec(`CREATE TABLE IF NOT EXISTS settings (userId TEXT PRIMARY KEY, defaultCurrency TEXT, defaultWalletId TEXT, exchangeRateApiKey TEXT, theme TEXT);`);
    db.exec(`CREATE TABLE IF NOT EXISTS db_version (id INTEGER PRIMARY KEY, version INTEGER NOT NULL);`);


    let currentVersion = getDbVersion(db);

    if (currentVersion < 1) {
        db.exec('INSERT OR IGNORE INTO db_version (id, version) VALUES (1, 0)');
        const checkStmt = db.prepare('SELECT version FROM db_version WHERE id = 1');
        const result = checkStmt.get() as { version: number } | undefined;
        if (!result) {
            db.exec('INSERT INTO db_version (id, version) VALUES (1, 1)');
        } else {
             setDbVersion(db, 1);
        }
        currentVersion = 1;
    }

    if (currentVersion < 2) {
        try {
            console.log("Running migration 2: Add isDeletable to wallets");
            db.exec('ALTER TABLE wallets ADD COLUMN isDeletable INTEGER NOT NULL DEFAULT 1');
            setDbVersion(db, 2);
        } catch (e: any) {
            if (!e.message.includes('duplicate column name')) {
                console.error("Migration 2 failed:", e);
                throw e;
            } else {
                 // The column already exists, so we can consider the migration successful.
                 setDbVersion(db, 2);
            }
        }
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
        const insertWallet = db.prepare('INSERT INTO wallets (id, userId, name, currency, initialBalance, icon, linkedCategoryIds, isDeletable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        insertWallet.run(randomUUID(), 'dev-user', 'Main Wallet', 'USD', 0, '🏦', '[]', 0);
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

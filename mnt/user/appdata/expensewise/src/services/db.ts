
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db', 'expensewise.db');

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: any = null;

export async function getDb() {
    if (db) return db;

    const newDb = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    await newDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT
        );
    `);

    await newDb.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            parentId TEXT,
            icon TEXT
        );
    `);

    await newDb.exec(`
        CREATE TABLE IF NOT EXISTS wallets (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            currency TEXT NOT NULL,
            balance REAL NOT NULL,
            icon TEXT,
            linkedCategoryIds TEXT
        );
    `);
    
    await newDb.exec(`
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

    await newDb.exec(`
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

    await newDb.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            icon TEXT NOT NULL,
            status TEXT NOT NULL
        );
    `);

    await newDb.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            userId TEXT PRIMARY KEY,
            defaultCurrency TEXT,
            defaultWalletId TEXT,
            exchangeRateApiKey TEXT,
            theme TEXT
        );
    `);
    
    db = newDb;
    return db;
}

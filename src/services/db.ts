
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db', 'expensewise.db');

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database;

export async function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    runMigrations();
  }
  return db;
}


// Function to run migrations
const runMigrations = () => {
    if (!db) return;
    
    // Create users table (even though we use a mock user, this is good practice)
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT
        );
    `);

    // Create categories table
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

    // Create wallets table
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
    
    // Create transactions table
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

    // Create debts table
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

    // Create events table
    db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            icon TEXT NOT NULL,
            status TEXT NOT NULL
        );
    `);

     // Create settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            userId TEXT PRIMARY KEY,
            defaultCurrency TEXT,
            defaultWalletId TEXT,
            exchangeRateApiKey TEXT,
            theme TEXT
        );
    `);
    
    // Ensure dev user exists
    const userStmt = db.prepare('SELECT id FROM users WHERE id = ?');
    const user = userStmt.get('dev-user');
    if (!user) {
        const insertUser = db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)');
        insertUser.run('dev-user', 'Dev User', 'dev@expensewise.app');
    }
};

// Initialize the DB on module load
(async () => {
    await getDb();
})();

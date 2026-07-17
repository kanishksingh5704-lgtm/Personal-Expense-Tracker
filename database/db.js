const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'finance.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    icon TEXT DEFAULT '📌',
    color TEXT DEFAULT '#6366f1'
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount REAL NOT NULL CHECK(amount > 0),
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    monthly_limit REAL NOT NULL CHECK(monthly_limit > 0),
    month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    UNIQUE(category, month, year)
  );
`);

// Seed default categories
const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get();

if (existingCategories.count === 0) {
  const insertCategory = db.prepare('INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)');

  const categories = [
    // Expense categories
    ['Food & Dining', 'expense', '🍕', '#f43f5e'],
    ['Transportation', 'expense', '🚗', '#f59e0b'],
    ['Shopping', 'expense', '🛍️', '#8b5cf6'],
    ['Entertainment', 'expense', '🎬', '#ec4899'],
    ['Bills & Utilities', 'expense', '💡', '#ef4444'],
    ['Healthcare', 'expense', '🏥', '#14b8a6'],
    ['Education', 'expense', '📚', '#6366f1'],
    ['Travel', 'expense', '✈️', '#0ea5e9'],
    ['Groceries', 'expense', '🛒', '#22c55e'],
    ['Rent', 'expense', '🏠', '#a855f7'],
    ['Subscriptions', 'expense', '📱', '#f97316'],
    ['Other Expense', 'expense', '📦', '#64748b'],
    // Income categories
    ['Salary', 'income', '💰', '#10b981'],
    ['Freelance', 'income', '💻', '#06b6d4'],
    ['Investments', 'income', '📈', '#8b5cf6'],
    ['Business', 'income', '🏢', '#f59e0b'],
    ['Gifts', 'income', '🎁', '#ec4899'],
    ['Other Income', 'income', '💵', '#64748b']
  ];

  const insertMany = db.transaction(() => {
    for (const cat of categories) {
      insertCategory.run(...cat);
    }
  });
  insertMany();
}

// Seed sample transactions (6 months of data)
const existingTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get();

if (existingTransactions.count === 0) {
  const insertTransaction = db.prepare(
    'INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)'
  );

  const now = new Date();
  const sampleData = [];

  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Monthly salary
    const salaryVariation = 4500 + Math.random() * 1000;
    sampleData.push(['income', Math.round(salaryVariation * 100) / 100, 'Salary', 'Monthly salary', `${year}-${month}-01`]);

    // Occasional freelance income
    if (Math.random() > 0.4) {
      sampleData.push(['income', Math.round((500 + Math.random() * 1500) * 100) / 100, 'Freelance', 'Freelance project', `${year}-${month}-${String(Math.floor(Math.random() * 20) + 5).padStart(2, '0')}`]);
    }

    // Occasional investment income
    if (Math.random() > 0.6) {
      sampleData.push(['income', Math.round((100 + Math.random() * 400) * 100) / 100, 'Investments', 'Dividend income', `${year}-${month}-15`]);
    }

    // Rent
    sampleData.push(['expense', 1200, 'Rent', 'Monthly rent', `${year}-${month}-01`]);

    // Bills
    sampleData.push(['expense', Math.round((80 + Math.random() * 60) * 100) / 100, 'Bills & Utilities', 'Electricity bill', `${year}-${month}-05`]);
    sampleData.push(['expense', Math.round((40 + Math.random() * 30) * 100) / 100, 'Bills & Utilities', 'Internet bill', `${year}-${month}-05`]);

    // Food & Dining (multiple entries per month)
    const foodEntries = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < foodEntries; i++) {
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      const descriptions = ['Restaurant dinner', 'Coffee shop', 'Lunch out', 'Pizza delivery', 'Takeout', 'Dinner date', 'Brunch'];
      sampleData.push([
        'expense',
        Math.round((10 + Math.random() * 60) * 100) / 100,
        'Food & Dining',
        descriptions[Math.floor(Math.random() * descriptions.length)],
        `${year}-${month}-${day}`
      ]);
    }

    // Groceries
    const groceryEntries = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < groceryEntries; i++) {
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      sampleData.push(['expense', Math.round((40 + Math.random() * 80) * 100) / 100, 'Groceries', 'Weekly groceries', `${year}-${month}-${day}`]);
    }

    // Transportation
    const transportEntries = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < transportEntries; i++) {
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      const descriptions = ['Uber ride', 'Gas station', 'Bus pass', 'Parking', 'Metro ticket'];
      sampleData.push([
        'expense',
        Math.round((5 + Math.random() * 40) * 100) / 100,
        'Transportation',
        descriptions[Math.floor(Math.random() * descriptions.length)],
        `${year}-${month}-${day}`
      ]);
    }

    // Shopping (occasional)
    if (Math.random() > 0.3) {
      const shopEntries = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < shopEntries; i++) {
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const descriptions = ['New clothes', 'Electronics', 'Home decor', 'Books', 'Shoes'];
        sampleData.push([
          'expense',
          Math.round((20 + Math.random() * 150) * 100) / 100,
          'Shopping',
          descriptions[Math.floor(Math.random() * descriptions.length)],
          `${year}-${month}-${day}`
        ]);
      }
    }

    // Entertainment
    const entertainEntries = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < entertainEntries; i++) {
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      const descriptions = ['Movie tickets', 'Concert', 'Streaming service', 'Game purchase', 'Bowling'];
      sampleData.push([
        'expense',
        Math.round((10 + Math.random() * 50) * 100) / 100,
        'Entertainment',
        descriptions[Math.floor(Math.random() * descriptions.length)],
        `${year}-${month}-${day}`
      ]);
    }

    // Subscriptions
    sampleData.push(['expense', 14.99, 'Subscriptions', 'Netflix', `${year}-${month}-10`]);
    sampleData.push(['expense', 9.99, 'Subscriptions', 'Spotify', `${year}-${month}-12`]);

    // Healthcare (occasional)
    if (Math.random() > 0.5) {
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      sampleData.push(['expense', Math.round((30 + Math.random() * 200) * 100) / 100, 'Healthcare', 'Doctor visit', `${year}-${month}-${day}`]);
    }

    // Education (occasional)
    if (Math.random() > 0.6) {
      sampleData.push(['expense', Math.round((20 + Math.random() * 100) * 100) / 100, 'Education', 'Online course', `${year}-${month}-15`]);
    }
  }

  const insertAll = db.transaction(() => {
    for (const txn of sampleData) {
      insertTransaction.run(...txn);
    }
  });
  insertAll();

  // Seed budgets for current month
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const insertBudget = db.prepare(
    'INSERT OR IGNORE INTO budgets (category, monthly_limit, month, year) VALUES (?, ?, ?, ?)'
  );

  const budgets = [
    ['Food & Dining', 400, currentMonth, currentYear],
    ['Transportation', 200, currentMonth, currentYear],
    ['Shopping', 300, currentMonth, currentYear],
    ['Entertainment', 150, currentMonth, currentYear],
    ['Groceries', 350, currentMonth, currentYear],
    ['Subscriptions', 50, currentMonth, currentYear],
    ['Healthcare', 200, currentMonth, currentYear],
  ];

  const insertBudgets = db.transaction(() => {
    for (const b of budgets) {
      insertBudget.run(...b);
    }
  });
  insertBudgets();
}

module.exports = db;

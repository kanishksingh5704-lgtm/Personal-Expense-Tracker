const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/reports/monthly — full monthly breakdown
router.get('/monthly', (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    // Get totals
    const totals = db.prepare(`
      SELECT type, SUM(amount) as total, COUNT(*) as count
      FROM transactions 
      WHERE date >= ? AND date <= ?
      GROUP BY type
    `).all(startDate, endDate);

    let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;
    for (const row of totals) {
      if (row.type === 'income') {
        income = row.total;
        incomeCount = row.count;
      } else {
        expense = row.total;
        expenseCount = row.count;
      }
    }

    // Category breakdown
    const categoryBreakdown = db.prepare(`
      SELECT category, type, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE date >= ? AND date <= ?
      GROUP BY category, type
      ORDER BY total DESC
    `).all(startDate, endDate);

    // Daily spending
    const dailySpending = db.prepare(`
      SELECT date, type, SUM(amount) as total
      FROM transactions
      WHERE date >= ? AND date <= ?
      GROUP BY date, type
      ORDER BY date
    `).all(startDate, endDate);

    // Top transactions
    const topTransactions = db.prepare(`
      SELECT * FROM transactions
      WHERE date >= ? AND date <= ? AND type = 'expense'
      ORDER BY amount DESC
      LIMIT 5
    `).all(startDate, endDate);

    // Get category colors
    const categories = db.prepare('SELECT name, icon, color FROM categories').all();
    const categoryMap = {};
    for (const cat of categories) {
      categoryMap[cat.name] = { icon: cat.icon, color: cat.color };
    }

    res.json({
      month,
      year,
      income,
      expense,
      savings: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income * 100).toFixed(1) : '0.0',
      incomeCount,
      expenseCount,
      categoryBreakdown: categoryBreakdown.map(c => ({
        ...c,
        icon: categoryMap[c.category]?.icon || '📌',
        color: categoryMap[c.category]?.color || '#6366f1'
      })),
      dailySpending,
      topTransactions,
      totalTransactions: incomeCount + expenseCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/trends — 6-month trend data
router.get('/trends', (req, res) => {
  try {
    const now = new Date();
    const months = parseInt(req.query.months) || 6;
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const result = db.prepare(`
        SELECT type, SUM(amount) as total
        FROM transactions
        WHERE date >= ? AND date <= ?
        GROUP BY type
      `).all(startDate, endDate);

      let income = 0, expense = 0;
      for (const row of result) {
        if (row.type === 'income') income = row.total;
        else expense = row.total;
      }

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      trends.push({
        month: monthNames[month - 1],
        monthNum: month,
        year,
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
        savings: Math.round((income - expense) * 100) / 100
      });
    }

    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/category-breakdown
router.get('/category-breakdown', (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const breakdown = db.prepare(`
      SELECT 
        t.category,
        t.type,
        SUM(t.amount) as total,
        COUNT(*) as count,
        c.icon,
        c.color
      FROM transactions t
      LEFT JOIN categories c ON t.category = c.name
      WHERE t.date >= ? AND t.date <= ?
      GROUP BY t.category, t.type
      ORDER BY total DESC
    `).all(startDate, endDate);

    // Get budgets for expense categories
    const budgets = db.prepare(`
      SELECT category, monthly_limit
      FROM budgets
      WHERE month = ? AND year = ?
    `).all(month, year);

    const budgetMap = {};
    for (const b of budgets) {
      budgetMap[b.category] = b.monthly_limit;
    }

    const result = breakdown.map(item => ({
      ...item,
      icon: item.icon || '📌',
      color: item.color || '#6366f1',
      budget: budgetMap[item.category] || null,
      budgetUsed: budgetMap[item.category]
        ? ((item.total / budgetMap[item.category]) * 100).toFixed(1)
        : null
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

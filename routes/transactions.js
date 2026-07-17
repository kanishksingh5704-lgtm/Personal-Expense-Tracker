const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/transactions — list with optional filters
router.get('/', (req, res) => {
  try {
    const { type, category, startDate, endDate, search, limit, offset } = req.query;

    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    if (search) {
      query += ' AND (description LIKE ? OR category LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countQuery).get(...params);

    query += ' ORDER BY date DESC, created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    if (offset) {
      query += ' OFFSET ?';
      params.push(parseInt(offset));
    }

    const transactions = db.prepare(query).all(...params);
    res.json({ transactions, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/summary — totals for a date range
router.get('/summary', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions 
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' GROUP BY type';

    const results = db.prepare(query).all(...params);

    const summary = {
      income: 0,
      expense: 0,
      incomeCount: 0,
      expenseCount: 0
    };

    for (const row of results) {
      if (row.type === 'income') {
        summary.income = row.total;
        summary.incomeCount = row.count;
      } else {
        summary.expense = row.total;
        summary.expenseCount = row.count;
      }
    }

    summary.savings = summary.income - summary.expense;
    summary.savingsRate = summary.income > 0
      ? ((summary.savings / summary.income) * 100).toFixed(1)
      : '0.0';

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/categories — list all categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY type, name').all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions — create
router.post('/', (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;

    if (!type || !amount || !category || !date) {
      return res.status(400).json({ error: 'type, amount, category, and date are required' });
    }

    const result = db.prepare(
      'INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)'
    ).run(type, amount, category, description || '', date);

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/transactions/:id — update
router.put('/:id', (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    db.prepare(
      'UPDATE transactions SET type = ?, amount = ?, category = ?, description = ?, date = ? WHERE id = ?'
    ).run(
      type || existing.type,
      amount || existing.amount,
      category || existing.category,
      description !== undefined ? description : existing.description,
      date || existing.date,
      id
    );

    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id — delete
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    res.json({ message: 'Transaction deleted', id: parseInt(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

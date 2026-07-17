const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../database/db');

// GET /api/export/pdf — generate PDF report
router.get('/pdf', (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[month - 1];

    // Gather data
    const totals = db.prepare(`
      SELECT type, SUM(amount) as total, COUNT(*) as count
      FROM transactions WHERE date >= ? AND date <= ?
      GROUP BY type
    `).all(startDate, endDate);

    let income = 0, expense = 0;
    for (const row of totals) {
      if (row.type === 'income') income = row.total;
      else expense = row.total;
    }
    const savings = income - expense;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : '0.0';

    const categoryBreakdown = db.prepare(`
      SELECT category, type, SUM(amount) as total, COUNT(*) as count
      FROM transactions WHERE date >= ? AND date <= ?
      GROUP BY category, type ORDER BY total DESC
    `).all(startDate, endDate);

    const transactions = db.prepare(`
      SELECT * FROM transactions WHERE date >= ? AND date <= ?
      ORDER BY date DESC, amount DESC
    `).all(startDate, endDate);

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Finance_Report_${monthName}_${year}.pdf"`
    );

    doc.pipe(res);

    // Colors
    const primary = '#6366f1';
    const success = '#10b981';
    const danger = '#f43f5e';
    const textDark = '#1f2937';
    const textLight = '#6b7280';

    // Header
    doc.fontSize(28).fillColor(primary).text('Finance Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(16).fillColor(textLight).text(`${monthName} ${year}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(textLight).text(`Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

    // Divider
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(1);

    // Summary Section
    doc.fontSize(18).fillColor(textDark).text('Monthly Summary');
    doc.moveDown(0.5);

    const summaryY = doc.y;
    const colWidth = 123;

    // Income box
    doc.fontSize(10).fillColor(textLight).text('Total Income', 50, summaryY);
    doc.fontSize(20).fillColor(success).text(`Rs. ${income.toFixed(2)}`, 50, summaryY + 15);

    // Expense box
    doc.fontSize(10).fillColor(textLight).text('Total Expenses', 50 + colWidth, summaryY);
    doc.fontSize(20).fillColor(danger).text(`Rs. ${expense.toFixed(2)}`, 50 + colWidth, summaryY + 15);

    // Savings box
    doc.fontSize(10).fillColor(textLight).text('Net Savings', 50 + colWidth * 2, summaryY);
    doc.fontSize(20).fillColor(savings >= 0 ? success : danger)
      .text(`Rs. ${savings.toFixed(2)}`, 50 + colWidth * 2, summaryY + 15);

    // Savings Rate box
    doc.fontSize(10).fillColor(textLight).text('Savings Rate', 50 + colWidth * 3, summaryY);
    doc.fontSize(20).fillColor(primary).text(`${savingsRate}%`, 50 + colWidth * 3, summaryY + 15);

    doc.y = summaryY + 50;

    // Divider
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(1);

    // Category Breakdown
    doc.fontSize(18).fillColor(textDark).text('Spending by Category');
    doc.moveDown(0.5);

    const expenseCategories = categoryBreakdown.filter(c => c.type === 'expense');

    // Table header
    const tableTop = doc.y;
    doc.fontSize(10).fillColor(textLight);
    doc.text('Category', 50, tableTop);
    doc.text('Transactions', 250, tableTop);
    doc.text('Amount', 380, tableTop);
    doc.text('% of Total', 470, tableTop);

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.3);

    for (const cat of expenseCategories) {
      if (doc.y > 700) {
        doc.addPage();
      }
      const rowY = doc.y;
      const pct = expense > 0 ? ((cat.total / expense) * 100).toFixed(1) : '0.0';

      doc.fontSize(11).fillColor(textDark).text(cat.category, 50, rowY);
      doc.fontSize(10).fillColor(textLight).text(String(cat.count), 250, rowY);
      doc.fontSize(11).fillColor(danger).text(`Rs. ${cat.total.toFixed(2)}`, 380, rowY);
      doc.fontSize(10).fillColor(textLight).text(`${pct}%`, 470, rowY);
      doc.moveDown(0.5);
    }

    // Income categories
    const incomeCategories = categoryBreakdown.filter(c => c.type === 'income');
    if (incomeCategories.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(18).fillColor(textDark).text('Income Sources');
      doc.moveDown(0.5);

      for (const cat of incomeCategories) {
        if (doc.y > 700) {
          doc.addPage();
        }
        const rowY = doc.y;
        doc.fontSize(11).fillColor(textDark).text(cat.category, 50, rowY);
        doc.fontSize(10).fillColor(textLight).text(String(cat.count), 250, rowY);
        doc.fontSize(11).fillColor(success).text(`Rs. ${cat.total.toFixed(2)}`, 380, rowY);
        doc.moveDown(0.5);
      }
    }

    // Recent Transactions
    doc.moveDown(1);
    if (doc.y > 600) doc.addPage();

    doc.fontSize(18).fillColor(textDark).text('Transaction Details');
    doc.moveDown(0.5);

    // Table header
    doc.fontSize(9).fillColor(textLight);
    const txHeaderY = doc.y;
    doc.text('Date', 50, txHeaderY);
    doc.text('Description', 130, txHeaderY);
    doc.text('Category', 300, txHeaderY);
    doc.text('Amount', 420, txHeaderY);
    doc.text('Type', 500, txHeaderY);

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.3);

    for (const txn of transactions.slice(0, 50)) {
      if (doc.y > 720) {
        doc.addPage();
      }
      const rowY = doc.y;

      doc.fontSize(9).fillColor(textLight).text(txn.date, 50, rowY);
      doc.fontSize(9).fillColor(textDark).text(
        txn.description.length > 25 ? txn.description.substring(0, 25) + '...' : txn.description,
        130, rowY
      );
      doc.fontSize(9).fillColor(textLight).text(
        txn.category.length > 18 ? txn.category.substring(0, 18) + '...' : txn.category,
        300, rowY
      );
      doc.fontSize(9)
        .fillColor(txn.type === 'income' ? success : danger)
        .text(`${txn.type === 'income' ? '+' : '-'}Rs. ${txn.amount.toFixed(2)}`, 420, rowY);
      doc.fontSize(9).fillColor(textLight).text(txn.type, 500, rowY);
      doc.moveDown(0.4);
    }

    if (transactions.length > 50) {
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor(textLight)
        .text(`... and ${transactions.length - 50} more transactions`, { align: 'center' });
    }

    // Footer
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor(textLight)
      .text('Personal Finance Tracker — This report is auto-generated for personal use.', {
        align: 'center'
      });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

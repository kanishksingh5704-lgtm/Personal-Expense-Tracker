const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/insights — AI-powered spending analysis
router.get('/', (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const insights = [];

    // Helper: get monthly data
    function getMonthData(month, year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const totals = db.prepare(`
        SELECT type, SUM(amount) as total
        FROM transactions WHERE date >= ? AND date <= ?
        GROUP BY type
      `).all(startDate, endDate);

      let income = 0, expense = 0;
      for (const row of totals) {
        if (row.type === 'income') income = row.total;
        else expense = row.total;
      }

      const categories = db.prepare(`
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM transactions
        WHERE date >= ? AND date <= ? AND type = 'expense'
        GROUP BY category
        ORDER BY total DESC
      `).all(startDate, endDate);

      return { income, expense, categories, startDate, endDate };
    }

    // Get current and past 3 months data
    const currentData = getMonthData(currentMonth, currentYear);
    const pastMonths = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      pastMonths.push(getMonthData(d.getMonth() + 1, d.getFullYear()));
    }

    // 1. SAVINGS RATE ANALYSIS
    const savingsRate = currentData.income > 0
      ? ((currentData.income - currentData.expense) / currentData.income * 100)
      : 0;

    if (savingsRate >= 20) {
      insights.push({
        id: 'savings-great',
        type: 'success',
        icon: '🎯',
        title: 'Excellent Savings Rate!',
        message: `You're saving ${savingsRate.toFixed(1)}% of your income this month. That's above the recommended 20% target. Keep it up!`,
        metric: `${savingsRate.toFixed(1)}%`,
        metricLabel: 'Savings Rate'
      });
    } else if (savingsRate >= 10) {
      insights.push({
        id: 'savings-ok',
        type: 'info',
        icon: '💡',
        title: 'Good Savings, Room to Improve',
        message: `Your savings rate is ${savingsRate.toFixed(1)}%. Try to reach the recommended 20% by reducing discretionary spending.`,
        metric: `${savingsRate.toFixed(1)}%`,
        metricLabel: 'Savings Rate'
      });
    } else {
      insights.push({
        id: 'savings-low',
        type: 'warning',
        icon: '⚠️',
        title: 'Low Savings Rate',
        message: `Your savings rate is only ${savingsRate.toFixed(1)}%. Consider reviewing your expenses to find areas to cut back.`,
        metric: `${savingsRate.toFixed(1)}%`,
        metricLabel: 'Savings Rate'
      });
    }

    // 2. BUDGET PREDICTION
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const dailyRate = currentData.expense / (dayOfMonth || 1);
    const projectedExpense = dailyRate * daysInMonth;
    const projectedSavings = currentData.income - projectedExpense;

    insights.push({
      id: 'budget-prediction',
      type: projectedSavings >= 0 ? 'info' : 'warning',
      icon: '🔮',
      title: 'End-of-Month Projection',
      message: `Based on your spending of ₹${dailyRate.toFixed(2)}/day, you're projected to spend ₹${projectedExpense.toFixed(2)} this month. ${
        projectedSavings >= 0
          ? `You should save about ₹${projectedSavings.toFixed(2)}.`
          : `You may overspend by ₹${Math.abs(projectedSavings).toFixed(2)}. Consider slowing down.`
      }`,
      metric: `₹${projectedExpense.toFixed(0)}`,
      metricLabel: 'Projected Spending',
      progress: Math.min((dayOfMonth / daysInMonth) * 100, 100).toFixed(0)
    });

    // 3. ANOMALY DETECTION — Compare each category to 3-month average
    if (pastMonths.length >= 2) {
      for (const currentCat of currentData.categories) {
        const pastTotals = pastMonths
          .map(m => {
            const match = m.categories.find(c => c.category === currentCat.category);
            return match ? match.total : 0;
          })
          .filter(t => t > 0);

        if (pastTotals.length >= 2) {
          const avg = pastTotals.reduce((a, b) => a + b, 0) / pastTotals.length;
          const ratio = currentCat.total / avg;

          if (ratio > 1.5) {
            insights.push({
              id: `anomaly-${currentCat.category.toLowerCase().replace(/\s+/g, '-')}`,
              type: 'warning',
              icon: '📊',
              title: `Unusual ${currentCat.category} Spending`,
              message: `You've spent ₹${currentCat.total.toFixed(2)} on ${currentCat.category} this month — that's ${((ratio - 1) * 100).toFixed(0)}% more than your 3-month average of ₹${avg.toFixed(2)}.`,
              metric: `+${((ratio - 1) * 100).toFixed(0)}%`,
              metricLabel: 'vs Average'
            });
          } else if (ratio < 0.5 && avg > 50) {
            insights.push({
              id: `saving-${currentCat.category.toLowerCase().replace(/\s+/g, '-')}`,
              type: 'success',
              icon: '✅',
              title: `Great Job on ${currentCat.category}!`,
              message: `You've cut ${currentCat.category} spending by ${((1 - ratio) * 100).toFixed(0)}% compared to your 3-month average. Saving ₹${(avg - currentCat.total).toFixed(2)} this month!`,
              metric: `-${((1 - ratio) * 100).toFixed(0)}%`,
              metricLabel: 'vs Average'
            });
          }
        }
      }
    }

    // 4. TOP SPENDING CATEGORY
    if (currentData.categories.length > 0) {
      const topCat = currentData.categories[0];
      const pct = currentData.expense > 0
        ? (topCat.total / currentData.expense * 100).toFixed(1) : 0;

      insights.push({
        id: 'top-category',
        type: 'info',
        icon: '🏆',
        title: `Top Spending: ${topCat.category}`,
        message: `${topCat.category} accounts for ${pct}% of your total spending (₹${topCat.total.toFixed(2)}) across ${topCat.count} transactions.`,
        metric: `₹${topCat.total.toFixed(0)}`,
        metricLabel: topCat.category
      });
    }

    // 5. WEEKEND vs WEEKDAY SPENDING
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    const allExpenses = db.prepare(`
      SELECT date, amount FROM transactions
      WHERE date >= ? AND date <= ? AND type = 'expense'
    `).all(startDate, endDate);

    let weekdayTotal = 0, weekendTotal = 0, weekdayCount = 0, weekendCount = 0;
    for (const txn of allExpenses) {
      const d = new Date(txn.date + 'T00:00:00');
      const day = d.getDay();
      if (day === 0 || day === 6) {
        weekendTotal += txn.amount;
        weekendCount++;
      } else {
        weekdayTotal += txn.amount;
        weekdayCount++;
      }
    }

    const avgWeekday = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
    const avgWeekend = weekendCount > 0 ? weekendTotal / weekendCount : 0;

    if (avgWeekend > 0 && avgWeekday > 0) {
      if (avgWeekend > avgWeekday * 1.3) {
        insights.push({
          id: 'weekend-spending',
          type: 'info',
          icon: '📅',
          title: 'Weekend Spender Alert',
          message: `You spend ${((avgWeekend / avgWeekday - 1) * 100).toFixed(0)}% more per transaction on weekends (₹${avgWeekend.toFixed(2)}) vs weekdays (₹${avgWeekday.toFixed(2)}). Consider setting a weekend budget.`,
          metric: `₹${avgWeekend.toFixed(0)}`,
          metricLabel: 'Avg Weekend Txn'
        });
      } else if (avgWeekday > avgWeekend * 1.3) {
        insights.push({
          id: 'weekday-spending',
          type: 'success',
          icon: '📅',
          title: 'Weekends Are Chill',
          message: `Your weekday spending (₹${avgWeekday.toFixed(2)}/txn) is higher than weekends (₹${avgWeekend.toFixed(2)}/txn). Your weekend budget discipline is paying off!`,
          metric: `₹${avgWeekday.toFixed(0)}`,
          metricLabel: 'Avg Weekday Txn'
        });
      }
    }

    // 6. MONTH-OVER-MONTH COMPARISON
    if (pastMonths.length > 0) {
      const lastMonth = pastMonths[0];
      const expenseChange = lastMonth.expense > 0
        ? ((currentData.expense - lastMonth.expense) / lastMonth.expense * 100) : 0;

      if (Math.abs(expenseChange) > 5) {
        insights.push({
          id: 'mom-comparison',
          type: expenseChange > 10 ? 'warning' : expenseChange < -5 ? 'success' : 'info',
          icon: expenseChange > 0 ? '📈' : '📉',
          title: `Spending ${expenseChange > 0 ? 'Up' : 'Down'} vs Last Month`,
          message: `Total expenses are ${expenseChange > 0 ? 'up' : 'down'} ${Math.abs(expenseChange).toFixed(1)}% compared to last month (₹${currentData.expense.toFixed(2)} vs ₹${lastMonth.expense.toFixed(2)}).`,
          metric: `${expenseChange > 0 ? '+' : ''}${expenseChange.toFixed(1)}%`,
          metricLabel: 'Month-over-Month'
        });
      }
    }

    // 7. BUDGET ALERTS
    const budgets = db.prepare(`
      SELECT b.category, b.monthly_limit, COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      LEFT JOIN transactions t ON t.category = b.category AND t.type = 'expense'
        AND t.date >= ? AND t.date <= ?
      WHERE b.month = ? AND b.year = ?
      GROUP BY b.category, b.monthly_limit
    `).all(startDate, endDate, currentMonth, currentYear);

    for (const budget of budgets) {
      const usage = (budget.spent / budget.monthly_limit * 100);
      if (usage > 100) {
        insights.push({
          id: `budget-over-${budget.category.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'warning',
          icon: '🚨',
          title: `${budget.category} Budget Exceeded!`,
          message: `You've spent ₹${budget.spent.toFixed(2)} of your ₹${budget.monthly_limit.toFixed(2)} ${budget.category} budget (${usage.toFixed(0)}%). Try to limit further spending.`,
          metric: `${usage.toFixed(0)}%`,
          metricLabel: 'Budget Used'
        });
      } else if (usage > 80) {
        insights.push({
          id: `budget-warn-${budget.category.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'info',
          icon: '⏳',
          title: `${budget.category} Budget Almost Used`,
          message: `You've used ${usage.toFixed(0)}% of your ₹${budget.monthly_limit.toFixed(2)} ${budget.category} budget. ₹${(budget.monthly_limit - budget.spent).toFixed(2)} remaining.`,
          metric: `${usage.toFixed(0)}%`,
          metricLabel: 'Budget Used'
        });
      }
    }

    // 8. SMART RECOMMENDATIONS
    const recommendations = [];

    if (currentData.categories.find(c => c.category === 'Food & Dining' && c.total > 300)) {
      recommendations.push('Consider meal prepping on Sundays to reduce dining out expenses.');
    }
    if (currentData.categories.find(c => c.category === 'Subscriptions' && c.total > 50)) {
      recommendations.push('Review your subscriptions — cancel any services you haven\'t used in the past month.');
    }
    if (savingsRate < 15) {
      recommendations.push('Set up automatic transfers to a savings account on payday to boost your savings rate.');
    }
    if (currentData.categories.find(c => c.category === 'Transportation' && c.total > 200)) {
      recommendations.push('Look into carpooling or public transit to reduce transportation costs.');
    }
    if (dailyRate > currentData.income / daysInMonth) {
      recommendations.push(`Your daily spending (₹${dailyRate.toFixed(2)}) exceeds your daily income allowance (₹${(currentData.income / daysInMonth).toFixed(2)}). Create a strict daily budget.`);
    }

    if (recommendations.length > 0) {
      insights.push({
        id: 'recommendations',
        type: 'info',
        icon: '💡',
        title: 'Smart Recommendations',
        message: recommendations.join(' | '),
        recommendations
      });
    }

    res.json({
      insights,
      summary: {
        totalInsights: insights.length,
        warnings: insights.filter(i => i.type === 'warning').length,
        successes: insights.filter(i => i.type === 'success').length,
        currentMonth: currentMonth,
        currentYear: currentYear,
        dayOfMonth,
        daysInMonth,
        dailyRate: Math.round(dailyRate * 100) / 100,
        projectedExpense: Math.round(projectedExpense * 100) / 100
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

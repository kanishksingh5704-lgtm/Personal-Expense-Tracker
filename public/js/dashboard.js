/**
 * dashboard.js — Dashboard view with stat cards, charts, and recent transactions
 */
const DashboardView = {
  charts: {},

  async render() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="dashboard-view" style="animation: fadeIn 0.3s ease">
        <!-- Stat Cards -->
        <div class="stats-grid" id="statsGrid">
          <div class="stat-card income">
            <div class="stat-header">
              <div class="stat-icon income"><i data-lucide="trending-up"></i></div>
              <span class="stat-label">Total Income</span>
            </div>
            <div class="stat-value income-val" id="statIncome">$0.00</div>
          </div>
          <div class="stat-card expense">
            <div class="stat-header">
              <div class="stat-icon expense"><i data-lucide="trending-down"></i></div>
              <span class="stat-label">Total Expenses</span>
            </div>
            <div class="stat-value expense-val" id="statExpense">$0.00</div>
          </div>
          <div class="stat-card savings">
            <div class="stat-header">
              <div class="stat-icon savings"><i data-lucide="piggy-bank"></i></div>
              <span class="stat-label">Net Savings</span>
            </div>
            <div class="stat-value savings-val" id="statSavings">$0.00</div>
          </div>
          <div class="stat-card rate">
            <div class="stat-header">
              <div class="stat-icon rate"><i data-lucide="percent"></i></div>
              <span class="stat-label">Savings Rate</span>
            </div>
            <div class="stat-value rate-val" id="statRate">0%</div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-title">
              <i data-lucide="activity"></i> Income & Expense Trends
            </div>
            <div class="chart-wrapper" style="height: 300px">
              <canvas id="trendChart"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-title">
              <i data-lucide="pie-chart"></i> Spending Breakdown
            </div>
            <div class="chart-wrapper" style="height: 300px">
              <canvas id="categoryChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="quick-stats-row" id="quickStats"></div>

        <!-- Recent Transactions -->
        <div class="section-header">
          <h3 class="section-title"><i data-lucide="clock"></i> Recent Transactions</h3>
          <a href="#transactions" class="view-all-link">View All →</a>
        </div>
        <div class="transaction-list" id="recentTransactions"></div>
      </div>
    `;

    lucide.createIcons();
    await this.loadData();
  },

  async loadData() {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      // Fetch all data in parallel
      const [summary, trends, report, recentData] = await Promise.all([
        API.getSummary({ startDate, endDate }),
        API.getTrends(6),
        API.getMonthlyReport(month, year),
        API.getTransactions({ limit: 8 })
      ]);

      // Update stat cards with animated counting
      this.animateValue('statIncome', summary.income, '₹');
      this.animateValue('statExpense', summary.expense, '₹');
      this.animateValue('statSavings', summary.savings, '₹');
      this.animateValue('statRate', parseFloat(summary.savingsRate), '', '%');

      // Render trend chart
      this.renderTrendChart(trends);

      // Render category chart
      const expenseCategories = report.categoryBreakdown.filter(c => c.type === 'expense');
      this.renderCategoryChart(expenseCategories);

      // Quick stats
      this.renderQuickStats(summary, report);

      // Recent transactions
      this.renderRecentTransactions(recentData.transactions);

    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  },

  animateValue(elementId, target, prefix = '', suffix = '') {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duration = 800;
    const start = performance.now();
    const startVal = 0;

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;

      if (suffix === '%') {
        el.textContent = `${prefix}${current.toFixed(1)}${suffix}`;
      } else {
        el.textContent = `${prefix}${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  },

  renderTrendChart(trends) {
    ChartHelper.destroy(this.charts.trend);

    const canvas = document.getElementById('trendChart');
    if (!canvas) return;

    const labels = trends.map(t => `${t.month} ${t.year}`);

    this.charts.trend = ChartHelper.createLineChart(canvas, labels, [
      {
        label: 'Income',
        data: trends.map(t => t.income),
        borderColor: ChartHelper.colors.income,
        fill: true
      },
      {
        label: 'Expenses',
        data: trends.map(t => t.expense),
        borderColor: ChartHelper.colors.expense,
        fill: true
      },
      {
        label: 'Savings',
        data: trends.map(t => t.savings),
        borderColor: ChartHelper.colors.savings,
        fill: false
      }
    ]);
  },

  renderCategoryChart(categories) {
    ChartHelper.destroy(this.charts.category);

    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;

    if (categories.length === 0) {
      canvas.parentElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <p>No expense data this month</p>
        </div>
      `;
      return;
    }

    const topCategories = categories.slice(0, 8);
    const labels = topCategories.map(c => c.category);
    const data = topCategories.map(c => c.total);
    const colors = topCategories.map(c => c.color || '#6366f1');

    this.charts.category = ChartHelper.createDoughnutChart(
      canvas, labels, data, colors,
      {
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, font: { size: 11 } }
          }
        }
      }
    );
  },

  renderQuickStats(summary, report) {
    const container = document.getElementById('quickStats');
    if (!container) return;

    const avgDaily = summary.expense / (new Date().getDate() || 1);
    const topCategory = report.categoryBreakdown
      .filter(c => c.type === 'expense')
      .sort((a, b) => b.total - a.total)[0];

    container.innerHTML = `
      <div class="quick-stat">
        <span class="quick-stat-icon">💸</span>
        <div class="quick-stat-info">
          <div class="quick-stat-value">₹${avgDaily.toFixed(2)}</div>
          <div class="quick-stat-label">Avg Daily Spend</div>
        </div>
      </div>
      <div class="quick-stat">
        <span class="quick-stat-icon">🏆</span>
        <div class="quick-stat-info">
          <div class="quick-stat-value">${topCategory ? topCategory.category : 'N/A'}</div>
          <div class="quick-stat-label">Top Category</div>
        </div>
      </div>
      <div class="quick-stat">
        <span class="quick-stat-icon">📝</span>
        <div class="quick-stat-info">
          <div class="quick-stat-value">${report.totalTransactions}</div>
          <div class="quick-stat-label">Transactions</div>
        </div>
      </div>
      <div class="quick-stat">
        <span class="quick-stat-icon">📅</span>
        <div class="quick-stat-info">
          <div class="quick-stat-value">${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
          <div class="quick-stat-label">Current Period</div>
        </div>
      </div>
    `;
  },

  renderRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    if (!container) return;

    if (transactions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No transactions yet</h3>
          <p>Add your first transaction to get started!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = transactions.map(txn => this.createTransactionHTML(txn)).join('');
    lucide.createIcons();
  },

  createTransactionHTML(txn) {
    const categoryIcons = {
      'Food & Dining': '🍕', 'Transportation': '🚗', 'Shopping': '🛍️',
      'Entertainment': '🎬', 'Bills & Utilities': '💡', 'Healthcare': '🏥',
      'Education': '📚', 'Travel': '✈️', 'Groceries': '🛒', 'Rent': '🏠',
      'Subscriptions': '📱', 'Other Expense': '📦', 'Salary': '💰',
      'Freelance': '💻', 'Investments': '📈', 'Business': '🏢',
      'Gifts': '🎁', 'Other Income': '💵'
    };

    const icon = categoryIcons[txn.category] || '📌';
    const sign = txn.type === 'income' ? '+' : '-';
    const dateStr = new Date(txn.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    });

    return `
      <div class="transaction-item" data-id="${txn.id}">
        <div class="txn-icon" style="background: ${txn.type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'}">
          ${icon}
        </div>
        <div class="txn-details">
          <div class="txn-category">${txn.category}</div>
          <div class="txn-description">${txn.description || 'No description'}</div>
        </div>
        <div class="txn-right">
          <div class="txn-amount ${txn.type}">${sign}₹${txn.amount.toFixed(2)}</div>
          <div class="txn-date">${dateStr}</div>
        </div>
      </div>
    `;
  },

  destroy() {
    ChartHelper.destroy(this.charts.trend);
    ChartHelper.destroy(this.charts.category);
    this.charts = {};
  }
};

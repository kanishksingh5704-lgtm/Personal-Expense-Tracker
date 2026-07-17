/**
 * reports.js (frontend) — Monthly reports view with charts and export
 */
const ReportsView = {
  charts: {},
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),

  async render() {
    const container = document.getElementById('viewContainer');

    const monthOptions = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ].map((name, i) => `<option value="${i + 1}" ${i + 1 === this.month ? 'selected' : ''}>${name}</option>`).join('');

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)
      .map(y => `<option value="${y}" ${y === this.year ? 'selected' : ''}>${y}</option>`).join('');

    container.innerHTML = `
      <div class="reports-view" style="animation: fadeIn 0.3s ease">
        <!-- Header -->
        <div class="report-header">
          <div class="month-selector">
            <select id="reportMonth">${monthOptions}</select>
            <select id="reportYear">${yearOptions}</select>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-primary" id="exportPdfBtn">
              <i data-lucide="download"></i>
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="stats-grid" id="reportStats"></div>

        <!-- Charts Row -->
        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-title">
              <i data-lucide="bar-chart-3"></i> Income vs Expenses
            </div>
            <div class="chart-wrapper" style="height: 300px">
              <canvas id="reportBarChart"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-title">
              <i data-lucide="pie-chart"></i> Category Split
            </div>
            <div class="chart-wrapper" style="height: 300px">
              <canvas id="reportDoughnut"></canvas>
            </div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="card mt-lg">
          <h3 class="section-title"><i data-lucide="layers"></i> Expense Breakdown</h3>
          <div class="category-bars" id="categoryBars"></div>
        </div>

        <!-- Top Transactions -->
        <div class="card mt-lg">
          <h3 class="section-title"><i data-lucide="flame"></i> Top Expenses</h3>
          <div class="transaction-list" id="topTransactions"></div>
        </div>
      </div>
    `;

    lucide.createIcons();
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    document.getElementById('reportMonth')?.addEventListener('change', (e) => {
      this.month = parseInt(e.target.value);
      this.loadData();
    });

    document.getElementById('reportYear')?.addEventListener('change', (e) => {
      this.year = parseInt(e.target.value);
      this.loadData();
    });

    document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
      const url = API.getExportUrl(this.month, this.year);
      window.open(url, '_blank');
      App.showToast('PDF report is being generated...', 'info');
    });
  },

  async loadData() {
    try {
      const [report, trends, breakdown] = await Promise.all([
        API.getMonthlyReport(this.month, this.year),
        API.getTrends(6),
        API.getCategoryBreakdown(this.month, this.year)
      ]);

      this.renderStats(report);
      this.renderBarChart(trends);
      this.renderDoughnut(breakdown.filter(c => c.type === 'expense'));
      this.renderCategoryBars(breakdown.filter(c => c.type === 'expense'), report.expense);
      this.renderTopTransactions(report.topTransactions);

    } catch (err) {
      console.error('Reports load error:', err);
    }
  },

  renderStats(report) {
    const container = document.getElementById('reportStats');
    if (!container) return;

    container.innerHTML = `
      <div class="stat-card income">
        <div class="stat-header">
          <div class="stat-icon income"><i data-lucide="trending-up"></i></div>
          <span class="stat-label">Income</span>
        </div>
        <div class="stat-value income-val">₹${report.income.toFixed(2)}</div>
        <div class="stat-change">${report.incomeCount} transactions</div>
      </div>
      <div class="stat-card expense">
        <div class="stat-header">
          <div class="stat-icon expense"><i data-lucide="trending-down"></i></div>
          <span class="stat-label">Expenses</span>
        </div>
        <div class="stat-value expense-val">₹${report.expense.toFixed(2)}</div>
        <div class="stat-change">${report.expenseCount} transactions</div>
      </div>
      <div class="stat-card savings">
        <div class="stat-header">
          <div class="stat-icon savings"><i data-lucide="piggy-bank"></i></div>
          <span class="stat-label">Savings</span>
        </div>
        <div class="stat-value savings-val">₹${report.savings.toFixed(2)}</div>
        <div class="stat-change ${parseFloat(report.savingsRate) >= 20 ? 'positive' : 'negative'}">${report.savingsRate}% saved</div>
      </div>
      <div class="stat-card rate">
        <div class="stat-header">
          <div class="stat-icon rate"><i data-lucide="hash"></i></div>
          <span class="stat-label">Total Transactions</span>
        </div>
        <div class="stat-value rate-val">${report.totalTransactions}</div>
        <div class="stat-change">this month</div>
      </div>
    `;
    lucide.createIcons();
  },

  renderBarChart(trends) {
    ChartHelper.destroy(this.charts.bar);

    const canvas = document.getElementById('reportBarChart');
    if (!canvas) return;

    this.charts.bar = ChartHelper.createBarChart(
      canvas,
      trends.map(t => `${t.month} ${t.year}`),
      [
        {
          label: 'Income',
          data: trends.map(t => t.income),
          backgroundColor: ChartHelper.hexToRgba(ChartHelper.colors.income, 0.7),
          hoverBackgroundColor: ChartHelper.colors.income
        },
        {
          label: 'Expenses',
          data: trends.map(t => t.expense),
          backgroundColor: ChartHelper.hexToRgba(ChartHelper.colors.expense, 0.7),
          hoverBackgroundColor: ChartHelper.colors.expense
        }
      ]
    );
  },

  renderDoughnut(categories) {
    ChartHelper.destroy(this.charts.doughnut);

    const canvas = document.getElementById('reportDoughnut');
    if (!canvas) return;

    if (categories.length === 0) {
      canvas.parentElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <p>No data for this period</p>
        </div>
      `;
      return;
    }

    const top8 = categories.slice(0, 8);
    this.charts.doughnut = ChartHelper.createDoughnutChart(
      canvas,
      top8.map(c => c.category),
      top8.map(c => c.total),
      top8.map(c => c.color || '#6366f1'),
      { plugins: { legend: { position: 'bottom' } } }
    );
  },

  renderCategoryBars(categories, totalExpense) {
    const container = document.getElementById('categoryBars');
    if (!container) return;

    if (categories.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No expense data</p>';
      return;
    }

    container.innerHTML = categories.map(cat => {
      const pct = totalExpense > 0 ? (cat.total / totalExpense * 100) : 0;
      const budgetInfo = cat.budget
        ? `<span style="color: ${parseFloat(cat.budgetUsed) > 100 ? 'var(--rose)' : 'var(--text-muted)'}; font-size: 11px; margin-left: 8px;">(${cat.budgetUsed}% of ₹${cat.budget} budget)</span>`
        : '';

      return `
        <div class="category-bar-item">
          <span class="cat-bar-icon">${cat.icon}</span>
          <div class="cat-bar-info">
            <div class="cat-bar-header">
              <span class="cat-bar-name">${cat.category}${budgetInfo}</span>
              <span class="cat-bar-amount">₹${cat.total.toFixed(2)}</span>
            </div>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width: ${pct}%; background: ${cat.color || '#6366f1'}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderTopTransactions(transactions) {
    const container = document.getElementById('topTransactions');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No transactions</p>';
      return;
    }

    container.innerHTML = transactions.map(txn => DashboardView.createTransactionHTML(txn)).join('');
  },

  destroy() {
    ChartHelper.destroy(this.charts.bar);
    ChartHelper.destroy(this.charts.doughnut);
    this.charts = {};
  }
};

/**
 * transactions.js (frontend) — Transaction list view with filters, pagination, and CRUD
 */
const TransactionsView = {
  page: 1,
  perPage: 15,
  filters: { type: '', category: '', search: '' },

  async render() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="transactions-view" style="animation: fadeIn 0.3s ease">
        <!-- Filters -->
        <div class="filters-bar">
          <div class="search-box">
            <i data-lucide="search"></i>
            <input type="text" id="txnSearch" placeholder="Search transactions..." value="${this.filters.search}">
          </div>
          <select class="filter-select" id="txnTypeFilter">
            <option value="">All Types</option>
            <option value="expense" ${this.filters.type === 'expense' ? 'selected' : ''}>Expenses</option>
            <option value="income" ${this.filters.type === 'income' ? 'selected' : ''}>Income</option>
          </select>
          <select class="filter-select" id="txnCategoryFilter">
            <option value="">All Categories</option>
          </select>
        </div>

        <!-- Transaction List -->
        <div class="transaction-list" id="transactionsList"></div>

        <!-- Pagination -->
        <div class="pagination" id="pagination"></div>
      </div>
    `;

    lucide.createIcons();
    this.bindFilters();
    await this.loadCategories();
    await this.loadTransactions();
  },

  bindFilters() {
    const search = document.getElementById('txnSearch');
    const typeFilter = document.getElementById('txnTypeFilter');
    const catFilter = document.getElementById('txnCategoryFilter');

    let searchTimeout;
    search?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.filters.search = e.target.value;
        this.page = 1;
        this.loadTransactions();
      }, 300);
    });

    typeFilter?.addEventListener('change', (e) => {
      this.filters.type = e.target.value;
      this.page = 1;
      this.loadTransactions();
    });

    catFilter?.addEventListener('change', (e) => {
      this.filters.category = e.target.value;
      this.page = 1;
      this.loadTransactions();
    });
  },

  async loadCategories() {
    try {
      const categories = await API.getCategories();
      const select = document.getElementById('txnCategoryFilter');
      if (!select) return;

      const expenseCats = categories.filter(c => c.type === 'expense');
      const incomeCats = categories.filter(c => c.type === 'income');

      let html = '<option value="">All Categories</option>';
      html += '<optgroup label="Expenses">';
      expenseCats.forEach(c => {
        html += `<option value="${c.name}" ${this.filters.category === c.name ? 'selected' : ''}>${c.icon} ${c.name}</option>`;
      });
      html += '</optgroup><optgroup label="Income">';
      incomeCats.forEach(c => {
        html += `<option value="${c.name}" ${this.filters.category === c.name ? 'selected' : ''}>${c.icon} ${c.name}</option>`;
      });
      html += '</optgroup>';

      select.innerHTML = html;
    } catch (err) {
      console.error('Load categories error:', err);
    }
  },

  async loadTransactions() {
    try {
      const params = {
        limit: this.perPage,
        offset: (this.page - 1) * this.perPage
      };

      if (this.filters.type) params.type = this.filters.type;
      if (this.filters.category) params.category = this.filters.category;
      if (this.filters.search) params.search = this.filters.search;

      const { transactions, total } = await API.getTransactions(params);

      this.renderList(transactions);
      this.renderPagination(total);
    } catch (err) {
      console.error('Load transactions error:', err);
    }
  },

  renderList(transactions) {
    const container = document.getElementById('transactionsList');
    if (!container) return;

    if (transactions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No transactions found</h3>
          <p>Try adjusting your filters or add a new transaction.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = transactions.map(txn => this.createTransactionHTML(txn)).join('');
    lucide.createIcons();

    // Bind action buttons
    container.querySelectorAll('.txn-action-btn.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('.transaction-item').dataset.id;
        const txn = transactions.find(t => t.id === parseInt(id));
        if (txn) App.openEditModal(txn);
      });
    });

    container.querySelectorAll('.txn-action-btn.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('.transaction-item').dataset.id;
        App.openDeleteModal(parseInt(id));
      });
    });
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
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
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
        <div class="txn-actions">
          <button class="txn-action-btn edit" title="Edit">
            <i data-lucide="pencil"></i>
          </button>
          <button class="txn-action-btn delete" title="Delete">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;
  },

  renderPagination(total) {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(total / this.perPage);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    html += `<button class="pagination-btn" ${this.page <= 1 ? 'disabled' : ''} onclick="TransactionsView.goToPage(${this.page - 1})">← Prev</button>`;

    const startPage = Math.max(1, this.page - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="pagination-btn ${i === this.page ? 'active' : ''}" onclick="TransactionsView.goToPage(${i})">${i}</button>`;
    }

    html += `<span class="pagination-info">${total} total</span>`;
    html += `<button class="pagination-btn" ${this.page >= totalPages ? 'disabled' : ''} onclick="TransactionsView.goToPage(${this.page + 1})">Next →</button>`;

    container.innerHTML = html;
  },

  goToPage(page) {
    this.page = page;
    this.loadTransactions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  destroy() {
    this.page = 1;
  }
};

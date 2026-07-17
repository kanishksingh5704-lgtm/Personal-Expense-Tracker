/**
 * app.js — Main application controller, router, and modal management
 */
const App = {
  currentView: null,
  deleteTargetId: null,
  categories: [],

  views: {
    dashboard: { title: 'Dashboard', module: DashboardView },
    transactions: { title: 'Transactions', module: TransactionsView },
    reports: { title: 'Monthly Reports', module: ReportsView },
    insights: { title: 'AI Insights', module: InsightsView }
  },

  init() {
    this.setDate();
    this.bindNavigation();
    this.bindModals();
    this.loadCategories();

    // Initial route
    const hash = window.location.hash.slice(1) || 'dashboard';
    this.navigateTo(hash);

    // Hash change listener
    window.addEventListener('hashchange', () => {
      const view = window.location.hash.slice(1) || 'dashboard';
      this.navigateTo(view);
    });
  },

  setDate() {
    const dateEl = document.getElementById('headerDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      });
    }
  },

  bindNavigation() {
    // Sidebar nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        window.location.hash = view;
      });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    menuToggle?.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
      if (sidebar?.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !menuToggle?.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  },

  async navigateTo(viewName) {
    const view = this.views[viewName];
    if (!view) {
      window.location.hash = 'dashboard';
      return;
    }

    // Cleanup previous view
    if (this.currentView && this.views[this.currentView]?.module?.destroy) {
      this.views[this.currentView].module.destroy();
    }

    this.currentView = viewName;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update header title
    document.getElementById('viewTitle').textContent = view.title;

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');

    // Render view
    await view.module.render();

    // Re-init Lucide icons for new content
    lucide.createIcons();
  },

  // ===== Modal Management =====

  bindModals() {
    const modal = document.getElementById('transactionModal');
    const form = document.getElementById('transactionForm');
    const addBtn = document.getElementById('addTransactionBtn');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('modalCancel');
    const deleteModal = document.getElementById('deleteModal');
    const deleteClose = document.getElementById('deleteModalClose');
    const deleteCancel = document.getElementById('deleteCancelBtn');
    const deleteConfirm = document.getElementById('deleteConfirmBtn');

    // Add transaction button
    addBtn?.addEventListener('click', () => this.openAddModal());

    // Close modal
    closeBtn?.addEventListener('click', () => this.closeModal());
    cancelBtn?.addEventListener('click', () => this.closeModal());
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });

    // Form submit
    form?.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Type toggle
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateCategoryOptions(btn.dataset.type);
      });
    });

    // Delete modal
    deleteClose?.addEventListener('click', () => this.closeDeleteModal());
    deleteCancel?.addEventListener('click', () => this.closeDeleteModal());
    deleteModal?.addEventListener('click', (e) => {
      if (e.target === deleteModal) this.closeDeleteModal();
    });
    deleteConfirm?.addEventListener('click', () => this.confirmDelete());

    // Keyboard shortcut: Escape to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeDeleteModal();
      }
    });
  },

  async loadCategories() {
    try {
      this.categories = await API.getCategories();
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  },

  openAddModal() {
    const modal = document.getElementById('transactionModal');
    document.getElementById('modalTitle').textContent = 'Add Transaction';
    document.getElementById('modalSubmitText').textContent = 'Add Transaction';
    document.getElementById('transactionId').value = '';
    document.getElementById('txnAmount').value = '';
    document.getElementById('txnDescription').value = '';
    document.getElementById('txnDate').value = new Date().toISOString().split('T')[0];

    // Default to expense
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-btn[data-type="expense"]').classList.add('active');
    this.updateCategoryOptions('expense');

    modal.classList.add('active');
    setTimeout(() => document.getElementById('txnAmount')?.focus(), 300);
  },

  openEditModal(txn) {
    const modal = document.getElementById('transactionModal');
    document.getElementById('modalTitle').textContent = 'Edit Transaction';
    document.getElementById('modalSubmitText').textContent = 'Save Changes';
    document.getElementById('transactionId').value = txn.id;
    document.getElementById('txnAmount').value = txn.amount;
    document.getElementById('txnDescription').value = txn.description;
    document.getElementById('txnDate').value = txn.date;

    // Set type
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.type-btn[data-type="${txn.type}"]`).classList.add('active');
    this.updateCategoryOptions(txn.type);

    // Set category after options are loaded
    setTimeout(() => {
      document.getElementById('txnCategory').value = txn.category;
    }, 50);

    modal.classList.add('active');
  },

  closeModal() {
    document.getElementById('transactionModal')?.classList.remove('active');
    document.getElementById('transactionForm')?.reset();
  },

  updateCategoryOptions(type) {
    const select = document.getElementById('txnCategory');
    if (!select) return;

    const filtered = this.categories.filter(c => c.type === type);
    select.innerHTML = '<option value="">Select category...</option>' +
      filtered.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
  },

  async handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('transactionId').value;
    const type = document.querySelector('.type-btn.active')?.dataset.type;
    const amount = parseFloat(document.getElementById('txnAmount').value);
    const category = document.getElementById('txnCategory').value;
    const description = document.getElementById('txnDescription').value;
    const date = document.getElementById('txnDate').value;

    if (!type || !amount || !category || !date) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      if (id) {
        await API.updateTransaction(id, { type, amount, category, description, date });
        this.showToast('Transaction updated successfully!', 'success');
      } else {
        await API.createTransaction({ type, amount, category, description, date });
        this.showToast('Transaction added successfully!', 'success');
      }

      this.closeModal();
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message || 'Failed to save transaction', 'error');
    }
  },

  openDeleteModal(id) {
    this.deleteTargetId = id;
    document.getElementById('deleteModal')?.classList.add('active');
  },

  closeDeleteModal() {
    document.getElementById('deleteModal')?.classList.remove('active');
    this.deleteTargetId = null;
  },

  async confirmDelete() {
    if (!this.deleteTargetId) return;

    try {
      await API.deleteTransaction(this.deleteTargetId);
      this.showToast('Transaction deleted', 'success');
      this.closeDeleteModal();
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message || 'Failed to delete', 'error');
    }
  },

  refreshCurrentView() {
    if (this.currentView && this.views[this.currentView]) {
      this.views[this.currentView].module.render();
    }
  },

  // ===== Toast Notifications =====

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: 'check-circle',
      error: 'alert-circle',
      info: 'info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="toast-icon"></i>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Auto remove
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

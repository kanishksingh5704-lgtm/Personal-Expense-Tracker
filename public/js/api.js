/**
 * api.js — Fetch wrapper for all backend API calls
 */
const API = {
  BASE: '/api',

  async request(endpoint, options = {}) {
    try {
      const url = `${this.BASE}${endpoint}`;
      const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options
      };

      const response = await fetch(url, config);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Transactions
  async getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/transactions?${query}`);
  },

  async getSummary(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/transactions/summary?${query}`);
  },

  async getCategories() {
    return this.request('/transactions/categories');
  },

  async createTransaction(data) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTransaction(id, data) {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteTransaction(id) {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE'
    });
  },

  // Reports
  async getMonthlyReport(month, year) {
    return this.request(`/reports/monthly?month=${month}&year=${year}`);
  },

  async getTrends(months = 6) {
    return this.request(`/reports/trends?months=${months}`);
  },

  async getCategoryBreakdown(month, year) {
    return this.request(`/reports/category-breakdown?month=${month}&year=${year}`);
  },

  // Insights
  async getInsights() {
    return this.request('/insights');
  },

  // Export
  getExportUrl(month, year) {
    return `/api/export/pdf?month=${month}&year=${year}`;
  }
};

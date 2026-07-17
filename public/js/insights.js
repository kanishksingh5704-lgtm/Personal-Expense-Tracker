/**
 * insights.js (frontend) — AI Insights view
 */
const InsightsView = {
  async render() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = `
      <div class="insights-view" style="animation: fadeIn 0.3s ease">
        <!-- Summary Bar -->
        <div class="insights-summary" id="insightsSummary">
          <div class="insights-summary-card">
            <div class="insights-summary-value" style="color: var(--violet)">—</div>
            <div class="insights-summary-label">Total Insights</div>
          </div>
          <div class="insights-summary-card">
            <div class="insights-summary-value" style="color: var(--amber)">—</div>
            <div class="insights-summary-label">Warnings</div>
          </div>
          <div class="insights-summary-card">
            <div class="insights-summary-value" style="color: var(--emerald)">—</div>
            <div class="insights-summary-label">Positive</div>
          </div>
          <div class="insights-summary-card">
            <div class="insights-summary-value" style="color: var(--cyan)">—</div>
            <div class="insights-summary-label">Daily Spend Rate</div>
          </div>
        </div>

        <!-- Insights Grid -->
        <div class="insights-grid" id="insightsGrid">
          <div class="empty-state">
            <div class="empty-state-icon">🔄</div>
            <h3>Analyzing your spending...</h3>
            <p>Loading AI insights</p>
          </div>
        </div>
      </div>
    `;

    await this.loadInsights();
  },

  async loadInsights() {
    try {
      const { insights, summary } = await API.getInsights();
      this.renderSummary(summary);
      this.renderInsights(insights);
    } catch (err) {
      console.error('Insights load error:', err);
      document.getElementById('insightsGrid').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Could not load insights</h3>
          <p>Please try again later.</p>
        </div>
      `;
    }
  },

  renderSummary(summary) {
    const container = document.getElementById('insightsSummary');
    if (!container) return;

    container.innerHTML = `
      <div class="insights-summary-card">
        <div class="insights-summary-value" style="color: var(--violet)">${summary.totalInsights}</div>
        <div class="insights-summary-label">Total Insights</div>
      </div>
      <div class="insights-summary-card">
        <div class="insights-summary-value" style="color: var(--amber)">${summary.warnings}</div>
        <div class="insights-summary-label">Warnings</div>
      </div>
      <div class="insights-summary-card">
        <div class="insights-summary-value" style="color: var(--emerald)">${summary.successes}</div>
        <div class="insights-summary-label">Positive</div>
      </div>
      <div class="insights-summary-card">
        <div class="insights-summary-value" style="color: var(--cyan)">₹${summary.dailyRate.toFixed(2)}</div>
        <div class="insights-summary-label">Daily Spend Rate</div>
      </div>
    `;
  },

  renderInsights(insights) {
    const grid = document.getElementById('insightsGrid');
    if (!grid) return;

    if (insights.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎉</div>
          <h3>No insights yet</h3>
          <p>Add more transactions to unlock AI-powered spending analysis!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = insights.map(insight => this.createInsightCard(insight)).join('');
  },

  createInsightCard(insight) {
    let metricsHTML = '';
    if (insight.metric) {
      metricsHTML = `
        <div class="insight-metric">
          <span class="insight-metric-value">${insight.metric}</span>
          <span class="insight-metric-label">${insight.metricLabel || ''}</span>
        </div>
      `;
    }

    let progressHTML = '';
    if (insight.progress) {
      progressHTML = `
        <div class="progress-bar" style="margin-top: 12px;">
          <div class="progress-fill ${insight.type === 'warning' ? 'red' : 'blue'}" style="width: ${insight.progress}%"></div>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${insight.progress}% of month elapsed</div>
      `;
    }

    let recommendationsHTML = '';
    if (insight.recommendations && insight.recommendations.length > 0) {
      recommendationsHTML = `
        <ul class="recommendations-list">
          ${insight.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      `;
    }

    const badgeLabel = insight.type === 'success' ? 'Positive'
      : insight.type === 'warning' ? 'Warning' : 'Info';

    return `
      <div class="insight-card ${insight.type}">
        <div class="insight-header">
          <span class="insight-emoji">${insight.icon}</span>
          <div style="flex: 1">
            <div class="insight-title">${insight.title}</div>
          </div>
          <span class="insight-badge ${insight.type}">${badgeLabel}</span>
        </div>
        ${insight.recommendations ? '' : `<p class="insight-message">${insight.message}</p>`}
        ${recommendationsHTML}
        ${metricsHTML}
        ${progressHTML}
      </div>
    `;
  },

  destroy() {}
};

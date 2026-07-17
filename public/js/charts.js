/**
 * charts.js — Chart.js configuration factory with dark theme
 */
const ChartHelper = {
  // Common dark theme defaults
  defaults: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { family: "'Inter', sans-serif", size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10
        }
      },
      tooltip: {
        backgroundColor: '#1a2235',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { family: "'Inter', sans-serif", weight: '600' },
        bodyFont: { family: "'JetBrains Mono', monospace" },
        displayColors: true,
        boxPadding: 4
      }
    }
  },

  colors: {
    income: '#10b981',
    expense: '#f43f5e',
    savings: '#8b5cf6',
    primary: '#6366f1',
    blue: '#3b82f6',
    amber: '#f59e0b',
    cyan: '#06b6d4',
    pink: '#ec4899',
    categoryPalette: [
      '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444',
      '#14b8a6', '#6366f1', '#0ea5e9', '#22c55e', '#a855f7',
      '#f97316', '#64748b', '#10b981', '#06b6d4'
    ]
  },

  // Create gradient fill for line/area charts
  createGradient(ctx, color, height = 300) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, this.hexToRgba(color, 0.3));
    gradient.addColorStop(1, this.hexToRgba(color, 0.01));
    return gradient;
  },

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  // Create a line chart
  createLineChart(canvas, labels, datasets, options = {}) {
    const ctx = canvas.getContext('2d');

    const processedDatasets = datasets.map(ds => ({
      ...ds,
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: ds.borderColor,
      pointBorderColor: 'transparent',
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
      tension: 0.4,
      fill: ds.fill !== false,
      backgroundColor: ds.fill !== false
        ? this.hexToRgba(ds.borderColor, 0.08)
        : 'transparent',
      ...ds
    }));

    return new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: processedDatasets },
      options: {
        ...this.defaults,
        ...options,
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#64748b', font: { size: 11 } },
            border: { display: false }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: {
              color: '#64748b',
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: val => '₹' + val.toLocaleString()
            },
            border: { display: false },
            beginAtZero: true
          },
          ...options?.scales
        },
        plugins: {
          ...this.defaults.plugins,
          ...options?.plugins,
          tooltip: {
            ...this.defaults.plugins.tooltip,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            },
            ...options?.plugins?.tooltip
          }
        }
      }
    });
  },

  // Create a doughnut chart
  createDoughnutChart(canvas, labels, data, colors, options = {}) {
    const ctx = canvas.getContext('2d');

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors || this.colors.categoryPalette.slice(0, data.length),
          borderColor: 'rgba(17, 24, 39, 0.8)',
          borderWidth: 3,
          hoverBorderColor: '#1f2a3e',
          hoverOffset: 6
        }]
      },
      options: {
        ...this.defaults,
        ...options,
        cutout: '68%',
        plugins: {
          ...this.defaults.plugins,
          legend: {
            ...this.defaults.plugins.legend,
            position: 'right',
            ...options?.plugins?.legend
          },
          tooltip: {
            ...this.defaults.plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                return `${ctx.label}: ₹${ctx.parsed.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  },

  // Create a bar chart
  createBarChart(canvas, labels, datasets, options = {}) {
    const ctx = canvas.getContext('2d');

    const processedDatasets = datasets.map(ds => ({
      ...ds,
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 40,
      ...ds
    }));

    return new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: processedDatasets },
      options: {
        ...this.defaults,
        ...options,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11 } },
            border: { display: false }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: {
              color: '#64748b',
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: val => '₹' + val.toLocaleString()
            },
            border: { display: false },
            beginAtZero: true
          },
          ...options?.scales
        },
        plugins: {
          ...this.defaults.plugins,
          ...options?.plugins,
          tooltip: {
            ...this.defaults.plugins.tooltip,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            }
          }
        }
      }
    });
  },

  // Destroy chart safely
  destroy(chart) {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  }
};

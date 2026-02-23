/**
 * COGNO SOLUTION - Charts Module
 * Wrapper for Chart.js with predefined styles for cognitive platform
 */

// =========================================================
// CHART CONFIGURATION DEFAULTS
// =========================================================

const ChartDefaults = {
    // Colors by module
    colors: {
        dyslexia: {
            primary: '#3B82F6',
            light: '#93C5FD',
            gradient: ['#3B82F6', '#60A5FA']
        },
        dyscalculia: {
            primary: '#10B981',
            light: '#6EE7B7',
            gradient: ['#10B981', '#34D399']
        },
        dysgraphia: {
            primary: '#F59E0B',
            light: '#FCD34D',
            gradient: ['#F59E0B', '#FBBF24']
        },
        dyspraxia: {
            primary: '#EF4444',
            light: '#FCA5A5',
            gradient: ['#EF4444', '#F87171']
        },
        general: {
            primary: '#6366F1',
            light: '#A5B4FC',
            gradient: ['#6366F1', '#818CF8']
        }
    },

    // Font settings
    font: {
        family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        size: 12
    },

    // Animation settings
    animation: {
        duration: 750,
        easing: 'easeInOutQuart'
    }
};

// =========================================================
// CHART FACTORY
// =========================================================

const ChartFactory = {
    /**
     * Create a line chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} config - Chart configuration
     * @returns {Chart} Chart instance
     */
    createLineChart(canvas, config) {
        const { labels, datasets, options = {} } = config;

        return new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: datasets.map((ds, index) => ({
                    label: ds.label,
                    data: ds.data,
                    borderColor: ds.color || ChartDefaults.colors.general.primary,
                    backgroundColor: ds.fill ? this.createGradient(canvas, ds.color) : 'transparent',
                    fill: ds.fill || false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: ds.color || ChartDefaults.colors.general.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    ...ds
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: datasets.length > 1,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: ChartDefaults.font
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        titleFont: { ...ChartDefaults.font, weight: 'bold' },
                        bodyFont: ChartDefaults.font,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: ChartDefaults.font
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: ChartDefaults.font
                        }
                    }
                },
                animation: ChartDefaults.animation,
                ...options
            }
        });
    },

    /**
     * Create a bar chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} config - Chart configuration
     * @returns {Chart} Chart instance
     */
    createBarChart(canvas, config) {
        const { labels, datasets, options = {} } = config;

        return new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: datasets.map((ds) => ({
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: ds.colors || ds.color || ChartDefaults.colors.general.primary,
                    borderRadius: 6,
                    barThickness: ds.barThickness || 'flex',
                    maxBarThickness: 50,
                    ...ds
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: datasets.length > 1,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: ChartDefaults.font
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: ChartDefaults.font
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: ChartDefaults.font
                        }
                    }
                },
                animation: ChartDefaults.animation,
                ...options
            }
        });
    },

    /**
     * Create a doughnut/pie chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} config - Chart configuration
     * @returns {Chart} Chart instance
     */
    createDoughnutChart(canvas, config) {
        const { labels, data, colors, options = {} } = config;

        const defaultColors = [
            ChartDefaults.colors.dyslexia.primary,
            ChartDefaults.colors.dyscalculia.primary,
            ChartDefaults.colors.dysgraphia.primary,
            ChartDefaults.colors.dyspraxia.primary
        ];

        return new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors || defaultColors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: ChartDefaults.font
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                animation: ChartDefaults.animation,
                ...options
            }
        });
    },

    /**
     * Create a radar chart (for skill assessment)
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} config - Chart configuration
     * @returns {Chart} Chart instance
     */
    createRadarChart(canvas, config) {
        const { labels, datasets, options = {} } = config;

        return new Chart(canvas, {
            type: 'radar',
            data: {
                labels,
                datasets: datasets.map((ds) => ({
                    label: ds.label,
                    data: ds.data,
                    fill: true,
                    backgroundColor: this.hexToRgba(ds.color || ChartDefaults.colors.general.primary, 0.2),
                    borderColor: ds.color || ChartDefaults.colors.general.primary,
                    pointBackgroundColor: ds.color || ChartDefaults.colors.general.primary,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: ds.color || ChartDefaults.colors.general.primary,
                    ...ds
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            font: ChartDefaults.font
                        },
                        pointLabels: {
                            font: {
                                ...ChartDefaults.font,
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: datasets.length > 1,
                        position: 'top'
                    }
                },
                animation: ChartDefaults.animation,
                ...options
            }
        });
    },

    /**
     * Create gradient for chart fills
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {string} color - Base color
     * @returns {CanvasGradient} Gradient
     */
    createGradient(canvas, color) {
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, this.hexToRgba(color, 0.4));
        gradient.addColorStop(1, this.hexToRgba(color, 0.05));
        return gradient;
    },

    /**
     * Convert hex to rgba
     * @param {string} hex - Hex color
     * @param {number} alpha - Alpha value
     * @returns {string} RGBA color
     */
    hexToRgba(hex, alpha = 1) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};

// =========================================================
// PREDEFINED CHARTS FOR COGNO SOLUTION
// =========================================================

const CognoCharts = {
    /**
     * Progress over time chart
     * @param {string|HTMLCanvasElement} target - Canvas ID or element
     * @param {Object} data - Progress data
     * @returns {Chart} Chart instance
     */
    progressChart(target, data) {
        const canvas = typeof target === 'string' ? document.getElementById(target) : target;
        if (!canvas) return null;

        return ChartFactory.createLineChart(canvas, {
            labels: data.dates || data.labels,
            datasets: [{
                label: 'Progress Score',
                data: data.scores || data.values,
                color: ChartDefaults.colors.general.primary,
                fill: true
            }]
        });
    },

    /**
     * Module comparison chart (all 4 modules)
     * @param {string|HTMLCanvasElement} target - Canvas ID or element
     * @param {Object} data - Module scores
     * @returns {Chart} Chart instance
     */
    moduleComparisonChart(target, data) {
        const canvas = typeof target === 'string' ? document.getElementById(target) : target;
        if (!canvas) return null;

        const modules = ['Dyslexia', 'Dyscalculia', 'Dysgraphia', 'Dyspraxia'];
        const colors = [
            ChartDefaults.colors.dyslexia.primary,
            ChartDefaults.colors.dyscalculia.primary,
            ChartDefaults.colors.dysgraphia.primary,
            ChartDefaults.colors.dyspraxia.primary
        ];

        return ChartFactory.createBarChart(canvas, {
            labels: modules,
            datasets: [{
                label: 'Module Progress',
                data: [
                    data.dyslexia || 0,
                    data.dyscalculia || 0,
                    data.dysgraphia || 0,
                    data.dyspraxia || 0
                ],
                colors: colors
            }]
        });
    },

    /**
     * Activity distribution pie chart
     * @param {string|HTMLCanvasElement} target - Canvas ID or element
     * @param {Object} data - Activity counts by module
     * @returns {Chart} Chart instance
     */
    activityDistributionChart(target, data) {
        const canvas = typeof target === 'string' ? document.getElementById(target) : target;
        if (!canvas) return null;

        return ChartFactory.createDoughnutChart(canvas, {
            labels: ['Dyslexia', 'Dyscalculia', 'Dysgraphia', 'Dyspraxia'],
            data: [
                data.dyslexia || 0,
                data.dyscalculia || 0,
                data.dysgraphia || 0,
                data.dyspraxia || 0
            ]
        });
    },

    /**
     * Weekly activity chart
     * @param {string|HTMLCanvasElement} target - Canvas ID or element
     * @param {Array} data - Daily activity counts
     * @returns {Chart} Chart instance
     */
    weeklyActivityChart(target, data) {
        const canvas = typeof target === 'string' ? document.getElementById(target) : target;
        if (!canvas) return null;

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        return ChartFactory.createBarChart(canvas, {
            labels: days,
            datasets: [{
                label: 'Activities Completed',
                data: data.length === 7 ? data : [0, 0, 0, 0, 0, 0, 0],
                color: ChartDefaults.colors.general.primary
            }]
        });
    },

    /**
     * Skills radar chart
     * @param {string|HTMLCanvasElement} target - Canvas ID or element
     * @param {Object} data - Skill scores
     * @returns {Chart} Chart instance
     */
    skillsRadarChart(target, data) {
        const canvas = typeof target === 'string' ? document.getElementById(target) : target;
        if (!canvas) return null;

        const skills = [
            'Reading',
            'Writing',
            'Math',
            'Motor Skills',
            'Memory',
            'Focus'
        ];

        return ChartFactory.createRadarChart(canvas, {
            labels: skills,
            datasets: [{
                label: 'Current Skills',
                data: [
                    data.reading || 0,
                    data.writing || 0,
                    data.math || 0,
                    data.motor || 0,
                    data.memory || 0,
                    data.focus || 0
                ],
                color: ChartDefaults.colors.general.primary
            }]
        });
    },

    /**
     * Time spent chart
     * @param {string|HTMLCanvasElement} target - Canvas ID or element
     * @param {Object} data - Time data by module
     * @returns {Chart} Chart instance
     */
    timeSpentChart(target, data) {
        const canvas = typeof target === 'string' ? document.getElementById(target) : target;
        if (!canvas) return null;

        return ChartFactory.createLineChart(canvas, {
            labels: data.dates || [],
            datasets: [
                {
                    label: 'Dyslexia',
                    data: data.dyslexia || [],
                    color: ChartDefaults.colors.dyslexia.primary
                },
                {
                    label: 'Dyscalculia',
                    data: data.dyscalculia || [],
                    color: ChartDefaults.colors.dyscalculia.primary
                },
                {
                    label: 'Dysgraphia',
                    data: data.dysgraphia || [],
                    color: ChartDefaults.colors.dysgraphia.primary
                },
                {
                    label: 'Dyspraxia',
                    data: data.dyspraxia || [],
                    color: ChartDefaults.colors.dyspraxia.primary
                }
            ]
        });
    },

    /**
     * Accuracy trend chart
     * @param {string|HTMLCanvasElement} target - Canvas ID or element
     * @param {Object} data - Accuracy data
     * @returns {Chart} Chart instance
     */
    accuracyTrendChart(target, data) {
        const canvas = typeof target === 'string' ? document.getElementById(target) : target;
        if (!canvas) return null;

        return ChartFactory.createLineChart(canvas, {
            labels: data.dates || [],
            datasets: [{
                label: 'Accuracy %',
                data: data.accuracy || [],
                color: ChartDefaults.colors.dyscalculia.primary,
                fill: true
            }],
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    }
                }
            }
        });
    },

    /**
     * Children comparison chart (for parents/doctors)
     * @param {string|HTMLCanvasElement} target - Canvas ID or element
     * @param {Array} children - Children data with scores
     * @returns {Chart} Chart instance
     */
    childrenComparisonChart(target, children) {
        const canvas = typeof target === 'string' ? document.getElementById(target) : target;
        if (!canvas) return null;

        return ChartFactory.createBarChart(canvas, {
            labels: children.map(c => c.name),
            datasets: [
                {
                    label: 'Dyslexia',
                    data: children.map(c => c.dyslexia || 0),
                    color: ChartDefaults.colors.dyslexia.primary
                },
                {
                    label: 'Dyscalculia',
                    data: children.map(c => c.dyscalculia || 0),
                    color: ChartDefaults.colors.dyscalculia.primary
                },
                {
                    label: 'Dysgraphia',
                    data: children.map(c => c.dysgraphia || 0),
                    color: ChartDefaults.colors.dysgraphia.primary
                },
                {
                    label: 'Dyspraxia',
                    data: children.map(c => c.dyspraxia || 0),
                    color: ChartDefaults.colors.dyspraxia.primary
                }
            ]
        });
    },

    /**
     * Destroy chart instance
     * @param {Chart} chart - Chart instance
     */
    destroy(chart) {
        if (chart) {
            chart.destroy();
        }
    },

    /**
     * Update chart data
     * @param {Chart} chart - Chart instance
     * @param {Array} labels - New labels
     * @param {Array} data - New data
     * @param {number} datasetIndex - Dataset index to update
     */
    updateData(chart, labels, data, datasetIndex = 0) {
        if (!chart) return;

        if (labels) {
            chart.data.labels = labels;
        }
        
        if (data && chart.data.datasets[datasetIndex]) {
            chart.data.datasets[datasetIndex].data = data;
        }

        chart.update('active');
    }
};

// =========================================================
// MINI SPARKLINE CHARTS
// Small inline charts for dashboards
// =========================================================

const Sparklines = {
    /**
     * Create a sparkline chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Array} data - Data points
     * @param {Object} options - Options
     * @returns {Chart} Chart instance
     */
    create(canvas, data, options = {}) {
        const color = options.color || ChartDefaults.colors.general.primary;
        const positive = options.trend ? data[data.length - 1] >= data[0] : true;
        const trendColor = positive ? '#10B981' : '#EF4444';

        return new Chart(canvas, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    data,
                    borderColor: options.showTrend ? trendColor : color,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                animation: {
                    duration: 500
                }
            }
        });
    }
};

// =========================================================
// EXPORT
// =========================================================

window.CognoCharts = {
    // Factory
    Factory: ChartFactory,
    
    // Predefined charts
    ...CognoCharts,
    
    // Sparklines
    Sparklines,
    
    // Defaults for customization
    Defaults: ChartDefaults
};

// Log initialization
console.log('📊 Cogno Charts initialized');

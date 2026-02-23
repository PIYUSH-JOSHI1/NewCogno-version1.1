/**
 * Cogno Solution - Chart Components
 * Reusable chart configurations using Chart.js
 */

// Default chart options
const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'bottom',
            labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                    family: "'Lexend', sans-serif",
                    size: 12
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
                family: "'Lexend', sans-serif",
                size: 14
            },
            bodyFont: {
                family: "'Lexend', sans-serif",
                size: 12
            },
            padding: 12,
            cornerRadius: 8
        }
    }
};

// Color palettes
const chartColors = {
    primary: {
        purple: 'rgb(139, 92, 246)',
        blue: 'rgb(59, 130, 246)',
        green: 'rgb(34, 197, 94)',
        orange: 'rgb(249, 115, 22)',
        cyan: 'rgb(6, 182, 212)',
        pink: 'rgb(236, 72, 153)'
    },
    light: {
        purple: 'rgba(139, 92, 246, 0.2)',
        blue: 'rgba(59, 130, 246, 0.2)',
        green: 'rgba(34, 197, 94, 0.2)',
        orange: 'rgba(249, 115, 22, 0.2)',
        cyan: 'rgba(6, 182, 212, 0.2)',
        pink: 'rgba(236, 72, 153, 0.2)'
    },
    gradients: {
        purple: (ctx) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
            return gradient;
        },
        blue: (ctx) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            return gradient;
        }
    }
};

// ==================== PROGRESS LINE CHART ====================
function createProgressChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: data.datasets.map((ds, i) => ({
                label: ds.label,
                data: ds.data,
                borderColor: Object.values(chartColors.primary)[i % 6],
                backgroundColor: chartColors.gradients[Object.keys(chartColors.primary)[i % 6]]?.(ctx) || Object.values(chartColors.light)[i % 6],
                fill: options.fill !== false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }))
        },
        options: {
            ...defaultChartOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    max: options.maxY || 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            family: "'Lexend', sans-serif"
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: "'Lexend', sans-serif"
                        }
                    }
                }
            },
            ...options
        }
    });
}

// ==================== SCORE BAR CHART ====================
function createScoreChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: data.label || 'Score',
                data: data.values,
                backgroundColor: data.colors || Object.values(chartColors.primary).slice(0, data.values.length),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            ...defaultChartOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    max: options.maxY || 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            ...options
        }
    });
}

// ==================== ACTIVITY DOUGHNUT CHART ====================
function createActivityChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: data.colors || Object.values(chartColors.primary).slice(0, data.values.length),
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            ...defaultChartOptions,
            plugins: {
                ...defaultChartOptions.plugins,
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                }
            },
            ...options
        }
    });
}

// ==================== RADAR/SKILL CHART ====================
function createSkillChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'radar',
        data: {
            labels: data.labels,
            datasets: [{
                label: data.label || 'Skills',
                data: data.values,
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderColor: 'rgb(139, 92, 246)',
                pointBackgroundColor: 'rgb(139, 92, 246)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(139, 92, 246)'
            }]
        },
        options: {
            ...defaultChartOptions,
            scales: {
                r: {
                    beginAtZero: true,
                    max: options.maxValue || 100,
                    ticks: {
                        stepSize: 20,
                        font: {
                            family: "'Lexend', sans-serif"
                        }
                    },
                    pointLabels: {
                        font: {
                            family: "'Lexend', sans-serif",
                            size: 12
                        }
                    }
                }
            },
            ...options
        }
    });
}

// ==================== WEEKLY ACTIVITY CHART ====================
function createWeeklyChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Minutes Active',
                data: data.minutes || [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: days.map((_, i) => 
                    data.minutes?.[i] > 0 ? chartColors.primary.purple : 'rgba(139, 92, 246, 0.2)'
                ),
                borderRadius: 6
            }]
        },
        options: {
            ...defaultChartOptions,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: (value) => value + ' min'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            ...options
        }
    });
}

// ==================== CIRCULAR PROGRESS (CSS-based) ====================
function createCircularProgress(containerId, percentage, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const {
        size = 120,
        strokeWidth = 10,
        color = '#8b5cf6',
        bgColor = '#e5e7eb',
        showText = true,
        textSize = '2rem',
        animated = true
    } = options;
    
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    
    container.innerHTML = `
        <svg width="${size}" height="${size}" class="transform -rotate-90">
            <circle
                cx="${size / 2}"
                cy="${size / 2}"
                r="${radius}"
                stroke="${bgColor}"
                stroke-width="${strokeWidth}"
                fill="none"
            />
            <circle
                cx="${size / 2}"
                cy="${size / 2}"
                r="${radius}"
                stroke="${color}"
                stroke-width="${strokeWidth}"
                fill="none"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${animated ? circumference : offset}"
                stroke-linecap="round"
                class="transition-all duration-1000 ease-out"
                id="${containerId}-progress"
            />
        </svg>
        ${showText ? `
            <div class="absolute inset-0 flex items-center justify-center">
                <span class="font-bold" style="font-size: ${textSize}; color: ${color}">${percentage}%</span>
            </div>
        ` : ''}
    `;
    
    container.style.position = 'relative';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
    
    if (animated) {
        setTimeout(() => {
            const progressCircle = document.getElementById(`${containerId}-progress`);
            if (progressCircle) {
                progressCircle.style.strokeDashoffset = offset;
            }
        }, 100);
    }
}

// ==================== STREAK CALENDAR ====================
function createStreakCalendar(containerId, streakData, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const today = new Date();
    const days = [];
    
    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push({
            date: date.toISOString().split('T')[0],
            active: streakData.includes(date.toISOString().split('T')[0])
        });
    }
    
    container.innerHTML = `
        <div class="grid grid-cols-7 gap-1">
            ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => 
                `<div class="text-xs text-gray-400 text-center">${d}</div>`
            ).join('')}
            ${days.map(day => `
                <div class="aspect-square rounded ${day.active ? 'bg-purple-500' : 'bg-gray-100'}" 
                     title="${day.date}"
                     style="min-height: 20px;">
                </div>
            `).join('')}
        </div>
    `;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createProgressChart,
        createScoreChart,
        createActivityChart,
        createSkillChart,
        createWeeklyChart,
        createCircularProgress,
        createStreakCalendar,
        chartColors
    };
}

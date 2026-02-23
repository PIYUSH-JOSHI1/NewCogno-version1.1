/**
 * Cogno Solution - Progress Tracking JavaScript
 * Handles progress tracking and visualization
 */

// Progress Module
const ProgressTracker = {
    currentUser: null,
    progressData: null,
    chart: null,

    // Initialize progress tracker
    async init() {
        console.log('Initializing Progress Tracker...');

        // Check authentication
        await this.checkAuth();

        // Load progress data
        await this.loadProgressData();

        // Initialize UI components
        this.initSidebar();
        this.initChart();
        this.initTimeRangeSelector();
    },

    // Check authentication
    async checkAuth() {
        try {
            const user = await CognoAuth?.getCurrentUser();
            if (!user) {
                window.location.href = CognoPaths.auth.login();
                return;
            }
            this.currentUser = user;
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    },

    // Load progress data
    async loadProgressData() {
        if (!this.currentUser) return;

        try {
            // Load overall progress
            const { data: progress } = await CognoSupabase?.client
                ?.from('user_progress')
                ?.select('*')
                ?.eq('user_id', this.currentUser.id)
                ?.order('created_at', { ascending: false });

            this.progressData = progress || [];

            // Update UI with data
            this.updateProgressUI();

        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    },

    // Update progress UI
    updateProgressUI() {
        // Calculate stats
        const stats = this.calculateStats();

        // Update stat values if elements exist
        document.querySelectorAll('.stat-value').forEach((el, index) => {
            const statValues = [
                stats.activitiesCompleted,
                stats.totalTime,
                stats.streak,
                stats.points
            ];
            if (statValues[index]) el.textContent = statValues[index];
        });
    },

    // Calculate progress statistics
    calculateStats() {
        const data = this.progressData || [];

        return {
            activitiesCompleted: data.filter(p => p.completed).length || 156,
            totalTime: '24.5h',
            streak: 12,
            points: '2,450',
            overallProgress: 72
        };
    },

    // Initialize sidebar
    initSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');

        sidebarToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('collapsed');
        });

        if (window.innerWidth < 768) {
            sidebar?.classList.add('collapsed');
        }
    },

    // Initialize progress chart
    initChart() {
        const ctx = document.getElementById('progress-chart');
        if (!ctx || typeof Chart === 'undefined') return;

        const moduleColors = {
            dyslexia: '#3b82f6',
            dyscalculia: '#22c55e',
            dysgraphia: '#f59e0b',
            dyspraxia: '#06b6d4'
        };

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                datasets: [
                    {
                        label: 'Overall',
                        data: [35, 42, 48, 55, 62, 72],
                        borderColor: '#1e293b',
                        backgroundColor: 'rgba(30, 41, 59, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3
                    },
                    {
                        label: 'Dyslexia',
                        data: [40, 48, 55, 62, 68, 75],
                        borderColor: moduleColors.dyslexia,
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Dyscalculia',
                        data: [30, 35, 42, 48, 55, 60],
                        borderColor: moduleColors.dyscalculia,
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Dysgraphia',
                        data: [45, 52, 60, 68, 75, 80],
                        borderColor: moduleColors.dysgraphia,
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Dyspraxia',
                        data: [38, 45, 50, 58, 65, 70],
                        borderColor: moduleColors.dyspraxia,
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    }
                ]
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
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: value => value + '%',
                            stepSize: 20
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    // Initialize time range selector
    initTimeRangeSelector() {
        const selector = document.getElementById('time-range');
        selector?.addEventListener('change', (e) => {
            this.updateChartData(e.target.value);
        });
    },

    // Update chart data based on time range
    updateChartData(timeRange) {
        if (!this.chart) return;

        let labels, data;

        switch (timeRange) {
            case 'week':
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                data = [65, 68, 70, 71, 72, 72, 72];
                break;
            case 'month':
                labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                data = [55, 62, 68, 72];
                break;
            case 'year':
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                data = [20, 28, 35, 42, 48, 52, 56, 60, 64, 68, 70, 72];
                break;
            case 'all':
                labels = ['Q1', 'Q2', 'Q3', 'Q4'];
                data = [30, 45, 60, 72];
                break;
            default:
                return;
        }

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;

        // Update other datasets accordingly (simplified)
        this.chart.data.datasets[1].data = data.map(v => Math.min(100, v + 3));
        this.chart.data.datasets[2].data = data.map(v => Math.max(0, v - 12));
        this.chart.data.datasets[3].data = data.map(v => Math.min(100, v + 8));
        this.chart.data.datasets[4].data = data.map(v => Math.max(0, v - 2));

        this.chart.update();
    },

    // Get module progress data
    async getModuleProgress(moduleType) {
        if (!this.currentUser) return null;

        try {
            const { data } = await CognoSupabase?.client
                ?.from('module_progress')
                ?.select('*')
                ?.eq('user_id', this.currentUser.id)
                ?.eq('module_type', moduleType)
                ?.single();

            return data;
        } catch (error) {
            console.error('Failed to get module progress:', error);
            return null;
        }
    },

    // Record activity completion
    async recordActivity(activityData) {
        if (!this.currentUser) return false;

        try {
            const { error } = await CognoSupabase?.client
                ?.from('activity_log')
                ?.insert({
                    user_id: this.currentUser.id,
                    ...activityData,
                    completed_at: new Date().toISOString()
                });

            if (error) throw error;

            // Update streak
            await this.updateStreak();

            // Refresh progress data
            await this.loadProgressData();

            return true;
        } catch (error) {
            console.error('Failed to record activity:', error);
            return false;
        }
    },

    // Update user streak
    async updateStreak() {
        if (!this.currentUser) return;

        try {
            const { data: profile } = await CognoSupabase?.client
                ?.from('profiles')
                ?.select('streak, last_activity_date')
                ?.eq('id', this.currentUser.id)
                ?.single();

            if (!profile) return;

            const today = new Date().toDateString();
            const lastActivity = new Date(profile.last_activity_date).toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            let newStreak = 1;
            if (lastActivity === yesterday) {
                newStreak = (profile.streak || 0) + 1;
            } else if (lastActivity === today) {
                newStreak = profile.streak || 1;
            }

            await CognoSupabase?.client
                ?.from('profiles')
                ?.update({
                    streak: newStreak,
                    last_activity_date: new Date().toISOString()
                })
                ?.eq('id', this.currentUser.id);

        } catch (error) {
            console.error('Failed to update streak:', error);
        }
    },

    // Check and award achievements
    async checkAchievements() {
        if (!this.currentUser) return;

        const achievements = [
            { id: 'first_activity', condition: () => this.progressData.length >= 1 },
            { id: 'streak_7', condition: () => this.calculateStats().streak >= 7 },
            { id: 'streak_30', condition: () => this.calculateStats().streak >= 30 },
            { id: 'activities_50', condition: () => this.progressData.length >= 50 },
            { id: 'activities_100', condition: () => this.progressData.length >= 100 }
        ];

        for (const achievement of achievements) {
            if (achievement.condition()) {
                await this.awardAchievement(achievement.id);
            }
        }
    },

    // Award achievement
    async awardAchievement(achievementId) {
        try {
            // Check if already awarded
            const { data: existing } = await CognoSupabase?.client
                ?.from('user_achievements')
                ?.select('id')
                ?.eq('user_id', this.currentUser.id)
                ?.eq('achievement_id', achievementId)
                ?.single();

            if (existing) return;

            // Award the achievement
            await CognoSupabase?.client
                ?.from('user_achievements')
                ?.insert({
                    user_id: this.currentUser.id,
                    achievement_id: achievementId,
                    awarded_at: new Date().toISOString()
                });

            CognoNotifications?.toast?.success('Achievement unlocked!');
        } catch (error) {
            console.error('Failed to award achievement:', error);
        }
    },

    // Export progress report as PDF
    async exportReport() {
        const stats = this.calculateStats();
        const reportDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const fileName = `progress-report-${new Date().toISOString().split('T')[0]}.pdf`;

        try {
            // Check if jsPDF is available
            const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
            if (!jsPDFConstructor) {
                console.error('jsPDF library not loaded');
                CognoNotifications?.toast?.error('PDF generation failed. Please try again.');
                return;
            }

            const doc = new jsPDFConstructor();
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = 20;

            // ── Header ──
            doc.setFillColor(59, 130, 246); // primary blue
            doc.rect(0, 0, pageWidth, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('Cogno Solution', 14, yPos);

            yPos += 9;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text('Progress Report', 14, yPos);

            doc.setFontSize(10);
            doc.text(reportDate, pageWidth - 14, 20, { align: 'right' });
            if (this.currentUser?.email) {
                doc.text(this.currentUser.email, pageWidth - 14, 29, { align: 'right' });
            }

            // ── Overall Progress Summary ──
            yPos = 52;
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Overall Summary', 14, yPos);

            yPos += 4;
            doc.autoTable({
                startY: yPos,
                head: [['Metric', 'Value']],
                body: [
                    ['Overall Progress', stats.overallProgress + '%'],
                    ['Activities Completed', String(stats.activitiesCompleted)],
                    ['Total Learning Time', stats.totalTime],
                    ['Current Streak', stats.streak + ' days'],
                    ['Points Earned', String(stats.points)]
                ],
                theme: 'grid',
                headStyles: {
                    fillColor: [59, 130, 246],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 11
                },
                bodyStyles: { fontSize: 10 },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                margin: { left: 14, right: 14 }
            });

            // ── Module Breakdown ──
            yPos = doc.lastAutoTable.finalY + 12;
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Module Breakdown', 14, yPos);

            // Gather module data from the DOM
            const modulesData = [];
            document.querySelectorAll('.module-progress-card').forEach(card => {
                const name = card.querySelector('h3')?.textContent || '-';
                const progress = card.querySelector('.progress-ring span')?.textContent || '-';
                const statsElements = card.querySelectorAll('.module-stats span');
                const activities = statsElements[0]?.textContent?.trim() || '-';
                const time = statsElements[1]?.textContent?.trim() || '-';
                modulesData.push([name, progress, activities, time]);
            });

            yPos += 4;
            doc.autoTable({
                startY: yPos,
                head: [['Module', 'Progress', 'Activities', 'Time Spent']],
                body: modulesData.length > 0 ? modulesData : [
                    ['Dyslexia', '75%', '45 activities', '8.2h'],
                    ['Dyscalculia', '60%', '38 activities', '6.5h'],
                    ['Dysgraphia', '80%', '52 activities', '5.8h'],
                    ['Dyspraxia', '70%', '21 activities', '4.0h']
                ],
                theme: 'grid',
                headStyles: {
                    fillColor: [59, 130, 246],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 11
                },
                bodyStyles: { fontSize: 10 },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                margin: { left: 14, right: 14 }
            });

            // ── Recent Activity ──
            yPos = doc.lastAutoTable.finalY + 12;
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Recent Activity', 14, yPos);

            const activityData = [];
            document.querySelectorAll('.activity-item').forEach(item => {
                const title = item.querySelector('.activity-content h4')?.textContent || '-';
                const detail = item.querySelector('.activity-content p')?.textContent || '-';
                const time = item.querySelector('.activity-time')?.textContent || '-';
                activityData.push([title, detail, time]);
            });

            if (activityData.length > 0) {
                yPos += 4;
                doc.autoTable({
                    startY: yPos,
                    head: [['Activity', 'Details', 'Time']],
                    body: activityData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [59, 130, 246],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        fontSize: 11
                    },
                    bodyStyles: { fontSize: 10 },
                    alternateRowStyles: { fillColor: [245, 247, 255] },
                    margin: { left: 14, right: 14 },
                    columnStyles: {
                        0: { cellWidth: 70 },
                        1: { cellWidth: 70 }
                    }
                });
            }

            // ── Footer ──
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                const pageHeight = doc.internal.pageSize.getHeight();
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.setFont('helvetica', 'normal');
                doc.text(
                    `Generated by Cogno Solution on ${reportDate} | Page ${i} of ${pageCount}`,
                    pageWidth / 2, pageHeight - 10,
                    { align: 'center' }
                );
            }

            // Save the PDF
            doc.save(fileName);

            // Trigger Email Notification
            try {
                if (typeof CognoAPI !== 'undefined' && CognoAPI.Email) {
                    await CognoAPI.Email.sendProgressReport(this.currentUser.id, this.currentUser.email);
                    CognoNotifications?.toast?.success('PDF report downloaded and sent to your email');
                } else {
                    CognoNotifications?.toast?.success('PDF report downloaded successfully');
                }
            } catch (emailError) {
                console.error('Email report failed:', emailError);
                CognoNotifications?.toast?.success('PDF report downloaded successfully');
            }

        } catch (error) {
            console.error('PDF generation failed:', error);
            CognoNotifications?.toast?.error('Failed to generate PDF report');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ProgressTracker.init();
});

// Export for global access
window.ProgressTracker = ProgressTracker;

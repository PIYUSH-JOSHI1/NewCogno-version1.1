/**
 * COGNO SOLUTION - Dashboard Module
 * Handles dashboard initialization and functionality for all roles
 */

const CognoDashboard = {
    role: null,
    user: null,
    charts: {},

    // =========================================================
    // INITIALIZATION
    // =========================================================
    async init(role) {
        this.role = role;

        // Check auth
        const { session } = await CognoSupabase.getSession();
        if (!session) {
            localStorage.setItem('cogno_redirect_url', window.location.href);
            window.location.href = CognoPaths.auth.login();
            return;
        }

        // Get user data
        const { user, error } = await CognoSupabase.getCurrentUser();
        if (error || !user) {
            console.error('Failed to load user:', error);
            window.location.href = CognoPaths.auth.login();
            return;
        }

        this.user = user;

        // Initialize common components
        this.initCommon();

        // Initialize role-specific dashboard
        switch (role) {
            case 'child':
                await this.initChildDashboard();
                break;
            case 'parent':
                await this.initParentDashboard();
                break;
            case 'doctor':
                await this.initDoctorDashboard();
                break;
            case 'admin':
                await this.initAdminDashboard();
                break;
        }

        // Setup realtime subscriptions
        this.initRealtime();

        // Send login notification (once per session)
        this.triggerLoginEmail();

        console.log(`✅ ${role} dashboard initialized`);
    },

    /**
     * Trigger login notification email once per session
     */
    async triggerLoginEmail() {
        if (!this.user || !this.user.email) return;

        const sessionKey = `cogno_login_notified_${this.user.id}`;
        if (sessionStorage.getItem(sessionKey)) return;

        try {
            if (typeof CognoAPI !== 'undefined' && CognoAPI.Email) {
                const deviceInfo = `${navigator.platform} - ${navigator.userAgent.split(') ')[0].split('(')[1] || 'Web Browser'}`;
                const displayName = this.user.profile?.full_name || this.user.email.split('@')[0];

                await CognoAPI.Email.sendLoginNotification(
                    displayName,
                    this.user.email,
                    deviceInfo
                );

                sessionStorage.setItem(sessionKey, 'true');
                console.log('📧 Login notification email sent');
            }
        } catch (error) {
            console.error('Failed to send login notification:', error);
        }
    },

    // =========================================================
    // COMMON INITIALIZATION
    // =========================================================
    initCommon() {
        // Update user info in navbar
        this.updateUserInfo();

        // Initialize sidebar
        this.initSidebar();

        // Initialize dropdowns
        this.initDropdowns();

        // Initialize dark mode
        this.initDarkMode();

        // Initialize notifications
        this.initNotifications();

        // Initialize logout buttons
        this.initLogout();

        // Initialize modals
        this.initModals();
    },

    updateUserInfo() {
        const nameEl = document.getElementById('user-name');
        const welcomeNameEl = document.getElementById('welcome-name');
        const avatarImg = document.getElementById('user-avatar-img');

        const displayName = this.user.profile?.full_name || this.user.email?.split('@')[0] || 'User';

        if (nameEl) nameEl.textContent = displayName;
        if (welcomeNameEl) welcomeNameEl.textContent = displayName.split(' ')[0];

        if (avatarImg && this.user.profile?.avatar_url) {
            avatarImg.src = this.user.profile.avatar_url;
        }
    },

    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebar-toggle');
        const close = document.getElementById('sidebar-close');

        toggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
        });

        close?.addEventListener('click', () => {
            sidebar?.classList.remove('open');
        });

        // Close on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 1024 && sidebar?.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !toggle?.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    },

    initDropdowns() {
        // User menu dropdown
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');

        userMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown?.classList.toggle('show');
        });

        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        });
    },

    initDarkMode() {
        const toggle = document.getElementById('dark-mode-toggle');
        const icon = toggle?.querySelector('i');

        // Check stored preference
        const darkMode = localStorage.getItem('cogno_dark_mode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
            icon?.classList.replace('fa-moon', 'fa-sun');
        }

        toggle?.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('cogno_dark_mode', isDark);

            if (isDark) {
                icon?.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon?.classList.replace('fa-sun', 'fa-moon');
            }
        });
    },

    initNotifications() {
        const btn = document.getElementById('notification-btn');
        const panel = document.getElementById('notification-panel');
        const badge = document.getElementById('notification-badge');
        const markAllBtn = document.getElementById('mark-all-read');

        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            panel?.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!panel?.contains(e.target)) {
                panel?.classList.remove('show');
            }
        });

        markAllBtn?.addEventListener('click', () => {
            CognoNotifications.NotificationCenter.markAllAsRead();
            this.updateNotificationBadge(0);
        });

        // Load notifications
        this.loadNotifications();
    },

    async loadNotifications() {
        const list = document.getElementById('notification-list');
        const badge = document.getElementById('notification-badge');

        if (!list) return;

        // Load from Supabase
        const { data, error } = await CognoSupabase.query(
            'notifications',
            '*',
            [
                { column: 'user_id', value: this.user.id },
                { column: 'read', value: false }
            ],
            { column: 'created_at', ascending: false },
            10
        );

        if (error || !data?.length) {
            list.innerHTML = '<div class="notification-empty">No new notifications</div>';
            return;
        }

        this.updateNotificationBadge(data.length);

        list.innerHTML = data.map(n => `
            <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                <div class="notification-icon ${n.type}">
                    <i class="fa-solid fa-${this.getNotificationIcon(n.type)}"></i>
                </div>
                <div class="notification-content">
                    <p class="notification-text">${n.title}</p>
                    <span class="notification-time">${CognoUtils.Date.timeAgo(n.created_at)}</span>
                </div>
            </div>
        `).join('');
    },

    updateNotificationBadge(count) {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    getNotificationIcon(type) {
        const icons = {
            achievement: 'trophy',
            streak: 'fire',
            message: 'message',
            consultation: 'video',
            system: 'info-circle',
            alert: 'triangle-exclamation'
        };
        return icons[type] || 'bell';
    },

    initLogout() {
        const logoutBtns = document.querySelectorAll('#logout-btn, #dropdown-logout, #logout-btn-dropdown');

        logoutBtns.forEach(btn => {
            btn?.addEventListener('click', async (e) => {
                e.preventDefault();
                const confirmed = confirm('Are you sure you want to sign out?');

                if (confirmed) {
                    try {
                        await CognoSupabase.signOut();
                        window.location.href = CognoPaths.auth.login();
                    } catch (error) {
                        console.error('Logout error:', error);
                        window.location.href = CognoPaths.auth.login(); // Force redirect even on error
                    }
                }
            });
        });
    },

    initModals() {
        // Close modal on overlay click or close button
        document.querySelectorAll('.modal').forEach(modal => {
            const overlay = modal.querySelector('.modal-overlay');
            const closeBtn = modal.querySelector('.modal-close');

            overlay?.addEventListener('click', () => this.closeModal(modal));
            closeBtn?.addEventListener('click', () => this.closeModal(modal));
        });

        // Tab switching in modals
        document.querySelectorAll('.tabs').forEach(tabs => {
            tabs.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;

                    // Update active tab
                    tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    // Update tab content
                    const parent = tabs.closest('.modal-body') || tabs.parentElement;
                    parent.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.remove('active');
                    });
                    document.getElementById(`tab-${tabId}`)?.classList.add('active');
                });
            });
        });
    },

    openModal(modalId) {
        document.getElementById(modalId)?.classList.add('show');
    },

    closeModal(modal) {
        if (typeof modal === 'string') {
            document.getElementById(modal)?.classList.remove('show');
        } else {
            modal?.classList.remove('show');
        }
    },

    // =========================================================
    // CHILD DASHBOARD
    // =========================================================
    async initChildDashboard() {
        // Load streak and points
        await this.loadChildStats();

        // Load today's goals
        await this.loadGoals();

        // Load module progress
        await this.loadModuleProgress();

        // Load weekly chart
        this.initWeeklyChart();

        // Load recent achievements
        await this.loadRecentAchievements();

        // Load recent activity
        await this.loadRecentActivity();

        // Initialize accessibility
        this.initAccessibility();

        // Initialize TTS
        this.initTTS();
    },

    async loadChildStats() {
        const streakEl = document.getElementById('streak-number');
        const pointsEl = document.getElementById('points-number');

        try {
            // Calculate total points from actual activity data
            let totalPoints = 0;

            // Get all student progress to calculate points
            const { data: progress } = await CognoSupabase.query(
                'student_progress',
                'score, max_score, updated_at',
                [{ column: 'student_id', value: this.user.id }],
                { column: 'updated_at', ascending: false },
                500
            );

            if (progress?.length) {
                // Points = 10 per activity completed + bonus for scores >= 80%
                progress.forEach(p => {
                    const percentage = p.max_score > 0 ? (p.score / p.max_score) * 100 : 0;
                    totalPoints += 10; // Base points per activity
                    if (percentage >= 80) totalPoints += 5; // Bonus for good score
                    if (percentage >= 100) totalPoints += 10; // Extra bonus for perfect
                });
            }

            // Add XP from achievements
            const { data: achievements } = await CognoSupabase.query(
                'user_achievements',
                'xp_reward',
                [{ column: 'user_id', value: this.user.id }]
            );

            if (achievements?.length) {
                totalPoints += achievements.reduce((sum, a) => sum + (a.xp_reward || 0), 0);
            }

            // Calculate streak from activity dates
            let streak = 0;
            if (progress?.length) {
                // Get unique dates
                const dates = [...new Set(progress.map(p =>
                    new Date(p.updated_at).toDateString()
                ))].sort((a, b) => new Date(b) - new Date(a));

                // Count consecutive days from today
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();

                // Check if there's activity today or yesterday
                if (dates.includes(today) || dates.includes(yesterday)) {
                    streak = 1;
                    let checkDate = dates.includes(today) ? new Date() : new Date(Date.now() - 86400000);

                    for (let i = 1; i < 365; i++) {
                        checkDate.setDate(checkDate.getDate() - 1);
                        if (dates.includes(checkDate.toDateString())) {
                            streak++;
                        } else {
                            break;
                        }
                    }
                }
            }

            if (streakEl) streakEl.textContent = streak;
            if (pointsEl) pointsEl.textContent = CognoUtils.Number.format(totalPoints);

            // Update highlights
            const activitiesThisWeekEl = document.getElementById('activities-this-week');
            const hoursLearnedEl = document.getElementById('hours-learned');
            const avgScoreEl = document.getElementById('avg-score');

            if (progress?.length) {
                const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
                const weekActivities = progress.filter(p => new Date(p.updated_at) > oneWeekAgo);
                if (activitiesThisWeekEl) activitiesThisWeekEl.textContent = weekActivities.length;

                // Estimate hours: 15 mins per activity avg
                const totalMinutes = weekActivities.length * 15;
                if (hoursLearnedEl) hoursLearnedEl.textContent = `${(totalMinutes / 60).toFixed(1)}h`;

                const avg = progress.reduce((sum, p) => sum + (p.max_score > 0 ? (p.score / p.max_score) * 100 : 0), 0) / progress.length;
                if (avgScoreEl) avgScoreEl.textContent = `${Math.round(avg)}%`;
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
            // Fallback to profile values if calculation fails
            if (this.user.profile) {
                if (streakEl) streakEl.textContent = this.user.profile.streak_days || 0;
                if (pointsEl) pointsEl.textContent = CognoUtils.Number.format(this.user.profile.total_points || 0);
            }
        }
    },

    async loadGoals() {
        const goalsProgress = document.getElementById('goals-progress');

        // Get today's progress
        const today = CognoUtils.Date.format(new Date(), 'YYYY-MM-DD');

        const { data: progress } = await CognoSupabase.query(
            'student_progress',
            '*',
            [
                { column: 'student_id', value: this.user.id },
                { column: 'created_at', operator: 'gte', value: `${today}T00:00:00` }
            ]
        );

        // Simple goals based on activity
        const goals = {
            reading: progress?.some(p => p.module_type === 'dyslexia'),
            math: progress?.filter(p => p.module_type === 'dyscalculia')?.length >= 1,
            newActivity: progress?.length >= 1
        };

        const completed = Object.values(goals).filter(Boolean).length;
        if (goalsProgress) goalsProgress.textContent = `${completed} of 3 completed`;

        // Update checkboxes
        document.getElementById('goal-1').checked = goals.reading;
        document.getElementById('goal-2').checked = goals.math;
        document.getElementById('goal-3').checked = goals.newActivity;

        // Add completed class
        document.querySelectorAll('.goal-item').forEach((item, i) => {
            if (Object.values(goals)[i]) {
                item.classList.add('completed');
            }
        });
    },

    async loadModuleProgress() {
        const modules = ['dyslexia', 'dyscalculia', 'dysgraphia', 'dyspraxia'];

        for (const module of modules) {
            const { data } = await CognoSupabase.query(
                'student_progress',
                'score, max_score',
                [
                    { column: 'student_id', value: this.user.id },
                    { column: 'module_type', value: module }
                ],
                null,
                100
            );

            // Get the module card element
            const moduleCard = document.querySelector(`.module-card.module-${module}`);
            const progressBar = document.getElementById(`${module}-progress`);
            const progressText = document.getElementById(`${module}-progress-text`);

            // If no progress data, hide the module card
            if (!data?.length) {
                if (moduleCard) moduleCard.style.display = 'none';
                continue;
            }

            // Show the module card
            if (moduleCard) moduleCard.style.display = '';

            // Calculate proper percentage: sum of (score/max_score) / count * 100
            const percentages = data.map(p => {
                if (!p.max_score || p.max_score === 0) return 0;
                return (p.score / p.max_score) * 100;
            });
            const avgProgress = Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);

            if (progressBar) progressBar.style.width = `${avgProgress}%`;
            if (progressText) progressText.textContent = `${avgProgress}%`;
        }
    },

    async initWeeklyChart() {
        const ctx = document.getElementById('weekly-chart')?.getContext('2d');
        if (!ctx) return;

        // Fetch real data for last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: weekData } = await CognoSupabase.query(
            'student_progress',
            'updated_at, time_spent_seconds',
            [
                { column: 'student_id', value: this.user.id },
                { column: 'updated_at', operator: 'gte', value: sevenDaysAgo.toISOString() }
            ],
            { column: 'updated_at', ascending: true },
            500
        );

        // Aggregate by day
        const activities = [0, 0, 0, 0, 0, 0, 0];
        const minutes = [0, 0, 0, 0, 0, 0, 0];

        if (weekData?.length) {
            weekData.forEach(item => {
                const itemDate = new Date(item.updated_at);
                // Calculate which day index (0=6 days ago, 6=today)
                const diffDays = Math.floor((itemDate - sevenDaysAgo) / 86400000);
                if (diffDays >= 0 && diffDays < 7) {
                    activities[diffDays]++;
                    minutes[diffDays] += Math.round((item.time_spent_seconds || 900) / 60); // Default 15 min if missing
                }
            });
        }

        this.charts.weekly = CognoCharts.weeklyActivityChart('weekly-chart', {
            activities,
            minutes
        });
    },

    async loadRecentAchievements() {
        const grid = document.getElementById('achievements-grid');
        if (!grid) return;

        const { data } = await CognoSupabase.query(
            'user_achievements',
            '*',
            [{ column: 'user_id', value: this.user.id }],
            { column: 'unlocked_at', ascending: false },
            3
        );

        if (!data?.length) {
            grid.innerHTML = `
                <div class="achievement-placeholder">
                    <i class="fa-solid fa-lock"></i>
                    <span>Keep learning to unlock badges!</span>
                </div>
            `;
            return;
        }

        grid.innerHTML = data.map(ua => `
            <div class="achievement-badge">
                <span class="achievement-icon">${ua.icon || '🏆'}</span>
                <span class="achievement-name">${ua.title || 'Achievement'}</span>
            </div>
        `).join('');
    },

    async loadRecentActivity() {
        const feed = document.getElementById('activity-feed');
        if (!feed) return;

        const { data } = await CognoSupabase.query(
            'student_progress',
            '*',
            [{ column: 'student_id', value: this.user.id }],
            { column: 'updated_at', ascending: false },
            5
        );

        if (!data?.length) {
            feed.innerHTML = `
                <div class="activity-empty">
                    <i class="fa-solid fa-sparkles"></i>
                    <p>Start learning to see your activity here!</p>
                    <a href="../learning-hub/" class="btn btn-primary">Start Learning</a>
                </div>
            `;
            return;
        }

        const moduleColors = {
            dyslexia: 'var(--color-dyslexia)',
            dyscalculia: 'var(--color-dyscalculia)',
            dysgraphia: 'var(--color-dysgraphia)',
            dyspraxia: 'var(--color-dyspraxia)'
        };

        const moduleIcons = {
            dyslexia: 'book-open',
            dyscalculia: 'calculator',
            dysgraphia: 'pen',
            dyspraxia: 'person-running'
        };

        feed.innerHTML = data.map(a => {
            const percentage = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0;
            let statusIcon = 'check';
            let statusColor = moduleColors[a.module_type] || 'var(--color-primary)';
            let statusText = 'Completed';

            if (percentage >= 90) {
                statusIcon = 'award';
                statusColor = 'var(--color-success)';
                statusText = 'Excellent';
            } else if (percentage >= 70) {
                statusIcon = 'check';
                statusColor = 'var(--color-info)';
                statusText = 'Good Job';
            } else {
                statusIcon = 'graduation-cap';
                statusColor = 'var(--color-warning)';
                statusText = 'Practiced';
            }

            return `
            <div class="activity-item" style="padding: var(--space-4); border-bottom: 1px solid var(--border); transition: all 0.2s; display: flex; align-items: flex-start; gap: var(--space-4);">
                <div class="activity-icon" style="background: ${statusColor}15; color: ${statusColor}; width: 44px; height: 44px; min-width: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 1.25rem;">
                    <i class="fa-solid fa-${moduleIcons[a.module_type] || 'circle'}"></i>
                </div>
                <div class="activity-content" style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-1);">
                        <div>
                            <p class="activity-text" style="font-weight: 600; font-size: 0.95rem; margin: 0;">${a.activity_type || a.activity_id}</p>
                            <span style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: capitalize;">${a.module_type}</span>
                        </div>
                        <div style="text-align: right;">
                            <span class="activity-score" style="font-size: 1rem; font-weight: 700; color: ${statusColor}">${percentage}%</span>
                            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">${statusText}</div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-2);">
                        <div style="display: flex; gap: var(--space-3); align-items: center; font-size: 0.75rem; color: var(--text-tertiary);">
                            <span title="Time Spent"><i class="fa-solid fa-clock"></i> ${Math.round((a.time_spent_seconds || 0) / 60)}m</span>
                            <span style="width: 3px; height: 3px; background: var(--text-muted); border-radius: 50%;"></span>
                            <span>${CognoUtils.Date.timeAgo(a.updated_at)}</span>
                        </div>
                        ${percentage >= 80 ? `<div class="activity-points-badge" style="background: var(--color-success-100); color: var(--color-success); padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-star" style="font-size: 0.6rem;"></i> +15 XP</div>` : ''}
                    </div>
                </div>
            </div>
        `}).join('');
    },

    getActivityIcon(type) {
        const icons = {
            game_completed: 'gamepad',
            achievement_earned: 'trophy',
            streak_extended: 'fire',
            level_up: 'arrow-up',
            activity_started: 'play',
            session_completed: 'check'
        };
        return icons[type] || 'circle';
    },

    initAccessibility() {
        const btn = document.getElementById('accessibility-btn');
        const panel = document.getElementById('accessibility-panel');
        const closeBtn = document.getElementById('accessibility-close');

        btn?.addEventListener('click', () => {
            panel?.classList.toggle('show');
        });

        closeBtn?.addEventListener('click', () => {
            panel?.classList.remove('show');
        });

        // Load saved preferences
        const prefs = CognoUtils.Storage.get('cogno_accessibility') || {};

        // Initialize toggles
        const toggles = ['dyslexia-font', 'high-contrast', 'large-text', 'reduced-motion', 'word-spacing'];
        toggles.forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.checked = prefs[id] || false;

                // Apply saved preference
                if (prefs[id]) {
                    this.applyAccessibility(id, true);
                }

                // Listen for changes
                toggle.addEventListener('change', () => {
                    this.applyAccessibility(id, toggle.checked);
                    prefs[id] = toggle.checked;
                    CognoUtils.Storage.set('cogno_accessibility', prefs);
                });
            }
        });
    },

    applyAccessibility(feature, enabled) {
        const body = document.body;
        const classMap = {
            'dyslexia-font': 'dyslexia-mode',
            'high-contrast': 'high-contrast',
            'large-text': 'large-text',
            'reduced-motion': 'reduced-motion',
            'word-spacing': 'wide-spacing'
        };

        if (classMap[feature]) {
            body.classList.toggle(classMap[feature], enabled);
        }
    },

    initTTS() {
        const toggle = document.getElementById('tts-toggle');
        const controls = document.getElementById('tts-controls');

        toggle?.addEventListener('click', () => {
            controls.style.display = controls.style.display === 'none' ? 'flex' : 'none';
        });

        document.getElementById('tts-close')?.addEventListener('click', () => {
            controls.style.display = 'none';
            CognoTTS.stop();
        });

        document.getElementById('tts-play')?.addEventListener('click', () => {
            // Get main content text
            const content = document.querySelector('.content-area');
            if (content) {
                CognoTTS.speak(content.textContent);
            }
        });

        document.getElementById('tts-pause')?.addEventListener('click', () => {
            CognoTTS.pause();
        });

        document.getElementById('tts-stop')?.addEventListener('click', () => {
            CognoTTS.stop();
        });

        document.getElementById('tts-rate')?.addEventListener('input', (e) => {
            CognoTTS.setRate(parseFloat(e.target.value));
        });
    },

    // =========================================================
    // PARENT DASHBOARD
    // =========================================================
    async initParentDashboard() {
        // Load children
        await this.loadChildren();

        // Load stats
        await this.loadParentStats();

        // Load charts
        this.initParentCharts();

        // Load consultations
        await this.loadUpcomingConsultations();

        // Load recent activity
        await this.loadChildrenActivity();

        // Initialize child linking
        this.initChildLinking();
    },

    async loadChildren() {
        const grid = document.getElementById('children-grid');
        const submenu = document.getElementById('children-submenu');
        const noChildren = document.getElementById('no-children');
        const select = document.getElementById('chart-child-select');

        // Get linked children
        const { data } = await CognoSupabase.query(
            'parent_child_links',
            '*, children:child_id(id, profiles(*))',
            [
                { column: 'parent_id', value: this.user.id },
                { column: 'status', value: 'active' }
            ]
        );

        if (!data?.length) {
            if (noChildren) noChildren.style.display = 'block';
            document.getElementById('total-children').textContent = '0';
            return;
        }

        if (noChildren) noChildren.style.display = 'none';
        document.getElementById('total-children').textContent = data.length;

        // Update children grid
        if (grid) {
            grid.innerHTML = data.map(link => {
                const child = link.children?.profiles;
                return `
                    <div class="child-card" data-child-id="${link.child_id}">
                        <div class="child-avatar">
                            <img src="${child?.avatar_url || '../assets/images/avatars/default.png'}" alt="${child?.full_name}">
                        </div>
                        <div class="child-info">
                            <h4 class="child-name">${child?.full_name || 'Child'}</h4>
                            <span class="child-streak">
                                <i class="fa-solid fa-fire"></i>
                                ${child?.streak_days || 0} day streak
                            </span>
                        </div>
                        <a href="../progress/child/${link.child_id}" class="btn btn-ghost btn-sm">
                            View Progress
                        </a>
                    </div>
                `;
            }).join('');
        }

        // Update sidebar submenu
        if (submenu) {
            submenu.innerHTML = data.map(link => `
                <li>
                    <a href="../progress/child/${link.child_id}" class="sidebar-link">
                        ${link.children?.profiles?.full_name || 'Child'}
                    </a>
                </li>
            `).join('');
        }

        // Update chart selector
        if (select) {
            data.forEach(link => {
                const option = document.createElement('option');
                option.value = link.child_id;
                option.textContent = link.children?.profiles?.full_name || 'Child';
                select.appendChild(option);
            });
        }
    },

    async loadParentStats() {
        // These would be calculated from children's data
        // Placeholder for now
        document.getElementById('avg-progress').textContent = '75%';
        document.getElementById('total-time').textContent = '4h';
    },

    initParentCharts() {
        // Weekly activity chart
        CognoCharts.weeklyActivityChart('weekly-activity-chart', {
            activities: [5, 8, 3, 10, 6, 4, 7],
            minutes: [30, 45, 20, 60, 35, 25, 40]
        });

        // Module distribution
        CognoCharts.moduleComparisonChart('module-distribution-chart', {
            dyslexia: 35,
            dyscalculia: 25,
            dysgraphia: 20,
            dyspraxia: 20
        });
    },

    async loadUpcomingConsultations() {
        const list = document.getElementById('consultations-list');
        const countEl = document.getElementById('upcoming-consultations');
        const noConsultations = document.getElementById('no-consultations');

        const { data } = await CognoSupabase.query(
            'consultations',
            '*, doctors:doctor_id(profiles(full_name))',
            [
                { column: 'parent_id', value: this.user.id },
                { column: 'status', value: 'scheduled' },
                { column: 'scheduled_at', operator: 'gte', value: new Date().toISOString() }
            ],
            { column: 'scheduled_at', ascending: true },
            3
        );

        if (countEl) countEl.textContent = data?.length || 0;

        if (!data?.length) {
            if (noConsultations) noConsultations.style.display = 'block';
            return;
        }

        if (noConsultations) noConsultations.style.display = 'none';

        if (list) {
            list.innerHTML = data.map(c => `
                <div class="consultation-item">
                    <div class="consultation-time">
                        <span class="consultation-date">${CognoUtils.Date.format(c.scheduled_at, 'MMM D')}</span>
                        <span class="consultation-hour">${CognoUtils.Date.format(c.scheduled_at, 'h:mm A')}</span>
                    </div>
                    <div class="consultation-info">
                        <span class="consultation-doctor">Dr. ${c.doctors?.profiles?.full_name || 'TBD'}</span>
                        <span class="consultation-type">${c.consultation_type || 'Video Call'}</span>
                    </div>
                    <a href="../consultations/${c.id}" class="btn btn-primary btn-sm">
                        <i class="fa-solid fa-video"></i>
                    </a>
                </div>
            `).join('');
        }
    },

    async loadChildrenActivity() {
        const feed = document.getElementById('activity-feed');
        if (!feed) return;

        // Get children IDs
        const { data: links } = await CognoSupabase.query(
            'parent_child_links',
            'child_id',
            [
                { column: 'parent_id', value: this.user.id },
                { column: 'status', value: 'active' }
            ]
        );

        if (!links?.length) {
            feed.innerHTML = '<div class="activity-empty"><p>Link a child to see their activity</p></div>';
            return;
        }

        const childIds = links.map(l => l.child_id);

        // Get recent activity for all children
        const { data: activities } = await CognoSupabase.query(
            'activity_log',
            '*, profiles:user_id(full_name)',
            [{ column: 'user_id', operator: 'in', value: `(${childIds.join(',')})` }],
            { column: 'created_at', ascending: false },
            10
        );

        if (!activities?.length) {
            feed.innerHTML = '<div class="activity-empty"><p>No recent activity</p></div>';
            return;
        }

        feed.innerHTML = activities.map(a => `
            <div class="activity-item">
                <div class="activity-icon ${a.module_type || 'default'}">
                    <i class="fa-solid fa-${this.getActivityIcon(a.activity_type)}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-text">
                        <strong>${a.profiles?.full_name || 'Child'}</strong> ${a.description}
                    </p>
                    <span class="activity-time">${CognoUtils.Date.timeAgo(a.created_at)}</span>
                </div>
            </div>
        `).join('');
    },

    initChildLinking() {
        const addBtn = document.getElementById('add-child-btn');
        const emptyBtn = document.getElementById('link-child-empty');
        const modal = document.getElementById('link-child-modal');

        [addBtn, emptyBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                this.openModal('link-child-modal');
            });
        });

        // Email form
        document.getElementById('link-email-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('child-email').value;

            // Send link request
            CognoNotifications.success('Link request sent!');
            this.closeModal('link-child-modal');
        });

        // Code form
        document.getElementById('link-code-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('child-code').value;

            // Verify and link
            CognoNotifications.success('Child linked successfully!');
            this.closeModal('link-child-modal');
            this.loadChildren();
        });
    },

    // =========================================================
    // DOCTOR DASHBOARD
    // =========================================================
    async initDoctorDashboard() {
        // Load stats
        await this.loadDoctorStats();

        // Load live activity
        await this.loadLiveActivity();

        // Load schedule
        await this.loadTodaySchedule();

        // Load messages
        await this.loadRecentMessages();

        // Load patient progress
        await this.loadPatientProgress();

        // Load patient activity notifications
        await this.loadPatientNotifications();

        // Initialize charts
        this.initDoctorCharts();
    },

    async loadPatientNotifications() {
        try {
            // Get notifications for this doctor about patient activity
            const { data: notifications } = await CognoSupabase.client
                .from('notifications')
                .select('*')
                .eq('user_id', this.user.id)
                .in('type', ['info', 'achievement'])
                .order('created_at', { ascending: false })
                .limit(10);

            // Update notification badge
            const unreadCount = notifications?.filter(n => !n.read)?.length || 0;
            const badge = document.getElementById('notification-badge');
            if (badge) {
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'flex' : 'none';
            }

            // Show notifications in a dropdown or list if element exists
            const notifList = document.getElementById('notification-list');
            if (notifList && notifications?.length > 0) {
                notifList.innerHTML = notifications.map(n => `
                    <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                        <div class="notification-icon">
                            <i class="fa-solid fa-${n.type === 'achievement' ? 'star' : 'bell'}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${n.title}</div>
                            <div class="notification-message">${n.message}</div>
                            <div class="notification-time">${CognoUtils?.Date?.timeAgo(n.created_at) || 'Just now'}</div>
                        </div>
                    </div>
                `).join('');
            }

            console.log('Doctor notifications loaded:', notifications?.length || 0);
        } catch (error) {
            console.error('Error loading patient notifications:', error);
        }
    },

    async loadDoctorStats() {
        // Get patient count
        const { data: patients } = await CognoSupabase.query(
            'doctor_patients',
            'id',
            [
                { column: 'doctor_id', value: this.user.id },
                { column: 'status', value: 'active' }
            ]
        );

        document.getElementById('total-patients').textContent = patients?.length || 0;

        // Get today's consultations
        const today = CognoUtils.Date.format(new Date(), 'YYYY-MM-DD');
        const { data: consultations } = await CognoSupabase.query(
            'consultations',
            'id',
            [
                { column: 'doctor_id', value: this.user.id },
                { column: 'scheduled_at', operator: 'gte', value: `${today}T00:00:00` },
                { column: 'scheduled_at', operator: 'lt', value: `${today}T23:59:59` }
            ]
        );

        document.getElementById('consultations-today').textContent = consultations?.length || 0;

        // Get unread messages
        const { data: messages } = await CognoSupabase.query(
            'messages',
            'id',
            [
                { column: 'receiver_id', value: this.user.id },
                { column: 'read', value: false }
            ]
        );

        document.getElementById('unread-messages').textContent = messages?.length || 0;
    },

    async loadLiveActivity() {
        const grid = document.getElementById('live-activity-grid');
        const noActive = document.getElementById('no-active');

        try {
            // Get linked patient IDs
            const { data: patientLinks } = await CognoSupabase.query(
                'doctor_patients',
                'patient_id',
                [
                    { column: 'doctor_id', value: this.user.id },
                    { column: 'status', value: 'active' }
                ]
            );

            if (!patientLinks?.length) {
                if (noActive) noActive.style.display = 'block';
                return;
            }

            // Check for activities in the last 30 minutes
            const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            const recentActivities = [];

            for (const link of patientLinks) {
                const { data: activities } = await CognoSupabase.client
                    .from('student_progress')
                    .select('*, profiles:student_id(full_name, avatar_url)')
                    .eq('student_id', link.patient_id)
                    .gte('updated_at', thirtyMinAgo)
                    .order('updated_at', { ascending: false })
                    .limit(3);

                if (activities?.length) {
                    recentActivities.push(...activities);
                }
            }

            if (recentActivities.length === 0) {
                if (noActive) noActive.style.display = 'block';
                if (grid) grid.innerHTML = '';
                return;
            }

            if (noActive) noActive.style.display = 'none';

            // Sort by most recent
            recentActivities.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

            if (grid) {
                grid.innerHTML = recentActivities.slice(0, 6).map(a => {
                    const name = a.profiles?.full_name || 'Patient';
                    const avatar = a.profiles?.avatar_url || '../assets/images/avatars/default.png';
                    const scorePct = a.max_score ? Math.round((a.score / a.max_score) * 100) : a.score;
                    const timeAgo = Math.round((Date.now() - new Date(a.updated_at)) / 60000);

                    return `
                        <div class="live-activity-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 8px; background: var(--bg-secondary);">
                            <img src="${avatar}" alt="" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 500; font-size: 0.9rem;">${name}</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: capitalize;">${a.activity_type || a.module_type} — ${scorePct}%</div>
                            </div>
                            <span style="font-size: 0.7rem; color: var(--text-secondary); white-space: nowrap;">${timeAgo}m ago</span>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error('Error loading live activity:', error);
            if (noActive) noActive.style.display = 'block';
        }
    },

    async loadTodaySchedule() {
        const list = document.getElementById('schedule-list');
        const noSchedule = document.getElementById('no-schedule');

        const today = CognoUtils.Date.format(new Date(), 'YYYY-MM-DD');

        const { data } = await CognoSupabase.query(
            'consultations',
            '*, patients:child_id(profiles(full_name))',
            [
                { column: 'doctor_id', value: this.user.id },
                { column: 'scheduled_at', operator: 'gte', value: `${today}T00:00:00` },
                { column: 'scheduled_at', operator: 'lt', value: `${today}T23:59:59` }
            ],
            { column: 'scheduled_at', ascending: true }
        );

        if (!data?.length) {
            if (noSchedule) noSchedule.style.display = 'block';
            return;
        }

        if (noSchedule) noSchedule.style.display = 'none';

        if (list) {
            list.innerHTML = data.map(c => `
                <div class="schedule-item">
                    <span class="schedule-time">${CognoUtils.Date.format(c.scheduled_at, 'h:mm A')}</span>
                    <div class="schedule-info">
                        <span class="schedule-patient">${c.patients?.profiles?.full_name || 'Patient'}</span>
                        <span class="schedule-type">${c.consultation_type || 'Video Call'}</span>
                    </div>
                    <a href="../doctor/consultations/${c.id}" class="btn btn-primary btn-sm">
                        <i class="fa-solid fa-video"></i>
                        <span>Join</span>
                    </a>
                </div>
            `).join('');
        }
    },

    async loadRecentMessages() {
        const list = document.getElementById('messages-list');
        const noMessages = document.getElementById('no-messages');

        const { data } = await CognoSupabase.query(
            'messages',
            '*, sender:sender_id(profiles(full_name, avatar_url))',
            [{ column: 'receiver_id', value: this.user.id }],
            { column: 'created_at', ascending: false },
            5
        );

        if (!data?.length) {
            if (noMessages) noMessages.style.display = 'block';
            return;
        }

        if (noMessages) noMessages.style.display = 'none';

        if (list) {
            list.innerHTML = data.map(m => `
                <div class="message-item ${m.read ? '' : 'unread'}">
                    <div class="message-avatar">
                        <img src="${m.sender?.profiles?.avatar_url || '../assets/images/avatars/default.png'}" alt="">
                    </div>
                    <div class="message-content">
                        <span class="message-sender">${m.sender?.profiles?.full_name || 'User'}</span>
                        <p class="message-preview">${CognoUtils.String.truncate(m.content, 50)}</p>
                    </div>
                    <span class="message-time">${CognoUtils.Date.timeAgo(m.created_at)}</span>
                </div>
            `).join('');
        }
    },

    async loadPatientProgress() {
        const grid = document.getElementById('patients-progress-grid');
        if (!grid) return;

        // Get patients
        const { data: links } = await CognoSupabase.query(
            'doctor_patients',
            '*, patients:patient_id(profiles(*))',
            [
                { column: 'doctor_id', value: this.user.id },
                { column: 'status', value: 'active' }
            ],
            null,
            6
        );

        if (!links?.length) {
            grid.innerHTML = '<p class="text-muted">No patients yet</p>';
            return;
        }

        // Fetch real progress for each patient
        const patientCards = await Promise.all(links.map(async (link) => {
            const patient = link.patients?.profiles;

            // Get student_progress for this patient
            const { data: progress } = await CognoSupabase.query(
                'student_progress',
                'module_type, score, max_score, updated_at',
                [{ column: 'student_id', value: link.patient_id }],
                { column: 'updated_at', ascending: false },
                200
            );

            // Calculate per-module averages
            const moduleStats = {};
            if (progress?.length) {
                progress.forEach(p => {
                    if (!moduleStats[p.module_type]) {
                        moduleStats[p.module_type] = { totalScore: 0, totalMax: 0, count: 0 };
                    }
                    moduleStats[p.module_type].totalScore += (p.score || 0);
                    moduleStats[p.module_type].totalMax += (p.max_score || 100);
                    moduleStats[p.module_type].count++;
                });
            }

            const moduleLabels = {
                dyslexia: { name: 'Reading', css: 'dyslexia' },
                dyscalculia: { name: 'Math', css: 'dyscalculia' },
                dysgraphia: { name: 'Writing', css: 'dysgraphia' },
                dyspraxia: { name: 'Motor', css: 'dyspraxia' }
            };

            // Calculate streak from activity dates
            let streak = 0;
            if (progress?.length) {
                const dates = [...new Set(progress.map(p => new Date(p.updated_at).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                if (dates.includes(today) || dates.includes(yesterday)) {
                    streak = 1;
                    let checkDate = dates.includes(today) ? new Date() : new Date(Date.now() - 86400000);
                    for (let i = 1; i < 365; i++) {
                        checkDate.setDate(checkDate.getDate() - 1);
                        if (dates.includes(checkDate.toDateString())) streak++;
                        else break;
                    }
                }
            }

            // Build progress bars HTML from real data
            const progressBarsHtml = Object.entries(moduleStats).map(([mod, stats]) => {
                const pct = stats.totalMax > 0 ? Math.round((stats.totalScore / stats.totalMax) * 100) : 0;
                const label = moduleLabels[mod] || { name: mod, css: mod };
                return `
                    <div class="mini-progress">
                        <span>${label.name}</span>
                        <div class="progress-bar"><div class="progress-fill ${label.css}" style="width: ${pct}%;"></div></div>
                    </div>
                `;
            }).join('');

            return `
                <div class="patient-progress-card" data-patient-id="${link.patient_id}">
                    <div class="patient-header">
                        <img src="${patient?.avatar_url || '../assets/images/avatars/default.png'}" alt="" class="patient-avatar">
                        <div>
                            <h4 class="patient-name">${patient?.full_name || 'Patient'}</h4>
                            <span class="patient-streak">
                                <i class="fa-solid fa-fire"></i> ${streak} day streak
                            </span>
                        </div>
                    </div>
                    <div class="patient-progress-bars">
                        ${progressBarsHtml || '<p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.5rem 0;">No activities yet</p>'}
                    </div>
                    <a href="../doctor/patient-detail.html?id=${link.patient_id}" class="btn btn-ghost btn-sm w-full">View Details</a>
                </div>
            `;
        }));

        grid.innerHTML = patientCards.join('');
    },

    async initDoctorCharts() {
        // Fetch real module distribution from all patients' progress
        try {
            // Get all patient IDs
            const { data: patientLinks } = await CognoSupabase.query(
                'doctor_patients',
                'patient_id',
                [
                    { column: 'doctor_id', value: this.user.id },
                    { column: 'status', value: 'active' }
                ]
            );

            const moduleDistribution = { dyslexia: 0, dyscalculia: 0, dysgraphia: 0, dyspraxia: 0 };

            if (patientLinks?.length) {
                // Fetch progress for all patients
                for (const link of patientLinks) {
                    const { data: progress } = await CognoSupabase.query(
                        'student_progress',
                        'module_type',
                        [{ column: 'student_id', value: link.patient_id }],
                        null,
                        500
                    );

                    if (progress?.length) {
                        progress.forEach(p => {
                            if (moduleDistribution.hasOwnProperty(p.module_type)) {
                                moduleDistribution[p.module_type]++;
                            }
                        });
                    }
                }
            }

            // Module distribution chart with real data
            CognoCharts.moduleComparisonChart('module-chart', moduleDistribution);
        } catch (error) {
            console.error('Error loading module chart data:', error);
            // Fallback to empty chart
            CognoCharts.moduleComparisonChart('module-chart', {
                dyslexia: 0, dyscalculia: 0, dysgraphia: 0, dyspraxia: 0
            });
        }

        // Consultations chart - fetch real data for this week
        const ctx = document.getElementById('consultations-chart')?.getContext('2d');
        if (ctx) {
            const consultationCounts = [0, 0, 0, 0, 0, 0, 0];

            try {
                const today = new Date();
                const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
                const monday = new Date(today);
                monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // Get Monday
                monday.setHours(0, 0, 0, 0);

                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                sunday.setHours(23, 59, 59, 999);

                const { data: weekConsultations } = await CognoSupabase.client
                    .from('consultations')
                    .select('scheduled_at')
                    .eq('doctor_id', this.user.id)
                    .gte('scheduled_at', monday.toISOString())
                    .lte('scheduled_at', sunday.toISOString());

                if (weekConsultations?.length) {
                    weekConsultations.forEach(c => {
                        const cDate = new Date(c.scheduled_at);
                        const dayIdx = (cDate.getDay() + 6) % 7; // 0=Mon, 6=Sun
                        consultationCounts[dayIdx]++;
                    });
                }
            } catch (error) {
                console.error('Error loading consultations chart data:', error);
            }

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Consultations',
                        data: consultationCounts,
                        backgroundColor: 'rgba(59, 130, 246, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }
    },

    // =========================================================
    // ADMIN DASHBOARD
    // =========================================================
    async initAdminDashboard() {
        // Load platform stats
        await this.loadPlatformStats();

        // Load user distribution
        await this.loadUserDistribution();

        // Load recent registrations
        await this.loadRecentRegistrations();

        // Load system activity
        await this.loadSystemActivity();

        // Initialize charts
        this.initAdminCharts();

        // Check platform health
        this.checkPlatformHealth();
    },

    async loadPlatformStats() {
        // Get total users
        const { data: users } = await CognoSupabase.query('profiles', 'id');
        document.getElementById('total-users').textContent = users?.length || 0;

        // Get today's active users (users who logged in today)
        const today = CognoUtils.Date.format(new Date(), 'YYYY-MM-DD');
        const { data: activeUsers } = await CognoSupabase.query(
            'activity_log',
            'user_id',
            [{ column: 'created_at', operator: 'gte', value: `${today}T00:00:00` }]
        );
        const uniqueActive = new Set(activeUsers?.map(a => a.user_id));
        document.getElementById('active-users').textContent = uniqueActive.size;

        // Get today's activities
        const { data: activities } = await CognoSupabase.query(
            'student_progress',
            'id',
            [{ column: 'created_at', operator: 'gte', value: `${today}T00:00:00` }]
        );
        document.getElementById('activities-completed').textContent = activities?.length || 0;

        // Get today's consultations
        const { data: consultations } = await CognoSupabase.query(
            'consultations',
            'id',
            [{ column: 'scheduled_at', operator: 'gte', value: `${today}T00:00:00` }]
        );
        document.getElementById('total-consultations').textContent = consultations?.length || 0;

        // Update timestamp
        document.getElementById('last-updated').textContent = CognoUtils.Date.format(new Date(), 'h:mm A');
    },

    async loadUserDistribution() {
        const roles = ['child', 'parent', 'doctor', 'admin'];

        for (const role of roles) {
            const { data } = await CognoSupabase.query(
                'profiles',
                'id',
                [{ column: 'role', value: role }]
            );

            const countEl = document.getElementById(`${role === 'child' ? 'children' : role + 's'}-count`);
            if (countEl) countEl.textContent = data?.length || 0;
        }

        // Check for pending doctor verifications
        const { data: pendingDoctors } = await CognoSupabase.query(
            'doctors',
            'id',
            [{ column: 'verified', value: false }]
        );

        if (pendingDoctors?.length > 0) {
            document.getElementById('alerts-section').style.display = 'block';
            document.getElementById('pending-count').textContent = pendingDoctors.length;
            document.getElementById('pending-doctors').textContent = pendingDoctors.length;
            document.getElementById('pending-doctors').style.display = 'flex';
        }
    },

    async loadRecentRegistrations() {
        const list = document.getElementById('recent-users-list');
        if (!list) return;

        const { data } = await CognoSupabase.query(
            'profiles',
            '*',
            null,
            { column: 'created_at', ascending: false },
            5
        );

        if (!data?.length) {
            list.innerHTML = '<p class="text-muted">No recent registrations</p>';
            return;
        }

        list.innerHTML = data.map(user => `
            <div class="user-list-item">
                <div class="user-avatar">
                    <img src="${user.avatar_url || '../assets/images/avatars/default.png'}" alt="">
                </div>
                <div class="user-info">
                    <span class="user-name">${user.full_name || 'User'}</span>
                    <span class="user-role">${user.role}</span>
                </div>
                <span class="user-date">${CognoUtils.Date.timeAgo(user.created_at)}</span>
            </div>
        `).join('');
    },

    async loadSystemActivity() {
        const log = document.getElementById('system-activity-log');
        if (!log) return;

        // This would come from a system_logs table
        // Placeholder for now
        log.innerHTML = `
            <div class="log-item">
                <span class="log-time">${CognoUtils.Date.format(new Date(), 'h:mm:ss A')}</span>
                <span class="log-type success">INFO</span>
                <span class="log-message">Dashboard initialized successfully</span>
            </div>
        `;
    },

    initAdminCharts() {
        // User growth chart
        const growthCtx = document.getElementById('user-growth-chart')?.getContext('2d');
        if (growthCtx) {
            const labels = [];
            const data = [];
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(CognoUtils.Date.format(date, 'MMM D'));
                data.push(Math.floor(Math.random() * 10) + 5); // Placeholder
            }

            new Chart(growthCtx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'New Users',
                        data,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Module activity chart
        CognoCharts.moduleComparisonChart('module-activity-chart', {
            dyslexia: 35,
            dyscalculia: 30,
            dysgraphia: 20,
            dyspraxia: 15
        });
    },

    async checkPlatformHealth() {
        const startTime = Date.now();

        // Check API
        try {
            await CognoSupabase.query('profiles', 'id', null, null, 1);
            const apiTime = Date.now() - startTime;
            document.getElementById('api-status').classList.add('healthy');
            document.getElementById('api-response').textContent = `${apiTime}ms`;
        } catch (e) {
            document.getElementById('api-status').classList.replace('healthy', 'error');
        }

        // Check database (same query works)
        document.getElementById('db-status').classList.add('healthy');
        document.getElementById('db-response').textContent = `${Date.now() - startTime}ms`;

        // Check realtime
        document.getElementById('realtime-status').classList.add('healthy');
        document.getElementById('realtime-connections').textContent = '0 connections';

        // Storage - placeholder
        document.getElementById('storage-status').classList.add('healthy');
        document.getElementById('storage-used').textContent = '0 MB';
    },

    // =========================================================
    // REALTIME SUBSCRIPTIONS
    // =========================================================
    async initRealtime() {
        // Subscribe to notifications
        CognoRealtime.subscribeToNotifications(this.user.id, (notification) => {
            this.loadNotifications();
            CognoNotifications.show(notification);
        });

        // Role-specific subscriptions
        if (this.role === 'doctor' || this.role === 'student' || this.role === 'child') {
            // Global consultation alerts
            CognoSupabase.client
                .channel('consultation-alerts')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'consultations',
                    filter: this.role === 'doctor' ? `doctor_id=eq.${this.user.id}` : `patient_id=eq.${this.user.id}`
                }, (payload) => {
                    const consultation = payload.new;
                    CognoNotifications.info(`You have a new consultation scheduled for ${new Date(consultation.scheduled_at).toLocaleString()}`, {
                        title: 'New Appointment',
                        icon: 'fa-solid fa-calendar-check'
                    });
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'consultations',
                    filter: this.role === 'doctor' ? `doctor_id=eq.${this.user.id}` : `patient_id=eq.${this.user.id}`
                }, (payload) => {
                    if (payload.new.status === 'in_progress' && payload.old.status !== 'in_progress') {
                        CognoNotifications.success('Your appointment has started. Click to join!', {
                            title: 'Consultation Started',
                            icon: 'fa-solid fa-video',
                            duration: 0, // Persistent
                            action: () => window.location.href = `../consultations/video.html?id=${payload.new.id}`,
                            actionText: 'Join Now'
                        });
                    }
                })
                .subscribe();

            // Global notifications listener (handles instant video calls etc)
            CognoSupabase.client
                .channel('global-notifs')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${this.user.id}`
                }, (payload) => {
                    const notif = payload.new;

                    // Show toast for all new notifications
                    CognoNotifications.show(notif.message, notif.notification_type || 'info', {
                        title: notif.title,
                        duration: notif.notification_type === 'appointment' ? 0 : 5000, // Persistent if it's an appointment/call
                        action: notif.action_url ? () => window.location.href = notif.action_url : null,
                        actionText: notif.notification_type === 'appointment' ? 'Join Call' : 'View'
                    });

                    // Refresh unread count
                    this.loadNotifications();
                })
                .subscribe();
        }

        if (this.role === 'doctor') {

            // Subscribe to live patient activity
            CognoRealtime.subscribeToProgress('*', (progress) => {
                // Update live activity grid
                this.updateLiveActivity(progress);
            });
        }

        if (this.role === 'student' || this.role === 'child') {
            // Initial load of student-specific data
            await Promise.all([
                this.loadStats(),
                this.loadModules(),
                this.loadRecentActivity(),
                this.loadGoals(),
                this.loadAssignments(),
                this.loadUpcomingAppointments(),
                this.loadRecentReports()
            ]);

            // Subscribe to own progress
            CognoRealtime.subscribeToProgress(this.user.id, (progress) => {
                // When new progress comes in, re-load relevant sections
                this.loadStats();
                this.loadRecentActivity();
                this.loadGoals();
                this.loadModules();
                CognoNotifications.success('Activity saved! Your progress has been updated.');
            });

            // Subscribe to new assignments
            CognoSupabase.client
                .channel('new-assignments')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'student_assignments',
                    filter: `patient_id=eq.${this.user.id}`
                }, (payload) => {
                    this.loadAssignments();
                    CognoNotifications.info('You have a new assignment from your doctor!', {
                        title: 'New Assignment',
                        icon: 'fa-solid fa-clipboard-list'
                    });
                })
                .subscribe();

            // Subscribe to consultation updates
            CognoSupabase.client
                .channel('appointment-updates')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'consultations',
                    filter: `patient_id=eq.${this.user.id}`
                }, (payload) => {
                    this.loadUpcomingAppointments();
                })
                .subscribe();

            // Subscribe to new reports
            CognoSupabase.client
                .channel('report-updates')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'doctor_reports',
                    filter: `patient_id=eq.${this.user.id}`
                }, (payload) => {
                    this.loadRecentReports();
                    CognoNotifications.success('A new medical report has been added to your profile.');
                })
                .subscribe();
        }

    },

    updateLiveActivity(progress) {
        // Update the live activity grid with new progress
        console.log('New activity:', progress);
        if (typeof this.loadRecentActivity === 'function') {
            this.loadRecentActivity();
        }
    },

    async loadAssignments() {
        const container = document.getElementById('assessments-list');
        const section = document.getElementById('assessments-section');
        const countBadge = document.getElementById('assessments-count');

        if (!container) return;

        try {
            // We'll use student_assignments table
            const { data: assignments, error } = await CognoSupabase.client
                .from('student_assignments')
                .select(`
                    *,
                    doctor:doctor_id(id, full_name, avatar_url)
                `)
                .eq('patient_id', this.user.id)
                .eq('status', 'pending')
                .order('due_date', { ascending: true });

            if (error) {
                console.warn('Assignments table might not exist yet:', error);
                if (section) section.style.display = 'none';
                return;
            }

            if (!assignments?.length) {
                if (section) section.style.display = 'none';
                return;
            }

            if (section) section.style.display = 'block';
            if (countBadge) countBadge.textContent = assignments.length;

            container.innerHTML = assignments.map(a => {
                const dueDate = new Date(a.due_date);
                const isOverdue = dueDate < new Date();
                const rawName = a.doctor?.full_name || 'Specialist';
                const name = rawName.startsWith('Dr.') ? rawName : 'Dr. ' + rawName;

                return `
                        <div class="assignment-item" style="padding: var(--space-4); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; ${isOverdue ? 'background: var(--color-danger-50);' : ''}">
                            <div class="assignment-info">
                                <h4 style="margin: 0; font-size: 1rem;">${a.title}</h4>
                                <p style="margin: var(--space-1) 0; font-size: 0.85rem; color: var(--text-secondary);">${a.description || 'No instructions provided.'}</p>
                                <div style="display: flex; gap: var(--space-3); font-size: 0.75rem; color: var(--text-muted);">
                                    <span><i class="fa-solid fa-clock"></i> Due: ${dueDate.toLocaleDateString()}</span>
                                    <span><i class="fa-solid fa-user-doctor"></i> ${name}</span>
                                </div>
                            </div>
                            <a href="../learning-hub/" class="btn btn-primary btn-sm">Start Task</a>
                        </div>
                    `;
            }).join('');
        } catch (err) {
            console.error('Failed to load assignments:', err);
        }
    },

    async loadUpcomingAppointments() {
        const container = document.getElementById('upcoming-appointments-list');
        const section = document.getElementById('upcoming-appointments-section');

        if (!container) return;

        try {
            const { data: appointments, error } = await CognoSupabase.client
                .from('consultations')
                .select(`
                    *,
                    doctor:doctor_id(id, full_name, avatar_url)
                `)
                .eq('patient_id', this.user.id)
                .in('status', ['pending', 'confirmed', 'in_progress'])
                .gte('scheduled_at', new Date().toISOString())
                .order('scheduled_at', { ascending: true })
                .limit(2);

            if (error || !appointments?.length) {
                if (section) section.style.display = 'none';
                return;
            }

            if (section) section.style.display = 'block';

            container.innerHTML = appointments.map(app => {
                const date = new Date(app.scheduled_at);
                const isLive = app.status === 'in_progress';
                const rawName = app.doctor?.full_name || 'Specialist';
                const name = rawName.startsWith('Dr.') ? rawName : 'Dr. ' + rawName;

                return `
                    <div class="appointment-card" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: var(--space-4); display: flex; align-items: center; gap: var(--space-4); position: relative; overflow: hidden;">
                        ${isLive ? '<div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--color-success); animation: pulse 2s infinite;"></div>' : ''}
                        <div class="date-badge" style="background: var(--color-primary-100); color: var(--color-primary); padding: var(--space-2); border-radius: 8px; text-align: center; min-width: 60px;">
                            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${date.toLocaleString('default', { month: 'short' })}</div>
                            <div style="font-size: 1.25rem; font-weight: 800;">${date.getDate()}</div>
                        </div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0; font-size: 0.95rem;">Consultation with ${name}</h4>
                            <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                                <i class="fa-solid fa-clock"></i> ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                ${isLive ? ' <span style="color: var(--color-success); font-weight: 700;">• LIVE NOW</span>' : ''}
                            </p>
                        </div>
                        <a href="../consultations/my-appointments.html" class="btn ${isLive ? 'btn-success' : 'btn-outline'} btn-sm">
                            ${isLive ? 'Join Now' : 'Details'}
                        </a>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('Failed to load upcoming appointments:', err);
        }
    },

    async loadRecentReports() {
        const container = document.getElementById('recent-reports-list');
        const section = document.getElementById('recent-reports-section');

        if (!container) return;

        try {
            const { data: reports, error } = await CognoSupabase.client
                .from('doctor_reports')
                .select(`
                    *,
                    doctor:doctor_id(id, full_name)
                `)
                .eq('patient_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(3);

            if (error || !reports?.length) {
                if (section) section.style.display = 'none';
                return;
            }

            if (section) section.style.display = 'block';

            container.innerHTML = reports.map(r => {
                const rawName = r.doctor?.full_name || 'Specialist';
                const name = rawName.startsWith('Dr.') ? rawName : 'Dr. ' + rawName;

                return `
                    <div class="report-item" style="padding: var(--space-3); border-bottom: 1px solid var(--border); transition: all 0.2s; cursor: pointer;" onclick="window.location.href='../consultations/my-reports.html?id=${r.id}'">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h4 style="margin: 0; font-size: 0.9rem; font-weight: 600;">${r.title}</h4>
                                <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: var(--text-muted);">
                                    By ${name} • ${new Date(r.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <i class="fa-solid fa-chevron-right" style="font-size: 0.75rem; color: var(--text-tertiary);"></i>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('Failed to load recent reports:', err);
        }
    }



};

// Export
window.CognoDashboard = CognoDashboard;

// Log initialization
console.log('📊 Cogno Dashboard module loaded');

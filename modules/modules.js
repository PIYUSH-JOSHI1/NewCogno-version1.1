/**
 * Cogno Solution - Modules Handler
 * 
 * Shared JavaScript for all learning module pages.
 * Handles common functionality like navigation, progress tracking,
 * and module-specific features.
 */

const CognoModules = {
    currentModule: null,
    user: null,
    moduleProgress: null,

    // Module configuration
    moduleConfig: {
        dyslexia: {
            name: 'Reading & Words',
            color: 'var(--color-dyslexia)',
            icon: 'fa-book-open',
            activities: [
                { id: 'text-reader', name: 'Text Reader', path: 'reader.html' },
                { id: 'text-simplifier', name: 'Text Simplifier', path: 'simplify.html' },
                { id: 'letter-match', name: 'Letter Match', path: 'letter-match.html' },
                { id: 'word-builder', name: 'Word Builder', path: 'word-builder.html' },
                { id: 'sight-words', name: 'Sight Words', path: 'sight-words.html' },
                { id: 'rhyme-time', name: 'Rhyme Time', path: 'rhyme-time.html' },
                { id: 'spelling-bee', name: 'Spelling Bee', path: 'spelling-bee.html' },
                { id: 'word-scramble', name: 'Word Scramble', path: 'word-scramble.html' }
            ]
        },
        dyscalculia: {
            name: 'Numbers & Math',
            color: 'var(--color-dyscalculia)',
            icon: 'fa-calculator',
            activities: [
                { id: 'number-line', name: 'Number Line', path: 'number-line.html' },
                { id: 'counting', name: 'Counting Practice', path: 'counting.html' },
                { id: 'number-match', name: 'Number Match', path: 'number-match.html' },
                { id: 'addition', name: 'Addition', path: 'addition.html' },
                { id: 'subtraction', name: 'Subtraction', path: 'subtraction.html' },
                { id: 'multiplication', name: 'Multiplication', path: 'multiplication.html' },
                { id: 'division', name: 'Division', path: 'division.html' },
                { id: 'math-pop', name: 'Math Pop', path: 'math-pop.html' },
                { id: 'number-puzzle', name: 'Number Puzzles', path: 'number-puzzle.html' }
            ]
        },
        dysgraphia: {
            name: 'Writing Practice',
            color: 'var(--color-dysgraphia)',
            icon: 'fa-pen',
            activities: [
                { id: 'letter-tracing', name: 'Letter Tracing', path: 'letter-tracing.html' },
                { id: 'letter-formation', name: 'Letter Formation', path: 'letter-formation.html' },
                { id: 'alphabet-practice', name: 'Alphabet Practice', path: 'alphabet-practice.html' },
                { id: 'word-tracing', name: 'Word Tracing', path: 'word-tracing.html' },
                { id: 'spelling-write', name: 'Spelling Write', path: 'spelling-write.html' },
                { id: 'copy-practice', name: 'Copy Practice', path: 'copy-practice.html' },
                { id: 'free-draw', name: 'Free Draw', path: 'free-draw.html' },
                { id: 'shape-tracing', name: 'Shape Tracing', path: 'shape-tracing.html' },
                { id: 'sentence-write', name: 'Sentence Writing', path: 'sentence-write.html' }
            ]
        },
        dyspraxia: {
            name: 'Movement Games',
            color: 'var(--color-dyspraxia)',
            icon: 'fa-person-running',
            requiresCamera: true,
            activities: [
                { id: 'balloon-pop', name: 'Balloon Pop', path: 'balloon-pop.html', camera: true },
                { id: 'catch-stars', name: 'Catch the Stars', path: 'catch-stars.html', camera: true },
                { id: 'mirror-me', name: 'Mirror Me', path: 'mirror-me.html', camera: true },
                { id: 'freeze-dance', name: 'Freeze Dance', path: 'freeze-dance.html', camera: true },
                { id: 'body-movement', name: 'Movement Prep', path: 'body-movement.html', camera: false },
                { id: 'tightrope-walk', name: 'Tightrope Walk', path: 'tightrope-walk.html', camera: true },
                { id: 'obstacle-course', name: 'Obstacle Course', path: 'obstacle-course.html', camera: true },
                { id: 'balance-beam', name: 'Balance Beam', path: 'balance-beam.html', camera: true },
                { id: 'balance', name: 'Balance Master', path: 'balance.html', camera: false },
                { id: 'finger-tap', name: 'Finger Tap', path: 'finger-tap.html', camera: false },
                { id: 'drag-drop', name: 'Drag & Drop', path: 'drag-drop.html', camera: false },
                { id: 'track-path', name: 'Track Path', path: 'track-path.html', camera: false },
                { id: 'rhythm-tap', name: 'Rhythm Tap', path: 'rhythm-tap.html', camera: false },
                { id: 'tapping-sequence', name: 'Sequence Tap', path: 'tapping-sequence.html', camera: false },
                { id: 'hand-exercises', name: 'Hand Exercises', path: 'hand-exercises.html', camera: false },
                { id: 'mirror-moves', name: 'Mirror Moves', path: 'mirror-moves.html', camera: false },
                { id: 'click-sequence', name: 'Click Sequence', path: 'click-sequence.html', camera: false },
                { id: 'catch-objects', name: 'Catch Objects', path: 'catch-objects.html', camera: false },
                { id: 'drag-targets', name: 'Drag Targets', path: 'drag-targets.html', camera: false }
            ]
        }
    },

    /**
     * Initialize module page
     */
    async init(moduleName) {
        this.currentModule = moduleName;
        console.log(`[CognoModules] Initializing ${moduleName} module`);

        // Initialize common features
        this.initSidebar();
        this.initDropdowns();
        this.initDarkMode();
        this.initAccessibility();
        this.initTTS();

        // Check authentication
        try {
            const session = await CognoSupabase.getSession();
            if (!session) {
                window.location.href = CognoPaths.auth.login();
                return;
            }

            this.user = session.user;

            // Update user display in navbar
            this.updateUserDisplay();

            // Load module progress
            await this.loadModuleProgress();

            // Update stats display
            this.updateStatsDisplay();

            // Subscribe to realtime updates
            this.subscribeToProgress();

            // Log module visit
            await this.logModuleVisit();

        } catch (error) {
            console.error('[CognoModules] Init error:', error);
            CognoNotifications?.toast?.error('Failed to load module data');
        }
    },

    /**
     * Update user display in navbar
     */
    updateUserDisplay() {
        const userNameEl = document.getElementById('user-name');
        const userAvatarImg = document.getElementById('user-avatar-img');

        if (this.user && userNameEl) {
            const profile = this.user.user_metadata;
            userNameEl.textContent = profile?.full_name || this.user.email?.split('@')[0] || 'User';
        }

        if (this.user && userAvatarImg) {
            const profile = this.user.user_metadata;
            if (profile?.avatar_url) {
                userAvatarImg.src = profile.avatar_url;
            }
        }
    },

    /**
     * Initialize dropdowns
     */
    initDropdowns() {
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');

        // User menu dropdown toggle
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', () => {
                userDropdown.classList.toggle('show');
            });
        }

        // Logout functionality
        const dropdownLogout = document.getElementById('dropdown-logout');
        const logoutBtn = document.getElementById('logout-btn');

        const handleLogout = async () => {
            await CognoSupabase.signOut();
            window.location.href = CognoPaths?.auth?.login() || '../../auth/login.html';
        };

        dropdownLogout?.addEventListener('click', handleLogout);
        logoutBtn?.addEventListener('click', handleLogout);

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    },

    /**
     * Initialize sidebar functionality
     */
    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebarClose = document.getElementById('sidebar-close');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        if (sidebarClose && sidebar) {
            sidebarClose.addEventListener('click', () => {
                sidebar.classList.remove('open');
            });
        }

        // Close sidebar on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (sidebar && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !sidebarToggle?.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    },

    /**
     * Initialize dark mode
     */
    initDarkMode() {
        const toggles = document.querySelectorAll('#dark-mode-toggle, .dark-mode-toggle');

        // Check saved preference or system preference
        const savedTheme = localStorage.getItem('cogno-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

        if (isDark) {
            document.body.classList.add('dark-mode');
            toggles.forEach(toggle => {
                toggle.innerHTML = '<i class="fa-solid fa-sun" title="Light Mode"></i>';
            });
        }

        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const currentlyDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('cogno-theme', currentlyDark ? 'dark' : 'light');

                // Update all toggles on the page
                document.querySelectorAll('#dark-mode-toggle, .dark-mode-toggle').forEach(t => {
                    t.innerHTML = currentlyDark
                        ? '<i class="fa-solid fa-sun" title="Light Mode"></i>'
                        : '<i class="fa-solid fa-moon" title="Dark Mode"></i>';
                });
            });
        });
    },

    /**
     * Initialize accessibility features
     */
    initAccessibility() {
        const accessibilityBtn = document.getElementById('accessibility-btn');

        // Load saved preferences
        const preferences = CognoUtils?.StorageUtils?.get('cogno-accessibility') || {};

        if (preferences.dyslexiaMode) {
            document.body.classList.add('dyslexia-mode');
        }
        if (preferences.highContrast) {
            document.body.classList.add('high-contrast');
        }
        if (preferences.largeText) {
            document.body.classList.add('large-text');
        }
        if (preferences.reducedMotion) {
            document.body.classList.add('reduced-motion');
        }

        // Accessibility panel toggle (if exists)
        if (accessibilityBtn) {
            accessibilityBtn.addEventListener('click', () => {
                this.toggleAccessibilityPanel();
            });
        }
    },

    /**
     * Toggle accessibility panel
     */
    toggleAccessibilityPanel() {
        // Check if panel exists, if not create it
        let panel = document.getElementById('accessibility-panel');

        if (!panel) {
            panel = this.createAccessibilityPanel();
            document.body.appendChild(panel);
        }

        panel.classList.toggle('open');
    },

    /**
     * Create accessibility panel
     */
    createAccessibilityPanel() {
        const preferences = CognoUtils?.StorageUtils?.get('cogno-accessibility') || {};

        const panel = document.createElement('div');
        panel.id = 'accessibility-panel';
        panel.className = 'accessibility-panel';
        panel.innerHTML = `
            <div class="accessibility-panel-header">
                <h3>Accessibility</h3>
                <button class="btn btn-ghost btn-icon" id="close-accessibility">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="accessibility-panel-body">
                <label class="accessibility-option">
                    <input type="checkbox" id="dyslexia-mode" ${preferences.dyslexiaMode ? 'checked' : ''}>
                    <span>OpenDyslexic Font</span>
                </label>
                <label class="accessibility-option">
                    <input type="checkbox" id="high-contrast" ${preferences.highContrast ? 'checked' : ''}>
                    <span>High Contrast</span>
                </label>
                <label class="accessibility-option">
                    <input type="checkbox" id="large-text" ${preferences.largeText ? 'checked' : ''}>
                    <span>Large Text</span>
                </label>
                <label class="accessibility-option">
                    <input type="checkbox" id="reduced-motion" ${preferences.reducedMotion ? 'checked' : ''}>
                    <span>Reduced Motion</span>
                </label>
            </div>
        `;

        // Add event listeners
        setTimeout(() => {
            document.getElementById('close-accessibility')?.addEventListener('click', () => {
                panel.classList.remove('open');
            });

            document.getElementById('dyslexia-mode')?.addEventListener('change', (e) => {
                this.updateAccessibility('dyslexiaMode', e.target.checked, 'dyslexia-mode');
            });

            document.getElementById('high-contrast')?.addEventListener('change', (e) => {
                this.updateAccessibility('highContrast', e.target.checked, 'high-contrast');
            });

            document.getElementById('large-text')?.addEventListener('change', (e) => {
                this.updateAccessibility('largeText', e.target.checked, 'large-text');
            });

            document.getElementById('reduced-motion')?.addEventListener('change', (e) => {
                this.updateAccessibility('reducedMotion', e.target.checked, 'reduced-motion');
            });
        }, 0);

        return panel;
    },

    /**
     * Update accessibility setting
     */
    updateAccessibility(key, value, className) {
        const preferences = CognoUtils?.StorageUtils?.get('cogno-accessibility') || {};
        preferences[key] = value;
        CognoUtils?.StorageUtils?.set('cogno-accessibility', preferences);

        if (value) {
            document.body.classList.add(className);
        } else {
            document.body.classList.remove(className);
        }
    },

    /**
     * Initialize TTS button
     */
    initTTS() {
        const ttsToggle = document.getElementById('tts-toggle');

        if (ttsToggle && window.CognoTTS) {
            ttsToggle.addEventListener('click', () => {
                const contentArea = document.querySelector('.content-area');
                if (contentArea) {
                    const text = contentArea.innerText;
                    CognoTTS.speak(text);
                }
            });
        }
    },

    /**
     * Load module progress from Supabase
     */
    async loadModuleProgress() {
        if (!this.user) return;

        try {
            const { data: progress, error } = await CognoSupabase.query('module_progress', {
                filter: {
                    user_id: this.user.id,
                    module_type: this.currentModule
                }
            });

            if (error) throw error;

            this.moduleProgress = progress?.[0] || {
                completion_rate: 0,
                activities_completed: 0,
                total_points: 0
            };

            // Also load individual activity progress
            const { data: activityProgress, error: actError } = await CognoSupabase.query('activity_progress', {
                filter: {
                    user_id: this.user.id,
                    module_type: this.currentModule
                }
            });

            if (!actError && activityProgress) {
                this.activityProgress = activityProgress.reduce((acc, item) => {
                    acc[item.activity_id] = item;
                    return acc;
                }, {});

                // Update activity cards with progress
                this.updateActivityCards();
            }

        } catch (error) {
            console.error('[CognoModules] Failed to load progress:', error);
        }
    },

    /**
     * Update stats display on page
     */
    updateStatsDisplay() {
        if (!this.moduleProgress) return;

        const completionEl = document.getElementById('completion-rate');
        const activitiesEl = document.getElementById('activities-done');
        const pointsEl = document.getElementById('points-earned');

        if (completionEl) {
            completionEl.textContent = `${Math.round(this.moduleProgress.completion_rate || 0)}%`;
        }
        if (activitiesEl) {
            activitiesEl.textContent = this.moduleProgress.activities_completed || 0;
        }
        if (pointsEl) {
            pointsEl.textContent = CognoUtils?.NumberUtils?.format(this.moduleProgress.total_points || 0) || '0';
        }
    },

    /**
     * Update individual activity cards with progress data
     */
    updateActivityCards() {
        if (!this.activityProgress) return;

        document.querySelectorAll('.activity-card').forEach(card => {
            const href = card.getAttribute('href');
            if (!href) return;

            // Extract activity ID from href
            const activityId = href.replace('.html', '');
            const progress = this.activityProgress[activityId];

            if (progress) {
                // Update progress bar
                const progressBar = card.querySelector('.progress-fill');
                const progressText = card.querySelector('.activity-progress span');

                if (progressBar) {
                    progressBar.style.width = `${progress.completion_percentage || 0}%`;
                }
                if (progressText) {
                    progressText.textContent = `${progress.completion_percentage || 0}%`;
                }
            }
        });
    },

    /**
     * Subscribe to realtime progress updates
     */
    subscribeToProgress() {
        if (!window.CognoRealtime || !this.user) return;

        // Subscribe to module progress changes
        CognoRealtime.subscriptions.subscribe(
            'module_progress',
            `module_progress:user_id=eq.${this.user.id}`,
            (payload) => {
                if (payload.new && payload.new.module_type === this.currentModule) {
                    this.moduleProgress = payload.new;
                    this.updateStatsDisplay();
                }
            }
        );

        // Subscribe to activity progress changes
        CognoRealtime.subscriptions.subscribe(
            'activity_progress',
            `activity_progress:user_id=eq.${this.user.id}`,
            (payload) => {
                if (payload.new && payload.new.module_type === this.currentModule) {
                    if (!this.activityProgress) this.activityProgress = {};
                    this.activityProgress[payload.new.activity_id] = payload.new;
                    this.updateActivityCards();
                }
            }
        );
    },

    /**
     * Log module visit for analytics
     */
    async logModuleVisit() {
        if (!this.user) return;

        try {
            await CognoSupabase.logActivity({
                user_id: this.user.id,
                activity_type: 'module_visit',
                module_type: this.currentModule,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('[CognoModules] Failed to log visit:', error);
        }
    },

    /**
     * Start an activity
     */
    async startActivity(activityId) {
        if (!this.user) return;

        try {
            // Log activity start
            await CognoSupabase.logActivity({
                user_id: this.user.id,
                activity_type: 'activity_start',
                module_type: this.currentModule,
                activity_id: activityId,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });

            // Store session data
            sessionStorage.setItem('cogno-activity-session', JSON.stringify({
                activityId,
                module: this.currentModule,
                startTime: Date.now()
            }));

        } catch (error) {
            console.error('[CognoModules] Failed to start activity:', error);
        }
    },

    /**
     * Complete an activity with score
     */
    async completeActivity(activityId, score, maxScore, duration) {
        if (!this.user) return;

        try {
            const percentage = Math.round((score / maxScore) * 100);
            const points = this.calculatePoints(percentage, duration);

            // Update activity progress
            const { error } = await CognoSupabase.upsert('activity_progress', {
                user_id: this.user.id,
                module_type: this.currentModule,
                activity_id: activityId,
                completion_percentage: Math.max(percentage, this.activityProgress?.[activityId]?.completion_percentage || 0),
                best_score: Math.max(score, this.activityProgress?.[activityId]?.best_score || 0),
                attempts: (this.activityProgress?.[activityId]?.attempts || 0) + 1,
                total_time_spent: (this.activityProgress?.[activityId]?.total_time_spent || 0) + duration,
                last_played: new Date().toISOString()
            }, {
                onConflict: 'user_id,module_type,activity_id'
            });

            if (error) throw error;

            // Log activity completion
            await CognoSupabase.logActivity({
                user_id: this.user.id,
                activity_type: 'activity_complete',
                module_type: this.currentModule,
                activity_id: activityId,
                points_earned: points,
                metadata: {
                    score,
                    maxScore,
                    percentage,
                    duration,
                    timestamp: new Date().toISOString()
                }
            });

            // Show completion notification
            CognoNotifications?.toast?.success(`Activity complete! +${points} points`);

            // Check for achievements
            await this.checkAchievements(activityId, percentage, points);

            return { points, percentage };

        } catch (error) {
            console.error('[CognoModules] Failed to complete activity:', error);
            CognoNotifications?.toast?.error('Failed to save progress');
        }
    },

    /**
     * Calculate points earned
     */
    calculatePoints(percentage, duration) {
        let basePoints = Math.round(percentage / 10) * 10; // 0-100 points based on score

        // Bonus for quick completion (under 2 minutes)
        if (duration < 120) {
            basePoints += 10;
        }

        // Perfect score bonus
        if (percentage === 100) {
            basePoints += 25;
        }

        return basePoints;
    },

    /**
     * Check for achievement unlocks
     */
    async checkAchievements(activityId, percentage, points) {
        if (!this.user) return;

        const achievements = [];

        // First time completing this activity
        if (!this.activityProgress?.[activityId]) {
            achievements.push({
                type: 'first_completion',
                activity_id: activityId,
                module_type: this.currentModule
            });
        }

        // Perfect score
        if (percentage === 100) {
            achievements.push({
                type: 'perfect_score',
                activity_id: activityId,
                module_type: this.currentModule
            });
        }

        // Unlock achievements
        for (const achievement of achievements) {
            try {
                await CognoSupabase.insert('user_achievements', {
                    user_id: this.user.id,
                    achievement_type: achievement.type,
                    module_type: achievement.module_type,
                    activity_id: achievement.activity_id,
                    earned_at: new Date().toISOString()
                });

                CognoNotifications?.toast?.success(`Achievement Unlocked: ${achievement.type.replace(/_/g, ' ')}`);
            } catch (error) {
                // Achievement might already exist
                console.log('[CognoModules] Achievement check:', error.message);
            }
        }
    },

    /**
     * Get module config
     */
    getConfig(moduleName = null) {
        const name = moduleName || this.currentModule;
        return this.moduleConfig[name] || null;
    },

    /**
     * Get activity info
     */
    getActivityInfo(activityId) {
        const config = this.getConfig();
        if (!config) return null;

        return config.activities.find(a => a.id === activityId);
    },

    /**
     * Navigate to activity
     */
    goToActivity(activityId) {
        const activity = this.getActivityInfo(activityId);
        if (activity) {
            window.location.href = `${CognoPaths.getBasePath()}modules/${this.currentModule}/${activity.path}`;
        }
    },

    /**
     * Go back to module index
     */
    goToModuleIndex() {
        window.location.href = `${CognoPaths.getBasePath()}modules/${this.currentModule}/`;
    },

    /**
     * Go to dashboard
     */
    goToDashboard() {
        window.location.href = CognoPaths.dashboard.child();
    }
};

// Activity Base Class for individual activity pages
class CognoActivity {
    constructor(activityId, moduleName) {
        this.activityId = activityId;
        this.moduleName = moduleName;
        this.startTime = null;
        this.score = 0;
        this.maxScore = 100;
        this.isComplete = false;
    }

    /**
     * Start the activity
     */
    async start() {
        this.startTime = Date.now();
        this.score = 0;
        this.isComplete = false;

        await CognoModules.startActivity(this.activityId);
        console.log(`[CognoActivity] Started: ${this.activityId}`);
    }

    /**
     * Add points
     */
    addScore(points) {
        this.score = Math.min(this.score + points, this.maxScore);
        this.updateScoreDisplay();
    }

    /**
     * Update score display (override in activity page)
     */
    updateScoreDisplay() {
        const scoreEl = document.getElementById('activity-score');
        if (scoreEl) {
            scoreEl.textContent = this.score;
        }
    }

    /**
     * Complete the activity
     */
    async complete() {
        if (this.isComplete) return;
        this.isComplete = true;

        const duration = Math.round((Date.now() - this.startTime) / 1000);
        const result = await CognoModules.completeActivity(
            this.activityId,
            this.score,
            this.maxScore,
            duration
        );

        console.log(`[CognoActivity] Completed: ${this.activityId}`, result);

        // Show results modal
        this.showResultsModal(result);

        return result;
    }

    /**
     * Show results modal
     */
    showResultsModal(result) {
        const modal = document.createElement('div');
        modal.className = 'modal open';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h3>Activity Complete!</h3>
                </div>
                <div class="modal-body" style="text-align: center; padding: var(--space-6);">
                    <div style="font-size: 3rem; margin-bottom: var(--space-4);">
                        ${result?.percentage >= 80 ? '🎉' : result?.percentage >= 50 ? '👍' : '💪'}
                    </div>
                    <p style="font-size: 1.5rem; font-weight: 600; margin-bottom: var(--space-2);">
                        ${result?.percentage || 0}%
                    </p>
                    <p style="color: var(--color-text-secondary); margin-bottom: var(--space-4);">
                        +${result?.points || 0} points earned!
                    </p>
                </div>
                <div class="modal-footer" style="justify-content: center; gap: var(--space-3);">
                    <button class="btn btn-ghost" onclick="CognoModules.goToModuleIndex()">
                        Back to Module
                    </button>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Play Again
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on overlay click
        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.remove();
        });
    }

    /**
     * Get elapsed time in seconds
     */
    getElapsedTime() {
        if (!this.startTime) return 0;
        return Math.round((Date.now() - this.startTime) / 1000);
    }

    /**
     * Format time display
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// Export for use in activity pages
window.CognoModules = CognoModules;
window.CognoActivity = CognoActivity;

/**
 * Cogno Solution - Doctor Portal JavaScript
 * Handles doctor-specific functionality with proper Supabase integration
 */

// Doctor Portal Module
const DoctorPortal = {
    currentDoctor: null,
    doctorProfile: null,
    patients: [],
    appointments: [],
    consultations: [],
    notifications: [],
    realtimeSubscriptions: [],
    
    // Initialize doctor portal
    async init() {
        console.log('Initializing Doctor Portal...');
        
        // Check authentication
        const isAuthed = await this.checkAuth();
        if (!isAuthed) return;
        
        // Load doctor data
        await this.loadDoctorData();
        
        // Initialize sidebar
        this.initSidebar();
        
        // Initialize page-specific features
        this.initPageFeatures();
        
        // Setup realtime subscriptions
        this.setupRealtimeSubscriptions();
        
        // Initialize logout
        this.initLogout();
        
        console.log('Doctor Portal initialized successfully');
    },
    
    // Check if user is authenticated as doctor
    async checkAuth() {
        try {
            const { session } = await CognoSupabase?.getSession();
            if (!session) {
                window.location.href = CognoPaths?.auth?.login() || '../auth/login.html';
                return false;
            }
            
            const { user } = await CognoSupabase?.getCurrentUser();
            if (!user) {
                window.location.href = CognoPaths?.auth?.login() || '../auth/login.html';
                return false;
            }
            
            this.currentDoctor = user;
            this.doctorProfile = user.profile;
            
            // Check if user has doctor role
            if (this.doctorProfile?.role !== 'doctor' && this.doctorProfile?.role !== 'admin') {
                this.showToast('Access denied. Doctor role required.', 'error');
                setTimeout(() => {
                    window.location.href = CognoPaths?.dashboard?.index() || '../dashboard/';
                }, 1500);
                return false;
            }
            
            // Update UI with doctor info
            this.updateDoctorInfo();
            
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    },
    
    // Update doctor info in UI
    updateDoctorInfo() {
        const doctorName = this.doctorProfile?.full_name || 'Doctor';
        
        // Update all name elements
        document.querySelectorAll('#doctor-name, #user-name, .doctor-name').forEach(el => {
            el.textContent = this.doctorProfile?.full_name?.startsWith('Dr.') 
                ? doctorName 
                : `Dr. ${doctorName}`;
        });
        
        // Update avatar
        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl && this.doctorProfile?.avatar_url) {
            const img = avatarEl.querySelector('img');
            if (img) img.src = this.doctorProfile.avatar_url;
        }
        
        // Update current date
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    },
    
    // Load all doctor data from Supabase
    async loadDoctorData() {
        if (!this.currentDoctor) return;
        
        try {
            // Load patients assigned to this doctor using doctor_patients table
            await this.loadPatients();
            
            // Load consultations/appointments
            await this.loadConsultations();
            
            // Load unread messages count
            await this.loadUnreadMessages();
            
            // Load notifications
            await this.loadNotifications();
            
        } catch (error) {
            console.error('Failed to load doctor data:', error);
        }
    },
    
    // Load patients from doctor_patients table with profile join
    async loadPatients() {
        try {
            const { data, error } = await CognoSupabase?.client
                ?.from('doctor_patients')
                ?.select(`
                    id,
                    status,
                    assigned_at,
                    notes,
                    patient:patient_id (
                        id,
                        full_name,
                        email,
                        avatar_url,
                        date_of_birth,
                        phone,
                        created_at,
                        last_login_at
                    )
                `)
                ?.eq('doctor_id', this.currentDoctor.id)
                ?.eq('status', 'active')
                ?.order('assigned_at', { ascending: false });
            
            if (error) {
                console.error('Error loading patients:', error);
                return;
            }
            
            // Process and flatten patient data
            this.patients = (data || []).map(dp => ({
                id: dp.patient?.id,
                doctorPatientId: dp.id,
                name: dp.patient?.full_name || 'Unknown',
                email: dp.patient?.email,
                avatar_url: dp.patient?.avatar_url,
                date_of_birth: dp.patient?.date_of_birth,
                phone: dp.patient?.phone,
                status: dp.status,
                assignedAt: dp.assigned_at,
                notes: dp.notes,
                lastLogin: dp.patient?.last_login_at,
                age: dp.patient?.date_of_birth ? this.calculateAge(dp.patient.date_of_birth) : null
            }));
            
            // Also try to load conditions for each patient
            await this.loadPatientConditions();
            
            console.log('Loaded patients:', this.patients.length);
            
        } catch (error) {
            console.error('Failed to load patients:', error);
        }
    },
    
    // Load patient conditions
    async loadPatientConditions() {
        if (this.patients.length === 0) return;
        
        try {
            const patientIds = this.patients.map(p => p.id).filter(Boolean);
            
            const { data, error } = await CognoSupabase?.client
                ?.from('student_conditions')
                ?.select('student_id, condition, severity, is_primary')
                ?.in('student_id', patientIds);
            
            if (error) {
                console.error('Error loading conditions:', error);
                return;
            }
            
            // Map conditions to patients
            const conditionsByPatient = {};
            (data || []).forEach(c => {
                if (!conditionsByPatient[c.student_id]) {
                    conditionsByPatient[c.student_id] = [];
                }
                conditionsByPatient[c.student_id].push({
                    type: c.condition,
                    severity: c.severity,
                    isPrimary: c.is_primary
                });
            });
            
            this.patients.forEach(patient => {
                patient.conditions = conditionsByPatient[patient.id] || [];
            });
            
        } catch (error) {
            console.error('Failed to load patient conditions:', error);
        }
    },
    
    // Load consultations
    async loadConsultations() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { data, error } = await CognoSupabase?.client
                ?.from('consultations')
                ?.select(`
                    *,
                    patient:patient_id (
                        id,
                        full_name,
                        avatar_url
                    )
                `)
                ?.eq('doctor_id', this.currentDoctor.id)
                ?.gte('scheduled_at', today.toISOString())
                ?.order('scheduled_at', { ascending: true });
            
            if (error) {
                console.error('Error loading consultations:', error);
                return;
            }
            
            this.consultations = data || [];
            this.appointments = this.consultations; // Alias for backward compatibility
            
            console.log('Loaded consultations:', this.consultations.length);
            
        } catch (error) {
            console.error('Failed to load consultations:', error);
        }
    },
    
    // Load unread messages
    async loadUnreadMessages() {
        try {
            const { data, error, count } = await CognoSupabase?.client
                ?.from('messages')
                ?.select('id', { count: 'exact', head: true })
                ?.eq('receiver_id', this.currentDoctor.id)
                ?.eq('is_read', false);
            
            if (!error) {
                const badge = document.getElementById('message-badge');
                if (badge && count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'flex';
                }
            }
        } catch (error) {
            console.error('Failed to load unread messages:', error);
        }
    },
    
    // Load notifications
    async loadNotifications() {
        try {
            const { data, error } = await CognoSupabase?.client
                ?.from('notifications')
                ?.select('*')
                ?.eq('user_id', this.currentDoctor.id)
                ?.order('created_at', { ascending: false })
                ?.limit(20);
            
            if (error) {
                console.error('Error loading notifications:', error);
                return;
            }
            
            this.notifications = data || [];
            this.updateNotificationBadge();
            
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    },
    
    // Update notification badge
    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.is_read).length;
        const badge = document.getElementById('notification-badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },
    
    // Setup realtime subscriptions
    setupRealtimeSubscriptions() {
        if (!CognoSupabase?.client || !this.currentDoctor) return;
        
        // Subscribe to new consultations
        const consultSub = CognoSupabase.client
            .channel('doctor-consultations')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'consultations',
                filter: `doctor_id=eq.${this.currentDoctor.id}`
            }, (payload) => {
                console.log('Consultation update:', payload);
                this.handleConsultationUpdate(payload);
            })
            .subscribe();
        
        this.realtimeSubscriptions.push(consultSub);
        
        // Subscribe to new notifications
        const notifSub = CognoSupabase.client
            .channel('doctor-notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${this.currentDoctor.id}`
            }, (payload) => {
                console.log('New notification:', payload);
                this.handleNewNotification(payload.new);
            })
            .subscribe();
        
        this.realtimeSubscriptions.push(notifSub);
        
        // Subscribe to new messages
        const msgSub = CognoSupabase.client
            .channel('doctor-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${this.currentDoctor.id}`
            }, (payload) => {
                console.log('New message:', payload);
                this.handleNewMessage(payload.new);
            })
            .subscribe();
        
        this.realtimeSubscriptions.push(msgSub);
        
        // Subscribe to patient activity (for live monitoring)
        if (this.patients.length > 0) {
            const patientIds = this.patients.map(p => p.id).filter(Boolean);
            patientIds.forEach(patientId => {
                const activitySub = CognoSupabase.client
                    .channel(`patient-activity-${patientId}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'learning_sessions',
                        filter: `student_id=eq.${patientId}`
                    }, (payload) => {
                        this.handlePatientActivity(patientId, payload.new);
                    })
                    .subscribe();
                
                this.realtimeSubscriptions.push(activitySub);
            });
        }
    },
    
    // Handle consultation updates
    handleConsultationUpdate(payload) {
        this.loadConsultations();
        
        if (payload.eventType === 'INSERT') {
            this.showToast('New consultation scheduled!', 'info');
        } else if (payload.eventType === 'UPDATE' && payload.new.status === 'confirmed') {
            this.showToast('Consultation confirmed!', 'success');
        }
    },
    
    // Handle new notifications
    handleNewNotification(notification) {
        this.notifications.unshift(notification);
        this.updateNotificationBadge();
        
        // Show toast for the notification
        this.showToast(notification.message, notification.notification_type === 'consultation' ? 'info' : 'success');
        
        // Play notification sound if available
        this.playNotificationSound();
    },
    
    // Handle new messages
    handleNewMessage(message) {
        this.loadUnreadMessages();
        this.showToast('New message received!', 'info');
        this.playNotificationSound();
    },
    
    // Handle patient activity
    handlePatientActivity(patientId, session) {
        const patient = this.patients.find(p => p.id === patientId);
        if (patient) {
            // Update live monitoring grid if on dashboard
            const liveGrid = document.getElementById('live-activity-grid');
            if (liveGrid) {
                this.addLiveActivity(patient, session);
            }
        }
    },
    
    // Add live activity to dashboard
    addLiveActivity(patient, session) {
        const liveGrid = document.getElementById('live-activity-grid');
        const noActive = document.getElementById('no-active');
        
        if (!liveGrid) return;
        
        // Hide empty state
        if (noActive) noActive.style.display = 'none';
        
        // Show live badge
        const liveBadge = document.getElementById('live-badge');
        if (liveBadge) liveBadge.style.display = 'flex';
        
        // Create activity card
        const initials = patient.name?.split(' ').map(n => n[0]).join('') || '?';
        const activityCard = document.createElement('div');
        activityCard.className = 'live-activity-card';
        activityCard.innerHTML = `
            <div class="activity-patient">
                <div class="avatar" style="background: var(--color-${session.condition || 'primary'});">
                    ${patient.avatar_url ? `<img src="${patient.avatar_url}" alt="${patient.name}">` : initials}
                </div>
                <div class="activity-info">
                    <h4>${patient.name}</h4>
                    <p>Working on ${session.condition || 'activity'}</p>
                </div>
            </div>
            <div class="activity-status">
                <span class="live-dot"></span>
                <span>Active now</span>
            </div>
        `;
        
        // Add to start of grid
        liveGrid.insertBefore(activityCard, liveGrid.firstChild);
    },
    
    // Play notification sound
    playNotificationSound() {
        try {
            const audio = new Audio('../assets/audio/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore if autoplay blocked
        } catch (e) {}
    },
    
    // Calculate age from date of birth
    calculateAge(dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    },
    
    // Initialize sidebar toggle
    initSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebarClose = document.getElementById('sidebar-close');
        const sidebar = document.getElementById('sidebar');
        
        sidebarToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('collapsed');
            sidebar?.classList.toggle('open');
            document.body.classList.toggle('sidebar-collapsed');
        });
        
        sidebarClose?.addEventListener('click', () => {
            sidebar?.classList.remove('open');
        });
        
        // Handle responsive sidebar
        if (window.innerWidth < 768) {
            sidebar?.classList.add('collapsed');
        }
        
        window.addEventListener('resize', () => {
            if (window.innerWidth < 768) {
                sidebar?.classList.add('collapsed');
            } else {
                sidebar?.classList.remove('collapsed');
            }
        });
    },
    
    // Initialize logout functionality
    initLogout() {
        document.querySelectorAll('#logout-btn, #dropdown-logout, .logout-btn').forEach(btn => {
            btn?.addEventListener('click', async (e) => {
                e.preventDefault();
                await CognoSupabase?.signOut();
            });
        });
    },
    
    // Initialize page-specific features
    initPageFeatures() {
        const path = window.location.pathname;
        
        if (path.includes('patients.html')) {
            this.initPatientsPage();
        } else if (path.includes('patient-detail.html')) {
            this.initPatientDetailPage();
        } else if (path.includes('schedule.html')) {
            this.initSchedulePage();
        } else if (path.includes('reports.html')) {
            this.initReportsPage();
        } else if (path.includes('messages.html')) {
            this.initMessagesPage();
        } else if (path.includes('live-monitoring.html')) {
            this.initLiveMonitoringPage();
        } else if (path.includes('assessments.html')) {
            this.initAssessmentsPage();
        } else if (path.includes('recommendations.html')) {
            this.initRecommendationsPage();
        } else if (path.includes('profile.html')) {
            this.initProfilePage();
        } else if (path.endsWith('/doctor/') || path.endsWith('/doctor/index.html') || path.includes('index.html')) {
            this.initDashboardPage();
        }
    },
    
    // Dashboard page initialization
    initDashboardPage() {
        console.log('Initializing doctor dashboard...');
        this.updateDashboardStats();
        this.renderTodaySchedule();
        this.renderRecentActivity();
    },
    
    // Update dashboard statistics
    updateDashboardStats() {
        const today = new Date().toDateString();
        const todayConsultations = this.consultations.filter(c => 
            new Date(c.scheduled_at).toDateString() === today
        );
        
        // Get active patients (those who logged in today)
        const activeToday = this.patients.filter(p => 
            p.lastLogin && new Date(p.lastLogin).toDateString() === today
        );
        
        // Update stat elements
        const stats = {
            'total-patients': this.patients.length,
            'today-appointments': todayConsultations.length,
            'consultations-today': todayConsultations.length,
            'active-today': activeToday.length,
            'pending-reviews': this.consultations.filter(c => c.status === 'pending').length,
            'unread-messages': this.notifications.filter(n => !n.is_read).length,
            'attention-needed': this.patients.filter(p => !p.lastLogin || 
                (new Date() - new Date(p.lastLogin)) > 5 * 24 * 60 * 60 * 1000).length
        };
        
        Object.entries(stats).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    },
    
    // Render today's schedule
    renderTodaySchedule() {
        const scheduleList = document.getElementById('schedule-list');
        const noSchedule = document.getElementById('no-schedule');
        
        if (!scheduleList) return;
        
        const today = new Date().toDateString();
        const todayConsultations = this.consultations.filter(c => 
            new Date(c.scheduled_at).toDateString() === today
        );
        
        if (todayConsultations.length === 0) {
            if (noSchedule) noSchedule.style.display = 'block';
            return;
        }
        
        if (noSchedule) noSchedule.style.display = 'none';
        
        scheduleList.innerHTML = todayConsultations.map(c => {
            const time = new Date(c.scheduled_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            const patientName = c.patient?.full_name || 'Unknown Patient';
            const initials = patientName.split(' ').map(n => n[0]).join('');
            
            return `
                <div class="schedule-item">
                    <div class="schedule-time">${time}</div>
                    <div class="schedule-avatar">${initials}</div>
                    <div class="schedule-info">
                        <h4>${patientName}</h4>
                        <p>${c.reason || 'Consultation'}</p>
                    </div>
                    <span class="badge badge-${c.status === 'confirmed' ? 'success' : 'warning'}">
                        ${c.status}
                    </span>
                    ${c.status === 'confirmed' ? `
                        <button class="btn btn-primary btn-sm" onclick="DoctorPortal.startConsultation('${c.id}')">
                            <i class="fa-solid fa-video"></i> Join
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    },
    
    // Render recent activity
    renderRecentActivity() {
        const activityFeed = document.getElementById('activity-feed');
        if (!activityFeed) return;
        
        // For demo, show patient activity
        if (this.patients.length === 0) {
            activityFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-clock"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }
        
        // Show recent login activity
        const recentPatients = this.patients
            .filter(p => p.lastLogin)
            .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
            .slice(0, 5);
        
        if (recentPatients.length === 0) {
            activityFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-clock"></i>
                    <p>No recent patient activity</p>
                </div>
            `;
            return;
        }
        
        activityFeed.innerHTML = recentPatients.map(patient => {
            const initials = patient.name?.split(' ').map(n => n[0]).join('') || '?';
            const timeAgo = this.getTimeAgo(patient.lastLogin);
            const primaryCondition = patient.conditions?.find(c => c.isPrimary)?.type || 
                                     patient.conditions?.[0]?.type || 'general';
            
            return `
                <div class="activity-item">
                    <div class="activity-avatar" style="background: var(--color-${primaryCondition});">
                        ${patient.avatar_url ? `<img src="${patient.avatar_url}" alt="">` : initials}
                    </div>
                    <div class="activity-content">
                        <p><strong>${patient.name}</strong> was active</p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // Get time ago string
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
        return new Date(date).toLocaleDateString();
    },
    
    // Patients page initialization
    initPatientsPage() {
        console.log('Initializing patients page...');
        this.renderPatientsList();
        this.initPatientSearch();
        this.initPatientFilters();
        this.initAddPatientModal();
    },
    
    // Render patients list
    renderPatientsList() {
        const grid = document.getElementById('patients-grid');
        if (!grid) return;
        
        if (this.patients.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-users"></i>
                    <h3>No patients yet</h3>
                    <p>Add patients to start monitoring their progress</p>
                    <button class="btn btn-primary" onclick="DoctorPortal.showAddPatientModal()">
                        <i class="fa-solid fa-plus"></i> Add Patient
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.patients.map(patient => this.createPatientCard(patient)).join('');
    },
    
    // Create patient card HTML
    createPatientCard(patient) {
        const initials = patient.name?.split(' ').map(n => n[0]).join('') || '?';
        const primaryCondition = patient.conditions?.find(c => c.isPrimary)?.type || 
                                 patient.conditions?.[0]?.type;
        
        return `
            <div class="patient-card" data-patient-id="${patient.id}">
                <div class="patient-card-header">
                    <div class="patient-avatar" style="${primaryCondition ? `background: var(--color-${primaryCondition})` : ''}">
                        ${patient.avatar_url ? `<img src="${patient.avatar_url}" alt="">` : `<span>${initials}</span>`}
                    </div>
                    <div class="patient-basic-info">
                        <h3>${patient.name || 'Unknown'}</h3>
                        <p>${patient.age ? `Age: ${patient.age} years` : patient.email || ''}</p>
                    </div>
                    <span class="status-badge ${patient.status}">${patient.status || 'Active'}</span>
                </div>
                
                <div class="patient-conditions">
                    ${(patient.conditions || []).map(c => 
                        `<span class="condition-tag ${c.type}">${c.type}</span>`
                    ).join('') || '<span class="condition-tag">No conditions specified</span>'}
                </div>
                
                <div class="patient-stats">
                    <div class="stat">
                        <span class="stat-label">Last Active</span>
                        <span class="stat-value">${patient.lastLogin ? this.getTimeAgo(patient.lastLogin) : 'Never'}</span>
                    </div>
                </div>
                
                <div class="patient-card-actions">
                    <a href="./patient-detail.html?id=${patient.id}" class="btn btn-outline btn-sm">
                        <i class="fa-solid fa-eye"></i> View Details
                    </a>
                    <button class="btn btn-primary btn-sm" onclick="DoctorPortal.startConsultationWithPatient('${patient.id}')">
                        <i class="fa-solid fa-video"></i> Call
                    </button>
                </div>
            </div>
        `;
    },
    
    // Initialize patient search
    initPatientSearch() {
        const searchInput = document.getElementById('patient-search') || document.getElementById('search-patients');
        searchInput?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.patient-card');
            
            cards.forEach(card => {
                const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
                const conditions = card.querySelector('.patient-conditions')?.textContent.toLowerCase() || '';
                const visible = name.includes(query) || conditions.includes(query);
                card.style.display = visible ? '' : 'none';
            });
        });
    },
    
    // Initialize patient filters
    initPatientFilters() {
        const conditionFilter = document.getElementById('condition-filter');
        const statusFilter = document.getElementById('status-filter');
        const sortBy = document.getElementById('sort-by');
        
        const applyFilters = () => {
            const condition = conditionFilter?.value?.toLowerCase() || '';
            const status = statusFilter?.value?.toLowerCase() || '';
            
            document.querySelectorAll('.patient-card').forEach(card => {
                const cardConditions = card.querySelector('.patient-conditions')?.textContent.toLowerCase() || '';
                const cardStatus = card.querySelector('.status-badge')?.textContent.toLowerCase() || '';
                
                const conditionMatch = !condition || cardConditions.includes(condition);
                const statusMatch = !status || cardStatus.includes(status);
                
                card.style.display = conditionMatch && statusMatch ? '' : 'none';
            });
        };
        
        conditionFilter?.addEventListener('change', applyFilters);
        statusFilter?.addEventListener('change', applyFilters);
        sortBy?.addEventListener('change', () => {
            // Re-render with sorting
            const sortValue = sortBy.value;
            const sorted = [...this.patients].sort((a, b) => {
                if (sortValue === 'name') return (a.name || '').localeCompare(b.name || '');
                if (sortValue === 'recent') return new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0);
                return 0;
            });
            this.patients = sorted;
            this.renderPatientsList();
        });
    },
    
    // Initialize add patient modal
    initAddPatientModal() {
        const addBtn = document.getElementById('add-patient-btn');
        addBtn?.addEventListener('click', () => this.showAddPatientModal());
    },
    
    // Show add patient modal
    showAddPatientModal() {
        // Create modal if doesn't exist
        let modal = document.getElementById('add-patient-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'add-patient-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-overlay" onclick="DoctorPortal.hideAddPatientModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add Patient</h3>
                        <button class="modal-close" onclick="DoctorPortal.hideAddPatientModal()">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="add-patient-form">
                            <div class="form-group">
                                <label>Patient Email</label>
                                <input type="email" id="patient-email" class="form-input" placeholder="Enter patient's registered email" required>
                                <small>The patient must already have an account</small>
                            </div>
                            <div class="form-group">
                                <label>Notes (optional)</label>
                                <textarea id="patient-notes" class="form-textarea" rows="3" placeholder="Any notes about this patient"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" onclick="DoctorPortal.hideAddPatientModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="DoctorPortal.addPatient()">
                            <i class="fa-solid fa-plus"></i> Add Patient
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        modal.classList.add('show');
    },
    
    // Hide add patient modal
    hideAddPatientModal() {
        const modal = document.getElementById('add-patient-modal');
        modal?.classList.remove('show');
    },
    
    // Add patient
    async addPatient() {
        const email = document.getElementById('patient-email')?.value?.trim();
        const notes = document.getElementById('patient-notes')?.value?.trim();
        
        if (!email) {
            this.showToast('Please enter patient email', 'error');
            return;
        }
        
        try {
            // Find patient by email
            const { data: patient, error: findError } = await CognoSupabase?.client
                ?.from('profiles')
                ?.select('id, full_name, email')
                ?.eq('email', email)
                ?.single();
            
            if (findError || !patient) {
                this.showToast('Patient not found. They must register first.', 'error');
                return;
            }
            
            // Check if already assigned
            const { data: existing } = await CognoSupabase?.client
                ?.from('doctor_patients')
                ?.select('id')
                ?.eq('doctor_id', this.currentDoctor.id)
                ?.eq('patient_id', patient.id)
                ?.single();
            
            if (existing) {
                this.showToast('This patient is already assigned to you', 'warning');
                return;
            }
            
            // Add patient
            const { error } = await CognoSupabase?.client
                ?.from('doctor_patients')
                ?.insert({
                    doctor_id: this.currentDoctor.id,
                    patient_id: patient.id,
                    status: 'active',
                    notes: notes
                });
            
            if (error) {
                this.showToast('Failed to add patient', 'error');
                return;
            }
            
            this.showToast(`${patient.full_name} added successfully!`, 'success');
            this.hideAddPatientModal();
            await this.loadPatients();
            this.renderPatientsList();
            
            // Send notification to patient
            await CognoSupabase?.client
                ?.from('notifications')
                ?.insert({
                    user_id: patient.id,
                    title: 'New Doctor Assignment',
                    message: `Dr. ${this.doctorProfile?.full_name} has added you as a patient.`,
                    notification_type: 'system'
                });
            
        } catch (error) {
            console.error('Error adding patient:', error);
            this.showToast('An error occurred', 'error');
        }
    },
    
    // View patient detail
    viewPatient(patientId) {
        window.location.href = `./patient-detail.html?id=${patientId}`;
    },
    
    // Start consultation with patient
    async startConsultationWithPatient(patientId) {
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) return;
        
        // Create consultation record
        const roomId = `cogno-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            const { data, error } = await CognoSupabase?.client
                ?.from('consultations')
                ?.insert({
                    doctor_id: this.currentDoctor.id,
                    patient_id: patientId,
                    scheduled_at: new Date().toISOString(),
                    status: 'in_progress',
                    meeting_id: roomId,
                    reason: 'Direct consultation'
                })
                ?.select()
                ?.single();
            
            if (error) {
                this.showToast('Failed to create consultation', 'error');
                return;
            }
            
            // Notify patient
            await CognoSupabase?.client
                ?.from('notifications')
                ?.insert({
                    user_id: patientId,
                    title: 'Consultation Started',
                    message: `Dr. ${this.doctorProfile?.full_name} is inviting you to a video consultation.`,
                    notification_type: 'consultation',
                    entity_type: 'consultation',
                    entity_id: data.id,
                    action_url: `../consultations/video.html?room=${roomId}`
                });
            
            // Redirect to video call
            window.location.href = `../consultations/video.html?room=${roomId}&consultation=${data.id}`;
            
        } catch (error) {
            console.error('Error starting consultation:', error);
            this.showToast('Failed to start consultation', 'error');
        }
    },
    
    // Start scheduled consultation
    async startConsultation(consultationId) {
        const consultation = this.consultations.find(c => c.id === consultationId);
        if (!consultation) return;
        
        const roomId = consultation.meeting_id || `cogno-${consultationId}`;
        
        // Update status
        await CognoSupabase?.client
            ?.from('consultations')
            ?.update({ status: 'in_progress', meeting_id: roomId })
            ?.eq('id', consultationId);
        
        // Notify patient
        await CognoSupabase?.client
            ?.from('notifications')
            ?.insert({
                user_id: consultation.patient_id,
                title: 'Consultation Starting',
                message: `Dr. ${this.doctorProfile?.full_name} is ready for your consultation.`,
                notification_type: 'consultation',
                entity_type: 'consultation',
                entity_id: consultationId,
                action_url: `../consultations/video.html?room=${roomId}`
            });
        
        window.location.href = `../consultations/video.html?room=${roomId}&consultation=${consultationId}`;
    },
    
    // Patient detail page initialization
    initPatientDetailPage() {
        console.log('Initializing patient detail page...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const patientId = urlParams.get('id');
        
        if (patientId) {
            this.loadPatientDetail(patientId);
        }
        
        this.initTabs();
    },
    
    // Load patient detail
    async loadPatientDetail(patientId) {
        try {
            // Find in loaded patients first
            let patient = this.patients.find(p => p.id === patientId);
            
            if (!patient) {
                // Load from database
                const { data } = await CognoSupabase?.client
                    ?.from('profiles')
                    ?.select('*')
                    ?.eq('id', patientId)
                    ?.single();
                
                if (data) {
                    patient = {
                        id: data.id,
                        name: data.full_name,
                        email: data.email,
                        avatar_url: data.avatar_url,
                        date_of_birth: data.date_of_birth,
                        age: data.date_of_birth ? this.calculateAge(data.date_of_birth) : null
                    };
                }
            }
            
            if (patient) {
                this.renderPatientDetail(patient);
            }
        } catch (error) {
            console.error('Failed to load patient:', error);
        }
    },
    
    // Render patient detail
    renderPatientDetail(patient) {
        const nameEl = document.querySelector('.patient-name');
        const emailEl = document.querySelector('.patient-email');
        const ageEl = document.querySelector('.patient-age');
        const avatarEl = document.querySelector('.patient-avatar');
        
        if (nameEl) nameEl.textContent = patient.name;
        if (emailEl) emailEl.textContent = patient.email;
        if (ageEl) ageEl.textContent = patient.age ? `${patient.age} years old` : '';
        
        if (avatarEl) {
            if (patient.avatar_url) {
                avatarEl.innerHTML = `<img src="${patient.avatar_url}" alt="">`;
            } else {
                avatarEl.textContent = patient.name?.split(' ').map(n => n[0]).join('') || '?';
            }
        }
    },
    
    // Initialize tabs
    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(tabId)?.classList.add('active');
            });
        });
    },
    
    // Schedule page initialization
    initSchedulePage() {
        console.log('Initializing schedule page...');
        this.initCalendarNavigation();
        this.renderScheduleCalendar();
    },
    
    // Initialize calendar navigation
    initCalendarNavigation() {
        let currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
        
        const updateWeekLabel = () => {
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const options = { month: 'long', day: 'numeric' };
            const weekLabel = `${currentWeekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}, ${weekEnd.getFullYear()}`;
            
            const weekEl = document.getElementById('current-week');
            if (weekEl) weekEl.textContent = weekLabel;
            
            this.renderScheduleCalendar(currentWeekStart);
        };
        
        document.getElementById('prev-week')?.addEventListener('click', () => {
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
            updateWeekLabel();
        });
        
        document.getElementById('next-week')?.addEventListener('click', () => {
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            updateWeekLabel();
        });
        
        updateWeekLabel();
    },
    
    // Render schedule calendar
    renderScheduleCalendar(weekStart = new Date()) {
        const calendarGrid = document.getElementById('schedule-calendar');
        if (!calendarGrid) return;
        
        // Implementation for calendar grid
        console.log('Rendering schedule for week starting:', weekStart);
    },
    
    // Reports page initialization
    initReportsPage() {
        console.log('Initializing reports page...');
        this.loadReports();
        this.initReportFilters();
    },
    
    // Load reports
    async loadReports() {
        try {
            const { data, error } = await CognoSupabase?.client
                ?.from('doctor_reports')
                ?.select(`
                    *,
                    patient:patient_id (full_name, avatar_url)
                `)
                ?.eq('doctor_id', this.currentDoctor.id)
                ?.order('created_at', { ascending: false });
            
            if (!error && data) {
                this.renderReportsList(data);
            }
        } catch (error) {
            console.error('Failed to load reports:', error);
        }
    },
    
    // Render reports list
    renderReportsList(reports) {
        const tbody = document.getElementById('reports-tbody');
        if (!tbody) return;
        
        if (reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">No reports found</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = reports.map(report => `
            <tr>
                <td>
                    <div class="report-title">
                        <i class="fa-solid fa-file-medical"></i>
                        <span>${report.title}</span>
                    </div>
                </td>
                <td class="patient-cell">
                    <span>${report.patient?.full_name || 'Unknown'}</span>
                </td>
                <td>${report.report_type}</td>
                <td>${new Date(report.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="DoctorPortal.viewReport('${report.id}')">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },
    
    // Initialize report filters
    initReportFilters() {
        const filters = ['filter-patient', 'filter-type', 'filter-status'];
        filters.forEach(filterId => {
            document.getElementById(filterId)?.addEventListener('change', () => {
                this.filterReports();
            });
        });
    },
    
    // Filter reports
    filterReports() {
        console.log('Filtering reports...');
    },
    
    // Messages page initialization
    initMessagesPage() {
        console.log('Initializing messages page...');
        this.loadMessages();
    },
    
    // Load messages
    async loadMessages() {
        try {
            const { data, error } = await CognoSupabase?.client
                ?.from('messages')
                ?.select(`
                    *,
                    sender:sender_id (full_name, avatar_url),
                    receiver:receiver_id (full_name, avatar_url)
                `)
                ?.or(`sender_id.eq.${this.currentDoctor.id},receiver_id.eq.${this.currentDoctor.id}`)
                ?.order('created_at', { ascending: false })
                ?.limit(50);
            
            if (!error && data) {
                this.renderMessagesList(data);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    },
    
    // Render messages list
    renderMessagesList(messages) {
        const list = document.getElementById('messages-list');
        if (!list) return;
        
        if (messages.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>No messages yet</p>
                </div>
            `;
            return;
        }
        
        // Group by conversation
        const conversations = {};
        messages.forEach(msg => {
            const otherUser = msg.sender_id === this.currentDoctor.id ? msg.receiver : msg.sender;
            const key = otherUser?.full_name || 'Unknown';
            if (!conversations[key]) {
                conversations[key] = {
                    user: otherUser,
                    messages: []
                };
            }
            conversations[key].messages.push(msg);
        });
        
        list.innerHTML = Object.entries(conversations).map(([name, conv]) => {
            const lastMsg = conv.messages[0];
            const initials = name.split(' ').map(n => n[0]).join('');
            
            return `
                <div class="message-item ${!lastMsg.is_read && lastMsg.receiver_id === this.currentDoctor.id ? 'unread' : ''}">
                    <div class="message-avatar">${initials}</div>
                    <div class="message-content">
                        <h4>${name}</h4>
                        <p>${lastMsg.content?.substring(0, 50)}${lastMsg.content?.length > 50 ? '...' : ''}</p>
                    </div>
                    <span class="message-time">${this.getTimeAgo(lastMsg.created_at)}</span>
                </div>
            `;
        }).join('');
    },
    
    // Live monitoring page initialization
    initLiveMonitoringPage() {
        console.log('Initializing live monitoring page...');
        this.renderLiveMonitoring();
        this.updateLiveStats();
        this.initStatusFilter();
        
        // Auto-refresh every 30 seconds
        this.liveMonitoringInterval = setInterval(() => {
            this.loadPatients().then(() => {
                this.renderLiveMonitoring();
                this.updateLiveStats();
            });
        }, 30000);
    },
    
    // Update live monitoring stats
    updateLiveStats() {
        const now = new Date();
        const today = new Date().toDateString();
        
        // Online = active within last 10 minutes
        const onlineNow = this.patients.filter(p => 
            p.lastLogin && (now - new Date(p.lastLogin)) < 10 * 60 * 1000
        ).length;
        
        // Active today = logged in today
        const activeToday = this.patients.filter(p => 
            p.lastLogin && new Date(p.lastLogin).toDateString() === today
        ).length;
        
        // Update stat elements
        const onlineEl = document.getElementById('online-now');
        const activeTodayEl = document.getElementById('active-today');
        const totalPatientsEl = document.getElementById('total-patients');
        const sessionsTodayEl = document.getElementById('sessions-today');
        
        if (onlineEl) onlineEl.textContent = onlineNow;
        if (activeTodayEl) activeTodayEl.textContent = activeToday;
        if (totalPatientsEl) totalPatientsEl.textContent = this.patients.length;
        if (sessionsTodayEl) sessionsTodayEl.textContent = activeToday; // Approximate
    },
    
    // Init status filter
    initStatusFilter() {
        const filter = document.getElementById('status-filter');
        filter?.addEventListener('change', (e) => {
            const value = e.target.value;
            this.renderLiveMonitoring(value);
        });
    },
    
    // Render live monitoring
    renderLiveMonitoring(statusFilter = '') {
        const grid = document.getElementById('monitoring-grid');
        if (!grid) return;
        
        const now = new Date();
        
        // Process patients with online status
        let patientsToShow = this.patients.map(patient => {
            const isOnline = patient.lastLogin && 
                (now - new Date(patient.lastLogin)) < 10 * 60 * 1000; // 10 minutes for online
            return { ...patient, isOnline };
        });
        
        // Apply filter
        if (statusFilter === 'online') {
            patientsToShow = patientsToShow.filter(p => p.isOnline);
        } else if (statusFilter === 'offline') {
            patientsToShow = patientsToShow.filter(p => !p.isOnline);
        }
        
        // Sort: online first
        patientsToShow.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));
        
        if (patientsToShow.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-users-slash"></i>
                    <p>${statusFilter === 'online' ? 'No patients online' : 'No patients to monitor'}</p>
                </div>
            `;
            return;
        }
        
        // Show all patients with their current status
        grid.innerHTML = patientsToShow.map(patient => {
            const initials = patient.name?.split(' ').map(n => n[0]).join('') || '?';
            const primaryCondition = patient.conditions?.find(c => c.isPrimary)?.type || 
                                     patient.conditions?.[0]?.type;
            
            return `
                <div class="monitoring-card ${patient.isOnline ? 'online' : 'offline'}">
                    <div class="monitoring-header">
                        <div class="patient-avatar" style="${primaryCondition ? `background: var(--color-${primaryCondition})` : ''}">
                            ${patient.avatar_url ? `<img src="${patient.avatar_url}" alt="">` : initials}
                        </div>
                        <div class="patient-info">
                            <h4>${patient.name}</h4>
                            <span class="status-indicator ${patient.isOnline ? 'online' : 'offline'}">
                                ${patient.isOnline ? 'Online Now' : 'Offline'}
                            </span>
                        </div>
                    </div>
                    <div class="monitoring-activity">
                        <p>Last seen: ${patient.lastLogin ? this.getTimeAgo(patient.lastLogin) : 'Never'}</p>
                        ${patient.conditions?.length ? `
                            <div class="patient-conditions-small">
                                ${patient.conditions.slice(0, 2).map(c => 
                                    `<span class="condition-tag ${c.type}">${c.type}</span>`
                                ).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="monitoring-actions">
                        ${patient.isOnline ? `
                            <button class="btn btn-primary btn-sm" onclick="DoctorPortal.startDirectCall('${patient.id}', '${patient.name}')">
                                <i class="fa-solid fa-video"></i> Call Now
                            </button>
                        ` : `
                            <button class="btn btn-outline btn-sm" onclick="DoctorPortal.scheduleConsultation('${patient.id}')">
                                <i class="fa-solid fa-calendar"></i> Schedule
                            </button>
                        `}
                        <a href="./patient-detail.html?id=${patient.id}" class="btn btn-ghost btn-sm">
                            <i class="fa-solid fa-eye"></i>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // Start direct call with online patient
    async startDirectCall(patientId, patientName) {
        try {
            const roomId = `cogno-${crypto.randomUUID()}`;
            
            // Create consultation record
            const { data, error } = await CognoSupabase?.client
                ?.from('consultations')
                ?.insert({
                    doctor_id: this.currentDoctor.id,
                    patient_id: patientId,
                    scheduled_at: new Date().toISOString(),
                    status: 'in-progress',
                    reason: 'Direct call from doctor',
                    room_id: roomId
                })
                ?.select()
                ?.single();
            
            if (error) throw error;
            
            // Send notification to patient
            await CognoSupabase?.client
                ?.from('notifications')
                ?.insert({
                    user_id: patientId,
                    title: 'Incoming Call',
                    message: `Dr. ${this.doctorProfile?.full_name} is calling you. Click to join.`,
                    notification_type: 'call',
                    metadata: { consultation_id: data.id, room_id: roomId }
                });
            
            // Open video call in new tab
            window.open(`../consultations/video.html?room=${roomId}&consultation=${data.id}`, '_blank');
            
            this.showToast(`Calling ${patientName}...`, 'info');
            
        } catch (error) {
            console.error('Failed to start call:', error);
            this.showToast('Failed to start call: ' + error.message, 'error');
        }
    },
    
    // Schedule consultation redirect
    scheduleConsultation(patientId) {
        window.location.href = `./schedule.html?patient=${patientId}`;
    },
    
    // Assessments page initialization
    async initAssessmentsPage() {
        console.log('Initializing assessments page...');
        await this.loadPatientActivities();
        this.renderPatientActivities();
        this.populatePatientDropdown();
    },
    
    // Load patient activities from student_progress table
    async loadPatientActivities() {
        if (this.patients.length === 0) return;
        
        try {
            const patientIds = this.patients.map(p => p.id).filter(Boolean);
            
            const { data, error } = await CognoSupabase?.client
                ?.from('student_progress')
                ?.select('*')
                ?.in('student_id', patientIds)
                ?.order('updated_at', { ascending: false, nullsFirst: false });
            
            if (error) {
                console.error('Error loading activities:', error);
                return;
            }
            
            // Group activities by patient
            this.patientActivities = {};
            (data || []).forEach(activity => {
                if (!this.patientActivities[activity.student_id]) {
                    this.patientActivities[activity.student_id] = [];
                }
                this.patientActivities[activity.student_id].push(activity);
            });
            
            console.log('Loaded patient activities:', Object.keys(this.patientActivities).length, 'patients');
            
        } catch (error) {
            console.error('Failed to load patient activities:', error);
        }
    },
    
    // Render patient activities section
    renderPatientActivities() {
        const container = document.getElementById('patient-activities-container');
        if (!container) {
            // Create container after templates section
            const templatesSection = document.querySelector('.assessments-grid');
            if (templatesSection) {
                const activitiesSection = document.createElement('div');
                activitiesSection.id = 'patient-activities-section';
                activitiesSection.innerHTML = `
                    <h3 style="margin: 2rem 0 1rem;"><i class="fa-solid fa-chart-line"></i> Patient Activity Review</h3>
                    <div class="patient-filter-bar" style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center;">
                        <select id="activity-patient-filter" class="form-select" style="max-width: 250px;">
                            <option value="">All Patients</option>
                        </select>
                        <select id="activity-module-filter" class="form-select" style="max-width: 180px;">
                            <option value="">All Modules</option>
                            <option value="dyslexia">Dyslexia</option>
                            <option value="dyscalculia">Dyscalculia</option>
                            <option value="dysgraphia">Dysgraphia</option>
                            <option value="dyspraxia">Dyspraxia</option>
                        </select>
                    </div>
                    <div id="patient-activities-container" class="patient-activities-grid"></div>
                `;
                templatesSection.parentNode.insertBefore(activitiesSection, templatesSection.nextSibling);
            }
        }
        
        this.updatePatientActivityDisplay();
        this.initActivityFilters();
    },
    
    // Initialize activity filters
    initActivityFilters() {
        const patientFilter = document.getElementById('activity-patient-filter');
        const moduleFilter = document.getElementById('activity-module-filter');
        
        // Populate patient filter
        if (patientFilter) {
            patientFilter.innerHTML = '<option value="">All Patients</option>';
            this.patients.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                patientFilter.appendChild(opt);
            });
            
            patientFilter.addEventListener('change', () => this.updatePatientActivityDisplay());
        }
        
        moduleFilter?.addEventListener('change', () => this.updatePatientActivityDisplay());
    },
    
    // Update patient activity display based on filters
    updatePatientActivityDisplay() {
        const container = document.getElementById('patient-activities-container');
        if (!container) return;
        
        const patientFilter = document.getElementById('activity-patient-filter')?.value || '';
        const moduleFilter = document.getElementById('activity-module-filter')?.value || '';
        
        // Get patients to display
        let patientsToShow = this.patients;
        if (patientFilter) {
            patientsToShow = patientsToShow.filter(p => p.id === patientFilter);
        }
        
        if (patientsToShow.length === 0 || Object.keys(this.patientActivities || {}).length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; padding: 3rem; text-align: center;">
                    <i class="fa-solid fa-chart-bar" style="font-size: 2.5rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <h4>No Activity Data</h4>
                    <p>Patient activities will appear here once they complete learning modules.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = patientsToShow.map(patient => {
            let activities = this.patientActivities?.[patient.id] || [];
            
            // Apply module filter
            if (moduleFilter) {
                activities = activities.filter(a => a.module_type?.toLowerCase() === moduleFilter);
            }
            
            // Get stats
            const totalActivities = activities.length;
            const completedActivities = activities.filter(a => a.completed).length;
            const avgScore = activities.length > 0 
                ? Math.round(activities.reduce((sum, a) => {
                    const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : a.score;
                    return sum + pct;
                }, 0) / activities.length) 
                : 0;
            const totalTime = activities.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
            
            const initials = patient.name?.split(' ').map(n => n[0]).join('') || '?';
            const primaryCondition = patient.conditions?.find(c => c.isPrimary)?.type || 
                                     patient.conditions?.[0]?.type;
            
            // Get recent activities (last 5)
            const recentActivities = activities.slice(0, 5);
            
            return `
                <div class="patient-activity-card" style="background: var(--bg-secondary); border-radius: 12px; padding: 1.5rem; border: 1px solid var(--border-color);">
                    <div class="patient-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div class="avatar" style="width: 50px; height: 50px; border-radius: 50%; background: ${primaryCondition ? `var(--color-${primaryCondition})` : 'var(--color-primary)'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                            ${patient.avatar_url ? `<img src="${patient.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : initials}
                        </div>
                        <div>
                            <h4 style="margin: 0;">${patient.name}</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">
                                ${patient.conditions?.map(c => c.type).join(', ') || 'No condition specified'}
                            </p>
                        </div>
                        <button class="btn btn-outline btn-sm" style="margin-left: auto;" onclick="DoctorPortal.assignToPatient('${patient.id}', '${patient.name}')">
                            <i class="fa-solid fa-plus"></i> Assign
                        </button>
                    </div>
                    
                    <div class="activity-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
                        <div style="padding: 0.75rem; background: var(--bg-primary); border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary);">${totalActivities}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Activities</div>
                        </div>
                        <div style="padding: 0.75rem; background: var(--bg-primary); border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success);">${completedActivities}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Completed</div>
                        </div>
                        <div style="padding: 0.75rem; background: var(--bg-primary); border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--color-primary);">${avgScore}%</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Avg Score</div>
                        </div>
                        <div style="padding: 0.75rem; background: var(--bg-primary); border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary);">${Math.round(totalTime / 60)}m</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Time</div>
                        </div>
                    </div>
                    
                    ${recentActivities.length > 0 ? `
                        <div class="recent-activities">
                            <h5 style="margin: 0 0 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">Recent Activities</h5>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${recentActivities.map(a => {
                                    const scorePct = a.max_score ? Math.round((a.score / a.max_score) * 100) : a.score;
                                    return `
                                    <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: var(--bg-primary); border-radius: 6px;">
                                        <span class="badge badge-${a.module_type}" style="font-size: 0.7rem;">${a.module_type || 'general'}</span>
                                        <span style="flex: 1; font-size: 0.85rem;">${a.activity_type || a.activity_id}</span>
                                        <span style="font-size: 0.85rem; font-weight: 500; color: ${scorePct >= 80 ? 'var(--color-success)' : scorePct >= 50 ? 'var(--color-warning)' : 'var(--color-error)'};">${scorePct}%</span>
                                        ${a.completed ? '<i class="fa-solid fa-check-circle" style="color: var(--color-success);"></i>' : '<i class="fa-solid fa-clock" style="color: var(--text-secondary);"></i>'}
                                    </div>
                                `}).join('')}
                            </div>
                        </div>
                    ` : `
                        <div style="padding: 1rem; text-align: center; color: var(--text-secondary);">
                            <i class="fa-solid fa-chart-line"></i> No activities yet
                        </div>
                    `}
                </div>
            `;
        }).join('');
    },
    
    // Assign activity to specific patient
    assignToPatient(patientId, patientName) {
        // Pre-select patient in assign modal
        const modal = document.getElementById('assign-modal');
        const patientSelect = document.getElementById('assign-patient');
        
        if (modal && patientSelect) {
            patientSelect.value = patientId;
            modal.classList.add('show');
        } else {
            this.showToast(`Select an assessment to assign to ${patientName}`, 'info');
        }
    },
    
    // Populate patient dropdown in assign modal
    populatePatientDropdown() {
        const select = document.getElementById('assign-patient');
        if (!select) return;
        
        select.innerHTML = '<option value="">Choose a patient...</option>';
        this.patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = patient.name;
            select.appendChild(option);
        });
    },
    
    // Recommendations page initialization
    initRecommendationsPage() {
        console.log('Initializing recommendations page...');
    },
    
    // Profile page initialization
    initProfilePage() {
        console.log('Initializing profile page...');
        this.renderDoctorProfile();
    },
    
    // Render doctor profile
    renderDoctorProfile() {
        const profile = this.doctorProfile;
        if (!profile) return;
        
        // Update form fields if they exist
        const fields = ['full-name', 'email', 'phone', 'specialization', 'license-number', 'years-experience', 'bio', 'consultation-fee'];
        fields.forEach(field => {
            const el = document.getElementById(field);
            const key = field.replace(/-/g, '_');
            if (el && profile[key] !== undefined) {
                el.value = profile[key] || '';
            }
        });
    },
    
    // Show toast notification
    showToast(message, type = 'info') {
        if (window.CognoNotifications?.toast) {
            window.CognoNotifications.toast[type]?.(message) || 
            window.CognoNotifications.toast.show?.(message, type);
        } else {
            // Fallback toast
            const toast = document.createElement('div');
            toast.className = `toast toast-${type} toast-show`;
            toast.innerHTML = `
                <div class="toast-content">${message}</div>
            `;
            
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'toast-container toast-top-right';
                document.body.appendChild(container);
            }
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.remove('toast-show');
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        }
    },
    
    // Cleanup
    destroy() {
        this.realtimeSubscriptions.forEach(sub => {
            sub?.unsubscribe?.();
        });
        this.realtimeSubscriptions = [];
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    DoctorPortal.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    DoctorPortal.destroy();
});

// Export for global access
window.DoctorPortal = DoctorPortal;

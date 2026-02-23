/**
 * COGNO SOLUTION - Realtime Module
 * Handles Supabase realtime subscriptions for live updates
 */

// =========================================================
// REALTIME MANAGER CLASS
// =========================================================

class RealtimeManager {
    constructor() {
        this.channels = new Map();
        this.client = window.CognoSupabase?.client;

        if (!this.client) {
            console.warn('Supabase client not initialized. Realtime disabled.');
        }
    }

    /**
     * Subscribe to a channel
     * @param {string} channelName - Unique channel name
     * @param {Object} config - Subscription configuration
     * @returns {Object} Channel reference
     */
    subscribe(channelName, config = {}) {
        if (!this.client) return null;

        // Check if channel already exists
        if (this.channels.has(channelName)) {
            return this.channels.get(channelName);
        }

        const channel = this.client.channel(channelName, {
            config: {
                broadcast: { ack: true }
            }
        });

        this.channels.set(channelName, channel);
        return channel;
    }

    /**
     * Unsubscribe from a channel
     * @param {string} channelName - Channel name
     */
    unsubscribe(channelName) {
        const channel = this.channels.get(channelName);
        if (channel) {
            channel.unsubscribe();
            this.channels.delete(channelName);
        }
    }

    /**
     * Unsubscribe from all channels
     */
    unsubscribeAll() {
        this.channels.forEach((channel, name) => {
            channel.unsubscribe();
        });
        this.channels.clear();
    }

    /**
     * Get channel by name
     * @param {string} channelName - Channel name
     * @returns {Object|null} Channel reference
     */
    getChannel(channelName) {
        return this.channels.get(channelName) || null;
    }
}

// Create singleton instance
const realtimeManager = new RealtimeManager();

// =========================================================
// TABLE SUBSCRIPTIONS
// Listen to database changes
// =========================================================

const TableSubscriptions = {
    /**
     * Subscribe to table changes
     * @param {string} table - Table name
     * @param {Function} callback - Callback for changes
     * @param {Object} options - Filter options
     * @returns {Function} Unsubscribe function
     */
    subscribe(table, callback, options = {}) {
        if (!window.CognoSupabase?.client) return () => { };

        const channelName = `table:${table}:${Date.now()}`;

        let subscription = window.CognoSupabase.client
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: options.event || '*',
                    schema: 'public',
                    table: table,
                    filter: options.filter
                },
                (payload) => {
                    callback({
                        type: payload.eventType,
                        old: payload.old,
                        new: payload.new,
                        table: payload.table
                    });
                }
            )
            .subscribe();

        return () => subscription.unsubscribe();
    },

    /**
     * Subscribe to user's progress updates
     * @param {string} userId - User ID
     * @param {Function} callback - Callback for changes
     * @returns {Function} Unsubscribe function
     */
    subscribeToProgress(userId, callback) {
        return this.subscribe('progress', callback, {
            filter: `user_id=eq.${userId}`
        });
    },

    /**
     * Subscribe to user's achievements
     * @param {string} userId - User ID
     * @param {Function} callback - Callback for changes
     * @returns {Function} Unsubscribe function
     */
    subscribeToAchievements(userId, callback) {
        return this.subscribe('user_achievements', callback, {
            filter: `user_id=eq.${userId}`,
            event: 'INSERT'
        });
    },

    /**
     * Subscribe to messages
     * @param {string} conversationId - Conversation ID
     * @param {Function} callback - Callback for new messages
     * @returns {Function} Unsubscribe function
     */
    subscribeToMessages(conversationId, callback) {
        return this.subscribe('messages', callback, {
            filter: `conversation_id=eq.${conversationId}`,
            event: 'INSERT'
        });
    },

    /**
     * Subscribe to consultation updates
     * @param {string} consultationId - Consultation ID
     * @param {Function} callback - Callback for changes
     * @returns {Function} Unsubscribe function
     */
    subscribeToConsultation(consultationId, callback) {
        return this.subscribe('consultations', callback, {
            filter: `id=eq.${consultationId}`
        });
    },

    /**
     * Subscribe to doctor's appointments
     * @param {string} doctorId - Doctor user ID
     * @param {Function} callback - Callback for changes
     * @returns {Function} Unsubscribe function
     */
    subscribeToDoctorAppointments(doctorId, callback) {
        return this.subscribe('consultations', callback, {
            filter: `doctor_id=eq.${doctorId}`
        });
    },

    /**
     * Subscribe to parent's child activities
     * @param {Array<string>} childIds - Array of child user IDs
     * @param {Function} callback - Callback for changes
     * @returns {Array<Function>} Array of unsubscribe functions
     */
    subscribeToChildActivities(childIds, callback) {
        return childIds.map(childId =>
            this.subscribe('activity_logs', callback, {
                filter: `user_id=eq.${childId}`,
                event: 'INSERT'
            })
        );
    }
};

// =========================================================
// PRESENCE TRACKING
// Track online users
// =========================================================

class PresenceTracker {
    constructor(channelName = 'presence') {
        this.channelName = channelName;
        this.channel = null;
        this.presenceState = {};
        this.onJoinCallback = null;
        this.onLeaveCallback = null;
        this.onSyncCallback = null;
    }

    /**
     * Initialize presence tracking
     * @param {Object} userInfo - Current user info to broadcast
     */
    async init(userInfo) {
        if (!window.CognoSupabase?.client) return;

        this.channel = window.CognoSupabase.client.channel(this.channelName);

        this.channel
            .on('presence', { event: 'sync' }, () => {
                this.presenceState = this.channel.presenceState();
                if (this.onSyncCallback) {
                    this.onSyncCallback(this.presenceState);
                }
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                if (this.onJoinCallback) {
                    this.onJoinCallback(key, newPresences);
                }
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                if (this.onLeaveCallback) {
                    this.onLeaveCallback(key, leftPresences);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await this.channel.track(userInfo);
                }
            });
    }

    /**
     * Update presence info
     * @param {Object} userInfo - Updated user info
     */
    async updatePresence(userInfo) {
        if (this.channel) {
            await this.channel.track(userInfo);
        }
    }

    /**
     * Set callbacks
     */
    onJoin(callback) {
        this.onJoinCallback = callback;
    }

    onLeave(callback) {
        this.onLeaveCallback = callback;
    }

    onSync(callback) {
        this.onSyncCallback = callback;
    }

    /**
     * Get current online users
     * @returns {Object} Presence state
     */
    getOnlineUsers() {
        return this.presenceState;
    }

    /**
     * Check if user is online
     * @param {string} userId - User ID to check
     * @returns {boolean} Online status
     */
    isOnline(userId) {
        return Object.values(this.presenceState).some(
            presences => presences.some(p => p.user_id === userId)
        );
    }

    /**
     * Untrack and unsubscribe
     */
    destroy() {
        if (this.channel) {
            this.channel.untrack();
            this.channel.unsubscribe();
            this.channel = null;
        }
    }
}

// =========================================================
// BROADCAST CHANNELS
// Send/receive realtime messages
// =========================================================

class BroadcastChannel {
    constructor(channelName) {
        this.channelName = channelName;
        this.channel = null;
        this.handlers = new Map();
    }

    /**
     * Connect to broadcast channel
     */
    connect() {
        if (!window.CognoSupabase?.client) return;

        this.channel = window.CognoSupabase.client.channel(this.channelName);

        // Subscribe
        this.channel.subscribe((status) => {
            console.log(`Broadcast channel ${this.channelName}: ${status}`);
        });
    }

    /**
     * Listen for specific event
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    on(event, handler) {
        if (!this.channel) return;

        this.channel.on('broadcast', { event }, (payload) => {
            handler(payload.payload);
        });

        this.handlers.set(event, handler);
    }

    /**
     * Send broadcast message
     * @param {string} event - Event name
     * @param {Object} payload - Message payload
     */
    async send(event, payload) {
        if (!this.channel) return;

        await this.channel.send({
            type: 'broadcast',
            event,
            payload
        });
    }

    /**
     * Disconnect from channel
     */
    disconnect() {
        if (this.channel) {
            this.channel.unsubscribe();
            this.channel = null;
        }
        this.handlers.clear();
    }
}

// =========================================================
// CONSULTATION ROOM
// Realtime for video consultations
// =========================================================

class ConsultationRoom {
    constructor(consultationId, userId) {
        this.consultationId = consultationId;
        this.userId = userId;
        this.channelName = `consultation:${consultationId}`;
        this.channel = null;
        this.presence = null;

        this.onParticipantJoined = null;
        this.onParticipantLeft = null;
        this.onMessageReceived = null;
        this.onStatusChanged = null;
    }

    /**
     * Join consultation room
     * @param {Object} userInfo - User info (name, role, avatar)
     */
    async join(userInfo) {
        if (!window.CognoSupabase?.client) return;

        this.channel = window.CognoSupabase.client.channel(this.channelName);

        // Presence tracking
        this.channel
            .on('presence', { event: 'sync' }, () => {
                // Get all participants
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                if (this.onParticipantJoined) {
                    newPresences.forEach(p => this.onParticipantJoined(p));
                }
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                if (this.onParticipantLeft) {
                    leftPresences.forEach(p => this.onParticipantLeft(p));
                }
            });

        // Broadcast events
        this.channel
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                if (this.onMessageReceived) {
                    this.onMessageReceived(payload);
                }
            })
            .on('broadcast', { event: 'status' }, ({ payload }) => {
                if (this.onStatusChanged) {
                    this.onStatusChanged(payload);
                }
            });

        // Subscribe and track presence
        await this.channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await this.channel.track({
                    user_id: this.userId,
                    ...userInfo,
                    joined_at: new Date().toISOString()
                });
            }
        });

        // Update consultation status in database
        await CognoSupabase.update('consultations',
            { id: this.consultationId },
            { status: 'in_progress' }
        );
    }

    /**
     * Send chat message
     * @param {string} message - Message text
     */
    async sendMessage(message) {
        if (!this.channel) return;

        const payload = {
            user_id: this.userId,
            message,
            timestamp: new Date().toISOString()
        };

        await this.channel.send({
            type: 'broadcast',
            event: 'chat',
            payload
        });

        // Also save to database
        await CognoSupabase.insert('consultation_messages', {
            consultation_id: this.consultationId,
            sender_id: this.userId,
            content: message
        });
    }

    /**
     * Update status (muted, video off, etc.)
     * @param {Object} status - Status update
     */
    async updateStatus(status) {
        if (!this.channel) return;

        await this.channel.send({
            type: 'broadcast',
            event: 'status',
            payload: {
                user_id: this.userId,
                ...status
            }
        });
    }

    /**
     * Get participants
     * @returns {Array} Participants list
     */
    getParticipants() {
        if (!this.channel) return [];

        const state = this.channel.presenceState();
        return Object.values(state).flat();
    }

    /**
     * Leave consultation room
     */
    async leave() {
        if (this.channel) {
            await this.channel.untrack();
            await this.channel.unsubscribe();
            this.channel = null;
        }
    }
}

// =========================================================
// ACTIVITY FEED
// Realtime activity updates for dashboards
// =========================================================

class ActivityFeed {
    constructor(userId, role) {
        this.userId = userId;
        this.role = role;
        this.subscriptions = [];
        this.onNewActivity = null;
    }

    /**
     * Start listening for activities
     * @param {Array<string>} targetUserIds - User IDs to watch (for parent/doctor)
     */
    start(targetUserIds = []) {
        const userIds = targetUserIds.length > 0 ? targetUserIds : [this.userId];

        userIds.forEach(userId => {
            // Subscribe to game sessions
            const gameSub = TableSubscriptions.subscribe('game_sessions',
                (change) => {
                    if (this.onNewActivity) {
                        this.onNewActivity({
                            type: 'game_completed',
                            data: change.new,
                            timestamp: new Date()
                        });
                    }
                },
                { filter: `user_id=eq.${userId}`, event: 'INSERT' }
            );
            this.subscriptions.push(gameSub);

            // Subscribe to achievements
            const achievementSub = TableSubscriptions.subscribe('user_achievements',
                (change) => {
                    if (this.onNewActivity) {
                        this.onNewActivity({
                            type: 'achievement_earned',
                            data: change.new,
                            timestamp: new Date()
                        });
                    }
                },
                { filter: `user_id=eq.${userId}`, event: 'INSERT' }
            );
            this.subscriptions.push(achievementSub);

            // Subscribe to exercise completions
            const exerciseSub = TableSubscriptions.subscribe('exercise_attempts',
                (change) => {
                    if (this.onNewActivity) {
                        this.onNewActivity({
                            type: 'exercise_completed',
                            data: change.new,
                            timestamp: new Date()
                        });
                    }
                },
                { filter: `user_id=eq.${userId}`, event: 'INSERT' }
            );
            this.subscriptions.push(exerciseSub);
        });
    }

    /**
     * Stop listening
     */
    stop() {
        this.subscriptions.forEach(unsub => unsub());
        this.subscriptions = [];
    }
}

// =========================================================
// NOTIFICATION LISTENER
// Realtime notifications
// =========================================================

class NotificationListener {
    constructor(userId) {
        this.userId = userId;
        this.unsubscribe = null;
        this.onNotification = null;
    }

    /**
     * Start listening for notifications
     */
    start() {
        this.unsubscribe = TableSubscriptions.subscribe('notifications',
            (change) => {
                if (change.type === 'INSERT' && this.onNotification) {
                    this.onNotification(change.new);

                    // Show toast notification
                    if (window.CognoNotifications) {
                        CognoNotifications.show(
                            change.new.title,
                            change.new.type || 'info',
                            { message: change.new.message }
                        );
                    }
                }
            },
            { filter: `user_id=eq.${this.userId}`, event: 'INSERT' }
        );
    }

    /**
     * Stop listening
     */
    stop() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

// =========================================================
// EXPORT
// =========================================================

window.CognoRealtime = {
    // Manager
    manager: realtimeManager,

    // Table subscriptions
    Tables: TableSubscriptions,

    // Classes
    PresenceTracker,
    BroadcastChannel,
    ConsultationRoom,
    ActivityFeed,
    NotificationListener,

    // Quick helpers
    subscribeToTable: TableSubscriptions.subscribe.bind(TableSubscriptions),

    // Subscribe to user notifications (convenience helper)
    subscribeToNotifications: (userId, callback) => {
        const listener = new NotificationListener(userId);
        listener.onNotification = callback;
        listener.start();
        return () => listener.stop();
    },

    // Subscribe to student progress changes (convenience helper)
    subscribeToProgress: (studentId, callback) => {
        if (!window.CognoSupabase?.client) return () => { };

        const channelName = `progress:${studentId}:${Date.now()}`;
        const filter = studentId && studentId !== '*'
            ? { filter: `student_id=eq.${studentId}` }
            : {};

        const channel = window.CognoSupabase.client
            .channel(channelName)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'student_progress',
                ...filter
            }, (payload) => {
                callback({
                    type: payload.eventType,
                    new: payload.new,
                    old: payload.old
                });
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    },

    // Cleanup
    cleanup: () => realtimeManager.unsubscribeAll()
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    realtimeManager.unsubscribeAll();
});

// Log initialization
console.log('📡 Cogno Realtime initialized');

/**
 * COGNO SOLUTION - Notifications Module
 * Toast notifications, alerts, and notification center
 */

// =========================================================
// TOAST NOTIFICATION CLASS
// =========================================================

class ToastManager {
    constructor(options = {}) {
        this.container = null;
        this.toasts = [];
        this.options = {
            position: 'top-right',      // top-left, top-right, bottom-left, bottom-right, top-center, bottom-center
            maxToasts: 5,
            defaultDuration: 5000,
            pauseOnHover: true,
            ...options
        };
        
        this.init();
    }

    init() {
        // Create container if not exists
        this.container = document.getElementById('toast-container');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = `toast-container toast-${this.options.position}`;
            document.body.appendChild(this.container);
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {Object} options - Additional options
     * @returns {HTMLElement} Toast element
     */
    show(message, type = 'info', options = {}) {
        const {
            title = null,
            duration = this.options.defaultDuration,
            closable = true,
            icon = null,
            action = null,
            actionText = 'Action'
        } = options;

        // Remove oldest toast if at max
        if (this.toasts.length >= this.options.maxToasts) {
            this.dismiss(this.toasts[0]);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        // Get icon based on type
        const iconClass = icon || this.getIconForType(type);

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            ${action ? `<button class="toast-action btn btn-ghost btn-sm">${actionText}</button>` : ''}
            ${closable ? `
                <button class="toast-close" aria-label="Close notification">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            ` : ''}
            <div class="toast-progress">
                <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
            </div>
        `;

        // Add to container
        if (this.options.position.includes('bottom')) {
            this.container.prepend(toast);
        } else {
            this.container.appendChild(toast);
        }

        this.toasts.push(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });

        // Event handlers
        if (closable) {
            toast.querySelector('.toast-close').addEventListener('click', () => {
                this.dismiss(toast);
            });
        }

        if (action) {
            toast.querySelector('.toast-action').addEventListener('click', (e) => {
                e.stopPropagation();
                action();
                this.dismiss(toast);
            });
        }

        // Pause on hover
        if (this.options.pauseOnHover) {
            toast.addEventListener('mouseenter', () => {
                const progressBar = toast.querySelector('.toast-progress-bar');
                if (progressBar) {
                    progressBar.style.animationPlayState = 'paused';
                }
            });

            toast.addEventListener('mouseleave', () => {
                const progressBar = toast.querySelector('.toast-progress-bar');
                if (progressBar) {
                    progressBar.style.animationPlayState = 'running';
                }
            });
        }

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => {
                if (this.toasts.includes(toast)) {
                    this.dismiss(toast);
                }
            }, duration);
        }

        return toast;
    }

    /**
     * Dismiss a toast
     * @param {HTMLElement} toast - Toast element
     */
    dismiss(toast) {
        if (!toast) return;

        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');

        setTimeout(() => {
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
            toast.remove();
        }, 300);
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        [...this.toasts].forEach(toast => this.dismiss(toast));
    }

    /**
     * Get icon class for toast type
     */
    getIconForType(type) {
        const icons = {
            success: 'fa-solid fa-circle-check',
            error: 'fa-solid fa-circle-xmark',
            warning: 'fa-solid fa-triangle-exclamation',
            info: 'fa-solid fa-circle-info'
        };
        return icons[type] || icons.info;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Shorthand methods
    success(message, options = {}) {
        return this.show(message, 'success', { title: 'Success', ...options });
    }

    error(message, options = {}) {
        return this.show(message, 'error', { title: 'Error', duration: 8000, ...options });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', { title: 'Warning', ...options });
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
}

// Create default toast manager
const toastManager = new ToastManager();

// =========================================================
// NOTIFICATION CENTER
// Persistent notifications panel
// =========================================================

class NotificationCenter {
    constructor(options = {}) {
        this.notifications = [];
        this.unreadCount = 0;
        this.container = null;
        this.badge = null;
        this.panel = null;
        this.isOpen = false;
        
        this.options = {
            maxNotifications: 50,
            persistKey: 'cogno_notifications',
            onNotificationClick: null,
            ...options
        };
        
        this.loadFromStorage();
    }

    /**
     * Initialize notification center UI
     * @param {string} toggleSelector - Selector for toggle button
     * @param {string} panelSelector - Selector for panel container
     */
    init(toggleSelector, panelSelector) {
        this.container = document.querySelector(toggleSelector);
        this.panel = document.querySelector(panelSelector);
        
        if (this.container) {
            // Create badge
            this.badge = this.container.querySelector('.notification-badge') || this.createBadge();
            
            // Click handler
            this.container.addEventListener('click', () => this.toggle());
            
            this.updateBadge();
        }
        
        if (this.panel) {
            this.renderPanel();
        }
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && this.panel && !this.panel.contains(e.target) && !this.container.contains(e.target)) {
                this.close();
            }
        });
    }

    createBadge() {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        this.container.appendChild(badge);
        return badge;
    }

    /**
     * Add a notification
     * @param {Object} notification - Notification data
     */
    add(notification) {
        const newNotification = {
            id: notification.id || Date.now().toString(),
            type: notification.type || 'info',
            title: notification.title,
            message: notification.message,
            icon: notification.icon,
            link: notification.link,
            timestamp: notification.timestamp || new Date().toISOString(),
            read: notification.read || false,
            data: notification.data || {}
        };
        
        // Add to beginning
        this.notifications.unshift(newNotification);
        
        // Limit notifications
        if (this.notifications.length > this.options.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.options.maxNotifications);
        }
        
        if (!newNotification.read) {
            this.unreadCount++;
        }
        
        this.saveToStorage();
        this.updateBadge();
        this.renderPanel();
        
        // Show toast for new notifications
        toastManager.show(newNotification.message, newNotification.type, {
            title: newNotification.title,
            action: newNotification.link ? () => window.location.href = newNotification.link : null,
            actionText: 'View'
        });
        
        return newNotification;
    }

    /**
     * Mark notification as read
     * @param {string} id - Notification ID
     */
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
            notification.read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.saveToStorage();
            this.updateBadge();
            this.renderPanel();
        }
    }

    /**
     * Mark all as read
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
        this.saveToStorage();
        this.updateBadge();
        this.renderPanel();
    }

    /**
     * Remove a notification
     * @param {string} id - Notification ID
     */
    remove(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index > -1) {
            const notification = this.notifications[index];
            if (!notification.read) {
                this.unreadCount = Math.max(0, this.unreadCount - 1);
            }
            this.notifications.splice(index, 1);
            this.saveToStorage();
            this.updateBadge();
            this.renderPanel();
        }
    }

    /**
     * Clear all notifications
     */
    clear() {
        this.notifications = [];
        this.unreadCount = 0;
        this.saveToStorage();
        this.updateBadge();
        this.renderPanel();
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    /**
     * Open panel
     */
    open() {
        if (this.panel) {
            this.panel.classList.add('notification-panel-open');
            this.isOpen = true;
        }
    }

    /**
     * Close panel
     */
    close() {
        if (this.panel) {
            this.panel.classList.remove('notification-panel-open');
            this.isOpen = false;
        }
    }

    /**
     * Update badge count
     */
    updateBadge() {
        if (this.badge) {
            if (this.unreadCount > 0) {
                this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                this.badge.style.display = 'flex';
            } else {
                this.badge.style.display = 'none';
            }
        }
    }

    /**
     * Render notifications panel
     */
    renderPanel() {
        if (!this.panel) return;
        
        const isEmpty = this.notifications.length === 0;
        
        this.panel.innerHTML = `
            <div class="notification-panel-header">
                <h3>Notifications</h3>
                <div class="notification-panel-actions">
                    ${!isEmpty ? `
                        <button class="btn btn-ghost btn-sm mark-all-read">
                            <i class="fa-solid fa-check-double"></i> Mark all read
                        </button>
                        <button class="btn btn-ghost btn-sm clear-all">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="notification-panel-body">
                ${isEmpty ? `
                    <div class="notification-empty">
                        <i class="fa-solid fa-bell-slash"></i>
                        <p>No notifications</p>
                    </div>
                ` : `
                    <div class="notification-list">
                        ${this.notifications.map(n => this.renderNotificationItem(n)).join('')}
                    </div>
                `}
            </div>
        `;
        
        // Event handlers
        const markAllBtn = this.panel.querySelector('.mark-all-read');
        const clearAllBtn = this.panel.querySelector('.clear-all');
        
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllAsRead());
        }
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clear());
        }
        
        // Individual notification handlers
        this.panel.querySelectorAll('.notification-item').forEach(item => {
            const id = item.dataset.id;
            
            item.addEventListener('click', () => {
                this.markAsRead(id);
                const notification = this.notifications.find(n => n.id === id);
                if (notification) {
                    if (this.options.onNotificationClick) {
                        this.options.onNotificationClick(notification);
                    }
                    if (notification.link) {
                        window.location.href = notification.link;
                    }
                }
            });
            
            const removeBtn = item.querySelector('.notification-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.remove(id);
                });
            }
        });
    }

    /**
     * Render single notification item
     */
    renderNotificationItem(notification) {
        const icon = notification.icon || this.getIconForType(notification.type);
        const timeAgo = this.formatTimeAgo(notification.timestamp);
        
        return `
            <div class="notification-item ${notification.read ? '' : 'notification-unread'}" data-id="${notification.id}">
                <div class="notification-item-icon notification-icon-${notification.type}">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-item-content">
                    <div class="notification-item-title">${this.escapeHtml(notification.title)}</div>
                    <div class="notification-item-message">${this.escapeHtml(notification.message)}</div>
                    <div class="notification-item-time">${timeAgo}</div>
                </div>
                <button class="notification-remove" aria-label="Remove notification">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
    }

    /**
     * Get icon for notification type
     */
    getIconForType(type) {
        const icons = {
            success: 'fa-solid fa-circle-check',
            error: 'fa-solid fa-circle-xmark',
            warning: 'fa-solid fa-triangle-exclamation',
            info: 'fa-solid fa-circle-info',
            achievement: 'fa-solid fa-trophy',
            message: 'fa-solid fa-message',
            appointment: 'fa-solid fa-calendar-check'
        };
        return icons[type] || icons.info;
    }

    /**
     * Format timestamp to relative time
     */
    formatTimeAgo(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Save to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.options.persistKey, JSON.stringify({
                notifications: this.notifications,
                unreadCount: this.unreadCount
            }));
        } catch (e) {
            console.warn('Failed to save notifications to storage:', e);
        }
    }

    /**
     * Load from localStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.options.persistKey);
            if (data) {
                const parsed = JSON.parse(data);
                this.notifications = parsed.notifications || [];
                this.unreadCount = parsed.unreadCount || 0;
            }
        } catch (e) {
            console.warn('Failed to load notifications from storage:', e);
        }
    }
}

// Create notification center instance
const notificationCenter = new NotificationCenter();

// =========================================================
// CONFIRMATION DIALOGS
// =========================================================

const ConfirmDialog = {
    /**
     * Show confirmation dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<boolean>} User's response
     */
    show(options = {}) {
        const {
            title = 'Confirm',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'default', // default, danger, warning
            icon = null
        } = options;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay modal-overlay-active';
            
            const dialog = document.createElement('div');
            dialog.className = `modal modal-sm modal-active`;
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            
            const iconClass = icon || (type === 'danger' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-question');
            const iconColor = type === 'danger' ? 'text-danger' : (type === 'warning' ? 'text-warning' : 'text-primary');
            
            dialog.innerHTML = `
                <div class="modal-content">
                    <div class="modal-body text-center py-6">
                        <div class="mb-4">
                            <i class="${iconClass} text-5xl ${iconColor}"></i>
                        </div>
                        <h3 class="text-lg font-semibold mb-2">${this.escapeHtml(title)}</h3>
                        <p class="text-muted">${this.escapeHtml(message)}</p>
                    </div>
                    <div class="modal-footer justify-center gap-3">
                        <button class="btn btn-ghost cancel-btn">${cancelText}</button>
                        <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'} confirm-btn">${confirmText}</button>
                    </div>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Focus confirm button
            dialog.querySelector('.confirm-btn').focus();
            
            const close = (result) => {
                overlay.classList.remove('modal-overlay-active');
                dialog.classList.remove('modal-active');
                setTimeout(() => overlay.remove(), 200);
                resolve(result);
            };
            
            dialog.querySelector('.confirm-btn').addEventListener('click', () => close(true));
            dialog.querySelector('.cancel-btn').addEventListener('click', () => close(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });
            
            // ESC key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    close(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    },

    /**
     * Shorthand for delete confirmation
     */
    delete(itemName = 'this item') {
        return this.show({
            title: 'Delete Confirmation',
            message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger',
            icon: 'fa-solid fa-trash'
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// =========================================================
// ALERT BANNERS
// =========================================================

const AlertBanner = {
    /**
     * Show alert banner at top of page
     * @param {Object} options - Banner options
     */
    show(options = {}) {
        const {
            message,
            type = 'info', // info, success, warning, error
            dismissible = true,
            action = null,
            actionText = 'Learn more',
            persistent = false,
            id = null
        } = options;
        
        // Check if already dismissed
        if (id && localStorage.getItem(`cogno_alert_dismissed_${id}`)) {
            return null;
        }
        
        // Remove existing banner with same ID
        if (id) {
            const existing = document.querySelector(`.alert-banner[data-id="${id}"]`);
            if (existing) existing.remove();
        }
        
        const banner = document.createElement('div');
        banner.className = `alert-banner alert-banner-${type}`;
        if (id) banner.dataset.id = id;
        
        const icon = {
            info: 'fa-solid fa-circle-info',
            success: 'fa-solid fa-circle-check',
            warning: 'fa-solid fa-triangle-exclamation',
            error: 'fa-solid fa-circle-xmark'
        }[type];
        
        banner.innerHTML = `
            <div class="alert-banner-content">
                <i class="${icon} alert-banner-icon"></i>
                <span class="alert-banner-message">${this.escapeHtml(message)}</span>
                ${action ? `<button class="alert-banner-action">${actionText}</button>` : ''}
            </div>
            ${dismissible ? `
                <button class="alert-banner-close" aria-label="Dismiss">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            ` : ''}
        `;
        
        // Insert at top of body or after header
        const header = document.querySelector('header, .navbar');
        if (header) {
            header.after(banner);
        } else {
            document.body.insertBefore(banner, document.body.firstChild);
        }
        
        // Event handlers
        if (dismissible) {
            banner.querySelector('.alert-banner-close').addEventListener('click', () => {
                this.dismiss(banner, persistent ? id : null);
            });
        }
        
        if (action) {
            banner.querySelector('.alert-banner-action').addEventListener('click', action);
        }
        
        return banner;
    },
    
    /**
     * Dismiss banner
     */
    dismiss(banner, persistId = null) {
        banner.classList.add('alert-banner-hide');
        setTimeout(() => banner.remove(), 300);
        
        if (persistId) {
            localStorage.setItem(`cogno_alert_dismissed_${persistId}`, 'true');
        }
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// =========================================================
// EXPORT
// =========================================================

window.CognoNotifications = {
    // Toast manager
    toast: toastManager,
    show: (msg, type, opts) => toastManager.show(msg, type, opts),
    success: (msg, opts) => toastManager.success(msg, opts),
    error: (msg, opts) => toastManager.error(msg, opts),
    warning: (msg, opts) => toastManager.warning(msg, opts),
    info: (msg, opts) => toastManager.info(msg, opts),
    
    // Notification center
    center: notificationCenter,
    add: (notif) => notificationCenter.add(notif),
    
    // Confirmation dialogs
    confirm: (opts) => ConfirmDialog.show(opts),
    confirmDelete: (itemName) => ConfirmDialog.delete(itemName),
    
    // Alert banners
    banner: AlertBanner,
    showBanner: (opts) => AlertBanner.show(opts)
};

// Log initialization
console.log('🔔 Cogno Notifications initialized');

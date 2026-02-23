/**
 * COGNO SOLUTION - Utility Functions
 * Common helper functions used throughout the application
 */

// =========================================================
// DATE & TIME UTILITIES
// =========================================================

const DateUtils = {
    /**
     * Format date to readable string
     * @param {string|Date} date - Date to format
     * @param {string} format - Format type (short, long, time, datetime)
     * @returns {string} Formatted date
     */
    format(date, format = 'short') {
        const d = new Date(date);
        const options = {
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            datetime: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
            relative: null // Handled separately
        };
        
        if (format === 'relative') {
            return this.relative(d);
        }
        
        return d.toLocaleDateString('en-US', options[format] || options.short);
    },

    /**
     * Get relative time (e.g., "2 hours ago")
     * @param {string|Date} date - Date to compare
     * @returns {string} Relative time string
     */
    relative(date) {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return this.format(d, 'short');
    },

    /**
     * Check if date is today
     */
    isToday(date) {
        const d = new Date(date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    },

    /**
     * Get start of day
     */
    startOfDay(date = new Date()) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    /**
     * Get start of week
     */
    startOfWeek(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    /**
     * Get days between two dates
     */
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.floor((d2 - d1) / 86400000);
    },

    /**
     * Format duration in seconds to MM:SS
     */
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
};

// =========================================================
// NUMBER UTILITIES
// =========================================================

const NumberUtils = {
    /**
     * Format number with commas
     */
    format(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Format percentage
     */
    percentage(value, total, decimals = 0) {
        if (total === 0) return '0%';
        return ((value / total) * 100).toFixed(decimals) + '%';
    },

    /**
     * Clamp number between min and max
     */
    clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    },

    /**
     * Generate random integer between min and max (inclusive)
     */
    random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Round to decimal places
     */
    round(num, decimals = 2) {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${this.round(bytes, 1)} ${units[i]}`;
    },

    /**
     * Format points with abbreviation (1K, 1M)
     */
    abbreviate(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
};

// =========================================================
// STRING UTILITIES
// =========================================================

const StringUtils = {
    /**
     * Capitalize first letter
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Title case
     */
    titleCase(str) {
        return str.split(' ').map(word => this.capitalize(word)).join(' ');
    },

    /**
     * Truncate text with ellipsis
     */
    truncate(str, length = 100, ending = '...') {
        if (str.length <= length) return str;
        return str.substring(0, length - ending.length) + ending;
    },

    /**
     * Slugify string
     */
    slugify(str) {
        return str
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    /**
     * Generate random string
     */
    random(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    },

    /**
     * Escape HTML entities
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Get initials from name
     */
    initials(name, count = 2) {
        return name
            .split(' ')
            .slice(0, count)
            .map(word => word.charAt(0).toUpperCase())
            .join('');
    },

    /**
     * Check if string is valid email
     */
    isEmail(str) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    }
};

// =========================================================
// DOM UTILITIES
// =========================================================

const DOMUtils = {
    /**
     * Query selector shorthand
     */
    $(selector, parent = document) {
        return parent.querySelector(selector);
    },

    /**
     * Query selector all shorthand
     */
    $$(selector, parent = document) {
        return [...parent.querySelectorAll(selector)];
    },

    /**
     * Create element with attributes
     */
    createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    el.dataset[dataKey] = dataValue;
                });
            } else if (key.startsWith('on')) {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                el.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                el.appendChild(child);
            }
        });
        
        return el;
    },

    /**
     * Add event listener with cleanup
     */
    on(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        return () => element.removeEventListener(event, handler, options);
    },

    /**
     * Wait for DOM ready
     */
    ready(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    },

    /**
     * Show element
     */
    show(element) {
        element.style.display = '';
        element.hidden = false;
    },

    /**
     * Hide element
     */
    hide(element) {
        element.style.display = 'none';
        element.hidden = true;
    },

    /**
     * Toggle element visibility
     */
    toggle(element, show) {
        if (show === undefined) {
            show = element.style.display === 'none';
        }
        show ? this.show(element) : this.hide(element);
    },

    /**
     * Add class
     */
    addClass(element, ...classes) {
        element.classList.add(...classes);
    },

    /**
     * Remove class
     */
    removeClass(element, ...classes) {
        element.classList.remove(...classes);
    },

    /**
     * Toggle class
     */
    toggleClass(element, className, force) {
        return element.classList.toggle(className, force);
    },

    /**
     * Scroll to element
     */
    scrollTo(element, options = {}) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            ...options
        });
    },

    /**
     * Get form data as object
     */
    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            if (data[key]) {
                data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
            } else {
                data[key] = value;
            }
        });
        return data;
    },

    /**
     * Set form data from object
     */
    setFormData(form, data) {
        Object.entries(data).forEach(([key, value]) => {
            const field = form.elements[key];
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = Boolean(value);
                } else if (field.type === 'radio') {
                    const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
                    if (radio) radio.checked = true;
                } else {
                    field.value = value;
                }
            }
        });
    }
};

// =========================================================
// STORAGE UTILITIES
// =========================================================

const StorageUtils = {
    /**
     * Get item from localStorage with JSON parse
     */
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    /**
     * Set item in localStorage with JSON stringify
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Remove item from localStorage
     */
    remove(key) {
        localStorage.removeItem(key);
    },

    /**
     * Clear all localStorage
     */
    clear() {
        localStorage.clear();
    },

    /**
     * Get item from sessionStorage
     */
    getSession(key, defaultValue = null) {
        try {
            const value = sessionStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    /**
     * Set item in sessionStorage
     */
    setSession(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }
};

// =========================================================
// VALIDATION UTILITIES
// =========================================================

const ValidationUtils = {
    /**
     * Check if value is empty
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    /**
     * Validate email
     */
    isEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /**
     * Validate password strength
     * Returns: { valid: boolean, score: number, issues: string[] }
     */
    validatePassword(password) {
        const issues = [];
        let score = 0;
        
        if (password.length >= 8) score++;
        else issues.push('At least 8 characters');
        
        if (/[A-Z]/.test(password)) score++;
        else issues.push('At least one uppercase letter');
        
        if (/[a-z]/.test(password)) score++;
        else issues.push('At least one lowercase letter');
        
        if (/[0-9]/.test(password)) score++;
        else issues.push('At least one number');
        
        if (/[^A-Za-z0-9]/.test(password)) score++;
        else issues.push('At least one special character');
        
        return {
            valid: score >= 4,
            score,
            issues
        };
    },

    /**
     * Validate age (for children: 4-18 years)
     */
    isValidChildAge(birthDate) {
        const age = DateUtils.daysBetween(birthDate, new Date()) / 365;
        return age >= 4 && age <= 18;
    },

    /**
     * Validate phone number
     */
    isPhone(phone) {
        return /^\+?[\d\s-()]{10,}$/.test(phone);
    }
};

// =========================================================
// DEBOUNCE & THROTTLE
// =========================================================

/**
 * Debounce function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// =========================================================
// ASYNC UTILITIES
// =========================================================

const AsyncUtils = {
    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Retry function with exponential backoff
     */
    async retry(fn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await this.sleep(delay * Math.pow(2, i));
            }
        }
    },

    /**
     * Execute functions in sequence
     */
    async sequence(functions) {
        const results = [];
        for (const fn of functions) {
            results.push(await fn());
        }
        return results;
    },

    /**
     * Execute with timeout
     */
    async withTimeout(promise, ms) {
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), ms)
        );
        return Promise.race([promise, timeout]);
    }
};

// =========================================================
// COLOR UTILITIES
// =========================================================

const ColorUtils = {
    /**
     * Module colors map
     */
    moduleColors: {
        dyslexia: { primary: '#3B82F6', bg: '#EFF6FF' },
        dyscalculia: { primary: '#10B981', bg: '#ECFDF5' },
        dysgraphia: { primary: '#F59E0B', bg: '#FFFBEB' },
        dyspraxia: { primary: '#EF4444', bg: '#FEF2F2' }
    },

    /**
     * Get module color
     */
    getModuleColor(module, type = 'primary') {
        return this.moduleColors[module]?.[type] || '#6B7280';
    },

    /**
     * Generate avatar color from name
     */
    avatarColor(name) {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }
};

// =========================================================
// URL UTILITIES
// =========================================================

const URLUtils = {
    /**
     * Get query parameter
     */
    getParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    },

    /**
     * Get all query parameters
     */
    getParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        params.forEach((value, key) => result[key] = value);
        return result;
    },

    /**
     * Set query parameter
     */
    setParam(name, value) {
        const url = new URL(window.location.href);
        url.searchParams.set(name, value);
        window.history.replaceState({}, '', url);
    },

    /**
     * Remove query parameter
     */
    removeParam(name) {
        const url = new URL(window.location.href);
        url.searchParams.delete(name);
        window.history.replaceState({}, '', url);
    },

    /**
     * Build URL with params
     */
    build(base, params = {}) {
        const url = new URL(base, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.set(key, value);
            }
        });
        return url.toString();
    }
};

// =========================================================
// MEDIA UTILITIES
// =========================================================

const MediaUtils = {
    /**
     * Check if device has camera
     */
    async hasCamera() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch {
            return false;
        }
    },

    /**
     * Check if device has microphone
     */
    async hasMicrophone() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'audioinput');
        } catch {
            return false;
        }
    },

    /**
     * Request camera permission
     */
    async requestCamera(constraints = { video: true }) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            return { success: true, stream };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Capture frame from video element
     */
    captureFrame(videoElement) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0);
        return canvas;
    },

    /**
     * Canvas to blob
     */
    async canvasToBlob(canvas, type = 'image/jpeg', quality = 0.8) {
        return new Promise(resolve => {
            canvas.toBlob(resolve, type, quality);
        });
    },

    /**
     * Play audio
     */
    playAudio(src) {
        const audio = new Audio(src);
        return audio.play();
    },

    /**
     * Play success sound
     */
    playSuccess() {
        const basePath = typeof CognoPaths !== 'undefined' ? CognoPaths.getBasePath() : '../';
        return this.playAudio(basePath + 'assets/audio/success.mp3');
    },

    /**
     * Play error sound
     */
    playError() {
        const basePath = typeof CognoPaths !== 'undefined' ? CognoPaths.getBasePath() : '../';
        return this.playAudio(basePath + 'assets/audio/error.mp3');
    }
};

// =========================================================
// COPY TO CLIPBOARD
// =========================================================

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    }
}

// =========================================================
// EXPORT ALL UTILITIES
// =========================================================
window.CognoUtils = {
    Date: DateUtils,
    Number: NumberUtils,
    String: StringUtils,
    DOM: DOMUtils,
    Storage: StorageUtils,
    Validation: ValidationUtils,
    Async: AsyncUtils,
    Color: ColorUtils,
    URL: URLUtils,
    Media: MediaUtils,
    debounce,
    throttle,
    copyToClipboard
};

// Shorthand exports
window.$ = DOMUtils.$;
window.$$ = DOMUtils.$$;

// Log initialization
console.log('🔧 Cogno Utils initialized');

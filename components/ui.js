/**
 * Cogno Solution - Shared UI Components
 * Reusable JavaScript components for the application
 */

// ==================== TOAST NOTIFICATIONS ====================
const Toast = {
    container: null,
    
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
            document.body.appendChild(this.container);
        }
    },
    
    show(message, type = 'info', duration = 3000) {
        this.init();
        
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform translate-x-full transition-transform duration-300`;
        toast.innerHTML = `
            <span class="text-lg">${icons[type]}</span>
            <span>${message}</span>
        `;
        
        this.container.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.remove('translate-x-full'), 10);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    warning(message) { this.show(message, 'warning'); },
    info(message) { this.show(message, 'info'); }
};

// ==================== MODAL COMPONENT ====================
const Modal = {
    show(options) {
        const { title, content, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', showCancel = true } = options;
        
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 opacity-0 transition-opacity duration-300';
        
        backdrop.innerHTML = `
            <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 transform scale-95 transition-transform duration-300" id="modal-content">
                <h3 class="text-xl font-bold text-gray-800 mb-4">${title}</h3>
                <div class="text-gray-600 mb-6">${content}</div>
                <div class="flex justify-end gap-3">
                    ${showCancel ? `<button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300" id="modal-cancel">${cancelText}</button>` : ''}
                    <button class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" id="modal-confirm">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(backdrop);
        
        // Animate in
        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            backdrop.querySelector('#modal-content').classList.remove('scale-95');
        }, 10);
        
        const close = () => {
            backdrop.classList.add('opacity-0');
            backdrop.querySelector('#modal-content').classList.add('scale-95');
            setTimeout(() => backdrop.remove(), 300);
        };
        
        backdrop.querySelector('#modal-confirm')?.addEventListener('click', () => {
            if (onConfirm) onConfirm();
            close();
        });
        
        backdrop.querySelector('#modal-cancel')?.addEventListener('click', () => {
            if (onCancel) onCancel();
            close();
        });
        
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) close();
        });
        
        return { close };
    },
    
    confirm(title, message) {
        return new Promise((resolve) => {
            this.show({
                title,
                content: message,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    },
    
    alert(title, message) {
        return new Promise((resolve) => {
            this.show({
                title,
                content: message,
                showCancel: false,
                confirmText: 'OK',
                onConfirm: () => resolve()
            });
        });
    }
};

// ==================== LOADING SPINNER ====================
const Loader = {
    element: null,
    
    show(message = 'Loading...') {
        if (this.element) return;
        
        this.element = document.createElement('div');
        this.element.className = 'fixed inset-0 bg-white/80 flex items-center justify-center z-50';
        this.element.innerHTML = `
            <div class="text-center">
                <div class="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p class="text-gray-600">${message}</p>
            </div>
        `;
        document.body.appendChild(this.element);
    },
    
    hide() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
};

// ==================== DROPDOWN COMPONENT ====================
function createDropdown(trigger, items, onSelect) {
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48 z-40 hidden';
    
    items.forEach(item => {
        if (item.divider) {
            const divider = document.createElement('hr');
            divider.className = 'my-2 border-gray-200';
            dropdown.appendChild(divider);
        } else {
            const option = document.createElement('button');
            option.className = 'w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2';
            option.innerHTML = `${item.icon || ''} ${item.label}`;
            option.addEventListener('click', () => {
                onSelect(item.value);
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(option);
        }
    });
    
    trigger.parentElement.style.position = 'relative';
    trigger.parentElement.appendChild(dropdown);
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });
    
    document.addEventListener('click', () => dropdown.classList.add('hidden'));
    
    return dropdown;
}

// ==================== TABS COMPONENT ====================
function initTabs(container) {
    const tabs = container.querySelectorAll('[data-tab]');
    const panels = container.querySelectorAll('[data-panel]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('border-purple-500', 'text-purple-600'));
            tab.classList.add('border-purple-500', 'text-purple-600');
            
            panels.forEach(panel => {
                panel.classList.toggle('hidden', panel.dataset.panel !== target);
            });
        });
    });
}

// ==================== FORM VALIDATION ====================
const FormValidator = {
    rules: {
        required: (value) => value.trim() !== '' || 'This field is required',
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email',
        minLength: (min) => (value) => value.length >= min || `Must be at least ${min} characters`,
        maxLength: (max) => (value) => value.length <= max || `Must be at most ${max} characters`,
        password: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value) || 'Password must be 8+ chars with uppercase, lowercase, and number',
        match: (fieldId) => (value) => value === document.getElementById(fieldId)?.value || 'Fields do not match'
    },
    
    validate(form, rules) {
        const errors = {};
        let isValid = true;
        
        Object.entries(rules).forEach(([field, fieldRules]) => {
            const input = form.querySelector(`[name="${field}"]`);
            if (!input) return;
            
            const value = input.value;
            
            fieldRules.forEach(rule => {
                const result = typeof rule === 'function' ? rule(value) : this.rules[rule](value);
                if (result !== true) {
                    errors[field] = result;
                    isValid = false;
                    input.classList.add('border-red-500');
                } else {
                    input.classList.remove('border-red-500');
                }
            });
        });
        
        return { isValid, errors };
    }
};

// ==================== COPY TO CLIPBOARD ====================
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        Toast.success('Copied to clipboard!');
        return true;
    } catch (err) {
        Toast.error('Failed to copy');
        return false;
    }
}

// ==================== FORMAT HELPERS ====================
const Formatters = {
    date(date, format = 'short') {
        const d = new Date(date);
        const options = {
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            datetime: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        };
        return d.toLocaleDateString('en-US', options[format] || options.short);
    },
    
    relativeTime(date) {
        const now = new Date();
        const d = new Date(date);
        const diff = Math.floor((now - d) / 1000);
        
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
        return this.date(date);
    },
    
    number(num) {
        return new Intl.NumberFormat().format(num);
    },
    
    percentage(value, total) {
        return Math.round((value / total) * 100) + '%';
    },
    
    duration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// ==================== LOCAL STORAGE HELPERS ====================
const Storage = {
    set(key, value, expiresInDays = null) {
        const item = {
            value,
            timestamp: Date.now(),
            expires: expiresInDays ? Date.now() + (expiresInDays * 86400000) : null
        };
        localStorage.setItem(`cogno_${key}`, JSON.stringify(item));
    },
    
    get(key, defaultValue = null) {
        const item = localStorage.getItem(`cogno_${key}`);
        if (!item) return defaultValue;
        
        try {
            const parsed = JSON.parse(item);
            if (parsed.expires && Date.now() > parsed.expires) {
                this.remove(key);
                return defaultValue;
            }
            return parsed.value;
        } catch {
            return defaultValue;
        }
    },
    
    remove(key) {
        localStorage.removeItem(`cogno_${key}`);
    },
    
    clear() {
        Object.keys(localStorage)
            .filter(key => key.startsWith('cogno_'))
            .forEach(key => localStorage.removeItem(key));
    }
};

// ==================== ACCESSIBILITY HELPERS ====================
const A11y = {
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    },
    
    trapFocus(element) {
        const focusable = element.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }
};

// ==================== DEBOUNCE/THROTTLE ====================
function debounce(func, wait) {
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

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Toast, Modal, Loader, FormValidator, Formatters, Storage, A11y, debounce, throttle, copyToClipboard, createDropdown, initTabs };
}

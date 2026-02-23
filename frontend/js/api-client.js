/**
 * COGNO SOLUTION - API Client
 * Handles API calls to backend for features that require server-side processing
 * (Dyspraxia camera processing, AI text simplification, email notifications)
 */

// =========================================================
// CONFIGURATION
// =========================================================
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api';

const API_TIMEOUT = 30000; // 30 seconds

// =========================================================
// API CLIENT CLASS
// =========================================================
class APIClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get authorization header with current session token
     * @returns {Promise<Object>} Headers with auth token
     */
    async getAuthHeaders() {
        const { session } = await CognoSupabase.getSession();

        if (session?.access_token) {
            return {
                ...this.defaultHeaders,
                'Authorization': `Bearer ${session.access_token}`
            };
        }

        return this.defaultHeaders;
    }

    /**
     * Make API request with timeout and error handling
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} API response
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        try {
            const headers = await this.getAuthHeaders();

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Parse response
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                return { success: false, error: 'Request timeout' };
            }

            console.error(`API Error [${endpoint}]:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * POST with FormData (for file uploads)
     */
    async postFormData(endpoint, formData) {
        const headers = await this.getAuthHeaders();
        delete headers['Content-Type']; // Let browser set it with boundary

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT * 2);

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers,
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            clearTimeout(timeoutId);
            console.error(`API FormData Error [${endpoint}]:`, error);
            return { success: false, error: error.message };
        }
    }
}

// Create API instance
const api = new APIClient();

// =========================================================
// DYSPRAXIA MODULE API
// Requires backend for OpenCV/MediaPipe processing
// =========================================================

const DyspraxiaAPI = {
    /**
     * Process video frame for movement analysis
     * @param {Blob} frameBlob - Video frame as blob
     * @param {string} exerciseType - Type of exercise
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeFrame(frameBlob, exerciseType) {
        const formData = new FormData();
        formData.append('frame', frameBlob, 'frame.jpg');
        formData.append('exercise_type', exerciseType);

        return api.postFormData('/dyspraxia/analyze-frame', formData);
    },

    /**
     * Start a new movement exercise session
     * @param {string} exerciseId - Exercise ID
     * @returns {Promise<Object>} Session info
     */
    async startSession(exerciseId) {
        return api.post('/dyspraxia/session/start', { exercise_id: exerciseId });
    },

    /**
     * End movement exercise session and get results
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Session results
     */
    async endSession(sessionId) {
        return api.post('/dyspraxia/session/end', { session_id: sessionId });
    },

    /**
     * Get exercise recommendations based on progress
     * @param {string} childId - Child user ID
     * @returns {Promise<Object>} Recommendations
     */
    async getRecommendations(childId) {
        return api.get('/dyspraxia/recommendations', { child_id: childId });
    },

    /**
     * Get movement patterns analysis
     * @param {string} childId - Child user ID
     * @param {number} days - Number of days to analyze
     * @returns {Promise<Object>} Patterns data
     */
    async getMovementPatterns(childId, days = 30) {
        return api.get('/dyspraxia/patterns', { child_id: childId, days });
    }
};

// =========================================================
// AI TEXT PROCESSING API
// Text simplification for dyslexia support
// =========================================================

const TextProcessingAPI = {
    /**
     * Simplify text for easier reading
     * @param {string} text - Text to simplify
     * @param {string} level - Simplification level (basic, intermediate, advanced)
     * @returns {Promise<Object>} Simplified text
     */
    async simplifyText(text, level = 'intermediate') {
        return api.post('/text/simplify', { text, level });
    },

    /**
     * Get word definitions for difficult words
     * @param {Array<string>} words - Words to define
     * @returns {Promise<Object>} Definitions
     */
    async getDefinitions(words) {
        return api.post('/text/definitions', { words });
    },

    /**
     * Break text into syllables
     * @param {string} text - Text to process
     * @returns {Promise<Object>} Syllabified text
     */
    async syllabifyText(text) {
        return api.post('/text/syllabify', { text });
    },

    /**
     * Get reading level assessment
     * @param {string} text - Text to assess
     * @returns {Promise<Object>} Reading level info
     */
    async assessReadingLevel(text) {
        return api.post('/text/reading-level', { text });
    },

    /**
     * Generate word suggestions for spelling
     * @param {string} word - Partial or misspelled word
     * @returns {Promise<Object>} Suggestions
     */
    async getSpellingSuggestions(word) {
        return api.get('/text/spelling-suggestions', { word });
    }
};

// =========================================================
// HANDWRITING ANALYSIS API (Dysgraphia)
// =========================================================

const HandwritingAPI = {
    /**
     * Analyze handwriting from canvas image
     * @param {Blob} imageBlob - Canvas image as blob
     * @param {string} expectedText - Expected text (for comparison)
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeHandwriting(imageBlob, expectedText) {
        const formData = new FormData();
        formData.append('image', imageBlob, 'handwriting.png');
        formData.append('expected_text', expectedText);

        return api.postFormData('/dysgraphia/analyze', formData);
    },

    /**
     * Get letter formation feedback
     * @param {Blob} imageBlob - Canvas image of letter
     * @param {string} targetLetter - Letter being practiced
     * @returns {Promise<Object>} Feedback
     */
    async getLetterFeedback(imageBlob, targetLetter) {
        const formData = new FormData();
        formData.append('image', imageBlob, 'letter.png');
        formData.append('target_letter', targetLetter);

        return api.postFormData('/dysgraphia/letter-feedback', formData);
    },

    /**
     * Get handwriting progress report
     * @param {string} childId - Child user ID
     * @returns {Promise<Object>} Progress report
     */
    async getProgressReport(childId) {
        return api.get('/dysgraphia/progress', { child_id: childId });
    }
};

// =========================================================
// EMAIL NOTIFICATION API
// =========================================================

const EmailAPI = {
    /**
     * Send consultation reminder
     */
    async sendConsultationReminder(userName, email, doctorName, dateTime) {
        return api.post('/email/consultation-reminder', {
            user_name: userName,
            email: email,
            doctor_name: doctorName,
            date_time: dateTime
        });
    },

    /**
     * Send progress report email
     */
    async sendProgressReport(childId, email) {
        return api.get('/reports/progress', {
            user_id: childId,
            email: 'true',
            recipient_email: email
        });
    },

    /**
     * Send achievement notification
     */
    async sendAchievementNotification(userName, email, title, description) {
        return api.post('/email/achievement', {
            user_name: userName,
            email: email,
            title: title,
            description: description
        });
    },

    /**
     * Send login notification
     */
    async sendLoginNotification(userName, email, deviceInfo) {
        return api.post('/email/login-notification', {
            user_name: userName,
            email: email,
            device_info: deviceInfo
        });
    },

    /**
     * Test email configuration
     */
    async testEmail(email) {
        return api.post('/email/test', { email });
    }
};

// =========================================================
// REPORTS API
// =========================================================

const ReportsAPI = {
    /**
     * Generate PDF progress report
     * @param {string} childId - Child user ID
     * @param {Object} options - Report options
     * @returns {Promise<Blob>} PDF blob
     */
    async generateProgressPDF(childId, options = {}) {
        const response = await api.post('/reports/progress-pdf', {
            child_id: childId,
            ...options
        });

        if (response.success && response.data.pdf_url) {
            // Fetch the PDF
            const pdfResponse = await fetch(response.data.pdf_url);
            return { success: true, blob: await pdfResponse.blob() };
        }

        return response;
    },

    /**
     * Get analytics summary
     * @param {string} childId - Child user ID
     * @param {string} period - Time period (week, month, year)
     * @returns {Promise<Object>} Analytics data
     */
    async getAnalyticsSummary(childId, period = 'month') {
        return api.get('/reports/analytics', { child_id: childId, period });
    },

    /**
     * Get doctor's assessment report
     * @param {string} childId - Child user ID
     * @returns {Promise<Object>} Assessment report
     */
    async getDoctorAssessment(childId) {
        return api.get('/reports/doctor-assessment', { child_id: childId });
    }
};

// =========================================================
// ADMIN API
// =========================================================

const AdminAPI = {
    /**
     * Get system stats
     * @returns {Promise<Object>} Stats
     */
    async getSystemStats() {
        return api.get('/admin/stats');
    },

    /**
     * Get all users (with pagination)
     * @param {Object} params - Query params
     * @returns {Promise<Object>} Users list
     */
    async getUsers(params = {}) {
        return api.get('/admin/users', params);
    },

    /**
     * Update user status
     * @param {string} userId - User ID
     * @param {string} status - New status
     * @returns {Promise<Object>} Response
     */
    async updateUserStatus(userId, status) {
        return api.put(`/admin/users/${userId}/status`, { status });
    },

    /**
     * Get activity logs
     * @param {Object} params - Query params
     * @returns {Promise<Object>} Logs
     */
    async getActivityLogs(params = {}) {
        return api.get('/admin/activity-logs', params);
    },

    /**
     * Generate content (games, exercises)
     * @param {string} type - Content type
     * @param {Object} data - Content data
     * @returns {Promise<Object>} Created content
     */
    async createContent(type, data) {
        return api.post(`/admin/content/${type}`, data);
    }
};

// =========================================================
// HEALTH CHECK
// =========================================================

async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        return {
            success: response.ok,
            status: data.status,
            version: data.version
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// =========================================================
// EXPORT
// =========================================================
window.CognoAPI = {
    // Base client
    client: api,

    // Module APIs
    Dyspraxia: DyspraxiaAPI,
    TextProcessing: TextProcessingAPI,
    Handwriting: HandwritingAPI,
    Email: EmailAPI,
    Reports: ReportsAPI,
    Admin: AdminAPI,

    // Utilities
    checkHealth: checkAPIHealth,

    // Constants
    BASE_URL: API_BASE_URL,
    TIMEOUT: API_TIMEOUT
};

// Log initialization
console.log('🌐 Cogno API Client initialized');

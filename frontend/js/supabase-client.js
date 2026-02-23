/**
 * COGNO SOLUTION - Supabase Client Configuration
 * Initialize and export Supabase client for all frontend operations
 */

// =========================================================
// PATH HELPER - Calculates base path dynamically
// =========================================================
const CognoPaths = {
    // Get base path to frontend folder
    getBasePath() {
        const path = window.location.pathname;
        // Find how deep we are from frontend folder
        const parts = path.split('/').filter(p => p);
        const frontendIndex = parts.indexOf('frontend');

        if (frontendIndex === -1) {
            // Not in frontend folder, assume root is frontend
            const depth = parts.length - 1; // -1 for the current file
            return '../'.repeat(Math.max(0, depth)) || './';
        }

        // Calculate depth from frontend folder
        const depth = parts.length - frontendIndex - 2; // -2 for frontend and current file
        return '../'.repeat(Math.max(0, depth)) || './';
    },

    // Get path to specific location
    auth: {
        // Always return absolute path from /frontend/
        login: () => '/frontend/auth/login.html',
        register: () => '/frontend/auth/register.html',
        verifyEmail: () => '/frontend/auth/verify-email.html',
        resetPassword: () => '/frontend/auth/reset-password.html'
    },
    dashboard: {
        index: () => CognoPaths.getBasePath() + 'dashboard/',
        child: () => CognoPaths.getBasePath() + 'dashboard/child-dashboard.html',
        parent: () => CognoPaths.getBasePath() + 'dashboard/parent-dashboard.html',
        doctor: () => CognoPaths.getBasePath() + 'doctor/dashboard.html',
        admin: () => CognoPaths.getBasePath() + 'dashboard/admin-dashboard.html',
        forRole: (role) => {
            const map = {
                student: CognoPaths.dashboard.child,
                child: CognoPaths.dashboard.child,
                parent: CognoPaths.dashboard.parent,
                doctor: CognoPaths.dashboard.doctor,
                admin: CognoPaths.dashboard.admin
            };
            return (map[role] || map.student)();
        }
    },
    modules: {
        index: () => CognoPaths.getBasePath() + 'modules/',
        dyslexia: () => CognoPaths.getBasePath() + 'modules/dyslexia/',
        dyscalculia: () => CognoPaths.getBasePath() + 'modules/dyscalculia/',
        dysgraphia: () => CognoPaths.getBasePath() + 'modules/dysgraphia/',
        dyspraxia: () => CognoPaths.getBasePath() + 'modules/dyspraxia/'
    },
    doctor: () => CognoPaths.getBasePath() + 'doctor/',
    progress: () => CognoPaths.getBasePath() + 'progress/',
    profile: () => CognoPaths.getBasePath() + 'profile/',
    settings: () => CognoPaths.getBasePath() + 'settings/'
};

// Make paths globally available
window.CognoPaths = CognoPaths;

// =========================================================
// SUPABASE CONFIGURATION
// Cogno Solution - Production Credentials
// =========================================================
const SUPABASE_URL = 'https://uebxekueqiqucplaihuz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYnhla3VlcWlxdWNwbGFpaHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzU0NTMsImV4cCI6MjA4NTk1MTQ1M30.Dg15ARo8xX1VktNA451GuvgSxqwpKTzASQta6sL2gzo';

// =========================================================
// SUPABASE CLIENT INITIALIZATION
// =========================================================
const { createClient } = supabase;

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// =========================================================
// AUTH HELPER FUNCTIONS
// =========================================================

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} metadata - Additional user metadata (role, name, etc.)
 * @returns {Promise<Object>} - Auth response
 */
async function signUp(email, password, metadata = {}) {
    try {
        // Build correct redirect URL based on current location
        const currentPath = window.location.pathname;
        const frontendIndex = currentPath.indexOf('/frontend/');
        let basePath = '';
        if (frontendIndex !== -1) {
            basePath = currentPath.substring(0, frontendIndex + '/frontend'.length);
        } else if (currentPath.includes('/auth/') || currentPath.includes('/dashboard/')) {
            // Already in frontend subfolder
            basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            basePath = basePath.substring(0, basePath.lastIndexOf('/'));
        }
        const redirectUrl = `${window.location.origin}${basePath}/auth/verify-email.html`;

        console.log('SignUp - Redirect URL:', redirectUrl);

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: metadata.fullName || '',
                    role: metadata.role || 'student',
                    avatar_url: metadata.avatarUrl || ''
                },
                emailRedirectTo: redirectUrl
            }
        });

        console.log('SignUp - Response:', { data, error });

        if (error) throw error;

        // Create profile row for new user (with required email field)
        if (data?.user) {
            console.log('SignUp - Creating profile for user:', data.user.id);

            const profileData = {
                id: data.user.id,
                email: email, // IMPORTANT: Always include email (required field)
                full_name: metadata.fullName || '',
                display_name: metadata.fullName?.split(' ')[0] || '',
                role: metadata.role || 'student',
                avatar_url: metadata.avatarUrl || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Add doctor-specific fields if role is doctor
            if (metadata.role === 'doctor') {
                profileData.specialization = metadata.specialization || 'General Specialist';
                profileData.bio = 'Experienced specialist in learning disabilities and child development.';
                profileData.years_experience = 1;
                profileData.consultation_fee = 500.00;
                profileData.is_available = true;

                // Add "Dr." prefix if not already present
                if (profileData.full_name && !profileData.full_name.startsWith('Dr.')) {
                    profileData.full_name = 'Dr. ' + profileData.full_name;
                    profileData.display_name = 'Dr. ' + metadata.fullName?.split(' ')[0];
                }
            }

            // Try to create profile (upsert in case it already exists)
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .upsert(profileData, { onConflict: 'id' })
                .select();

            if (profileError) {
                console.warn('SignUp - Profile creation warning:', profileError);
                // Don't throw - profile will be created on first access
            } else {
                console.log('SignUp - Profile created successfully');

                // The database trigger will automatically add doctors to platform_doctors
                // and set up their default availability
            }
        }

        // Check if email confirmation is required
        if (data?.user && !data?.session) {
            console.log('SignUp - Email confirmation required, check inbox');
        } else if (data?.session) {
            console.log('SignUp - Auto-confirmed (no email verification needed)');
        }

        return { success: true, data };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Auth response
 */
async function signIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Log activity
        await logActivity('login', { method: 'email' });

        return { success: true, data };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sign in with Google OAuth
 * @returns {Promise<Object>} - Auth response
 */
async function signInWithGoogle() {
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback.html`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Google sign in error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sign out the current user
 * @returns {Promise<Object>} - Auth response
 */
async function signOut() {
    try {
        // Log activity before signing out
        await logActivity('logout', {});

        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        // Clear local storage
        localStorage.removeItem('cogno_user_preferences');

        // Redirect to login page
        window.location.href = CognoPaths.auth.login();

        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<Object>} - Response
 */
async function resetPassword(email) {
    try {
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password.html`
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Response
 */
async function updatePassword(newPassword) {
    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Update password error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get current session
 * @returns {Promise<Object>} - Session data
 */
async function getSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) throw error;
        return { success: true, session };
    } catch (error) {
        console.error('Get session error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get current user
 * @returns {Promise<Object>} - User data
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();

        if (error) throw error;

        if (user) {
            // Fetch full profile from profiles table
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Profile fetch error:', profileError);
            }

            return {
                success: true,
                user: { ...user, profile: profile || null }
            };
        }

        return { success: true, user: null };
    } catch (error) {
        console.error('Get current user error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function
 * @returns {Object} - Subscription
 */
function onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// =========================================================
// USER PROFILE FUNCTIONS
// =========================================================

/**
 * Get user profile from profiles table
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Profile data or null
 */
async function getProfile(userId) {
    try {
        console.log('getProfile - Fetching profile for:', userId);

        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        console.log('getProfile - Result:', { data, error });

        if (error && error.code === 'PGRST116') {
            // Profile doesn't exist, create one from auth metadata
            console.log('getProfile - Profile not found, creating from auth metadata...');
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                const newProfile = {
                    id: userId,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    role: user.user_metadata?.role || 'student',
                    avatar_url: user.user_metadata?.avatar_url || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                console.log('getProfile - Creating profile:', newProfile);

                const { data: created, error: createError } = await supabaseClient
                    .from('profiles')
                    .insert(newProfile)
                    .select()
                    .single();

                if (createError) {
                    console.error('getProfile - Create error:', createError);
                    // Return data from user metadata as fallback
                    return newProfile;
                }
                console.log('getProfile - Profile created:', created);
                return created;
            }
            return null;
        }

        if (error) {
            console.error('getProfile - Error:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('getProfile - Catch error:', error);
        return null;
    }
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} - Response
 */
async function updateProfile(userId, updates) {
    try {
        console.log('updateProfile - Starting with data:', { userId, updates });

        // Get current user to ensure we have email and other required fields
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) {
            throw new Error('User not authenticated');
        }

        // Build upsert data with required fields
        const upsertData = {
            id: userId,
            email: user.email, // Always use email from auth (required field)
            updated_at: new Date().toISOString()
        };

        // Add optional fields only if they are provided and not null/empty
        if (updates) {
            Object.keys(updates).forEach(key => {
                const value = updates[key];
                // Only include the field if it's not undefined, null, or empty string
                if (value !== undefined && value !== null && value !== '') {
                    upsertData[key] = value;
                }
            });
        }

        console.log('updateProfile - Upsert data:', upsertData);

        const { data, error } = await supabaseClient
            .from('profiles')
            .upsert(upsertData, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('updateProfile - Supabase error:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            throw error;
        }

        console.log('updateProfile - Success:', data);

        // Also update auth metadata if name or avatar changed
        if (updates.full_name || updates.avatar_url) {
            await supabaseClient.auth.updateUser({
                data: {
                    full_name: updates.full_name,
                    avatar_url: updates.avatar_url
                }
            });
        }

        return { success: true, data };
    } catch (error) {
        console.error('updateProfile - Full error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Upload avatar image
 * @param {string} userId - User ID
 * @param {File} file - Image file
 * @returns {Promise<Object>} - Response with URL
 */
async function uploadAvatar(userId, file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/avatar.${fileExt}`;

        const { data, error } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(fileName);

        // Update user profile with new avatar URL
        await updateProfile(userId, { avatar_url: publicUrl });

        return { success: true, url: publicUrl };
    } catch (error) {
        console.error('Upload avatar error:', error);
        return { success: false, error: error.message };
    }
}

// =========================================================
// ACTIVITY LOGGING
// =========================================================

/**
 * Log user activity
 * @param {string} activityType - Type of activity
 * @param {Object} metadata - Activity metadata
 * @returns {Promise<Object>} - Response
 */
async function logActivity(activityType, metadata = {}) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) return { success: false, error: 'No user logged in' };

        const { data, error } = await supabaseClient
            .from('activity_logs')
            .insert({
                user_id: user.id,
                activity_type: activityType,
                metadata,
                ip_address: null, // Would need backend to get real IP
                user_agent: navigator.userAgent
            });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Log activity error:', error);
        return { success: false, error: error.message };
    }
}

// =========================================================
// AUTH GUARDS
// =========================================================

/**
 * Check if user is authenticated
 * Redirects to login if not
 */
async function requireAuth() {
    const { session } = await getSession();

    if (!session) {
        // Store intended URL
        localStorage.setItem('cogno_redirect_url', window.location.href);
        window.location.href = CognoPaths.auth.login();
        return null;
    }

    return session;
}

/**
 * Check if user has required role
 * @param {string|Array} allowedRoles - Allowed roles
 */
async function requireRole(allowedRoles) {
    const session = await requireAuth();
    if (!session) return null;

    const { user } = await getCurrentUser();
    if (!user || !user.profile) {
        window.location.href = CognoPaths.auth.login();
        return null;
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(user.profile.role)) {
        // Redirect to appropriate dashboard
        redirectToDashboard(user.profile.role);
        return null;
    }

    return user;
}

/**
 * Redirect to role-appropriate dashboard
 * @param {string} role - User role
 */
function redirectToDashboard(role) {
    window.location.href = CognoPaths.dashboard.forRole(role);
}

// =========================================================
// SUPABASE QUERY HELPERS
// =========================================================

/**
 * Generic query helper with error handling
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Query result
 */
async function query(table, options = {}) {
    try {
        let queryBuilder = supabaseClient.from(table);

        // Select
        if (options.select) {
            queryBuilder = queryBuilder.select(options.select);
        } else {
            queryBuilder = queryBuilder.select('*');
        }

        // Filters
        if (options.filters) {
            for (const [column, value] of Object.entries(options.filters)) {
                if (typeof value === 'object' && value !== null) {
                    // Handle complex filters
                    if (value.in) queryBuilder = queryBuilder.in(column, value.in);
                    if (value.gte) queryBuilder = queryBuilder.gte(column, value.gte);
                    if (value.lte) queryBuilder = queryBuilder.lte(column, value.lte);
                    if (value.like) queryBuilder = queryBuilder.like(column, value.like);
                    if (value.ilike) queryBuilder = queryBuilder.ilike(column, value.ilike);
                } else {
                    queryBuilder = queryBuilder.eq(column, value);
                }
            }
        }

        // Ordering
        if (options.orderBy) {
            const [column, direction] = options.orderBy.split(':');
            queryBuilder = queryBuilder.order(column, { ascending: direction !== 'desc' });
        }

        // Pagination
        if (options.limit) {
            queryBuilder = queryBuilder.limit(options.limit);
        }

        if (options.offset) {
            queryBuilder = queryBuilder.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        // Single result
        if (options.single) {
            queryBuilder = queryBuilder.single();
        }

        const { data, error, count } = await queryBuilder;

        if (error) throw error;
        return { success: true, data, count };
    } catch (error) {
        console.error(`Query error on ${table}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Insert data helper
 * @param {string} table - Table name
 * @param {Object|Array} data - Data to insert
 * @returns {Promise<Object>} - Insert result
 */
async function insert(table, data) {
    try {
        const { data: result, error } = await supabaseClient
            .from(table)
            .insert(data)
            .select();

        if (error) throw error;
        return { success: true, data: result };
    } catch (error) {
        console.error(`Insert error on ${table}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Update data helper
 * @param {string} table - Table name
 * @param {Object} filters - Filter conditions
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} - Update result
 */
async function update(table, filters, data) {
    try {
        let queryBuilder = supabaseClient.from(table).update(data);

        for (const [column, value] of Object.entries(filters)) {
            queryBuilder = queryBuilder.eq(column, value);
        }

        const { data: result, error } = await queryBuilder.select();

        if (error) throw error;
        return { success: true, data: result };
    } catch (error) {
        console.error(`Update error on ${table}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete data helper
 * @param {string} table - Table name
 * @param {Object} filters - Filter conditions
 * @returns {Promise<Object>} - Delete result
 */
async function remove(table, filters) {
    try {
        let queryBuilder = supabaseClient.from(table).delete();

        for (const [column, value] of Object.entries(filters)) {
            queryBuilder = queryBuilder.eq(column, value);
        }

        const { error } = await queryBuilder;

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error(`Delete error on ${table}:`, error);
        return { success: false, error: error.message };
    }
}

// =========================================================
// EXPORT CLIENT AND FUNCTIONS
// =========================================================
window.CognoSupabase = {
    client: supabaseClient,
    supabase: supabaseClient,  // Alias for backward compatibility
    // Auth
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    getSession,
    getCurrentUser,
    onAuthStateChange,
    // Profile
    getProfile,
    updateProfile,
    uploadAvatar,
    // Activity
    logActivity,
    // Guards
    requireAuth,
    requireRole,
    redirectToDashboard,
    // Query helpers
    query,
    insert,
    update,
    remove
};

// Log initialization
console.log('🚀 Cogno Supabase Client initialized');

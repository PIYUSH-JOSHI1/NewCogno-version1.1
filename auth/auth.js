/**
 * COGNO SOLUTION - Authentication Module
 * Handles all authentication-related functionality
 */

const CognoAuth = {
    // =========================================================
    // LOGIN PAGE
    // =========================================================
    initLoginPage() {
        const form = document.getElementById('login-form');
        const googleBtn = document.getElementById('google-signin');
        const errorDiv = document.getElementById('auth-error');
        const errorMsg = document.getElementById('error-message');

        // Check if already logged in
        this.checkExistingSession();

        // Password toggle
        this.initPasswordToggle();

        // Form submit
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember')?.checked;

            // Validate
            if (!email || !password) {
                this.showError(errorDiv, errorMsg, 'Please fill in all fields');
                return;
            }

            // Show loading
            this.setLoading('login-btn', true);
            this.hideError(errorDiv);

            try {
                const result = await CognoSupabase.signIn(email, password);

                if (result.success) {
                    // Store remember preference
                    if (remember) {
                        CognoUtils.Storage.set('cogno_remember_email', email);
                    } else {
                        CognoUtils.Storage.remove('cogno_remember_email');
                    }

                    // Redirect based on role
                    const { user } = await CognoSupabase.getCurrentUser();
                    if (user?.profile) {
                        CognoSupabase.redirectToDashboard(user.profile.role);
                    } else {
                        // Check for redirect URL
                        const redirectUrl = localStorage.getItem('cogno_redirect_url');
                        if (redirectUrl) {
                            localStorage.removeItem('cogno_redirect_url');
                            window.location.href = redirectUrl;
                        } else {
                            window.location.href = '../dashboard/';
                        }
                    }
                } else {
                    this.showError(errorDiv, errorMsg, result.error || 'Invalid email or password');
                }
            } catch (error) {
                this.showError(errorDiv, errorMsg, 'An error occurred. Please try again.');
                console.error('Login error:', error);
            } finally {
                this.setLoading('login-btn', false);
            }
        });

        // Google sign in
        googleBtn?.addEventListener('click', async () => {
            try {
                const result = await CognoSupabase.signInWithGoogle();
                if (!result.success) {
                    this.showError(errorDiv, errorMsg, result.error || 'Google sign in failed');
                }
            } catch (error) {
                this.showError(errorDiv, errorMsg, 'Google sign in failed');
                console.error('Google signin error:', error);
            }
        });

        // Auto-fill remembered email
        const rememberedEmail = CognoUtils.Storage.get('cogno_remember_email');
        if (rememberedEmail) {
            document.getElementById('email').value = rememberedEmail;
            document.getElementById('remember').checked = true;
        }
    },

    // =========================================================
    // REGISTER PAGE
    // =========================================================
    initRegisterPage() {
        const form = document.getElementById('register-form');
        const googleBtn = document.getElementById('google-signup');
        const errorDiv = document.getElementById('auth-error');
        const errorMsg = document.getElementById('error-message');

        // Check if already logged in
        this.checkExistingSession();

        // Password toggle
        this.initPasswordToggle();

        // Password strength indicator
        this.initPasswordStrength('password', 'password-strength-fill', 'password-strength-text');

        // Role selection
        this.initRoleSelection();

        // Form submit
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = document.querySelector('input[name="role"]:checked')?.value || 'student';
            const terms = document.getElementById('terms')?.checked;

            // Validate
            if (!firstName || !lastName || !email || !password) {
                this.showError(errorDiv, errorMsg, 'Please fill in all required fields');
                return;
            }

            if (!CognoUtils.Validation.isEmail(email)) {
                this.showError(errorDiv, errorMsg, 'Please enter a valid email address');
                return;
            }

            if (password !== confirmPassword) {
                this.showError(errorDiv, errorMsg, 'Passwords do not match');
                return;
            }

            const passwordValidation = CognoUtils.Validation.validatePassword(password);
            if (!passwordValidation.valid) {
                this.showError(errorDiv, errorMsg, 'Password does not meet requirements');
                return;
            }

            if (!terms) {
                this.showError(errorDiv, errorMsg, 'Please accept the Terms of Service');
                return;
            }

            // Gather additional data based on role
            const metadata = {
                fullName: `${firstName} ${lastName}`,
                role: role
            };

            // Role-specific data
            if (role === 'student') {
                const dob = document.getElementById('dateOfBirth')?.value;
                if (dob) metadata.dateOfBirth = dob;
            } else if (role === 'doctor') {
                const specialization = document.getElementById('specialization')?.value;
                const licenseNumber = document.getElementById('licenseNumber')?.value;
                if (specialization) metadata.specialization = specialization;
                if (licenseNumber) metadata.licenseNumber = licenseNumber;
            }

            // Show loading
            this.setLoading('register-btn', true);
            this.hideError(errorDiv);

            try {
                const result = await CognoSupabase.signUp(email, password, metadata);

                if (result.success) {
                    // Store email for verification page
                    CognoUtils.Storage.setSession('cogno_pending_email', email);

                    // Redirect to verify email page
                    window.location.href = 'verify-email.html';
                } else {
                    this.showError(errorDiv, errorMsg, result.error || 'Registration failed');
                }
            } catch (error) {
                this.showError(errorDiv, errorMsg, 'An error occurred. Please try again.');
                console.error('Register error:', error);
            } finally {
                this.setLoading('register-btn', false);
            }
        });

        // Google sign up
        googleBtn?.addEventListener('click', async () => {
            try {
                const result = await CognoSupabase.signInWithGoogle();
                if (!result.success) {
                    this.showError(errorDiv, errorMsg, result.error || 'Google sign up failed');
                }
            } catch (error) {
                this.showError(errorDiv, errorMsg, 'Google sign up failed');
                console.error('Google signup error:', error);
            }
        });
    },

    // =========================================================
    // FORGOT PASSWORD PAGE
    // =========================================================
    initForgotPasswordPage() {
        const form = document.getElementById('forgot-password-form');
        const formState = document.getElementById('form-state');
        const successState = document.getElementById('success-state');
        const sentEmail = document.getElementById('sent-email');
        const errorDiv = document.getElementById('auth-error');
        const errorMsg = document.getElementById('error-message');
        const resendBtn = document.getElementById('resend-btn');

        let lastEmail = '';

        // Form submit
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();

            if (!email) {
                this.showError(errorDiv, errorMsg, 'Please enter your email address');
                return;
            }

            if (!CognoUtils.Validation.isEmail(email)) {
                this.showError(errorDiv, errorMsg, 'Please enter a valid email address');
                return;
            }

            lastEmail = email;

            // Show loading
            this.setLoading('reset-btn', true);
            this.hideError(errorDiv);

            try {
                const result = await CognoSupabase.resetPassword(email);

                if (result.success) {
                    // Show success state
                    formState.classList.add('hide');
                    successState.classList.add('show');
                    sentEmail.textContent = email;
                } else {
                    // Still show success to prevent email enumeration
                    formState.classList.add('hide');
                    successState.classList.add('show');
                    sentEmail.textContent = email;
                }
            } catch (error) {
                this.showError(errorDiv, errorMsg, 'An error occurred. Please try again.');
                console.error('Forgot password error:', error);
            } finally {
                this.setLoading('reset-btn', false);
            }
        });

        // Resend button
        resendBtn?.addEventListener('click', async () => {
            if (!lastEmail) return;

            try {
                await CognoSupabase.resetPassword(lastEmail);
                CognoNotifications.success('Verification email resent');
            } catch (error) {
                CognoNotifications.error('Failed to resend email');
            }
        });
    },

    // =========================================================
    // RESET PASSWORD PAGE
    // =========================================================
    initResetPasswordPage() {
        const form = document.getElementById('reset-password-form');
        const formState = document.getElementById('form-state');
        const successState = document.getElementById('success-state');
        const errorDiv = document.getElementById('auth-error');
        const errorMsg = document.getElementById('error-message');

        // Password toggle
        this.initPasswordToggle();

        // Password strength indicator
        this.initPasswordStrength('password', 'password-strength-fill', 'password-strength-text');

        // Password requirements
        this.initPasswordRequirements('password');

        // Form submit
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!password) {
                this.showError(errorDiv, errorMsg, 'Please enter a new password');
                return;
            }

            if (password !== confirmPassword) {
                this.showError(errorDiv, errorMsg, 'Passwords do not match');
                return;
            }

            const passwordValidation = CognoUtils.Validation.validatePassword(password);
            if (!passwordValidation.valid) {
                this.showError(errorDiv, errorMsg, 'Password does not meet requirements');
                return;
            }

            // Show loading
            this.setLoading('submit-btn', true);
            this.hideError(errorDiv);

            try {
                const result = await CognoSupabase.updatePassword(password);

                if (result.success) {
                    // Show success state
                    formState.classList.add('hide');
                    successState.classList.add('show');
                } else {
                    this.showError(errorDiv, errorMsg, result.error || 'Failed to reset password');
                }
            } catch (error) {
                this.showError(errorDiv, errorMsg, 'An error occurred. Please try again.');
                console.error('Reset password error:', error);
            } finally {
                this.setLoading('submit-btn', false);
            }
        });
    },

    // =========================================================
    // VERIFY EMAIL PAGE
    // =========================================================
    initVerifyEmailPage() {
        const pendingState = document.getElementById('pending-state');
        const verifyingState = document.getElementById('verifying-state');
        const successState = document.getElementById('success-state');
        const errorState = document.getElementById('error-state');
        const errorMessage = document.getElementById('error-message');
        const userEmail = document.getElementById('user-email');
        const continueBtn = document.getElementById('continue-btn');
        const resendBtn = document.getElementById('resend-btn');
        const checkBtn = document.getElementById('check-btn');
        const retryBtn = document.getElementById('retry-btn');

        let email = CognoUtils.Storage.getSession('cogno_pending_email') || '';

        // Display email
        if (userEmail && email) {
            userEmail.textContent = email;
        }

        // Check URL for error parameters (Supabase redirects with errors)
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorCode = urlParams.get('error_code');
        const errorDesc = urlParams.get('error_description');

        if (error) {
            // Show error state with message
            this.showState('error-state');
            if (errorMessage) {
                if (errorCode === 'otp_expired') {
                    errorMessage.textContent = 'The verification link has expired. Please request a new one.';
                } else if (errorDesc) {
                    errorMessage.textContent = errorDesc.replace(/\+/g, ' ');
                } else {
                    errorMessage.textContent = 'Verification failed. Please try again.';
                }
            }
            return;
        }

        // Check URL for verification callback (hash with access_token)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            this.showState('verifying-state');
            this.verifyCallback();
            return;
        }

        // Set continue button href based on role (only if session exists)
        this.setDashboardLink(continueBtn);

        // Resend verification email with rate-limit protection
        resendBtn?.addEventListener('click', async () => {
            if (!email) {
                CognoNotifications.error('No email found. Please register again.');
                setTimeout(() => window.location.href = 'register.html', 2000);
                return;
            }

            // Check if we're still in cooldown (using localStorage to persist across page reloads)
            const lastResend = parseInt(localStorage.getItem('cogno_last_resend') || '0');
            const elapsed = Math.floor((Date.now() - lastResend) / 1000);
            const cooldownSeconds = 60;

            if (elapsed < cooldownSeconds) {
                const remaining = cooldownSeconds - elapsed;
                CognoNotifications.info(`Please wait ${remaining} seconds before resending.`);
                this.startResendCooldown(remaining);
                return;
            }

            // Start cooldown and save timestamp
            localStorage.setItem('cogno_last_resend', Date.now().toString());
            this.startResendCooldown(cooldownSeconds);
            resendBtn.disabled = true;

            try {
                // Use Supabase resend method (available in v2.x)
                const { error } = await CognoSupabase.client.auth.resend({
                    type: 'signup',
                    email: email
                });

                if (error) {
                    throw error;
                }

                CognoNotifications.success('Verification email sent! Check your inbox and spam folder.');
            } catch (error) {
                console.error('Resend error:', error);
                if (error.message?.includes('security purposes') || error.status === 429) {
                    CognoNotifications.error('Rate limited. Please wait before trying again.');
                } else {
                    CognoNotifications.error('Failed to resend. Try again in a moment.');
                }
            }
        });

        // Check verification button
        checkBtn?.addEventListener('click', async () => {
            this.setLoading('check-btn', true);

            try {
                const { session } = await CognoSupabase.getSession();

                if (session?.user?.email_confirmed_at) {
                    this.showState('success-state');
                } else {
                    // Allow user to proceed to dashboard even without email confirmation (for development)
                    CognoNotifications.info('Proceeding to dashboard. You can verify your email later.');
                    setTimeout(() => {
                        const dashboard = CognoPaths?.dashboard?.index?.() || '../dashboard/';
                        window.location.href = dashboard;
                    }, 1500);
                }
            } catch (error) {
                CognoNotifications.error('Failed to check verification status');
            } finally {
                this.setLoading('check-btn', false);
            }
        });

        // Retry button
        retryBtn?.addEventListener('click', () => {
            this.showState('pending-state');
        });
    },

    // =========================================================
    // HELPER METHODS
    // =========================================================

    async checkExistingSession() {
        const { session } = await CognoSupabase.getSession();

        if (session) {
            // Already logged in, redirect to dashboard
            const { user } = await CognoSupabase.getCurrentUser();
            if (user?.profile) {
                CognoSupabase.redirectToDashboard(user.profile.role);
            } else {
                window.location.href = '../dashboard/';
            }
        }
    },

    async verifyCallback() {
        try {
            const { session } = await CognoSupabase.getSession();

            if (session) {
                this.showState('success-state');

                // Create user profile if it doesn't exist
                const { user } = await CognoSupabase.getCurrentUser();
                if (!user?.profile) {
                    // Profile will be created by database trigger
                }
            } else {
                this.showState('error-state');
            }
        } catch (error) {
            console.error('Verification callback error:', error);
            this.showState('error-state');
        }
    },

    showState(stateId) {
        document.querySelectorAll('.state').forEach(el => {
            el.classList.remove('active');
        });
        document.getElementById(stateId)?.classList.add('active');
    },

    initPasswordToggle() {
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('input');
                const icon = btn.querySelector('i');

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        });
    },

    initPasswordStrength(inputId, fillId, textId) {
        const input = document.getElementById(inputId);
        const fill = document.getElementById(fillId);
        const text = document.getElementById(textId);

        if (!input || !fill) return;

        input.addEventListener('input', () => {
            const password = input.value;
            const validation = CognoUtils.Validation.validatePassword(password);

            // Remove all classes
            fill.className = 'password-strength-fill';

            if (password.length === 0) {
                // No additional class needed for empty password
                if (text) text.textContent = 'Use 8+ characters with mix of letters & numbers';
            } else if (validation.score <= 1) {
                fill.classList.add('weak');
                if (text) text.textContent = 'Weak password';
            } else if (validation.score === 2) {
                fill.classList.add('fair');
                if (text) text.textContent = 'Fair password';
            } else if (validation.score === 3) {
                fill.classList.add('good');
                if (text) text.textContent = 'Good password';
            } else {
                fill.classList.add('strong');
                if (text) text.textContent = 'Strong password';
            }
        });
    },

    initPasswordRequirements(inputId) {
        const input = document.getElementById(inputId);
        const reqLength = document.getElementById('req-length');
        const reqUpper = document.getElementById('req-upper');
        const reqLower = document.getElementById('req-lower');
        const reqNumber = document.getElementById('req-number');

        if (!input) return;

        input.addEventListener('input', () => {
            const password = input.value;

            // Check each requirement
            if (reqLength) {
                reqLength.classList.toggle('valid', password.length >= 8);
                reqLength.querySelector('i').className = password.length >= 8
                    ? 'fa-solid fa-check'
                    : 'fa-solid fa-circle';
            }

            if (reqUpper) {
                const hasUpper = /[A-Z]/.test(password);
                reqUpper.classList.toggle('valid', hasUpper);
                reqUpper.querySelector('i').className = hasUpper
                    ? 'fa-solid fa-check'
                    : 'fa-solid fa-circle';
            }

            if (reqLower) {
                const hasLower = /[a-z]/.test(password);
                reqLower.classList.toggle('valid', hasLower);
                reqLower.querySelector('i').className = hasLower
                    ? 'fa-solid fa-check'
                    : 'fa-solid fa-circle';
            }

            if (reqNumber) {
                const hasNumber = /[0-9]/.test(password);
                reqNumber.classList.toggle('valid', hasNumber);
                reqNumber.querySelector('i').className = hasNumber
                    ? 'fa-solid fa-check'
                    : 'fa-solid fa-circle';
            }
        });
    },

    initRoleSelection() {
        const roleInputs = document.querySelectorAll('input[name="role"]');
        const childFields = document.querySelectorAll('.child-field');
        const doctorFields = document.querySelectorAll('.doctor-field');
        const childInfoFields = document.getElementById('child-info-fields');

        roleInputs.forEach(input => {
            input.addEventListener('change', () => {
                const role = input.value;

                // Hide all role-specific fields
                childFields.forEach(el => el.style.display = 'none');
                doctorFields.forEach(el => el.style.display = 'none');
                if (childInfoFields) childInfoFields.classList.remove('show');

                // Show relevant fields
                if (role === 'student') {
                    childFields.forEach(el => el.style.display = 'block');
                } else if (role === 'parent') {
                    if (childInfoFields) childInfoFields.classList.add('show');
                } else if (role === 'doctor') {
                    doctorFields.forEach(el => el.style.display = 'block');
                }
            });
        });
    },

    async setDashboardLink(button) {
        if (!button) return;

        try {
            // First check if there's an active session before calling getCurrentUser
            // This prevents AuthSessionMissingError on the verify-email page
            const { session } = await CognoSupabase.getSession();
            if (!session) {
                // No session yet (e.g., email not verified), keep default dashboard link
                return;
            }

            const { user } = await CognoSupabase.getCurrentUser();
            if (user?.profile?.role) {
                const dashboards = {
                    child: '../dashboard/child-dashboard.html',
                    parent: '../dashboard/parent-dashboard.html',
                    doctor: '../dashboard/doctor-dashboard.html',
                    admin: '../dashboard/admin-dashboard.html'
                };
                button.href = dashboards[user.profile.role] || '../dashboard/';
            }
        } catch (error) {
            // Default to generic dashboard
        }
    },

    startResendCooldown(seconds = 60) {
        const timer = document.getElementById('resend-timer');
        const count = document.getElementById('timer-count');
        const resendBtn = document.getElementById('resend-btn');

        if (!timer || !count || !resendBtn) return;

        resendBtn.disabled = true;
        timer.style.display = 'block';

        let remaining = seconds;
        count.textContent = remaining;

        const interval = setInterval(() => {
            remaining--;
            count.textContent = remaining;

            if (remaining <= 0) {
                clearInterval(interval);
                timer.style.display = 'none';
                resendBtn.disabled = false;
            }
        }, 1000);
    },

    setLoading(buttonId, loading) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loader');

        if (loading) {
            btn.disabled = true;
            if (text) text.classList.add('hidden');
            if (loader) loader.classList.remove('hidden');
        } else {
            btn.disabled = false;
            if (text) text.classList.remove('hidden');
            if (loader) loader.classList.add('hidden');
        }
    },

    showError(errorDiv, errorMsg, message) {
        if (errorDiv && errorMsg) {
            errorMsg.textContent = message;
            errorDiv.classList.add('show');
        }
    },

    hideError(errorDiv) {
        if (errorDiv) {
            errorDiv.classList.remove('show');
        }
    }
};

// Export
window.CognoAuth = CognoAuth;

// Log initialization
console.log('🔐 Cogno Auth initialized');

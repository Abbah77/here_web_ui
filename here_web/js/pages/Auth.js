// Path: here-social/js/pages/Auth.js

/**
 * Authentication Page
 */
class AuthPage {
    constructor(context) {
        this.context = context;
        this.mode = new URLSearchParams(window.location.search).get('mode') || 'login';
    }

    async render() {
        return `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <img src="/assets/splash/logo.png" alt="HERE" class="auth-logo">
                        <h1>${this.mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
                        <p>${this.mode === 'login' ? 'Sign in to continue' : 'Join HERE Social'}</p>
                    </div>

                    <form id="authForm" class="auth-form">
                        ${this.mode === 'register' ? `
                            <div class="form-group">
                                <label for="fullName">Full Name</label>
                                <input type="text" id="fullName" name="fullName" required 
                                    placeholder="John Doe">
                            </div>
                        ` : ''}

                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required 
                                placeholder="your@email.com">
                        </div>

                        ${this.mode === 'register' ? `
                            <div class="form-group">
                                <label for="username">Username</label>
                                <input type="text" id="username" name="username" required 
                                    placeholder="johndoe" pattern="[a-zA-Z0-9_]{3,20}">
                                <small>3-20 characters, letters, numbers, underscore</small>
                            </div>
                        ` : ''}

                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" required 
                                placeholder="••••••••">
                            ${this.mode === 'register' ? `
                                <small>Min 8 characters with letters and numbers</small>
                            ` : ''}
                        </div>

                        ${this.mode === 'login' ? `
                            <div class="form-group remember-me">
                                <label>
                                    <input type="checkbox" id="rememberMe" checked>
                                    Stay logged in
                                </label>
                            </div>
                        ` : ''}

                        <button type="submit" class="auth-submit">
                            ${this.mode === 'login' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    <div class="auth-footer">
                        ${this.mode === 'login' ? `
                            <p>Don't have an account? 
                                <a href="/auth?mode=register" data-link>Sign up</a>
                            </p>
                        ` : `
                            <p>Already have an account? 
                                <a href="/auth?mode=login" data-link>Sign in</a>
                            </p>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    mounted() {
        const form = document.getElementById('authForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    async handleSubmit() {
        const form = document.getElementById('authForm');
        const formData = new FormData(form);
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';

        try {
            if (this.mode === 'login') {
                const result = await authStore.asyncActions.login({
                    email: formData.get('email'),
                    password: formData.get('password')
                });

                if (result.success) {
                    router.navigate('/');
                } else {
                    alert(result.error || 'Login failed');
                }
            } else {
                const result = await authStore.asyncActions.register({
                    fullName: formData.get('fullName'),
                    email: formData.get('email'),
                    username: formData.get('username'),
                    password: formData.get('password')
                });

                if (result.success) {
                    router.navigate('/');
                } else {
                    alert(result.error || 'Registration failed');
                }
            }
        } catch (error) {
            alert(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = this.mode === 'login' ? 'Sign In' : 'Create Account';
        }
    }
}

// Make available globally
window.AuthPage = AuthPage;
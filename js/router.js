// Path: here-social/js/router.js

/**
 * SPA Router
 * Handles navigation and page rendering
 */
class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = null;
        this.notFoundRoute = null;
        this.beforeHooks = [];
        this.afterHooks = [];
    }

    // Initialize router
    init() {
        // Handle initial route
        this.handleRoute();

        // Handle popstate (back/forward)
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });

        // Handle link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            
            if (link && link.getAttribute('href') && 
                !link.getAttribute('href').startsWith('http') &&
                !link.getAttribute('target')) {
                
                e.preventDefault();
                this.navigate(link.getAttribute('href'));
            }
        });
    }

    // Add route
    addRoute(path, component, options = {}) {
        this.routes.push({
            path,
            component,
            options,
            regex: this.pathToRegex(path),
            params: []
        });

        return this;
    }

    // Set not found route
    setNotFound(component) {
        this.notFoundRoute = { component };
        return this;
    }

    // Add before hook
    before(hook) {
        this.beforeHooks.push(hook);
        return this;
    }

    // Add after hook
    after(hook) {
        this.afterHooks.push(hook);
        return this;
    }

    // Convert path to regex
    pathToRegex(path) {
        const paramNames = [];
        const regexPath = path.replace(/:([^/]+)/g, (_, name) => {
            paramNames.push(name);
            return '([^/]+)';
        });

        return {
            regex: new RegExp(`^${regexPath}$`),
            paramNames
        };
    }

    // Match route
    matchRoute(path) {
        for (const route of this.routes) {
            const match = path.match(route.regex.regex);
            
            if (match) {
                const params = {};
                
                route.regex.paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });

                return { route, params };
            }
        }

        return null;
    }

    // Handle route
    async handleRoute() {
        const path = window.location.pathname;
        const query = new URLSearchParams(window.location.search);
        
        const match = this.matchRoute(path);

        if (!match && this.notFoundRoute) {
            // Run before hooks
            for (const hook of this.beforeHooks) {
                const result = await hook(path, query);
                if (result === false) return;
            }

            // Render not found
            await this.renderComponent(this.notFoundRoute.component, { path, query });

            // Run after hooks
            for (const hook of this.afterHooks) {
                await hook(path, query);
            }

            return;
        }

        if (match) {
            const { route, params } = match;

            // Run before hooks
            for (const hook of this.beforeHooks) {
                const result = await hook(path, query, params);
                if (result === false) return;
            }

            // Check auth if route requires it
            if (route.options.requiresAuth) {
                const isAuthenticated = authStore.getState()?.isAuthenticated;
                
                if (!isAuthenticated) {
                    this.navigate('/auth');
                    return;
                }
            }

            // Render component
            await this.renderComponent(route.component, {
                path,
                query,
                params
            });

            this.currentRoute = route;

            // Run after hooks
            for (const hook of this.afterHooks) {
                await hook(path, query, params);
            }
        }
    }

    // Render component
    async renderComponent(component, context) {
        const main = document.getElementById('main-content');
        
        if (!main) return;

        try {
            // Show loading state
            main.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

            // Render component
            if (typeof component === 'function') {
                const instance = new component(context);
                main.innerHTML = await instance.render();
                
                if (instance.mounted) {
                    setTimeout(() => instance.mounted(), 0);
                }
            } else if (typeof component === 'string') {
                main.innerHTML = component;
            } else if (component.template) {
                main.innerHTML = component.template(context);
                
                if (component.mounted) {
                    setTimeout(() => component.mounted(context), 0);
                }
            }
        } catch (error) {
            console.error('Failed to render component:', error);
            main.innerHTML = '<div class="error-state">Failed to load page</div>';
        }
    }

    // Navigate to path
    navigate(path, replace = false) {
        if (replace) {
            window.history.replaceState({}, '', path);
        } else {
            window.history.pushState({}, '', path);
        }

        this.handleRoute();
    }

    // Go back
    back() {
        window.history.back();
    }

    // Get current path
    getCurrentPath() {
        return window.location.pathname;
    }

    // Get query params
    getQueryParams() {
        return new URLSearchParams(window.location.search);
    }

    // Build URL with params
    buildUrl(path, params = {}) {
        let url = path;
        
        // Replace path params
        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });

        // Add query string
        const queryParams = Object.keys(params)
            .filter(key => !path.includes(`:${key}`))
            .reduce((obj, key) => {
                obj[key] = params[key];
                return obj;
            }, {});

        if (Object.keys(queryParams).length > 0) {
            const queryString = new URLSearchParams(queryParams).toString();
            url += `?${queryString}`;
        }

        return url;
    }
}

// Create global instance
window.router = new Router();

// Initialize routes
document.addEventListener('DOMContentLoaded', () => {
    // Auth routes
    router.addRoute('/auth', AuthPage, { requiresAuth: false });
    
    // Main routes
    router.addRoute('/', HomePage, { requiresAuth: true });
    router.addRoute('/friends', FriendsPage, { requiresAuth: true });
    router.addRoute('/explore', ExplorePage, { requiresAuth: true });
    router.addRoute('/chat', ChatListPage, { requiresAuth: true });
    router.addRoute('/chat/:id', ChatDetailPage, { requiresAuth: true });
    router.addRoute('/profile', ProfilePage, { requiresAuth: true });
    router.addRoute('/profile/:id', UserProfilePage, { requiresAuth: true });
    
    // Post routes
    router.addRoute('/post/create', CreatePostPage, { requiresAuth: true });
    router.addRoute('/post/:id', PostDetailPage, { requiresAuth: true });
    
    // Profile edit
    router.addRoute('/profile/edit', ProfileEditPage, { requiresAuth: true });
    
    // Group chat routes
    router.addRoute('/group/create', GroupChatPage, { requiresAuth: true });
    router.addRoute('/group/:id', GroupChatPage, { requiresAuth: true });
    
    // Notifications & Search
    router.addRoute('/notifications', NotificationsPage, { requiresAuth: true });
    router.addRoute('/search', SearchPage, { requiresAuth: true });
    
    // Settings
    router.addRoute('/settings', SettingsPage, { requiresAuth: true });
    
    // Not found
    router.setNotFound(NotFoundPage);

    // Before each route
    router.before(async (path, query, params) => {
        console.log('Navigating to:', path);
        
        // Update bottom nav active state
        updateActiveNav(path);
        
        // Update page title
        updatePageTitle(path);
    });

    // After each route
    router.after(async (path, query, params) => {
        console.log('Route loaded:', path);

        // Track page view
        trackPageView(path);

        // Scroll to top
        window.scrollTo(0, 0);
    });

    // Initialize router
    router.init();
});

// Helper functions
function updateActiveNav(path) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        
        const page = item.dataset.page;
        if (path === '/' && page === 'home') {
            item.classList.add('active');
        } else if (path === `/${page}`) {
            item.classList.add('active');
        } else if (path.startsWith('/chat/') && page === 'chat') {
            item.classList.add('active');
        } else if (path.startsWith('/profile/') && page === 'profile' && !path.includes('/edit')) {
            item.classList.add('active');
        }
    });
}

function updatePageTitle(path) {
    const titles = {
        '/': 'Home',
        '/friends': 'Friends',
        '/explore': 'Explore',
        '/chat': 'Chats',
        '/notifications': 'Notifications',
        '/search': 'Search',
        '/profile': 'Profile',
        '/profile/edit': 'Edit Profile',
        '/post/create': 'Create Post',
        '/group/create': 'Create Group',
        '/settings': 'Settings',
        '/auth': 'Authentication'
    };

    // Handle dynamic routes
    if (path.startsWith('/post/') && path !== '/post/create') {
        document.title = 'Post - HERE';
    } else if (path.startsWith('/chat/') && path !== '/chat') {
        document.title = 'Chat - HERE';
    } else if (path.startsWith('/profile/') && !path.includes('/edit') && path !== '/profile') {
        document.title = 'Profile - HERE';
    } else if (path.startsWith('/group/')) {
        document.title = 'Group - HERE';
    } else {
        const title = titles[path] || 'HERE Social';
        document.title = `${title} - HERE`;
    }
}

function trackPageView(path) {
    // Analytics implementation
    console.log('Page view:', path);
}

// Simple Not Found Page
class NotFoundPage {
    render() {
        return `
            <div class="error-state">
                <svg viewBox="0 0 24 24" width="64" height="64">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                </svg>
                <h2>404 - Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <button class="profile-button primary" onclick="router.navigate('/')">
                    Go Home
                </button>
            </div>
        `;
    }
}

// Placeholder for UserProfilePage (if not defined elsewhere)
class UserProfilePage extends ProfilePage {
    constructor(context) {
        super(context);
        this.isOwnProfile = false;
    }
}

window.NotFoundPage = NotFoundPage;
window.UserProfilePage = UserProfilePage;
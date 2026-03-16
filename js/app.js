// Path: here-social/js/app.js

/**
 * Main App Initialization
 */
class HEREApp {
    constructor() {
        this.initialized = false;
        this.startTime = Date.now();
        this.splashScreen = document.getElementById('splash');
        this.appElement = document.getElementById('app');
    }

    // Initialize app
    async init() {
        console.log('Initializing HERE Social...');

        // Show splash
        this.showSplash();

        try {
            // Initialize database
            await this.initDatabase();

            // Initialize services
            await this.initServices();

            // Check auth session (forever login)
            await this.initAuth();

            // Setup routes
            this.initRoutes();

            // Setup event listeners
            this.setupEventListeners();

            // Ensure splash shows at least 1.5s
            const elapsed = Date.now() - this.startTime;
            const remaining = Math.max(0, ANIMATION.SPLASH - elapsed);

            setTimeout(() => {
                this.hideSplash();
                this.initialized = true;
                
                // Start background sync
                if (navigator.onLine) {
                    syncManager.syncAll();
                }
            }, remaining);

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError(error.message);
        }
    }

    // Initialize IndexedDB
    async initDatabase() {
        console.log('Initializing database...');
        
        try {
            await db.init();
            console.log('Database initialized');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    // Initialize services
    async initServices() {
        console.log('Initializing services...');

        // Initialize sync manager
        await syncManager.init();

        // Initialize push notifications
        await pushManager.init();

        // Set up service worker message handler
        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event.data);
            });
        }

        console.log('Services initialized');
    }

    // Initialize auth session
    async initAuth() {
        console.log('Checking auth session...');

        await authStore.asyncActions.checkSession();

        const authState = authStore.getState();

        if (authState.isAuthenticated) {
            console.log('User is authenticated:', authState.user?.username);

            // Set API token
            api.setToken(authState.token);

            // Connect WebSocket
            if (navigator.onLine) {
                ws.connect(authState.token);
            }

            // Update user activity periodically
            setInterval(() => {
                if (authState.isAuthenticated) {
                    authStore.asyncActions.updateActivity();
                }
            }, 60000);
        } else {
            console.log('No active session');
        }
    }

    // Initialize routes
    initRoutes() {
        console.log('Setting up routes...');

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
        router.addRoute('/post/:id', PostDetailPage, { requiresAuth: true });
        
        // Settings
        router.addRoute('/settings', SettingsPage, { requiresAuth: true });
        
        // Not found
        router.setNotFound(NotFoundPage);

        // Before each route
        router.before(async (path, query, params) => {
            console.log('Navigating to:', path);
            
            // Update bottom nav active state
            this.updateActiveNav(path);
            
            // Update page title
            this.updatePageTitle(path);

            // Check if route requires auth
            // This is handled by router options now
        });

        // After each route
        router.after(async (path, query, params) => {
            console.log('Route loaded:', path);

            // Track page view
            this.trackPageView(path);

            // Scroll to top
            window.scrollTo(0, 0);
        });

        // Initialize router
        router.init();

        console.log('Routes initialized');
    }

    // Setup event listeners
    setupEventListeners() {
        console.log('Setting up event listeners...');

        // Search button
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                router.navigate('/search');
            });
        }

        // Notifications button
        const notifBtn = document.getElementById('notificationsBtn');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                router.navigate('/notifications');
            });
        }

        // Bottom navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = item.dataset.page;
                if (page) {
                    router.navigate(page === 'home' ? '/' : `/${page}`);
                }
            });
        });

        // AI button drag
        const aiButton = document.getElementById('hereAIButton');
        if (aiButton) {
            this.setupDraggable(aiButton);
            
            aiButton.addEventListener('click', () => {
                this.openAIAssistant();
            });
        }

        // Network status
        window.addEventListener('online', () => {
            document.body.classList.remove('offline');
        });

        window.addEventListener('offline', () => {
            document.body.classList.add('offline');
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.onAppVisible();
            } else {
                this.onAppHidden();
            }
        });
    }

    // Setup draggable element
    setupDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('dragstart', (e) => e.preventDefault());

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            element.classList.add('dragging');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            element.style.left = (initialX + dx) + 'px';
            element.style.top = (initialY + dy) + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.classList.remove('dragging');
                
                // Save position
                const rect = element.getBoundingClientRect();
                localStorage.setItem('ai_button_position', JSON.stringify({
                    left: rect.left,
                    top: rect.top
                }));
            }
        });

        // Load saved position
        const savedPos = localStorage.getItem('ai_button_position');
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                element.style.left = pos.left + 'px';
                element.style.top = pos.top + 'px';
                element.style.right = 'auto';
                element.style.bottom = 'auto';
            } catch (e) {
                console.error('Failed to load AI button position');
            }
        }
    }

    // Show splash screen
    showSplash() {
        if (this.splashScreen) {
            this.splashScreen.classList.add('visible');
            
            // Logo bounce animation
            const logo = this.splashScreen.querySelector('.logo');
            if (logo) {
                logo.classList.add('bounce');
            }
        }
    }

    // Hide splash screen
    hideSplash() {
        if (this.splashScreen) {
            this.splashScreen.classList.remove('visible');
            
            setTimeout(() => {
                if (this.appElement) {
                    this.appElement.classList.remove('hidden');
                }
            }, 300);
        }
    }

    // Show error
    showError(message) {
        if (this.splashScreen) {
            this.splashScreen.innerHTML = `
                <div class="splash-content error">
                    <div class="error-icon">⚠️</div>
                    <h2>Failed to load</h2>
                    <p>${message || 'Please check your connection and try again'}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    // Update active navigation item
    updateActiveNav(path) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            
            const page = item.dataset.page;
            if (path === '/' && page === 'home') {
                item.classList.add('active');
            } else if (path === `/${page}`) {
                item.classList.add('active');
            }
        });
    }

    // Update page title
    updatePageTitle(path) {
        const titles = {
            '/': 'Home',
            '/friends': 'Friends',
            '/explore': 'Explore',
            '/chat': 'Chats',
            '/profile': 'Profile',
            '/auth': 'Authentication'
        };

        const title = titles[path] || 'HERE Social';
        document.title = `${title} - HERE`;
    }

    // Track page view
    trackPageView(path) {
        // Analytics implementation
        console.log('Page view:', path);
    }

    // Handle service worker messages
    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'SYNC_COMPLETE':
                console.log('Background sync complete');
                break;
            case 'OFFLINE_QUEUED':
                console.log('Request queued for offline');
                break;
        }
    }

    // On app visible
    onAppVisible() {
        console.log('App became visible');
        
        // Check for updates
        if (navigator.onLine) {
            syncManager.syncAll();
        }

        // Update presence
        if (authStore.getState()?.isAuthenticated) {
            authStore.asyncActions.updateActivity();
        }
    }

    // On app hidden
    onAppHidden() {
        console.log('App hidden');
        
        // Update last seen
        if (authStore.getState()?.isAuthenticated && navigator.onLine) {
            api.post('/users/presence', {
                status: 'away',
                lastSeen: Date.now()
            });
        }
    }

    // Open AI assistant
    openAIAssistant() {
        console.log('Opening AI assistant');
        // This will be implemented in Phase 6
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HEREApp();
    window.app.init();
});
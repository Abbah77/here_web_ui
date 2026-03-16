// Path: here-social/js/app.js

/**
 * Main App Initialization
 * Refactored with safety features to prevent splash screen from hanging
 */
class HEREApp {
    constructor() {
        this.initialized = false;
        this.startTime = Date.now();
        this.splashScreen = document.getElementById('splash');
        this.appElement = document.getElementById('app');
        this.safetyTimer = null;
    }

    // Initialize app
    async init() {
        console.log('Initializing HERE Social...');
        this.showSplash();

        // SAFETY TIMER: Force hide splash after 5 seconds no matter what!
        this.safetyTimer = setTimeout(() => {
            if (!this.initialized) {
                console.error('⚠️ SAFETY TIMER: Forcing splash hide after 5 seconds');
                console.error('App initialization timed out - forcing app to show');
                
                // Log what might be hanging
                console.error('Check these components:');
                console.error('- Database initialization');
                console.error('- Services initialization (syncManager, pushManager)');
                console.error('- Auth session check');
                
                this.hideSplash();
                this.initialized = true;
                
                // Show warning toast
                this.showToast('App loaded with delays. Check console.', 'warning');
            }
        }, 5000);

        try {
            console.log('📌 Step 1: Starting database init...');
            await this.initDatabase();
            console.log('✅ Step 1 complete');

            console.log('📌 Step 2: Starting services init...');
            await this.initServices();
            console.log('✅ Step 2 complete');

            console.log('📌 Step 3: Starting auth init...');
            await this.initAuth();
            console.log('✅ Step 3 complete');

            console.log('📌 Step 4: Setting up routes...');
            this.initRoutes();
            console.log('✅ Step 4 complete');

            console.log('📌 Step 5: Setting up event listeners...');
            this.setupEventListeners();
            console.log('✅ Step 5 complete');

            // Clear safety timer since we initialized successfully
            if (this.safetyTimer) {
                clearTimeout(this.safetyTimer);
                this.safetyTimer = null;
            }

            const elapsed = Date.now() - this.startTime;
            const remaining = Math.max(0, ANIMATION.SPLASH - elapsed);
            console.log(`⏱️ Splash hiding in ${remaining}ms`);

            setTimeout(() => {
                this.hideSplash();
                this.initialized = true;
                console.log('🎉 App fully initialized!');
                
                if (navigator.onLine) {
                    // Don't await - let it run in background
                    setTimeout(() => {
                        try {
                            syncManager.syncAll();
                        } catch (e) {
                            console.error('Background sync failed:', e);
                        }
                    }, 100);
                }
            }, remaining);

        } catch (error) {
            console.error('❌ INITIALIZATION FAILED:', error);
            console.error('Error stack:', error.stack);
            
            // Clear safety timer
            if (this.safetyTimer) {
                clearTimeout(this.safetyTimer);
                this.safetyTimer = null;
            }
            
            // Force hide splash on error too
            setTimeout(() => {
                this.hideSplash();
                this.initialized = true;
            }, 1000);
            
            this.showError(error.message);
        }
    }

    // Initialize IndexedDB
    async initDatabase() {
        console.log('Initializing database...');
        
        // Check if db exists
        if (!window.db) {
            throw new Error('db is not defined - check script loading order');
        }
        
        try {
            // Add timeout to database initialization
            const dbPromise = db.init();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database init timeout after 3 seconds')), 3000)
            );
            
            await Promise.race([dbPromise, timeoutPromise]);
            console.log('✅ Database initialized');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    // Initialize services
    async initServices() {
        console.log('Initializing services...');
        
        // Check if required services exist
        if (!window.syncManager) {
            throw new Error('syncManager is not defined - check script loading order');
        }
        
        if (!window.pushManager) {
            console.warn('pushManager not defined - push notifications disabled');
        }
        
        // Initialize sync manager with timeout
        try {
            console.log('  - Initializing syncManager...');
            const syncPromise = syncManager.init();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('syncManager.init() timeout after 3 seconds')), 3000)
            );
            
            await Promise.race([syncPromise, timeoutPromise]);
            console.log('  ✅ syncManager initialized');
        } catch (error) {
            console.error('  ❌ syncManager initialization failed:', error);
            // Continue without sync - it's critical but we can retry later
            console.log('  Continuing without sync manager');
        }

        // Initialize push notifications (optional - don't throw if fails)
        try {
            console.log('  - Initializing pushManager...');
            if (pushManager && typeof pushManager.init === 'function') {
                const pushPromise = pushManager.init();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('pushManager.init() timeout')), 3000)
                );
                
                await Promise.race([pushPromise, timeoutPromise]);
                console.log('  ✅ pushManager initialized');
            } else {
                console.log('  ⚠️ pushManager not available - skipping');
            }
        } catch (error) {
            console.error('  ❌ pushManager initialization failed (non-critical):', error);
            // Non-critical - continue
        }

        // Set up service worker message handler
        if (navigator.serviceWorker) {
            console.log('  - Setting up service worker listener...');
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event.data);
            });
            console.log('  ✅ service worker listener done');
        }

        console.log('✅ Services initialization complete');
    }

    // Initialize auth session
    async initAuth() {
        console.log('Checking auth session...');

        // Check if authStore exists
        if (!window.authStore) {
            throw new Error('authStore is not defined - check script loading order');
        }

        try {
            // Add timeout to auth check
            const authPromise = authStore.asyncActions.checkSession();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Auth session check timeout after 3 seconds')), 3000)
            );
            
            await Promise.race([authPromise, timeoutPromise]);

            const authState = authStore.getState();

            if (authState?.isAuthenticated) {
                console.log('✅ User is authenticated:', authState.user?.username);

                // Set API token
                if (window.api) {
                    api.setToken(authState.token);
                }

                // Connect WebSocket (don't await)
                if (navigator.onLine && window.ws) {
                    setTimeout(() => {
                        try {
                            ws.connect(authState.token);
                        } catch (e) {
                            console.error('WebSocket connection failed:', e);
                        }
                    }, 0);
                }

                // Update user activity periodically
                setInterval(() => {
                    if (authState.isAuthenticated) {
                        authStore.asyncActions.updateActivity().catch(e => 
                            console.error('Activity update failed:', e)
                        );
                    }
                }, 60000);
            } else {
                console.log('ℹ️ No active session');
            }
        } catch (error) {
            console.error('❌ Auth initialization failed:', error);
            // Continue - user can log in manually
        }
    }

    // Initialize routes
    initRoutes() {
        console.log('Setting up routes...');

        // Check if router exists
        if (!window.router) {
            throw new Error('router is not defined - check script loading order');
        }

        try {
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
            
            // Additional routes
            router.addRoute('/post/create', CreatePostPage, { requiresAuth: true });
            router.addRoute('/profile/edit', ProfileEditPage, { requiresAuth: true });
            router.addRoute('/group/create', GroupChatPage, { requiresAuth: true });
            router.addRoute('/group/:id', GroupChatPage, { requiresAuth: true });
            router.addRoute('/notifications', NotificationsPage, { requiresAuth: true });
            router.addRoute('/search', SearchPage, { requiresAuth: true });
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
            });

            // After each route
            router.after(async (path, query, params) => {
                console.log('Route loaded:', path);
                this.trackPageView(path);
                window.scrollTo(0, 0);
            });

            // Initialize router
            router.init();

            console.log('✅ Routes initialized');
        } catch (error) {
            console.error('❌ Route initialization failed:', error);
            throw error;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        console.log('Setting up event listeners...');

        try {
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
                this.showToast('Back online', 'success');
            });

            window.addEventListener('offline', () => {
                document.body.classList.add('offline');
                this.showToast('You are offline', 'warning');
            });

            // Handle visibility change
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.onAppVisible();
                } else {
                    this.onAppHidden();
                }
            });

            console.log('✅ Event listeners setup complete');
        } catch (error) {
            console.error('❌ Event listener setup failed:', error);
            // Non-critical - continue
        }
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

    // Show toast message
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
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
            } else if (path.startsWith('/chat/') && page === 'chat') {
                item.classList.add('active');
            } else if (path.startsWith('/profile/') && page === 'profile') {
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
            '/notifications': 'Notifications',
            '/search': 'Search',
            '/profile': 'Profile',
            '/profile/edit': 'Edit Profile',
            '/post/create': 'Create Post',
            '/group/create': 'Create Group',
            '/settings': 'Settings',
            '/auth': 'Authentication'
        };

        if (path.startsWith('/post/') && path !== '/post/create') {
            document.title = 'Post - HERE';
        } else if (path.startsWith('/chat/') && path !== '/chat') {
            document.title = 'Chat - HERE';
        } else if (path.startsWith('/profile/') && !path.includes('/edit') && path !== '/profile') {
            document.title = 'Profile - HERE';
        } else {
            const title = titles[path] || 'HERE Social';
            document.title = `${title} - HERE`;
        }
    }

    // Track page view
    trackPageView(path) {
        console.log('Page view:', path);
        // Analytics implementation here
    }

    // Handle service worker messages
    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'SYNC_COMPLETE':
                console.log('Background sync complete');
                this.showToast('Sync complete', 'success');
                break;
            case 'OFFLINE_QUEUED':
                console.log('Request queued for offline');
                break;
            case 'NEW_CONTENT':
                console.log('New content available');
                this.showToast('New content available', 'info');
                break;
        }
    }

    // On app visible
    onAppVisible() {
        console.log('App became visible');
        
        // Check for updates
        if (navigator.onLine && window.syncManager) {
            setTimeout(() => {
                try {
                    syncManager.syncAll();
                } catch (e) {
                    console.error('Sync on visible failed:', e);
                }
            }, 100);
        }

        // Update presence
        if (authStore?.getState()?.isAuthenticated) {
            authStore.asyncActions.updateActivity().catch(e => 
                console.error('Activity update failed:', e)
            );
        }
    }

    // On app hidden
    onAppHidden() {
        console.log('App hidden');
        
        // Update last seen
        if (authStore?.getState()?.isAuthenticated && navigator.onLine && window.api) {
            api.post('/users/presence', {
                status: 'away',
                lastSeen: Date.now()
            }).catch(e => console.error('Presence update failed:', e));
        }
    }

    // Open AI assistant
    openAIAssistant() {
        console.log('Opening AI assistant');
        if (window.aiAssistant) {
            aiAssistant.toggle();
        } else {
            console.warn('AI assistant not available');
            this.showToast('AI assistant coming soon', 'info');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, starting app...');
    window.app = new HEREApp();
    window.app.init().catch(e => {
        console.error('Fatal app initialization error:', e);
        // Show error on splash
        const splash = document.getElementById('splash');
        if (splash) {
            splash.innerHTML = `
                <div class="splash-content error">
                    <div class="error-icon">⚠️</div>
                    <h2>Failed to load</h2>
                    <p>${e.message}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    });
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
    console.error('GLOBAL ERROR:', event.error);
    console.error('Error message:', event.message);
    console.error('Error filename:', event.filename);
    console.error('Error line:', event.lineno);
    
    // Show toast if app is initialized
    if (window.app?.initialized) {
        app.showToast('An error occurred', 'error');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('UNHANDLED PROMISE REJECTION:', event.reason);
});

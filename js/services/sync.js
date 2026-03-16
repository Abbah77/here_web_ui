// Path: here-social/js/services/sync.js

/**
 * Background Sync Manager
 * Handles data synchronization between client and server
 */
class SyncManager {
    constructor() {
        this.isSyncing = false;
        this.lastSyncTimes = {};
        this.syncIntervals = {};
        this.setupEventListeners();
    }

    // Initialize sync manager
    async init() {
        console.log('Initializing SyncManager...');

        // Load last sync times
        this.lastSyncTimes = await this.loadSyncTimes();

        // Setup periodic sync
        this.setupPeriodicSync();

        // Register for background sync
        this.registerBackgroundSync();

        // Initial sync
        this.syncAll();
    }

    // Setup event listeners
    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            console.log('Network is online - starting sync');
            this.showToast('Back online - syncing...');
            this.syncAll();
        });

        window.addEventListener('offline', () => {
            console.log('Network is offline');
            this.showToast('You are offline - changes will sync when online');
        });

        // App visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('App became visible - checking for updates');
                this.syncAll();
            }
        });

        // Listen for service worker messages
        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SYNC_COMPLETE') {
                    this.handleSyncComplete(event.data);
                }
            });
        }
    }

    // Setup periodic sync
    setupPeriodicSync() {
        // Messages sync every 30 seconds
        this.syncIntervals.messages = setInterval(() => {
            if (navigator.onLine) {
                this.syncMessages();
            }
        }, SYNC_INTERVALS.MESSAGES);

        // Posts sync every minute
        this.syncIntervals.posts = setInterval(() => {
            if (navigator.onLine) {
                this.syncPosts();
            }
        }, SYNC_INTERVALS.POSTS);

        // Notifications sync every minute
        this.syncIntervals.notifications = setInterval(() => {
            if (navigator.onLine) {
                this.syncNotifications();
            }
        }, SYNC_INTERVALS.NOTIFICATIONS);

        // Presence update every 30 seconds
        this.syncIntervals.presence = setInterval(() => {
            if (navigator.onLine && authStore.getState()?.isAuthenticated) {
                this.updatePresence();
            }
        }, SYNC_INTERVALS.PRESENCE);
    }

    // Register for background sync (service worker)
    registerBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                // Register for periodic background sync
                if ('periodicSync' in registration) {
                    registration.periodicSync.register('sync-all', {
                        minInterval: 60 * 60 * 1000 // 1 hour
                    });
                }
            });
        }
    }

    // Load last sync times from storage
    async loadSyncTimes() {
        const times = {};
        
        const stored = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
        if (stored) {
            try {
                Object.assign(times, JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse sync times:', e);
            }
        }

        return times;
    }

    // Save last sync times
    async saveSyncTimes() {
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(this.lastSyncTimes));
    }

    // Update last sync time
    updateLastSync(type) {
        this.lastSyncTimes[type] = Date.now();
        this.saveSyncTimes();
    }

    // Get last sync time
    getLastSync(type) {
        return this.lastSyncTimes[type] || 0;
    }

    // Sync all data
    async syncAll() {
        if (this.isSyncing || !navigator.onLine) return;

        this.isSyncing = true;
        if (syncStore) syncStore.dispatch(syncActions.setProcessing(true));

        try {
            // Sync in parallel
            await Promise.allSettled([
                this.syncMessages(),
                this.syncPosts(),
                this.syncNotifications(),
                this.syncProfile(),
                this.syncFriends()
            ]);

            if (syncStore) syncStore.dispatch(syncActions.updateSyncProgress());
            
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.isSyncing = false;
            if (syncStore) syncStore.dispatch(syncActions.setProcessing(false));
        }
    }

    // Sync messages
    async syncMessages() {
        if (!navigator.onLine) return;

        if (syncStore) syncStore.dispatch(syncActions.setStoreSyncing('messages', true));

        try {
            const lastSync = this.getLastSync('messages');
            
            // Get new messages
            const response = await api.get('/chat/sync', {
                since: lastSync
            });

            if (response.messages && response.messages.length > 0) {
                await this.processNewMessages(response.messages);
            }

            // Update presence
            await api.post('/chat/presence', {
                status: 'online',
                timestamp: Date.now()
            });

            this.updateLastSync('messages');
            
        } catch (error) {
            console.error('Message sync failed:', error);
            if (syncStore) syncStore.dispatch(syncActions.addSyncError(error.message, { type: 'messages' }));
        } finally {
            if (syncStore) syncStore.dispatch(syncActions.setStoreSyncing('messages', false));
        }
    }

    // Sync posts
    async syncPosts() {
        if (!navigator.onLine) return;

        if (syncStore) syncStore.dispatch(syncActions.setStoreSyncing('posts', true));

        try {
            const lastSync = this.getLastSync('posts');
            
            const response = await api.get('/posts/sync', {
                since: lastSync
            });

            if (response.posts && response.posts.length > 0) {
                await this.processNewPosts(response.posts);
            }

            this.updateLastSync('posts');
            
        } catch (error) {
            console.error('Post sync failed:', error);
            if (syncStore) syncStore.dispatch(syncActions.addSyncError(error.message, { type: 'posts' }));
        } finally {
            if (syncStore) syncStore.dispatch(syncActions.setStoreSyncing('posts', false));
        }
    }

    // Sync notifications
    async syncNotifications() {
        if (!navigator.onLine) return;

        try {
            const response = await api.get('/notifications');

            if (response.notifications) {
                for (const notification of response.notifications) {
                    await db.put('notifications', notification);
                }
            }
            
        } catch (error) {
            console.error('Notification sync failed:', error);
        }
    }

    // Sync profile
    async syncProfile() {
        if (!navigator.onLine) return;

        try {
            const response = await api.get('/users/profile');

            if (response.user) {
                authStore.dispatch(authActions.updateUser(response.user));
                await db.put('users', response.user);
            }
            
        } catch (error) {
            console.error('Profile sync failed:', error);
        }
    }

    // Sync friends
    async syncFriends() {
        if (!navigator.onLine) return;

        try {
            const response = await api.get('/users/friends');

            if (response.friends) {
                for (const friend of response.friends) {
                    await db.put('users', friend);
                }
            }
            
        } catch (error) {
            console.error('Friends sync failed:', error);
        }
    }

    // Process new messages
    async processNewMessages(messages) {
        for (const message of messages) {
            // Check if we already have it
            const existing = await db.get('messages', message.messageId);
            
            if (!existing) {
                // Add to store
                chatStore.dispatch(chatActions.addMessage(message.chatId, message));
                
                // Save to DB
                await db.put('messages', message);

                // Show notification if not active
                const activeChat = chatStore.getState()?.activeChat;
                if (activeChat !== message.chatId && document.visibilityState !== 'visible') {
                    this.showNotification('New Message', message.content);
                }
            }
        }
    }

    // Process new posts
    async processNewPosts(posts) {
        for (const post of posts) {
            const existing = await db.get('posts', post.postId);
            
            if (!existing) {
                feedStore.dispatch(feedActions.addPost(post));
                await db.put('posts', post);
            }
        }

        // Update new posts count
        const feedState = feedStore.getState();
        if (feedState.posts.length > 0) {
            const lastPostTimestamp = feedState.posts[0]?.timestamp;
            const newPosts = posts.filter(p => p.timestamp > lastPostTimestamp);
            
            if (newPosts.length > 0) {
                feedStore.dispatch(feedActions.updateNewPostsCount(newPosts.length));
            }
        }
    }

    // Update presence
    async updatePresence() {
        if (!navigator.onLine) return;

        try {
            await api.post('/users/presence', {
                status: 'online',
                lastSeen: Date.now()
            });
        } catch (error) {
            // Silently fail - presence is not critical
        }
    }

    // Queue action for offline sync
    async queueAction(action) {
        const syncItem = {
            syncId: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: action.type,
            data: action.data,
            tempId: action.tempId,
            timestamp: Date.now(),
            status: 'pending',
            retries: 0,
            maxRetries: 5
        };

        // Add to sync store if available
        if (syncStore) {
            syncStore.dispatch(syncActions.addToQueue(syncItem));
        }

        // Save to IndexedDB
        await db.put('syncQueue', syncItem);

        // If online, process queue
        if (navigator.onLine && syncStore) {
            this.processQueue();
        }

        return syncItem.syncId;
    }

    // Process sync queue
    async processQueue() {
        if (!syncStore) return;
        
        const state = syncStore.getState();
        
        if (state.processing || !state.networkStatus || state.queue.length === 0) {
            return;
        }

        syncStore.dispatch(syncActions.setProcessing(true));

        const queue = [...state.queue].sort((a, b) => a.timestamp - b.timestamp);

        for (const item of queue) {
            try {
                // Mark as processing
                syncStore.dispatch(syncActions.updateQueueItem(item.syncId, { status: 'processing' }));
                await db.put('syncQueue', { ...item, status: 'processing' });

                // Process based on type
                await this.processSyncItem(item);

                // Remove from queue on success
                syncStore.dispatch(syncActions.removeFromQueue(item.syncId));
                await db.delete('syncQueue', item.syncId);

            } catch (error) {
                console.error(`Failed to sync item ${item.syncId}:`, error);

                // Update retry count
                const retries = (item.retries || 0) + 1;
                
                if (retries >= item.maxRetries) {
                    // Mark as failed permanently
                    syncStore.dispatch(syncActions.addSyncError(error.message, item));
                    syncStore.dispatch(syncActions.removeFromQueue(item.syncId));
                    await db.delete('syncQueue', item.syncId);
                } else {
                    // Update retry count
                    syncStore.dispatch(syncActions.updateQueueItem(item.syncId, { 
                        status: 'pending',
                        retries,
                        lastError: error.message
                    }));
                    await db.put('syncQueue', { 
                        ...item, 
                        status: 'pending',
                        retries,
                        lastError: error.message 
                    });
                }
            }
        }

        syncStore.dispatch(syncActions.setProcessing(false));
        syncStore.dispatch(syncActions.updateSyncProgress());
    }

    // Process individual sync item
    async processSyncItem(item) {
        switch (item.type) {
            case 'SEND_MESSAGE':
                await this.processSendMessage(item);
                break;
            case 'CREATE_POST':
                await this.processCreatePost(item);
                break;
            case 'LIKE_POST':
            case 'UNLIKE_POST':
                await this.processLikePost(item);
                break;
            case 'UPDATE_PROFILE':
                await this.processUpdateProfile(item);
                break;
            case 'FOLLOW_USER':
            case 'FRIEND_REQUEST':
                await this.processFriendRequest(item);
                break;
            case 'ADD_COMMENT':
                await this.processAddComment(item);
                break;
            case 'UPDATE_PRESENCE':
                await this.processPresence(item);
                break;
            default:
                console.warn('Unknown sync type:', item.type);
        }
    }

    // Process send message
    async processSendMessage(item) {
        // This will be replaced with actual API call
        await mockSendMessageAPI(item.data);
        
        // Update local message status
        const message = await db.get('messages', item.data.tempId);
        if (message) {
            message.status = MESSAGE_STATUS.SENT;
            await db.put('messages', message);
            
            // Update store
            chatStore.dispatch(chatActions.updateMessageStatus(
                item.data.chatId,
                item.data.tempId,
                MESSAGE_STATUS.SENT
            ));
        }
    }

    // Process create post
    async processCreatePost(item) {
        // This will be replaced with actual API call
        const response = await mockCreatePostAPI(item.data);
        
        // Update local post with real ID
        const post = await db.get('posts', item.tempId);
        if (post && response.postId) {
            post.postId = response.postId;
            post.status = 'posted';
            await db.put('posts', post);
            
            // Update store
            feedStore.dispatch(feedActions.updatePost({
                ...post,
                postId: response.postId
            }));
        }
    }

    // Process like/unlike
    async processLikePost(item) {
        // This will be replaced with actual API call
        await mockLikePostAPI(item.data.postId, item.type === 'LIKE_POST');
    }

    // Process update profile
    async processUpdateProfile(item) {
        // This will be replaced with actual API call
        await mockUpdateProfileAPI(item.data);
    }

    // Process friend request
    async processFriendRequest(item) {
        // This will be replaced with actual API call
        await mockFriendRequestAPI(item.data);
    }

    // Process add comment
    async processAddComment(item) {
        // This will be replaced with actual API call
        await mockAddCommentAPI(item.data);
    }

    // Process presence update
    async processPresence(item) {
        // This will be replaced with actual API call
        await mockPresenceAPI(item.data);
    }

    // Show toast message
    showToast(message) {
        // Create toast element if not exists
        let toast = document.getElementById('syncToast');
        
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'syncToast';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--bg-secondary);
                color: var(--text-primary);
                padding: 10px 20px;
                border-radius: 25px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                font-size: 14px;
                transition: opacity 0.3s;
                opacity: 0;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.opacity = '1';

        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    }

    // Show notification
    showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/assets/icons/icon-192.png'
            });
        }
    }

    // Handle sync complete from service worker
    handleSyncComplete(data) {
        console.log('Background sync complete:', data);
        
        if (data.success) {
            this.updateLastSync('background');
            
            // Show toast
            this.showToast('Sync complete');
        }
    }

    // Clean up
    destroy() {
        // Clear intervals
        Object.values(this.syncIntervals).forEach(interval => {
            clearInterval(interval);
        });
    }
}

// Mock API functions
async function mockSendMessageAPI(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Message sent:', data);
            resolve({ success: true, messageId: 'real_' + Date.now() });
        }, 500);
    });
}

async function mockCreatePostAPI(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Post created:', data);
            resolve({ success: true, postId: 'post_' + Date.now() });
        }, 800);
    });
}

async function mockLikePostAPI(postId, like) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`${like ? 'Liked' : 'Unliked'} post:`, postId);
            resolve({ success: true });
        }, 300);
    });
}

async function mockUpdateProfileAPI(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Profile updated:', data);
            resolve({ success: true });
        }, 600);
    });
}

async function mockFriendRequestAPI(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Friend request:', data);
            resolve({ success: true });
        }, 400);
    });
}

async function mockAddCommentAPI(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Comment added:', data);
            resolve({ success: true });
        }, 400);
    });
}

async function mockPresenceAPI(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Presence updated:', data);
            resolve({ success: true });
        }, 200);
    });
}

// Create global instance
window.syncManager = new SyncManager();
// Path: here-social/js/store/sync.store.js

/**
 * Sync Store
 * Manages offline sync queue and background sync status
 */

// Initial state
const initialState = {
    queue: [],                 // Pending sync items
    processing: false,
    lastSync: null,
    syncErrors: [],
    networkStatus: navigator.onLine,
    pendingCount: 0,
    failedCount: 0,
    syncingStores: {
        messages: false,
        posts: false,
        profile: false,
        friends: false
    }
};

// Action types
const ACTIONS = {
    ADD_TO_QUEUE: 'ADD_TO_QUEUE',
    REMOVE_FROM_QUEUE: 'REMOVE_FROM_QUEUE',
    UPDATE_QUEUE_ITEM: 'UPDATE_QUEUE_ITEM',
    SET_PROCESSING: 'SET_PROCESSING',
    SET_NETWORK_STATUS: 'SET_NETWORK_STATUS',
    ADD_SYNC_ERROR: 'ADD_SYNC_ERROR',
    CLEAR_SYNC_ERRORS: 'CLEAR_SYNC_ERRORS',
    UPDATE_SYNC_PROGRESS: 'UPDATE_SYNC_PROGRESS',
    SET_STORE_SYNCING: 'SET_STORE_SYNCING',
    HYDRATE_QUEUE: 'HYDRATE_QUEUE'
};

// Reducer
function syncReducer(state = initialState, action) {
    switch (action.type) {
        case ACTIONS.ADD_TO_QUEUE:
            return {
                ...state,
                queue: [...state.queue, action.payload],
                pendingCount: state.pendingCount + 1
            };

        case ACTIONS.REMOVE_FROM_QUEUE:
            return {
                ...state,
                queue: state.queue.filter(item => item.syncId !== action.payload),
                pendingCount: Math.max(0, state.pendingCount - 1)
            };

        case ACTIONS.UPDATE_QUEUE_ITEM:
            return {
                ...state,
                queue: state.queue.map(item =>
                    item.syncId === action.payload.syncId
                        ? { ...item, ...action.payload }
                        : item
                )
            };

        case ACTIONS.SET_PROCESSING:
            return {
                ...state,
                processing: action.payload
            };

        case ACTIONS.SET_NETWORK_STATUS:
            return {
                ...state,
                networkStatus: action.payload
            };

        case ACTIONS.ADD_SYNC_ERROR:
            return {
                ...state,
                syncErrors: [...state.syncErrors, {
                    ...action.payload,
                    timestamp: Date.now()
                }],
                failedCount: state.failedCount + 1
            };

        case ACTIONS.CLEAR_SYNC_ERRORS:
            return {
                ...state,
                syncErrors: [],
                failedCount: 0
            };

        case ACTIONS.UPDATE_SYNC_PROGRESS:
            return {
                ...state,
                lastSync: Date.now()
            };

        case ACTIONS.SET_STORE_SYNCING:
            return {
                ...state,
                syncingStores: {
                    ...state.syncingStores,
                    [action.payload.store]: action.payload.syncing
                }
            };

        case ACTIONS.HYDRATE_QUEUE:
            return {
                ...state,
                queue: action.payload,
                pendingCount: action.payload.length
            };

        default:
            return state;
    }
}

// Action creators
const syncActions = {
    addToQueue: (item) => ({
        type: ACTIONS.ADD_TO_QUEUE,
        payload: item
    }),

    removeFromQueue: (syncId) => ({
        type: ACTIONS.REMOVE_FROM_QUEUE,
        payload: syncId
    }),

    updateQueueItem: (syncId, updates) => ({
        type: ACTIONS.UPDATE_QUEUE_ITEM,
        payload: { syncId, ...updates }
    }),

    setProcessing: (processing) => ({
        type: ACTIONS.SET_PROCESSING,
        payload: processing
    }),

    setNetworkStatus: (isOnline) => ({
        type: ACTIONS.SET_NETWORK_STATUS,
        payload: isOnline
    }),

    addSyncError: (error, item) => ({
        type: ACTIONS.ADD_SYNC_ERROR,
        payload: { error, item }
    }),

    clearSyncErrors: () => ({ type: ACTIONS.CLEAR_SYNC_ERRORS }),

    updateSyncProgress: () => ({ type: ACTIONS.UPDATE_SYNC_PROGRESS }),

    setStoreSyncing: (store, syncing) => ({
        type: ACTIONS.SET_STORE_SYNCING,
        payload: { store, syncing }
    }),

    hydrateQueue: (queue) => ({
        type: ACTIONS.HYDRATE_QUEUE,
        payload: queue
    })
};

// Async actions
const syncAsyncActions = {
    // Initialize sync manager
    initSync: () => async (dispatch) => {
        // Load pending queue from IndexedDB
        try {
            const pendingItems = await db.queryRange(
                'syncQueue',
                'status',
                IDBKeyRange.only('pending')
            );
            
            dispatch(syncActions.hydrateQueue(pendingItems));
        } catch (error) {
            console.error('Failed to load sync queue:', error);
        }

        // Set up network listeners
        window.addEventListener('online', () => {
            dispatch(syncActions.setNetworkStatus(true));
            dispatch(syncAsyncActions.processQueue());
        });

        window.addEventListener('offline', () => {
            dispatch(syncActions.setNetworkStatus(false));
        });

        // Process queue if online
        if (navigator.onLine) {
            dispatch(syncAsyncActions.processQueue());
        }
    },

    // Add item to sync queue
    queueAction: (action) => async (dispatch) => {
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

        // Add to store
        dispatch(syncActions.addToQueue(syncItem));

        // Save to IndexedDB
        await db.put('syncQueue', syncItem);

        // If online, process queue
        if (navigator.onLine) {
            dispatch(syncAsyncActions.processQueue());
        }

        return syncItem.syncId;
    },

    // Process sync queue
    processQueue: () => async (dispatch, getState) => {
        const state = getState('sync');
        
        if (state.processing || !state.networkStatus || state.queue.length === 0) {
            return;
        }

        dispatch(syncActions.setProcessing(true));

        const queue = [...state.queue].sort((a, b) => a.timestamp - b.timestamp);

        for (const item of queue) {
            try {
                // Mark as processing
                dispatch(syncActions.updateQueueItem(item.syncId, { status: 'processing' }));
                await db.put('syncQueue', { ...item, status: 'processing' });

                // Process based on type
                await dispatch(syncAsyncActions.processItem(item));

                // Remove from queue on success
                dispatch(syncActions.removeFromQueue(item.syncId));
                await db.delete('syncQueue', item.syncId);

            } catch (error) {
                console.error(`Failed to sync item ${item.syncId}:`, error);

                // Update retry count
                const retries = (item.retries || 0) + 1;
                
                if (retries >= item.maxRetries) {
                    // Mark as failed permanently
                    dispatch(syncActions.addSyncError(error.message, item));
                    dispatch(syncActions.removeFromQueue(item.syncId));
                    await db.delete('syncQueue', item.syncId);
                } else {
                    // Update retry count
                    dispatch(syncActions.updateQueueItem(item.syncId, { 
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

        dispatch(syncActions.setProcessing(false));
        dispatch(syncActions.updateSyncProgress());
    },

    // Process individual sync item
    processItem: (item) => async (dispatch) => {
        switch (item.type) {
            case 'SEND_MESSAGE':
                await dispatch(syncAsyncActions.processSendMessage(item));
                break;
            case 'CREATE_POST':
                await dispatch(syncAsyncActions.processCreatePost(item));
                break;
            case 'LIKE_POST':
            case 'UNLIKE_POST':
                await dispatch(syncAsyncActions.processLikePost(item));
                break;
            case 'UPDATE_PROFILE':
                await dispatch(syncAsyncActions.processUpdateProfile(item));
                break;
            case 'FRIEND_REQUEST':
                await dispatch(syncAsyncActions.processFriendRequest(item));
                break;
            case 'UPDATE_PRESENCE':
                await dispatch(syncAsyncActions.processPresence(item));
                break;
            default:
                console.warn('Unknown sync type:', item.type);
        }
    },

    // Process send message
    processSendMessage: async (item) => {
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
    },

    // Process create post
    processCreatePost: async (item) => {
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
    },

    // Process like/unlike
    processLikePost: async (item) => {
        // This will be replaced with actual API call
        await mockLikePostAPI(item.data.postId, item.type === 'LIKE_POST');
    },

    // Process update profile
    processUpdateProfile: async (item) => {
        // This will be replaced with actual API call
        await mockUpdateProfileAPI(item.data);
    },

    // Process friend request
    processFriendRequest: async (item) => {
        // This will be replaced with actual API call
        await mockFriendRequestAPI(item.data);
    },

    // Process presence update
    processPresence: async (item) => {
        // This will be replaced with actual API call
        await mockPresenceAPI(item.data);
    },

    // Clear all pending sync
    clearQueue: () => async (dispatch) => {
        await db.clear('syncQueue');
        dispatch(syncActions.hydrateQueue([]));
        dispatch(syncActions.clearSyncErrors());
    },

    // Retry failed items
    retryFailed: () => async (dispatch, getState) => {
        const state = getState('sync');
        
        // Clear errors
        dispatch(syncActions.clearSyncErrors());
        
        // Reprocess queue
        if (state.networkStatus) {
            dispatch(syncAsyncActions.processQueue());
        }
    }
};

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

async function mockPresenceAPI(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Presence updated:', data);
            resolve({ success: true });
        }, 200);
    });
}

// Register store
const syncStore = store.register('sync', initialState, syncReducer);
syncStore.actions = syncActions;
syncStore.asyncActions = syncAsyncActions;

window.syncStore = syncStore;
// App Constants
const APP = {
    NAME: 'HERE',
    VERSION: '1.0.0',
    DEBUG: true
};

// Storage keys
const STORAGE_KEYS = {
    AUTH_TOKEN: 'here_auth_token',
    USER_DATA: 'here_user_data',
    THEME: 'here_theme',
    LAST_SYNC: 'here_last_sync',
    SETTINGS: 'here_settings'
};

// API endpoints
const API = {
    BASE_URL: 'https://here-web-backend.onrender.com',
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/auth/login',
            REGISTER: '/api/auth/register',
            LOGOUT: '/api/auth/logout',
            REFRESH: '/api/auth/refresh'
        },
        USERS: {
            PROFILE: '/api/users/profile',
            SEARCH: '/api/users/search',
            FRIENDS: '/api/users/friends'
        },
        POSTS: {
            FEED: '/api/posts/feed',
            CREATE: '/api/posts',
            LIKE: '/api/posts/:id/like',
            COMMENT: '/api/posts/:id/comments'
        },
        CHAT: {
            LIST: '/api/chat/list',
            MESSAGES: '/api/chat/:id/messages',
            SEND: '/api/chat/send'
        },
        NOTIFICATIONS: {                    // ✅ ADD THIS
            LIST: '/api/notifications',
            READ: '/api/notifications/:id/read',
            READ_ALL: '/api/notifications/read-all',
            UNREAD_COUNT: '/api/notifications/unread-count'
        },
        FRIENDS: {                           // ✅ ADD THIS
            REQUESTS: '/api/friends/requests',
            ACCEPT: '/api/friends/requests/:id/accept',
            DECLINE: '/api/friends/requests/:id'
        }
    }
};

// Navigation routes
const ROUTES = {
    HOME: '/',
    AUTH: '/auth',
    FRIENDS: '/friends',
    EXPLORE: '/explore',
    CHAT: '/chat',
    CHAT_DETAIL: '/chat/:id',
    PROFILE: '/profile',
    PROFILE_EDIT: '/profile/edit',
    POST: '/post/:id',
    SETTINGS: '/settings'
};

// IndexedDB config
const DB_CONFIG = {
    NAME: 'HERE_DB',
    VERSION: 1,
    STORES: {
        AUTH: 'auth',
        POSTS: 'posts',
        MESSAGES: 'messages',
        CHATS: 'chats',
        USERS: 'users',
        SYNC_QUEUE: 'syncQueue',
        NOTIFICATIONS: 'notifications',
        FRIENDS: 'friends'
    }
};

// Message status types
const MESSAGE_STATUS = {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    SEEN: 'seen',
    FAILED: 'failed'
};

// Friend request status
const FRIEND_STATUS = {
    NONE: 'none',
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    BLOCKED: 'blocked'
};

// Notification types
const NOTIFICATION_TYPES = {
    FRIEND_REQUEST: 'friend_request',
    FRIEND_ACCEPT: 'friend_accept',
    NEW_MESSAGE: 'new_message',
    POST_LIKE: 'post_like',
    POST_COMMENT: 'post_comment',
    MENTION: 'mention'
};

// Media constraints
const MEDIA_CONSTRAINTS = {
    IMAGE: {
        MAX_SIZE: 500 * 1024, // 500KB
        QUALITY: 0.75,
        MAX_WIDTH: 1920,
        MAX_HEIGHT: 1080
    },
    VIDEO: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        MAX_DURATION: 60, // seconds
        BITRATE: '500k'
    }
};

// Cache limits
const CACHE_LIMITS = {
    POSTS: 500,
    MESSAGES_PER_CHAT: 1000,
    NOTIFICATIONS: 200,
    USERS: 1000
};

// Sync intervals (ms)
const SYNC_INTERVALS = {
    MESSAGES: 30000, // 30 seconds
    POSTS: 60000, // 1 minute
    NOTIFICATIONS: 60000, // 1 minute
    PRESENCE: 30000 // 30 seconds
};

// Animation durations
const ANIMATION = {
    SPLASH: 1500, // 1.5 seconds
    PAGE_TRANSITION: 300,
    MODAL: 200,
    TOAST: 3000
};

// Default user data
const DEFAULT_USER = {
    profile_picture: '/assets/default-avatar.png',
    bio: null,
    friends: 0,
    status: 'online'
};

// Export if using modules, otherwise available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APP,
        STORAGE_KEYS,
        API,
        ROUTES,
        DB_CONFIG,
        MESSAGE_STATUS,
        FRIEND_STATUS,
        NOTIFICATION_TYPES,
        MEDIA_CONSTRAINTS,
        CACHE_LIMITS,
        SYNC_INTERVALS,
        ANIMATION,
        DEFAULT_USER
    };
}

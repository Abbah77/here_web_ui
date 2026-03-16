// Path: here-social/js/db/schemas.js

/**
 * IndexedDB Schema Definitions
 * Version 1 - Initial schema
 */
const DB_SCHEMAS = {
    name: 'HERE_DB',
    version: 1,
    stores: {
        // Auth store - single record for current user
        auth: {
            name: 'auth',
            keyPath: 'id',
            indexes: [
                { name: 'userId', keyPath: 'userId', options: { unique: true } },
                { name: 'email', keyPath: 'email', options: { unique: true } },
                { name: 'username', keyPath: 'username', options: { unique: true } }
            ],
            upgrade: (store) => {
                store.createIndex('userId', 'userId', { unique: true });
                store.createIndex('email', 'email', { unique: true });
                store.createIndex('username', 'username', { unique: true });
            }
        },

        // Posts store
        posts: {
            name: 'posts',
            keyPath: 'postId',
            indexes: [
                { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
                { name: 'authorId', keyPath: 'authorId', options: { unique: false } },
                { name: 'likes', keyPath: 'likes', options: { unique: false } }
            ],
            upgrade: (store) => {
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('authorId', 'authorId', { unique: false });
                store.createIndex('likes', 'likes', { unique: false });
            }
        },

        // Messages store
        messages: {
            name: 'messages',
            keyPath: 'messageId',
            indexes: [
                { name: 'chatId', keyPath: 'chatId', options: { unique: false } },
                { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
                { name: 'status', keyPath: 'status', options: { unique: false } },
                { name: 'senderId', keyPath: 'senderId', options: { unique: false } }
            ],
            upgrade: (store) => {
                store.createIndex('chatId', 'chatId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('senderId', 'senderId', { unique: false });
            }
        },

        // Chats store
        chats: {
            name: 'chats',
            keyPath: 'chatId',
            indexes: [
                { name: 'lastMessageTimestamp', keyPath: 'lastMessageTimestamp', options: { unique: false } },
                { name: 'unreadCount', keyPath: 'unreadCount', options: { unique: false } },
                { name: 'participants', keyPath: 'participants', options: { unique: false, multiEntry: true } }
            ],
            upgrade: (store) => {
                store.createIndex('lastMessageTimestamp', 'lastMessageTimestamp', { unique: false });
                store.createIndex('unreadCount', 'unreadCount', { unique: false });
                store.createIndex('participants', 'participants', { unique: false, multiEntry: true });
            }
        },

        // Users store (profiles)
        users: {
            name: 'users',
            keyPath: 'userId',
            indexes: [
                { name: 'username', keyPath: 'username', options: { unique: true } },
                { name: 'email', keyPath: 'email', options: { unique: true } },
                { name: 'lastSeen', keyPath: 'lastSeen', options: { unique: false } },
                { name: 'status', keyPath: 'status', options: { unique: false } }
            ],
            upgrade: (store) => {
                store.createIndex('username', 'username', { unique: true });
                store.createIndex('email', 'email', { unique: true });
                store.createIndex('lastSeen', 'lastSeen', { unique: false });
                store.createIndex('status', 'status', { unique: false });
            }
        },

        // Sync queue store
        syncQueue: {
            name: 'syncQueue',
            keyPath: 'syncId',
            indexes: [
                { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
                { name: 'type', keyPath: 'type', options: { unique: false } },
                { name: 'status', keyPath: 'status', options: { unique: false } },
                { name: 'retries', keyPath: 'retries', options: { unique: false } }
            ],
            upgrade: (store) => {
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('retries', 'retries', { unique: false });
            }
        },

        // Notifications store
        notifications: {
            name: 'notifications',
            keyPath: 'notificationId',
            indexes: [
                { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
                { name: 'type', keyPath: 'type', options: { unique: false } },
                { name: 'read', keyPath: 'read', options: { unique: false } }
            ],
            upgrade: (store) => {
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('read', 'read', { unique: false });
            }
        },

        // Friends store
        friends: {
            name: 'friends',
            keyPath: 'friendshipId',
            indexes: [
                { name: 'userId', keyPath: 'userId', options: { unique: false } },
                { name: 'friendId', keyPath: 'friendId', options: { unique: false } },
                { name: 'status', keyPath: 'status', options: { unique: false } },
                { name: 'since', keyPath: 'since', options: { unique: false } }
            ],
            upgrade: (store) => {
                store.createIndex('userId', 'userId', { unique: false });
                store.createIndex('friendId', 'friendId', { unique: false });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('since', 'since', { unique: false });
            }
        }
    }
};

// Make available globally
window.DB_SCHEMAS = DB_SCHEMAS;
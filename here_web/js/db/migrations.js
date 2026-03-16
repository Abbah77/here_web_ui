// Path: here-social/js/db/migrations.js

/**
 * Database Migration Handler
 * Manages data transformations between versions
 */
class DBMigrations {
    constructor(db) {
        this.db = db;
    }

    // Run migrations based on version
    async migrate(oldVersion, newVersion) {
        console.log(`Migrating from v${oldVersion} to v${newVersion}`);
        
        const migrations = [
            this.v1_initial,
            this.v1_1_addUserStatus,
            this.v1_2_addMessageReactions
        ];

        for (let i = oldVersion; i < newVersion; i++) {
            if (migrations[i]) {
                await migrations[i].call(this);
            }
        }
    }

    // Version 1 - Initial data migration
    async v1_initial() {
        console.log('Running v1_initial migration');
        
        // Create default system user
        const systemUser = {
            userId: 'system',
            username: 'system',
            fullName: 'HERE System',
            profilePicture: '/assets/default-avatar.png',
            isSystem: true,
            createdAt: Date.now()
        };
        
        await db.put('users', systemUser);
        
        // Create default sync queue cleanup rule
        const cleanupRule = {
            ruleId: 'cleanup_messages',
            storeName: 'messages',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            enabled: true
        };
        
        // Store in sync store (special purpose)
        await db.put('syncQueue', {
            syncId: 'cleanup_rule',
            type: 'CLEANUP_RULE',
            data: cleanupRule,
            timestamp: Date.now(),
            status: 'active'
        });
    }

    // Version 1.1 - Add user status fields
    async v1_1_addUserStatus() {
        console.log('Running v1_1_addUserStatus migration');
        
        // Get all users
        const users = await db.getAll('users');
        
        // Update each user with new fields
        for (const user of users) {
            user.status = user.status || 'offline';
            user.lastSeen = user.lastSeen || Date.now();
            user.isTyping = false;
            
            await db.put('users', user);
        }
    }

    // Version 1.2 - Add message reactions
    async v1_2_addMessageReactions() {
        console.log('Running v1_2_addMessageReactions migration');
        
        // Get all messages
        const messages = await db.getAll('messages');
        
        // Add reactions array to each message
        for (const message of messages) {
            if (!message.reactions) {
                message.reactions = [];
            }
            await db.put('messages', message);
        }
    }

    // Clean up old data
    async cleanupOldData() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        // Clean old notifications
        const oldNotifications = await db.queryRange(
            'notifications',
            'timestamp',
            IDBKeyRange.upperBound(thirtyDaysAgo)
        );
        
        for (const notification of oldNotifications) {
            await db.delete('notifications', notification.notificationId);
        }
        
        // Prune old messages (keep last 1000 per chat)
        const chats = await db.getAll('chats');
        
        for (const chat of chats) {
            await db.prune('messages', 'timestamp', 1000, 'prev');
        }
        
        // Prune old posts (keep last 500)
        await db.prune('posts', 'timestamp', 500, 'prev');
    }

    // Export data for backup
    async exportData() {
        const exportData = {};
        
        const stores = Object.keys(DB_SCHEMAS.stores);
        
        for (const store of stores) {
            exportData[store] = await db.getAll(store);
        }
        
        return exportData;
    }

    // Import data from backup
    async importData(data) {
        const stores = Object.keys(data);
        
        for (const store of stores) {
            if (DB_SCHEMAS.stores[store]) {
                await db.clear(store);
                await db.bulkPut(store, data[store]);
            }
        }
    }
}

// Create global instance
window.dbMigrations = new DBMigrations(db);
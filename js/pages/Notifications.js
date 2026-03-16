// Path: here-social/js/pages/Notifications.js

/**
 * Notifications Page
 * Fetches real data from live backend API
 */
class NotificationsPage {
    constructor(context) {
        this.context = context;
        this.notifications = [];
        this.filter = 'all';
        this.unreadCount = 0;
        this.loading = false;
        this.page = 1;
        this.hasMore = true;
    }

    async render() {
        return `
            <div class="notifications-container">
                <div class="notifications-header">
                    <h2>Notifications</h2>
                    ${this.unreadCount > 0 ? `
                        <button class="text-button" onclick="notificationsPage.markAllAsRead()">
                            Mark all as read
                        </button>
                    ` : ''}
                </div>

                <div class="notifications-tabs">
                    <button class="tab ${this.filter === 'all' ? 'active' : ''}" 
                            onclick="notificationsPage.setFilter('all')">
                        All
                    </button>
                    <button class="tab ${this.filter === 'mentions' ? 'active' : ''}" 
                            onclick="notificationsPage.setFilter('mentions')">
                        Mentions
                    </button>
                    <button class="tab ${this.filter === 'likes' ? 'active' : ''}" 
                            onclick="notificationsPage.setFilter('likes')">
                        Likes
                    </button>
                    <button class="tab ${this.filter === 'comments' ? 'active' : ''}" 
                            onclick="notificationsPage.setFilter('comments')">
                        Comments
                    </button>
                    <button class="tab ${this.filter === 'friend_requests' ? 'active' : ''}" 
                            onclick="notificationsPage.setFilter('friend_requests')">
                        Friend Requests
                    </button>
                </div>

                <div class="notifications-list" id="notificationsList">
                    ${this.renderNotifications()}
                </div>
                
                ${this.loading ? `
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderNotifications() {
        if (this.loading && this.notifications.length === 0) {
            return `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
            `;
        }

        const filtered = this.filterNotifications();

        if (filtered.length === 0) {
            return this.renderEmptyState();
        }

        return filtered.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 data-id="${notification.id}"
                 onclick="notificationsPage.handleNotificationClick('${notification.id}', '${notification.type}', ${this.encodeData(notification.data)})">
                
                <div class="notification-avatar">
                    ${this.renderAvatar(notification)}
                </div>
                
                <div class="notification-content">
                    <div class="notification-text">
                        <strong>${this.escapeHtml(notification.actor?.fullName || 'HERE')}</strong>
                        ${this.getNotificationText(notification)}
                    </div>
                    <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                </div>
                
                ${!notification.read ? '<div class="unread-dot"></div>' : ''}
            </div>
        `).join('');
    }

    renderAvatar(notification) {
        const actor = notification.actor;
        
        if (!actor) {
            return '<div class="avatar-placeholder">👤</div>';
        }

        if (actor.profilePicture && actor.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${actor.profilePicture}" alt="${actor.fullName}" class="notification-avatar-img">`;
        } else {
            const initials = this.getInitials(actor.fullName || 'HERE');
            return `<div class="avatar-placeholder">${initials}</div>`;
        }
    }

    renderEmptyState() {
        const emptyMessages = {
            all: {
                icon: '🔔',
                title: 'No notifications',
                message: "You're all caught up!"
            },
            mentions: {
                icon: '@',
                title: 'No mentions',
                message: "No one has mentioned you yet"
            },
            likes: {
                icon: '❤️',
                title: 'No likes',
                message: "Your posts haven't received any likes yet"
            },
            comments: {
                icon: '💬',
                title: 'No comments',
                message: "No one has commented on your posts"
            },
            friend_requests: {
                icon: '👥',
                title: 'No friend requests',
                message: "You don't have any pending friend requests"
            }
        };

        const msg = emptyMessages[this.filter] || emptyMessages.all;

        return `
            <div class="empty-state">
                <div class="empty-state-icon">${msg.icon}</div>
                <h3>${msg.title}</h3>
                <p>${msg.message}</p>
            </div>
        `;
    }

    getNotificationText(notification) {
        switch (notification.type) {
            case 'like':
            case 'post_like':
                return `liked your post${notification.data?.content ? `: "${this.truncateText(notification.data.content, 30)}"` : ''}`;
            case 'comment':
            case 'post_comment':
                return `commented on your post: "${this.truncateText(notification.data?.comment || notification.data?.content, 30)}"`;
            case 'friend_request':
                return 'sent you a friend request';
            case 'friend_accept':
                return 'accepted your friend request';
            case 'mention':
                return `mentioned you: "${this.truncateText(notification.data?.content, 30)}"`;
            case 'comment_like':
                return 'liked your comment';
            case 'new_message':
                return 'sent you a message';
            default:
                return 'interacted with you';
        }
    }

    async loadNotifications(page = 1) {
        if (this.loading) return;
        
        this.loading = true;
        if (page === 1) {
            this.notifications = [];
        }
        this.refresh();

        try {
            const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            
            if (!token) {
                console.log('No auth token found');
                router.navigate('/auth');
                return;
            }

            // Fetch from backend API
            const response = await fetch(
                `${API.BASE_URL}/api/notifications?page=${page}&limit=20`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
                    router.navigate('/auth');
                    return;
                }
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            
            // Map backend response to frontend format
            const newNotifications = (data.notifications || []).map(n => this.mapNotificationFromAPI(n));
            
            if (page === 1) {
                this.notifications = newNotifications;
            } else {
                this.notifications = [...this.notifications, ...newNotifications];
            }
            
            this.hasMore = data.has_more || false;
            this.page = page;
            this.updateUnreadCount();
            
            // Save to IndexedDB for offline access
            await this.saveToIndexedDB(newNotifications);
            
        } catch (error) {
            console.error('Failed to load notifications:', error);
            
            // Try to load from IndexedDB as fallback
            const offlineNotifications = await this.loadFromIndexedDB();
            if (offlineNotifications.length > 0) {
                this.notifications = offlineNotifications;
                this.updateUnreadCount();
                this.showToast('Showing cached notifications');
            } else {
                this.showToast('Failed to load notifications');
            }
        } finally {
            this.loading = false;
            this.refresh();
        }
    }

    mapNotificationFromAPI(apiNotification) {
        return {
            id: apiNotification.id,
            type: apiNotification.type,
            actor: apiNotification.actor ? {
                fullName: apiNotification.actor.full_name || apiNotification.actor.fullName,
                profilePicture: apiNotification.actor.avatar_url || apiNotification.actor.profilePicture,
                userId: apiNotification.actor.id
            } : null,
            data: {
                postId: apiNotification.post_id,
                commentId: apiNotification.comment_id,
                chatId: apiNotification.chat_id,
                messageId: apiNotification.message_id,
                content: apiNotification.content
            },
            timestamp: new Date(apiNotification.created_at).getTime(),
            read: apiNotification.is_read || false
        };
    }

    async saveToIndexedDB(notifications) {
        try {
            for (const notification of notifications) {
                await db.put('notifications', {
                    id: notification.id,
                    type: notification.type,
                    actor: notification.actor,
                    data: notification.data,
                    timestamp: notification.timestamp,
                    read: notification.read
                });
            }
            
            // Prune old notifications (keep last 200)
            await db.prune('notifications', 'timestamp', 200, 'prev');
            
        } catch (error) {
            console.error('Failed to save notifications to IndexedDB:', error);
        }
    }

    async loadFromIndexedDB() {
        try {
            const notifications = await db.getAll('notifications');
            return notifications.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Failed to load notifications from IndexedDB:', error);
            return [];
        }
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateNotificationBadge();
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    filterNotifications() {
        if (this.filter === 'all') {
            return this.notifications;
        }
        return this.notifications.filter(n => n.type === this.filter);
    }

    setFilter(filter) {
        this.filter = filter;
        this.refresh();
    }

    async markAllAsRead() {
        try {
            const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            
            const response = await fetch(`${API.BASE_URL}/api/notifications/read-all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            // Update local state
            this.notifications = this.notifications.map(n => ({ ...n, read: true }));
            this.unreadCount = 0;
            
            // Update in IndexedDB
            for (const notification of this.notifications) {
                await db.put('notifications', {
                    ...notification,
                    read: true
                });
            }
            
            this.refresh();
            this.updateNotificationBadge();
            this.showToast('All notifications marked as read');
            
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            this.showToast('Failed to update notifications');
        }
    }

    async markAsRead(notificationId) {
        try {
            const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            
            const response = await fetch(`${API.BASE_URL}/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.read) {
                notification.read = true;
                this.unreadCount--;
                
                // Update in IndexedDB
                await db.put('notifications', notification);
                
                this.refresh();
                this.updateNotificationBadge();
            }
            
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    }

    async handleNotificationClick(id, type, data) {
        await this.markAsRead(id);

        switch (type) {
            case 'like':
            case 'post_like':
            case 'comment':
            case 'post_comment':
            case 'mention':
                if (data?.postId) {
                    router.navigate(`/post/${data.postId}`);
                }
                break;
            case 'friend_request':
            case 'friend_accept':
                router.navigate('/friends');
                break;
            case 'new_message':
                if (data?.chatId) {
                    router.navigate(`/chat/${data.chatId}`);
                }
                break;
            default:
                // Do nothing
                break;
        }
    }

    async loadMore() {
        if (this.hasMore && !this.loading) {
            await this.loadNotifications(this.page + 1);
        }
    }

    truncateText(text, length) {
        if (!text) return '';
        return text.length > length ? text.substr(0, length) + '...' : text;
    }

    getInitials(name) {
        if (!name) return '?';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substr(0, 2);
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) {
            return date.toLocaleDateString();
        } else if (days > 0) {
            return `${days}d ago`;
        } else if (hours > 0) {
            return `${hours}h ago`;
        } else if (minutes > 0) {
            return `${minutes}m ago`;
        } else {
            return 'Just now';
        }
    }

    encodeData(data) {
        return JSON.stringify(data || {}).replace(/"/g, '&quot;');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    refresh() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = this.render();
            this.mounted();
        }
    }

    mounted() {
        // Load notifications
        this.loadNotifications();
        
        // Setup infinite scroll
        this.setupInfiniteScroll();
        
        // Update badge
        this.updateNotificationBadge();
    }

    setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMore && !this.loading) {
                    this.loadMore();
                }
            });
        }, { threshold: 0.5 });

        const list = document.getElementById('notificationsList');
        if (list) {
            const sentinel = document.createElement('div');
            sentinel.id = 'notificationsSentinel';
            sentinel.style.height = '20px';
            list.appendChild(sentinel);
            observer.observe(sentinel);
        }
    }
}

// Make available globally
window.NotificationsPage = NotificationsPage;

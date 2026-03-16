// Path: here-social/js/pages/Notifications.js

/**
 * Notifications Page
 */
class NotificationsPage {
    constructor(context) {
        this.context = context;
        this.notifications = [];
        this.filter = 'all'; // all, mentions, likes, comments, friend_requests
        this.unreadCount = 0;
    }

    async render() {
        await this.loadNotifications();

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

                <div class="notifications-list">
                    ${this.renderNotifications()}
                </div>
            </div>
        `;
    }

    renderNotifications() {
        const filtered = this.filterNotifications();

        if (filtered.length === 0) {
            return this.renderEmptyState();
        }

        return filtered.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 data-id="${notification.id}"
                 onclick="notificationsPage.handleNotificationClick('${notification.id}', '${notification.type}', ${JSON.stringify(notification.data).replace(/"/g, '&quot;')})">
                
                <div class="notification-avatar">
                    ${this.renderAvatar(notification)}
                </div>
                
                <div class="notification-content">
                    <div class="notification-text">
                        <strong>${this.escapeHtml(notification.actor?.fullName || 'Someone')}</strong>
                        ${this.getNotificationText(notification)}
                    </div>
                    <div class="notification-time">${formatDate(notification.timestamp)}</div>
                </div>
                
                ${notification.media ? this.renderNotificationMedia(notification) : ''}
                
                ${!notification.read ? '<div class="unread-dot"></div>' : ''}
            </div>
        `).join('');
    }

    renderAvatar(notification) {
        const actor = notification.actor;
        
        if (!actor) {
            return '<div class="avatar-placeholder">?</div>';
        }

        if (actor.profilePicture && actor.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${actor.profilePicture}" alt="${actor.fullName}" class="notification-avatar-img">`;
        } else {
            const initials = getInitials(actor.fullName || '?');
            return `<div class="avatar-placeholder">${initials}</div>`;
        }
    }

    renderNotificationMedia(notification) {
        return `
            <div class="notification-media">
                ${notification.type === 'like' ? '❤️' : ''}
                ${notification.type === 'comment' ? '💬' : ''}
                ${notification.type === 'friend_request' ? '👥' : ''}
                ${notification.media?.type === 'image' ? '🖼️' : ''}
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
                </svg>
                <h3>No notifications</h3>
                <p>You're all caught up!</p>
            </div>
        `;
    }

    getNotificationText(notification) {
        switch (notification.type) {
            case 'like':
                return `liked your post: "${this.truncateText(notification.data?.content, 30)}"`;
            case 'comment':
                return `commented on your post: "${this.truncateText(notification.data?.comment, 30)}"`;
            case 'friend_request':
                return 'sent you a friend request';
            case 'friend_accept':
                return 'accepted your friend request';
            case 'mention':
                return `mentioned you: "${this.truncateText(notification.data?.content, 30)}"`;
            case 'share':
                return `shared your post`;
            default:
                return 'interacted with your content';
        }
    }

    async loadNotifications() {
        // Mock data - replace with actual API/db
        this.notifications = [
            {
                id: '1',
                type: 'like',
                actor: {
                    fullName: 'Alice Johnson',
                    profilePicture: null
                },
                data: {
                    postId: 'post1',
                    content: 'Beautiful sunset!'
                },
                timestamp: Date.now() - 1800000,
                read: false
            },
            {
                id: '2',
                type: 'comment',
                actor: {
                    fullName: 'Bob Smith',
                    profilePicture: null
                },
                data: {
                    postId: 'post2',
                    comment: 'Great shot!'
                },
                timestamp: Date.now() - 3600000,
                read: false
            },
            {
                id: '3',
                type: 'friend_request',
                actor: {
                    fullName: 'Carol White',
                    profilePicture: null
                },
                data: {},
                timestamp: Date.now() - 86400000,
                read: true
            },
            {
                id: '4',
                type: 'friend_accept',
                actor: {
                    fullName: 'David Brown',
                    profilePicture: null
                },
                data: {},
                timestamp: Date.now() - 172800000,
                read: true
            },
            {
                id: '5',
                type: 'mention',
                actor: {
                    fullName: 'Eve Wilson',
                    profilePicture: null
                },
                data: {
                    postId: 'post3',
                    content: 'Check this out @john'
                },
                timestamp: Date.now() - 259200000,
                read: true
            }
        ];

        this.unreadCount = this.notifications.filter(n => !n.read).length;
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
        this.notifications = this.notifications.map(n => ({ ...n, read: true }));
        this.unreadCount = 0;
        this.refresh();
        
        // Update in DB
        await db.bulkPut('notifications', this.notifications);
        
        this.showToast('All notifications marked as read');
    }

    async markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.unreadCount--;
            
            // Update in DB
            await db.put('notifications', notification);
            
            this.refresh();
        }
    }

    handleNotificationClick(id, type, data) {
        this.markAsRead(id);

        switch (type) {
            case 'like':
            case 'comment':
            case 'mention':
                router.navigate(`/post/${data.postId}`);
                break;
            case 'friend_request':
            case 'friend_accept':
                router.navigate('/friends');
                break;
            default:
                // Do nothing
                break;
        }
    }

    truncateText(text, length) {
        if (!text) return '';
        return text.length > length ? text.substr(0, length) + '...' : text;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    refresh() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = this.render();
            this.mounted();
        }
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

    mounted() {
        // Update notification badge
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
}

// Make available globally
window.NotificationsPage = NotificationsPage;
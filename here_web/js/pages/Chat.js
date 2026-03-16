// Path: here-social/js/pages/Chat.js

/**
 * Chat List Page
 */
class ChatListPage {
    constructor(context) {
        this.context = context;
        this.chats = [];
    }

    async render() {
        const chatState = chatStore.getState();
        this.chats = chatState.chats || [];
        
        return `
            <div class="chat-list-container">
                <div class="chat-list-header">
                    <h2>Chats</h2>
                    <button class="icon-button" onclick="router.navigate('/friends')">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 8h12v2H6V8zm0 4h8v2H6v-2z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                
                <div class="chat-search">
                    <input type="text" placeholder="Search chats..." id="chatSearch">
                </div>
                
                <div class="chat-list">
                    ${this.renderChats()}
                </div>
            </div>
        `;
    }

    renderChats() {
        if (this.chats.length === 0) {
            return this.renderEmptyState();
        }

        return this.chats.map(chat => this.renderChatItem(chat)).join('');
    }

    renderChatItem(chat) {
        const lastMessage = chat.lastMessage || {};
        const unreadCount = chat.unreadCount || 0;
        const time = lastMessage.timestamp ? formatDate(lastMessage.timestamp) : '';
        
        // Get other participant (for private chats)
        const currentUser = authStore.getState()?.user;
        const otherUserId = chat.participants?.find(id => id !== currentUser?.userId);
        const otherUser = this.getUserFromChat(chat, otherUserId);
        
        return `
            <div class="chat-item ${unreadCount > 0 ? 'unread' : ''}" 
                 data-chat-id="${chat.chatId}"
                 onclick="router.navigate('/chat/${chat.chatId}')">
                
                <div class="chat-avatar">
                    ${this.renderAvatar(otherUser)}
                </div>
                
                <div class="chat-info">
                    <h4>${this.escapeHtml(otherUser?.fullName || 'Chat')}</h4>
                    <div class="chat-last-message">
                        ${lastMessage.sender === currentUser?.userId ? 'You: ' : ''}
                        ${this.escapeHtml(this.truncateText(lastMessage.content || 'No messages yet', 30))}
                    </div>
                </div>
                
                <div class="chat-meta">
                    <span class="chat-time">${time}</span>
                    ${unreadCount > 0 ? `
                        <span class="chat-badge">${unreadCount}</span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderAvatar(user) {
        if (!user) return '<div class="avatar-placeholder">?</div>';
        
        if (user.profilePicture && user.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${user.profilePicture}" alt="${user.fullName}">`;
        } else {
            const initials = getInitials(user.fullName || '?');
            return `<div class="avatar-placeholder">${initials}</div>`;
        }
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h10v2H7V9zm0 4h8v2H7v-2z" fill="currentColor"/>
                </svg>
                <h3>No chats yet</h3>
                <p>Start a conversation with your friends</p>
                <button class="profile-button primary" onclick="router.navigate('/friends')">
                    Find Friends
                </button>
            </div>
        `;
    }

    getUserFromChat(chat, userId) {
        // Try to get from users store
        // For now, return mock data
        return {
            fullName: `User ${userId?.slice(-4)}`,
            profilePicture: null
        };
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

    async mounted() {
        // Load chats
        await chatStore.asyncActions.loadChats();

        // Subscribe to chat store updates
        this.unsubscribe = chatStore.subscribe('chat', (newState) => {
            this.chats = newState.chats;
            this.refreshChatList();
        });

        // Setup search
        const searchInput = document.getElementById('chatSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.filterChats(e.target.value);
            }, 300));
        }
    }

    refreshChatList() {
        const list = document.querySelector('.chat-list');
        if (list) {
            list.innerHTML = this.renderChats();
        }
    }

    filterChats(query) {
        if (!query) {
            this.refreshChatList();
            return;
        }

        const filtered = this.chats.filter(chat => {
            const otherUser = this.getUserFromChat(chat);
            return otherUser?.fullName?.toLowerCase().includes(query.toLowerCase());
        });

        const list = document.querySelector('.chat-list');
        if (list) {
            list.innerHTML = filtered.map(chat => this.renderChatItem(chat)).join('');
        }
    }

    destroyed() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Make available globally
window.ChatListPage = ChatListPage;
// Path: here-social/js/pages/ChatDetail.js

/**
 * Chat Detail Page
 */
class ChatDetailPage {
    constructor(context) {
        this.context = context;
        this.chatId = context.params.id;
        this.messages = [];
        this.otherUser = null;
        this.typingUsers = {};
        this.messageInput = null;
        this.scrollObserver = null;
        this.page = 1;
        this.hasMore = true;
    }

    async render() {
        const chatState = chatStore.getState();
        this.messages = chatState.messages[this.chatId] || [];
        this.typingUsers = chatState.typingUsers[this.chatId] || {};
        
        // Get other user
        this.otherUser = await this.getOtherUser();
        
        return `
            <div class="chat-detail">
                <div class="chat-detail-header">
                    <button class="icon-button" onclick="router.back()">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                        </svg>
                    </button>
                    
                    <div class="chat-detail-info" onclick="router.navigate('/profile/${this.otherUser?.userId}')">
                        <div class="chat-avatar small">
                            ${this.renderAvatar()}
                        </div>
                        <div class="chat-detail-user">
                            <h4>${this.escapeHtml(this.otherUser?.fullName || 'Chat')}</h4>
                            <span class="user-status">
                                ${this.renderStatus()}
                            </span>
                        </div>
                    </div>
                    
                    <button class="icon-button">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    ${this.renderMessages()}
                    
                    ${Object.keys(this.typingUsers).length > 0 ? this.renderTypingIndicator() : ''}
                </div>
                
                <div class="message-input-container">
                    <button class="icon-button" id="attachButton">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" fill="currentColor"/>
                        </svg>
                    </button>
                    
                    <input type="text" 
                           placeholder="Type a message..." 
                           id="messageInput"
                           autocomplete="off">
                    
                    <button class="icon-button" id="sendButton" disabled>
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    renderAvatar() {
        if (!this.otherUser) return '<div class="avatar-placeholder">?</div>';
        
        if (this.otherUser.profilePicture && this.otherUser.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${this.otherUser.profilePicture}" alt="${this.otherUser.fullName}">`;
        } else {
            const initials = getInitials(this.otherUser.fullName || '?');
            return `<div class="avatar-placeholder">${initials}</div>`;
        }
    }

    renderStatus() {
        if (!this.otherUser) return '';
        
        if (this.otherUser.status === 'online') {
            return '<span class="online">Online</span>';
        } else if (this.otherUser.lastSeen) {
            return `Last seen ${formatDate(this.otherUser.lastSeen)}`;
        }
        
        return '';
    }

    renderMessages() {
        if (this.messages.length === 0) {
            return `
                <div class="empty-state">
                    <p>No messages yet</p>
                    <p class="text-muted">Say hello! 👋</p>
                </div>
            `;
        }

        const currentUser = authStore.getState()?.user;
        
        return this.messages.map(message => {
            const isOwn = message.sender === currentUser?.userId;
            const bubble = new ChatBubble(message, isOwn);
            return bubble.render();
        }).join('');
    }

    renderTypingIndicator() {
        const names = Object.keys(this.typingUsers)
            .map(userId => {
                if (userId === this.otherUser?.userId) {
                    return this.otherUser?.fullName?.split(' ')[0] || 'Someone';
                }
                return '';
            })
            .filter(Boolean);
        
        if (names.length === 0) return '';
        
        const text = names.length === 1 
            ? `${names[0]} is typing`
            : 'Several people are typing';
        
        return `
            <div class="typing-indicator">
                <span></span><span></span><span></span>
                <span class="typing-text">${text}</span>
            </div>
        `;
    }

    async mounted() {
        // Set active chat
        chatStore.dispatch(chatActions.setActiveChat(this.chatId));

        // Load messages
        await chatStore.asyncActions.loadMessages(this.chatId);

        // Setup message input
        this.setupMessageInput();

        // Scroll to bottom
        this.scrollToBottom();

        // Setup infinite scroll for older messages
        this.setupInfiniteScroll();

        // Subscribe to chat store updates
        this.unsubscribe = chatStore.subscribe('chat', (newState) => {
            const newMessages = newState.messages[this.chatId] || [];
            
            if (newMessages.length !== this.messages.length) {
                const wasAtBottom = this.isAtBottom();
                
                this.messages = newMessages;
                this.typingUsers = newState.typingUsers[this.chatId] || {};
                this.refreshMessages();
                
                if (wasAtBottom) {
                    this.scrollToBottom();
                }
            }
        });

        // Mark messages as read
        this.markAsRead();
    }

    setupMessageInput() {
        this.messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const attachButton = document.getElementById('attachButton');

        if (this.messageInput) {
            this.messageInput.addEventListener('input', (e) => {
                sendButton.disabled = !e.target.value.trim();
                this.handleTyping(e.target.value.trim().length > 0);
            });

            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }

        if (attachButton) {
            attachButton.addEventListener('click', () => this.showAttachmentMenu());
        }
    }

    setupInfiniteScroll() {
        const messagesContainer = document.getElementById('chatMessages');
        
        this.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMore && !this.loading) {
                    this.loadMoreMessages();
                }
            });
        }, { threshold: 0.1 });

        const sentinel = document.createElement('div');
        sentinel.id = 'messagesSentinel';
        messagesContainer.prepend(sentinel);
        this.scrollObserver.observe(sentinel);
    }

    async loadMoreMessages() {
        if (!this.hasMore || this.loading) return;

        this.loading = true;
        this.page++;

        // Load more messages from store
        // This would need to be implemented in chat store
        // For now, just set hasMore to false
        this.hasMore = false;
        this.loading = false;
    }

    async sendMessage() {
        if (!this.messageInput || !this.messageInput.value.trim()) return;

        const content = this.messageInput.value.trim();
        this.messageInput.value = '';
        document.getElementById('sendButton').disabled = true;

        // Stop typing indicator
        this.handleTyping(false);

        // Send message
        await chatStore.asyncActions.sendMessage(this.chatId, content);
        
        this.scrollToBottom();
    }

    handleTyping(isTyping) {
        // Debounce typing indicator
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        if (isTyping) {
            chatStore.asyncActions.setTyping(this.chatId, true);
            
            this.typingTimeout = setTimeout(() => {
                chatStore.asyncActions.setTyping(this.chatId, false);
            }, 3000);
        } else {
            chatStore.asyncActions.setTyping(this.chatId, false);
        }
    }

    showAttachmentMenu() {
        // Show modal with options: Camera, Gallery, Document, etc.
        console.log('Show attachment menu');
    }

    markAsRead() {
        // Mark all messages in this chat as read
        chatStore.dispatch(chatActions.markRead(this.chatId));
    }

    isAtBottom() {
        const container = document.getElementById('chatMessages');
        if (!container) return true;
        
        const threshold = 100;
        return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    refreshMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const wasAtBottom = this.isAtBottom();
        const scrollPos = container.scrollTop;

        container.innerHTML = this.renderMessages() + 
            (Object.keys(this.typingUsers).length > 0 ? this.renderTypingIndicator() : '');

        if (!wasAtBottom) {
            container.scrollTop = scrollPos;
        }
    }

    async getOtherUser() {
        // Get from users store or API
        // For now, return mock data
        return {
            userId: 'user_123',
            fullName: 'John Doe',
            profilePicture: null,
            status: 'online',
            lastSeen: Date.now()
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroyed() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
        }
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Clear active chat
        chatStore.dispatch(chatActions.setActiveChat(null));
    }
}

// Make available globally
window.ChatDetailPage = ChatDetailPage;
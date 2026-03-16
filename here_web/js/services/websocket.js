// Path: here-social/js/services/websocket.js

/**
 * WebSocket Manager
 * Handles real-time connections with auto-reconnect
 */
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.url = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectTimeout = 1000;
        this.listeners = new Map();
        this.connectionListeners = [];
        this.isConnected = false;
        this.pendingMessages = [];
    }

    // Connect to WebSocket
    connect(token) {
        this.url = `wss://api.here-social.com/ws?token=${token}`;
        this.connectWebSocket();
    }

    connectWebSocket() {
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.notifyConnectionListeners(true);
                
                // Send pending messages
                while (this.pendingMessages.length > 0) {
                    const msg = this.pendingMessages.shift();
                    this.send(msg);
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.notifyConnectionListeners(false);
                this.reconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.reconnect();
        }
    }

    // Reconnect with exponential backoff
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        const timeout = this.reconnectTimeout * Math.pow(2, this.reconnectAttempts);
        
        setTimeout(() => {
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts + 1}`);
            this.reconnectAttempts++;
            this.connectWebSocket();
        }, timeout);
    }

    // Send message
    send(data) {
        if (!this.isConnected) {
            this.pendingMessages.push(data);
            return false;
        }

        try {
            this.ws.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            this.pendingMessages.push(data);
            return false;
        }
    }

    // Handle incoming message
    handleMessage(data) {
        const { type, payload } = data;

        switch (type) {
            case 'message':
                this.handleNewMessage(payload);
                break;
            case 'message_status':
                this.handleMessageStatus(payload);
                break;
            case 'typing':
                this.handleTyping(payload);
                break;
            case 'presence':
                this.handlePresence(payload);
                break;
            case 'notification':
                this.handleNotification(payload);
                break;
            case 'post_update':
                this.handlePostUpdate(payload);
                break;
            case 'friend_request':
                this.handleFriendRequest(payload);
                break;
            default:
                // Dispatch to custom listeners
                this.dispatchToListeners(type, payload);
        }
    }

    // Handle new message
    handleNewMessage(payload) {
        const { chatId, message } = payload;

        // Update chat store
        chatStore.dispatch(chatActions.addMessage(chatId, message));

        // Update chat list
        chatStore.dispatch(chatActions.updateChat({
            chatId,
            lastMessage: message,
            lastMessageTimestamp: message.timestamp
        }));

        // Show notification if not active
        const activeChat = chatStore.getState()?.activeChat;
        if (activeChat !== chatId && document.visibilityState !== 'visible') {
            this.showNotification('New Message', message.content, {
                chatId,
                messageId: message.messageId
            });
        }

        // Update unread count
        if (activeChat !== chatId) {
            const chat = chatStore.getState()?.chats.find(c => c.chatId === chatId);
            if (chat) {
                chatStore.dispatch(chatActions.updateChat({
                    chatId,
                    unreadCount: (chat.unreadCount || 0) + 1
                }));
            }
        }

        // Store in DB
        db.put('messages', message).catch(console.error);
    }

    // Handle message status update
    handleMessageStatus(payload) {
        const { chatId, messageId, status } = payload;

        chatStore.dispatch(chatActions.updateMessageStatus(chatId, messageId, status));

        // Update in DB
        db.get('messages', messageId).then(message => {
            if (message) {
                message.status = status;
                db.put('messages', message);
            }
        });
    }

    // Handle typing indicator
    handleTyping(payload) {
        const { chatId, userId, isTyping } = payload;

        if (isTyping) {
            chatStore.dispatch(chatActions.setTyping(chatId, userId));
        } else {
            chatStore.dispatch(chatActions.clearTyping(chatId, userId));
        }
    }

    // Handle presence (online/offline)
    handlePresence(payload) {
        const { userId, status, lastSeen } = payload;

        // Update user in users store
        db.get('users', userId).then(user => {
            if (user) {
                user.status = status;
                user.lastSeen = lastSeen || Date.now();
                db.put('users', user);
            }
        });

        // Update chat typing status if needed
        // This will be handled by the UI components
    }

    // Handle notification
    handleNotification(payload) {
        const { notification } = payload;

        // Add to notifications store
        db.put('notifications', notification);

        // Show push notification if supported
        if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            new Notification(notification.title, {
                body: notification.body,
                icon: notification.icon || '/assets/icons/icon-192.png',
                data: notification.data
            });
        }
    }

    // Handle post update (like, comment)
    handlePostUpdate(payload) {
        const { postId, updateType, data } = payload;

        switch (updateType) {
            case 'like':
                feedStore.dispatch(feedActions.updatePost({
                    postId,
                    likes: data.likes
                }));
                break;
            case 'comment':
                feedStore.dispatch(feedActions.updatePost({
                    postId,
                    commentCount: data.commentCount
                }));
                break;
        }
    }

    // Handle friend request
    handleFriendRequest(payload) {
        const { request } = payload;

        // This will be handled by friends page
        // For now, just show notification
        this.showNotification('Friend Request', 
            `${request.from.fullName} sent you a friend request`,
            { type: 'friend_request', requestId: request.requestId }
        );
    }

    // Show notification
    showNotification(title, body, data = {}) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/badge-72.png',
                vibrate: [200, 100, 200],
                data,
                tag: data.chatId || 'default',
                renotify: true,
                silent: false
            });
        }
    }

    // Add custom listener
    addListener(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    // Remove listener
    removeListener(type, callback) {
        if (this.listeners.has(type)) {
            const listeners = this.listeners.get(type);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // Dispatch to custom listeners
    dispatchToListeners(type, payload) {
        if (this.listeners.has(type)) {
            this.listeners.get(type).forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error('Listener error:', error);
                }
            });
        }
    }

    // Add connection listener
    onConnectionChange(callback) {
        this.connectionListeners.push(callback);
    }

    // Notify connection listeners
    notifyConnectionListeners(isConnected) {
        this.connectionListeners.forEach(callback => {
            try {
                callback(isConnected);
            } catch (error) {
                console.error('Connection listener error:', error);
            }
        });
    }

    // Disconnect
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.listeners.clear();
        this.connectionListeners = [];
    }

    // Check if connected
    isConnected() {
        return this.isConnected;
    }
}

// Create global instance
window.ws = new WebSocketManager();

// Request notification permission
if (Notification.permission === 'default') {
    Notification.requestPermission();
}
// Path: here-social/js/store/chat.store.js

/**
 * Chat Store
 * Manages chat messages with offline support
 */

// Initial state
const initialState = {
    chats: [],              // List of chats
    activeChat: null,       // Currently selected chat
    messages: {},           // Messages by chatId
    loading: false,
    error: null,
    typingUsers: {},        // Users currently typing by chatId
    unreadCount: 0,
    lastSync: null
};

// Action types
const ACTIONS = {
    FETCH_CHATS_REQUEST: 'FETCH_CHATS_REQUEST',
    FETCH_CHATS_SUCCESS: 'FETCH_CHATS_SUCCESS',
    FETCH_CHATS_FAILURE: 'FETCH_CHATS_FAILURE',
    FETCH_MESSAGES_REQUEST: 'FETCH_MESSAGES_REQUEST',
    FETCH_MESSAGES_SUCCESS: 'FETCH_MESSAGES_SUCCESS',
    FETCH_MESSAGES_FAILURE: 'FETCH_MESSAGES_FAILURE',
    ADD_MESSAGE: 'ADD_MESSAGE',
    UPDATE_MESSAGE_STATUS: 'UPDATE_MESSAGE_STATUS',
    SET_ACTIVE_CHAT: 'SET_ACTIVE_CHAT',
    ADD_CHAT: 'ADD_CHAT',
    UPDATE_CHAT: 'UPDATE_CHAT',
    SET_TYPING: 'SET_TYPING',
    CLEAR_TYPING: 'CLEAR_TYPING',
    MARK_READ: 'MARK_READ',
    UPDATE_UNREAD_COUNT: 'UPDATE_UNREAD_COUNT',
    HYDRATE_CHATS: 'HYDRATE_CHATS',
    HYDRATE_MESSAGES: 'HYDRATE_MESSAGES'
};

// Reducer
function chatReducer(state = initialState, action) {
    switch (action.type) {
        case ACTIONS.FETCH_CHATS_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case ACTIONS.FETCH_CHATS_SUCCESS:
            return {
                ...state,
                chats: action.payload,
                loading: false,
                lastSync: Date.now()
            };

        case ACTIONS.FETCH_CHATS_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload.error
            };

        case ACTIONS.FETCH_MESSAGES_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case ACTIONS.FETCH_MESSAGES_SUCCESS:
            return {
                ...state,
                messages: {
                    ...state.messages,
                    [action.payload.chatId]: action.payload.messages
                },
                loading: false
            };

        case ACTIONS.FETCH_MESSAGES_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload.error
            };

        case ACTIONS.ADD_MESSAGE:
            const chatMessages = state.messages[action.payload.chatId] || [];
            
            // Don't add duplicate
            if (chatMessages.some(m => m.messageId === action.payload.message.messageId)) {
                return state;
            }

            const newMessages = {
                ...state.messages,
                [action.payload.chatId]: [...chatMessages, action.payload.message]
            };

            // Update chat last message
            const updatedChats = state.chats.map(chat => {
                if (chat.chatId === action.payload.chatId) {
                    return {
                        ...chat,
                        lastMessage: action.payload.message,
                        lastMessageTimestamp: action.payload.message.timestamp,
                        unreadCount: chat.chatId === state.activeChat 
                            ? 0 
                            : (chat.unreadCount || 0) + 1
                    };
                }
                return chat;
            });

            return {
                ...state,
                messages: newMessages,
                chats: updatedChats,
                unreadCount: calculateTotalUnread(updatedChats)
            };

        case ACTIONS.UPDATE_MESSAGE_STATUS:
            const statusMessages = state.messages[action.payload.chatId] || [];
            const updatedMessages = statusMessages.map(msg =>
                msg.messageId === action.payload.messageId
                    ? { ...msg, status: action.payload.status }
                    : msg
            );

            return {
                ...state,
                messages: {
                    ...state.messages,
                    [action.payload.chatId]: updatedMessages
                }
            };

        case ACTIONS.SET_ACTIVE_CHAT:
            // Mark messages as read
            if (action.payload && state.messages[action.payload]) {
                const readMessages = state.messages[action.payload].map(msg => ({
                    ...msg,
                    status: msg.sender !== authStore.getState()?.user?.userId 
                        ? 'seen' 
                        : msg.status
                }));

                // Update chat unread count
                const chatsWithRead = state.chats.map(chat => {
                    if (chat.chatId === action.payload) {
                        return { ...chat, unreadCount: 0 };
                    }
                    return chat;
                });

                return {
                    ...state,
                    activeChat: action.payload,
                    messages: {
                        ...state.messages,
                        [action.payload]: readMessages
                    },
                    chats: chatsWithRead,
                    unreadCount: calculateTotalUnread(chatsWithRead)
                };
            }

            return {
                ...state,
                activeChat: action.payload
            };

        case ACTIONS.ADD_CHAT:
            return {
                ...state,
                chats: [action.payload, ...state.chats]
            };

        case ACTIONS.UPDATE_CHAT:
            return {
                ...state,
                chats: state.chats.map(chat =>
                    chat.chatId === action.payload.chatId
                        ? { ...chat, ...action.payload }
                        : chat
                )
            };

        case ACTIONS.SET_TYPING:
            return {
                ...state,
                typingUsers: {
                    ...state.typingUsers,
                    [action.payload.chatId]: {
                        ...state.typingUsers[action.payload.chatId],
                        [action.payload.userId]: true
                    }
                }
            };

        case ACTIONS.CLEAR_TYPING:
            const typingForChat = state.typingUsers[action.payload.chatId] || {};
            delete typingForChat[action.payload.userId];

            return {
                ...state,
                typingUsers: {
                    ...state.typingUsers,
                    [action.payload.chatId]: typingForChat
                }
            };

        case ACTIONS.MARK_READ:
            const readChatMessages = state.messages[action.payload] || [];
            const markedRead = readChatMessages.map(msg => ({
                ...msg,
                status: msg.sender !== authStore.getState()?.user?.userId 
                    ? 'seen' 
                    : msg.status
            }));

            const chatsMarkedRead = state.chats.map(chat => {
                if (chat.chatId === action.payload) {
                    return { ...chat, unreadCount: 0 };
                }
                return chat;
            });

            return {
                ...state,
                messages: {
                    ...state.messages,
                    [action.payload]: markedRead
                },
                chats: chatsMarkedRead,
                unreadCount: calculateTotalUnread(chatsMarkedRead)
            };

        case ACTIONS.UPDATE_UNREAD_COUNT:
            return {
                ...state,
                unreadCount: action.payload
            };

        case ACTIONS.HYDRATE_CHATS:
            return {
                ...state,
                chats: action.payload,
                loading: false
            };

        case ACTIONS.HYDRATE_MESSAGES:
            return {
                ...state,
                messages: {
                    ...state.messages,
                    [action.payload.chatId]: action.payload.messages
                }
            };

        default:
            return state;
    }
}

// Helper function to calculate total unread
function calculateTotalUnread(chats) {
    return chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);
}

// Action creators
const chatActions = {
    fetchChatsRequest: () => ({ type: ACTIONS.FETCH_CHATS_REQUEST }),
    fetchChatsSuccess: (chats) => ({
        type: ACTIONS.FETCH_CHATS_SUCCESS,
        payload: chats
    }),
    fetchChatsFailure: (error) => ({
        type: ACTIONS.FETCH_CHATS_FAILURE,
        payload: { error }
    }),

    fetchMessagesRequest: () => ({ type: ACTIONS.FETCH_MESSAGES_REQUEST }),
    fetchMessagesSuccess: (chatId, messages) => ({
        type: ACTIONS.FETCH_MESSAGES_SUCCESS,
        payload: { chatId, messages }
    }),
    fetchMessagesFailure: (error) => ({
        type: ACTIONS.FETCH_MESSAGES_FAILURE,
        payload: { error }
    }),

    addMessage: (chatId, message) => ({
        type: ACTIONS.ADD_MESSAGE,
        payload: { chatId, message }
    }),

    updateMessageStatus: (chatId, messageId, status) => ({
        type: ACTIONS.UPDATE_MESSAGE_STATUS,
        payload: { chatId, messageId, status }
    }),

    setActiveChat: (chatId) => ({
        type: ACTIONS.SET_ACTIVE_CHAT,
        payload: chatId
    }),

    addChat: (chat) => ({
        type: ACTIONS.ADD_CHAT,
        payload: chat
    }),

    updateChat: (chat) => ({
        type: ACTIONS.UPDATE_CHAT,
        payload: chat
    }),

    setTyping: (chatId, userId) => ({
        type: ACTIONS.SET_TYPING,
        payload: { chatId, userId }
    }),

    clearTyping: (chatId, userId) => ({
        type: ACTIONS.CLEAR_TYPING,
        payload: { chatId, userId }
    }),

    markRead: (chatId) => ({
        type: ACTIONS.MARK_READ,
        payload: chatId
    }),

    updateUnreadCount: (count) => ({
        type: ACTIONS.UPDATE_UNREAD_COUNT,
        payload: count
    }),

    hydrateChats: (chats) => ({
        type: ACTIONS.HYDRATE_CHATS,
        payload: chats
    }),

    hydrateMessages: (chatId, messages) => ({
        type: ACTIONS.HYDRATE_MESSAGES,
        payload: { chatId, messages }
    })
};

// Async actions
const chatAsyncActions = {
    // Load chats from cache then network
    loadChats: () => async (dispatch) => {
        // Try cache first
        try {
            const cachedChats = await db.getAll('chats');
            if (cachedChats.length > 0) {
                dispatch(chatActions.hydrateChats(
                    cachedChats.sort((a, b) => 
                        b.lastMessageTimestamp - a.lastMessageTimestamp
                    )
                ));
            }
        } catch (error) {
            console.error('Failed to load cached chats:', error);
        }

        // Fetch from network if online
        if (navigator.onLine) {
            dispatch(chatActions.fetchChatsRequest());

            try {
                // This will be replaced with actual API
                const response = await mockFetchChatsAPI();

                dispatch(chatActions.fetchChatsSuccess(response.chats));

                // Cache chats
                for (const chat of response.chats) {
                    await db.put('chats', chat);
                }
            } catch (error) {
                dispatch(chatActions.fetchChatsFailure(error.message));
            }
        }
    },

    // Load messages for a chat
    loadMessages: (chatId) => async (dispatch) => {
        // Try cache first
        try {
            const cachedMessages = await db.queryRange(
                'messages',
                'chatId',
                IDBKeyRange.only(chatId),
                'next',
                CACHE_LIMITS.MESSAGES_PER_CHAT
            );

            if (cachedMessages.length > 0) {
                dispatch(chatActions.hydrateMessages(chatId, cachedMessages));
            }
        } catch (error) {
            console.error('Failed to load cached messages:', error);
        }

        // Fetch from network if online
        if (navigator.onLine) {
            dispatch(chatActions.fetchMessagesRequest());

            try {
                // This will be replaced with actual API
                const response = await mockFetchMessagesAPI(chatId);

                dispatch(chatActions.fetchMessagesSuccess(chatId, response.messages));

                // Cache messages
                for (const message of response.messages) {
                    await db.put('messages', message);
                }

                // Mark as read
                dispatch(chatActions.markRead(chatId));
            } catch (error) {
                dispatch(chatActions.fetchMessagesFailure(error.message));
            }
        }
    },

    // Send message
    sendMessage: (chatId, content, type = 'text', media = null) => async (dispatch) => {
        const tempId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const currentUser = authStore.getState()?.user;

        const message = {
            messageId: tempId,
            chatId,
            content,
            type,
            media,
            sender: currentUser?.userId,
            senderName: currentUser?.fullName,
            senderAvatar: currentUser?.profilePicture,
            timestamp: Date.now(),
            status: MESSAGE_STATUS.PENDING,
            reactions: []
        };

        // Show immediately
        dispatch(chatActions.addMessage(chatId, message));

        // Update chat list
        const chatExists = chatStore.getState()?.chats.some(c => c.chatId === chatId);
        
        if (!chatExists) {
            const chat = {
                chatId,
                participants: [currentUser?.userId, chatId], // Assuming chatId is other user's ID
                lastMessage: message,
                lastMessageTimestamp: message.timestamp,
                unreadCount: 0,
                type: 'private'
            };
            dispatch(chatActions.addChat(chat));
            await db.put('chats', chat);
        } else {
            dispatch(chatActions.updateChat({
                chatId,
                lastMessage: message,
                lastMessageTimestamp: message.timestamp
            }));
        }

        // Save to local DB
        await db.put('messages', message);

        // Queue for sync
        await window.syncManager?.queueAction({
            type: 'SEND_MESSAGE',
            data: {
                chatId,
                content,
                type,
                media,
                tempId,
                timestamp: Date.now()
            }
        });

        return tempId;
    },

    // Set typing indicator
    setTyping: (chatId, isTyping) => async (dispatch) => {
        const currentUser = authStore.getState()?.user;
        
        if (isTyping) {
            dispatch(chatActions.setTyping(chatId, currentUser?.userId));
        } else {
            dispatch(chatActions.clearTyping(chatId, currentUser?.userId));
        }

        // Send via WebSocket if online
        if (navigator.onLine && window.ws) {
            window.ws.send({
                type: 'typing',
                chatId,
                userId: currentUser?.userId,
                isTyping
            });
        }
    },

    // Mark messages as delivered/seen
    markDelivered: (chatId, messageIds) => async (dispatch) => {
        for (const messageId of messageIds) {
            dispatch(chatActions.updateMessageStatus(chatId, messageId, MESSAGE_STATUS.DELIVERED));
            
            // Update in DB
            const message = await db.get('messages', messageId);
            if (message) {
                message.status = MESSAGE_STATUS.DELIVERED;
                await db.put('messages', message);
            }
        }
    },

    markSeen: (chatId, messageIds) => async (dispatch) => {
        for (const messageId of messageIds) {
            dispatch(chatActions.updateMessageStatus(chatId, messageId, MESSAGE_STATUS.SEEN));
            
            // Update in DB
            const message = await db.get('messages', messageId);
            if (message) {
                message.status = MESSAGE_STATUS.SEEN;
                await db.put('messages', message);
            }
        }
    }
};

// Mock API functions
async function mockFetchChatsAPI() {
    return new Promise((resolve) => {
        setTimeout(() => {
            const currentUser = authStore.getState()?.user;
            const chats = [];

            for (let i = 0; i < 5; i++) {
                chats.push({
                    chatId: `chat_${i}`,
                    participants: [currentUser?.userId, `user_${i}`],
                    lastMessage: {
                        messageId: `msg_${i}`,
                        content: `Last message in chat ${i}`,
                        timestamp: Date.now() - i * 3600000,
                        sender: i % 2 === 0 ? currentUser?.userId : `user_${i}`,
                        status: i % 2 === 0 ? 'seen' : 'delivered'
                    },
                    lastMessageTimestamp: Date.now() - i * 3600000,
                    unreadCount: i === 0 ? 3 : 0,
                    type: 'private'
                });
            }

            resolve({
                success: true,
                chats
            });
        }, 600);
    });
}

async function mockFetchMessagesAPI(chatId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const messages = [];
            const currentUser = authStore.getState()?.user;

            for (let i = 0; i < 20; i++) {
                const isMe = i % 2 === 0;
                messages.push({
                    messageId: `msg_${chatId}_${i}`,
                    chatId,
                    content: `Message ${i} in this chat`,
                    type: 'text',
                    sender: isMe ? currentUser?.userId : `user_${i}`,
                    senderName: isMe ? currentUser?.fullName : `User ${i}`,
                    timestamp: Date.now() - (20 - i) * 60000,
                    status: isMe ? 'seen' : i < 15 ? 'seen' : 'delivered',
                    reactions: []
                });
            }

            resolve({
                success: true,
                messages
            });
        }, 500);
    });
}

// Register store
const chatStore = store.register('chat', initialState, chatReducer);
chatStore.actions = chatActions;
chatStore.asyncActions = chatAsyncActions;

window.chatStore = chatStore;
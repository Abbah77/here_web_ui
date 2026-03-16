// Path: here-social/js/components/AIAssistant.js

/**
 * HERE AI Assistant Component
 * Floating chat assistant with context-aware suggestions
 */
class AIAssistant {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;
        this.context = null;
        this.suggestions = [];
        this.init();
    }

    init() {
        this.createChatWindow();
        this.attachListeners();
        this.loadWelcomeMessage();
    }

    createChatWindow() {
        const chatHTML = `
            <div class="ai-chat-window" id="aiChatWindow" style="display: none;">
                <div class="ai-chat-header">
                    <div class="ai-chat-title">
                        <span class="ai-icon">✨</span>
                        <h3>HERE AI</h3>
                    </div>
                    <button class="ai-close" onclick="aiAssistant.toggle()">×</button>
                </div>
                
                <div class="ai-chat-messages" id="aiChatMessages">
                    <div class="ai-message ai-welcome">
                        <div class="ai-avatar">🤖</div>
                        <div class="ai-bubble">
                            <p>Hi! I'm HERE AI. How can I help you today?</p>
                            <div class="ai-suggestions" id="aiSuggestions"></div>
                        </div>
                    </div>
                </div>
                
                <div class="ai-chat-input">
                    <input type="text" 
                           id="aiInput" 
                           placeholder="Ask me anything..."
                           autocomplete="off">
                    <button id="aiSendBtn" onclick="aiAssistant.sendMessage()">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    attachListeners() {
        // AI Button click
        const aiButton = document.getElementById('hereAIButton');
        if (aiButton) {
            aiButton.addEventListener('click', () => this.toggle());
        }

        // Input enter key
        const input = document.getElementById('aiInput');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.toggle();
            }
        });

        // Update context on page change
        window.addEventListener('popstate', () => {
            this.updateContext();
        });
    }

    toggle() {
        const window = document.getElementById('aiChatWindow');
        const button = document.getElementById('hereAIButton');

        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            window.style.display = 'flex';
            button.classList.add('active');
            this.updateContext();
            setTimeout(() => {
                document.getElementById('aiInput').focus();
            }, 300);
        } else {
            window.style.display = 'none';
            button.classList.remove('active');
        }
    }

    async sendMessage() {
        const input = document.getElementById('aiInput');
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addMessage('user', message);
        input.value = '';

        // Show typing indicator
        this.showTyping();

        // Get AI response
        const response = await this.getAIResponse(message);

        // Hide typing and add response
        this.hideTyping();
        this.addMessage('ai', response);

        // Get suggestions based on context
        this.updateSuggestions();
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-${role}`;

        messageDiv.innerHTML = `
            <div class="ai-avatar">${role === 'ai' ? '🤖' : '👤'}</div>
            <div class="ai-bubble">${this.formatMessage(content)}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Store in history
        this.messages.push({ role, content });
    }

    showTyping() {
        this.isTyping = true;
        const messagesContainer = document.getElementById('aiChatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message ai-ai typing';
        typingDiv.id = 'aiTypingIndicator';

        typingDiv.innerHTML = `
            <div class="ai-avatar">🤖</div>
            <div class="ai-bubble">
                <span class="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTyping() {
        this.isTyping = false;
        const typing = document.getElementById('aiTypingIndicator');
        if (typing) {
            typing.remove();
        }
    }

    async getAIResponse(message) {
        // Get current context
        const context = this.getContextString();

        // Mock AI responses - replace with actual AI API
        await new Promise(resolve => setTimeout(resolve, 1000));

        const responses = {
            'hello|hi|hey': "Hello! How can I assist you today?",
            'help': "I can help you find friends, suggest posts, answer questions, or just chat!",
            'friend': this.getFriendSuggestions(),
            'post': this.getPostSuggestions(),
            'trending': this.getTrendingTopics(),
            'default': this.getDefaultResponse(message)
        };

        // Find matching response
        for (const [key, value] of Object.entries(responses)) {
            if (key.includes('|') ? 
                key.split('|').some(k => message.toLowerCase().includes(k)) :
                message.toLowerCase().includes(key)) {
                return value;
            }
        }

        return responses.default;
    }

    getFriendSuggestions() {
        const suggestions = [
            "Based on your interests, you might like to connect with:",
            "• Alex Chen - Tech enthusiast",
            "• Sarah Miller - Photography",
            "• James Wilson - Travel",
            "\nWould you like me to help you send friend requests?"
        ];
        return suggestions.join('\n');
    }

    getPostSuggestions() {
        return "Here are some posts you might enjoy:\n" +
               "• Tech trends 2024\n" +
               "• Best photography spots\n" +
               "• Travel tips and tricks\n" +
               "\nInterested in any of these topics?";
    }

    getTrendingTopics() {
        return "Currently trending:\n" +
               "• #TechNews\n" +
               "• #Photography\n" +
               "• #Travel\n" +
               "• AI Revolution\n" +
               "\nWould you like to see more?";
    }

    getDefaultResponse(message) {
        const responses = [
            "That's interesting! Tell me more.",
            "I'm here to help! What else would you like to know?",
            "Great question! Let me think about that.",
            "I can help you find content related to that.",
            "Would you like me to suggest some friends or posts?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    updateContext() {
        const path = window.location.pathname;
        const page = path.split('/')[1] || 'home';

        // Set context based on current page
        switch (page) {
            case 'home':
                this.context = 'feed';
                break;
            case 'friends':
                this.context = 'friends';
                break;
            case 'chat':
                this.context = 'chat';
                break;
            case 'profile':
                this.context = 'profile';
                break;
            default:
                this.context = 'general';
        }

        // Update suggestions
        this.updateSuggestions();
    }

    updateSuggestions() {
        const container = document.getElementById('aiSuggestions');
        if (!container) return;

        let suggestions = [];

        switch (this.context) {
            case 'feed':
                suggestions = [
                    "Show trending posts",
                    "Suggest friends",
                    "Create a post"
                ];
                break;
            case 'friends':
                suggestions = [
                    "Find friends",
                    "Friend suggestions",
                    "Online friends"
                ];
                break;
            case 'chat':
                suggestions = [
                    "Chat tips",
                    "Send media",
                    "Group chat help"
                ];
                break;
            case 'profile':
                suggestions = [
                    "Edit profile tips",
                    "Privacy settings",
                    "Account help"
                ];
                break;
            default:
                suggestions = [
                    "Help",
                    "Trending",
                    "Find friends"
                ];
        }

        container.innerHTML = suggestions.map(s => 
            `<button class="ai-suggestion-chip" onclick="aiAssistant.useSuggestion('${s}')">${s}</button>`
        ).join('');
    }

    useSuggestion(suggestion) {
        const input = document.getElementById('aiInput');
        input.value = suggestion;
        this.sendMessage();
    }

    loadWelcomeMessage() {
        // Welcome message already in HTML
    }

    formatMessage(text) {
        // Convert URLs to links
        text = text.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank">$1</a>'
        );

        // Convert line breaks
        text = text.replace(/\n/g, '<br>');

        return text;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Add CSS for AI Assistant
const aiStyles = document.createElement('style');
aiStyles.textContent = `
    .ai-chat-window {
        position: fixed;
        bottom: 150px;
        right: 16px;
        width: 320px;
        height: 400px;
        background: var(--bg-secondary);
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
        z-index: 999;
        overflow: hidden;
        animation: slideUp 0.3s ease;
    }

    .ai-chat-header {
        padding: 16px;
        background: var(--accent);
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .ai-chat-title {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .ai-chat-title h3 {
        font-size: 16px;
        margin: 0;
    }

    .ai-close {
        background: transparent;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
    }

    .ai-close:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .ai-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .ai-message {
        display: flex;
        gap: 8px;
        animation: slideIn 0.3s ease;
    }

    .ai-message.ai-user {
        flex-direction: row-reverse;
    }

    .ai-avatar {
        width: 32px;
        height: 32px;
        background: var(--bg-tertiary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
    }

    .ai-bubble {
        max-width: 70%;
        padding: 10px 14px;
        background: var(--bg-primary);
        border-radius: var(--border-radius-lg);
        color: var(--text-primary);
        font-size: 14px;
        line-height: 1.4;
    }

    .ai-message.ai-user .ai-bubble {
        background: var(--accent);
        color: white;
    }

    .ai-bubble a {
        color: inherit;
        text-decoration: underline;
    }

    .ai-chat-input {
        padding: 12px;
        background: var(--bg-primary);
        border-top: 1px solid var(--border-color);
        display: flex;
        gap: 8px;
    }

    .ai-chat-input input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 20px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 14px;
    }

    .ai-chat-input input:focus {
        outline: none;
        border-color: var(--accent);
    }

    .ai-chat-input button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: var(--accent);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .ai-chat-input button:hover {
        background: var(--accent-dark);
    }

    .ai-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
    }

    .ai-suggestion-chip {
        padding: 6px 12px;
        background: var(--bg-tertiary);
        border: none;
        border-radius: 16px;
        color: var(--text-primary);
        font-size: 12px;
        cursor: pointer;
        transition: background var(--transition-fast);
    }

    .ai-suggestion-chip:hover {
        background: var(--border-color);
    }

    .typing-dots span {
        animation: typingDot 1.4s infinite;
        opacity: 0;
    }

    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingDot {
        0%, 60%, 100% { opacity: 0; }
        30% { opacity: 1; }
    }

    .here-ai-button.active {
        background: var(--accent-dark);
        transform: scale(1.1);
    }

    @keyframes slideUp {
        from {
            transform: translateY(20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes slideIn {
        from {
            transform: translateX(10px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @media (max-width: 480px) {
        .ai-chat-window {
            width: 100%;
            height: 100%;
            bottom: 0;
            right: 0;
            border-radius: 0;
        }
    }
`;

document.head.appendChild(aiStyles);

// Create global instance
window.aiAssistant = new AIAssistant();
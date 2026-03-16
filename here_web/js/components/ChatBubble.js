// Path: here-social/js/components/ChatBubble.js

/**
 * Chat Message Bubble Component
 */
class ChatBubble {
    constructor(message, isOwn, showAvatar = true) {
        this.message = message;
        this.isOwn = isOwn;
        this.showAvatar = showAvatar;
    }

    // Render component
    render() {
        const statusIcon = this.getStatusIcon();
        const time = formatDate(this.message.timestamp, 'time');
        
        return `
            <div class="message ${this.isOwn ? 'own' : ''}" data-message-id="${this.message.messageId}">
                <div class="message-bubble">
                    ${this.renderContent()}
                </div>
                <div class="message-time">
                    <span>${time}</span>
                    ${this.isOwn ? statusIcon : ''}
                </div>
            </div>
        `;
    }

    // Render message content
    renderContent() {
        switch (this.message.type) {
            case 'text':
                return this.renderText();
            case 'image':
                return this.renderImage();
            case 'video':
                return this.renderVideo();
            case 'file':
                return this.renderFile();
            default:
                return this.renderText();
        }
    }

    // Render text message
    renderText() {
        return `<div class="message-text">${this.escapeHtml(this.message.content || '')}</div>`;
    }

    // Render image message
    renderImage() {
        return `
            <div class="message-image" onclick="window.open('${this.message.media?.url}')">
                <img src="${this.message.media?.thumbnail || this.message.media?.url}" 
                     alt="Image" 
                     loading="lazy">
            </div>
            ${this.message.content ? `<div class="message-caption">${this.escapeHtml(this.message.content)}</div>` : ''}
        `;
    }

    // Render video message
    renderVideo() {
        return `
            <div class="message-video">
                <video controls preload="metadata">
                    <source src="${this.message.media?.url}" type="${this.message.media?.type}">
                </video>
            </div>
            ${this.message.content ? `<div class="message-caption">${this.escapeHtml(this.message.content)}</div>` : ''}
        `;
    }

    // Render file message
    renderFile() {
        return `
            <div class="message-file" onclick="window.open('${this.message.media?.url}')">
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
                </svg>
                <div class="file-info">
                    <div class="file-name">${this.message.media?.name || 'File'}</div>
                    <div class="file-size">${this.formatFileSize(this.message.media?.size)}</div>
                </div>
            </div>
            ${this.message.content ? `<div class="message-caption">${this.escapeHtml(this.message.content)}</div>` : ''}
        `;
    }

    // Get status icon
    getStatusIcon() {
        const status = this.message.status || 'pending';
        
        const icons = {
            pending: `<svg class="message-status status-pending" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor"/>
            </svg>`,
            sent: `<svg class="message-status status-sent" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
            </svg>`,
            delivered: `<svg class="message-status status-delivered" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
            </svg>`,
            seen: `<svg class="message-status status-seen" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
            </svg>`
        };
        
        return icons[status] || icons.pending;
    }

    // Format file size
    formatFileSize(bytes) {
        if (!bytes) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make available globally
window.ChatBubble = ChatBubble;
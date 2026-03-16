// Path: here-social/js/components/FriendItem.js

/**
 * Friend Item Component
 */
class FriendItem {
    constructor(user, status = 'accepted', onAction) {
        this.user = user;
        this.status = status; // 'accepted', 'pending', 'request'
        this.onAction = onAction;
    }

    // Render component
    render() {
        const isOnline = this.user.status === 'online';
        const lastSeen = this.user.lastSeen ? formatDate(this.user.lastSeen) : '';
        
        return `
            <div class="friend-item" data-user-id="${this.user.userId}">
                <div class="friend-avatar">
                    ${this.renderAvatar()}
                    ${isOnline ? '<span class="online-indicator"></span>' : ''}
                </div>
                
                <div class="friend-info">
                    <h4>${this.escapeHtml(this.user.fullName || 'Unknown')}</h4>
                    <div class="friend-status">
                        ${isOnline ? 'Online' : `Last seen ${lastSeen}`}
                    </div>
                </div>
                
                <div class="friend-actions">
                    ${this.renderActions()}
                </div>
            </div>
        `;
    }

    // Render avatar
    renderAvatar() {
        if (this.user.profilePicture && this.user.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${this.user.profilePicture}" alt="${this.escapeHtml(this.user.fullName)}">`;
        } else {
            const initials = getInitials(this.user.fullName || '?');
            return `<div class="avatar-placeholder">${initials}</div>`;
        }
    }

    // Render action buttons based on status
    renderActions() {
        switch (this.status) {
            case 'accepted':
                return `
                    <button class="friend-action message" data-action="message">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="friend-action remove" data-action="remove">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                        </svg>
                    </button>
                `;
                
            case 'pending':
                return `
                    <button class="friend-action accept" data-action="accept">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="friend-action decline" data-action="decline">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                        </svg>
                    </button>
                `;
                
            case 'request':
                return `
                    <button class="friend-action primary" data-action="add">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                        </svg>
                    </button>
                `;
                
            default:
                return '';
        }
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Attach event listeners
    attachEvents(element) {
        element.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                
                if (this.onAction) {
                    this.onAction(action, this.user);
                }
            });
        });

        // Open profile on click
        element.addEventListener('click', () => {
            router.navigate(`/profile/${this.user.userId}`);
        });
    }
}

// Make available globally
window.FriendItem = FriendItem;
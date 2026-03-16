// Path: here-social/js/components/BottomNav.js

/**
 * Bottom Navigation Component
 */
class BottomNav {
    constructor() {
        this.items = [
            { page: 'home', path: '/', icon: 'home', label: 'Home' },
            { page: 'friends', path: '/friends', icon: 'friends', label: 'Friends' },
            { page: 'explore', path: '/explore', icon: 'explore', label: 'Explore' },
            { page: 'chat', path: '/chat', icon: 'chat', label: 'Chat' },
            { page: 'profile', path: '/profile', icon: 'profile', label: 'Profile' }
        ];
        
        this.unreadCounts = {
            chat: 0,
            notifications: 0
        };
    }

    // Render component
    render() {
        return `
            <nav class="bottom-nav">
                ${this.items.map(item => this.renderItem(item)).join('')}
            </nav>
        `;
    }

    // Render single item
    renderItem(item) {
        const isActive = window.location.pathname === item.path;
        const unreadCount = item.page === 'chat' ? this.unreadCounts.chat : 0;
        
        return `
            <button class="nav-item ${isActive ? 'active' : ''}" data-page="${item.page}">
                ${this.getIcon(item.icon)}
                <span>${item.label}</span>
                ${unreadCount > 0 ? `
                    <span class="badge">${unreadCount > 99 ? '99+' : unreadCount}</span>
                ` : ''}
            </button>
        `;
    }

    // Get icon SVG
    getIcon(name) {
        const icons = {
            home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5.69l5 4.5V18h-3v-5H10v5H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" fill="currentColor"/>
            </svg>`,
            friends: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-1 .05 1.16.84 2 1.87 2 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
            </svg>`,
            explore: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" fill="currentColor"/>
            </svg>`,
            chat: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="currentColor"/>
                <circle cx="12" cy="11" r="1.5" fill="currentColor"/>
                <circle cx="16" cy="11" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="11" r="1.5" fill="currentColor"/>
            </svg>`,
            profile: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
            </svg>`
        };
        
        return icons[name] || icons.home;
    }

    // Update unread count
    updateUnreadCount(type, count) {
        this.unreadCounts[type] = count;
        this.refresh();
    }

    // Refresh component
    refresh() {
        const nav = document.querySelector('.bottom-nav');
        if (nav) {
            nav.outerHTML = this.render();
            this.attachEvents();
        }
    }

    // Attach event listeners
    attachEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = item.dataset.page;
                if (page) {
                    router.navigate(page === 'home' ? '/' : `/${page}`);
                }
            });
        });
    }
}

// Create global instance
window.bottomNav = new BottomNav();
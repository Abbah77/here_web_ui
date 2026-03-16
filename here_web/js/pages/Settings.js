// Path: here-social/js/pages/Settings.js

/**
 * Settings Page
 */
class SettingsPage {
    constructor(context) {
        this.context = context;
        this.settings = {
            theme: 'dark',
            notifications: {
                messages: true,
                friend_requests: true,
                likes: true,
                comments: true,
                mentions: true
            },
            privacy: {
                profile_visibility: 'public',
                online_status: true,
                read_receipts: true
            },
            storage: {
                auto_download: 'wifi',
                cache_size: 0,
                media_quality: 'auto'
            }
        };
        this.activeSection = 'general';
    }

    async render() {
        await this.loadSettings();

        return `
            <div class="settings-container">
                <div class="settings-header">
                    <button class="icon-button" onclick="router.back()">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                        </svg>
                    </button>
                    <h2>Settings</h2>
                </div>

                <div class="settings-nav">
                    <button class="settings-nav-item ${this.activeSection === 'general' ? 'active' : ''}"
                            onclick="settingsPage.setSection('general')">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88a9.947 9.947 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20z" fill="currentColor"/>
                        </svg>
                        <span>Account</span>
                    </button>
                    
                    <button class="settings-nav-item ${this.activeSection === 'notifications' ? 'active' : ''}"
                            onclick="settingsPage.setSection('notifications')">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
                        </svg>
                        <span>Notifications</span>
                    </button>
                    
                    <button class="settings-nav-item ${this.activeSection === 'privacy' ? 'active' : ''}"
                            onclick="settingsPage.setSection('privacy')">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/>
                        </svg>
                        <span>Privacy</span>
                    </button>
                    
                    <button class="settings-nav-item ${this.activeSection === 'storage' ? 'active' : ''}"
                            onclick="settingsPage.setSection('storage')">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="currentColor"/>
                        </svg>
                        <span>Storage</span>
                    </button>
                    
                    <button class="settings-nav-item ${this.activeSection === 'about' ? 'active' : ''}"
                            onclick="settingsPage.setSection('about')">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                        </svg>
                        <span>About</span>
                    </button>
                </div>

                <div class="settings-content">
                    ${this.renderSection()}
                </div>
            </div>
        `;
    }

    renderSection() {
        switch (this.activeSection) {
            case 'general':
                return this.renderGeneral();
            case 'notifications':
                return this.renderNotifications();
            case 'privacy':
                return this.renderPrivacy();
            case 'storage':
                return this.renderStorage();
            case 'about':
                return this.renderAbout();
            default:
                return '';
        }
    }

    renderGeneral() {
        const user = authStore.getState()?.user;

        return `
            <div class="settings-section">
                <h3>Account Settings</h3>
                
                <div class="settings-item" onclick="router.navigate('/profile/edit')">
                    <div class="settings-item-content">
                        <span class="settings-label">Edit Profile</span>
                        <span class="settings-value">${this.escapeHtml(user?.fullName || '')}</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
                    </svg>
                </div>

                <div class="settings-item" onclick="router.navigate('/change-password')">
                    <div class="settings-item-content">
                        <span class="settings-label">Change Password</span>
                        <span class="settings-value">••••••••</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
                    </svg>
                </div>

                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Theme</span>
                    </div>
                    <select class="settings-select" onchange="settingsPage.changeTheme(this.value)">
                        <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
                        <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="system" ${this.settings.theme === 'system' ? 'selected' : ''}>System</option>
                    </select>
                </div>

                <div class="settings-item" onclick="settingsPage.clearCache()">
                    <div class="settings-item-content">
                        <span class="settings-label">Clear Cache</span>
                        <span class="settings-value">${this.formatBytes(this.settings.storage.cache_size)}</span>
                    </div>
                    <button class="settings-action">Clear</button>
                </div>

                <div class="settings-item danger" onclick="settingsPage.logout()">
                    <div class="settings-item-content">
                        <span class="settings-label">Log Out</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/>
                    </svg>
                </div>
            </div>
        `;
    }

    renderNotifications() {
        return `
            <div class="settings-section">
                <h3>Notification Settings</h3>
                
                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Messages</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" 
                               ${this.settings.notifications.messages ? 'checked' : ''}
                               onchange="settingsPage.toggleNotification('messages', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Friend Requests</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" 
                               ${this.settings.notifications.friend_requests ? 'checked' : ''}
                               onchange="settingsPage.toggleNotification('friend_requests', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Likes</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" 
                               ${this.settings.notifications.likes ? 'checked' : ''}
                               onchange="settingsPage.toggleNotification('likes', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Comments</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" 
                               ${this.settings.notifications.comments ? 'checked' : ''}
                               onchange="settingsPage.toggleNotification('comments', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Mentions</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" 
                               ${this.settings.notifications.mentions ? 'checked' : ''}
                               onchange="settingsPage.toggleNotification('mentions', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
    }

    renderPrivacy() {
        return `
            <div class="settings-section">
                <h3>Privacy Settings</h3>
                
                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Profile Visibility</span>
                    </div>
                    <select class="settings-select" onchange="settingsPage.changePrivacy('profile_visibility', this.value)">
                        <option value="public" ${this.settings.privacy.profile_visibility === 'public' ? 'selected' : ''}>Public</option>
                        <option value="friends" ${this.settings.privacy.profile_visibility === 'friends' ? 'selected' : ''}>Friends Only</option>
                        <option value="private" ${this.settings.privacy.profile_visibility === 'private' ? 'selected' : ''}>Private</option>
                    </select>
                </div>

                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Show Online Status</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" 
                               ${this.settings.privacy.online_status ? 'checked' : ''}
                               onchange="settingsPage.changePrivacy('online_status', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Read Receipts</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" 
                               ${this.settings.privacy.read_receipts ? 'checked' : ''}
                               onchange="settingsPage.changePrivacy('read_receipts', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
    }

    renderStorage() {
        return `
            <div class="settings-section">
                <h3>Storage Settings</h3>
                
                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Auto-download Media</span>
                    </div>
                    <select class="settings-select" onchange="settingsPage.changeStorage('auto_download', this.value)">
                        <option value="wifi" ${this.settings.storage.auto_download === 'wifi' ? 'selected' : ''}>WiFi Only</option>
                        <option value="always" ${this.settings.storage.auto_download === 'always' ? 'selected' : ''}>Always</option>
                        <option value="never" ${this.settings.storage.auto_download === 'never' ? 'selected' : ''}>Never</option>
                    </select>
                </div>

                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Media Quality</span>
                    </div>
                    <select class="settings-select" onchange="settingsPage.changeStorage('media_quality', this.value)">
                        <option value="auto" ${this.settings.storage.media_quality === 'auto' ? 'selected' : ''}>Auto</option>
                        <option value="high" ${this.settings.storage.media_quality === 'high' ? 'selected' : ''}>High</option>
                        <option value="medium" ${this.settings.storage.media_quality === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="low" ${this.settings.storage.media_quality === 'low' ? 'selected' : ''}>Low</option>
                    </select>
                </div>

                <div class="settings-item">
                    <div class="settings-item-content">
                        <span class="settings-label">Storage Used</span>
                        <span class="settings-value">${this.formatBytes(this.settings.storage.cache_size)}</span>
                    </div>
                    <button class="settings-action" onclick="settingsPage.clearCache()">Clear</button>
                </div>
            </div>
        `;
    }

    renderAbout() {
        return `
            <div class="settings-section">
                <h3>About HERE</h3>
                
                <div class="about-logo">
                    <img src="/assets/splash/logo.png" alt="HERE" width="80">
                </div>
                
                <div class="about-info">
                    <p><strong>Version</strong> 1.0.0</p>
                    <p><strong>Build</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Offline-first social network</strong></p>
                </div>
                
                <div class="settings-item" onclick="window.open('https://here-social.com/privacy')">
                    <div class="settings-item-content">
                        <span class="settings-label">Privacy Policy</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/>
                    </svg>
                </div>

                <div class="settings-item" onclick="window.open('https://here-social.com/terms')">
                    <div class="settings-item-content">
                        <span class="settings-label">Terms of Service</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/>
                    </svg>
                </div>

                <div class="settings-item" onclick="settingsPage.showLicenses()">
                    <div class="settings-item-content">
                        <span class="settings-label">Open Source Licenses</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
                    </svg>
                </div>
            </div>
        `;
    }

    async loadSettings() {
        // Load from localStorage or IndexedDB
        const saved = localStorage.getItem('app_settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to load settings', e);
            }
        }

        // Apply theme
        this.applyTheme(this.settings.theme);
    }

    async saveSettings() {
        localStorage.setItem('app_settings', JSON.stringify(this.settings));
        
        // Save to IndexedDB for offline access
        await db.put('auth', {
            id: 'settings',
            ...this.settings,
            timestamp: Date.now()
        });
    }

    setSection(section) {
        this.activeSection = section;
        this.refresh();
    }

    async changeTheme(theme) {
        this.settings.theme = theme;
        this.applyTheme(theme);
        await this.saveSettings();
    }

    applyTheme(theme) {
        const html = document.documentElement;
        
        if (theme === 'system') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.classList.toggle('dark-theme', systemDark);
        } else {
            html.classList.toggle('dark-theme', theme === 'dark');
        }
    }

    async toggleNotification(type, enabled) {
        this.settings.notifications[type] = enabled;
        await this.saveSettings();
    }

    async changePrivacy(key, value) {
        this.settings.privacy[key] = value;
        await this.saveSettings();
    }

    async changeStorage(key, value) {
        this.settings.storage[key] = value;
        await this.saveSettings();
    }

    async clearCache() {
        try {
            // Clear IndexedDB old data
            const stores = ['posts', 'messages', 'notifications'];
            for (const store of stores) {
                await db.clear(store);
            }

            // Clear cache storage
            const cacheNames = await caches.keys();
            for (const name of cacheNames) {
                if (name !== CACHE_NAME) {
                    await caches.delete(name);
                }
            }

            this.settings.storage.cache_size = 0;
            await this.saveSettings();
            
            this.refresh();
            this.showToast('Cache cleared');
        } catch (error) {
            this.showToast('Failed to clear cache');
        }
    }

    async logout() {
        if (confirm('Are you sure you want to log out?')) {
            await authStore.asyncActions.logout();
        }
    }

    showLicenses() {
        alert('Open Source Licenses:\n\n' +
              'This app uses various open source libraries.\n' +
              'For full license information, visit:\n' +
              'https://here-social.com/licenses');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        // Add CSS for switches if not already present
        if (!document.getElementById('settings-styles')) {
            const style = document.createElement('style');
            style.id = 'settings-styles';
            style.textContent = `
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--bg-tertiary);
                    transition: .4s;
                    border-radius: 24px;
                }
                
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 2px;
                    bottom: 2px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .slider {
                    background-color: var(--accent);
                }
                
                input:checked + .slider:before {
                    transform: translateX(26px);
                }
                
                .settings-select {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    padding: 8px 12px;
                    border-radius: var(--border-radius-sm);
                    font-size: 14px;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Make available globally
window.SettingsPage = SettingsPage;
// Path: here-social/js/pages/Profile.js

/**
 * Profile Page
 */
class ProfilePage {
    constructor(context) {
        this.context = context;
        this.userId = context.params.id || authStore.getState()?.user?.userId;
        this.isOwnProfile = !context.params.id || context.params.id === authStore.getState()?.user?.userId;
        this.user = null;
        this.posts = [];
        this.activeTab = 'posts'; // posts, liked
    }

    async render() {
        await this.loadProfile();
        
        const user = this.user || authStore.getState()?.user;
        
        if (!user) {
            return this.renderNotFound();
        }

        return `
            <div class="profile-container">
                <div class="profile-header">
                    <div class="profile-cover"></div>
                    
                    <div class="profile-avatar-container">
                        <div class="profile-avatar" onclick="${this.isOwnProfile ? 'this.selectAvatar()' : ''}">
                            ${this.renderAvatar(user)}
                            ${this.isOwnProfile ? `
                                <div class="profile-avatar-overlay">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.1c-.1.1-.15.22-.15.36zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                                    </svg>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="profile-info">
                        <h1 class="profile-name">${this.escapeHtml(user.fullName || 'User')}</h1>
                        <div class="profile-username">@${this.escapeHtml(user.username || 'username')}</div>
                        
                        ${user.bio ? `
                            <div class="profile-bio">${this.escapeHtml(user.bio)}</div>
                        ` : this.isOwnProfile ? `
                            <div class="profile-bio placeholder" onclick="router.navigate('/profile/edit')">
                                Add a bio...
                            </div>
                        ` : ''}
                        
                        <div class="profile-stats">
                            <div class="stat">
                                <span class="stat-value">${formatNumber(user.posts || 0)}</span>
                                <span class="stat-label">Posts</span>
                            </div>
                            <div class="stat" onclick="router.navigate('/friends')">
                                <span class="stat-value">${formatNumber(user.friends || 0)}</span>
                                <span class="stat-label">Friends</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${formatNumber(user.likes || 0)}</span>
                                <span class="stat-label">Likes</span>
                            </div>
                        </div>
                        
                        <div class="profile-actions">
                            ${this.renderActions()}
                        </div>
                    </div>
                </div>
                
                <div class="profile-tabs">
                    <button class="tab ${this.activeTab === 'posts' ? 'active' : ''}" 
                            onclick="profilePage.switchTab('posts')">
                        Posts
                    </button>
                    <button class="tab ${this.activeTab === 'liked' ? 'active' : ''}" 
                            onclick="profilePage.switchTab('liked')">
                        Liked
                    </button>
                </div>
                
                <div class="profile-content">
                    ${this.activeTab === 'posts' ? this.renderPosts() : this.renderLikedPosts()}
                </div>
            </div>
        `;
    }

    renderAvatar(user) {
        if (user.profilePicture && user.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${user.profilePicture}" alt="${user.fullName}">`;
        } else {
            const initials = getInitials(user.fullName || '?');
            return `<div class="avatar-placeholder large">${initials}</div>`;
        }
    }

    renderActions() {
        if (this.isOwnProfile) {
            return `
                <button class="profile-button secondary" onclick="router.navigate('/profile/edit')">
                    Edit Profile
                </button>
                <button class="profile-button secondary" onclick="router.navigate('/settings')">
                    Settings
                </button>
            `;
        } else {
            // Check if already friends
            const isFriend = false; // This would be checked from store
            const hasPendingRequest = false; // This would be checked from store
            
            if (isFriend) {
                return `
                    <button class="profile-button primary" onclick="profilePage.messageUser()">
                        Message
                    </button>
                    <button class="profile-button secondary" onclick="profilePage.removeFriend()">
                        Remove Friend
                    </button>
                `;
            } else if (hasPendingRequest) {
                return `
                    <button class="profile-button secondary" disabled>
                        Request Sent
                    </button>
                `;
            } else {
                return `
                    <button class="profile-button primary" onclick="profilePage.addFriend()">
                        Add Friend
                    </button>
                    <button class="profile-button secondary" onclick="profilePage.messageUser()">
                        Message
                    </button>
                `;
            }
        }
    }

    renderPosts() {
        if (this.posts.length === 0) {
            return `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4-3h2v13h-2z" fill="currentColor"/>
                    </svg>
                    <h3>No posts yet</h3>
                    <p>${this.isOwnProfile ? 'Share your first post!' : 'This user hasn\'t posted anything yet'}</p>
                </div>
            `;
        }

        return this.posts.map(post => {
            const postCard = new PostCard(
                post,
                (postId, liked) => this.handleLike(postId, liked),
                (postId) => this.handleComment(postId),
                (post) => this.handleShare(post)
            );
            return postCard.render();
        }).join('');
    }

    renderLikedPosts() {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
                </svg>
                <h3>Coming soon</h3>
                <p>Liked posts will appear here</p>
            </div>
        `;
    }

    renderNotFound() {
        return `
            <div class="error-state">
                <svg viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                </svg>
                <h3>User not found</h3>
                <p>The profile you're looking for doesn't exist</p>
                <button class="profile-button primary" onclick="router.navigate('/')">
                    Go Home
                </button>
            </div>
        `;
    }

    async loadProfile() {
        // This would load from store/API
        // For now, mock data
        this.user = {
            userId: this.userId,
            fullName: 'John Doe',
            username: 'johndoe',
            bio: 'Hello, I am using HERE!',
            profilePicture: null,
            posts: 42,
            friends: 128,
            likes: 356,
            status: 'online',
            lastSeen: Date.now()
        };

        // Mock posts
        this.posts = [
            {
                postId: 'post1',
                content: 'This is my first post!',
                author: this.user,
                likes: 10,
                likedByUser: false,
                timestamp: Date.now() - 3600000,
                type: 'text'
            },
            {
                postId: 'post2',
                content: 'Having a great day!',
                author: this.user,
                likes: 5,
                likedByUser: true,
                timestamp: Date.now() - 7200000,
                type: 'text'
            }
        ];
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.refresh();
    }

    async addFriend() {
        // Send friend request
        this.showToast('Friend request sent');
    }

    async removeFriend() {
        if (confirm('Remove this friend?')) {
            // Remove friend
            this.showToast('Friend removed');
        }
    }

    messageUser() {
        const chatId = `chat_${this.userId}`;
        router.navigate(`/chat/${chatId}`);
    }

    selectAvatar() {
        // Open file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // Upload and update avatar
                this.uploadAvatar(file);
            }
        };
        input.click();
    }

    async uploadAvatar(file) {
        // Compress and upload
        try {
            const processed = await mediaManager.processImage(file);
            // Upload to server
            this.showToast('Profile picture updated');
        } catch (error) {
            this.showToast('Failed to upload image');
        }
    }

    handleLike(postId, liked) {
        // Handle like
    }

    handleComment(postId) {
        router.navigate(`/post/${postId}`);
    }

    handleShare(post) {
        if (navigator.share) {
            navigator.share({
                title: post.content,
                url: window.location.origin + `/post/${post.postId}`
            });
        } else {
            copyToClipboard(window.location.origin + `/post/${post.postId}`);
            this.showToast('Link copied');
        }
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    mounted() {
        // Any additional setup
    }
}

// Make available globally
window.ProfilePage = ProfilePage;
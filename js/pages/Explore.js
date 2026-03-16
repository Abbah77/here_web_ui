// Path: here-social/js/pages/Explore.js

/**
 * Explore Page - Discover Users, Posts, and Trends
 */
class ExplorePage {
    constructor(context) {
        this.context = context;
        this.activeTab = 'for-you'; // for-you, trending, users, hashtags
        this.forYou = [];
        this.trending = [];
        suggestedUsers = [];
        this.popularHashtags = [];
        this.loading = false;
        this.page = 1;
        this.hasMore = true;
    }

    async render() {
        await this.loadExploreData();

        return `
            <div class="explore-container">
                <div class="explore-header">
                    <h2>Explore</h2>
                    <div class="explore-search" onclick="router.navigate('/search')">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                        </svg>
                        <span>Search</span>
                    </div>
                </div>

                <div class="explore-tabs">
                    <button class="tab ${this.activeTab === 'for-you' ? 'active' : ''}" 
                            onclick="explorePage.switchTab('for-you')">
                        For You
                    </button>
                    <button class="tab ${this.activeTab === 'trending' ? 'active' : ''}" 
                            onclick="explorePage.switchTab('trending')">
                        Trending
                    </button>
                    <button class="tab ${this.activeTab === 'users' ? 'active' : ''}" 
                            onclick="explorePage.switchTab('users')">
                        Users
                    </button>
                    <button class="tab ${this.activeTab === 'hashtags' ? 'active' : ''}" 
                            onclick="explorePage.switchTab('hashtags')">
                        Hashtags
                    </button>
                </div>

                <div class="explore-content">
                    ${this.renderContent()}
                </div>

                ${this.loading ? `
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderContent() {
        switch (this.activeTab) {
            case 'for-you':
                return this.renderForYou();
            case 'trending':
                return this.renderTrending();
            case 'users':
                return this.renderUsers();
            case 'hashtags':
                return this.renderHashtags();
            default:
                return '';
        }
    }

    renderForYou() {
        if (this.forYou.length === 0) {
            return `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z" fill="currentColor"/>
                    </svg>
                    <h3>No recommendations yet</h3>
                    <p>Follow more users to get personalized content</p>
                </div>
            `;
        }

        return `
            <div class="explore-grid">
                ${this.forYou.map(item => this.renderGridItem(item)).join('')}
            </div>
        `;
    }

    renderTrending() {
        return `
            <div class="trending-list">
                ${this.trending.map((item, index) => `
                    <div class="trending-item" onclick="router.navigate('/search?q=${encodeURIComponent(item.query)}')">
                        <div class="trending-rank">#${index + 1}</div>
                        <div class="trending-content">
                            <div class="trending-topic">${this.escapeHtml(item.topic)}</div>
                            <div class="trending-stats">${formatNumber(item.posts)} posts</div>
                        </div>
                        ${item.category ? `
                            <span class="trending-category">${item.category}</span>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderUsers() {
        if (this.suggestedUsers.length === 0) {
            return this.renderEmptyUsers();
        }

        return `
            <div class="suggested-users">
                ${this.suggestedUsers.map(user => {
                    const friendItem = new FriendItem(user, 'request', (action, user) => 
                        this.handleUserAction(action, user)
                    );
                    return friendItem.render();
                }).join('')}
            </div>
        `;
    }

    renderHashtags() {
        return `
            <div class="hashtags-cloud">
                ${this.popularHashtags.map(tag => `
                    <a href="/search?q=%23${tag.name}" 
                       class="hashtag-chip"
                       style="font-size: ${this.getHashtagSize(tag.count)}px"
                       data-link>
                        #${tag.name}
                        <span class="hashtag-count">${formatNumber(tag.count)}</span>
                    </a>
                `).join('')}
            </div>
        `;
    }

    renderGridItem(item) {
        if (item.type === 'post') {
            const postCard = new PostCard(
                item,
                (postId, liked) => this.handleLike(postId, liked),
                (postId) => this.handleComment(postId),
                (post) => this.handleShare(post)
            );
            return postCard.render();
        } else if (item.type === 'user') {
            return `
                <div class="suggested-user-card" onclick="router.navigate('/profile/${item.userId}')">
                    <div class="user-avatar">
                        ${this.renderAvatar(item)}
                    </div>
                    <div class="user-info">
                        <h4>${this.escapeHtml(item.fullName)}</h4>
                        <span class="username">@${this.escapeHtml(item.username)}</span>
                    </div>
                    <button class="follow-btn" onclick="event.stopPropagation(); explorePage.followUser('${item.userId}')">
                        Follow
                    </button>
                </div>
            `;
        }
        return '';
    }

    renderAvatar(user) {
        if (user.profilePicture && user.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${user.profilePicture}" alt="${user.fullName}">`;
        } else {
            const initials = getInitials(user.fullName || '?');
            return `<div class="avatar-placeholder">${initials}</div>`;
        }
    }

    renderEmptyUsers() {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-1 .05 1.16.84 2 1.87 2 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
                </svg>
                <h3>No suggestions yet</h3>
                <p>Check back later for user recommendations</p>
            </div>
        `;
    }

    async loadExploreData() {
        this.loading = true;

        // Simulate API calls
        await Promise.all([
            this.loadForYou(),
            this.loadTrending(),
            this.loadSuggestedUsers(),
            this.loadHashtags()
        ]);

        this.loading = false;
    }

    async loadForYou() {
        // Mock data - replace with actual API
        this.forYou = [
            {
                type: 'post',
                postId: 'post1',
                content: 'Check out this amazing view! 🌅',
                author: {
                    fullName: 'Travel Explorer',
                    username: 'travelexplorer',
                    profilePicture: null
                },
                likes: 234,
                comments: 45,
                timestamp: Date.now() - 3600000,
                media: {
                    type: 'image',
                    url: 'https://picsum.photos/400/300'
                }
            },
            {
                type: 'user',
                userId: 'user1',
                fullName: 'Sarah Johnson',
                username: 'sarahj',
                profilePicture: null,
                bio: 'Photographer | Traveler'
            },
            {
                type: 'post',
                postId: 'post2',
                content: 'Just launched my new project! 🚀',
                author: {
                    fullName: 'Tech Creator',
                    username: 'techcreator',
                    profilePicture: null
                },
                likes: 567,
                comments: 89,
                timestamp: Date.now() - 7200000
            }
        ];
    }

    async loadTrending() {
        this.trending = [
            { topic: '#TechNews', posts: 15234, category: 'Technology' },
            { topic: 'World Cup', posts: 23456, category: 'Sports' },
            { topic: 'New Album Release', posts: 12345, category: 'Music' },
            { topic: '#ThrowbackThursday', posts: 34567, category: 'Lifestyle' },
            { topic: 'AI Revolution', posts: 8912, category: 'Technology' },
            { topic: 'Summer Vibes', posts: 27890, category: 'Lifestyle' },
            { topic: 'Movie Premiere', posts: 6789, category: 'Entertainment' },
            { topic: '#FitnessMotivation', posts: 15678, category: 'Health' }
        ];
    }

    async loadSuggestedUsers() {
        this.suggestedUsers = [
            {
                userId: 'user2',
                fullName: 'Alex Chen',
                username: 'alexchen',
                profilePicture: null,
                bio: 'Designer & Creator',
                followers: 1234
            },
            {
                userId: 'user3',
                fullName: 'Maria Garcia',
                username: 'mariag',
                profilePicture: null,
                bio: 'Digital Artist',
                followers: 3456
            },
            {
                userId: 'user4',
                fullName: 'James Wilson',
                username: 'jamesw',
                profilePicture: null,
                bio: 'Tech Enthusiast',
                followers: 2345
            }
        ];
    }

    async loadHashtags() {
        this.popularHashtags = [
            { name: 'tech', count: 45678 },
            { name: 'photography', count: 34567 },
            { name: 'travel', count: 28901 },
            { name: 'food', count: 26789 },
            { name: 'fitness', count: 23456 },
            { name: 'music', count: 19876 },
            { name: 'art', count: 18765 },
            { name: 'nature', count: 16543 },
            { name: 'coding', count: 14321 },
            { name: 'design', count: 12345 }
        ];
    }

    getHashtagSize(count) {
        const min = 14;
        const max = 32;
        const maxCount = Math.max(...this.popularHashtags.map(h => h.count));
        const size = min + (count / maxCount) * (max - min);
        return Math.round(size);
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.refresh();
    }

    async followUser(userId) {
        // Queue follow action
        await syncManager.queueAction({
            type: 'FOLLOW_USER',
            data: { userId }
        });

        this.showToast('Following user');
    }

    async handleUserAction(action, user) {
        switch (action) {
            case 'add':
                await this.followUser(user.userId);
                break;
            case 'message':
                router.navigate(`/chat/${user.userId}`);
                break;
        }
    }

    handleLike(postId, liked) {
        feedStore.asyncActions.toggleLike(postId, liked);
    }

    handleComment(postId) {
        router.navigate(`/post/${postId}`);
    }

    handleShare(post) {
        if (navigator.share) {
            navigator.share({
                title: 'Check this out!',
                text: post.content,
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
        // Setup infinite scroll
        this.setupInfiniteScroll();
    }

    setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMore && !this.loading) {
                    this.loadMore();
                }
            });
        }, { threshold: 0.5 });

        const sentinel = document.createElement('div');
        sentinel.id = 'exploreSentinel';
        document.querySelector('.explore-content').appendChild(sentinel);
        observer.observe(sentinel);
    }

    async loadMore() {
        this.page++;
        this.loading = true;
        
        // Load more data based on active tab
        // This would call API with pagination
        
        this.loading = false;
    }
}

// Make available globally
window.ExplorePage = ExplorePage;
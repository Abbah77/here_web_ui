// Path: here-social/js/pages/Home.js

/**
 * Home Page with Feed
 */
class HomePage {
    constructor(context) {
        this.context = context;
        this.posts = [];
        this.page = 1;
        this.hasMore = true;
        this.loading = false;
        this.newPostsCount = 0;
        this.observer = null;
    }

    async render() {
        // Get initial state from store
        const feedState = feedStore.getState();
        this.posts = feedState.posts || [];
        this.newPostsCount = feedState.newPostsCount || 0;
        
        return `
            <div class="home-container">
                ${this.newPostsCount > 0 ? this.renderNewPostsBanner() : ''}
                
                <div class="feed-container">
                    ${this.renderCreatePost()}
                    
                    <div id="feed" class="feed">
                        ${this.renderPosts()}
                    </div>
                    
                    <div id="feedLoader" class="loading-spinner" style="display: none;">
                        <div class="spinner"></div>
                    </div>
                    
                    ${!this.hasMore && this.posts.length > 0 ? `
                        <div class="text-center text-muted p-3">
                            No more posts to load
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderCreatePost() {
        const user = authStore.getState()?.user;
        
        return `
            <div class="create-post">
                <div class="create-post-input">
                    ${this.renderUserAvatar(user)}
                    <input type="text" 
                           placeholder="What's on your mind?" 
                           id="postInput"
                           onclick="document.getElementById('postModal').classList.add('visible')">
                </div>
                <div class="create-post-actions">
                    <button onclick="document.getElementById('postModal').classList.add('visible')">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4-3h2v13h-2z" fill="currentColor"/>
                        </svg>
                        Photo
                    </button>
                    <button onclick="document.getElementById('postModal').classList.add('visible')">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V7c0-.55-.45-1-1-1zm4 4v6h-2v-6h2zm0-4v2h-2V6h2z" fill="currentColor"/>
                        </svg>
                        Video
                    </button>
                </div>
            </div>
        `;
    }

    renderUserAvatar(user) {
        if (!user) return '<div class="avatar-placeholder">?</div>';
        
        if (user.profilePicture && user.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${user.profilePicture}" alt="${user.fullName}" class="user-avatar">`;
        } else {
            const initials = getInitials(user.fullName || '?');
            return `<div class="avatar-placeholder">${initials}</div>`;
        }
    }

    renderNewPostsBanner() {
        return `
            <div class="new-posts-banner" onclick="homePage.loadNewPosts()">
                📱 ${this.newPostsCount} new post${this.newPostsCount > 1 ? 's' : ''}
            </div>
        `;
    }

    renderPosts() {
        if (this.posts.length === 0 && !this.loading) {
            return this.renderEmptyState();
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

    renderEmptyState() {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                </svg>
                <h3>No posts yet</h3>
                <p>Be the first to share something!</p>
            </div>
        `;
    }

    async mounted() {
        // Load feed
        await this.loadFeed();

        // Setup infinite scroll
        this.setupInfiniteScroll();

        // Subscribe to feed store updates
        this.unsubscribe = feedStore.subscribe('feed', (newState, action) => {
            if (action.type === 'ADD_POST' || action.type === 'FETCH_FEED_SUCCESS') {
                this.posts = newState.posts;
                this.newPostsCount = newState.newPostsCount;
                this.refreshFeed();
            }
        });

        // Check for new posts periodically
        this.interval = setInterval(() => {
            if (navigator.onLine) {
                feedStore.asyncActions.checkForNewPosts();
            }
        }, 30000);
    }

    setupInfiniteScroll() {
        const feed = document.getElementById('feed');
        const loader = document.getElementById('feedLoader');
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMore && !this.loading) {
                    this.loadMore();
                }
            });
        }, { threshold: 0.5 });

        const sentinel = document.createElement('div');
        sentinel.id = 'feedSentinel';
        feed.appendChild(sentinel);
        this.observer.observe(sentinel);
    }

    async loadFeed() {
        this.loading = true;
        this.showLoader();

        await feedStore.asyncActions.loadFeed(this.page);

        this.loading = false;
        this.hideLoader();
    }

    async loadMore() {
        if (!this.hasMore || this.loading) return;

        this.page++;
        this.loading = true;
        this.showLoader();

        await feedStore.asyncActions.loadFeed(this.page);

        const feedState = feedStore.getState();
        this.hasMore = feedState.hasMore;
        this.loading = false;
        this.hideLoader();
    }

    async loadNewPosts() {
        await feedStore.asyncActions.loadNewPosts();
        feedStore.dispatch(feedActions.clearNewPosts());
    }

    async handleLike(postId, liked) {
        await feedStore.asyncActions.toggleLike(postId, liked);
    }

    handleComment(postId) {
        // Navigate to post detail with comments
        router.navigate(`/post/${postId}`);
    }

    handleShare(post) {
        // Show share modal
        if (navigator.share) {
            navigator.share({
                title: 'Check out this post',
                text: post.content,
                url: window.location.origin + `/post/${post.postId}`
            });
        } else {
            // Fallback - copy link
            copyToClipboard(window.location.origin + `/post/${post.postId}`);
            this.showToast('Link copied to clipboard');
        }
    }

    showLoader() {
        const loader = document.getElementById('feedLoader');
        if (loader) loader.style.display = 'flex';
    }

    hideLoader() {
        const loader = document.getElementById('feedLoader');
        if (loader) loader.style.display = 'none';
    }

    refreshFeed() {
        const feed = document.getElementById('feed');
        if (feed) {
            const scrollPos = window.scrollY;
            feed.innerHTML = this.renderPosts();
            window.scrollTo(0, scrollPos);
            
            // Reattach post event listeners
            feed.querySelectorAll('.post-card').forEach(card => {
                const postId = card.dataset.postId;
                const post = this.posts.find(p => p.postId === postId);
                if (post) {
                    const postCard = new PostCard(
                        post,
                        (id, liked) => this.handleLike(id, liked),
                        (id) => this.handleComment(id),
                        (p) => this.handleShare(p)
                    );
                    postCard.attachEvents(card);
                }
            });
        }

        // Update banner
        const banner = document.querySelector('.new-posts-banner');
        if (this.newPostsCount > 0) {
            if (!banner) {
                const container = document.querySelector('.home-container');
                container.insertAdjacentHTML('afterbegin', this.renderNewPostsBanner());
            } else {
                banner.outerHTML = this.renderNewPostsBanner();
            }
        } else if (banner) {
            banner.remove();
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

    destroyed() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
}

// Make available globally
window.HomePage = HomePage;
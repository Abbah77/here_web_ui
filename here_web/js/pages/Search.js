// Path: here-social/js/pages/Search.js

/**
 * Search Page
 */
class SearchPage {
    constructor(context) {
        this.context = context;
        this.query = context.query?.get('q') || '';
        this.activeTab = 'top'; // top, latest, people, posts, hashtags
        this.results = {
            users: [],
            posts: [],
            hashtags: []
        };
        this.loading = false;
        this.recentSearches = [];
    }

    async render() {
        await this.loadRecentSearches();
        
        if (this.query) {
            await this.performSearch();
        }

        return `
            <div class="search-container">
                <div class="search-header">
                    <button class="icon-button" onclick="router.back()">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                        </svg>
                    </button>
                    
                    <div class="search-box">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                        </svg>
                        <input type="text" 
                               placeholder="Search HERE..." 
                               id="searchInput"
                               value="${this.escapeHtml(this.query)}"
                               autofocus>
                    </div>
                </div>

                ${this.query ? this.renderSearchTabs() : this.renderRecentSearches()}

                <div class="search-results">
                    ${this.renderResults()}
                </div>
            </div>
        `;
    }

    renderSearchTabs() {
        const counts = {
            top: this.results.posts.length + this.results.users.length,
            latest: this.results.posts.length,
            people: this.results.users.length,
            posts: this.results.posts.length,
            hashtags: this.results.hashtags.length
        };

        return `
            <div class="search-tabs">
                <button class="tab ${this.activeTab === 'top' ? 'active' : ''}" 
                        onclick="searchPage.switchTab('top')">
                    Top (${counts.top})
                </button>
                <button class="tab ${this.activeTab === 'latest' ? 'active' : ''}" 
                        onclick="searchPage.switchTab('latest')">
                    Latest (${counts.latest})
                </button>
                <button class="tab ${this.activeTab === 'people' ? 'active' : ''}" 
                        onclick="searchPage.switchTab('people')">
                    People (${counts.people})
                </button>
                <button class="tab ${this.activeTab === 'posts' ? 'active' : ''}" 
                        onclick="searchPage.switchTab('posts')">
                    Posts (${counts.posts})
                </button>
                <button class="tab ${this.activeTab === 'hashtags' ? 'active' : ''}" 
                        onclick="searchPage.switchTab('hashtags')">
                    Hashtags (${counts.hashtags})
                </button>
            </div>
        `;
    }

    renderRecentSearches() {
        if (this.recentSearches.length === 0) {
            return `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                    </svg>
                    <h3>Search HERE</h3>
                    <p>Find people, posts, and more</p>
                </div>
            `;
        }

        return `
            <div class="recent-searches">
                <div class="recent-header">
                    <h3>Recent Searches</h3>
                    <button class="text-button" onclick="searchPage.clearRecentSearches()">
                        Clear all
                    </button>
                </div>
                
                ${this.recentSearches.map(search => `
                    <div class="recent-item" onclick="searchPage.search('${this.escapeHtml(search.query)}')">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z" fill="currentColor"/>
                        </svg>
                        <span>${this.escapeHtml(search.query)}</span>
                        <small>${formatDate(search.timestamp)}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderResults() {
        if (this.loading) {
            return `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
            `;
        }

        switch (this.activeTab) {
            case 'top':
                return this.renderTopResults();
            case 'latest':
            case 'posts':
                return this.renderPosts();
            case 'people':
                return this.renderUsers();
            case 'hashtags':
                return this.renderHashtags();
            default:
                return '';
        }
    }

    renderTopResults() {
        const hasResults = this.results.posts.length > 0 || 
                          this.results.users.length > 0 || 
                          this.results.hashtags.length > 0;

        if (!hasResults) {
            return this.renderNoResults();
        }

        return `
            <div class="top-results">
                ${this.results.users.length > 0 ? `
                    <div class="result-section">
                        <h4>People</h4>
                        ${this.results.users.slice(0, 3).map(user => {
                            const item = new FriendItem(user, 'request', (action, user) => 
                                this.handleUserAction(action, user)
                            );
                            return item.render();
                        }).join('')}
                        ${this.results.users.length > 3 ? `
                            <button class="see-all" onclick="searchPage.switchTab('people')">
                                See all ${this.results.users.length} people
                            </button>
                        ` : ''}
                    </div>
                ` : ''}

                ${this.results.posts.length > 0 ? `
                    <div class="result-section">
                        <h4>Posts</h4>
                        ${this.results.posts.slice(0, 3).map(post => {
                            const postCard = new PostCard(
                                post,
                                (id, liked) => this.handleLike(id, liked),
                                (id) => this.handleComment(id),
                                (post) => this.handleShare(post)
                            );
                            return postCard.render();
                        }).join('')}
                        ${this.results.posts.length > 3 ? `
                            <button class="see-all" onclick="searchPage.switchTab('posts')">
                                See all ${this.results.posts.length} posts
                            </button>
                        ` : ''}
                    </div>
                ` : ''}

                ${this.results.hashtags.length > 0 ? `
                    <div class="result-section">
                        <h4>Hashtags</h4>
                        <div class="hashtags-list">
                            ${this.results.hashtags.slice(0, 5).map(tag => `
                                <a href="/search?q=%23${tag.name}" class="hashtag-result" data-link>
                                    #${tag.name}
                                    <span class="count">${formatNumber(tag.count)} posts</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderUsers() {
        if (this.results.users.length === 0) {
            return this.renderNoResults();
        }

        return `
            <div class="users-results">
                ${this.results.users.map(user => {
                    const item = new FriendItem(user, 'request', (action, user) => 
                        this.handleUserAction(action, user)
                    );
                    return item.render();
                }).join('')}
            </div>
        `;
    }

    renderPosts() {
        if (this.results.posts.length === 0) {
            return this.renderNoResults();
        }

        return `
            <div class="posts-results">
                ${this.results.posts.map(post => {
                    const postCard = new PostCard(
                        post,
                        (id, liked) => this.handleLike(id, liked),
                        (id) => this.handleComment(id),
                        (post) => this.handleShare(post)
                    );
                    return postCard.render();
                }).join('')}
            </div>
        `;
    }

    renderHashtags() {
        if (this.results.hashtags.length === 0) {
            return this.renderNoResults();
        }

        return `
            <div class="hashtags-results">
                ${this.results.hashtags.map(tag => `
                    <a href="/search?q=%23${tag.name}" class="hashtag-card" data-link>
                        <div class="hashtag-icon">#</div>
                        <div class="hashtag-info">
                            <h4>#${tag.name}</h4>
                            <span>${formatNumber(tag.count)} posts</span>
                        </div>
                    </a>
                `).join('')}
            </div>
        `;
    }

    renderNoResults() {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                </svg>
                <h3>No results found</h3>
                <p>Try different keywords or check your spelling</p>
            </div>
        `;
    }

    async loadRecentSearches() {
        const saved = localStorage.getItem('recent_searches');
        if (saved) {
            try {
                this.recentSearches = JSON.parse(saved);
            } catch (e) {
                this.recentSearches = [];
            }
        }
    }

    async saveRecentSearch(query) {
        if (!query.trim()) return;

        // Remove if already exists
        this.recentSearches = this.recentSearches.filter(s => s.query !== query);
        
        // Add to beginning
        this.recentSearches.unshift({
            query,
            timestamp: Date.now()
        });

        // Keep only last 10
        if (this.recentSearches.length > 10) {
            this.recentSearches = this.recentSearches.slice(0, 10);
        }

        localStorage.setItem('recent_searches', JSON.stringify(this.recentSearches));
    }

    async clearRecentSearches() {
        this.recentSearches = [];
        localStorage.removeItem('recent_searches');
        this.refresh();
    }

    async performSearch() {
        this.loading = true;
        this.refresh();

        // Save to recent searches
        await this.saveRecentSearch(this.query);

        // Mock search results - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 500));

        const query = this.query.toLowerCase();

        // Mock users
        this.results.users = [
            {
                userId: 'user1',
                fullName: 'John Doe',
                username: 'johndoe',
                profilePicture: null,
                bio: 'Developer & Creator'
            },
            {
                userId: 'user2',
                fullName: 'Jane Smith',
                username: 'janesmith',
                profilePicture: null,
                bio: 'Designer & Artist'
            }
        ].filter(u => 
            u.fullName.toLowerCase().includes(query) || 
            u.username.toLowerCase().includes(query)
        );

        // Mock posts
        this.results.posts = [
            {
                postId: 'post1',
                content: 'Just launched my new project! #coding',
                author: {
                    fullName: 'John Doe',
                    username: 'johndoe',
                    profilePicture: null
                },
                likes: 45,
                comments: 12,
                timestamp: Date.now() - 3600000
            },
            {
                postId: 'post2',
                content: 'Beautiful sunset today #photography',
                author: {
                    fullName: 'Jane Smith',
                    username: 'janesmith',
                    profilePicture: null
                },
                likes: 89,
                comments: 23,
                timestamp: Date.now() - 7200000,
                media: {
                    type: 'image',
                    url: 'https://picsum.photos/400/300'
                }
            }
        ].filter(p => 
            p.content.toLowerCase().includes(query) || 
            p.author.fullName.toLowerCase().includes(query)
        );

        // Mock hashtags
        this.results.hashtags = [
            { name: 'coding', count: 15234 },
            { name: 'photography', count: 23456 },
            { name: 'travel', count: 34567 }
        ].filter(t => t.name.includes(query.replace('#', '')));

        this.loading = false;
        this.refresh();
    }

    async search(query) {
        this.query = query;
        this.activeTab = 'top';
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('q', query);
        window.history.pushState({}, '', url);

        await this.performSearch();
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.refresh();
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

    handleUserAction(action, user) {
        switch (action) {
            case 'add':
                syncManager.queueAction({
                    type: 'FOLLOW_USER',
                    data: { userId: user.userId }
                });
                this.showToast(`Following ${user.fullName}`);
                break;
            case 'message':
                router.navigate(`/chat/${user.userId}`);
                break;
        }
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
        const input = document.getElementById('searchInput');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = input.value.trim();
                    if (query) {
                        this.search(query);
                    }
                }
            });
        }
    }
}

// Make available globally
window.SearchPage = SearchPage;
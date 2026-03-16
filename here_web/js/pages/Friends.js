// Path: here-social/js/pages/Friends.js

/**
 * Friends Page
 */
class FriendsPage {
    constructor(context) {
        this.context = context;
        this.activeTab = 'all'; // all, pending, requests
        this.friends = [];
        this.pending = [];
        this.requests = [];
        this.searchQuery = '';
    }

    async render() {
        // Load data
        await this.loadFriends();
        
        return `
            <div class="friends-container">
                <div class="friends-header">
                    <h2>Friends</h2>
                    <button class="icon-button" onclick="document.getElementById('addFriendModal').classList.add('visible')">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                
                <div class="friends-tabs">
                    <button class="tab ${this.activeTab === 'all' ? 'active' : ''}" 
                            onclick="friendsPage.switchTab('all')">
                        All Friends
                        <span class="tab-badge">${this.friends.length}</span>
                    </button>
                    <button class="tab ${this.activeTab === 'pending' ? 'active' : ''}" 
                            onclick="friendsPage.switchTab('pending')">
                        Pending
                        ${this.pending.length > 0 ? `<span class="tab-badge">${this.pending.length}</span>` : ''}
                    </button>
                    <button class="tab ${this.activeTab === 'requests' ? 'active' : ''}" 
                            onclick="friendsPage.switchTab('requests')">
                        Requests
                        ${this.requests.length > 0 ? `<span class="tab-badge">${this.requests.length}</span>` : ''}
                    </button>
                </div>
                
                <div class="friends-search">
                    <input type="text" 
                           placeholder="Search friends..." 
                           id="friendSearch"
                           value="${this.escapeHtml(this.searchQuery)}">
                </div>
                
                <div class="friends-list">
                    ${this.renderCurrentList()}
                </div>
            </div>
            
            ${this.renderAddFriendModal()}
        `;
    }

    renderCurrentList() {
        let items = [];
        
        switch (this.activeTab) {
            case 'all':
                items = this.friends;
                break;
            case 'pending':
                items = this.pending;
                break;
            case 'requests':
                items = this.requests;
                break;
        }

        // Filter by search
        if (this.searchQuery) {
            items = items.filter(user => 
                user.fullName?.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }

        if (items.length === 0) {
            return this.renderEmptyState();
        }

        return items.map(user => {
            const status = this.getFriendStatus(user);
            const item = new FriendItem(user, status, (action, user) => 
                this.handleFriendAction(action, user)
            );
            return item.render();
        }).join('');
    }

    renderEmptyState() {
        const messages = {
            all: {
                icon: '👥',
                title: 'No friends yet',
                text: 'Start adding friends to see them here'
            },
            pending: {
                icon: '⏳',
                title: 'No pending requests',
                text: 'Friend requests you send will appear here'
            },
            requests: {
                icon: '📨',
                title: 'No friend requests',
                text: 'When someone adds you, it will show here'
            }
        };

        const msg = messages[this.activeTab];

        return `
            <div class="empty-state">
                <div class="empty-state-icon">${msg.icon}</div>
                <h3>${msg.title}</h3>
                <p>${msg.text}</p>
                ${this.activeTab === 'all' ? `
                    <button class="profile-button primary" 
                            onclick="document.getElementById('addFriendModal').classList.add('visible')">
                        Add Friends
                    </button>
                ` : ''}
            </div>
        `;
    }

    renderAddFriendModal() {
        return `
            <div class="modal-overlay" id="addFriendModal" onclick="if(event.target===this)this.classList.remove('visible')">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Add Friend</h3>
                        <button class="modal-close" onclick="document.getElementById('addFriendModal').classList.remove('visible')">
                            &times;
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <p>Enter username or email to send friend request</p>
                        <div class="form-group">
                            <input type="text" 
                                   id="friendSearchInput" 
                                   placeholder="Username or email"
                                   autocomplete="off">
                        </div>
                        
                        <div id="searchResults" class="search-results" style="display: none;">
                            <!-- Search results will appear here -->
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="profile-button secondary" 
                                onclick="document.getElementById('addFriendModal').classList.remove('visible')">
                            Cancel
                        </button>
                        <button class="profile-button primary" id="searchButton">
                            Search
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadFriends() {
        // This would load from store/API
        // For now, mock data
        this.friends = [
            {
                userId: 'user1',
                fullName: 'Alice Johnson',
                username: 'alice',
                profilePicture: null,
                status: 'online',
                lastSeen: Date.now()
            },
            {
                userId: 'user2',
                fullName: 'Bob Smith',
                username: 'bob',
                profilePicture: null,
                status: 'offline',
                lastSeen: Date.now() - 3600000
            },
            {
                userId: 'user3',
                fullName: 'Carol White',
                username: 'carol',
                profilePicture: null,
                status: 'online',
                lastSeen: Date.now()
            }
        ];

        this.pending = [
            {
                userId: 'user4',
                fullName: 'David Brown',
                username: 'david',
                profilePicture: null
            }
        ];

        this.requests = [
            {
                userId: 'user5',
                fullName: 'Eve Wilson',
                username: 'eve',
                profilePicture: null
            }
        ];
    }

    getFriendStatus(user) {
        if (this.pending.some(u => u.userId === user.userId)) {
            return 'pending';
        }
        if (this.requests.some(u => u.userId === user.userId)) {
            return 'request';
        }
        return 'accepted';
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.searchQuery = '';
        this.refresh();
    }

    async handleFriendAction(action, user) {
        switch (action) {
            case 'message':
                // Start or open chat
                const chatId = `chat_${user.userId}`;
                router.navigate(`/chat/${chatId}`);
                break;
                
            case 'remove':
                if (confirm(`Remove ${user.fullName} from friends?`)) {
                    // Remove friend
                    this.friends = this.friends.filter(f => f.userId !== user.userId);
                    this.refresh();
                    this.showToast('Friend removed');
                }
                break;
                
            case 'accept':
                // Accept friend request
                this.requests = this.requests.filter(r => r.userId !== user.userId);
                this.friends.push(user);
                this.refresh();
                this.showToast(`Friend request from ${user.fullName} accepted`);
                break;
                
            case 'decline':
                // Decline friend request
                this.requests = this.requests.filter(r => r.userId !== user.userId);
                this.refresh();
                break;
                
            case 'add':
                // Send friend request
                this.showToast(`Friend request sent to ${user.fullName}`);
                break;
        }
    }

    async searchUsers(query) {
        // This would call API
        // For now, mock search
        const mockResults = [
            {
                userId: 'new1',
                fullName: 'New User 1',
                username: 'newuser1',
                profilePicture: null
            },
            {
                userId: 'new2',
                fullName: 'New User 2',
                username: 'newuser2',
                profilePicture: null
            }
        ];

        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.style.display = 'block';
        
        resultsDiv.innerHTML = mockResults.map(user => {
            const item = new FriendItem(user, 'request', (action, user) => {
                this.handleFriendAction(action, user);
                document.getElementById('addFriendModal').classList.remove('visible');
            });
            return item.render();
        }).join('');
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
        // Setup search
        const searchInput = document.getElementById('friendSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.searchQuery = e.target.value;
                this.refresh();
            }, 300));
        }

        // Setup modal search
        const searchButton = document.getElementById('searchButton');
        const modalSearch = document.getElementById('friendSearchInput');

        if (searchButton && modalSearch) {
            searchButton.addEventListener('click', () => {
                const query = modalSearch.value.trim();
                if (query) {
                    this.searchUsers(query);
                }
            });

            modalSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = modalSearch.value.trim();
                    if (query) {
                        this.searchUsers(query);
                    }
                }
            });
        }
    }
}

// Make available globally
window.FriendsPage = FriendsPage;
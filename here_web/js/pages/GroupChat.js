// Path: here-social/js/pages/GroupChat.js

/**
 * Group Chat Creation and Management
 */
class GroupChatPage {
    constructor(context) {
        this.context = context;
        this.mode = context.params.mode || 'create'; // create, edit, details
        this.chatId = context.params.id;
        this.groupData = {
            name: '',
            description: '',
            avatar: null,
            members: [],
            privacy: 'public' // public, private
        };
        this.selectedFriends = [];
        this.searchQuery = '';
        this.friends = [];
        this.searchResults = [];
    }

    async render() {
        await this.loadFriends();

        if (this.mode === 'details' && this.chatId) {
            await this.loadGroupDetails();
        }

        return `
            <div class="group-chat-page">
                <div class="group-chat-header">
                    <button class="icon-button" onclick="router.back()">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                        </svg>
                    </button>
                    <h2>${this.getTitle()}</h2>
                    ${this.mode === 'create' ? `
                        <button class="create-button ${this.canCreate() ? 'active' : ''}"
                                onclick="groupChatPage.createGroup()"
                                ${!this.canCreate() ? 'disabled' : ''}>
                            Create
                        </button>
                    ` : ''}
                </div>

                <div class="group-chat-content">
                    <!-- Group Avatar -->
                    <div class="group-avatar-section">
                        <div class="group-avatar" onclick="groupChatPage.changeAvatar()">
                            ${this.renderAvatar()}
                            <div class="avatar-overlay">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path d="M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.1c-.1.1-.15.22-.15.36zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <!-- Group Details -->
                    <div class="group-details-form">
                        <div class="form-group">
                            <label>Group Name *</label>
                            <input type="text" 
                                   value="${this.escapeHtml(this.groupData.name)}"
                                   oninput="groupChatPage.updateField('name', this.value)"
                                   placeholder="e.g., Trip Planning, Book Club">
                        </div>

                        <div class="form-group">
                            <label>Description</label>
                            <textarea 
                                oninput="groupChatPage.updateField('description', this.value)"
                                placeholder="What's this group about?"
                                rows="3">${this.escapeHtml(this.groupData.description || '')}</textarea>
                        </div>

                        <div class="form-group">
                            <label>Privacy</label>
                            <select onchange="groupChatPage.updateField('privacy', this.value)">
                                <option value="public" ${this.groupData.privacy === 'public' ? 'selected' : ''}>🌍 Public - Anyone can join</option>
                                <option value="private" ${this.groupData.privacy === 'private' ? 'selected' : ''}>🔒 Private - By invitation only</option>
                            </select>
                        </div>
                    </div>

                    <!-- Add Members -->
                    <div class="members-section">
                        <h3>Add Members</h3>
                        
                        <div class="selected-members">
                            ${this.renderSelectedMembers()}
                        </div>

                        <div class="member-search">
                            <input type="text" 
                                   placeholder="Search friends..."
                                   oninput="groupChatPage.searchFriends(this.value)"
                                   id="memberSearch">
                        </div>

                        <div class="search-results">
                            ${this.renderSearchResults()}
                        </div>
                    </div>

                    ${this.mode === 'details' ? this.renderMemberList() : ''}
                </div>
            </div>
        `;
    }

    renderAvatar() {
        if (this.groupData.avatarPreview) {
            return `<img src="${this.groupData.avatarPreview}" alt="Group" class="avatar-img">`;
        } else {
            const initials = this.groupData.name ? 
                this.groupData.name.split(' ').map(w => w[0]).join('').toUpperCase().substr(0, 2) : 
                'G';
            return `<div class="avatar-placeholder large">${initials}</div>`;
        }
    }

    renderSelectedMembers() {
        if (this.selectedFriends.length === 0) {
            return '<p class="text-muted">No members selected yet</p>';
        }

        return this.selectedFriends.map(user => `
            <div class="selected-member">
                <div class="selected-member-info">
                    ${this.renderMemberAvatar(user)}
                    <span>${this.escapeHtml(user.fullName)}</span>
                </div>
                <button class="remove-member" onclick="groupChatPage.removeMember('${user.userId}')">×</button>
            </div>
        `).join('');
    }

    renderMemberAvatar(user) {
        if (user.profilePicture && user.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${user.profilePicture}" alt="${user.fullName}" class="member-avatar">`;
        } else {
            const initials = getInitials(user.fullName || '?');
            return `<div class="avatar-placeholder tiny">${initials}</div>`;
        }
    }

    renderSearchResults() {
        if (this.searchQuery && this.searchResults.length === 0) {
            return '<p class="text-muted">No users found</p>';
        }

        if (this.searchResults.length === 0) {
            return '';
        }

        return this.searchResults
            .filter(user => !this.selectedFriends.some(f => f.userId === user.userId))
            .map(user => `
                <div class="search-result" onclick="groupChatPage.addMember('${user.userId}')">
                    ${this.renderMemberAvatar(user)}
                    <div class="search-result-info">
                        <strong>${this.escapeHtml(user.fullName)}</strong>
                        <span>@${this.escapeHtml(user.username)}</span>
                    </div>
                </div>
            `).join('');
    }

    renderMemberList() {
        return `
            <div class="member-list-section">
                <h3>Group Members (${this.groupData.members.length})</h3>
                <div class="member-list">
                    ${this.groupData.members.map(user => `
                        <div class="member-item">
                            ${this.renderMemberAvatar(user)}
                            <div class="member-info">
                                <strong>${this.escapeHtml(user.fullName)}</strong>
                                <span>${user.role || 'member'}</span>
                            </div>
                            ${user.userId === authStore.getState()?.user?.userId ? '' : `
                                <button class="member-action" onclick="groupChatPage.removeFromGroup('${user.userId}')">
                                    <svg width="20" height="20" viewBox="0 0 24 24">
                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                                    </svg>
                                </button>
                            `}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getTitle() {
        switch (this.mode) {
            case 'create': return 'Create Group';
            case 'edit': return 'Edit Group';
            case 'details': return 'Group Info';
            default: return 'Group Chat';
        }
    }

    async loadFriends() {
        // Mock friends - replace with actual data
        this.friends = [
            {
                userId: 'user1',
                fullName: 'Alice Johnson',
                username: 'alice',
                profilePicture: null
            },
            {
                userId: 'user2',
                fullName: 'Bob Smith',
                username: 'bob',
                profilePicture: null
            },
            {
                userId: 'user3',
                fullName: 'Carol White',
                username: 'carol',
                profilePicture: null
            },
            {
                userId: 'user4',
                fullName: 'David Brown',
                username: 'david',
                profilePicture: null
            }
        ];
    }

    async loadGroupDetails() {
        // Mock group details - replace with actual data
        this.groupData = {
            name: 'Weekend Trip Planning',
            description: 'Planning our trip to the mountains!',
            avatar: null,
            privacy: 'private',
            members: this.friends.slice(0, 3)
        };
    }

    updateField(field, value) {
        this.groupData[field] = value;
        this.updateCreateButton();
    }

    changeAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const processed = await mediaManager.processImage(file, {
                    maxWidth: 200,
                    maxHeight: 200,
                    quality: 0.8
                });
                this.groupData.avatarPreview = URL.createObjectURL(processed);
                this.groupData.avatarFile = processed;
                this.refresh();
            }
        };
        input.click();
    }

    searchFriends(query) {
        this.searchQuery = query;
        
        if (!query) {
            this.searchResults = [];
            this.refresh();
            return;
        }

        this.searchResults = this.friends.filter(user =>
            user.fullName.toLowerCase().includes(query.toLowerCase()) ||
            user.username.toLowerCase().includes(query.toLowerCase())
        );
        this.refresh();
    }

    addMember(userId) {
        const user = this.friends.find(f => f.userId === userId);
        if (user && !this.selectedFriends.some(f => f.userId === userId)) {
            this.selectedFriends.push(user);
            this.refresh();
        }
    }

    removeMember(userId) {
        this.selectedFriends = this.selectedFriends.filter(f => f.userId !== userId);
        this.refresh();
    }

    canCreate() {
        return this.groupData.name.trim().length >= 3 && this.selectedFriends.length >= 1;
    }

    updateCreateButton() {
        const btn = document.querySelector('.create-button');
        if (btn) {
            if (this.canCreate()) {
                btn.disabled = false;
                btn.classList.add('active');
            } else {
                btn.disabled = true;
                btn.classList.remove('active');
            }
        }
    }

    async createGroup() {
        const groupData = {
            ...this.groupData,
            members: [authStore.getState()?.user, ...this.selectedFriends],
            createdBy: authStore.getState()?.user?.userId,
            createdAt: Date.now()
        };

        // Create group chat
        const chatId = 'group_' + Date.now();
        
        // Add to chat store
        chatStore.dispatch(chatActions.addChat({
            chatId,
            ...groupData,
            type: 'group',
            lastMessage: {
                content: 'Group created',
                timestamp: Date.now()
            }
        }));

        // Navigate to chat
        router.navigate(`/chat/${chatId}`);

        this.showToast('Group created successfully');
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
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

    refresh() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = this.render();
            this.mounted();
        }
    }

    mounted() {
        // Focus search if in create mode
        if (this.mode === 'create') {
            document.getElementById('memberSearch')?.focus();
        }
    }
}

// Make available globally
window.GroupChatPage = GroupChatPage;

// Add CSS
const groupChatStyles = document.createElement('style');
groupChatStyles.textContent = `
    .group-chat-page {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .group-chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }

    .create-button {
        padding: 8px 16px;
        border: none;
        border-radius: 20px;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        font-weight: 600;
        cursor: not-allowed;
        transition: all var(--transition-fast);
    }

    .create-button.active {
        background: var(--accent);
        color: white;
        cursor: pointer;
    }

    .group-chat-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
    }

    .group-avatar-section {
        display: flex;
        justify-content: center;
        margin-bottom: 24px;
    }

    .group-avatar {
        position: relative;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        cursor: pointer;
        overflow: hidden;
        background: var(--bg-tertiary);
    }

    .avatar-placeholder.large {
        width: 100px;
        height: 100px;
        font-size: 36px;
    }

    .avatar-placeholder.tiny {
        width: 30px;
        height: 30px;
        font-size: 12px;
    }

    .group-details-form {
        background: var(--bg-secondary);
        border-radius: var(--border-radius);
        padding: 16px;
        margin-bottom: 20px;
    }

    .members-section {
        background: var(--bg-secondary);
        border-radius: var(--border-radius);
        padding: 16px;
    }

    .selected-members {
        margin: 16px 0;
        padding: 12px;
        background: var(--bg-primary);
        border-radius: var(--border-radius-sm);
        min-height: 60px;
    }

    .selected-member {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--bg-tertiary);
        padding: 4px 8px;
        border-radius: 20px;
        margin: 4px;
    }

    .selected-member-info {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .member-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
    }

    .remove-member {
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
    }

    .remove-member:hover {
        background: var(--danger);
        color: white;
    }

    .member-search {
        margin: 16px 0;
    }

    .member-search input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 24px;
        background: var(--bg-primary);
        color: var(--text-primary);
    }

    .search-results {
        max-height: 200px;
        overflow-y: auto;
    }

    .search-result {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border-radius: var(--border-radius-sm);
        cursor: pointer;
        transition: background var(--transition-fast);
    }

    .search-result:hover {
        background: var(--bg-tertiary);
    }

    .search-result-info {
        display: flex;
        flex-direction: column;
    }

    .search-result-info span {
        font-size: 12px;
        color: var(--text-secondary);
    }

    .member-list-section {
        margin-top: 20px;
        padding: 16px;
        background: var(--bg-secondary);
        border-radius: var(--border-radius);
    }

    .member-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border-bottom: 1px solid var(--border-color);
    }

    .member-item:last-child {
        border-bottom: none;
    }

    .member-info {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .member-info span {
        font-size: 12px;
        color: var(--text-secondary);
    }

    .member-action {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .member-action:hover {
        background: var(--danger);
        color: white;
    }
`;
document.head.appendChild(groupChatStyles);
// Path: here-social/js/pages/PostDetail.js

/**
 * Post Detail Page with Comments
 */
class PostDetailPage {
    constructor(context) {
        this.context = context;
        this.postId = context.params.id;
        this.post = null;
        this.comments = [];
        this.newComment = '';
        this.replyTo = null;
        this.page = 1;
        this.hasMore = true;
        this.loading = false;
    }

    async render() {
        await this.loadPost();
        await this.loadComments();

        if (!this.post) {
            return this.renderNotFound();
        }

        return `
            <div class="post-detail">
                <div class="post-detail-header">
                    <button class="icon-button" onclick="router.back()">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                        </svg>
                    </button>
                    <h2>Post</h2>
                </div>

                <div class="post-detail-content">
                    ${this.renderPost()}
                </div>

                <div class="comments-section">
                    <div class="comments-header">
                        <h3>Comments (${this.comments.length})</h3>
                    </div>

                    <div class="comments-list" id="commentsList">
                        ${this.renderComments()}
                        ${this.loading ? '<div class="loading-spinner"><div class="spinner"></div></div>' : ''}
                    </div>

                    ${this.renderCommentInput()}
                </div>
            </div>
        `;
    }

    renderPost() {
        const postCard = new PostCard(
            this.post,
            (postId, liked) => this.handleLike(postId, liked),
            (postId) => this.handleComment(postId),
            (post) => this.handleShare(post)
        );
        return postCard.render();
    }

    renderComments() {
        if (this.comments.length === 0) {
            return `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="currentColor"/>
                    </svg>
                    <h3>No comments yet</h3>
                    <p>Be the first to comment!</p>
                </div>
            `;
        }

        return this.comments.map(comment => this.renderComment(comment)).join('');
    }

    renderComment(comment, isReply = false) {
        const time = formatDate(comment.timestamp);
        const user = comment.user || {};
        
        return `
            <div class="comment ${isReply ? 'reply' : ''}" data-comment-id="${comment.id}">
                <div class="comment-avatar">
                    ${this.renderAvatar(user)}
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <strong>${this.escapeHtml(user.fullName || 'User')}</strong>
                        <span class="comment-time">${time}</span>
                    </div>
                    <div class="comment-text">${this.escapeHtml(comment.content)}</div>
                    <div class="comment-actions">
                        <button class="comment-action" onclick="postDetailPage.likeComment('${comment.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
                            </svg>
                            <span>${comment.likes || 0}</span>
                        </button>
                        <button class="comment-action" onclick="postDetailPage.replyToComment('${comment.id}', '${user.fullName}')">
                            Reply
                        </button>
                    </div>
                    
                    ${comment.replies && comment.replies.length > 0 ? `
                        <div class="comment-replies">
                            ${comment.replies.map(reply => this.renderComment(reply, true)).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderAvatar(user) {
        if (user.profilePicture && user.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${user.profilePicture}" alt="${user.fullName}" class="comment-avatar-img">`;
        } else {
            const initials = getInitials(user.fullName || '?');
            return `<div class="avatar-placeholder small">${initials}</div>`;
        }
    }

    renderCommentInput() {
        return `
            <div class="comment-input-container">
                ${this.renderCurrentUserAvatar()}
                <div class="comment-input-wrapper">
                    ${this.replyTo ? `
                        <div class="reply-indicator">
                            Replying to <strong>${this.escapeHtml(this.replyTo.name)}</strong>
                            <button class="cancel-reply" onclick="postDetailPage.cancelReply()">×</button>
                        </div>
                    ` : ''}
                    <input type="text" 
                           placeholder="${this.replyTo ? 'Write a reply...' : 'Write a comment...'}" 
                           id="commentInput"
                           value="${this.escapeHtml(this.newComment)}"
                           onkeypress="if(event.key==='Enter') postDetailPage.submitComment()">
                    <button class="comment-send" onclick="postDetailPage.submitComment()">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    renderCurrentUserAvatar() {
        const user = authStore.getState()?.user;
        
        if (user?.profilePicture && user.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${user.profilePicture}" alt="${user.fullName}" class="comment-avatar">`;
        } else {
            const initials = getInitials(user?.fullName || '?');
            return `<div class="avatar-placeholder small">${initials}</div>`;
        }
    }

    renderNotFound() {
        return `
            <div class="error-state">
                <svg viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                </svg>
                <h3>Post not found</h3>
                <p>The post you're looking for doesn't exist or has been deleted</p>
                <button class="profile-button primary" onclick="router.navigate('/')">
                    Go Home
                </button>
            </div>
        `;
    }

    async loadPost() {
        // Try to get from store first
        const feedState = feedStore.getState();
        this.post = feedState.posts?.find(p => p.postId === this.postId);

        if (!this.post) {
            // Try to get from IndexedDB
            this.post = await db.get('posts', this.postId);
        }

        if (!this.post) {
            // Fetch from API if online
            if (navigator.onLine) {
                try {
                    const response = await api.get(`/posts/${this.postId}`);
                    this.post = response.post;
                } catch (error) {
                    console.error('Failed to load post:', error);
                }
            }
        }
    }

    async loadComments() {
        // Mock comments - replace with actual API/db
        this.comments = [
            {
                id: 'c1',
                user: {
                    fullName: 'Alice Johnson',
                    profilePicture: null
                },
                content: 'Great post! Thanks for sharing 🌟',
                timestamp: Date.now() - 3600000,
                likes: 5,
                replies: [
                    {
                        id: 'r1',
                        user: {
                            fullName: 'John Doe',
                            profilePicture: null
                        },
                        content: 'I agree! Very insightful',
                        timestamp: Date.now() - 1800000,
                        likes: 2
                    }
                ]
            },
            {
                id: 'c2',
                user: {
                    fullName: 'Bob Smith',
                    profilePicture: null
                },
                content: 'This is really helpful. Thanks!',
                timestamp: Date.now() - 7200000,
                likes: 3,
                replies: []
            }
        ];
    }

    handleLike(postId, liked) {
        feedStore.asyncActions.toggleLike(postId, liked);
    }

    handleComment(postId) {
        // Already on post detail page
    }

    handleShare(post) {
        if (navigator.share) {
            navigator.share({
                title: 'Check out this post',
                text: post.content,
                url: window.location.href
            });
        } else {
            copyToClipboard(window.location.href);
            this.showToast('Link copied to clipboard');
        }
    }

    likeComment(commentId) {
        // Implement comment liking
        console.log('Like comment:', commentId);
    }

    replyToComment(commentId, userName) {
        this.replyTo = {
            id: commentId,
            name: userName
        };
        this.refresh();
        
        // Focus input
        setTimeout(() => {
            document.getElementById('commentInput')?.focus();
        }, 100);
    }

    cancelReply() {
        this.replyTo = null;
        this.refresh();
    }

    async submitComment() {
        const input = document.getElementById('commentInput');
        const content = input.value.trim();

        if (!content) return;

        const newComment = {
            id: 'c' + Date.now(),
            user: authStore.getState()?.user,
            content,
            timestamp: Date.now(),
            likes: 0,
            replies: []
        };

        if (this.replyTo) {
            // Find parent comment and add reply
            const parentComment = this.comments.find(c => c.id === this.replyTo.id);
            if (parentComment) {
                parentComment.replies = parentComment.replies || [];
                parentComment.replies.push({
                    ...newComment,
                    id: 'r' + Date.now()
                });
            }
            this.cancelReply();
        } else {
            this.comments.unshift(newComment);
        }

        input.value = '';
        this.refresh();

        // Queue for sync
        await syncManager.queueAction({
            type: 'ADD_COMMENT',
            data: {
                postId: this.postId,
                comment: newComment,
                replyTo: this.replyTo?.id
            }
        });

        // Scroll to new comment
        setTimeout(() => {
            const commentsList = document.getElementById('commentsList');
            if (commentsList) {
                commentsList.scrollTop = 0;
            }
        }, 100);
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

    refresh() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = this.render();
            this.mounted();
        }
    }

    mounted() {
        // Setup infinite scroll for comments
        this.setupInfiniteScroll();
    }

    setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMore && !this.loading) {
                    this.loadMoreComments();
                }
            });
        }, { threshold: 0.5 });

        const sentinel = document.createElement('div');
        sentinel.id = 'commentsSentinel';
        document.querySelector('.comments-list')?.appendChild(sentinel);
        observer.observe(sentinel);
    }

    async loadMoreComments() {
        this.loading = true;
        this.page++;
        // Load more comments from API
        this.loading = false;
    }
}

// Make available globally
window.PostDetailPage = PostDetailPage;

// Add CSS
const postDetailStyles = document.createElement('style');
postDetailStyles.textContent = `
    .post-detail {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .post-detail-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }

    .comments-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--bg-primary);
    }

    .comments-header {
        padding: 16px;
        border-bottom: 1px solid var(--border-color);
    }

    .comments-list {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
    }

    .comment {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
    }

    .comment.reply {
        margin-left: 48px;
        margin-top: 8px;
        margin-bottom: 8px;
    }

    .comment-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

    .avatar-placeholder.small {
        width: 36px;
        height: 36px;
        font-size: 14px;
    }

    .comment-content {
        flex: 1;
    }

    .comment-header {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 4px;
    }

    .comment-time {
        font-size: 12px;
        color: var(--text-muted);
    }

    .comment-text {
        margin-bottom: 8px;
        line-height: 1.4;
    }

    .comment-actions {
        display: flex;
        gap: 16px;
    }

    .comment-action {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-size: 13px;
        cursor: pointer;
        border-radius: 4px;
    }

    .comment-action:hover {
        background: var(--bg-tertiary);
    }

    .comment-replies {
        margin-top: 12px;
    }

    .comment-input-container {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: var(--bg-primary);
        border-top: 1px solid var(--border-color);
    }

    .comment-input-wrapper {
        flex: 1;
        position: relative;
    }

    .reply-indicator {
        position: absolute;
        top: -24px;
        left: 0;
        right: 0;
        padding: 4px 12px;
        background: var(--bg-tertiary);
        border-radius: 16px 16px 0 0;
        font-size: 13px;
        color: var(--text-secondary);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .cancel-reply {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
    }

    .comment-input-wrapper input {
        width: 100%;
        padding: 10px 40px 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 24px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 14px;
    }

    .comment-input-wrapper input:focus {
        outline: none;
        border-color: var(--accent);
    }

    .comment-send {
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 50%;
        background: var(--accent);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .comment-send:hover {
        background: var(--accent-dark);
    }

    .comment-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
document.head.appendChild(postDetailStyles);
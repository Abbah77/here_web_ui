// Path: here-social/js/components/PostCard.js

/**
 * Post Card Component
 */
class PostCard {
    constructor(post, onLike, onComment, onShare) {
        this.post = post;
        this.onLike = onLike;
        this.onComment = onComment;
        this.onShare = onShare;
    }

    // Render component
    render() {
        const isLiked = this.post.likedByUser || false;
        const likeCount = this.post.likes || 0;
        const commentCount = this.post.comments?.length || 0;
        
        return `
            <div class="post-card" data-post-id="${this.post.postId}">
                <div class="post-header">
                    <div class="user-avatar">
                        ${this.renderAvatar()}
                    </div>
                    <div class="post-author">
                        <h4>${this.escapeHtml(this.post.author?.fullName || 'Unknown')}</h4>
                        <span class="post-time">${formatDate(this.post.timestamp)}</span>
                    </div>
                </div>
                
                <div class="post-content">
                    ${this.escapeHtml(this.post.content || '')}
                </div>
                
                ${this.post.media ? this.renderMedia() : ''}
                
                <div class="post-actions">
                    <button class="post-action ${isLiked ? 'active' : ''}" data-action="like">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
                        </svg>
                        <span>${formatNumber(likeCount)}</span>
                    </button>
                    
                    <button class="post-action" data-action="comment">
                        <svg viewBox="0 0 24 24">
                            <path d="M21 6h-2v2h-2V6h-2V4h2V2h2v2h2v2zm-10 3c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 4c-2.33 0-7 1.17-7 3.5V17h14v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
                        </svg>
                        <span>${formatNumber(commentCount)}</span>
                    </button>
                    
                    <button class="post-action" data-action="share">
                        <svg viewBox="0 0 24 24">
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    // Render avatar
    renderAvatar() {
        if (this.post.author?.profilePicture && this.post.author.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${this.post.author.profilePicture}" alt="${this.escapeHtml(this.post.author.fullName)}" class="user-avatar">`;
        } else {
            const initials = getInitials(this.post.author?.fullName || '?');
            return `<div class="avatar-placeholder">${initials}</div>`;
        }
    }

    // Render media
    renderMedia() {
        if (this.post.media.type.startsWith('image/')) {
            return `
                <div class="post-media">
                    <img src="${this.post.media.url}" alt="Post image" loading="lazy">
                </div>
            `;
        } else if (this.post.media.type.startsWith('video/')) {
            return `
                <div class="post-media">
                    <video controls preload="metadata">
                        <source src="${this.post.media.url}" type="${this.post.media.type}">
                    </video>
                </div>
            `;
        }
        return '';
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Attach event listeners
    attachEvents(element) {
        element.querySelector('[data-action="like"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onLike) {
                this.onLike(this.post.postId, this.post.likedByUser);
            }
        });

        element.querySelector('[data-action="comment"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onComment) {
                this.onComment(this.post.postId);
            }
        });

        element.querySelector('[data-action="share"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onShare) {
                this.onShare(this.post);
            }
        });
    }
}

// Make available globally
window.PostCard = PostCard;
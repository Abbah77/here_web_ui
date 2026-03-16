// Path: here-social/js/pages/CreatePost.js

/**
 * Create Post Modal/Page
 */
class CreatePostPage {
    constructor(context) {
        this.context = context;
        this.postData = {
            content: '',
            media: null,
            type: 'text',
            privacy: 'public'
        };
        this.mediaPreview = null;
        this.isUploading = false;
    }

    render() {
        return `
            <div class="create-post-page">
                <div class="create-post-header">
                    <button class="icon-button" onclick="router.back()">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                        </svg>
                    </button>
                    <h2>Create Post</h2>
                    <button class="post-submit ${this.postData.content ? 'active' : ''}" 
                            onclick="createPostPage.submitPost()"
                            ${!this.postData.content ? 'disabled' : ''}>
                        Post
                    </button>
                </div>

                <div class="create-post-body">
                    <div class="post-author-info">
                        ${this.renderUserAvatar()}
                        <div class="post-author-details">
                            <strong>${this.escapeHtml(authStore.getState()?.user?.fullName || 'User')}</strong>
                            <select class="privacy-selector" onchange="createPostPage.changePrivacy(this.value)">
                                <option value="public" ${this.postData.privacy === 'public' ? 'selected' : ''}>🌍 Public</option>
                                <option value="friends" ${this.postData.privacy === 'friends' ? 'selected' : ''}>👥 Friends</option>
                                <option value="private" ${this.postData.privacy === 'private' ? 'selected' : ''}>🔒 Only me</option>
                            </select>
                        </div>
                    </div>

                    <textarea 
                        class="post-content-input" 
                        placeholder="What's on your mind, ${authStore.getState()?.user?.fullName?.split(' ')[0] || 'User'}?"
                        oninput="createPostPage.updateContent(this.value)"
                        id="postContent"
                    >${this.escapeHtml(this.postData.content)}</textarea>

                    ${this.renderMediaPreview()}

                    <div class="post-attachments">
                        <button class="attachment-btn" onclick="createPostPage.addMedia()">
                            <svg width="24" height="24" viewBox="0 0 24 24">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4-3h2v13h-2z" fill="currentColor"/>
                            </svg>
                            <span>Photo</span>
                        </button>
                        <button class="attachment-btn" onclick="createPostPage.addVideo()">
                            <svg width="24" height="24" viewBox="0 0 24 24">
                                <path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V7c0-.55-.45-1-1-1zm4 4v6h-2v-6h2zm0-4v2h-2V6h2z" fill="currentColor"/>
                            </svg>
                            <span>Video</span>
                        </button>
                        <button class="attachment-btn" onclick="createPostPage.addFeeling()">
                            <svg width="24" height="24" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c-.83 0-1.5-.67-1.5-1.5S7.67 8 8.5 8s1.5.67 1.5 1.5S9.33 11 8.5 11zm7 0c-.83 0-1.5-.67-1.5-1.5S14.67 8 15.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-3.5 5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" fill="currentColor"/>
                            </svg>
                            <span>Feeling</span>
                        </button>
                    </div>
                </div>

                ${this.isUploading ? `
                    <div class="upload-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${this.uploadProgress || 0}%"></div>
                        </div>
                        <span>Uploading...</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderUserAvatar() {
        const user = authStore.getState()?.user;
        
        if (user?.profilePicture && user.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${user.profilePicture}" alt="${user.fullName}" class="post-avatar">`;
        } else {
            const initials = getInitials(user?.fullName || '?');
            return `<div class="avatar-placeholder">${initials}</div>`;
        }
    }

    renderMediaPreview() {
        if (!this.mediaPreview) return '';

        return `
            <div class="media-preview">
                ${this.mediaPreview.type === 'image' ? `
                    <img src="${this.mediaPreview.url}" alt="Preview" class="preview-image">
                ` : `
                    <video src="${this.mediaPreview.url}" controls class="preview-video"></video>
                `}
                <button class="remove-media" onclick="createPostPage.removeMedia()">×</button>
            </div>
        `;
    }

    updateContent(content) {
        this.postData.content = content;
        this.updateSubmitButton();
    }

    changePrivacy(privacy) {
        this.postData.privacy = privacy;
    }

    async addMedia() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.processMedia(file, 'image');
            }
        };
        input.click();
    }

    async addVideo() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.processMedia(file, 'video');
            }
        };
        input.click();
    }

    addFeeling() {
        // Show feeling/activity selector
        const feelings = ['😊 Happy', '😢 Sad', '🔥 Excited', '💪 Working out', '📚 Reading', '🎵 Listening to music'];
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>How are you feeling?</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${feelings.map(feeling => `
                        <button class="feeling-option" onclick="createPostPage.setFeeling('${feeling}'); this.closest('.modal-overlay').remove()">
                            ${feeling}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    setFeeling(feeling) {
        const input = document.getElementById('postContent');
        input.value += ` is feeling ${feeling}`;
        this.postData.content = input.value;
    }

    async processMedia(file, type) {
        this.isUploading = true;
        this.uploadProgress = 0;
        this.refresh();

        try {
            // Validate file
            const validation = await mediaManager.validateMedia(file, type);
            if (!validation.valid) {
                alert(validation.error);
                return;
            }

            // Compress if needed
            const processed = await mediaManager.processMedia(file, {
                type,
                quality: 0.8
            });

            // Create preview URL
            const url = URL.createObjectURL(processed);
            this.mediaPreview = {
                type,
                url,
                file: processed
            };
            this.postData.media = processed;
            this.postData.type = type;

        } catch (error) {
            console.error('Media processing failed:', error);
            alert('Failed to process media. Please try again.');
        } finally {
            this.isUploading = false;
            this.refresh();
        }
    }

    removeMedia() {
        if (this.mediaPreview?.url) {
            URL.revokeObjectURL(this.mediaPreview.url);
        }
        this.mediaPreview = null;
        this.postData.media = null;
        this.postData.type = 'text';
        this.refresh();
    }

    async submitPost() {
        if (!this.postData.content && !this.postData.media) {
            alert('Please add some content to your post');
            return;
        }

        const submitBtn = document.querySelector('.post-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            const postData = {
                content: this.postData.content,
                privacy: this.postData.privacy,
                timestamp: Date.now()
            };

            if (this.postData.media) {
                // Upload media first
                const mediaUrl = await this.uploadMedia(this.postData.media);
                postData.media = {
                    type: this.postData.type,
                    url: mediaUrl
                };
            }

            // Create post
            const postId = await feedStore.asyncActions.createPost(postData);

            // Show success
            this.showToast('Post created successfully!');

            // Navigate back
            setTimeout(() => {
                router.navigate('/');
            }, 500);

        } catch (error) {
            console.error('Failed to create post:', error);
            alert('Failed to create post. It will be saved for offline posting.');
            
            // Queue for offline
            await syncManager.queueAction({
                type: 'CREATE_POST',
                data: {
                    content: this.postData.content,
                    privacy: this.postData.privacy,
                    media: this.postData.media ? {
                        type: this.postData.type,
                        file: this.postData.media
                    } : null
                }
            });

            router.navigate('/');
        }
    }

    async uploadMedia(file) {
        // Mock upload - replace with actual API
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                this.uploadProgress = Math.min(100, (this.uploadProgress || 0) + 10);
                this.updateProgressBar();
                
                if (this.uploadProgress >= 100) {
                    clearInterval(interval);
                    resolve('https://example.com/uploaded-media.jpg');
                }
            }, 200);
        });
    }

    updateProgressBar() {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${this.uploadProgress}%`;
        }
    }

    updateSubmitButton() {
        const btn = document.querySelector('.post-submit');
        if (btn) {
            if (this.postData.content || this.postData.media) {
                btn.disabled = false;
                btn.classList.add('active');
            } else {
                btn.disabled = true;
                btn.classList.remove('active');
            }
        }
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
        // Focus on textarea
        const textarea = document.getElementById('postContent');
        if (textarea) {
            textarea.focus();
        }
    }
}

// Make available globally
window.CreatePostPage = CreatePostPage;

// Add CSS
const createPostStyles = document.createElement('style');
createPostStyles.textContent = `
    .create-post-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-primary);
    }

    .create-post-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }

    .post-submit {
        padding: 8px 16px;
        border: none;
        border-radius: 20px;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        font-weight: 600;
        cursor: not-allowed;
        transition: all var(--transition-fast);
    }

    .post-submit.active {
        background: var(--accent);
        color: white;
        cursor: pointer;
    }

    .post-submit.active:hover {
        background: var(--accent-dark);
    }

    .create-post-body {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
    }

    .post-author-info {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
    }

    .post-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
    }

    .post-author-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .privacy-selector {
        padding: 4px 8px;
        border: 1px solid var(--border-color);
        border-radius: 16px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 13px;
        cursor: pointer;
    }

    .post-content-input {
        width: 100%;
        min-height: 150px;
        padding: 12px;
        border: none;
        background: transparent;
        color: var(--text-primary);
        font-size: 18px;
        line-height: 1.5;
        resize: none;
    }

    .post-content-input:focus {
        outline: none;
    }

    .post-content-input::placeholder {
        color: var(--text-muted);
    }

    .post-attachments {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--border-color);
    }

    .attachment-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        border: none;
        border-radius: var(--border-radius);
        background: var(--bg-secondary);
        color: var(--text-primary);
        cursor: pointer;
        transition: background var(--transition-fast);
    }

    .attachment-btn:hover {
        background: var(--bg-tertiary);
    }

    .media-preview {
        position: relative;
        margin: 16px 0;
        border-radius: var(--border-radius);
        overflow: hidden;
    }

    .preview-image, .preview-video {
        width: 100%;
        max-height: 300px;
        object-fit: contain;
        background: var(--bg-secondary);
    }

    .remove-media {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .remove-media:hover {
        background: rgba(0, 0, 0, 0.8);
    }

    .upload-progress {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 16px;
        background: var(--bg-primary);
        border-top: 1px solid var(--border-color);
        z-index: 100;
    }

    .progress-bar {
        height: 4px;
        background: var(--bg-tertiary);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 8px;
    }

    .progress-fill {
        height: 100%;
        background: var(--accent);
        transition: width 0.2s ease;
    }

    .feeling-option {
        width: 100%;
        padding: 12px;
        border: none;
        background: transparent;
        color: var(--text-primary);
        text-align: left;
        cursor: pointer;
        border-radius: var(--border-radius);
    }

    .feeling-option:hover {
        background: var(--bg-tertiary);
    }
`;
document.head.appendChild(createPostStyles);
// Path: here-social/js/pages/ProfileEdit.js

/**
 * Profile Edit Page
 */
class ProfileEditPage {
    constructor(context) {
        this.context = context;
        this.user = authStore.getState()?.user || {};
        this.formData = {
            fullName: this.user.fullName || '',
            username: this.user.username || '',
            bio: this.user.bio || '',
            email: this.user.email || '',
            phone: this.user.phone || '',
            website: this.user.website || '',
            location: this.user.location || '',
            birthday: this.user.birthday || '',
            profilePicture: this.user.profilePicture || null
        };
        this.avatarFile = null;
        this.avatarPreview = null;
        this.isSaving = false;
        this.errors = {};
    }

    render() {
        return `
            <div class="profile-edit-page">
                <div class="profile-edit-header">
                    <button class="icon-button" onclick="router.back()">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                        </svg>
                    </button>
                    <h2>Edit Profile</h2>
                    <button class="save-button ${this.isValid() ? 'active' : ''}" 
                            onclick="profileEditPage.saveProfile()"
                            ${!this.isValid() ? 'disabled' : ''}>
                        ${this.isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                <div class="profile-edit-content">
                    <!-- Avatar Section -->
                    <div class="avatar-edit-section">
                        <div class="avatar-preview" onclick="profileEditPage.changeAvatar()">
                            ${this.renderAvatar()}
                            <div class="avatar-overlay">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path d="M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.1c-.1.1-.15.22-.15.36zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                                </svg>
                                <span>Change Photo</span>
                            </div>
                        </div>
                    </div>

                    <!-- Form Fields -->
                    <div class="form-section">
                        <h3>Basic Information</h3>
                        
                        <div class="form-group">
                            <label>Full Name *</label>
                            <input type="text" 
                                   value="${this.escapeHtml(this.formData.fullName)}"
                                   oninput="profileEditPage.updateField('fullName', this.value)"
                                   placeholder="Your full name"
                                   class="${this.errors.fullName ? 'error' : ''}">
                            ${this.errors.fullName ? `<span class="error-message">${this.errors.fullName}</span>` : ''}
                        </div>

                        <div class="form-group">
                            <label>Username *</label>
                            <input type="text" 
                                   value="${this.escapeHtml(this.formData.username)}"
                                   oninput="profileEditPage.updateField('username', this.value)"
                                   placeholder="username"
                                   class="${this.errors.username ? 'error' : ''}">
                            ${this.errors.username ? `<span class="error-message">${this.errors.username}</span>` : ''}
                            <small>3-20 characters, letters, numbers, underscore</small>
                        </div>

                        <div class="form-group">
                            <label>Bio</label>
                            <textarea 
                                oninput="profileEditPage.updateField('bio', this.value)"
                                placeholder="Tell us about yourself..."
                                rows="4">${this.escapeHtml(this.formData.bio || '')}</textarea>
                            <small>${(this.formData.bio || '').length}/150 characters</small>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Contact Information</h3>

                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" 
                                   value="${this.escapeHtml(this.formData.email || '')}"
                                   oninput="profileEditPage.updateField('email', this.value)"
                                   placeholder="your@email.com">
                        </div>

                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" 
                                   value="${this.escapeHtml(this.formData.phone || '')}"
                                   oninput="profileEditPage.updateField('phone', this.value)"
                                   placeholder="+1 234 567 8900">
                        </div>

                        <div class="form-group">
                            <label>Website</label>
                            <input type="url" 
                                   value="${this.escapeHtml(this.formData.website || '')}"
                                   oninput="profileEditPage.updateField('website', this.value)"
                                   placeholder="https://example.com">
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Personal Information</h3>

                        <div class="form-group">
                            <label>Location</label>
                            <input type="text" 
                                   value="${this.escapeHtml(this.formData.location || '')}"
                                   oninput="profileEditPage.updateField('location', this.value)"
                                   placeholder="City, Country">
                        </div>

                        <div class="form-group">
                            <label>Birthday</label>
                            <input type="date" 
                                   value="${this.formData.birthday || ''}"
                                   oninput="profileEditPage.updateField('birthday', this.value)">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAvatar() {
        if (this.avatarPreview) {
            return `<img src="${this.avatarPreview}" alt="Preview" class="avatar-img">`;
        } else if (this.formData.profilePicture && this.formData.profilePicture !== '/assets/default-avatar.png') {
            return `<img src="${this.formData.profilePicture}" alt="Profile" class="avatar-img">`;
        } else {
            const initials = getInitials(this.formData.fullName || 'User');
            return `<div class="avatar-placeholder large">${initials}</div>`;
        }
    }

    updateField(field, value) {
        this.formData[field] = value;
        
        // Validate
        this.validateField(field);
        
        // Update save button state
        this.updateSaveButton();
    }

    validateField(field) {
        delete this.errors[field];

        switch (field) {
            case 'fullName':
                if (!this.formData.fullName.trim()) {
                    this.errors.fullName = 'Full name is required';
                }
                break;

            case 'username':
                if (!this.formData.username.trim()) {
                    this.errors.username = 'Username is required';
                } else if (!isValidUsername(this.formData.username)) {
                    this.errors.username = 'Username must be 3-20 characters and contain only letters, numbers, and underscore';
                }
                break;

            case 'email':
                if (this.formData.email && !isValidEmail(this.formData.email)) {
                    this.errors.email = 'Please enter a valid email address';
                }
                break;
        }

        this.refreshFieldError(field);
    }

    isValid() {
        return this.formData.fullName.trim() && 
               isValidUsername(this.formData.username) &&
               Object.keys(this.errors).length === 0;
    }

    updateSaveButton() {
        const btn = document.querySelector('.save-button');
        if (btn) {
            if (this.isValid()) {
                btn.disabled = false;
                btn.classList.add('active');
            } else {
                btn.disabled = true;
                btn.classList.remove('active');
            }
        }
    }

    refreshFieldError(field) {
        const input = document.querySelector(`[oninput*="${field}"]`);
        if (input) {
            if (this.errors[field]) {
                input.classList.add('error');
                
                let errorSpan = input.nextElementSibling;
                if (!errorSpan || !errorSpan.classList.contains('error-message')) {
                    errorSpan = document.createElement('span');
                    errorSpan.className = 'error-message';
                    input.parentNode.insertBefore(errorSpan, input.nextSibling);
                }
                errorSpan.textContent = this.errors[field];
            } else {
                input.classList.remove('error');
                const errorSpan = input.nextElementSibling;
                if (errorSpan && errorSpan.classList.contains('error-message')) {
                    errorSpan.remove();
                }
            }
        }
    }

    changeAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.processAvatar(file);
            }
        };
        input.click();
    }

    async processAvatar(file) {
        try {
            // Validate
            const validation = await mediaManager.validateMedia(file, 'image');
            if (!validation.valid) {
                alert(validation.error);
                return;
            }

            // Compress
            const processed = await mediaManager.processImage(file, {
                maxWidth: 400,
                maxHeight: 400,
                quality: 0.8
            });

            // Create preview
            this.avatarPreview = URL.createObjectURL(processed);
            this.avatarFile = processed;
            
            this.refresh();

        } catch (error) {
            console.error('Avatar processing failed:', error);
            alert('Failed to process image');
        }
    }

    async saveProfile() {
        if (!this.isValid() || this.isSaving) return;

        this.isSaving = true;
        this.refresh();

        try {
            let profilePicture = this.formData.profilePicture;

            // Upload new avatar if changed
            if (this.avatarFile) {
                profilePicture = await this.uploadAvatar(this.avatarFile);
            }

            // Update profile
            const updatedUser = {
                ...this.user,
                ...this.formData,
                profilePicture
            };

            // Update auth store
            authStore.dispatch(authActions.updateUser(updatedUser));

            // Save to IndexedDB
            await db.put('users', updatedUser);

            // Queue for sync
            await syncManager.queueAction({
                type: 'UPDATE_PROFILE',
                data: updatedUser
            });

            this.showToast('Profile updated successfully');

            // Go back to profile
            setTimeout(() => {
                router.navigate('/profile');
            }, 500);

        } catch (error) {
            console.error('Failed to save profile:', error);
            this.showToast('Failed to save profile. Changes will sync when online.');
            
            // Still save locally
            authStore.dispatch(authActions.updateUser({
                ...this.user,
                ...this.formData
            }));
            
            router.navigate('/profile');
        }
    }

    async uploadAvatar(file) {
        // Mock upload - replace with actual API
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(URL.createObjectURL(file));
            }, 1000);
        });
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
        // Focus first field
        document.querySelector('input')?.focus();
    }
}

// Make available globally
window.ProfileEditPage = ProfileEditPage;

// Add CSS
const profileEditStyles = document.createElement('style');
profileEditStyles.textContent = `
    .profile-edit-page {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .profile-edit-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }

    .save-button {
        padding: 8px 16px;
        border: none;
        border-radius: 20px;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        font-weight: 600;
        cursor: not-allowed;
        transition: all var(--transition-fast);
    }

    .save-button.active {
        background: var(--accent);
        color: white;
        cursor: pointer;
    }

    .save-button.active:hover {
        background: var(--accent-dark);
    }

    .profile-edit-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
    }

    .avatar-edit-section {
        display: flex;
        justify-content: center;
        margin-bottom: 24px;
    }

    .avatar-preview {
        position: relative;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        cursor: pointer;
        overflow: hidden;
    }

    .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .avatar-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        opacity: 0;
        transition: opacity var(--transition-fast);
        font-size: 12px;
        text-align: center;
    }

    .avatar-preview:hover .avatar-overlay {
        opacity: 1;
    }

    .form-section {
        margin-bottom: 24px;
        padding: 16px;
        background: var(--bg-secondary);
        border-radius: var(--border-radius);
    }

    .form-section h3 {
        margin-bottom: 16px;
        font-size: 16px;
    }

    .form-group {
        margin-bottom: 16px;
    }

    .form-group label {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
        color: var(--text-secondary);
    }

    .form-group input,
    .form-group textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 14px;
    }

    .form-group input:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--accent);
    }

    .form-group input.error {
        border-color: var(--danger);
    }

    .form-group small {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: var(--text-muted);
    }

    .error-message {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: var(--danger);
    }
`;
document.head.appendChild(profileEditStyles);
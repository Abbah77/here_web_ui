// Path: here-social/js/services/media.js

/**
 * Media Manager
 * Handles image/video compression and processing
 */
class MediaManager {
    constructor() {
        this.compressionQueue = [];
        this.isProcessing = false;
    }

    // Process media before upload
    async processMedia(file, options = {}) {
        const type = file.type.split('/')[0]; // 'image' or 'video'

        if (type === 'image') {
            return this.processImage(file, options);
        } else if (type === 'video') {
            return this.processVideo(file, options);
        }

        return file;
    }

    // Process image
    async processImage(file, options = {}) {
        const maxSize = options.maxSize || MEDIA_CONSTRAINTS.IMAGE.MAX_SIZE;
        const quality = options.quality || MEDIA_CONSTRAINTS.IMAGE.QUALITY;
        const maxWidth = options.maxWidth || MEDIA_CONSTRAINTS.IMAGE.MAX_WIDTH;
        const maxHeight = options.maxHeight || MEDIA_CONSTRAINTS.IMAGE.MAX_HEIGHT;

        // If file is already small enough, return as-is
        if (file.size <= maxSize) {
            return file;
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                
                img.onload = () => {
                    // Calculate dimensions
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }

                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }

                    // Create canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    // Draw and compress
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to blob
                    canvas.toBlob((blob) => {
                        const processedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });

                        // Check if still too big
                        if (processedFile.size > maxSize && quality > 0.5) {
                            // Try again with lower quality
                            this.processImage(file, {
                                ...options,
                                quality: quality - 0.1
                            }).then(resolve).catch(reject);
                        } else {
                            resolve(processedFile);
                        }
                    }, 'image/jpeg', quality);
                };

                img.onerror = reject;
            };

            reader.onerror = reject;
        });
    }

    // Process video
    async processVideo(file, options = {}) {
        const maxSize = options.maxSize || MEDIA_CONSTRAINTS.VIDEO.MAX_SIZE;
        const maxDuration = options.maxDuration || MEDIA_CONSTRAINTS.VIDEO.MAX_DURATION;
        const bitrate = options.bitrate || MEDIA_CONSTRAINTS.VIDEO.BITRATE;

        // Check duration first
        const duration = await this.getVideoDuration(file);
        
        if (duration > maxDuration) {
            throw new Error(`Video too long (max ${maxDuration}s)`);
        }

        // If file is small enough, return as-is
        if (file.size <= maxSize) {
            return file;
        }

        // Note: Actual video compression requires backend or FFmpeg.wasm
        // For now, return file with warning
        console.warn('Video compression not implemented client-side');
        return file;
    }

    // Get video duration
    getVideoDuration(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = () => {
                URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };

            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                reject(new Error('Failed to load video metadata'));
            };

            video.src = URL.createObjectURL(file);
        });
    }

    // Generate thumbnail from video
    generateVideoThumbnail(file, time = 0) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadeddata = () => {
                // Seek to desired time
                video.currentTime = time;
            };

            video.onseeked = () => {
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw frame
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to blob
                canvas.toBlob((blob) => {
                    const thumbnail = new File([blob], 'thumbnail.jpg', {
                        type: 'image/jpeg'
                    });
                    
                    URL.revokeObjectURL(video.src);
                    resolve(thumbnail);
                }, 'image/jpeg', 0.8);
            };

            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                reject(new Error('Failed to generate thumbnail'));
            };

            video.src = URL.createObjectURL(file);
        });
    }

    // Queue media for compression
    async queueForCompression(file, options = {}) {
        return new Promise((resolve, reject) => {
            this.compressionQueue.push({
                file,
                options,
                resolve,
                reject
            });

            this.processQueue();
        });
    }

    // Process compression queue
    async processQueue() {
        if (this.isProcessing || this.compressionQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.compressionQueue.length > 0) {
            const item = this.compressionQueue.shift();
            
            try {
                const processed = await this.processMedia(item.file, item.options);
                item.resolve(processed);
            } catch (error) {
                item.reject(error);
            }
        }

        this.isProcessing = false;
    }

    // Get image dimensions
    getImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                resolve({
                    width: img.width,
                    height: img.height
                });
            };

            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to load image'));
            };

            img.src = URL.createObjectURL(file);
        });
    }

    // Check if media meets constraints
    async validateMedia(file, type) {
        const constraints = MEDIA_CONSTRAINTS[type.toUpperCase()];

        if (!constraints) {
            return { valid: true };
        }

        // Check size
        if (file.size > constraints.MAX_SIZE) {
            return {
                valid: false,
                error: `File too large (max ${constraints.MAX_SIZE / 1024}KB)`
            };
        }

        // Check type-specific constraints
        if (type === 'image') {
            const dimensions = await this.getImageDimensions(file);
            
            if (dimensions.width > constraints.MAX_WIDTH || 
                dimensions.height > constraints.MAX_HEIGHT) {
                return {
                    valid: false,
                    error: `Image too large (max ${constraints.MAX_WIDTH}x${constraints.MAX_HEIGHT})`
                };
            }
        } else if (type === 'video') {
            const duration = await this.getVideoDuration(file);
            
            if (duration > constraints.MAX_DURATION) {
                return {
                    valid: false,
                    error: `Video too long (max ${constraints.MAX_DURATION}s)`
                };
            }
        }

        return { valid: true };
    }

    // Convert blob to base64
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Convert base64 to blob
    base64ToBlob(base64, type = 'image/jpeg') {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type });
    }
}

// Create global instance
window.mediaManager = new MediaManager();
// Path: here-social/js/services/api.js

/**
 * API Client
 * Handles all HTTP requests with offline queue support
 */
class APIClient {
    constructor() {
        this.baseURL = API.BASE_URL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    // Set auth token
    setToken(token) {
        this.token = token;
    }

    // Get auth headers
    getHeaders() {
        const headers = { ...this.defaultHeaders };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // Handle response
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP error ${response.status}`);
        }
        return response.json();
    }

    // Queue offline request
    async queueOfflineRequest(endpoint, options) {
        return new Promise((resolve) => {
            // Store in sync queue via service worker
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'QUEUE_REQUEST',
                    data: {
                        url: `${this.baseURL}${endpoint}`,
                        ...options,
                        timestamp: Date.now()
                    }
                });
            }

            // Return optimistic response
            resolve({
                queued: true,
                message: 'Request queued for offline sync'
            });
        });
    }

    // GET request
    async get(endpoint, params = {}, options = {}) {
        const url = new URL(`${this.baseURL}${endpoint}`);
        
        // Add query params
        Object.keys(params).forEach(key => 
            url.searchParams.append(key, params[key])
        );

        // If offline and not critical, return cached
        if (!navigator.onLine && options.useCache !== false) {
            const cached = await this.getFromCache(endpoint, params);
            if (cached) {
                return cached;
            }
        }

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: this.getHeaders(),
                ...options
            });

            return this.handleResponse(response);
        } catch (error) {
            // If offline, try cache
            if (!navigator.onLine) {
                const cached = await this.getFromCache(endpoint, params);
                if (cached) {
                    return cached;
                }
            }
            throw error;
        }
    }

    // POST request
    async post(endpoint, data = {}, options = {}) {
        // If offline, queue it
        if (!navigator.onLine) {
            return this.queueOfflineRequest(endpoint, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                ...options
            });

            return this.handleResponse(response);
        } catch (error) {
            // If offline during request, queue it
            if (!navigator.onLine) {
                return this.queueOfflineRequest(endpoint, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(data)
                });
            }
            throw error;
        }
    }

    // PUT request
    async put(endpoint, data = {}, options = {}) {
        if (!navigator.onLine) {
            return this.queueOfflineRequest(endpoint, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
                ...options
            });

            return this.handleResponse(response);
        } catch (error) {
            if (!navigator.onLine) {
                return this.queueOfflineRequest(endpoint, {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(data)
                });
            }
            throw error;
        }
    }

    // DELETE request
    async delete(endpoint, options = {}) {
        if (!navigator.onLine) {
            return this.queueOfflineRequest(endpoint, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                ...options
            });

            return this.handleResponse(response);
        } catch (error) {
            if (!navigator.onLine) {
                return this.queueOfflineRequest(endpoint, {
                    method: 'DELETE',
                    headers: this.getHeaders()
                });
            }
            throw error;
        }
    }

    // Upload file with progress
    async upload(endpoint, file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        // Compress if image
        if (file.type.startsWith('image/')) {
            file = await this.compressImage(file);
        }

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (onProgress && e.lengthComputable) {
                    onProgress(Math.round((e.loaded * 100) / e.total));
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Upload failed')));

            xhr.open('POST', `${this.baseURL}${endpoint}`);
            
            // Set headers
            if (this.token) {
                xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
            }

            xhr.send(formData);
        });
    }

    // Compress image before upload
    async compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > MEDIA_CONSTRAINTS.IMAGE.MAX_WIDTH) {
                        height *= MEDIA_CONSTRAINTS.IMAGE.MAX_WIDTH / width;
                        width = MEDIA_CONSTRAINTS.IMAGE.MAX_WIDTH;
                    }

                    if (height > MEDIA_CONSTRAINTS.IMAGE.MAX_HEIGHT) {
                        width *= MEDIA_CONSTRAINTS.IMAGE.MAX_HEIGHT / height;
                        height = MEDIA_CONSTRAINTS.IMAGE.MAX_HEIGHT;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    }, 'image/jpeg', MEDIA_CONSTRAINTS.IMAGE.QUALITY);
                };
            };
        });
    }

    // Get from cache (using Cache API)
    async getFromCache(endpoint, params) {
        const cache = await caches.open(API_CACHE);
        const url = new URL(`${this.baseURL}${endpoint}`);
        
        Object.keys(params).forEach(key => 
            url.searchParams.append(key, params[key])
        );

        const response = await cache.match(url.toString());
        if (response) {
            return response.json();
        }
        return null;
    }

    // Cache response
    async cacheResponse(endpoint, data, params = {}) {
        const cache = await caches.open(API_CACHE);
        const url = new URL(`${this.baseURL}${endpoint}`);
        
        Object.keys(params).forEach(key => 
            url.searchParams.append(key, params[key])
        );

        const response = new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });

        await cache.put(url.toString(), response);
    }
}

// Create global instance
window.api = new APIClient();
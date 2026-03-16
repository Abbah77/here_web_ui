// Path: here-social/js/db/index.js

/**
 * IndexedDB Wrapper
 * Provides Promise-based API for database operations
 */
class HERE_DB {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.initPromise = null;
    }

    // Initialize database
    async init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_SCHEMAS.name, DB_SCHEMAS.version);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                console.log('Database initialized successfully');
                resolve(this);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;

                console.log(`Upgrading database from v${oldVersion} to v${newVersion}`);

                // Create object stores based on schemas
                const stores = DB_SCHEMAS.stores;
                
                Object.keys(stores).forEach(storeName => {
                    const storeConfig = stores[storeName];
                    
                    if (!db.objectStoreNames.contains(storeConfig.name)) {
                        console.log(`Creating store: ${storeConfig.name}`);
                        const store = db.createObjectStore(storeConfig.name, { 
                            keyPath: storeConfig.keyPath 
                        });
                        
                        // Create indexes
                        if (storeConfig.indexes) {
                            storeConfig.indexes.forEach(index => {
                                store.createIndex(index.name, index.keyPath, index.options);
                            });
                        }
                    }
                });

                // Handle migrations
                this.runMigrations(db, oldVersion, newVersion);
            };
        });

        return this.initPromise;
    }

    // Run migrations
    runMigrations(db, oldVersion, newVersion) {
        // This will be expanded in migrations.js
        console.log(`Running migrations from ${oldVersion} to ${newVersion}`);
        
        if (oldVersion < 1) {
            // Version 1 migrations
            console.log('Applying version 1 migrations');
        }
    }

    // Ensure database is initialized before operations
    async ensureInit() {
        if (!this.isInitialized) {
            await this.init();
        }
        return this;
    }

    // Generic add/put operation
    async put(storeName, data) {
        await this.ensureInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic get operation
    async get(storeName, key) {
        await this.ensureInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get all from store
    async getAll(storeName, indexName = null, value = null, limit = null) {
        await this.ensureInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName && value !== null) {
                const index = store.index(indexName);
                request = index.getAll(value);
            } else {
                request = store.getAll();
            }
            
            request.onsuccess = () => {
                let results = request.result;
                if (limit) {
                    results = results.slice(0, limit);
                }
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Query with range
    async queryRange(storeName, indexName, range, direction = 'next', limit = null) {
        await this.ensureInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            
            const results = [];
            let count = 0;
            
            const request = index.openCursor(range, direction);
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && (limit === null || count < limit)) {
                    results.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Delete operation
    async delete(storeName, key) {
        await this.ensureInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // Clear store
    async clear(storeName) {
        await this.ensureInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // Count records
    async count(storeName, indexName = null, value = null) {
        await this.ensureInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName && value !== null) {
                const index = store.index(indexName);
                request = index.count(value);
            } else {
                request = store.count();
            }
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Bulk operations
    async bulkPut(storeName, items) {
        await this.ensureInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            let completed = 0;
            const errors = [];
            
            items.forEach(item => {
                const request = store.put(item);
                
                request.onsuccess = () => {
                    completed++;
                    if (completed === items.length) {
                        resolve(errors.length ? errors : true);
                    }
                };
                
                request.onerror = (e) => {
                    errors.push(e.target.error);
                    completed++;
                    if (completed === items.length) {
                        reject(errors);
                    }
                };
            });
        });
    }

    // Prune old records (maintain cache limits)
    async prune(storeName, indexName, limit, direction = 'prev') {
        await this.ensureInit();
        
        const count = await this.count(storeName);
        if (count <= limit) return 0;
        
        const toDelete = count - limit;
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, direction);
            let deleted = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && deleted < toDelete) {
                    store.delete(cursor.primaryKey);
                    deleted++;
                    cursor.continue();
                } else {
                    resolve(deleted);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Close database
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
            this.initPromise = null;
        }
    }
}

// Create global instance
window.db = new HERE_DB();
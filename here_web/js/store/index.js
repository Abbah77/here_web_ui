// Path: here-social/js/store/index.js

/**
 * Central State Management
 * Simple pub/sub pattern with multiple stores
 */
class Store {
    constructor() {
        this.states = {};
        this.subscribers = {};
        this.reducers = {};
    }

    // Register a store module
    register(moduleName, initialState, reducer) {
        this.states[moduleName] = initialState;
        this.subscribers[moduleName] = [];
        this.reducers[moduleName] = reducer;
        
        // Return bound actions
        return {
            getState: () => this.getState(moduleName),
            dispatch: (action) => this.dispatch(moduleName, action),
            subscribe: (callback) => this.subscribe(moduleName, callback)
        };
    }

    // Get state for a module
    getState(moduleName) {
        return this.states[moduleName] ? { ...this.states[moduleName] } : null;
    }

    // Get entire state
    getFullState() {
        return Object.keys(this.states).reduce((acc, key) => {
            acc[key] = { ...this.states[key] };
            return acc;
        }, {});
    }

    // Dispatch action to a module
    dispatch(moduleName, action) {
        if (!this.reducers[moduleName]) {
            console.error(`No reducer found for module: ${moduleName}`);
            return;
        }

        const currentState = this.states[moduleName];
        const newState = this.reducers[moduleName](currentState, action);

        if (newState !== currentState) {
            this.states[moduleName] = newState;
            this.notify(moduleName, newState, action);
        }

        return action;
    }

    // Global dispatch (action.type format: 'module/action')
    dispatchGlobal(action) {
        const [moduleName, actionType] = action.type.split('/');
        
        if (moduleName && actionType) {
            return this.dispatch(moduleName, {
                ...action,
                type: actionType
            });
        }
        
        console.error('Invalid action type format. Use: module/action');
    }

    // Subscribe to module changes
    subscribe(moduleName, callback) {
        if (!this.subscribers[moduleName]) {
            this.subscribers[moduleName] = [];
        }

        this.subscribers[moduleName].push(callback);

        // Return unsubscribe function
        return () => {
            this.subscribers[moduleName] = this.subscribers[moduleName]
                .filter(cb => cb !== callback);
        };
    }

    // Notify subscribers
    notify(moduleName, newState, action) {
        if (this.subscribers[moduleName]) {
            this.subscribers[moduleName].forEach(callback => {
                try {
                    callback(newState, action);
                } catch (error) {
                    console.error('Subscriber error:', error);
                }
            });
        }
    }

    // Reset state for a module
    reset(moduleName) {
        if (this.reducers[moduleName]) {
            const initialState = this.reducers[moduleName](undefined, { type: '@@INIT' });
            this.states[moduleName] = initialState;
            this.notify(moduleName, initialState, { type: '@@RESET' });
        }
    }

    // Reset all states
    resetAll() {
        Object.keys(this.reducers).forEach(moduleName => {
            this.reset(moduleName);
        });
    }

    // Save state to IndexedDB
    async persist(moduleName) {
        const state = this.getState(moduleName);
        if (state) {
            await db.put('auth', {
                id: 'app_state',
                moduleName,
                state,
                timestamp: Date.now()
            });
        }
    }

    // Load state from IndexedDB
    async loadPersisted(moduleName) {
        const persisted = await db.get('auth', 'app_state');
        if (persisted && persisted.moduleName === moduleName) {
            this.states[moduleName] = persisted.state;
            this.notify(moduleName, persisted.state, { type: '@@HYDRATE' });
        }
    }
}

// Create global store instance
window.store = new Store();
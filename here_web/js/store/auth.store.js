// Path: here-social/js/store/auth.store.js

/**
 * Authentication Store
 * Handles user auth state with "forever login" capability
 */

// Initial state
const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    token: null,
    refreshToken: null,
    lastActivity: Date.now(),
    rememberMe: true // Forever login enabled
};

// Action types
const ACTIONS = {
    LOGIN_REQUEST: 'LOGIN_REQUEST',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    UPDATE_USER: 'UPDATE_USER',
    REFRESH_TOKEN: 'REFRESH_TOKEN',
    UPDATE_ACTIVITY: 'UPDATE_ACTIVITY',
    HYDRATE_FROM_STORAGE: 'HYDRATE_FROM_STORAGE'
};

// Reducer
function authReducer(state = initialState, action) {
    switch (action.type) {
        case ACTIONS.LOGIN_REQUEST:
            return {
                ...state,
                isLoading: true,
                error: null
            };

        case ACTIONS.LOGIN_SUCCESS:
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                refreshToken: action.payload.refreshToken,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                lastActivity: Date.now()
            };

        case ACTIONS.LOGIN_FAILURE:
            return {
                ...state,
                isLoading: false,
                error: action.payload.error,
                isAuthenticated: false,
                user: null,
                token: null,
                refreshToken: null
            };

        case ACTIONS.LOGOUT:
            // Clear everything but keep rememberMe setting
            return {
                ...initialState,
                isLoading: false,
                rememberMe: state.rememberMe
            };

        case ACTIONS.UPDATE_USER:
            return {
                ...state,
                user: {
                    ...state.user,
                    ...action.payload
                },
                lastActivity: Date.now()
            };

        case ACTIONS.REFRESH_TOKEN:
            return {
                ...state,
                token: action.payload.token,
                refreshToken: action.payload.refreshToken || state.refreshToken,
                lastActivity: Date.now()
            };

        case ACTIONS.UPDATE_ACTIVITY:
            return {
                ...state,
                lastActivity: Date.now()
            };

        case ACTIONS.HYDRATE_FROM_STORAGE:
            return {
                ...state,
                ...action.payload,
                isLoading: false
            };

        default:
            return state;
    }
}

// Actions creators
const authActions = {
    loginRequest: () => ({ type: ACTIONS.LOGIN_REQUEST }),

    loginSuccess: (user, token, refreshToken) => ({
        type: ACTIONS.LOGIN_SUCCESS,
        payload: { user, token, refreshToken }
    }),

    loginFailure: (error) => ({
        type: ACTIONS.LOGIN_FAILURE,
        payload: { error }
    }),

    logout: () => ({ type: ACTIONS.LOGOUT }),

    updateUser: (userData) => ({
        type: ACTIONS.UPDATE_USER,
        payload: userData
    }),

    refreshToken: (token, refreshToken = null) => ({
        type: ACTIONS.REFRESH_TOKEN,
        payload: { token, refreshToken }
    }),

    updateActivity: () => ({ type: ACTIONS.UPDATE_ACTIVITY }),

    hydrateFromStorage: (data) => ({
        type: ACTIONS.HYDRATE_FROM_STORAGE,
        payload: data
    })
};

// Async actions
const authAsyncActions = {
    // Check existing session (for forever login)
    checkSession: () => async (dispatch, getState) => {
        try {
            // Load from localStorage
            const savedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            const savedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);

            if (savedToken && savedUser) {
                dispatch(authActions.loginSuccess(
                    JSON.parse(savedUser),
                    savedToken,
                    localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
                ));
                
                // Also save to IndexedDB for offline access
                await db.put('auth', {
                    id: 'current_session',
                    userId: JSON.parse(savedUser).userId,
                    token: savedToken,
                    user: JSON.parse(savedUser),
                    timestamp: Date.now()
                });
            } else {
                // Try IndexedDB
                const offlineSession = await db.get('auth', 'current_session');
                if (offlineSession && offlineSession.user) {
                    dispatch(authActions.loginSuccess(
                        offlineSession.user,
                        offlineSession.token,
                        offlineSession.refreshToken
                    ));
                } else {
                    dispatch(authActions.hydrateFromStorage(initialState));
                }
            }
        } catch (error) {
            console.error('Session check failed:', error);
            dispatch(authActions.hydrateFromStorage(initialState));
        }
    },

    // Login with email/username
    login: (credentials) => async (dispatch, getState) => {
        dispatch(authActions.loginRequest());

        try {
            // This will be replaced with actual API call
            // For now, simulate API
            const response = await mockLoginAPI(credentials);

            if (response.success) {
                // Save to localStorage (for forever login)
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
                localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
                if (response.refreshToken) {
                    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
                }

                // Save to IndexedDB
                await db.put('auth', {
                    id: 'current_session',
                    userId: response.user.userId,
                    token: response.token,
                    refreshToken: response.refreshToken,
                    user: response.user,
                    timestamp: Date.now()
                });

                // Save user profile to users store
                await db.put('users', response.user);

                dispatch(authActions.loginSuccess(
                    response.user,
                    response.token,
                    response.refreshToken
                ));

                return { success: true };
            } else {
                dispatch(authActions.loginFailure(response.error));
                return { success: false, error: response.error };
            }
        } catch (error) {
            dispatch(authActions.loginFailure(error.message));
            return { success: false, error: error.message };
        }
    },

    // Register new user
    register: (userData) => async (dispatch, getState) => {
        dispatch(authActions.loginRequest());

        try {
            // This will be replaced with actual API call
            const response = await mockRegisterAPI(userData);

            if (response.success) {
                // Auto login after registration
                return await authAsyncActions.login({
                    username: userData.username,
                    password: userData.password
                })(dispatch, getState);
            } else {
                dispatch(authActions.loginFailure(response.error));
                return { success: false, error: response.error };
            }
        } catch (error) {
            dispatch(authActions.loginFailure(error.message));
            return { success: false, error: error.message };
        }
    },

    // Logout
    logout: () => async (dispatch) => {
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

        // Clear IndexedDB session
        await db.delete('auth', 'current_session');

        dispatch(authActions.logout());

        // Redirect to auth page
        if (window.router) {
            window.router.navigate('/auth');
        }
    },

    // Update activity (for presence)
    updateActivity: () => (dispatch) => {
        dispatch(authActions.updateActivity());
        
        // Update last seen in background
        if (navigator.onLine) {
            // Queue presence update
            window.syncManager?.queueAction({
                type: 'UPDATE_PRESENCE',
                data: { timestamp: Date.now() }
            });
        }
    }
};

// Mock API functions (remove when real backend is ready)
async function mockLoginAPI(credentials) {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (credentials.password === 'password') {
                resolve({
                    success: true,
                    user: {
                        userId: 'user_' + Date.now(),
                        username: credentials.username || credentials.email.split('@')[0],
                        email: credentials.email || 'user@example.com',
                        fullName: 'Test User',
                        profilePicture: '/assets/default-avatar.png',
                        bio: 'Hello, I am using HERE!',
                        friends: 0,
                        createdAt: Date.now()
                    },
                    token: 'mock_jwt_token_' + Date.now(),
                    refreshToken: 'mock_refresh_token_' + Date.now()
                });
            } else {
                resolve({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
        }, 1000);
    });
}

async function mockRegisterAPI(userData) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                user: {
                    userId: 'user_' + Date.now(),
                    username: userData.username,
                    email: userData.email,
                    fullName: userData.fullName,
                    profilePicture: '/assets/default-avatar.png',
                    bio: null,
                    friends: 0,
                    createdAt: Date.now()
                },
                token: 'mock_jwt_token_' + Date.now(),
                refreshToken: 'mock_refresh_token_' + Date.now()
            });
        }, 1000);
    });
}

// Register store with global store
const authStore = store.register('auth', initialState, authReducer);

// Attach actions to store for easy access
authStore.actions = authActions;
authStore.asyncActions = authAsyncActions;

// Make available globally
window.authStore = authStore;
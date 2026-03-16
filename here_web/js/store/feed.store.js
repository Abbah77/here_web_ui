// Path: here-social/js/store/feed.store.js

/**
 * Feed Store
 * Manages home feed posts with offline caching
 */

// Initial state
const initialState = {
    posts: [],           // Array of post objects
    loading: false,
    hasMore: true,
    page: 1,
    error: null,
    lastSync: null,
    newPostsCount: 0,
    cachedPostsCount: 0
};

// Action types
const ACTIONS = {
    FETCH_FEED_REQUEST: 'FETCH_FEED_REQUEST',
    FETCH_FEED_SUCCESS: 'FETCH_FEED_SUCCESS',
    FETCH_FEED_FAILURE: 'FETCH_FEED_FAILURE',
    ADD_POST: 'ADD_POST',
    UPDATE_POST: 'UPDATE_POST',
    DELETE_POST: 'DELETE_POST',
    LIKE_POST: 'LIKE_POST',
    UNLIKE_POST: 'UNLIKE_POST',
    ADD_COMMENT: 'ADD_COMMENT',
    UPDATE_NEW_POSTS_COUNT: 'UPDATE_NEW_POSTS_COUNT',
    CLEAR_NEW_POSTS: 'CLEAR_NEW_POSTS',
    HYDRATE_FROM_CACHE: 'HYDRATE_FROM_CACHE',
    SYNC_COMPLETE: 'SYNC_COMPLETE'
};

// Reducer
function feedReducer(state = initialState, action) {
    switch (action.type) {
        case ACTIONS.FETCH_FEED_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case ACTIONS.FETCH_FEED_SUCCESS:
            return {
                ...state,
                posts: action.payload.page === 1 
                    ? action.payload.posts 
                    : [...state.posts, ...action.payload.posts],
                hasMore: action.payload.hasMore,
                page: action.payload.page,
                loading: false,
                error: null,
                lastSync: Date.now()
            };

        case ACTIONS.FETCH_FEED_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload.error
            };

        case ACTIONS.ADD_POST:
            return {
                ...state,
                posts: [action.payload, ...state.posts],
                newPostsCount: state.newPostsCount + 1
            };

        case ACTIONS.UPDATE_POST:
            return {
                ...state,
                posts: state.posts.map(post =>
                    post.postId === action.payload.postId
                        ? { ...post, ...action.payload }
                        : post
                )
            };

        case ACTIONS.DELETE_POST:
            return {
                ...state,
                posts: state.posts.filter(post => post.postId !== action.payload)
            };

        case ACTIONS.LIKE_POST:
            return {
                ...state,
                posts: state.posts.map(post => {
                    if (post.postId === action.payload) {
                        return {
                            ...post,
                            likes: post.likes + 1,
                            likedByUser: true
                        };
                    }
                    return post;
                })
            };

        case ACTIONS.UNLIKE_POST:
            return {
                ...state,
                posts: state.posts.map(post => {
                    if (post.postId === action.payload) {
                        return {
                            ...post,
                            likes: Math.max(0, post.likes - 1),
                            likedByUser: false
                        };
                    }
                    return post;
                })
            };

        case ACTIONS.ADD_COMMENT:
            return {
                ...state,
                posts: state.posts.map(post => {
                    if (post.postId === action.payload.postId) {
                        return {
                            ...post,
                            comments: [...(post.comments || []), action.payload.comment],
                            commentCount: (post.commentCount || 0) + 1
                        };
                    }
                    return post;
                })
            };

        case ACTIONS.UPDATE_NEW_POSTS_COUNT:
            return {
                ...state,
                newPostsCount: action.payload
            };

        case ACTIONS.CLEAR_NEW_POSTS:
            return {
                ...state,
                newPostsCount: 0
            };

        case ACTIONS.HYDRATE_FROM_CACHE:
            return {
                ...state,
                posts: action.payload.posts,
                cachedPostsCount: action.payload.count,
                loading: false
            };

        case ACTIONS.SYNC_COMPLETE:
            return {
                ...state,
                lastSync: Date.now()
            };

        default:
            return state;
    }
}

// Action creators
const feedActions = {
    fetchFeedRequest: () => ({ type: ACTIONS.FETCH_FEED_REQUEST }),

    fetchFeedSuccess: (posts, page, hasMore) => ({
        type: ACTIONS.FETCH_FEED_SUCCESS,
        payload: { posts, page, hasMore }
    }),

    fetchFeedFailure: (error) => ({
        type: ACTIONS.FETCH_FEED_FAILURE,
        payload: { error }
    }),

    addPost: (post) => ({
        type: ACTIONS.ADD_POST,
        payload: post
    }),

    updatePost: (post) => ({
        type: ACTIONS.UPDATE_POST,
        payload: post
    }),

    deletePost: (postId) => ({
        type: ACTIONS.DELETE_POST,
        payload: postId
    }),

    likePost: (postId) => ({
        type: ACTIONS.LIKE_POST,
        payload: postId
    }),

    unlikePost: (postId) => ({
        type: ACTIONS.UNLIKE_POST,
        payload: postId
    }),

    addComment: (postId, comment) => ({
        type: ACTIONS.ADD_COMMENT,
        payload: { postId, comment }
    }),

    updateNewPostsCount: (count) => ({
        type: ACTIONS.UPDATE_NEW_POSTS_COUNT,
        payload: count
    }),

    clearNewPosts: () => ({ type: ACTIONS.CLEAR_NEW_POSTS }),

    hydrateFromCache: (posts, count) => ({
        type: ACTIONS.HYDRATE_FROM_CACHE,
        payload: { posts, count }
    }),

    syncComplete: () => ({ type: ACTIONS.SYNC_COMPLETE })
};

// Async actions
const feedAsyncActions = {
    // Load feed from cache first, then network
    loadFeed: (page = 1) => async (dispatch, getState) => {
        const state = getState('feed');

        // If page 1, try cache first
        if (page === 1) {
            try {
                const cachedPosts = await db.queryRange(
                    'posts',
                    'timestamp',
                    IDBKeyRange.lowerBound(0),
                    'prev',
                    20
                );

                if (cachedPosts.length > 0) {
                    dispatch(feedActions.hydrateFromCache(
                        cachedPosts,
                        cachedPosts.length
                    ));
                }
            } catch (error) {
                console.error('Failed to load cached posts:', error);
            }
        }

        // Then fetch from network if online
        if (navigator.onLine) {
            dispatch(feedActions.fetchFeedRequest());

            try {
                // This will be replaced with actual API
                const response = await mockFetchFeedAPI(page);

                if (response.success) {
                    dispatch(feedActions.fetchFeedSuccess(
                        response.posts,
                        response.page,
                        response.hasMore
                    ));

                    // Cache posts
                    for (const post of response.posts) {
                        await db.put('posts', {
                            ...post,
                            cachedAt: Date.now()
                        });
                    }

                    // Prune if needed
                    await db.prune('posts', 'timestamp', CACHE_LIMITS.POSTS, 'prev');
                } else {
                    dispatch(feedActions.fetchFeedFailure(response.error));
                }
            } catch (error) {
                dispatch(feedActions.fetchFeedFailure(error.message));
            }
        } else if (page === 1) {
            // Offline and no cache - show empty with offline message
            dispatch(feedActions.fetchFeedSuccess([], 1, false));
        }
    },

    // Create new post
    createPost: (postData) => async (dispatch) => {
        const tempId = 'temp_' + Date.now();
        
        const newPost = {
            postId: tempId,
            ...postData,
            author: authStore.getState()?.user,
            likes: 0,
            comments: [],
            likedByUser: false,
            timestamp: Date.now(),
            status: 'pending'
        };

        // Show immediately
        dispatch(feedActions.addPost(newPost));

        // Queue for sync
        await window.syncManager?.queueAction({
            type: 'CREATE_POST',
            data: postData,
            tempId: tempId,
            timestamp: Date.now()
        });

        // Save to local DB
        await db.put('posts', newPost);

        return tempId;
    },

    // Like/unlike post
    toggleLike: (postId, liked) => async (dispatch) => {
        // Update UI immediately
        if (liked) {
            dispatch(feedActions.unlikePost(postId));
        } else {
            dispatch(feedActions.likePost(postId));
        }

        // Queue for sync
        await window.syncManager?.queueAction({
            type: liked ? 'UNLIKE_POST' : 'LIKE_POST',
            data: { postId },
            timestamp: Date.now()
        });

        // Update local DB
        const post = await db.get('posts', postId);
        if (post) {
            post.likes += liked ? -1 : 1;
            post.likedByUser = !liked;
            await db.put('posts', post);
        }
    },

    // Check for new posts
    checkForNewPosts: () => async (dispatch, getState) => {
        if (!navigator.onLine) return;

        const state = getState('feed');
        const lastPost = state.posts[0];
        
        if (!lastPost) return;

        try {
            // This will be replaced with actual API
            const newPosts = await mockFetchNewPostsAPI(lastPost.timestamp);

            if (newPosts.length > 0) {
                dispatch(feedActions.updateNewPostsCount(newPosts.length));
            }
        } catch (error) {
            console.error('Failed to check for new posts:', error);
        }
    },

    // Load new posts
    loadNewPosts: () => async (dispatch, getState) => {
        const state = getState('feed');
        const lastPost = state.posts[0];

        if (!lastPost) return;

        dispatch(feedActions.fetchFeedRequest());

        try {
            // This will be replaced with actual API
            const response = await mockFetchNewPostsAPI(lastPost.timestamp);

            if (response.length > 0) {
                // Add to beginning of feed
                dispatch(feedActions.fetchFeedSuccess(
                    [...response, ...state.posts],
                    1,
                    state.hasMore
                ));

                // Clear new posts count
                dispatch(feedActions.clearNewPosts());

                // Cache new posts
                for (const post of response) {
                    await db.put('posts', post);
                }
            }
        } catch (error) {
            console.error('Failed to load new posts:', error);
        }
    }
};

// Mock API functions
async function mockFetchFeedAPI(page) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const posts = [];
            const start = (page - 1) * 10;

            for (let i = 0; i < 10; i++) {
                posts.push({
                    postId: `post_${start + i}`,
                    content: `This is post number ${start + i}`,
                    author: {
                        userId: 'user_1',
                        username: 'testuser',
                        fullName: 'Test User',
                        profilePicture: '/assets/default-avatar.png'
                    },
                    likes: Math.floor(Math.random() * 100),
                    comments: [],
                    likedByUser: false,
                    timestamp: Date.now() - (start + i) * 60000,
                    type: 'text'
                });
            }

            resolve({
                success: true,
                posts,
                page,
                hasMore: page < 5
            });
        }, 800);
    });
}

async function mockFetchNewPostsAPI(since) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newPosts = [];
            const count = Math.floor(Math.random() * 5);

            for (let i = 0; i < count; i++) {
                newPosts.push({
                    postId: `post_new_${Date.now()}_${i}`,
                    content: `New post ${i + 1}`,
                    author: {
                        userId: 'user_1',
                        username: 'testuser',
                        fullName: 'Test User',
                        profilePicture: '/assets/default-avatar.png'
                    },
                    likes: 0,
                    comments: [],
                    likedByUser: false,
                    timestamp: Date.now() - i * 1000,
                    type: 'text'
                });
            }

            resolve(newPosts);
        }, 500);
    });
}

// Register store
const feedStore = store.register('feed', initialState, feedReducer);
feedStore.actions = feedActions;
feedStore.asyncActions = feedAsyncActions;

window.feedStore = feedStore;
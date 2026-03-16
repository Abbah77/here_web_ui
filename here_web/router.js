// Add these routes to router.js
router.addRoute('/post/create', CreatePostPage, { requiresAuth: true });
router.addRoute('/post/:id', PostDetailPage, { requiresAuth: true });
router.addRoute('/profile/edit', ProfileEditPage, { requiresAuth: true });
router.addRoute('/group/create', GroupChatPage, { requiresAuth: true });
router.addRoute('/group/:id', GroupChatPage, { requiresAuth: true });
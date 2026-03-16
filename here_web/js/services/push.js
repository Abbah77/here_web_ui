// Path: here-social/js/services/push.js

/**
 * Push Notification Manager
 * Handles push notification subscription and handling
 */
class PushManager {
    constructor() {
        this.swRegistration = null;
        this.isSubscribed = false;
        this.applicationServerKey = null;
        this.vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // Replace with actual key
    }

    // Initialize push notifications
    async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications not supported');
            return false;
        }

        try {
            this.swRegistration = await navigator.serviceWorker.ready;
            
            // Check if already subscribed
            const subscription = await this.swRegistration.pushManager.getSubscription();
            this.isSubscribed = subscription !== null;

            // Subscribe if not
            if (!this.isSubscribed) {
                await this.subscribe();
            }

            return true;
        } catch (error) {
            console.error('Push initialization failed:', error);
            return false;
        }
    }

    // Subscribe to push notifications
    async subscribe() {
        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            
            if (permission !== 'granted') {
                console.log('Notification permission denied');
                return false;
            }

            // Subscribe
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
            });

            // Send subscription to server
            await this.sendSubscriptionToServer(subscription);

            this.isSubscribed = true;
            console.log('Push subscription successful');
            return true;

        } catch (error) {
            console.error('Push subscription failed:', error);
            return false;
        }
    }

    // Unsubscribe from push
    async unsubscribe() {
        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            
            if (subscription) {
                // Unsubscribe locally
                await subscription.unsubscribe();
                
                // Notify server
                await api.post('/push/unsubscribe', {
                    endpoint: subscription.endpoint
                });

                this.isSubscribed = false;
                console.log('Unsubscribed from push');
            }
        } catch (error) {
            console.error('Unsubscribe failed:', error);
        }
    }

    // Send subscription to server
    async sendSubscriptionToServer(subscription) {
        try {
            await api.post('/push/subscribe', {
                subscription: subscription.toJSON(),
                userAgent: navigator.userAgent,
                platform: 'web'
            });
        } catch (error) {
            console.error('Failed to send subscription to server:', error);
        }
    }

    // Get current subscription
    async getSubscription() {
        if (!this.swRegistration) {
            await this.init();
        }
        return this.swRegistration.pushManager.getSubscription();
    }

    // Check if subscribed
    async checkSubscription() {
        const subscription = await this.getSubscription();
        return subscription !== null;
    }

    // Handle push notification click
    handleNotificationClick(event) {
        const data = event.notification.data;
        
        // Close notification
        event.notification.close();

        // Focus or open window based on data
        if (data && data.url) {
            event.waitUntil(
                clients.openWindow(data.url)
            );
        }
    }

    // Helper: Convert base64 to Uint8Array
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Show test notification
    async showTestNotification() {
        if (Notification.permission === 'granted') {
            new Notification('HERE Test', {
                body: 'Push notifications are working!',
                icon: '/assets/icons/icon-192.png',
                vibrate: [200, 100, 200]
            });
        }
    }
}

// Create global instance
window.pushManager = new PushManager();
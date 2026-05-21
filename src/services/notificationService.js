/**
 * Notification Service
 * Handles browser notifications for CSV parsing and API verification
 * Notifications only display when user is away from the app/tab
 */

export const NotificationService = {
  /**
   * Check if user is away from the page
   */
  isUserAway() {
    return document.hidden || document.visibilityState === 'hidden';
  },

  /**
   * Request notification permission and show test notification
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.showTestNotification();
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.showTestNotification();
          return true;
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }

    return false;
  },

  /**
   * Show test notification to confirm permissions are working
   */
  showTestNotification() {
    if (Notification.permission === 'granted') {
      new Notification('eBay Label Maker', {
        body: 'Notifications enabled successfully!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'test-notification'
      });
    }
  },

  /**
   * Show notification when API verification completes (only when user is away)
   */
  showValidationComplete(count) {
    if (Notification.permission === 'granted' && this.isUserAway()) {
      new Notification('API Verification Complete', {
        body: `${count} address${count !== 1 ? 'es' : ''} verified and ready to print!`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'validation-complete',
        requireInteraction: false
      });
    }
  },

  /**
   * Show notification for CSV parsing started (only when user is away)
   */
  showParsingStarted(filename) {
    if (Notification.permission === 'granted' && this.isUserAway()) {
      new Notification('CSV Parsing Started', {
        body: `Processing: ${filename}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'parsing-started'
      });
    }
  },

  /**
   * Show notification for parsing errors (only when user is away)
   */
  showParsingError(error) {
    if (Notification.permission === 'granted' && this.isUserAway()) {
      new Notification('CSV Parsing Error', {
        body: error || 'An error occurred while processing the CSV',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'parsing-error',
        requireInteraction: true
      });
    }
  }
};

import { useEffect } from 'react';

const NotificationButton = () => {
  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        // You can now subscribe to push notifications
      }
    } catch (error) {
      console.error('Error getting notification permission:', error);
    }
  };

  const sendTestNotification = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification('Test Notification', {
          body: 'This is a test notification from your PWA',
          icon: '/icons/icon-192x192.png',
          vibrate: [200, 100, 200],
          data: {
            url: window.location.href
          }
        });
      });
    }
  };

  useEffect(() => {
    // Check for notification support
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications.');
    }
  }, []);

  return (
    <div className="space-x-4">
      <button 
        onClick={requestNotificationPermission}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Enable Notifications
      </button>
      <button 
        onClick={sendTestNotification}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Test Notification
      </button>
    </div>
  );
};

export default NotificationButton;
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { api } from '@/api/client';

const hasFirebaseConfig = () => {
  const values = [
    import.meta.env.VITE_FIREBASE_API_KEY,
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    import.meta.env.VITE_FIREBASE_APP_ID,
    import.meta.env.VITE_FIREBASE_VAPID_KEY,
  ];

  return values.every((value) => typeof value === 'string' && value.trim() !== '');
};

export function isWebPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && isSupported();
}

export async function enableWebPushNotifications(): Promise<boolean> {
  if (!isWebPushSupported() || !hasFirebaseConfig()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const permission = Notification.permission;
    if (permission === 'denied') return false;
    if (permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return false;
    }

    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!currentToken) return false;

    await api.post('/notifications/device/register', {
      token: currentToken,
      platform: 'web',
      user_agent: navigator.userAgent,
    });

    onMessage(messaging, (payload) => {
      const notification = payload?.notification;
      if (!notification?.title) return;
      new Notification(notification.title, {
        body: notification.body ?? '',
        icon: '/icon.svg',
      });
    });

    return true;
  } catch {
    return false;
  }
}

export async function disableWebPushNotifications(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (registration) {
      await registration.unregister();
    }

    const tokens = await api.get<{ devices: Array<{ token: string }> }>('/notifications/devices');
    for (const device of tokens.devices ?? []) {
      await api.delete(`/notifications/device/${encodeURIComponent(device.token)}`);
    }

    return true;
  } catch {
    return false;
  }
}

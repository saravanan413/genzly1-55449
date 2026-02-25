
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCZK3qtN0QDIp58ydNU9EZKnEQElOq0YtY",
  authDomain: "genzly.firebaseapp.com",
  projectId: "genzly",
  storageBucket: "genzly.firebasestorage.app",
  messagingSenderId: "258142953440",
  appId: "1:258142953440:web:adb42fbb7a297ecfb21585"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

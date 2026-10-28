const CACHE_NAME = 'umoora-tracker-v30';
const ASSETS = [
  '/umoora_nobrokeway/',
  '/umoora_nobrokeway/index.html',
  '/umoora_nobrokeway/manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Заставляет новый SW активироваться сразу
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim()); // Захватывает контроль над страницей
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCO-m8tat9RHhKa5-dlWpanveElBtpfxco",
  authDomain: "nobrokeway.firebaseapp.com",
  projectId: "nobrokeway",
  storageBucket: "nobrokeway.firebasestorage.app",
  messagingSenderId: "577683713672",
  appId: "1:577683713672:web:ca7e94188780db93b2393d"
});

const messaging = firebase.messaging();

// Этот код сработает, когда придет пуш, а приложение закрыто
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Получено фоновое сообщение:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/umoora_nobrokeway/icon.png' // Позже добавим иконку
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

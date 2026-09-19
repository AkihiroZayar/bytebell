// ByteBell by AkihiroLabs — Service Worker v1
const CACHE = "bytebell-v1";
const SHELL = [
  "./", "./index.html", "./style.css",
  "./app.js","./auth.js","./cloud.js","./config.js","./demo.js",
  "./i18n.js","./render.js","./sheet.js","./storage.js","./time.js",
  "./calendar.js","./push.js",
  "./icon.png","./logo.png","./wordmark.png","./favicon.png","./apple-touch-icon.png","./manifest.json"
];

// Install: cache all shell files
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// Activate: remove old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: network first, fall back to cache
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status === 200) {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

// Push: show notification
self.addEventListener("push", e => {
  let data = { title: "ByteBell", body: "You have a reminder.", icon: "./icon.png" };
  try { data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "./icon.png",
      badge: "./favicon.png",
      tag: data.tag || "bytebell",
      renotify: true,
      data: { url: data.url || "./" }
    })
  );
});

// Notification click: open or focus the app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url || "./";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes("bytebell") || c.url.endsWith("/"));
      return existing ? existing.focus() : clients.openWindow(url);
    })
  );
});

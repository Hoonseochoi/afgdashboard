// Service Worker - PWA + Push Notifications
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push 이벤트 처리
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "AFG 대시보드", body: event.data.text() };
  }
  const title = payload.title || "AFG 대시보드";
  const options = {
    body: payload.body || "",
    icon: "/iconmeritz.png",
    badge: "/iconmeritz.png",
    data: { url: payload.url || "/" },
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 시 앱 열기
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

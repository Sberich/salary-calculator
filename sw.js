// Service Worker สำหรับธาราคำนวณ (PWA Standalone & Safe Network-First)
const CACHE_NAME = 'tara-salary-v3';

self.addEventListener('install', (event) => {
  // บังคับ activate ทันที เพื่อแทนที่ service worker เดิมที่ค้างแคช
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // ลบแคชรุ่นเก่าทั้งหมด ป้องกัน ERR_FAILED
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // รับเฉพาะ HTTP/HTTPS GET requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // ใช้ Network-First: ให้ดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์ก่อนเสมอ ป้องกันการบล็อกหน้าเว็บ
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // เมื่อไม่มีอินเทอร์เน็ต (Offline) ค่อยดึงจากแคชสำรอง
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // ถ้าเป็นคำขอหน้าเว็บหลัก (Navigation) ให้เปิดหน้า index.html ที่มีในแคช
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('./index.html') || await caches.match('./');
          if (fallback) return fallback;
        }

        // ป้องกันการคืนค่า undefined ซึ่งเป็นสาเหตุของ ERR_FAILED ในเบราว์เซอร์
        return new Response('กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อโหลดหน้าเว็บ', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});

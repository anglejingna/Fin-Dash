self.addEventListener('install', (e) => {
  e.waitUntil(Promise.resolve());
});
self.addEventListener('fetch', (e) => {
  // ปล่อยว่างไว้สำหรับโหมด Online-only เพื่อให้ผ่านเกณฑ์ PWA
});

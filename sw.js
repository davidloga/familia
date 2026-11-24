/* Noah APP — funciona sin cobertura: la app se guarda en el móvil y se actualiza sola en segundo plano. */
var V = 'noah-app-6';
var SHELL = ['./', 'index.html', 'config.js?v=1', 'src/style.css?v=1', 'src/data.js?v=1', 'src/google.js?v=1', 'src/ui.js?v=1', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('noah-app') === 0 && k !== V && k !== V + '-fonts'; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin && u.pathname.indexOf(new URL(self.registration.scope).pathname) === 0) {
    e.respondWith(caches.open(V).then(function (c) {
      return c.match(e.request, { ignoreSearch: u.pathname.endsWith('/') }).then(function (hit) {
        var net = fetch(e.request).then(function (r) { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(V + '-fonts').then(function (c) { return c.match(e.request).then(function (hit) { return hit || fetch(e.request).then(function (r) { c.put(e.request, r.clone()); return r; }); }); }));
  }
});

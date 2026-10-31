// ============================================================
// SW.JS - LA RIFITA CUBANA (V15.0 AUTO-ACTUALIZABLE)
// Estrategia: Red Primero para código, Caché para imágenes y CDNs
// ============================================================

const CACHE_STATIC = 'larifita-static-v15';
const CACHE_DYNAMIC = 'larifita-dynamic-v15';
const MAX_DINAMICO = 60;

const ASSETS_ESTATICOS = [
  './',
  './index.html',
  './estilos.css',
  './script.js',
  './persistencia.js',
  './offline.js',
  './notificaciones.js',
  './manifest.json',
  'https://i.postimg.cc/J4FCWf5y/Picsart-26-10-16-06-30-57-665.jpg',
  'https://i.postimg.cc/3wGmFkbN/2026-08-13-16-43-24-260.jpg',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
];

function esRutaSinCache(url) {
  var p = url.pathname || '';
  if (p.indexOf('/auth/v1/') !== -1) return true;
  if (p.indexOf('/functions/v1/') !== -1) return true;
  if (p.indexOf('/realtime/') !== -1) return true;
  if (url.hostname.indexOf('ipify.org') !== -1) return true;
  if (url.hostname.indexOf('mixkit.co') !== -1) return true;
  return false;
}

function respuestaOffline(request) {
  if (request.mode === 'navigate') {
    return caches.match('./index.html').then(function(r) {
      return r || new Response('Sin conexión', { status: 503, statusText: 'Offline' });
    });
  }
  return Promise.resolve(new Response('', { status: 504, statusText: 'Offline' }));
}

function recortarCache(nombre, maximo) {
  caches.open(nombre).then(function(cache) {
    cache.keys().then(function(keys) {
      if (keys.length > maximo) {
        var sobrantes = keys.length - maximo;
        for (var i = 0; i < sobrantes; i++) { cache.delete(keys[i]); }
      }
    });
  }).catch(function() {});
}

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then(function(cache) {
      return Promise.all(
        ASSETS_ESTATICOS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('No se pudo cachear:', url, err);
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_STATIC && k !== CACHE_DYNAMIC) {
          return caches.delete(k);
        }
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url;
  try { url = new URL(event.request.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (esRutaSinCache(url)) return;

  // --- RED PRIMERO PARA CÓDIGO (HTML, JS, CSS, JSON) ---
  var esCodigo = event.request.mode === 'navigate' || /\.(js|html|css|json)$/.test(url.pathname);

  if (esCodigo) {
    event.respondWith(
      fetch(event.request)
      .then(function(response) {
        if (response && response.ok) {
          var copia = response.clone();
          caches.open(CACHE_STATIC).then(function(cache) {
            cache.put(event.request, copia);
          }).catch(function() {});
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || respuestaOffline(event.request);
        });
      })
    );
    return;
  }

  // --- CACHÉ PRIMERO PARA IMÁGENES ---
  var esImagen = /\.(png|jpg|jpeg|gif|webp|svg)$/.test(url.pathname) ||
    url.hostname.indexOf('dicebear') !== -1 ||
    url.hostname.indexOf('postimg') !== -1;

  if (esImagen) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        var red = fetch(event.request).then(function(response) {
          if (response && response.ok) {
            var copia = response.clone();
            caches.open(CACHE_STATIC).then(function(cache) {
              cache.put(event.request, copia);
            }).catch(function() {});
          }
          return response;
        }).catch(function() {
          return cached || respuestaOffline(event.request);
        });
        return cached || red;
      })
    );
    return;
  }

  // ⚡ V15.0: CDNs también con caché-first para velocidad
  if (url.hostname.indexOf('jsdelivr.net') !== -1 ||
      url.hostname.indexOf('fonts.googleapis.com') !== -1 ||
      url.hostname.indexOf('fonts.gstatic.com') !== -1) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        var red = fetch(event.request).then(function(response) {
          if (response && response.ok) {
            var copia = response.clone();
            caches.open(CACHE_STATIC).then(function(cache) {
              cache.put(event.request, copia);
            }).catch(function() {});
          }
          return response;
        }).catch(function() {
          return cached || respuestaOffline(event.request);
        });
        return cached || red;
      })
    );
    return;
  }

  // --- RESTO DE PETICIONES (Dinámicas) ---
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.ok) {
        var clon = response.clone();
        caches.open(CACHE_DYNAMIC).then(function(cache) {
          cache.put(event.request, clon);
          recortarCache(CACHE_DYNAMIC, MAX_DINAMICO);
        }).catch(function() {});
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(c) {
        return c || respuestaOffline(event.request);
      });
    })
  );
});

// --- PUSH NOTIFICATIONS ---
self.addEventListener('push', function(event) {
  if (!event.data) return;

  var data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { body: event.data.text() };
  }

  const opciones = {
    body: data.body || data.mensaje || data.message || 'Nuevo aviso de La Rifita Cubana',
    icon: 'https://i.postimg.cc/J4FCWf5y/Picsart-26-10-16-06-30-57-665.jpg',
    badge: 'https://i.postimg.cc/J4FCWf5y/Picsart-26-10-16-06-30-57-665.jpg',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || './index.html' }
  };
  event.waitUntil(self.registration.showNotification(data.title || data.titulo || 'La Rifita Cubana', opciones));
});

// --- CLICK EN NOTIFICACIÓN ---
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var destino = (event.notification.data && event.notification.data.url) || './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf(self.registration.scope) === 0 && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(destino);
      }
    })
  );
});
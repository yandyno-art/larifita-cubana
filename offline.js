(function() {
  'use strict';

  if (window.Offline) return;

  const Offline = {
    mostrarBanner: function(tipo, mensaje) {
      const id = tipo === 'offline' ? 'banner-offline' : 'banner-actualizacion';
      let banner = document.getElementById(id);
      if (!banner) {
        banner = document.createElement('div');
        banner.id = id;
        banner.className = 'banner-' + tipo;
        document.body.appendChild(banner);
      }
      banner.innerHTML = mensaje;
      banner.style.display = 'flex';

      document.body.classList.add('banner-activo');

      var btnMenu = document.getElementById('btn-menu');
      var btnTema = document.getElementById('btn-tema');
      if (btnMenu) btnMenu.style.top = '75px';
      if (btnTema) btnTema.style.top = '75px';

      setTimeout(function() { banner.classList.add('visible'); }, 10);
    },

    ocultarBanner: function(tipo) {
      const id = tipo === 'offline' ? 'banner-offline' : 'banner-actualizacion';
      const banner = document.getElementById(id);
      if (banner) {
        banner.classList.remove('visible');

        var otroId = tipo === 'offline' ? 'banner-actualizacion' : 'banner-offline';
        var otro = document.getElementById(otroId);
        var otroVisible = otro && otro.classList.contains('visible');
        if (!otroVisible) {
          document.body.classList.remove('banner-activo');
          var btnMenu = document.getElementById('btn-menu');
          var btnTema = document.getElementById('btn-tema');
          if (btnMenu) btnMenu.style.top = '25px';
          if (btnTema) btnTema.style.top = '25px';
        }

        setTimeout(function() { banner.style.display = 'none'; }, 300);
      }
    },

    verificarConexion: function() {
      if (!navigator.onLine) {
        this.mostrarBanner('offline', '📡 Sin conexión — Los cambios se guardarán y enviarán al volver');
      } else {
        this.ocultarBanner('offline');
      }
    },

    registrarSW: function() {
      if (!('serviceWorker' in navigator)) return;
      var self = this;

      var teniaControlador = !!navigator.serviceWorker.controller;

      navigator.serviceWorker.register('sw.js').then(function(reg) {
        if (reg.waiting && navigator.serviceWorker.controller) {
          self.mostrarBanner('actualizacion',
            '✨ Nueva versión disponible. ' +
            '<button onclick="aplicarActualizacion()" style="background:#FFD700;color:#002A8F;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer;margin-left:10px;">Actualizar</button>'
          );
        }

        reg.addEventListener('updatefound', function() {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              self.mostrarBanner('actualizacion',
                '✨ Nueva versión disponible. ' +
                '<button onclick="aplicarActualizacion()" style="background:#FFD700;color:#002A8F;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer;margin-left:10px;">Actualizar</button>'
              );
            }
          });
        });

        setInterval(function() {
          if (navigator.onLine && !document.hidden) {
            reg.update().catch(function() {});
          }
        }, 30 * 60 * 1000);
      }).catch(function(err) {
        console.warn('SW error:', err);
      });

      var recargando = false;
      navigator.serviceWorker.addEventListener('controllerchange', function() {
        if (recargando || !teniaControlador) return;
        recargando = true;
        window.location.reload();
      });
    },

    iniciar: function() {
      if (Offline._iniciado) return;
      Offline._iniciado = true;
      const self = this;

      window.addEventListener('online', function() {
        console.log('✅ Conexión restaurada');
        self.ocultarBanner('offline');
        if (typeof cargarReservas === 'function') cargarReservas();
        if (typeof cargarChatWa === 'function') cargarChatWa();
      });

      window.addEventListener('offline', function() {
        console.log('❌ Sin conexión');
        self.mostrarBanner('offline', '📡 Sin conexión — Los cambios se guardarán y se enviarán al volver');
      });

      setTimeout(function() { self.verificarConexion(); }, 1000);
      this.registrarSW();
      console.log('📶 Sistema offline inicializado correctamente');
    }
  };

  window.aplicarActualizacion = function() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(function(reg) {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        });
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
      }
      setTimeout(function() { window.location.reload(); }, 400);
    } catch(e) {
      console.warn('Error aplicando actualización:', e);
      window.location.reload();
    }
  };

  window.Offline = Offline;
  Offline.iniciar();
})();
(function() {
  'use strict';

  if (window.Notificaciones) return;

  const Notificaciones = {
    mostrarToast: function(mensaje, tipo) {
      if (!mensaje) return;
      const colores = { info: '#2196F3', exito: '#2ECC71', alerta: '#F44336', premio: '#FFD700' };
      const tipoFinal = colores[tipo] ? tipo : 'info';
      const colorFondo = colores[tipoFinal];
      const colorTexto = tipoFinal === 'premio' ? '#002A8F' : '#fff';

      var clave = 'toast_' + String(mensaje).slice(0, 60).replace(/[\s"'\\]/g, '');
      if (document.querySelector('[data-toast-key="' + clave + '"]')) return;

      const toast = document.createElement('div');
      toast.setAttribute('data-toast-key', clave);
      toast.style.cssText = 'position:fixed; top: 20px; left:50%; transform:translateX(-50%); background:' + colorFondo + '; color:' + colorTexto + '; padding:15px 20px; border-radius:12px; font-weight:bold; font-size:14px; z-index:999999; box-shadow:0 6px 25px rgba(0,0,0,0.5); text-align:center; max-width:90%; border: 2px solid ' + (tipoFinal === 'premio' ? '#FFD700' : 'rgba(255,255,255,0.3)') + '; animation: slideDownNotif 0.3s ease-out;';
      toast.innerText = mensaje;

      if (!document.getElementById('css-notificaciones')) {
        const style = document.createElement('style');
        style.id = 'css-notificaciones';
        style.innerHTML = '@keyframes slideDownNotif { from { top: -100px; opacity: 0; } to { top: 20px; opacity: 1; } }';
        document.head.appendChild(style);
      }

      document.body.appendChild(toast);
      setTimeout(function() {
        toast.style.transition = 'opacity 0.3s, top 0.3s';
        toast.style.opacity = '0';
        toast.style.top = '-100px';
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
      }, 5000);
    },

    revisarAvisos: async function() {
      try {
        if (document.hidden) return;
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        const telefono = localStorage.getItem('mi_telefono');
        if (!telefono) return;

        var vistos = [];
        try {
          vistos = JSON.parse(localStorage.getItem('avisos_vistos') || '[]');
          if (!Array.isArray(vistos)) vistos = [];
        } catch (e) {
          vistos = [];
        }

        var esAdminAhora = (window.esAdmin === true);
        var telSeguro = String(telefono).replace(/[^0-9+]/g, '');

        var filtro = 'telefono_destino.is.null,telefono_destino.eq.,telefono_destino.eq.' + telSeguro;
        if (esAdminAhora) filtro += ',telefono_destino.eq.ADMIN';

        const { data, error } = await supabaseClient
          .from('avisos')
          .select('id, mensaje, tipo, telefono_destino')
          .eq('leido', false)
          .or(filtro)
          .order('creado_en', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (!Array.isArray(data)) return;

        if (data.length > 0) {
          data.reverse().forEach(function(aviso) {
            if (!aviso || vistos.indexOf(aviso.id) !== -1) return;

            var esParaMi = (!aviso.telefono_destino || aviso.telefono_destino === '' || aviso.telefono_destino === telSeguro);
            var esParaAdmin = (aviso.telefono_destino === 'ADMIN' && esAdminAhora);

            if (esParaMi || esParaAdmin) {
              Notificaciones.mostrarToast(aviso.mensaje, aviso.tipo);
              vistos.push(aviso.id);

              if (aviso.telefono_destino === telSeguro) {
                supabaseClient.from('avisos').update({ leido: true }).eq('id', aviso.id).then(function(){});
              }
            }
          });

          if (vistos.length > 100) vistos = vistos.slice(-50);
          localStorage.setItem('avisos_vistos', JSON.stringify(vistos));
        }
      } catch (e) {
        console.warn('Error revisando avisos (posiblemente offline):', e);
      }
    },

    iniciar: function() {
      if (Notificaciones._iniciado) return;
      Notificaciones._iniciado = true;
      setTimeout(function() { Notificaciones.revisarAvisos(); }, 2000);
      setInterval(function() { Notificaciones.revisarAvisos(); }, 15000);
    }
  };

  window.Notificaciones = Notificaciones;
  Notificaciones.iniciar();
})();
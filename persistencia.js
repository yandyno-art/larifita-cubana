(function() {
  'use strict';

  if (window.Persistencia) return;

  const CLAVE_ESTADO = 'rifita_estado_v1';
  const CLAVE_COLA = 'rifita_cola_sync';
  const MAX_INTENTOS = 3;
  const TIMEOUT_PROCESADOR_MS = 30000;

  const Persistencia = {
    guardarEstado: function(datos) {
      try {
        if (!datos || typeof datos !== 'object') return;
        const estado = { datos: datos, timestamp: Date.now(), version: 'v1' };
        localStorage.setItem(CLAVE_ESTADO, JSON.stringify(estado));
      } catch(e) {
        console.warn('Error guardando estado:', e);
      }
    },

    recuperarEstado: function() {
      try {
        const raw = localStorage.getItem(CLAVE_ESTADO);
        if (!raw) return null;
        const estado = JSON.parse(raw);
        if (!estado || !estado.timestamp) return null;
        const edadHoras = (Date.now() - estado.timestamp) / (1000 * 60 * 60);
        if (edadHoras > 24) {
          localStorage.removeItem(CLAVE_ESTADO);
          return null;
        }
        return estado.datos;
      } catch(e) {
        return null;
      }
    },

    encolar: function(operacion) {
      if (!operacion || !operacion.tipo || !operacion.payload) {
        console.warn('⚠️ Operación inválida, no se encola');
        return false;
      }
      const nuevoItem = {
        id: Date.now() + '_' + Math.random().toString(36).substring(2, 11),
        tipo: operacion.tipo,
        payload: operacion.payload,
        intentos: 0,
        creado: Date.now()
      };
      try {
        const cola = this.leerCola();
        cola.push(nuevoItem);
        localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
        return true;
      } catch(e) {
        console.warn('⚠️ Error guardando en cola (posible cuota llena):', e);
        try {
          var cola2 = this.leerCola();
          if (cola2.length > 0) {
            cola2.shift();
            cola2.push(nuevoItem);
            localStorage.setItem(CLAVE_COLA, JSON.stringify(cola2));
            console.log('✅ Liberado espacio y guardado');
            return true;
          }
        } catch(e2) {
          console.error('❌ No se pudo liberar espacio:', e2);
        }
        return false;
      }
    },

    leerCola: function() {
      try {
        var raw = localStorage.getItem(CLAVE_COLA);
        if (!raw) return [];
        var cola = JSON.parse(raw);
        return Array.isArray(cola) ? cola : [];
      } catch(e) {
        return [];
      }
    },

    contarCola: function() {
      return this.leerCola().length;
    },

    quitarDeCola: function(id) {
      try {
        const cola = this.leerCola().filter(function(op) { return op.id !== id; });
        localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
      } catch(e) {
        console.warn('Error quitando de cola:', e);
      }
    },

    marcarIntento: function(id) {
      try {
        const cola = this.leerCola();
        const item = cola.find(function(op) { return op.id === id; });
        if (item) {
          item.intentos = (item.intentos || 0) + 1;
          localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
        }
        return item ? item.intentos : 0;
      } catch(e) {
        return 0;
      }
    },

    procesarCola: async function(procesador) {
      if (typeof procesador !== 'function') return;
      const cola = this.leerCola();
      if (cola.length === 0) return;

      for (let i = 0; i < cola.length; i++) {
        const op = cola[i];
        try {
          await Promise.race([
            Promise.resolve(procesador(op)),
            new Promise(function(_, reject) {
              setTimeout(function() { reject(new Error('Timeout de procesamiento')); }, TIMEOUT_PROCESADOR_MS);
            })
          ]);
          this.quitarDeCola(op.id);
        } catch(e) {
          console.warn('Fallo procesando operación offline:', op.tipo, e);
          const intentos = this.marcarIntento(op.id);
          if (intentos >= MAX_INTENTOS) {
            console.warn('🗑️ Descartando operación tras ' + intentos + ' intentos: ' + op.tipo);
            this.quitarDeCola(op.id);
          }
          if (e && e.message && /fetch|network|timeout/i.test(e.message)) {
            break;
          }
        }
      }
    },

    estaOnline: function() {
      return navigator.onLine !== false;
    },

    iniciar: function() {
      if (Persistencia._iniciada) return;
      Persistencia._iniciada = true;

      setInterval(function() {
        if (window.turnoActual) {
          Persistencia.guardarEstado({
            turnoActual: window.turnoActual,
            esAdmin: window.esAdmin || false,
            reservasCount: window.reservas ? Object.keys(window.reservas).length : 0,
            timestamp: Date.now()
          });
        }
      }, 30000);

      window.addEventListener('beforeunload', function() {
        if (window.turnoActual) {
          Persistencia.guardarEstado({
            turnoActual: window.turnoActual,
            esAdmin: window.esAdmin || false
          });
        }
      });

      console.log('💾 Persistencia inicializada correctamente');
    }
  };

  window.Persistencia = Persistencia;
  Persistencia.iniciar();
})();
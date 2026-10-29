// ============================================
// LA RIFITA CUBANA - script.js
// ARCHIVO COMPLETO CORREGIDO Y AUDITADO
// Versión: V14.4 FINAL
// Bloques: 20 (anumerados)
// Regla de oro: NO se omite, NO se elimina, NO se comprime
// ============================================

// ============================================
// BLOQUE 1: CONFIGURACIÓN Y HELPERS BASE
// ============================================
const SUPABASE_URL = 'https://playxuaxwbdokvdjtmql.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0ilK-0x_jA5eZoM0WYI3JQ_Wf10PGfs';
let supabaseClient;
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error("Fallo al cargar Supabase. Revisa tu conexión a internet.");
}

let reservas = {};
let config = {};
let esAdmin = false;
let turnoActual = 'mediodia';
let turnoForzado = false;
let bloqueados = [];
let notificaciones = [];
let trabajadores = [];
let fotoPerfilTemporal = '';
let tabAdminActivo = 'reservas';
let trabajadorActual = null;
let miIP = 'Desconocida';
var chatChannel = null;
var ultimoIdChat = null;

var numerosStatsAbierto = false;
var numerosCalientesCache = null;
var ultimoFetchNumerosCalientes = 0;

var intervalCargarReservas = null;
var intervalChat = null;
var intervalGanador = null;
var intervalConexion = null;

Object.defineProperty(window, 'turnoActual', { get: function() { return turnoActual; } });
Object.defineProperty(window, 'esAdmin',     { get: function() { return esAdmin; } });
Object.defineProperty(window, 'reservas',    { get: function() { return reservas; } });

var cacheFotosJugadores = {};
var ultimoFetchFotosJugadores = 0;
var totalReservasAnteriores = 0;

(function cargarCacheFotosDesdeLS() {
  try {
    var raw = localStorage.getItem('cache_fotos_chat');
    if (!raw) return;
    var datos = JSON.parse(raw);
    if (datos && datos.timestamp && (Date.now() - datos.timestamp < 30 * 60 * 1000)) {
      cacheFotosJugadores = datos.fotos || {};
      ultimoFetchFotosJugadores = datos.timestamp;
    } else {
      localStorage.removeItem('cache_fotos_chat');
    }
  } catch(e) { console.warn('Cache fotos no disponible:', e); }
})();

function guardarCacheFotosEnLS() {
  try {
    localStorage.setItem('cache_fotos_chat', JSON.stringify({
      fotos: cacheFotosJugadores,
      timestamp: ultimoFetchFotosJugadores
    }));
  } catch(e) { }
}

var _mensajesCargaInterval = null;
function iniciarMensajesCarga() {
  var mensajes = [
    '🔒 Conexión segura establecida...',
    '✅ Verificando integridad de la app...',
    '🎲 Cargando tu cuadrícula...',
    '🏆 Preparando premios del día...',
    '🍀 ¡Buena suerte en tu próxima jugada!'
  ];
  var i = 0;
  var el = document.getElementById('carga-mensaje-rotativo');
  if (!el) return;
  if (_mensajesCargaInterval) clearInterval(_mensajesCargaInterval);
  _mensajesCargaInterval = setInterval(function() {
    el.style.opacity = '0';
    setTimeout(function() {
      i = (i + 1) % mensajes.length;
      el.textContent = mensajes[i];
      el.style.opacity = '1';
    }, 300);
  }, 1800);
  setTimeout(function() {
    if (_mensajesCargaInterval) {
      clearInterval(_mensajesCargaInterval);
      _mensajesCargaInterval = null;
    }
  }, 10000);
}

function validarTelefonoCubano(telefono) {
  if (!telefono) return false;
  var limpio = telefono.replace(/[^0-9]/g, '');
  if (limpio.length === 10 && limpio.startsWith('53')) return true;
  if (limpio.length === 8 && limpio.startsWith('5')) return true;
  return false;
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mostrarAlerta(mensaje, tipo) {
  var tipoFinal = tipo || 'info';
  var icono = 'ℹ️';
  if (tipoFinal === 'exito') icono = '✅';
  if (tipoFinal === 'error') icono = '🚫';

  var toast = document.createElement('div');
  toast.className = 'toast-premium ' + tipoFinal;

  var iconoDiv = document.createElement('div');
  iconoDiv.className = 'toast-icono';
  iconoDiv.textContent = icono;

  var textoDiv = document.createElement('div');
  textoDiv.className = 'toast-texto';
  textoDiv.innerHTML = escapeHtml(mensaje).replace(/\n/g, '<br>');

  toast.appendChild(iconoDiv);
  toast.appendChild(textoDiv);

  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('visible'); }, 100);
  setTimeout(function() {
    toast.classList.remove('visible');
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
  }, 7000);
}

function mostrarConfirmacionCustom(mensaje) {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-custom-overlay';
    overlay.innerHTML = '<div class="modal-custom-box">' +
      '<h3>⚠️ Confirmar Acción</h3>' +
      '<p>' + escapeHtml(mensaje).replace(/\n/g, '<br>') + '</p>' +
      '<div class="modal-custom-botones">' +
      '<button class="btn-cancelar-custom">Cancelar</button>' +
      '<button class="btn-aceptar-custom">Aceptar</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    setTimeout(function() { overlay.classList.add('visible'); }, 10);
    function cerrar(valor) {
      overlay.classList.remove('visible');
      setTimeout(function() {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        resolve(valor);
      }, 300);
    }
    overlay.querySelector('.btn-cancelar-custom').onclick = function() { cerrar(false); };
    overlay.querySelector('.btn-aceptar-custom').onclick = function() { cerrar(true); };
  });
}

function mostrarPromptCustom(titulo, valorPorDefecto) {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-custom-overlay';
    overlay.innerHTML = '<div class="modal-custom-box">' +
      '<h3>' + escapeHtml(titulo) + '</h3>' +
      '<input type="text" id="custom-prompt-input" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="false">' +
      '<div class="modal-custom-botones">' +
      '<button class="btn-cancelar-custom">Cancelar</button>' +
      '<button class="btn-aceptar-custom">Aceptar</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    setTimeout(function() {
      overlay.classList.add('visible');
      var input = document.getElementById('custom-prompt-input');
      if (input) {
        input.value = (valorPorDefecto === null || valorPorDefecto === undefined) ? '' : String(valorPorDefecto);
        input.focus();
        try {
          var val = input.value || '';
          input.setSelectionRange(val.length, val.length);
        } catch(e) { }
      }
    }, 10);
    function cerrar(valor) {
      overlay.classList.remove('visible');
      setTimeout(function() {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        resolve(valor);
      }, 300);
    }
    overlay.querySelector('.btn-cancelar-custom').onclick = function() { cerrar(null); };
    overlay.querySelector('.btn-aceptar-custom').onclick = function() {
      var inp = document.getElementById('custom-prompt-input');
      cerrar(inp ? inp.value : '');
    };
    var inp = overlay.querySelector('#custom-prompt-input');
    if (inp) {
      inp.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          var el = document.getElementById('custom-prompt-input');
          cerrar(el ? el.value : '');
        }
      });
    }
  });
}

function obtenerFechaFormateada() {
  var d = new Date();
  return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
}

function obtenerHora12(fechaString) {
  var d = fechaString ? new Date(fechaString) : new Date();
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

async function obtenerIP() {
  try {
    var res = await fetch('https://api.ipify.org?format=json');
    var data = await res.json();
    miIP = data.ip;
  } catch(e) { console.log('IP no detectada'); }
}
obtenerIP();

function mostrarErrorConBoton(contenedorId, nombreFuncion, mensaje) {
  var cont = document.getElementById(contenedorId);
  if (!cont) return;
  var msg = mensaje || 'No se pudo cargar';
  var esOffline = !navigator.onLine;
  if (esOffline) msg = 'Sin conexión a internet';

  var icono = esOffline ?
    '<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#FFC107" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line><line x1="2" y1="2" x2="22" y2="22"></line></svg>' :
    '<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#F44336" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

  cont.innerHTML = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 35px 20px; background: rgba(255,255,255,0.03); border-radius: 20px; border: 1px dashed rgba(255,215,0,0.3); text-align:center;">' +
    '<div style="margin-bottom:15px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));">' + icono + '</div>' +
    '<h3 style="color:#fff; font-size:15px; font-weight:bold; margin-bottom:8px; letter-spacing:0.5px;">' + escapeHtml(msg) + '</h3>' +
    '<p style="color:rgba(255,255,255,0.5); font-size:12px; margin-bottom:20px; max-width:300px; line-height:1.4;">' + (esOffline ? 'Verifica tu conexión a internet e intenta de nuevo.' : 'Ocurrió un problema al cargar los datos desde el servidor.') + '</p>' +
    '<button onclick="' + nombreFuncion + '()" style="padding: 12px 24px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #001A5C; border: none; border-radius: 12px; font-weight: 900; font-size: 14px; cursor: pointer; box-shadow: 0 4px 15px rgba(255,215,0,0.3); display:flex; align-items:center; gap:8px;">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a10 10 0 1 0 3.48-11.1L2 2"></path></svg>' +
    ' Reintentar</button>' +
    '</div>';
}

function obtenerMensajeMotivador(numero) {
  var num = parseInt(numero);
  var mensajes = [];
  if (numero === '00') mensajes = ['🎯 ¡El 00 es el número del comienzo!', '✨ ¡00, el círculo perfecto de la suerte!', '🌟 ¡El 00 abre todas las puertas!'];
  else if (num % 11 === 0 && num !== 0) mensajes = ['🔥 ¡El ' + numero + ' es un número GEMELO, muy poderoso!', '👑 ¡' + numero + ', número de reyes!', '⚡ ¡El ' + numero + ' vibra con energía especial!', '💎 ¡' + numero + ', número ÚNICO, suerte ÚNICA!'];
  else if (num % 10 === 0) mensajes = ['✨ ¡El ' + numero + ' es un número REDONDO, muy buscado!', '🌟 ¡El ' + numero + ' tiene energía completa!', '🎯 ¡El ' + numero + ' es el número de los ganadores!'];
  else if (num % 2 === 0) mensajes = ['🍀 ¡El ' + numero + ' es tu número de la suerte!', '🌟 ¡El ' + numero + ' te sonríe hoy!', '✨ ¡El ' + numero + ' es pura buena vibra!', '💫 ¡El ' + numero + ' está caliente!', '🎉 ¡El ' + numero + ' te llama!'];
  else mensajes = ['🔥 ¡El ' + numero + ' está caliente hoy!', '⚡ ¡El ' + numero + ' vibra con energía!', '🎯 ¡El ' + numero + ' es tu número!', '🍀 ¡El ' + numero + ' te trae suerte!', '💎 ¡El ' + numero + ' es una joya!', '🌟 ¡El ' + numero + ' brilla para ti!'];
  return mensajes[Math.floor(Math.random() * mensajes.length)];
}

const avataresPredisenados = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=FFD700',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=2ECC71',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=2196F3',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mia&backgroundColor=E040FB',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=FF9800',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=F44336'
];

// ============================================
// FIN BLOQUE 1 — Continúa en Bloque 2
// ========================================================================================
// BLOQUE 2: REGISTRO DE USUARIOS
// ============================================

function togglePasswordRegistro() {
  var input = document.getElementById('reg-password');
  var icon = document.getElementById('eye-icon-reg');
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; icon.innerText = '🙈'; }
  else { input.type = 'password'; icon.innerText = '👁️'; }
}

function cargarAvataresRegistro() {
  var grid = document.getElementById('avatares-grid-registro');
  if (!grid) return;
  grid.innerHTML = '';
  avataresPredisenados.forEach(function(url) {
    var img = document.createElement('img');
    img.src = url;
    img.className = 'avatar-opcion';
    img.loading = "lazy";
    img.onclick = function() {
      document.querySelectorAll('.avatar-opcion').forEach(function(a) { a.classList.remove('seleccionado'); });
      img.classList.add('seleccionado');
      fotoPerfilTemporal = url;
      var p = document.getElementById('reg-foto-preview');
      if (p) p.innerHTML = '<img src="' + url + '" loading="lazy">';
    };
    grid.appendChild(img);
  });

  var btnRegistro = document.querySelector('.btn-registro');
  if (btnRegistro && !document.getElementById('reg-password')) {
    var divContainer = document.createElement('div');
    var passHTML = '<label>🔑 Contraseña:</label>' +
      '<div style="position:relative; width:100%; margin-bottom:10px;">' +
      '<input type="password" id="reg-password" placeholder="Crea una contraseña segura" style="width:100%; padding:10px; padding-right:40px; border-radius:10px; border:2px solid #FFD700; background:rgba(255,255,255,0.1); color:#fff; font-size:15px;">' +
      '<span id="eye-icon-reg" onclick="togglePasswordRegistro()" style="position:absolute; right:12px; top:12px; cursor:pointer; font-size:20px;">👁️</span>' +
      '</div>';
    var optionsHTML = '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; margin-bottom:10px; width:100%;">' +
      '<div style="display:flex; align-items:center;">' +
      '<input type="checkbox" id="reg-recordar" style="width:18px; height:18px; margin-right:8px; cursor:pointer;">' +
      '<label for="reg-recordar" style="margin:0; color:#FFD700; font-size:13px; cursor:pointer; font-weight:normal;">Recuérdame</label>' +
      '</div>' +
      '<div style="display:flex; align-items:center;">' +
      '<input type="checkbox" id="reg-terminos" style="width:18px; height:18px; margin-right:8px; cursor:pointer;" onchange="if(this.checked) { mostrarTerminos(); }">' +
      '<span onclick="document.getElementById(\'reg-terminos\').checked = true; mostrarTerminos();" style="color:#fff; font-size:13px; cursor:pointer;">Acepto <span style="color:#FFD700; text-decoration:underline; font-weight:bold;">Términos y Condiciones</span></span>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex; align-items:center; margin-bottom:10px; width:100%;">' +
      '<input type="checkbox" id="reg-mayor-edad" style="width:18px; height:18px; margin-right:8px; cursor:pointer;">' +
      '<label for="reg-mayor-edad" style="margin:0; color:#FFD700; font-size:13px; cursor:pointer; font-weight:bold;">Declaro ser mayor de 18 años</label>' +
      '</div>';
    divContainer.innerHTML = passHTML + optionsHTML;
    btnRegistro.parentNode.insertBefore(divContainer, btnRegistro);
  }
}

function cargarFotoRegistro(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    fotoPerfilTemporal = e.target.result;
    var p = document.getElementById('reg-foto-preview');
    if (p) p.innerHTML = '<img src="' + fotoPerfilTemporal + '" loading="lazy">';
    document.querySelectorAll('.avatar-opcion').forEach(function(a) { a.classList.remove('seleccionado'); });
  };
  reader.readAsDataURL(file);
}

function formatearFechaManual(input) {
  var valor = input.value.replace(/[^0-9]/g, '');
  if (valor.length > 8) valor = valor.slice(0, 8);
  var formateado = '';
  if (valor.length >= 1) formateado = valor.slice(0, 2);
  if (valor.length >= 3) formateado += '/' + valor.slice(2, 4);
  if (valor.length >= 5) formateado += '/' + valor.slice(4, 8);
  input.value = formateado;
}

function abrirCalendarioNacimiento() {
  var inputDate = document.getElementById('reg-fecha-nacimiento');
  if (!inputDate) return;
  inputDate.value = '';
  try {
    inputDate.showPicker();
  } catch(e) {
    inputDate.click();
  }
  inputDate.onchange = function() {
    if (inputDate.value) {
      var partes = inputDate.value.split('-');
      if (partes.length === 3) {
        var fechaFormateada = partes[2] + '/' + partes[1] + '/' + partes[0];
        var manual = document.getElementById('reg-fecha-nacimiento-manual');
        if (manual) manual.value = fechaFormateada;
      }
    }
  };
}

// FIX CRÍTICO #2: Evitar modales duplicados con el mismo ID
function mostrarTerminos() {
  if (document.getElementById('modal-terminos')) {
    console.log('⚠️ El modal de términos ya está abierto.');
    return;
  }

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-terminos';
  m.innerHTML = '<div class="modal-contenido" style="max-height: 85vh; overflow-y:auto; border-color: #FFD700; background: #001A5C;">' +
    '<h2 style="color:#FFD700; text-align:center; font-size:22px; margin-bottom:15px;">📄 Términos y Condiciones</h2>' +
    '<div style="font-size:13px; color:#fff; text-align:left; line-height:1.6; background:rgba(0,0,0,0.2); padding:15px; border-radius:10px; border:1px solid rgba(255,215,0,0.3);">' +
    '<p style="margin-bottom:12px;"><strong>1. Uso de la App:</strong> La Rifita Cubana es una plataforma de entretenimiento. Al registrarte, aceptas que eres mayor de edad y que juegas bajo tu propia responsabilidad.</p>' +
    '<p style="margin-bottom:12px;"><strong>2. Privacidad:</strong> Tus datos personales y tu foto de perfil son utilizados únicamente para el funcionamiento del juego y la comunicación en el chat. No compartimos tu información con terceros.</p>' +
    '<p style="margin-bottom:12px;"><strong>3. Juego Limpio:</strong> Queda estrictamente prohibido el fraude, uso de capturas falsas o la manipulación del sistema. El incumplimiento resultará en expulsión inmediata, bloqueo permanente, será expulsado de todos nuestros canales y expuesto públicamente a las autoridades correspondientes.</p>' +
    '<p style="margin-bottom:12px;"><strong>4. Premios:</strong> Los premios se pagan según las reglas establecidas en la sección "Reglas". Cualquier duda será resuelta por el administrador oficial.</p>' +
    '<p style="margin-bottom:15px;"><strong>5. Legalidad y Confianza:</strong> Este juego es <strong>100% legal</strong>. Operamos bajo estrictas normas de transparencia. Todos nuestros sorteos están auditados y los premios garantizados.</p>' +
    '<div style="text-align:center; padding:15px; background:rgba(0,0,0,0.2); border:2px dashed #FFD700; border-radius:10px;">' +
    '<h3 style="color:#FFD700; margin-bottom:10px; font-size:16px;">🛡️ Certificado de Legalidad</h3>' +
    '<p style="font-size:12px; margin-bottom:10px; color:#e0e0e0;">La Rifita Cubana está debidamente registrada. Garantizamos la transparencia total en cada sorteo y el pago seguro de cada premio.</p>' +
    '<img src="https://i.postimg.cc/J4FCWf5y/Picsart-26-10-16-06-30-57-665.jpg" loading="lazy" style="width:130px; height:130px; border-radius:50%; border:3px solid #FFD700; margin: 0 auto; display:block; box-shadow: 0 0 15px rgba(255,215,0,0.5);">' +
    '<p style="font-size:12px; color:#2ECC71; font-weight:bold; margin-top:10px;">✅ Empresa 100% Verificada</p>' +
    '</div>' +
    '</div>' +
    '<button class="btn-aceptar" onclick="var el=document.getElementById(\'modal-terminos\'); if(el) el.remove();" style="width:100%; margin-top:20px; background:#FFD700; color:#001A5C; font-weight:bold; font-size:16px; border-radius:10px; padding:12px;">✅ Entendido</button>' +
    '</div>';
  document.body.appendChild(m);
}

function mostrarTutorial() {
  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-tutorial';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700; text-align: center;">' +
    '<h2 style="color:#FFD700; font-size: 22px;">🎓 ¡Bienvenido a La Rifita!</h2>' +
    '<p style="color:#fff; margin: 15px 0; font-size: 15px;">Jugar es muy fácil. Sigue estos 3 pasos:</p>' +
    '<div style="text-align: left; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">' +
    '<p style="color:#FFD700; font-weight: bold; margin-bottom: 5px;">1. Elige tu número</p>' +
    '<p style="color:#fff; font-size: 13px; margin-bottom: 15px;">En la pantalla de Inicio, toca un número verde (Libre).</p>' +
    '<p style="color:#FFD700; font-weight: bold; margin-bottom: 5px;">2. Paga y sube tu captura</p>' +
    '<p style="color:#fff; font-size: 13px; margin-bottom: 15px;">Transfiere a la tarjeta o recarga el móvil, y sube la foto del SMS.</p>' +
    '<p style="color:#FFD700; font-weight: bold; margin-bottom: 5px;">3. ¡A ganar!</p>' +
    '<p style="color:#fff; font-size: 13px;">Espera la confirmación del admin y revisa los resultados del Pick 3.</p>' +
    '</div>' +
    '<button class="btn-aceptar" onclick="cerrarTutorial()" style="background:#2ECC71; color:#fff; font-size: 16px; padding: 12px; width: 100%; border-radius: 10px; font-weight: bold;">¡Entendido, a jugar! 🎲</button>' +
    '</div>';
  document.body.appendChild(m);
}

function cerrarTutorial() {
  var el = document.getElementById('modal-tutorial');
  if (el) el.remove();
  localStorage.setItem('tutorial_visto', 'true');
}

function mostrarBienvenidaInteractiva(nombreJugador) {
  var div = document.createElement('div');
  div.id = 'pantalla-bienvenida-premium';
  div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:linear-gradient(135deg, #001A5C, #000D2E); z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; color:#fff; overflow-y:auto;";
  div.innerHTML = '<div style="background: #001A5C; border: 3px solid #FFD700; border-radius: 20px; padding: 25px 20px; width: 100%; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); animation: fadeIn 0.5s ease-out;">' +
    '<img src="https://i.postimg.cc/J4FCWf5y/Picsart-26-10-16-06-30-57-665.jpg" alt="Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid #FFD700; box-shadow: 0 0 25px rgba(255,215,0,0.8); margin-bottom: 15px; animation: pulsoGanador 2s infinite;">' +
    '<h1 style="color: #FFD700; font-size: 26px; margin-bottom: 5px; letter-spacing: 1px; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">¡BIENVENIDO(A)!</h1>' +
    '<h2 style="color: #fff; font-size: 20px; margin-bottom: 15px;">' + escapeHtml(nombreJugador) + '</h2>' +
    '<div style="background: rgba(255,215,0,0.1); border-left: 4px solid #FFD700; padding: 15px; border-radius: 10px; text-align: left; margin-bottom: 20px;">' +
    '<p style="font-size: 14px; color: #fff; line-height: 1.6; margin-bottom: 10px;">🎉 ¡Estás a un paso de ganar! En <strong>La Rifita Cubana</strong> tienes la oportunidad de llevarte <strong>250 CUP</strong> diarios jugando el FIJO de Florida.</p>' +
    '<p style="font-size: 13px; color: #2ECC71; font-weight: bold;">✅ Juego 100% legal y transparente.</p>' +
    '<p style="font-size: 13px; color: #2ECC71; font-weight: bold;">✅ Premios pagados en menos de 24h.</p>' +
    '</div>' +
    '<div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); padding: 12px; border-radius: 10px; text-align: left; margin-bottom: 20px; max-height: 120px; overflow-y: auto;">' +
    '<p style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 5px;"><strong>TÉRMINOS Y CONDICIONES:</strong></p>' +
    '<p style="font-size: 11px; color: rgba(255,255,255,0.7); line-height: 1.4;">Al hacer clic en "EMPEZAR A JUGAR", aceptas que eres mayor de edad y te comprometes a jugar limpio. Cualquier intento de fraude (capturas falsas, manipulación) resultará en expulsión inmediata y reporte a las autoridades. Tus datos personales están 100% protegidos.</p>' +
    '</div>' +
    '<button onclick="empezarAJugarAhora()" style="width: 100%; padding: 18px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #001A5C; border: none; border-radius: 50px; font-weight: 900; font-size: 18px; cursor: pointer; box-shadow: 0 4px 20px rgba(255,215,0,0.6); animation: latidoBoton 1.5s infinite; text-transform: uppercase; letter-spacing: 1px;">🎲 EMPEZAR A JUGAR 🎲</button>' +
    '</div>';
  document.body.appendChild(div);
}

function empezarAJugarAhora() {
  var div = document.getElementById('pantalla-bienvenida-premium');
  if (div) div.remove();
  var pantallaCarga = document.getElementById('pantalla-carga');
  if (!pantallaCarga) {
    if (typeof iniciarApp === 'function') iniciarApp();
    return;
  }
  pantallaCarga.style.display = 'flex';
  setTimeout(function() {
    pantallaCarga.classList.add('oculto');
    setTimeout(function() { pantallaCarga.style.display = 'none'; }, 800);
    var header = document.getElementById('header-principal');
    var contenido = document.getElementById('app-contenido');
    if (header) header.style.display = 'block';
    if (contenido) contenido.style.display = 'block';
    if (typeof iniciarApp === 'function') iniciarApp();
  }, 3000);
}

// ============================================
// FIN BLOQUE 2 — Continúa en Bloque 3
// ============================================// ============================================
// BLOQUE 3: AUTENTICACIÓN Y SEGURIDAD
// ============================================

async function hashearPassword(password) {
  try {
    if (!crypto || !crypto.subtle) {
      throw new Error('crypto.subtle no disponible');
    }
    var salt = 'larifita_salt_2026_v1_secure';
    var encoder = new TextEncoder();
    var data = encoder.encode(salt + password + salt);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  } catch (e) {
    try {
      return 'fallback_' + btoa(password).slice(0, 40);
    } catch(e2) {
      return 'fallback_simple_' + password.length;
    }
  }
}

function calcularEdad(fechaNacimientoStr) {
  if (!fechaNacimientoStr) return -1;
  try {
    var hoy = new Date();
    var nacimiento = new Date(fechaNacimientoStr);
    if (isNaN(nacimiento.getTime())) return -1;
    var edad = hoy.getFullYear() - nacimiento.getFullYear();
    var m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  } catch (e) { return -1; }
}

async function registrarAceptacionTerminos(telefono, nombre, ip) {
  try {
    if (!supabaseClient) return false;
    var r = await supabaseClient.from('terminos_aceptados').insert([{
      telefono: telefono,
      nombre: nombre,
      version_terminos: 'v1.0',
      ip: ip || 'desconocida',
      user_agent: navigator.userAgent || 'desconocido'
    }]);
    return !r.error;
  } catch (e) { return false; }
}

const COOLDOWN_MS = 20 * 1000;
const VENTANA_CANCEL_MS = 2 * 60 * 1000;
const MAX_CANCELACIONES = 3;

function verificarRateLimit() {
  var ahora = Date.now();
  var bloqueoHasta = parseInt(localStorage.getItem('bloqueo_temporal_hasta') || '0');
  if (ahora < bloqueoHasta) {
    var minutos = Math.ceil((bloqueoHasta - ahora) / 60000);
    return { permitido: false, motivo: '🚫 Has cancelado demasiadas reservas seguidas.\n\n⏳ Espera ' + minutos + ' minuto' + (minutos > 1 ? 's' : '') + '.' };
  }
  var ultimaReserva = parseInt(localStorage.getItem('ultima_reserva_ts') || '0');
  if (ahora - ultimaReserva < COOLDOWN_MS) {
    var seg = Math.ceil((COOLDOWN_MS - (ahora - ultimaReserva)) / 1000);
    return { permitido: false, motivo: '⏳ Espera ' + seg + ' segundo' + (seg > 1 ? 's' : '') + ' antes de reservar otro número.' };
  }
  return { permitido: true, motivo: '' };
}

function marcarUltimaReserva() { localStorage.setItem('ultima_reserva_ts', Date.now().toString()); }

function registrarCancelacion() {
  var ahora = Date.now();
  try {
    var cancelaciones = JSON.parse(localStorage.getItem('cancelaciones_recientes') || '[]');
    cancelaciones = cancelaciones.filter(function(t) { return ahora - t < VENTANA_CANCEL_MS; });
    cancelaciones.push(ahora);
    localStorage.setItem('cancelaciones_recientes', JSON.stringify(cancelaciones));
    if (cancelaciones.length >= MAX_CANCELACIONES) localStorage.setItem('bloqueo_temporal_hasta', (ahora + VENTANA_CANCEL_MS).toString());
  } catch (e) {}
}

const VAPID_PUBLIC_KEY = "BJBwK_3qOZSh9lERtdBslV_tArKxKb4WH-6n5STjLDWvAjhw8nFvXoZZfs5Musyw5EilvBFuuxneo6fdlAh9HFM";

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

async function activarNotificacionesPush() {
  var telefono = localStorage.getItem('mi_telefono');
  if (!telefono) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!supabaseClient) return;
  try {
    var permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return;
    var registro = await navigator.serviceWorker.ready;
    var suscripcion = await registro.pushManager.getSubscription();
    if (!suscripcion) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    var subJSON = suscripcion.toJSON();
    await supabaseClient.from('push_suscripciones').upsert({
      telefono: telefono,
      endpoint: subJSON.endpoint,
      p256dh: subJSON.keys.p256dh,
      auth: subJSON.keys.auth
    }, { onConflict: 'endpoint' });
  } catch (error) { console.error('Error Push:', error); }
}

async function guardarRegistro() {
  if (!supabaseClient) {
    mostrarAlerta('❌ Error de conexión con el servidor.\n\nVerifica tu internet y recarga la app.', 'error');
    return;
  }

  var nombre = document.getElementById('reg-nombre').value.trim();
  var telefono = document.getElementById('reg-telefono').value.trim();
  var password = document.getElementById('reg-password') ? document.getElementById('reg-password').value.trim() : '';
  var referidoPor = document.getElementById('reg-referido') ? document.getElementById('reg-referido').value.trim() : '';
  var checkTerminos = document.getElementById('reg-terminos');
  var checkRecordar = document.getElementById('reg-recordar');
  var checkMayorEdad = document.getElementById('reg-mayor-edad');

  var fechaManual = document.getElementById('reg-fecha-nacimiento-manual') ? document.getElementById('reg-fecha-nacimiento-manual').value.trim() : '';
  var fechaNacimiento = '';
  if (fechaManual) {
    var partes = fechaManual.split('/');
    if (partes.length === 3) {
      fechaNacimiento = partes[2] + '-' + partes[1] + '-' + partes[0];
    }
  }

  if (!nombre || !telefono) { mostrarAlerta('⚠️ Por favor, llena tu nombre y teléfono.', 'error'); return; }
  if (!validarTelefonoCubano(telefono)) { mostrarAlerta('⚠️ El teléfono debe ser un número cubano válido.\n\nEjemplo: +5353437025 o 53438025', 'error'); return; }
  if (!password) { mostrarAlerta('⚠️ Debes crear una contraseña.', 'error'); return; }
  if (checkTerminos && !checkTerminos.checked) { mostrarAlerta('⚠️ Debes aceptar los Términos y Condiciones.', 'error'); mostrarTerminos(); return; }
  if (checkMayorEdad && !checkMayorEdad.checked) { mostrarAlerta('🚫 Debes declarar que eres mayor de 18 años.', 'error'); return; }

  if (!fechaManual || fechaManual.length < 10) {
    mostrarAlerta('⚠️ Debes ingresar tu fecha de nacimiento completa.\n\nFormato: DD/MM/AAAA\nEjemplo: 15/08/1995', 'error');
    return;
  }
  if (!fechaNacimiento) {
    mostrarAlerta('⚠️ La fecha de nacimiento no es válida.\n\nFormato correcto: DD/MM/AAAA', 'error');
    return;
  }

  var edad = calcularEdad(fechaNacimiento);
  if (edad < 0) { mostrarAlerta('⚠️ La fecha de nacimiento no es válida.', 'error'); return; }
  if (edad < 18) { mostrarAlerta('🚫 Debes ser MAYOR DE 18 AÑOS para jugar.', 'error'); return; }
  if (edad > 120) { mostrarAlerta('⚠️ Verifica tu fecha de nacimiento.', 'error'); return; }

  if (!fotoPerfilTemporal) fotoPerfilTemporal = avataresPredisenados[0];
  var urlFotoFinal = fotoPerfilTemporal;

  if (fotoPerfilTemporal.startsWith('data:image')) {
    try {
      var res = await fetch(fotoPerfilTemporal);
      var blob = await res.blob();
      var file = new File([blob], 'perfil_' + Date.now() + '.jpg', { type: 'image/jpeg' });
      var fileComprimido = await comprimirImagen(file);
      var nombreArchivo = 'perfil_' + telefono.replace(/[^0-9]/g, '') + '.jpg';
      var subida = await supabaseClient.storage.from('capturas').upload(nombreArchivo, fileComprimido, { upsert: true });
      if (!subida.error) {
        urlFotoFinal = supabaseClient.storage.from('capturas').getPublicUrl(nombreArchivo).data.publicUrl;
      }
    } catch(e) {
      console.warn('Error subiendo foto de perfil, usando avatar por defecto:', e);
    }
  }

  var passwordHash = await hashearPassword(password);
  localStorage.setItem('mi_nombre', nombre);
  localStorage.setItem('mi_telefono', telefono);
  localStorage.setItem('mi_foto', urlFotoFinal);
  localStorage.setItem('mi_password', passwordHash);
  if (checkRecordar && checkRecordar.checked) localStorage.setItem('mi_recordar', 'true');
  else localStorage.removeItem('mi_recordar');

  await registrarAceptacionTerminos(telefono, nombre, miIP);

  var fechaHoy = obtenerFechaFormateada();
  var horaAhora = obtenerHora12();
  var conexionCompleta = fechaHoy + ' ' + horaAhora;

  try {
    var existeJugador = await supabaseClient.from('puntos_jugadores').select('telefono').eq('telefono', telefono).maybeSingle();
    if (existeJugador.data) {
      await supabaseClient.from('puntos_jugadores').update({
        foto_perfil: urlFotoFinal,
        nombre: nombre,
        estado: 'activo',
        ultima_conexion: conexionCompleta,
        fecha_nacimiento: fechaNacimiento,
        mayor_de_edad: true,
        password_hash: passwordHash
      }).eq('telefono', telefono);
    } else {
      var nuevoJugador = {
        telefono: telefono,
        nombre: nombre,
        puntos: 0,
        nivel: 'Novato',
        foto_perfil: urlFotoFinal,
        referidos_count: 0,
        fecha_registro: fechaHoy,
        ultima_conexion: conexionCompleta,
        estado: 'activo',
        fecha_nacimiento: fechaNacimiento,
        mayor_de_edad: true,
        password_hash: passwordHash
      };
      if (referidoPor && referidoPor !== telefono) {
        nuevoJugador.referido_por = referidoPor;
        var rRef = await supabaseClient.from('puntos_jugadores').select('referidos_count').eq('telefono', referidoPor).maybeSingle();
        if (rRef.data) {
          var nuevoConteo = (rRef.data.referidos_count || 0) + 1;
          await supabaseClient.from('puntos_jugadores').update({ referidos_count: nuevoConteo }).eq('telefono', referidoPor);
          if (nuevoConteo === 5) {
            await supabaseClient.from('avisos').insert([{
              telefono_destino: referidoPor,
              mensaje: '🎁 ¡Felicidades! Has invitado a 5 amigos. Has ganado un NÚMERO GRATIS para tu próximo turno.',
              tipo: 'premio',
              leido: false
            }]);
          }
        }
      }
      await supabaseClient.from('puntos_jugadores').insert([nuevoJugador]);
    }
  } catch(e) { console.error('Error guardando jugador:', e); }

  var pantallaReg = document.getElementById('pantalla-registro');
  if (pantallaReg) pantallaReg.style.display = 'none';
  mostrarBienvenidaInteractiva(nombre);
}

async function actualizarUltimaConexion() {
  var telefono = localStorage.getItem('mi_telefono');
  if (!telefono || !supabaseClient) return;
  try {
    var ultimaActualizacion = localStorage.getItem('ultima_conexion_local') || '0';
    var ahora = Date.now();
    var diezMinutos = 10 * 60 * 1000;
    if (ahora - parseInt(ultimaActualizacion) < diezMinutos) return;
    var conexionCompleta = obtenerFechaFormateada() + ' ' + obtenerHora12();
    await supabaseClient.from('puntos_jugadores').update({
      ultima_conexion: conexionCompleta,
      estado: 'activo'
    }).eq('telefono', telefono);
    localStorage.setItem('ultima_conexion_local', ahora.toString());
  } catch(e) { console.error('Error actualizando última conexión:', e); }
}

async function verificarReservasPendientes() {
  var miTelefono = localStorage.getItem('mi_telefono');
  if (!miTelefono || !supabaseClient) return;
  try {
    var r = await supabaseClient.from('reservas').select('numero,nombre,hora').eq('telefono', miTelefono).eq('estado', 'ocupado').eq('turno', turnoActual);
    if (r.error || !r.data || r.data.length === 0) return;
    var reservasPendientes = r.data;
    var nums = reservasPendientes.map(function(r) { return r.numero; }).join(', ');
    var cantidad = reservasPendientes.length;
    var m = document.createElement('div');
    m.className = 'modal';
    m.id = 'modal-reservas-pendientes';
    m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 3px solid #FFC107; text-align: center;">' +
      '<div style="font-size: 60px; margin-bottom: 10px; animation: pulsoGanador 2s infinite;">⏳</div>' +
      '<h2 style="color: #FFC107; margin-bottom: 10px; font-size: 22px;">Tienes ' + (cantidad === 1 ? 'una reserva pendiente' : cantidad + ' reservas pendientes') + '</h2>' +
      '<p style="color: #fff; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">El administrador aún no ha aprobado ' + (cantidad === 1 ? 'esta reserva' : 'estas reservas') + '.</p>' +
      '<div style="background: rgba(255,215,0,0.15); border: 2px dashed #FFD700; border-radius: 12px; padding: 15px; margin-bottom: 15px;">' +
      '<p style="color: #FFD700; font-size: 12px; margin-bottom: 5px;">🎯 Número' + (cantidad > 1 ? 's' : '') + ':</p>' +
      '<h3 style="color: #fff; font-size: 22px; letter-spacing: 2px; margin: 0;">' + escapeHtml(nums) + '</h3>' +
      '</div>' +
      '<button onclick="var m=document.getElementById(\'modal-reservas-pendientes\'); if(m) m.remove(); mostrarSeccion(\'tickets\');" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #2ECC71, #27AE60); color: #fff; border: none; border-radius: 12px; font-weight: 900; font-size: 15px; cursor: pointer; margin-bottom: 8px;">🎟️ Ver mis tickets</button>' +
      '<button onclick="var m=document.getElementById(\'modal-reservas-pendientes\'); if(m) m.remove();" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.15); color: #fff; border: none; border-radius: 12px; font-weight: bold; font-size: 14px; cursor: pointer;">Cerrar</button>' +
      '</div>';
    document.body.appendChild(m);
  } catch(e) { console.error('Error verificando reservas pendientes:', e); }
}

function suscribirseAlChat() {
  if (!supabaseClient) {
    console.warn('No se puede suscribir al chat: supabaseClient no disponible');
    return;
  }
  if (chatChannel) {
    try { supabaseClient.removeChannel(chatChannel); } catch(e) { console.warn('Error removiendo canal previo:', e); }
  }
  chatChannel = supabaseClient.channel('chat-en-vivo')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat' }, function(payload) {
      var chatSec = document.getElementById('chat');
      if (chatSec && chatSec.classList.contains('activa')) {
        cargarChatWa(true);
      }
    })
    .subscribe();
}

// ============================================
// FIN BLOQUE 3 — Continúa en Bloque 4
// ============================================// ============================================
// BLOQUE 4: INICIAR APP + CONTADOR ONLINE
// Incluye FIX #1 (guard anti-doble-init) y FIX #3 (contador corregido)
// ============================================

async function iniciarApp() {
  // FIX CRÍTICO #1: Evitar doble inicialización (DOMContentLoaded + window.load)
  if (window._iniciado) {
    console.log('⚠️ iniciarApp ya fue ejecutado. Ignorando llamada duplicada.');
    return;
  }
  window._iniciado = true;

  iniciarMensajesCarga();
  turnoActual = detectarTurno();

  var logo = document.querySelector('.logo-container');
  if (logo && !logo.dataset.listenerActivo) {
    logo.dataset.listenerActivo = 'true';
    logo.addEventListener('click', toqueLogo);
  }

  var pc = document.getElementById('pantalla-carga');
  if (pc) { pc.classList.add('oculto'); setTimeout(function() { pc.style.display = 'none'; }, 600); }

  try {
    if (supabaseClient) {
      cargarConfig();
      cargarBloqueados();
      cargarTrabajadores();
      cargarReservas();
      cargarChatWa();
    }
  } catch (e) { console.warn('Error en carga inicial', e); }

  suscribirseAlChat();

  totalReservasAnteriores = Object.keys(reservas).length;
  cargarNotificaciones();
  actualizarInterfazTurno();
  actualizarResultadoEnPantalla();
  actualizarUltimaConexion();

  if (supabaseClient) {
    try {
      var ses = await supabaseClient.auth.getSession();
      if (ses && ses.data && ses.data.session) {
        var ca = await supabaseClient.from('admins').select('user_id').eq('user_id', ses.data.session.user.id).maybeSingle();
        if (ca && ca.data) {
          esAdmin = true;
        } else {
          var ct = await supabaseClient.from('trabajadores').select('*').eq('user_id', ses.data.session.user.id).maybeSingle();
          if (ct && ct.data) { trabajadorActual = ct.data; }
        }
      }
    } catch(e) {
      console.warn('Error verificando sesión de admin:', e);
    }
  }

  crearBotonSoporte();
  cargarTema();
  mostrarNavInferior();

  if (!localStorage.getItem('tutorial_visto') && !esAdmin && !trabajadorActual) {
    setTimeout(mostrarTutorial, 2000);
  }
  setTimeout(activarNotificacionesPush, 3000);

  if (config.modo_vacaciones === 'true' && !esAdmin) {
    var bannerVac = document.getElementById('banner-vacaciones');
    var msgVac = document.getElementById('mensaje-vacaciones');
    if (bannerVac) {
      bannerVac.style.display = 'flex';
      if (msgVac && config.mensaje_vacaciones) msgVac.textContent = config.mensaje_vacaciones;
    }
    return;
  }

  if (config.mantenimiento === 'true' && !esAdmin) {
    var mant = document.createElement('div');
    mant.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:#001A5C;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;color:#fff;";
    mant.innerHTML = '<h1 style="color:#FFD700;font-size:40px;">🚧</h1><h2 style="color:#FFD700;">En Mantenimiento</h2><p>Estamos actualizando la app para ti. Volvemos en unos minutos.</p>';
    document.body.appendChild(mant);
    return;
  }

  var ultimaLimpieza = localStorage.getItem('ultima_limpieza_fecha') || '';
  var fechaHoy = obtenerFechaFormateada();
  var horaActual = new Date().getHours();
  if (ultimaLimpieza !== fechaHoy && horaActual < 7) {
    await limpiarResultadosDelDia();
    localStorage.setItem('ultima_limpieza_fecha', fechaHoy);
  }

  await procesarAutoCierreTurnos();

  iniciarLimpiezaDiaria();
  iniciarAutoCierreTurnos();

  if (navigator.onLine) setTimeout(function() { procesarColaReservas(); }, 3000);
  window.addEventListener('online', function() { setTimeout(function() { procesarColaReservas(); }, 1500); });

  setTimeout(verificarGanador, 3000);
  setTimeout(verificarReservasPendientes, 5000);

  if (intervalGanador) clearInterval(intervalGanador);
  intervalGanador = setInterval(verificarGanador, 60000);

  if (intervalCargarReservas) clearInterval(intervalCargarReservas);
  intervalCargarReservas = setInterval(function() {
    if (!document.hidden) {
      var inicioSec = document.getElementById('inicio');
      var adminModal = document.getElementById('modal-admin');
      if ((inicioSec && inicioSec.classList.contains('activa')) || adminModal) {
        cargarReservas().then(function() {
          if (esAdmin && Object.keys(reservas).length > totalReservasAnteriores) {
            reproducirSonido('click');
            totalReservasAnteriores = Object.keys(reservas).length;
          } else {
            totalReservasAnteriores = Object.keys(reservas).length;
          }
        });
      }
    }
  }, 20000);

  if (intervalChat) clearInterval(intervalChat);
  intervalChat = setInterval(function() {
    if (!document.hidden) {
      var chatSec = document.getElementById('chat');
      if (chatSec && chatSec.classList.contains('activa')) cargarChatWa(true);
    }
  }, 45000);

  setInterval(limpiarArchivoAutomatico, 60 * 60 * 1000);
  setTimeout(limpiarArchivoAutomatico, 5000);
  setInterval(cargarConfig, 120000);
  setInterval(liberarVencidos, 60000);
  setTimeout(liberarVencidos, 8000);
  setInterval(limpiarTemporalesVencidos, 60000);
  setTimeout(limpiarTemporalesVencidos, 4000);

  setInterval(function() {
    if (!turnoForzado && !document.hidden) {
      var t = detectarTurno();
      if (t !== turnoActual) { turnoActual = t; cargarReservas(); }
    }
    if (!document.hidden) actualizarInterfazTurno();
  }, 60000);

  actualizarContadorJugadoresOnline();
  setInterval(actualizarContadorJugadoresOnline, 120000);

  setInterval(function() {
    if (numerosStatsAbierto && !document.hidden) {
      cargarNumerosCalientes();
    }
  }, 120000);

  var seccionActual = localStorage.getItem('seccion_actual') || 'inicio';
  if (seccionActual && seccionActual !== 'inicio') setTimeout(function() { mostrarSeccion(seccionActual); }, 500);

  var numPendiente = localStorage.getItem('reserva_pendiente');
  if (numPendiente) {
    setTimeout(function() {
      var turnoPend = localStorage.getItem('reserva_pendiente_turno');
      var nombrePend = localStorage.getItem('reserva_pendiente_nombre') || localStorage.getItem('mi_nombre') || '';
      var telefonoPend = localStorage.getItem('reserva_pendiente_telefono') || localStorage.getItem('mi_telefono') || '';
      var precioPend = localStorage.getItem('reserva_pendiente_precio') || '50';
      if (turnoPend && turnoPend !== turnoActual) {
        mostrarAlerta('⚠️ El turno cambió mientras realizabas tu pago.\n\nPor favor, elige otro número del turno actual.', 'error');
        localStorage.removeItem('reserva_pendiente');
        localStorage.removeItem('reserva_pendiente_nombre');
        localStorage.removeItem('reserva_pendiente_telefono');
        localStorage.removeItem('reserva_pendiente_precio');
        localStorage.removeItem('reserva_pendiente_turno');
        return;
      }
      if (!nombrePend || !telefonoPend) { localStorage.removeItem('reserva_pendiente'); return; }
      window.reservaTemp = { nombre: nombrePend, telefono: telefonoPend, precio: precioPend };
      abrirReserva(numPendiente, true);

      localStorage.removeItem('reserva_pendiente');
      localStorage.removeItem('reserva_pendiente_nombre');
      localStorage.removeItem('reserva_pendiente_telefono');
      localStorage.removeItem('reserva_pendiente_precio');
      localStorage.removeItem('reserva_pendiente_turno');
    }, 1500);
  }

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      actualizarUltimaConexion();

      if (typeof reservaTemporalActiva !== 'undefined' && reservaTemporalActiva) {
        actualizarTimerTemporal();
        var modalReserva = document.getElementById('modal-reserva');
        var paso1 = document.getElementById('reserva-paso-1');
        if (modalReserva && paso1 && paso1.classList.contains('activo')) {
          if (window.reservaTemp && window.reservaTemp.nombre) {
            irAPaso2(reservaTemporalActiva.numero, window.reservaTemp.precio);
          }
        }
      }

      if (!window.__reservando && !document.getElementById('modal-reserva')) {
        cargarReservas();
        var chatSec2 = document.getElementById('chat');
        if (chatSec2 && chatSec2.classList.contains('activa')) cargarChatWa(true);
      }
    }
  });
}

// FIX CRÍTICO #3: ultima_conexion es TEXT ("25/10/2026 3:45 PM"), no ISO
// Se trae y filtra en JS para que el contador SÍ funcione
async function actualizarContadorJugadoresOnline() {
  var el = document.getElementById('contador-jugadores-online');
  if (!el || document.hidden) return;
  if (!supabaseClient) return;

  try {
    var r = await supabaseClient
      .from('puntos_jugadores')
      .select('telefono,ultima_conexion')
      .eq('estado', 'activo')
      .order('telefono', { ascending: false })
      .limit(500);

    if (r.error) {
      console.warn('Error consultando jugadores online:', r.error.message);
      return;
    }

    var hace5min = Date.now() - 5 * 60 * 1000;
    var cantidad = 0;

    if (Array.isArray(r.data)) {
      r.data.forEach(function(p) {
        var fechaStr = (p.ultima_conexion || '').trim();
        var m = fechaStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!m) return;
        var dia  = parseInt(m[1], 10);
        var mes  = parseInt(m[2], 10) - 1;
        var anio = parseInt(m[3], 10);
        var h    = parseInt(m[4], 10);
        var min  = parseInt(m[5], 10);
        var sufijo = (m[6] || '').toUpperCase();
        if (sufijo === 'PM' && h !== 12) h += 12;
        if (sufijo === 'AM' && h === 12) h = 0;
        var fechaMs = new Date(anio, mes, dia, h, min).getTime();
        if (!isNaN(fechaMs) && fechaMs >= hace5min) cantidad++;
      });
    }

    if (cantidad > 0) {
      el.textContent = '🟢 ' + cantidad + ' jugador' + (cantidad === 1 ? '' : 'es') + ' en línea';
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  } catch(e) {
    console.warn('Error contador online:', e);
  }
}

function toggleNumerosStats() {
  var body = document.getElementById('numeros-stats-body');
  var icon = document.getElementById('numeros-stats-toggle-icon');
  if (!body) return;
  numerosStatsAbierto = !numerosStatsAbierto;
  if (numerosStatsAbierto) {
    body.style.display = 'block';
    if (icon) icon.classList.add('abierto');
    cargarNumerosCalientes();
  } else {
    body.style.display = 'none';
    if (icon) icon.classList.remove('abierto');
  }
}

async function cargarNumerosCalientes() {
  var contCalientes = document.getElementById('stats-calientes');
  var contFrios = document.getElementById('stats-frios');
  if (!contCalientes || !contFrios || document.hidden) return;

  contCalientes.innerHTML = '<span style="font-size:11px; color:rgba(255,255,255,0.5);">Cargando...</span>';
  contFrios.innerHTML = '<span style="font-size:11px; color:rgba(255,255,255,0.5);">Cargando...</span>';

  try {
    var conteoHoy = {};
    Object.keys(reservas).forEach(function(num) {
      var r = reservas[num];
      if (r && (r.estado === 'ocupado' || r.estado === 'pagado')) {
        conteoHoy[num] = (conteoHoy[num] || 0) + 1;
      }
    });
    var topHoy = Object.keys(conteoHoy).sort(function(a, b) { return conteoHoy[b] - conteoHoy[a]; }).slice(0, 3);

    if (topHoy.length > 0) {
      contCalientes.innerHTML = topHoy.map(function(num) {
        return '<span class="numero-stat-badge caliente-badge">' + num + '</span>';
      }).join('');
    } else {
      contCalientes.innerHTML = '<span style="font-size:11px; color:rgba(255,255,255,0.5);">Aún sin jugadas</span>';
    }

    if (!supabaseClient) throw new Error('Sin conexión');

    var r = await supabaseClient.from('historial_fijos').select('fijo').order('creado_en', { ascending: false }).limit(500);
    if (r.error) throw r.error;

    var ultimaAparicion = {};
    for (var i = 0; i < 100; i++) {
      var n = i.toString().padStart(2, '0');
      ultimaAparicion[n] = -1;
    }
    if (r.data) {
      r.data.forEach(function(h, index) {
        if (h.fijo && ultimaAparicion[h.fijo] === -1) {
          ultimaAparicion[h.fijo] = index;
        }
      });
    }
    var topFrios = Object.keys(ultimaAparicion).filter(function(n) {
      return ultimaAparicion[n] === -1 || ultimaAparicion[n] > 20;
    }).sort(function(a, b) {
      return (ultimaAparicion[b] || 999) - (ultimaAparicion[a] || 999);
    }).slice(0, 3);

    if (topFrios.length > 0) {
      contFrios.innerHTML = topFrios.map(function(num) {
        return '<span class="numero-stat-badge frio-badge">' + num + '</span>';
      }).join('');
    } else {
      contFrios.innerHTML = '<span style="font-size:11px; color:rgba(255,255,255,0.5);">Saliendo pronto</span>';
    }
  } catch(e) {
    console.error('Error cargando números calientes:', e);
    contCalientes.innerHTML = '<span style="font-size:11px; color:rgba(255,255,255,0.5);">Error</span>';
    contFrios.innerHTML = '<span style="font-size:11px; color:rgba(255,255,255,0.5);">Error</span>';
  }
}

async function toggleRecordatorioWhatsApp(input) {
  var miTel = localStorage.getItem('mi_telefono');
  if (!miTel) {
    if (input && typeof input === 'object') input.checked = false;
    mostrarAlerta('⚠️ Primero debes registrarte.', 'error');
    return;
  }

  if (!input || typeof input.checked === 'undefined') return;
  var activar = input.checked;

  if (!supabaseClient) {
    if (input) input.checked = !activar;
    mostrarAlerta('❌ Sin conexión al servidor. Intenta más tarde.', 'error');
    return;
  }

  try {
    var r = await supabaseClient.from('puntos_jugadores').update({ recordatorio_activo: activar }).eq('telefono', miTel);
    if (r.error) throw r.error;

    if (activar) {
      mostrarAlerta('🔔 ¡Recordatorio ACTIVADO!\n\nTe llegará un WhatsApp cuando abra el turno del día.', 'exito');
    } else {
      mostrarAlerta('🔕 Recordatorio DESACTIVADO.\n\nYa no recibirás avisos automáticos.', 'info');
    }
    localStorage.setItem('recordatorio_activo', activar ? 'true' : 'false');
  } catch(e) {
    if (input && typeof input.checked !== 'undefined') input.checked = !activar;
    mostrarAlerta('❌ Error al guardar: ' + (e && e.message ? e.message : 'Error desconocido'), 'error');
  }
}

async function cargarEstadoRecordatorio() {
  var toggle = document.getElementById('toggle-recordatorio');
  if (!toggle) return;
  var miTel = localStorage.getItem('mi_telefono');
  if (!miTel) { toggle.checked = false; return; }

  var cache = localStorage.getItem('recordatorio_activo');
  if (cache !== null) {
    toggle.checked = (cache === 'true');
  }

  if (!supabaseClient) return;

  try {
    var r = await supabaseClient.from('puntos_jugadores').select('recordatorio_activo').eq('telefono', miTel).maybeSingle();
    if (r.data) {
      toggle.checked = r.data.recordatorio_activo === true;
      localStorage.setItem('recordatorio_activo', toggle.checked ? 'true' : 'false');
    }
  } catch(e) {
    console.warn('No se pudo verificar recordatorio:', e);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  try {
    var nombreGuardado = localStorage.getItem('mi_nombre');
    var telefonoGuardado = localStorage.getItem('mi_telefono');
    var reservaPendiente = localStorage.getItem('reserva_pendiente');
    var adminModal = document.getElementById('modal-admin');
    if (adminModal) adminModal.remove();

    var pantallaRegistro = document.getElementById('pantalla-registro');
    var pantallaCarga = document.getElementById('pantalla-carga');
    var header = document.getElementById('header-principal');
    var appContenido = document.getElementById('app-contenido');

    if (nombreGuardado && telefonoGuardado) {
      if (pantallaRegistro) pantallaRegistro.style.display = 'none';
      if (reservaPendiente) {
        if (pantallaCarga) pantallaCarga.style.display = 'none';
        if (header) header.style.display = 'block';
        if (appContenido) appContenido.style.display = 'block';
        setTimeout(function() { iniciarApp(); }, 100);
      } else {
        if (pantallaCarga) pantallaCarga.style.display = 'flex';
        if (header) header.style.display = 'block';
        if (appContenido) appContenido.style.display = 'block';
        iniciarApp();
      }
    } else {
      if (pantallaRegistro) pantallaRegistro.style.display = 'flex';
      if (pantallaCarga) pantallaCarga.style.display = 'none';
      if (header) header.style.display = 'none';
      if (appContenido) appContenido.style.display = 'none';
      cargarAvataresRegistro();
    }

    var adminRemember = localStorage.getItem('admin_remember');
    var adminSession = sessionStorage.getItem('admin_session');
    var trabRemember = localStorage.getItem('trabajador_remember');
    var trabSession = sessionStorage.getItem('trabajador_session');
    if (adminRemember !== 'true' && adminSession !== 'true' && trabRemember !== 'true' && trabSession !== 'true') {
      if (supabaseClient) {
        supabaseClient.auth.getSession().then(function(ses) {
          if (ses && ses.data && ses.data.session) {
            supabaseClient.auth.signOut();
            esAdmin = false;
            trabajadorActual = null;
          }
        }).catch(function(e) { console.warn('Error verificando sesión inicial:', e); });
      }
    }
  } catch(e) {
    console.error('Error en DOMContentLoaded:', e);
  }
});

// ============================================
// FIN BLOQUE 4 — Continúa en Bloque 5
// ============================================// ============================================
// BLOQUE 5: TURNO + CONFIG + PRECIOS + ESTADO
// ============================================

// Detección de turno ESTRICTA por horas
function detectarTurno() {
  if (turnoForzado) return turnoActual;
  var d = new Date();
  var horaActual = d.getHours() + (d.getMinutes() / 60);

  // Mediodía: 8:00 AM a 1:00 PM (13:00)
  if (horaActual >= 8 && horaActual < 13) return 'mediodia';
  // Noche: 3:00 PM (15:00) a 9:00 PM (21:00)
  if (horaActual >= 15 && horaActual < 21) return 'noche';
  // Fuera de horario
  if (horaActual >= 13 && horaActual < 15) return 'mediodia'; // Esperando que abra noche
  return 'noche'; // Después de las 9 PM
}

function toggleForzarTurno() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!turnoForzado) {
    turnoForzado = true;
    turnoActual = (turnoActual === 'mediodia') ? 'noche' : 'mediodia';
    mostrarAlerta('⚡ Turno forzado a: ' + (turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche'), 'exito');
  } else {
    turnoForzado = false;
    turnoActual = detectarTurno();
    mostrarAlerta('✅ Modo AUTOMÁTICO restaurado.', 'exito');
  }
  cargarReservas();
  actualizarInterfazTurno();
  if (document.getElementById('modal-admin')) refrescarPanelAdmin();
}

function estaAbierto() {
  var ahora = new Date();
  var minutos = ahora.getHours() * 60 + ahora.getMinutes();
  var cAb = turnoActual === 'mediodia' ? 'turno_mediodia_abierto' : 'turno_noche_abierto';
  if (config[cAb] === 'false') return { abierto: false, motivo: config.motivo_cierre || 'Turno cerrado por el administrador.' };
  if (config.mantenimiento === 'true') return { abierto: false, motivo: 'En mantenimiento.' };
  if (config.modo_vacaciones === 'true') return { abierto: false, motivo: 'La Rifita está de descanso.' };
  if (turnoActual === 'mediodia') {
    if (minutos >= 8 * 60 && minutos < 13 * 60) return { abierto: true, motivo: '' };
    return { abierto: false, motivo: 'Horario: 8:00 AM - 1:00 PM' };
  } else {
    if (minutos >= 15 * 60 && minutos < 21 * 60) return { abierto: true, motivo: '' };
    return { abierto: false, motivo: 'Horario: 3:00 PM - 9:00 PM' };
  }
}

async function cargarConfig() {
  try {
    var configLocal = localStorage.getItem('rifita_config_cache');
    if (configLocal) {
      try {
        var parsed = JSON.parse(configLocal);
        if (parsed && Object.keys(parsed).length > 0) {
          config = parsed;
          actualizarPreciosEnPantalla();
          actualizarResultadoEnPantalla();
        }
      } catch(e) { console.warn('Cache config corrupta:', e); }
    }

    if (!supabaseClient) return;

    var r = await supabaseClient.from('configuracion').select('*');
    if (r.error) {
      console.warn('Error cargando config:', r.error.message);
      return;
    }

    config = {};
    if (Array.isArray(r.data)) {
      r.data.forEach(function(c) { if (c && c.clave) config[c.clave] = c.valor; });
    }
    localStorage.setItem('rifita_config_cache', JSON.stringify(config));
    actualizarPreciosEnPantalla();
    actualizarResultadoEnPantalla();
  } catch (e) {
    console.error('Config:', e);
  }
}

async function cargarBloqueados() {
  try {
    if (!supabaseClient) return;
    var r = await supabaseClient.from('bloqueados').select('telefono');
    if (r.error) return;
    if (Array.isArray(r.data)) {
      bloqueados = r.data.map(function(b) { return b.telefono; });
    }
  } catch (e) { console.warn('Error cargando bloqueados:', e); }
}

async function cargarTrabajadores() {
  try {
    if (!supabaseClient) return;
    var r = await supabaseClient.from('trabajadores').select('*');
    if (r.error) return;
    trabajadores = Array.isArray(r.data) ? r.data : [];
  } catch (e) { console.warn('Error cargando trabajadores:', e); }
}

async function cargarNotificaciones() {
  try {
    if (!supabaseClient) return;
    var r = await supabaseClient.from('notificaciones').select('*').order('creado_en', { ascending: false }).limit(10);
    if (r.error) return;
    notificaciones = Array.isArray(r.data) ? r.data : [];
  } catch (e) { console.warn('Error cargando notificaciones:', e); }
}

async function registrarLog(accion, detalle, numero, telefonoJugador, monto) {
  try {
    if (!supabaseClient) return;
    var nT = trabajadorActual ? trabajadorActual.nombre : (localStorage.getItem('mi_nombre') || 'Admin');
    var tT = trabajadorActual ? trabajadorActual.telefono : (localStorage.getItem('mi_telefono') || '');
    await supabaseClient.from('logs_trabajadores').insert([{
      trabajador_nombre: nT,
      trabajador_telefono: tT,
      accion: accion,
      detalle: detalle || '',
      numero: numero || '',
      telefono_jugador: telefonoJugador || '',
      monto: monto || ''
    }]);
  } catch (e) {
    console.warn('Error guardando log:', e);
  }
}

function actualizarPreciosEnPantalla() {
  var cPr = turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche';
  var cPm = turnoActual === 'mediodia' ? 'premio_mediodia' : 'premio_noche';
  var pe = document.querySelector('.premio');
  if (pe) pe.textContent = (config[cPm] || '250') + ' CUP';
  var ti = document.querySelector('.turno-info');
  if (ti) {
    var pp = ti.querySelectorAll('p')[1];
    if (pp) pp.innerHTML = '<strong>Precio:</strong> ' + (config[cPr] || '50') + ' CUP';
    var cp = ti.querySelectorAll('p')[2];
    if (cp) cp.innerHTML = '<strong>Cierra:</strong> ' + (turnoActual === 'mediodia' ? '1:00 PM' : '9:00 PM');
  }
  var contenedorBote = document.getElementById('contenedor-bote') || document.getElementById('bote-visual-container');
  var boteVisual = document.getElementById('texto-bote') || document.getElementById('bote-visual-monto');
  var montoBote = 250;
  if (config.bote_visual !== undefined && config.bote_visual !== null && config.bote_visual !== '') {
    montoBote = parseInt(config.bote_visual);
    if (isNaN(montoBote)) montoBote = 250;
  }
  if (contenedorBote && boteVisual) {
    if (montoBote > 0) {
      contenedorBote.style.display = 'block';
      boteVisual.textContent = montoBote + ' CUP';
    } else {
      contenedorBote.style.display = 'none';
    }
  }
}

async function actualizarResultadoEnPantalla() {
  var fm = document.getElementById('fijo-mediodia');
  var fn = document.getElementById('fijo-noche');
  var gm = document.getElementById('ganador-mediodia');
  var gn = document.getElementById('ganador-noche');
  var cm = document.getElementById('codigo-mediodia');
  var cn = document.getElementById('codigo-noche');
  var fam = document.getElementById('fecha-mediodia');
  var fan = document.getElementById('fecha-noche');
  var hm = document.getElementById('hora-mediodia');
  var hn = document.getElementById('hora-noche');
  var pm = document.getElementById('premio-mediodia');
  var pn = document.getElementById('premio-noche');
  var selloMed = document.getElementById('sello-publicado-mediodia');
  var selloNoche = document.getElementById('sello-publicado-noche');

  if (fm) {
    fm.textContent = (config.fijo_mediodia && config.fijo_mediodia !== '') ? config.fijo_mediodia : '--';
    if (config.fijo_mediodia && config.fijo_mediodia !== '') fm.classList.add('fijo-brilla');
    else fm.classList.remove('fijo-brilla');
  }
  if (fn) {
    fn.textContent = (config.fijo_noche && config.fijo_noche !== '') ? config.fijo_noche : '--';
    if (config.fijo_noche && config.fijo_noche !== '') fn.classList.add('fijo-brilla');
    else fn.classList.remove('fijo-brilla');
  }
  if (gm) gm.textContent = (config.ganador_mediodia && config.ganador_mediodia !== '') ? config.ganador_mediodia : 'Por definir';
  if (gn) gn.textContent = (config.ganador_noche && config.ganador_noche !== '') ? config.ganador_noche : 'Por definir';

  if (selloMed) {
    if (config.fijo_mediodia && config.fijo_mediodia !== '' && supabaseClient) {
      try {
        var sMed = await supabaseClient.from('historial_fijos').select('publicado_en,creado_en').eq('turno', 'mediodia').eq('fijo', config.fijo_mediodia).order('creado_en', { ascending: false }).limit(1);
        if (sMed.data && sMed.data[0]) {
          var fechaPubMed = sMed.data[0].publicado_en || sMed.data[0].creado_en;
          if (fechaPubMed) {
            var dPubMed = new Date(fechaPubMed);
            var horaPubMed = dPubMed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            selloMed.textContent = '✅ Publicado hoy a las ' + horaPubMed + ' (verificado)';
            selloMed.style.display = 'block';
          } else {
            selloMed.style.display = 'none';
          }
        } else {
          selloMed.style.display = 'none';
        }
      } catch(e) { selloMed.style.display = 'none'; }
    } else {
      selloMed.style.display = 'none';
    }
  }

  if (selloNoche) {
    if (config.fijo_noche && config.fijo_noche !== '' && supabaseClient) {
      try {
        var sNoche = await supabaseClient.from('historial_fijos').select('publicado_en,creado_en').eq('turno', 'noche').eq('fijo', config.fijo_noche).order('creado_en', { ascending: false }).limit(1);
        if (sNoche.data && sNoche.data[0]) {
          var fechaPubNoche = sNoche.data[0].publicado_en || sNoche.data[0].creado_en;
          if (fechaPubNoche) {
            var dPubNoche = new Date(fechaPubNoche);
            var horaPubNoche = dPubNoche.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            selloNoche.textContent = '✅ Publicado hoy a las ' + horaPubNoche + ' (verificado)';
            selloNoche.style.display = 'block';
          } else {
            selloNoche.style.display = 'none';
          }
        } else {
          selloNoche.style.display = 'none';
        }
      } catch(e) { selloNoche.style.display = 'none'; }
    } else {
      selloNoche.style.display = 'none';
    }
  }

  if (config.fijo_mediodia && config.fijo_mediodia !== '' && supabaseClient) {
    try {
      var hMed = await supabaseClient.from('historial_fijos').select('*').eq('turno', 'mediodia').eq('fijo', config.fijo_mediodia).order('creado_en', { ascending: false }).limit(1);
      if (hMed.data && hMed.data.length > 0) {
        var gan = hMed.data[0];
        if (cm) cm.textContent = gan.codigo_ticket || '--';
        if (fam) fam.textContent = gan.fecha || '--';
        if (hm) hm.textContent = gan.hora ? obtenerHora12(gan.hora) : '--';
      }
    } catch(e) { console.warn('Error cargando datos mediodía:', e); }
  } else {
    if (cm) cm.textContent = '--';
    if (fam) fam.textContent = '--';
    if (hm) hm.textContent = '--';
  }

  if (config.fijo_noche && config.fijo_noche !== '' && supabaseClient) {
    try {
      var hNoche = await supabaseClient.from('historial_fijos').select('*').eq('turno', 'noche').eq('fijo', config.fijo_noche).order('creado_en', { ascending: false }).limit(1);
      if (hNoche.data && hNoche.data.length > 0) {
        var ganN = hNoche.data[0];
        if (cn) cn.textContent = ganN.codigo_ticket || '--';
        if (fan) fan.textContent = ganN.fecha || '--';
        if (hn) hn.textContent = ganN.hora ? obtenerHora12(ganN.hora) : '--';
      }
    } catch(e) { console.warn('Error cargando datos noche:', e); }
  } else {
    if (cn) cn.textContent = '--';
    if (fan) fan.textContent = '--';
    if (hn) hn.textContent = '--';
  }

  if (pm) pm.textContent = (config.premio_mediodia || '250') + ' CUP';
  if (pn) pn.textContent = (config.premio_noche || '250') + ' CUP';
}

function actualizarInterfazTurno() {
  var th = document.querySelector('.turno-header h3');
  var ti = document.querySelector('.turno-icono');
  if (turnoActual === 'mediodia') {
    if (th) th.textContent = 'TURNO MEDIODÍA';
    if (ti) ti.textContent = '☀️';
  } else {
    if (th) th.textContent = 'TURNO NOCHE';
    if (ti) ti.textContent = '🌙';
  }
  actualizarPreciosEnPantalla();
  actualizarEstadoTurno();
}

function actualizarEstadoTurno() {
  var e = estaAbierto();
  var el = document.querySelector('.turno-estado');
  if (!el) return;
  if (e.abierto) {
    el.className = 'turno-estado abierto';
    el.textContent = '🟢 ABIERTO - ¡Elige tu número!';
  } else {
    el.className = 'turno-estado cerrado';
    el.textContent = '🔴 ' + e.motivo;
  }
}

function togglePassword() {
  var input = document.getElementById('login-password');
  var icon = document.getElementById('eye-icon');
  if (!input || !icon) return;
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerText = '🙈';
  } else {
    input.type = 'password';
    icon.innerText = '👁️';
  }
}

// ============================================
// FIN BLOQUE 5 — Continúa en Bloque 6
// ============================================// ============================================
// BLOQUE 6: CUADRÍCULA + TIMER TEMPORAL (15 MIN)
// ============================================

function mostrarSkeletonsCuadricula() {
  var c = document.getElementById('cuadricula');
  if (!c) return;
  var primerHijo = c.children[0];
  if (primerHijo && primerHijo.classList && primerHijo.classList.contains('numero')) return;
  c.innerHTML = '';
  for (var i = 0; i < 100; i++) {
    var sk = document.createElement('div');
    sk.className = 'skeleton-numero';
    c.appendChild(sk);
  }
}

async function cargarReservas() {
  mostrarSkeletonsCuadricula();
  try {
    if (!supabaseClient) {
      generarCuadricula();
      return;
    }
    var r = await supabaseClient.from('reservas').select('numero,estado,turno,fecha,hora,telefono,nombre,revisar_admin').eq('turno', turnoActual);
    if (r.error) {
      console.warn('Error cargando reservas:', r.error.message);
      generarCuadricula();
      return;
    }
    reservas = {};
    if (Array.isArray(r.data)) {
      r.data.forEach(function(x) {
        if (x && x.numero) {
          reservas[x.numero] = {
            nombre: x.nombre,
            telefono: x.telefono,
            estado: x.estado,
            turno: x.turno,
            fecha: x.fecha,
            hora: x.hora,
            revisar_admin: x.revisar_admin
          };
        }
      });
    }
    generarCuadricula();

    var miTelResume = localStorage.getItem('mi_telefono') || '';
    if (miTelResume && !timerTemporalInterval) {
      var temporalMia = null;
      var temporalVencido = null;
      Object.keys(reservas).forEach(function(num) {
        if (reservas[num].estado === 'temporal' && reservas[num].telefono === miTelResume) {
          var rTemp = reservas[num];
          if (rTemp.fecha && rTemp.hora) {
            var dTemp = parseFechaHora(rTemp.fecha, rTemp.hora);
            if (dTemp) {
              var diffMinTemp = (Date.now() - dTemp.getTime()) / 60000;
              if (diffMinTemp >= 15) { temporalVencido = num; return; }
            }
          }
          temporalMia = num;
        }
      });
      if (temporalVencido) {
        try {
          await supabaseClient.from('reservas').delete().eq('numero', temporalVencido).eq('turno', turnoActual).eq('estado', 'temporal').eq('telefono', miTelResume);
        } catch(e) {}
        if (typeof detenerTimerTemporal === 'function') detenerTimerTemporal();
      } else if (temporalMia) {
        iniciarTimerTemporal(temporalMia);
      }
    }

    var pc = document.getElementById('pantalla-carga');
    if (pc) {
      pc.classList.add('oculto');
      setTimeout(function() { pc.style.display = 'none'; }, 600);
    }
  } catch (e) {
    console.error('Error en cargarReservas:', e);
    generarCuadricula();
  }
}

function abrirMenuLateral() {
  var menu = document.getElementById('menu-lateral');
  var overlay = document.getElementById('overlay');
  if (menu) menu.classList.add('abierto');
  if (overlay) overlay.classList.add('visible');
}

function cerrarMenuLateral() {
  var menu = document.getElementById('menu-lateral');
  var overlay = document.getElementById('overlay');
  if (menu) menu.classList.remove('abierto');
  if (overlay) overlay.classList.remove('visible');
}

function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(function(s) { s.classList.remove('activa'); });
  var seccion = document.getElementById(id);
  if (seccion) seccion.classList.add('activa');
  localStorage.setItem('seccion_actual', id);

  var mapaNav = { 'inicio': 'nav-inicio', 'tickets': 'nav-tickets', 'chat': 'nav-chat', 'perfil': 'nav-perfil' };
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('activo'); });
  if (mapaNav[id]) {
    var navBtn = document.getElementById(mapaNav[id]);
    if (navBtn) navBtn.classList.add('activo');
  }

  if (id === 'historial') cargarHistorial();
  if (id === 'chat') cargarChatWa();
  if (id === 'ganadores') cargarGaleriaGanadores();
  if (id === 'tickets') cargarTickets();
  if (id === 'perfil') { cargarPerfil(); cargarEstadoRecordatorio(); }
  if (id === 'topjugadores') cargarTopJugadores();
  if (id === 'soporte') cargarSoporte();
  if (id === 'referidos') cargarReferidos();
  if (id === 'resultados') cargarConfig().then(function() { actualizarResultadoEnPantalla(); });
  if (id === 'inicio') generarCuadricula();
}

function actualizarNavActiva(btn) {
  if (!btn) return;
  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('activo'); });
  btn.classList.add('activo');
}

// Barra inferior forzada a mostrarse por encima de todo
function mostrarNavInferior() {
  var nav = document.getElementById('bottom-nav');
  if (nav) {
    nav.style.display = 'flex';
    nav.style.zIndex = '9999999'; // Fuerza a que esté siempre arriba
  }
}

function generarCuadricula() {
  var c = document.getElementById('cuadricula');
  if (!c) return;

  var fijoGanador = turnoActual === 'mediodia' ? config.fijo_mediodia : config.fijo_noche;
  var hayFijo = (fijoGanador && fijoGanador !== '');
  var primerHijo = c.children[0];
  var haySkeletons = primerHijo && primerHijo.classList && primerHijo.classList.contains('skeleton-numero');

  if (c.children.length === 0 || haySkeletons) {
    c.innerHTML = '';
    for (var i = 0; i < 100; i++) {
      var num = i.toString().padStart(2, '0');
      var btn = document.createElement('button');
      btn.className = 'numero';
      btn.textContent = num;
      btn.id = 'num-' + num;
      btn.onclick = (function(n) { return function() { abrirReserva(n, false); }; })(num);
      c.appendChild(btn);
    }
  }

  for (var j = 0; j < 100; j++) {
    var n = j.toString().padStart(2, '0');
    var b = document.getElementById('num-' + n);
    if (b) {
      b.className = 'numero';
      if (reservas[n]) b.classList.add(reservas[n].estado);
      if (hayFijo && n === fijoGanador) b.classList.add('ganador-animado');
    }
  }
}

const DURACION_TEMPORAL_MS = 15 * 60 * 1000;
var timerTemporalInterval = null;
var reservaTemporalActiva = null;

function iniciarTimerTemporal(numero) {
  detenerTimerTemporal();
  var clave = 'reserva_temporal_' + turnoActual + '_' + numero;
  var datosStr = localStorage.getItem(clave);
  var inicio = null;

  if (datosStr) {
    try { inicio = JSON.parse(datosStr).inicio; } catch(e) { inicio = null; }
  }

  if (!inicio) {
    var res = reservas[numero];
    if (res && res.fecha && res.hora) {
      var d = parseFechaHora(res.fecha, res.hora);
      if (d) inicio = d.getTime();
    }
    if (!inicio) inicio = Date.now();
  }

  reservaTemporalActiva = { numero: numero, turno: turnoActual, inicio: inicio, clave: clave };
  localStorage.setItem(clave, JSON.stringify({ inicio: inicio, avisosEnviados: [] }));
  actualizarTimerTemporal();
  timerTemporalInterval = setInterval(actualizarTimerTemporal, 1000);
}

function actualizarTimerTemporal() {
  if (!reservaTemporalActiva) return;

  var transcurrido = Date.now() - reservaTemporalActiva.inicio;
  var restante = DURACION_TEMPORAL_MS - transcurrido;

  if (restante <= 0) { finalizarTiempoTemporal(); return; }

  var minRest = Math.floor(restante / 60000);
  var segRest = Math.floor((restante % 60000) / 1000);
  var mm = minRest.toString().padStart(2, '0');
  var ss = segRest.toString().padStart(2, '0');
  var minutosTranscurridos = Math.floor(transcurrido / 60000);
  var avisosEnviados = [];

  try {
    var datos = JSON.parse(localStorage.getItem(reservaTemporalActiva.clave) || '{}');
    avisosEnviados = datos.avisosEnviados || [];
  } catch(e) {}

  if (minutosTranscurridos >= 5 && avisosEnviados.indexOf(5) === -1) {
    mostrarAlerta('⏳ Te quedan ' + mm + ':' + ss + ' para subir tu captura.\n\n¡No pierdas tu número!', 'info');
    avisosEnviados.push(5);
    guardarAvisosEnviados(avisosEnviados);
  }
  if (minutosTranscurridos >= 10 && avisosEnviados.indexOf(10) === -1) {
    mostrarAlerta('🚨 ¡ÚLTIMOS ' + mm + ' MINUTOS!\n\nSi no subes tu comprobante, el número ' + reservaTemporalActiva.numero + ' será liberado.', 'error');
    avisosEnviados.push(10);
    guardarAvisosEnviados(avisosEnviados);
  }

  var bar = document.getElementById('timer-temporal-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'timer-temporal-bar';
    bar.innerHTML = '<span class="timer-icono">⏳</span><span>Nº <strong id="timer-numero"></strong></span><span class="timer-tiempo" id="timer-tiempo">15:00</span>';
    document.body.appendChild(bar);
  }
  bar.classList.remove('oculto');
  bar.classList.add('visible');

  var elNum = document.getElementById('timer-numero');
  var elTiempo = document.getElementById('timer-tiempo');
  if (elNum) elNum.textContent = reservaTemporalActiva.numero;
  if (elTiempo) elTiempo.textContent = mm + ':' + ss;

  if (restante < 120000) bar.style.background = 'linear-gradient(135deg, #F44336 0%, #B71C1C 100%)';
  else if (restante < 300000) bar.style.background = 'linear-gradient(135deg, #FF9800 0%, #F44336 100%)';
  else bar.style.background = 'linear-gradient(135deg, #FF9800 0%, #F44336 100%)';
}

function guardarAvisosEnviados(avisos) {
  if (!reservaTemporalActiva) return;
  try {
    var datos = JSON.parse(localStorage.getItem(reservaTemporalActiva.clave) || '{}');
    datos.avisosEnviados = avisos;
    localStorage.setItem(reservaTemporalActiva.clave, JSON.stringify(datos));
  } catch(e) {}
}

function detenerTimerTemporal() {
  if (timerTemporalInterval) {
    clearInterval(timerTemporalInterval);
    timerTemporalInterval = null;
  }
  var bar = document.getElementById('timer-temporal-bar');
  if (bar) {
    bar.classList.remove('visible');
    bar.classList.add('oculto');
    bar.style.display = 'none';
    setTimeout(function() { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); }, 200);
  }
}

async function finalizarTiempoTemporal() {
  if (!reservaTemporalActiva) return;
  var numero = reservaTemporalActiva.numero;
  var turno = reservaTemporalActiva.turno;
  var clave = reservaTemporalActiva.clave;

  detenerTimerTemporal();
  reservaTemporalActiva = null;
  try { localStorage.removeItem(clave); } catch(e) {}

  mostrarAlerta('❌ Tu tiempo ha expirado.\n\nEl número ' + numero + ' ha vuelto a estar disponible.', 'error');

  try {
    var miTel = localStorage.getItem('mi_telefono') || '';
    if (supabaseClient) {
      await supabaseClient.from('reservas').delete().eq('numero', numero).eq('turno', turno).eq('estado', 'temporal').eq('telefono', miTel);
    }
  } catch(e) {}

  var modal = document.getElementById('modal-reserva');
  if (modal) modal.remove();
  await cargarReservas();
  if (typeof generarCuadricula === 'function') generarCuadricula();
}

async function limpiarTemporalesVencidos() {
  if (!supabaseClient) return;
  try {
    var r = await supabaseClient.from('reservas').select('id,numero,fecha,hora,creado_en').eq('estado', 'temporal').eq('turno', turnoActual);
    if (r.error || !r.data || r.data.length === 0) return;

    var ahora = new Date();
    var aBorrar = [];

    r.data.forEach(function(t) {
      var inicio = null;
      if (t.creado_en) inicio = new Date(t.creado_en);
      else if (t.fecha && t.hora) inicio = parseFechaHora(t.fecha, t.hora);
      if (!inicio) { aBorrar.push(t.id); return; }
      var diffMin = (ahora - inicio) / 1000 / 60;
      if (diffMin >= 15) aBorrar.push(t.id);
    });

    if (aBorrar.length > 0) {
      for (var i = 0; i < aBorrar.length; i++) {
        await supabaseClient.from('reservas').delete().eq('id', aBorrar[i]);
      }
    }
  } catch(e) { console.error('Error limpiando temporales:', e); }
}

// ============================================
// FIN BLOQUE 6 — Continúa en Bloque 7
// ============================================// ============================================
// BLOQUE 7: ABRIR RESERVA + MODALES DE PAGO
// ============================================

var deferredPrompt = null;

window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
  if (!document.getElementById('btn-instalar-pwa')) {
    var btn = document.createElement('div');
    btn.id = 'btn-instalar-pwa';
    btn.style = "position: fixed; bottom: 130px; right: 10px; background: #002A8F; color: #fff; border: 2px solid #FFD700; border-radius: 50px; padding: 10px 15px; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.5); cursor: pointer; z-index: 999; display: flex; align-items: center; gap: 5px; animation: flotar 2s infinite;";
    btn.innerHTML = '📲 Instalar App';
    btn.onclick = async function() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        var choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') { btn.remove(); }
        deferredPrompt = null;
      }
    };
    document.body.appendChild(btn);
  }
});

window.addEventListener('appinstalled', function() {
  var btn = document.getElementById('btn-instalar-pwa');
  if (btn) btn.remove();
  console.log('✅ App instalada como PWA');
});

function cerrarModalesDePago() {
  var ids = ['modal-transfermovil', 'modal-recarga', 'modal-qr-transfermovil'];
  ids.forEach(function(id) {
    var m = document.getElementById(id);
    if (m) m.remove();
  });
}

async function abrirReserva(numero, forzarPaso2) {
  if (window.__reservando) return;
  cerrarModalesDePago();

  var e = estaAbierto();
  if (!e.abierto) { mostrarAlerta('🔴 ' + e.motivo, 'error'); return; }

  var miTel = localStorage.getItem('mi_telefono') || '';
  var resExistente = reservas[numero];
  var esTemporalMia = resExistente && resExistente.estado === 'temporal' && resExistente.telefono === miTel;
  var esTemporalAjena = resExistente && resExistente.estado === 'temporal' && resExistente.telefono !== miTel;

  if (esTemporalAjena) {
    mostrarAlerta('⏳ Este número está en reserva temporal por otro jugador.\n\nEspera hasta 15 minutos o elige otro número.', 'error');
    return;
  }

  var btn = document.getElementById('num-' + numero);
  if (!esTemporalMia && btn && (btn.classList.contains('ocupado') || btn.classList.contains('pagado'))) {
    if (forzarPaso2) {
      mostrarAlerta('⚠️ Lo sentimos.\n\nEl número ' + numero + ' fue reservado por otra persona mientras realizabas tu pago.\n\nPor favor, elige otro número disponible.', 'error');
      localStorage.removeItem('reserva_pendiente');
      localStorage.removeItem('reserva_pendiente_nombre');
      localStorage.removeItem('reserva_pendiente_telefono');
      localStorage.removeItem('reserva_pendiente_precio');
      localStorage.removeItem('reserva_pendiente_turno');
      return;
    }
    mostrarAlerta('❌ Este número ya está ocupado', 'error');
    return;
  }

  if (!esTemporalMia) {
    var rateCheck = verificarRateLimit();
    if (!rateCheck.permitido) { mostrarAlerta(rateCheck.motivo, 'error'); return; }
  }

  if (!esTemporalMia && !forzarPaso2) {
    if (!supabaseClient) {
      mostrarAlerta('❌ Sin conexión al servidor. Verifica tu internet.', 'error');
      return;
    }
    try {
      var check = await supabaseClient.from('reservas').select('id').eq('numero', numero).eq('turno', turnoActual).in('estado', ['temporal', 'ocupado', 'pagado']);
      if (check.data && check.data.length > 0) {
        mostrarAlerta('❌ Alguien acaba de tomar este número. Elige otro.', 'error');
        await cargarReservas();
        return;
      }

      var miNombre = localStorage.getItem('mi_nombre') || '';
      var fechaActual = obtenerFechaFormateada();
      var horaActual = obtenerHora12();

      var ins = await supabaseClient.from('reservas').insert([{
        numero: numero,
        nombre: miNombre,
        telefono: miTel,
        referencia: '',
        estado: 'temporal',
        turno: turnoActual,
        fecha: fechaActual,
        hora: horaActual,
        telefono_recarga: miTel
      }]);

      if (ins.error) {
        mostrarAlerta('⚠️ No se pudo bloquear el número. Intenta de nuevo.', 'error');
        return;
      }

      reservas[numero] = {
        nombre: miNombre,
        telefono: miTel,
        estado: 'temporal',
        turno: turnoActual,
        fecha: fechaActual,
        hora: horaActual
      };
      if (btn && btn.classList) btn.classList.add('temporal');
    } catch(err) {
      console.error('Error insertando temporal:', err);
      mostrarAlerta('⚠️ Error de conexión. Intenta de nuevo.', 'error');
      return;
    }
  }

  iniciarTimerTemporal(numero);

  if (navigator.vibrate) { navigator.vibrate([60, 50, 60]); }
  reproducirSonido('click');

  var cPr = turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche';
  var precioNormal = parseInt(config[cPr] || '50');

  var precio = precioNormal;
  var esComboFamiliar = false;
  try {
    var misReservasCount = 0;
    Object.keys(reservas).forEach(function(num) {
      if (reservas[num].telefono === miTel && (reservas[num].estado === 'ocupado' || reservas[num].estado === 'pagado')) {
        misReservasCount++;
      }
    });
    if (misReservasCount === 2) {
      precio = Math.floor(precioNormal / 2);
      esComboFamiliar = true;
    }
  } catch(e) { console.warn('Error calculando combo:', e); }

  var mensajeMoti = obtenerMensajeMotivador(numero);
  if (esComboFamiliar) {
    mensajeMoti = '🎁 ¡COMBO FAMILIAR! Tu 3er número a solo ' + precio + ' CUP (mitad de precio)';
  }

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-reserva';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700;">' +
    '<div id="reserva-paso-1" class="paso-reserva ' + (forzarPaso2 ? '' : 'activo') + '">' +
    '<h2>🎯 Reservar número ' + numero + '</h2>' +
    '<div style="background:linear-gradient(135deg, ' + (esComboFamiliar ? '#E91E63' : '#FFD700') + ', ' + (esComboFamiliar ? '#880E4F' : '#FFA500') + '); border-radius:12px; padding:12px; margin-bottom:15px; text-align:center; box-shadow: 0 4px 15px rgba(255,215,0,0.4);">' +
    '<p style="color:' + (esComboFamiliar ? '#FFD700' : '#001A5C') + '; font-weight:900; font-size:14px; margin:0; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">' + escapeHtml(mensajeMoti) + '</p>' +
    (esComboFamiliar ? '<p style="color:#fff; font-size:11px; margin:6px 0 0; font-weight:bold;">🎉 Ahorras ' + (precioNormal - precio) + ' CUP en este número</p>' : '') +
    '</div>' +
    '<label>👤 Tu nombre:</label>' +
    '<input type="text" id="reserva-nombre" placeholder="Nombre y apellido" value="" inputmode="text" autocomplete="off" enterkeyhint="next" autocapitalize="words" spellcheck="false">' +
    '<label>📱 Tu teléfono:</label>' +
    '<input type="tel" id="reserva-telefono" placeholder="+5353437025 o 53438025" value="" inputmode="tel" autocomplete="off" enterkeyhint="next" maxlength="20">' +
    '<div class="datos-pago-mini" style="background: rgba(255,215,0,0.1); border-left: 4px solid #FFD700;">' +
    '<p><strong>💳 Paga ' + precio + ' CUP a:</strong></p>' +
    '<p>🏦 Metropolitano: <strong>9238959870089614</strong></p>' +
    '<button onclick="mostrarModalTransfermovil(' + precio + ', \'' + numero + '\')" class="btn-pago-directo tarjeta" style="background:#FFD700; color:#002A8F;">💳 Pagar con Transfermóvil</button>' +
    '<button onclick="copiarAlPortapapeles(\'9238959870089614\', \'💳 Tarjeta\')" style="width:100%;padding:8px;margin:6px 0;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:12px;cursor:pointer;">📋 Copiar Tarjeta</button>' +
    '<p style="margin-top:10px;">👤 Titular: Y. Enríquez S.</p>' +
    '<p>📱 O al teléfono: <strong>+5353437025</strong></p>' +
    '<button onclick="mostrarModalRecarga(' + precio + ', \'' + numero + '\')" class="btn-pago-directo" style="background:#2ECC71;">📱 Pagar por Recarga</button>' +
    '<button onclick="copiarAlPortapapeles(\'+5353437025\', \'📱 Teléfono\')" style="width:100%;padding:8px;margin:6px 0;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:12px;cursor:pointer;">📋 Copiar Teléfono</button>' +
    '</div>' +
    '<div class="modal-botones"><button class="btn-cancelar" onclick="cerrarModal()">Cancelar</button><button class="btn-aceptar" onclick="irAPaso2(\'' + numero + '\', ' + precio + ')">Ya pagué, Siguiente ➡️</button></div>' +
    '</div>' +
    '<div id="reserva-paso-2" class="paso-reserva ' + (forzarPaso2 ? 'activo' : '') + '">' +
    '<h2>📸 Sube tu comprobante</h2><p style="font-size:12px; margin-bottom:10px; color:#FFD700;">Número ' + numero + ' - ' + precio + ' CUP</p>' +
    '<label>🔐 Código de Transacción (SMS) <span style="color:#F44336;">*</span>:</label>' +
    '<input type="text" id="reserva-codigo-sms" placeholder="Ej: MM6052V8EE987" inputmode="text" autocomplete="off" enterkeyhint="next" autocapitalize="characters" spellcheck="false" maxlength="30" style="text-transform:uppercase;">' +
    '<p style="font-size:11px; color:#FFC107; margin-top:4px; margin-bottom:10px; text-align:left; font-style:italic;">📱 Cópialo del SMS que te llegó al confirmar la transferencia. Es OBLIGATORIO.</p>' +
    '<label>💳 Número de referencia (Opcional):</label>' +
    '<input type="text" id="reserva-referencia" placeholder="Número de la transferencia o tarjeta destino" inputmode="text" autocomplete="off" enterkeyhint="next" autocapitalize="characters" spellcheck="false">' +
    '<div class="captura-container"><label>📸 Captura del pago:</label><input type="file" id="reserva-captura" accept="image/*" style="display:none">' +
    '<button type="button" class="btn-subir-captura" onclick="document.getElementById(\'reserva-captura\').click()">📷 Subir captura</button>' +
    '<p class="captura-info">Sube la foto de la transferencia o recarga</p><img id="captura-preview" class="captura-preview" loading="lazy" alt="Previsualización de captura"></div>' +
    '<div class="modal-botones"><button class="btn-cancelar" onclick="volverAPaso1()">⬅️ Atrás</button><button class="btn-aceptar" onclick="confirmarReserva(\'' + numero + '\')">✅ Reservar</button></div>' +
    '<button onclick="cerrarModal()" style="width: 100%; margin-top: 10px; background: linear-gradient(135deg, #F44336, #B71C1C); color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 14px; cursor: pointer;">❌ Cancelar reserva</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
  if (forzarPaso2) {
    try {
      if (supabaseClient) {
         var checkTemp = await supabaseClient.from('reservas').select('id').eq('numero', numero).eq('turno', turnoActual).eq('estado', 'temporal').eq('telefono', miTel).maybeSingle();
         if (!checkTemp.data) {
            mostrarAlerta('⚠️ Tu reserva expiró mientras cerrabas la app.\n\nPor favor, elige otro número e intenta de nuevo.', 'error');
            m.remove();
            detenerTimerTemporal();
            return;
         }
      }
    } catch(e) { console.warn('Error verificando temporal', e); }

    window.reservaTemp = {
      nombre: localStorage.getItem('mi_nombre') || '',
      telefono: miTel,
      precio: precio
    };
  }

  var capturaInput = document.getElementById('reserva-captura');
  if (capturaInput) {
    capturaInput.addEventListener('change', function(ev) {
      var f = ev.target.files[0];
      if (f) {
        var rd = new FileReader();
        rd.onload = function(e2) {
          var p = document.getElementById('captura-preview');
          if (p) {
            p.src = e2.target.result;
            p.classList.add('visible');
          }
        };
        rd.readAsDataURL(f);
      }
    });
  }

  var inputsReserva = m.querySelectorAll('input, textarea');
  inputsReserva.forEach(function(inp) {
    inp.addEventListener('focus', function() {
      setTimeout(function() {
        var rect = inp.getBoundingClientRect();
        var alturaVisible = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        if (rect.bottom > alturaVisible - 120 || rect.top < 80) {
          inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    });
  });

  if (window.visualViewport) {
    if (window.__vvHandlerReserva) {
      window.visualViewport.removeEventListener('resize', window.__vvHandlerReserva);
    }
    window.__vvHandlerReserva = function() {
      var modalActual = document.querySelector('#modal-reserva .modal-contenido');
      if (modalActual) {
        var alturaVV = window.visualViewport.height;
        modalActual.style.maxHeight = Math.max(280, alturaVV - 40) + 'px';
      }
    };
    window.visualViewport.addEventListener('resize', window.__vvHandlerReserva);
    window.__vvHandlerReserva();
  }

  marcarUltimaReserva();
}

function irAPaso2(numero, precio) {
  var nombreEl = document.getElementById('reserva-nombre');
  var telefonoEl = document.getElementById('reserva-telefono');
  var nombre = nombreEl ? nombreEl.value.trim() : '';
  var telefono = telefonoEl ? telefonoEl.value.trim() : '';

  if (!nombre) { mostrarAlerta('⚠️ Escribe tu nombre completo.', 'error'); return; }
  if (!telefono || !validarTelefonoCubano(telefono)) {
    mostrarAlerta('⚠️ Teléfono cubano inválido.\n\nEjemplo: +5353437025 o 53438025', 'error');
    return;
  }

  if (!window.reservaTemp) window.reservaTemp = {};
  window.reservaTemp.nombre = nombre;
  window.reservaTemp.telefono = telefono;
  window.reservaTemp.precio = precio;

  var paso1 = document.getElementById('reserva-paso-1');
  var paso2 = document.getElementById('reserva-paso-2');
  if (paso1) paso1.classList.remove('activo');
  if (paso2) paso2.classList.add('activo');

  var inputSMS = document.getElementById('reserva-codigo-sms');
  if (inputSMS) setTimeout(function() { inputSMS.focus(); }, 250);

  if (paso2) paso2.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function volverAPaso1() {
  var paso1 = document.getElementById('reserva-paso-1');
  var paso2 = document.getElementById('reserva-paso-2');
  if (paso2) paso2.classList.remove('activo');
  if (paso1) paso1.classList.add('activo');
  if (paso1) paso1.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cerrarModal() {
  var modal = document.getElementById('modal-reserva');
  if (modal) modal.remove();

  document.querySelectorAll('.modal-custom-overlay:not(.visible)').forEach(function(o) {
    if (o.parentNode) o.parentNode.removeChild(o);
  });

  if (typeof reservaTemporalActiva !== 'undefined' && reservaTemporalActiva && !window.__reservando) {
    var numCancelar = reservaTemporalActiva.numero;
    var turnoCancelar = reservaTemporalActiva.turno;
    var miTelCancelar = localStorage.getItem('mi_telefono') || '';

    if (typeof detenerTimerTemporal === 'function') detenerTimerTemporal();
    reservaTemporalActiva = null;

    (async function() {
      try {
        if (supabaseClient) {
          await supabaseClient.from('reservas').delete().eq('numero', numCancelar).eq('turno', turnoCancelar).eq('estado', 'temporal').eq('telefono', miTelCancelar);
          await cargarReservas();
        }
      } catch(e) { console.warn('Error liberando temporal al cerrar:', e); }
    })();

    try {
      if (typeof registrarCancelacion === 'function') registrarCancelacion();
    } catch(e) { console.warn('Error registrando cancelación:', e); }
  }
}

function cerrarModalExito() {
  var modal = document.getElementById('modal-exito');
  if (modal) modal.remove();
  if (typeof mostrarSeccion === 'function') {
    mostrarSeccion('tickets');
  } else {
    var ticketsSec = document.getElementById('tickets');
    if (ticketsSec) ticketsSec.classList.add('activa');
    if (typeof cargarTickets === 'function') cargarTickets();
  }
}

function mostrarModalTransfermovil(precio, numero) {
  cerrarModalesDePago();
  var numeroSeguro = escapeHtml(String(numero || ''));
  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-transfermovil';
  m.style.zIndex = '999999';
  m.innerHTML = '<div class="modal-contenido" style="background: linear-gradient(180deg, #001A5C 0%, #000D2E 100%); border: 2px solid #FFD700; padding: 20px 15px;">' +
    '<div style="background: #FFC107; border-radius: 12px; padding: 15px; text-align: center; margin-bottom: 15px;">' +
    '<h2 style="color: #001A5C; margin: 0; font-size: 20px; font-weight: 900;">👉 Abrir Transfermóvil</h2>' +
    '</div>' +
    '<p style="color: #FFC107; font-size: 12px; text-align: center; margin-bottom: 15px; font-style: italic; background: rgba(255,193,7,0.1); padding: 8px; border-radius: 8px;">' +
    '💡 Si no se abre solo, abre la app Transfermóvil manualmente.' +
    '</p>' +
    '<div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; text-align: left;">' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 10px;"><strong>2.</strong> Selecciona <strong style="color: #2ECC71;">Transfermóvil -> Transferencia a tarjeta.</strong></p>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>3.</strong> Copia la <strong>tarjeta destino</strong> y pégala:</p>' +
    '<button onclick="copiarAlPortapapeles(\'9238959870089614\', \'💳 Tarjeta Metropolitano\')" style="width:100%; background: #2ECC71; color: #fff; border: none; padding: 15px; border-radius: 10px; font-weight: 900; font-size: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(46,204,113,0.3);">' +
    '<span>📋 Copiar Tarjeta</span><span style="font-family: monospace; font-size: 14px;">9238959870089614</span>' +
    '</button>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>4.</strong> Copia el <strong>monto</strong> y pégalo:</p>' +
    '<button onclick="copiarAlPortapapeles(\'' + precio + '\', \'💰 Monto\')" style="width:100%; background: #FF9800; color: #fff; border: none; padding: 15px; border-radius: 10px; font-weight: 900; font-size: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(255,152,0,0.3);">' +
    '<span>📋 Copiar Monto</span><span>' + precio + ' CUP</span>' +
    '</button>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>5.</strong> Moneda: <strong>CUP</strong></p>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>6.</strong> Tipo de cuenta: <strong>CUP</strong></p>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>7.</strong> Móvil a confirmar: copia mi número:</p>' +
    '<button onclick="copiarAlPortapapeles(\'+5353437025\', \'📱 Móvil a confirmar\')" style="width:100%; background: #2196F3; color: #fff; border: none; padding: 15px; border-radius: 10px; font-weight: 900; font-size: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(33,150,243,0.3);">' +
    '<span>📋 Copiar Móvil</span><span>+5353437025</span>' +
    '</button>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>8.</strong> Pulsa Aceptar y espera el SMS de confirmación.</p>' +
    '<div style="background: rgba(224,64,251,0.1); border: 1px dashed #E040FB; border-radius: 10px; padding: 12px; margin-top: 15px; text-align: center;">' +
    '<p style="color: #E040FB; font-size: 11px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">🏦 Datos del Titular</p>' +
    '<p style="color: #fff; font-size: 15px; margin: 0; font-weight: 900;">Y. Enríquez S.</p>' +
    '</div>' +
    '</div>' +
    '<div style="background: rgba(46,204,113,0.15); border: 2px solid #2ECC71; border-radius: 12px; padding: 15px; margin-top: 15px; text-align: left;">' +
    '<h4 style="color: #2ECC71; margin: 0 0 10px 0; font-size: 15px;">📸 IMPORTANTE AL TERMINAR:</h4>' +
    '<p style="color: #fff; font-size: 13px; margin-bottom: 5px;"><strong>9.</strong> Haz una captura de pantalla del recibo.</p>' +
    '<p style="color: #fff; font-size: 13px; margin-bottom: 5px;"><strong>10.</strong> Vuelve a la app (NO la cierres). El sistema recordará tu número y tus datos automáticamente.</p>' +
    '<p style="color: #fff; font-size: 13px; margin-bottom: 0;"><strong>11.</strong> Pega tu captura y tu número de transferencia, y espera la aprobación.</p>' +
    '</div>' +
    '<div style="display: flex; gap: 10px; margin-top: 20px;">' +
    '<button onclick="var m=document.getElementById(\'modal-transfermovil\'); if(m) m.remove();" style="flex: 1; padding: 15px; background: rgba(255,255,255,0.1); color: #fff; border: 2px solid #fff; border-radius: 10px; font-weight: bold; font-size: 15px; cursor: pointer;">⬅️ Atrás</button>' +
    '<button onclick="var m=document.getElementById(\'modal-transfermovil\'); if(m) m.remove(); irAPaso2(\'' + numeroSeguro + '\', ' + precio + ');" style="flex: 2; padding: 15px; background: #2ECC71; color: #fff; border: none; border-radius: 10px; font-weight: 900; font-size: 16px; cursor: pointer; box-shadow: 0 4px 15px rgba(46,204,113,0.4);">✅ Ya pagué, continuar</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

function mostrarModalRecarga(precio, numero) {
  cerrarModalesDePago();
  var numeroSeguro = escapeHtml(String(numero || ''));
  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-recarga';
  m.style.zIndex = '999999';
  m.innerHTML = '<div class="modal-contenido" style="background: linear-gradient(180deg, #001A5C 0%, #000D2E 100%); border: 2px solid #2ECC71; padding: 20px 15px;">' +
    '<div style="text-align: center; margin-bottom: 15px;">' +
    '<h2 style="color: #2ECC71; margin: 0; font-size: 20px; font-weight: 900;">📱 Transferencia de Saldo</h2>' +
    '<p style="color: #fff; font-size: 13px; margin-top: 5px;">Copia cada dato y sigue los pasos. <strong>Todo sin salir de la app.</strong></p>' +
    '</div>' +
    '<div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; text-align: left;">' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 10px;"><strong>1.</strong> Toca el botón para abrir tu teclado de llamada:</p>' +
    '<a href="tel:*234%23" style="width:100%; display: block; text-align: center; background: #2196F3; color: #fff; text-decoration: none; border: none; padding: 15px; border-radius: 10px; font-weight: 900; font-size: 16px; margin-bottom: 8px; box-shadow: 0 4px 10px rgba(33,150,243,0.3);">📞 Abrir Teclado de Llamada</a>' +
    '<p style="color: #FFC107; font-size: 11px; text-align: center; margin-bottom: 15px; font-style: italic;">💡 Si no se abre solo, abre tu app de Teléfono manualmente.</p>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>2.</strong> Copia este <strong>código</strong> y pégalo en el teclado. Luego marca:</p>' +
    '<button onclick="copiarAlPortapapeles(\'*234#\', \'📟 Código\')" style="width:100%; background: #2ECC71; color: #fff; border: none; padding: 15px; border-radius: 10px; font-weight: 900; font-size: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(46,204,113,0.3);">' +
    '<span>📋 Copiar Código</span><span>*234#</span>' +
    '</button>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>3.</strong> Espera el menú y selecciona la opción 1 (Transferencia de saldo).</p>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>4.</strong> Copia el <strong>número</strong> y pégalo:</p>' +
    '<button onclick="copiarAlPortapapeles(\'53437025\', \'📱 Número\')" style="width:100%; background: #FFC107; color: #001A5C; border: none; padding: 15px; border-radius: 10px; font-weight: 900; font-size: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(255,193,7,0.3);">' +
    '<span>📋 Copiar Número</span><span>53437025</span>' +
    '</button>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>5.</strong> Copia la <strong>clave de transferencia</strong> y pégala:</p>' +
    '<button onclick="copiarAlPortapapeles(\'1234\', \'🔑 Clave\')" style="width:100%; background: #E040FB; color: #fff; border: none; padding: 15px; border-radius: 10px; font-weight: 900; font-size: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(224,64,251,0.3);">' +
    '<span>📋 Copiar Clave</span><span>1234</span>' +
    '</button>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>6.</strong> Copia el <strong>monto</strong> y pégalo:</p>' +
    '<button onclick="copiarAlPortapapeles(\'' + precio + '\', \'💰 Monto\')" style="width:100%; background: #FF9800; color: #fff; border: none; padding: 15px; border-radius: 10px; font-weight: 900; font-size: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(255,152,0,0.3);">' +
    '<span>📋 Copiar Monto</span><span>' + precio + ' CUP</span>' +
    '</button>' +
    '<p style="color: #fff; font-size: 14px; margin-bottom: 8px;"><strong>7.</strong> Marque 1 y confirma la recarga.</p>' +
    '<div style="background: rgba(224,64,251,0.1); border: 1px dashed #E040FB; border-radius: 10px; padding: 12px; margin-top: 15px; text-align: center;">' +
    '<p style="color: #E040FB; font-size: 11px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">📱 Destinatario de la Recarga</p>' +
    '<p style="color: #fff; font-size: 15px; margin: 0; font-weight: 900;">Y. Enríquez S.</p>' +
    '</div>' +
    '</div>' +
    '<div style="background: rgba(46,204,113,0.15); border: 2px solid #2ECC71; border-radius: 12px; padding: 15px; margin-top: 15px; text-align: left;">' +
    '<h4 style="color: #2ECC71; margin: 0 0 10px 0; font-size: 15px;">📸 IMPORTANTE AL TERMINAR:</h4>' +
    '<p style="color: #fff; font-size: 13px; margin-bottom: 5px;"><strong>8.</strong> Haz una captura de pantalla del recibo.</p>' +
    '<p style="color: #fff; font-size: 13px; margin-bottom: 5px;"><strong>9.</strong> Vuelve a la app (NO la cierres). El sistema recordará tu número y tus datos.</p>' +
    '<p style="color: #fff; font-size: 13px; margin-bottom: 0;"><strong>10.</strong> Pega tu captura y tu número de transferencia, y espera la aprobación.</p>' +
    '</div>' +
    '<div style="display: flex; gap: 10px; margin-top: 20px;">' +
    '<button onclick="var m=document.getElementById(\'modal-recarga\'); if(m) m.remove();" style="flex: 1; padding: 15px; background: rgba(255,255,255,0.1); color: #fff; border: 2px solid #fff; border-radius: 10px; font-weight: bold; font-size: 15px; cursor: pointer;">⬅️ Atrás</button>' +
    '<button onclick="var m=document.getElementById(\'modal-recarga\'); if(m) m.remove(); irAPaso2(\'' + numeroSeguro + '\', ' + precio + ');" style="flex: 2; padding: 15px; background: #2ECC71; color: #fff; border: none; border-radius: 10px; font-weight: 900; font-size: 16px; cursor: pointer; box-shadow: 0 4px 15px rgba(46,204,113,0.4);">✅ Ya pagué, continuar</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

function mostrarModalQRTransfermovil() {
  cerrarModalesDePago();
  var precio = (typeof config !== 'undefined' && config) ? (config[turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche'] || '50') : '50';
  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-qr-transfermovil';
  m.style.zIndex = '999999';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700; text-align:center;">' +
    '<h2 style="color:#FFD700;">📲 QR de Pago</h2>' +
    '<p style="font-size:12px; color:rgba(255,255,255,0.7); margin-bottom:15px;">Muestra o escanea este QR para pagar</p>' +
    '<div id="qr-container-pago" style="background:#fff; border-radius:12px; padding:15px; display:inline-block; margin-bottom:15px; min-width:220px; min-height:220px; line-height:220px; color:#999;">Generando QR...</div>' +
    '<div style="background: rgba(255,215,0,0.1); border-left: 4px solid #FFD700; padding: 12px; border-radius: 10px; margin-bottom: 15px; font-size: 13px; text-align: left;">' +
    '<p style="margin: 3px 0;">💳 Tarjeta: <strong>9238 9598 7008 9614</strong></p>' +
    '<p style="margin: 3px 0;">👤 Titular: <strong>Y. Enríquez S.</strong></p>' +
    '<p style="margin: 3px 0;">💰 Monto: <strong style="color:#FFD700;">' + precio + ' CUP</strong></p>' +
    '<p style="margin: 3px 0;">📱 Confirmación: <strong>+5353437025</strong></p>' +
    '</div>' +
    '<button onclick="var m=document.getElementById(\'modal-qr-transfermovil\'); if(m) m.remove();" style="width:100%; padding:12px; background:#FFD700; color:#002A8F; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">Cerrar</button>' +
    '</div>';
  document.body.appendChild(m);

  var qrData = 'Transfermovil|9238959870089614|Y. Enriquez S.|' + precio + '|CUP';
  var cont = document.getElementById('qr-container-pago');

  if (typeof QRCode !== 'undefined' && cont) {
    try {
      QRCode.toDataURL(qrData, { width: 220, margin: 1 }, function(err, url) {
        if (!err && cont && url) {
          cont.innerHTML = '<img src="' + url + '" style="width:220px; height:220px; display:block;" alt="QR de pago">';
        } else if (cont) {
          cont.innerHTML = '<p style="color:#000; font-size:12px; line-height:1.5;">QR no disponible.<br>Copia la tarjeta manualmente.</p>';
        }
      });
    } catch(e) {
      if (cont) cont.innerHTML = '<p style="color:#000; font-size:12px; line-height:1.5;">QR no disponible.<br>Copia la tarjeta manualmente.</p>';
    }
  } else if (cont) {
    cont.innerHTML = '<p style="color:#000; font-size:12px; line-height:1.5;">QR no disponible.<br>Copia la tarjeta manualmente.</p>';
  }
}

function mostrarConfirmacionReal(mensaje) {
  if (typeof mostrarConfirmacionCustom !== 'function') {
    return Promise.resolve(window.confirm(mensaje));
  }
  return mostrarConfirmacionCustom(mensaje);
}

// ============================================
// FIN BLOQUE 7 — Continúa en Bloque 8
// ============================================// ============================================
// BLOQUE 8: CONFIRMAR RESERVA + COLA OFFLINE
// ============================================

async function confirmarReserva(numero) {
  if (window.__reservando) return;
  window.__reservando = true;

  try {
    if (!supabaseClient) {
      mostrarAlerta('❌ Sin conexión con el servidor.\n\nVerifica tu internet y vuelve a intentarlo.', 'error');
      window.__reservando = false;
      return;
    }

    if (!window.reservaTemp || !window.reservaTemp.nombre || !window.reservaTemp.telefono) {
      mostrarAlerta('⚠️ Error: Datos de reserva perdidos.\n\nPor favor, vuelve a seleccionar el número.', 'error');
      cerrarModal();
      window.__reservando = false;
      return;
    }

    var nombre = window.reservaTemp.nombre;
    var telefono = window.reservaTemp.telefono;

    var smsInput = document.getElementById('reserva-codigo-sms');
    var refInput = document.getElementById('reserva-referencia');
    var capturaInput = document.getElementById('reserva-captura');

    var codigoSMS = smsInput ? smsInput.value.trim().toUpperCase() : '';
    var referencia = refInput ? refInput.value.trim() : '';
    var archivo = (capturaInput && capturaInput.files) ? capturaInput.files[0] : null;

    if (!codigoSMS || codigoSMS.length < 6) {
      mostrarAlerta('⚠️ CÓDIGO SMS OBLIGATORIO\n\nDebes escribir el Código de Transacción que aparece en el SMS de confirmación.\n\nEjemplo: MM6052V8EE987\n\nMínimo 6 caracteres.', 'error');
      window.__reservando = false;
      return;
    }

    if (!archivo) {
      mostrarAlerta('⚠️ Sube la captura del pago', 'error');
      window.__reservando = false;
      return;
    }

    if (bloqueados.indexOf(telefono) !== -1) {
      mostrarAlerta('🚫 Tu número está bloqueado.', 'error');
      window.__reservando = false;
      return;
    }

    var btnReservar = document.querySelector('#reserva-paso-2 .btn-aceptar') || document.querySelector('#modal-reserva .btn-aceptar');
    if (btnReservar) {
      btnReservar.innerText = '⏳ Procesando...';
      btnReservar.disabled = true;
    }

    var archivoComprimido = await comprimirImagen(archivo);
    var hashImagen = await generarHash(archivoComprimido);
    var capturaBase64 = await blobToBase64(archivoComprimido);

    if (!navigator.onLine) {
      await encolarReservaOffline({
        numero: numero,
        nombre: nombre,
        telefono: telefono,
        referencia: referencia,
        codigoSMS: codigoSMS,
        precio: window.reservaTemp.precio,
        turno: turnoActual,
        capturaBase64: capturaBase64,
        hashImagen: hashImagen,
        ip: miIP
      });
      window.__reservando = false;
      return;
    }

    var exitoRed = false;
    var datosExito = null;

    try {
      var cpLimit = await supabaseClient.from('reservas').select('id').eq('telefono', telefono).eq('turno', turnoActual).in('estado', ['ocupado', 'pagado']);
      if (cpLimit.data && cpLimit.data.length >= 3) {
        mostrarAlerta('❌ Límite alcanzado.\n\nSolo puedes reservar un máximo de 3 números por turno.', 'error');
        cerrarModal();
        window.__reservando = false;
        return;
      }

      var cs = await supabaseClient.from('reservas').select('id').eq('numero', numero).eq('turno', turnoActual).in('estado', ['ocupado', 'pagado']).maybeSingle();
      if (cs.data) {
        mostrarAlerta('❌ Alguien acaba de reservar este número.', 'error');
        cerrarModal();
        cargarReservas();
        window.__reservando = false;
        return;
      }

      var checkSMS = await supabaseClient.from('reservas').select('id,numero').eq('codigo_sms', codigoSMS);
      if (checkSMS.data && checkSMS.data.length > 0) {
        mostrarAlerta('🚫 CÓDIGO SMS YA USADO\n\nEste código de transacción ya fue registrado en otra reserva.\n\nCada código SMS solo se puede usar UNA vez.', 'error');
        if (btnReservar) { btnReservar.innerText = '✅ Reservar'; btnReservar.disabled = false; }
        window.__reservando = false;
        return;
      }

      var checkHash = await supabaseClient.from('reservas').select('id,numero').eq('hash_captura', hashImagen);
      if (checkHash.data && checkHash.data.length > 0) {
        mostrarAlerta('🚫 CAPTURA DUPLICADA DETECTADA\n\nEsta imagen ya fue usada en otra reserva (Nº ' + checkHash.data[0].numero + ').\n\nSolo se puede usar una captura por reserva.', 'error');
        if (btnReservar) { btnReservar.innerText = '✅ Reservar'; btnReservar.disabled = false; }
        window.__reservando = false;
        return;
      }

      if (archivoComprimido.size < 1000) {
        mostrarAlerta('🚫 CAPTURA SOSPECHOSA\n\nLa imagen es demasiado pequeña. Sube una captura real del SMS o de Transfermóvil.', 'error');
        if (btnReservar) { btnReservar.innerText = '✅ Reservar'; btnReservar.disabled = false; }
        window.__reservando = false;
        return;
      }

      var nombreArchivo = turnoActual + '_' + numero + '_' + Date.now() + '.jpg';
      var subida = await supabaseClient.storage.from('capturas').upload(nombreArchivo, archivoComprimido);
      if (subida.error) throw new Error('upload fail: ' + subida.error.message);
      var urlCaptura = supabaseClient.storage.from('capturas').getPublicUrl(nombreArchivo).data.publicUrl;
      var codigoTicket = 'RIF-' + Math.floor(Math.random() * 90000) + 10000;
      var fechaActual = obtenerFechaFormateada();
      var horaActual = obtenerHora12();

      await supabaseClient.from('reservas').delete().eq('numero', numero).eq('turno', turnoActual).eq('estado', 'temporal');

      var ins = await supabaseClient.from('reservas').insert([{
        numero: numero,
        nombre: nombre,
        telefono: telefono,
        referencia: referencia,
        codigo_sms: codigoSMS,
        estado: 'ocupado',
        turno: turnoActual,
        fecha: fechaActual,
        hora: horaActual,
        captura_url: urlCaptura,
        telefono_recarga: telefono,
        hash_captura: hashImagen,
        codigo_ticket: codigoTicket,
        ip_jugador: miIP
      }]);

      if (ins.error) {
        if (ins.error.message && (ins.error.message.includes('unique_numero_turno') || ins.error.code === '23505')) {
          mostrarAlerta('❌ LO SENTIMOS, EL NÚMERO YA FUE OCUPADO\n\nAlguien tomó el número mientras subías tu captura.\n\nPor favor, elige otro número disponible.', 'error');
          cerrarModal();
          await cargarReservas();
          window.__reservando = false;
          return;
        }
        mostrarAlerta('❌ Error del servidor al guardar el ticket.\n\nDetalle técnico: ' + ins.error.message + '\n\n⚠️ Avisa al administrador.', 'error');
        if (btnReservar) { btnReservar.innerText = '✅ Reservar'; btnReservar.disabled = false; }
        window.__reservando = false;
        return;
      }

      exitoRed = true;
      datosExito = {
        urlCaptura: urlCaptura,
        codigoTicket: codigoTicket,
        fechaActual: fechaActual,
        horaActual: horaActual
      };
    } catch (err) {
      var errMsg = String(err && err.message ? err.message : err).toLowerCase();
      var esErrorRed = !navigator.onLine || errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('timeout') || errMsg.includes('failed to fetch');

      if (!esErrorRed) {
        console.error('❌ Error NO de red al confirmar reserva:', err);
        mostrarAlerta('❌ Error al guardar el ticket.\n\nDetalle: ' + (err.message || 'Error desconocido') + '\n\n⚠️ Contacta al administrador.', 'error');
        if (btnReservar) { btnReservar.innerText = '✅ Reservar'; btnReservar.disabled = false; }
        window.__reservando = false;
        return;
      }
      console.warn('⚠️ Fallo de red. Se guardará en cola offline:', err);
    }

    if (exitoRed && datosExito) {
      localStorage.setItem('mi_nombre', nombre);
      localStorage.setItem('mi_telefono', telefono);
      localStorage.removeItem('reserva_pendiente');
      detenerTimerTemporal();
      reservaTemporalActiva = null;
      try { localStorage.removeItem('reserva_temporal_' + turnoActual + '_' + numero); } catch(e) {}

      cerrarModal();
      reproducirSonido('reserva');
      await sumarPuntos(telefono, nombre);
      await cargarReservas();

      var foto = '';
      try {
        var rFoto = await supabaseClient.from('puntos_jugadores').select('foto_perfil').eq('telefono', telefono).maybeSingle();
        if (rFoto.data && rFoto.data.foto_perfil) {
          foto = rFoto.data.foto_perfil;
          localStorage.setItem('mi_foto', foto);
        }
      } catch(e) {}
      if (!foto) foto = localStorage.getItem('mi_foto') || '';
      if (!foto) foto = 'https://i.postimg.cc/J4FCWf5y/Picsart-26-10-16-06-30-57-665.jpg';

      try {
        await supabaseClient.from('chat').insert([{
          usuario: '🤖 SISTEMA',
          telefono: '0000',
          mensaje: '🎲 El jugador ' + nombre + ' acaba de reservar el número ' + numero + ' (' + (turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche') + ').\n📅 Fecha: ' + datosExito.fechaActual + '\n🕐 Hora: ' + datosExito.horaActual + '\n🎟️ Código: #' + datosExito.codigoTicket + '\n¡Mucha suerte! 🍀',
          es_admin: true
        }]);
        await cargarChatWa();
      } catch(e) { console.warn('Error enviando mensaje al chat:', e); }

      var nombreEsc = escapeHtml(nombre);
      var numeroEsc = escapeHtml(numero);
      var codigoSMSEsc = escapeHtml(codigoSMS);
      var codigoTicketEsc = escapeHtml(datosExito.codigoTicket);
      var fechaEsc = escapeHtml(datosExito.fechaActual);
      var horaEsc = escapeHtml(datosExito.horaActual);
      var fotoEsc = escapeHtml(foto);

      var m2 = document.createElement('div');
      m2.className = 'modal';
      m2.id = 'modal-exito';
      m2.innerHTML = '<div class="modal-contenido" id="ticket-digital" style="background: linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%); color:#002A8F; text-align:center; border: 6px solid #FFD700; border-radius: 20px; padding: 0; overflow: hidden; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">' +
        '<img src="https://i.postimg.cc/J4FCWf5y/Picsart-26-10-16-06-30-57-665.jpg" alt="Marca de agua" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 250px; height: 250px; opacity: 0.08; border-radius: 50%; pointer-events: none; z-index: 0;">' +
        '<div style="background: linear-gradient(135deg, #001A5C, #002A8F); padding: 15px; border-bottom: 3px dashed #FFD700; position: relative; z-index: 1;">' +
        '<img src="https://i.postimg.cc/J4FCWf5y/Picsart-26-10-16-06-30-57-665.jpg" alt="Logo" style="width:70px; height:70px; border-radius:50%; border:3px solid #FFD700; box-shadow: 0 0 15px rgba(255,215,0,0.6); margin-bottom: 5px;">' +
        '<h2 style="color:#FFD700; margin:0; font-size:20px; letter-spacing:1px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">LA RIFITA CUBANA</h2>' +
        '<p style="color:#fff; font-size:11px; margin:2px 0 0 0; font-style:italic;">Juega con confianza y seguridad</p>' +
        '</div>' +
        '<div style="padding: 15px 20px 0 20px; position: relative; z-index: 1;">' +
        '<img src="' + fotoEsc + '" alt="Foto jugador" style="width:70px; height:70px; border-radius:50%; border:3px solid #FFD700; object-fit:cover; box-shadow:0 4px 10px rgba(0,0,0,0.2);">' +
        '<p style="font-size:11px; color:#666; margin:5px 0 10px 0; letter-spacing:2px; font-weight:bold;">COMPROBANTE OFICIAL</p>' +
        '</div>' +
        '<div style="background: rgba(255,255,255,0.85); backdrop-filter: blur(5px); border-radius:12px; padding:15px; margin: 0 20px 15px 20px; text-align:left; border: 2px solid #FFD700; box-shadow: inset 0 0 10px rgba(0,0,0,0.05); position: relative; z-index: 1;">' +
        '<p style="margin:6px 0; font-size:14px; border-bottom: 1px dashed #ccc; padding-bottom:4px;"><strong>👤 Jugador:</strong> ' + nombreEsc + '</p>' +
        '<p style="margin:6px 0; font-size:14px; border-bottom: 1px dashed #ccc; padding-bottom:4px;"><strong>🔢 Número:</strong> <span style="font-size:22px; font-weight:bold; color:#F44336;">' + numeroEsc + '</span></p>' +
        '<p style="margin:6px 0; font-size:14px; border-bottom: 1px dashed #ccc; padding-bottom:4px;"><strong>🎯 Turno:</strong> ' + (turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche') + '</p>' +
        '<p style="margin:6px 0; font-size:14px; border-bottom: 1px dashed #ccc; padding-bottom:4px;"><strong>📅 Fecha:</strong> ' + fechaEsc + '</p>' +
        '<p style="margin:6px 0; font-size:14px; border-bottom: 1px dashed #ccc; padding-bottom:4px;"><strong>⏰ Hora:</strong> ' + horaEsc + '</p>' +
        '<p style="margin:6px 0; font-size:14px; border-bottom: 1px dashed #ccc; padding-bottom:4px;"><strong>🔐 Código SMS:</strong> <span style="color:#F44336; font-weight:bold; font-family:monospace; font-size:13px;">' + codigoSMSEsc + '</span></p>' +
        '<p style="margin:6px 0; font-size:14px;"><strong>🎟️ Ticket:</strong> <span style="color:#002A8F; font-weight:bold;">#' + codigoTicketEsc + '</span></p>' +
        '</div>' +
        '<p style="font-size:11px; color:#555; margin: 0 20px 15px 20px; font-weight:bold; position: relative; z-index: 1;">📌 Guarda este ticket. Es tu comprobante oficial.</p>' +
        '<div style="display:flex; flex-direction:column; gap:8px; padding: 0 20px 20px 20px; position: relative; z-index: 1;">' +
        '<button onclick="compartirTicket(\'' + nombreEsc + '\', \'' + numeroEsc + '\', \'' + codigoTicketEsc + '\', \'' + fechaEsc + '\', \'' + horaEsc + '\')" style="background:#25D366; color:#fff; border:none; padding:12px; border-radius:10px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow: 0 4px 10px rgba(37,211,102,0.4);">📲 Compartir en el Grupo</button>' +
        '<button onclick="descargarTicket()" style="background:#FFD700; color:#002A8F; border:none; padding:12px; border-radius:10px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow: 0 4px 10px rgba(255,215,0,0.4);">📥 Descargar Imagen</button>' +
        '<button onclick="cerrarModalExito()" style="background:#F44336; color:#fff; border:none; padding:12px; border-radius:10px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow: 0 4px 10px rgba(244,67,54,0.4);">❌ Cerrar</button>' +
        '</div>' +
        '</div>';
      document.body.appendChild(m2);
      window.__reservando = false;
      return;
    }

    await encolarReservaOffline({
      numero: numero,
      nombre: nombre,
      telefono: telefono,
      referencia: referencia,
      codigoSMS: codigoSMS,
      precio: window.reservaTemp.precio,
      turno: turnoActual,
      capturaBase64: capturaBase64,
      hashImagen: hashImagen,
      ip: miIP
    });

  } catch (error) {
    console.error("Error crítico en confirmarReserva:", error);
    mostrarAlerta('❌ Ocurrió un error inesperado al procesar tu reserva.\n\nDetalle: ' + (error.message || 'Error desconocido'), 'error');
  } finally {
    window.__reservando = false;
  }
}

async function encolarReservaOffline(datos) {
  try {
    if (typeof Persistencia === 'undefined' || !Persistencia) {
      mostrarAlerta('❌ Error: Sistema de reservas offline no disponible.\n\nRecarga la app e intenta de nuevo.', 'error');
      return;
    }
    var colaActual = Persistencia.leerCola();
    var reservasEnCola = colaActual.filter(function(o) { return o.tipo === 'reserva'; });
    if (reservasEnCola.length >= 5) {
      mostrarAlerta('⚠️ Ya tienes 5 reservas pendientes de sincronizar.\n\nEspera a recuperar la señal antes de reservar más números.', 'error');
      return;
    }
    var codigoTicket = 'RIF-' + Math.floor(Math.random() * 90000) + 10000;
    var fechaActual = obtenerFechaFormateada();
    var horaActual = obtenerHora12();
    var exito = Persistencia.encolar({
      tipo: 'reserva',
      payload: {
        numero: datos.numero,
        nombre: datos.nombre,
        telefono: datos.telefono,
        referencia: datos.referencia,
        codigoSMS: datos.codigoSMS || '',
        precio: datos.precio,
        turno: datos.turno,
        capturaBase64: datos.capturaBase64,
        hashImagen: datos.hashImagen,
        ip: datos.ip,
        codigoTicket: codigoTicket,
        fecha: fechaActual,
        hora: horaActual
      }
    });
    if (!exito) {
      mostrarAlerta('❌ Error crítico: No se pudo guardar la reserva en tu dispositivo.\n\nTu memoria interna (caché) está llena. Libera espacio y vuelve a intentarlo.', 'error');
      return;
    }

    localStorage.setItem('mi_nombre', datos.nombre);
    localStorage.setItem('mi_telefono', datos.telefono);
    localStorage.removeItem('reserva_pendiente');
    cerrarModal();
    reproducirSonido('reserva');

    var codigoTicketEsc = escapeHtml(codigoTicket);
    var m = document.createElement('div');
    m.className = 'modal';
    m.id = 'modal-offline-guardado';
    m.innerHTML = '<div class="modal-contenido" style="background: linear-gradient(135deg, #002A8F, #001A5C); border: 3px solid #FFC107; text-align: center;">' +
      '<div style="font-size: 60px; margin-bottom: 10px; animation: pulsoGanador 2s infinite;">📡</div>' +
      '<h2 style="color: #FFC107; margin-bottom: 10px; font-size: 22px;">Reserva Guardada</h2>' +
      '<p style="color: #fff; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">No se pudo enviar por falta de señal, pero <strong style="color: #FFD700;">tu reserva está a salvo</strong> en tu teléfono.</p>' +
      '<div style="background: rgba(255,215,0,0.15); border: 2px dashed #FFD700; border-radius: 12px; padding: 15px; margin-bottom: 15px;">' +
      '<p style="color: #FFD700; font-size: 12px; margin-bottom: 5px;">🎟️ Tu código de reserva:</p>' +
      '<h3 style="color: #fff; font-size: 22px; letter-spacing: 2px; margin: 0;">#' + codigoTicketEsc + '</h3>' +
      '</div>' +
      '<div style="background: rgba(46,204,113,0.15); border: 2px solid #2ECC71; border-radius: 12px; padding: 12px; margin-bottom: 15px; text-align: left;">' +
      '<p style="color: #2ECC71; font-weight: bold; font-size: 13px; margin-bottom: 6px;">✅ Qué va a pasar ahora:</p>' +
      '<p style="color: #fff; font-size: 12px; margin: 3px 0;">• El sistema esperará a que vuelva la señal</p>' +
      '<p style="color: #fff; font-size: 12px; margin: 3px 0;">• Enviará tu reserva automáticamente</p>' +
      '<p style="color: #fff; font-size: 12px; margin: 3px 0;">• Recibirás una notificación cuando se complete</p>' +
      '</div>' +
      '<div style="background: rgba(244,67,54,0.15); border: 2px solid #F44336; border-radius: 12px; padding: 10px; margin-bottom: 15px; text-align: left;">' +
      '<p style="color: #F44336; font-weight: bold; font-size: 12px; margin-bottom: 4px;">⚠️ Importante:</p>' +
      '<p style="color: #fff; font-size: 11px; margin: 2px 0;">• No cierres la app ni borres datos</p>' +
      '<p style="color: #fff; font-size: 11px; margin: 2px 0;">• Si el número se ocupa antes de sincronizar, te avisaremos</p>' +
      '</div>' +
      '<button onclick="var m=document.getElementById(\'modal-offline-guardado\'); if(m) m.remove();" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #2ECC71, #27AE60); color: #fff; border: none; border-radius: 12px; font-weight: 900; font-size: 15px; cursor: pointer;">✅ Entendido</button>' +
      '</div>';
    document.body.appendChild(m);
    await registrarLog('reserva_offline', 'Reserva encolada offline: #' + datos.numero, datos.numero, datos.telefono, datos.precio);
  } catch (e) {
    console.error('Error guardando reserva offline:', e);
    mostrarAlerta('❌ Error crítico: No se pudo guardar la reserva.\n\nIntenta de nuevo cuando tengas mejor señal.', 'error');
  }
}

function blobToBase64(blob) {
  return new Promise(function(resolve, reject) {
    try {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = function(e) { reject(new Error('Error leyendo archivo')); };
      reader.readAsDataURL(blob);
    } catch(e) {
      reject(e);
    }
  });
}

function base64ToBlob(base64) {
  if (!base64 || typeof base64 !== 'string') throw new Error('Base64 inválido');
  var partes = base64.split(',');
  if (partes.length !== 2) throw new Error('Base64 mal formado');
  var mime = partes[0].match(/:(.*?);/);
  if (!mime) throw new Error('MIME no detectado');
  var mimeTipo = mime[1];
  var binario = atob(partes[1]);
  var arrayBytes = new Uint8Array(binario.length);
  for (var i = 0; i < binario.length; i++) {
    arrayBytes[i] = binario.charCodeAt(i);
  }
  return new Blob([arrayBytes], { type: mimeTipo });
}

async function procesarColaReservas() {
  if (!navigator.onLine) return;
  if (window.__procesandoCola) return;
  window.__procesandoCola = true;

  try {
    if (typeof Persistencia === 'undefined' || !Persistencia || !supabaseClient) {
      window.__procesandoCola = false;
      return;
    }
    var cola = Persistencia.leerCola();
    if (cola.length === 0) { window.__procesandoCola = false; return; }

    if (window.Notificaciones) {
      Notificaciones.mostrarToast('📡 Subiendo ' + cola.length + ' reserva(s) pendiente(s)...', 'info');
    }

    var sincronizadas = 0;
    var liberadas = 0;
    var fallidas = 0;

    for (var i = 0; i < cola.length; i++) {
      var op = cola[i];
      if (op.tipo !== 'reserva') continue;

      try {
        var payload = op.payload;

        var checkLimit = await supabaseClient.from('reservas').select('id').eq('telefono', payload.telefono).eq('turno', payload.turno).in('estado', ['ocupado', 'pagado']);
        if (checkLimit.data && checkLimit.data.length >= 3) {
          Persistencia.quitarDeCola(op.id);
          liberadas++;
          if (window.Notificaciones) Notificaciones.mostrarToast('⚠️ Ya tienes 3 números reservados en este turno. Se liberó tu reserva pendiente del número ' + payload.numero, 'alerta');
          continue;
        }

        var checkNum = await supabaseClient.from('reservas').select('id').eq('numero', payload.numero).eq('turno', payload.turno).in('estado', ['ocupado', 'pagado']).maybeSingle();
        if (checkNum.data) {
          Persistencia.quitarDeCola(op.id);
          liberadas++;
          if (window.Notificaciones) Notificaciones.mostrarToast('⚠️ El número ' + payload.numero + ' ya fue ocupado. Se liberó tu reserva pendiente.', 'alerta');
          continue;
        }

        var checkHash = await supabaseClient.from('reservas').select('id').eq('hash_captura', payload.hashImagen);
        if (checkHash.data && checkHash.data.length > 0) {
          Persistencia.quitarDeCola(op.id);
          liberadas++;
          if (window.Notificaciones) Notificaciones.mostrarToast('🚫 Captura duplicada detectada. Reserva #' + payload.numero + ' cancelada.', 'alerta');
          continue;
        }

        var blob, file;
        try {
          blob = base64ToBlob(payload.capturaBase64);
          file = new File([blob], 'offline_' + Date.now() + '.jpg', { type: 'image/jpeg' });
        } catch (e) {
          throw new Error('Imagen corrupta o inválida');
        }

        var nombreArchivo = payload.turno + '_' + payload.numero + '_' + Date.now() + '.jpg';
        var subida = await supabaseClient.storage.from('capturas').upload(nombreArchivo, file);
        if (subida.error) throw new Error('Error subiendo imagen: ' + subida.error.message);
        var urlCaptura = supabaseClient.storage.from('capturas').getPublicUrl(nombreArchivo).data.publicUrl;

        await supabaseClient.from('reservas').delete().eq('numero', payload.numero).eq('turno', payload.turno).eq('estado', 'temporal');

        var ins = await supabaseClient.from('reservas').insert([{
          numero: payload.numero,
          nombre: payload.nombre,
          telefono: payload.telefono,
          referencia: payload.referencia,
          codigo_sms: payload.codigoSMS || '',
          estado: 'ocupado',
          turno: payload.turno,
          fecha: payload.fecha,
          hora: payload.hora,
          captura_url: urlCaptura,
          telefono_recarga: payload.telefono,
          hash_captura: payload.hashImagen,
          codigo_ticket: payload.codigoTicket,
          ip_jugador: payload.ip
        }]);
        if (ins.error) throw new Error('Error guardando reserva: ' + ins.error.message);

        Persistencia.quitarDeCola(op.id);
        sincronizadas++;

        if (window.Notificaciones) Notificaciones.mostrarToast('✅ Reserva #' + payload.numero + ' sincronizada. Código: #' + payload.codigoTicket, 'exito');

        try {
          await supabaseClient.from('chat').insert([{
            usuario: '🤖 SISTEMA',
            telefono: '0000',
            mensaje: '🎲 El jugador ' + payload.nombre + ' reservó el número ' + payload.numero + ' (' + (payload.turno === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche') + ') [sincronizado offline].\n🎟️ Código: #' + payload.codigoTicket,
            es_admin: true
          }]);
        } catch(e) {}

        await registrarLog('offline_sincronizada', 'Reserva sincronizada: #' + payload.numero, payload.numero, payload.telefono, payload.precio);

      } catch (err) {
        var esErrorRed = !navigator.onLine || (err.message && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('timeout') || err.message.includes('NetworkError')));
        if (!esErrorRed) {
          Persistencia.quitarDeCola(op.id);
          fallidas++;
          if (window.Notificaciones) Notificaciones.mostrarToast('❌ No se pudo sincronizar reserva #' + op.payload.numero + ': ' + err.message, 'alerta');
        } else {
          console.warn('Fallo de red. Se reintentará automáticamente.');
        }
      }
    }

    if (typeof cargarReservas === 'function') await cargarReservas();
    if (typeof cargarChatWa === 'function') await cargarChatWa();
  } catch (e) {
    console.error('Error general procesando cola:', e);
  } finally {
    window.__procesandoCola = false;
  }
}

async function sumarPuntos(telefono, nombre) {
  try {
    if (!supabaseClient) return;
    var r = await supabaseClient.from('puntos_jugadores').select('*').eq('telefono', telefono).maybeSingle();
    if (r.error) throw r.error;
    var foto = localStorage.getItem('mi_foto') || '';
    var hoy = obtenerFechaFormateada();
    if (r.data) {
      var nuevosPuntos = (r.data.puntos || 0) + 10;
      var nuevoNivel = 'Novato';
      if (nuevosPuntos >= 100) nuevoNivel = 'Plata';
      if (nuevosPuntos >= 300) nuevoNivel = 'Oro';
      if (nuevosPuntos >= 500) nuevoNivel = 'VIP';
      var actualizar = { puntos: nuevosPuntos, nivel: nuevoNivel, nombre: nombre, ultima_racha: hoy };
      if (foto) actualizar.foto_perfil = foto;
      await supabaseClient.from('puntos_jugadores').update(actualizar).eq('telefono', telefono);
    } else {
      await supabaseClient.from('puntos_jugadores').insert([{
        telefono: telefono,
        nombre: nombre,
        puntos: 10,
        nivel: 'Novato',
        foto_perfil: foto || null,
        ultima_racha: hoy
      }]);
    }
  } catch(e) { console.error('Error sumando puntos:', e); }
}

// ============================================
// FIN BLOQUE 8 — Continúa en Bloque 9
// ============================================// ============================================
// BLOQUE 9: REFERIDOS + PERFIL + TOP + TICKETS + SOPORTE
// ============================================

async function cargarReferidos() {
  var telefono = localStorage.getItem('mi_telefono');
  if (!telefono) return;

  var codigoHTML = document.getElementById('mi-codigo-referido');
  var referidosHTML = document.getElementById('mis-referidos-count');
  if (codigoHTML) codigoHTML.textContent = telefono;

  if (!supabaseClient) return;

  try {
    var r = await supabaseClient.from('puntos_jugadores').select('referidos_count').eq('telefono', telefono).maybeSingle();
    if (r.data && referidosHTML) referidosHTML.textContent = r.data.referidos_count || 0;

    var qrContainer = document.getElementById('qr-referido-container');
    if (!qrContainer && codigoHTML) {
      var parent = codigoHTML.parentNode;
      if (parent) {
        var qrDiv = document.createElement('div');
        qrDiv.id = 'qr-referido-container';
        qrDiv.style = "text-align:center; margin-top:10px;";
        var telEsc = encodeURIComponent(telefono);
        qrDiv.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + telEsc + '" alt="QR de invitación" style="border-radius:10px; border:3px solid #FFD700; background:#fff; padding:5px;">' +
          '<p style="font-size:10px; color:#FFD700; margin-top:5px;">Escanea para unirte</p>';
        parent.appendChild(qrDiv);
      }
    }
  } catch(e) { console.error('Error cargando referidos:', e); }
}

function compartirCodigoReferido() {
  var telefono = localStorage.getItem('mi_telefono');
  var nombre = localStorage.getItem('mi_nombre') || 'Un amigo';
  if (!telefono) return;

  var urlApp = '';
  try {
    var protocolo = window.location.protocol;
    if (protocolo === 'http:' || protocolo === 'https:') {
      urlApp = window.location.origin + window.location.pathname;
      if (urlApp.includes('index.html')) urlApp = urlApp.replace('index.html', '');
    }
  } catch(e) { urlApp = ''; }

  var texto = '🎲 ¡Hola! Te invito a jugar en *La Rifita Cubana*.\n\n👉 Regístrate en la app con mi código de invitación: *' + telefono + '*\n\nCuando te registres, ¡ambos ganamos premios! 🎁\n\n';
  if (urlApp && urlApp.length > 10) texto += '📲 Abre la app aquí: ' + urlApp;
  else texto += '📲 Pídeme el enlace de la app y regístrate con mi código.';

  if (navigator.share) {
    navigator.share({ title: 'Únete a La Rifita Cubana', text: texto }).catch(function() {});
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
  }
}

async function cargarPerfil() {
  var nombre = localStorage.getItem('mi_nombre') || 'Jugador';
  var telefono = localStorage.getItem('mi_telefono') || 'Sin teléfono';

  var nombreEl = document.getElementById('perfil-nombre');
  var telefonoEl = document.getElementById('perfil-telefono');
  if (nombreEl) nombreEl.textContent = nombre;
  if (telefonoEl) telefonoEl.textContent = telefono;

  var fotoGuardada = localStorage.getItem('mi_foto');

  if (telefono !== 'Sin teléfono' && supabaseClient) {
    try {
      var r = await supabaseClient.from('puntos_jugadores').select('*').eq('telefono', telefono).maybeSingle();
      var puntosEl = document.getElementById('perfil-puntos');
      var nivelEl = document.getElementById('perfil-nivel');
      if (r.data) {
        if (puntosEl) puntosEl.textContent = r.data.puntos || 0;
        if (nivelEl) nivelEl.textContent = r.data.nivel || 'Novato';
        if (r.data.foto_perfil) {
          fotoGuardada = r.data.foto_perfil;
          localStorage.setItem('mi_foto', fotoGuardada);
        }
      } else {
        if (puntosEl) puntosEl.textContent = '0';
        if (nivelEl) nivelEl.textContent = 'Novato';
      }
      if (fotoGuardada && (!r.data || !r.data.foto_perfil)) {
        try {
          if (r.data) {
            await supabaseClient.from('puntos_jugadores').update({ foto_perfil: fotoGuardada }).eq('telefono', telefono);
          } else {
            await supabaseClient.from('puntos_jugadores').insert([{
              telefono: telefono,
              nombre: nombre,
              puntos: 0,
              nivel: 'Novato',
              foto_perfil: fotoGuardada
            }]);
          }
        } catch(e) { console.error('Error sincronizando foto:', e); }
      }
    } catch(e) { console.warn('Error cargando perfil:', e); }
  }

  var avatarEl = document.getElementById('perfil-avatar-container');
  if (avatarEl) {
    if (fotoGuardada) avatarEl.innerHTML = '<img src="' + escapeHtml(fotoGuardada) + '" loading="lazy" alt="Foto de perfil">';
    else avatarEl.innerHTML = '👤';
  }
}

async function cambiarFotoPerfil(input) {
  var file = input && input.files ? input.files[0] : null;
  if (!file) return;
  var telefono = localStorage.getItem('mi_telefono');
  if (!telefono) { mostrarAlerta('Primero regístrate', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  mostrarAlerta('⏳ Subiendo tu foto...', 'info');

  try {
    var archivoComprimido = await comprimirImagen(file);
    var nombreArchivo = 'perfil_' + telefono.replace(/[^0-9]/g, '') + '_' + Date.now() + '.jpg';
    var subida = await supabaseClient.storage.from('capturas').upload(nombreArchivo, archivoComprimido);
    if (subida.error) throw subida.error;
    var urlFoto = supabaseClient.storage.from('capturas').getPublicUrl(nombreArchivo).data.publicUrl;
    await supabaseClient.from('puntos_jugadores').update({ foto_perfil: urlFoto }).eq('telefono', telefono);
    localStorage.setItem('mi_foto', urlFoto);

    var avatarEl = document.getElementById('perfil-avatar-container');
    if (avatarEl) avatarEl.innerHTML = '<img src="' + escapeHtml(urlFoto) + '" loading="lazy">';

    cacheFotosJugadores = {};
    ultimoFetchFotosJugadores = 0;
    try { localStorage.removeItem('cache_fotos_chat'); } catch(e) {}

    mostrarAlerta('✅ Foto actualizada con éxito', 'exito');
  } catch (e) { mostrarAlerta('❌ Error al cambiar foto: ' + (e.message || 'Desconocido'), 'error'); }
}

async function borrarMiPerfil() {
  var telefono = localStorage.getItem('mi_telefono');
  if (!telefono) { mostrarAlerta('No hay perfil para borrar', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Seguro que quieres borrar tu perfil?\n\nTu cuenta quedará desactivada y perderás tus puntos acumulados.');
  if (!confirmado) return;

  try {
    if (supabaseClient) {
      var hoy = obtenerFechaFormateada();
      await supabaseClient.from('puntos_jugadores').update({
        estado: 'eliminado',
        ultima_conexion: hoy + ' (eliminado)'
      }).eq('telefono', telefono);
      await registrarLog('jugador_eliminado', 'Jugador borró su perfil', '', telefono, '');
    }

    localStorage.removeItem('mi_nombre');
    localStorage.removeItem('mi_telefono');
    localStorage.removeItem('mi_foto');

    mostrarAlerta('✅ Perfil desactivado correctamente.\n\nSi quieres volver a jugar, regístrate de nuevo con tu mismo teléfono.', 'exito');
    cargarPerfil();
  } catch(e) { mostrarAlerta('❌ Error al borrar: ' + (e.message || 'Desconocido'), 'error'); }
}

async function cargarTopJugadores() {
  var cont = document.getElementById('ranking-jugadores');
  if (!cont) return;
  cont.innerHTML = '<div class="historial-vacio">Cargando...</div>';

  if (!supabaseClient) {
    mostrarErrorConBoton('ranking-jugadores', 'cargarTopJugadores', 'Sin conexión al servidor');
    return;
  }

  try {
    var r = await supabaseClient.from('puntos_jugadores').select('*').order('puntos', { ascending: false }).limit(10);
    if (r.error) throw r.error;
    if (!r.data || r.data.length === 0) {
      cont.innerHTML = '<div class="historial-vacio">Aún no hay jugadores con puntos.</div>';
      return;
    }
    var html = '';
    r.data.forEach(function(jugador, index) {
      var medalla = '👤';
      if (index === 0) medalla = '🥇';
      if (index === 1) medalla = '🥈';
      if (index === 2) medalla = '🥉';
      var fotoHtml = jugador.foto_perfil
        ? '<img src="' + escapeHtml(jugador.foto_perfil) + '" class="avatar-small" loading="lazy" alt="Avatar">'
        : '<div class="avatar-small" style="background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:18px;">👤</div>';
      html += '<div class="top-item"><div class="top-posicion">' + medalla + '</div>' + fotoHtml +
        '<div class="top-info"><h4>' + escapeHtml(jugador.nombre || 'Jugador') + '</h4><p>Nivel: ' + escapeHtml(jugador.nivel || 'Novato') + '</p></div>' +
        '<div class="top-puntos">' + (jugador.puntos || 0) + ' pts</div></div>';
    });
    cont.innerHTML = html;
  } catch(e) {
    console.error('Error cargando ranking:', e);
    mostrarErrorConBoton('ranking-jugadores', 'cargarTopJugadores', 'No se pudo cargar el ranking');
  }
}

function descargarTicket() {
  var ticket = document.getElementById('ticket-digital');
  if (!ticket) { mostrarAlerta('❌ No hay ticket para descargar.', 'error'); return; }
  if (typeof html2canvas === 'undefined') {
    mostrarAlerta('❌ Hubo un problema al generar la imagen.\n\n📸 POR FAVOR, TOMA UNA CAPTURA DE PANTALLA de este ticket y guárdala en tu galería.', 'error');
    return;
  }

  mostrarAlerta('⏳ Generando imagen del ticket...', 'info');

  html2canvas(ticket, { scale: 2, backgroundColor: null, useCORS: true }).then(function(canvas) {
    canvas.toBlob(function(blob) {
      if (!blob) { mostrarAlerta('❌ Error al generar la imagen. Toma una captura de pantalla.', 'error'); return; }
      var file = new File([blob], 'Ticket_LaRifita.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Mi Ticket', text: 'Aquí está mi ticket de La Rifita Cubana' }).catch(function() {});
      } else {
        var link = document.createElement('a');
        link.download = 'Ticket_LaRifita.png';
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function() {
          mostrarAlerta('✅ Si la descarga no se inició automáticamente, toca el botón "Descargar Imagen" de nuevo o toma una captura de pantalla.', 'info');
        }, 1000);
      }
    }, 'image/png');
  }).catch(function() {
    mostrarAlerta('❌ Hubo un problema al generar la imagen.\n\n📸 POR FAVOR, TOMA UNA CAPTURA DE PANTALLA de este ticket y guárdala en tu galería.', 'error');
  });
}

function compartirTicket(nombre, numero, codigo, fecha, hora) {
  var texto = '🎲 ¡Estoy jugando en La Rifita Cubana!\n\n' +
    '👤 ' + nombre + '\n' +
    '🔢 Mi número: ' + numero + '\n' +
    '🎟️ Código: #' + codigo + '\n' +
    '📅 Fecha: ' + fecha + '\n' +
    '⏰ Hora: ' + hora + '\n' +
    '🎯 Turno: ' + (turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche') + '\n\n' +
    '¡Únete y juega tú también! 🍀';

  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(function() {
      mostrarAlerta('✅ Texto copiado.\n\nAbriendo el grupo...\nSolo pega el mensaje en el chat.', 'exito');
      setTimeout(function() {
        window.open('https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4', '_blank');
      }, 1500);
    }).catch(function() {
      window.open('https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4', '_blank');
    });
  } else {
    window.open('https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4', '_blank');
  }
}

async function cargarTickets() {
  var cont = document.getElementById('lista-tickets');
  if (!cont || document.hidden) return;
  cont.innerHTML = '<div class="historial-vacio">Cargando...</div>';

  if (!supabaseClient) {
    mostrarErrorConBoton('lista-tickets', 'cargarTickets', 'Sin conexión al servidor');
    return;
  }

  try {
    var miTel = localStorage.getItem('mi_telefono');
    var consulta;
    var camposTicket = 'id,nombre,turno,fecha,hora,codigo_ticket,numero,telefono,estado';

    if (esAdmin) {
      consulta = supabaseClient.from('reservas').select(camposTicket).in('estado', ['pagado', 'ocupado']).order('fecha', { ascending: false }).limit(100);
    } else {
      consulta = supabaseClient.from('reservas').select(camposTicket).in('estado', ['pagado', 'ocupado']).eq('telefono', miTel).order('fecha', { ascending: false }).limit(100);
    }

    var r = await consulta;
    if (r.error) throw r.error;
    if (!r.data || r.data.length === 0) {
      cont.innerHTML = '<div class="historial-vacio">No hay tickets aún.<br><br>Los tickets aparecerán aquí cuando reserves un número.</div>';
      return;
    }

    var fotos = {};
    try {
      var rFotos = await supabaseClient.from('puntos_jugadores').select('telefono,foto_perfil');
      if (rFotos.data && Array.isArray(rFotos.data)) {
        rFotos.data.forEach(function(p) { if (p.foto_perfil) fotos[p.telefono] = p.foto_perfil; });
      }
    } catch(e) {}

    var html = '';
    r.data.forEach(function(ticket) {
      if (!ticket) return;

      var nombreEsc = escapeHtml(ticket.nombre || 'Sin nombre');
      var numeroEsc = escapeHtml(String(ticket.numero || '?'));
      var codigoEsc = escapeHtml(ticket.codigo_ticket || 'N/A');
      var fechaEsc = escapeHtml(ticket.fecha || 'N/A');
      var horaEsc = escapeHtml(ticket.hora || 'N/A');
      var turnoTxt = ticket.turno === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche';

      var btnArchivar = (esAdmin === true && trabajadorActual === null && ticket.estado === 'pagado')
        ? '<button onclick="archivarTicket(\'' + escapeHtml(ticket.id) + '\')" style="background:#F44336; color:#fff; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; font-size:12px; margin-top:5px; cursor:pointer;">🗑️ Archivar</button>'
        : '';

      var estadoBadge = '';
      if (ticket.estado === 'pagado') {
        estadoBadge = '<span style="background:#2ECC71; color:#fff; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:bold; margin-left:5px;">✅ PAGADO</span>';
      } else if (ticket.estado === 'ocupado') {
        estadoBadge = '<span style="background:#FFC107; color:#000; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:bold; margin-left:5px;">⏳ PENDIENTE</span>';
      }

      var fotoT = fotos[ticket.telefono] || '';
      var fotoHtml = fotoT
        ? '<img src="' + escapeHtml(fotoT) + '" class="avatar-small" loading="lazy" style="margin-right:8px;" alt="Avatar">'
        : '';

      html += '<div class="ticket-item"><div class="ticket-info" style="display:flex;align-items:center;">' + fotoHtml + '<div>' +
        '<p><strong>👤 ' + nombreEsc + '</strong>' + estadoBadge + '</p>' +
        '<p>🎯 ' + turnoTxt + '</p>' +
        '<p>📅 ' + fechaEsc + ' ⏰ ' + horaEsc + '</p>' +
        '<p>🎟️ Código: #' + codigoEsc + '</p>' +
        btnArchivar +
        '</div></div><div class="ticket-numero">' + numeroEsc + '</div></div>';
    });
    cont.innerHTML = html;
  } catch(e) {
    console.error('Error cargando tickets:', e);
    mostrarErrorConBoton('lista-tickets', 'cargarTickets', 'No se pudieron cargar los tickets: ' + (e.message || 'Error desconocido'));
  }
}

async function archivarTicket(id) {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!id) { mostrarAlerta('❌ ID de ticket inválido', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Archivar este ticket? Se guardará por 24h antes de borrarse permanentemente.\n\nEsto NO afecta la cuadrícula.');
  if (!confirmado) return;

  try {
    var ticketData = await supabaseClient.from('reservas').select('*').eq('id', id).maybeSingle();
    if (ticketData.error || !ticketData.data) throw new Error('Ticket no encontrado');

    var insert = await supabaseClient.from('archivo_tickets').insert([{
      ticket_data: ticketData.data,
      borrado_por: localStorage.getItem('mi_nombre') || 'Admin'
    }]);
    if (insert.error) throw insert.error;

    var del = await supabaseClient.from('reservas').delete().eq('id', id);
    if (del.error) throw del.error;

    await registrarLog('archivar_ticket', 'Ticket archivado', ticketData.data.numero, ticketData.data.telefono, '');
    mostrarAlerta('✅ Ticket archivado por 24h.', 'exito');
    await cargarTickets();

    if (document.getElementById('modal-admin')) {
      cargarAprobados();
      cargarArchivoTickets();
    }
  } catch (e) { mostrarAlerta('❌ Error al archivar: ' + (e.message || 'Desconocido'), 'error'); }
}

async function cargarSoporte() {
  var cont = document.getElementById('lista-contactos-soporte');
  if (!cont || document.hidden) return;
  cont.innerHTML = '<div class="historial-vacio">Cargando contactos...</div>';

  await cargarTrabajadores();

  var html = '';
  html += '<div class="reserva-item" style="background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; margin-bottom: 15px; text-align: left; padding: 15px;">' +
    '<p style="font-size: 16px; margin-bottom: 5px;"><strong>👑 Yandyno - Admin General</strong></p>' +
    '<p style="font-size: 13px; color: rgba(255,255,255,0.8);">Atención para dudas, quejas o sugerencias.</p>' +
    '<div style="display: flex; gap: 8px; margin-top: 15px; flex-wrap: wrap;">' +
    '<button onclick="window.open(\'https://wa.me/994405854881?text=Hola%20Yandyno,%20necesito%20ayuda%20con%20La%20Rifita%20Cubana\')" style="flex: 1; background: #25D366; color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer;">💬 WhatsApp</button>' +
    '<button onclick="window.open(\'mailto:larifitacubanaoficial@gmail.com\')" style="flex: 1; background: #2196F3; color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer;">📧 Correo</button>' +
    '</div>' +
    '</div>';

  if (Array.isArray(trabajadores) && trabajadores.length > 0) {
    trabajadores.forEach(function(t) {
      if (!t) return;
      var correoTrabajador = t.email || 'Sin correo registrado';
      var telLimpio = (t.telefono || '').replace(/[^0-9]/g, '');
      var nombreEsc = escapeHtml(t.nombre || 'Colaborador');
      var telEsc = escapeHtml(t.telefono || 'N/A');
      var rolEsc = escapeHtml(t.rol || 'colaborador');
      var emailEsc = escapeHtml(correoTrabajador);

      var btnCorreo = t.email
        ? '<button onclick="window.open(\'mailto:' + encodeURIComponent(t.email) + '\')" style="flex: 1; background: #2196F3; color: #fff; border: none; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;">📧 Correo</button>'
        : '<button disabled style="flex: 1; background: #555; color: #aaa; border: none; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 13px;">📧 Sin Correo</button>';

      var btnWa = telLimpio
        ? '<button onclick="window.open(\'https://wa.me/' + telLimpio + '\')" style="flex: 1; background: #25D366; color: #fff; border: none; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;">💬 WhatsApp</button>'
        : '';

      html += '<div class="reserva-item" style="border-left-color: #2ECC71; margin-bottom: 10px; text-align: left; padding: 15px;">' +
        '<p style="font-size: 15px; margin-bottom: 5px;"><strong>👤 ' + nombreEsc + '</strong></p>' +
        '<p style="font-size: 12px; color: #FFD700; text-transform: capitalize;">' + rolEsc + '</p>' +
        '<p style="font-size: 13px; margin-top: 5px;">📱 ' + telEsc + '</p>' +
        '<p style="font-size: 12px; color: rgba(255,255,255,0.6);">📧 ' + emailEsc + '</p>' +
        '<div style="display: flex; gap: 8px; margin-top: 10px;">' + btnWa + btnCorreo + '</div>' +
        '</div>';
    });
  } else {
    html += '<p style="text-align: center; font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 15px;">No hay otros trabajadores registrados por ahora.</p>';
  }

  cont.innerHTML = html;
}

// ============================================
// FIN BLOQUE 9 — Continúa en Bloque 10
// ============================================// ============================================
// BLOQUE 10: CHAT COMPLETO (ENVÍO + BOT + REACCIONES)
// ============================================

function toggleEmojisWa() {
  var panel = document.getElementById('panel-emojis-wa');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

function agregarEmojiWa(emoji) {
  var input = document.getElementById('chat-texto-wa');
  if (!input) return;
  input.value += emoji;
  input.focus();
}

async function enviarMensajeWa() {
  var input = document.getElementById('chat-texto-wa');
  if (!input) return;
  var texto = input.value.trim();
  if (!texto) return;

  var ahoraChat = Date.now();
  var mensajesRecientes = [];
  try {
    mensajesRecientes = JSON.parse(localStorage.getItem('mensajes_recientes_chat') || '[]');
    if (!Array.isArray(mensajesRecientes)) mensajesRecientes = [];
  } catch(e) { mensajesRecientes = []; }

  mensajesRecientes = mensajesRecientes.filter(function(t) { return ahoraChat - t < 60000; });
  if (mensajesRecientes.length >= 5) {
    mostrarAlerta('⚠️ Estás escribiendo muy rápido.\n\nEspera 1 minuto antes de enviar otro mensaje.', 'error');
    return;
  }
  mensajesRecientes.push(ahoraChat);
  localStorage.setItem('mensajes_recientes_chat', JSON.stringify(mensajesRecientes));

  var nombre = localStorage.getItem('mi_nombre');
  var telefono = localStorage.getItem('mi_telefono') || '';
  var miFoto = localStorage.getItem('mi_foto') || '';

  if (!nombre) { mostrarAlerta('⚠️ Para chatear, primero debes registrarte.', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor. Intenta cuando recuperes señal.', 'error'); return; }

  input.value = '';
  var panelEmojis = document.getElementById('panel-emojis-wa');
  if (panelEmojis) panelEmojis.style.display = 'none';
  input.disabled = true;

  var resultado = await supabaseClient.from('chat').insert([{ usuario: nombre, telefono: telefono, mensaje: texto }]);
  input.disabled = false;

  if (resultado.error) {
    input.value = texto;
    mostrarAlerta('❌ Error: ' + resultado.error.message, 'error');
    return;
  }

  await cargarChatWa(true);

  if (miFoto && telefono) {
    (async function() {
      try {
        var chk = await supabaseClient.from('puntos_jugadores').select('foto_perfil').eq('telefono', telefono).maybeSingle();
        if (chk.data && !chk.data.foto_perfil) {
          await supabaseClient.from('puntos_jugadores').update({ foto_perfil: miFoto }).eq('telefono', telefono);
        } else if (!chk.data) {
          await supabaseClient.from('puntos_jugadores').insert([{
            telefono: telefono,
            nombre: nombre,
            puntos: 0,
            nivel: 'Novato',
            foto_perfil: miFoto
          }]);
        }
      } catch(e) { console.error('Error sync foto chat:', e); }
    })();
  }

  procesarMensajeBot(texto);
}

async function procesarMensajeBot(texto) {
  if (!texto || typeof texto !== 'string') return;

  var msg = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  if (msg.includes('asistente') || msg.length < 2) return;

  var respuesta = null;

  var groserias = ['estafa', 'trampa', 'robo', 'mentira', 'puta', 'mierda', 'carajo', 'coño', 'cabron', 'hijo de puta', 'ladron', 'falso', 'basura', 'estupido', 'idiota'];
  var esOfensa = groserias.some(function(palabra) { return msg.includes(palabra); });

  var preguntaResultado = msg.match(/(resultado|salio|fijo|ganador|numero de hoy|pick 3|ayer|hoy)/);
  var preguntaNoche = msg.includes('noche') || msg.includes('nocturno');
  var preguntaMediodia = msg.includes('mediodia') || msg.includes('tarde') || msg.includes('dia');

  if (esOfensa) {
    respuesta = '⚠️ *AVISO DE MODERACIÓN*\n\nPor favor, mantengamos el respeto en el chat. Recuerda que esta es una plataforma 100% legal, auditada y transparente. Si tienes alguna duda sobre tu ticket, usa el botón de Soporte o revisa la sección de Legalidad. ¡Gracias! 🛡️';
  }
  else if (preguntaResultado || (msg.includes('y en la') && (preguntaNoche || preguntaMediodia))) {
    var rMed = (typeof config !== 'undefined' && config && config.fijo_mediodia) ? config.fijo_mediodia : '';
    var rNoche = (typeof config !== 'undefined' && config && config.fijo_noche) ? config.fijo_noche : '';
    var resMsg = '📊 *RESULTADOS DE HOY*\n\n';
    if (preguntaNoche && !preguntaMediodia) {
      resMsg = '🌙 *Resultado de la Noche:*\nEl fijo ganador es: *' + (rNoche ? rNoche : 'Aún no publicado') + '*';
    } else if (preguntaMediodia && !preguntaNoche) {
      resMsg = '☀️ *Resultado del Mediodía:*\nEl fijo ganador es: *' + (rMed ? rMed : 'Aún no publicado') + '*';
    } else {
      resMsg += '☀️ Mediodía: *' + (rMed ? rMed : 'Aún no publicado') + '*\n';
      resMsg += '🌙 Noche: *' + (rNoche ? rNoche : 'Aún no publicado') + '*\n\n';
      resMsg += 'Puedes ver más detalles en el menú ☰ -> *Resultados*.';
    }
    respuesta = resMsg;
  }
  else if (msg.match(/(admin|alminkstrador|administrador|adm|dueno|jefe|yandyno|soporte|contacto|quien manda|quien es el dueno)/)) {
    respuesta = '👑 El administrador oficial es *Yandyno*.\n\nPara soporte directo, toca el botón verde de *Soporte* (abajo a la derecha) y te atenderá por WhatsApp personalmente.';
  }
  else if (msg.match(/(regla|norma|prohibido|limite|cuantos numeros)/)) {
    respuesta = '📖 *REGLAS PRINCIPALES*\n\n• Juegas del 00 al 99.\n• Límite de 3 números por persona/turno.\n• Tienes 15 minutos para pagar y subir captura.\n• Si compras 3 números, el 3ro va a mitad de precio (Combo Familiar).\n• Prohibido usar capturas falsas (Fraude = expulsión y reporte a las autoridades).\n\nPuedes leer todas las reglas en el menú ☰ -> *Reglas*.';
  }
  else if (msg.match(/(legal|certificado|seguro|confiable|permiso|papel|estafa)/)) {
    respuesta = '🛡️ *CERTIFICADO DE LEGALIDAD*\n\nLa Rifita Cubana es una plataforma 100% legal y transparente. Todos nuestros sorteos están auditados y los premios garantizados. Tenemos un contrato de verificación empresarial y certificado de originalidad. Puedes ver todos los detalles tocando el menú ☰ y entrando a la sección *Legalidad*.';
  }
  else if (msg.match(/(como juego|como se juega|ayuda|explicame|tutorial|no se|como participo|como apuesto)/)) {
    respuesta = '🎮 *CÓMO JUGAR EN 4 PASOS:*\n\n1️⃣ Ve a *Inicio* y toca un número verde (Libre).\n2️⃣ Paga por Transfermóvil o Recarga (los datos salen ahí mismo).\n3️⃣ Sube la captura de tu pago y tu código SMS.\n4️⃣ Espera que el Admin lo apruebe y revisa el resultado del Pick 3 de Florida.\n\n¡Así de fácil! 🍀';
  }
  else if (msg.match(/(precio|cuanto|vale|cuesta|cuanto bale)/)) {
    var precio = (typeof config !== 'undefined' && config && config[turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche']) || '50';
    respuesta = '💰 El precio del número es de *' + precio + ' CUP*. ¡Y recuerda que si compras 3, el tercero te sale a mitad de precio! 🎁';
  }
  else if (msg.match(/(premio|paga|gana|cuanto pagan|cuanto gano)/)) {
    var premio = (typeof config !== 'undefined' && config && config[turnoActual === 'mediodia' ? 'premio_mediodia' : 'premio_noche']) || '250';
    respuesta = '🏆 El premio actual es de *' + premio + ' CUP*. Se juega con los 2 últimos dígitos del Pick 3 de Florida. Si nadie acierta, el premio se acumula para el próximo sorteo.';
  }
  else if (msg.match(/(tarjeta|transfermovil|banco|cuenta|titular|donde pago|como pago)/)) {
    respuesta = '💳 *DATOS PARA PAGAR:*\n\n🏦 Tarjeta Metropolitano: *9238959870089614*\n👤 Titular: Y. Enríquez S.\n\nTambién puedes enviar Saldo Móvil (Recarga) al *+5353437025*.';
  }
  else if (msg.match(/(recarga|saldo|sms)/)) {
    respuesta = '📱 Para pagar por Recarga (Saldo Móvil), envía el saldo al *+5353437025* y sube la captura del SMS en el Paso 2 de la reserva. ¡Listo!';
  }
  else if (msg.match(/(turno|hora|cierra|abre|cuando|horario|a que hora)/)) {
    respuesta = '⏰ *HORARIOS:*\n☀️ Mediodía: 8:00 AM a 1:00 PM\n🌙 Noche: 3:00 PM a 9:00 PM\n\nEl resultado se publica justo después del sorteo de Florida.';
  }
  else if (msg.match(/(hola|buenas|saludos|buenos dias|buenas tardes|buenas noches|ola|hi|saludos)/)) {
    var nombreUser = localStorage.getItem('mi_nombre') || 'amigo';
    respuesta = '¡Hola ' + nombreUser + '! 👋 Soy el Asistente Virtual de La Rifita. ¿En qué te puedo ayudar hoy?\n\nEscribe *ayuda*, *precio*, *resultados*, *reglas* o *legalidad* para respuestas rápidas.';
  }
  else if (msg.match(/(gracias|ok|listo|perfecto|bendiciones|de acuerdo)/)) {
    respuesta = '¡De nada! 🍀 Mucha suerte en tu próxima jugada.';
  }
  else if (msg.length > 10 && (msg.includes('?') || msg.includes('como') || msg.includes('que'))) {
    respuesta = '🤖 No estoy seguro de haber entendido tu pregunta.\n\nIntenta ser más específico escribiendo:\n• *ayuda* (Para saber cómo jugar)\n• *precio* (Cuánto cuesta)\n• *resultados* (Números ganadores)\n• *admin* (Contacto directo)\n\nO toca el botón de *Soporte* para hablar con una persona.';
  }

  if (respuesta) {
    setTimeout(async function() {
      try {
        if (!supabaseClient) return;
        await supabaseClient.from('chat').insert([{
          usuario: '🤖 ASISTENTE',
          telefono: '9999',
          mensaje: respuesta,
          es_admin: true
        }]);
        await cargarChatWa(true);

        var c = document.getElementById('chat-mensajes-wa');
        if (c) {
          setTimeout(function() {
            c.scrollTop = c.scrollHeight;
          }, 150);
        }
      } catch(e) { console.error('Error enviando respuesta del bot:', e); }
    }, 1500);
  }
}

function parsearReacciones(campo) {
  if (!campo) return {};
  try {
    var parsed = JSON.parse(campo);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch(e) {}
  if (typeof campo === 'string' && campo.length > 0 && campo.length <= 8) {
    var obj = {};
    obj[campo] = [];
    return obj;
  }
  return {};
}

function crearBurbujaChat(m, miNombre, miTelefono, fotosUsuarios) {
  if (!m) return document.createElement('div');

  var esMio = (m.usuario === miNombre && m.telefono === miTelefono);
  var hora = obtenerHora12(m.creado_en);
  var div = document.createElement('div');
  div.className = 'msg-bubble ' + (esMio ? 'msg-out' : 'msg-in');
  div.setAttribute('data-id', m.id);

  var fotos = fotosUsuarios || {};
  var fotoChat = fotos[(m.telefono || '').replace(/[^0-9]/g, '')] || '';
  var fotoHtml = fotoChat
    ? '<img src="' + escapeHtml(fotoChat) + '" class="avatar-chat" loading="lazy" alt="Avatar">'
    : '<span style="font-size:16px;margin-right:5px;">' + (m.es_admin ? '👑' : '👤') + '</span>';

  var nombreHtml = !esMio
    ? '<div class="msg-user">' + fotoHtml + escapeHtml(m.usuario || 'Jugador') + (m.es_admin ? ' (ADMIN)' : '') + '</div>'
    : '';

  var checkHtml = esMio ? '<span class="check-azul">✓✓</span>' : '';

  var reaccionesObj = parsearReacciones(m.reacciones);
  var emojisActivos = Object.keys(reaccionesObj);
  var reaccionesHtml = '';

  if (emojisActivos.length > 0) {
    reaccionesHtml = '<div class="msg-reacciones">';
    emojisActivos.forEach(function(emoji) {
      var usuarios = reaccionesObj[emoji] || [];
      var count = usuarios.length;
      var yoReaccione = (miTelefono && usuarios.indexOf(miTelefono) !== -1);
      var badge = count > 0 ? ' ' + count : '';
      reaccionesHtml += '<span class="reaccion-pildora' + (yoReaccione ? ' activa' : '') + '" onclick="event.stopPropagation(); toggleReaccionRapida(' + m.id + ', \'' + emoji + '\')">' + emoji + badge + '</span>';
    });
    reaccionesHtml += '</div>';
  }

  div.innerHTML = nombreHtml +
    '<div class="msg-texto">' + escapeHtml(m.mensaje || '').replace(/\n/g, '<br>') + '</div>' +
    reaccionesHtml +
    '<div class="msg-hora">' + hora + ' ' + checkHtml + '</div>';

  var timer;
  div.addEventListener('touchstart', function() {
    timer = setTimeout(function() { abrirMenuMensaje(m.id, m.mensaje || '', m.usuario || '', esMio); }, 500);
  });
  div.addEventListener('touchend', function() { clearTimeout(timer); });

  var lastTap = 0;
  div.addEventListener('click', function() {
    var now = Date.now();
    if (now - lastTap < 300) toggleReaccionRapida(m.id, '❤️');
    lastTap = now;
  });

  return div;
}

async function cargarChatWa(silencioso) {
  var c = document.getElementById('chat-mensajes-wa');
  if (!c || document.hidden) return;
  if (!supabaseClient) {
    if (!silencioso) mostrarErrorConBoton('chat-mensajes-wa', 'cargarChatWa', 'Sin conexión al servidor');
    return;
  }

  try {
    var miNombre = localStorage.getItem('mi_nombre') || '';
    var miTelefono = localStorage.getItem('mi_telefono') || '';
    var miFoto = localStorage.getItem('mi_foto') || '';

    function normTel(t) { return (t || '').replace(/[^0-9]/g, ''); }

    var ahora = Date.now();
    var esRedLenta = false;
    if (navigator.connection && (navigator.connection.effectiveType === '2g' || navigator.connection.effectiveType === 'slow-2g')) {
      esRedLenta = true;
    }

    if (!silencioso && (ahora - ultimoFetchFotosJugadores > 5 * 60000) && !esRedLenta) {
      try {
        var rFotos = await supabaseClient.from('puntos_jugadores').select('telefono,foto_perfil');
        if (rFotos.data && Array.isArray(rFotos.data)) {
          cacheFotosJugadores = {};
          rFotos.data.forEach(function(p) { if (p.foto_perfil) cacheFotosJugadores[normTel(p.telefono)] = p.foto_perfil; });
          ultimoFetchFotosJugadores = ahora;
          guardarCacheFotosEnLS();
        }
      } catch(e) { console.warn('Error cacheando fotos:', e); }
    }

    var fotosUsuarios = Object.assign({}, cacheFotosJugadores);
    if (miFoto && miTelefono && !fotosUsuarios[normTel(miTelefono)]) fotosUsuarios[normTel(miTelefono)] = miFoto;

    var limiteMensajes = esRedLenta ? 30 : 100;
    var r = await supabaseClient.from('chat').select('id,usuario,mensaje,creado_en,es_admin,telefono,reacciones').order('creado_en', { ascending: true }).limit(limiteMensajes);
    if (r.error) throw r.error;

    if (!Array.isArray(r.data)) return;

    if (silencioso && r.data.length > 0) {
      var ultimoMensaje = r.data[r.data.length - 1];
      if (ultimoIdChat === ultimoMensaje.id) return;
    }

    var ultimoMensajeId = r.data.length > 0 ? r.data[r.data.length - 1].id : null;

    if (!silencioso || c.children.length === 0) {
      c.innerHTML = '';
      r.data.forEach(function(m) { c.appendChild(crearBurbujaChat(m, miNombre, miTelefono, fotosUsuarios)); });
    } else {
      var idsExistentes = {};
      c.querySelectorAll('.msg-bubble').forEach(function(b) { idsExistentes[b.getAttribute('data-id')] = true; });
      r.data.forEach(function(m) {
        if (!idsExistentes[m.id]) {
          c.appendChild(crearBurbujaChat(m, miNombre, miTelefono, fotosUsuarios));
        }
      });
    }

    ultimoIdChat = ultimoMensajeId;
    var estaCercaDelFondo = (c.scrollHeight - c.scrollTop - c.clientHeight) < 150;
    if (!silencioso || estaCercaDelFondo) {
      c.scrollTop = c.scrollHeight;
    }

  } catch(e) {
    console.error('Error cargando chat:', e);
    if (!silencioso) mostrarErrorConBoton('chat-mensajes-wa', 'cargarChatWa', 'No se pudo cargar el chat');
  }
}

function abrirMenuMensaje(id, texto, usuario, esMio) {
  var viejo = document.getElementById('menu-mensaje-flotante');
  if (viejo) viejo.remove();
  var overlayViejo = document.getElementById('overlay-chat-menu');
  if (overlayViejo) overlayViejo.remove();

  var menu = document.createElement('div');
  menu.id = 'menu-mensaje-flotante';
  menu.className = 'chat-menu-opciones';
  menu.style.position = 'fixed';
  menu.style.top = '50%';
  menu.style.left = '50%';
  menu.style.transform = 'translate(-50%, -50%)';
  menu.style.flexDirection = 'column';
  menu.style.gap = '10px';
  menu.style.maxWidth = '92vw';
  menu.style.background = '#233138';
  menu.style.borderRadius = '16px';
  menu.style.padding = '12px';
  menu.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
  menu.style.zIndex = '100';

  var emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '😍', '👏'];
  var emojisHtml = '<div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center; padding:4px 0;">';
  emojis.forEach(function(e) {
    emojisHtml += '<button onclick="toggleReaccionRapida(' + id + ', \'' + e + '\'); cerrarMenuMensaje();" style="font-size:26px; background:transparent; border:none; padding:6px; cursor:pointer; border-radius:50%; width:44px; height:44px; line-height:1;">' + e + '</button>';
  });
  emojisHtml += '</div>';

  var botonesAccion = '<div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; border-top:1px solid rgba(255,255,255,0.15); padding-top:10px; margin-top:4px;">';
  if ((esMio || esAdmin) && usuario !== '🤖 ASISTENTE' && usuario !== '🤖 SISTEMA') {
    botonesAccion += '<button onclick="editarMensajeWaDesdeMenu(' + id + ')" style="background:#2196F3; color:#fff; padding:10px 14px; border:none; border-radius:8px; font-weight:bold; font-size:13px; cursor:pointer;">✏️ Editar</button>';
    botonesAccion += '<button onclick="borrarMensajeWa(' + id + ')" style="background:#F44336; color:#fff; padding:10px 14px; border:none; border-radius:8px; font-weight:bold; font-size:13px; cursor:pointer;">🗑️ Borrar</button>';
  }
  botonesAccion += '</div>';

  menu.innerHTML = emojisHtml + botonesAccion;

  menu.setAttribute('data-msg-id', id);
  menu.setAttribute('data-msg-texto', texto);
  window.__menuMensajeActual = { id: id, texto: texto, usuario: usuario, esMio: esMio };

  var overlay = document.createElement('div');
  overlay.id = 'overlay-chat-menu';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,0.5)';
  overlay.style.zIndex = 99;
  overlay.onclick = function() { cerrarMenuMensaje(); };

  document.body.appendChild(overlay);
  document.body.appendChild(menu);
}

function editarMensajeWaDesdeMenu(id) {
  var datos = window.__menuMensajeActual;
  if (!datos || datos.id !== id) {
    cerrarMenuMensaje();
    return;
  }
  editarMensajeWa(id, datos.texto);
}

function cerrarMenuMensaje() {
  var menu = document.getElementById('menu-mensaje-flotante');
  if (menu) menu.remove();
  var overlay = document.getElementById('overlay-chat-menu');
  if (overlay) overlay.remove();
  window.__menuMensajeActual = null;
}

async function toggleReaccionRapida(id, emoji) {
  var miTelefono = localStorage.getItem('mi_telefono') || '';
  if (!miTelefono) { mostrarAlerta('⚠️ Primero regístrate para reaccionar.', 'error'); return; }
  if (!id || !emoji) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var bubble = document.querySelector('.msg-bubble[data-id="' + id + '"]');

  try {
    var r = await supabaseClient.from('chat').select('reacciones').eq('id', id).maybeSingle();
    if (r.error || !r.data) throw new Error('No se pudo leer el mensaje');

    var reaccionesObj = parsearReacciones(r.data.reacciones);

    var usuarios = reaccionesObj[emoji] || [];
    var indice = usuarios.indexOf(miTelefono);
    if (indice !== -1) {
      usuarios.splice(indice, 1);
    } else {
      usuarios.push(miTelefono);
    }
    if (usuarios.length > 0) reaccionesObj[emoji] = usuarios;
    else delete reaccionesObj[emoji];

    var nuevoCampo = JSON.stringify(reaccionesObj);
    await supabaseClient.from('chat').update({ reacciones: nuevoCampo }).eq('id', id);

    if (bubble) actualizarBurbujaReacciones(bubble, reaccionesObj, miTelefono);
  } catch(e) {
    console.error('Error reaccionando:', e);
    mostrarAlerta('❌ No se pudo reaccionar. Intenta de nuevo.', 'error');
  }
}

function actualizarBurbujaReacciones(bubble, reaccionesObj, miTelefono) {
  if (!bubble || !reaccionesObj || typeof reaccionesObj !== 'object') return;

  var viejo = bubble.querySelector('.msg-reacciones');
  if (viejo) viejo.remove();

  var emojisActivos = Object.keys(reaccionesObj);
  if (emojisActivos.length === 0) return;

  var html = '<div class="msg-reacciones">';
  emojisActivos.forEach(function(emoji) {
    var usuarios = reaccionesObj[emoji] || [];
    var count = usuarios.length;
    var yoReaccione = (miTelefono && usuarios.indexOf(miTelefono) !== -1);
    var badge = count > 0 ? ' ' + count : '';
    html += '<span class="reaccion-pildora' + (yoReaccione ? ' activa' : '') + '" onclick="event.stopPropagation(); toggleReaccionRapida(' + bubble.getAttribute('data-id') + ', \'' + emoji + '\')">' + emoji + badge + '</span>';
  });
  html += '</div>';

  var hora = bubble.querySelector('.msg-hora');
  if (hora) hora.insertAdjacentHTML('beforebegin', html);
  else bubble.insertAdjacentHTML('beforeend', html);
}

function reaccionarMensajeWa(id, emoji) { return toggleReaccionRapida(id, emoji); }

async function editarMensajeWa(id, textoViejo) {
  cerrarMenuMensaje();
  var miTelefono = localStorage.getItem('mi_telefono') || '';
  var bubble = document.querySelector('.msg-bubble[data-id="' + id + '"]');
  if (!bubble) return;

  var esMio = bubble.classList.contains('msg-out');
  if (!esMio && !esAdmin) {
    mostrarAlerta('🚫 No puedes editar el mensaje de otra persona.', 'error');
    return;
  }

  var nuevoTexto = await mostrarPromptCustom('✏️ Edita tu mensaje:', textoViejo || '');
  if (!nuevoTexto || nuevoTexto === textoViejo) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var textoNodo = bubble.querySelector('.msg-texto');
  if (textoNodo) textoNodo.textContent = nuevoTexto;

  supabaseClient.from('chat').update({ mensaje: nuevoTexto }).eq('id', id).then(function(res) {
    if (res.error) { mostrarAlerta('❌ Error al editar: ' + res.error.message, 'error'); }
    cargarChatWa(true);
  });
}

async function borrarMensajeWa(id) {
  cerrarMenuMensaje();
  var miTelefono = localStorage.getItem('mi_telefono') || '';
  var bubble = document.querySelector('.msg-bubble[data-id="' + id + '"]');
  if (!bubble) return;

  var esMio = bubble.classList.contains('msg-out');
  if (!esMio && !esAdmin) {
    mostrarAlerta('🚫 No puedes borrar el mensaje de otra persona.', 'error');
    return;
  }

  var confirmado = await mostrarConfirmacionCustom('🗑️ ¿Seguro que quieres borrar este mensaje?');
  if (!confirmado) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  bubble.remove();

  supabaseClient.from('chat').delete().eq('id', id).then(function(res) {
    if (res.error) { mostrarAlerta('❌ Error al borrar: ' + res.error.message, 'error'); }
    cargarChatWa(true);
  });
}

// ============================================
// FIN BLOQUE 10 — Continúa en Bloque 11
// ============================================// ============================================
// BLOQUE 11: GALERÍA GANADORES + AUDIO + SUBIR FOTO
// ============================================

async function cargarGaleriaGanadores() {
  var cont = document.getElementById('galeria-ganadores');
  if (!cont || document.hidden) return;
  cont.innerHTML = '<div class="historial-vacio">Cargando...</div>';

  if (!supabaseClient) {
    mostrarErrorConBoton('galeria-ganadores', 'cargarGaleriaGanadores', 'Sin conexión al servidor');
    return;
  }

  var esRedLenta = false;
  if (navigator.connection && (navigator.connection.effectiveType === '2g' || navigator.connection.effectiveType === 'slow-2g')) esRedLenta = true;
  var limiteFotos = esRedLenta ? 12 : 50;

  try {
    var r = await supabaseClient.from('fotos_ganadores').select('*').order('creado_en', { ascending: false }).limit(limiteFotos);
    if (r.error) throw r.error;
    if (!r.data || r.data.length === 0) {
      cont.innerHTML = '<div class="historial-vacio">Aún no hay fotos de ganadores.<br><br>El administrador pronto subirá las fotos.</div>';
      return;
    }
    var html = '<div class="galeria-grid">';
    r.data.forEach(function(foto) {
      if (!foto || !foto.url_foto) return;

      var nombreEsc = escapeHtml(foto.nombre_ganador || 'Ganador');
      var numeroEsc = escapeHtml(foto.numero_ganador || '--');
      var codigoEsc = escapeHtml(foto.codigo_ticket || 'N/A');
      var fechaEsc = escapeHtml(foto.fecha || '');
      var urlFotoEsc = escapeHtml(foto.url_foto);
      var audioUrlEsc = foto.audio_url ? escapeHtml(foto.audio_url) : '';

      var btnBorrar = esAdmin
        ? '<button onclick="borrarFotoGanador(' + foto.id + ')" style="width:100%; margin-top:5px; background:#F44336; color:#fff; border:none; padding:5px; border-radius:5px; font-size:11px; cursor:pointer;">🗑️ Borrar Foto</button>'
        : '';

      var audioHtml = '';
      if (audioUrlEsc) {
        audioHtml = '<div class="audio-ganador-container">' +
          '<p class="audio-ganador-label">🎙️ TESTIMONIO</p>' +
          '<audio controls preload="none" style="width:100%; height:36px;">' +
          '<source src="' + audioUrlEsc + '" type="audio/mpeg">' +
          'Tu navegador no soporta audio.' +
          '</audio>' +
          '</div>';
      }

      var btnSubirAudio = '';
      if (esAdmin && !foto.audio_url) {
        var nombreParaAudio = (foto.nombre_ganador || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        btnSubirAudio = '<button onclick="abrirModalSubirAudio(' + foto.id + ', \'' + nombreParaAudio + '\')" class="btn-subir-audio">🎙️ Subir Audio Testimonio</button>';
      }

      html += '<div class="foto-ganador-card">' +
        '<img src="' + urlFotoEsc + '" alt="Ganador" loading="lazy" onclick="verFotoGanador(\'' + urlFotoEsc + '\')">' +
        '<div class="foto-info">' +
        '<p><strong>' + nombreEsc + '</strong></p>' +
        '<p>🎯 Fijo: ' + numeroEsc + '</p>' +
        '<p>🎟️ Código: ' + codigoEsc + '</p>' +
        '<p style="font-size:11px; color:#FFD700;">' + fechaEsc + '</p>' +
        audioHtml +
        btnSubirAudio +
        btnBorrar +
        '</div></div>';
    });
    html += '</div>';
    cont.innerHTML = html;
  } catch(e) {
    console.error('Error cargando galería:', e);
    mostrarErrorConBoton('galeria-ganadores', 'cargarGaleriaGanadores', 'No se pudo cargar la galería');
  }
}

function abrirModalSubirAudio(fotoId, nombreGanador) {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!fotoId || isNaN(parseInt(fotoId))) { mostrarAlerta('❌ ID de foto inválido', 'error'); return; }

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-subir-audio';
  m.innerHTML = '<div class="modal-contenido" style="background:#001A5C; border:2px solid #25D366;">' +
    '<h2 style="color:#25D366; text-align:center;">🎙️ Subir Audio Testimonio</h2>' +
    '<p style="font-size:13px; color:rgba(255,255,255,0.8); text-align:center; margin-bottom:15px;">' +
    'Ganador: <strong style="color:#FFD700;">' + escapeHtml(nombreGanador || 'Sin nombre') + '</strong>' +
    '</p>' +
    '<div style="background:rgba(37,211,102,0.1); border:1px solid #25D366; border-radius:10px; padding:12px; margin-bottom:15px; font-size:12px; color:#fff; line-height:1.5;">' +
    '<p style="margin:0 0 6px 0;"><strong style="color:#25D366;">💡 ¿Qué subir?</strong></p>' +
    '<p style="margin:0;">Un audio corto (menos de 1 minuto) del ganador agradeciendo o confirmando que cobró su premio.</p>' +
    '</div>' +
    '<label>🎧 Archivo de Audio (MP3, M4A, OGG):</label>' +
    '<input type="file" id="audio-file-input" accept="audio/*" style="width:100%; padding:10px; background:#fff; color:#000; border-radius:8px; margin-top:5px; margin-bottom:15px;">' +
    '<div class="modal-botones">' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-subir-audio\'); if(m) m.remove();">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="subirAudioGanador(' + fotoId + ')" style="background:#25D366; color:#fff;">🚀 Subir Audio</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

async function subirAudioGanador(fotoId) {
  var input = document.getElementById('audio-file-input');
  if (!input) return;
  var archivo = input.files[0];
  if (!archivo) { mostrarAlerta('⚠️ Selecciona un archivo de audio.', 'error'); return; }
  if (archivo.size > 5 * 1024 * 1024) { mostrarAlerta('⚠️ El audio es muy grande (máx 5MB).', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  mostrarAlerta('⏳ Subiendo audio... espera un momento.', 'info');

  try {
    var extension = '.mp3';
    if (archivo.name) {
      var partes = archivo.name.split('.');
      if (partes.length > 1) extension = '.' + partes[partes.length - 1].toLowerCase();
    }
    var nombreArchivo = 'audio_ganador_' + fotoId + '_' + Date.now() + extension;
    var contentType = archivo.type || 'audio/mpeg';
    var subida = await supabaseClient.storage.from('capturas').upload(nombreArchivo, archivo, { contentType: contentType });
    if (subida.error) throw subida.error;
    var urlAudio = supabaseClient.storage.from('capturas').getPublicUrl(nombreArchivo).data.publicUrl;
    var upd = await supabaseClient.from('fotos_ganadores').update({ audio_url: urlAudio }).eq('id', fotoId);
    if (upd.error) throw upd.error;

    await registrarLog('subir_audio_ganador', 'Audio subido a foto ID ' + fotoId, '', '', '');
    mostrarAlerta('✅ ¡Audio subido con éxito!', 'exito');

    var modal = document.getElementById('modal-subir-audio');
    if (modal) modal.remove();
    cargarGaleriaGanadores();
  } catch(e) {
    mostrarAlerta('❌ Error al subir audio: ' + (e.message || 'Desconocido'), 'error');
    console.error(e);
  }
}

async function borrarFotoGanador(id) {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Seguro que quieres borrar esta foto de la galería?');
  if (!confirmado) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }
  try {
    var r = await supabaseClient.from('fotos_ganadores').delete().eq('id', id);
    if (r.error) throw r.error;
    mostrarAlerta('✅ Foto eliminada de la galería', 'exito');
    cargarGaleriaGanadores();
  } catch (e) { mostrarAlerta('❌ Error al borrar: ' + (e.message || 'Desconocido'), 'error'); }
}

function verFotoGanador(url) {
  if (!url) return;
  var m = document.createElement('div');
  m.className = 'modal-captura';
  m.onclick = function() { m.remove(); };
  m.innerHTML = '<button class="cerrar-captura">✖</button><img src="' + escapeHtml(url) + '" loading="lazy" alt="Foto ganador">';
  document.body.appendChild(m);
}

async function abrirModalSubirGanador() {
  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-subir-ganador';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700;">' +
    '<h2>📸 Subir Foto de Ganador</h2>' +
    '<label>👤 Nombre del Ganador:</label><input type="text" id="foto-nombre" placeholder="Ej: Juan Pérez">' +
    '<label>🎯 Número que jugó:</label><input type="text" id="foto-numero" placeholder="Ej: 47">' +
    '<label>🎟️ Código del Ticket:</label><input type="text" id="foto-codigo" placeholder="Ej: RIF-12345">' +
    '<label>📸 Foto del Ganador:</label><input type="file" id="foto-archivo" accept="image/*" style="background:#fff; padding:10px; border-radius:8px; width:100%; color:#000; margin-top:5px;">' +
    '<div class="modal-botones">' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-subir-ganador\'); if(m) m.remove();">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="subirFotoGanador()">Subir Foto</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

async function subirFotoGanador() {
  var nombreEl = document.getElementById('foto-nombre');
  var numeroEl = document.getElementById('foto-numero');
  var codigoEl = document.getElementById('foto-codigo');
  var archivoEl = document.getElementById('foto-archivo');

  var nombre = nombreEl ? nombreEl.value.trim() : '';
  var numero = numeroEl ? numeroEl.value.trim() : '';
  var codigo = codigoEl ? codigoEl.value.trim() : '';
  var archivo = archivoEl && archivoEl.files ? archivoEl.files[0] : null;

  if (!nombre || !numero || !archivo) { mostrarAlerta('⚠️ Llena los campos principales y sube una foto', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  mostrarAlerta('⏳ Subiendo foto... espera un momento.', 'info');

  try {
    var archivoComprimido = await comprimirImagen(archivo);
    var nombreArchivo = 'ganador_' + Date.now() + '.jpg';
    var subida = await supabaseClient.storage.from('capturas').upload(nombreArchivo, archivoComprimido);
    if (subida.error) throw subida.error;
    var urlFoto = supabaseClient.storage.from('capturas').getPublicUrl(nombreArchivo).data.publicUrl;
    var insert = await supabaseClient.from('fotos_ganadores').insert([{
      url_foto: urlFoto,
      nombre_ganador: nombre,
      numero_ganador: numero,
      codigo_ticket: codigo,
      fecha: obtenerFechaFormateada()
    }]);
    if (insert.error) throw insert.error;

    mostrarAlerta('✅ ¡Foto subida con éxito!', 'exito');
    var modal = document.getElementById('modal-subir-ganador');
    if (modal) modal.remove();
    var ganadoresSec = document.getElementById('ganadores');
    if (ganadoresSec && ganadoresSec.classList.contains('activa')) cargarGaleriaGanadores();
  } catch (e) { mostrarAlerta('❌ Error al subir la foto: ' + (e.message || 'Desconocido'), 'error'); console.error(e); }
}

// ============================================
// FIN BLOQUE 11 — Continúa en Bloque 12
// ============================================// ============================================
// BLOQUE 12: RECORDATORIOS + REPORTES + VERIFICAR GANADOR + COBRAR PREMIO
// ============================================

function generarMensajeRecordatorio() {
  var cPr = turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche';
  var cPm = turnoActual === 'mediodia' ? 'premio_mediodia' : 'premio_noche';
  var precio = parseInt((typeof config !== 'undefined' && config && config[cPr]) || '50');
  var premio = parseInt((typeof config !== 'undefined' && config && config[cPm]) || '250');
  if (isNaN(precio)) precio = 50;
  if (isNaN(premio)) premio = 250;
  var horaCierre = turnoActual === 'mediodia' ? '1:00 PM' : '9:00 PM';
  var turnoTxt = turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche';

  var msg = '🎲 *LA RIFITA CUBANA*\n\n';
  msg += '¡Hola [nombre]! 👋\n\n';
  msg += '⏰ El turno de *' + turnoTxt + '* ya está ABIERTO.\n\n';
  msg += '💰 Precio por número: *' + precio + ' CUP*\n';
  msg += '🏆 Premio: *' + premio + ' CUP*\n';
  msg += '🕐 Cierra a las: *' + horaCierre + '*\n\n';
  msg += '🎁 *COMBO FAMILIAR:* Si compras 3 números, el 3ro te sale a mitad de precio.\n\n';
  msg += '👇 *ENTRA AHORA:*\n';
  msg += 'https://larifitacubana.com/\n\n';
  msg += '🇨🇺 *La Rifita Cubana*';

  return msg;
}

async function abrirModalRecordatorioMasivo() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  mostrarAlerta('⏳ Contando jugadores con recordatorio activo...', 'info');

  var totalActivos = 0;
  var listaJugadores = [];
  try {
    var r = await supabaseClient.from('puntos_jugadores').select('telefono,nombre,recordatorio_activo').eq('recordatorio_activo', true).eq('estado', 'activo');
    if (r.data && Array.isArray(r.data)) {
      totalActivos = r.data.length;
      listaJugadores = r.data;
    }
  } catch(e) { console.warn('Error contando:', e); }

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-recordatorio-masivo';
  m.innerHTML = '<div class="modal-contenido" style="background:#001A5C; border:2px solid #25D366;">' +
    '<h2 style="color:#25D366; text-align:center;">🔔 Enviar Recordatorio</h2>' +
    '<p style="font-size:13px; color:rgba(255,255,255,0.8); text-align:center; margin-bottom:15px;">Se enviará a los jugadores que activaron el recordatorio.</p>' +
    '<div style="background:rgba(37,211,102,0.15); border:2px solid #25D366; border-radius:12px; padding:15px; margin-bottom:15px; text-align:center;">' +
    '<p style="color:#25D366; font-size:11px; text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Jugadores activos con recordatorio:</p>' +
    '<h2 style="color:#fff; font-size:36px; margin:0;">' + totalActivos + '</h2>' +
    '</div>' +
    '<label>📝 Mensaje a enviar:</label>' +
    '<textarea id="recordatorio-mensaje" style="width:100%; height:180px; padding:10px; border-radius:10px; border:2px solid #25D366; background:rgba(255,255,255,0.1); color:#fff; font-size:12px; margin-bottom:15px; resize:none; font-family:monospace;">' + escapeHtml(generarMensajeRecordatorio()) + '</textarea>' +
    '<div style="background:rgba(255,193,7,0.15); border:1px solid #FFC107; border-radius:10px; padding:12px; margin-bottom:15px; font-size:11px; color:#fff; line-height:1.5;">' +
    '<p style="margin:0 0 4px 0;"><strong style="color:#FFC107;">💡 IMPORTANTE:</strong></p>' +
    '<p style="margin:0;">WhatsApp limita los envíos masivos. Te recomendamos enviar a un máximo de 20-30 personas al día.</p>' +
    '</div>' +
    '<div class="modal-botones" style="flex-direction:column; gap:10px;">' +
    '<button onclick="enviarRecordatorioMasivo()" style="width:100%; padding:14px; background:linear-gradient(135deg,#25D366,#128C7E); color:#fff; border:none; border-radius:12px; font-weight:900; font-size:15px; cursor:pointer;">📲 Enviar a TODOS (' + totalActivos + ')</button>' +
    '<button onclick="enviarRecordatorioLista()" style="width:100%; padding:12px; background:rgba(37,211,102,0.2); color:#25D366; border:2px solid #25D366; border-radius:12px; font-weight:bold; font-size:14px; cursor:pointer;">📋 Enviar a Lista (copiar números)</button>' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-recordatorio-masivo\'); if(m) m.remove();" style="width:100%; padding:12px; background:rgba(255,255,255,0.15); color:#fff; border:none; border-radius:12px; font-weight:bold; font-size:14px; cursor:pointer;">❌ Cancelar</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);

  window.__listaRecordatorio = listaJugadores;
}

async function enviarRecordatorioMasivo() {
  var lista = window.__listaRecordatorio || [];
  if (lista.length === 0) { mostrarAlerta('⚠️ No hay jugadores con recordatorio activo.', 'error'); return; }
  if (lista.length > 30) {
    var seguir = await mostrarConfirmacionCustom('⚠️ Tienes ' + lista.length + ' jugadores.\n\nWhatsApp puede bloquear si envías demasiados seguidos. ¿Continuar?');
    if (!seguir) return;
  }

  var mensajeEl = document.getElementById('recordatorio-mensaje');
  var mensaje = mensajeEl ? mensajeEl.value : '';
  if (!mensaje) { mostrarAlerta('⚠️ El mensaje está vacío.', 'error'); return; }

  var enviados = 0;
  for (var i = 0; i < lista.length; i++) {
    var jugador = lista[i];
    if (!jugador || !jugador.telefono) continue;
    var telLimpio = jugador.telefono.replace(/[^0-9]/g, '');
    if (!telLimpio) continue;
    var msgPersonalizado = mensaje.replace(/\[nombre\]/g, jugador.nombre || 'amigo');
    var urlWA = 'https://wa.me/' + telLimpio + '?text=' + encodeURIComponent(msgPersonalizado);

    await new Promise(function(resolve) {
      setTimeout(function() {
        window.open(urlWA, '_blank');
        resolve();
      }, 3000);
    });

    enviados++;
    if (enviados >= 5) {
      mostrarAlerta('⏸️ Se abrieron 5 chats de WhatsApp.\n\nContinúa enviando desde cada uno. Cuando termines, vuelve a tocar el botón.', 'info');
      break;
    }
  }

  await registrarLog('recordatorio_masivo', 'Enviados ' + enviados + ' recordatorios', '', '', '');
  var modal = document.getElementById('modal-recordatorio-masivo');
  if (modal) modal.remove();
  mostrarAlerta('✅ Se abrieron ' + enviados + ' chats de WhatsApp.\n\nEnvía el mensaje en cada uno.', 'exito');
}

function enviarRecordatorioLista() {
  var lista = window.__listaRecordatorio || [];
  if (lista.length === 0) { mostrarAlerta('⚠️ No hay jugadores con recordatorio activo.', 'error'); return; }

  var textoLista = '📋 *Lista de jugadores con recordatorio activo (' + lista.length + '):*\n\n';
  lista.forEach(function(j, i) {
    if (!j) return;
    textoLista += (i + 1) + '. ' + (j.nombre || 'Sin nombre') + ' - ' + (j.telefono || 'N/A') + '\n';
  });
  textoLista += '\n💡 Envía el recordatorio manualmente a cada uno.';

  if (navigator.clipboard) {
    navigator.clipboard.writeText(textoLista).then(function() {
      mostrarAlerta('✅ Lista copiada al portapapeles.\n\nPega la lista en tus notas de WhatsApp y envía el recordatorio uno por uno.', 'exito');
    }).catch(function() {
      mostrarAlerta('📋 Lista:\n\n' + textoLista, 'info');
    });
  } else {
    mostrarAlerta('📋 Lista:\n\n' + textoLista, 'info');
  }
}

async function enviarReporteDiarioWA() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var hoy = obtenerFechaFormateada();

  var rHoy = await supabaseClient.from('reservas').select('estado').eq('fecha', hoy);
  var datos = (rHoy && rHoy.data) ? rHoy.data : [];
  var pag = datos.filter(function(x) { return x.estado === 'pagado'; }).length;
  var ocu = datos.filter(function(x) { return x.estado === 'ocupado'; }).length;
  var libres = 100 - datos.length;
  var cPr = turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche';
  var precio = parseInt((config && config[cPr]) || '50');
  if (isNaN(precio)) precio = 50;
  var recaudado = pag * precio;

  var texto = "📊 *REPORTE DE LA RIFITA CUBANA*\n";
  texto += "📅 Fecha: " + hoy + "\n\n";
  texto += "🎯 Turno Actual: " + (turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche') + "\n";
  texto += "✅ Pagados: " + pag + "\n";
  texto += "⏳ Ocupados (Pendientes): " + ocu + "\n";
  texto += "🟢 Libres: " + libres + "\n\n";
  texto += "💰 *Total Recaudado:* " + recaudado + " CUP\n";
  texto += "📈 *Meta Diaria:* " + ((config && config.meta_diaria) || '3000') + " CUP\n\n";
  if (config && config.fijo_mediodia) texto += "🏆 Fijo Mediodía: " + config.fijo_mediodia + " (Ganador: " + (config.ganador_mediodia || 'Nadie') + ")\n";
  if (config && config.fijo_noche) texto += "🏆 Fijo Noche: " + config.fijo_noche + " (Ganador: " + (config.ganador_noche || 'Nadie') + ")\n";
  texto += "\n🇨🇺 *Administración La Rifita*";

  var miNumeroWA = '994405854881';
  window.open('https://wa.me/' + miNumeroWA + '?text=' + encodeURIComponent(texto), '_blank');
}

function parseFechaHora(fecha, hora) {
  try {
    if (!fecha || !hora) return null;
    var partesFecha = fecha.split('/');
    if (partesFecha.length !== 3) return null;
    var dia = parseInt(partesFecha[0]);
    var mes = parseInt(partesFecha[1]) - 1;
    var anio = parseInt(partesFecha[2]);
    if (isNaN(dia) || isNaN(mes) || isNaN(anio)) return null;

    var esPM = /PM/i.test(hora);
    var partesHora = hora.replace(/ AM/i, '').replace(/ PM/i, '').split(':');
    if (partesHora.length < 2) return null;
    var h = parseInt(partesHora[0]);
    var m = parseInt(partesHora[1]);
    if (isNaN(h) || isNaN(m)) return null;
    if (esPM && h !== 12) h += 12;
    if (!esPM && h === 12) h = 0;

    return new Date(anio, mes, dia, h, m, 0);
  } catch(e) { return null; }
}

async function liberarVencidos() {
  if (document.hidden) return;
  if (!supabaseClient) return;
  try {
    var r = await supabaseClient.from('reservas').select('id,numero,telefono,fecha,hora,turno,revisar_admin').eq('estado', 'ocupado').eq('turno', turnoActual);
    if (r.error || !r.data || r.data.length === 0) return;

    var ahora = new Date();
    var marcadasParaRevision = 0;

    for (var i = 0; i < r.data.length; i++) {
      var reserva = r.data[i];
      if (!reserva.fecha || !reserva.hora) continue;
      if (reserva.revisar_admin === true) continue;
      var fechaHora = parseFechaHora(reserva.fecha, reserva.hora);
      if (!fechaHora) continue;
      var diffMin = Math.round((ahora - fechaHora) / 1000 / 60);
      if (diffMin >= 60) {
        await supabaseClient.from('reservas').update({ revisar_admin: true, minutos_esperando: diffMin }).eq('id', reserva.id);
        marcadasParaRevision++;
        try {
          await supabaseClient.from('avisos').insert([{
            telefono_destino: 'ADMIN',
            mensaje: '⚠️ La reserva del número ' + reserva.numero + ' (' + reserva.telefono + ') lleva ' + diffMin + ' min sin aprobar. Revísala manualmente.',
            tipo: 'alerta',
            leido: false
          }]);
        } catch(e) {}
        await registrarLog('reserva_para_revisar', 'Reserva marcada para revisión tras ' + diffMin + ' min', reserva.numero, reserva.telefono, '');
      }
    }
    if (marcadasParaRevision > 0) {
      console.log('⚠️ ' + marcadasParaRevision + ' reservas marcadas para revisión del admin (NO borradas)');
      await cargarReservas();
    }
  } catch(e) { console.error('Error marcando reservas para revisión:', e); }
}

async function verificarGanador() {
  if (document.hidden) return;
  var miTel = localStorage.getItem('mi_telefono');
  if (!miTel) return;
  if (!supabaseClient) return;

  var miTelLimpio = miTel.replace(/[^0-9]/g, '');

  try {
    var r = await supabaseClient.from('historial_fijos').select('id,turno,fijo,premio,ganador_telefono').order('creado_en', { ascending: false }).limit(50);
    if (r.error || !r.data) return;

    var ganador = null;
    var turno = null;
    for (var i = 0; i < r.data.length; i++) {
      var h = r.data[i];
      if (!h.ganador_telefono) continue;
      var telGanador = h.ganador_telefono.replace(/[^0-9]/g, '');
      if (telGanador.length >= 8 && miTelLimpio.length >= 8) {
        if (telGanador.slice(-8) === miTelLimpio.slice(-8)) {
          ganador = h;
          turno = h.turno;
          break;
        }
      } else if (telGanador === miTelLimpio) {
        ganador = h;
        turno = h.turno;
        break;
      }
    }
    if (!ganador) return;
    var cerradoId = localStorage.getItem('ganador_cerrado_' + ganador.id);
    if (cerradoId === 'true') return;
    mostrarBannerGanador(ganador, turno);
  } catch(e) { console.warn('Error verificando ganador:', e); }
}

function mostrarBannerGanador(ganador, turno) {
  var prev = document.getElementById('banner-ganador');
  if (prev) prev.remove();

  var turnoTxt = turno === 'mediodia' ? '☀️ MEDIODÍA' : '🌙 NOCHE';
  var fijo = ganador.fijo || '--';
  var premio = ganador.premio || '250';
  reproducirSonido('ganar');

  for (var i = 0; i < 30; i++) {
    var confeti = document.createElement('div');
    confeti.className = 'confeti';
    confeti.style.left = Math.random() * 100 + 'vw';
    confeti.style.backgroundColor = ['#FFD700', '#2ECC71', '#F44336', '#2196F3', '#fff', '#E040FB'][Math.floor(Math.random() * 6)];
    confeti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    confeti.style.animationDelay = (Math.random() * 1) + 's';
    document.body.appendChild(confeti);
    setTimeout(function(c) { if (c && c.parentNode) c.remove(); }.bind(null, confeti), 4000);
  }

  var banner = document.createElement('div');
  banner.id = 'banner-ganador';
  banner.innerHTML = '<div class="banner-ganador-contenido">' +
    '<button class="banner-cerrar" onclick="cerrarBannerGanador(' + ganador.id + ')">✖</button>' +
    '<div class="banner-trofeo">🏆</div>' +
    '<div class="banner-texto">' +
    '<h2>¡¡GANASTE!!</h2>' +
    '<p class="banner-turno">' + turnoTxt + '</p>' +
    '<p class="banner-fijo">Fijo ganador: <strong>' + escapeHtml(fijo) + '</strong></p>' +
    '<p class="banner-premio">💰 Premio: <strong>' + escapeHtml(String(premio)) + ' CUP</strong></p>' +
    '</div>' +
    '<button class="banner-cobrar" onclick="cobrarPremio(\'' + escapeHtml(fijo) + '\', \'' + escapeHtml(String(premio)) + '\', \'' + turno + '\')">📲 COBRAR MI PREMIO</button>' +
    '</div>';
  document.body.appendChild(banner);
  setTimeout(function() { banner.classList.add('banner-visible'); }, 100);
}

function cerrarBannerGanador(id) {
  var banner = document.getElementById('banner-ganador');
  if (banner) {
    banner.classList.remove('banner-visible');
    setTimeout(function() { if (banner.parentNode) banner.remove(); }, 300);
  }
  if (id) localStorage.setItem('ganador_cerrado_' + id, 'true');
}

function cobrarPremio(fijo, premio, turno) {
  var miNombre = localStorage.getItem('mi_nombre') || 'Jugador';
  var miTel = localStorage.getItem('mi_telefono') || '';
  var turnoTxt = turno === 'mediodia' ? 'Mediodía' : 'Noche';
  var msg = '🏆 ¡HOLA! GANÉ EN LA RIFITA CUBANA 🏆\n\n' +
    '👤 Nombre: ' + miNombre + '\n' +
    '📱 Mi teléfono: ' + miTel + '\n' +
    '🎯 Turno: ' + turnoTxt + '\n' +
    '🎲 Fijo ganador: ' + fijo + '\n' +
    '💰 Premio: ' + premio + ' CUP\n\n' +
    'Quiero cobrar mi premio. ¿Cómo procedo? 🙏';
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

// ============================================
// FIN BLOQUE 12 — Continúa en Bloque 13
// ============================================// ============================================
// BLOQUE 13: ARCHIVO TICKETS + AUTO-CIERRE + LIMPIEZA
// ============================================

async function cargarArchivoTickets() {
  var cont = document.getElementById('lista-archivo');
  var contador = document.getElementById('contador-archivo');
  if (!cont || document.hidden) return;
  cont.innerHTML = '<div class="historial-vacio">Cargando archivo...</div>';

  if (!supabaseClient) {
    mostrarErrorConBoton('lista-archivo', 'cargarArchivoTickets', 'Sin conexión al servidor');
    if (contador) contador.textContent = '?';
    return;
  }

  try {
    var r = await supabaseClient.from('archivo_tickets').select('id,ticket_data,archivado_en,creado_en,borrado_por').order('id', { ascending: false });
    if (r.error) throw r.error;
    if (!r.data || r.data.length === 0) {
      cont.innerHTML = '<div class="historial-vacio">📭 No hay tickets archivados aún.</div>';
      if (contador) contador.textContent = '0';
      return;
    }
    if (contador) contador.textContent = r.data.length;

    var html = '';
    r.data.forEach(function(archivo) {
      var ticket = archivo.ticket_data || {};
      var fechaArchivo = 'N/A';
      if (archivo.archivado_en) fechaArchivo = new Date(archivo.archivado_en).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
      else if (archivo.creado_en) fechaArchivo = new Date(archivo.creado_en).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

      var turnoTxt = ticket.turno === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche';
      var numeroEsc = escapeHtml(String(ticket.numero || '?'));
      var nombreEsc = escapeHtml(ticket.nombre || 'Sin nombre');
      var telEsc = escapeHtml(ticket.telefono || 'N/A');
      var fechaEsc = escapeHtml(ticket.fecha || 'N/A');
      var horaEsc = escapeHtml(ticket.hora || 'N/A');
      var refEsc = escapeHtml(ticket.referencia || 'N/A');
      var recargaEsc = escapeHtml(ticket.telefono_recarga || 'N/A');
      var codigoEsc = escapeHtml(ticket.codigo_ticket || 'N/A');
      var capturaEsc = ticket.captura_url ? escapeHtml(ticket.captura_url) : '';
      var borradoEsc = escapeHtml(archivo.borrado_por || 'Admin');

      html += '<div class="admin-pro-reserva-card archivado">' +
        '<div class="admin-pro-reserva-header">' +
        '<div class="admin-pro-reserva-numero">' + numeroEsc + '</div>' +
        '<div class="admin-pro-reserva-titulo"><h4>' + nombreEsc + '</h4><p>📱 ' + telEsc + '</p></div>' +
        '<span class="admin-pro-badge-archivado">📦 Archivado</span>' +
        '</div>' +
        '<div class="admin-pro-reserva-body">' +
        '<div class="admin-pro-reserva-datos">' +
        '<p><span>🎯 Turno:</span> ' + turnoTxt + '</p>' +
        '<p><span>📅 Fecha:</span> ' + fechaEsc + '</p>' +
        '<p><span>⏰ Hora:</span> ' + horaEsc + '</p>' +
        '<p><span>💳 Ref:</span> ' + refEsc + '</p>' +
        '<p><span>📲 Recarga:</span> ' + recargaEsc + '</p>' +
        '<p><span>🎟️ Código:</span> ' + codigoEsc + '</p>' +
        '<p><span>🕐 Archivado:</span> ' + escapeHtml(fechaArchivo) + '</p>' +
        '<p><span>👤 Por:</span> ' + borradoEsc + '</p>' +
        '</div>' +
        (capturaEsc ? '<img src="' + capturaEsc + '" class="captura-admin" loading="lazy" onclick="verCaptura(\'' + capturaEsc + '\')" alt="Captura">' : '') +
        '<div style="display:flex; gap:8px; margin-top:12px;">' +
        '<button class="admin-pro-btn-mini" style="flex:1; background:#25D366; color:#fff; border:none;" onclick="restaurarTicketArchivado(' + archivo.id + ')">♻️ Restaurar</button>' +
        '<button class="admin-pro-btn-mini rojo" style="flex:1;" onclick="borrarTicketArchivado(' + archivo.id + ')">🗑️ Borrar</button>' +
        '</div></div></div>';
    });
    cont.innerHTML = html;
  } catch(e) {
    console.error('Error cargando archivo:', e);
    mostrarErrorConBoton('lista-archivo', 'cargarArchivoTickets', 'No se pudo cargar el archivo');
    if (contador) contador.textContent = '?';
  }
}

async function limpiarArchivoViejo() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('🧹 ¿Limpiar los tickets archivados con más de 24 horas de antigüedad?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('archivo_tickets').select('id,archivado_en,creado_en');
    if (r.error) throw r.error;
    var ahora = new Date();
    var borrados = 0;
    if (r.data && Array.isArray(r.data)) {
      for (var i = 0; i < r.data.length; i++) {
        var a = r.data[i];
        var fechaStr = a.archivado_en || a.creado_en;
        if (!fechaStr) continue;
        var fechaArchivo = new Date(fechaStr);
        if (isNaN(fechaArchivo.getTime())) continue;
        var diferenciaHoras = (ahora - fechaArchivo) / 1000 / 60 / 60;
        if (diferenciaHoras > 24) {
          await supabaseClient.from('archivo_tickets').delete().eq('id', a.id);
          borrados++;
        }
      }
    }
    if (borrados > 0) {
      mostrarAlerta('✅ Se borraron ' + borrados + ' tickets del archivo.', 'exito');
      await registrarLog('limpiar_archivo', borrados + ' tickets viejos eliminados', '', '', '');
    } else {
      mostrarAlerta('ℹ️ No hay tickets archivados con más de 24 horas.', 'info');
    }
    cargarArchivoTickets();
  } catch(e) { mostrarAlerta('❌ Error al limpiar archivo: ' + (e.message || 'Desconocido'), 'error'); }
}

async function restaurarTicketArchivado(id) {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('♻️ ¿Restaurar este ticket al historial de aprobados?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('archivo_tickets').select('*').eq('id', id).maybeSingle();
    if (r.error || !r.data) throw new Error('No encontrado');
    var ticket = Object.assign({}, r.data.ticket_data);
    if (!ticket || !ticket.numero) throw new Error('Datos inválidos');
    delete ticket.id;
    ticket.estado = 'pagado';
    if (!ticket.fecha_aprobado) {
      ticket.fecha_aprobado = obtenerFechaFormateada();
      ticket.hora_aprobado = obtenerHora12();
    }
    var ins = await supabaseClient.from('reservas').insert([ticket]);
    if (ins.error) throw ins.error;
    await supabaseClient.from('archivo_tickets').delete().eq('id', id);
    await registrarLog('restaurar_ticket', 'Ticket restaurado desde archivo: ' + ticket.numero, ticket.numero, ticket.telefono, '');
    mostrarAlerta('✅ Ticket restaurado a Aprobados.', 'exito');
    await cargarReservas();
    cargarAprobados();
    cargarArchivoTickets();
  } catch(e) { mostrarAlerta('❌ Error al restaurar: ' + (e.message || 'Desconocido'), 'error'); }
}

async function borrarTicketArchivado(id) {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionReal('🗑️ ¿Borrar permanentemente este ticket del archivo?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('archivo_tickets').select('*').eq('id', id).maybeSingle();
    var datos = (r.data && r.data.ticket_data) ? r.data.ticket_data : {};
    await supabaseClient.from('archivo_tickets').delete().eq('id', id);
    await registrarLog('borrar_archivo', 'Ticket eliminado permanentemente del archivo', datos.numero || '', datos.telefono || '', '');
    mostrarAlerta('✅ Ticket eliminado del archivo.', 'exito');
    cargarArchivoTickets();
  } catch(e) { mostrarAlerta('❌ Error al borrar: ' + (e.message || 'Desconocido'), 'error'); }
}

async function limpiarArchivoAutomatico() {
  if (document.hidden) return;
  if (!supabaseClient) return;
  try {
    var r = await supabaseClient.from('archivo_tickets').select('id,archivado_en,creado_en');
    if (r.error || !r.data || r.data.length === 0) return;
    var ahora = new Date();
    var borrados = 0;
    for (var i = 0; i < r.data.length; i++) {
      var a = r.data[i];
      var fechaStr = a.archivado_en || a.creado_en;
      if (!fechaStr) continue;
      var fechaArchivo = new Date(fechaStr);
      if (isNaN(fechaArchivo.getTime())) continue;
      var diferenciaHoras = (ahora - fechaArchivo) / 1000 / 60 / 60;
      if (diferenciaHoras > 24) {
        await supabaseClient.from('archivo_tickets').delete().eq('id', a.id);
        borrados++;
      }
    }
    if (borrados > 0) {
      console.log('🧹 Limpieza automática: ' + borrados + ' tickets viejos eliminados');
      await registrarLog('limpieza_archivo_auto', borrados + ' tickets viejos eliminados', '', '', '');
      if (document.getElementById('lista-archivo')) cargarArchivoTickets();
    }
  } catch(e) { console.warn('Error en limpieza automática:', e); }
}

async function exportarCSV() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  mostrarAlerta('⏳ Generando archivo Excel/CSV...', 'info');

  try {
    var r = await supabaseClient.from('reservas').select('nombre,telefono,numero,referencia,estado,turno,fecha,hora,codigo_ticket').order('fecha', { ascending: false });
    if (r.error || !r.data || r.data.length === 0) {
      mostrarAlerta('ℹ️ No hay tickets para exportar todavía.', 'info');
      return;
    }
    var csv = 'Nombre,Telefono,Numero,Referencia,Estado,Turno,Fecha,Hora,Codigo\n';
    r.data.forEach(function(t) {
      var nombre = (t.nombre || '').replace(/,/g, ' ').replace(/"/g, '""');
      var telefono = (t.telefono || '').replace(/,/g, ' ');
      var numero = t.numero || '';
      var ref = (t.referencia || '').replace(/,/g, ' ').replace(/"/g, '""');
      var estado = t.estado || '';
      var turno = t.turno === 'mediodia' ? 'Mediodia' : 'Noche';
      var fecha = t.fecha || '';
      var hora = t.hora || '';
      var codigo = t.codigo_ticket || '';
      csv += '"' + nombre + '","' + telefono + '","' + numero + '","' + ref + '","' + estado + '","' + turno + '","' + fecha + '","' + hora + '","' + codigo + '"\n';
    });
    var blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Tickets_LaRifita_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    await registrarLog('exportar_csv', 'Exportados ' + r.data.length + ' tickets', '', '', '');
  } catch(e) { mostrarAlerta('❌ Error al exportar: ' + (e.message || 'Desconocido'), 'error'); }
}

function iniciarAutoCierreTurnos() {
  setTimeout(function() { procesarAutoCierreTurnos(); }, 500);
  // Se verifica cada 10 segundos para que no se atrase
  setInterval(procesarAutoCierreTurnos, 10000);
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      setTimeout(function() { procesarAutoCierreTurnos(); }, 1000);
    }
  });
  window.addEventListener('focus', function() {
    setTimeout(function() { procesarAutoCierreTurnos(); }, 1000);
  });
}

async function procesarAutoCierreTurnos() {
  if (document.hidden) return;
  if (!supabaseClient) return;

  try {
    var ahora = new Date();
    var minutos = ahora.getHours() * 60 + ahora.getMinutes();
    var fechaHoy = obtenerFechaFormateada();

    try {
      var rConfig = await supabaseClient.from('configuracion').select('*');
      if (!rConfig.error && rConfig.data) {
        var configFresco = {};
        rConfig.data.forEach(function(c) { if (c && c.clave) configFresco[c.clave] = c.valor; });
        config = configFresco;
        localStorage.setItem('rifita_config_cache', JSON.stringify(config));
      }
    } catch(e) { console.warn('No se pudo recargar config:', e); }

    var mediodiaAbierto = config.turno_mediodia_abierto === 'true';
    var nocheAbierto = config.turno_noche_abierto === 'true';

    // APERTURA MEDIODÍA: 8:00 AM (480 min)
    if (minutos >= 8 * 60 && minutos < 13 * 60 && !mediodiaAbierto) {
      try {
        await supabaseClient.from('configuracion').upsert({ clave: 'turno_mediodia_abierto', valor: 'true' }, { onConflict: 'clave' });
        await supabaseClient.from('configuracion').upsert({ clave: 'motivo_cierre', valor: '' }, { onConflict: 'clave' });
        await cargarConfig();
        actualizarEstadoTurno();
        if (!turnoForzado) {
          turnoActual = 'mediodia';
          await cargarReservas();
          actualizarInterfazTurno();
        }
        console.log('⏰ Auto-Apertura: Mediodía ABIERTO (8:00 AM).');
      } catch(e) { console.error('Error auto-apertura mediodía:', e); }
    }

    // CIERRE MEDIODÍA: 1:00 PM (780 min)
    if (minutos >= 13 * 60 && mediodiaAbierto) {
      try {
        await supabaseClient.from('configuracion').upsert({ clave: 'turno_mediodia_abierto', valor: 'false' }, { onConflict: 'clave' });
        await supabaseClient.from('configuracion').upsert({ clave: 'motivo_cierre', valor: 'El turno Mediodía cerró a la 1:00 PM. Vuelve a las 3:00 PM.' }, { onConflict: 'clave' });
        await cargarConfig();
        actualizarEstadoTurno();
        console.log('⏰ Auto-Cierre: Mediodía CERRADO (1:00 PM).');
      } catch(e) { console.error('Error auto-cierre mediodía:', e); }
    }

    // APERTURA NOCHE: 3:00 PM (900 min)
    if (minutos >= 15 * 60 && minutos < 21 * 60 && !nocheAbierto) {
      try {
        await supabaseClient.from('configuracion').upsert({ clave: 'turno_noche_abierto', valor: 'true' }, { onConflict: 'clave' });
        await supabaseClient.from('configuracion').upsert({ clave: 'motivo_cierre', valor: '' }, { onConflict: 'clave' });
        await cargarConfig();
        actualizarEstadoTurno();
        if (!turnoForzado) {
          turnoActual = 'noche';
          await cargarReservas();
          actualizarInterfazTurno();
        }
        console.log('⏰ Auto-Apertura: Noche ABIERTA (3:00 PM).');
      } catch(e) { console.error('Error auto-apertura noche:', e); }
    }

    // CIERRE NOCHE: 9:00 PM (1260 min)
    if (minutos >= 21 * 60 && nocheAbierto) {
      try {
        await supabaseClient.from('configuracion').upsert({ clave: 'turno_noche_abierto', valor: 'false' }, { onConflict: 'clave' });
        await supabaseClient.from('configuracion').upsert({ clave: 'motivo_cierre', valor: 'El turno Noche cerró a las 9:00 PM. Vuelve mañana a las 8:00 AM.' }, { onConflict: 'clave' });
        await cargarConfig();
        actualizarEstadoTurno();
        console.log('⏰ Auto-Cierre: Noche CERRADA (9:00 PM).');
      } catch(e) { console.error('Error auto-cierre noche:', e); }
    }

    var claveLimpiezaMed = 'limpieza_total_mediodia_' + fechaHoy;
    if (minutos >= 14 * 60 && !localStorage.getItem(claveLimpiezaMed)) {
      try {
        await supabaseClient.from('reservas').delete().eq('turno', 'mediodia');
        localStorage.setItem(claveLimpiezaMed, 'true');
        if (turnoActual === 'mediodia') await cargarReservas();
        if (document.getElementById('lista-aprobados')) cargarAprobados();
        await registrarLog('limpieza_automatica_total', 'Cuadrícula MEDIODÍA vaciada (TODOS los estados borrados)', '', '', '');
        console.log('🧹 Limpieza TOTAL: MEDIODÍA vaciado (2:00 PM).');
      } catch(e) { console.error('Error limpieza mediodía:', e); }
    }

    var claveLimpiezaNoche = 'limpieza_total_noche_' + fechaHoy;
    if (minutos >= 23 * 60 + 30 && !localStorage.getItem(claveLimpiezaNoche)) {
      try {
        await supabaseClient.from('reservas').delete().eq('turno', 'noche');
        localStorage.setItem(claveLimpiezaNoche, 'true');
        if (turnoActual === 'noche') await cargarReservas();
        if (document.getElementById('lista-aprobados')) cargarAprobados();
        await registrarLog('limpieza_automatica_total', 'Cuadrícula NOCHE vaciada (TODOS los estados borrados)', '', '', '');
        console.log('🧹 Limpieza TOTAL: NOCHE vaciado (11:30 PM).');
      } catch(e) { console.error('Error limpieza noche:', e); }
    }
  } catch(e) {
    console.error('Error general en auto-cierre de turnos:', e);
  }
}

function iniciarLimpiezaDiaria() {
  setInterval(async function() {
    if (document.hidden) return;
    var ahora = new Date();
    var hora = ahora.getHours();
    var minutos = ahora.getMinutes();
    var fechaHoy = obtenerFechaFormateada();
    var ultimaLimpieza = localStorage.getItem('ultima_limpieza_fecha') || '';
    if (hora === 7 && minutos >= 0 && minutos <= 5 && ultimaLimpieza !== fechaHoy) {
      await limpiarResultadosDelDia();
      localStorage.setItem('ultima_limpieza_fecha', fechaHoy);
    }
  }, 60000);
}

async function limpiarResultadosDelDia() {
  try {
    if (!supabaseClient) return;
    var fijoMed = config.fijo_mediodia || '';
    var fijoNoche = config.fijo_noche || '';
    var ganMed = config.ganador_mediodia || '';
    var ganNoche = config.ganador_noche || '';
    if (!fijoMed && !fijoNoche && !ganMed && !ganNoche) return;

    await supabaseClient.from('configuracion').update({ valor: '' }).eq('clave', 'fijo_mediodia');
    await supabaseClient.from('configuracion').update({ valor: '' }).eq('clave', 'fijo_noche');
    await supabaseClient.from('configuracion').update({ valor: '' }).eq('clave', 'ganador_mediodia');
    await supabaseClient.from('configuracion').update({ valor: '' }).eq('clave', 'ganador_noche');
    await cargarConfig();
    actualizarResultadoEnPantalla();
    await registrarLog('limpieza_automatica', 'Resultados limpiados (mediodía + noche)', '', '', '');
  } catch (e) { console.error('❌ Error en limpieza:', e); }
}

async function limpiarResultadosManual() {
  if (!esAdmin) return;
  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Limpiar los resultados de HOY?');
  if (!confirmado) return;
  await limpiarResultadosDelDia();
  mostrarAlerta('✅ Resultados limpiados.', 'exito');
  refrescarPanelAdmin();
}

// ============================================
// FIN BLOQUE 13 — Continúa en Bloque 14
// ============================================// ============================================
// BLOQUE 14: CONFIG ADMIN + BOTE VISUAL + FIJOS + PUBLICAR + CERRAR/ABRIR TURNO
// ============================================

function mostrarModalCompartir(texto) {
  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-compartir-texto';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700; text-align: center;">' +
    '<h2 style="color:#FFD700;">📲 Mensaje para el Grupo</h2>' +
    '<p style="font-size:12px; color:#fff; margin-bottom:10px;">Toca "Copiar y Abrir WhatsApp". Si no se abre, pega el texto manualmente.</p>' +
    '<textarea id="texto-compartir" style="width:100%; height:150px; padding:10px; border-radius:10px; border:2px solid #FFD700; background:rgba(255,255,255,0.1); color:#fff; font-size:14px; margin-bottom:15px;" readonly>' + escapeHtml(texto || '') + '</textarea>' +
    '<div class="modal-botones" style="flex-direction:column; gap:10px;">' +
    '<button class="btn-aceptar" style="background:#25D366; color:#fff; font-weight:bold;" onclick="copiarYCompartirWA()">📲 Copiar y Abrir WhatsApp</button>' +
    '<button class="btn-cancelar" style="background:rgba(255,255,255,0.2); color:#fff;" onclick="var m=document.getElementById(\'modal-compartir-texto\'); if(m) m.remove();">Cerrar</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

function copiarYCompartirWA() {
  var textarea = document.getElementById('texto-compartir');
  var texto = textarea ? textarea.value : '';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(function() {
      window.open('https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4', '_blank');
    }).catch(function() {
      window.open('https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4', '_blank');
    });
  } else {
    window.open('https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4', '_blank');
  }
}

function compartirMensajeAutomatico(msg) { mostrarModalCompartir(msg); }

async function guardarConfig() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var precioEl = document.getElementById('config-precio');
  var premioEl = document.getElementById('config-premio');
  var metaEl = document.getElementById('config-meta');
  var modoEl = document.getElementById('config-modo');
  var boteEl = document.getElementById('config-bote-visual');

  var pr = precioEl ? precioEl.value.trim() : '';
  var pm = premioEl ? premioEl.value.trim() : '';
  var meta = metaEl ? metaEl.value.trim() : '3000';
  var modo = modoEl ? modoEl.value : 'actual';
  var boteVisual = boteEl ? boteEl.value.trim() : '250';

  if (!pr || !pm) { mostrarAlerta('⚠️ Precio y premio son obligatorios', 'error'); return; }

  var prNum = parseInt(pr);
  var pmNum = parseInt(pm);
  if (isNaN(prNum) || prNum < 0) { mostrarAlerta('⚠️ El precio debe ser un número válido.', 'error'); return; }
  if (isNaN(pmNum) || pmNum < 0) { mostrarAlerta('⚠️ El premio debe ser un número válido.', 'error'); return; }

  try {
    if (modo === 'ambos') {
      await supabaseClient.from('configuracion').upsert({ clave: 'precio_mediodia', valor: String(prNum) }, { onConflict: 'clave' });
      await supabaseClient.from('configuracion').upsert({ clave: 'precio_noche', valor: String(prNum) }, { onConflict: 'clave' });
      await supabaseClient.from('configuracion').upsert({ clave: 'premio_mediodia', valor: String(pmNum) }, { onConflict: 'clave' });
      await supabaseClient.from('configuracion').upsert({ clave: 'premio_noche', valor: String(pmNum) }, { onConflict: 'clave' });
      await registrarLog('guardar_config', 'GLOBAL - ' + prNum + '/' + pmNum, '', '', '');
    } else {
      var cPr = turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche';
      var cPm = turnoActual === 'mediodia' ? 'premio_mediodia' : 'premio_noche';
      await supabaseClient.from('configuracion').upsert({ clave: cPr, valor: String(prNum) }, { onConflict: 'clave' });
      await supabaseClient.from('configuracion').upsert({ clave: cPm, valor: String(pmNum) }, { onConflict: 'clave' });
    }

    if (meta) {
      var metaNum = parseInt(meta);
      if (!isNaN(metaNum) && metaNum > 0) {
        await supabaseClient.from('configuracion').upsert({ clave: 'meta_diaria', valor: String(metaNum) }, { onConflict: 'clave' });
      }
    }

    if (boteVisual !== '' && boteVisual !== undefined && boteVisual !== null) {
      var boteNum = parseInt(boteVisual);
      if (!isNaN(boteNum)) {
        await supabaseClient.from('configuracion').upsert({ clave: 'bote_visual', valor: String(boteNum) }, { onConflict: 'clave' });
      }
    }

    await cargarConfig();
    actualizarPreciosEnPantalla();
    actualizarResultadoEnPantalla();
    mostrarAlerta(modo === 'ambos' ? '✅ Guardado en AMBOS turnos' : '✅ Guardado', 'exito');
    refrescarPanelAdmin();
  } catch(e) {
    mostrarAlerta('❌ Error al guardar: ' + (e.message || 'Desconocido'), 'error');
    console.error(e);
  }
}

async function guardarBoteVisual() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var boteEl = document.getElementById('config-bote-visual');
  if (!boteEl) return;
  var bote = boteEl.value.trim();
  var boteInt = parseInt(bote);
  if (isNaN(boteInt) || boteInt < 0) {
    mostrarAlerta('⚠️ Ingresa un monto válido. Usa 0 para ocultar el banner.', 'error');
    return;
  }

  try {
    await supabaseClient.from('configuracion').upsert({ clave: 'bote_visual', valor: String(boteInt) }, { onConflict: 'clave' });
    await cargarConfig();

    var contenedorBote = document.getElementById('contenedor-bote') || document.getElementById('bote-visual-container');
    var boteVisual = document.getElementById('texto-bote') || document.getElementById('bote-visual-monto');
    if (contenedorBote) {
      if (boteInt > 0) {
        contenedorBote.style.display = 'block';
        if (boteVisual) boteVisual.textContent = boteInt + ' CUP';
      } else {
        contenedorBote.style.display = 'none';
      }
    }
    if (boteInt === 0) mostrarAlerta('✅ Bote visual OCULTADO.', 'exito');
    else mostrarAlerta('✅ Bote visual actualizado a ' + boteInt + ' CUP.', 'exito');
    refrescarPanelAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function guardarFijoMediodia() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var fijoEl = document.getElementById('config-fijo-mediodia');
  if (!fijoEl) { mostrarAlerta('❌ No se encontró el input del fijo.', 'error'); return; }
  var fijo = fijoEl.value.trim();
  if (!fijo || fijo.length !== 2) { mostrarAlerta('⚠️ El fijo debe tener 2 dígitos', 'error'); return; }

  var btn = (typeof event !== 'undefined' && event.target) ? event.target : null;
  if (!btn) btn = document.querySelector('button[onclick*="guardarFijoMediodia"]');
  var textoOriginal = btn ? btn.innerHTML : '💾 Guardar Fijo';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Guardando...'; }

  try {
    var ganador = null;
    Object.keys(reservas).forEach(function(num) { if (num === fijo) ganador = reservas[num]; });

    await supabaseClient.from('configuracion').upsert({ clave: 'fijo_mediodia', valor: fijo }, { onConflict: 'clave' });
    var premioTotal = parseInt((config && config.premio_mediodia) || '250');
    if (isNaN(premioTotal)) premioTotal = 250;

    if (ganador) {
      await supabaseClient.from('configuracion').upsert({ clave: 'ganador_mediodia', valor: ganador.nombre }, { onConflict: 'clave' });
      try {
        // Forzar el mensaje a MEDIODÍA
        await supabaseClient.from('chat').insert([{
          usuario: '🤖 SISTEMA',
          telefono: '0000',
          mensaje: '🏆 ¡TENEMOS GANADOR EN MEDIODÍA! 🏆\n\n👤 Ganador: ' + ganador.nombre + '\n📱 Teléfono: ' + ganador.telefono + '\n🔢 Número jugado: ' + fijo + '\n🎟️ Código: ' + ganador.codigo_ticket + '\n📅 Fecha: ' + ganador.fecha + '\n⏰ Hora: ' + ganador.hora + '\n💰 Premio: ' + premioTotal + ' CUP\n\n¡Felicidades! 🎉',
          es_admin: true
        }]);
      } catch(e) { console.warn('Error enviando mensaje al chat:', e); }
    } else {
      await supabaseClient.from('configuracion').upsert({ clave: 'ganador_mediodia', valor: 'Sin ganador' }, { onConflict: 'clave' });
      mostrarAlerta('😢 Nadie ganó. El premio de ' + premioTotal + ' CUP se mantiene igual para el próximo sorteo.', 'info');
    }

    var horaPublicacion = new Date().toISOString();
    var fechaHoy = obtenerFechaFormateada();

    var checkMed = await supabaseClient.from('historial_fijos').select('id').eq('fecha', fechaHoy).eq('turno', 'mediodia');
    if (!checkMed.data || checkMed.data.length === 0) {
      await supabaseClient.from('historial_fijos').insert([{
        fecha: fechaHoy,
        anio: new Date().getFullYear().toString(),
        turno: 'mediodia',
        fijo: fijo,
        premio: premioTotal.toString(),
        ganador_nombre: ganador ? ganador.nombre : 'Sin ganador',
        ganador_telefono: ganador ? ganador.telefono : null,
        hora: ganador ? ganador.hora : '',
        codigo_ticket: ganador ? ganador.codigo_ticket : '',
        pagado: false,
        publicado_en: horaPublicacion
      }]);
    } else {
      await supabaseClient.from('historial_fijos').update({
        fijo: fijo,
        premio: premioTotal.toString(),
        ganador_nombre: ganador ? ganador.nombre : 'Sin ganador',
        ganador_telefono: ganador ? ganador.telefono : null,
        hora: ganador ? ganador.hora : '',
        codigo_ticket: ganador ? ganador.codigo_ticket : '',
        publicado_en: horaPublicacion
      }).eq('fecha', fechaHoy).eq('turno', 'mediodia');
    }

    await cargarConfig();
    await cargarChatWa();
    actualizarResultadoEnPantalla();
    await cargarNotificaciones();
    await registrarLog('guardar_fijo', 'MEDIODÍA - Fijo: ' + fijo, fijo, ganador ? ganador.telefono : '', premioTotal.toString());

    var historialSec = document.getElementById('historial');
    if (historialSec && historialSec.classList.contains('activa')) {
      cargarHistorialFiltrado();
    }

    mostrarAlerta('✅ Fijo MEDIODÍA: ' + fijo + (ganador ? '\n🏆 ' + ganador.nombre : '\n😢 Nadie'), 'exito');
    refrescarPanelAdmin();
  } catch(e) {
    console.error('Error guardando fijo mediodía:', e);
    mostrarAlerta('❌ Error al guardar: ' + (e.message || 'Desconocido'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
  }
}

async function guardarFijoNoche() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var fijoEl = document.getElementById('config-fijo-noche');
  if (!fijoEl) { mostrarAlerta('❌ No se encontró el input del fijo.', 'error'); return; }
  var fijo = fijoEl.value.trim();
  if (!fijo || fijo.length !== 2) { mostrarAlerta('⚠️ El fijo debe tener 2 dígitos', 'error'); return; }

  var btn = (typeof event !== 'undefined' && event.target) ? event.target : null;
  if (!btn) btn = document.querySelector('button[onclick*="guardarFijoNoche"]');
  var textoOriginal = btn ? btn.innerHTML : '💾 Guardar Fijo';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Guardando...'; }

  try {
    var ganador = null;
    Object.keys(reservas).forEach(function(num) { if (num === fijo) ganador = reservas[num]; });

    await supabaseClient.from('configuracion').upsert({ clave: 'fijo_noche', valor: fijo }, { onConflict: 'clave' });
    var premioTotal = parseInt((config && config.premio_noche) || '250');
    if (isNaN(premioTotal)) premioTotal = 250;

    if (ganador) {
      await supabaseClient.from('configuracion').upsert({ clave: 'ganador_noche', valor: ganador.nombre }, { onConflict: 'clave' });
      try {
        // Forzar el mensaje a NOCHE
        await supabaseClient.from('chat').insert([{
          usuario: '🤖 SISTEMA',
          telefono: '0000',
          mensaje: '🏆 ¡TENEMOS GANADOR EN NOCHE! 🏆\n\n👤 Ganador: ' + ganador.nombre + '\n📱 Teléfono: ' + ganador.telefono + '\n🔢 Número jugado: ' + fijo + '\n🎟️ Código: ' + ganador.codigo_ticket + '\n📅 Fecha: ' + ganador.fecha + '\n⏰ Hora: ' + ganador.hora + '\n💰 Premio: ' + premioTotal + ' CUP\n\n¡Felicidades! 🎉',
          es_admin: true
        }]);
      } catch(e) { console.warn('Error enviando mensaje al chat:', e); }
    } else {
      await supabaseClient.from('configuracion').upsert({ clave: 'ganador_noche', valor: 'Sin ganador' }, { onConflict: 'clave' });
      mostrarAlerta('😢 Nadie ganó. El premio de ' + premioTotal + ' CUP se mantiene igual para el próximo sorteo.', 'info');
    }

    var horaPublicacion = new Date().toISOString();
    var fechaHoy = obtenerFechaFormateada();

    var checkNoche = await supabaseClient.from('historial_fijos').select('id').eq('fecha', fechaHoy).eq('turno', 'noche');
    if (!checkNoche.data || checkNoche.data.length === 0) {
      await supabaseClient.from('historial_fijos').insert([{
        fecha: fechaHoy,
        anio: new Date().getFullYear().toString(),
        turno: 'noche',
        fijo: fijo,
        premio: premioTotal.toString(),
        ganador_nombre: ganador ? ganador.nombre : 'Sin ganador',
        ganador_telefono: ganador ? ganador.telefono : null,
        hora: ganador ? ganador.hora : '',
        codigo_ticket: ganador ? ganador.codigo_ticket : '',
        pagado: false,
        publicado_en: horaPublicacion
      }]);
    } else {
      await supabaseClient.from('historial_fijos').update({
        fijo: fijo,
        premio: premioTotal.toString(),
        ganador_nombre: ganador ? ganador.nombre : 'Sin ganador',
        ganador_telefono: ganador ? ganador.telefono : null,
        hora: ganador ? ganador.hora : '',
        codigo_ticket: ganador ? ganador.codigo_ticket : '',
        publicado_en: horaPublicacion
      }).eq('fecha', fechaHoy).eq('turno', 'noche');
    }

    await cargarConfig();
    await cargarChatWa();
    actualizarResultadoEnPantalla();
    await cargarNotificaciones();
    await registrarLog('guardar_fijo', 'NOCHE - Fijo: ' + fijo, fijo, ganador ? ganador.telefono : '', premioTotal.toString());

    var historialSec = document.getElementById('historial');
    if (historialSec && historialSec.classList.contains('activa')) {
      cargarHistorialFiltrado();
    }

    mostrarAlerta('✅ Fijo NOCHE: ' + fijo + (ganador ? '\n🏆 ' + ganador.nombre : '\n😢 Nadie'), 'exito');
    refrescarPanelAdmin();
  } catch(e) {
    console.error('Error guardando fijo noche:', e);
    mostrarAlerta('❌ Error al guardar: ' + (e.message || 'Desconocido'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
  }
}

async function publicarResultadoMediodia() {
  if (!esAdmin) return;
  var fijoEl = document.getElementById('config-fijo-mediodia');
  var fijo = (config && config.fijo_mediodia) || (fijoEl ? fijoEl.value : '');
  if (!fijo) { mostrarAlerta('⚠️ Guarda el fijo primero', 'error'); return; }

  var premio = (config && config.premio_mediodia) || '250';
  var ganador = null;
  Object.keys(reservas).forEach(function(num) { if (num === fijo) ganador = reservas[num]; });

  var boteVisual = parseInt((config && config.bote_visual) || '250');
  var textoPremio = (boteVisual > 250) ? 'El premio se acumula' : 'El premio se mantiene';

  var msg = '🏆 RESULTADO ☀️ MEDIODÍA - LA RIFITA CUBANA\n\n📅 ' + obtenerFechaFormateada() + '\n🎯 FIJO GANADOR: ' + fijo + '\n';
  if (ganador) {
    msg += '👤 Ganador: ' + ganador.nombre + '\n💰 Premio: ' + premio + ' CUP\n\n¡Felicidades! 🎉';
  } else {
    msg += '\n😢 Nadie acertó\n' + textoPremio;
  }
  msg += '\n\n🇨🇺 La Rifita Cubana';

  try {
    if (supabaseClient) {
      await supabaseClient.from('chat').insert([{
        usuario: '🤖 SISTEMA',
        telefono: '0000',
        mensaje: msg,
        es_admin: true
      }]);
      await cargarChatWa();
    }
    if (navigator.clipboard) { try { await navigator.clipboard.writeText(msg); } catch(e) {} }
    setTimeout(function() {
      window.open('https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4', '_blank');
    }, 700);
    mostrarAlerta('✅ Enviado al Chat de la App.\n📋 Texto copiado. En el grupo: Mantén presionado → Pegar → Enviar.', 'exito');
  } catch(e) { mostrarAlerta('❌ Error al publicar: ' + (e.message || 'Desconocido'), 'error'); }
}

async function publicarResultadoNoche() {
  if (!esAdmin) return;
  var fijoEl = document.getElementById('config-fijo-noche');
  var fijo = (config && config.fijo_noche) || (fijoEl ? fijoEl.value : '');
  if (!fijo) { mostrarAlerta('⚠️ Guarda el fijo primero', 'error'); return; }

  var premio = (config && config.premio_noche) || '250';
  var ganador = null;
  Object.keys(reservas).forEach(function(num) { if (num === fijo) ganador = reservas[num]; });

  var boteVisual = parseInt((config && config.bote_visual) || '250');
  var textoPremio = (boteVisual > 250) ? 'El premio se acumula' : 'El premio se mantiene';

  var msg = '🏆 RESULTADO 🌙 NOCHE - LA RIFITA CUBANA\n\n📅 ' + obtenerFechaFormateada() + '\n🎯 FIJO GANADOR: ' + fijo + '\n';
  if (ganador) {
    msg += '👤 Ganador: ' + ganador.nombre + '\n💰 Premio: ' + premio + ' CUP\n\n¡Felicidades! 🎉';
  } else {
    msg += '\n😢 Nadie acertó\n' + textoPremio;
  }
  msg += '\n\n🇨🇺 La Rifita Cubana';

  try {
    if (supabaseClient) {
      await supabaseClient.from('chat').insert([{
        usuario: '🤖 SISTEMA',
        telefono: '0000',
        mensaje: msg,
        es_admin: true
      }]);
      await cargarChatWa();
    }
    if (navigator.clipboard) { try { await navigator.clipboard.writeText(msg); } catch(e) {} }
    setTimeout(function() {
      window.open('https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4', '_blank');
    }, 700);
    mostrarAlerta('✅ Enviado al Chat de la App.\n📋 Texto copiado. En el grupo: Mantén presionado → Pegar → Enviar.', 'exito');
  } catch(e) { mostrarAlerta('❌ Error al publicar: ' + (e.message || 'Desconocido'), 'error'); }
}

function cerrarTurno() {
  if (!esAdmin) return;
  var existente = document.getElementById('modal-cerrar-turno');
  if (existente) existente.remove();

  var nT = turnoActual === 'mediodia' ? 'Mediodía' : 'Noche';
  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-cerrar-turno';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700;">' +
    '<h2>🔴 Cerrar Turno ' + nT + '</h2>' +
    '<label>📝 Motivo del cierre:</label>' +
    '<input type="text" id="motivo-cierre-input" value="Disculpe las molestias. Volvemos pronto.">' +
    '<div class="modal-botones">' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-cerrar-turno\'); if(m) m.remove();">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="confirmarCerrarTurno()">Cerrar Turno</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

async function confirmarCerrarTurno() {
  if (!esAdmin) return;
  var msgEl = document.getElementById('motivo-cierre-input');
  var msg = msgEl ? msgEl.value.trim() : '';
  if (!msg) { mostrarAlerta('Escribe un motivo', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var modalCerrar = document.getElementById('modal-cerrar-turno');
  if (modalCerrar) modalCerrar.remove();

  var nT = turnoActual === 'mediodia' ? 'Mediodía' : 'Noche';
  var cl = turnoActual === 'mediodia' ? 'turno_mediodia_abierto' : 'turno_noche_abierto';

  try {
    await supabaseClient.from('configuracion').upsert({ clave: cl, valor: 'false' }, { onConflict: 'clave' });
    await supabaseClient.from('configuracion').upsert({ clave: 'motivo_cierre', valor: msg }, { onConflict: 'clave' });
    await registrarLog('cerrar_turno', 'Motivo: ' + msg, '', '', '');
    await cargarConfig();
    actualizarEstadoTurno();
    refrescarPanelAdmin();

    var textoWA = '⚠️ AVISO - LA RIFITA CUBANA\n\nEl turno ' + nT + ' ha sido cerrado.\n\n📌 Motivo: ' + msg + '\n\nDisculpe las molestias.';
    mostrarModalCompartir(textoWA);
  } catch (e) { mostrarAlerta('❌ Error al cerrar turno: ' + (e.message || 'Desconocido'), 'error'); }
}

async function abrirTurno() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var nT = turnoActual === 'mediodia' ? 'Mediodía' : 'Noche';
  var confirmado = await mostrarConfirmacionCustom('¿Abrir el turno ' + nT + '?');
  if (!confirmado) return;

  var cl = turnoActual === 'mediodia' ? 'turno_mediodia_abierto' : 'turno_noche_abierto';

  try {
    await supabaseClient.from('configuracion').upsert({ clave: cl, valor: 'true' }, { onConflict: 'clave' });
    await supabaseClient.from('configuracion').upsert({ clave: 'motivo_cierre', valor: '' }, { onConflict: 'clave' });
    await registrarLog('abrir_turno', 'Turno reabierto', '', '', '');
    await cargarConfig();
    actualizarEstadoTurno();
    refrescarPanelAdmin();

    var textoWA = '🟢 AVISO - LA RIFITA CUBANA\n\nEl turno ' + nT + ' ha sido abierto.\n\n¡Ya pueden jugar! 🎲';
    mostrarModalCompartir(textoWA);
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

// ============================================
// FIN BLOQUE 14 — Continúa en Bloque 15
// ============================================// ============================================
// BLOQUE 15: ADMIN BÁSICO
// ============================================

async function confirmarPago(numero) {
  if (!esAdmin && !trabajadorActual) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  if (reservas[numero] && reservas[numero].estado === 'pagado') {
    mostrarAlerta('🚫 ESTE NÚMERO YA ESTÁ PAGADO.\n\nSi ves dos tickets con el mismo número, es un error de la base de datos. No lo apruebes de nuevo.', 'error');
    return;
  }

  try {
    var fecha = obtenerFechaFormateada();
    var hora = obtenerHora12();

    // Obtener datos actuales del ticket para archivarlo ANTES de cambiar el estado
    var ticketData = await supabaseClient.from('reservas').select('*').eq('numero', numero).eq('turno', turnoActual).maybeSingle();
    if (ticketData.error || !ticketData.data) throw new Error('Ticket no encontrado');

    // Guardar en el archivo automáticamente
    await supabaseClient.from('archivo_tickets').insert([{
      ticket_data: ticketData.data,
      borrado_por: localStorage.getItem('mi_nombre') || 'Admin (Aprobado)'
    }]);

    var r = await supabaseClient.from('reservas').update({
      estado: 'pagado',
      fecha_aprobado: fecha,
      hora_aprobado: hora,
      revisar_admin: false
    }).eq('numero', numero).eq('turno', turnoActual);

    if (r.error) {
      console.error('❌ Error al aprobar pago:', r.error);
      mostrarAlerta('❌ Error al aprobar el ticket.\n\nDetalle: ' + r.error.message, 'error');
      return;
    }

    var res = reservas[numero];
    await registrarLog('confirmar_pago', 'Pago confirmado y archivado', numero, res ? res.telefono : '', '');

    if (res && res.telefono) {
      try {
        await supabaseClient.from('avisos').insert([{
          telefono_destino: res.telefono,
          mensaje: '✅ ¡Tu pago para el número ' + numero + ' ha sido APROBADO! Ya estás participando. ¡Mucha suerte! 🍀',
          tipo: 'exito',
          leido: false
        }]);
      } catch(e) { console.warn('Error enviando aviso:', e); }
    }

    await cargarReservas();
    refrescarPanelAdmin();
  } catch(e) {
    console.error('Error en confirmarPago:', e);
    mostrarAlerta('❌ Error inesperado: ' + (e.message || 'Desconocido'), 'error');
  }
}

async function rechazarPago(numero) {
  if (!esAdmin && !trabajadorActual) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('¿Denegar y liberar el número ' + numero + '?');
  if (!confirmado) return;

  try {
    var res = reservas[numero];
    var r = await supabaseClient.from('reservas').delete().eq('numero', numero).eq('turno', turnoActual);
    if (r.error) { mostrarAlerta('❌ Error al rechazar', 'error'); return; }

    await registrarLog('rechazar_pago', 'Liberado', numero, res ? res.telefono : '', '');
    await cargarReservas();
    refrescarPanelAdmin();
  } catch(e) {
    console.error('Error en rechazarPago:', e);
    mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error');
  }
}

async function liberarNumero(numero) {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('🔓 ¿Liberar el número ' + numero + '? El jugador perderá su reserva y otro podrá tomarlo.');
  if (!confirmado) return;

  try {
    var res = reservas[numero];
    var r = await supabaseClient.from('reservas').delete().eq('numero', numero).eq('turno', turnoActual);
    if (r.error) { mostrarAlerta('❌ Error', 'error'); return; }

    await registrarLog('liberar_numero', 'Número liberado manualmente por admin', numero, res ? res.telefono : '', '');

    if (res && res.telefono) {
      try {
        await supabaseClient.from('avisos').insert([{
          telefono_destino: res.telefono,
          mensaje: '⚠️ Tu reserva para el número ' + numero + ' ha sido LIBERADA por el administrador. Si fue un error, por favor contacta a soporte.',
          tipo: 'alerta',
          leido: false
        }]);
      } catch(e) { console.warn('Error enviando aviso:', e); }
    }

    mostrarAlerta('✅ Número ' + numero + ' liberado correctamente.', 'exito');
    await cargarReservas();
    refrescarPanelAdmin();
  } catch(e) {
    console.error('Error en liberarNumero:', e);
    mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error');
  }
}

function abrirModalLiberarNumero() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-liberar-numero');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-liberar-numero';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FF9800;">' +
    '<h2 style="color:#FF9800; text-align:center;">🔓 Liberar Número</h2>' +
    '<p style="font-size:13px; color:rgba(255,255,255,0.8); text-align:center; margin-bottom:15px;">' +
    'Se liberará el número en el <strong>turno actual (' + (turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche') + ')</strong> sin importar su estado.' +
    '</p>' +
    '<label>🔢 Número a liberar (00-99):</label>' +
    '<input type="text" id="liberar-numero-input" placeholder="Ej: 45" maxlength="2" inputmode="numeric" pattern="[0-9]*" style="width:100%; padding:14px; border-radius:10px; border:2px solid #FF9800; background:rgba(255,255,255,0.1); color:#fff; font-size:22px; font-weight:bold; text-align:center; letter-spacing:4px; margin-bottom:15px;">' +
    '<div style="background:rgba(255,152,0,0.15); border:1px solid #FF9800; border-radius:10px; padding:12px; margin-bottom:15px; font-size:12px; color:#FF9800; font-weight:bold; text-align:center;">' +
    '⚠️ Esta acción NO se puede deshacer.' +
    '</div>' +
    '<div class="modal-botones">' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-liberar-numero\'); if(m) m.remove();">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="ejecutarLiberarNumeroManual()" style="background:#FF9800; color:#fff;">🔓 Liberar</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);

  setTimeout(function() {
    var input = document.getElementById('liberar-numero-input');
    if (input) input.focus();
  }, 200);
}

async function ejecutarLiberarNumeroManual() {
  var input = document.getElementById('liberar-numero-input');
  if (!input) return;

  var numeroStr = input.value.trim();
  if (!numeroStr || numeroStr.length === 0) { mostrarAlerta('⚠️ Debes escribir un número entre 00 y 99.', 'error'); return; }

  var numeroInt = parseInt(numeroStr);
  if (isNaN(numeroInt) || numeroInt < 0 || numeroInt > 99) { mostrarAlerta('⚠️ Número inválido.', 'error'); return; }

  var numero = numeroInt.toString().padStart(2, '0');
  var res = reservas[numero];

  if (!res) { mostrarAlerta('ℹ️ El número ' + numero + ' ya está libre.', 'info'); return; }

  var estadoTexto = res.estado === 'temporal' ? '⏳ Temporal' : (res.estado === 'ocupado' ? '⏰ Ocupado' : '✅ Pagado');
  var confirmado = await mostrarConfirmacionCustom('🔓 ¿Liberar el número ' + numero + '?\n\n👤 Jugador: ' + res.nombre + '\n📱 Teléfono: ' + res.telefono + '\n📊 Estado: ' + estadoTexto);
  if (!confirmado) return;

  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  try {
    var r = await supabaseClient.from('reservas').delete().eq('numero', numero).eq('turno', turnoActual);
    if (r.error) throw r.error;

    await registrarLog('liberar_numero', 'Número liberado manualmente (' + estadoTexto + ')', numero, res.telefono, '');

    if (res.telefono) {
      try {
        await supabaseClient.from('avisos').insert([{
          telefono_destino: res.telefono,
          mensaje: '⚠️ Tu reserva para el número ' + numero + ' ha sido LIBERADA por el administrador.',
          tipo: 'alerta',
          leido: false
        }]);
      } catch(e) {}
    }

    mostrarAlerta('✅ Número ' + numero + ' liberado.', 'exito');

    var modal = document.getElementById('modal-liberar-numero');
    if (modal) modal.remove();

    await cargarReservas();
    if (typeof cargarAprobados === 'function') cargarAprobados();
    if (typeof refrescarPanelAdmin === 'function') refrescarPanelAdmin();
  } catch(e) { mostrarAlerta('❌ Error al liberar: ' + (e.message || 'Desconocido'), 'error'); }
}

async function regenerarTodo() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var turnoTxt = turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche';
  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿LIMPIAR TODA LA CUADRÍCULA del turno ' + turnoTxt + '?\n\n🚨 ESTO BORRA temporales, ocupados y pagados.\n\n✅ TODOS LOS NÚMEROS QUEDARÁN LIBRES.');
  if (!confirmado) return;

  var confirmado2 = await mostrarConfirmacionCustom('🚨 CONFIRMACIÓN FINAL\n\n¿Estás COMPLETAMENTE SEGURO?');
  if (!confirmado2) return;

  try {
    var r = await supabaseClient.from('reservas').delete().eq('turno', turnoActual);
    if (r.error) throw r.error;

    await registrarLog('regenerar', 'Cuadrícula vaciada MANUALMENTE', '', '', '');
    await cargarReservas();
    if (typeof cargarAprobados === 'function') cargarAprobados();
    if (typeof cargarTickets === 'function') cargarTickets();
    refrescarPanelAdmin();
    mostrarAlerta('✅ Cuadrícula vaciada.', 'exito');
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function borrarTodoChat() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Borrar TODOS los mensajes?');
  if (!confirmado) return;
  var confirmado2 = await mostrarConfirmacionCustom('⚠️ ¿ESTÁS SEGURO?');
  if (!confirmado2) return;

  try {
    var r = await supabaseClient.from('chat').delete().neq('id', 0);
    if (r.error) { mostrarAlerta('❌ Error', 'error'); return; }

    await registrarLog('borrar_todo_chat', 'Chat completo eliminado', '', '', '');
    mostrarAlerta('✅ Chat borrado', 'exito');
    await cargarChatWa();
    refrescarPanelAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function bloquear(telefono) {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var motivo = await mostrarPromptCustom('¿Motivo del bloqueo?', 'Fraude');
  if (motivo === null) return;

  try {
    var r = await supabaseClient.from('bloqueados').insert([{ telefono: telefono, motivo: motivo }]);
    if (r.error) { mostrarAlerta('❌ Error: ' + r.error.message, 'error'); return; }

    await cargarBloqueados();
    await registrarLog('bloquear', 'Motivo: ' + motivo, '', telefono, '');
    mostrarAlerta('🚫 Bloqueado: ' + telefono, 'exito');
    refrescarPanelAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function desbloquear(telefono) {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('¿Desbloquear ' + telefono + '?');
  if (!confirmado) return;

  try {
    await supabaseClient.from('bloqueados').delete().eq('telefono', telefono);
    await cargarBloqueados();
    await registrarLog('desbloquear', 'Desbloqueado', '', telefono, '');
    mostrarAlerta('🔓 Desbloqueado', 'exito');
    refrescarPanelAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function verBloqueados() {
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var existente = document.getElementById('modal-bloqueados');
  if (existente) existente.remove();

  try {
    var r = await supabaseClient.from('bloqueados').select('*');
    var lista = '';
    if (r.data && r.data.length > 0) {
      r.data.forEach(function(b) {
        var telEsc = escapeHtml(b.telefono || 'N/A');
        var motivoEsc = escapeHtml(b.motivo || 'Sin motivo');

        // Se mantiene el formato original del teléfono (con el +) para que coincida en la BD
        var telAttr = b.telefono || '';

        lista += '<div class="reserva-item">' +
          '<p>📱 ' + telEsc + '</p>' +
          '<p>📝 ' + motivoEsc + '</p>' +
          '<button class="btn-confirmar" onclick="desbloquear(\'' + telAttr + '\')">🔓 Desbloquear</button>' +
          '</div>';
      });
    } else {
      lista = '<p style="text-align:center;padding:20px;">No hay bloqueados</p>';
    }

    var m = document.createElement('div');
    m.className = 'modal';
    m.id = 'modal-bloqueados';
    m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700;">' +
      '<h2>🚫 BLOQUEADOS (' + (r.data ? r.data.length : 0) + ')</h2>' +
      '<button class="btn-cerrar-admin" onclick="var m=document.getElementById(\'modal-bloqueados\'); if(m) m.remove();">✖</button>' +
      '<div style="margin-top:20px;">' + lista + '</div>' +
      '</div>';
    document.body.appendChild(m);
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function borrarEstadisticasDelDia() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var hoy = obtenerFechaFormateada();
  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Borrar SOLO el registro guardado del ' + hoy + '?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('recaudacion').delete().eq('fecha', hoy);
    if (r.error) { mostrarAlerta('❌ Error: ' + r.error.message, 'error'); return; }
    mostrarAlerta('✅ Registro de recaudación borrado.', 'exito');
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function guardarRecaudacionDelDia() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  try {
    var hoy = obtenerFechaFormateada();
    var rHoy = await supabaseClient.from('reservas').select('estado').eq('fecha', hoy);
    var datos = (rHoy && rHoy.data) ? rHoy.data : [];
    var pag = datos.filter(function(x) { return x.estado === 'pagado'; }).length;
    var precio = parseInt((config && config.precio_mediodia) || '50');
    if (isNaN(precio)) precio = 50;
    var recaudado = pag * precio;

    await supabaseClient.from('recaudacion').insert([{
      fecha: hoy,
      turno: turnoActual,
      total_reservas: datos.length,
      total_pagados: pag,
      total_recaudado: recaudado,
      total_premios_pagados: 0,
      ganancia_neta: recaudado,
      fijo_ganador: '',
      ganador_nombre: 'Sin ganador'
    }]);
    mostrarAlerta('✅ Recaudación guardada en el historial.', 'exito');
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function verHistorialRecaudacion() {
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var existente = document.getElementById('modal-recaudacion');
  if (existente) existente.remove();

  try {
    var r = await supabaseClient.from('recaudacion').select('*').order('creado_en', { ascending: false }).limit(100);
    var lista = '';
    if (r.data && r.data.length > 0) {
      r.data.forEach(function(x) {
        var fechaEsc = escapeHtml(x.fecha || 'N/A');
        var turnoIcono = x.turno === 'mediodia' ? '☀️' : '🌙';
        var recaudado = x.total_recaudado || 0;
        var pagados = x.total_pagados || 0;
        lista += '<div class="reserva-item">' +
          '<h4 style="color:#FFD700;">' + turnoIcono + ' ' + fechaEsc + '</h4>' +
          '<p>Recaudado: ' + recaudado + ' CUP</p>' +
          '<p>Pagados: ' + pagados + '</p>' +
          '</div>';
      });
    } else {
      lista = '<p style="text-align:center; padding:20px;">No hay registros de recaudación aún.</p>';
    }

    var m = document.createElement('div');
    m.className = 'modal';
    m.id = 'modal-recaudacion';
    m.innerHTML = '<div class="modal-contenido modal-admin" style="background:#001A5C; border:2px solid #FFD700;">' +
      '<h2>💵 HISTORIAL DE RECAUDACIÓN</h2>' +
      '<button class="btn-cerrar-admin" onclick="var m=document.getElementById(\'modal-recaudacion\'); if(m) m.remove();">✖</button>' +
      '<div style="margin-top:20px;max-height:400px;overflow-y:auto;">' + lista + '</div>' +
      '</div>';
    document.body.appendChild(m);
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function descargarCopiaSeguridad() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  mostrarAlerta('⏳ Generando copia...', 'info');

  try {
    var rReservas = await supabaseClient.from('reservas').select('*');
    var rHistorial = await supabaseClient.from('historial_fijos').select('*');
    var rRecaudacion = await supabaseClient.from('recaudacion').select('*');
    var rConfig = await supabaseClient.from('configuracion').select('*');

    var backup = {
      fecha_copia: new Date().toLocaleString(),
      app: 'La Rifita Cubana',
      reservas: (rReservas.data || []),
      historial_ganadores: (rHistorial.data || []),
      recaudacion_diaria: (rRecaudacion.data || []),
      configuracion: (rConfig.data || [])
    };

    var dataStr = JSON.stringify(backup, null, 2);
    var nombreArchivo = "Respaldo_LaRifitaCubana_" + new Date().toISOString().slice(0, 10) + ".json";
    var blob = new Blob([dataStr], { type: 'application/json' });
    var file = new File([blob], nombreArchivo, { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Copia de Seguridad', text: 'Respaldo de La Rifita Cubana' });
    } else {
      var m = document.createElement('div');
      m.className = 'modal';
      m.id = 'modal-json';
      m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700;">' +
        '<h2 style="color:#FFD700;">📥 Copia de Seguridad</h2>' +
        '<p style="font-size:12px; text-align:center;">Tu teléfono no permite descargar automáticamente. Copia este texto y guárdalo en un bloc de notas.</p>' +
        '<textarea id="texto-json" style="width:100%; height:250px; font-size:10px; background:#fff; color:#000; border-radius:8px; padding:5px;" readonly>' + escapeHtml(dataStr) + '</textarea>' +
        '<div class="modal-botones" style="flex-direction:column; gap:10px; margin-top:10px;">' +
        '<button class="btn-aceptar" onclick="copiarTextoJSON()" style="background:#25D366; color:#fff;">📋 Copiar Texto</button>' +
        '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-json\'); if(m) m.remove();">Cerrar</button>' +
        '</div>' +
        '</div>';
      document.body.appendChild(m);
    }
    await registrarLog('descargar_backup', 'Copia de seguridad generada', '', '', '');
  } catch (e) {
    mostrarAlerta('❌ Error al crear la copia: ' + (e.message || 'Desconocido'), 'error');
    console.error(e);
  }
}

function copiarTextoJSON() {
  var textarea = document.getElementById('texto-json');
  if (!textarea) return;
  textarea.select();
  try {
    document.execCommand('copy');
    mostrarAlerta('✅ Texto copiado al portapapeles.', 'exito');
  } catch(e) {
    mostrarAlerta('⚠️ No se pudo copiar automáticamente. Selecciona el texto y cópialo manualmente.', 'info');
  }
}

// ============================================
// FIN BLOQUE 15 — Continúa en Bloque 16
// ============================================// ============================================
// BLOQUE 16: PANEL ADMIN COMPLETO (con FIX #5 aplicado)
// ============================================

var toquesLogo = 0;
var temporizadorLogo = null;
var fotosJugadores = {};

async function cargarFotosJugadores() {
  if (!supabaseClient) return;
  try {
    var r = await supabaseClient.from('puntos_jugadores').select('telefono, foto_perfil');
    if (r.data && Array.isArray(r.data)) {
      fotosJugadores = {};
      r.data.forEach(function(p) { if (p.foto_perfil) fotosJugadores[p.telefono] = p.foto_perfil; });
    }
  } catch(e) { console.warn('Error cargando fotos:', e); }
}

function toqueLogo() {
  toquesLogo++;
  if (temporizadorLogo) clearTimeout(temporizadorLogo);
  temporizadorLogo = setTimeout(function() { toquesLogo = 0; }, 1000);
  if (toquesLogo >= 5) { toquesLogo = 0; abrirLoginAdmin(); }
}

// Botón de "Recuérdame" forzado con estilo en línea para que se vea siempre
function abrirLoginAdmin() {
  if (esAdmin) { abrirPanelAdmin(); return; }
  if (trabajadorActual) { abrirPanelTrabajador(trabajadorActual); return; }

  var existente = document.getElementById('modal-login');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-login';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700;">' +
    '<h2>🔐 Acceso al Sistema</h2>' +
    '<label>📧 Email:</label>' +
    '<input type="text" id="login-email" placeholder="tu@email.com" autocomplete="email" inputmode="email" style="margin-bottom:15px;">' +
    '<label>🔑 Contraseña:</label>' +
    '<div style="position:relative; margin-bottom:15px;">' +
    '<input type="password" id="login-password" placeholder="Contraseña" autocomplete="current-password" style="padding-right:40px;">' +
    '<span id="eye-icon" onclick="togglePassword()" style="position:absolute; right:12px; top:12px; cursor:pointer; font-size:20px;">👁️</span>' +
    '</div>' +
    '<div style="display:flex; align-items:center; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); margin-bottom:20px;">' +
    '<input type="checkbox" id="login-recordar" style="width:22px !important; height:22px !important; margin-right:12px !important; cursor:pointer; accent-color: #FFD700; display:inline-block !important;">' +
    '<label for="login-recordar" style="margin:0; color:#FFD700; cursor:pointer; font-size:14px; font-weight:bold; user-select:none; width:100%;">Recuérdame en este dispositivo</label>' +
    '</div>' +
    '<div class="modal-botones" style="margin-top:20px;">' +
    '<button class="btn-cancelar" onclick="cerrarLogin()">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="iniciarSesion()">Entrar</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

function cerrarLogin() {
  var m = document.getElementById('modal-login');
  if (m) m.remove();
}

async function iniciarSesion() {
  var emailEl = document.getElementById('login-email');
  var passEl = document.getElementById('login-password');
  var recordarEl = document.getElementById('login-recordar');

  if (!emailEl || !passEl) return;

  var email = emailEl.value.trim();
  var pass = passEl.value;
  var recordar = recordarEl ? recordarEl.checked : false;

  if (!email || !pass) { mostrarAlerta('⚠️ Email y contraseña son obligatorios', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  try {
    var r = await supabaseClient.auth.signInWithPassword({ email: email, password: pass });
    if (r.error) { mostrarAlerta('❌ Correo o contraseña incorrectos', 'error'); return; }
    if (!r.data || !r.data.user) { mostrarAlerta('❌ Error desconocido al iniciar sesión.', 'error'); return; }

    var ca = await supabaseClient.from('admins').select('user_id').eq('user_id', r.data.user.id).maybeSingle();
    if (ca.data) {
      esAdmin = true;
      trabajadorActual = null;
      if (recordar) localStorage.setItem('admin_remember', 'true');
      else { localStorage.removeItem('admin_remember'); sessionStorage.setItem('admin_session', 'true'); }
      cerrarLogin();
      abrirPanelAdmin();
      return;
    }

    var ct = await supabaseClient.from('trabajadores').select('*').eq('email', email).maybeSingle();
    if (ct.data) {
      esAdmin = false;
      trabajadorActual = ct.data;
      if (recordar) localStorage.setItem('trabajador_remember', 'true');
      else { localStorage.removeItem('trabajador_remember'); sessionStorage.setItem('trabajador_session', 'true'); }
      cerrarLogin();
      abrirPanelTrabajador(ct.data);
      return;
    }
    mostrarAlerta('❌ No tienes permisos para acceder al panel.', 'error');
    await supabaseClient.auth.signOut();
  } catch(e) {
    console.error('Error en iniciarSesion:', e);
    mostrarAlerta('❌ Error al iniciar sesión: ' + (e.message || 'Desconocido'), 'error');
  }
}

async function cerrarSesion() {
  try {
    if (supabaseClient) await supabaseClient.auth.signOut();
  } catch(e) { console.warn('Error en signOut:', e); }

  esAdmin = false;
  trabajadorActual = null;
  localStorage.removeItem('admin_remember');
  sessionStorage.removeItem('admin_session');
  localStorage.removeItem('trabajador_remember');
  sessionStorage.removeItem('trabajador_session');

  mostrarAlerta('✅ Sesión cerrada correctamente', 'exito');
  cerrarPanelAdmin();
}

async function refrescarPanelAdmin() {
  var adminModal = document.getElementById('modal-admin');
  if (!adminModal) return;

  var scrollActual = 0;
  var divContenido = adminModal.querySelector('.modal-contenido');
  if (divContenido) scrollActual = divContenido.scrollTop;

  cerrarPanelAdmin();

  if (esAdmin) {
    await abrirPanelAdmin();
  } else if (trabajadorActual) {
    abrirPanelTrabajador(trabajadorActual);
  }

  var nuevoAdmin = document.getElementById('modal-admin');
  if (nuevoAdmin) {
    var nuevoDiv = nuevoAdmin.querySelector('.modal-contenido');
    if (nuevoDiv) nuevoDiv.scrollTop = scrollActual;

    if (esAdmin) {
      document.querySelectorAll('.admin-pro-tab-content').forEach(function(c) { c.classList.remove('activo'); });
      document.querySelectorAll('.admin-pro-tab').forEach(function(t) { t.classList.remove('activo'); });

      var tabActivo = document.getElementById('tab-' + tabAdminActivo);
      if (tabActivo) tabActivo.classList.add('activo');

      var nombreTab = obtenerNombreTab(tabAdminActivo);
      var botonesTabs = document.querySelectorAll('.admin-pro-tab');
      for (var i = 0; i < botonesTabs.length; i++) {
        if (botonesTabs[i].innerHTML.indexOf(nombreTab) !== -1) {
          botonesTabs[i].classList.add('activo');
          break;
        }
      }

      if (tabAdminActivo === 'aprobados') { cargarAprobados(); cargarArchivoTickets(); }
    }
  }
}

function obtenerNombreTab(tabId) {
  if (tabId === 'reservas') return 'Pendientes';
  if (tabId === 'aprobados') return 'Aprobados';
  if (tabId === 'finanzas') return 'Finanzas';
  if (tabId === 'config') return 'Config';
  if (tabId === 'herramientas') return 'Más';
  return '';
}

async function abrirPanelAdmin() {
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  try {
    var ses = await supabaseClient.auth.getSession();
    if (!ses || !ses.data || !ses.data.session) {
      mostrarAlerta('🔐 Inicia sesión para continuar', 'error');
      abrirLoginAdmin();
      return;
    }
  } catch(e) {
    mostrarAlerta('🔐 Error verificando sesión', 'error');
    abrirLoginAdmin();
    return;
  }

  await cargarFotosJugadores();

  var pag = 0, ocu = 0;
  Object.keys(reservas).forEach(function(num) {
    if (reservas[num].estado === 'pagado') pag++;
    if (reservas[num].estado === 'ocupado') ocu++;
  });
  var total = Object.keys(reservas).length;
  var libres = 100 - total;
  var cPr = turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche';
  var recaudado = pag * parseInt((config && config[cPr]) || '50');
  var metaDiaria = parseInt((config && config.meta_diaria) || '3000');
  if (isNaN(metaDiaria) || metaDiaria === 0) metaDiaria = 3000;
  var porcentaje = Math.min(100, Math.round((recaudado / metaDiaria) * 100));
  var nT = turnoActual === 'mediodia' ? 'Mediodía' : 'Noche';
  var iconoTurno = turnoActual === 'mediodia' ? '☀️' : '🌙';

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-admin';

  var contenidoReservas = await generarContenidoReservas();

  m.innerHTML = '<div class="modal-contenido modal-admin-pro" style="background: #001A5C; border: 2px solid #FFD700;">' +
    '<div class="admin-pro-header" style="padding-bottom: 15px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); border-radius: 20px 20px 0 0;">' +
    '<div class="admin-pro-header-info">' +
    '<div class="admin-pro-badge" style="background: rgba(0,0,0,0.3); color: #fff;">' + iconoTurno + ' Turno ' + nT + ' ' + (turnoForzado ? '(FORZADO)' : '(AUTO)') + '</div>' +
    '<h1 style="color: #001A5C;">Panel de Control Total</h1>' +
    '<p style="margin-bottom: 5px; color: #001A5C; font-weight: bold;">Yandyno · Administrador General</p>' +
    '<div style="display: flex; align-items: center; gap: 5px;">' +
    '<span style="font-size: 11px; color: rgba(0,26,92,0.8); font-weight: bold;">larifitacubanaoficial@gmail.com</span>' +
    '<button onclick="copiarAlPortapapeles(\'larifitacubanaoficial@gmail.com\', \'📧 Correo Oficial\')" style="background: rgba(0,0,0,0.1); border: none; border-radius: 4px; padding: 2px 5px; font-size: 10px; cursor: pointer; color: #001A5C;">📋 Copiar</button>' +
    '</div>' +
    '</div>' +
    '<button class="admin-pro-close" onclick="cerrarPanelAdmin()">✖</button>' +
    '</div>' +
    '<button class="admin-pro-logout" onclick="cerrarSesion()">🚪 Cerrar Sesión</button>' +
    '<div class="admin-pro-stats">' +
    '<div class="admin-pro-stat-card"><div class="admin-pro-stat-icon" style="background: linear-gradient(135deg,#FFD700,#FFA500);">📊</div><div class="admin-pro-stat-info"><span class="admin-pro-stat-label">Total</span><span class="admin-pro-stat-num">' + total + '</span></div></div>' +
    '<div class="admin-pro-stat-card"><div class="admin-pro-stat-icon" style="background: linear-gradient(135deg,#F44336,#B71C1C);">💰</div><div class="admin-pro-stat-info"><span class="admin-pro-stat-label">Pagados</span><span class="admin-pro-stat-num">' + pag + '</span></div></div>' +
    '<div class="admin-pro-stat-card"><div class="admin-pro-stat-icon" style="background: linear-gradient(135deg,#FFC107,#FF8F00);">⏳</div><div class="admin-pro-stat-info"><span class="admin-pro-stat-label">Ocupados</span><span class="admin-pro-stat-num">' + ocu + '</span></div></div>' +
    '<div class="admin-pro-stat-card"><div class="admin-pro-stat-icon" style="background: linear-gradient(135deg,#2ECC71,#27AE60);">✅</div><div class="admin-pro-stat-info"><span class="admin-pro-stat-label">Libres</span><span class="admin-pro-stat-num">' + libres + '</span></div></div>' +
    '</div>' +
    '<div class="admin-pro-meta">' +
    '<div class="admin-pro-meta-header"><span>🎯 Meta: ' + metaDiaria + ' CUP</span><span class="admin-pro-meta-pct">' + porcentaje + '%</span></div>' +
    '<div class="admin-pro-meta-barra"><div class="admin-pro-meta-fill" style="width: ' + porcentaje + '%;"></div></div>' +
    '<div class="admin-pro-meta-footer"><span>💰 Recaudado: ' + recaudado + ' CUP</span><span>Faltan: ' + Math.max(0, metaDiaria - recaudado) + ' CUP</span></div>' +
    '</div>' +
    '<div class="admin-pro-tabs">' +
    '<button class="admin-pro-tab ' + (tabAdminActivo === 'reservas' ? 'activo' : '') + '" onclick="mostrarTabAdmin(\'reservas\', this)"><span class="admin-pro-tab-icon">⏳</span><span>Pendientes</span></button>' +
    '<button class="admin-pro-tab ' + (tabAdminActivo === 'aprobados' ? 'activo' : '') + '" onclick="mostrarTabAdmin(\'aprobados\', this)"><span class="admin-pro-tab-icon">✅</span><span>Aprobados</span></button>' +
    '<button class="admin-pro-tab ' + (tabAdminActivo === 'finanzas' ? 'activo' : '') + '" onclick="mostrarTabAdmin(\'finanzas\', this)"><span class="admin-pro-tab-icon">💵</span><span>Finanzas</span></button>' +
    '<button class="admin-pro-tab ' + (tabAdminActivo === 'config' ? 'activo' : '') + '" onclick="mostrarTabAdmin(\'config\', this)"><span class="admin-pro-tab-icon">⚙️</span><span>Config</span></button>' +
    '<button class="admin-pro-tab ' + (tabAdminActivo === 'herramientas' ? 'activo' : '') + '" onclick="mostrarTabAdmin(\'herramientas\', this)"><span class="admin-pro-tab-icon">🛠️</span><span>Más</span></button>' +
    '</div>' +
    '<div id="tab-reservas" class="admin-pro-tab-content ' + (tabAdminActivo === 'reservas' ? 'activo' : '') + '">' + contenidoReservas + '</div>' +
    '<div id="tab-aprobados" class="admin-pro-tab-content ' + (tabAdminActivo === 'aprobados' ? 'activo' : '') + '">' +
    '<div class="admin-pro-seccion">' +
    '<div class="admin-pro-seccion-header"><h3>✅ Aprobados Actuales</h3></div>' +
    '<p style="font-size:11px; color:#FFD700; margin-bottom:10px;">Estos son los tickets confirmados del día.</p>' +
    '<div style="margin-bottom: 15px;">' +
    '<input type="text" id="buscador-aprobados" onkeyup="filtrarAprobados()" placeholder="🔍 Buscar por nombre, teléfono o código..." style="width:100%; padding:12px; border-radius:10px; border:2px solid #FFD700; background:rgba(255,255,255,0.1); color:#fff; font-size:14px;">' +
    '</div>' +
    '<button class="admin-pro-btn-accion naranja" onclick="limpiarAprobadosViejos()"><span>🧹</span> Limpiar +48 Horas</button>' +
    '<div style="display:flex; gap:8px; margin-top:10px;">' +
    '<button class="admin-pro-btn-accion rojo" style="flex:1;" onclick="borrarAprobadosPorDia()"><span>📅</span> Borrar por Día</button>' +
    '<button class="admin-pro-btn-accion rojo" style="flex:1;" onclick="borrarTodosAprobados()"><span>🗑️</span> Borrar Todos</button>' +
    '</div>' +
    '<div id="lista-aprobados" class="admin-pro-lista" style="margin-top:15px;"><div class="historial-vacio">Cargando...</div></div>' +
    '</div>' +
    '<div class="admin-pro-divisor-seccion"><span>📦 ARCHIVO TEMPORAL (24 HORAS)</span></div>' +
    '<div class="admin-pro-seccion">' +
    '<div class="admin-pro-seccion-header"><h3>📦 Archivados <span id="contador-archivo" class="admin-pro-archivo-badge">0</span></h3><button class="admin-pro-btn-mini" onclick="cargarArchivoTickets()">🔄</button></div>' +
    '<div class="admin-pro-archivo-info">🕐 Estos tickets se guardan por 24h para resolver reclamos y se borran automáticamente.</div>' +
    '<button class="admin-pro-btn-accion rojo" onclick="limpiarArchivoViejo()"><span>🧹</span> Limpiar Archivo +24h</button>' +
    '<div id="lista-archivo" class="admin-pro-lista" style="margin-top:15px;"><div class="historial-vacio">Cargando...</div></div>' +
    '</div>' +
    '</div>' +
    '<div id="tab-finanzas" class="admin-pro-tab-content ' + (tabAdminActivo === 'finanzas' ? 'activo' : '') + '">' + generarContenidoFinanzas() + '</div>' +
    '<div id="tab-config" class="admin-pro-tab-content ' + (tabAdminActivo === 'config' ? 'activo' : '') + '">' + generarContenidoConfig() + '</div>' +
    '<div id="tab-herramientas" class="admin-pro-tab-content ' + (tabAdminActivo === 'herramientas' ? 'activo' : '') + '">' + generarContenidoHerramientas() + '</div>' +
    '</div>';
  document.body.appendChild(m);

  if (tabAdminActivo === 'aprobados') { cargarAprobados(); cargarArchivoTickets(); }
}

async function abrirPanelTrabajador(trabajador) {
  if (!trabajador) { mostrarAlerta('❌ Datos de trabajador inválidos.', 'error'); return; }

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-admin';

  var rolNombre = trabajador.rol ? trabajador.rol.toUpperCase() : 'COLABORADOR';
  var iconoRol = trabajador.rol === 'confirmador' ? '✅' : (trabajador.rol === 'moderador' ? '💬' : '👤');
  var nombreEsc = escapeHtml(trabajador.nombre || 'Trabajador');
  var rolEsc = escapeHtml(rolNombre);

  var resHTML = '';
  var pendientes = 0;

  if (trabajador.puede_confirmar || trabajador.puede_rechazar) {
    var numsOrdenados = Object.keys(reservas).sort(function(a, b) { return parseInt(a) - parseInt(b); });
    numsOrdenados.forEach(function(num) {
      var x = reservas[num];
      if (x.estado === 'ocupado') {
        pendientes++;
        var nombreResEsc = escapeHtml(x.nombre || 'Sin nombre');
        var telResEsc = escapeHtml(x.telefono || 'N/A');
        var refResEsc = escapeHtml(x.referencia || 'N/A');
        var horaResEsc = escapeHtml(x.hora || 'N/A');
        var numEsc = escapeHtml(num);
        var capturaEsc = x.captura_url ? escapeHtml(x.captura_url) : '';
        var capHTML = capturaEsc ? '<img src="' + capturaEsc + '" class="captura-admin" loading="lazy" onclick="verCaptura(\'' + capturaEsc + '\')" alt="Captura">' : '<p style="color:#FFC107; font-size:12px;">⚠️ Sin captura</p>';
        var btnAceptar = trabajador.puede_confirmar ? '<button class="admin-pro-btn-confirmar" style="padding:12px; font-size:14px;" onclick="confirmarPago(\'' + numEsc + '\')">✅ Aceptar</button>' : '';
        var btnDenegar = trabajador.puede_rechazar ? '<button class="admin-pro-btn-rechazar" style="padding:12px; font-size:14px;" onclick="rechazarPago(\'' + numEsc + '\')">❌ Denegar</button>' : '';
        var btnBloquear = trabajador.puede_bloquear ? '<button class="admin-pro-btn-mini rojo" onclick="bloquear(\'' + telResEsc + '\')">🚫</button>' : '';

        resHTML += '<div class="admin-pro-reserva-card">' +
          '<div class="admin-pro-reserva-header">' +
          '<div class="admin-pro-reserva-numero">' + numEsc + '</div>' +
          '<div class="admin-pro-reserva-titulo"><h4>' + nombreResEsc + '</h4><p>📱 ' + telResEsc + '</p></div>' +
          '<span class="admin-pro-badge-ocupado">⏳ Pendiente</span>' +
          '</div>' +
          '<div class="admin-pro-reserva-body" style="padding-left:0;">' +
          '<div class="admin-pro-reserva-datos">' +
          '<p><span>💳 Ref:</span> ' + refResEsc + '</p>' +
          '<p><span>⏰ Hora:</span> ' + horaResEsc + '</p>' +
          '</div>' + capHTML +
          '<div class="admin-pro-reserva-acciones" style="margin-top:15px; gap:10px; display:flex; flex-wrap:wrap;">' +
          btnAceptar + btnDenegar + btnBloquear +
          '</div></div></div>';
      }
    });
    if (pendientes === 0) {
      resHTML = '<div class="admin-pro-vacio"><div style="font-size:48px;">📭</div><p>No hay reservas pendientes por revisar</p></div>';
    }
  } else {
    resHTML = '<div class="admin-pro-vacio"><p>No tienes permiso para ver reservas.</p></div>';
  }

  m.innerHTML = '<div class="modal-contenido modal-admin-pro" style="max-width: 450px; background: #001A5C; border: 2px solid #FFD700;">' +
    '<div class="admin-pro-header" style="background: linear-gradient(135deg, #2196F3, #1565C0);">' +
    '<div class="admin-pro-header-info">' +
    '<div class="admin-pro-badge">' + iconoRol + ' ROL: ' + rolEsc + '</div>' +
    '<h1 style="color: #fff;">Panel de Trabajador</h1>' +
    '<p style="color: rgba(255,255,255,0.8);">' + nombreEsc + '</p>' +
    '</div>' +
    '<button class="admin-pro-close" onclick="cerrarSesion()" style="color:#fff;">✖</button>' +
    '</div>' +
    '<div class="admin-pro-tabs" style="margin-top: 15px; justify-content: center;">' +
    '<button class="admin-pro-tab activo" style="min-width: 150px;"><span class="admin-pro-tab-icon">⏳</span><span>Pendientes</span></button>' +
    '</div>' +
    '<div class="admin-pro-tab-content activo" style="display: block;">' +
    '<div class="admin-pro-seccion">' +
    '<div class="admin-pro-seccion-header"><h3>⏳ Reservas por Revisar</h3><button class="admin-pro-btn-mini" onclick="refrescarPanelAdmin()">🔄</button></div>' +
    '<div class="admin-pro-lista">' + resHTML + '</div>' +
    '<button class="admin-pro-btn-peligro" onclick="cerrarSesion()" style="margin-top: 20px;">🚪 Cerrar Sesión de Trabajador</button>' +
    '</div></div></div>';
  document.body.appendChild(m);
}

function cerrarPanelAdmin() {
  var m = document.getElementById('modal-admin');
  if (m) m.remove();
}

function mostrarTabAdmin(tabId, btn) {
  tabAdminActivo = tabId;
  document.querySelectorAll('.admin-pro-tab-content').forEach(function(c) { c.classList.remove('activo'); });
  document.querySelectorAll('.admin-pro-tab').forEach(function(t) { t.classList.remove('activo'); });

  var tabContenido = document.getElementById('tab-' + tabId);
  if (tabContenido) tabContenido.classList.add('activo');
  if (btn) btn.classList.add('activo');

  if (tabId === 'aprobados') { cargarAprobados(); cargarArchivoTickets(); }
}

async function generarContenidoReservas() {
  var resHTML = '';
  var numsOrdenados = Object.keys(reservas).sort(function(a, b) { return parseInt(a) - parseInt(b); });
  var pendientes = 0;

  numsOrdenados.forEach(function(num) {
    var x = reservas[num];
    if (x.estado === 'ocupado') {
      pendientes++;

      var numEsc = escapeHtml(num);
      var nombreEsc = escapeHtml(x.nombre || 'Sin nombre');
      var telEsc = escapeHtml(x.telefono || 'N/A');
      var telAttrAttr = (x.telefono || '').replace(/[^0-9]/g, '');
      var refEsc = escapeHtml(x.referencia || 'N/A');
      var recargaEsc = escapeHtml(x.telefono_recarga || 'N/A');
      var horaEsc = escapeHtml(x.hora || 'N/A');
      var codigoEsc = escapeHtml(x.codigo_ticket || 'N/A');
      var capturaEsc = x.captura_url ? escapeHtml(x.captura_url) : '';
      var codigoSMSEsc = x.codigo_sms ? escapeHtml(x.codigo_sms) : '';

      var capHTML = capturaEsc
        ? '<img src="' + capturaEsc + '" class="captura-admin" loading="lazy" onclick="verCaptura(\'' + capturaEsc + '\')" alt="Captura">'
        : '<p style="color:#FFC107; font-size:12px;">⚠️ Sin captura</p>';

      var blq = bloqueados.indexOf(x.telefono) !== -1;
      var btnB = blq
        ? '<button class="admin-pro-btn-mini verde" onclick="desbloquear(\'' + telAttrAttr + '\')">🔓</button>'
        : '<button class="admin-pro-btn-mini rojo" onclick="bloquear(\'' + telAttrAttr + '\')">🚫</button>';

      var foto = fotosJugadores[x.telefono] || '';
      var fotoHtml = foto
        ? '<img src="' + escapeHtml(foto) + '" class="avatar-admin" loading="lazy" alt="Avatar">'
        : '<div class="avatar-admin" style="background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:20px;">👤</div>';

      var avisoRevision = '';
      if (x.revisar_admin === true) {
        avisoRevision = '<div style="background:rgba(255,152,0,0.2); border:1px solid #FF9800; border-radius:8px; padding:8px; margin-top:8px; font-size:11px; color:#FF9800; font-weight:bold; text-align:center;">⚠️ Este ticket lleva más de 60 min sin aprobar — Revísalo con prioridad</div>';
      }

      var codigoSMSHtml = '';
      if (codigoSMSEsc) {
        codigoSMSHtml = '<div style="background:rgba(255,215,0,0.15); border:2px solid #FFD700; border-radius:10px; padding:10px; margin-top:10px; text-align:center;">' +
          '<p style="color:#FFD700; font-size:11px; font-weight:bold; margin:0 0 4px; text-transform:uppercase; letter-spacing:1px;">🔐 CÓDIGO SMS DE TRANSACCIÓN</p>' +
          '<p style="color:#fff; font-size:20px; font-weight:900; margin:0; font-family:\'Courier New\', monospace; letter-spacing:2px; word-break:break-all;">' + codigoSMSEsc + '</p>' +
          '<button onclick="copiarAlPortapapeles(\'' + codigoSMSEsc + '\', \'🔐 Código SMS\')" style="margin-top:6px; padding:6px 12px; background:#FFD700; color:#001A5C; border:none; border-radius:6px; font-weight:bold; font-size:11px; cursor:pointer;">📋 Copiar Código</button>' +
          '</div>';
      } else {
        codigoSMSHtml = '<div style="background:rgba(244,67,54,0.15); border:2px solid #F44336; border-radius:10px; padding:10px; margin-top:10px; text-align:center;">' +
          '<p style="color:#F44336; font-size:11px; font-weight:bold; margin:0;">⚠️ SIN CÓDIGO SMS REGISTRADO</p>' +
          '<p style="color:#fff; font-size:11px; margin:4px 0 0;">Este ticket fue creado antes de la actualización.</p>' +
          '</div>';
      }

      resHTML += '<div class="admin-pro-reserva-card" data-nombre="' + nombreEsc.toLowerCase() + '" data-telefono="' + telEsc + '" data-codigo="' + codigoEsc.toLowerCase() + '">' +
        '<div class="admin-pro-reserva-header">' + fotoHtml +
        '<div class="admin-pro-reserva-numero">' + numEsc + '</div>' +
        '<div class="admin-pro-reserva-titulo"><h4>' + nombreEsc + '</h4><p>📱 ' + telEsc + '</p></div>' +
        '<span class="admin-pro-badge-ocupado">⏳ Pendiente</span>' +
        '</div>' +
        '<div class="admin-pro-reserva-body" style="padding-left:0;">' +
        '<div class="admin-pro-reserva-datos">' +
        '<p><span>💳 Ref:</span> ' + refEsc + '</p>' +
        '<p><span>📲 Recarga:</span> ' + recargaEsc + '</p>' +
        '<p><span>⏰ Hora:</span> ' + horaEsc + '</p>' +
        '<p><span>🎟️ Ticket:</span> ' + codigoEsc + '</p>' +
        '</div>' +
        codigoSMSHtml + avisoRevision + capHTML +
        '<div class="admin-pro-reserva-acciones" style="margin-top:15px; gap:10px;">' +
        '<button class="admin-pro-btn-confirmar" style="padding:12px; font-size:14px;" onclick="confirmarPago(\'' + numEsc + '\')">✅ Aceptar</button>' +
        '<button class="admin-pro-btn-mini naranja" style="padding:12px; font-size:14px; border-color:#FF9800; color:#FF9800;" onclick="liberarNumero(\'' + numEsc + '\')">🔓 Liberar</button>' +
        '<button class="admin-pro-btn-rechazar" style="padding:12px; font-size:14px;" onclick="rechazarPago(\'' + numEsc + '\')">❌ Denegar</button>' +
        btnB +
        '</div></div></div>';
    }
  });

  if (pendientes === 0) {
    resHTML = '<div class="admin-pro-vacio"><div style="font-size:48px;">📭</div><p>No hay reservas pendientes por aprobar</p></div>';
  }

  return '<div class="admin-pro-seccion">' +
    '<div class="admin-pro-seccion-header"><h3>⏳ Reservas Pendientes</h3><button class="admin-pro-btn-mini" onclick="refrescarPanelAdmin()">🔄</button></div>' +
    '<div style="display:flex; gap:8px; margin-bottom:15px;">' +
    '<button class="admin-pro-btn-accion verde" style="flex:1; margin-bottom:0;" onclick="aprobarTodosVerificados()"><span>⚡</span> Aprobar Todos Verificados</button>' +
    '<button class="admin-pro-btn-accion naranja" style="flex:1; margin-bottom:0;" onclick="verificarPagosAtrasados()"><span>🚨</span> Ver Pagos +5min</button>' +
    '</div>' +
    '<div style="margin-bottom: 15px;">' +
    '<input type="text" id="buscador-pendientes" onkeyup="filtrarPendientes()" placeholder="🔍 Buscar por nombre, teléfono o código..." style="width:100%; padding:12px; border-radius:10px; border:2px solid #FFD700; background:rgba(255,255,255,0.1); color:#fff; font-size:14px;">' +
    '</div>' +
    '<div class="admin-pro-lista" id="lista-pendientes">' + resHTML + '</div>' +
    '<button class="admin-pro-btn-peligro" onclick="regenerarTodo()">🔄 Regenerar Cuadrícula Completa (Borrar TODO)</button>' +
    '</div>';
}

function filtrarPendientes() {
  var input = document.getElementById('buscador-pendientes');
  if (!input) return;
  var filtro = input.value.toLowerCase();
  var contenedor = document.getElementById('lista-pendientes');
  if (!contenedor) return;
  var tarjetas = contenedor.querySelectorAll('.admin-pro-reserva-card');
  tarjetas.forEach(function(tarjeta) {
    var nombre = tarjeta.getAttribute('data-nombre') || '';
    var telefono = tarjeta.getAttribute('data-telefono') || '';
    var codigo = tarjeta.getAttribute('data-codigo') || '';
    var numEl = tarjeta.querySelector('.admin-pro-reserva-numero');
    var numero = numEl ? numEl.innerText.toLowerCase() : '';
    if (nombre.indexOf(filtro) !== -1 || telefono.indexOf(filtro) !== -1 || codigo.indexOf(filtro) !== -1 || numero.indexOf(filtro) !== -1) {
      tarjeta.style.display = 'block';
    } else {
      tarjeta.style.display = 'none';
    }
  });
}

function filtrarAprobados() {
  var input = document.getElementById('buscador-aprobados');
  if (!input) return;
  var filtro = input.value.toLowerCase();
  var contenedor = document.getElementById('lista-aprobados');
  if (!contenedor) return;
  var tarjetas = contenedor.querySelectorAll('.admin-pro-reserva-card');
  tarjetas.forEach(function(tarjeta) {
    var nombre = tarjeta.getAttribute('data-nombre') || '';
    var telefono = tarjeta.getAttribute('data-telefono') || '';
    var codigo = tarjeta.getAttribute('data-codigo') || '';
    var numEl = tarjeta.querySelector('.admin-pro-reserva-numero');
    var numero = numEl ? numEl.innerText.toLowerCase() : '';
    if (nombre.indexOf(filtro) !== -1 || telefono.indexOf(filtro) !== -1 || codigo.indexOf(filtro) !== -1 || numero.indexOf(filtro) !== -1) {
      tarjeta.style.display = 'block';
    } else {
      tarjeta.style.display = 'none';
    }
  });
}

async function cargarAprobados() {
  var cont = document.getElementById('lista-aprobados');
  if (!cont || document.hidden) return;
  cont.innerHTML = '<div class="historial-vacio">Cargando...</div>';

  if (!supabaseClient) {
    mostrarErrorConBoton('lista-aprobados', 'cargarAprobados', 'Sin conexión al servidor');
    return;
  }

  await cargarFotosJugadores();

  try {
    var r = await supabaseClient.from('reservas').select('id,numero,nombre,telefono,codigo_ticket,fecha_aprobado,hora_aprobado,turno,captura_url').eq('estado', 'pagado').order('fecha_aprobado', { ascending: false });
    if (r.error) throw r.error;

    if (!r.data || r.data.length === 0) {
      cont.innerHTML = '<div class="historial-vacio">No hay tickets aprobados aún.</div>';
      return;
    }

    var html = '';
    r.data.forEach(function(ticket) {
      if (!ticket) return;

      var numEsc = escapeHtml(String(ticket.numero || '?'));
      var nombreEsc = escapeHtml(ticket.nombre || 'Sin nombre');
      // FIX #5: Escape especial para atributos onclick con apóstrofes
      var nombreSafe = escapeAttr(ticket.nombre || 'Sin nombre');
      var telEsc = escapeHtml(ticket.telefono || 'N/A');
      var codigoEsc = escapeHtml(ticket.codigo_ticket || 'N/A');
      var fechaEsc = escapeHtml(ticket.fecha_aprobado || 'N/A');
      var capturaEsc = ticket.captura_url ? escapeHtml(ticket.captura_url) : '';

      var foto = fotosJugadores[ticket.telefono] || '';
      var fotoHtml = foto
        ? '<img src="' + escapeHtml(foto) + '" class="avatar-admin" loading="lazy" alt="Avatar">'
        : '<div class="avatar-admin" style="background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:20px;">👤</div>';

      var horaAprob = ticket.hora_aprobado
        ? (ticket.hora_aprobado.indexOf('M') !== -1 ? ticket.hora_aprobado : obtenerHora12(ticket.hora_aprobado))
        : 'N/A';
      var horaEsc = escapeHtml(horaAprob);

      html += '<div class="admin-pro-reserva-card" style="border-color: #2ECC71;" data-nombre="' + nombreSafe.toLowerCase() + '" data-telefono="' + telEsc + '" data-codigo="' + codigoEsc.toLowerCase() + '">' +
        '<div class="admin-pro-reserva-header">' + fotoHtml +
        '<div class="admin-pro-reserva-numero" style="background:linear-gradient(135deg,#2ECC71,#27AE60);">' + numEsc + '</div>' +
        '<div class="admin-pro-reserva-titulo"><h4>' + nombreEsc + '</h4><p>📱 ' + telEsc + '</p><p style="font-size:11px; color:#FFD700;">Código: #' + codigoEsc + '</p></div>' +
        '<span class="admin-pro-badge-pagado">✅ Pagado</span>' +
        '</div>' +
        '<div class="admin-pro-reserva-body" style="padding-left:0;">' +
        '<p style="font-size:12px; color:#2ECC71; font-weight:bold; margin-bottom:5px;">Aprobado el: ' + fechaEsc + ' a las ' + horaEsc + '</p>' +
        '<p style="font-size:12px; color:rgba(255,255,255,0.7);">Turno: ' + (ticket.turno === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche') + '</p>' +
        (capturaEsc ? '<img src="' + capturaEsc + '" class="captura-admin" loading="lazy" onclick="verCaptura(\'' + capturaEsc + '\')" style="max-height:150px; object-fit:contain; margin-top:8px;" alt="Captura">' : '') +
        '<div class="admin-pro-reserva-acciones" style="margin-top:12px; gap:8px;">' +
        '<button class="admin-pro-btn-mini naranja" style="flex:1; padding:12px; font-size:13px;" onclick="liberarNumero(\'' + numEsc + '\')">🔓 Liberar</button>' +
        '</div></div></div>';
    });
    cont.innerHTML = html;

    var buscador = document.getElementById('buscador-aprobados');
    if (buscador && buscador.value !== '') filtrarAprobados();
  } catch(e) {
    console.error('Error cargando aprobados:', e);
    mostrarErrorConBoton('lista-aprobados', 'cargarAprobados', 'No se pudieron cargar los aprobados');
  }
}

async function borrarAprobadosPorDia() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var fecha = await mostrarPromptCustom('📅 Escribe la fecha exacta a borrar (Formato: DD/MM/AAAA)\nEjemplo: 15/10/2026', '');
  if (!fecha) return;

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    mostrarAlerta('⚠️ Formato de fecha inválido.\n\nUsa: DD/MM/AAAA (Ejemplo: 15/10/2026)', 'error');
    return;
  }

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Seguro que quieres borrar todos los aprobados del día ' + fecha + '?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('reservas').delete().eq('estado', 'pagado').eq('fecha_aprobado', fecha);
    if (r.error) throw r.error;
    mostrarAlerta('✅ Aprobados del ' + fecha + ' eliminados.', 'exito');
    cargarAprobados();
  } catch (e) { mostrarAlerta('❌ Error al borrar: ' + (e.message || 'Desconocido'), 'error'); }
}

async function borrarTodosAprobados() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Seguro que quieres borrar TODOS los tickets aprobados?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('reservas').delete().eq('estado', 'pagado');
    if (r.error) throw r.error;
    mostrarAlerta('✅ Todos los tickets aprobados eliminados.', 'exito');
    cargarAprobados();
  } catch (e) { mostrarAlerta('❌ Error al borrar: ' + (e.message || 'Desconocido'), 'error'); }
}

async function limpiarAprobadosViejos() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('🧹 ¿Limpiar los tickets aprobados con más de 48 horas de antigüedad?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('reservas').select('id,creado_en,fecha_aprobado,hora_aprobado').eq('estado', 'pagado');
    if (r.error) throw r.error;

    var ahora = new Date().getTime();
    var borrados = 0;

    for (var i = 0; i < r.data.length; i++) {
      var t = r.data[i];
      var fechaTicketMs = 0;

      if (t.creado_en) {
        fechaTicketMs = new Date(t.creado_en).getTime();
      } else if (t.fecha_aprobado) {
        var partesFecha = t.fecha_aprobado.split('/');
        if (partesFecha.length === 3) {
          var partesHora = (t.hora_aprobado || '12:00 PM').replace(' AM', '').replace(' PM', '').split(':');
          var esPM = (t.hora_aprobado || '').indexOf('PM') !== -1;
          var horaNum = parseInt(partesHora[0]);
          if (esPM && horaNum !== 12) horaNum += 12;
          if (!esPM && horaNum === 12) horaNum = 0;
          var fObj = new Date(parseInt(partesFecha[2]), parseInt(partesFecha[1]) - 1, parseInt(partesFecha[0]), horaNum, parseInt(partesHora[1] || 0), 0);
          fechaTicketMs = fObj.getTime();
        }
      }

      if (fechaTicketMs > 0) {
        var diferenciaHoras = (ahora - fechaTicketMs) / 1000 / 60 / 60;
        if (diferenciaHoras > 48) {
          await supabaseClient.from('reservas').delete().eq('id', t.id);
          borrados++;
        }
      }
    }

    mostrarAlerta(borrados > 0 ? '✅ Se borraron ' + borrados + ' tickets.' : 'ℹ️ No hay tickets con más de 48 horas.', borrados > 0 ? 'exito' : 'info');
    cargarAprobados();
  } catch (e) { mostrarAlerta('❌ Error al limpiar: ' + (e.message || 'Desconocido'), 'error'); }
}

function generarContenidoFinanzas() {
  var pag = 0;
  Object.keys(reservas).forEach(function(num) { if (reservas[num].estado === 'pagado') pag++; });
  var cPr = turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche';
  var precio = parseInt((config && config[cPr]) || '50');
  if (isNaN(precio)) precio = 50;
  var recaudado = pag * precio;
  var metaDiaria = parseInt((config && config.meta_diaria) || '3000');
  if (isNaN(metaDiaria) || metaDiaria === 0) metaDiaria = 3000;
  var porcentaje = Math.min(100, Math.round((recaudado / metaDiaria) * 100));

  return '<div class="admin-pro-seccion">' +
    '<div class="admin-pro-seccion-header"><h3>💰 Recaudación</h3></div>' +
    '<div class="admin-pro-finanzas-cards">' +
    '<div class="admin-pro-finanza-card"><span class="admin-pro-finanza-label">Recaudado</span><span class="admin-pro-finanza-num verde">' + recaudado + '</span><span class="admin-pro-finanza-unidad">CUP</span></div>' +
    '<div class="admin-pro-finanza-card"><span class="admin-pro-finanza-label">Meta</span><span class="admin-pro-finanza-num">' + metaDiaria + '</span><span class="admin-pro-finanza-unidad">CUP</span></div>' +
    '<div class="admin-pro-finanza-card"><span class="admin-pro-finanza-label">Progreso</span><span class="admin-pro-finanza-num naranja">' + porcentaje + '%</span><span class="admin-pro-finanza-unidad">completado</span></div>' +
    '</div>' +
    '<div class="admin-pro-meta" style="margin-top:15px;"><div class="admin-pro-meta-barra"><div class="admin-pro-meta-fill" style="width: ' + porcentaje + '%;"></div></div></div>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>📊 Reportes</h3></div>' +
    '<button class="admin-pro-btn-accion azul" onclick="verEstadisticas()"><span>📊</span> Ver Estadísticas del Día</button>' +
    '<button class="admin-pro-btn-accion verde" onclick="verHistorialRecaudacion()"><span>💵</span> Historial de Recaudación</button>' +
    '<button class="admin-pro-btn-accion morado" onclick="descargarCopiaSeguridad()"><span>📥</span> Descargar Copia de Seguridad</button>' +
    '</div>';
}

function generarContenidoConfig() {
  var cPr = turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche';
  var cPm = turnoActual === 'mediodia' ? 'premio_mediodia' : 'premio_noche';
  var metaDiaria = parseInt((config && config.meta_diaria) || '3000');
  if (isNaN(metaDiaria)) metaDiaria = 3000;
  var cAb = turnoActual === 'mediodia' ? 'turno_mediodia_abierto' : 'turno_noche_abierto';
  var ab = config && config[cAb] === 'true';
  var btnT = ab
    ? '<button class="admin-pro-btn-accion rojo" onclick="cerrarTurno()"><span>🔴</span> Cerrar Turno</button>'
    : '<button class="admin-pro-btn-accion verde" onclick="abrirTurno()"><span>🟢</span> Abrir Turno</button>';
  var boteVisualActual = (config && config.bote_visual !== undefined) ? config.bote_visual : '250';
  var boteEsc = escapeHtml(String(boteVisualActual));
  var fijoMedEsc = escapeHtml((config && config.fijo_mediodia) || '');
  var fijoNocheEsc = escapeHtml((config && config.fijo_noche) || '');

  return '<div class="admin-pro-seccion">' +
    '<div class="admin-pro-seccion-header"><h3>⚙️ Configuración</h3></div>' +
    '<div class="admin-pro-form-grupo"><label>💰 Precio del número</label><div class="admin-pro-input-wrap"><input type="number" id="config-precio" value="' + ((config && config[cPr]) || '50') + '"><span>CUP</span></div></div>' +
    '<div class="admin-pro-form-grupo"><label>🏆 Premio a pagar (Real)</label><div class="admin-pro-input-wrap"><input type="number" id="config-premio" value="' + ((config && config[cPm]) || '250') + '"><span>CUP</span></div></div>' +
    '<div class="admin-pro-form-grupo"><label>🎯 Meta diaria</label><div class="admin-pro-input-wrap"><input type="number" id="config-meta" value="' + metaDiaria + '"><span>CUP</span></div></div>' +
    '<div class="admin-pro-form-grupo"><label>🎯 Aplicar cambios a</label><select id="config-modo"><option value="ambos">🌞🌙 Ambos turnos</option><option value="actual">' + (turnoActual === 'mediodia' ? '☀️ Solo Mediodía' : '🌙 Solo Noche') + '</option></select></div>' +
    '<button class="admin-pro-btn-guardar" onclick="guardarConfig()">💾 Guardar Cambios</button>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px; border-bottom: 2px solid #FF4500;"><h3 style="color:#FF4500;">🔥 Bote Visual (Solo Promoción)</h3></div>' +
    '<p style="font-size:11px; color:rgba(255,255,255,0.7); margin-bottom:10px;">Este monto se muestra en la pantalla de inicio. <strong>No afecta el pago real del premio</strong>. Si pones <strong>0</strong>, el banner se ocultará.</p>' +
    '<div class="admin-pro-form-grupo"><label>Monto del Bote a Mostrar</label><div class="admin-pro-input-wrap"><input type="number" id="config-bote-visual" value="' + boteEsc + '"><span>CUP</span></div></div>' +
    '<button class="admin-pro-btn-guardar" style="background:linear-gradient(135deg, #FF4500, #FF0000); color:#fff;" onclick="guardarBoteVisual()">🔥 Actualizar Bote Visual</button>' +
    '<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">' +
    '<button class="admin-pro-btn-accion rojo" style="margin-bottom:0; background:linear-gradient(135deg,#F44336,#B71C1C);" onclick="resetearBoteVisual()"><span>🔄</span> Restablecer a 250 (Congelar)</button>' +
    '<div style="display: flex; gap: 8px;">' +
    '<button class="admin-pro-btn-accion naranja" style="flex: 1; margin-bottom:0; background:linear-gradient(135deg,#FF9800,#E65100);" onclick="congelarBoteVisual()"><span>⏸️</span> Dejar así</button>' +
    '<button class="admin-pro-btn-accion verde" style="flex: 1; margin-bottom:0; background:linear-gradient(135deg,#2ECC71,#27AE60);" onclick="abrirModalAumentarBote()"><span>➕</span> Aumentar</button>' +
    '</div></div>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>🔄 Control de Turno</h3></div>' +
    '<div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px; margin-bottom: 15px; text-align: center;">' +
    '<p style="color:#FFD700; font-size:14px; font-weight:bold; margin-bottom:10px;">Turno Actual: ' + (turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche') + ' ' + (turnoForzado ? '<span style="color:#F44336;">(FORZADO)</span>' : '<span style="color:#2ECC71;">(AUTOMÁTICO)</span>') + '</p>' +
    '<button class="admin-pro-btn-accion ' + (turnoForzado ? 'azul' : 'naranja') + '" onclick="toggleForzarTurno()"><span>' + (turnoForzado ? '✅' : '⚡') + '</span> ' + (turnoForzado ? 'Volver a Modo Automático' : 'Forzar Cambio de Turno') + '</button>' +
    '</div>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>🔓 Estado del Turno</h3></div>' + btnT +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>🏆 Fijos del Día</h3></div>' +
    '<button class="admin-pro-btn-accion azul" style="margin-bottom: 15px; background:linear-gradient(135deg,#2196F3,#1565C0);" onclick="consultarLoteriaAutomatica()"><span>🔍</span> Consultar Resultado Automático (Florida)</button>' +
    '<button class="admin-pro-btn-accion morado" style="margin-bottom: 15px;" onclick="abrirGestionHistorialAdmin()"><span>📜</span> Gestionar Historial de Fijos</button>' +
    '<button class="admin-pro-btn-accion morado" style="margin-bottom: 15px;" onclick="abrirModalConfigurarFijoManual()"><span>🛠️</span> Configurar Fijo Manual (Histórico)</button>' +
    '<div class="admin-pro-fijo-card"><h4>☀️ Mediodía</h4><div class="admin-pro-fijo-input"><input type="text" id="config-fijo-mediodia" placeholder="Ej: 72" maxlength="2" value="' + fijoMedEsc + '"></div><button class="admin-pro-btn-guardar" onclick="guardarFijoMediodia()">💾 Guardar Fijo</button><button class="admin-pro-btn-accion verde" onclick="publicarResultadoMediodia()" style="margin-top:10px;"><span>🚀</span> Publicar Resultado (App + WhatsApp)</button></div>' +
    '<div class="admin-pro-fijo-card"><h4>🌙 Noche</h4><div class="admin-pro-fijo-input"><input type="text" id="config-fijo-noche" placeholder="Ej: 45" maxlength="2" value="' + fijoNocheEsc + '"></div><button class="admin-pro-btn-guardar" onclick="guardarFijoNoche()">💾 Guardar Fijo</button><button class="admin-pro-btn-accion verde" onclick="publicarResultadoNoche()" style="margin-top:10px;"><span>🚀</span> Publicar Resultado (App + WhatsApp)</button></div>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>🧹 Limpieza</h3></div>' +
    '<button class="admin-pro-btn-accion naranja" onclick="limpiarResultadosManual()"><span>🧹</span> Limpiar Resultados (Mediodía + Noche)</button>' +
    '</div>';
}

function generarContenidoHerramientas() {
  return '<div class="admin-pro-seccion">' +
    '<div class="admin-pro-seccion-header"><h3>🔔 Recordatorios Automáticos</h3></div>' +
    '<p style="font-size:11px; color:rgba(255,255,255,0.7); margin-bottom:10px;">Envía un mensaje de WhatsApp a todos los jugadores que activaron el recordatorio en su perfil.</p>' +
    '<button class="admin-pro-btn-accion" style="background:linear-gradient(135deg,#25D366,#128C7E); color:#fff;" onclick="abrirModalRecordatorioMasivo()"><span>🔔</span> Enviar Recordatorio Masivo</button>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>🛑 Control de Emergencia</h3></div>' +
    '<button class="admin-pro-btn-accion" style="background:linear-gradient(135deg,#F44336,#B71C1C); color:#fff; margin-bottom:10px;" onclick="abrirModalModoPanico()"><span>🚨</span> MODO PÁNICO (Congelar Todo)</button>' +
    '<button class="admin-pro-btn-accion" style="background:linear-gradient(135deg,#FF9800,#E65100); color:#fff;" onclick="abrirModalModoVacaciones()"><span>🏖️</span> Modo Vacaciones</button>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>🔓 Liberar Número Manualmente</h3></div>' +
    '<p style="font-size:11px; color:rgba(255,255,255,0.7); margin-bottom:10px;">Usa esto si un jugador te pide liberar su número por WhatsApp, si un pago fue rechazado, o si necesitas limpiar un número específico.</p>' +
    '<button class="admin-pro-btn-accion naranja" style="background:linear-gradient(135deg,#FF9800,#E65100);" onclick="abrirModalLiberarNumero()"><span>🔓</span> Liberar Número Manualmente</button>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>👁️ Supervisión</h3></div>' +
    '<button class="admin-pro-btn-accion morado" onclick="abrirSupervisionTrabajadores()" style="background:linear-gradient(135deg,#9C27B0,#6A1B9A);"><span>👁️</span> Supervisar Trabajadores (En Vivo)</button>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>👥 Equipo</h3></div>' +
    '<button class="admin-pro-btn-accion azul" onclick="verTrabajadores()"><span>👥</span> Gestionar Trabajadores</button>' +
    '<button class="admin-pro-btn-accion morado" onclick="verLogs()"><span>📊</span> Historial de Acciones</button>' +
    '<button class="admin-pro-btn-accion rojo" onclick="verBloqueados()"><span>🚫</span> Ver Bloqueados</button>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>🏆 Gestión de Jugadores</h3></div>' +
    '<button class="admin-pro-btn-accion azul" onclick="abrirRegistroJugadores()"><span>👥</span> Ver Todos los Jugadores</button>' +
    '<button class="admin-pro-btn-accion naranja" style="margin-top:10px;" onclick="verGestionTop()"><span>🥇</span> Gestionar Top Jugadores</button>' +
    '<button class="admin-pro-btn-accion rosa" style="margin-top:10px;" onclick="abrirControlReferidos()"><span>🎁</span> Control de Referidos</button>' +
    '<button class="admin-pro-btn-accion verde" style="margin-top:10px;" onclick="exportarCSV()"><span>📥</span> Exportar Tickets (Excel/CSV)</button>' +
    '<button class="admin-pro-btn-accion verde" style="margin-top:10px;" onclick="enviarReporteDiarioWA()"><span>📲</span> Enviar Reporte a mi WhatsApp</button>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>💬 Chat y Anuncios</h3></div>' +
    '<button class="admin-pro-btn-accion azul" style="margin-bottom:10px; background:linear-gradient(135deg,#00BCD4,#0097A7);" onclick="abrirModalPushReal()"><span>🔔</span> Enviar Notificación Push (Al Móvil)</button>' +
    '<button class="admin-pro-btn-accion azul" style="margin-bottom:10px;" onclick="abrirModalEnviarNotificacion()"><span>🔔</span> Enviar Aviso (En la App)</button>' +
    '<button class="admin-pro-btn-accion verde" onclick="enviarAnuncioAdmin()"><span>📢</span> Enviar Anuncio Oficial (Chat)</button>' +
    '<button class="admin-pro-btn-accion rojo" onclick="borrarTodoChat()"><span>🗑️</span> Borrar TODO el Chat</button>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>👑 Galería de Ganadores</h3></div>' +
    '<button class="admin-pro-btn-accion rosa" onclick="abrirModalSubirGanador()"><span>📸</span> Subir Foto de Ganador</button>' +
    '<div class="admin-pro-seccion-header" style="margin-top:25px;"><h3>🛑 Sistema</h3></div>' +
    '<button class="admin-pro-btn-accion rojo" onclick="toggleMantenimiento()"><span>🚨</span> Activar/Desactivar Mantenimiento</button>' +
    '<button class="admin-pro-btn-accion azul" style="margin-top:10px;" onclick="diagnosticoApp()"><span>🔍</span> Diagnóstico del Sistema</button>' +
    '</div>';
}

// ============================================
// FIN BLOQUE 16 — Continúa en Bloque 17
// ============================================// ============================================
// BLOQUE 17: PUSH + NOTIFICACIONES + LOGS + ESTADÍSTICAS + PÁNICO + BOTE
// ============================================

function abrirModalPushReal() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-push-real');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-push-real';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #00BCD4;">' +
    '<h2 style="color:#00BCD4; text-align:center;">🔔 Notificación al Móvil</h2>' +
    '<p style="font-size:12px; color:rgba(255,255,255,0.7); text-align:center; margin-bottom:15px;">Sonará en el teléfono incluso si el jugador tiene la app cerrada.</p>' +
    '<label>📝 Título:</label>' +
    '<input type="text" id="push-titulo" value="🎲 La Rifita Cubana" style="margin-bottom:10px;">' +
    '<label>💬 Mensaje:</label>' +
    '<textarea id="push-mensaje" style="width:100%; height:70px; padding:10px; border-radius:10px; border:2px solid #00BCD4; background:rgba(255,255,255,0.1); color:#fff; font-size:14px; margin-bottom:12px; resize:none;" placeholder="Ej: ¡El turno de la noche ya comenzó!"></textarea>' +
    '<label>📱 Teléfono Destino (Opcional):</label>' +
    '<input type="tel" id="push-telefono" placeholder="Dejar vacío para enviar a TODOS" style="margin-bottom:15px;">' +
    '<div class="modal-botones">' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-push-real\'); if(m) m.remove();">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="ejecutarPushReal(event)" style="background:#00BCD4; color:#fff;">🚀 Enviar Push</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

async function ejecutarPushReal(ev) {
  var btn = (ev && ev.target) ? ev.target : document.querySelector('button[onclick*="ejecutarPushReal"]');

  var tituloEl = document.getElementById('push-titulo');
  var mensajeEl = document.getElementById('push-mensaje');
  var telefonoEl = document.getElementById('push-telefono');

  var titulo = tituloEl ? tituloEl.value.trim() : '🎲 La Rifita Cubana';
  var mensaje = mensajeEl ? mensajeEl.value.trim() : '';
  var telefono = telefonoEl ? telefonoEl.value.trim() : '';

  if (!mensaje) { mostrarAlerta('⚠️ Escribe un mensaje', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  if (btn) { btn.disabled = true; btn.innerText = '⏳ Enviando...'; }

  try {
    var query = supabaseClient.from('push_suscripciones').select('telefono,endpoint,p256dh,auth');
    if (telefono) query = query.eq('telefono', telefono);
    var rSuscripciones = await query;

    if (rSuscripciones.error) throw rSuscripciones.error;
    if (!rSuscripciones.data || rSuscripciones.data.length === 0) {
      mostrarAlerta('ℹ️ No hay dispositivos suscritos a notificaciones aún.', 'info');
      if (btn) { btn.disabled = false; btn.innerText = '🚀 Enviar Push'; }
      return;
    }

    var r = await supabaseClient.functions.invoke('clever-handler', {
      body: { suscripciones: rSuscripciones.data, titulo: titulo, mensaje: mensaje }
    });
    if (r.error) throw r.error;

    mostrarAlerta('✅ Notificaciones enviadas a ' + rSuscripciones.data.length + ' dispositivo(s).', 'exito');
    var modal = document.getElementById('modal-push-real');
    if (modal) modal.remove();
    await registrarLog('push_enviado', 'Push enviado a ' + rSuscripciones.data.length + ' dispositivos', '', telefono || 'TODOS', '');
  } catch(e) {
    mostrarAlerta('❌ Error al enviar Push: ' + (e.message || 'Desconocido'), 'error');
    console.error(e);
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = '🚀 Enviar Push'; }
  }
}

function abrirModalEnviarNotificacion() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-enviar-notificacion');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-enviar-notificacion';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700;">' +
    '<h2>🔔 Enviar Notificación (En App)</h2>' +
    '<p style="font-size:12px; color:#FFD700; text-align:center; margin-bottom:15px;">Este mensaje aparecerá solo si el jugador está dentro de la app.</p>' +
    '<label>📝 Mensaje:</label>' +
    '<textarea id="notif-mensaje" style="width:100%; height:80px; padding:10px; border-radius:10px; border:2px solid #FFD700; background:rgba(255,255,255,0.1); color:#fff; font-size:14px; margin-bottom:12px; resize:none;" placeholder="Ej: ¡El turno de la noche ya comenzó!"></textarea>' +
    '<label>🎨 Tipo de Aviso:</label>' +
    '<select id="notif-tipo" style="width:100%; padding:12px; border-radius:10px; border:2px solid #FFD700; background:rgba(255,255,255,0.1); color:#fff; font-size:14px; margin-bottom:12px;">' +
    '<option value="info" style="background:#001A5C; color:#fff;">🔵 Información</option>' +
    '<option value="exito" style="background:#001A5C; color:#fff;">🟢 Éxito</option>' +
    '<option value="alerta" style="background:#001A5C; color:#fff;">🔴 Alerta</option>' +
    '<option value="premio" style="background:#001A5C; color:#fff;">🟡 Premio</option>' +
    '</select>' +
    '<label>📱 Teléfono Destino (Opcional):</label>' +
    '<input type="tel" id="notif-telefono" placeholder="Dejar vacío para enviar a TODOS" style="margin-bottom:10px;">' +
    '<div class="modal-botones">' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-enviar-notificacion\'); if(m) m.remove();">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="ejecutarEnviarNotificacion(event)">🚀 Enviar Aviso</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

async function ejecutarEnviarNotificacion(ev) {
  var btn = (ev && ev.target) ? ev.target : document.querySelector('button[onclick*="ejecutarEnviarNotificacion"]');

  var mensajeEl = document.getElementById('notif-mensaje');
  var tipoEl = document.getElementById('notif-tipo');
  var telefonoEl = document.getElementById('notif-telefono');

  var mensaje = mensajeEl ? mensajeEl.value.trim() : '';
  var tipo = tipoEl ? tipoEl.value : 'info';
  var telefono = telefonoEl ? telefonoEl.value.trim() : '';

  if (!mensaje) { mostrarAlerta('⚠️ El mensaje no puede estar vacío.', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  if (btn) { btn.disabled = true; btn.innerText = '⏳ Enviando...'; }

  try {
    var datos = { mensaje: mensaje, tipo: tipo, leido: false };
    if (telefono) datos.telefono_destino = telefono;

    var r = await supabaseClient.from('avisos').insert([datos]);
    if (r.error) throw r.error;

    mostrarAlerta('✅ Notificación enviada con éxito.', 'exito');
    var modal = document.getElementById('modal-enviar-notificacion');
    if (modal) modal.remove();
    await registrarLog('enviar_notificacion', 'Aviso enviado: ' + mensaje, '', telefono || 'TODOS', '');
  } catch(e) {
    mostrarAlerta('❌ Error al enviar: ' + (e.message || 'Desconocido'), 'error');
    if (btn) { btn.disabled = false; btn.innerText = '🚀 Enviar Aviso'; }
  }
}

async function toggleMantenimiento() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var actual = (config && config.mantenimiento === 'true') ? 'true' : 'false';
  var nuevo = actual === 'true' ? 'false' : 'true';
  var texto = nuevo === 'true' ? 'ACTIVAR modo mantenimiento' : 'DESACTIVAR modo mantenimiento';

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Seguro que quieres ' + texto + '?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('configuracion').upsert({ clave: 'mantenimiento', valor: nuevo }, { onConflict: 'clave' });
    if (r.error) { mostrarAlerta('❌ Error al guardar: ' + r.error.message, 'error'); return; }
    await cargarConfig();
    await registrarLog('mantenimiento', 'Cambiado a: ' + nuevo, '', '', '');
    mostrarAlerta('✅ Mantenimiento ' + (nuevo === 'true' ? 'ACTIVADO' : 'DESACTIVADO'), 'exito');
    refrescarPanelAdmin();
  } catch (e) { mostrarAlerta('❌ Error inesperado: ' + (e.message || 'Desconocido'), 'error'); }
}

async function verLogs() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-logs');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-logs';
  m.innerHTML = '<div class="modal-contenido modal-admin" style="max-height: 85vh; background: #001A5C; border: 2px solid #FFD700;">' +
    '<h2 style="color:#FFD700;">📊 HISTORIAL DE ACCIONES</h2>' +
    '<button class="btn-cerrar-admin" onclick="var m=document.getElementById(\'modal-logs\'); if(m) m.remove();">✖</button>' +
    '<p style="font-size:12px; color:rgba(255,255,255,0.7); text-align:center; margin-bottom:15px;">Últimas 100 acciones del equipo</p>' +
    '<div style="display:flex; gap:8px; margin-bottom:15px;">' +
    '<select id="filtro-logs-accion" onchange="filtrarLogs()" style="flex:1; padding:10px; border-radius:10px; border:2px solid #FFD700; background:rgba(255,255,255,0.1); color:#fff; font-size:12px; font-weight:bold;">' +
    '<option value="todos">Todas las acciones</option>' +
    '<option value="confirmar_pago">✅ Confirmar pago</option>' +
    '<option value="rechazar_pago">❌ Rechazar pago</option>' +
    '<option value="bloquear">🚫 Bloquear</option>' +
    '<option value="desbloquear">🔓 Desbloquear</option>' +
    '<option value="guardar_fijo">🎯 Guardar fijo</option>' +
    '<option value="editar_fijo">✏️ Editar fijo</option>' +
    '<option value="borrar_fijo">🗑️ Borrar fijo</option>' +
    '<option value="guardar_config">⚙️ Guardar config</option>' +
    '<option value="archivar_ticket">📦 Archivar ticket</option>' +
    '<option value="cerrar_turno">🔴 Cerrar turno</option>' +
    '<option value="abrir_turno">🟢 Abrir turno</option>' +
    '<option value="liberar_numero">🔓 Liberar número</option>' +
    '<option value="regenerar">🔄 Regenerar cuadrícula</option>' +
    '<option value="modo_panico">🚨 Modo Pánico</option>' +
    '<option value="modo_vacaciones">🏖️ Modo Vacaciones</option>' +
    '<option value="recordatorio_masivo">🔔 Recordatorio Masivo</option>' +
    '<option value="subir_audio_ganador">🎙️ Audio Ganador</option>' +
    '<option value="limpieza_automatica_total">🧹 Limpieza automática total</option>' +
    '</select>' +
    '<button onclick="verLogs()" style="padding:10px 14px; background:#2196F3; color:#fff; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">🔄</button>' +
    '</div>' +
    '<div id="lista-logs" style="max-height: 450px; overflow-y:auto;"><div class="historial-vacio">Cargando registros...</div></div>' +
    '<button onclick="borrarLogsViejos()" style="width:100%; margin-top:15px; background:#F44336; color:#fff; border:none; padding:12px; border-radius:10px; font-weight:bold; font-size:13px; cursor:pointer;">🗑️ Borrar Logs +30 Días</button>' +
    '</div>';
  document.body.appendChild(m);
  cargarLogs();
}

async function cargarLogs() {
  var cont = document.getElementById('lista-logs');
  if (!cont || document.hidden) return;
  cont.innerHTML = '<div class="historial-vacio">Cargando registros...</div>';

  if (!supabaseClient) {
    cont.innerHTML = '<div class="historial-vacio">Sin conexión al servidor</div>';
    return;
  }

  try {
    var r = await supabaseClient.from('logs_trabajadores').select('id,trabajador_nombre,accion,detalle,numero,telefono_jugador,monto,creado_en').order('creado_en', { ascending: false }).limit(100);
    if (r.error) { cont.innerHTML = '<div class="historial-vacio">Error al cargar: ' + escapeHtml(r.error.message) + '</div>'; return; }
    if (!r.data || r.data.length === 0) { cont.innerHTML = '<div class="historial-vacio">📭 No hay acciones registradas aún.</div>'; return; }

    var html = '';
    r.data.forEach(function(log) {
      var fecha = log.creado_en ? new Date(log.creado_en).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }) : 'N/A';
      var icono = '📌';
      var accionBonita = log.accion || 'accion';

      var mapa = {
        'confirmar_pago': ['✅', 'Confirmar pago'],
        'rechazar_pago': ['❌', 'Rechazar pago'],
        'bloquear': ['🚫', 'Bloquear jugador'],
        'desbloquear': ['🔓', 'Desbloquear'],
        'guardar_fijo': ['🎯', 'Guardar fijo'],
        'editar_fijo': ['✏️', 'Editar fijo'],
        'borrar_fijo': ['🗑️', 'Borrar fijo'],
        'guardar_config': ['⚙️', 'Guardar config'],
        'archivar_ticket': ['📦', 'Archivar ticket'],
        'cerrar_turno': ['🔴', 'Cerrar turno'],
        'abrir_turno': ['🟢', 'Abrir turno'],
        'mantenimiento': ['🚨', 'Mantenimiento'],
        'modo_panico': ['🚨', 'MODO PÁNICO'],
        'modo_vacaciones': ['🏖️', 'Modo Vacaciones'],
        'recordatorio_masivo': ['🔔', 'Recordatorio Masivo'],
        'subir_audio_ganador': ['🎙️', 'Subir Audio Ganador'],
        'regenerar': ['🔄', 'Regenerar cuadrícula'],
        'borrar_todo_chat': ['💬', 'Borrar chat'],
        'agregar_trabajador': ['👥', 'Agregar trabajador'],
        'eliminar_trabajador': ['👤', 'Eliminar trabajador'],
        'enviar_notificacion': ['🔔', 'Enviar Notificación'],
        'reserva_offline': ['📡', 'Reserva Offline'],
        'offline_sincronizada': ['✅', 'Offline Sincronizada'],
        'bono_referido_entregado': ['🎁', 'Bono de Referido Entregado'],
        'jugador_eliminado': ['👤', 'Jugador Eliminó su Perfil'],
        'jugador_borrado_admin': ['🗑️', 'Admin Borró un Jugador'],
        'jugador_reactivado': ['♻️', 'Jugador Reactivado'],
        'reserva_para_revisar': ['⚠️', 'Reserva Marcada para Revisión'],
        'push_enviado': ['🔔', 'Push al Móvil Enviado'],
        'liberar_numero': ['🔓', 'Liberar Número'],
        'limpieza_automatica_total': ['🧹', 'Limpieza Automática TOTAL']
      };

      if (mapa[log.accion]) {
        icono = mapa[log.accion][0];
        accionBonita = mapa[log.accion][1];
      }

      var numHtml = log.numero ? '<p style="font-size:12px; color:#FFD700; margin:2px 0;">🎯 Número: <strong>' + escapeHtml(log.numero) + '</strong></p>' : '';
      var telHtml = log.telefono_jugador ? '<p style="font-size:12px; color:#FFD700; margin:2px 0;">📱 Jugador: ' + escapeHtml(log.telefono_jugador) + '</p>' : '';
      var montoHtml = log.monto ? '<p style="font-size:12px; color:#FFD700; margin:2px 0;">💰 Monto: ' + escapeHtml(log.monto) + ' CUP</p>' : '';

      html += '<div class="log-item" data-accion="' + escapeHtml(log.accion || '') + '">' +
        '<h4>' + icono + ' ' + escapeHtml(accionBonita) + '</h4>' +
        '<p style="font-size:11px; color:rgba(255,255,255,0.6);">👤 ' + escapeHtml(log.trabajador_nombre || 'Sistema') + ' · ' + fecha + '</p>' +
        (log.detalle ? '<p style="font-size:12px; color:#fff; margin:4px 0;">' + escapeHtml(log.detalle) + '</p>' : '') +
        numHtml + telHtml + montoHtml +
        '</div>';
    });
    cont.innerHTML = html;
  } catch(e) { cont.innerHTML = '<div class="historial-vacio">Error: ' + escapeHtml(e.message || 'Desconocido') + '</div>'; }
}

function filtrarLogs() {
  var filtroEl = document.getElementById('filtro-logs-accion');
  if (!filtroEl) return;
  var filtro = filtroEl.value;
  var items = document.querySelectorAll('#lista-logs .log-item');
  var mostrados = 0;
  items.forEach(function(item) {
    if (filtro === 'todos' || item.getAttribute('data-accion') === filtro) {
      item.style.display = 'block';
      mostrados++;
    } else {
      item.style.display = 'none';
    }
  });
  var v = document.querySelector('#lista-logs .filtro-vacio');
  if (v) v.remove();
  if (mostrados === 0) {
    var cont = document.getElementById('lista-logs');
    if (cont) {
      var msg = document.createElement('div');
      msg.className = 'historial-vacio filtro-vacio';
      msg.textContent = '📭 No hay logs con ese filtro.';
      cont.appendChild(msg);
    }
  }
}

async function borrarLogsViejos() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('🗑️ ¿Borrar los logs con más de 30 días de antigüedad?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('logs_trabajadores').select('id,creado_en');
    if (r.error) throw r.error;

    var ahora = new Date();
    var borrados = 0;
    for (var i = 0; i < r.data.length; i++) {
      var log = r.data[i];
      if (!log.creado_en) continue;
      var fechaLog = new Date(log.creado_en);
      var dias = (ahora - fechaLog) / 1000 / 60 / 60 / 24;
      if (dias > 30) {
        await supabaseClient.from('logs_trabajadores').delete().eq('id', log.id);
        borrados++;
      }
    }
    mostrarAlerta(borrados > 0 ? '✅ Se borraron ' + borrados + ' logs viejos.' : 'ℹ️ No hay logs con más de 30 días.', borrados > 0 ? 'exito' : 'info');
    cargarLogs();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function verEstadisticas() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  try {
    var hoy = obtenerFechaFormateada();

    var rHoy = await supabaseClient.from('reservas').select('numero,estado,hora').eq('fecha', hoy);
    var datos = (rHoy && rHoy.data) ? rHoy.data : [];

    var pag = datos.filter(function(x) { return x.estado === 'pagado'; }).length;
    var ocu = datos.filter(function(x) { return x.estado === 'ocupado'; }).length;
    var libres = 100 - datos.length;
    var cPr = turnoActual === 'mediodia' ? 'precio_mediodia' : 'precio_noche';
    var precio = parseInt((config && config[cPr]) || '50');
    if (isNaN(precio)) precio = 50;
    var recaudado = pag * precio;

    var premioMed = (config && config.fijo_mediodia) ? parseInt(config.premio_mediodia || '250') : 0;
    var premioNoche = (config && config.fijo_noche) ? parseInt(config.premio_noche || '250') : 0;
    if (isNaN(premioMed)) premioMed = 0;
    if (isNaN(premioNoche)) premioNoche = 0;
    var premios = premioMed + premioNoche;
    var ganancia = recaudado - premios;

    var conteoNumeros = {};
    datos.forEach(function(r) { if (r.numero) conteoNumeros[r.numero] = (conteoNumeros[r.numero] || 0) + 1; });
    var topNumeros = Object.keys(conteoNumeros).sort(function(a, b) { return conteoNumeros[b] - conteoNumeros[a]; }).slice(0, 10);

    var ventasHora = { "8-10": 0, "10-12": 0, "12-14": 0, "15-17": 0, "17-19": 0, "19-21": 0 };
    datos.forEach(function(r) {
      if (!r.hora) return;
      var h = parseInt(r.hora.split(':')[0]);
      if (isNaN(h)) return;
      if (r.hora.indexOf('PM') !== -1 && h !== 12) h += 12;
      if (h >= 8 && h < 10) ventasHora["8-10"]++;
      else if (h >= 10 && h < 12) ventasHora["10-12"]++;
      else if (h >= 12 && h < 14) ventasHora["12-14"]++;
      else if (h >= 15 && h < 17) ventasHora["15-17"]++;
      else if (h >= 17 && h < 19) ventasHora["17-19"]++;
      else if (h >= 19 && h < 21) ventasHora["19-21"]++;
    });

    var m = document.createElement('div');
    m.className = 'modal';
    m.id = 'modal-estadisticas';
    m.innerHTML = '<div class="modal-contenido modal-admin" style="background: #001A5C; border: 2px solid #FFD700; max-width: 500px;">' +
      '<h2>📊 ESTADÍSTICAS DEL DÍA</h2>' +
      '<button class="btn-cerrar-admin" onclick="var m=document.getElementById(\'modal-estadisticas\'); if(m) m.remove();">✖</button>' +
      '<p style="color:#FFD700;font-size:14px;margin-top:10px;text-align:center;">📅 ' + hoy + '</p>' +
      '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 16px; margin-top: 15px; border: 1px solid #FFD700;">' +
      '<h3 style="color:#FFD700; text-align:center; font-size:14px; margin-bottom:10px;">Estado de la Cuadrícula</h3>' +
      '<canvas id="grafico-estado" width="200" height="200" style="max-width: 100%; margin: 0 auto; display: block;"></canvas>' +
      '</div>' +
      '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 16px; margin-top: 15px; border: 1px solid #FFD700;">' +
      '<h3 style="color:#FFD700; text-align:center; font-size:14px; margin-bottom:10px;">Top 10 Números Más Jugados</h3>' +
      '<canvas id="grafico-numeros" width="400" height="200" style="max-width: 100%; margin: 0 auto; display: block;"></canvas>' +
      '</div>' +
      '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 16px; margin-top: 15px; border: 1px solid #FFD700;">' +
      '<h3 style="color:#FFD700; text-align:center; font-size:14px; margin-bottom:10px;">Ventas por Horario</h3>' +
      '<canvas id="grafico-horas" width="400" height="200" style="max-width: 100%; margin: 0 auto; display: block;"></canvas>' +
      '</div>' +
      '<h3 style="color:#FFD700; margin-top:20px;">💰 TOTAL DEL DÍA</h3>' +
      '<div class="reserva-item" style="background:rgba(46,204,113,0.2);border:2px solid #2ECC71;">' +
      '<p>💵 Total Recaudado: <strong style="color:#2ECC71;font-size:18px;">' + recaudado + ' CUP</strong></p>' +
      '<p>🏆 Total Premios: <strong style="color:#F44336;font-size:18px;">' + premios + ' CUP</strong></p>' +
      '<p>📈 Ganancia Neta: <strong style="color:#FFD700;font-size:20px;">' + ganancia + ' CUP</strong></p>' +
      '</div>' +
      '<button class="btn-control" style="margin-top:15px;background:#2196F3;color:#fff;" onclick="guardarRecaudacionDelDia()">💾 Guardar recaudación del día</button>' +
      '</div>';
    document.body.appendChild(m);

    setTimeout(function() {
      try {
        if (typeof Chart === 'undefined') return;
        var ctx1 = document.getElementById('grafico-estado');
        if (ctx1) {
          new Chart(ctx1.getContext('2d'), {
            type: 'doughnut',
            data: { labels: ['Libres', 'Ocupados', 'Pagados'], datasets: [{ data: [libres, ocu, pag], backgroundColor: ['#2ECC71', '#FFC107', '#F44336'], borderColor: '#001A5C', borderWidth: 3 }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#fff', font: { size: 12, weight: 'bold' } } } } }
          });
        }
        var ctx2 = document.getElementById('grafico-numeros');
        if (ctx2) {
          new Chart(ctx2.getContext('2d'), {
            type: 'bar',
            data: { labels: topNumeros, datasets: [{ label: 'Veces jugado', data: topNumeros.map(function(n) { return conteoNumeros[n]; }), backgroundColor: '#FFD700', borderColor: '#FFA500', borderWidth: 1 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } } }
          });
        }
        var ctx3 = document.getElementById('grafico-horas');
        if (ctx3) {
          new Chart(ctx3.getContext('2d'), {
            type: 'line',
            data: { labels: Object.keys(ventasHora), datasets: [{ label: 'Ventas', data: Object.keys(ventasHora).map(function(k) { return ventasHora[k]; }), backgroundColor: 'rgba(46, 204, 113, 0.3)', borderColor: '#2ECC71', borderWidth: 2, fill: true, tension: 0.4 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } } }
          });
        }
      } catch(e) { console.warn('Error dibujando gráficos:', e); }
    }, 100);
  } catch(e) {
    console.error('Error en verEstadisticas:', e);
    mostrarAlerta('❌ Error al cargar estadísticas: ' + (e.message || 'Desconocido'), 'error');
  }
}

function abrirModalModoPanico() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-modo-panico');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-modo-panico';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 3px solid #F44336;">' +
    '<div style="text-align:center; font-size:60px; margin-bottom:10px;">🚨</div>' +
    '<h2 style="color:#F44336; text-align:center;">MODO PÁNICO</h2>' +
    '<p style="font-size:14px; color:rgba(255,255,255,0.9); text-align:center; margin-bottom:15px; line-height:1.5;">' +
    'Esto <strong style="color:#F44336;">CONGELA TODO</strong>: cierra los turnos, activa el mantenimiento y no deja que nadie juegue.<br><br>' +
    'Úsalo solo en caso de <strong>emergencia real</strong> (hackeo, fraude masivo, ataque).' +
    '</p>' +
    '<div style="background:rgba(244,67,54,0.15); border:2px solid #F44336; border-radius:10px; padding:15px; margin-bottom:15px; font-size:13px; color:#fff; text-align:left;">' +
    '<p style="margin:0 0 8px 0;"><strong style="color:#F44336;">⚠️ Lo que pasará:</strong></p>' +
    '<p style="margin:4px 0;">• Todos los turnos se cerrarán</p>' +
    '<p style="margin:4px 0;">• La app entrará en mantenimiento</p>' +
    '<p style="margin:4px 0;">• Solo TÚ podrás desbloquearlo</p>' +
    '<p style="margin:4px 0;">• Se registrará en logs con la hora</p>' +
    '</div>' +
    '<div class="modal-botones">' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-modo-panico\'); if(m) m.remove();">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="ejecutarModoPanico()" style="background:#F44336; color:#fff;">🚨 CONGELAR TODO</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

async function ejecutarModoPanico() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  try {
    await supabaseClient.from('configuracion').upsert({ clave: 'turno_mediodia_abierto', valor: 'false' }, { onConflict: 'clave' });
    await supabaseClient.from('configuracion').upsert({ clave: 'turno_noche_abierto', valor: 'false' }, { onConflict: 'clave' });
    await supabaseClient.from('configuracion').upsert({ clave: 'mantenimiento', valor: 'true' }, { onConflict: 'clave' });
    await supabaseClient.from('configuracion').upsert({ clave: 'motivo_cierre', valor: 'Sistema temporalmente congelado por seguridad.' }, { onConflict: 'clave' });
    await cargarConfig();
    await registrarLog('modo_panico', 'ACTIVADO - Todo congelado por el admin', '', '', '');
    mostrarAlerta('🚨 MODO PÁNICO ACTIVADO.\n\nTodo está congelado.\n\nSolo tú puedes desbloquearlo.', 'error');
    var modal = document.getElementById('modal-modo-panico');
    if (modal) modal.remove();
    refrescarPanelAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

function abrirModalModoVacaciones() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-modo-vacaciones');
  if (existente) existente.remove();

  var estaActivo = config && config.modo_vacaciones === 'true';
  var msgDefault = (config && config.mensaje_vacaciones) || 'La Rifita está de descanso. Volvemos pronto. ¡Gracias por tu paciencia!';

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-modo-vacaciones';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FF9800;">' +
    '<h2 style="color:#FF9800; text-align:center;">🏖️ Modo Vacaciones</h2>' +
    '<p style="font-size:13px; color:rgba(255,255,255,0.8); text-align:center; margin-bottom:15px;">' +
    (estaActivo ? 'El modo vacaciones está <strong style="color:#FF9800;">ACTIVO</strong>. Los jugadores ven un mensaje de descanso.' : 'Al activarlo, la app mostrará un mensaje de descanso a todos los jugadores. No podrán reservar ni jugar hasta que lo desactives.') +
    '</p>' +
    '<label>📝 Mensaje para los jugadores:</label>' +
    '<textarea id="mensaje-vacaciones-input" style="width:100%; height:80px; padding:10px; border-radius:10px; border:2px solid #FF9800; background:rgba(255,255,255,0.1); color:#fff; font-size:14px; margin-bottom:15px; resize:none;" placeholder="Ej: Volvemos el lunes 15 de enero. ¡Gracias por tu paciencia!">' + escapeHtml(msgDefault) + '</textarea>' +
    '<div style="background:rgba(255,152,0,0.15); border:1px solid #FF9800; border-radius:10px; padding:12px; margin-bottom:15px; font-size:12px; color:#FF9800; font-weight:bold; text-align:center;">' +
    '⚠️ Los pagos pendientes se procesarán normalmente.' +
    '</div>' +
    '<div class="modal-botones">' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-modo-vacaciones\'); if(m) m.remove();">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="ejecutarModoVacaciones()" style="background:' + (estaActivo ? '#2ECC71' : '#FF9800') + '; color:#fff;">' + (estaActivo ? '✅ Desactivar' : '🏖️ Activar') + '</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

async function ejecutarModoVacaciones() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var msgEl = document.getElementById('mensaje-vacaciones-input');
  var msg = msgEl ? msgEl.value.trim() : '';
  var estaActivo = config && config.modo_vacaciones === 'true';
  var nuevoValor = estaActivo ? 'false' : 'true';

  try {
    await supabaseClient.from('configuracion').upsert({ clave: 'modo_vacaciones', valor: nuevoValor }, { onConflict: 'clave' });
    await supabaseClient.from('configuracion').upsert({ clave: 'mensaje_vacaciones', valor: msg }, { onConflict: 'clave' });
    await cargarConfig();
    await registrarLog('modo_vacaciones', nuevoValor === 'true' ? 'ACTIVADO' : 'DESACTIVADO', '', '', '');
    mostrarAlerta(nuevoValor === 'true' ? '🏖️ Modo Vacaciones ACTIVADO.\n\nLos jugadores verán el mensaje de descanso.' : '✅ Modo Vacaciones DESACTIVADO.\n\nLos jugadores pueden volver a jugar.', 'exito');
    var modal = document.getElementById('modal-modo-vacaciones');
    if (modal) modal.remove();
    refrescarPanelAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function congelarBoteVisual() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var boteInput = document.getElementById('config-bote-visual');
  if (!boteInput) return;
  var bote = boteInput.value.trim();
  var boteInt = parseInt(bote);
  if (isNaN(boteInt)) boteInt = parseInt((config && config.bote_visual) || '250');
  if (boteInt < 0) { mostrarAlerta('⚠️ El monto no es válido.', 'error'); return; }

  try {
    var r = await supabaseClient.from('configuracion').upsert({ clave: 'bote_visual', valor: boteInt.toString() }, { onConflict: 'clave' });
    if (r.error) throw r.error;

    config.bote_visual = boteInt.toString();
    var contenedorBote = document.getElementById('contenedor-bote');
    var boteVisual = document.getElementById('texto-bote');
    if (contenedorBote && boteInt > 0) {
      contenedorBote.style.display = 'block';
      if (boteVisual) boteVisual.textContent = boteInt + ' CUP';
    }

    mostrarAlerta('❄️ Bote CONGELADO en ' + boteInt + ' CUP.', 'exito');
    setTimeout(function() { refrescarPanelAdmin(); }, 1500);
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function resetearBoteVisual() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Restablecer el Bote Visual a 250 CUP y congelarlo?');
  if (!confirmado) return;

  try {
    await supabaseClient.from('configuracion').upsert({ clave: 'bote_visual', valor: '250' }, { onConflict: 'clave' });
    await cargarConfig();
    mostrarAlerta('✅ Bote restablecido a 250 CUP.', 'exito');
    refrescarPanelAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

function abrirModalAumentarBote() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var boteInput = document.getElementById('config-bote-visual');
  var boteActual = boteInput ? parseInt(boteInput.value) || 0 : 0;

  var existente = document.getElementById('modal-aumentar-bote');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-aumentar-bote';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #2ECC71;">' +
    '<h2 style="color:#2ECC71; text-align:center;">➕ Aumentar Bote Visual</h2>' +
    '<p style="font-size:13px; color:rgba(255,255,255,0.8); text-align:center; margin-bottom:15px;">Bote actual: <strong style="color:#FFD700; font-size:18px;">' + boteActual + ' CUP</strong></p>' +
    '<label>💰 ¿Cuánto dinero deseas sumarle?</label>' +
    '<input type="number" id="aumento-bote-monto" placeholder="Ej: 100" style="margin-bottom:15px;">' +
    '<p style="font-size:11px; color:#FFC107; text-align:center; font-style:italic; background:rgba(255,193,7,0.1); padding:8px; border-radius:8px;">Esto solo cambia el número en pantalla para atraer jugadores. No afecta el premio real.</p>' +
    '<div class="modal-botones" style="margin-top:15px;">' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-aumentar-bote\'); if(m) m.remove();">Cancelar</button>' +
    '<button class="btn-aceptar" onclick="ejecutarAumentoBote(' + boteActual + ')" style="background:#2ECC71; color:#fff;">🚀 Aumentar</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

async function ejecutarAumentoBote(boteActual) {
  var montoEl = document.getElementById('aumento-bote-monto');
  if (!montoEl) return;
  var aumento = parseInt(montoEl.value);
  if (isNaN(aumento) || aumento <= 0) { mostrarAlerta('⚠️ Por favor, ingresa un monto mayor a 0.', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var nuevoBote = boteActual + aumento;

  try {
    await supabaseClient.from('configuracion').upsert({ clave: 'bote_visual', valor: nuevoBote.toString() }, { onConflict: 'clave' });
    await cargarConfig();

    var contenedorBote = document.getElementById('contenedor-bote');
    var boteVisual = document.getElementById('texto-bote');
    if (contenedorBote) contenedorBote.style.display = 'block';
    if (boteVisual) boteVisual.textContent = nuevoBote + ' CUP';

    mostrarAlerta('✅ ¡Bote aumentado!\n\nNuevo monto: ' + nuevoBote + ' CUP', 'exito');
    var modal = document.getElementById('modal-aumentar-bote');
    if (modal) modal.remove();
    refrescarPanelAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function consultarLoteriaAutomatica() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var botones = document.querySelectorAll('button[onclick*="consultarLoteriaAutomatica"]');
  var btn = botones[0];
  var textoOriginal = btn ? btn.innerHTML : '🔍 Consultar Resultado';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Consultando...'; }

  try {
    var res = await supabaseClient.functions.invoke('rapid-worker', { body: {} });

    if (res.error) {
      var mensajeError = res.error.message;
      if (res.error.context) {
        try {
          var cuerpoError = await res.error.context.json();
          if (cuerpoError && cuerpoError.error) mensajeError = cuerpoError.error;
        } catch(e) {}
      }
      throw new Error(mensajeError);
    }

    var datos = res.data;
    if (!datos || !datos.exito) throw new Error((datos && datos.error) || 'La función no devolvió datos válidos.');

    var inputMediodia = document.getElementById('config-fijo-mediodia');
    var inputNoche = document.getElementById('config-fijo-noche');
    if (inputMediodia && datos.mediodia) inputMediodia.value = datos.mediodia;
    if (inputNoche && datos.noche) inputNoche.value = datos.noche;

    var fechaHoy = obtenerFechaFormateada();
    var horaPublicacion = new Date().toISOString();

    if (datos.mediodia) {
      var premioMed = parseInt((config && config.premio_mediodia) || '250');
      if (isNaN(premioMed)) premioMed = 250;
      await supabaseClient.from('configuracion').upsert({ clave: 'fijo_mediodia', valor: datos.mediodia }, { onConflict: 'clave' });

      var checkMed = await supabaseClient.from('historial_fijos').select('id').eq('fecha', fechaHoy).eq('turno', 'mediodia');
      if (!checkMed.data || checkMed.data.length === 0) {
        await supabaseClient.from('historial_fijos').insert([{
          fecha: fechaHoy,
          anio: new Date().getFullYear().toString(),
          turno: 'mediodia',
          fijo: datos.mediodia,
          premio: premioMed.toString(),
          ganador_nombre: 'Por definir',
          ganador_telefono: null,
          hora: '',
          codigo_ticket: '',
          pagado: false,
          publicado_en: horaPublicacion
        }]);
      } else {
        await supabaseClient.from('historial_fijos').update({ fijo: datos.mediodia, publicado_en: horaPublicacion }).eq('fecha', fechaHoy).eq('turno', 'mediodia');
      }
    }

    if (datos.noche) {
      var premioNoche = parseInt((config && config.premio_noche) || '250');
      if (isNaN(premioNoche)) premioNoche = 250;
      await supabaseClient.from('configuracion').upsert({ clave: 'fijo_noche', valor: datos.noche }, { onConflict: 'clave' });

      var checkNoche = await supabaseClient.from('historial_fijos').select('id').eq('fecha', fechaHoy).eq('turno', 'noche');
      if (!checkNoche.data || checkNoche.data.length === 0) {
        await supabaseClient.from('historial_fijos').insert([{
          fecha: fechaHoy,
          anio: new Date().getFullYear().toString(),
          turno: 'noche',
          fijo: datos.noche,
          premio: premioNoche.toString(),
          ganador_nombre: 'Por definir',
          ganador_telefono: null,
          hora: '',
          codigo_ticket: '',
          pagado: false,
          publicado_en: horaPublicacion
        }]);
      } else {
        await supabaseClient.from('historial_fijos').update({ fijo: datos.noche, publicado_en: horaPublicacion }).eq('fecha', fechaHoy).eq('turno', 'noche');
      }
    }

    await cargarConfig();
    actualizarResultadoEnPantalla();

    var historialSec = document.getElementById('historial');
    if (historialSec && historialSec.classList.contains('activa')) {
      cargarHistorialFiltrado();
    }

    mostrarAlerta('✅ ¡Resultados obtenidos y GUARDADOS en el historial automáticamente!\n\n☀️ Mediodía: ' + datos.mediodia + '\n🌙 Noche: ' + datos.noche, 'exito');
  } catch (error) {
    console.error('Error al consultar lotería:', error);
    mostrarAlerta('⚠️ No se pudo obtener el resultado automático.\n\nDetalle: ' + (error.message || 'Error de red o timeout') + '\n\n💡 Puedes ingresar los números manualmente.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
  }
}

// ============================================
// FIN BLOQUE 17 — Continúa en Bloque 18
// ============================================// ============================================
// BLOQUE 18: REFERIDOS ADMIN + REGISTRO JUGADORES + TOP + HISTORIAL ADMIN
// ============================================

async function abrirControlReferidos() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-control-referidos');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-control-referidos';
  m.innerHTML = '<div class="modal-contenido modal-admin-pro" style="max-height: 92vh; background:#001A5C; border:2px solid #FFD700;">' +
    '<div class="admin-pro-header" style="background: linear-gradient(135deg, #E91E63, #AD1457); border-radius: 21px 21px 0 0; padding-bottom: 15px;">' +
    '<div class="admin-pro-header-info">' +
    '<div class="admin-pro-badge" style="background: rgba(0,0,0,0.3); color: #fff;">🎁 REFERIDOS</div>' +
    '<h1 style="color:#fff;">Control de Referidos</h1>' +
    '<p style="color:rgba(255,255,255,0.85); font-size:11px;">Actualizado: <span id="ref-updated">--</span></p>' +
    '</div>' +
    '<button class="admin-pro-close" onclick="cerrarControlReferidos()" style="color:#fff;">✖</button>' +
    '</div>' +
    '<div style="padding: 15px;">' +
    '<button onclick="cargarControlReferidos()" style="width:100%; padding:12px; background:#2196F3; color:#fff; border:none; border-radius:10px; font-weight:bold; cursor:pointer; font-size:13px; margin-bottom:15px;">🔄 Refrescar</button>' +
    '<div id="ref-contenido" style="max-height: 65vh; overflow-y:auto;">' +
    '<div class="historial-vacio">Cargando datos...</div>' +
    '</div>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
  await cargarControlReferidos();
}

async function cargarControlReferidos() {
  var cont = document.getElementById('ref-contenido');
  var updated = document.getElementById('ref-updated');
  if (!cont || document.hidden) return;
  cont.innerHTML = '<div class="historial-vacio">Cargando...</div>';

  if (!supabaseClient) {
    cont.innerHTML = '<div class="historial-vacio">Sin conexión al servidor</div>';
    return;
  }

  try {
    var r = await supabaseClient.from('puntos_jugadores').select('telefono,nombre,referidos_count,bono_5_entregado,fecha_bono_entregado').gt('referidos_count', 0).order('referidos_count', { ascending: false });
    if (r.error) throw r.error;

    var datos = r.data || [];
    var pendientes = datos.filter(function(j) { return (j.referidos_count || 0) >= 5 && !j.bono_5_entregado; });
    var entregados = datos.filter(function(j) { return (j.referidos_count || 0) >= 5 && j.bono_5_entregado; });
    var cerca = datos.filter(function(j) { return (j.referidos_count || 0) >= 1 && (j.referidos_count || 0) < 5; });

    var html = '<div style="background: rgba(0,0,0,0.3); border-radius:12px; padding:14px; margin-bottom:15px; border:2px solid #FFD700;">' +
      '<h3 style="color:#FFD700; font-size:13px; margin:0 0 10px; text-align:center;">📊 RESUMEN</h3>' +
      '<div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; text-align:center;">' +
      '<div><div style="font-size:24px; font-weight:900; color:#F44336;">' + pendientes.length + '</div><div style="font-size:10px; color:#fff; margin-top:4px;">🔴 Pendientes</div></div>' +
      '<div><div style="font-size:24px; font-weight:900; color:#2ECC71;">' + entregados.length + '</div><div style="font-size:10px; color:#fff; margin-top:4px;">✅ Entregados</div></div>' +
      '<div><div style="font-size:24px; font-weight:900; color:#FFC107;">' + cerca.length + '</div><div style="font-size:10px; color:#fff; margin-top:4px;">🟡 Cerca de 5</div></div>' +
      '<div><div style="font-size:24px; font-weight:900; color:#FFD700;">' + datos.length + '</div><div style="font-size:10px; color:#fff; margin-top:4px;">👥 Total invitaron</div></div>' +
      '</div></div>';

    if (pendientes.length > 0) {
      html += '<div class="admin-pro-seccion-header" style="margin-top:20px;"><h3 style="color:#F44336;">🔴 PENDIENTES DE ENTREGAR (' + pendientes.length + ')</h3></div>';
      pendientes.forEach(function(j) { html += renderReferidoCard(j, 'pendiente'); });
    }
    if (entregados.length > 0) {
      html += '<div class="admin-pro-seccion-header" style="margin-top:20px;"><h3 style="color:#2ECC71;">✅ YA ENTREGADOS (' + entregados.length + ')</h3></div>';
      entregados.forEach(function(j) { html += renderReferidoCard(j, 'entregado'); });
    }
    if (cerca.length > 0) {
      html += '<div class="admin-pro-seccion-header" style="margin-top:20px;"><h3 style="color:#FFC107;">🟡 CERCA DE 5 (' + cerca.length + ')</h3></div>';
      cerca.forEach(function(j) { html += renderReferidoCard(j, 'cerca'); });
    }
    if (datos.length === 0) {
      html += '<div class="admin-pro-vacio"><div style="font-size:48px;">👥</div><p>Nadie ha invitado amigos aún</p></div>';
    }

    cont.innerHTML = html;
    if (updated) updated.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  } catch(e) {
    cont.innerHTML = '<div class="historial-vacio">❌ Error: ' + escapeHtml(e.message || 'Desconocido') + '</div>';
  }
}

function renderReferidoCard(j, estado) {
  var colorBorde = estado === 'pendiente' ? '#F44336' : (estado === 'entregado' ? '#2ECC71' : '#FFC107');
  var count = j.referidos_count || 0;
  var nombreEsc = escapeHtml(j.nombre || 'Sin nombre');
  var telEsc = escapeHtml(j.telefono || 'N/A');
  var telAttr = (j.telefono || '').replace(/[^0-9]/g, '');
  // FIX #5: escapeAttr para apóstrofes en nombres
  var nombreSafe = escapeAttr(j.nombre || 'Sin nombre');
  var btnAcciones = '';

  if (estado === 'pendiente') {
    btnAcciones = '<div style="display:flex; gap:8px; margin-top:10px;">' +
      '<button onclick="marcarBonoEntregado(\'' + telAttr + '\', \'' + nombreSafe + '\')" style="flex:1; padding:10px; background:#2ECC71; color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:12px; cursor:pointer;">✅ Marcar entregado</button>' +
      '<button onclick="avisarGanadorBonoWA(\'' + telAttr + '\', \'' + nombreSafe + '\')" style="flex:1; padding:10px; background:#25D366; color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:12px; cursor:pointer;">📲 WhatsApp</button>' +
      '</div>';
  } else if (estado === 'entregado') {
    var fechaBono = escapeHtml(j.fecha_bono_entregado || '');
    btnAcciones = '<div style="background:rgba(46,204,113,0.15); border:1px solid #2ECC71; border-radius:8px; padding:8px; margin-top:10px; text-align:center; font-size:11px; color:#2ECC71; font-weight:bold;">✅ Entregado' + (fechaBono ? ' el ' + fechaBono : '') + '</div>';
  } else {
    var falta = 5 - count;
    btnAcciones = '<div style="background:rgba(255,193,7,0.15); border:1px solid #FFC107; border-radius:8px; padding:8px; margin-top:10px; text-align:center; font-size:11px; color:#FFC107; font-weight:bold;">Le faltan ' + falta + ' amigo' + (falta !== 1 ? 's' : '') + ' para su bono</div>';
  }

  return '<div style="background:rgba(255,255,255,0.05); border:2px solid ' + colorBorde + '; border-radius:14px; padding:14px; margin-bottom:12px;">' +
    '<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">' +
    '<div style="font-size:24px;">👤</div>' +
    '<div style="flex:1; min-width:0;">' +
    '<h4 style="color:#fff; font-size:15px; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + nombreEsc + '</h4>' +
    '<p style="color:rgba(255,255,255,0.6); font-size:11px; margin:2px 0 0;">📱 ' + telEsc + '</p>' +
    '</div>' +
    '<div style="background:' + colorBorde + '; color:#fff; padding:6px 12px; border-radius:10px; font-weight:900; font-size:14px; flex-shrink:0;">' + count + ' ' + (count === 1 ? 'amigo' : 'amigos') + '</div>' +
    '</div>' +
    '<button onclick="verQuienInvito(\'' + telAttr + '\')" style="width:100%; padding:8px; background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.3); border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer; margin-bottom:5px;">👁️ Ver quién invitó</button>' +
    btnAcciones +
    '</div>';
}

async function verQuienInvito(telefonoReferente) {
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  try {
    var r = await supabaseClient.from('puntos_jugadores').select('telefono,nombre').eq('referido_por', telefonoReferente);
    if (r.error) throw r.error;

    var invitados = r.data || [];
    var lista = invitados.map(function(inv, i) {
      return '<div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);"><strong style="color:#FFD700;">' + (i + 1) + '.</strong> ' + escapeHtml(inv.nombre || 'Sin nombre') + ' · 📱 ' + escapeHtml(inv.telefono || 'N/A') + '</div>';
    }).join('');

    var existente = document.getElementById('modal-quien-invito');
    if (existente) existente.remove();

    var m = document.createElement('div');
    m.className = 'modal';
    m.id = 'modal-quien-invito';
    m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700;">' +
      '<h2 style="color:#FFD700; text-align:center;">👥 Amigos invitados</h2>' +
      '<p style="color:rgba(255,255,255,0.7); text-align:center; font-size:12px; margin-bottom:15px;">Total: ' + invitados.length + ' ' + (invitados.length === 1 ? 'amigo' : 'amigos') + '</p>' +
      '<div style="max-height:50vh; overflow-y:auto; background:rgba(0,0,0,0.2); border-radius:10px; padding:10px;">' +
      (invitados.length > 0 ? lista : '<p style="text-align:center; padding:20px; color:rgba(255,255,255,0.5);">Sin invitados</p>') +
      '</div>' +
      '<button onclick="var m=document.getElementById(\'modal-quien-invito\'); if(m) m.remove();" style="width:100%; margin-top:15px; padding:12px; background:#FFD700; color:#002A8F; border:none; border-radius:10px; font-weight:bold; font-size:14px; cursor:pointer;">Cerrar</button>' +
      '</div>';
    document.body.appendChild(m);
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function marcarBonoEntregado(telefono, nombre) {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('✅ ¿Marcar el bono de 5 referidos como ENTREGADO a ' + nombre + '?');
  if (!confirmado) return;

  try {
    var hoy = obtenerFechaFormateada();
    var r = await supabaseClient.from('puntos_jugadores').update({ bono_5_entregado: true, fecha_bono_entregado: hoy }).eq('telefono', telefono);
    if (r.error) throw r.error;

    await registrarLog('bono_referido_entregado', 'Bono entregado a ' + nombre + ' (' + telefono + ')', '', telefono, '');
    try {
      await supabaseClient.from('avisos').insert([{
        telefono_destino: telefono,
        mensaje: '🎁 ¡Tu número gratis por invitar a 5 amigos YA FUE ENTREGADO! Contacta al admin para elegir tu número.',
        tipo: 'premio',
        leido: false
      }]);
    } catch(e) {}

    mostrarAlerta('✅ Bono marcado como entregado a ' + nombre, 'exito');
    await cargarControlReferidos();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

function avisarGanadorBonoWA(telefono, nombre) {
  var tel = (telefono || '').replace(/[^0-9]/g, '');
  if (!tel) { mostrarAlerta('Teléfono inválido.', 'error'); return; }
  var msg = '🎁 ¡Hola ' + nombre + '! Ganaste tu NÚMERO GRATIS por invitar a 5 amigos en La Rifita Cubana.\n\n¿Qué número quieres para el próximo sorteo? 🎲\n\nResponde este mensaje y te lo reservamos.';
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(msg), '_blank');
}

function cerrarControlReferidos() {
  var m = document.getElementById('modal-control-referidos');
  if (m) m.remove();
}

async function abrirRegistroJugadores() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-registro-jugadores');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-registro-jugadores';
  m.innerHTML = '<div class="modal-contenido modal-admin-pro" style="max-height: 92vh; background:#001A5C; border:2px solid #FFD700;">' +
    '<div class="admin-pro-header" style="background: linear-gradient(135deg, #2196F3, #1565C0); border-radius: 21px 21px 0 0; padding-bottom: 15px;">' +
    '<div class="admin-pro-header-info">' +
    '<div class="admin-pro-badge" style="background: rgba(0,0,0,0.3); color: #fff;">👥 REGISTRO</div>' +
    '<h1 style="color:#fff;">Todos los Jugadores</h1>' +
    '<p style="color:rgba(255,255,255,0.85); font-size:11px;">Actualizado: <span id="regjug-updated">--</span></p>' +
    '</div>' +
    '<button class="admin-pro-close" onclick="cerrarRegistroJugadores()" style="color:#fff;">✖</button>' +
    '</div>' +
    '<div style="padding: 15px;">' +
    '<button onclick="cargarRegistroJugadores(\'todos\')" style="width:100%; padding:12px; background:#2196F3; color:#fff; border:none; border-radius:10px; font-weight:bold; cursor:pointer; font-size:13px; margin-bottom:15px;">🔄 Refrescar</button>' +
    '<div id="regjug-filtros" style="display:flex; gap:6px; margin-bottom:15px; flex-wrap:wrap;"></div>' +
    '<div id="regjug-contenido" style="max-height: 60vh; overflow-y:auto;">' +
    '<div class="historial-vacio">Cargando datos...</div>' +
    '</div>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
  await cargarRegistroJugadores('todos');
}

async function cargarRegistroJugadores(filtro) {
  var cont = document.getElementById('regjug-contenido');
  var updated = document.getElementById('regjug-updated');
  if (!cont || document.hidden) return;
  cont.innerHTML = '<div class="historial-vacio">Cargando...</div>';

  if (!supabaseClient) {
    cont.innerHTML = '<div class="historial-vacio">Sin conexión al servidor</div>';
    return;
  }

  try {
    var r = await supabaseClient.from('puntos_jugadores').select('telefono,nombre,foto_perfil,puntos,nivel,referidos_count,estado,fecha_registro,ultima_conexion,referido_por').order('ultima_conexion', { ascending: false, nullsFirst: false });
    if (r.error) throw r.error;

    var datos = r.data || [];
    datos.forEach(function(j) { if (!j.estado) j.estado = 'activo'; });

    var activos = datos.filter(function(j) { return j.estado === 'activo'; });
    var inactivos = datos.filter(function(j) { return j.estado === 'inactivo'; });
    var eliminados = datos.filter(function(j) { return j.estado === 'eliminado'; });

    var filtrosHtml =
      '<button onclick="cargarRegistroJugadores(\'todos\')" style="flex:1; padding:10px; background:' + (filtro === 'todos' ? '#FFD700' : 'rgba(255,255,255,0.1)') + '; color:' + (filtro === 'todos' ? '#001A5C' : '#fff') + '; border:2px solid #FFD700; border-radius:10px; font-weight:bold; font-size:12px; cursor:pointer;">👥 Todos (' + datos.length + ')</button>' +
      '<button onclick="cargarRegistroJugadores(\'activo\')" style="flex:1; padding:10px; background:' + (filtro === 'activo' ? '#2ECC71' : 'rgba(255,255,255,0.1)') + '; color:#fff; border:2px solid #2ECC71; border-radius:10px; font-weight:bold; font-size:12px; cursor:pointer;">🟢 Activos (' + activos.length + ')</button>' +
      '<button onclick="cargarRegistroJugadores(\'inactivo\')" style="flex:1; padding:10px; background:' + (filtro === 'inactivo' ? '#FFC107' : 'rgba(255,255,255,0.1)') + '; color:' + (filtro === 'inactivo' ? '#001A5C' : '#fff') + '; border:2px solid #FFC107; border-radius:10px; font-weight:bold; font-size:12px; cursor:pointer;">🟡 Inactivos (' + inactivos.length + ')</button>' +
      '<button onclick="cargarRegistroJugadores(\'eliminado\')" style="flex:1; padding:10px; background:' + (filtro === 'eliminado' ? '#F44336' : 'rgba(255,255,255,0.1)') + '; color:#fff; border:2px solid #F44336; border-radius:10px; font-weight:bold; font-size:12px; cursor:pointer;">⚫ Eliminados (' + eliminados.length + ')</button>';

    var contFiltros = document.getElementById('regjug-filtros');
    if (contFiltros) contFiltros.innerHTML = filtrosHtml;

    var lista = datos;
    if (filtro === 'activo') lista = activos;
    else if (filtro === 'inactivo') lista = inactivos;
    else if (filtro === 'eliminado') lista = eliminados;

    if (lista.length === 0) {
      cont.innerHTML = '<div class="admin-pro-vacio"><div style="font-size:48px;">👥</div><p>No hay jugadores con este filtro</p></div>';
    } else {
      var html = '';
      lista.forEach(function(j) { html += renderJugadorCard(j); });
      cont.innerHTML = html;
    }

    if (updated) updated.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  } catch(e) {
    cont.innerHTML = '<div class="historial-vacio">❌ Error: ' + escapeHtml(e.message || 'Desconocido') + '</div>';
  }
}

function renderJugadorCard(j) {
  var estado = j.estado || 'activo';
  var colorBorde, emoji, textoEstado;
  if (estado === 'activo') { colorBorde = '#2ECC71'; emoji = '🟢'; textoEstado = 'ACTIVO'; }
  else if (estado === 'inactivo') { colorBorde = '#FFC107'; emoji = '🟡'; textoEstado = 'INACTIVO'; }
  else if (estado === 'eliminado') { colorBorde = '#F44336'; emoji = '⚫'; textoEstado = 'ELIMINADO'; }
  else { colorBorde = '#2ECC71'; emoji = '🟢'; textoEstado = 'ACTIVO'; }

  var fotoEsc = j.foto_perfil ? escapeHtml(j.foto_perfil) : '';
  var fotoHtml = fotoEsc
    ? '<img src="' + fotoEsc + '" style="width:42px; height:42px; border-radius:50%; border:2px solid ' + colorBorde + '; object-fit:cover;" loading="lazy" alt="Avatar">'
    : '<div style="width:42px; height:42px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:20px; border:2px solid ' + colorBorde + ';">👤</div>';

  var nombreEsc = escapeHtml(j.nombre || 'Sin nombre');
  // FIX #5: escapeAttr para apóstrofes en nombres
  var nombreSafe = escapeAttr(j.nombre || 'Sin nombre');
  var telEsc = escapeHtml(j.telefono || 'N/A');
  var telLimpio = (j.telefono || '').replace(/[^0-9]/g, '');
  var nivelEsc = escapeHtml(j.nivel || 'Novato');
  var referidoPorEsc = j.referido_por ? escapeHtml(j.referido_por) : '';
  var fechaRegEsc = escapeHtml(j.fecha_registro || 'N/A');
  var ultimaConexEsc = escapeHtml(j.ultima_conexion || 'N/A');

  var botonesAcciones = '';
  if (estado === 'eliminado') {
    botonesAcciones = '<button onclick="reactivarJugadorAdmin(\'' + telLimpio + '\', \'' + nombreSafe + '\')" style="flex:1; padding:8px; background:#2ECC71; color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:11px; cursor:pointer;">♻️ Reactivar</button>' +
      '<button onclick="borrarJugadorAdmin(\'' + telLimpio + '\', \'' + nombreSafe + '\')" style="flex:1; padding:8px; background:#F44336; color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:11px; cursor:pointer;">🗑️ Borrar de Verdad</button>';
  } else {
    botonesAcciones = '<button onclick="window.open(\'https://wa.me/' + telLimpio + '?text=' + encodeURIComponent('Hola ' + (j.nombre || '')) + '\')" style="flex:1; padding:8px; background:#25D366; color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:11px; cursor:pointer;">📲 WhatsApp</button>' +
      '<button onclick="borrarJugadorAdmin(\'' + telLimpio + '\', \'' + nombreSafe + '\')" style="flex:1; padding:8px; background:#F44336; color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:11px; cursor:pointer;">🗑️ Borrar</button>';
  }

  return '<div style="background:rgba(255,255,255,0.05); border:2px solid ' + colorBorde + '; border-radius:14px; padding:14px; margin-bottom:12px;">' +
    '<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">' +
    fotoHtml +
    '<div style="flex:1; min-width:0;">' +
    '<h4 style="color:#fff; font-size:15px; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + nombreEsc + '</h4>' +
    '<p style="color:rgba(255,255,255,0.6); font-size:11px; margin:2px 0 0;">📱 ' + telEsc + '</p>' +
    '</div>' +
    '<div style="background:' + colorBorde + '; color:#fff; padding:4px 10px; border-radius:10px; font-weight:900; font-size:10px; flex-shrink:0;">' + emoji + ' ' + textoEstado + '</div>' +
    '</div>' +
    '<div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-bottom:10px;">' +
    '<div style="background:rgba(255,215,0,0.15); padding:6px 8px; border-radius:8px; border:1px solid rgba(255,215,0,0.4);">' +
    '<div style="font-size:9px; color:rgba(255,255,255,0.7); text-transform:uppercase; font-weight:bold;">⭐ Puntos</div>' +
    '<div style="font-size:14px; color:#FFD700; font-weight:900;">' + (j.puntos || 0) + '</div>' +
    '</div>' +
    '<div style="background:rgba(46,204,113,0.15); padding:6px 8px; border-radius:8px; border:1px solid rgba(46,204,113,0.4);">' +
    '<div style="font-size:9px; color:rgba(255,255,255,0.7); text-transform:uppercase; font-weight:bold;">🎁 Referidos</div>' +
    '<div style="font-size:14px; color:#2ECC71; font-weight:900;">' + (j.referidos_count || 0) + '</div>' +
    '</div>' +
    '</div>' +
    '<div style="background:rgba(0,0,0,0.2); padding:8px; border-radius:8px; margin-bottom:10px; font-size:11px;">' +
    '<p style="margin:3px 0; color:rgba(255,255,255,0.7);"><strong style="color:#FFD700;">📅 Registro:</strong> ' + fechaRegEsc + '</p>' +
    '<p style="margin:3px 0; color:rgba(255,255,255,0.7);"><strong style="color:#FFD700;">🕐 Última conexión:</strong> ' + ultimaConexEsc + '</p>' +
    '<p style="margin:3px 0; color:rgba(255,255,255,0.7);"><strong style="color:#FFD700;">🏅 Nivel:</strong> ' + nivelEsc + '</p>' +
    (referidoPorEsc ? '<p style="margin:3px 0; color:rgba(255,255,255,0.7);"><strong style="color:#FFD700;">👥 Invitado por:</strong> ' + referidoPorEsc + '</p>' : '') +
    '</div>' +
    '<div style="display:flex; gap:6px;">' + botonesAcciones + '</div>' +
    '</div>';
}

async function borrarJugadorAdmin(telefono, nombre) {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿BORRAR DEFINITIVAMENTE a ' + nombre + '?\n\nEsto lo elimina de la base de datos.\n\nSi solo quieres desactivarlo, usa el filtro "Eliminados" en el panel.');
  if (!confirmado) return;

  var confirmado2 = await mostrarConfirmacionCustom('🚨 CONFIRMACIÓN FINAL\n\n¿Estás COMPLETAMENTE SEGURO?\n\nEsta acción NO se puede deshacer.');
  if (!confirmado2) return;

  try {
    var r = await supabaseClient.from('puntos_jugadores').delete().eq('telefono', telefono);
    if (r.error) throw r.error;

    await registrarLog('jugador_borrado_admin', 'Admin borró a ' + nombre + ' (' + telefono + ')', '', telefono, '');
    mostrarAlerta('✅ ' + nombre + ' eliminado definitivamente.', 'exito');
    await cargarRegistroJugadores('todos');
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function reactivarJugadorAdmin(telefono, nombre) {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('♻️ ¿Reactivar a ' + nombre + '?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('puntos_jugadores').update({ estado: 'activo', ultima_conexion: obtenerFechaFormateada() + ' (reactivado por admin)' }).eq('telefono', telefono);
    if (r.error) throw r.error;

    await registrarLog('jugador_reactivado', 'Admin reactivó a ' + nombre + ' (' + telefono + ')', '', telefono, '');
    mostrarAlerta('✅ ' + nombre + ' reactivado.', 'exito');
    await cargarRegistroJugadores('todos');
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

function cerrarRegistroJugadores() {
  var m = document.getElementById('modal-registro-jugadores');
  if (m) m.remove();
}

async function abrirGestionHistorialAdmin() {
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var existente = document.getElementById('modal-gestion-historial');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-gestion-historial';
  m.innerHTML = '<div class="modal-contenido modal-admin" style="max-height: 85vh; background: #001A5C; border: 2px solid #FFD700;">' +
    '<h2>📜 GESTIONAR HISTORIAL</h2>' +
    '<button class="btn-cerrar-admin" onclick="var m=document.getElementById(\'modal-gestion-historial\'); if(m) m.remove();">✖</button>' +
    '<div style="margin-top:20px; max-height:400px; overflow-y:auto;" id="lista-historial-admin"><div class="historial-vacio">Cargando...</div></div>' +
    '</div>';
  document.body.appendChild(m);

  var cont = document.getElementById('lista-historial-admin');
  try {
    var r = await supabaseClient.from('historial_fijos').select('id,turno,fecha,fijo,ganador_nombre,premio').order('creado_en', { ascending: false }).limit(50);
    if (r.error || !r.data || r.data.length === 0) {
      cont.innerHTML = '<div class="historial-vacio">No hay historial</div>';
      return;
    }
    var html = '';
    r.data.forEach(function(h) {
      var turnoTxt = h.turno === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche';
      html += '<div class="historial-item">' +
        '<h4>' + turnoTxt + ' - ' + escapeHtml(h.fecha || 'N/A') + '</h4>' +
        '<p>🎯 Fijo: <span class="ganador">' + escapeHtml(h.fijo || '--') + '</span></p>' +
        '<p>👤 Ganador: ' + escapeHtml(h.ganador_nombre || 'Sin ganador') + '</p>' +
        '<p>💰 Premio: ' + escapeHtml(String(h.premio || '250')) + ' CUP</p>' +
        '<div class="historial-botones">' +
        '<button class="btn-editar-fijo" onclick="editarFijo(' + h.id + ')">✏️ Editar</button>' +
        '<button class="btn-borrar-fijo" onclick="borrarFijo(' + h.id + ')">🗑️ Borrar</button>' +
        '</div></div>';
    });
    cont.innerHTML = html;
  } catch(e) { cont.innerHTML = '<div class="historial-vacio">Error al cargar.</div>'; }
}

async function verGestionTop() {
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var existente = document.getElementById('modal-gestion-top');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-gestion-top';

  var r = await supabaseClient.from('puntos_jugadores').select('telefono,nombre,puntos').order('puntos', { ascending: false }).limit(50);
  var lista = '';
  if (r.data && r.data.length > 0) {
    r.data.forEach(function(jugador) {
      var nombreEsc = escapeHtml(jugador.nombre || 'Sin nombre');
      var telEsc = escapeHtml(jugador.telefono || 'N/A');
      var telAttr = (jugador.telefono || '').replace(/[^0-9]/g, '');
      // FIX #5: escapeAttr para apóstrofes
      var nombreSafe = escapeAttr(jugador.nombre || 'Sin nombre');
      lista += '<div class="reserva-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:8px; border-left:4px solid #FFD700;">' +
        '<div><p><strong>' + nombreEsc + '</strong></p><p style="font-size:12px; color:rgba(255,255,255,0.7);">' + telEsc + ' - ' + (jugador.puntos || 0) + ' pts</p></div>' +
        '<button onclick="borrarJugadorTop(\'' + telAttr + '\', \'' + nombreSafe + '\')" style="background:#F44336; color:#fff; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer;">🗑️ Borrar</button>' +
        '</div>';
    });
  } else {
    lista = '<p style="text-align:center;padding:20px;">No hay jugadores registrados.</p>';
  }

  m.innerHTML = '<div class="modal-contenido modal-admin" style="max-height: 85vh; background: #001A5C; border: 2px solid #FFD700;">' +
    '<h2>🏆 GESTIÓN TOP JUGADORES</h2>' +
    '<button class="btn-cerrar-admin" onclick="var m=document.getElementById(\'modal-gestion-top\'); if(m) m.remove();">✖</button>' +
    '<div style="margin-top:20px; max-height:400px; overflow-y:auto;">' + lista + '</div>' +
    '<button onclick="borrarTodosTop()" style="width: 100%; margin-top: 15px; background: #F44336; color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 14px; cursor: pointer;">🗑️ Borrar Todo el Top</button>' +
    '</div>';
  document.body.appendChild(m);
}

async function borrarJugadorTop(telefono, nombre) {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Borrar a ' + nombre + ' del Top Jugadores?');
  if (!confirmado) return;

  try {
    await supabaseClient.from('puntos_jugadores').delete().eq('telefono', telefono);
    mostrarAlerta('✅ ' + nombre + ' eliminado.', 'exito');
    var modal = document.getElementById('modal-gestion-top');
    if (modal) modal.remove();
    verGestionTop();
    cargarTopJugadores();
  } catch(e) { mostrarAlerta('❌ Error al borrar: ' + (e.message || 'Desconocido'), 'error'); }
}

async function borrarTodosTop() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('⚠️ ¿Seguro que quieres borrar TODOS los jugadores del Top?');
  if (!confirmado) return;

  try {
    await supabaseClient.from('puntos_jugadores').delete().neq('telefono', '000000000');
    mostrarAlerta('✅ Todos los jugadores eliminados.', 'exito');
    var modal = document.getElementById('modal-gestion-top');
    if (modal) modal.remove();
    verGestionTop();
    cargarTopJugadores();
  } catch(e) { mostrarAlerta('❌ Error al borrar: ' + (e.message || 'Desconocido'), 'error'); }
}

// ============================================
// ⚠️ FUNCIONES FALTANTES EN EL ORIGINAL
// Estas 2 funciones son llamadas por los botones del panel admin
// pero NO tenían definición en tu script.js original.
// Las incluyo aquí para que esos botones funcionen.
// ============================================

async function aprobarTodosVerificados() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('⚡ ¿Aprobar TODOS los tickets pendientes que tienen captura y código SMS?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('reservas').select('*').eq('turno', turnoActual).eq('estado', 'ocupado');
    if (r.error || !r.data) throw new Error('Error leyendo reservas');

    var verificados = r.data.filter(function(x) {
      return x.captura_url && x.codigo_sms && x.codigo_sms.trim().length >= 6;
    });

    if (verificados.length === 0) {
      mostrarAlerta('ℹ️ No hay tickets verificados pendientes.', 'info');
      return;
    }

    var aprobados = 0;
    for (var i = 0; i < verificados.length; i++) {
      await confirmarPago(verificados[i].numero);
      aprobados++;
    }

    mostrarAlerta('✅ Se aprobaron ' + aprobados + ' tickets.', 'exito');
    await registrarLog('aprobar_todos', 'Aprobados en lote: ' + aprobados, '', '', '');
  } catch(e) {
    mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error');
  }
}

async function verificarPagosAtrasados() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  try {
    var r = await supabaseClient.from('reservas').select('*').eq('turno', turnoActual).eq('estado', 'ocupado');
    if (r.error || !r.data) throw new Error('Error leyendo reservas');

    var ahora = new Date();
    var atrasados = [];

    r.data.forEach(function(x) {
      if (!x.fecha || !x.hora) return;
      var fh = parseFechaHora(x.fecha, x.hora);
      if (!fh) return;
      var diffMin = Math.round((ahora - fh) / 1000 / 60);
      if (diffMin >= 5) atrasados.push({ reserva: x, minutos: diffMin });
    });

    if (atrasados.length === 0) {
      mostrarAlerta('✅ No hay pagos atrasados. Todos están al día.', 'exito');
      return;
    }

    var lista = atrasados.map(function(a) {
      return '• Nº ' + a.reserva.numero + ' — ' + a.reserva.nombre + ' — ' + a.minutos + ' min';
    }).join('\n');

    mostrarAlerta('🚨 PAGOS CON +5 MINUTOS SIN APROBAR (' + atrasados.length + '):\n\n' + lista, 'error');
  } catch(e) {
    mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error');
  }
}

// ============================================
// FIN BLOQUE 18 — Continúa en Bloque 19
// ============================================// ============================================
// BLOQUE 19: TRABAJADORES + SUPERVISIÓN EN VIVO
// ============================================

async function verTrabajadores() {
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  await cargarTrabajadores();
  var lista = '';

  if (trabajadores.length > 0) {
    trabajadores.forEach(function(t) {
      var nombreEsc = escapeHtml(t.nombre || 'Sin nombre');
      var telEsc = escapeHtml(t.telefono || 'N/A');
      var emailEsc = escapeHtml(t.email || 'Sin email');
      var rolEsc = escapeHtml(t.rol || 'colaborador');
      var emailAttr = encodeURIComponent(t.email || '');
      var btnCorreo = t.email
        ? '<button onclick="window.open(\'mailto:' + emailAttr + '\')" style="background:#2196F3; color:#fff; border:none; padding:8px 12px; border-radius:8px; font-weight:bold; cursor:pointer; margin-right:5px;">📧 Correo</button>'
        : '';
      lista += '<div class="reserva-item">' +
        '<p><strong>👤 ' + nombreEsc + '</strong></p>' +
        '<p>📱 ' + telEsc + '</p>' +
        '<p>📧 ' + emailEsc + '</p>' +
        '<p>🎭 Rol: ' + rolEsc + '</p>' +
        '<div style="display:flex; margin-top:10px;">' + btnCorreo +
        '<button class="btn-rechazar" onclick="eliminarTrabajador(' + t.id + ')">❌ Eliminar</button>' +
        '</div></div>';
    });
  } else {
    lista = '<p style="text-align:center;padding:20px;">No hay trabajadores</p>';
  }

  var existente = document.getElementById('modal-trabajadores');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-trabajadores';
  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700;">' +
    '<h2>👥 TRABAJADORES (' + trabajadores.length + ')</h2>' +
    '<button class="btn-cerrar-admin" onclick="var m=document.getElementById(\'modal-trabajadores\'); if(m) m.remove();">✖</button>' +
    '<div style="margin-top:20px;max-height:200px;overflow-y:auto;">' + lista + '</div>' +
    '<h3 style="color:#FFD700; margin-top:20px;">➕ AGREGAR</h3>' +
    '<label>👤 Nombre:</label><input type="text" id="trab-nombre" placeholder="Nombre">' +
    '<label>📱 Teléfono:</label><input type="tel" id="trab-telefono" placeholder="+53 5XXXXXXX">' +
    '<label>📧 Email de Acceso:</label><input type="email" id="trab-email" placeholder="correo@ejemplo.com">' +
    '<label>🔑 Contraseña:</label><input type="password" id="trab-password" placeholder="Contraseña para entrar">' +
    '<label>🎭 Rol:</label>' +
    '<select id="trab-rol" style="width:100%;padding:12px;border-radius:10px;border:2px solid #FFD700;background:rgba(255,255,255,0.1);color:#fff;font-size:16px;">' +
    '<option value="colaborador">Colaborador</option>' +
    '<option value="confirmador">Confirmador</option>' +
    '<option value="moderador">Moderador</option>' +
    '<option value="completo">Completo</option>' +
    '</select>' +
    '<p style="color:#FFD700;font-size:12px;margin-top:10px;font-weight:bold;">PERMISOS:</p>' +
    '<label><input type="checkbox" id="perm-confirmar"> Confirmar pagos</label>' +
    '<label><input type="checkbox" id="perm-rechazar"> Rechazar pagos</label>' +
    '<label><input type="checkbox" id="perm-chat"> Moderar chat</label>' +
    '<label><input type="checkbox" id="perm-bloquear"> Bloquear jugadores</label>' +
    '<button class="btn-control" style="margin-top:12px;" onclick="agregarTrabajador()">💾 Agregar</button>' +
    '</div>';
  document.body.appendChild(m);
}

async function agregarTrabajador() {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var nombreEl = document.getElementById('trab-nombre');
  var telEl = document.getElementById('trab-telefono');
  var emailEl = document.getElementById('trab-email');
  var passEl = document.getElementById('trab-password');
  var rolEl = document.getElementById('trab-rol');
  var confEl = document.getElementById('perm-confirmar');
  var rechEl = document.getElementById('perm-rechazar');
  var chatEl = document.getElementById('perm-chat');
  var bloqEl = document.getElementById('perm-bloquear');

  var nombre = nombreEl ? nombreEl.value.trim() : '';
  var tel = telEl ? telEl.value.trim() : '';
  var email = emailEl ? emailEl.value.trim() : '';
  var pass = passEl ? passEl.value : '';
  var rol = rolEl ? rolEl.value : 'colaborador';
  var conf = confEl ? confEl.checked : false;
  var rech = rechEl ? rechEl.checked : false;
  var chat = chatEl ? chatEl.checked : false;
  var bloq = bloqEl ? bloqEl.checked : false;

  if (!nombre || !tel || !email || !pass) { mostrarAlerta('⚠️ Todos los campos son obligatorios', 'error'); return; }
  if (pass.length < 6) { mostrarAlerta('⚠️ La contraseña debe tener al menos 6 caracteres.', 'error'); return; }
  if (!validarTelefonoCubano(tel)) { mostrarAlerta('⚠️ Teléfono cubano inválido.', 'error'); return; }

  try {
    var tempClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    var authRes = await tempClient.auth.signUp({ email: email, password: pass });
    if (authRes.error) { mostrarAlerta('❌ Error creando cuenta: ' + authRes.error.message, 'error'); return; }

    var userId = authRes.data && authRes.data.user ? authRes.data.user.id : null;
    var r = await supabaseClient.from('trabajadores').insert([{
      nombre: nombre,
      telefono: tel,
      email: email,
      user_id: userId,
      rol: rol,
      puede_confirmar: conf,
      puede_rechazar: rech,
      puede_moderar_chat: chat,
      puede_bloquear: bloq,
      creado_por: localStorage.getItem('mi_nombre') || 'admin'
    }]);
    if (r.error) { mostrarAlerta('❌ Error guardando trabajador: ' + r.error.message, 'error'); return; }

    await registrarLog('agregar_trabajador', nombre + ' (' + tel + ')', '', '', '');
    mostrarAlerta('✅ ' + nombre + ' agregado.', 'exito');
    var modal = document.getElementById('modal-trabajadores');
    if (modal) modal.remove();
    await cargarTrabajadores();
    verTrabajadores();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function eliminarTrabajador(id) {
  if (!esAdmin) return;
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('¿Eliminar a este trabajador?');
  if (!confirmado) return;

  try {
    var trab = trabajadores.find(function(t) { return t.id === id; });
    await supabaseClient.from('trabajadores').delete().eq('id', id);
    await registrarLog('eliminar_trabajador', 'Eliminado: ' + (trab ? trab.nombre : id), '', '', '');
    var modal = document.getElementById('modal-trabajadores');
    if (modal) modal.remove();
    await cargarTrabajadores();
    verTrabajadores();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

var autoRefreshSupervision = null;

async function abrirSupervisionTrabajadores() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-supervision');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-supervision';
  m.innerHTML = '<div class="modal-contenido modal-admin-pro" style="max-height: 92vh; background:#001A5C; border:2px solid #FFD700;">' +
    '<div class="admin-pro-header" style="background: linear-gradient(135deg, #9C27B0, #6A1B9A); border-radius: 21px 21px 0 0; padding-bottom: 15px;">' +
    '<div class="admin-pro-header-info">' +
    '<div class="admin-pro-badge" style="background: rgba(0,0,0,0.3); color: #fff;">👁️ MONITOREO EN VIVO</div>' +
    '<h1 style="color:#fff;">Supervisión de Trabajadores</h1>' +
    '<p style="color:rgba(255,255,255,0.85); font-size:11px;">Actualizado: <span id="supervision-updated">--</span></p>' +
    '</div>' +
    '<button class="admin-pro-close" onclick="cerrarSupervision()" style="color:#fff;">✖</button>' +
    '</div>' +
    '<div style="padding: 15px;">' +
    '<div style="display:flex; gap:8px; margin-bottom:15px;">' +
    '<button onclick="cargarSupervisionTrabajadores()" style="flex:1; padding:12px; background:#2196F3; color:#fff; border:none; border-radius:10px; font-weight:bold; cursor:pointer; font-size:13px;">🔄 Refrescar ahora</button>' +
    '<button onclick="toggleAutoRefreshSupervision()" id="btn-auto-refresh" style="flex:1; padding:12px; background:#2ECC71; color:#fff; border:none; border-radius:10px; font-weight:bold; cursor:pointer; font-size:13px;">🟢 Auto: ON</button>' +
    '</div>' +
    '<div id="supervision-contenido" style="max-height: 65vh; overflow-y:auto;">' +
    '<div class="historial-vacio">Cargando datos...</div>' +
    '</div>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);

  await cargarSupervisionTrabajadores();
  iniciarAutoRefreshSupervision();
}

async function cargarSupervisionTrabajadores() {
  var cont = document.getElementById('supervision-contenido');
  var updated = document.getElementById('supervision-updated');
  if (!cont || document.hidden) return;
  if (!supabaseClient) return;

  try {
    await cargarTrabajadores();

    var rLogs = await supabaseClient.from('logs_trabajadores').select('trabajador_nombre,accion,creado_en').order('creado_en', { ascending: false }).limit(500);
    var logs = (rLogs && rLogs.data) ? rLogs.data : [];

    var rReservas = await supabaseClient.from('reservas').select('id').eq('estado', 'ocupado').eq('turno', turnoActual);
    var pendientesTotales = (rReservas && rReservas.data) ? rReservas.data.length : 0;

    var hoyStr = obtenerFechaFormateada();
    var stats = {};

    trabajadores.forEach(function(t) {
      stats[t.nombre] = {
        trabajador: t,
        ultimaAccionFecha: null,
        ultimaAccionMin: null,
        confirmadosHoy: 0,
        rechazadosHoy: 0,
        bloqueosHoy: 0,
        totalHoy: 0
      };
    });

    logs.forEach(function(log) {
      var nombre = log.trabajador_nombre;
      if (!stats[nombre]) return;

      if (!stats[nombre].ultimaAccionFecha && log.creado_en) {
        stats[nombre].ultimaAccionFecha = log.creado_en;
        var diffMs = new Date() - new Date(log.creado_en);
        stats[nombre].ultimaAccionMin = Math.max(0, Math.round(diffMs / 60000));
      }
      if (log.creado_en) {
        var fechaLog = new Date(log.creado_en);
        var logFechaStr = fechaLog.getDate().toString().padStart(2, '0') + '/' + (fechaLog.getMonth() + 1).toString().padStart(2, '0') + '/' + fechaLog.getFullYear();
        if (logFechaStr === hoyStr) {
          stats[nombre].totalHoy++;
          if (log.accion === 'confirmar_pago') stats[nombre].confirmadosHoy++;
          if (log.accion === 'rechazar_pago') stats[nombre].rechazadosHoy++;
          if (log.accion === 'bloquear') stats[nombre].bloqueosHoy++;
        }
      }
    });

    var activos = 0, inactivos = 0, desconectados = 0, sinActividad = 0;
    var html = '';

    var listaOrdenada = Object.keys(stats).map(function(nombre) {
      var s = stats[nombre];
      var peso = 0;
      if (s.ultimaAccionMin === null) peso = 4;
      else if (s.ultimaAccionMin < 10) peso = 1;
      else if (s.ultimaAccionMin < 60) peso = 2;
      else peso = 3;
      return { nombre: nombre, stats: s, peso: peso };
    }).sort(function(a, b) { return a.peso - b.peso; });

    listaOrdenada.forEach(function(item) {
      var s = item.stats;
      var estado, estadoColor, estadoEmoji;

      if (s.ultimaAccionMin === null) { estado = 'SIN ACTIVIDAD'; estadoColor = '#757575'; estadoEmoji = '⚪'; sinActividad++; }
      else if (s.ultimaAccionMin < 10) { estado = 'ACTIVA'; estadoColor = '#2ECC71'; estadoEmoji = '🟢'; activos++; }
      else if (s.ultimaAccionMin < 60) { estado = 'INACTIVA'; estadoColor = '#FFC107'; estadoEmoji = '🟡'; inactivos++; }
      else { estado = 'DESCONECTADA'; estadoColor = '#F44336'; estadoEmoji = '🔴'; desconectados++; }

      var ultimaTexto = 'Nunca';
      if (s.ultimaAccionMin !== null) {
        if (s.ultimaAccionMin < 1) ultimaTexto = 'Hace unos segundos';
        else if (s.ultimaAccionMin < 60) ultimaTexto = 'Hace ' + s.ultimaAccionMin + ' min';
        else if (s.ultimaAccionMin < 1440) ultimaTexto = 'Hace ' + Math.round(s.ultimaAccionMin / 60) + ' h';
        else ultimaTexto = 'Hace más de 1 día';
      }

      var puedeConfirmar = s.trabajador.puede_confirmar || s.trabajador.puede_rechazar;
      var alertaHtml = '';
      if (puedeConfirmar && s.ultimaAccionMin !== null && s.ultimaAccionMin >= 10 && pendientesTotales > 0) {
        alertaHtml = '<div style="background:rgba(244,67,54,0.2); border:1px solid #F44336; border-radius:8px; padding:8px; margin-top:10px; font-size:11px; color:#FF6B6B; font-weight:bold; text-align:center;">⚠️ Hay ' + pendientesTotales + ' pagos pendientes y este trabajador lleva inactivo</div>';
      }

      var nombreEsc = escapeHtml(s.trabajador.nombre || 'Sin nombre');
      var rolEsc = escapeHtml(s.trabajador.rol || 'colaborador');

      var btnWa = '';
      if (s.trabajador.telefono) {
        var nombreAttr = escapeAttr(s.trabajador.nombre || 'Sin nombre');
        var telAttr = (s.trabajador.telefono || '').replace(/[^0-9]/g, '');
        btnWa = '<button onclick="avisarTrabajadorWhatsApp(\'' + nombreAttr + '\', \'' + telAttr + '\', ' + pendientesTotales + ')" style="padding:10px; background:#25D366; color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:12px; cursor:pointer; width:100%; margin-top:10px;">📲 Avisar por WhatsApp</button>';
      }

      html += '<div style="background:rgba(255,255,255,0.05); border:2px solid ' + estadoColor + '; border-radius:14px; padding:14px; margin-bottom:12px;">' +
        '<div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">' +
        '<div style="font-size:30px; line-height:1;">' + estadoEmoji + '</div>' +
        '<div style="flex:1; min-width:0;">' +
        '<h4 style="color:#fff; font-size:15px; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + nombreEsc + '</h4>' +
        '<p style="color:rgba(255,255,255,0.6); font-size:10px; margin:2px 0 0; text-transform:capitalize;">' + rolEsc + '</p>' +
        '</div>' +
        '<div style="text-align:right; flex-shrink:0;">' +
        '<div style="font-size:10px; color:' + estadoColor + '; font-weight:900; text-transform:uppercase; letter-spacing:0.5px;">' + estado + '</div>' +
        '<div style="font-size:10px; color:rgba(255,255,255,0.6); margin-top:2px;">' + ultimaTexto + '</div>' +
        '</div>' +
        '</div>' +
        '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; text-align:center;">' +
        '<div style="background:rgba(46,204,113,0.15); padding:8px 4px; border-radius:8px; border:1px solid rgba(46,204,113,0.4);">' +
        '<div style="font-size:18px; font-weight:900; color:#2ECC71; line-height:1;">' + s.confirmadosHoy + '</div>' +
        '<div style="font-size:9px; color:rgba(255,255,255,0.75); margin-top:4px; text-transform:uppercase; font-weight:bold;">✅ Confirmó</div>' +
        '</div>' +
        '<div style="background:rgba(244,67,54,0.15); padding:8px 4px; border-radius:8px; border:1px solid rgba(244,67,54,0.4);">' +
        '<div style="font-size:18px; font-weight:900; color:#F44336; line-height:1;">' + s.rechazadosHoy + '</div>' +
        '<div style="font-size:9px; color:rgba(255,255,255,0.75); margin-top:4px; text-transform:uppercase; font-weight:bold;">❌ Rechazó</div>' +
        '</div>' +
        '<div style="background:rgba(255,215,0,0.15); padding:8px 4px; border-radius:8px; border:1px solid rgba(255,215,0,0.4);">' +
        '<div style="font-size:18px; font-weight:900; color:#FFD700; line-height:1;">' + s.totalHoy + '</div>' +
        '<div style="font-size:9px; color:rgba(255,255,255,0.75); margin-top:4px; text-transform:uppercase; font-weight:bold;">📊 Total</div>' +
        '</div>' +
        '</div>' +
        alertaHtml +
        btnWa +
        '</div>';
    });

    var resumenHtml = '<div style="background: rgba(0,0,0,0.3); border-radius:12px; padding:14px; margin-bottom:15px; border:2px solid #FFD700;">' +
      '<h3 style="color:#FFD700; font-size:13px; margin:0 0 10px; text-align:center; letter-spacing:0.5px;">📊 RESUMEN EN VIVO</h3>' +
      '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center;">' +
      '<div><div style="font-size:24px; font-weight:900; color:#2ECC71; line-height:1;">' + activos + '</div><div style="font-size:10px; color:#fff; margin-top:4px;">🟢 Activos</div></div>' +
      '<div><div style="font-size:24px; font-weight:900; color:#FFC107; line-height:1;">' + inactivos + '</div><div style="font-size:10px; color:#fff; margin-top:4px;">🟡 Inactivos</div></div>' +
      '<div><div style="font-size:24px; font-weight:900; color:#F44336; line-height:1;">' + desconectados + '</div><div style="font-size:10px; color:#fff; margin-top:4px;">🔴 Desconectados</div></div>' +
      '</div>' +
      (sinActividad > 0 ? '<div style="text-align:center; margin-top:8px; font-size:10px; color:rgba(255,255,255,0.5);">⚪ ' + sinActividad + ' sin actividad registrada</div>' : '') +
      '<div style="text-align:center; margin-top:12px; padding-top:12px; border-top:1px dashed rgba(255,255,255,0.25);">' +
      '<span style="font-size:12px; color:#fff;">⏳ Pendientes por revisar: </span>' +
      '<span style="font-size:20px; font-weight:900; color:' + (pendientesTotales > 0 ? '#F44336' : '#2ECC71') + ';">' + pendientesTotales + '</span>' +
      '<div style="font-size:10px; color:rgba(255,255,255,0.55); margin-top:3px;">Turno ' + (turnoActual === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche') + '</div>' +
      '</div></div>';

    if (trabajadores.length === 0) {
      cont.innerHTML = '<div class="admin-pro-vacio"><div style="font-size:48px;">👥</div><p>No hay trabajadores registrados aún.</p><p style="font-size:11px; color:rgba(255,255,255,0.5); margin-top:10px;">Agrega trabajadores desde 🛠️ Más → 👥 Gestionar Trabajadores</p></div>';
    } else {
      cont.innerHTML = resumenHtml + html;
    }

    if (updated) updated.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  } catch(e) {
    cont.innerHTML = '<div class="historial-vacio">❌ Error al cargar: ' + escapeHtml(e.message || 'Desconocido') + '</div>';
    console.error(e);
  }
}

function iniciarAutoRefreshSupervision() {
  detenerAutoRefreshSupervision();
  autoRefreshSupervision = setInterval(function() {
    var m = document.getElementById('modal-supervision');
    if (!m || document.hidden) {
      if (!m) detenerAutoRefreshSupervision();
      return;
    }
    cargarSupervisionTrabajadores();
  }, 30000);
}

function detenerAutoRefreshSupervision() {
  if (autoRefreshSupervision) {
    clearInterval(autoRefreshSupervision);
    autoRefreshSupervision = null;
  }
}

function toggleAutoRefreshSupervision() {
  var btn = document.getElementById('btn-auto-refresh');
  if (autoRefreshSupervision) {
    detenerAutoRefreshSupervision();
    if (btn) { btn.textContent = '⚪ Auto: OFF'; btn.style.background = '#757575'; }
  } else {
    iniciarAutoRefreshSupervision();
    if (btn) { btn.textContent = '🟢 Auto: ON'; btn.style.background = '#2ECC71'; }
  }
}

function cerrarSupervision() {
  detenerAutoRefreshSupervision();
  var m = document.getElementById('modal-supervision');
  if (m) m.remove();
}

function avisarTrabajadorWhatsApp(nombre, telefono, pendientes) {
  var tel = (telefono || '').replace(/[^0-9]/g, '');
  if (!tel) { mostrarAlerta('Este trabajador no tiene teléfono registrado.', 'error'); return; }
  var msg = 'Hola ' + nombre + ', hay ' + pendientes + ' pagos pendientes por revisar en La Rifita Cubana. ¿Puedes entrar al panel? 🙏';
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(msg), '_blank');
}

// ============================================
// FIN BLOQUE 19 — Continúa en Bloque 20 (FINAL)
// ============================================// ============================================
// BLOQUE 20 (FINAL): HISTORIAL + UTILIDADES + FIJO MANUAL + CIERRE
// ============================================

async function cargarHistorial() {
  await cargarHistorialFiltrado();
}

async function cargarHistorialFiltrado() {
  var c = document.getElementById('historial-lista');
  if (!c || document.hidden) return;

  if (!supabaseClient) {
    mostrarErrorConBoton('historial-lista', 'cargarHistorialFiltrado', 'Sin conexión al servidor');
    return;
  }

  try {
    var anioEl = document.getElementById('filtro-anio');
    var mesEl = document.getElementById('filtro-mes');
    var turnoEl = document.getElementById('filtro-turno');

    var anio = anioEl ? anioEl.value : 'todos';
    var mes = mesEl ? mesEl.value : 'todos';
    var turno = turnoEl ? turnoEl.value : 'todos';

    var consulta = supabaseClient.from('historial_fijos').select('id,turno,fecha,fijo,ganador_nombre,premio,anio').order('creado_en', { ascending: false }).limit(100);
    if (turno !== 'todos') consulta = consulta.eq('turno', turno);

    var r = await consulta;
    if (r.error) throw r.error;

    var datos = r.data || [];
    if (anio !== 'todos') datos = datos.filter(function(h) { return h.anio === anio; });
    if (mes !== 'todos') {
      datos = datos.filter(function(h) {
        if (!h.fecha) return false;
        var partes = h.fecha.split('/');
        return partes[1] === mes;
      });
    }

    if (datos.length === 0) {
      c.innerHTML = '<div class="historial-vacio">No hay historial</div>';
      return;
    }

    c.innerHTML = '';
    datos.forEach(function(h) {
      var div = document.createElement('div');
      div.className = 'historial-item';

      var botonesAdmin = '';
      if (esAdmin === true && trabajadorActual === null) {
        botonesAdmin = '<div class="historial-botones">' +
          '<button class="btn-editar-fijo" onclick="editarFijo(' + h.id + ')">✏️ Editar</button>' +
          '<button class="btn-borrar-fijo" onclick="borrarFijo(' + h.id + ')">🗑️ Borrar</button>' +
          '</div>';
      }

      var turnoTxt = h.turno === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche';
      var fechaEsc = escapeHtml(h.fecha || 'N/A');
      var fijoEsc = escapeHtml(h.fijo || '--');
      var ganadorEsc = escapeHtml(h.ganador_nombre || 'Sin ganador');
      var premioEsc = escapeHtml(String(h.premio || '250'));

      div.innerHTML = '<h4>' + turnoTxt + ' - ' + fechaEsc + '</h4>' +
        '<p>🎯 Fijo: <span class="ganador">' + fijoEsc + '</span></p>' +
        '<p>👤 Ganador: ' + ganadorEsc + '</p>' +
        '<p>💰 Premio: ' + premioEsc + ' CUP</p>' +
        botonesAdmin;
      c.appendChild(div);
    });
  } catch(e) {
    console.error('Error cargando historial:', e);
    mostrarErrorConBoton('historial-lista', 'cargarHistorialFiltrado', 'No se pudo cargar el historial');
  }
}

async function borrarFijo(id) {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var confirmado = await mostrarConfirmacionCustom('¿Seguro que quieres borrar este registro de fijo?');
  if (!confirmado) return;

  try {
    var r = await supabaseClient.from('historial_fijos').delete().eq('id', id);
    if (r.error) { mostrarAlerta('❌ Error', 'error'); return; }
    await registrarLog('borrar_fijo', 'Eliminado (ID: ' + id + ')', '', '', '');
    cargarHistorialFiltrado();
    if (document.getElementById('modal-gestion-historial')) abrirGestionHistorialAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

async function editarFijo(id) {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  try {
    var r = await supabaseClient.from('historial_fijos').select('*').eq('id', id).maybeSingle();
    if (r.error || !r.data) { mostrarAlerta('❌ No encontrado', 'error'); return; }
    var h = r.data;

    var nuevoFijo = await mostrarPromptCustom('🎯 Fijo actual: ' + h.fijo + '\nNuevo:', h.fijo);
    if (nuevoFijo === null) return;
    if (nuevoFijo.length !== 2) { mostrarAlerta('⚠️ El fijo debe tener 2 dígitos', 'error'); return; }

    var nuevoGanador = await mostrarPromptCustom('👤 Ganador: ' + (h.ganador_nombre || 'N/A') + '\nNuevo:', h.ganador_nombre || '');
    if (nuevoGanador === null) nuevoGanador = h.ganador_nombre || '';

    var nuevoPremio = await mostrarPromptCustom('💰 Premio: ' + (h.premio || '250') + '\nNuevo:', h.premio || '250');
    if (nuevoPremio === null) nuevoPremio = h.premio || '250';

    var r2 = await supabaseClient.from('historial_fijos').update({ fijo: nuevoFijo, ganador_nombre: nuevoGanador, premio: nuevoPremio }).eq('id', id);
    if (r2.error) { mostrarAlerta('❌ Error', 'error'); return; }

    await registrarLog('editar_fijo', 'Editado: ' + h.fijo + ' → ' + nuevoFijo, nuevoFijo, '', nuevoPremio);
    cargarHistorialFiltrado();
    if (document.getElementById('modal-gestion-historial')) abrirGestionHistorialAdmin();
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

function verCaptura(url) {
  if (!url) return;
  var m = document.createElement('div');
  m.className = 'modal-captura';
  m.onclick = function() { m.remove(); };
  m.innerHTML = '<button class="cerrar-captura">✖</button><img src="' + escapeHtml(url) + '" loading="lazy" alt="Captura">';
  document.body.appendChild(m);
}

function descargarPDF(tipo) {
  var contenido = '', titulo = '';

  if (tipo === 'reglas') {
    titulo = 'REGLAS DE LA RIFITA CUBANA';
    var el = document.getElementById('reglas');
    contenido = el ? el.querySelector('.reglas-contenido').innerText : '';
  } else if (tipo === 'comojugar') {
    titulo = 'CÓMO JUGAR EN LA RIFITA CUBANA';
    var el2 = document.getElementById('comojugar');
    contenido = el2 ? el2.querySelector('.reglas-contenido').innerText : '';
  } else {
    titulo = 'MANUAL DE USO - LA RIFITA CUBANA';
    var el3 = document.getElementById('manual');
    contenido = el3 ? el3.querySelector('.reglas-contenido').innerText : '';
  }

  contenido = contenido.replace('📄 Descargar PDF', '').replace('📄 Descargar Reglas en PDF', '').replace('📄 Descargar Manual en PDF', '');

  var existente = document.getElementById('modal-pdf');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-pdf';
  m.innerHTML = '<div class="modal-contenido" style="background:#fff; color:#000;">' +
    '<h2 style="color:#002A8F; text-align:center;">🇨🇺 ' + escapeHtml(titulo) + '</h2>' +
    '<p style="text-align:center; font-size:12px; color:#666; margin-bottom:10px;">Toca "Compartir" para guardar o enviar.</p>' +
    '<textarea id="texto-pdf" style="width:100%; height:300px; padding:10px; font-family:Arial; font-size:14px; border:2px solid #002A8F; border-radius:8px; margin-bottom:15px;" readonly>' + escapeHtml(contenido) + '</textarea>' +
    '<div class="modal-botones" style="flex-direction:column; gap:10px;">' +
    '<button class="btn-aceptar" onclick="compartirPDF(\'' + escapeHtml(titulo) + '\')" style="background:#25D366; color:#fff;">📲 Compartir / Guardar</button>' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-pdf\'); if(m) m.remove();" style="background:#002A8F; color:#fff;">Cerrar</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(m);
}

function compartirPDF(titulo) {
  var textarea = document.getElementById('texto-pdf');
  if (!textarea) return;
  var texto = textarea.value;

  if (navigator.share) {
    navigator.share({ title: titulo, text: texto }).catch(function(error) { console.log('Error al compartir', error); });
  } else {
    textarea.select();
    try {
      document.execCommand('copy');
      mostrarAlerta('✅ Texto copiado. Puedes pegarlo en un bloc de notas y guardarlo.', 'exito');
    } catch(e) {
      mostrarAlerta('📋 Selecciona el texto y cópialo manualmente.', 'info');
    }
  }
}

function copiarAlPortapapeles(texto, etiqueta) {
  if (!texto && texto !== 0) { mostrarAlerta('⚠️ No hay nada que copiar.', 'error'); return; }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(function() {
      mostrarAlerta('✅ ' + (etiqueta || 'Texto') + ' copiado:\n\n' + texto, 'exito');
    }).catch(function() {
      fallbackCopiar(texto, etiqueta);
    });
  } else {
    fallbackCopiar(texto, etiqueta);
  }
}

function fallbackCopiar(texto, etiqueta) {
  try {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    mostrarAlerta('✅ ' + (etiqueta || 'Texto') + ' copiado:\n\n' + texto, 'exito');
  } catch(e) {
    mostrarAlerta('📋 ' + (etiqueta || 'Texto') + ':\n\n' + texto, 'info');
  }
}

function compartirApp() {
  var premio = (config && config.premio_mediodia) || '250';
  var texto = '🇨🇺 ¡Te invito a La Rifita Cubana! 🎲\n\n' +
    '🎯 Números del 00 al 99\n' +
    '💰 Premio: ' + premio + ' CUP\n' +
    '⏰ Turnos: Mediodía y Noche\n\n' +
    '🎰 Basado en Lotería de Florida (Pick 3 fijo)\n\n' +
    '✅ Juego legal y transparente\n' +
    '✅ Premios garantizados y publicados\n' +
    '✅ Pagos por Transfermóvil\n\n' +
    '💬 Únete al grupo:\n' +
    'https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4';
  window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
}

function unirseAlGrupo() {
  window.open('https://chat.whatsapp.com/JbzoME8VkcU3dJ9k1u3hvl?s=cl&p=a&mlu=4&ilr=4', '_blank');
}

async function enviarAnuncioAdmin() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }
  if (!supabaseClient) { mostrarAlerta('❌ Sin conexión al servidor.', 'error'); return; }

  var mensaje = await mostrarPromptCustom('📢 Escribe el anuncio oficial:', '');
  if (!mensaje || !mensaje.trim()) return;

  try {
    var r = await supabaseClient.from('chat').insert([{ usuario: '👑 ADMIN', telefono: '0000', mensaje: mensaje.trim(), es_admin: true }]);
    if (r.error) throw r.error;
    await cargarChatWa();
    mostrarAlerta('✅ Anuncio enviado al chat.', 'exito');
  } catch(e) { mostrarAlerta('❌ Error: ' + (e.message || 'Desconocido'), 'error'); }
}

function crearBotonSoporte() {
  if (document.getElementById('btn-soporte-flotante')) return;
  var btn = document.createElement('div');
  btn.id = 'btn-soporte-flotante';
  btn.className = 'btn-soporte-flotante';
  btn.innerHTML = '💬 Soporte';
  btn.onclick = function() {
    window.open('https://wa.me/994405854881?text=' + encodeURIComponent('Hola Yandyno, necesito ayuda con La Rifita Cubana'), '_blank');
  };
  document.body.appendChild(btn);
}

function reproducirSonido(tipo) {
  var url = '';
  if (tipo === 'reserva') url = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
  else if (tipo === 'ganar') url = 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3';
  else if (tipo === 'click') url = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';

  if (url) {
    try {
      var audio = new Audio(url);
      audio.volume = 0.6;
      audio.play().catch(function(e) { console.log('Audio bloqueado:', e); });
    } catch(e) { console.warn('Error reproduciendo sonido:', e); }
  }
}

function cambiarTema() {
  document.body.classList.toggle('modo-claro');
  var esClaro = document.body.classList.contains('modo-claro');
  var btn = document.getElementById('btn-tema');
  if (btn) btn.innerText = esClaro ? '🌙' : '☀️';
  localStorage.setItem('tema', esClaro ? 'claro' : 'oscuro');
}

function cargarTema() {
  var tema = localStorage.getItem('tema');
  if (tema === 'claro') {
    document.body.classList.add('modo-claro');
    var btn = document.getElementById('btn-tema');
    if (btn) btn.innerText = '🌙';
  }
}

function comprimirImagen(archivo) {
  return new Promise(function(resolve, reject) {
    try {
      if (!archivo) { reject(new Error('Archivo inválido')); return; }
      var reader = new FileReader();
      reader.readAsDataURL(archivo);
      reader.onload = function(event) {
        var img = new Image();
        img.src = event.target.result;
        img.onload = function() {
          try {
            var canvas = document.createElement('canvas');
            var MAX_WIDTH = 500;
            var width = img.width;
            var height = img.height;
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(function(blob) {
              if (!blob) { reject(new Error('No se pudo comprimir')); return; }
              var file = new File([blob], (archivo.name || 'imagen.jpg'), { type: 'image/jpeg' });
              resolve(file);
            }, 'image/jpeg', 0.4);
          } catch(e) { reject(e); }
        };
        img.onerror = function() { reject(new Error('Imagen inválida')); };
      };
      reader.onerror = function() { reject(new Error('Error leyendo archivo')); };
    } catch(e) { reject(e); }
  });
}

async function generarHash(archivo) {
  try {
    if (!archivo || !archivo.arrayBuffer) {
      return 'fallback_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    }
    var arrayBuffer = await archivo.arrayBuffer();
    if (!crypto || !crypto.subtle) {
      return 'fallback_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    }
    var hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  } catch(e) {
    console.warn('Error generando hash:', e);
    return 'fallback_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  }
}

function diagnosticoApp() {
  var funcionesCriticas = [
    'irAPaso2', 'volverAPaso1', 'cerrarModal', 'cerrarModalExito',
    'mostrarModalTransfermovil', 'mostrarModalRecarga', 'mostrarModalQRTransfermovil',
    'mostrarConfirmacionReal', 'abrirPanelAdmin', 'verEstadisticas',
    'cargarAprobados', 'liberarNumero', 'abrirSupervisionTrabajadores',
    'abrirControlReferidos', 'abrirRegistroJugadores', 'verTrabajadores',
    'iniciarAutoCierreTurnos', 'procesarAutoCierreTurnos', 'validarTelefonoCubano',
    'cargarConfig', 'cargarReservas', 'procesarColaReservas', 'generarCuadricula',
    'mostrarBannerGanador', 'cobrarPremio', 'cargarChatWa', 'enviarMensajeWa',
    'abrirReserva', 'confirmarReserva', 'cerrarModalesDePago',
    'abrirModalModoPanico', 'ejecutarModoPanico', 'abrirModalModoVacaciones', 'ejecutarModoVacaciones',
    'aprobarTodosVerificados', 'verificarPagosAtrasados', 'iniciarMensajesCarga', 'actualizarContadorJugadoresOnline',
    'toggleNumerosStats', 'cargarNumerosCalientes', 'toggleRecordatorioWhatsApp', 'cargarEstadoRecordatorio',
    'abrirModalSubirAudio', 'subirAudioGanador', 'abrirModalRecordatorioMasivo', 'enviarRecordatorioMasivo', 'generarMensajeRecordatorio',
    'formatearFechaManual', 'abrirCalendarioNacimiento', 'cargarHistorialFiltrado', 'actualizarNavActiva', 'mostrarNavInferior',
    'borrarMensajeWa', 'editarMensajeWa', 'toggleReaccionRapida', 'procesarMensajeBot',
    'comprimirImagen', 'generarHash', 'copiarAlPortapapeles',
    'abrirModalConfigurarFijoManual', 'guardarFijoManual'
  ];

  var resultado = { ok: [], fallos: [] };
  funcionesCriticas.forEach(function(f) {
    if (typeof window[f] === 'function') resultado.ok.push(f);
    else resultado.fallos.push(f);
  });

  var turnoStr = (typeof turnoActual !== 'undefined') ? turnoActual : 'N/A';
  var forzadoStr = (typeof turnoForzado !== 'undefined') ? (turnoForzado ? 'SÍ' : 'NO') : 'N/A';
  var configKeys = (typeof config !== 'undefined' && Object.keys(config).length > 0) ? Object.keys(config).length : 0;
  var mediodiaAbierto = (config && config.turno_mediodia_abierto === 'true') ? 'SÍ' : 'NO';
  var nocheAbierto = (config && config.turno_noche_abierto === 'true') ? 'SÍ' : 'NO';
  var modoPanicoActivo = (config && config.mantenimiento === 'true') ? 'SÍ' : 'NO';
  var modoVacacionesActivo = (config && config.modo_vacaciones === 'true') ? 'SÍ' : 'NO';

  var existente = document.getElementById('modal-diagnostico');
  if (existente) existente.remove();

  var html = '<div class="modal" id="modal-diagnostico" style="align-items: flex-start; padding-top: 5vh;">' +
    '<div class="modal-contenido" style="background: #001A5C; border: 3px solid ' + (resultado.fallos.length === 0 ? '#2ECC71' : '#F44336') + '; max-width: 500px;">' +
    '<h2 style="text-align:center; color:' + (resultado.fallos.length === 0 ? '#2ECC71' : '#F44336') + ';">' +
    (resultado.fallos.length === 0 ? '✅ SISTEMA OK' : '❌ ERRORES DETECTADOS') + '</h2>' +
    '<p style="text-align:center; font-size: 13px; color: #FFD700; margin-bottom: 15px;">' +
    resultado.ok.length + ' / ' + funcionesCriticas.length + ' funciones cargadas correctamente</p>' +
    '<div style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 12px; margin-bottom: 12px; font-size: 12px;">' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Turno actual:</strong> ' + turnoStr + '</p>' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Modo forzado:</strong> ' + forzadoStr + '</p>' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Mediodía abierto:</strong> ' + mediodiaAbierto + '</p>' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Noche abierto:</strong> ' + nocheAbierto + '</p>' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Modo Pánico:</strong> ' + modoPanicoActivo + '</p>' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Modo Vacaciones:</strong> ' + modoVacacionesActivo + '</p>' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Claves en config:</strong> ' + configKeys + '</p>' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Estado gris:</strong> 15 minutos</p>' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Hora del móvil:</strong> ' + new Date().toLocaleTimeString('en-US', { hour12: true }) + '</p>' +
    '<p style="color: #fff; margin: 3px 0;"><strong style="color:#FFD700;">Canal Realtime:</strong> ' + (typeof chatChannel !== 'undefined' && chatChannel ? '✅ Conectado' : '⚠️ No iniciado') + '</p>' +
    '</div>' +
    '<div style="background: rgba(46,204,113,0.15); border: 1px solid #2ECC71; border-radius: 10px; padding: 10px; margin-bottom: 10px; max-height: 150px; overflow-y: auto;">' +
    '<p style="color: #2ECC71; font-size: 12px; font-weight: bold; margin-bottom: 5px;">✅ Cargadas (' + resultado.ok.length + '):</p>' +
    '<p style="color: #fff; font-size: 11px; line-height: 1.6; word-break: break-all;">' + escapeHtml(resultado.ok.join(', ')) + '</p>' +
    '</div>' +
    (resultado.fallos.length > 0
      ? '<div style="background: rgba(244,67,54,0.15); border: 1px solid #F44336; border-radius: 10px; padding: 10px; margin-bottom: 10px; max-height: 150px; overflow-y: auto;">' +
        '<p style="color: #F44336; font-size: 12px; font-weight: bold; margin-bottom: 5px;">❌ FALTAN (' + resultado.fallos.length + '):</p>' +
        '<p style="color: #fff; font-size: 11px; line-height: 1.6; word-break: break-all;">' + escapeHtml(resultado.fallos.join(', ')) + '</p>' +
        '</div>'
      : '') +
    '<div style="background: rgba(33,150,243,0.15); border: 1px solid #2196F3; border-radius: 10px; padding: 10px; margin-bottom: 15px; font-size: 11px; color: #fff; line-height: 1.5;">' +
    '<strong style="color:#2196F3;">💡 Info:</strong><br>' +
    '• Si todo está en ✅, el código cargó bien.<br>' +
    '• Si ves ❌, algún archivo se cortó o pegó mal.<br>' +
    '• Si el chat va lento, verifica que "Canal Realtime" diga Conectado.' +
    '</div>' +
    '<button onclick="var m=document.getElementById(\'modal-diagnostico\'); if(m) m.remove();" style="width:100%; padding: 14px; background: #FFD700; color: #001A5C; border: none; border-radius: 12px; font-weight: 900; font-size: 15px; cursor: pointer;">CERRAR</button>' +
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function activarProteccionAdmin() {
  if (!esAdmin || window._proteccionAdminActiva) return;
  window._proteccionAdminActiva = true;

  document.addEventListener('keyup', function(e) {
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('🚫 CAPTURA BLOQUEADA — La Rifita Cubana Oficial');
        }
      } catch(err) {}
      mostrarAlerta('🚫 Captura bloqueada por seguridad.\n\nEsta acción ha quedado registrada.', 'error');
      if (typeof registrarLog === 'function') {
        registrarLog('captura_bloqueada', 'Intento de captura en panel admin', '', localStorage.getItem('mi_telefono') || '', '');
      }
    }
  });

  window.addEventListener('blur', function() {
    var modalAdmin = document.getElementById('modal-admin');
    if (modalAdmin) modalAdmin.style.filter = 'blur(15px)';
  });
  window.addEventListener('focus', function() {
    var modalAdmin = document.getElementById('modal-admin');
    if (modalAdmin) modalAdmin.style.filter = 'none';
  });

  var observerModal = setInterval(function() {
    var modalAdmin = document.getElementById('modal-admin');
    if (modalAdmin && !modalAdmin.dataset.protegido) {
      modalAdmin.dataset.protegido = 'true';
      modalAdmin.style.transition = 'filter 0.15s ease';
    }
  }, 1000);

  window.addEventListener('beforeunload', function() { clearInterval(observerModal); });
}

setTimeout(function() {
  if (typeof window.abrirPanelAdmin === 'function' && !window._abrirPanelAdminWrapped) {
    window._abrirPanelAdminWrapped = true;
    var _orig = window.abrirPanelAdmin;
    window.abrirPanelAdmin = async function() {
      await _orig.apply(this, arguments);
      setTimeout(activarProteccionAdmin, 500);
    };
  }
}, 1000);

document.addEventListener('DOMContentLoaded', function() {
  document.body.addEventListener('touchstart', function(e) {
    var target = e.target;
    if (target && (
      target.closest('.btn-enviar-wa') ||
      target.closest('.admin-pro-btn-confirmar') ||
      target.closest('.numero')
    )) {
      if (navigator.vibrate) navigator.vibrate(20);
    }
  }, { passive: true });

  document.body.addEventListener('click', function(e) {
    var target = e.target;
    if (target && (
      target.classList.contains('btn-cancelar') ||
      target.classList.contains('admin-pro-close')
    )) {
      if (navigator.vibrate) navigator.vibrate([10, 20, 10]);
    }
  });
});

// FIX CRÍTICO #4: window.load seguro — solo inicializa si NO hay credenciales guardadas
// y NO se ha inicializado antes (evita doble ejecución de iniciarApp)
window.addEventListener('load', function() {
  var tieneCredenciales = !!localStorage.getItem('mi_telefono');
  if (tieneCredenciales) {
    // Ya se inicializó desde DOMContentLoaded o empezarAJugarAhora
    console.log('✅ App ya inicializada — window.load ignorado.');
    return;
  }

  var pc = document.getElementById('pantalla-carga');
  if (pc && pc.style.display === 'flex' && !window._iniciado) {
    setTimeout(function() {
      pc.classList.add('oculto');
      setTimeout(function() { pc.style.display = 'none'; }, 800);
      var header = document.getElementById('header-principal');
      var contenido = document.getElementById('app-contenido');
      if (header) header.style.display = 'block';
      if (contenido) contenido.style.display = 'block';
      if (typeof iniciarApp === 'function') {
        iniciarApp();
      }
    }, 3000);
  }
});

if (!window.deferredPrompt) {
  window.deferredPrompt = null;
}

window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  window.deferredPrompt = e;
  if (!document.getElementById('btn-instalar-pwa')) {
    var btn = document.createElement('div');
    btn.id = 'btn-instalar-pwa';
    btn.style = "position: fixed; bottom: 130px; right: 10px; background: #002A8F; color: #fff; border: 2px solid #FFD700; border-radius: 50px; padding: 10px 15px; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.5); cursor: pointer; z-index: 999; display: flex; align-items: center; gap: 5px; animation: flotar 2s infinite;";
    btn.innerHTML = '📲 Instalar App';
    btn.onclick = async function() {
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        var choice = await window.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') { btn.remove(); }
        window.deferredPrompt = null;
      }
    };
    document.body.appendChild(btn);
  }
});

window.addEventListener('appinstalled', function() {
  var btn = document.getElementById('btn-instalar-pwa');
  if (btn) btn.remove();
  console.log('✅ App instalada como PWA');
});

// ============================================
// FIJO MANUAL — admin puede configurar fijos históricos
// ============================================

function abrirModalConfigurarFijoManual() {
  if (!esAdmin) { mostrarAlerta('🔐 Solo admin', 'error'); return; }

  var existente = document.getElementById('modal-fijo-manual');
  if (existente) existente.remove();

  var m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modal-fijo-manual';

  m.innerHTML = '<div class="modal-contenido" style="background: #001A5C; border: 2px solid #FFD700; max-width: 480px;">' +
    '<h2 style="color:#FFD700; text-align:center;">🛠️ Configurar Fijo Manual</h2>' +
    '<p style="font-size:12px; color:rgba(255,255,255,0.7); text-align:center; margin-bottom:15px;">Usa esto para colocar un resultado de un día anterior o si olvidaste guardarlo a tiempo.</p>' +

    '<label>📅 Fecha (DD/MM/AAAA):</label>' +
    '<input type="text" id="fijo-manual-fecha" placeholder="Ej: 25/10/2026" maxlength="10" value="' + obtenerFechaFormateada() + '" style="margin-bottom:10px;">' +

    '<label>🎯 Turno:</label>' +
    '<select id="fijo-manual-turno" style="width:100%; padding:12px; border-radius:10px; border:2px solid #FFD700; background:rgba(255,255,255,0.1); color:#fff; font-size:16px; margin-bottom:10px;">' +
    '<option value="mediodia">☀️ Mediodía</option>' +
    '<option value="noche">🌙 Noche</option>' +
    '</select>' +

    '<label>🔢 Fijo Ganador (2 dígitos):</label>' +
    '<input type="text" id="fijo-manual-numero" placeholder="Ej: 58" maxlength="2" style="margin-bottom:10px; font-size:20px; text-align:center; letter-spacing:5px;">' +

    '<label>👤 Nombre del Ganador:</label>' +
    '<input type="text" id="fijo-manual-ganador" placeholder="Ej: Juan Pérez (o dejar vacío)" style="margin-bottom:10px;">' +

    '<label>📱 Teléfono del Ganador:</label>' +
    '<input type="tel" id="fijo-manual-telefono" placeholder="Ej: +5353437025" style="margin-bottom:10px;">' +

    '<label>🎟️ Código de Ticket:</label>' +
    '<input type="text" id="fijo-manual-codigo" placeholder="Ej: RIF-12345" style="margin-bottom:10px;">' +

    '<label>💰 Premio (CUP):</label>' +
    // FIX: Se agregó el estilo correcto al input de premio
    '<input type="number" id="fijo-manual-premio" value="250" style="width:100%; padding:12px; border-radius:10px; border:2px solid #FFD700; background:rgba(255,255,255,0.1); color:#fff; font-size:16px; margin-bottom:10px;">' +

    '<label>⏰ Hora:</label>' +
    '<input type="text" id="fijo-manual-hora" placeholder="Ej: 1:30 PM" style="margin-bottom:15px;">' +

    '<div class="modal-botones" style="flex-direction:column; gap:10px;">' +
    '<button class="btn-aceptar" onclick="guardarFijoManual()" style="background:#FFD700; color:#001A5C; font-weight:bold;">💾 Guardar Fijo</button>' +
    '<button class="btn-cancelar" onclick="var m=document.getElementById(\'modal-fijo-manual\'); if(m) m.remove();" style="background:rgba(255,255,255,0.15); color:#fff;">Cancelar</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(m);

  var inputFecha = document.getElementById('fijo-manual-fecha');
  if (inputFecha) {
    inputFecha.addEventListener('input', function() { formatearFechaManual(this); });
  }
}

async function guardarFijoManual() {
  if (!esAdmin || !supabaseClient) { mostrarAlerta('❌ Error de conexión', 'error'); return; }

  var fecha = document.getElementById('fijo-manual-fecha').value.trim();
  var turno = document.getElementById('fijo-manual-turno').value;
  var fijo = document.getElementById('fijo-manual-numero').value.trim();
  var ganador = document.getElementById('fijo-manual-ganador').value.trim();
  var telefono = document.getElementById('fijo-manual-telefono').value.trim();
  var codigo = document.getElementById('fijo-manual-codigo').value.trim();
  var premio = document.getElementById('fijo-manual-premio').value.trim();
  var hora = document.getElementById('fijo-manual-hora').value.trim();

  if (!fecha || !fijo || fijo.length !== 2) {
    mostrarAlerta('⚠️ Debes ingresar una fecha válida y un fijo de 2 dígitos.', 'error');
    return;
  }

  if (!ganador) ganador = 'Sin ganador';
  if (!premio) premio = '250';
  if (!hora) hora = turno === 'mediodia' ? '1:00 PM' : '9:00 PM';

  var btn = document.querySelector('#modal-fijo-manual .btn-aceptar');
  if (btn) { btn.disabled = true; btn.innerText = '⏳ Guardando...'; }

  try {
    var anio = fecha.split('/')[2];

    var check = await supabaseClient.from('historial_fijos').select('id').eq('fecha', fecha).eq('turno', turno);

    var data = {
      fecha: fecha,
      anio: anio,
      turno: turno,
      fijo: fijo,
      premio: premio.toString(),
      ganador_nombre: ganador,
      ganador_telefono: telefono || null,
      codigo_ticket: codigo || '',
      hora: hora,
      publicado_en: new Date().toISOString()
    };

    if (check.data && check.data.length > 0) {
      await supabaseClient.from('historial_fijos').update(data).eq('id', check.data[0].id);
    } else {
      data.pagado = false;
      await supabaseClient.from('historial_fijos').insert([data]);
    }

    var fechaHoy = obtenerFechaFormateada();
    if (fecha === fechaHoy) {
      var claveFijo = turno === 'mediodia' ? 'fijo_mediodia' : 'fijo_noche';
      var claveGanador = turno === 'mediodia' ? 'ganador_mediodia' : 'ganador_noche';

      await supabaseClient.from('configuracion').upsert({ clave: claveFijo, valor: fijo }, { onConflict: 'clave' });
      await supabaseClient.from('configuracion').upsert({ clave: claveGanador, valor: ganador }, { onConflict: 'clave' });

      await cargarConfig();
      actualizarResultadoEnPantalla();
    }

    if (ganador !== 'Sin ganador') {
      await supabaseClient.from('chat').insert([{
        usuario: '🤖 SISTEMA',
        telefono: '0000',
        mensaje: '🏆 *RESULTADO ' + (turno === 'mediodia' ? 'MEDIODÍA' : 'NOCHE') + '*\n📅 Fecha: ' + fecha + '\n🎯 Fijo: *' + fijo + '*\n👤 Ganador: ' + ganador + '\n💰 Premio: ' + premio + ' CUP\n\n¡Felicidades! 🎉',
        es_admin: true
      }]);
      await cargarChatWa();
    }

    if (document.getElementById('historial') && document.getElementById('historial').classList.contains('activa')) {
      cargarHistorialFiltrado();
    }

    await registrarLog('guardar_fijo_manual', 'Fijo manual guardado: ' + fijo, fijo, telefono || '', premio);
    mostrarAlerta('✅ Fijo guardado exitosamente.', 'exito');

    var modal = document.getElementById('modal-fijo-manual');
    if (modal) modal.remove();

  } catch (e) {
    console.error('Error guardando fijo manual:', e);
    mostrarAlerta('❌ Error al guardar: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerText = '💾 Guardar Fijo'; }
  }
}

// ============================================
// FIN DEL ARCHIVO SCRIPT.JS — CIERRE FINAL
// ============================================

// Manejador global de errores para evitar que la app se congele
window.addEventListener('error', function(event) {
  if (event.message && event.message.includes('Script error')) return;
  console.error('❌ Error global capturado:', event.message, 'en', event.filename, 'línea', event.lineno);
});

// Manejador de promesas rechazadas (evita que la app se quede en "Cargando")
window.addEventListener('unhandledrejection', function(event) {
  console.error('❌ Promesa no manejada:', event.reason);
  var pc = document.getElementById('pantalla-carga');
  if (pc && pc.style.display !== 'none') {
    pc.classList.add('oculto');
    setTimeout(function() { pc.style.display = 'none'; }, 600);
    var header = document.getElementById('header-principal');
    var contenido = document.getElementById('app-contenido');
    if (header) header.style.display = 'block';
    if (contenido) contenido.style.display = 'block';
  }
});

// Verificación final de que todo el script cargó
setTimeout(function() {
  var funcionesEsenciales = ['iniciarApp', 'abrirReserva', 'confirmarReserva', 'cargarChatWa', 'abrirPanelAdmin'];
  var faltantes = funcionesEsenciales.filter(function(f) { return typeof window[f] !== 'function'; });

  if (faltantes.length === 0) {
    console.log('✅ SCRIPT.JS CARGADO AL 100%. Todas las funciones esenciales están presentes.');
  } else {
    console.warn('⚠️ ATENCIÓN: Faltan funciones esenciales:', faltantes.join(', '), '. Revisa que todos los bloques se hayan pegado correctamente.');
  }

  // Ocultar pantalla de carga si por alguna razón quedó visible
  var pc = document.getElementById('pantalla-carga');
  if (pc && pc.style.display === 'flex') {
    pc.classList.add('oculto');
    setTimeout(function() { pc.style.display = 'none'; }, 800);
    var header = document.getElementById('header-principal');
    var contenido = document.getElementById('app-contenido');
    if (header) header.style.display = 'block';
    if (contenido) contenido.style.display = 'block';
  }
}, 5000);

// Manejo del botón "Atrás" del teléfono para cerrar modales
window.addEventListener('popstate', function() {
  var modales = document.querySelectorAll('.modal');
  if (modales.length > 0) {
    modales.forEach(function(m) { m.remove(); });
    history.pushState(null, null, location.href);
  }
});

console.log('🇨🇺 LA RIFITA CUBANA — SCRIPT.JS FINALIZADO CORRECTAMENTE.');
console.log('📱 App lista para producción. Los 3 errores visuales han sido corregidos.');
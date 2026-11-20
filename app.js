(() => {
  'use strict';

  const API_URL = String((window.APP_CONFIG || {}).API_URL || '').trim();
  const byId = (id) => document.getElementById(id);
  const button = byId('register-button');
  const nameField = byId('person-name');
  const peopleField = byId('person-count');
  const statusText = byId('scan-status');

  let scanner = null;
  let scannerRunning = false;
  let scanInFlight = false;
  let lastCode = '';
  let lastCodeAt = 0;
  let callbackCounter = 0;

  function announce(message) {
    statusText.textContent = message;
  }

  function extractRegistrationCode(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      const keys = ['registro', 'reg', 'id', 'codigo', 'code', 'folio', 'matricula'];
      for (const key of keys) {
        const value = url.searchParams.get(key);
        if (value) return value.trim();
      }
      const lastPart = url.pathname.split('/').filter(Boolean).pop();
      if (lastPart) return decodeURIComponent(lastPart).trim();
    } catch (_) { /* El QR puede contener texto plano. */ }
    const labelled = raw.match(/(?:#?\s*registro|folio|c[oó]digo|matr[ií]cula)\s*[:#-]?\s*([A-Za-z0-9_-]+)/i);
    return labelled ? labelled[1] : raw;
  }

  function jsonp(params, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      if (!API_URL || !/^https:\/\//i.test(API_URL)) {
        reject(new Error('La dirección de conexión no está configurada.'));
        return;
      }
      const callbackName = `nacionesQrCallback_${Date.now()}_${++callbackCounter}`;
      const script = document.createElement('script');
      const query = new URLSearchParams({ ...params, callback: callbackName, _ts: String(Date.now()) });
      let timer;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        delete window[callbackName];
        script.remove();
      };
      window[callbackName] = (payload) => { cleanup(); resolve(payload); };
      script.onerror = () => {
        cleanup();
        reject(new Error('No fue posible conectar con el registro. Revisa internet.'));
      };
      timer = setTimeout(() => {
        cleanup();
        reject(new Error('La conexión tardó demasiado; no se confirmó el registro.'));
      }, timeoutMs);
      script.src = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${query.toString()}`;
      script.async = true;
      script.referrerPolicy = 'no-referrer';
      document.head.appendChild(script);
    });
  }

  function renderPerson(data, code) {
    const fullName = String(data.fullName || '').trim();
    const countValue = Number.parseInt(data.passCount, 10);
    nameField.textContent = fullName || 'NOMBRE COMPLETO';
    peopleField.textContent = `${Number.isFinite(countValue) && countValue > 0 ? countValue : 0} PERSONAS`;
    if (!fullName) announce(`Código ${data.registration || code} registrado. No se recibió nombre desde la hoja.`);
  }

  async function onQrDecoded(decodedText) {
    if (scanInFlight) return;
    const code = extractRegistrationCode(decodedText);
    if (!code) return;
    const now = Date.now();
    if (code === lastCode && now - lastCodeAt < 3500) return;
    lastCode = code;
    lastCodeAt = now;
    scanInFlight = true;
    announce('Código detectado. Guardando asistencia.');

    try {
      const response = await jsonp({ action: 'scan', code });
      if (response && response.ok && (response.status === 'saved' || response.status === 'already')) {
        renderPerson(response, code);
        if (response.status === 'saved') {
          announce(`Asistencia registrada para ${response.fullName || response.registration || code}.`);
          if (navigator.vibrate) navigator.vibrate(75);
        } else {
          announce(`Esta persona ya tenía asistencia registrada hoy: ${response.fullName || response.registration || code}.`);
          if (navigator.vibrate) navigator.vibrate([35, 40, 35]);
        }
      } else {
        const message = (response && response.message) || 'No se encontró el registro en G45.';
        announce(`No se registró la asistencia. ${message}`);
        if (navigator.vibrate) navigator.vibrate([90, 40, 90]);
      }
    } catch (error) {
      announce(error.message || 'No fue posible guardar la asistencia.');
      if (navigator.vibrate) navigator.vibrate([90, 40, 90]);
    } finally {
      window.setTimeout(() => { scanInFlight = false; }, 900);
    }
  }

  async function startCamera() {
    if (scannerRunning) return;
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      announce('Para usar la cámara, abre la aplicación mediante HTTPS en GitHub Pages.');
      return;
    }
    if (!window.Html5Qrcode) {
      announce('No se cargó el lector QR. Revisa tu conexión y vuelve a intentarlo.');
      return;
    }

    button.disabled = true;
    try {
      scanner = scanner || new Html5Qrcode('reader', {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (width, height) => {
            const side = Math.floor(Math.min(width, height) * 0.72);
            return { width: side, height: side };
          },
          aspectRatio: 1,
          disableFlip: false
        },
        onQrDecoded,
        () => {}
      );
      scannerRunning = true;
      button.setAttribute('aria-pressed', 'true');
      announce('Cámara activa. Acerca el código QR al recuadro. La asistencia se guardará automáticamente.');
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      announce(message.toLowerCase().includes('permission')
        ? 'Permite el acceso a la cámara desde los ajustes del navegador.'
        : `No se pudo activar la cámara. ${message}`);
      button.disabled = false;
    }
  }

  async function stopCamera() {
    if (!scanner || !scannerRunning) return;
    try { await scanner.stop(); } catch (_) { /* La cámara pudo detenerse desde el sistema. */ }
    scannerRunning = false;
    button.disabled = false;
    button.setAttribute('aria-pressed', 'false');
    announce('Cámara detenida. Pulsa REGISTRAR ASISTENCIA para volver a escanear.');
  }

  button.addEventListener('click', () => {
    if (scannerRunning) stopCamera();
    else startCamera();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && scannerRunning) stopCamera();
  });
  window.addEventListener('pagehide', () => {
    if (scannerRunning && scanner) scanner.stop().catch(() => {});
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  if (!API_URL || !/^https:\/\//i.test(API_URL)) {
    announce('La URL de conexión a Google Apps Script no está configurada.');
  } else {
    announce('Preparado. Pulsa REGISTRAR ASISTENCIA para activar la cámara.');
  }
})();

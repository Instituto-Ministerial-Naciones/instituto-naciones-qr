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
  let pendingSubmissionId = '';
  let callbackCounter = 0;

  function announce(message, tone = 'normal') {
    statusText.textContent = message;
    statusText.dataset.tone = tone;
  }

  function setButton(label, disabled = false) {
    button.textContent = label;
    button.disabled = disabled;
  }

  function normalizeSubmissionId(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      const keys = ['submission_id', 'submissionid', 'submission', 'sid', 'id'];
      for (const key of keys) {
        const value = url.searchParams.get(key);
        if (value) return value.trim();
      }
      const lastPart = url.pathname.split('/').filter(Boolean).pop();
      if (lastPart) return decodeURIComponent(lastPart).trim();
    } catch (_) { /* El QR del correo contiene el Submission ID como texto plano. */ }
    const labelled = raw.match(/(?:submission\s*id|submission|id)\s*[:#= -]\s*([A-Za-z0-9_-]+)/i);
    return labelled ? labelled[1] : raw;
  }

  function jsonp(params, timeoutMs = 16000) {
    return new Promise((resolve, reject) => {
      if (!API_URL || !/^https:\/\//i.test(API_URL)) {
        reject(new Error('La conexión con Google Sheets no está configurada.'));
        return;
      }
      const callbackName = `nacionesAttendance_${Date.now()}_${++callbackCounter}`;
      const script = document.createElement('script');
      const query = new URLSearchParams({ ...params, callback: callbackName, _ts: String(Date.now()) });
      let timer;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        delete window[callbackName];
        script.remove();
      };
      window[callbackName] = (payload) => { cleanup(); resolve(payload); };
      script.onerror = () => { cleanup(); reject(new Error('No se pudo conectar con el registro. Revisa internet.')); };
      timer = window.setTimeout(() => { cleanup(); reject(new Error('La conexión tardó demasiado. Intenta nuevamente.')); }, timeoutMs);
      script.src = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${query.toString()}`;
      script.async = true;
      script.referrerPolicy = 'no-referrer';
      document.head.appendChild(script);
    });
  }

  function displayRecord(data) {
    nameField.textContent = String(data.registrantName || '').trim() || 'NOMBRE NO DISPONIBLE';
    const count = Number.parseInt(data.passCount, 10);
    const safeCount = Number.isFinite(count) && count >= 0 ? count : 0;
    peopleField.textContent = `${safeCount} ${safeCount === 1 ? 'PERSONA' : 'PERSONAS'}`;
  }

  function clearRecord() {
    pendingSubmissionId = '';
    nameField.textContent = 'NOMBRE COMPLETO';
    peopleField.textContent = '0 PERSONAS';
  }

  async function stopCamera() {
    if (scanner && scannerRunning) {
      try { await scanner.stop(); } catch (_) { /* La cámara pudo detenerse desde el sistema. */ }
    }
    scannerRunning = false;
  }

  async function lookupScannedId(decodedText) {
    const submissionId = normalizeSubmissionId(decodedText);
    if (!submissionId) return;
    scanInFlight = true;
    setButton('CONSULTANDO REGISTRO…', true);
    announce('Código detectado. Verificando el Submission ID en la hoja…');
    await stopCamera();

    try {
      const result = await jsonp({ action: 'lookup', code: submissionId });
      if (!result || !result.ok) {
        clearRecord();
        announce((result && result.message) || 'No se encontró ese Submission ID.', 'error');
        setButton('REINTENTAR ESCANEO');
        return;
      }

      displayRecord(result);
      if (result.alreadyRegistered) {
        announce('Este registro ya tiene la casilla de asistencia marcada.', 'warning');
        setButton('ESCANEAR SIGUIENTE');
        if (navigator.vibrate) navigator.vibrate([35, 40, 35]);
        return;
      }

      pendingSubmissionId = submissionId;
      announce('Registro encontrado. Verifica el nombre y los pases; después pulsa REGISTRAR ASISTENCIA.', 'success');
      setButton('REGISTRAR ASISTENCIA');
      if (navigator.vibrate) navigator.vibrate(70);
    } catch (error) {
      clearRecord();
      announce(error.message || 'No fue posible consultar el registro.', 'error');
      setButton('REINTENTAR ESCANEO');
    } finally {
      scanInFlight = false;
    }
  }

  async function onQrDecoded(decodedText) {
    if (scanInFlight || pendingSubmissionId) return;
    await lookupScannedId(decodedText);
  }

  async function startCamera() {
    if (scannerRunning || scanInFlight) return;
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      announce('La cámara requiere una conexión HTTPS. Abre la aplicación desde GitHub Pages.', 'error');
      return;
    }
    if (!window.Html5Qrcode) {
      announce('No se cargó el lector QR. Revisa tu conexión y vuelve a intentarlo.', 'error');
      return;
    }

    clearRecord();
    setButton('ACTIVANDO CÁMARA…', true);
    announce('Solicitando acceso a la cámara…');
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
      setButton('ESCANEANDO…');
      announce('Cámara activa. Coloca el código QR dentro del recuadro.', 'success');
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      announce(message.toLowerCase().includes('permission')
        ? 'Permite el acceso a la cámara desde los ajustes del navegador.'
        : `No se pudo activar la cámara. ${message}`, 'error');
      setButton('REINTENTAR ESCANEO');
    }
  }

  async function registerAttendance() {
    if (!pendingSubmissionId || scanInFlight) return;
    scanInFlight = true;
    const codeToRegister = pendingSubmissionId;
    setButton('REGISTRANDO…', true);
    announce('Guardando asistencia en la columna J…');
    try {
      const result = await jsonp({ action: 'register', code: codeToRegister });
      if (!result || !result.ok) {
        announce((result && result.message) || 'No se pudo registrar la asistencia.', 'error');
        setButton('REINTENTAR REGISTRO');
        return;
      }
      pendingSubmissionId = '';
      const count = Number.parseInt(result.passCount, 10);
      const safeCount = Number.isFinite(count) && count >= 0 ? count : 0;
      displayRecord(result);
      announce(result.status === 'already_registered'
        ? 'La asistencia ya estaba registrada. No se modificó nuevamente.'
        : `Asistencia registrada correctamente para ${result.registrantName || 'el registro'} (${safeCount} ${safeCount === 1 ? 'persona' : 'personas'}).`, 'success');
      setButton('ESCANEAR SIGUIENTE');
      if (navigator.vibrate) navigator.vibrate(result.status === 'already_registered' ? [35, 40, 35] : 90);
    } catch (error) {
      announce(error.message || 'No fue posible registrar la asistencia.', 'error');
      setButton('REINTENTAR REGISTRO');
    } finally {
      scanInFlight = false;
    }
  }

  button.addEventListener('click', async () => {
    if (pendingSubmissionId) {
      await registerAttendance();
      return;
    }
    if (scannerRunning) {
      await stopCamera();
      setButton('REGISTRAR ASISTENCIA');
      announce('Cámara detenida. Pulsa el botón para volver a escanear.');
      return;
    }
    await startCamera();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && scannerRunning) stopCamera();
  });
  window.addEventListener('pagehide', () => {
    if (scannerRunning && scanner) scanner.stop().catch(() => {});
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=registro-03').catch(() => {}));
  }

  if (!API_URL || !/^https:\/\//i.test(API_URL)) {
    announce('Falta configurar la conexión con Google Apps Script.', 'error');
  }
})();

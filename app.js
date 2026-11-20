(() => {
  'use strict';

  const config = window.APP_CONFIG || {};
  const API_URL = String(config.API_URL || '').trim();
  const STORAGE_COUNT = 'naciones_qr_session_count_v1';
  const STORAGE_LAST_TIME = 'naciones_qr_session_last_time_v1';

  const el = (id) => document.getElementById(id);
  const startButton = el('start-button');
  const readerElement = el('reader');
  const cameraFrame = el('camera-frame');
  const cameraPlaceholder = el('camera-placeholder');
  const cameraActions = el('camera-actions');
  const liveIndicator = el('live-indicator');
  const resultPanel = el('result-panel');
  const resultSymbol = el('result-symbol');
  const resultLabel = el('result-label');
  const resultTitle = el('result-title');
  const resultDetail = el('result-detail');
  const resultCode = el('result-code');
  const connectionPill = el('connection-pill');
  const connectionText = el('connection-text');

  let scanner = null;
  let scannerRunning = false;
  let scanInFlight = false;
  let lastCode = '';
  let lastCodeAt = 0;
  let sessionCount = Number(sessionStorage.getItem(STORAGE_COUNT) || 0);
  let lastTime = sessionStorage.getItem(STORAGE_LAST_TIME) || '';
  let scriptCounter = 0;

  el('session-count').textContent = String(sessionCount);
  el('session-last-time').textContent = lastTime || '—';

  function setConnection(state, label) {
    connectionPill.dataset.state = state;
    connectionText.textContent = label;
    const dot = connectionPill.querySelector('.connection-dot');
    dot.style.background = state === 'online' ? 'var(--success)' : state === 'error' ? 'var(--danger)' : 'var(--accent)';
    dot.style.boxShadow = state === 'online' ? '0 0 12px rgba(128,199,160,.45)' : 'none';
  }

  function showResult(type, title, detail, code = '') {
    resultPanel.className = `result-panel ${type || ''}`.trim();
    resultLabel.textContent = type === 'success' ? 'REGISTRO GUARDADO' : type === 'duplicate' ? 'YA REGISTRADO' : type === 'error' ? 'NO SE PUDO REGISTRAR' : 'ÚLTIMO ESCANEO';
    resultTitle.textContent = title;
    resultDetail.textContent = detail;
    resultCode.textContent = code || '—';
    resultSymbol.innerHTML = type === 'error'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 17h.01M4.9 19h14.2L12 5 4.9 19z"/></svg>'
      : type === 'duplicate'
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2M20 12a8 8 0 1 1-2.34-5.66"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  }

  function setScanning(active) {
    liveIndicator.classList.toggle('active', active);
    liveIndicator.innerHTML = active ? '<span></span> ESCANEANDO' : '<span></span> EN ESPERA';
    cameraFrame.classList.toggle('scanning', active);
    cameraPlaceholder.classList.toggle('hidden', active);
    if (active) setConnection('online', 'Lector conectado');
  }

  function formatTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  function updateSession(timestamp) {
    sessionCount += 1;
    lastTime = formatTime(timestamp || Date.now());
    sessionStorage.setItem(STORAGE_COUNT, String(sessionCount));
    sessionStorage.setItem(STORAGE_LAST_TIME, lastTime);
    el('session-count').textContent = String(sessionCount);
    el('session-last-time').textContent = lastTime;
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
    } catch (_) { /* El QR contiene texto plano, no una URL. */ }
    const labelled = raw.match(/(?:#?\s*registro|folio|c[oó]digo|matr[ií]cula)\s*[:#-]?\s*([A-Za-z0-9_-]+)/i);
    return labelled ? labelled[1] : raw;
  }

  function jsonp(params, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      if (!API_URL || !/^https:\/\//i.test(API_URL) || API_URL.includes('PEGA_AQUI')) {
        reject(new Error('Falta configurar la URL de Google Apps Script en config.js.'));
        return;
      }
      const callbackName = `nacionesQrCallback_${Date.now()}_${++scriptCounter}`;
      const script = document.createElement('script');
      const query = new URLSearchParams({ ...params, callback: callbackName, _ts: String(Date.now()) });
      let timer;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        delete window[callbackName];
        script.remove();
      };
      window[callbackName] = (payload) => {
        cleanup();
        resolve(payload);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error('No se pudo conectar con Google Sheets. Revisa la conexión e intenta de nuevo.'));
      };
      timer = setTimeout(() => {
        cleanup();
        reject(new Error('La conexión tardó demasiado. El registro no fue confirmado.'));
      }, timeoutMs);
      script.src = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${query.toString()}`;
      script.async = true;
      script.referrerPolicy = 'no-referrer';
      document.head.appendChild(script);
    });
  }

  async function sendScan(decodedText) {
    if (scanInFlight) return;
    const code = extractRegistrationCode(decodedText);
    if (!code) return;
    const now = Date.now();
    if (code === lastCode && now - lastCodeAt < 3000) return;
    lastCode = code;
    lastCodeAt = now;
    scanInFlight = true;
    setConnection('waiting', 'Guardando registro');

    try {
      const response = await jsonp({ action: 'scan', code });
      if (response && response.status === 'saved' && response.ok) {
        const dateText = new Date(response.timestamp || Date.now()).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
        showResult('success', 'Registro guardado', dateText, response.registration || code);
        updateSession(response.timestamp || Date.now());
        setConnection('online', 'Registro sincronizado');
        if (navigator.vibrate) navigator.vibrate(90);
      } else if (response && response.status === 'already' && response.ok) {
        const dateText = new Date(response.timestamp || Date.now()).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
        showResult('duplicate', 'Ya estaba registrado', `Primer registro: ${dateText}`, response.registration || code);
        setConnection('online', 'Lector conectado');
        if (navigator.vibrate) navigator.vibrate([35, 45, 35]);
      } else {
        const message = (response && response.message) || 'No se encontró el número de registro en la pestaña G45.';
        showResult('error', response && response.status === 'not_found' ? 'Código no encontrado' : 'Registro no realizado', message, code);
        setConnection('error', 'Revisar código');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      showResult('error', 'No se pudo guardar', error.message || 'Verifica tu conexión.', code);
      setConnection('error', 'Sin sincronizar');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } finally {
      window.setTimeout(() => {
        scanInFlight = false;
        if (scannerRunning) setConnection('online', 'Lector conectado');
      }, 900);
    }
  }

  async function startScanner() {
    if (scannerRunning) return;
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      showResult('error', 'Se requiere HTTPS', 'Abre la aplicación desde GitHub Pages o un dominio seguro.');
      return;
    }
    if (!window.Html5Qrcode) {
      showResult('error', 'No cargó el lector QR', 'Revisa tu conexión a internet y vuelve a abrir la aplicación.');
      return;
    }

    startButton.disabled = true;
    startButton.querySelector('span').textContent = 'Activando cámara…';
    try {
      scanner = scanner || new Html5Qrcode('reader', { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: (width, height) => {
            const side = Math.floor(Math.min(width, height) * 0.68);
            return { width: side, height: side };
          }, aspectRatio: 1.0, disableFlip: false },
        sendScan,
        () => {}
      );
      scannerRunning = true;
      setScanning(true);
      cameraActions.classList.add('hidden');
      showResult('', 'Listo para escanear', 'Acerca un código QR al recuadro.');
    } catch (error) {
      const text = error && error.message ? error.message : String(error);
      showResult('error', 'No se pudo abrir la cámara', text.includes('Permission') ? 'Permite el acceso a la cámara desde los ajustes del navegador.' : text);
      startButton.disabled = false;
      startButton.querySelector('span').textContent = 'Intentar de nuevo';
      setConnection('error', 'Cámara no disponible');
    }
  }

  async function stopScanner() {
    if (!scanner || !scannerRunning) return;
    try { await scanner.stop(); } catch (_) { /* La cámara pudo detenerse por el sistema. */ }
    scannerRunning = false;
    setScanning(false);
    cameraActions.classList.remove('hidden');
    startButton.disabled = false;
    startButton.querySelector('span').textContent = 'Reactivar cámara';
  }

  startButton.addEventListener('click', startScanner);
  window.addEventListener('online', () => setConnection(scannerRunning ? 'online' : 'waiting', navigator.onLine ? 'Conexión disponible' : 'Sin conexión'));
  window.addEventListener('offline', () => setConnection('error', 'Sin conexión'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && scannerRunning) stopScanner();
  });
  window.addEventListener('pagehide', () => {
    if (scannerRunning && scanner) scanner.stop().catch(() => {});
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  if (!API_URL || API_URL.includes('PEGA_AQUI')) {
    setConnection('error', 'Falta configurar API');
    showResult('error', 'Configuración pendiente', 'Pega la URL de Apps Script en el archivo config.js.');
  } else {
    setConnection(navigator.onLine ? 'online' : 'error', navigator.onLine ? 'Conexión disponible' : 'Sin conexión');
    showResult('', 'Listo para escanear', 'Activa la cámara para comenzar.');
  }
})();

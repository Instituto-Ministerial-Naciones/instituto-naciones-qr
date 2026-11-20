# Instituto Ministerial Naciones — Lector QR

Aplicación web instalable (PWA) para leer códigos QR y registrar automáticamente el número de registro y la fecha/hora en la pestaña **G45** de Google Sheets.

## Qué hace

- Abre la cámara trasera del teléfono y lee códigos QR continuamente.
- No pide confirmar cada lectura: al reconocer un código, lo envía automáticamente.
- Busca el código en la columna que tenga un encabezado relacionado con **Registro** (si no lo detecta, usa la columna A; se puede fijar manualmente).
- Escribe el código de registro en la columna **X** y la fecha/hora en la columna **Y**, en la misma fila del registro.
- Evita registrar dos veces a la misma persona el mismo día. Si ya existe un registro en Y para el día actual, muestra que ya estaba registrado y conserva la primera hora.
- Abre directamente el lector, sin PIN ni pantalla de acceso.
- Puede instalarse desde el navegador como aplicación en Android y iPhone.

## 1. Configurar Google Apps Script

1. Abre [script.google.com](https://script.google.com/) e inicia un proyecto nuevo.
2. Abre `apps-script/Code.gs` de este repositorio y copia todo su contenido en el archivo `Code.gs` del proyecto.
3. En la sección `CONFIG`, verifica que `SPREADSHEET_ID` corresponda a tu hoja y que `SHEET_NAME` sea `G45` (ya están precargados).
5. Revisa `REGISTRATION_COLUMN`:
   - `0`: intenta detectar el encabezado de la columna (por ejemplo, `# Registro`, `Registro`, `No. de registro`). Si no lo detecta, toma la columna A.
   - Si sabes que el número está en otra columna, escribe su número: A=1, B=2, C=3, etc.
6. Guarda el proyecto.
7. En el selector de funciones, ejecuta `testConnection` y autoriza los permisos solicitados. En los registros de ejecución debe aparecer la conexión correcta y el número de columna detectada.
8. Ve a **Implementar → Nueva implementación → Aplicación web**.
   - **Ejecutar como:** Yo.
   - **Quién tiene acceso:** Cualquier persona.
   - Implementa y copia la URL que termina en `/exec`.

> La implementación como “Cualquier persona” permite que la PWA escriba desde los teléfonos sin pedirles acceso a la cuenta propietaria. La hoja seguirá siendo administrada por la cuenta que despliega Apps Script. **No hay PIN ni autenticación en la app:** cualquier persona que tenga la URL pública del lector podría enviar registros. Mantén la URL fuera de publicaciones públicas y restringe el acceso compartiendo el enlace solo con el equipo.

## 2. Conectar la app con Apps Script

1. Abre `config.js` en la raíz del proyecto.
2. Sustituye `PEGA_AQUI_LA_URL_DE_IMPLEMENTACION_DE_APPS_SCRIPT` por la URL `/exec` que acabas de copiar.
3. Guarda el archivo. La app abre directamente el lector, sin pedir clave.

## 3. Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `instituto-naciones-qr`.
2. Sube el contenido de esta carpeta a la raíz del repositorio (no subas la carpeta contenedora, sino los archivos y carpetas que están dentro).
3. En GitHub abre **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guarda.
5. Espera a que GitHub Pages muestre la URL pública del sitio. Debe abrirse con `https://`.

## 4. Instalar en teléfonos

- **Android:** abre el enlace de GitHub Pages en Chrome, toca el menú y elige **Instalar aplicación** o **Agregar a pantalla principal**.
- **iPhone:** abre el enlace en Safari, toca **Compartir → Agregar a pantalla de inicio**.
- Abre la app y toca **Activar cámara** para conceder permiso de cámara. Después, cada QR válido se registra automáticamente, sin confirmación individual.

## Comportamiento de las columnas

| Columna | Contenido |
|---|---|
| X | Código / número de registro encontrado en la fila |
| Y | Fecha y hora del primer escaneo del día (`dd/MM/yyyy HH:mm:ss`) |

La aplicación busca una coincidencia exacta del código leído contra la columna de registro configurada. Si el mismo QR se escanea de nuevo el mismo día, no sobrescribe la hora original. Al cambiar de día, un nuevo escaneo actualiza X/Y con la fecha/hora del día nuevo.

## Ajustes habituales

En `apps-script/Code.gs`, dentro de `CONFIG`:

- `REGISTRATION_COLUMN`: fija la columna donde está el número de registro si la detección por encabezado no coincide.
- `HEADER_ROW`: cambia el número de fila si los encabezados no están en la fila 1.
- `TIMEZONE`: zona horaria usada para determinar si el registro ya se hizo hoy.

## Notas importantes

- La cámara del navegador requiere HTTPS. GitHub Pages proporciona HTTPS.
- La lectura QR usa `html5-qrcode` desde un CDN; para cargar esa librería se requiere internet.
- El envío a Google Apps Script requiere conexión a internet. Si se pierde la conexión durante un escaneo, la aplicación mostrará que no pudo confirmar el registro; vuelve a escanear cuando regrese la conexión.
- La PWA guarda la interfaz básica en caché, pero el escaneo y el guardado necesitan conexión.
- Si modificas `Code.gs` después de implementar, crea una nueva versión desde **Implementar → Administrar implementaciones → Editar → Nueva versión**.

# Instituto Ministerial Naciones — Lector QR (sin PIN)

Aplicación web instalable (PWA) para escanear códigos QR y registrar automáticamente el número de registro y la fecha/hora en la pestaña **G45** de Google Sheets.

## Dirección de arte

La interfaz sigue el moodboard compartido: papel crema con grano sutil, amarillo mostaza, azul cielo, negro y pequeños acentos terracota. Usa el logotipo negro del Instituto, tipografía geométrica de alto contraste y una pieza de collage editorial creada para esta aplicación. El área de cámara conserva alto contraste para facilitar el escaneo.

## Incluye

- Escaneo continuo con la cámara trasera del teléfono.
- Sin PIN, contraseña ni inicio de sesión.
- No hay botón de confirmación por cada lectura: reconoce el QR y envía el registro automáticamente.
- Escribe el número de registro en **X** y la fecha/hora en **Y**, en la misma fila de la persona encontrada.
- Evita sobrescribir un registro si la misma persona vuelve a escanear el mismo día.
- Instalable en Android y iPhone desde el navegador.
- URL de Apps Script ya cargada en `config.js`.
- Iconos PWA adaptados a la nueva paleta gráfica.

## Importante: actualizar la implementación de Apps Script

La URL proporcionada estaba implementada con la versión anterior que pedía PIN. Para que esta versión funcione sin PIN, primero hay que actualizar el código del mismo proyecto de Apps Script:

1. Abre el proyecto de Apps Script que generó esta URL: `https://script.google.com/`.
2. Abre el archivo `Code.gs`.
3. Reemplaza todo su contenido por el archivo `apps-script/Code.gs` incluido en este paquete.
4. Guarda los cambios.
5. Ve a **Implementar → Administrar implementaciones**.
6. En la implementación existente, pulsa el lápiz **Editar**.
7. En **Versión**, elige **Nueva versión** y pulsa **Implementar**.
8. Conserva la URL `/exec` existente. Es la que ya está escrita en `config.js`.
9. Ejecuta manualmente `testConnection` desde el editor y autoriza el acceso, si aún no lo habías hecho. Revisa el registro de ejecución: debe mostrar la pestaña G45 y la columna que detectó para el número de registro.

> Si Google te entrega una URL `/exec` distinta, actualiza `API_URL` en `config.js` con esa nueva dirección.

## Configuración de la hoja

El script ya está configurado con:

- ID de hoja: `1Bluv6D7Ox5pCReTmngW0ng66s_BYOPWBXadqNf6qXSk`
- Pestaña: `G45`
- Columna X: número/código de registro
- Columna Y: fecha y hora
- Zona horaria de registro: `America/Mexico_City`

El script busca un encabezado como `Registro`, `# Registro`, `Matrícula`, `Folio` o `Inscripción` en la fila 1. Si no detecta un encabezado único, usa la columna A como respaldo. **Antes de usarlo en una reunión, ejecuta `testConnection` y confirma que la columna detectada sea realmente la que contiene el número de registro.** Si no es así, cambia `REGISTRATION_COLUMN` en `apps-script/Code.gs` (A=1, B=2, C=3...) y vuelve a crear una nueva versión de la implementación.

## Subir a GitHub Pages

1. Descomprime este ZIP.
2. Crea un repositorio nuevo en GitHub, por ejemplo `instituto-naciones-qr`.
3. En el repositorio, selecciona **Add file → Upload files**.
4. Arrastra el contenido de esta carpeta (archivos y carpetas `assets` y `apps-script`) directamente a la raíz del repositorio. No subas una carpeta contenedora adicional. `index.html` debe quedar visible en la raíz.
5. Pulsa **Commit changes**.
6. Entra a **Settings → Pages**.
7. En **Build and deployment**, selecciona **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guarda.
8. Abre la URL HTTPS que GitHub Pages genere.

## Instalar en teléfonos

- **Android:** abre la URL en Chrome, abre el menú y elige **Instalar aplicación** o **Agregar a pantalla principal**.
- **iPhone:** abre la URL en Safari, toca **Compartir → Agregar a pantalla de inicio**.

Al abrirla, pulsa **Activar cámara** y concede el permiso. Ese toque inicial es necesario para que el navegador permita usar la cámara. Después, cada código QR se registra automáticamente, sin confirmación.

## Comportamiento de duplicados

Si la columna Y ya contiene un registro de la misma fecha local, la app informa que la persona ya estaba registrada y conserva su primera hora. Si el último registro es de otro día, actualiza X/Y con el escaneo nuevo.

## Seguridad y privacidad

Esta versión no usa PIN. Como el acceso de Apps Script debe configurarse como **Cualquier persona** para que los teléfonos puedan escribir sin iniciar sesión, cualquier persona que consiga la URL pública de Apps Script podría intentar enviar registros. No publiques esa URL y compártela solo con el equipo de confianza. No hay autenticación individual en esta versión.

## Requisitos

- GitHub Pages por HTTPS (la cámara del navegador requiere contexto seguro).
- Internet durante el escaneo y el guardado.
- La librería de cámara `html5-qrcode` se carga desde CDN; requiere conexión para descargarse.

# Instituto Naciones — Registro QR (diseño exacto de referencia)

Esta versión copia la composición de la imagen de referencia enviada: franja superior azul con el símbolo blanco centrado, fondo blanco, visor cuadrado gris con cuatro esquinas, campo `NOMBRE`, campo `PASE PARA:` y botón azul `REGISTRAR ASISTENCIA`.

## Funcionalidad

- El botón activa o detiene la cámara trasera.
- Cuando el lector detecta un QR, envía el código automáticamente; no hay que confirmar cada lectura.
- Google Apps Script busca el número de registro en la pestaña G45.
- Escribe el número en X y la fecha/hora en Y, en la misma fila.
- Evita guardar de nuevo a la misma persona el mismo día.
- Intenta obtener el nombre y el número de personas leyendo encabezados de la fila 1. Reconoce nombres como `Nombre`, `Nombre completo`, `Nombre y apellidos`, `Nombre(s)`, `Apellido paterno`, `Apellido materno`, `Pase para`, `Personas`, `Número de personas`, `Acompañantes`, `Boletos` o `Pases`. Si no localiza esos encabezados, la pantalla conserva los valores de ejemplo `NOMBRE COMPLETO` y `0 PERSONAS`.
- No solicita PIN ni contraseña.
- Es instalable como PWA en Android y iPhone.

## Subir a GitHub Pages

1. Descomprime el ZIP.
2. En GitHub abre el repositorio que ya creaste.
3. Selecciona **Add file → Upload files**.
4. Arrastra todo el contenido de esta carpeta a la raíz del repositorio. `index.html` debe quedar visible directamente en la raíz, no dentro de otra carpeta.
5. Confirma con **Commit changes**.
6. Verifica que GitHub Pages esté en **Settings → Pages → Deploy from a branch → main → /(root)**.
7. Abre el sitio publicado en HTTPS.

Esta versión cambia el identificador de caché y los parámetros de versión (`exacto-01`) para que el service worker no siga mostrando el diseño anterior.

## Actualizar Apps Script

Para que se devuelvan el nombre y el número de personas, reemplaza el contenido de `Code.gs` del proyecto asociado a la URL ya configurada por el archivo `apps-script/Code.gs` de este ZIP. Guarda y ve a **Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar**. Conserva la URL `/exec` si Google no genera otra.

La URL integrada en `config.js` es la implementación compartida por el usuario.

## Revisar datos de la hoja

El backend localiza en la fila 1 el encabezado del número de registro; si no lo detecta, usa A como respaldo. Si el número de registro está en otra columna y el encabezado tiene otro nombre, ajusta `REGISTRATION_COLUMN` (A=1, B=2, etc.) en `apps-script/Code.gs`.

El archivo de hoja no pudo verificarse desde esta sesión porque Google Sheets respondió que requiere autorización. Por ello la detección de nombre y personas usa los encabezados habituales listados arriba. Si los nombres de las columnas reales son distintos, habrá que agregar esos encabezados a la lista del script.

## Instalar en teléfonos

- Android: abre el sitio HTTPS en Chrome → menú → **Instalar aplicación**.
- iPhone: abre el sitio HTTPS en Safari → **Compartir → Agregar a pantalla de inicio**.

Al iniciar, pulsa `REGISTRAR ASISTENCIA` y concede permiso para usar la cámara. Durante la sesión escanea automáticamente y escribe en la hoja.

## Seguridad

La versión no utiliza PIN. El endpoint de Apps Script debe estar publicado para el acceso de los teléfonos; cualquier persona que tenga la URL pública podría intentar enviar datos. Comparte el enlace solo con el equipo correspondiente.

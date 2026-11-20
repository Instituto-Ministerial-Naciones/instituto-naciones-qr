# Instituto Ministerial Naciones — Lector QR

Versión con el diseño solicitado (barra azul, símbolo blanco, visor, nombre, pase para y botón azul), conexión a Google Apps Script y favicons reforzados.

## Actualización en GitHub Pages

1. Descomprime este ZIP.
2. En el repositorio, reemplaza los archivos anteriores por **todo** el contenido de esta carpeta.
3. Asegúrate de subir también `favicon-naciones-20261120.ico`, `favicon-naciones-20261120.svg` y la carpeta `assets` completa.
4. `index.html` debe quedar en la raíz del repositorio, al mismo nivel que `app.js`, `styles.css`, `config.js` y `manifest.webmanifest`.
5. Haz Commit changes y espera a que termine GitHub Pages.
6. Abre la página con recarga forzada. En Chrome de escritorio usa `Ctrl + Shift + R`.

## Logo superior

El símbolo blanco del encabezado está integrado como imagen embebida en `index.html` para que no dependa de que el archivo externo se haya subido correctamente. La carpeta `assets` conserva también `logo-mark-white.png` como recurso local.

## Ícono de pestaña y acceso directo

Se incluyen un favicon ICO de varios tamaños, favicon SVG, PNG de 16 y 32 px y un icono Apple Touch de 180 px. El `manifest.webmanifest` apunta a los iconos de 192 y 512 px para Android/PWA. Se cambió el nombre y versión de los archivos para evitar reutilizar el favicon antiguo del navegador.

**Nota:** los navegadores pueden conservar el favicon en caché. Si tras subir todo sigue apareciendo el icono anterior, cierra la pestaña y abre la URL en una pestaña nueva; en Android/iPhone elimina el acceso directo anterior y vuelve a instalar la PWA.

## Configuración de Google Apps Script

La URL proporcionada está configurada en `config.js`. No es necesario cambiarla salvo que se cree una nueva implementación de Apps Script.

## Funcionamiento

- El botón azul activa/detiene la cámara.
- El lector detecta códigos QR automáticamente.
- Los registros se envían a la pestaña `G45` a través de Apps Script.
- Las columnas destino son X (código de registro) y Y (fecha/hora), de acuerdo con el script incluido.

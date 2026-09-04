# Asistencias Deportes UTN FRH

Aplicación web simple para cargar asistencias deportivas desde celular.

## Objetivo

Pensada para profesores que no se llevan bien con la tecnología:

1. Elegir disciplina.
2. Sacar foto a la planilla.
3. La app revisa si la foto está borrosa, oscura o chica.
4. La app intenta leer los presentes.
5. El profesor revisa lo mínimo, puede agregar a alguien a mano y envía.

## Archivos

- `index.html`: pantalla principal.
- `styles.css`: diseño móvil.
- `app.js`: lógica de cámara, calidad de foto, OCR local, revisión y envío.
- `manifest.webmanifest`: instalación como app web.
- `sw.js`: caché básico de PWA.
- `backend.gs`: backend opcional para Google Apps Script, Google Sheets y OpenAI.

## Modo de prueba

La app funciona sin backend para probar el flujo. En ese caso usa OCR local con Tesseract.js y guarda una copia de respaldo en el celular.

Para abrir configuración:

```text
/asistencias/?admin=1
```

Ahí se puede pegar la URL del backend de Apps Script.

## Backend recomendado

Para guardar en Google Sheets y usar IA real con OpenAI:

1. Crear o abrir una planilla de Google Sheets.
2. Crear un proyecto en Apps Script.
3. Pegar el contenido de `backend.gs`.
4. En Apps Script, ir a **Project Settings > Script Properties**.
5. Agregar:
   - `SPREADSHEET_ID`: ID de la planilla.
   - `OPENAI_API_KEY`: clave de OpenAI.
   - `OPENAI_MODEL`: opcional. Por defecto usa `gpt-5-mini`.
6. Publicar como Web App.
7. Copiar la URL `/exec`.
8. Entrar a `/asistencias/?admin=1` y pegar esa URL.

## Estructura de Google Sheets

El backend crea estas hojas si no existen:

- `Alumnos`
- `Clases`
- `Asistencias`
- `Revisar`
- `Fotos`
- `Auditoria`

La hoja `Alumnos` conviene completarla con:

```text
id_alumno | nombre_completo | apellido | nombre | dni | legajo | mail | celular | carrera | estado_academico | seguro | activo | disciplina
```

## Idea de mejora posterior

- Panel exclusivo para Iván con rankings y promedios.
- Reporte mensual automático por disciplina.
- Detección de alumnos repetidos o mal escritos.
- Cruce con regularidad/seguro/estado académico.
- Exportación de informe para SAE o autoridades.

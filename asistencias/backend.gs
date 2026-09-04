/**
 * Backend opcional para Asistencias Deportes UTN FRH.
 * Pegar este archivo en Google Apps Script y configurar Script Properties:
 * - SPREADSHEET_ID: ID de la planilla de Google Sheets
 * - OPENAI_API_KEY: clave de OpenAI, solo si se quiere usar lectura inteligente de fotos
 * - OPENAI_MODEL: opcional, por defecto gpt-5-mini
 */

const SHEETS = {
  students: 'Alumnos',
  classes: 'Clases',
  attendance: 'Asistencias',
  review: 'Revisar',
  photos: 'Fotos',
  audit: 'Auditoria'
};

function doGet(e) {
  const action = (e.parameter.action || '').toLowerCase();
  if (action === 'config') return jsonResponse(getConfig_());
  return jsonResponse({ ok: true, app: 'Asistencias Deportes UTN FRH', actions: ['config'] });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    if (payload.action === 'analyzePhoto') return jsonResponse(analyzePhoto_(payload));
    if (payload.action === 'saveAttendance') return jsonResponse(saveAttendance_(payload));
    return jsonResponse({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function getConfig_() {
  const ss = getSpreadsheet_();
  ensureStructure_(ss);
  const studentsSheet = ss.getSheetByName(SHEETS.students);
  const values = studentsSheet.getDataRange().getValues();
  const headers = values.shift() || [];
  const rows = values.filter(row => row.some(Boolean));
  const idx = headerIndex_(headers);

  const students = rows.map(row => ({
    id: valueAt_(row, idx, 'id_alumno'),
    name: valueAt_(row, idx, 'nombre_completo') || [valueAt_(row, idx, 'apellido'), valueAt_(row, idx, 'nombre')].filter(Boolean).join(' '),
    dni: String(valueAt_(row, idx, 'dni') || '').replace(/\D+/g, ''),
    legajo: valueAt_(row, idx, 'legajo'),
    discipline: valueAt_(row, idx, 'disciplina'),
    active: String(valueAt_(row, idx, 'activo') || 'SI').toUpperCase() !== 'NO'
  })).filter(student => student.name || student.dni);

  const disciplines = Array.from(new Set(students.map(s => s.discipline).filter(Boolean)));
  const fallback = ['Futsal', 'Vóley masculino', 'Vóley femenino', 'Básquet masculino', 'Básquet femenino', 'Fútbol 11', 'Ajedrez', 'Otra'];
  return { ok: true, disciplines: disciplines.length ? disciplines : fallback, students };
}

function analyzePhoto_(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) return { ok: false, error: 'Falta OPENAI_API_KEY en Script Properties' };

  const model = PropertiesService.getScriptProperties().getProperty('OPENAI_MODEL') || 'gpt-5-mini';
  const imageDataUrl = payload.imageDataUrl;
  if (!imageDataUrl) return { ok: false, error: 'No llegó imagen' };

  const prompt = `
Analizá esta foto de una planilla de asistencia deportiva de UTN FRH.
Disciplina informada: ${payload.discipline || 'sin especificar'}.
Fecha informada: ${payload.date || 'sin especificar'}.

Objetivo:
- Detectar alumnos marcados como presentes.
- Leer nombre, apellido, DNI o legajo cuando aparezcan.
- Si algo no se entiende, no inventes: marcá REVISAR.
- Devolvé solo JSON válido.

Formato esperado:
{
  "rawText": "texto visible relevante",
  "records": [
    {"name":"Nombre Apellido", "dni":"12345678", "status":"PRESENTE", "confidence":0.0, "source":"openai_vision"}
  ]
}`;

  const body = {
    model,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: imageDataUrl, detail: 'high' }
      ]
    }],
    text: {
      format: {
        type: 'json_schema',
        name: 'attendance_photo_analysis',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            rawText: { type: 'string' },
            records: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  name: { type: 'string' },
                  dni: { type: 'string' },
                  status: { type: 'string', enum: ['PRESENTE', 'REVISAR'] },
                  confidence: { type: 'number' },
                  source: { type: 'string' }
                },
                required: ['name', 'dni', 'status', 'confidence', 'source']
              }
            }
          },
          required: ['rawText', 'records']
        }
      }
    }
  };

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${apiKey}` },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) return { ok: false, error: `OpenAI ${code}: ${text.slice(0, 500)}` };

  const data = JSON.parse(text);
  const outputText = data.output_text || extractOutputText_(data);
  const parsed = JSON.parse(outputText);
  parsed.ok = true;
  return parsed;
}

function saveAttendance_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const ss = getSpreadsheet_();
    ensureStructure_(ss);
    const now = new Date();
    const classId = Utilities.getUuid();
    const discipline = payload.discipline || '';
    const date = payload.date || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const records = Array.isArray(payload.records) ? payload.records : [];

    ss.getSheetByName(SHEETS.classes).appendRow([
      classId, date, discipline, '', '', '', payload.createdAt || now.toISOString(), payload.appVersion || ''
    ]);

    if (payload.quality || payload.rawText) {
      ss.getSheetByName(SHEETS.photos).appendRow([
        classId, date, discipline, now, JSON.stringify(payload.quality || {}), String(payload.rawText || '').slice(0, 45000)
      ]);
    }

    const attendanceRows = records.map(record => [
      classId,
      date,
      discipline,
      clean_(record.dni),
      clean_(record.name),
      clean_(record.status || 'PRESENTE'),
      clean_(record.source || 'app'),
      Number(record.confidence || 0),
      now,
      ''
    ]);

    if (attendanceRows.length) {
      const sheet = ss.getSheetByName(SHEETS.attendance);
      sheet.getRange(sheet.getLastRow() + 1, 1, attendanceRows.length, attendanceRows[0].length).setValues(attendanceRows);
    }

    const reviewRows = records
      .filter(record => String(record.status || '').toUpperCase() !== 'PRESENTE' || Number(record.confidence || 0) < 0.5)
      .map(record => [classId, date, discipline, clean_(record.name), clean_(record.dni), clean_(record.status), Number(record.confidence || 0), 'Pendiente']);
    if (reviewRows.length) {
      const sheet = ss.getSheetByName(SHEETS.review);
      sheet.getRange(sheet.getLastRow() + 1, 1, reviewRows.length, reviewRows[0].length).setValues(reviewRows);
    }

    ss.getSheetByName(SHEETS.audit).appendRow([now, 'app', 'saveAttendance', classId, JSON.stringify(payload.summary || {})]);
    return { ok: true, classId, saved: records.length };
  } finally {
    lock.releaseLock();
  }
}

function ensureStructure_(ss) {
  const headers = {
    [SHEETS.students]: ['id_alumno','nombre_completo','apellido','nombre','dni','legajo','mail','celular','carrera','estado_academico','seguro','activo','disciplina'],
    [SHEETS.classes]: ['id_clase','fecha','disciplina','profesor','lugar','observaciones','timestamp','version_app'],
    [SHEETS.attendance]: ['id_clase','fecha','disciplina','dni','alumno','estado','origen','confianza','timestamp','observacion'],
    [SHEETS.review]: ['id_clase','fecha','disciplina','alumno_detectado','dni_detectado','estado','confianza','resolucion'],
    [SHEETS.photos]: ['id_clase','fecha','disciplina','timestamp','calidad_foto_json','texto_detectado'],
    [SHEETS.audit]: ['timestamp','usuario','accion','id_clase','detalle']
  };

  Object.keys(headers).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
      sheet.setFrozenRows(1);
    }
  });
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Falta SPREADSHEET_ID en Script Properties');
  return SpreadsheetApp.openById(id);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function headerIndex_(headers) {
  const index = {};
  headers.forEach((header, i) => index[String(header).trim().toLowerCase()] = i);
  return index;
}

function valueAt_(row, idx, key) {
  const pos = idx[key];
  return pos === undefined ? '' : row[pos];
}

function clean_(value) {
  return String(value || '').trim();
}

function extractOutputText_(data) {
  const chunks = [];
  (data.output || []).forEach(item => {
    (item.content || []).forEach(part => {
      if (part.text) chunks.push(part.text);
    });
  });
  return chunks.join('\n');
}

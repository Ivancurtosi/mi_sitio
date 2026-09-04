const DEFAULT_DISCIPLINES = [
  'Futsal',
  'Vóley masculino',
  'Vóley femenino',
  'Básquet masculino',
  'Básquet femenino',
  'Fútbol 11',
  'Ajedrez',
  'Otra'
];

const state = {
  selectedFile: null,
  previewDataUrl: '',
  compressedDataUrl: '',
  quality: null,
  rawText: '',
  records: [],
  students: [],
  backendUrl: localStorage.getItem('asistencias_backend_url') || ''
};

const $ = (id) => document.getElementById(id);
const cards = ['startCard', 'qualityCard', 'processingCard', 'reviewCard', 'doneCard'];

function showCard(id) {
  cards.forEach((cardId) => $(cardId).classList.toggle('active', cardId === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 10);
}

function init() {
  $('classDate').value = todayInputValue();
  fillDisciplines(DEFAULT_DISCIPLINES);
  $('backendUrl').value = state.backendUrl;

  $('cameraButton').addEventListener('click', () => $('photoInput').click());
  $('galleryButton').addEventListener('click', () => $('galleryInput').click());
  $('photoInput').addEventListener('change', (event) => handleFile(event.target.files?.[0]));
  $('galleryInput').addEventListener('change', (event) => handleFile(event.target.files?.[0]));
  $('retakeButton').addEventListener('click', resetToStart);
  $('usePhotoButton').addEventListener('click', analyzeSelectedPhoto);
  $('addStudentButton').addEventListener('click', () => $('manualDialog').showModal());
  $('confirmManualButton').addEventListener('click', addManualStudent);
  $('sendButton').addEventListener('click', sendAttendance);
  $('newAttendanceButton').addEventListener('click', resetAll);
  $('saveConfigButton').addEventListener('click', saveConfig);

  const params = new URLSearchParams(location.search);
  if (params.has('admin')) $('adminPanel').classList.add('visible');

  registerServiceWorker();
  loadRemoteConfig();
}

function fillDisciplines(items) {
  $('disciplineSelect').innerHTML = '';
  items.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    $('disciplineSelect').appendChild(option);
  });
}

async function loadRemoteConfig() {
  if (!state.backendUrl) return;
  try {
    const url = new URL(state.backendUrl);
    url.searchParams.set('action', 'config');
    const response = await fetch(url.toString(), { method: 'GET' });
    const data = await response.json();
    if (data.ok) {
      if (Array.isArray(data.disciplines) && data.disciplines.length) fillDisciplines(data.disciplines);
      if (Array.isArray(data.students)) state.students = data.students;
    }
  } catch (error) {
    console.warn('No se pudo cargar configuración remota', error);
  }
}

async function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  state.selectedFile = file;
  $('progressText').textContent = 'Preparando imagen...';
  showCard('processingCard');

  try {
    const { preview, compressed, quality } = await prepareImage(file);
    state.previewDataUrl = preview;
    state.compressedDataUrl = compressed;
    state.quality = quality;
    $('previewImage').src = preview;
    renderQuality(quality);
    showCard('qualityCard');
  } catch (error) {
    alert('No se pudo leer la foto. Probá sacarla nuevamente.');
    resetToStart();
  }
}

function renderQuality(quality) {
  const box = $('qualityStatus');
  const warnings = quality.warnings || [];
  box.classList.toggle('warn', warnings.length > 0);
  if (!warnings.length) {
    box.innerHTML = '<strong>La foto parece utilizable.</strong><span>Podés continuar y revisar el resultado antes de enviar.</span>';
    return;
  }
  box.innerHTML = `
    <strong>La foto puede tener problemas.</strong>
    <span>Conviene sacarla de nuevo si podés.</span>
    <ul>${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
  `;
}

async function prepareImage(file) {
  const image = await fileToImage(file);
  const previewCanvas = resizeImage(image, 1800, 1800, 0.9);
  const compressedCanvas = resizeImage(image, 1300, 1300, 0.82);
  const preview = previewCanvas.toDataURL('image/jpeg', 0.9);
  const compressed = compressedCanvas.toDataURL('image/jpeg', 0.82);
  const quality = inspectQuality(previewCanvas);
  return { preview, compressed, quality };
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

function resizeImage(image, maxWidth, maxHeight, quality) {
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function inspectQuality(canvas) {
  const small = document.createElement('canvas');
  const targetWidth = 220;
  const targetHeight = Math.round(canvas.height * (targetWidth / canvas.width));
  small.width = targetWidth;
  small.height = Math.max(1, targetHeight);
  const ctx = small.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, small.width, small.height);
  const imageData = ctx.getImageData(0, 0, small.width, small.height);
  const data = imageData.data;

  let brightness = 0;
  const gray = new Float32Array(small.width * small.height);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = value;
    brightness += value;
  }
  brightness /= gray.length;

  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 1; y < small.height - 1; y += 1) {
    for (let x = 1; x < small.width - 1; x += 1) {
      const idx = y * small.width + x;
      const gx = Math.abs(gray[idx - 1] - gray[idx + 1]);
      const gy = Math.abs(gray[idx - small.width] - gray[idx + small.width]);
      edgeSum += gx + gy;
      edgeCount += 1;
    }
  }
  const sharpness = edgeSum / Math.max(1, edgeCount);
  const warnings = [];

  if (canvas.width < 900 || canvas.height < 900) warnings.push('La imagen parece chica. Acercate un poco más a la planilla.');
  if (brightness < 70) warnings.push('La foto salió oscura. Buscá más luz o activá el flash.');
  if (brightness > 225) warnings.push('La foto salió muy quemada. Evitá reflejos directos.');
  if (sharpness < 10) warnings.push('La foto puede estar borrosa. Apoyá el celular y sacala de nuevo.');

  return {
    width: canvas.width,
    height: canvas.height,
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness * 10) / 10,
    warnings
  };
}

async function analyzeSelectedPhoto() {
  showCard('processingCard');
  $('progressText').textContent = 'Leyendo la planilla...';

  let analysis = null;
  if (state.backendUrl) {
    analysis = await analyzeWithBackend().catch((error) => {
      console.warn('Falló el análisis remoto, paso a OCR local', error);
      return null;
    });
  }

  if (!analysis) {
    analysis = await analyzeWithLocalOcr();
  }

  state.rawText = analysis.rawText || '';
  state.records = normalizeRecords(analysis.records || [], state.rawText);
  renderReview();
  showCard('reviewCard');
}

async function analyzeWithBackend() {
  $('progressText').textContent = 'Consultando IA...';
  const response = await fetch(state.backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'analyzePhoto',
      discipline: $('disciplineSelect').value,
      date: $('classDate').value,
      imageDataUrl: state.compressedDataUrl,
      quality: state.quality
    })
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Error de análisis remoto');
  return data;
}

async function analyzeWithLocalOcr() {
  $('progressText').textContent = 'Leyendo texto en el celular...';
  if (!window.Tesseract) {
    return { rawText: '', records: [{ name: 'No se pudo cargar el lector de texto. Agregá los presentes manualmente.', status: 'REVISAR', confidence: 0 }] };
  }
  const result = await Tesseract.recognize(state.compressedDataUrl, 'spa', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        $('progressText').textContent = `Leyendo texto... ${Math.round((m.progress || 0) * 100)}%`;
      }
    }
  });
  const text = result?.data?.text || '';
  return { rawText: text, records: parseOcrText(text) };
}

function parseOcrText(text) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const ignored = /^(legajo|dni|apellido|nombre|firma|fecha|disciplina|asistencia|planilla|profesor|presentes?)$/i;
  const records = [];
  const seen = new Set();

  for (const line of lines) {
    if (ignored.test(line)) continue;
    const dni = line.match(/\b\d{7,9}\b/)?.[0] || '';
    let name = line
      .replace(/\b\d{7,9}\b/g, '')
      .replace(/[✓✔xX|_•,:;()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!name && dni) name = `DNI ${dni}`;
    if (name.length < 4 && !dni) continue;
    if (/^[\d\W]+$/.test(name)) continue;

    const key = `${name.toLowerCase()}-${dni}`;
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({ name, dni, status: 'PRESENTE', confidence: dni ? 0.75 : 0.55, source: 'ocr_local' });
  }

  if (!records.length) {
    records.push({ name: 'No se detectaron alumnos con seguridad', dni: '', status: 'REVISAR', confidence: 0, source: 'ocr_local' });
  }
  return records.slice(0, 80);
}

function normalizeRecords(records, rawText) {
  const normalized = [];
  const seen = new Set();
  for (const record of records) {
    const name = String(record.name || record.nombre || '').trim();
    const dni = String(record.dni || record.documento || '').replace(/\D+/g, '');
    if (!name && !dni) continue;
    const key = `${name.toLowerCase()}-${dni}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const confidence = Number(record.confidence ?? record.confianza ?? 0.5);
    normalized.push({
      name: name || `DNI ${dni}`,
      dni,
      status: confidence < 0.5 ? 'REVISAR' : String(record.status || record.estado || 'PRESENTE').toUpperCase(),
      confidence,
      source: record.source || record.origen || 'ia'
    });
  }
  return normalized;
}

function renderReview() {
  const present = state.records.filter((r) => r.status === 'PRESENTE');
  const review = state.records.filter((r) => r.status !== 'PRESENTE');
  const absent = calculateAutomaticAbsents();

  $('presentCount').textContent = present.length;
  $('reviewCount').textContent = review.length;
  $('absentCount').textContent = absent.length;
  $('rawText').textContent = state.rawText || 'Sin texto detectado.';

  const confidenceBad = state.quality?.warnings?.length || review.length;
  $('confidenceNotice').className = confidenceBad ? 'notice warn' : 'notice';
  $('confidenceNotice').textContent = confidenceBad
    ? 'Revisá rápido antes de enviar. La foto o algunos nombres pueden tener errores.'
    : 'Todo parece bastante claro. Igual podés corregir antes de enviar.';

  renderList('presentList', present);
  renderList('reviewList', review.length ? review : [{ name: 'No hay casos para revisar', dni: '', status: 'OK', confidence: 1 }]);
}

function calculateAutomaticAbsents() {
  if (!state.students.length) return [];
  const discipline = $('disciplineSelect').value;
  const presentKeys = new Set(state.records.map((r) => (r.dni || r.name).toLowerCase()));
  return state.students
    .filter((s) => !s.discipline || s.discipline === discipline || s.disciplina === discipline)
    .filter((s) => !presentKeys.has(String(s.dni || s.name || s.nombre || '').toLowerCase()));
}

function renderList(containerId, records) {
  const container = $(containerId);
  container.innerHTML = '';
  records.forEach((record, index) => {
    const row = document.createElement('div');
    row.className = `student-row ${record.status === 'REVISAR' ? 'review' : ''}`;
    row.innerHTML = `
      <div>
        <div class="student-name">${escapeHtml(record.name)}</div>
        <div class="student-meta">${record.dni ? `DNI ${escapeHtml(record.dni)} · ` : ''}${labelFor(record)}</div>
      </div>
      ${record.status === 'OK' ? '' : `<button class="toggle-button ${record.status === 'PRESENTE' ? 'present' : 'review'}" type="button" data-index="${index}" data-list="${containerId}">${record.status === 'PRESENTE' ? 'Presente' : 'Revisar'}</button>`}
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('.toggle-button').forEach((button) => {
    button.addEventListener('click', () => toggleRecord(button));
  });
}

function labelFor(record) {
  if (record.status === 'REVISAR') return 'Para revisar';
  if (record.status === 'OK') return 'Sin errores';
  const pct = Math.round((record.confidence || 0) * 100);
  return pct ? `Confianza ${pct}%` : 'Detectado';
}

function toggleRecord(button) {
  const visibleRecords = button.dataset.list === 'presentList'
    ? state.records.filter((r) => r.status === 'PRESENTE')
    : state.records.filter((r) => r.status !== 'PRESENTE');
  const selected = visibleRecords[Number(button.dataset.index)];
  const globalRecord = state.records.find((r) => r === selected);
  if (!globalRecord) return;
  globalRecord.status = globalRecord.status === 'PRESENTE' ? 'REVISAR' : 'PRESENTE';
  renderReview();
}

function addManualStudent() {
  const name = $('manualName').value.trim();
  const dni = $('manualDni').value.replace(/\D+/g, '');
  if (!name && !dni) return;
  state.records.push({ name: name || `DNI ${dni}`, dni, status: 'PRESENTE', confidence: 1, source: 'manual' });
  $('manualName').value = '';
  $('manualDni').value = '';
  $('manualDialog').close();
  renderReview();
}

async function sendAttendance() {
  const payload = buildPayload();
  $('sendButton').disabled = true;
  $('sendButton').textContent = 'Enviando...';

  if (state.backendUrl) {
    try {
      const response = await fetch(state.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveAttendance', ...payload })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo guardar');
      showDone('La asistencia quedó guardada en la planilla.');
      return;
    } catch (error) {
      console.warn(error);
      saveLocalBackup(payload);
      showDone('No pude confirmar el guardado online. Dejé una copia de respaldo en este celular.');
      return;
    } finally {
      $('sendButton').disabled = false;
      $('sendButton').textContent = 'Enviar asistencia';
    }
  }

  saveLocalBackup(payload);
  showDone('Modo prueba: la asistencia quedó guardada como respaldo local en este celular. Falta conectar Google Sheets.');
  $('sendButton').disabled = false;
  $('sendButton').textContent = 'Enviar asistencia';
}

function buildPayload() {
  return {
    appVersion: '2026.09.04-v1',
    discipline: $('disciplineSelect').value,
    date: $('classDate').value,
    createdAt: new Date().toISOString(),
    quality: state.quality,
    summary: {
      present: state.records.filter((r) => r.status === 'PRESENTE').length,
      review: state.records.filter((r) => r.status !== 'PRESENTE').length,
      automaticAbsent: calculateAutomaticAbsents().length
    },
    records: state.records,
    rawText: state.rawText
  };
}

function saveLocalBackup(payload) {
  const key = 'asistencias_backups';
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  current.unshift(payload);
  localStorage.setItem(key, JSON.stringify(current.slice(0, 30)));
}

function showDone(text) {
  $('doneText').textContent = text;
  showCard('doneCard');
}

function resetToStart() {
  showCard('startCard');
}

function resetAll() {
  state.selectedFile = null;
  state.previewDataUrl = '';
  state.compressedDataUrl = '';
  state.quality = null;
  state.rawText = '';
  state.records = [];
  $('photoInput').value = '';
  $('galleryInput').value = '';
  showCard('startCard');
}

function saveConfig() {
  state.backendUrl = $('backendUrl').value.trim();
  localStorage.setItem('asistencias_backend_url', state.backendUrl);
  alert('Configuración guardada.');
  loadRemoteConfig();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

init();

(() => {
  if (window.__ivoRockPolish) return;

  const layer = document.createElement('div');
  layer.className = 'ivo-polish-layer';
  layer.innerHTML = `
    <div class="ivo-polish-flash"></div>
    <div class="ivo-polish-hit"></div>
    <div class="ivo-polish-celebration">
      <small>IVO ROCK</small>
      <strong>RUTA COMPLETA</strong>
      <b class="ivo-polish-height">ALTURA +0000</b>
      <em class="ivo-polish-total">TIEMPO +0000 · TOTAL +0000</em>
      <span class="ivo-polish-next"></span>
    </div>
    <div class="ivo-polish-phase"><small>DIABLITO DEL METAL</small><strong>FASE 2 · EN LLAMAS</strong></div>`;
  document.body.appendChild(layer);

  const flash = layer.querySelector('.ivo-polish-flash');
  const hit = layer.querySelector('.ivo-polish-hit');
  const celebration = layer.querySelector('.ivo-polish-celebration');
  const celebrationTitle = celebration.querySelector('strong');
  const celebrationHeight = celebration.querySelector('.ivo-polish-height');
  const celebrationTotal = celebration.querySelector('.ivo-polish-total');
  const celebrationNext = celebration.querySelector('.ivo-polish-next');
  const phase = layer.querySelector('.ivo-polish-phase');

  let ctx = null;
  const ensureAudio = () => {
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch {
      return null;
    }
  };

  const note = (midi, start, duration, gain = .035, type = 'sawtooth', slide = 0) => {
    const audio = ensureAudio();
    if (!audio) return;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    const now = audio.currentTime + start;
    const hz = 440 * Math.pow(2, (midi - 69) / 12);
    const endHz = 440 * Math.pow(2, (midi + slide - 69) / 12);
    osc.type = type;
    osc.frequency.setValueAtTime(hz, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(28, endHz), now + duration);
    amp.gain.setValueAtTime(.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + .012);
    amp.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(amp).connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + .03);
  };

  const noise = (start = 0, duration = .08, gain = .025) => {
    const audio = ensureAudio();
    if (!audio) return;
    const len = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, len, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.createBufferSource();
    const amp = audio.createGain();
    src.buffer = buffer;
    amp.gain.value = gain;
    src.connect(amp).connect(audio.destination);
    src.start(audio.currentTime + start);
  };

  const pulseFlash = fire => {
    flash.classList.toggle('fire', !!fire);
    flash.classList.remove('show');
    requestAnimationFrame(() => flash.classList.add('show'));
    setTimeout(() => flash.classList.remove('show'), fire ? 170 : 105);
  };

  const microImpact = kind => {
    if (!hit) return;
    hit.className = `ivo-polish-hit ${kind || 'enemy'}`;
    void hit.offsetWidth;
    hit.classList.add('show');
    setTimeout(() => hit.classList.remove('show'), kind === 'boss' ? 115 : 80);
    if (kind !== 'power') navigator.vibrate?.(kind === 'boss' ? 18 : 9);
  };

  const sparks = (count = 18) => {
    for (let i = 0; i < count; i++) {
      const s = document.createElement('i');
      s.className = 'ivo-polish-spark';
      s.style.left = `${42 + Math.random() * 16}%`;
      s.style.top = `${42 + Math.random() * 16}%`;
      s.style.setProperty('--dx', `${-180 + Math.random() * 360}px`);
      s.style.setProperty('--dy', `${-180 + Math.random() * 250}px`);
      layer.appendChild(s);
      setTimeout(() => s.remove(), 950);
    }
  };

  const fireworkBurst = (x, y, color, scale = 1) => {
    const dots = 20;
    for (let i = 0; i < dots; i++) {
      const angle = (Math.PI * 2 * i) / dots + (i % 3) * .035;
      const radius = (72 + (i % 5) * 11) * scale;
      const dot = document.createElement('i');
      dot.className = 'ivo-firework-dot';
      dot.style.setProperty('--fw-x', `${x}%`);
      dot.style.setProperty('--fw-y', `${y}%`);
      dot.style.setProperty('--fw-dx', `${Math.cos(angle) * radius}px`);
      dot.style.setProperty('--fw-dy', `${Math.sin(angle) * radius}px`);
      dot.style.setProperty('--fw-color', color);
      layer.appendChild(dot);
      setTimeout(() => dot.remove(), 1050);
    }
    const core = document.createElement('i');
    core.className = 'ivo-firework-core';
    core.style.left = `${x}%`;
    core.style.top = `${y}%`;
    core.style.background = color;
    core.style.boxShadow = `0 0 24px ${color}, 0 0 48px ${color}`;
    layer.appendChild(core);
    setTimeout(() => core.remove(), 420);
  };

  const fireworks = final => {
    const bursts = final
      ? [[20,28,'#ffd85c',0,1.08],[79,24,'#71fff0',170,1],[48,18,'#ff5a73',390,1.18],[30,16,'#a779ff',650,.92],[70,34,'#ff8a2d',860,1.02]]
      : [[22,29,'#ffd85c',0,.95],[77,26,'#71fff0',190,.9],[50,18,'#ff5a73',430,1.02]];
    bursts.forEach(([x, y, color, delay, scale], index) => {
      setTimeout(() => {
        fireworkBurst(x, y, color, scale);
        noise(0, .075, index === 0 ? .03 : .022);
        note(72 + (index % 3) * 4, 0, .12, .018, 'triangle', 5);
      }, delay);
    });
  };

  const solo = final => {
    const base = final ? 52 : 55;
    const riff = final ? [0, 3, 5, 7, 10, 12, 15, 19] : [0, 3, 5, 7, 10, 12];
    riff.forEach((step, i) => {
      note(base + step, i * .075, i === riff.length - 1 ? .42 : .15, i === riff.length - 1 ? .06 : .035, i % 2 ? 'square' : 'sawtooth', i === riff.length - 1 ? 5 : 0);
    });
    note(base - 12, 0, .46, .045, 'triangle', -5);
    noise(0, .07, .03);
    noise(.24, .08, .025);
  };

  window.__ivoRockPolish = {
    goal(final = false, timeBonus = 0, heightBonus = 0, nextName = '') {
      const time = Math.max(0, Math.round(timeBonus));
      const height = Math.max(0, Math.round(heightBonus));
      const total = time + height;
      pulseFlash(false);
      sparks(final ? 46 : 34);
      fireworks(final);
      solo(final);
      celebrationTitle.textContent = final ? '¡GIRA COMPLETA!' : '¡RUTA COMPLETA!';
      celebrationHeight.textContent = `ALTURA +${height.toString().padStart(4, '0')}`;
      celebrationTotal.textContent = `TIEMPO +${time.toString().padStart(4, '0')} · TOTAL +${total.toString().padStart(4, '0')}`;
      celebrationNext.textContent = final ? 'FIN DE LA GIRA' : (nextName ? `PRÓXIMA PARADA · ${String(nextName).toUpperCase()}` : '');
      window.__ivoRockStats?.goal(height, time, final);
      celebration.classList.remove('show');
      requestAnimationFrame(() => celebration.classList.add('show'));
      setTimeout(() => celebration.classList.remove('show'), final ? 3400 : 2850);
      navigator.vibrate?.(final ? [60, 35, 70, 35, 100] : [45, 30, 65]);
    },

    bossPhase() {
      pulseFlash(true);
      sparks(28);
      phase.classList.remove('show');
      requestAnimationFrame(() => phase.classList.add('show'));
      setTimeout(() => phase.classList.remove('show'), 1350);
      note(38, 0, .18, .055, 'sawtooth', 7);
      note(45, .08, .22, .05, 'square', 7);
      note(52, .18, .34, .055, 'sawtooth', 12);
      noise(0, .13, .035);
      navigator.vibrate?.([70, 35, 110]);
    },

    impact(kind) {
      microImpact(kind);
      if (kind === 'smash') {
        note(34, 0, .11, .035, 'square', -5);
        noise(0, .09, .022);
      } else if (kind === 'power') {
        note(62, 0, .11, .025, 'triangle', 7);
        note(69, .08, .16, .025, 'square', 5);
      } else if (kind === 'boss') {
        note(40, 0, .09, .035, 'sawtooth', -4);
        noise(0, .07, .02);
      } else if (kind === 'enemy') {
        note(43, 0, .055, .018, 'square', -3);
        noise(0, .045, .012);
      }
    }
  };
})();
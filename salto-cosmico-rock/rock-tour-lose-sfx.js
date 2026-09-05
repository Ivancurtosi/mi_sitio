(() => {
  let audioCtx = null;

  const getAudioContext = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  };

  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  };

  // Unlock WebAudio from the player's first real touch so the lose jingle can
  // play later even though losing a life is not itself a user gesture.
  document.addEventListener('pointerdown', unlockAudio, { capture: true, once: true });
  document.addEventListener('keydown', unlockAudio, { capture: true, once: true });

  const gameIsMuted = () => [...document.querySelectorAll('.icon-btn')].some(button => {
    const label = (button.getAttribute('aria-label') || '').toLowerCase();
    return /activar sonido|activar audio|desilenciar/.test(label);
  });

  function playLoseSound() {
    if (gameIsMuted()) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime + 0.01;
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const drive = ctx.createWaveShaper();

    // Mild distortion gives the little jingle a rock/amp character instead of
    // sounding like a plain phone beep.
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i++) {
      const x = i * 2 / (curve.length - 1) - 1;
      curve[i] = Math.tanh(2.8 * x);
    }
    drive.curve = curve;
    drive.oversample = '2x';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1250, now);
    filter.frequency.exponentialRampToValueAtTime(520, now + 0.72);
    filter.Q.value = 1.1;

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.018);
    master.gain.setValueAtTime(0.22, now + 0.48);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);
    master.connect(filter);
    filter.connect(ctx.destination);

    const notes = [196, 147, 110, 82.4];
    notes.forEach((root, index) => {
      const start = now + index * 0.115;
      const duration = index === notes.length - 1 ? 0.36 : 0.18;

      [1, 1.5].forEach((ratio, voice) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = voice === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(root * ratio, start);
        osc.frequency.exponentialRampToValueAtTime(root * ratio * 0.82, start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(voice === 0 ? 0.20 : 0.055, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(drive);
        drive.connect(master);
        osc.start(start);
        osc.stop(start + duration + 0.02);
      });
    });

    // Short low thump at the end, like the stage dropping out under the player.
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(72, now + 0.34);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.72);
    thumpGain.gain.setValueAtTime(0.0001, now + 0.34);
    thumpGain.gain.exponentialRampToValueAtTime(0.28, now + 0.36);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.74);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    thump.start(now + 0.34);
    thump.stop(now + 0.76);

    navigator.vibrate?.([35, 28, 65]);
    window.__rockLoseSfxPlayedAt = performance.now();
  }

  window.__rockLoseSfx = playLoseSound;

  const parseLives = node => {
    const match = (node?.textContent || '').match(/\d+/);
    return match ? Number(match[0]) : null;
  };

  function installLivesObserver() {
    const item = [...document.querySelectorAll('.hud-item')].find(el => /VIDAS/i.test(el.textContent || ''));
    const value = item?.querySelector('b');
    if (!value || value.dataset.rockLoseSfxReady) return;

    value.dataset.rockLoseSfxReady = '1';
    let previous = parseLives(value);
    const observer = new MutationObserver(() => {
      const next = parseLives(value);
      if (previous !== null && next !== null && next < previous) playLoseSound();
      previous = next;
    });
    observer.observe(value, { childList: true, subtree: true, characterData: true });
  }

  new MutationObserver(installLivesObserver).observe(document.documentElement, { childList: true, subtree: true });
  installLivesObserver();
})();

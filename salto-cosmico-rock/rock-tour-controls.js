(() => {
  const syntheticHeld = new Set();
  const dispatchKey = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
  const keyDown = key => { if (!syntheticHeld.has(key)) { syntheticHeld.add(key); dispatchKey('keydown', key); } };
  const keyUp = key => { if (syntheticHeld.delete(key)) dispatchKey('keyup', key); };

  window.__rockRunHeld = false;
  const controlHeld = new Set();
  const sendControl = (name, on) => {
    const token = `touch:${name}`;
    const bridge = window.__rockControl;
    if (typeof bridge === 'function') {
      if (on && !controlHeld.has(name)) { controlHeld.add(name); bridge(name, true, token); }
      else if (!on && controlHeld.delete(name)) bridge(name, false, token);
      return true;
    }
    const key = name === 'left' ? 'ArrowLeft' : name === 'right' ? 'ArrowRight' : name === 'down' ? 'ArrowDown' : name === 'jump' ? ' ' : name === 'action' ? 'Shift' : null;
    if (key) on ? keyDown(key) : keyUp(key);
    return false;
  };
  const releaseMove = () => ['left','right','down'].forEach(name => sendControl(name, false));
  const setRun = on => {
    window.__rockRunHeld = !!on;
    sendControl('action', !!on);
  };

  function installAnalog() {
    const move = document.querySelector('.move-controls');
    if (!move || move.dataset.analogReady) return;
    move.dataset.analogReady = '1';

    const analog = document.createElement('div');
    analog.className = 'rock-analog';
    analog.setAttribute('aria-label', 'Control analógico');
    analog.innerHTML = '<div class="rock-analog-ring"><span class="rock-analog-down">▼</span></div><div class="rock-analog-knob"></div>';
    move.appendChild(analog);

    const knob = analog.querySelector('.rock-analog-knob');
    let activeId = null;
    const update = ev => {
      const r = analog.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = ev.clientX - cx, dy = ev.clientY - cy;
      const max = r.width * 0.31;
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx *= max / len; dy *= max / len; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / max, ny = dy / max;
      sendControl('left', nx < -0.22);
      sendControl('right', nx > 0.22);
      sendControl('down', ny > 0.42);
      window.__rockAnalogDebug = { nx, ny, bridge: typeof window.__rockControl === 'function', held: [...controlHeld], run: window.__rockRunHeld };
    };
    const finish = ev => {
      if (activeId !== null && ev.pointerId !== activeId) return;
      activeId = null;
      knob.style.transform = 'translate(0px, 0px)';
      releaseMove();
    };
    analog.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      activeId = ev.pointerId;
      try { analog.setPointerCapture(ev.pointerId); } catch {}
      update(ev);
    }, { passive: false });
    analog.addEventListener('pointermove', ev => {
      if (ev.pointerId === activeId) { ev.preventDefault(); update(ev); }
    }, { passive: false });
    analog.addEventListener('pointerup', finish);
    analog.addEventListener('pointercancel', finish);
    analog.addEventListener('lostpointercapture', finish);
  }

  let runPointer = null;
  let slideJump = false;
  function installRunSlide() {
    const run = document.querySelector('.action-btn');
    const jump = document.querySelector('.jump-btn');
    if (!run || !jump || run.dataset.slideReady) return;
    run.dataset.slideReady = '1';

    run.addEventListener('pointerdown', ev => {
      runPointer = ev.pointerId;
      slideJump = false;
      setRun(true);
    }, { capture: true, passive: false });

    document.addEventListener('pointermove', ev => {
      if (ev.pointerId !== runPointer || slideJump) return;
      const r = jump.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
        slideJump = true;
        sendControl('jump', true);
        jump.classList.add('slide-jump-active');
        navigator.vibrate?.(18);
      }
    }, { capture: true, passive: true });

    const end = ev => {
      if (ev.pointerId !== runPointer) return;
      runPointer = null;
      setRun(false);
      if (slideJump) sendControl('jump', false);
      slideJump = false;
      jump.classList.remove('slide-jump-active');
    };
    document.addEventListener('pointerup', end, { capture: true });
    document.addEventListener('pointercancel', end, { capture: true });
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let fullscreenBusy = false;

  function getFullscreenGuard() {
    let guard = document.querySelector('.rock-fullscreen-guard');
    if (guard) return guard;
    guard = document.createElement('div');
    guard.className = 'rock-fullscreen-guard';
    guard.innerHTML = '<div class="rock-fullscreen-guard-inner"><small>PANTALLA COMPLETA</small><strong>...</strong><span>Preparando el escenario</span></div>';
    document.body.appendChild(guard);
    return guard;
  }

  const resumeIfPaused = () => {
    const btn = [...document.querySelectorAll('.overlay .play-btn')].find(el => /continuar/i.test(el.textContent || ''));
    btn?.click();
  };

  async function safeFullscreen() {
    if (fullscreenBusy || document.fullscreenElement || document.webkitFullscreenElement) return;
    fullscreenBusy = true;
    releaseMove();
    setRun(false);
    sendControl('jump', false);

    const wasPlaying = !!document.querySelector('.touch-controls');
    const pauseButton = document.querySelector('.icon-btn[aria-label="Pausar"]');
    const guard = getFullscreenGuard();
    const strong = guard.querySelector('strong');
    const caption = guard.querySelector('span');
    guard.classList.add('show');
    strong.textContent = '...';
    caption.textContent = 'Entrando a pantalla completa';

    try {
      const root = document.documentElement;
      let request;
      if (root.requestFullscreen) request = root.requestFullscreen();
      else if (root.webkitRequestFullscreen) request = root.webkitRequestFullscreen();
      else throw new Error('Fullscreen no disponible');

      // Pause immediately after requesting fullscreen, while the browser shows its native message.
      if (wasPlaying) pauseButton?.click();
      await Promise.resolve(request);

      // Android's native fullscreen hint cannot be hidden by a website. Keep gameplay paused
      // until that hint has had time to disappear, then give the player a clear countdown.
      await sleep(2350);
      caption.textContent = 'Volvemos al juego';
      for (const number of ['3', '2', '1']) {
        strong.textContent = number;
        await sleep(570);
      }
      strong.textContent = '¡YA!';
      await sleep(330);
      guard.classList.remove('show');
      if (wasPlaying) resumeIfPaused();
    } catch (error) {
      guard.classList.remove('show');
      if (wasPlaying) resumeIfPaused();
      console.warn('Rock Tour fullscreen:', error);
    } finally {
      fullscreenBusy = false;
    }
  }

  function installSafeFullscreen() {
    const button = document.querySelector('.fullscreen-btn');
    if (!button || button.dataset.safeFullscreen) return;
    button.dataset.safeFullscreen = '1';
    button.title = 'Pantalla completa';
    button.addEventListener('click', ev => {
      // Replace the original immediate fullscreen action with the safe paused version.
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      safeFullscreen();
    }, true);
  }

  const releaseAll = () => {
    releaseMove();
    setRun(false);
    sendControl('jump', false);
  };
  const install = () => { installAnalog(); installRunSlide(); installSafeFullscreen(); };
  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
  install();
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
})();

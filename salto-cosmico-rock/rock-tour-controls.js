(() => {
  const syntheticHeld = new Set();
  const dispatchKey = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
  const keyDown = key => { if (!syntheticHeld.has(key)) { syntheticHeld.add(key); dispatchKey('keydown', key); } };
  const keyUp = key => { if (syntheticHeld.delete(key)) dispatchKey('keyup', key); };

  const controlHeld = new Set();
  const sendControl = (name, on) => {
    const token = `touch:${name}`;
    const bridge = window.__rockControl;
    if (typeof bridge === 'function') {
      if (on && !controlHeld.has(name)) { controlHeld.add(name); bridge(name, true, token); }
      else if (!on && controlHeld.delete(name)) bridge(name, false, token);
      return true;
    }
    // Fallback only while an old cached game bundle is still loading.
    const key = name === 'left' ? 'ArrowLeft' : name === 'right' ? 'ArrowRight' : name === 'down' ? 'ArrowDown' : name === 'jump' ? ' ' : name === 'action' ? 'Shift' : null;
    if (key) on ? keyDown(key) : keyUp(key);
    return false;
  };
  const releaseMove = () => ['left','right','down'].forEach(name => sendControl(name, false));

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
      window.__rockAnalogDebug = { nx, ny, bridge: typeof window.__rockControl === 'function', held: [...controlHeld] };
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
      sendControl('action', true);
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
      sendControl('action', false);
      if (slideJump) sendControl('jump', false);
      slideJump = false;
      jump.classList.remove('slide-jump-active');
    };
    document.addEventListener('pointerup', end, { capture: true });
    document.addEventListener('pointercancel', end, { capture: true });
  }

  const install = () => { installAnalog(); installRunSlide(); };
  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
  install();
  window.addEventListener('blur', () => { releaseMove(); sendControl('action', false); sendControl('jump', false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseMove(); sendControl('action', false); sendControl('jump', false); } });
})();

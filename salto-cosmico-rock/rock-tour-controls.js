(() => {
  const syntheticHeld = new Set();
  const dispatchKey = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
  const down = key => { if (!syntheticHeld.has(key)) { syntheticHeld.add(key); dispatchKey('keydown', key); } };
  const up = key => { if (syntheticHeld.delete(key)) dispatchKey('keyup', key); };
  const setKey = (key, on) => on ? down(key) : up(key);
  const releaseMove = () => ['ArrowLeft','ArrowRight','ArrowDown'].forEach(up);

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
      setKey('ArrowLeft', nx < -0.28);
      setKey('ArrowRight', nx > 0.28);
      setKey('ArrowDown', ny > 0.44);
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
      analog.setPointerCapture(ev.pointerId);
      update(ev);
    });
    analog.addEventListener('pointermove', ev => { if (ev.pointerId === activeId) update(ev); });
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
    }, { capture: true });

    document.addEventListener('pointermove', ev => {
      if (ev.pointerId !== runPointer || slideJump) return;
      const r = jump.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
        slideJump = true;
        down(' ');
        jump.classList.add('slide-jump-active');
        if (navigator.vibrate) navigator.vibrate(18);
      }
    }, { capture: true, passive: true });

    const end = ev => {
      if (ev.pointerId !== runPointer) return;
      runPointer = null;
      if (slideJump) up(' ');
      slideJump = false;
      jump.classList.remove('slide-jump-active');
    };
    document.addEventListener('pointerup', end, { capture: true });
    document.addEventListener('pointercancel', end, { capture: true });
  }

  const install = () => { installAnalog(); installRunSlide(); };
  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
  install();
  window.addEventListener('blur', () => { releaseMove(); up(' '); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseMove(); up(' '); } });
})();

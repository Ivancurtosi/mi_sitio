(() => {
  if (window.__ivoRockMenuInstalled) return;
  window.__ivoRockMenuInstalled = true;

  const state = {
    mode: 1,
    activePlayer: 1,
    started: false,
    starting: false,
    lastLives: null,
    lastStage: null,
    switchTimer: 0
  };

  const players = {
    1: { name: 'IVO' },
    2: { name: 'VOLT' }
  };

  window.__ivoGameMode = 1;
  window.__ivoActivePlayer = 1;

  // Keep the alternate visual identity for player 2, but don't clutter the menu with character cards.
  const proto = window.CanvasRenderingContext2D?.prototype;
  if (proto && !proto.__ivoRockDrawImagePatched) {
    const nativeDrawImage = proto.drawImage;
    Object.defineProperty(proto, '__ivoRockDrawImagePatched', { value: true });
    proto.drawImage = function (...args) {
      const image = args[0];
      const src = image && typeof image.src === 'string' ? image.src : '';
      const isHero = src.includes('rock-hero.webp');
      if (!isHero || window.__ivoActivePlayer !== 2) return nativeDrawImage.apply(this, args);

      this.save();
      try {
        if ('filter' in this) this.filter = 'hue-rotate(155deg) saturate(1.55) contrast(1.08) brightness(.95)';
        nativeDrawImage.apply(this, args);
        if (args.length >= 9) {
          const dx = Number(args[5]);
          const dy = Number(args[6]);
          const dw = Number(args[7]);
          const dh = Number(args[8]);
          if ([dx, dy, dw, dh].every(Number.isFinite)) {
            this.filter = 'none';
            this.shadowColor = '#65f7ff';
            this.shadowBlur = 7;
            this.fillStyle = '#65f7ff';
            this.beginPath();
            this.moveTo(dx + dw * .40, dy + dh * .15);
            this.lineTo(dx + dw * .50, dy - dh * .035);
            this.lineTo(dx + dw * .60, dy + dh * .15);
            this.closePath();
            this.fill();
            this.shadowBlur = 0;
          }
        }
      } finally {
        this.restore();
      }
    };
  }

  const menu = document.createElement('div');
  menu.className = 'ivo-start-menu';
  menu.innerHTML = `
    <div class="ivo-menu-stage" role="dialog" aria-modal="true" aria-label="Menú principal de Ivo Rock">
      <h1 class="ivo-menu-title">IVO ROCK</h1>
      <div class="ivo-menu-options" role="group" aria-label="Modo de juego">
        <button type="button" class="ivo-menu-choice selected" data-mode="1"><span>▶</span> 1 PLAYER</button>
        <button type="button" class="ivo-menu-choice" data-mode="2"><span>▶</span> 2 PLAYERS</button>
      </div>
      <button type="button" class="ivo-menu-fullscreen" aria-label="Pantalla completa">⛶ PANTALLA COMPLETA</button>
    </div>`;
  document.body.appendChild(menu);

  const choices = [...menu.querySelectorAll('.ivo-menu-choice')];
  const fullscreenButton = menu.querySelector('.ivo-menu-fullscreen');

  function startMenuMusic() {
    try { window.__rockPlaylist?.play('boss'); } catch {}
  }

  // Ask for the heavy menu track immediately. Mobile browsers may block sound
  // until the first touch; if that happens, the first touch starts it automatically.
  startMenuMusic();
  const firstGesture = () => {
    startMenuMusic();
    menu.removeEventListener('pointerdown', firstGesture, true);
    menu.removeEventListener('touchstart', firstGesture, true);
  };
  menu.addEventListener('pointerdown', firstGesture, true);
  menu.addEventListener('touchstart', firstGesture, { capture: true, passive: true });

  async function requestFullscreen() {
    startMenuMusic();
    const el = document.documentElement;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {}
  }

  fullscreenButton.addEventListener('click', e => {
    e.preventDefault();
    requestFullscreen();
  });

  function ensureHudTag() {
    let tag = document.querySelector('.ivo-player-turn-tag');
    if (!tag) {
      tag = document.createElement('div');
      tag.className = 'ivo-player-turn-tag';
      document.body.appendChild(tag);
    }
    return tag;
  }

  function announcePlayer(player) {
    if (state.mode !== 2 || !state.started) return;
    let banner = document.querySelector('.ivo-turn-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'ivo-turn-banner';
      document.body.appendChild(banner);
    }
    banner.innerHTML = `<small>TURNO DE</small><strong>${players[player].name}</strong>`;
    banner.classList.remove('show');
    requestAnimationFrame(() => banner.classList.add('show'));
    window.setTimeout(() => banner.classList.remove('show'), 900);
  }

  function setActivePlayer(player, announce = false) {
    state.activePlayer = player;
    window.__ivoActivePlayer = player;
    document.documentElement.dataset.ivoPlayer = String(player);
    const tag = ensureHudTag();
    if (state.mode === 2) {
      tag.hidden = false;
      tag.textContent = `P${player} · ${players[player].name}`;
      tag.dataset.player = String(player);
    } else {
      tag.hidden = true;
    }
    if (announce) announcePlayer(player);
  }

  function switchPlayer(delay = 0) {
    if (state.mode !== 2 || !state.started) return;
    window.clearTimeout(state.switchTimer);
    state.switchTimer = window.setTimeout(() => {
      setActivePlayer(state.activePlayer === 1 ? 2 : 1, true);
    }, delay);
  }

  function readHud() {
    const livesItem = [...document.querySelectorAll('.hud-item')].find(el => el.querySelector('span')?.textContent?.trim() === 'VIDAS');
    const livesText = livesItem?.querySelector('b')?.textContent || '';
    const lives = Number((livesText.match(/\d+/) || [])[0]);
    const stageText = document.querySelector('.hud-stage b')?.textContent || '';
    const stage = Number((stageText.match(/\d+/) || [])[0]);
    return {
      lives: Number.isFinite(lives) ? lives : null,
      stage: Number.isFinite(stage) ? stage : null
    };
  }

  window.setInterval(() => {
    if (!state.started) return;
    const { lives, stage } = readHud();
    if (state.lastLives == null && lives != null) state.lastLives = lives;
    if (state.lastStage == null && stage != null) state.lastStage = stage;

    if (state.mode === 2) {
      if (lives != null && state.lastLives != null && lives < state.lastLives && lives > 0) switchPlayer(1250);
      if (stage != null && state.lastStage != null && stage > state.lastStage) switchPlayer(120);
      if (lives != null && state.lastLives === 0 && lives >= 3 && stage === 1) setActivePlayer(1, true);
    }

    if (lives != null) state.lastLives = lives;
    if (stage != null) state.lastStage = stage;
  }, 180);

  function startGame(mode) {
    if (state.starting) return;
    state.starting = true;
    state.mode = mode;
    window.__ivoGameMode = mode;
    setActivePlayer(1, false);
    startMenuMusic();
    choices.forEach(btn => btn.classList.toggle('selected', Number(btn.dataset.mode) === mode));
    menu.classList.add('starting');

    window.setTimeout(() => {
      const playButton = [...document.querySelectorAll('.play-btn')].find(btn => /arrancar la gira/i.test(btn.textContent || ''));
      menu.remove();
      state.started = true;
      const hud = readHud();
      state.lastLives = hud.lives;
      state.lastStage = hud.stage;
      if (mode === 2) announcePlayer(1);
      playButton?.click();
    }, 420);
  }

  choices.forEach(button => {
    button.addEventListener('pointerenter', () => {
      choices.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      startMenuMusic();
    });
    button.addEventListener('click', e => {
      e.preventDefault();
      startGame(Number(button.dataset.mode));
    });
  });

  let keyboardMode = 1;
  window.addEventListener('keydown', e => {
    if (!document.body.contains(menu) || state.starting) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      keyboardMode = keyboardMode === 1 ? 2 : 1;
      choices.forEach(btn => btn.classList.toggle('selected', Number(btn.dataset.mode) === keyboardMode));
      startMenuMusic();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startGame(keyboardMode);
    }
  });
})();

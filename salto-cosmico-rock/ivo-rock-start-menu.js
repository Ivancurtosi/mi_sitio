(() => {
  if (window.__ivoRockMenuInstalled) return;
  window.__ivoRockMenuInstalled = true;

  const state = {
    mode: 1,
    activePlayer: 1,
    started: false,
    starting: false,
    menuMusic: false,
    lastLives: null,
    lastStage: null,
    switchTimer: 0
  };

  const players = {
    1: { name: 'IVO', accent: 'rojo' },
    2: { name: 'VOLT', accent: 'cyan' }
  };

  window.__ivoGameMode = 1;
  window.__ivoActivePlayer = 1;

  // Give player 2 a genuinely different on-canvas look without replacing the
  // approved player artwork: colder palette + a bright rock mohawk/crest.
  const proto = window.CanvasRenderingContext2D?.prototype;
  if (proto && !proto.__ivoRockDrawImagePatched) {
    const nativeDrawImage = proto.drawImage;
    Object.defineProperty(proto, '__ivoRockDrawImagePatched', { value: true });
    proto.drawImage = function (...args) {
      const image = args[0];
      const src = image && typeof image.src === 'string' ? image.src : '';
      const isHero = src.includes('rock-hero.webp');
      if (!isHero || window.__ivoActivePlayer !== 2) {
        return nativeDrawImage.apply(this, args);
      }

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
      <div class="ivo-menu-kicker">WORLD ROCK TOUR · 2026</div>
      <div class="ivo-menu-logo" aria-label="Ivo Rock"><span>IVO</span><strong>ROCK</strong></div>
      <div class="ivo-menu-bolt" aria-hidden="true">⚡</div>

      <div class="ivo-menu-characters" aria-label="Personajes">
        <div class="ivo-character-card player-one">
          <div class="ivo-character-icon">I</div>
          <div><b>IVO</b><small>PLAYER 1 · FUEGO</small></div>
        </div>
        <div class="ivo-character-vs">VS</div>
        <div class="ivo-character-card player-two">
          <div class="ivo-character-icon">V</div>
          <div><b>VOLT</b><small>PLAYER 2 · NEÓN</small></div>
        </div>
      </div>

      <div class="ivo-menu-options" role="group" aria-label="Modo de juego">
        <button type="button" class="ivo-menu-choice selected" data-mode="1"><span>▶</span> 1 PLAYER</button>
        <button type="button" class="ivo-menu-choice" data-mode="2"><span>▶</span> 2 PLAYERS <small>POR TURNOS</small></button>
      </div>

      <button type="button" class="ivo-menu-sound">♫ ACTIVAR MÚSICA DURA</button>
      <div class="ivo-menu-status">ELEGÍ TU MODO · CORRÉ · SALTÁ · ROMPÉ TODO</div>
      <div class="ivo-menu-credit">IVO ROCK</div>
    </div>`;
  document.body.appendChild(menu);

  const choices = [...menu.querySelectorAll('.ivo-menu-choice')];
  const soundButton = menu.querySelector('.ivo-menu-sound');
  const status = menu.querySelector('.ivo-menu-status');

  function startMenuMusic() {
    if (state.menuMusic) return;
    state.menuMusic = true;
    try { window.__rockPlaylist?.play('boss'); } catch {}
    soundButton.textContent = '♫ MÚSICA ON';
    soundButton.classList.add('on');
  }

  soundButton.addEventListener('click', e => {
    e.preventDefault();
    startMenuMusic();
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

  function watchTwoPlayerTurns() {
    window.setInterval(() => {
      if (!state.started) return;
      const { lives, stage } = readHud();

      if (state.lastLives == null && lives != null) state.lastLives = lives;
      if (state.lastStage == null && stage != null) state.lastStage = stage;

      if (state.mode === 2) {
        if (lives != null && state.lastLives != null && lives < state.lastLives && lives > 0) {
          // Death animation lasts about 1.45 s; swap just before the respawn.
          switchPlayer(1250);
        }
        if (stage != null && state.lastStage != null && stage > state.lastStage) {
          switchPlayer(120);
        }
        if (lives != null && state.lastLives === 0 && lives >= 3 && stage === 1) {
          setActivePlayer(1, true);
        }
      }

      if (lives != null) state.lastLives = lives;
      if (stage != null) state.lastStage = stage;
    }, 180);
  }

  function startGame(mode) {
    if (state.starting) return;
    state.starting = true;
    state.mode = mode;
    window.__ivoGameMode = mode;
    setActivePlayer(1, false);
    startMenuMusic();

    choices.forEach(btn => btn.classList.toggle('selected', Number(btn.dataset.mode) === mode));
    status.textContent = mode === 2 ? 'IVO + VOLT · DOS PLAYERS · POR TURNOS' : 'IVO · 1 PLAYER · GET READY';
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
    }, 720);
  }

  choices.forEach(button => {
    button.addEventListener('pointerenter', () => {
      choices.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
    });
    button.addEventListener('click', e => {
      e.preventDefault();
      startGame(Number(button.dataset.mode));
    });
  });

  // Keyboard support, while keeping touch as the main target.
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

  watchTwoPlayerTurns();
})();

(() => {
  if (window.__ivoRockMenuInstalled) return;
  window.__ivoRockMenuInstalled = true;

  try { localStorage.removeItem('ivo-rock-progress-v3'); } catch {}
  const state = {
    mode: 1,
    activePlayer: 1,
    started: false,
    starting: false,
    lastLives: null,
    lastStage: null,
    switchTimer: 0,
    playerLives: {
      1: 3,
      2: 3
    }
  };

  const players = { 1: { name: 'IVO' }, 2: { name: 'VOLT' } };
  window.__ivoGameMode = state.mode;
  window.__ivoActivePlayer = 1;

  const persist = () => {};

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
          const dx = Number(args[5]), dy = Number(args[6]), dw = Number(args[7]), dh = Number(args[8]);
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

  function renderHudTag() {
    const tag = ensureHudTag();
    if (state.mode !== 2 || !state.started) {
      tag.hidden = true;
      return;
    }
    tag.hidden = false;
    tag.dataset.player = String(state.activePlayer);
    tag.innerHTML = `<span class="${state.activePlayer === 1 ? 'active' : ''}">P1 IVO ×${state.playerLives[1]}</span><i>·</i><span class="${state.activePlayer === 2 ? 'active' : ''}">P2 VOLT ×${state.playerLives[2]}</span>`;
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
    setTimeout(() => banner.classList.remove('show'), 900);
  }

  function syncEngineLives() {
    if (state.mode === 2) window.__rockSetLives?.(state.playerLives[state.activePlayer]);
  }

  function setActivePlayer(player, announce = false) {
    state.activePlayer = player;
    window.__ivoActivePlayer = player;
    document.documentElement.dataset.ivoPlayer = String(player);
    renderHudTag();
    requestAnimationFrame(syncEngineLives);
    if (announce) announcePlayer(player);
    persist();
  }

  function switchPlayer(delay = 0) {
    if (state.mode !== 2 || !state.started) return;
    clearTimeout(state.switchTimer);
    state.switchTimer = setTimeout(() => {
      const other = state.activePlayer === 1 ? 2 : 1;
      if (state.playerLives[other] > 0) setActivePlayer(other, true);
      else if (state.playerLives[state.activePlayer] > 0) setActivePlayer(state.activePlayer, true);
    }, delay);
  }

  function readHud() {
    const livesItem = [...document.querySelectorAll('.hud-item')].find(el => el.querySelector('span')?.textContent?.trim() === 'VIDAS');
    const lives = Number(((livesItem?.querySelector('b')?.textContent || '').match(/\d+/) || [])[0]);
    const stage = Number(((document.querySelector('.hud-stage b')?.textContent || '').match(/\d+/) || [])[0]);
    return {
      lives: Number.isFinite(lives) ? lives : null,
      stage: Number.isFinite(stage) ? stage : null
    };
  }

  setInterval(() => {
    if (!state.started) return;
    const { lives, stage } = readHud();
    if (state.lastLives == null && lives != null) state.lastLives = lives;
    if (state.lastStage == null && stage != null) state.lastStage = stage;

    if (stage != null && state.lastStage != null && stage > state.lastStage && state.mode === 2) switchPlayer(180);

    if (state.mode === 2 && lives != null && state.lastLives != null && lives < state.lastLives) {
      state.playerLives[state.activePlayer] = Math.max(0, lives);
      renderHudTag();
      persist();
      const other = state.activePlayer === 1 ? 2 : 1;
      if (state.playerLives[other] > 0) switchPlayer(720);
    }

    if (lives != null) state.lastLives = lives;
    if (stage != null) state.lastStage = stage;
  }, 120);

  function startGame(mode) {
    if (state.starting) return;
    state.starting = true;
    state.mode = mode;
    window.__ivoGameMode = mode;

    state.playerLives = { 1: 3, 2: 3 };
    window.__ivoContinueLevel = 0;
    window.__ivoRockStats?.reset();

    window.__ivoStartingLives = state.playerLives[1];
    setActivePlayer(1, false);
    startMenuMusic();
    choices.forEach(btn => btn.classList.toggle('selected', Number(btn.dataset.mode) === mode));
    menu.classList.add('starting');
    persist();

    setTimeout(() => {
      const playButton = [...document.querySelectorAll('.play-btn')].find(btn => /arrancar la gira/i.test(btn.textContent || ''));
      menu.remove();
      playButton?.click();
      setTimeout(() => {
        state.started = true;
        const hud = readHud();
        state.lastLives = hud.lives;
        state.lastStage = hud.stage;
        renderHudTag();
        if (mode === 2) announcePlayer(1);
      }, 90);
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

  let keyboardIndex = 0;
  window.addEventListener('keydown', e => {
    if (!document.body.contains(menu) || state.starting) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      keyboardIndex = (keyboardIndex + (e.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
      choices.forEach((btn, i) => btn.classList.toggle('selected', i === keyboardIndex));
      startMenuMusic();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choices[keyboardIndex]?.click();
    }
  });
  if (new URLSearchParams(location.search).has('smoke')) {
    setTimeout(() => {
      try {
        [...document.querySelectorAll('.ivo-menu-choice')].find(b => b.dataset.mode === '1')?.click();
        setTimeout(() => {
          try {
            window.__ivoDebugLoadLevel?.(1);
            setTimeout(() => {
              const st = window.__ivoDebugState?.();
              const p = st?.player || {};
              const ok = st?.stage === 2 && !st?.dead && [p.x,p.y,p.w,p.h].every(Number.isFinite) && p.w > 0 && p.h > 0;
              document.documentElement.dataset.ivoSmoke = ok ? 'ok' : 'fail';
            }, 900);
          } catch { document.documentElement.dataset.ivoSmoke = 'fail'; }
        }, 900);
      } catch { document.documentElement.dataset.ivoSmoke = 'fail'; }
    }, 120);
  }

})();
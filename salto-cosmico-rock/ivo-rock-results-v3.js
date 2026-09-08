(() => {
  if (window.__ivoRockResultsV3) return;
  window.__ivoRockResultsV3 = true;

  const layer = document.createElement('div');
  layer.className = 'ivo-results-v3-layer';
  layer.innerHTML = `
    <section class="ivo-route-card" aria-hidden="true">
      <div class="ivo-route-crest">🤘</div>
      <h2>RUTA COMPLETADA</h2>
      <p>PRÓXIMA PARADA</p>
      <h3 class="ivo-route-next">RUTA SIGUIENTE</h3>
      <div class="ivo-route-lines">
        <div><span>↑</span><b>BONUS ALTURA</b><strong class="ivo-v3-height">0</strong></div>
        <div><span>◷</span><b>BONUS TIEMPO</b><strong class="ivo-v3-time">0</strong></div>
        <div class="total"><span>◆</span><b>TOTAL</b><strong class="ivo-v3-total">0</strong></div>
      </div>
      <button type="button" class="ivo-route-follow">⚡ SEGUIR ⚡</button>
    </section>

    <section class="ivo-victory-screen" aria-hidden="true">
      <div class="ivo-victory-fireworks"><i></i><i></i><i></i><i></i></div>
      <div class="ivo-victory-crowd">${'<i></i>'.repeat(24)}</div>
      <div class="ivo-victory-logo">IVO<br>ROCK</div>
      <div class="ivo-victory-guitar" aria-hidden="true"></div>
      <div class="ivo-victory-copy">
        <h2>¡GANASTE!</h2>
        <p>GIRA COMPLETA</p>
        <div class="ivo-victory-stats">
          <div><span>◆</span><b>PUNTAJE FINAL</b><strong class="ivo-v3-final-score">000000</strong></div>
          <div><span>◆</span><b>PÚAS RECOGIDAS</b><strong class="ivo-v3-final-picks">0</strong></div>
        </div>
        <div class="ivo-victory-actions">
          <button type="button" class="ivo-v3-menu">⌂ VOLVER AL MENÚ</button>
          <button type="button" class="ivo-v3-replay">▶ JUGAR DE NUEVO</button>
        </div>
      </div>
      <div class="ivo-victory-slogan">EL ROCK NUNCA TERMINA</div>
    </section>`;
  document.body.appendChild(layer);

  const routeCard = layer.querySelector('.ivo-route-card');
  const victory = layer.querySelector('.ivo-victory-screen');
  const routeNext = layer.querySelector('.ivo-route-next');
  const routeHeight = layer.querySelector('.ivo-v3-height');
  const routeTime = layer.querySelector('.ivo-v3-time');
  const routeTotal = layer.querySelector('.ivo-v3-total');
  const finalScore = layer.querySelector('.ivo-v3-final-score');
  const finalPicks = layer.querySelector('.ivo-v3-final-picks');

  const readScore = fallback => {
    const value = Number((document.querySelector('.hud-score b')?.textContent || '').replace(/\D/g, ''));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const readPicks = () => {
    const pickHud = document.querySelector('.hud-group .hud-item:not(.hud-score) b');
    const value = Number((pickHud?.textContent || '').replace(/\D/g, ''));
    return Number.isFinite(value) ? value : 0;
  };

  const hideRoute = () => {
    routeCard.classList.remove('show');
    routeCard.setAttribute('aria-hidden', 'true');
  };

  const showRoute = (time, height, nextName) => {
    victory.classList.remove('show');
    victory.setAttribute('aria-hidden', 'true');
    routeHeight.textContent = String(height);
    routeTime.textContent = String(time);
    routeTotal.textContent = String(height + time);
    routeNext.textContent = nextName ? String(nextName).toUpperCase() : 'SIGUIENTE RUTA';
    routeCard.setAttribute('aria-hidden', 'false');
    routeCard.classList.remove('show');
    requestAnimationFrame(() => routeCard.classList.add('show'));
    clearTimeout(showRoute.timer);
    showRoute.timer = setTimeout(hideRoute, 3150);
  };

  const showVictory = (time, height) => {
    hideRoute();
    finalScore.textContent = readScore(time + height).toString().padStart(6, '0');
    finalPicks.textContent = String(readPicks());
    victory.setAttribute('aria-hidden', 'false');
    victory.classList.remove('show');
    requestAnimationFrame(() => victory.classList.add('show'));
  };

  layer.querySelector('.ivo-route-follow')?.addEventListener('click', hideRoute);
  layer.querySelector('.ivo-v3-menu')?.addEventListener('click', () => {
    try { sessionStorage.removeItem('ivo-rock-v3-autoplay'); } catch {}
    location.reload();
  });
  layer.querySelector('.ivo-v3-replay')?.addEventListener('click', () => {
    try { sessionStorage.setItem('ivo-rock-v3-autoplay', String(window.__ivoGameMode || 1)); } catch {}
    location.reload();
  });

  const original = window.__ivoRockPolish?.goal?.bind(window.__ivoRockPolish);
  if (original) {
    window.__ivoRockPolish.goal = (final = false, timeBonus = 0, heightBonus = 0, nextName = '') => {
      original(final, timeBonus, heightBonus, nextName);
      const time = Math.max(0, Math.round(timeBonus));
      const height = Math.max(0, Math.round(heightBonus));
      if (final) showVictory(time, height);
      else showRoute(time, height, nextName);
    };
  }

  // Optional quick replay: keep the current player mode and start automatically.
  let autoplay = null;
  try { autoplay = Number(sessionStorage.getItem('ivo-rock-v3-autoplay')); } catch {}
  if (autoplay === 1 || autoplay === 2) {
    try { sessionStorage.removeItem('ivo-rock-v3-autoplay'); } catch {}
    const clickWhenReady = () => {
      const button = document.querySelector(`.ivo-menu-choice[data-mode="${autoplay}"]`);
      if (button) button.click();
      else setTimeout(clickWhenReady, 80);
    };
    setTimeout(clickWhenReady, 120);
  }
})();

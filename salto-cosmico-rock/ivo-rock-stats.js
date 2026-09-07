(() => {
  if (window.__ivoRockStats) return;

  const KEY = 'ivo-rock-campaign-stats-v2';
  const fresh = () => ({
    shards: 0,
    enemies: 0,
    secrets: [],
    bestHeight: 0,
    routes: 0,
    totalTime: 0,
    routeStarted: performance.now(),
    currentRoute: 1
  });

  const load = () => {
    try {
      const loaded = { ...fresh(), ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) };
      loaded.routeStarted = performance.now();
      return loaded;
    } catch {
      return fresh();
    }
  };

  let stats = load();
  let lastHudRoute = null;

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch {}
  };

  function renderFinal() {
    const panels = [...document.querySelectorAll('.overlay .panel')];
    const panel = panels.find(p => /lo\s*lograste/i.test(p.textContent || '') || /gira completa/i.test(p.textContent || ''));
    if (!panel || panel.querySelector('.ivo-final-stats')) return;

    const box = document.createElement('div');
    box.className = 'ivo-final-stats';
    box.innerHTML = `
      <strong>RESUMEN DE LA GIRA</strong>
      <div><span>PÚAS</span><b>${stats.shards}</b></div>
      <div><span>ENEMIGOS</span><b>${stats.enemies}</b></div>
      <div><span>PÚAS DORADAS</span><b>${stats.secrets.length}/4</b></div>
      <div><span>MEJOR ALTURA</span><b>+${stats.bestHeight}</b></div>
      <div><span>TIEMPO DE GIRA</span><b>${Math.max(1, Math.round(stats.totalTime))} s</b></div>`;

    const play = panel.querySelector('.play-btn');
    if (play) panel.insertBefore(box, play);
    else panel.appendChild(box);
  }

  window.__ivoRockStats = {
    reset() {
      stats = fresh();
      lastHudRoute = null;
      save();
    },
    shard() {
      stats.shards += 1;
      save();
    },
    enemy() {
      stats.enemies += 1;
      save();
    },
    secret(level) {
      const id = Number(level) || 0;
      if (!stats.secrets.includes(id)) stats.secrets.push(id);
      save();
    },
    route(level) {
      const now = performance.now();
      const id = Number(level) || 1;
      stats.currentRoute = id;
      stats.routeStarted = now;
      save();
    },
    goal(heightBonus = 0, timeBonus = 0, final = false) {
      stats.bestHeight = Math.max(stats.bestHeight, Number(heightBonus) || 0);
      stats.routes = Math.min(4, stats.routes + 1);
      const now = performance.now();
      if (stats.routeStarted) stats.totalTime += Math.max(0, (now - stats.routeStarted) / 1000);
      stats.routeStarted = 0;
      save();
      if (final) setTimeout(renderFinal, 3800);
    }
  };

  setInterval(() => {
    const routeText = document.querySelector('.hud-stage b')?.textContent || '';
    const route = Number((routeText.match(/\d+/) || [])[0]);
    if (Number.isFinite(route) && route > 0 && route !== lastHudRoute) {
      lastHudRoute = route;
      window.__ivoRockStats.route(route);
    }
    renderFinal();
  }, 300);
})();
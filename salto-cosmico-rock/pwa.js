(() => {
  document.documentElement.dataset.ivoPwa = 'ready';
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const register = () => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(err => console.warn('Ivo Rock SW:', err));
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
  if (standalone) document.documentElement.dataset.ivoInstalled = '1';

  let deferred = null;
  let button = null;
  const style = document.createElement('style');
  style.textContent = `.ivo-install-app{margin-top:12px;width:min(320px,80vw);min-height:46px;border:2px solid #ff8b31;border-radius:8px;background:linear-gradient(#4d130d,#1c0909);color:#ffe07b;font:1000 13px/1 ui-monospace,monospace;letter-spacing:.08em;box-shadow:0 0 20px rgba(255,79,29,.22),inset 0 0 0 2px rgba(255,210,83,.08);cursor:pointer}.ivo-install-app:active{transform:scale(.98)}html[data-ivo-installed="1"] .ivo-install-app{display:none!important}`;
  document.head.appendChild(style);

  const mountButton = () => {
    if (!deferred || standalone || button) return;
    const stage = document.querySelector('.ivo-menu-stage');
    if (!stage) { setTimeout(mountButton, 120); return; }
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'ivo-install-app';
    button.textContent = '⬇  INSTALAR IVO ROCK';
    button.addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      try { await deferred.userChoice; } catch {}
      deferred = null;
      button?.remove();
      button = null;
    });
    stage.appendChild(button);
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferred = event;
    mountButton();
  });
  window.addEventListener('appinstalled', () => {
    document.documentElement.dataset.ivoInstalled = '1';
    deferred = null;
    button?.remove();
    button = null;
  });
})();
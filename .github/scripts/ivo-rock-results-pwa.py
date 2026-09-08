from pathlib import Path
import json

ROOT = Path('salto-cosmico-rock')
GAME = ROOT / 'assets/cosmic-jump-DkePWGqE.js'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 marker, got {count}')
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# 1. Gameplay cleanup: remove the unnecessary Route 4 speaker and make sure
#    yellow picks cannot stay embedded in unbreakable solid blocks/amplifiers.
# -----------------------------------------------------------------------------
s = GAME.read_text()
amp_marker = ',{x:5410,kind:`amp`,dir:-1}'
if s.count(amp_marker) != 1:
    raise SystemExit(f'Route 4 amp marker: expected 1, got {s.count(amp_marker)}')
s = s.replace(amp_marker, '', 1)

old_decl = 'Fe=(e,t=0)=>{let n=De(e+ee/2);Object.assign(J,{x:e,y:n-y,previousY:n-y,w:ee,h:y,vx:0,vy:0,grounded:!0,facing:1,invulnerable:t,invincible:0,coyote:d.coyoteTime,jumpBuffer:0,jumpHold:0,dead:!1,crouching:!1,skidding:!1,standingPlatform:-1,shotPose:0}),P=`small`,g(`small`)},Ie=(e,t,n=1.65)=>{'
new_decl = 'Fe=(e,t=0)=>{let n=De(e+ee/2);Object.assign(J,{x:e,y:n-y,previousY:n-y,w:ee,h:y,vx:0,vy:0,grounded:!0,facing:1,invulnerable:t,invincible:0,coyote:d.coyoteTime,jumpBuffer:0,jumpHold:0,dead:!1,crouching:!1,skidding:!1,standingPlatform:-1,shotPose:0}),P=`small`,g(`small`)},ivoLiftBlockedShards=()=>{E.shards=E.shards.map(([e,t])=>{let n=F.find(n=>n.active&&n.kind===`solid`&&x({x:e-12,y:t-16,w:24,h:32},n));return n?[e,n.y-26]:[e,t]})},Ie=(e,t,n=1.65)=>{'
s = replace_once(s, old_decl, new_decl, 'collectible accessibility helper')

old_load = 'F=Oe(),I=ke(),ivoSolidAll=null,ivoSolidNoPlatforms=null,L=je()'
new_load = 'F=Oe(),I=ke(),ivoLiftBlockedShards(),ivoSolidAll=null,ivoSolidNoPlatforms=null,L=je()'
if s.count(old_load) < 1:
    raise SystemExit('level load marker missing')
s = s.replace(old_load, new_load, 1)
GAME.write_text(s)


# -----------------------------------------------------------------------------
# 2. Rocker route-complete screen, based on the approved visual mockup.
# -----------------------------------------------------------------------------
polish = ROOT / 'ivo-rock-polish.js'
p = polish.read_text()
old_markup = '''    <div class="ivo-polish-celebration">
      <small>IVO ROCK</small>
      <strong>RUTA COMPLETA</strong>
      <b class="ivo-polish-height">ALTURA +0000</b>
      <em class="ivo-polish-total">TIEMPO +0000 · TOTAL +0000</em>
      <span class="ivo-polish-next"></span>
    </div>'''
new_markup = '''    <div class="ivo-polish-celebration" aria-hidden="true">
      <div class="ivo-results-topline"><span>⚡ IVO ROCK ⚡</span><i>ROCK BONUS</i></div>
      <div class="ivo-results-title"><small>EL ESCENARIO ES TUYO</small><strong>RUTA COMPLETADA</strong></div>
      <div class="ivo-results-body">
        <div class="ivo-results-mark" aria-hidden="true"></div>
        <div class="ivo-results-stats">
          <div class="ivo-result-row"><span>↑</span><b>BONUS DE ALTURA</b><em class="ivo-polish-height">00000</em></div>
          <div class="ivo-result-row"><span>◷</span><b>BONUS DE TIEMPO</b><em class="ivo-polish-time">00000</em></div>
          <div class="ivo-result-row total"><span>★</span><b>PUNTAJE TOTAL</b><em class="ivo-polish-total">000000</em></div>
        </div>
      </div>
      <span class="ivo-polish-next"></span>
    </div>'''
p = replace_once(p, old_markup, new_markup, 'old results markup')

old_vars = "  const celebrationHeight = celebration.querySelector('.ivo-polish-height');\n  const celebrationTotal = celebration.querySelector('.ivo-polish-total');\n  const celebrationNext = celebration.querySelector('.ivo-polish-next');"
new_vars = "  const celebrationHeight = celebration.querySelector('.ivo-polish-height');\n  const celebrationTime = celebration.querySelector('.ivo-polish-time');\n  const celebrationTotal = celebration.querySelector('.ivo-polish-total');\n  const celebrationNext = celebration.querySelector('.ivo-polish-next');"
p = replace_once(p, old_vars, new_vars, 'results selectors')

old_goal = "      celebrationTitle.textContent = final ? '¡GIRA COMPLETA!' : '¡RUTA COMPLETA!';\n      celebrationHeight.textContent = `ALTURA +${height.toString().padStart(4, '0')}`;\n      celebrationTotal.textContent = `TIEMPO +${time.toString().padStart(4, '0')} · TOTAL +${total.toString().padStart(4, '0')}`;\n      celebrationNext.textContent = final ? 'FIN DE LA GIRA' : (nextName ? `PRÓXIMA PARADA · ${String(nextName).toUpperCase()}` : '');"
new_goal = "      celebration.classList.toggle('final', final);\n      celebrationTitle.textContent = final ? 'GIRA COMPLETA' : 'RUTA COMPLETADA';\n      celebrationHeight.textContent = height.toString().padStart(5, '0');\n      celebrationTime.textContent = time.toString().padStart(5, '0');\n      const hudScore = () => Number((document.querySelector('.hud-score b')?.textContent || '').replace(/\\D/g, '')) || total;\n      celebrationTotal.textContent = hudScore().toString().padStart(6, '0');\n      requestAnimationFrame(() => { celebrationTotal.textContent = hudScore().toString().padStart(6, '0'); });\n      celebrationNext.textContent = final ? '★ FIN DE LA GIRA ★' : (nextName ? `SIGUIENTE RUTA  ›  ${String(nextName).toUpperCase()}` : 'SIGUIENTE RUTA');"
p = replace_once(p, old_goal, new_goal, 'goal result values')

p = p.replace("setTimeout(() => celebration.classList.remove('show'), final ? 3400 : 2850);", "setTimeout(() => celebration.classList.remove('show'), final ? 3600 : 3300);", 1)
polish.write_text(p)

css = ROOT / 'ivo-rock-polish.css'
c = css.read_text()
marker = '/* IVO ROCK RESULTS SCREEN V2 */'
if marker not in c:
    c += r'''

/* IVO ROCK RESULTS SCREEN V2 */
.ivo-polish-celebration{
  top:50%;
  width:min(780px,calc(100vw - 30px));
  min-width:0;
  padding:14px 18px 16px;
  border:3px solid #8b5a26;
  border-radius:18px;
  color:#fff7dc;
  background:radial-gradient(circle at 50% -20%,rgba(255,94,21,.28),transparent 42%),linear-gradient(180deg,rgba(27,12,13,.98),rgba(7,7,9,.98));
  box-shadow:0 0 0 100vmax rgba(0,0,0,.58),0 18px 70px rgba(0,0,0,.72),0 0 42px rgba(255,66,23,.38),inset 0 0 0 2px rgba(255,210,89,.14);
  overflow:hidden;
  clip-path:polygon(2% 0,98% 0,100% 8%,100% 92%,98% 100%,2% 100%,0 92%,0 8%);
}
.ivo-polish-celebration::before,.ivo-polish-celebration::after{content:'';position:absolute;top:-14px;width:28%;height:52px;opacity:.72;filter:blur(.2px);background:linear-gradient(105deg,transparent 0 8%,#ff4720 10% 18%,#ffb52e 22% 30%,transparent 34% 43%,#ff6a20 46% 55%,transparent 60%);pointer-events:none}
.ivo-polish-celebration::before{left:0;transform:skewX(-17deg)}
.ivo-polish-celebration::after{right:0;transform:scaleX(-1) skewX(-17deg)}
.ivo-results-topline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:2px;padding:0 8px;color:#ffb34a;font:1000 10px/1 ui-monospace,monospace;letter-spacing:.16em}
.ivo-results-topline i{font-style:normal;padding:5px 9px;border:1px solid rgba(255,113,37,.7);border-radius:999px;background:#2b0909;color:#ff5f36;box-shadow:0 0 16px rgba(255,75,27,.2)}
.ivo-results-title{position:relative;text-align:center;padding:1px 10px 10px;border-bottom:1px solid rgba(255,203,80,.28)}
.ivo-results-title small{display:block;margin:0 0 3px;color:#d6d4cf;font-size:11px;letter-spacing:.22em}
.ivo-results-title strong{display:block;font-family:Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif;font-style:italic;font-size:clamp(34px,5.4vw,64px);line-height:.92;letter-spacing:.035em;color:#ffbd3f;text-shadow:0 3px 0 #802014,0 0 26px rgba(255,86,26,.48);transform:skewX(-4deg)}
.ivo-results-body{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:stretch;margin-top:12px}
.ivo-results-mark{min-height:176px;border:2px solid rgba(255,124,43,.56);border-radius:14px;background:linear-gradient(rgba(18,7,8,.22),rgba(18,7,8,.72)),url('./icons/ivo-rock-192.png') center/88% auto no-repeat;box-shadow:inset 0 0 30px rgba(255,71,20,.19),0 0 18px rgba(255,82,25,.14)}
.ivo-results-stats{display:grid;gap:8px}
.ivo-result-row{display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:10px;min-height:49px;padding:4px 13px;border:1px solid #5b4d45;border-left:4px solid #ff8b29;border-radius:8px;background:linear-gradient(90deg,#171719,#0c0c0e);box-shadow:inset 0 1px rgba(255,255,255,.06),0 5px 12px rgba(0,0,0,.25)}
.ivo-result-row>span{display:grid;place-items:center;width:32px;height:32px;color:#ffc33f;font-size:25px;font-weight:1000;text-shadow:0 0 14px rgba(255,146,35,.65)}
.ivo-result-row>b{font-size:12px;letter-spacing:.07em;color:#d7d5d0;text-align:left}
.ivo-result-row>em{font-style:normal;font-size:24px;font-weight:1000;letter-spacing:.05em;color:#ffc947;text-shadow:0 0 13px rgba(255,122,28,.28)}
.ivo-result-row.total{border-left-color:#ffdb53;background:linear-gradient(90deg,#211915,#0e0d0e)}
.ivo-result-row.total>em{font-size:28px;color:#ffe06a}
.ivo-polish-celebration .ivo-polish-next{margin:12px 0 0;padding:11px 14px 9px;border:2px solid #e54124;border-radius:9px;background:linear-gradient(#7c1715,#3a0d0d);color:#fff0c6;font:1000 14px/1.15 ui-monospace,monospace;letter-spacing:.06em;text-shadow:0 2px 0 #200;box-shadow:0 0 18px rgba(255,62,25,.28),inset 0 0 0 2px rgba(255,180,63,.12)}
.ivo-polish-celebration.final .ivo-results-title strong{color:#fff06f;text-shadow:0 3px 0 #9d2819,0 0 34px rgba(255,98,26,.62)}
@media (max-height:560px){.ivo-polish-celebration{top:49%;width:min(650px,calc(100vw - 20px));padding:8px 12px 10px}.ivo-results-title small{font-size:8px}.ivo-results-title strong{font-size:clamp(28px,5vw,44px)}.ivo-results-body{grid-template-columns:100px 1fr;gap:8px;margin-top:7px}.ivo-results-mark{min-height:132px}.ivo-results-stats{gap:5px}.ivo-result-row{min-height:38px;grid-template-columns:28px 1fr auto;padding:2px 8px;gap:6px}.ivo-result-row>span{width:25px;height:25px;font-size:20px}.ivo-result-row>b{font-size:9px}.ivo-result-row>em{font-size:19px}.ivo-result-row.total>em{font-size:21px}.ivo-polish-celebration .ivo-polish-next{margin-top:7px;padding:8px 10px;font-size:10px}}
'''
css.write_text(c)


# -----------------------------------------------------------------------------
# 3. PWA: installable, standalone and offline after first load.
# -----------------------------------------------------------------------------
icons = ROOT / 'icons'
icons.mkdir(exist_ok=True)

# Icon generation uses Pillow (installed by the workflow). Flaming angular guitar.
from PIL import Image, ImageDraw, ImageFilter
import math


def make_icon(size):
    im = Image.new('RGBA', (size, size), (8, 5, 8, 255))
    glow = Image.new('RGBA', im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx = cy = size // 2
    for radius in range(int(size * .48), 0, -1):
        alpha = int(110 * (1 - radius / (size * .48)) ** 1.5)
        gd.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), fill=(120, 10, 8, alpha))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(size * .035)))
    d = ImageDraw.Draw(im)
    margin = int(size * .05)
    d.rounded_rectangle((margin, margin, size-margin, size-margin), radius=int(size*.18), outline=(255,93,27,230), width=max(3,size//80))

    flame = Image.new('RGBA', im.size, (0,0,0,0))
    fd = ImageDraw.Draw(flame)
    base_y = int(size * .79)
    for center, height, width in zip([.33,.42,.50,.58,.67],[.38,.50,.60,.48,.36],[.17,.16,.18,.15,.17]):
        x = int(size*center); hh = int(size*height); ww = int(size*width)
        fd.polygon([(x,base_y),(x-ww//2,int(base_y-hh*.35)),(x-int(ww*.2),int(base_y-hh*.52)),(x-int(ww*.33),int(base_y-hh*.70)),(x,base_y-hh),(x+int(ww*.28),int(base_y-hh*.65)),(x+int(ww*.18),int(base_y-hh*.48)),(x+ww//2,int(base_y-hh*.30))], fill=(255,65,12,225))
        fd.polygon([(x,base_y-int(hh*.05)),(x-int(ww*.22),int(base_y-hh*.32)),(x,int(base_y-hh*.68)),(x+int(ww*.22),int(base_y-hh*.30))], fill=(255,196,47,235))
    im = Image.alpha_composite(im, flame.filter(ImageFilter.GaussianBlur(size*.008)))
    d = ImageDraw.Draw(im)

    body = [(.48,.48),(.35,.58),(.26,.72),(.43,.67),(.50,.78),(.58,.66),(.75,.72),(.65,.57),(.54,.48)]
    d.polygon([(int(x*size),int(y*size)) for x,y in body], fill=(30,24,27,255), outline=(255,190,58,255))
    inner = [(.49,.51),(.39,.59),(.33,.68),(.45,.64),(.50,.73),(.57,.63),(.69,.68),(.61,.58),(.53,.51)]
    d.polygon([(int(x*size),int(y*size)) for x,y in inner], fill=(150,24,20,255))
    neck_w = int(size*.07); x0 = int(size*.50)
    d.rounded_rectangle((x0-neck_w//2,int(size*.19),x0+neck_w//2,int(size*.54)), radius=max(2,size//80), fill=(224,167,62,255), outline=(62,38,18,255), width=max(2,size//120))
    for y in [.24,.29,.34,.39,.44,.49]:
        yy = int(size*y)
        d.line((x0-neck_w//2,yy,x0+neck_w//2,yy), fill=(76,48,24,255), width=max(1,size//180))
    d.polygon([(int(x*size),int(y*size)) for x,y in [(.46,.19),(.47,.09),(.54,.07),(.56,.18)]], fill=(25,22,25,255), outline=(255,190,58,255))
    for dx in [-.012,-.004,.004,.012]:
        xx = int(size*(.5+dx))
        d.line((xx,int(size*.11),xx,int(size*.70)), fill=(255,240,174,235), width=max(1,size//256))
    for y in [.56,.61]:
        d.rounded_rectangle((int(size*.45),int(size*y),int(size*.56),int(size*(y+.035))), radius=max(2,size//120), fill=(255,196,54,255))
    d.polygon([(int(x*size),int(y*size)) for x,y in [(.52,.56),(.48,.62),(.51,.62),(.47,.69),(.55,.60),(.52,.60)]], fill=(255,230,92,255))
    for i in range(18):
        angle = (i*2.4) % (2*math.pi)
        radius = size*(.29+.07*((i%3)/2))
        x = cx + math.cos(angle)*radius; y = cy + math.sin(angle)*radius
        r = max(1,int(size*(.005+(i%3)*.002)))
        d.ellipse((x-r,y-r,x+r,y+r), fill=(255,150 if i%2 else 225,40,200))
    return im


for size in (180,192,512):
    make_icon(size).save(icons / f'ivo-rock-{size}.png', optimize=True)

manifest = {
    'name': 'Ivo Rock',
    'short_name': 'Ivo Rock',
    'description': 'Plataformas, guitarras y una gira de puro rock.',
    'id': './',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'display_override': ['standalone','minimal-ui'],
    'orientation': 'landscape',
    'background_color': '#080508',
    'theme_color': '#180709',
    'categories': ['games','entertainment'],
    'icons': [
        {'src':'./icons/ivo-rock-192.png','sizes':'192x192','type':'image/png','purpose':'any'},
        {'src':'./icons/ivo-rock-512.png','sizes':'512x512','type':'image/png','purpose':'any maskable'}
    ]
}
(ROOT / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))

(ROOT / 'pwa.js').write_text(r'''(() => {
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
})();''')

(ROOT / 'service-worker.js').write_text(r'''const CACHE = 'ivo-rock-pwa-v1';
const CORE = [
  './','./index.html','./manifest.webmanifest','./mount.js','./pwa.js',
  './rock-tour-controls.js','./rock-tour-updates.css','./rock-tour-lose-sfx.js',
  './ivo-rock-start-menu.js','./ivo-rock-start-menu.css','./ivo-rock-polish.js','./ivo-rock-polish.css','./ivo-rock-stats.js','./ivo-rock-stats.css','./ivo-rock-fireworks.css',
  './assets/rolldown-runtime-S-ySWqyJ.js','./assets/framework-CXnKph_e.js','./assets/index-BKMDMKjr.css','./assets/cosmic-jump-DkePWGqE.js',
  './assets/rock-concert.webp','./assets/metal-wasteland.webp','./assets/metal-forge.webp','./assets/prism-cavern.png','./assets/metal-storm.webp','./assets/dawn-isles.png',
  './assets/lumi-atlas.webp','./assets/lumi-atlas.png','./assets/rock-hero.webp','./assets/rock-props.webp',
  './assets/ivo-roadie.png','./assets/ivo-speaker.png','./assets/ivo-turtle.png','./assets/ivo-crow.png',
  './audio/track1.mp3','./audio/track2.mp3','./audio/track3.mp3','./audio/track4.mp3','./audio/track5.mp3',
  './icons/ivo-rock-180.png','./icons/ivo-rock-192.png','./icons/ivo-rock-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map(url => cache.add(url).catch(() => null)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('ivo-rock-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
const cleanKey = request => {
  const url = new URL(request.url);
  return new Request(url.origin + url.pathname, { method: 'GET', credentials: 'same-origin' });
};
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(new Request(new URL('./index.html', self.location).href), response.clone());
        return response;
      } catch {
        return (await cache.match(new Request(new URL('./index.html', self.location).href))) || (await cache.match(new Request(new URL('./', self.location).href)));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = cleanKey(request);
    const cached = await cache.match(key);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(key, response.clone());
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});''')


# -----------------------------------------------------------------------------
# 4. Wire manifest, service worker and cache-busting.
# -----------------------------------------------------------------------------
mount = ROOT / 'mount.js'
m = mount.read_text()
m = replace_once(m, "import RockTour from './assets/cosmic-jump-DkePWGqE.js?v=natural-run-2';", "import RockTour from './assets/cosmic-jump-DkePWGqE.js?v=results-pwa-1';", 'game cache bust')
m = replace_once(m, "await import('./ivo-rock-polish.js?v=performance-1');", "await import('./ivo-rock-polish.js?v=results-pwa-1');", 'polish cache bust')
if "await import('./pwa.js?v=results-pwa-1');" not in m:
    m += "\nawait import('./pwa.js?v=results-pwa-1');\n"
mount.write_text(m)

index = ROOT / 'index.html'
i = index.read_text()
if '<link rel="manifest" href="./manifest.webmanifest">' not in i:
    i = replace_once(i, '  <meta name="theme-color" content="#050506">', '  <meta name="theme-color" content="#180709">\n  <meta name="mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n  <link rel="manifest" href="./manifest.webmanifest">\n  <link rel="apple-touch-icon" href="./icons/ivo-rock-180.png">', 'PWA head')
i = replace_once(i, './ivo-rock-polish.css?v=performance-1', './ivo-rock-polish.css?v=results-pwa-1', 'results CSS cache bust')
i = replace_once(i, './mount.js?v=natural-run-2', './mount.js?v=results-pwa-1', 'mount cache bust')
index.write_text(i)

print('Ivo Rock results/PWA patch complete')

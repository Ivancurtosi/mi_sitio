import { i as reactFactory, t as reactDomFactory } from './assets/framework-CXnKph_e.js';
import RockTour from './assets/cosmic-jump-DkePWGqE.js?v=final-arena-visual-1';

const tracks = Object.fromEntries([1,2,3,4,5].map(n => [n, new URL(`./audio/track${n}.mp3`, window.location.href).href]));
const BASE_VOLUME = 0.48;
const CROSSFADE_MS = 900;

// Musical progression: melodic -> dark -> fast -> heavy -> most aggressive boss track.
// The five songs are kept at their original speed and duration.
const THEME_TRACKS = {
  grove: 4,    // Ruta 1 · heavy melódico / épico
  cavern: 3,   // Ruta 2 · nu metal oscuro
  sky: 1,      // Ruta 3 · thrash rápido
  citadel: 2,  // Ruta 4 · groove pesado
  boss: 5      // Guardián final · metal moderno agresivo
};

const decks = [new Audio(), new Audio()];
decks.forEach(deck => {
  deck.preload = 'auto';
  deck.volume = BASE_VOLUME;
  deck.playbackRate = 1;
  deck.loop = true;
  deck.preservesPitch = true;
  deck.mozPreservesPitch = true;
  deck.webkitPreservesPitch = true;
});

let activeDeck = 0;
let theme = 'grove';
let muted = false;
let playing = false;
let transitioning = false;
let fadeToken = 0;

const safePlay = deck => deck.play().catch(() => {});

const setTrack = (deck, trackNumber, reset = true) => {
  const src = tracks[trackNumber];
  if (deck.dataset.track !== String(trackNumber)) {
    deck.src = src;
    deck.dataset.track = String(trackNumber);
    if (reset) deck.currentTime = 0;
  } else if (reset) {
    deck.currentTime = 0;
  }
  deck.playbackRate = 1;
  deck.loop = true;
};

function crossfadeTo(trackNumber) {
  const fromIndex = activeDeck;
  const toIndex = 1 - activeDeck;
  const from = decks[fromIndex];
  const to = decks[toIndex];
  const token = ++fadeToken;
  transitioning = true;

  setTrack(to, trackNumber, true);
  to.volume = 0;
  to.muted = muted;
  from.muted = muted;
  if (!muted) safePlay(to);

  const started = performance.now();
  const step = now => {
    if (token !== fadeToken) return;
    const p = Math.min(1, (now - started) / CROSSFADE_MS);
    from.volume = BASE_VOLUME * (1 - p);
    to.volume = BASE_VOLUME * p;
    if (p < 1) {
      requestAnimationFrame(step);
      return;
    }
    from.pause();
    from.volume = BASE_VOLUME;
    to.volume = BASE_VOLUME;
    activeDeck = toIndex;
    transitioning = false;
  };
  requestAnimationFrame(step);
}

function normalizeTheme(nextTheme) {
  // Power-ups previously requested a temporary "rush" theme. Keep the song of
  // the current level instead, so every route has a clear musical identity.
  if (nextTheme === 'rush') return theme;
  // Once the final boss song starts, don't let a power-up ending switch it back.
  if (theme === 'boss' && nextTheme === 'citadel') return 'boss';
  return THEME_TRACKS[nextTheme] ? nextTheme : theme;
}

window.__rockPlaylist = {
  play(nextTheme) {
    const wasPlaying = playing;
    const next = normalizeTheme(nextTheme || theme || 'grove');

    // The boss cue is requested every frame while the warning is on screen.
    // Ignore duplicate requests until the current crossfade finishes.
    if (transitioning && next === theme) {
      playing = true;
      return;
    }

    const trackNumber = THEME_TRACKS[next] || THEME_TRACKS.grove;
    const current = decks[activeDeck];
    const sameTrack = current.dataset.track === String(trackNumber);
    const changed = next !== theme || !sameTrack;

    theme = next;
    playing = true;

    if (changed) {
      if (wasPlaying && current.dataset.track && !current.paused && !muted) {
        crossfadeTo(trackNumber);
      } else {
        ++fadeToken;
        transitioning = false;
        decks.forEach((deck, index) => {
          if (index !== activeDeck) deck.pause();
          deck.volume = BASE_VOLUME;
        });
        setTrack(current, trackNumber, true);
        current.muted = muted;
        if (!muted) safePlay(current);
      }
      return;
    }

    current.muted = muted;
    current.volume = BASE_VOLUME;
    current.playbackRate = 1;
    if (!muted && !transitioning) safePlay(current);
  },
  pause() {
    playing = false;
    ++fadeToken;
    transitioning = false;
    decks.forEach(deck => {
      deck.pause();
      deck.volume = BASE_VOLUME;
    });
  },
  setMuted(value) {
    muted = !!value;
    decks.forEach(deck => { deck.muted = muted; });
    if (muted) {
      decks.forEach(deck => deck.pause());
    } else if (playing && !transitioning) {
      safePlay(decks[activeDeck]);
    }
  }
};

const React = reactFactory();
const ReactDOM = reactDomFactory();
ReactDOM.hydrateRoot(document.getElementById('root'), React.createElement(RockTour), {
  onRecoverableError(error) { console.warn('Rock Tour hydration:', error); }
});
document.documentElement.dataset.rockHydrated = '1';
await import('./rock-tour-lose-sfx.js?v=lose-sfx-1');
await import('./rock-tour-controls.js?v=rock-polish-2');

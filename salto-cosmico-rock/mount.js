import { i as reactFactory, t as reactDomFactory } from './assets/framework-CXnKph_e.js';
import RockTour from './assets/cosmic-jump-DkePWGqE.js?v=rock-polish-2';

const tracks = Object.fromEntries([1,2,3,4,5].map(n => [n, new URL(`./audio/track${n}.mp3`, window.location.href).href]));
const BASE_VOLUME = 0.48;
const CROSSFADE_MS = 1200;

// The tour gets darker, heavier and a little faster as the routes advance.
const THEMES = {
  grove:   { order: [4, 2], rate: 0.97 },
  cavern:  { order: [2, 3], rate: 1.00 },
  sky:     { order: [3, 1], rate: 1.04 },
  citadel: { order: [1, 5], rate: 1.08 },
  rush:    { order: [5, 1], rate: 1.10 }
};

const decks = [new Audio(), new Audio()];
decks.forEach(deck => {
  deck.preload = 'auto';
  deck.volume = BASE_VOLUME;
  deck.preservesPitch = true;
  deck.mozPreservesPitch = true;
  deck.webkitPreservesPitch = true;
});

let activeDeck = 0;
let theme = null;
let order = THEMES.grove.order;
let orderPos = 0;
let muted = false;
let playing = false;
let transitioning = false;
let fadeToken = 0;

const cfg = () => THEMES[theme] || THEMES.grove;
const setTrack = (deck, trackNumber, reset = true) => {
  const src = tracks[trackNumber];
  if (deck.dataset.track !== String(trackNumber)) {
    deck.src = src;
    deck.dataset.track = String(trackNumber);
    if (reset) deck.currentTime = 0;
  }
  deck.playbackRate = cfg().rate;
};

const safePlay = deck => deck.play().catch(() => {});

function crossfadeTo(trackNumber) {
  if (!playing || muted) {
    setTrack(decks[activeDeck], trackNumber);
    return;
  }

  const fromIndex = activeDeck;
  const toIndex = 1 - activeDeck;
  const from = decks[fromIndex];
  const to = decks[toIndex];
  const token = ++fadeToken;
  transitioning = true;

  setTrack(to, trackNumber);
  to.currentTime = 0;
  to.volume = 0;
  to.muted = muted;
  from.muted = muted;
  safePlay(to);

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

function advanceTrack() {
  if (!order.length || transitioning) return;
  orderPos = (orderPos + 1) % order.length;
  crossfadeTo(order[orderPos]);
}

function setTheme(nextTheme) {
  const next = THEMES[nextTheme] ? nextTheme : 'grove';
  const changed = next !== theme;
  theme = next;
  order = cfg().order;

  decks.forEach(deck => { deck.playbackRate = cfg().rate; });
  if (!changed) return false;

  orderPos = 0;
  const wanted = order[0];
  const current = decks[activeDeck];
  if (current.dataset.track && current.dataset.track !== String(wanted) && playing && !muted) {
    crossfadeTo(wanted);
  } else if (!current.dataset.track) {
    setTrack(current, wanted);
  }
  return true;
}

// Start the next track before the old one fully ends, so there is no hard cut.
setInterval(() => {
  if (!playing || muted || transitioning) return;
  const deck = decks[activeDeck];
  if (!Number.isFinite(deck.duration) || deck.duration <= 0) return;
  if (deck.duration - deck.currentTime <= CROSSFADE_MS / 1000 + 0.18) advanceTrack();
}, 140);

decks.forEach((deck, deckIndex) => {
  deck.addEventListener('ended', () => {
    if (deckIndex === activeDeck && playing && !transitioning) advanceTrack();
  });
  deck.addEventListener('error', () => {
    if (deckIndex === activeDeck && playing && !transitioning) setTimeout(advanceTrack, 180);
  });
});

window.__rockPlaylist = {
  play(nextTheme) {
    playing = true;
    setTheme(nextTheme || theme || 'grove');
    const deck = decks[activeDeck];
    if (!deck.dataset.track) setTrack(deck, order[orderPos] || order[0]);
    deck.playbackRate = cfg().rate;
    deck.muted = muted;
    deck.volume = BASE_VOLUME;
    if (!muted && !transitioning) safePlay(deck);
  },
  pause() {
    playing = false;
    decks.forEach(deck => deck.pause());
  },
  setMuted(value) {
    muted = !!value;
    decks.forEach(deck => { deck.muted = muted; });
    if (muted) decks.forEach(deck => deck.pause());
  }
};

const React = reactFactory();
const ReactDOM = reactDomFactory();
ReactDOM.hydrateRoot(document.getElementById('root'), React.createElement(RockTour), {
  onRecoverableError(error) { console.warn('Rock Tour hydration:', error); }
});
document.documentElement.dataset.rockHydrated = '1';
await import('./rock-tour-controls.js?v=rock-polish-2');

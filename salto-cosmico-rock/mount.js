import { i as reactFactory, t as reactDomFactory } from './assets/framework-CXnKph_e.js';
import RockTour from './assets/cosmic-jump-DkePWGqE.js?v=rock-polish-2';

const tracks = Object.fromEntries([1,2,3,4,5].map(n => [n, new URL(`./audio/track${n}.mp3`, window.location.href).href]));
const PLAYLIST = [1, 2, 3, 4, 5];
const BASE_VOLUME = 0.48;
const CROSSFADE_MS = 1200;

// Always play the five original songs at their original speed and duration.
// Stage progression must never shorten, restart or remove a song.
const THEMES = {
  grove:   { rate: 1.00 },
  cavern:  { rate: 1.00 },
  sky:     { rate: 1.00 },
  citadel: { rate: 1.00 },
  rush:    { rate: 1.00 }
};

const decks = [new Audio(), new Audio()];
decks.forEach(deck => {
  deck.preload = 'auto';
  deck.volume = BASE_VOLUME;
  deck.playbackRate = 1;
  deck.preservesPitch = true;
  deck.mozPreservesPitch = true;
  deck.webkitPreservesPitch = true;
});

let activeDeck = 0;
let theme = 'grove';
let orderPos = 0;
let muted = false;
let playing = false;
let transitioning = false;
let fadeToken = 0;

const setTrack = (deck, trackNumber, reset = true) => {
  const src = tracks[trackNumber];
  if (deck.dataset.track !== String(trackNumber)) {
    deck.src = src;
    deck.dataset.track = String(trackNumber);
    if (reset) deck.currentTime = 0;
  }
  deck.playbackRate = 1;
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
  if (transitioning) return;
  orderPos = (orderPos + 1) % PLAYLIST.length;
  crossfadeTo(PLAYLIST[orderPos]);
}

function setTheme(nextTheme) {
  // Keep stage identity for future musical arrangement work, but do not alter
  // speed or restart the song that is currently playing.
  theme = THEMES[nextTheme] ? nextTheme : 'grove';
  decks.forEach(deck => { deck.playbackRate = 1; });
}

// Crossfade only at the natural end of each full song.
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
    if (!deck.dataset.track) setTrack(deck, PLAYLIST[orderPos]);
    deck.playbackRate = 1;
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

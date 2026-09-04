import { i as reactFactory, t as reactDomFactory } from './assets/framework-CXnKph_e.js';
import RockTour from './assets/cosmic-jump-DkePWGqE.js';

const tracks = [1,2,3,4,5].map(n => new URL(`./audio/track${n}.mp3`, window.location.href).href);
const audio = new Audio();
audio.preload = 'auto';
audio.volume = 0.48;
let index = 0;
let muted = false;

audio.src = tracks[index];
audio.addEventListener('ended', () => {
  index = (index + 1) % tracks.length;
  audio.src = tracks[index];
  if (!muted) audio.play().catch(() => {});
});
audio.addEventListener('error', () => {
  index = (index + 1) % tracks.length;
  setTimeout(() => {
    audio.src = tracks[index];
    if (!muted) audio.play().catch(() => {});
  }, 250);
});

window.__rockPlaylist = {
  play() {
    if (!muted) audio.play().catch(() => {});
  },
  pause() { audio.pause(); },
  setMuted(value) {
    muted = !!value;
    audio.muted = muted;
    if (muted) audio.pause();
  }
};

const React = reactFactory();
const ReactDOM = reactDomFactory();
ReactDOM.hydrateRoot(document.getElementById('root'), React.createElement(RockTour), {
  onRecoverableError(error) { console.warn('Rock Tour hydration:', error); }
});
await import('./rock-tour-controls.js');

/**
 * New-order alert: a short double beep (Web Audio, no sound file to download)
 * plus phone vibration. Browsers only allow sound after the user has tapped
 * something on the page once — call unlockAudio() from any click handler.
 */
let ctx = null;

function getContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  return ctx;
}

export function unlockAudio() {
  try {
    const c = getContext();
    if (c && c.state === 'suspended') c.resume();
  } catch {
    /* ignore */
  }
}

export function playBeep() {
  try {
    const c = getContext();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    [0, 0.28].forEach((offset) => {
      const start = c.currentTime + offset;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  } catch {
    /* sound is a nice-to-have */
  }
}

export function vibrate(pattern = [200, 100, 200]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

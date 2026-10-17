// Tiny synthesized sound effects (no audio files needed, works offline).
let ac = null;
let enabled = true;
try { enabled = localStorage.getItem('carc-sound') !== 'off'; } catch { /* private mode */ }

export function unlockAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
}
export const soundOn = () => enabled;
export function setSound(on) {
  enabled = on;
  try { localStorage.setItem('carc-sound', on ? 'on' : 'off'); } catch { /* ignore */ }
}

function tone({ f = 440, f2 = null, type = 'sine', dur = 0.15, vol = 0.2, delay = 0, attack = 0.005 }) {
  if (!enabled || !ac) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.12, vol = 0.25, freq = 900, delay = 0 }) {
  if (!enabled || !ac) return;
  const t0 = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ac.createBufferSource(); src.buffer = buf;
  const filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = freq;
  const g = ac.createGain(); g.gain.value = vol;
  src.connect(filt).connect(g).connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  place() { noise({ dur: 0.09, vol: 0.5, freq: 600 }); tone({ f: 140, f2: 70, type: 'triangle', dur: 0.12, vol: 0.35 }); },
  rotate() { noise({ dur: 0.05, vol: 0.15, freq: 2400 }); },
  meeple() { tone({ f: 300, f2: 160, type: 'triangle', dur: 0.1, vol: 0.3 }); noise({ dur: 0.05, vol: 0.2, freq: 1500, delay: 0.02 }); },
  tap() { tone({ f: 880, type: 'sine', dur: 0.05, vol: 0.08 }); },
  error() { tone({ f: 200, f2: 150, type: 'square', dur: 0.15, vol: 0.06 }); },
  score(big = false) {
    const notes = big ? [523, 659, 784, 1046] : [659, 880];
    notes.forEach((f, i) => tone({ f, type: 'triangle', dur: 0.22, vol: 0.18, delay: i * 0.08 }));
    notes.forEach((f, i) => tone({ f: f * 2, type: 'sine', dur: 0.18, vol: 0.05, delay: i * 0.08 }));
  },
  turn() { tone({ f: 587, type: 'sine', dur: 0.12, vol: 0.08 }); tone({ f: 880, type: 'sine', dur: 0.16, vol: 0.06, delay: 0.09 }); },
  dragon() { noise({ dur: 0.5, vol: 0.35, freq: 420 }); tone({ f: 110, f2: 55, type: 'sawtooth', dur: 0.5, vol: 0.12 }); tone({ f: 82, f2: 60, type: 'square', dur: 0.4, vol: 0.05, delay: 0.05 }); },
  chomp() { noise({ dur: 0.08, vol: 0.4, freq: 900 }); noise({ dur: 0.08, vol: 0.35, freq: 700, delay: 0.12 }); },
  magic() { [988, 1319, 1568, 1976].forEach((f, i) => tone({ f, type: 'sine', dur: 0.2, vol: 0.06, delay: i * 0.06 })); },
  capture() { tone({ f: 330, f2: 220, type: 'triangle', dur: 0.18, vol: 0.2 }); noise({ dur: 0.06, vol: 0.25, freq: 1200, delay: 0.1 }); },
  coins() { [1568, 2093, 1760].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.12, vol: 0.1, delay: i * 0.07 })); },
  fanfare() {
    [[523, 0], [523, 0.15], [523, 0.3], [698, 0.45], [880, 0.75], [784, 0.95], [1046, 1.15]].forEach(([f, d]) => {
      tone({ f, type: 'sawtooth', dur: 0.28, vol: 0.06, delay: d });
      tone({ f, type: 'triangle', dur: 0.3, vol: 0.14, delay: d });
    });
  },
};

const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

// ─── Flag global de mute de sons de UI ───────────────────────────────────────
let _soundMuted = false;

export function setSoundMuted(value: boolean) {
  _soundMuted = value;
}
// ─────────────────────────────────────────────────────────────────────────────

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  volume = 0.3,
  delay = 0
) {
  if (_soundMuted) return;

  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ac.currentTime + delay);

  gain.gain.setValueAtTime(0, ac.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);

  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration);
}

// ─── Helper para reproduzir um AudioBuffer com guard de mute ─────────────────
async function playBuffer(buffer: AudioBuffer, volume: number) {
  if (_soundMuted) return;

  const ac = getCtx();
  if (ac.state === 'suspended') await ac.resume();

  const source = ac.createBufferSource();
  const gain = ac.createGain();

  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ac.destination);

  gain.gain.setValueAtTime(volume, ac.currentTime);
  source.start();
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Cache do hover.mp3 ───────────────────────────────────────────────────────
let hoverBuffer: AudioBuffer | null = null;
let hoverLoading = false;

async function getHoverBuffer(): Promise<AudioBuffer | null> {
  if (hoverBuffer) return hoverBuffer;
  if (hoverLoading) return null;
  hoverLoading = true;
  try {
    const response = await fetch('/sounds/hover.mp3');
    const arrayBuffer = await response.arrayBuffer();
    hoverBuffer = await getCtx().decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('hover.mp3 não encontrado:', e);
  } finally {
    hoverLoading = false;
  }
  return hoverBuffer;
}

getHoverBuffer();

export async function playHover(volume = 0.45) {
  const buffer = await getHoverBuffer();
  if (!buffer) return;
  await playBuffer(buffer, volume);
}
// ─────────────────────────────────────────────────────────────────────────────

export function playPackOpen() {
  playTone(120, "sawtooth", 0.15, 0.65);
  playTone(80, "sawtooth", 0.2, 0.55, 0.1);
  playTone(200, "sine", 0.3, 0.45, 0.2);
  playTone(400, "sine", 0.2, 0.4, 0.4);
}

export function playCardReveal(tier: "legend" | "gold" | "silver" | "bronze") {
  const configs = {
    legend: [
      { f: 523, t: "sine" as OscillatorType, d: 0.3, v: 0.65 },
      { f: 659, t: "sine" as OscillatorType, d: 0.3, v: 0.65, delay: 0.15 },
      { f: 784, t: "sine" as OscillatorType, d: 0.5, v: 0.8, delay: 0.3 },
    ],
    gold: [
      { f: 440, t: "sine" as OscillatorType, d: 0.25, v: 0.55 },
      { f: 550, t: "sine" as OscillatorType, d: 0.25, v: 0.55, delay: 0.15 },
    ],
    silver: [
      { f: 330, t: "triangle" as OscillatorType, d: 0.2, v: 0.5 },
    ],
    bronze: [
      { f: 220, t: "triangle" as OscillatorType, d: 0.15, v: 0.45 },
    ],
  };

  configs[tier].forEach(({ f, t, d, v, delay = 0 }) =>
    playTone(f, t, d, v, delay)
  );
}

export function playShake() {
  playTone(60, "sawtooth", 0.08, 0.7);
  playTone(60, "sawtooth", 0.08, 0.7, 0.1);
  playTone(60, "sawtooth", 0.08, 0.7, 0.2);
}

// ─── Cache do select.mp3 ──────────────────────────────────────────────────────
let selectBuffer: AudioBuffer | null = null;
let selectLoading = false;

async function getSelectBuffer(): Promise<AudioBuffer | null> {
  if (selectBuffer) return selectBuffer;
  if (selectLoading) return null;
  selectLoading = true;
  try {
    const response = await fetch('/sounds/select.mp3');
    const arrayBuffer = await response.arrayBuffer();
    selectBuffer = await getCtx().decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('select.mp3 não encontrado:', e);
  } finally {
    selectLoading = false;
  }
  return selectBuffer;
}

getSelectBuffer();

export async function playSelect(volume = 0.6) {
  const buffer = await getSelectBuffer();
  if (!buffer) return;
  await playBuffer(buffer, volume);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Cache do favorite.mp3 ────────────────────────────────────────────────────
let favoriteBuffer: AudioBuffer | null = null;
let favoriteLoading = false;

async function getFavoriteBuffer(): Promise<AudioBuffer | null> {
  if (favoriteBuffer) return favoriteBuffer;
  if (favoriteLoading) return null;
  favoriteLoading = true;
  try {
    const response = await fetch('/sounds/favorite.mp3');
    const arrayBuffer = await response.arrayBuffer();
    favoriteBuffer = await getCtx().decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('favorite.mp3 não encontrado:', e);
  } finally {
    favoriteLoading = false;
  }
  return favoriteBuffer;
}

getFavoriteBuffer();

export async function playFavorite(volume = 2) {
  const buffer = await getFavoriteBuffer();
  if (!buffer) return;
  await playBuffer(buffer, volume);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Cache do button.mp3 ──────────────────────────────────────────────────────
let buttonBuffer: AudioBuffer | null = null;
let buttonLoading = false;

async function getButtonBuffer(): Promise<AudioBuffer | null> {
  if (buttonBuffer) return buttonBuffer;
  if (buttonLoading) return null;
  buttonLoading = true;
  try {
    const response = await fetch('/sounds/button.mp3');
    const arrayBuffer = await response.arrayBuffer();
    buttonBuffer = await getCtx().decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('button.mp3 não encontrado:', e);
  } finally {
    buttonLoading = false;
  }
  return buttonBuffer;
}

getButtonBuffer();

export async function playButton(volume = 0.5) {
  const buffer = await getButtonBuffer();
  if (!buffer) return;
  await playBuffer(buffer, volume);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Cache do confirm.mp3 ─────────────────────────────────────────────────────
let confirmBuffer: AudioBuffer | null = null;
let confirmLoading = false;

async function getConfirmBuffer(): Promise<AudioBuffer | null> {
  if (confirmBuffer) return confirmBuffer;
  if (confirmLoading) return null;
  confirmLoading = true;
  try {
    const response = await fetch('/sounds/confirm.mp3');
    const arrayBuffer = await response.arrayBuffer();
    confirmBuffer = await getCtx().decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('confirm.mp3 não encontrado:', e);
  } finally {
    confirmLoading = false;
  }
  return confirmBuffer;
}

getConfirmBuffer();

export async function playConfirm(volume = 0.6) {
  const buffer = await getConfirmBuffer();
  if (!buffer) return;
  await playBuffer(buffer, volume);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Cache do premiumpack.mp3 ─────────────────────────────────────────────────
let premiumPackBuffer: AudioBuffer | null = null;
let premiumPackLoading = false;

async function getPremiumPackBuffer(): Promise<AudioBuffer | null> {
  if (premiumPackBuffer) return premiumPackBuffer;
  if (premiumPackLoading) return null;
  premiumPackLoading = true;
  try {
    const response = await fetch('/sounds/premiumpack.mp3');
    const arrayBuffer = await response.arrayBuffer();
    premiumPackBuffer = await getCtx().decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('premiumpack.mp3 não encontrado:', e);
  } finally {
    premiumPackLoading = false;
  }
  return premiumPackBuffer;
}

getPremiumPackBuffer();

export async function playPremiumPack(volume = 0.75) {
  const buffer = await getPremiumPackBuffer();
  if (!buffer) return;
  await playBuffer(buffer, volume);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Cache do legendpack.mp3 ──────────────────────────────────────────────────
let legendPackBuffer: AudioBuffer | null = null;
let legendPackLoading = false;

async function getLegendPackBuffer(): Promise<AudioBuffer | null> {
  if (legendPackBuffer) return legendPackBuffer;
  if (legendPackLoading) return null;
  legendPackLoading = true;
  try {
    const response = await fetch('/sounds/legendpack.mp3');
    const arrayBuffer = await response.arrayBuffer();
    legendPackBuffer = await getCtx().decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('legendpack.mp3 não encontrado:', e);
  } finally {
    legendPackLoading = false;
  }
  return legendPackBuffer;
}

getLegendPackBuffer();

export async function playLegendPack(volume = 0.9) {
  const buffer = await getLegendPackBuffer();
  if (!buffer) return;
  await playBuffer(buffer, volume);
}
// ─────────────────────────────────────────────────────────────────────────────
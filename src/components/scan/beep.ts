"use client";

// Bip de confirmación/error al escanear. Un tono corto por Web Audio, sin archivo de audio (así
// funciona también sin conexión y no depende de que el navegador tenga habilitado el autoplay de un
// <audio>). Si el navegador bloquea el audio (sin interacción previa) simplemente no suena: nunca debe
// romper el flujo de escaneo.
let ctx: AudioContext | null = null;

function play(freq: number, durationMs: number) {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // sin soporte de audio: no pasa nada, el feedback visual alcanza
  }
}

export function beepOk() {
  play(1760, 90);
}

export function beepError() {
  play(220, 90);
  setTimeout(() => play(220, 110), 120);
}

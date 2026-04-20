import confetti from "canvas-confetti";

export function triggerPremiumConfetti() {
  const count = 120;
  const defaults = {
    spread: 70,
    ticks: 80,
    gravity: 0.9,
    decay: 0.92,
    startVelocity: 28,
  };

  confetti({
    ...defaults,
    particleCount: count * 0.6,
    origin: { x: 0.3, y: 0.55 },
    colors: ["#ffd700", "#ffec6e", "#fff4b0", "#ffffff", "#ffe066"],
  });

  confetti({
    ...defaults,
    particleCount: count * 0.6,
    origin: { x: 0.7, y: 0.55 },
    colors: ["#ffd700", "#ffec6e", "#fff4b0", "#ffffff", "#ffe066"],
  });
}

export function triggerLegendConfetti() {
  const duration = 2200;
  const end = Date.now() + duration;

  const colors = ["#7c3aed", "#a855f7", "#c084fc", "#ffffff", "#6d28d9", "#ede9fe"];

  (function frame() {
    confetti({
      particleCount: 7,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.6 },
      colors,
      ticks: 120,
      gravity: 0.85,
      decay: 0.91,
      startVelocity: 38,
    });

    confetti({
      particleCount: 7,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.6 },
      colors,
      ticks: 120,
      gravity: 0.85,
      decay: 0.91,
      startVelocity: 38,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();

  // Burst central extra
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors,
      ticks: 150,
      gravity: 0.7,
      decay: 0.9,
      startVelocity: 45,
      scalar: 1.2,
    });
  }, 150);
}
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

// User Goal
export function triggerGoalConfetti() {
  const duration = 1800;
  const end = Date.now() + duration;

  const canvas = document.createElement("canvas");

  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "10050";

  document.body.appendChild(canvas);

  const goalConfetti = confetti.create(canvas, {
    resize: true,
    useWorker: true,
  });

  const colors = ["#3b82f6", "#60a5fa", "#93c5fd", "#ffffff", "#1d4ed8"];

  function removeCanvas() {
    setTimeout(() => {
      canvas.remove();
    }, 2600);
  }

  (function frame() {
    goalConfetti({
      particleCount: 6,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.65 },
      colors,
      ticks: 100,
      gravity: 0.9,
      decay: 0.92,
      startVelocity: 35,
    });

    goalConfetti({
      particleCount: 6,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.65 },
      colors,
      ticks: 100,
      gravity: 0.9,
      decay: 0.92,
      startVelocity: 35,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    } else {
      removeCanvas();
    }
  })();

  setTimeout(() => {
    goalConfetti({
      particleCount: 70,
      spread: 110,
      origin: { x: 0.5, y: 0.5 },
      colors,
      ticks: 120,
      gravity: 0.8,
      decay: 0.9,
      startVelocity: 42,
      scalar: 1.1,
    });
  }, 120);
}

export function triggerDraftChampionConfetti() {
  if (typeof document === "undefined") return;

  const duration = 2800;
  const end = Date.now() + duration;
  const canvas = document.createElement("canvas");

  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "10070";

  document.body.appendChild(canvas);

  const championConfetti = confetti.create(canvas, {
    resize: true,
    useWorker: true,
  });

  const colors = ["#22c55e", "#86efac", "#7c3aed", "#a855f7", "#d8b4fe", "#facc15", "#ffffff"];

  function removeCanvas() {
    setTimeout(() => {
      canvas.remove();
    }, 2600);
  }

  (function frame() {
    championConfetti({
      particleCount: 5,
      angle: 58,
      spread: 70,
      origin: { x: 0, y: 0.62 },
      colors,
      ticks: 120,
      gravity: 0.82,
      decay: 0.91,
      startVelocity: 40,
      scalar: 1.05,
      disableForReducedMotion: true,
    });

    championConfetti({
      particleCount: 5,
      angle: 122,
      spread: 70,
      origin: { x: 1, y: 0.62 },
      colors,
      ticks: 120,
      gravity: 0.82,
      decay: 0.91,
      startVelocity: 40,
      scalar: 1.05,
      disableForReducedMotion: true,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    } else {
      removeCanvas();
    }
  })();

  setTimeout(() => {
    championConfetti({
      particleCount: 120,
      spread: 115,
      origin: { x: 0.5, y: 0.42 },
      colors,
      ticks: 155,
      gravity: 0.72,
      decay: 0.9,
      startVelocity: 48,
      scalar: 1.18,
      disableForReducedMotion: true,
    });
  }, 140);

  setTimeout(() => {
    championConfetti({
      particleCount: 70,
      spread: 80,
      origin: { x: 0.5, y: 0.18 },
      colors: ["#a855f7", "#d8b4fe", "#facc15", "#ffffff"],
      ticks: 140,
      gravity: 0.65,
      decay: 0.9,
      startVelocity: 34,
      scalar: 0.9,
      disableForReducedMotion: true,
    });
  }, 520);
}

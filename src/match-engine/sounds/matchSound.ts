/**
 * matchSound.ts
 * Sistema de áudio da match-engine — Ballers
 *
 * Responsabilidades:
 *  - Tocar endgame.mp3 + resultado (victory/defeat/draw) ao abrir MatchSummaryModal
 *  - Respeitar o toggle de música do Settings (isMuted)
 *  - Garantir que os sons toquem apenas uma vez por partida
 *
 * Nota: crowd.mp3 é gerenciado pelo MusicPlayer diretamente via rota /Match.
 */

// ─── Caminhos dos arquivos de áudio ──────────────────────────────────────────

const SOUNDS = {
  endgame: "/match-sounds/endgame.mp3",
  victory: "/match-sounds/victory.mp3",
  defeat:  "/match-sounds/defeat.mp3",
  draw:    "/match-sounds/draw.mp3",
} as const;

// ─── Singleton interno ────────────────────────────────────────────────────────

let musicEnabled  = true;
let endgamePlayed = false;

// ─── API pública ──────────────────────────────────────────────────────────────

export const matchSound = {

  /**
   * Espelha o estado do botão de música do Settings (isMuted).
   * Chame sempre que isMuted mudar.
   */
  setMusicEnabled(enabled: boolean): void {
    musicEnabled = enabled;
  },

  /**
   * Reseta o estado para uma nova partida.
   * Chame ao montar Match.tsx.
   */
  startMatch(): void {
    endgamePlayed = false;
  },

  /**
   * Chame quando o MatchSummaryModal abrir.
   * Toca endgame.mp3 e em seguida victory/defeat/draw.mp3.
   * Executa apenas uma vez por partida.
   * Respeita o toggle de música do Settings.
   */
  onMatchFinished(result: "win" | "loss" | "draw"): void {
    if (endgamePlayed) return;
    endgamePlayed = true;

    if (!musicEnabled) return;

    const endgame = new Audio(SOUNDS.endgame);
    endgame.volume = 0.85;
    endgame.play().catch(() => {});

    endgame.addEventListener("ended", () => {
      const resultSrc =
        result === "win"  ? SOUNDS.victory :
        result === "loss" ? SOUNDS.defeat  :
                            SOUNDS.draw;

      const resultAudio = new Audio(resultSrc);
      resultAudio.volume = 0.85;
      resultAudio.play().catch(() => {});
    });
  },
};
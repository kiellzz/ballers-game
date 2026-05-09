/**
 * matchSound.ts
 * Sistema de áudio da match-engine — Ballers
 *
 * Responsabilidades:
 *  - Tocar endgame.mp3 + resultado (victory/defeat/draw) ao abrir MatchSummaryModal
 *  - Tocar sons de gols (usergoal.mp3/oppgoal.mp3) ao abrir GoalModal
 *  - Tocar sons de set pieces (setpiece.mp3) ao abrir PreInteractiveModal
 *  - Respeitar o toggle de música do Settings (isMuted)
 *  - Garantir que os sons toquem apenas uma vez por partida
 *  - Centralizar toda lógica de áudio da partida
 *
 * Nota: crowd.mp3 é gerenciado pelo MusicPlayer diretamente via rota /Match.
 */

// ─── Caminhos dos arquivos de áudio ──────────────────────────────────────────

const SOUNDS = {
  endgame: "/match-sounds/endgame.mp3",
  victory: "/match-sounds/victory.mp3",
  defeat:  "/match-sounds/defeat.mp3",
  draw:    "/match-sounds/draw.mp3",
  usergoal: "/match-sounds/usergoal.mp3",
  oppgoal: "/match-sounds/oppgoal.mp3",
  setpiece: "/match-sounds/setpiece.mp3",
} as const;

// ─── Config de volume ────────────────────────────────────────────────────────
const MASTER_VOLUME = 0.45; // <— diminui aqui (0.0 a 1.0)

// ─── Singleton interno ────────────────────────────────────────────────────────

let musicEnabled  = true;
let endgamePlayed = false;
let currentAudio: HTMLAudioElement | null = null; // Para cleanup correto

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
    this.stopCurrentAudio();
  },

  /**
   * Para e limpa o áudio atual.
   * Usado internamente para evitar sobreposição de sons.
   */
  stopCurrentAudio(): void {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
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
    endgame.volume = MASTER_VOLUME;
    endgame.play().catch(() => {});

    endgame.addEventListener("ended", () => {
      const resultSrc =
        result === "win"  ? SOUNDS.victory :
        result === "loss" ? SOUNDS.defeat  :
                            SOUNDS.draw;

      const resultAudio = new Audio(resultSrc);
      resultAudio.volume = MASTER_VOLUME;
      resultAudio.play().catch(() => {});
    });
  },

  /**
   * Toca som de gol ao abrir GoalModal.
   * Respeita o toggle de música do Settings.
   * Para áudio anterior antes de tocar.
   */
  playGoal(side: "user" | "opponent"): void {
    if (!musicEnabled) return;

    this.stopCurrentAudio();

    const goalSound = side === "user" ? SOUNDS.usergoal : SOUNDS.oppgoal;
    const audio = new Audio(goalSound);
    
    // Volume mais alto para gols do usuário, mais baixo para oponente
    audio.volume = side === "user" ? MASTER_VOLUME : MASTER_VOLUME * 0.7;
    
    currentAudio = audio;
    audio.play().catch(() => {});
  },

  /**
   * Toca som de set piece ao abrir PreInteractiveModal.
   * Respeita o toggle de música do Settings.
   * Para áudio anterior antes de tocar.
   */
  playSetPiece(type: "corner" | "freekick" | "penalty"): void {
    if (!musicEnabled) return;

    this.stopCurrentAudio();

    const audio = new Audio(SOUNDS.setpiece);
    
    // Volume mais baixo por padrão, mais alto para penalties
    audio.volume = type === "penalty" ? MASTER_VOLUME * 0.8 : MASTER_VOLUME * 0.5;
    
    // Penalidade toca levemente mais lento
    if (type === "penalty") {
      audio.playbackRate = 0.9;
    }
    
    currentAudio = audio;
    audio.play().catch(() => {});
  },
};
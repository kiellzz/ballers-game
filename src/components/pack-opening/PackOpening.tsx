import { useState, useCallback } from "react";
import type { Player } from "../../types/PlayerTypes";
import { drawPack } from "../../utils/packProbability";
import { playPackOpen, playShake, playCardReveal, playButton, playConfirm, playPremiumPack, playLegendPack } from "../../utils/sound";
import { getCardTier } from "../../utils/getCardTier";
import { triggerPremiumConfetti, triggerLegendConfetti } from "../../utils/confettiEffects";
import { PackCard } from "./PackCard";
import PackHeader from "./PackHeader";
import PackOpeningCardModal from "./PackOpeningCardModal";
import "./PackOpening.css";

interface PackOpeningProps {
  players: Player[];
}

type Phase = "idle" | "shaking" | "burst" | "cards" | "done";

export function PackOpening({ players }: PackOpeningProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [pack, setPack] = useState<Player[]>([]);
  const [flippedIndexes, setFlippedIndexes] = useState<Set<number>>(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const handleOpen = useCallback(() => {
    if (phase !== "idle") return;

    playConfirm(0.4);
    setPhase("shaking");
    playShake();

    setTimeout(() => {
      setPhase("burst");
      playPackOpen();
      setPack(drawPack(players, 5));
      setFlippedIndexes(new Set());

      setTimeout(() => {
        setPhase("cards");
      }, 600);
    }, 800);
  }, [phase, players]);

  const handleFlip = useCallback((index: number, player: Player) => {
    const tier = getCardTier(player.overall, player.isLegend);

    if (tier === "legend") {
      playLegendPack();
      triggerLegendConfetti();
    } else if (player.overall >= 86) {
      playPremiumPack();
      triggerPremiumConfetti();
    } else {
      playCardReveal(tier);
    }

    setFlippedIndexes(prev => {
      const next = new Set(prev);
      next.add(index);
      if (next.size >= 5) setPhase("done");
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    playConfirm(0.4);
    setPhase("idle");
    setPack([]);
    setFlippedIndexes(new Set());
    setSelectedPlayer(null);
  }, []);

  return (
    <div className="pack-opening">

      <div className="pack-opening__particles" />

      <PackHeader />

      {(phase === "idle" || phase === "shaking") && (
        <div className="pack-opening__pack">
          <img
            src="/images/packs/packgold.png"
            alt="Pack Gold"
            className={`pack-opening__pack-img ${phase === "shaking" ? "pack-opening__pack-img--shaking" : ""} ${phase === "idle" ? "pack-opening__pack-img--clickable" : ""}`}
            onClick={handleOpen}
            onMouseEnter={() => phase === "idle" && playButton(0.3)}
          />
        </div>
      )}

      {phase === "burst" && (
        <div className="pack-opening__burst">
          <div className="pack-opening__burst-ring" />
          <div className="pack-opening__burst-ring pack-opening__burst-ring--2" />
        </div>
      )}

      {(phase === "cards" || phase === "done") && (
        <div className="pack-opening__cards">
          <div className="pack-opening__cards-row">
            {pack.map((player, i) => (
              <PackCard
                key={player.id}
                player={player}
                index={i}
                allRevealed={phase === "cards" || phase === "done"}
                flipped={flippedIndexes.has(i)}
                onFlip={() => handleFlip(i, player)}
                onCardClick={phase === "done" ? () => setSelectedPlayer(player) : undefined}
              />
            ))}
          </div>

          {phase === "done" && (
            <button
              className="pack-opening__btn pack-opening__btn--reset"
              onClick={handleReset}
              onMouseEnter={() => playButton(0.3)}
            >
              Open new pack
            </button>
          )}
        </div>
      )}

      {selectedPlayer && (
        <PackOpeningCardModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

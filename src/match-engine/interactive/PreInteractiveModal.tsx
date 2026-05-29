import { useEffect } from "react";
import MatchModal from "../../components/match/MatchModal";
import type { Player } from "../../types/PlayerTypes";
import { getPlayerImage } from "../../utils/getPlayerImage";
import { getFlagUrl } from "../../utils/getFlagUrl";
import { matchSound } from "../sounds/matchSound";
import type { CardType } from "../matchTypes";
import "./PreInteractiveModal.css";

export type PreInteractiveType =
  | "penalty"
  | "freekick"
  | "quick_freekick"
  | "corner";

export type PreInteractiveSide = "user" | "opponent";

export interface PreInteractiveCardNotice {
  card: Exclude<CardType, "none">;
  playerName: string;
}

type PreInteractiveTone =
  | "positive"
  | "neutral"
  | "danger"
  | "danger_soft";

interface PreInteractiveModalProps {
  isOpen: boolean;
  type: PreInteractiveType;
  onContinue: () => void;
  onClose?: () => void;
  player?: Player;
  side?: PreInteractiveSide;
  cardNotice?: PreInteractiveCardNotice | null;
}

export default function PreInteractiveModal({
  isOpen,
  type,
  onContinue,
  player,
  side = "user",
  cardNotice = null,
}: PreInteractiveModalProps) {
  const isOpponentSetPiece = side === "opponent";

  // 🔊 Som de bola parada
  useEffect(() => {
    if (!isOpen) return;

    // Mapeia quick_freekick para freekick para o áudio
    const audioType = type === "quick_freekick" ? "freekick" : type;
    
    // Toca som de set piece através do matchSound
    matchSound.playSetPiece(audioType);
  }, [isOpen, type]);

  function getContent(): {
    title: string;
    subtitle: string;
    cta: string;
    tone: PreInteractiveTone;
  } {
    if (!isOpponentSetPiece) {
      switch (type) {
        case "penalty":
          return {
            title: "Penalty!",
            subtitle: "Your team has won a penalty.",
            cta: "Take the shot",
            tone: "positive",
          };

        case "freekick":
          return {
            title: "Free Kick",
            subtitle: "A dangerous set piece opportunity.",
            cta: "Take the kick",
            tone: "positive",
          };

        case "quick_freekick":
          return {
            title: "Quick Free Kick",
            subtitle: "Your team restarts play immediately.",
            cta: "Continue",
            tone: "neutral",
          };

        case "corner":
          return {
            title: "Corner Kick",
            subtitle: "A great chance to create danger.",
            cta: "Take the corner",
            tone: "positive",
          };

        default:
          return {
            title: "Set Piece",
            subtitle: "",
            cta: "Continue",
            tone: "neutral",
          };
      }
    }

    switch (type) {
      case "penalty":
        return {
          title: "Opponent Penalty",
          subtitle: "Your goalkeeper is under pressure.",
          cta: "Defend the penalty",
          tone: "danger",
        };

      case "freekick":
        return {
          title: "Opponent Free Kick",
          subtitle: "Your defense must stay alert.",
          cta: "Defend the free kick",
          tone: "danger",
        };

      case "quick_freekick":
        return {
          title: "Opponent Quick Free Kick",
          subtitle: "The opponent restarts play quickly.",
          cta: "Continue",
          tone: "danger_soft",
        };

      case "corner":
        return {
          title: "Opponent Corner",
          subtitle: "Your box is under pressure.",
          cta: "Defend the corner",
          tone: "danger",
        };

      default:
        return {
          title: "Opponent Set Piece",
          subtitle: "",
          cta: "Continue",
          tone: "danger_soft",
        };
    }
  }

  const { title, subtitle, cta, tone } = getContent();
  const cardNoticeLabel =
    cardNotice?.card === "yellow" ? "Yellow card" : "Red card";

  const headerContent = player ? (
    <div className={`pre-int-player pre-int-player--${tone}`}>
      <img
        src={player.customImage ?? getPlayerImage(player.name)}
        alt={player.name}
        className="pre-int-player__img"
        draggable={false}
        onError={(e) => { e.currentTarget.src = "/images/players/default.webp"; }}
      />

      <div className="pre-int-player__info">
        <span className={`pre-int-player__label pre-int-player__label--${tone}`}>
          {isOpponentSetPiece ? "OPPONENT THREAT" : "SET PIECE TAKER"}
        </span>

        <span className="pre-int-player__name">{player.name}</span>

        <div className="pre-int-player__meta">
          <span className="pre-int-player__ovr">{player.overall}</span>
          <span className="pre-int-player__pos">{player.position}</span>

          <img
            src={getFlagUrl(player.nationality)}
            alt={player.nationality}
            className="pre-int-player__flag"
          />
        </div>

        {cardNotice ? (
          <div
            className={`pre-int-player__card-note pre-int-player__card-note--${cardNotice.card}`}
          >
            {cardNoticeLabel}: <span>{cardNotice.playerName}</span>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <MatchModal
      size="compact"
      isOpen={isOpen}
      title={title}
      subtitle={subtitle}
      className={`pre-int-modal pre-int-modal--${tone}`}
      headerContent={headerContent}
      primaryAction={
        <button
          className={`match-modal__btn match-modal__btn--primary pre-int-btn pre-int-btn--${tone}`}
          onClick={onContinue}
        >
          {cta}
        </button>
      }
    >
      {null}
    </MatchModal>
  );
}

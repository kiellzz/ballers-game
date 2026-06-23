import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OpponentLineup } from "../components/prematch/OpponentLineup";
import {
  DRAFT_ACTIVE_SQUAD_STORAGE_KEY,
  loadDraftProgress,
} from "../features/draft/draftUtils";
import type { DraftProgress } from "../features/draft/draftUtils";
import { DRAFT_ROUNDS } from "../opponents/draftOpponents";
import type { Player } from "../types/PlayerTypes";
import type { FormationKey } from "../utils/formations";
import "./DraftPrematch.css";

type DraftSquad = {
  formation: FormationKey;
  pitch: (Player | null)[];
  bench: (Player | null)[];
  updatedAt: string;
};

function readDraftSquad(): DraftSquad | null {
  try {
    const rawSquad = localStorage.getItem(DRAFT_ACTIVE_SQUAD_STORAGE_KEY);
    return rawSquad ? JSON.parse(rawSquad) as DraftSquad : null;
  } catch {
    return null;
  }
}

export default function DraftPrematch() {
  const navigate = useNavigate();
  const [progress] = useState<DraftProgress | null>(loadDraftProgress);
  const [squad] = useState<DraftSquad | null>(readDraftSquad);
  const round = progress ? DRAFT_ROUNDS[progress.currentRound] : null;
  const opponent = progress?.opponents[progress.currentRound] ?? null;

  useEffect(() => {
    if (!progress || !squad || !round || !opponent) {
      navigate("/draft-lineup", { replace: true });
    }
  }, [navigate, opponent, progress, round, squad]);

  if (!progress || !squad || !round || !opponent) return null;

  return (
    <main className="draft-prematch">
      <div className="draft-prematch__backdrop" />
      <div className="draft-prematch__round" aria-hidden="true">
        <span>DRAFT KNOCKOUT</span>
        <strong>{round.label}</strong>
      </div>

      <OpponentLineup
        opponent={opponent}
        tag={`Draft · ${round.label}`}
        startLabel={`Start ${round.label}`}
        onClose={() => navigate("/draft-lineup")}
        onStart={() => {
          navigate("/match", {
            state: {
              opponent,
              userSquad: squad,
              gameMode: "draft",
              draftRound: progress.currentRound,
            },
          });
        }}
      />
    </main>
  );
}

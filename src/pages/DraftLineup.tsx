import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Bench from "../components/lineup/Bench";
import LineupCard from "../components/lineup/LineupCard";
import FeatureButton from "../components/feature-button/FeatureButton";
import ToastContainer from "../components/toast/ToastContainer";
import DraftFormationModal from "../features/draft/DraftFormationModal";
import DraftLineupHeader from "../features/draft/DraftLineupHeader";
import DraftPlayerPickModal from "../features/draft/DraftPlayerPickModal";
import DraftPlayerModal from "../features/draft/DraftPlayerModal";
import {
  createDraftProgress,
  DRAFT_ACTIVE_SQUAD_STORAGE_KEY,
  DRAFT_BENCH_SIZE,
  drawDraftBenchPosition,
  drawWeightedPlayers,
  loadDraftProgress,
  saveDraftProgress,
} from "../features/draft/draftUtils";
import type { DraftProgress } from "../features/draft/draftUtils";
import { useDragDrop, type DragSource, type DropTarget } from "../hooks/useDragDrop";
import { useToast } from "../hooks/useToast";
import { playersData } from "../data/PlayersData";
import { FORMATIONS } from "../utils/formations";
import type { FormationKey } from "../utils/formations";
import {
  canPlayerPlayInPosition,
  hasDuplicatePlayers,
  isPlayerAlreadySelected,
} from "../utils/playerValidation";
import { playSelect } from "../utils/sound";
import type { Player } from "../types/PlayerTypes";
import "./Lineup.css";
import "./DraftLineup.css";

type DraftLineupProps = {
  onReturnToModeSelect: () => void;
};

const playerById = new Map(playersData.map((player) => [player.id, player]));

function resolvePlayer(id: number | null): Player | null {
  return id === null ? null : playerById.get(id) ?? null;
}

function loadInitialDraft(): DraftProgress {
  const progress = loadDraftProgress() ?? createDraftProgress();
  const validPlayerIds = new Set(playersData.map((player) => player.id));
  const normalizeIds = (ids: (number | null)[]) =>
    ids.map((id) => id !== null && validPlayerIds.has(id) ? id : null);
  const activeOptionIds = progress.activePick?.optionIds.filter((id) => validPlayerIds.has(id)) ?? [];

  return {
    ...progress,
    pitchPlayerIds: normalizeIds(progress.pitchPlayerIds),
    benchPlayerIds: normalizeIds(progress.benchPlayerIds),
    activePick: progress.activePick && activeOptionIds.length > 0
      ? { ...progress.activePick, optionIds: activeOptionIds }
      : null,
  };
}

export default function DraftLineup({ onReturnToModeSelect }: DraftLineupProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DraftProgress>(loadInitialDraft);
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);
  const {
    dragSource,
    onDragStart,
    onDragEnd,
    onTouchDragStart,
    onTouchDragMove,
    onTouchDragEnd,
    onTouchDragCancel,
    shouldSuppressClick,
  } = useDragDrop();
  const { toasts, addToast, removeToast } = useToast();

  const formation = draft.formation ? FORMATIONS[draft.formation] : null;
  const slotPositions = useMemo(() => formation?.positions ?? [], [formation]);
  const slotLayout = useMemo(() => formation?.layout ?? [], [formation]);
  const pitchPlayers = useMemo(
    () => draft.pitchPlayerIds.map(resolvePlayer),
    [draft.pitchPlayerIds],
  );
  const benchPlayers = useMemo(
    () => draft.benchPlayerIds.map(resolvePlayer),
    [draft.benchPlayerIds],
  );
  const selectedPlayers = useMemo(
    () => [...pitchPlayers, ...benchPlayers].filter((player): player is Player => player !== null),
    [pitchPlayers, benchPlayers],
  );
  const pitchPlayerCount = pitchPlayers.filter(Boolean).length;
  const benchPlayerCount = benchPlayers.filter(Boolean).length;
  const isTeamComplete =
    pitchPlayers.length === 11 &&
    pitchPlayers.every((player) => player !== null) &&
    benchPlayers.length === DRAFT_BENCH_SIZE &&
    benchPlayers.every((player) => player !== null) &&
    !hasDuplicatePlayers([...pitchPlayers, ...benchPlayers]);

  const activePickOptions = useMemo(
    () => draft.activePick?.optionIds
      .map((id) => playerById.get(id))
      .filter((player): player is Player => player !== undefined) ?? [],
    [draft.activePick],
  );

  useEffect(() => {
    saveDraftProgress(draft);
  }, [draft]);

  const handleFormationSelect = useCallback((selectedFormation: FormationKey) => {
    if (draft.formation || !draft.formationChoices.includes(selectedFormation)) return;
    playSelect(0.5);
    setDraft((current) => ({ ...current, formation: selectedFormation }));
  }, [draft.formation, draft.formationChoices]);

  const openPlayerPick = useCallback((zone: "pitch" | "bench", index: number) => {
    if (!formation || draft.activePick) return;
    const currentPlayer = zone === "pitch" ? pitchPlayers[index] : benchPlayers[index];
    if (currentPlayer) return;

    const unselectedPlayers = playersData.filter(
      (player) => !isPlayerAlreadySelected(player, selectedPlayers),
    );
    const targetPosition = zone === "pitch"
      ? slotPositions[index]
      : drawDraftBenchPosition(slotPositions, unselectedPlayers);

    if (!targetPosition) {
      addToast(zone === "pitch" ? slotPositions[index] : "SUB", "No available players");
      return;
    }

    const availablePlayers = unselectedPlayers.filter((player) =>
      canPlayerPlayInPosition(player, targetPosition),
    );
    const options = drawWeightedPlayers(availablePlayers);

    if (options.length === 0) {
      addToast(zone === "pitch" ? slotPositions[index] : "SUB", "No available players");
      return;
    }

    setDraft((current) => ({
      ...current,
      activePick: {
        zone,
        index,
        targetPosition,
        optionIds: options.map((player) => player.id),
      },
    }));
  }, [
    addToast,
    benchPlayers,
    draft.activePick,
    formation,
    pitchPlayers,
    selectedPlayers,
    slotPositions,
  ]);

  const handlePitchSlotClick = useCallback((index: number) => {
    const player = pitchPlayers[index];
    if (player) {
      setInspectedPlayer(player);
      return;
    }

    openPlayerPick("pitch", index);
  }, [openPlayerPick, pitchPlayers]);

  const handleBenchSlotClick = useCallback((index: number) => {
    const player = benchPlayers[index];
    if (player) {
      setInspectedPlayer(player);
      return;
    }

    openPlayerPick("bench", index);
  }, [benchPlayers, openPlayerPick]);

  const handlePlayerSelect = useCallback((player: Player) => {
    const activePick = draft.activePick;
    if (!activePick || !activePick.optionIds.includes(player.id)) return;
    if (isPlayerAlreadySelected(player, selectedPlayers)) return;

    if (!canPlayerPlayInPosition(player, activePick.targetPosition)) {
      return;
    }

    playSelect(0.5);
    setDraft((current) => {
      if (!current.activePick) return current;

      if (current.activePick.zone === "pitch") {
        const nextPitch = [...current.pitchPlayerIds];
        nextPitch[current.activePick.index] = player.id;
        return { ...current, pitchPlayerIds: nextPitch, activePick: null };
      }

      const nextBench = [...current.benchPlayerIds];
      nextBench[current.activePick.index] = player.id;
      return { ...current, benchPlayerIds: nextBench, activePick: null };
    });
  }, [draft.activePick, selectedPlayers]);

  const handleDropToPitch = useCallback((targetPitchIndex: number, sourceOverride?: DragSource) => {
    const source = sourceOverride ?? dragSource;
    if (!source || !formation) return;
    const newPitch = [...draft.pitchPlayerIds];
    const newBench = [...draft.benchPlayerIds];
    const draggedId = source.zone === "pitch"
      ? newPitch[source.index]
      : newBench[source.index];
    const draggedPlayer = resolvePlayer(draggedId);

    if (!draggedPlayer) {
      onDragEnd();
      return;
    }

    if (!canPlayerPlayInPosition(draggedPlayer, slotPositions[targetPitchIndex])) {
      addToast(draggedPlayer.name, slotPositions[targetPitchIndex]);
      onDragEnd();
      return;
    }

    if (source.zone === "pitch") {
      if (source.index === targetPitchIndex) {
        onDragEnd();
        return;
      }

      const targetId = newPitch[targetPitchIndex];
      const targetPlayer = resolvePlayer(targetId);
      if (targetPlayer && !canPlayerPlayInPosition(targetPlayer, slotPositions[source.index])) {
        addToast(targetPlayer.name, slotPositions[source.index]);
        onDragEnd();
        return;
      }

      newPitch[targetPitchIndex] = draggedId;
      newPitch[source.index] = targetId;
    } else {
      newPitch[targetPitchIndex] = draggedId;
      newBench[source.index] = draft.pitchPlayerIds[targetPitchIndex];
    }

    setDraft((current) => ({
      ...current,
      pitchPlayerIds: newPitch,
      benchPlayerIds: newBench,
    }));
    onDragEnd();
  }, [
    addToast,
    draft.benchPlayerIds,
    draft.pitchPlayerIds,
    dragSource,
    formation,
    onDragEnd,
    slotPositions,
  ]);

  const handleDropToBench = useCallback((targetBenchIndex: number, sourceOverride?: DragSource) => {
    const source = sourceOverride ?? dragSource;
    if (!source || !formation) return;
    const newPitch = [...draft.pitchPlayerIds];
    const newBench = [...draft.benchPlayerIds];
    const draggedId = source.zone === "pitch"
      ? newPitch[source.index]
      : newBench[source.index];
    const draggedPlayer = resolvePlayer(draggedId);

    if (!draggedPlayer) {
      onDragEnd();
      return;
    }

    if (source.zone === "pitch") {
      const targetId = newBench[targetBenchIndex];
      const targetPlayer = resolvePlayer(targetId);
      if (targetPlayer && !canPlayerPlayInPosition(targetPlayer, slotPositions[source.index])) {
        addToast(targetPlayer.name, slotPositions[source.index]);
        onDragEnd();
        return;
      }

      newBench[targetBenchIndex] = draggedId;
      newPitch[source.index] = targetId;
    } else {
      if (source.index === targetBenchIndex) {
        onDragEnd();
        return;
      }

      const targetId = newBench[targetBenchIndex];
      newBench[targetBenchIndex] = draggedId;
      newBench[source.index] = targetId;
    }

    setDraft((current) => ({
      ...current,
      pitchPlayerIds: newPitch,
      benchPlayerIds: newBench,
    }));
    onDragEnd();
  }, [
    addToast,
    draft.benchPlayerIds,
    draft.pitchPlayerIds,
    dragSource,
    formation,
    onDragEnd,
    slotPositions,
  ]);

  const handleTouchDrop = useCallback((target: DropTarget, source: DragSource) => {
    if (target.zone === "pitch") {
      handleDropToPitch(target.index, source);
      return;
    }

    handleDropToBench(target.index, source);
  }, [handleDropToBench, handleDropToPitch]);

  const handleReady = useCallback(() => {
    if (!draft.formation || !isTeamComplete) return;

    localStorage.setItem(
      DRAFT_ACTIVE_SQUAD_STORAGE_KEY,
      JSON.stringify({
        formation: draft.formation,
        pitch: pitchPlayers,
        bench: benchPlayers,
        updatedAt: new Date().toISOString(),
      }),
    );
    playSelect(0.8);
    navigate("/draft-prematch");
  }, [benchPlayers, draft.formation, isTeamComplete, navigate, pitchPlayers]);

  return (
    <div className="lineup draft-lineup">
      <div className="lineup-bg-backdrop" />
      <div className="lineup-bg-effects" />
      <div className="lineup-bg-vignette" />
      <div className="lineup-bg-noise" />
      <div className="lineup__particles" />

      <DraftLineupHeader
        formation={draft.formation}
        onReturn={onReturnToModeSelect}
      />

      <div className="lineup__watermark">
        <img src="/images/ballerstransparent.png" alt="Ballers Logo" />
      </div>

      <section className="lineup__mobile-summary" aria-label="Draft progress">
        <div className="lineup__mobile-summary-copy">
          <span className="lineup__mobile-summary-kicker">Your draft</span>
          <span className="lineup__mobile-summary-hint">Tap an empty slot to draw four players</span>
        </div>
        <div className="lineup__mobile-summary-counts" aria-live="polite">
          <span><strong>{pitchPlayerCount}</strong>/11 XI</span>
          <span><strong>{benchPlayerCount}</strong>/{DRAFT_BENCH_SIZE} SUB</span>
        </div>
      </section>

      {formation && (
        <div className="lineup__pitch" aria-label={`${pitchPlayerCount} of 11 draft players selected`}>
          {pitchPlayers.map((player, index) => (
            <div
              key={`draft-pitch-slot-${index}`}
              className={`player-slot ${dragSource ? "player-slot--droppable" : ""} ${player ? "draft-slot--filled" : "draft-slot--empty"}`}
              data-lineup-drop-zone="pitch"
              data-lineup-drop-index={index}
              style={{
                bottom: slotLayout[index].bottom,
                left: slotLayout[index].left,
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleDropToPitch(index);
              }}
              onClick={() => {
                if (shouldSuppressClick()) return;
                if (!dragSource) handlePitchSlotClick(index);
              }}
            >
              <div
                draggable={Boolean(player)}
                onDragStart={(event) => {
                  if (player) onDragStart({ zone: "pitch", index });
                  else event.preventDefault();
                }}
                onDragEnd={onDragEnd}
                onTouchStart={(event) => {
                  if (player) onTouchDragStart({ zone: "pitch", index }, event);
                }}
                onTouchMove={onTouchDragMove}
                onTouchEnd={(event) => onTouchDragEnd(event, handleTouchDrop)}
                onTouchCancel={onTouchDragCancel}
                className="draggable-wrapper"
                style={{ width: "100%", height: "100%", touchAction: player ? "none" : "manipulation" }}
              >
                {player ? (
                  <LineupCard player={player} assignedPosition={slotPositions[index]} />
                ) : (
                  <div className="player-slot__empty">
                    <img
                      src="/images/cards/emptycard.png"
                      alt="Empty Slot"
                      className="empty-card-img"
                      decoding="async"
                      draggable={false}
                      loading="lazy"
                    />
                    <span className="slot-pos-label">{slotPositions[index]}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {formation && (
        <Bench
          benchPlayers={benchPlayers}
          dragSource={dragSource}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onTouchDragStart={onTouchDragStart}
          onTouchDragMove={onTouchDragMove}
          onTouchDragEnd={onTouchDragEnd}
          onTouchDragCancel={onTouchDragCancel}
          onTouchDrop={handleTouchDrop}
          onDropToBench={handleDropToBench}
          onBenchSlotClick={(index) => {
            if (shouldSuppressClick()) return;
            if (!dragSource) handleBenchSlotClick(index);
          }}
        />
      )}

      {formation && (
        <div className="lineup__actions-sidebar draft-lineup__actions">
          <FeatureButton
            label={isTeamComplete ? "READY!" : "COMPLETE YOUR DRAFT"}
            variant={isTeamComplete ? "playMatch" : "less"}
            disabled={!isTeamComplete}
            animated={isTeamComplete}
            onClick={handleReady}
          />
        </div>
      )}

      {!draft.formation && (
        <DraftFormationModal
          choices={draft.formationChoices}
          onSelect={handleFormationSelect}
        />
      )}

      {draft.activePick && (
        <DraftPlayerPickModal
          options={activePickOptions}
          slotPosition={draft.activePick.targetPosition}
          isBench={draft.activePick.zone === "bench"}
          onSelect={handlePlayerSelect}
        />
      )}

      {inspectedPlayer && (
        <DraftPlayerModal
          player={inspectedPlayer}
          onClose={() => setInspectedPlayer(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

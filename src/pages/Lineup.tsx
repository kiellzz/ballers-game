import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LineupHeader from '../components/lineup/LineupHeader';
import LineupCard from '../components/lineup/LineupCard';
import LineupModal from '../components/lineup/LineupModal';
import PlayerSearchModal from '../components/lineup/PlayerSearchModal';
import ToastContainer from '../components/toast/ToastContainer';
import Bench from '../components/lineup/Bench';
import FeatureButton from '../components/feature-button/FeatureButton';
import { useToast } from '../hooks/useToast';
import { useDragDrop, type DragSource, type DropTarget } from '../hooks/useDragDrop';
import { useSquad } from '../hooks/useSquad';
import { useCustomPlayers } from '../hooks/useCustomPlayers';
import { playersData } from '../data/PlayersData';
import {
  canPlayerPlayInPosition,
  findDuplicatePlayer,
  isPlayerAlreadySelected,
} from '../utils/playerValidation';
import { FORMATIONS, DEFAULT_FORMATION } from '../utils/formations';
import type { FormationKey } from '../utils/formations';
import type { Player } from '../types/PlayerTypes';
import type { FilterState } from '../types/FilterTypes';
import './Lineup.css';

const BENCH_SIZE = 5;

const INITIAL_FILTERS: FilterState = {
  overallMin: 1,
  overallMax: 99,
  tiers: [],
  positions: [],
  nationalities: [],
  onlyFavorites: false,
};

type ActiveSlot =
  | { zone: 'pitch'; index: number }
  | { zone: 'bench'; index: number }
  | null;

type SavedLineup = {
  formation?: FormationKey;
  pitch?: (Player | null)[];
  bench?: (Player | null)[];
};

const loadSavedLineup = (): SavedLineup => {
  try {
    const savedData = localStorage.getItem('ballers_saved_progress');
    if (!savedData) return {};

    const parsed = JSON.parse(savedData) as SavedLineup;
    return {
      formation: parsed.formation && parsed.formation in FORMATIONS
        ? parsed.formation
        : undefined,
      pitch: Array.isArray(parsed.pitch) ? parsed.pitch : undefined,
      bench: Array.isArray(parsed.bench) ? parsed.bench : undefined,
    };
  } catch {
    return {};
  }
};

export default function Lineup() {
  const navigate = useNavigate();
  const [savedLineup] = useState(loadSavedLineup);
  const [currentFormation, setCurrentFormation] = useState<FormationKey>(
    savedLineup.formation ?? DEFAULT_FORMATION
  );
  const [pitchPlayers, setPitchPlayers] = useState<(Player | null)[]>(
    savedLineup.pitch ?? Array(11).fill(null)
  );
  const [benchPlayers, setBenchPlayers] = useState<(Player | null)[]>(
    savedLineup.bench ?? Array(BENCH_SIZE).fill(null)
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);

  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const { toasts, addToast, removeToast } = useToast();
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
  const { customPlayers } = useCustomPlayers();

  const { isTeamComplete, saveProgress, saveAndPlay } = useSquad(pitchPlayers, benchPlayers);

  const formation = FORMATIONS[currentFormation];
  const slotPositions = formation.positions;
  const slotLayout = formation.layout;

  const occupiedSlots = [
    ...pitchPlayers
      .map((player, index) => player ? { zone: 'pitch' as const, index, player } : null)
      .filter((slot): slot is { zone: 'pitch'; index: number; player: Player } => slot !== null),
    ...benchPlayers
      .map((player, index) => player ? { zone: 'bench' as const, index, player } : null)
      .filter((slot): slot is { zone: 'bench'; index: number; player: Player } => slot !== null),
  ];

  const occupiedPlayers = occupiedSlots.map(slot => slot.player);
  const pitchPlayerCount = pitchPlayers.filter(Boolean).length;
  const benchPlayerCount = benchPlayers.filter(Boolean).length;
  const duplicatePlayer = findDuplicatePlayer(occupiedPlayers);
  const blockedPlayersForActiveSlot = occupiedSlots
    .filter(slot => !activeSlot || slot.zone !== activeSlot.zone || slot.index !== activeSlot.index)
    .map(slot => slot.player);

  const handleSaveProgress = () => {
    if (duplicatePlayer) {
      addToast(duplicatePlayer.name, '__duplicate__');
      return;
    }

    if (saveProgress(pitchPlayers, benchPlayers, currentFormation)) {
      addToast("Squad", "Progress Saved", "success");
    }
  };

  const handlePlayMatch = () => {
    if (duplicatePlayer) {
      addToast(duplicatePlayer.name, '__duplicate__');
      return;
    }

    const success = saveAndPlay(pitchPlayers, benchPlayers, currentFormation);
    if (success) {
      saveProgress(pitchPlayers, benchPlayers, currentFormation);
      addToast("Match", "Ready", "success", true);
      navigate('/PreMatch');
    }
  };

  const handleRemoveBenchPlayer = (index: number) => {
    const newBench = [...benchPlayers];
    newBench[index] = null;
    setBenchPlayers(newBench);
  };

  const handleRemovePitchPlayer = (index: number) => {
    const newPitch = [...pitchPlayers];
    newPitch[index] = null;
    setPitchPlayers(newPitch);
  };

  const handleRemovePlayer = () => {
    if (!activeSlot) return;
    if (activeSlot.zone === 'pitch') {
      const next = [...pitchPlayers];
      next[activeSlot.index] = null;
      setPitchPlayers(next);
    } else {
      handleRemoveBenchPlayer(activeSlot.index);
    }
    setIsLineupModalOpen(false);
  };

  const handleResetSquad = () => {
    setPitchPlayers(Array(11).fill(null));
    setBenchPlayers(Array(BENCH_SIZE).fill(null));
    setCurrentFormation(DEFAULT_FORMATION);
    addToast("Squad", "Squad reset", "success");
  };

  const handleRandomFill = () => {
    const selectedPlayers = [...occupiedPlayers];
    const allAvailablePlayers = [...customPlayers, ...playersData]
      .filter(p => !isPlayerAlreadySelected(p, selectedPlayers))
      .sort(() => Math.random() - 0.5);

    const newPitch = [...pitchPlayers];
    const newBench = [...benchPlayers];

    for (let i = 0; i < slotPositions.length; i++) {
      if (newPitch[i] === null) {
        const position = slotPositions[i];
        const availableForPosition = allAvailablePlayers.filter(
          p => !isPlayerAlreadySelected(p, selectedPlayers) && canPlayerPlayInPosition(p, position)
        );
        if (availableForPosition.length > 0) {
          const randomPlayer = availableForPosition[Math.floor(Math.random() * availableForPosition.length)];
          newPitch[i] = randomPlayer;
          selectedPlayers.push(randomPlayer);
        }
      }
    }

    for (let i = 0; i < BENCH_SIZE; i++) {
      if (newBench[i] === null) {
        const remainingPlayers = allAvailablePlayers.filter(p => !isPlayerAlreadySelected(p, selectedPlayers));
        if (remainingPlayers.length > 0) {
          const randomPlayer = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];
          newBench[i] = randomPlayer;
          selectedPlayers.push(randomPlayer);
        }
      }
    }

    setPitchPlayers(newPitch);
    setBenchPlayers(newBench);
    addToast("Random Fill", "__randomfill__", "success");
  };

  const handleDropToPitch = (targetPitchIndex: number, sourceOverride?: DragSource) => {
    const source = sourceOverride ?? dragSource;
    if (!source) return;
    const targetPos = slotPositions[targetPitchIndex];
    const newPitch = [...pitchPlayers];
    const newBench = [...benchPlayers];
    const draggedPlayer = source.zone === 'pitch' ? newPitch[source.index] : newBench[source.index];

    if (!draggedPlayer) { onDragEnd(); return; }
    if (!canPlayerPlayInPosition(draggedPlayer, targetPos)) {
      addToast(draggedPlayer.name, targetPos);
      onDragEnd();
      return;
    }
    if (source.zone === 'pitch') {
      const srcIndex = source.index;
      if (srcIndex === targetPitchIndex) { onDragEnd(); return; }
      const targetPlayer = newPitch[targetPitchIndex];
      if (targetPlayer && !canPlayerPlayInPosition(targetPlayer, slotPositions[srcIndex])) {
        addToast(targetPlayer.name, slotPositions[srcIndex]);
        onDragEnd();
        return;
      }
      newPitch[targetPitchIndex] = draggedPlayer;
      newPitch[srcIndex] = targetPlayer;
    } else {
      newPitch[targetPitchIndex] = draggedPlayer;
      newBench[source.index] = pitchPlayers[targetPitchIndex];
    }
    setPitchPlayers(newPitch);
    setBenchPlayers(newBench);
    onDragEnd();
  };

  const handleDropToBench = (targetBenchIndex: number, sourceOverride?: DragSource) => {
    const source = sourceOverride ?? dragSource;
    if (!source) return;
    const newPitch = [...pitchPlayers];
    const newBench = [...benchPlayers];
    const draggedPlayer = source.zone === 'pitch' ? newPitch[source.index] : newBench[source.index];
    if (!draggedPlayer) { onDragEnd(); return; }

    if (source.zone === 'pitch') {
      const targetBenchPlayer = newBench[targetBenchIndex];
      if (targetBenchPlayer && !canPlayerPlayInPosition(targetBenchPlayer, slotPositions[source.index])) {
        addToast(targetBenchPlayer.name, slotPositions[source.index]);
        onDragEnd();
        return;
      }
      newBench[targetBenchIndex] = draggedPlayer;
      newPitch[source.index] = targetBenchPlayer;
    } else {
      const srcIndex = source.index;
      if (srcIndex === targetBenchIndex) { onDragEnd(); return; }
      const targetBenchPlayer = newBench[targetBenchIndex];
      newBench[srcIndex] = targetBenchPlayer;
      newBench[targetBenchIndex] = draggedPlayer;
    }
    setPitchPlayers(newPitch);
    setBenchPlayers(newBench);
    onDragEnd();
  };

  const handleTouchDrop = (target: DropTarget, source: DragSource) => {
    if (target.zone === 'pitch') {
      handleDropToPitch(target.index, source);
      return;
    }

    handleDropToBench(target.index, source);
  };

  const handleFormationChange = (newFormation: FormationKey) => {
    const newPositions = FORMATIONS[newFormation].positions;
    const newPitch: (Player | null)[] = Array(11).fill(null);
    const availablePlayers = pitchPlayers.filter((p): p is Player => p !== null);
    const usedPlayers: Player[] = [];

    newPositions.forEach((pos, slotIndex) => {
      const match = availablePlayers.find(
        p => !isPlayerAlreadySelected(p, usedPlayers) && canPlayerPlayInPosition(p, pos)
      );
      if (match) {
        newPitch[slotIndex] = match;
        usedPlayers.push(match);
      }
    });

    const removedPlayers = availablePlayers.filter(
      p => !usedPlayers.some(usedPlayer => usedPlayer.id === p.id)
    );
    const newBench = [...benchPlayers];
    const selectedPlayers = [
      ...newPitch.filter((p): p is Player => p !== null),
      ...newBench.filter((p): p is Player => p !== null),
    ];

    removedPlayers.forEach(p => {
      if (isPlayerAlreadySelected(p, selectedPlayers)) {
        addToast(p.name, '__duplicate__');
        return;
      }

      const emptyIdx = newBench.findIndex(b => b === null);
      if (emptyIdx !== -1) {
        newBench[emptyIdx] = p;
        selectedPlayers.push(p);
      }
      addToast(p.name, p.position);
    });

    setCurrentFormation(newFormation);
    setPitchPlayers(newPitch);
    setBenchPlayers(newBench);
  };

  const handlePitchSlotClick = (index: number) => {
    setActiveSlot({ zone: 'pitch', index });
    if (pitchPlayers[index]) setIsLineupModalOpen(true);
    else setIsModalOpen(true);
  };

  const handleBenchSlotClick = (index: number) => {
    setActiveSlot({ zone: 'bench', index });
    if (benchPlayers[index]) setIsLineupModalOpen(true);
    else setIsModalOpen(true);
  };

  const handlePlayerSelect = (player: Player) => {
    if (!activeSlot) return;

    if (isPlayerAlreadySelected(player, blockedPlayersForActiveSlot)) {
      addToast(player.name, '__duplicate__');
      return;
    }

    if (activeSlot.zone === 'pitch') {
      const slotPos = slotPositions[activeSlot.index];
      if (canPlayerPlayInPosition(player, slotPos)) {
        const next = [...pitchPlayers];
        next[activeSlot.index] = player;
        setPitchPlayers(next);
        setIsModalOpen(false);
      } else {
        addToast(player.name, slotPos);
      }
    } else {
      const next = [...benchPlayers];
      next[activeSlot.index] = player;
      setBenchPlayers(next);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="lineup">
      <div className="lineup-bg-backdrop" />
      <div className="lineup-bg-effects" />
      <div className="lineup-bg-vignette" />
      <div className="lineup-bg-noise" />
      <div className="lineup__particles" />
      <LineupHeader
        currentFormation={currentFormation}
        onFormationChange={handleFormationChange}
      />

      <div className="lineup__watermark">
        <img src="/images/ballerstransparent.png" alt="Ballers Logo" />
      </div>

      <section className="lineup__mobile-summary" aria-label="Squad progress">
        <div className="lineup__mobile-summary-copy">
          <span className="lineup__mobile-summary-kicker">Your squad</span>
          <span className="lineup__mobile-summary-hint">Tap a slot to add or change a player</span>
        </div>
        <div className="lineup__mobile-summary-counts" aria-live="polite">
          <span><strong>{pitchPlayerCount}</strong>/11 XI</span>
          <span><strong>{benchPlayerCount}</strong>/{BENCH_SIZE} SUB</span>
        </div>
      </section>

      <div className="lineup__pitch" aria-label={`${pitchPlayerCount} of 11 starting players selected`}>
        {pitchPlayers.map((player, index) => (
          <div
            key={`pitch-slot-${index}`}
            className={`player-slot ${dragSource ? 'player-slot--droppable' : ''}`}
            data-lineup-drop-zone="pitch"
            data-lineup-drop-index={index}
            style={{
              bottom: slotLayout[index].bottom,
              left: slotLayout[index].left,
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleDropToPitch(index); }}
            onClick={() => {
              if (shouldSuppressClick()) return;
              if (!dragSource) handlePitchSlotClick(index);
            }}
          >
            <div
              draggable={!!player}
              onDragStart={(e) => { if (player) onDragStart({ zone: 'pitch', index }); else e.preventDefault(); }}
              onDragEnd={onDragEnd}
              onTouchStart={(event) => {
                if (player) onTouchDragStart({ zone: 'pitch', index }, event);
              }}
              onTouchMove={onTouchDragMove}
              onTouchEnd={(event) => onTouchDragEnd(event, handleTouchDrop)}
              onTouchCancel={onTouchDragCancel}
              className="draggable-wrapper"
              style={{ width: '100%', height: '100%', touchAction: player ? 'none' : 'manipulation' }}
            >
              {player ? (
                <LineupCard 
                  player={player} 
                  assignedPosition={slotPositions[index]}
                  onRemovePlayer={() => handleRemovePitchPlayer(index)}
                />
              ) : (
                <div className="player-slot__empty">
                  <img src="/images/cards/emptycard.png" alt="Empty Slot" className="empty-card-img" />
                  <span className="slot-pos-label">{slotPositions[index]}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
        onRemoveBenchPlayer={handleRemoveBenchPlayer}
      />

      {(() => {
        const isSquadFull = 
          pitchPlayers.every((p): p is Player => p !== null) && 
          benchPlayers.every((p): p is Player => p !== null);

        return (
          <div className="lineup__actions-sidebar">
            <FeatureButton
              label="RANDOM FILL"
              variant="random"
              disabled={isSquadFull}
              onClick={handleRandomFill}
            />
            <FeatureButton
              label="SAVE SQUAD"
              variant="save"
              onClick={handleSaveProgress}
            />
            <FeatureButton
              label="RESET SQUAD"
              variant="danger"
              onClick={handleResetSquad}
            />
            <FeatureButton
              label={isTeamComplete ? 'READY!' : 'FILL YOUR SQUAD TO PLAY'}
              variant={isTeamComplete ? 'playMatch' : 'less'}
              disabled={!isTeamComplete}
              animated={isTeamComplete}
              onClick={handlePlayMatch}
            />
          </div>
        );
      })()}

      {isLineupModalOpen && activeSlot && (
        <LineupModal
          player={activeSlot.zone === 'pitch' ? pitchPlayers[activeSlot.index]! : benchPlayers[activeSlot.index]!}
          position={activeSlot.zone === 'pitch' ? slotPositions[activeSlot.index] : 'SUB'}
          onClose={() => setIsLineupModalOpen(false)}
          onRemove={handleRemovePlayer}
          onReplace={() => { setIsLineupModalOpen(false); setIsModalOpen(true); }}
        />
      )}

      {isModalOpen && activeSlot !== null && (
        <PlayerSearchModal
          slotPosition={activeSlot.zone === 'pitch' ? slotPositions[activeSlot.index] : 'GK'}
          freePosition={activeSlot.zone === 'bench'}
          onClose={() => setIsModalOpen(false)}
          onSelect={handlePlayerSelect}
          excludedPlayers={blockedPlayersForActiveSlot}
          filters={filters}
          setFilters={setFilters}
          customPlayers={customPlayers}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

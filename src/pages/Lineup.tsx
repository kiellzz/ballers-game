import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LineupHeader from '../components/lineup/LineupHeader';
import LineupCard from '../components/lineup/LineupCard';
import LineupModal from '../components/lineup/LineupModal';
import PlayerSearchModal from '../components/lineup/PlayerSearchModal';
import ToastContainer from '../components/toast/ToastContainer';
import Bench from '../components/lineup/Bench';
import FeatureButton from '../components/feature-button/FeatureButton';
import { useToast } from '../hooks/useToast';
import { useDragDrop } from '../hooks/useDragDrop';
import { useSquad } from '../hooks/useSquad';
import { useCustomPlayers } from '../hooks/useCustomPlayers';
import { playersData } from '../data/PlayersData';
import { canPlayerPlayInPosition } from '../utils/playerValidation';
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

export default function Lineup() {
  const navigate = useNavigate();
  const [currentFormation, setCurrentFormation] = useState<FormationKey>(DEFAULT_FORMATION);
  const [pitchPlayers, setPitchPlayers] = useState<(Player | null)[]>(Array(11).fill(null));
  const [benchPlayers, setBenchPlayers] = useState<(Player | null)[]>(Array(BENCH_SIZE).fill(null));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);

  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const { toasts, addToast, removeToast } = useToast();
  const { dragSource, onDragStart, onDragEnd } = useDragDrop();
  const { customPlayers } = useCustomPlayers();

  useEffect(() => {
    const savedData = localStorage.getItem('ballers_saved_progress');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.pitch) setPitchPlayers(parsed.pitch);
        if (parsed.bench) setBenchPlayers(parsed.bench);
        if (parsed.formation) setCurrentFormation(parsed.formation);
      } catch (err) {
      }
    }
  }, []);

  const { isTeamComplete, saveProgress, saveAndPlay } = useSquad(pitchPlayers, benchPlayers);

  const formation = FORMATIONS[currentFormation];
  const slotPositions = formation.positions;
  const slotLayout = formation.layout;

  const occupiedPlayerIds = [
    ...pitchPlayers.filter((p): p is Player => p !== null),
    ...benchPlayers.filter((p): p is Player => p !== null),
  ].map(p => p.id);

  const handleSaveProgress = () => {
    if (saveProgress(pitchPlayers, benchPlayers, currentFormation)) {
      addToast("Squad", "Progress Saved", "success");
    }
  };

  const handlePlayMatch = () => {
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
    const allAvailablePlayers = [...customPlayers, ...playersData]
      .filter(p => !occupiedPlayerIds.includes(p.id))
      .sort(() => Math.random() - 0.5);

    const newPitch = [...pitchPlayers];
    const newBench = [...benchPlayers];
    const usedIds = new Set(occupiedPlayerIds);

    for (let i = 0; i < slotPositions.length; i++) {
      if (newPitch[i] === null) {
        const position = slotPositions[i];
        const availableForPosition = allAvailablePlayers.filter(
          p => !usedIds.has(p.id) && canPlayerPlayInPosition(p, position)
        );
        if (availableForPosition.length > 0) {
          const randomPlayer = availableForPosition[Math.floor(Math.random() * availableForPosition.length)];
          newPitch[i] = randomPlayer;
          usedIds.add(randomPlayer.id);
        }
      }
    }

    for (let i = 0; i < BENCH_SIZE; i++) {
      if (newBench[i] === null) {
        const remainingPlayers = allAvailablePlayers.filter(p => !usedIds.has(p.id));
        if (remainingPlayers.length > 0) {
          const randomPlayer = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];
          newBench[i] = randomPlayer;
          usedIds.add(randomPlayer.id);
        }
      }
    }

    setPitchPlayers(newPitch);
    setBenchPlayers(newBench);
    addToast("Random Fill", "__randomfill__", "success");
  };

  const handleDropToPitch = (targetPitchIndex: number) => {
    if (!dragSource) return;
    const targetPos = slotPositions[targetPitchIndex];
    const newPitch = [...pitchPlayers];
    const newBench = [...benchPlayers];
    const draggedPlayer = dragSource.zone === 'pitch' ? newPitch[dragSource.index] : newBench[dragSource.index];

    if (!draggedPlayer) { onDragEnd(); return; }
    if (!canPlayerPlayInPosition(draggedPlayer, targetPos)) {
      addToast(draggedPlayer.name, targetPos);
      onDragEnd();
      return;
    }
    if (dragSource.zone === 'pitch') {
      const srcIndex = dragSource.index;
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
      newBench[dragSource.index] = pitchPlayers[targetPitchIndex];
    }
    setPitchPlayers(newPitch);
    setBenchPlayers(newBench);
    onDragEnd();
  };

  const handleDropToBench = (targetBenchIndex: number) => {
    if (!dragSource) return;
    const newPitch = [...pitchPlayers];
    const newBench = [...benchPlayers];
    const draggedPlayer = dragSource.zone === 'pitch' ? newPitch[dragSource.index] : newBench[dragSource.index];
    if (!draggedPlayer) { onDragEnd(); return; }

    if (dragSource.zone === 'pitch') {
      const targetBenchPlayer = newBench[targetBenchIndex];
      if (targetBenchPlayer && !canPlayerPlayInPosition(targetBenchPlayer, slotPositions[dragSource.index])) {
        addToast(targetBenchPlayer.name, slotPositions[dragSource.index]);
        onDragEnd();
        return;
      }
      newBench[targetBenchIndex] = draggedPlayer;
      newPitch[dragSource.index] = targetBenchPlayer;
    } else {
      const srcIndex = dragSource.index;
      if (srcIndex === targetBenchIndex) { onDragEnd(); return; }
      const targetBenchPlayer = newBench[targetBenchIndex];
      newBench[srcIndex] = targetBenchPlayer;
      newBench[targetBenchIndex] = draggedPlayer;
    }
    setPitchPlayers(newPitch);
    setBenchPlayers(newBench);
    onDragEnd();
  };

  const handleFormationChange = (newFormation: FormationKey) => {
    const newPositions = FORMATIONS[newFormation].positions;
    const newPitch: (Player | null)[] = Array(11).fill(null);
    const availablePlayers = pitchPlayers.filter((p): p is Player => p !== null);
    const usedIds = new Set<number>();

    newPositions.forEach((pos, slotIndex) => {
      const match = availablePlayers.find(p => !usedIds.has(p.id) && canPlayerPlayInPosition(p, pos));
      if (match) {
        newPitch[slotIndex] = match;
        usedIds.add(match.id);
      }
    });

    const removedPlayers = availablePlayers.filter(p => !usedIds.has(p.id));
    const newBench = [...benchPlayers];
    removedPlayers.forEach(p => {
      const emptyIdx = newBench.findIndex(b => b === null);
      if (emptyIdx !== -1) newBench[emptyIdx] = p;
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

      <div className="lineup__pitch">
        {pitchPlayers.map((player, index) => (
          <div
            key={`pitch-slot-${index}`}
            className={`player-slot ${dragSource ? 'player-slot--droppable' : ''}`}
            style={{
              bottom: slotLayout[index].bottom,
              left: slotLayout[index].left,
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleDropToPitch(index); }}
            onClick={() => !dragSource && handlePitchSlotClick(index)}
          >
            <div
              draggable={!!player}
              onDragStart={(e) => { if (player) onDragStart({ zone: 'pitch', index }); else e.preventDefault(); }}
              onDragEnd={onDragEnd}
              className="draggable-wrapper"
              style={{ width: '100%', height: '100%' }}
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
        onDropToBench={handleDropToBench}
        onBenchSlotClick={handleBenchSlotClick}
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
          excludePlayerIds={occupiedPlayerIds}
          filters={filters}
          setFilters={setFilters}
          customPlayers={customPlayers}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

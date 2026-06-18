import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Player } from '../types/PlayerTypes';
import { FORMATIONS } from '../utils/formations';
import type { FormationKey } from '../utils/formations';
import { MOCK_OPPONENTS, generateOpponents } from '../opponents/opponents';
import type { OpponentTeam } from '../opponents/opponents';
import { getFlagUrl } from '../utils/getFlagUrl';
import { OpponentLineup } from '../components/prematch/OpponentLineup';
import PreMatchHeader from '../components/prematch/PreMatchHeader';
import { playButton, playConfirm } from '../utils/sound';
import './PreMatch.css';

interface SavedSquad {
  pitch: (Player | null)[];
  bench: (Player | null)[];
  formation: FormationKey;
}

function readSavedSquad(): SavedSquad | null {
  const saved = localStorage.getItem('ballers_active_squad');
  if (!saved) return null;

  try {
    return JSON.parse(saved) as SavedSquad;
  } catch (error) {
    console.error('Erro ao carregar squad:', error);
    return null;
  }
}

export default function PreMatch() {
  const navigate = useNavigate();
  const [mySquad] = useState<SavedSquad | null>(readSavedSquad);
  const [opponents, setOpponents] = useState<OpponentTeam[]>(MOCK_OPPONENTS);
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentTeam | null>(null);
  const [rerollKey, setRerollKey] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mySquad) {
      navigate('/lineup');
    }
  }, [mySquad, navigate]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const teamRating = useMemo(() => {
    if (!mySquad || !mySquad.pitch) return 0;
    const total = mySquad.pitch.reduce(
      (acc: number, p: Player | null) => acc + (p?.overall || 0),
      0
    );
    return Math.floor(total / 11);
  }, [mySquad]);

  const handleReroll = useCallback(() => {
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    setIsSpinning(true);
    setSelectedOpponent(null);
    setOpponents(generateOpponents());
    setRerollKey((k) => k + 1);

    spinTimeoutRef.current = setTimeout(() => setIsSpinning(false), 600);
  }, []);

  const handleStartMatch = useCallback(() => {
    if (!selectedOpponent || !mySquad) return;

    navigate('/match', {
      state: {
        opponent: selectedOpponent,
        userSquad: mySquad,
      },
    });
  }, [mySquad, navigate, selectedOpponent]);

  const handleCloseOpponent = useCallback(() => {
    setSelectedOpponent(null);
  }, []);

  const handleSelectOpponent = useCallback((opponent: OpponentTeam) => {
    void playConfirm();
    setSelectedOpponent(opponent);
  }, []);

  if (!mySquad) return <div className="prematch-loading">Loading squad...</div>;

  const formationConfig = FORMATIONS[mySquad.formation];

  return (
    <div className="prematch-container">
      <PreMatchHeader />

      <aside className="prematch-sidebar">
        <div className="prematch-sidebar__glow"></div>

        <div className="prematch-sidebar__header">
          <h2 className="prematch-sidebar__title">Your Squad</h2>
          <span className="prematch-sidebar__formation">{mySquad.formation}</span>
        </div>

        <div className="prematch-squad-list">
          {mySquad.pitch.map((player: Player | null, index: number) => {
            if (!player) return null;
            const position = formationConfig.positions[index];

            return (
              <div
                key={`pitch-${index}`}
                className="squad-list-item"
                data-testid={`squad-player-${index}`}
              >
                <span className="squad-list-pos">{position}</span>
                <span className="squad-list-name">{player.name}</span>
                <div className="squad-list-stats">
                  <span className="squad-list-ovr">{player.overall}</span>
                  <img
                    src={getFlagUrl(player.nationality)}
                    alt={player.nationality}
                    className="squad-list-flag"
                    title={player.nationality}
                    onError={(e) => {
                      e.currentTarget.src = 'https://flagcdn.com/24x18/un.png';
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="prematch-team-rating" data-testid="team-overall-rating">
          <div className="rating-icon-wrapper">
            <svg className="rating-star-prematch" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            <div className="rating-star-glow-prematch"></div>
          </div>
          <span className="rating-value">{teamRating} OVR</span>
        </div>
      </aside>

      <main className="prematch-main">
        <div className="prematch-main__overlay"></div>
        <div className="prematch-main__vignette"></div>

        <div className="prematch-main__content">
          <div className="prematch-header-wrapper">
            <p className="prematch-eyebrow">
              <span className="eyebrow-dot"></span>
              Choose your rival
              <span className="eyebrow-dot"></span>
            </p>
            <h1 className="prematch-header">
              Select Your
              <br />
              <span className="prematch-header--accent">Opponent</span>
            </h1>
          </div>

          <div className="prematch-reroll-wrapper">
            <button
              className={`btn-reroll${isSpinning ? ' is-spinning' : ''}`}
              onMouseEnter={() => playButton()}
              onClick={() => {
                void playConfirm();
                handleReroll();
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 4v6h6M23 20v-6h-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Reroll Teams
            </button>
          </div>

          <div className="opponent-list">
            {opponents.map((opp: OpponentTeam, idx: number) => {
              const isSelected = selectedOpponent?.id === opp.id;

              return (
                <button
                  key={`${rerollKey}-${opp.id}`}
                  className={`btn-opponent reroll-enter${
                    isSelected ? ' btn-opponent--selected' : ''
                  }`}
                  onMouseEnter={() => playButton()}
                  onClick={() => handleSelectOpponent(opp)}
                  data-testid={`opponent-button-${idx}`}
                  style={{ '--animation-delay': `${idx * 0.08}s` } as React.CSSProperties}
                >
                  <div className="btn-opponent__glow"></div>
                  <div className="btn-opponent__shine"></div>

                  <span className="btn-opponent__left">
                    <span className="btn-opponent__indicator">
                      <span className="indicator-pulse"></span>
                    </span>
                    <span className="btn-opponent__name">{opp.name}</span>
                  </span>

                  <span className="btn-opponent__right">
                    <span className="btn-opponent__arrow">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5 12H19M19 12L12 5M19 12L12 19"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {selectedOpponent && (
        <OpponentLineup
          opponent={selectedOpponent}
          onClose={handleCloseOpponent}
          onStart={handleStartMatch}
        />
      )}
    </div>
  );
}

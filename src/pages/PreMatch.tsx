import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Player } from '../types/PlayerTypes';
import { FORMATIONS } from '../utils/formations';
import type { FormationKey } from '../utils/formations';
import { MOCK_OPPONENTS } from '../opponents/opponents';
import type { OpponentTeam } from '../opponents/opponents';
import { getFlagUrl } from '../utils/getFlagUrl';
import { OpponentLineup } from '../components/prematch/OpponentLineup';
import PreMatchHeader from '../components/prematch/PreMatchHeader';
import './PreMatch.css';

interface SavedSquad {
  pitch: (Player | null)[];
  bench: (Player | null)[];
  formation: FormationKey;
}

export default function PreMatch() {
  const navigate = useNavigate();
  const [mySquad, setMySquad] = useState<SavedSquad | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentTeam | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ballers_active_squad');
    if (saved) {
      try {
        setMySquad(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar squad:", e);
        navigate('/lineup');
      }
    } else {
      navigate('/lineup');
    }
  }, [navigate]);

  const teamRating = useMemo(() => {
    if (!mySquad || !mySquad.pitch) return 0;
    const total = mySquad.pitch.reduce((acc: number, p: Player | null) => acc + (p?.overall || 0), 0);
    return Math.floor(total / 11);
  }, [mySquad]);

  const handleStartMatch = () => {
    if (!selectedOpponent || !mySquad) return;

    console.log("Iniciando partida contra:", selectedOpponent.name);

    navigate('/match', {
      state: {
        opponent: selectedOpponent,
        userSquad: mySquad
      }
    });
  };

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
            <svg className="rating-star" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            <div className="rating-star-glow"></div>
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

          <div className="opponent-list">
            {MOCK_OPPONENTS.map((opp: OpponentTeam, idx: number) => {
              const isSelected = selectedOpponent?.id === opp.id;

              return (
                <button
                  key={opp.id}
                  className={`btn-opponent ${isSelected ? 'btn-opponent--selected' : ''}`}
                  onClick={() => setSelectedOpponent(opp)}
                  data-testid={`opponent-button-${idx}`}
                  style={{ '--animation-delay': `${idx * 0.1}s` } as React.CSSProperties}
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
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
          onClose={() => setSelectedOpponent(null)}
          onStart={handleStartMatch}
        />
      )}
    </div>
  );
}
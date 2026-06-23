import React, { memo } from 'react';
import type { OpponentTeam } from '../../opponents/opponents';
import { getFlagUrl } from '../../utils/getFlagUrl';
import { playStartMatch } from '../../utils/sound';
import './OpponentLineup.css';

interface OpponentLineupProps {
  opponent: OpponentTeam;
  onStart: () => void;
  onClose: () => void;
  tag?: string;
  startLabel?: string;
}

type PosGroup = 'gk' | 'def' | 'mid' | 'att';

function getPosGroup(position: string): PosGroup {
  if (position === 'GK') return 'gk';
  if (['CB', 'RB', 'LB'].includes(position)) return 'def';
  if (['CM', 'CDM', 'CAM', 'RM', 'LM'].includes(position)) return 'mid';
  return 'att';
}

export const OpponentLineup: React.FC<OpponentLineupProps> = memo(({
  opponent,
  onStart,
  onClose,
  tag = 'Opponent Found',
  startLabel = 'Start Match',
}) => {
  const averageOvr = Math.round(
    opponent.players.reduce((acc, p) => acc + p.overall, 0) / opponent.players.length
  );

  return (
    <div className="opp-overlay" onClick={onClose}>
      <div className="opp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="opp-modal__glow" />

        <div className="opp-modal__header">
          <button className="opp-modal__close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
          <span className="opp-modal__tag">{tag}</span>
          <h2 className="opp-modal__name">{opponent.name}</h2>
          <div className="opp-modal__stats">
            <div className="opp-stat-badge">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="#fbbf24">
                <polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9.2,11 6,9.2 2.8,11 3.5,7.5 1,5 4.5,4.5" />
              </svg>
              {averageOvr} OVR
            </div>
            <div className="opp-stat-badge">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
              >
                <rect x="1" y="2" width="10" height="8" rx="1" />
                <line x1="1" y1="5" x2="11" y2="5" />
              </svg>
              {opponent.formation}
            </div>
          </div>
        </div>

        <div className="opp-modal__body">
          <div className="opp-lineup-scroll">
            <div className="opp-lineup-section">
              <p className="opp-lineup-section__title">Starting XI</p>
              {opponent.players.map((player, index) => (
                <div key={`${player.id}-${index}`} className="opp-player-row">
                  <span className={`opp-pos-badge opp-pos-badge--${getPosGroup(player.position)}`}>
                    {player.position}
                  </span>
                  <span className="opp-player-name">{player.name}</span>
                  <div className="opp-player-right">
                    <span className="opp-player-ovr">{player.overall}</span>
                    <div className="opp-flag-wrap">
                      <img src={getFlagUrl(player.nationality)} alt={player.nationality} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {opponent.bench.length > 0 ? (
              <div className="opp-lineup-section opp-lineup-section--bench">
                <p className="opp-lineup-section__title">Bench</p>
                {opponent.bench.map((player, index) => (
                  <div
                    key={`bench-${player.id}-${index}`}
                    className="opp-player-row opp-player-row--bench"
                  >
                    <span className={`opp-pos-badge opp-pos-badge--${getPosGroup(player.position)}`}>
                      {player.position}
                    </span>
                    <span className="opp-player-name">{player.name}</span>
                    <div className="opp-player-right">
                      <span className="opp-player-ovr">{player.overall}</span>
                      <div className="opp-flag-wrap">
                        <img src={getFlagUrl(player.nationality)} alt={player.nationality} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="opp-modal__footer">
          <button
            className="opp-btn-start"
            onClick={() => {
              void playStartMatch();
              onStart();
            }}
          >
            {startLabel}
          </button>
        </div>
      </div>
    </div>
  );
});

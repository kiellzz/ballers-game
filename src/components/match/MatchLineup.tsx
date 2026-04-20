import React from 'react';
import type { PlayerMatchStats } from '../../match-engine/matchTypes';
import type { Player } from '../../types/PlayerTypes';
import { getFlagUrl } from '../../utils/getFlagUrl';
import './MatchLineup.css';

interface MatchLineupProps {
  title: string;
  players: (Player | null)[];
  positions: string[];
  isOpponent?: boolean;
  playerMatchStats?: PlayerMatchStats;
}

export const MatchLineup: React.FC<MatchLineupProps> = ({
  title,
  players,
  positions,
  isOpponent = false,
  playerMatchStats,
}) => {
  // Key format must match what applyGoalToPlayerMatchStats writes:
  // `"${side}:${playerId}"` — e.g. "user:12" or "opponent:12".
  const side = isOpponent ? "opponent" : "user";

  return (
    <aside
      className={`match-column ${isOpponent ? 'match-column--right' : 'match-column--left'}`}
    >
      <h2 className="lineup-title">{title}</h2>
      <div className="lineup-list">
        {players.map((player, idx) => {
          const stats =
            player != null
              ? playerMatchStats?.[`${side}:${Number(player.id)}`]
              : undefined;

          return (
            <div key={`${title}-${idx}`} className="lineup-item">
              <span className="lineup-pos">{positions[idx]}</span>
              <span className="lineup-name">{player?.name || '---'}</span>

              <div className="lineup-stats">
                {stats?.goals ? (
                  <span className="lineup-badge lineup-badge--goal">
                    <img
                      src="/images/ball.png"
                      alt="goal"
                      className="lineup-badge__icon"
                    />
                    {stats.goals}
                  </span>
                ) : null}

                {stats?.assists ? (
                  <span className="lineup-badge lineup-badge--assist">
                    <img
                      src="/images/assist.png"
                      alt="assist"
                      className="lineup-badge__icon"
                    />
                    {stats.assists}
                  </span>
                ) : null}

                <span className="lineup-ovr">{player?.overall || '--'}</span>

                {player ? (
                  <img
                    src={getFlagUrl(player.nationality)}
                    alt={player.nationality}
                    className="lineup-flag"
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

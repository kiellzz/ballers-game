import React, { useMemo, useRef } from 'react';
import {
  emptyStatLine,
  type MatchDisciplinaryState,
  type PlayerMatchStats,
} from '../../match-engine/matchTypes';
import { calculatePlayerRating, getRatingClass } from '../../match-engine/playerRating';
import { getPlayerDisciplinaryState } from '../../match-engine/fouls/disciplineState';
import type { Player } from '../../types/PlayerTypes';
import { getFlagUrl } from '../../utils/getFlagUrl';
import './MatchLineup.css';

interface MatchLineupProps {
  title: string;
  players: (Player | null)[];
  positions: string[];
  isOpponent?: boolean;
  playerMatchStats?: PlayerMatchStats;
  disciplinaryState?: MatchDisciplinaryState;
}

export const MatchLineup: React.FC<MatchLineupProps> = ({
  title,
  players,
  positions,
  isOpponent = false,
  playerMatchStats,
  disciplinaryState,
}) => {
  const side = isOpponent ? "opponent" : "user";

  const initialPlayers = useRef(players);
  const teamRating = useMemo(() => {
    const starters = initialPlayers.current.filter(Boolean) as Player[];
    if (starters.length === 0) return null;
    const total = starters.reduce((acc, p) => acc + (p.overall || 0), 0);
    return Math.floor(total / starters.length);
  }, []);

  return (
    <aside
      className={`match-column ${isOpponent ? 'match-column--right' : 'match-column--left'}`}
    >
      <div className="lineup-header">
        <h2 className="lineup-title">{title}</h2>

        {teamRating !== null && (
          <div className="lineup-team-rating">
            <div className="rating-icon-wrapper">
              <svg className="rating-star" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
              <div className="rating-star-glow"></div>
            </div>
            <span className="rating-value">{teamRating} OVR</span>
          </div>
        )}
      </div>

      <div className="lineup-list">
        {players.map((player, idx) => {
          const stats =
            player != null
              ? playerMatchStats?.[`${side}:${Number(player.id)}`]
              : undefined;
          const discipline =
            player != null && disciplinaryState
              ? getPlayerDisciplinaryState(
                  disciplinaryState,
                  side,
                  Number(player.id)
                )
              : null;
          const isSentOff = discipline?.sentOff === true;

          const rating =
            player
              ? calculatePlayerRating(
                  stats ?? emptyStatLine(),
                  positions[idx] ?? player.position ?? "CM"
                )
              : null;

          const ratingClass = rating !== null ? getRatingClass(rating) : null;

          return (
            <div
              key={`${title}-${idx}`}
              className={`lineup-item${isSentOff ? ' lineup-item--sent-off' : ''}`}
            >
              <span className="lineup-pos">{positions[idx]}</span>
              <span className="lineup-name">{player?.name || '---'}</span>

              <div className="lineup-stats">
                {discipline && discipline.yellowCards > 0 ? (
                  <span
                    className="lineup-card-indicator lineup-card-indicator--yellow"
                    title={`${discipline.yellowCards} yellow card${discipline.yellowCards > 1 ? 's' : ''}`}
                  >
                    {discipline.yellowCards}
                  </span>
                ) : null}

                {discipline?.redCard ? (
                  <span
                    className="lineup-card-indicator lineup-card-indicator--red"
                    title={
                      discipline.dismissalType === 'second_yellow'
                        ? 'Sent off after a second yellow'
                        : 'Sent off'
                    }
                  >
                    R
                  </span>
                ) : null}

                {isSentOff ? (
                  <span className="lineup-status-badge">OFF</span>
                ) : null}

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

                {rating !== null && ratingClass !== null ? (
                  <span className={`lineup-rating lineup-rating--${ratingClass}`}>
                    {rating.toFixed(1)}
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

      <div className="lineup-logo-wrapper">
        <img src="/images/logo.webp" alt="Ballers logo" className="lineup-logo" />
        <p className="lineup-coming-soon__title">Coming soon!</p>
        <p className="lineup-coming-soon__sub">Substitutions system</p>
      </div>
    </aside>
  );
};

import React, { useMemo, useRef, useState } from "react";
import {
  emptyStatLine,
  type MatchDisciplinaryState,
  type MatchPlayer,
  type MatchSubstitution,
  type PlayerMatchStats,
} from "../../match-engine/matchTypes";
import {
  calculatePlayerRating,
  getRatingClass,
} from "../../match-engine/playerRating";
import {
  getPlayerDisciplinaryState,
  getSentOffPlayerIds,
} from "../../match-engine/fouls/disciplineState";
import type { Player } from "../../types/PlayerTypes";
import { getFlagUrl } from "../../utils/getFlagUrl";
import { SubstitutionModal } from "./SubstitutionModal";
import { PlayerStatsModal } from "./PlayerStatsModal";
import "./MatchLineup.css";

const EMPTY_BENCH: (Player | null)[] = [];
const EMPTY_MATCH_PLAYERS: MatchPlayer[] = [];
const EMPTY_PLAYER_IDS = new Set<number>();

interface MatchLineupProps {
  title: string;
  players: (Player | null)[];
  positions: string[];
  isOpponent?: boolean;
  benchPlayers?: (Player | null)[];
  playerMatchStats?: PlayerMatchStats;
  disciplinaryState?: MatchDisciplinaryState;
  starterMatchPlayers?: MatchPlayer[];
  subsUsed?: number;
  maxSubs?: number;
  substitutedOutIds?: Set<number>;
  substitutedInIds?: Set<number>;
  completedSubstitutions?: MatchSubstitution[];
  subbedOffPlayers?: Array<{
    player: Player;
    position: string;
  }>;
  pendingInIds?: Set<number>;
  isMatchFinished?: boolean;
  finalMinute?: number;
  finalTeamGoalsConceded?: number;
  mvpPlayerId?: number | null;
  canSubstitute?: boolean;
  onSubstitute?: (outPlayerId: number, inPlayerId: number) => {
    ok: boolean;
    error: string | null;
  };
}

export const MatchLineup: React.FC<MatchLineupProps> = ({
  title,
  players,
  positions,
  isOpponent = false,
  benchPlayers = EMPTY_BENCH,
  playerMatchStats,
  disciplinaryState,
  starterMatchPlayers = EMPTY_MATCH_PLAYERS,
  subsUsed = 0,
  maxSubs = 3,
  substitutedOutIds = EMPTY_PLAYER_IDS,
  substitutedInIds = EMPTY_PLAYER_IDS,
  completedSubstitutions = [],
  subbedOffPlayers = [],
  pendingInIds = EMPTY_PLAYER_IDS,
  isMatchFinished = false,
  finalMinute = 90,
  finalTeamGoalsConceded = 0,
  mvpPlayerId = null,
  canSubstitute = true,
  onSubstitute,
}) => {
  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState(false);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<{
    player: Player;
    position: string;
  } | null>(null);
  const side = isOpponent ? "opponent" : "user";

  const initialPlayers = useRef(players);
  const teamRating = useMemo(() => {
    const starters = initialPlayers.current.filter(Boolean) as Player[];
    if (starters.length === 0) return null;

    const total = starters.reduce((acc, player) => acc + (player.overall || 0), 0);
    return Math.floor(total / starters.length);
  }, []);

  const sentOffIds = useMemo(
    () =>
      disciplinaryState
        ? getSentOffPlayerIds(disciplinaryState, side)
        : EMPTY_PLAYER_IDS,
    [disciplinaryState, side]
  );

  const subsLeft = Math.max(0, maxSubs - subsUsed);
  const canOpenSubstitutionModal =
    !isOpponent && canSubstitute && typeof onSubstitute === "function";
  const hasBenchPlayers = benchPlayers.some(Boolean);
  const canLaunchSubstitution =
    canOpenSubstitutionModal && subsLeft > 0 && hasBenchPlayers;
  const shouldShowSubFooter = canOpenSubstitutionModal || isOpponent;

  function openPlayerStats(player: Player | null, position: string | null) {
    if (!isMatchFinished || !player || !position) {
      return;
    }

    setSelectedPlayerStats({ player, position });
  }

  function handleLineupItemKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    player: Player | null,
    position: string | null
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openPlayerStats(player, position);
  }

  function getMinutesPlayed(playerId: number): number {
    const entrySubstitution = completedSubstitutions.find(
      ({ inPlayer }) => inPlayer.id === playerId
    );
    const exitSubstitution = completedSubstitutions.find(
      ({ outPlayer }) => outPlayer.id === playerId
    );
    const startMinute = entrySubstitution?.appliedAtMinute ?? 0;
    const endMinute = exitSubstitution?.appliedAtMinute ?? finalMinute;

    return Math.max(0, endMinute - startMinute);
  }

  return (
    <aside
      className={`match-column ${
        isOpponent ? "match-column--right" : "match-column--left"
      }`}
    >
      <div className="lineup-header">
        <h2 className="lineup-title">{title}</h2>

        {teamRating !== null ? (
          <div className="lineup-team-rating">
            <div className="rating-icon-wrapper">
              <svg
                className="rating-star"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
              <div className="rating-star-glow" />
            </div>
            <span className="rating-value">{teamRating} OVR</span>
          </div>
        ) : null}
      </div>

      <div className="lineup-list">
        {players.map((player, idx) => {
          const playerId = player ? Number(player.id) : null;
          const isMvp =
            isMatchFinished && playerId != null && playerId === mvpPlayerId;
          const stats =
            playerId != null ? playerMatchStats?.[`${side}:${playerId}`] : undefined;
          const discipline =
            playerId != null && disciplinaryState
              ? getPlayerDisciplinaryState(disciplinaryState, side, playerId)
              : null;
          const isSentOff = discipline?.sentOff === true;
          const isSubstitutedIn =
            playerId != null && substitutedInIds.has(playerId);

          const rating =
            player != null
              ? calculatePlayerRating(
                  stats ?? emptyStatLine(),
                  positions[idx] ?? player.position ?? "CM"
                )
              : null;

          const ratingClass = rating !== null ? getRatingClass(rating) : null;

          return (
            <div
              key={`${title}-${idx}`}
              className={`lineup-item${
                isSentOff ? " lineup-item--sent-off" : ""
              }${isSubstitutedIn ? " lineup-item--sub-in" : ""}${
                isMatchFinished && player ? " lineup-item--clickable" : ""
              }`}
              onClick={() =>
                openPlayerStats(
                  player,
                  positions[idx] ?? player?.position ?? null
                )
              }
              onKeyDown={(event) =>
                handleLineupItemKeyDown(
                  event,
                  player,
                  positions[idx] ?? player?.position ?? null
                )
              }
              role={isMatchFinished && player ? "button" : undefined}
              tabIndex={isMatchFinished && player ? 0 : undefined}
            >
              <span className="lineup-pos">{positions[idx]}</span>

              <div className="lineup-name-wrap">
                <span
                  className={`lineup-name${isMvp ? " lineup-name--mvp" : ""}`}
                >
                  {player ? player.name : "---"}
                </span>
                {isSubstitutedIn ? (
                  <span
                    className="lineup-sub-indicator"
                    title="Came on from the bench"
                  >
                    ↑
                  </span>
                ) : null}
              </div>

              <div className="lineup-stats">
                {discipline && discipline.yellowCards > 0 ? (
                  <span
                    className="lineup-card-indicator lineup-card-indicator--yellow"
                    title={`${discipline.yellowCards} yellow card${
                      discipline.yellowCards > 1 ? "s" : ""
                    }`}
                  >
                    {discipline.yellowCards}
                  </span>
                ) : null}

                {discipline?.redCard ? (
                  <span
                    className="lineup-card-indicator lineup-card-indicator--red"
                    title={
                      discipline.dismissalType === "second_yellow"
                        ? "Sent off after a second yellow"
                        : "Sent off"
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

                <span className="lineup-ovr">{player?.overall || "--"}</span>

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

      {shouldShowSubFooter ? (
        <div className="lineup-sub-footer">
          <button
            type="button"
            className={`lineup-sub-btn${
              isOpponent ? " lineup-sub-btn--opponent" : ""
            }`}
            onClick={
              isOpponent ? undefined : () => setIsSubstitutionModalOpen(true)
            }
            disabled={isOpponent ? true : !canLaunchSubstitution}
          >
            <span className="lineup-sub-btn__icon">
              {isOpponent ? "\u21c5" : "\u21c4"}
            </span>
            <span className="lineup-sub-btn__label">Substitution</span>
            <span className="lineup-sub-btn__counter">
              {subsLeft}/{maxSubs}
            </span>
          </button>
          <div className="lineup-sub-pips">
            {Array.from({ length: maxSubs }).map((_, index) => (
              <span
                key={index}
                className={`lineup-sub-pip${
                  index < subsUsed ? " lineup-sub-pip--used" : ""
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}

      <section className="lineup-subbed-off">
        <div className="lineup-subbed-off__header">
          <h3 className="lineup-subbed-off__title">Subbed Off</h3>
        </div>

        <div className="lineup-subbed-off__list">
          {subbedOffPlayers.length === 0 ? (
            <p className="lineup-subbed-off__empty">No substitutions yet.</p>
          ) : (
            subbedOffPlayers.map(({ player, position }, index) => {
              const playerId = Number(player.id);
              const isMvp =
                isMatchFinished && playerId === mvpPlayerId;
              const stats = playerMatchStats?.[`${side}:${playerId}`];
              const rating = calculatePlayerRating(
                stats ?? emptyStatLine(),
                position ?? player.position ?? "CM"
              );
              const ratingClass = getRatingClass(rating);

              return (
                <div
                  key={`${title}-subbed-off-${player.id}-${index}`}
                  className={`lineup-item lineup-item--subbed-off${
                    isMatchFinished ? " lineup-item--clickable" : ""
                  }`}
                  onClick={() => openPlayerStats(player, position)}
                  onKeyDown={(event) =>
                    handleLineupItemKeyDown(event, player, position)
                  }
                  role={isMatchFinished ? "button" : undefined}
                  tabIndex={isMatchFinished ? 0 : undefined}
                >
                  <span className="lineup-pos">{position}</span>

                  <div className="lineup-name-wrap">
                    <span
                      className={`lineup-name${isMvp ? " lineup-name--mvp" : ""}`}
                    >
                      {player.name}
                    </span>
                    <span
                      className="lineup-sub-indicator lineup-sub-indicator--off"
                      title="Subbed off"
                    >
                      {"\u2193"}
                    </span>
                  </div>

                  <div className="lineup-stats">
                    <span className={`lineup-rating lineup-rating--${ratingClass}`}>
                      {rating.toFixed(1)}
                    </span>
                    <img
                      src={getFlagUrl(player.nationality)}
                      alt={player.nationality}
                      className="lineup-flag"
                    />
                    <span className="lineup-ovr">{player.overall || "--"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="lineup-logo-wrapper">
        <img src="/images/logo.webp" alt="Ballers logo" className="lineup-logo" />
      </div>

      {canOpenSubstitutionModal && onSubstitute ? (
        <SubstitutionModal
          isOpen={isSubstitutionModalOpen}
          subsUsed={subsUsed}
          maxSubs={maxSubs}
          starters={starterMatchPlayers}
          benchPlayers={benchPlayers}
          substitutedOutIds={substitutedOutIds}
          pendingInIds={pendingInIds}
          sentOffIds={sentOffIds}
          onSubstitute={onSubstitute}
          onClose={() => setIsSubstitutionModalOpen(false)}
        />
      ) : null}

      <PlayerStatsModal
        isOpen={selectedPlayerStats !== null}
        player={selectedPlayerStats?.player ?? null}
        position={selectedPlayerStats?.position ?? null}
        stats={
          selectedPlayerStats
            ? playerMatchStats?.[
                `${side}:${Number(selectedPlayerStats.player.id)}`
              ] ?? emptyStatLine()
            : null
        }
        minutesPlayed={
          selectedPlayerStats
            ? getMinutesPlayed(Number(selectedPlayerStats.player.id))
            : null
        }
        teamGoalsConceded={finalTeamGoalsConceded}
        isMvp={
          selectedPlayerStats
            ? Number(selectedPlayerStats.player.id) === mvpPlayerId
            : false
        }
        onClose={() => setSelectedPlayerStats(null)}
      />
    </aside>
  );
};
